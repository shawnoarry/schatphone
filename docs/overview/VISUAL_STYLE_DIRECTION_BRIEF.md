# SchatPhone Visual Style Direction Brief

Updated: 2026-08-24

Purpose: this document records the intended visual direction for the appearance rebuild.

`docs/overview/APPEARANCE_REBUILD_SCOPE.md` answers what should be rebuilt.
This file answers what the rebuilt UI should feel like.

This is a direction brief, not a live task board.

## 1. Global Direction

Core direction:

1. the whole product should feel closer to an iPhone-like mobile OS;
2. individual modules may borrow from other strong app references when a feature needs clearer presentation;
3. the top-level keyword remains real-phone immersion.

Interpretation:

- "iPhone-like" means believable mobile-system behavior, restrained system chrome, polished transitions, readable hierarchy, and strong default ergonomics;
- it does not mean literal copying of every Apple screen;
- feature-heavy modules may borrow other references when they solve the product problem better.

Must avoid:

1. admin-dashboard feeling
2. generic webpage feeling
3. flat settings piles without mobile hierarchy
4. styles that break the illusion of being inside one phone

Appearance theme direction:

1. day/night is an independent display axis; every authored system theme should eventually provide both variants;
2. system themes own global color, material, Dock, controls, radius, shadow, and system background tokens;
3. curated native-system App icon packs remain independently selectable and keep the established per-app override priority;
4. one-click style kits compose a system theme, icon pack, and optional recommended wallpaper without locking later customization;
5. initial authored directions are Cloud Pastel, Dessert Bakery, and Misty Glass, but they remain visual follow-up work until their day/night tokens and icon assets are deliberately reviewed.

## 2. Module Direction Table

| Module | Primary reference | Current maturity | Target feeling | Next treatment |
| --- | --- | --- | --- | --- |
| Global shell | iPhone system UI plus other mobile OS patterns when useful | Strong mobile Home baseline; unresolved wide-viewport behavior | coherent, immersive, believable phone at every supported viewport | decide device-frame/adaptive-workspace contract before desktop page polish |
| Chat | KakaoTalk, with WhatsApp and iMessage details | strong mobile identity; sparse wide layout | warm, social, believable messaging app | preserve and polish adaptive layout |
| Map | Google Maps plus ride-hailing trip flows | strong identity | practical map plus trip system | preserve; polish only observed states |
| Photos / Gallery | iPhone Photos and collection surfaces | functional asset-management scaffold | real album first, asset center second | targeted first-screen rebuild candidate |
| Food Delivery | consumer delivery apps with SchatPhone-owned assets | strongest asset-led commerce surface | fast, appetizing, store-specific delivery experience | preserve direction; refine detail, checkout, and responsive density |
| Shopping | marketplace/platform apps | functional but generic shared shell | selected platform identity with clear shared shopping ownership | targeted platform-identity slice |
| Appearance | iPhone Settings and customization surfaces | usable system-control baseline | system customization, not dev console | targeted token/state cleanup |
| Settings / Network / Profile | iPhone Settings and restrained technical panels | usable native-system baseline | calm, legible system utilities | shared system cleanup rather than bespoke rebuilds |
| Contacts | iPhone Contacts plus social profile editors | mature behavior, dense presentation | living character and relationship archive | target one detail/review state at a time |
| Calendar / Reminders | iPhone Calendar plus reminder/trip status patterns | functional status-card baseline | personal schedule with clear event meaning | targeted schedule-first rebuild candidate |
| WorldBook / Book | native notes/reference apps and lightweight knowledge tools | Book has a stronger library identity; WorldBook remains dense | readable in-phone memory and lore system | preserve ownership; target dense states only |
| Phone / Wallet / Stock / Files | inherit shell first | functional MVPs | clean secondary apps | no bespoke visual system until product role matures |
| More | none | compatibility redirect | no user-facing surface | no visual work |

## 3. Chat Direction

Primary reference:

- KakaoTalk

Secondary references:

- WhatsApp
- iMessage

Target:

Chat should feel like a real messaging app inside the phone, not like a web page that happens to contain messages.

Direction notes:

1. overall mood can lean KakaoTalk: familiar, social, light, and conversation-first;
2. WhatsApp is useful for thread utility and media actions;
3. iMessage is useful for message polish, bubble behavior, and attachment feel;
4. some fine-grain details should be decided during the dedicated Chat visual pass rather than frozen here.

Must preserve:

- manual `Trigger Reply` lane
- thread preferences
- message actions
- rich-send panel
- structured assistant blocks
- notification and lock-screen feedback path

## 4. Map Direction

Primary reference:

- Google Maps

Functional direction:

- combine map exploration with a ride-hailing-like trip system

Target:

Map should feel like a practical map app with route progress, trip state, current location, destination choice, and arrival feedback.

Direction notes:

1. Google Maps is the strongest reference for map readability, route hierarchy, place cards, and location controls;
2. ride-hailing references help shape trip lifecycle: start, en route, arrival, history, and reminders;
3. SchatPhone should still keep its simulation-first rule: richer visuals are fine, but the core progress stays system-computed.

Must preserve:

- simulation-first behavior
- optional AI visual enhancement
- Calendar/Reminders ownership split
- trip lifecycle and history
- WorldBook relevance hooks

## 5. Photos Direction

Current naming note:

The current module sometimes behaves like an asset center, but the user-facing visual identity should be Photos first.

Primary reference:

- iPhone Photos

Target:

Photos should feel like a real album app while quietly preserving its cross-module asset-hub responsibilities.

Suggested collection categories:

1. Wallpapers
2. Memories
3. People
4. Journeys
5. Reference Images
6. Scenarios

Direction notes:

1. the page should not lead with file-manager language;
2. asset-management functions can remain, but should feel like album organization and usage badges;
3. wallpaper, role images, map backgrounds, and chat references should feel like natural album reuse rather than admin binding.

Must preserve:

- asset import
- category behavior
- usage badges
- delete/replace safety
- cross-module bindings

## 6. Other Modules

For modules without a dedicated visual direction yet:

1. inherit the iPhone-like global shell;
2. avoid inventing strong bespoke page identities too early;
3. update this brief when new reference directions are frozen instead of scattering style notes elsewhere.

Current sequencing rule:

- `preserve + polish`: Home, Chat, Map, and Food Delivery;
- `targeted rebuild`: Gallery first screen, Calendar/Reminders schedule identity, Shopping platform identity, and selected dense WorldBook/Contacts states;
- `inherit shell`: Phone, Wallet, Stock, and Files;
- `decision first`: wide-viewport shell framing and interaction scale.

These labels are portfolio guidance, not an execution queue. Promote only one concrete slice through the live roadmap and visual package handoff.

## 7. Guidance For Future AI Assistants

1. read `APPEARANCE_REBUILD_SCOPE.md` before proposing visual work;
2. use this file to choose references and mood for a specific page;
3. for unspecified modules, inherit the global shell and avoid over-personalized styling;
4. for Chat, Map, and Photos, respect the module-specific references here before inventing new directions.
