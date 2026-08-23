# Map Place Media Governance

Updated: 2026-08-22

## Purpose

Place media makes Map details visually recognizable without turning photography into place truth. Canonical place identity, name, address, coordinate, category, visibility, discovery, and Journey behavior remain in Map place records. Media is a separate reviewed projection keyed by `mapPackId + placeId`.

The current implementation is `src/lib/map-place-media.js`. The initial pilot evidence is `docs/qa/MAP_PLACE_MEDIA_PILOT_2026-08-15.md`, the first multi-image integration is `docs/qa/MAP_PLACE_MEDIA_INTEGRATION_2026-08-22.md`, and the catalog-wide acquisition plan is `docs/design/MAP_PLACE_MEDIA_INVENTORY.md`.

## Catalog Baseline

`real-seoul-v1` contains 106 unique read-only places:

| Source module | Count | Meaning |
| --- | ---: | --- |
| `src/lib/map-packs.js` | 7 | original Seoul anchors |
| `src/lib/seoul-map-places.js` | 28 | agencies, media, companies, culture, events, beauty |
| `src/lib/seoul-map-everyday-places.js` | 48 | shopping, services, housing, transit, parks, universities, hotels |
| `src/lib/seoul-map-community-places.js` | 18 | pharmacies, sports, cinemas, banks, public safety |
| `src/lib/seoul-map-food-places.js` | 5 | reviewed Food Delivery-linked restaurant branches |
| **Total** | **106** | versioned Map-owned catalog |

Every built-in or player place resolves one image-backed `hero` media presentation. A reviewed `exact_photo` or `generated_reconstruction` hero wins; otherwise Map renders an explicit category fallback asset. `area_atmosphere` is detail-only and can never replace the card hero. A reviewed place may additionally expose `detail_gallery` records. Missing exact-place photography therefore never produces an empty card and never promotes a nearby street or district into false place identity.

## Schema

Each reviewed record contains:

| Field | Contract |
| --- | --- |
| `schemaVersion` | currently `1` |
| `id` | immutable media-record ID |
| `mapPackId`, `placeId` | canonical Map linkage; no provider place ID |
| `slot` | `hero` for the single overview image or `detail_gallery` for detail-only slides; `area_atmosphere` requires `detail_gallery` |
| `kind` | `exact_photo`, `area_atmosphere`, `generated_reconstruction`, or `category_fallback` |
| `authenticityGrade` | `A`, `B`, `C`, or `D`, mapped exactly to `kind` |
| `asset` | approved public runtime URL, dimensions, MIME, alt text, and SHA-256; category fallback also requires an image asset |
| `source` | source type, provider, author/generator, license, source page, access date, source SHA-256, and disclosed changes |
| `review` | status, date, reviewer, and source-archive batch |

The validator fails closed when identity, grade, slot/kind compatibility, runtime location, source page, attribution, license, hash, alt text, or review evidence is incomplete. A future `area_atmosphere + hero` record is invalid even when every source and license field is otherwise complete.

## Detail Slots

The place focus card owns four media responsibilities. Every overview has one runtime
`hero` projection. A reviewed place may also have multiple `detail_gallery` records.
When an approved exact/generated hero exists it is the first detail slide. When a place
has only surrounding-area media, the overview uses the category fallback while Place
Details starts directly with the labeled area slide; the fallback is not repeated as
photographic evidence.

1. `overview image`: a recognition-oriented image paired with category and a one-sentence introduction. It must identify the specific place (`exact_photo`), present an explicitly generated interpretation (`generated_reconstruction`), or admit missing identity evidence (`category_fallback`). A nearby street, district, interior context, or general atmosphere is never eligible.
2. `detail gallery`: a larger place-inspection surface. Buttons, keyboard arrows, and horizontal touch swipes move between slides. Every slide retains its own truth label and attribution; surrounding-area imagery cannot inherit the hero's exact-place label.
3. `authenticity badge`: always names the representation before the user interprets it.
4. `truth note` and `image-information disclosure`: distinguish exact place, surrounding area, generated reconstruction, and generic category imagery while keeping author, source page, license link, and disclosed source conversion reachable without competing with place content.

The current batches use a shared `1600 x 900` WebP derivative in both levels. This is
still a source-processing baseline rather than a permanent universal crop rule. A
future source may receive separate overview/detail derivatives when review shows that
one crop cannot preserve recognition at both levels.

Image failure returns to the same category fallback without shifting the sheet hierarchy or hiding place actions.

## Authenticity Grades

| Grade | Kind | User meaning | Admission rule |
| --- | --- | --- | --- |
| `A` | `exact_photo` | the image directly shows this place | location identity is supported by the source page and visual review |
| `B` | `area_atmosphere` | real nearby district or area, not the exact facade | detail gallery only; the UI must say that it is an area view |
| `C` | `generated_reconstruction` | synthetic reconstruction | provider/model/prompt evidence is required and the UI must say it is generated |
| `D` | `category_fallback` | category-only visual | no claim about real appearance; used for missing, fictional, and player places |

Grades are evidence labels, not quality scores. A clear `B` is preferable to a falsely precise `A`, but it supplements Place Details and never substitutes for card-level place recognition.

## Source Rules

Use this order by presentation role:

1. card hero: a reusable exact-place photograph with a durable source page and explicit license;
2. card hero when separately approved: a generated reconstruction with durable generation provenance and visible generated labeling;
3. card hero fallback: the reviewed category asset with copy that clearly says it does not represent the place's real appearance;
4. detail gallery supplement: a reusable real area photograph, clearly classified as `area_atmosphere` and never promoted to hero.

Accepted photo evidence must provide an explicit reuse license, author/creator, source page, access date, and a byte hash for the locally archived source artifact. Current discovery uses Wikimedia Commons file pages because each selected file exposes reusable-license metadata and attribution. A previously reviewed candidate does not need to be re-selected or repeatedly downloaded: reuse a locally verified original when present; otherwise an official Commons-generated rendition may be archived when its durable file page, actual rendition URL, downloaded SHA-256, and upstream Commons SHA-1 identity are all recorded. The rendition is source evidence, not a runtime URL.

Reject:

- map-service or street-view screenshots;
- news, social-media, review-site, or influencer images;
- corporate press/marketing images without explicit reusable terms;
- search-result thumbnails without a durable source page;
- images whose depicted location cannot be matched to the intended place or area;
- files with unclear architecture, privacy, trademark, or other reuse restrictions.

## Candidate To Runtime Flow

1. Discover a candidate and record the source page before download.
2. Archive the candidate under `output/imagegen/<batch>/source-candidates/`. Prefer a complete locally verified original. When the original is absent or Commons throttling makes repeated original transfer wasteful, use one official Commons-generated rendition and retain its actual rendition URL. This directory is local and Git-ignored; runtime code must never reference it.
3. Record archived bytes and SHA-256, author, license, source page, access date, intended truth grade, and the upstream Commons SHA-1. For a rendition, explicitly record that its SHA-256 identifies the rendition bytes rather than the original bytes.
4. Review identity, location, license, attribution, privacy, architecture/FOP concerns, logos, and crop safety. Reject first; do not repair a false identity with copy.
5. Produce a separate runtime derivative. The pilot performs EXIF transpose, a `16:9` crop, sRGB conversion, and WebP compression only. This describes the pilot batch; later batches may use different dimensions or more than one derivative after media calibration.
6. Record derivative dimensions, bytes, SHA-256, and disclosed changes.
7. Publish only reviewed runtime derivatives to `schatphone-assets/` through a confirmed asset upload list. Source candidates stay out of runtime.
8. Add the verified public asset to the media registry and run schema, component, full catalog, and browser checks.
9. If a source or license is later disputed, remove the registry record first. The category fallback preserves the place and all Map behavior.

The source page and audit document are cross-machine evidence. A local absolute archive path is never the only provenance record.

## Ownership

Map owns selection, truth labeling, detail placement, alt text, and attribution presentation for place media. The project asset registry owns the verified runtime object reference. Gallery still owns user-retained media; Image Generation owns temporary generation candidates and provider provenance. A place photo cannot change a place coordinate, discovery state, visibility, Journey, event eligibility, or business record.

## Current Scope

The integrated runtime contains 50 real-photo derivatives across 23 Seoul places plus one explicit fictional category fallback. Fourteen Seoul places currently have approved exact-photo heroes. Nine places have reviewed surrounding-area detail media but no approved hero: SM Entertainment HQ, Myeongdong Kyoja Main Store, Sillim-dong Compact Housing District, Gangnam Station, Seoul Express Bus Terminal, National Museum of Korea, Times Square Seoul, Lotte Department Store Main, and Hyundai Department Store Apgujeong Main. Their cards therefore use the approved CC0 Seoul category visual while their real area photos remain available only in Place Details. No generated reconstruction was needed in these batches.

The fixed built-in target is 113 place-specific decisions: 106 Seoul places and seven fictional places. Twenty-three Seoul places have some reviewed real-photo media, but only fourteen currently have a card-eligible hero; 92 Seoul hero decisions therefore remain. Extra detail slides deepen a place without satisfying its card-hero requirement. The inventory's former “area-atmosphere preferred” group now describes detail acquisition only; every card still requires exact/generated identity evidence or the explicit fallback.
