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
10. Tests were added for placement normalization, system persistence, App Store UI, Food Delivery filtering, and Shopping filtering.

## Files To Read First

1. `docs/product-decisions/APP_STORE_ENTRY_TYPES_AND_FOOD_SHOP_APPS.md`
2. `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`
3. `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
4. `src/views/AppStoreView.vue`
5. `src/views/FoodDeliveryView.vue`
6. `src/views/ShoppingView.vue`
7. `src/lib/app-entry-presentation.js`
8. `src/lib/app-store-mini-app-placement.js`

## Validation Already Run For The Slice

Before the handoff, the focused App Store / Food Delivery / Shopping slice passed:

- `npm run lint`
- `npm run test`
- `npm run build`

The build emitted the existing Vite note about `src/lib/push.js` being both dynamically and statically imported; it did not fail the build.

## Immediate Resume TODO

- [ ] Pull latest commits and check `git status --short` before editing. Do not revert unrelated local changes.
- [ ] Run a quick verification pass:
  - [ ] `npm run lint`
  - [ ] `npm run test -- tests/app-store-mini-app-placement.test.js tests/system-app-store-mini-app-placement.test.js tests/app-store-ui.test.js tests/food-delivery-view.test.js tests/shopping-view.test.js`
  - [ ] `npm run build`
- [ ] Start the local app and manually test App Store `Mini apps` on desktop and phone-sized viewports.
- [ ] In App Store, open a Food Delivery mini app:
  - [ ] confirm target folder says Food Delivery
  - [ ] confirm `Remove from folder` hides it from Food Delivery folder list
  - [ ] confirm `Add to folder` restores it
  - [ ] confirm source restaurant/menu/order data is not deleted
- [ ] In App Store, open a Shopping mini app:
  - [ ] confirm target folder says Shopping
  - [ ] confirm remove/add affects the Shopping folder service list
  - [ ] confirm direct Shopping route still opens the source-owned service context
- [ ] Check mobile detail sheet ergonomics:
  - [ ] status label is understandable
  - [ ] add/remove button is not visually confused with destructive deletion
  - [ ] cover image, target folder, and ownership copy are readable
- [ ] Check empty states after hiding all visible folder mini apps in a category/list.

## Next Implementation Options

Recommended next slice:

- Polish the App Store / Food Delivery / Shopping real-device experience around installed/not-installed mini apps:
  - clearer empty state copy
  - better mobile detail spacing
  - less backend-like wording
  - safer button hierarchy for `Remove from folder`
  - consistent success notice copy

Only after that:

- Decide whether Shopping needs a real custom store/service record model beyond preset platform services.
- If yes, implement that model inside Shopping, not App Store.
- Keep App Store's `Add mini app` flow as an owner handoff.

Later, after the parallel World Pack/service-account line is stable:

- Add world-pack-generated shop entries with `source: world_pack` plus a supported target folder.
- Decide how service-account notifications should reference those entries without App Store owning service messages.

## Do Not Do

- Do not add App Store shop category filters, favorites, recent lists, or user sorting as the next step.
- Do not make App Store own menus, products, carts, checkout, orders, logistics, delivery, Wallet records, Assets records, or Chat service notifications.
- Do not treat `Shops` as a Food Delivery synonym.
- Do not auto-delete source records when a mini app is removed from a folder.
- Do not move service-account / World Pack storefront linkage ahead of the current App Store real-device verification unless the user explicitly reprioritizes it.
