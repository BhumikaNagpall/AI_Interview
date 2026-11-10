# Interview Studio

A text-based interview preparation website for B.Tech CSE and AI/ML students. Practise for software developer or AI/ML engineer roles with six interview rounds and four interviewer personalities.

This repository is under active development. See [project status](docs/PROJECT_STATUS.md) for completed work, test results, open issues and the next development step. The original [architecture plan](docs/AI_Interview_Architecture_and_Plan.md) describes the broader roadmap; [API contract](docs/API_CONTRACT.md) defines this implementation increment.

## Run locally

Install **Node.js 24 or later** and Git, then run these commands in a terminal (PowerShell, Command Prompt, macOS or Linux):

```sh
git clone https://github.com/BhumikaNagpall/AI_Interview.git
cd AI_Interview
node --version
npm start
```

Open **http://127.0.0.1:3000** and create a local account. No package installation, database server or AI API key is needed for practice mode. Run commands from the repository root so the default database path stays consistent. Stop the server with `Ctrl+C`.

The application uses Node's built-in HTTP server, SQLite, cryptography and test runner, plus browser JavaScript and CSS. No build step is required. Some Node releases display an experimental SQLite warning; use the maintained Node 24 release line or later and verify tests before upgrading production.

## What you can practise

| Round | Focus |
| --- | --- |
| Introduction and HR | Self-introduction, motivation and career goals |
| Resume and projects | Personal contribution, implementation choices and results |
| DSA and coding | Problem-solving, complexity, edge cases and explaining code |
| Core computer science | OOP, DBMS, operating systems and networks |
| AI/ML fundamentals | Data preparation, modelling, evaluation and overfitting |
| Behavioural | Teamwork, ownership, conflict and learning from failure |

Choose **supportive**, **formal**, **detail-oriented** or **challenging** delivery, plus beginner/intermediate/advanced difficulty. Personality affects the conversation, not the evaluation standard. Planned durations of 10, 20 and 30 minutes correspond to budgets of 4, 6 and 8 questions; they are not hard countdown deadlines.

Supply optional project/resume context by pasting text or selecting a `.txt` file (up to 48 KiB; extracted context up to 12,000 characters). PDF/DOCX parsing is not included. Avoid entering contact details or other information the interviewer does not need.

## Practice mode and AI mode

| Mode | Behaviour | Evaluation |
| --- | --- | --- |
| Practice — default | Curated questions and deterministic follow-ups; no external AI request | Reflection guidance; numeric accuracy scores are intentionally absent |
| AI — configured | Model-generated questions, follow-ups and evaluation through a server-side compatible provider | Rubric-based suggestions and answer evidence; not a hiring prediction |

There is **no code execution service** in this increment. Coding answers can be entered for discussion/review, but they are not compiled, executed or checked against test cases. A separate isolated runner remains tracked in the backlog. Voice interviews and group discussions are also future work.

AI provider integration is configurable, but **live-provider behaviour has not been verified with a paid API account**. Automated provider tests use mocks. Inspect the current project status for subsequent verification.

### Optional AI configuration

Copy the example environment file:

```sh
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bat
:: Windows Command Prompt
copy .env.example .env
```

Edit `.env` locally, setting **both** `AI_API_KEY` and `AI_MODEL` to values supported by your provider. `AI_BASE_URL` defaults to `https://api.openai.com/v1`; configure another compatible provider only if it implements the adapter's required chat-completion format. Restart the server after configuration changes.

The API key is used on the server. Never paste it into the browser, a GitHub issue, a commit or a screenshot. `.env` and runtime databases are ignored by Git. API usage may incur provider charges. In AI mode, interview context and answers are sent to the configured provider; practice mode does not send them to a model provider.

A session keeps the mode it started with. Provider failure does not silently become a practice-mode evaluation. Previously saved answers remain available for retry.

## Development checks

```sh
npm run check
npm test
```

`check` performs JavaScript syntax checks; `test` uses Node's test runner. Tests should use temporary databases and mocked AI calls. Neither command is a substitute for browser accessibility checks or live-provider validation.

GitHub Actions runs the same checks on pushes and pull requests using Node 24 on Linux and Windows. It does not install dependencies, deploy the application or receive production AI secrets. A passing run is evidence for that tested commit, not a claim of production readiness.

## Persistence and account data

The default database is `data/interview.sqlite`. Accounts, saved interview turns, context and completed reports live on the server, so refreshing the browser does not erase saved sessions. Passwords are hashed; session cookies are HTTP-only. Session access is restricted to the signed-in owner.

Deleting an interview removes its stored session/report from the active application database. Copies in administrator backups or the model provider's systems are governed separately. Full account deletion, password reset and email verification are not provided in this increment. Do not use this development build for an unrestricted public student launch without reviewing these gaps and the deployment checklist.

## Project layout

```text
public/                   Browser interface and styles
server/                   HTTP API, SQLite persistence and interview engine
tests/                    Automated tests
docs/API_CONTRACT.md      Shared component contract
docs/PROJECT_STATUS.md    Current progress and continuation handoff
docs/DEPLOYMENT.md        Hosting, persistence, backup and verification guidance
.env.example              Configuration names without credentials
```

## Collaboration

Work is tracked in [GitHub issues](https://github.com/BhumikaNagpall/AI_Interview/issues). Each implementation task uses a branch and a linked pull request. Record actual tests and limitations, obtain review before merging, and update `docs/PROJECT_STATUS.md` at milestones so the next session can continue without restarting completed work.

See [deployment guidance](docs/DEPLOYMENT.md) before making the service available beyond your computer.
