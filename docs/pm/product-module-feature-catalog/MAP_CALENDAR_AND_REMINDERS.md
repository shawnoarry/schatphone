# Map Calendar And Reminders Module Catalog

Updated: 2026-07-31

Use this file for travel, schedule, reminders, and callback-style support surfaces.

## 1. Included Modules

For exact Chinese labels, use `docs/pm/MODULE_NAME_GLOSSARY.md`.

| English | Route | Visibility | Main role |
| --- | --- | --- | --- |
| Map | `/map` | Home app | map, journey, Footprints, and later active-exploration lane |
| Calendar | `/calendar` | Home app | visible long-range calendar for confirmed schedule/date facts |
| Agenda Journey | route not frozen | future Home app | short-range day/near-term activity execution, timers, and outcomes |
| Reminders | `/reminders` | Home app | raw cue and follow-up surface |
| Phone | `/phone` | Home app | call log and callback-style support lane |

## 2. Module Notes

### Map

What it is:

- the simulation-first geography, journey, and exploration-context surface.

What users mainly do here:

- view trip and route context;
- search and manage world-bound places and player pins;
- build place and travel continuity;
- review passive route familiarity, activity-area progress, and feedback that will become Footprints;
- feed route and location context into other modules.

Approved staged direction:

- journey planning stays in Map and begins with explicit transport choice;
- the Map Journey Runtime later adds checkpoints and safe event interruptions while remaining Map-owned;
- the current passive Explore dashboard becomes Footprints, while active area Exploration is a separate later action;
- a Transit app remains deferred until transport has meaningful independent network use.

Important boundary:

- Map owns Map Journey/location/exploration source truth. Agenda Journey is a separate future short-range execution app. Event Runtime owns checkpoint-event eligibility and audit; Calendar owns confirmed schedule truth; Relationship Runtime owns relationship truth. The staged Map execution status lives only in roadmap 4.11.

### Calendar

What it is:

- the visible long-range calendar for confirmed schedule and date facts.

What users mainly do here:

- review confirmed events;
- edit event times;
- manage push timing for real date and schedule entries.
- later use month, week, and Agenda views plus selected-day authoring; the current frontend is still a list-first confirmed-event baseline rather than a conventional date grid.

Important boundary:

- Calendar owns confirmed schedule/date meaning only. `Agenda / 日程` is one Calendar view, not another long-range planning app.

### Agenda Journey

What it is:

- a separately planned short-range execution app for today's and the near-term activity plan.

What users mainly do here later:

- execute manual or Calendar-derived activity steps;
- start linked Map Journey or duration-based Activity Session flows;
- handle interactive or automatically resolved runtime events;
- review completion, misses, performance, and owner-confirmed outcomes.

Important boundary:

- Agenda Journey does not own Calendar history, Map truth, Event Runtime gates, or downstream relationship/finance/asset truth. The hidden Schedule Orchestrator links confirmed Calendar events to journey instances without becoming a visible app or copying owner records.

### Reminders

What it is:

- the cross-module cue, callback, and follow-up surface.

What users mainly do here:

- process raw cues from other modules;
- confirm or dismiss follow-up items;
- review pending low-commitment prompts before they become schedule commitments.

Important boundary:

- raw cues belong here, not in Calendar.

### Phone

What it is:

- the local call-log and callback-support lane.

What users mainly do here:

- review call history;
- generate or consume missed-call style callback context.

Important boundary:

- Phone is a support lane and may feed reminders or continuity, but it does not own Calendar or relationship truth.

## 3. Cross-Module Time Direction

The accepted documentation-only direction is defined in `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`:

```text
Reminders or direct entry
  -> Calendar confirmed commitment
  -> hidden Schedule Orchestrator
  -> Agenda Journey short-range execution
  -> optional Map Journey and/or Activity Session
  -> Event Runtime outcomes
  -> future Narrative Timeline projection
```

No Agenda Journey route, store, timer, popup, narrative store, or persistence migration is implemented by this catalog update.
