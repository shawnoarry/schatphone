# Map Place Media Batch 11

Date: 2026-08-28

## Scope

Batch 11 processed the user's completed 39-candidate review for the remaining Seoul card-hero gaps and existing detail-only places. The integration preserves the overview/detail boundary: exact-place or exact-record context may become a card hero, while surrounding-area media remains detail-only.

## Accepted Runtime Media

- 30 source-traced real-photo derivatives were admitted: eight heroes and 22 detail slides.
- New heroes: Myeongdong Kyoja Main, Namdaemun Pharmacy District, London Bagel Museum Anguk, Hongdae, Sanggye Jugong Apartment District, Acro River Park, Hannam The Hill, and Club FF.
- New detail coverage: three SM Entertainment HQ building-context slides, one verified Sillim area slide, two E-Mart Wangsimni interior/context slides, and one branded THE PLUS Plastic Surgery slide, plus the selected details for the eight promoted places.
- All runtime images are `1600 x 900` WebP derivatives using EXIF transpose, sRGB conversion, focal 16:9 crop, and no generative edit.

## Identity Corrections

Six user-selected candidates were excluded after the source page contradicted or failed to prove the intended place:

- three Sillim candidates actually described Osaka, Sinchon, and Taepyeong-dong in Seongnam;
- one clinic candidate did not establish THE PLUS Plastic Surgery;
- one candidate explicitly showed O&Young Plastic Surgery;
- one selected hero showed MOPLUS Plastic Surgery.

The files had already entered the verified asset upload batch before the final registry audit. They remain unreferenced image-bed objects and are not present in `MAP_PLACE_MEDIA_RECORDS`.

## Acquisition Policy

Everyday facilities no longer require repeated exact-branch photography searches. Convenience stores, pharmacies, gas stations, and similar routine services may use a source-traced same-brand representative image, a shared brand/category asset, or clearly labeled generation after one bounded identity and photo search. Shared imagery must never claim to show the exact recorded facade.

## Publication And Validation

- asset batch: `map-place-media-batch-11-20260828`;
- publisher verification: 35/35 uploaded objects matched byte length and SHA-256;
- Map runtime registration: 30/30 identity-valid derivatives;
- focused Map media test: 10/10 passed;
- focused ESLint for registry and tests: passed;
- asset registry check: 1,214 tracked objects, zero violations;
- `git diff --check`: passed.

No Map UI behavior changed in this batch. Full lint, full unit tests, production build, governance validation, and browser coverage remain to be run before commit.
