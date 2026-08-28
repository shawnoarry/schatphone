# Contacts Relationship Product Boundary / 通讯录关系语义边界

Updated: 2026-08-28

This document explains the current product meaning of each related module in plain language, so future engineers and AI assistants do not let the same field mean two different things.

## 1. Core Rule

One concept should have one main owner.

The system can mirror or consume data across modules, but the product meaning must stay stable:

- role identity should not drift into runtime keys;
- relationship progress should not drift back into chat-binding metadata;
- memory deletion should not be confused with ordinary chat deletion.

## 2. Module Meaning Table

| Module / 模块 | What it means to the user / 对用户的意思 | What it owns / 它拥有的语义 | What it must not own / 它不该拥有的语义 |
| --- | --- | --- | --- |
| `Contacts / 通讯录` | 人物档案库、用户世界身份与角色中心 | global role archive; Self Profile/Main Role/Supporting Role/World NPC identity and lifecycle; visible role ID, concrete profile values, profile revisions, role detail fields, memory review and memory-care presentation, destructive relationship actions | chat-thread ownership, relationship-memory or pressure-projection truth, organization work records, event progression, provider/service transport logic |
| `Chat Directory / 会话通讯录` | 谁能进入聊天、哪些是服务号 | chat-side role binding, service-account entries, open/unbind/delete chat target | current affinity/stage truth, role-centered destructive relationship management |
| `Chat / 聊天` | 对话发生的地方 | conversations, messages, message deletion, thread prefs, prompt assembly | global role archive, relationship truth ownership |
| `Relationship Runtime / 关系运行时` | 关系进度和共同记忆的后台真相层 | affinity, trust, intimacy, tension, dependency, relationship stage, milestones, growth traits, memory groups, read-only per-role memory-pressure projection | visible role editing UI, general chat message ownership |
| `World Hub / 世界中枢` | 可选的世界控制与运行时审查面板 | runtime review, cleanup orchestration, pending-event review | primary role authoring surface, visible role number authority |

## 3. Contacts / 通讯录

Product meaning:

- the main user-facing place for role profiles;
- the place where a user can understand who this character is and what has happened with them;
- the place where the user can safely run destructive actions.

Owns:

- visible `roleId`
- role profile basics
- stable fictional receiving-account definitions for non-self role profiles
- profile-side relationship premise text, initial relationship seed, and stored classification metadata
- role-control display of the current relationship runtime snapshot before profile-side premise editing
- manually authored preferences/life-pattern/social-graph entries
- display-only social-channel snapshots from Chat, such as pending message request, blocked, or blocked-by-role status
- event-attached detail entries attached into role detail sections
- memory review and memory deletion entry
- plain-language presentation of Relationship Runtime's read-only memory-care state and suggested existing memories
- role delete and relationship reset entry
- stable Self Profile identity and visibility-scoped world values that may later be projected read-only for event eligibility
- user-confirmed persona materialized as structured Self Profile values and a new profile revision
- stable Main Role/Supporting Role/World NPC identity, capability, template-link, archive, and lifecycle state
- person-specific profile-card categories and fields stored as `profileExtensions` inside the same Contacts-owned role profile and backup envelope
- purpose-specific identity projection policy, while consumer-specific records remain owned by their consumer Modules

Must not own:

- raw chat message deletion workflow
- chat-thread-only settings
- runtime-only internal identifiers as user-facing labels
- eligibility or application of generated friend/block/refusal social events
- confirmed Wallet transactions, receipts, account balances, or exchange behavior
- memory-pressure thresholds or projection truth
- automatic memory summarization, rewriting, archival, deletion, or persisted review candidates
- volatile reputation, media heat, fatigue, occupational pressure, ownerless world-arc state, event progression, or future forum/social/news publication records

### 3.1 Self Profile Event Eligibility Boundary

Self Profile now supplies one bounded, structured, revision-aware Player Context V1 projection containing only the K-pop allowlisted occupation, affiliation, public identity mode, and exact world/template references. Only manual `public` or matching-world `world_specific` template values qualify; the projection is read-only and body-free.

Contacts remains the identity owner, not the event judge. The user's persona is an accepted identity source, but source and canonical value are not the same thing:

1. structured manual fields may become canonical through an explicit user save;
2. user-authored free text may produce a structured candidate;
3. AI may draft the same candidate through an optional Adapter;
4. neither candidate becomes identity until the user reviews and confirms it;
5. confirmation writes structured Contacts-owned values and increments the Self Profile revision;
6. Runtime reads the saved projection and exact revision rather than the original prose or model output.

Therefore unconfirmed biography, role prose, or model classification cannot independently authorize an event. A user-confirmed persona may establish canonical identity after materialization into structured fields. Runtime must still fail closed on stale, missing, or mismatched profile/world/template references. Dynamic values remain with their natural owners or a separately justified minimal Player State Module. The full direction is `CONTACTS_V3_IDENTITY_AND_ROLE_CORE_PLAN.md` and `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md`.

### 3.2 Person Depth And Relationship Labels

Contacts uses person depth to decide how deeply a non-self person participates:

- Main Role: core continuity and full relationship/route capability by default;
- Supporting Role: recurring supporting continuity, Chat/event participation, and lightweight memory without full progression by default;
- World NPC: lightweight world or functional identity, referenced without automatically entering primary Contacts, Chat, or relationship surfaces.

The stored `npc` value remains the compatibility value for World NPC. Supporting Role is a formal `supporting_role` type, not a display-only tag. Existing NPCs are not automatically reclassified.

Relationship labels such as family, friend, colleague, manager, rival, and enemy are separate multi-select context. They do not change the person type, create a Chat binding, grant full relationship progression, or establish organization authority.

Upgrading `World NPC -> Supporting Role -> Main Role`, including an explicit direct World NPC -> Main Role upgrade, must preserve the same profile/role IDs, profile values, Chat binding/history, relationship references, world/organization references, event lineage, archive state, and backup compatibility.

Profile-template fields are normal Contacts information first. Date, yes/no, and organization references join the original text/select/tag/person-reference types. `chat_context`, `event_eligibility`, `work_hub_matching`, and `public_content` are additive read-purpose markers, not permissions or outcomes. Old fields gain no markers automatically; consumers must still enforce entity type, visibility, world, template version, and their own authority checks. Self Profile organization references may help select a user Work Hub but cannot grant workspace access. Non-self organization references may express confirmed character setting without requiring the character to register through Work Hub.

WorldBook owns the reusable profile-card structure and provides the manual category/field editor. Contacts owns each person's concrete values and now renders that confirmed structure inside the existing person page: reading shows saved values and natural-language prompts by category, while explicit editing shows the full applicable form. Old flat templates fall back to a default category and out-of-template values remain custom details. Renaming or moving a category/field does not change its stable ID; saving a template revision must not silently delete or overwrite existing person values. A form field's visibility or purpose marker does not transfer Contacts ownership to Chat, Event Runtime, Work Hub, or a public-content surface.

Person-specific structure is not a second notes system. Contacts merges `profileExtensions` with the selected world template for display and editing while preserving their separate ownership on save. A person-only category or field cannot appear on another person. Adding the structure to the current world template requires an explicit choice and one confirmed template-version write; it does not auto-fill other people, and cancellation must leave both the person and template unchanged.

### 3.3 Person Lifecycle Boundary

Contacts distinguishes reversible person archive from permanent person deletion:

- archive preserves the complete person, Chat binding/history, relationship truth, memories, source lineage, and receiving-account identity, but suspends new Chat generation, new bindings, identity projections, matching, event eligibility, and new payee actions until explicit restore;
- restore reactivates the same profile and role IDs in place and cannot be inferred from AI, events, or downstream activity;
- permanent deletion is archive-first for non-self people, removes the live profile and confirmed destructive scope, creates a minimal tombstone, and permanently reserves the old profile and role IDs in the current save lineage;
- immutable Wallet receipts/transactions, orders, Calendar history, event audit, and other owner history retain their own snapshots or a neutral deleted-person reference and never rebind to a future profile;
- ordinary Self Profile archive/delete is outside the first V3.4 implementation and must fail closed until a world/account identity flow defines replacement or world reset.

Person archive is not memory archive, relationship reset, or Chat unbind. The detailed contract is `CONTACTS_V3_4_ROLE_LIFECYCLE_DECISION_FREEZE.md`. V3-4A implements internal archive/restore and archived-consumer gates; V3-4B implements internal archive-first permanent-delete coordination, Wallet revocation/history unlinking, tombstones, and rollback; V3-4C implements one user-facing archived-people manager, archived Wallet suspension/restore, read-only archived detail, grouped impact, typed role-ID confirmation, and replacement of the legacy active-person direct-delete entry.

## 4. Chat Directory / 会话通讯录

Product meaning:

- this is the Chat-side address book;
- it decides who can appear as a conversation target in Chat;
- it is not the same thing as the global role archive.

Owns:

- binding a role profile into Chat
- unbinding a role from Chat
- service-account creation/edit/delete
- chat-target level display metadata

Must not own:

- the main role profile
- destructive role delete
- relationship reset
- current relationship truth

Important compatibility note:

- if `relationshipLevel` or `relationshipNote` still exist here, they must be treated as compatibility or chat-side annotation fields;
- they must not be presented as the authoritative current relationship-progress layer unless the product decision is explicitly changed.

## 5. Chat / 聊天

Product meaning:

- the place where messages happen;
- the place where users can manually delete ordinary chat text.

Owns:

- message history
- user and AI message content
- system-generated masked receiving-account cards that reference profile-owned account data
- thread-level actions and preferences
- chat-side interaction history

Must not own:

- whole-role destructive cleanup policy
- role-detail semantics
- relationship runtime truth values
- original role receiving-account credentials or Wallet ledger mutation

Important boundary:

- deleting one memory group does not automatically delete ordinary free-text chat history;
- the product should clearly tell the user to manually delete chat text inside Chat when needed.

## 6. Relationship Runtime / 关系运行时

Product meaning:

- the system truth for relationship progress and shared memories;
- the layer that turns multiple module events into one understandable continuity.

Owns:

- `entityKey`
- relationship metrics and stage
- memory groups and memory summaries
- read-only pressure projection over the complete per-target memory set
- fact adapters and source-record references
- current relationship truth, even when it later consumes saved profile classification as context

Must not own:

- user-facing visible role-number formatting
- role-profile editing UX
- ordinary message history

Reuse boundary:

- a pure pressure-calculation Module may be reused by future world chronology or role-to-role knowledge systems;
- reuse does not transfer ownership or permit mixed storage: each future system must provide its own Owner, records, review semantics, and persistence boundary.

## 7. World Hub / 世界中枢

Product meaning:

- optional review and control app;
- useful for debugging, reviewing, and later limited override actions.

Owns:

- runtime review
- pending-event review
- cleanup orchestration entry for reset/delete-memory when allowed

Must not own:

- the main role profile experience
- the main role ID presentation
- a second relationship-authoring system

Important rule:

- if World Hub needs to display a role number, it should read the real `roleId` from the role profile;
- it must not silently replace `roleId` with `profileId` or `entityKey` in user-facing copy.

## 8. Field-Level Semantic Boundary

| Field | Product meaning | Safe owner |
| --- | --- | --- |
| `roleId` | 用户看得懂的角色编号 | Contacts role profile |
| `profileId` | 内部角色档案主键 | Chat/profile storage layer |
| `entityKey` | 关系运行时目标键 | relationship runtime |
| `memoryKey` | 一段共同经历的共享记忆键 | relationship runtime |
| `relationshipLevel` | 旧聊天绑定层关系字段 | Chat-side compatibility only unless redefined |
| `relationshipNote` | 旧聊天绑定层备注字段 | Chat-side compatibility/manual annotation only unless redefined |

Additional relationship-classification profile fields:

| Field | Product meaning | Safe owner |
| --- | --- | --- |
| `relationshipLabelText` / `relationshipLabelNote` | profile-side relationship premise prose; not an event gate by itself | Contacts role profile |
| `initialRelationshipSeed` | profile-side starting suggestion for relationship metrics | Contacts role profile |
| `primaryRelationshipCategoryId` / `relationshipModifierIds` | stored relationship classification used as stable semantic context | Contacts role profile |
| `classificationConfidence` / `classificationSource` / `classificationUpdatedAt` / `classificationExplanation` | audit metadata for the stored classification result | Contacts role profile |

Round 2 classification policy:

- AI classification must go through `src/lib/ai.js` and shared JSON parsing.
- High-confidence AI suggestions may save as `ai_auto`.
- Medium/low-confidence suggestions require confirmation before saving as `ai_confirmed`.
- Existing `user_edited` classifications must not be silently overwritten by AI, confirmed AI, or world-template writes.

Round 3 Contacts UI policy:

- Contacts may display the current runtime snapshot first, but that block is display-only current truth owned by relationship runtime.
- Contacts may edit profile-side relationship premise fields, seed values, category, modifiers, and classification audit through role profile actions.
- Manual Contacts saves must use `classificationSource = user_edited`.
- Contacts must surface protected `user_edited` classifications as a status message instead of silently overwriting them.
- Contacts must not judge event eligibility or mutate current runtime metrics as part of classification editing.
- Friend/block/refusal social-event display in Contacts must stay snapshot-only. Chat owns applied channel state, Event Runtime and World Hub own generated-event review/audit, and relationship runtime owns confirmed relationship facts/memories.

## 9. Semantic Drift Watchlist

If any of these happens, treat it as a product-semantic bug:

1. Chat Directory displays `Affinity` using Chat-side compatibility data while relationship runtime says something else.
2. World Hub shows internal runtime keys as if they were user-facing role IDs.
3. Contacts and Chat Directory both expose destructive role management.
4. A single life event becomes multiple unrelated memories instead of one memory group.
5. A user cannot tell whether a role-detail item was manually entered or event-attached.
6. A downstream follow-up with explicit source lineage stacks relationship growth instead of attaching as supporting context to the existing memory group.
7. Event/runtime logic reads raw `relationshipLabelText` or `relationshipLabelNote` instead of the saved classification fields.
8. Chat or Chat Directory treats saved profile classification as current affinity/stage truth instead of profile-side context.
9. A later AI or world-template classification silently overwrites an existing `user_edited` classification.
10. Contacts lets the relationship premise form directly change current runtime metrics, stage, milestones, or memories.
11. Contacts turns friend/block/refusal social snapshots into event decisions or relationship metrics.
12. Contacts becomes the Store for volatile player/world state merely because the values describe the user.
13. a future forum/social/news post or model classification is treated as canonical Self Profile identity or owner-confirmed world truth.
14. unconfirmed persona text or an AI draft silently creates occupation, affiliation, organization membership, permission, Work Hub mode, or event eligibility.
15. Chat, Event Runtime, Work Hub, and future public surfaces each rebuild visibility, capability, world, template, and revision rules from the complete Contacts profile instead of consuming a bounded projection.
