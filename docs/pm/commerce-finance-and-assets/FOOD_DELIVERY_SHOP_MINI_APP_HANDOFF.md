# Food Delivery Shop Mini App Handoff

Updated: 2026-06-10

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

- The platform first screen uses a Baemin-like delivery-app rhythm adapted to SchatPhone: top actions, delivery address chip, real search input, rider illustration layering, a shorter horizontal ad-carousel rail, simplified category shortcuts, a horizontal platform-merchant rail, and a light bottom navigation row.
- The latest visual pass reduces homepage load: the former membership coupon strip is folded into the ad carousel, complex mechanism shortcuts such as Nearby/Grocery/More are removed from the visible category grid, and merchant detail/menu information no longer occupies the bottom of the homepage.
- The platform now reads from the project UI asset library under `public/images/ui-assets/apps/food-delivery/platform/`: ad carousel banners use the generated banner PNGs, platform merchant cards use generated food photos, and the rider illustration uses `decorations/mascot/delivery-rider-mascot-01.png`. This removes the remaining external Unsplash dependency from the platform homepage and keeps future visual swaps inside the project asset library.
- Food Platform bottom navigation is visual/discovery-only for now: Home, Search, Orders, Saved, and Mine. `Orders` is a platform affordance placeholder and must not aggregate peer shop orders.
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

Food Platform's first consumer-homepage pass is done, including the Baemin-like reference decomposition and the homepage-load reduction pass. Keep it as discovery-first: future work can add real favorite/recent behavior for platform-internal merchants, real banner rotation/state, and richer platform-specific empty states. Bottom navigation should remain a discovery/navigation affordance, not a hidden aggregate controller for peer shop mini apps.

Focus shop-template work on Moon Bistro before expanding to other shops.

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
