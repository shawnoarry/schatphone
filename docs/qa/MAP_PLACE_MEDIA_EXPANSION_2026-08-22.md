# Map Place Media Expansion 2026-08-22

Date: 2026-08-22

Status: `10_DERIVATIVES_PUBLISHED / 4_EXACT_HEROES / 6_DETAIL_ONLY_AREA_SLIDES / HERO_DETAIL_BOUNDARY_SUPERSEDED`

## Scope And Result

This batch published ten reviewed derivatives from the 2026-08-21 Wikimedia Commons
source archive. The current media contract admits the four exact-place records as card
heroes and confines the six area-atmosphere records to Place Details. Each original was matched to the Commons SHA-1,
then EXIF-transposed, converted to sRGB, focal-cropped to `16:9`, and encoded as a
`1600 x 900` WebP without a generative edit. The ten public runtime objects were
uploaded to the project image bed and read back byte-for-byte with matching SHA-256.

No map-service screenshot, news/social image, or unclear corporate media is used.
The local originals remain Git-ignored source evidence; runtime code references only
the reviewed derivatives registered in `config/project-assets.json`.

## Review Decisions

| Place ID | Truth | Review reason |
| --- | --- | --- |
| `seoul-gimpo-airport` | exact photo | source-identified airport check-in hall |
| `seoul-gangnam-station` | area atmosphere | detail-only station-area context; card uses category fallback |
| `seoul-express-bus-terminal` | area atmosphere | terminal frontage and coach; avoids overstating a complete facade |
| `seoul-yongsan-station` | exact photo | station exterior and name sign remain visible |
| `seoul-63-square` | exact photo | 63 Building remains the clear recognition subject |
| `seoul-national-museum` | area atmosphere | detail-only museum-area context; card uses category fallback |
| `seoul-times-square` | area atmosphere | detail-only interior context; card uses category fallback |
| `seoul-lotte-department-main` | area atmosphere | detail-only Euljiro/Lotte district view, not a precise storefront claim |
| `seoul-hyundai-apgujeong-main` | area atmosphere | detail-only source-identified Mealtop cafe, not the store facade |
| `seoul-olympic-park` | exact photo | source-identified park landscape |

## Source And Runtime Audit

| Place | Creator | License | Source SHA-256 | Runtime SHA-256 |
| --- | --- | --- | --- | --- |
| Gimpo International Airport | Brit in Seoul | CC BY-SA 4.0 | `29620a0b84da09bbb1bdb7326fb224d567db04b69c32bcb0ed05169da3dfed41` | `efb9abe6ceffc9c7e5be26b2f00f9b2792bff399500ab33e23789791c23f9110` |
| Gangnam Station | 주행거리계 | CC BY-SA 3.0 | `0be5606c6116f5aa969b37bf5e6e923f2cdf5828c52df154822402775f10d728` | `6b8487d656929b3d78048b375b330abe53fd4b8f047e6284b32bdbeff2ded9c7` |
| Seoul Express Bus Terminal | Sharon Hahn Darlin | CC BY 2.0 | `ce189df75ec97763bf4ef331eea5585d4aeb17fe6278ee0bd106169da7476355` | `40b7dc465c3f0c6e10c1f046ee0ae539ff1bd86a3e35330e2606988af55c7b45` |
| Yongsan Station | Tildin Han | CC BY-SA 4.0 | `6992f7e55b476088a5496a31a472ac4198a2dbfeef1b55ac2b4de1891e867b5b` | `a32d7e8cfafc1af91600cde07f7c3cac7317604a6baf5b077c4683875b7a23a3` |
| 63 Square | Sebastian Hoering | CC BY-SA 4.0 | `e000335d91aa1807dd34be8e4858e787a6af1187d04ec3b71ea9f4f07c541dbd` | `1435b4cfe74af15b1548a938587d94eceb63fe563eed30bf4fb76f3880dd0625` |
| National Museum of Korea | Jinah78 | CC BY-SA 3.0 | `e6c5aeef5e4758a3dfdb0540bb2f2ac240760c65b35fb271721519c01253df61` | `31c1673aec68721bd32960363eff0517266de6520f46154cb9c3cc14516f2450` |
| Times Square Seoul | Kth696586 | CC BY-SA 3.0 | `fa3d99aafd66d604cdd40b018a95a91de966415403de228591e25b0ab5953008` | `84bce3293d8ca1c6303be149fbd3166a158dbc217564d8846b9bbc295dd345a0` |
| Lotte Department Store Main | Seoul Institute | CC BY 4.0 | `e27c018deada56182cd910668e6ca8b006ca704699bffad6058a7fe896ea3754` | `67be6208a9404f8f5406a95b1fba742c8f54ce5e2692fb1e8c74d2a9577853da` |
| Hyundai Department Store Apgujeong Main | Wvdeuxvw | CC BY-SA 4.0 | `bb91164ea21d5e4f24b655c3e1209611fcf40a90e9fe3750c7fc571acd2a8996` | `77321cba43fc0aaa9406a434a4972aed4a718147eb5feec55882203ee8ed4e5c` |
| Olympic Park Seoul | nagyman | CC BY-SA 2.0 | `aaac4e0abc01acc7cb498b1cf850bf06e0fe87052c1acc2dbbb7c7ab0e2ecf63` | `8fcb8854f6d10dade8b855b77662051276dd53f109a449e150cf1e60a9fe42c7` |

The machine-readable source pages, bilingual alt text, license links, source hashes,
and runtime hashes live in `src/lib/map-place-media.js`. The Git-ignored derivative
audit is `output/imagegen/map-place-media-search-20260821/reviewed-runtime-10-manifest.json`.

This batch no longer implies that every derivative is a hero. Four exact photos satisfy
card identity; six area photos supplement Place Details only. Additional reviewed slides
are handled by `docs/qa/MAP_PLACE_MEDIA_GALLERY_EXPANSION_2026-08-22.md`.

## Validation

- project image-bed readback: 10/10 objects, exact byte length and SHA-256;
- asset registry check: 897 tracked objects, 0 violations;
- Map media unit coverage: 8/8 tests;
- full Vitest: 303 files / 2173 tests;
- desktop Chromium and simulated mobile Map media E2E: 2/2;
- full ESLint, production build, and governance 14/14 pass;
- direct screenshot review confirms exact images render in the pin-anchored card while
  area images appear only after opening Place Details, without horizontal overflow.
