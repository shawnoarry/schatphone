# Event Runtime And World Hub Package

Updated: 2026-08-14

Use this package for event runtime, relationship runtime, World Hub, Cheats planning, runtime review, and override-lane design.

Confirmed persistence boundary: accepted relationship facts and the provenance needed to audit persistent truth cannot be silently or irreversibly truncated. Ephemeral/rebuildable runtime data may rotate, and older authoritative evidence may move into reversible cold archives while remaining reviewable from World Hub.

Confirmed AI-artifact boundary: Event Runtime persists normalized proposals, review decisions, applied/rejected status, and minimum source/provider provenance. It does not retain the complete AI prompt, raw provider response, or uncommitted generated content by default. If an approved event formally publishes a post, scene, episode/performance record, long-form artifact, or state history, the target module stores that committed canonical content while Event Runtime keeps provenance and outcome references.

Current Map World Suite reference boundary: persisted Event Instances and Map Journey Event Proposals expose a pure current/history Map-pack reference projection. It carries stable runtime reference IDs and `mapPackId` only; event copy, text materialization, participant facts, and source bodies remain Event Runtime-owned and are not copied into Map inspection.

Current handoff: EVE-4A is `TECHNICAL_SPIKE_COMPLETE / PRODUCT_ACCEPTANCE_WITHDRAWN`; EVE-4B is an implemented owner-native reference vertical; EVE-4C is `DONE 2026-08-14`. Event Runtime coordinates causes, eligibility, generic Event Instance V2 progression, provenance, and audit; owner Adapters write canonical truth; each owner presents the result through its native form. Participating in an event chain does not require registering an Event Surface. World Hub still exposes one Event Notebook read model over existing Event Instances, logs, Chat social proposals, and Map Journey proposals, with source/module/status filters, stable lineage review, stale-source fail-safe rows, and event-scoped notes. `store:simulation` V5 preserves V1 instances and notes, adds V2 instances/facts/requests, migrates V1-V4, includes them in backup/restore, and does not discard durable review truth when bounded runtime logs rotate. Notebook selection and note actions do not retrigger an event, mutate source records, create Reminders or Calendar plans, or inherit Cheats authority.

Landed EVE-4C direction: the EVE-4B Food Delivery/Wallet/Map/Phone chain remains historical reference evidence, while production initiation now comes from an explicit order-scoped interaction in the owner app or a registered Chat service account. Food Delivery owns the canonical Service Case and native messages, Phone owns the call transcript and structured resolution proposal, Map owns estimate/reroute truth, Wallet owns payment, and Runtime persists one-time decisions/deadlines/action requests and advances only after correlated owner facts. Shopping implements the same shared owner seam independently. Ordinary messaging, Service Cases, address editing, Map ETA/reroute, Wallet settlement, and Phone sessions remain owner capabilities when optional events are off. The detailed contract is `docs/architecture/USER_INITIATED_COMMERCE_INTERACTION_EVENT_ARCHITECTURE.md`.

Landed Map collaboration boundary: MJE-3 submits bounded canonical snapshots only for completed `en_route` and `near_arrival` checkpoints while Map is mounted. Event Runtime owns Map permission, Surprise Mode, deterministic/random gates, cooldowns, caps, persistent proposal review/provenance, and logs; Map owns journey truth, validates exact result lineage, and applies only no ETA change or a bounded 120-second delay. A proposal remains pending and visible without pausing Map Journey or opening detail automatically; ordinary arrival can dismiss an unreviewed proposal. Missing, stale, or non-pending proposals clear safely, and Map remains able to complete without an event. MJE-3 and the MJE-4 Footprints/place-knowledge follow-up are user-accepted and integrated locally. Read `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`.

Landed Event Surface boundary: EVE-1 provides a pure bounded projection for existing Map Journey and Chat social proposals plus an empty-by-default registered-host capability Interface. It normalizes stable source/proposal/log references, ownership, lifecycle and risk/review state, bilingual/accessibility copy, optional strict stable-place/geographic/canvas anchors, expansion targets, and allowlisted request descriptors. Stale sources, invalid anchors, unknown/unbound actions, and unsupported hosts fail closed. EVE-2C registers exactly one Map host for the approved low-risk production-arrival-briefing family and exposes explicit expansion without adding an Event route or persistent Map projection. EVE-3 keeps cross-module history, pending review, explanations, and event-scoped notes inside the existing hidden World Hub entry; Cheats remains a separately unlocked privileged Module.

Corrected EVE-4A boundary: the Food Delivery production host and compact order-card `Dispatch brief` are removed. The spike proved exact runtime lineage and host validation, but its presentation did not express the product's immersive behavior and its manual update action inverted causality by manufacturing a delay. The retained chain is Runtime checkpoint -> Food Delivery owner Adapter -> canonical ETA plus native order timeline -> existing Chat dispatch notification. Missing, duplicated, cross-order, injected, or mismatched lineage still fails closed. Further EVE-4 work requires one separately accepted chain whose participating Modules, native records, behaviors, side effects, and return path are real; a generic card alone is not acceptance.

Landed location-entry refinement: an authored event activation scope (`remote`, `nearby`, `onsite`, `interior`, journey checkpoint, or later activity checkpoint) is separate from current distance and card placement. Map V3 owns stable place relation, manual-versus-internally-authorized-journey position provenance, and explicit durable place entry/leave state. Event Runtime owns eligibility, discoverability, permissions, intensity, cooldown/cap, invitation, instance, and text truth. Ordinary place focus has no permanent Event button: a local zero-token invitation appears only inside an eligible session, and zero eligible events remains a complete path.

Landed default-content direction: the first product pack targets the current modern K-pop realism world while the engine remains world-neutral. Runtime AI is optional and text-only for V1, invoked only after local eligibility and explicit event expansion; ticks, distance updates, place focus, no-event checks, and compact invitations remain zero-token. Authored K-pop copy is the offline/provider-failure fallback. Location/scene images primarily follow Map/world asset packs, while later CG remains a separately permissioned image-generation Adapter. EVE-2A froze the exact Interfaces and first production-arrival-briefing archetype, EVE-2B implemented the reusable runtime, and EVE-2C now renders that one archetype through Map with three owner-validated choices and no external canonical mutation. Read `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md` before changing EVE-2 behavior.

Accepted future scheduling boundary: Calendar remains the visible long-range confirmed-plan app; a future Agenda Journey app owns today/near-term execution, Activity Session owns timestamp-based activity timing, and a hidden Schedule Orchestrator owns idempotent Calendar-to-Journey materialization. Event Runtime may later evaluate bounded Agenda Journey or Activity Session snapshots only at explicit checkpoints. It owns eligibility, cooldown/cap, interaction and automatic-resolution policy, provenance, and logs, but never source journey, timer, Calendar, Map, or downstream value truth. This is documentation-only; no runtime adapter or visible Agenda Journey surface is implemented. Read `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`.

Activity timing and its Focus Companion presentation remain useful when optional events are disabled. Module permission, random-event intensity, and presentation mode are independent controls. A scheduled activity, travel step, deadline, or safety notice cannot disappear merely because optional events are quiet/off, and a passive event cannot take ownership of the source timer or media assets.

Future Mini Scene dependency: Event Runtime may be a trigger-policy/provenance caller of the shared Mini Scene Module, but it does not own the generated artifact, world-profile/regex execution, presenter, or source-module record. Read `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` before promoting a runtime-triggered scene.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `WORLD_HUB_AND_CHEATS.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md` for the current EVE-2/default-content direction
6. `docs/architecture/USER_INITIATED_COMMERCE_INTERACTION_EVENT_ARCHITECTURE.md` for the EVE-4C user-triggered commerce reference and migration direction

Also read when needed:

- `docs/process/EVENT_WORKFLOW.md`
- `docs/architecture/SIMULATION_EVENT_ENGINE.md`
- `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
- `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`
- `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`
- `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`
