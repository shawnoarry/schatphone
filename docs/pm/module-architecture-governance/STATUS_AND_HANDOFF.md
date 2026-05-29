# Module Architecture Governance Status And Handoff

Updated: 2026-05-29

This file is the handoff page for architecture cleanup, state ownership, storage direction, and long-term maintainability work.

## 1. Current Status

Status: `PARTIAL_DONE`

What is already landed:

1. package-level ownership docs now exist for the major product lanes;
2. relationship/runtime semantics have already gone through one important cleanup pass;
3. some low-risk component extraction and cleanup work has already started in the UI layer.
4. `src/lib/world-interface.js` now centralizes active WorldBook/world-context reading for Chat, WorldBook overview, and runtime worldview fallback, reducing duplicated consumer logic before full World Pack storage exists.
5. A review-ready Book text-library design now defines the next ownership split: Book owns long reusable text sources, WorldBook owns activation/source links, and Files remains hidden/internal.

Still incomplete:

1. legacy field semantics and fallback paths still need continued cleanup;
2. some large files still need careful decomposition;
3. historical docs and encoding debt still need targeted cleanup;
4. stale code and compatibility layers still need periodic audit.
5. Book text-library storage, route registration, backup integration, and WorldBook source-link implementation are not yet coded.

## 2. Recommended Next Slice

1. Continue one-owner-per-concept cleanup where docs and code still drift.
2. Keep extracting low-risk pieces from oversized files while preserving tests and migrations.
3. Audit stale docs, unused code, and compatibility layers in small safe batches.
4. If continuing WorldBook work, start from `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md` and `docs/superpowers/plans/2026-05-29-book-text-library-worldbook-plan.md`.

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
