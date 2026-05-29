# Commerce Finance And Assets Product Boundary

Updated: 2026-05-19

This file defines ownership boundaries for Shopping, Logistics, Food Delivery, Wallet, Assets, and Stock.

## 1. Shopping

Shopping owns:

- products
- carts
- orders
- order state
- store/platform identity
- world-app context display and route filters when Shopping is the target module

Shopping does not own:

- Wallet ledger truth
- long-term asset ownership truth
- Chat service-account identity lifecycle
- World Pack activation or app-binding definitions

## 2. Logistics

Logistics owns:

- delivery-status context
- tracking-facing communication surface
- tracking notification payloads sent into existing Chat service accounts

Logistics does not own:

- shopping cart
- checkout
- Wallet ledger truth
- storefront behavior

## 3. Food Delivery

Food Delivery owns:

- restaurants
- menus
- carts
- food orders
- food-order event records

Food Delivery does not own:

- Wallet ledger truth
- long-term asset ownership truth
- Chat service-account identity lifecycle

## 4. Wallet

Wallet owns:

- ledger
- transfers
- downstream expense/income records

Wallet does not own:

- product ownership
- order truth
- market behavior
- asset truth

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
- Shopping can consume a World Pack app binding as label/context/default-filter input, but the binding must not create Shopping products, carts, checkout records, orders, logistics events, Wallet records, Assets records, Calendar cues, or Chat messages.
- Wallet may provide supporting relationship traceability for Shopping/Food records, but the primary order or shared-meal memory remains owned by the upstream module lineage.
- Shopping and qualifying purchases can later feed Assets.
- Stock can later feed cues or investment summaries, but should not absorb Wallet or Assets ownership.
- Files or Photos may support these modules, but do not become the business owner of their records.
