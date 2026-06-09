# Lock Notifications And Software Update Plan

Date: 2026-06-09
Status: `DONE`
Task package: `visual-and-ia-governance`

## Goal

Move the current work focus out of WorldBook and land a small system-shell usability slice:

1. lock-screen notifications must be clearable, so version updates, backup reminders, and other system messages do not pile up forever;
2. Settings must expose an iOS-like Software Update surface where users can see the current version, check an available version, install it, postpone it, and intentionally restart into the new version;
3. update restart behavior should feel like one explicit action, not an unclear flow where the currently running version needs to be exited twice.

## Current Findings

1. `src/views/LockScreen.vue` already reads notifications from `systemStore` and opens a notification by marking it read, unlocking, and routing to the notification route.
2. `src/stores/system.js` already provides `removeNotification()` and `clearNotifications()`, but the lock screen does not expose them.
3. `src/views/SettingsView.vue` currently supports `general`, `notification`, `automation`, and `about` subpages. There is no dedicated software-update menu or version-confirmation flow.
4. `SettingsAboutInfoCard` shows a static app version, while update lifecycle state is not represented in persisted system settings.

## Implementation Steps

1. Add a tiny app-update metadata/helper module for current version, available test version, release notes, and normalized update state.
2. Extend `systemStore.settings.system` with persisted `softwareUpdate` state and actions for check, install, postpone, and clearing the restart request.
3. Add lock-screen actions:
   - clear all notifications from the lock notification header;
   - clear one notification from each notification card without unlocking or opening its route.
4. Add a Settings Software Update entry and focused subpage:
   - current version;
   - available version;
   - last checked time;
   - release notes;
   - check update, download/install, later, and restart buttons.
5. Add regression tests for lock-screen clear behavior and Settings software-update flow.

## Acceptance

1. A user can clear all lock-screen notifications in one tap.
2. A user can clear a single lock-screen notification without opening the app route.
3. Settings contains a Software Update entry that can be opened directly from the settings list or by `/settings?menu=software-update`.
4. Installing a simulated update creates a visible restart-required state and a lock-screen notification that routes back to Software Update.
5. The restart action is explicit and uses one reload request.

## Result

Landed on 2026-06-09:

1. lock-screen notification cards now expose per-item clear and a clear-all action;
2. Settings has a Software Update entry and subpage with version rows, release notes, check/install/later/restart actions, and `/settings?menu=software-update` deep-link support;
3. software update state is persisted under `settings.system.softwareUpdate` with store actions for check, install, postpone, and finishing the restart;
4. the simulated install path adds a `system_software_update` notification routed to Software Update.
