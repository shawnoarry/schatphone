# Home Folder, Shopping, and Assets Direction

Updated: 2026-08-10

This document defines how Home folders, Shopping, Assets, Wallet, and Stock should relate to each other.

It is a product-decision document, not a live execution board.

## 1. Decision Summary

Current direction:

1. Home should support folder-style entry points because that fits the immersive-phone goal.
2. Folder capability belongs to Home as a general desktop capability, not to any single business module.
3. Appearance owns folder visuals only; it does not own folder business meaning.
4. Shopping is the first priority folder-backed module family.
5. Assets should remain a standalone Home app rather than being folded into Shopping or Wallet.
6. Stock should remain a separate market/holdings lane, while Assets may later summarize investment holdings.

## 2. Why Home Needs Folder Capability

Real phones often group several same-family apps into a folder. SchatPhone aims for a believable phone-like experience, so a Home model with only flat app tiles would feel thinner than the product direction wants.

Folders help solve:

- crowded Home entry surfaces;
- multiple same-family business identities under one desktop concept;
- future reuse for other clusters such as shopping platforms, social services, or tool bundles.

## 3. Ownership Boundary

| Capability | Owner | Meaning |
| --- | --- | --- |
| folder placement, expand/collapse, and child-entry layout | Home | folder is a desktop/system capability |
| folder visual style, blur, corner radius, open animation, preview density | Appearance | visual control only |
| child-entry title, icon, route, and launch params | business module metadata, rendered by Home | business modules supply entry metadata; Home renders it |
| products, orders, carts, wishlists | Shopping | Shopping owns store/product/order truth |
| service-account notification messages | Chat | Chat owns message history and source links, not Shopping/Food order truth |
| owned things, asset categories, valuation, asset status | Assets | Assets owns long-term ownership records |
| ledger outcomes, balances, expense records | Wallet | Wallet records downstream financial effects |
| market state, watchlists, holdings changes | Stock | Stock owns market-facing behavior |

## 4. Recommended Technical Shape

### 4.1 Entry Types

Home should be able to render at least these entry types:

- `app`
- `folder`
- `widget`
- `custom_widget`

### 4.2 Folder Rendering Model

Folder tiles should occupy the same top-level Home footprint as a normal app tile, then expand into a folder overlay or folder panel.

Business modules should provide child-entry metadata such as:

- title
- icon
- route
- optional launch parameters

Home owns the rendering and interaction shell for the folder itself.

The accepted Food Delivery proof now renders 15 clean-seed peer entries as fixed `3 x 3` pages of `9 + 6`. The folder resets or clamps its page when opened, closed, or when installed entries change; arrows and dots remain explicit controls, and touch, pointer-drag, wheel/trackpad, and keyboard paging are contained so the formal Home page does not swipe underneath. The collapsed tile remains a clipped four-icon preview with visible gutters. These are reusable Home-shell behaviors, not Food Delivery business logic and not a fixed upper bound for future user-created entries.

### 4.3 Appearance Scope

Appearance may later configure:

- folder style presets
- preview icon density
- transparency and blur
- open/close motion
- whether child icons follow app icon theming

Appearance must not own Shopping taxonomy or asset categories.

## 5. Shopping Direction

Recommended product framing:

- Chinese: `购物`
- English: `Shopping`
- Home expression: folder-backed entry family
- Route base: `/shopping`

The delivered built-in child identities are:

- marketplaces: Coupang, 29CM, and Kurly;
- specialty stores: WORKSOUT, IKEA Korea, and OLIVE YOUNG.

Each identity has a stable service ID, a distinct App route and storefront template, an existing Seoul setting anchor, an official source URL used for research provenance, and a CLI-redrawn raster App icon based on the brand's current Korean App Store identity. Shopping supplies 31 stable bilingual fictional seed products: the original four per identity plus seven additive products that fill every allowed storefront category. `mall` remains an aggregate all-products entry where applicable rather than a new cross-store taxonomy. The six Apps may share one Shopping-owned store, schema, quote service, persistence envelope, and downstream handoff implementation, but favorites, carts, checkout, and visible order history are scoped by `serviceKey`. Shared implementation must not surface as a unified Shopping hub or cross-App commerce experience.

### 5.1 Seoul Map And Retail Research Mapping

| Stable service ID | Fictional storefront | Existing Seoul Map reference | Retail grammar references |
| --- | --- | --- | --- |
| `schat_mall` | Coupang | `seoul-starfield-coex-mall` | High-density search, rapid fulfillment, deals, and repeat purchase |
| `nova_digital` | 29CM | `seoul-samsung-town` | Black-and-white editorial discovery, orange actions, features, and showcases |
| `daily_fresh` | Kurly | `seoul-lotte-mart-seoul-station` | Purple market identity, dawn delivery, selected food, and repeat baskets |
| `style_cloud` | WORKSOUT | `seoul-galleria-luxury-hall` | Dark multi-brand fashion, editorial content, drops, and raffles |
| `nordhus_home` | IKEA Korea | `seoul-the-hyundai-seoul` | Blue/yellow home navigation, room planning, storage, and modular categories |
| `mellow_care` | OLIVE YOUNG | `seoul-jennyhouse-cheongdam-hill` | Olive-green beauty discovery, rankings, deals, and functional categories |

Public sources inspected on 2026-08-10:

- Coupang: https://www.coupang.com/
- Kurly: https://www.kurly.com/main
- 29CM: https://www.29cm.co.kr/
- WORKSOUT: https://worksout.co.kr/
- IKEA Korea: https://www.ikea.com/kr/ko/
- Olive Young Korea: https://www.oliveyoung.co.kr/store/main/main.do

These sources inform retail type, logo identity, color, navigation, fulfillment, ranking, editorial, and category grammar. SchatPhone may display the public retailer names and recognizable App logos for immersive setting reference, but does not import official product catalogs, product images, prices, advertising copy, or affiliation claims. Every runtime product remains fictional. Map owns place truth; Shopping stores only a read-only setting-anchor place ID, and the UI must not present that anchor as an official branch address.

Important boundary:

- the first folder layer should represent storefront identities, not raw product categories;
- categories such as fashion or digital should still live inside the Shopping product surface.
- the Shopping folder is a Home launcher only; it is not a seventh Shopping app or an aggregate storefront;
- every child App has a canonical route under `/shopping/:serviceKey` and must not expose an in-App switcher for the other children;
- favorites, cart badges, cart contents, checkout, order history, logistics rows, and downstream suggestions must be scoped to the active App;
- checkout must never mix lines from multiple Apps, and opening one App must not reveal another App's cart or orders;
- App Store install state may control folder visibility, but it must not delete Shopping products, cart lines, or orders.
- formal product photography may be added later without changing the stable service, template, product, or route contracts.

Canonical child-App routes are:

- `/shopping/schat_mall`
- `/shopping/style_cloud?category=fashion`

Legacy `/shopping` links remain compatibility inputs only. They must redirect to one explicit App, preserve compatible query context, and remove a redundant `service` query from the canonical URL.

## 6. Assets Direction

Recommended product framing:

- Chinese: `资产`
- English: `Assets`
- Home expression: standalone app
- Route base: `/assets`

Assets should own long-term ownership records such as:

- real estate or home-like property
- vehicles and transport-related owned things
- investment summary records
- special owned objects, memberships, or certificate-like items

Assets should support:

- asset list and categories
- asset detail view
- source metadata
- valuation or status snapshots
- links to supporting media or records

## 7. Stock And Assets Relationship

Do not merge Stock into Assets right now.

Recommended relationship:

- Stock remains the market-facing app for watchlists, holdings changes, and simulated market behavior.
- Assets may later expose an `投资 / Investment` category that summarizes durable holdings outcomes.
- Stock continues to own price movement, market review, and market event flavor.
- Assets continues to own long-term ownership summaries.

This separation keeps:

- Stock focused on active market behavior;
- Assets focused on owned-thing continuity.

## 8. Wallet Relationship

Wallet should stay downstream.

That means:

- Shopping and Food Delivery can produce Wallet records;
- Shopping, Logistics, and Food Delivery can produce Chat service-account notifications into existing Chat Directory service accounts;
- Wallet can attach supporting relationship traceability to those records when explicit upstream lineage exists, but it should not create a competing primary memory for the same order or shared meal;
- Assets-related purchases or ownership changes may produce Wallet records;
- Wallet itself presents the user's virtual bank accounts, debit cards, multi-currency credit card, transfers, receipts, activity, and finance settings; the current product does not split those interactions into a separate Bank app;
- Wallet account balances derive from its ledger, while credit-card limits stay outside cash and Assets;
- Wallet does not become the owner of products, stores, or asset truth.

## 9. Map Relationship

Assets may later connect to Map through:

- property locations
- vehicle-linked travel context
- destination shortcuts such as home, garage, or owned places

But Map still owns:

- route simulation
- travel state
- trip context

Assets should not absorb Map responsibilities.

## 10. Recommended Execution Order

1. Build the Home folder-capability foundation.
2. Use Shopping as the first folder-backed module family.
3. Keep Shopping MVP focused on products, stores, orders, and downstream hooks.
4. Keep Assets as a separate app with its own data model.
5. Add Stock-to-Assets investment-summary relationships only after both sides are individually stable.
6. Add Shopping/Food Delivery to Wallet and Assets downstream links as explicit follow-up slices.
7. Leave richer folder visual customization to a later Appearance pass.

## 11. Guardrails For The First Implementation

- Do not let each business module invent its own folder UI.
- Do not try to solve full free-form folder editing in the first pass.
- Do not bake Shopping category hierarchy directly into Home rendering logic.
- Do not merge Assets into Wallet or Stock.
- Do not let Appearance own business taxonomy.
- Optimize first for reusable structure and clear ownership, then for richer folder polish.
