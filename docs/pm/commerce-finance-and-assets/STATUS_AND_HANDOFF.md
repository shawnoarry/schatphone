# Commerce Finance And Assets Status And Handoff

Updated: 2026-06-01

This file is the handoff page for Shopping, logistics, Food Delivery, Wallet, Assets, and Stock work.

## 1. Current Status

Status: `PARTIAL_DONE`

What is already landed:

1. Shopping and Food Delivery both have solid order-lifecycle baselines;
2. logistics and delivery status concepts exist and can connect into Chat/service-account style messaging;
3. Shopping and Food Delivery can feed Wallet as downstream records;
4. gift and shared-meal relationship-memory flows are now wired through Wallet recording, with Wallet support facts treated as supporting-only lineage inside the upstream order memory;
5. delivery route context can be shown as read-only context without moving order ownership into Map.
6. Shopping checkout, Shopping logistics events, Food Delivery checkout, and Food Delivery order events can push service-account notification messages into existing Chat Directory service accounts.
7. The active World Pack can now provide a Shopping marketplace context for `survival_city`: WorldBook opens Shopping as `补给站`, and Shopping offers a safe Daily Fresh / Grocery filter without creating or mutating commerce records.
8. The active World Pack can now provide a Food Delivery dispatch context for `survival_city` and confirmed nonstandard `dispatch_board` entries: Food Delivery shows the world-app hero/banner, defaults to the Nearby category when no explicit category is present, and preserves `worldPack`/`worldApp` route context while Food Delivery keeps restaurants, menus, carts, food orders, and delivery events.
9. Food Delivery now has a platform/store split: the Food entry opens a platform browser, restaurant cards open route-query store mini-app surfaces, and cart/order/event/Wallet/Map/Chat ownership remains centralized in Food Delivery and the related source modules.

Still incomplete:

1. Assets and Stock still need deeper product loops;
2. future ownership links from Shopping to Assets and from Stock to cue systems still need clearer rollout order.
3. service-account pushes are functional and boundary-safe, but later visual/copy polish can make them feel more brand-specific.
4. Food Delivery store surfaces have the first route and IA baseline, but still need the next visual/UX polish pass for richer real-delivery-app ergonomics.

## 2. Recommended Next Slice

1. Continue tightening Wallet cleanup rules and downstream record explainability.
2. Expand asset and stock loops only after ownership boundaries stay clear.
3. Keep service-account push additions source-owned: do not auto-create Chat service identities from commerce stores.
4. Treat the current `补给站` and `救援调度` paths as trial app-binding examples before broadening to auctions, reservations, subscriptions, or more dispatch behavior.

5. Continue Food Delivery from store-surface polish, sticky cart ergonomics, and per-store visual differentiation without splitting the shared order system.

## 3. Do Not Do

1. Do not let Wallet become the owner of Shopping or Food Delivery business state.
2. Do not let Assets turn into a ledger.
3. Do not let logistics become a storefront.
4. Do not let Stock absorb other finance domains without a clear decision.
5. Do not let World Pack app bindings create products, carts, orders, Wallet records, Assets records, Calendar cues, or Chat messages by themselves.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/product-decisions/HOME_FOLDER_SHOPPING_ASSETS_DIRECTION.md`
6. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when relationship-support semantics changed
