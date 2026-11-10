import { createApp } from './app.js';
import { getMode } from './engine.js';

const argument = name => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const host = argument('--host') || process.env.HOST || '127.0.0.1';
const port = Number(argument('--port') || process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
const mode = getMode();
const app = createApp({ dbPath: process.env.DATABASE_PATH });
app.server.listen(port, host, () => console.log(`Interview Studio: http://${host}:${port} (${mode} mode)`));
app.server.on('error', error => { console.error(`Server could not start (${error.code || 'unknown'}).`); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
