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
10. Food Delivery platform mode now opens as a pseudo-folder style surface: a fixed Food platform entry plus shop-app restaurant entries. Category keys continue to filter shops and do not own order/cart behavior.
11. Moon Bistro now has the first Food Delivery shop template treatment, `dark_tray_menu`, while checkout and order ownership remain in Food Delivery.
12. App Store can now surface Food Delivery restaurants as `food_delivery`-bound folder mini apps, save App Store-side display/icon/cover/short-description/tag/template facade presentation for those entries, show their target-folder ownership boundary, and add/remove them from the target folder without deleting source records. Food Delivery reads presentation and install-state fields for launcher/store display. App Store also surfaces Shopping platform services as `shopping`-bound folder mini apps, opens Shopping with service/shop-entry context, lets Shopping render the same App Store-side cover facade, and lets Shopping hide uninstalled service mini apps from its folder list. `Add mini app` in App Store is a target-folder handoff: Food Delivery receives a restaurant-creation context and Shopping receives a Shopping-owned creation workspace context. This is install-entry presentation, target-folder placement, and owner handoff only: App Store does not own restaurant records, menus, products, carts, checkout, orders, shop favorites/recent lists, consumer category filters, Wallet/Assets handoffs, Map/Calendar/logistics handoffs, or Chat service pushes.
13. Food Delivery menu items now have a focused item-detail sheet: tapping a dish opens description, base ingredients, image source, and add-to-cart; a small edit icon updates only that item copy/image through Food Delivery-owned menu records.
14. Moon Bistro now opens as a shop-first surface: the Food platform hero/list chrome is hidden, the store owns the first screen, cart becomes the ordering anchor, and Map/order/Wallet support panels are folded behind Order & delivery.

Still incomplete:

1. Assets and Stock still need deeper product loops;
2. future ownership links from Shopping to Assets and from Stock to cue systems still need clearer rollout order.
3. service-account pushes are functional and boundary-safe, but later visual/copy polish can make them feel more brand-specific.
4. Food Delivery store surfaces have the first route and IA baseline, but still need the next visual/UX polish pass for richer real-delivery-app ergonomics.
5. App Store mini-app editing now has the generalized binding-target baseline, Shopping-bound generated entry support, cover facade management, installed/not-installed target-folder placement, and create-shop V0 owner handoff. A true custom Shopping store/service record model remains a Shopping-owned product decision if user-created Shopping shops need more than preset platform services.

## 2. Recommended Next Slice

1. Continue tightening Wallet cleanup rules and downstream record explainability.
2. Expand asset and stock loops only after ownership boundaries stay clear.
3. Keep service-account push additions source-owned: do not auto-create Chat service identities from commerce stores.
4. Treat the current `补给站` and `救援调度` paths as trial app-binding examples before broadening to auctions, reservations, subscriptions, or more dispatch behavior.

5. Continue Food Delivery from store-surface polish, sticky cart ergonomics, and per-store visual differentiation without splitting the shared order system.
6. When App Store shop management resumes, start from `docs/product-decisions/APP_STORE_ENTRY_TYPES_AND_FOOD_SHOP_APPS.md`; continue from the explicit binding-target/create-handoff baseline before adding more Food Delivery-only polish.
7. When Food Delivery visual polish resumes, start from `FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md` and keep the first slice focused on Moon Bistro before broadening to more shop templates.

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
