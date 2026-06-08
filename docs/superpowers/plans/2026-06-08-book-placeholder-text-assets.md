# Book Placeholder Text Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real built-in Book text assets that act as placeholder manuscripts for testing Book and WorldBook interactions.

**Architecture:** The placeholders live in the same built-in Book asset registry as the K-pop worldview/rules sources. They are read-only, excluded from user persistence/backups, visible through `bookStore.libraryAssets`, and selectable from WorldBook's in-place Book-card picker.

**Tech Stack:** Vue 3, Pinia, Vitest, Vite raw markdown-style asset content.

---

### Task 1: Built-In Placeholder Assets

**Files:**
- Modify: `src/lib/built-in-book-assets.js`
- Test: `tests/book-store.test.js`
- Test: `tests/worldbook-book-source-picker.test.js`

- [ ] Add built-in IDs for K-pop encyclopedia, profile-template, world-pack-reference, and reference-material placeholder manuscripts.
- [ ] Create short markdown content for each placeholder with enough headings to generate sections.
- [ ] Keep placeholders read-only with `source.kind = 'built_in'`, `locked = true`, and no persistence in backup snapshots.
- [ ] Ensure the WorldBook picker can select each placeholder from real Book assets, not mock UI cards.

### Task 2: Validation

**Files:**
- Test: `tests/book-store.test.js`
- Test: `tests/worldbook-book-source-picker.test.js`

- [ ] Verify `bookStore.listAssets()` and `bookStore.worldbookSourceAssets` include all placeholder assets.
- [ ] Verify category filters can find each placeholder.
- [ ] Verify selecting encyclopedia/profile/reference placeholders defaults to the matching WorldBook role where applicable.
- [ ] Verify the in-place WorldBook picker still stays on `/worldbook`.

### Task 3: Docs And Smoke

**Files:**
- Modify: `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md`
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`

- [ ] Record that placeholder manuscripts are real built-in Book assets used to test interaction, not static UI mock cards.
- [ ] Run targeted tests, lint, build, and diff checks.
- [ ] Capture a WorldBook picker screenshot on the active, user-confirmed preview port.
