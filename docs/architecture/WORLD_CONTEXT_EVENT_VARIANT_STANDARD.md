# World Context Event Variant Standard

Updated: 2026-08-18

Purpose: define the shared standard for making SchatPhone events world-aware without breaking current ownership boundaries or turning runtime execution into an API-dependent black box.

Use this file together with:

- `docs/architecture/SIMULATION_EVENT_ENGINE.md`
- `docs/strategy/STATE_OWNERSHIP_STRATEGY.md`
- `docs/strategy/BACKGROUND_ACTIVITY_STRATEGY.md`
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`
- `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md`

Core rule:

> world-aware flavor should change how an event feels, not who owns the resulting truth.

`worldContext` is static/slow-changing setting context. It is not dynamic player state, an evolving-world ledger, a social-media database, or proof that a claimed incident occurred.

## 1. Standard Runtime Chain

World-aware events should follow this shared chain:

```text
WorldBook bindings + bounded Player Context / owner facts
-> world context summary and eligibility snapshot
-> local event variant pack
-> shared event engine
-> module adapter
-> module-owned store action
-> visible owner-native module / Chat / notification / future publication surface
```

Important baseline:

- ordinary runtime triggering should stay local by default;
- API calls are allowed for generating or refreshing event material, not for every runtime tick.

The world-aware chain has two different downstream paths:

1. a local/participant-scoped event path that reaches the source Owner and, only when relevant, exposes a bounded role-memory candidate;
2. a public-world path that may update a world-scoped fact or publication projection available to same-world roles when relevant.

Neither path makes Event Runtime the owner of role memory or universal awareness. Public knowledge remains separate from personal role memory, and role-specific context selection remains the responsibility of the consuming continuity/projection seam.

## 2. Goals

This standard exists to:

1. let one functional event appear differently under different world contexts;
2. keep cooldowns, daily caps, deterministic triggering, and event logs inside the shared runtime foundation;
3. preserve module ownership even when event flavor changes;
4. allow future AI-assisted event-copy generation in batches, then save the result locally for reuse;
5. give future adapters one reusable contract instead of one random system per module.

## 3. Non-Goals

This standard does not exist to:

1. call an API for every runtime event;
2. let AI directly mutate domain state;
3. duplicate raw WorldBook text into every event log;
4. move ordinary product ownership into the event engine;
5. make `World Hub` the normal authoring surface for event data;
6. reopen old ownership confusion such as `Calendar` absorbing raw reminder-cue meaning.
7. treat WorldBook, Event Runtime, or an API response as the universal owner of dynamic player/world truth.

## 4. Required Shared Concepts

### 4.1 World context

`worldContext` is a compact, normalized summary derived from active WorldBook bindings.

It is not the raw WorldBook text blob.

Recommended shape:

```js
{
  id: 'world_context_sci_fi_city',
  source: 'worldbook_binding',
  activeWorldBookIds: ['wb_sci_fi_city_01'],
  sourceScope: 'conversation',
  genreTags: ['sci_fi', 'city'],
  toneTags: ['clean', 'high_tech', 'quiet_tension'],
  techLevel: 'high',
  dangerLevel: 'medium',
  socialOrder: 'stable',
  economyMode: 'credits',
  magicLevel: 'none',
  locale: 'zh-CN',
  version: 1,
  updatedAt: 1778918400000
}
```

Field rules:

- `id`: stable local id for the summarized context;
- `source`: `default`, `worldbook_binding`, `manual`, or `ai_generated_summary`;
- `activeWorldBookIds`: references only, not raw text duplication;
- `sourceScope`: `global`, `conversation`, `role`, `module`, or `route`;
- tone and world tags should stay compact and enumerable where possible.

### 4.2 Event template

An event template defines the functional event.

It should stay stable across worlds.

Example:

```js
{
  id: 'food_delivery.rider_delay.v1',
  moduleKey: 'food_delivery',
  type: 'rider_delay',
  triggerModes: ['manual', 'condition', 'random'],
  conditions: [
    { key: 'order.status', op: 'in', value: ['accepted', 'cooking', 'rider_pickup'] }
  ],
  probability: 0.18,
  cooldownMs: 30 * 60 * 1000,
  dailyLimit: 2,
  effect: {
    adapterKey: 'food_delivery.add_order_event',
    payloadSchema: 'FoodDeliveryOrderEventInput'
  },
  surfaces: ['food_delivery.order_timeline', 'chat.food_delivery_service']
}
```

### 4.3 Event variant

An event variant is the world-aware expression of one template.

Example:

```js
{
  id: 'food_delivery.rider_delay.sci_fi.drone_lane_queue.v1',
  templateId: 'food_delivery.rider_delay.v1',
  worldScope: ['sci_fi', 'city'],
  title: 'Low-Altitude Lane Queue',
  summaryTemplates: [
    'The courier drone entered a controlled low-altitude queue. ETA +{etaDeltaMinutes} min.'
  ],
  detailTemplates: [
    'The order is still in transit. ETA was recalculated against current lane congestion.'
  ],
  payloadHints: {
    eventType: 'rider_delay',
    severity: 'soft_delay'
  },
  impactLevel: 'non_destructive',
  reversible: true,
  requiresUserConfirmation: false,
  locale: 'en-US'
}
```

### 4.4 Event variant pack

An event variant pack is a local library of variants generated or curated for one world context.

Recommended shape:

```js
{
  id: 'variant_pack_sci_fi_city_v1',
  worldContextId: 'world_context_sci_fi_city',
  worldContextHash: 'ctx_hash_abc123',
  activeWorldBookIds: ['wb_sci_fi_city_01'],
  source: 'ai_generated',
  moduleKeys: ['food_delivery', 'shopping', 'map'],
  templateIds: ['food_delivery.rider_delay.v1'],
  variantsByTemplateId: {
    'food_delivery.rider_delay.v1': [
      {
        id: 'food_delivery.rider_delay.sci_fi.drone_lane_queue.v1',
        title: 'Low-Altitude Lane Queue'
      }
    ]
  },
  version: 1,
  createdAt: 1778918400000,
  updatedAt: 1778918400000
}
```

### 4.5 Dynamic Player And World Context

Dynamic eligibility inputs are separate from `worldContext`:

- Contacts Self Profile may provide stable structured identity such as user-confirmed occupation, affiliation, public identity, and visibility-scoped world fields;
- existing domain owners provide current canonical facts such as a schedule, call, trip, payment, order, or relationship state;
- volatile cross-module values use their natural owner or a future minimal Player State owner only when no existing owner is honest;
- durable ownerless world incidents or long-running arc state may require a future World State And Arc Ledger after a separate architecture gate.

Event Runtime consumes bounded references/snapshots. It does not copy those records or infer missing identity from free text. A future forum/social/news publication belongs to a Community/Media owner and must preserve the difference between a canonical fact, an unverified claim, and the committed post that presents it.

## 5. Ownership Rules

World-aware flavor must not break module ownership.

Current ownership reminders:

- `Shopping` owns orders and logistics-facing order state.
- `Food Delivery` owns restaurant/order state.
- `Map` owns routes, trips, place/travel context, and location continuity.
- `Wallet` owns ledger records and balances.
- `Calendar` owns confirmed schedule/date meaning.
- `Reminders` owns raw cues, callbacks, follow-ups, logistics reminders, and task-like prompts.
- `relationship runtime` owns relationship truth and compact memory groups.
- `Contacts Self Profile` owns stable structured user identity, not volatile simulation values or event decisions.
- a future `Community/Media` Module owns committed accounts/posts/news/replies/subscriptions; a post is not proof that its claim is true.
- `World Hub` may review runtime state, but it is not the default authoring surface.

Important correction:

- world-aware runtime adapters must not treat `Calendar` as the owner of raw reminder-style queues;
- if an event produces a raw cue or callback prompt, that belongs to `Reminders` unless it becomes a confirmed schedule/date event.

## 6. Runtime Flow

The ordinary runtime flow should not depend on a live API call:

1. resolve active `worldContext`;
2. resolve only the bounded Player Context and owner facts required by the named event family;
3. load a matching local `eventVariantPack`;
4. find eligible event templates for the module;
5. select the best available variant;
6. evaluate conditions, random gate, cooldowns, and caps;
7. call the module adapter;
8. let the adapter call the owning module store action;
9. write a runtime log with world/context references and minimum frozen eligibility evidence;
10. let existing or future owner-native product surfaces display the result.

If no specific pack exists, use the built-in `daily` fallback family.

## 7. API Usage Policy

API usage is allowed for event material generation, not routine runtime execution.

Good API moments:

- user explicitly generates or refreshes a world event pack;
- advanced tooling asks AI to draft or expand variant families;
- future moderation or review flow wants improved copy for a selected variant.
- an already eligible event reaches an explicitly approved entry/presentation checkpoint and an optional text Composer materializes bounded prose for one cached Event Instance.
- a separately approved world-incident or information-propagation flow requests bounded incident, claim, or publication wording after local structured eligibility and before target-owner validation.

Bad default pattern:

```text
runtime tick
-> random event eligible
-> call API
-> wait for copy
-> mutate module state
```

Required default pattern:

```text
WorldBook changed
-> optionally generate or refresh variant pack
-> save locally
-> later runtime ticks use the local pack only
```

For the accepted default K-pop realism V1, an optional after-entry text request is an enrichment path rather than a runtime dependency. Eligibility, invitation copy, choice/effect allowlists, outcome calculation, and local fallback remain available without the request. The normalized result is cached per Event Instance and is not regenerated on reopen. Images/audio are not generated by this path.

For player-context/world-evolution/information-propagation work, generated output remains a candidate. It cannot establish the user's occupation, create a canonical user action or world fact, change numeric state, directly publish a post, or turn a claim into truth. The relevant owner validates and commits any accepted fact, request, or publication.

## 8. World Context Priority

When several bindings exist, resolve `worldContext` in this order unless a stronger module rule explicitly overrides it:

1. explicit module or route context;
2. active Chat conversation binding;
3. active role binding;
4. global worldview;
5. default `daily` context.

The chosen context id should be loggable and explainable.

## 9. Adapter Contract

Every world-aware adapter should:

- accept the shared event-engine input rather than inventing a private random flow;
- accept a selected `variant` or resolve one through the shared helper;
- mutate only the owning module store through explicit module-owned actions;
- return a normalized result that can be logged and reviewed;
- provide a built-in `daily` fallback.

Recommended adapter input:

```js
{
  template,
  variant,
  context,
  worldContext,
  variantPack,
  targetId,
  triggerSource,
  now
}
```

Recommended adapter result:

```js
{
  ok: true,
  moduleKey: 'food_delivery',
  templateId: 'food_delivery.rider_delay.v1',
  variantId: 'food_delivery.rider_delay.sci_fi.drone_lane_queue.v1',
  targetId: 'food_order_123',
  mutationId: 'food_event_456',
  visibleSurface: 'food_delivery.order_timeline'
}
```

## 10. Event Log Standard

World-aware event logs should include metadata about the chosen context and variant, but not raw WorldBook text.

Recommended fields:

```js
{
  eventId: 'food_delivery.rider_delay.v1',
  moduleKey: 'food_delivery',
  triggerSource: 'random',
  status: 'triggered',
  targetId: 'food_order_123',
  adapterKey: 'food_delivery.add_order_event',
  variantId: 'food_delivery.rider_delay.sci_fi.drone_lane_queue.v1',
  variantPackId: 'variant_pack_sci_fi_city_v1',
  worldContextId: 'world_context_sci_fi_city',
  activeWorldBookIds: ['wb_sci_fi_city_01'],
  reason: 'eligible_random_passed',
  at: 1778918400000
}
```

## 11. Safety Rules

Random world-aware events must stay fair and reviewable.

Rules:

1. `non_destructive` events may run automatically when settings, caps, and cooldowns allow.
2. `reversible` events may run automatically only when the user-facing surface can explain the change.
3. `destructive` events must not run automatically by default.
4. Events that spend money, cancel meaningful records, delete content, or make high-impact relationship changes require confirmation or an explicitly designed stronger mode.
5. Any negative event should have a user-facing explanation and acknowledgement path.

## 12. Built-In Variant Families

To avoid hard API dependence, the project should maintain built-in local variant families for at least:

- `daily`
- `sci_fi`
- `apocalypse`

Later optional families may include:

- `fantasy`
- `cyberpunk`
- `supernatural`
- `historical`
- `romance`
- `slice_of_life`

The first product-focused content pack is `kpop_realism`, layered over the ordinary modern/daily world rather than implemented as an Event Runtime branch. V1 builds this pack first and does not require parallel authored sci-fi, apocalypse, fantasy, or historical packs. Generic template and place-capability semantics must still avoid K-pop names, exact Seoul place IDs, and icon-based logic.

## 13. Current Baseline And Limits

Current baseline:

- world-aware variants, Event Instance V1/V2, the local K-pop pack, the Map production-arrival-briefing host, the World Hub Event Notebook, and user-initiated commerce progression are implemented at their named accepted stages;
- runtime triggering and ordinary no-event paths stay local-first;
- destructive random execution remains blocked;
- Player Context V1 identity eligibility is implemented; dynamic world evolution and information propagation remain documentation only.

Current limits:

- not every module is world-aware yet;
- persisted user-authored or AI-authored variant packs are still a future step;
- no general dynamic Player State owner, World State And Arc Ledger, Community/Media owner, claim/post Interface, investigation/clue owner, or identity-conditioned incident creation is implemented; the landed Player Context V1 seam is read-only and K-pop-allowlist bounded;
- Map remains the only registered production Event Surface host, and the only completed Map content family remains the frozen production-arrival-briefing archetype;
- ordinary runtime triggering still must not rely on network availability.

## 14. Acceptance Checklist

Before a world-aware event adapter is treated as complete:

1. it uses the shared event engine;
2. it has a `daily` fallback;
3. it can resolve at least one non-default world family;
4. it does not call an API during ordinary runtime trigger;
5. it respects cooldowns, caps, and current safety controls;
6. it logs enough metadata for PM, QA, and later AI handoff;
7. it preserves module ownership;
8. it has deterministic tests.

## 15. Recommended Next Expansion Order

1. preserve EVE-2A's frozen template/instance/place-capability/text/media contracts, production-arrival-briefing archetype, and fixtures;
2. preserve the completed EVE-2B local K-pop pack, durable instance persistence, and optional cached after-entry text materialization behind local validation and deterministic provider-failure tests;
3. preserve the completed EVE-2C Map vertical slice before parallel host or world-pack breadth;
4. preserve Player Context V1 as a separately accepted read-only foundation, and treat actual identity-conditioned incidents plus world-evolution/information-propagation as future owner-native families rather than implied EVE-5 work;
5. expand to the next safest Adapters through the same contract;
6. deepen explanation and review quality before broader automation or CG generation.

## 16. Change Log

1. 2026-05-16: created as the first world-aware event standard.
2. 2026-05-19: rewritten to remove mixed-encoding residue, align with the current Calendar/Reminders split, preserve module ownership, and keep world-aware flavor clearly separated from runtime truth ownership.
3. 2026-08-10: recorded the K-pop-realism-first product focus, optional cached after-entry text materialization, zero-token trigger/invitation rule, authored Map/world-pack media direction, and later separate CG extension.
4. 2026-08-15: separated static WorldBook context from structured Player Context, dynamic world state, fact/claim/publication truth, and future Community/Media ownership; then implemented only the revision-aware K-pop Player Context V1 eligibility foundation without authorizing incidents, world evolution, publication, or EVE-5.
