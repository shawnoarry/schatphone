# Work Hub Organization Status And Handoff

Updated: 2026-08-30

Status: `EVT-WORK-1 DONE 2026-08-29 / EVT-WORK-2 DONE 2026-08-29 / EVT-WORK-3 DONE 2026-08-30 / EVT-WORK-4 DONE 2026-08-30`

## Accepted Scope

- independent `store:work-hub` production owner;
- world/profile-revision-bound authority packages with explicit confirmation;
- issuer scope, revision, expiry, and revocation validation;
- fail-closed stale, duplicate, cross-world, revoked, and conflicting records;
- durable decision receipts and status reports with rollback on persistence failure;
- accept, request adjustment, and decline actions;
- accepted schedule proposals expose a structured Calendar review handoff only;
- Calendar creates truth only after explicit Save and retains source revision/return context;
- one world-neutral schedule-change event family with deterministic policy/random gating, cooldown, daily cap, deadlines, exact source lineage, and auditable no-event paths;
- native accepted, adjustment-requested, declined, expired, stale, revoked, and write-failure outcomes without inferred user decisions;
- replacement proposals leave the old Calendar commitment untouched before review, then update the same Calendar event ID after explicit Save while retaining prior source references;
- complete backup/restore and legacy-missing-section recovery;
- explicit preview mode for the old S1 fixture, never silent promotion.

## Acceptance

1. A valid signed-by-contract authority package can hydrate one active workspace without AI.
2. Invalid authority evidence cannot expose actionable production work.
3. Replaying an identical package or decision is idempotent; same-revision conflicts fail closed.
4. Calendar never receives a draft before a valid explicit Work Hub acceptance.
5. Refresh restores authority, receipts, Calendar linkage, and return context.
6. Ordinary users see organization/work language, not schema, hashes, compiler stages, or model internals.
7. Desktop and simulated Pixel 5 cover empty, active, all decisions, Calendar Save, reload, and write failure.

## Completed Foundation

- `EVT-WORK-1` adds the independent `store:work-hub` owner, world-neutral authority and record contracts, exact world/Contacts revision binding, explicit issuer scope, expiry/revocation handling, conflict and stale rejection, rollback-safe persistence, complete backup/restore, and strict isolation from the S1 preview key.
- `EVT-WORK-2` adds the production empty/active workspace, work notices, tasks, approvals, schedule proposals, status reports, explicit accept/request-adjustment/decline receipts, and the Calendar review-and-Save loop with linked state restored from Calendar truth.
- `EVT-WORK-3` adds `organization.work_schedule_change.v1`, generic built-in Event Instance V2 template resolution, exact authority/source binding, one-time Work Hub owner requests, policy-controlled randomness, deadline/cooldown/cap audit, rollback-safe owner-fact progression, and Calendar replacement lineage.
- `EVT-WORK-4` adds the production execution-proof gate after explicit Calendar Save. Exact Work Hub authority/runtime/receipt/owner-fact/time/source lineage becomes one durable proof carried through Schedule Orchestrator, Agenda Journey, explicit Map departure/arrival, and explicit Activity Session start. Changed or stale revisions fail closed instead of silently reusing an old execution. Manual and S1 preview schedules remain on the ordinary path.
- The ordinary flow requires no model call. AI remains optional wording assistance and cannot grant membership, select a decision, confirm time, or mutate another owner.

## Validation Evidence

- focused EVT-WORK-4 execution-proof/runtime/store Vitest: 10 files / 56 tests passed; focused backup workflow: 1 file / 8 tests passed;
- full Vitest: 352 files / 2725 tests passed;
- production Work Hub and schedule-change Playwright: 4/4 across desktop Chromium and simulated Pixel 5;
- full ESLint and the 725-module production build passed; governance passed 2 files / 19 tests and `git diff --check` passed. The build retains only the existing chunk-size warning, and JSDOM retains its known non-failing media/canvas notices.

## Recommended Next Slice

Stop here for Work Hub. `EVT-CHRONICLE-1` is now complete in the Map/Calendar package under its own Diary Owner and read-only projection contract; Work Hub gained no Chronicle write authority. SMS, downstream consequences, public knowledge, relationship/Wallet effects, automatic attendance/completion, closed-page autonomy, and any next event lane remain later decisions.

## Do Not Do

- Do not infer membership from Contacts prose, app names, locations, preview fixtures, or model output.
- Do not let AI grant authority, choose a user decision, or write Calendar truth.
- Do not let Work Hub write Chronicle diary records or broaden the approved schedule-change coordination into SMS, Wallet, relationship, public-opinion, Mini Scene, CG, or autonomous execution consequences.
- Do not rename the S1 preview storage key or migrate it into `store:work-hub`.
- Do not fall back to a preview fixture when an active production authority owns the same proposal ID.

## Must Sync

- this package quartet;
- `docs/pm/TASK_PACKAGE_INDEX.md`;
- `docs/roadmap/TODO_ROADMAP.md`;
- Event and Map/Calendar package handoffs only when their collaboration meaning changes;
- persistence inventory and complete-backup contracts when stored shape changes.
