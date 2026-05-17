# Optional Runtime Control / Director App

Updated: 2026-05-17

## Decision

The runtime-control system is optional. It can be enabled from More / Experimental Toggles through `control_center`.

When disabled, the Home screen does not generate the Director entry and all normal module flows continue unchanged: Chat, Map, Shopping, Food Delivery, Assets, Wallet, Phone, Calendar, Gallery, and Settings remain usable without runtime control.

When enabled, Home restores a standalone Director entry (`app_control_center`, route `/control-center`) in the planned second-screen app area. This entry is a control surface, not a required core app.

## Product Meaning

The Director app is the future "GM / cheat / runtime control" surface for optional game-like systems.

It may later coordinate:

- Event controls: surprise mode, random trigger frequency, cooldowns, module event toggles, event logs.
- Value controls: affinity, funds, inventory-like values, asset state, unlock state, task state.
- World-aware runtime packs: generated or confirmed event/task rules that fit the user's active worldview.
- Override tools: manual correction, debug review, and controlled rewrite of generated runtime data.

It should not become the place where users must import all immersive data. Role cards, assets, map places, shopping products, food delivery restaurants, and other module-native records should still be created inside their own immersive module surfaces.

## Architecture Boundary

Runtime control is a coordination and override layer. It does not replace domain stores.

- `src/stores/system.js` owns the optional Home-entry toggle and page normalization.
- `src/views/ControlCenterView.vue` is currently a safe placeholder surface.
- Event orchestration remains in `src/lib/simulation/*` and `src/stores/simulation.js`.
- Domain mutation still belongs to module-owned actions, for example Food Delivery order events or future Wallet ledger updates.
- Home entry metadata is registered through `src/lib/planned-module-registry.js` and `src/lib/home-entry-registry.js`.

## Acceptance Rules

- Default state: `control_center` is off and `app_control_center` is absent from Home.
- Enabling `control_center` restores `app_control_center` before `app_more` on the second Home page.
- Disabling `control_center` removes `app_control_center` from Home without changing other app tiles.
- Old or imported layouts containing `app_control_center` must be normalized away while the toggle is off.
- The Director route may be visited directly, but the page must explain disabled state and point users back to More for enabling.

## Current Implementation Status

Status: baseline landed.

Landed files:

- `src/views/ControlCenterView.vue`
- `src/router/index.js`
- `src/stores/system.js`
- `src/lib/planned-module-registry.js`
- `src/lib/home-entry-registry.js`
- `src/lib/app-icon-presentation.js`
- `src/views/HomeView.vue`
- `src/views/MoreView.vue`

Regression coverage:

- `tests/system-widget-import.test.js`
- `tests/home-folder-entry.test.js`
- `tests/more-toggle-ui-consumption.test.js`
- `tests/app-icon-presentation.test.js`
- `tests/planned-module-registry.test.js`

## Next Recommended Slice

Connect the Director placeholder to read-only `simulationStore` state first: event mode, event log count, recent triggered events, and module adapter enablement status.

Do not add mutation controls until the read-only panel proves the boundary clearly.
