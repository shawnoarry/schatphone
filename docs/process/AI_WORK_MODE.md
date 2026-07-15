# SchatPhone Project Execution Contract

Updated: 2026-07-16

Purpose: define the small set of cross-task rules that every SchatPhone work round must preserve.

This file is a project execution contract, not a universal implementation workflow. Task packages own domain reading order, product boundaries, workstreams, validation detail, and documentation sync for their lane. Specialist workflow documents own their own invocation and skill-routing rules.

## 1. Authority

Apply instructions in this order:

1. the current user request and host/tool policy;
2. this cross-task execution contract;
3. `docs/roadmap/TODO_ROADMAP.md` for live priority and status;
4. the matching task package `README.md`, `STATUS_AND_HANDOFF.md`, `PRODUCT_BOUNDARY.md`, and `IMPLEMENTATION_WORKSTREAMS.md`;
5. focused architecture, product-decision, design, or QA contracts required by the change.

Authority boundaries:

- `AGENTS.md` is the stable bootstrap, not a second workflow.
- `docs/roadmap/TODO_ROADMAP.md` is the only live execution board.
- Package handoffs describe current domain status and the next safe slice; they do not create another backlog.
- `docs/roadmap/PROJECT_MODULE_AUDIT.md` is a candidate pool, not an execution board.
- `docs/superpowers/**` and `docs/archive/**` are reference material unless the live roadmap and matching package handoff promote a concrete slice.
- Project-local and machine-local skills are optional capabilities, not project authorities.

When a domain workflow conflicts with this file on a cross-task rule, this file wins. When the disagreement is about domain behavior, acceptance, or ownership, verify the matching package and focused contract instead of expanding this file.

## 2. Start And Route

For analysis, review, or diagnosis, inspect only the evidence needed for the question. Do not load implementation workflows or skills automatically.

For non-trivial implementation work:

1. state the goal, scope, acceptance criteria, and main risks before editing;
2. read the live roadmap to confirm priority and whether the request changes status;
3. use `docs/pm/TASK_PACKAGE_INDEX.md` when ownership is unclear;
4. read the owning package `README.md` and `STATUS_AND_HANDOFF.md`;
5. read its `PRODUCT_BOUNDARY.md`, `IMPLEMENTATION_WORKSTREAMS.md`, and only the focused contracts needed for the slice;
6. load a specialist workflow only when the task belongs to that lane.

Specialist routing:

- event/runtime work: `docs/process/EVENT_WORKFLOW.md`;
- visual/IA work: `docs/process/VISUAL_WORKFLOW.md`;
- tooling, skill inventory, or cross-PC setup: `docs/process/DEVELOPMENT_TOOLING.md`;
- commands, QA, release, and deployment: `docs/process/OPERATION_GUIDE.md`.

Do not create a new persistent workflow for a one-off task. Add or revise a workflow only when a stable task family has repeated rules that are not already owned by a package or specialist lane.

## 3. Task Package Ownership

Each task package owns:

- product meaning and module boundaries;
- current status and the next safe slice;
- domain-specific workstreams and reading order;
- do-not-do rules;
- domain validation detail;
- the documents that must be synchronized when that lane changes.

For a multi-package task:

1. name one primary package;
2. identify secondary packages only where their product meaning or contracts change;
3. preserve one owner per concept;
4. update the live roadmap only when priority, status, or accepted scope changes.

Skills cannot create another roadmap, task board, package handoff, or mandatory workflow. Skill instructions about tools, subagents, commits, or validation remain subordinate to host policy and the owning workflow.

## 4. Universal Guardrails

Every work round must:

1. preserve unrelated user changes in a dirty worktree;
2. verify branch, worktree, and commit relationships before merge, rebase, or cross-worktree synchronization;
3. implement the smallest coherent slice that meets the request;
4. preserve domain ownership and persisted-data compatibility unless the slice explicitly includes migration and rollback;
5. avoid mixing product behavior, dependency migration, and broad refactoring in one change;
6. keep active status in the live roadmap and current package handoff rather than old plans or unchecked lists;
7. explain user-visible impact before low-level implementation detail;
8. treat workflow, skill, and governance audits independently from the mechanisms under review.

The user request takes priority over the roadmap for the current round. Backfill roadmap or package status only when the request changes accepted scope, priority, or completion state.

## 5. Validation Contract

Choose checks by change type and then apply any stricter package-specific requirement:

| Change type | Minimum checks |
| --- | --- |
| documentation, workflow, task package, or skill governance | `git diff --check` and `npm.cmd run governance:check` |
| behavior, shared code, schema, or persistence | `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build` |
| user-facing route flow | add targeted or full `npm.cmd run test:e2e` |
| visual surface with visual-gate coverage | add `npm.cmd run test:visual` |
| dependency or lockfile | run production and full `npm.cmd audit` separately, plus the behavior baseline |

Use the Windows command conventions and environment notes in `docs/process/DEVELOPMENT_TOOLING.md`.

Do not claim a check passed unless it was run successfully in the relevant tree. If a required check cannot run, report the gap and its impact.

## 6. Documentation And Status

After a meaningful change:

1. follow the owning package `STATUS_AND_HANDOFF.md` for domain documentation sync;
2. update secondary package handoffs only when their meaning or contracts changed;
3. update `TODO_ROADMAP.md` only when priority, status, or accepted scope changed;
4. update `TODO_PM_STATUS_REPORT.md` only for meaningful PM-facing priority, boundary, release-posture, or capability changes;
5. leave frozen reference and archive documents unchanged unless the task explicitly promotes, corrects, or archives them.

Code changes do not require broad documentation churn when product meaning, ownership, status, and public contracts are unchanged.

## 7. Completion And Handoff

A completed implementation round should leave:

1. the requested implementation or document change;
2. validation proportional to the change risk;
3. synchronized owning-package documentation where required;
4. explicit status impact, including `none` when the roadmap did not change;
5. a concise handoff that names results, validation, remaining risk, and any unpushed commit or unsynchronized worktree.

Old task conversations, cached skill instructions, and detached worktree context are not current authority. On resume, verify the current branch, worktree status, roadmap, and owning package before continuing.
