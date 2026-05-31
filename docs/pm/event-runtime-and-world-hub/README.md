# Event Runtime And World Hub Package

Updated: 2026-05-31

Use this package for event runtime, relationship runtime, World Hub, Cheats planning, runtime review, and override-lane design.

Current handoff: relationship classification Round 4 has added saved-classification gate audit metadata for low-impact relationship facts, plus named high-risk gate presets for future event packs. World Hub may review gate metadata read-only; no high-impact romance/conflict automation is enabled by this package. Incoming Chat social events such as friend requests, blocks, and being-blocked states should wait for the Chat shell and then enter through explicit event-runtime review/audit, not ad hoc Chat or Contacts writes. World Pack nonstandard-app template extraction now has a WorldBook Current World Pack review UI, but remains a WorldBook/appBinding seam only; it must not generate event rules or runtime mutations.

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
