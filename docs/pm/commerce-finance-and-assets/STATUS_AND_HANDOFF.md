# Commerce Finance And Assets Status And Handoff

Updated: 2026-06-10

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
8. The active World Pack can expose Food Delivery dispatch entries for `survival_city` and confirmed nonstandard `dispatch_board` entries, but an app binding is now launch context only unless it carries an explicit `uiThemePackage.enabled=true`. Without a Food Delivery UI theme package, Food Delivery uses its original UI and defaults while keeping restaurants, menus, carts, food orders, and delivery events owned by Food Delivery. World Pack boundary explanations are documented and tested, but they should not render as an in-app explainer card.
9. Food Delivery now has a platform/store split: the Food entry opens a platform browser, the pseudo-folder opens peer shop mini-app surfaces, and cart/order/event/Wallet/Map/Chat ownership remains centralized in Food Delivery and the related source modules.
10. Food Delivery platform mode now opens as a pseudo-folder style surface: a fixed Food platform entry plus shop-app restaurant entries. Category keys continue to filter shops and do not own order/cart behavior.
11. Moon Bistro now has the first Food Delivery shop template treatment, `dark_tray_menu`, while checkout and order ownership remain in Food Delivery.
12. App Store can now surface Food Delivery restaurants as `food_delivery`-bound folder mini apps, save App Store-side display/icon/cover/short-description/tag/template facade presentation for those entries, show their target-folder ownership boundary, and add/remove them from the target folder without deleting source records. Food Delivery reads presentation and install-state fields for launcher/store display. App Store also surfaces Shopping platform services as `shopping`-bound folder mini apps, opens Shopping with service/shop-entry context, lets Shopping render the same App Store-side cover facade, and lets Shopping hide uninstalled service mini apps from its folder list. `Add mini app` in App Store is a target-folder handoff: Food Delivery receives a restaurant-creation context and Shopping receives a Shopping-owned creation workspace context. This is install-entry presentation, target-folder placement, and owner handoff only: App Store does not own restaurant records, menus, products, carts, checkout, orders, shop favorites/recent lists, consumer category filters, Wallet/Assets handoffs, Map/Calendar/logistics handoffs, or Chat service pushes.
13. Food Delivery menu items now have a focused item-detail sheet: tapping a dish opens description, base ingredients, image source, and add-to-cart; a small edit icon updates only that item copy/image through Food Delivery-owned menu records.
14. Moon Bistro now opens as a shop-first surface: the Food platform hero/list chrome is hidden, the store owns the first screen, cart becomes the ordering anchor, and Map/order/Wallet support panels are folded behind Order & delivery.
15. Moon Bistro checkout is now shop-local: checkout opens a confirmation sheet before creating an order, shop orders/events/Wallet suggestions are scoped to the opened shop, and Food Platform no longer renders shop cart/order/Wallet/Map support panels as a total controller.
16. Food Platform now has a consumer-facing discovery homepage instead of the earlier backend-like platform card stack. It shows a brand/address header, real search input, project-owned transparent rider asset near the search field, a shorter horizontal ad-carousel rail, simplified category shortcuts, a horizontal platform-merchant rail, merchant detail/menu in a focused sheet, and a light bottom navigation row. Search filters platform-internal merchants by shop, cuisine, category, badge, and menu text. The platform now pulls homepage banners, merchant photos, and rider decoration from `public/images/ui-assets/apps/food-delivery/platform/` rather than remote placeholder images. The platform no longer opens or aggregates same-level shop mini apps such as Moon Bistro. The shop creation/menu editor is hidden from ordinary platform browsing and appears only for the App Store create-shop handoff. The bottom navigation remains discovery-only; `Orders` must not become an aggregate peer-shop order controller.
17. Moon Bistro's first visual asset pass is now connected to the project UI asset library: fresh seed data uses the local Moon Bistro cover and dish photos, the dark shop header uses that cover as an immersive background, dish cards keep the circular embedded-photo treatment, and the one-dish edit sheet still lets users replace copy and images through URL/Gallery sources.
18. Moon Bistro now has a fuller browseable shop menu: fresh or migrated saves receive nine seeded dishes across warm soup, rice set, grill, seafood, greens, pasta, and dessert sections without overwriting user-edited dish copy/images. The dark shop surface adds a sticky side section rail, filters the right-side dish list by section, keeps circular embedded dish photos, hides the empty cart until the user adds food, and keeps order/Wallet/Map support hidden until there is real order support content.
19. Wallet now has a persisted primary-currency setting, and Food Delivery active pricing follows that finance setting instead of hard-coded UI currency text. Current restaurant/menu display, platform demo merchant fees, cart totals, checkout, and new food orders use the Wallet primary currency. Existing food orders and Wallet transactions keep the currency they were created with, so changing the finance setting does not silently rewrite historical ledger records.
20. Wallet now also owns the shared currency registry and editable reference exchange-rate table. The default financial coordinate is USD/CNY, system currencies are available by default, and WorldBook Current World Pack can inject custom world currencies into Wallet. Wallet keeps the primary-currency choice and per-currency CNY reference rates; World Pack stores only the world-specific currency declarations. Chat transfer cards and sourced Chat ledger records now use the Wallet currency options instead of a hard-coded CNY text field.

Still incomplete:

1. Assets and Stock still need deeper product loops;
2. future ownership links from Shopping to Assets and from Stock to cue systems still need clearer rollout order.
3. service-account pushes are functional and boundary-safe, but later visual/copy polish can make them feel more brand-specific.
4. Food Delivery store surfaces have the first route and IA baseline plus Moon Bistro's local-asset/category-rail/finance-currency polish, but still need more visual/UX passes for responsive density, checkout microcopy, detail-sheet polish, and more distinct shop templates.
5. App Store mini-app editing now has the generalized binding-target baseline, Shopping-bound generated entry support, cover facade management, installed/not-installed target-folder placement, and create-shop V0 owner handoff. A true custom Shopping store/service record model remains a Shopping-owned product decision if user-created Shopping shops need more than preset platform services.

## 2. Recommended Next Slice

1. Continue tightening Wallet cleanup rules, downstream record explainability, and the currency registry/rate-editing UX.
2. Expand asset and stock loops only after ownership boundaries stay clear.
3. Keep service-account push additions source-owned: do not auto-create Chat service identities from commerce stores.
4. Treat the current `补给站` and `救援调度` paths as trial app-binding examples before broadening to auctions, reservations, subscriptions, or more dispatch behavior.

5. Continue Food Delivery from store-surface polish, sticky cart ergonomics, and per-store visual differentiation. Keep Food Platform as a peer discovery mini app, not a visible aggregate order controller for shop mini apps.
6. When App Store shop management resumes, start from `docs/product-decisions/APP_STORE_ENTRY_TYPES_AND_FOOD_SHOP_APPS.md`; continue from the explicit binding-target/create-handoff baseline before adding more Food Delivery-only polish.
7. When Food Delivery visual polish resumes, start from `FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md` and keep the first slice focused on Moon Bistro before broadening to more shop templates.
8. Next Food Platform polish should add richer platform-specific empty states, real favorite/recent behavior for platform-internal merchants, and real banner rotation/state if the ad rail becomes interactive. Do not surface peer-shop orders as a platform aggregate.

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
