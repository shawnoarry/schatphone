# Map Place Media Batch 04 QA

Date: 2026-08-23

## Scope

The user completed the fourth local contact-sheet review. Five selected Wikimedia
Commons candidates become exact-photo card heroes: Asan Medical Center, KSPO Dome,
SBS Mokdong Broadcasting Center, Amorepacific Headquarters, and Gangnam Fire Station.

The Lotte World Mall entrance image identifies the wider complex but not the specific
Lotte Avenuel storefront. It is therefore admitted only as `area_atmosphere` in the
Lotte Avenuel World Tower detail gallery. The validator continues to prohibit it from
the hero slot. Samsung Medical Center, Shinsegae Department Store Gangnam, Samsung
Town, and SK Seorin Building remain open for later searches.

## Source And Transformation

All six accepted candidates use Wikimedia Commons source pages with explicit reusable
licenses. Already rendered browser assets were exported once into the Git-ignored
local source archive. Runtime files are separate `1600 x 900` WebP derivatives using
EXIF normalization, sRGB conversion, reviewed 16:9 crops, WebP quality 88, and no
generative editing.

Local machine-readable evidence:

- `output/imagegen/map-place-media-search-20260823/approved-selection-batch-04.json`;
- `output/imagegen/map-place-media-search-20260823/approved-selection-runtime-audit-batch-04.json`;
- `output/imagegen/map-place-media-search-20260823/approved-crop-review-batch-04.jpg`.

## Publication

The initial batch omitted the required `images/ui-assets/` runtime-key prefix. Its six
registry records were removed, then the batch 03 and 04 files were republished through
`map-place-media-batches-03-04-corrected-paths-20260823`. All six batch 04 files were
remotely read back with matching byte lengths and SHA-256 values. Original candidates
remain local-only and are not runtime URLs.

## Validation

- image-bed publication and remote readback: 6/6;
- focused Map media tests: 1 file / 9 tests;
- project asset registry check, focused lint, governance, and focused Map E2E are run
  as the closing validation for this batch.
