# Food Delivery Shop Brand And UI Direction

Updated: 2026-08-06

Status: `PROVISIONAL USER-APPROVED DESIGN DIRECTION / PARTIALLY IMPLEMENTED`

This document records the provisional brand and internal-UI direction for Food Platform and the built-in Food Delivery shops. It is a design reference, not a second roadmap, implementation board, or claim that every surface below is already complete. `docs/roadmap/TODO_ROADMAP.md` remains the only live execution board; the commerce package handoff remains the authority for current implementation status.

## 1. Scope And Visual Ownership

The Food Delivery Home folder contains one platform entry and nine shop entries:

1. Baemin (Food Platform)
2. Moon Bistro
3. River Noodles
4. Daylight Cafe
5. Sugar Lane
6. Peach Cloud
7. Dash Grill
8. Jade Hearth
9. Verdant Day
10. Harbor Roast

The Home folder container remains a Native System surface. It owns the folder material, spacing, close control, and grid. Each child entry contributes its real brand Logo, shop name, and short description. After a shop opens, that shop becomes the visual owner of the complete in-app surface, including navigation, product detail, bag, checkout, orders, order detail, empty states, and app-local overlays.

Food Delivery continues to own restaurant, menu, cart, checkout, order, and delivery-event state. Different shop interfaces are brand facades over that shared runtime; visual differentiation must not create a second business-state owner.

## 2. Current Baseline

| Entry | Stable identity | Current internal UI state | Direction in this document |
| --- | --- | --- | --- |
| Baemin / Food Platform | `food_delivery_platform` | Dedicated platform discovery UI and formal original entry icon; some internal headings still say `Food Delivery` | Keep the platform structure, finish the current asset contract, and make consumer naming consistent |
| Moon Bistro | `food_seed_moon_bistro` | Dedicated `dark_tray_menu` baseline | Deepen celestial fine-dining identity |
| River Noodles | `food_seed_river_noodles` | Reusable `street_food_stall` route; nine menu items; formal one-Hero/nine-product pack pending | Deepen the noodle-shop App after formal media delivery |
| Daylight Cafe | `food_seed_daylight_cafe` | Reusable `daypart_journal` route; accepted one-Hero/nine-product pack | Treat as a high-completion reference and deepen only through a promoted daypart slice |
| Sugar Lane | `food_seed_sugar_lane` | Reusable `convenience_shelf` route; nine menu items; formal one-Hero/nine-product pack pending | Repair the unresolved cover path, then deepen the patisserie App after formal media delivery |
| Peach Cloud | `food_seed_peach_cloud` | Dedicated `dessert_window` App, accepted campaign/product pack, and one shared-Wallet-quote dynamic-price poster pilot | Treat as a high-completion reference; limit work to focused defects or approved campaign slices |
| Dash Grill | `food_seed_dash_grill` | Dedicated `quick_service_chain` App with accepted one-Hero/ten-product pack, connected image-led order-ticket menus, and configurable tray-ticket combo detail | Keep the UI pending user visual acceptance; add two versioned complete-tray photographs without replacing the accepted single-item pack |
| Jade Hearth | `food_seed_jade_hearth` | Dedicated `jade_table_menu` App with accepted one-Hero/twelve-product pack | Design the menu, detail, and ordering hierarchy as one integrated paper-banquet-menu pass |
| Verdant Day | `food_seed_verdant_day` | Dedicated `minimal_light_food` App with accepted brand, promotion, and twelve-product media | Add ingredient-level customization with individual quantity controls and visible price deltas |
| Harbor Roast | `food_seed_harbor_roast` | Dedicated `harbor_roast_chain` App with accepted 41-file pack, image-led coffee ordering, four campaign routes, collaboration packaging, and Supply merchandise | Treat as a high-completion reference; keep cup/temperature/size/packaging semantics intact |

Baemin, Peach Cloud, and Harbor Roast currently have formal Home-folder identity assets. Moon Bistro, River Noodles, Daylight Cafe, Sugar Lane, Dash Grill, Jade Hearth, and Verdant Day still use shared symbols or cover-derived fallbacks. Those seven fallbacks are temporary and do not satisfy this design direction.

## 3. Shared Brand Rules

1. Every platform/shop entry must use a real brand Logo asset. Changing only the generic icon background color is not a brand solution.
2. A brand field or app-icon background may be part of the finished icon composition, but the distinguishing signal must be the Logo itself, not a shared Font Awesome glyph on different colors.
3. IP does not mean mascot. Peach Cloud may remain character-led, while other shops should use symbols, typography, objects, editorial art, print systems, or material culture.
4. Do not give every shop a Jellycat-like plush character, round dot eyes, soft limbs, or the same 3D toy treatment.
5. Each shop must differ in at least five dimensions: palette proportions, component geometry, typography role, media crop language, navigation composition, depth/material treatment, or motion grammar.
6. Do not keep `All` as the default menu category. Open the first meaningful non-empty category; cross-category search groups results by category. Unknown user-authored sections may appear under a conditional `More` group.
7. Built-in consumer copy follows system language with `zh-CN` as the default and accurate `en-US` retained. User-authored records remain literal.
8. Product names, descriptions, ingredients, icons, photographs, and alternative text must describe the same item in every supported language.
9. Shop media and decorations may create atmosphere, but ordinary operational content must remain readable and efficient on a phone-sized viewport.
10. All motion must respect reduced-motion preferences. Motion supports brand recognition and state change; it must not delay ordering.

## 4. Logo Contract

### 4.1 Stable Paths

Use one reusable master mark per entry:

```text
public/images/ui-assets/apps/food-delivery/platform/brand/baemin-entry-icon-01.png
public/images/ui-assets/apps/food-delivery/moon-bistro/brand/moon-bistro-mark-01.svg
public/images/ui-assets/apps/food-delivery/river-noodles/brand/river-noodles-mark-01.svg
public/images/ui-assets/apps/food-delivery/daylight-cafe/brand/daylight-cafe-mark-01.svg
public/images/ui-assets/apps/food-delivery/sugar-lane/brand/sugar-lane-mark-01.svg
public/images/ui-assets/apps/food-delivery/peach-cloud/brand/peach-cloud-mark-01.svg
public/images/ui-assets/apps/food-delivery/dash-grill/brand/dash-grill-mark-01.svg
public/images/ui-assets/apps/food-delivery/jade-hearth/brand/jade-hearth-mark-01.svg
public/images/ui-assets/apps/food-delivery/verdant-day/brand/verdant-day-mark-01.svg
public/images/ui-assets/apps/food-delivery/harbor-roast/brand/harbor-roast-app-icon-01.png
```

If a raster treatment is required, keep the same basename with `.png`, use a transparent background, and retain an editable master under the corresponding `output/imagegen/` round. Runtime code must depend only on accepted files under `public/`.

### 4.2 Logo Acceptance

- one distinct silhouette that remains readable at `20px`, `32px`, and `48px`;
- transparent outer background unless the icon field is intentionally part of the brand asset;
- no readable store name baked into the small mark;
- no random letters, price, watermark, copied trademark, or real-brand packaging;
- sufficient contrast in the Home folder, shop header, order history, and empty state;
- no dependence on tiny facial details;
- one mark is reused instead of generating separate unrelated icons for each page.

### 4.3 Logo Concepts

| Entry | Brand mark concept | Art mode |
| --- | --- | --- |
| Baemin / Food Platform | existing original delivery bag, route pin, heart, and motion mark | mint-teal platform symbol; do not reproduce an official Baemin mark or mascot |
| Moon Bistro | crescent formed by a plate rim and cutlery reflection | celestial editorial emblem |
| River Noodles | one river line entering a bowl and becoming a noodle strand | indigo woodcut line mark |
| Daylight Cafe | rising sun passing through a window grid and coffee ring | modernist geometric mark |
| Sugar Lane | sugar ribbon forming a street lamp and cake stand | Art Nouveau ornamental mark |
| Peach Cloud | existing white-peach, cloud cap, leaf, and face | character-led dessert mark |
| Dash Grill | two speed lines crossing a grill bar | kinetic screen-print emblem |
| Jade Hearth | jade disc, hearth opening, and one rising steam stroke | contemporary seal emblem |
| Verdant Day | sprout and leaf folded into a calm circular mark | botanical graphic mark, not a plush character |
| Harbor Roast | existing cup-and-anchor Captain Roast composition | copper/blush chain-coffee identity with full-bleed app-icon treatment |

## 5. Internal UI Brand Matrix

| Shop | Dominant palette | Accent discipline | Component geometry | Material/effect language |
| --- | --- | --- | --- | --- |
| Moon Bistro | Obsidian `#111418`, Night `#1B2430`, Porcelain `#F2EADF` | Moon Silver `#CBD2D9`, Candle Gold `#D6A45A`, Wine Plum `#6E3145` | circular plate crops, thin orbital rules, asymmetric editorial blocks | candle highlights, restrained film grain, black ceramic gloss |
| River Noodles | River Indigo `#173D5C`, Rice Paper `#F3EEE3` | Broth Amber `#B96B2E`, Scallion `#5F7D55`, Chili `#B63A2F` | flowing vertical route, bowl silhouettes, ticket rows | woodcut texture, steam layers, river contour lines |
| Daylight Cafe | Porcelain `#F7FAF8`, Sky Blue `#5E9FC5` | Egg Yolk `#F3C84B`, Tomato `#D95F45`, Espresso `#2B2A27` | window grid, daypart columns, open table-like rows | hard daylight, blind shadows, clear glass and white ceramic |
| Sugar Lane | Porcelain `#FFF8EE`, Plum `#572943` | Buttercream `#F5E5AE`, Pistachio `#6F8A68`, Champagne `#C69A4A` | display shelves, framed labels, ornamental dividers | glass vitrine reflections, sugar-paper grain, fine gold linework |
| Peach Cloud | Pale Green `#F2FBE0`, Pink Mist `#FDA1B8` | Petal Rouge `#FD6C93`, Jet Black `#2B303A` | rounded dessert window, two-column product cards | soft cloud forms, bright product photography, playful brand character |
| Dash Grill | Paper `#FFF9EC`, Mustard `#FFC833`, Ink `#201A17` | Tomato Red `#E33D2E` only for orders, deals, and primary actions | squared kiosk modules, hard edges, numbered tickets | screen-print dots, paper liner, hard offset shadow, diagonal speed bands |
| Jade Hearth | Rice Paper `#F5EFE2`, Ink Green `#1F4D3A` | Celadon `#AFC2B2` for sections; Cinnabar `#BD4B35` only for seals and confirmation | book chapters, ruled lists, table-order slips | rice-paper grain, ink wash, celadon glaze, restrained steam |
| Verdant Day | Canvas `#F2F4EF`, Soft Green `#E4EADF`, Leaf `#496B4A` | Coral `#E96F64`, limited Gold `#D7A932` | broad whitespace, circular photography, spacious rows | natural side light, quiet paper surface, restrained botanical marks |

Color proportions matter. Dash Grill should read primarily yellow, paper, and ink with red as a concentrated action signal. Jade Hearth should read primarily rice paper, deep green, and celadon with cinnabar as a small seal-like signal. They must not both collapse into a large warm clay/brown field.

### 5.1 Reusable Structure Template Library

The App Store template selector must distinguish generic structure templates from brand-owned facades. A generic template may be applied to another Food Delivery restaurant without leaking the source shop's name, slogan, assets, special routes, or menu semantics.

| Template ID | User-selectable | Structural job | Current built-in proof |
| --- | --- | --- | --- |
| `standard` | yes | legacy Hero, metrics, category rail, and compact list | Unassigned shops |
| `cafe_counter` | yes | no Hero; vertical category/counter track beside a dense order board | General option; Harbor Roast has moved to its own facade |
| `convenience_shelf` | yes | no Hero; shelf labels, two-column display case, and price lips | Sugar Lane |
| `street_food_stall` | yes | no Hero; horizontal stop selector and alternating vertical route | River Noodles |
| `daypart_journal` | yes | editorial masthead, time-indexed section grid, lead feature, and supporting notes | Daylight Cafe |
| `menu_mosaic` | yes | color-block category atlas and asymmetric product mosaic | Cross-restaurant customization coverage |
| `dark_tray_menu` | current brand only | celestial dark tray facade | Moon Bistro |
| `dessert_window` | current brand only | Peach Cloud route-driven dessert app | Peach Cloud |
| `quick_service_chain` | current brand only | Dash Grill route-driven kiosk app | Dash Grill |
| `jade_table_menu` | current brand only | Jade Hearth route-driven table-menu app | Jade Hearth |
| `minimal_light_food` | current brand only | Verdant Day route-driven light-food app | Verdant Day |
| `harbor_roast_chain` | current brand only | Harbor Roast campaign, coffee-board, packaging, fulfillment, and Supply facade | Harbor Roast |

Generic templates share restaurant/menu input, item detail, add-to-bag, cart ownership, checkout, order, and delivery support with Food Delivery. They own only browsing composition. Each generic template opens the first real non-empty category, never synthesizes `All`, accepts App Store display/cover overrides, and uses a template-native symbolic fallback while formal product media is unavailable. The six general options must remain restaurant-agnostic: `menu_mosaic` intentionally has no fixed built-in brand proof, and regression coverage applies it to a different restaurant to prevent copied names, slogans, or source-shop assets. Brand-owned facades remain visible when editing their current built-in shop, but they are not offered as general replacements until their brand-specific routes and assets have been extracted.

## 6. Page Configuration By Shop

### 6.1 Baemin / Food Platform

- Preserve its discovery-first Home, campaign, Search, Saved, Orders, and Mine structure.
- Keep the accepted original full-bleed mint entry icon; do not approximate an official Baemin Logo or mascot.
- Render `Baemin` consistently at the platform-entry and in-app identity levels. Transitional `Food Delivery` headings are a naming defect, not a second consumer brand.
- Preserve distinct photographic and composition capsules for all eleven internal merchants. Platform mint styling may unify platform-owned navigation and campaigns, but must not flatten merchant identities.
- Replace the remaining `54` diagnostic targets before claiming the current platform media contract complete: `44` product images, `3` platform decorations, and `7` checkout/order-state images. The delayed-state illustration remains a separately deferred target.
- Platform merchant identity remains inside the shared platform shell; its eleven internal merchants do not automatically become independent shop-app templates.

### 6.2 Moon Bistro

- Keep an immersive single-scroll shop instead of adding the same five-tab navigation used by other stores.
- Use a full-width candlelit Hero with a quiet lunar-orbit overlay and stable text-safe area.
- Turn the section rail into lunar menu chapters and default to the first real category.
- Present item detail as a dark ceramic plate stage with restrained ingredient hierarchy.
- Present the active cart as a restaurant check holder; keep delivery/order support folded as a service ledger.
- Motion: slow fade, highlight shift, and orbit progress only. No bounce or toy motion.

### 6.3 River Noodles

- The implemented `street_food_stall` structure replaces the generic standard shop without creating a second runtime owner.
- Browsing follows an alternating vertical route through broth noodles, dry noodles, sides, and drinks, with the selected stop controlling the visible items.
- Menu categories: broth noodles, dry noodles, noodle sides, and coolers. No `All`.
- Product detail emphasizes broth, noodle type, toppings, heat, and texture without requiring a new customization schema in the first slice.
- Bag becomes a noodle-shop order ticket; Orders uses a flowing route line for progress.
- Motion: subtle steam rise and route-line reveal, disabled under reduced motion.

### 6.4 Daylight Cafe

- The implemented `daypart_journal` structure organizes the menu as a time-indexed daily edition rather than a chain-coffee counter.
- Browsing uses an editorial masthead, four daypart cells, one lead feature, and compact supporting notes rather than a generic product-card Hero.
- Menu categories: coffee, cold drinks, brunch, bakery. No `All`.
- A dedicated Day Timeline page highlights products appropriate to the current visual daypart without changing availability truth automatically.
- Product detail uses clear glass, white ceramic, and hard daylight with strong ingredient legibility.
- Bag resembles a cafe table check; order progress moves through a restrained daylight band.

### 6.5 Sugar Lane

- The implemented `convenience_shelf` structure creates a patisserie display that does not reuse Peach Cloud's mascot, cloud shapes, or branded route composition.
- Browsing behaves like a glass display case with shelf labels, product bays, and price lips.
- Menu categories: layer cakes, pastry case, chilled sweets, and sweet drinks. No `All`.
- A Today's Case page highlights the current authored collection; it must not invent automatic stock or sell-out behavior without a later data contract.
- Product detail uses large pastry photography, fine ornamental dividers, and compact provenance/ingredient text.
- Bag becomes a pastry-box packing list; Orders uses confectionery labels and box-seal progress.

### 6.6 Peach Cloud

- Preserve the current Home, Search, New, Bag, Orders, and Order composition.
- Keep the existing formal Peach Cloud mark and fixed approved English brand-advertising art.
- Preserve the horizontal brand Hero, always-visible category navigation, and the shared poster/menu region below it. Poster edge hit zones replace detached carousel buttons.
- Product campaign posters open dedicated long advertising pages; the merchandise poster continues to open Merch.
- Treat the existing text-free White Peach Lime derivative plus code-rendered price anchor as the finance-aware poster pilot. It does not authorize baking new fixed prices into campaign art or claiming that all posters are dynamic.
- Broad redesign is paused. Future fixes should be limited to defects, semantic mismatches, approved campaign work, or user-reported device findings.

### 6.7 Dash Grill

- Preserve route-driven Home, Menu, Deals, Bag, Orders, and Order pages.
- Rebalance surfaces so yellow/paper/ink dominate; keep red concentrated on actions and promotional emphasis.
- Home becomes a kinetic food poster with diagonal crops and a high-contrast product stage.
- Menu now has a first order-ticket prototype instead of the same left-image/text/right-add row used by Jade Hearth. It keeps image-led food identification, stable item numbers, section labels, a perforated price footer, full-card detail entry, and a rectangular add command rather than turning into a text-only receipt. User visual acceptance remains pending.
- Dash category and popular-item rails now retain native touch/wheel/trackpad behavior, expose a styled scrollbar, and accept keyboard focus. Apply the same discoverability contract to any later overflowing Dash rail.
- Deals becomes a perforated coupon wall instead of a generic list of white cards.
- Product detail now uses an unbranded tray/order-ticket composition. The two featured combos keep the main fixed, require one side and one drink, expose `2/2` completion, live selected-content summaries, photographed existing options, price deltas, and a compact quantity/total footer; selected unit prices and localized labels survive Bag, checkout, backup, and Order detail. Crisp Chicken Tenders uses the same configuration entry for one required dipping sauce instead of silently adding an unspecified sauce. Other non-combo products retain a simplified version of the same detail language.
- Until the two complete-tray photographs are accepted, item `01` and `02` are presented honestly as the main component beside a code-rendered side/drink tray map. New media must use versioned `dash-grill/combos/` paths and must not overwrite the accepted single-item assets.
- Motion: short snap, stamp, and ticket-feed transitions. No soft floating animation.

### 6.8 Jade Hearth

- Preserve route-driven Home, Menu, Feast, Bag, Orders, and Order pages.
- Rebalance surfaces so rice paper, ink green, and celadon dominate; reserve cinnabar for seals, selected states, and confirmation.
- Home reads as a contemporary menu book with visible chapters and table-oriented photography.
- Menu, detail, add-to-order controls, and Feast hierarchy require one integrated paper-banquet-menu pass. Use dish sequence, vertical title slips, vessel-aware photography proportions, and an `Add dish` column instead of the Dash Grill row or a generic image-square/round-plus card.
- Category rails must support touch swipe, wheel/trackpad, mouse drag, and a visible overflow affordance when more chapters exist.
- Feast remains the defining special page, organized around shared and solo table compositions.
- Product detail uses generous photography, celadon framing, and restrained ingredient annotations.
- Bag is a numbered table-order slip; Orders uses a vertical delivery note and seal-like progress states.
- Motion: page crossfade, rule-line reveal, and slow steam only. No bouncy mascot behavior.

### 6.9 Verdant Day

- Preserve the current Home, Menu, Detail, Bag, Orders, and Order composition.
- Add a formal reusable Verdant Day mark derived from its botanical identity; do not reuse a generic Font Awesome leaf.
- Preserve the current circular food photography and calm nutritional layout.
- The confirmed next product slice is ingredient-level meal customization: each supported ingredient owns its own decrease/increase control, quantity boundary, and price delta. The cart and order snapshot must preserve the selected ingredients and the resulting unit price; this cannot be simulated by one generic item-level plus button.
- Until that data contract is promoted, do not add decorative controls that imply customization without changing the order line.

### 6.10 Harbor Roast

- Harbor Roast now owns the non-general `harbor_roast_chain` facade rather than serving as the built-in proof for `cafe_counter`.
- Preserve image-led menu recognition while emphasizing hot/iced state, `8 / 12 / 16oz` size, packaging selection, and the chosen unit-price snapshot.
- The permanent paper cup belongs in item-detail packaging selection, not a standalone permanent-cup promotion. Collaboration campaigns may show a collaboration paper cup or sleeve and carrier, but must not advertise the permanent cup as collaboration content.
- Preserve the four campaign routes, Pompompurin activity, Captain Roast identity, Supply merchandise, pickup/delivery modes, and accepted 41-file runtime pack. Its copper, blush, ink, line, and cream capsule must stay separate from Daylight Cafe.

## 7. Menu Depth For The Three Reusable-Template Shops

River Noodles, Daylight Cafe, and Sugar Lane now each have nine stable built-in items across four real sections. Their reusable structure templates are implemented, but River Noodles and Sugar Lane still await their formal one-cover/nine-product PNG packs. A later content expansion may move toward approximately twelve items when it adds real menu depth rather than padding the first category. Same-ID user edits and backup fidelity remain protected.

Suggested distribution:

| Shop | Proposed content distribution |
| --- | --- |
| River Noodles | 4 broth noodles, 3 dry noodles, 3 sides/toppings, 2 drinks |
| Daylight Cafe | 3 espresso drinks, 2 cold drinks, 4 brunch dishes, 3 bakery items |
| Sugar Lane | 3 cakes, 3 tarts/pastries, 3 baked sweets/gift items, 3 drinks |

Exact menu names, ingredients, prices, seed IDs, migration behavior, photography, and bilingual copy must be reviewed as one focused content contract before implementation.

## 8. Audited Follow-Up Register

This register completes the UI audit without becoming an execution queue. `Observed defect` means current code or runtime evidence is inconsistent. `Confirmed direction` records an explicit product decision whose implementation still requires promotion through the roadmap. `Asset gap` records a missing accepted runtime asset. `Deferred candidate` preserves an idea that is not yet approved work.

| Surface | Classification | Current evidence | Required outcome before closure |
| --- | --- | --- | --- |
| Baemin minimum order and fees | Observed defect | Several platform merchants pair `CNY` menu/delivery values with hard-coded `9,000원` to `15,000원` minimum-order strings | Store the minimum order as money data and route it through the shared Wallet quote/format path; one merchant card must not mix currencies |
| Baemin consumer name | Observed defect | The Home-folder entry says `Baemin`, while some in-app headings still say `Food Delivery` | Use `Baemin` as the consumer platform name and reserve `Food Delivery` for the module/domain description |
| Horizontal category and product rails | Partially fixed | Dash Grill now exposes a thin branded scrollbar and focusable rails; Jade Hearth still hides its native scrollbar, and equivalent rails require the same audit | Verify the Dash behavior through user review, then give Jade Hearth touch, pointer, wheel/trackpad, keyboard, and visible overflow support without creating horizontal body overflow |
| Sugar Lane cover | Observed defect / asset gap | The current cover reference does not resolve and the formal pack is still pending | Connect an accepted stable runtime cover and verify its Home crop and error fallback |
| Built-in bilingual menu copy | Partially fixed | Peach Cloud and all ten Dash Grill items now follow system language, preserve accurate `en-US`, search both built-in languages, and leave user-authored copy literal; several remaining built-in menus still appear English-only in Chinese UI | Continue the same presentation-only contract shop by shop without rewriting user-authored records; keep image, ingredients, title, description, and alt text semantically aligned |
| Dash Grill menu cards | Implemented candidate / visual acceptance pending | Home popular items use compact counter tickets; Menu uses full-width image-led order tickets, opens the first real section, and searches across sections | Have the user review crop, density, rail behavior, detail entry, and add-command prominence before marking the direction accepted or scheduling refinements |
| Dash Grill combo detail | Implemented candidate / asset gap / visual acceptance pending | Two featured combos expose `2/2` completion, photographed side/shake choices, a live summary, compact total action, and persisted side/drink deltas; Chicken Tenders now require and persist one of three sauces. Accepted item `01/02` photographs still show only the fixed main, while pending drink/sauce media uses branded icon fallbacks | Connect the accepted complete-tray and remaining drink/sauce option media without changing the persisted modifier contract, then have the user review the tray-ticket composition before closure |
| Jade Hearth overall menu | Confirmed direction | Card changes alone cannot resolve its menu-book, detail, Feast, and order hierarchy | Run one integrated paper-banquet-menu pass using the contract in 6.8 |
| Verdant Day meal customization | Confirmed direction | Current item-level ordering does not communicate ingredient customization | Add ingredient-specific quantities, price deltas, constraints, and cart/order snapshots through a focused data-plus-UI slice |
| Independent-shop marks | Asset gap | Seven entries still use generic or cover-derived fallbacks | Deliver one stable reusable mark each for Moon Bistro, River Noodles, Daylight Cafe, Sugar Lane, Dash Grill, Jade Hearth, and Verdant Day |
| River Noodles media | Asset gap | The formal one-Hero/nine-product pack is not delivered | Generate and accept `10` shop-specific PNGs before replacing template-native fallbacks |
| Sugar Lane media | Asset gap | The formal one-Hero/nine-product pack is not delivered | Generate and accept `10` patisserie-specific PNGs before claiming media completion |
| Baemin media | Asset gap | `54` current targets remain, plus one separately deferred delayed-state illustration | Finish assets as merchant-specific families; do not normalize all merchant photography into the platform capsule |
| Harbor circular detail composition | Deferred candidate | The earlier circular composition was visually useful but no longer fits Harbor's coffee-menu-board priority | Reassign only after another shop is selected and the pattern is adapted to that shop's identity rather than copied wholesale |

Peach Cloud, Harbor Roast, and Daylight Cafe are the current high-completion visual references. Their completeness does not require other shops to copy their campaigns, merchandise, navigation count, card geometry, or photography; it only sets the expected level of semantic consistency and route finish.

## 9. Design Sequencing Guidance

When a Food Delivery visual slice is promoted, use this dependency order inside that slice:

1. repair an observed interaction, naming, localization, or money-format defect before adding decoration;
2. lock the shop-specific information architecture and card behavior before generating replacement media;
3. finish the accepted stable runtime asset paths before removing diagnostic fallbacks;
4. validate the promoted shop across browse, detail, bag, checkout, order, and empty/error states without expanding unrelated shops.

This guidance does not modify roadmap priority or authorize the rows above as active implementation work.

## 10. Acceptance Criteria

A shop brand/UI slice is ready for review only when:

- the Home folder uses the shop's real Logo instead of a generic store/leaf/utensils glyph;
- the Logo remains readable at `20px`, `32px`, and `48px` and reappears consistently inside the shop;
- the first viewport identifies the shop within three seconds without relying only on its written name;
- its palette proportions, component geometry, typography, navigation, depth, and motion are visibly different from the other shops;
- no default `All` category creates an unnecessarily long menu page;
- product thumbnails and detail media preserve the required subject and crop;
- built-in Chinese and English copy remains accurate and user-authored records remain unchanged;
- Home, Menu/special pages, item detail, Bag, checkout, Orders, Order detail, empty, conflict, and error states follow the same brand system;
- horizontal rails expose later content to touch, pointer, wheel/trackpad, and keyboard users without creating page-level horizontal overflow;
- all prices, fees, thresholds, discounts, and totals on one surface use a coherent currency source and formatting path; changing a currency label without converting the number is a defect;
- desktop Chromium and simulated mobile checks show no page errors, horizontal overflow, unsafe text overlap, broken image fallback, or incoherent crop;
- named physical-device proof remains separately recorded and is not inferred from simulated mobile review.
