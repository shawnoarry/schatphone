# Foreground Tick Settings Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Settings foreground tick entry understandable and reviewable for users.

**Architecture:** Keep the control inside `SettingsAutomationSection.vue`, with computed labels passed from `SettingsView.vue`. Reuse existing simulation logs and router navigation; do not add new persistence or runtime behavior.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils.

---

### Task 1: Settings Panel Data

**Files:**
- Modify: `src/views/SettingsView.vue`

- [x] Add a computed latest foreground/runtime event label from `simulationStore.recentEventLogs`.
- [x] Add a coverage list for Food Delivery safety events and role proactive contact candidates.
- [x] Add an `openWorldHub` action that routes to `/control-center`.

### Task 2: Settings Panel UI

**Files:**
- Modify: `src/components/settings/SettingsAutomationSection.vue`
- Test: `tests/settings-general-section.test.js`

- [x] Add props for coverage rows and latest-result label.
- [x] Add bilingual row labels and a `查看世界中枢 / Open World Hub` button.
- [x] Test that the automation subpage shows coverage, latest result, and routes to World Hub.

### Task 3: Docs And Validation

**Files:**
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`
- Modify: `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`

- [x] Record that Settings now exposes the foreground tick meaning and World Hub review path.
- [x] Run focused settings tests.
- [x] Run `git diff --check`, `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run test`.
- [x] Commit the completed slice.
