# SchatPhone Documentation Map

Updated: 2026-05-19

This is the top-level map for project documents. If two documents seem to overlap, use this file to decide which one is current.

## 1. Fast Reading Order For AI Engineers

If you are taking over implementation work:

1. `docs/overview/PROJECT_MASTER_GUIDE.md`
2. `docs/roadmap/TODO_ROADMAP.md`
3. `docs/pm/TASK_PACKAGE_INDEX.md`
4. the matching package `README.md`
5. the matching package `STATUS_AND_HANDOFF.md`
6. the matching package boundary and implementation files
7. `docs/process/AI_WORK_MODE.md`

## 2. Fast Reading Order For PM Or Design Review

If you are reviewing product direction rather than coding:

1. `docs/pm/TODO_PM_STATUS_REPORT.md`
2. `docs/pm/PRODUCT_MANAGER_PROJECT_BRIEF.md`
3. `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`
   - then open the matching split category doc under `docs/pm/product-module-feature-catalog/`
4. `docs/pm/TASK_PACKAGE_INDEX.md`
5. `docs/strategy/PROJECT_ITERATION_PLAN.md`

## 3. Current Task Packages

Main package index:

- `docs/pm/TASK_PACKAGE_INDEX.md`

Every task package should contain:

1. `README.md`
2. `STATUS_AND_HANDOFF.md`
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`

Current packages:

1. `docs/pm/contacts-relationship-system-v2/README.md`
2. `docs/pm/chat-and-chat-directory/README.md`
3. `docs/pm/event-runtime-and-world-hub/README.md`
4. `docs/pm/map-calendar-reminders/README.md`
5. `docs/pm/commerce-finance-and-assets/README.md`
6. `docs/pm/visual-and-ia-governance/README.md`
7. `docs/pm/module-architecture-governance/README.md`

Compatibility entry docs still exist:

- `docs/pm/CONTACTS_RELATIONSHIP_SYSTEM_V2_REQUIREMENTS.md`
- `docs/pm/CONTACTS_RELATIONSHIP_SYSTEM_V2_IMPLEMENTATION_BREAKDOWN.md`

## 4. Functional Categories

| Category | Folder | Purpose |
| --- | --- | --- |
| PM status and product overview | `docs/pm/` | PM status, brief, feature catalog, task packages |
| Roadmap and task pool | `docs/roadmap/` | `TODO_ROADMAP.md` is the only live execution board; `PROJECT_MODULE_AUDIT.md` is a candidate pool; other roadmap notes are frozen unless promoted |
| Project overview | `docs/overview/` | whole-project guide plus engineering, event, and visual handoff references |
| Process and workflow | `docs/process/` | AI workflow, validation flow, runtime-control planning, operation guide |
| Architecture contracts | `docs/architecture/` | architecture boundaries and cross-module contracts |
| Product decisions | `docs/product-decisions/` | topic-level current decisions, not live task boards |
| Strategy | `docs/strategy/` | long-range project and technical direction |
| Design | `docs/design/` | visual ownership and style references |
| Templates | `docs/templates/` | reusable prompt, requirement, and audit templates |
| Archive | `docs/archive/` | historical or obsolete docs only |

## 5. Key Workflow Documents

- `docs/process/AI_WORK_MODE.md`
  - task-type reading order
  - top-level installed-skill routing map
  - end-of-round doc-sync matrix
  - copy-ready handoff prompt
- `docs/process/OPERATION_GUIDE.md`
  - commands and release flow
- `docs/process/DEVELOPMENT_TOOLING.md`
  - local tooling assumptions
  - project-local skill inventory
  - cross-PC setup and install notes
- `docs/process/EVENT_WORKFLOW.md`
  - event-specialist process
  - event/runtime skill invocation matrix
- `docs/process/VISUAL_WORKFLOW.md`
  - visual-only workflow
  - visual/IA skill invocation matrix
- `docs/process/RUNTIME_CONTROL_AND_CHEATS_PACK_PLAN.md`
  - planning entry for the future World Hub / Cheats formal task package

## 6. Frozen TODO / PLAN Rule

Only these documents can drive current implementation:

1. `docs/roadmap/TODO_ROADMAP.md`
   - the only live execution board;
   - the only place where concrete implementation order and active status can be trusted.
2. `docs/roadmap/PROJECT_MODULE_AUDIT.md`
   - candidate pool only;
   - use it for discovery and sorting, then promote the selected slice into `TODO_ROADMAP.md`.
3. package `STATUS_AND_HANDOFF.md` files
   - current package handoff only;
   - use them for context, next safe slice, and do-not-do rules, not as independent roadmaps.

Any other file whose name contains `TODO`, `NEXT`, `PLAN`, `ROADMAP`, `STATUS`, or `HANDOFF` is non-executable unless it is explicitly listed above or linked from the live roadmap for the current task.

If an older note contains a useful idea, do not implement from that note directly. First promote the concrete slice into `docs/roadmap/TODO_ROADMAP.md` and the matching task package handoff.

## 7. Archive Rule

- If a document is current, it must belong to one of the functional folders above.
- If a document is superseded, move it to `docs/archive/` and add an `Obsolete archive` note.
- Archived docs must not be used as active roadmaps, status reports, or implementation sources.

## 8. Naming And Runtime Reminder

Current naming/runtime references:

- `docs/pm/MODULE_NAME_GLOSSARY.md`
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`

Execution reminder:

- use package docs before coding;
- use `AI_WORK_MODE.md` for process;
- use `TODO_ROADMAP.md` as the only live execution board.
