# Commerce Finance And Assets Implementation Workstreams / 消费金融资产实施工作流

Updated: 2026-06-03

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
- Food Platform is a peer discovery mini app inside the Food Delivery pseudo-folder. Shop cart, checkout confirmation, order cards, delivery events, and Wallet suggestions should stay inside the opened shop mini app surface instead of being aggregated into Food Platform.

## 3. Workstream C: Wallet And Downstream Records

- expense/income ingestion
- ledger cleanup rules
- relationship support records where needed
- order-support relationship facts must remain supporting-only when Shopping or Food Delivery already owns the primary memory

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
