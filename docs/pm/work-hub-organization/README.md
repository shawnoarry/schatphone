# Work Hub Organization Owner

Updated: 2026-08-30

This package owns production organization authority, ordinary work, and owner-native user decisions inside Work Hub. Event Runtime may coordinate an approved event family, but it never becomes the organization or decision owner.

## Read First

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `IMPLEMENTATION_WORKSTREAMS.md`
4. `../event-runtime-and-world-hub/NEXT_EVENT_PRODUCTION_PLAN_AFTER_SHELL_PORTFOLIO.md`
5. `../map-calendar-reminders/STATUS_AND_HANDOFF.md` when Calendar handoff behavior changes

## Product Meaning

Work Hub owns confirmed organization membership, role authority, teams, channels, work notices, tasks, status reports, schedule proposals, approval requests, and durable user-decision receipts. It is world-neutral and must support companies, schools, artist teams, studios, guilds, institutions, and authored organization semantics without a K-pop-specific permission branch.

The existing Workplace S1 fixture remains a separate preview. Contacts supplies bounded identity matching clues; it never grants membership. Calendar alone owns confirmed time after the user explicitly saves a reviewed handoff. Agenda Journey, Map, and Activity Session then preserve separate execution truth under one revision-safe proof; notification or model output cannot substitute for user action or owner evidence.

## Current Delivery

- `EVT-WORK-1 DONE 2026-08-29`: production owner correction
- `EVT-WORK-2 DONE 2026-08-29`: ordinary organization work loop
- `EVT-WORK-3 DONE 2026-08-30`: world-neutral Work Hub-native schedule-change event
- `EVT-WORK-4 DONE 2026-08-30`: explicit Calendar-to-Agenda/Map/Activity execution handoff and proof
