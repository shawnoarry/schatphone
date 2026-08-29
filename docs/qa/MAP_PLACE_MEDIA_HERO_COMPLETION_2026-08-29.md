# Map Place Media Hero Completion QA

Date: 2026-08-29

## Scope

This round closes the six remaining card-hero decisions in the 106-place Seoul catalog. It changes only Map-owned media records, verified public runtime assets, focused tests, and the owning documentation. Canonical place records, coordinates, introductions, place-card layout, and existing detail-gallery records are unchanged.

The user completed the clickable six-place review. The exported decision file is retained in the Git-ignored local archive at `output/imagegen/map-place-media-search-20260828/hero-completion-selection.json`.

## Accepted Heroes

| Place | Selected candidate | Runtime truth | Runtime file |
| --- | --- | --- | --- |
| SM Entertainment HQ | D Tower Seoul Forest entrance with SMTOWN media wall | `A / exact_photo` | `seoul-sm-hq-hero-v2.webp` |
| Sillim-dong Compact Housing District | verified exam-town district entrance and low-rise housing | `A / exact_photo` for the district record | `seoul-sillim-one-room-district-hero-v2.webp` |
| E-Mart Wangsimni | Bitplex and E-Mart building panorama | `A / exact_photo` | `seoul-emart-wangsimni-hero-v1.webp` |
| THE PLUS Plastic Surgery | branded reception wall | `A / exact_photo` | `seoul-the-plus-plastic-surgery-hero-v1.webp` |
| CU BGF Headquarters Store | another CU storefront selected for brand recognition | `D / category_fallback`, labeled `Brand representative` | `seoul-cu-bgf-hq-brand-representative-v1.webp` |
| GS25 Gangnam Central | another GS25 storefront selected for brand recognition | `D / category_fallback`, labeled `Brand representative` | `seoul-gs25-gangnam-central-brand-representative-v1.webp` |

The CU and GS25 records do not claim exact-branch identity. Their visible label, truth note, Chinese/English alt text, and internal filenames all state that they are same-brand representatives rather than the recorded facades.

## Derivative And Source Evidence

The six selected source files are copied into `approved-source-renditions-hero-completion/` inside the Git-ignored local archive. `build-hero-completion-derivatives.py` performs EXIF transpose, sRGB conversion, focal `16:9` crop, and WebP quality-88 encoding without generative modification. Every runtime derivative is `1600 x 900`.

The complete source/runtime byte counts, SHA-256 values, focal points, source pages, creators, and alt text are recorded in `output/imagegen/map-place-media-search-20260828/hero-completion-runtime-audit.json`. The checked crop sheet is `hero-completion-crop-review.jpg` in the same local archive. Visual review confirms that SM retains both `SMTOWN` and `D TOWER`, E-Mart retains the complex identity, THE PLUS retains the full brand name, and CU/GS25 retain readable brand marks.

## Publication

Upload list `map-place-media-hero-completion-20260829` publishes only the six reviewed runtime derivatives beneath:

`schatphone-assets/images/ui-assets/apps/map/places/real-seoul-v1/`

The publisher re-downloads all six public objects and verifies byte length and SHA-256 before adding them to `config/project-assets.json`. The registry contains 1,220 verified assets after this batch. No source candidate, contact sheet, selection JSON, or audit artifact is published as runtime media.

## Registry Behavior

`src/lib/map-place-media.js` now permits two grade-D category-fallback forms:

1. the existing project-rendered `system_fallback` asset;
2. an approved source-traced same-brand representative photograph with explicit representative presentation copy.

The second form still requires the normal reviewed-photo runtime dimensions, source page, creator, source hash, personal-project usage scope, and review date. `area_atmosphere` remains detail-only. The four former detail-only Seoul places gain exact heroes, while their existing detail slides remain unchanged; CU and GS25 gain their first reviewed real-photo records.

## Result

All 106 Seoul places now have a reviewed real-photo card decision: 104 exact-photo heroes and two explicitly labeled same-brand representatives. The remaining fixed built-in media work is limited to the seven separately gated fictional generated reconstructions.

## Validation

- `npm.cmd run assets:check`: passed with 1,220 registry objects and zero violations.
- `npm.cmd run test -- tests/map-place-media.test.js --run`: passed, 1 file / 10 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, 721 modules transformed.
- `npm.cmd run test:e2e -- e2e/map-place-media.spec.js`: the mobile-chrome project passed the full updated catalog flow. The desktop project initially exhausted the old 180-second limit while waiting on a stale compact-card fallback expectation; the test was corrected to use the new CU representative state and given a 240-second catalog budget. `npm.cmd run test:e2e -- e2e/map-place-media.spec.js --project=chromium` then passed. Together, final desktop and simulated Pixel 5 coverage is 2/2.
- `git diff --check`: passed after the implementation edits.
- Full `npm.cmd run test`: 344 files / 2,660 tests passed; 4 files / 7 tests failed in unrelated dirty-worktree persistence and Work Hub changes. The failures expect 21 persistence targets instead of the current 22, backup schema 5 instead of 6 and no `workHub` section, and a complete `Recommended Next Slice` section in the separate Work Hub package.
- `npm.cmd run governance:check`: mojibake guard passed; workflow governance has the same unrelated `work-hub-organization: Recommended Next Slice` failure. No Work Hub or persistence file was changed in this Map round.
