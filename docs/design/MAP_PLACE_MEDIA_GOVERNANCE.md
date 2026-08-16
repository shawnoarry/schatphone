# Map Place Media Governance

Updated: 2026-08-15

## Purpose

Place media makes Map details visually recognizable without turning photography into place truth. Canonical place identity, name, address, coordinate, category, visibility, discovery, and Journey behavior remain in Map place records. Media is a separate reviewed projection keyed by `mapPackId + placeId`.

The current implementation is `src/lib/map-place-media.js`. The current pilot evidence is `docs/qa/MAP_PLACE_MEDIA_PILOT_2026-08-15.md`.

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

Every built-in or player place resolves one `hero` media presentation. An approved registry record wins; otherwise Map renders an explicit category fallback. Missing photography therefore never makes a place unusable and never fabricates photographic evidence.

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
| `asset` | approved public runtime URL, dimensions, MIME, alt text, and SHA-256; `null` for code-rendered fallback |
| `source` | source type, provider, author/generator, license, source page, access date, source SHA-256, and disclosed changes |
| `review` | status, date, reviewer, and source-archive batch |

The validator fails closed when identity, grade, runtime location, source page, attribution, license, hash, alt text, or review evidence is incomplete.

## Detail Slots

The place focus sheet owns four stable visual positions:

1. `hero frame`: fixed `16:9`; reviewed photo/reconstruction uses a `1600 x 900` WebP; category fallback is code-rendered.
2. `authenticity badge`: always names the representation before the user interprets it.
3. `truth note`: distinguishes exact place, surrounding area, generated reconstruction, and generic category imagery.
4. `attribution strip`: author, source page, license link, and disclosed crop/conversion change.

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
4. the code-rendered category fallback.

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
5. Produce a separate runtime derivative. The pilot performs EXIF transpose, a `16:9` crop, sRGB conversion, and WebP compression only.
6. Record derivative dimensions, bytes, SHA-256, and disclosed changes.
7. Publish only reviewed runtime derivatives to `schatphone-assets/` through a confirmed asset upload list. Source candidates stay out of runtime.
8. Add the verified public asset to the media registry and run schema, component, full catalog, and browser checks.
9. If a source or license is later disputed, remove the registry record first. The category fallback preserves the place and all Map behavior.

The source page and audit document are cross-machine evidence. A local absolute archive path is never the only provenance record.

## Ownership

Map owns selection, truth labeling, detail placement, alt text, and attribution presentation for place media. The project asset registry owns the verified runtime object reference. Gallery still owns user-retained media; Image Generation owns temporary generation candidates and provider provenance. A place photo cannot change a place coordinate, discovery state, visibility, Journey, event eligibility, or business record.

## Current Scope

The first pilot approves seven real-photo derivatives and one explicit fictional category fallback. No generated reconstruction was needed in this batch. The remaining Seoul catalog uses the category fallback until a later record passes the same source and review gates.
