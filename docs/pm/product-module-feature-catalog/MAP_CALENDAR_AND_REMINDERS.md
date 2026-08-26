# Map Calendar And Reminders Module Catalog

Updated: 2026-08-26

Integrated baseline: `f06a575`

Use this file for travel, schedule, reminders, and callback-style support surfaces.

## 1. Included Modules

For exact Chinese labels, use `docs/pm/MODULE_NAME_GLOSSARY.md`.

| English | Route | Visibility | Main role |
| --- | --- | --- | --- |
| Map | `/map` | Home app | map, journey, Footprints, and later active-exploration lane |
| Calendar | `/calendar` | Home app | visible long-range calendar for confirmed schedule/date facts |
| Agenda Journey | `/agenda-journey` | Home app | short-range day/near-term travel/activity execution, evidence, and outcomes |
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

- Map owns Map Journey/location/exploration source truth. Agenda Journey is a separate current short-range execution app. Event Runtime owns checkpoint-event eligibility and audit; Calendar owns confirmed schedule truth; Relationship Runtime owns relationship truth. The staged Map execution status lives only in roadmap 4.11.

### Calendar

What it is:

- the visible long-range calendar for confirmed schedule and date facts.

What users mainly do here:

- review confirmed events;
- edit event times;
- manage push timing for real date and schedule entries.
- use the integrated Month, Week, and Agenda views plus selected-day detail and confirmed-event authoring.

Important boundary:

- Calendar owns confirmed schedule/date meaning only. `Agenda / 日程` is one Calendar view, not another long-range planning app.

### Agenda Journey

What it is:

- the integrated short-range execution app for today's and near-term travel/activity plans.

What users mainly do here:

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

The accepted and partially implemented direction is defined in `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`:

```text
Reminders or direct entry
  -> Calendar confirmed commitment
  -> hidden Schedule Orchestrator
  -> Agenda Journey short-range execution
  -> optional Map Journey and/or Activity Session
  -> Event Runtime outcomes
  -> future Narrative Timeline projection
```

CJA-3 implements the Agenda Journey route, Calendar materialization consumer, manual plans, Map travel evidence, and explicit activity outcomes. CJA-4/CJA-5 add Activity Session timing and one midpoint Event Runtime family. Appointment auto-entry, broader event families, and Narrative Timeline persistence remain unimplemented.
