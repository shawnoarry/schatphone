# Module Architecture Governance Package

Updated: 2026-06-19

Use this package for state ownership, storage direction, refactor planning, module maturity, and cleanup governance.

Current governance note: Settings backup/export/restore, storage diagnostics, and real-push setup workflows now use focused composable Interfaces. Chat active-thread route/read-model state now uses `src/composables/useChatActiveThreadModel.js` as the first top-hotspot view seam. The next architecture-governance work should usually continue a narrow Chat seam, move to another top hotspot view, or add a narrow `systemStore` facade rather than continuing Settings by inertia.

Current note: `src/lib/world-interface.js` is the shared seam for active WorldBook/world-context reading, including active Book source links, encyclopedia entries, and active World Pack metadata. Book V1 is now long-form text-source storage, while WorldBook remains the activation surface. World Pack service-account templates currently surface as Chat-add availability and should be added from Chat once the Chat-side flow exists. World app bindings are centralized through `src/lib/world-pack-app-bindings.js`, with Shopping/Food Delivery/Calendar/Map as current target-app consumers and App Store/Home as the global entry-management path. Nonstandard app proposals pass through `src/lib/world-app-template-registry.js` and the WorldBook Current World Pack review UI before any appBinding is written; unsupported proposals such as `black_market` stay rejected until a dedicated app shell exists.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `IMPLEMENTATION_WORKSTREAMS.md`

Also read when needed:

- `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
- `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`
- `docs/strategy/STATE_OWNERSHIP_STRATEGY.md`
- `docs/strategy/STORAGE_STRATEGY.md`
