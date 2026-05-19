# Contacts Relationship System V2 Package

Updated: 2026-05-19

Use this package for work touching Contacts, Chat Directory boundary, role identity, relationship reset/delete, one-memory delete, role detail IA, or World Hub cleanup semantics tied to one role.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `DESTRUCTIVE_ACTIONS.md`
4. `ROLE_HUB_INFORMATION_ARCHITECTURE.md`
5. `IMPLEMENTATION_WORKSTREAMS.md`
6. `ROLE_PROFILE_TEMPLATE_DECISION_LOG.md` when the task touches WorldBook-driven profile templates, Self Profile, NPC, or NPC -> Main Role upgrade

Also read these when needed:

- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
- `docs/architecture/ROLE_BINDING_CONTRACT.md`

Formal specs for the next profile-template design:

- `docs/superpowers/specs/2026-05-19-role-profile-template-index.md`
- `docs/superpowers/specs/2026-05-19-worldbook-role-profile-templates-design.md`
- `docs/superpowers/specs/2026-05-19-contacts-profile-entities-design.md`

Executable plan for that design:

- `docs/superpowers/plans/2026-05-19-worldbook-contacts-profile-template-plan.md`

## Fast Product Meaning

- `Contacts` owns the global role archive, visible role ID, and role-centered destructive actions.
- `Chat Directory` owns Chat-side binding and service-account entry management only.
- `Chat` owns conversations, messages, and manual chat-message deletion.
- `Relationship Runtime` owns relationship progress and memory groups.
- `World Hub` is an optional review and cleanup surface, not the main role-authoring page.
- `WorldBook` should define profile-template rules; `Contacts` should store concrete profile values.
