# Event Runtime And World Hub Implementation Workstreams / 事件运行时与世界中枢实施工作流

Updated: 2026-08-31

## 1. Workstream A: Event Engine Foundation

- event registry
- deterministic random helper
- condition evaluator
- simulation store
- adapter seams
- shared optional-event policy Interface for module permission, intensity, family probability, presentation mode, and immutable audit snapshots
- body-free Map-pack current/history reference projection for World Suite safety; Event Runtime retains every event body and exposes only stable reference IDs plus `mapPackId`
- landed Chat social-event review seam for role-initiated greeting, refusal, block, restore, and unblock proposals, including Chat AI output and the narrow foreground/session runtime greeting source

Current landed guardrail:

- Event Policy V1 is consumed by Activity Session, the retained Map Journey compatibility Adapter, and the production Map place invitation. New runtime logs and the durable Activity Session/Map Journey pilot records preserve normalized policy snapshots. The dedicated `Settings > Events` page exposes only the existing persisted frequency, module-permission, supported presentation, and foreground-check controls; UI-to-policy tests prove their behavior. Outcome mode, consequence severity, reroll, pause-all persistence, and interactive HTML remain unimplemented and absent from the UI.

## 2. Workstream B: Relationship Runtime

- low-impact fact adapters
- memory-group governance
- pending confirmation logic
- cleanup and recall rules
- bounded applied Chat role-greeting continuity adapter: owner callback only, explicit role target and Proposal ID, supporting-only and metric-neutral

Current landed guardrail:

- 4.2 relationship-memory cleanup has reached current explicit-lineage acceptance. Chat should consume source-aware `recallSummary` text for prompt context, while World Hub should use UI-facing related-record summaries and reserve source-audit detail for focused review surfaces.
- Relationship classification Round 4 adds `relationshipGate` audit metadata to current low-impact facts. The metadata is built from saved role-profile category/modifier classification fields only, not raw relationship label/note prose. High-risk hard-gate helper behavior exists for future event packs and tests, but no new high-impact automation is enabled in this workstream.
- High-risk gate presets now live at the relationship-event gating seam, so future event packs should reference preset ids instead of copying category/modifier rule objects into module adapters.
- Generated social/channel events must not bypass relationship classification and review policy: low-risk greetings may auto-apply with audit from Chat AI or the foreground/session runtime source, while friend/block/refusal state changes need explicit review or hard gates before Chat applies them.

## 3. Workstream C: World Hub

- runtime review
- pending-effect review
- filtered details
- narrow mutation controls

Current landed guardrail:

- World Hub relationship rows and cleanup dialogs show product-facing `roleId` only when a Contacts role profile exists.
- Missing-profile or runtime-only relationship targets are labeled by runtime key, so `profileId` / `entityKey` are not mistaken for the user's role number.
- The 4.3 review-pack baseline adds filtered event-log and relationship-fact detail views with product-facing explanations, while still deferring broad value, funds, unlock, and freeform override controls.
- Relationship fact detail may show gate audit metadata read-only; World Hub must not become the main relationship classification editor.
- World Hub now reviews pending generated Chat social proposals before high-risk communication states are applied in Chat.
- World Pack nonstandard-app proposal review remains a WorldBook/appBinding seam; it must not create runtime triggers, event rules, or World Hub editing responsibilities.
- EVE-3 adds the Event Notebook read model over Event Instances, logs, Chat social proposals, and Map Journey proposals, with all/pending/noted counts plus source/module/status filters and stable lineage detail.
- `Settings > World Setup` now owns the ordinary world-preparation seam: local code reports readable sources and current limitations in user language, while one explicit configured-model check may return a transient normalized semantic proposal. Opening the page performs no call. World Hub retains advanced world-usage evidence only; neither surface writes a semantic manifest, changes event eligibility, mutates an owner, or persists provider output.
- Event-scoped notes are durable Simulation-owned audit context with explicit create/update/delete actions, V1/V2-to-V3 migration, backup/restore, and survival across bounded log rotation. Selection and notes do not retrigger events, execute Adapters, mutate source truth, create Reminders/Calendar plans, or grant Cheats authority.

## 4. Workstream D: Cheats / 金手指

- unlock source
- visibility/install rule
- route design
- stronger override surface
- explicit safety boundary

World Hub may link to a separately unlocked Cheats surface and share selected-event context/audit formatting, but their permissions and write Interfaces remain separate.

## 5. Workstream E: Mini Scene Trigger Collaboration

- begin only when a concrete runtime event family is separately promoted under `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`
- keep eligibility, cooldown/cap, review, and provenance in Event Runtime
- call the shared Mini Scene Interface with canonical source facts; do not copy world-profile, regex, artifact, or presenter logic into runtime adapters
- treat interaction commands as requests that still pass the owning module's validation and any required runtime review
- identify one concrete event occurrence and one request/revision; repeated delivery or reopen must look up a retained artifact before any provider call, while explicit regeneration creates a new revision
- keep the source owner's confirmed event result and the Relationship Runtime/approved diary projection independent of whether the user retains the complete Mini Scene
- present temporary validated content when the user declines full retention, and provide a future paged retained-scene management path with explicit archive/delete and no silent 120-artifact eviction

## 6. Workstream F: Event Surface Projection And Host Entries

- distinguish event-chain participation from Event Surface registration: owner-native messages, state changes, calls, posts, feeds, journeys, and Map encounters may carry a chain without a generic card
- EVE-1 is landed as a pure bounded projection over existing Map Journey/Chat social proposal and runtime-log truth plus caller-supplied current source references; it adds no Event route and no duplicate persistent record
- strict stable-place, provider-neutral geographic, and normalized-canvas anchors, expansion targets, allowlisted request descriptors, source staleness, bilingual/accessibility copy, and deterministic output are normalized in `src/lib/simulation/event-surface-projection.js`
- host registration remains empty by default in `src/lib/simulation/event-surface-host-registry.js`; Map, Chat, Calendar, World Hub, and later callers must opt in with bounded source/state/anchor/expansion/action capabilities
- EVE-2C lets Map own coordinate-card placement, clustering/stacking, selection, text fit, and return context while Event Runtime and source Modules keep their existing ownership
- before a location-aware family is promoted, name its authored activation scope, discoverability, accepted position provenance, place-entry requirement, module permission, intensity behavior, and no-event path; do not overload EVE-1 stale-source availability with eligibility
- ordinary place focus and event-pin selection remain distinct host paths; a place card has no permanent Event button and Map `Enter` remains a Map-owned transition
- EVE-3 is complete: Event Notebook reads owner/runtime truth through stable refs, fails safely when linked hot records rotate, and retains exact notes without becoming a second event store, Reminders queue, Calendar plan list, or Cheats editing surface
- arbitrary-world runtime work follows `WORLD_SEMANTIC_RUNTIME_FOUNDATION_PLAN_2026-08-29.md`: the provider-neutral proposal, separate model receipt, exact user-confirmation seam, runtime registry, deterministic pure compiler, and W2 persisted activation/rollback boundary are landed; do not extend the engine through genre-name branches or treat the K-pop pack as the complete product
- `WORLD-SEMANTIC-4` lands the first reusable runtime proof: exact Map place concepts and Work Hub membership/role concepts resolve through `runtime:access:restricted_place`, create one stable version-bound Event Instance V2, request one Map validation fact, and settle one durable routine/reviewed result; missing or stale evidence fails closed, unannotated places retain the ordinary path, and later semantic versions affect new occurrences only
- keep AI outside the play loop: it cannot create access evidence, select the random result, write the owner fact, grant entry, reroll an occurrence, or turn World Hub into the ordinary preparation surface
- EVE-4A is `TECHNICAL_SPIKE_COMPLETE / PRODUCT_ACCEPTANCE_WITHDRAWN`: remove the Food Delivery production host, order-card `Dispatch brief`, local expansion/acknowledgement, and manual query-that-manufactures-delay path
- preserve exact one-to-one Food Delivery order/event/runtime-log lineage, reject injected/reused/mismatched links, and keep lineage linking inside the Food Delivery owner action
- legitimate `rider_delay` or `eta_update` execution updates Food Delivery's canonical order ETA, appends the native order timeline, and may push the existing Chat dispatch notification; it is not a no-mutation projection
- reset later EVE-4 work to an owner-approved causal chain with real native behavior; do not treat a generic card as evidence that a Module participates in the event ecosystem
- richer expansion uses the Mini Scene Interface only after its separate persistence, Settings, and Presenter gates

## 7. Workstream G: Map Journey Checkpoint Collaboration

- MJE-3's first adapter remains compatibility-tested while its generic route-obstruction production trigger is suspended; MJE-4 Footprints/place knowledge remains integrated locally, and later event cards must consume the landed EVE-1 contract
- receive bounded canonical Map facts only for completed `en_route` and `near_arrival` checkpoints when an explicitly reviewed caller or deterministic compatibility test has enabled evaluation; do not evaluate on each animation tick
- keep permission, Surprise Mode, eligibility, deterministic/random gate, cooldown/cap, persistent proposal review, provenance, and logs in Event Runtime
- return only no ETA change or a bounded 120-second delay through the Map adapter and let Map validate exact proposal/event/journey/checkpoint lineage
- keep proposals pending without pausing Map Journey or opening detail automatically; preserve tested no-event, adapter-failure, legacy blocked-journey recovery, arrival dismissal, and missing/stale-proposal paths
- keep destination change, event-driven cancellation, relationship, money, asset, identity, schedule, active exploration, and Agenda Journey effects unimplemented
- require any production replacement to name the affected actor, transport capability, actionable response, and owner-native consequence before enabling checkpoint evaluation

## 8. Workstream H: Agenda Journey And Activity Session Collaboration

- status is `CALENDAR_DEPARTURE_READINESS_V1_DONE / CJA-5_ACTIVITY_SESSION_MIDPOINT_DONE / CJA-6A_CONTRACT_DONE`; follow roadmap 4.12 CJA gates and do not infer Agenda Journey families or CJA-6B implementation authorization from this slice
- Calendar departure readiness carries no Event Runtime Adapter: Calendar keeps the stable destination reference, Map derives current-origin transport/lateness truth, and explicit departure creates or reuses one Map Journey
- receive bounded canonical Agenda Journey or Activity Session facts only at explicit start, milestone, completion, or deadline checkpoints; never evaluate on each countdown tick
- keep eligibility, deterministic/random gate, cooldown/cap, module permission, presentation mode, automatic-resolution policy, proposal/review, provenance, and logs in Event Runtime
- keep Agenda Journey state, Activity Session timestamps, Calendar commitments, Map arrival, and all downstream domain truth in their owning modules
- treat `off` as popup suppression rather than event-system disablement, while allowing only owner-approved low-impact automatic outcomes
- keep module permission, random-event intensity, presentation mode, and future per-session override independent; optional-event suppression never removes the base activity, travel, deadline, or safety path
- keep Focus Companion timing/presentation outside Event Runtime and consume explicit Activity Session or Map Journey checkpoints instead of creating a second clock
- reconcile overdue checkpoints idempotently after resume and do not promise exact interactive delivery while a browser/PWA is fully closed or OS-suspended
- keep CJA-5 limited to `activity_session.focus_reset.v1`, the midpoint checkpoint, `off | text`, and the owner-approved 0/2-minute timer result; CJA-6A is documentation-only and adds no store/route/backup child; implement no Agenda Journey family, HTML/Mini Scene, media caller, high-impact effect, or CJA-6B projection without separate acceptance

## 9. Workstream I: Default K-pop Event Pack And Text Materialization

- follow `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`; the first product content target is modern K-pop realism while generic Event Runtime logic remains world-neutral
- EVE-2A is complete: the current Map inventory, conservative/exact place semantics, Event Template V2, Event Instance V1, variant-pack/text-materialization/media-intent/Map-session Interfaces, first production-arrival-briefing archetype, and six fixtures are frozen
- EVE-2B is complete: pure normalizers/registries, Simulation V2-owned durable instance persistence/migration/backup, local K-pop materialization, and an optional one-call validated/cached text Composer are implemented with no Map fields, UI, or external domain mutation
- keep ordinary ticks, distance updates, place focus, eligibility filtering, and compact invitations local and zero-token
- call an optional Event Text Composer only after an approved event-entry/presentation checkpoint; validate/cache normalized output and fall back to authored local K-pop variants
- keep choice IDs, Adapter keys, effect ranges, confirmations, persistence, and every domain mutation local and owner-validated
- keep place/scene imagery in Map/world asset packs where practical; Event Runtime stores only stable references and bounded semantic media intent
- preserve later CG as a separate, independently permissioned image-generation/media-resolution Adapter; do not add V1 provider fields, automatic generation, empty controls, or image payload persistence
- do not implement parallel non-K-pop content packs in V1, but keep templates and capabilities independent of K-pop names, exact Seoul place IDs, and icons
- EVE-2C is complete: Map V3 owns provenance/place sessions and the first production-arrival-briefing vertical slice through the single registered Map host; additional hosts and event families remain separately gated under EVE-4

## 10. Workstream J: User-Initiated Commerce Interaction Events

- status is `EVE-4C DONE / VALIDATED 2026-08-14`
- treat EVE-4B as historical reference evidence; production writes now use the explicit user trigger, shared owner contracts, generic Event Instance V2, and legacy audit migration
- preserve the frozen order reference, user interaction trigger, Service Case reference, owner fact, owner request, Phone resolution, and Map journey-estimate Interfaces
- make native platform and registered Chat service-account entry converge idempotently on one commerce-owned Service Case
- keep ordinary order messaging, support, address change, Map ETA/reroute, Wallet settlement, and Phone session behavior functional when optional events are disabled
- generic Event Instance V2 progression now handles condition, branch, one-time random decision, fact wait, absolute timeout, owner request, and terminal nodes without changing frozen Event Instance V1 meaning
- advance only after correlated owner facts; an owner request, Chat message, model classification, or Phone summary is not canonical proof by itself
- retain Phone transcript/summary in Phone, Chat history in Chat, order/case truth in the commerce owner, journey/ETA in Map, and ledger truth in Wallet
- keep both Food Delivery and Shopping owner Adapters covered so the commerce seam does not collapse back into Food Delivery-specific code
- treat the Shopping Adapter as seam proof only; do not describe it as a completed user-facing Shopping event or use it to close remaining Shopping product work until the Shopping owner accepts its product scenario
- keep the user-reported issue fixture and latent-positive fulfillment fixture proving the Runtime is not hard-coded to destination change
- keep Food Safety handling deterministic and owner-native; do not turn it into an optional random dismissal path
- follow `docs/architecture/USER_INITIATED_COMMERCE_INTERACTION_EVENT_ARCHITECTURE.md`

## 11. Workstream K: Player Context, World Evolution, And Information Propagation

Status: `PLAYER_CONTEXT_V1_FOUNDATION_DONE / WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_NOT_STARTED`.

- follow `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md`
- preserve the landed `player-context-projection.js` seam: stable structured user identity stays in Contacts Self Profile and crosses only through bounded profile/world/template/revision evidence
- inventory every dynamic player/world value against existing owners before proposing a Player State Module or World State And Arc Ledger
- separate owner-confirmed facts, account/person claims, and committed Community/Media posts
- let Event Runtime coordinate eligibility, persisted decisions, fact waits, owner requests, references, and provenance without owning publication bodies or arbitrary world truth
- keep role continuity as the primary consumer of cross-module context: Event Runtime may return a bounded, role-scoped memory candidate after owner confirmation, while Relationship Runtime decides whether it becomes durable memory and Chat consumes only the resulting projection
- keep local-event visibility participant-scoped by default; public world evolution may produce a separate world-scoped fact/claim/publication projection for same-world retrieval without copying it into every role memory or prompt
- keep event severity, world-publication reach, and role-memory importance as separate signals; a formal event is not automatically a durable memory, and a meaningful Chat disclosure is not required to be a formal Event Instance
- keep ordinary no-event behavior and local deterministic eligibility available without an API
- the first manager/public-idol eligibility policy and Contacts revision migration are landed; freeze a separately accepted owner-native incident recipe, persistence/audit rules, native product surface, no-event path, and deterministic fixtures before any random trigger, model call, or new EVE-stage proposal
- do not infer authorization for EVE-5, CJA-6B, a Forum/News app, Chat Me feed expansion, closed-page simulation, investigation storage, or high-impact reputation/identity mutation

## 12. Semantic Guardrails

Treat these as bugs:

1. World Hub becomes the normal data-entry surface
2. Cheats appears as a default user path
3. runtime layers start owning module-native records
4. high-impact automation is enabled before review surfaces are stable
5. raw `relationshipLabelText` or `relationshipLabelNote` are used as event-decision inputs instead of saved classification fields
6. high-risk gate rules are duplicated in module adapters instead of using the preset seam
7. generated friend/block/refusal social events directly mutate Chat, Contacts, or relationship runtime without the event-runtime audit/review path
8. World Pack app proposal review creates event rules or runtime mutations instead of confirmed appBindings
9. Event Runtime starts owning Mini Scene artifacts/presenters or lets a scene interaction bypass source-module validation/review
10. a Map checkpoint adapter mutates journey, transport, pin, place, arrival, or cancellation truth directly
11. journey eligibility runs on every animation tick or makes an event mandatory for completion
12. MJE-1 transport planning is treated as authorization for the later Map event adapter
13. Agenda Journey or Activity Session eligibility runs on every countdown tick
14. elapsed time or Map arrival is treated as proof that a non-travel activity completed
15. popup mode `off` disables event eligibility or silently auto-applies a high-impact outcome
16. CJA documentation acceptance is treated as authorization to add a route, store, timer, adapter, permission, persistence field, or migration
17. a host event card becomes a second event record or an authorization token
18. a Map event anchor creates or mutates place, pin, discovery, role-position, or journey truth
19. World Hub event review becomes a general task/reminder system or silently gains Cheats privileges
20. a production host accepts `host_detail` expansion for another host, or a source record can inject/reuse a runtime-log ID and pass it off as exact lineage
21. an order-related commerce event is created from coordinates, saved-address inference, purchase history, model classification, or free-form text without an explicit user service interaction and valid owner context
22. an event recipe becomes the only way ordinary commerce messaging, support, address editing, ETA, reroute, calling, or payment can work
23. Phone summary text, Chat service-account copy, or an unconfirmed owner request is treated as proof that a business mutation succeeded
24. the EVE-4B specialized causal-chain field is renamed and reused as the generic Runtime instead of receiving a versioned migration
25. raw Self Profile prose, coordinates, model classification, or a social post are used to infer occupation, user intent, guilt, relationship, or canonical world truth
26. volatile player/world state is pushed into Contacts, WorldBook, or Event Runtime because callers want one convenient Store
27. a claim, post, Phone summary, or model output is treated as an owner-confirmed fact
28. Event Runtime persists a future Community/Media publication body or a future clue system stores its deductions inside the event log
29. Event Runtime writes Chat history, role memory, or relationship truth directly, or a consumer uses raw Event Runtime logs as an unfiltered prompt context
30. a local event is broadcast to unrelated roles merely because it is persisted, or a public world-knowledge projection is copied into every role's personal memory
31. event severity is reused as role-memory importance, or a low-impact formal event is allowed to outrank a meaningful user disclosure without a Relationship Runtime decision
