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

Status: `DONE_IN_CURRENT_CHECKOUT / UNCOMMITTED / NO_PHYSICAL_DEVICE_CLAIM`.

Completed implementation:

- added five stable Food Delivery restaurant Apps with four original menu items each and
  the existing `standard` presentation;
- kept every restaurant bag, checkout, order, and delivery-event path scoped by restaurant;
- made normal hydration add only missing stable restaurant/menu IDs without overwriting
  same-ID saved records, while explicit backup restore remains seed-free and
  snapshot-faithful;
- produced 13 accepted `gpt-image-2` icon masters plus compact runtime WebPs for Baemin,
  the five additions, and prior shops that lacked a dedicated mark;
- preserved the Peach Cloud and Harbor Roast assets byte-for-byte;
- added five Map-owned Seoul records and linked Food Delivery through stable `sourceId`
  values without copying place truth into Food Delivery;
- expanded the clean-seed Home folder to exactly 15 peer entries on fixed `3 x 3` pages
  (`9 + 6`) with touch, pointer-drag, wheel/trackpad, keyboard, arrows, dots, reset/clamp,
  and underlying-Home gesture containment;
- added focused Store/View/Home/Map tests and desktop Chromium plus simulated Pixel 5
  Playwright coverage, including stable screenshot evidence under
  `output/playwright/food-delivery-real-shops-report/`.

## 3. Public Place Evidence

These are the final reviewed Map anchors for this slice.

| Restaurant App | Public branch anchor | Coordinate status |
| --- | --- | --- |
| Myeongdong Kyoja | Main Store, 29 Myeongdong 10-gil, Jung-gu, Seoul | `37.5625608, 126.9856037` |
| London Bagel Museum | Anguk, 20 Bukchon-ro 4-gil, Jongno-gu, Seoul | `37.5791826, 126.9861520` |
| Knotted | Cheongdam, 15 Dosan-daero 53-gil, Gangnam-gu, Seoul | `37.5241508, 127.0382334` |
| Kyochon Chicken | Yeoksam No. 1, 16 Gangnam-daero 66-gil, Gangnam-gu, Seoul | `37.4918998657854, 127.032159214307` |
| EGGDROP | Gangnam Woosung, 321 Gangnam-daero, 1F 104, Seocho-gu, Seoul | `37.4916861, 127.0301804` |

Public research sources already reviewed:

- Myeongdong Kyoja official site: <http://www.mdkj.co.kr/en/>
- London Bagel Museum public tourism listing: <https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=191147>
- London Bagel Museum reservation listing: <https://www.catchtable.net/shop/london_bagel_museum_anguk>
- Knotted official location list: <https://knottedstore.com/location>
- Kyochon official Yeoksam No. 1 listing: <https://www.kyochon.com/shop/domestic_sch.asp?shop_id=119>
- EGGDROP official site: <https://eggdrop.com/en/>

The complete public-review log, icon prompts, acceptance reasons, contact sheets, and
runtime integration manifest live under `output/imagegen/food-delivery-brand-icons/`.
No browser-temporary reference file is required for review or runtime.

## 4. Completed Work

### A. Finish Place And Brand Verification

- [x] Resolve exact branch coordinates for Knotted Cheongdam and Kyochon Yeoksam 1.
- [x] Confirm the chosen EGGDROP branch name against an official/public branch listing.
- [x] Capture current Baemin App-icon evidence and usable Knotted/London Bagel Museum
  logo references.
- [x] Store reviewable public URLs and acceptance decisions with the generated masters;
  do not depend on browser temporary storage.

### B. Produce Logo Assets With The Imagegen CLI

- [x] Use the bundled `scripts/image_gen.py generate-batch` workflow with `gpt-image-2`.
- [x] Generate reality-referenced redraws for Baemin, Myeongdong Kyoja, London Bagel
  Museum, Knotted, Kyochon Chicken, and EGGDROP.
- [x] Generate distinct SchatPhone-owned marks for Moon Bistro, River Noodles, Daylight
  Cafe, Sugar Lane, Dash Grill, Jade Hearth, and Verdant Day.
- [x] Preserve these existing assets byte-for-byte:
  `peach-cloud/brand/peach-cloud-mark-01.svg` and
  `harbor-roast/brand/harbor-roast-app-icon-01.png`.
- [x] Keep PNG masters in `output/imagegen/food-delivery-brand-icons/` and export compact
  runtime WebP/PNG files under each shop's `brand/` directory.
- [x] Inspect all 13 new icons at full size and at the rendered Home icon size.

### C. Add Five Independent Restaurant Apps

- [x] Add stable restaurant IDs and seed records in `src/stores/foodDelivery.js`.
- [x] Add 3-4 original menu items per restaurant, using only cuisine/category evidence
  from public sources. Do not copy official item names, prices, descriptions, or ads.
- [x] Reuse semantically matching SchatPhone-owned food photography already present in the
  Food Delivery media pack for this first simple-template slice.
- [x] Add normal-hydration migrations that insert missing stable seeds without overwriting
  same-ID saved/user-authored records; keep explicit backup restore snapshot-faithful.
- [x] Route all five shops through one existing simple built-in presentation template while
  retaining independent restaurant-scoped bags and orders.

### D. Add Five Map Pins

- [x] Create `src/lib/seoul-map-food-places.js` for the five reality-anchored records.
- [x] Use stable Map IDs, bilingual names/addresses, `restaurant` category, public address,
  and reviewed latitude/longitude.
- [x] Merge the new records into the versioned Seoul pack without changing existing place
  IDs or coordinates.
- [x] Ensure each place is searchable and focusable in Map and can be used as a journey
  destination.
- [x] Keep Food Delivery restaurant/order state out of the Map records.

### E. Implement Home Folder Paging

- [x] Replace the folder's vertical scrolling list with horizontal pages of nine entries.
- [x] Keep each page a stable `3 x 3` grid with fixed icon/label dimensions.
- [x] Support touch swipe, pointer drag, wheel/trackpad, keyboard arrows, and explicit page
  dots/buttons without allowing the underlying Home page to swipe at the same time.
- [x] Reset/clamp the folder page when opening, closing, or when installed entries change.
- [x] Preserve the current system glass material and independently rounded icon previews.
- [x] Keep the collapsed Home thumbnail as a clipped four-icon preview with visible gutters;
  do not flatten it into square tiles.

### F. Tests, Visual QA, And Documentation

- [x] Extend unit coverage for 15 Food Delivery folder entries, stable ordering, logo paths,
  seed hydration, and five Map records.
- [x] Add targeted Playwright coverage for page `1 -> 2 -> 1`, opening a second-page shop,
  independent shop bags/orders, and Map search/focus for all five new places.
- [x] Inspect Home and one new shop at desktop and Pixel 5 viewports; verify no overlap,
  clipping, horizontal document overflow, console error, or blank image.
- [x] Run `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, targeted/full
  `npm.cmd run test:e2e`, `npm.cmd run test:visual`, `npm.cmd run governance:check`, and
  `git diff --check` as applicable.
- [x] Sync the commerce and map package README/handoff/boundary/workstream documents only
  after the implementation is complete. Update the live roadmap only if accepted scope or
  priority changes.

Validation evidence in this shared checkout:

- focused Vitest passed `4` files / `146` tests;
- isolated Food Delivery real-shop Playwright passed `4 / 4` across desktop Chromium and
  simulated Pixel 5, with stable Home-page-two, EGGDROP, and Map screenshots; the existing
  geographic Seoul regression passed `2 / 2` across the same projects;
- lint, production build, governance (`2` files / `13` tests), `git diff --check`, and the
  `12 / 12` default/zen visual gate passed at final closure;
- full Vitest passed `228` files / `1671` tests. A preceding full run hit the existing
  40 ms deferred-mirror timing assertion in `tests/persistence-write-result.test.js`;
  that file passed `13 / 13` in isolation and the complete rerun passed;
- the latest full Playwright collection reports `154` passed, `4` skipped, and `22` failed.
  Failures span global current-save recovery/locks, EVE-2C Map, Music/media, World Pack,
  backup, and concurrent artifact cleanup. The one Food real-shop desktop failure was
  intercepted by the global read-only persistence sheet under full parallel load; its
  mobile case passed in that run and the complete isolated desktop/mobile spec passed in
  three separate runs. No unrelated module or persistence behavior was changed here;
- desktop Chromium and simulated Pixel 5 are browser evidence only. No physical-device
  result is claimed.

## 5. Primary Files

- `src/lib/home-folder-mini-app-entries.js`
- `src/views/HomeView.vue`
- `src/stores/foodDelivery.js`
- `src/lib/food-shop-presentation.js`
- `src/views/FoodDeliveryView.vue`
- `src/lib/seoul-map-places.js`
- `src/lib/seoul-map-everyday-places.js`
- `src/lib/seoul-map-community-places.js`
- `src/lib/seoul-map-food-places.js`
- `src/lib/app-store-mini-app-placement.js`
- `tests/home-folder-entry.test.js`
- `e2e/home-entry-navigation.spec.js`
- `e2e/map-local-packs.spec.js`
- `e2e/food-delivery-real-shops.spec.js`

## 6. Deferred Shopping Verification

The six independent Shopping storefront implementation, its existing test files, final
runtime brand assets, Imagegen masters, and required commerce documentation are committed
together as one feature checkpoint. At the user's request, this checkpoint does not rerun
the validation commands before commit.

- [x] Run the focused Shopping Vitest files, including Store, View, Home folder, App Store,
  Chat routing, registry, and share-object coverage.
- [x] Run `e2e/shopping-storefronts.spec.js` plus the Shopping-related App Store and Home
  launcher Playwright cases on desktop Chromium and simulated Pixel 5.
- [x] Run the repository behavior gates: `npm.cmd run lint`, `npm.cmd run test`, and
  `npm.cmd run build`.
- [ ] Run the applicable user-facing and governance gates: targeted/full
  `npm.cmd run test:e2e`, `npm.cmd run governance:check`, and `git diff --check`.
- [ ] Perform named physical-device Shopping acceptance when that device gate is resumed.

Verification resumed on 2026-08-10 against `main` at
`aee172c31af081c32f4e8a472aca55af0449dedf`; feature commit
`cdac27d0ab9da34abb4f32de242bca8f3c35dbb1` is an ancestor of that HEAD.

- The current registry, Store seeds, router, Home folder, App Store entries, Chat routes,
  six runtime WebP icons, and six Imagegen PNG masters retain the documented service,
  template, Seoul-anchor, asset, and canonical-route contracts.
- Focused Vitest passed `7` files / `101` tests.
- Focused Shopping, App Store, and Home Playwright passed `16 / 16` cases across desktop
  Chromium and simulated Pixel 5 projects. This includes all six storefronts, asset decode,
  folder preview geometry, search, favorites, per-`serviceKey` cart/order isolation,
  checkout, animation settling, page errors, and horizontal overflow.
- The App Store spec no longer overrides both projects with one `390 x 844` viewport, so
  its latest pass uses the configured Desktop Chrome and Pixel 5 device profiles.
- Lint passed; full Vitest passed `226` files / `1648` tests; production build passed;
  governance passed `2` files / `13` tests; `git diff --check` passed; and the visual gate
  passed `12 / 12` cases.
- The latest full Playwright collection is not green: `160` passed, `4` skipped, and `6`
  failed. Every Shopping case passed. The failures are confined to Map checkpoint-event,
  World Pack loop, and persistence/dev-server cases; a prior full run reached `162`
  passed / `4` skipped / `4` failed with only Map and World Pack failures. Concurrent
  non-Shopping checkout work continued during these runs. No non-Shopping failure was
  changed here, so the combined full-E2E checkbox remains open.
- Named physical-device Shopping acceptance remains pending; simulated Pixel 5 evidence
  is not physical-device evidence.

## 7. Non-Negotiable Guardrails

- The Home folder is a system launcher surface, not an in-App multi-store hub.
- Baemin and every independent shop are peer entries.
- A real restaurant name/logo is an immersive setting reference, not an affiliation claim.
- Official catalogs, product images, prices, campaign copy, and branch promotions are not
  imported.
- Every new real restaurant receives its own real-address pin; do not substitute a nearby
  landmark pin.
- Peach Cloud and Harbor Roast keep their current logo assets unchanged.
- Preserve unrelated dirty-worktree changes and stage only files owned by this slice.
