# WorldBook Contacts Profile Fields V1.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `schatphone-workflow` first. Use a plan/execution skill if available, then implement task-by-task with checkbox tracking. Do not skip the package handoff docs.

**Goal:** Make the WorldBook profile-template to Contacts role-profile flow comfortable enough for real users: WorldBook defines the fields a world needs, while Contacts lets users fill, review, and later AI-assist concrete values for roles, self profile, and NPCs.

**Architecture:** Keep the ownership split strict. `WorldBook` owns reusable field templates and current-world template availability. `Contacts` owns concrete per-person values through `templateLink/profileValues`. Chat, Event Runtime, and relationship systems may consume normalized profile context only through their existing contracts; they must not become the authoring surface for these values.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils, Playwright, Vite.

---

## 1. Current Progress

This handoff is for resuming the `世界书 / WorldBook` and `通讯录 / Contacts` profile-field line on another machine.

Already landed:

1. `世界书 / WorldBook` has a `角色档案模板 / Role profile templates` panel.
2. WorldBook can copy built-in presets, including the ABO-style template, into the current world.
3. WorldBook explains the product boundary: it defines fields, it does not fill a concrete person's values.
4. WorldBook has a product-facing handoff button that opens Contacts with `from=worldbook&focus=profile_templates`.
5. Contacts recognizes that handoff route and shows a focused note plus a new-profile action.
6. Contacts role detail now has a V1 `世界字段 / World profile fields` editor.
7. The Contacts editor can:
   - choose a current-world WorldBook template;
   - fill concrete values for the selected Self Profile, Main Role, or NPC;
   - set visibility levels;
   - save values back to the role profile;
   - preserve out-of-template legacy/custom values instead of silently deleting them.
8. The basic product chain was tested in a simulated 390px phone viewport:
   - copy ABO preset in WorldBook;
   - open Contacts from WorldBook;
   - create a role profile;
   - edit `世界字段 / World profile fields`;
   - save and display the value;
   - no page errors, no horizontal overflow, no page-level mojibake.

Primary files already touched by this line:

1. `src/views/WorldBookView.vue`
2. `src/views/ContactsView.vue`
3. `tests/worldbook-profile-template-view.test.js`
4. `tests/contacts-profile-template-view.test.js`
5. `docs/pm/contacts-relationship-system-v2/README.md`
6. `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
7. `docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md`
8. `docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md`
9. `docs/pm/visual-and-ia-governance/README.md`
10. `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

## 2. Read First On Another Machine

Read in this order before editing:

1. `docs/process/AI_WORK_MODE.md`
2. `docs/README.md`
3. `docs/overview/PROJECT_MASTER_GUIDE.md`
4. `docs/roadmap/TODO_ROADMAP.md`
5. `docs/pm/TASK_PACKAGE_INDEX.md`
6. `docs/pm/contacts-relationship-system-v2/README.md`
7. `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
8. `docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md`
9. `docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md`
10. `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
11. `docs/superpowers/plans/2026-05-19-worldbook-contacts-profile-template-plan.md`
12. this file

Then inspect:

1. `src/views/WorldBookView.vue`
2. `src/views/ContactsView.vue`
3. `src/lib/profile-template-schema.js`
4. `src/stores/system.js`
5. `src/stores/chat.js`
6. `tests/worldbook-profile-template-view.test.js`
7. `tests/contacts-profile-template-view.test.js`
8. `tests/profile-template-schema.test.js`
9. `tests/worldbook-profile-templates-store.test.js`

## 3. Validation Baseline

Before changing code on another machine, run:

```powershell
git status --short
npm.cmd install
npm.cmd exec -- playwright install chromium
npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js
npm.cmd run test:e2e
```

Expected current baseline:

1. focused profile-template tests pass;
2. `npm.cmd run test:e2e` passes with 14 tests;
3. if `npm.cmd install` is unnecessary because dependencies already exist, skip it;
4. if the Vite build later shows the known `src/lib/push.js` dynamic/static import note, treat it as informational unless the command exits non-zero.

For meaningful behavior changes, also run:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test
```

## 4. Immediate Next Slice

Recommended next order:

1. First convert the manual phone-viewport chain into a committed Playwright E2E guardrail.
2. Then improve the Contacts editor controls for richer field types.
3. Then add template-change review so users understand what will be preserved, overwritten, or left as custom values.
4. Then add AI-assisted value completion as a reviewable draft, not an auto-save.
5. Only after the Contacts value-authoring loop feels clear should the WorldBook template authoring UI become more form-builder-like.

### Task 1: Add E2E Coverage For The WorldBook To Contacts Value Flow

**Files:**

- Create: `e2e/worldbook-contacts-profile-fields.spec.js`
- Modify only if needed: `playwright.config.js`

- [ ] **Step 1: Add the E2E flow**

Create a test that:

1. seeds Chinese language through localStorage;
2. unlocks the phone shell;
3. opens `/#/worldbook`;
4. switches to Profile Templates;
5. copies `preset_abo`;
6. opens Contacts through `worldbook-open-contacts-for-templates`;
7. creates a role profile;
8. opens `contacts-world-profile-fields-editor`;
9. fills the `pheromone` field;
10. sets visibility to `intimate`;
11. saves;
12. asserts the saved value is visible;
13. checks no horizontal overflow;
14. checks no page errors.

- [ ] **Step 2: Run only the new E2E file**

```powershell
npm.cmd run test:e2e -- e2e/worldbook-contacts-profile-fields.spec.js
```

Expected: pass in desktop Chromium and mobile Chromium projects if the config runs both.

- [ ] **Step 3: Run the existing E2E suite**

```powershell
npm.cmd run test:e2e
```

Expected: all E2E tests pass.

### Task 2: Improve Field Widgets In Contacts

**Files:**

- Modify: `src/views/ContactsView.vue`
- Modify: `tests/contacts-profile-template-view.test.js`

- [x] **Step 1: Add tests for field-type behavior**

Cover at least:

1. `multi_select_tags` accepts comma-separated tags and saves an array-like normalized value.
2. `person_reference` has copy that tells users to enter a related person or role ID.
3. `long_text` renders as a multi-line input.
4. `single_select` renders known options.

- [x] **Step 2: Improve the editor**

Keep the V1 data model. Do not introduce a new store just for field editing.

User-facing behavior should be:

1. short text fields feel like normal inputs;
2. long text fields feel like notes;
3. multi-tag fields clearly say tags are separated by commas;
4. person-reference fields do not pretend to be a finished relationship picker until the product has a real picker decision;
5. visibility controls remain close to each field.

- [x] **Step 3: Validate**

```powershell
npm.cmd run test -- tests/contacts-profile-template-view.test.js tests/profile-template-schema.test.js
```

Expected: pass.

Actual on 2026-06-03: `npm.cmd run test -- tests/contacts-profile-template-view.test.js tests/profile-template-schema.test.js` passed with 2 files / 15 tests.

### Task 3: Add Template-Change Review

**Files:**

- Modify: `src/views/ContactsView.vue`
- Modify: `tests/contacts-profile-template-view.test.js`

- [x] **Step 1: Add tests for changing templates**

Test this product behavior:

1. A profile already has values from template A.
2. The user opens the editor and changes to template B.
3. Fields that still exist in template B stay editable.
4. Fields that do not exist in template B are shown as preserved custom/out-of-template values after save.
5. The UI warns the user before save that template-owned fields in the chosen template will be updated, while unrelated custom values are preserved.

- [x] **Step 2: Add a review panel or warning block**

The warning should be user-facing, not schema-facing:

1. "这些字段会更新到当前角色档案。"
2. "不属于这个模板的旧字段会保留为自定义字段。"
3. "如需删除旧字段，请在角色档案中单独清理。"

- [x] **Step 3: Validate**

```powershell
npm.cmd run test -- tests/contacts-profile-template-view.test.js tests/contacts-profile-entities-store.test.js
```

Expected: pass.

Actual on 2026-06-03: `npm.cmd run test -- tests/contacts-profile-template-view.test.js` passed with 11 tests for template-change review, preserved custom fields, and existing Contacts profile-template behavior.

### Task 4: Add AI-Assisted Value Completion As Draft Only

**Files:**

- Create: `src/lib/profile-template-value-assistant.js`
- Create: `tests/profile-template-value-assistant.test.js`
- Modify: `src/views/ContactsView.vue`
- Modify: `tests/contacts-profile-template-view.test.js`

- [x] **Step 1: Add a pure helper test**

The helper should build a prompt from:

1. current-world template fields;
2. selected profile name, role, entity type, and existing bio;
3. user/self information when available;
4. existing profile values;
5. a hard rule that AI suggestions are draft-only and must not overwrite manual values without user confirmation.

- [x] **Step 2: Implement the helper**

Keep the helper pure where possible. Route actual provider calls through the existing `src/lib/ai.js` seam if UI calls are added.

- [x] **Step 3: Add Contacts UI entry**

The user-facing action should mean:

1. "AI 帮我起草这些字段";
2. suggested values fill the current draft, not the saved profile;
3. user can edit suggestions before saving;
4. manual saved values stay higher-priority than AI suggestions.

- [x] **Step 4: Validate**

```powershell
npm.cmd run test -- tests/profile-template-value-assistant.test.js tests/contacts-profile-template-view.test.js
```

Expected: pass.

Actual on 2026-06-03: `npm.cmd run test -- tests/profile-template-value-assistant.test.js tests/contacts-profile-template-view.test.js` passed with 2 files / 16 tests. AI suggestions fill only the current Contacts editor draft, skip saved/manual values, and require the user to press Save before `profileValues` change.

### Task 4.5: Add Contacts-Side Current-World Template Adaptation Draft

**Files:**

- Create: `src/lib/profile-template-adaptation-assistant.js`
- Create: `tests/profile-template-adaptation-assistant.test.js`
- Modify: `src/views/ContactsView.vue`
- Modify: `tests/contacts-profile-template-view.test.js`

- [x] **Step 1: Detect profiles that need current-world adaptation**

Contacts now flags a profile when it has no template, uses an unavailable template, uses an older saved template version, or uses a template from another world. The review recommends the best current-world template without changing WorldBook.

- [x] **Step 2: Add AI adaptation as an editor draft**

The AI helper reads the source template, target template, selected profile, user context, and existing values. It returns target-template field suggestions only. Contacts opens the world-field editor on the recommended template, fills empty draft fields, keeps already-filled/manual values, and preserves out-of-template old values as custom fields.

- [x] **Step 3: Validate**

```powershell
npm.cmd run test -- tests/profile-template-adaptation-assistant.test.js
npm.cmd run test -- tests/profile-template-adaptation-assistant.test.js tests/contacts-profile-template-view.test.js
npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js tests/profile-template-value-assistant.test.js tests/profile-template-adaptation-assistant.test.js
```

Actual on 2026-06-03: helper tests passed with 4 tests; helper + Contacts tests passed with 2 files / 17 tests; focused suite passed with 8 files / 44 tests. Manual Playwright phone-viewport check at 390px also passed for the adaptation review card with no horizontal overflow and no page/console errors.

### Task 5: Sync Handoff Docs

**Files:**

- Modify: `docs/pm/contacts-relationship-system-v2/README.md`
- Modify: `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
- Modify: `docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md`
- Modify: `docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md`
- Modify: `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md` if UX or mobile IA changed

- [x] **Step 1: Record what changed in product language**

Use Chinese module names first:

1. `世界书 / WorldBook`
2. `通讯录 / Contacts`
3. `角色档案模板 / Role profile templates`
4. `世界字段 / World profile fields`

- [x] **Step 2: Record validation**

Add exact commands and outcomes. If a command fails because of unrelated local changes, record the failure and do not hide it.

- [ ] **Step 3: Commit in a coherent slice**

Commit after tests pass and docs are synced.

## 5. Product Guardrails

Do not do these in the next slice:

1. Do not make WorldBook store concrete role/self/NPC values.
2. Do not move role-profile editing into Chat Directory.
3. Do not make Self Profile look like an AI-romance target.
4. Do not let NPC lose relationship/social capability entirely; NPC can later upgrade to Main Role.
5. Do not use profile fields as event-decision truth. Event eligibility belongs to the event/runtime relationship gate line.
6. Do not auto-overwrite user-entered values with AI suggestions.
7. Do not delete out-of-template values just because a user switches templates.
8. Do not expose backend terms such as `templateLink`, `profileValues`, `fieldId`, or route query names in ordinary UX copy.

## 6. Copy-Ready Prompt For Another AI Programmer

Use this prompt when starting on another device:

```text
当前库已更新。请按 SchatPhone 流程接手，不要从聊天记录猜需求。先读 docs/process/AI_WORK_MODE.md、docs/pm/contacts-relationship-system-v2/README.md、docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md、docs/pm/contacts-relationship-system-v2/ROLE_HUB_INFORMATION_ARCHITECTURE.md、docs/pm/contacts-relationship-system-v2/IMPLEMENTATION_WORKSTREAMS.md，以及 docs/superpowers/plans/2026-06-02-worldbook-contacts-profile-fields-next-plan.md。

继续推进「世界书角色档案模板 -> 通讯录世界字段」V1.1。当前 V1 已完成：世界书定义字段，通讯录填写具体角色/用户/NPC 值，并已通过 focused tests、完整 E2E 和手机宽度走查。请先运行 git status --short 和 focused tests，确认现状，不要回滚无关改动。

下一步按计划做：1. 把手工手机链路固化为 E2E；2. 优化通讯录世界字段控件；3. 增加模板变更 review；4. 增加 AI 辅助补全但只作为草稿；5. 每轮结束同步 Contacts/Visual handoff 文档并记录验证结果。必须保持边界：WorldBook 只定义模板，Contacts 只保存具体值，Chat Directory 不接管角色档案，AI 不自动覆盖用户手动输入。
```

## 7. Local State Note

At the time this file was written, the local worktree also contained parallel changes in App Store, Food Delivery, Home, Appearance, WorldBook, and related tests. Before continuing on another device, run `git status --short` and separate unrelated work instead of reverting it.
