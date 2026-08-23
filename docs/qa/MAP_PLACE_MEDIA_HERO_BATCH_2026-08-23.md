# Map Place Media Exact-Hero Batch 2026-08-23

Date: 2026-08-23

Status: `10_EXACT_HEROES_PUBLISHED / RUNTIME_REGISTERED / SOURCE_ARCHIVE_LOCAL_ONLY`

## Scope And Selection

The user selected this batch through a local contact sheet that loaded only official
Wikimedia Commons thumbnails. Large renditions were transferred only after all choices
were visible and confirmed. Untouched renditions remain in the Git-ignored local source
archive; runtime uses separately reviewed derivatives only.

| Place | Selection | Creator | License |
| --- | --- | --- | --- |
| National Assembly of Korea | A | Korea.net / KOCIS (Jeon Han) | CC BY-SA 2.0 |
| COEX Convention Center | A | Christophe95 | CC BY-SA 4.0 |
| Lotte World | A | kallerna | CC BY-SA 4.0 |
| The Hyundai Seoul | A | kallerna | CC BY-SA 4.0 |
| Seoul National University Gwanak Campus | B | H. Y. Shin 000 | CC0 1.0 |
| Yonsei University Sinchon Campus | A | Striker9498 | CC BY-SA 3.0 |
| Korea University Seoul Campus | A | Ksiom | CC BY-SA 3.0 |
| Jamsil Sports Complex | B | Seoul Institute | CC BY 4.0 |
| Mokdong Sports Complex | A | WAKA77 | Public domain |
| Jangchung Arena | C | Wei-Te Wong | CC BY-SA 2.0 |

All ten records are grade `A / exact_photo` card heroes. Mokdong uses a direct view of
the complex's main stadium. The Jangchung source file is titled for its N Seoul Tower
view, but the image visibly centers the renovated arena and its Commons file page is
classified under `Jangchung Arena`; this additional identity evidence is required when
reviewing or revalidating that record.

## Derivative And Publication Audit

Each rendition was EXIF-transposed, converted to sRGB, visually reviewed, cropped to
`16:9`, and encoded as a `1600 x 900` WebP at quality 88 without generative editing.
Batch `map-place-media-heroes-10-20260823` published and read back all ten public
objects with matching byte lengths and SHA-256 values.

| Place ID | Runtime SHA-256 |
| --- | --- |
| `seoul-national-assembly` | `9a9d9aaa4ca6cafe50c2cb6f1a82b12ac8fa100f58a103eb46edf6efa13ae5d4` |
| `seoul-coex` | `553b6037fd6417b3ec8a6f08c2434bc3737f1bffbca8d80ff5776d4a38e9b419` |
| `seoul-lotte-world` | `27f0c1d77d6a27f8ae75aa3b0fa92e61dc6f58eb396db262f56a10e05dfde34d` |
| `seoul-the-hyundai-seoul` | `690249cc221579024d86c03629eed223dc541326a22f1bba122571bda71aeaca` |
| `seoul-national-university` | `bdc75e86f2301945148434337363176c191e42522139af231397d247f05a0bf5` |
| `seoul-yonsei-university` | `ee0b73d4cce9763169852e8226d792eda119f5dc82319fb7eabdebe4b0277a1b` |
| `seoul-korea-university` | `09cef08458b0df4d661a3c8158534117b17fff2eac2bb560d2f58d30d279e867` |
| `seoul-jamsil-sports-complex` | `ee34b6dd37c007829f41a7db8c6c12d0aff2bf0ed762f8b6c6dccea244259ed8` |
| `seoul-mokdong-sports-complex` | `8127dd5e0202b381235cc1dee32ae79c5d2a4a400615851b6e2f68bcfae6a4d9` |
| `seoul-jangchung-arena` | `d5ca0765b23c0b8383d89a742575af538355f0741d119cffe924dc97175ba2d0` |

The machine-readable local audit is
`output/imagegen/map-place-media-search-20260823/approved-selection-runtime-audit.json`.

## Validation

- image-bed publication and remote readback: 10/10;
- focused media registry test: 1 file / 9 tests;
- focused media registry plus card component tests: 2 files / 23 tests;
- `npm.cmd run assets:check`: 980 assets, 0 violations;
- `npm.cmd run governance:check`: 2 files / 14 tests passed;
- `git diff --check`: passed;
- `npm.cmd run lint`: blocked by the unrelated in-progress Mail/Home slice because
  `PRE_MAIL_DEFAULT_WIDGET_PAGES` in `src/stores/system.js` is currently unused;
- `npm.cmd run test`: 301 files / 2178 tests passed, with 9 unrelated Home layout
  assertions failing against the in-progress Mail/Home defaults and setup version;
- `npm.cmd run build`: blocked because `src/router/index.js` references the currently
  absent `src/views/MailView.vue`;
- `npm.cmd run test:e2e -- e2e/map-place-media.spec.js`: both desktop and mobile
  projects were unable to reach the map because the same missing `MailView.vue` import
  prevents Vite from serving the lock route; both timed out waiting for unlock UI.

The unrelated Mail/Home files were not created, edited, deleted, or reverted as part of
this media batch. Re-run lint, the full suite, build, and the route-level visual check
after that parallel slice restores a loadable application baseline.
