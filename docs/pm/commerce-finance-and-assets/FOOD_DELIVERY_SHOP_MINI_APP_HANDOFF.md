# Food Delivery Shop Mini App Handoff

Updated: 2026-07-25

This note captures the current product direction, implemented progress, next visual work, and startup instructions for continuing the Food Delivery shop mini app work on another device or thread.

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
- Future platform-order lifecycle, rider route, service Chat, Wallet expense, notification, and relationship integration is preserved in `FOOD_DELIVERY_PLATFORM_CROSS_MODULE_UI_UX_PLAN.md` for later architecture/execution coordination. That reference is not active implementation scope; current work remains visual polish.
- The platform now reads from the project UI asset library under `public/images/ui-assets/apps/food-delivery/platform/`: ad carousel banners use the generated banner PNGs, platform merchant cards use generated food photos, and the rider illustration uses `decorations/mascot/delivery-rider-mascot-01.png`. This removes the remaining external Unsplash dependency from the platform homepage and keeps future visual swaps inside the project asset library.
- Food Platform bottom navigation includes Home, route-driven Search, platform-only Orders, route-driven Saved, and a route-driven Mine account page. Orders never aggregate peer shop-app orders.
- Platform search filters platform-internal merchants by shop name, cuisine, category, badge, and menu text. It does not search, open, or re-skin same-level shop mini apps such as Moon Bistro.
- Tapping a platform merchant stays inside Food Platform and opens a focused merchant detail sheet with summary metrics and menu preview. Opening a peer shop mini app still happens through the pseudo-folder/App Store/shop route context.
- Seed restaurants and seed dishes now include default food-photo URLs so fresh saves do not open with icon-only food cards. Moon Bistro now uses project-local UI assets under `public/images/ui-assets/apps/food-delivery/moon-bistro/` for its cover and initial dish photos, while user-edited dish images still use the normal URL/Gallery image picker.
- The restaurant/menu creation tools are hidden from ordinary Food Platform browsing. They appear only when the user arrives through the App Store create-shop handoff, and creating a restaurant keeps that handoff open so the user can immediately add menu items and images.
- Food Platform still does not show peer-shop cart, peer-shop orders, Wallet suggestions, Map support panels, or delivery event controls. Those remain inside opened shop mini apps.

The first Food Delivery shop is Moon Bistro.

- Moon Bistro is opened by restaurant context and renders as a shop-first mini app.
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

The second built-in shop app is Peach Cloud.

- Peach Cloud is a peer entry inside the Food Delivery pseudo-folder, not a Food Platform merchant and not a new runtime owner.
- Its stable restaurant identity is `food_seed_peach_cloud`; its default template is the existing `dessert_window` facade option.
- The original Figma node `361:2286` is only a flattened cover, but the later prototype link exposes exact home node `47:23` (`3 - A - Home Page`). `get_design_context` confirms the yellow search/greeting header, five circular categories, horizontal Best Seller rail, orange photographic promotion, two-column Recommend grid, and orange five-action footer used by the current implementation.
- Peach Cloud now has a dedicated Vue home branch instead of conditional styling on the shared shop template. Its full-width yellow/orange app frame, functional search, five category shortcuts, product rails, promotion, fixed bottom navigation, and compact bag treatment deliberately contrast with Moon Bistro's dark side-rail tray menu.
- Twelve menu items cover cloud tea, fruit fizz, frozen desserts, baked sweets, and one seasonal pairing. Product copy now follows the imported Figma photography, including Cocoa Cloud Brownie, Peach Macaron Parade, Crepe Gelato Cloud, and Strawberry Sunbeam Slice.
- Menu cards, quantity detail, add-to-bag, shop-local cart, confirmation checkout, order creation, delivery support, Wallet suggestions, and later service notifications continue to use the shared Food Delivery store and order runtime.
- Empty Bag and Orders navigation actions produce visible feedback; once an order exists, Orders opens the existing shop-scoped support drawer. The five-action footer remains available after adding items, while Bag scrolls to the normal shop-local checkout surface.
- Fresh saves receive the shop and menu through normal seeds. Existing local saves receive missing Peach Cloud records plus missing built-in menu IDs; legacy built-in titles are refreshed only when they still equal the old seed title, so user-renamed items remain untouched. Explicit backup restore remains snapshot-faithful and does not inject the seed migration.
- Peach Cloud now uses one milkshake promotion PNG, one SVG brand mark, five SVG category icons, and twelve product PNGs under `public/images/ui-assets/apps/food-delivery/peach-cloud/`. Image failures still show the shared high-contrast diagnostic placeholder and retain exact `data-required-asset` paths.

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

## Next Visual Plan

Food Platform's first consumer-homepage pass is done, including the Baemin-like reference decomposition, homepage-load reduction, and real banner autoplay/manual navigation. Keep it as discovery-first: future work can add real favorite/recent behavior for platform-internal merchants and richer platform-specific empty states. Bottom navigation should remain a discovery/navigation affordance, not a hidden aggregate controller for peer shop mini apps.

The checkout, order-card, and order-detail visual slice is now done. Its PNG positions and fallbacks are stable; the next art pass should deliver the core order-state pack before optional merchant marks. The deferred cross-module plan must not block this work, and no Map, Chat, Wallet, notification, or relationship writes should be added during asset replacement.

Moon Bistro and Peach Cloud now establish two intentionally different shop-template directions. Do not normalize them into one visual system; the next shop-template pass should begin only from a named shop identity and its own content needs.

Recommended direction: late-night bistro with a dark tray menu.

Work in this order:

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
   - Keep it folded by default in shop mode.
   - Make it feel like supporting shop information, not a technical module dump.

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

## Prompt For A New Thread Or Device

Use this as the first message when continuing with another assistant session:

```text
继续 SchatPhone 外卖 mini app 工作。先阅读 docs/pm/commerce-finance-and-assets/FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md 和 docs/product-decisions/APP_STORE_ENTRY_TYPES_AND_FOOD_SHOP_APPS.md。

当前目标：继续打磨 Food Delivery。保持外卖伪文件夹第一层为 Food Platform + 店铺 mini app；不要把分类重新做成第一层入口。Food Platform 只展示平台内商家流，不打开、不汇总同级店铺 mini app。Moon Bistro 打开后必须是 shop-first，不显示外卖平台大头图和平台列表。保留菜品详情弹窗、单菜品编辑按钮、图片可更换、加购物车与订单归 Food Delivery 所有。

先检查 src/views/FoodDeliveryView.vue、src/lib/home-folder-mini-app-entries.js、tests/food-delivery-view.test.js、tests/home-folder-entry.test.js。不要使用旧本地预览链接；用当前仓库启动的 Vite 输出 URL。完成后运行 npm run test -- tests/food-delivery-view.test.js tests/home-folder-entry.test.js、npm run lint、npm run build。
```
