# Food Delivery Shop Mini App Handoff

Updated: 2026-08-01

This note captures the current product direction, implemented progress, and unscheduled visual reference for Food Delivery shop mini apps. It is not an execution board; the live roadmap and package status handoff own promotion and sequencing.

## Product Model

Food Delivery is a pseudo-folder collection, not a single app that owns every first-level entry.

The first layer inside the Home pseudo-folder should contain peer mini apps:

- Food Platform: broad browsing, search, lightweight categories, platform campaigns, and platform-internal merchant discovery. It is a peer mini app in the folder, not the controller for the other peer shop mini apps.
- Shop mini apps: individual restaurants or themed shops, such as Moon Bistro.
- Future shops: App Store-installed, user-created, or World Pack-generated shop entries.

Categories such as restaurants, nearby, fast food, cafe, dessert, and grocery are filters inside Food Platform. They are not first-level pseudo-folder apps.

## Current Progress

The pseudo-folder direction is now implemented for Food Delivery and Shopping.

- Food Delivery folder first layer now renders the fixed Food Platform entry plus installed restaurant shop mini apps.
- Shopping uses the same reusable folder mini app model for installed shopping shop entries.
- App Store mini app install/remove state controls whether a shop appears inside its target pseudo-folder.
- The pseudo-folder grid can grow and scroll; it is no longer capped to the first eight entries.
- The old Food Delivery first-layer category entries are removed from Home's pseudo-folder layer.

Food Platform now has a consumer-facing discovery homepage.

- The platform first screen uses a Baemin-like delivery-app rhythm adapted to SchatPhone: top actions, delivery address chip, real search input, rider illustration layering, a shorter horizontal ad-carousel rail, icon-first category shortcuts, a horizontal platform-merchant rail, and a light bottom navigation row.
- The earlier load-reduction pass folded the membership coupon strip into the ad carousel and removed redundant Nearby/More mechanisms. The latest category pass restores the useful density of the 2026-06-08 ten-entry layout without restoring its duplicate behavior: All, Restaurants, Fast Food, Fried Chicken, Pizza, Cafe, Dessert, Grocery, Noodles, and Sushi now produce distinct platform-filter outcomes where applicable.
- The current layout polish keeps the existing platform palette and project-local banner/merchant PNG assets while strengthening the delivery-address hierarchy, adding a lightweight greeting, rendering the ten category shortcuts as a stable two-row five-column icon grid, enriching merchant cards with rating/delivery/ETA summaries, and making `View all` expand the merchant rail into a scan-friendly full list.
- Category icon source sheets exist, but the two sheets and two rice-bowl derivatives are RGB files with a baked checkerboard instead of alpha transparency. They remain source references only. The homepage uses Font Awesome fallbacks and exposes ten exact `data-required-asset` paths; `FOOD_DELIVERY_IMAGE2_ASSET_PROMPTS.md` records the missing transparent PNG set for later visual rounds.
- Food Platform now carries eleven platform-only seed merchants instead of five. The merchant mix is intentionally non-repeating: Korean soup rice, sushi, pizza, salad/light food, fried chicken, yogurt dessert, grocery, hand-pulled noodles, breakfast coffee, steamed dim sum, and Southeast Asian curry. Each opens its own focused menu and uses the same platform-only cart/order flow. Merchant identity is intentionally mixed rather than templated: seven shops keep food-photo covers, while Berry Morning, Green Basket, Morning Bagel, and Elm Lane Dim Sum use centered transparent-Logo cover contracts with brand-specific fallback marks. The four Logo assets are reusable in order history instead of requiring duplicate merchant marks. The collapsed `All` homepage rail draws three random shops once per mounted platform session and keeps that set stable while the user browses; `View all`, category filters, Search, and Saved expose their complete matching sets.
- The ad rail now behaves as a real carousel: it advances about every five seconds, loops, exposes stable dot controls, synchronizes the active dot after native swipe/scroll, pauses after direct interaction or while hovered/focused, and disables automatic motion when reduced-motion is requested or the document is hidden.
- The platform discovery surface now follows one interaction rule: every visible action must produce a clear result. The delivery-address control opens an inline chooser; header notifications/cart open focused panels; merchant hearts toggle a session-level platform favorite; and bottom navigation routes Search, Saved, Orders, and Mine to dedicated pages. Mine is now a route-driven platform account page with order/saved summaries, selectable delivery addresses, membership, past-order, delivery-contact, and update entries. Delivery contact deliberately returns through an owned platform order rather than opening a detached Chat flow.
- The three homepage banners no longer share one generic campaign-page template. Membership renders a pass-style benefit page with claim/use states and eligible shops; Weekend Picks is a large-concept poster campaign with a three-benefit pool and a one-draw App-local reward reveal; the lunch editorial renders specific menu-item recommendations with product-image slots. Their primary actions also differ: claim/use a benefit, reveal a session-only weekend reward, or open the first recommended menu respectively. The draw deliberately creates no Wallet, Assets, Chat, Map, or order-side effect.
- Platform merchant menus now support add/decrease/increase actions and a persistent single-merchant platform cart with line totals and quantity feedback. That cart is Food Delivery platform state and remains separate from the restaurant cart/order flow used by peer independent shop apps such as Moon Bistro.
- All eleven platform merchants now carry five menu products, for a 55-item baseline. Menu copy now follows eleven distinct naming systems rather than a shared ingredient template: neighborhood/location names for soup rice and noodles, poetic set names for sushi and dessert, numbered sauces for fried chicken, time-based packs for grocery and breakfast, craft language for dim sum, and city/spice language for curry. The merchant sheet uses stable square product-media slots; each slot still points to `platform/menus/<merchant>/menu-item-01..05.png`, automatically falls back to the shared diagnostic placeholder while missing, and keeps existing item indices stable for persisted platform carts and orders.
- The platform cart now has a complete App-internal order flow: checkout opens a route-driven confirmation page with address selection, order note, delivery fee, total, and a simulated platform payment choice; submission creates a persisted `platformOrders` record, clears only the platform cart, and opens an order success/detail page. The bottom-nav Orders page lists only those platform-internal merchant orders and can reopen their details. This baseline deliberately does not call Wallet, Assets, Chat, rider tracking, or independent shop checkout logic.
- The first platform order-flow visual pass is complete: checkout has a compact meal summary and a stable takeout-bag PNG slot; order cards use status-driven badges and fixed merchant-mark slots; order detail uses the existing order status to drive its Hero, icon, copy, and four-stage progress treatment; and focused checkout/order-detail pages hide the main bottom navigation. Internal architecture explanations were removed from the visible copy. Missing order-state art now uses one high-contrast diagnostic placeholder, and all real Food Delivery image failures use the same fallback, with the exact future asset list stored in `FOOD_DELIVERY_IMAGE2_ASSET_PROMPTS.md`.
- The platform order-flow layout and fallback contract are complete, but its formal order illustration pack is not. Checkout, order-list, and order-detail paths can still expose the diagnostic placeholder when their expected artwork is absent; that visible product-finish gap must not be reported as a completed asset slice.
- Future platform-order lifecycle, rider route, service Chat, Wallet expense, notification, and relationship integration is preserved in `FOOD_DELIVERY_PLATFORM_CROSS_MODULE_UI_UX_PLAN.md` for later architecture/execution coordination. That reference is not active implementation scope. Roadmap 4.9 owns the next commerce-relevant proof; no visual item in this handoff is automatically current work.
- The platform now reads from the project UI asset library under `public/images/ui-assets/apps/food-delivery/platform/`: ad carousel banners use the generated banner PNGs, platform merchant cards use generated food photos, and the rider illustration uses `decorations/mascot/delivery-rider-mascot-01.png`. This removes the remaining external Unsplash dependency from the platform homepage and keeps future visual swaps inside the project asset library.
- Food Platform bottom navigation includes Home, route-driven Search, platform-only Orders, route-driven Saved, and a route-driven Mine account page. Orders never aggregate peer shop-app orders.
- Platform search filters platform-internal merchants by shop name, cuisine, category, badge, and menu text. It does not search, open, or re-skin same-level shop mini apps such as Moon Bistro.
- Tapping a platform merchant stays inside Food Platform and opens a focused merchant detail sheet with summary metrics and menu preview. Opening a peer shop mini app still happens through the pseudo-folder/App Store/shop route context.
- Seed restaurants and seed dishes now include default food-photo URLs so fresh saves do not open with icon-only food cards. Moon Bistro now uses project-local UI assets under `public/images/ui-assets/apps/food-delivery/moon-bistro/` for its cover and initial dish photos, while user-edited dish images still use the normal URL/Gallery image picker.
- The restaurant/menu creation tools are hidden from ordinary Food Platform browsing. They appear only when the user arrives through the App Store create-shop handoff, and creating a restaurant keeps that handoff open so the user can immediately add menu items and images.
- Food Platform still does not show peer-shop cart, peer-shop orders, Wallet suggestions, Map support panels, or delivery event controls. Those remain inside opened shop mini apps.

The first Food Delivery shop is Moon Bistro.

- Moon Bistro is opened by restaurant context and renders as a shop-first mini app.
- Its product position is modern fine dining. The dark and candlelit palette is an atmosphere choice, not a late-night or night-snack category claim.
- The platform hero and platform list chrome are hidden in shop mode.
- The shop owns the first screen: shop header, dark tray menu, dish cards, item details, and cart.
- Dish cards use the dark tray treatment: food imagery is embedded as a raised circular image over each card.
- Moon Bistro now uses a candlelit cover image as the dark header background, with stronger overlay depth so the first screen reads more like a distinct shop app instead of a generic module panel.
- Tapping a dish opens a detail sheet with description, base ingredients, quantity, total price, add-to-cart, and a small edit icon.
- The edit mode is scoped to one dish and can change item title, description, base ingredients, and image source.
- The cart becomes the ordering anchor in shop mode.
- Map, order, Wallet, and support information are folded behind an Order & delivery section so they do not dominate the shop first screen.
- Current visual polish pass adds a shop status pill, scan-friendly rating/ETA/distance metrics, user-facing delivery fee/ETA/distance cards, a project-local Moon Bistro cover image, richer dark tray dish cards with embedded real-food imagery and quieter icon-only add buttons, a clearer checkout bar, and a softer empty-cart prompt.
- The shop checkout is now a shop-local confirmation sheet. Tapping checkout previews the current shop cart, delivery address, ETA, delivery fee, and total; the order is created only after the user submits from that sheet.
- Shop orders, delivery events, and Wallet suggestions are scoped to the currently opened shop. Food Platform does not render the shop cart, order panel, Wallet suggestions, or Map support panels, so it no longer behaves like a total order controller.
- The shop header no longer has a `Food platform` return button. Home remains available, while the platform is treated as a peer mini app in the pseudo-folder rather than the parent of the shop.
- Moon Bistro now seeds or migrates a fuller nine-dish menu using project-local photos. The shop menu is grouped by a sticky side rail: all, warm soup, rice set, grill, seafood, greens, pasta, and dessert. Filtering changes the dish list in place, while tapping a dish still opens the item detail/edit sheet.
- The empty shop surface no longer shows an empty cart card or empty Order & delivery support drawer. The checkout bar appears after the user adds food; order/Wallet/Map support appears only after real shop-scoped order support exists.
- Active Food Delivery prices now follow Wallet's persisted primary currency. This affects current restaurant/menu display, platform demo merchant fees, cart totals, checkout, and newly created food orders. Existing orders remain in their original currency because they are historical ledger/order records rather than live menu pricing.
- World Pack explainer banners are not user-facing UI. World Pack context should appear through app wording, defaults, visual treatment, and flow behavior; boundary explanations stay in docs/tests instead of rendering as an in-app card.
- Food Delivery now requires an explicit World Pack `uiThemePackage.enabled=true` before consuming a World Pack UI/UX override. If a world app binding only maps a route or entry, Food Delivery falls back to the original app UI and defaults.
- Commit `5bd7003` established the earlier fail-closed ownership baseline. The current runtime now matches the pseudo-folder App model more closely: valid restaurant lines for multiple independent shops may coexist in the persisted `cartItems` container, while every shop facade derives its own lines, quantity, delivery-fee total, and checkout by `restaurantId`. Adding or checking out in one shop never names, replaces, clears, or orders another shop's lines; unknown menu ownership remains excluded by normalization. The platform cart stays separate, the backup field shape remains compatible, and Peach Cloud order progress still maps cancelled to stage 0 and placed, preparing, delivering, and delivered to stages 1 through 4.
- Commit `7194f1c` makes Moon Bistro's `Order & delivery` surface consumer-facing and folded by default. Existing delivery events drive `Check for update`, `Confirm delivery`, and `Remove from history`; Wallet export remains an explicit `Save to Wallet` action, and route information remains a Map snapshot rather than a claim of live tracking. Delivery details use real pickup, drop-off, carrier, tracking, and positive-distance values when present, retain stable boundary/pickup/dropoff/meta hooks, and use a safe `ETA pending` fallback for missing, non-finite, or non-positive ETA values. The accepted pass also protects 44px targets, visible focus, long-copy wrapping, and reduced-motion behavior. Moon Bistro is consequently close to product-ready, subject to true-device review rather than another broad redesign.

The second built-in shop app is Peach Cloud.

- Peach Cloud is a peer entry inside the Food Delivery pseudo-folder, not a Food Platform merchant and not a new runtime owner.
- Its stable restaurant identity is `food_seed_peach_cloud`; its default template is the existing `dessert_window` facade option.
- The original Figma node `361:2286` is only a flattened cover, but the later prototype link exposes exact home node `47:23` (`3 - A - Home Page`). `get_design_context` confirms the yellow search/greeting header, five circular categories, horizontal Best Seller rail, orange photographic promotion, two-column Recommend grid, and orange five-action footer used by the current implementation.
- Peach Cloud now has a dedicated Vue app branch instead of conditional styling on the shared shop template. Its full-width petal-pink, pink-mist, pale-green, and charcoal app frame, five home category shortcuts, product rails, promotion, lightweight Pink Mist bottom navigation with Petal Rouge selected states, and route-driven Search, New, Bag, Orders, and order-detail pages deliberately contrast with Moon Bistro's dark side-rail tray menu. The Home promotion keeps the approved English campaign copy on the left and presents the complete `1536x1024` campaign scene in a dedicated right-side image field without cropping. Search keeps all five real categories in one compact row with short visible labels and full bilingual accessible names; it has no catch-all category or second row. New keeps its featured seasonal product in the large lead card, excludes that duplicate from the six-item timeline, prioritizes the remaining seasonal products, and labels Fruit, Frozen, Tea & Coffee, Bakes, and Seasonal items accurately in both languages. This palette is a later Peach Cloud brand decision layered over the Figma-derived information architecture; it does not change the Figma evidence or shared order runtime.
- Seventeen menu items now cover five fresh-fruit specials, three tea/coffee drinks, four frozen desserts, two baked sweets, and three seasonal products. `鲜果特饮 / Fresh Fruit` is intentionally broader than peach or sparkling drinks: it now includes `青提茉莉鲜果茶 / Green Grape Jasmine Fruit Tea`, `芒果百香厚酸奶 / Mango Passionfruit Yogurt`, and `草莓白桃鲜果乳 / Strawberry Peach Fruit Milk`, while Peach Cold Brew Tonic remains in Tea & Coffee. Seasonal now adds `杨梅荔枝冰茶 / Waxberry Lychee Iced Tea` and `桂花雪梨暖饮 / Osmanthus Pear Warm Infusion` alongside the existing pairing.
- The five added products use stable IDs and `peach-cloud-item-13.png` through `peach-cloud-item-17.png`. Fresh and existing saves receive only missing IDs, while same-ID user titles, descriptions, prices, ingredients, and custom images remain untouched. This content expansion does not introduce automatic seasonal dates or availability rules.
- Built-in product names, descriptions, ingredients, image alternative text, bag lines, checkout lines, and order items now resolve through the system language. `zh-CN` is the default presentation, `en-US` preserves the approved English menu copy, and user-edited fields remain literal in every language. Search indexes both built-in language versions plus current user-authored copy without writing translated presentation text back into Food Delivery storage. Fixed English Hero and campaign language remains part of the approved Peach Cloud brand artwork/presentation.
- Menu cards, quantity detail, add-to-bag, shop-local cart, confirmation checkout, order creation, delivery support, Wallet suggestions, and later service notifications continue to use the shared Food Delivery store and order runtime.
- The five-action footer uses Peach Cloud-local `shopView` route state. Empty Bag and Orders actions open their own empty-state pages; Bag owns quantity review and the existing confirmation-checkout entry; Orders opens a shop-scoped order list, and submitted orders open a dedicated detail/progress page. These surfaces reuse Food Delivery state and checkout actions without rendering the generic inline cart or support drawer beneath the Peach Cloud home.
- Fresh saves receive the shop and menu through normal seeds. Existing local saves receive missing Peach Cloud records plus missing built-in menu IDs; legacy built-in titles are refreshed only when they still equal the old seed title, so user-renamed items remain untouched. Explicit backup restore remains snapshot-faithful and does not inject the seed migration.
- Peach Cloud now uses 26 active assets under `public/images/ui-assets/apps/food-delivery/peach-cloud/`: one full-width Hero PNG, two independent campaign PNGs, seventeen unique square product PNGs, one original brand-mark SVG, and five Peach Cloud-prefixed category SVGs. The Hero, `30% OFF` block, and New-page weekly drop no longer reuse one photograph. The same peach/cloud brand mark appears in the Home Food Delivery folder and the shop bar. The five active category marks use one colorful, background-free IP illustration system, and the category container owns each pastel background. The original `vegan.svg`, `dessert.svg`, `drinks.svg`, `snacks.svg`, and `meal.svg` files remain unchanged as inactive reusable source marks for other shops. Image failures still show the shared high-contrast diagnostic placeholder and retain exact `data-required-asset` paths.
- The 17 product paths now map one-to-one to 17 visually distinct `768x768` product photographs whose subjects match the current menu titles. The editable generation masters and product contact sheet remain under `output/imagegen/peach-cloud-refresh/ads/` and `output/imagegen/peach-cloud-refresh/products/` for later manual retouching. These masters are not runtime dependencies; the app displays the accepted copies under `public/`. The Peach Cloud pack remains separate from the pending Food Platform order-art pack.

The third built-in shop app is Dash Grill.

- Dash Grill is an original McDonald's-like quick-service category concept without copied names, arches, mascots, uniforms, packaging, or other brand assets.
- Its stable restaurant identity is `food_seed_dash_grill`; its default template is `quick_service_chain`.
- The first screen uses a tomato-red, mustard-yellow, paper, and ink system with a large promotion hero, delivery-address disclosure, service metrics, horizontal quick picks, a deal block, and a two-column popular-product grid. It is structurally different from Moon Bistro and Peach Cloud.
- The fixed footer opens real `shopView=menu|deals|bag|orders|order` pages. It does not append generic shop panels beneath Home.
- Ten menu records cover featured combos, burgers, chicken, sides, drinks, and treats. Product detail, quantity, restaurant-scoped cart persistence, checkout confirmation, and order creation continue through the Food Delivery-owned runtime.
- Fresh saves receive the normal seed. Existing saves receive only missing Dash Grill restaurant/menu IDs, preserving same-ID user edits; explicit backup restore still skips seed-content migration.
- The one cover and ten product PNGs under `dash-grill/` are delivered on their stable runtime paths. Each file was generated and accepted from the shop's own quick-service brand capsule rather than a Peach Cloud or Verdant Day reference; editable masters, the portable CLI request file, contact sheet, and acceptance record remain under `output/imagegen/dash-grill/`. Focused desktop Chromium and simulated Pixel 5 Home/Menu/Detail review confirms complete subjects, distinct compositions, no diagnostic fallback, no horizontal overflow, and no page errors. `data-required-asset` remains as the failure diagnostic contract.

The fourth built-in shop app is Jade Hearth.

- Jade Hearth is an original Chinese shared-table concept. It is not assigned to, or claimed as a reproduction of, any Figma reference that has not been read through exact-node design context.
- Its stable restaurant identity is `food_seed_jade_hearth`; its default template is `jade_table_menu`.
- The visual system uses rice-paper neutrals, ink green, cinnabar accents, ruled dividers, and an editorial menu-book rhythm. The full-width hero, shared/solo selector, feast collections, and restrained bottom navigation deliberately avoid Moon Bistro's tray cards, Peach Cloud's dessert grid, and Dash Grill's chain promotion layout.
- The footer opens real `shopView=menu|feast|bag|orders|order` pages. Home remains a browse surface instead of growing generic cart and order panels beneath itself.
- Twelve dishes cover house-table signatures, small plates, wok favorites, claypot, rice/noodles, and tea/sweets. Product detail, selected quantity, restaurant-scoped cart persistence, checkout confirmation, order creation, and order progress continue through the Food Delivery-owned runtime.
- Jade Hearth's order list receives the complete shop-scoped history, and Chat order links resolve directly to its dedicated `shopView=order&shopOrderId=...` detail. That page presents persisted delivery events, check-update and confirm-delivery actions, plus the existing explicit Wallet-record adapter without moving order or ledger ownership into the facade.
- Fresh saves receive the normal seed. Existing saves receive only missing Jade Hearth restaurant/menu IDs and preserve same-ID user edits; explicit backup restore still skips seed-content migration.
- Seed migration reserves capacity for current built-in menu IDs in addition to the 360 user-menu limit, so adding Jade Hearth cannot evict older user-created dishes. Explicit backup restore remains a faithful snapshot and does not silently add seeds.
- One cover and twelve product PNGs under `jade-hearth/` are delivered on their stable runtime paths. The first-round non-square whole-fish candidate and incorrect five-piece tangyuan candidate remain preserved as rejected evidence; accepted v2 masters drive runtime items `03` and `12`. Editable masters, both portable CLI request files, contact sheets, and the acceptance record remain under `output/imagegen/jade-hearth/`. Focused desktop Chromium and simulated Pixel 5 Home/Menu/Detail review confirms distinct dish semantics, no diagnostic fallback, no horizontal overflow, and no page errors. The built-in whole-fish Home `4:5` card alone uses `object-contain` so its tail and platter remain complete; Menu/detail crops and the runtime PNG remain unchanged. Each image retains its exact `data-required-asset` path.

The fifth built-in shop app is Verdant Day.

- Its stable restaurant identity is `food_seed_verdant_day`; its default template is `minimal_light_food`.
- Verdant Day is a peer entry in the Food Delivery pseudo-folder, not a Food Platform merchant. Its grey-white canvas, full-width brand Hero, circular product-photo treatment, icon-led Home category shortcuts, focused Menu tabs, spacious rows, and low-noise bottom navigation deliberately avoid the other four shops' tray, dessert-grid, chain-promotion, and Chinese menu-book structures.
- The footer and header open real `shopView=menu|detail|bag|orders|order` pages. Search opens the full menu, product taps open a dedicated image-led detail page, Bag opens a branded quantity and checkout surface, and submitted orders open a dedicated progress page instead of extending Home.
- Twelve menu records cover salads, warm bowls, wraps/toasts, drinks, and light sweets. Food Delivery still owns item edits, quantities, restaurant-scoped cart persistence, checkout, orders, and delivery-event state.
- Fresh and existing saves receive only missing stable Verdant Day restaurant/menu IDs. Same-ID user edits are preserved, built-in menu capacity remains reserved beyond the 360 user-menu limit, and explicit backup restore stays snapshot-faithful.
- The active Hero uses `verdant-day/brand/verdant-day-brand-hero-preview-02.png`; its English wordmark and slogan remain part of the approved artwork instead of being replaced by runtime translations. The text-free `verdant-day-brand-hero-art-01.png` remains the manual-edit master. Home categories are destination shortcuts with no false selected state. Menu removes the overlapping `All` category, defaults to the first real non-empty category, searches across the whole shop with grouped results, and exposes unknown user-authored sections through a conditional `More` fallback. Two generated photography assets live under `verdant-day/promotions/` for the active popup and in-app campaign surfaces. The complete `verdant-day-item-01.png` through `verdant-day-item-12.png` product pack is delivered as full-square `768x768` photography with center-safe circular cropping; the shared diagnostic placeholder remains only as load-failure protection.
- Exact `get_design_context` was called for Figma file `IU2qDGgi9weqgHcDO0niWV`, node `1:73`, before implementation, but Figma returned `You've reached the Figma MCP tool call limit on the Starter plan.` The user had already approved using the visible canvas as a non-pixel-exact style reference, so the current UI adapts those visible traits without claiming exact-node reproduction.

## Important Ownership Boundaries

Food Delivery owns:

- restaurant records
- menu item records
- cart behavior
- checkout
- order records and order status
- food delivery service events

Food Platform is a Food Delivery-owned discovery mini app, but it is not the visible owner of peer shop order workflows. Its own platform merchants can use a unified platform template; individual same-level shop mini apps should present their own cart, checkout, order status, and downstream Wallet suggestions.

Map is a context provider:

- delivery address
- distance
- ETA
- route context

Wallet is a downstream record target:

- delivered food orders can become Wallet expense suggestions or records

Chat can provide service-account notification context, but the order truth remains in Food Delivery.

App Store manages:

- install/remove from target pseudo-folder
- user-facing entry name
- icon/facade presentation
- cover image
- short description
- tags
- visual template selection

App Store must not own restaurant/menu/cart/order records.

## Unscheduled Visual Reference

Food Platform's first consumer-homepage pass is done, including the Baemin-like reference decomposition, homepage-load reduction, and real banner autoplay/manual navigation. Keep it as discovery-first: future work can add real favorite/recent behavior for platform-internal merchants and richer platform-specific empty states. Bottom navigation should remain a discovery/navigation affordance, not a hidden aggregate controller for peer shop mini apps.

The checkout, order-card, and order-detail layout slice is done, but the formal order artwork is not. Its PNG positions and fallbacks are stable; any later approved art pass should deliver the core order-state pack before optional merchant marks. The deferred cross-module plan must not block that replacement, and no Map, Chat, Wallet, notification, or relationship writes should be added during asset work.

Two failed ImageGen drafts were never imported into the product asset library or referenced by code. The diagnosed failure combined a Windows `.cmd` inline multiline-prompt truncation with a compatibility service that did not honor the requested square output. Any later CLI generation trial must use a UTF-8 prompt file, inspect a dry-run payload before submitting, and treat every returned image as an unaccepted candidate until dimensions, content, transparency, compression, copyright, and sensitive-information checks pass.

Vistack is only a validated candidate for a semi-automatic asset workbench. It is not currently configured or approved as project tooling, does not create a second roadmap, and does not make downloaded output a formal asset. A controlled future trial may prepare a bounded asset list, generate items one at a time, download them into a temporary intake area, apply human selection and the normal quality gate, and wire accepted files in a separate reviewed slice.

Food Delivery now has nine intentionally different built-in browsing directions. Moon Bistro, Peach Cloud, Dash Grill, Jade Hearth, and Verdant Day remain brand-owned facades. Harbor Roast proves the reusable `cafe_counter`, Daylight Cafe proves `daypart_journal`, Sugar Lane proves `convenience_shelf`, and River Noodles proves `street_food_stall`. Do not normalize them into one visual system; each new brand pass must begin from a named shop identity and its own content needs.

River Noodles, Daylight Cafe, and Sugar Lane each own nine stable menu IDs across four semantic sections and now open through three structurally different reusable templates instead of the previous generic Hero/list facade. Harbor Roast adds a fourth built-in reusable-template proof with twelve stable menu IDs and a drinks-first counter structure. These templates own browsing composition only: they open the first real section, omit `All`, and reuse Food Delivery item detail, restaurant-scoped cart, checkout, order, and delivery runtime. Existing saves receive missing restaurant/menu IDs; the six exact historical default Unsplash URLs and unchanged copy for the three original items migrate to the new local contracts, while custom URLs and other same-ID user edits remain untouched. Explicit backup restore remains snapshot-faithful. Their asset contracts remain fully enumerated in `FOOD_DELIVERY_IMAGE2_ASSET_PROMPTS.md`.

Daylight Cafe's `10` formal files are now delivered under `public/images/ui-assets/apps/food-delivery/daylight-cafe/`. Its accepted masters, CLI request variants, contact sheet, object-cover diagnostic preview, and request/acceptance log remain under `output/imagegen/daylight-cafe/`; runtime does not read that directory. Focused desktop Chromium and simulated Pixel 5 review covers the `daypart_journal` identity crop, daypart selector, lead/supporting product layout, full-subject product details, and overflow/error checks. The identity image uses a `68%` horizontal focal point within the journal cover slot, and Daylight detail images alone use `object-contain` on Cream because the shared shallow detail slot otherwise clips cup rims, glass bases, and plated food. The square runtime masters remain unchanged for thumbnail use.

River Noodles and Sugar Lane retain `20` pending PNGs, so no formal media acceptance may be claimed for either shop. Their street-route and display-shelf templates now degrade to template-native bowl/cake symbols instead of exposing the diagnostic broken-image artwork. Their future candidate masters belong under `output/imagegen/river-noodles/` and `output/imagegen/sugar-lane/`; River Noodles must keep its river-teal stoneware/noodle language and Sugar Lane its berry/porcelain patisserie language rather than inheriting Daylight Cafe's bright morning terrazzo language.

The App Store selector offers six general structures: `standard`, `cafe_counter`, `convenience_shelf`, `street_food_stall`, `daypart_journal`, and `menu_mosaic`. `daypart_journal` replaces the previous Daylight counter reuse with a time-indexed editorial composition; `menu_mosaic` adds a color-block category atlas and asymmetric product grid without claiming a fixed built-in brand. Applying reusable structures to another restaurant has focused regression coverage and must not leak Harbor Roast, Daylight Cafe, Sugar Lane, or River Noodles wording or assets. The five brand-owned facade IDs remain visible while editing the built-in shop currently using them, but they are not offered as general replacements until their special routes and fixed brand material are extracted.

Harbor Roast is the coffee-chain proof for the reusable `cafe_counter`, and its stable restaurant identity is `food_seed_harbor_roast`. It provides a drinks-first menu with twelve items across espresso classics, Harbor signatures, cold/blended drinks, and tea/counter bakes. The built-in restaurant automatically produces the `shop_app_food_seed_harbor_roast` App Store entry, so users can open the existing identity editor for display name, icon, cover, short description, tags, template selection, and Food Delivery folder placement without moving restaurant or menu ownership out of Food Delivery. Fresh and existing saves receive missing stable IDs while same-ID user edits remain intact; explicit backup restore remains snapshot-faithful.

Harbor Roast's asset contract contains one `1200x750` Hero and twelve `768x768` product PNGs under `public/images/ui-assets/apps/food-delivery/harbor-roast/`. Its Petrol/Copper/Warm Ivory/Cranberry/Espresso capsule uses dark stone, brushed metal, ribbed glass, and warm directional cafe light instead of Daylight Cafe's bright terrazzo/brunch language. No candidates or formal runtime files have been generated and no desktop/mobile visual acceptance may be claimed. Future request logs, references, candidates, and acceptance reasons belong under `output/imagegen/harbor-roast/`; runtime must never read that directory.

Unscheduled framework candidates include Korean fried chicken, Southeast Asian food, Korean soup, and an additional pizza app. They are accepted reference directions, not a remaining approved execution queue. The Chinese-food slot is represented by Jade Hearth and the light-food slot by Verdant Day. The general food ordering `YCNJqicXdksq2gdaKqINQc` node `0:1`, coffee `JJi7C0USRtDL3QKVFcaMnh` node `2:2`, and pizza `M3EEtlpk26gLRtDifyGCcV` node `0:1` references remain reserved for later evaluation. The minimalist light-food reference `IU2qDGgi9weqgHcDO0niWV` node `1:73` informed Verdant Day only through its visible canvas because the required exact-node context call hit the current Figma Starter quota. Retry `get_design_context` after quota reset before claiming closer node-level fidelity.

Moon Bistro polish direction: modern fine dining with a dark tray menu. Preserve its candlelit atmosphere without presenting it as a late-night restaurant.

Moon Bistro reference checklist, with no implied execution order:

1. Shop header
   - First polish pass is done: the first screen now has shop status, rating, ETA, delivery fee, distance, short shop identity, and a project-local Moon Bistro cover image.
   - Next pass can tune the cover crop and add more brand-specific microcopy or motion if the shop needs a stronger personality.
   - Keep Home and Food Platform navigation visible but visually quiet.

2. Dish cards
   - First polish pass is done: cards now push the embedded tray feel further, use project-local Moon Bistro dish photos for the initial menu, and show dish descriptions instead of backend-like image-source labels.
   - Latest pass is done: the shop has nine dishes across multiple sections and a sticky side category rail for browseability.
   - Next pass should tune responsive card density and polish the section labels/selected states after real-device review.
   - Keep title, price, visual identity, and add action easy to scan.

3. Bottom cart
   - First polish pass is done: it reads more like a delivery-app checkout bar and uses checkout language.
   - Latest pass hides it while empty, so the shop home does not start with a backend-looking empty-cart module.
   - Show quantity, total price, and checkout action.
   - Keep empty-cart state quiet.

4. Dish detail sheet
   - Keep the large circular image composition.
   - First polish pass removes image-source language from the dark detail view and uses delivery/fee context instead.
   - Continue improving spacing, hierarchy, tags, ingredients, quantity stepper, and add-to-cart affordance.
   - Keep the small edit icon available but low-noise.

5. Order & delivery section
   - The accepted consumerization pass is landed: keep it folded by default in shop mode and preserve the consumer-facing delivery details and actions.
   - Do not restore ownership, simulation, source-plan, or other technical-console wording.
   - Preserve stable event/route hooks, safe ETA fallback, explicit Wallet/Map actions, 44px targets, visible focus, long-copy wrapping, and reduced-motion behavior.

## Files To Read First

Start with these files:

- `docs/pm/commerce-finance-and-assets/FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md`
- `docs/product-decisions/APP_STORE_ENTRY_TYPES_AND_FOOD_SHOP_APPS.md`
- `src/views/HomeView.vue`
- `src/lib/home-folder-mini-app-entries.js`
- `src/views/FoodDeliveryView.vue`
- `src/stores/foodDelivery.js`
- `tests/home-folder-entry.test.js`
- `tests/food-delivery-view.test.js`

## Validation Commands

Run focused validation while working on this slice:

```bash
npm run test -- tests/food-delivery-view.test.js tests/home-folder-entry.test.js
npm run lint
npm run build
```

If App Store placement is touched, also run:

```bash
npm run test -- tests/app-store-mini-app-placement.test.js tests/planned-module-registry.test.js
```

## Other Device Startup Commands

Use the current repo state, not an old bookmarked local preview.

```bash
cd d:\github\schatphone
git status --short
git pull
npm install
npm run test -- tests/food-delivery-view.test.js tests/home-folder-entry.test.js
npm run dev -- --host 127.0.0.1
```

After starting the dev server, use the URL printed by Vite. Do not assume a fixed port and do not reuse an old local preview link from another session.

If a known old preview is still open in the browser, close it and refresh from the newly printed Vite URL. If the page looks like the early legacy Home layout, it is not a valid reference for this work.

## Historical Prompt (Do Not Use As Current Scope)

The text below is retained only as historical handoff evidence. It predates the live roadmap's ordinary consequence priority and must not be used to start work without a new roadmap promotion:

```text
继续 SchatPhone 外卖 mini app 工作。先阅读 docs/pm/commerce-finance-and-assets/FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md 和 docs/product-decisions/APP_STORE_ENTRY_TYPES_AND_FOOD_SHOP_APPS.md。

当前目标：继续打磨 Food Delivery。保持外卖伪文件夹第一层为 Food Platform + 店铺 mini app；不要把分类重新做成第一层入口。Food Platform 只展示平台内商家流，不打开、不汇总同级店铺 mini app。Moon Bistro 打开后必须是 shop-first，不显示外卖平台大头图和平台列表。保留菜品详情弹窗、单菜品编辑按钮、图片可更换、加购物车与订单归 Food Delivery 所有。

先检查 src/views/FoodDeliveryView.vue、src/lib/home-folder-mini-app-entries.js、tests/food-delivery-view.test.js、tests/home-folder-entry.test.js。不要使用旧本地预览链接；用当前仓库启动的 Vite 输出 URL。完成后运行 npm run test -- tests/food-delivery-view.test.js tests/home-folder-entry.test.js、npm run lint、npm run build。
```
