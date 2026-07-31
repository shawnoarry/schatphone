# Event Runtime Product Boundary / 事件运行时语义边界

Updated: 2026-07-31

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
- generated social-event eligibility/review/audit for role-initiated greetings, refusal, block, restore, and unblock proposals

Does not own:

- module-native records such as orders, routes, reminders, or role profiles
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
- filtered event-log and relationship-fact review details
- read-only relationship classification gate audit review

Does not own:

- normal role/data entry
- daily reminders
- role profile editing
- relationship premise/classification editing
- broad value, funds, unlock, or freeform override editing in the current baseline

Current high-risk gate presets are contracts only. They do not trigger events, mutate module records, or turn World Hub into an editor.

Friend/block/refusal social events use the same boundary: event runtime records and reviews generated proposals; World Hub approves or dismisses high-risk proposals; Chat applies confirmed channel state; Contacts displays snapshots; relationship runtime records confirmed relationship continuity only after the event is accepted.

World Pack nonstandard-app template extraction is outside runtime ownership in the current baseline. WorldBook's Optional capability Packs UI can propose and confirm reviewed appBindings only; it must not create event rules, mutate module records, or turn World Hub into the editing surface.

### Map Journey Checkpoint Collaboration

A Map-owned Map Journey Runtime may submit a bounded source snapshot at an explicit journey or exploration checkpoint. Event Runtime owns event-template eligibility, deterministic/random selection, cooldowns, caps, proposal/review state, minimum provenance, and event logs. MJE-3 implements the first narrow family only for completed `en_route` and `near_arrival` checkpoints while Map is mounted; a pending proposal cannot pause the journey, and its reviewed result may request only no ETA change or a bounded 120-second delay.

Map remains the source owner for the journey, checkpoint plan, pins, places, transport snapshot, ETA, arrival, and cancellation. Event Runtime cannot write those records directly, run journey eligibility on every animation tick, require every journey to produce an event, or convert proposal review into a pause. Map validates and applies any requested result through its own adapter. High-impact money, asset, relationship, identity, and schedule outcomes retain their existing owner and confirmation boundaries.

This first collaboration is implemented and validated in the current uncommitted tree and is `READY_FOR_USER_REVIEW`. Destination change, event-driven cancellation, money, assets, relationships, identity, schedules, Agenda Journey behavior, and active exploration events remain outside MJE-3.

### Agenda Journey And Activity Session Collaboration

A future Agenda Journey or Activity Session may submit a bounded source snapshot only at an explicit execution checkpoint such as step start, a duration milestone, completion, or deadline reconciliation. Event Runtime owns template eligibility, deterministic/random selection, cooldowns, caps, module permission, presentation-mode policy, automatic-resolution policy, proposal/review state, minimum provenance, and event logs.

Agenda Journey remains the owner of near-term steps and execution outcomes; Activity Session remains the owner of timestamp-based duration and checkpoint truth; Calendar remains the owner of confirmed long-range plans; Map remains the owner of travel and arrival evidence. Event Runtime cannot infer non-travel completion from elapsed time or Map arrival, evaluate on each countdown tick, or write any of those records directly. Each owner validates the requested result before applying it.

When Mini Scene presentation is `off`, eligibility still runs and only an explicitly approved low-impact result may auto-resolve. High-impact money, asset, relationship, identity, communication, or schedule changes still require their normal confirmation/review path. Suspension is reconciled idempotently from source timestamps after resume; exact interactive delivery while the browser/PWA is closed or OS-suspended is not guaranteed.

This collaboration is `ARCHITECTURE_ACCEPTED / DOCUMENTATION_ONLY`. No Agenda Journey route/store, Activity Session timer, Schedule Orchestrator, event adapter, Settings permission, or persistence field is implemented.

### Mini Scene Collaboration

Event Runtime may decide that a reviewed/eligible runtime event can request a Mini Scene and may retain trigger, cooldown/cap, review, and provenance evidence. It submits canonical source references and facts through the shared Mini Scene Interface.

Event Runtime does not own the Mini Scene artifact, Book transform profile, regex execution, text/HTML Presenter Adapter, per-module user mode, or the source record. A Mini Scene interaction or an `off`-mode automatic resolution cannot bypass normal Event Runtime review or directly mutate Chat, Calendar, Agenda Journey, Map, relationship, or future streaming truth.

### Cheats / 金手指

Owns later:

- stronger override lane than World Hub
- debug correction and high-power controls when explicitly unlocked

Does not own yet:

- stable route
- default Home visibility
- mandatory user workflow
