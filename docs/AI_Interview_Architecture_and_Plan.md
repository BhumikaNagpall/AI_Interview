# AI Interview Preparation — Architecture and Development Plan

Date: 10 November 2026  
Status: Planning complete; awaiting the interview project's GitHub repository.  
Audience: B.Tech CSE and AI/ML students preparing for internships and fresher jobs.

## 1. Product objective

Build an AI mock interview website with specialist interviewers, adaptive follow-up questions, interviewer personalities, and personalised feedback. Begin with CSE/AI-ML and expand to other branches after the first version is reliable.

The student chooses a target role, interview round, personality, difficulty and duration. Interview content and interviewer behaviour are separate settings. Practice paths are suggested simulations, not guaranteed company hiring processes.

## 2. First-version scope

| Setting | Initial options |
| --- | --- |
| Target role | Software developer; AI/ML engineer |
| Interview round | Introduction/HR; resume/projects; DSA/coding; core CS; ML fundamentals; behavioural |
| Personality | Supportive; formal; detail-oriented; challenging |
| Difficulty | Beginner; intermediate; advanced |
| Duration | Short practice or full round; exact limits to be defined |
| Interaction | Text first; voice later |
| Personalisation | Optional resume or project description |
| Outputs | Answer-specific feedback, relevant scores, improvement guidance and session history |

### Six initial interviewers

1. **Introduction and HR:** self-introduction, motivation, strengths and career goals.
2. **Resume and projects:** personal contribution, implementation choices, challenges and evidence of results.
3. **DSA and coding:** problem-solving, correctness, complexity, edge cases and explanation.
4. **Core CS:** OOP, DBMS, operating systems and computer networks.
5. **AI/ML fundamentals:** preprocessing, model selection, evaluation, overfitting and practical ML reasoning.
6. **Behavioural:** teamwork, ownership, conflict, deadlines and learning from failure.

## 3. Interviewer personalities

Inspired by the user's supplied interviewer-types image. Its statistics are not adopted as product evidence.

| Inspiration | Proposed app behaviour | Phase |
| --- | --- | --- |
| Robot | Formal, structured questions and minimal small talk | First version |
| Nice guy | Supportive, friendly and encouraging | First version |
| Detail-oriented boss | Probes implementation, evidence, numbers and personal contribution | First version |
| Intimidator | Challenges assumptions with demanding but professional follow-ups | First version |
| Bored supervisor | Practice engaging an unresponsive interviewer | Later |
| Clueless boss | Practice explaining technical work to a nontechnical audience | Later |
| Innovator | Open-ended problems and alternative solutions | Later |
| Youngster | Casual peer-interviewer style without age-based assumptions | Later |

Personality changes delivery and follow-up style. It must not arbitrarily change scoring standards. A challenging interviewer must remain professional.

## 4. Student journey

1. Sign in and select a target role.
2. Choose round, personality, difficulty and duration.
3. Optionally supply a resume or project description.
4. Answer questions one at a time, including context-aware follow-ups.
5. Complete the session.
6. Receive scores, answer-specific feedback and suggested improvements.
7. Revisit session history and practise weaker topics.

Coding rounds include an editor and isolated execution. Until execution is connected, label AI code review separately from tested correctness.

## 5. Proposed logical architecture

This is a component-level proposal. Frameworks, database, AI provider, hosting and budget will be decided after repository inspection; no stack has been selected yet.

| Component | Responsibility |
| --- | --- |
| Web frontend | Profile, setup, interview conversation, coding editor, feedback and history |
| Application backend | Authentication, authorisation, session lifecycle, validation and persistence |
| Interview engine | Round configuration, personality, question selection, adaptive follow-ups and completion rules |
| AI provider adapter | Server-side model calls, structured responses, timeouts and recoverable failures |
| Evaluation service | Round-specific rubrics, answer evidence, feedback and improvement suggestions |
| Persistent database | Users, session settings, turns, evaluations and coding results |
| Resume processing | Validate uploads and extract relevant user-provided context |
| Isolated code runner | Execute supported code with resource limits and test cases, separate from the application server |

Use one shared interview engine with configurable rounds and personalities. Separate trained models are not required for every interviewer.

### Proposed data entities

- **User/Profile:** identity, academic context and target role.
- **InterviewSession:** owner, settings, lifecycle state and timestamps.
- **InterviewTurn:** question, answer, sequence and follow-up context.
- **Round/Persona configuration:** question strategy, difficulty guidance and rubric version.
- **Evaluation:** criterion scores, supporting answer evidence and improvement suggestions.
- **ResumeContext:** extracted context linked to its owner, with retention/deletion behaviour to be defined.
- **CodingSubmission:** code, language, execution status and test outcomes.

### Evaluation principles

- Evaluate technical accuracy, reasoning, completeness and communication where relevant.
- Support feedback with specific evidence from the student's answers.
- Use actual test outcomes for executed coding submissions.
- Distinguish incorrect, incomplete and unverified answers.
- Avoid presenting scores as guaranteed hiring outcomes.
- Keep rubric standards consistent across interviewer personalities.

## 6. GitHub backlog

These are proposed work items, not existing GitHub issue numbers.

| Plan ID | Issue | Primary owner | Dependencies |
| --- | --- | --- | --- |
| P01 | Verify existing project and define MVP acceptance criteria | Lead architect | Repository access |
| P02 | Define architecture, data model and API contracts | Architect | P01 |
| P03 | Build application shell, profile and interview setup | Frontend developer | P02 |
| P04 | Implement authentication and session storage | Backend developer | P02 |
| P05 | Build interview engine and personality configurations | AI engineer | P02 |
| P06 | Add CSE/AI-ML coverage and evaluation rubrics | AI engineer + QA | P01, P02 |
| P07 | Connect interview screen, follow-ups and session completion | Frontend + backend | P03–P06 |
| P08 | Implement feedback reports and interview history | Backend + frontend | P07 |
| P09 | Add coding editor and isolated execution | Backend + frontend | P07 |
| P10 | Test reliability, privacy and complete user journeys | QA engineer | Throughout; final checks after P08–P09 |
| P11 | Document setup and prepare deployment | DevOps engineer | Working, tested application |

Each issue must contain scope, acceptance criteria, dependencies, owner and verification steps.

## 7. Agent responsibilities and coordination

| Agent role | Responsibility |
| --- | --- |
| Lead architect / coordinator | Scope, architectural decisions, task allocation, integration and final review |
| Frontend developer | Pages, interview interface, accessibility and responsive layout |
| Backend developer | APIs, authentication, persistence and execution integration |
| AI engineer | Prompts, personalities, follow-up logic and evaluation rubrics |
| QA engineer | Functional checks, regression tests and evaluation consistency |
| DevOps engineer | Environment configuration, CI, deployment and documentation |

The user has requested agent delegation. Launch agents once repository context and task boundaries are available. Agree shared interfaces first, then run independent work in parallel. Track actual agents launched and actual results; do not describe planned agents as already running.

### Delivery workflow

1. Inspect the supplied repository and preserve useful existing work.
2. Adapt the backlog and create GitHub issues.
3. Agree shared contracts and assign bounded tasks to specialist agents.
4. Use dedicated task branches and isolated worktrees where needed.
5. Implement changes and run appropriate verification.
6. Open PRs linked to issues and review the changes.
7. Resolve failures and integration conflicts; merge only after review and required checks.
8. Update documentation, issue status and handoff notes.

## 8. Phased delivery

### Phase A — Foundation

Inspect repository, finalise MVP requirements and architecture, establish authentication, persistence and the application shell.

### Phase B — Complete text interview flow

Implement six interview rounds, four personalities, adaptive follow-ups, session completion, feedback and history.

### Phase C — Coding and reliability

Integrate the editor and isolated execution. Verify persistence, access control, failure recovery, evaluation behaviour and complete user journeys.

### Phase D — Deployment and handoff

Complete setup instructions, environment examples without secrets, CI and deployment verification.

### Later expansion

Voice interviews; aptitude and timed assessments; group discussions with multiple simulated participants; SQL/data analysis; frontend/backend specialisation; deep learning, CV, NLP and generative AI; ML case studies; beginner design interviews; practical assignment review; research internship interviews; higher-study admission interviews; project vivas; other engineering branches.

## 9. First-version completion criteria

- All six rounds work from setup to feedback.
- Follow-ups use the student's answers and supplied context.
- Four personalities are observably different while evaluation standards remain consistent.
- Feedback cites specific evidence from answers.
- Sessions and reports persist correctly and remain accessible only to authorised users.
- API failures do not erase previously saved work.
- Coding results distinguish executed tests from AI review.
- Secrets remain outside source control.
- Resume handling validates inputs and treats uploaded text as data, not system instructions.
- Setup instructions and the deployed application are verified.
- Tests, limitations and unverified areas are reported honestly.

## 10. Markdown progress and context handoff

Once the repository is available, maintain `docs/PROJECT_STATUS.md`. Update it at major milestones and before a context handoff, rather than relying on an exact token-limit warning.

Record:

- Agreed scope and decisions, including reasons for material changes.
- Completed work and remaining tasks.
- Repository URL, issues, branches, PRs and relevant commit IDs.
- Agent assignments, status and actual outputs.
- Tests run, outcomes and unverified areas.
- Current blockers and exact next steps.
- Setup requirements and environment variable names, never secret values.

On continuation, read the status document and verify relevant repository state before proceeding. Do not restart or repeat completed work without a specific reason.

## 11. Current checkpoint

- Completed: initial product scope, interviewer catalogue, personality mapping, proposed architecture, backlog and agent workflow.
- Completed: saved this planning document at the user's request.
- Pending: user provides the GitHub repository for this interview project.
- Not started: repository inspection, GitHub issue creation, agent execution, implementation, tests and deployment.
- Next action: inspect the supplied repository and convert this proposed backlog into concrete issues.

## 12. Decisions still open

- Repository URL and existing implementation.
- Final framework, database, model provider and hosting selection.
- AI/API spending limits and deployment constraints.
- Supported coding languages and execution service.
- Exact duration options, resume formats and retention policy.

Resolve these using the repository and user constraints before committing to implementation choices.
