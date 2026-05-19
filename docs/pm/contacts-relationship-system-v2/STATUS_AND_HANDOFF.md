# Contacts Relationship System V2 Status And Handoff

Updated: 2026-05-19

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

Still incomplete:

1. text-first dedupe/merge and recall cleanup still belong to the next 4.2 workstream, not this completed 4.1 lane;
2. legacy Chat-side relationship compatibility fields still need continued semantic containment.
3. WorldBook template authoring remains a compact V1 baseline, not a full form-builder or onboarding flow.

## 2. Recommended Next Slice

1. Move to 4.2 text-first memory dedupe/merge and recall cleanup now that Contacts memory review and lifecycle controls exist.
2. Keep watching Chat-side legacy relationship compatibility fields so they do not grow back into relationship truth.
3. Continue from the V1 WorldBook/Contacts profile-template baseline by improving template editing and profile-value authoring ergonomics.

## 3. Do Not Do

1. Do not move ordinary chat-message deletion into Contacts.
2. Do not present `profileId` or `entityKey` as if they were the user-facing `roleId`.
3. Do not let Chat Directory own destructive role delete or relationship reset.
4. Do not let `relationshipLevel` or `relationshipNote` become the live relationship truth again.
5. Do not delete only the memory summary while leaving linked source records and runtime facts alive.
6. Do not implement WorldBook-driven profile templates directly from the decision log; use the formal specs and the implementation plan after review.

## 4. Validation

- `npm.cmd test -- tests/contacts-profile-template-view.test.js tests/contacts-detail-danger-flows.test.js tests/contacts-chat-directory-boundary-copy.test.js tests/contacts-wallet-ledger-context.test.js`: pass
- `npm.cmd test -- tests/contacts-detail-danger-flows.test.js tests/contacts-profile-template-view.test.js tests/contacts-chat-directory-boundary-copy.test.js tests/contacts-wallet-ledger-context.test.js tests/contacts-relationship-actions.test.js tests/contacts-profile-entities-store.test.js`: pass
- `npm.cmd test -- tests/relationship-runtime-store.test.js tests/contacts-detail-danger-flows.test.js tests/chat-store-model.test.js`: pass
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
