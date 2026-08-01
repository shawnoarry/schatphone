# Food Delivery Shop Brand And UI Direction

Updated: 2026-08-01

Status: `PROVISIONAL USER-APPROVED DESIGN DIRECTION / PARTIALLY IMPLEMENTED`

This document records the provisional brand and internal-UI direction for Food Platform and the built-in Food Delivery shops. It is a design reference, not a second roadmap, implementation board, or claim that every surface below is already complete. `docs/roadmap/TODO_ROADMAP.md` remains the only live execution board; the commerce package handoff remains the authority for current implementation status.

## 1. Scope And Visual Ownership

The Food Delivery Home folder contains one platform entry and eight shop entries:

1. Food Platform
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
| Food Platform | `food_delivery_platform` | Dedicated platform discovery UI | Keep platform structure; add a formal platform Logo |
| Moon Bistro | `food_seed_moon_bistro` | Dedicated `dark_tray_menu` baseline | Deepen celestial fine-dining identity |
| River Noodles | `food_seed_river_noodles` | Reusable `street_food_stall` route; nine menu items | Deepen the noodle-shop App after formal media delivery |
| Daylight Cafe | `food_seed_daylight_cafe` | Reusable `daypart_journal` route; nine-item accepted media pack | Deepen daypart behavior without restoring a generic Hero |
| Sugar Lane | `food_seed_sugar_lane` | Reusable `convenience_shelf` route; nine menu items | Deepen the patisserie App after formal media delivery |
| Peach Cloud | `food_seed_peach_cloud` | Dedicated `dessert_window` App | Preserve current internal UI; pause fine-detail work |
| Dash Grill | `food_seed_dash_grill` | Dedicated `quick_service_chain` App | Rebalance color and deepen print/kitchen-ticket identity |
| Jade Hearth | `food_seed_jade_hearth` | Dedicated `jade_table_menu` App | Rebalance color and deepen book/celadon identity |
| Verdant Day | `food_seed_verdant_day` | Dedicated `minimal_light_food` App | Preserve current internal UI; pause fine-detail work |
| Harbor Roast | `food_seed_harbor_roast` | Reusable `cafe_counter` route; twelve-item asset contract | Generate and review its formal media pack before claiming visual completion |

Only Peach Cloud currently has an active formal shop mark in the Home folder. Food Platform uses a generic utensils icon; Verdant Day uses a generic leaf; the other shops fall back to shared symbols or cover-image crops. Those fallbacks are temporary and do not satisfy this design direction.

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
public/images/ui-assets/apps/food-delivery/platform/brand/food-platform-mark-01.svg
public/images/ui-assets/apps/food-delivery/moon-bistro/brand/moon-bistro-mark-01.svg
public/images/ui-assets/apps/food-delivery/river-noodles/brand/river-noodles-mark-01.svg
public/images/ui-assets/apps/food-delivery/daylight-cafe/brand/daylight-cafe-mark-01.svg
public/images/ui-assets/apps/food-delivery/sugar-lane/brand/sugar-lane-mark-01.svg
public/images/ui-assets/apps/food-delivery/peach-cloud/brand/peach-cloud-mark-01.svg
public/images/ui-assets/apps/food-delivery/dash-grill/brand/dash-grill-mark-01.svg
public/images/ui-assets/apps/food-delivery/jade-hearth/brand/jade-hearth-mark-01.svg
public/images/ui-assets/apps/food-delivery/verdant-day/brand/verdant-day-mark-01.svg
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
| Food Platform | delivery cloche combined with a location path | neutral service symbol, not a mascot |
| Moon Bistro | crescent formed by a plate rim and cutlery reflection | celestial editorial emblem |
| River Noodles | one river line entering a bowl and becoming a noodle strand | indigo woodcut line mark |
| Daylight Cafe | rising sun passing through a window grid and coffee ring | modernist geometric mark |
| Sugar Lane | sugar ribbon forming a street lamp and cake stand | Art Nouveau ornamental mark |
| Peach Cloud | existing white-peach, cloud cap, leaf, and face | character-led dessert mark |
| Dash Grill | two speed lines crossing a grill bar | kinetic screen-print emblem |
| Jade Hearth | jade disc, hearth opening, and one rising steam stroke | contemporary seal emblem |
| Verdant Day | sprout and leaf folded into a calm circular mark | botanical graphic mark, not a plush character |

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
| `cafe_counter` | yes | no Hero; vertical category/counter track beside a dense order board | Harbor Roast |
| `convenience_shelf` | yes | no Hero; shelf labels, two-column display case, and price lips | Sugar Lane |
| `street_food_stall` | yes | no Hero; horizontal stop selector and alternating vertical route | River Noodles |
| `daypart_journal` | yes | editorial masthead, time-indexed section grid, lead feature, and supporting notes | Daylight Cafe |
| `menu_mosaic` | yes | color-block category atlas and asymmetric product mosaic | Cross-restaurant customization coverage |
| `dark_tray_menu` | current brand only | celestial dark tray facade | Moon Bistro |
| `dessert_window` | current brand only | Peach Cloud route-driven dessert app | Peach Cloud |
| `quick_service_chain` | current brand only | Dash Grill route-driven kiosk app | Dash Grill |
| `jade_table_menu` | current brand only | Jade Hearth route-driven table-menu app | Jade Hearth |
| `minimal_light_food` | current brand only | Verdant Day route-driven light-food app | Verdant Day |

Generic templates share restaurant/menu input, item detail, add-to-bag, cart ownership, checkout, order, and delivery support with Food Delivery. They own only browsing composition. Each generic template opens the first real non-empty category, never synthesizes `All`, accepts App Store display/cover overrides, and uses a template-native symbolic fallback while formal product media is unavailable. The six general options must remain restaurant-agnostic: `menu_mosaic` intentionally has no fixed built-in brand proof, and regression coverage applies it to a different restaurant to prevent copied names, slogans, or source-shop assets. Brand-owned facades remain visible when editing their current built-in shop, but they are not offered as general replacements until their brand-specific routes and assets have been extracted.

## 6. Page Configuration By Shop

### 6.1 Food Platform

- Preserve its discovery-first Home, campaign, Search, Saved, Orders, and Mine structure.
- Replace the generic utensils entry icon with the formal platform mark.
- Platform merchant identity remains inside the shared platform shell; platform merchants do not automatically become nine more independent UI templates.

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
- Menu categories: broth noodles, dry noodles, toppings, sides, drinks. No `All`.
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
- Menu categories: cakes, tarts, baked sweets, gift boxes, drinks. No `All`.
- A Today's Case page highlights the current authored collection; it must not invent automatic stock or sell-out behavior without a later data contract.
- Product detail uses large pastry photography, fine ornamental dividers, and compact provenance/ingredient text.
- Bag becomes a pastry-box packing list; Orders uses confectionery labels and box-seal progress.

### 6.6 Peach Cloud

- Preserve the current Home, Search, New, Bag, Orders, and Order composition.
- Keep the existing formal Peach Cloud mark and fixed approved English brand-advertising art.
- Internal fine-detail work is paused. Future fixes should be limited to defects, semantic mismatches, or true-device findings until the direction is reopened.

### 6.7 Dash Grill

- Preserve route-driven Home, Menu, Deals, Bag, Orders, and Order pages.
- Rebalance surfaces so yellow/paper/ink dominate; keep red concentrated on actions and promotional emphasis.
- Home becomes a kinetic food poster with diagonal crops and a high-contrast product stage.
- Menu becomes a fast-food kiosk board with real categories and numbered product rhythm. No `All`.
- Deals becomes a perforated coupon wall instead of a generic list of white cards.
- Product detail uses an unbranded tray-liner composition; Bag and Orders use kitchen tickets and pickup-number language.
- Motion: short snap, stamp, and ticket-feed transitions. No soft floating animation.

### 6.8 Jade Hearth

- Preserve route-driven Home, Menu, Feast, Bag, Orders, and Order pages.
- Rebalance surfaces so rice paper, ink green, and celadon dominate; reserve cinnabar for seals, selected states, and confirmation.
- Home reads as a contemporary menu book with visible chapters and table-oriented photography.
- Menu uses real book chapters and no `All`; Search groups matches by chapter.
- Feast remains the defining special page, organized around shared and solo table compositions.
- Product detail uses generous photography, celadon framing, and restrained ingredient annotations.
- Bag is a numbered table-order slip; Orders uses a vertical delivery note and seal-like progress states.
- Motion: page crossfade, rule-line reveal, and slow steam only. No bouncy mascot behavior.

### 6.9 Verdant Day

- Preserve the current Home, Menu, Detail, Bag, Orders, and Order composition.
- Add a formal reusable Verdant Day mark derived from its botanical identity; do not reuse a generic Font Awesome leaf.
- Internal fine-detail work is paused. Future fixes should be limited to defects, semantic mismatches, or true-device findings until the direction is reopened.

### 6.10 Harbor Roast

- The prepared twelve-item drinks-first menu now uses `cafe_counter`: a compact vertical category track and high-density order board suited to a globally repeatable coffee-chain rhythm.
- Keep its future media separate from Daylight Cafe's bright journal/brunch language by using the prepared petrol, copper, warm-ivory, cranberry, and espresso capsule.
- Do not claim visual completion until the one-cover/twelve-product runtime pack is generated and reviewed.

## 7. Menu Depth For The Three Reusable-Template Shops

River Noodles, Daylight Cafe, and Sugar Lane now each have nine stable built-in items across four real sections. Their reusable structure templates are implemented, but River Noodles and Sugar Lane still await their formal one-cover/nine-product PNG packs. A later content expansion may move toward approximately twelve items when it adds real menu depth rather than padding the first category. Same-ID user edits and backup fidelity remain protected.

Suggested distribution:

| Shop | Proposed content distribution |
| --- | --- |
| River Noodles | 4 broth noodles, 3 dry noodles, 3 sides/toppings, 2 drinks |
| Daylight Cafe | 3 espresso drinks, 2 cold drinks, 4 brunch dishes, 3 bakery items |
| Sugar Lane | 3 cakes, 3 tarts/pastries, 3 baked sweets/gift items, 3 drinks |

Exact menu names, ingredients, prices, seed IDs, migration behavior, photography, and bilingual copy must be reviewed as one focused content contract before implementation.

## 8. Suggested Design Sequence

This sequence is a design recommendation only. It does not modify roadmap priority or authorize implementation by itself. Five specialized reusable browsing structures plus `standard` are implemented as general choices; the remaining items below describe further brand completion.

1. Establish the nine stable Logo assets and connect each one to the Home folder entry plus app-local brand surfaces.
2. Separate Dash Grill and Jade Hearth internally through palette proportions, navigation treatment, card geometry, and special-page styling.
3. Generate and accept River Noodles media, then deepen its route/ticket treatment across detail, bag, and orders.
4. Deepen Daylight Cafe daypart behavior across detail, bag, and orders without restoring a generic Hero.
5. Generate and accept Sugar Lane media, then deepen its case/packing treatment across detail, bag, and orders.
6. Deepen Moon Bistro's celestial fine-dining identity without replacing its useful single-scroll structure.
7. Keep Peach Cloud and Verdant Day paused except for Logo completion, defects, semantic corrections, and true-device findings.

## 9. Acceptance Criteria

A shop brand/UI slice is ready for review only when:

- the Home folder uses the shop's real Logo instead of a generic store/leaf/utensils glyph;
- the Logo remains readable at `20px`, `32px`, and `48px` and reappears consistently inside the shop;
- the first viewport identifies the shop within three seconds without relying only on its written name;
- its palette proportions, component geometry, typography, navigation, depth, and motion are visibly different from the other shops;
- no default `All` category creates an unnecessarily long menu page;
- product thumbnails and detail media preserve the required subject and crop;
- built-in Chinese and English copy remains accurate and user-authored records remain unchanged;
- Home, Menu/special pages, item detail, Bag, checkout, Orders, Order detail, empty, conflict, and error states follow the same brand system;
- desktop Chromium and simulated mobile checks show no page errors, horizontal overflow, unsafe text overlap, broken image fallback, or incoherent crop;
- named physical-device proof remains separately recorded and is not inferred from simulated mobile review.
