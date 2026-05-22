# Calendar And Reminders Split

Updated: 2026-05-19

Audience: product managers, designers, engineers, QA, and future AI assistants.

This is a product-decision document, not a live execution board.

## 1. Decision

SchatPhone splits the old combined cue-and-calendar surface into two product concepts:

| Product concept | Main meaning |
| --- | --- |
| `Calendar` | the schedule/date app for confirmed plans, dates, anniversaries, and timed life events |
| `Reminders` | the follow-up and cue queue for callbacks, logistics updates, low-commitment prompts, and cross-module attention items |

Short version:

- `Calendar` answers: what is actually on my schedule?
- `Reminders` answers: what still needs my attention or confirmation?
- `World Hub` remains the optional runtime/control app, not the normal place for everyday reminders.

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
| `src/views/CalendarView.vue` | schedule-first surface with reminder summary link |
| `src/views/RemindersView.vue` | user-facing cue inbox |
| `/calendar` | confirmed schedule, event editing, push status |
| `/reminders` | cross-module follow-ups and cue confirmation |

This document records the target meaning and the refactor direction. It is not claiming that every historical compatibility seam has been deleted.

## 4. Target Responsibilities

### Calendar

Calendar should own:

- user-created schedule items
- confirmed dates and plans
- anniversaries and recurring dates
- world or story date entries if later enabled
- timed push scheduling for confirmed events
- relationship facts only when the event is truly schedule-like

Calendar should not own:

- raw cross-module cue queues
- logistics status queues
- stock review prompts before user confirmation
- World Hub control state
- generic event logs

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

## 8. Acceptance Criteria

The split is considered product-complete when:

- Calendar can be explained as a normal schedule/date app;
- Reminders can be explained as the place for callbacks, follow-ups, package updates, and task cues;
- existing Map/Phone/Shopping/Stock/Food Delivery cues still have a clear home;
- push scheduling still works for confirmed timed events;
- World Hub remains optional and hidden unless enabled;
- Chat and relationship runtime read meaningful confirmed facts instead of noisy raw cue drafts.
