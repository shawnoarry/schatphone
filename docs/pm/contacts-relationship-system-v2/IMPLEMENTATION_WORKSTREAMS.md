# Contacts Relationship V2 And Identity Core V3 Workstreams / 通讯录关系 V2 与身份核心 V3 实施工作流

Updated: 2026-08-27

This document translates the Contacts/relationship package into execution-ready workstreams.

## Contacts V3 Accepted Next Lane

Contacts V2 and relationship-memory 4.2 remain complete at their named acceptance. Contacts V3 Identity And Role Core is now active from `CONTACTS_V3_IDENTITY_AND_ROLE_CORE_PLAN.md`.

Implementation order:

1. `CONTACTS-V3-0 DONE 2026-08-27`: the per-world Self Profile decision, current ownership map, migration inventory, compatibility Adapter, stable-ID/revision rules, rollback, and first implementation file set are frozen in `CONTACTS_V3_0_ARCHITECTURE_AND_DECISION_FREEZE.md`;
2. `CONTACTS-V3-1 DONE 2026-08-27`: Contacts now owns profile normalization, immutable reads, revision-safe writes, detail/classification/assets, NPC upgrade, removal, snapshot replacement, and persistence copies while Chat retains the current carrier and compatibility methods;
3. `CONTACTS-V3-2A ACTIVE / CARD-1 DONE 2026-08-27 / ROLE-0 DECISION_DONE 2026-08-27 / ROLE-1 DONE 2026-08-27 / CARD-2 DONE 2026-08-27 / CARD-3 DONE 2026-08-27 / CARD-4 DONE 2026-08-27 / CARD-5 DONE 2026-08-27 / CARD-6 DONE 2026-08-27 / PERSONA-1 NEXT`: the category carrier, four-person-type baseline, field-purpose rules, added input types, manual WorldBook category/field editing, read-first dynamic person-page form, Contacts-owned person-specific extensions, and reviewable current-world template proposals are landed locally; next classify pasted persona text into the same review-only card draft;
4. `CONTACTS-V3-2B`: add Persona Confirmation for structured manual input and optional AI drafting, with explicit user confirmation and stale/write-failure handling;
5. `CONTACTS-V3-3`: deepen formal Chat, Event Runtime, and Work Hub purpose-specific projections;
6. `CONTACTS-V3-4`: concentrate create/update/archive/restore/NPC-upgrade/delete behavior in the Role Lifecycle Module;
7. `CONTACTS-V3-5`: migrate consumers while preserving Contacts V2, Chat history, relationship truth, and backup/restore behavior.

The documentation/inventory round, owner foundation, category carrier, Supporting Role compatibility baseline, field-purpose rules, added input types, manual WorldBook form editor, dynamic person page, person-specific extension path, and deterministic/optional-AI current-world proposal flow are complete. The next slice follows `CONTACTS_V3_2A_EXTENSIBLE_PROFILE_CARD_DESIGN.md` and classifies pasted persona text into review-only field candidates while preserving conflicts and unclassified text. It must not infer importance for old NPCs, move `roleProfiles` to a second persisted Store, change the complete-backup shape, silently save AI output, automatically change confirmed identities, or migrate downstream consumers.

## 1. Workstream A: Data Model And Ownership

Objective:

- make role identity, chat binding, relationship runtime, and memory groups impossible to confuse.

Main tasks:

1. keep visible `roleId` in role profile and preserve duplicate validation;
2. keep `profileId` as internal profile key only;
3. keep `entityKey` as runtime key only;
4. make memory-group APIs first-class in relationship runtime;
5. keep source-record cleanup metadata stable and explainable;
6. explicitly classify `relationshipLevel` and `relationshipNote` as:
   - legacy compatibility fields; or
   - chat-side manual annotation fields only.
7. keep profile-side relationship premise/classification fields on role profiles, separate from relationship runtime current values.
8. keep the AI classification seam limited to `src/lib/ai.js`, shared JSON parsing, registry normalization, and confidence/save-policy output.
9. keep Contacts relationship classification controls as profile-side editing only: runtime snapshot is read first, while event judgement remains outside Contacts.
10. allow Contacts to read/display Chat social-channel snapshots only; do not let Contacts decide or apply friend/block/refusal social events.
11. keep stable structured Self Profile identity available through the landed bounded profile/world/revision projection; Contacts V3 may add a user-confirmed persona intake Module and further purpose-specific projections, but must keep volatile player/world state and publication records outside Contacts.
12. keep the current Chat disclosure seam role-scoped and supporting-only: Chat supplies one explicit user-authored message source, the shared Relationship Adapter normalizes it, and Relationship Runtime remains the owner of memory aggregation and review state.

Semantic traps to avoid:

- showing `profileId` or `entityKey` as if they were `roleId`;
- reading Chat-side compatibility fields as the live relationship truth;
- reading raw relationship premise prose as an event condition instead of stored classification fields;
- allowing AI, confirmed AI, or world-template writes to silently overwrite a `user_edited` classification;
- treating Chat social-channel state as relationship truth or as a Contacts-authored event outcome;
- using unconfirmed free-text Self Profile prose or model classification as canonical occupation/event eligibility;
- forcing users to duplicate confirmed persona identity in Chat, Work Hub, Event settings, or another App instead of consuming a Contacts projection;
- moving role-profile storage before stable IDs, Chat binding, backup/restore, receiving-account definitions, cleanup, and rollback are migration-protected;
- turning Contacts into the owner of reputation, media heat, fatigue, world arcs, or forum/news posts;
- letting one event create several competing memories.
- treating a saved message, assistant reply, or ordinary Chat history as an accepted role-memory fact without the explicit disclosure action.

## 2. Workstream B: Delete / Reset / Memory Cleanup Orchestration

Objective:

- make destructive actions safe, explainable, and complete.

Main tasks:

1. hard delete orchestrator for role profile;
2. relationship reset orchestrator;
3. single memory-group delete orchestrator;
4. shared cleanup handlers for module-owned records;
5. impact-summary generation for dialogs;
6. recompute relationship state after memory deletion.

Semantic traps to avoid:

- deleting role archive without clearing relationship runtime;
- deleting memory summary only while leaving source records behind;
- auto-deleting ordinary free-text chat content during memory deletion.

## 3. Workstream C: Contacts Detail IA And Presentation

Objective:

- make Contacts feel like a role hub instead of a thin card list.

Current landed baseline:

- role detail starts with a Role Hub summary for entity type, Chat-bound state, manual/event-attached counts, WorldBook field count, memory count, and linked activity sources;
- role detail sections show manual and event-attached counts;
- role detail sections group manual and event-attached items separately;
- each item exposes a source chip and short source hint;
- event-attached entries are visibly locked from direct deletion and point users to memory deletion or relationship reset;
- event-attached entries with a memory key can open the linked memory detail directly;
- memory detail now exposes source-audit cards and supporting-event drill-down without moving source-record ownership away from the source modules;
- manual detail items now support inline editing, and linked activity expands into a source-aware event-attached list.
- the memory list now supports basic source filtering, sort mode, and selected-memory headline facts.
- memory lifecycle review is now user-manageable through `Pinned / Active / Archived` plus a review note.
- Contacts memory filtering now evaluates the full sorted runtime list before applying the visible-item cap, so source-filtered audit work does not lose off-screen matches.
- World Hub now mirrors primary memory lifecycle state and review note for the top shared memory summary instead of hiding that management signal inside Contacts only.
- runtime summary snapshots now provide canonical `primaryMemory`, memory-count totals, archive-only state, and source summary fields so Contacts/World Hub no longer need to rebuild those semantics separately.
- runtime memory-count totals are computed before applying the display-list cap, so summary callers can request a short list without losing full `totalMemoryCount`, `visibleMemoryCount`, or `archivedMemoryCount`.
- linked-activity source totals now dedupe runtime source refs against event-attached detail refs before counting, preventing one shared event from appearing as several source records.
- relationship classification Round 3 adds the role-control relationship surface: Contacts detail shows the current runtime snapshot first, then edits the profile-side relationship premise, seed values, category, modifier tags, classification audit, AI classify, confirmation, and manual save flows.
- Contacts Role Hub summary now includes a read-only Chat social-channel snapshot so users can understand communication reachability without editing Chat state from Contacts.
- Contacts World profile fields now support V1 concrete value authoring from WorldBook templates: choose a current-world template, fill role/self/NPC values, set visibility levels, and save `templateLink/profileValues` on the role profile.
- Contacts World profile fields now include AI draft assistance for empty editor fields only; the AI helper normalizes provider JSON against the chosen template and never saves or overwrites manual values without the user's Save action.
- Contacts World profile fields now include a current-world adaptation review for profiles using missing, outdated, or other-world templates. The review recommends a current-world template, shows reusable/custom-preserved counts, and can open the editor with AI-migrated draft values without saving.
- Contacts person-page profile data now renders by template category in a default reading state, expands only saved values, and uses natural-language missing-data prompts instead of completion fractions. An explicit Edit action opens the complete grouped form; old flat templates and custom values remain readable without a new route or second profile format.
- Contacts person-page editing now adds person-specific categories/fields through the same grouped card. Draft cancellation is side-effect free; `profileExtensions` stays inside the Contacts owner/storage/backup path; person-only data is isolated; and explicit world-template promotion creates one template version without auto-filling other people.
- The WorldBook -> Contacts value-flow now has committed E2E coverage, so future work should not rebuild the basic handoff/value chain unless the product flow changes.
- Contacts first entry now feels like a phone contact list: Search -> My Profile -> Recent interactions -> Main Roles -> NPC / World Roles. Recent interactions is a shortcut layer and keeps full list membership intact.
- Contacts first-entry search/grouping/recent-interaction logic now lives behind `src/composables/useContactsHomeListModel.js`, so future architecture cleanup should not repeat that home-list seam.
- Contacts selected-profile memory-list/source-filter/count-copy logic now lives behind `src/composables/useContactsMemoryListModel.js`, so future architecture cleanup should not repeat that memory-list seam.
- Contacts selected-memory source-audit/timeline/headline-facts logic now lives behind `src/composables/useContactsMemoryDetailModel.js`, so future architecture cleanup should not repeat that memory-detail seam.
- Contacts linked-activity summary/list row logic now lives behind `src/composables/useContactsLinkedActivityModel.js`, so future architecture cleanup should not repeat that linked-activity seam.
- Contacts Role Hub summary-card and read-only Chat social snapshot logic now lives behind `src/composables/useContactsRoleHubModel.js`, so future architecture cleanup should not repeat that Role Hub seam.
- Contacts world-field/template-adaptation display logic now lives behind `src/composables/useContactsWorldFieldModel.js`, so future architecture cleanup should not repeat that world-field display seam.
- Contacts danger-zone impact/confirmation/memory-delete safety copy now lives behind `src/composables/useContactsDangerZoneModel.js`, so future architecture cleanup should not repeat that danger-zone display seam.
- Contacts Preferences / Life Pattern / Social Graph section metadata, manual/event-attached grouping, counts, policy copy, and source labels/hints now live behind `src/composables/useContactsDetailSectionModel.js`, so future architecture cleanup should not repeat that detail-section display seam.
- Contacts selected-profile header avatar/name/meta/bio/NPC-upgrade display state now lives behind `src/composables/useContactsProfileHeaderModel.js`, so future architecture cleanup should not repeat that profile-header display seam.
- Contacts profile-template editor field rows, save-review facts, preserved custom-field rows, helper/placeholder/type/icon copy, empty copy, and tag previews now live behind `src/composables/useContactsProfileTemplateEditorModel.js`, so future architecture cleanup should not repeat that profile-template editor display seam.

Main tasks:

1. deepen role detail page sections and hierarchy below the Role Hub summary;
2. readable role ID presentation;
3. richer memory list and memory detail behavior;
4. after this completed baseline, move deeper memory dedupe/merge and recall rules into Workstream 4.2 instead of extending 4.1 further;
5. richer Chat-bound state and navigation hints;
6. keep danger-zone action semantics guarded while future UI polish avoids changing delete/reset execution;
7. continue from the landed dynamic profile card, person-extension path, and current-world proposal flow with `PERSONA-1`: classify pasted text into existing-field candidates, explicit new-field suggestions, conflicts, and retained unclassified text without saving.
8. later true-device polish for Contacts touch feel and detail-panel progressive disclosure.
9. for architecture-only cleanup, either move to Contacts template-adaptation visual diff or shift to WorldBook/Home seams while preserving delete/reset, review-status writes, profile-template writes, AI draft actions, and relationship-runtime ownership.

Semantic traps to avoid:

- blending normal edit actions with destructive actions;
- making event-attached items look like user-authored facts;
- hiding the Contacts vs Chat Directory distinction.
- making the editable relationship premise look like authoritative current runtime metrics or event eligibility.
- making a friend/block/refusal status display look like Contacts is judging the social event.

## 4. Workstream D: Documentation And Collaboration Guardrails

Objective:

- keep future engineers from reintroducing old semantics.

Main tasks:

1. keep this package updated when semantics change;
2. sync architecture docs when ownership changes;
3. sync PM status and roadmap when priority/status changes;
4. keep module naming aligned with `docs/pm/MODULE_NAME_GLOSSARY.md`;
5. keep this package workflow aligned with the cross-task contract in `docs/process/AI_WORK_MODE.md`; load optional skills only when the current slice needs them.
6. when relationship classification changes, sync the profile-owner vs runtime-owner boundary in README, status, product boundary, workstreams, roadmap, PM status, and relationship-growth architecture docs.
7. when Self Profile event eligibility or dynamic player/world ownership changes, sync `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md` and the Event Runtime package without adding implementation from Contacts alone.

## 5. Semantic Drift Watchlist

Additional current guardrail:

- World Hub must not fabricate `roleId` from `profileId` or `entityKey`; missing role profiles should be labeled as runtime-only or missing-profile contexts.

Treat the following as bugs or review blockers:

1. `会话通讯录` shows "亲密度" using `relationshipLevel` while runtime says something else.
2. `世界中枢` displays internal runtime keys in the place where product-facing role ID should appear.
3. `通讯录` and `会话通讯录` both expose destructive role-management actions.
4. A deleted memory still appears through linked runtime/source data.
5. Event-attached role-detail items survive after the memory that created them is gone.

## 6. Validation Baseline

Minimum validation for meaningful changes here:

- `npm run lint`
- `npm run build`
- `npm run test` when behavior, orchestration, or state logic changes

Recommended review after implementation:

- check Contacts detail page
- check Chat Directory entry behavior
- check World Hub cleanup behavior
- check one role delete flow
- check one relationship reset flow
- check one memory-group delete flow

## 7. 4.2 Closure Baseline

Current 4.2 baseline:

1. start by tightening same-life-event memory-key reuse in the runtime and adapter layer before changing Contacts or Chat presentation again;
2. preserve source-record auditability and cleanup coverage while reducing duplicate top-level memories;
3. treat Shopping gift memory plus downstream Calendar delivery follow-up as the first canonical merge case.
4. keep review ordering and memory visibility behavior aligned between runtime, Contacts, and World Hub.
5. keep `summarizeEntityForTarget()` as the canonical read contract for headline memory, archive-only hinting, and source-summary totals instead of letting UI layers infer those fields independently.
6. treat Map shared-route memory plus downstream Map-derived Calendar follow-up as the second explicit-lineage merge case when `sourceTripId` is present.
7. treat Wallet order-support facts for Shopping gifts and Food Delivery shared meals as supporting-only facts inside the upstream order memory, not as new relationship-growth memories.
8. use primary-led memory recall summaries in Chat, Contacts, and World Hub so supporting facts do not replace the original life-event headline.
9. show Calendar relationship review detail for confirmed events so users can see lineage, target, memory role, and duplicate-growth status.
10. Contacts and World Hub use product-facing related-record copy by default, while Calendar keeps source-audit review detail for confirmed-event relationship checks.
11. 4.2 is `DONE` for current explicit-lineage acceptance; future fuzzy same-text merging should start from a separate product decision.
12. runtime memory-count totals are full target-state counts, not capped by `memoryLimit`.
13. fuzzy same-text merging remains out of scope until a separate product decision promotes it.
14. explicit Chat disclosures reuse the existing memory-group seam and do not introduce a second candidate store. The new Chat AI disclosure parser is a temporary review-only seam, not a second durable store; automatic extraction, candidate review, and periodic consolidation remain separate future work.

Why this first:

- it is a real cross-module chain already present in the product;
- the user should remember "that gift/order" as one memory, not as a Shopping memory plus a second Calendar memory;
- Contacts detail and World Hub source audit already have the right surfaces to explain the merged result.
