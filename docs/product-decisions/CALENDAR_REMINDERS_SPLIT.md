# Calendar And Reminders Split

Updated: 2026-08-10

Audience: product managers, designers, engineers, QA, and future AI assistants.

This is a product-decision document, not a live execution board.

## 1. Decision

SchatPhone splits the old combined cue-and-calendar surface into two product concepts:

| Product concept | Main meaning |
| --- | --- |
| `Calendar` | the schedule/date app for confirmed plans, dates, anniversaries, and timed life events |
| `Reminders` | the follow-up and cue queue for callbacks, logistics updates, low-commitment prompts, and cross-module attention items |
| `Agenda Journey` | the future short-range execution app for today's or the near-term plan, activity progress, performance, and outcomes |
| `Activity Session` | the future timestamp-based duration and focus-companion runtime for one executable activity step |

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
| `src/stores/calendar.js` | owns confirmed events, event-time editing, and real push scheduling state |
| `src/stores/reminders.js` | owns Phone/Shopping/Stock-style cue intake plus reminder persistence and confirmation flow |
| `src/views/CalendarView.vue` world-app UX | may read `reservation -> Calendar` context for title/boundary presentation only |
| `src/views/MapView.vue` world-app UX | may read `transit -> Map` context for title/boundary presentation only |
| `src/views/CalendarView.vue` | schedule-first surface with reminder summary link |
| `src/views/RemindersView.vue` | user-facing cue inbox |
| `/calendar` | confirmed schedule, event editing, push status |
| `/reminders` | cross-module follow-ups and cue confirmation |

This document records the target meaning and the refactor direction. It is not claiming that every historical compatibility seam has been deleted.

The current Calendar frontend is a real Home app, but it is a list-first baseline rather than a conventional visual calendar. It presents summary metrics, confirmed-event cards, push state, a Reminders handoff, and related Map context. It does not yet provide month/week/date-grid navigation, multi-day event spans, or a selected-day planner.

## 4. Target Responsibilities

### Calendar

Calendar should own:

- user-created schedule items
- confirmed dates and plans
- anniversaries and recurring dates
- world or story date entries if later enabled
- timed push scheduling for confirmed events
- relationship facts only when the event is truly schedule-like

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

Agenda Journey is a separately planned short-range execution app. It may materialize confirmed Calendar commitments into a day or near-term plan, add occupation/world-aware steps, request Map travel or an Activity Session, and record completed, missed, skipped, or cancelled execution.

It does not replace Calendar's long-range planning. A multi-day Calendar event such as an August 4-7 concert may create separate linked Agenda Journeys for each day while Calendar preserves the original four-day commitment.

The hidden Schedule Orchestrator coordinates this handoff. It is not a Home app and cannot copy or take ownership of Calendar, Journey, Map, Event Runtime, relationship, Wallet, or profile records.

For a location-bound commitment, Calendar keeps the appointment start/duration/place while Agenda Journey owns separate travel and activity steps. Map recalculates a suggested departure from the current role position rather than treating the planning-origin hint as actual truth. After explicit departure confirmation, Map creates the one canonical Map Journey; opening Map shows that same journey. Validated arrival may satisfy presence and, for an explicitly approved indoor appointment, Map may enter the place session automatically. Arrival never proves the meeting, class, rehearsal, or other activity completed.

Activity Session owns the later activity timer and completion policy. Its Focus Companion presentation may offer Pomodoro or continuous modes, built-in scenes, and stable Gallery/Music/companion references, but it does not move those media assets or playback truth into Calendar or Event Runtime. Optional activity events remain checkpoint-driven and user-controlled; disabling them cannot remove the scheduled activity's base execution path.

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
| 11 | Rebuild the list-first Calendar surface into month/week/Agenda views with selected-day authoring | TODO / SEPARATE_USER_ACCEPTANCE_REQUIRED |
| 12 | Implement Agenda Journey, Activity Session, or Calendar-to-Journey materialization | TODO / STAGED_IN_LIVE_ROADMAP_ONLY |
| 13 | Record dynamic current-position departure, validated appointment entry, and Focus Companion boundaries | DONE / DOCUMENTATION_ONLY |

Implementation notes:

- `src/stores/reminders.js` and `src/views/RemindersView.vue` are already real.
- Reminder persistence is separate from Calendar persistence.
- Calendar still contains compatibility seams where needed, but raw cue ownership no longer belongs there conceptually.
- Raw reminders do not directly write relationship facts; they must first become meaningful confirmed Calendar events.
- When a confirmed Calendar event comes from a Map cue with explicit `sourceTripId`, Calendar should preserve that lineage so relationship runtime can attach the event as supporting context to the existing route memory.

## 7. Guardrails

- Do not rename raw cue queues into "Calendar events" without confirmation.
- Do not let Calendar become a backend log.
- Do not let Reminders replace World Hub controls.
- Do not make World Hub mandatory for users who prefer a light phone-life simulation.
- Do not auto-schedule every cue into push.
- Do not add high-impact relationship/world effects from reminders until runtime review is stronger.
- Do not present the current list-first Calendar baseline as if a month/week grid already exists.
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
