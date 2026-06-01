# Chat Social World Hub Explanation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make World Hub explain generated Chat social proposals in user-readable language.

**Architecture:** Keep the implementation inside the existing Control Center / World Hub presentation layer. Reuse proposal metadata already stored by `simulationStore`; do not add new proposal states or new runtime behavior.

**Tech Stack:** Vue 3, Pinia, Vitest, Vue Test Utils.

---

### Task 1: Explain Proposal Source And Policy

**Files:**
- Modify: `src/views/ControlCenterView.vue`
- Test: `tests/control-center-view.test.js`

- [ ] Add source-label, review-explanation, policy-summary, and safety-note helpers for Chat social proposals.
- [ ] Show those fields in the Chat social-event row and selected detail card.
- [ ] Add a runtime greeting test that expects `Foreground event tick`, conservative greeting copy, and policy snapshot text.
- [ ] Expand the existing high-risk AI proposal test to expect `Chat AI response` and review-first safety copy.

### Task 2: Sync Handoff Docs

**Files:**
- Modify: `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`
- Modify: `docs/roadmap/TODO_ROADMAP.md`

- [ ] Record that World Hub now explains generated Chat proposal sources and review boundaries.
- [ ] Keep future work focused on richer scheduling and high-risk behavior only after explanation surfaces remain clear.

### Task 3: Validate And Commit

- [ ] Run `git diff --check`.
- [ ] Run focused tests for Control Center and Chat social runtime source.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Run `npm.cmd run test`.
- [ ] Commit the completed slice.
