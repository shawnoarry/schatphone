# Food Delivery Real Shops Expansion TODO

Updated: 2026-08-10

This is a task-specific resume handoff requested by the user. It is not a second project
roadmap. `docs/roadmap/TODO_ROADMAP.md` remains the live project execution board.

## 1. Requested Outcome

Expand the Food Delivery pseudo-folder as a launcher for separate Apps, not as one
aggregated platform:

- keep Baemin as one peer platform App;
- keep the nine existing independent shop Apps;
- add five independent reality-anchored Seoul restaurant Apps;
- give every entry its own logo, while preserving the existing Peach Cloud and Harbor
  Roast logo assets unchanged;
- render the Home folder as paged `3 x 3` grids, with 15 total entries shown as `9 + 6`;
- add one real, searchable Map pin for each new restaurant using a public address and
  reviewed coordinates;
- keep all menu items, prices, descriptions, campaigns, and product combinations
  SchatPhone-authored rather than importing an official catalog.

## 2. Current Checkpoint

No implementation code or runtime assets for this slice have been changed yet. It is safe
to pause or resume without repairing a partial edit.

Completed investigation:

- confirmed the current launcher contains `Baemin + 9 shops = 10 entries`;
- confirmed Home owns the pseudo-folder presentation and Food Delivery owns restaurants,
  menus, shop bags, checkout, orders, and delivery events;
- confirmed Map may receive new restaurant pins and must own their place records;
- shortlisted five additions: Myeongdong Kyoja, London Bagel Museum, Knotted, Kyochon
  Chicken, and EGGDROP;
- confirmed the intended post-change folder size is 15 entries, producing two pages;
- inspected the existing seed/migration, presentation-template, App Store placement, Home
  folder, and Seoul map-pack integration points;
- collected official/public brand and menu-category evidence for all five candidates;
- downloaded initial official logo references for EGGDROP, Kyochon, and Myeongdong Kyoja
  into browser temporary storage; these still need to be copied into the workspace before
  that temporary storage is cleaned.

## 3. Public Place Evidence

Use these as the initial reviewed anchors. Recheck the two rows marked `VERIFY` before
shipping the map pack.

| Restaurant App | Public branch anchor | Coordinate status |
| --- | --- | --- |
| Myeongdong Kyoja | Main Store, 29 Myeongdong 10-gil, Jung-gu, Seoul | `37.5625608, 126.9856037`, matched by Nominatim to the named restaurant |
| London Bagel Museum | Anguk, 20 Bukchon-ro 4-gil, Jongno-gu, Seoul | `37.5791826, 126.9861520`, matched by Google Maps |
| Knotted | Cheongdam, 53 Dosan-daero 53-gil, Gangnam-gu, Seoul | `VERIFY`: current Nominatim result resolves only to the street |
| Kyochon Chicken | Yeoksam 1, 12 Yeoksam-ro 14-gil, Gangnam-gu, Seoul | `VERIFY`: current Nominatim result resolves only to the street |
| EGGDROP | Gangnam, 22 Gangnam-daero 78-gil, Gangnam-gu, Seoul | `37.4951864, 127.0311298`, matched by Nominatim to Eggdrop |

Public research sources already reviewed:

- Myeongdong Kyoja official site: <http://www.mdkj.co.kr/en/>
- London Bagel Museum public tourism listing: <https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=191147>
- London Bagel Museum reservation listing: <https://www.catchtable.net/shop/london_bagel_museum_anguk>
- Knotted official store: <https://knottedstore.com/>
- Kyochon official site: <https://www.kyochon.com/main/>
- EGGDROP official site: <https://eggdrop.com/en/>

## 4. Remaining Work

### A. Finish Place And Brand Verification

- [ ] Resolve exact branch coordinates for Knotted Cheongdam and Kyochon Yeoksam 1.
- [ ] Confirm the chosen EGGDROP branch name against an official/public branch listing.
- [ ] Capture current Baemin App-icon evidence and usable Knotted/London Bagel Museum
  logo references.
- [ ] Copy accepted reference files into
  `tmp/imagegen/food-delivery-brand-references/` before browser temporary storage is
  cleaned.

### B. Produce Logo Assets With The Imagegen CLI

- [ ] Use the bundled `scripts/image_gen.py generate-batch` workflow with `gpt-image-2`.
- [ ] Generate reality-referenced redraws for Baemin, Myeongdong Kyoja, London Bagel
  Museum, Knotted, Kyochon Chicken, and EGGDROP.
- [ ] Generate distinct SchatPhone-owned marks for Moon Bistro, River Noodles, Daylight
  Cafe, Sugar Lane, Dash Grill, Jade Hearth, and Verdant Day.
- [ ] Preserve these existing assets byte-for-byte:
  `peach-cloud/brand/peach-cloud-mark-01.svg` and
  `harbor-roast/brand/harbor-roast-app-icon-01.png`.
- [ ] Keep PNG masters in `output/imagegen/food-delivery-brand-icons/` and export compact
  runtime WebP/PNG files under each shop's `brand/` directory.
- [ ] Inspect all 13 new icons at full size and at the rendered Home icon size.

### C. Add Five Independent Restaurant Apps

- [ ] Add stable restaurant IDs and seed records in `src/stores/foodDelivery.js`.
- [ ] Add 3-4 original menu items per restaurant, using only cuisine/category evidence
  from public sources. Do not copy official item names, prices, descriptions, or ads.
- [ ] Reuse semantically matching SchatPhone-owned food photography already present in the
  Food Delivery media pack for this first simple-template slice.
- [ ] Add normal-hydration migrations that insert missing stable seeds without overwriting
  same-ID saved/user-authored records; keep explicit backup restore snapshot-faithful.
- [ ] Route all five shops through one existing simple built-in presentation template while
  retaining independent restaurant-scoped bags and orders.

### D. Add Five Map Pins

- [ ] Create `src/lib/seoul-map-food-places.js` for the five reality-anchored records.
- [ ] Use stable Map IDs, bilingual names/addresses, `restaurant` category, public address,
  and reviewed latitude/longitude.
- [ ] Merge the new records into the versioned Seoul pack without changing existing place
  IDs or coordinates.
- [ ] Ensure each place is searchable and focusable in Map and can be used as a journey
  destination.
- [ ] Keep Food Delivery restaurant/order state out of the Map records.

### E. Implement Home Folder Paging

- [ ] Replace the folder's vertical scrolling list with horizontal pages of nine entries.
- [ ] Keep each page a stable `3 x 3` grid with fixed icon/label dimensions.
- [ ] Support touch swipe, pointer drag, wheel/trackpad, keyboard arrows, and explicit page
  dots/buttons without allowing the underlying Home page to swipe at the same time.
- [ ] Reset/clamp the folder page when opening, closing, or when installed entries change.
- [ ] Preserve the current system glass material and independently rounded icon previews.
- [ ] Keep the collapsed Home thumbnail as a clipped four-icon preview with visible gutters;
  do not flatten it into square tiles.

### F. Tests, Visual QA, And Documentation

- [ ] Extend unit coverage for 15 Food Delivery folder entries, stable ordering, logo paths,
  seed hydration, and five Map records.
- [ ] Add targeted Playwright coverage for page `1 -> 2 -> 1`, opening a second-page shop,
  independent shop bags/orders, and Map search/focus for all five new places.
- [ ] Inspect Home and one new shop at desktop and Pixel 5 viewports; verify no overlap,
  clipping, horizontal document overflow, console error, or blank image.
- [ ] Run `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, targeted/full
  `npm.cmd run test:e2e`, `npm.cmd run test:visual`, `npm.cmd run governance:check`, and
  `git diff --check` as applicable.
- [ ] Sync the commerce and map package README/handoff/boundary/workstream documents only
  after the implementation is complete. Update the live roadmap only if accepted scope or
  priority changes.

## 5. Primary Files

- `src/lib/home-folder-mini-app-entries.js`
- `src/views/HomeView.vue`
- `src/stores/foodDelivery.js`
- `src/lib/food-shop-presentation.js`
- `src/views/FoodDeliveryView.vue`
- `src/lib/seoul-map-places.js`
- `src/lib/seoul-map-everyday-places.js`
- `src/lib/seoul-map-community-places.js`
- `src/lib/app-store-mini-app-placement.js`
- `tests/home-folder-entry.test.js`
- `e2e/home-entry-navigation.spec.js`
- `e2e/map-local-packs.spec.js`

## 6. Non-Negotiable Guardrails

- The Home folder is a system launcher surface, not an in-App multi-store hub.
- Baemin and every independent shop are peer entries.
- A real restaurant name/logo is an immersive setting reference, not an affiliation claim.
- Official catalogs, product images, prices, campaign copy, and branch promotions are not
  imported.
- Every new real restaurant receives its own real-address pin; do not substitute a nearby
  landmark pin.
- Peach Cloud and Harbor Roast keep their current logo assets unchanged.
- Preserve unrelated dirty-worktree changes and stage only files owned by this slice.
