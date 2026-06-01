# Surprise Mode And Module Event Settings Implementation Plan

**Goal:** Make runtime randomness and module event permissions visible and editable from Settings.

**Architecture:** Keep the UI inside `SettingsAutomationSection.vue`. `SettingsView.vue` computes product-facing labels and writes through existing `simulationStore` actions. Do not change event engine behavior.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils.

---

### Task 1: Settings Data

**Files:**
- Modify: `src/views/SettingsView.vue`

- [ ] Import `SIMULATION_SURPRISE_MODE`.
- [ ] Add Surprise Mode option labels and current runtime summary.
- [ ] Add module-event control rows for Chat and Food Delivery.
- [ ] Add update handlers for surprise mode and module event permissions.

### Task 2: Settings UI And Tests

**Files:**
- Modify: `src/components/settings/SettingsAutomationSection.vue`
- Modify: `tests/settings-general-section.test.js`

- [ ] Add props and emits for surprise mode and module event controls.
- [ ] Render bilingual controls without changing event behavior.
- [ ] Test that changing controls updates `simulationStore` and does not run events.

### Task 3: Docs And Validation

**Files:**
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`
- Modify: `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
- Modify: `docs/roadmap/TODO_ROADMAP.md`
- Modify: `docs/architecture/SIMULATION_EVENT_ENGINE.md`

- [ ] Record the user-facing meaning of the new controls.
- [ ] Run focused Settings tests.
- [ ] Run `git diff --check`, `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run test`.
- [ ] Commit the completed slice.
