# SchatPhone AI Work Mode

Updated: 2026-06-12

Purpose: define a stable operating model for Codex, Claude, or any AI coding assistant taking over this project.

This file is the single workflow/process rulebook. It does not replace the task board; it defines how task documents should be used, what to read first, and what must be synced after each work round.

If this file conflicts with a project-local skill, package note, archived plan, or old TODO-style reference, this file wins unless the user explicitly overrides the workflow for that round.

## 0. Core Workflow Principle

One request should produce:

1. executable implementation;
2. validation;
3. synchronized documentation;
4. updated execution status when roadmap impact exists.

Do not let code run ahead while docs still describe an old product meaning.

## 1. Documentation Authority

| Document | Role | Rule |
| --- | --- | --- |
| `docs/README.md` | documentation map | Use first when choosing which document to read or update. |
| `docs/overview/PROJECT_MASTER_GUIDE.md` | whole-project overview | Read first for product and architecture context. |
| `docs/roadmap/TODO_ROADMAP.md` | only live execution board | Any executable task with status must live here. |
| `docs/roadmap/PROJECT_MODULE_AUDIT.md` | module maturity audit and candidate pool | Use for sorting and discovery only; promote active work into `TODO_ROADMAP.md`. |
| `docs/pm/TODO_PM_STATUS_REPORT.md` | PM-readable status mirror | Sync after meaningful roadmap, boundary, or current-priority change. |
| `docs/process/OPERATION_GUIDE.md` | daily operation and validation guide | Use for commands, QA flow, and release/deploy steps. |
| `docs/process/AI_WORK_MODE.md` | workflow and documentation governance | This file. Keep process rules here instead of creating new process docs. |
| `.agents/skills/schatphone-workflow/SKILL.md` | takeover shortcut skill | Mirrors this workflow as a quick checklist. It must not become a second authority. |
| `docs/pm/TASK_PACKAGE_INDEX.md` | task-package index | Use when deciding which package should own the current task. |
| package `STATUS_AND_HANDOFF.md` | current handoff page | Read after package `README.md` to see current status, next safe slice, and do-not-do rules. |
| domain reference docs, including old `TODO` / `NEXT` / `PLAN` notes | decisions, contracts, and domain details | Must not become active task boards unless explicitly promoted into `TODO_ROADMAP.md`. |
| `docs/superpowers/**` | agent-assisted specs, plans, handoffs, and content drafts | Treat as execution history, reference material, or draft content unless a roadmap/package handoff links to a specific active slice. |
| `docs/archive/**` | historical lookup only | Never use as current execution source. |

## 2. Anti-Scatter Rules

1. Do not create a new roadmap, task pool, or workflow document when an existing category fits.
2. Put active execution status in `docs/roadmap/TODO_ROADMAP.md` only.
3. Keep module-level ideas in `docs/roadmap/PROJECT_MODULE_AUDIT.md` until selected for execution.
4. Keep implementation process rules in this file.
5. Move superseded planning/status docs into `docs/archive/` with a reason note.
6. Mark obsolete archives with `Obsolete archive`.
7. Treat every non-listed `TODO`, `NEXT`, `PLAN`, `ROADMAP`, `STATUS`, or `HANDOFF` file as frozen context, not executable work.
8. If a frozen note has a useful idea, copy the concrete slice into `TODO_ROADMAP.md` and the matching package handoff before implementation.
9. Do not continue an old checklist just because it contains `NEXT`, `TODO`, or unchecked items.
10. Do not resume `docs/superpowers/**` files as active project work unless the roadmap or package handoff has promoted that exact slice.

## 3. Role Definition

- You are the primary engineer for this project and should implement directly, not only suggest ideas.
- The user can provide natural-language requests without technical decomposition.
- You must translate requests into executable tasks and deliver implementation + validation + docs sync.

## 3.1 Communication Rule

When talking with the user, PM reviewers, designers, or incoming AI coworkers, default to product and user-facing language.

Rules:

1. Explain what a feature does, why it matters, and what the user will see before describing files, fields, or implementation details.
2. Use Chinese module and feature names when the conversation is product-facing, and add English code names only when they help locate implementation.
   For UX labels, onboarding copy, settings entries, and handoff text, prefer bilingual product naming when the feature is cross-team or newly introduced, for example `事件前台 Tick / Foreground event tick` and `角色主动联系候选 / Role proactive contact candidate`.
3. Translate technical terms into product meaning, for example "Chat only applies confirmed communication state" before "`chatSocialState` is written".
4. Do not assume the reader can infer product impact from store names, schema fields, route names, or test names.
5. Put technical detail after the product explanation, not instead of it.
6. When a concept affects immersion, user control, safety, or data ownership, say that explicitly in user-understandable terms.

This rule applies to answers, handoff notes, specs, implementation plans, review findings, and roadmap updates.

## 4. Dual-Track Execution

- Track A: immediate request track (`user-now`)
- Track B: main roadmap track (`docs/roadmap/TODO_ROADMAP.md`)
- Track C: candidate module pool (`docs/roadmap/PROJECT_MODULE_AUDIT.md`)

Rules:

- user request takes priority, but roadmap status must be backfilled after each insertion;
- Track C is for sorting, not execution status;
- promote selected work into Track B before implementation.

## 5. Task-Type Reading Order

Read the smallest current set that matches the work.

### 5.1 Any Non-Trivial Coding Task

Read in order:

1. `docs/README.md`
2. `docs/overview/PROJECT_MASTER_GUIDE.md`
3. `docs/roadmap/TODO_ROADMAP.md`

### 5.2 Contacts / Role / Relationship / Memory Task

Read in order:

1. `docs/README.md`
2. `docs/pm/contacts-relationship-system-v2/README.md`
3. `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
4. matching file inside that package:
   - `PRODUCT_BOUNDARY.md`
   - `DESTRUCTIVE_ACTIONS.md`
   - `ROLE_HUB_INFORMATION_ARCHITECTURE.md`
   - `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
6. `docs/architecture/ROLE_BINDING_CONTRACT.md` when binding shape or field semantics are involved

### 5.3 Event / Runtime / Surprise / Trigger Task

Read in order:

1. `docs/pm/event-runtime-and-world-hub/README.md`
2. `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
3. `docs/process/EVENT_WORKFLOW.md`
4. `docs/architecture/SIMULATION_EVENT_ENGINE.md`
5. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when relationship facts are involved
6. `docs/overview/IMMERSIVE_EVENT_TODO.md`
7. `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md` when the task touches World Hub, GM control, Cheats, runtime review, unlock flow, or future override controls
8. `docs/process/RUNTIME_CONTROL_AND_CHEATS_PACK_PLAN.md` when the task needs to define or extend the future World Hub / Cheats task package

### 5.4 Chat / Chat Directory / Service Accounts Task

Read in order:

1. `docs/pm/chat-and-chat-directory/README.md`
2. `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
3. the matching file inside that package
4. `docs/architecture/ROLE_BINDING_CONTRACT.md`

### 5.5 Map / Calendar / Reminders Task

Read in order:

1. `docs/pm/map-calendar-reminders/README.md`
2. `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`
3. the matching file inside that package
4. `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`

### 5.6 Commerce / Finance / Assets Task

Read in order:

1. `docs/pm/commerce-finance-and-assets/README.md`
2. `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
3. the matching file inside that package
4. `docs/product-decisions/HOME_FOLDER_SHOPPING_ASSETS_DIRECTION.md`

### 5.7 Visual / Interaction / IA Task

Read in order:

1. `docs/pm/visual-and-ia-governance/README.md`
2. `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
3. `docs/design/DESIGN.md`
4. `docs/overview/APPEARANCE_REBUILD_SCOPE.md`
5. `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md`
6. `docs/process/VISUAL_WORKFLOW.md`

### 5.8 Module Audit / Architecture Cleanup Task

Read in order:

1. `docs/pm/module-architecture-governance/README.md`
2. `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`
3. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
4. `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`
5. `docs/roadmap/PROJECT_MODULE_AUDIT.md`

## 5.9 Installed Skill Routing Map

Workflow docs already own most skill-routing detail. Use this section as the top-level map so future assistants do not have to guess where skill expectations live.

### Baseline takeover skill

- `schatphone-workflow`
  - use for any non-trivial SchatPhone continuation task;
  - mirrors the reading order, package selection, and end-of-round doc sync from this file.

### Planning and requirement-pressure skills

- `brainstorming`
  - use before new feature creation, major behavior changes, or unclear product design;
  - not required for audits, bug fixes, doc sync, status reviews, or already-promoted roadmap/package work with clear acceptance;
  - output should be a reviewed design/spec before implementation planning.
- `grill-me`
  - use to stress-test an existing plan, architecture proposal, or requirement set;
  - prefer answering questions from project docs/code first, and ask the user only when a decision cannot be inferred safely.
- `writing-plans`
  - use after a spec or clear requirement exists and before multi-step implementation;
  - skip for small doc/code fixes where the scope and validation are obvious;
  - output should be an implementation plan with concrete files, tests, validation commands, and small executable tasks.

### Event / runtime / relationship-engineering lane

Read `docs/process/EVENT_WORKFLOW.md` for the detailed invocation matrix.

Primary skills for this lane:

- `improve-codebase-architecture`
- `pinia`
- `vue-pinia-best-practices`
- `unit-test-vue-pinia`
- `playwright-testing`
- `game-engine` only for true game-loop/minigame work
- `frontend-logic-design` when the event surface itself has IA problems

### Visual / IA lane

Read `docs/process/VISUAL_WORKFLOW.md` for the detailed invocation matrix.

Primary skills for this lane:

- `frontend-design`
- `frontend-logic-design`
- `image-to-code` when a source image, screenshot, or design export must be restored into code with strict 750px visual matching
- `impeccable`
- `web-design-guidelines`

Machine-local visual support skills may also be documented there when available.

### Tooling / install / inventory lane

Read `docs/process/DEVELOPMENT_TOOLING.md` when the task is about:

- confirming which project-local skills are installed;
- reproducing setup on another PC;
- checking `skills-lock.json` or `.agents/skills`;
- understanding which workflow already covers which skill family.

### Rule

If a workflow starts depending on a project-local skill and that dependency is not documented, update:

1. the workflow doc;
2. this file;
3. `docs/process/DEVELOPMENT_TOOLING.md` when inventory or install assumptions changed.

### Skill Conflict And Tool-Policy Overrides

- Apply broad skill trigger language through this SchatPhone map. A generic skill that says "always" or "MUST" does not expand the project workflow beyond the scope defined here.
- Subagent or Agent-tool instructions inside a skill are optional and must obey the current tool policy. If subagents are unavailable or not explicitly requested, complete the equivalent local repo scan and note the fallback in the delivery.
- A skill must not create a second roadmap, second task board, or competing package handoff. Promote active work into `TODO_ROADMAP.md` and the matching package `STATUS_AND_HANDOFF.md`.
- If a skill's recommended validation command conflicts with `docs/process/DEVELOPMENT_TOOLING.md`, use the machine-local command convention from `DEVELOPMENT_TOOLING.md`.

## 6. Requirement Translation Template

For each request, define:

- goal: user-visible result
- scope: files to touch and not to touch
- acceptance: functional and interaction criteria
- risks: compatibility, migration, regressions
- priority: high/medium/low and whether it blocks mainline

## 7. Prioritization and Interrupt Rules

- High priority: blocking bug or data-risk issue -> execute immediately.
- Medium priority: non-blocking feature or UX issue -> merge into current iteration in small steps.
- Low priority: optimization -> register in roadmap backlog.
- If conflict exists: satisfy user first, then explicitly re-sequence roadmap.

## 8. Standard Delivery Cycle

1. Translate the request quickly.
2. Scan relevant code and docs.
3. Implement the minimum viable change.
4. Run required checks, using the logical command names below; on the current Windows PowerShell machine, prefer the `.cmd` forms documented in `docs/process/DEVELOPMENT_TOOLING.md`:
   - `npm run lint`
   - `npm run build`
   - `npm run test` when behavior changed
5. Report user-visible outcomes and impact.
6. Sync docs and roadmap status.

## 9. End-Of-Round Documentation Sync Matrix

Use this matrix at the end of every meaningful work round.

| Change type | Must sync |
| --- | --- |
| route/schema/core interaction change | `docs/overview/PROJECT_MASTER_GUIDE.md`, `docs/roadmap/TODO_ROADMAP.md`, `docs/pm/TODO_PM_STATUS_REPORT.md`, `docs/architecture/ARCHITECTURE.md` |
| Contacts / role / relationship semantic change | `docs/pm/contacts-relationship-system-v2/README.md`, `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`, plus the matching file in that package, `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`, `docs/pm/TODO_PM_STATUS_REPORT.md`, `docs/roadmap/TODO_ROADMAP.md` when status changed |
| Chat / Chat Directory / service-account semantic change | `docs/pm/chat-and-chat-directory/README.md`, `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`, plus the matching file in that package, `docs/architecture/ROLE_BINDING_CONTRACT.md` when binding semantics changed, `docs/pm/TODO_PM_STATUS_REPORT.md` when status changed |
| Chat binding contract or role-context field change | `docs/architecture/ROLE_BINDING_CONTRACT.md`, `docs/architecture/ARCHITECTURE.md`, Contacts package docs when product meaning changed |
| event-engine or runtime-rule change | `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`, `docs/process/EVENT_WORKFLOW.md`, `docs/architecture/SIMULATION_EVENT_ENGINE.md`, `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`, PM/roadmap docs when priority or scope changed |
| World Hub / Cheats / runtime-control meaning change | `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`, `docs/process/RUNTIME_CONTROL_AND_CHEATS_PACK_PLAN.md`, plus PM/roadmap docs when priority or package scope changed |
| Map / Calendar / Reminders boundary change | `docs/pm/map-calendar-reminders/README.md`, `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`, plus the matching file in that package, `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`, `docs/pm/TODO_PM_STATUS_REPORT.md` when status changed |
| Commerce / Finance / Assets boundary change | `docs/pm/commerce-finance-and-assets/README.md`, `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`, plus the matching file in that package, `docs/product-decisions/HOME_FOLDER_SHOPPING_ASSETS_DIRECTION.md`, `docs/pm/TODO_PM_STATUS_REPORT.md` when status changed |
| visual direction or large IA change | `docs/overview/APPEARANCE_REBUILD_SCOPE.md`, `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md`, `docs/process/VISUAL_WORKFLOW.md` when workflow changed |
| visual / IA governance change | `docs/pm/visual-and-ia-governance/README.md`, `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`, plus the matching file in that package, `docs/process/VISUAL_WORKFLOW.md`, `docs/pm/TODO_PM_STATUS_REPORT.md` when priority changed. Routine visual-only polish does not need PM/roadmap sync unless it changes scope, IA, ownership, or priority. |
| module maturity or next-slice priority change | `docs/pm/module-architecture-governance/README.md`, `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`, plus the matching file in that package, `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`, `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`, `docs/roadmap/PROJECT_MODULE_AUDIT.md`, `docs/pm/TODO_PM_STATUS_REPORT.md` |

## 10. Response Format

Each delivery should include:

- modified files
- what changed
- user-visible results
- validation results
- impact on roadmap
- optional next 1-3 steps

## 11. Engineering Constraints

- Stack: Vue 3 + Vite + Pinia + Vue Router + Tailwind v4
- All AI requests must go through `src/lib/ai.js`.
- Do not hide or delete `app_*` Home entries.
- Key input pages must keep explicit save action and feedback.

## 12. Definition Of Done

- request is implemented and reproducible
- core user path is not regressed
- required checks pass:
  - `npm run lint`
  - `npm run build`
  - `npm run test` when behavior logic changed
- documentation and roadmap are updated in the same turn

## 13. Copy-Ready Handoff Prompt

```text
You are taking over the SchatPhone project.

Execution rules:
1) Read docs/README.md, docs/overview/PROJECT_MASTER_GUIDE.md, and docs/roadmap/TODO_ROADMAP.md first.
2) Read docs/pm/TASK_PACKAGE_INDEX.md and enter the matching package before coding.
3) Read the matching package STATUS_AND_HANDOFF.md before changing code.
4) Translate the request into goal, scope, acceptance, and risk.
5) After each meaningful code round, run validation and sync the required docs in docs/process/AI_WORK_MODE.md.
6) Route AI calls only through src/lib/ai.js.
```
