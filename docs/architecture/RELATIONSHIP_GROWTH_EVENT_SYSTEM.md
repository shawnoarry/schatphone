# Relationship Growth Event System / 好感度、关系进展与角色成长事件系统

Updated: 2026-08-18

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
- Accepted facts and the provenance needed to audit persistent relationship truth cannot be silently or irreversibly deleted for capacity management. Older evidence may move into reversible cold archives while remaining reviewable and restorable.
- Relationship Runtime persists validated structured appraisal/effect data, source references, and minimum AI provenance, not full prompts, raw provider responses, or copied canonical bodies from social/forum/offline/narrative modules. AI transport material remains temporary; the content owner persists any formally committed artifact.
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
- Event Runtime owns event eligibility, lifecycle, provenance, and owner requests. It may expose a bounded role-scoped memory candidate after an owner-confirmed result, but it does not write Chat history, role memory, or relationship truth. Chat may separately expose a disabled-by-default AI disclosure candidate only under an explicit review policy; that candidate must be fixed to the current role and an exact user-authored message, and remains temporary until Relationship Runtime decides what (if anything) to retain.
- Relationship Runtime is the decision point for durable role memory. A candidate can be rejected, merged into an existing `memoryKey`, retained as a supporting fact, or promoted to a primary memory according to relationship relevance rather than event severity.
- Public world evolution is a separate world-scoped knowledge projection. Same-world roles may retrieve relevant facts, claims, or publications when context calls for them; public knowledge is not automatically a personal memory and is not injected into every Chat prompt.
- World Hub reads, reviews, and later adjusts runtime state, but should not become the main data entry surface for role/world records.

Do not:

- Put relationship mutation logic directly in `ChatView.vue`, `MapView.vue`, or other view files.
- Let AI directly mutate affinity/stage values without a local rule or user confirmation.
- Let module adapters bypass the shared event engine for random or condition-driven relationship changes.
- Let every module create its own standalone long-term memory for the same life event when a shared memory summary would be enough.
- Treat a hot-list cap as permission to erase already-applied relationship evidence. Hot/runtime limits and durable audit retention are separate concerns. `CMG-06` implements this for Relationship Runtime: the v2 carrier keeps the complete event/entity arrays, while Contacts and other list callers request bounded `limit / offset` projections. A v1 payload can be read and rewritten through the explicit compatibility migration, but rows already discarded by an older 500-event or 300-entity writer cannot be reconstructed.
- Let Chat or Contacts directly apply generated friend/block/refusal social events without the event-runtime review seam.
- Treat a formal Event Instance as an automatic role memory, or treat a public world-knowledge entry as a copy that must be stored in every role profile.
- Use event severity as a substitute for relationship-memory importance, or allow raw Event Runtime logs to bypass the Relationship Runtime recall seam.

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
- `memoryCandidate`: a bounded source-linked suggestion that a confirmed module fact may matter to one role's future continuity; it is not durable memory until Relationship Runtime accepts or merges it.
- `aiDisclosureCandidate`: a bounded, review-only suggestion emitted from a Chat model response. It carries only a model summary/reason plus trusted role/source binding; it cannot carry a `memoryKey`, relationship deltas, target override, or persistence decision, and it is not durable memory.
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
- A system-verified role-payee transfer uses the same Wallet adapter only after Wallet confirms and persists the expense. The Chat account request/card is not a relationship fact, and the target role receives no separate spendable balance.
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
- Do not make Chat a second relationship runtime or let a message action mutate relationship metrics directly. A narrow explicit disclosure action may call the shared Owner Adapter seam and remain supporting-only.
- Do not expand role-initiated friend/block/refusal events outside the landed Chat social-event review seam.
- Do not make World Hub visible by default for all users.
- Do not make Gallery or photo-memory intake part of the main relationship loop until the product can produce or capture image context with near-zero user effort.

## 11. Landed Runtime Interface

Current reusable interface:

- `recordRelationshipFact(input)`: module adapters submit facts with target, source module or id, fact type, summary, metric deltas, milestone, growth traits, world context, optional `memoryKey`, and optional confirmation requirement.
- Existing proof: Calendar's confirmed-event Adapter already uses this seam correctly. It accepts only a confirmed event plus an explicit role/contact target, builds a stable source reference, reuses a lineage-aware `memoryKey` for phone/map/shopping follow-ups, and lets Relationship Runtime decide primary versus supporting memory. This is an Owner Adapter example, not authorization to route all Event Runtime records into role memory.
- Bounded Chat proof: after a `role_greeting_request` is actually applied to Chat, the Chat/World Hub owner callback may call `recordChatSocialEventRelationshipFact()` with the applied Proposal ID and role target. The adapter writes one supporting-only fact under `chat_social__role_greeting`, with no metric delta; blocked, dismissed, pending, or high-risk social proposals do not enter this path.
- Bounded Chat disclosure proof: on an explicit user action over one user-authored message in one role thread, Chat may call `recordChatDisclosureRelationshipFact()` with the exact conversation/message source and role target. The adapter writes one supporting-only fact with no metric delta or stage change. New facts use conservative subject-aware keys: recognized hospital and birthday details remain separate, a later recognized same-subject detail updates the same memory while preserving every exact source, and unknown subjects use separate stable keys rather than a guessed merge. Existing `chat_disclosure__user_shared` records remain readable and are not migrated or deleted. Saved messages, assistant output, group/service threads, recalled messages, and ordinary message history do not enter this path.
- Bounded Chat AI disclosure seam: when an explicit review policy is supplied, Chat may normalize a model `disclosureCandidates` array into temporary `aiDisclosureCandidate` objects. The parser supplies the role target, conversation, exact current user-message source, pending-review status, and review-only effect policy; it ignores model-selected roles, profile ids, memory keys, metric deltas, and persistence decisions. No candidate is written to Relationship Runtime until a future review surface explicitly chooses an existing Owner Adapter path.
- First candidate-memory implementation rule: do not add a parallel `submitMemoryCandidate()` Store/API. An owner Adapter may normalize an owner-confirmed result into the existing `recordRelationshipFact(input)` seam with one explicit role target, stable `sourceModule`/`sourceId`, optional `memoryKey`, and an explicit supporting-only or confirmation policy. The Runtime then decides whether the fact becomes a primary memory, a supporting fact, a pending item, or no durable effect.
- Event Runtime must not call `recordRelationshipFact` as a shortcut for its own logs. The call belongs at the owner/Relationship Adapter after the source owner has confirmed the result; Event Runtime may carry the source reference and request the Adapter action.
- Until a public-world knowledge owner exists, `visibility` remains a routing/documentation concern rather than a persisted universal-awareness field. A role-targeted fact is delivered only to the explicit target; public facts use the future world-knowledge projection and do not enter this relationship-memory path automatically.
- `relationshipGate`: `recordRelationshipFact(input)` persists normalized gate metadata and respects `block` by dismissing without applying effects, and `confirm` by keeping the fact pending until review.
- `buildRelationshipFactGateFromPreset(input)`: future high-risk event packs can build hard-gate metadata from a preset id while still reading saved role-profile category/modifier fields only.
- `submitChatSocialEventProposal(input)`: event runtime can store generated role-side social proposals, auto-apply low-risk greetings with audit, and keep high-risk communication changes pending for World Hub review before Chat applies them.
- `findEventBySource(sourceModule, sourceId)`: module adapters can dedupe imported facts before applying relationship effects.
- `listMemoryAggregatesForTarget(target)`: runtime can group multiple applied facts under one shared memory summary when they point to the same `memoryKey`.
- `listMemoryGroupPageForTarget(target, { limit, offset, sourceModule, sortMode })`: Contacts reads one source-filtered page with `totalCount`, `pageCount`, and next/previous flags. The page is a read projection; it never changes the authoritative events or memory reviews.
- `listMemorySourceModulesForTarget(target)`: supplies the source-filter options without asking Contacts to load every memory group into its own list model.
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
- Relationship Runtime storage version 2 removes the old global 500-event and 300-entity writer/restore slices. Its transactional write still restores the pre-mutation snapshot on a failed save, and complete backup/restore carries the full retained arrays. Prompt recall remains bounded by its result-item and character budgets even when the source carrier is larger.

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
