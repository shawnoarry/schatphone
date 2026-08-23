# Map Place Media Exact-Hero Batch 02 2026-08-23

Date: 2026-08-23

Status: `10_EXACT_HEROES_PUBLISHED / RUNTIME_REGISTERED / SOURCE_ARCHIVE_LOCAL_ONLY`

## Scope And Selection

The user selected all ten places through `next-batch-contact-sheet.html`. The page loaded
only official Wikimedia Commons thumbnails and retained the selected letter per place.
No map-service screenshot, news/social image, or unclear corporate press image entered
the batch.

| Place | Selection | Creator | License |
| --- | --- | --- | --- |
| Cheongnyangni Station | B | Corcega1031 | Public domain |
| Bank of Korea Main Building | A | Sean Young (@assanges) | CC BY 4.0 |
| National Museum of Korea | A | Richard Mortel | CC BY 2.0 |
| Seoul Express Bus Terminal | A | Sharon Hahn Darlin | CC BY 2.0 |
| Seoul National University Hospital | A | Oleg Kurtsev | CC BY-SA 3.0 |
| Severance Hospital | A | Integral | CC BY-SA 2.0 KR |
| KBS Headquarters | A | Narubaru7 | CC BY 4.0 |
| The Shilla Seoul | A | Seoul Institute | CC BY 4.0 |
| Woori Bank Head Office | A | Magneta6006 | CC BY-SA 4.0 |
| Korean National Police Agency | C | 元諜報員 | CC BY-SA 3.0 |

All ten records are grade `A / exact_photo` card heroes. The National Museum and
Express Bus Terminal keep their earlier detail slides; their new card assets therefore
use `hero-v2` rather than replacing or reclassifying detail media.

## Source And Derivative Audit

Direct large-rendition transfers repeatedly timed out. Because the user had already
approved the visible candidates and explicitly wanted to avoid redundant downloads,
the ten already rendered official Commons `960px` thumbnails were exported through the
browser page-asset bundle. Each exported JPEG was hashed and retained only under the
Git-ignored local archive. This is recorded as `official_commons_thumbnail` plus
`browser_observed_asset_bundle`; the upstream Commons file SHA-1, source page, author,
license, original dimensions, and thumbnail URL remain in the selection manifest.

Each source was EXIF-transposed, converted to sRGB, visually reviewed, cropped to
`16:9`, upscaled where required, and encoded as a `1600 x 900` WebP at quality 88 with
no generative editing. The crop review preserves the identifying building, entrance,
or visible institution signage for every place.

Runtime batch `map-place-media-heroes-10-batch-02-runtime-v2-20260823` published and
read back all ten UI-asset objects with matching byte lengths and SHA-256 values. An
earlier preparation accidentally omitted the `images/ui-assets/` remote prefix; those
non-runtime-key entries were removed from `config/project-assets.json` before the
corrected batch and are not referenced by application code.

The machine-readable local records are:

- `output/imagegen/map-place-media-search-20260823/approved-selection-batch-02.json`;
- `output/imagegen/map-place-media-search-20260823/approved-selection-runtime-audit-batch-02.json`;
- `output/imagegen/map-place-media-search-20260823/approved-hero-crop-review-batch-02.jpg`.

## Validation

- image-bed publication and remote readback: 10/10;
- focused media and card tests: 2 files / 23 tests passed;
- focused media registry test: 1 file / 9 tests passed;
- map place-media E2E: Chromium and mobile Chrome, 2/2 passed;
- asset registry check: 990 assets, 0 violations;
- governance check: 2 files / 14 tests passed;
- ESLint and production build: passed;
- full Vitest: 299/304 files and 2192/2202 tests passed. The ten failures are outside
  this batch: Home layout/setup-version expectations, one Music cache timeout, and two
  persistence inventory scan timeouts. No map media test failed;
- `git diff --check`: passed, with an unrelated pre-existing CRLF warning for
  `src/views/HomeView.vue`.
