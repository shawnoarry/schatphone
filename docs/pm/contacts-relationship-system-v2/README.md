# Contacts Relationship System V2 Package

Updated: 2026-06-03

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

Current cross-device handoff and next plan:

- `docs/superpowers/plans/2026-06-02-worldbook-contacts-profile-fields-next-plan.md`

## Fast Product Meaning

- `Contacts` owns the global role archive, visible role ID, and role-centered destructive actions.
- `Contacts` role profiles now own profile-side relationship premise/classification fields: free-text label, label note, initial seed values, stored primary category, modifiers, confidence/source/timestamp, and explanation.
- Contacts detail is now the role control page for this classification slice: it shows the read-only current relationship runtime snapshot first, then lets the user edit profile-side relationship premise, seed values, category, modifiers, and classification audit below it.
- Relationship-label AI classification goes through `src/lib/ai.js` and shared JSON parsing; high confidence is saved as `ai_auto`, medium/low confidence requires confirmation before `ai_confirmed`, and `user_edited` classifications are protected from silent AI or world-template overwrite.
- Event/runtime consumes saved category/modifier classification fields for gate decisions and audit metadata. It must not read `relationshipLabelText` or `relationshipLabelNote` as event conditions.
- `Chat Directory` owns Chat-side binding and service-account entry management only.
- Chat Directory may preserve legacy `relationshipLevel` / `relationshipNote` as Chat-local tuning/note compatibility fields, but must not label them as current affinity or relationship progress.
- `Chat` owns conversations, messages, and manual chat-message deletion.
- `Relationship Runtime` owns relationship progress and memory groups.
- Relationship runtime remains the owner of current metrics, stage, milestones, and memories; profile-side classification is saved context, not current relationship truth.
- Relationship runtime summary counts are canonical: `totalMemoryCount`, `visibleMemoryCount`, and `archivedMemoryCount` describe the full target state even when the caller requests only a small memory-summary list.
- Chat social events such as message requests, blocks, and being-blocked states may be displayed in Contacts as role-level reachability/status snapshots, but Contacts must not judge eligibility or apply generated outcomes. Chat owns the applied channel state, Event Runtime and World Hub own generated-event review/audit, and relationship runtime owns confirmed relationship facts or memories.
- `World Hub` is an optional review and cleanup surface, not the main role-authoring page.
- `WorldBook` should define profile-template rules; `Contacts` should store concrete profile values.
- Contacts world-field editing now uses stable field-type controls, so different worldview templates can show different field content while the UI stays predictable: single choice, long notes, comma-separated tags, and person/role reference fields each get their own copy and input behavior.
- Contacts world-field editing now reviews template changes before saving: fields in the chosen template are updated, while old fields outside the chosen template stay visible as custom fields unless the user cleans them up separately.
- Contacts world-field editing now has AI draft assistance: AI can suggest values for empty template fields inside the editor draft, but it skips existing/manual values and nothing is saved until the user reviews and presses Save.
- Contacts now detects when a role profile is using an unavailable, older-version, or other-world template and offers a current-world adaptation review. AI can draft migrated values into the editor, but the old values stay preserved as custom fields and nothing changes until the user saves.
- WorldBook's Profile Templates panel may link users into Contacts, and Contacts shows a focused handoff note for that entry path; concrete role, self-profile, and NPC values remain Contacts-owned.
- Contacts role detail now has a V1 `世界字段 / World profile fields` editor: users can choose a current-world template, fill concrete values, set visibility levels, and save those values back to the role profile without editing the WorldBook template itself.
- Contacts entity types now include Self Profile, Main Role, and NPC. Chat Directory is a chat target list, not a Main Role filter; Self Profile must not be bound as a Chat target, and NPC can be bound before upgrade.
- Contacts first opens like a phone contact list: Search, My Profile, Recent interactions, Main Roles, and NPC / World Roles. Recent interactions is only a shortcut layer; it does not remove roles/NPCs from the complete lists.
- Relationship memory 4.2 currently treats explicit source-id lineage as the safe merge boundary: Phone callbacks, Shopping/Food order support, Map route follow-ups, and confirmed Calendar follow-ups should enrich one shared memory instead of creating competing top-level memories.
