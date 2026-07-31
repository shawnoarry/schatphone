# Event Runtime And World Hub Package

Updated: 2026-07-31

Use this package for event runtime, relationship runtime, World Hub, Cheats planning, runtime review, and override-lane design.

Confirmed persistence boundary: accepted relationship facts and the provenance needed to audit persistent truth cannot be silently or irreversibly truncated. Ephemeral/rebuildable runtime data may rotate, and older authoritative evidence may move into reversible cold archives while remaining reviewable from World Hub.

Confirmed AI-artifact boundary: Event Runtime persists normalized proposals, review decisions, applied/rejected status, and minimum source/provider provenance. It does not retain the complete AI prompt, raw provider response, or uncommitted generated content by default. If an approved event formally publishes a post, scene, episode/performance record, long-form artifact, or state history, the target module stores that committed canonical content while Event Runtime keeps provenance and outcome references.

Current handoff: relationship classification Round 4 has added saved-classification gate audit metadata for low-impact relationship facts, plus named high-risk gate presets for event packs. World Hub may review gate metadata read-only; no high-impact romance/conflict automation is enabled by this package. Incoming generated Chat social events now enter explicit event-runtime review/audit from Chat AI output or the foreground/session runtime greeting source: low-risk greetings can become audited message requests, while role refusal/block/restore/unblock proposals wait for World Hub approval before Chat changes the communication state. World Hub now explains Chat social proposal source, trigger policy, and ownership boundaries. World Pack nonstandard-app template extraction now has a WorldBook Optional capability Packs review UI, but remains a WorldBook/appBinding seam only; it must not generate event rules or runtime mutations.

Landed Map collaboration boundary: MJE-3 submits bounded canonical snapshots only for completed `en_route` and `near_arrival` checkpoints while Map is mounted. Event Runtime owns Map permission, Surprise Mode, deterministic/random gates, cooldowns, caps, persistent proposal review/provenance, and logs; Map owns journey truth, validates exact result lineage, and applies only no ETA change or a bounded 120-second delay. A proposal remains pending and visible without pausing Map Journey or opening detail automatically; ordinary arrival can dismiss an unreviewed proposal. Missing, stale, or non-pending proposals clear safely, and Map remains able to complete without an event. This adapter is implemented in the current uncommitted tree and is `READY_FOR_USER_REVIEW`, not integrated or accepted. Read `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`.

Accepted future scheduling boundary: Calendar remains the visible long-range confirmed-plan app; a future Agenda Journey app owns today/near-term execution, Activity Session owns timestamp-based activity timing, and a hidden Schedule Orchestrator owns idempotent Calendar-to-Journey materialization. Event Runtime may later evaluate bounded Agenda Journey or Activity Session snapshots only at explicit checkpoints. It owns eligibility, cooldown/cap, interaction and automatic-resolution policy, provenance, and logs, but never source journey, timer, Calendar, Map, or downstream value truth. This is documentation-only; no runtime adapter or visible Agenda Journey surface is implemented. Read `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`.

Future Mini Scene dependency: Event Runtime may be a trigger-policy/provenance caller of the shared Mini Scene Module, but it does not own the generated artifact, world-profile/regex execution, presenter, or source-module record. Read `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` before promoting a runtime-triggered scene.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `WORLD_HUB_AND_CHEATS.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`

Also read when needed:

- `docs/process/EVENT_WORKFLOW.md`
- `docs/architecture/SIMULATION_EVENT_ENGINE.md`
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
- `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`
- `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`
- `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`
