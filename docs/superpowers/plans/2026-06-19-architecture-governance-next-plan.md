# Architecture Governance Next Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-baseline the remaining architecture-governance work after the 2026-06-19 Settings backup-workflow, storage-diagnostics workflow, push-workflow, Chat active-thread read-model, Chat service-thread display read-model, Chat message edit display-state, and Chat message action-sheet display-state splits, then continue the `4.5 Architecture Cleanup` lane in safe, marked slices.

**Architecture:** `docs/roadmap/TODO_ROADMAP.md` remains the roadmap authority, and `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md` remains the active handoff. This file is a reference and execution plan, not a second task board. Before implementing any slice, promote that concrete slice into both authority files as `IN_PROGRESS`.

**Tech Stack:** Vue 3 single-file components, Pinia setup stores, Vite, Vitest, Playwright.

---

## Current Evidence Snapshot

Measured on 2026-06-19 after `useSettingsBackupWorkflow.js`, `useSettingsStorageDiagnosticsWorkflow.js`, `useSettingsPushWorkflow.js`, `useChatActiveThreadModel.js`, `useChatServiceThreadDisplayModel.js`, `useChatMessageEditDisplayModel.js`, and `useChatMessageActionSheetModel.js` landed.

Top view hot spots:

| File | Lines | Governance reading |
| --- | ---: | --- |
| `src/views/ChatView.vue` | 6597 | Highest-risk view. Active-thread, service-thread display, message-edit display-state, and message action-sheet display-state seams are extracted; continue only by different tested behavior seams. |
| `src/views/ContactsView.vue` | 5863 | Role/profile/relationship/danger flows are still concentrated. |
| `src/views/WorldBookView.vue` | 5036 | World activation, source links, templates, and review UI remain dense. |
| `src/views/HomeView.vue` | 4355 | Home layout/editing/library UI is large and visually sensitive. |
| `src/views/ChatDirectoryView.vue` | 4122 | Service/contact directory logic is still broad. |
| `src/views/WidgetsView.vue` | 4050 | Widget authoring and preview logic are still broad. |
| `src/views/AppStoreView.vue` | 3635 | App discovery, install, world-app entry, and Home wiring are concentrated. |
| `src/views/FoodDeliveryView.vue` | 3260 | Commerce UI and service-notification integration remain large. |
| `src/views/SettingsView.vue` | 1295 | Improved; no longer top-tier after backup, storage-diagnostics, and push workflow extraction. |

Top store hot spots:

| File | Lines | Governance reading |
| --- | ---: | --- |
| `src/stores/system.js` | 4581 | Still the broadest store and still imported by many views. |
| `src/stores/chat.js` | 3411 | Chat domain remains broad, but currently better isolated than `ChatView.vue`. |
| `src/stores/map.js` | 2332 | Route/trip/push behavior is still substantial. |
| `src/stores/gallery.js` | 1471 | Imports `map` and `system`; later adapter candidate. |
| `src/stores/relationshipRuntime.js` | 1397 | Important domain core; avoid broad rewrites. |
| `src/stores/foodDelivery.js` | 1328 | Imports Chat for service notifications. |
| `src/stores/calendar.js` | 1116 | Imports Reminders, Chat, RelationshipRuntime, and System. First adapter target. |

Other current signals:

- `src/composables/useSystemNotifications.js`, `src/composables/useSystemApiReports.js`, `src/composables/useSettingsBackupWorkflow.js`, `src/composables/useSettingsStorageDiagnosticsWorkflow.js`, `src/composables/useSettingsPushWorkflow.js`, `src/composables/useChatActiveThreadModel.js`, `src/composables/useChatServiceThreadDisplayModel.js`, `src/composables/useChatMessageEditDisplayModel.js`, and `src/composables/useChatMessageActionSheetModel.js` are the current successful governance pattern.
- `useSystemStore` is still imported by 22 view files.
- Direct store-to-store references remain in Calendar, Reminders, Shopping, Food Delivery, Gallery, Phone, Map, and Stock.
- No `src/**/*.ts` or `src/**/*.tsx` files were found. Type adoption should stay incremental and contract-first.
- The worktree currently contains unrelated draft content/spec changes under `docs/superpowers/content/**` and `docs/superpowers/specs/**`; do not include those in architecture-governance commits unless the user explicitly asks.

## Remaining Governance Problems

1. Large view concentration remains the biggest day-to-day maintainability risk.
2. `systemStore` still acts as a broad settings, appearance, Home layout, notification, API, push, backup-reminder, and persistence owner.
3. Store-to-store coupling still lets domain stores reach across ownership boundaries.
4. Typed contracts are still absent in source code, so payload boundaries are protected mostly by tests and convention.
5. Historical documentation and encoding debt still exists; active docs should be cleaned only in targeted passes, while `docs/superpowers/**` drafts should remain reference artifacts unless promoted.
6. Compatibility paths and legacy aliases still need periodic audit, but they should not be removed without migration and regression coverage.

## Planning Rules For Every Slice

- [ ] Pick exactly one slice and mark it `IN_PROGRESS` in `docs/roadmap/TODO_ROADMAP.md`.
- [ ] Add the same active-slice marker to `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`.
- [ ] Preserve persisted storage shape unless the slice is explicitly a storage migration.
- [ ] Preserve visible behavior unless the slice is explicitly a UX/IA slice.
- [ ] Add or update focused tests before marking the slice `DONE`.
- [ ] Run `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run test` before closing a meaningful implementation round.
- [ ] Mark the slice `DONE` in the roadmap and handoff after validation passes.

## File Placement Rules For Decomposition

Use these rules before creating or moving files. The goal is to make folder placement express ownership, not just reduce line count.

Default placement:

- Route-level screens stay in `src/views/`.
- Presentational UI parts stay in `src/components/<domain>/` when a domain folder already exists, such as `src/components/settings/`.
- View orchestration composables stay in `src/composables/` while there is only one narrow workflow for a domain.
- When a domain gains multiple workflow composables, prefer a small directory-hygiene slice that moves them together into `src/composables/<domain>/`.
- Pinia domain stores stay in `src/stores/` unless a separate architecture decision approves a store directory split.
- Cross-module contracts, payload normalizers, and reusable seams stay in `src/lib/`.
- Tests follow the current flat `tests/*.test.js` convention unless the suite already has a more specific local pattern.

Current Settings direction:

- `src/components/settings/*` is already the correct home for Settings UI sections.
- If the next Settings workflow composable is added, choose one of two explicit paths before coding:
  - conservative path: keep `src/composables/useSettingsStorageDiagnosticsWorkflow.js` beside the existing backup workflow to avoid path churn;
  - directory-hygiene path: move `src/composables/useSettingsBackupWorkflow.js` and new Settings workflows into `src/composables/settings/` in the same marked slice.
- Do not mix a behavior extraction with broad folder reclassification unless the path move is named in the slice scope and covered by imports/tests.

Documentation sync for path changes:

- If a slice only adds a file under an existing convention, update only the active roadmap/handoff notes for that slice.
- If a slice introduces a new folder convention, update this plan, `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`, and the matching package README or handoff.
- If a slice changes top-level `src/` structure or the meaning of `views`, `components`, `composables`, `stores`, or `lib`, update `docs/architecture/ARCHITECTURE.md` and `README.md`.
- If a slice changes documentation authority or where plans/status files live, update `docs/process/AI_WORK_MODE.md` and `docs/README.md`.

## Cross-Folder Feature Touch-Set Rules

A feature change can legitimately touch several folders. Folder placement should describe code role; the slice should describe product intent.

Before editing a cross-folder feature, write the expected touch-set in the active slice note:

- primary owner: the product/domain concept that owns the behavior;
- view surface: the route screen in `src/views/` that coordinates the user path;
- UI parts: presentational sections in `src/components/<domain>/`;
- workflow Module: composables in `src/composables/` or `src/composables/<domain>/`;
- domain state: Pinia store files in `src/stores/`;
- shared seam or contract: files in `src/lib/`;
- regression coverage: `tests/*.test.js` or existing e2e spec/helper when user flow needs browser coverage;
- documentation: roadmap, package handoff, and any semantic contract docs affected by the slice.

Use this rule to prevent two bad outcomes:

- over-splitting by folder, where a single user behavior becomes hard to trace;
- over-grouping by feature, where UI, state, contracts, and tests are forced into one feature folder and ownership becomes blurry.

Examples:

- Settings storage diagnostics workflow:
  - primary owner: Settings / persistence diagnostics;
  - view surface: `src/views/SettingsView.vue`;
  - UI parts: `src/components/settings/SettingsStorageDiagnosticsSection.vue`;
  - workflow Module: `src/composables/useSettingsStorageDiagnosticsWorkflow.js`;
  - shared seam: existing persistence/report helpers only if behavior requires it;
  - tests: Settings storage diagnostics workflow regression;
  - docs: roadmap and module-architecture handoff.
- Chat product-card behavior:
  - primary owner: Chat presentation of source-owned share objects;
  - view surface: `src/views/ChatView.vue`;
  - UI parts: `src/components/chat/*` when rendering is affected;
  - domain state: `src/stores/chat.js` only if message schema or thread behavior changes;
  - shared seam: `src/lib/shareable-object.js` when object contract changes;
  - source-module stores or views: Shopping/Food Delivery only if source-owned business records change;
  - docs: Chat package handoff and relationship/source-object docs when semantics change.

Rule of thumb:

- If a feature change touches only UI presentation, avoid state and contract files.
- If it changes persisted data, include store, migration/normalizer, backup/export implications, and tests.
- If it changes cross-module meaning, update the shared seam and the matching package handoff.
- If the same change repeatedly needs the same 4-6 files, consider creating a deeper Module with a smaller Interface so future changes concentrate there.

## Recommended Next Sequence

### Phase 0: Close Or Park The Current Worktree

Why now: the Settings backup, storage diagnostics, push workflow, Chat active-thread read-model, Chat service-thread display read-model, Chat message edit display-state, and Chat message action-sheet display-state slices are implemented. Continuing into another hotspot seam without separating this work will make future review harder.

- [x] Commit or intentionally park the current Settings governance changes.
- [ ] Keep unrelated `docs/superpowers/content/**` and `docs/superpowers/specs/**` draft edits out of the architecture-governance commit unless requested.
- [x] After the commit or parking decision, start exactly one new governance slice.

Acceptance:

- A reviewer can identify the completed Settings workflow decomposition slices and the completed Chat read-model slices without unrelated content draft noise.

### Phase 1: Finish Low-Risk Settings Residual Workflows

Completed first implementation slice:

`Settings storage diagnostics workflow extraction`

Why this should be first:

- `SettingsView.vue` is already partially decomposed, so context is warm.
- The storage diagnostics UI is already isolated in `src/components/settings/SettingsStorageDiagnosticsSection.vue`.
- The remaining orchestration in `SettingsView.vue` is a compact behavior seam: audit state, feedback state, report clearing, repair orchestration, and label helpers.
- This keeps the next step smaller than entering `ChatView.vue` or `ContactsView.vue` immediately.

Completed files:

- Created `src/composables/useSettingsStorageDiagnosticsWorkflow.js`.
- Updated `src/views/SettingsView.vue` to consume that composable.
- Added `tests/settings-storage-diagnostics-workflow.test.js`.
- Updated `docs/roadmap/TODO_ROADMAP.md` and `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`.

Acceptance:

- `DONE`: `SettingsStorageDiagnosticsSection` props and emitted events remain compatible.
- `DONE`: Storage report shape and diagnostic report codes do not change.
- `DONE`: Repair behavior still re-runs a silent audit after repair.
- `DONE`: Existing backup import rollback coverage remains green.

Completed second Settings slice:

`Settings push workflow extraction`

Why it followed storage diagnostics:

- It is still a good Settings decomposition slice.
- It touches browser push helpers, permission state, subscribe/resync/unsubscribe flows, and user confirmation, so it has more mocking and edge-state risk than storage diagnostics.

Completed files:

- Created `src/composables/useSettingsPushWorkflow.js`.
- Updated `src/views/SettingsView.vue` while keeping `src/components/settings/SettingsPushSection.vue` props/events compatible.
- Added `tests/settings-push-workflow.test.js`.

Acceptance:

- `DONE`: Health check, resync, subscribe failure, unsubscribe confirmation, and feedback timer disposal are covered by focused tests.
- `DONE`: Push helper behavior, persisted settings shape, notification facade semantics, provider/API key settings, storage/report codes, and visible Settings UI stayed unchanged.
- `DONE`: `SettingsView.vue` no longer imports `src/lib/push.js` directly for the Notification subpage.

### Phase 2: Start Top-Hotspot View Decomposition

Do not start with a full `ChatView.vue` rewrite. Start with one tested seam.

Recommended order:

1. `ChatView.vue`: route/thread/read-model, service-thread display, message-edit display-state, and message action-sheet display-state composables are `DONE` via `useChatActiveThreadModel.js`, `useChatServiceThreadDisplayModel.js`, `useChatMessageEditDisplayModel.js`, and `useChatMessageActionSheetModel.js`. Continue with one new adjacent panel-state seam if Chat remains the focus. Avoid service-message schema changes, message mutation semantics, automation queue changes, and broad visual rewrites in the same slice.
2. `ContactsView.vue`: extract selected-contact/detail-danger-flow or relationship-classification view state. Reuse the existing Contacts tests as guardrails.
3. `WorldBookView.vue`: extract source-picker/catalog read models or profile-template section state. Keep Book ownership and WorldBook activation ownership separate.
4. `HomeView.vue`: extract Home edit/library/template-picker state or split visual subcomponents only after interaction tests are identified.

Acceptance for each view slice:

- The view loses real coordination logic, not just line count.
- The extracted module has a focused public interface.
- Route/query behavior and existing user-visible copy stay stable unless explicitly in scope.
- Tests protect the extracted seam.

### Phase 3: Continue `systemStore` Interface Work

Do not split `systemStore` directly. Continue adding narrow facades where callers currently learn too much of the store shape.

Candidate order:

1. Backup reminder settings facade.
2. Push settings facade only if a later caller needs a narrower settings-store boundary than `useSettingsPushWorkflow.js` currently provides.
3. Network/API provider settings facade after deciding the provider/API key storage boundary.
4. Appearance settings facade.
5. Home layout and app placement facade.

Acceptance:

- Callers use the facade instead of direct deep mutation where practical.
- Persistence keys and backup/export shapes remain unchanged.
- The facade has focused tests before more callers migrate.

### Phase 4: Deepen Cross-Store Adapter Boundaries

First adapter target:

`Calendar relationship-fact adapter deepening`

Current issue:

- Calendar already uses `relationship-fact-adapters.js`, but Calendar still passes Chat and RelationshipRuntime store instances into the adapter path.

Target direction:

- Calendar should emit event/fact intent through a neutral adapter interface.
- The adapter should own the relationship-runtime lookup/write path.
- Calendar tests should verify behavior without requiring Calendar to know RelationshipRuntime internals.

Later adapter candidates:

- Shopping and Food Delivery service-notification bridge to Chat.
- Reminders handoff into Calendar and Map.
- Gallery access to Map/System context.

### Phase 5: Add Contract Types Incrementally

Do not migrate the app wholesale to TypeScript.

Good first candidates:

- New composables created during governance extraction.
- `src/lib/` schema and payload modules.
- Relationship facts, world-pack bindings, profile templates, Book/WorldBook source links, and backup/export payload helpers.

Acceptable approaches:

- JSDoc typedefs in JavaScript modules.
- Small `.d.ts` files for stable payload contracts.
- TypeScript only for new isolated contract modules if the build setup is intentionally prepared.

### Phase 6: Targeted Documentation And Legacy Cleanup

Scope:

- Active docs with visible encoding or stale ownership wording.
- Compatibility aliases with clear replacement paths and tests.
- Old reference plans only when they are accidentally treated as active authority.

Do not:

- Rewrite old `docs/superpowers/content/**` or `docs/superpowers/specs/**` drafts as part of architecture governance.
- Delete compatibility paths without migration evidence.
- Create new task boards outside the roadmap and PM handoff files.

## Not Recommended Now

- Full `systemStore` split.
- Full `ChatView.vue` rewrite.
- Broad TypeScript migration.
- Visual polish mixed into architecture-governance slices.
- Storage-shape or backup-payload changes bundled with UI extraction.
- Large App Store or Home beautification mixed with architecture cleanup.

## Immediate Next Action

Start with Phase 2 unless the team explicitly wants a store-interface slice:

`ChatView.vue adjacent panel-state extraction`

This is now the best current balance of value and governance pressure if Chat work continues. Settings has completed the three warm residual workflows, and Chat has completed active-thread, service-thread display, message-edit display-state, and message action-sheet display-state seams; the remaining day-to-day risk is still concentrated in top hotspot views, especially `ChatView.vue`. Promote exactly one next ChatView seam into `docs/roadmap/TODO_ROADMAP.md` and `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md` as `IN_PROGRESS` before implementation.
