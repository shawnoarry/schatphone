---
name: schatphone-workflow
description: Use this skill when taking over SchatPhone implementation work. It mirrors the required reading order, task-package selection, end-of-round documentation sync matrix, and semantic guardrails from docs/process/AI_WORK_MODE.md across Contacts, Chat, event runtime, World Hub, Cheats, commerce modules, visual governance, and architecture cleanup.
---

# SchatPhone Workflow

Use this skill whenever the task is about continuing SchatPhone work rather than answering a generic code question.

This skill is the baseline takeover shortcut, not an independent workflow authority. The canonical process authority is `docs/process/AI_WORK_MODE.md`; if this skill conflicts with that file, follow `AI_WORK_MODE.md` and sync this skill.

For specialist skill routing:

- use `docs/process/EVENT_WORKFLOW.md` for event/runtime engineering skills;
- use `docs/process/VISUAL_WORKFLOW.md` for visual/IA skills;
- use `docs/process/DEVELOPMENT_TOOLING.md` for project-local skill inventory and setup assumptions.

## 1. First Read Order

For any non-trivial task, read:

1. `docs/process/AI_WORK_MODE.md`
2. `docs/README.md`
3. `docs/overview/PROJECT_MASTER_GUIDE.md`
4. `docs/roadmap/TODO_ROADMAP.md`
5. `docs/pm/TASK_PACKAGE_INDEX.md`

Then pick the matching task package below.

## 2. Task Packages

### Contacts / Role / Relationship / Memory

Read:

1. `docs/pm/contacts-relationship-system-v2/README.md`
2. `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
3. the matching focused file in that package
4. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
5. `docs/architecture/ROLE_BINDING_CONTRACT.md` when field semantics or binding shape matter

Key guardrails:

- `Contacts` owns the global role archive and destructive role management
- `Chat Directory` owns Chat-side binding only
- `Chat` owns ordinary message history and manual chat deletion
- `Relationship Runtime` owns relationship progress and memory groups

### Chat / Chat Directory / Service Accounts

Read:

1. `docs/pm/chat-and-chat-directory/README.md`
2. `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
3. the matching focused file in that package
4. `docs/architecture/ROLE_BINDING_CONTRACT.md`

### Event / Runtime / World Hub / Cheats

Read:

1. `docs/pm/event-runtime-and-world-hub/README.md`
2. `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
3. the matching focused file in that package
4. `docs/process/EVENT_WORKFLOW.md`
5. `docs/architecture/SIMULATION_EVENT_ENGINE.md`
6. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when relationship facts are involved
7. `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`

### Map / Calendar / Reminders

Read:

1. `docs/pm/map-calendar-reminders/README.md`
2. `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`
3. the matching focused file in that package
4. `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`

### Commerce / Finance / Assets

Read:

1. `docs/pm/commerce-finance-and-assets/README.md`
2. `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
3. the matching focused file in that package
4. `docs/product-decisions/HOME_FOLDER_SHOPPING_ASSETS_DIRECTION.md`

### Visual / IA Governance

Read:

1. `docs/pm/visual-and-ia-governance/README.md`
2. `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
3. the matching focused file in that package
4. `docs/design/DESIGN.md`
5. `docs/overview/APPEARANCE_REBUILD_SCOPE.md`
6. `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md`
7. `docs/process/VISUAL_WORKFLOW.md`

### Module Architecture / Governance

Read:

1. `docs/pm/module-architecture-governance/README.md`
2. `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`
3. the matching focused file in that package
4. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
5. `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`

## 3. Per-Round Execution Pattern

For each meaningful work round:

1. restate goal, scope, acceptance, and risk
2. scan relevant code and docs
3. implement the smallest coherent slice
4. run:
   - `npm run lint`
   - `npm run build`
   - `npm run test` when behavior changed
5. sync docs before finishing the round

Use these as logical package-script names. On the current Windows PowerShell setup, prefer `npm.cmd` invocations from `docs/process/DEVELOPMENT_TOOLING.md`.

## 3.1 Communication Rule

When explaining SchatPhone work to the user, PM reviewers, designers, or incoming AI coworkers, use product and user-facing language first.

- Explain what the feature means, what the user can do, and what changes in the product experience before naming files, stores, fields, or tests.
- Use Chinese module and feature names in product-facing explanations; add English code names only as implementation references.
- Translate technical statements into user meaning, for example: "Chat only applies confirmed communication state" before "`chatSocialState` changes".
- Do not rely on route names, schema names, or store names to explain product behavior.
- Keep technical detail as support after the product explanation.

## 4. End-Of-Round Doc Sync Matrix

Always check whether the change requires syncing:

- `docs/overview/PROJECT_MASTER_GUIDE.md`
- `docs/roadmap/TODO_ROADMAP.md`
- `docs/pm/TODO_PM_STATUS_REPORT.md`
- `docs/architecture/ARCHITECTURE.md`

Additional required sync:

- Contacts/relationship semantic changes:
  - `docs/pm/contacts-relationship-system-v2/README.md`
  - `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
- Chat/Directory/service-account semantic changes:
  - `docs/pm/chat-and-chat-directory/README.md`
  - `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
  - `docs/architecture/ROLE_BINDING_CONTRACT.md` when binding semantics changed
- event/runtime/World Hub/Cheats meaning changes:
  - `docs/pm/event-runtime-and-world-hub/README.md`
  - `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
  - `docs/process/EVENT_WORKFLOW.md`
  - `docs/architecture/SIMULATION_EVENT_ENGINE.md`
  - `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`
- Map/Calendar/Reminders boundary changes:
  - `docs/pm/map-calendar-reminders/README.md`
  - `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`
  - `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
- commerce/finance/assets boundary changes:
  - `docs/pm/commerce-finance-and-assets/README.md`
  - `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
  - `docs/product-decisions/HOME_FOLDER_SHOPPING_ASSETS_DIRECTION.md`
- visual/IA direction changes:
  - `docs/pm/visual-and-ia-governance/README.md`
  - `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
  - `docs/process/VISUAL_WORKFLOW.md`
- architecture/governance changes:
  - `docs/pm/module-architecture-governance/README.md`
  - `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`

## 5. Delivery Format

Every delivery should include:

- modified files
- what changed
- user-visible results
- validation results
- impact on roadmap
- optional next steps
