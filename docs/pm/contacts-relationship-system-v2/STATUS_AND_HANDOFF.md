# Contacts Relationship System V2 Status And Handoff

Updated: 2026-06-01

This file is the handoff page for anyone continuing Contacts, role, relationship, or memory-management work.

## 1. Current Status

Status: `DONE`

What is already landed:

1. visible `roleId` validation, duplicate checks, and backup/restore migration baseline;
2. clearer boundary between Contacts, Chat Directory, Chat, relationship runtime, and World Hub;
3. relationship runtime memory-group APIs, source-record cleanup metadata, and recompute flow;
4. Contacts delete-role, reset-relationship, and delete-one-memory-group flows with impact summaries and typed confirmation;
5. cleanup handlers and linked-fact cleanup for Calendar, Phone, Wallet, Shopping, Food Delivery, and Map;
6. World Hub cleanup entry for relationship reset and one-memory cleanup without deleting the role profile.
7. Contacts detail baseline now shows manual vs event-attached item counts, source chips, and locked-event explanations in role detail sections.
8. Contacts V2 detail IA and WorldBook-driven role-profile-template decisions are recorded in `ROLE_PROFILE_TEMPLATE_DECISION_LOG.md`; formal specs now exist under `docs/superpowers/specs/`, and the execution plan exists at `docs/superpowers/plans/2026-05-19-worldbook-contacts-profile-template-plan.md`.
9. WorldBook profile-template store baseline exists, with global presets and world-specific copies.
10. Contacts profile entities now distinguish Self Profile, Main Role, and NPC.
11. NPC -> Main Role upgrade preserves the existing profile and Chat binding/history.
12. Chat context contracts now carry entity type, template links, profile values, and capability flags.
13. Contacts detail now has a Role Hub summary that surfaces entity type, Chat-bound state, manual/event-attached counts, WorldBook field count, memory count, and linked-activity source summary before deeper sections.
14. Preferences, life pattern, and social graph detail items are grouped by Manual details vs Event-attached, and event-attached items with a memory key can open the linked memory detail directly.
15. Memory detail now expands into a source-audit view: module-level source cards show raw/source record IDs and cleanup coverage, and the selected memory also shows its latest supporting relationship events.
16. Manual detail items can now be edited inline from Contacts detail, and linked activity now expands from a summary card into a source-aware event-attached list with direct memory entry points.
17. The Memories section now includes a lightweight review toolbar with source filtering, sort mode, and headline facts for the selected memory group.
18. Memory groups now support lifecycle review management from Contacts detail: `Pinned / Active / Archived` state plus a short review note persisted in relationship runtime.
19. Contacts memory filtering now runs against the full sorted memory list before the detail page applies its visible-item cap, so source filters do not silently miss matching memories that fall outside the first screenful.
20. World Hub relationship snapshots now surface the primary memory review state and review note, so `Pinned / Active / Archived` semantics are visible outside Contacts as well.
21. Relationship runtime now sorts target event summaries by `createdAt` before building recent-event snapshots, so backfilled or later-imported older facts do not override the actual latest relationship event.
22. Default relationship summaries now treat archived memories as hidden context rather than live headline state: Contacts card summaries, runtime snapshots, and Chat prompt summaries all suppress archived-only memories unless a caller explicitly opts in.
23. `summarizeEntityForTarget()` now exposes a fuller standard snapshot contract: `primaryMemory`, total vs visible memory counts, archived-only state, and source-ref/source-module summary fields are available to UI consumers instead of being rebuilt ad hoc in each page.
24. Contacts linked-activity summary now dedupes runtime source refs and event-attached detail refs before counting sources, so one real-life event no longer inflates source totals just because both runtime and detail items reference it.
25. World Hub now reads the runtime primary-memory summary contract directly, so archive-only memory groups keep their management badge/note while no longer pretending to be default-current shared memory headlines.
26. Map-derived Calendar follow-ups now preserve explicit `sourceTripId` lineage and reuse the originating shared-route memory key, so the follow-up becomes supporting context instead of a second top-level memory.
27. Wallet order-support facts for Shopping gifts and Food Delivery shared meals are covered at the shared adapter layer as supporting-only facts inside the upstream order memory, so downstream ledger traceability does not double-count relationship growth.
28. Relationship runtime now exposes primary-led `recallSummary` fields for prompt/source recall plus UI-facing review summaries for Contacts and World Hub, so supporting facts enrich the memory without stealing its headline or leaking source-audit labels into default user copy.
29. Calendar confirmed-event cards now include relationship review detail for source lineage, selected target, memory role, and whether the Calendar fact applied growth or stayed supporting-only.
30. Relationship classification Round 1 schema/store seam is landed: role profiles persist relationship premise text, initial seed values, stored primary category, modifiers, confidence/source/timestamp, and explanation; user-edited classifications are protected from silent AI overwrite through the store action.
31. World Pack schema can carry explicit relationship category/modifier registry additions as data-only extensions, without adding an editor UI.
32. Relationship classification Round 2 AI seam is landed: `src/lib/relationship-label-classifier.js` builds prompts, calls through `src/lib/ai.js`, parses provider JSON through shared response helpers, normalizes suggestions against the registry, treats high confidence as `ai_auto`, and returns medium/low confidence as confirmation-required `ai_confirmed` candidates.
33. Relationship classification Round 3 Contacts UI is landed: Contacts detail now shows the current relationship runtime snapshot first, then provides an editable profile-side relationship premise form for label, note, seed values, primary category, modifier tags, classification audit, AI classify, confirmation, and manual save flows. Manual edits save as `user_edited`; protected `user_edited` classifications surface a non-invasive status instead of being silently overwritten.
34. Relationship classification Round 4 event/runtime gating is landed: existing low-impact relationship facts attach `relationshipGate` audit metadata from saved category/modifier classification fields, relationship runtime persists and respects block/confirm decisions, and World Hub can show gate metadata read-only. Raw label/note prose remains profile-side premise text and is not used for event decisions.
35. `summarizeEntityForTarget()` now keeps memory counts canonical even when a caller asks for zero or a small number of displayed memory summaries; `memorySummaries` is capped, while `totalMemoryCount`, `visibleMemoryCount`, and `archivedMemoryCount` describe the full target state.
36. Contacts now shows a read-only Chat social-channel snapshot in the Role Hub summary so the user can see the role's current communication reachability without making Contacts the event judge.

Still incomplete:

1. legacy Chat-side relationship compatibility fields still need continued semantic containment.
2. WorldBook template authoring remains a compact V1 baseline, not a full form-builder or onboarding flow.
3. deeper World Hub review quality continues under roadmap 4.3.
4. High-impact relationship automation is still deferred; Round 4 only adds helper-level hard-gating behavior and low-impact audit metadata.
5. Incoming generated Chat social events are not authored here. Contacts displays the current social-channel snapshot for a role, while Chat owns the applied communication state, Event Runtime/World Hub own generated-event review, and relationship runtime owns confirmed relationship continuity.

## 2. Recommended Next Slice

1. Move to 4.3 World Hub review quality before adding stronger controls.
2. Keep watching Chat-side legacy relationship compatibility fields so they do not grow back into relationship truth.
3. Continue from the V1 WorldBook/Contacts profile-template baseline by improving template editing and profile-value authoring ergonomics.
4. Continue polishing the Contacts display-only social snapshot so it remains clear, read-only, and separate from relationship metrics or memory truth.

4.2 closure baseline:

1. Shopping gift memory and Shopping delivery follow-up Calendar events now reuse one shared `shopping_gift` memory group when they refer to the same order.
2. This keeps one top-level memory while preserving both source records for audit, cleanup, and supporting-event drill-down.
3. Contacts and World Hub now consume the same review-priority ordering more consistently, reducing page-to-page drift in how primary memories are presented.
4. Runtime recent-event summaries now respect event timestamps instead of raw insertion order, which keeps Chat/Contacts summary text aligned when older facts are imported later.
5. Archived memory is now consistently treated as background history instead of default-current relationship signal across runtime, Contacts, and Chat summary assembly.
6. Runtime snapshots are now the canonical source for primary-memory headline, memory-count totals, archive-only hinting, and source-summary data across Contacts and World Hub.
7. Map shared-route memory plus downstream Map-derived Calendar follow-up now uses the same explicit-lineage pattern when `sourceTripId` is available.
8. Shopping gift and Food Delivery shared-meal Wallet support facts now have shared adapter-level regressions proving they stay supporting-only in the upstream memory group.
9. Memory group summaries now include prompt-facing primary-led recall text and UI-facing related-record summaries.
10. Calendar event cards now expose review detail for the relationship memory link.
11. Calendar keeps source-audit copy in its relationship review, while Contacts and World Hub use product-facing related-record copy by default.
12. The current 4.2 dedupe baseline covers the explicit source-id chains already present in the product; fuzzy same-text merging remains out of scope until a product decision says otherwise.
13. Runtime summary counts are independent of display caps, so Contacts/World Hub can request short memory lists without undercounting the target's real memory state.

## 3. Do Not Do

1. Do not move ordinary chat-message deletion into Contacts.
2. Do not present `profileId` or `entityKey` as if they were the user-facing `roleId`.
3. Do not let Chat Directory own destructive role delete or relationship reset.
4. Do not let `relationshipLevel` or `relationshipNote` become the live relationship truth again.
5. Do not delete only the memory summary while leaving linked source records and runtime facts alive.
6. Do not implement WorldBook-driven profile templates directly from the decision log; use the formal specs and the implementation plan after review.
7. Do not let Contacts, Chat, or raw relationship premise prose become the event-decision owner.
8. Do not let Contacts apply role-initiated friend/block/refusal outcomes directly; generated social events must use the landed Chat social-event seam plus event-runtime audit.

## 4. Validation

- `npm.cmd test -- tests/contacts-profile-template-view.test.js tests/contacts-detail-danger-flows.test.js tests/contacts-chat-directory-boundary-copy.test.js tests/contacts-wallet-ledger-context.test.js`: pass
- `npm.cmd test -- tests/contacts-detail-danger-flows.test.js tests/contacts-profile-template-view.test.js tests/contacts-chat-directory-boundary-copy.test.js tests/contacts-wallet-ledger-context.test.js tests/contacts-relationship-actions.test.js tests/contacts-profile-entities-store.test.js`: pass
- `npm.cmd test -- tests/relationship-runtime-store.test.js tests/contacts-detail-danger-flows.test.js tests/chat-store-model.test.js`: pass
- `npm.cmd test -- tests/relationship-fact-adapters.test.js tests/calendar-event-store.test.js tests/map-view-information-architecture.test.js tests/relationship-runtime-store.test.js`: pass
- `npm.cmd test -- tests/relationship-fact-adapters.test.js tests/shopping-view.test.js tests/food-delivery-view.test.js tests/relationship-runtime-store.test.js`: pass
- `npm.cmd test -- tests/relationship-runtime-store.test.js tests/relationship-fact-adapters.test.js tests/contacts-detail-danger-flows.test.js tests/control-center-view.test.js`: pass
- `npm.cmd test -- tests/calendar-relationship-fact-view.test.js tests/relationship-runtime-store.test.js tests/relationship-fact-adapters.test.js tests/control-center-view.test.js tests/contacts-detail-danger-flows.test.js`: pass
- `npm.cmd test -- tests/relationship-classification-schema.test.js tests/chat-store-model.test.js`: pass on 2026-05-30 for relationship classification Round 1.
- `npm.cmd test -- tests/relationship-label-classifier.test.js tests/chat-store-model.test.js`: pass on 2026-05-30 for relationship classification Round 2.
- `npm.cmd test -- tests/contacts-relationship-classification-view.test.js tests/contacts-profile-template-view.test.js tests/contacts-detail-danger-flows.test.js`: pass on 2026-05-30 for relationship classification Round 3 Contacts UI.
- `npm.cmd test -- tests/relationship-event-gating.test.js tests/relationship-fact-adapters.test.js tests/relationship-runtime-store.test.js tests/control-center-view.test.js`: pass on 2026-05-30 for relationship classification Round 4 event/runtime gating.
- `npm.cmd run lint`: pass
- `npm.cmd run test`: pass
- `npm.cmd run build`: pass

## 5. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `DESTRUCTIVE_ACTIONS.md` when delete/reset semantics changed
5. `ROLE_HUB_INFORMATION_ARCHITECTURE.md` when detail-page structure changed
6. `IMPLEMENTATION_WORKSTREAMS.md` when the next recommended slice changed
7. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when runtime meaning changed
8. `docs/architecture/ROLE_BINDING_CONTRACT.md` when field semantics or binding meaning changed
