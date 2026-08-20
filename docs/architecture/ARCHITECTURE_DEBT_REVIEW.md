# Architecture Debt Review

Updated: 2026-08-20

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
- Measurements were re-run on 2026-08-09 against the current worktree after the Camera/image-generation, Music, expanded Food Delivery, OpenFreeMap, Seoul catalog, and current product slices.
- Measurement hygiene: line counts are evidence, not the problem by themselves. Treat a large file as a governance issue only when size appears together with mixed responsibilities, cross-owner knowledge, weak test locality, or repeated feature pile-up.
- The two strongest signals are still:
  - large view files;
  - `systemStore` size and fan-out.
- This document should provide evidence for cleanup planning. It must not replace `docs/roadmap/TODO_ROADMAP.md` or package `STATUS_AND_HANDOFF.md` files.

## 2. Executive Summary

The `lib/` layer and the module-ownership philosophy are the project's strongest assets. The largest structural risks are still both "God object" patterns:

1. God View Modules: the top 8 view files now average about 5327 lines each, with `FoodDeliveryView.vue` at 12195 lines after the independent shop facades and current commerce slices landed.
2. God Store Module: `src/stores/system.js` is now 4808 lines and is directly imported by 25 of 41 view files.

Both risks directly work against the ownership-closure goal. The ongoing `4.5 Architecture Cleanup` lane is the right home for this work, and the current snapshot still shows debt concentrated in the same hot view files and the same store module.

Additional debt remains real:

- store-to-store coupling still crosses domain lines;
- the relationship-fact adapter seam exists, but some stores still have to pass concrete store instances into it;
- Relationship Runtime, Event Instance V2, and Mini Scene silently truncate committed records at 500, 240, and 120 rows respectively, contradicting the accepted durable-history rule;
- Chat can supply competing current relationship text, while explicit user disclosures are grouped too broadly under one memory key;
- Relationship Runtime, Event Runtime, Mini Scene, and related owner flows can report a successful action without tying that message to the persistence result already available from the storage layer;
- Mini Scene request identity does not yet prevent another provider call for the same committed request;
- `src` has zero TypeScript files even though the project relies heavily on structured payloads and module contracts.
- backup export currently includes `settings.api.key` through the full settings snapshot;
- production and full dependency audits are clean after an isolated normal-resolver compatible transitive refresh, without direct, override/resolution, or major changes;
- PR and main Pages workflow definitions include full E2E plus separate production/full audits; remote Pages Run #130 and the deployed `/schatphone/` base-path smoke are proven, while external protection remains unverified.
- the Vercel root app and fail-closed fixed-upstream optional AI proxy are deployed and Git-connected; the current local tree prepares a direct-default, explicitly selected, restricted per-request OpenAI-compatible relay for Vercel, Cloudflare, and GitHub Pages without operator-per-provider configuration. It is not yet pushed or deployed. GitHub Pages direct-provider model/connection/real-Chat/reload proof passes, while installed-PWA/relaunch and named true-device proof remain open.

This does not mean the stack needs an immediate migration. Vue, Vite, Pinia, and the current test setup are still appropriate. The urgent work is ownership closure, not framework replacement.

## 3. Measured Evidence

### 3.1 Largest View Files

| File | Lines |
| --- | ---: |
| `src/views/FoodDeliveryView.vue` | 12195 |
| `src/views/ContactsView.vue` | 5233 |
| `src/views/ChatView.vue` | 4960 |
| `src/views/HomeView.vue` | 4456 |
| `src/views/WorldBookView.vue` | 4104 |
| `src/views/WidgetsView.vue` | 4050 |
| `src/views/ChatDirectoryView.vue` | 3916 |
| `src/views/AppStoreView.vue` | 3699 |

The top 8 view files average about 5327 lines. This is a decomposition signal because the large files also carry multiple product responsibilities and cross-module coordination. The Food Delivery facades intentionally share one runtime owner, but their route-view concentration is now the clearest measured hotspot. `MusicView.vue` is 2783 lines and should be monitored, but its current first slice remains below this top-eight hotspot set and has focused contract/store/view coverage.

The `src/composables/` directory now contains 37 files. The list below records the established architecture seams and is not an exhaustive inventory:

- `useDialog.js`
- `useI18n.js`
- `useAppIconImagePreviews.js`
- `useChatActiveThreadModel.js`
- `useChatAssistantResponseModel.js`
- `useChatAssistantResultModel.js`
- `useChatAiImageReferenceModel.js`
- `useChatAiRequestStateModel.js`
- `useChatAiPromptContextModel.js`
- `useChatAutomationStatusModel.js`
- `useChatHomeListModel.js`
- `useChatMessageActionSheetModel.js`
- `useChatMessageEditDisplayModel.js`
- `useChatPendingQuoteModel.js`
- `useChatServiceFeedbackModel.js`
- `useChatServiceThreadDisplayModel.js`
- `useChatThreadMenuModel.js`
- `useChatUserActionPanelModel.js`
- `useContactsHomeListModel.js`
- `useContactsDangerZoneModel.js`
- `useContactsDetailSectionModel.js`
- `useContactsLinkedActivityModel.js`
- `useContactsMemoryDetailModel.js`
- `useContactsMemoryListModel.js`
- `useContactsProfileHeaderModel.js`
- `useContactsProfileTemplateEditorModel.js`
- `useContactsRoleHubModel.js`
- `useContactsWorldFieldModel.js`
- `useSystemApiReports.js`
- `useSystemNotifications.js`
- `useSettingsBackupWorkflow.js`
- `useSettingsPushWorkflow.js`
- `useSettingsStorageDiagnosticsWorkflow.js`
- `useWorldBookKnowledgeModel.js`
- `useWorldBookProfileTemplateModel.js`
- `useWorldBookSourceModel.js`

That means view-level state, computed values, and side effects are still often written inline inside `<script setup>` rather than moved behind focused composable interfaces, though the first notification interface is now in place with seven migrated caller groups, the API reports interface is in place for Network diagnostics, Settings storage diagnostics and emitters, Chat diagnostic-report emitters, Map/Calendar store diagnostic-report emitters, App shell diagnostic-report emitters, and Settings backup/export raw report snapshots. Settings backup/export/restore orchestration now lives behind `useSettingsBackupWorkflow.js`, Settings storage audit/report/repair orchestration now lives behind `useSettingsStorageDiagnosticsWorkflow.js`, Settings real-push setup/health/subscription/test/feedback orchestration now lives behind `useSettingsPushWorkflow.js`, Chat active-thread route/read-model state now lives behind `useChatActiveThreadModel.js`, Chat AI request/retry/reroll display state now lives behind `useChatAiRequestStateModel.js`, Chat AI prompt/context preparation now lives behind `useChatAiPromptContextModel.js`, Chat AI image-reference preparation now lives behind `useChatAiImageReferenceModel.js`, Chat assistant response parsing/normalization now lives behind `useChatAssistantResponseModel.js`, Chat assistant result post-processing now lives behind `useChatAssistantResultModel.js`, Chat automation status/readiness display state now lives behind `useChatAutomationStatusModel.js`, Chat home search/list display state now lives behind `useChatHomeListModel.js`, Chat service/official thread display state now lives behind `useChatServiceThreadDisplayModel.js`, Chat service route/action feedback state now lives behind `useChatServiceFeedbackModel.js`, Chat message edit display/validation state now lives behind `useChatMessageEditDisplayModel.js`, Chat message action-sheet display state now lives behind `useChatMessageActionSheetModel.js`, Chat `+` panel display/draft state now lives behind `useChatUserActionPanelModel.js`, Chat thread menu/settings draft state now lives behind `useChatThreadMenuModel.js`, Chat pending quote display/action state now lives behind `useChatPendingQuoteModel.js`, Contacts home search/grouping/recent-interaction read-model state now lives behind `useContactsHomeListModel.js`, Contacts selected-profile memory list/source-filter/count-copy read-model state now lives behind `useContactsMemoryListModel.js`, Contacts selected-memory source-audit/timeline/headline-facts read-model state now lives behind `useContactsMemoryDetailModel.js`, Contacts linked-activity summary/list rows now live behind `useContactsLinkedActivityModel.js`, Contacts Role Hub summary cards plus read-only Chat social snapshot rows now live behind `useContactsRoleHubModel.js`, Contacts world-field/template-adaptation display rows now live behind `useContactsWorldFieldModel.js`, Contacts danger-zone impact/confirmation display rows now live behind `useContactsDangerZoneModel.js`, Contacts role-detail section display rows now live behind `useContactsDetailSectionModel.js`, Contacts profile-header display state now lives behind `useContactsProfileHeaderModel.js`, Contacts profile-template editor display rows now live behind `useContactsProfileTemplateEditorModel.js`, WorldBook Book source-link/picker/diff display rows now live behind `useWorldBookSourceModel.js`, WorldBook encyclopedia filtering/readiness/deep-link display now lives behind `useWorldBookKnowledgeModel.js`, and WorldBook profile-template display/read-model state now lives behind `useWorldBookProfileTemplateModel.js`.

### 3.2 God Store Module: `system.js`

`src/stores/system.js` is 4808 lines.

It is directly imported by 25 of 41 view files. The remaining 16 view files have no direct `useSystemStore` import.

What `systemStore` currently owns or coordinates:

- appearance: themes, wallpaper, scoped CSS, app skins, app icon overrides, Chat appearance;
- Home: tile pages, layout templates, app-store mini-app placement, custom widgets;
- notifications: notification stack, caps, read/remove/clear actions;
- network and AI: API URL/key/model, provider kind, push server URL, API reports;
- world context: global worldview, encyclopedia/knowledge-point compatibility, world packs, world profile state;
- World Suite compatibility carrier: bounded install origins and resumable coordination checkpoints, while native owners retain all resource bodies and activation truth;
- automation: AI automation queue, recent fingerprints, Chat truth events, Surprise Mode, module permissions;
- backup: reminder interval, last-notified state, copy tone;
- Music compatibility carrier: normalized public library/provider/integration state, while the Music Store remains the logical owner and credentials use a separate carrier;
- miscellaneous system/user context fields.

This is the largest ownership-concentration point in the codebase. Some of it is understandable history, but it is now too broad for locality: a change to one product area can require understanding unrelated system, appearance, world, network, and Home behavior.

### 3.3 Store-To-Store Direct Coupling

Measured by direct `useXxxStore` imports inside `src/stores/*.js`:

```text
calendar      -> Reminders, Chat, RelationshipRuntime, System
foodDelivery  -> Chat
gallery       -> Map, System
map           -> System
music         -> System
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

- 69 JavaScript modules under `src/lib/`.
- Highest measured fan-in:
  - `navigation-return.js`: 23
  - `planned-module-registry.js`: 17
  - `persistence.js`: 17
  - `world-pack-app-bindings.js`: 8
  - `ai.js`: 7
  - `relationship-cleanup-helpers.js`: 7
  - `relationship-fact-adapters.js`: 7

This layer is the best local model for future cleanup: focused modules, semantic names, and deeper interfaces with visible leverage.

### 3.5 Type Coverage

Current source snapshot:

- `src` contains 152 `.js` files.
- `src` contains 85 `.vue` files.
- `src` contains 0 `.ts` / `.tsx` files.
- Total measured `.js` + `.vue` source lines under `src`: 131,038.

TypeScript is present in devDependencies, but current application source is still JavaScript. That is acceptable for now, but it increases risk when refactoring structured contracts such as:

- world-pack app bindings;
- relationship facts and memories;
- profile templates;
- service-account templates;
- Book and WorldBook schemas;
- backup and persistence payloads.

### 3.6 Security, Quality, And Release Evidence

Verified on 2026-07-22:

- `npm.cmd audit --omit=dev`: 0 production vulnerabilities;
- full `npm.cmd audit`: 0 vulnerabilities;
- Vite 7.3.6 and the isolated Vitest 4.1.10 migration are complete; Vitest now reuses root Vite and no longer brings nested Vite 5.4.21/esbuild 0.21.5;
- the later compatible transitive lock refresh used normal npm resolution, changed no direct dependency or major line, and added no override/resolution;
- Settings backup serializes `settings` directly, including the configured AI API key;
- the push relay has permissive CORS, JSON-file secrets/subscriptions/schedules, and no authentication;
- PR CI and main Pages build definitions run lint, unit, build, separate production/full audits, and one full Playwright collection that includes the focused visual suite;
- repository artwork externalization now has local batch/registry/archive tooling plus offline commit and CI gates; production endpoint activation, runtime URL cutover, archive removal, and three-host proof remain pending the 771-object verification gate;
- GitHub Pages deploy requires the verified build job and still does not deploy the push relay;
- the repository has no coverage threshold.

These findings do not establish production readiness. Production and full dependency audits are clean after the accepted lock refresh, while exported/local secrets, the unauthenticated push relay, public-relay origin spoofing, instance-local rate limiting, residual DNS-rebinding risk, external CI/environment protection, installed-PWA/deployed-network proof, and named physical-device evidence still require explicit hardening or verification. One direct configured-provider Chat path is proven on deployed GitHub Pages; the new restricted compatibility relay remains local until an authorized push.

## 4. Findings

### 4.1 [Structural] God View Modules

- The top view files are far beyond a comfortable single-file size.
- `ChatView.vue` alone imports 11 stores and coordinates messaging, rich messages, AI calls, service accounts, social-event review, appearance, commerce hooks, maps, calendar, wallet, and runtime state.
- `ContactsView.vue` imports 10 stores and combines profile editing, social snapshots, relationship memory review, source audit, commerce/media context, and destructive-role flows.
- The composable layer has grown to 37 focused files, but substantial orchestration and cross-owner knowledge still remains inline in the largest views.

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

### 4.5 [Security] Credential And Development-Tool Boundaries

- backup export includes the locally configured AI API key;
- every complete local JSON export now warns before payload construction/download and cancellation has no export/report side effects;
- local browser state and exported JSON are not encrypted;
- the push relay is a local/single-operator delivery helper, not a production security boundary;
- the root Vite/Vitest migrations and compatible transitive advisory remediation are complete; local and remote workflow evidence now include production/full audit gates, while external enforcement remains unverified.

Why it matters:

- users may treat backup files as ordinary documents even though they contain credentials and private world/chat data;
- exposing a development server or Vitest UI beyond a trusted machine increases risk;
- a clean production audit can hide development and CI exposure if the two results are not reported separately.

### 4.6 [Release] CI Workflow Proof And Deployed Artifact Validation Remain Incomplete

- the workflow definitions exercise full product E2E and both audit scopes before PR acceptance or Pages artifact upload;
- remote Pages Run #130 and the deployed `/schatphone/` base-path smoke are proven;
- branch/environment required checks remain external unverified settings, and installed-PWA/relaunch plus true-device proof remain; a Vercel-specific configured-provider run is only needed for origin-specific CORS/PWA evidence because the deployed Pages direct-provider flow already passes;
- no code-coverage floor exists.

Why it matters:

- a locally valid workflow can still be misconfigured remotely or bypassed by external repository settings;
- one successful Pages or Vercel deployment does not prove Git reproducibility, provider credentials, installed-PWA behavior, or later true-device operation;
- test-count growth does not prove important branches are covered.

### 4.7 [Preserve] What Is Working Well

1. `src/lib/` is already a good decomposition model.
2. Product ownership rules are unusually clear in the docs.
3. Pinia domain-store split is reasonable outside the `systemStore` hotspot.
4. Task-package and handoff machinery are strong.
5. Vitest and Playwright coverage are already present.
6. Local-first persistence with a lightweight relay remains the right platform direction.

## 5. Recommended Directions

These are directions, not tasks. Promote one concrete slice into `docs/roadmap/TODO_ROADMAP.md` and the module-architecture package handoff before implementation.

### 5.0 Priority 0: Finish Persistence Architecture After The Backup Contract

Before another broad feature family:

1. preserve the accepted `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md`, including standalone manifests, integrity, capacity/failure states, staged activation, legacy degraded recovery, exact local-material reuse, crash recovery, and rollback;
2. preserve the architecture-accepted IndexedDB v1 schema, record/generation model, persistent-storage timing, isolated-container rule, and fail-closed multi-tab contract;
3. `DONE 2026-07-22`: the approved non-active Book foundation/fixture/staging pilot and the later separately approved Book-only application cutover/runtime activation now have targeted real-Chromium IndexedDB, same-container coordination, reopen, and rollback coverage; every non-Book migration remains behind a later gate;
4. `DONE 2026-07-22`: preserve complete migration backup contents, including configured credentials, and add the confirmed pre-download sensitive-file warning plus export regression coverage;
5. `DONE 2026-08-07`: expose structured layered-write and Book Repository failures through one root-shell recovery status without changing Store snapshots, Repository schema, or backup format;
6. `DONE 2026-08-09`: acquire one page-level current-save writer before reconciliation/mount, keep later same-container pages inspect-only/read-only across current durable carriers, distinguish ordinary occupancy from true conflicts, cooperatively release on page exit, automatically retry from bounded release metadata, and prove zero-write/release/retry plus stale-head rejection in Chromium;
7. `DONE 2026-08-09`: implement the release-local complete v3 required-section/binary integrity, durable rollback checkpoint, crash recovery, legacy compatibility, and reopen boundary; predictive capacity, cross-owner root activation, and unavailable-media presentation remain separate;
8. `DONE 2026-07-21`: update the compatible Vite patch line and safe transitive dependencies;
9. `DONE 2026-07-22`: complete Vitest's isolated 4.1.10 migration and preserve the full test baseline;
10. `DONE 2026-07-22`: refresh the remaining compatible transitive advisory nodes through normal npm resolution and close production/full audit at 0/0;
11. `PARTIAL_DONE 2026-08-09`: gate PR and Pages builds with full E2E and both audits, prove remote Pages plus deployed base-path and direct-provider Chat/reload behavior, and establish the Git-connected Vercel root/optional-proxy baseline; external protection, PWA/relaunch, and true-device proof remain.

Do not mix these changes with product behavior or a large view refactor.

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

1. `ContactsView.vue`
2. `ChatView.vue`
3. `WorldBookView.vue`
4. `HomeView.vue`

`SettingsView.vue` remains much smaller than the top hotspots after the backup workflow, storage diagnostics workflow, and push workflow extractions. `ChatView.vue` is now about 4312 lines after the active-thread, AI request-state, AI prompt/context preparation, AI image-reference preparation, assistant response parsing/normalization, assistant result post-processing, automation-status, home-list, service-thread display, service-feedback, message-edit, action-sheet, `+` panel, thread-menu, and pending-quote extractions. `ContactsView.vue` is now about 4754 lines after the home-list, memory-list, memory-detail, linked-activity, Role Hub, world-field/template-adaptation display, danger-zone display, detail-section display, profile-header display, and profile-template editor display read-model extractions. `WorldBookView.vue` is now about 4130 lines after the Book source-link/picker/diff display, encyclopedia filtering/readiness/deep-link display, and profile-template display/read-model extractions. These remain high-risk product-critical views, but the next architecture-governance slice should usually continue an unrepeated Contacts / WorldBook / Home view seam or target a narrow `systemStore` facade rather than returning to Settings by inertia.

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

- This review supports `4.5 Architecture, Security, And Documentation Maintenance`.
- It does not change roadmap order by itself.
- It argues that future `4.6 World Pack` broadening should be paired with cleanup around world-context ownership and `systemStore`, otherwise new World Pack complexity will continue to land in the same hot modules.
- The strongest near-term code-level contributions to ownership closure are:
  - CI/release gating that matches the local Definition of Done;
  - a stable interface around `systemStore`;
  - composables for the largest views;
  - deeper cross-store adapter seams.

## 7. Evidence Reproduction

The 2026-07-10 measurements were reproduced with local file scans:

1. Count lines per `src/views/*.vue` file and sort descending.
2. Count direct `useSystemStore` imports across `src/views/*.vue`.
3. List direct `useXxxStore` imports inside `src/stores/*.js`.
4. Count references to `src/lib/<module>` imports across `src/**/*.vue` and `src/**/*.js`.
5. Count `.js`, `.vue`, `.ts`, and `.tsx` files under `src`.
6. Run production-only and full dependency audits separately.
7. Inspect backup payload construction and CI/deploy workflows directly.

Re-run these checks after each cleanup round to confirm whether the debt is shrinking.
