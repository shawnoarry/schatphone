# Local Narrative Map Packs

Updated: 2026-07-30

Status: `WORLD_BOUND_AUTHORING_BASELINE_AND_KAKAO_SPIKE_IMPLEMENTED`

## Decision

Map is a simulation-first narrative surface, not a navigation product. Its default runtime uses versioned local map packs rather than a commercial map SDK.

The first two packs are:

1. `real-seoul-v1`: a fixed CC0 street-map asset representing real Seoul geography, with curated real places stored as geographic coordinates;
2. `cyber-wasteland-v1`: a fixed cyber-wasteland asset with four explicit factions and fictional places stored as normalized canvas coordinates.

Both packs share local place search, player pins, trip state, ETA, history, Map-to-Calendar handoff, and downstream `placeId` ownership.

## World Binding

One active world resolves to exactly one map pack. Map does not expose a real/fantasy pack switcher on its everyday surface.

- `survival_city` recommends `cyber-wasteland-v1`;
- the default world and current modern-world presets recommend `real-seoul-v1`;
- Map Settings may persist a per-world override without changing another world's binding;
- returning to the recommended map removes only that world's override;
- an active trip blocks map changes so coordinates and trip context cannot switch underneath the journey.

Map Settings owns map selection, import, generation, and presentation controls. The main Map route owns place search, pin placement, place details, and trips.

Place use and pin administration use separate levels of interaction:

- the everyday Map surface browses, searches, creates, inspects, and uses places without draggable markers;
- `Map Settings -> Places and pins` owns detailed player-pin editing, including category, label, address/description, explicit coordinate reselection, and deletion;
- built-in map-pack places are visible in the manager but remain read-only;
- coordinate changes require an explicit click-to-reselect mode, including while a trip is active. An active trip locks map-pack replacement, not map browsing or player-pin authoring.

## Custom Map Intake

Map Settings supports two player-facing ways to create a fictional canvas-coordinate pack:

1. import a local map image, name it, set an approximate world span, and optionally name up to eight factions;
2. request a top-down fictional city image through the shared Image Generation Module, explicitly keep the candidate, and bind it to the current world.

The retained image is a Gallery-owned `scenario` asset. Map owns the custom-pack metadata and Gallery asset reference, not provider credentials or generated-candidate storage. Each new custom pack receives its own identity and uses normalized canvas coordinates for later player pins.

This is intentionally a lightweight intake flow. It does not yet import or export a complete map-package manifest, georeference an image, validate topology, edit roads or faction polygons, or generate canonical POIs. Faction input currently supplies names and approximate label anchors; players add actual places from the Map surface.

## Coordinate Contract

```js
{ kind: 'geo', lat, lng }
{ kind: 'canvas', x, y }
```

Canvas coordinates are normalized to `0..1`. Downstream modules reference a canonical Map place rather than copying provider IDs or coordinates.

## Runtime Boundary

The baseline does not use:

- device location;
- route planning or navigation;
- live traffic;
- paid POI search;
- runtime Kakao, Google, Mapbox, or similar map calls.

Geographic distance uses local great-circle calculation. Fictional distance uses the pack scale. Text-only legacy places keep the previous deterministic fallback estimate.

## Versioning Rule

A topology asset becomes immutable once places or player pins reference it. Road, region, or faction-boundary changes require a new pack version. An upgrade must preserve existing place IDs and coordinates or provide an explicit migration.

Decorative AI refreshes may change mood, weather, or lighting only. They cannot replace canonical roads, terrain, faction boundaries, or place topology.

## Current Accuracy

Seoul V1 provides real city geography and true curated-place coordinates, but the fixed illustration is calibrated at city scale rather than building-level GIS precision. A future georeferenced PMTiles or equivalent local package is a separate upgrade and does not justify adding a live commercial provider.

## Kakao Visual Comparison Spike

Kakao Map is implemented only as a removable comparison experiment, not as the production map owner. The development-only `/map/labs/kakao-compare` route renders Seoul beside the existing local renderer and passes both renderers the same canonical SchatPhone pins. Map Settings exposes the entry only during development and only for a geographic map world.

The experiment requires one user-supplied Kakao JavaScript App Key in `VITE_KAKAO_MAP_APP_KEY` and registered localhost/deployment domains. The key stays in local environment configuration and is never committed or included in backup data. The SDK is loaded lazily with `autoload=false` only after the comparison route mounts; no optional Kakao services library is requested.

The preview keeps device location, route planning, traffic, Kakao POI search, and provider place IDs disabled. It reads canonical SchatPhone coordinates only to place overlay markers. Missing credentials or SDK failure stays inside the Kakao panel while the local control remains available, and removing the preview leaves saved places, trips, world bindings, and the local runtime unchanged.

Compare both renderers on:

1. street/building readability and useful label density at neighborhood scale;
2. first useful render, pan/zoom responsiveness, mobile gesture behavior, and layout stability;
3. JavaScript transferred, request count, data transferred during a fixed five-minute session, and behavior when the provider is unavailable;
4. attribution, domain/key setup, quota and billing conditions, privacy implications, and deployment restrictions;
5. whether the visual benefit is large enough to justify a permanent network dependency for modern worlds.

The local renderer remains the control. Kakao is not promoted unless the measured visual gain is material, the current quota and terms are documented at decision time, failure falls back cleanly, and provider identifiers never become canonical Map data. A local MapLibre plus segmented PMTiles upgrade remains the offline alternative; its cost is package size and authoring complexity rather than per-session provider requests, so a city overview and optional detailed district packages should be measured separately instead of preloading a whole high-zoom city.

## Next Separate Slice

A later full authoring slice may add a versioned package manifest, topology and coordinate validation, calibrated scale tools, editable faction regions and seed places, migration preview, and package export. A building-level Seoul package remains a separate georeferencing upgrade. Neither direction authorizes route planning, live POI, or Mini Scene work.
