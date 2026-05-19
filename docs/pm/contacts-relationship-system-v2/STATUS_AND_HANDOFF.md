# Contacts Relationship System V2 Status And Handoff

Updated: 2026-05-19

This file is the handoff page for anyone continuing Contacts, role, relationship, or memory-management work.

## 1. Current Status

Status: `PARTIAL_DONE`

What is already landed:

1. visible `roleId` validation, duplicate checks, and backup/restore migration baseline;
2. clearer boundary between Contacts, Chat Directory, Chat, relationship runtime, and World Hub;
3. relationship runtime memory-group APIs, source-record cleanup metadata, and recompute flow;
4. Contacts delete-role, reset-relationship, and delete-one-memory-group flows with impact summaries and typed confirmation;
5. cleanup handlers and linked-fact cleanup for Calendar, Phone, Wallet, Shopping, Food Delivery, and Map;
6. World Hub cleanup entry for relationship reset and one-memory cleanup without deleting the role profile.
7. Contacts detail baseline now shows manual vs event-attached item counts, source chips, and locked-event explanations in role detail sections.
8. Contacts V2 detail IA and WorldBook-driven role-profile-template decisions are recorded in `ROLE_PROFILE_TEMPLATE_DECISION_LOG.md`; formal specs now exist under `docs/superpowers/specs/`, and the execution plan exists at `docs/superpowers/plans/2026-05-19-worldbook-contacts-profile-template-plan.md`.

Still incomplete:

1. Contacts detail information architecture still needs a more product-grade role page;
2. manual entries and event-attached entries have a baseline visual split, but still need stronger product-grade polish and richer linked-activity summaries;
3. preferences, life-pattern, social-graph, and long-term memory controls are not yet complete;
4. legacy Chat-side relationship compatibility fields still need continued semantic containment.
5. WorldBook role-profile templates, Self Profile, NPC profiles, NPC -> Main Role upgrade, and template-driven Contacts extensible sections are designed but not implemented.

## 2. Recommended Next Slice

1. Continue polishing Contacts detail page IA into a real role hub: overview, Chat-bound state, linked activity summary, and clearer navigation.
2. Expand preferences, life-pattern, and social-graph controls beyond the current baseline add/list/delete behavior.
3. Tighten text-first memory dedupe/merge rules and the Calendar memory-review experience after the IA is clearer.
4. Execute `docs/superpowers/plans/2026-05-19-worldbook-contacts-profile-template-plan.md` when the user is ready to move from planning into implementation.

## 3. Do Not Do

1. Do not move ordinary chat-message deletion into Contacts.
2. Do not present `profileId` or `entityKey` as if they were the user-facing `roleId`.
3. Do not let Chat Directory own destructive role delete or relationship reset.
4. Do not let `relationshipLevel` or `relationshipNote` become the live relationship truth again.
5. Do not delete only the memory summary while leaving linked source records and runtime facts alive.
6. Do not implement WorldBook-driven profile templates directly from the decision log; use the formal specs and the implementation plan after review.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `DESTRUCTIVE_ACTIONS.md` when delete/reset semantics changed
5. `ROLE_HUB_INFORMATION_ARCHITECTURE.md` when detail-page structure changed
6. `IMPLEMENTATION_WORKSTREAMS.md` when the next recommended slice changed
7. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when runtime meaning changed
8. `docs/architecture/ROLE_BINDING_CONTRACT.md` when field semantics or binding meaning changed
