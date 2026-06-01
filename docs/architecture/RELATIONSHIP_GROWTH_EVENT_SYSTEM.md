# Relationship Growth Event System / 好感度、关系进展与角色成长事件系统

Updated: 2026-06-01

## 1. Purpose

This document defines the standard requirement for affinity, relationship progress, interpersonal dynamics, and character growth events in SchatPhone.

本文定义 SchatPhone 中“好感度 / 人际关系进展 / 角色成长”事件专项的标准需求，供后续 Chat、Contacts、Map、Shopping、Food Delivery、Wallet、Calendar、World Hub 等模块接入时复用。

Core decision:

- Relationship and growth events must use one shared runtime foundation.
- Each feature module may provide facts, but should not invent its own relationship system.
- Major relationship-stage changes must be explainable and, when risky, user-confirmed.
- The system must remain optional; users who prefer free chat can keep relationship runtime controls off.

Design north star:

- Events, growth, tasks, and numeric data exist to serve user freedom, immersion, and the feeling of a real virtual life inside the phone.
- These systems must not make the product feel more artificial, administrative, or restrictive.
- A relationship or growth mechanic is only successful when it makes the world feel more alive while preserving the user's ability to act freely.
- If a mechanic pushes the user into a rigid task list, blocks free roleplay, or makes the AI feel controlled by visible game rules, it should be downgraded, made optional, hidden behind World Hub, or redesigned.
- The standard test for future work: does this make the virtual world feel more real, or does it expose the machinery?

## 2. Product Goal

The product goal is not only to store relationship numbers. The goal is to make the phone feel like a living relationship simulation where:

- Chat conversations can affect emotional continuity.
- Map visits, dates, exploration, and co-presence can become relationship facts.
- Shopping gifts, food delivery, Wallet transfers, calls, calendar events, and shared media can become context for relationship progress.
- WorldBook/worldview choices can change what kinds of relationship events and growth arcs are possible.
- World Hub can later review or adjust these systems like a game master or cheat-control app, while staying optional and hidden by default.

Important framing:

- The user should feel they are living freely inside a believable virtual phone world.
- Relationship values and event rules should stay mostly behind the scenes, surfacing as natural memories, context, choices, notifications, and world reactions.
- The system should add surprise and continuity, not replace user agency.

## 3. Ownership Rules

Relationship runtime should sit behind a small shared seam, not inside a view.

Recommended ownership:

- `simulationStore` owns event logs, cooldowns, caps, Surprise Mode, and runtime execution metadata.
- `relationshipRuntimeStore` owns affinity values, relationship stages, growth traits, milestones, pending confirmations, cross-module relationship event history, and compact memory summaries.
- Chat owns conversation messages, role replies, service-account display, and prompt assembly.
- Contacts owns the global role archive, visible role identity, role detail semantics, and destructive relationship management.
- Chat Directory owns Chat-side role binding and service-account entry management.
- Manually authored role-detail notes may live in Contacts or Chat-side compatibility fields, but current relationship progress must remain owned by `relationshipRuntimeStore`.
- Contacts role profiles own profile-side relationship premise/classification fields such as `relationshipLabelText`, `relationshipLabelNote`, `initialRelationshipSeed`, `primaryRelationshipCategoryId`, `relationshipModifierIds`, and classification audit metadata.
- Contacts detail may render the current relationship runtime snapshot first, but that display is read-only current truth from `relationshipRuntimeStore`; editable premise fields remain profile-side context.
- Chat owns confirmed social/channel state such as pending friend, blocked, or blocked-by-role status.
- Generated social events such as role-initiated greetings, refusal, blocks, restore, or unblock must be reviewed/audited through event runtime before they mutate Chat channel state.
- WorldBook owns worldview, lore, knowledge points, and world-specific rule inputs.
- Map, Shopping, Food Delivery, Wallet, Phone, Calendar, Gallery, and Assets may submit structured facts through adapters.
- World Hub reads, reviews, and later adjusts runtime state, but should not become the main data entry surface for role/world records.

Do not:

- Put relationship mutation logic directly in `ChatView.vue`, `MapView.vue`, or other view files.
- Let AI directly mutate affinity/stage values without a local rule or user confirmation.
- Let module adapters bypass the shared event engine for random or condition-driven relationship changes.
- Let every module create its own standalone long-term memory for the same life event when a shared memory summary would be enough.
- Let Chat or Contacts directly apply generated friend/block/refusal social events without the event-runtime review seam.

## 4. Core Data Concepts

Recommended concepts for the first implementation:

- `entityKey`: stable target for a role, contact, group, or future NPC.
- `affinity`: broad positive or negative relationship warmth.
- `trust`: reliability and safety felt by the character.
- `intimacy`: closeness, familiarity, emotional openness.
- `tension`: unresolved conflict, pressure, jealousy, suspicion, or distance.
- `dependency`: how much one side relies on the other.
- `relationshipStage`: human-readable stage such as stranger, acquaintance, friend, close friend, ambiguous, lover, rival, distant, conflict.
- `growthTraits`: persistent character-growth tags such as confident, guarded, independent, devoted, ambitious, traumatized, healing.
- `milestones`: important confirmed moments, such as first call, first gift, confession, argument, reunion, shared trip, rescue, betrayal, promise.
- `factEvents`: source facts submitted by other modules before relationship rules interpret them.
- `relationshipEvents`: interpreted effects such as affinity increase, trust decrease, stage candidate, milestone candidate, growth trait update.
- `memoryKey`: optional shared key that lets multiple low-impact facts point at one life event.
- `memoryAggregate`: a compact runtime summary built from several applied facts that share the same `memoryKey`.
- `relationshipLabelText` and `relationshipLabelNote`: profile-side premise prose saved on the role profile.
- `primaryRelationshipCategoryId` and `relationshipModifierIds`: stored profile-side classification fields intended to give event/runtime rules stable semantic context without rereading raw prose.
- `classificationSource` and `classificationConfidence`: audit fields that explain whether the stored classification came from AI, user confirmation, manual editing, or a world template.
- Relationship-label AI classification goes through `src/lib/ai.js` and shared JSON parsing. High-confidence suggestions can be saved as `ai_auto`; medium/low-confidence suggestions must be confirmed before saving as `ai_confirmed`; `user_edited` classifications are protected from silent AI or world-template overwrite.
- Contacts manual relationship-premise saves use `classificationSource = user_edited`; AI classify in Contacts may auto-save high-confidence suggestions, must confirm medium/low-confidence suggestions, and must surface protected user-edited results without overwriting them.
- `relationshipGate`: optional runtime fact audit metadata produced from saved classification fields only. It records gate decision, mode, reason, category, modifiers, and classification audit fields; it must not copy or depend on raw `relationshipLabelText` or `relationshipLabelNote`.
- high-risk gate preset: a named local helper contract such as `romance_confession`, `relationship_confirmation`, or `jealous_boundary` that future event packs may reference instead of copying category/modifier rules.

Use numeric values for computation, but show user-facing summaries as plain language.

## 5. Event Flow

Standard flow:

1. A module records a normal domain action.
2. The module adapter submits a relationship-relevant fact to the shared event system.
3. The event engine checks settings, module enablement, world context, conditions, cooldowns, and caps.
4. A relationship adapter may attach saved-classification gate context, then interprets the fact into a small proposed effect.
5. Safe low-impact effects may be written automatically if the user enabled the runtime.
6. Major effects become pending confirmations or World Hub review items.
7. Runtime can group compatible applied facts under one `memoryKey`.
8. Chat prompt assembly and Contacts display read the resulting relationship snapshot and memory summaries.

Example:

- Shopping owns an order and Wallet owns a downstream expense.
- A gift purchase for a role submits a fact: `gift_purchased`.
- The relationship adapter checks whether the target role exists, whether gifting events are enabled, and whether the world pack changes gift meaning.
- It may create a milestone candidate: `received_first_gift`.
- Chat can later mention the gift because the relationship snapshot includes the milestone.

Cross-module memory rule:

- Source-level dedupe prevents the same module record from stacking twice.
- Memory-level merge prevents several modules from surfacing the same life event as several equally weighted memories.
- Metric deltas should remain tied to explicit facts; memory summaries exist to keep recall clean and explainable.
- When one module creates the primary life event and a later module only schedules or follows up that same event, both records should reuse one shared `memoryKey` whenever the source lineage is explicit.

## 6. WorldBook And World-Aware Packs

Relationship events must be world-aware.

Recommended model:

- WorldBook remains distributed and immersive: users can still add world/person/role material from the most natural module.
- World Pack schema may add explicit relationship category/modifier registry entries as data-only extensions; the base category set remains fixed.
- A compact world context resolver converts active worldview, knowledge points, and role bindings into IDs/tags.
- A relationship event pack is generated or selected for the active world context.
- Runtime uses the local pack by default instead of calling the API for every event.

Examples:

- Campus world: club check-ins, exams, cafeteria encounters, dormitory gossip, study sessions, sports day, confession wall.
- Fantasy world: monster shop discovery, sect trial, spiritual root test, talisman gift, master-disciple tension, forbidden cave exploration.
- Sci-fi world: station duty, AI companion trust calibration, spaceport delay, memory implant anomaly, mission debrief.
- Apocalypse world: supply sharing, shelter defense, injury treatment, betrayal suspicion, rescue route, resource scarcity conflict.
- Daily city world: missed calls, coffee delivery, shared commute, movie date, package pickup, rent pressure, work fatigue.

AI/API policy:

- API may be used to generate or refresh a world-specific relationship event pack.
- API may classify a saved relationship label only through the relationship-label classifier seam; this helper returns a normalized suggestion and save policy, not a runtime event decision.
- Routine runtime triggering should use local rules, local packs, and local facts.
- API should not be required for every affinity update.
- Logs should store compact `worldContextId`, `eventPackId`, and `variantId`, not full raw WorldBook text.

## 7. User Control And Safety

Required controls:

- Global enable or disable for relationship-growth runtime.
- Per-module enable flags for Chat, Map, Shopping, Food Delivery, Wallet, Phone, Calendar, Gallery, Assets.
- Intensity level through Surprise Mode or a future World Hub control.
- Reset, export, and backup compatibility.
- Read-only explanation logs before powerful mutation controls are added.

Confirmation policy:

- Low-impact effects can be automatic only when runtime is enabled.
- Stage changes, breakups, confession outcomes, rivalry locks, major trust loss, or irreversible growth traits should require user confirmation or a high-intensity mode.
- Spending money, deleting data, changing assets, or modifying core profile identity must never happen as a hidden relationship event.

Current product boundary:

- Calendar can safely contribute confirmed shared events because the user has already acknowledged the event.
- Gallery and other media-driven memory facts should stay optional and deferred until image sources are naturally produced and the save flow is low-friction.
- Chat friend/block/refusal social events have a first reviewed seam. Chat owns confirmed channel state, Contacts displays snapshots only, Event Runtime/World Hub reviews generated proposals, and relationship runtime should receive confirmed facts or memories only after the social event is accepted.

## 8. Module Adapter Requirements

Each adapter should submit facts, not own relationship math.

Candidate facts by module:

- Chat: meaningful conversation turn, apology, praise, conflict, promise, confession, long silence, reply streak.
- Chat social/channel events: role-initiated greeting/message request, refusal, restore, role blocks user, unblock, and direct user block/unblock actions. Generated role-side changes need review/audit before applied state changes.
- Contacts: profile binding, relationship note update, manual stage note.
- Map: shared trip, location check-in, exploration discovery, route delay, visit frequency, unlocked place.
- Shopping: gift bought, gift delivered, favorite category discovered, order returned.
- Food Delivery: shared meal, late-night delivery, comfort food, delivery delay during a planned scene.
- Wallet: transfer, repayment, shared expense, gift expense, debt-like tension signal.
- Phone: missed call, completed call, repeated ignored call, callback confirmed.
- Calendar: confirmed date, anniversary, missed event, recurring reminder.
- Gallery: shared photo, memory collection, person album, trip recap.
- Assets: home/property event, vehicle trip, special item ownership, investment pressure.

Adapter output should include:

- `sourceModule`
- `sourceId`
- `targetEntityKey`
- `factType`
- `intensity`
- `createdAt`
- compact `worldContext` metadata when available
- optional `memoryKey`
- optional `requiresConfirmation`

## 9. MVP Phases

### Phase 1: Planning And Schema

Status: DONE.

Acceptance:

- This document is linked from the docs index, PM status, event TODO, and functional-code handoff.
- The first runtime store/schema is designed before UI mutation controls are added.

### Phase 2: Relationship Runtime Store Baseline

Status: DONE on 2026-05-17.

Recommended files:

- `src/stores/relationshipRuntime.js`
- `tests/relationship-runtime-store.test.js`

Acceptance:

- Can store relationship entities, metrics, milestones, growth traits, and relationship events.
- Can summarize one role for Contacts and Chat without requiring an API call.
- Does not mutate Chat messages or module-owned records.
- Low-impact facts can apply locally; major or risky facts remain pending until explicitly applied.
- Settings backup/export, import rollback, and storage diagnostics include the relationship runtime store.

### Phase 3: Chat And Contacts Read-Only Integration

Status: DONE on 2026-05-17.

Acceptance:

- Contacts can show a read-only relationship snapshot.
- Chat prompt assembly can read the snapshot as compact context.
- No automatic stage changes yet.
- Service-account style chats are protected from meaningless neutral relationship prompt noise when no relationship facts exist.

### Phase 4: First Safe Fact Adapters

Status: DONE for the first expanded adapter batch on 2026-05-17, with Calendar confirmed-event support added on 2026-05-18.

Recommended first adapters:

- Shopping gift facts.
- Food Delivery shared-meal facts.
- Wallet/Shopping gift or expense facts beyond the first Shopping handoff.
- Phone completed or missed call facts.
- Map shared visit or check-in facts.
- Calendar confirmed shared-event facts.

Acceptance:

- Facts create relationship event candidates through the shared event engine.
- Major effects remain pending confirmation.
- Tests prove module ownership boundaries remain intact.

Landed first safe adapter batch:

- `src/lib/relationship-fact-adapters.js` is the shared adapter seam.
- `relationshipRuntimeStore.findEventBySource(sourceModule, sourceId)` prevents duplicate metric changes for the same module-owned fact.
- Shopping completed gift orders can create a low-impact `gift_purchased` relationship fact when the user records the order into Wallet.
- Food Delivery delivered orders can optionally create a low-impact `shared_meal` relationship fact when the user selects a shared-meal contact and records the order into Wallet.
- Shopping, Food Delivery, and Wallet still own their own product, order, and ledger records; relationship runtime only receives compact facts.
- Regression coverage exists in `tests/relationship-fact-adapters.test.js`, `tests/shopping-view.test.js`, and `tests/food-delivery-view.test.js`.

Landed expanded adapter batch:

- Phone can record completed-call and missed-call relationship facts when the user binds the call to an existing Chat contact.
- Map can record shared-route relationship facts when the user selects a companion and acknowledges an arrived trip.
- Wallet can record transfer or shared-expense relationship facts when the user binds a manual virtual transfer to an existing Chat contact.
- Calendar can record confirmed-event relationship facts when the user explicitly links an acknowledged event to an existing Chat contact.
- Current low-impact adapter facts attach soft-reference `relationshipGate` metadata from saved profile category/modifier classification. The metadata is audit context and still allows the fact.
- High-risk hard-gate helper behavior supports block/confirm/allow decisions through named presets, but no new high-impact romance/conflict automation is enabled by the current adapter batch.
- All new adapters reuse `src/lib/relationship-fact-adapters.js` and source-level dedupe.
- Phone, Map, Wallet, and Calendar still own their own call, trip, ledger, and schedule records; relationship runtime receives compact facts only.
- Regression coverage exists in `tests/phone-view.test.js`, `tests/wallet-view.test.js`, `tests/map-view-information-architecture.test.js`, `tests/calendar-relationship-fact-view.test.js`, and `tests/relationship-fact-adapters.test.js`.
- The first 4.2 merge tightening is also landed: a Shopping gift fact and the downstream Shopping delivery follow-up Calendar event now reuse one shared `shopping_gift` memory key when they point to the same order.
- Map-derived Calendar follow-ups now carry explicit `sourceTripId` lineage when available, letting a Calendar follow-up reuse the originating `shared_route` memory key instead of creating a second top-level memory.
- Wallet order-support facts for Shopping gifts and Food Delivery shared meals are supporting-only facts inside the upstream `shopping_gift` or `food_shared_meal` memory key; they preserve ledger traceability but do not apply their own relationship metric deltas.

### Phase 5: World Hub Review And Optional Controls

Status: PARTIAL_DONE on 2026-05-17.

Acceptance:

- World Hub can read relationship runtime status.
- World Hub can later approve or reject pending major relationship effects.
- Advanced value editing remains behind optional user-enabled World Hub entry.

Landed:

- `ControlCenterView.vue` now includes a Relationship Runtime review panel.
- The panel shows relationship entity count, event count, pending effect count, runtime enabled state, top relationship snapshots, and recent relationship facts.
- It can apply or dismiss `pending_confirmation` relationship events.
- It can show relationship classification gate audit metadata read-only on relationship facts.
- It still does not offer freeform affinity, funds, unlock editing, or forced hidden mutations.

Remaining:

- Add filters and details for pending, applied, and dismissed relationship events if the list becomes hard to review.
- Keep direct affinity, funds, and unlock editing behind a later explicit optional World Hub control design.

## 10. Next Recommended Engineering Slice

Next best slice:

- Tighten text and event-first relationship-memory dedupe, merge, and recall rules while polishing Calendar as the current safe date-memory source.

Why:

- The adapter seam is proven by Shopping gift, Food Delivery shared-meal, Phone call, Map shared-route, Wallet transfer or expense, and Calendar confirmed-event facts.
- Contacts and Chat already read compact relationship snapshots, so low-impact continuity can deepen without extra API calls.
- Calendar already provides a safe shared-event source, which is enough to improve relationship continuity without taking on high-friction media workflows.
- The next real product risk is fragmented memory: one life event may appear through multiple modules, and runtime should keep that readable instead of surfacing several nearly identical memories.
- World Hub review now exists for pending effects, so the next useful work is making low-impact memories cleaner and easier to recall before broadening media-driven fact intake.

Alternative same-size slice:

- Add Assets relationship facts using property, vehicle, investment, and special-item memories.

Avoid next:

- Do not add high-impact automatic romance or conflict events before the store, logs, and user confirmation model exist.
- Do not put relationship controls directly into Chat as the first implementation.
- Do not expand role-initiated friend/block/refusal events outside the landed Chat social-event review seam.
- Do not make World Hub visible by default for all users.
- Do not make Gallery or photo-memory intake part of the main relationship loop until the product can produce or capture image context with near-zero user effort.

## 11. Landed Runtime Interface

Current reusable interface:

- `recordRelationshipFact(input)`: module adapters submit facts with target, source module or id, fact type, summary, metric deltas, milestone, growth traits, world context, optional `memoryKey`, and optional confirmation requirement.
- `relationshipGate`: `recordRelationshipFact(input)` persists normalized gate metadata and respects `block` by dismissing without applying effects, and `confirm` by keeping the fact pending until review.
- `buildRelationshipFactGateFromPreset(input)`: future high-risk event packs can build hard-gate metadata from a preset id while still reading saved role-profile category/modifier fields only.
- `submitChatSocialEventProposal(input)`: event runtime can store generated role-side social proposals, auto-apply low-risk greetings with audit, and keep high-risk communication changes pending for World Hub review before Chat applies them.
- `findEventBySource(sourceModule, sourceId)`: module adapters can dedupe imported facts before applying relationship effects.
- `listMemoryAggregatesForTarget(target)`: runtime can group multiple applied facts under one shared memory summary when they point to the same `memoryKey`.
- UI consumers should filter from the full sorted aggregate list first and only then apply any visible-item cap; otherwise source-specific review flows can accidentally hide valid memory groups.
- Runtime recent-event summaries should sort by event timestamp, not raw insertion order, so delayed imports or backfilled facts cannot replace the true latest relationship event in Chat or Contacts summaries.
- Archived memories should behave like background history by default. They may remain inspectable and auditable, but callers must opt in before archived-only memories or their supporting events become headline summary content again.
- `summarizeEntityForTarget(target)`: Contacts, World Hub, and future UI panels read a safe snapshot, including compact memory summaries for the target.
- The runtime snapshot contract now includes `primaryMemory`, `totalMemoryCount`, `visibleMemoryCount`, `archivedMemoryCount`, `hasArchivedOnlyMemories`, `sourceRefs`, and `sourceModuleCounts`; UI consumers should prefer these canonical fields over rebuilding headline-memory or source-summary logic locally.
- `memoryLimit` only caps the returned `memorySummaries` list. `totalMemoryCount`, `visibleMemoryCount`, and `archivedMemoryCount` are computed from the full target memory set, including targets with more than 50 memory groups or callers that request `memoryLimit: 0`.
- Memory summaries now include primary-led `recallSummary` text for prompt/source recall and UI-facing review summaries for Contacts and World Hub. Downstream supporting facts enrich one life event without replacing the original memory headline or leaking source-audit labels into default user copy.
- Consumer contract: use `recallSummary` only for Chat prompt context or explicit audit/review surfaces; ordinary Contacts and World Hub headline copy should use `reviewSummary` or a localized UI formatter, while Calendar relationship review may show source-audit labels because it is a focused confirmation surface.
- `buildPromptContextForTarget(target)`: Chat reads compact context for role conversations without triggering an API call.
- `applyPendingRelationshipEvent(eventId)` and `dismissRelationshipEvent(eventId)`: future World Hub controls can approve or reject risky effects.
- `createBackupSnapshot()` and `restoreFromBackup(snapshot)`: Settings backup and rollback can preserve relationship runtime state.

Implementation guardrail:

- Module adapters should call the store with facts only. They should not directly edit metrics, stages, milestones, or growth traits.
- One life event may have several supporting facts from Calendar, Chat, Map, or other modules; these should enrich one memory summary instead of creating several equally weighted long-term memories.

## 12. First Adapter Batch Product Behavior

Landed behavior:

- Shopping gift memory: when a completed Shopping order has a gift recipient and the user records it into Wallet, the system also records a small relationship fact for that recipient.
- Food Delivery shared meal: when a delivered Food Delivery order is ready to record into Wallet, the user may choose a contact as the shared-meal target. Recording the Wallet expense also records a small relationship fact for that selected contact.
- Calendar confirmed-event memory: when the user explicitly binds an acknowledged Calendar event to an existing Chat contact, the system records a low-impact relationship fact for that contact.
- These flows are explicit user actions. They do not randomly mutate relationships.
- These flows are low-impact and locally applied when relationship runtime is enabled.
- Duplicate clicks or re-imports do not stack relationship values because adapters dedupe by source module and source id.
- Cross-module memory cleanup is a separate layer: multiple safe facts may still point to one shared `memoryKey` so the user sees one cleaner memory summary instead of repeated fragments.
- Shopping-specific 4.2 tightening: when a gift order already created a `shopping_gift` memory, the later Calendar delivery follow-up for that same order becomes a supporting fact inside the same memory group instead of a second top-level Calendar memory.
- Map-specific 4.2 tightening: when a shared route has an explicit trip id and a later Map-derived Calendar follow-up preserves that `sourceTripId`, the Calendar fact becomes supporting context inside the same `shared_route` memory group.
- Wallet-support 4.2 tightening: when Wallet only records downstream support for a Shopping gift or Food Delivery shared meal, it must stay a supporting fact inside the upstream order memory group and must not stack relationship metrics.
- Recall 4.2 tightening: Chat should prefer runtime `recallSummary` for source-aware prompt context, while Contacts and World Hub should prefer UI-facing review summaries that keep the primary life-event summary first and only expose the related-record count by default.
- Calendar-review 4.2 tightening: confirmed Calendar event cards should show whether their relationship fact is primary or supporting, what explicit lineage attached it to a memory, and whether it changed metrics or only enriched the source audit.
- Review-lifecycle visibility tightening: `Pinned / Active / Archived` plus review note should be visible anywhere the product surfaces a primary shared-memory summary, not only inside Contacts detail.
- Summary-consumer tightening: when only archived memories remain, UI surfaces should show archive/history hinting plus management state, but should not keep presenting that archived memory as the default-current shared-memory headline.

Product meaning:

- The phone can now remember cross-module life moments, not only chat text.
- A gift bought in Shopping, a meal shared through Food Delivery, or a confirmed shared Calendar event can later appear in Contacts relationship snapshots and Chat prompt context.
- This is not a visible dating-game control layer yet; it is a quiet continuity layer that makes role relationships feel more lived-in.
