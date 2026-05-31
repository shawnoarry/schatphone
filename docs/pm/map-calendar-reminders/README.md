# Map Calendar Reminders Package

Updated: 2026-05-31

Use this package for Map, Calendar, Reminders, route/date/callback/follow-up boundaries, and trip/schedule handoff rules.

Current 4.2 reminder: Map-derived Calendar follow-ups should preserve explicit trip lineage (`sourceTripId`) when available, so confirmed schedule facts can become supporting context inside the originating shared-route memory.

Current World Pack reminder: Calendar may consume `reservation -> Calendar` world app context for labels, accents, and boundary presentation, including confirmed `reservation_board` nonstandard-app proposals, but Calendar still owns confirmed events, time editing, reminder promotion, relationship-fact review, and push scheduling. Map may consume `transit -> Map` world app context for title/context/boundary presentation, but Map still owns route, trip, location, ETA, shared-route facts, and Map-derived Calendar handoff.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `IMPLEMENTATION_WORKSTREAMS.md`

Also read when needed:

- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
