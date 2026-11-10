# Independent QA review

Date: 10 November 2026

## Verified in this increment

Five API acceptance tests passed using the backend worktree's current `server/app.js` with an injected deterministic engine and temporary SQLite files. A temporary copy of the test changed only the import path to the sibling backend worktree; the committed test uses the final repository path.

1. A second user cannot read, answer, finish or delete another user's interview; their history is isolated.
2. An answer survives a generation failure; provider details are hidden; identical retries do not create duplicate answers or questions.
3. Completing requires an answer, reports survive application restart, late answers cannot mutate a completed interview, and deletion removes access.
4. Cross-origin writes, invalid setup values and unauthenticated session reads are rejected.
5. Finish and delete requests cannot race with an in-flight generation request.

Command after integration: `node --test tests/acceptance.test.js`.

Syntax check: `node --check tests/acceptance.test.js` passed.

## Source review

Backend review observed ownership-filtered queries, scrypt password hashing, hashed session tokens, HttpOnly/SameSite cookies, bounded JSON input, explicit public-asset allowlist, CSP, same-origin write checks and per-session locks. These observations supplement the tests; they are not a full security audit.

## Not verified by this QA task

- Live AI-provider responses, provider billing and real-model answer quality.
- Browser rendering, accessibility with assistive technology and mobile interaction.
- A deployed HTTPS environment, backups/restoration under production load, multi-process operation or distributed rate limiting.
- Isolated code execution, which is not implemented in this increment.

The backend is a single-process initial implementation. Process-local locks and rate limits are not sufficient for a multi-process deployment without additional coordination.

## Integrated checkpoint

The lead ran the complete integrated suite: 28 tests passed (including six actual practice rounds through HTTP and a regression for copying .env.example). JavaScript syntax and whitespace checks passed. Independent integration review found and the lead fixed the example-environment startup failure and the unsupported “AI connected” label.

Desktop sign-in rendering was observed in the browser. Authenticated UI and mobile interactions remain unverified; the frontend PR remains draft. No live provider calls or production deployment took place.
