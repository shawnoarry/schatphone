# Simulation Event Engine

Updated: 2026-08-18

This document records the architecture direction for SchatPhone's immersive event foundation:

- random surprises
- condition-triggered events
- scheduled simulation
- player-context-conditioned incidents and longer-running world arcs
- owner-native forum/social/news information propagation
- module-owned side effects through adapters
- owner-native cross-module causal chains
- optional host-embedded event cards with location anchors where separately accepted

Persistence boundary:

- ephemeral eligibility checks, rebuildable projections, and explicitly classified operational logs may rotate;
- accepted relationship facts and provenance for already-applied persistent truth cannot be silently deleted;
- durable evidence may move out of the hot runtime set only through reversible cold archival with World Hub review/restore semantics.
- full AI prompts, raw responses, uncommitted candidates, and transport payloads are not event truth; persist normalized proposals/outcomes and minimum provenance, with full capture limited to explicit temporary diagnostics;
- when an approved event formally publishes a social/forum record, offline scene, long-form artifact, performance/episode record, or character-state history, the target owner persists the canonical committed content and Event Runtime keeps references/provenance rather than copying the body.
- owner-safe lifecycle inspection may project a bounded reference such as `{ owner, kind, referenceId, mapPackId, active }`; this projection cannot include event text, proposal copy, participants, source snapshots, or outcome bodies. Active Event Instances and pending Map Journey proposals protect current Map use, while terminal records remain historical references.

Continuity boundary:

- Role continuity is the primary product consumer of cross-module context. Event Runtime does not write Chat history, role memory, or relationship truth.
- A confirmed event may emit a bounded role-scoped memory candidate through an existing Owner Adapter. Relationship Runtime decides whether the candidate becomes durable role memory, and Chat consumes only the resulting projection.
- Local events remain participant-scoped by default. Public world evolution may produce a separate world-scoped knowledge projection that same-world roles can retrieve when relevant; it is not copied into every role memory or injected into every prompt.

Player-context, dynamic-world, and information-propagation direction is defined in `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md`. The bounded Player Context V1 foundation is implemented without adding a Store, route, Event Surface host, Community/Media Module, or a new EVE stage; dynamic world evolution and information propagation are documented for a later implementation stage.

## 1. Goal

Make SchatPhone feel alive without turning every module into a manually operated admin panel.

The event foundation should support:

- manual trigger
- condition trigger
- random trigger
- scheduled trigger
- AI-assisted trigger later, but not as the default state mutator
- world-aware variants selected through `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`

## 2. Non-Goals

This architecture is not:

- a full game engine
- a Canvas/WebGL rendering engine
- a replacement for Pinia domain stores
- a hidden backend that owns all module state
- a reason to expose a normal Home app named Event, Simulation, Files, or Backend
- permission to mutate important user data without explanation or control

The event foundation is an internal coordination layer. The primary product unit is a causal chain across owner Modules, not an Event Card. A Module may participate by producing a checkpoint, applying canonical truth through its Adapter, publishing a native message/status/call/post/journey record, or supplying a later condition without ever registering an Event Surface.

User-facing immersion should still appear through existing modules such as:

- Chat
- Food Delivery
- Shopping
- Map
- Calendar
- Phone
- Photos
- Assets
- Wallet
- notifications

## 3. Core Concepts

### Event Template

A declarative record describing:

- what can happen
- when it is eligible
- how often it may happen
- which adapter should run
- where the result may be seen

### Trigger Source

Possible sources:

- `manual`
- `condition`
- `random`
- `scheduled`
- `ai_assisted`
- `system`

### Player Context Snapshot

An identity-conditioned event reads a bounded, structured, revision-aware snapshot rather than raw Self Profile prose or a copied role record. Contacts Self Profile owns stable world-facing identity such as confirmed occupation, affiliation, public identity, and visibility-scoped profile values. Dynamic values stay with their natural owners or a future minimal Player State owner only when no existing owner is honest.

`src/lib/simulation/player-context-projection.js` now implements the first pure V1 seam. It requires a monotonic Contacts profile revision, exact world/template/version evidence, `public` or `world_specific` manual values from the template-declared `occupation`, `affiliation`, and `public_identity` allowlist, and revision-matched body-free owner references. Its local K-pop evaluator proves only manager and public-idol family eligibility. The snapshot cannot create an incident, prove a user action, or mutate state; missing, stale, mismatched-world, conflicting, or unsupported references fail closed. The broader conceptual Interface and remaining gates are defined in `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md`.

### World Fact, Claim, And Publication

World information propagation keeps three meanings separate:

- a `World Fact` is canonical truth confirmed by its owner;
- a `Claim` records that an account or person asserted something, with a truth relation such as confirmed, unverified, contradicted, or unknown;
- a `Post` or news record is committed user-visible content owned by a future Community/Media Module.

The existence of a claim or post may be a fact, but its content is not automatically true. Event Runtime may request publication and keep references/provenance; it does not persist the publication body or turn the post into canonical world truth.

### Map Journey Checkpoint Source

Map journey/exploration events use a module-owned checkpoint as their trigger boundary. Map submits a bounded canonical snapshot only when the Map Journey Runtime reaches an explicit checkpoint. Event Runtime evaluates templates, deterministic/random gates, cooldowns, caps, permissions, and review policy, then returns a requested outcome through the Map adapter.

The checkpoint source is not a timer tick. Event Runtime cannot mutate the journey, transport snapshot, place, pin, arrival, or cancellation record directly, and a journey must remain able to complete without an event. MJE-3 retains the first narrow adapter for completed `en_route` and `near_arrival` checkpoints, but production Map mounting keeps evaluation disabled after product review rejected its generic route-obstruction presentation. Deterministic compatibility tests may explicitly enable it; a pending proposal still never pauses Map Journey, Map validates the reviewed result, and only the legacy bounded 120-second delay changes ETA. The staged source contract is defined in `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`.

### Agenda Journey And Activity Session Checkpoint Source

Agenda Journey and Activity Session events use explicit execution checkpoints such as step start, a duration milestone, near completion, completion, or deadline reconciliation. The source owner submits only a bounded snapshot with stable Calendar, Agenda Journey step, Activity Session, and optional Map evidence references. Event Runtime evaluates eligibility, deterministic/random gates, cooldowns, caps, permissions, interaction policy, and provenance; Agenda Journey and every downstream domain owner validate the requested result before changing their own truth.

An Activity Session's canonical progress comes from absolute timestamps rather than accumulated timer ticks. Event Runtime must not evaluate on each visual countdown tick, and elapsed time or Map arrival alone cannot prove completion of a rehearsal, broadcast, performance, class, meeting, or other non-travel activity. CJA-5 implements only `activity_session.focus_reset.v1` at the processed midpoint checkpoint: Simulation owns durable `no_event | pending | resolved | failed` records and gate/provenance truth, while Activity Session validates an exact automatic/user choice and may apply only a 0/2-minute timer adjustment. A missing, disabled, stale, terminal, duplicate, or unresolved optional event never blocks the base activity.

### Event Engine

The shared module that:

- evaluates templates
- checks conditions
- checks cooldowns and caps
- applies deterministic random selection
- calls adapters
- writes event logs

It should not directly own business state.

### Module Adapter

A seam between the engine and a domain store.

Examples:

- Food Delivery adapter -> `foodDeliveryStore.addOrderEvent(...)`
- Shopping adapter -> promotion or order-event action
- Phone adapter -> incoming-call or missed-call action
- Calendar adapter -> reminder or schedule-candidate action

### Event Log

A persistent execution record useful for:

- user explanation
- debugging
- backup/restore
- later AI assistant handoff

### Event Surface Projection

A bounded read model for presenting one runtime proposal or applied event inside an owning app. It may contain:

- stable event/proposal ID, template ID, source module, and source-record reference;
- display title, summary, status, risk/review state, and available action descriptors;
- compact world context and optional participant references;
- an optional presentation anchor such as a Map place ID or provider-neutral coordinate snapshot;
- an explicit expansion target: host detail, World Hub review, or the shared Mini Scene Interface.

The projection is not a second event store and is never an authorization token. It should be derived from Event Runtime proposal/log truth plus bounded source-owner facts. Every requested outcome still returns through the registered Module Adapter and is validated by the owning module.

Production hosts are explicitly allowlisted and must validate that any `host_detail` expansion points back to the host currently consuming the projection. The current production allowlist contains only `map`. EVE-4A briefly registered Food Delivery as a technical spike, but product acceptance was withdrawn because the generic brief duplicated native order truth and its manual update action manufactured the exception it claimed to query. Exact Food Delivery runtime lineage remains at the owner Adapter seam without a host projection.

### Location-Aware Event Card

A Map event card is one host rendering of an Event Surface Projection. The current Map UI remains the host while it grows toward a larger world map:

- a pin or coordinate-anchored card may show a concise event preview;
- the card exposes an explicit `Expand event` command rather than opening automatically;
- expanding may open a Map-owned detail surface or a registered Mini Scene presentation;
- dismiss/review state may be reflected on the card, but applying an effect still crosses the owner Adapter;
- the coordinate is placement context, not permission to create a canonical place, rewrite a pin, move the role, or change a journey.

Multiple events near one coordinate must cluster or stack behind one stable control instead of producing overlapping cards. Cards without a valid coordinate remain available through their owning host and World Hub review; they do not invent a fallback location.

### Activation Scope, Presence, And Discoverability

Location meaning belongs to the event template/source contract before it becomes host presentation. A future location-aware family may declare an activation scope such as:

- `remote`: an explicitly authored remote interaction, for example a call, reservation, or message;
- `nearby`: an area or exterior interaction inside a bounded approach radius;
- `onsite`: presence at the place boundary is required;
- `interior`: an explicit Map-owned place-entry session is required;
- `journey_checkpoint`: eligibility belongs to a named Map Journey checkpoint rather than place entry;
- `activity_checkpoint`: eligibility belongs to a named Agenda Journey or Activity Session checkpoint after that source exists.

Distance is an eligibility fact, not an event-type converter. An `interior` event does not become `remote` when the role is far away. The source owner supplies bounded current facts such as stable place/map-pack identity, distance relation, journey/arrival reference, position provenance (`manual` or `journey_arrival`), and place-session state. Event Runtime evaluates those facts and never writes them.

Discoverability is separate from activation. A template may be `hidden_until_eligible`, `teaser_when_locked`, or `always_visible` only when its product contract approves that disclosure. A locked teaser must explain the unmet condition and expose no outcome action. Ineligible hidden events produce no host card. An eligible event may produce no card when user permission, intensity, cooldown, cap, or presentation policy suppresses that surface.

These are template and eligibility semantics, not implicit additions to the landed EVE-1 projection schema. EVE-1 `availability` continues to describe whether the projected source/anchor/action is valid. A later implementation must version any new projected activation or lock-reason fields instead of overloading stale-source behavior.

### Generated Chat Social Proposal

A runtime proposal that asks whether a role-initiated communication-state change should happen in Chat.

V1 covers role greetings, refusal, block, restore, and unblock. Low-risk greetings may become audited pending message requests. Refusal/block/restore/unblock proposals stay pending until World Hub approves or dismisses them.

Concrete V1 proposal sources:

- Chat AI response output through normalized optional `socialEvents`;
- foreground/session event tick runtime greetings for stranger or declined role contacts.

### Surprise Mode

A user-level control for random event intensity. It is visible in `设置 / Settings -> AI 自动响应 / AI Automation`.

Minimum reserved levels:

- Off
- Low
- Balanced
- High

Current product meaning:

- Off disables random/session event checks, while manual user actions are not affected;
- Low is the conservative default for low-frequency, low-risk life events;
- Balanced and High are stronger activity levels, but they still do not bypass cooldowns, daily caps, module event permissions, or World Hub review.

Three controls remain independent:

1. module event permission decides whether a source lane may submit optional runtime events;
2. Surprise Mode decides random/ambient event frequency;
3. presentation mode decides whether an eligible event is silent, text, or interactive.

Turning optional activity events off must not delete or disable a deterministic Calendar commitment, Agenda Journey step, Map Journey, Activity Session, required deadline reconciliation, or safety notice. A future activity may also override its global default for one session, for example `quiet`, `important_only`, `balanced`, or `lively`, while still respecting module permission, cooldowns, caps, and high-impact review.

### Module Event Permissions

Module event permissions decide which app lanes may receive runtime events. They are separate from AI auto-reply settings.

Current visible pilot lanes in Settings:

- `Chat 角色主动联系 / Chat role contact events`;
- `外卖安全事件 / Food Delivery safety events`;
- `地图行程途中事件 / Map journey events`.

Adding a new event-enabled module must update both the runtime registry and the Settings copy so users are not surprised by an invisible event lane.

### Interaction And Automatic Resolution

Event eligibility and event presentation are separate decisions. The shared Mini Scene mode controls how an eligible event is presented:

- `off` suppresses the popup but does not disable eligible deterministic or random simulation; only an owner-approved low-impact outcome may resolve automatically;
- `text` presents an accessible text event and bounded choices where allowed;
- `interactive_html` uses the reviewed sandboxed Presenter with mandatory text fallback;
- `unconfigured` behaves as `off` until the user chooses a mode.

High-impact money, asset, relationship, identity, communication, or schedule changes keep their existing confirmation or World Hub review boundary in every mode. Browser/PWA suspension may reconcile overdue checkpoints idempotently after resume, but the runtime must not promise an exact interactive popup while the app is fully closed or OS-suspended.

### Review And Override Entrances

The event system has no ordinary Home app.

- `Event Runtime` is the hidden coordination Module.
- event interaction appears as host-embedded cards, notices, messages, or Mini Scenes.
- `World Hub / 世界中枢` is the existing hidden-by-default integrated entry for event history, pending review, explanations, event-scoped review notes, and bounded correction.
- user-authored reminders and confirmed plans remain Reminders/Calendar data; a World Hub review note is audit context, not a new task system.
- `Cheats / 金手指` remains a future separately unlocked privileged tool for explicit state/value overrides. It may reuse selected-event context and audit formatting, but it does not merge with World Hub permissions or Event Runtime ownership.

## 4. Proposed File Layout

Shared foundation:

```text
src/lib/simulation/event-registry.js
src/lib/simulation/event-engine.js
src/lib/simulation/condition-evaluator.js
src/lib/simulation/random.js
src/lib/chat-social-runtime-source.js
src/stores/simulation.js
```

Module adapters:

```text
src/lib/simulation/adapters/food-delivery-events.js
src/lib/simulation/adapters/shopping-events.js
src/lib/simulation/adapters/map-events.js
src/lib/simulation/adapters/phone-events.js
src/lib/simulation/adapters/calendar-events.js
```

Tests:

```text
tests/simulation-event-engine.test.js
tests/simulation-store.test.js
tests/food-delivery-event-adapter.test.js
```

Not every file has to exist in the first slice. The important part is the seam:

- engine logic in `src/lib/simulation/*`
- persistent logs and settings in `src/stores/simulation.js`
- domain mutation through adapters only

## 5. Interface Sketch

Example event template:

```js
{
  id: 'food_delivery.rider_delay.v1',
  moduleKey: 'food_delivery',
  type: 'rider_delay',
  title: 'Rider delay',
  summary: 'Courier route slowed down because of traffic.',
  triggerModes: ['manual', 'condition', 'random'],
  conditions: [
    { key: 'order.status', op: 'in', value: ['accepted', 'cooking', 'rider_pickup'] },
  ],
  probability: 0.18,
  cooldownMs: 30 * 60 * 1000,
  dailyLimit: 2,
  effect: {
    adapterKey: 'food_delivery.add_order_event',
    payloadSchema: 'FoodDeliveryOrderEventInput',
  },
  surfaces: ['food_delivery.order_timeline', 'chat.food_delivery_service'],
}
```

Example engine result:

```js
{
  eventId: 'food_delivery.rider_delay.v1',
  moduleKey: 'food_delivery',
  triggerSource: 'random',
  status: 'triggered',
  targetId: 'food-order-123',
  adapterKey: 'food_delivery.add_order_event',
  at: 1778918400000,
  reason: 'eligible_random_passed',
}
```

Example surface projection:

```js
{
  schemaVersion: 1,
  id: 'event_surface:map:proposal-123',
  eventId: 'map.local_encounter.v1',
  proposalId: 'proposal-123',
  source: {
    moduleKey: 'map',
    recordType: 'map_journey',
    recordId: 'journey-456',
    runtimeLogId: 'runtime-log-123',
  },
  ownership: {
    eventTruthOwner: 'event_runtime',
    sourceTruthOwner: 'map',
    effectOwner: 'map',
  },
  status: 'pending',
  availability: { state: 'available', reason: '' },
  risk: 'low',
  review: { state: 'pending', mode: 'source_owner_review', reason: '' },
  copy: {
    titleEn: 'Something is happening nearby',
    summaryEn: 'Open the event to review the situation.',
    accessibilityLabelEn: 'Something is happening nearby, Pending review',
  },
  anchor: {
    kind: 'geographic_coordinate',
    mapPackId: 'real-seoul-v1',
    latitude: 37.5665,
    longitude: 126.978,
  },
  expansion: { kind: 'host_detail', hostKey: 'map', targetId: 'proposal-123' },
  outcomeIds: [],
  actions: [{ id: 'expand', kind: 'open_detail' }],
}
```

EVE-1 implements this as a pure, non-persistent Interface in `src/lib/simulation/event-surface-projection.js`, with explicit capabilities in `src/lib/simulation/event-surface-host-registry.js`. Existing Map Journey and Chat social proposals are supported. Current source references must be supplied by their owners; stale sources, invalid anchors, unknown/unbound actions, and unsupported hosts fail closed. No Store or route persists projection fields.

## 6. Execution Flow

1. collect context snapshot from relevant stores
2. load templates from the registry
3. filter templates by trigger source
4. evaluate conditions
5. check cooldowns and daily caps
6. apply deterministic random selection when needed
7. build adapter payload
8. call the module adapter
9. write event log to the simulation store
10. let the owner persist canonical truth and expose the result through its native state, message, call, post, journey, or other accepted form
11. derive a bounded Event Surface Projection only when a separately registered host interaction needs one
12. route any user choice or later chain node through the responsible owning Module Adapter

## 7. Ownership Rules

### Food Delivery

- owns restaurants, menus, cart, orders, order status, and order event records
- owns order-scoped merchant/rider/platform interactions and future canonical Service Cases
- may receive triggered events through an adapter
- Chat may display Food Delivery service-account cards
- Map may provide address or ETA context, not order ownership
- may retain the exact successful Event Runtime log ID on its canonical order-event record through a dedicated owner action, but rejects external injection, rebinding, cross-order/event reuse, or mismatched template/module/target/adapter lineage
- applies legitimate `rider_delay` and `eta_update` values to canonical order ETA, appends the native order timeline, and may use the existing Chat dispatch notification
- does not register an Event Surface in the corrected EVE-4A product state; asking for an update cannot manufacture a delivery exception

### Shopping

- owns products, cart, orders, checkout, store identity, promotion candidates, and logistics entry state
- owns Shopping order interactions and future canonical Service Cases rather than copying them into Event Runtime or Chat
- store/service accounts may push promotions or arrivals
- logistics messaging does not become Shopping order ownership

### Contacts Self Profile And Dynamic Player State

- Contacts Self Profile owns stable, user-confirmed world-facing identity and visibility-scoped profile values
- Event Runtime reads only bounded structured projections with exact profile/world/revision references
- raw biography, occupation prose, or model classification cannot independently authorize an identity-conditioned event
- volatile reputation, media heat, fatigue, occupational pressure, and similar values stay with their natural owners or a future minimal Player State Module; they do not become Contacts fields for convenience

### Map

- owns location, route, distance, ETA, area context, canonical journey/exploration records, checkpoint transitions, and trip presentation
- owns the current place relation, manual-versus-journey position provenance, explicit place-entry session, and validation of any future appointment-driven automatic entry
- may provide context to Food Delivery, Shopping logistics, Assets, and Calendar
- may submit a bounded snapshot only at completed MJE-2 checkpoints while an explicitly reviewed caller has enabled evaluation, and validates the reviewed Event Runtime result
- keeps the generic MJE-3 route-obstruction production trigger disabled; compatibility tests may still exercise only no ETA change or the legacy bounded 120-second delay, while destination change and event-driven cancellation remain unimplemented
- keeps a valid no-event journey path; checkpoint eligibility never runs on every animation tick
- owns large-map pin/card placement and overlap handling, but consumes event projections rather than copying Event Runtime proposal/log truth
- treats place `Enter` as a Map transition that may submit a bounded checkpoint; Event Runtime may return zero, one, or a bounded set of invitations without owning the place session
- treats `Expand event` as navigation/presentation only; any outcome returns through the source owner's validation seam
- must not own orders, Wallet ledgers, or asset records

### Chat

- owns conversations, contacts, service-account bindings, and visible message surfaces
- the first implementation should not write arbitrary free-form chat messages directly from the event engine
- Chat can display read-only event cards that route users to the owning module
- a registered service-account message may submit a bounded order-interaction request through a source Adapter, but Chat keeps the message while the commerce owner creates or reuses the canonical Service Case

### Future World State And Community/Media

- existing domain owners keep every world fact they can honestly own
- a future World State And Arc Ledger is considered only for durable ownerless world facts or multi-occurrence arc state that cannot fit an existing owner; Event Runtime is not automatically that owner
- a future Community/Media Module owns accounts, posts, replies, reposts, subscriptions, read state, and committed publication bodies
- Runtime may coordinate an information-propagation request, but the target owner validates and publishes it
- forum/social/news records are owner-native event-chain surfaces, not Event Surface projections or a second Event Instance store
- future investigation/clue collection requires its own owner and stores references/deductions rather than treating posts as truth

### Calendar / Reminders

- Calendar owns confirmed schedule meaning
- Reminders owns raw cue and follow-up intake
- the event engine may create candidates or reminder-type cues later, but schedule confirmation stays in the proper owner

### Agenda Journey / Activity Session

- Agenda Journey owns today/near-term execution steps, their state, completion evidence references, and outcome summaries
- Activity Session owns canonical activity timing and session checkpoint truth through absolute timestamps
- Event Runtime may evaluate bounded snapshots only at explicit checkpoints and owns eligibility, cooldown/cap, proposal/review, automatic-resolution policy, provenance, and event logs
- Agenda Journey and downstream owners validate requested results; Event Runtime does not write journey state, Calendar history, Map arrival, relationship truth, Wallet ledgers, Assets, identity, or world state directly
- no Agenda Journey or Activity Session runtime is implemented by this architecture contract

### Wallet And Assets

- downstream consumers by default
- Wallet owns ledger writes
- Assets owns asset records

## 8. Landed Pilots And Next Product Slice

The foundation pilots are already landed:

1. Food Delivery status/exception events proved deterministic eligibility, caps, adapters, source-owned order changes, and service surfaces.
2. Chat social proposals proved low-risk auto-apply plus high-risk World Hub review before Chat-owned communication changes.
3. Map Journey MJE-3 proved checkpoint-triggered, non-blocking proposals and exact owner validation, but its generic route-obstruction presentation is no longer production-enabled.

The next event work is staged separately from richer event content:

1. `EVE-1 DONE 2026-08-10`: the pure Event Surface Projection, empty-by-default registered-host capability, stale-source handling, strict Map coordinate-anchor normalization, bounded actions/expansion, and Map Journey/Chat social projectors are implemented and covered by deterministic unit tests; no route or new side effect was added.
2. `EVE-2A DONE 2026-08-10`: the reusable template/instance/place-capability/text/media/persistence contracts, Map place-session input Interface, first K-pop archetype, and six representative fixture cases are frozen under `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md` and `tests/fixtures/events/kpop-realism-v1/`. This stage added no runtime writes.
3. `EVE-2B DONE 2026-08-10`: reusable template/variant/instance normalizers and registries, persistence/reopen/backup, a local K-pop fallback pack, and an optional validated/cached after-entry Event Text Composer are implemented without host UI or external domain effects.
4. `EVE-2C DONE 2026-08-10`: exactly one bounded Map host renders the selected K-pop vertical slice with Map V3 provenance/place sessions, zero-token invitation/no-event paths, explicit entry/expansion, local or cached optional text, three Map-validated no-mutation choices, fail-closed anchors, clustering/stacking, and return context.
5. `EVE-3 DONE 2026-08-12`: World Hub now provides a deterministic Event Notebook over Event Instances, runtime logs, Chat social proposals, and Map Journey proposals. It exposes all/pending/noted counts, source/module/status filters, selected-event lineage and stale-source review, and durable event-scoped note create/update/delete actions. It adds no second event record, event retrigger, Adapter execution, source mutation, Reminder/Calendar ownership, freeform value editing, or Cheats authority.
6. `EVE-4 RESET / EVE-4A TECHNICAL_SPIKE_COMPLETE / PRODUCT_ACCEPTANCE_WITHDRAWN 2026-08-12`: exact Food Delivery lineage and owner mutation remain, while the second host, `Dispatch brief`, local acknowledgement, and manual trigger are removed. Further EVE-4 work requires a separately accepted owner-native causal chain rather than another generic card.
7. `EVE-4B REFERENCE_VERTICAL_DONE 2026-08-14`: Wallet payment, Map courier journey/reroute, Food Delivery-native order conversation, Phone text-call presentation, owner validation, persistence, and exact lineage prove one non-card chain can work. Product review supersedes its pickup-time random address-confirmation trigger and specialized causal-chain persistence as the final reusable Interface.
8. `EVE-4C DONE 2026-08-14`: user-initiated commerce service events now begin from explicit order-scoped interaction; shared contracts, generic Event Instance V2 progression, owner facts/requests, native and registered Chat service-account convergence, Phone resolution proposals, Map estimate/reroute references, and separate Food Delivery/Shopping owner Adapters are implemented and validated. Read `docs/architecture/USER_INITIATED_COMMERCE_INTERACTION_EVENT_ARCHITECTURE.md`.
9. `EVE-5`: use the shared Mini Scene Interface for richer expansion only after its persistence, Settings, and Presenter gates are complete; later CG remains a separate image-generation/media-resolution stage.

## 9. Randomness Policy

Random event work must stay testable and respectful:

- never call `Math.random()` directly in business logic
- use injected values or seeded helpers
- keep random eligibility separate from side effects
- store the reason an event did or did not trigger
- respect cooldowns and daily caps
- reserve future user control through Surprise Mode

Suggested helper:

```js
evaluateRandomGate({
  probability: 0.18,
  randomValue: 0.12,
})
```

## 10. AI Role

AI should be optional and layered:

- Phase 1: no AI needed; templates and copy are local
- Phase 2: AI may generate richer user-facing copy from safe payloads
- Phase 3: AI may suggest event candidates, but the engine still validates them
- Phase 4: AI-assisted simulation is only explored after audit logs, user controls, and deterministic fallbacks exist

AI should not be the first state mutator.

For player-context and world-evolution events, AI may propose bounded incident, claim, or publication variants only after local structured eligibility. It cannot infer canonical occupation from prose, establish a user action or world fact, directly publish a post, change numeric state, or turn a claim into truth. The relevant owner must validate and commit the result.

The accepted default K-pop realism V1 narrows runtime AI further:

- ordinary Ticks, distance updates, place focus, eligibility filtering, deterministic/random gates, and compact invitations remain local and zero-token;
- after a locally eligible event reaches an explicitly approved event-entry/presentation checkpoint, an optional Event Text Composer may materialize bounded title, narration, dialogue, and wording for existing allowlisted choice IDs;
- local code precomputes and validates every effect request, numeric bound, confirmation/review requirement, and source-owner Adapter action;
- accepted normalized text is cached with the Event Instance so reopen/review does not regenerate it;
- invalid, unavailable, disabled, timed-out, or over-budget generation falls back to authored local copy and never blocks the source action;
- runtime image/audio generation is outside V1. Map/world packs provide authored scene assets, and later CG uses a separate image-generation/media-resolution Adapter over stable media intent.

World-aware event copy should still follow `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.
The current default-content and cross-machine handoff contract is `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`.

## 11. Evolution Path

Landed:

- Food Delivery presets and Adapter;
- `simulationStore` logs, cooldowns, caps, permissions, Surprise Mode, and proposal state;
- deterministic shared event engine;
- Chat social review and Map Journey checkpoint Adapters.

Landed in the first product slice:

- EVE-2A contract/fixtures, EVE-2B reusable runtime, the EVE-2C first Map/K-pop vertical slice under `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`, and the EVE-3 World Hub Event Notebook.

Next, only after separate acceptance:

- EVE-4 and EVE-5 in Section 8;
- additional Shopping, logistics, Phone, Calendar/Reminders, Map, and Gallery event families only after an owning source slice is approved;
- evaluate XState/statecharts only if transition complexity truly warrants it;
- use a game engine only for true minigame or Canvas/WebGL surfaces, not ordinary module events.

## 12. Testing Requirements

Minimum tests for an event-engine slice:

- template eligibility with explicit context
- random gate with injected values
- cooldown and daily-cap behavior
- adapter calls with normalized payload
- event-log persistence and restore
- module views display event outcomes without leaking internal labels
- Chat/notification display stays read-only where ownership belongs elsewhere
- event-surface projection normalization, missing/stale source behavior, and action allowlisting
- coordinate-anchor validation for geographic and fictional/custom map packs
- card clustering/stacking and text-fit behavior across desktop and mobile once Map rendering begins

Current targeted examples:

```text
tests/food-delivery-store.test.js
tests/food-delivery-view.test.js
tests/chat-shopping-preview-routing.test.js
tests/simulation-event-engine.test.js
tests/simulation-store.test.js
```

## 13. Landed Baseline

The shared event foundation now exists in code.

Already landed:

- `src/stores/simulation.js` persists event logs, cooldowns, daily counters, module enable flags, and Surprise Mode
- `Settings -> AI Automation` exposes Foreground Tick, Surprise Mode, and current module event permissions without becoming a broad World Hub or Cheats editor
- `src/stores/simulation.js` also persists generated Chat social proposals and applies them only through Chat-owned actions after audit or approval
- `src/lib/chat-social-runtime-source.js` selects conservative role greeting candidates for the foreground/session tick without direct Chat writes
- `src/lib/simulation/random.js` provides injected/seeded helpers
- `src/lib/simulation/condition-evaluator.js` evaluates basic conditions
- `src/lib/simulation/event-engine.js` handles eligibility, random gates, cooldowns, daily caps, adapter execution, and event logging
- `src/lib/simulation/event-tick-runner.js` can now run both the Food Delivery random pilot and the Chat runtime greeting pilot, with tick-level cooldown/daily caps
- `src/lib/simulation/adapters/food-delivery-events.js` is the first real module adapter
- `src/lib/simulation/adapters/map-journey-events.js` retains the first Map journey checkpoint compatibility adapter: local daily/sci-fi/apocalypse variants, permission and Surprise Mode checks, deterministic random selection, cooldown/cap, persistent proposal provenance, and a Map-owned validated return path; production Map mounting does not enable it
- `src/lib/simulation/event-contracts.js` and `event-registry.js` normalize the frozen EVE-2 Interfaces and register world-neutral templates plus compatible world/content packs with fail-closed schema, Adapter, choice, and outcome checks
- `src/lib/simulation/kpop-realism-event-pack.js` and `event-instance-materializer.js` provide the first complete bilingual local fallback and deterministic durable instance materialization for semantic workplace categories/capabilities rather than Seoul place IDs
- `src/lib/simulation/event-text-composer.js` accepts an injected provider/call adapter only after entry, sends bounded context, performs at most one request, validates normalized copy against frozen IDs and limits, caches success or terminal local fallback, and never regenerates on reopen
- `src/stores/simulation.js` storage V5 preserves Event Instance V1, adds durable generic Event Instance V2 progression and immutable owner facts/action requests, migrates V1/V2/V3/V4, and converts legacy Food Delivery causal chains into read-only audit lineage without fabricating user initiation
- `src/lib/simulation/event-notebook.js` builds stable Notebook entries by explicit Instance/proposal/log lineage, adds note-only stale-source rows instead of inventing replacement truth, and provides deterministic filtering/counts without taking ownership of source records
- `src/lib/simulation/adapters/map-place-session-events.js` evaluates the frozen arrival-briefing family from Map-owned session checkpoints and validates exact no-mutation results through the Map owner boundary
- `src/stores/map.js` storage V4 persists manual-versus-journey-arrival position evidence, explicit place-session state, and Map-owned delivery journeys while deriving Event Surface projections instead of storing duplicate event truth
- the Map route registers one Event Surface host and provides zero-token invitation/no-event behavior, explicit `Enter` / `Leave` / expansion, three allowlisted choices, geographic/canvas stacking, layer coexistence, and return context
- Map remains the only registered production Event Surface host for the frozen production-arrival-briefing archetype
- Food Delivery's owner action stores the exact Runtime log reference, prevents injection/reuse/rebinding, and makes link failure explicit without deriving a second UI projection
- legitimate Food Delivery delay/ETA events update canonical order ETA, append the native timeline, and use the existing Chat dispatch notification; the withdrawn `Dispatch brief` and manual query path are absent
- EVE-4C supersedes the EVE-4B pickup-time trigger in production writes: an explicit order-thread or registered Chat service-account action creates/reuses one Food Delivery Service Case, Event Instance V2 persists the one-time response decision/deadline/action lineage, Phone proposes a structured resolution, Food Delivery validates it, and Map alone commits a revision-aware reroute. Shopping separately implements the shared order/interaction/Service Case owner seam as proof only; this does not accept a user-facing Shopping event case or close remaining Shopping product work.
- World Hub's Chat social proposal panel explains source, trigger policy, and ownership boundaries for AI output and foreground/session runtime proposals
- World Hub's Event Notebook reviews Event Instances, logs, Chat social proposals, and Map Journey proposals by source/module/status, shows stable lineage and stale links, and manages event-scoped notes without event execution or domain mutation
- Settings backup/import/rollback and storage diagnostics include `store:simulation`

Recommended next step:

- keep the landed EVE-1 projection contract free of persistence and effect authority, and keep the completed EVE-2C Map host bounded to the one frozen production-arrival-briefing archetype
- preserve the EVE-3 Notebook as a read model over owner truth with durable event-scoped notes; every new adapter should remain explainable by source, module, status, trigger, reason, adapter boundary, target, variant, and stable lineage before stronger controls are added
- preserve the landed EVE-4C user-initiated commerce contracts, owner-native Service Cases, generic Event Instance V2 progression, and legacy audit migration; do not restore the withdrawn host/card/manual trigger, add another generic Event Surface, silently rewrite Event Instance V1, or advance EVE-5 without separate acceptance
- preserve the landed Player Context V1 seam as read-only eligibility evidence; do not turn its manager/public-idol gates into incident creation, random triggers, owner mutation, or a generic surface in the current slice. Dynamic-state owners, fact/claim/publication Interfaces, persistence, and native product surfaces are planned later and require separate acceptance
- keep the generic MJE-3 route-obstruction trigger production-disabled. Any replacement must begin from a reviewed transport/actor capability and owner-native consequence rather than relabeling the legacy two-minute result
- preserve the relationship classification gate boundary: event/runtime rules read saved category/modifier classification fields, not free-text relationship labels or notes. Current low-impact relationship facts may store soft-reference gate audit metadata; named high-risk gate presets are available for future event packs, but should not enable new high-impact automation by themselves.
- deepen generated Chat social-event sources through the landed proposal/review seam, not by direct Chat or Contacts writes; V1 runtime greetings are intentionally narrow, and richer scheduling or high-risk communication changes still need explicit review semantics

## 14. EVE-2A Frozen Versioned Interfaces

Status: `CONTRACT_FROZEN / EVE-2B_RUNTIME_IMPLEMENTED / EVE-2C_MAP_UI_IMPLEMENTED`.

The fixture source for this section is `tests/fixtures/events/kpop-realism-v1/`. EVE-2B implements normalizers and registries against these records; changing a field's meaning still requires a new schema or fixture version rather than silently rewriting accepted fixtures.

### Event Template V2

`EventTemplateV2` is the world-neutral functional Interface. Its required top-level fields are:

| Field | Contract |
| --- | --- |
| `schemaVersion` | exactly `2` |
| `id` + `version` | stable template identity and independently incremented content/behavior version |
| `archetypeId` | reusable interaction structure without world-specific naming |
| `owner` | source and effect owner Module keys |
| `source` | canonical source record type and explicit checkpoint ID |
| `trigger` | modes, activation scope, discoverability, deterministic probability, cooldown, cap, target scope, permission, and intensity policy |
| `eligibility` | normalized place categories/capabilities, accepted position provenance, required place-session state, and pure conditions |
| `presentation` | allowed host surfaces, expansion kind, text mode, and semantic media-intent key |
| `choices` | stable choice/outcome IDs and one allowlisted Adapter request descriptor per choice |
| `safety` | risk, confirmation, reversibility, external-mutation class, and optional relationship gate preset |

Template copy, K-pop terms, exact Seoul place IDs, provider settings, generated prose, and canonical domain values do not belong in this Interface. Unknown activation scopes, discoverability modes, choice IDs, Adapter keys, place categories, or capabilities fail closed.

### Event Variant Pack V1

`EventVariantPackV1` is world/content-specific and has `schemaVersion: 1`, stable pack `id`, `version`, `worldContextFamily`, `contentProfileId`, shipped locales, and `templateVariants` keyed by an existing template ID. Every variant has a stable ID/version, optional place-category filter, tone tags, bounded participant slots, complete local invitation/scene/choice/consequence copy, and optional `MediaIntentV1`.

Every shipped template must have a complete local variant. Choice and outcome copy is keyed by IDs already declared by the template; a variant cannot add an action or effect. A missing or incompatible pack uses the frozen copy already stored in an Event Instance, otherwise the system default local variant, and never makes a provider request merely to repair pack absence.

### Event Instance V1

`EventInstanceV1` is the durable authoritative occurrence and has `schemaVersion: 1`. Its required groups are:

| Group | Persisted meaning |
| --- | --- |
| `id`, `lifecycle` | stable occurrence ID and `active`, `resolved`, `dismissed`, or `unavailable` state |
| `templateRef` | template ID, schema version, and template version used for this occurrence |
| `source` | source Module, record type/ID/revision, checkpoint ID/time |
| `world` | world context/pack, variant pack/version, Map pack/version lineage |
| `place` | stable place ID, normalized semantic category/capabilities, strict Event Surface anchor |
| `presence` | activation scope, relation, accepted provenance, place-session ID/revision, optional journey ID, evidence time |
| `selection` | deterministic seed and chosen variant ID/version |
| `runtime` | proposal, eligibility-log, and optional outcome-log references |
| `text` | one normalized `TextMaterializationResultV1` including local fallback |
| `media` | one `MediaIntentV1`, optional stable resolved asset reference, resolution reason, render mode |
| `choices` | frozen allowed IDs plus optional selected choice/outcome |
| `outcome` | Adapter key, request state, owner result code/reference; no copied owner record |
| `timestamps` | created, entered, resolved, dismissed, and updated times |

The invitation proposal exists before the instance. The instance is created only after explicit event entry and begins `active`; reopening reads the same instance. Template, source/world/place/presence lineage, seed, selected variant, allowed choices, and accepted normalized text are immutable after creation. Lifecycle, selected choice/outcome, owner result references, resolution timestamps, and a pending text result may advance monotonically.

### Text Materialization Result V1

Text materialization is local-first and non-blocking. Event entry synchronously freezes the selected local copy, renders it immediately, and may then start one optional provider request. A validated response may replace the normalized display copy only while the instance is still active and its context hash is unchanged. A choice made first, a stale source, timeout, invalid result, suspension, or provider failure keeps the local copy and ignores late output.

The exact V1 limits are:

| Limit | Value |
| --- | --- |
| provider calls per instance | at most `1`; no automatic retry and no branch follow-up call |
| request timeout | `20,000 ms` |
| serialized request payload | `8,000` characters |
| world-context digest | `1,200` characters |
| participants | `4` |
| bounded context facts | `24`, each at most `160` characters |
| title | `80` characters |
| opening | `800` characters |
| environment | `500` characters |
| dialogue beats | `6`, each at most `240` characters |
| choice labels | exactly the template's at-most-`3` IDs, each at most `80` characters |
| consequence text | each allowlisted outcome at most `320` characters |
| total normalized output | `3,200` characters |

Persist `status` (`local_only`, `pending`, `succeeded`, or `fallback`), final `source` (`local` or `ai`), `attemptCount`, deterministic cache key, context hash, normalized copy, provider-neutral failure code, and minimum provider/model/request/time provenance. Never persist the prompt, raw response, transport payload, credentials, or uncommitted candidate.

Allowed terminal fallback codes are `text_mode_local_only`, `provider_disabled`, `offline`, `provider_unavailable`, `provider_timeout`, `rate_limited`, `quota_exhausted`, `invalid_schema`, `content_rejected`, `context_stale`, and `request_interrupted`. Reopen never converts a terminal fallback into another request.

### Media Intent V1

`MediaIntentV1` has `schemaVersion: 1`, one semantic slot, scene key, normalized place category, bounded capability/tone tags, and `required`. The Event Instance separately stores an optional stable `resolvedAssetRef`, resolution reason, and `renderMode`. It stores no binary, external URL, provider prompt, crop implementation, or generated candidate.

Resolution remains exact Map-pack asset, category asset in the active Map/world pack, approved Gallery asset reference, system generic asset, then text-only. Missing media never blocks event entry or resolution. The current repository has Map overview assets but no authored workplace-scene asset; EVE-2A therefore freezes text-only fallback rather than claiming that a scene image already exists.

### Persistence, Backup, Migration, And Retention

Event Runtime is the logical owner. EVE-2B adds `eventInstances` to the existing `store:simulation` owner, increments its storage version, and includes the full normalized array in the required `simulation` backup section and transactional rollback path. Map stores only its own place-session/current-location truth; an Event Instance stores source references and frozen evidence, not a copied Map session.

Migration from Simulation storage V1 to V2 initializes `eventInstances: []` and preserves all current logs, ledgers, proposals, and settings. Restore normalizes each versioned instance, preserves valid records, reports invalid entries, and does not silently reinterpret unknown schemas. A missing source, pack, or asset leaves the instance reviewable with frozen text but disables new choice execution where source validation is impossible.

V1 applies no automatic count/time truncation to Event Instances. Resolved instances remain durable until a separately accepted reversible archive or user deletion policy exists. Projection/UI queries may be bounded without deleting authoritative records. Full prompts, raw responses, temporary media candidates, and provider transport data are never part of retention.

## 15. EVE-4C User-Initiated Commerce Interaction Direction

Status: `IMPLEMENTED / VALIDATED 2026-08-14`.

The first reusable commerce event family begins from an explicit user service interaction in the owner App or a registered Chat service account with valid order context. The trigger is the user action, not a model guess, coordinate, saved address, purchase history, or random pickup prompt.

The landed architecture adds a deep commerce-interaction seam around these Interfaces:

- versioned order references;
- user interaction triggers;
- commerce-owned Service Case references;
- immutable owner facts;
- idempotent owner action requests;
- Phone-owned structured interaction resolutions;
- Map-owned journey-estimate references;
- generic versioned Event Instance progression for condition, branch, one-time decision, fact wait, timeout, owner request, and terminal nodes.

Event Instance V1 remains frozen for the accepted Map/K-pop contracts. EVE-4C adds Event Instance V2 plus Simulation V5 migration from the specialized EVE-4B causal-chain field. Legacy lineage and owner references become read-only audit entries without fabricating user initiation for pickup-triggered reference records.

The deletion test is explicit: disabling Event Runtime must leave order messaging, Service Cases, address editing, Map ETA/reroute, Wallet settlement, and Phone sessions functional. Runtime creates leverage by centralizing decision persistence, deadlines, fact correlation, owner requests, and audit rather than by owning those capabilities.

Food Delivery is the first owner Adapter and Shopping is the second owner Adapter. Native owner entry and registered Chat service-account entry converge idempotently on one commerce-owned Service Case. User-reported issue and latent-positive fulfillment fixtures prove the Runtime is not hard-coded to address change.

The complete contract, migration order, Interfaces, reference recipe, acceptance, and do-not-do rules are in `docs/architecture/USER_INITIATED_COMMERCE_INTERACTION_EVENT_ARCHITECTURE.md`.
