# Map Calendar Reminders Package

Updated: 2026-07-30

Use this package for Map, Calendar, Reminders, route/date/callback/follow-up boundaries, and trip/schedule handoff rules.

Current 4.2 reminder: Map-derived Calendar follow-ups should preserve explicit trip lineage (`sourceTripId`) when available, so confirmed schedule facts can become supporting context inside the originating shared-route memory.

Current local-map baseline: Map supports two versioned, runtime-local map packs: `real-seoul-v1` for a real-world Seoul ecology and `cyber-wasteland-v1` for a faction-divided cyber wasteland. One active world resolves to one recommended or explicitly bound map. Map Settings owns world binding, detailed player-pin management, local-image import, shared-image-service generation, and visual presentation; the everyday Map surface owns search, place use, explicit pin creation, place details, and trips without draggable markers. The production runtime still uses no device location, route planning, paid POI lookup, or commercial map SDK. A removable development-only Kakao comparison now renders the same canonical Seoul pins beside the local control and fails locally when its environment key or domain setup is unavailable. See `docs/product-decisions/LOCAL_NARRATIVE_MAP_PACKS.md`.

Optional capability Pack reminder: Calendar may consume `reservation -> Calendar` world app context for labels, accents, and boundary presentation, including confirmed `reservation_board` nonstandard-app proposals, but Calendar still owns confirmed events, time editing, reminder promotion, relationship-fact review, and push scheduling. Map may consume `transit -> Map` world app context for title/context/boundary presentation, but Map still owns route, trip, location, ETA, shared-route facts, and Map-derived Calendar handoff.

Future Mini Scene reminder: Calendar and Map may each register a focused request Adapter under `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`. They keep confirmed-event/trip/location truth and decide request eligibility; they do not own world-profile selection, Book regex execution, artifacts, or text/HTML presenters.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `IMPLEMENTATION_WORKSTREAMS.md`

Also read when needed:

- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
- `docs/product-decisions/LOCAL_NARRATIVE_MAP_PACKS.md`
- `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`
