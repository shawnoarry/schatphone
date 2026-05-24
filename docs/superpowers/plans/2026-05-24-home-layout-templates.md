# Home Layout Templates Implementation Plan

> **For agentic workers:** This plan records the completed Home template-slot implementation slice. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a neutral Home template picker with six abstract 4x6 layout frameworks for visual customization.

**Architecture:** Define layout templates as data in `src/lib/home-layout-templates.js`, persist one template id and explicit slot placements per formal Home page in the system store, and render a grayscale thumbnail picker plus edit-mode slot overlay in `HomeView.vue`. This is the first functional slice of the fixed-slot Home model; ordered page content remains as a compatibility and recovery layer.

**Tech Stack:** Vue 3, Pinia, Vitest, CSS grid.

---

### Follow-up Slice: Custom Widget Actions

**Goal:** Make custom widget appearance and click behavior separable before UI polish starts.

**Files:**
- Create: `src/lib/custom-widget-actions.js`
- Modify: `src/stores/system.js`
- Modify: `src/views/WidgetsView.vue`
- Modify: `src/views/HomeView.vue`
- Test: `tests/system-widget-import.test.js`
- Test: `tests/home-folder-entry.test.js`

- [x] Add a central whitelist for custom widget action types and targets.
- [x] Store normalized custom widget action metadata outside user-authored widget code.
- [x] Keep imported widget JSON appearance-only; unsupported action fields are ignored.
- [x] Add Widget Center controls for no action, app target, and approved system target.
- [x] Execute configured actions from Home normal mode while preserving Home return page.
- [x] Keep edit-mode taps bound to slot content replacement.

---

### Task 1: Template Data

**Files:**
- Create: `src/lib/home-layout-templates.js`
- Test: `tests/home-layout-templates.test.js`

- [x] Define six neutral templates `layout-a` through `layout-f` over a 4 column x 6 row grid.
- [x] Include only slot geometry: `1x1`, `2x1`, `2x2`, `4x2`, and `4x3`.
- [x] Add helpers for default ids, normalization, grid styles, and slot index conversion.
- [x] Test that every slot fits the 4x6 grid and every template id normalizes safely.

### Task 2: Store Persistence

**Files:**
- Modify: `src/stores/system.js`
- Test: `tests/system-widget-import.test.js`

- [x] Add `settings.appearance.homeLayoutTemplateIds`.
- [x] Normalize persisted template ids during hydration.
- [x] Add `setHomeLayoutTemplate(pageIndex, templateId)`.
- [x] Add explicit `homeLayoutSlotPlacements` and slot placement actions.
- [x] Reset template ids with Home layout reset.
- [x] Persist the selected template ids.

### Task 3: Home UI

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `tests/home-folder-entry.test.js`

- [x] Show a bottom edit-mode template strip with six abstract thumbnails.
- [x] Use neutral labels: `Layout A-F`.
- [x] Show selected template slots as edit-mode placeholders.
- [x] Keep normal mode empty slots invisible.
- [x] Save the current formal page template when a thumbnail is tapped.
- [x] Open a mixed content picker from empty and filled slots.
- [x] Replace or clear app, folder, built-in widget, and custom widget entries when they fit the selected slot.
- [x] Add a lightweight edit-mode content library for unplaced entries and compatible-slot recovery.

### Task 4: Documentation

**Files:**
- Modify: `docs/product-decisions/HOME_DESKTOP_LAYOUT_SYSTEM.md`
- Modify: `docs/design/DESIGN.md`
- Modify: `docs/pm/visual-and-ia-governance/*`

- [x] Record that templates express geometry only, not screen purpose.
- [x] Record the six-template neutral starter library.
- [x] Record that thumbnail previews are abstract grayscale placeholders.
- [x] Record Home / Widget Center / Appearance / App Library ownership boundaries.

### Task 5: Validation

**Commands:**
- `npm.cmd run lint`
- `npm.cmd test`
- `npm.cmd run build`

- [x] Run lint.
- [x] Run tests.
- [x] Run production build.
