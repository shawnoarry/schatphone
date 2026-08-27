# Contacts V3 Identity And Role Core Plan / 联系人 V3 身份与角色核心规划

Updated: 2026-08-27

Status: `PLANNING_ACCEPTED / CONTACTS-V3-0_DONE 2026-08-27 / CONTACTS-V3-1_DONE 2026-08-27 / CONTACTS-V3-2A_DONE 2026-08-27 / CONTACTS-V3-2B_PERSONA-2_DONE 2026-08-27 / CONTACTS-V3-3_DONE 2026-08-27 / CONTACTS-V3-4_NEXT`

Execution authority: `docs/roadmap/TODO_ROADMAP.md`

Primary package: `docs/pm/contacts-relationship-system-v2/`

This plan promotes Contacts from a completed V2 role-and-relationship presentation baseline into the next identity foundation for Self Profile, formal role Chat, identity-conditioned events, Work Hub role selection, and later public/social projections. It does not reopen or invalidate the completed Contacts V2 relationship, memory, WorldBook-field, cleanup, or Role Hub work.

## 1. Accepted Product Direction

Contacts is the stable person and identity owner for the virtual world.

The user should enter or edit a persona once. After explicit review and confirmation, that persona may initialize the user's in-world occupation, affiliation, public identity, world-specific profile values, and capability defaults. The user must not be forced to recreate the same identity independently in Work Hub, Chat, Event settings, or another App.

The accepted flow is:

`user-authored persona -> structured identity candidate -> user review and confirmation -> Contacts Self Profile revision -> purpose-specific read-only projections`

Important distinction:

- unconfirmed free text or model inference cannot silently create identity, organization membership, permission, or event eligibility;
- user-confirmed persona content may become canonical Contacts-owned identity after it is materialized into structured profile values and a new profile revision;
- AI is an optional drafting Adapter, not the identity owner;
- structured manual editing is an equally valid Adapter and does not require a provider call.

## 2. Product Goals

Contacts V3 should make these experiences depend on one coherent identity foundation:

1. `Self Profile`: who the user is in one world and what each role may know about them;
2. `Main Role`, `Supporting Role`, and `World NPC`: who other people are, how deeply they participate, what world/template they belong to, and which capabilities they have;
3. formal Chat: which Contacts profile is speaking, which Self Profile facts are visible, and which relationship/memory projection applies;
4. Event Runtime: whether one identity-conditioned event family is eligible from exact profile/world/template revisions;
5. Work Hub: which role template and organization context should appear for an artist, manager, producer, employee, student, or unaffiliated user;
6. later Community/Media and public-world surfaces: which identity facts are public projections rather than private profile fields.

## 3. Ownership Model

One concept keeps one primary owner.

| Concept | Owner | Meaning |
| --- | --- | --- |
| profile-template structure and world rules | WorldBook | which fields exist and what they mean in the current world |
| concrete Self Profile, Main Role, Supporting Role, and World NPC values | Contacts Profile Owner Module | stable person identity, values, revisions, capabilities, lifecycle, and visible role references |
| persona interpretation draft | Persona Confirmation Module | transient candidate values awaiting explicit user review |
| Chat target binding and thread metadata | Chat / Chat Directory | whether an eligible Contacts profile is available as a conversation target |
| messages and conversations | Chat | what was said and how the thread behaves |
| relationship progress and shared memories | Relationship Runtime | current metrics, stage, milestones, facts, memory groups, and recall projections |
| event eligibility and progression | Event Runtime | reads bounded identity projections and owner facts; never edits Contacts identity directly |
| organization work records and organization-issued authority | future production Work Hub owner | tasks, notices, proposals, receipts, and organization-side credentials after Contacts supplies the user's confirmed identity references |
| confirmed time commitments | Calendar | canonical schedule truth after explicit Save |

Contacts may store a user's claimed or confirmed affiliation reference as part of their persona. It does not own the organization's tasks, notices, approval receipts, schedules, or later institution-side revocation records.

This user-side authority rule is asymmetric. A confirmed Main Role, Supporting Role, or World NPC may keep occupation, affiliation, team, faction, and position as stable Contacts-owned character identity without applying through Work Hub. Work Hub is primarily the user's organization-work surface and may reference those roles by stable profile ID. When another role acts as an official issuer, the organization owner validates the organization record and issuer relation; the role does not need a separate user-style Work Hub enrollment flow.

### 3.1 Accepted Person-Depth Model

The current executable baseline recognizes `self_profile`, `main_role`, and `npc`. Contacts V3 accepts a four-type target model without claiming it is already implemented:

1. `Self Profile`: the user's special per-world identity;
2. `Main Role`: a core role with full continuity and relationship/route capability by default;
3. `Supporting Role`: a recurring supporting character with stable identity, Chat/event participation, and lightweight continuity, but no full relationship/route progression by default;
4. `World NPC`: a lightweight or functional world person that may be referenced by events, places, organizations, and other people without entering the primary Contacts/Chat/relationship surfaces by default.

`World NPC -> Supporting Role -> Main Role` is an identity-preserving unlock path. Existing direct NPC -> Main Role behavior remains supported. The legacy stored value `npc` continues to mean World NPC; `supporting_role` is added separately, and old NPC records are never reclassified from inferred importance, message count, profile completeness, or model output.

Person depth is not the relationship taxonomy. Family, friend, colleague, manager, rival, enemy, and world-specific relationship labels remain multi-select Contacts-owned classification/context and do not grant entity capabilities by themselves.

## 4. Deepened Modules

### 4.1 Contacts Profile Owner Module

Purpose:

- own Self Profile, Main Role, Supporting Role, and World NPC records independently from Chat once the four-type compatibility slice lands;
- own stable profile revisions, template links, profile values, capabilities, archive state, and role lifecycle;
- provide one small Interface for reads and profile-owned writes.

Current friction:

- product documentation already says Contacts owns role profiles, but `roleProfiles`, profile writes, NPC upgrade, persistence, and migration still live in `src/stores/chat.js`;
- deleting or replacing the Chat Store would currently force Contacts identity complexity into several callers;
- `ContactsView.vue` still coordinates profile writes directly even though display read models have already been extracted.

Compatibility direction:

- the current `store:chat.roleProfiles` envelope remains readable during migration;
- a compatibility Adapter may translate the legacy carrier into the Contacts Profile Owner Interface;
- no migration may drop profile values, revisions, Chat bindings, receiving-account definitions, archive state, or backup coverage;
- Chat must continue to reopen existing conversations against the same stable profile IDs.

### 4.2 Persona Confirmation Module

Purpose:

- transform user-authored persona input into a reviewable structured candidate;
- distinguish suggestions from confirmed profile truth;
- save only after explicit user confirmation;
- increment the Self Profile revision through the Contacts Profile Owner Module.

Candidate inputs may include:

- structured WorldBook-driven profile fields;
- existing user-authored Self Profile values;
- free-text persona or biography written by the user;
- optional AI-assisted extraction into known template fields;
- a later onboarding wizard that uses the same Interface rather than inventing a second profile format.

The Module must preserve source and review state at least conceptually:

- `manual_structured`;
- `user_authored_text_candidate`;
- `ai_draft_candidate`;
- `user_confirmed`;
- `user_edited`.

Only confirmed or directly saved structured values become canonical profile values. AI output alone remains transient.

### 4.3 Role Context Projection Module

Purpose:

- expose bounded, revision-aware, purpose-specific identity snapshots;
- centralize visibility, capability, world, template, and revision checks;
- prevent Chat, Event Runtime, Work Hub, and future Community callers from rebuilding profile semantics independently.

Planned projection purposes:

| Consumer | Minimum meaning |
| --- | --- |
| formal Chat | target role identity, speaking/profile context, visible Self Profile facts, capability references, and stable profile revision |
| Event Runtime | allowlisted structured identity and exact profile/world/template revision evidence |
| Work Hub | occupation/role template candidate, affiliation references, organization context, and no-affiliation state |
| Community/Media | public identity and publication-entitlement candidate only; no private profile values |
| Mail and institution-facing shells | bounded display name, public role, and trusted organization references where explicitly allowed |

The current Role Binding Contract and Player Context V1 are retained as existing specialized projections. Contacts V3 should deepen and align them, not replace them with one oversized universal object.

### 4.4 Role Lifecycle Module

Purpose:

- concentrate profile lifecycle rules behind one Interface;
- preserve Chat, relationship, event, Wallet, world, and linked-record continuity.

Lifecycle operations include:

- create Self Profile, Main Role, Supporting Role, or World NPC;
- revise profile values and template linkage;
- archive and restore a role;
- upgrade World NPC to Supporting Role or Main Role, and Supporting Role to Main Role, without replacing identity;
- review capability changes;
- preview and execute formal role deletion;
- preserve or explicitly clean dependent references through owner Adapters.

This Module does not absorb Relationship Runtime or Chat deletion semantics. It orchestrates the profile lifecycle and delegates owner-specific cleanup through existing Adapters.

### 4.5 Contacts Role Hub Presentation

The existing Contacts V2 Role Hub remains the primary authoring and review surface.

The current extracted read models should be preserved. Contacts V3 must not repeat home-list, memory-list, memory-detail, linked-activity, Role Hub, world-field, danger-zone, detail-section, profile-header, or template-editor display logic in a new architecture layer.

The 6096-line `ContactsView.vue` is a later implementation locality problem, but it is not the first migration target. Profile ownership and projections must be settled before further page decomposition.

## 5. Persona-To-Consumer Flow

Example:

`I am a signed idol in Aurora Entertainment and perform publicly under the name V.`

The Persona Confirmation Module may produce a candidate such as:

- occupation: `idol`;
- affiliation reference: `aurora_entertainment`;
- public identity: `public_figure`;
- professional name: `V`;
- suggested Work Hub role template: `artist`.

The user reviews and confirms the candidate. Contacts then saves structured values and creates a new Self Profile revision.

After confirmation:

- formal Chat may include only Self Profile fields visible to the target role;
- Event Runtime may evaluate an allowed identity-conditioned family from the exact revision;
- Work Hub may select the artist workspace and the confirmed affiliation reference;
- NEXT remains the external-opportunity App and does not become the internal work owner;
- later public surfaces may receive only the explicitly public projection.

If no affiliation is confirmed, Work Hub must not invent a company. It may show an unaffiliated/independent state or remain limited until a real organization context exists.

## 6. World And Self Profile Model

Accepted by `CONTACTS-V3-0`:

- one global user account/settings identity for device-level preferences;
- one independent Contacts Self Profile per world;
- each Self Profile has one primary WorldBook/template context in V1;
- world-specific personas do not silently share occupation, affiliation, species, public identity, or relationship visibility;
- an optional explicit copy/adapt flow may reuse selected fields between worlds without linking their future revisions.

This avoids leaking a modern entertainment persona into a school, fantasy, ABO, or other unrelated world while keeping device account settings reusable.

The current runtime remains a single-world compatibility baseline. Existing unscoped Self Profiles remain readable but are not silently assigned to a newly activated world. Exact selection, missing, legacy-unscoped, and ambiguous outcomes are frozen in `CONTACTS_V3_0_ARCHITECTURE_AND_DECISION_FREEZE.md`.

## 7. Delivery Stages

### CONTACTS-V3-0 - Architecture And Decision Freeze - `DONE 2026-08-27`

- confirm the Self Profile per-world model;
- freeze profile ownership and migration rules;
- inventory all current `store:chat.roleProfiles` readers and writers;
- classify current projections, lifecycle actions, persistence, and backup callers;
- define compatibility and rollback expectations before code moves.

Completion record: `CONTACTS_V3_0_ARCHITECTURE_AND_DECISION_FREEZE.md`.

### CONTACTS-V3-1 - Contacts Profile Owner Foundation - `DONE 2026-08-27`

- introduce the Contacts Profile Owner Module behind the existing persisted shape;
- migrate profile reads/writes without changing visible behavior;
- retain stable IDs, revisions, Chat binding, backup/restore, and NPC upgrade behavior;
- keep legacy Chat-store reads available through a bounded compatibility Adapter until consumers move.

Completion evidence:

- `src/lib/contacts-profile-owner.js` owns profile normalization, immutable reads, revision-safe writes, profile details, relationship classification, asset bindings, NPC upgrade, removal, snapshot replacement, and persistence copies;
- `src/lib/contacts-profile-projections.js` provides bounded immutable profile references and explicit `found / missing / legacy_unscoped / ambiguous` Self Profile selection;
- `src/stores/chat.js` retains `store:chat.roleProfiles` and the existing caller methods while delegating profile behavior to the Contacts owner;
- duplicate numeric profile IDs are rejected atomically, contradictory legacy `entityType / isMain` input is normalized with `entityType` as canonical, and stale expected revisions fail without mutation;
- targeted compatibility regressions, full project tests, lint, and build pass at the completion workspace state.

### CONTACTS-V3-2A - World Persona Template Proposal And Review

- first define one extensible profile-card model made of user-facing categories and system-readable fields;
- derive a reviewable category-and-field proposal from the current WorldBook/world-pack rules without introducing a second template format;
- let users add, remove, rename, reorder, and configure categories and fields, including person-specific custom fields;
- give every field a stable system-managed ID, an input type, visibility, and purpose markers so custom fields can still participate in the shared Contacts logic;
- define free-text classification as another draft-filling path: known content maps to existing fields, unmatched content remains visible or proposes a new field, and conflicts require review;
- render the resulting card on the existing person detail page as dynamic category sections: concise summaries while viewing, full controls while editing, and no second persona route;
- support manual creation/editing first and optional AI drafting or classification second;
- keep every generated proposal editable and unsaved until explicit user confirmation;
- save approved templates through the existing world template/version model and confirmed person values through the existing Contacts owner;
- preserve existing Contacts values as custom or adaptation-review data when templates change;
- use `CONTACTS_V3_2A_EXTENSIBLE_PROFILE_CARD_DESIGN.md` as the focused product contract for this stage.

### CONTACTS-V3-2B - Persona Confirmation

- add structured persona candidate and review state;
- support manual structured input first;
- add optional AI drafting through the existing provider transport without automatic save;
- write one confirmed Self Profile revision through the owner Module;
- prove cancellation, stale-revision, invalid-template, provider-failure, and write-failure behavior.

### CONTACTS-V3-3 - Purpose-Specific Projections

- deepen formal Chat role context first;
- align Player Context event projection with confirmed persona semantics without broadening the frozen V1 event allowlist silently;
- add a Work Hub identity projection for role-template and affiliation selection;
- retain visibility and world/revision fail-closed behavior.

### CONTACTS-V3-4 - Role Lifecycle

- move create/update/archive/restore/NPC-upgrade/delete orchestration behind the lifecycle Interface;
- preserve existing cleanup and impact-preview behavior;
- verify legacy backup and migration round trips.

### CONTACTS-V3-5 - Consumer Adoption

- formal Chat consumes the Contacts-owned role projection;
- Work Hub stops using a universal hard-coded artist membership when a confirmed Self Profile exists;
- identity-conditioned event work may begin only after the exact consumer projection is accepted;
- future Community/Media work consumes public projections only.

## 8. Acceptance Criteria

Contacts V3 identity foundation is not complete until:

1. Contacts, not Chat, is the executable owner of role profiles;
2. user-confirmed persona input can create or revise structured Self Profile identity without duplicate entry in downstream Apps;
3. unconfirmed AI or free-text inference cannot silently become canonical identity;
4. Chat binding and conversation history survive profile-owner migration;
5. Event Runtime and Work Hub consume bounded projections rather than the complete Contacts record;
6. world/template/profile revision mismatch fails closed and remains understandable to the user;
7. World NPC/Supporting Role upgrades, archive, restore, delete, backup, and rollback retain the current NPC safety guarantees and preserve stable identity and bindings;
8. current Contacts V2 relationship and memory behavior does not regress;
9. existing role IDs, profile IDs, receiving-account definitions, and source lineage remain stable;
10. targeted tests cover the owner Interface, both persona input Adapters, projections, lifecycle, migration, and write-failure rollback.

## 9. Explicit Exclusions

- no volatile reputation, fatigue, media heat, occupational pressure, or universal player statistics in Contacts;
- no relationship metrics or memory truth moved out of Relationship Runtime;
- no Chat messages or conversation ownership moved into Contacts;
- no organization task, notice, schedule, approval, or receipt ownership moved into Contacts;
- no automatic event, affiliation, employment, enrollment, permission, or public-entitlement grant from model output;
- no universal full-profile object passed to every consumer;
- no silent overwrite when the user changes worlds, templates, persona text, or profile revision;
- no broad Contacts visual redesign in the owner-migration stage;
- no new route, Store, schema migration, or implementation claim from this planning document alone.

## 10. Remaining Product Decisions

1. `DONE 2026-08-27`: the first V3-2A additions are date, boolean, and organization/team reference; numeric, formula, and cycle-calculation fields remain deferred.
2. `DONE 2026-08-27`: the additive purpose markers are `chat_context`, `event_eligibility`, `work_hub_matching`, and `public_content`; old fields gain none automatically and consumers must still enforce visibility/world/version rules.
3. Decide which identity fields every world must provide and which remain template-defined.
4. `DONE 2026-08-27`: Persona Confirmation remains bound to the exact person/world/template/profile revisions, requires an explicit decision for every row, and writes one Contacts-owned revision; fully structured manual input remains allowed to save directly.
5. Define how a major Self Profile revision affects active Work Hub membership, formal Chat context, pending events, and already confirmed history.
6. Decide the minimum profile completeness required for formal Chat while preserving a quick-start path.
7. Freeze archive/restore, permanent profile-ID non-reuse, tombstone, and receiving-account revocation semantics before V3-4.

## 11. Next Implementation Slice

`CONTACTS-V3-2A`, Persona Confirmation, and the approved `CONTACTS-V3-3` purpose-specific projections are complete. The next candidate is `CONTACTS-V3-4 Role Lifecycle`, subject to the unresolved lifecycle decisions below.

`CARD-3` added manual category/field editing to the existing WorldBook profile-template management flow. `CARD-4` renders the confirmed structure inside the existing Contacts person page, and `CARD-5` now lets the same page add person-specific categories or fields through Contacts-owned `profileExtensions`. Draft cancellation changes neither the person nor the template; person-only structure remains isolated; only explicit promotion writes one current-world template version; other people keep their previous template/version and receive no automatic values. These slices reuse the existing template IDs/versions, Contacts values, visibility rules, adaptation review, AI draft helpers, system-managed IDs, storage, and backup path; they do not create a parallel template format, silently save AI output, rewrite confirmed Self Profile values, infer old NPC importance, migrate consumers, promote Work Hub, or create a new event family.

The small-slice checklist in `CONTACTS_V3_2A_EXECUTION_PLAN.md` is complete through `PERSONA-1`, `PERSONA-2`, formal Chat context, read-only Event identity, and Work Hub matching projections. User-confirmed persona values now use the same Contacts profile structure as manual values, while every consumer receives only purpose-authorized, revision-bound fields. Before `CONTACTS-V3-4`, freeze archive/restore, permanent profile-ID non-reuse, tombstone, and receiving-account revocation semantics; do not begin lifecycle implementation from this planning document alone. The later Contacts home-list four-section visual regrouping remains outside this data slice.
