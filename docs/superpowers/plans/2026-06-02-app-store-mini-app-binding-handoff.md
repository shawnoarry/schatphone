# App Store Mini App Binding Handoff

Updated: 2026-06-02

This handoff is for resuming the App Store / Shops / target-folder mini-app work on another machine.

## Current Product Position

App Store is an entry store and entry manager. It manages whether an entry is available, where a mini app is installed, how the entry facade looks, and what launch context is passed to the owning app.

App Store must not become the daily shop-browsing surface. Food Delivery and Shopping own their own consumer browsing, filters, favorites, recent lists, menus or products, carts, checkout, orders, fulfillment events, service notifications, and downstream Wallet / Assets / Map / Calendar handoffs.

On Home, the app-level peers are pseudo-folder apps such as Food Delivery and Shopping. Restaurants, shops, marketplace services, and future world-pack storefronts are next-layer mini apps inside those folders.

## Relevant Commits

- `83ddfe1 feat(app-store): bind mini apps to target folders`
  - Main App Store / Shops correction.
  - Added explicit shop binding target support for `food_delivery` and `shopping`.
  - Added installed/not-installed placement for folder mini apps.
- `61544a1 feat: enable compatible world pack expansions`
  - World Pack expansion work landed after the App Store mini-app commit.
  - Keep World Pack service/shop linkage as a later coordination task unless explicitly requested.
- `77863f7 chore: checkpoint current project work`
  - Added the reusable Home folder mini-app builder.
  - Moved Food Delivery's Home folder first layer to Food Platform plus installed shop mini apps.
  - Added mobile App Store mini-app E2E coverage.
  - Added the Food Delivery shop mini-app handoff for Moon Bistro polish.

## Landed In The App Store Mini-App Slice

1. App Store taxonomy now treats `Shops` as the shop-shaped subset of folder mini apps, not as a Food Delivery-only lane.
2. Shop entries can resolve an explicit target folder:
   - `food_delivery`
   - `shopping`
3. Food Delivery restaurant entries are exposed as `food_delivery`-bound folder mini apps.
4. Shopping platform services are exposed as `shopping`-bound folder mini apps.
5. App Store detail and identity UI can show/edit facade fields:
   - display name
   - icon/accent
   - cover image
   - short description
   - tags
   - template
   - target folder boundary
6. App Store has an `Add mini app` owner-handoff flow:
   - Food Delivery receives `createShop=1`, `entry=shop`, `bindingTarget=food_delivery`.
   - Shopping receives `createShop=1`, `entry=shop`, `bindingTarget=shopping`.
   - App Store does not create restaurants, products, carts, or orders.
7. App Store can add/remove a folder mini app from its target folder through persistent `appStoreMiniAppPlacements.hiddenEntryIds`.
8. Removing a mini app from the folder hides it from the Food Delivery or Shopping folder list, but does not delete source records or direct source-owned routes.
9. Food Delivery and Shopping read App Store facade and placement state for launcher/store display.
10. Home pseudo-folders now read the same placement state through `src/lib/home-folder-mini-app-entries.js`.
11. Food Delivery's Home folder first layer is now the fixed Food Platform entry plus installed restaurant shop mini apps. Categories such as nearby, fast food, cafe, dessert, and grocery stay inside Food Platform as filters.
12. Shopping uses the same reusable folder mini-app builder for installed shopping entries.
13. Moon Bistro now opens shop-first: platform hero/list chrome is hidden, the shop owns the first screen, the cart becomes the ordering anchor, and Map/order/Wallet support panels are folded behind Order & delivery.
14. Tests were added for placement normalization, system persistence, App Store UI, Food Delivery filtering, Shopping filtering, Home folder entries, and mobile App Store mini-app flows.

## Files To Read First

1. `docs/product-decisions/APP_STORE_ENTRY_TYPES_AND_FOOD_SHOP_APPS.md`
2. `docs/pm/commerce-finance-and-assets/FOOD_DELIVERY_SHOP_MINI_APP_HANDOFF.md`
3. `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
4. `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
5. `src/views/AppStoreView.vue`
6. `src/views/HomeView.vue`
7. `src/views/FoodDeliveryView.vue`
8. `src/views/ShoppingView.vue`
9. `src/lib/home-folder-mini-app-entries.js`
10. `src/lib/app-entry-presentation.js`
11. `src/lib/app-store-mini-app-placement.js`

## Validation Already Run For The Slice

Before the handoff, the focused App Store / Food Delivery / Shopping slice passed:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test -- tests/home-folder-entry.test.js tests/food-delivery-view.test.js tests/app-store-mini-app-placement.test.js tests/app-store-ui.test.js tests/planned-module-registry.test.js`
- `npm run test:e2e -- e2e/app-store-mini-app-flow.spec.js`

The build emitted the existing Vite note about `src/lib/push.js` being both dynamically and statically imported; it did not fail the build.

## Immediate Resume TODO

- [ ] Pull latest commits and check `git status --short` before editing. Do not revert unrelated local changes.
- [ ] Run a quick verification pass:
  - [ ] `npm run lint`
  - [ ] `npm run test -- tests/home-folder-entry.test.js tests/food-delivery-view.test.js tests/app-store-mini-app-placement.test.js tests/system-app-store-mini-app-placement.test.js tests/app-store-ui.test.js tests/shopping-view.test.js tests/planned-module-registry.test.js`
  - [ ] `npm run test:e2e -- e2e/app-store-mini-app-flow.spec.js`
  - [ ] `npm run build`
- [ ] Start the local app and manually test App Store `Mini apps`, Home Food Delivery folder, and Home Shopping folder on desktop and phone-sized viewports.
- [ ] In App Store, open a Food Delivery mini app:
  - [ ] confirm target folder says Food Delivery
  - [ ] confirm `Remove from folder` hides it from Food Delivery folder list
  - [ ] confirm `Add to folder` restores it
  - [ ] confirm source restaurant/menu/order data is not deleted
- [ ] In Home -> Food Delivery folder:
  - [ ] confirm the first layer is Food Platform plus installed restaurant shop mini apps
  - [ ] confirm old category entries are not first-layer folder apps
  - [ ] confirm hidden restaurant shop mini apps stay hidden from the folder but still open through direct source context
- [ ] In App Store, open a Shopping mini app:
  - [ ] confirm target folder says Shopping
  - [ ] confirm remove/add affects the Shopping folder service list
  - [ ] confirm direct Shopping route still opens the source-owned service context
- [ ] In Home -> Shopping folder:
  - [ ] confirm installed shopping mini apps appear
  - [ ] confirm hidden shopping mini apps disappear from the folder but keep source-owned routes
- [ ] Check mobile detail sheet ergonomics:
  - [ ] status label is understandable
  - [ ] add/remove button is not visually confused with destructive deletion
  - [ ] cover image, target folder, and ownership copy are readable
- [ ] Check Moon Bistro shop-first feel on a real device:
  - [ ] shop header feels like a real shop, not a module panel
  - [ ] cart is an obvious checkout anchor
  - [ ] Order & delivery feels like support information, not a technical dump
  - [ ] dish detail sheet and single-dish edit action remain reachable without dominating the shop

## Next Implementation Options

Recommended next slice:

- Polish Moon Bistro before broadening to other shops:
  - shop header status, rating, ETA, fee, distance, and short identity
  - dark tray dish cards with less backend-like copy
  - delivery-app style bottom cart
  - dish detail sheet spacing, quantity stepper, ingredients, and add-to-cart affordance
  - folded Order & delivery section

Only after that:

- Polish the App Store / Food Delivery / Shopping real-device experience around installed/not-installed mini apps if phone testing still finds friction:
  - clearer empty state copy
  - better mobile detail spacing
  - safer button hierarchy for `Remove from folder`
  - consistent success notice copy
- Decide whether Shopping needs a real custom store/service record model beyond preset platform services.
- If yes, implement that model inside Shopping, not App Store.
- Keep App Store's `Add mini app` flow as an owner handoff.

Later, after the parallel World Pack/service-account line is stable:

- Add world-pack-generated shop entries with `source: world_pack` plus a supported target folder.
- Decide how service-account notifications should reference those entries without App Store owning service messages.

## Do Not Do

- Do not add App Store shop category filters, favorites, recent lists, or user sorting as the next step.
- Do not reintroduce Food Delivery category entries as the Home folder first layer.
- Do not make App Store own menus, products, carts, checkout, orders, logistics, delivery, Wallet records, Assets records, or Chat service notifications.
- Do not treat `Shops` as a Food Delivery synonym.
- Do not auto-delete source records when a mini app is removed from a folder.
- Do not broaden visual shop-template work before Moon Bistro feels good enough to validate as the first real shop.
- Do not move service-account / World Pack storefront linkage ahead of the current App Store real-device verification unless the user explicitly reprioritizes it.
