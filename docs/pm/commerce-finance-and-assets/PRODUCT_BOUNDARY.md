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

Shopping does not own:

- Wallet ledger truth
- long-term asset ownership truth

## 2. Logistics

Logistics owns:

- delivery-status context
- tracking-facing communication surface

Logistics does not own:

- shopping cart
- checkout
- Wallet ledger truth

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
- Shopping and qualifying purchases can later feed Assets.
- Stock can later feed cues or investment summaries, but should not absorb Wallet or Assets ownership.
- Files or Photos may support these modules, but do not become the business owner of their records.
