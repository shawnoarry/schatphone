# Event Runtime Product Boundary / 事件运行时语义边界

Updated: 2026-08-12

## 1. Core Rule

The runtime lane is a coordination layer, not a replacement for module-owned records.

## 2. Ownership Split

### Event Runtime / 事件运行时

Owns:

- event logs
- cooldowns
- caps
- trigger policy
- adapter orchestration
- Event Surface Projection normalization and registered-host capability rules
- reusable event-template eligibility and normalized Event Instance lifecycle/provenance once separately implemented
- optional event-text materialization policy and validation, while local variants remain the required fallback
- generated social-event eligibility/review/audit for role-initiated greetings, refusal, block, restore, and unblock proposals

Does not own:

- module-native records such as orders, routes, reminders, or role profiles
- host rendering, Map card placement, canonical coordinates/places, or source-owner effect validation
- K-pop terminology/assets, Map/world-pack image binaries, Gallery assets, provider-specific image generation, or future CG candidates
- arbitrary AI-generated choice IDs, Adapter keys, numeric effects, domain mutations, external media URLs, or full-prompt/raw-response retention by default
- applied Chat channel state after a social event is confirmed

### Relationship Runtime / 关系运行时

Owns:

- relationship metrics
- stages
- milestones
- growth traits
- memory groups
- primary-led memory recall summaries consumed by Chat, Contacts, and World Hub
- relationship fact gate audit metadata derived from saved profile classification fields
- reusable named high-risk gate presets for future event packs
- confirmed relationship facts or memories that result after an applied social event, while Chat still owns the channel state

### World Hub / 世界中枢

Owns:

- optional runtime review
- narrow override/review actions
- future GM-like control entry
- filtered Event Notebook and relationship-fact review details
- event history/notebook projection over existing Event Instances, logs, Chat social proposals, and Map Journey proposals
- stable event-scoped review notes and location-aware explanations
- read-only relationship classification gate audit review

Does not own:

- normal role/data entry
- daily reminders
- confirmed Calendar plans or a general task/notebook system
- role profile editing
- relationship premise/classification editing
- broad value, funds, unlock, or freeform override editing in the current baseline
- Cheats authority merely because both belong to the hidden runtime-control family

Current high-risk gate presets are contracts only. They do not trigger events, mutate module records, or turn World Hub into an editor.

Friend/block/refusal social events use the same boundary: event runtime records and reviews generated proposals; World Hub approves or dismisses high-risk proposals; Chat applies confirmed channel state; Contacts displays snapshots; relationship runtime records confirmed relationship continuity only after the event is accepted.

World Pack nonstandard-app template extraction is outside runtime ownership in the current baseline. WorldBook's Optional capability Packs UI can propose and confirm reviewed appBindings only; it must not create event rules, mutate module records, or turn World Hub into the editing surface.

### Map Journey Checkpoint Collaboration

A Map-owned Map Journey Runtime may submit a bounded source snapshot at an explicit journey or exploration checkpoint. Event Runtime owns event-template eligibility, deterministic/random selection, cooldowns, caps, proposal/review state, minimum provenance, and event logs. MJE-3 implements the first narrow family only for completed `en_route` and `near_arrival` checkpoints while Map is mounted; a pending proposal cannot pause the journey, and its reviewed result may request only no ETA change or a bounded 120-second delay.

Map remains the source owner for the journey, checkpoint plan, pins, places, transport snapshot, ETA, arrival, and cancellation. Event Runtime cannot write those records directly, run journey eligibility on every animation tick, require every journey to produce an event, or convert proposal review into a pause. Map validates and applies any requested result through its own adapter. High-impact money, asset, relationship, identity, and schedule outcomes retain their existing owner and confirmation boundaries.

This first collaboration is user-accepted and integrated locally. Destination change, event-driven cancellation, money, assets, relationships, identity, schedules, Agenda Journey behavior, and active exploration events remain outside MJE-3.

### Event Surface Projection And Host Cards

EVE-1's landed pure Interface in `src/lib/simulation/event-surface-projection.js` derives a bounded read model over existing Map Journey or Chat social proposal/log truth plus a caller-supplied current source reference. It normalizes identity, ownership, display state, risk/review state, bilingual/accessibility copy, allowlisted request descriptors, an expansion target, and optional strict stable-place/geographic/canvas anchors. `src/lib/simulation/event-surface-host-registry.js` stays empty by default and validates every explicit host capability before a projection may be consumed. Neither Module adds an Event route, duplicate event record, source effect, or host UI.

EVE-2 lets Map consume that Interface for one low-risk approved family. Map owns anchor validation, pin/card placement, clustering/stacking, selection, text fit, explicit expansion, and return context. Event Runtime and the source Module retain their existing ownership. A projection is never an authorization token, and a coordinate never creates or mutates Map truth.

Location-aware templates retain authored activation scope and discoverability separately from the EVE-1 projection's source/anchor availability. Map supplies bounded current distance relation, place-session state, position provenance, and journey/arrival references; Event Runtime evaluates them but never changes them. Distance cannot convert an onsite/interior template into a remote event. A Map place card shows an invitation only for an eligible event or approved locked teaser and never reserves an empty permanent Event entry.

EVE-2A freezes the first concrete Interface and EVE-2B implements its Event Runtime side: `EventTemplateV2` and `EventInstanceV1` remain Event Runtime truth; strict registries/local materialization, Simulation-owned durable instances, and optional bounded one-call text composition do not write Map or another domain owner. EVE-2C supplies the Map-owned `MapPlaceSessionCheckpointV1`, current stable place/session revision with manual or journey-arrival provenance, and exact `map.place_session.validate_event_resolution` validation for the three approved production-arrival-briefing choices with `canonicalMutation: none`. The read-only Seoul semantic overlay remains Map-pack content, not an Event Runtime branch or a migration of current place records.

EVE-3 adds the Event Notebook inside World Hub as a deterministic read model over existing runtime truth; it does not persist a duplicate event projection. Simulation-owned notes carry stable event/source/module/target references, survive bounded log rotation and backup/restore, and remain authoritative audit context until explicit deletion. Notes and selection do not execute Adapters or mutate Event Instances, logs, proposals, or source records. Reminders owns raw cues, Calendar owns confirmed plans, and Cheats owns any future privileged overrides.

### Agenda Journey And Activity Session Collaboration

A future Agenda Journey or Activity Session may submit a bounded source snapshot only at an explicit execution checkpoint such as step start, a duration milestone, completion, or deadline reconciliation. Event Runtime owns template eligibility, deterministic/random selection, cooldowns, caps, module permission, presentation-mode policy, automatic-resolution policy, proposal/review state, minimum provenance, and event logs.

Agenda Journey remains the owner of near-term steps and execution outcomes; Activity Session remains the owner of timestamp-based duration and checkpoint truth; Calendar remains the owner of confirmed long-range plans; Map remains the owner of travel and arrival evidence. Event Runtime cannot infer non-travel completion from elapsed time or Map arrival, evaluate on each countdown tick, or write any of those records directly. Each owner validates the requested result before applying it.

When Mini Scene presentation is `off`, eligibility still runs and only an explicitly approved low-impact result may auto-resolve. High-impact money, asset, relationship, identity, communication, or schedule changes still require their normal confirmation/review path. Suspension is reconciled idempotently from source timestamps after resume; exact interactive delivery while the browser/PWA is closed or OS-suspended is not guaranteed.

This collaboration is `ARCHITECTURE_ACCEPTED / DOCUMENTATION_ONLY`. No Agenda Journey route/store, Activity Session timer, Schedule Orchestrator, event adapter, Settings permission, or persistence field is implemented.

Module event permission, random-event intensity, and presentation mode remain separate. Optional event suppression cannot remove a deterministic Agenda Journey step, Activity Session, Map Journey, deadline, or safety behavior. Activity Session owns its timer and completion policy; a future Focus Companion surface may consume stable media references but Event Runtime owns neither that presentation nor Gallery/Music assets.

### Mini Scene Collaboration

Event Runtime may decide that a reviewed/eligible runtime event can request a Mini Scene and may retain trigger, cooldown/cap, review, and provenance evidence. It submits canonical source references and facts through the shared Mini Scene Interface.

Event Runtime does not own the Mini Scene artifact, Book transform profile, regex execution, text/HTML Presenter Adapter, per-module user mode, or the source record. A Mini Scene interaction or an `off`-mode automatic resolution cannot bypass normal Event Runtime review or directly mutate Chat, Calendar, Agenda Journey, Map, relationship, or future streaming truth.

### Cheats / 金手指

Owns later:

- stronger override lane than World Hub
- debug correction and high-power controls when explicitly unlocked
- separate privileged write Interfaces, preview, before/after audit, and safe undo/recompute policy

Does not own yet:

- stable route
- default Home visibility
- mandatory user workflow

World Hub may link to Cheats after a future unlock and share selected-event context/audit formatting. Opening World Hub must never grant Cheats authority.
