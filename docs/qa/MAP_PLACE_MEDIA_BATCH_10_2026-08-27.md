# Map Place Media Batch 10 QA

Date: 2026-08-27

## Scope

Batch 10 completes the user's selection of 33 source-traced photographs across twelve Seoul places. The saved decision contains twelve card heroes, 21 detail-gallery slides, and four explicit rejections. All derivatives are `1600 x 900` WebPs produced with EXIF transpose, sRGB conversion, a reviewed focal 16:9 crop, WebP quality 88, and no generative edit.

## Slot Decisions

Exact card heroes and selected detail galleries are integrated for:

- Soonsoo Cheongdam: one hero and two detail slides
- 7-Eleven Myeongdong Street: one hero and two detail slides
- Club NB2: one hero and two detail slides
- Club Aura: one hero and two detail slides
- JK Plastic Surgery: one hero and one detail slide
- LH Gangnam Complex 3: one hero and one detail slide
- Mokdong New Town Apartment District: one hero and one detail slide
- Jongno 5-ga Pharmacy Street: one hero and two detail slides
- Gangnam Station Pharmacy District: one hero and two detail slides
- Knotted Cheongdam: one hero and three detail slides
- Kyochon Chicken Yeoksam No. 1: one hero and one detail slide
- EGGDROP Gangnam Woosung: one hero and two detail slides

CU BGF Headquarters Store and GS25 Gangnam Central remain on category fallback because this batch did not establish an accepted exact branch photo. No unrelated branch image or generic storefront was admitted to fill those gaps.

## Provenance And Publication

The selected Naver Blog source pages, source-media URLs, source-owner handles, untouched-candidate hashes, derivative hashes, focal points, and transformation notes are retained in the Git-ignored local audit at `output/imagegen/map-place-media-search-20260827/approved-selection-runtime-audit-batch-10.json`. The normalized decision is retained at `output/imagegen/map-place-media-search-20260827/batch-10-selection.json`.

All 33 reviewed runtime derivatives were published through `map-place-media-batch-10-20260827`. Publisher readback matched byte length and SHA-256 for 33/33 objects, and `config/project-assets.json` records the verified public objects under `schatphone-assets/images/ui-assets/apps/map/places/real-seoul-v1/`.

## Coverage Result

- Real-photo derivatives: 223
- Seoul places with reviewed real media: 104 / 106
- Exact-photo card heroes: 92
- Detail-only Seoul places: 12
- Seoul places still lacking real media: 2
- Seoul places still lacking a card-eligible hero: 14

## Validation

- Focused media registry: 1 file / 9 tests passed
- Asset registry: 1,179 tracked objects / zero violations
- ESLint: passed
- Production build: passed, 705 modules transformed
- Governance: 2 files / 19 tests passed
- `git diff --check`: passed
- Full Vitest: 336 / 338 files and 2,541 / 2,543 tests passed
- Isolated rerun of the two full-suite timeout files: 2 files / 36 tests passed

The two full-suite failures are five-second timeouts in the existing persistence bootstrap-ordering and persistence-owner inventory tests under parallel suite load. Both affected files pass immediately when rerun together. No Map UI behavior changed in this batch, so no new Playwright result is claimed; slot semantics, public object integrity, and runtime registration are covered by the focused registry test, publisher readback, and asset validation.
