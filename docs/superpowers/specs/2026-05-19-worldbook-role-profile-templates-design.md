# WorldBook Role Profile Templates Design / 世界书角色档案模板设计

Updated: 2026-05-19

Status: `REVIEW_READY`

## 1. Goal

Create a product design for WorldBook-driven role profile templates.

The goal is to let a worldview define the extensible profile fields that Contacts can later use for `Self Profile / 用户自我档案`, `Main Role / 主角色`, and `NPC / 世界角色`.

Product rule:

> WorldBook defines the rules. Contacts fills the values.

## 2. Current Context

Current project state:

- WorldBook already stores global worldview text and reusable knowledge points.
- Contacts role profiles can bind knowledge points.
- Chat can consume global worldview and role-bound knowledge points.

Missing product layer:

- WorldBook does not yet define reusable profile templates.
- Contacts does not yet generate extensible profile sections from WorldBook templates.
- There is no template versioning or template-sync review flow.

## 3. Template Types

WorldBook templates should have two layers.

### 3.1 Global Preset Templates / 全局预设模板

Purpose:

- reusable starting templates;
- useful for common genres and world types;
- can be copied into a specific WorldBook/worldview.

Examples:

- basic modern profile;
- ABO profile;
- Sentinel/Guide profile;
- xianxia/fantasy role;
- school role;
- workplace role.

Rule:

- global presets are starter material, not the active source of truth for a specific world after copied.

### 3.2 World-Specific Templates / 世界观专属模板

Purpose:

- define the active profile structure for one worldview;
- customize field labels, options, and meanings for that world;
- serve as the primary template source when Contacts creates or edits a profile in that world.

Examples:

- one ABO world may define `信息素 / pheromone`, `第二性别 / secondary gender`, and `标记关系 / bond mark`;
- one xianxia world may define `境界 / cultivation stage`, `灵根 / spiritual root`, and `宗门 / sect`.

## 4. V1 Field Types

V1 should support five field types.

### 4.1 Short Text / 短文本

Used for compact values.

Examples:

- pheromone;
- spirit animal;
- spiritual root;
- position;
- species.

### 4.2 Long Text / 长文本

Used for narrative or explanatory values.

Examples:

- relationship setting;
- character background;
- ability description;
- taboo or boundary.

### 4.3 Single Select / 单选

Used when the world defines one option from a list.

Examples:

- ABO secondary gender;
- faction;
- job type;
- identity type.

### 4.4 Multi Select Or Tags / 多选或标签

Used for flexible grouped attributes.

Examples:

- ability tags;
- preference tags;
- organization links;
- risk keywords.

### 4.5 Person Reference / 人物关联

Used when a field points to another Contacts entity.

Examples:

- parent;
- mentor;
- sect sibling;
- ex-partner;
- enemy;
- bonded target.

## 5. Shared Field Properties

Every template field should support:

- field id;
- label;
- description/help text;
- field type;
- default visibility level;
- entity-type availability;
- whether the field is required for a template;
- whether it is recommended but optional;
- display order.

## 6. Visibility Levels

Fields should support visibility levels because `Self Profile / 用户自我档案` controls what different AI roles or NPCs can know about the user.

Recommended levels:

1. `public / 公开资料`
2. `familiar / 熟人资料`
3. `intimate / 亲密资料`
4. `hidden / 隐藏资料`
5. `world_specific / 世界观资料`

V1 control model:

- section-level visibility first;
- field-level visibility as advanced editing.

Example:

- `信息素 / pheromone` can default to `familiar`;
- `特殊周期 / special cycle` can be set to `intimate`.

## 7. Entity-Type Availability

Templates use one shared system, but fields can declare where they are available.

Entity types:

- `self_profile`
- `main_role`
- `npc`

Important rule:

- entity-type availability should guide defaults, not create hard structural walls.

NPCs can still have personal style, relationship notes, relationship position, and lightweight continuity. They simply do not default to the full main-role progression stack.

## 8. V1 World Context Limit

V1 should allow one primary WorldBook/template context per profile.

Recommended profile links:

- `primaryWorldId / 主世界观`
- `profileTemplateId / 当前档案模板`
- `profileTemplateVersion / 档案模板版本`
- optional `knowledgePointIds / 补充知识点`

Rules:

1. One profile has one primary world/template context in V1.
2. Additional WorldBook knowledge points can supplement background and Chat context.
3. Additional knowledge points must not add or overwrite profile structure.
4. If a user wants `ABO + xianxia + workplace`, they should create one combined world-specific template.

Reason:

- multiple active templates would create field conflicts;
- AI context would not know which world rules take priority;
- one primary context keeps role creation and sync understandable.

## 9. Template Versioning

Templates must be versioned.

Profiles created from a template should remember:

- template id;
- template version;
- copied field ids;
- copied labels;
- user-filled values.

When a WorldBook template changes, existing profiles must not be silently overwritten.

Review choices:

1. add new fields only;
2. sync field labels/options where safe;
3. keep old version;
4. save current profile structure as a role-specific template.

Hard rule:

- template changes must never silently erase or rewrite user-entered profile values.

## 10. Template Application Flow

When Contacts creates or edits a profile:

1. Contacts reads the selected primary world/template.
2. Contacts shows suggested extensible sections.
3. The user chooses which sections/fields to apply.
4. Contacts copies the template field definitions needed for that profile.
5. Contacts stores profile-specific values.
6. Later template updates require review before syncing.

Soft-binding rule:

- users can apply a template;
- bind only the world context without applying a template;
- add custom fields manually.

## 11. Future Onboarding And User Manual Rule

The project does not currently have a complete onboarding system or user manual system.

When those systems are built later, they should explain this recommended path:

1. create or choose a worldview in WorldBook;
2. generate a role-profile template from that worldview;
3. show selectable template fields;
4. read Settings user information;
5. create a first `Self Profile / 用户自我档案`;
6. let the user review and edit it;
7. save it as a reusable standard template or apply it to other profiles.

Onboarding must not block normal Chat usage.

Recommended modes:

- `Quick Start / 快速开始`: use a default modern template, fill world-specific structure later.
- `Recommended Setup / 推荐设置`: create worldview, generate template, create self profile, then create roles/NPCs.
- `Deep Setting / 深度设定`: edit templates, configure visibility, generate several role-type templates.

## 12. Non-Goals For V1

Do not include in V1:

- strong typed numeric fields;
- date/time field engine;
- formula or cycle-calculation engine;
- automatic multi-template stacking;
- automatic profile rewriting after template changes;
- full onboarding implementation;
- full user manual implementation.

Concepts like heat cycles, cultivation levels, or ability stats can use text/select/tags until real calculation needs appear.

## 13. Acceptance Criteria

This design is ready for implementation planning when:

1. WorldBook template ownership is clear.
2. Contacts value ownership is clear.
3. V1 field types are limited and concrete.
4. template updates cannot silently overwrite profile values.
5. the one-primary-world rule is accepted.
6. onboarding/user-manual rules are marked future, not current implementation.
