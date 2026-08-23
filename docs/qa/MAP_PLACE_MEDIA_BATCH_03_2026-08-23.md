# Map Place Media Batch 03 QA

Date: 2026-08-23

## Scope

The user completed the third local contact-sheet review. Eight selected Wikimedia
Commons candidates become exact-photo card heroes: Seoul Metropolitan Police Agency,
Seoul Fire and Disaster Headquarters, Gocheok Sky Dome, Shinhan Bank Head Office,
YTN Newsquare, Yeouido Hangang Park, Times Square Seoul, and Four Seasons Hotel Seoul.

Five additional qualified candidates are retained as detail slides: two Gocheok Sky
Dome interiors, two Yeouido Hangang Park riverfront views, and one Sejong-daero view
around Four Seasons Hotel Seoul. The Four Seasons alternate is explicitly classified
as `area_atmosphere` and cannot become a card hero. Samsung Medical Center and
Shinsegae Department Store Gangnam remain open because the user chose to continue
searching.

## Source And Transformation

All 13 candidates use Wikimedia Commons source pages with explicit reusable licenses.
The already rendered browser assets were exported once into the Git-ignored local
source archive to avoid repeated rate-limited transfers. Runtime files are separate
`1600 x 900` WebP derivatives using EXIF normalization, sRGB conversion, a reviewed
16:9 crop, WebP quality 88, and no generative editing.

The selected Gocheok hero documents the stadium during construction in 2013 and says
so in its alt text. The selected Four Seasons view places the hotel in its wider
Gwanghwamun city context rather than presenting an unrelated facade close-up.

Local machine-readable evidence:

- `output/imagegen/map-place-media-search-20260823/approved-selection-batch-03.json`;
- `output/imagegen/map-place-media-search-20260823/approved-selection-runtime-audit-batch-03.json`;
- `output/imagegen/map-place-media-search-20260823/approved-crop-review-batch-03.jpg`.

## Publication

The initial batch omitted the required `images/ui-assets/` runtime-key prefix. Its 13
registry records were removed, then the batch 03 and 04 files were republished through
`map-place-media-batches-03-04-corrected-paths-20260823`. All 13 batch 03 files were
remotely read back with matching byte lengths and SHA-256 values. Original candidates
remain local-only and are not runtime URLs.

## Validation

- image-bed publication and remote readback: 13/13;
- focused Map media tests: 1 file / 9 tests;
- project asset registry check, lint, build, governance, and focused Map E2E are run
  as the closing validation for this batch.
