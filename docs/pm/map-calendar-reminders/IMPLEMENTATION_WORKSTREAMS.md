# Map Calendar Reminders Implementation Workstreams / 地图日历提醒事项实施工作流

Updated: 2026-05-31

## 1. Workstream A: Map Travel Core

- trip lifecycle
- route context
- ETA and location state

## 2. Workstream B: Calendar Real Schedule Meaning

- confirmed event flows
- schedule/date presentation
- relationship-fact safe adapters only after confirmation
- confirmed follow-ups should reuse upstream `sourceTripId` lineage when Map created the cue
- `reservation -> Calendar` World Pack context can change title/context/boundary presentation only, including confirmed `reservation_board` appBindings; it must not change event storage, confirmation rules, or push scheduling

## 3. Workstream C: Reminders As Cue Layer

- callbacks
- follow-ups
- logistics reminders
- stock review cues
- world/task objective cues

## 4. Workstream D: Mini Scene Request Adapters

- begin only after the shared Mini Scene foundation and the specific source slice are promoted
- Calendar's first candidate is one confirmed K-pop `schedule.music_show_day` event using existing event truth
- Map receives a separate later Adapter and must use trip/location truth rather than Calendar or World Pack assumptions
- callers never execute Book regex, render HTML, select profiles, or persist Mini Scene artifacts
- user off/text/interactive policy and all fallback behavior stay behind the shared Mini Scene Interface

## 5. Semantic Guardrails

Treat these as bugs:

1. Calendar becomes a generic cue dump again
2. Reminders starts replacing confirmed schedule meaning
3. Map starts owning business records that only need route context
4. World Pack reservation context becomes a hidden event-rule owner instead of presentation context
5. Calendar or Map copies Mini Scene profile/regex/presenter logic or lets a scene interaction mutate source truth without owner validation
