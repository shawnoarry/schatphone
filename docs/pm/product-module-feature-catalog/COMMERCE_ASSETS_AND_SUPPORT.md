# Commerce Assets And Support Module Catalog

Updated: 2026-05-19

Use this file for Shopping, logistics, Food Delivery, Wallet, Stock, Assets, Photos, and hidden support surfaces tied to that family.

## 1. Included Modules

| Chinese | English | Route | Visibility | Main role |
| --- | --- | --- | --- | --- |
| 相册 | Photos | `/gallery` | Home app | shared media center |
| 购物 | Shopping | `/shopping` | Home app | product, order, and store lane |
| 物流 | Logistics | inside Shopping / service-account context | contextual surface | tracking-facing delivery lane |
| 外卖 | Food Delivery | `/food-delivery` | Home app | restaurant, menu, cart, and delivery lane |
| 钱包 | Wallet | `/wallet` | Home app | downstream ledger and transfer lane |
| 股票 | Stock | `/stock` | Home app | simulated market and holdings lane |
| 资产 | Assets | `/assets` | Home app | long-term owned things |
| 文件 | Files | `/files` | hidden/internal | metadata and storage bridge component |

## 2. Module Notes

### Photos / 相册

What it is:

- the shared media and reusable visual asset center.

What users mainly do here:

- manage images and reusable media;
- provide media references to other modules when those modules need them.

Important boundary:

- Photos is the visible media owner;
- it is not currently the primary relationship-memory authoring surface.

### Shopping / 购物

What it is:

- the main product, storefront, and order lane for normal shopping behavior.

What users mainly do here:

- browse products and store identity;
- create and track orders;
- feed downstream continuity into Wallet, Assets, and relationship systems through explicit hooks.

Important boundary:

- Shopping owns order truth and storefront behavior.

### Logistics / 物流

What it is:

- the delivery-tracking lane connected to shopping orders.

What users mainly do here:

- review shipment progress and delivery context;
- receive logistics-facing service-account style updates when that surface is active.

Important boundary:

- Logistics is a contextual lane, not a second storefront.

### Food Delivery / 外卖

What it is:

- the restaurant, menu, cart, and order lane for delivery-style consumption.

What users mainly do here:

- browse restaurants and menus;
- create delivery orders;
- feed guarded downstream continuity into Wallet and relationship memory.

Important boundary:

- Food Delivery owns restaurant and delivery-order truth.

### Wallet / 钱包

What it is:

- the downstream ledger surface.

What users mainly do here:

- review expenses, transfers, and financial records created by supported lanes;
- treat spending as a ledger outcome, not the owner of upstream order systems.

Important boundary:

- Wallet does not own Shopping orders, Food Delivery orders, or asset truth.

### Stock / 股票

What it is:

- the market and holdings lane for simulated investment behavior.

Current product role:

- useful but still secondary to the core relationship and life-simulation experience;
- should stay separate from Assets even when Assets later summarizes investment outcomes.

### Assets / 资产

What it is:

- the long-term owned-things lane.

Current product role:

- continuity for property, vehicles, investment summaries, and other owned objects;
- remains separate from Photos media ownership and Wallet ledger ownership.

### Files / 文件

What it is:

- the hidden internal metadata and storage bridge component.

Current product role:

- support internal storage/index behavior where needed;
- stay hidden from normal user-facing app identity.

Important boundary:

- Files is not a public file-manager app.
