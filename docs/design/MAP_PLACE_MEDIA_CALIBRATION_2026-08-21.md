# Map Place Media Calibration 2026-08-21

Status: `ADAPTATION_CANDIDATES_READY / PILOT_ASSETS_ONLY / NO_RUNTIME_MEDIA_CHANGE`

This round evaluates the seven reviewed Seoul derivatives and the explicit fictional
fallback against the intended two-level card roles:

- overview: small recognition image beside category and a one-sentence introduction;
- detail: larger image for place inspection and atmosphere.

The observations below are provisional visual guidance from the complete `1600 x 900`
pilot derivatives. Focal percentages are review estimates, not a frozen CSS contract.
The pilot source bytes and runtime hashes remain governed by
`config/project-assets.json` and `MAP_PLACE_MEDIA_PILOT_2026-08-15.md`.

## Candidate Batch

Every current pilot input has now been adapted into two non-runtime candidates:

- overview candidate: `1600 x 625` (`16:5`), using the provisional focal point;
- detail candidate: `1600 x 700` (`16:7`), using the same source and focal point.

The batch contains 16 WebP candidates for seven reviewed Seoul images plus the
fictional/category fallback. The source images are unchanged and no generative edit
was applied. The Git-ignored working files are available at:

```text
output/imagegen/map-place-media-calibration-20260821/candidates/
```

`manifest.json` records each candidate's source, focal point, crop rectangle, output
dimensions, bytes, and SHA-256. `candidate-contact-sheet.png` provides the side-by-side
overview/detail comparison. These files are adaptation evidence only and are not
runtime asset-registry entries.

## Catalog Search Batches

The next step is now a catalog-wide search for the other Seoul place pins. Search
results are kept separate from the pilot derivatives and are not accepted media yet.

| Batch | Coverage | Records | Local screening state | Working evidence |
| --- | --- | ---: | --- | --- |
| 2026-08-21-01 | Gwanghwamun Square, Seoul City Hall, N Seoul Tower, Dongdaemun Design Plaza, Lotte World Tower, Incheon Airport T1, Gimpo Airport, Gangnam Station, Seoul Express Bus Terminal, Yongsan Station | 80 | `thumbnail_screening_only`; a small subset has local contact-sheet thumbnails | `output/imagegen/map-place-media-search-20260821-batch-01/` |
| 2026-08-21-02 | National Assembly, 63 Square, Gocheok Sky Dome, National Museum of Korea, The Hyundai Seoul, Times Square Seoul, Lotte Department Store Main, Shinsegae Gangnam | 56 | `thumbnail_screening_only`; source pages and remote thumbnails only while Commons is rate-limited | `output/imagegen/map-place-media-search-20260821-batch-02/` |
| 2026-08-21-03 | KSPO Dome, Galleria Luxury Hall, Hyundai Department Store Apgujeong, Olympic Park | 23 | `thumbnail_screening_only`; source pages and remote thumbnails only | `output/imagegen/map-place-media-search-20260821-batch-03/` |

Every record includes a durable Commons file page, original URL, remote thumbnail URL,
dimensions, MIME, source SHA-1, author, license, and access metadata. The records are
candidate discovery evidence only: matching titles do not establish place identity,
and no candidate is allowed into `src/lib/map-place-media.js` or the asset registry.
The second batch initially deferred twelve queries after the Commons API returned
`429`. Batch 03 retried KSPO Dome, Galleria, Hyundai Apgujeong, and Olympic Park and
added 23 more provisional records. Lotte Avenuel currently has no Commons text-search
hit, Yeouido Hangang Park needs a metadata retry, and the remaining university/hotel
queries are still queued; none of those states is a negative media decision.

The working search archive is Git-ignored. Once the source host is available again,
the retry should restore thumbnails for visual review, then download untouched
originals only for candidates that pass identity, privacy, architecture, crop, and
license checks. Until that review is complete, all 159 records remain provisional and
the seven-place-specific Seoul completion count is unchanged.

For human screening, use the combined Chinese review board:

```text
output/imagegen/map-place-media-search-20260821/review-zh.html
```

It shows short Chinese place names and stable candidate numbers, supports place
filtering, and provides `保留` / `周边环境` / `不合适` / `不确定` buttons. `周边环境`
means the image shows the nearby district rather than the exact place or storefront. The
`生成我的筛选结果` action produces lines such as `光化门广场 #01 保留`, which can
be pasted back for the second-pass identity, license, and crop verification. The
board is review tooling only and does not write Map data or the runtime media
registry.

## User Selection And Source Pre-review

The first user screening pass is recorded under:

```text
output/imagegen/map-place-media-search-20260821/user-selection.json
output/imagegen/map-place-media-search-20260821/user-selection.md
```

It contains 79 provisional candidates: 22 marked as primary-image candidates and 57
marked as surrounding-area candidates. The metadata pre-review currently identifies
five facility mismatches that must not enter the exact-place image set: Incheon Airport
Terminal 1 #01 and #02 are AREX station views, National Museum of Korea #07 is the
National Folk Museum, and Modern Seoul #01 and #02 are Hyundai buildings unrelated to
the named mall. The complete pre-review record is in:

```text
output/imagegen/map-place-media-search-20260821/source-review.md
output/imagegen/map-place-media-search-20260821/source-review.json
```

These are still acquisition candidates, not runtime decisions. The next review stage
opens the source page and untouched original for the remaining candidates, confirms
visual identity and license terms, and only then creates one primary derivative plus
optional detail-gallery derivatives. Wikimedia's large-file response is currently
slow, so no runtime registry or canonical place record has changed.

## Calibration Matrix

| Place | Grade | Source composition | Overview guidance | Detail guidance | Current decision |
| --- | --- | --- | --- | --- | --- |
| Gyeongbokgung Palace | A | Centered palace facade with a broad courtyard and clear symmetry | Center focal, approximately `50% / 48%`; the building remains identifiable in a shallow crop | Center focal, approximately `50% / 50%`; retain courtyard context | One shared source is a good candidate |
| Seoul Station | A | Entrance and `Seoul Station` sign sit to the right of a diagonal glass facade | Favor the entrance/sign, approximately `62% / 44%`; default center risks weakening the identity cue | Slightly wider vertical context, approximately `58% / 50%` | Same source is usable; focal-position test required |
| Seoul Forest | A | Central tree-lined path with balanced foliage and people as scale cues | Center path, approximately `50% / 56%`; shallow crop remains readable | Center path, approximately `50% / 52%`; keep more canopy and depth | One shared source is a good candidate |
| SM Entertainment HQ area | B | Seongsu-dong storefront streetscape; no exact headquarters facade claim | Center streetscape, approximately `54% / 50%`; area label carries the truth boundary | Center streetscape, approximately `52% / 50%`; preserve surrounding-area context | One shared source is a good candidate |
| Starfield COEX Mall | A | Starfield Library interior with tall curved shelves and a high ceiling | Favor the shelf structure, approximately `56% / 50%`; avoid cropping into an unrecognizable ceiling-only view | Preserve more vertical architecture, approximately `53% / 56%` | Same source is usable; detail crop needs comparison |
| Myeongdong Kyoja Main Store area | B | Dense Myeongdong commercial street with signs and screens; no storefront claim | Center street corridor, approximately `53% / 45%`; retain enough signage density without over-reading one business | Center street context, approximately `50% / 50%` | One shared source is a good candidate |
| Sillim-dong Compact Housing District | B | Night road with Sillim direction sign and mixed low-rise storefronts | Favor the sign and road, approximately `58% / 34%`; center crop can remove the strongest district cue | Lower focal point, approximately `56% / 43%`; keep road depth and residential context | Same source is usable; focal-position test required |
| Helix Spire fallback | D | Project category visual, not photographic place evidence | No place focal point; category label must remain prominent | Reuse the fallback only until a separately reviewed reconstruction exists | Not place-specific media; no calibration completion credit |

## Findings

1. All seven reviewed derivatives are visually usable for at least one card level.
2. A shared source image is viable for this pilot; there is not yet evidence that every
   place needs separate overview and detail files.
3. Seoul Station, Starfield COEX Mall, and Sillim-dong should not rely on a universal
   center crop. Their strongest recognition cues sit away from the geometric center or
   need different vertical emphasis at the two levels.
4. Grade B images remain appropriate when their area label is visible. Their broader
   composition should not be tightened until the exact-place claim would still be
   false.
5. The fallback has no focal-point problem to solve. Its next decision is whether a
   category visual is sufficient or whether a reviewed fictional reconstruction is
   worth producing.

6. The first candidate pass does not reject any source yet. It makes the trade-offs
   visible: Starfield COEX becomes ceiling-heavy in a shallow crop, Seoul Station's
   entrance cue benefits from right-biased focus, and the B-grade area images remain
   broader by design. Those are review prompts, not automatic re-generation decisions.

## Next Gate

The next review step is to compare the 16 candidates and classify each input as
`keep`, `keep-as-area`, `defer`, or `re-source / re-generate`. Only after that
classification should the next implementation experiment apply accepted focal
positions to the existing card on desktop and Pixel 5. Do not add candidates to the
runtime registry before that review.

Do not count an asset as newly complete because it has a focal-point suggestion. The
existing inventory remains authoritative: seven place-specific Seoul derivatives are
complete, 99 Seoul acquisition decisions and seven fictional reconstructions remain.

## Evidence

- Source and runtime byte/hash verification: `config/project-assets.json`,
  batch `map-place-media-pilot-20260815`.
- Truth and license decisions: `docs/qa/MAP_PLACE_MEDIA_PILOT_2026-08-15.md`.
- Acquisition counts and adaptation fields:
  `docs/design/MAP_PLACE_MEDIA_INVENTORY.md`.
- Browser validation after the readability slice: `e2e/map-place-media.spec.js`,
  desktop Chromium and simulated Pixel 5, `2/2`.
