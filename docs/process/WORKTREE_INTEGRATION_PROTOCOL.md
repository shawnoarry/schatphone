# SchatPhone Worktree Integration Protocol

Updated: 2026-08-02

Purpose: define a risk-proportionate way for separate SchatPhone workgroups to protect, hand off, review, integrate, and synchronize Git work without requiring the user to operate Git or coordinate repositories manually.

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

The standard lane is the default. Escalate only when a named risk trigger applies; do not make low-risk, clean, committed work repeat protections designed for dirty or conflict-prone work.

## 2. Roles

### User

The user confirms desired behavior, visible effects, priority, and whether a product decision is acceptable. The user is not expected to choose Git operations, conflict strategies, validation commands, storage formats, or branch topology.

The user may ask the integration controller to push after local integration. No workgroup should ask the user to run Git commands.

### Workgroup

A workgroup owns only its assigned task-package slice. It may inspect, implement, validate, protect its own dirty work, and return a structured handoff. In the standard lane, it may stage the frozen file list and create one local commit without a second controller round trip after its required checks pass.

Workgroups must not merge, rebase, push, delete worktrees, or synchronize other branches. They stop after handoff and do not begin a dependent slice.

### Integration Controller

The integration controller is the project-control task designated by the user. It owns:

- repository and worktree relationship checks;
- risk-lane selection and cross-worktree path reservations;
- semantic and scope review;
- protection refs and backup requirements;
- standard-lane commit boundary and elevated exact-staging/commit coordination;
- conflict handling and integration strategy;
- independent validation;
- local `main` integration;
- post-merge omission review;
- synchronization of other safe worktrees;
- remote push only after explicit user authorization.

The integration controller cannot invent product approval or use technical correctness to overrule the user.

### Coordination Routing

A named specialist or local task conversation may implement a user- or integration-controller-approved slice directly within its frozen boundary and return `READY_FOR_INTEGRATION_REVIEW` directly to the integration controller. An intermediate workgroup-controller review is a risk-routing option, not a mandatory step for every round. Invoke it when the slice introduces new product meaning, requires cross-page or cross-package consistency, establishes a new visual rule or asset direction, expands scope, shares a worktree with concurrent activity, or cannot determine its approved boundary safely.

The integration controller still owns scope, branch and concurrency control, risk escalation, local `main` integration, and required worktree synchronization. Specialists and workgroups must not merge, rebase, push, or synchronize branches themselves. These routing rules do not change the user-decision gate or separate push authorization.

A pure synchronization notice does not require waking every idle or long-history workgroup conversation. The integration controller may record the new baseline, and the workgroup verifies its branch, HEAD, and status when its next real task begins. This reduces coordination traffic without weakening the Git synchronization requirements in this protocol.

Only one writing task may be active in a physical worktree at a time. A workgroup controller and its specialist conversations must not edit that worktree concurrently. The integration controller also records a cross-worktree path reservation for files or narrow ownership areas likely to overlap. Two worktrees must not edit the same active files concurrently unless the controller has deliberately serialized their integration order. Conversation names or folders are routing conveniences only: they do not create a second roadmap or task board and do not automatically synchronize repository state.

Generated candidates, model caches, virtual environments, browser profiles, and other large temporary runtimes should live in a named repository-external task-artifact directory when practical. Keeping them outside a Git worktree avoids turning routine synchronization into a large backup operation.

### Local-First Route

For one local machine with one active, approved slice, the default route is one integration-controller conversation plus one dedicated writing worktree. The integration controller may execute a standard-lane slice directly in that worktree or dispatch it once to a specialist. A standing workgroup-controller conversation is not a mandatory relay. Direct execution still keeps local `main` as the clean integration target rather than using it as the writing tree.

Standing visual, architecture, story, governance, and feature controllers are on-demand reviewers. Invoke one only when its specialist judgment is required by an elevated-lane trigger: new product meaning, cross-package architecture, a new shared visual rule or asset direction, overlapping paths, dirty protected content, uncertain scope, or a failed validation whose ownership is unclear. Do not wake a standing controller merely to repeat repository state, acknowledge a clean commit, forward another conversation's handoff, or confirm an unchanged omission result.

The local-first lifecycle is:

1. The integration controller inspects current Git and task state, selects one clean dedicated writing worktree, and records the base, scope, reservation, acceptance, and checks once.
2. One writer carries the slice to a frozen commit. Progress stays in the active execution conversation; other conversations receive a message only for a blocker, required decision, conflict, or completed handoff.
3. When the integration controller is also the writer, `READY_FOR_INTEGRATION_REVIEW` is an internal freeze point backed by the commit and validation evidence, not a message round trip to another controller.
4. The integration controller reviews the frozen commit, integrates it into local `main`, runs the target gate once, and reports the result to the user.

Current repository and task state must be read from Git, the physical worktree, and the active task status. Old conversation summaries and standing-controller memory are routing hints only and must not be polled or synchronized as a substitute for that evidence.

## 3. Risk Lanes

### Standard Lane

Use the standard lane when all of the following are true:

- the task has an approved product meaning and a frozen package/file boundary;
- the worktree is dedicated to one writer, has no unrelated tracked changes, and has no required untracked content that will remain outside the commit;
- no persistence/schema migration, dependency change, credential/security boundary, destructive operation, or remote push is involved;
- no other active worktree reserves the same files;
- the source can produce one clean commit based on the recorded base.

The standard lane is intentionally short:

1. The controller records the base, branch, package, reserved paths, acceptance, and required checks once.
2. The workgroup implements the frozen slice, stages exactly the approved files, runs `git diff --cached --check` plus the required source checks, and then creates one local commit.
3. The workgroup returns one compact `READY_FOR_INTEGRATION_REVIEW` handoff with the commit hash, exact file list, validation, and clean status.
4. The controller reviews commit meaning and scope, reruns only risk-targeted checks when needed, integrates, and runs the required target checks once.
5. Git tree/file comparison closes omission review automatically when the reviewed commit lands unchanged.

Clean committed work does not require a duplicate patch, archive, pre-commit approval round, or a separate workgroup wake-up merely to report that identical Git trees match.

In the local-first route, the same standard-lane evidence is recorded once by the integration controller. Do not manufacture a self-handoff or a second review conversation when no specialist judgment or independent writer is involved.

### Elevated Lane

Escalate from the standard lane when any of these triggers applies:

- new, removed, or materially reinterpreted user-visible behavior;
- dirty work, required untracked content, generated assets that must be preserved, or a detached/legacy worktree;
- cross-package semantics, a new shared visual rule, persistence/schema/storage migration, dependency changes, credentials, security, or release infrastructure;
- overlapping path reservations, target movement that requires history rewriting, conflicts, or uncertain ancestry;
- deletion, migration, worktree retirement, remote push, or another destructive/external action;
- validation evidence is stale, incomplete, unexpectedly different from the base, or cannot be reproduced.

The elevated lane uses the applicable protection, independent validation, omission, and user-decision steps below. Escalation should add only the controls required by the actual trigger, not every possible ceremony.

### Non-Negotiable Controls

Risk lanes never weaken these controls:

- `USER_DECISION_REQUIRED` for unapproved product meaning;
- integration, rebase, merge, synchronization, and push remain controller-owned;
- dirty or conflict-prone work is protected before history changes;
- remote push requires explicit authorization for that push;
- destructive cleanup or retirement remains separate and explicit.

## 4. User Decision Gates

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

## 5. Integration States

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

## 6. Workgroup Start Record

Before meaningful work in a separate worktree, record:

- worktree absolute path;
- branch name or detached-HEAD state;
- current HEAD;
- expected base commit;
- `git status --short` result, including untracked files;
- primary task package and any genuine secondary packages;
- standard or elevated lane, including the named escalation trigger when elevated;
- reserved files or narrow ownership area;
- approved scope and any remaining user decision;
- validation required by change type.

The integration controller may collect this record directly from the repository without asking an idle workgroup to echo it. When resuming the same frozen slice, re-check changing facts such as HEAD, status, reservations, and validation freshness; do not repeat unchanged bootstrap narration or broad document reads.

An older worktree missing files that were later added to `main` is normal Git state, not evidence that files were lost. Compare commits and integrate through Git; do not manually copy a newer tree over a dirty older tree.

## 7. Required Workgroup Handoff

A workgroup returning results must include:

```text
State: READY_FOR_INTEGRATION_REVIEW or USER_DECISION_REQUIRED
Task package:
Risk lane:
Worktree path:
Branch or detached HEAD:
Base commit and current HEAD:
Reviewed commit, or uncommitted state when elevated protection is required:
User-visible result:
Confirmed decisions used:
Files changed:
Validation run and results:
Uncommitted, untracked, or generated files:
Known risks or unresolved questions:
Operations not performed: merge/rebase/push/reset/clean/worktree deletion/synchronization
```

The workgroup then stops. It does not continue into a dependent slice while waiting for integration.

For standard-lane work, keep this handoff compact. Command transcripts, screenshots, and repeated narrative belong only when they explain a failure, an external proof, or a material risk.

When the integration controller executed the slice directly, fold this evidence into the final integration report instead of sending the template to another conversation.

## 8. Protecting Dirty Work

Use this section only when the elevated lane contains uncommitted, required untracked, generated, detached, conflict-prone, or otherwise non-reconstructable work. Clean committed standard-lane work skips it.

Protection sequence:

1. Freeze content except for explicitly requested review corrections.
2. Record the pre-commit base with a protection branch or equivalent non-destructive ref when useful.
3. Have the source workgroup create a clearly self-named backup outside the repository.
4. For tracked changes, use a full-index binary patch such as `git diff --binary --full-index --output=<outside-repo-path>`.
5. Record file size and SHA-256, and verify the patch against the current tree with `git apply --check --reverse` when applicable.
6. List untracked files separately. Because `git diff` does not include them, preserve required untracked files in a named outside-repository archive before staging.
7. Stage exactly the reviewed file list.
8. Run `git diff --cached --check` and compare `git diff --cached --name-only` with the approved list.
9. Create a local commit after the integration controller confirms the elevated protection scope and commit message.
10. Report the commit hash, backup path and hash, exact file list, validation, and clean/dirty status.

Do not use `reset`, `clean`, destructive checkout, or worktree deletion as a protection shortcut. A clean committed source branch needs no duplicate patch unless a named conflict, history rewrite, or omission risk requires one.

## 9. Controller Review

Before integration, the controller independently checks:

1. source path, branch, HEAD, base, and worktree status;
2. whether the target branch changed since the source base;
3. exact commit and file scope;
4. user-visible meaning against confirmed user decisions;
5. roadmap and task-package ownership;
6. contradictions or stale status across active documents;
7. current official evidence for external platform claims when those claims affect the decision;
8. required validation in the source tree, without automatically duplicating an already current full suite;
9. backup and recovery evidence for dirty or conflict-prone work;
10. unrelated user changes that must remain untouched.

If a review correction is needed, return `CHANGES_REQUESTED` with the smallest exact correction. Regenerate protection evidence after the correction. Do not merge first and fix the reviewed branch later.

For a standard-lane clean commit, commit ancestry, exact file scope, semantic review, current validation evidence, and a clean status are normally sufficient before integration. Independent checks should target the changed risk surface. Do not rerun the same full lint/test/build/E2E suite in both source and target without a specific reason.

For an elevated lane, apply only the additional checks implied by its trigger. A dirty asset task may need backup verification but not a full architecture audit; a dependency or persistence change may need broader checks even when its file list is small.

## 10. Integration Sequence

The integration controller performs integration in this order:

1. Confirm the integration target is the intended branch and is clean.
2. Confirm source and target ancestry with explicit commit hashes.
3. Re-run source checks only when independent verification is warranted by risk, stale evidence, or an unexpected result.
4. Prefer a fast-forward when the reviewed source is directly based on the target.
5. If the target moved, preserve the source first, then choose rebase, cherry-pick, or merge according to the smallest auditable result.
6. Use range/tree comparison and, when applicable, the source backup to detect omissions after history changes.
7. If a conflict changes product meaning, enter `USER_DECISION_REQUIRED`; do not resolve it by guessing.
8. Integrate into local `main` only after review and validation pass.
9. Run the change-type target validation once. For a batch of independent standard commits, run focused checks per commit as needed and one full target gate after the batch.
10. Close omission review with commit/tree/file comparison when the reviewed commit lands unchanged. Do not request a separate post-integration omission message. Wake the source workgroup only for a rebase, merge conflict, backup comparison, or unexplained mismatch.
11. Synchronize clean worktrees when they actually need the new base, normally at their next task start. Do not wake or move every idle worktree after each commit.
12. Do not automatically synchronize a dirty worktree. Record it and plan its own protected integration.
13. Report local/remote status clearly.

Remote push is a separate action. The controller pushes only after explicit user authorization and verifies the resulting remote ref. A previous push authorization does not authorize later pushes.

## 11. Failure And Change Handling

### Validation Failure

Do not integrate. Preserve the source, report the failed check and impact, and return `CHANGES_REQUESTED` or `USER_DECISION_REQUIRED` as appropriate.

### Known Baseline Failure

A failing check that reproduces unchanged on the recorded base is not evidence that the current slice caused a regression. Record the base commit, failing test identity, and comparison result. The slice still needs its targeted checks to pass, and a changed failure fingerprint or new affected behavior escalates to investigation. Do not repeatedly rerun and re-explain an unchanged baseline failure in every workgroup handoff.

### Unexpected Files Or Scope

Stop staging or integration. Identify whether the files belong to the user, another workgroup, generated output, or the current slice. Never discard them to make the tree appear clean.

### Detached Or Dirty Legacy Worktree

Do not delete or reset it. Record its base, changes, and untracked files, create outside-repository protection, then attach its reviewed result to a named branch before integration when needed.

### Parallel Workgroups

Visual, architecture, and domain work may proceed independently when they have no dependency and no overlapping path reservation. Their branches do not receive new `main` files automatically. The controller chooses integration order from actual dependencies, serializes overlapping paths, protects dirty branches separately, and updates a clean branch when its next task requires the new base.

### User Rejection After Local Integration

Stop dependent work. The controller explains the current visible effect and proposes a narrow corrective commit or revert. The user confirms the desired result; the controller handles Git. Do not hide the reversal inside unrelated work.

### Worktree Retirement

Removing a worktree is a separate cleanup action after its branch, commits, untracked files, backups, and integration status are verified. Integration success alone does not authorize deletion.

## 12. Completion Report

The controller's completion report must state:

- integrated commit and target branch;
- whether integration was fast-forward, cherry-pick, rebase, or merge;
- protection branch and backup evidence when required, or a concise statement that clean committed standard-lane work required none;
- independent and post-merge validation;
- automated or source-workgroup omission-review result;
- synchronized and intentionally unsynchronized worktrees;
- local versus remote status;
- remaining user decision or next approved slice;
- whether any push occurred.

The user should be able to understand the outcome without reading terminal output or operating Git.

Keep standard-lane completion reports concise. Elevated-lane reports should include the additional protection, conflict, decision, or validation evidence that justified escalation.

## 13. Governance

Changes to this protocol are governance changes. Review it as an object of audit, keep it independent from skills, and validate with:

```powershell
git diff --check
npm.cmd run governance:check
```

Domain-specific validation still comes from `docs/process/AI_WORK_MODE.md` and the owning task package. This protocol cannot lower those requirements.
