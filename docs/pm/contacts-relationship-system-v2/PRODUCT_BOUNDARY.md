# Contacts Relationship Product Boundary / 通讯录关系语义边界

Updated: 2026-06-01

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
| `Contacts / 通讯录` | 人物档案库与角色中心 | global role archive, visible role ID, role detail fields, memory review, destructive relationship actions | chat-thread ownership, runtime internals, provider/service transport logic |
| `Chat Directory / 会话通讯录` | 谁能进入聊天、哪些是服务号 | chat-side role binding, service-account entries, open/unbind/delete chat target | current affinity/stage truth, role-centered destructive relationship management |
| `Chat / 聊天` | 对话发生的地方 | conversations, messages, message deletion, thread prefs, prompt assembly | global role archive, relationship truth ownership |
| `Relationship Runtime / 关系运行时` | 关系进度和共同记忆的后台真相层 | affinity, trust, intimacy, tension, dependency, relationship stage, milestones, growth traits, memory groups | visible role editing UI, general chat message ownership |
| `World Hub / 世界中枢` | 可选的世界控制与运行时审查面板 | runtime review, cleanup orchestration, pending-event review | primary role authoring surface, visible role number authority |

## 3. Contacts / 通讯录

Product meaning:

- the main user-facing place for role profiles;
- the place where a user can understand who this character is and what has happened with them;
- the place where the user can safely run destructive actions.

Owns:

- visible `roleId`
- role profile basics
- profile-side relationship premise text, initial relationship seed, and stored classification metadata
- role-control display of the current relationship runtime snapshot before profile-side premise editing
- manually authored preferences/life-pattern/social-graph entries
- display-only social-channel snapshots from Chat, such as pending message request, blocked, or blocked-by-role status
- event-attached detail entries attached into role detail sections
- memory review and memory deletion entry
- role delete and relationship reset entry

Must not own:

- raw chat message deletion workflow
- chat-thread-only settings
- runtime-only internal identifiers as user-facing labels
- eligibility or application of generated friend/block/refusal social events

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
- thread-level actions and preferences
- chat-side interaction history

Must not own:

- whole-role destructive cleanup policy
- role-detail semantics
- relationship runtime truth values

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
- fact adapters and source-record references
- current relationship truth, even when it later consumes saved profile classification as context

Must not own:

- user-facing visible role-number formatting
- role-profile editing UX
- ordinary message history

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
