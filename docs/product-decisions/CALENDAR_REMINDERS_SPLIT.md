# Calendar And Reminders Split

Updated: 2026-08-16

Audience: product managers, designers, engineers, QA, and future AI assistants.

This is a product-decision document, not a live execution board.

## 1. Decision

SchatPhone splits the old combined cue-and-calendar surface into two product concepts:

| Product concept | Main meaning |
| --- | --- |
| `Calendar` | the schedule/date app for confirmed plans, dates, anniversaries, and timed life events |
| `Reminders` | the follow-up and cue queue for callbacks, logistics updates, low-commitment prompts, and cross-module attention items |
| `Agenda Journey` | the short-range execution app for today's or the near-term plan, activity progress, evidence, and outcomes |
| `Activity Session` | the timestamp-based duration and focus-companion runtime for one executable activity step |

Short version:

- `Calendar` answers: what is actually on my schedule?
- `Reminders` answers: what still needs my attention or confirmation?
- `Agenda Journey` answers: what should I execute now or soon, and what actually happened?
- `Activity Session` answers: how long is this activity running, and what completion evidence does its step require?
- `World Hub` remains the optional runtime/control app, not the normal place for everyday reminders.
- `World Pack` may change Calendar labels/context through a reservation app binding and Map labels/context through a transit app binding, but it does not own Calendar records, Map trip truth, or event judgment.

`Calendar` is the English product name for the visible `日历` app. It is not the name of the hidden cross-module orchestration layer. That internal role is `Schedule Orchestrator / 时间编排模块` under `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`.

## 2. Why This Split Exists

The old combined model worked technically, but it mixed two very different user expectations:

- schedule and date management;
- cue confirmation and follow-up intake.

Without the split, `Calendar` would slowly read like a backend event log instead of a believable phone app.

The new boundary protects immersion:

- `Calendar` = confirmed schedule meaning
- `Reminders` = pending follow-up meaning
- `World Hub` = optional runtime review/control meaning

## 3. Current Implementation Reality

Current project state:

| Area | Current behavior |
| --- | --- |
| `src/stores/calendar.js` | owns confirmed events, event-time editing, real push scheduling state, and optional stable Map destination references |
| `src/stores/reminders.js` | owns Phone/Shopping/Stock-style cue intake plus reminder persistence and confirmation flow |
| `src/views/CalendarView.vue` world-app UX | may read `reservation -> Calendar` context for title/boundary presentation only |
| `src/views/MapView.vue` world-app UX | may read `transit -> Map` context for title/boundary presentation only |
| `src/views/CalendarView.vue` | schedule-first surface with reminder summary link and current-origin departure readiness for location-bound events |
| `src/stores/agendaJourney.js` | owns persisted manual/Calendar-derived near-term execution plans, travel/activity steps, evidence references, and outcomes |
| `src/stores/activitySession.js` | owns one persisted absolute-time activity session per stable Agenda activity-step ID, pause/completion policy, checkpoints, and Agenda acknowledgement evidence |
| `src/views/AgendaJourneyView.vue` | today/near-term execution surface with explicit departure and activity actions |
| `src/views/RemindersView.vue` | user-facing cue inbox |
| `/calendar` | confirmed schedule, event editing, push status |
| `/agenda-journey` | short-range execution, linked Map travel, and explicit activity confirmation |
| `/reminders` | cross-module follow-ups and cue confirmation |

This document records the target meaning and the refactor direction. It is not claiming that every historical compatibility seam has been deleted.

The current Calendar frontend is a real Home app and a conventional schedule workspace. CJA-1 presents Month, Week, and Agenda views, selected-day and selected-event detail, all-day/multi-day/recurring occurrence projection, full manual create/edit/delete, push/reminder policy, a Reminders handoff, and related Map departure context. These are views over Calendar-owned source events, not copied schedule records.

## 4. Target Responsibilities

### Calendar

Calendar should own:

- user-created schedule items
- confirmed dates and plans
- anniversaries and recurring dates
- world or story date entries if later enabled
- timed push scheduling for confirmed events
- relationship facts only when the event is truly schedule-like
- stable destination identity through an optional Map-owned `locationRef`, without copying coordinates, ETA, or route truth

Calendar's target visible views are:

- `Month`: date grid and multi-day event spans;
- `Week`: time blocks and conflict review;
- `Agenda / 日程`: a chronological list of the same Calendar events;
- selected-day event detail and event authoring.

`日程` is a Calendar view, not a second long-range planning app.

Calendar should not own:

- raw cross-module cue queues
- logistics status queues
- stock review prompts before user confirmation
- World Hub control state
- generic event logs
- short-range Agenda Journey execution state
- Map Journey truth or Activity Session timing
- Event Runtime eligibility, randomness, choices, or effect application

### Agenda Journey

Agenda Journey is a separately implemented short-range execution app. CJA-3 materializes confirmed Calendar occurrences into near-term plans, accepts manual plans through the next 14 days, requests Map travel for stable destination steps, and records completed, missed, skipped, or cancelled execution. Occupation/world-aware templates and Activity Session remain later extensions.

It does not replace Calendar's long-range planning. A multi-day Calendar event such as an August 4-7 concert may create separate linked Agenda Journeys for each day while Calendar preserves the original four-day commitment.

The hidden Schedule Orchestrator coordinates this handoff. CJA-2 implements deterministic occurrence materialization/deadline requests, acknowledgement seams, persistence, backup, and resume reconciliation without creating an Agenda Journey record itself. CJA-3 consumes and acknowledges those requests in the separate Agenda Journey owner. The orchestrator is not a Home app and cannot copy or take ownership of Calendar, Agenda Journey, Map, Event Runtime, relationship, Wallet, or profile records.

For a location-bound commitment, Calendar keeps the appointment start/duration/place. The landed direct V1 handoff asks Map to recalculate a suggested departure from the current role position and selected transport rather than treating the planning-origin hint as actual truth. After explicit departure confirmation, Map creates or reuses the one canonical Map Journey and Calendar retains only the stable source link. This direct path creates no Agenda Journey step. In the CJA-3 flow, Agenda Journey owns separate travel and activity steps and Map retains only `sourceAgendaJourneyStepId` lineage. Validated arrival completes travel and unlocks activity; automatic place entry remains later, and arrival never proves the meeting, class, rehearsal, or other activity completed.

Activity Session owns the activity timer and completion policy. CJA-4 follows the Agenda step duration, supports explicit `duration_sufficient` or `user_confirmation`, bounded pause/resume or continuous timing, absolute-time reopen reconciliation, and one built-in quiet Focus Companion scene. CJA-5 adds one midpoint-only optional event whose `off` mode automatically keeps rhythm and whose inline `text` mode may request only a 2-minute recovery buffer after Activity Session validates exact lineage. Later Pomodoro/custom modes and stable Gallery/Music/companion references remain separate extensions; media assets and playback truth do not move into Calendar, Activity Session, or Event Runtime. Disabling optional activity events cannot remove the scheduled activity's base execution path.

### Reminders

Reminders should own:

- callback reminders
- logistics follow-ups
- package or delivery follow-ups
- stock review prompts
- map or place follow-up prompts
- world/task objectives that need user attention
- confirmation or dismissal state before something becomes a real scheduled event

Reminders may promote an item into Calendar after explicit user confirmation.

Example:

| Source module | Reminders behavior | Calendar behavior |
| --- | --- | --- |
| Phone | "Call this contact back" appears in Reminders | Calendar only receives it if the user schedules a callback time |
| Map | "Return to this place" appears in Reminders | Calendar only receives it if the user turns it into a timed plan |
| Shopping | "Package arriving soon" appears in Reminders | Calendar only receives it if the user wants a date-bound reminder |
| World/task system | objective appears in Reminders | Calendar only receives a date-bound objective |

### World Hub

World Hub should own:

- optional runtime review
- future event intensity and override controls
- selected cleanup or approval flows
- advanced inspection of world/runtime state

World Hub should not become the ordinary reminder-management app.

Technical compatibility note:

- route stays `/control-center`
- feature toggle stays `control_center`
- Home app id stays `app_control_center`

## 5. Relationship With World Control

Reminders can act as the user-facing task surface for world-aware gameplay without forcing every user into a game dashboard.

Intended flow:

1. world or module systems generate cue packs
2. World Hub may review/control them when that optional lane is enabled
3. Reminders shows the user-facing actionable subset
4. Calendar receives only the items that have schedule/date meaning
5. the Schedule Orchestrator may materialize confirmed near-term Calendar commitments into Agenda Journey instances
6. Agenda Journey may request one Map Journey from the current canonical position and later consume arrival/cancellation evidence
7. Activity Session may run the duration-based activity and optional Focus Companion presentation
8. Event Runtime may evaluate explicit checkpoints while every source owner keeps its own truth

This preserves the main product principle:

> events, tasks, and numbers should support immersion, not overpower it.

## 6. Implementation Status

Recommended sequence and current status:

| Step | Task | Status |
| --- | --- | --- |
| 1 | Record the product split and naming decision | DONE |
| 2 | Introduce `Reminders` as a first-class planned module | DONE |
| 3 | Add a code seam for Reminders without breaking Calendar | DONE |
| 4 | Move raw cue ownership out of `calendarStore` into `remindersStore` | DONE |
| 5 | Keep confirmed events and push scheduling in Calendar | DONE |
| 6 | Make `/calendar` schedule-first instead of cue-first | DONE |
| 7 | Give Reminders a visible Home-level entry direction | DONE |
| 8 | Keep regression coverage for Map/Phone/Shopping/Stock cue behavior | PARTIAL_DONE |
| 9 | Allow Calendar confirmed events to write low-impact relationship facts | DONE |
| 10 | Record Calendar versus Agenda Journey versus hidden Schedule Orchestrator ownership | DONE |
| 11 | Rebuild the list-first Calendar surface into month/week/Agenda views with selected-day authoring | DONE / 2026-08-15 |
| 12 | Implement the hidden Calendar-occurrence materialization/deadline coordination seam | DONE / CJA-2 / 2026-08-16 |
| 13 | Record dynamic current-position departure, validated appointment entry, and Focus Companion boundaries | DONE |
| 14 | Implement stable Calendar destination reference, current-origin departure readiness, and explicit one-Journey Map handoff | DONE / 2026-08-15 |
| 15 | Implement Agenda Journey V1 records, orchestration consumption, Map travel evidence, and visible execution UI | DONE / CJA-3 / 2026-08-16 |
| 16 | Implement one Activity Session owner and restrained Focus Companion baseline | DONE / CJA-4 / 2026-08-16 |
| 17 | Implement one midpoint-only low-impact Activity Session Event Runtime collaboration | DONE / CJA-5 / 2026-08-16 |
| 18 | Implement appointment auto-entry, broader event families, media callers/richer companions, interactive HTML, or Narrative Timeline | TODO / STAGED_IN_LIVE_ROADMAP_ONLY |

Implementation notes:

- `src/stores/reminders.js` and `src/views/RemindersView.vue` are already real.
- Reminder persistence is separate from Calendar persistence.
- Calendar still contains compatibility seams where needed, but raw cue ownership no longer belongs there conceptually.
- Raw reminders do not directly write relationship facts; they must first become meaningful confirmed Calendar events.
- When a confirmed Calendar event comes from a Map cue with explicit `sourceTripId`, Calendar should preserve that lineage so relationship runtime can attach the event as supporting context to the existing route memory.
- Calendar storage V3 migrates V1/V2 events and adds explicit ranges, all-day state, recurrence, requirement, notes, reminder lead time, and optional `locationRef`. It does not infer a destination from title, summary, coordinates, current position, or a usual address.
- Map Journey stores `sourceCalendarEventId` for direct Calendar travel or `sourceAgendaJourneyStepId` for CJA-3 travel, recomputes transport/lateness from current Map truth, blocks a second unrelated active journey, and returns to the matching source context. Auto-entry and Map/Agenda event collaboration remain separate from the landed Activity Session midpoint family.
- Schedule Orchestrator storage V1 retains deterministic source IDs, occurrence timing, Calendar fingerprints, request/acknowledgement evidence, and acknowledged Agenda Journey IDs. It does not persist Calendar titles/notes, Agenda steps, Map estimates, or downstream effects; older backups without the nested child restore an empty owner state for deterministic rebuilding.
- Agenda Journey storage V1 retains manual/Calendar source identity, execution snapshots, travel/activity state, bounded Map evidence references, source-retirement review, and outcomes. Its backup is nested under the existing Calendar section, while Map continues to own route state and arrival truth.
- Activity Session storage V2 retains stable Agenda Journey references, absolute timing, pause/completion policy, deterministic checkpoints, presentation-minimized state, bounded owner-validated event resolutions, and Agenda acknowledgement evidence; V1 migrates with an empty resolution ledger. Its backup is nested under the existing Calendar section. Simulation V6 introduced the CJA-5 event records and `off | text` policy, which the current V7 carrier preserves. Focus Companion remains embedded in Agenda Journey and creates no second Home app, Map clock, media owner, or event system.

## 7. Guardrails

- Do not rename raw cue queues into "Calendar events" without confirmation.
- Do not let Calendar become a backend log.
- Do not let Reminders replace World Hub controls.
- Do not make World Hub mandatory for users who prefer a light phone-life simulation.
- Do not auto-schedule every cue into push.
- Do not add high-impact relationship/world effects from reminders until runtime review is stronger.
- Do not let occurrence projections, selected-day rows, or Agenda entries become copied Calendar records.
- Do not create another long-range planner inside Agenda Journey.
- Do not use unqualified `Journey` in architecture, persistence, or event contracts when Map Journey and Agenda Journey could both apply.
- Do not make the Schedule Orchestrator a visible app or a new owner of downstream records.
- Do not store a fixed departure projection as Calendar truth after the current Map position changes.
- Do not create a second travel timer or Activity Session for a duration already owned by Map Journey.
- Do not make optional Event Runtime content a prerequisite for the base scheduled activity.

## 8. Acceptance Criteria

The split is considered product-complete when:

- Calendar can be explained as a normal schedule/date app;
- Reminders can be explained as the place for callbacks, follow-ups, package updates, and task cues;
- existing Map/Phone/Shopping/Stock/Food Delivery cues still have a clear home;
- push scheduling still works for confirmed timed events;
- World Hub remains optional and hidden unless enabled;
- Chat and relationship runtime read meaningful confirmed facts instead of noisy raw cue drafts.

Future Calendar/Agenda Journey orchestration acceptance is separate. Its dependency order, timer limits, event interaction policy, narrative projection, and owner Interfaces are defined in `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`; this product-decision file is not a second implementation backlog.
