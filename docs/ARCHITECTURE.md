# Architecture decision: first runnable increment

Date: 10 November 2026. Related: #1.

## Repository baseline

`BhumikaNagpall/AI_Interview` was empty when verified. The agreed plan was added as the initial commit. No earlier application was replaced.

## Stack

- Node.js 24 with native HTTP, crypto and SQLite APIs.
- Browser ES modules, semantic HTML and responsive CSS.
- SQLite file on a persistent local/server volume; no external database account required to run locally.
- A server-side AI adapter; deterministic practice mode when AI is not configured.
- Node's built-in test runner and GitHub Actions.

This keeps the first version reproducible without dependency installation or paid infrastructure. It is a modular monolith: frontend, session API, interview engine and evaluation share one repository but have separate responsibilities. A later framework migration is possible without changing the API contract.

## Boundaries

The browser never receives provider credentials. Only the server reads environment configuration. User context and transcripts are sent to an AI provider only for AI-mode interviews. Passwords use scrypt hashing and session cookies are HttpOnly. Database access is owner-scoped.

Practice mode provides curated questions and reflection guidance. It does not claim AI generation, technical correctness scoring, code execution or hiring predictions. AI mode must validate response structure and evidence. Failures stay visible and never silently switch a session to practice mode.

## Session lifecycle

1. Authenticate and validate interview settings.
2. Generate and persist the first question.
3. Save each accepted answer before attempting the next provider call.
4. Prevent concurrent mutation of a session and duplicate answers.
5. Allow recovery from generation failure with the same answer and expected turn count.
6. Finish after at least one answer; save the report and mark completed atomically.
7. Completed sessions are read-only except owner deletion.

`expectedTurnCount` is the number of turns before an answer is submitted. Retrying a successful identical answer returns current state. Retrying a failed generation resumes from the saved answer, including after a page reload.

The selected duration maps to a bounded question budget; it is a practice target, not a promised wall-clock cutoff. Reports exclude unanswered questions.

## Initial scope and known follow-on work

Six rounds, four personas, two roles, login, persistent sessions, history, reports and a code-answer editor are in this increment. Resume context is pasted text or a .txt file; PDF/DOCX parsing remains future work. Code is reviewed as text and is never executed on the application server. A hardened external execution service is a separate part of #8.

Live AI verification requires user-supplied provider configuration. Production deployment requires HTTPS, appropriate persistent storage, backups and operational configuration. No service deployment or live AI test is implied by local tests.

## Shared contract

See [API_CONTRACT.md](API_CONTRACT.md). Authentication routes are explicitly `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and `/api/me`.
