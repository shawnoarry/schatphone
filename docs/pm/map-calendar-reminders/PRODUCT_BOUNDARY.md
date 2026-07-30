# Map Calendar Reminders Product Boundary

Updated: 2026-07-30

This file defines ownership boundaries for Map, Calendar, Reminders, and Phone-like callback support.

## 1. Map

Map owns:

- route
- trip
- location
- ETA and travel context
- per-world local map-pack binding, recommendation fallback, and version identity
- custom map-pack metadata that references a Gallery-owned source image
- player-created places, detailed player-pin administration, and canonical real/fantasy coordinates
- deterministic local distance estimation when route planning is absent

Map does not own:

- shopping orders
- food orders
- wallet ledgers
- confirmed schedule meaning
- relationship truth
- Mini Scene world-profile resolution, regex execution, artifacts, or presenters
- device-location truth, live traffic, navigation, or third-party POI truth
- commercial map-provider billing or provider-specific place identity
- Gallery asset bytes, image-generation credentials, or temporary generated candidates

Map may later request a Mini Scene from a confirmed trip/location event using canonical Map facts. Its per-module popup mode remains a user setting, and any interaction that requests a route/location change returns to Map validation.

Everyday place use does not mutate coordinates by dragging. Map Settings owns explicit coordinate reselection for player pins; map-pack places remain versioned read-only content. The development-only Kakao comparison may render canonical coordinates in an isolated preview but cannot become the owner of saved place identity, load POI or route services, or authorize a production provider dependency.

## 2. Calendar

Calendar owns:

- confirmed events
- real schedule/date meaning
- confirmed schedule-like reminders after handoff
- real push scheduling and event-time edits
- relationship-fact review for confirmed schedule events

Calendar does not own:

- all cue queues
- logistics follow-ups
- callback backlog
- runtime-control semantics
- World Pack reservation rules or event judgment
- Mini Scene world-profile resolution, regex execution, artifacts, or presenters

Calendar may later request a Mini Scene from a confirmed event using canonical schedule, time, place, participant, and push-state facts. Generation or presentation failure cannot change the confirmed event, and an interaction that requests an event edit returns to Calendar validation.

## 3. Reminders

Reminders owns:

- callbacks
- follow-ups
- logistics reminders
- cross-module cue queues
- world/task objectives when needed

Reminders does not own:

- confirmed schedule/date identity
- runtime-control semantics

## 4. Phone

Phone owns:

- call logs
- call-facing interaction history
- missed-call continuity that may later feed Reminders

Phone does not own:

- Calendar schedule truth
- relationship truth

## 5. Handoff Rule

- Reminders can promote something into Calendar when it becomes a real confirmed schedule/date item.
- Map can provide route/location context, but does not absorb schedule ownership.
- Map-derived cues should pass explicit trip lineage into Calendar when available, while Calendar remains the owner of the confirmed event.
- Phone can generate callback context, but callback scheduling belongs to Reminders until it becomes a real Calendar item.
- World Pack can provide `reservation -> Calendar` labels/context for Calendar, including confirmed `reservation_board` appBindings, but it cannot move schedule records or push decisions out of Calendar.
- the active world identifies which per-world Map binding to resolve; Map owns that binding and falls back to its reviewed recommendation table when no override exists.
- Mini Scene request Adapters may hand canonical Map/Calendar facts to the shared Module, but popup presentation never becomes schedule/route truth and cannot bypass existing confirmation or edit rules.
