# Contacts Relationship System V2 Status And Handoff

Updated: 2026-06-03

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
37. WorldBook Profile Templates now has an explicit Contacts handoff. WorldBook defines reusable world-specific fields; Contacts remains the owner of concrete role, self-profile, and NPC values. The handoff opens Contacts with `from=worldbook&focus=profile_templates`, and Contacts shows a focused entry note plus a new-profile action.
38. Contacts role detail now has V1 profile-value authoring for `世界字段 / World profile fields`: users can open an inline editor, choose a current-world WorldBook template, fill concrete values, set visibility levels, and save `templateLink/profileValues` back to the selected Self Profile/Main Role/NPC. Saving overwrites only fields in the chosen template and preserves out-of-template values so older/custom data is not silently erased.
39. Contacts now has a phone-like first entry screen: Search, My Profile, Recent interactions, Main Roles, and NPC / World Roles appear in that order. Recent interactions is a horizontal shortcut layer for recently active Main Roles/NPCs; it does not remove those people from their complete sections below, and Self Profile is kept out of recent shortcuts.
40. Contacts world-field editing now has a stable field-type UI layer for different worldview templates: single-choice fields render as option selects, long-text fields render as note areas, multi-tag fields explain comma-separated entry and preview tags, and person-reference fields clearly ask for a related person or role ID without pretending a full picker exists yet. This lets WorldBook/world-pack templates vary by world content while Contacts keeps one predictable editing surface.
41. Contacts world-field editing now reviews template changes before save. When a user switches a role from one current-world template to another, the editor shows which selected-template fields will update, which old values will stay as custom fields, and that deleting old fields must be handled separately in the role profile. Saving preserves out-of-template values and marks them as `Custom` in the detail list.
42. Contacts world-field editing now has AI-assisted value drafting. The helper builds a draft-only prompt from the current WorldBook template, selected profile, user/self context, and existing values; provider output is normalized against known template fields. The Contacts button fills only empty editor draft fields, skips saved/manual values, and does not change `profileValues` until the user reviews and presses Save.
43. Contacts now has a current-world template adaptation review. If a profile has no template, an unavailable template, an older saved template version, or a template from another world, Contacts suggests the best current-world template, shows how many values can carry over and how many old values will stay custom, and can ask AI to draft migrated values into the editor. This is draft-only: AI does not save, does not delete old values, and does not overwrite filled/manual fields.
44. The full WorldBook -> Contacts profile-field loop now has committed E2E coverage: copy the ABO template in WorldBook, open Contacts from the handoff, create a role profile, fill world fields, save, verify the saved values, and confirm the phone-width layout has no horizontal overflow or page errors.
45. Contacts home-list read-model governance is extracted. `src/composables/useContactsHomeListModel.js` now owns Contacts search normalization, profile search text, Self Profile / Main Role / NPC grouping, filtered list outputs, and recent-interaction ordering/source labels. This is architecture cleanup only: Contacts role profile storage, Chat Directory binding ownership, relationship-runtime truth, memory cleanup, delete/reset behavior, profile-template editing, Wallet summaries, visible Contacts UI, and route behavior stay unchanged.
46. Contacts memory-list read-model governance is extracted. `src/composables/useContactsMemoryListModel.js` now owns selected-profile memory-group listing, source-filter options, filtered and visible memory groups, visible/total/hidden counts, list summary copy, count labels, and overflow copy. This is architecture cleanup only: relationship-runtime truth/write APIs, selected memory detail, source audit, review-status updates, memory delete/reset flows, Contacts profile storage, Chat Directory binding ownership, visible UI, and route behavior stay unchanged.
47. Contacts memory-detail read-model governance is extracted. `src/composables/useContactsMemoryDetailModel.js` now owns selected-memory source audit rows, cleanup-readiness labels, supporting-event timeline rows, source record ID normalization, and headline facts. This is architecture cleanup only: relationship-runtime truth/write APIs, memory list filtering, selected memory opening, review-status updates, memory delete/reset flows, Contacts profile storage, source-module cleanup ownership, visible UI, and route behavior stay unchanged.
48. Contacts linked-activity read-model governance is extracted. `src/composables/useContactsLinkedActivityModel.js` now owns selected-role linked activity summary/list rows, runtime source-ref plus event-attached detail source dedupe, source counts, event-attached counts, source record id normalization, memory/event fallback summaries, and latest linked-activity copy. This is architecture cleanup only: relationship-runtime truth/write APIs, detail item editing, selected memory opening, memory review/delete/reset flows, profile-template writes, source-module ownership, visible UI, and route behavior stay unchanged.
49. Contacts Role Hub read-model governance is extracted. `src/composables/useContactsRoleHubModel.js` now owns Role Hub entity/chat-state copy, summary card construction, manual/event/world-field/memory counts, Chat entry labels, and read-only Chat social snapshot rows. This is architecture cleanup only: Chat Directory binding ownership, relationship-runtime truth/write APIs, profile-template writes, selected memory flows, delete/reset behavior, social-state application, visible UI, and route behavior stay unchanged.
50. Contacts world-field/template-adaptation display read-model governance is extracted. `src/composables/useContactsWorldFieldModel.js` now owns world-field display rows, current-world/universal/legacy template option ordering, selected template field/entity filtering, saved value mapping, visibility/custom badges, template intro copy, and current-world adaptation display facts. This is architecture cleanup only: profile-template saving, AI draft/adaptation actions, Chat Directory binding ownership, relationship-runtime truth/write APIs, selected memory flows, delete/reset behavior, and visible UI behavior stay unchanged.
51. Contacts danger-zone display read-model governance is extracted. `src/composables/useContactsDangerZoneModel.js` now owns selected-role impact summary copy, reset/delete confirmation detail rows, linked-record cleanup policy copy, and memory-delete preview/final safety details. This is architecture cleanup only: destructive action execution, typed-role confirmations, Chat Directory binding ownership, relationship-runtime truth/write APIs, source cleanup handlers, Photos unbinding semantics, and visible UI behavior stay unchanged.
52. Contacts detail-section display read-model governance is extracted. `src/composables/useContactsDetailSectionModel.js` now owns Preferences / Life Pattern / Social Graph section metadata, manual/event-attached grouping, detail counts, shared policy copy, and source chip labels/hints. This is architecture cleanup only: manual detail add/edit/delete actions, event-attached item lock behavior, selected-memory navigation, Chat Directory binding ownership, relationship-runtime truth/write APIs, and visible UI behavior stay unchanged.
53. Contacts profile-header display read-model governance is extracted. `src/composables/useContactsProfileHeaderModel.js` now owns selected-profile header avatar URL, eyebrow/name/meta/bio copy, empty state, NPC detection, and NPC upgrade hint copy. This is architecture cleanup only: profile editing, NPC upgrade execution, Chat Directory binding ownership, avatar asset resolution, relationship-runtime truth/write APIs, and visible UI behavior stay unchanged.
54. Contacts profile-template editor display read-model governance is extracted. `src/composables/useContactsProfileTemplateEditorModel.js` now owns profile-template editor draft template reads, applicable field rows, save-review facts, preserved custom-field rows, empty copy, helper/placeholder/type/icon copy, and tag previews. This is architecture cleanup only: profile-template saves, AI draft/adaptation actions, profile-value serialization, Chat Directory binding ownership, relationship-runtime truth/write APIs, and visible UI behavior stay unchanged.

Still incomplete:

1. legacy Chat-side relationship compatibility fields still need continued semantic containment.
2. WorldBook template authoring remains a compact V1 baseline, not a full form-builder or onboarding flow.
3. deeper World Hub review quality continues under roadmap 4.3.
4. High-impact relationship automation is still deferred; Round 4 only adds helper-level hard-gating behavior and low-impact audit metadata.
5. Incoming generated Chat social events are not authored here. Contacts displays the current social-channel snapshot for a role, while Chat owns the applied communication state, Event Runtime/World Hub own generated-event review, and relationship runtime owns confirmed relationship continuity.

## 2. Recommended Next Slice

1. Move to 4.3 World Hub review quality before adding stronger controls.
2. Keep watching Chat-side legacy relationship compatibility fields so they do not grow back into relationship truth.
3. Continue from the V1 WorldBook/Contacts profile-template baseline by making current-world template adaptation easier to understand: first turn the review into a user-readable visual diff, then revisit richer template editing and eventual form-builder-quality WorldBook authoring.
4. Continue polishing the Contacts display-only social snapshot so it remains clear, read-only, and separate from relationship metrics or memory truth.
5. For architecture cleanup, do not repeat the already extracted home-list search/grouping, memory-list/source-filter, memory-detail/source-audit, linked-activity, Role Hub, world-field/template-adaptation display, danger-zone display, detail-section display, profile-header display, or profile-template editor display seams. The next Contacts product lane should be the template-adaptation visual diff, or move architecture cleanup to WorldBook/Home.

For cross-device continuation of the WorldBook -> Contacts profile-field line, start from `docs/superpowers/plans/2026-06-03-worldbook-contacts-profile-fields-handoff.md`. Keep `docs/superpowers/plans/2026-06-02-worldbook-contacts-profile-fields-next-plan.md` as the original execution plan and completed-task record.

Concrete next task for this line:

1. First deliver the Contacts template-adaptation visual diff described in the 2026-06-03 handoff.
2. Then replace the Contacts-side `default_world` assumption with the real current-world ID after WorldBook current-world state is stable.
3. Then add stronger AI adaptation empty/failure states.
4. Leave WorldBook form-builder-quality template authoring for a later slice unless product direction changes.

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
- `npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js`: pass on 2026-06-02 for the WorldBook Profile Templates -> Contacts handoff.
- `npm.cmd run test -- tests/contacts-profile-template-view.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js`: pass on 2026-06-02 for Contacts World profile fields authoring V1.
- `npm.cmd run lint`: pass on 2026-06-02 after the Contacts phone-like entry refactor.
- `npm.cmd run test`: pass
- `npm.cmd run build`: pass on 2026-06-02 after the Contacts phone-like entry refactor; Vite still reports the pre-existing mixed static/dynamic import warning for `src/lib/push.js`.
- Manual Playwright phone-viewport check on 2026-06-02: pass for WorldBook Profile Templates -> Contacts focused handoff -> create role profile -> edit `世界字段 / World profile fields` -> save and display. Checked no page errors, no horizontal overflow, and no page-level mojibake in the simulated 390px phone viewport.
- `npm.cmd run test:e2e`: 14 passed on 2026-06-02 after the WorldBook Profile Templates -> Contacts handoff and Contacts World profile fields authoring V1.
- `npm.cmd run test -- tests/contacts-profile-template-view.test.js`: pass on 2026-06-02 for the Contacts phone-like first screen, search filtering, My Profile placement, and Recent interactions shortcut layer.
- `npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js`: pass on 2026-06-02 after the Contacts phone-like entry refactor; 6 files / 32 tests.
- `npm.cmd run test:e2e -- e2e/contacts-phone-ui.spec.js --project=mobile-chrome`: pass on 2026-06-02 for the simulated phone Contacts entry, recent shortcut navigation, search filtering, and no horizontal overflow.
- `npm.cmd run test -- tests/contacts-profile-template-view.test.js tests/profile-template-schema.test.js`: pass on 2026-06-03 for stable world-field type controls and tag-value saving; 2 files / 15 tests.
- `npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js`: pass on 2026-06-03 after the world-field type-control slice; 6 files / 33 tests.
- `npm.cmd run lint`: pass on 2026-06-03 after the world-field type-control slice.
- `npm.cmd run build`: pass on 2026-06-03 after the world-field type-control slice; Vite still reports the pre-existing mixed static/dynamic import warning for `src/lib/push.js`.
- Manual Playwright phone-viewport check on 2026-06-03: pass for Contacts world-field type controls with no horizontal overflow in the simulated 390px phone viewport.
- `npm.cmd run test -- tests/contacts-profile-template-view.test.js`: pass on 2026-06-03 for template-change review and preserved custom fields; 11 tests.
- `npm.cmd run test -- tests/contacts-profile-template-view.test.js tests/contacts-profile-entities-store.test.js`: pass on 2026-06-03 after template-change review; 2 files / 16 tests.
- `npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js`: pass on 2026-06-03 after template-change review; 6 files / 34 tests.
- `npm.cmd run lint`: pass on 2026-06-03 after template-change review.
- `npm.cmd run build`: pass on 2026-06-03 after template-change review; Vite still reports the pre-existing mixed static/dynamic import warning for `src/lib/push.js`.
- Manual Playwright phone-viewport check on 2026-06-03: pass for Contacts template-change review with no horizontal overflow in the simulated 390px phone viewport.
- `npm.cmd run test -- tests/profile-template-value-assistant.test.js`: pass on 2026-06-03 for AI draft prompt building, JSON normalization, and parse-failure handling; 4 tests.
- `npm.cmd run test -- tests/profile-template-value-assistant.test.js tests/contacts-profile-template-view.test.js`: pass on 2026-06-03 for AI-assisted draft filling without saving or overwriting manual values; 2 files / 16 tests.
- `npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js tests/profile-template-value-assistant.test.js`: pass on 2026-06-03 after AI-assisted draft completion; 7 files / 39 tests.
- `npm.cmd run lint`: pass on 2026-06-03 after AI-assisted draft completion.
- `npm.cmd run build`: pass on 2026-06-03 after AI-assisted draft completion; Vite still reports the pre-existing mixed static/dynamic import warning for `src/lib/push.js`.
- Manual Playwright phone-viewport check on 2026-06-03: pass for the Contacts AI draft button layout with no horizontal overflow in the simulated 390px phone viewport.
- `npm.cmd run test -- tests/profile-template-adaptation-assistant.test.js`: pass on 2026-06-03 for current-world template mismatch detection, version detection, prompt construction, and target-field-only normalization; 4 tests.
- `npm.cmd run test -- tests/profile-template-adaptation-assistant.test.js tests/contacts-profile-template-view.test.js`: pass on 2026-06-03 for Contacts-side AI template adaptation draft behavior without saving until the user confirms; 2 files / 17 tests.
- `npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js tests/profile-template-value-assistant.test.js tests/profile-template-adaptation-assistant.test.js`: pass on 2026-06-03 after Contacts current-world template adaptation; 8 files / 44 tests.
- Manual Playwright phone-viewport check on 2026-06-03: pass for the Contacts template-adaptation review card at 390px with no horizontal overflow and no page/console errors.
- `npm.cmd run test:e2e -- e2e/worldbook-contacts-profile-fields.spec.js`: pass on 2026-06-03 for the committed WorldBook -> Contacts value-flow guardrail; 2 tests across desktop Chromium and mobile Chromium.
- `npm.cmd run test:e2e`: pass on 2026-06-03 after adding the WorldBook -> Contacts value-flow guardrail; 18 tests across desktop Chromium and mobile Chromium.
- `npm.cmd run test -- tests/contacts-home-list-model.test.js tests/contacts-profile-template-view.test.js tests/contacts-social-channel-snapshot.test.js tests/contacts-chat-directory-boundary-copy.test.js`: pass on 2026-06-20 for the Contacts home-list read-model extraction; 4 files / 22 tests.
- `npm.cmd run lint`: pass on 2026-06-20 after the Contacts home-list read-model extraction.
- `npm.cmd run test`: pass on 2026-06-20 after the Contacts home-list read-model extraction; 159 files / 996 tests.
- `npm.cmd run build`: pass on 2026-06-20 after the Contacts home-list read-model extraction.
- `npm.cmd run test -- tests/contacts-memory-list-model.test.js tests/contacts-home-list-model.test.js tests/contacts-profile-template-view.test.js tests/contacts-social-channel-snapshot.test.js tests/contacts-chat-directory-boundary-copy.test.js tests/contacts-detail-danger-flows.test.js`: pass on 2026-06-20 for the Contacts memory-list read-model extraction; 6 files / 39 tests.
- `npm.cmd run lint`: pass on 2026-06-20 after the Contacts memory-list read-model extraction.
- `npm.cmd run test`: pass on 2026-06-20 after the Contacts memory-list read-model extraction; 160 files / 1001 tests.
- `npm.cmd run build`: pass on 2026-06-20 after the Contacts memory-list read-model extraction.
- `npm.cmd run test -- tests/contacts-memory-detail-model.test.js tests/contacts-memory-list-model.test.js tests/contacts-detail-danger-flows.test.js`: pass on 2026-06-20 for the Contacts memory-detail read-model extraction; 3 files / 21 tests.
- `npm.cmd run lint`: pass on 2026-06-20 after the Contacts memory-detail read-model extraction.
- `npm.cmd run test`: pass on 2026-06-20 after the Contacts memory-detail read-model extraction; 161 files / 1005 tests.
- `npm.cmd run build`: pass on 2026-06-20 after the Contacts memory-detail read-model extraction.
- `npm.cmd run test -- tests/contacts-linked-activity-model.test.js tests/contacts-memory-detail-model.test.js tests/contacts-detail-danger-flows.test.js`: pass on 2026-06-20 for the Contacts linked-activity read-model extraction; 3 files / 21 tests.
- `npm.cmd run lint`: pass on 2026-06-20 after the Contacts linked-activity read-model extraction.
- `npm.cmd run test`: pass on 2026-06-20 after the Contacts linked-activity read-model extraction; 162 files / 1010 tests.
- `npm.cmd run build`: pass on 2026-06-20 after the Contacts linked-activity read-model extraction.
- `npm.cmd run test -- tests/contacts-role-hub-model.test.js tests/contacts-linked-activity-model.test.js tests/contacts-memory-detail-model.test.js`: pass on 2026-06-20 for the Contacts Role Hub read-model extraction; 3 files / 13 tests.
- `npm.cmd run lint`: pass on 2026-06-20 after the Contacts Role Hub read-model extraction.
- `npm.cmd run test`: pass on 2026-06-20 after the Contacts Role Hub read-model extraction; 163 files / 1014 tests.
- `npm.cmd run build`: pass on 2026-06-20 after the Contacts Role Hub read-model extraction.
- `npm.cmd run test -- tests/contacts-world-field-model.test.js tests/contacts-profile-template-view.test.js tests/profile-template-adaptation-assistant.test.js`: pass on 2026-06-20 for the Contacts world-field/template-adaptation display read-model extraction; 3 files / 22 tests.
- `npm.cmd run lint`: pass on 2026-06-20 after the Contacts world-field/template-adaptation display read-model extraction.
- `npm.cmd run test`: pass on 2026-06-20 after the Contacts world-field/template-adaptation display read-model extraction; 164 files / 1018 tests.
- `npm.cmd run build`: pass on 2026-06-20 after the Contacts world-field/template-adaptation display read-model extraction.
- `npm.cmd run test -- tests/contacts-danger-zone-model.test.js tests/contacts-detail-danger-flows.test.js tests/contacts-relationship-actions.test.js`: pass on 2026-06-21 for the Contacts danger-zone display read-model extraction; 3 files / 22 tests.
- `npm.cmd run lint`: pass on 2026-06-21 after the Contacts danger-zone display read-model extraction.
- `npm.cmd run test`: pass on 2026-06-21 after the Contacts danger-zone display read-model extraction; 165 files / 1022 tests.
- `npm.cmd run build`: pass on 2026-06-21 after the Contacts danger-zone display read-model extraction.
- `npm.cmd run test -- tests/contacts-detail-section-model.test.js tests/contacts-detail-danger-flows.test.js tests/contacts-profile-template-view.test.js tests/contacts-role-hub-model.test.js tests/contacts-linked-activity-model.test.js`: pass on 2026-06-21 for the Contacts detail-section display read-model extraction; 5 files / 40 tests.
- `npm.cmd run lint`: pass on 2026-06-21 after the Contacts detail-section display read-model extraction.
- `npm.cmd run test`: pass on 2026-06-21 after the Contacts detail-section display read-model extraction; 166 files / 1027 tests.
- `npm.cmd run build`: pass on 2026-06-21 after the Contacts detail-section display read-model extraction.
- `npm.cmd run test -- tests/contacts-profile-header-model.test.js tests/contacts-profile-template-view.test.js tests/contacts-role-hub-model.test.js`: pass on 2026-06-21 for the Contacts profile-header display read-model extraction; 3 files / 22 tests.
- `npm.cmd run test -- tests/contacts-profile-header-model.test.js tests/contacts-detail-section-model.test.js tests/contacts-profile-template-view.test.js tests/contacts-role-hub-model.test.js`: pass on 2026-06-21 for the Contacts profile-header display read-model extraction; 4 files / 27 tests.
- `npm.cmd run lint`: pass on 2026-06-21 after the Contacts profile-header display read-model extraction. A parallel lint/test run first hit a transient missing Vite timestamp module, then the standalone lint rerun passed.
- `npm.cmd run test`: pass on 2026-06-21 after the Contacts profile-header display read-model extraction; 167 files / 1031 tests.
- `npm.cmd run build`: pass on 2026-06-21 after the Contacts profile-header display read-model extraction.
- `npm.cmd run test -- tests/contacts-profile-template-editor-model.test.js tests/contacts-profile-template-view.test.js tests/contacts-world-field-model.test.js`: pass on 2026-06-21 for the Contacts profile-template editor display read-model extraction; 3 files / 22 tests.
- `npm.cmd run lint`: pass on 2026-06-21 after the Contacts profile-template editor display read-model extraction.
- `npm.cmd run test`: pass on 2026-06-21 after the Contacts profile-template editor display read-model extraction; 168 files / 1035 tests.
- `npm.cmd run build`: pass on 2026-06-21 after the Contacts profile-template editor display read-model extraction.

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
