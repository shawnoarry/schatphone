# Commerce Finance And Assets Implementation Workstreams / 消费金融资产实施工作流

Updated: 2026-08-06

## 1. Workstream A: Shopping And Logistics

- store/platform identity
- order lifecycle
- logistics follow-up
- service-account messaging
- Shopping order notifications into matching Shopping service accounts
- logistics event notifications into matching Logistics service accounts
- World Pack marketplace context for Shopping, currently limited to `补给站` entry semantics and Daily Fresh / Grocery filter routing
- App Store can expose Shopping platform services as `shopping`-bound folder mini-app facades and control whether they appear in the Shopping folder list, but Shopping still owns products, cart, checkout, orders, logistics links, browsing filters, favorites/recent lists, and service notifications
- App Store `Add mini app` can hand off to Shopping with `createShop=1`, but Shopping must own any real product/store/service records; custom Shopping store records beyond preset platform services remain a Shopping product decision

## 2. Workstream B: Food Delivery

- restaurant/order lifecycle
- delivery exceptions
- service-account pushes
- route context consumption
- order and order-event notifications into the Food Delivery Dispatch service account
- World Pack dispatch context for Food Delivery, including built-in `救援调度` and confirmed nonstandard `dispatch_board` entries, currently limited to hero/banner, Nearby default view, and route context preservation
- App Store can expose Food Delivery restaurants as `food_delivery`-bound folder mini-app facades and control whether they appear in the Food Delivery folder list, but Food Delivery still owns restaurants, menus, cart, checkout, orders, delivery events, browsing filters, favorites/recent lists, and service notifications
- App Store `Add mini app` can hand off to Food Delivery with `createShop=1`; the real restaurant record is created by Food Delivery's custom restaurant flow
- Food Platform is a peer mini app inside the Food Delivery pseudo-folder. Merchants that exist only inside Food Platform may use a platform-scoped cart, checkout confirmation, and platform order history. Independent shop mini apps keep separate persistent restaurant-scoped carts, checkout confirmation, order cards, delivery events, and Wallet suggestions instead of being aggregated into Food Platform or exposed to one another.
- Built-in shop facades may use brand-specific route-driven page composition while sharing Food Delivery runtime ownership. The current six directions are `dark_tray_menu`, `dessert_window`, `quick_service_chain`, `jade_table_menu`, `minimal_light_food`, and `harbor_roast_chain`; these facades own presentation, not a second cart/order runtime.

## 3. Workstream C: Wallet And Downstream Records

- expense/income ingestion
- ledger cleanup rules
- relationship support records where needed
- order-support relationship facts must remain supporting-only when Shopping or Food Delivery already owns the primary memory
- shared currency registry, Wallet primary-currency selection, and editable USD/CNY-centered reference exchange rates
- custom World Pack currencies may be injected from WorldBook, but Wallet owns selection/rates and Chat/Food Delivery consume the Wallet currency options
- implemented Wallet foundation for integer-minor-unit money, decimal-string rate revisions, deterministic rounding, locale-aware formatting, explicit unavailable quotes, and legacy numeric-rate migration as defined in `WALLET_CURRENCY_AND_MONEY_CONVERSION_PLAN.md`
- implemented Wallet card-pack baseline with six single-currency virtual bank accounts, six matching debit cards, and one six-currency credit card; all numbers/products are fictional even when institution names anchor the reality-based K-pop setting
- ledger transactions remain the only cash-balance truth, explicit account/card lineage is persisted, and legacy transactions map by recorded currency without rewriting their amount
- Wallet Home owns cards, transfer/receive, and recent activity; Cards and Activity provide focused management; display currency and progressively disclosed reference-rate editing live in Wallet Settings
- credit limit, settlement currency, default-card state, and freeze state persist with backup compatibility, but credit availability is never added to cash balance or Assets
- role profiles own their stable fictional receiving-account definitions; Wallet owns only disclosed payee references, confirmed outgoing transactions, and receipts
- Chat `payee_account` cards are review requests, not transfers; Wallet locks recipient/currency, lists only matching same-currency accounts, requires an active linked debit card and sufficient balance, and records the relationship fact only after confirmation
- role-payee transfers do not create NPC cash balances, automatic exchange, background transfers, or a separate Bank app
- source modules retain native prices and authoritative totals; current display may re-quote, while checkout/order/ledger records freeze source money, quoted money, and rate provenance
- current commerce adoption covers Peach Cloud's White Peach Lime price slot, Shopping catalog/cart quotations, Food Delivery menus/modifiers/fees/carts/checkouts across current facades, Baemin campaign values and structured minimum-order enforcement, and new Shopping/Food Delivery/Food Platform order snapshots. Explicit Shopping/Food Delivery Wallet expenses retain the source order quote. Shopping mixed-currency settlement, refund snapshots, and the general poster-anchor schema remain separate work.

## 4. Workstream D: Assets And Stock

- ownership lifecycle
- stock review cues
- future links into Calendar or Reminders

## 5. Semantic Guardrails

Treat these as bugs:

1. Wallet starts owning shopping or food business state
2. Assets starts acting like a ledger
3. Logistics starts acting like a storefront
4. Stock starts absorbing other financial domains without a clear decision
5. World Pack app bindings mutate commerce records instead of staying at route/context/filter/banner level
6. App Store mini-app facades mutate Shopping or Food Delivery business records, browsing organization, favorites/recent lists, or category filters instead of only managing install identity/open context
7. World Pack currency declarations bypass Wallet's primary-currency and exchange-rate controls
8. A module changes the currency label without converting the numeric value through the shared quote contract
9. A primary-currency or rate change rewrites submitted orders, Wallet transactions, transfers, or other historical money snapshots
10. A card limit is counted as cash, or changing the display currency moves balances between bank accounts
11. A Chat account card, AI reply, or account request deducts money before explicit Wallet confirmation
12. A confirmed role transfer is treated as proof of an NPC-owned spendable balance or triggers automatic currency conversion
