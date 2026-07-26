# SchatPhone Worktree Integration Protocol

Updated: 2026-07-26

Purpose: define how separate SchatPhone workgroups protect, hand off, review, integrate, and synchronize Git work without requiring the user to operate Git or coordinate repositories manually.

This is a narrow cross-worktree delivery protocol. It is not a roadmap, task board, product-approval system, package workflow, or replacement for `docs/process/AI_WORK_MODE.md`.

## 1. Authority And Scope

Apply this protocol when work, commits, or uncommitted changes must move between a Codex worktree and the integration target, normally local `main`.

Authority remains:

1. the current user request and host/tool policy;
2. `docs/process/AI_WORK_MODE.md`;
3. the live roadmap and owning task package for product meaning and priority;
4. this protocol for cross-worktree protection and integration mechanics.

This protocol does not:

- approve a product decision;
- assign the next task package;
- let one workgroup change another package's meaning;
- make any skill or workflow mandatory for auditing itself;
- authorize merge, rebase, push, worktree deletion, or branch synchronization by a workgroup;
- turn readiness, validation, or user silence into approval.

The protocol itself remains reviewable. A user request can pause or revise it, and its correctness must be checked against repository evidence rather than assumed from this document.

## 2. Roles

### User

The user confirms desired behavior, visible effects, priority, and whether a product decision is acceptable. The user is not expected to choose Git operations, conflict strategies, validation commands, storage formats, or branch topology.

The user may ask the integration controller to push after local integration. No workgroup should ask the user to run Git commands.

### Workgroup

A workgroup owns only its assigned task-package slice. It may inspect, implement, validate, protect its own dirty work, and return a structured handoff.

Workgroups must not merge, rebase, push, delete worktrees, or synchronize other branches. They stop after handoff or after a protection/commit instruction from the integration controller.

### Integration Controller

The integration controller is the project-control task designated by the user. It owns:

- repository and worktree relationship checks;
- semantic and scope review;
- protection refs and backup requirements;
- exact staging and local commit coordination;
- conflict handling and integration strategy;
- independent validation;
- local `main` integration;
- post-merge omission review;
- synchronization of other safe worktrees;
- remote push only after explicit user authorization.

The integration controller cannot invent product approval or use technical correctness to overrule the user.

### Coordination Routing

A named specialist or local task conversation may implement a user- or integration-controller-approved slice directly within its frozen boundary and return `READY_FOR_INTEGRATION_REVIEW` directly to the integration controller. An intermediate workgroup-controller review is a risk-routing option, not a mandatory step for every round. Invoke it when the slice introduces new product meaning, requires cross-page or cross-package consistency, establishes a new visual rule or asset direction, expands scope, shares a worktree with concurrent activity, or cannot determine its approved boundary safely.

The integration controller still owns scope, branch and concurrency control, protection, independent validation, exact commit coordination, local `main` integration, and required worktree synchronization. Specialists and workgroups must not merge, rebase, push, or synchronize branches themselves. These routing rules do not change the user-decision gate or separate push authorization.

A pure synchronization notice does not require waking every idle or long-history workgroup conversation. The integration controller may record the new baseline, and the workgroup verifies its branch, HEAD, and status when its next real task begins. This reduces coordination traffic without weakening the Git synchronization requirements in this protocol.

Only one writing task may be active in a physical worktree at a time. A workgroup controller and its specialist conversations must not edit that worktree concurrently. Conversation names or folders are routing conveniences only: they do not create a second roadmap or task board and do not automatically synchronize repository state.

## 3. User Decision Gates

Silence is not approval.

Use `USER_DECISION_REQUIRED` when a change would introduce, remove, or materially reinterpret user-visible behavior that the current request, live roadmap, or owning package has not already confirmed.

At that gate:

1. stop implementation and dependent work;
2. preserve existing work without advancing it;
3. explain one bounded product question in plain language;
4. describe the visible effect of each meaningful choice;
5. wait for explicit user direction.

No business approval can be inferred from technical validation. Passing tests means the implementation is technically acceptable under the tested contract; it does not mean the user accepted the behavior.

The user may reject, pause, or reopen a decision at any stage before or after integration. Before integration, the workgroup or controller revises or abandons the slice. After integration, the controller creates a new corrective or revert slice with explicit impact review; it does not silently rewrite shared history.

A completed stage does not automatically authorize the next stage. Workgroups stop at their assigned boundary, and the integration controller does not begin another product slice merely because the previous one is technically ready.

## 4. Integration States

Use these labels in handoffs when they help remove ambiguity:

| State | Meaning |
| --- | --- |
| `WORKGROUP_IN_PROGRESS` | The workgroup is still changing its own slice. |
| `USER_DECISION_REQUIRED` | Product meaning is not approved; implementation and dependent work stop. |
| `READY_FOR_INTEGRATION_REVIEW` | Work is frozen and ready for controller review; nothing is merged or pushed. |
| `CHANGES_REQUESTED` | The controller found a scope, semantic, protection, or validation issue. |
| `INTEGRATED_LOCAL` | The reviewed result is in local `main`; remote is unchanged unless separately stated. |
| `PUSH_AUTHORIZED` | The user explicitly authorized the controller to update the remote. |
| `PUSHED` | The controller verified the intended remote ref was updated. |

Workgroups report their current state. Only the integration controller may mark work `INTEGRATED_LOCAL` or `PUSHED`; product decisions and push authorization still require the user where specified.

## 5. Workgroup Start Record

Before meaningful work in a separate worktree, record:

- worktree absolute path;
- branch name or detached-HEAD state;
- current HEAD;
- expected base commit;
- `git status --short` result, including untracked files;
- primary task package and any genuine secondary packages;
- approved scope and any remaining user decision;
- validation required by change type.

An older worktree missing files that were later added to `main` is normal Git state, not evidence that files were lost. Compare commits and integrate through Git; do not manually copy a newer tree over a dirty older tree.

## 6. Required Workgroup Handoff

A workgroup returning results must include:

```text
State: READY_FOR_INTEGRATION_REVIEW or USER_DECISION_REQUIRED
Task package:
Worktree path:
Branch or detached HEAD:
Base commit and current HEAD:
User-visible result:
Confirmed decisions used:
Files changed:
Validation run and results:
Uncommitted, untracked, or generated files:
Known risks or unresolved questions:
Operations not performed: merge/rebase/push/reset/clean/worktree deletion/synchronization
```

The workgroup then stops. It does not continue into a dependent slice while waiting for integration.

## 7. Protecting Dirty Work

When a handoff contains uncommitted work, the integration controller first reviews the reported scope and then instructs the source workgroup to protect it.

Protection sequence:

1. Freeze content except for explicitly requested review corrections.
2. Record the pre-commit base with a protection branch or equivalent non-destructive ref when useful.
3. Have the source workgroup create a clearly self-named backup outside the repository.
4. For tracked changes, use a full-index binary patch such as `git diff --binary --full-index --output=<outside-repo-path>`.
5. Record file size and SHA-256, and verify the patch against the current tree with `git apply --check --reverse` when applicable.
6. List untracked files separately. Because `git diff` does not include them, preserve required untracked files in a named outside-repository archive before staging.
7. Stage exactly the reviewed file list.
8. Run `git diff --cached --check` and compare `git diff --cached --name-only` with the approved list.
9. Create a local commit only after the integration controller confirms the scope and commit message.
10. Report the commit hash, backup path and hash, exact file list, validation, and clean/dirty status.

Do not use `reset`, `clean`, destructive checkout, or worktree deletion as a protection shortcut. A clean committed source branch normally needs no duplicate patch unless the controller requires one for conflict or omission review.

## 8. Controller Review

Before integration, the controller independently checks:

1. source path, branch, HEAD, base, and worktree status;
2. whether the target branch changed since the source base;
3. exact commit and file scope;
4. user-visible meaning against confirmed user decisions;
5. roadmap and task-package ownership;
6. contradictions or stale status across active documents;
7. current official evidence for external platform claims when those claims affect the decision;
8. required validation in the source tree;
9. backup and recovery evidence for dirty or conflict-prone work;
10. unrelated user changes that must remain untouched.

If a review correction is needed, return `CHANGES_REQUESTED` with the smallest exact correction. Regenerate protection evidence after the correction. Do not merge first and fix the reviewed branch later.

## 9. Integration Sequence

The integration controller performs integration in this order:

1. Confirm the integration target is the intended branch and is clean.
2. Confirm source and target ancestry with explicit commit hashes.
3. Re-run the required source checks when independent verification is warranted.
4. Prefer a fast-forward when the reviewed source is directly based on the target.
5. If the target moved, preserve the source first, then choose rebase, cherry-pick, or merge according to the smallest auditable result.
6. Use range comparison and the source backup to detect omissions after history changes.
7. If a conflict changes product meaning, enter `USER_DECISION_REQUIRED`; do not resolve it by guessing.
8. Integrate into local `main` only after review and validation pass.
9. Run post-merge validation in the integration target.
10. Ask the source workgroup to compare merged `main` with its own named backup or committed result and report omissions without editing.
11. Synchronize other active clean worktrees that should share the new base.
12. Do not automatically synchronize a dirty worktree. Record it and plan its own protected integration.
13. Report local/remote status clearly.

Remote push is a separate action. The controller pushes only after explicit user authorization and verifies the resulting remote ref. A previous push authorization does not authorize later pushes.

## 10. Failure And Change Handling

### Validation Failure

Do not integrate. Preserve the source, report the failed check and impact, and return `CHANGES_REQUESTED` or `USER_DECISION_REQUIRED` as appropriate.

### Unexpected Files Or Scope

Stop staging or integration. Identify whether the files belong to the user, another workgroup, generated output, or the current slice. Never discard them to make the tree appear clean.

### Detached Or Dirty Legacy Worktree

Do not delete or reset it. Record its base, changes, and untracked files, create outside-repository protection, then attach its reviewed result to a named branch before integration when needed.

### Parallel Workgroups

Visual, architecture, and domain work may proceed independently when they have no dependency. Their branches do not receive new `main` files automatically. The controller chooses integration order from actual dependencies, protects each branch separately, and synchronizes clean worktrees after each accepted integration.

### User Rejection After Local Integration

Stop dependent work. The controller explains the current visible effect and proposes a narrow corrective commit or revert. The user confirms the desired result; the controller handles Git. Do not hide the reversal inside unrelated work.

### Worktree Retirement

Removing a worktree is a separate cleanup action after its branch, commits, untracked files, backups, and integration status are verified. Integration success alone does not authorize deletion.

## 11. Completion Report

The controller's completion report must state:

- integrated commit and target branch;
- whether integration was fast-forward, cherry-pick, rebase, or merge;
- protection branch and backup evidence when used;
- independent and post-merge validation;
- source-workgroup omission-review result;
- synchronized and intentionally unsynchronized worktrees;
- local versus remote status;
- remaining user decision or next approved slice;
- whether any push occurred.

The user should be able to understand the outcome without reading terminal output or operating Git.

## 12. Governance

Changes to this protocol are governance changes. Review it as an object of audit, keep it independent from skills, and validate with:

```powershell
git diff --check
npm.cmd run governance:check
```

Domain-specific validation still comes from `docs/process/AI_WORK_MODE.md` and the owning task package. This protocol cannot lower those requirements.
