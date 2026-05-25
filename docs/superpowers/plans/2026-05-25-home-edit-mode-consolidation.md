# Home Edit Mode Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate Home editing into fixed template slots with same-size replacement, non-obstructive template selection, and a consistent Widgets entry long-press path.

**Architecture:** Keep the existing Home template-slot data model and remove the old free-move interaction from the visible edit loop. `HomeView.vue` owns slot editing and Dock long-press behavior; `WidgetsView.vue` stays the library/import/create surface. Regression tests lock same-size placement, default editor visibility, and Dock Widgets long-press entry.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, CSS grid.

---

### Task 1: Home Slot Rules

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `tests/home-folder-entry.test.js`

- [x] Keep edit mode centered on template-slot replacement, not free dragging.
- [x] Ensure app and folder entries are only offered for `1x1` slots.
- [x] Ensure larger widget slots only show exact-size widget/custom-widget candidates.

### Task 2: Template Picker Visibility

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `tests/home-folder-entry.test.js`

- [x] Hide the template picker by default after entering edit mode.
- [x] Add a compact template toggle that opens the picker only when needed.
- [x] Close the template picker after a template is selected.

### Task 3: Widget Entry Long Press

**Files:**
- Modify: `src/views/HomeView.vue`
- Test: `tests/home-folder-entry.test.js`

- [x] Attach the existing Widgets long-press scheduler to the Dock Widgets button.
- [x] Keep short press opening Widget Center.
- [x] Prevent the short press route from firing after a successful long press.

### Task 4: Widget Library Consistency

**Files:**
- Modify: `src/views/HomeView.vue`
- Modify: `src/views/WidgetsView.vue`
- Test: `tests/widgets-view-custom-template.test.js`

- [x] Align built-in widget labels, sizes, and preview names between Widget Center and Home.
- [x] Keep Widget Center previews as library thumbnails, while Home renders the actual placed widget.

### Task 5: Validation

**Commands:**
- `npm.cmd test -- tests/home-folder-entry.test.js tests/widgets-view-custom-template.test.js tests/system-widget-import.test.js`
- `npm.cmd run lint`
- `npm.cmd run build`

- [x] Run focused tests.
- [x] Run lint.
- [x] Run production build.
