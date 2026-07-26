# Map Calendar Reminders Status And Handoff

Updated: 2026-07-26

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
9. Roadmap 4.8 accepts a future shared Mini Scene Interface. Calendar and Map remain source owners and may later add separate request Adapters; no popup mode, profile binding, regex execution, artifact persistence, or presenter is implemented in this package.
10. The integrated Modern Seoul K-pop `2 + 6 + 1` catalog includes one independently selectable music-show-day prose rule. That rule remains Book/WorldBook content only: it is not executable Calendar configuration, a Mini Scene profile, a caller registration, or a trigger.

Still incomplete:

1. Reminders can still use stronger product clarity when a real objective/task cue family is promoted;
2. Map still needs a later visual and interaction pass;
3. route/date/follow-up handoff rules will need more real-world coverage as modules deepen;
4. Calendar and Map world-app presentation contexts need true-device testing together with WorldBook/App Store/Home entry flows;
5. Calendar's relationship adapter still knows concrete Chat/relationship stores and is a candidate for a deeper neutral interface.
6. the first planned Mini Scene source integration is a separately gated confirmed K-pop Calendar music-show-day Adapter; Map follows only through its own later slice.
7. the Calendar-owned carrier described below is a read-only design candidate. No field, migration, Adapter, or schema implementation is approved or landed.

### Read-Only Calendar Carrier Candidate

Status: `READ_ONLY_CANDIDATE / SEPARATE_APPROVAL_REQUIRED`

The smallest reviewed comparison candidate adds four optional flat Calendar fields: `eventType`, `scheduleRole`, `schedulePhase`, and `schedulePlaceLabel`. Existing and ordinary events remain valid with all four fields absent. A future music-show-day Adapter would fail closed unless the source event is confirmed, has a valid start time and relationship binding, uses the exact approved event type, has a non-empty schedule role, and provides at least one schedule phase or place label.

This candidate stores only Calendar-owned schedule facts. It does not copy encyclopedia material, complete member lists, coordinates, WorldBook prose, a structured Mini Scene profile, World Pack membership, sensitive-content choices, or facts owned by Map, Contacts, or Event Runtime. It must not infer eligibility from the event title.

The carrier could be reviewed independently from Mini Scene runtime because fields alone do not register a caller, resolve a world profile, create an artifact, or invoke a Presenter. Implementing the future Adapter still waits for the separately approved shared Module, Text Presenter, Settings, and persistence-policy stages. Map remains a different later Adapter and must not be combined into the Calendar slice.

## 2. Recommended Next Slice

Calendar relationship review and memory-lineage detail have reached the current 4.2 acceptance.

Current safe candidates:

1. user-test Calendar reservation and Map transit world context on a real phone as presentation only;
2. deepen the confirmed-event relationship adapter without changing Calendar, Chat, or relationship-runtime ownership;
3. keep Reminders as the only raw-cue inbox and add task/objective presentation only for a promoted cue family;
4. decide whether to approve, revise, or reject the read-only Calendar carrier candidate before any schema or migration work; keep Calendar and Map changes in separate owner slices.
5. after roadmap 4.8 shared foundation and persistence/presenter prerequisites are complete, add only one Calendar request Adapter for the confirmed music-show-day scene; do not combine Map or new schedule schema in that slice.

## 3. Do Not Do

1. Do not turn Calendar back into a generic cue dump.
2. Do not let Reminders write relationship facts directly from raw cues.
3. Do not let Map absorb order, ledger, or schedule ownership just because it can show route context.
4. Do not let World Pack reservation or transit labels turn Calendar/Map into world-rule/event owners.
5. Do not execute Mini Scene regex/rendering in Calendar or Map, and do not let scene failure or interaction bypass source-record validation.
6. Do not treat the read-only carrier candidate as approved implementation, and do not derive its fields from titles or K-pop prose.
7. Do not move WorldBook content, Mini Scene profiles, Pack state, sensitive choices, Map coordinates, Contacts identity, or Event Runtime provenance into Calendar-owned fields.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
6. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when relationship-fact semantics changed
7. `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` when Calendar/Map Mini Scene request meaning changes
