# Commerce Finance And Assets Product Boundary

Updated: 2026-06-03

This file defines ownership boundaries for Shopping, Logistics, Food Delivery, Wallet, Assets, and Stock.

## 1. Shopping

Shopping owns:

- products
- carts
- orders
- order state
- store/platform identity
- world-app context display and route filters when Shopping is the target module
- business truth for `shopping`-bound shop entries surfaced by App Store
- source-created product links, gift cards, vouchers, virtual gifts, and order-share objects that may be rendered in Chat as `share_card`

Shopping does not own:

- Wallet ledger truth
- long-term asset ownership truth
- Chat service-account identity lifecycle
- Chat message history or peer-to-peer message ownership
- World Pack activation or app-binding definitions
- App Store listing/search/identity/curation controls for shop-entry facades

## 2. Logistics

Logistics owns:

- delivery-status context
- tracking-facing communication surface
- tracking notification payloads sent into existing Chat service accounts
- source-created tracking/order-share objects that may be rendered in Chat as `tracking_share` or `order_share`

Logistics does not own:

- shopping cart
- checkout
- Wallet ledger truth
- storefront behavior
- Chat message history or peer-to-peer message ownership

## 3. Food Delivery

Food Delivery owns:

- restaurants
- menus
- carts
- food orders
- food-order event records
- world-app context display and route context when Food Delivery is the target module
- business truth for `food_delivery`-bound shop entries surfaced by App Store

Within the Food Delivery pseudo-folder, Food Platform and shop mini apps are peer user-facing entries. Food Platform may provide discovery, filters, and creation handoff, but each shop mini app should present its own cart, checkout confirmation, order status, delivery events, and Wallet expense suggestions.

Food Delivery does not own:

- Wallet ledger truth
- long-term asset ownership truth
- Chat service-account identity lifecycle
- World Pack activation or app-binding definitions
- App Store listing/search/identity/curation controls for shop-entry facades

## 4. Wallet

Wallet owns:

- ledger
- transfers
- downstream expense/income records
- primary currency selection
- shared currency registry and editable reference exchange rates

Wallet does not own:

- product ownership
- order truth
- market behavior
- asset truth
- World Pack activation or world-specific currency authorship

## 5. Assets

Assets owns:

- long-term owned things
- asset lifecycle state
- property-like or durable ownership records

Assets does not own:

- the ledger itself
- shopping order truth
- stock market behavior

## 6. Stock

Stock owns:

- market and watchlist behavior
- holdings context
- market-review cues when designed

Stock does not own:

- Wallet ledger truth
- general asset ownership truth

## 7. Cross-Module Rule

- Shopping and Food Delivery can feed Wallet.
- Shopping, Logistics, and Food Delivery can push Chat service-account notification messages, but those messages are snapshots and source links rather than copied business state.
- Shopping and Logistics can create source-owned share objects for Chat. Ordinary Shopping products shared from Chat should be `product_link`; direct user-sendable gifts should be source-created digital gifts such as gift cards, vouchers, redemption codes, or virtual gifts; physical goods should become order/tracking/share-signature context only after Shopping or Logistics creates that source event.
- Shopping can consume a World Pack app binding as label/context/default-filter input, and Food Delivery can consume a `dispatch -> Food Delivery` binding as label/context/default-view input, but the binding must not create Shopping products, restaurants, menus, carts, checkout records, orders, logistics or delivery events, Wallet records, Assets records, Calendar cues, or Chat messages.
- App Store may surface `food_delivery` and `shopping` folder mini-app entries, and may route `Add mini app` into the selected target with `createShop=1`, but those entries are install facades/open contexts/owner handoffs only. Food Delivery and Shopping keep their own menus/products, carts, checkout, orders, fulfillment events, browsing filters, favorites/recent lists, handoffs, and service notifications.
- Wallet may provide supporting relationship traceability for Shopping/Food records, but the primary order or shared-meal memory remains owned by the upstream module lineage.
- WorldBook/World Pack may declare custom world currencies, but Wallet owns whether they are selected as the primary currency and how their USD/CNY/CNY reference rates are maintained.
- Shopping and qualifying purchases can later feed Assets.
- Stock can later feed cues or investment summaries, but should not absorb Wallet or Assets ownership.
- Files or Photos may support these modules, but do not become the business owner of their records.
