# World Pack Integrated V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a usable WorldBook/World Pack V1 flow where users can review and activate a world pack and Chat/runtime can read that active world state.

**Architecture:** Add pure world-pack schema helpers, persist packs in `systemStore.user`, expose activation review and activation actions through the system store, then render pack selection/review in `CurrentWorldPackPanel`. `world-interface` remains the single consumer seam and reads the active pack from the system store.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vite, Vitest, Vue Test Utils, Playwright.

**Plan Status:** `FIRST_BLOCK_COMPLETE_VALIDATED`

---

## File Map

- Create `src/lib/world-pack-schema.js`
  - Normalizes world packs, app bindings, service-account templates, and activation review snapshots.
  - Defines built-in packs for V1.
- Modify `src/stores/system.js`
  - Adds `worldPacks`, `activeWorldPackId`, and `worldPackActivation` to user world state.
  - Adds list/get/review/activate methods.
- Modify `src/lib/world-interface.js`
  - Reads the active world pack from `systemStore`.
  - Adds pack binding/template counts to world overview and consumer context.
- Modify `src/components/worldbook/CurrentWorldPackPanel.vue`
  - Shows pack selection, activation review, blockers, and confirm activation.
- Modify `src/views/WorldBookView.vue`
  - Owns selected pack UI state and calls system-store activation actions.
- Add or update tests:
  - `tests/world-pack-schema.test.js`
  - `tests/system-world-pack.test.js`
  - `tests/world-interface.test.js`
  - `tests/worldbook-functional-ia.test.js`
  - `e2e/worldbook-acceptance.spec.js` if needed for visual/flow coverage.

## Task 1: World Pack Schema

- [x] Add `src/lib/world-pack-schema.js` with:
  - `DEFAULT_WORLD_PACK_ID`
  - `BUILT_IN_WORLD_PACKS`
  - `normalizeWorldPack`
  - `normalizeWorldPacks`
  - `normalizeWorldAppBinding`
  - `normalizeWorldServiceAccountTemplate`
  - `buildWorldPackActivationReview`

- [x] Add `tests/world-pack-schema.test.js` covering:
  - built-in pack normalization;
  - app binding normalization;
  - service template normalization;
  - activation review summary;
  - missing-reference blockers.

## Task 2: System Store Persistence And Actions

- [x] Import schema helpers in `src/stores/system.js`.
- [x] Extend `normalizeUserWorldKernel()` to include:
  - `worldPacks`
  - `activeWorldPackId`
  - `worldPackActivation`
- [x] Add default user state fields.
- [x] Add actions:
  - `listWorldPacks()`
  - `getWorldPackById(packId)`
  - `getActiveWorldPack()`
  - `buildWorldPackActivationReview(packId)`
  - `activateWorldPack(packId)`
  - `upsertWorldPack(packInput)`
- [x] Add `tests/system-world-pack.test.js`.

## Task 3: World Interface Integration

- [x] Update `resolveWorldContextForConsumer()` and `resolveActiveWorldOverview()` to use `systemStore.getActiveWorldPack()` when available.
- [x] Add overview fields:
  - `worldPackAppBindingCount`
  - `worldPackServiceTemplateCount`
  - `worldPackActivationState`
- [x] Update `tests/world-interface.test.js`.

## Task 4: WorldBook UI

- [x] Update `CurrentWorldPackPanel.vue` to render:
  - active pack;
  - candidate pack selector;
  - effect review rows;
  - blockers;
  - activation action.
- [x] Update `WorldBookView.vue` to keep selected pack id and call activation.
- [x] Add/extend component tests.

## Task 5: Validation And Review

- [x] Run focused tests:
  - `npm.cmd test -- tests/world-pack-schema.test.js tests/system-world-pack.test.js tests/world-interface.test.js tests/worldbook-functional-ia.test.js`
- [x] Run Book/WorldBook source-link regression tests:
  - `npm.cmd test -- tests/book-worldbook-linking.test.js tests/worldbook-book-source-picker.test.js`
- [x] Run full validation:
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - `npm.cmd test`
  - `npm.cmd run test:e2e`
  - `git diff --check`
- [x] Use Playwright/local screenshots at desktop and mobile sizes before finalizing the UI.
- [x] Update roadmap and PM docs after validation.

Validation results:

- Focused World Pack/World Interface/WorldBook tests passed.
- Book source-link regression tests passed.
- Full lint, build, unit test, e2e, and whitespace validation passed.
- Desktop and mobile visual checks passed with no horizontal overflow in the World Pack activation panel.

## First-Block Review Format

After Task 1-4 pass focused tests, report:

- What user problem this block solves.
- What the user can do now.
- How this connects to Book source activation and future service templates.
- Which product boundaries stayed intact.
- Validation results.
