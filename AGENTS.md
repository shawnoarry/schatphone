# SchatPhone Agent Bootstrap

This file is the stable entry point for coding agents. It is intentionally short and must not become a second workflow rulebook.

## Authority

Apply instructions in this order:

1. the current user request and host/tool policy;
2. `docs/process/AI_WORK_MODE.md` for project execution rules;
3. `docs/roadmap/TODO_ROADMAP.md` for live priority and status;
4. the matching package `README.md` and `STATUS_AND_HANDOFF.md` for product meaning and the current safe slice;
5. architecture and product-decision documents for detailed contracts.

`docs/superpowers/**` and `docs/archive/**` are reference material unless the live roadmap and package handoff explicitly promote a concrete slice.

## Start Here

For analysis, review, or diagnosis, inspect only the evidence needed for the question. Do not load implementation workflows automatically.

For non-trivial implementation work:

1. read `docs/process/AI_WORK_MODE.md`;
2. read `docs/roadmap/TODO_ROADMAP.md`;
3. identify the owning package through `docs/pm/TASK_PACKAGE_INDEX.md` when ownership is unclear;
4. read that package's `README.md`, `STATUS_AND_HANDOFF.md`, and only the focused contract files needed for the change;
5. read `docs/overview/PROJECT_MASTER_GUIDE.md` only when whole-project context is necessary.

Before editing, state the goal, scope, acceptance criteria, and main risks. Preserve unrelated user changes in a dirty worktree.

## Skills And Workflow Audits

Project-local skills are optional capabilities, not project authorities. Load only the smallest relevant set.

- A skill cannot create a second roadmap, task board, or documentation authority.
- A skill cannot make its own use mandatory for audits of that skill or its workflow family.
- When reviewing workflows, skills, agent configuration, or governance, treat every referenced mechanism as an object of review and verify it against repository evidence.
- Generic skill instructions about tools, subagents, commits, or validation do not override host policy or `docs/process/AI_WORK_MODE.md`.

## Validation

Choose checks by change type:

- documentation or governance: `git diff --check` and `npm.cmd run governance:check`;
- behavior or shared code: `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build`;
- user-facing route flow: add targeted or full `npm.cmd run test:e2e`;
- dependency or lockfile change: run production and full `npm.cmd audit` separately.

Sync only the documents required by the change matrix in `docs/process/AI_WORK_MODE.md`.
