# Map Place Media Pilot

Date: 2026-08-15

Status: `7_REAL_DERIVATIVES_REMOTE_VERIFIED / 1_FICTIONAL_FALLBACK / RUNTIME_INTEGRATED_LOCAL / NO_GIT_COMMIT`

## Inventory Result

- `real-seoul-v1` contains 106 unique read-only places.
- The detail sheet previously had no media slot.
- The new resolver gives all 106 places and player places one stable `hero` presentation: a reviewed record or a `category_fallback`.
- The pilot adds seven reviewed real-photo derivatives and uses a category fallback for `waste-helix-spire`.
- No map-service screenshot, news image, social-media image, or unclear corporate media was admitted.

## Pilot Matrix

| Place | Grade | Presentation | Decision |
| --- | --- | --- | --- |
| Gyeongbokgung Palace | `A` | exact-place photo | Geunjeongjeon and its courtyard directly identify the palace |
| Seoul Station | `A` | exact-place photo | current station entrance and sign are visible |
| Seoul Forest | `A` | exact-place photo | walking path is explicitly identified as Seoul Forest |
| SM Entertainment HQ | `B` | area atmosphere | reusable headquarters facade was not established; Seongsu-dong streetscape is labeled as surrounding area |
| Starfield COEX Mall | `A` | exact-place photo | Starfield Library is inside the named mall |
| Myeongdong Kyoja Main Store | `B` | area atmosphere | no clearly reusable storefront photograph was admitted; Myeongdong streetscape is labeled as surrounding area |
| Sillim-dong Compact Housing District | `B` | area atmosphere | Sillim-dong road scene represents the district, not one exact residence |
| Helix Spire | `D` | category fallback | fictional place receives no false photographic claim |

No `C / generated_reconstruction` asset was required for this pilot. The schema and UI label are implemented for later separately reviewed use.

## Source Register

| Place | Source and creator | License | Source SHA-256 |
| --- | --- | --- | --- |
| Gyeongbokgung | [Commons file page](https://commons.wikimedia.org/wiki/File:Front_view_of_the_Imperial_Throne_Hall_Geunjeongjeon_at_Gyeongbokgung_Palace_with_blue_sky_in_Seoul.jpg), Basile Morin | CC BY-SA 4.0 | `e84a943cd3ca6a1f856beb116fd3f219efae1fb8d24268cfb150f07640daa623` |
| Seoul Station | [Commons file page](https://commons.wikimedia.org/wiki/File:The_entrance_of_Seoul_Station_on_April_17th_2016.jpg), 대경찰청 | CC BY-SA 3.0 | `1ce3a3fc350c45ff7d83839871c09bee715feda93242843f0a8605faf47184b2` |
| Seoul Forest | [Commons file page](https://commons.wikimedia.org/wiki/File:Seoul_Forest_Walk_Path.jpg), Qhairy | CC BY 4.0 | `88a2b32dc21d0761ebe205c334df29869172abc5a376d5e29cbcf342dbaa4fad` |
| SM HQ area | [Commons file page](https://commons.wikimedia.org/wiki/File:Seongsu-dong_storefronts.jpg), Jyrki Salmi | CC BY-SA 4.0 | `b5ea2b6b8b87b5b5ded33a024f27dc8401c3db6f5e21c7d43a95960442e2f143` |
| Starfield COEX Mall | [Commons file page](https://commons.wikimedia.org/wiki/File:Starfield_Library_COEX_20240218.jpg), Sean Young (@assanges) | CC BY 4.0 | `c45d900b22622dee9ae66f33bffed1ed3c2d185e445461d79bbddff14c45a13d` |
| Myeongdong area | [Commons file page](https://commons.wikimedia.org/wiki/File:Myeongdong_street.jpg), Izzatfikry99 | CC BY 4.0 | `a93b89147456a4ab1dc3da5cf9933205cc11f686f09c67858cd75ac7235505dc` |
| Sillim-dong area | [Commons file page](https://commons.wikimedia.org/wiki/File:%ED%98%B8%EC%95%94%EB%A1%9C(%EC%84%9C%EC%9A%B8).jpg), Kth696586 | CC BY-SA 4.0 | `318cced954ae2f2cc02bf4741ce61dc0d8ac9d5a69860b4532341dd04f9e7941` |

All sources were accessed on 2026-08-15. Every derivative discloses the crop and WebP conversion. Share-alike derivatives retain the source license in the runtime attribution strip.

## Archive And Derivative Boundary

Local source archive:

```text
output/imagegen/map-place-media-pilot-20260815/source-candidates/
```

Reviewed derivative workspace:

```text
output/imagegen/map-place-media-pilot-20260815/runtime/
```

Machine-readable local bytes and hashes:

```text
output/imagegen/map-place-media-pilot-20260815/local-integrity.json
```

The source archive is local and Git-ignored. It is not a runtime source. Seven reviewed derivatives were published under:

```text
schatphone-assets/images/ui-assets/apps/map/places/real-seoul-v1/
```

The `map-place-media-pilot-20260815` upload result verified all seven public objects by byte length and SHA-256 before `config/project-assets.json` was updated.

## Rejection Evidence

The first SM candidate, `File:Sm entertainment square as of July 7th.jpg`, was rejected after visual review because the pictured intersection was not established as the Seoul headquarters area. It was replaced before derivative publication. This rejection demonstrates that a matching search title is not sufficient identity evidence.

## Runtime Contract

- `src/lib/map-place-media.js` owns the schema, grade mapping, approved registry, validation, and category fallback.
- `MapView.vue` resolves media from the selected canonical place without mutating the place record.
- `MapPlaceFocusSheet.vue` renders the fixed hero slot, authenticity badge, truth note, attribution/license links, change disclosure, and load-error fallback.
- user and fictional places remain usable without photography.

## Validation Result

- focused media, place-sheet, pack, and Map-view coverage passes: 4 files / 59 tests;
- the bounded two-worker repository suite passes: 268 files / 1962 tests;
- targeted Map Playwright passes 2/2 on desktop Chromium and simulated Pixel 5, covering all seven real derivatives plus player-place fallback, source links, image loading, critical Axe checks, page errors, and zero horizontal overflow;
- direct screenshot review confirms that the desktop `92vh` / `760px` cap keeps the address, distance, and primary action in the initial sheet view while preserving the existing mobile composition;
- scoped ESLint over the media runtime, integration, and tests passes; the repository-wide lint command remains blocked only by pre-existing untracked `tmp/widgets-weather-prism-review/*.cjs` files that use CommonJS globals under the repository ESM lint configuration;
- production build, governance at 2 files / 14 tests, asset-registry validation at 855 tracked assets / 0 violations, and `git diff --check` pass.
