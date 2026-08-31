# Event Runtime Product Boundary / 事件运行时语义边界

Updated: 2026-08-31

## 1. Core Rule

The runtime lane coordinates cross-module causal chains; it is not a replacement for module-owned records or a universal card system.

An event chain may begin in one Module, be evaluated and audited by Event Runtime, write canonical truth through another owner's Adapter, and continue through later owner-native records. A Module can participate in that chain without registering an Event Surface. Messages, order state, calls, posts, information feeds, journeys, Map encounters, and later scene presentations are owner-native forms; an Event Surface is only one optional Presentation Adapter when the host interaction has been separately accepted.

Role continuity is the primary product consumer of cross-module context, not Event Runtime itself. Event Runtime records event causality and provenance and may expose a bounded, role-scoped memory candidate after an owner-confirmed result. It never writes Chat memory, role memory, or relationship truth directly. Relationship Runtime decides whether a candidate becomes durable role memory. Public world evolution is a separate world-scoped knowledge projection; public knowledge may be available to same-world roles when relevant, but it is not copied into every role memory or injected into every Chat prompt.

The first arbitrary-world runtime proof is deliberately narrower than a genre pack. A confirmed semantic version may connect Map-owned place concepts to Work Hub-owned membership/role concepts through a generic runtime capability. Event Runtime owns the stable version-bound Event Instance V2, one-time random settlement, lifecycle, and audit. Map owns place identity, current position evidence, the access-validation owner fact, and the existing place session. Work Hub owns organization membership and role evidence. The model owns none of those facts and is not called during entry. A later semantic version applies only to newly created event identities; it never rerolls or reinterprets an existing occurrence.

## 2. Ownership Split

### Event Runtime / 事件运行时

Owns:

- event logs
- cooldowns
- caps
- trigger policy
- normalized optional-event policy snapshots covering module permission, intensity, family probability, and presentation mode
- adapter orchestration
- Event Surface Projection normalization and registered-host capability rules
- reusable event-template eligibility and normalized Event Instance lifecycle/provenance once separately implemented
- version-bound restricted-place access lifecycle and one-time settlement after exact owner evidence is supplied
- optional event-text materialization policy and validation, while local variants remain the required fallback
- generated social-event eligibility/review/audit for role-initiated greetings, refusal, block, restore, and unblock proposals
- future bounded player-context eligibility, world-arc progression references, and information-publication requests only after their separate Interfaces and owners are accepted

Does not own:

- module-native records such as orders, routes, reminders, or role profiles
- host rendering, Map card placement, canonical coordinates/places, or source-owner effect validation
- K-pop terminology/assets, Map/world-pack image binaries, Gallery assets, provider-specific image generation, or future CG candidates
- arbitrary AI-generated choice IDs, Adapter keys, numeric effects, domain mutations, external media URLs, or full-prompt/raw-response retention by default
- applied Chat channel state after a social event is confirmed
- Contacts Self Profile values, arbitrary dynamic player/world state, owner-confirmed world facts, future Community/Media publication bodies, or investigation/clue records
- role memory or a universal role-awareness graph; event participants and public-knowledge consumers are references supplied to the relevant Owner or projection
- Map place truth, Work Hub membership/role truth, access owner facts, or authority to infer those records from model output

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

Settings may expose only event controls that cross the Event Policy Interface and have behavior tests. Presentation policy changes the visible form, not event eligibility or canonical outcome. Result-mode, consequence-severity, reroll, and interactive-HTML controls remain unavailable until their separate runtime and safety Interfaces exist.

The product-facing home for implemented baseline controls is `设置 > 事件 / Settings > Events`. AI Automation owns autonomous AI calls and must not duplicate event policy controls. World Hub remains the review/history surface rather than the ordinary configuration entry.

Friend/block/refusal social events use the same boundary: event runtime records and reviews generated proposals; World Hub approves or dismisses high-risk proposals; Chat applies confirmed channel state; Contacts displays snapshots; relationship runtime records confirmed relationship continuity only after the event is accepted.

World Pack nonstandard-app template extraction is outside runtime ownership in the current baseline. WorldBook's Optional capability Packs UI can propose and confirm reviewed appBindings only; it must not create event rules, mutate module records, or turn World Hub into the editing surface.

`Settings > World Setup` is the ordinary product-facing home for current-world preparation. It may display a simple read-only summary of currently readable sources and perform one explicit configured-model check only after the user taps. That response is a temporary proposal with evidence, confidence, unknowns, conflicts, and provenance; it is never world truth, a compiled runtime manifest, an event trigger, or an owner mutation. Opening Settings or World Setup performs no provider call. World Hub remains hidden by default and may display advanced world-usage evidence for audit, but it does not own initial setup or expose a semantic-check action. Modern K-pop realism remains one content/conformance fixture, while the generic foundation must preserve arbitrary user-authored terminology and fail visibly when meaning is missing or unsupported.

### Map Journey Checkpoint Collaboration

A Map-owned Map Journey Runtime may submit a bounded source snapshot at an explicit journey or exploration checkpoint. Event Runtime owns event-template eligibility, deterministic/random selection, cooldowns, caps, proposal/review state, minimum provenance, and event logs. MJE-3 retains the first narrow compatibility family for completed `en_route` and `near_arrival` checkpoints, but production Map mounting keeps it disabled after the generic route-obstruction presentation failed product review. Deterministic tests may explicitly enable only no ETA change or the legacy bounded 120-second delay.

Map remains the source owner for the journey, checkpoint plan, pins, places, transport snapshot, ETA, arrival, and cancellation. Event Runtime cannot write those records directly, run journey eligibility on every animation tick, require every journey to produce an event, or convert proposal review into a pause. Map validates and applies any requested result through its own adapter. High-impact money, asset, relationship, identity, and schedule outcomes retain their existing owner and confirmation boundaries.

This first collaboration remains technical compatibility evidence rather than an active production event family. Destination change, event-driven cancellation, money, assets, relationships, identity, schedules, Agenda Journey behavior, and active exploration events remain outside MJE-3.

### Event Chains, Native Presentation, And Optional Event Surfaces

EVE-1's landed pure Interface in `src/lib/simulation/event-surface-projection.js` derives a bounded read model over existing Map Journey or Chat social proposal/log truth plus a caller-supplied current source reference. It normalizes identity, ownership, display state, risk/review state, bilingual/accessibility copy, allowlisted request descriptors, an expansion target, and optional strict stable-place/geographic/canvas anchors. `src/lib/simulation/event-surface-host-registry.js` stays empty by default and validates every explicit host capability before a projection may be consumed. Neither Module adds an Event route, duplicate event record, source effect, or host UI.

EVE-2 lets Map consume that Interface for one low-risk approved family. Map owns anchor validation, pin/card placement, clustering/stacking, selection, text fit, explicit expansion, and return context. Event Runtime and the source Module retain their existing ownership. A projection is never an authorization token, and a coordinate never creates or mutates Map truth.

Location-aware templates retain authored activation scope and discoverability separately from the EVE-1 projection's source/anchor availability. Map supplies bounded current distance relation, place-session state, position provenance, and journey/arrival references; Event Runtime evaluates them but never changes them. Distance cannot convert an onsite/interior template into a remote event. A Map place card shows an invitation only for an eligible event or approved locked teaser and never reserves an empty permanent Event entry.

EVE-2A freezes the first concrete Interface and EVE-2B implements its Event Runtime side: `EventTemplateV2` and `EventInstanceV1` remain Event Runtime truth; strict registries/local materialization, Simulation-owned durable instances, and optional bounded one-call text composition do not write Map or another domain owner. EVE-2C supplies the Map-owned `MapPlaceSessionCheckpointV1`, current stable place/session revision with manual or journey-arrival provenance, and exact `map.place_session.validate_event_resolution` validation for the three approved production-arrival-briefing choices with `canonicalMutation: none`. The read-only Seoul semantic overlay remains Map-pack content, not an Event Runtime branch or a migration of current place records.

EVE-3 adds the Event Notebook inside World Hub as a deterministic read model over existing runtime truth; it does not persist a duplicate event projection. Simulation-owned notes carry stable event/source/module/target references, survive bounded log rotation and backup/restore, and remain authoritative audit context until explicit deletion. Notes and selection do not execute Adapters or mutate Event Instances, logs, proposals, or source records. Reminders owns raw cues, Calendar owns confirmed plans, and Cheats owns any future privileged overrides.

EVE-4A's Food Delivery Event Surface was completed as a technical spike, but product acceptance is withdrawn. It incorrectly treated a business event as a generic order-card brief and exposed a user action that queried by manufacturing a delay. The Food Delivery host registration, `Dispatch brief`, expansion/acknowledgement UI, and that manual trigger are removed.

The useful owner seam remains: Food Delivery may persist the exact successful Event Runtime log reference on its canonical order event only through its validated one-to-one owner action. A legitimate foreground/session Tick or later approved system checkpoint may trigger `food_delivery.rider_delay.v1`; Food Delivery then updates its own `order.etaMinutes`, appends the native order event, and uses its existing Chat dispatch notification. The ETA change is canonical Food Delivery mutation, not `canonicalMutation: none`. That EVE-4A seam itself exposes no fake Phone, courier, platform, or expedite choice; EVE-4B separately implements reference owner-native conversation, call, and reroute capabilities.

### User-Initiated Commerce Service Events

EVE-4B proves that Food Delivery, Wallet, Map, and Phone can participate in one owner-native chain, but its pickup-time random address-confirmation trigger and `foodDeliveryCausalChains` persistence are reference implementation scaffolding rather than the final reusable Interface.

EVE-4C implements that replacement direction. An order-related commerce event begins only after an explicit user interaction inside the owning platform or a registered Chat service account with a valid order reference. The commerce owner creates or reuses the canonical Service Case and publishes bounded owner facts. Chat owns its message history, Phone owns call/transcript/structured-resolution records, Map owns journey/ETA/reroute truth, Wallet owns settlement, and Event Runtime owns generic Event Instance progression, persisted decisions, deadlines, owner requests, provenance, and terminal results.

Free-form text or AI classification may propose an intent or result but cannot create order truth or authorize a mutation. Existing fulfillment state is read from its owner rather than randomized at branch time. Event Runtime advances only after a correlated owner fact confirms an owner request. Native commerce support remains complete when optional events are disabled or no recipe matches.

Event Instance V1 remains frozen for EVE-2A/2B/2C. Event Instance V2 and Simulation V5 now preserve generic progression plus legacy EVE-4B audit lineage without fabricating user initiation. Food Delivery and Shopping provide separate owner Adapters for the shared commerce seam. Read `docs/architecture/USER_INITIATED_COMMERCE_INTERACTION_EVENT_ARCHITECTURE.md`.

The current user-visible production stop line is Food Delivery's owner-native address-escalation chain. Shopping's Adapter is contract/interface proof only; it does not accept a user-facing Shopping address-change/after-sales event or close remaining Shopping product work. Those require a separate Shopping product and scenario acceptance before they can become an event case.

### Player Context, World Evolution, And Information Propagation

Status: `PLAYER_CONTEXT_V1_FOUNDATION_IMPLEMENTED / WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_DOCUMENTATION_ONLY`.

Contacts Self Profile owns the user's stable, structured, visibility-scoped identity in the current world. Event Runtime now has one bounded profile/world/template/revision projection for K-pop manager/public-idol eligibility. It reads only manual visible allowlisted fields and body-free owner references; free-text biography, event-attached values, or model classification cannot independently establish occupation, intent, behavior, guilt, relationship, or another canonical fact.

Dynamic values remain with their natural owners. A minimal Player State Module is considered only for approved cross-module user-state values that have no existing owner. A future World State And Arc Ledger is considered only for durable ownerless world facts or multi-occurrence arc state that must outlive one Event Instance. Neither owner is implied by this package.

Future forum, X/Weibo-like, social-feed, and subscription-news records belong to a Community/Media Module. An owner-confirmed `World Fact`, an account's `Claim`, and the committed `Post` that presents it are different records. Runtime may coordinate eligibility, one-time decisions, requests, references, and provenance; it cannot turn a claim into truth or persist the publication body.

Investigation/clue retention requires a separate owner that stores post/claim/fact references and user deductions. World Hub remains an audit surface, not the normal authoring or feed surface for any of these records. The full direction and implementation gates are in `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md`.

### Agenda Journey And Activity Session Collaboration

Agenda Journey or Activity Session may submit a bounded source snapshot only after a separately approved Event Adapter exists and only at an explicit execution checkpoint such as step start, a duration milestone, completion, or deadline reconciliation. Event Runtime owns template eligibility, deterministic/random selection, cooldowns, caps, module permission, presentation-mode policy, automatic-resolution policy, proposal/review state, minimum provenance, and event logs.

Agenda Journey remains the owner of near-term steps and execution outcomes; Activity Session remains the owner of timestamp-based duration and checkpoint truth; Calendar remains the owner of confirmed long-range plans; Map remains the owner of travel and arrival evidence. Event Runtime cannot infer non-travel completion from elapsed time or Map arrival, evaluate on each countdown tick, or write any of those records directly. Each owner validates the requested result before applying it.

When Mini Scene presentation is `off`, eligibility still runs and only an explicitly approved low-impact result may auto-resolve. High-impact money, asset, relationship, identity, communication, or schedule changes still require their normal confirmation/review path. Suspension is reconciled idempotently from source timestamps after resume; exact interactive delivery while the browser/PWA is closed or OS-suspended is not guaranteed.

This collaboration is `ARCHITECTURE_ACCEPTED / CJA-5_ACTIVITY_SESSION_MIDPOINT_FAMILY_IMPLEMENTED`. Calendar departure-readiness V1 remains implemented directly between Calendar and Map without Event Runtime participation. CJA-5 implements exactly one `activity_session.focus_reset.v1` family with durable Simulation records introduced in V6 and carried by the current V7 carrier, Activity Session V2 owner validation, an Activity Session module permission, and independent `off | text` presentation. CJA-6A documents the Narrative Timeline contract only; no Agenda Journey event family, appointment auto-entry, interactive HTML/Mini Scene, high-impact effect, or CJA-6B projection implementation is active.

Module event permission, random-event intensity, and presentation mode remain separate. Optional event suppression cannot remove a deterministic Agenda Journey step, Activity Session, Map Journey, deadline, or safety behavior. Activity Session owns its timer and completion policy; Focus Companion owns the inline CJA-5 presentation, while Event Runtime owns neither that presentation nor Gallery/Music assets.

### Narrative Timeline And AI Context

CJA-6A defines Narrative Timeline as a future read-only projection of owner-confirmed summaries and typed `sourceRefs`. Event Runtime may contribute event decisions, terminal outcomes, and provenance references, but it does not own the projection's canonical schedule, journey, relationship, finance, publication, or domain records. Raw prompts, raw provider responses, unreviewed model output, pending proposals, and complete source bodies are not timeline inputs. Deleted, stale, inaccessible, or revision-mismatched sources fail closed rather than leaving an orphaned entry.

Future Forum/Chat AI context is a bounded read-only caller contract with explicit caller, scope, permission, date/world range, recency, entry count, and character/token limits. It must not call a provider during ordinary Timeline reads, publish content, or write back to a source owner. CJA-6B remains the separate implementation gate for persistence, visible product, retention, review, migration, and backup.

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
