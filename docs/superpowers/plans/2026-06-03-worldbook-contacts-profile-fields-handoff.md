# WorldBook -> Contacts Profile Fields Handoff

Updated: 2026-06-03

Use this file when resuming the `世界书 / WorldBook` role-profile-template to `通讯录 / Contacts` world-field line on another machine.

## Product State

The usable V1 chain is now in place with a committed regression guardrail:

1. `世界书 / WorldBook` defines role profile templates. It does not fill concrete role, self-profile, or NPC values.
2. `通讯录 / Contacts` owns concrete world-field values for each profile through its role detail editor.
3. Contacts first screen behaves like a phone contacts app: Search, My Profile, Recent interactions, Main Roles, then NPC / World Roles.
4. Contacts world-field editor supports stable controls for different field types:
   - short text;
   - long notes;
   - single choice;
   - comma-separated tags with preview;
   - person/role reference text entry.
5. Switching templates has a save-review card. Old values outside the new template stay visible as custom fields instead of being silently deleted.
6. AI can draft empty field values inside the editor. These are drafts only; saved/manual values are skipped and the user must press Save.
7. Contacts detects template mismatch cases:
   - no template;
   - unavailable template;
   - older saved template version;
   - template from another world.
8. For mismatch cases, Contacts shows a soft current-world adaptation card. It recommends a current-world template, shows reusable/custom-preserved counts, and can ask AI to draft migrated values into the existing editor. AI still does not save, delete, or overwrite filled/manual values.
9. The full WorldBook -> Contacts value flow is now covered by Playwright E2E on desktop and mobile Chromium: copy a WorldBook preset, open Contacts from the handoff, create a role profile, fill concrete world fields, save, verify display, and check phone-width overflow/page errors.

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
5. `e2e/worldbook-contacts-profile-fields.spec.js`

Main handoff docs:

1. `docs/superpowers/plans/2026-06-02-worldbook-contacts-profile-fields-next-plan.md` - original execution plan and completed-task record
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
8. `npm.cmd run test:e2e -- e2e/worldbook-contacts-profile-fields.spec.js`
   - Passed: 2 tests across desktop Chromium and mobile Chromium.
9. `npm.cmd run test:e2e`
   - Passed: 18 tests across desktop Chromium and mobile Chromium.

## What Is Still Not Done

Do these next, in this order unless product direction changes:

1. Harden template adaptation review into a more explicit visual diff:
   - fields that carry over;
   - AI-drafted new fields;
   - fields preserved as custom;
   - fields not touched.
2. Replace the current Contacts-side `default_world` assumption with the real current-world ID once WorldBook/current-world state is stable enough to consume without colliding with parallel WorldBook work.
3. Add stronger failure and empty states for AI adaptation:
   - no recommended template;
   - AI returns no usable mappings;
   - selected template has no fields for Self Profile/Main Role/NPC.
4. Continue WorldBook template authoring polish:
   - current UI is still compact V1, not a full form builder;
   - avoid doing this in Contacts;
   - avoid changing WorldBook files while another worker is actively modifying that area.
5. Do true-device testing after the simulated checks:
   - touch feel;
   - browser chrome/safe area;
   - keyboard behavior in the editor;
   - weak-network AI waiting state.

## Next Execution Task Package

Start with the template-adaptation visual diff. Treat this as a product-clarity task, not a new data-model task.

### Task A: Contacts Template Adaptation Visual Diff

Goal: when a role profile needs to move from an old/missing/other-world template to the current-world template, the user should understand exactly what will happen before asking AI to draft or pressing Save.

User-facing acceptance:

1. Contacts shows a clear review card before adaptation work starts.
2. The review separates at least four groups:
   - carried over: old values that match fields in the recommended template;
   - AI draft candidates: fields that can be drafted because they are empty or new;
   - preserved custom: old fields that do not belong to the recommended template and will stay visible as custom values;
   - untouched: saved/manual values that AI will not overwrite.
3. Copy must explain user meaning first: "these details will continue", "these can be drafted", "these old details will be kept separately".
4. Do not expose backend words such as `templateLink`, `profileValues`, `fieldId`, route query names, or migration internals in ordinary UX copy.
5. AI adaptation remains draft-only: no auto-save, no deletion, no overwrite of filled/manual values.
6. Add or update focused tests for the grouping and user-visible copy.
7. Keep the existing `e2e/worldbook-contacts-profile-fields.spec.js` passing.

Likely files:

1. `src/views/ContactsView.vue`
2. `tests/contacts-profile-template-view.test.js`
3. `tests/profile-template-adaptation-assistant.test.js` if helper output needs richer grouping
4. `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
5. `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

### Task B: Current World ID Replacement

Do this only after WorldBook current-world state is stable enough to consume without colliding with parallel WorldBook work.

Acceptance:

1. Contacts no longer hardcodes the current-world template list to `default_world` when a real active/current world ID is available.
2. Existing default-world behavior still works as fallback.
3. Template mismatch detection still distinguishes no template, unavailable template, old version, and other-world template.
4. Add regression tests for active-world and fallback-world behavior.

### Task C: AI Adaptation Empty And Failure States

Acceptance:

1. No recommended template: user sees a plain explanation and a path back to WorldBook template setup.
2. Recommended template has no fields for Self Profile/Main Role/NPC: user sees why no fields can be drafted.
3. AI returns no usable mappings: editor stays open, user can still fill manually, and no saved value changes.
4. Weak-network/loading state stays readable on phone width.

### Task D: Later WorldBook Template Authoring Polish

Do not start this before Task A is delivered unless product direction changes.

Acceptance direction:

1. WorldBook can eventually create/edit template fields through a form-builder-quality UI.
2. Contacts remains the place for concrete person values.
3. Self Profile, Main Role, and NPC applicability must stay understandable to non-technical users.

## Resume Checklist

On another machine:

```powershell
git pull
git status --short
npm.cmd install
npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js tests/profile-template-value-assistant.test.js tests/profile-template-adaptation-assistant.test.js
npm.cmd run test:e2e -- e2e/worldbook-contacts-profile-fields.spec.js
npm.cmd run lint
npm.cmd run build
```

If dependencies are already installed, `npm.cmd install` can be skipped.

## Copy-Ready Prompt For Another AI Worker

```text
请按 SchatPhone 流程接手，不要从聊天记录猜需求。先读 `docs/process/AI_WORK_MODE.md`、`docs/pm/contacts-relationship-system-v2/README.md`、`docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`、`docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md`、`docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md`、`docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`，以及 `docs/superpowers/plans/2026-06-03-worldbook-contacts-profile-fields-handoff.md`。

当前 WorldBook -> Contacts 世界字段链路已到可回归状态：WorldBook 只定义角色档案模板，Contacts 给具体的用户档案、主角色、NPC 填写世界字段。Contacts 已有手机联系人式入口、字段类型控件、模板变更保存前 review、AI 字段草稿、当前世界模板适配草稿，并已新增 `e2e/worldbook-contacts-profile-fields.spec.js` 覆盖完整链路。AI 仍然只生成草稿，不自动保存、不删除旧字段、不覆盖用户手动输入。

下一步优先做：1. 把模板适配 review 做成产品经理和用户能看懂的可视化 diff；2. 等 WorldBook 当前世界状态稳定后，把 Contacts 里的 `default_world` 假设换成真实当前世界 ID；3. 补强 AI 适配失败/空状态；4. 后续再推进 WorldBook 模板编辑器/表单构建能力。继续保持边界：WorldBook 只定义模板，Contacts 只保存具体值，Chat Directory 不接管角色档案，事件判定不直接读取用户随手写的档案文本。
```
