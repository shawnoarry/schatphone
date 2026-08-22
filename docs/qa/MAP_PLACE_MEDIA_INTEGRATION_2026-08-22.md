# Map Place Media Integration 2026-08-22

Date: 2026-08-22

Status: `24_DERIVATIVES_READY / 6_HEROES / 18_DETAIL_GALLERY / 2_IDENTITY_REJECTIONS`

## Scope And Result

This batch resolves the 26 originals already downloaded from the user's 2026-08-21
screening before any of the remaining 53 selected candidates are downloaded.

- 24 source photographs pass identity, source-hash, crop, and license review.
- Six exact-place photographs become the recognition-oriented overview heroes.
- Eighteen additional photographs become detail-gallery slides. Each slide keeps its
  own `exact_photo` or `area_atmosphere` label and its own source attribution.
- Incheon Airport Terminal 1 #01 and #02 are excluded. They show the Terminal 1 AREX
  station platform/concourse rather than the named airport terminal.
- No source candidate is referenced directly by runtime code. Every admitted image is
  EXIF-transposed, center-cropped to `16:9`, converted to sRGB, and encoded as a
  `1600 x 900` WebP with no generative edit.

The runtime now keeps the overview and detail roles separate: `hero` remains the only
overview slot, while `detail_gallery` slides appear only after the user opens Place
Details. The detail image can be changed with previous/next buttons, keyboard arrow
keys, or a horizontal touch swipe. The truth label, alt text, source link, creator,
license, and change disclosure update with the active slide.

## Decision Matrix

| Place | Candidate | Final role | Truth label | Decision |
| --- | ---: | --- | --- | --- |
| Gwanghwamun Square | #08 | overview hero + first detail slide | exact place | night aerial remains recognizable at `16:9` |
| Gwanghwamun Square | #03 | detail gallery | surrounding area | broader pedestrian approach |
| Gwanghwamun Square | #04 | detail gallery | surrounding area | elevated square and civic context |
| Gwanghwamun Square | #05 | detail gallery | surrounding area | Sejong-daero building context |
| Seoul City Hall | #06 | overview hero + first detail slide | exact place | strongest old/new hall and plaza composition |
| Seoul City Hall | #01 | detail gallery | exact place | valid secondary full-building view |
| Seoul City Hall | #04 | detail gallery | surrounding area | close entrance context, kept under the user's area label |
| Seoul City Hall | #05 | detail gallery | surrounding area | landscaped plaza context |
| N Seoul Tower | #04 | overview hero + first detail slide | exact place | tower remains centered in the night panorama crop |
| N Seoul Tower | #02 | detail gallery | surrounding area | Namsan pavilion and tower context |
| N Seoul Tower | #03 | detail gallery | surrounding area | wider night-city context |
| N Seoul Tower | #05 | detail gallery | surrounding area | complex walkway rather than the tower exterior |
| N Seoul Tower | #06 | detail gallery | surrounding area | distant urban view |
| N Seoul Tower | #08 | detail gallery | surrounding area | sunset silhouette and Namsan context |
| Dongdaemun Design Plaza | #01 | overview hero + first detail slide | exact place | building form and street relationship are visible |
| Dongdaemun Design Plaza | #04 | detail gallery | surrounding area | close facade view |
| Dongdaemun Design Plaza | #05 | detail gallery | surrounding area | metal facade detail |
| Dongdaemun Design Plaza | #06 | detail gallery | surrounding area | night district context |
| Lotte World Tower | #01 | overview hero + first detail slide | exact place | complete tower silhouette across the river |
| Lotte World Tower | #02 | detail gallery | surrounding area | river and skyline context |
| Lotte World Tower | #04 | detail gallery | surrounding area | Lotte World complex context |
| Lotte World Tower | #05 | detail gallery | surrounding area | dusk complex context |
| Lotte World Tower | #07 | detail gallery | surrounding area | night residential skyline context |
| Incheon Airport Terminal 1 | #07 | overview hero + only detail slide | exact place | Terminal 1 departure hall is directly established |
| Incheon Airport Terminal 1 | #01 | rejected | none | AREX station platform, not the terminal |
| Incheon Airport Terminal 1 | #02 | rejected | none | AREX station concourse, not the terminal |

## License Review

All 26 local originals match the Wikimedia source SHA-1 recorded in the download
manifest. The 24 admitted sources have durable Commons file pages and explicit reuse
terms. The two non-standard cases were checked again against current Commons metadata:

- Gwanghwamun #08: Seoul Tourism Organization, `KOGL Type 1`, attribution required;
  the runtime license link uses the reachable HTTPS form of the KOGL Type 1 page.
- Incheon Terminal 1 #07: Arne Mueseler, `CC BY-SA 3.0 de`, attribution and share-alike
  required; no extra restriction is reported by Commons metadata.

CC0 slides retain a creator/source link even though attribution is not required. All
other slides expose their matching Creative Commons license link.

## Runtime Mapping

The six gallery sizes are:

| Place ID | Hero source | Detail slides |
| --- | ---: | ---: |
| `seoul-gwanghwamun` | #08 | 4 total |
| `seoul-city-hall` | #06 | 4 total |
| `seoul-n-tower` | #04 | 6 total |
| `seoul-ddp` | #01 | 4 total |
| `seoul-lotte-world-tower` | #01 | 5 total |
| `seoul-incheon-airport-t1` | #07 | 1 total |

`src/lib/map-place-media.js` is the machine-readable source and runtime hash register.
The Git-ignored derivative manifest is
`output/imagegen/map-place-media-integration-20260822/runtime-manifest.json`.

## Remaining Boundary

The 52 `pending_download` records and one `rate_limited` record remain untouched. They
are not required for these six places to render their accepted media. Downloading and
reviewing those 53 candidates is the next acquisition batch, not part of this
integration decision.
