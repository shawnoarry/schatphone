# Functional Code Next Steps

Updated: 2026-05-19

> **Frozen execution status / 非执行看板**
>
> This file is a reference for functional-code opportunities, not an active TODO, roadmap, or implementation source. Do not continue work from this file directly. If a next step here becomes active, first promote the concrete slice into `docs/roadmap/TODO_ROADMAP.md` and the matching task package `STATUS_AND_HANDOFF.md`.

Purpose: this document records the current functional-code opportunities after broad visual rebuild work was intentionally parked.

Use it when future engineers or AI assistants need to decide:

- what code work can safely move next;
- which slices are low-risk and high-value;
- which old directions are now historical and should not be mistaken for the live recommendation.

Authority:

- this file is a handoff reference, not the live execution board;
- active work with status still belongs in `docs/roadmap/TODO_ROADMAP.md`;
- if an item here becomes active implementation work, promote it into the live roadmap;
- use task packages and workflow docs for execution procedure.

Main references:

- `docs/roadmap/TODO_ROADMAP.md`
- `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
- `docs/overview/IMMERSIVE_EVENT_TODO.md`
- `docs/process/AI_WORK_MODE.md`
- `docs/process/EVENT_WORKFLOW.md`
- `docs/pm/TODO_PM_STATUS_REPORT.md`

## 1. Quick Verdict

The next functional-code move should still not be a giant new gameplay system.

The best next work remains:

1. ownership-safe refinement of already-landed loops;
2. maintainability cleanup around large product-critical surfaces;
3. text/event-first relationship-memory cleanup before new memory-input channels;
4. runtime explanation/review quality before stronger automation.

In other words:

> refine and clarify before expanding again.

## 2. What Is Already Landed Enough To Stop Re-Listing As TODO

These are already part of the current baseline and should not keep appearing as if they are still open first-step tasks:

- Calendar / Reminders split baseline
- relationship runtime baseline
- first safe relationship fact-adapter batch
- World Hub read-only runtime review baseline
- foreground event tick lifecycle baseline
- delivery route read-only UI handoff
- completed-order Wallet downstream suggestion loop
- many older Chat / Settings / Map display-only extraction slices

Those historical slices mattered, but they are no longer the best "what next?" answer.

## 3. Current Functional Priorities

### Priority A: Contacts V2 presentation and management layer

Why this is the best near-term functional slice:

- the underlying role ID, relationship runtime, delete/reset, and cleanup seams already exist;
- Contacts now has real destructive-action responsibility;
- the weakest part is no longer raw plumbing, but product-grade presentation and semantic clarity.

Current focus inside this lane:

1. Contacts detail IA
2. memory-group presentation
3. manual entry vs event-attached entry distinction
4. safer review of what gets removed during delete/reset/memory cleanup

### Priority B: text/event-first relationship-memory dedupe and recall

Why:

- multiple modules now feed relationship continuity;
- the next risk is duplicated or noisy memory, not lack of sources;
- Gallery/media-driven memory should stay deferred until input friction is low enough.

Current focus inside this lane:

1. one life event should not become several top-level memories;
2. source-level attachments should not multiply relationship growth;
3. recall should prefer one primary memory plus optional supporting anchors;
4. Calendar remains the safe schedule/date memory source.

### Priority C: runtime review quality before stronger control

Why:

- World Hub already exists and already reads multiple truth layers;
- stronger control without better explanation would create confusion fast.

Current focus inside this lane:

1. better filtered detail panels in World Hub;
2. clearer explanation for why foreground events triggered or skipped;
3. stronger PM/QA auditability before broader mutation controls.

## 4. Still-Good Low-Risk Engineering Moves

These are still good slices when we want progress without heavy contract churn:

1. display/interaction cleanup inside large views;
2. component extraction that does not rewrite store contracts;
3. diagnostics and explanation surfaces;
4. narrow adapter additions through existing seams;
5. documentation sync that prevents semantic drift.

Examples:

- Contacts detail sections
- World Hub review/detail panels
- Chat-side display cleanup where compatibility fields still confuse users or implementers
- Calendar relationship review surfaces

## 5. Work To Avoid Right Now

Do not prioritize these unless the user explicitly reprioritizes:

1. major Chat store redesign
2. broad visual rebuild by accident while touching functional code
3. Gallery-driven relationship-memory mainline implementation
4. broad hidden automation or destructive random runtime behavior
5. turning World Hub into the normal data-entry surface
6. reopening Files as a normal user-facing app
7. generic standalone fantasy tracks for Phone, Wallet, or Stock before the stronger loops settle

## 6. Promotion Template

If one item becomes active execution work, add a short entry to `docs/roadmap/TODO_ROADMAP.md` using this shape:

```md
EN: P1 maintainability slice: [short task name] — `IN_PROGRESS`.
中文：P1 可维护性切片：[简短任务名] — `IN_PROGRESS`。

- EN: Scope: [what changes and what explicitly does not].
  中文：范围：[改什么，不改什么]。
- EN: Acceptance: [user-visible or semantic result].
  中文：验收：[用户可见或语义结果]。
- EN: Regression checks: `npm run lint`, `npm run build`, and targeted tests.
  中文：回归检查：`npm run lint`、`npm run build` 与相关专项测试。
```

## 7. Recommended Next Human Decision

If the team wants the cleanest near-term execution choice, use this order:

1. finish Contacts V2 detail IA and memory-management presentation;
2. then tighten text/event-first memory dedupe and recall;
3. then improve World Hub review quality;
4. only after that, choose the next cross-module connector or runtime-expansion slice.

## 8. Reading Path

Before using this file to choose a slice, read:

1. `docs/roadmap/TODO_ROADMAP.md`
2. `docs/overview/PROJECT_MASTER_GUIDE.md`
3. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
4. `docs/pm/TASK_PACKAGE_INDEX.md`
5. the matching task package handoff docs

For event/runtime-related choices, also read:

1. `docs/overview/IMMERSIVE_EVENT_TODO.md`
2. `docs/process/EVENT_WORKFLOW.md`

## 9. Change Log

1. 2026-05-02 to 2026-05-17: accumulated many landed extraction slices, connector slices, and event/runtime updates.
2. 2026-05-19: condensed the long historical log into a current functional next-steps guide so future contributors can find the real next recommendation faster.
