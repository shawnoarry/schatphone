# Optional Runtime Control / World Hub App

Updated: 2026-05-19

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
- event intensity or enablement controls;
- relationship runtime review;
- pending confirmation approval or dismissal;
- later limited override or correction actions.

It must not become:

- the main role-authoring surface;
- the main reminders/task surface;
- the everyday place where users are forced to manage normal phone life.

## Architecture Boundary

World Hub is a coordination layer, not the owner of domain records.

- `src/stores/system.js` owns the optional Home-entry toggle.
- `src/views/ControlCenterView.vue` owns the current World Hub UI.
- event execution remains in simulation/runtime files.
- relationship truth remains in `src/stores/relationshipRuntime.js`.
- domain records still belong to their own modules, such as Calendar, Wallet, Shopping, Food Delivery, Map, or Contacts.

## Acceptance Rules

- Default state: `control_center` is off and `app_control_center` is hidden from Home.
- Enabling `control_center` restores the World Hub app entry.
- Disabling `control_center` removes the entry without disturbing unrelated app tiles.
- Direct route visits to `/control-center` are allowed, but the UI should explain disabled state when the toggle is off.
- Product copy should say `世界中枢 / World Hub`; `Control Center` is a technical compatibility label only.

## Current Implementation Status

Status: baseline landed.

Current World Hub capabilities:

1. reads simulation runtime status;
2. shows runtime counts, logs, cooldowns, and enablement state;
3. reads relationship runtime status and top snapshots;
4. can approve or dismiss pending relationship events when that review path is enabled;
5. consumes primary-led relationship-memory recall summaries while preserving source-audit detail;
6. can filter event logs by module/status and inspect selected logs with trigger, reason, adapter, target, and world-variant explanations;
7. can filter relationship facts by status/source and inspect selected facts with metric-delta, source-record, pending-effect, and supporting-only explanations;
8. can review pending generated Chat social proposals before high-risk communication state changes are applied in Chat;
9. does not yet expose broad freeform value editing, funds editing, unlock editing, or a completed Cheats surface.

## Relationship To Cheats

`金手指 / Cheats` is still a future lane.

Current status:

- placeholder concept exists;
- product wording exists;
- unlock source, route design, and final surface are not frozen.

Important rule:

- do not design Cheats as a normal default app;
- do not freeze Cheats before World Hub review surfaces are stable enough.

## Next Recommended Slice

1. preserve the filtered review-pack baseline while adding future event adapters and generated Chat social-event sources;
2. add another read-only explanation slice only when product review finds a concrete gap;
3. freeze Cheats only after the World Hub review surface is strong enough to support a clearer control hierarchy.
