# Map Calendar Reminders Status And Handoff

Updated: 2026-07-30

This file is the handoff page for Map, Calendar, and Reminders work.

## 1. Current Status

Status: `PARTIAL_DONE`

## Immediate OpenFreeMap Migration Handoff

Status: `IN_PROGRESS_UNVALIDATED / CONTINUE_ON_ANOTHER_MACHINE`

The user selected OpenFreeMap + MapLibre to replace the Kakao comparison and to become the real-world map renderer. Do not treat the current worktree as finished or validated.

Partial edits already present:

1. `maplibre-gl@6.0.0` is installed in `package.json` and `package-lock.json`;
2. the previous Leaflet image renderer was moved to `src/components/map/LocalMapCanvas.vue`;
3. `src/components/map/MapSceneCanvas.vue` now selects OpenFreeMap for geographic packs and the local renderer for fictional/custom packs;
4. `src/components/map/OpenFreeMapCanvas.vue` exists with the public Liberty style, canonical geo pins, click-to-place coordinates, MapLibre controls, attribution, lazy JS import, and a local fallback event;
5. Kakao component/loader/comparison files and focused Kakao tests were removed, the old Kakao lab route redirects to `/map`, and Map Settings now identifies OpenFreeMap as the real-map basemap;
6. no lint, build, unit, E2E, bundle, audit, or final visual validation has been run after these partial edits;
7. `tests/map-settings-view.test.js`, `e2e/map-local-packs.spec.js`, and several active documents still contain stale Kakao or Leaflet-only expectations and must be updated before validation.

Continue in this order:

- [ ] Run focused lint/build once to expose component or MapLibre v6 API errors; fix without changing Map store shapes or canonical coordinates.
- [ ] Preserve the `MapSceneCanvas` prop/event contract (`mapPack`, `pins`, `pendingPosition`, `focusPosition`, `interactive`, `allowPinPlacement`, `place-pin`, `select-pin`) so Map and Places/ Pins callers remain unchanged.
- [ ] Confirm geographic packs use `data-renderer="openfreemap"`; fictional and imported canvas packs must never request OpenFreeMap and must remain on `LocalMapCanvas`.
- [ ] Confirm style/WebGL/network startup failure switches to `data-renderer="local-fallback"` and leaves all Map interactions available.
- [ ] Add focused unit coverage for MapLibre ready state, canonical marker rendering, marker selection, exact `{ kind: 'geo', lat, lng }` placement, prop updates, and fallback containment. Mock MapLibre rather than requiring WebGL in jsdom.
- [ ] Remove stale Kakao expectations from `tests/map-settings-view.test.js`; assert the OpenFreeMap source row and preserved Map return chain instead.
- [ ] Rewrite `e2e/map-local-packs.spec.js`: deterministically mock the external style for CI, verify the real renderer and pin placement, verify fictional-world zero OpenFreeMap requests, verify offline fallback, and retain active-trip coordinate editing plus all parent return chains.
- [ ] Keep one separate real-network visual check against `https://tiles.openfreemap.org/styles/liberty`; do not make the CI suite depend on public-service availability.
- [ ] Inspect desktop and Pixel 5 screenshots plus canvas pixels. Verify useful neighborhood zoom, readable Seoul streets/buildings, nonblank WebGL output, no control/search/card overlap, no horizontal overflow, and usable marker details.
- [ ] Measure the production MapLibre chunk and confirm it is lazy-loaded; fictional worlds should not download the MapLibre JS chunk until a geographic map is opened.
- [ ] Run `npm.cmd audit --omit=dev` and `npm.cmd audit` separately. The install command reported 10 high advisories; determine whether they are pre-existing development-only findings or introduced by the dependency, and do not use a force fix.
- [ ] Remove obsolete Kakao environment/configuration references and update `LOCAL_NARRATIVE_MAP_PACKS.md`, package README/boundary/workstreams, PM status, and roadmap to the final OpenFreeMap runtime decision.
- [ ] Run final gates: `npm.cmd run lint`, `npm.cmd run test`, `npm.cmd run build`, targeted/full `npm.cmd run test:e2e`, `npm.cmd run governance:check`, and `git diff --check`.

Acceptance criteria:

1. real-world Seoul opens as a normal MapLibre vector map with no registration or API key;
2. fictional/custom worlds retain their own local artwork and never display a real-world basemap;
3. existing user and built-in pins remain canonical SchatPhone records, with no provider place IDs;
4. pin selection and explicit coordinate creation/editing work during idle and active trips;
5. no device location, geocoding/POI lookup, routes, navigation, traffic, or provider billing is added;
6. OpenFreeMap/OpenMapTiles/OpenStreetMap attribution remains visible;
7. public-service failure falls back locally without losing place, trip, or world-binding state.

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
17. The earlier Kakao spike is being replaced by an OpenFreeMap + MapLibre real-world renderer with a local-image fallback. Implementation is currently partial and unvalidated; use the immediate handoff above.

Still incomplete:

1. Reminders can still use stronger product clarity when a real objective/task cue family is promoted;
2. Full map-package manifest import/export, topology validation, georeferencing, calibrated scale tools, editable faction polygons, and seed-place authoring are not implemented; current import/generation accepts one image plus lightweight pack metadata;
3. route/date/follow-up handoff rules will need more real-world coverage as modules deepen;
4. Calendar and Map world-app presentation contexts need true-device testing together with WorldBook/App Store/Home entry flows;
5. Calendar's relationship adapter still knows concrete Chat/relationship stores and is a candidate for a deeper neutral interface.
6. the first planned Mini Scene source integration is a separately gated confirmed K-pop Calendar music-show-day Adapter; Map follows only through its own later slice.
7. the Calendar-owned carrier described below is a read-only design candidate. No field, migration, Adapter, or schema implementation is approved or landed.
8. Seoul V1 uses a fixed CC0 city street-map image with city-scale coordinate calibration. Building-level georeferencing or a local PMTiles upgrade remains a separate slice and must preserve existing place IDs and coordinates.
9. the OpenFreeMap migration still needs deterministic tests, real-network visual proof, lazy-chunk measurement, audit review, and full validation before it can be called complete.

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
