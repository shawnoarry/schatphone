# SchatPhone TODO Roadmap

Updated: 2026-06-15

This is the only live execution board for implementation order.

If any older planning or status document conflicts with this file, this file wins.

## 1. How To Use This Board

1. Use this file for current execution order and active status.
2. Use `docs/pm/TASK_PACKAGE_INDEX.md` to choose the correct task package before coding.
3. Use package `STATUS_AND_HANDOFF.md` files to understand current state, next slice, and do-not-do rules.
4. Keep this roadmap readable for product readers and actionable for AI engineers.
5. Do not turn this file into an archive of every historical subtask. Keep it current and concise.

## 2. Status Legend

- `TODO`: not started
- `IN_PROGRESS`: active development
- `PARTIAL_DONE`: baseline landed, closure still pending
- `DONE`: current acceptance reached
- `ON_HOLD`: intentionally deferred
- `DECISION`: blocked on product or technical decision

## 3. Current Project Snapshot

Current state:

1. the core phone shell is stable enough to support ongoing feature work;
2. Chat, role profiles, profile-side relationship premise/classification storage, Chat-side binding, and relationship runtime baseline are already online;
3. Chat now has a clearer messaging-app shell with separate Messages, Objects, Groups, Services, and Me control layers, plus a dedicated top-right Chat Settings entry;
4. Calendar and Reminders have a real product split baseline;
5. low-impact cross-module relationship facts are already working across several modules;
6. World Hub is online as an optional review/control surface, including high-risk generated Chat social-event review;
7. visual quality is still functional scaffolding in many areas rather than final immersion.

Current project risk:

- new immersive features can still create ownership drift, UI confusion, or oversized hot files if added carelessly.

## 4. Current Execution Order

### 4.1 Contacts V2 Detail IA And Memory Presentation

Status: `DONE`

Why this is first:

- destructive actions, role ID rules, memory-group cleanup, and runtime ownership are already in place;
- the next missing piece is the front-end role detail experience;
- this is the best place to reduce ambiguity before adding more derived memory behavior.

Scope:

1. finish the Contacts detail information architecture;
2. separate static profile, relationship progress, memory groups, manual entries, and event-attached entries clearly;
3. make manual vs event-attached information visually distinct;
4. keep destructive actions isolated and readable.
5. land the V1 WorldBook-driven profile-template baseline for Self Profile, Main Role, NPC, and Chat context visibility.

Acceptance:

- a role detail page can present current relationship state and memory groups without semantic confusion;
- users can tell which items are manually entered and which came from events;
- Contacts remains distinct from Chat Directory.
- WorldBook owns template definitions, while Contacts owns concrete profile values.
- NPC -> Main Role upgrade preserves existing Chat binding and history.

Current implementation note:

- V1 profile-template schema, WorldBook preset/world-template storage, Contacts entity grouping, profile-value display, NPC upgrade, and Chat profile-context gates have landed.
- Relationship classification Rounds 1 through 4 have landed at the schema/store/AI/Contacts/event seam: role profiles persist `relationshipLabelText`, `relationshipLabelNote`, `initialRelationshipSeed`, stored primary category, modifiers, confidence/source/timestamp, and explanation; the AI helper calls through `src/lib/ai.js`, normalizes JSON results, saves high-confidence AI suggestions as `ai_auto`, returns medium/low-confidence suggestions for confirmation as `ai_confirmed`, and preserves `user_edited` classifications from silent AI overwrite. Contacts detail behaves as the role control page for this slice by showing the read-only relationship runtime snapshot before editable premise/classification fields. Event/runtime now reads saved category/modifier fields only, never raw label/note prose, and low-impact facts carry `relationshipGate` audit metadata. High-risk hard-gating exists as named helper/test presets only; no new high-impact automation is enabled.
- Chat Directory relationship compatibility containment has landed: legacy `relationshipLevel` and `relationshipNote` remain for binding compatibility, but visible copy labels them as Chat-local tuning/note and does not present them as current affinity.
- Contacts detail now covers grouped manual/event-attached sections, inline manual-detail editing, expanded linked-activity drill-down, memory source-audit, supporting-event drill-down, memory review filtering/sort, and lifecycle controls (`Pinned / Active / Archived` plus review note).
- 4.1 acceptance is considered reached; later memory dedupe/merge and further polish continue under 4.2 and later visual passes.

Primary references:

- `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

### 4.2 Text-First Memory Dedupe And Recall Rules

Status: `DONE`

Why this is next:

- cross-module facts already exist;
- the next risk is duplicate or noisy memory recall;
- memory quality matters more now than adding more memory sources.

Scope:

1. tighten one-event-one-memory-group behavior;
2. keep source attachments without double-counting relationship growth;
3. improve Calendar memory review details after Contacts presentation is clearer.

Acceptance:

- the same life event does not appear as several competing top-level memories;
- supporting facts remain available without becoming duplicate primary memories;
- Chat and Contacts can consume cleaner memory summaries.

Current implementation note:

- the first 4.2 runtime tightening slice is now landed: Shopping gift memory and its downstream Calendar delivery follow-up now reuse one shared memory group instead of surfacing as two competing top-level memories;
- the next explicit-lineage merge is also landed: Map shared-route facts can pass their source trip id into Map-derived Calendar follow-ups, so the confirmed Calendar follow-up becomes supporting context inside the same `shared_route` memory group;
- Wallet order-support facts for Shopping gifts and Food Delivery shared meals are covered as supporting-only facts inside the upstream `shopping_gift` / `food_shared_meal` memory groups, preserving ledger traceability without stacking relationship metrics;
- source-level traceability remains intact because each module fact still keeps its own source module and source id entries inside the shared memory group;
- explicit-lineage coverage is now broad enough for the current adapter set: Phone callback, Shopping gift, Food Delivery shared meal, Wallet support, Map route, and Calendar follow-up chains all have regression coverage where source ids are explicit;
- Chat prompt context now consumes primary-led `recallSummary` text, while Contacts and World Hub consume UI-facing review summaries that keep the original life-event headline and only mention the related-record count;
- Calendar confirmed-event cards now expose a relationship review detail showing source lineage, target, memory role, and whether the Calendar fact applied growth or stayed supporting-only;
- current 4.2 acceptance is reached for explicit source-id chains and product-facing review copy across Calendar, Contacts, and World Hub;
- relationship runtime memory counts are now canonical full-state counts before display caps, so `memoryLimit` can keep UI lists short without undercounting total, visible, or archived memory groups;
- future dedupe work should only add another merge when a new explicit source-id chain appears, while fuzzy same-text merging remains out of scope.

Primary references:

- `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`

### 4.3 World Hub Review Quality Before Stronger Controls

Status: `DONE`

Why this is next:

- World Hub already exists and can review runtime state;
- the safer path is to improve review quality before enabling stronger overrides;
- Cheats should not be frozen until this lane is clearer.

Scope:

1. improve event and relationship review details in World Hub;
2. make automatic runtime behavior easier to explain;
3. keep value editing, funds editing, unlock editing, and other high-power controls deferred until the review surface is trusted.

Acceptance:

- World Hub is readable enough for PM, QA, and advanced users to understand why a runtime effect happened;
- pending relationship effects are easier to inspect before approval or dismissal;
- Cheats remains a future lane, not a default user path.

Current implementation note:

- World Hub event logs now support module/status filters, selected-log detail, trigger-source/reason/target review, adapter-boundary notes, and world-variant context where present.
- World Hub relationship facts now support status/source filters, selected-fact detail, metric-delta review, source-record visibility, pending-effect explanations, and supporting-only duplicate-growth explanations.
- World Hub relationship fact detail now also shows read-only relationship-classification gate audit metadata when a fact includes it, without becoming the main relationship editor or a broad control surface.
- High-risk relationship gate presets are available at the helper seam; Chat social-event review now consumes that seam for generated communication-state proposals, while high-impact romance/conflict automation stays on hold.
- Chat social-event review V1 is landed: generated role greetings can become audited pending message requests, while role refusal/block/restore/unblock proposals wait in World Hub before Chat applies the communication state. Chat AI responses can submit optional normalized `socialEvents`, foreground/session runtime can submit a conservative role greeting candidate for stranger or declined role contacts, and World Hub now explains source, trigger policy, and ownership boundaries; Contacts shows the Chat snapshot only.
- Settings > AI Automation / 设置 > AI 自动响应 now exposes the foreground event tick in product terms: opt-in state, current safe-check range, latest related result, and a direct World Hub review path.
- Settings > AI Automation / 设置 > AI 自动响应 now also exposes Surprise Mode and module event permissions for Chat role-contact events and Food Delivery safety events, making runtime randomness and per-module event allowance visible before stronger controls are considered.
- Review actions remain narrow: pending relationship facts can still be approved or dismissed, and relationship cleanup remains guarded; broad affinity, funds, unlock, or freeform override editing stays deferred.

Primary references:

- `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`

### 4.4 Service-Account Continuity For Shopping / Logistics / Food Delivery

Status: `DONE`

Why this matters:

- Chat already has service-account style capability;
- Shopping, logistics, and Food Delivery are natural sources of believable in-phone communication;
- this deepens immersion without requiring high-risk runtime automation.

Scope:

1. deepen Shopping/logistics service-account pushes in Chat;
2. deepen Food Delivery service-account pushes in Chat;
3. preserve ownership boundaries between orders, logistics, Wallet records, and route context.

Acceptance:

- service-account communications feel more like real app notifications or brand messages;
- Chat receives richer module context without absorbing module business state.

Current implementation note:

- Chat now has a reusable `service_notification` rich message surface with source module, source record id, optional source event id, service label, status, amount, route actions, unread behavior, and source-level dedupe.
- Chat App now separates immersive message entry from control surfaces through `Messages`, `Objects`, `Groups`, `Services`, and `Me`; `Me` is the Chat identity/anonymity plus recent-interaction surface, the top-right gear opens Chat Settings, diagnostics live under Chat Settings, and group chats are first-class Chat targets with member ids and reply-mode metadata.
- Chat Appearance V1 is now stored under `systemStore.settings.appearance.chat`, with Kakao immersive as the default preset, WeChat/Kakao/iMessage message-layout modes, and a separate Chat-scoped custom CSS injection path.
- Shopping checkout can push order notifications into matching Shopping service-account threads, while Shopping remains the owner of products, cart, checkout, order status, and Calendar delivery cues.
- Shopping logistics events can push tracking notifications into matching Logistics service-account threads, while logistics remains a tracking-facing communication lane and does not become a storefront.
- Food Delivery checkout and order events can push order/update notifications into the Food Delivery Dispatch service-account thread, while restaurants, menus, order state, delivery fulfillment, Wallet expenses, and Map route context remain owned by their source modules.
- Service-account pushes only target existing Chat Directory service accounts; source modules do not auto-create service identities.

Primary references:

- `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`

### 4.5 Architecture Cleanup In Safe Batches

Status: `IN_PROGRESS`

Why this remains ongoing:

- historical encoding and semantic debt still exists in some documents and hot files;
- the project is now big enough that ownership drift can become expensive quickly.

Scope:

1. keep cleaning one-owner-per-concept semantics;
2. continue low-risk decomposition of oversized views and files;
3. clean stale compatibility layers and historical doc noise in batches.
4. keep agent-generated specs/plans/content from becoming shadow task boards.
5. keep known validation failures visible in active governance docs until fixed.

Acceptance:

- docs and code agree on field and ownership meaning;
- new work does not reintroduce parallel owners for the same concept;
- hot files stop being the default place to pile on new behavior.

Primary references:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`
- `docs/process/AI_WORK_MODE.md`

Current implementation note:

- `DONE` 2026-06-20: Chat AI image-reference preparation extraction. `src/composables/useChatAiImageReferenceModel.js` now owns assistant image-reference metadata normalization, context-message image reference collection, role-bound reference candidate selection, and Gallery AI-reference URL preparation behind a focused composable Module Interface. `ChatView.vue` now consumes that Interface while keeping AI transport, provider capability selection, prompt semantics, assistant parsing, message append/mutation, automation scheduling, Gallery asset ownership, role binding contract shape, image-reference fallback semantics, message schema, and visible Chat copy unchanged. Regression coverage now protects metadata clamping/provider normalization, newest-first context image references, asset URL resolution and text-only fallback notes, role-bound preferred/reference/scenario/folder candidates, emoji/excluded asset filtering, and context-first reference merging without mounting the full Chat view.
- `DONE` 2026-06-20: Chat AI prompt/context preparation extraction. `src/composables/useChatAiPromptContextModel.js` now owns system-prompt block assembly, message-context conversion, context-window selection, quote candidates, smart-reply history preparation, and automation fingerprint source text behind a focused composable Module Interface. `ChatView.vue` now consumes that Interface while keeping AI transport, assistant parsing, message append/mutation, automation scheduling, diagnostics, social-event submission, relationship/runtime/source-module ownership, message schema, and visible Chat copy unchanged. Regression coverage now protects prompt limits, truth-event summaries, context-window selection, AI message conversion, quote candidates, recalled/rich/service/revised message context, role/service/group/anonymous prompt instructions, source-module ownership copy, and image-reference prompt policy without mounting the full Chat view.
- `DONE` 2026-06-20: Chat automation status display-state extraction. `src/composables/useChatAutomationStatusModel.js` now owns automation enabled/readiness copy, next/last/settlement/background-reminder display state, and status-time formatting behind a focused composable Module Interface. `ChatView.vue` now consumes that Interface while keeping automation policy decisions, queue execution, notification emission, diagnostics, conversation auto-state persistence, AI request behavior, and visible copy unchanged. Regression coverage now protects disabled/notify-only/quiet-hours schedule copy, next/last/settlement hints, real-push readiness, due-window, policy-blocked, notify-only, and armed background-reminder states without mounting the full Chat view.
- `DONE` 2026-06-20: Chat AI request/retry/reroll display-state extraction. `src/composables/useChatAiRequestStateModel.js` now owns in-flight AI request state, request/retry/cancel eligibility, retry target ids, controller cancellation, and error/retry cleanup behind a focused composable Module Interface. `ChatView.vue` now consumes that Interface while keeping AI transport, prompt/context assembly, diagnostics, automation scheduling, message mutation semantics, service-notification behavior, and persisted storage shape unchanged. Regression coverage now protects start/finish/cancel state, reply/reroll retry gating, deleted-message retry cleanup, thread-switch cleanup, and busy-state request gating without mounting the full Chat view.
- `DONE` 2026-06-20: Chat service route/action feedback-state extraction. `src/composables/useChatServiceFeedbackModel.js` now owns service source-open/reply/read/sent feedback state, route-feedback normalization, best-effort session recovery, and service-feedback clearing behind a focused composable Module Interface. `ChatView.vue` now consumes that Interface while keeping service-notification schema, source-module record ownership, route behavior, persisted storage shape, and visible Chat copy unchanged. Regression coverage now protects route feedback persistence/recovery/expiry, unsafe-route normalization, reply/sent/read feedback gating, and service-thread display integration without mounting the full Chat view.
- `DONE` 2026-06-20: Chat pending quote display/action-state extraction. `src/composables/useChatPendingQuoteModel.js` now owns quote target resolution, pending quote bar label/preview state, service-notification quote payload state, invalid-target cleanup, source-message recall/delete cleanup, active-thread silent cleanup, and the quote payload passed to existing send actions. `ChatView.vue` now consumes that Interface while keeping message schema, recall/delete semantics, AI context assembly, service-notification behavior, route behavior, persisted storage shape, and visible Chat copy unchanged. Regression coverage now protects ordinary quote previews, service-notification quote payloads, communication-state gating, invalid/recalled target cleanup, service quote feedback cleanup, and silent post-send/thread-switch cleanup without mounting the full Chat view.
- `DONE` 2026-06-20: Chat thread menu/settings draft-state extraction. `src/composables/useChatThreadMenuModel.js` now owns active-thread menu open/close state, thread tuning draft defaults/normalization, thread identity draft state, save-feedback flags/timers, and the normalized payload builders consumed by Chat's existing save actions. `ChatView.vue` now consumes that Interface while keeping Chat message schema, AI reply generation, automation scheduling, service-notification behavior, route behavior, persisted storage shape, thread-menu UI copy, and visible Chat behavior unchanged. Regression coverage now protects menu draft normalization, identity draft updates, automation-gated settings payloads, unknown-field guards, and saved-feedback timer cleanup without mounting the full Chat view.
- `DONE` 2026-06-20: Chat home search/list display-state extraction. `src/composables/useChatHomeListModel.js` now owns the Messages home list read-model: search open/keyword state, message-request / folded-service / blocked grouping, folded-service unread count, visible contact filtering, unread-total copy, conversation preview lookup, and home hero copy. `ChatView.vue` now consumes that Interface while keeping Chat message schema, service-notification behavior, source-module ownership, AI reply behavior, automation, routing, persistence, rich-message mutation actions, Wallet writes, Gallery asset binding, media import, Shopping share semantics, and visible Chat UI behavior unchanged. Regression coverage now protects grouping, search matching, folded unread totals, hero-copy priority, search toggle cleanup, and conversation-preview lookup without mounting the full Chat view.
- `DONE` 2026-06-20: Chat `+` panel-state extraction. `src/composables/useChatUserActionPanelModel.js` now owns composer-adjacent user action panel display/draft state: panel open/close, selected panel form, draft reset/update, link/transfer/voice validation state, gallery category selection and asset ordering, gallery preview cache lifecycle, and gallery/location readiness copy. `ChatView.vue` now consumes that Interface while keeping message sending, Wallet transaction writing, Gallery asset binding, media import, Shopping share semantics, service-notification contracts, AI reply behavior, automation, routing, persistence, and visible Chat UI unchanged. Regression coverage now protects panel open/close, disabled communication warnings, draft validation, gallery/location readiness, role-prioritized gallery ordering, preview cache release, and existing transfer/voice/link/location/gallery/Shopping panel paths without mounting the full Chat view for the new model.
- `DONE` 2026-06-19: Chat message action-sheet display-state extraction. `src/composables/useChatMessageActionSheetModel.js` now owns message action target lookup, sheet open/close state, visible action rows, action labels, per-action visibility rules, action tone classes, and stable action test ids behind a focused composable Module Interface. `ChatView.vue` now renders action rows from that Interface while keeping the actual quote/copy/save/edit/restore/reroll/recall/delete actions, message mutation semantics, service-notification schema, source-module ownership, AI context assembly, routing, persistence, and visible Chat UI styling unchanged. Regression coverage now protects normal, service-thread, recalled, semantic-revision, and editable/source-owned rich-card action rows without mounting the full Chat view. This handed off into the completed Chat `+` panel-state slice above; future Chat governance should choose one new adjacent seam and mark it separately.
- `DONE` 2026-06-19: Chat message edit display-state extraction. `src/composables/useChatMessageEditDisplayModel.js` now owns edit modal field definitions, rich-card edit validation, text edit validation display state, and the editable rich-card type list behind a focused composable Module Interface. `ChatView.vue` now consumes that Interface while keeping message mutation actions, delete/recall/save/reroll behavior, service-notification schema, source-module ownership, AI context assembly, routing, persistence, and visible Chat UI copy unchanged. Regression coverage now protects ordinary text validation plus external-link, transfer, and voice-card edit states without mounting the full Chat view. This handed off into the completed Chat message action-sheet display-state slice above; future Chat governance should choose one new adjacent seam and mark it separately.
- `DONE` 2026-06-19: Chat service-thread display read-model extraction. `src/composables/useChatServiceThreadDisplayModel.js` now owns service/official thread presentation-only computed state behind a focused composable Module Interface: service status tags/header copy, service template/channel preview, source chips/source notification plan display rows, inbox placement, empty-state copy, and composer-adjacent source/reply/read/sent feedback dock. `ChatView.vue` now consumes that display read-model instead of keeping the second service-thread layer inline. Chat message schema, service-notification contract, source-module record ownership, subscription mute/fold actions, session route-feedback storage behavior, AI reply behavior, automation, routing, persisted storage shape, and visible Chat UI copy are unchanged. Regression coverage now protects service status/inbox/source-plan/empty-state/dock outputs without mounting the full Chat view. This handed off into the completed Chat message edit display-state slice above; future Chat governance should choose one new adjacent seam and mark it separately.
- `DONE` 2026-06-19: Chat active thread read-model extraction. `src/composables/useChatActiveThreadModel.js` now owns the route-derived active chat id/contact, active conversation, merged AI prefs, active messages, communication availability, Chat appearance classes, avatar/module identity read-models, and service-thread muted/folded flags behind a focused composable Module Interface. `ChatView.vue` now consumes that read-model instead of keeping the first active-thread layer inline. Chat message schema, service-notification contract, source-module record ownership, AI reply generation, automation queue behavior, route behavior, persisted storage shape, and visible Chat UI copy are unchanged. Regression coverage now protects active route resolution, default/fallback behavior, merged AI prefs, service-thread flags, appearance classes, and avatar hierarchy. This handed off into the completed Chat service-thread display read-model slice above; future Chat governance should choose one new adjacent seam and mark it separately.
- `DONE` 2026-06-19: Settings push workflow extraction. `src/composables/useSettingsPushWorkflow.js` now owns Settings real-push capability labels, permission sync, server health checks, resync, subscribe, test, unsubscribe, notification-toggle updates, and feedback/saved-state timers behind a focused composable Module Interface. `SettingsView.vue` now wires the Notification subpage through that Interface and no longer imports `src/lib/push.js` directly. `SettingsPushSection.vue` props/events stayed compatible. Push helper behavior, persisted settings shape, notification facade semantics, provider/API key settings, storage/report codes, and visible Settings UI copy are unchanged. Regression coverage now protects health-check success, missing local subscription resync, subscribe failure, unsubscribe confirmation success, and workflow timer disposal. This handed off into the completed Chat active thread read-model slice above; future Chat governance should choose one new adjacent seam and mark it separately.
- `DONE` 2026-06-19: Settings storage diagnostics workflow extraction. `src/composables/useSettingsStorageDiagnosticsWorkflow.js` now owns Settings storage audit/report/repair orchestration, persistence-inspection wiring, status/label helpers, and feedback timer lifecycle behind a focused composable Module Interface. `SettingsView.vue` now consumes that Interface for the About / Storage Diagnostics UI and no longer imports persistence diagnostic helpers directly. Storage report codes, persistence inspection/repair behavior, backup/export shapes, provider/API key settings, and visible Settings UI are unchanged. Regression coverage now protects healthy audit reports, drift repair semantics, storage-only report clearing, and feedback timer cleanup.
- `DONE` 2026-06-19: first Settings large-file decomposition slice. `src/composables/useSettingsBackupWorkflow.js` now owns backup/export/restore orchestration behind a focused composable Module Interface for export/import actions, copy mode, asset-package mode, and feedback state. `SettingsView.vue` now wires the Data & Security UI to that Interface instead of directly coordinating Gallery/Files/Book/Wallet/Assets/RelationshipRuntime backup stores. The backup JSON shape, restore/rollback semantics, storage diagnostic report codes, provider/API key settings, and visible Settings UI are unchanged. Regression coverage now includes the composable export interface plus the existing Settings import rollback path.
- `DONE` 2026-06-18: Network/API URL-first transport cleanup. `NetworkView` no longer depends on visible provider-brand buttons for setup, saved API configurations load from the URL-area dropdown, and the shared `src/lib/ai.js` adapter now accepts common OpenAI-compatible chat URL shapes such as base `/v1`, `/models`, `/chat/completions`, Gemini OpenAI-compatible paths, and local Ollama-style `/api/chat`/`/api/tags` while keeping Gemini native dispatch separate. The next native-adapter slice also supports OpenAI Responses `/responses`, Anthropic Messages `/v1/messages`, and Azure OpenAI deployment chat/responses URLs with provider-specific headers and request bodies. Official provider URLs remain key-required; local and server-auth compatible gateways can be tested and saved without a browser-stored key. The latest IA polish keeps URL, key, model input/selection, model-list refresh, connection test, and save-current-settings in one compact connection panel, while saved-configuration management and diagnostics move behind secondary disclosures. Regression coverage now protects URL adaptation, setup guidance, no-key local smoke tests, native provider dispatch, saved no-key configurations, and the compact connection-panel structure.
- `DONE` 2026-06-15: sixth API reports interface governance slice. Backup/export read access for raw `apiReports` snapshots now goes through `src/composables/useSystemApiReports.js#createReportSnapshot`, with regression coverage that snapshots are detached from the live store. Exported data shape, persisted storage shape, provider/API key settings, and restore semantics stayed unchanged. Remaining `apiReports.value` usage is inside `systemStore` persistence/clear/write internals and the reports facade, so the next API reports step is a larger storage-shape/provider-settings decision.
- `DONE` 2026-06-15: fifth API reports interface governance slice. `SettingsView.vue` remaining diagnostic-report emitters for simulation tick and push health/resync/subscribe/unsubscribe/test flows now go through `src/composables/useSystemApiReports.js`, with Settings and API reports interface regression coverage. Provider/API key settings, backup/export raw `apiReports` payloads, and storage persistence shape stayed out of this slice. Direct source-level `addApiReport` callers outside `systemStore` and the facade are now cleared; the next API reports work is a larger storage/export/provider-settings decision, not another small emitter migration.
- `DONE` 2026-06-15: fourth API reports interface governance slice. `App.vue` shell diagnostic-report emitters for foreground event tick reporting, push startup self-heal, and chat auto-push scheduling/cancellation now go through `src/composables/useSystemApiReports.js`, with App shell and API reports interface regression coverage. Settings remaining report emitters, provider/API key settings, backup/export raw `apiReports` payloads, and storage persistence shape stayed out of this slice.
- `DONE` 2026-06-15: third API reports interface governance slice. `Map` and Calendar store diagnostic-report emitters for push scheduling/cancellation and Map background automation now go through `src/composables/useSystemApiReports.js`, with regression coverage for Map and Calendar push diagnostics through the system report stack. App/remaining Settings emitters, provider/API key settings, backup/export raw `apiReports` payloads, and storage persistence shape stayed out of this slice.
- `DONE` 2026-06-15: second API reports interface governance slice. `ChatView.vue` diagnostic-report emitters for notify-only automation, AI reply failure, cancel request, and reroll failure now go through `src/composables/useSystemApiReports.js`, with regression coverage for Chat AI reply failure diagnostics. Map/Calendar/App/Settings report emitters, provider/API key settings, Chat notification behavior, automation queue ownership, backup/export raw `apiReports` payloads, and storage persistence shape stayed out of this slice.
- `DONE` 2026-06-15: first API reports interface governance slice. `src/composables/useSystemApiReports.js` now exposes a narrow tested interface for API/storage diagnostic report reads, summaries, add, and clear; `NetworkView.vue` consumes it for diagnostics list/summary/add/clear, and `SettingsView.vue` consumes it for storage diagnostic report read/add/clear. Chat/Map/Calendar/App report emitters, provider/API key settings, backup/export raw `apiReports` payloads, and storage persistence shape stayed out of this slice.
- `DONE` 2026-06-15: seventh notification interface caller migration slice. `ChatView.vue` system-notification stack calls and notification-enabled checks for AI reply completion, notify-only auto invoke, and offline auto-invoke settlement now go through `src/composables/useSystemNotifications.js`; Chat service-account `service_notification` rich messages, source-module service pushes, notification persistence shape, push delivery payloads, and broad ChatView decomposition stayed out of this slice.
- `DONE` 2026-06-15: sixth notification interface caller migration slice. Settings notification toggle/display and Chat Settings notification status copy now go through `src/composables/useSystemNotifications.js`; backup/export raw notification payloads, notification persistence shape, push delivery payloads, and ChatView notification emitters stayed out of this slice.
- `DONE` 2026-06-15: fifth notification interface caller migration slice. Calendar notification-enabled checks in the Calendar store and Calendar UI push-readiness copy now go through `src/composables/useSystemNotifications.js`; Calendar event/reminder ownership, real-push payloads, scheduling semantics, persistence shape, Settings backup/export, and Chat emitters stayed out of this slice.
- `DONE` 2026-06-15: fourth notification interface caller migration slice. `Map` notification emitters and notification-enabled checks now go through `src/composables/useSystemNotifications.js`; route/trip state, arrival scheduling behavior, push relay payloads, persistence shape, Settings backup/export, and Chat emitters stayed out of this slice.
- `DONE` 2026-06-15: third notification interface caller migration slice. `Phone` missed-call notification emission now goes through `src/composables/useSystemNotifications.js`, while Calendar missed-call cue ownership, notification persistence shape, Settings backup/export, and Chat/Map emitters stayed out of that slice.
- `DONE` 2026-06-15: second notification interface caller migration slice. `App.vue` now consumes `src/composables/useSystemNotifications.js` for shell foreground notification watching, mark-read/open behavior, and notification-enabled checks used by shell push startup/scheduling. This stayed out of Settings backup/export and source-module notification emitters.
- `DONE` 2026-06-15: first `systemStore` notification interface governance slice. `src/composables/useSystemNotifications.js` now exposes a narrow tested interface for notification reads/writes, and `LockScreen.vue` consumes it for recent notifications, mark-read, remove, and clear-all flows. This slice did not change notification persistence shape, push delivery, or lock-screen visual behavior. Future notification governance should migrate the remaining callers to this interface instead of creating another notification wrapper.
- 2026-06-12 governance pass clarified process authority across `AI_WORK_MODE`, `schatphone-workflow`, event/visual workflows, command/path conventions, frozen event/visual references, and `docs/superpowers/**` working artifacts.
- Validation debt found during this pass is cleared: Chat shopping-entry mojibake copy and stale WorldBook e2e expectations are now green in unit and E2E validation.
- Production dependency audit is clean after transitive lockfile updates; no framework migration is recommended in this governance slice. E2E shell-entry navigation is now centralized in a shared helper for lock-screen unlock, Home readiness, hash-route readiness, and Home dock app opening; full Playwright validation is green.
- The Vite build warning for `src/lib/push.js` mixed static/dynamic imports is cleared by making the main entry use the same static helper import as the rest of the app while preserving deferred service-worker registration.
- The mojibake guard now follows the active-document model: it protects source and current docs, keeps `docs/superpowers/**/README.md` governance notes covered, and excludes archived plus non-README `docs/superpowers/**` draft/reference files from the active quality gate.

Recently landed system-shell task:

- `DONE`: Lock-screen notification cleanup and Settings Software Update confirmation. This focused UX/IA interruption added per-item/clear-all lock-screen notification controls and a Settings update-confirmation subpage; implementation record lives in `docs/superpowers/plans/2026-06-09-lock-notifications-software-update-plan.md`.

### 4.6 World Pack / App Archetype / Service Template System

Status: `PARTIAL_DONE`

V1 WorldBook baseline landed:

- `Settings -> WorldBook` now leads with an active-world overview and a usable `Current World Pack / 当前设定包` activation panel;
- `src/lib/world-interface.js` is the shared world-context seam for Chat prompt context, Chat thread WorldBook summary, active WorldBook overview, active Book source links, enabled World Pack metadata, and runtime worldview fallback; active Book source injection is now covered through Chat and runtime tests;
- World Pack V1 storage and activation review are in place with one legacy active pack plus additive enabled compatible expansion packs; enabled-pack service-account templates are now shown as availability in Current World Pack, while Chat Directory's `Services` management area owns user opt-in, editable/resettable built-in candidates, reviewed AI/pasted service-candidate confirmation, descriptive source notification plans, and the idempotent add/create chain; the first concrete app-binding V1 is live for `marketplace -> Shopping`, where `survival_city` opens Shopping as `补给站` with active world context and a safe Daily Fresh / Grocery filter.
- The first global world app-entry seam is landed: `src/lib/world-pack-app-bindings.js` can produce stable `world_app_*` entries from enabled packs, App Store lists them as World entries, explains which World Pack created the entry and which target app will open, and Home/App Library placement can place/open them with `worldPack`/`worldApp` route context.
- Current World Pack no longer acts as a mini launcher for enabled world apps. It shows the active snapshot and tells users to use App Store's `World` section for browsing, placement, and launch, without providing a direct App Store jump button inside Settings.
- The first world UX package seam is landed in the same helper: target apps can resolve active-pack labels, terminology, accent, route query, and boundary copy. Shopping consumes it for the marketplace filter path, Food Delivery uses any confirmed `dispatch -> Food Delivery` context for hero title, banner, route-context preservation, and safe Nearby default, Calendar uses the `reservation -> Calendar` context for title/boundary presentation, and Map uses the `transit -> Map` context for title/banner presentation while each target app keeps source-record ownership.
- World Pack schema can now carry explicit relationship category/modifier registry additions for later classification/event use. This is data-only in the current slice; no editor UI is added.
- Book text-library V1 is trial-ready: `/book`, `bookStore`, Book schema helpers, import/create/edit/read/export flows, App Store/Home recovery entry, Settings backup/restore integration, WorldBook source picker, section-level activation, changed-source warnings, visual diff review, and reviewed source-link refresh are in place. `现代首尔 K-pop 娱乐圈` is now seeded as built-in read-only Book sources for the main worldview, world rules, and the first encyclopedia entries: K-pop industry mechanisms, Chinese fandom terms, Seoul youth lifestyle, company/group/program references, and representative member profiles. WorldBook can activate them without requiring a paste/import step.
- Book / WorldBook IA is being tightened around a first-use source setup path: system fallback stays outside Book until copied, Book import/export uses confirmation surfaces, active Book usage is shown from the text library detail view, WorldBook text-library browsing stays in the current picker as grouped Book-card choices instead of routing to `/book`, Book text categories are limited to Worldview/Rules/Encyclopedia, and Book now uses a phone-native Shelf -> Detail -> Editor flow instead of stacking library, reading, and editing on one scroll. Profile templates are structured records: Contacts can use universal templates directly, while WorldBook can enable current-world templates for Contacts to prioritize.
- `Settings -> WorldBook` now uses a single-focus control console after the active-world overview: Sources, Pack, Kernel, Templates, and Knowledge are task panels instead of one long stacked management page. Source linking and changed-source review open as layered sheets so activation work does not stretch the main screen.
- The Sources task panel now reads as a source-control console with active/review/available/disabled stats, system fallback status, linked-source cards, and separated destructive removal actions.
- WorldBook's Current World Pack and Knowledge task panels now have their first internal craft pass; knowledge creation/editing is a focused bottom sheet, keeping the panel itself for status, filters, and list review.
- The compatible-expansion model is now in V1: WorldBook keeps the main world premise, AI can analyze that premise into a world profile, Current World Pack recommends compatible expansion packs, and users can still browse/enable additional compatible packs. The first trial expansions are `school_life`, `business_family`, and `urban_mystery`; enabled packs flow into App Store World entries and Chat Services candidates together instead of replacing the main world one at a time.
- Kernel and Templates now share the same task-panel visual system, so the whole WorldBook console is closer to one coherent Settings-owned management surface instead of mixed legacy panels.
- Current World Pack now has an Economy & currency baseline: a world pack can declare custom currencies, inject them into Wallet, and Wallet owns the primary currency plus editable USD/CNY-centered exchange rates. Chat transfer cards and commerce prices consume that shared Wallet setting instead of creating app-local currency systems.

Current product direction:

- use the older, lower-complexity entry model first;
- `WorldBook` remains reachable from `Settings` and contextual links, not as a new default Home app;
- `World Pack` activation belongs inside the full `WorldBook` management page as a `Current World Pack / 当前设定包` area;
- compatible expansion packs are additive over the user's chosen or imported main world. AI recommendation is advisory, not exclusive: users can enable other supported packs after review, and enabled packs are consumed together by App Store and Chat Services;
- activation/review stays in `WorldBook`, but active-pack effects must be global after activation;
- the next World Pack model has two outputs: a world UX package that changes labels, terminology, accents, context banners, and safe UX variants for existing apps; and world-specific app entries unlocked into the global app-entry system, including App Store/App Library surfaces. The app-entry output now has a first implementation seam, and the world UX package has a first target-app context/banner seam that still needs broader app hardening;
- later world-specific app entries should come from the guarded nonstandard-app template registry plus AI extraction from active WorldBook context. `src/lib/world-app-template-registry.js` now provides the whitelist/review seam for clinic, bounty board, guild board, fan club, transit pass, dispatch board, and reservation board style entries; `black_market` remains a recognized but blocked candidate with `needs_dedicated_app`, so it must not be silently mapped onto Shopping. The Current World Pack panel now exposes AI extraction plus pasted-JSON review before confirmation with explicit loading, empty, parse/API error, and rejected-state treatment in an advanced/collapsible area. It must not generate routes, stores, business logic, or arbitrary event rules. Low-confidence, unsupported, or mismatched suggestions stay out of App Store; confirmed suggestions become appBindings for the active pack only, then follow the same App Store/Home placement/target-app context path as built-in appBindings. Service/official account candidates follow the same product rule inside Chat Services: built-in candidates can be edited/reset before joining, AI/pasted suggestions must pass the guarded review seam, confirmed suggestions become templates only until the user manually subscribes, and source notification plans remain descriptive until the user joins;
- world UX package defaults must coexist with user customization. World Pack provides the default immersive layer, while user-controlled Appearance CSS remains an explicit higher-priority override. The first shell-level scope hook is landed through `src/lib/app-shell-scope.js`, scoped authoring is landed through `settings.appearance.scopedCustomCss`, `src/lib/appearance-scoped-css.js`, and the Appearance Advanced CSS sheet for app/world-app targets, and `src/lib/appearance-pack.js` now exports/imports portable appearance packs for theme/wallpaper/icons/global CSS/scoped CSS without copying Home layouts, widgets, or Chat appearance;
- do not build a standalone world-store, Steam-like shell, DLC storefront, or token economy for V1;
- `Book` exists as a separate text-library app because it owns source text editing, not world activation or storefront behavior;
- keep `World Hub` and future `Cheats` in the hidden runtime-control lane, separate from WorldBook/World Pack authoring and activation.

Why this may become a main lane:

- WorldBook, service accounts, Shopping, Logistics, Food Delivery, Calendar, Map, Wallet, Assets, and Stock are now mature enough to need a reusable world-driven extension model;
- future modes such as black markets, auction houses, hospitals, flights, subscriptions, task boards, and publication accounts should not become one-off custom data chains;
- the current service-notification boundary already proves the right direction: Chat owns communication history, while source modules own business truth.

Remaining task structure:

1. run phone-device user testing on the Book import/export -> WorldBook source activation -> changed-source diff review -> AI expansion recommendation -> multi-pack enablement -> App Store/Chat/runtime context loop;
2. user-test the WorldBook -> `补给站` -> Shopping filter path, `救援调度` -> Food Delivery hero/banner/default Nearby view, `fandom_schedule_board` -> Calendar reservation context, and `survival_safe_route_pass` -> Map transit context on phone-sized devices;
3. user-test and harden the global world app-entry seam now that enabled World Pack app bindings appear in App Store/App Library/Home placement flows, Current World Pack only tells users where to find them instead of launching or jumping from Settings, and App Store explains the WorldBook-vs-App-Store ownership handoff before opening; also preserve the distinction that World is an active-world source axis, while Shops is the shop-shaped subset of folder mini apps that can also be generated by a world pack when it has a supported target folder;
4. user-test Appearance pack import/export and scoped CSS recovery; add finer component hooks only where user-authored packs prove too coarse;
5. harden the world UX package seam across more target apps and visual variants so active-pack labels, terminology, accents, context banners, and safe defaults remain visible without losing source-module ownership;
6. user-test and harden the new Current World Pack nonstandard-app review UI on real phone-sized flows: the automated path now covers rejected suggestions staying absent from App Store, `black_market` staying blocked as `needs_dedicated_app`, loading/empty/error/rejected states in the review panel, a confirmed `transit_pass` moving through App Store, Home placement, and Map context, a confirmed `reservation_board` moving through App Store into Calendar context, and a confirmed `dispatch_board` moving through App Store into Food Delivery context with safe Nearby default. Broader phone visual copy and more target archetypes still need product review;
7. user-test and broaden service/subscription account opt-in beyond the current enabled-pack service-account V1, keeping creation inside Chat Services and source-module behavior outside Chat ownership; the next service-account slice should exercise the ready source notification plans from concrete source modules without automatic subscription creation or source-record creation;
8. define and land the next concrete archetype target beyond the current Shopping marketplace / Food Delivery dispatch / Calendar reservation / Map transit trials.
9. keep reviewing App Store detail density as the app library grows; phone-sized screens now use a selected-app detail sheet, but future large catalogs may still need deeper category pages or richer search.
10. continue App Store mini-app entry management from the landed binding-target baseline: `Shops` remains the shop-shaped subset of folder mini apps, existing Food Delivery entries resolve as `food_delivery`, Shopping platform services appear as `shopping`-bound entries, and future world-pack-generated shops should use `source: world_pack` plus a supported target folder. Display/icon/cover/short-description/tag/template presentation, installed/not-installed target-folder placement, and the add-handoff flow are landed. App Store only manages install/facade/launch context; Food Delivery and Shopping own consumer shop browsing, favorites/recent lists, category filters, menus/products, carts, orders, and service notifications. Next shop work should focus on a Shopping-owned custom store/service record decision if user-created Shopping shops need more than preset platform services.

Current design reference:

- `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md`
- `docs/superpowers/plans/2026-05-29-book-text-library-worldbook-plan.md`
- `docs/superpowers/specs/2026-05-23-world-pack-app-archetype-service-template-design.md`
- `docs/superpowers/specs/2026-05-29-worldbook-functional-ia-and-world-interface-design.md`
- `docs/superpowers/specs/2026-05-29-world-pack-shopping-archetype-v1-design.md`
- `docs/superpowers/plans/2026-05-29-world-pack-shopping-archetype-v1-plan.md`

Decision note:

- this is intentionally not implemented directly from conversation notes;
- the V1 activation shell is now decided and implemented as a baseline: activation/review stays inside `Settings -> WorldBook`, but active-pack effects must not be limited to that Settings surface;
- `Book` is a text-source library, not a replacement for WorldBook, Files, World Hub, or a world-store shell;
- the wider 4.6 lane is now partially implemented, but still guarded: broaden only after phone-sized user testing confirms the Book/WorldBook/World Pack/Shopping/Food Delivery paths are understandable.

## 5. Deferred Or Guarded Directions

These are known directions, but should not jump ahead of the current work.

### 5.1 Gallery-Driven Relationship Memory

Status: `ON_HOLD`

Reason:

- current image sources are still too manual;
- forcing users to structure memories around photos would add friction and hurt immersion.

Current rule:

- relationship memory should stay text-first and event-first for now;
- Gallery remains primarily an asset and atmosphere surface.

### 5.2 High-Impact Automatic Relationship Events

Status: `ON_HOLD`

Reason:

- low-impact explicit facts are already the right current lane;
- high-impact romance/conflict automation still needs safer review and control surfaces.
- Broader high-impact social/relationship automation should still build on the landed Chat social-event review seam instead of writing directly to Chat, Contacts, or relationship runtime. The V1 seam covers Chat AI-sourced role greeting/refusal/block/restore/unblock review and a narrow foreground/session runtime greeting source, but richer background scheduling, relationship-stage effects, romance/conflict event packs, and Cheats-style overrides remain on hold.

### 5.3 Cheats As A Finished Product Surface

Status: `DECISION`

Reason:

- Cheats still has no frozen unlock source, route shape, or editing surface;
- World Hub should mature first.

## 6. Recently Landed Baselines Worth Preserving

These are already usable and should be treated as current foundation, not active open questions.

1. Calendar vs Reminders split baseline.
2. Relationship runtime baseline with memory groups and cleanup seams.
3. Contacts role delete, relationship reset, and single-memory delete baseline.
4. Shopping, Food Delivery, Phone, Map, Wallet, and Calendar low-impact relationship fact adapters.
5. World Hub read-only runtime review plus pending-relationship review path.
6. Chat social-event review V1: Chat AI and the foreground/session runtime greeting pilot can submit normalized role social proposals, Event Runtime stores/audits them, World Hub reviews high-risk proposals, Chat applies confirmed communication state, and Contacts displays snapshots only.
7. Delivery route context visible in Food Delivery and Shopping surfaces.
8. Task-package system, workflow docs, and package handoff pages.
9. Core overview and architecture docs have been refreshed to current semantics.

## 7. Validation Rule

For any meaningful code round:

1. run `npm run lint`;
2. run `npm run build`;
3. run `npm run test` when behavior changed;
4. sync the required docs in `docs/process/AI_WORK_MODE.md` in the same round.

## 8. Read Next

After this roadmap:

1. `docs/pm/TASK_PACKAGE_INDEX.md`
2. the matching package `README.md`
3. the matching package `STATUS_AND_HANDOFF.md`
4. `docs/process/AI_WORK_MODE.md`
