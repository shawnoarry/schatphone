# Optional Runtime Control / World Hub App

Updated: 2026-05-17

## Decision

The runtime-control system is optional. Its product-facing name is `世界中枢 / World Hub`.

Technical compatibility names remain unchanged:

- Home app id: `app_control_center`
- Feature toggle id: `control_center`
- Route: `/control-center`
- View file: `src/views/ControlCenterView.vue`

These technical names are intentionally preserved so existing Home layouts, tests, imported backups, and route contracts do not need a migration just because the product name changed.

When disabled, the Home screen does not generate the World Hub entry and all normal module flows continue unchanged: Chat, Map, Shopping, Food Delivery, Assets, Wallet, Phone, Calendar, Photos, and Settings remain usable without runtime control.

When enabled, Home restores a standalone World Hub entry (`app_control_center`, route `/control-center`) in the planned second-screen app area. This entry is a control surface, not a required core app.

## Product Meaning

World Hub is the future optional "GM / cheat / runtime control" surface for game-like systems.

It may later coordinate:

- Event controls: surprise mode, random trigger frequency, cooldowns, module event toggles, event logs.
- Value controls: affinity, funds, inventory-like values, asset state, unlock state, task state.
- World-aware runtime packs: generated or confirmed event/task rules that fit the user's active worldview.
- Override tools: manual correction, debug review, and controlled rewrite of generated runtime data.

It should not become the place where users must import all immersive data. Role cards, assets, map places, shopping products, food delivery restaurants, images, and other module-native records should still be created inside their own immersive module surfaces.

## Architecture Boundary

World Hub is a coordination and override layer. It does not replace domain stores.

- `src/stores/system.js` owns the optional Home-entry toggle and page normalization.
- `src/views/ControlCenterView.vue` owns the current World Hub UI.
- Event orchestration remains in `src/lib/simulation/*` and `src/stores/simulation.js`.
- Relationship runtime state remains in `src/stores/relationshipRuntime.js`.
- Domain mutation still belongs to module-owned actions, for example Food Delivery order events, Wallet ledger records, or future Assets updates.
- Home entry metadata is registered through `src/lib/planned-module-registry.js` and `src/lib/home-entry-registry.js`.

## Acceptance Rules

- Default state: `control_center` is off and `app_control_center` is absent from Home.
- Enabling `control_center` restores `app_control_center` before `app_more` on the second Home page.
- Disabling `control_center` removes `app_control_center` from Home without changing other app tiles.
- Old or imported layouts containing `app_control_center` must be normalized away while the toggle is off.
- `/control-center` may be visited directly, but the page must explain disabled state and point users back to More for enabling.
- Product copy should say `世界中枢 / World Hub`; technical docs may mention `Control Center` only as route/code compatibility.

## Current Implementation Status

Status: baseline plus read-only runtime panel, relationship review, and opt-in foreground runtime wiring landed.

Landed files:

- `src/views/ControlCenterView.vue`
- `src/router/index.js`
- `src/stores/system.js`
- `src/lib/planned-module-registry.js`
- `src/lib/home-entry-registry.js`
- `src/lib/app-icon-presentation.js`
- `src/views/HomeView.vue`
- `src/views/MoreView.vue`
- `tests/control-center-view.test.js`
- `src/lib/simulation/foreground-session-tick-lifecycle.js`
- `tests/simulation-foreground-session-tick-lifecycle.test.js`

Regression coverage:

- `tests/system-widget-import.test.js`
- `tests/home-folder-entry.test.js`
- `tests/more-toggle-ui-consumption.test.js`
- `tests/app-icon-presentation.test.js`
- `tests/planned-module-registry.test.js`
- `tests/control-center-view.test.js`

Current World Hub capabilities:

- Reads `simulationStore` without mutating it.
- Shows Surprise Mode, event log count, active cooldown count, recent triggered/skipped/failed counts, module event enablement, world-variant metadata, and latest event logs.
- Reads relationship runtime state: entity count, recent facts, pending effects, and top snapshots.
- Can approve or dismiss `pending_confirmation` relationship runtime events.
- Does not expose freeform value editing, funds editing, unlock editing, or automatic high-impact romance/conflict mutation yet.

## Next Recommended Slice

Start the Calendar / Reminders split before expanding Calendar relationship facts.

Why:

- Calendar should return to real schedule/date meaning.
- Reminders should own callbacks, follow-ups, logistics reminders, stock review cues, and world/task objectives.
- World Hub should remain optional runtime review and override, not the normal app where users manage everyday reminders.

Alternative same-size target: add Gallery relationship facts for shared photos, people albums, trip memories, and memory collections.
