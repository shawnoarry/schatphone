# Superpowers Working Artifacts

Updated: 2026-06-12

This folder stores agent-assisted working artifacts: specs, implementation plans, handoff notes, and content drafts.

It is not a live execution board.

## Authority

Use these current project authorities before acting on anything in this folder:

1. `docs/process/AI_WORK_MODE.md`
2. `docs/roadmap/TODO_ROADMAP.md`
3. the matching package `STATUS_AND_HANDOFF.md`
4. `docs/pm/TASK_PACKAGE_INDEX.md`

If a file in this folder conflicts with those authorities, the current authorities win.

## Folder Roles

| Folder | Role | Rule |
| --- | --- | --- |
| `specs/` | design snapshots and decision drafts | Historical or reference material unless promoted by the roadmap/package handoff. |
| `plans/` | implementation plans, handoffs, task checklists | Do not execute unchecked boxes directly. First confirm the live roadmap/package handoff still promotes that exact slice. |
| `content/` | world/content drafts | Draft material only unless the product code or current WorldBook/Book docs link it as active built-in content. |

## Promotion Rule

To turn material here into active work:

1. copy the concrete slice into `docs/roadmap/TODO_ROADMAP.md`;
2. update the matching package `STATUS_AND_HANDOFF.md`;
3. resolve current code/docs state before reusing old checklist steps;
4. run validation from the current operation/tooling docs, not from stale plan commands.

## Reading Rule

Read these files for context, rationale, and historical implementation detail. Do not treat status labels like `APPROVED_FOR_IMPLEMENTATION`, `PLAN_READY`, `NEXT`, `HANDOFF`, or unchecked task boxes as current truth unless a live authority explicitly points to them.
