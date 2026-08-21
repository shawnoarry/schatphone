# Map Place Media Calibration 2026-08-21

Status: `CALIBRATION_EVIDENCE / PILOT_ASSETS_ONLY / NO_RUNTIME_MEDIA_CHANGE`

This round evaluates the seven reviewed Seoul derivatives and the explicit fictional
fallback against the intended two-level card roles:

- overview: small recognition image beside category and a one-sentence introduction;
- detail: larger image for place inspection and atmosphere.

The observations below are provisional visual guidance from the complete `1600 x 900`
pilot derivatives. Focal percentages are review estimates, not a frozen CSS contract.
The pilot source bytes and runtime hashes remain governed by
`config/project-assets.json` and `MAP_PLACE_MEDIA_PILOT_2026-08-15.md`.

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

## Next Gate

The next implementation experiment should apply the provisional focal positions to
the existing card without changing the media registry schema, then compare overview
and detail screenshots on desktop and Pixel 5. Accept or revise the focal positions
before introducing a second derivative per place.

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
