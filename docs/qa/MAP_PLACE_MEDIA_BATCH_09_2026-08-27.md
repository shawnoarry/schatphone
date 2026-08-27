# Map Place Media Batch 09 QA

Date: 2026-08-27

## Scope

Batch 09 completes the user's selection of 24 source-traced photographs across fourteen Seoul places. The saved decision contains ten card heroes and fourteen detail-gallery slides. All derivatives are `1600 x 900` WebPs produced with EXIF transpose, sRGB conversion, a reviewed focal 16:9 crop, WebP quality 88, and no generative edit.

## Slot Decisions

Exact card heroes:

- Cube Entertainment HQ
- FNC Entertainment HQ
- Lotte Avenuel World Tower
- Homeplus World Cup
- CGV Wangsimni
- Jenny House Cheongdam Hill
- A by BOM Cheongdam
- Cakeshop Seoul
- Raemian One Bailey
- PH129 Cheongdam

Exact detail-gallery additions:

- SM Entertainment HQ: two tower-context slides
- Cube Entertainment HQ: one entrance slide
- Lotte Avenuel World Tower: one night-entrance slide
- E-Mart Wangsimni: one parking-entry slide
- Homeplus World Cup: one entrance slide
- THE PLUS Plastic Surgery: one interior reception slide
- CGV Wangsimni: one concessions/waiting-area slide
- Jenny House Cheongdam Hill: one street-front slide
- A by BOM Cheongdam: one courtyard-branding slide
- Club FF: two interior slides
- Raemian One Bailey: one daytime exterior slide
- PH129 Cheongdam: one full-building slide

SM Entertainment HQ, E-Mart Wangsimni, THE PLUS Plastic Surgery, and Club FF remain detail-only because this batch does not contain a card-suitable identity image for them. Lotte Avenuel World Tower and CGV Wangsimni are promoted from category fallback to exact-photo heroes. Exact detail/context records remain `EXACT_PHOTO`; none is mislabeled as `area_atmosphere` merely because it occupies a detail slot.

## Provenance And Publication

The selected Naver Blog source pages, source-media URLs, source-owner handles, untouched-candidate hashes, derivative hashes, focal points, and transformation notes are retained in the Git-ignored local audit at `output/imagegen/map-place-media-search-20260827/approved-selection-runtime-audit-batch-09.json`. The normalized decision is retained at `output/imagegen/map-place-media-search-20260827/batch-09-selection.json`.

All 24 reviewed runtime derivatives were published through `map-place-media-batch-09-20260827`. Publisher readback matched byte length and SHA-256 for 24/24 objects, and `config/project-assets.json` records their public keys and verified downloads. No post-selection source-policy gate was introduced.

## Coverage Result

- Real-photo derivatives: 190
- Seoul places with reviewed real media: 92 / 106
- Exact-photo card heroes: 80
- Detail-only Seoul places: 12
- Seoul places still lacking real media: 14
- Seoul places still lacking a card-eligible hero: 26

## Validation

- Focused media registry: 1 file / 9 tests passed
- Asset registry: 1,146 tracked objects / zero violations
- ESLint: passed
- Production build: passed
- Governance: 2 files / 19 tests passed
- `git diff --check`: passed
- Full Vitest: 330 / 332 files and 2,506 / 2,509 tests passed
- Isolated rerun of the two full-suite timeout files: 2 files / 36 tests passed

The three full-suite failures are five-second timeouts in the existing persistence owner inventory and persistence bootstrap ordering tests under parallel suite load. Both affected files pass immediately when run alone. No Map UI behavior changed in this batch, so no new Playwright result is claimed.
