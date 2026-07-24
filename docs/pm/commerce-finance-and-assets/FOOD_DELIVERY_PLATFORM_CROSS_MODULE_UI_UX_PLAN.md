# Food Delivery Platform Cross-Module UI/UX Coordination Plan

Updated: 2026-07-24

Status: `DEFERRED_COORDINATION_REFERENCE`

## 1. Purpose And Authority

This document preserves the reviewed UI/UX direction for connecting Food Platform orders to Map, Chat, Wallet, notifications, and later immersive systems.

It is not a live roadmap, implementation queue, architecture acceptance, or authorization to begin cross-module work. `docs/roadmap/TODO_ROADMAP.md` remains the only live execution board. Before implementation, the owning package handoff must promote one exact slice and the relevant architecture or execution workgroup must confirm its contract.

Current attention remains on Food Delivery visual polish. The future integration direction recorded here should guide that polish so the current UI does not need to be rebuilt when cross-module behavior is later approved.

## 2. Product Boundary

Food Delivery remains the owner of:

- platform merchant cart and checkout truth;
- platform order records, lifecycle state, and delivery events;
- the user-facing order status and order-detail projection;
- the source references used by downstream modules.

Connected modules remain supporting owners:

| Module | Owns | Must Not Own |
| --- | --- | --- |
| Map | addresses, route context, trip/location continuity, rider-location presentation | food order status or order history |
| Chat | service-account identity, conversation history, unread state, replies, and source links | food order truth, payment truth, or delivery state |
| Wallet | ledger records, balances, currencies, and imported expense records | cart, checkout, order status, or fulfillment |
| Notifications | delivery of user-facing alerts and source navigation | canonical order or event records |
| Relationship Runtime | downstream shared-meal or relationship effects when explicitly admitted | duplicate primary order memory or food-order truth |

Food Platform may aggregate only orders from merchants that exist inside Food Platform. It must never aggregate Moon Bistro or other peer shop mini-app orders.

## 3. Baseline To Preserve

The current baseline already provides:

- a discovery-first Food Platform homepage;
- separate route-driven Search, Saved, checkout, order list, and order detail pages;
- a focused platform-merchant menu sheet and a single-merchant platform cart;
- persisted `platformOrders` isolated from peer shop-app `orders`;
- order snapshots for items, amount, delivery fee, address, note, payment choice, and ETA;
- consistent click-through from every platform order card to the order detail page;
- the existing platform palette and project-local PNG assets.

The visual composition, route structure, platform/shop separation, and existing assets should be retained unless a later promoted slice proves that a specific change is necessary.

## 4. Current Gaps

The current order flow is a complete static checkout baseline, but it is not yet a live fulfillment experience.

1. Platform orders remain at `placed`; the progress hero and list badge are visually hard-coded.
2. Platform orders have no platform-specific event timeline, rider assignment reference, payment status, or exception state.
3. The order detail page offers only navigation actions, so Map, Chat, and Wallet have no visible entry points.
4. Platform merchant definitions live in the view and do not yet provide stable pickup location or service identity context for other modules.
5. Delivery-address choice and saved merchants are presentation-local state rather than durable user preferences or Map-backed address choices.
6. Checkout and order detail still render the platform bottom navigation even though they are focused execution/detail surfaces.
7. Some visible copy explains implementation boundaries, such as not connecting Wallet or not mixing peer apps, instead of speaking as an immersive consumer product.
8. Raw internal order identifiers are displayed as the primary user-facing order number.

## 5. Target Information Architecture

Use information depth, not container type, as the organizing rule.

| Depth | User Question | Food Platform Surface | Expected Content |
| --- | --- | --- | --- |
| L0 Overview | What is happening? | Orders list | merchant, current state, ETA or completion time, amount, exception cue |
| L1 Focus | What is happening with this order? | Order detail | status hero, latest event, route/payment summary, item and amount snapshot |
| L2 Manage | Let me find or change something | Orders history, address management, saved merchants | active/history filtering, reusable addresses, durable saved shops |
| L3 Execute | Help me complete this action | Checkout and status-specific action flows | submit order, cancel request, contact service, open tracking, import expense |

Checkout and persistent order detail should not render the platform bottom navigation. They should use a deterministic back action and a status-specific action area. Bottom navigation remains on Home, Search, Orders, Saved, and Mine.

## 6. Status-Driven UI Matrix

The exact lifecycle contract requires architecture review. The UI should be able to represent at least the following projection without changing page structure.

| Order State | Primary Message | Visible Summary | Contextual Actions | Supporting Module |
| --- | --- | --- | --- | --- |
| `placed` | Order submitted | merchant confirmation pending, current ETA | cancel request, contact merchant | Chat only when promoted |
| `accepted` / `cooking` | Merchant is preparing | updated ETA, latest merchant event | contact merchant | Chat notifications |
| `rider_pickup` | Rider is delivering | rider summary, route card, live ETA | view rider location, contact delivery | Map + Chat |
| `delivered` | Order delivered | completion time, payment state | reorder, rate, record expense | Wallet; relationship effect only when explicit |
| `cancelled` | Order cancelled | actor, reason, refund/payment state | view details, reorder | Wallet only if a ledger correction exists |
| exception event | Delivery update | delay, address change, failed contact, or other event | review event, open relevant module | Map or Chat according to event type |

The success hero is appropriate immediately after checkout. When an order is reopened later, the hero must derive its title, color, icon, progress, and actions from the current order state instead of continuing to say “Order placed.”

## 7. Food Delivery-Owned Foundation Needed Before Integration

The architecture workgroup should review these as proposed seams, not accepted schemas.

### 7.1 Platform Merchant Context

A cross-module-capable platform merchant projection needs stable, Food Delivery-owned context such as:

- merchant ID and display name;
- pickup address or Map location reference;
- delivery distance and ETA inputs;
- Food Delivery service key or contact-routing hint;
- operating state and fulfillment capability;
- presentation image references that remain owned by Food Delivery.

The platform merchant catalog should not remain only as a view constant once another module needs to resolve merchant identity.

### 7.2 Platform Order Context

A future platform order contract should consider:

- canonical status and status timestamps;
- append-only delivery-event snapshots;
- pickup and drop-off snapshots;
- payment method and separate payment status;
- optional rider/dispatch reference without copying Chat identity ownership;
- source module, source ID, and return/deep-link context;
- downstream import markers or source references without copying Wallet records;
- persisted-data compatibility and normalization for existing `platformOrders`.

### 7.3 Food Delivery Actions

Platform lifecycle actions must be platform-specific or use a reviewed shared order abstraction. They must not silently call the peer shop-app checkout action.

Future actions may include:

- update platform-order status;
- append a platform-order event;
- resolve an order by a platform-aware source route;
- expose a read-only Map handoff;
- create a Chat notification plan after a source event commits;
- expose an explicit Wallet expense suggestion after delivery.

## 8. Cross-Module UI Contracts

### 8.1 Map

When a rider or delivery event exists, order detail may show a compact route card containing pickup, drop-off, latest location cue, distance, and ETA. “View rider location” opens Map with the order/event source context.

Map owns coordinates, route calculation, trip state, and location continuity. Food Delivery stores the order event and presents only the Map-owned context snapshot or deep link.

### 8.2 Chat

“Contact merchant” and “Contact delivery” should open an existing Food Delivery service conversation with the platform order as source context. Chat owns messages, unread state, replies, and service identity.

Food Delivery notifications must deep-link back to the correct platform order. Existing peer shop-app routes cannot be assumed to resolve `platformOrders` without a platform-aware route contract.

### 8.3 Wallet

The UI must distinguish payment method from payment status. Checkout may preserve an App-local choice before Wallet integration, but implementation-boundary copy must not be visible to the user.

After delivery, order detail may expose an explicit “Record expense” action or imported state. Wallet owns the ledger result. Food Delivery retains the source order and does not infer a completed ledger write from the payment label alone.

### 8.4 Notifications And Return Navigation

Status and exception notifications should carry stable platform-order source references. Opening a notification, Chat message, or Map context should preserve a deterministic return target rather than always returning to the Food Platform homepage.

## 9. Visual Preparation During The Current Polish Phase

The current visual phase may proceed without implementing any cross-module behavior. It should preserve the following insertion points:

1. Keep the order-detail status hero flexible enough for different titles, colors, icons, progress, and exceptions.
2. Reserve a compact status-specific action area below the status hero or above the order summary.
3. Allow an optional route/context card to appear without changing the item and amount hierarchy.
4. Design order-list badges and secondary metadata for variable status text rather than one fixed “Placed” label.
5. Hide bottom navigation on checkout and order detail; keep one clear back action.
6. Replace raw IDs with short user-facing order numbers plus an optional copy control.
7. Replace implementation explanations with immersive product copy. Ownership boundaries stay in docs and tests.
8. Keep payment method and future payment status as separate rows.
9. Keep active-order, history, empty, cancelled, delayed, and delivered visual states within the existing palette rather than creating another app theme.
10. Do not change the existing PNG asset library merely to prepare these future seams.

These visual adjustments do not authorize Map, Chat, Wallet, notification, or relationship mutations.

## 10. Future Coordination Sequence

This sequence is advisory. A promoted roadmap slice and owning handoff remain required before each implementation stage.

### Stage A: Visual Preparation

Owner: current Food Delivery visual work.

- polish responsive density, status hero, list cards, checkout microcopy, and detail hierarchy;
- preserve route and action-card insertion points;
- do not add cross-module writes.

### Stage B: Architecture Review

Owner: architecture workgroup.

- accept or revise platform merchant and platform order context;
- define lifecycle/event semantics and persisted-data migration;
- define source/deep-link and return-target contracts;
- confirm Map, Chat, Wallet, notification, and relationship ownership;
- decide whether platform and peer shop orders use parallel actions or a reviewed shared abstraction.

### Stage C: Food Delivery Internal Lifecycle

Owner: execution workgroup, Food Delivery package.

- implement dynamic platform status and events without downstream side effects;
- drive order list, detail hero, timeline, exceptions, and contextual action visibility from state;
- preserve existing platform/peer-shop isolation.

### Stage D: Map And Chat Handoffs

Owner: execution workgroup with Map and Chat contract review.

- add read-only route/rider context and Map navigation;
- add service-conversation actions and source notification deep links;
- keep order state in Food Delivery.

### Stage E: Wallet And Immersive Effects

Owner: execution workgroup with Wallet and relationship contract review.

- expose delivered-order expense suggestions and imported state;
- add shared-meal or relationship effects only through explicit source lineage;
- add rating, reorder, and other post-delivery product behavior as separately accepted slices.

## 11. Acceptance Gates

### Architecture Workgroup

- one owner is named for every canonical field and mutation;
- existing `platformOrders` remain readable or have a tested migration and rollback plan;
- platform and peer shop-app routes cannot resolve or mutate the wrong order collection;
- deep links identify platform order context without copying downstream module state;
- event ordering, dedupe, and idempotency rules are explicit;
- Wallet and Chat side effects happen only after Food Delivery source commits.

### Execution Workgroup

- every order state has a coherent list card, detail hero, actions, and empty/exception behavior;
- Map, Chat, and Wallet entry points appear only when their source context is available;
- no platform action calls the peer shop-app checkout flow by accident;
- desktop and mobile routes have no horizontal overflow, incoherent overlap, dead visible actions, or page errors;
- focused store, component, persistence, deep-link, and desktop/mobile E2E tests cover the promoted slice;
- package handoff and only the affected ownership contracts are synchronized.

## 12. Risks And Guardrails

1. Do not let the attractive order-detail page imply a live rider or paid transaction before that source truth exists.
2. Do not duplicate Map route state, Chat history, or Wallet ledger records inside `platformOrders`.
3. Do not aggregate peer independent shop-app orders into Food Platform.
4. Do not reuse ordinary shop checkout merely because it already emits Chat side effects.
5. Do not preserve implementation-boundary explanations as visible consumer copy.
6. Do not begin all integrations in one slice; promote and validate one ownership boundary at a time.
7. Do not let this document become a second roadmap. Update or replace it when architecture acceptance establishes a stronger contract.

## 13. Evidence And Reading Order

When a future slice is promoted, start with:

1. `docs/roadmap/TODO_ROADMAP.md`
2. `docs/pm/commerce-finance-and-assets/README.md`
3. `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
4. `docs/pm/commerce-finance-and-assets/PRODUCT_BOUNDARY.md`
5. `docs/pm/commerce-finance-and-assets/IMPLEMENTATION_WORKSTREAMS.md`
6. this coordination plan
7. `docs/pm/commerce-finance-and-assets/FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md`
8. focused Map, Chat, Wallet, notification, relationship, persistence, and event contracts required by the promoted slice

Primary implementation evidence currently lives in:

- `src/views/FoodDeliveryView.vue`
- `src/stores/foodDelivery.js`
- `src/stores/map.js`
- `src/stores/chat.js`
- `src/stores/wallet.js`
- `tests/food-delivery-view.test.js`
- `tests/food-delivery-store.test.js`
- `e2e/food-delivery-platform-interactions.spec.js`
