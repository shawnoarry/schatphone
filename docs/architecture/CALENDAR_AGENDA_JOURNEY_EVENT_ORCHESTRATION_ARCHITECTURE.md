# Calendar, Agenda Journey, Activity Session, And Event Orchestration Architecture

Updated: 2026-08-30

Status: `ARCHITECTURE_ACCEPTED / CALENDAR_DEPARTURE_READINESS_V1_IMPLEMENTED / CJA-1_IMPLEMENTED / CJA-2_IMPLEMENTED / CJA-3_IMPLEMENTED / CJA-4_IMPLEMENTED / CJA-5_IMPLEMENTED / CJA-6A_CONTRACT_DONE 2026-08-17 / EVT-WORK-4_EXECUTION_PROOF_DONE 2026-08-30`

This contract defines how long-range schedule planning, short-range activity execution, map travel, timed activity sessions, runtime events, and future narrative summaries cooperate without becoming one owner.

The bounded Calendar departure-readiness vertical and CJA-1 through CJA-5 described below are implemented. CJA-4 adds one time-only persistence owner and an embedded Focus Companion inside Agenda Journey. CJA-5 adds one midpoint-only low-impact Event Runtime family with silent `off` resolution or inline `text` interaction, while Activity Session retains all timer truth and validates the only approved 0/2-minute request. `EVT-WORK-4` adds a production-only, revision-safe execution proof from explicit Work Hub decision and Calendar Save through Agenda Journey, explicit Map departure/arrival, and explicit Activity Session start. Appointment auto-entry, inferred attendance/completion, Gallery/Music activity callers, richer companion state, interactive HTML/Mini Scene presentation, and a visible Story/Diary app remain unimplemented. Live implementation status and priority belong only to `docs/roadmap/TODO_ROADMAP.md`.

## 1. Product Model

SchatPhone uses several related concepts that must remain distinct:

| Concept | Visibility | Main question | Canonical truth |
| --- | --- | --- | --- |
| `Calendar / 日历` | current Home app | What is confirmed for a future date or time range? | confirmed dates, time windows, recurrence, location references, notes, reminder policy |
| `Agenda Journey / 行程` | current Home app | What should the user execute today or soon, and what actually happened? | generated/manual steps, execution state, completion, failure, evidence, outcome references |
| `Map Journey / 地图行程` | current Map flow | How does the user move from one known place to another? | origin, destination, transport, route-time progression, arrival/cancellation, map checkpoints |
| `Activity Session / 活动计时` | Agenda Journey activity execution surface | How long is the current activity expected to run? | start/end timestamps, pause policy, elapsed/remaining projection, session checkpoints |
| `Event Runtime / 事件运行时` | hidden coordination module plus optional World Hub review | Why did an event become eligible, and what outcome was requested? | eligibility, deterministic/random gate, cooldown/cap, proposal/review, provenance, event log |
| `Schedule Orchestrator / 时间编排模块` | hidden internal module | When should confirmed plans become executable Agenda Journeys? | materialization decisions and stable source links, not copied domain records |
| `Narrative Timeline / 叙事时间线` | future projection; visible Story/Diary form undecided | What concise, source-linked account can later surfaces and AI context consume? | bounded summaries and source references, not replacement business truth |

In product copy, `行程` may be used inside the Agenda Journey app and inside Map when the containing app makes the meaning obvious. Architecture, persistence, event templates, logs, and cross-module Interfaces must always qualify the term as `Agenda Journey` or `Map Journey`.

## 2. Calendar Is A Visible App

Calendar is not only a backend concept. `/calendar` is the visible long-range planning surface.

Current implementation reality:

- the Home label is `日历 / Calendar`;
- CJA-1 provides conventional Month, Week, and Agenda views over Calendar-owned source records;
- selected-day/detail flows cover all-day, multi-day, recurring, required/optional, notes, reminder, and complete manual authoring;
- a confirmed event with a stable Map-owned `locationRef` may show current-origin departure readiness and explicitly start or reopen one linked Map Journey.

Implemented information architecture:

- `Month`: date grid and multi-day spans;
- `Week`: time blocks and conflicts;
- `Agenda`: chronological list of the same Calendar events;
- selected-day detail;
- event creation/editing with title, start/end, all-day or multi-day state, recurrence, location reference, notes, reminder policy, and required/optional meaning;
- source and downstream links without embedding Agenda Journey, Map, or Event Runtime implementation details.

`日程 / Agenda` is therefore a Calendar view, not a second long-range planning app. Agenda Journey remains a separate short-range execution surface.

## 3. Schedule Orchestrator

The Schedule Orchestrator is a hidden deep Module behind one small Interface. It coordinates time-based handoffs without becoming the owner of every record it touches.

It may:

1. read confirmed Calendar events through a bounded snapshot;
2. decide when an event enters a configured materialization window;
3. request creation or refresh of an Agenda Journey instance;
4. link each generated journey and step to its Calendar source;
5. request deadline evaluation when required work remains incomplete;
6. request a bounded current Map travel estimate for a linked destination when departure readiness must be recalculated;
7. expose deterministic reconciliation after application suspension or restart.

It must not:

- become a visible Home app;
- copy complete Calendar, Map, Event Runtime, relationship, Wallet, or profile records;
- generate random outcomes itself;
- write Map arrival truth;
- write relationship, money, asset, identity, or world truth directly;
- promise closed-application execution that the current browser/PWA runtime cannot provide.

A Calendar appointment start and duration are planned truth. A suggested departure time is a projection derived from the current Map position, selected transport, and desired arrival time; it is not another Calendar field that stays correct after the role moves. The Schedule Orchestrator coordinates recomputation at materialization, relevant Map-position changes, the departure window, and resume, while Map remains the owner of distance and ETA calculation.

The direct Calendar departure-readiness vertical does not consume the Schedule Orchestrator. Calendar still requests a bounded projection directly from Map whenever the visible occurrence, current Map position, selected transport, or local clock changes. Separately, CJA-3 consumes CJA-2 materialization/deadline requests into Agenda Journey execution records. The orchestrator itself still creates no Map travel, departure UI, or execution-step state.

### Landed CJA-2 Interface And Persistence

CJA-2 adds `store:schedule-orchestrator` schema V1 and a pure reconciliation contract. Each active record is identified by `CalendarEvent.id + occurrenceStartsAt`; a multi-day occurrence remains one record, while recurring occurrences receive separate identities. The persisted body contains only source IDs, occurrence timing, a bounded Calendar fingerprint, materialization/deadline request revisions and acknowledgements, retirement evidence, and an optional future `agendaJourneyId`. It does not copy Calendar titles/notes, Map estimates, Agenda Journey steps, Event Runtime results, or downstream owner truth.

Reconciliation requests materialization once when an occurrence enters the configured window. A Calendar revision refreshes the same occurrence request; a changed start creates a new occurrence identity and retires the replaced record; deletion/cancellation retires its active records. Required occurrences request deadline evaluation once per Calendar fingerprint after the deadline, while optional occurrences do not. The CJA-3 Agenda Journey owner acknowledges materialization with its stable ID and separately acknowledges deadline evaluation; CJA-2 itself cannot manufacture either downstream record or result.

The hidden runtime waits for Calendar and orchestrator hydration, then reconciles on startup, Calendar changes, bounded timer wake, `pageshow`, and visible-document return. Browser suspension may delay the wake, but reopening recomputes from absolute timestamps and does not duplicate acknowledged requests. Complete backup keeps the existing top-level `calendar` section and nests the orchestrator snapshot inside it; older backups without that child restore an empty owner state and remain import-compatible.

`EVT-WORK-4` upgrades the owner to schema V2. The Calendar fingerprint now includes normalized source and prior-source lineage, and one-off Calendar events use a stable logical key so an untouched saved replacement refreshes the existing orchestration/Agenda identity instead of creating a parallel execution. V1 records migrate through normalization. The orchestrator stores only the bounded execution proof/request lineage needed by Agenda Journey; it still cannot create Work Hub acceptance, Calendar Save, Map departure, arrival, or activity completion.

Deletion test: if this Module were removed, every future caller would need to duplicate date-window materialization, source linking, deadline reconciliation, and idempotency. Concentrating those rules behind one Interface creates leverage and locality.

## 4. Agenda Journey

The user-facing `/agenda-journey` app is the short-range execution surface. It is not a second calendar and is not the Map Journey Runtime.

It owns:

- manually created or generated day/near-term journey instances;
- ordered and optionally flexible activity steps;
- step states such as planned, available, active, completed, missed, skipped, or cancelled;
- required/optional semantics copied only as an execution snapshot when the journey is materialized;
- destination/place requirements, desired arrival time, optional planning-origin hint, and approved arrival behavior for linked travel steps;
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

### Landed CJA-3 Interface And Persistence

CJA-3 adds `store:agenda-journey` schema V1. One normalized record represents one manual or Calendar-occurrence plan; its child steps are currently limited to `travel` and `activity`. Calendar-derived identity is deterministic from the source event and occurrence start, while manual plans use a stable generated ID and are restricted to today through the next 14 days. The owner persists source/fingerprint/review state, required/optional meaning, planned timing, step states, stable Map evidence references, explicit outcome summaries, and no copied Map coordinates or route truth.

The Agenda Journey runtime waits for Agenda Journey and Schedule Orchestrator hydration, then consumes pending materialization and deadline requests. Calendar source retirement cancels untouched plans or retains started/terminal execution as reviewable history. A changed Calendar fingerprint may refresh an untouched plan, but once execution has started the existing snapshot is preserved and marked for source review rather than silently rewritten.

The visible app provides today, upcoming, in-progress, and finished filters plus a focused plan detail. Manual creation is explicit. Travel transport may be changed before departure; Map supplies the current origin, estimate, predicted arrival, and leave-by guidance. Activity actions remain explicit: start, complete, skip, or cancel. Required skip/deadline paths become missed; optional skips remain skipped. No random event is required for creation or completion.

`EVT-WORK-4` upgrades Agenda Journey to schema V2. A production Work Hub replacement is materialized only when a pure verifier can prove exact authority package, world/profile/proposal revisions, accepted receipt, resolved Event Instance, correlated owner fact, Calendar time match, current source revision, and prior-source lineage. The journey persists one `executionRevision`, its normalized proof, prior/pending proof history, and a notification revision/ID ledger. An untouched journey may safely refresh under the same logical identity; once travel or activity execution has started, a changed Calendar source keeps the original execution revision and becomes `sourceReviewRequired` instead of silently rewriting the active plan. Manual and S1 preview schedules require no production proof.

## 5. Calendar-To-Journey Flow

The normal flow is:

```text
Reminder or direct user entry
  -> confirmed Calendar event
  -> Schedule Orchestrator reaches the materialization window
  -> Agenda Journey instance is created or refreshed idempotently
  -> travel/activity steps become available according to prerequisites
  -> Map Journey provides travel evidence
  -> user explicitly starts and resolves the activity
  -> later Activity Session/Event Runtime adapters may add bounded evidence or choices
  -> Agenda Journey records completion, miss, skip, or cancellation
  -> a later Narrative Timeline may receive a bounded source-linked summary candidate
```

A Calendar event remains the historical planned fact even if its Agenda Journey is missed. A Journey outcome must never rewrite history by deleting or silently changing the original commitment.

### Scheduled Travel Handoff

For a location-bound activity, the linked Agenda Journey separates travel from the activity itself:

```text
confirmed Calendar appointment
  -> Agenda Journey travel step + activity step
  -> Map recalculates recommended departure from current role position
  -> persistent foreground departure invitation
  -> explicit user confirmation
  -> Map creates one canonical Map Journey from the current origin
  -> Map route/journey UI reflects that same mapJourneyId
  -> Map returns arrival/cancellation evidence
  -> Agenda Journey unlocks, delays, misses, or cancels the activity step
  -> the user explicitly starts/resolves the activity
  -> later Activity Session and optional Event Runtime presentation may begin
```

The planning origin is a hint, not the actual departure point. If an appointment was planned as home-to-studio but the role later moves to a supermarket, Map estimates from the supermarket at confirmation time. The invitation shows the current origin, current estimate, predicted arrival, and predicted lateness. Delaying confirmation causes those projections to be recomputed; Agenda Journey records planned, predicted, and actual timing without rewriting the Calendar commitment.

The CJA-3 app presents a ready travel step inside its own focused detail rather than moving the role silently or injecting a universal card over another app. Exact notification delivery while SchatPhone is closed remains outside this slice and follows browser/PWA limits. Opening Map after confirmation shows the already active journey and never asks the user to plan it again; Map's return action restores the originating Agenda Journey and ancestor Home page.

### Landed CJA-1 Calendar And Departure Readiness

Calendar V3 migrates V1/V2 and owns explicit start/end ranges, all-day state, recurrence, participation requirement, notes, reminder lead time, and an optional stable Map `locationRef`. Month, Week, Agenda, selected-day, and selected-event surfaces derive occurrence projections without persisting a second event record. Manual authoring supports create, complete edit, and delete; reminder scheduling resolves the next eligible recurring occurrence.

The departure slice stays inside the selected Calendar event detail:

```text
confirmed Calendar event with stable Map locationRef
  -> Map resolves the exact current position and destination in one map pack
  -> Map estimates the selected transport mode
  -> Calendar shows recommended departure, predicted arrival, and lateness
  -> explicit Leave now
  -> Map creates or reuses one journey with sourceCalendarEventId
  -> Map back action restores Calendar context
```

Calendar never infers a place from title, summary, coordinates, or a usual address. Map remains the owner of current-position provenance, place coordinates, distance, estimate, journey state, and arrival. The projection uses the selected occurrence time, fails closed for missing current position, stale/off-pack destinations, or cross-pack travel, and records only the source Calendar event ID on the Map Journey. Changing current position or transport recomputes the estimate without changing the appointment. Another active Map Journey blocks creation, while repeated departure for the same Calendar event reuses the existing journey.

CJA-1 creates no Schedule Orchestrator state, Agenda Journey steps, Activity Session, automatic place entry, optional event presentation, or activity completion evidence.

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

- the CJA-3 Agenda Journey travel step requests travel to a stable Map place; free-form destinations remain a later contract extension;
- Map creates and owns the Map Journey, keyed back to the stable `sourceAgendaJourneyStepId`;
- Map returns a stable `mapJourneyId` and later arrival/cancellation evidence while preserving that source reference through active, history, and restore state;
- Agenda Journey validates whether that evidence satisfies the step requirement;
- Map checkpoint events remain Map-owned source events under `MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`.

A linked step may eventually request `arrive_outside` or `auto_enter_place` behavior. CJA-3 implements `arrive_outside` only. Automatic entry remains a later policy and would be valid only for an explicit appointment inside a stable known place after Map validates the exact journey destination and arrival evidence. Map would then own the `inside` place-session state. Manual coordinate relocation cannot impersonate journey evidence unless a later activity contract explicitly accepts manual presence.

Arrival makes the CJA-3 activity available; it does not complete it. The Agenda Journey detail remains the current execution host and requires an explicit activity start plus completion or skip. A later activity/event presentation may be minimized or expanded under its own acceptance, but source activity state, high-impact review, and a recoverable pending entry must remain intact when presentation is dismissed or fails.

This architecture does not change or block MJE-1, MJE-2, MJE-3, Footprints, or active Exploration work.

## 8. Activity Session Contract

An Activity Session is an execution timer attached to one Agenda Journey step. It may use a tomato-timer-like presentation, but its domain meaning is a duration-based activity session rather than a mandatory 25/5 Pomodoro cycle.

CJA-4 implements the baseline with one deterministic session ID per stable Agenda Journey activity-step ID, the step's planned duration as the baseline clock, `duration_sufficient` or `user_confirmation`, continuous or user-pausable timing, deterministic midpoint/near-completion/duration-elapsed checkpoints, and owner-validated completion acknowledgement. CJA-5 upgrades `store:activity-session` to schema V2 with a bounded event-resolution ledger while preserving V1 migration. `EVT-WORK-4` upgrades it to schema V3: an Agenda-derived session persists `agendaExecutionRevision`, rejects stale same-step reuse, and returns that revision in completion evidence. Travel steps and Map-owned clocks fail closed. The visible Focus Companion uses one built-in quiet scene, persists only minimized presentation state, and may render the one approved text interaction without becoming Event Runtime truth; Gallery/Music/companion references remain later slices.

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

### Focus Companion Presentation

The user-facing timer may be presented as a Focus Companion surface. `Pomodoro` is one preset, not the domain owner or a mandatory 25/5 cycle. Initial duration modes may include follow-the-Agenda-step, continuous, 25/5, 50/10, and custom focus/break intervals.

The surface may show a built-in quiet scene, a user-selected Gallery background reference, a bounded Music/ambient-audio reference, and an optional decorative companion reference. Activity Session stores only presentation preferences and stable references; Gallery retains reusable image assets and Music retains playback, imported audio, queue, and audio-runtime truth. Browser autoplay and explicit-user-gesture requirements remain authoritative. A decorative companion initially owns no timer, event, relationship, or value state; autonomous growth or global desktop behavior would require a separately approved owner.

The Focus Companion surface can be minimized and reopened without changing time. It may also present a Map-owned long travel duration such as a flight, but it must consume the Map Journey clock instead of creating a duplicate Activity Session timer. The source clock always remains canonical.

Activity completion policy is explicit per step:

- `duration_sufficient`: elapsed time can satisfy a bounded solo activity such as study or practice;
- `user_confirmation`: elapsed time is followed by a user completion check;
- `event_resolution`: a required deterministic activity scene must resolve;
- `external_evidence`: another owner must provide the required proof.

Even `duration_sufficient` permits only effects that the affected owner has approved for that activity contract. Optional events may add bounded modifiers, but the absence of an event never prevents the base Activity Session from completing.

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

A scheduled activity is deterministic source work, not a random event. Event Runtime may select an occupation/world/late-arrival variant, passive beat, optional interruption, or choice-bearing scene at explicit checkpoints, but an empty event result must leave the base activity usable. Passive no-choice beats may update the companion presentation or event log without opening a blocking card.

User control has three independent axes: module event permission, random-event intensity, and presentation mode. A future per-session override may choose quiet, important-only, balanced, or lively behavior. Quiet/off optional events do not disable the activity, its deadline, safety notices, or deterministic required completion path.

The shared Mini Scene policy is the presentation seam:

- `off`: no event popup; the event follows its approved automatic-resolution policy and the source activity continues;
- `text`: show an accessible text event and bounded choices where allowed;
- `interactive_html`: use the reviewed interactive Presenter with mandatory text fallback;
- `unconfigured`: behave as `off` until the user makes a choice.

Turning presentation off must not disable the simulation system. It changes interaction, not eligibility. Automatic resolution is limited to effects already allowed by owner policy; high-impact money, asset, relationship, identity, communication, or schedule changes retain their confirmation/review requirements.

CJA-5 implements one exact collaboration: a running or paused Activity Session submits a bounded snapshot only after its deterministic midpoint `duration_milestone` is processed. Event Runtime stores one deterministic `activity_session.focus_reset.v1` record, applies module permission, Surprise Mode, deterministic random, cooldown, daily cap, and presentation policy, and never evaluates that record again. `off` automatically requests `keep_rhythm`; `text` shows the authored local fallback inside Focus Companion and allows `keep_rhythm` or `add_recovery_buffer`. Activity Session validates exact session/journey/step/checkpoint/record lineage and may apply only 0 or 2 additional minutes. No result changes Calendar, Agenda Journey, Map, completion policy, money, relationships, communication, or another owner.

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

Status: `CJA-6A_CONTRACT_DONE 2026-08-17 / CJA-6B_EVT-CHRONICLE-1_DONE 2026-08-30`

The visible product is `生活志 / Chronicle`. It is an ordinary Home/App Store app for personal continuity, while World Hub remains an advanced audit surface and Settings remains the ordinary world/setup surface.

CJA-6B implements the CJA-6A read-only, finite, source-linked Narrative Timeline as a deterministic Chronicle projection. It is a cross-module account of verified owner summaries, not a second business record, an Event Surface, a generic feed, or a universal event log. Calendar, Agenda Journey, Map Journey, Activity Session, Work Hub/Event Runtime, and every domain owner continue to own their canonical truth. The projection is rebuilt on read and is never persisted.

A projection entry may reference only owner-confirmed or owner-committed summaries such as:

- a Calendar commitment or retained occurrence outcome;
- an Agenda Journey plan/step outcome;
- Map Journey travel or arrival evidence;
- Activity Session duration/checkpoint evidence;
- an Event Runtime event, decision, or terminal outcome;
- a confirmed effect recorded by its owning module;
- involved role, place, and world identifiers.

Every entry uses typed `sourceRefs` rather than copied business records. The contract shape is deliberately narrow:

```text
NarrativeSourceRef {
  owner: ModuleKey,
  recordType: string,
  recordId: string,
  revision: string | null
}
```

The source summary and references must be committed by the owner before they can enter the projection. Raw prompts, raw provider responses, unreviewed model output, pending proposals, free-form claims, and complete source bodies are not timeline inputs. If a projected source is deleted, retired, stale, inaccessible, cross-world, or has a failed revision check, that projection entry fails closed. A user-authored diary entry is different: Chronicle retains its prose when an optional linked source becomes unavailable and marks only that reference as broken.

Future Forum, Chat, and other AI callers may use a bounded read-only context Interface only after a separate stage supplies an explicit scope, permission, date/world range, recency rule, entry limit, and character/token budget. EVT-CHRONICLE-1 implements no AI caller. Ordinary Chronicle reads call no provider, publish nothing, and write back to no source owner; Timeline and any later AI context cannot authorize a domain mutation.

CJA-6B adds `store:chronicle` schema V1 only for user-authored diary entries, complete-backup V7 support with older complete-backup compatibility, `/chronicle`, Home/App Store registration, and pure projection adapters. It does not create a persisted Timeline record. Diary deletion never deletes sources; projection refresh never rewrites diary prose. AI recall, automatic diary generation, free-text fact extraction, Community/Media publication, Wallet/Assets/relationship consequences, and CJA-6C remain separately gated.

## 12. Stable Cross-Module References

Future records should link rather than copy:

```text
CalendarEvent.id
  -> AgendaJourney.sourceCalendarEventId
  -> AgendaJourneyStep.agendaJourneyId
  -> MapJourney.sourceAgendaJourneyStepId
  -> ActivitySession.agendaJourneyStepId
  -> RuntimeEvent.sourceType + sourceRecordId + checkpointId
  -> ChronicleProjectionEntry.sourceRefs[]
```

CJA-3 implements the Agenda Journey links through `sourceCalendarEventId`, `scheduleOrchestrationId`, step IDs, and Map's optional `sourceAgendaJourneyStepId`. `EVT-WORK-4` adds `AgendaJourney.executionRevision`; Map V5 persists it as `sourceAgendaExecutionRevision` through active journey, arrival, cancellation, history, and backup, while Activity Session V3 persists the same revision and returns it with completion evidence. Reusing a Map journey or Activity Session from another execution revision fails closed. CJA-6B consumes these stable references through pure adapters and persists only Chronicle-owned diary entries. Legacy Calendar, Map, Agenda, Orchestrator, Activity, and pre-V7 complete backups remain readable through their named migrations and compatibility rules.

## 13. Ownership Matrix

| Module | Owns | Does not own |
| --- | --- | --- |
| Calendar | confirmed long-range schedule/date facts and reminder timing | short-range execution, Map arrival, event eligibility, narrative result |
| Schedule Orchestrator | idempotent materialization and deadline coordination | copied business truth or direct effects |
| Agenda Journey | short-range plan instances, steps, execution state, evidence references, outcome summary | Calendar history, Map truth, event gates, downstream owner state |
| Map | places, Map Journey, travel checkpoints, arrival/cancellation | Agenda Journey completion or Calendar commitment |
| Activity Session | time, completion policy, and session-checkpoint truth | event selection, media assets, or broad value mutation |
| Focus Companion surface | timer projection, scene preference, and stable Gallery/Music/companion references | source clocks, Event Runtime truth, media binaries/playback, or broad values |
| Event Runtime | eligibility, random/deterministic policy, cooldown/cap, proposal/review, logs | source-module records and final owner state |
| Mini Scene Module | presentation policy, validated artifact, Presenter/fallback, interaction audit | source-event truth and state mutation |
| Chronicle Diary Owner | user-authored diary entries, stable IDs, optional typed source/media references, retention, migration, backup, and rollback | source-owner records or inferred domain truth |
| Chronicle Narrative Timeline | finite deterministic source-linked projection rebuilt from verified owner summaries | persisted timeline copies or canonical schedule, journey, map, event, relationship, finance, asset, world, or publication truth |

## 14. Staged Delivery Gates

These stages define dependency order only. Live status and priority remain in the roadmap.

0. `Calendar Departure Readiness V1`: implemented as a separately promoted bounded vertical over Calendar and Map Journey owners.
1. `CJA-0`: architecture and terminology contract, documentation only.
2. `CJA-1`: implemented Calendar month/week/Agenda information architecture, occurrence projection, selected-day/detail flow, Calendar V3 migration, and event authoring contract.
3. `CJA-2`: implemented pure Schedule Orchestrator Interface, idempotent materialization/deadline fixtures, persistence owner, backup/restore compatibility, and startup/resume reconciliation without a new visible app.
4. `CJA-3`: implemented Agenda Journey V1 with manual/Calendar-derived near-term plans, explicit travel/activity execution, one linked Map Journey per travel step, persistence/backup, and no random event requirement.
5. `CJA-4 DONE 2026-08-16`: one Activity Session with explicit completion policy, minimize/reopen reconciliation, and a restrained Focus Companion baseline; Gallery backgrounds, Music/ambient caller integration, richer companions, and broader event families remain separately promoted extensions.
6. `CJA-5 DONE 2026-08-16`: one midpoint-only low-impact Event Runtime Adapter with `off` automatic `keep_rhythm`, inline Focus Companion `text` interaction, durable Runtime records, owner-validated 0/2-minute results, migration/backup, and reopen/idempotence coverage; interactive HTML remains separately gated by Mini Scene security.
7. `CJA-6A DONE 2026-08-17`: Narrative Timeline contract, typed source references, owner-confirmed input rules, fail-closed invalid-source behavior, and bounded read-only AI-context Interface rules are documented; no persistence or UI is authorized.
8. `EVT-WORK-4 DONE 2026-08-30`: production Work Hub schedule replacements require exact execution proof; Schedule Orchestrator V2, Agenda Journey V2, Map V5, Activity Session V3, and Notification Center preserve one revision through explicit execution with migration, rollback, backup, and stale-revision rejection.
9. `CJA-6B / EVT-CHRONICLE-1 DONE 2026-08-30`: Chronicle product naming and route, schema-V1 Diary Owner, retention and broken-link semantics, complete-backup V7 compatibility, deterministic finite owner projections, stable deep links, Home/App Store integration, accessibility, and desktop/simulated Pixel 5 proof are implemented. No persisted Timeline, model caller, automatic diary generation, downstream consequence, or CJA-6C is authorized.

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
11. make an optional event required for a deterministic scheduled activity to exist or complete its approved base path;
12. freeze a suggested departure time after the canonical Map position changes or create a second Map Journey when the linked journey is already active;
13. treat manual relocation as journey-arrival evidence when a step requires real travel provenance;
14. create an Activity Session timer for a flight or trip whose canonical duration is already owned by Map Journey;
15. copy Gallery binaries, Music audio, queue state, or playback state into an Activity Session or event record.

## 16. Validation Expectations

Documentation-only acceptance requires `git diff --check` and `npm.cmd run governance:check`.

Calendar Departure Readiness V1 requires deterministic projection, V1-to-V2 migration, owner-boundary, unique-journey, return-context, accessibility, desktop/mobile, and zero-overflow coverage. CJA-2 requires deterministic IDs/fingerprints, recurrence/multi-day fixtures, update/removal retirement, deadline once-only behavior, persistence/backup restore, missing-child legacy compatibility, and reopen reconciliation. CJA-3 requires manual and Calendar-derived identity, strict travel/activity transitions, required/optional deadline behavior, Calendar retirement/fingerprint handling, unique Map-step lineage through active/history/restore state, nested backup/rollback coverage, app registration, return context, accessibility, text fitting, and desktop/simulated-mobile zero-overflow evidence. CJA-4 requires stable activity-step identity, travel/Map-clock rejection, absolute-time and pause arithmetic, deterministic checkpoint idempotence, explicit completion policy, exact Agenda owner validation, persistence/restore/missing-child rollback coverage, startup/visibility/reopen reconciliation, no-event completion, accessible Focus Companion behavior, and desktop/simulated-mobile zero-overflow evidence. EVT-WORK-4 additionally requires exact production authority/runtime/receipt/owner-fact/Calendar proof, stable revision lineage, started-source conflict review, notification dedupe and rollback, stale Map/Activity rejection, schema migration/backup coverage, a zero-model path, and desktop/simulated-mobile explicit Save/depart/arrive/start proof. Later visible behavior stages require owner-Adapter tests, persistence and restore tests, suspended/reopen reconciliation, no-event and auto-resolution paths, and targeted desktop/mobile route coverage. Closed-app behavior must be tested only against capabilities the selected browser/PWA or push implementation can actually guarantee.
