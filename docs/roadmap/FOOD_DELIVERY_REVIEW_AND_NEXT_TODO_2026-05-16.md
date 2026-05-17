# Food Delivery Review And Next TODO / 外卖模块复盘与下一步

Updated: 2026-05-16

## Purpose

This document records the Food Delivery review after the recent visual refresh and app-to-Home return-navigation update.

It is a focused handoff note for product managers, developers, testers, and future AI assistants. The live execution board is still `docs/roadmap/TODO_ROADMAP.md`; when a task below becomes active, summarize it there in the same commit batch.

## Current Verdict

Food Delivery is not only a planned concept. It already has a functional baseline and can be treated as implemented at the foundation level.

Current user-facing entry:

- Chinese name: 外卖
- English name: Food Delivery
- Route: `/food-delivery`
- Home form: folder-backed module entry
- First-level folder children: restaurants, nearby, fast food, cafe/drinks, dessert, grocery delivery

## Implemented Scope

- Home folder entry opens Food Delivery category routes.
- `FoodDeliveryView.vue` renders category navigation, restaurant data, menu data, cart, checkout, and recent orders.
- `src/stores/foodDelivery.js` persists restaurants, menu items, cart lines, orders, order status, backup/restore, and storage hydration.
- Settings backup/import/storage diagnostics include Food Delivery data through `store:food-delivery`.
- Chat has a dedicated Food Delivery service-account context keyed by `foodDeliveryServiceKey`.
- Chat can route to `/food-delivery?source=chat&intent=food_delivery_order&orderId=...`.
- Food Delivery shows a Chat source banner and highlights the linked order.
- Map provides a read-only delivery handoff through `buildFoodDeliveryMapHandoff()`, including pickup point, delivery address, distance, ETA, and route summary.
- Food Delivery can use the current Map location as checkout delivery address.
- Users can create custom restaurants and menu items.
- Restaurant/menu images support URL and Gallery sources. Local files still enter Gallery first, then Food Delivery references structured metadata.
- `FoodDeliveryView.vue` uses the shared `pushReturnTarget()` helper, so returning from a Home folder entry preserves the originating Home page.
- A focused regression test now locks the Home return behavior in `tests/food-delivery-view.test.js`.

## Ownership Rules

- Food Delivery owns restaurants, menus, cart, food orders, and food-order status.
- Chat only displays Food Delivery service-account pushes and routes back to Food Delivery.
- Map only provides location, route, pickup/dropoff, nearby, and ETA context.
- Gallery owns local image files and preview lifecycles.
- Wallet may later consume completed-order expense suggestions, but Wallet must not own Food Delivery orders.
- Home and Appearance own the folder shell and visual folder behavior. Food Delivery owns the destination app surface after navigation.

## Not Fully Implemented Yet

- Detailed status and exception events are not deep enough yet.
- Rider delay, restaurant cancellation, address change, and ETA update need explicit event/message-card treatment.
- Chat Food Delivery service-account cards should show those events as read-only notifications.
- Wallet food-expense suggestions from completed Food Delivery orders are not implemented yet.
- Map still provides read-only context only; deeper courier route/progress presentation remains future work.
- Visual polish is still pending. The current page is a functional baseline, not the final immersive Food Delivery app look.

## Where TODO Should Be Updated

- Live execution status: `docs/roadmap/TODO_ROADMAP.md`
- Focused Food Delivery handoff and next queue: this file
- Functional-code candidate details: `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`
- PM/product-facing module explanation: `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`
- Visual follow-up and app-shell polish: `docs/overview/IMMERSIVE_VISUAL_TODO.md`

## Recommended Next Functional Queue

1. DONE: Add Food Delivery status/exception event model.
2. DONE: Render Food Delivery status/exception message cards in Food Delivery.
3. DONE: Surface the same events in the Chat Food Delivery service account as read-only notification cards.
4. NEXT: Add richer generated event presets/copy for rider delay, restaurant cancellation, address change, and ETA update.
5. NEXT: Add Wallet food-expense suggestions from completed Food Delivery orders.
6. LATER: Deepen Map courier route/progress presentation while keeping Map as a location/ETA provider only.

## Acceptance Criteria For Next Slice

- Food Delivery can represent at least these events: rider delay, restaurant cancellation, address change, ETA update.
- Event cards are visible in Food Delivery order context.
- Chat service-account cards can show the same event meaning without mutating Food Delivery state.
- Tests cover store normalization, Food Delivery page rendering, and Chat route/display behavior.
- Docs are synced in `TODO_ROADMAP.md` and this file when the task lands.

## 2026-05-16 Progress: Status/Exception Event Baseline

Implemented:

- Added `FOOD_DELIVERY_ORDER_EVENT_TYPE` for rider delay, restaurant cancellation, address change, ETA update, and generic status update.
- Added normalized order events to Food Delivery orders.
- Added `addOrderEvent()` on the Food Delivery store.
- Restaurant cancellation events mark the Food Delivery order as cancelled.
- Address-change events update the Food Delivery order delivery address.
- Food Delivery order cards now show recent event cards.
- Chat Food Delivery service-account cards now show the latest event as a read-only notification.

Validation target:

- `npm test -- tests\food-delivery-store.test.js tests\food-delivery-view.test.js tests\chat-shopping-preview-routing.test.js`

Next recommended slice:

- Add user-facing event preset actions or helper copy so rider delay, restaurant cancellation, address change, and ETA update can be created from the Food Delivery page without handcrafting test data.
