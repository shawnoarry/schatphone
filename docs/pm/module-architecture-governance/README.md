# Module Architecture Governance Package

Updated: 2026-05-29

Use this package for state ownership, storage direction, refactor planning, module maturity, and cleanup governance.

Current note: `src/lib/world-interface.js` is the shared seam for active WorldBook/world-context reading, including active Book source links and active World Pack metadata. Book V1 is now long-form text-source storage, while WorldBook remains the activation surface. World Pack service-account templates can generate Chat Directory entries only after user confirmation.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `IMPLEMENTATION_WORKSTREAMS.md`

Also read when needed:

- `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
- `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`
- `docs/strategy/STATE_OWNERSHIP_STRATEGY.md`
- `docs/strategy/STORAGE_STRATEGY.md`
