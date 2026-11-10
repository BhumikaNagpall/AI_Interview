import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, chmodSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(scryptCallback);
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const MAX_BODY = 96 * 1024;
const AUTH_TTL = 7 * 24 * 60 * 60 * 1000;
const hashToken = token => createHash('sha256').update(token).digest('hex');
class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
const text = (value, name, max, min = 1) => {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) fail(400, 'INVALID_INPUT', `${name} must contain ${min}–${max} characters.`);
  return value.trim();
};
function json(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
}
async function body(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) fail(415, 'JSON_REQUIRED', 'Send application/json.');
  if (Number(req.headers['content-length']) > MAX_BODY) fail(413, 'BODY_TOO_LARGE', 'Request is too large.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) fail(413, 'BODY_TOO_LARGE', 'Request is too large.');
    chunks.push(chunk);
  }
  let parsed;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { fail(400, 'INVALID_JSON', 'Request must contain valid JSON.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail(400, 'INVALID_JSON', 'Request must contain a JSON object.');
  return parsed;
}
function checkOrigin(req) {
  if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'CROSS_ORIGIN', 'Cross-site requests are not allowed.');
  if (req.headers.origin) {
    let origin;
    try { origin = new URL(req.headers.origin); } catch { fail(403, 'CROSS_ORIGIN', 'Invalid request origin.'); }
    const allowed = process.env.APP_ORIGIN;
    if (allowed ? origin.origin !== allowed : origin.host !== req.headers.host || !['http:', 'https:'].includes(origin.protocol)) fail(403, 'CROSS_ORIGIN', 'Cross-site requests are not allowed.');
  }
}

/** Creates an unlistened server. The injected engine must implement the documented contract. */
export function createApp({ dbPath = resolve('data/interview.sqlite'), engine } = {}) {
  if (dbPath !== ':memory:') mkdirSync(dirname(resolve(dbPath)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') chmodSync(dbPath, 0o600);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS auth (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS interviews (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, payload TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS interviews_owner ON interviews(user_id);
    CREATE INDEX IF NOT EXISTS auth_expiry ON auth(expires);`);
  let enginePromise;
  const getEngine = () => engine ? Promise.resolve(engine) : (enginePromise ||= import('./engine.js'));
  const locks = new Set();
  const limits = new Map();
  const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  const cookie = (token, age = AUTH_TTL / 1000) => `interview_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`;
  function throttle(key, max, windowMs) {
    const now = Date.now();
    let entry = limits.get(key);
    if (!entry || entry.until <= now) entry = { count: 0, until: now + windowMs };
    entry.count++;
    limits.set(key, entry);
    if (limits.size > 5000) for (const [k, v] of limits) if (v.until <= now) limits.delete(k);
    if (entry.count > max) fail(429, 'RATE_LIMITED', 'Too many requests. Please wait and try again.');
  }
  function currentUser(req) {
    const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('interview_session='))?.slice(18);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return db.prepare('SELECT users.id, users.name, users.email FROM auth JOIN users ON auth.user_id=users.id WHERE auth.token_hash=? AND auth.expires>?').get(hashToken(token), Date.now()) || null;
  }
  function signIn(user, res) {
    db.prepare('DELETE FROM auth WHERE expires <= ?').run(Date.now());
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO auth VALUES (?,?,?)').run(hashToken(token), user.id, Date.now() + AUTH_TTL);
    return { 'Set-Cookie': cookie(token) };
  }
  function save(session, userId) {
    session.updatedAt = new Date().toISOString();
    db.prepare('INSERT INTO interviews VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload WHERE interviews.user_id=excluded.user_id').run(session.id, userId, JSON.stringify(session));
  }
  function owned(id, userId) {
    const row = db.prepare('SELECT payload FROM interviews WHERE id=? AND user_id=?').get(id, userId);
    if (!row) fail(404, 'NOT_FOUND', 'Interview not found.');
    return JSON.parse(row.payload);
  }
  async function withLock(id, callback) {
    if (locks.has(id)) fail(409, 'SESSION_BUSY', 'This interview is processing another request. Please wait.');
    locks.add(id);
    try { return await callback(); } finally { locks.delete(id); }
  }
  async function generate(callback) {
    let timer;
    try {
      return await Promise.race([callback(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 45000); timer.unref(); })]);
    } catch {
      fail(503, 'GENERATION_FAILED', 'The interview service could not respond. Saved answers are safe; please retry.');
    } finally { clearTimeout(timer); }
  }
  async function question(provider, session) {
    const result = await generate(() => provider.nextQuestion(structuredClone(session)));
    if (typeof result !== 'string' || !result.trim() || result.length > 16000) fail(503, 'GENERATION_FAILED', 'The interview service returned an invalid question. Please retry.');
    return result.trim();
  }
  async function finish(provider, session, userId) {
    if (!session.turns.some(turn => turn.answer !== null)) fail(400, 'NO_ANSWERS', 'Answer at least one question before finishing.');
    const answered = { ...session, turns: session.turns.filter(turn => turn.answer !== null) };
    const report = await generate(() => provider.evaluate(structuredClone(answered)));
    if (!report || typeof report !== 'object' || report.mode !== session.mode || typeof report.summary !== 'string' || !Array.isArray(report.criteria)) fail(503, 'GENERATION_FAILED', 'The interview service returned an invalid report. Please retry.');
    session.report = report;
    session.status = 'completed';
    save(session, userId);
    return session;
  }
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const method = req.method;
      if (!pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(method)) fail(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
        const file = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
        // Serve only the explicitly supported public assets; never source, data or dotfiles.
        if (!['index.html', 'app.js', 'styles.css', 'favicon.svg'].includes(file)) fail(404, 'NOT_FOUND', 'Page not found.');
        let bytes;
        try { bytes = await readFile(resolve(publicRoot, file)); } catch { fail(404, 'NOT_FOUND', 'Page not found.'); }
        res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' })[extname(file)], 'Cache-Control': 'no-cache' });
        return res.end(method === 'HEAD' ? undefined : bytes);
      }
      if (['POST', 'DELETE', 'PUT', 'PATCH'].includes(method)) checkOrigin(req);
      const ip = req.socket.remoteAddress || 'unknown';
      throttle(`all:${ip}`, 240, 60000);
      if (method === 'GET' && pathname === '/api/health') {
        const provider = await getEngine();
        let mode;
        try { mode = provider.getMode(); } catch { fail(503, 'CONFIGURATION_ERROR', 'AI configuration is incomplete. Configure both AI_API_KEY and AI_MODEL, or remove AI_API_KEY, AI_MODEL and AI_BASE_URL for practice mode.'); }
        return json(res, 200, { status: 'ok', mode });
      }
      if (method === 'GET' && pathname === '/api/catalog') return json(res, 200, (await getEngine()).catalog);
      if (method === 'GET' && pathname === '/api/me') return json(res, 200, { user: currentUser(req) });
      if (method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(pathname)) {
        throttle(`auth:${ip}`, 20, 15 * 60000);
        const input = await body(req);
        const email = text(input.email, 'Email', 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'INVALID_INPUT', 'Enter a valid email address.');
        if (typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 128) fail(400, 'INVALID_INPUT', 'Password must contain 10–128 characters.');
        if (pathname.endsWith('/register')) {
          const name = text(input.name, 'Name', 80);
          const salt = randomBytes(16).toString('hex');
          const passwordHash = `${salt}:${Buffer.from(await scrypt(input.password, salt, 64)).toString('hex')}`;
          const user = { id: randomUUID(), name, email };
          try { db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(user.id, name, email, passwordHash); }
          catch (error) {
            if (error.code?.startsWith('ERR_SQLITE') && String(error.message).includes('UNIQUE')) fail(409, 'EMAIL_IN_USE', 'An account with this email already exists.');
            throw error;
          }
          return json(res, 201, { user }, signIn(user, res));
        }
        const row = db.prepare('SELECT * FROM users WHERE email=?').get(email);
        const [salt, hash] = (row?.password_hash || `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
        const computed = Buffer.from(await scrypt(input.password, salt, 64));
        if (!row || !timingSafeEqual(computed, Buffer.from(hash, 'hex'))) fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
        const user = { id: row.id, name: row.name, email: row.email };
        return json(res, 200, { user }, signIn(user, res));
      }
      if (method === 'POST' && pathname === '/api/auth/logout') {
        await body(req);
        const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('interview_session='))?.slice(18);
        if (token) db.prepare('DELETE FROM auth WHERE token_hash=?').run(hashToken(token));
        return json(res, 200, { user: null }, { 'Set-Cookie': cookie('', 0) });
      }
      const user = currentUser(req);
      if (!user) fail(401, 'UNAUTHENTICATED', 'Sign in to continue.');
      if (method === 'GET' && pathname === '/api/sessions') {
        const sessions = db.prepare('SELECT payload FROM interviews WHERE user_id=? ORDER BY rowid DESC').all(user.id).map(row => JSON.parse(row.payload));
        return json(res, 200, { sessions });
      }
      if (method === 'POST' && pathname === '/api/sessions') {
        throttle(`generation:${user.id}`, 40, 60000);
        const input = await body(req);
        const provider = await getEngine();
        for (const [field, plural] of [['role', 'roles'], ['round', 'rounds'], ['persona', 'personas'], ['difficulty', 'difficulties']]) {
          if (!provider.catalog[plural].some(item => item.id === input[field])) fail(400, 'INVALID_INPUT', `Choose a valid ${field}.`);
        }
        if (![10, 20, 30].includes(input.durationMinutes)) fail(400, 'INVALID_INPUT', 'Duration must be 10, 20 or 30 minutes.');
        const context = text(input.context ?? '', 'Context', 12000, 0);
        let mode;
        try { mode = provider.getMode(); } catch { fail(503, 'CONFIGURATION_ERROR', 'AI configuration is incomplete. Configure both AI_API_KEY and AI_MODEL, or remove AI_API_KEY, AI_MODEL and AI_BASE_URL for practice mode.'); }
        const now = new Date().toISOString();
        const session = { id: randomUUID(), role: input.role, round: input.round, persona: input.persona, difficulty: input.difficulty, durationMinutes: input.durationMinutes, context, status: 'active', mode, createdAt: now, updatedAt: now, maxQuestions: { 10: 4, 20: 6, 30: 8 }[input.durationMinutes], turns: [], report: null };
        session.turns.push({ question: await question(provider, session), answer: null });
        save(session, user.id);
        return json(res, 201, { session });
      }
      const match = /^\/api\/sessions\/([a-f0-9-]{36})(?:\/(answers|finish))?$/.exec(pathname);
      if (match) {
        const [, id, action] = match;
        if (!action && method === 'GET') return json(res, 200, { session: owned(id, user.id) });
        if (!action && method === 'DELETE') return await withLock(id, async () => {
          owned(id, user.id);
          db.prepare('DELETE FROM interviews WHERE id=? AND user_id=?').run(id, user.id);
          return json(res, 200, { deleted: true });
        });
        if (action && method === 'POST') {
          const input = await body(req);
          return await withLock(id, async () => {
            const session = owned(id, user.id);
            if (session.status === 'completed') {
              if (action === 'finish') return json(res, 200, { session });
              const finalTurn = session.turns.at(-1);
              if (Number.isInteger(input.expectedTurnCount) && input.expectedTurnCount === session.turns.length && finalTurn?.answer !== null && typeof input.answer === 'string' && input.answer.trim() === finalTurn.answer) return json(res, 200, { session });
              fail(409, 'SESSION_COMPLETED', 'This interview is already completed.');
            }
            throttle(`generation:${user.id}`, 40, 60000);
            const provider = await getEngine();
            if (action === 'finish') return json(res, 200, { session: await finish(provider, session, user.id) });
            const answer = text(input.answer, 'Answer', 12000);
            if (!Number.isInteger(input.expectedTurnCount) || input.expectedTurnCount < 1) fail(400, 'INVALID_INPUT', 'expectedTurnCount is required.');
            const last = session.turns.at(-1);
            // A response may have been lost after successful generation; replay returns saved state.
            if (input.expectedTurnCount === session.turns.length - 1 && session.turns.at(-2)?.answer === answer) return json(res, 200, { session });
            if (input.expectedTurnCount !== session.turns.length) fail(409, 'STALE_SESSION', 'The interview has changed. Reload before answering.');
            if (last.answer !== null && last.answer !== answer) fail(409, 'ANSWER_ALREADY_SAVED', 'This answer is already saved. Retry with the same answer or finish the interview.');
            if (last.answer === null) { last.answer = answer; save(session, user.id); }
            if (session.turns.length >= session.maxQuestions) return json(res, 200, { session: await finish(provider, session, user.id) });
            session.turns.push({ question: await question(provider, session), answer: null });
            save(session, user.id);
            return json(res, 200, { session });
          });
        }
      }
      fail(404, 'NOT_FOUND', 'Endpoint not found.');
    } catch (error) {
      if (res.headersSent || res.destroyed) return;
      if (error instanceof ApiError) return json(res, error.status, { error: { code: error.code, message: error.message } });
      // Deliberately never log request bodies, passwords, resume context or provider errors.
      json(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
    }
  });
  server.requestTimeout = 60000;
  server.headersTimeout = 15000;
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    if (server.listening) await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
    db.close();
  }
  return { server, close };
}
