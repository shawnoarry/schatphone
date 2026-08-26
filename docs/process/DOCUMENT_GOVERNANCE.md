# SchatPhone Document Governance

Updated: 2026-08-26

Purpose: keep project documents aligned without letting a whole-project summary erase the detailed progress of a package, feature, or work item.

## 1. Simple Rule

Use one sentence to decide where information belongs:

- `TODO_ROADMAP.md` says what is authorized and what comes first.
- A package `STATUS_AND_HANDOFF.md` says exactly how far that domain has progressed.
- Contracts say what behavior and ownership must remain true.
- Archive files preserve old snapshots and superseded reasoning.

A larger document may summarize a smaller document, but it must not replace, shorten, or rewrite the smaller document's completion evidence.

## 2. Current Means Integrated

Project documents distinguish three states:

1. `INTEGRATED`: present in the named main-branch baseline commit and eligible for current project claims.
2. `WORKING`: present only in a dirty worktree or unintegrated worktree; record it only in the owning handoff and do not claim it as released or complete.
3. `PROPOSED`: analysis, design, plan, external assessment, or candidate work; it has no implementation authority until promoted into the live roadmap.

Every whole-project status refresh names its integrated baseline commit. Uncommitted work is preserved but excluded from the integrated summary.

## 3. Document Roles

| Role | Files | Owns | Must not do |
| --- | --- | --- | --- |
| Live execution | `docs/roadmap/TODO_ROADMAP.md` | priority, authorization, dependency order, active status | duplicate package evidence or turn every candidate into backlog |
| Package status | package `STATUS_AND_HANDOFF.md` | scoped milestone status, completed work, next safe slice, risks, validation | create a second priority queue |
| Package meaning | package `README.md`, `PRODUCT_BOUNDARY.md`, `IMPLEMENTATION_WORKSTREAMS.md` | ownership, domain meaning, stable work families | report fast-changing whole-project status |
| Whole-project rollup | root `README.md`, `PROJECT_MASTER_GUIDE.md`, `TODO_PM_STATUS_REPORT.md` | current integrated stage and links to owners | overwrite detailed package milestones or invent new priorities |
| Contract/decision | `docs/architecture/**`, `docs/product-decisions/**`, `docs/design/**` | accepted behavior, schema, ownership, visual rules | act as a live task board unless explicitly promoted |
| Snapshot/evidence | maturity, debt, QA, deployment, audit files | measured evidence at a named date/commit | silently present old measurements as current |
| Proposal/reference | planning and external-assessment files | ideas and review input | use P0/P1/DONE as project authority |
| Archive | `docs/archive/**` | historical truth and superseded material | drive implementation directly |

## 4. Preserve Small Progress

The following rules prevent large progress summaries from covering individual work:

1. A parent status is always scoped. Write `Career S1 DONE`, not `Career DONE`.
2. A package may remain `PARTIAL_DONE` while named child milestones are individually `DONE`.
3. Completed child records keep their task ID, scope, date, commit, validation, and remaining exclusions.
4. A new global summary links to the package record instead of copying and shortening its completion history.
5. If a handoff becomes too large, move old completion evidence into a package history file or dated archive snapshot, then link it. Never delete it merely to make the current summary shorter.
6. Superseded behavior is recorded as `WITHDRAWN`, `REPLACED_BY`, or `SUPERSEDED_BY`; it is not rewritten as though it never existed.

## 5. Update Rules

After a change, update only the owners affected:

| Change | Required status documents |
| --- | --- |
| local implementation with no priority change | owning package handoff |
| roadmap status, priority, dependency, or accepted scope change | roadmap plus owning package handoff |
| product ownership or behavior contract change | owning package boundary/contract plus handoff; roadmap only if execution changed |
| PM-visible capability or release-posture change | PM status rollup plus owning package handoff |
| whole-project stage change | root README, master guide, PM status, and strategy plan |
| measurements only | maturity/debt/evidence snapshot with date and baseline commit |
| proposal rejected or superseded | explicit archive notice and replacement authority |

Do not update every overview after every small code edit. Update the package first; refresh whole-project rollups when the project stage, public capability, release posture, or cross-package priority actually changes.

## 6. Alignment Header

Current whole-project rollups use:

```text
Updated: YYYY-MM-DD
Integrated baseline: <commit>
Working tree: excluded from integrated claims unless explicitly described
Execution authority: docs/roadmap/TODO_ROADMAP.md
```

Measured snapshots additionally name their measurement baseline. Historical validation counts remain valid for that named run, but are not silently described as the latest run.

## 7. Conflict Resolution

When files disagree:

1. use the live roadmap for authorization and order;
2. use the owning package handoff for detailed progress;
3. use the relevant contract for behavior and ownership;
4. treat older rollups, plans, and snapshots as stale until reconciled;
5. preserve the losing document as history when it contains useful evidence, then mark it non-current.

Do not resolve a conflict by deleting detailed child progress or by copying the same status into more files.

## 8. Review Cadence

- Every implementation round: update the owning package only when its status or handoff changed.
- Every meaningful cross-package integration: check roadmap, PM status, and master-guide alignment.
- Before a release claim: verify the integrated baseline, CI/deployment evidence, PWA/device proof, and all package links.
- During a document-governance round: archive superseded rollups, refresh current rollups, and run `npm.cmd run governance:check` plus `git diff --check`.

## 9. External Assessments

External model assessments remain proposals. Review them against code and current authorities, promote useful statements item by item, and archive the original with an explicit disposition. They cannot create another priority board or mandatory gate.
