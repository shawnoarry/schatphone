# Local Narrative Map Packs

Updated: 2026-07-31

Status: `WORLD_BOUND_BASELINE_AND_OPENFREEMAP_RUNTIME_COMPLETE`

## Decision

Map is a simulation-first narrative surface, not a navigation product. It uses versioned Map-owned packs and provider-neutral coordinates. Geographic packs use a keyless OpenFreeMap + MapLibre renderer; fictional/custom packs and geographic startup failure use the local renderer.

The first two packs are:

1. `real-seoul-v1`: a fixed CC0 street-map asset representing real Seoul geography, with curated real places stored as geographic coordinates;
2. `cyber-wasteland-v1`: a fixed cyber-wasteland asset with four explicit factions and fictional places stored as normalized canvas coordinates.

Both packs share local place search, player pins, trip state, ETA, history, Map-to-Calendar handoff, and downstream `placeId` ownership.

## Seoul Place Catalog

Seoul V1 includes 35 versioned read-only places. The catalog covers major entertainment agencies, broadcasters and media buildings, company headquarters, civic/cultural/event landmarks, and three named Cheongdam beauty-salon branches. The 2026-07-31 coordinate snapshot was checked against public organization addresses and OpenStreetMap/Nominatim geography.

These records are Map-owned content with stable IDs, bilingual address/search metadata, and provider-neutral geographic coordinates. They are not a live POI mirror, do not retain provider place IDs, and do not update silently when an organization moves. A future correction updates the reviewed catalog explicitly; topology changes still follow the separate map-pack versioning rule.

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
- Kakao, Google, Mapbox, or another keyed/commercial map SDK;
- provider POI, geocoding, route, traffic, navigation, or canonical place identifiers.

Geographic packs request the public OpenFreeMap Liberty style and its attributed OpenMapTiles/OpenStreetMap data only when a geographic map is opened. MapLibre is isolated in a lazy production chunk. Fictional and custom packs do not request OpenFreeMap or MapLibre. External style, tile, or WebGL startup failure switches to the local pack fallback without changing canonical places, pins, trips, ETA, coordinates, or world binding.

Geographic distance uses local great-circle calculation. Fictional distance uses the pack scale. Text-only legacy places keep the previous deterministic fallback estimate.

## Versioning Rule

A topology asset becomes immutable once places or player pins reference it. Road, region, or faction-boundary changes require a new pack version. An upgrade must preserve existing place IDs and coordinates or provide an explicit migration.

Decorative AI refreshes may change mood, weather, or lighting only. They cannot replace canonical roads, terrain, faction boundaries, or place topology.

## Current Accuracy

Seoul V1 provides real city geography and true curated-place coordinates. OpenFreeMap provides the normal neighborhood-scale vector rendering, while the fixed CC0 illustration remains the local fallback and is calibrated at city scale rather than building-level GIS precision. A future local PMTiles or equivalent package is a separate upgrade and does not justify adding a commercial provider.

## Geographic Runtime Decision

OpenFreeMap + MapLibre is the accepted real-world renderer. `MapSceneCanvas` keeps the public renderer contract and chooses `OpenFreeMapCanvas` only for geographic packs. `LocalMapCanvas` continues to own fictional/custom packs and is also the contained fallback when the external renderer cannot start.

The OpenFreeMap Liberty style requires no account, API key, provider configuration, or billing integration. MapLibre and its CSS load only with a geographic pack. OpenFreeMap/OpenMapTiles/OpenStreetMap attribution remains visible. Deterministic E2E substitutes the external style so CI does not depend on public-service availability; a separate real-network visual check verifies the public renderer.

Markers are projections of canonical SchatPhone places and pins; click-to-place returns an exact `{ kind: 'geo', lat, lng }` coordinate to Map. No renderer identifier becomes place identity. Device location, POI/geocoding, route planning, navigation, traffic, and provider billing remain disabled. External failure stays inside the renderer boundary and leaves local Map interactions and state available.

The retired Kakao comparison is not a current runtime, configuration, or product dependency. `/map/labs/kakao-compare` remains only as an inert compatibility redirect to `/map`; it does not load a Kakao SDK or request a key. Removing that redirect later cannot affect saved places, trips, world bindings, or coordinates.

## Next Separate Slice

A later, separately approved full authoring slice may add a versioned package manifest, topology and coordinate validation, calibrated scale tools, editable faction regions and seed places, migration preview, and package export. Local PMTiles, additional cities/catalog policy, public-transit topology/data adapters, and true-device gesture/offline-cache validation are also separate and not started. Static lines/stations and keyed realtime arrivals have different licensing and update boundaries and must not be combined implicitly. None of these directions authorizes route planning, live POI, or Mini Scene work.
