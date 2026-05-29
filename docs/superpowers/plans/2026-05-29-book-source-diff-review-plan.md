# Book Source Diff Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users review what changed in an active Book source before WorldBook accepts the newer source version.

**Architecture:** Store a small text snapshot on each WorldBook source link when the link is created or refreshed, then compare that snapshot with the current Book asset or selected sections. Keep Book as the source-text owner and WorldBook as the activation/review surface.

**Tech Stack:** Vue 3, Pinia, Vite, Vitest, Vue Test Utils, existing Book schema helpers and system store source-link state.

**Plan Status:** `COMPLETE`

**Validation:** `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd test`, `npm.cmd run test:e2e`, and `git diff --check` passed on 2026-05-29.

---

## File Map

- Modify `src/lib/book-text-schema.js`: preserve source snapshot metadata on normalized WorldBook source links and add pure diff helpers.
- Modify `src/views/WorldBookView.vue`: capture source snapshots, show a review panel for changed sources, refresh links from the review action, and clean visible source-panel copy.
- Modify `tests/book-text-schema.test.js`: cover text snapshot clamping and diff helper output.
- Modify `tests/worldbook-book-source-picker.test.js`: cover review panel behavior for changed Book sources.
- Update docs after validation:
  - `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md`
  - `docs/superpowers/plans/2026-05-29-book-text-library-worldbook-plan.md`
  - `docs/roadmap/TODO_ROADMAP.md`
  - `docs/pm/TODO_PM_STATUS_REPORT.md`
  - `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`

## Product Acceptance

- A changed Book source still warns the user in WorldBook.
- The changed row offers a visible "查看变更 / Review changes" action.
- The review panel explains, in user language, what was added, removed, and unchanged.
- The review panel supports whole-document links and selected-section links.
- Links created before snapshots existed degrade gracefully: users see that no old baseline is available and can accept the current version as the new baseline.
- Accepting the newer version refreshes the stored fingerprint, version, section list, and snapshot.
- The active Book asset status remains synchronized with WorldBook source links.
- Validation passes with lint, build, unit tests, and e2e tests.

## Tasks

- [x] Add source snapshot fields to `normalizeWorldBookSourceLink`:
  - `sourceSnapshotText`
  - `sourceSnapshotUpdatedAt`
  - `sourceSnapshotCharCount`

- [x] Add pure helpers in `src/lib/book-text-schema.js`:
  - `buildWorldBookSourceSnapshot(text, now)`
  - `diffWorldBookSourceText(previousText, nextText)`
  - paragraph-oriented diff output with `added`, `removed`, and `unchanged` entries.

- [x] Update `WorldBookView.vue` source-link creation and refresh:
  - resolve the selected source text from whole asset or selected sections;
  - store the snapshot when linking;
  - store a new snapshot when accepting/refreshing changed content.

- [x] Update `WorldBookView.vue` UI:
  - add a review panel for changed sources;
  - show counts and diff rows;
  - handle missing old snapshots with a baseline message;
  - remove duplicated/hidden source metadata text in the source row.

- [x] Add tests:
  - pure helper tests for diff and snapshot behavior;
  - UI test that edits an active source, opens the review, sees added/removed text, accepts the newer version, and verifies the changed warning clears.

- [x] Sync docs:
  - mark visual diff review as trial-ready in the Book/WorldBook docs;
  - record that World Pack V1 activation and user-approved service-account generation have now landed, while app-archetype behavior, subscription generation, and retrieval remain future work.

- [x] Run validation:
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - `npm.cmd test`
  - `npm.cmd run test:e2e`
