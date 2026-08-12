# World Hub And Cheats

Updated: 2026-08-10

This file defines the distinction between the current World Hub lane and the future Cheats lane.

## 1. Why They Must Stay Separate

`World Hub` and `Cheats` belong to the same runtime-control family, but they are not the same product surface.

If they are merged too early, the project loses a clean distinction between:

- a readable optional review tool
- a stronger override or god-mode surface

## 2. World Hub

Current meaning:

- optional runtime review and narrow control app
- should stay readable and restrained
- should not make ordinary phone use feel technical

Current implemented direction:

- hidden by default
- enabled by `control_center`
- review-first and narrow-control-first
- shows visible role IDs only for real Contacts profiles; runtime-only or missing-profile targets stay labeled as runtime keys
- filters and inspects event logs and relationship facts with product-facing explanations
- reviews pending generated Chat social proposals such as role refusal, block, restore, and unblock before Chat applies the communication state
- is the integrated hidden entry for cross-module event history, pending choices, location-aware event explanations, and event-scoped review notes
- uses UI-facing relationship memory summaries by default, reserving source-audit detail for focused review surfaces
- does not take ownership of relationship truth, event execution, or source records

## 3. Cheats

Current meaning:

- stronger, more game-like override surface
- hidden-system placeholder for a later unlock path

Current state:

- placeholder concept exists
- product wording exists
- unlock condition, route, and editing surface are not complete

## 4. Product Rule

Do not design Cheats as a real user-facing system before World Hub review surfaces are stable enough.

## 5. Event Entry Decision

Event does not receive a normal Home app. Its user-facing cards remain embedded in Map, Chat, Calendar, and other owning hosts. Cross-module review and adjustment merge into World Hub:

1. World Hub may list event history, pending review, source/adapter explanations, map anchors, and event-scoped review notes.
2. Ordinary reminders, calendar plans, source records, and event execution remain with their owning Modules.
3. Event Runtime remains the hidden coordination Module behind this review surface.
4. The landed EVE-3 Event Notebook is a World Hub view over Event Instances, logs, Chat social proposals, and Map Journey proposals, not a new desktop entry or second event store.
5. Event-scoped notes are durable audit context in `store:simulation` V3. They survive bounded runtime-log rotation and backup/restore, remain attached to one stable event reference, and change only through explicit note actions.
6. Notebook selection and notes never retrigger an event, execute an Adapter, mutate source truth, create a Reminder/Calendar plan, or grant Cheats authority.

## 6. Merge Decision For Cheats

World Hub and Cheats may share the hidden Home utility area, selected-event context, and audit presentation, but they must not merge their permissions or write Interfaces.

- World Hub remains review-first with bounded approve, dismiss, reset, delete-memory, note, and correction actions.
- Cheats remains a separately unlocked privileged Module for explicit value/state overrides, preview, before/after provenance, and safe undo/recompute rules.
- World Hub may link to Cheats after unlock, but a normal World Hub session must never gain Cheats authority merely by opening another tab.
- The exact future Cheats route and unlock condition remain separately gated; the architectural separation no longer depends on that route decision.
