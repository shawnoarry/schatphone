# Wallet Currency And Money Conversion Plan

Updated: 2026-08-07

Status: `PARTIALLY IMPLEMENTED CONTRACT / NOT A ROADMAP`

This document defines how Wallet currency settings should affect prices, totals, records, and price-bearing media across SchatPhone. It records the target contract and the current gaps; it does not promote an implementation slice or replace `docs/roadmap/TODO_ROADMAP.md`.

## 1. Product Decision

Wallet is the one user-facing authority for:

- the registered currency list;
- the user's primary display currency;
- reference exchange-rate sets and user edits;
- shared conversion, rounding, and formatting rules;
- quote metadata needed by downstream modules.

Shopping, Food Delivery, Stock, and other source modules remain the owners of source prices and business records. A Wallet setting may change how a current value is quoted or displayed; it must not silently rewrite a product's source price, an executed order, a market quote, or historical ledger truth.

The default product model uses a stable offline reference-rate table based on reasonable real-world average values. Rates do not refresh automatically every day. This gives deterministic fictional-world behavior, works offline, and prevents a saved scene or cart from changing because an external provider moved overnight.

A live-rate provider may be added later only as an opt-in/manual-refresh source. It must be cached, identify its provider and timestamp, create a new rate-set revision, and never rewrite historical snapshots.

## 2. Current Implementation Baseline

| Capability | Current state | Contract implication |
| --- | --- | --- |
| Persisted primary currency | Implemented in Wallet | Keep Wallet as the setting owner |
| Currency registry | Built-ins carry exponent metadata; the World Pack editor explicitly authors exponent `0-6`; injected/custom currencies preserve it and legacy definitions safely default to exponent 2 | Keep currency codes and their authored exponent stable after records use them |
| Shared money and quote core | Wallet exposes integer-minor-unit quotation and formatting backed by decimal-string rates, deterministic `ROUND_HALF_UP` arithmetic, and an explicit legacy-exponent-2 cents adapter | Continue adopting it module by module without reinterpreting legacy `*Cents` fields |
| Editable rates | USD/CNY and per-currency CNY-facing edits now create a persisted `rateSetId`, revision, source, and timestamp; legacy numeric payloads normalize to decimal strings | Preserve the current revision in catalog quotes and freeze it into later checkout/order snapshots |
| Per-currency accounts and cards | Wallet now exposes six virtual single-currency accounts with debit cards plus one six-currency credit card; old ledger rows map to the default account for their recorded currency | Keep account selection separate from display-currency selection and keep credit limits outside cash balances |
| Role receiving accounts | Non-self role profiles own stable fictional receiving-account definitions; Chat discloses a masked system card and Wallet confirms same-currency payment | Keep disclosure separate from transfer, keep AI out of credential generation, and do not infer NPC wealth or automatic exchange |
| Food Delivery | Source restaurant/menu/cart values remain native; current menus, modifier deltas, fees, Baemin campaign values and thresholds, carts, and checkouts quote through Wallet across current facades | Keep custom menu values in their restaurant source currency and keep submitted order snapshots immutable |
| Dynamic poster conversion | Peach Cloud White Peach Lime now consumes the shared Wallet quote/formatter and falls back to honest source-currency display when a target rate is missing | Reuse the finance rule, not its poster-specific layout |
| Platform minimum order | Baemin merchant thresholds are structured Money values in their source currency and use the Wallet quote/format path | Compare the quoted threshold in the merchant source currency before checkout and submission |
| Shopping | Products and orders keep source currencies; catalog/cart surfaces show current Wallet-primary quotes with honest source fallback | Preserve source totals and finish mixed-currency settlement semantics before aggregating more than the existing primary payable total |
| Historical records | New Shopping, Food Delivery, Food Platform, and downstream Wallet records normalize and persist quote snapshots through backup/restore | Existing pre-snapshot records remain unchanged; refunds still need the same snapshot contract when implemented |

Changing `39.00 CNY` to `39.00 EUR` without changing `39.00` is not conversion. Until a module uses the shared quote contract, it must present its source currency honestly rather than claim Wallet-primary conversion.

Foundation checkpoint, 2026-08-06: `src/lib/currency-system.js` and `src/stores/wallet.js` implement the shared registry metadata, decimal-string rate revisions, exact minor-unit quote, deterministic formatting, explicit missing-rate result, backup compatibility, and Wallet service API. Direct tests cover exponent-0/exponent-2 formatting, positive and negative conversion, half-up boundaries, unavailable rates, revisions, and legacy rate migration. At that checkpoint alone, general Food Delivery, Baemin, Shopping, Chat transfer persistence, orders, refunds, and ledger records had not yet migrated; later checkpoints below record the promoted adoption work.

Card-pack checkpoint, 2026-08-06: Wallet Home, Cards, Activity, Transfer, Receive, and Settings now expose six virtual single-currency bank accounts, six debit cards, and one multi-currency credit card. Transactions persist optional `accountId` and `cardId`; older rows keep their recorded currency/amount and resolve to that currency's default account at read time. Changing display currency or reference rates does not exchange balances, and the Hana credit limit remains a separate credit facility rather than cash. Real-world institution names are setting references only; SchatPhone's accounts, card products, identifiers, balances, and terms are fictional.

Role-payee checkpoint, 2026-08-06: a Chat account request now produces a system-generated `payee_account` card from the persisted role profile and no ledger write. Wallet stores the disclosed reference, verifies route/profile/currency lineage, lists only compatible same-currency accounts, requires an active debit card and sufficient cash balance, and freezes the confirmed amount/currency plus receipt and Chat lineage into the Wallet transaction. This checkpoint does not add NPC balances, automatic conversion, background settlement, or real banking rails.

Commerce quote-adoption checkpoint, 2026-08-06: Shopping catalog and cart values now quote through Wallet without replacing source `priceCents`; checkout freezes the existing primary payable total into a normalized `MoneyQuote`, and explicit Wallet expense recording reuses that exact snapshot after primary-currency or rate changes. New Food Delivery and Food Platform orders use the same persisted snapshot field and downstream Food Delivery Wallet expenses retain it. Baemin minimum-order labels are structured KRW/CNY Money values with Wallet-primary quotation, and World Pack currency authoring now requires an explicit exponent from `0` through `6`. Focused tests cover zero-decimal legacy adaptation, missing/partial snapshot rejection, historical stability, backup restore, and ledger propagation.

Food Delivery source-price checkpoint, 2026-08-06: independent-shop and Baemin menus, modifier deltas, delivery fees, campaign picks, carts, and checkout totals now derive Wallet-primary quotations from retained source values. Custom menu records inherit their restaurant currency, Dash Grill and Harbor Roast customization prices remain source-native until quotation, cart totals convert authoritative source totals once, and Baemin compares structured thresholds in the merchant source currency before both checkout navigation and submission. Missing rates retain honest source display, while new order and downstream Wallet records keep immutable quote provenance. Mixed-currency Shopping settlement, refund snapshots, and the general poster-anchor schema remain open.

Wallet quote-explainability checkpoint, 2026-08-07: every Wallet Activity record now opens a general `transactionId` detail. Valid saved snapshots present source money, settled quoted money, the exact recorded rate, `rateSetId`, rate source, and quote time without calling the current quote service; current primary-currency/rate edits therefore cannot change historical display. Legacy or malformed snapshots produce one explicit no-snapshot state, unavailable historical currency definitions use raw minor-unit/code fallback, and role-payee `receiptId` remains a separate surface.

## 3. Ownership Boundary

| Concern | Owner | Consumer rule |
| --- | --- | --- |
| Product/menu base price | Source module | Wallet must not edit it |
| Market quote | Stock or future market module | Wallet may show an approximate equivalent only |
| Primary display currency | Wallet | Consumer modules subscribe to it |
| Currency metadata and exchange rates | Wallet | Consumer modules do not keep competing tables |
| Virtual accounts, cards, and card controls | Wallet | Account balances derive from ledger records; cards do not create a second balance owner |
| Original role receiving-account definition | Contacts role profile | Wallet stores only the disclosed reference; Chat stores only the message/card snapshot |
| Cart and checkout business totals | Source module | Compute source truth first, then request a Wallet quote |
| Order, refund, and ledger history | Record owner | Store immutable money and rate snapshots |
| World-specific currency declaration | WorldBook / World Pack | Wallet decides activation, primary selection, rate, and display metadata |
| Price placement in branded media | Owning UI/brand surface | Use the shared money quote and formatter inside a shop-specific layout anchor |

Wallet supplies a conversion service; it does not become the owner of carts, orders, products, holdings, rewards, or assets.

## 4. Money And Currency Model

### 4.1 Currency Definition

Every enabled currency needs stable metadata:

```text
CurrencyDefinition
  code: uppercase stable code
  symbol: display symbol
  labelZh / labelEn: localized names
  exponent: number of decimal digits in one major unit
  source: system | world_pack | user
  worldPackId: optional provenance
```

Default exponents:

| Currency | Exponent | Smallest represented unit |
| --- | ---: | --- |
| CNY, USD, EUR, HKD | 2 | `0.01` major unit |
| JPY, KRW | 0 | `1` major unit |
| Custom currency | Required declaration | `10^-exponent` major unit |

The formatter may place a symbol before or after the number according to locale, but formatting never changes the stored amount.

### 4.2 Money Value

New shared contracts should use integer minor units:

```text
Money
  amountMinor: signed integer
  currency: currency code
```

`amountMinor = 3900, currency = CNY` means `39.00 CNY`. `amountMinor = 3900, currency = KRW` means `3,900 KRW` because KRW has exponent `0`.

Do not use binary floating-point numbers as persisted money. Do not infer decimal precision from a UI string. The currency registry supplies the exponent.

Existing `priceCents`, `amountCents`, and `totalCents` fields remain backward-compatible during migration. Unless a record explicitly carries another unit contract, those legacy fields keep their historical exponent-2 meaning; they must never be silently reinterpreted as zero-decimal KRW/JPY minor units.

### 4.3 Quote Snapshot

Catalog display may use an ephemeral quote. Checkout, orders, refunds, Wallet transactions, and source-linked notifications require a snapshot:

```text
MoneyQuote
  sourceMoney: Money
  quotedMoney: Money
  rateSetId: stable revision identifier
  rate: decimal string used for source -> target
  rateSource: bundled_average | user_edit | world_pack | live_provider
  quotedAt: timestamp
  targetCurrency: currency code
```

An order line may additionally store source unit money and quoted unit money. The order total must always store both source truth and the final settlement/display quote used at submission.

## 5. Exchange-Rate Design

### 5.1 Rate Meaning

The current implementation uses USD as a pivot. `rateToUsd[ABC]` means one major unit of `ABC` equals that many USD. Preserve that meaning during migration:

```text
targetMajor = sourceMajor * rateToUsd[source] / rateToUsd[target]
```

Example with `1 CNY = 0.1389 USD` and `1 USD = 1 USD`:

```text
39.00 CNY -> 39.00 * 0.1389 / 1 = 5.4171 USD -> 5.42 USD
```

CNY-facing editing may remain the Wallet UI because it is understandable to the current user base. Internally, one normalized versioned rate set must be used by every module.

### 5.2 Precision And Provenance

- Persist rate values as decimal strings or rational values, not uncontrolled JavaScript floats.
- Every material edit creates a new `rateSetId` and `updatedAt`; prior records keep their earlier revision.
- Bundled rates identify their application/version as provenance.
- A World Pack may propose a starting rate, but Wallet activation or user editing creates the effective Wallet-owned revision.
- Missing or invalid rates must produce an explicit unavailable state. Falling back to `1:1` is forbidden.
- Cross-rate conversion must use one normalized rate set; a module must not combine one stale CNY rate with a newer USD rate.

### 5.3 Why Daily Automatic Rates Are Not The Default

Automatic daily rates are technically feasible through a network provider, but they add availability, caching, provider licensing, time-zone, replay, and historical-consistency requirements without improving the core simulation. Stable reference averages are the default. Later live rates should be useful for an explicitly realistic mode, not a hidden dependency of ordinary shopping or story playback.

## 6. Conversion, Rounding, And Formatting

1. Read source money and source exponent.
2. Convert the source minor-unit integer to an exact decimal major value.
3. Apply the selected rate-set revision once.
4. Round to the target currency exponent using deterministic decimal `ROUND_HALF_UP` behavior.
5. Persist the target minor-unit integer only when a snapshot is required.
6. Format through one locale-aware formatter.

Authoritative cart calculations happen in source currency. Sum source line subtotals, discounts, tax, and fees according to the source module's rules, then convert the final payable total once. Do not independently round every visual line and add those rounded labels to obtain a different checkout total.

When a receipt requires quoted line totals that must sum to the quoted order total, calculate exact line shares and distribute the remaining minor units by largest fractional remainder, using stable line ID as the tie-breaker.

Formatting rules:

- use the target currency exponent (`KRW 5,015`, not `KRW 5,015.00`);
- use the active locale for grouping and decimal separators;
- show a currency code when a symbol is ambiguous;
- keep negative signs and accessibility labels consistent;
- never store a formatted string such as `10,000원` as business money;
- label secondary current-rate equivalents as approximate when they are not the executed/snapshotted amount.

## 7. Value Lifecycle

### Catalog And Browse

The source module stores the native price. The UI derives an ephemeral quote in the Wallet primary currency. A primary-currency or rate edit may update current catalog display immediately.

### Cart

The cart retains source line money and may re-quote for presentation when settings change. It should show one coherent target currency per checkout surface. A rate-unavailable item must remain visibly priced in its source currency rather than being relabeled.

### Checkout

Immediately before submission, the source module computes the source total and requests the final quote. The confirmation surface shows the source amount when helpful, the chosen settlement/display amount, and rate provenance when the user asks for details.

### Submitted Order And Wallet Record

Submission freezes the source values and quote snapshot. Changing Wallet primary currency or rates later does not alter order history, Wallet transactions, service notifications, relationship-support facts, refunds, or receipt totals.

### Refund Or Reversal

The source module owns refund eligibility and amount. A refund should reference the original order and its original settlement snapshot unless the product explicitly defines re-conversion; any re-conversion must create a new named quote rather than overwrite the original.

## 8. Module Integration Matrix

| Module/surface | Source truth | Wallet-primary behavior | Historical behavior |
| --- | --- | --- | --- |
| Food Delivery independent shops | Menu price, modifiers, fees, cart, order | Quote menu, modifier deltas, fees, thresholds, and current cart through one adapter | Freeze source and quoted money on order/Wallet handoff |
| Baemin platform | Merchant menu, minimum order, delivery fee, platform cart/order | Replace all hard-coded money strings and mixed currencies with the same adapter | Freeze platform order independently of shop-app orders |
| Shopping | Product price, discounts, cart, order, logistics-linked refund | Show a Wallet-primary quote while retaining the product's native currency | Freeze checkout/order/refund snapshots |
| Wallet | Ledger transaction currency, amount, and compatible account/card lineage | Show actual per-account/per-currency balances; an optional primary equivalent is approximate and credit limits remain separate | Never collapse, exchange, or rewrite ledger entries into the new primary currency |
| Chat role-payee request | Planned amount chosen by sender; receiving currency comes from the persisted role account | Chat locks the request to the role-account currency and routes to Wallet; no quote or deduction occurs in Chat | Wallet confirmation freezes the submitted amount/currency, payment account/card, recipient reference, receipt, and Chat lineage |
| Chat/notification cards | Source-owned order/transaction snapshot | May add a clearly marked current approximate equivalent | Primary card value remains the source snapshot |
| Stock | Native market quote and holding currency | Optional secondary Wallet-primary equivalent only | Preserve the market quote timestamp/currency |
| Assets | Source acquisition/value record when one exists | Optional current estimate uses an explicit valuation quote | Acquisition truth remains unchanged |
| Calendar/Map/Event surfaces | Referenced source record | Reuse the referenced snapshot; do not perform an independent hidden conversion | Keep the linked record's historical value |
| World Pack | Currency declaration and optional suggested rate | Wallet controls activation, edits, and primary selection | Pack changes do not rewrite existing records |

New finance-consuming modules must depend on the shared money/quote/format adapter. They must not read Wallet state and implement their own formula locally.

## 9. Price-Bearing Posters And Brand Media

Prices that need to follow Wallet settings must not be baked into raster artwork. Keep the image text-free at the price location and define a per-asset layout anchor:

```text
PosterPriceAnchor
  assetId
  xPercent / yPercent
  widthPercent
  alignment
  textStyleToken
  lightOrDarkTreatment
  sourceMoney or sourceItemId
```

Different posters may use different coordinates, alignment, typography, and contrast treatment. The shared part is the quoted money value and formatter, not one forced visual template. Each anchor needs desktop/mobile crop tests and enough width for the longest supported currency output.

The Peach Cloud White Peach Lime derivative proves that this is feasible. It remains a shop-specific pilot, not the universal schema. Existing artwork with baked prices is an explicit fixed-price exception until a text-free derivative and anchor are accepted; code must not place a second dynamic price over an existing baked price.

## 10. Migration And Compatibility

1. `FOUNDATION DONE 2026-08-06`: add `exponent` to built-in and custom currency definitions with safe legacy defaults and expose explicit World Pack exponent authoring.
2. `FOUNDATION DONE 2026-08-06`: introduce shared `Money`, conversion, quote, rounding, and formatting helpers with direct tests, then route the Peach Cloud dynamic-price pilot through them.
3. Keep reading legacy exponent-2 `*Cents` fields; write new snapshot fields alongside them during a compatibility window.
4. `FOOD DELIVERY DONE 2026-08-06`: replace Baemin formatted thresholds and migrate current independent-shop/platform menus, modifiers, fees, carts, checkout, order snapshots, and Wallet handoff to the shared source-money contract.
5. `SHOPPING CATALOG/CART DONE 2026-08-06`: quote current Shopping presentation and freeze new order/Wallet snapshots; mixed-currency settlement remains undefined. Chat role transfers remain locked to the disclosed payee-account currency and do not perform hidden conversion.
6. Add optional approximate equivalents to Stock, Assets, notifications, and other consumers only where they improve comprehension.
7. Remove legacy relabel-only paths only after backup restore, old orders, and old Wallet transactions pass migration tests.

These are dependency phases, not active roadmap priority. Each implementation round must be promoted separately.

## 11. Acceptance Contract

A module may claim Wallet-primary currency support only when:

- switching CNY to EUR or KRW changes both the numeric value and the unit using the selected rate revision;
- zero-decimal and exponent-2 currencies round and format correctly;
- menu/product price, modifiers, fees, discounts, thresholds, cart, and checkout remain internally coherent;
- a missing rate never falls back to `1:1` or a relabeled source number;
- changing the rate or primary currency updates current catalog quotes but not submitted orders or ledger history;
- mixed-source carts either follow an explicit supported settlement rule or block unsupported checkout clearly;
- source money and quote provenance survive backup/restore;
- the same conversion produces the same minor-unit result across every consuming module;
- poster anchors remain readable without duplicating or clipping baked artwork;
- focused unit tests cover conversion, negative values, rounding boundaries, rate revisions, formatting, and legacy migration;
- targeted end-to-end tests cover one catalog-to-order-to-Wallet flow and one historical-record stability flow.

## 12. Explicit Non-Goals

- Wallet does not continuously track real-world foreign-exchange markets by default.
- Changing primary currency does not redenominate or merge ledger balances.
- Wallet does not create real bank accounts, claim real bank/card products, or connect to real payment rails; the current account and card pack is fictional simulation data.
- Role receiving accounts do not create NPC wealth, NPC-spendable balances, automatic exchange, or AI-authored banking credentials.
- A multi-currency credit limit is not cash, an exchange balance, or an Asset.
- Wallet does not decide source product prices, discounts, tax, delivery fees, refund policy, or market quotes.
- Exchange-rate edits do not mutate historical orders, transfers, notifications, or relationship memories.
- Poster price adaptation does not require every brand to use the same typography or price position.
- This document does not authorize implementation or create a second backlog.
