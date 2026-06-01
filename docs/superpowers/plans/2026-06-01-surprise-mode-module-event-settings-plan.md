# Surprise Mode And Module Event Settings Implementation Plan

**Goal:** Make runtime randomness and module event permissions visible and editable from Settings.

**Architecture:** Keep the UI inside `SettingsAutomationSection.vue`. `SettingsView.vue` computes product-facing labels and writes through existing `simulationStore` actions. Do not change event engine behavior.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils.

---

### Task 1: Settings Data

**Files:**
- Modify: `src/views/SettingsView.vue`

- [x] Import `SIMULATION_SURPRISE_MODE`.
- [x] Add Surprise Mode option labels and current runtime summary.
- [x] Add module-event control rows for Chat and Food Delivery.
- [x] Add update handlers for surprise mode and module event permissions.

### Task 2: Settings UI And Tests

**Files:**
- Modify: `src/components/settings/SettingsAutomationSection.vue`
- Modify: `tests/settings-general-section.test.js`

- [x] Add props and emits for surprise mode and module event controls.
- [x] Render bilingual controls without changing event behavior.
- [x] Test that changing controls updates `simulationStore` and does not run events.

### Task 3: Docs And Validation

**Files:**
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`
- Modify: `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
- Modify: `docs/roadmap/TODO_ROADMAP.md`
- Modify: `docs/architecture/SIMULATION_EVENT_ENGINE.md`

- [x] Record the user-facing meaning of the new controls.
- [x] Run focused Settings tests.
- [x] Run focused Settings tests, `git diff --check`, `npm.cmd run lint`, and `npm.cmd run build`.
- [ ] Re-run full `npm.cmd run test` to green. Attempted once after this slice, but current repo now has unrelated App Store identity TDD failures from `tests/app-store-ui.test.js`.
- [x] Commit the completed slice.
