# Commerce Finance And Assets Implementation Workstreams / 消费金融资产实施工作流

Updated: 2026-08-10

## 1. Workstream A: Shopping And Logistics

- store/platform identity
- order lifecycle
- logistics follow-up
- service-account messaging
- Shopping order notifications into matching Shopping service accounts
- logistics event notifications into matching Logistics service accounts
- World Pack marketplace context for Shopping, currently limited to `补给站` entry semantics and Kurly / Grocery filter routing over the stable `daily_fresh` service key
- App Store can expose Shopping platform services as `shopping`-bound folder mini-app facades and control whether they appear in the Shopping folder list, but Shopping still owns products, cart, checkout, orders, logistics links, browsing filters, favorites/recent lists, and service notifications
- App Store `Add mini app` can hand off to Shopping with `createShop=1`, but Shopping must own any real product/store/service records; custom Shopping store records beyond preset platform services remain a Shopping product decision
- Shopping's built-in pseudo-folder exposes three independent real-name marketplace Apps (Coupang: `schat_mall` / `city_market`; 29CM: `nova_digital` / `tech_catalog`; Kurly: `daily_fresh` / `fresh_market`) and three independent real-name specialty-store Apps (WORKSOUT: `style_cloud` / `fashion_editorial`; IKEA Korea: `nordhus_home` / `room_planner`; OLIVE YOUNG: `mellow_care` / `care_lab`). Their routes, brand-color-derived headers, CLI-redrawn brand App icons, Seoul setting anchors, catalog views, search, categories, favorites, carts, checkout, order views, and logistics views are App-specific. All six reuse one Shopping-owned schema, quote, backup, and persistence implementation underneath, with visible state scoped by `serviceKey` and no cross-App cart or mixed checkout.
- Built-in Shopping content currently includes 31 stable bilingual fictional products: the original four per facade plus seven additive category-fill seeds. Every allowed storefront category now has at least one visible product, with `mall` retaining its aggregate all-products behavior. Normal hydration may add missing built-in IDs without overwriting same-ID saved records; explicit backup restore must remain snapshot-faithful.

## 2. Workstream B: Food Delivery

- restaurant/order lifecycle
- delivery exceptions
- service-account pushes
- route context consumption
- order and order-event notifications into the Food Delivery Dispatch service account
- EVE-4A is a completed technical spike with product acceptance withdrawn: no Food Delivery Event Surface host, `Dispatch brief`, expansion/acknowledgement, or manual query-that-manufactures-delay remains
- keep exact one-to-one owner-validated order/event/runtime-log lineage; legitimate Runtime delivery exceptions update the Food Delivery-owned ETA and native timeline, then use the existing Chat dispatch notification
- World Pack dispatch context for Food Delivery, including built-in `救援调度` and confirmed nonstandard `dispatch_board` entries, currently limited to hero/banner, Nearby default view, and route context preservation
- App Store can expose Food Delivery restaurants as `food_delivery`-bound folder mini-app facades and control whether they appear in the Food Delivery folder list, but Food Delivery still owns restaurants, menus, cart, checkout, orders, delivery events, browsing filters, favorites/recent lists, and service notifications
- App Store `Add mini app` can hand off to Food Delivery with `createShop=1`; the real restaurant record is created by Food Delivery's custom restaurant flow
- Food Platform is a peer mini app inside the Food Delivery pseudo-folder. Merchants that exist only inside Food Platform may use a platform-scoped cart, checkout confirmation, and platform order history. Independent shop mini apps keep separate persistent restaurant-scoped carts, checkout confirmation, order cards, delivery events, and Wallet suggestions instead of being aggregated into Food Platform or exposed to one another.
- Built-in shop facades may use brand-specific route-driven page composition while sharing Food Delivery runtime ownership. The current six directions are `dark_tray_menu`, `dessert_window`, `quick_service_chain`, `jade_table_menu`, `minimal_light_food`, and `harbor_roast_chain`; these facades own presentation, not a second cart/order runtime.
- the real-shop expansion keeps five stable Seoul restaurant Apps on the reusable `standard` facade, with four original menu records each, separate restaurant bags/orders, and additive normal hydration that never rewrites same-ID saved data; explicit backup restore remains snapshot-faithful
- Home renders the resulting clean-seed 15-entry Food Delivery launcher as stable `3 x 3` pages (`9 + 6`) and owns touch, pointer-drag, wheel/trackpad, keyboard, arrows, dots, page reset/clamp, and underlying-Home gesture containment; Food Delivery supplies entry metadata and keeps business truth
- each reality-anchored restaurant retains one stable Map `sourceId`; Map owns the public address, bilingual aliases/search metadata, and reviewed coordinate, while Food Delivery owns no coordinate or place mutation
- public brand/cuisine research may guide an original or reviewed App mark and broad menu category only; do not import official menu names, prices, descriptions, product photography, campaigns, advertising, or affiliation claims

## 3. Workstream C: Wallet And Downstream Records

- expense/income ingestion
- ledger cleanup rules
- relationship support records where needed
- order-support relationship facts must remain supporting-only when Shopping or Food Delivery already owns the primary memory
- shared currency registry, Wallet primary-currency selection, and editable USD/CNY-centered reference exchange rates
- custom World Pack currencies may be injected from WorldBook, but Wallet owns selection/rates and Chat/Food Delivery consume the Wallet currency options
- implemented Wallet foundation for integer-minor-unit money, decimal-string rate revisions, deterministic rounding, locale-aware formatting, explicit unavailable quotes, and legacy numeric-rate migration as defined in `WALLET_CURRENCY_AND_MONEY_CONVERSION_PLAN.md`
- implemented Wallet card-pack baseline with six single-currency virtual bank accounts, six matching debit cards, and one six-currency credit card; all numbers/products are fictional even when institution names anchor the reality-based K-pop setting
- implemented the first Wallet card-appearance collection slice with one curated variable-length catalog per payment card, card-bound owned/equipped state, backup compatibility, code-rendered card identity, and deliberately sealed non-equippable slots when accepted artwork does not yet exist
- ledger transactions remain the only cash-balance truth, explicit account/card lineage is persisted, and legacy transactions map by recorded currency without rewriting their amount
- Wallet Home owns cards, transfer/receive, and recent activity; Cards and Activity provide focused management; display currency and progressively disclosed reference-rate editing live in Wallet Settings
- credit limit, settlement currency, default-card state, and freeze state persist with backup compatibility, but credit availability is never added to cash balance or Assets
- role profiles own their stable fictional receiving-account definitions; Wallet owns only disclosed payee references, confirmed outgoing transactions, and receipts
- Chat `payee_account` cards are review requests, not transfers; Wallet locks recipient/currency, lists only matching same-currency accounts, requires an active linked debit card and sufficient balance, and records the relationship fact only after confirmation
- role-payee transfers do not create NPC cash balances, automatic exchange, background transfers, or a separate Bank app
- source modules retain native prices and authoritative totals; current display may re-quote, while checkout/order/ledger records freeze source money, quoted money, and rate provenance
- current commerce adoption covers Peach Cloud's White Peach Lime price slot, Shopping catalog/cart quotations, Food Delivery menus/modifiers/fees/carts/checkouts across current facades, Baemin campaign values and structured minimum-order enforcement, and new Shopping/Food Delivery/Food Platform order snapshots. Explicit Shopping/Food Delivery Wallet expenses retain the source order quote. Shopping mixed-currency settlement, refund snapshots, and the general poster-anchor schema remain separate work.
- Wallet Activity now owns a general route-backed transaction detail for every ledger row. It presents saved quote provenance without re-quotation, gives legacy/malformed records an explicit no-snapshot state, uses raw minor-unit fallback when a historical currency definition is unavailable, and keeps role-payee transfer receipts as a separate surface.
- Wallet Activity source filters compose with a case-insensitive read-only search over recorded transaction identity and provenance. Search changes only the visible projection, leaves ledger rows and quote snapshots untouched, and retains the same general detail path for every result.
- Wallet Activity exposes a focused monthly-statement projection over retained ledger records. It derives local calendar months, keeps income/spending/net totals separate per original currency, performs no current-rate quotation, and returns statement-opened details to the selected month while leaving delete and role-receipt actions on Activity.
- Wallet Home exposes verified-payee management over retained role-account references. Active rows share one repeat-transfer path into the existing confirmation runtime with empty amount/note, and explicit route origin keeps Wallet returns on the payee list while preserving Chat-card and Activity-receipt behavior.
- Completed role-transfer receipts can create a Wallet-owned `wallet_receipt_share` through the bounded internal Chat-share draft. Chat selects the recipient and finalizes `returnChatId`; Wallet restores the saved receipt, keeps original `sourceChatId` lineage unchanged, and performs no ledger or relationship mutation when the card is sent, opened, canceled, or returned.

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
13. Food Delivery adds a generic Event Surface instead of using native fulfillment state, accepts injected/reused runtime lineage, or lets an update query manufacture a delivery exception
