# Commerce Finance And Assets Status And Handoff

Updated: 2026-07-25

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
16. Food Platform now has a consumer-facing discovery homepage instead of the earlier backend-like platform card stack. It shows a brand/address header, project-owned rider asset near the search field, a shorter horizontal ad-carousel rail, ten icon-first category shortcuts in a stable two-row grid, a horizontal platform-merchant rail, merchant detail/menu in a focused sheet, and a light bottom navigation row. The restored category density follows the useful part of the 2026-06-08 layout while replacing its duplicate Chicken/Pizza routing with distinct platform filters and adding meaningful Noodles/Sushi filters. Category source sheets remain reference-only because their checkerboard is baked into RGB PNGs; ten exact transparent-PNG requirements are exposed through `data-required-asset` and documented for later asset rounds. Follow-up layout and interaction passes keep the existing colors, banners, rider, and healthy merchant imagery while adding a delivery-address chooser, a lightweight greeting, richer merchant rating/delivery/ETA summaries, a real expand/collapse path from the merchant rail into a full list, hidden native rail scrollbars, focused notification/cart panels, functional platform favorites, and route-driven campaign pages for all three homepage banners. The collapsed `All` rail now shows three shops randomly selected once per mounted platform session, remains stable during that session, and leaves the complete eleven-shop set to `View all`; category filters continue to show complete matching results. The three campaigns now have different product jobs and layouts: membership claims/uses a weekly delivery benefit, Weekend Picks uses a large-concept poster plus three listed rewards and a one-draw App-local reveal, and the lunch editorial recommends specific dishes. The weekend result is presentation-only and creates no Wallet, Assets, Chat, Map, or order effect. Mine is a route-driven platform account page with order/saved summaries, selectable addresses, membership, past-order, delivery-contact, and update entries; delivery contact remains anchored to platform-owned orders and does not create Chat behavior. Search and Saved open distinct route-driven platform pages instead of reusing the homepage composition; platform search filters internal merchants by shop, cuisine, category, badge, and menu text. Platform merchant menus support add/decrease/increase actions backed by a persistent single-merchant platform cart with line totals and quantity feedback. All eleven merchants retain five stable menu indices but now use shop-specific naming voices; four selected merchants use reusable transparent-Logo cover contracts while the others keep food photography or food-photo requirements. The cart continues into a route-driven confirmation page, App-local payment choice, submitted-order detail/success page, and platform-only order list backed by persisted `platformOrders`. This flow does not call the independent-shop checkout action and does not create Chat, Wallet, or Assets effects. Platform cart/order state stays separate from restaurant `cartItems`/`orders` and never merges same-level independent shop apps such as Moon Bistro. The platform pulls homepage banners, mixed merchant photo/Logo visuals, and rider decoration from `public/images/ui-assets/apps/food-delivery/platform/` rather than remote placeholder images. The shop creation/menu editor is hidden from ordinary platform browsing and appears only for the App Store create-shop handoff.
17. Moon Bistro's first visual asset pass is now connected to the project UI asset library: fresh seed data uses the local Moon Bistro cover and dish photos, the dark shop header uses that cover as an immersive background, dish cards keep the circular embedded-photo treatment, and the one-dish edit sheet still lets users replace copy and images through URL/Gallery sources.
18. Moon Bistro now has a fuller browseable shop menu: fresh or migrated saves receive nine seeded dishes across warm soup, rice set, grill, seafood, greens, pasta, and dessert sections without overwriting user-edited dish copy/images. The dark shop surface adds a sticky side section rail, filters the right-side dish list by section, keeps circular embedded dish photos, hides the empty cart until the user adds food, and keeps order/Wallet/Map support hidden until there is real order support content.
19. Wallet now has a persisted primary-currency setting, and Food Delivery active pricing follows that finance setting instead of hard-coded UI currency text. Current restaurant/menu display, platform demo merchant fees, cart totals, checkout, and new food orders use the Wallet primary currency. Existing food orders and Wallet transactions keep the currency they were created with, so changing the finance setting does not silently rewrite historical ledger records.
20. Wallet now also owns the shared currency registry and editable reference exchange-rate table. The default financial coordinate is USD/CNY, system currencies are available by default, and WorldBook's optional capability Packs can inject custom world currencies into Wallet. Wallet keeps the primary-currency choice and per-currency CNY reference rates; World Pack stores only the world-specific currency declarations. Chat transfer cards and sourced Chat ledger records now use the Wallet currency options instead of a hard-coded CNY text field.
21. Shopping can now be represented in Chat through source-owned `share_card` objects. The active Chat `+` Shopping send path converts ordinary products into `product_link` cards and reserves direct gift wording for gift-card / voucher / virtual-gift-like products. This removes the earlier implication that every product card is an instant user-owned gift while keeping Shopping as the owner of products, checkout, orders, Wallet handoff, Assets suggestions, and later gift/redeem state.
22. Peach Cloud is now the second built-in independent Food Delivery shop app and the first dedicated `dessert_window` implementation. Exact Figma home node `47:23` is adapted into a pink-mist search/greeting header, five SVG category shortcuts, Best Seller rail, milkshake promotion, two-column Recommend grid, and a lightweight Pink Mist fixed navigation with Petal Rouge selected states rather than another shared shop-home template. The footer now switches between Peach Cloud-local route pages for Home, Search, New, Bag, Orders, and order detail; empty cart/order states are pages, Bag leads into the existing checkout confirmation, and submitted orders open their own progress detail instead of extending the home with generic cart/support blocks. Its current brand palette is Iron Grey `#444545`, Jet Black `#2B303A`, pale green `#F2FBE0`, Petal Rouge `#FD6C93`, and Pink Mist `#FDA1B8`; the strong pink always pairs with dark text instead of small white text. Twelve brand-voiced items still use Food Delivery-owned detail, quantity, checkout, order, and event runtime. Existing product PNGs remain unchanged, the six SVG brand/category assets follow the new palette, all 19 imported local assets remain wired to diagnostics, and old saves update legacy built-in copy only when the old seed title is unchanged.

Coordination note: `FOOD_DELIVERY_PLATFORM_CROSS_MODULE_UI_UX_PLAN.md` preserves the future UI/UX and ownership direction for platform-order lifecycle, Map, Chat, Wallet, notification, and relationship integration. It is a deferred reference rather than an active slice; current Food Delivery attention remains on visual polish, responsive density, microcopy, and distinct shop presentation.

Still incomplete:

1. Assets and Stock still need deeper product loops;
2. future ownership links from Shopping to Assets and from Stock to cue systems still need clearer rollout order.
3. service-account pushes are functional and boundary-safe, but later visual/copy polish can make them feel more brand-specific.
4. Food Delivery store surfaces now have two structurally distinct built-in templates: Moon Bistro's dark tray menu and Peach Cloud's Figma-adapted bright dessert app. Peach Cloud has completed desktop and simulated `393x852` layout/interaction review; true-device review and later template diversity remain future work only when a named shop requires them.
5. App Store mini-app editing now has the generalized binding-target baseline, Shopping-bound generated entry support, cover facade management, installed/not-installed target-folder placement, and create-shop V0 owner handoff. A true custom Shopping store/service record model remains a Shopping-owned product decision if user-created Shopping shops need more than preset platform services.
6. Logistics/tracking share UI is reserved by the shared object contract but does not yet have a full source-app send surface. Future order/tracking screens should create `tracking_share` or `order_share` objects rather than asking Chat to infer physical-gift state.

## 2. Recommended Next Slice

Roadmap 4.4 service-account continuity is complete at current acceptance. Current candidates are:

1. true-device test Shopping/Food Delivery world-app, checkout, service-notification, and return-to-source flows;
2. continue Wallet cleanup/explainability and currency UX only as a focused slice;
3. exercise existing source notification plans without auto-creating Chat identities;
4. treat `补给站` and `救援调度` as trial bindings before another archetype;
5. expand Assets/Stock only through a named user loop;
6. if roadmap 4.7 approves K-pop carriers, keep marketplace/service templates separate from Calendar, Map, and Event Runtime slices.

Later product candidates remain Food Delivery store-surface polish, App Store shop management, source-owned tracking/order shares, and Shopping gift/redeem records. Promote one exact slice before implementation.

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
