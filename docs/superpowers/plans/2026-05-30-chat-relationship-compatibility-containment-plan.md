# Chat Relationship Compatibility Containment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep legacy Chat-side `relationshipLevel` and `relationshipNote` available for compatibility while making them impossible to mistake for current relationship truth.

**Architecture:** Do not migrate or delete fields. Contain the change at the Chat Directory presentation/editing layer, reinforce the role-binding contract wording, and add a UI boundary regression test.

**Tech Stack:** Vue 3, Pinia, Vitest, Vue Test Utils.

---

### Task 1: Chat Directory Copy And Regression

**Files:**
- Modify: `src/views/ChatDirectoryView.vue`
- Modify: `tests/contacts-chat-directory-boundary-copy.test.js`
- Modify: `docs/architecture/ROLE_BINDING_CONTRACT.md`
- Modify: `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/chat-and-chat-directory/PRODUCT_BOUNDARY.md`
- Modify: `docs/pm/chat-and-chat-directory/IMPLEMENTATION_WORKSTREAMS.md`
- Modify: `docs/pm/contacts-relationship-system-v2/README.md`
- Modify: `docs/overview/PROJECT_MASTER_GUIDE.md`
- Modify: `docs/roadmap/TODO_ROADMAP.md`
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`

- [x] Rename visible `Affinity` copy in Chat Directory to `Chat tuning`.
- [x] Add modal helper text that says the field is Chat-local and not current relationship truth.
- [x] Add a UI test proving Chat Directory labels legacy fields as local annotations.
- [x] Sync package and overview docs.
- [x] Run targeted tests, then `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build`.
