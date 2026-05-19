# Contacts V2 Role Profile Template Decision Log / 通讯录角色档案模板决策记录

Updated: 2026-05-19

Status: `GRILL_DONE`

This file records the confirmed product decisions from the Contacts V2 detail IA and WorldBook-driven role-profile-template discussion.

This is not an implementation plan. The final design has been promoted into formal specs and an executable implementation plan. Execute from the plan instead of this decision log.

Plan:

- `docs/superpowers/plans/2026-05-19-worldbook-contacts-profile-template-plan.md`

## 1. Contacts Detail IA Baseline

The Contacts detail page should not be one endless vertical page.

Confirmed baseline sections:

1. `概览 / Overview`
2. `档案 / Profile`
3. `关系 / Relationship`
4. `记忆 / Memories`
5. `生活资料 / Life Data`
6. `关联活动 / Linked Activity`
7. `危险操作 / Danger Zone`

Product meaning:

- Contacts is the role/person archive and role hub.
- Chat Directory is only the chat-side target list.
- Dangerous actions must stay separated from normal editing.

## 2. Relationship And Memory Split

`关系 / Relationship` and `记忆 / Memories` must be separate.

Relationship can contain longer user-authored definitions:

- relationship positioning;
- route/攻略 direction;
- boundaries;
- long-form current relationship notes.

Memory groups are event-level truth units.

A single event, such as "the user and a role ate dorayaki together", should become one memory group. Preference, life-pattern, or relationship hints derived from that event are derived displays, not separate competing truths.

## 3. Memory Edit Permission

Users can edit the display and interpretation layer of a memory.

Allowed edits:

- memory title;
- memory summary;
- user note;
- importance;
- whether it participates in recall;
- tags.

Source records must not be silently rewritten.

If a memory came from Calendar, Wallet, Map, Food Delivery, or another source module, editing the memory should not automatically edit the original source record. The UI should explain that the source record still belongs to its original module.

## 4. Manual Input Priority

Manual user input has higher priority than event-attached inferred information.

Event-attached information is a clue, not an override.

When manual information and event-attached clues conflict, the user should be able to choose:

1. keep as exception;
2. accept as new information;
3. ignore the clue.

Example:

- Manual field says "does not eat sweets".
- A memory says the role ate dorayaki with the user.
- The system should not automatically overwrite the preference as "likes sweets".

## 5. Relationship Setting vs Relationship Progress

Relationship must split into two meanings:

### Relationship Setting / 关系设定

User-authored, long-form relationship definition.

Examples:

- childhood friends;
- master/subordinate;
- route target;
- social boundary;
- current relationship premise.

This belongs to the profile layer and should remain after a relationship reset unless the user deletes the whole profile.

### Relationship Progress / 关系进度

System/runtime-derived progress.

Examples:

- stage;
- affinity;
- trust;
- milestones;
- recent relationship changes.

This belongs to relationship runtime and should be cleared by relationship reset.

## 6. Life Data Must Be Extensible

Fixed subareas like `喜好 / Preferences`, `生活规律 / Life Pattern`, and `人物关系网 / Social Graph` are useful but not enough.

Different worlds need different role-profile fields:

- ABO: pheromone, secondary gender, special cycle, marking relationship;
- Sentinel/Guide: spirit animal, mental landscape, compatibility, guiding records;
- Xianxia/fantasy: cultivation stage, spiritual root, techniques, abilities, sect/faction;
- school: class, club, grades, schedule;
- workplace: position, company, network, project relationship.

The detail IA should therefore use:

1. fixed base sections;
2. WorldBook-driven extensible profile sections;
3. user-created role-specific sections.

## 7. WorldBook Drives Templates, Contacts Stores Values

Confirmed direction:

> WorldBook defines the rules. Contacts fills the values.

WorldBook should define what fields a world or setting requires.

Contacts should store the specific values for each person.

Example:

- WorldBook template defines `信息素 / pheromone`.
- A Contacts profile stores `白茶 / white tea` for one person.

Events and memories may create clues, but they should not silently overwrite user-entered template values.

## 8. Template Binding Should Be Soft

WorldBook role-profile templates should be soft suggestions, not mandatory gates.

When creating or editing a Contacts profile, the user should be able to:

1. apply a WorldBook template;
2. bind the world context without applying a template;
3. add custom fields manually.

This keeps role creation lightweight while still supporting deep world-specific structure.

## 9. Onboarding Flow

New-user onboarding can introduce the recommended order:

1. create or choose a worldview in WorldBook;
2. generate a role-profile template from that worldview;
3. show selectable template fields;
4. read Settings user information;
5. create a first user self-profile example;
6. let the user confirm and edit it;
7. save it as a reusable standard template or apply it to other profiles.

Template field groups can include:

- identity;
- biology/species;
- ability;
- faction;
- relationship setting;
- special cycle;
- taboo/boundary;
- life habits.

## 10. User Self Profile

The user profile can appear inside Contacts, but it must be strongly typed as `Self Profile / 用户自我档案`.

The reason is not that users will confuse themselves with a target role. The risk is that the AI or system may treat the user as an AI character unless the entity type is explicit.

Self Profile can support:

- Chat context;
- anonymous forum activity;
- Instagram-like/social-feed activity;
- passerby reactions;
- user-related events;
- AI familiarity tiers.

Self Profile must not be treated as:

- AI role profile;
- romance/route target;
- Chat Directory conversation target;
- ordinary relationship-reset target.

## 11. User Information Visibility Levels

User profile data should support visibility levels.

Recommended levels:

1. `公开资料 / Public`
2. `熟人资料 / Familiar`
3. `亲密资料 / Intimate`
4. `隐藏资料 / Hidden`
5. `世界观资料 / World-specific`

Recommended control model:

- section-level visibility first;
- field-level visibility as advanced editing.

Example:

- `信息素 / pheromone` can default to familiar visibility;
- `特殊周期 / special cycle` can be set to intimate visibility.

## 12. NPC Profiles

Contacts should support `NPC / 世界角色` profiles.

NPC profiles are not broken or incomplete main roles. They are lightweight world-person records.

NPCs can:

- support worldbuilding;
- appear in social graph;
- be mentioned by main roles;
- appear in forums, social feeds, map events, schedules, or story records.

NPCs do not need the full main-role setup by default.

Recommended NPC detail shape:

1. overview;
2. world identity;
3. relationship position;
4. key settings;
5. linked activity.

NPCs can later be upgraded into main AI roles. The upgrade should preserve the original NPC profile and ask the user to fill missing main-role fields.

## 13. V1 Template Field Types

V1 WorldBook-driven role-profile templates should support five field types first:

1. `short_text / 短文本`
   - examples: pheromone, spirit animal, spiritual root, position, species
2. `long_text / 长文本`
   - examples: relationship setting, character background, ability description, taboo/boundary
3. `single_select / 单选`
   - examples: ABO secondary gender, faction, job type, identity type
4. `multi_select_tags / 多选或标签`
   - examples: ability tags, preference tags, organization links, risk keywords
5. `person_reference / 人物关联`
   - examples: parent, mentor, sect sibling, ex-partner, enemy, bonded target

All field types should support a shared `visibilityLevel / 可见等级`.

V1 should not require strong typed numeric, date, formula, or cycle-calculation fields yet. Concepts like heat cycle, cultivation level, or ability stats can initially be represented by text, select, or tags until real calculation needs appear.

## 14. Template Scope

WorldBook role-profile templates should have two layers:

1. `Global preset templates / 全局预设模板`
   - reusable template library;
   - examples: basic modern profile, ABO profile, Sentinel/Guide profile, xianxia role, school role;
   - can be copied into a specific WorldBook context.
2. `World-specific templates / 世界观专属模板`
   - bound to a specific WorldBook/worldview;
   - can customize fields and meanings for that world;
   - should be the primary source when Contacts creates or edits a profile inside that world.

V1 should prioritize world-specific templates, while allowing global presets as starting points.

Reason:

- only global templates are too generic for concrete world rules;
- only world-specific templates force users to start from zero every time.

## 15. Template Versioning And Sync

Templates must be versioned.

Profiles created from a template should remember:

- template id;
- template version;
- copied field ids and labels;
- user-filled values.

When a WorldBook template changes, existing profiles must not be silently overwritten.

Contacts should show a review prompt such as:

> This profile uses an older template version. Review differences?

User choices:

1. add new fields only;
2. sync field labels/options where safe;
3. keep old version;
4. save current profile structure as a role-specific template.

Hard rule:

- template changes must never silently erase or rewrite user-entered profile values.

## 16. Contacts Entity Types And List Defaults

Contacts should behave as the world-person archive, not only as a chat-target list.

Default entity types:

1. `Self Profile / 用户自我档案`
   - pinned at the top as `我的档案`;
   - represents the user inside the world;
   - must not be treated as an AI role or route target.
2. `Main Role / 主角色`
   - can bind into Chat Directory;
   - can have relationship progress, memory groups, and route/攻略 continuity.
3. `NPC / 世界角色`
   - lightweight world-person record;
   - can appear in worldbuilding, events, social graph, forum/social-feed activity, map/schedule/story references;
   - can later be upgraded into a main role.

Service accounts should not appear in the main Contacts list by default.

Reason:

- service accounts are module or Chat Directory targets, not world-person profiles;
- including them would make Contacts drift back into a mixed utility list.

## 17. Future Onboarding And User Manual Rule

The project does not currently have a complete new-user onboarding system or user manual system.

When those systems are created later, they should use this logic:

1. onboarding should not block normal Chat usage;
2. onboarding should strongly recommend the WorldBook -> template -> self profile -> other profiles path;
3. user manuals should explain that world-specific profile fields come from WorldBook templates;
4. quick-start users can begin with a default modern template and fill world-specific structure later;
5. deep-setting users can create or choose a WorldBook first, generate a profile template, build `Self Profile / 用户自我档案`, then reuse the template for main roles and NPCs.

Recommended onboarding modes:

1. `Quick Start / 快速开始`
   - start Chat or create a role with a default modern template;
   - fill WorldBook and templates later.
2. `Recommended Setup / 推荐设置`
   - create or choose a worldview;
   - generate a role-profile template;
   - create and review the user's self profile;
   - create main roles or NPCs from the template.
3. `Deep Setting / 深度设定`
   - edit WorldBook templates;
   - configure user-profile visibility levels;
   - generate several role-type templates for different entity types.

## 18. V1 World Context Limit

V1 should allow one primary WorldBook/template context per profile.

Recommended fields:

- `primaryWorldId / 主世界观`
- `profileTemplateId / 当前档案模板`
- `profileTemplateVersion / 档案模板版本`
- optional additional `knowledgePointIds / 补充知识点`

Rules:

1. A profile has one primary world/template context in V1.
2. Additional WorldBook knowledge points can supplement background and Chat context.
3. Additional knowledge points must not add or overwrite profile structure.
4. If a user wants `ABO + xianxia + workplace`, they should create one combined world-specific template rather than stacking multiple templates on one profile.

Reason:

- multiple active templates would create field conflicts;
- AI context would not know which world rules take priority;
- one primary context keeps role creation and later sync understandable.

## 19. Shared Entity Template Principle

`Self Profile`, `Main Role`, and `NPC` should share one underlying template/value system.

Entity type constraints should not be hard walls that make NPCs structurally incompatible with main roles.

Confirmed correction:

- NPCs can have personal style, relationship notes, relationship position, and lightweight continuity.
- NPCs are not main route/攻略 targets by default, but they are still people in the world.
- Dialogue style should not be treated as a Main Role-only concept, because speaking style may be affected by model behavior, character writing, and NPC presentation needs.
- Relationships should not be Main Role-only. NPCs may have relationship positioning and lightweight relationship state; they simply do not default to the full main-role relationship progression stack.

Recommended model:

1. shared profile fields across all entity types where meaningful;
2. entity-type defaults decide which sections are visible first;
3. capability flags decide which features are enabled;
4. upgrading an NPC to Main Role preserves existing fields and unlocks missing main-role capabilities.

Examples of capability flags:

- `canAppearInChatDirectory`
- `canUseFullRelationshipProgress`
- `canUseMemoryGroups`
- `canUseRouteProgression`
- `canAppearInWorldEvents`
- `canAppearInSocialFeed`

NPC -> Main Role upgrade should therefore be an unlock/extension flow, not a destructive migration.

## 20. Chat Context Priority

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

Key rules:

- worldview defines what is possible in this world;
- role profile defines who the speaking character is and how they behave;
- user self-profile defines what this role can know about the user;
- relationship memory defines what they have experienced together;
- current explicit user instruction can override older preferences within safe bounds;
- manually entered profile values outrank event-inferred clues;
- roles can only receive user self-profile fields allowed by familiarity/intimacy visibility.

## 21. NPC To Main Role Upgrade

NPC upgrade should be an unlock/extension flow, not a destructive migration.

Confirmed correction:

- Chat Directory is the Chat module's target list for who can talk to the user.
- Chat Directory is not limited to main roles.
- An NPC may already be bound in Chat before being upgraded to a main role.
- Therefore NPC -> Main Role upgrade must not assume that Chat binding is created only during upgrade.

Recommended upgrade flow:

1. `Confirm upgrade / 确认升级`
   - explain that this NPC will gain main-role capabilities;
   - explain that existing NPC identity, linked activities, world references, and social graph references will be preserved.
2. `Review current Chat binding / 检查当前会话绑定`
   - if the NPC is already in Chat Directory, preserve the existing Chat binding;
   - if it is not in Chat Directory, allow the user to bind it now or keep it as a non-chat main role profile;
   - do not treat Chat binding as proof that the entity is already a main role.
3. `Fill missing main-role fields / 补齐主角色字段`
   - avatar/display name;
   - role introduction;
   - speaking style or presentation style;
   - relationship setting;
   - optional preferences, life data, and world-specific template fields.
4. `Choose relationship system level / 选择关系系统级别`
   - lightweight relationship: relationship notes, social position, and linked events only;
   - full relationship: relationship progress, memory groups, stages/metrics/milestones.
5. `Migrate existing NPC content / 迁移原 NPC 内容`
   - preserve world identity;
   - preserve linked activity;
   - preserve social graph references;
   - preserve event references;
   - preserve any existing Chat binding and chat history if present.
6. `Show impact summary / 显示影响摘要`
   - list newly enabled capabilities;
   - list fields that need user review;
   - list content that will be preserved;
   - state that no NPC history is deleted by the upgrade.

Default strategy:

- upgrading an NPC should default to lightweight relationship mode;
- full relationship progression should be opt-in;
- existing Chat binding should be preserved, not recreated.

## 22. Spec Split Decision

The final design should be split into two formal specs, connected by one index:

1. `WorldBook Role Profile Templates`
   - WorldBook template definitions;
   - field types;
   - template versions;
   - global presets;
   - world-specific templates.
2. `Contacts Profile Entities`
   - Self Profile;
   - Main Role;
   - NPC;
   - Contacts detail IA;
   - profile values filled from templates;
   - visibility;
   - memory/relationship boundaries;
   - NPC -> Main Role upgrade;
   - Chat Directory binding boundary.

Reason:

- WorldBook owns template rules.
- Contacts owns person/profile values.
- The split makes later implementation easier to divide across modules and workers.

## 23. Grill Result

The grilling phase is complete.

Output artifacts:

- `docs/superpowers/specs/2026-05-19-role-profile-template-index.md`
- `docs/superpowers/specs/2026-05-19-worldbook-role-profile-templates-design.md`
- `docs/superpowers/specs/2026-05-19-contacts-profile-entities-design.md`
- `docs/superpowers/plans/2026-05-19-worldbook-contacts-profile-template-plan.md`

Next action:

- execute the implementation plan after the user chooses the execution mode.
