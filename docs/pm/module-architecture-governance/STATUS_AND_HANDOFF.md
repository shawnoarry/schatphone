# Module Architecture Governance Status And Handoff

Updated: 2026-06-12

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
9. Book / WorldBook text naming is now narrowed around canonical worldview, encyclopedia, and world-rule concepts. Legacy Book `assetType`, source-link `usage`, `knowledgePoints`, `knowledgePointIds`, and old reference/profile-template text labels remain readable through compatibility aliases, but they are not user-facing Book/WorldBook text categories.
10. Built-in Book sources now live outside user persistence and backup payloads. `现代首尔 K-pop 娱乐圈` main worldview and world rules are exposed through the Book store as read-only callable assets; WorldBook source links can target them, while user edits create normal user-owned copies.

11. WorldBook's Book-library entry is an in-place card catalog, not a route handoff to `/book`. That preserves the ownership split: Book edits assets, WorldBook activates source links.
12. The K-pop trial Book entries are real built-in Book assets exposed through the Book store and WorldBook picker, while still excluded from user persistence and backups; the trial set now keeps Book text to worldview, rules, and encyclopedia. The encyclopedia placeholder has been replaced in the visible catalog by the first formal entries: K-pop industry mechanisms, Chinese fandom terms, Seoul youth lifestyle, company/group/program references, and representative member profiles. The old placeholder id remains readable only as a hidden compatibility path for existing source links.
13. WorldBook picker grouping is presentation-only: grouped category cards are derived from real Book assets and inferred activation roles; no second storage layer or fake UI-only asset list is introduced.
14. WorldBook's Active World text overview is also presentation-only: the three visible text directories are derived from Book assets and WorldBook source links, while source-link storage remains the same canonical activation layer. Profile templates are structured WorldBook/Contacts records: universal templates can be used directly in Contacts, and enabled current-world templates are prioritized by Contacts.
15. Governance pass 2026-06-12: `docs/process/AI_WORK_MODE.md` is now the explicit process authority over project-local skills and old TODO/PLAN references; `schatphone-workflow` is documented as a shortcut, not a second rulebook; `docs/superpowers/**` now has directory-level authority/promotion rules so old specs, plans, handoffs, and content drafts are not mistaken for active execution boards.
16. Dependency security pass 2026-06-12: production audit is clean after lockfile-only transitive updates for `picomatch`, `postcss`, `yaml`, and `nanoid`. No framework migration is required for this pass.
17. Build-warning cleanup 2026-06-12: `src/main.js` now statically imports the push service-worker registration helper while still deferring execution until after first paint. This removes the Vite warning caused by `src/lib/push.js` being both dynamically and statically imported.
18. E2E navigation helper cleanup 2026-06-12: `e2e/helpers/navigation.js` now owns the repeated lock-screen unlock, Home readiness, hash-route navigation, and Home dock app-open flow. Current E2E specs use that shared test Module instead of keeping shallow per-file copies.
19. Encoding-guard scope cleanup 2026-06-12: `tests/mojibake-guard.test.js` now matches the documentation authority model by guarding source and active docs, keeping `docs/superpowers/**/README.md` governance notes covered, and excluding `docs/archive/**` plus non-README `docs/superpowers/**` draft/reference files.

Still incomplete:

1. legacy field semantics and fallback paths still need continued cleanup;
2. some large files still need careful decomposition;
3. historical docs and encoding debt still need targeted cleanup;
4. stale code and compatibility layers still need periodic audit.
5. The next WorldBook expansion should focus on user-testing the landed nonstandard-app review UI, concrete app-archetype behavior, and broader subscription generation, not new ownership surfaces.
6. Validation debt found during the 2026-06-12 governance pass has been cleared: `ChatUserActionPanel.vue` shopping-entry/user-action copy is no longer mojibake, and WorldBook e2e specs now assert the current overview/templates UI contract.
7. E2E stability pass 2026-06-12: Home dock navigation, Contacts route entry, WorldBook entry, and App Store mini-app specs now share one navigation helper for unlock, Home readiness, hash-route navigation, and dock app opening; full Playwright validation is green after the fix.

## 2. Recommended Next Slice

1. Continue one-owner-per-concept cleanup where docs and code still drift.
2. Keep extracting low-risk pieces from oversized files while preserving tests and migrations.
3. Audit stale docs, unused code, and compatibility layers in small safe batches.
4. If continuing WorldBook/Book work, use the implemented V1 baseline in `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md` and `docs/superpowers/plans/2026-05-29-book-text-library-worldbook-plan.md` as reference only; promote the concrete continuation slice into the roadmap/package handoff before implementation.
5. Next cleanup should continue with broader encoding review outside draft/reference workspaces plus obsolete compatibility layers, now that the current unit/e2e baseline is green.
6. Keep dependency work to patch/minor updates while the current stack is healthy; major Vite/Vitest/ESLint jumps should remain separate migration tasks.
7. Continue hardening E2E only where flakes are observed; reuse `e2e/helpers/navigation.js` for shell entry flows and prefer stable user-facing/test-id locators plus explicit route readiness over broad timeout increases.
8. Keep future build-warning cleanup narrow: remove warning causes when ownership is clear, but avoid broad bundling or code-splitting changes without a measured performance reason.

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
