# WorldBook -> Contacts Profile Fields Handoff

Updated: 2026-06-03

Use this file when resuming the WorldBook role-profile-template to Contacts world-field line on another machine.

## Product State

The usable V1 chain is now mostly in place:

1. WorldBook defines role profile templates. It does not fill concrete role, self-profile, or NPC values.
2. Contacts owns concrete values for each profile through its world-field editor.
3. Contacts first screen now behaves more like a real phone contacts app: Search, My Profile, Recent interactions, Main Roles, then NPC / World Roles.
4. Contacts world-field editor supports stable controls for different field types:
   - short text;
   - long notes;
   - single choice;
   - comma-separated tags with preview;
   - person/role reference text entry.
5. Switching templates has a save-review card. Old values outside the new template stay visible as custom fields instead of being silently deleted.
6. AI can draft empty field values inside the editor. These are drafts only; saved/manual values are skipped and the user must press Save.
7. Contacts now detects template mismatch cases:
   - no template;
   - unavailable template;
   - older saved template version;
   - template from another world.
8. For mismatch cases, Contacts shows a soft current-world adaptation card. It recommends a current-world template, shows reusable/custom-preserved counts, and can ask AI to draft migrated values into the existing editor. AI still does not save, delete, or overwrite filled/manual values.

## Current Boundary

Keep these rules intact:

1. WorldBook owns reusable template definitions and current-world template availability.
2. Contacts owns concrete per-person values.
3. Chat Directory must not become a role-profile authoring surface.
4. AI suggestions are draft-only.
5. Manual/saved user values always outrank AI suggestions.
6. Out-of-template values are preserved as custom fields unless a later explicit cleanup flow is added.
7. Profile fields are profile context, not event-decision truth.

## Important Files

Main implementation:

1. `src/views/ContactsView.vue`
2. `src/lib/profile-template-value-assistant.js`
3. `src/lib/profile-template-adaptation-assistant.js`

Main tests:

1. `tests/contacts-profile-template-view.test.js`
2. `tests/profile-template-value-assistant.test.js`
3. `tests/profile-template-adaptation-assistant.test.js`
4. `e2e/contacts-phone-ui.spec.js`

Main handoff docs:

1. `docs/superpowers/plans/2026-06-02-worldbook-contacts-profile-fields-next-plan.md`
2. `docs/pm/contacts-relationship-system-v2/README.md`
3. `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
4. `docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md`
5. `docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md`
6. `docs/pm/visual-and-ia-governance/README.md`
7. `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

## Validation Already Run

On 2026-06-03:

1. `npm.cmd run test -- tests/profile-template-value-assistant.test.js tests/contacts-profile-template-view.test.js`
   - Passed: 2 files / 16 tests.
2. `npm.cmd run test -- tests/profile-template-adaptation-assistant.test.js`
   - Passed: 4 tests.
3. `npm.cmd run test -- tests/profile-template-adaptation-assistant.test.js tests/contacts-profile-template-view.test.js`
   - Passed: 2 files / 17 tests.
4. `npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js tests/profile-template-value-assistant.test.js tests/profile-template-adaptation-assistant.test.js`
   - Passed: 8 files / 44 tests.
5. `npm.cmd run lint`
   - Passed.
6. `npm.cmd run build`
   - Passed. Vite still reports the pre-existing mixed static/dynamic import warning for `src/lib/push.js`.
7. Manual Playwright phone-width checks at 390px:
   - Contacts AI draft button layout: no horizontal overflow.
   - Contacts template-adaptation review card: no horizontal overflow and no page/console errors.

## What Is Still Not Done

Do these next, in this order unless product direction changes:

1. Add the missing committed E2E for the full WorldBook -> Contacts value flow:
   - copy/create a WorldBook profile template;
   - open Contacts from the handoff;
   - create/select a profile;
   - fill world fields;
   - save and verify display;
   - check phone width and no page errors.
2. Harden template adaptation review into a more explicit visual diff:
   - fields that carry over;
   - AI-drafted new fields;
   - fields preserved as custom;
   - fields not touched.
3. Replace the current Contacts-side `default_world` assumption with the real current-world ID once WorldBook/current-world state is stable enough to consume without colliding with parallel WorldBook work.
4. Add stronger failure and empty states for AI adaptation:
   - no recommended template;
   - AI returns no usable mappings;
   - selected template has no fields for Self Profile/Main Role/NPC.
5. Continue WorldBook template authoring polish:
   - current UI is still compact V1, not a full form builder;
   - avoid doing this in Contacts;
   - avoid changing WorldBook files while another worker is actively modifying that area.
6. Do true-device testing after the simulated checks:
   - touch feel;
   - browser chrome/safe area;
   - keyboard behavior in the editor;
   - weak-network AI waiting state.

## Resume Checklist

On another machine:

```powershell
git pull
git status --short
npm.cmd install
npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js tests/profile-template-value-assistant.test.js tests/profile-template-adaptation-assistant.test.js
npm.cmd run lint
npm.cmd run build
```

If dependencies are already installed, `npm.cmd install` can be skipped.

## Copy-Ready Prompt For Another AI Worker

```text
请按 SchatPhone 流程接手，不要从聊天记录猜需求。先读 docs/process/AI_WORK_MODE.md、docs/pm/contacts-relationship-system-v2/README.md、docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md、docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md、docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md、docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md，以及 docs/superpowers/plans/2026-06-03-worldbook-contacts-profile-fields-handoff.md。

当前 WorldBook -> Contacts 世界字段链路已经做到：WorldBook 定义模板，Contacts 填具体角色/用户/NPC 值；Contacts 手机式入口、字段类型控件、模板变更保存前 review、AI 字段草稿、以及 Contacts 侧当前世界模板适配草稿都已完成并通过 focused tests、lint、build 和 390px 手机宽度检查。

下一步优先做：1. 补完整 WorldBook -> Contacts 值填写链路 E2E；2. 把模板适配 review 做成更明确的可视化 diff；3. 等 WorldBook 当前世界状态稳定后，把 Contacts 里的 default_world 假设换成真实当前世界 ID；4. 再推进 WorldBook 模板编辑器/表单构建能力。

必须保持边界：WorldBook 只定义模板，Contacts 只保存具体值，Chat Directory 不接管角色档案，AI 不自动保存、不删除旧字段、不覆盖用户手动输入。
```
