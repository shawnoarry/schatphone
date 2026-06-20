# Architecture Debt Review

Updated: 2026-06-19

> Scope and authority note
>
> This is an architecture status audit with evidence and recommended directions. It is not an executable roadmap.
> Concrete execution order still belongs only in `docs/roadmap/TODO_ROADMAP.md`.
> Any item in this document must first be promoted into a task package and the live roadmap before implementation.
>
> The recommendations here are decision inputs, not a shadow task board. They support the current `4.5 Architecture Cleanup` lane and the project's ownership-closure goal.

## 1. How To Read This Document

- Severity tags:
  - `[Structural]`: large ownership or maintainability risk.
  - `[Technical Debt]`: real debt, but safer to address after the structural cuts.
  - `[Preserve]`: healthy patterns that future work should keep.
- Measurements below were re-run on 2026-06-20 against the current working tree after the Settings backup, storage diagnostics, push workflow, Chat active-thread read-model, Chat home search/list display-state, Chat service-thread display read-model, Chat message edit display-state, Chat message action-sheet display-state, and Chat `+` panel-state extractions.
- Measurement hygiene: line counts are evidence, not the problem by themselves. Treat a large file as a governance issue only when size appears together with mixed responsibilities, cross-owner knowledge, weak test locality, or repeated feature pile-up.
- The two strongest signals are still:
  - large view files;
  - `systemStore` size and fan-out.
- This document should provide evidence for cleanup planning. It must not replace `docs/roadmap/TODO_ROADMAP.md` or package `STATUS_AND_HANDOFF.md` files.

## 2. Executive Summary

The `lib/` layer and the module-ownership philosophy are the project's strongest assets. The largest structural risks are still both "God object" patterns:

1. God View Modules: the top 8 view files now average about 4568 lines each.
2. God Store Module: `src/stores/system.js` is now 4581 lines and is directly imported by 22 of 30 view files.

Both risks directly work against the ownership-closure goal. The ongoing `4.5 Architecture Cleanup` lane is the right home for this work, and the current snapshot still shows debt concentrated in the same hot view files and the same store module.

Additional debt remains real:

- store-to-store coupling still crosses domain lines;
- the relationship-fact adapter seam exists, but some stores still have to pass concrete store instances into it;
- `src` has zero TypeScript files even though the project relies heavily on structured payloads and module contracts.

This does not mean the stack needs an immediate migration. Vue, Vite, Pinia, and the current test setup are still appropriate. The urgent work is ownership closure, not framework replacement.

## 3. Measured Evidence

### 3.1 Largest View Files

| File | Lines |
| --- | ---: |
| `src/views/ChatView.vue` | 6221 |
| `src/views/ContactsView.vue` | 5863 |
| `src/views/WorldBookView.vue` | 5036 |
| `src/views/HomeView.vue` | 4355 |
| `src/views/ChatDirectoryView.vue` | 4122 |
| `src/views/WidgetsView.vue` | 4050 |
| `src/views/AppStoreView.vue` | 3635 |
| `src/views/FoodDeliveryView.vue` | 3260 |

The top 8 view files average about 4568 lines. This is a strong decomposition signal because the large files also carry multiple product responsibilities and cross-module coordination.

The `src/composables/` directory now contains 14 files:

- `useDialog.js`
- `useI18n.js`
- `useAppIconImagePreviews.js`
- `useChatActiveThreadModel.js`
- `useChatHomeListModel.js`
- `useChatMessageActionSheetModel.js`
- `useChatMessageEditDisplayModel.js`
- `useChatServiceThreadDisplayModel.js`
- `useChatUserActionPanelModel.js`
- `useSystemApiReports.js`
- `useSystemNotifications.js`
- `useSettingsBackupWorkflow.js`
- `useSettingsPushWorkflow.js`
- `useSettingsStorageDiagnosticsWorkflow.js`

That means view-level state, computed values, and side effects are still often written inline inside `<script setup>` rather than moved behind focused composable interfaces, though the first notification interface is now in place with seven migrated caller groups, the API reports interface is in place for Network diagnostics, Settings storage diagnostics and emitters, Chat diagnostic-report emitters, Map/Calendar store diagnostic-report emitters, App shell diagnostic-report emitters, and Settings backup/export raw report snapshots. Settings backup/export/restore orchestration now lives behind `useSettingsBackupWorkflow.js`, Settings storage audit/report/repair orchestration now lives behind `useSettingsStorageDiagnosticsWorkflow.js`, Settings real-push setup/health/subscription/test/feedback orchestration now lives behind `useSettingsPushWorkflow.js`, Chat active-thread route/read-model state now lives behind `useChatActiveThreadModel.js`, Chat home search/list display state now lives behind `useChatHomeListModel.js`, Chat service/official thread display state now lives behind `useChatServiceThreadDisplayModel.js`, Chat message edit display/validation state now lives behind `useChatMessageEditDisplayModel.js`, Chat message action-sheet display state now lives behind `useChatMessageActionSheetModel.js`, and Chat `+` panel display/draft state now lives behind `useChatUserActionPanelModel.js`.

### 3.2 God Store Module: `system.js`

`src/stores/system.js` is 4581 lines.

It is directly imported by 22 of 30 view files. The 8 view files without a direct `useSystemStore` import are:

- `AssetsView.vue`
- `ChatGroupsView.vue`
- `FilesView.vue`
- `GalleryView.vue`
- `PhoneView.vue`
- `RemindersView.vue`
- `StockView.vue`
- `WalletView.vue`

What `systemStore` currently owns or coordinates:

- appearance: themes, wallpaper, scoped CSS, app skins, app icon overrides, Chat appearance;
- Home: tile pages, layout templates, app-store mini-app placement, custom widgets;
- notifications: notification stack, caps, read/remove/clear actions;
- network and AI: API URL/key/model, provider kind, push server URL, API reports;
- world context: global worldview, encyclopedia/knowledge-point compatibility, world packs, world profile state;
- automation: AI automation queue, recent fingerprints, Chat truth events, Surprise Mode, module permissions;
- backup: reminder interval, last-notified state, copy tone;
- miscellaneous system/user context fields.

This is the largest ownership-concentration point in the codebase. Some of it is understandable history, but it is now too broad for locality: a change to one product area can require understanding unrelated system, appearance, world, network, and Home behavior.

### 3.3 Store-To-Store Direct Coupling

Measured by direct `useXxxStore` imports inside `src/stores/*.js`:

```text
calendar      -> Reminders, Chat, RelationshipRuntime, System
foodDelivery  -> Chat
gallery       -> Map, System
map           -> System
phone         -> Calendar, System
reminders     -> Calendar, Map
shopping      -> Calendar, Chat
stock         -> Calendar
```

The most concerning node remains `calendar`. It directly imports four other stores, including `Chat` and `RelationshipRuntime`.

Important nuance: relationship facts are not completely unstructured. `calendar` does use `src/lib/relationship-fact-adapters.js` for confirmed-event relationship facts. However, `calendar` still passes concrete `chatStore` and `relationshipRuntimeStore` instances into that adapter:

```js
recordCalendarConfirmedEventRelationshipFact({
  chatStore: useChatStore(),
  relationshipRuntimeStore: getRelationshipRuntimeStore(),
  event,
  target,
  worldContext: options.worldContext,
})
```

So the adapter seam exists, but it is not yet deep enough to hide cross-store coordination from the store module. The direction should be to move more of that orchestration behind a neutral interface, not to delete the adapter.

### 3.4 `lib/` Fan-In

For contrast, `src/lib/` remains the healthiest part of the project.

Current snapshot:

- 68 JavaScript modules under `src/lib/`.
- Highest measured fan-in:
  - `navigation-return.js`: 24
  - `persistence.js`: 17
  - `planned-module-registry.js`: 17
  - `world-pack-app-bindings.js`: 8
  - `ai.js`: 7
  - `relationship-cleanup-helpers.js`: 7
  - `relationship-fact-adapters.js`: 7

This layer is the best local model for future cleanup: focused modules, semantic names, and deeper interfaces with visible leverage.

### 3.5 Type Coverage

Current source snapshot:

- `src` contains 110 `.js` files.
- `src` contains 67 `.vue` files.
- `src` contains 0 `.ts` / `.tsx` files.
- Total measured `.js` + `.vue` source lines under `src`: about 110.2k.

TypeScript is present in devDependencies, but current application source is still JavaScript. That is acceptable for now, but it increases risk when refactoring structured contracts such as:

- world-pack app bindings;
- relationship facts and memories;
- profile templates;
- service-account templates;
- Book and WorldBook schemas;
- backup and persistence payloads.

## 4. Findings

### 4.1 [Structural] God View Modules

- The top view files are far beyond a comfortable single-file size.
- `ChatView.vue` alone imports 11 stores and coordinates messaging, rich messages, AI calls, service accounts, social-event review, appearance, commerce hooks, maps, calendar, wallet, and runtime state.
- `ContactsView.vue` imports 10 stores and combines profile editing, social snapshots, relationship memory review, source audit, commerce/media context, and destructive-role flows.
- The tiny composable layer means there are few reusable interfaces for view state and effects.

Why it matters:

- reviews become noisy and hard to reason about;
- small behavior changes touch hot files;
- tests must mount large views instead of exercising focused interfaces;
- new features naturally keep piling into existing large files.

### 4.2 [Structural] `systemStore` As An Everything Bucket

- `system.js` is the largest store module and one of the largest files in the project.
- It mixes multiple ownership domains that now deserve separate interfaces.
- It persists as one broad payload, so migration and backup behavior must account for many unrelated concepts at once.
- It is directly imported by most view files, making it a reactivity and knowledge hotspot.

Why it matters:

- one store change can affect many surfaces;
- ownership meaning becomes harder to explain;
- future WorldBook, Appearance, Home, Network, and automation work will keep competing for the same module.

### 4.3 [Technical Debt] Cross-Store Coupling Is Still Too Direct

- Store-to-store imports are not uniformly bad, but several current imports cross product ownership lines.
- `calendar -> Chat / RelationshipRuntime` is the highest-risk example because Calendar should own confirmed schedule/date meaning, while Chat owns communication state and Relationship Runtime owns relationship facts/memories.
- The relationship adapter seam should become deeper: callers should pass domain events and metadata, not concrete store instances where avoidable.

Why it matters:

- circular-dependency risk grows as modules broaden;
- stores become harder to test through their own interface;
- ownership docs say one thing while implementation still exposes cross-domain knowledge.

### 4.4 [Technical Debt] No Incremental Type Layer Yet

- The project has many hand-written normalizers and schema helpers.
- Those helpers are useful and should be preserved, but they do not give compile-time protection.
- A big-bang TypeScript migration would be risky and unnecessary.

Better direction:

- start with new or high-value `lib` contract modules;
- add JSDoc typedefs or `.ts` files only where they reduce real refactor risk;
- keep Vue and Pinia migration incremental.

### 4.5 [Preserve] What Is Working Well

1. `src/lib/` is already a good decomposition model.
2. Product ownership rules are unusually clear in the docs.
3. Pinia domain-store split is reasonable outside the `systemStore` hotspot.
4. Task-package and handoff machinery are strong.
5. Vitest and Playwright coverage are already present.
6. Local-first persistence with a lightweight relay remains the right platform direction.

## 5. Recommended Directions

These are directions, not tasks. Promote one concrete slice into `docs/roadmap/TODO_ROADMAP.md` and the module-architecture package handoff before implementation.

### 5.1 Priority 1: Put A Stable Interface Around `systemStore`

Do not start by ripping the store apart. Start by creating stable facades or adapters for the heaviest ownership areas while preserving the existing storage key and backup shape.

Best first candidates:

- notifications; first seven slices `DONE` on 2026-06-15 through `src/composables/useSystemNotifications.js`, with `LockScreen.vue` migrated as the reference caller, `App.vue` migrated for shell foreground banners, mark-read/open behavior, and notification-enabled push checks, `Phone` migrated for missed-call notification emission, `Map` migrated for notification emitters plus notification-enabled checks, Calendar migrated for event real-push readiness checks plus Calendar UI push-readiness copy, Settings / Chat Settings migrated for notification toggle/display and status copy, and `ChatView.vue` migrated for AI reply completion, notify-only auto invoke, offline auto-invoke settlement notifications, and related notification-enabled checks. Future notification cleanup should reuse that interface when new callers appear, while backup/export raw notification payloads stay under storage-format governance.
- network/API reports; first six slices `DONE` on 2026-06-15 through `src/composables/useSystemApiReports.js`, with Network diagnostics and Settings storage diagnostics migrated for report list/summary/add/clear, Chat diagnostic-report emitters migrated for notify-only automation, AI reply failure, cancel request, and reroll failure, Map/Calendar store diagnostic-report emitters migrated for push scheduling/cancellation plus Map background automation, App shell diagnostic-report emitters migrated for foreground tick/startup/auto-push diagnostics, Settings remaining diagnostic-report emitters migrated for simulation/push diagnostics, and backup/export raw report snapshots migrated behind the reports interface without changing exported shape. The 2026-06-19 Settings push workflow extraction now consumes this facade from `useSettingsPushWorkflow.js` instead of keeping push report orchestration in `SettingsView.vue`. Direct source-level `addApiReport` callers outside `systemStore` and the facade are now cleared. Provider/API key settings and storage persistence/restore shape remain larger future slices;
- appearance and scoped CSS;
- Home layout and app placement;
- backup reminder settings.

Goal:

- callers stop learning the whole `systemStore` shape;
- later extraction can happen behind the facade;
- persistence remains backward compatible.

### 5.2 Priority 2: Build Composables For The Largest Views

Target the largest view files first:

1. `ChatView.vue`
2. `ContactsView.vue`
3. `WorldBookView.vue`
4. `HomeView.vue`

`SettingsView.vue` is now about 1295 lines after the backup workflow, storage diagnostics workflow, and push workflow extractions. `ChatView.vue` has also started shrinking through `useChatActiveThreadModel.js`, `useChatHomeListModel.js`, `useChatServiceThreadDisplayModel.js`, `useChatMessageEditDisplayModel.js`, `useChatMessageActionSheetModel.js`, and `useChatUserActionPanelModel.js`, but it remains the highest-risk view. Future Settings work should be bug-led or scoped to a named remaining subdomain; the next architecture-governance slice should usually continue a different tested Chat seam, move to `ContactsView.vue` / `WorldBookView.vue`, or target a narrow `systemStore` facade.

For each view, prefer extracting state, computed values, and side effects into focused composables under `src/composables/<domain>/`.

Good first extraction candidates:

- pure filters and grouping logic;
- selected-item state;
- sheet/dialog state;
- cross-surface navigation helpers;
- payload builders that are already testable without DOM.

Avoid:

- visual rewrites mixed into extraction;
- moving code without a test seam;
- broad renames that make user work hard to merge.

### 5.3 Priority 3: Deepen Cross-Store Adapter Interfaces

Start with the Calendar relationship-fact path.

Current state:

- Calendar uses `relationship-fact-adapters.js`;
- Calendar still passes `chatStore` and `relationshipRuntimeStore` into the adapter.

Better direction:

- define a deeper event/fact interface for confirmed Calendar events;
- let a neutral adapter own the relationship-runtime lookup and write path;
- document a no-direct-reach rule for domain stores once a replacement seam exists.

This should be done one path at a time with regression tests.

### 5.4 Priority 4: Add Types Incrementally

Do not migrate the app wholesale.

Good first candidates:

- schema and contract modules in `src/lib/`;
- new modules created during extraction;
- payload shapes for world-pack bindings, relationship facts, profile templates, and Book/WorldBook source links.

Goal:

- make ownership contracts easier to refactor;
- avoid turning TypeScript adoption into a separate platform migration.

## 6. Relationship To Current Roadmap

- This review supports `4.5 Architecture Cleanup In Safe Batches`.
- It does not change roadmap order by itself.
- It argues that future `4.6 World Pack` broadening should be paired with cleanup around world-context ownership and `systemStore`, otherwise new World Pack complexity will continue to land in the same hot modules.
- The strongest near-term code-level contributions to ownership closure are:
  - a stable interface around `systemStore`;
  - composables for the largest views;
  - deeper cross-store adapter seams.

## 7. Evidence Reproduction

The 2026-06-19 measurements were produced with local file scans:

1. Count lines per `src/views/*.vue` file and sort descending.
2. Count direct `useSystemStore` imports across `src/views/*.vue`.
3. List direct `useXxxStore` imports inside `src/stores/*.js`.
4. Count references to `src/lib/<module>` imports across `src/**/*.vue` and `src/**/*.js`.
5. Count `.js`, `.vue`, `.ts`, and `.tsx` files under `src`.

Re-run these checks after each cleanup round to confirm whether the debt is shrinking.
