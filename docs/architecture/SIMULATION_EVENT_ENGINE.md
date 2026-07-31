# Simulation Event Engine

Updated: 2026-07-31

This document records the architecture direction for SchatPhone's immersive event foundation:

- random surprises
- condition-triggered events
- scheduled simulation
- module-owned side effects through adapters

Persistence boundary:

- ephemeral eligibility checks, rebuildable projections, and explicitly classified operational logs may rotate;
- accepted relationship facts and provenance for already-applied persistent truth cannot be silently deleted;
- durable evidence may move out of the hot runtime set only through reversible cold archival with World Hub review/restore semantics.
- full AI prompts, raw responses, uncommitted candidates, and transport payloads are not event truth; persist normalized proposals/outcomes and minimum provenance, with full capture limited to explicit temporary diagnostics;
- when an approved event formally publishes a social/forum record, offline scene, long-form artifact, performance/episode record, or character-state history, the target owner persists the canonical committed content and Event Runtime keeps references/provenance rather than copying the body.

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

The event foundation is an internal coordination layer.

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

### Map Journey Checkpoint Source

Map journey/exploration events use a module-owned checkpoint as their trigger boundary. Map submits a bounded canonical snapshot only when the Map Journey Runtime reaches an explicit checkpoint. Event Runtime evaluates templates, deterministic/random gates, cooldowns, caps, permissions, and review policy, then returns a requested outcome through the Map adapter.

The checkpoint source is not a timer tick. Event Runtime cannot mutate the journey, transport snapshot, place, pin, arrival, or cancellation record directly, and a journey must remain able to complete without an event. MJE-3 implements the first narrow adapter for completed `en_route` and `near_arrival` checkpoints while Map is mounted; a pending proposal never pauses Map Journey, Map validates the reviewed result, and only the bounded 120-second delay changes ETA. The staged source contract is defined in `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`.

### Agenda Journey And Activity Session Checkpoint Source

Future Agenda Journey and Activity Session events use explicit execution checkpoints such as step start, a duration milestone, near completion, completion, or deadline reconciliation. The source owner submits only a bounded snapshot with stable Calendar, Agenda Journey step, Activity Session, and optional Map evidence references. Event Runtime evaluates eligibility, deterministic/random gates, cooldowns, caps, permissions, interaction policy, and provenance; Agenda Journey and every downstream domain owner validate the requested result before changing their own truth.

An Activity Session's canonical progress comes from absolute timestamps rather than accumulated timer ticks. Event Runtime must not evaluate on each visual countdown tick, and elapsed time or Map arrival alone cannot prove completion of a rehearsal, broadcast, performance, class, meeting, or other non-travel activity. This collaboration is architecture-only under `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`; no Agenda Journey or Activity Session adapter is implemented.

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
  surfaces: ['food_delivery.order_card', 'chat.food_delivery_service'],
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
10. let existing module views, Chat service accounts, notifications, or reminders display the result

## 7. Ownership Rules

### Food Delivery

- owns restaurants, menus, cart, orders, order status, and order event records
- may receive triggered events through an adapter
- Chat may display Food Delivery service-account cards
- Map may provide address or ETA context, not order ownership

### Shopping

- owns products, cart, orders, checkout, store identity, promotion candidates, and logistics entry state
- store/service accounts may push promotions or arrivals
- logistics messaging does not become Shopping order ownership

### Map

- owns location, route, distance, ETA, area context, canonical journey/exploration records, checkpoint transitions, and trip presentation
- may provide context to Food Delivery, Shopping logistics, Assets, and Calendar
- submits a bounded snapshot only at completed MJE-2 checkpoints while Map is mounted and validates the reviewed Event Runtime result
- currently applies only no ETA change or a bounded 120-second delay; pending review remains non-blocking, and destination change plus event-driven cancellation remain unimplemented
- keeps a valid no-event journey path; checkpoint eligibility never runs on every animation tick
- must not own orders, Wallet ledgers, or asset records

### Chat

- owns conversations, contacts, service-account bindings, and visible message surfaces
- the first implementation should not write arbitrary free-form chat messages directly from the event engine
- Chat can display read-only event cards that route users to the owning module

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

## 8. First Pilot

The safest first pilot is Food Delivery status and exception events.

Why:

- the baseline already exists
- visible surfaces already exist
- tests already cover event persistence/display paths

Recommended pilot sequence:

1. extract Food Delivery event presets
2. add deterministic manual trigger helper
3. only then add guarded random eligibility after cooldown/cap tests are in place

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

World-aware event copy should still follow `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.

## 11. Migration Path

Phase 0:

- documentation and ownership map

Phase 1:

- Food Delivery event presets and adapter extraction

Phase 2:

- `simulationStore` with logs, cooldowns, caps, and user-level settings

Phase 3:

- shared `event-engine` with deterministic condition and random evaluation

Phase 4:

- Shopping, logistics, Phone, Calendar/Reminders, Map, and Photos event templates

Phase 5:

- evaluate XState/statecharts only if transition complexity truly warrants it

Phase 6:

- use the `game-engine` skill only for true minigame or Canvas/WebGL surfaces, not ordinary module events

## 12. Testing Requirements

Minimum tests for an event-engine slice:

- template eligibility with explicit context
- random gate with injected values
- cooldown and daily-cap behavior
- adapter calls with normalized payload
- event-log persistence and restore
- module views display event outcomes without leaking internal labels
- Chat/notification display stays read-only where ownership belongs elsewhere

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
- `src/lib/simulation/adapters/map-journey-events.js` provides the first Map journey checkpoint adapter: local daily/sci-fi/apocalypse variants, permission and Surprise Mode checks, deterministic random selection, cooldown/cap, persistent proposal provenance, and a Map-owned validated return path
- World Hub's Chat social proposal panel explains source, trigger policy, and ownership boundaries for AI output and foreground/session runtime proposals
- Settings backup/import/rollback and storage diagnostics include `store:simulation`

Recommended next step:

- preserve the World Hub filtered review-pack baseline for every new adapter, so each event log remains explainable by module, status, trigger source, reason, adapter boundary, target, and world variant context before stronger controls are added
- preserve the relationship classification gate boundary: event/runtime rules read saved category/modifier classification fields, not free-text relationship labels or notes. Current low-impact relationship facts may store soft-reference gate audit metadata; named high-risk gate presets are available for future event packs, but should not enable new high-impact automation by themselves.
- deepen generated Chat social-event sources through the landed proposal/review seam, not by direct Chat or Contacts writes; V1 runtime greetings are intentionally narrow, and richer scheduling or high-risk communication changes still need explicit review semantics
