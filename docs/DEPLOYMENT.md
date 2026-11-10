# Deployment and operations

## Current status

This increment provides a local Node.js application and CI configuration. No hosted deployment or live paid AI call is implied by these files. Check `PROJECT_STATUS.md` for actual verification results. The CI workflow checks source and tests; it does not publish anything.

## Runtime requirements

- Node.js 24 or later, with the built-in `node:sqlite` module available.
- One long-running application process with a writable persistent directory.
- HTTPS termination through a trusted reverse proxy for remote access.
- Outbound HTTPS to the configured AI provider only when using AI mode.

There are no npm dependencies to install and no frontend build. Start from the repository root with `npm start`. Static-only hosting such as GitHub Pages cannot run the API or SQLite database. An ephemeral filesystem loses accounts and history when the container restarts; use a persistent volume.

Use a single application process for this version. Per-session concurrency guards are process-local, and the SQLite design has not been validated for multiple independent application workers or network-mounted database files.

## Configuration

| Variable | Default / purpose |
| --- | --- |
| `HOST` | `127.0.0.1`; bind locally behind a reverse proxy. Containers may require `0.0.0.0` within a private network. |
| `PORT` | `3000`; internal listening port. |
| `DATABASE_PATH` | `data/interview.sqlite`; use an absolute persistent-volume path in production. |
| `NODE_ENV` | Set `production` for deployment; this forces secure cookies. |
| `COOKIE_SECURE` | `true` also forces secure cookies; use `false` only for local HTTP development. `NODE_ENV=production` still forces secure cookies. |
| `APP_ORIGIN` | Exact browser origin, e.g. `https://interview.example.com`, without a trailing slash or path. Configure explicitly behind a proxy. |
| `AI_API_KEY` | Server-only provider secret. Leave blank with `AI_MODEL` for practice mode. |
| `AI_MODEL` | Explicit provider-supported model identifier; required alongside an AI key. |
| `AI_BASE_URL` | `https://api.openai.com/v1`; compatible chat-completion API base. |

The example `.env` is for local HTTP. Change its origin and production settings before remote hosting. If you change the local port or use `localhost` instead of `127.0.0.1`, update `APP_ORIGIN` to match the URL you open. Incorrect origin configuration can reject mutations such as sign-in.

Use the host's secret manager for `AI_API_KEY` in production. If using a private `.env`, restrict its file permissions. Do not expose runtime credentials as public frontend variables. Never log full cookies, credentials, interview transcripts or resume context.

## HTTPS proxy setup

1. Serve the public domain over HTTPS with a valid certificate.
2. Forward requests to the private Node listener, including the original host.
3. Set `APP_ORIGIN` to that exact public HTTPS origin and `NODE_ENV=production`.
4. Keep the Node port inaccessible from untrusted networks.
5. Bound request sizes and configure proxy timeouts to accommodate the engine's bounded model request without allowing unlimited connections.
6. Verify secure cookies, same-origin checks, logout and account isolation through the public URL.

The application does not trust arbitrary forwarded headers for its origin policy. `APP_ORIGIN` makes the allowed browser origin explicit. A secure session cookie will not work over ordinary HTTP; local troubleshooting should use development mode, while remote deployments should fix HTTPS instead of disabling secure cookies.

## Persistence and backup

The database contains user identities, password hashes, session records, supplied context, answers and reports. Limit access to the service account and authorised administrators. Keep databases out of Git and web-served directories.

For a simple consistent backup:

1. Stop the application cleanly and confirm the process has exited.
2. Copy the database and any associated `-wal` and `-shm` files together into an access-controlled backup location. Do not copy only the main file while writes are active.
3. Restart the application.
4. Periodically restore a backup into a separate test instance and verify login and saved-session access.

For online backups, implement and verify an SQLite-aware backup operation rather than ad hoc copying. Backups contain personal data: set retention, access controls and encryption appropriate to the deployment. Deleting a session in the application does not remove previously created backups or data already sent to an AI provider.

## Deployment verification

Before a release:

```sh
npm run check
npm test
```

Then verify the running release with dedicated test accounts:

- `GET /api/health` reports an available service and the expected practice/AI mode; this is not a full provider connectivity test.
- Register, log in and log out. Inspect cookie security over HTTPS.
- Create an interview, submit an answer, refresh and resume it.
- Finish the interview and reopen the saved report.
- Create a second account and confirm it cannot retrieve, change or delete the first account's sessions.
- Delete a test session and confirm it no longer appears.
- In AI mode, check provider failure recovery without losing the last saved answer; record the model and adapter compatibility actually tested.
- Restart the application and verify that saved sessions still exist.
- Test a narrow mobile viewport and keyboard-only navigation.

Record the release commit, automated check outputs, browser checks and any unverified cases in `PROJECT_STATUS.md`. A health response alone does not establish that real AI generation or all user journeys work.

## Limits before broader launch

The current version has no voice interview, PDF/DOCX parser or isolated code execution. Code is input text for review only; never add `eval`, a shell subprocess or host execution of student submissions as a shortcut.

Password reset, email verification and full account deletion are not included. Define student data retention and provider data handling before collecting real resumes. Review authentication abuse controls and add provider spending/rate limits appropriate to intended traffic. Evaluate the AI feedback quality with representative student answers before presenting the app as a dependable assessment tool. Scores are practice feedback, never a hiring guarantee.

## CI

`.github/workflows/ci.yml` runs syntax checks and Node tests on Linux and Windows with Node 24. AI environment values are empty; provider tests must use mocks. Production secrets are not passed to pull requests. The workflow has read-only repository permissions and does not retain checkout credentials.

GitHub action references are pinned to the commit IDs resolved from the official `v7` tags on 10 November 2026. Review upstream releases before updating those pins:

- [actions/checkout](https://github.com/actions/checkout)
- [actions/setup-node](https://github.com/actions/setup-node)
- [Node.js command-line options](https://nodejs.org/docs/latest-v24.x/api/cli.html)
