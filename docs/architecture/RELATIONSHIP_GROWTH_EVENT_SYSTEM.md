# Relationship Growth Event System / 好感度、关系进展与角色成长事件系统

Updated: 2026-05-17

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
- `relationshipRuntimeStore` owns affinity values, relationship stages, growth traits, milestones, pending confirmations, and cross-module relationship event history.
- Chat owns conversation messages, role replies, service-account display, and prompt assembly.
- Contacts and Chat Directory own role identity, profile binding, avatar/context metadata, and manually authored relationship notes.
- WorldBook owns worldview, lore, knowledge points, and world-specific rule inputs.
- Map, Shopping, Food Delivery, Wallet, Phone, Calendar, Gallery, and Assets may submit structured facts through adapters.
- World Hub reads, reviews, and later adjusts runtime state, but should not become the main data entry surface for role/world records.

Do not:

- Put relationship mutation logic directly in `ChatView.vue`, `MapView.vue`, or other view files.
- Let AI directly mutate affinity/stage values without a local rule or user confirmation.
- Let module adapters bypass the shared event engine for random or condition-driven relationship changes.

## 4. Core Data Concepts

Recommended concepts for the first implementation:

- `entityKey`: stable target for a role, contact, group, or future NPC.
- `affinity`: broad positive/negative relationship warmth.
- `trust`: reliability and safety felt by the character.
- `intimacy`: closeness, familiarity, emotional openness.
- `tension`: unresolved conflict, pressure, jealousy, suspicion, or distance.
- `dependency`: how much one side relies on the other.
- `relationshipStage`: human-readable stage such as stranger, acquaintance, friend, close friend, ambiguous, lover, rival, distant, conflict.
- `growthTraits`: persistent character-growth tags such as confident, guarded, independent, devoted, ambitious, traumatized, healing.
- `milestones`: important confirmed moments, such as first call, first gift, confession, argument, reunion, shared trip, rescue, betrayal, promise.
- `factEvents`: source facts submitted by other modules before relationship rules interpret them.
- `relationshipEvents`: interpreted effects such as affinity increase, trust decrease, stage candidate, milestone candidate, growth trait update.

Use numeric values for computation, but show user-facing summaries as plain language.

## 5. Event Flow

Standard flow:

1. A module records a normal domain action.
2. The module adapter submits a relationship-relevant fact to the shared event system.
3. The event engine checks settings, module enablement, world context, conditions, cooldowns, and caps.
4. A relationship adapter interprets the fact into a small proposed effect.
5. Safe low-impact effects may be written automatically if the user enabled the runtime.
6. Major effects become pending confirmations or World Hub review items.
7. Chat prompt assembly and Contacts display read the resulting relationship snapshot.

Example:

- Shopping owns an order and Wallet owns a downstream expense.
- A gift purchase for a role submits a fact: `gift_purchased`.
- The relationship adapter checks whether the target role exists, whether gifting events are enabled, and whether the world pack changes gift meaning.
- It may create a milestone candidate: `received_first_gift`.
- Chat can later mention the gift because the relationship snapshot includes the milestone.

## 6. WorldBook And World-Aware Packs

Relationship events must be world-aware.

Recommended model:

- WorldBook remains distributed and immersive: users can still add world/person/role material from the most natural module.
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
- Routine runtime triggering should use local rules, local packs, and local facts.
- API should not be required for every affinity update.
- Logs should store compact `worldContextId`, `eventPackId`, and `variantId`, not full raw WorldBook text.

## 7. User Control And Safety

Required controls:

- Global enable/disable for relationship-growth runtime.
- Per-module enable flags for Chat, Map, Shopping, Food Delivery, Wallet, Phone, Calendar, Gallery, Assets.
- Intensity level through Surprise Mode or a future World Hub control.
- Reset/export/backup compatibility.
- Read-only explanation logs before powerful mutation controls are added.

Confirmation policy:

- Low-impact effects can be automatic only when runtime is enabled.
- Stage changes, breakups, confession outcomes, rivalry locks, major trust loss, or irreversible growth traits should require user confirmation or a high-intensity mode.
- Spending money, deleting data, changing assets, or modifying core profile identity must never happen as a hidden relationship event.

## 8. Module Adapter Requirements

Each adapter should submit facts, not own relationship math.

Candidate facts by module:

- Chat: meaningful conversation turn, apology, praise, conflict, promise, confession, long silence, reply streak.
- Contacts: profile binding, relationship note update, manual stage note.
- Map: shared trip, location check-in, exploration discovery, route delay, visit frequency, unlocked place.
- Shopping: gift bought, gift delivered, favorite category discovered, order returned.
- Food Delivery: shared meal, late-night delivery, comfort food, delivery delay during a planned scene.
- Wallet: transfer, repayment, shared expense, gift expense, debt-like tension signal.
- Phone: missed call, completed call, repeated ignored call, callback confirmed.
- Calendar: date scheduled, anniversary, missed event, recurring reminder.
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

Status: DONE for the first expanded adapter batch on 2026-05-17.

Recommended first adapters:

- Shopping gift facts.
- Food Delivery shared-meal facts.
- Wallet/Shopping gift or expense facts beyond the first Shopping handoff.
- Phone completed/missed call facts.
- Map shared visit/check-in facts.

Acceptance:

- Facts create relationship event candidates through the shared event engine.
- Major effects remain pending confirmation.
- Tests prove module ownership boundaries remain intact.

Landed first safe adapter batch:

- `src/lib/relationship-fact-adapters.js` is the shared adapter seam.
- `relationshipRuntimeStore.findEventBySource(sourceModule, sourceId)` prevents duplicate metric changes for the same module-owned fact.
- Shopping completed gift orders can create a low-impact `gift_purchased` relationship fact when the user records the order into Wallet.
- Food Delivery delivered orders can optionally create a low-impact `shared_meal` relationship fact when the user selects a shared-meal contact and records the order into Wallet.
- Shopping, Food Delivery, and Wallet still own their own product/order/ledger records; relationship runtime only receives compact facts.
- Regression coverage exists in `tests/relationship-fact-adapters.test.js`, `tests/shopping-view.test.js`, and `tests/food-delivery-view.test.js`.

Landed expanded adapter batch:

- Phone can record completed-call and missed-call relationship facts when the user binds the call to an existing Chat contact.
- Map can record shared-route relationship facts when the user selects a companion and acknowledges an arrived trip.
- Wallet can record transfer/shared-expense relationship facts when the user binds a manual virtual transfer to an existing Chat contact.
- All three new adapters reuse `src/lib/relationship-fact-adapters.js` and source-level dedupe.
- Phone, Map, and Wallet still own their own call/trip/ledger records; relationship runtime receives compact facts only.
- Regression coverage exists in `tests/phone-view.test.js`, `tests/wallet-view.test.js`, `tests/map-view-information-architecture.test.js`, and `tests/relationship-fact-adapters.test.js`.

### Phase 5: World Hub Review And Optional Controls

Status: PARTIAL_DONE on 2026-05-17.

Acceptance:

- World Hub can read relationship runtime status.
- World Hub can later approve/reject pending major relationship effects.
- Advanced value editing remains behind optional user-enabled World Hub entry.

Landed:

- `ControlCenterView.vue` now includes a Relationship Runtime review panel.
- The panel shows relationship entity count, event count, pending effect count, runtime enabled state, top relationship snapshots, and recent relationship facts.
- It can apply or dismiss `pending_confirmation` relationship events.
- It still does not offer freeform affinity/funds/unlock editing or forced hidden mutations.

Remaining:

- Add filters/details for pending/applied/dismissed relationship events if the list becomes hard to review.
- Keep direct affinity/funds/unlock editing behind a later explicit optional World Hub control design.

## 10. Next Recommended Engineering Slice

Next best slice:

- Add the next safe relationship fact adapters from Calendar and Gallery.

Why:

- The adapter seam is proven by Shopping gift, Food Delivery shared-meal, Phone call, Map shared-route, and Wallet transfer/expense facts.
- Contacts and Chat already read compact relationship snapshots, so new safe facts can affect continuity without extra API calls.
- Calendar and Gallery have natural relationship signals: scheduled dates, anniversaries, missed plans, shared photos, people albums, and trip memories.
- World Hub review now exists for pending effects, so the next useful work is broadening safe fact intake while keeping high-impact changes reviewable.

Alternative same-size slice:

- Add Assets relationship facts using property, vehicle, investment, and special-item memories.

Avoid next:

- Do not add high-impact automatic romance/conflict events before the store, logs, and user confirmation model exist.
- Do not put relationship controls directly into Chat as the first implementation.
- Do not make World Hub visible by default for all users.

## 11. Landed Runtime Interface

Current reusable interface:

- `recordRelationshipFact(input)`: module adapters submit facts with target, source module/id, fact type, summary, metric deltas, milestone, growth traits, world context, and optional confirmation requirement.
- `findEventBySource(sourceModule, sourceId)`: module adapters can dedupe imported facts before applying relationship effects.
- `summarizeEntityForTarget(target)`: Contacts, World Hub, and future UI panels read a safe snapshot.
- `buildPromptContextForTarget(target)`: Chat reads compact context for role conversations without triggering an API call.
- `applyPendingRelationshipEvent(eventId)` and `dismissRelationshipEvent(eventId)`: future World Hub controls can approve or reject risky effects.
- `createBackupSnapshot()` and `restoreFromBackup(snapshot)`: Settings backup and rollback can preserve relationship runtime state.

Implementation guardrail:

- Module adapters should call the store with facts only. They should not directly edit metrics, stages, milestones, or growth traits.

## 12. First Adapter Batch Product Behavior

Landed behavior:

- Shopping gift memory: when a completed Shopping order has a gift recipient and the user records it into Wallet, the system also records a small relationship fact for that recipient.
- Food Delivery shared meal: when a delivered Food Delivery order is ready to record into Wallet, the user may choose a contact as the shared-meal target. Recording the Wallet expense also records a small relationship fact for that selected contact.
- Both flows are explicit user actions. They do not randomly mutate relationships.
- Both flows are low-impact and locally applied when relationship runtime is enabled.
- Duplicate clicks or re-imports do not stack relationship values because adapters dedupe by source module and source id.

Product meaning:

- The phone can now remember cross-module life moments, not only chat text.
- A gift bought in Shopping or a meal shared through Food Delivery can later appear in Contacts relationship snapshots and Chat prompt context.
- This is not a visible dating-game control layer yet; it is a quiet continuity layer that makes role relationships feel more lived-in.
