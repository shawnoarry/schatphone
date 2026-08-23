# Map Place Media Source-Policy Recovery

Date: 2026-08-23

## Scope

The user completed the seven-item historical source-policy recovery review. The review
UI separated card-hero review from direct detail-gallery admission and displayed the
current hero status for every candidate. Existing `KEEP` browser choices migrated to
`DETAIL`; no choice triggered image generation or automatic hero replacement.

## Decisions

| Place | Candidate | Decision | Runtime result |
| --- | --- | --- | --- |
| Seoul National University Hospital | main gate | detail gallery | exact-photo `gallery-04` |
| LG Twin Towers | Hangang Railway Bridge and Yeouido | detail gallery | area-atmosphere `gallery-01` |
| LG Twin Towers | Yeouido from Dongjak Bridge | detail gallery | area-atmosphere `gallery-02` |
| LG Twin Towers | Yeouido Skyscrapers 2019 | hero review | exact-photo `hero` after a focused crop |
| The Shilla Seoul | hotel view | reject | not integrated |
| KBS Headquarters | headquarters complex | detail gallery | exact-photo `gallery-04` |
| Bank of Korea Main Building | June 1950 street scene | reject | not integrated |

## Source And Transformation

All five admitted records retain a durable Wikimedia Commons file page, named creator,
explicit Creative Commons license, locally archived source bytes, source SHA-256,
reviewed `1600 x 900` WebP derivative, runtime SHA-256, bilingual alt text, and the
shared disclosure that no generative edit occurred. Four detail records reuse the
already reviewed 960px Commons renditions. Only the tightly cropped LG hero required
one original-file retrieval because the displayed rendition did not preserve enough
resolution for card-level identity.

The two LG gallery records remain grade-B `area_atmosphere` and cannot become card
heroes. The LG hero uses the source page's annotated identification of LG Twin Towers
and a crop that makes the two matching towers the dominant subject. Commons records
`NoFoP-South Korea` or `de minimis` signals on the LG and hospital sources. These are
retained as review risks under the corrected project policy rather than silently
converted into a commercial-use veto for the user's non-profit project.

## Runtime Result

The five public derivatives were uploaded under
`schatphone-assets/images/ui-assets/apps/map/places/real-seoul-v1/` and re-downloaded
for byte and SHA-256 verification through the project publisher. The media registry now
contains 125 reviewed real-photo records across 61 Seoul places. Forty-eight places
have exact card heroes, 13 remain detail-only, and 45 have no place-specific photo.

The recovery source archive, selection page, derivative audit, and crop review remain
under the Git-ignored local directory
`output/imagegen/map-place-media-search-20260823/`. Rejected candidates were not
published or registered.
