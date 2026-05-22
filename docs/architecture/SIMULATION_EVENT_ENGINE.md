# Simulation Event Engine

Updated: 2026-05-19

This document records the architecture direction for SchatPhone's immersive event foundation:

- random surprises
- condition-triggered events
- scheduled simulation
- module-owned side effects through adapters

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

### Surprise Mode

A future user-level control for random event intensity.

Minimum reserved levels:

- Off
- Low
- Balanced
- High

## 4. Proposed File Layout

Shared foundation:

```text
src/lib/simulation/event-registry.js
src/lib/simulation/event-engine.js
src/lib/simulation/condition-evaluator.js
src/lib/simulation/random.js
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

- owns location, route, distance, ETA, area context, and trip simulation
- may provide context to Food Delivery, Shopping logistics, Assets, and Calendar
- must not own orders, Wallet ledgers, or asset records

### Chat

- owns conversations, contacts, service-account bindings, and visible message surfaces
- the first implementation should not write arbitrary free-form chat messages directly from the event engine
- Chat can display read-only event cards that route users to the owning module

### Calendar / Reminders

- Calendar owns confirmed schedule meaning
- Reminders owns raw cue and follow-up intake
- the event engine may create candidates or reminder-type cues later, but schedule confirmation stays in the proper owner

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
- `src/lib/simulation/random.js` provides injected/seeded helpers
- `src/lib/simulation/condition-evaluator.js` evaluates basic conditions
- `src/lib/simulation/event-engine.js` handles eligibility, random gates, cooldowns, daily caps, adapter execution, and event logging
- `src/lib/simulation/adapters/food-delivery-events.js` is the first real module adapter
- Settings backup/import/rollback and storage diagnostics include `store:simulation`

Recommended next step:

- preserve the World Hub filtered review-pack baseline for every new adapter, so each event log remains explainable by module, status, trigger source, reason, adapter boundary, target, and world variant context before stronger controls are added
