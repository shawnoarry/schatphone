# Calendar And Reminders Split / 日历与提醒事项拆分决策

Updated: 2026-05-18

Audience: product managers, designers, engineers, QA, and future AI assistants.

## 1. Decision

SchatPhone should split the current combined Calendar cue surface into two product concepts:

| Product concept | Chinese name | English name | Target role |
| --- | --- | --- | --- |
| Calendar | 日历 | Calendar | A real-phone-like schedule app for dates, plans, anniversaries, timed events, and confirmed world-life events. |
| Reminders | 提醒事项 | Reminders | A user-facing follow-up and cue queue for cross-module actions, callbacks, logistics updates, tasks, and world-control-linked objectives. |

Short version:

- Calendar should feel like the user's actual schedule.
- Reminders should collect things that need user attention or confirmation.
- World Hub should remain the optional runtime/control app, not the normal place where users manage ordinary reminders.

## 2. Why This Split Is Needed

The current Calendar implementation already works technically, but its product meaning is mixed:

- It shows Map-derived follow-up cues.
- It shows Phone missed-call callback cues.
- It shows Shopping delivery cues.
- It shows Stock market review cues.
- It turns confirmed cues into Calendar events and scheduled push notifications.

That made sense as an early cross-module MVP, but it causes a product problem: users expect `Calendar / 日历` to mean schedule, dates, and plans, while the current surface also behaves like a cue-confirmation inbox. If left as-is, Calendar will slowly become a backend-like event log instead of an immersive phone app.

The new boundary protects immersion:

- Calendar = "What is on my schedule?"
- Reminders = "What should I follow up on?"
- World Hub = "How is the world/runtime system being controlled or reviewed?"

## 3. Current Implementation Reality

Current code is still combined:

| Current code area | Current behavior |
| --- | --- |
| `src/stores/calendar.js` | Owns confirmed Calendar `events`, event time editing, compatibility wrappers for old cue methods, and real push scheduling state. |
| `src/stores/reminders.js` | Owns Phone missed-call cues, Stock market cues, Shopping delivery cues, Reminders persistence, legacy Calendar cue migration, and Reminders confirmation/dismissal entry points. |
| `src/views/CalendarView.vue` | Leads with confirmed Calendar events, push status, and a Reminders summary link; raw cue cards are no longer processed here. |
| `src/views/RemindersView.vue` | Renders the user-facing cross-module cue inbox. |
| `/calendar` | Current route for confirmed schedule events, event time editing, push status, and a pending-cue summary. |
| `/reminders` | Current route for cross-module follow-ups and cue confirmation. |

This document does not mean the code has already been split. It records the target direction and the next refactor sequence.

## 4. Target Responsibilities

### Calendar / 日历

Calendar should own:

- User-created schedule items.
- Confirmed dates and plans.
- Anniversaries and recurring dates.
- World-date or story-date entries, if enabled by future world settings.
- Timed push scheduling for confirmed Calendar events.
- Relationship facts only when the event is truly schedule-like, such as a date, anniversary, missed plan, recurring plan, or important appointment.

Calendar should not own:

- Raw cross-module cue queues.
- Delivery status queues.
- Stock review suggestions before user confirmation.
- World Hub/game-control state.
- Generic event logs.

### Reminders / 提醒事项

Reminders should own:

- Phone callback reminders.
- Map place follow-up reminders.
- Shopping delivery follow-ups.
- Food Delivery follow-ups.
- Stock review reminders.
- World-control-linked tasks or objectives that need user attention.
- Future quest-like objectives generated from a confirmed worldview pack.
- Confirmation/dismissal state for actionable cues before they become schedule items.

Reminders can optionally create Calendar events after user confirmation.

Example:

| Source module | Reminder behavior | Calendar behavior |
| --- | --- | --- |
| Phone | "Call this contact back" appears in Reminders. | If user schedules a callback time, Calendar receives the timed event. |
| Map | "Return to this place" appears in Reminders. | If user sets a visit time, Calendar receives the plan. |
| Shopping | "Package arriving soon" appears in Reminders. | Calendar only receives it if the user wants a timed reminder. |
| World control | "Complete 3 campus check-ins" appears in Reminders or task view. | Calendar only receives a date-bound objective. |

### World Hub / 世界中枢

World Hub should own:

- Optional runtime review.
- Event intensity and future override controls.
- Pending high-impact effect approval.
- Future value editing such as affinity, funds, unlocks, and task state.
- World-control debugging and advanced inspection.

World Hub should not become the normal app where users create everyday reminders. It is the optional GM / cheat / control surface, not the user's default task app.

Technical compatibility note: the route remains `/control-center`, the feature toggle remains `control_center`, and the Home app id remains `app_control_center`.

## 5. Relationship With World Control

Reminders can be the user-facing task surface for world-aware gameplay without forcing every user into a game dashboard.

Possible flow:

1. User imports or edits worldview/persona data from immersive module locations.
2. The world/event system generates optional objectives or cue packs.
3. World Hub can review or control those packs if the optional World Hub entry is enabled.
4. Reminders shows only the actionable, user-facing follow-up items.
5. Calendar receives only items that have a date/time schedule meaning.

This keeps the project direction aligned with the core standard: events, tasks, and numbers should serve freedom and immersion, not restrict the user.

## 6. Implementation TODO

Recommended sequence:

| Step | Task | Status |
| --- | --- | --- |
| 1 | Record product decision and module naming glossary. | DONE |
| 2 | Introduce `Reminders / 提醒事项` as a planned module name in docs and PM catalog. | DONE |
| 3 | Add a code seam for Reminders without changing existing Calendar behavior. | DONE |
| 4 | Move cue arrays and confirmation/dismissal methods from `calendarStore` into `remindersStore`, with compatibility wrappers. | DONE |
| 5 | Keep Calendar events and real push scheduling in Calendar. | DONE |
| 6 | Update `/calendar` UI so it leads with schedule/date content instead of cue confirmation. | DONE |
| 7 | Decide whether Reminders has a visible Home entry, appears inside More, or stays as a system app reachable from notifications. | DONE |
| 8 | Add tests proving Map/Phone/Shopping/Stock cues still work after the split. | PARTIAL_DONE |
| 9 | Add Calendar relationship facts only after Calendar no longer contains raw cue queues. | DONE |

Implementation note, 2026-05-17:

- Phase 1 code seam is now landed as `src/stores/reminders.js` and `src/views/RemindersView.vue`.
- This phase intentionally does not migrate persisted data out of `store:calendar`.
- Reminders currently reads Map, Phone, Shopping, and Stock cue sources and delegates confirm/dismiss actions back to existing owners.
- Calendar remains compatible and still displays the old cue-confirmation surface until cue arrays and lifecycle methods are moved in a later phase.

Implementation note, 2026-05-18:

- Phone, Stock, and Shopping cue arrays now live in `src/stores/reminders.js`.
- Reminders persists its own `store:reminders` state and migrates old cue arrays from legacy `store:calendar` when needed.
- `src/stores/calendar.js` keeps compatibility wrappers such as `upsertPhoneMissedCallCueFromCall`, `confirmShoppingDeliveryCue`, and `findStockMarketCueByStockId`, but these wrappers delegate raw cue ownership to Reminders.
- Calendar still owns confirmed events, event time editing, push schedule/cancel state, and backup-compatible event snapshots.
- Settings backup/export now includes a standalone `reminders` section while keeping Calendar cue mirrors in Calendar snapshots for compatibility.
- `/calendar` now presents a schedule-first overview, confirmed events, push status, and a pending Reminders summary; raw cue confirmation/dismissal UI now lives in `/reminders`.
- Calendar Shopping/Stock view tests now assert that Calendar summarizes raw cues and routes processing to Reminders instead of rendering cue operation cards.
- Reminders is now a visible daily Home app entry (`app_reminders` -> `/reminders`), placed beside Calendar in the default Home layout rather than inside More.
- `/reminders` now supports source filters, handling-status filters, filtered empty states, and explicit reset behavior.
- Calendar confirmed events can now write low-impact relationship facts only after the user selects an existing Chat contact from the Calendar event card.
- Raw Reminders cues still cannot write relationship facts directly; they must first become confirmed Calendar events.

## 7. Guardrails

- Do not rename raw cue queues to Calendar events without user confirmation.
- Do not let Calendar become a backend log.
- Do not let Reminders replace World Hub controls.
- Do not let World Hub become mandatory for users who prefer free chat and light phone-life simulation.
- Do not auto-schedule push notifications for every cue; scheduling should remain explicit or clearly controlled.
- Do not add high-impact relationship or world-state effects from reminders until World Hub review and event rules are stronger.

## 8. Acceptance Criteria For The Future Refactor

The split is considered complete when:

- Calendar can be explained to a non-technical user as a normal schedule/date app.
- Reminders can be explained as the place for callbacks, follow-ups, package updates, and world/task cues.
- Existing Map, Phone, Shopping, Stock, and future Food Delivery cues still have a clear home.
- Push scheduling still works for confirmed timed events.
- World Hub remains optional and hidden unless enabled.
- Chat and relationship runtime read only meaningful confirmed facts, not noisy raw cue drafts.
