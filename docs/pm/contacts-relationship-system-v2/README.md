# Contacts Relationship System V2 Package

Updated: 2026-08-28

Use this package for work touching Contacts, Chat Directory boundary, role identity, relationship reset/delete, one-memory delete, role detail IA, or World Hub cleanup semantics tied to one role.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `CONTACTS_V3_IDENTITY_AND_ROLE_CORE_PLAN.md` for the accepted identity-owner, persona-confirmation, projection, lifecycle, and migration direction
3. `CONTACTS_V3_4_ROLE_LIFECYCLE_DECISION_FREEZE.md` when the task touches person archive, restore, permanent delete, ID non-reuse, tombstones, receiving-account suspension/revocation, or lifecycle rollback
4. `CONTACTS_V3_0_ARCHITECTURE_AND_DECISION_FREEZE.md` for the frozen current-state inventory, per-world Self Profile decision, compatibility/rollback rules, and `CONTACTS-V3-1` file set
5. `CONTACTS_V3_2A_EXTENSIBLE_PROFILE_CARD_DESIGN.md` when the task touches extensible profile-card categories, world-generated forms, user-added fields, or free-text classification
6. `CONTACTS_V3_2C_PERSON_PROFILE_UX_ACCEPTANCE_AND_HANDOFF.md` for the current user-review path, accepted local evidence, remaining UX questions, and safe resume boundary
7. `CONTACTS_V3_2A_EXECUTION_PLAN.md` for the completed card/persona/projection record and dependent event stop lines
8. `PRODUCT_BOUNDARY.md`
9. `DESTRUCTIVE_ACTIONS.md`
10. `ROLE_HUB_INFORMATION_ARCHITECTURE.md`
11. `IMPLEMENTATION_WORKSTREAMS.md`
12. `ROLE_PROFILE_TEMPLATE_DECISION_LOG.md` when the task touches WorldBook-driven profile templates, Self Profile, Supporting Role, World NPC, or person-depth upgrade

Also read these when needed:

- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
- `docs/architecture/ROLE_BINDING_CONTRACT.md`
- `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md` when the task touches Self Profile eligibility, dynamic player state, world incidents, social/news propagation, or clues

Formal specs for the next profile-template design:

- `docs/superpowers/specs/2026-05-19-role-profile-template-index.md`
- `docs/superpowers/specs/2026-05-19-worldbook-role-profile-templates-design.md`
- `docs/superpowers/specs/2026-05-19-contacts-profile-entities-design.md`

Executable plan for that design:

- `docs/superpowers/plans/2026-05-19-worldbook-contacts-profile-template-plan.md`

Current cross-device handoff and execution record:

- Current resume entry: `docs/superpowers/plans/2026-06-03-worldbook-contacts-profile-fields-handoff.md`
- Original execution plan and completed-task record: `docs/superpowers/plans/2026-06-02-worldbook-contacts-profile-fields-next-plan.md`

## Fast Product Meaning

- `CONTACTS-V3-2C PERSON_PROFILE_UX` is locally acceptance-ready and still user-review pending. The person-first overview, direct paste/manual entry, user-language second-level editor and review, category choice for proposed fields, and representative untouched Eva/Jackie fixtures are implemented. Read `CONTACTS_V3_2C_PERSON_PROFILE_UX_ACCEPTANCE_AND_HANDOFF.md` before continuing instead of rebuilding the profile-card foundation.
- Contacts V2 remains complete at its accepted role, relationship, memory, WorldBook-field, cleanup, and Role Hub baseline. Contacts V3 is complete through profile-card construction, Persona Confirmation, approved purpose-specific projections, and V3-4A/V3-4B/V3-4C role lifecycle. Contacts now exposes one counted/searchable archived-people manager, read-only archived details, rollback-safe archive/restore with the same Wallet payee identity, and archive-only permanent deletion through grouped impact plus typed role-ID confirmation. The legacy active-person direct-delete entry is removed; V3-5 consumer adoption remains gated.
- Person archive is reversible and preserves the complete person, Chat history, relationship, memories, source lineage, and receiving-account identity while suspending new interaction/projections. Permanent deletion is archive-first, creates a minimal tombstone, reserves both profile and role IDs, revokes new payee use, and preserves immutable owner history without rebinding it to another person.
- `CONTACTS-V3-0` freezes one global device account plus one independent Self Profile per world. `CONTACTS-V3-1` now keeps `store:chat.roleProfiles` as the compatibility carrier while moving profile normalization, revision, CRUD, detail, classification, asset, NPC-upgrade, removal, hydration, and persistence-copy rules into `src/lib/contacts-profile-owner.js`.
- Contacts is now the executable owner of Self Profile, Main Role, Supporting Role, and World NPC record behavior. Chat keeps the old method names and storage envelope for compatibility, but no longer implements the profile rules itself.
- The executable baseline has four person types. Supporting Role sits between Main Role and World NPC; the legacy `npc` value remains World NPC, old NPCs are not automatically reclassified, and family/friend/colleague/etc. remain separate relationship labels.
- Profile-template fields now support date, yes/no, and organization references in addition to the original five types. Extra Chat/event/Work Hub/public uses are explicit additive markers; old fields gain none automatically, and no marker grants organization access or creates an event by itself.
- User-authored persona is an accepted identity source. Structured manual input may save through explicit user action; free-text or AI-assisted interpretation remains a revision-bound review candidate until the user accepts or ignores every row and confirms one Contacts-owned profile revision.
- Formal Chat, Event Runtime, and Work Hub now consume bounded purpose-specific identity projections for their approved fields. They do not receive the complete profile object; future public surfaces remain separately gated.
- `Contacts` owns the global role archive, visible role ID, and role-centered destructive actions.
- `Contacts` role profiles now own profile-side relationship premise/classification fields: free-text label, label note, initial seed values, stored primary category, modifiers, confidence/source/timestamp, and explanation.
- Non-self role profiles own their stable fictional receiving-account definitions. Chat may disclose them through a system-generated account card, while Wallet owns disclosed references, confirmed transfers, and receipts.
- Contacts detail is now the role control page for this classification slice: it shows the read-only current relationship runtime snapshot first, then lets the user edit profile-side relationship premise, seed values, category, modifiers, and classification audit below it.
- Relationship-label AI classification goes through `src/lib/ai.js` and shared JSON parsing; high confidence is saved as `ai_auto`, medium/low confidence requires confirmation before `ai_confirmed`, and `user_edited` classifications are protected from silent AI or world-template overwrite.
- Event/runtime consumes saved category/modifier classification fields for gate decisions and audit metadata. It must not read `relationshipLabelText` or `relationshipLabelNote` as event conditions.
- `Chat` owns the idempotent role-binding seam. Contacts may invoke it from an explicit eligible-role `Start Chat` action; `Chat Directory` owns bound-target review, unbind, Chat-local metadata, and service-account entry management.
- Chat Directory may preserve legacy `relationshipLevel` / `relationshipNote` as Chat-local tuning/note compatibility fields, but must not label them as current affinity or relationship progress.
- `Chat` owns conversations, messages, and manual chat-message deletion.
- `Relationship Runtime` owns relationship progress and memory groups.
- Persistence may page or reversibly cold-archive older role/relationship records, but it cannot silently or irreversibly delete role profiles, archived-role state, accepted facts, memories, or the evidence needed to review persistent truth.
- `CMG-06` makes this boundary executable for Relationship Runtime: the authoritative fact carrier keeps every row it can persist, while Contacts reads memory groups through `limit / offset / totalCount` pages and Chat receives only bounded recall projections. A full carrier or complete backup remains the recovery source; pagination is not deletion.
- Relationship runtime remains the owner of current metrics, stage, milestones, and memories; profile-side classification is saved context, not current relationship truth.
- Relationship runtime summary counts are canonical: `totalMemoryCount`, `visibleMemoryCount`, and `archivedMemoryCount` describe the full target state even when the caller requests only a small memory-summary list.
- Relationship Runtime also owns the read-only memory-pressure projection over its complete per-role memory set. Contacts translates that projection into the user-facing `状态稳定 / 记忆开始变多 / 建议查看` care card and opens nominated existing memories through the normal detail/source-audit flow; it does not expose technical thresholds, call AI, or automatically summarize, rewrite, archive, or delete anything.
- The pressure Module may later be reused for world chronology or role-to-role knowledge, but those systems must supply their own Owner and data. Contacts relationship memory must not become a mixed store for the whole world.
- Chat social events such as message requests, blocks, and being-blocked states may be displayed in Contacts as role-level reachability/status snapshots, but Contacts must not judge eligibility or apply generated outcomes. Chat owns the applied channel state, Event Runtime and World Hub own generated-event review/audit, and relationship runtime owns confirmed relationship facts or memories.
- A user-selected Chat disclosure is a role-scoped supporting fact, not a Contacts profile field: Chat owns the explicit message action and source reference, the Relationship Adapter writes the fact, and Contacts only presents the resulting memory group through existing review/read-model surfaces.
- Chat may also expose a disabled-by-default AI `disclosureCandidates` proposal for a future review checkpoint. Contacts/Relationship Runtime must treat it as temporary input only: the parser fixes the role and exact user-message source, while a future review surface decides whether any existing memory adapter should receive it.
- `World Hub` is an optional review and cleanup surface, not the main role-authoring page.
- `WorldBook` should define profile-template rules; `Contacts` should store concrete profile values.
- Self Profile's stable structured world identity is now consumable through the bounded read-only Player Context V1 projection for K-pop manager/public-idol eligibility. Contacts role profiles persist a monotonic revision; Runtime must present exact profile/world/template revision evidence and may read only manual visible allowlisted fields carrying `event_eligibility`. Contacts does not own volatile reputation/media/fatigue/occupation-pressure values, world incidents, event decisions, or future forum/news posts. Read `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md`.
- Contacts world-field editing now uses stable field-type controls, so different worldview templates can show different field content while the UI stays predictable: single choice, long notes, comma-separated tags, and person/role reference fields each get their own copy and input behavior.
- Contacts world-field editing now reviews template changes before saving: fields in the chosen template are updated, while old fields outside the chosen template stay visible as custom fields unless the user cleans them up separately.
- Contacts world-field editing now has AI draft assistance: AI can suggest values for empty template fields inside the editor draft, but it skips existing/manual values and nothing is saved until the user reviews and presses Save.
- Contacts now detects when a role profile is using an unavailable, older-version, or other-world template and offers a current-world adaptation review. AI can draft migrated values into the editor, but the old values stay preserved as custom fields and nothing changes until the user saves.
- The complete WorldBook -> Contacts world-field loop now has E2E coverage, so incoming workers should treat the value-flow guardrail as landed and continue from the visual-diff/adaptation clarity tasks rather than rebuilding the basic chain.
- WorldBook's Profile Templates panel may link users into Contacts, and Contacts shows a focused handoff note for that entry path; concrete role, self-profile, and NPC values remain Contacts-owned.
- Contacts role detail now presents `人物资料 / Profile card` as a read-first, category-driven surface. Saved values and natural-language prompts appear by WorldBook category; the full existing editor opens only after an explicit Edit action. Old flat templates fall back to General, out-of-template values remain visible as custom details, and no `3/4` completion score is shown.
- The same person page now accepts person-specific categories and fields. They persist as Contacts-owned `profileExtensions`, remain isolated to that person unless the user explicitly promotes the structure into a new current-world template version, and never auto-fill other people.
- WorldBook now offers deterministic current-world profile-card suggestions plus optional AI suggestions. Both paths open the existing editable template draft; Cancel writes nothing, only explicit Save creates one v1 world template, and an AI failure leaves rule-based and manual creation available.
- Contacts entity types now include Self Profile, Main Role, Supporting Role, and World NPC. Chat Directory is a chat target list, not a Main Role filter; Self Profile must not be bound as a Chat target, and Supporting Roles or World NPCs can be bound before upgrade when their capabilities allow it.
- Formal role deletion removes Wallet's disclosed payee references for that profile; relationship reset keeps the profile account because the person still exists.
- Eligible Main Role/NPC profiles can now start Chat directly from Contacts through the Chat-owned seam; bound targets are reused, invalid route context is discarded, and Network recovery returns to the same role without making WorldBook content mandatory.
- Contacts first opens like a phone contact list: Search, My Profile, Recent interactions, Main Roles, and NPC / World Roles. Recent interactions is only a shortcut layer; it does not remove roles/NPCs from the complete lists.
- Selecting a person now opens a dedicated role page instead of appending detail below the contact list. The role page keeps identity and primary Chat/profile actions in its overview, then opens Relationship, World fields, Memories, Character details, Linked activity, and Manage as mutually exclusive focused sections with an explicit return to the role card. Wide viewports keep the content at a readable centered width; phone viewports keep the two-column scan grid without horizontal overflow.
- Relationship memory 4.2 currently treats explicit source-id lineage as the safe merge boundary: Phone callbacks, Shopping/Food order support, Map route follow-ups, and confirmed Calendar follow-ups should enrich one shared memory instead of creating competing top-level memories.
