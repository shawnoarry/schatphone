# Map Journey, Footprints, And Exploration Architecture

Updated: 2026-08-10

Status: `APPROVED_DIRECTION / MJE-1_THROUGH_MJE-4_USER_ACCEPTED_INTEGRATED_LOCAL`

This contract defines how Map travel, transport choice, route familiarity, active exploration, and journey-triggered events fit together. In architecture and cross-module records, this domain is always `Map Journey`, distinct from the future `Agenda Journey / 行程` app defined in `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`. `docs/roadmap/TODO_ROADMAP.md` remains the only live execution board. The stage identifiers below define acceptance boundaries; they do not authorize a later stage by themselves.

## 1. Product Decision

Map remains the primary place where a player:

- sees the current world's geography;
- selects a known place or an area;
- starts a journey or an exploration action;
- follows an active journey and reviews route updates without hiding journey progress;
- reviews places and discoveries produced by travel.

Transportation is a journey parameter, not a separate app owner. The first journey-planning surface stays inside Map. A future Transit app may present an independently useful network, but it must consume the same Map-owned journey records instead of creating a second trip runtime.

The former passive `探索 / Explore` dashboard is now presented as `足迹 / Footprints`. Its existing points, route familiarity, area unlocks, static feedback, and history remain passive travel records. Active exploration is a separate player action added later.

## 2. Player Concepts

| Concept | Player intent | Input | Result |
| --- | --- | --- | --- |
| `地图行程 / Map Journey` | Go to a known destination | origin, destination, transport | arrival, cancellation, journey outcomes, route familiarity |
| `足迹 / Footprints` | Review where life has happened | completed journeys and explorations | history, familiarity, activity areas, long-term progress |
| `探索 / Exploration` | Spend time investigating an area | area, time budget, approach, optional companion | discoveries, encounters, knowledge, candidate places |
| `交通网络 / Transit network` | Define how this world can be crossed | modes, static lines/stations/topology | planning options and map presentation, not journey ownership |

Map Journey and Exploration are mutually clear actions. A Map Journey targets a known destination. Exploration targets an area and may discover a destination that did not exist as a player-visible place before the action.

MJE-4 adds one optional place-knowledge policy per world. `all_known` preserves the existing sandbox catalog and is the compatibility default for old saves. `footprint_gated` withholds explicitly eligible authored nearby facilities until a completed Map Journey resolves to a canonical destination coordinate near them. Knowledge and presentation remain separate: locked places are absent from markers, search, pickers, Places, and Settings lists; known places can still be hidden by the existing marker-visibility controls. Switching policy never deletes discovery evidence. Manual role-position changes, cancelled journeys, free text without a resolvable coordinate, and visibility changes never create discoveries.

## 3. User Experience And Information Depth

Map follows progressive disclosure.

### L0: Map Overview

The idle map shows geography, local pin search, compact map controls, visible pins, and explicit `Add place` access. It does not show a large journey card before the player expresses destination or exploration intent.

### L1: Place Or Area Focus

Selecting a pin or search result opens concise place detail with context-appropriate actions:

- `前往 / Go` for a known positioned place;
- `探索附近 / Explore nearby` when the world and area support active exploration;
- place details and player-owned edit entry where allowed.

Selecting an unlocked activity area opens its summary and an exploration entry. Area progression alone must not imply that active exploration already exists.

#### Place Focus And Presence Contract

The next place-focus revision must replace the current all-in-one place modal with one Map-owned focus surface that preserves the map behind it. Desktop may use a drawer and mobile may use a bottom sheet. The surface first shows the place name, category, short summary, distance/presence state, and only the actions valid for the current context. Detailed editing remains in Map Settings, and deeper content replaces the focused surface or opens a dedicated execution surface rather than nesting another modal inside it.

The primary place action is state-derived instead of exposing `Journey` and `Enter` as permanent peers:

| Place relation | Primary action | Required behavior |
| --- | --- | --- |
| `remote` | `Go` | open Map Journey planning for the selected place |
| `traveling_to_place` | `View journey` | focus the already active Map Journey; never create a duplicate trip |
| `onsite` | `Enter` | create or resume an explicit Map-owned place session, then evaluate eligible place-entry events |
| `inside` | context action or `Leave` | retain the explicit place session until the user or an approved linked activity ends it |

`Set as current position` remains a secondary sandbox action for users who want immediate relocation. It must say that it skips travel, retain `manual` position provenance, create no Map Journey or journey-arrival evidence, and continue to reveal no Footprints-gated place. A completed Map Journey uses `journey_arrival` provenance. Event templates and later Agenda Journey requirements may distinguish those sources; changing the coordinate must not fabricate travel history.

`Enter` is a Map/place transition, not an Event Runtime action. Distance may make it unavailable, but distance does not turn an onsite event into a remote event. Place details remain generally available, player-owned management remains permission-gated, and event invitations appear only in a dynamic event area when Event Runtime supplies an eligible or intentionally teased projection. The place card must not contain an empty permanent `Event` navigation button.

### L2: Management

Map Settings owns detailed authoring and administration:

- world-to-map binding;
- player-pin metadata and coordinate reselection;
- map-pack intake and presentation;
- later static transport modes, lines, stations, and topology.

The everyday Map surface may use these records but does not become a network editor.

### L3: Execution

Journey planning and active exploration are focused execution flows. They collect the choices required to start, then return to an active Map state. The first journey flow includes transport selection. Later stages may add explicitly approved participant planning, departure timing, risk preview, checkpoints, and event decisions without crowding the idle map.

## 4. Map Journey Runtime Contract

The Map Journey Runtime is a Map-owned domain Module, not the future Agenda Journey Home app and not an Event Runtime store. It owns canonical map-travel source records and validates every Map Journey transition. A future Agenda Journey step may request Map travel and retain a stable evidence reference, but it cannot write Map Journey state or make arrival prove completion of a non-travel activity.

Target lifecycle:

```text
planning -> ready -> traveling -> arrived
                        |  ^          |
                        v  |          |
                      paused ----- cancelled
```

`paused` is an explicit Map-owned transition that freezes time. A pending checkpoint-event review is an overlay on `traveling`, not a lifecycle phase: the timer, ETA countdown, automatic arrival, and ordinary no-event path continue until Map applies an explicitly reviewed bounded delay.

Compatibility rule: the existing `idle`, `traveling`, and `arrived` records remain readable while the lifecycle is introduced incrementally. A migration must preserve active timers, arrival push lineage, trip history, familiarity rewards, relationship facts, and backup/restore.

The target record may eventually carry:

- stable schema version and journey ID;
- `journeyKind` such as `travel` or `area_exploration`;
- world and map-pack snapshot;
- origin/destination or exploration-area references;
- transport mode and estimate snapshot;
- optional participant references;
- phase and checkpoint plan;
- pending checkpoint-event review reference;
- start, expected arrival, completion, cancellation, and outcome data.

MJE-1 implements only the minimum transport and compatibility fields needed by its acceptance criteria. MJE-1 through MJE-4 are user-accepted and integrated locally. MJE-2 implements only the versioned active-journey lifecycle, deterministic duration-based checkpoint plan, and Map-owned pause/resume data needed for its acceptance. MJE-3 adds only evaluated-checkpoint IDs, one pending-review reference, and cumulative event-delay seconds to journey truth. The persisted `activeInterruption` compatibility key now denotes a pending route-update review only and never authorizes an automatic pause. Journey schema V3 migrates V2 journeys previously blocked by an event back to active timing while retaining proposal lineage and remaining time. Event proposal copy, eligibility, provenance, and audit stay in Event Runtime; no event, leg, companion, destination-change, or broader outcome structure is prebuilt in Map. The existing optional shared-route relationship fact is selected only during arrived-journey acknowledgement; it records settlement context and is not active-journey companion or participant truth.

## 5. Checkpoint-Driven Events

Journey events are evaluated at explicit checkpoints, not on every animation tick. MJE-3 evaluates only the completed `en_route` and `near_arrival` checkpoints from MJE-2, and only while the Map view is mounted so a route update can become visibly pending. The primary active-journey card exposes that pending state without opening the detail drawer automatically or pausing progress. Trips that advance while Map is not active retain the ordinary no-event completion path. A simple duration/progress plan remains sufficient until a licensed static topology exists.

At a checkpoint, Map may submit a bounded source snapshot to Event Runtime containing only canonical facts needed for eligibility, such as:

- journey, checkpoint, world, map-pack, origin, and destination IDs;
- place/area categories and transport mode;
- time context, route familiarity, unlocked activity area, and optional companion IDs;
- story flags, cooldown keys, and the Map transition currently allowed.

Event Runtime owns template eligibility, deterministic selection, cooldowns, caps, proposal/review state, and event logs. It does not mutate the journey directly. The first MJE-3 event family may request only `continue` or a bounded 120-second `delay`; Map validates Event Runtime authorization plus exact proposal, event, journey, and checkpoint lineage before applying either result. A pending proposal and `continue` leave ETA unchanged; only the reviewed delay adds 120 seconds and reschedules the arrival timer/push. Arrival may dismiss an unreviewed proposal without blocking completion. Destination change, event-driven cancellation, funds, assets, relationships, identity, and schedule outcomes remain unimplemented and separately gated.

An ordinary uneventful journey is always valid. Event frequency must respect module permission, Surprise Mode, cooldowns, daily caps, and world-aware variants. High-impact relationship, asset, money, or identity effects retain their existing confirmation and owner boundaries.

### Place-Entry Event Eligibility

Location-aware event templates keep an authored activation scope such as `remote`, `nearby`, `onsite`, `interior`, or `journey_checkpoint`. The scope is stable template meaning; current distance only decides whether its entry conditions are satisfied. A remote event therefore needs an explicit remote interaction such as a call, reservation, or message. It is never synthesized merely because the role is far away.

Map owns the bounded presence facts supplied to Event Runtime: current world/map pack, stable place and coordinate, distance relation, active Map Journey reference when present, position provenance, and explicit place-session state. Event Runtime owns template eligibility, visibility policy, cooldown/cap, proposal/review, and event logs. A template may remain hidden until eligible, expose a disabled teaser with a reason, or remain visible when remote interaction is genuinely supported.

Entering a place creates an explicit checkpoint. Event Runtime may return no event, one invitation, or a bounded set of invitations. No event is a complete path. An invitation is a separate event surface with its own expansion action; it is not a second level of place management and does not make the place card the event record.

A future Agenda Journey step may request Map travel and may carry an explicit arrival behavior such as arrival outside or validated automatic entry for an appointment inside a known place. Map still validates the exact active journey, destination, arrival evidence, and place session before changing presence. Arrival or entry can satisfy an Agenda Journey travel/presence requirement, but it cannot prove that a meeting, class, rehearsal, or other non-travel activity completed.

### Large-Map Event Card Direction

The current MJE-3 route-update card remains the implemented baseline. The next cross-module event lane may add coordinate-anchored event cards to the existing Map UI without making Event a desktop app or making Map the event owner.

Map owns:

- validation and rendering of geographic latitude/longitude anchors and fictional/custom normalized-canvas anchors;
- event-pin placement, selected-card layout, clustering/stacking, viewport focus, and overlap avoidance;
- the compact `Expand event` command and return-to-map context;
- accessibility, text fitting, mobile drawer/sheet behavior, and coexistence with Journey, Places, Footprints, place detail, and Music layers.

Coordinate-card selection and place selection are related but distinct host paths. Selecting an event pin opens the compact Event Surface Projection. Selecting an ordinary place opens the place-focus surface and shows a location-aware event invitation only when eligibility or an approved teaser policy provides one. Ordinary map pan, focus, and place selection never open a full event scene automatically.

Map consumes a bounded Event Surface Projection. Event Runtime retains proposal/log truth and the source module retains its record and effect validation. An event anchor may reference an existing stable place or carry a coordinate snapshot, but it cannot create a place, change marker visibility/knowledge, move the role, change a journey, or become provider-owned location identity.

The first Map implementation belongs to roadmap EVE-2C, not MJE-5. EVE-2A froze the reusable K-pop-first template/instance/place-capability/text/media contract, Map Place Session input Interface, and production-arrival-briefing archetype; EVE-2B has implemented the separately accepted Event Runtime foundation without changing Map. Expanding the future EVE-2C card is presentation only; optional text materialization remains Event-owned and locally validated, while every result still returns through the owning Adapter. A later Mini Scene or CG Adapter remains separately gated.

Invalid, stale, off-pack, or unpositioned anchors fail closed to the owning host and World Hub review. They never receive an invented fallback coordinate. Multiple cards near the same screen point must collapse behind one stable cluster/stack control instead of overlapping each other or obscuring primary Map controls.

## 6. Footprints And Active Exploration

The current Map progression already derives:

- exploration points from completed trips;
- repeated-route familiarity tiers;
- activity-area unlocks from points, trip counts, and familiar/trusted routes;
- static area feedback and related Calendar/WorldBook suggestions.

This becomes Footprints. Renaming must preserve stored history and calculations; it is an information-architecture correction, not a destructive data migration.

Active Exploration is added later as a Map action:

```text
choose area -> choose time/approach -> begin -> resolve exploration checkpoints
-> discover or learn -> keep/discard candidate place -> settle Footprints outcomes
```

Possible outputs follow owner boundaries:

- Map owns a confirmed discovered place, safe route, area knowledge, and exploration record;
- Event Runtime owns eligibility/provenance for triggered encounters;
- WorldBook/Book owns committed world knowledge or lore content;
- Calendar owns a confirmed follow-up schedule;
- Relationship Runtime receives only confirmed relationship facts through its adapter;
- Gallery owns retained image assets.

Unlocking an area may make exploration eligible, but it must not silently create canonical places or apply hidden high-impact effects.

## 7. Transportation Boundary

Before departure, Map Journey Planning owns transport selection and its estimate snapshot. Transport mode changes expected duration/cost but does not claim real navigation, live fare accuracy, or route-service precision.

Map Settings may later own a versioned static transport catalog for a map pack:

- stable world-neutral mode IDs with world-specific labels;
- static lines, stations, stops, and topology;
- availability and presentation rules;
- locally maintained estimate profiles.

Realtime arrivals, traffic, live fare lookup, and transfer routing require separate provider, licensing, privacy, failure, and cost decisions. Provider IDs cannot become canonical SchatPhone place or journey identity.

A separate Transit app is justified only when players can use it independently to do several of the following:

- browse a meaningful line/station network without first choosing a destination;
- inspect timetables, tickets, passes, vehicles, or service status;
- manage or author a world transport network;
- follow a transport-specific progression loop.

Until that threshold is met, transport stays in Map Journey Planning and Map Settings.

## 8. Ownership Matrix

| Owner | Owns | Must not own |
| --- | --- | --- |
| Map / Map Journey Runtime | journey source record, phase, transport snapshot, checkpoints, arrival/cancellation, exploration and discovered places | Agenda Journey execution, event eligibility/cooldowns, confirmed schedules, relationship truth |
| Future Agenda Journey | short-range activity plan, steps, completion/miss state, Map evidence references | Map Journey travel truth, Calendar history, event eligibility |
| Event Runtime | eligibility, deterministic/random gate, cooldown/cap, proposal/review, provenance, event log, and source data for bounded surface projections | Map rendering, journey transitions, pins, routes, places |
| Calendar | confirmed departure/arrival/follow-up schedule and push timing | active journey state or event eligibility |
| Relationship Runtime | confirmed relationship facts, metrics and memory grouping | journey or event-source records |
| WorldBook / Book | world knowledge and reviewed narrative content | active journey state or automatic Map mutation |
| Map Settings / map pack | static transport catalog and topology when implemented | live provider truth or a second trip runtime |

## 9. Executable Stages

Only the matching entry in `docs/roadmap/TODO_ROADMAP.md` controls live status.

### MJE-1: Journey Planning Foundation

Status: `USER_ACCEPTED / IMPLEMENTED_IN_CURRENT_TREE` (uncommitted; no integrated commit claimed).

User-visible result: choose transport before departure; estimate and journey/history snapshot reflect the selected mode; old trip data remains readable.

Boundary: no events, checkpoints, companions, route planning, transit topology, or active exploration.

### MJE-2: Journey Lifecycle And Checkpoints

Status: `USER_ACCEPTED / IMPLEMENTED_IN_CURRENT_TREE` (uncommitted; no integrated commit claimed).

User-visible result: an active journey has explicit stages and a small deterministic checkpoint plan, can pause/resume safely, and still completes without an event.

Start gate: satisfied by explicit user acceptance of MJE-1 and its validated implementation in the current physical tree. MJE-2 was then accepted when the user explicitly authorized MJE-3. The uncommitted integration state remains explicit.

Boundary: preserve `idle`, `traveling`, and `arrived` compatibility while adding a versioned active-journey phase and a small ordered checkpoint plan. Pause/resume is a Map-owned transition seam that freezes remaining duration, timer, and arrival push scheduling; no production flow pauses automatically and no Event Runtime request, result, failure, or audit field is stored in this stage.

### MJE-3: First Journey Event Adapter

Status: `USER_ACCEPTED / IMPLEMENTED_IN_CURRENT_TREE` (uncommitted; no integrated commit claimed).

User-visible result: one low-impact, world-aware checkpoint event family can appear as a pending route update while the journey continues. The map-level journey card remains prominent, opens detail on demand, and makes clear that only accepting a bounded delay changes ETA. Uneventful completion remains covered.

Start gate: satisfied by the user's explicit MJE-3 authorization after accepting the MJE-2 behavior.

Acceptance evidence: the user confirmed that the sample journey event appears during travel and does not pause the journey. Event copy/values and later transport, owned-vehicle, driving-ability, and other world-variable variants remain deferred to the separate project-event work.

Boundary: Event Runtime evaluates only completed `en_route` and `near_arrival` checkpoints while Map is mounted, using Map module permission, Surprise Mode, deterministic randomness, cooldown, daily cap, local world variants, persistent proposals, and audit logs. Map validates every reviewed result and accepts only no ETA change or a 120-second delay. Event eligibility never pauses the journey or opens the detail drawer automatically; a missing, stale, non-pending, or arrival-expired proposal can be cleared without changing journey truth. No generic popup system, Event Runtime tick integration, destination change, cancellation outcome, high-impact owner mutation, Agenda Journey integration, or active exploration is implemented.

### MJE-4: Footprints Information Architecture

Status: `USER_ACCEPTED / INTEGRATED_LOCAL`.

User-visible result: the current passive progression is labeled and explained as Footprints; Journey and active Exploration remain distinct; existing points, familiarity, unlocks, feedback, and history are preserved. Map Settings offers `All places known` and `Discover through Footprints` per world. In the gated mode, a completed positioned journey can reveal a small deterministic set of nearby authored convenience stores or pharmacy districts, which then become available in the map, search, journey pickers, Places, and Settings.

Start gate: satisfied by the user's explicit MJE-3 acceptance and approval of the per-world all-known versus Footprints-gated discovery direction.

Acceptance evidence: the user verified the per-world knowledge choice and the nearby authored-place reveal flow after the role-position endpoint correction made saved coordinates authoritative for trip distance estimates.

Boundary: old saves normalize to `all_known`. Discovery state is keyed by world and map pack, retains stable place IDs plus trip-arrival evidence, and is backed up/restored through Map persistence. New journeys snapshot world/map-pack lineage. Each arrival reveals at most four eligible authored facilities within 1.2 km using the existing provider-neutral distance calculation and stable distance/ID ordering. It does not reveal from manual role-position changes or cancelled journeys. It does not add Event Runtime outcomes, generated places, candidate acceptance, active-exploration timers/checkpoints, keep/discard ownership, transit topology, route planning, or POI services.

### MJE-5: Active Area Exploration

User-visible result: select an eligible area and time budget, resolve exploration checkpoints, and explicitly keep a discovered place or knowledge outcome.

Start gate: Footprints semantics and at least one safe exploration outcome contract are accepted.

### MJE-6: Static Transit Topology And App Decision

User-visible result: reviewed map packs may expose static modes/lines/stations in Map Settings and journey planning. A separate Transit app is reconsidered only against the independent-use threshold in Section 7.

Cross-lane note: roadmap EVE-1/EVE-2 owns the shared event projection and the first large-map coordinate card. Completing either does not authorize MJE-5 active exploration, generated place candidates, event-driven place reveal, or MJE-6 transit topology.

## 10. Guardrails

Treat these as bugs:

1. the idle Map shows Journey, Footprints, Exploration, and transport administration as equally weighted controls;
2. a transport selector does not change the estimate or saved journey snapshot;
3. an event tick mutates a Map journey without a checkpoint and Map validation;
4. every journey is forced to produce an event;
5. area unlock copy implies discoverable places/events that the runtime cannot produce;
6. Footprints data is deleted or reset merely because the tab is renamed;
7. a separate Transit app creates a second journey state or appears before it has independent utility;
8. static topology quietly becomes live navigation, paid POI search, or provider-owned identity;
9. a completed implementation stage automatically starts the next stage before user acceptance and roadmap update.
10. an event projection creates a Map place, changes discovery/visibility, or mutates a journey merely because it has a coordinate anchor;
11. event cards overlap each other, obscure primary Map controls, or open an event automatically when the user only pans/selects the map;
12. EVE-2 is treated as authorization for MJE-5 active exploration or Mini Scene runtime.
13. a selected place exposes a permanent `Event` button when no eligible or intentionally teased event exists;
14. distance silently reclassifies an onsite/interior event as a remote event;
15. manual role-position relocation is recorded as journey arrival or satisfies a journey-arrival-only event gate;
16. place overview, details, management, and event execution are stacked as nested modals instead of using progressive disclosure.

## 11. Validation Contract

Each behavior stage requires focused unit coverage for normalization, transitions, persistence, and owner boundaries; full lint, unit, and production build gates; and targeted desktop plus simulated-mobile E2E for the visible Map flow. Event stages also require deterministic no-event, cooldown/cap, adapter failure, non-blocking pending review, legacy blocked-journey recovery, arrival dismissal, and audit-log coverage. EVE-2 additionally requires geographic plus fictional/custom anchor tests, stale/off-pack fallback, clustering/stacking, event-card text fit, layer coexistence, page-error checks, and zero horizontal overflow. Schema or dependency changes require the additional checks in `docs/process/AI_WORK_MODE.md`.
