# Map Calendar Reminders Implementation Workstreams / 地图日历提醒事项实施工作流

Updated: 2026-07-31

## 1. Workstream A: Map Travel Core

- trip lifecycle
- route context
- ETA and location state
- versioned local map packs, reviewed world recommendations, and per-world overrides
- Map Settings ownership for binding, detailed player-pin administration, local-image intake, generated-map acceptance, and presentation controls
- Gallery-owned source images referenced by Map-owned custom-pack metadata
- geographic coordinates for real packs and normalized canvas coordinates for fictional packs
- dated, versioned real-place catalogs with stable Map IDs, bilingual address/search metadata, and locally maintained coordinates
- local pack/player-place search and deterministic distance calculation
- explicit click-to-reselect player coordinates without draggable everyday markers; active trips lock map replacement, not map interaction
- `MapSceneCanvas` as the stable renderer seam: lazy-loaded OpenFreeMap + MapLibre for geographic packs, and `LocalMapCanvas` for fictional/custom packs plus geographic failure fallback
- canonical provider-neutral coordinates and Map-owned pins/trips/world bindings remain usable when external style, tile, or WebGL startup fails; `/map/labs/kakao-compare` is an inert compatibility redirect
- no device location, live routing, or commercial POI dependency in the baseline
- no public-transit topology, schedule, realtime-arrival, fare, or transfer-routing dependency in the baseline

## 2. Workstream B: Calendar Real Schedule Meaning

- confirmed event flows
- schedule/date presentation
- relationship-fact safe adapters only after confirmation
- confirmed follow-ups should reuse upstream `sourceTripId` lineage when Map created the cue
- `reservation -> Calendar` World Pack context can change title/context/boundary presentation only, including confirmed `reservation_board` appBindings; it must not change event storage, confirmation rules, or push scheduling

## 3. Workstream C: Reminders As Cue Layer

- callbacks
- follow-ups
- logistics reminders
- stock review cues
- world/task objective cues

## 4. Workstream D: Mini Scene Request Adapters

- begin only after the shared Mini Scene foundation and the specific source slice are promoted
- Calendar's first candidate is one confirmed K-pop `schedule.music_show_day` event using existing event truth
- Map receives a separate later Adapter and must use trip/location truth rather than Calendar or World Pack assumptions
- callers never execute Book regex, render HTML, select profiles, or persist Mini Scene artifacts
- user off/text/interactive policy and all fallback behavior stay behind the shared Mini Scene Interface

## 5. Semantic Guardrails

Treat these as bugs:

1. Calendar becomes a generic cue dump again
2. Reminders starts replacing confirmed schedule meaning
3. Map starts owning business records that only need route context
4. World Pack reservation context becomes a hidden event-rule owner instead of presentation context
5. Calendar or Map copies Mini Scene profile/regex/presenter logic or lets a scene interaction mutate source truth without owner validation
6. a map background is replaced in place and invalidates existing player-pin coordinates
7. a provider-specific POI or map ID becomes canonical downstream location identity
8. the everyday Map page exposes a real/fantasy system switch instead of resolving the active world's binding
9. Map starts owning Gallery binaries or image-generation credentials because Map Settings can initiate intake
10. fictional/custom packs request OpenFreeMap or MapLibre, or external renderer failure mutates Map truth or disables local interactions
