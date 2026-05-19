# Role Profile Template System Spec Index / 角色档案模板系统规格索引

Updated: 2026-05-19

Status: `PLAN_READY`

This index connects the two formal specs created after the Contacts V2 detail IA and WorldBook-driven role-profile-template grilling phase.

Source decision log:

- `docs/pm/contacts-relationship-system-v2/ROLE_PROFILE_TEMPLATE_DECISION_LOG.md`

Implementation plan:

- `docs/superpowers/plans/2026-05-19-worldbook-contacts-profile-template-plan.md`

## 1. Spec Split

The design is intentionally split into two specs.

### WorldBook Role Profile Templates

Spec:

- `docs/superpowers/specs/2026-05-19-worldbook-role-profile-templates-design.md`

Owns:

- global preset templates;
- world-specific templates;
- profile template fields;
- field types;
- template versioning;
- template update review;
- future onboarding/user-manual rules related to templates.

Product sentence:

> WorldBook defines what a world needs a profile to know.

### Contacts Profile Entities

Spec:

- `docs/superpowers/specs/2026-05-19-contacts-profile-entities-design.md`

Owns:

- `Self Profile / 用户自我档案`;
- `Main Role / 主角色`;
- `NPC / 世界角色`;
- Contacts detail IA;
- profile values filled from templates;
- manual-vs-event-attached priority;
- memory and relationship boundaries;
- Chat Directory binding boundary;
- NPC to Main Role upgrade.

Product sentence:

> Contacts stores who each person is inside the world.

## 2. Implementation Dependency

The implementation should not begin from old TODO documents.

The implementation plan is now created at:

- `docs/superpowers/plans/2026-05-19-worldbook-contacts-profile-template-plan.md`

Execute from that plan, not from frozen historical TODO documents.

Recommended plan order:

1. data model and migration plan;
2. WorldBook template authoring baseline;
3. Contacts entity type baseline;
4. Contacts template application and value storage;
5. Chat context assembly gates;
6. NPC upgrade flow;
7. tests and docs sync.

## 3. Non-Goals For The First Implementation Plan

Do not include these in the first implementation plan unless the user explicitly expands scope:

- full user manual system;
- full new-user onboarding product;
- numeric/date/formula field engine;
- automatic multi-world template stacking;
- automatic overwriting of existing profile values after template updates;
- turning service accounts into main Contacts entities.

## 4. Review Checklist

Before implementation execution, confirm:

1. the spec split is acceptable;
2. WorldBook template responsibilities are clear;
3. Contacts entity responsibilities are clear;
4. no existing Contacts/Chat Directory boundary is contradicted;
5. `Self Profile`, `Main Role`, and `NPC` meanings are understandable to product and engineering;
6. the executor has read the implementation plan path listed above.
