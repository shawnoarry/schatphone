# Commerce Finance And Assets Product Boundary

Updated: 2026-08-10

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
- source product prices, discounts, cart totals, checkout totals, and immutable Shopping order/refund money snapshots

Within the Shopping pseudo-folder, Coupang, 29CM, and Kurly are independent marketplace Apps, while WORKSOUT, IKEA Korea, and OLIVE YOUNG are independent specialty-store Apps. Their stable service IDs remain unchanged for persistence compatibility. Each has its own canonical route, branded interface, catalog view, search, categories, favorites, cart, checkout, order history, and logistics view. They may reuse one Shopping-owned store, schema, quote service, persistence envelope, and downstream handoff implementation, but all visible commerce state is scoped by `serviceKey`; there is no aggregate Shopping hub, in-App platform switcher, cross-App cart, or mixed checkout. A setting anchor must not be presented as an official branch address. Map owns place truth; Shopping must not copy or mutate place records. Home owns folder presentation, and App Store owns listing and install visibility; neither owns or mutates Shopping business records. Shopping may display a public retailer name, a recognizable brand App logo, and restrained color/information-architecture reference for immersive world building, but it must not import an official catalog, product imagery, price, advertising copy, or affiliation claim.

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
- source menu prices, modifiers, delivery fees, minimum-order thresholds, cart totals, and immutable Food Delivery order/refund money snapshots

Within the Food Delivery pseudo-folder, Food Platform and shop mini apps are peer user-facing entries. Food Platform may provide discovery, filters, creation handoff, and a Food Platform-scoped cart/order flow for merchants that exist only inside the platform. Independent shop mini apps each retain a separate persistent restaurant-scoped cart and present their own checkout confirmation, order status, delivery events, and Wallet expense suggestions. Multiple independent-shop carts may coexist, but no shop may disclose, replace, clear, aggregate, or check out a peer shop's cart; Food Platform must not aggregate those peer shop-app orders.

Built-in independent-shop facades currently include Moon Bistro `food_seed_moon_bistro` / `dark_tray_menu`, Peach Cloud `food_seed_peach_cloud` / `dessert_window`, Dash Grill `food_seed_dash_grill` / `quick_service_chain`, Jade Hearth `food_seed_jade_hearth` / `jade_table_menu`, and Verdant Day `food_seed_verdant_day` / `minimal_light_food`. Their page composition and route-driven in-app views may differ by brand. Jade Hearth owns presentation for `shopView=menu|feast|bag|orders|order`; Verdant Day owns presentation for `shopView=menu|detail|bag|orders|order`. Those views remain facades over Food Delivery-owned restaurant, menu, cart, checkout, order, and event records rather than separate runtime owners.

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
- virtual bank-account containers, debit/credit-card credentials, current/default-card choice, and card freeze state
- account-scoped balance projections derived from the Wallet ledger
- primary currency selection
- shared currency registry and editable reference exchange rates
- shared money quotation, deterministic rounding, and formatting contracts
- rate-set revisions and quote provenance used by downstream snapshots
- disclosed role-payee account references
- explicit same-currency role-transfer confirmation, confirmed transaction receipts, and source Chat lineage
- verified-payee management and Wallet-origin repeat-transfer navigation over those same disclosed references
- source-owned `wallet_receipt_share` snapshots and receipt routes; the sent card's Chat return context is transport metadata and does not replace the transaction's original Chat lineage

Wallet does not own:

- product ownership
- order truth
- market behavior
- asset truth
- World Pack activation or world-specific currency authorship
- real bank identity, legal account issuance, real card-network processing, or real-world banking product terms
- source product/menu prices, discounts, fees, thresholds, cart calculations, order totals, refunds, or market quotes
- mutation of historical records when the primary currency or exchange rates change
- treatment of a credit-card limit as cash balance, net worth, or an Asset
- original role-profile receiving-account definitions
- NPC wealth, NPC spendable balances, automatic exchange, or transfers inferred from Chat dialogue/account-card display
- Chat conversation choice, message history, or share-card send confirmation

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

- Shopping and Food Delivery can feed Wallet. They retain source-money and order truth; Wallet supplies current quotes and receives immutable downstream transaction snapshots.
- Shopping, Logistics, and Food Delivery can push Chat service-account notification messages, but those messages are snapshots and source links rather than copied business state.
- Shopping and Logistics can create source-owned share objects for Chat. Ordinary Shopping products shared from Chat should be `product_link`; direct user-sendable gifts should be source-created digital gifts such as gift cards, vouchers, redemption codes, or virtual gifts; physical goods should become order/tracking/share-signature context only after Shopping or Logistics creates that source event.
- Shopping can consume a World Pack app binding as label/context/default-filter input, and Food Delivery can consume a `dispatch -> Food Delivery` binding as label/context/default-view input, but the binding must not create Shopping products, restaurants, menus, carts, checkout records, orders, logistics or delivery events, Wallet records, Assets records, Calendar cues, or Chat messages.
- App Store may surface `food_delivery` and `shopping` folder mini-app entries, and may route `Add mini app` into the selected target with `createShop=1`, but those entries are install facades/open contexts/owner handoffs only. Food Delivery and Shopping keep their own menus/products, carts, checkout, orders, fulfillment events, browsing filters, favorites/recent lists, handoffs, and service notifications.
- Wallet may provide supporting relationship traceability for Shopping/Food records, but the primary order or shared-meal memory remains owned by the upstream module lineage.
- Wallet may use real-world bank names as fictional-world institution references, but account numbers, card products, balances, limits, and transactions are SchatPhone-owned virtual records. A separate Bank app is not required for the current account/card loop.
- Each cash transaction belongs to one compatible Wallet account. Legacy transactions without an account ID resolve to the default account for their recorded currency; changing the selected display currency or a reference rate never moves money between accounts.
- Wallet may reopen a retained role-payee reference for another explicitly confirmed transfer. That path must reuse the existing role-transfer runtime and distinguish Wallet, Chat, and Activity return origins; opening the payee list or transfer form never moves money.
- A multi-currency credit card may declare supported and settlement currencies, but its credit line stays outside cash balances and Assets.
- WorldBook/World Pack may declare custom world currencies, but Wallet owns whether they are active/primary and how their effective reference rates are maintained. A Pack-provided rate is a proposal/provenance input, not permission to rewrite existing records.
- Current catalog values may be quoted into the Wallet primary currency, but submitted orders, Wallet ledger entries, transfers, notifications, and source-linked memories keep their recorded money and rate snapshot. Replacing only a currency label without converting the number is a boundary violation.
- Finance-consuming modules use `WALLET_CURRENCY_AND_MONEY_CONVERSION_PLAN.md`; they must not create competing rate tables, hidden `1:1` fallbacks, or formatted-string money fields.
- Shopping and qualifying purchases can later feed Assets.
- Stock can later feed cues or investment summaries, but should not absorb Wallet or Assets ownership.
- Files or Photos may support these modules, but do not become the business owner of their records.
