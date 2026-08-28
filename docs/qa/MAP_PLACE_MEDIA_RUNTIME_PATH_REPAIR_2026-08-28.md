# Map Place Media Runtime Path Repair QA

Date: 2026-08-28

## Problem

The Map runtime builds every place-media URL through `projectUiAssetUrl`, which requests objects under `schatphone-assets/images/ui-assets/apps/map/places/real-seoul-v1/`. Forty-five reviewed Batch 07-09 derivatives were instead registered and published under historical incorrect keys:

- Batch 07-08 omitted the `images/ui-assets/` segment.
- Batch 09 added an extra `schatphone-assets/` segment.

Fresh browsers therefore received HTTP 404 for 22 card heroes and 23 detail-gallery slides. A browser with older cached state or a category fallback could conceal the defect locally.

## Repair

No source search, user selection, crop, compression, or media metadata changed. The existing reviewed WebPs were taken from their Git-ignored local derivative archives, matched to the current media registry by filename and SHA-256, and republished through `map-place-media-runtime-path-repair-20260828` under the exact runtime prefix.

The 45 incorrect registry entries were removed before publication to preserve the registry's one-digest/one-key rule. The publisher then read every corrected public object back and verified byte length plus SHA-256. Historical wrong-path remote objects may remain as unreferenced storage objects, but neither runtime code nor `config/project-assets.json` references them.

## Regression Protection

`tests/map-place-media.test.js` now compares every reviewed `record.asset.url` against the verified download URLs in `config/project-assets.json`. A future upload-prefix mismatch therefore fails the focused media suite before commit.

## Result

- Corrected runtime objects: 45 / 45
- Corrected card heroes: 22
- Corrected detail slides: 23
- Unique Map media filenames with exact canonical registry keys: 199 / 199
- Historical wrong-prefix Map registry keys remaining: 0
- Total verified asset registry objects: 1,179

## Validation

- Focused Map media suite: 1 file / 10 tests passed.
- Asset registry validation: 1,179 objects / 0 violations.
- Exact runtime-key audit: 199 / 199 unique Map media filenames registered; 0 wrong-prefix keys remain.
- ESLint: passed.
- Production build: passed at 707 transformed modules.
- Governance suite: 2 files / 19 tests passed.
- Full Vitest: 341 / 342 files and 2,602 / 2,604 tests passed. Both failures were the existing five-second persistence bootstrap-ordering timeouts under full parallel load; `tests/persistence-layer-reconcile.test.js` then passed 27 / 27 when rerun alone.
