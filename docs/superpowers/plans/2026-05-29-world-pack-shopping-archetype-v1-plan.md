# World Pack Shopping Archetype V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the active World Pack launch a Shopping-backed world app context for `survival_supply_board`.

**Architecture:** Add a pure `world-pack-app-bindings` helper for launch rows and Shopping context resolution. WorldBook renders app-binding rows and routes to the target module. Shopping consumes the context through a banner and route-only filter action while keeping all commerce state in the Shopping store.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vite, Vitest, Vue Test Utils, Playwright.

**Plan Status:** `COMPLETE_VALIDATED`

---

## File Map

- Create `src/lib/world-pack-app-bindings.js`
  - Build launch rows from active World Pack app bindings.
  - Resolve the Shopping marketplace context and safe default filter.
- Create `tests/world-pack-app-bindings.test.js`
  - Covers rows, Shopping context, query mismatch behavior, and inactive binding behavior.
- Modify `src/components/worldbook/CurrentWorldPackPanel.vue`
  - Render active app-binding rows with open actions.
- Modify `src/views/WorldBookView.vue`
  - Pass app-binding rows and open selected binding through the router.
- Modify `src/views/ShoppingView.vue`
  - Show world app context banner and apply the recommended filter through routing.
- Update tests:
  - `tests/worldbook-functional-ia.test.js`
  - `tests/shopping-view.test.js`
  - `e2e/worldbook-acceptance.spec.js`

## Tasks

- [x] Add the pure app-binding helper and tests.
- [x] Render active World Pack app bindings in the Current World Pack panel.
- [x] Add WorldBook routing from an app-binding row to Shopping.
- [x] Add Shopping world-context banner and filter action.
- [x] Add component and e2e coverage.
- [x] Run focused tests, lint, build, full tests, e2e, `git diff --check`, and desktop/mobile visual checks.
- [x] Sync roadmap, PM, architecture, commerce, visual IA, and master docs.

Validation results:

- `npm.cmd run lint` passed.
- `npm.cmd run build` passed with the existing `src/lib/push.js` dynamic/static import warning.
- `npm.cmd test` passed: 105 files, 585 tests.
- `npm.cmd run test:e2e` passed: 4 tests.
- `git diff --check` passed.
- Visual artifacts:
  - `artifacts/world-pack-shopping-archetype-worldbook-desktop.png`
  - `artifacts/world-pack-shopping-archetype-shopping-desktop.png`
  - `artifacts/world-pack-shopping-archetype-shopping-mobile.png`

## Review Format

After this block, report in product language:

- what the user can now try;
- how the end-to-end chain works;
- which records are untouched;
- which archetypes remain metadata-only;
- validation results and screenshots.
