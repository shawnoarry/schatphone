# World Hub And Cheats

Updated: 2026-06-01

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

## 5. Future Freeze Decision

Later we still need to decide whether Cheats becomes:

1. a stronger tab inside World Hub
2. a separately unlocked hidden app
3. a future-only concept with no real route until a later phase
