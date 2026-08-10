# Map Calendar Reminders Implementation Workstreams / 地图日历提醒事项实施工作流

Updated: 2026-08-10

## 1. Workstream A: Map Travel Core

- trip lifecycle
- route context
- ETA and location state
- versioned local map packs, reviewed world recommendations, and per-world overrides
- Map Settings ownership for binding, full search/category-filtered player-pin creation/edit/delete management, arbitrary-point coordinate selection, local-image intake, generated-map acceptance, and presentation controls; the everyday Map browses, filters, controls visibility, selects destinations, and links into that manager
- Gallery-owned source images referenced by Map-owned custom-pack metadata
- geographic coordinates for real packs and normalized canvas coordinates for fictional packs
- dated, versioned real-place catalogs with stable Map IDs, bilingual address/search metadata, and locally maintained coordinates
- Map-owned persisted place-name display mode with system-language, Chinese, English, and bilingual choices across authored pins/search/Places/details; canonical records, coordinates, search indexing, journeys, and provider-owned basemap labels remain unchanged
- current-world positioned pack/player-pin search with a fully browsable empty-focus catalog except discovery-only categories, wrapped shared category filters, normalized ranked multi-term matching, optional aliases/search terms, and bounded Latin typo tolerance; new places inherit standard name/address/category search, selected matches retain coordinate focus, and unmatched text remains an explicit free-form destination without online POI/geocoding
- persisted per-map marker visibility with separate category and individual-place overrides; catalog filtering remains independent, hidden places remain searchable/usable, selected hidden places may appear in detail context, and discovery-only categories stay out of empty-query suggestions until explicitly requested
- one shared two-level place taxonomy across renderers, search, lists, details, and Settings: broad user-facing groups own browse/filter/visibility semantics, while all stable icon subtypes remain editable and persisted; choosing an icon subtype automatically determines its group without rewriting legacy category IDs
- explicit click-to-create/reselect required player coordinates without draggable everyday markers; address/description remains display/search metadata, geographic packs use latitude/longitude, fictional/custom packs use normalized canvas coordinates, and active trips lock map replacement rather than map interaction
- exclusive coordinate-placement interaction in both renderers: existing markers are pointer-transparent and cannot replace the active place draft
- map-first progressive disclosure: compact search, canonical role-position focus plus idle-only arbitrary-point selection, and independent Journey/Places/Footprints buttons whose drawers do not repeat that navigation; a static start-position focus plus persistent primary journey card while traveling; browse-only search and place detail during traveling/paused/arrived states without endpoint mutation; one Places-drawer link to the Settings-owned create/manage surface; typed and current-world-picked journey endpoints; active/paused/arrived progress, remaining time, and pending-update access; route cards only for explicit destination/runtime context; selected-place details on demand; and fictional faction legends collapsed by default
- place-focus Stage 1 is implemented as one Map-owned overview/detail sheet with `Go`, locked-journey reuse, distance/current-position context, progressive details, Share, and player-owned Manage; it adds no Event placeholder or nested modal
- a later separately reviewed presence slice adds `Enter`, inside-session actions, manual-versus-journey provenance, and persistence; event invitations remain absent until an eligible/approved-teaser projection is separately implemented
- active-journey music/radio progressive disclosure: one traveling/paused-only icon opens a focused Map panel over the independent Music floating layer; Map consumes bounded projections and delegates explicit user actions to Music without receiving audio URLs, local media IDs, credentials, raw queues, or playback ownership
- place-detail-to-Chat sharing through one normalized Map-owned snapshot, with Chat-owned recipient/send state, cancel-to-place, stable `placeId` return, and no location/trip mutation
- `MapSceneCanvas` as the stable renderer seam: lazy-loaded OpenFreeMap + MapLibre for geographic packs, and `LocalMapCanvas` for fictional/custom packs plus geographic failure fallback
- canonical provider-neutral coordinates and Map-owned pins/trips/world bindings remain usable when external style, tile, or WebGL startup fails; `/map/labs/kakao-compare` is an inert compatibility redirect
- no device location, live routing, or commercial POI dependency in the baseline
- no public-transit topology, schedule, realtime-arrival, fare, or transfer-routing dependency in the baseline
- staged Map Journey Runtime: MJE-1 transport selection/estimate/persistence compatibility, MJE-2 versioned lifecycle/checkpoints/pause-resume, MJE-3's first non-blocking checkpoint event adapter, and MJE-4 Footprints/place knowledge are user-accepted and integrated locally
- MJE-3 persists only evaluated checkpoint IDs, one pending-review compatibility reference, and cumulative event-delay seconds in Map; proposal copy, eligibility, provenance, and audit stay in Event Runtime
- later static transport catalog ownership in Map Settings; a Transit app remains a presentation candidate, never a second journey runtime

## 2. Workstream B: Footprints And Active Exploration

- preserve current points, route familiarity, area unlocks, feedback, and history as passive Footprints
- MJE-4 presents the former passive Explore surface as Footprints without destructive progression migration
- keep `all_known` as old-save-compatible per-world default; optional `footprint_gated` knowledge hides only explicitly eligible authored nearby facilities until a completed positioned journey reveals them
- keep knowledge separate from marker visibility, preserve discoveries across mode switches and backup/restore, and never reveal from manual role-position changes or cancelled journeys
- add active area exploration only as a later explicit action with area, time/approach, checkpoints, and confirmed discovery outcomes
- keep discovered places Map-owned, committed lore WorldBook/Book-owned, confirmed schedules Calendar-owned, and event eligibility Event Runtime-owned

## 3. Workstream C: Calendar Real Schedule Meaning

- confirmed event flows
- schedule/date presentation
- current frontend is a list-first baseline; later CJA-1 may add Month, Week, Agenda, selected-day, multi-day-span, and event-authoring IA only after user acceptance
- `Agenda / 日程` remains a Calendar view; it is not a second long-range planning app
- relationship-fact safe adapters only after confirmation
- confirmed follow-ups should reuse upstream `sourceTripId` lineage when Map created the cue
- `reservation -> Calendar` World Pack context can change title/context/boundary presentation only, including confirmed `reservation_board` appBindings; it must not change event storage, confirmation rules, or push scheduling

## 4. Workstream D: Schedule Orchestrator And Agenda Journey

- begin with the CJA-2 pure Schedule Orchestrator Interface, idempotent Calendar-event materialization fixtures, deadline reconciliation, persistence owner, backup/restore, and legacy compatibility
- keep Schedule Orchestrator hidden; it links IDs and coordinates time but never becomes a Home app or owner of copied records
- add Agenda Journey only in a later CJA-3 user-approved slice for short-range day/near-term steps, execution state, evidence references, and outcomes
- keep Calendar as planned truth, Agenda Journey as execution truth, and Map Journey as travel truth
- allow Map arrival to satisfy only an explicit arrival/presence requirement; it cannot prove a non-travel activity completed
- preserve Calendar appointment time as planned truth while Map supplies dynamic current-origin estimates; explicit departure confirmation creates one canonical Map Journey and later Map opens reuse that journey
- allow a linked indoor appointment to request validated automatic entry without making manual relocation equivalent to journey arrival

## 5. Workstream E: Activity Session And Narrative Projection

- begin Activity Session only after Agenda Journey has a stable step owner
- use absolute timestamps, explicit checkpoints, minimize/navigation continuity, and suspend/reopen reconciliation; do not promise exact interactive popups when the browser/PWA is closed or suspended
- keep event eligibility and choices in Event Runtime and Mini Scene presentation; Activity Session owns time only
- add explicit per-step completion policy and keep a no-event base activity path
- treat Pomodoro as one Focus Companion presentation preset; later Gallery background, Music/ambient, and decorative companion references remain cross-owner references, not Activity Session assets
- when the same presentation is used during a flight or other long Map Journey, consume the Map-owned clock instead of creating a duplicate Activity Session
- keep the future Narrative Timeline as a bounded source-linked projection until Story/Diary/Journal naming, route, owner, retention, backup, review, and AI-context policy are separately approved

## 6. Workstream F: Reminders As Cue Layer

- callbacks
- follow-ups
- logistics reminders
- stock review cues
- world/task objective cues

## 7. Workstream G: Mini Scene Request Adapters

- begin only after the shared Mini Scene foundation and the specific source slice are promoted
- Calendar's first candidate is one confirmed K-pop `schedule.music_show_day` event using existing event truth
- Map receives a separate later Adapter and must use trip/location truth rather than Calendar or World Pack assumptions
- callers never execute Book regex, render HTML, select profiles, or persist Mini Scene artifacts
- user off/text/interactive policy and all fallback behavior stay behind the shared Mini Scene Interface
- a future Agenda Journey caller registers only after its route, source records, persistence owner, and Adapter are approved; presentation `off` may auto-resolve only policy-approved low-impact outcomes and cannot bypass high-impact review

## 8. Workstream H: Map Journey Checkpoint Event Collaboration

- MJE-3's first adapter is user-accepted; its sample copy/values and later transport/asset/ability variants remain deferred to separate project-event work
- submit bounded canonical Map snapshots only for completed `en_route` and `near_arrival` checkpoints while Map is mounted, never on each animation tick
- keep template eligibility, deterministic/random gates, cooldowns, caps, proposal/review, provenance, and logs in Event Runtime
- return only no ETA change or a bounded 120-second delay to Map for exact source validation; pending review cannot pause the journey, and Event Runtime cannot mutate journey or place truth directly
- keep an ordinary no-event journey and missing/stale-proposal recovery as covered outcomes

## 9. Workstream I: Large-Map Event Card Host

- EVE-1's Event Surface Projection and registered-host Interface plus the Event-owned EVE-2B runtime foundation are landed; keep Map unregistered until EVE-2C UI receives separate acceptance
- EVE-2A is complete: it freezes the 101-place inventory, read-only legacy/exact semantic overlay, `MapPlaceSessionCheckpointV1`, no-external-mutation validation Adapter, and one interior production-arrival-briefing archetype under `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`; none is implemented in Map yet
- EVE-2C renders exactly that approved vertical slice first, with zero-token invitation/no-event behavior, explicit event entry/expansion, local or cached optional text, and a complete local fallback
- preserve the frozen interior activation scope, hidden-until-eligible discoverability, manual/journey-arrival provenance, explicit place-entry requirement, text-only media fallback, and Adapter action before EVE-2C; ordinary place focus and event-pin selection remain distinct paths
- validate geographic latitude/longitude and fictional/custom normalized-canvas anchors without creating canonical places or provider identity
- keep placement, selection, clustering/stacking, text fit, layer coexistence, authored Map-pack scene asset resolution, accessibility, and Map return context inside Map
- keep proposal/log truth in Event Runtime and every effect behind the source owner's Adapter validation
- fail invalid, stale, off-pack, and unpositioned anchors back to the source host/World Hub without inventing a location
- do not treat this workstream as MJE-5 active exploration, event-driven discovery, generated candidate places, or Mini Scene authorization

## 10. Semantic Guardrails

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
11. an existing marker intercepts a coordinate-placement tap or reopens a saved place over the active editor draft
12. store-seeded trip defaults make the large route surface visible before the user expresses destination intent
13. passive Footprints or nearby authored-place reveal is presented as if active exploration or generated discovery already exists
14. a transport choice does not affect the estimate and persisted journey snapshot
15. Event Runtime mutates journey state directly or runs journey eligibility on every animation tick
16. a separate Transit app creates its own trip state before independent network utility exists
17. one MJE stage automatically starts the next before user acceptance and roadmap update
18. the current list-first Calendar page is described as if Month/Week/date-grid IA already exists
19. Agenda Journey becomes a second long-range planner or rewrites Calendar history after execution
20. an unqualified `Journey` record, event, or audit field can refer to either Map Journey or Agenda Journey
21. Schedule Orchestrator becomes a visible app or copies downstream truth instead of linking stable IDs
22. Map arrival automatically completes a rehearsal, broadcast, performance, class, meeting, or other non-travel step
23. Activity Session uses accumulated timer ticks as canonical progress or promises exact closed-app interaction
24. presentation `off` disables event eligibility or bypasses high-impact owner confirmation/review
25. Narrative Timeline becomes canonical business truth or sends unbounded raw logs/prompts to Forum or Chat
26. an Event Surface Projection becomes a second event record or an authorization token
27. a coordinate-anchored event creates a place, reveals discovery, changes visibility, or mutates role/journey truth
28. map event cards overlap incoherently, obscure primary controls, or open automatically during ordinary pan/focus selection
29. EVE-2 is treated as authorization for MJE-5 or Mini Scene runtime
