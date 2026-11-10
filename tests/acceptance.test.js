import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server/app.js';

const catalog = {
  roles: [{ id: 'software', label: 'Software developer' }, { id: 'aiml', label: 'AI/ML engineer' }],
  rounds: ['hr', 'projects', 'dsa', 'cs', 'ml', 'behavioural'].map(id => ({ id, label: id })),
  personas: ['supportive', 'formal', 'detail', 'challenging'].map(id => ({ id, label: id })),
  difficulties: ['beginner', 'intermediate', 'advanced'].map(id => ({ id, label: id })),
  durations: [10, 20, 30],
};
const setup = { role: 'software', round: 'projects', persona: 'supportive', difficulty: 'beginner', durationMinutes: 10, context: 'Built a college timetable tool.' };
const answer = 'I implemented the timetable API and compared its output with manually checked schedules.';
function engine(overrides = {}) {
  return {
    catalog,
    getMode: () => 'practice',
    nextQuestion: async session => `Question ${session.turns.length + 1}: explain your contribution.`,
    evaluate: async session => ({ mode: session.mode, summary: 'Reflect on your examples.', criteria: [{ name: 'Evidence', score: null, outOf: 5, evidence: session.turns.find(t => t.answer)?.answer ?? '', improvement: 'Explain the outcome.' }], strengths: [], improvements: ['Describe the outcome.'], nextSteps: ['Practise a specific example.'], disclaimer: 'Practice reflection, not a technical correctness assessment.' }),
    ...overrides,
  };
}
async function harness(t, adapter = engine()) {
  const directory = await mkdtemp(join(tmpdir(), 'interview-acceptance-'));
  const dbPath = join(directory, 'state.sqlite');
  let app;
  let base;
  async function start() {
    app = await createApp({ dbPath, engine: adapter });
    app.server.listen(0, '127.0.0.1');
    await once(app.server, 'listening');
    base = `http://127.0.0.1:${app.server.address().port}`;
  }
  async function stop() { await app.close(); }
  await start();
  t.after(async () => { await stop(); await rm(directory, { recursive: true, force: true }); });
  const request = async (path, { method = 'GET', body, cookie, origin } = {}) => {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    if (method !== 'GET') headers.Origin = origin ?? base;
    const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    return { status: response.status, data, headers: response.headers };
  };
  async function register(email) {
    const response = await request('/api/auth/register', { method: 'POST', body: { name: 'Test Student', email, password: 'A-test-password-729!' } });
    assert.ok(response.status === 200 || response.status === 201, JSON.stringify(response.data));
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=/i);
    return cookie.split(';')[0];
  }
  async function create(cookie) {
    const response = await request('/api/sessions', { method: 'POST', cookie, body: setup });
    assert.ok(response.status === 200 || response.status === 201, JSON.stringify(response.data));
    assert.equal(response.data.session.turns.length, 1);
    return response.data.session;
  }
  return { request, register, create, restart: async () => { await stop(); await start(); } };
}

test('a second user cannot read, answer, finish or delete another student interview', async t => {
  const h = await harness(t);
  const alice = await h.register('alice@example.com');
  const bob = await h.register('bob@example.com');
  const session = await h.create(alice);
  for (const [method, suffix, body] of [['GET', '', undefined], ['POST', '/answers', { answer, expectedTurnCount: 1 }], ['POST', '/finish', {}], ['DELETE', '', undefined]]) {
    const result = await h.request(`/api/sessions/${session.id}${suffix}`, { method, body, cookie: bob });
    assert.ok([403, 404].includes(result.status), `${method} ${suffix}: ${result.status}`);
    assert.ok(!JSON.stringify(result.data).includes(setup.context));
  }
  const listing = await h.request('/api/sessions', { cookie: bob });
  assert.deepEqual(listing.data.sessions, []);
  assert.equal((await h.request(`/api/sessions/${session.id}`, { cookie: alice })).status, 200);
});

test('saved answer survives generation failure and identical retry never duplicates it', async t => {
  let failNext = true;
  const h = await harness(t, engine({ nextQuestion: async session => {
    if (session.turns.length && failNext) { failNext = false; throw new Error('private-provider-key-must-not-leak'); }
    return `Question ${session.turns.length + 1}`;
  } }));
  const cookie = await h.register('retry@example.com');
  const session = await h.create(cookie);
  const path = `/api/sessions/${session.id}`;
  const payload = { answer, expectedTurnCount: 1 };
  const failed = await h.request(`${path}/answers`, { method: 'POST', cookie, body: payload });
  assert.ok(failed.status >= 500);
  assert.ok(!JSON.stringify(failed.data).includes('private-provider-key'));
  const saved = (await h.request(path, { cookie })).data.session;
  assert.equal(saved.turns.length, 1);
  assert.equal(saved.turns[0].answer, answer);
  const retry = await h.request(`${path}/answers`, { method: 'POST', cookie, body: payload });
  assert.equal(retry.status, 200);
  assert.equal(retry.data.session.turns.length, 2);
  assert.equal(retry.data.session.turns[0].answer, answer);
  assert.equal(retry.data.session.turns[1].answer, null);
  const repeated = await h.request(`${path}/answers`, { method: 'POST', cookie, body: payload });
  assert.ok([200, 409].includes(repeated.status));
  const final = (await h.request(path, { cookie })).data.session;
  assert.equal(final.turns.length, 2);
  assert.equal(final.turns.filter(turn => turn.answer !== null).length, 1);
});

test('completed report survives restart and cannot be changed by a late answer', async t => {
  const h = await harness(t);
  const cookie = await h.register('restart@example.com');
  const session = await h.create(cookie);
  const path = `/api/sessions/${session.id}`;
  const premature = await h.request(`${path}/finish`, { method: 'POST', cookie, body: {} });
  assert.ok([400, 409, 422].includes(premature.status));
  assert.equal((await h.request(`${path}/answers`, { method: 'POST', cookie, body: { answer, expectedTurnCount: 1 } })).status, 200);
  const completed = await h.request(`${path}/finish`, { method: 'POST', cookie, body: {} });
  assert.equal(completed.status, 200);
  assert.equal(completed.data.session.status, 'completed');
  assert.equal(completed.data.session.report.mode, 'practice');
  assert.equal(completed.data.session.report.criteria[0].score, null);
  await h.restart();
  const restored = await h.request(path, { cookie });
  assert.equal(restored.status, 200);
  assert.deepEqual(restored.data.session.report, completed.data.session.report);
  const late = await h.request(`${path}/answers`, { method: 'POST', cookie, body: { answer: 'Late replacement', expectedTurnCount: restored.data.session.turns.length } });
  assert.ok([400, 409].includes(late.status));
  assert.deepEqual((await h.request(path, { cookie })).data.session.report, completed.data.session.report);
  const deleted = await h.request(path, { method: 'DELETE', cookie });
  assert.ok([200, 204].includes(deleted.status));
  assert.equal((await h.request(path, { cookie })).status, 404);
});

test('untrusted origins and invalid settings cannot create interviews', async t => {
  const h = await harness(t);
  const cookie = await h.register('validation@example.com');
  const crossOrigin = await h.request('/api/sessions', { method: 'POST', cookie, origin: 'https://attacker.example', body: setup });
  assert.equal(crossOrigin.status, 403);
  for (const changed of [{ round: 'unknown-round' }, { durationMinutes: 999 }, { context: 'x'.repeat(12001) }]) {
    const result = await h.request('/api/sessions', { method: 'POST', cookie, body: { ...setup, ...changed } });
    assert.ok([400, 413, 422].includes(result.status), JSON.stringify(result.data));
  }
  assert.deepEqual((await h.request('/api/sessions', { cookie })).data.sessions, []);
  assert.equal((await h.request('/api/sessions')).status, 401);
});

test('finish and delete cannot race with an in-flight answer generation', async t => {
  let release;
  let started;
  const generationStarted = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const h = await harness(t, engine({ nextQuestion: async session => {
    if (session.turns.length) { started(); await gate; }
    return `Question ${session.turns.length + 1}`;
  } }));
  const cookie = await h.register('concurrency@example.com');
  const session = await h.create(cookie);
  const path = `/api/sessions/${session.id}`;
  const pending = h.request(`${path}/answers`, { method: 'POST', cookie, body: { answer, expectedTurnCount: 1 } });
  await generationStarted;
  try {
    const concurrentFinish = await h.request(`${path}/finish`, { method: 'POST', cookie, body: {} });
    assert.equal(concurrentFinish.status, 409);
    const concurrentDelete = await h.request(path, { method: 'DELETE', cookie });
    assert.equal(concurrentDelete.status, 409);
  } finally { release(); }
  assert.equal((await pending).status, 200);
  const saved = await h.request(path, { cookie });
  assert.equal(saved.data.session.status, 'active');
  assert.equal(saved.data.session.turns.length, 2);
  assert.equal(saved.data.session.turns[0].answer, answer);
});
