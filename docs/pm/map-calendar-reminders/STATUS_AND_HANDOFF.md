# Map Calendar Reminders Status And Handoff

Updated: 2026-07-31

This file is the handoff page for Map, Calendar, and Reminders work.

## 1. Current Status

Status: `PARTIAL_DONE`

## Immediate OpenFreeMap Migration Handoff

Status: `COMPLETE / READY_FOR_INTEGRATION_REVIEW`

Active queue = Map only. Other feature work = Not authorized / Not started.

OpenFreeMap + MapLibre now replaces the retired Kakao comparison as the real-world renderer:

1. `MapSceneCanvas` retains its existing prop/event contract and selects `OpenFreeMapCanvas` only for geographic packs;
2. fictional and imported canvas packs remain on `LocalMapCanvas` and make zero OpenFreeMap/MapLibre requests;
3. external style, network, or WebGL startup failure before the first ready state switches to the local fallback without mutating canonical places, pins, trips, coordinates, ETA, or world binding;
4. MapLibre JS and CSS load lazily with the geographic renderer; ready state follows the MapLibre `load` event;
5. focused unit coverage mocks MapLibre and proves ready state, canonical markers, marker selection, exact geo placement, prop updates, and fallback containment;
6. deterministic Map E2E proves real rendering, fictional/custom zero requests, offline fallback, active-trip coordinate editing, and parent return chains without depending on the public service;
7. the old Kakao components, configuration, and tests are removed; `/map/labs/kakao-compare` remains only as an inert compatibility redirect to `/map`;
8. the renderer decision and ownership boundary are synchronized across the active map package, PM mirror, roadmap, and local-map product decision.

Validation evidence from the isolated continuation worktree:

- lint passed;
- full unit suite passed: 197 files / 1318 tests;
- production build passed;
- focused Map Playwright passed under installed Chrome: 10/10 across desktop and Pixel 5;
- production audit reports 0 vulnerabilities;
- full audit reports 10 high findings only through the existing development-only ESLint / Vue Test Utils / js-beautify / glob / minimatch / brace-expansion paths; no force fix was applied;
- production MapLibre JS chunk is 974.03 kB (254.35 kB gzip) and CSS is 69.92 kB (10.04 kB gzip); fictional/custom E2E proves the JS module is not requested;
- separate real-network desktop and mobile Chrome captures show readable Seoul streets/buildings, useful neighborhood zoom, visible attribution, marker usability, no horizontal overflow, and no add-button/attribution overlap;
- sampled WebGL canvases are nonblank: desktop 15,300 nontransparent samples / 1,663 unique colors; mobile 13,104 / 1,517.

Acceptance criteria:

1. real-world Seoul opens as a normal MapLibre vector map with no registration or API key;
2. fictional/custom worlds retain their own local artwork and never display a real-world basemap;
3. existing user and built-in pins remain canonical SchatPhone records, with no provider place IDs;
4. pin selection and explicit coordinate creation/editing work during idle and active trips;
5. no device location, geocoding/POI lookup, routes, navigation, traffic, or provider billing is added;
6. OpenFreeMap/OpenMapTiles/OpenStreetMap attribution remains visible;
7. public-service startup failure before the first ready state falls back locally without losing place, trip, or world-binding state.

What is already landed:

1. Calendar and Reminders product split baseline is implemented;
2. Reminders owns cross-module cue queues and is reachable from Home;
3. Calendar leads with confirmed schedule/date meaning and push scheduling;
4. Calendar can create low-impact relationship facts only from confirmed events;
5. Map provides route, ETA, and route-context support without taking ownership of business records;
6. Map-derived Calendar follow-ups preserve `sourceTripId` when available, so Calendar can attach as supporting context to the originating shared-route memory;
7. Calendar can show active World Pack `reservation -> Calendar` context, currently `fandom_parallel` / `fandom_schedule_board`, as title/boundary UX without changing event, reminder, relationship-fact, or push ownership. Confirmed nonstandard `reservation_board` proposals now reach the same Calendar context path after App Store launch.
8. Map can show active World Pack `transit -> Map` context, currently `survival_city` / `survival_safe_route_pass`, as title/context/boundary UX without changing route, trip, location, ETA, shared-route fact, or Map-derived Calendar handoff ownership.
9. Roadmap 4.8 accepts a future shared Mini Scene Interface. Calendar and Map remain source owners and may later add separate request Adapters; no popup mode, profile binding, regex execution, artifact persistence, or presenter is implemented in this package.
10. The integrated Modern Seoul K-pop `2 + 6 + 1` catalog includes one independently selectable music-show-day prose rule. That rule remains Book/WorldBook content only: it is not executable Calendar configuration, a Mini Scene profile, a caller registration, or a trigger.
11. Map now has a runtime-local narrative-map baseline with two versioned built-in packs: real-world Seoul and a four-faction cyber wasteland. The same Map route supports pan/zoom, local place search, pack places, categorized player pins, consistent place details, and deterministic distance/ETA without device location, route planning, paid POI lookup, or commercial map runtime calls.
12. Real places retain geographic coordinates and fictional places retain normalized canvas coordinates. Existing text-only addresses remain valid and default to the Seoul pack; map switching is blocked during an active trip.
13. One active world now resolves to one map: `survival_city` recommends the cyber wasteland, current modern presets recommend Seoul, and Map Settings persists a per-world override without exposing a real/fantasy switch on the everyday Map surface.
14. Map Settings can import a local map image or explicitly keep a result from the shared Image Generation Module, create canvas-coordinate custom-pack metadata, bind it to the current world, and retain the source image through Gallery ownership. The main Map route separately owns search, place creation, point placement, details, and trips.
15. Map Settings now has a dedicated Places and Pins manager. Seed and player-created pins can edit label, category, description, and coordinates through explicit click-to-reselect; built-in pack places remain read-only, everyday place details do not drag markers, and pin placement remains usable during active trips.
16. Map Settings, Places and Pins, WorldBook pack settings, image-provider settings, and visual settings now use explicit parent return targets instead of forwarding the Map route's `from=home` query into every child.
17. The earlier Kakao spike is retired. OpenFreeMap + MapLibre is the validated real-world renderer, with canonical SchatPhone coordinates, lazy loading, visible attribution, deterministic tests, and a local-image fallback.

Still incomplete:

1. Reminders can still use stronger product clarity when a real objective/task cue family is promoted;
2. Full map-package manifest import/export, topology validation, georeferencing, calibrated scale tools, editable faction polygons, and seed-place authoring are not implemented; current import/generation accepts one image plus lightweight pack metadata;
3. route/date/follow-up handoff rules will need more real-world coverage as modules deepen;
4. Calendar and Map world-app presentation contexts need true-device testing together with WorldBook/App Store/Home entry flows;
5. Calendar's relationship adapter still knows concrete Chat/relationship stores and is a candidate for a deeper neutral interface.
6. the first planned Mini Scene source integration is a separately gated confirmed K-pop Calendar music-show-day Adapter; Map follows only through its own later slice.
7. the Calendar-owned carrier described below is a read-only design candidate. No field, migration, Adapter, or schema implementation is approved or landed.
8. Seoul V1 keeps its fixed CC0 city street-map image as the local fallback. Building-level georeferencing or a local PMTiles upgrade remains a separate slice and must preserve existing place IDs and coordinates.
9. additional real-city packs, true-device gesture/weak-network proof, and large-package/offline-cache validation remain separate and are not started.

### Read-Only Calendar Carrier Candidate

Status: `READ_ONLY_CANDIDATE / SEPARATE_APPROVAL_REQUIRED`

The smallest reviewed comparison candidate adds four optional flat Calendar fields: `eventType`, `scheduleRole`, `schedulePhase`, and `schedulePlaceLabel`. Existing and ordinary events remain valid with all four fields absent. A future music-show-day Adapter would fail closed unless the source event is confirmed, has a valid start time and relationship binding, uses the exact approved event type, has a non-empty schedule role, and provides at least one schedule phase or place label.

This candidate stores only Calendar-owned schedule facts. It does not copy encyclopedia material, complete member lists, coordinates, WorldBook prose, a structured Mini Scene profile, World Pack membership, sensitive-content choices, or facts owned by Map, Contacts, or Event Runtime. It must not infer eligibility from the event title.

The carrier could be reviewed independently from Mini Scene runtime because fields alone do not register a caller, resolve a world profile, create an artifact, or invoke a Presenter. Implementing the future Adapter still waits for the separately approved shared Module, Text Presenter, Settings, and persistence-policy stages. Map remains a different later Adapter and must not be combined into the Calendar slice.

## 2. Recommended Next Slice

Calendar relationship review and memory-lineage detail have reached the current 4.2 acceptance.

Current safe candidates:

1. user-test Calendar reservation and Map transit world context on a real phone as presentation only;
2. deepen the confirmed-event relationship adapter without changing Calendar, Chat, or relationship-runtime ownership;
3. keep Reminders as the only raw-cue inbox and add task/objective presentation only for a promoted cue family;
4. decide whether to approve, revise, or reject the read-only Calendar carrier candidate before any schema or migration work; keep Calendar and Map changes in separate owner slices.
5. after roadmap 4.8 shared foundation and persistence/presenter prerequisites are complete, add only one Calendar request Adapter for the confirmed music-show-day scene; do not combine Map or new schedule schema in that slice.
6. after the usable-product preview gates, consider one separately reviewed full map-package authoring/validation/export slice; keep provider-backed POI search and route planning outside that slice.

## 3. Do Not Do

1. Do not turn Calendar back into a generic cue dump.
2. Do not let Reminders write relationship facts directly from raw cues.
3. Do not let Map absorb order, ledger, or schedule ownership just because it can show route context.
4. Do not let World Pack reservation or transit labels turn Calendar/Map into world-rule/event owners.
5. Do not execute Mini Scene regex/rendering in Calendar or Map, and do not let scene failure or interaction bypass source-record validation.
6. Do not treat the read-only carrier candidate as approved implementation, and do not derive its fields from titles or K-pop prose.
7. Do not move WorldBook content, Mini Scene profiles, Pack state, sensitive choices, Map coordinates, Contacts identity, or Event Runtime provenance into Calendar-owned fields.
8. Do not replace a versioned topology asset in place after player pins exist; publish a new map-pack version and preserve or explicitly migrate coordinates.
9. Do not add a paid/live map SDK to provide visual atmosphere that a local map pack already owns.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
6. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when relationship-fact semantics changed
7. `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` when Calendar/Map Mini Scene request meaning changes
