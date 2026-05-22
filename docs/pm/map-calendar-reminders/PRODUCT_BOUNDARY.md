# Map Calendar Reminders Product Boundary

Updated: 2026-05-19

This file defines ownership boundaries for Map, Calendar, Reminders, and Phone-like callback support.

## 1. Map

Map owns:

- route
- trip
- location
- ETA and travel context

Map does not own:

- shopping orders
- food orders
- wallet ledgers
- confirmed schedule meaning
- relationship truth

## 2. Calendar

Calendar owns:

- confirmed events
- real schedule/date meaning
- confirmed schedule-like reminders after handoff

Calendar does not own:

- all cue queues
- logistics follow-ups
- callback backlog
- runtime-control semantics

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
