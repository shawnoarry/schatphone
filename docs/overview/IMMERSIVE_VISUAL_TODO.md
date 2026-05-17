# Immersive Visual TODO / 沉浸式视觉 TODO

Updated / 更新时间: 2026-05-16

## 1. Purpose / 用途

This is the active short-term board for the current visual-specialist track. It gathers the visual tasks that emerged from the native-system / installed-app split, the system-controlled Home folder direction, the Shopping platform-app change, and the Food Delivery baseline review.

本文是当前“视觉专项”的短中期执行板，用于收束本机系统 / 装载 APP 分层、系统受控主屏文件夹、Shopping 平台化入口、Food Delivery 功能基线等后续视觉任务。

Authority note / 职责说明:

- Use visible user entry ownership to decide visual ownership. Do not judge only by code/module ownership.
- Home folder shell belongs to the native system layer.
- Entries inside a Home folder may be installed app identities.
- Shared stores may remain shared, but the user-facing surface must preserve immersion.
- Audit visible copy. Do not expose development notes, source keys, handoff rules, or implementation labels unless the surface is explicitly a developer/admin tool.
- Return buttons must name the real target context and preserve visible entry source.
- Widget Center is a library/import/create surface; Home widget edit mode owns slot replacement.

---

## 2. Current Working State / 当前工作状态

### Recently changed but not yet committed / 最近已改但尚未提交

- 2026-05-16 commit `e73cf06` froze the current immersive visual workflow and Shopping platform-folder transition.
- Shopping Home folder child entries now point to platform-like app entries instead of product categories.
- Current first-level Shopping entries: `Schat Mall`, `Style Cloud`, `Nova Digital`, `Daily Fresh`.
- `ShoppingView` now reads `service` and presents the selected platform as the active app identity.
- Product/category shelves remain inside the selected Shopping platform app.
- Docs have been partially updated in:
  - `docs/product-decisions/HOME_FOLDER_SHOPPING_ASSETS_DIRECTION.md`
  - `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`

Recommended first action / 建议第一步:

1. Keep the Shopping platform-folder slice as the current baseline.
2. Continue with the visual tasks below.

---

## 3. P0 Tasks / 最高优先级

### P0.1 Commit Current Shopping Folder Platformization

Goal / 目标:

- Freeze the current logical transition before visual changes mix with it.

Status / 状态:

- Done in commit `e73cf06`.

Files currently involved / 当前相关文件:

- `src/lib/home-entry-registry.js`
- `src/lib/planned-module-registry.js`
- `src/views/ShoppingView.vue`
- `tests/home-folder-entry.test.js`
- `tests/planned-module-registry.test.js`
- `tests/shopping-view.test.js`
- `docs/product-decisions/HOME_FOLDER_SHOPPING_ASSETS_DIRECTION.md`
- `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`

Validation already run / 已验证:

- `npm.cmd test -- --run tests/planned-module-registry.test.js`
- `npm.cmd test -- --run tests/home-folder-entry.test.js`
- `npm.cmd test -- --run tests/shopping-view.test.js`

### P0.2 Update Visual Ownership Docs

Goal / 目标:

- Make the visual ownership map match the current product direction.

Rules to record / 需要记录的规则:

- Home folder tile and folder overlay: Native System.
- Shopping folder children: Installed App identities, not system settings.
- Shopping page under `service`: selected platform app shell.
- Shopping categories: platform-internal shelves.
- Food Delivery currently remains a folder-backed module with category entries, but may later shift to platform-app entries.

Recommended files / 建议文件:

- `docs/design/VISUAL_ENTRY_OWNERSHIP_MAP.md`
- `docs/design/DESIGN.md`
- `docs/process/VISUAL_WORKFLOW.md`

### P0.3 Clean Historical Conflicts

Goal / 目标:

- Prevent future workers from treating old category-folder notes as current direction.

Known stale places / 已知旧描述:

- `docs/roadmap/TODO_ROADMAP.md` still contains older notes saying the Shopping Home folder exposes category entries from `SHOPPING_CATEGORY_ENTRIES`.
- Some overview docs still describe Home folder immersion as only a visual/navigation layer without the newer platform-app entry framing.

Scope guidance / 范围:

- Do not rewrite the whole roadmap.
- Add current-state notes or mark old sections as historical transition records.

---

## 4. P1 Visual Tasks / 第一阶段视觉任务

### P1.1 System-Controlled Home Folder Visual

Owner / 归属:

- Native System / Home / Appearance.

Goal / 目标:

- Make the Home folder feel like a real phone OS folder, not a web modal.

Tasks / 任务:

- Rework folder tile preview: icon grid density, mask, spacing, label fit.
- Rework folder overlay: iOS-like scale/blur material, day/night contrast, close behavior.
- Move folder skin values toward shared shell / Appearance tokens instead of hardcoded `HomeView.vue` CSS.
- Keep the folder visually neutral. Do not make the system folder itself look like Shopping or Food Delivery.
- Prepare future Appearance controls: preview density, blur/tint, radius, open animation.

### P1.2 Shopping Platform App Shells

Owner / 归属:

- Installed App: Shopping platform apps.

Goal / 目标:

- Make each folder child feel like a distinct shopping app while retaining shared Shopping data and checkout logic.

Platform identities / 平台身份:

- `Schat Mall`: general mall, gifts, lifestyle.
- `Style Cloud`: fashion, beauty, luxury styling.
- `Nova Digital`: electronics, smart devices, high-value digital goods.
- `Daily Fresh`: grocery, daily supplies, quick replenishment.

Tasks / 任务:

- Define lightweight app tokens for each platform: accent, icon treatment, header material, selected shelf style.
- Replace the current single warm/orange-heavy page feel.
- Make the first viewport show the selected platform identity, not "Shopping backend".
- Keep cart/order/Wallet/Assets handoff components shared, but let them inherit current platform context.
- Remove or hide development copy such as `baseline`, `handoff`, raw source keys, and boundary-law wording.

### P1.3 Current Day/Night Theme Coverage Audit

Owner / 归属:

- Native System layer first, installed apps second.

High-risk areas / 高风险区域:

- Settings and Network extracted subcomponents with raw `bg-white`, `text-gray-*`, `border-gray-*`.
- Utility apps: Phone, Wallet, Stock, Files, More.
- Full app baselines: Assets, Shopping, Food Delivery.
- Calendar cue cards for Shopping / Stock / Phone / Map.
- Chat and Map app-local overlays that still use raw white cards.

Tasks / 任务:

- Native system surfaces must use system tokens for default / graphite-night.
- Installed apps should not blindly inherit native-system colors. Give them app-local day/night tokens when needed.
- Confirm dark mode does not produce white panels with light text.

### P1.4 Return Navigation And Home Widget Placement

Owner / 归属:

- Native System / Home / Settings / cross-module entry rules.

Goal / 目标:

- Remove ambiguous return behavior and retire old screen-number widget placement from the normal user path.

Current baseline / 当前基线:

- System pages can preserve `from=home` or `from=settings`.
- Cross-module management pages can preserve `source=chat|map|calendar`.
- Widget Center should create/import/restore library items only.
- Home widget edit mode should replace same-size slots without dragging or page-number controls.

Follow-up tasks / 后续任务:

- Audit every installed app header and replace vague Back labels with explicit parent labels.
- Replace remaining hardcoded Home/Settings returns with the shared return helper where routes have multiple entry parents.
- Continue evolving the `homeWidgetPages` array toward explicit fixed slot records when the data model is ready.

---

## 5. P2 Visual Tasks / 第二阶段视觉任务

### P2.1 Food Delivery Visual Direction

Current state / 当前状态:

- Functional baseline exists.
- Route: `/food-delivery`.
- Store: restaurants, menu items, cart, orders, status.
- Home folder entry exists.
- Chat service account and Map read-only handoff exist.
- UI is still a bright orange/yellow functional panel and needs product-grade app identity.

Decision needed / 需要决定:

- Keep first-level Food Delivery folder entries as categories for now.
- Or later shift to platform-app entries, similar to Shopping.

Recommended next visual pass / 建议下一轮:

- Make `/food-delivery` feel like an installed food app, not a project status panel.
- Reduce orange/yellow dominance.
- Add restaurant/menu hierarchy, cart affordance, order status rhythm.
- Keep Map context readable but secondary.
- Clean visible copy that explains module boundaries too directly.

### P2.2 Assets Visual Direction

Goal / 目标:

- Turn Assets from functional CRUD baseline into a credible vault / owned-object archive.

Tasks / 任务:

- Define asset categories as app-internal sections.
- Improve day/night readability.
- Avoid making Assets look like Wallet, Files, or Settings.

### P2.3 Utility App Shell

Candidate apps / 候选:

- Phone
- Wallet
- Stock
- Files
- More

Goal / 目标:

- Give lightweight native-utility app polish without doing fully bespoke visual systems for each.

Tasks / 任务:

- Shared utility app surface tokens.
- Day/night support.
- Better lists, forms, empty states, and compact headers.

### P2.4 Chat / Map Local Panel Cleanup

Goal / 目标:

- Prevent app-local panels from visually leaking raw white web cards.

Tasks / 任务:

- Chat panels should stay Chat-owned, not system-owned.
- Map panels should stay Map-owned, not system-owned.
- App-local tokens should cover popovers, drawers, forms, and dialogs.

---

## 6. Deferred / 暂缓

Do not start these until the visual architecture above is stable:

- Full editable desktop folder system.
- Drag arbitrary app icons into/out of user folders.
- Worldbook-bound theme packs.
- Fully separate Shopping platform routes for every platform.
- Deep Food Delivery exception/state simulation.
- Automatic Wallet writeback.
- Deep Map courier trip simulation.

---

## 7. Recommended Visual-Specialist Workflow / 建议视觉专项流程

1. Check git status and commit unrelated completed work first.
2. Confirm entry ownership:
   - Native System
   - Installed App
   - Host-App Embedded
   - Shared component
3. Run information architecture review before visual styling when entry hierarchy changed.
4. Apply visual review/refactor skills in this order:
   - `frontend-logic-design`: entry hierarchy, depth, navigation logic.
   - `ui-aesthetics`: product-grade visual judgment, structure, depth, color discipline.
   - `impeccable`: product UI polish, copy, tokens, responsive checks.
   - `frontend-design`: implementation support for concrete UI rebuilds.
   - `ui-ux-pro-max`: reference palette/style exploration when choosing visual directions.
5. Audit visible copy before finishing.
6. Run focused tests.
7. For UI-heavy work, run browser or screenshot checks when possible.

---

## 8. Skill / Plugin Scan For Next Tasks

### Already Available Locally / 当前已可用

- `find-skills`: discover installable skills.
- `frontend-logic-design`: information architecture and interaction logic review.
- `frontend-design`: production-grade frontend implementation guidance.
- `ui-aesthetics`: refined UI composition, component polish, depth, state and motion discipline.
- `ui-ux-pro-max`: broad UI/UX styles, palettes, product types, guidelines.
- `impeccable`: product UI critique, polish, tokens, copy, responsive, accessibility and hardening guidance.
- `web-design-guidelines`: Vercel Web Interface Guidelines review for UI, UX, accessibility, and implementation details.

### Candidate Skills Found With `find-skills`

#### Recommended First / 优先考虑

1. `vercel-labs/agent-skills@web-design-guidelines`

Use for:

- Framework-neutral Web Interface Guidelines review across UI, UX, accessibility, and implementation details.
- A good external review pass for Vue templates, shared components, and shell surfaces after visual changes.

Install:

```bash
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
```

Notes:

- 2026-05-16 status: installed locally under `.agents/skills/web-design-guidelines`.
- Installer security summary: Gen Safe, Socket 0 alerts, Snyk Med Risk.
- Use as an audit/review skill; it fetches fresh Vercel Web Interface Guidelines at review time.

#### Later Testing Track / 后期测试专项

Install the testing skills below only after the project starts a testing-specialist pass. The current baseline already has Vitest, Vue Test Utils, and targeted regression tests, so these are not immediate visual-workflow dependencies.

Current testing-skill status:

- `aj-geddes/useful-ai-prompts@frontend-testing`: defer until the team wants to standardize Vue/Vitest component and integration test patterns.
- `alinaqi/claude-bootstrap@ui-testing`: defer; consider only if the testing track chooses a Playwright-style browser workflow.
- `aj-geddes/useful-ai-prompts@visual-regression-testing`: defer until screenshot baselines, mobile/desktop viewport captures, or visual regression gates become explicit project goals.
- `hoodini/ai-agents-skills@web-accessibility`: not recommended right now because `web-design-guidelines` now covers accessibility review with stronger source/install signals. Reconsider only if the project needs a dedicated WCAG-only pass.

### Not Recommended Now / 暂不建议

- `kuse-ai/kuse-skills@backstage-style-web`: conflicts with the current goal to avoid web-admin/backstage feel.
- Very low-install visual skills under 100 installs unless there is a specific reason and source review is completed.
- Skills whose source repository or install path cannot be verified from the current machine or project docs.

---

## 9. Next Action / 下一步

Recommended next sequence:

1. Use `web-design-guidelines` as the default external UI/UX/accessibility audit skill when an external pass is needed.
2. Keep `VISUAL_ENTRY_OWNERSHIP_MAP.md` synchronized with system-controlled folder decisions.
3. Continue `P1.1 System-Controlled Home Folder Visual`.
4. Then start `P1.2 Shopping Platform App Shells`.

---

## 10. 2026-05-16 Food Delivery Visual Follow-Up Note

Functional review result:

- Food Delivery remains functionally valid after the visual refresh and app-to-Home navigation update.
- Detailed implementation and functional next steps are recorded in `docs/roadmap/FOOD_DELIVERY_REVIEW_AND_NEXT_TODO_2026-05-16.md`.
- `FoodDeliveryView.vue` uses the shared return helper, so the visual rebuild does not need to recreate return-navigation plumbing.
- Visual work should focus on making `/food-delivery` feel like an installed food app rather than a project status panel.
- Keep functional ownership stable during visual rebuild: Food Delivery owns restaurant/menu/cart/order/status; Chat, Map, Gallery, and Wallet remain handoff or downstream consumers.

Next visual task:

- Continue `P2.1 Food Delivery Visual Direction` after current P1 system-folder and Shopping platform-shell tasks, unless product work explicitly reprioritizes Food Delivery visual polish sooner.
