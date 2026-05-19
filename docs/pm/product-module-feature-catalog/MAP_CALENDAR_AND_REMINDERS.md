# Map Calendar And Reminders Module Catalog

Updated: 2026-05-19

Use this file for travel, schedule, reminders, and callback-style support surfaces.

## 1. Included Modules

For exact Chinese labels, use `docs/pm/MODULE_NAME_GLOSSARY.md`.

| English | Route | Visibility | Main role |
| --- | --- | --- | --- |
| Map | `/map` | Home app | route, trip, and location-context lane |
| Calendar | `/calendar` | Home app | confirmed schedule/date app |
| Reminders | `/reminders` | Home app | raw cue and follow-up surface |
| Phone | `/phone` | Home app | call log and callback-style support lane |

## 2. Module Notes

### Map

What it is:

- the simulation-first route and travel-context surface.

What users mainly do here:

- view trip and route context;
- build place and travel continuity;
- feed route and location context into other modules.

Important boundary:

- Map owns travel and location context, not Calendar schedule truth and not relationship truth.

### Calendar

What it is:

- the confirmed schedule and date surface.

What users mainly do here:

- review confirmed events;
- edit event times;
- manage push timing for real date and schedule entries.

Important boundary:

- Calendar owns confirmed schedule/date meaning only.

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
