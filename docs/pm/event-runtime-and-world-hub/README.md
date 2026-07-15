# Event Runtime And World Hub Package

Updated: 2026-07-15

Use this package for event runtime, relationship runtime, World Hub, Cheats planning, runtime review, and override-lane design.

Confirmed persistence boundary: accepted relationship facts and the provenance needed to audit persistent truth cannot be silently or irreversibly truncated. Ephemeral/rebuildable runtime data may rotate, and older authoritative evidence may move into reversible cold archives while remaining reviewable from World Hub.

Confirmed AI-artifact boundary: Event Runtime persists normalized proposals, review decisions, applied/rejected status, and minimum source/provider provenance. It does not retain the complete AI prompt, raw provider response, or uncommitted generated content by default. If an approved event formally publishes a post, scene, episode/performance record, long-form artifact, or state history, the target module stores that committed canonical content while Event Runtime keeps provenance and outcome references.

Current handoff: relationship classification Round 4 has added saved-classification gate audit metadata for low-impact relationship facts, plus named high-risk gate presets for event packs. World Hub may review gate metadata read-only; no high-impact romance/conflict automation is enabled by this package. Incoming generated Chat social events now enter explicit event-runtime review/audit from Chat AI output or the foreground/session runtime greeting source: low-risk greetings can become audited message requests, while role refusal/block/restore/unblock proposals wait for World Hub approval before Chat changes the communication state. World Hub now explains Chat social proposal source, trigger policy, and ownership boundaries. World Pack nonstandard-app template extraction now has a WorldBook Current World Pack review UI, but remains a WorldBook/appBinding seam only; it must not generate event rules or runtime mutations.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `WORLD_HUB_AND_CHEATS.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`

Also read when needed:

- `docs/process/EVENT_WORKFLOW.md`
- `docs/architecture/SIMULATION_EVENT_ENGINE.md`
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`
