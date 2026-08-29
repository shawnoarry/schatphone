# Optional Runtime Control / World Hub App

Updated: 2026-08-29

## Decision

The runtime-control system is optional.

Its product-facing name is:

- `世界中枢 / World Hub`

Technical compatibility names remain unchanged:

- Home app id: `app_control_center`
- feature toggle id: `control_center`
- route: `/control-center`
- view file: `src/views/ControlCenterView.vue`

These technical names remain stable so Home layouts, tests, imports, and route contracts do not need unnecessary migration.

## Product Meaning

World Hub is the optional runtime review and narrow-control app.

It is the softer, safer runtime-control surface in the same family as future `金手指 / Cheats`, but it is not the same thing.

World Hub may coordinate:

- event review;
- event history, pending choices, location-aware event explanations, and event-scoped review notes;
- event intensity or enablement controls;
- relationship runtime review;
- pending confirmation approval or dismissal;
- later limited override or correction actions.

It must not become:

- the main role-authoring surface;
- the main reminders/task surface;
- the everyday place where users are forced to manage normal phone life.
- a second Event Runtime store, general reminder/task inbox, or privileged Cheats editor.

## Architecture Boundary

World Hub is a coordination layer, not the owner of domain records.

- `src/stores/system.js` owns the optional Home-entry toggle.
- `src/views/ControlCenterView.vue` owns the current World Hub UI.
- event execution remains in simulation/runtime files.
- relationship truth remains in `src/stores/relationshipRuntime.js`.
- domain records still belong to their own modules, such as Calendar, Wallet, Shopping, Food Delivery, Map, or Contacts.
- ordinary event frequency, module permission, supported presentation, and foreground-check configuration lives in `设置 > 事件 / Settings > Events`; World Hub reviews event history and pending decisions instead of duplicating those baseline controls.

## Acceptance Rules

- Default state: `control_center` is off and `app_control_center` is hidden from Home.
- Enabling `control_center` restores the World Hub app entry.
- Disabling `control_center` removes the entry without disturbing unrelated app tiles.
- Direct route visits to `/control-center` are allowed, but the UI should explain disabled state when the toggle is off.
- Product copy should say `世界中枢 / World Hub`; `Control Center` is a technical compatibility label only.

## Current Implementation Status

Status: baseline plus EVE-3 Event Notebook landed.

Current World Hub capabilities:

1. reads simulation runtime status;
2. shows runtime counts, logs, cooldowns, and enablement state;
3. reads relationship runtime status and top snapshots;
4. can approve or dismiss pending relationship events when that review path is enabled;
5. consumes primary-led relationship-memory recall summaries while preserving source-audit detail;
6. exposes one Event Notebook over Event Instances, runtime logs, Chat social proposals, and Map Journey proposals, with source/module/status filters, all/pending/noted counts, stable lineage, stale-source explanation, and selected-event detail;
7. can filter relationship facts by status/source and inspect selected facts with metric-delta, source-record, pending-effect, and supporting-only explanations;
8. can review pending generated Chat social proposals before high-risk communication state changes are applied in Chat, and can explain proposal source, trigger policy, and ownership boundaries for AI-sourced and foreground/session runtime proposals;
9. persists event-scoped review notes through Simulation V3, backup/restore, and bounded runtime-log rotation, with explicit create/update/delete actions only;
10. Notebook selection and notes do not retrigger events, execute Adapters, mutate source records, create Reminders/Calendar plans, or grant Cheats authority;
11. does not expose broad freeform value editing, funds editing, unlock editing, or a completed Cheats surface. Event still receives no ordinary Home app.

## Relationship To Cheats

`金手指 / Cheats` is still a future lane.

Current status:

- placeholder concept exists;
- product wording exists;
- unlock source, route design, and final surface are not frozen.

Important rule:

- do not design Cheats as a normal default app;
- do not freeze Cheats before World Hub review surfaces are stable enough.
- event review may merge into World Hub, but Cheats permissions and direct override Interfaces must stay separate even if a future unlocked entry is linked from World Hub.

## Next Recommended Slice

1. preserve EVE-3 as a read model and event-note surface, not a second event store or source editor;
2. require separate EVE-4 approval before registering another host, template, or content pack;
3. keep Cheats and EVE-5 Mini Scene/media expansion separately gated.
