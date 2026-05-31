# Map Calendar Reminders Status And Handoff

Updated: 2026-05-31

This file is the handoff page for Map, Calendar, and Reminders work.

## 1. Current Status

Status: `PARTIAL_DONE`

What is already landed:

1. Calendar and Reminders product split baseline is implemented;
2. Reminders owns cross-module cue queues and is reachable from Home;
3. Calendar leads with confirmed schedule/date meaning and push scheduling;
4. Calendar can create low-impact relationship facts only from confirmed events;
5. Map provides route, ETA, and route-context support without taking ownership of business records;
6. Map-derived Calendar follow-ups preserve `sourceTripId` when available, so Calendar can attach as supporting context to the originating shared-route memory;
7. Calendar can show active World Pack `reservation -> Calendar` context, currently `fandom_parallel` / `fandom_schedule_board`, as title/boundary UX without changing event, reminder, relationship-fact, or push ownership. Confirmed nonstandard `reservation_board` proposals now reach the same Calendar context path after App Store launch.
8. Map can show active World Pack `transit -> Map` context, currently `survival_city` / `survival_safe_route_pass`, as title/context/boundary UX without changing route, trip, location, ETA, shared-route fact, or Map-derived Calendar handoff ownership.

Still incomplete:

1. Calendar relationship-fact review polish still needs work;
2. Reminders can still use stronger product clarity around future objective/task cues;
3. Map still needs a later visual and interaction pass;
4. route/date/follow-up handoff rules will need more real-world coverage as modules deepen;
5. Calendar and Map world-app presentation contexts need phone-sized user testing together with WorldBook/App Store/Home entry flows.

## 2. Recommended Next Slice

1. Deepen Calendar relationship review and memory-review details.
2. Keep Reminders as the only raw-cue inbox while refining its filters and explanation.
3. Continue expanding read-only route/travel context without moving record ownership out of the source modules.
4. User-test Calendar reservation and Map transit world context as presentation only, not second owners for schedules, route truth, or event judgment.

## 3. Do Not Do

1. Do not turn Calendar back into a generic cue dump.
2. Do not let Reminders write relationship facts directly from raw cues.
3. Do not let Map absorb order, ledger, or schedule ownership just because it can show route context.
4. Do not let World Pack reservation or transit labels turn Calendar/Map into world-rule/event owners.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
6. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when relationship-fact semantics changed
