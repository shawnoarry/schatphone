# Map Place Media Gallery Expansion 2026-08-22

Date: 2026-08-23

Status: `10_SECOND_SLIDES_PUBLISHED / 10_OF_10_RECENT_PLACES_HAVE_TWO_SLIDES / COMPLETE`

## Scope And Result

This continuation adds ten reviewed Place Details slides to the recent ten-place
batch. The source choices were already made by the user in the
2026-08-21 visual review and were not searched or approved again.

Two complete local originals were reused. Eight missing originals were replaced by
official Wikimedia Commons-generated renditions to avoid repeated large transfers
during throttling. Each rendition keeps the durable Commons file page, actual
rendition URL in the local audit, downloaded rendition SHA-256, upstream Commons file
SHA-1, creator, and license. Runtime never references the source archive or Commons
rendition directly.

Each admitted source was EXIF-transposed, converted to sRGB, cropped to `16:9`, and
encoded as a `1600 x 900` WebP without generative modification. The original
expansion batches and the final Hyundai batch published and read back all ten runtime
objects with matching byte lengths and SHA-256 values.

## Gallery Decisions

| Place | Candidate | Truth | Source artifact |
| --- | ---: | --- | --- |
| Gimpo International Airport | #01 | area atmosphere | verified local original |
| Gangnam Station | #03 | exact photo | verified local original |
| Seoul Express Bus Terminal | #03 | exact photo | official 1280px rendition |
| Yongsan Station | #06 | exact photo | official 1280px rendition |
| 63 Square | #02 | area atmosphere | official 960px rendition |
| National Museum of Korea | #03 | exact photo | official 960px rendition |
| Lotte Department Store Main | #02 | exact photo | official 960px rendition |
| Olympic Park Seoul | #06 | exact photo | official 960px rendition |
| Times Square Seoul | new candidate B | exact photo | official 1280px rendition, user approved |
| Hyundai Department Store Apgujeong Main | #06 | area atmosphere | official 960px rendition, user approved |

The active slide continues to own its own truth label, alt text, creator, source page,
license, and change disclosure. A second slide never inherits the hero label.

## Runtime Audit

| Place ID | Runtime SHA-256 |
| --- | --- |
| `seoul-gimpo-airport` | `6975838a68c5cb1d5855a24432abae90ab399b35eb51e926ed495ba995d616c9` |
| `seoul-gangnam-station` | `cc532ff323c6baff8bcd7305de8f2262baacbc717d8003819c53e7fde02938e9` |
| `seoul-express-bus-terminal` | `6ba2c44e0df9c22ba98ebdac2c02e7812b4cceb207cf521c8d20d5490fb5f446` |
| `seoul-yongsan-station` | `4d379c1ae24706367778409d1517f4953cd372701e895143442376ac7d84a056` |
| `seoul-63-square` | `380a480d266ebd70fc2ad695a12fd3164f4d397372768b2ced3b96135786341c` |
| `seoul-national-museum` | `31b9307e75098dd0b6243e4d6d52177a2c3a0a8376020ccc9075203df449576d` |
| `seoul-lotte-department-main` | `8e0124a405a0c1fc00042096c558f6986d97877e7bb2a601d579326e2927026f` |
| `seoul-olympic-park` | `cacb2ffdfe68ead7660c5bf03b6ee9cbe2caa0b70ab1e0cd434928aeb81f3e2d` |
| `seoul-times-square` | `dab075f1f2714f4ee20ad06c8177200876380fb02cf9df870e99b810c4ba5077` |
| `seoul-hyundai-apgujeong-main` | `edec3ff85eb870698fa01ae79550d157c7c63e9e0deb7e028a4e12628b7fd475` |

The Git-ignored machine-readable derivative audit is
`output/imagegen/map-place-media-search-20260821/reviewed-runtime-10-gallery-manifest.json`.
The final source-transfer audit is
`output/imagegen/map-place-media-search-20260821/carousel-secondary-source-audit-final.json`.

Times Square candidate B was approved by the user after reviewing the actual `16:9`
crop. The source file page identifies the Times Square Yeongdeungpo interior;
Narubaru7 publishes it under `CC BY 4.0`. Under the current hero/detail contract, the
approved Times Square exact image remains a detail slide until separately approved for
card use. Hyundai Apgujeong candidate #06 was transferred on 2026-08-23 through an
official Commons 960px rendition, published through batch
`map-place-media-hyundai-apgujeong-gallery-20260823`, and remains detail-only.

## Validation

- project image-bed publication and readback: 10/10 objects across three batches;
- focused Map media/component tests: 2 files / 21 tests;
- full Vitest: 303 files / 2175 tests;
- desktop Chromium and simulated mobile gallery E2E: 2/2;
- full ESLint, production build, governance 14/14, and `git diff --check`: pass;
- direct desktop/mobile screenshot review confirms the second slide, `2 / 2`
  counter, truth label, and attribution update without horizontal overflow.
