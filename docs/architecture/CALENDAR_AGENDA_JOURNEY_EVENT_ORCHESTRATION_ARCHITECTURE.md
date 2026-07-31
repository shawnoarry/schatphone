# Calendar, Agenda Journey, Activity Session, And Event Orchestration Architecture

Updated: 2026-07-31

Status: `ARCHITECTURE_ACCEPTED / DOCUMENTATION_ONLY / NO_RUNTIME_AUTHORIZATION`

This contract defines how long-range schedule planning, short-range activity execution, map travel, timed activity sessions, runtime events, and future narrative summaries cooperate without becoming one owner.

It does not implement a new store, route, timer, popup, event Adapter, persistence schema, or visible Story/Diary app. Live implementation status and priority belong only to `docs/roadmap/TODO_ROADMAP.md`.

## 1. Product Model

SchatPhone uses several related concepts that must remain distinct:

| Concept | Visibility | Main question | Canonical truth |
| --- | --- | --- | --- |
| `Calendar / 日历` | current Home app | What is confirmed for a future date or time range? | confirmed dates, time windows, recurrence, location references, notes, reminder policy |
| `Agenda Journey / 行程` | future Home app | What should the user execute today or soon, and what actually happened? | generated/manual steps, execution state, completion, failure, performance, outcome references |
| `Map Journey / 地图行程` | current Map flow | How does the user move from one known place to another? | origin, destination, transport, route-time progression, arrival/cancellation, map checkpoints |
| `Activity Session / 活动计时` | future Agenda Journey surface | How long is the current activity expected to run? | start/end timestamps, pause policy, elapsed/remaining projection, session checkpoints |
| `Event Runtime / 事件运行时` | hidden coordination module plus optional World Hub review | Why did an event become eligible, and what outcome was requested? | eligibility, deterministic/random gate, cooldown/cap, proposal/review, provenance, event log |
| `Schedule Orchestrator / 时间编排模块` | hidden internal module | When should confirmed plans become executable Agenda Journeys? | materialization decisions and stable source links, not copied domain records |
| `Narrative Timeline / 叙事时间线` | future projection; visible Story/Diary form undecided | What concise, source-linked account can later surfaces and AI context consume? | bounded summaries and source references, not replacement business truth |

In product copy, `行程` may be used inside the future Agenda Journey app and inside Map when the containing app makes the meaning obvious. Architecture, persistence, event templates, logs, and cross-module Interfaces must always qualify the term as `Agenda Journey` or `Map Journey`.

## 2. Calendar Is A Visible App

Calendar is not only a backend concept. `/calendar` is the visible long-range planning surface.

Current implementation reality:

- the Home label is `日历 / Calendar`;
- the current page title is `日程中心 / Schedule center`;
- the page primarily presents confirmed-event cards, push status, and a Reminders summary;
- it does not yet provide a conventional month/week/date-grid experience.

Target information architecture:

- `Month`: date grid and multi-day spans;
- `Week`: time blocks and conflicts;
- `Agenda`: chronological list of the same Calendar events;
- selected-day detail;
- event creation/editing with title, start/end, all-day or multi-day state, recurrence, location reference, notes, reminder policy, and required/optional meaning;
- source and downstream links without embedding Agenda Journey, Map, or Event Runtime implementation details.

`日程 / Agenda` is therefore a Calendar view, not a second long-range planning app. The future Agenda Journey app remains a separate short-range execution surface.

## 3. Schedule Orchestrator

The Schedule Orchestrator is a hidden deep Module behind one small Interface. It coordinates time-based handoffs without becoming the owner of every record it touches.

It may:

1. read confirmed Calendar events through a bounded snapshot;
2. decide when an event enters a configured materialization window;
3. request creation or refresh of an Agenda Journey instance;
4. link each generated journey and step to its Calendar source;
5. request deadline evaluation when required work remains incomplete;
6. expose deterministic reconciliation after application suspension or restart.

It must not:

- become a visible Home app;
- copy complete Calendar, Map, Event Runtime, relationship, Wallet, or profile records;
- generate random outcomes itself;
- write Map arrival truth;
- write relationship, money, asset, identity, or world truth directly;
- promise closed-application execution that the current browser/PWA runtime cannot provide.

Deletion test: if this Module were removed, every future caller would need to duplicate date-window materialization, source linking, deadline reconciliation, and idempotency. Concentrating those rules behind one Interface creates leverage and locality.

## 4. Agenda Journey

The future user-facing `行程` app is the short-range execution surface. It is not a second calendar and is not the Map Journey Runtime.

It owns:

- manually created or generated day/near-term journey instances;
- ordered and optionally flexible activity steps;
- step states such as planned, available, active, completed, missed, skipped, or cancelled;
- required/optional semantics copied only as an execution snapshot when the journey is materialized;
- user performance and completion evidence references;
- the final journey outcome summary and references to applied effects.

It may read:

- the active user's profile, occupation, and role context through their owning Interface;
- current world context through the World Setting Interface;
- confirmed Calendar commitments;
- Map Journey arrival evidence;
- Event Runtime results;
- owner-confirmed effects from relationship, Wallet, Assets, and later character-state modules.

It must not infer completion from a title or from elapsed time alone. A Map arrival can satisfy an `arrival` or `presence` requirement, but it cannot prove that a rehearsal, broadcast, performance, class, meeting, or other activity was completed.

## 5. Calendar-To-Journey Flow

The normal flow is:

```text
Reminder or direct user entry
  -> confirmed Calendar event
  -> Schedule Orchestrator reaches the materialization window
  -> Agenda Journey instance is created or refreshed idempotently
  -> activity steps become available according to time and prerequisites
  -> Map Journey and/or Activity Session provide execution evidence
  -> Event Runtime evaluates explicit checkpoints
  -> owning modules validate requested effects
  -> Agenda Journey records completion, miss, skip, or cancellation
  -> Narrative Timeline receives a bounded source-linked summary candidate
```

A Calendar event remains the historical planned fact even if its Agenda Journey is missed. A Journey outcome must never rewrite history by deleting or silently changing the original commitment.

## 6. Multi-Day Example

A confirmed Calendar event records `Concert, August 4-7` with venue, call times, reminder policy, and required participation.

The Schedule Orchestrator may create one linked Agenda Journey per day:

- August 4: venue arrival, setup, rehearsal, first performance;
- August 5-6: recovery, preparation, travel, performance, optional interaction steps;
- August 7: final performance, teardown, return, settlement.

Each day can use different world/occupation templates while preserving the same `sourceCalendarEventId`. The Calendar event owns the four-day commitment. Each Agenda Journey owns that day's actual execution.

## 7. Map Collaboration

Map Journey remains independently useful. A user may start a Map Journey without an Agenda Journey, and an Agenda Journey may contain non-spatial steps that never open Map.

When linked:

- an Agenda Journey step requests travel to a stable Map place or free-form destination;
- Map creates and owns the Map Journey;
- Map returns a stable `mapJourneyId` and later arrival/cancellation evidence;
- Agenda Journey validates whether that evidence satisfies the step requirement;
- Map checkpoint events remain Map-owned source events under `MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`.

This architecture does not change or block MJE-1, MJE-2, MJE-3, Footprints, or active Exploration work.

## 8. Activity Session Contract

An Activity Session is an execution timer attached to one Agenda Journey step. It may use a tomato-timer-like presentation, but its domain meaning is a duration-based activity session rather than a mandatory 25/5 Pomodoro cycle.

Minimum source record:

- stable `activitySessionId` and `agendaJourneyStepId`;
- planned duration;
- `startedAt` and derived `endsAt`;
- pause/resume policy and accumulated paused duration when pausing is allowed;
- deterministic checkpoint plan;
- status and completion reason;
- source Calendar and Map references when available.

Runtime rules:

1. use absolute timestamps, not accumulated `setInterval` ticks, as canonical progress;
2. minimizing the timer changes presentation only and does not stop the activity;
3. route changes inside SchatPhone do not stop the session;
4. application suspension is reconciled from timestamps on resume;
5. a fully closed or OS-suspended browser/PWA cannot promise an interactive modal at the exact checkpoint;
6. real push may notify where configured, but it cannot provide an interactive in-app choice while the app process is unavailable;
7. overdue checkpoints are processed idempotently on resume according to the interaction policy;
8. timer completion is evidence of elapsed activity time, not automatic proof of every activity result.

V1 should keep an active session continuously timed while an event surface is open. A future activity type may explicitly allow pausing, but event presentation must not silently change the timer policy.

## 9. Event And Interaction Policy

Agenda Journey and Activity Session submit bounded snapshots only at explicit checkpoints such as step start, a duration milestone, near completion, completion, or deadline evaluation. Event Runtime must not evaluate on every timer tick.

Event Runtime owns:

- template eligibility;
- deterministic/random gates;
- cooldowns and daily caps;
- module permission and Surprise Mode checks;
- proposal/review policy;
- minimum provenance and event logs.

Agenda Journey owns validation of continue, delay, branch, complete, miss, skip, or cancel requests. Other owners validate their own effects.

The shared Mini Scene policy is the presentation seam:

- `off`: no event popup; the event follows its approved automatic-resolution policy and the source activity continues;
- `text`: show an accessible text event and bounded choices where allowed;
- `interactive_html`: use the reviewed interactive Presenter with mandatory text fallback;
- `unconfigured`: behave as `off` until the user makes a choice.

Turning presentation off must not disable the simulation system. It changes interaction, not eligibility. Automatic resolution is limited to effects already allowed by owner policy; high-impact money, asset, relationship, identity, communication, or schedule changes retain their confirmation/review requirements.

## 10. Missed Required Work

Missing a required Calendar-derived step is a deterministic deadline source, not a random event by itself.

At the deadline:

1. Schedule Orchestrator requests Agenda Journey reconciliation;
2. Agenda Journey records the unmet requirement and available evidence;
3. Event Runtime may select a world/occupation-aware consequence variant;
4. each affected owner validates the requested change;
5. Agenda Journey records references to applied, rejected, or review-pending outcomes;
6. Calendar remains unchanged as the planned historical fact.

Randomness may change flavor, severity within approved bounds, or follow-up opportunities. It must not erase the deterministic fact that the required step was completed or missed.

## 11. Narrative Timeline

The future visible product may be called Story, Diary, Journal, History, or something else. That naming and route are intentionally undecided.

The stable architecture concept is a Narrative Timeline projection that consumes only confirmed, source-linked summaries from owning modules. A projection entry may reference:

- Calendar commitment;
- Agenda Journey and step outcome;
- Map Journey evidence;
- Activity Session duration;
- Event Runtime event and user/automatic choice;
- confirmed effects from owning modules;
- involved role, place, and world identifiers.

It must not replace source records or persist complete prompts/raw provider responses by default. Forum, Chat, and other AI callers should consume bounded summaries through a later context Interface with explicit recency, scope, permission, and token-budget rules.

Until a persistence owner and visible product are separately approved, no new Narrative Timeline store, route, or backup section is authorized.

## 12. Stable Cross-Module References

Future records should link rather than copy:

```text
CalendarEvent.id
  -> AgendaJourney.sourceCalendarEventId
  -> AgendaJourneyStep.agendaJourneyId
  -> MapJourney.sourceAgendaJourneyStepId
  -> ActivitySession.agendaJourneyStepId
  -> RuntimeEvent.sourceType + sourceRecordId + checkpointId
  -> NarrativeEntry.sourceRefs[]
```

Exact schema versions require a separate persistence review. Legacy Calendar and Map records remain valid when all new references are absent.

## 13. Ownership Matrix

| Module | Owns | Does not own |
| --- | --- | --- |
| Calendar | confirmed long-range schedule/date facts and reminder timing | short-range execution, Map arrival, event eligibility, narrative result |
| Schedule Orchestrator | idempotent materialization and deadline coordination | copied business truth or direct effects |
| Agenda Journey | short-range plan instances, steps, execution state, evidence references, outcome summary | Calendar history, Map truth, event gates, downstream owner state |
| Map | places, Map Journey, travel checkpoints, arrival/cancellation | Agenda Journey completion or Calendar commitment |
| Activity Session | time and session-checkpoint truth | event selection or broad value mutation |
| Event Runtime | eligibility, random/deterministic policy, cooldown/cap, proposal/review, logs | source-module records and final owner state |
| Mini Scene Module | presentation policy, validated artifact, Presenter/fallback, interaction audit | source-event truth and state mutation |
| Narrative Timeline | bounded source-linked projection after approval | canonical schedule, journey, map, event, relationship, or finance truth |

## 14. Staged Delivery Gates

These stages define dependency order only. Live status and priority remain in the roadmap.

1. `CJA-0`: architecture and terminology contract, documentation only.
2. `CJA-1`: Calendar month/week/Agenda information architecture and event authoring contract.
3. `CJA-2`: pure Schedule Orchestrator Interface, idempotent materialization fixtures, and persistence review without a new visible app.
4. `CJA-3`: Agenda Journey V1 with one manual or Calendar-derived day plan and no random event requirement.
5. `CJA-4`: one Activity Session with minimize/reopen reconciliation and no claim of exact closed-app popup delivery.
6. `CJA-5`: one low-impact Event Runtime Adapter with `off` automatic resolution and `text` interaction; interactive HTML remains separately gated by Mini Scene security.
7. `CJA-6`: Narrative Timeline projection and bounded AI-context Interface after owner, retention, review, and backup contracts are approved.

Each stage requires separate user acceptance before implementation begins. No stage authorizes the next automatically.

## 15. Stop Conditions

Stop and reopen architecture review if an implementation would:

1. turn Calendar into a generic event log or short-range execution store;
2. create a second long-range planner inside Agenda Journey;
3. make Map arrival prove completion of a non-travel activity;
4. use timer ticks as canonical progress;
5. promise exact interactive popups while the browser/PWA is closed or suspended;
6. let `off` presentation bypass high-impact review policy;
7. let Event Runtime write Calendar, Agenda Journey, Map, relationship, Wallet, Assets, identity, or world truth directly;
8. make a future Story/Diary summary the canonical source record;
9. inject raw event logs or full prompts into Forum or Chat without a bounded context Interface;
10. add persistence, backup, or migration fields before their owner and compatibility rules are approved.

## 16. Validation Expectations

Documentation-only acceptance requires `git diff --check` and `npm.cmd run governance:check`.

Later behavior stages require deterministic time/random tests, owner-Adapter tests, persistence and restore tests, suspended/reopen reconciliation, no-event and auto-resolution paths, and targeted desktop/mobile route coverage. Closed-app behavior must be tested only against capabilities the selected browser/PWA or push implementation can actually guarantee.
