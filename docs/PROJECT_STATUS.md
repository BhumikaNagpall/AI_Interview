# AI Interview — Project Status

Updated: 10 November 2026. Repository: https://github.com/BhumikaNagpall/AI_Interview

## Current result

The first text-interview increment is implemented on task branches. It is not yet a fully accepted or deployed MVP. The complete integrated source is on `task/6-integration` once its PR is published. Do not restart from the initial plan or assume main already contains the application.

Stack: Node.js 24, native HTTP/crypto/SQLite, browser ES modules and CSS. No dependency installation is required. Six rounds, four personas, two target roles. Practice mode works without a paid provider. See ARCHITECTURE.md and API_CONTRACT.md.

## Completed implementation

- Account registration, login/logout, scrypt password hashing, expiring hashed session tokens and HttpOnly cookies.
- Private SQLite interview persistence, owner checks, bounded inputs, origin checks and per-session concurrency guards.
- Guided questions for six rounds, all difficulty/personality/role combinations, and answer-dependent follow-ups.
- Optional server-side AI adapter with bounded responses/timeouts, output validation, quoted answer evidence, pinned session mode and no silent fallback.
- Dashboard, setup, text-context import, interview/retry screens, report/history/deletion UI and review-only coding textarea.
- Answer persistence before follow-up generation; identical retries do not duplicate answers.
- Setup instructions, example environment, CI and production guidance.
- Corrected example environment: AI_BASE_URL is blank so copying it does not break practice mode.
- Corrected server startup to accept preview --host/--port arguments; replaced unverified “AI connected” UI claim with “AI mode”.

## GitHub tracking

Architecture PR #12 was reviewed and merged. Main at that checkpoint: `c74a7956b2f773b70d2bc12595700b67fd7d3c0c`.

| PR | Branch | Base | Scope / state at checkpoint |
| --- | --- | --- | --- |
| #13 | task/4-interview-engine | main | Engine and catalogue; open, reviewed locally |
| #14 | task/3-backend | task/4-interview-engine | Auth/storage/recovery; open, reviewed locally |
| #15 | task/2-frontend | task/3-backend | UI; draft pending authenticated browser acceptance |
| Integration PR (look up by branch) | task/6-integration | task/2-frontend | Independent tests, setup/CI, fixes and this handoff |

These are stacked PRs. If merging an earlier PR, retarget its successor appropriately and verify its diff; do not squash/rebase the stack blindly.

Issue map: #1 architecture (completed via #12); #2 dashboard/setup; #3 auth/storage; #4 engine/provider; #5 questions/rubrics; #6 integration; #7 reports/history; #8 coding/execution; #9 QA; #10 setup/CI/deployment; #11 handoff. Open issues remain open until their full acceptance criteria are verified. A code editor alone does not close #8.

## Actual agent work

| Agent | Delivered work | Local source commit |
| --- | --- | --- |
| backend | Auth, persistence, concurrency/retries, seven tests | f936f63 |
| ai_engine | Engine, question bank and fourteen tests | 722e94e |
| qa | Five independent API acceptance tests and review | 07882c2 |
| devops | README, environment example, CI and deployment guide | 611c1d1 |
| architecture_review | Read-only review; auth routes, retry semantics and mutation locking clarified | No code commit |
| original frontend | Uncommitted UI files survived interrupted turn | Continued below |
| frontend_finish | Recovered UI, repaired interrupted syntax and saved-answer retry state | 85e669a |
| integration_review | Read-only review caught broken example environment and inaccurate AI badge | Fixed by lead |
| root | Architecture, integration, additional tests, preview fix, publishing and handoff | task/6-integration |

Agent execution is not ongoing after the handoff. New continuation work should reuse these artifacts, not assume old agents are still running. GitHub connector publication produces different remote commit IDs from local source commits; use remote branch heads when merging.

## Verification evidence

- `npm test`: 28 tests passed, zero failures. Breakdown: 7 backend + 5 independent acceptance + 14 engine + 2 integration/configuration tests.
- All six rounds completed through the real practice engine and HTTP API, including automatic completion and saved reflection reports.
- Engine matrix covers two roles × six rounds × four personas × three difficulties.
- Provider tests use mocks: failures, malformed/truncated/oversized responses, invented evidence and missing configuration are rejected.
- `npm run check`: passed JavaScript syntax checks.
- `git diff --check`: passed.
- Browser: sign-in screen rendered correctly at desktop size in managed preview. No authenticated browser flow or mobile interaction was completed.
- Preview startup: confirmed after supporting --host/--port. Preview is temporary QA infrastructure, not production hosting.
- CI workflow pins verified actions/checkout and actions/setup-node v7 commit hashes; CI execution must be checked on the published integration PR. Do not assume it has passed merely because local tests did.

## Remaining acceptance / limitations

1. Authenticated browser acceptance: register/login, setup, submit/retry, refresh/resume, finish/report, history/delete and mobile/keyboard checks. API tests are not equivalent to browser tests.
2. Real AI validation needs privately supplied AI_API_KEY and AI_MODEL configuration. No key was supplied, no paid call made, no live-model quality claim.
3. Isolated code execution is unimplemented (#8). Code is never executed on the application server.
4. Production deployment, HTTPS, backups and operating configuration remain unverified (#10).
5. Text context only (.txt/paste); PDF/DOCX parsing, voice and group discussion remain future scope.
6. One server process only: locks/rate limits are in memory. Password reset, email verification and account deletion are not yet implemented.

## Exact next steps

1. Read this file and inspect remote PR/branch status; local and remote commit hashes differ due to connector publishing.
2. Check CI on the integration PR and fix actual failures.
3. Complete authenticated UI acceptance through an authorised test sign-in; browser credential guidance prevented automatic model-visible credential entry, so the lead did not bypass authentication or alter the app to skip it.
4. Configure/test a real AI provider privately when available. Never put keys in chat, commits, issues or handoff notes.
5. Review and merge accepted changes in stack order; leave incomplete features tracked.
6. Select an isolated code runner and production hosting based on user budget before wider release.

## Local continuation paths

Primary checkout: `/workspace/scratch/cbc26be325b6/AI_Interview` on `task/6-integration`. Sibling task worktrees remain for backend, engine, frontend, QA and DevOps. Git clone/read works; CLI push lacked authentication, so publish through the connected GitHub tools. No credentials were committed.
