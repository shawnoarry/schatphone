# Module Architecture Governance Status And Handoff

Updated: 2026-05-31

This file is the handoff page for architecture cleanup, state ownership, storage direction, and long-term maintainability work.

## 1. Current Status

Status: `PARTIAL_DONE`

What is already landed:

1. package-level ownership docs now exist for the major product lanes;
2. relationship/runtime semantics have already gone through one important cleanup pass;
3. some low-risk component extraction and cleanup work has already started in the UI layer.
4. `src/lib/world-interface.js` now centralizes active WorldBook/world-context reading for Chat, WorldBook overview, active Book source links, active World Pack metadata, and runtime worldview fallback.
5. Book text-library V1 now implements the ownership split: Book owns long reusable text sources, WorldBook owns activation/source links, and Files remains hidden/internal.
6. World Pack V1 now has persisted built-in packs, one active pack per save, activation review, World Interface exposure, and service-account template availability. Current World Pack now hands service-account creation off to the future Chat-side add flow instead of directly generating Chat Directory entries from Settings.
7. World app bindings now centralize global launch rows and target-app UX context through `src/lib/world-pack-app-bindings.js`; current consumers are Shopping, Food Delivery, Calendar, and Map.
8. Nonstandard-app proposals now have a guarded whitelist/review seam in `src/lib/world-app-template-registry.js` plus a WorldBook Current World Pack review UI with explicit loading, empty, parse/API error, and rejected-state treatment; confirmed proposals become appBindings only after user action and then reuse the existing App Store/Home/target-app context seams, while unknown, low-confidence, or unsupported proposals cannot create modules, stores, event rules, or App Store entries. `black_market` is currently unsupported as `needs_dedicated_app`, so it is not mapped onto Shopping. Dynamic `transit_pass -> Map`, `reservation_board -> Calendar`, and `dispatch_board -> Food Delivery` paths are covered by regression tests.

Still incomplete:

1. legacy field semantics and fallback paths still need continued cleanup;
2. some large files still need careful decomposition;
3. historical docs and encoding debt still need targeted cleanup;
4. stale code and compatibility layers still need periodic audit.
5. The next WorldBook expansion should focus on user-testing the landed nonstandard-app review UI, concrete app-archetype behavior, and broader subscription generation, not new ownership surfaces.

## 2. Recommended Next Slice

1. Continue one-owner-per-concept cleanup where docs and code still drift.
2. Keep extracting low-risk pieces from oversized files while preserving tests and migrations.
3. Audit stale docs, unused code, and compatibility layers in small safe batches.
4. If continuing WorldBook/Book work, start from the implemented V1 baseline in `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md` and `docs/superpowers/plans/2026-05-29-book-text-library-worldbook-plan.md`.

## 3. Do Not Do

1. Do not refactor without migration clarity and regression coverage.
2. Do not create parallel owners for the same concept.
3. Do not let cleanup work invent new product requirements.
4. Do not reuse hidden `Files` as the Book UI or make Book responsible for WorldBook activation.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`
5. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
6. `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`
7. `docs/roadmap/PROJECT_MODULE_AUDIT.md` when audit priority changed
