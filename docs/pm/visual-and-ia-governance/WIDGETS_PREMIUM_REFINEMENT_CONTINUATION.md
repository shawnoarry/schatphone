# Widgets Premium Refinement Continuation

Updated: 2026-08-16

Purpose: preserve the visual decisions and the next production sequence for the next Widgets refinement session. This is a focused continuation note, not a project roadmap, package status document, or claim that the current candidates are release-ready.

## 1. Decision From This Round

The next Widgets round must prioritize completion quality over catalog breadth.

- Work on one primary widget at a time. Keep at most two later widgets queued for comparison, but do not implement them in parallel.
- A refined animated widget may require a small generated asset package: state backgrounds, foreground and background layers, masks, highlights, textures, or a short loop. Do not force every design into one flattened image.
- Generated bitmap assets carry glass, ceramic, paper, metal, landscape, light, and other material detail.
- Vue owns live text, user media, controls, accessibility, and state presentation.
- CSS or GSAP owns restrained transitions and transform-based motion. Motion is not the visual foundation.
- Pinia and Router own real behavior. Visual code must not invent a second interaction model.
- Each widget has one primary purpose. Replaceable photos may be decorative and do not imply that the whole widget opens Gallery.
- Widget Center and Home must use the same renderer and the same registered Home slot size. Concept-sheet proportions are never authoritative.

The current broad built-in set is a functional exploration baseline. It is not the visual acceptance target, and generated candidates must not be integrated merely because they already exist.

## 2. Current Production Status

### Weather Terrarium (`2x2`)

Status: `REAL_DATA_LOOP_IMPLEMENTED / WEATHER_STATE_VISUAL_ACCEPTANCE_PENDING`

- The user explicitly accepted the core Weather Terrarium visual direction on 2026-08-15 as attractive. That acceptance covers the generated irregular terrarium form and material direction; the later four-state weather adaptation still needs final visual review.
- The shared built-in widget renderer uses one slot-authoritative composition in Widget Center and Home. Clear weather keeps the original generated landscape, cloud planes, glass shell, alpha droplet layer, aura, and glint; cloudy, rain, and night use dedicated generated scene assets and suppress the clear-state glass/cloud shell so they do not read as one object with a different filter.
- The irregular terrarium silhouette deliberately overflows the transparent card root while the authoritative Home slot remains `2x2`; the runtime is not a flattened rectangular poster.
- Vue keeps location, temperature, condition, and the three-hour forecast as live text. Generated artwork contains no baked UI copy or controls.
- The renderer supports `clear`, `cloudy`, `rain`, and `night` through four separate scene compositions: sunlit glass ecology, thick-cloud valley, open rain pool, and moonlit bioluminescent mountain. Each state also owns its scene drift, atmosphere mask, lighting, and data-panel treatment while preserving the same live-data contract and `2x2` slot.
- The normalized input contract is `weatherState`, `condition`, `weatherIsNight`, `temperature`, and up to three `weatherForecast` items. A valid explicit state wins; otherwise rain terms resolve before cloudy terms, then night text or `weatherIsNight`, with `clear` as the fallback. Chinese and English weather terms are covered.
- Weather now uses a provider-neutral normalized contract backed by Open-Meteo in the first implementation. Exact WMO conditions remain available to the Weather page, while Terrarium maps them into `clear`, `cloudy`, `rain`, and `night` visual states.
- Saved real cities, widget tap behavior, and the weather mapping persist under `settings.weather` and therefore follow the existing system backup. Existing active-city state migrates into the global mapping. Forecasts use the separate bounded `schatphone:weather:cache` carrier, refresh after 30 minutes, and remain rebuildable and excluded from backup.
- The mapping contract separates one world-facing display location from one real-city weather source. It supports one global default plus per-world overrides keyed by the canonical WorldBook world ID; World Pack IDs are not world identity and must not be used as mapping scope keys.
- `/weather` is a real weather surface with its own page Hero, current conditions, hourly forecast, seven-day forecast, weather details, loading/error/stale/offline handling, provider attribution, and Weather Mapping settings. App Store exposes a separate optional `1x1` Weather app entry that is not part of the default Home layout; installing it opens `/weather`. Weather widgets remain independent displays/actions and never replace the Weather page Hero. V1 intentionally does not request automatic device geolocation.
- Home and Widget Center consume the same active forecast and mapped display name. Relative `Now / +1h / +2h` labels avoid implying that a fictional or renamed display location shares the source city's clock. The Home Terrarium falls back to the reactive system clock only before a real forecast is available.
- Chat consumes a dynamic, privacy-safe weather projection. By default it receives only the mapped display name and normalized condition summary; source city, coordinates, and timezone stay private. An explicit Weather setting can allow source-city disclosure.
- The Weather widget action is SchatPhone-owned metadata with three choices: open Weather, expand the in-place forecast, or no tap action. The default is open Weather; choosing no action preserves the component as a decorative/live display.
- Ambient motion is state-specific: clear uses cloud rings, sun pulse, droplets, and glint; cloudy uses slow valley drift and fog; rain uses a shorter scene breath, diagonal rainfall, mist, and occasional lightning; night uses slow mountain drift, a softened crescent, stars, and fireflies. Pointer input adds bounded tilt/parallax, and click expands or collapses the hourly forecast without changing the slot geometry.
- `prefers-reduced-motion: reduce` disables all Terrarium animation while preserving the static artwork and expanded-detail state.
- The accepted runtime layers are registered image-bed assets under `widgets/weather-terrarium/`. The original clear layers and corrected `weather-terrarium-atmosphere-alpha-v3.webp` use the UI-asset resolver; the dedicated cloudy, rain, and night scene files use `projectAssetUrl` because their published keys do not include the `images/ui-assets/` prefix. Source PNGs remain protected under `output/imagegen/widgets-weather-terrarium-v2/`.
- Mobile browser review at `390x844` passed for the Widget Center `142x142` preview and the actual Home `171x168` slot. All five image nodes decoded at `1024x1024`, both widget and tile overflow remained visible, and document horizontal overflow was `0`.
- A four-state mobile comparison at `390x844` confirmed that all Home samples remained `171x168`, effects stayed clipped to the irregular terrarium interior, and document horizontal overflow remained `0`.
- Focused behavior coverage verifies the layered asset paths, `aria-expanded`, and the hourly-detail transition. Static rest/detail screenshots, a Widget Center screenshot, and a 17-frame motion capture show no rectangular atmosphere residue after the alpha correction.
- Weather-state validation passed on 2026-08-15: the two focused Vitest files at 36/36 tests; lint; Widgets release Playwright at 8/8 across desktop and simulated mobile with one worker; the default/zen visual gate at 12/12; production build with 433 modules; asset-registry check with 857 assets and zero violations; governance at 14/14; `git diff --check`; and the mobile geometry/overflow review described above.
- Real-data focused coverage now verifies provider normalization, cache freshness, legacy active-city migration, global/per-world mapping, private Chat projection, Weather route content, city management, Home route behavior, and Widget Center action configuration. `e2e/weather-widget-flow.spec.js` passes desktop Chromium and simulated Pixel 5 with deterministic provider responses, a `首尔` display mapped to Shanghai weather, rain-state synchronization, Home expansion, source-name privacy, and horizontal-overflow checks.
- A live mobile browser review at `393x852` also fetched real Tokyo and Shanghai forecasts. It confirmed city search, Tokyo-to-Shanghai switching, night-to-rain Terrarium changes, full-width city-sheet controls, zero document horizontal overflow, and the corrected header safe area that keeps Back, city, and Refresh outside the global status-bar hit layer.
- On 2026-08-16 the focused Weather Playwright flow added an explicit `prefers-reduced-motion` check covering the Terrarium stage, aura, cloud layers, atmosphere, rainfall, mist, stars, moon, and glint. A consolidated local acceptance board now places the clear/cloudy/rain/night comparison beside Widget Center, collapsed Home, and expanded Home evidence; this prepares review material but does not record user acceptance.
- The 2026-08-16 state-separation pass removed the residual clear-state glass ring from cloudy, rain, and night, introduced distinct scene animation names, refined the night crescent, and allowed long condition labels to use two lines. Deterministic simulated Pixel 5 captures are written to `artifacts/weather-terrarium-states/` when `WEATHER_CAPTURE_DIR` is supplied; artifacts remain local QA output and are not submission scope.
- Final local verification for this pass completed on 2026-08-16: Weather Playwright passed 12/12 and Widgets release Playwright passed 8/8 across desktop Chromium and simulated Pixel 5; full Vitest passed 287/287 files and 2037/2037 tests; lint passed; the production build completed with 467 modules; asset registry validation reported 863 assets and zero violations; governance passed 14/14; and `git diff --check` passed. The full Vitest run still prints jsdom's expected MapLibre canvas-not-implemented diagnostics, but exits successfully with no failed tests.
- The 2026-08-16 release check passed focused Widgets/Weather/Chat/Home Vitest at 102/102, Widgets plus Weather Playwright at 10/10 with one worker across desktop and simulated mobile, the visual gate at 12/12, lint, a 447-module production build, governance at 14/14, and `git diff --check`. Full Vitest remains outside a clean pass at 273/276 files and 1994/1999 tests because concurrent persistence work has two stale 17-target assertions and a `push` module mock that omits `normalizePushServerUrl`; the inventory timeout seen only in the full-load run passes in the focused three-file rerun. These failures are unrelated to Widgets and must not be repaired inside this refinement slice.
- The 2026-08-16 real-city search correction accepts simplified, traditional, or English input instead of exposing Open-Meteo's inconsistent Chinese lookup behavior. Character-level OpenCC dictionaries generate provider queries and normalize `zh-CN` labels, so `温哥华` finds a provider result exposed only as `溫哥華`, existing traditional saved records remain searchable offline, and duplicate provider identities collapse without hiding distinct Vancouver-area locations. The focused Weather/Widgets/Chat suite passes 43/43, the Weather Playwright flow passes 2/2 across desktop and simulated Pixel 5, live mobile browser search displays simplified results, lint/build/governance/diff checks pass, and both production/full npm audits report zero vulnerabilities. Full Vitest reaches 275/277 files and 2002/2004 tests; its persistence and mojibake failures are load-only five-second timeouts that pass alone at 27/27 and 1/1.

The core Weather Terrarium direction is accepted, but its four weather states are not yet visually accepted by the user. Do not start Color Diary or broaden the built-in catalog until that state review is recorded.

## 3. Production Order

### 1. Weather Terrarium (`2x2`)

Use Weather Terrarium as the quality benchmark for the entire collection.

Required visual package:

- a slot-specific irregular base silhouette rather than a rectangular background;
- separable base, glass, cloud, atmosphere, and highlight layers where motion benefits from depth;
- a clean live-data area for location, temperature, and weather condition;
- no baked UI text or fake controls.

Required behavior:

- ambient layer motion that remains convincing when paused;
- bounded pointer tilt/parallax on precise-pointer devices;
- click-to-expand hourly detail without layout movement;
- reduced-motion fallback;
- identical composition in Widget Center preview and Home.

Do not begin the next widget until the `2x2` Home result has passed a real mobile screenshot review.

### 2. Color Diary (`4x2`)

Treat this as a paper-led visual widget with one selected purpose. The current preferred direction is a compact music-memory surface, but the exact purpose should be reconfirmed after Weather Prism is accepted.

Required visual package:

- paper cover and page texture;
- separate album/photo well rather than a baked image;
- small movable paper details only when they improve depth;
- enough quiet space for live title, artist, progress, and controls.

Required behavior:

- real player state when the music purpose is retained;
- one restrained page, tab, or paper response instead of several competing animations;
- replaceable media remains independent from the widget's primary action.

### 3. Aurora Waveform (`4x1`)

Build this only after the first two components establish the material and interaction standard.

Required visual package:

- a wide background created or cropped specifically for the registered `4x1` slot;
- separate spectrum, mineral, or light layers where useful;
- no stretching of the current non-standard candidate.

Required behavior:

- real playback control and progress;
- a lightweight looping waveform or light response;
- stable text and control geometry while animation is active.

## 4. One-Widget Completion Gate

A widget is complete only when all items below pass together:

1. Its primary purpose and primary action are unambiguous.
2. Its generated asset package is designed for the authoritative slot ratio.
3. Widget Center and Home render the same visual hierarchy.
4. Default, active, loading or unavailable, and reduced-motion states are intentional.
5. Live text, controls, and user media remain HTML/Vue layers rather than baked artwork.
6. Motion uses opacity and transforms where possible and does not cause layout movement.
7. Long bilingual text, compact preview, and mobile Home do not clip or overflow.
8. The component is reviewed at a phone viewport with static and active-state screenshots.
9. Focused tests, lint, build, and relevant visual/E2E checks pass.
10. User visual acceptance is recorded before the next primary widget begins.

## 5. Archived Candidate Materials

The following candidates were uploaded on 2026-08-12 so the next session can inspect them without relying on this workstation. They are references and possible material bases, not accepted runtime assets.

Public image-bed prefix:

`https://cloudflare-imgbed-7z3.pages.dev/file/schatphone-assets/images/ui-assets/widgets/candidates/`

| Candidate | Continuation use |
| --- | --- |
| `weather-prism-sun-v2.webp` | Preferred sunny Weather Prism reference |
| `weather-prism-rain.webp` | Rainy Weather Prism reference |
| `color-diary-paper.webp` | Paper material and layout reference |
| `aurora-wave-surface.webp` | Aurora material reference; ratio must be rebuilt or cropped deliberately |
| `mood-window-ceramic.webp` | Ceramic aperture reference |
| `commute-rail-paper.webp` | Paper rail reference; ratio is non-authoritative |
| `enamel-focus-dial.webp` | Enamel control reference |
| `orbit-calendar.webp` | Calendar center and orbit reference |
| `ambient-scene-day.webp` | Day-state landscape reference |
| `ambient-scene-night.webp` | Night-state landscape reference |
| `memory-wall-paper.webp` | Replaceable photo-well composition reference |
| `world-pulse-city.webp` | Portrait city-surface reference |

`weather-prism-sun.webp` was rejected because it reads as an isolated object in a display case. It was not uploaded as part of this accepted continuation batch.

## 6. Resume Checklist

1. Inspect `git status` and preserve unrelated parallel changes before continuing.
2. Present the `390x844` four-state Home comparison together with the existing Widget Center, collapsed Home, expanded Home, and motion evidence for user visual review.
3. If a state needs adjustment, keep the next edit limited to weather-specific lighting, interior atmosphere, contrast, alpha edge, or motion tuning.
4. Record explicit four-state acceptance before changing Weather Terrarium's status or beginning Color Diary.
5. Run named physical-device checks for browser chrome, touch targets, offline recovery, and safe-area behavior before release acceptance.
6. After Weather Terrarium acceptance, reconfirm Color Diary's primary purpose and prepare its slot-specific asset package before implementation.

## 7. Deferred TODO

- Do not expand the built-in catalog during this refinement sequence.
- Do not integrate all archived candidates in one pass.
- Reassess simple existing widgets only after the three primary components establish a repeatable quality bar.
- Do not couple the renderer directly to one external weather provider; normalize provider output at the data boundary.
- Do not add automatic geolocation without an explicit privacy and permission flow. City search remains the V1 source-selection path.
- Physical-device shell and return-boundary verification remains a prerequisite for release acceptance, but it is separate from producing the first refined component.
