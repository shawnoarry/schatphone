# User-Initiated Commerce Interaction Event Architecture

Updated: 2026-08-14

Status: `IMPLEMENTED / VALIDATED 2026-08-14`

Roadmap stage: `EVE-4C USER_INITIATED_COMMERCE_INTERACTION_FOUNDATION`

## 1. Purpose

This contract defines the first reusable owner-native event-chain family built from a real user action rather than inferred human intent or a generic Event Surface.

The reference scenario is a delivery-address change, but the Interfaces are intended for Food Delivery, Shopping, and later commerce or appointment Modules that can expose an order or fulfillment reference. The scenario is evidence for the event architecture; it is not the reason the participating owner capabilities exist.

The core product rule is:

> A user-initiated commerce service event begins only after the user performs an explicit service interaction inside the owning platform or a registered Chat service account with valid source context.

The act of sending or submitting the interaction is authoritative. Free-form text, current coordinates, saved addresses, model classification, or assumed user preference cannot independently create a commerce event or mutate owner truth.

## 2. Relationship To EVE-4B

EVE-4B remains an implemented technical reference that proved Wallet payment, Map-owned courier journey/reroute, Food Delivery-native order conversation, Phone text-call presentation, owner validation, persistence, and exact lineage can form one working chain.

Post-implementation product review supersedes the EVE-4B trigger and Runtime shape:

- the random pickup-time address-confirmation prompt is not the final product trigger;
- `foodDeliveryCausalChains` and `FOOD_DELIVERY_CAUSAL_CHAIN_NODE` are event-specific implementation scaffolding, not the reusable Runtime Interface;
- a user `request_address_change` action becomes the authoritative entry for the reference recipe;
- Food Delivery messaging, address editing, Map ETA/reroute, Wallet settlement, and Phone session/resolution remain owner capabilities that must work without an eligible optional event;
- no Food Delivery Event Surface, Event Home app, generic popup, Mini Scene, Calendar effect, or Agenda Journey implementation is authorized.

EVE-4C now extracts those reusable Interfaces in the current tree and migrates the reference recipe to explicit user initiation. It does not advance EVE-5.

## 3. Scope

This contract covers:

- order-scoped user service interactions;
- native platform and registered Chat service-account entry;
- reusable order references and owner facts;
- canonical service cases in the commerce owner;
- generic Event Instance progression through facts, decisions, waits, timeouts, owner requests, and terminal outcomes;
- optional deterministic/random response disposition after a valid user trigger;
- Phone-owned call records and structured resolution proposals;
- Map-owned journey estimate and reroute truth;
- Food Delivery as the first migration Adapter;
- Shopping as the second owner Adapter required to prove the commerce seam is real.

This contract does not cover:

- inferring a real user's intended destination, hunger, satisfaction, or purchase purpose;
- treating current coordinates or a saved address as intent;
- a universal commerce/order store;
- arbitrary Chat messages mutating source records;
- direct AI state mutation;
- automatic refunds, compensation, safety dismissal, Calendar edits, Agenda Journey creation, or relationship effects;
- a new Event Surface host or ordinary Event app;
- EVE-5, Mini Scene, CG, or media generation.

## 4. Product Invariants

1. Turning optional Event Runtime behavior off does not remove payment, order messaging, address editing, Map ETA, reroute, calling, support-case creation, or ordinary service replies.
2. Deleting or archiving an Event Instance cannot delete owner records that the chain referenced or caused through validated owner actions.
3. The Runtime observes user actions through owner facts; it does not infer intent from location, text alone, or historical preference.
4. A normal no-event path remains complete. User support cannot disappear because no optional event recipe matched.
5. Randomness may choose a response disposition or timing only after the trigger is valid. It cannot rewrite an existing pickup state, order address, call record, or user action.
6. Every random decision is generated once, persisted by decision key, and never rerolled on refresh, reopen, retry, or another surface.
7. AI output may classify or propose. Only an owner Adapter may apply canonical order, journey, Wallet, Chat, Phone, or schedule truth.
8. An Event Instance advances after an owner fact confirms the result, not merely after Runtime requested an action.
9. Native App entry and registered Chat service-account entry must converge on one commerce-owned Service Case rather than creating parallel business records.
10. Exactly one Module owns each canonical concept.

## 5. Module Ownership

### Commerce Owner

Food Delivery, Shopping, or a later commerce Module owns:

- orders and line items;
- merchant/store identity;
- fulfillment and after-sales eligibility;
- selected/submitted destination reference;
- native order interaction and Service Case truth;
- whether a requested action is accepted, rejected, expired, or already closed;
- business-facing status and native presentation;
- canonical links to Wallet, Map, Phone, Chat, and Event Runtime records.

Commerce owners do not own Map route calculation, Wallet ledger truth, Chat history, Phone transcript, or Event Instance progression.

### Chat

Chat owns:

- service-account identity and binding;
- Chat conversations and message history;
- reply, quote, unread, mute, fold, and return-context behavior;
- the source message reference used to request a commerce interaction.

A registered service account may submit a bounded interaction request to a commerce Adapter. Chat keeps the message; the commerce owner creates or reuses the Service Case. Chat does not own the order or apply the business result.

### Phone

Phone owns:

- call attempt, dialing, connected, ended, and not-connected state;
- participant references;
- transcript and presentation metadata;
- call summary;
- bounded structured resolution proposals plus evidence message references.

Phone does not commit the requested commerce or Map mutation. The source owner validates the proposal.

### Map

Map owns:

- stable place/anchor references;
- delivery journey and phase;
- pickup, route, ETA, progress, arrival, and reroute truth;
- journey revision and estimate freshness;
- validation of requested destination changes.

Food Delivery or Shopping may display a Map estimate projection or bounded stale-aware cache. They may not invent a parallel route estimate and present it as Map truth.

### Wallet

Wallet owns payment, reversal, receipt, ledger, currency, and idempotency truth. Event Runtime and commerce owners retain references only.

### Event Runtime

Event Runtime owns:

- Event Templates and Event Instances;
- trigger eligibility;
- deterministic/random decision records;
- cooldowns and caps where the recipe is optional;
- node progression, deadlines, timeout reconciliation, provenance, and audit;
- owner action requests and their correlation to later owner facts;
- terminal result codes.

Event Runtime does not own the source message, Service Case body, order, transcript, route, ETA, Wallet entry, or schedule.

## 6. Shared Interfaces

The exact implementation language may evolve, but field meaning and ownership must remain stable for the first slice.

### Commerce Order Reference V1

```js
{
  schemaVersion: 1,
  ownerModule: 'food_delivery',
  orderId: 'order_123',
  merchantId: 'merchant_9',
  fulfillmentId: 'fulfillment_4',
  lineItemIds: ['line_2'],
  ownerRevision: 3,
  sourceRoute: '/food-delivery?orderId=order_123',
}
```

Rules:

- it is a reference, not an order snapshot;
- `orderId`, `ownerModule`, and `ownerRevision` are required for mutation-capable requests;
- `merchantId`, `fulfillmentId`, and `lineItemIds` are required only when the requested action depends on them;
- display copy may be derived by the owner at render time and is not canonical in the reference;
- stale, missing, cross-owner, cross-merchant, or revision-mismatched references fail closed.

### Commerce Interaction Trigger V1

```js
{
  schemaVersion: 1,
  id: 'interaction_trigger_123',
  kind: 'commerce.user_service_interaction',
  initiatedBy: 'user',
  entrySurface: 'owner_app',
  channel: 'merchant',
  userAction: 'destination_change_requested',
  orderRef: { ownerModule: 'food_delivery', orderId: 'order_123', ownerRevision: 3 },
  sourceMessageRef: { ownerModule: 'food_delivery', messageId: 'message_8' },
  occurredAt: 1786720000000,
}
```

Allowed `entrySurface` values for the first slice:

- `owner_app`
- `chat_service_account`

Allowed initial `channel` values:

- `merchant`
- `rider`
- `platform`

The trigger records the user action. An optional model classification is a separate proposal and cannot replace `initiatedBy: user`, a valid order reference, or owner validation.

### Commerce Service Case Reference V1

```js
{
  schemaVersion: 1,
  ownerModule: 'food_delivery',
  caseId: 'case_123',
  orderId: 'order_123',
  caseType: 'destination_change',
  status: 'open',
  sourceInteractionId: 'interaction_trigger_123',
  ownerRevision: 1,
}
```

The commerce owner stores the Service Case body, messages, attachments, requested destination, item references, policies, and native status. Event Runtime stores only the reference and normalized result codes.

### Owner Fact V1

```js
{
  schemaVersion: 1,
  id: 'fact_123',
  type: 'food_delivery.address_change_requested',
  sourceModule: 'food_delivery',
  subjectRef: { kind: 'service_case', id: 'case_123', revision: 1 },
  correlationId: 'event_instance_123',
  causationId: 'interaction_trigger_123',
  resultCode: 'request_recorded',
  occurredAt: 1786720000000,
}
```

Facts are immutable observations. The payload may carry bounded references and normalized codes, not copied transcript, route, ledger, order, or case bodies.

### Owner Action Request V1

```js
{
  schemaVersion: 1,
  id: 'owner_request_123',
  actionKey: 'map.delivery_journey.request_reroute',
  targetModule: 'map',
  requestedByInstanceId: 'event_instance_123',
  contextRefs: {
    journeyId: 'journey_4',
    destinationAnchorId: 'anchor_8',
    expectedJourneyRevision: 2,
    serviceCaseId: 'case_123',
  },
  idempotencyKey: 'event_instance_123:reroute:2',
}
```

An owner request is not proof that the action happened. Runtime waits for a matching owner fact such as `map.delivery_rerouted` or `map.delivery_reroute_rejected`.

### Interaction Resolution V1

```js
{
  schemaVersion: 1,
  ownerModule: 'phone',
  sessionId: 'phone_session_4',
  resolutionContractKey: 'commerce.destination_change.v1',
  outcomeCode: 'accepted_new_destination',
  status: 'proposed',
  commitments: [
    {
      actorRef: 'rider_7',
      action: 'change_destination',
      objectRef: 'anchor_8',
      status: 'accepted',
      evidenceMessageIds: ['phone_message_11'],
    },
  ],
  resolvedAt: 1786720000000,
}
```

Initial outcome codes:

- `accepted_new_destination`
- `declined_destination_change`
- `no_clear_commitment`
- `call_not_connected`

The visible summary may be free-form and local/AI-assisted. The structured resolution is a bounded proposal. Missing evidence, unsupported outcomes, invalid participants, wrong source references, stale revisions, or impossible Map changes fail closed to `no_clear_commitment` or an owner rejection.

### Map Journey Estimate Reference V1

```js
{
  schemaVersion: 1,
  journeyId: 'journey_4',
  journeyRevision: 2,
  state: 'en_route',
  etaAt: 1786720900000,
  remainingSeconds: 900,
  calculatedAt: 1786720000000,
  sourceModule: 'map',
}
```

Commerce surfaces may cache this reference for suspension/reopen presentation, but must label or suppress stale estimates according to Map revision/freshness policy. A cache is not a second journey record.

## 7. Generic Event Instance V2

Event Instance V1 remains frozen for the landed EVE-2A/2B/2C Map/K-pop contract. EVE-4C must add a versioned Event Instance V2 or a compatible versioned extension; it must not silently change V1 field meaning.

The first V2 execution Interface needs:

```js
{
  schemaVersion: 2,
  id: 'event_instance_123',
  templateId: 'commerce.destination_change_after_fulfillment.v1',
  lifecycle: 'active',
  currentNodeId: 'wait_rider_response',
  contextRefs: {},
  decisionLedger: [],
  deadlines: [],
  pendingOwnerRequests: [],
  resultCodes: [],
  createdAt: 1786720000000,
  updatedAt: 1786720000000,
}
```

Required node kinds:

- `condition`: evaluate a bounded owner fact or snapshot;
- `branch`: select a path from normalized facts/results;
- `random_gate`: generate one persisted decision after eligibility;
- `await_fact`: wait for a correlated owner or user fact;
- `timeout`: reconcile an absolute deadline idempotently;
- `request_action`: submit an owner request through a registered Adapter;
- `terminal`: close with a normalized result code.

Event-specific node names and order stay in the template/recipe. They do not become new Simulation store fields or dedicated store actions.

## 8. Entry And Classification

### Native Owner App

An order detail, merchant thread, rider thread, or platform-support thread may create the trigger. Order context is bound by the owner and cannot be replaced by untrusted caller input.

### Registered Chat Service Account

A Chat service message may request a commerce interaction only when:

- the account has an explicit source binding for the commerce owner;
- the source Module is allowlisted for the requested action family;
- the user attaches or selects a valid order reference, unless the message is ordinary pre-sale/general support;
- the Chat message exists and belongs to that service thread;
- the commerce Adapter creates or reuses the canonical Service Case idempotently.

Without a valid order reference, Chat remains an ordinary conversation. It may ask the user to select an order, but it cannot create an order-specific event.

### Classification

Explicit owner UI actions may set a known `userAction`, such as `destination_change_requested` or `refund_requested`.

Free-form messages may produce an optional classification proposal:

- `destination_change`
- `wrong_item`
- `missing_item`
- `portion_or_quality_issue`
- `packaging_leak`
- `food_safety`
- `positive_feedback`
- `unexpected_bonus`
- `other`
- `unknown`

Classification chooses a candidate recipe or follow-up question. It does not itself authorize a mutation. `unknown` remains a valid ordinary support path.

## 9. Reference Address-Change Recipe

The reference event begins with `food_delivery.address_change_requested`, not a pickup-time random prompt.

```text
user requests a new destination
  -> owner validates order and creates/reuses Service Case
  -> read existing fulfillment phase
     -> before pickup: owner applies destination change directly, Map updates journey if one exists
     -> after pickup: choose/persist rider response disposition
        -> rider accepts in owner conversation: validate new anchor and request reroute
        -> rider declines: continue original destination and close with explicit result
        -> no response by deadline: owner offers Phone contact
           -> no call/connection by cutoff: change request expires; original destination continues
           -> connected call: wait for structured Phone resolution
              -> accepted proposal plus owner validation: request Map reroute
              -> declined/unclear/not connected: original destination continues
  -> close only after the corresponding owner fact is recorded
```

Important result codes include:

- `changed_before_pickup`
- `changed_after_pickup`
- `change_declined`
- `change_request_expired`
- `delivered_to_original_after_unresolved_change`
- `delivery_rerouted`
- `order_closed_before_resolution`

Do not use `delivered_wrong` without a separately owned handoff/receipt fact. Map arrival proves arrival at the routed anchor, not receipt by the intended human.

## 10. Other Commerce Event Families

### User-Reported Problems

Wrong item, missing item, portion/quality, leakage, and food-safety handling begin when the user submits an order-scoped interaction. The baseline support case always opens even when no optional event recipe matches.

Food safety is deterministic service/safety handling, not a playful random dismissal gate. Any refund, replacement, platform escalation, or Wallet consequence requires a separately accepted owner contract.

### Latent Fulfillment Facts

A merchant bonus item or free dish may be selected once during packing/fulfillment and persisted by the commerce owner as package/fulfillment truth. It may remain hidden until delivery. Event Runtime keeps only the decision/provenance reference needed for audit.

The hidden fact and the user's reaction are separate:

- `bonus_item_included` may exist before the user sees it;
- a later user message, rating, or feedback may start a user-initiated follow-up event.

### Subjective Feedback

The system cannot assert that food was delicious, disappointing, filling, or unsafe merely from a random decision. Subjective outcomes require a user rating, feedback action, or message. A model may classify the feedback but cannot invent the user's feeling.

## 11. No-Event And Failure Behavior

- A valid Service Case survives when Event Runtime is disabled, unavailable, or has no matching template.
- A failed classification becomes ordinary support, not a dropped message.
- A failed owner request leaves owner truth unchanged and records a normalized rejection result.
- Missing/stale references, duplicated message IDs, reused case IDs, wrong service-account bindings, cross-order lineage, and stale owner revisions fail closed.
- Suspension/reopen reconciles absolute deadlines idempotently. The PWA does not promise exact interactive timing while fully closed or OS-suspended.
- Optional AI failure leaves local copy, ordinary owner actions, and `unknown`/`no_clear_commitment` fallbacks available.

## 12. Migration From The Current Reference

The landed implementation preserves unrelated EVE-2 Event Instance V1 records and all existing owner records.

Required migration behavior:

1. add versioned pure normalizers for the new shared Interfaces before changing stores;
2. add commerce owner Service Case and interaction persistence independently of Event Runtime;
3. add Event Instance V2 persistence with backup/restore/reset/watch/diagnostics participation;
4. convert the Food Delivery address recipe to owner facts and registered action requests;
5. stop creating new `foodDeliveryCausalChains` after the conversion checkpoint;
6. migrate legacy EVE-4B causal chains into read-only legacy audit entries or valid V2 instances without fabricating a user trigger;
7. mark pickup-triggered legacy chains with a normalized `legacy_reference_trigger` result rather than claiming `user_service_interaction` provenance;
8. retain old owner order/payment/journey/message/phone references exactly;
9. remove the specialized persistence field only after migration, backup round-trip, and World Hub lineage tests pass;
10. keep Map as the only registered production Event Surface host.

## 13. Implementation Sequence

This sequence records the landed implementation order. `docs/roadmap/TODO_ROADMAP.md` remains the only live execution board.

1. freeze `CommerceOrderReferenceV1`, `CommerceInteractionTriggerV1`, `CommerceServiceCaseReferenceV1`, `OwnerFactV1`, `OwnerActionRequestV1`, `InteractionResolutionV1`, and `MapJourneyEstimateReferenceV1` with fixtures and pure tests;
2. implement Food Delivery-native Service Case and merchant/rider/platform channel ownership so ordinary support works with Event Runtime disabled;
3. implement generic Event Instance V2 node progression, decision ledger, absolute deadlines, action-request correlation, persistence, and migration;
4. convert the current address-change reference to the user-triggered recipe and remove new writes to the specialized causal-chain path;
5. deepen Phone into a reusable call-session and resolution Interface while keeping transcript and summary Phone-owned;
6. expose Map journey estimates through the stable reference Interface and make Food Delivery presentation consume them without inventing another estimate;
7. add the registered Chat service-account entry Adapter and prove native/Chat entry idempotently converge on one Service Case;
8. add a Shopping Adapter for order reference and destination-change/service-case capability so the commerce seam has two real owner Adapters;
9. add contract fixtures for one user-reported problem and one latent positive fulfillment fact without shipping another user-facing event family;
10. run the full behavior, persistence, governance, and user-facing validation required by the touched Modules.

## 14. Acceptance

Implementation acceptance requires tests to prove:

1. Food Delivery messaging, service cases, address changes, Map ETA, calls, and payment still work with optional events disabled;
2. native owner entry and registered Chat service-account entry create/reuse one Service Case for the same user action;
3. missing or invalid order references cannot create an order-specific event;
4. free-form text or model classification alone cannot mutate an order;
5. existing fulfillment phase is read from owner truth rather than randomized at branch time;
6. every random response decision is persisted once and survives reload/backup;
7. Phone `call_started`, `connected`, and structured resolution are distinct, and a summary alone cannot commit a destination change;
8. owner requests are idempotent and Event Instances advance only after matching owner facts;
9. Food Delivery displays Map-owned estimate truth with revision/freshness behavior and cannot silently invent ETA;
10. legacy EVE-4B persistence migrates without dropping owner references or fabricating user intent;
11. Food Delivery and Shopping satisfy the shared commerce Interface through separate Adapters;
12. a user-reported issue fixture and a latent-positive fixture run through the generic Runtime without adding event-specific Simulation store methods;
13. no Food Delivery Event Surface, Event Home app, Calendar/Agenda Journey mutation, direct Wallet write, or direct Chat/Phone/Map source mutation is introduced.

The current tree implements all thirteen checks through the shared contract/fixture suite, Food Delivery/Shopping owner tests, Simulation V5 persistence/runtime tests, Phone/Map focused tests, and the desktop plus simulated Pixel 5 owner-native browser journey. Final repository-wide validation remains recorded in the package handoff and roadmap rather than duplicated here.

## 15. Architecture Depth Checks

The shared commerce interaction Module earns its seam only when at least two entry Adapters or owner Adapters reuse the Interface.

Deletion tests:

- deleting the generic Event Instance progression should force every recipe to reimplement waits, deadlines, decision persistence, owner-request correlation, and terminal audit;
- deleting the commerce interaction Interface should force Food Delivery, Shopping, and Chat service entry to duplicate order-reference validation and Service Case lineage;
- deleting a thin pass-through Adapter should not change product behavior; such an Adapter should be removed or deepened before acceptance.

The Interface is the test surface. Tests should not reach through it to assert private implementation details when the same behavior can be proven through owner facts, owner requests, and persisted Event Instance results.

## 16. Do Not Do

1. Do not infer real-user intent from coordinates, current place, saved address, purchase history, or model guesswork.
2. Do not let an event recipe own ordinary platform messaging, support cases, calling, ETA, payment, or address-editing capability.
3. Do not make an AI summary the mutation authority.
4. Do not randomize an owner fact that already exists.
5. Do not reroll a response disposition after reopen or retry.
6. Do not create a universal order store or copy order bodies into Event Runtime.
7. Do not duplicate Chat history inside the commerce owner; retain source message references where Chat is the entry.
8. Do not let Chat service accounts claim business success before the source owner confirms it.
9. Do not mark arrival at a coordinate as proof of receipt by a person.
10. Do not turn a user-reported safety issue into an optional entertainment branch.
11. Do not create Calendar, Agenda Journey, hunger, satisfaction, relationship, or social-feed consequences without separately accepted owner facts and Adapters.
12. Do not restore the withdrawn Food Delivery Event Surface or advance EVE-5 from this contract.
