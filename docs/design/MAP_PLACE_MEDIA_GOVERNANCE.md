# Map Place Media Governance

Updated: 2026-08-20

## Purpose

Place media makes Map details visually recognizable without turning photography into place truth. Canonical place identity, name, address, coordinate, category, visibility, discovery, and Journey behavior remain in Map place records. Media is a separate reviewed projection keyed by `mapPackId + placeId`.

The current implementation is `src/lib/map-place-media.js`. The current pilot evidence is `docs/qa/MAP_PLACE_MEDIA_PILOT_2026-08-15.md`, and the catalog-wide acquisition plan is `docs/design/MAP_PLACE_MEDIA_INVENTORY.md`.

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

Every built-in or player place resolves one image-backed `hero` media presentation. An approved registry record wins; otherwise Map renders an explicit category fallback asset. Missing photography therefore never produces an empty card and never fabricates photographic evidence.

## Schema

Each reviewed record contains:

| Field | Contract |
| --- | --- |
| `schemaVersion` | currently `1` |
| `id` | immutable media-record ID |
| `mapPackId`, `placeId` | canonical Map linkage; no provider place ID |
| `slot` | currently `hero` |
| `kind` | `exact_photo`, `area_atmosphere`, `generated_reconstruction`, or `category_fallback` |
| `authenticityGrade` | `A`, `B`, `C`, or `D`, mapped exactly to `kind` |
| `asset` | approved public runtime URL, dimensions, MIME, alt text, and SHA-256; category fallback also requires an image asset |
| `source` | source type, provider, author/generator, license, source page, access date, source SHA-256, and disclosed changes |
| `review` | status, date, reviewer, and source-archive batch |

The validator fails closed when identity, grade, runtime location, source page, attribution, license, hash, alt text, or review evidence is incomplete.

## Detail Slots

The place focus card owns four media responsibilities. The current pilot has one
runtime `hero` projection for every overview, but that projection does not freeze
the final presentation ratio or require the overview and detail levels to reuse the
same crop.

1. `overview image`: a small, recognition-oriented image paired with category and a one-sentence introduction. Its final aspect ratio, crop, focal-point rule, and whether it needs a dedicated derivative remain open until the calibration batch is reviewed on desktop and mobile.
2. `detail image`: a larger image for place inspection and atmosphere. It may reuse the source asset or use a distinct derivative, but its final aspect ratio, crop, focal-point rule, and height remain open until the same calibration evidence is accepted.
3. `authenticity badge`: always names the representation before the user interprets it.
4. `truth note` and `image-information disclosure`: distinguish exact place, surrounding area, generated reconstruction, and generic category imagery while keeping author, source page, license link, and disclosed source conversion reachable without competing with place content.

The first pilot used a `1600 x 900` WebP derivative and tested wide overview
presentation. That is a derivative-processing and evidence baseline for the pilot,
not a global UI rule. A future batch may produce separate overview/detail derivatives
or use a different crop when the source composition requires it.

Image failure returns to the same category fallback without shifting the sheet hierarchy or hiding place actions.

## Authenticity Grades

| Grade | Kind | User meaning | Admission rule |
| --- | --- | --- | --- |
| `A` | `exact_photo` | the image directly shows this place | location identity is supported by the source page and visual review |
| `B` | `area_atmosphere` | real nearby district or area, not the exact facade | the UI must say that it is an area view |
| `C` | `generated_reconstruction` | synthetic reconstruction | provider/model/prompt evidence is required and the UI must say it is generated |
| `D` | `category_fallback` | category-only visual | no claim about real appearance; used for missing, fictional, and player places |

Grades are evidence labels, not quality scores. A clear `B` is preferable to a falsely precise `A`.

## Source Rules

Use this order:

1. a reusable exact-place photograph with a durable source page and explicit license;
2. a reusable real area photograph, clearly downgraded to `area_atmosphere`;
3. a separately reviewed generated reconstruction with durable generation provenance;
4. a reviewed project-owned category fallback asset with copy that clearly says it does not represent the place's real appearance.

Accepted photo evidence must provide an explicit reuse license, author/creator, source page, access date, and unmodified-source hash. Current pilot discovery uses Wikimedia Commons file pages because each selected file exposes reusable-license metadata and attribution.

Reject:

- map-service or street-view screenshots;
- news, social-media, review-site, or influencer images;
- corporate press/marketing images without explicit reusable terms;
- search-result thumbnails without a durable source page;
- images whose depicted location cannot be matched to the intended place or area;
- files with unclear architecture, privacy, trademark, or other reuse restrictions.

## Candidate To Runtime Flow

1. Discover a candidate and record the source page before download.
2. Download the untouched candidate into `output/imagegen/<batch>/source-candidates/`. This directory is local and Git-ignored; runtime code must never reference it.
3. Record source bytes and SHA-256, author, license, source page, access date, and intended truth grade.
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

The first pilot approves seven real-photo derivatives and one explicit fictional category fallback. No generated reconstruction was needed in that batch. Every remaining Seoul place uses the approved CC0 Seoul category visual until a later record passes the same source and review gates; fictional/player places use the relevant project-owned map/category fallback. These assets fill the required image slot but never count as evidence of real appearance.

The fixed built-in target is 113 place-specific decisions: 106 Seoul places and seven fictional places. Current place-specific completion is seven Seoul derivatives, leaving 99 licensed real-photo searches and seven generated fictional reconstructions. The inventory classifies 79 Seoul places as exact-photo preferred and 27 as area-atmosphere preferred, while preserving downgrade or upgrade decisions through review evidence rather than category alone.
