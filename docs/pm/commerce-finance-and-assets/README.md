# Commerce Finance And Assets Package

Updated: 2026-08-01

Use this package for Shopping, logistics, Food Delivery, Wallet, Assets, Stock, and downstream ownership loops.

Current 4.2 reminder: Wallet order-support facts may preserve Shopping/Food lineage, but they should remain supporting context inside the upstream gift or shared-meal memory rather than becoming a new primary relationship memory.

Current 4.4 note: Shopping, Logistics, and Food Delivery can push Chat service-account notifications into existing Chat Directory service accounts. These messages carry source references and route actions; source modules still own orders, logistics state, Wallet records, and route context.

Current share-card note: Shopping now has a source-owned Chat share path through `share_card`. Ordinary Shopping products shared from Chat are `product_link` objects, while only gift-card / voucher / virtual-gift-like products are labeled as direct sendable gifts. Physical products should move through product links, order shares, or tracking shares; Shopping and Logistics still own checkout, order truth, fulfillment, and delivery/signature state. The helper contract lives in `src/lib/shareable-object.js`.

Optional capability Pack note: `survival_city` can open Shopping as `补给站` through `marketplace -> Shopping`, and Food Delivery as `救援调度` through `dispatch -> Food Delivery`. Confirmed nonstandard `dispatch_board` entries use the same Food Delivery context path. These change entry wording, world context, banners, and safe view/route defaults only; Shopping/Food Delivery still own products, restaurants, menus, carts, checkout, orders, delivery events, logistics review, Wallet suggestions, and Assets suggestions.

Current Food Delivery pseudo-folder note: Food Platform and shop mini apps are peer entries. Food Platform may own discovery plus checkout and order history for its own platform-internal merchants, while independent shop mini apps present their own cart, checkout confirmation, order status, delivery events, and Wallet suggestions. Platform orders must never aggregate peer shop-app orders.

Current independent-shop bag note: every shop mini app has its own persistent bag within the Food Delivery-owned store. Multiple shop bags may coexist, but each facade reads, updates, and checks out only its own restaurant-scoped lines; submitting one shop removes only that shop's lines. No independent shop displays the name of, exposes, replaces, aggregates, or asks the user to recover another shop's bag.

Current independent-shop note: Moon Bistro uses the dark `dark_tray_menu` treatment for modern fine dining; Peach Cloud uses a dedicated petal-pink, pink-mist, pale-green, and charcoal `dessert_window` app adapted from exact Figma node `47:23`; Dash Grill uses an original red, mustard, paper, and ink `quick_service_chain` app; Jade Hearth uses an original rice-paper, ink-green, and cinnabar `jade_table_menu` app organized around shared tables; and Verdant Day uses a grey-white, circular-photography-led `minimal_light_food` app for salads, bowls, wraps, drinks, and light sweets. All five remain facades over the same Food Delivery-owned cart/order runtime. Peach Cloud's delivered 26-file active brand/campaign/product pack plus five retained legacy category marks, Dash Grill's delivered one-Hero/ten-product pack, Jade Hearth's delivered one-Hero/twelve-product pack, Verdant Day's delivered brand/promotion assets plus complete twelve-photo product pack, and Daylight Cafe's delivered one-Hero/nine-product bright-morning pack are recorded in `FOOD_DELIVERY_IMAGE2_ASSET_PROMPTS.md`. Dash Grill, Jade Hearth, and Daylight Cafe have completed focused desktop Chromium and simulated mobile visual review; this is not named physical-device proof.

Current prepared-shop note: River Noodles, Daylight Cafe, and Sugar Lane each have nine Food Delivery-owned menu items across four shop-specific sections and one-Hero/nine-product contracts on stable project-local paths. Harbor Roast adds an original drinks-first coffee-chain baseline with twelve menu items across espresso classics, house signatures, cold/blended drinks, and tea/counter bakes, plus an App Store identity-settings entry and a one-Hero/twelve-product asset contract. Its petrol, copper, warm-ivory, cranberry, dark-stone, and ribbed-glass language is intentionally separate from Daylight Cafe's bright morning terrazzo. Daylight Cafe's `10` PNGs are generated, connected as formal runtime files, and visually accepted; River Noodles, Sugar Lane, and Harbor Roast retain `33` pending PNGs, so diagnostic fallbacks remain expected for those three shops only.

Current localization note: built-in consumer UX follows the system language and defaults to `zh-CN`, while accurate `en-US` copy remains available. Localization is a presentation concern and must preserve user-authored commerce records. Product/category wording, ingredients, icons, photography, and alternative text must remain semantically aligned in every supported language; approved fixed brand-advertising language is documented per shop.

Current Wallet currency note: WorldBook's optional capability Packs can declare and inject custom world currencies. Wallet owns the user-facing primary currency, the USD/CNY reference coordinate, and editable exchange rates; Chat transfers and Food Delivery prices should consume Wallet currency settings instead of owning separate currency rules.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md` when continuing Food Delivery pseudo-folder or shop mini app work
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`

Also read when needed:

- `FOOD_DELIVERY_PLATFORM_CROSS_MODULE_UI_UX_PLAN.md` when a later architecture or execution slice promotes Food Platform order integration; it is a deferred coordination reference, not the active roadmap
- `docs/product-decisions/HOME_FOLDER_SHOPPING_ASSETS_DIRECTION.md`
