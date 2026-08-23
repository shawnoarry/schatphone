# Healthcare S1 Shell — 温谈健康 / Ondam Care

Status: `S1_IMPLEMENTED / SHARED_ENTRY_INTEGRATED / UI_STRUCTURE_REVIEWED 2026-08-23`

## Product result

`温谈健康 / Ondam Care` is a fixture-backed, device-local healthcare shell for ordinary in-world life. It provides service discovery, local appointment booking, rescheduling and cancellation, plus an authored report inbox with read state, explicit corrections, retained revision meaning, unavailable-source handling, and long structured result tables.

It is not a real healthcare service. It never requests real health information, generates diagnoses, provides emergency guidance, or infers illness from Chat, role state, location, or AI output.

## Visual argument

The shell uses an `安静的诊疗档案夹 / calm care folio` identity:

- the accepted Home/App Store identity is `ondam-care-app-icon-v1.png`, the user-selected calm-palette A1 baby-elephant doctor; the mascot is available for later appointment, report, empty-state, and guidance illustrations, while `fas fa-heart-pulse` remains the accessible and customization fallback glyph;
- warm paper and ink-green surfaces instead of a generic clinical dashboard;
- clipped folio corners, appointment-receipt perforation, revision stamps, and report seals as the recognizable material language;
- institutional discovery cards use restrained geographic color families rather than interchangeable white cards;
- report presentation prioritizes provenance, correction history, units, and table legibility;
- `default` and `zen` are designed as day/night counterparts with independent panel, text, border, action, warning, and focus contrast.

The five differentiation dimensions are therefore: typography (editorial serif headings), palette (paper/ink/apricot), shape (folio corners and seals), information hierarchy (directory → service → booking / inbox → report), and interaction feel (focused sheets and document drill-downs).

## S1 records and persistence

All institutions, services, clinicians, slots, appointments, and reports are stable in-world fixtures. Real Seoul hospitals are referenced only through existing Map place IDs as location context; clinicians, service availability, appointment slots, and report contents remain explicitly fictional authored fixtures.

The device-local preview key is `schatphone:healthcare-shell:s1`, version `1`. It stores only:

- fixture-derived appointment records and their local status/revision;
- report read IDs;
- acknowledged report revisions.

The state is not a production Healthcare Store or backup section. A visible success follows a successful local durable write; failed writes keep the prior state and show an error.

## User-visible S1 loop

1. Discover institutions by category or local text search.
2. Use the discovery-page care overview to reach the next appointment or report inbox without first re-entering the institution directory.
3. Open an available institution and inspect its departments/services.
4. Choose an authored visit reason, date, and slot.
5. Confirm a device-local appointment.
6. Review, reschedule, or cancel without changing its stable ID; status and revision advance locally.
7. Open authored reports, mark them read, inspect long structured results, and explicitly acknowledge a corrected revision.
8. Withdrawn institution/report sources fail closed and do not display stale actions or cached report rows.

## Cross-owner seams

Map is read-only from Healthcare S1. An available institution can open `/map` with:

- `source=healthcare`;
- stable Map `place` record ID and revision;
- world ID;
- `/healthcare` return path and localized return label.

The deep link does not create a place, journey, arrival, check-in, treatment, appointment, or discovery fact.

## Explicit exclusions

- no Calendar appointment write or Agenda Journey materialization;
- no Wallet charge, insurance, refund, or receipt;
- no Phone, Mail, Healthcare messaging, notification, or lock-screen preview;
- no Map mutation, arrival, route truth, or place-session effect;
- no Provider/AI call and no real medical data intake;
- no prescription, pharmacy fulfillment, clinical diagnosis, emergency flow, or event family;
- no Event Surface host or Event Runtime registration.

## State and UI acceptance

Covered S1 states include:

- ordinary discovery and booking success;
- deterministic empty search and reset;
- withdrawn institution and report sources;
- durable-write failure with no false success;
- duplicate/missing/invalid slot rejection;
- confirmed, rescheduled, and cancelled appointments;
- unread/read report state and unacknowledged/acknowledged correction revision;
- bilingual long labels and a horizontally contained long report table;
- day/night, desktop/simulated Pixel 5, keyboard focus, accessible names, reduced motion, and zero page-level horizontal overflow.

The 2026-08-23 lightweight structure review compared the shell against the common healthcare split between provider discovery, appointments, and results. It retained the three-tab information architecture and added a compact `My care` overview to the discovery page; it did not add diagnosis, messaging, insurance, or cross-owner writes.

## Future S2 owner seam

S2 requires an accepted Healthcare product package before any production route Store/schema/backup work. It must define canonical institution, clinician/service, slot, appointment, visit, report, prescription, pharmacy, bill, privacy, world-switch, deletion, retention, and backup semantics.

## Future S3 event seam

S3 may begin only from user actions or Healthcare owner-confirmed facts: confirmed appointment changes, authored report arrival/correction, pharmacy availability, or bill correction. Event Runtime cannot own medical records or derive health facts from AI text, Chat emotion, location, or missed journeys.
