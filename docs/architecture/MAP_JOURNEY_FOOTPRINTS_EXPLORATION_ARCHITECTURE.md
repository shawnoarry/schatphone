# Map Journey, Footprints, And Exploration Architecture

Updated: 2026-07-31

Status: `APPROVED_DIRECTION / MJE-1_USER_ACCEPTED_IMPLEMENTED_IN_CURRENT_TREE / MJE-2_USER_ACCEPTED_IMPLEMENTED_IN_CURRENT_TREE / MJE-3_READY_FOR_USER_REVIEW`

This contract defines how Map travel, transport choice, route familiarity, active exploration, and journey-triggered events fit together. In architecture and cross-module records, this domain is always `Map Journey`, distinct from the future `Agenda Journey / 行程` app defined in `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`. `docs/roadmap/TODO_ROADMAP.md` remains the only live execution board. The stage identifiers below define acceptance boundaries; they do not authorize a later stage by themselves.

## 1. Product Decision

Map remains the primary place where a player:

- sees the current world's geography;
- selects a known place or an area;
- starts a journey or an exploration action;
- follows an active journey and reviews route updates without hiding journey progress;
- reviews places and discoveries produced by travel.

Transportation is a journey parameter, not a separate app owner. The first journey-planning surface stays inside Map. A future Transit app may present an independently useful network, but it must consume the same Map-owned journey records instead of creating a second trip runtime.

The current `探索 / Explore` dashboard is useful but is not yet active spatial exploration. Its existing exploration points, route familiarity, area unlocks, and static feedback become the foundation of `足迹 / Footprints`. Active exploration is a separate player action added later.

## 2. Player Concepts

| Concept | Player intent | Input | Result |
| --- | --- | --- | --- |
| `地图行程 / Map Journey` | Go to a known destination | origin, destination, transport | arrival, cancellation, journey outcomes, route familiarity |
| `足迹 / Footprints` | Review where life has happened | completed journeys and explorations | history, familiarity, activity areas, long-term progress |
| `探索 / Exploration` | Spend time investigating an area | area, time budget, approach, optional companion | discoveries, encounters, knowledge, candidate places |
| `交通网络 / Transit network` | Define how this world can be crossed | modes, static lines/stations/topology | planning options and map presentation, not journey ownership |

Map Journey and Exploration are mutually clear actions. A Map Journey targets a known destination. Exploration targets an area and may discover a destination that did not exist as a player-visible place before the action.

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

MJE-1 implements only the minimum transport and compatibility fields needed by its acceptance criteria. It is user-accepted and implemented in the current uncommitted tree; this does not claim an integrated commit. MJE-2 implements only the versioned active-journey lifecycle, deterministic duration-based checkpoint plan, and Map-owned pause/resume data needed for its acceptance; it is user-accepted in the same tree. MJE-3 adds only evaluated-checkpoint IDs, one pending-review reference, and cumulative event-delay seconds to journey truth. The persisted `activeInterruption` compatibility key now denotes a pending route-update review only and never authorizes an automatic pause. Journey schema V3 migrates V2 journeys previously blocked by an event back to active timing while retaining proposal lineage and remaining time. Event proposal copy, eligibility, provenance, and audit stay in Event Runtime; no event, leg, companion, destination-change, or broader outcome structure is prebuilt in Map. The existing optional shared-route relationship fact is selected only during arrived-journey acknowledgement; it records settlement context and is not active-journey companion or participant truth.

## 5. Checkpoint-Driven Events

Journey events are evaluated at explicit checkpoints, not on every animation tick. MJE-3 evaluates only the completed `en_route` and `near_arrival` checkpoints from MJE-2, and only while the Map view is mounted so a route update can become visibly pending. The primary active-journey card exposes that pending state without opening the detail drawer automatically or pausing progress. Trips that advance while Map is not active retain the ordinary no-event completion path. A simple duration/progress plan remains sufficient until a licensed static topology exists.

At a checkpoint, Map may submit a bounded source snapshot to Event Runtime containing only canonical facts needed for eligibility, such as:

- journey, checkpoint, world, map-pack, origin, and destination IDs;
- place/area categories and transport mode;
- time context, route familiarity, unlocked activity area, and optional companion IDs;
- story flags, cooldown keys, and the Map transition currently allowed.

Event Runtime owns template eligibility, deterministic selection, cooldowns, caps, proposal/review state, and event logs. It does not mutate the journey directly. The first MJE-3 event family may request only `continue` or a bounded 120-second `delay`; Map validates Event Runtime authorization plus exact proposal, event, journey, and checkpoint lineage before applying either result. A pending proposal and `continue` leave ETA unchanged; only the reviewed delay adds 120 seconds and reschedules the arrival timer/push. Arrival may dismiss an unreviewed proposal without blocking completion. Destination change, event-driven cancellation, funds, assets, relationships, identity, and schedule outcomes remain unimplemented and separately gated.

An ordinary uneventful journey is always valid. Event frequency must respect module permission, Surprise Mode, cooldowns, daily caps, and world-aware variants. High-impact relationship, asset, money, or identity effects retain their existing confirmation and owner boundaries.

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
| Event Runtime | eligibility, deterministic/random gate, cooldown/cap, proposal/review, provenance and event log | Map journey transitions, pins, routes, places |
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

Status: `READY_FOR_USER_REVIEW` (implemented and validated in the current uncommitted tree; not `DONE` or integrated).

User-visible result: one low-impact, world-aware checkpoint event family can appear as a pending route update while the journey continues. The map-level journey card remains prominent, opens detail on demand, and makes clear that only accepting a bounded delay changes ETA. Uneventful completion remains covered.

Start gate: satisfied by the user's explicit MJE-3 authorization after accepting the MJE-2 behavior.

Boundary: Event Runtime evaluates only completed `en_route` and `near_arrival` checkpoints while Map is mounted, using Map module permission, Surprise Mode, deterministic randomness, cooldown, daily cap, local world variants, persistent proposals, and audit logs. Map validates every reviewed result and accepts only no ETA change or a 120-second delay. Event eligibility never pauses the journey or opens the detail drawer automatically; a missing, stale, non-pending, or arrival-expired proposal can be cleared without changing journey truth. No generic popup system, Event Runtime tick integration, destination change, cancellation outcome, high-impact owner mutation, Agenda Journey integration, or active exploration is implemented.

### MJE-4: Footprints Information Architecture

User-visible result: the current passive progression is labeled and explained as Footprints; Journey and active Exploration entries are distinct; existing points, familiarity, unlocks, and feedback are preserved.

### MJE-5: Active Area Exploration

User-visible result: select an eligible area and time budget, resolve exploration checkpoints, and explicitly keep a discovered place or knowledge outcome.

Start gate: Footprints semantics and at least one safe exploration outcome contract are accepted.

### MJE-6: Static Transit Topology And App Decision

User-visible result: reviewed map packs may expose static modes/lines/stations in Map Settings and journey planning. A separate Transit app is reconsidered only against the independent-use threshold in Section 7.

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

## 11. Validation Contract

Each behavior stage requires focused unit coverage for normalization, transitions, persistence, and owner boundaries; full lint, unit, and production build gates; and targeted desktop plus simulated-mobile E2E for the visible Map flow. Event stages also require deterministic no-event, cooldown/cap, adapter failure, non-blocking pending review, legacy blocked-journey recovery, arrival dismissal, and audit-log coverage. Schema or dependency changes require the additional checks in `docs/process/AI_WORK_MODE.md`.
