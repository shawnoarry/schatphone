# Map Calendar Reminders Status And Handoff

Updated: 2026-08-20

This file is the handoff page for Map, Calendar, and Reminders work.

## Place Detail And Active-Journey Card UI Optimization

Status: `INTEGRATED_LOCAL / PLACE_FOCUS_INTERACTION_REDESIGN / AUTHORED_PLACE_COPY / NO_ROADMAP_STAGE_CHANGE`

The ordinary place-focus surface is now a compact non-modal floating card anchored near the selected pin rather than a map-blocking bottom modal. Its overview answers what the place is, how it relates to the current position, and what the user can do now through a stable image slot, visibly labeled place-specific introduction, separate `Go` / current-journey action, Details, and one permanently reserved entry slot. The entry slot stays dim but clickable while remote and reports `当前不在设施附近`; it activates as `Enter` only at a coordinate-matched stable place and changes to `Leave` while inside. Reviewed exact/area/generated media supports recognition without turning the card into a gallery; every other place uses an image-backed, explicitly non-evidentiary category fallback. The detail level remains place-facing with About, a copyable address, compact Share, hidden-pin recovery, a collapsed-by-default image truth/provenance/license disclosure, and a Settings handoff for player-owned management; it does not repeat Journey or entry actions. Map state, Footprints, the global place-name language preference, arbitrary relocation, start-point mutation, and delete controls no longer appear as place content. The card leaves the surrounding map visible and interactive, supports Escape dismissal, and does not create a permanent Event placeholder.

`src/lib/map-place-copy.js` now supplies distinct bilingual introductions for all 106 Seoul places and all seven built-in fictional places without changing canonical place records. Player places prefer user-authored summary/description fields and otherwise receive a bounded name/address/category-aware introduction that adds no unverified hours, ratings, services, or historical claims. The active-journey card continues to give each visible fact one role: one status/phase line, route as the main title, transport plus ETA as supporting copy, one remaining metric, one compact progress track, and one journey command. Its desktop width is capped at `640px`, the mobile composition remains edge-constrained, and existing journey/event behavior is unchanged. This slice adds no new place/media record, MJE-5 behavior, transit topology, live navigation, POI provider, persistence owner, or dependency migration. The existing Map icon family remains consistent; no one-off Lucide dependency was introduced.

Validation: focused Map Vitest passes 4 files / 52 tests, including complete 106-place Seoul and seven-place fictional copy-registry coverage; full Vitest passes 299 files / 2109 tests. Full ESLint, production build, governance 2 files / 14 tests, and `git diff --check` pass. Dedicated place-media Playwright passes 2/2 across desktop Chromium and simulated Pixel 5, covering distinct authored introduction projection, exact/area/fallback images, collapsed and expanded provenance, address copy feedback, full initial action visibility on the short-phone baseline, critical accessibility, and zero horizontal overflow. The shared visual-quality gate passes 16/16 across desktop/mobile and default/zen themes. Direct in-app browser inspection confirms three different Seoul introductions, a working `地址已复制` response, closed-by-default image information, and zero card overflow. JSDOM continues to emit known non-failing Canvas and media API warnings. No physical-device evidence is claimed.

## Place Media Governance Pilot

Status: `INTEGRATED_LOCAL / 7_REAL_DERIVATIVES_REMOTE_VERIFIED / 1_FICTIONAL_FALLBACK`

The 106-place Seoul catalog now resolves media through a separate V1 registry rather than adding image fields to canonical place records. Every place card has an image-backed overview slot with visible truth labeling and accessible alt text. Reviewed exact/area/generated records retain author/source/license/change attribution; remaining Seoul places use the approved CC0 Seoul category visual, fictional/player places use an explicit project-owned category fallback, and image-load failure returns to that same labeled fallback. The first pilot approves exact-place photos for Gyeongbokgung, Seoul Station, Seoul Forest, and Starfield COEX Mall; clearly labeled area atmosphere for SM Entertainment HQ, Myeongdong Kyoja Main Store, and Sillim-dong compact housing; and a category fallback for fictional Helix Spire.

`docs/design/MAP_PLACE_MEDIA_INVENTORY.md` records the fixed bespoke target as 113 built-in images. Seven Seoul derivatives are complete; 99 further Seoul places remain licensed-photo searches, while the seven fictional places require project-authored generated reconstructions. Within Seoul, 79 places are exact-photo preferred and 27 are area-atmosphere preferred; truthful review evidence may downgrade or upgrade an individual target.

Seven untouched source candidates remain in the Git-ignored local archive at `output/imagegen/map-place-media-pilot-20260815/source-candidates/`. Only separately cropped/compressed runtime WebPs were published. Batch `map-place-media-pilot-20260815` uploaded and re-downloaded all seven public objects, verified their byte length and SHA-256, and registered them in `config/project-assets.json`. The audit rejected an apparent SM candidate when visual inspection showed it was not established as the Seoul headquarters area. No map-service screenshot, news/social image, or unclear corporate media entered runtime. See `docs/design/MAP_PLACE_MEDIA_GOVERNANCE.md`, `docs/design/MAP_PLACE_MEDIA_INVENTORY.md`, and `docs/qa/MAP_PLACE_MEDIA_PILOT_2026-08-15.md`.

Current validation is included in the package-level results above. The focused media/card slice passes, full ESLint and production build pass, and dedicated place-media Playwright passes 2/2 across desktop Chromium and simulated Pixel 5. Direct review confirms exact-photo, area-atmosphere, and image-backed player-place fallback presentation with no horizontal overflow; short-phone media compression preserves the required image slot while keeping the overview actions in the initial card view.

## 1. Current Status

Status: `PARTIAL_DONE`

The Map World Suite read-only audit, production evidence composition, native transactional mutation, and Catalog-backed Owner Adapter are complete. `src/lib/map-world-suite-inspection.js` classifies native pack identity and managed edits; `src/lib/production-map-world-suite-inspection-adapter.js` composes real Map, Gallery, Event Runtime, and Chat evidence behind the same immutable Interface; and `src/lib/map-world-suite-owner-adapter.js` supplies `install/update/remove` for shared independent/Suite execution. Catalog records remain outside manifests, may carry at most 500 strictly normalized authored canvas places, and reference a Gallery-owned asset. Gallery now owns a matching stable-folder/stable-asset Adapter with provenance, duplicate ID/URL protection, exact rollback, and native/other-folder reference review. A typed Book/Gallery/Map Catalog and explicitly constructed product installation runtime install Gallery before Map, reverse dependency order on uninstall, persist every System checkpoint through a real receipt, and retry from native truth without duplicate mutation. Ordinary custom-map creation still strips forged provenance and authored Catalog places. The runtime does not activate, bind, relocate, alter Journey/place state, let Map write Gallery, or delete history. There is no built-in K-pop Catalog/manifest, startup caller, or UI; the default standalone production inspection continues to report `mutationAdapterAvailable: false` and `canInstall: false`.

Map's first internal Chat share caller is integrated locally. Place Details creates a source-owned `location_share`; Chat owns recipient selection, confirmation, history, and quoting; cancel and sent-card navigation restore the same `placeId`. Desktop and simulated Pixel 5 prove that source return does not change current location or create a journey.

Map's active-journey Music caller is also integrated locally. A traveling or paused journey exposes one compact music/radio control that opens a focused bottom panel for quick tracks, transport controls, and three Music-owned library-backed stations. Map receives only bounded projections and never receives API keys, endpoints, audio URLs, local media IDs, or raw queue contents. The Map panel and Music's global floating player coexist as separate layers: closing the trip panel or leaving the journey removes only Map presentation, while playback and an explicitly opened Music float continue. Focused unit coverage and desktop/simulated Pixel 5 Playwright protect the full Map -> radio -> float -> Music -> Map return path, layer order, dismissal behavior, page errors, and horizontal overflow.

## Large-Map Event Card Direction

Status: `EVE-0_ARCHITECTURE_ACCEPTED / EVE-1_EVENT_CONTRACT_DONE / EVE-2A_DONE / EVE-2B_RUNTIME_DONE / EVE-2C_MAP_UI_DONE_2026-08-10`

The user accepted Event as a cross-module product family without a normal Home app and named Map as its first large-surface host. The staged direction is:

1. Event package EVE-1 has frozen and tested a pure Event Surface Projection, empty-by-default host registration, stale-source behavior, allowlisted request descriptors, and strict stable-place/geographic/canvas anchor normalization without a route, Store field, Map UI, or new event family.
2. EVE-2A froze the reusable contracts and one interior production-arrival-briefing archetype; EVE-2B implemented Event-owned registries, durable instances, local fallback materialization, and optional text composition; EVE-2C now adds Map V3 provenance/place sessions, explicitly registers one Map host, and renders only that approved invitation/detail flow. The archetype accepts manual or internally authorized journey-arrival evidence only after explicit Map-owned place entry, validates three no-external-mutation choices through the Map Adapter, and retains a complete no-event/text-only path.
3. The compact card exposes an explicit `Expand event` command and never opens automatically merely because the map pans, focuses, or selects a nearby point.
4. Map owns placement, clustering/stacking, text fit, mobile layer behavior, and return context. Event Runtime owns proposal/log truth and the source Module validates effects.
5. An anchor cannot create a place, reveal discovery, change visibility, move role/journey state, or authorize an effect. Invalid/off-pack anchors remain reviewable in the source host/World Hub without an invented coordinate.
6. EVE-2 does not authorize MJE-5 active exploration, generated candidates, event-driven place reveal, Mini Scene runtime, or CG generation.
7. Ordinary place focus remains separate from event-pin selection. Explicit `Enter` creates or resumes a Map-owned inside session only at a coordinate-matched stable place; an eligible invitation can then expand into the registered Event Surface, while pan/focus/selection alone never opens it.
8. `store:map` V3 persists manual-versus-journey-arrival evidence, destination-place lineage, and `inside` / `left` session state with V2 migration. Event projections/pins are derived from Event Runtime truth and never become a second Map event store.
9. Map resolves the current Book-backed world context when it evaluates journey checkpoints, place-session invitations, and event expansion. Active setting-text changes therefore take effect without restarting Map, and Map does not cache or own the source prose.

EVE-2C passes 8 focused files / 109 tests and the full 228-file / 1671-test Vitest suite; lint and production build pass. The dedicated Map K-pop Playwright flow passes 6/6 across desktop Chromium and simulated Pixel 5, covering manual and real-Journey arrival, explicit entry/leave, local text, three choices, reopen/return, off-pack no-event, marker coexistence/stacking, critical Axe checks, page errors, and zero horizontal overflow. Eight screenshots record invitation, detail, journey-arrival, and no-event states; no physical-device evidence is claimed.

## Calendar, Agenda Journey, And Event Orchestration Direction

Status: `CJA-0_DONE / CALENDAR_DEPARTURE_READINESS_V1_DONE_2026-08-15 / CJA-1_DONE_2026-08-15 / CJA-2_DONE_2026-08-16 / CJA-3_DONE_2026-08-16 / CJA-4_DONE_2026-08-16 / CJA-5_DONE_2026-08-16 / CJA-6A_CONTRACT_DONE_2026-08-17`

The accepted direction is recorded in `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md` and roadmap 4.12:

1. Calendar is a real Home app whose CJA-1 frontend now provides Month, Week, and Agenda views over the same Calendar-owned confirmed events;
2. `Agenda / 日程` is a Calendar view, not another planning app; selected-day and selected-event detail remain projections over the source event rather than copied records;
3. `Agenda Journey / 行程` is now a separate Home/App Store app for today and near-term execution, while `Map Journey / 地图行程` remains the Map-owned city-travel flow;
4. the hidden Schedule Orchestrator persists deterministic per-occurrence materialization/deadline requests, refreshes or retires them from Calendar truth, and reconciles after startup or resume; the CJA-3 owner consumes and acknowledges those requests without copying Calendar records;
5. CJA-4 implements Activity Session timing and the restrained Focus Companion baseline. CJA-5 adds one midpoint-only Event Runtime collaboration with silent `off` resolution or inline `text` choice. CJA-6A now documents the read-only Narrative Timeline contract and bounded AI-context seam; CJA-6B projection implementation, broader event checkpoints, appointment auto-entry, and any visible Story/Diary surface remain separately gated;
6. CJA-1 is complete: Calendar storage V3 migrates V1/V2 and owns explicit start/end, all-day, recurrence, participation requirement, notes, reminder lead time, and optional stable Map `locationRef`; the UI adds Monday-first 42-day Month, Week, Agenda, selected-day/detail, and complete manual create/edit/delete.
7. Map recomputes origin, transport estimate, recommended departure, predicted arrival, and lateness for the selected occurrence without rewriting Calendar time. Explicit `Leave now` creates or reuses one canonical Map Journey linked to the source Calendar event ID; another active journey blocks creation and Map returns to Calendar.
8. Focused Calendar coverage passes 10 files / 35 tests. Calendar plus Map focused Playwright passes 6/6 across desktop Chromium and simulated Pixel 5, including default/zen visual evidence, CRUD, recurrence, multi-day spans, Map place selection, departure handoff, critical Axe, page-error, and zero-horizontal-overflow checks. No physical-device evidence is claimed.
9. CJA-2 adds `store:schedule-orchestrator` V1, a pure occurrence reconciliation contract, startup/Calendar-change/timer/resume runtime, nested Calendar-section backup, and legacy missing-child restore. Focused orchestrator tests cover deterministic identity, recurring/multi-day materialization, update/removal retirement, once-only deadlines, acknowledgement, backup, and reopen behavior; no UI/E2E or physical-device claim applies to this hidden slice.
10. CJA-3 adds schema-V1 `store:agenda-journey`, one stable route/Home/App Store identity, Calendar-occurrence materialization plus manual plans within the next 14 days, strict travel/activity step separation, explicit required/optional outcomes, source-retirement/deadline reconciliation, and nested Calendar-section backup with rollback-safe restore. A travel step can create or reuse exactly one Map Journey carrying `sourceAgendaJourneyStepId`; Map arrival completes travel and unlocks activity but never proves activity completion. Focused unit coverage plus desktop Chromium and simulated Pixel 5 Playwright protect creation, execution, Map return context, accessibility, text fitting, and zero horizontal overflow. No physical-device evidence is claimed.
11. CJA-4 adds schema-V1 `store:activity-session`, one deterministic session per stable Agenda activity-step ID, absolute timestamps, explicit pause and completion policy, deterministic checkpoint reconciliation, owner-validated completion evidence, nested Calendar backup and rollback recovery, and startup/pageshow/visibility reconciliation. Agenda Journey hosts one quiet built-in Focus Companion with pause/resume, minimize/reopen, explicit completion, and no-event baseline behavior. CJA-5 then adds schema-V2 Activity Session owner validation plus one durable midpoint event family in Simulation V6, with `off | text` presentation and only a 0/2-minute timer result. CJA-6A adds only the documentation contract for a bounded, source-linked Narrative Timeline and read-only AI context; CJA-6B remains unimplemented. Travel steps fail closed, Map-owned duration is never copied, and Gallery backgrounds, Music/ambient callers, richer companions, appointment auto-entry, broader event families, and exact closed-app interaction remain absent. Focused CJA-4 plus persistence coverage passes 9 files / 65 tests; focused CJA-5/persistence coverage passes 10 files / 66 tests; the current bounded two-worker full suite passes 290 files / 2047 tests; desktop Chromium and simulated Pixel 5 Agenda/Activity Playwright passes 4/4 for CJA-4 and 4/4 for CJA-5. No physical-device evidence is claimed.
This documentation lane does not modify, replace, or block the current Map implementation or roadmap 4.11 MJE work. Cross-module terms must qualify `Agenda Journey` and `Map Journey`; user-facing copy may use `行程` where the containing app makes the meaning clear.

## Journey, Footprints, And Exploration Direction

Status: `APPROVED / MJE-1_MJE-2_MJE-4_INTEGRATED / MJE-3_ADAPTER_RETAINED_PRODUCTION_TRIGGER_SUSPENDED`

The approved direction is recorded in `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md` and promoted in roadmap 4.11:

1. Map remains the player entry and canonical source owner for journeys and later active area exploration;
2. transport selection belongs to journey planning, while a separate Transit app stays deferred until it has independent network utility;
3. the current Explore points, route familiarity, area unlocks, and static feedback are the passive Footprints foundation rather than active spatial exploration;
4. the first journey checkpoint adapter remains available only behind an explicit compatibility/test hook; the production Map does not enable its generic route-obstruction trigger after product review;
5. ordinary journeys may complete without an event;
6. MJE-1 transport-aware estimates plus compatible active/history journey snapshots are user-accepted and integrated locally;
7. MJE-2 implemented a versioned Map-owned active lifecycle, deterministic duration-based checkpoints, safe pause/resume, and the ordinary uneventful completion path. The user accepted it by explicitly authorizing MJE-3; it still does not authorize companions, transit topology, or active exploration.
8. MJE-3 retains one low-impact, world-aware route-condition adapter and its exact-lineage/no-event/recovery tests, but production evaluation is suspended. The rejected generic presentation described a temporary obstruction without establishing who was obstructed, what a selected transport could actually do, or which schedule owner would absorb the consequence. A future replacement must start from a real transport/actor capability and owner-native consequence instead of relabeling the same two-minute mutation.
9. The MJE-3 acceptance revision makes journey state visible through a persistent primary map card with route, phase, progress, remaining time, ETA, and an on-demand pending-update entry. Journey, Places, and Footprints remain three independent primary map buttons; each opens only its focused drawer content instead of repeating the same navigation inside the drawer. GPS-like recenter wording becomes canonical role position, add/manage actions stay inside Places, and the optional shared-route relationship record appears only at arrived-journey acknowledgement. It does not add companion truth to the active journey.
10. Journey schema V3 safely migrates V2 active journeys that were paused by the earlier MJE-3 proposal behavior back to active timing while preserving remaining duration, proposal lineage, checkpoints, delay totals, and reminder rescheduling.
11. MJE-4 relabels the passive Map progress entry and dashboard as Footprints, preserving points, route familiarity, area unlocks, feedback, and history. Map Settings now owns a per-world `all_known` or `footprint_gated` place-knowledge choice. In gated mode, undiscovered convenience stores and pharmacy districts are absent from all map catalogs until a completed positioned journey reveals up to four nearby authored facilities within 1.2 km. Knowledge evidence is world/map/trip scoped and backed up; marker visibility remains separate; manual role-position changes and cancellations reveal nothing.

MJE-1 was independently reviewed and accepted by the user. The user accepted MJE-2 by explicitly authorizing the next stage, and MJE-4 after verifying its per-world knowledge choice and nearby-place discovery flow. MJE-3's technical adapter remains integrated, but the generic production presentation is withdrawn after later product review. This correction does not authorize MJE-5.

MJE-3 compatibility coverage remains focused on exact lineage, bounded owner validation, no-event behavior, and safe recovery. The production Map explicitly disables checkpoint-event evaluation, and the earlier generic route-event screenshots have been removed so they cannot be reused as current product evidence.

Calendar departure-readiness V1 validation passes 3 focused files / 39 tests plus targeted lint. Dedicated Playwright passes 2/2 across desktop Chromium and simulated Pixel 5, covering a supermarket as the actual current origin, public-transit/walking estimate differences, explicit lateness, 44px controls, keyboard focus, zero horizontal overflow, one explicit linked Journey, and Map-to-Calendar return. Four screenshots provide simulated-device evidence; no physical-device proof is claimed.

MJE-4 final validation passes: the focused endpoint/discovery set passes 3 files / 45 tests; the repository-wide Vitest suite passes 202 files / 1401 tests; lint, production build, governance, and `git diff --check` pass; and the complete Map E2E passes 14/14 across desktop Chromium and Pixel 5. Browser inspection confirms the saved role-position address/coordinate is used for trip distance, with Gangnam Station to Samsung Town resolving to 0.3 km, zero document/drawer overflow, and no console errors.

The tolerant local-search revision is also validated in the current tree: its focused pure-logic/Map-view set passes 2 files / 27 tests; the full Vitest suite passes 201 files / 1376 tests; lint, production build, governance (2 files / 12 tests), and scoped `git diff --check` pass; the complete Map E2E passes 12/12 across desktop Chromium and Pixel 5; and direct desktop/mobile visual inspection confirms zero horizontal overflow or console errors.

The Seoul everyday/community-place and pin-visibility revision is validated in the current tree: its focused pack/search/Map-view set passes 3 files / 41 tests; the default full Vitest suite passes 201 files / 1379 tests (an earlier cold run had one unrelated persistence-bootstrap timeout, which then passed 24/24 in isolation and in the complete rerun); lint, production build, governance (2 files / 12 tests), and `git diff --check` pass; the complete focused Map E2E passes 12/12 across desktop Chromium and Pixel 5. Unit and desktop/mobile E2E coverage confirm category scrolling over 104 catalog rows including the three existing user places, complete per-row controls, no horizontal overflow, convenience-store opt-in discovery, and temporary detail-context projection for a hidden place.

The Map discovery, primary-entry, and role-position usability revision is validated in the current tree: the focused Map-view/Places-settings set passes 2 files / 29 tests; the full Vitest suite passes 201 files / 1390 tests; lint, production build, governance (2 files / 12 tests), and `git diff --check` pass; and the complete Map E2E passes 12/12 across desktop Chromium and Pixel 5. Its pre-restaurant-expansion baseline confirmed a fully reachable 101/104 empty-search catalog with discovery-only convenience stores withheld, wrapped zero-overflow categories in search/Places/Settings, priority ordering for transport hubs and all four housing tiers, independent Journey/Places/Explore map buttons, and persisted idle-only blank-point role positioning without GPS or live-route claims. The current five-place Food Delivery regression separately confirms 106/109. Direct desktop and Pixel 5 inspection also reports zero document/category horizontal overflow.

The grouped pin-taxonomy revision is validated in the current tree: 4 focused files / 49 tests and the full 201-file / 1392-test Vitest suite pass; lint, production build, governance (2 files / 12 tests), and `git diff --check` pass; and the complete focused Map E2E passes 12/12 across desktop Chromium and Pixel 5. Coverage confirms 14 broad category controls, all 31 stable icon subtypes in the Settings-owned editor and guide, distinct housing-tier icons, broad-group search/filter/visibility behavior, persisted subtype values, legacy normalization, convenience-store discovery-only behavior, and zero horizontal overflow. Direct desktop and Pixel 5 screenshot review confirms that the grouped icon picker remains readable and vertically reachable.

The Map entry and active-journey discovery revision is validated in the current tree: the focused Map-view/WorldBook set passes 2 files / 28 tests; the full Vitest suite passes 201 files / 1393 tests; lint, production build, governance (2 files / 12 tests), and `git diff --check` pass; and the complete Map E2E passes 12/12 across desktop Chromium and Pixel 5. Coverage confirms the primary label `Places / 地点`, removal of the duplicate Journey/Places/Explore row inside drawers, and browse-only search/place detail during active journeys without changing the locked journey endpoint. Direct desktop and Pixel 5 inspection reports zero horizontal overflow and no browser console errors.

## Integrated OpenFreeMap Baseline

Status: `COMPLETE / INTEGRATED_LOCAL`

Current integrated slice = Seoul V1 static place-catalog expansion plus the approved coordinate-placement and everyday Map information-architecture corrections. Other feature work remains separately gated.

OpenFreeMap + MapLibre now replaces the retired Kakao comparison as the real-world renderer:

1. `MapSceneCanvas` retains its existing prop/event contract and selects `OpenFreeMapCanvas` only for geographic packs;
2. fictional and imported canvas packs remain on `LocalMapCanvas` and make zero OpenFreeMap/MapLibre requests;
3. external style, network, or WebGL startup failure before the first ready state switches to the local fallback without mutating canonical places, pins, trips, coordinates, ETA, or world binding;
4. MapLibre JS and CSS load lazily with the geographic renderer; ready state follows the MapLibre `load` event;
5. focused unit coverage mocks MapLibre and proves ready state, canonical markers, marker selection, exact geo placement, prop updates, and fallback containment;
6. deterministic Map E2E proves real rendering, fictional/custom zero requests, offline fallback, active-trip coordinate editing, and parent return chains without depending on the public service;
7. the old Kakao components, configuration, and tests are removed; `/map/labs/kakao-compare` remains only as an inert compatibility redirect to `/map`;
8. the renderer decision and ownership boundary are synchronized across the active map package, PM mirror, roadmap, and local-map product decision.
9. coordinate placement is exclusive in both renderers: existing markers become pointer-transparent, editor drafts survive coordinate reselection, and active-trip editing is covered on Pixel 5;
10. the everyday Map UI is map-first at idle, with compact canonical role-position and Places controls; Places provides browsing plus one link to the Settings-owned create/manage surface, active journey state uses a persistent primary card outside the map-tool stack, trip detail remains on demand, place details stay on demand, and fictional faction legends start collapsed.

Validation evidence for the integrated renderer baseline:

- lint passed;
- full unit suite passed: 197 files / 1321 tests;
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
14. Map Settings can import a local map image or explicitly keep a result from the shared Image Generation Module, create canvas-coordinate custom-pack metadata, bind it to the current world, and retain the source image through Gallery ownership. The main Map route separately owns search, place browsing/use, details, trips, visibility controls, and the manager handoff.
15. Map Settings now has a dedicated Places and Pins manager with tolerant text search and shared category filters. Player-created pins can be added, edited, categorized, deleted, and placed at an arbitrary coordinate through the same manager; built-in pack places remain read-only, the everyday Map does not duplicate the creation form, place details do not drag markers, and coordinate selection remains usable during active trips.
16. Map Settings, Places and Pins, WorldBook pack settings, image-provider settings, and visual settings now use explicit parent return targets instead of forwarding the Map route's `from=home` query into every child.
17. The earlier Kakao spike is retired. OpenFreeMap + MapLibre is the validated real-world renderer, with canonical SchatPhone coordinates, lazy loading, visible attribution, deterministic tests, and a local-image fallback.
18. The current Seoul V1 catalog contains 106 versioned read-only places. The earlier 28-place expansion added major entertainment agencies, broadcasters/media buildings, company headquarters, civic/cultural/event landmarks, and three named Cheongdam beauty-salon branches. The current-tree 48-place everyday-city expansion adds general and luxury shopping, supermarkets, a small convenience-store set, nightlife, general and plastic-surgery hospitals, four housing tiers, major transport hubs, parks, universities, and landmark hotels. The following 18-place community-service expansion adds pharmacy districts, sports facilities, cinemas, bank headquarters, and police/fire institutions. The latest five-place Food Delivery expansion adds Myeongdong Kyoja Main Store, London Bagel Museum Anguk, Knotted Cheongdam, Kyochon Chicken Yeoksam No. 1, and EGGDROP Gangnam Woosung from reviewed public branch/address evidence. Every entry keeps stable Map identity, bilingual address/search metadata, and a locally maintained geographic coordinate; Food Delivery references these IDs but does not own or copy Map place truth.
19. Map's default surface now uses progressive disclosure: store-seeded destination defaults no longer expose a route card on idle entry; Journey, Places, and Footprints have three independent named map buttons and their drawers no longer repeat the same three-way navigation; a canonical role-position focus replaces GPS-like recenter wording and becomes a static start-position focus during travel; Places links to the Settings-owned creation and management page without duplicating its form; active/paused/arrived journeys use a persistent primary status card while the top-level search remains available for read-only place browsing; and selected-place/trip surfaces appear only when their context exists.
20. Existing real and fictional markers cannot intercept coordinate-placement taps. Page-level guards also prevent stale marker events from replacing an in-progress create/edit draft.
21. Map search now acts as a tolerant current-world local-pin index: empty focus exposes the complete positioned catalog except discovery-only categories; search, Places, and Settings category controls wrap so every option remains reachable; ranked matching covers normalized names, addresses, broad-category and stable icon-subtype semantics, optional aliases/search terms, and bounded Latin typos; new places inherit standard-field search without page-specific branches; unmatched text has explicit free-form/browse exits; and result selection still focuses plus opens the place without any POI/geocoding call. The shared taxonomy keeps 14 user-facing broad groups for browsing, filtering, labels, and visibility while retaining all 31 stable icon subtypes for concrete visuals and persisted player-pin values. Settings groups every icon subtype under its automatic broad label, so transport hubs and ordinary transit share one filter, all housing tiers share Residential, and legacy category IDs require no migration.
22. Places now separates catalog filtering from persisted marker visibility. Every populated category and every place row has its own visibility control, with show-all/hide-all shortcuts and mixed-state counts; hidden places stay in local search, detail, Settings, and trip flows. Dense everyday categories default hidden, while convenience stores are additionally excluded from empty-search discovery until their category is selected or a query matches them.
23. Journey planning now exposes explicit current-world place pickers for both start and destination while retaining free-form entry. The Settings-owned new-place flow distinguishes descriptive address/search text from the required canonical coordinate. Separately, the everyday Map can persist any blank map point as the role's current coordinate while idle; this action is locked during traveling/arrived states and does not claim geocoding, GPS, route geometry, or movement animation.
24. Map Settings exposes the Map-owned `system` / Chinese / English / bilingual place-name display preference. The persisted mode applies to authored marker labels, search results, Places rows, and place-card names/addresses without mutating canonical place data, coordinates, search indexing, or existing journeys. Bilingual mode uses one primary marker label and progressive secondary text in browse/detail surfaces; player pins with only one available language are deduplicated. OpenFreeMap basemap labels remain provider-style output and are not switched by this control. Focused unit coverage plus desktop and simulated Pixel 5 Playwright protect language switching, refresh persistence, legacy fallback, and horizontal overflow.
25. Five reality-anchored restaurant records now extend Seoul V1 through `src/lib/seoul-map-food-places.js`. Each has a stable Map/place ID, bilingual name and address, aliases/search terms, `restaurant` category, and reviewed provider-neutral latitude/longitude. They are searchable, focusable, and valid journey destinations through the existing Map contracts. Food Delivery stores only the stable `sourceId`; restaurant menus, bags, orders, and delivery events do not enter Map. Focused Map tests cover all five queries/coordinates, and desktop Chromium plus simulated Pixel 5 Playwright covers search, focus/detail, and destination selection with no page error or horizontal overflow.
26. EVE-4B extends Map storage to V4 with Map-owned `deliveryJourneys` for paid Food Delivery orders. Map stores only the courier route phase, anchors, progress, ETA, and address-revision lineage; Food Delivery remains the owner of order/payment/conversation truth, and Runtime stores only cross-owner references. Player movement and manual position evidence cannot create or complete a delivery journey.
27. Place media V1 keeps canonical place records unchanged while resolving an image-backed card asset for every place. Seven reviewed real-photo derivatives cover the initial exact/area pilot; remaining Seoul and fictional/player places use explicitly labeled category visuals, and every reviewed source page, author, license, source hash, runtime hash, alt text, truth grade, and disclosed crop/conversion is retained in the registry/audit contract.
28. Calendar storage V3 migrates V1/V2 and adds explicit range, all-day, recurrence, requirement, notes, reminder lead, and stable optional `locationRef` fields. Month/Week/Agenda and selected-day/detail views derive occurrences from the source event; the selected occurrence derives departure readiness from Map's canonical current position and selected transport, then starts/reuses one Map Journey only after explicit user action. Map Journey and history retain `sourceCalendarEventId`, and the Map back action restores Calendar context.

Still incomplete:

1. CJA-6 Narrative Timeline remains unimplemented and separately gated; appointment auto-entry, broader Agenda/Activity event families, media callers, richer companions, and interactive HTML are also still unimplemented;
2. Reminders can still use stronger product clarity when a real objective/task cue family is promoted;
3. Full map-package manifest import/export, topology validation, georeferencing, calibrated scale tools, editable faction polygons, and seed-place authoring are not implemented; current import/generation accepts one image plus lightweight pack metadata;
4. route/date/follow-up handoff rules will need more real-world coverage as modules deepen;
5. Calendar and Map world-app presentation contexts need true-device testing together with WorldBook/App Store/Home entry flows;
6. Calendar's relationship adapter still knows concrete Chat/relationship stores and is a candidate for a deeper neutral interface.
7. Mini Scene content is not authored in Calendar or Map. A future event may consume bounded Calendar/Map owner facts only after Event Runtime establishes eligibility and calls the shared AI-required Module.
8. the former Calendar-specific carrier/form proposal is withdrawn. No Mini Scene field, migration, generator button, or registered caller is approved or landed in Calendar.
9. Seoul V1 keeps its fixed CC0 city street-map image as the local fallback. Building-level georeferencing or a local PMTiles upgrade remains a separate slice and must preserve existing place IDs and coordinates.
10. additional real-city packs, true-device gesture/weak-network proof, and large-package/offline-cache validation remain separate and are not started.
11. public-transit lines, stations, schedules, realtime arrivals, fares, and transfer routing are not implemented. A later slice must separately choose a licensed/versioned static topology source and decide whether any keyed realtime adapter is justified without turning provider IDs into Map identity.
12. Footprints remains passive progression with only deterministic authored nearby-facility reveal; no active area exploration or generated discovery candidate exists yet.
13. MJE-1 transport planning, MJE-2 lifecycle/checkpoints, and MJE-4 Footprints/place knowledge are integrated locally; MJE-3's first checkpoint Event Runtime adapter is retained as compatibility evidence with its production trigger suspended.
14. Agenda Journey V1 is implemented as a separate execution owner and app, CJA-4 adds the separate Activity Session timing owner plus embedded Focus Companion baseline, and CJA-5 adds one midpoint-only Activity Session/Event Runtime adapter. Broader Agenda Journey event adapters, appointment auto-entry, Gallery/Music activity callers, richer companions, and Narrative Timeline are not implemented; the direct CJA-1 Calendar-to-Map departure path remains independently valid.
15. ordinary place-focus overview/detail, explicit onsite/inside sessions, `Enter`/leave behavior, manual-versus-journey provenance, and the first location-aware place-entry event are implemented; appointment auto-entry and Activity Session media callers remain unimplemented.
16. the place-media pilot covers seven real-photo derivatives and one fictional fallback; expanding reviewed photography across the remaining Seoul catalog, adding any generated reconstruction, user-selected Gallery media, periodic license revalidation, and true-device image/network evidence remain separate work.

### Withdrawn Calendar Carrier Proposal

Status: `REJECTED / DO_NOT_IMPLEMENT`

The former proposal added `eventType`, `scheduleRole`, `schedulePhase`, and `schedulePlaceLabel` to Calendar and used them to expose a user-invoked scene generator. Product review rejected this model because it made the user design a scene in a schedule editor instead of letting an actually triggered event request AI-generated interaction.

Calendar remains V3 and owns only schedule truth. If a later Event Runtime family needs Calendar evidence, it must consume existing owner facts or add a separately justified domain field for Calendar's own scheduling behavior. It must not add character, phase, place, plot, choice, or scene-type fields merely to feed Mini Scene.

The valid future path is source owner facts -> Event Runtime trigger/eligibility -> `MiniSceneRequest` -> required AI generation -> validation -> Presenter. Calendar and Map do not resolve profiles, execute transforms, create artifacts, or invoke the Presenter directly.

## 2. Recommended Next Slice

Calendar relationship review and memory-lineage detail have reached the current 4.2 acceptance.

MJE-4 is `USER_ACCEPTED / INTEGRATED_LOCAL`. Do not begin MJE-5 without a new user decision. The accepted authored-catalog follow-up now includes the first five stable Food Delivery-to-Map place-ID links; additional neighborhood facilities and any Shopping linkage remain separate later slices.

The prior Map restaurant-place -> Food Delivery storefront/menu/dine-in shortcut is now `DEFERRED / EVENT_CONTRACT_REQUIRED`, not a recommended Map slice. Keep the five stable Map place IDs and Food Delivery `sourceId` links as context only. Before any onsite-consumption implementation, separately accept the activation scope, `MapPlaceSessionCheckpointV1` use, Event Runtime eligibility/projection, Food Delivery-owned Adapter action, visible host surface, order/payment side effects, and return context. Map must not directly open or mutate menus, bags, orders, or payment state merely because a source link exists.

Current safe candidates after the user's event-lane reprioritization:

1. preserve EVE-2C's one-host boundary, Map V3 provenance/session ownership, frozen `MapPlaceSessionCheckpointV1` and resolution validation, and derived projection model.
2. preserve the frozen read-only legacy/exact place-semantic overlay and do not mutate existing place records merely to implement event lookup.
3. do not add another Event host/archetype, EVE-3 World Hub notebook, EVE-4 effect family, EVE-5 Mini Scene/CG surface, or MJE-5 behavior without separate acceptance.
4. preserve CJA-1 Calendar planned truth, CJA-2's hidden coordination-only owner, CJA-3's separate execution truth plus one-step Map lineage, CJA-4's time-only Activity Session owner, CJA-5's single midpoint/0-or-2-minute boundary, and CJA-6A's documentation-only Timeline contract; do not begin broader event families, appointment auto-entry, Gallery/Music activity callers, richer companion state, interactive HTML, or CJA-6B projection implementation without separate user acceptance.
5. user-test Calendar reservation and Map transit world context on a real phone as presentation only.
6. deepen the confirmed-event relationship Adapter without changing Calendar, Chat, or relationship-runtime ownership.
6. keep Reminders as the only raw-cue inbox and add task/objective presentation only for a promoted cue family.
7. preserve the rejection of the Calendar carrier/form proposal; any future Calendar/Map event evidence must be justified by its owner domain before Event Runtime consumes it.
8. for World Suite/Map only, preserve the completed provenance/authored-place reopen proof, Gallery-owned asset-pack lifecycle, typed Catalog, explicit production runtime composition, real persistence receipts, Event/Chat external-reference projection, rollback-safe native mutation Interfaces, serialized execution, and retry from native truth. The next content slice is a reviewed stable-ID K-pop Catalog/manifest; startup caller/UI/activation, binding, relocation, and MJE-5 remain separate gates.

## 3. Do Not Do

1. Do not turn Calendar back into a generic cue dump.
2. Do not let Reminders write relationship facts directly from raw cues.
3. Do not let Map absorb order, ledger, or schedule ownership just because it can show route context.
4. Do not let World Pack reservation or transit labels turn Calendar/Map into world-rule/event owners.
5. Do not execute Mini Scene regex/rendering in Calendar or Map, and do not let scene failure or interaction bypass source-record validation.
6. Do not reintroduce the rejected Calendar Mini Scene carrier fields, scene form, or generator button, and do not derive event eligibility from titles or K-pop prose.
7. Do not move WorldBook content, Mini Scene profiles, Pack state, sensitive choices, Map coordinates, Contacts identity, or Event Runtime provenance into Calendar-owned fields.
8. Do not replace a versioned topology asset in place after player pins exist; publish a new map-pack version and preserve or explicitly migrate coordinates.
9. Do not add a paid/live map SDK to provide visual atmosphere that a local map pack already owns.
10. Do not describe passive Footprints progression or nearby authored-place reveal as active spatial exploration.
11. Do not let Event Runtime mutate journey state directly or evaluate journey events on every animation tick.
12. Do not create a separate Transit app before it has independent network utility, and never let it create a second journey runtime.
13. Do not start the next MJE stage before the current stage is user-accepted and the roadmap status is updated.
14. Do not merge Calendar's `Agenda / 日程` view, the future `Agenda Journey / 行程` app, and Map Journey into one owner or infer activity completion from Map arrival alone.
15. Do not treat CJA-2 completion as implementation or authorization of Agenda Journey, Activity Session, event collaboration, or any later CJA stage.
16. Do not make the standalone Map inspection Adapter mutation-capable or treat native identity/capacity eligibility as permission to install. Mutations are available only through the explicitly constructed Catalog-backed runtime, and that runtime is not activation authority.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
6. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when relationship-fact semantics changed
7. `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` when Calendar/Map Mini Scene request meaning changes
8. `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md` when Journey, Footprints, Exploration, or transport ownership changes
9. `docs/architecture/SIMULATION_EVENT_ENGINE.md` and the event-runtime package when journey checkpoint event collaboration changes
10. `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md` when Calendar, Agenda Journey, Activity Session, Schedule Orchestrator, or Narrative Timeline meaning changes
