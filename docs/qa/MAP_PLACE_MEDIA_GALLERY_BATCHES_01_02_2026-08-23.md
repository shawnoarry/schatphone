# Map Place Media Gallery Batches 01-02 2026-08-23

Date: 2026-08-23

Status: `24_DETAIL_SLIDES_PUBLISHED / RUNTIME_REGISTERED / SOURCE_ARCHIVE_LOCAL_ONLY`

## Scope

The retained non-hero candidates from the first two ten-place hero selection rounds
were reused instead of searched or downloaded again. The 20 approved heroes were
excluded. Eighteen places received 24 additional exact-photo detail slides; The Hyundai
Seoul and Jangchung Arena had no other retained qualified candidate.

The browser loaded all 24 official Wikimedia Commons thumbnails and exported them as
one observed page-asset bundle with no failures. Untouched thumbnail bytes and their
SHA-256 values remain in the Git-ignored source archive. Only separately reviewed
derivatives enter runtime.

## Adaptation And Publication

Each retained image was EXIF-transposed, converted to sRGB, fitted to `1600 x 900`, and
encoded as WebP quality 88 without generative editing. The combined crop sheet was
visually reviewed for place identity and detail-role usefulness. Night views, campus
gates and roads, hospital entrances and chapel, venue interiors, and alternate building
angles remain detail-only supplements and do not replace the approved card heroes.

Batch `map-place-media-gallery-batches-01-02-20260823` published and remotely read back
all 24 files with matching byte lengths and SHA-256 values. The machine-readable local
records are:

- `output/imagegen/map-place-media-search-20260823/gallery-candidate-manifest-batches-01-02.json`;
- `output/imagegen/map-place-media-search-20260823/gallery-runtime-audit-batches-01-02.json`;
- `output/imagegen/map-place-media-search-20260823/gallery-crop-review-batches-01-02.jpg`.

## Validation

- publication and remote readback: 24/24;
- media and detail-card tests: 1 file / 9 tests passed;
- map place-media E2E: Chromium and mobile Chrome, 2/2 passed;
- asset registry: 1014 assets, 0 violations;
- ESLint and production build: passed.
