# Contacts Profile Entities Design / 通讯录人物档案实体设计

Updated: 2026-05-19

Status: `REVIEW_READY`

## 1. Goal

Create a product design for Contacts as a world-person archive.

Contacts should support:

- `Self Profile / 用户自我档案`;
- `Main Role / 主角色`;
- `NPC / 世界角色`;
- template-applied profile values;
- relationship and memory boundaries;
- safe NPC to Main Role upgrade.

Product rule:

> Contacts stores who each person is inside the world.

## 2. Current Context

Current project state:

- Contacts already owns global role profiles and visible `roleId`.
- Contacts already has delete role, reset relationship, and delete one memory group flows.
- Relationship runtime already owns relationship progress and memory groups.
- Chat Directory owns who can appear as a Chat target.
- Contacts detail currently has baseline manual-vs-event-attached display, but not the full role hub IA.

Missing product layer:

- Contacts does not yet have clear entity types for self/main role/NPC.
- Contacts does not yet apply WorldBook-generated profile templates.
- Contacts does not yet separate fixed sections from world-specific extensible sections.
- NPC upgrade is not yet defined as a safe capability-unlock flow.

## 3. Entity Types

### 3.1 Self Profile / 用户自我档案

Meaning:

- the user's own profile inside the world;
- can appear in Contacts;
- must be typed clearly so AI/system logic does not treat it as an AI role.

Can support:

- Chat context;
- anonymous forum activity;
- Instagram-like or social-feed activity;
- passerby reactions;
- user-related events;
- AI familiarity tiers.

Must not be treated as:

- an AI role profile;
- a romance/route target;
- a Chat Directory conversation target;
- an ordinary relationship-reset target.

### 3.2 Main Role / 主角色

Meaning:

- a full role/person profile;
- can bind into Chat Directory if the user chooses;
- can use relationship progress, memory groups, and route/攻略 continuity.

Can support:

- full role detail;
- relationship setting;
- relationship progress;
- memory groups;
- world-specific extensible fields;
- Chat context assembly.

### 3.3 NPC / 世界角色

Meaning:

- a lightweight world-person record;
- supports worldbuilding and continuity without requiring full main-role setup.

Can support:

- world identity;
- personal style;
- relationship position;
- lightweight relationship state;
- social graph;
- event references;
- forum/social-feed/map/schedule/story appearances.

NPCs are not broken main roles.

They can later be upgraded to Main Role without losing their existing profile, references, Chat binding, or history.

## 4. Contacts List Defaults

Contacts should show:

1. `我的档案 / My Profile`
   - pinned at the top;
   - entity type: `self_profile`.
2. `主角色 / Main Roles`
   - full role profiles.
3. `NPC / 世界角色`
   - lightweight world-person records.

Service accounts should not appear in the main Contacts list by default.

Reason:

- service accounts are Chat Directory or module-owned targets, not world-person profiles;
- including them would make Contacts drift back into a mixed utility list.

## 5. Detail IA

Contacts detail should not be one endless vertical page.

Baseline sections:

1. `概览 / Overview`
2. `档案 / Profile`
3. `关系 / Relationship`
4. `记忆 / Memories`
5. `生活资料 / Life Data`
6. `关联活动 / Linked Activity`
7. `危险操作 / Danger Zone`

Entity-specific behavior:

- Self Profile hides route/攻略 and ordinary relationship-reset actions.
- Main Role can show full relationship and memory management.
- NPC defaults to a lighter detail view, with upgrade affordance when needed.

## 6. Relationship And Memory Split

`关系 / Relationship` and `记忆 / Memories` must be separate.

### Relationship Setting / 关系设定

User-authored, long-form relationship definition.

Examples:

- childhood friends;
- master/subordinate;
- route target;
- social boundary;
- current relationship premise.

This belongs to the profile layer and should remain after relationship reset unless the user deletes the whole profile.

### Relationship Progress / 关系进度

Runtime-derived progress.

Examples:

- stage;
- affinity;
- trust;
- milestones;
- recent relationship changes.

This belongs to relationship runtime and should be cleared by relationship reset.

### Memories / 记忆

Memory groups are event-level truth units.

A single event should become one memory group. Preferences, life patterns, relationship changes, and social hints derived from that event are derived displays, not separate competing truths.

## 7. Memory Edit Permission

Users can edit the display and interpretation layer of a memory.

Allowed edits:

- memory title;
- memory summary;
- user note;
- importance;
- whether it participates in recall;
- tags.

Source records must not be silently rewritten.

If a memory came from Calendar, Wallet, Map, Food Delivery, or another module, editing the memory should not automatically edit the original source record. The UI should explain that the source record belongs to its source module.

## 8. Manual Input Priority

Manual user input has higher priority than event-attached inferred information.

Event-attached information is a clue, not an override.

When manual information and event-attached clues conflict, the user can choose:

1. keep as exception;
2. accept as new information;
3. ignore the clue.

Example:

- manual field says "does not eat sweets";
- memory says the role ate dorayaki with the user;
- the system should not automatically overwrite the preference as "likes sweets".

## 9. Extensible Profile Sections

Fixed subareas such as preferences, life pattern, and social graph are useful but not enough.

Contacts should support:

1. fixed base sections;
2. WorldBook-driven extensible profile sections;
3. user-created role-specific sections.

Examples of world-specific fields:

- ABO: pheromone, secondary gender, special cycle, marking relationship;
- Sentinel/Guide: spirit animal, mental landscape, compatibility, guiding records;
- xianxia/fantasy: cultivation stage, spiritual root, techniques, sect/faction;
- school: class, club, grades, schedule;
- workplace: position, company, network, project relationship.

## 10. Shared Template/Value System

`Self Profile`, `Main Role`, and `NPC` share one underlying template/value system.

Entity type constraints should not be hard walls.

Recommended model:

1. shared profile fields across all entity types where meaningful;
2. entity-type defaults decide which sections are visible first;
3. capability flags decide which features are enabled;
4. upgrading an NPC to Main Role preserves existing fields and unlocks missing main-role capabilities.

Capability examples:

- `canAppearInChatDirectory`
- `canUseFullRelationshipProgress`
- `canUseMemoryGroups`
- `canUseRouteProgression`
- `canAppearInWorldEvents`
- `canAppearInSocialFeed`

## 11. Chat Directory Boundary

Chat Directory is the Chat module's target list for who can talk to the user.

It is not limited to Main Roles.

Rules:

- a Main Role may or may not be in Chat Directory;
- an NPC may already be in Chat Directory;
- Chat binding does not prove an entity is a Main Role;
- NPC upgrade must preserve existing Chat binding and chat history when present;
- service accounts remain Chat Directory/module-owned, not main Contacts entities.

## 12. Chat Context Priority

Chat context assembly should distinguish:

- assembly order;
- conflict priority;
- visibility gates.

Confirmed order:

1. safety rules and the user's current explicit instruction;
2. current conversation scene and recent context;
3. primary worldview rules;
4. current AI/NPC role profile;
5. user self-profile information visible to this role;
6. relationship progress and memory;
7. current module/event context;
8. supplemental WorldBook knowledge points.

Rules:

- worldview defines what is possible in this world;
- role profile defines who the speaking character is and how they behave;
- user self-profile defines what this role can know about the user;
- relationship memory defines what they have experienced together;
- current explicit user instruction can override older preferences within safe bounds;
- manually entered profile values outrank event-inferred clues;
- roles can only receive user self-profile fields allowed by familiarity/intimacy visibility.

## 13. NPC To Main Role Upgrade

NPC upgrade is an unlock/extension flow, not a destructive migration.

Upgrade flow:

1. Confirm upgrade.
   - explain that this NPC will gain main-role capabilities;
   - explain that existing NPC identity, linked activity, world references, and social graph references are preserved.
2. Review current Chat binding.
   - preserve existing Chat binding if present;
   - if not present, allow the user to bind now or keep it as a non-chat main role profile.
3. Fill missing main-role fields.
   - avatar/display name;
   - role introduction;
   - speaking or presentation style;
   - relationship setting;
   - optional preferences, life data, and world-specific template fields.
4. Choose relationship system level.
   - lightweight relationship: relationship notes, social position, and linked events only;
   - full relationship: relationship progress, memory groups, stages/metrics/milestones.
5. Migrate existing NPC content.
   - preserve world identity;
   - preserve linked activity;
   - preserve social graph references;
   - preserve event references;
   - preserve Chat binding and chat history if present.
6. Show impact summary.
   - newly enabled capabilities;
   - fields that need user review;
   - content that will be preserved;
   - no NPC history is deleted by the upgrade.

Default strategy:

- upgraded NPCs default to lightweight relationship mode;
- full relationship progression is opt-in;
- existing Chat binding is preserved, not recreated.

## 14. Destructive Action Boundaries

Existing destructive-action rules still apply.

Delete role profile:

- applies to Main Role and future eligible NPC/Main Role entities;
- must not delete visual assets automatically;
- must not treat Self Profile as an ordinary deletable role.

Reset relationship:

- keeps role profile and manual fields;
- clears route/progress/memory/runtime continuity according to existing rules;
- should not apply to Self Profile as an ordinary action.

Delete one memory group:

- deletes the memory group and directly linked structured records;
- does not automatically delete ordinary Chat text.

## 15. Non-Goals For V1

Do not include in the first implementation scope:

- full onboarding system;
- full user manual system;
- automatic profile generation for every genre;
- multi-world template stacking;
- service-account migration into Contacts;
- forced Chat binding during NPC upgrade;
- automatic overwriting of user profile values from events.

## 16. Acceptance Criteria

This design is ready for implementation planning when:

1. Self Profile, Main Role, and NPC meanings are clear.
2. Contacts list defaults are clear.
3. Contacts detail IA uses sectioned structure.
4. WorldBook templates define profile fields, while Contacts stores values.
5. manual input outranks event-attached clues.
6. Chat Directory remains a Chat-side binding list, not a Main Role filter.
7. NPC upgrade preserves history and binding.
8. Self Profile is protected from AI-role treatment.
