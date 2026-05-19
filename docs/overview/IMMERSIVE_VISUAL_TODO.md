# Immersive Visual TODO

Updated: 2026-05-19

> **Frozen reference / 冻结参考**
>
> This file is not an active TODO, roadmap, or implementation source. Do not start work from this file directly. If an idea here becomes active, first promote the concrete slice into `docs/roadmap/TODO_ROADMAP.md` and the matching task package `STATUS_AND_HANDOFF.md`.

Purpose: this is the current visual-lane handoff board.

It tracks the short-to-mid-term visual direction that grew out of:

- native-system vs installed-app surface ownership;
- system-controlled Home folder behavior;
- Shopping platform-app framing;
- Food Delivery functional baseline review;
- broader shell and utility-surface cleanup.

Authority:

- use visible user entry ownership to decide visual ownership;
- do not judge only by code/module ownership;
- process rules live in `docs/process/VISUAL_WORKFLOW.md`;
- active execution status still belongs in `docs/roadmap/TODO_ROADMAP.md`;
- visual work must not silently reopen product-boundary decisions already frozen elsewhere.

## 1. Current Visual Thesis

SchatPhone should feel like one believable device, not a collection of unrelated web pages.

That means:

- system surfaces should feel system-owned;
- installed-app surfaces should keep app identity;
- shared data does not automatically make a surface system-owned;
- visible copy must read like product copy, not handoff or implementation notes.

## 2. Current Baseline That Is Already Decided

These rules are the current baseline and should not be casually re-debated:

1. Home folder shell belongs to the native system layer.
2. Entries inside a Home folder may be installed-app identities.
3. Shopping folder children are now platform-like app entries, not category tiles.
4. Widget Center is a library/import/create surface; Home widget edit mode owns placement and same-size replacement.
5. Return controls should preserve visible entry source and name the real target context.
6. Visible copy must not expose developer notes, source keys, route/store names, or handoff wording unless the page is explicitly a developer/admin tool.

## 3. Current Priority Visual Work

### P0: keep visual ownership docs and product meaning aligned

1. keep `VISUAL_ENTRY_OWNERSHIP_MAP.md` aligned with:
   - native-system folder shell
   - Shopping platform-app framing
   - current World Hub / optional-control product meaning
2. keep visual workflow guidance aligned with actual installed skills and workflow lanes.

### P1: system shell and platform identity cleanup

1. improve the system-controlled Home folder visual:
   - tile preview density
   - overlay material and blur
   - label fit
   - day/night contrast
2. shape Shopping platform shells so each selected platform feels like an installed shopping app rather than one generic backend page.
3. continue day/night coverage audit across:
   - Settings
   - Network
   - utility apps
   - Shopping / Food Delivery / Assets
   - Chat and Map app-local overlays

### P2: secondary app-surface cleanup

1. Food Delivery visual direction
2. Assets visual direction
3. lightweight utility-app shell polish
4. Chat / Map local panel cleanup

## 4. Current Product-Boundary Guardrails

Visual work must not:

- turn operational screens into decorative landing pages;
- make an in-app surface look like a system page just because it reads system/shared data;
- reopen role/relationship/runtime ownership decisions while doing surface cleanup;
- accidentally restart the broad visual rebuild while touching one module;
- reintroduce old "Shopping as category folder only" framing after the platform-app shift.

## 5. Deferred On Purpose

Do not start these until the visual architecture above is stable:

- full editable desktop-like folder system;
- arbitrary app drag/drop across user folders;
- WorldBook-bound theme packs;
- fully separate Shopping platform routes for every platform;
- deep Food Delivery exception/state simulation as a visual-project goal;
- automatic Wallet writeback as part of visual work;
- deep Map courier-trip simulation as part of visual work.

## 6. Recommended Next Visual Slice

Recommended next:

1. continue the system-controlled Home folder visual pass;
2. then deepen Shopping platform app-shell identity;
3. only after that, return to Food Delivery app-surface polish unless product reprioritizes sooner.

Practical same-size slices:

- fix remaining Home folder material/tint/radius/dark-mode inconsistencies;
- give Shopping platforms stronger yet disciplined visual differentiation;
- audit utility surfaces for raw white/gray leftovers in dark mode.

## 7. Skill And Workflow Reminder

For visual work, read:

1. `docs/process/VISUAL_WORKFLOW.md`
2. `docs/process/AI_WORK_MODE.md`
3. `docs/process/DEVELOPMENT_TOOLING.md`

Current visual-lane skills already documented there include:

- `frontend-design`
- `frontend-logic-design`
- `impeccable`
- `web-design-guidelines`

Machine-local visual support skills may also exist, but repo-local workflow should not assume them unless the workflow doc says so.

## 8. Reading Path

Use this file as the short visual handoff entry, then read:

1. `docs/process/VISUAL_WORKFLOW.md`
2. `docs/design/VISUAL_ENTRY_OWNERSHIP_MAP.md`
3. `docs/design/DESIGN.md`
4. `docs/pm/visual-and-ia-governance/README.md`
5. `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
6. `docs/roadmap/TODO_ROADMAP.md`

## 9. Change Log

1. 2026-05-16: visual-specialist board was created around shell/app ownership split and Shopping/Food Delivery follow-up work.
2. 2026-05-19: historical mixed-encoding and long log-style notes were condensed into a cleaner current-state visual handoff document.
