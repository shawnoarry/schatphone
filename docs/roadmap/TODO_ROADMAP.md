# SchatPhone TODO Roadmap / SchatPhone 动态待办清单
Updated / 更新时间: 2026-05-05

## 0. Read First / 阅读顺序
1. EN: This file is the live execution board for implementation order.
   中文：本文件是实现顺序的动态执行看板。
2. EN: If you are choosing which document to read, start from `docs/README.md`.
   中文：如果是在判断该读哪份文档，先从 `docs/README.md` 开始。
3. EN: For product context, read `docs/overview/PROJECT_MASTER_GUIDE.md` first, then return here.
   中文：需要产品全局背景时，先读 `docs/overview/PROJECT_MASTER_GUIDE.md`，再回到本文件执行。
4. EN: If any old document conflicts with this file, this file wins.
   中文：若旧文档与本文件冲突，以本文件为准。

## 0.5 AI Quick Start (10 min) / AI 接手速览（10分钟）
1. EN: Current target moved to P1 kickoff after closing all P0 items.
   中文：当前目标已切换为 P1 启动阶段（P0 已全部收口）。
2. EN: Start from these files first:
   中文：先从这些文件开始阅读与改动：
   - `src/stores/chat.js`
   - `src/views/ContactsView.vue`
   - `src/views/ChatDirectoryView.vue`
   - `src/views/GalleryView.vue`
   - `src/views/ChatView.vue`
3. EN: Run full verification before task closure:
   中文：收口前必须跑完整验证：
   - `npm run lint`
   - `npm test`
   - `npm run build`
4. EN: Keep docs and code in sync in the same commit batch.
   中文：文档和代码必须在同一批提交中同步更新。

## 1. Board Rules / 看板规则
1. EN: Every task status change must be synced in this file in the same commit batch.
   中文：任何任务状态变化都必须在同一批提交中同步到本文件。
2. EN: Every `IN_PROGRESS` item must have clear acceptance criteria and regression checks.
   中文：所有 `IN_PROGRESS` 任务必须有明确验收标准和回归检查点。
3. EN: Keep wording understandable for non-coding PMs and actionable for AI engineers.
   中文：文案需同时满足产品经理可读和 AI 工程师可执行。
4. EN: Do not delete historical decisions; move them to change log if needed.
   中文：不要删除历史决策，必要时转入变更记录。

## 2. Status Legend / 状态说明
- `TODO`: EN: Not started. / 中文：未开始。
- `IN_PROGRESS`: EN: Active development. / 中文：开发中。
- `PARTIAL_DONE`: EN: Baseline landed, closure pending. / 中文：基线已落地，仍需收口。
- `DONE`: EN: Accepted and closed. / 中文：验收完成并关闭。
- `ON_HOLD`: EN: Intentionally deferred. / 中文：主动搁置。

## 3. Program Snapshot / 项目快照
1. EN: Core shell is stable (Lock/Home/Settings/Chat main path).
   中文：核心壳层稳定（锁屏/Home/Settings/Chat 主链路）。
2. EN: Chat rich-send lane is online and `Trigger Reply` remains persistent.
   中文：Chat 富消息发送链路已上线，`Trigger Reply` 继续常驻。
3. EN: Global role profile + thread binding baseline is landed.
   中文：全局角色档案 + 会话绑定基线已落地。
4. EN: `P0-4` rich-message lane and `P0-1` semantic revision are now closed in P0 scope.
   中文：`P0-4` 富消息链路与 `P0-1` 语义修订已在 P0 范围内完成收口。
5. EN: `P0-3` and `P0-6` cross-module role/avatar/asset contract closure is completed with reusable API + tests.
   中文：`P0-3` 与 `P0-6` 的跨模块角色/头像/素材契约收口已完成，包含可复用 API 与测试。
6. EN: Real-push reliability + scheduling baseline is landed: health check, resync, startup self-heal, timed delivery, and Chat/Map scheduled reminders are now online.
   中文：真推送可靠性 + 定时基线已落地：健康检查、重同步、启动自愈、定时送达，以及 Chat/地图的定时提醒现已上线。
7. EN: Notification-surface split and app-icon identity baseline is landed: external push modes are selectable, while all built-in home modules now support preset-based icon customization shared by shell notifications.
   中文：通知分层与功能身份基线已落地：外部推送模式现可切换，且全部内建首页模块都已支持预设型图标自定义，并与壳内通知共用。
8. EN: Shared in-app dialog cleanup is fully landed across `src/views`: all current page-level confirm/prompt flows now use the in-app dialog layer instead of browser-native UI.
   中文：共享页内对话框清理已在 `src/views` 全面落地：当前所有页面级 confirm/prompt 流程均已改为使用页内对话框层，不再依赖浏览器原生 UI。

---

## 4. Next Up (Immediate) / 下一项待办（立即执行）

### P1 Kickoff Preview / P1 启动预览
Status / 状态: `IN_PROGRESS`
Priority / 优先级: `Highest next / 下一阶段最高`

#### 4.1 Problem Statement / 问题定义
1. EN: With P0 closed, the next risk is keeping immersive features extensible without breaking stable core paths.
   中文：P0 收口后，下一风险是扩展沉浸功能时不破坏稳定主链路。
2. EN: P1 should prioritize modules that increase immersion while reusing existing contracts and storage policies.
   中文：P1 需优先推进能提升沉浸感且可复用现有契约与存储策略的模块。

#### 4.2 Scope / 本轮范围
1. EN: Start P1 item-1: AI image-reference pipeline (provider-capability dependent).
   中文：启动 P1 第 1 项：AI 图生图参考链路（依赖供应商能力）。
2. EN: Keep role/asset contract reuse as mandatory baseline for new modules.
   中文：新模块必须复用现有角色/素材契约基线。
3. EN: Keep backup/reporting behavior unchanged while adding new immersion features.
   中文：新增沉浸功能时保持备份与诊断报告行为稳定不回退。
4. EN: Baseline landed in this round: chat now extracts recent user image blocks as references and injects them into one AI call with provider-aware transport + fallback.
   中文：本轮已落地基线：Chat 会提取近期用户图片消息作为参考图，并在一次 AI 调用中按供应商能力进行传输与回退。
5. EN: Thread-level image-reference mode control is now available (`auto` / `context_only` / `native_url`) and persisted in conversation AI prefs.
   中文：会话级参考图模式已可配置并持久化（`auto` / `context_only` / `native_url`）。
6. EN: Local gallery file assets can now be converted to image data URLs (size-guarded) for the same AI call; oversized files downgrade to text-only cues automatically.
   中文：本地相册文件素材现可在大小守卫下转为 data URL 参与同轮 AI 调用；超限文件会自动降级为文字线索。
7. EN: Assistant message metadata now records image-reference transport result (`mode/count/fallback/provider`) and exposes lightweight in-thread hints.
   中文：助手消息元信息现会记录参考图传输结果（`模式/数量/回退/供应商`），并在会话内提供轻量提示。
8. EN: PM locked the next feature family: global asset hub V2 with custom folders and cross-module binding.
   中文：产品侧已锁定下一组功能：全局素材中台 V2（自定义文件夹 + 跨模块绑定）。
9. EN: Binding model for V1 execution is fixed to single-folder-per-slot; schema must reserve future folder-priority chain extension.
   中文：V1 执行模型固定为“每槽位单文件夹绑定”；数据结构必须预留未来“文件夹优先级链”扩展。
10. EN: Bound asset/folder delete and replace must require second confirmation; force-delete is allowed.
    中文：被绑定素材/文件夹的删除与替换必须二次确认；允许强制删除。
11. EN: Each module that consumes visuals must define fallback defaults so missing assets never break baseline flows.
    中文：凡消费视觉素材的模块都必须有默认回退，确保缺少素材时不破坏基础流程。
12. EN: Not all uploads are forced into gallery: one-off upload/one-off AI generate lanes are allowed for module-local content, with optional "import to gallery" prompt.
    中文：并非所有上传都强制入相册：模块本地内容可走单次上传/单次 AI 生成，并提供“是否导入素材库”弹窗。
13. EN: Runtime smoothness policy is mandatory: broad format support with media-type size limits.
    中文：运行流畅性策略为强制项：格式支持尽量广，但需按媒体类型限制体积上限。

#### 4.3 Near-Term Task Queue / 近期执行队列
Source / 来源: `docs/roadmap/PROJECT_MODULE_AUDIT.md`

Status / 状态: `IN_PROGRESS`

1. EN: P0.5 mojibake regression guard — `DONE`.
   中文：P0.5 中文乱码回归守卫 — `DONE`。
   - EN: Add a lightweight test or script that scans user-visible `src` text for known mojibake fragments.
     中文：新增轻量测试或脚本，扫描 `src` 中用户可见文本的常见乱码片段。
   - EN: Acceptance: normal Chinese text is allowed; known mojibake markers fail the check.
     中文：验收：正常中文允许通过；已知乱码标记会触发失败。
   - EN: Regression checks: `npm run lint`, targeted test/script, and `npm test` if implemented as Vitest.
     中文：回归检查：`npm run lint`、专项测试/脚本；若用 Vitest 实现则跑 `npm test`。
   - EN: Landed as `tests/mojibake-guard.test.js`.
     中文：已通过 `tests/mojibake-guard.test.js` 落地。
2. EN: P0.5 large-component extraction first slice — `DONE`.
   中文：P0.5 大组件拆分第一刀 — `DONE`。
   - EN: Start with one low-risk panel from `ChatView.vue` or `SettingsView.vue`; avoid behavior changes.
     中文：优先从 `ChatView.vue` 或 `SettingsView.vue` 中抽一个低风险面板；避免改变行为。
   - EN: Acceptance: extracted component preserves current props/events/state behavior and existing tests still pass.
     中文：验收：抽出的组件保持现有 props/events/state 行为，现有测试继续通过。
   - EN: Regression checks: `npm run lint`, `npm run build`, and relevant tests.
     中文：回归检查：`npm run lint`、`npm run build` 与相关测试。
   - EN: Landed as display-only extraction from `SettingsView.vue`: `SettingsMenuItem.vue` and `SettingsQuickAccessButton.vue`.
     中文：已从 `SettingsView.vue` 落地展示型拆分：`SettingsMenuItem.vue` 与 `SettingsQuickAccessButton.vue`。
3. EN: P0.5 shared asset picker / usage badge design slice — `DONE`.
   中文：P0.5 共享素材选择器 / 使用状态标识设计切片 — `DONE`。
   - EN: Inventory Gallery, Appearance, Contacts, Chat, and Map asset-selection surfaces before extracting shared UI.
     中文：先盘点 Gallery、Appearance、Contacts、Chat、Map 的素材选择界面，再抽共享 UI。
   - EN: Acceptance: produce a small extraction target list and, if safe, extract the first reusable display-only piece.
     中文：验收：产出小型抽取目标列表；若安全，先抽第一个只展示的可复用片段。
   - EN: Regression checks: `npm run lint`, `npm run build`, and affected store/view tests.
     中文：回归检查：`npm run lint`、`npm run build` 与受影响 store/view 测试。
   - EN: Landed phase-1: extracted `AssetStatusBadge.vue` and reused it in Gallery usage chips and Appearance active-wallpaper badge.
     中文：第一阶段已落地：抽出 `AssetStatusBadge.vue`，并复用于 Gallery 使用状态标签与 Appearance 当前壁纸标签。
   - EN: Landed phase-2: extended the same badge language to Chat gallery picker, Map visual quick switch, and Contacts folder-slot binding status.
     中文：第二阶段已落地：同一套状态标签语言已扩展到 Chat 素材发送面板、Map 视觉快速切换、Contacts 槽位绑定状态。
   - EN: Landed phase-3: extracted `AssetThumbnailOption.vue` and reused it in Chat gallery send and Map visual quick switch while keeping preview loading, selection handling, and store writes in parent views/components.
     中文：第三阶段已落地：抽出 `AssetThumbnailOption.vue`，并复用于 Chat 素材发送与 Map 视觉快切，同时将预览加载、选择处理与 store 写入保留在父级视图/组件。
   - EN: Landed phase-4: added a non-interactive `mini` variant and reused it in Contacts folder-slot previews without changing folder binding or preview-loading ownership.
     中文：第四阶段已落地：新增只读 `mini` 变体，并复用于 Contacts 文件夹槽位预览，未改变文件夹绑定或预览加载职责。
   - EN: Landed phase-5: widened `AssetThumbnailOption.vue` variants and reused it in Contacts asset-pack grid, ChatDirectory role preview strips / preferred-image switcher, and Appearance wallpaper quick switch.
     中文：第五阶段已落地：扩展 `AssetThumbnailOption.vue` 变体，并复用于 Contacts 素材包网格、ChatDirectory 角色预览条/会话优先图切换与 Appearance 壁纸快切。
   - EN: Landed phase-6: added the square variant and reused it in Gallery hero previews and asset cards while preserving Gallery delete/replace/folder operations in `GalleryView.vue`.
     中文：第六阶段已落地：新增方形变体，并复用于 Gallery 顶部预览与素材卡片，同时将 Gallery 删除、替换与文件夹操作保留在 `GalleryView.vue`。
   - EN: Follow-up landed: maintainability batch was committed, then work switched to Network guided setup phase 1.
     中文：后续已落地：可维护性批次已提交，随后切换到 Network 引导配置第一阶段。
4. EN: P1 WorldBook usage visibility first slice — `DONE`.
   中文：P1 世界书使用可见性第一刀 — `DONE`。
   - EN: Show per-knowledge-point role binding count, Chat prompt-chain readiness, and bound role names in WorldBook.
     中文：在 WorldBook 中展示每条知识点的角色绑定数量、Chat 提示词链路状态与绑定角色名单。
   - EN: Clarify in Contacts that enabled bound knowledge points are injected in Chat and usage can be reviewed in WorldBook.
     中文：在 Contacts 中说明启用的绑定知识点会注入 Chat，且可回到 WorldBook 查看使用情况。
   - EN: Acceptance: no data model or Chat prompt assembly behavior changes.
     中文：验收：不改变数据结构，也不改变 Chat 提示词组装行为。
   - EN: Next phase candidate: add filters/sorting for unused, disabled, and Chat-ready knowledge points, or move to Map rewards/events.
     中文：下一阶段候选：增加未使用/停用/Chat 就绪知识点筛选排序，或转入地图奖励/事件。
5. EN: P1 WorldBook usage management second slice — `DONE`.
   中文：P1 世界书使用管理第二刀 — `DONE`。
   - EN: Add knowledge-point usage filters: all, Chat-ready, profile-only, unused, and disabled.
     中文：增加知识点使用状态筛选：全部、已进入 Chat、仅角色档案、未使用、已停用。
   - EN: Add sorting by recent update, usage state, bound role count, and title.
     中文：增加排序：最近更新、使用状态、绑定角色数、标题。
   - EN: Acceptance: filtering/sorting is local UI state only and does not alter knowledge point records or Chat prompt assembly.
     中文：验收：筛选/排序仅为本地 UI 状态，不改变知识点记录，也不改变 Chat 提示词组装。
6. EN: P1 WorldBook search/tag filtering — `DONE`.
   中文：P1 世界书搜索/标签筛选 — `DONE`。
   - EN: Add keyword search for knowledge-point title, content, and tags.
     中文：增加知识点标题、内容和标签的关键字搜索。
   - EN: Add tag chips that work together with existing usage-state filters and sorting.
     中文：增加标签筛选 chips，并与既有使用状态筛选和排序共同工作。
   - EN: Acceptance: search/tag filters remain local UI state only and do not alter knowledge point records or Chat prompt assembly.
     中文：验收：搜索/标签筛选仍仅为本地 UI 状态，不改变知识点记录，也不改变 Chat 提示词组装。
   - EN: Follow-up landed: paused WorldBook feature growth and extracted the Chat thread menu / WorldBook summary surface into `ChatThreadMenuPanel`.
     中文：后续已落地：暂缓继续堆 WorldBook 功能，并将 Chat 线程菜单 / WorldBook 摘要区抽为 `ChatThreadMenuPanel`。
7. EN: P1 maintainability slice: Chat thread menu extraction — `DONE`.
   中文：P1 可维护性切片：Chat 线程菜单拆分 — `DONE`。
   - EN: Extracted `src/components/chat/ChatThreadMenuPanel.vue` from `src/views/ChatView.vue`.
     中文：已从 `src/views/ChatView.vue` 抽出 `src/components/chat/ChatThreadMenuPanel.vue`。
   - EN: Scope: display and form-control extraction only; store writes, navigation, prompt assembly, and conversation persistence remain in the parent view.
     中文：范围：仅做展示与表单控制拆分；store 写入、导航、提示词组装与会话持久化仍留在父视图。
   - EN: Acceptance: thread menu open/close, service-template jump, WorldBook summary/deep-linking, identity overrides, and thread tuning behavior remain unchanged.
     中文：验收：线程菜单开关、服务模板跳转、WorldBook 摘要/深链、身份覆写与会话调校行为保持不变。
   - EN: Regression checks: `npm run lint`, `npm test -- tests/chat-worldbook-binding-visibility.test.js tests/chat-view-semantic-revision.test.js`.
     中文：回归检查：`npm run lint`、`npm test -- tests/chat-worldbook-binding-visibility.test.js tests/chat-view-semantic-revision.test.js`。
   - EN: Next phase candidate: continue low-risk extraction with `SettingsStorageDiagnosticsSection`, `SettingsBackupSection`, or `ChatMessageEditModal`.
     中文：下一阶段候选：继续低风险拆分 `SettingsStorageDiagnosticsSection`、`SettingsBackupSection` 或 `ChatMessageEditModal`。
8. EN: P1 maintainability slice: Settings storage diagnostics extraction — `DONE`.
   中文：P1 可维护性切片：Settings 存储诊断区块拆分 — `DONE`。
   - EN: Extracted `src/components/settings/SettingsStorageDiagnosticsSection.vue` from the Settings `about` subpage.
     中文：已从 Settings 的 `about` 子页抽出 `src/components/settings/SettingsStorageDiagnosticsSection.vue`。
   - EN: Scope: display and callback wiring only; persistence inspection, repair, report cleanup, and Network report routing remain in `SettingsView.vue`.
     中文：范围：仅做展示与回调接线；持久化检查、修复、报告清理与 Network 报告跳转仍留在 `SettingsView.vue`。
   - EN: Acceptance: storage capability display, audit run, drift repair, report cleanup, and storage/error report jumps remain unchanged.
     中文：验收：存储能力展示、运行检查、漂移修复、报告清理与存储/错误报告跳转行为保持不变。
   - EN: Regression checks: `npm run lint`, `npm test -- tests/persistence-layer-reconcile.test.js tests/system-automation.test.js`.
     中文：回归检查：`npm run lint`、`npm test -- tests/persistence-layer-reconcile.test.js tests/system-automation.test.js`。
   - EN: Next phase candidate: continue Settings decomposition with `SettingsBackupSection`, or return to Chat with `ChatMessageEditModal`.
     中文：下一阶段候选：继续拆 `SettingsBackupSection`，或回到 Chat 拆 `ChatMessageEditModal`。
9. EN: P1 maintainability slice: Settings backup section extraction — `DONE`.
   中文：P1 可维护性切片：Settings 备份区块拆分 — `DONE`。
   - EN: Extracted `src/components/settings/SettingsBackupSection.vue` from the Settings Data & Security section.
     中文：已从 Settings 的数据与安全区抽出 `src/components/settings/SettingsBackupSection.vue`。
   - EN: Scope: backup UI, copy-tone controls, asset-package option, export/import buttons, about jump, and feedback display only; backup payload building, import rollback, file input, and store restore/export calls remain in `SettingsView.vue`.
     中文：范围：仅拆备份 UI、提示风格控制、素材包选项、导出/导入按钮、关于入口与反馈展示；备份组包、导入回滚、文件 input 与 store 恢复/导出调用仍留在 `SettingsView.vue`。
   - EN: Acceptance: export/import actions, asset-package toggle, backup copy tone, feedback messages, and rollback semantics remain unchanged.
     中文：验收：导出/导入动作、素材包开关、备份提示语气、反馈消息与回滚语义保持不变。
   - EN: Regression checks: `npm run lint`, `npm test -- tests/system-backup-reminder.test.js tests/system-backup-copy-tone.test.js tests/gallery-store.test.js`.
     中文：回归检查：`npm run lint`、`npm test -- tests/system-backup-reminder.test.js tests/system-backup-copy-tone.test.js tests/gallery-store.test.js`。
   - EN: Follow-up landed: returned to Chat and extracted `ChatMessageEditModal`.
     中文：后续已落地：回到 Chat 并抽出 `ChatMessageEditModal`。
10. EN: P1 maintainability slice: Chat message edit modal extraction — `DONE`.
    中文：P1 可维护性切片：Chat 消息编辑弹窗拆分 — `DONE`。
    - EN: Extracted `src/components/chat/ChatMessageEditModal.vue` from `src/views/ChatView.vue`.
      中文：已从 `src/views/ChatView.vue` 抽出 `src/components/chat/ChatMessageEditModal.vue`。
    - EN: Scope: modal display, draft textarea, helper copy, and cancel/save buttons only; edit validation, message update, semantic revision persistence, and notices remain in `ChatView.vue`.
      中文：范围：仅拆弹窗展示、草稿输入、辅助说明与取消/保存按钮；编辑校验、消息更新、语义修订持久化与提示仍留在 `ChatView.vue`。
    - EN: Acceptance: user-message edit, assistant semantic revision, invalid-draft disabled state, cancel, save, and restore-related flows remain unchanged.
      中文：验收：用户消息编辑、AI 消息语义修订、无效草稿禁用态、取消、保存与恢复相关流程保持不变。
    - EN: Regression checks: `npm run lint`, `npm test -- tests/chat-message-edit.test.js tests/chat-view-semantic-revision.test.js`, `npm run build`.
      中文：回归检查：`npm run lint`、`npm test -- tests/chat-message-edit.test.js tests/chat-view-semantic-revision.test.js`、`npm run build`。
    - EN: Follow-up landed: moved to Map and extracted `MapVisualSettingsPanel`.
      中文：后续已落地：转到 Map 并抽出 `MapVisualSettingsPanel`。
11. EN: P1 maintainability slice: Map visual settings panel extraction — `DONE`.
    中文：P1 可维护性切片：Map 视觉设置面板拆分 — `DONE`。
    - EN: Extracted `src/components/map/MapVisualSettingsPanel.vue` from `src/views/MapView.vue`.
      中文：已从 `src/views/MapView.vue` 抽出 `src/components/map/MapVisualSettingsPanel.vue`。
    - EN: Scope: visual panel display, mode controls, asset selector, quick thumbnails, upload button, AI/provider toggles, automation status, and local panel styles only; map visual mode resolution, gallery preview loading, one-off upload policy, asset import, provider refresh, and store writes remain in `MapView.vue`.
      中文：范围：仅拆视觉面板展示、模式控件、素材选择器、快捷缩略图、上传按钮、AI/供应商开关、自动化状态与面板局部样式；地图视觉模式解析、素材预览加载、单次上传策略、素材导入、供应商刷新与 store 写入仍留在 `MapView.vue`。
    - EN: Acceptance: default/gallery/one-off/provider visual modes, gallery fallback, upload/import choice, AI refresh, and automation settings jump remain unchanged.
      中文：验收：默认/素材库/单次/供应商视觉模式、素材库回退、上传/导入选择、AI 刷新与自动化设置跳转保持不变。
    - EN: Regression checks: `npm run lint`, `npm test -- tests/map-trip-baseline.test.js tests/map-worldbook-context.test.js tests/gallery-store.test.js`, `npm run build`.
      中文：回归检查：`npm run lint`、`npm test -- tests/map-trip-baseline.test.js tests/map-worldbook-context.test.js tests/gallery-store.test.js`、`npm run build`。
    - EN: Follow-up landed: returned to Chat and extracted `ChatUserActionPanel`.
      中文：后续已落地：回到 Chat 并抽出 `ChatUserActionPanel`。
12. EN: P1 maintainability slice: Chat user action panel extraction — `DONE`.
    中文：P1 可维护性切片：Chat 用户动作面板拆分 — `DONE`。
    - EN: Extracted `src/components/chat/ChatUserActionPanel.vue` from `src/views/ChatView.vue`.
      中文：已从 `src/views/ChatView.vue` 抽出 `src/components/chat/ChatUserActionPanel.vue`。
    - EN: Scope: + panel display, action grid, link/transfer/voice forms, gallery picker display, suggested-reply trigger button, and collapse/back controls only; media file input, form validation, location checks, gallery preview loading, asset import, message append, and store writes remain in `ChatView.vue`.
      中文：范围：仅拆 + 面板展示、动作网格、链接/转账/语音表单、素材库选择展示、建议回复触发按钮与收起/返回控件；媒体文件 input、表单校验、位置检查、素材预览加载、素材导入、消息追加与 store 写入仍留在 `ChatView.vue`。
    - EN: Acceptance: image/GIF picker, gallery asset send, link card, transfer card, voice card, current-location share, suggested replies, and panel collapse behavior remain unchanged.
      中文：验收：图片/GIF 选择器、素材库发送、链接卡片、转账卡片、语音卡片、当前位置分享、建议回复与面板收起行为保持不变。
    - EN: Regression checks: `npm run lint`, `npm test -- tests/chat-store-model.test.js tests/chat-view-semantic-revision.test.js tests/chat-worldbook-binding-visibility.test.js tests/gallery-store.test.js`, `npm run build`.
      中文：回归检查：`npm run lint`、`npm test -- tests/chat-store-model.test.js tests/chat-view-semantic-revision.test.js tests/chat-worldbook-binding-visibility.test.js tests/gallery-store.test.js`、`npm run build`。
    - EN: Follow-up landed: moved to Map and extracted `MapAreaFeedbackPanel`.
      中文：后续已落地：转到 Map 并抽出 `MapAreaFeedbackPanel`。
13. EN: P1 maintainability slice: Map area feedback panel extraction — `DONE`.
    中文：P1 可维护性切片：Map 区域反馈面板拆分 — `DONE`。
    - EN: Extracted `src/components/map/MapAreaFeedbackPanel.vue` from `src/views/MapView.vue`.
      中文：已从 `src/views/MapView.vue` 抽出 `src/components/map/MapAreaFeedbackPanel.vue`。
    - EN: Scope: area feedback empty state, feedback cards, exploration badges, route cue display, related WorldBook summary, and WorldBook chip/buttons only; feedback derivation, related knowledge index building, time formatting, and route query building remain in `MapView.vue`.
      中文：范围：仅拆区域反馈空状态、反馈卡片、探索点标识、参考路线展示、关联 WorldBook 摘要与 WorldBook chip/按钮；反馈派生、关联知识点索引、时间格式化与路由 query 构建仍留在 `MapView.vue`。
    - EN: Acceptance: area feedback count/cards, route cue text, related knowledge display, and WorldBook deep links remain unchanged.
      中文：验收：区域反馈数量/卡片、参考路线文案、关联知识点展示与 WorldBook 深链保持不变。
    - EN: Regression checks: `npm run lint`, `npm test -- tests/map-worldbook-context.test.js tests/map-trip-baseline.test.js`, `npm run build`.
      中文：回归检查：`npm run lint`、`npm test -- tests/map-worldbook-context.test.js tests/map-trip-baseline.test.js`、`npm run build`。
    - EN: Follow-up landed: returned to Settings and extracted `SettingsPushSection`.
      中文：后续已落地：回到 Settings 并抽出 `SettingsPushSection`。
14. EN: P1 maintainability slice: Settings push section extraction — `DONE`.
    中文：P1 可维护性切片：Settings 推送区块拆分 — `DONE`。
    - EN: Extracted `src/components/settings/SettingsPushSection.vue` from the Settings notification subpage.
      中文：已从 Settings 的通知子页抽出 `src/components/settings/SettingsPushSection.vue`。
    - EN: Scope: message notification toggle, real-push toggle, capability/status display, push display-mode select, Push Server URL input, feedback copy, and push action buttons only; push orchestration, subscription/resync/unsubscribe/test-send flows, health checks, diagnostics writing, and permission sync remain in `SettingsView.vue`.
      中文：范围：仅拆消息通知开关、真推送开关、能力/状态展示、外部通知样式选择、Push Server 地址输入、反馈文案与推送操作按钮；推送编排、订阅/重同步/取消订阅/测试发送流程、健康检查、诊断写入与权限同步仍留在 `SettingsView.vue`。
    - EN: Acceptance: notification save behavior, real-push subscribe/resync/test/unsubscribe actions, health status display, permission labels, and Push Server URL normalization remain unchanged.
      中文：验收：通知保存行为、真推送订阅/重同步/测试/取消订阅动作、健康状态展示、权限标签与 Push Server URL 规范化保持不变。
    - EN: Regression checks: `npm run lint`, `npm test -- tests/push-web-baseline.test.js tests/system-automation.test.js tests/system-backup-reminder.test.js tests/system-backup-copy-tone.test.js`, `npm run build`.
      中文：回归检查：`npm run lint`、`npm test -- tests/push-web-baseline.test.js tests/system-automation.test.js tests/system-backup-reminder.test.js tests/system-backup-copy-tone.test.js`、`npm run build`。
    - EN: Follow-up landed: stayed in Map and extracted `MapTripControlPanel`.
      中文：后续已落地：留在 Map 并抽出 `MapTripControlPanel`。
15. EN: P1 maintainability slice: Map trip control panel extraction — `DONE`.
    中文：P1 可维护性切片：Map 行程控制面板拆分 — `DONE`。
    - EN: Extracted `src/components/map/MapTripControlPanel.vue` from `src/views/MapView.vue`.
      中文：已从 `src/views/MapView.vue` 抽出 `src/components/map/MapTripControlPanel.vue`。
    - EN: Scope: trip endpoint inputs, estimate display, runtime progress/ETA/background-push status, action hint, and start/cancel/acknowledge buttons only; trip lifecycle, arrival scheduling, push arming, reward/history writes, and store calls remain in `MapView.vue`.
      中文：范围：仅拆行程起终点输入、估算展示、运行进度/预计到达/后台推送状态、操作提示与开始/取消/确认按钮；行程生命周期、到达调度、推送布置、奖励/历史写入与 store 调用仍留在 `MapView.vue`。
    - EN: Acceptance: trip form edits, start eligibility, traveling/arrived progress display, cancel behavior, acknowledge behavior, and background-arrival push labels remain unchanged.
      中文：验收：行程表单编辑、开始条件、进行中/已到达进度展示、取消行为、确认完成行为与后台到达推送标签保持不变。
    - EN: Regression checks: `npm run lint`, `npm test -- tests/map-trip-baseline.test.js tests/map-worldbook-context.test.js tests/push-web-baseline.test.js`, `npm run build`.
      中文：回归检查：`npm run lint`、`npm test -- tests/map-trip-baseline.test.js tests/map-worldbook-context.test.js tests/push-web-baseline.test.js`、`npm run build`。
    - EN: Follow-up landed: returned to Settings and extracted `SettingsAutomationSection`.
      中文：后续已落地：回到 Settings 并抽出 `SettingsAutomationSection`。
16. EN: P1 maintainability slice: Settings automation section extraction — `DONE`.
    中文：P1 可维护性切片：Settings 自动化区块拆分 — `DONE`。
    - EN: Extracted `src/components/settings/SettingsAutomationSection.vue` from the Settings automation subpage.
      中文：已从 Settings 的自动化子页抽出 `src/components/settings/SettingsAutomationSection.vue`。
    - EN: Scope: global automation switch, module enable/priority controls, notify-only/quiet-hours controls, runtime-policy display, conflict/dedupe inputs, Chat settings jump, Network diagnostics jump, and save button only; enable confirmation, input normalization, runtime policy calculation, routing, diagnostics ownership, and store semantics remain in `SettingsView.vue`.
      中文：范围：仅拆全局自动化开关、模块启用/优先级控件、仅通知/安静时段控件、运行策略展示、冲突/防重复输入、Chat 设置跳转、Network 诊断跳转与保存按钮；开启确认、输入归一化、运行策略计算、路由、诊断职责与 store 语义仍留在 `SettingsView.vue`。
    - EN: Acceptance: automation toggles, priorities, quiet-hours visibility, runtime policy copy, Chat/Network jumps, save confirmation, and normalization behavior remain unchanged.
      中文：验收：自动化开关、优先级、安静时段显示、运行态文案、Chat/Network 跳转、保存确认与归一化行为保持不变。
    - EN: Regression checks: `npm run lint`, `npm test -- tests/system-automation.test.js tests/system-backup-reminder.test.js tests/system-backup-copy-tone.test.js tests/push-web-baseline.test.js`, `npm run build`.
      中文：回归检查：`npm run lint`、`npm test -- tests/system-automation.test.js tests/system-backup-reminder.test.js tests/system-backup-copy-tone.test.js tests/push-web-baseline.test.js`、`npm run build`。
    - EN: Follow-up landed: stayed in Map and extracted `MapRouteFamiliarityPanel`.
      中文：后续已落地：留在 Map 并抽出 `MapRouteFamiliarityPanel`。
17. EN: P1 maintainability slice: Map route familiarity panel extraction — `DONE`.
    中文：P1 可维护性切片：Map 路线熟悉度面板拆分 — `DONE`。
    - EN: Extracted `src/components/map/MapRouteFamiliarityPanel.vue` from `src/views/MapView.vue`.
      中文：已从 `src/views/MapView.vue` 抽出 `src/components/map/MapRouteFamiliarityPanel.vue`。
    - EN: Scope: route familiarity count, route cards, tier badges, completion/points/distance stats, next-tier hints, related WorldBook summary, and WorldBook chip/buttons only; route derivation, related knowledge indexing, next-hint logic, and WorldBook route query building remain in `MapView.vue`.
      中文：范围：仅拆路线熟悉度数量、路线卡片、等级标识、完成/探索点/距离统计、下一阶段提示、关联 WorldBook 摘要与 WorldBook chip/按钮；路线派生、关联知识点索引、下一阶段提示逻辑与 WorldBook 路由 query 构建仍留在 `MapView.vue`。
    - EN: Acceptance: route familiarity empty state/cards, tier display, next-tier hint, related knowledge display, and WorldBook deep links remain unchanged.
      中文：验收：路线熟悉度空状态/卡片、等级展示、下一阶段提示、关联知识点展示与 WorldBook 深链保持不变。
    - EN: Regression checks: `npm run lint`, `npm test -- tests/map-worldbook-context.test.js tests/map-trip-baseline.test.js`, `npm run build`.
      中文：回归检查：`npm run lint`、`npm test -- tests/map-worldbook-context.test.js tests/map-trip-baseline.test.js`、`npm run build`。
    - EN: Follow-up landed: stayed in Map and extracted `MapTripHistoryPanel`.
      中文：后续已落地：留在 Map 并抽出 `MapTripHistoryPanel`。
18. EN: P1 maintainability slice: Map trip history panel extraction — `DONE`.
    中文：P1 可维护性切片：Map 行程记录面板拆分 — `DONE`。
    - EN: Extracted `src/components/map/MapTripHistoryPanel.vue` from `src/views/MapView.vue`.
      中文：已从 `src/views/MapView.vue` 抽出 `src/components/map/MapTripHistoryPanel.vue`。
    - EN: Scope: trip-history empty state/cards, status labels, duration/fare display, reward/event summaries, total exploration score, related WorldBook summary, and WorldBook chip/buttons only; trip-history slicing, reward scoring, related knowledge indexing, formatting, and WorldBook route query handling remain in `MapView.vue`.
      中文：范围：仅拆行程记录空状态/卡片、状态标签、时长/费用展示、奖励/事件摘要、总探索分、关联 WorldBook 摘要与 WorldBook chip/按钮；行程记录截取、奖励总分、关联知识点索引、格式化与 WorldBook 路由 query 处理仍留在 `MapView.vue`。
    - EN: Acceptance: trip history display, reward/event display, related knowledge display, and WorldBook deep links remain unchanged.
      中文：验收：行程记录展示、奖励/事件展示、关联知识点展示与 WorldBook 深链保持不变。
    - EN: Regression checks: `npm run lint`, `npm test -- tests/map-worldbook-context.test.js tests/map-trip-baseline.test.js`, `npm run build`.
      中文：回归检查：`npm run lint`、`npm test -- tests/map-worldbook-context.test.js tests/map-trip-baseline.test.js`、`npm run build`。
    - EN: Next phase candidate: switch to feature work such as Network guided setup, or continue maintainability work with shared thumbnail picker extraction.
      中文：下一阶段候选：切换到 Network 引导配置等功能项，或继续可维护性工作抽共享缩略图选择器。
    - EN: Follow-up landed: continued maintainability work with shared thumbnail option phase 1.
      中文：后续已落地：继续可维护性工作并落地共享缩略图选项第一阶段。
6. EN: P1 Map rewards/events first slice — `DONE`.
   中文：P1 地图奖励/事件第一刀 — `DONE`。
   - EN: Completed trips now write deterministic exploration rewards and lightweight event summaries into trip history.
     中文：已完成的行程现会在行程记录中写入确定性的探索奖励与轻量事件摘要。
   - EN: Cancelled trips remain non-rewarding, preserving the existing cancel semantics.
     中文：取消行程仍不会产生奖励，保持原有取消语义。
   - EN: Map history now shows total exploration score and per-trip reward/event details.
     中文：地图行程记录现展示总探索进度，以及每条到达行程的奖励/事件详情。
   - EN: Acceptance: rewards are deterministic and persisted through normal trip history/backup paths; no economy system added.
     中文：验收：奖励为确定性规则，并通过现有行程历史/备份路径持久化；不新增经济系统。
   - EN: Next phase candidate: add area unlocks based on accumulated exploration points and route familiarity.
     中文：下一阶段候选：基于累计探索点与路线熟悉度增加区域解锁。
7. EN: P1 Map route familiarity second slice — `DONE`.
   中文：P1 地图路线熟悉度第二刀 — `DONE`。
   - EN: Completed trips now aggregate into route familiarity tiers, sorted by exploration points, completion count, and recency.
     中文：已完成行程现在会聚合为路线熟悉度等级，并按探索点、完成次数与最近完成时间排序。
   - EN: Map now shows the top familiar routes with tier badges, points, completion count, average distance, and next-tier hints.
     中文：地图现在展示最常走路线的等级标识、探索点、完成次数、平均距离与下一等级提示。
   - EN: Acceptance: familiarity is derived from persisted trip history only; cancelled trips do not affect route tiers.
     中文：验收：熟悉度只从已持久化的行程历史派生；取消行程不影响路线等级。
   - EN: Next phase candidate: add area unlocks from accumulated route familiarity and exploration points.
     中文：下一阶段候选：基于累计路线熟悉度与探索点增加区域解锁。
8. EN: P1 Map area unlocks first slice — `DONE`.
   中文：P1 地图区域解锁第一刀 — `DONE`。
   - EN: Map now derives area unlock states from completed trips, exploration points, known routes, and trusted routes.
     中文：地图现在会从已完成行程、探索点、熟悉路线与稳定路线中派生区域解锁状态。
   - EN: Area cards show unlocked count, progress percentage, requirements, and future event-hook meaning.
     中文：区域卡片会展示已解锁数量、进度百分比、剩余条件，以及后续事件挂钩意义。
   - EN: Acceptance: unlocks are derived from trip history and route familiarity only; no new persistence field or manual task pool is added.
     中文：验收：解锁状态只从行程历史与路线熟悉度派生；不新增持久化字段，也不新增手动任务池。
   - EN: Next phase candidate: add lightweight area event hooks or location feedback based on unlocked areas.
     中文：下一阶段候选：基于已解锁区域增加轻量区域事件钩子或地点反馈。
9. EN: P1 Map area feedback first slice — `DONE`.
   中文：P1 地图区域反馈第一刀 — `DONE`。
   - EN: Unlocked areas now derive lightweight feedback notes with area title, route cue, exploration points, and latest trigger time.
     中文：已解锁区域现在会派生轻量反馈条目，包含区域标题、参考路线、探索点和最近触发时间。
   - EN: Map now shows an Area feedback panel after area unlocks.
     中文：地图现在会在区域解锁后展示区域反馈面板。
   - EN: Acceptance: feedback is deterministic and derived from unlocked areas, route familiarity, and trip history only.
     中文：验收：反馈为确定性派生，只读取已解锁区域、路线熟悉度和行程历史。
   - EN: Next phase candidate: connect area feedback to Calendar/reminders or a future ambient-event queue.
     中文：下一阶段候选：把区域反馈接入日历/提醒，或后续轻量环境事件队列。
10. EN: P1 Calendar map-reminder first slice — `DONE`.
    中文：P1 日历地图提醒第一刀 — `DONE`。
    - EN: Map area feedback now derives suggested Calendar reminders with due time, route cue, source, and exploration points.
      中文：地图区域反馈现在会派生建议型日历提醒，包含建议时间、参考路线、来源和探索点。
    - EN: Calendar now shows Map-derived reminder cards and a direct Map jump.
      中文：日历现在展示地图派生提醒卡片，并提供返回地图入口。
    - EN: Acceptance: no new calendar persistence or real push scheduling was added; this is the first visible cross-module cue.
      中文：验收：不新增日历持久化，也不新增真实推送调度；这是第一条可见跨模块线索。
11. EN: P1 Calendar reminder confirmation/pinning slice — `DONE`.
    中文：P1 日历提醒确认/固定切片 — `DONE`。
    - EN: Suggested Map-derived reminders now support confirm, pin, and dismiss states.
      中文：地图派生的建议提醒现在支持确认、固定和忽略状态。
    - EN: Reminder choices persist through the Map store backup/local storage path, but still do not create real push schedules.
      中文：提醒选择会随地图 store 的备份/本地存储保留，但仍不创建真实推送调度。
12. EN: P1 Calendar event store first slice — `DONE`.
    中文：P1 日历事件存储第一刀 — `DONE`。
    - EN: Confirmed Map-derived reminders now upsert into a dedicated Calendar event store.
      中文：已确认的地图派生提醒现在会写入独立的日历事件存储。
    - EN: Calendar events are included in local persistence, backup export/import, and storage diagnostics.
      中文：日历事件已纳入本地持久化、备份导入导出和存储诊断。
13. EN: P1 Calendar event time editing — `DONE`.
    中文：P1 日历事件时间编辑 — `DONE`。
    - EN: Calendar events now support manual reminder-time editing, quick +1h/+1d shifts, and reset to suggested time.
      中文：日历事件现在支持手动编辑提醒时间、快速后移 1 小时/1 天，并可恢复建议时间。
    - EN: Edited event times persist through backup and are not overwritten by later Map reminder refreshes.
      中文：已编辑事件时间会随备份保留，且不会被后续地图提醒刷新覆盖。
14. EN: P1 Calendar event scheduled push handoff — `DONE`.
    中文：P1 日历事件定时推送接入 — `DONE`。
    - EN: Confirmed Calendar events now schedule real push through the existing push relay after Map reminder sync.
      中文：已确认的日历事件现在会在地图提醒同步后，通过现有推送中继安排真实定时推送。
    - EN: Calendar event cards show whether a real push schedule exists, or whether scheduling failed.
      中文：日历事件卡片会显示真实推送是否已安排，或排程是否失败。
15. EN: P1 Calendar event push reschedule/cancel guard — `DONE`.
    中文：P1 日历事件推送重排/取消守卫 — `DONE`。
    - EN: Editing, quick-shifting, or resetting an event time now reschedules the existing real push.
      中文：编辑、快速后移或恢复事件时间时，现在会重排已有真实推送。
    - EN: Dismissing or removing a Map-derived reminder cancels the old Calendar event push schedule before the event is removed.
      中文：忽略或移除地图派生日历提醒时，会先取消旧的日历事件推送排程，再移除事件。
16. EN: P1 Calendar push status visibility — `DONE`.
    中文：P1 日历推送状态可见性 — `DONE`。
    - EN: Calendar events now preserve a short local push schedule log for schedule/cancel success or failure.
      中文：日历事件现在会保留简短的本地推送排程记录，覆盖排程/取消的成功或失败。
    - EN: Calendar shows real-push readiness, event push status, recent schedule records, and AI quiet-hours policy visibility.
      中文：Calendar 现在会展示真实推送就绪状态、事件推送状态、最近排程记录，以及 AI 安静时段策略说明。
    - EN: Next phase candidate: add server-side delivery receipts if the push relay exposes them, or return to WorldBook search/tag support.
      中文：下一阶段候选：如果推送中继提供服务端送达回执，再补真实送达记录；否则回到 WorldBook 搜索/标签支持。

---

## 5. P0 Board / P0 任务看板（细化版）

### P0-1 AI Single-Message Semantic Revision / AI 单条语义修订
Status / 状态: `DONE`

Done / 已完成:
1. EN: Assistant message semantic revision is available from message actions (without full reroll).
   中文：助手消息已支持从消息动作入口进行语义修订（不需要整轮重 roll）。
2. EN: Revised text is persisted into message context and reused in later calls.
   中文：修订文本会写入消息上下文，并在后续调用中继续使用。
3. EN: Rollback path is available via `Restore original`.
   中文：可通过 `恢复原文` 执行回滚。
4. EN: Edit UX moved from browser prompt to in-chat modal editor for better immersion.
   中文：编辑交互已从浏览器 `prompt` 改为 Chat 内弹层编辑，沉浸感更好。
5. EN: Added dedicated regression tests for semantic-revision UI flow (open/edit/save/restore).
   中文：已补齐语义修订 UI 流程（打开/编辑/保存/恢复）的专项回归测试。
6. EN: Added configurable trace policy (`silent` by default, optional `meta_hint`) for future revision visibility strategy.
   中文：已加入可配置修订痕迹策略（默认 `silent`，可选 `meta_hint`），便于后续可见性策略调整。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-2 Chat Top-Level Bottom Dock / Chat 一级页底部功能位
Status / 状态: `DONE`

Done / 已完成:
1. EN: `/chat` list page now has fixed bottom dock entries (`Prefs` / `Identity` / `Labs`).
   中文：`/chat` 一级列表页已提供固定底部入口（`偏好` / `身份` / `实验室`）。
2. EN: Dock routes to real pages (`/chat-feature/:feature`) and keeps chat thread entry unchanged.
   中文：底部入口已路由到真实页面（`/chat-feature/:feature`），且不影响会话进入主流程。
3. EN: `preferences` and `labs` pages are now production-usable (batch conversation preference apply + maintenance utilities).
   中文：`preferences` 与 `labs` 页面已实装可用（会话偏好批量应用 + 运维清理工具）。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-3 Avatar Hierarchy B / 头像层级 B（会话 > 模块 > 全局 > 兜底）
Status / 状态: `DONE`

Done / 已完成:
1. EN: Shared resolver baseline landed.
   中文：统一解析器基线已落地。
2. EN: Module-level override entry available.
   中文：模块级覆写入口已可用。
3. EN: Thread-level self/contact override available.
   中文：会话级自己/对方覆写已可配。
4. EN: Avatar hierarchy layer trace is now available in role-binding contract (`thread/module/global/fallback`).
   中文：角色绑定契约中已提供头像层级命中信息（`会话/模块/全局/兜底`）。
5. EN: Added contract-level regression tests for hierarchy stability.
   中文：已补齐契约级头像层级稳定性回归测试。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-4 User Rich Message Lane Hardening / 用户富消息链路加固
Status / 状态: `DONE`

Done / 已完成:
1. EN: `+` panel lane for image/gif/link/location/transfer/voice-card.
   中文：`+` 面板已支持图片/gif/链接/位置/转账/语音卡片。
2. EN: Link/transfer/voice-card changed to inline forms.
   中文：链接/转账/语音卡片已改为内联表单。
3. EN: `Trigger Reply` kept persistent as independent AI invoke lane.
   中文：`Trigger Reply` 保留为独立常驻 AI 调用通道。
4. EN: Link/transfer/voice-card forms now use pre-submit validation hints and disabled-state submit buttons.
   中文：链接/转账/语音卡片表单已接入提交前校验提示与提交按钮禁用态。
5. EN: Gallery/location entries in `+` action grid now use availability-state guards, disabled styles, and shared inline guidance.
   中文：`+` 动作网格中的“素材库/位置”入口已接入可用性守卫、禁用态样式与共享提示文案。
6. EN: Message-edit validation logic is extracted into a testable helper with dedicated unit tests.
   中文：消息编辑校验逻辑已抽离为可测试辅助函数，并补齐专门单元测试。
7. EN: Added success-state notices for edit-save and restore actions to improve edge-state feedback clarity.
   中文：已补充编辑保存与恢复原文的成功提示，增强边界状态反馈清晰度。
8. EN: Added component-level regression tests for in-chat edit modal and restore flow.
   中文：已补齐 Chat 组件级编辑弹层与恢复流程回归测试。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-5 Gallery Global Asset Center v1 / 相册全局素材中心 v1
Status / 状态: `DONE`

Done / 已完成:
1. EN: Unified gallery store with asset categories.
   中文：统一素材 store 与分类体系已上线。
2. EN: Local + URL import with dedupe checks.
   中文：本地 + URL 导入与去重校验已上线。
3. EN: Safe delete path with usage guard.
   中文：使用守卫 + 安全删除路径已上线。
4. EN: Backup metadata wiring and chat consumption wiring completed.
   中文：备份元数据接线与 Chat 消费接线已完成。
5. EN: Settings export panel now clearly exposes backup mode summary (metadata-only vs metadata+asset-package) and package size/item limits.
   中文：Settings 导出面板已清晰展示备份模式摘要（仅元数据 vs 元数据+素材包）与素材包体积/数量上限。
6. EN: Export result now reports partial asset-package packaging (skipped/missing/limit-hit) as warning with dedicated report code.
   中文：导出结果已支持“素材包部分打包”告警（跳过/缺失/超限），并写入独立报告编码。
7. EN: Export/import actions now enforce mutual exclusion to avoid overlapping operations.
   中文：导出与导入动作已加入互斥保护，避免并发操作冲突。
8. EN: Added backup copy style switch (`direct` / `immersive`) in Settings and normalized persistence fallback.
   中文：在 Settings 新增备份文案风格开关（`直白` / `沉浸`），并补齐持久化归一化回退。
9. EN: Network history entry naming is unified to diagnostics center (`API/Storage`) for non-technical readability.
   中文：Network 历史入口命名统一为“诊断报告中心（API/存储）”，提升非技术用户可读性。
10. EN: Added store-level regression tests for backup copy tone default/restore/invalid fallback.
    中文：新增 store 级回归测试，覆盖备份文案风格默认值/恢复值/非法值回退。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-6 Role Binding and Asset Reuse / 角色绑定与素材复用
Status / 状态: `DONE`

Done / 已完成:
1. EN: `/contacts` role profile supports asset-pack binding.
   中文：`/contacts` 角色档案支持素材包绑定。
2. EN: Chat directory supports thread-level preferred asset override.
   中文：会话通讯录支持会话级优先素材覆盖。
3. EN: Chat asset selection uses role-binding context.
   中文：Chat 素材选择已接入角色绑定上下文。
4. EN: Added unified cross-module role binding contract APIs in chat store:
   中文：已在 chat store 新增统一跨模块角色绑定契约 API：
   - `getRoleBindingContract(contactId, { moduleKey })`
   - `listRoleBindingContracts(contactIds?, { moduleKey })`
5. EN: Added contract reference document with integration checklist:
   中文：已补齐契约参考文档与接入清单：
   - `docs/architecture/ROLE_BINDING_CONTRACT.md`
6. EN: Existing chat flow remains backward compatible via `getRoleBindingAssetContext`.
   中文：现有 Chat 流程保持向后兼容，继续可用 `getRoleBindingAssetContext`。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-7 Storage and Backup Hardening / 存储与备份加固
Status / 状态: `DONE`

Current / 当前:
1. EN: Layered persistence baseline and diagnostics are available.
   中文：分层持久化基线与诊断能力已可用。
2. EN: Backup restore has rollback-safe baseline.
   中文：备份恢复已具备回滚基线。
3. EN: Backup export/import now supports metadata-first mode with optional gallery asset package restore path and readable report codes.
   中文：备份导入导出已支持“元数据优先 + 可选相册素材包恢复”路径，并接入可读报告编码。
4. EN: Import preflight guard is active (invalid JSON / unsupported schema / unsupported structure are explicitly classified).
   中文：导入预检守卫已启用（无效 JSON / 版本过高 / 结构不支持均可明确分型）。

---

## 6. P1 Queue (After P0 Stabilizes) / P1 队列（P0 稳定后）
1. EN: AI image-reference pipeline (provider capability dependent) — `IN_PROGRESS` (phase-1/2 baseline landed + local-file data URL path + in-thread result hints).
   中文：AI 图生图参考链路（依赖供应商能力）— `IN_PROGRESS`（第一/二阶段基线已落地 + 本地图 data URL 路径 + 会话内结果提示）。
2. EN: Global asset hub V2 (PM-locked) — `IN_PROGRESS` (data schema landed; UI/safety/fallback tasks pending).
   中文：全局素材中台 V2（产品已冻结）— `IN_PROGRESS`（数据结构已落地；UI/安全/回退任务待完成）。
3. EN: Scenario cards and interactive mini-scenes.
   中文：场景卡片与互动小剧场扩展。
4. EN: Cross-module role/asset identity reuse.
   中文：跨模块角色/素材身份复用。
5. EN: World-kernel split (`global worldview` + `bindable knowledge points`) with chat prompt assembly wiring.
   中文：世界内核拆分（`全局世界观` + `可绑定知识点`）与 Chat 提示词组装接线。
6. EN: Map foundation v2 (`simulation-first, low-API`) with optional AI visuals/events as add-ons.
   中文：地图基础 v2（`模拟优先、低 API 依赖`），AI 视觉/事件仅作为可选增强层。

### 6.1 Asset Hub V2 Execution Checklist / 素材中台 V2 执行清单
Status / 状态: `IN_PROGRESS`

1. EN: Data schema task — `DONE`: custom folders + role slot-binding records are landed (V1 = single folder per slot, reserved priority fields + backward-compatible migration + tests).
   中文：数据结构任务——`DONE`：已落地自定义文件夹与角色槽位绑定记录（V1=单文件夹绑定，并预留优先级字段 + 向后兼容迁移 + 测试）。
2. EN: Gallery + Chat consumption task — `DONE`: Gallery folder CRUD is landed; Contacts exposes profile-image/dynamic-media/emoji/reference slot pickers with live binding-state/fallback hints and Gallery jump entry; Chat now consumes folder-bound assets in thread preferred list, gallery send ranking, and AI image-reference collection fallback; Chat Directory also surfaces profile-folder readiness summary.
   中文：相册 + Chat 消费任务——`DONE`：Gallery 文件夹增删改已落地；通讯录已提供形象照/动态图/表情包/参考图槽位选择，并补齐实时绑定状态/默认回退提示与跳转相册入口；Chat 已接入文件夹绑定素材用于会话优先素材列表、发送素材排序与 AI 参考图回退采样；会话通讯录也已显示档案文件夹就绪摘要。
3. EN: Safety task — `DONE (phase-1)`: bound folder delete + bound asset delete/replace now enforce second confirmation in Gallery UI; active Appearance wallpaper and Map gallery-background usage are visible on Gallery asset cards, included in deletion guards, filterable by in-use/unused state, and safely cleared on force-delete.
   中文：安全任务——`DONE（第一阶段）`：Gallery UI 中已对绑定文件夹删除与绑定素材删除/替换统一执行二次确认；正在使用的外观壁纸与地图素材库背景会在素材卡片上前置显示，也已纳入删除守卫，并支持按“使用中/未使用”筛选，强制删除时会安全清理对应绑定。
4. EN: Fallback task — `IN_PROGRESS` module-level default policies:
   中文：回退任务——`IN_PROGRESS` 模块级默认策略：
   - EN: role lanes fallback to text-first/no-pack/no-pad-image baseline (optional AI image-generation switch).
      中文：角色链路回退到文字优先/无包/无垫图基线（可选 AI 生图开关）。
   - EN: appearance fallback — `DONE (phase-1)`: Appearance wallpaper now supports `theme / gallery asset / custom URL` sources, shell background resolves gallery wallpaper assets directly, and missing/deleted wallpaper assets fall back to theme wallpaper automatically.
      中文：美化链路回退——`DONE（第一阶段）`：Appearance 壁纸现支持 `主题 / 相册素材 / 自定义 URL` 三种来源，壳层背景可直接解析相册壁纸素材，且在壁纸素材缺失或被删除时会自动回退到主题壁纸。
   - EN: appearance safety — `DONE (phase-1)`: Gallery now blocks deleting assets currently used as system wallpaper, and forced delete clears wallpaper binding to avoid broken background state.
      中文：美化链路安全——`DONE（第一阶段）`：Gallery 现会阻止删除正在作为系统壁纸使用的素材；若执行强制删除，也会自动清除壁纸绑定，避免出现损坏背景状态。
   - EN: map fallback (future) to icon/default image with first-use optional AI generate prompt.
      中文：地图链路（后续）回退到 icon/默认图，首次可选 AI 生图提示。
5. EN: Module-local upload task — `IN_PROGRESS`: Chat and Map now support one-off local media apply/send without gallery import (with size guard) plus import-before-use path; other modules (shopping/takeout/etc.) remain pending.
   中文：模块本地上传任务——`IN_PROGRESS`：Chat 与 Map 已支持“单次本地应用/发送不入库”（带体积守卫）与“先入库再使用”双路径；购物/外卖等模块待接入。
   - EN: Files hardening note — `DONE (phase-1)`: Files now indexes local file metadata only, persists quick notes/favorites/deletes, and applies the shared media-size guard for local media metadata import without copying original file content.
      中文：Files 加固备注——`DONE（第一阶段）`：Files 现在只索引本地文件元数据，持久化便签/收藏/删除，并在本地媒体元数据导入时复用共享体积守卫，不复制原文件内容。
6. EN: Performance policy task — `DONE (phase-1)`: centralized media-size policy is now wired in Chat/Gallery (import + replace + one-off send) with explicit oversize rejection copy for image/animation and reserved video limits.
   中文：性能策略任务——`DONE（第一阶段）`：Chat/Gallery 已接入统一媒体体积策略（导入 + 替换 + 单次发送），并提供图片/动图超限拒绝提示，同时预留视频上限规则。

Acceptance / 验收标准:
1. EN: Missing assets do not block baseline module usage.
   中文：缺少素材不阻塞任何基础模块使用。
2. EN: Role-bound slots can switch folder bindings without data corruption.
   中文：角色槽位可切换文件夹绑定且不损坏数据。
3. EN: Delete/replace confirmation is always visible before destructive actions.
   中文：删除/替换前始终有明确二次确认。
4. EN: One-off upload flow can finish without gallery import, while optional import remains available.
   中文：单次上传可不入库完成流程，同时保留可选入库。

---

### 6.2 World Kernel + Map Alignment Checklist / 世界内核 + 地图对齐清单
Status / 状态: `IN_PROGRESS`

1. EN: Data-schema task — `DONE (phase-1)`: split current single `worldBook` text into two layers:
   中文：数据结构任务：将当前单一 `worldBook` 文本拆分为两层：
   - EN: `globalWorldview` (mandatory global baseline).
      中文：`globalWorldview`（全局必备基线）。
   - EN: `knowledgePoints[]` (targeted patches, bindable by role/module).
      中文：`knowledgePoints[]`（定向补丁，可按角色/模块绑定）。
2. EN: Binding task — `DONE (phase-1)`: contacts must support role-level knowledge-point binding (single/multi-select), and unbinding must not delete source knowledge points.
   中文：绑定任务：通讯录需支持角色级知识点绑定（单选/多选），解绑不删除知识点源数据。
3. EN: Prompt-assembly task — `DONE (phase-1)`: chat call context order must be deterministic:
   中文：提示词组装任务：Chat 调用上下文顺序必须固定：
   - EN: global worldview -> role profile -> bound knowledge points -> conversation context/memory.
      中文：全局世界观 -> 角色档案 -> 绑定知识点 -> 会话上下文/记忆。
4. EN: Map baseline task — `DONE (phase-1)`: map core loop now runs without mandatory external map API (`location setup -> start trip -> in-transit timer -> arrival state`), with persisted trip state/history.
   中文：地图基线任务 — `DONE（第一阶段）`：地图核心循环已可在不依赖外部地图 API 的情况下运行（`地点设置 -> 开始行程 -> 进行中计时 -> 到达状态`），并支持行程状态/记录持久化。
5. EN: Map-mode task: keep two routes in architecture plan (not both required in first release):
   中文：地图模式任务：架构上保留两条路线（首发不要求同时实现）：
   - EN: fictional simulation mode (default, no-API first).
      中文：架空模拟模式（默认，无 API 优先）。
   - EN: real-map integration mode (optional future extension).
      中文：现实地图接入模式（后续可选扩展）。
6. EN: AI-usage guard task: map AI calls are optional for visual/event flavor only; travel/time/progression must be system-computed.
   中文：AI 调用守卫任务：地图 AI 调用仅用于视觉/事件文案增强；移动时间/进度必须由系统计算。
7. EN: Fallback task — `DONE (phase-1)`: map now supports default visual mode + gallery visual mode, and auto-falls back to default icon/visual when bound asset is missing.
   中文：回退任务 — `DONE（第一阶段）`：地图现支持默认视觉模式 + 素材库视觉模式，且在绑定素材缺失时会自动回退到默认图标/视觉。
8. EN: Map automation-alignment task — `DONE (phase-2 baseline)`: map AI visual refresh now respects system automation runtime policy (`master/module/notify-only/quiet-hours`) and provides manual trigger + status feedback in map UI.
   中文：地图自动化对齐任务 — `DONE（第二阶段基线）`：地图 AI 视觉刷新现已遵循系统自动化运行策略（`总开关/模块开关/仅通知/安静时段`），并在地图页面提供手动触发与状态反馈。

Acceptance / 验收标准:
1. EN: With all map AI toggles off, user can still complete location setup, travel simulation, and arrival-state progression.
   中文：在地图 AI 开关全部关闭时，用户仍可完成地点设置、行程模拟和到达状态推进。
2. EN: Chat always receives global worldview context, and only receives knowledge points explicitly bound to the active role/thread.
   中文：Chat 始终注入全局世界观上下文，且仅注入当前角色/会话显式绑定的知识点。
3. EN: Deleting a role binding never deletes global knowledge-point records.
   中文：删除角色绑定不会删除全局知识点记录。
4. EN: No mandatory extra AI call is introduced for baseline map progression.
   中文：地图基础进度推进不引入强制额外 AI 调用。

---

## 7. Risk Register / 风险清单
1. EN: Documentation drift when IDs or priorities change without same-commit sync.
   中文：任务编号或优先级变更若未同批同步，会引发文档漂移。
2. EN: Storage pressure risk under heavy media usage.
   中文：重素材使用下存在浏览器存储压力风险。
3. EN: If future modules bypass the unified role-binding contract API, cross-module behavior may diverge again.
   中文：若后续模块绕过统一角色绑定契约 API，跨模块行为仍可能再次失配。
4. EN: User confusion if backup model is not clearly explained in settings/help text.
   中文：若设置中的备份模型说明不清，小白用户易误解。
5. EN: If gallery is over-centralized without one-off upload paths, module iteration speed and UX flexibility may regress.
   中文：若素材库过度中心化而缺少单次上传路径，模块迭代效率与体验灵活性会下降。
6. EN: If global worldview and role-targeted knowledge points remain mixed in one text blob, prompt pollution and maintenance cost will increase quickly.
   中文：若全局世界观与角色定向知识点长期混在一段文本中，提示词污染与维护成本会快速上升。
7. EN: If map baseline depends on external provider APIs too early, runtime stability and usage-cost predictability will degrade.
   中文：若地图基线过早依赖外部供应商 API，会降低运行稳定性并增加调用成本不确定性。

---

## 8. Recent Milestones / 近期里程碑
1. EN: Chat message action entry moved to long-press + bottom action sheet.
   中文：Chat 消息操作入口迁移为长按 + 底部动作面板。
2. EN: Avatar hierarchy baseline landed (`thread > module > global > fallback`).
   中文：头像层级基线已落地（会话 > 模块 > 全局 > 兜底）。
3. EN: Gallery phase-1 landed (import/categorize/dedupe/delete + backup metadata path).
   中文：相册第一阶段完成（导入/分类/去重/删除 + 备份元数据接线）。
4. EN: Role profile asset-pack binding and thread preferred asset override landed.
   中文：角色素材包绑定与会话优先素材覆盖已落地。
5. EN: Storage hardening batch added optional backup asset-package mode and partial-restore diagnostics in Settings/Network reports.
   中文：存储加固批次已新增“可选素材包备份模式”与 Settings/Network 报告中的部分恢复诊断。
6. EN: Backup import preflight now classifies invalid JSON / unsupported schema / unsupported structure explicitly.
   中文：备份导入预检现已可明确区分 JSON 无效 / 版本过高 / 结构不支持。
7. EN: Chat rich-message forms now support pre-submit validation hints and disabled-state submit buttons.
   中文：Chat 富消息表单现已支持提交前校验提示与提交按钮禁用态。
8. EN: Chat `+` action grid now applies consistent availability guards for gallery/location with disabled states and inline hints.
   中文：Chat `+` 动作网格现已对素材库/位置应用一致的可用性守卫、禁用态与内联提示。
9. EN: Message edit UX moved from browser prompt to in-chat modal editor while keeping semantic revision and restore path.
   中文：消息编辑交互已从浏览器 prompt 迁移为 Chat 内弹层，同时保留语义修订与恢复原文路径。
10. EN: `P0-1`, `P0-2`, and `P0-4` are now closed in P0 scope.
    中文：`P0-1`、`P0-2` 与 `P0-4` 已在 P0 范围内完成收口。
11. EN: Added dedicated unit tests for chat message-edit validation helper to reduce regression risk in future UI refactors.
    中文：已为聊天消息编辑校验辅助函数新增专项单测，降低后续 UI 重构回归风险。
12. EN: Chat dock feature pages were upgraded from placeholders to usable `preferences/labs` tools, closing `P0-2`.
    中文：Chat 底部功能页已从占位升级为可用 `preferences/labs` 工具，`P0-2` 正式收口。
13. EN: Closed `P0-3/P0-6` contract closure: unified role-binding contract APIs + checklist doc + regression tests are landed.
    中文：`P0-3/P0-6` 契约收口已完成：统一角色绑定契约 API、接入清单文档与回归测试已落地。
14. EN: Closed `P0-5` by landing backup copy-style switch and diagnostics-center naming polish.
    中文：通过落地备份文案风格切换与诊断中心命名优化，`P0-5` 已完成收口。
15. EN: Started `P1-1` phase-1: AI calls now support provider-aware image-reference transport with automatic context fallback.
    中文：已启动 `P1-1` 第一阶段：AI 调用已支持按供应商能力处理参考图，并在不支持时自动回退上下文注入。
16. EN: Added thread-level image-reference mode setting and persisted it in conversation AI prefs.
    中文：新增会话级参考图模式设置，并写入会话 AI 偏好持久化。
17. EN: Added local file-reference conversion for AI calls: gallery file assets now resolve to data URLs under size guard, with automatic text-cue downgrade on overflow.
    中文：新增本地文件参考图转换：相册文件素材在大小守卫下可转为 data URL 参与 AI 调用，超限自动降级为文字线索。
18. EN: Added assistant image-reference telemetry in message metadata (`mode/count/fallback/provider`) and surfaced compact thread hints.
    中文：新增助手参考图调用遥测元信息（`模式/数量/回退/供应商`），并在会话中展示精简提示。
19. EN: Started asset hub V2 UI rollout: Gallery now has folder CRUD + per-asset add-to-folder quick action; Contacts now exposes folder-slot binding pickers for profile-image/dynamic-media/emoji/reference.
    中文：已启动素材中台 V2 UI 落地：Gallery 现支持文件夹增删改与素材快速归档；通讯录已提供形象照/动态图/表情包/参考图槽位绑定选择。
20. EN: PM confirmed world-map adjustment direction: split world kernel into global worldview + bindable knowledge points, and keep map on simulation-first low-API baseline.
    中文：产品侧确认世界观-地图调整方向：世界内核拆分为“全局世界观 + 可绑定知识点”，地图基线采用“模拟优先、低 API 依赖”。
21. EN: Started world-kernel phase-1 implementation: system store now supports `globalWorldview + knowledgePoints`, contacts role profiles now support knowledge-point binding, and chat prompt now injects bound knowledge points in deterministic order.
    中文：已启动世界内核第一阶段实现：system store 已支持 `globalWorldview + knowledgePoints`，通讯录角色档案已支持知识点绑定，Chat 提示词已按固定顺序注入绑定知识点。
22. EN: Landed map baseline phase-1 loop: Map now supports trip lifecycle (`ready -> traveling -> arrived/cancelled`), real-time countdown by system clock, trip history, and backup restore continuity without external map API.
    中文：已落地地图基线第一阶段循环：Map 现支持行程生命周期（`待出发 -> 进行中 -> 到达/取消`）、基于系统时间的倒计时、行程记录，以及不依赖外部地图 API 的备份恢复连续性。
23. EN: Landed map fallback phase-1: added map visual mode switch (`default/gallery`), onboarding hint, gallery-asset binding, and automatic fallback to default when asset is unavailable.
    中文：已落地地图回退第一阶段：新增地图视觉模式切换（`默认/素材库`）、首启引导、素材库绑定，以及素材不可用时自动回退默认模式。
24. EN: Landed map automation-alignment baseline: map store now exposes AI-visual runtime policy and queue trigger, wired to system automation controls and map manual refresh entry.
    中文：已落地地图自动化对齐基线：map store 已提供 AI 视觉运行策略与队列触发能力，并接入系统自动化控制与地图手动刷新入口。
25. EN: Landed asset safety phase-1 in Gallery: in-use asset replace flow (`URL/file`) is now available with two-step confirmation and binding-preserving replacement.
    中文：已落地素材安全第一阶段：Gallery 新增“使用中素材替换”（`URL/文件`）流程，带双重确认并保持绑定关系不丢失。
26. EN: Landed media-size policy phase-1: Chat/Gallery now share centralized size guards for import/replace/one-off media, with explicit oversize feedback and deterministic reject reasons.
    中文：已落地媒体体积策略第一阶段：Chat/Gallery 现共用统一的导入/替换/单次媒体体积守卫，并提供明确超限提示与可追踪拒绝原因。
27. EN: Landed shared in-app dialog phase-1: added a global promise-based dialog host and replaced browser-native prompt/confirm in Gallery, Chat message delete, Chat one-off media import choice, Map one-off visual choice, and WorldBook knowledge-point delete.
    中文：已落地共享页内对话框第一阶段：新增全局 Promise 式对话框宿主，并替换了 Gallery、Chat 消息删除、Chat 单次媒体导入选择、Map 单次视觉选择，以及 WorldBook 知识点删除中的浏览器原生 prompt/confirm。
28. EN: Landed shared in-app dialog phase-2: Chat Directory, Settings, and Network now also use the shared dialog layer for destructive and batch-confirmation flows.
    中文：已落地共享页内对话框第二阶段：ChatDirectory、Settings 与 Network 现也已在删除、批量操作与高风险确认流程中接入共享对话框层。
29. EN: Closed the dialog cleanup pass across the remaining page views: Appearance, Chat feature tools, Contacts, and Home now also use the shared in-app dialog path; `src/views` no longer contains browser-native `confirm/prompt`.
    中文：已完成剩余页面视图的对话框清理：Appearance、Chat 功能工具页、Contacts 与 Home 现也已接入共享页内对话框路径；`src/views` 中已不再包含浏览器原生 `confirm/prompt`。

---

## 9. Change Log / 变更记录
1. 2026-04-07 EN: Replaced compressed TODO with detailed execution-grade bilingual board.
   2026-04-07 中文：将过度简化版 TODO 重写为“可执行细纲双语版”。
2. 2026-04-07 EN: Explicitly set `P0-7` as immediate next task with subtask breakdown.
   2026-04-07 中文：明确 `P0-7` 为下一项待办，并给出子任务拆分。
3. 2026-04-07 EN: Updated `P0-6` to `PARTIAL_DONE` and captured remaining closure points.
   2026-04-07 中文：将 `P0-6` 更新为 `PARTIAL_DONE`，并记录剩余收口点。
4. 2026-04-07 EN: Closed `P0-7` and switched immediate next-up to `P0-4`.
   2026-04-07 中文：完成 `P0-7` 收口，并将下一项待办切换为 `P0-4`。
5. 2026-04-07 EN: Completed `P0-4` action-grid availability pass for gallery/location and ran full lint/test/build verification.
   2026-04-07 中文：完成 `P0-4` 中素材库/位置动作网格可用性收口，并完成 lint/test/build 全量回归验证。
6. 2026-04-07 EN: Replaced browser prompt message editing with in-chat modal editor and synced `P0-1/P0-2` status updates.
   2026-04-07 中文：将消息编辑从浏览器 prompt 升级为 Chat 内弹层编辑，并同步 `P0-1/P0-2` 状态更新。
7. 2026-04-07 EN: Added `chat-message-edit` validation helper and dedicated tests, then passed lint/test/build full gate.
   2026-04-07 中文：新增 `chat-message-edit` 校验辅助与专项测试，并通过 lint/test/build 全量验证。
8. 2026-04-08 EN: Implemented production-ready `preferences/labs` pages for chat dock and marked `P0-2` as `DONE`.
   2026-04-08 中文：实装 Chat 底部 `preferences/labs` 页面并将 `P0-2` 标记为 `DONE`。
9. 2026-04-09 EN: Added component-level semantic revision regression tests (open/edit/save/restore) and closed `P0-1`.
   2026-04-09 中文：补齐语义修订组件级回归测试（打开/编辑/保存/恢复）并完成 `P0-1` 收口。
10. 2026-04-09 EN: Added configurable semantic-revision trace policy (`silent` default, optional `meta_hint`) and closed `P0-4`.
    2026-04-09 中文：新增可配置语义修订痕迹策略（默认 `silent`，可选 `meta_hint`）并完成 `P0-4` 收口。
11. 2026-04-09 EN: Closed `P0-3/P0-6` by landing cross-module role-binding contract APIs and contract reference doc.
    2026-04-09 中文：通过落地跨模块角色绑定契约 API 与契约参考文档，完成 `P0-3/P0-6` 收口。
12. 2026-04-09 EN: Closed `P0-5` with backup copy-style toggle, diagnostics naming unification, and regression tests.
    2026-04-09 中文：通过备份文案风格切换、诊断命名统一与回归测试，完成 `P0-5` 收口。
13. 2026-04-10 EN: Started `P1-1` phase-1 with provider-aware image-reference transport and fallback, plus helper regression tests.
    2026-04-10 中文：启动 `P1-1` 第一阶段：接入按供应商能力的参考图传输与回退，并补齐辅助函数回归测试。
14. 2026-04-10 EN: Added thread-level image-reference mode control (`auto/context_only/native_url`) in chat menu and wired store normalization.
    2026-04-10 中文：在 Chat 会话菜单新增参考图模式控制（`auto/context_only/native_url`），并完成 store 归一化接线。
15. 2026-04-10 EN: Extended `P1-1` with local gallery file-reference conversion (data URL path with size guard + overflow fallback).
    2026-04-10 中文：扩展 `P1-1`：新增本地相册文件参考图转换（data URL 路径 + 大小守卫 + 超限回退）。
16. 2026-04-10 EN: Added image-reference execution metadata into assistant messages and exposed compact in-thread hints.
    2026-04-10 中文：新增助手消息的参考图执行元信息，并在会话内展示精简提示。
17. 2026-04-10 EN: PM locked global asset hub V2 requirements (custom folders, slot binding, delete/replace confirmation, fallback defaults, one-off upload optional import).
    2026-04-10 中文：产品侧冻结全局素材中台 V2 需求（自定义文件夹、槽位绑定、删除/替换确认、默认回退、单次上传可选入库）。
18. 2026-04-10 EN: Added asset hub V2 execution checklist and acceptance criteria for AI engineer handoff.
    2026-04-10 中文：新增素材中台 V2 执行清单与验收标准，用于 AI 程序员接手执行。
19. 2026-04-10 EN: Landed asset hub V2 data layer baseline: custom folder model in gallery + role slot-folder bindings in chat/contract with backward-compatible tests.
    2026-04-10 中文：已落地素材中台 V2 数据层基线：相册自定义文件夹模型 + chat/contract 角色槽位文件夹绑定（含向后兼容测试）。
20. 2026-04-12 EN: Landed asset hub V2 UI phase-1: Contacts folder-slot pickers (profile-image/dynamic-media/emoji/reference) and Gallery folder CRUD + quick add/remove asset actions.
    2026-04-12 中文：已落地素材中台 V2 UI 第一阶段：通讯录槽位文件夹选择（形象照/动态图/表情包/参考图）与 Gallery 文件夹增删改 + 素材快速归档/移除。
21. 2026-04-12 EN: Landed asset hub V2 consumption phase-1 in Chat: folder-bound assets are now consumed by thread preferred options, gallery picker ranking badges, and role-bound AI image-reference fallback.
    2026-04-12 中文：已落地素材中台 V2 在 Chat 侧的第一阶段消费：文件夹绑定素材已用于会话优先素材候选、素材发送面板排序标识，以及角色绑定参考图回退链路。
22. 2026-04-12 EN: Landed role-lane fallback control in Chat thread settings: when no references are available, image blocks now default to text-first fallback, with an optional per-thread override to allow AI-generated image blocks.
    2026-04-12 中文：已落地 Chat 会话级角色回退控制：当无参考图时默认回退为文字优先（不输出图片消息），并提供每会话可选开关以允许 AI 图片消息生成。
23. 2026-04-12 EN: Landed module-local one-off media path in Chat: users can now choose import-before-send or one-off send without gallery import (with inline-size guard).
    2026-04-12 中文：已落地 Chat 模块本地单次媒体链路：用户可选择“先入库后发送”或“单次发送不入库”（含内联体积守卫）。
24. 2026-04-17 EN: Landed asset-hub visibility polish: Contacts now shows per-slot folder binding status/fallback hints plus direct Gallery jump, and Chat Directory now surfaces profile-folder readiness summaries.
    2026-04-17 中文：已落地素材中台可视化打磨：主通讯录现显示各槽位文件夹绑定状态/默认回退提示并提供相册直达入口；会话通讯录现显示档案文件夹就绪摘要。
25. 2026-04-17 EN: Landed package-size optimization phase-1: router now lazy-loads page views, and Vite now separates framework/icons/markdown/vendor chunks to reduce main-bundle pressure while keeping runtime behavior unchanged.
    2026-04-17 中文：已落地包体优化第一阶段：路由现按需懒加载页面视图，Vite 现对 framework/icons/markdown/vendor 进行拆包，在不改变运行逻辑的前提下降低主包压力。
26. 2026-04-17 EN: Landed asset-hub preview polish in Contacts: each folder-slot binding now shows the first few bound thumbnails so users can visually confirm the correct folder content.
    2026-04-17 中文：已落地主通讯录中的素材中台预览打磨：每个文件夹槽位绑定现在会显示前几张缩略图，方便用户直接确认是否绑定到正确内容。
27. 2026-04-17 EN: Landed Chat Directory preview polish: each bound role card now surfaces a lightweight thumbnail strip for profile-folder assets.
    2026-04-17 中文：已落地会话通讯录预览打磨：每个已绑定角色卡片现会显示档案文件夹素材的轻量缩略图带。
28. 2026-04-17 EN: Landed thread-meta preview polish in Chat Directory: thread settings now show the active preferred-image preview plus a quick thumbnail strip for override switching.
    2026-04-17 中文：已落地会话通讯录中的会话设定预览打磨：会话设定现显示当前优先图片预览，并提供覆写切换用的缩略图带。
29. 2026-04-17 EN: Landed map-visual quick-switch polish: Map visual settings now show current background state, direct Gallery jump, and thumbnail-based quick switching.
    2026-04-17 中文：已落地地图视觉快速切换打磨：地图视觉设置现显示当前背景状态、相册直达入口，以及基于缩略图的快速切换。
30. 2026-04-17 EN: Landed map-visual recovery polish: Map now supports one-tap default restore and clearing the remembered gallery binding in place.
    2026-04-17 中文：已落地地图视觉恢复打磨：地图现支持页内一键恢复默认视觉，并可直接清除已记住的素材库背景绑定。
31. 2026-04-19 EN: Landed shared in-app dialog phase-1: added a reusable promise-based dialog layer and replaced the first batch of browser-native prompt/confirm flows in Gallery/Chat/Map/WorldBook; remaining pages are queued for later cleanup.
    2026-04-19 中文：已落地共享页内对话框第一阶段：新增可复用的 Promise 式对话框层，并替换了 Gallery/Chat/Map/WorldBook 的第一批浏览器原生 prompt/confirm；其余页面仍排队待清理。
32. 2026-04-19 EN: Landed shared in-app dialog phase-2: removed browser-native confirm usage from Chat Directory, Settings, and Network while preserving original success/failure and batch-action behavior.
    2026-04-19 中文：已落地共享页内对话框第二阶段：在保持原有成功/失败提示与批量操作行为不变的前提下，移除了 ChatDirectory、Settings 与 Network 中的浏览器原生 confirm。
33. 2026-04-19 EN: Finished the remaining dialog cleanup in Appearance, Chat feature tools, Contacts, and Home, and verified that `src/views` no longer uses browser-native `window.confirm/window.prompt`.
    2026-04-19 中文：完成了 Appearance、Chat 功能工具页、Contacts 与 Home 的剩余对话框清理，并已验证 `src/views` 不再使用浏览器原生 `window.confirm/window.prompt`。
34. 2026-04-22 EN: Landed asset-hub appearance closure: Appearance wallpaper now supports `theme / gallery / custom URL`, App shell resolves gallery wallpaper assets directly, and Gallery deletion safeguards now protect or safely clear active wallpaper bindings.
    2026-04-22 中文：已落地素材中台在外观链路的收口：Appearance 壁纸现支持 `主题 / 相册 / 自定义 URL`，App 壳层可直接解析相册壁纸素材，且 Gallery 删除守卫现会保护或安全清除正在使用中的壁纸绑定。
35. 2026-04-22 EN: Landed Appearance wallpaper quick-switch polish: gallery wallpaper assets now expose a thumbnail preview strip in Appearance for direct apply, while preserving the existing dropdown selection path and safe preview cleanup.
    2026-04-22 中文：已落地 Appearance 壁纸快速切换打磨：相册壁纸素材现会在外观页提供缩略图预览条，可直接点选应用，同时保留原有下拉选择路径，并补齐预览资源的安全释放。
36. 2026-04-23 EN: Landed Appearance wallpaper-state polish: Appearance now shows a direct current-wallpaper preview card and clearer reset-to-theme wording, so users can understand the active wallpaper mode and the reset result at a glance.
    2026-04-23 中文：已落地 Appearance 壁纸状态打磨：外观页现已提供当前壁纸预览卡，并使用更清晰的恢复主题文案，让用户能一眼理解当前壁纸模式以及恢复后的结果。
37. 2026-04-28 EN: Extended Gallery deletion guards to active Map gallery-background usage, so force-delete now clears Map visual binding the same way active wallpaper binding is safely cleared.
    2026-04-28 中文：扩展 Gallery 删除守卫，纳入地图正在使用的素材库背景；强制删除时会像外观壁纸一样安全清理地图视觉绑定。
38. 2026-04-28 EN: Added Gallery asset usage chips for active wallpaper, map background, chat usage, and role bindings so in-use status is visible before destructive actions.
    2026-04-28 中文：为 Gallery 素材卡片新增使用中标签，覆盖外观壁纸、地图背景、聊天使用与角色绑定，让占用状态在执行删除/替换前即可见。
39. 2026-04-28 EN: Added Gallery usage-state filtering (`all / in use / unused`) on top of category filters, making occupied assets directly auditable from the asset hub.
    2026-04-28 中文：为 Gallery 增加“全部 / 使用中 / 未使用”状态筛选，并叠加在分类筛选之上，让素材中台可以直接审计哪些素材已被占用。
40. 2026-04-28 EN: Started immersion polish for Map and Gallery: Map now presents a map-canvas-first visual layer with glass controls, while Gallery began moving away from admin-panel styling.
    2026-04-28 中文：启动 Map 与 Gallery 的沉浸感打磨：地图页改为地图画布优先 + 玻璃浮层控制，相册页开始脱离后台管理面板风格。
41. 2026-04-29 EN: Reduced duplicate Chat settings entry points: service templates now have one formal editing path in Chat Directory, while in-chat service threads only show the active template summary and management jump; single-thread tuning and batch templates were renamed to clarify their scopes.
    2026-04-29 中文：收敛 Chat 重复设置入口：服务模板正式编辑统一到会话通讯录，聊天内服务号会话仅展示当前模板摘要与管理跳转；单会话调校与批量模板也已通过文案区分适用范围。
42. 2026-04-29 EN: Corrected Gallery visual direction toward iOS Photos: album/recents language, light system styling, current-view summary, three-column photo grid, and tucked-away per-photo options now keep asset-hub controls secondary.
    2026-04-29 中文：校准 Gallery 视觉方向为更接近 iOS 系统相册：相册/最近项目语言、浅色系统风格、当前视图摘要、三列照片网格，以及收起的单张照片选项，让素材中台控制退到次级。
43. 2026-04-29 EN: Promoted the first three module-audit candidates into the live roadmap as a near-term P0.5 queue: mojibake guard, large-component extraction, and shared asset-picker/usage-badge design.
    2026-04-29 中文：将模块梳理表中的前三个候选切片转入动态路线图，形成近期 P0.5 队列：乱码守卫、大组件拆分、共享素材选择器/使用状态标识设计。
44. 2026-04-29 EN: Landed the P0.5 mojibake regression guard as a Vitest scan over `src` source files.
    2026-04-29 中文：已落地 P0.5 中文乱码回归守卫，通过 Vitest 扫描 `src` 源码文件。
45. 2026-04-29 EN: Restructured project documentation by function under `docs/`, added `docs/README.md` as the documentation map, and marked obsolete archives.
    2026-04-29 中文：按职能重构项目文档至 `docs/`，新增 `docs/README.md` 作为文档地图，并标注过时归档。
46. 2026-04-29 EN: Rebuilt the PM status report into a weekly dashboard format with one-page verdict, active queue, risks, and product decisions.
    2026-04-29 中文：将 PM 状态报告重构为周报仪表盘格式，包含一页结论、当前队列、风险与产品待决策点。
47. 2026-04-29 EN: Landed the P0.5 large-component extraction first slice by extracting Settings quick-access/menu display components without behavior changes.
    2026-04-29 中文：已落地 P0.5 大组件拆分第一刀，从 Settings 抽出快捷入口/菜单展示组件，未改变业务行为。
48. 2026-04-29 EN: Landed the P0.5 shared asset badge phase-1 by extracting `AssetStatusBadge.vue` and reusing it in Gallery and Appearance.
    2026-04-29 中文：已落地 P0.5 共享素材状态标识第一阶段，抽出 `AssetStatusBadge.vue` 并复用于 Gallery 与 Appearance。
49. 2026-04-29 EN: Extended `AssetStatusBadge.vue` to Chat, Map, and Contacts so the first cross-module asset status language is now shared across five asset-consuming surfaces.
    2026-04-29 中文：将 `AssetStatusBadge.vue` 扩展到 Chat、Map、Contacts，使第一套跨模块素材状态语言已覆盖五个素材消费界面。
50. 2026-04-29 EN: Landed WorldBook usage visibility phase-1: each knowledge point now shows role usage, Chat prompt-chain readiness, and bound role names.
    2026-04-29 中文：已落地世界书使用可见性第一阶段：每条知识点现可显示角色使用情况、Chat 提示词链路状态与绑定角色名单。
51. 2026-04-29 EN: Landed WorldBook usage management phase-2 with usage-state filters and sorting controls for knowledge points.
    2026-04-29 中文：已落地世界书使用管理第二阶段，为知识点增加使用状态筛选与排序控件。
52. 2026-04-29 EN: Landed Map rewards/events phase-1: completed trips now record deterministic exploration points and lightweight event summaries.
    2026-04-29 中文：已落地地图奖励/事件第一阶段：完成行程现会记录确定性探索点数与轻量事件摘要。
53. 2026-04-29 EN: Landed Map route familiarity phase-2: completed trips now aggregate into route tiers with completion counts, points, averages, and next-tier hints.
    2026-04-29 中文：已落地地图路线熟悉度第二阶段：完成行程现会聚合为路线等级，并展示完成次数、点数、平均距离和下一等级提示。
54. 2026-04-29 EN: Landed Map area unlocks phase-1: completed trips, exploration points, and familiar routes now derive visible area unlock progress.
    2026-04-29 中文：已落地地图区域解锁第一阶段：完成行程、探索点与熟悉路线现会派生可见的区域解锁进度。
55. 2026-04-29 EN: Landed Map area feedback phase-1: unlocked areas now derive lightweight feedback notes with route cues and latest trigger time.
    2026-04-29 中文：已落地地图区域反馈第一阶段：已解锁区域现会派生带参考路线和最近触发时间的轻量反馈。
56. 2026-04-29 EN: Landed Calendar map-reminder phase-1: Map area feedback now derives suggested Calendar reminders without adding calendar persistence.
    2026-04-29 中文：已落地日历地图提醒第一阶段：地图区域反馈现会派生建议型日历提醒，且不新增日历持久化。
57. 2026-04-29 EN: Landed Calendar reminder confirmation/pinning: suggested Map reminders can now be confirmed, pinned, or dismissed with persisted user choice.
    2026-04-29 中文：已落地日历提醒确认/固定：地图派生建议提醒现在可确认、固定或忽略，并保留用户选择。
58. 2026-04-29 EN: Landed Calendar event store phase-1: confirmed Map reminders now become dedicated Calendar events with backup/import coverage.
    2026-04-29 中文：已落地日历事件存储第一阶段：已确认地图提醒现在会转成独立日历事件，并纳入备份/导入覆盖。
59. 2026-04-29 EN: Landed Calendar event time editing: event reminder times can be manually adjusted, quick-shifted, reset, and preserved across Map refreshes.
    2026-04-29 中文：已落地日历事件时间编辑：事件提醒时间可手动调整、快速后移、恢复，并能跨地图刷新保留。
60. 2026-04-29 EN: Landed Calendar event scheduled push handoff: confirmed Calendar events now schedule real push through the existing push relay.
    2026-04-29 中文：已落地日历事件定时推送接入：已确认日历事件现在会通过现有推送中继安排真实定时推送。
61. 2026-04-29 EN: Landed Calendar event push reschedule/cancel guard: time edits reschedule old push jobs and dismissed Map reminders cancel their Calendar event push.
    2026-04-29 中文：已落地日历事件推送重排/取消守卫：改时间会重排旧推送任务，忽略地图提醒会取消对应日历事件推送。
62. 2026-04-29 EN: Landed Calendar push status visibility: events now keep local schedule logs and Calendar shows push readiness, event push status, and AI quiet-hours policy notes.
    2026-04-29 中文：已落地日历推送状态可见性：事件现在保留本地排程记录，Calendar 展示推送就绪状态、事件推送状态和 AI 安静时段策略说明。
63. 2026-04-30 EN: Landed WorldBook search/tag filtering: knowledge points now support keyword search and tag chips on top of existing usage-state filters and sorting.
    2026-04-30 中文：已落地世界书搜索/标签筛选：知识点现在支持关键字搜索和标签 chips，并可与既有使用状态筛选和排序共同工作。
64. 2026-04-30 EN: Landed WorldBook edit flow: existing knowledge points can now be opened, edited in place, and saved without changing their identity.
    2026-04-30 中文：已落地世界书编辑流：已有知识点现在可直接打开、原位编辑并保存，且不会改变原有身份。
65. 2026-04-30 EN: Landed WorldBook Calendar consumption phase-1: Calendar reminder cards and confirmed event cards now surface related knowledge points from WorldBook.
    2026-04-30 中文：已落地 WorldBook 在 Calendar 内的第一阶段消费：日历提醒卡片和已确认事件卡片现在会展示相关知识点。
66. 2026-04-30 EN: Landed Chat WorldBook binding verification: the thread menu now shows active worldview and injected knowledge points, and an end-to-end test verifies prompt injection.
    2026-04-30 中文：已落地 Chat 的 WorldBook 绑定验收：线程菜单现在会展示当前生效的世界观与注入知识点，且已有端到端测试验证 prompt 注入。
67. 2026-04-30 EN: Landed WorldBook Map consumption phase-1: Map area feedback, route familiarity, and trip history cards now surface related knowledge points from WorldBook.
    2026-04-30 中文：已落地 WorldBook 在 Map 内的第一阶段消费：Map 的区域反馈、路线熟悉度、行程记录卡片现在会展示相关知识点。
68. 2026-05-01 EN: Landed WorldBook deep-link filtering: Calendar, Chat, and Map can now jump into WorldBook with scoped related-point filters and a clearable context banner.
    2026-05-01 中文：已落地 WorldBook 深链筛选：Calendar、Chat、Map 现在都能带着相关知识点范围跳到 WorldBook，并提供可清除的上下文提示条。
69. 2026-05-02 EN: Landed P1 maintainability slice by extracting `ChatThreadMenuPanel.vue` from `ChatView.vue` without changing thread tuning, identity override, service-template, or WorldBook deep-link behavior.
    2026-05-02 中文：已落地 P1 可维护性切片，从 `ChatView.vue` 抽出 `ChatThreadMenuPanel.vue`，未改变会话调校、身份覆写、服务模板或 WorldBook 深链行为。
70. 2026-05-02 EN: Landed P1 Settings maintainability slice by extracting `SettingsStorageDiagnosticsSection.vue` without changing storage audit, repair, report cleanup, or Network report routing behavior.
    2026-05-02 中文：已落地 P1 Settings 可维护性切片，抽出 `SettingsStorageDiagnosticsSection.vue`，未改变存储检查、修复、报告清理或 Network 报告跳转行为。
71. 2026-05-02 EN: Landed P1 Settings backup maintainability slice by extracting `SettingsBackupSection.vue` while keeping backup payload building, import rollback, file input, and store restore/export logic in `SettingsView.vue`.
    2026-05-02 中文：已落地 P1 Settings 备份可维护性切片，抽出 `SettingsBackupSection.vue`，同时将备份组包、导入回滚、文件 input 与 store 恢复/导出逻辑保留在 `SettingsView.vue`。
72. 2026-05-02 EN: Landed P1 Chat message edit maintainability slice by extracting `ChatMessageEditModal.vue` while keeping validation, user-message update, assistant semantic revision, and notice logic in `ChatView.vue`.
    2026-05-02 中文：已落地 P1 Chat 消息编辑可维护性切片，抽出 `ChatMessageEditModal.vue`，同时将校验、用户消息更新、AI 语义修订与提示逻辑保留在 `ChatView.vue`。
73. 2026-05-02 EN: Landed P1 Map visual panel maintainability slice by extracting `MapVisualSettingsPanel.vue` while keeping visual mode resolution, gallery preview loading, upload/import policy, AI refresh, and store writes in `MapView.vue`.
    2026-05-02 中文：已落地 P1 Map 视觉面板可维护性切片，抽出 `MapVisualSettingsPanel.vue`，同时将视觉模式解析、素材预览加载、上传/导入策略、AI 刷新与 store 写入保留在 `MapView.vue`。
74. 2026-05-02 EN: Landed P1 Chat user action maintainability slice by extracting `ChatUserActionPanel.vue` while keeping media input ownership, validation, gallery preview loading, asset import, message append, and store writes in `ChatView.vue`.
    2026-05-02 中文：已落地 P1 Chat 用户动作可维护性切片，抽出 `ChatUserActionPanel.vue`，同时将媒体 input 所有权、校验、素材预览加载、素材导入、消息追加与 store 写入保留在 `ChatView.vue`。
75. 2026-05-02 EN: Landed P1 Map area feedback maintainability slice by extracting `MapAreaFeedbackPanel.vue` while keeping feedback derivation, related knowledge indexing, time formatting, and WorldBook routing in `MapView.vue`.
    2026-05-02 中文：已落地 P1 Map 区域反馈可维护性切片，抽出 `MapAreaFeedbackPanel.vue`，同时将反馈派生、关联知识点索引、时间格式化与 WorldBook 路由保留在 `MapView.vue`。
76. 2026-05-02 EN: Landed P1 Settings push maintainability slice by extracting `SettingsPushSection.vue` while keeping push orchestration, permission sync, health checks, diagnostics writing, and subscribe/resync/test/unsubscribe flows in `SettingsView.vue`.
    2026-05-02 中文：已落地 P1 Settings 推送可维护性切片，抽出 `SettingsPushSection.vue`，同时将推送编排、权限同步、健康检查、诊断写入与订阅/重同步/测试/取消订阅流程保留在 `SettingsView.vue`。
77. 2026-05-02 EN: Landed P1 Map trip-control maintainability slice by extracting `MapTripControlPanel.vue` while keeping trip lifecycle, arrival scheduling, background-push arming, reward/history writes, and store calls in `MapView.vue`.
    2026-05-02 中文：已落地 P1 Map 行程控制可维护性切片，抽出 `MapTripControlPanel.vue`，同时将行程生命周期、到达调度、后台推送布置、奖励/历史写入与 store 调用保留在 `MapView.vue`。
78. 2026-05-02 EN: Landed P1 Settings automation maintainability slice by extracting `SettingsAutomationSection.vue` while keeping enable confirmation, input normalization, runtime policy calculation, routing, diagnostics ownership, and store semantics in `SettingsView.vue`.
    2026-05-02 中文：已落地 P1 Settings 自动化可维护性切片，抽出 `SettingsAutomationSection.vue`，同时将开启确认、输入归一化、运行策略计算、路由、诊断职责与 store 语义保留在 `SettingsView.vue`。
79. 2026-05-03 EN: Landed P1 Map route-familiarity maintainability slice by extracting `MapRouteFamiliarityPanel.vue` while keeping route derivation, related knowledge indexing, next-hint logic, and WorldBook routing in `MapView.vue`.
    2026-05-03 中文：已落地 P1 Map 路线熟悉度可维护性切片，抽出 `MapRouteFamiliarityPanel.vue`，同时将路线派生、关联知识点索引、下一阶段提示逻辑与 WorldBook 路由保留在 `MapView.vue`。
80. 2026-05-03 EN: Landed P1 Map trip-history maintainability slice by extracting `MapTripHistoryPanel.vue` while keeping trip-history slicing, reward scoring, related knowledge indexing, formatting, and WorldBook routing in `MapView.vue`.
    2026-05-03 中文：已落地 P1 Map 行程记录可维护性切片，抽出 `MapTripHistoryPanel.vue`，同时将行程记录截取、奖励总分、关联知识点索引、格式化与 WorldBook 路由保留在 `MapView.vue`。
81. 2026-05-03 EN: Landed shared asset thumbnail option phase 1 by extracting `AssetThumbnailOption.vue` and reusing it in Chat gallery send and Map visual quick switch without changing preview loading or store writes.
    2026-05-03 中文：已落地共享素材缩略图选项第一阶段，抽出 `AssetThumbnailOption.vue` 并复用于 Chat 素材发送与 Map 视觉快切，未改变预览加载或 store 写入。
82. 2026-05-03 EN: Landed shared asset thumbnail option phase 2 by adding the read-only `mini` variant and reusing it in Contacts folder-slot previews without changing folder binding or preview-loading ownership.
    2026-05-03 中文：已落地共享素材缩略图选项第二阶段，新增只读 `mini` 变体并复用于 Contacts 文件夹槽位预览，未改变文件夹绑定或预览加载职责。
83. 2026-05-03 EN: Landed shared asset thumbnail option phase 3 across Contacts asset-pack grid, ChatDirectory role preview strips / preferred-image switcher, and Appearance wallpaper quick switch while preserving preview-loading and store ownership in parent views.
    2026-05-03 中文：已落地共享素材缩略图选项第三阶段，覆盖 Contacts 素材包网格、ChatDirectory 角色预览条/会话优先图切换与 Appearance 壁纸快切，同时保持预览加载与 store 职责仍在父视图。
84. 2026-05-03 EN: Landed shared asset thumbnail option phase 4 in Gallery hero previews and asset cards, completing the main cross-module thumbnail cleanup pass across asset-consuming surfaces.
    2026-05-03 中文：已落地共享素材缩略图选项第四阶段，覆盖 Gallery 顶部预览与素材卡片，完成主要素材消费界面的跨模块缩略图清理。
85. 2026-05-03 EN: Landed Network guided setup phase 1 with provider templates, setup progress, next-step copy, and helper regression tests while preserving the existing model loading and diagnostics flow.
    2026-05-03 中文：已落地 Network 引导配置第一阶段，新增供应商模板、配置进度、下一步提示文案与 helper 回归测试，同时保持既有模型加载与诊断流程不变。
86. 2026-05-03 EN: Landed Network connection-test failure guidance with reusable cause classification, inline action card, and clearer diagnostics records for URL/key/auth/CORS/timeout/provider failures.
    2026-05-03 中文：已落地 Network 连接测试失败指引，新增可复用原因分类、页内操作卡片，以及针对 URL/Key/鉴权/CORS/超时/供应商故障的更清晰诊断记录。
87. 2026-05-03 EN: Landed Network endpoint/gateway guidance with reusable checks for protocol, path shape, custom-gateway CORS/auth risks, and manual-model fallback confirmation.
    2026-05-03 中文：已落地 Network 接口/网关指引，新增可复用检查，覆盖协议、路径形态、自定义网关 CORS/鉴权风险，以及手动模型兜底确认。
88. 2026-05-03 EN: Landed Network preset safety with save-time quality guidance, local key-storage copy, custom-gateway warnings, and manual-model fallback confirmation before preset reuse.
    2026-05-03 中文：已落地 Network 预设安全，新增保存时质量提示、Key 本地保存文案、自定义网关警告，以及预设复用前的手动模型兜底确认。
89. 2026-05-03 EN: Landed Network-to-Chat smoke path with a real `callAI` request that avoids chat-history writes, protects stale async results, and records diagnostics for success/failure.
    2026-05-03 中文：已落地 Network 到 Chat 烟测链路，使用真实 `callAI` 请求但不写入聊天记录，保护陈旧异步结果，并为成功/失败写入诊断记录。
90. 2026-05-03 EN: Landed Files persistent metadata-index baseline with `useFilesStore`, local file metadata import, shared media-size guard reuse, quick-note/favorite/delete persistence, and store regression tests.
    2026-05-03 中文：已落地 Files 持久化元数据索引基线，新增 `useFilesStore`、本地文件元数据导入、共享媒体体积守卫复用、便签/收藏/删除持久化与 store 回归测试。
91. 2026-05-04 EN: Landed More persistent experimental toggles by adding `settings.more.featureToggles`, normalized store helpers, UI wiring, and system-store regression tests.
    2026-05-04 中文：已落地 More 持久化实验开关，新增 `settings.more.featureToggles`、归一化 store 方法、页面接线与 system-store 回归测试。
92. 2026-05-04 EN: Landed Profile AI-context visibility by adding a shared prompt-facing user summary, showing it in Profile, and reusing it in non-anonymous Chat prompts.
    2026-05-04 中文：已落地 Profile 的 AI 上下文可见性，新增共享的提示词用户摘要，在 Profile 展示，并复用于非匿名 Chat 提示词。
93. 2026-05-04 EN: Landed Wallet local virtual ledger baseline with `useWalletStore`, balance summary, manual transfer records, persistence/restore, and store regression tests.
    2026-05-04 中文：已落地 Wallet 本地虚拟账本基线，新增 `useWalletStore`、余额汇总、手动转账流水、持久化/恢复与 store 回归测试。
94. 2026-05-04 EN: Landed Phone local role-call log baseline with `usePhoneStore`, recent-call UI, missed/completed counters, persistence/restore, backup coverage, and store regression tests.
    2026-05-04 中文：已落地 Phone 本地角色通话记录基线，新增 `usePhoneStore`、最近通话 UI、未接/已接统计、持久化/恢复、备份覆盖与 store 回归测试。
95. 2026-05-04 EN: Landed Stock local simulated-market baseline with `useStockStore`, watchlist/holdings UI, top movers, persistence/restore, backup coverage, and store regression tests.
    2026-05-04 中文：已落地 Stock 本地模拟行情基线，新增 `useStockStore`、关注/持仓 UI、波动提示、持久化/恢复、备份覆盖与 store 回归测试。
96. 2026-05-04 EN: Extended Settings backup and storage diagnostics coverage to Files, Wallet, Phone, and Stock while preserving backward-compatible backup imports.
    2026-05-04 中文：已将 Settings 备份与存储诊断覆盖扩展到 Files、Wallet、Phone、Stock，并保持旧备份导入向后兼容。
97. 2026-05-04 EN: Landed Chat-to-Wallet transfer handoff: Chat `transfer_virtual` cards now create deduped Wallet ledger expenses with `chat_transfer` source metadata.
    2026-05-04 中文：已落地 Chat 到 Wallet 的转账交接：Chat `transfer_virtual` 卡片现在会创建带 `chat_transfer` 来源元数据且按消息去重的 Wallet 支出流水。
98. 2026-05-04 EN: Landed Phone missed-call notification handoff: newly recorded missed calls now create shared shell notifications while respecting the system notification toggle.
    2026-05-04 中文：已落地 Phone 未接来电通知交接：新记录的未接来电现在会创建共享 shell 通知，并遵守系统通知开关。
99. 2026-05-04 EN: Standing execution rule: every completed coding task must append both a landed record and a next recommended slice to this roadmap, then sync `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md` when the recommendation changes.
    2026-05-04 中文：固定执行规则：每次代码任务结束时，都必须向本路线图追加已落地记录和下一推荐切片；若建议发生变化，同步更新 `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`。
100. 2026-05-04 EN: Next recommended slice is Phone -> Calendar cues: convert missed-call notification records into Calendar candidate cues while keeping real scheduling ownership in Calendar.
    2026-05-04 中文：下一推荐切片为 Phone -> Calendar 线索：将未接来电通知记录转为 Calendar 候选线索，同时保持真实调度职责仍归 Calendar。
101. 2026-05-04 EN: Landed Phone -> Calendar callback cues: new missed calls create persistent Calendar cues that can be confirmed into events or dismissed, while real push scheduling remains Calendar-owned.
    2026-05-04 中文：已落地 Phone -> Calendar 回拨线索：新未接来电会创建可持久化的 Calendar 线索，可确认成事件或忽略，真实推送调度仍由 Calendar 拥有。
102. 2026-05-04 EN: Next recommended slice is Wallet source visibility: add source badges/filters for Chat-origin ledger entries.
    2026-05-04 中文：下一推荐切片为 Wallet 来源可见性：为来自 Chat 的流水增加来源徽标/筛选。
103. 2026-05-04 EN: Landed Wallet source visibility: Chat-origin ledger entries now have source counts, filters, and badges distinct from manual records.
    2026-05-04 中文：已落地 Wallet 来源可见性：来自 Chat 的流水现在拥有独立的来源计数、筛选和徽标，可与手动流水区分。
104. 2026-05-04 EN: Next recommended slice is More/Labs toggle consumption: connect one persisted experimental toggle to visible low-risk UI behavior.
    2026-05-04 中文：下一推荐切片为 More/Labs 开关消费：将一个已持久化的实验开关接入低风险的可见 UI 行为。
105. 2026-05-04 EN: Landed More/Labs toggle consumption batch: `smart_panel` shows a Home smart panel, `focus_mode` condenses Lock notifications, and `scene_switch` shows a More scene preview.
    2026-05-04 中文：已落地 More/Labs 开关消费批次：`smart_panel` 显示 Home 智能面板，`focus_mode` 收敛 Lock 通知，`scene_switch` 显示 More 场景预览。
106. 2026-05-04 EN: Next recommended slice is Network component coverage for existing smoke controls, unless the human first chooses the Files product role.
    2026-05-04 中文：下一推荐切片为给既有 Network 烟测控件补组件覆盖；除非用户先选择 Files 的产品角色。
107. 2026-05-04 EN: Landed Files product-role decision and frontend hiding: Files is hidden from standalone Home/More/Appearance entry points and retained as an internal storage/coordination component with `/files` kept for compatibility/internal use.
    2026-05-04 中文：已落地 Files 产品角色决策与前台隐藏：Files 不再作为 Home/More/Appearance 独立入口展示，保留为内部储存与跨模块协调组件，`/files` 仅保留作兼容/内部使用。
108. 2026-05-04 EN: Next recommended slice is Network component coverage for existing smoke controls.
    2026-05-04 中文：下一推荐切片为给既有 Network 烟测控件补组件覆盖。
109. 2026-05-04 EN: Landed Network component coverage for existing smoke controls: Chat smoke preflight/success/failure, model-refresh preflight/success, and diagnostics filtering/clearing now have `NetworkView` component tests.
    2026-05-04 中文：已落地既有 Network 烟测控件组件覆盖：Chat 烟测预检/成功/失败、模型刷新预检/成功、诊断筛选/清空现在都有 `NetworkView` 组件测试。
110. 2026-05-04 EN: Next recommended slice is Network smoke/diagnostics display extraction: split display sections into small components while keeping API calls, report writes, and dialog ownership in `NetworkView.vue`.
    2026-05-04 中文：下一推荐切片为 Network 烟测/诊断展示层拆分：把展示区拆成小组件，同时将 API 调用、报告写入与弹窗所有权保留在 `NetworkView.vue`。
111. 2026-05-04 EN: Landed Network smoke/diagnostics display extraction: added `NetworkSmokeControlsPanel.vue` and `NetworkDiagnosticsPanel.vue`, while keeping API calls, report writes, routing, and dialog ownership in `NetworkView.vue`.
    2026-05-04 中文：已落地 Network 烟测/诊断展示层拆分：新增 `NetworkSmokeControlsPanel.vue` 与 `NetworkDiagnosticsPanel.vue`，同时将 API 调用、报告写入、路由与弹窗所有权保留在 `NetworkView.vue`。
112. 2026-05-04 EN: Next recommended slice is Network provider-template/setup/preset display extraction while keeping preset save/remove and API settings writes in `NetworkView.vue`.
    2026-05-04 中文：下一推荐切片为 Network 供应商模板/配置向导/预设展示区拆分，同时将预设保存/删除与 API 设置写入保留在 `NetworkView.vue`。
---

## 2026-05-04 Network Maintainability Follow-Up

113. EN: Landed Network setup/preset display extraction and helper cleanup: added `NetworkSetupPresetPanel.vue`, `NetworkManualModelSavePanel.vue`, `network-report-labels.js`, and `network-report-state.js`; `NetworkView.vue` now keeps orchestration, API calls, report writes, routing, and dialog ownership while the display/state helpers are test-covered.
    中文：已落地 Network 配置向导/预设展示层拆分与 helper 清理：新增 `NetworkSetupPresetPanel.vue`、`NetworkManualModelSavePanel.vue`、`network-report-labels.js`、`network-report-state.js`；`NetworkView.vue` 继续保留编排、API 调用、报告写入、路由与弹窗所有权，展示层与状态 helper 已有测试保护。

114. EN: Next recommended slice is to pause broad Network restructuring and move to the next small functional connector or maintainability hotspot; good candidates are Chat/WorldBook service-template clarity, Settings remaining section extraction, or Calendar cue lifecycle polish.
    中文：下一步建议暂停大范围 Network 重构，转向下一个小型功能连接点或可维护性热点；候选包括 Chat/WorldBook 服务模板清晰度、Settings 剩余区块拆分，或 Calendar 线索生命周期打磨。

---

## 2026-05-04 Settings Maintainability Follow-Up

115. EN: Landed Settings general/about display extraction: added `SettingsGeneralSection.vue`, `SettingsSubPageHeader.vue`, `SettingsAboutInfoCard.vue`, and `backup-reminder-settings.js`; parent `SettingsView.vue` keeps save normalization and store writes, with component and helper tests covering the moved paths.
    中文：已落地 Settings 通用/About 展示层拆分：新增 `SettingsGeneralSection.vue`、`SettingsSubPageHeader.vue`、`SettingsAboutInfoCard.vue` 和 `backup-reminder-settings.js`；父级 `SettingsView.vue` 继续保留保存归一化与 store 写入，并用组件/helper 测试覆盖迁移路径。

116. EN: Next recommended slice is another low-risk Settings landing-page display extraction, then switch to Calendar cue lifecycle polish if Settings reaches diminishing returns.
    中文：下一步建议继续做一个低风险 Settings 首页展示层拆分；如果 Settings 拆分收益开始变低，再转向 Calendar 线索生命周期打磨。

---

## 2026-05-04 Settings Landing Follow-Up

117. EN: Landed Settings landing-page display extraction: added `SettingsLandingSection.vue`, moved profile/beginner-tip/quick-access/content-menu display out of `SettingsView.vue`, and added stable menu/quick-access selectors while keeping route and subpage ownership in the parent view.
    中文：已落地 Settings 首页展示层拆分：新增 `SettingsLandingSection.vue`，将资料入口、新手提示、快捷入口、内容设置菜单展示移出 `SettingsView.vue`，并为菜单/快捷入口补充稳定选择器；路由跳转与子页所有权仍保留在父视图。
118. EN: Next recommended slice is Calendar cue lifecycle polish: inspect callback/reminder cue creation, confirmation, dismissal, and event handoff for small reliability or maintainability gains without changing product direction.
    中文：下一步建议推进 Calendar 线索生命周期打磨：检查回拨/提醒线索的创建、确认、忽略与事件交接，优先做小型可靠性或可维护性增强，不改变产品方向。

119. EN: Landed Calendar push lifecycle reliability: concurrent real-push schedule/cancel operations are now isolated per event/schedule id, while duplicate same-event scheduling still dedupes through the in-flight map.
    中文：已落地 Calendar 推送生命周期可靠性修正：并发真实推送调度/取消现在按事件/排程 id 隔离，同一事件重复调度仍通过 in-flight map 去重。
120. EN: Next recommended slice is Calendar view display extraction for cue/event cards, or another small connector if Calendar UI splitting starts to overlap with the future visual rebuild.
    中文：下一步建议推进 Calendar 视图展示层拆分（线索/事件卡片），如果该拆分开始与未来视觉重建重叠，则改做另一个小型功能连接点。

121. EN: Landed Calendar cue-card display extraction: added `CalendarMapReminderCard.vue` and `CalendarPhoneCueCard.vue`, while `CalendarView.vue` still owns reminder sync, Phone cue confirmation/dismissal, formatting, and WorldBook routing.
    中文：已落地 Calendar 线索卡片展示层拆分：新增 `CalendarMapReminderCard.vue` 与 `CalendarPhoneCueCard.vue`；`CalendarView.vue` 仍保留提醒同步、Phone 线索确认/忽略、格式化与 WorldBook 路由职责。
122. EN: Next recommended slice is Calendar confirmed-event card extraction only if kept display-only; otherwise move to a non-visual functional connector such as Stock/Calendar or Wallet/Contacts handoff.
    中文：下一步建议只在保持纯展示拆分的前提下推进 Calendar 已确认事件卡片拆分；否则转向非视觉的小型功能连接点，例如 Stock/Calendar 或 Wallet/Contacts 交接。

123. EN: Landed Calendar confirmed-event card display extraction: added `CalendarEventCard.vue` while `CalendarView.vue` keeps event time edits, quick shifts, reset handling, push status/detail derivation, push history formatting, and WorldBook routing.
    中文：已落地 Calendar 已确认事件卡片展示层拆分：新增 `CalendarEventCard.vue`；`CalendarView.vue` 仍保留事件时间编辑、快捷偏移、恢复处理、推送状态/详情派生、推送历史格式化与 WorldBook 路由职责。
124. EN: Next recommended slice needs a module-direction choice: either continue non-visual functional connectors (Stock -> Calendar market reminders, Wallet -> Contacts relationship ledger notes) or return to maintainability on another large view.
    中文：下一步建议需要选择模块方向：继续做非视觉功能连接点（Stock -> Calendar 行情提醒、Wallet -> Contacts 关系账本备注），或回到其它大型视图的可维护性拆分。

---

## 2026-05-04 Stock/Wallet Connector Batch

125. EN: Landed Stock -> Calendar market review cues: large simulated Stock moves now create Calendar stock cues, can be confirmed into Calendar events, and clean up when the move falls below threshold or the asset is removed.
    中文：已落地 Stock -> Calendar 行情复盘线索：模拟标的出现明显波动后会生成 Calendar 行情线索，可确认成日历事件；当波动回落或标的删除时会清理对应线索。
126. EN: Landed Wallet -> Contacts read-only ledger context: Wallet now summarizes transactions by counterparty, and Contacts displays matching role-profile ledger count, net amount, source hint, and latest record without writing back to Wallet or role profiles.
    中文：已落地 Wallet -> Contacts 只读账本上下文：Wallet 可按交易对象汇总流水，Contacts 会在匹配角色档案下展示账本笔数、净额、来源提示与最近记录，不反向写入 Wallet 或角色资料。
127. EN: Next recommended slice is to add view-level coverage for Calendar stock cue interactions or continue with another small connector only after choosing a module pair.
    中文：下一步建议补 Calendar 行情线索交互的视图级覆盖；或在选择新的模块组合后继续推进另一个小型连接点。
128. EN: Landed Calendar Stock cue view coverage: confirming and dismissing Stock market cues from `CalendarView` now has component-level regression protection.
    中文：已落地 Calendar 行情线索视图覆盖：从 `CalendarView` 确认与忽略 Stock 行情线索现在有组件级回归保护。
129. EN: Next recommended slice is to pause connector expansion and choose a new module pair or return to maintainability cleanup before adding more cross-module behavior.
    中文：下一步建议暂停连接点扩展，先选择新的模块组合，或回到可维护性清理，再继续新增跨模块行为。

---

## 2026-05-04 Home Folder / Shopping / Assets Kickoff

130. EN: Product direction recorded: use a reusable Home folder entry pattern for grouped app-like modules, with Shopping as the first folder-backed module and Assets as an independent module.
     中文：已记录产品方向：使用可复用的主屏文件夹入口形态承载成组 App 式模块，购物作为第一个文件夹式模块，资产作为独立模块。
131. EN: Stock and Assets are not merged. Stock remains the market/watchlist module; Assets can later read Stock holdings as an investment-category signal.
     中文：Stock 与资产不合并。Stock 保持行情/自选模块定位；资产后续可读取 Stock 持仓作为投资分类信号。
132. EN: Files remains hidden as an internal storage/coordination component and should not become the user-facing location for Shopping or Assets records.
     中文：Files 继续隐藏为内部储存/协调组件，不应成为购物或资产记录的前台用户入口。
133. EN: New decision details live in `docs/product-decisions/HOME_FOLDER_SHOPPING_ASSETS_DIRECTION.md`; PM-facing module wording is reflected in `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`.
     中文：新增决策细节见 `docs/product-decisions/HOME_FOLDER_SHOPPING_ASSETS_DIRECTION.md`；面向产品的模块措辞已同步到 `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`。

### Active TODO: Home Folder / Shopping / Assets

Priority: High
Status: Baseline landed; next work should move from infrastructure to module data behavior.

1. DONE - Generic Home folder entry baseline.
   Scope: extend Home/system entry metadata so an entry can be `type: "folder"` with child app entries, while keeping existing app/widget/custom-widget behavior stable.
   Acceptance: folder occupies one normal Home icon slot, opens/closes from Home, lists child entries, and routes child entries without hard-coding Shopping-specific behavior.
2. DONE - Folder presentation bridge for future Appearance rebuild.
   Scope: add a small presentation helper or config boundary for folder preview density, icon mask, blur/tint token, and open-panel behavior.
   Acceptance: Home can render the baseline folder without committing to final visual style, and Appearance can later own visual values without rewriting module logic.
3. DONE - Shopping shell using the folder baseline.
   Scope: add Shopping as a Home folder entry with child categories such as mall, fashion, beauty, digital, grocery, home, luxury, and gifts.
   Acceptance: Shopping appears on Home as a folder-style entry, child category entries are visible after opening the folder, and the module has a route/view shell for later commerce behavior.
4. DONE - Shopping cross-module planning hooks.
   Scope: reserve stable data/source labels for future Chat handoff such as product share cards, recommendation messages, cart reminders, and order updates.
   Acceptance: no full commerce logic required yet, but route names, source keys, and docs avoid future rename churn.
5. DONE - Assets standalone module shell.
   Scope: add Assets as an independent Home entry and route with categories for real estate, investment, vehicles, and special assets.
   Acceptance: Assets is discoverable as its own module, is not nested under Stock or Files, and has placeholders ready for Map/Stock/Wallet relationships.
6. DONE - Assets relationship boundaries.
   Scope: define source keys for later Stock holdings summary, Map property/vehicle location context, and Wallet cost/cashflow context.
   Acceptance: Assets can later consume other modules read-only without forcing those modules to become asset subpages.

Recommended next:

- EN: Move next into module data behavior: implement Shopping local store/product-cart-order baseline first, then Assets local store/asset CRUD baseline. Keep Chat/Wallet/Map/Stock handoffs read-only or source-key-only until both stores are stable.
  中文：下一步进入模块数据行为：优先实现 Shopping 本地 store/商品-购物车-订单基线，再实现 Assets 本地 store/资产 CRUD 基线。在两个 store 稳定前，Chat/Wallet/Map/Stock 联动保持只读或 source key 预留即可。

---

## 2026-05-04 Home Folder / Shopping / Assets Baseline Landed

134. EN: Landed reusable Home folder infrastructure: `src/lib/home-entry-registry.js` now defines folder presentation defaults, child-entry routing, and the Shopping folder metadata consumed by `HomeView.vue`.
     中文：已落地可复用 Home 文件夹基础设施：`src/lib/home-entry-registry.js` 现在定义文件夹展示默认值、子入口路由和由 `HomeView.vue` 消费的 Shopping 文件夹元数据。
135. EN: Landed planned module registry: `src/lib/planned-module-registry.js` now owns Shopping categories, Assets categories, stable future source keys, and Stock/Assets boundary rules.
     中文：已落地规划模块注册表：`src/lib/planned-module-registry.js` 现在统一拥有 Shopping 分类、Assets 分类、未来稳定 source key，以及 Stock/Assets 边界规则。
136. EN: Landed Shopping and Assets shells with routes `/shopping` and `/assets`; Shopping is opened from the Home folder child entries, and Assets appears as an independent Home app entry.
     中文：已落地 Shopping 与 Assets 壳层，路由分别为 `/shopping` 与 `/assets`；Shopping 可从主屏文件夹子入口打开，Assets 作为独立 Home App 入口展示。
137. EN: Validation passed: `npm run lint`, targeted registry/Home/icon/system tests, Home/More regression tests, and `npm run build`.
     中文：验证通过：`npm run lint`、注册表/Home/icon/system 针对性测试、Home/More 回归测试，以及 `npm run build`。
138. EN: Next recommended slice is Shopping data baseline: create a local Shopping store for product catalog, favorites, cart, and order records, then wire ShoppingView to real local state before adding Chat or Wallet handoffs.
     中文：下一步建议推进 Shopping 数据基线：新增本地 Shopping store，承载商品目录、收藏、购物车与订单记录，然后先把 ShoppingView 接到真实本地状态，再加入 Chat 或 Wallet 联动。
139. EN: Visual status archived: Home folder has a functional visual scaffold, but full Appearance-controlled folder theming is still deferred in `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md`.
     中文：视觉状态已存档：Home 文件夹已有功能性视觉脚手架，但完整由 Appearance 控制的文件夹主题化仍在 `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md` 中标记为搁置。

---

## 2026-05-04 Shopping Data Baseline

140. EN: Landed Shopping local store baseline: `src/stores/shopping.js` now owns product catalog, favorites, cart lines, local orders, persistence, backup snapshots, restore, and test reset helpers.
     中文：已落地 Shopping 本地 store 基线：`src/stores/shopping.js` 现在拥有商品目录、收藏、购物车行、本地订单、持久化、备份快照、恢复与测试重置工具。
141. EN: Wired `ShoppingView.vue` to real local state: category product list, favorite toggle, add-to-cart, quantity edits, local checkout, and recent-order removal now operate on the Shopping store.
     中文：已将 `ShoppingView.vue` 接入真实本地状态：分类商品列表、收藏切换、加入购物车、数量调整、本地结算与最近订单删除现在都写入 Shopping store。
142. EN: Extended Settings backup/storage diagnostics to include Shopping via `store:shopping` and the Shopping backup snapshot.
     中文：已扩展 Settings 备份与存储诊断，将 Shopping 纳入 `store:shopping` 和 Shopping 备份快照。
143. EN: Next recommended slice is Assets data baseline: create a local Assets store for owned asset records, categories, valuation summaries, and backup/restore before adding Map/Stock/Wallet handoffs.
---

## 2026-05-04 Assets Data Baseline

144. EN: Landed Assets local store baseline: `src/stores/assets.js` now owns long-term owned-object records, category summaries, valuation totals, persistence, backup snapshots, restore, and test reset helpers.
     中文：已落地 Assets 本地 store 基线：`src/stores/assets.js` 现在承载长期拥有物记录、分类摘要、估值合计、持久化、备份快照、恢复与测试重置工具。
145. EN: Wired `AssetsView.vue` to real local state: category browsing, total/active counts, valuation summaries, manual asset create/edit/status/delete, and recent-asset display now operate on the Assets store.
     中文：已将 `AssetsView.vue` 接入真实本地状态：分类浏览、总数/持有中数量、估值摘要、手动新增/编辑/状态更新/删除资产与最近资产展示现在都写入 Assets store。
146. EN: Extended Settings backup/storage diagnostics to include Assets via `store:assets`, with a compatibility guard so legacy Gallery `assets` arrays are not mistaken for Assets ledger records during import.
     中文：已扩展 Settings 备份与存储诊断，将 Assets 纳入 `store:assets`；同时加入兼容保护，避免旧 Gallery 备份中的 `assets` 数组在导入时被误当作资产总账记录。
147. EN: Visual status remains deferred: the Assets page now has a functional layout only, while final Assets visual identity belongs to the future Appearance rebuild.
     中文：视觉状态继续后置：Assets 页面当前只是功能基线布局，最终资产模块视觉身份仍归后续 Appearance 重建处理。
148. EN: Next recommended slice is a Shopping -> Assets handoff baseline: start with manual/importable suggestions for asset-eligible Shopping orders, keep Wallet/Map/Stock read-only, and avoid automatic cross-module writes until the handoff UX is explicit.
     中文：下一步建议推进 Shopping -> Assets 交接基线：先从购物订单中“可转资产”的手动/可导入建议开始，Wallet/Map/Stock 保持只读摘要，不要在交接体验明确前自动跨模块写入。

---

## 2026-05-04 Assets Data Baseline Clean Record

Status: DONE

1. EN: Assets now has a local data baseline: `src/stores/assets.js` owns asset records, categories, status, valuation summaries, persistence, backup/restore, and test reset helpers.
   中文：Assets 已具备本地数据基线：`src/stores/assets.js` 承载资产记录、分类、状态、估值摘要、持久化、备份/恢复与测试重置工具。
2. EN: `AssetsView.vue` now uses real local state for category browsing, total/active counters, valuation summaries, manual create/edit/status/delete, and recent asset display.
   中文：`AssetsView.vue` 已接入真实本地状态，支持分类浏览、总数/持有中统计、估值摘要、手动新增/编辑/状态更新/删除与最近资产展示。
3. EN: Settings backup and storage diagnostics now include `store:assets`, with a guard that prevents legacy Gallery `assets` arrays from being imported as asset-ledger records.
   中文：Settings 备份与存储诊断已纳入 `store:assets`，并加入保护，避免旧 Gallery 备份中的 `assets` 数组被误导入资产总账。
4. EN: Visual status remains deferred: current Assets page styling is a functional baseline, not the final Appearance-controlled visual identity.
   中文：视觉状态仍后置：当前 Assets 页面样式只是功能基线，不是最终由 Appearance 控制的视觉身份。
5. EN: Next recommended slice is Shopping -> Assets handoff: expose manual/importable asset suggestions from asset-eligible Shopping orders before adding any automatic cross-module writes.
   中文：下一步建议推进 Shopping -> Assets 交接：先从可转资产的购物订单生成手动/可导入资产建议，再考虑任何自动跨模块写入。

---

## 2026-05-04 Shopping -> Assets Handoff Baseline

Status: DONE

1. EN: `ShoppingView.vue` now surfaces asset-transfer suggestions from asset-eligible local Shopping order items.
   中文：`ShoppingView.vue` 现在会从本地购物订单中标记为可转资产的商品生成资产转入建议。
2. EN: The handoff is manual: Assets is not written during checkout; users must click the import action before `store:assets` receives a record.
   中文：交接保持手动：结算时不会自动写入 Assets，用户必须点击转入动作后 `store:assets` 才会新增记录。
3. EN: Imported records use `assets_shopping_purchase` source metadata and deterministic ids so repeated clicks do not duplicate the same order item.
   中文：转入记录使用 `assets_shopping_purchase` 来源元数据和确定性 ID，避免同一订单商品重复导入。
4. EN: Next recommended slice is to keep the same manual-confirmation rule for Wallet/Calendar handoffs: create suggestions or read-only summaries first, then add writebacks only when UX is explicit.
   中文：下一步建议在 Wallet/Calendar 交接中继续保持同样的手动确认规则：先做建议或只读摘要，等体验明确后再加写回。

---

## 2026-05-04 Shopping -> Wallet Handoff Baseline

Status: DONE

1. EN: `ShoppingView.vue` now surfaces Wallet expense suggestions for local Shopping orders.
   中文：`ShoppingView.vue` 现在会为本地购物订单展示 Wallet 消费记账建议。
2. EN: The handoff is manual: checkout still does not write Wallet; users must click the record action before Wallet receives an expense transaction.
   中文：交接保持手动：结算仍不会自动写入 Wallet，用户必须点击记账动作后 Wallet 才会新增一条消费流水。
3. EN: Wallet records use `shopping_wallet_expense` source metadata and the order id as a stable source id, preventing duplicate ledger entries for the same order.
   中文：Wallet 记录使用 `shopping_wallet_expense` 来源元数据和订单 ID 作为稳定 source id，避免同一订单重复记账。
4. EN: Next recommended slice is Shopping -> Calendar delivery/reminder suggestions, keeping the same manual-confirmation rule.
   中文：下一步建议推进 Shopping -> Calendar 配送/提醒建议，并继续保持手动确认规则。

---

## 2026-05-04 Shopping -> Calendar Handoff Baseline

Status: DONE

1. EN: Shopping checkout now creates persistent Calendar delivery/follow-up cues through `store:calendar`, while checkout still only owns the Shopping-local order.
   中文：Shopping 结算现在会通过 `store:calendar` 生成持久化配送/跟进线索，但结算本身仍只拥有 Shopping 本地订单。
2. EN: Calendar now displays Shopping delivery cues with confirm and dismiss actions; only confirmed cues become Calendar events and real push schedules.
   中文：Calendar 现在展示 Shopping 配送线索，并提供确认/忽略；只有确认后的线索才会变成日历事件和真实推送排程。
3. EN: Removing a Shopping order dismisses its related Calendar delivery cue and removes any matching confirmed event, preserving Calendar as the scheduling owner.
   中文：删除 Shopping 订单会忽略对应 Calendar 配送线索，并移除匹配的已确认事件，继续保持 Calendar 作为排程归属方。
4. EN: Next recommended slice is to pause broad connector expansion and either clean up Shopping/Calendar mojibake copy, or add a small Chat -> Shopping product-card suggestion without checkout ownership moving into Chat.
   中文：下一步建议暂停大范围联动扩张，优先清理 Shopping/Calendar 历史乱码文案；或做一个小型 Chat -> Shopping 商品卡建议，但不能把下单归属转给 Chat。

---

## 2026-05-04 Shopping / Calendar Handoff Copy Clarification

Status: DONE

1. EN: `ShoppingView.vue` now describes the current handoff state accurately: Wallet, Assets, and Calendar have manual-confirmation handoffs, while Chat product-card handoff remains future-only.
   中文：`ShoppingView.vue` 现在准确说明当前交接状态：Wallet、Assets、Calendar 已有手动确认式交接，Chat 商品卡交接仍属后续项。
2. EN: `CalendarView.vue` now introduces Calendar as a cue-confirmation layer so source modules suggest cues first, and only Calendar confirmation creates events and push schedules.
   中文：`CalendarView.vue` 现在明确 Calendar 是线索确认层：来源模块先给线索，只有在 Calendar 确认后才创建事件与推送排程。
3. EN: No new cross-module behavior was added in this slice; it is a product-copy/status cleanup to reduce future misunderstanding.
   中文：本切片没有新增跨模块行为，只做产品文案/状态说明清理，减少后续误解。
4. EN: Next recommended slice is either a targeted Shopping/Calendar test assertion for the new status copy, or a very small Chat -> Shopping product-card suggestion that preserves Shopping checkout ownership.
   中文：下一步建议可补一条针对新状态文案的 Shopping/Calendar 组件断言；或做一个很小的 Chat -> Shopping 商品卡建议，但继续保持 Shopping 拥有结算流程。

---

## 2026-05-04 Chat -> Shopping Product Suggestion Entry

Status: DONE

1. EN: Added targeted component assertions for the clarified Shopping/Calendar handoff copy so future UI changes keep the boundary status visible.
   中文：已为 Shopping/Calendar 交接文案补充组件断言，确保后续 UI 改动不会悄悄移除边界状态说明。
2. EN: `ChatUserActionPanel.vue` now exposes a small Shopping suggestion entry in the `+` panel.
   中文：`ChatUserActionPanel.vue` 现在在 `+` 面板中提供一个小型购物建议入口。
3. EN: `ChatView.vue` routes that entry to `/shopping?source=chat&intent=product_card`, while Chat still does not create carts, orders, Wallet records, Assets records, or Calendar events.
   中文：`ChatView.vue` 会将该入口跳转到 `/shopping?source=chat&intent=product_card`；Chat 仍不创建购物车、订单、Wallet 流水、Assets 资产或 Calendar 事件。
4. EN: Next recommended slice is to keep connector expansion small: either build a real read-only product-card preview in Chat using Shopping catalog data, or return to maintainability cleanup on a large view. Do not add Chat-owned checkout.
   中文：下一步建议继续控制连接点体量：可以做一个读取 Shopping 商品目录的 Chat 只读商品卡预览，或回到大视图可维护性清理；不要加入 Chat 自有结算。

---

## 2026-05-04 Chat Read-Only Shopping Product Preview

Status: DONE

1. EN: `ChatView.vue` now reads the Shopping catalog and passes up to three available products into the Chat `+` panel as read-only preview data.
   中文：`ChatView.vue` 现在读取 Shopping 商品目录，并将最多三个有货商品作为只读预览数据传给 Chat 的 `+` 面板。
2. EN: `ChatUserActionPanel.vue` displays those products with title, description, price, category, asset-ready, and giftable hints.
   中文：`ChatUserActionPanel.vue` 会展示商品标题、描述、价格、分类、可转资产与可赠礼提示。
3. EN: Selecting a preview routes to `/shopping?source=chat&intent=product_card&category=...&productId=...`; `ShoppingView.vue` uses `productId` to highlight the target product.
   中文：点击预览会跳转到 `/shopping?source=chat&intent=product_card&category=...&productId=...`；`ShoppingView.vue` 使用 `productId` 高亮目标商品。
4. EN: Chat still does not write cart, order, checkout, Wallet, Assets, or Calendar state.
   中文：Chat 仍不写入购物车、订单、结算、Wallet、Assets 或 Calendar 状态。
5. EN: Next recommended slice is either Shopping product-card message composition inside Chat as a local chat message, or switch back to large-view maintainability cleanup if connector work should pause.
   中文：下一步建议可做 Chat 内商品卡消息组装并作为本地聊天消息发送；若要暂停连接点扩张，则回到大视图可维护性清理。

---

## 2026-05-04 Chat Shopping Product Card Message Batch

Status: DONE

1. EN: Chat structured blocks now support `product_card`, including store normalization, safe `/shopping` routing, preview summary text, and component rendering.
   中文：Chat 结构化消息块现在支持 `product_card`，包含 store 归一化、安全 `/shopping` 路由、预览摘要文本与组件渲染。
2. EN: Chat `+` panel product previews now offer two paths: tap the card to confirm in Shopping, or tap "send product card" to leave a local Chat message.
   中文：Chat `+` 面板商品预览现在有两条路径：点击卡片去 Shopping 确认，或点击“发送商品卡”在 Chat 留下一条本地消息。
3. EN: Product-card messages can route back to Shopping with `source=chat`, `intent=product_card`, `chatId`, `category`, and `productId`, while still not writing cart/order/checkout state.
   中文：商品卡消息可携带 `source=chat`、`intent=product_card`、`chatId`、`category` 与 `productId` 回到 Shopping，同时仍不写入购物车、订单或结算状态。
4. EN: Shopping now shows a Chat-source banner when opened from a product card and can return to the originating Chat thread when `chatId` is present.
   中文：Shopping 从商品卡打开时会显示 Chat 来源承接提示，并在存在 `chatId` 时可返回原聊天会话。
5. EN: Next recommended slice is Shopping gift-intent handoff: let a confirmed Shopping order optionally reference a Chat thread/contact as gift recipient, then surface that context back in Chat without moving checkout ownership.
   中文：下一步建议推进 Shopping 赠礼意图交接：让已确认的 Shopping 订单可选绑定 Chat 会话/联系人作为赠礼对象，再把该上下文回显到 Chat，但不移动结算归属。

---

## 2026-05-04 Shopping Product Source / Image Source Contract

Status: DONE

1. EN: Product decision: Shopping goods should support mixed origins: system seed/catalog goods, user-created custom goods, and later AI-assisted/generated goods.
   中文：产品决策：Shopping 商品应支持混合来源，包括系统预设/目录商品、用户自定义商品，以及后续 AI 辅助/生成商品。
2. EN: Product decision: image input should follow a reusable project-wide source contract: URL, Gallery asset, local file through Gallery import, and future AI-generated asset.
   中文：产品决策：图片输入应遵循可复用的全项目来源契约：URL、Gallery 素材、通过 Gallery 导入的本地文件，以及后续 AI 生成素材。
3. EN: First implementation slice: add Shopping product image metadata and user-custom product creation with URL/Gallery image support. Direct local file upload remains centralized in Gallery for now.
   中文：第一刀实现：为 Shopping 商品加入图片元数据，并支持用户自定义商品创建时选择 URL/Gallery 图片；直接本地文件上传暂时继续集中在 Gallery。
4. EN: Guardrail: AI-generated goods and images should be recorded as a source type/reserved capability until an explicit AI generation flow exists.
   中文：边界：AI 生成商品和图片在真实生成流程存在前，只记录为来源类型/预留能力，不假装已完成。
5. EN: Landed: Shopping products now normalize `origin` as `seed`, `user`, or `ai`, and normalize product image metadata as `none`, `url`, `gallery`, or `ai`.
   中文：已落地：Shopping 商品现在会归一化 `origin` 为 `seed`、`user` 或 `ai`，并将商品图片元数据归一化为 `none`、`url`、`gallery` 或 `ai`。
6. EN: Landed: `ShoppingView.vue` now supports user-created custom products with URL images or Gallery asset images. Direct local file upload remains centralized through Gallery import.
   中文：已落地：`ShoppingView.vue` 现在支持用户创建自定义商品，并选择 URL 图片或 Gallery 素材图片。直接本地文件上传继续集中走 Gallery 导入。
7. EN: Validation passed: `npm test -- tests\shopping-store.test.js tests\shopping-view.test.js`.
   中文：验证通过：`npm test -- tests\shopping-store.test.js tests\shopping-view.test.js`。
8. EN: Next recommended slice: extract a reusable image-source picker/contract helper after one more module needs the same image input, or continue Shopping gift-recipient handoff if connector work remains the priority.
   中文：下一步建议：等第二个模块也需要同样图片输入后，抽取可复用图片来源选择器/契约工具；如果继续优先做联动，则推进 Shopping 赠礼收件人交接。

---

## 2026-05-05 Shopping Gift Handoff + Assets Image Source Consumer

Status: DONE

1. EN: Batch goal: advance two same-priority functional slices together without merging ownership boundaries.
   中文：批次目标：同时推进两个同优先级功能切片，但不混淆模块归属边界。
2. EN: Slice A: Shopping orders may attach optional gift-recipient context from Chat/contact, while checkout remains Shopping-owned.
   中文：切片 A：Shopping 订单可附带可选的 Chat/联系人收礼上下文，但结算仍归 Shopping。
3. EN: Slice B: Assets becomes the second real consumer of the shared image-source contract with URL/Gallery/AI-reserved metadata.
   中文：切片 B：Assets 成为共享图片来源契约的第二个真实消费者，支持 URL/Gallery/AI 预留元数据。
4. EN: Guardrail: do not add a separate local file upload flow in Assets or Shopping; local files continue to enter through Gallery first.
   中文：边界：不要在 Assets 或 Shopping 内新增独立本地文件上传流程；本地文件继续先进入 Gallery。
5. EN: Landed: Shopping orders now persist structured `giftRecipient` context with optional Chat/contact ids and recipient name.
   中文：已落地：Shopping 订单现在会持久化结构化 `giftRecipient` 上下文，可包含 Chat/联系人 ID 与收礼人名称。
6. EN: Landed: `ShoppingView.vue` can prefill gift recipient context when opened from a Chat product card and displays the recipient on recent orders.
   中文：已落地：`ShoppingView.vue` 从 Chat 商品卡打开时可预填赠礼收件人上下文，并在最近订单中显示收礼对象。
7. EN: Landed: Assets records now store and render image source metadata through the shared `image-source-contract` helper.
   中文：已落地：Assets 记录现在通过共享 `image-source-contract` 工具存储并渲染图片来源元数据。
8. EN: Validation passed: `npm test -- tests\shopping-store.test.js tests\shopping-view.test.js tests\assets-store.test.js tests\assets-view.test.js`, `npm run lint`, and `npm run build`.
   中文：验证通过：`npm test -- tests\shopping-store.test.js tests\shopping-view.test.js tests\assets-store.test.js tests\assets-view.test.js`、`npm run lint` 与 `npm run build`。
9. EN: Next recommended slice: extract a small reusable image-source picker component from Shopping and Assets, then continue Shopping-to-Chat gift context visibility only after the component boundary is stable.
   中文：下一步建议：从 Shopping 和 Assets 两处用法抽取小型可复用图片来源选择器组件；等组件边界稳定后，再继续 Shopping 到 Chat 的赠礼上下文回显。

---

## 2026-05-05 Shared Image Source Picker Extraction

Status: DONE

1. EN: Landed `ImageSourcePicker.vue` as a shared UI component for the URL/Gallery/AI-reserved image source contract.
   中文：已落地 `ImageSourcePicker.vue`，作为 URL/Gallery/AI 预留图片来源契约的共享 UI 组件。
2. EN: Shopping custom-product creation now uses the shared picker while preserving the existing test-id contract.
   中文：Shopping 自定义商品创建现在使用共享选择器，同时保留既有 test-id 契约。
3. EN: Assets manual record creation/editing now uses the shared picker while preserving the existing test-id contract.
   中文：Assets 手动资产新增/编辑现在使用共享选择器，同时保留既有 test-id 契约。
4. EN: Validation passed: `npm test -- tests\shopping-view.test.js tests\assets-view.test.js tests\shopping-store.test.js tests\assets-store.test.js`, `npm run lint`, and `npm run build`.
   中文：验证通过：`npm test -- tests\shopping-view.test.js tests\assets-view.test.js tests\shopping-store.test.js tests\assets-store.test.js`、`npm run lint` 与 `npm run build`。
5. EN: Legacy picker template blocks have been removed from Shopping/Assets; the next recommended slice is to adopt `ImageSourcePicker` in the next image-heavy module while keeping local file upload centralized in Gallery.
   中文：Shopping/Assets 中旧选择器模板块已清理；下一步建议将 `ImageSourcePicker` 接入下一个重图片模块，同时继续让本地文件上传统一经过 Gallery。

---

## 2026-05-05 Appearance Wallpaper Source Picker Adoption

Status: DONE

1. EN: `ImageSourcePicker.vue` now supports custom source option lists and custom URL/Gallery placeholder copy, so it can serve module-specific image workflows beyond Shopping and Assets.
   中文：`ImageSourcePicker.vue` 已支持自定义来源选项与 URL/Gallery 占位文案，因此可服务 Shopping/Assets 之外的模块图片流程。
2. EN: `AppearanceView.vue` now uses the shared picker for wallpaper source selection across Theme, URL, and Gallery wallpaper modes.
   中文：`AppearanceView.vue` 现在使用共享选择器管理主题壁纸、URL 壁纸与 Gallery 壁纸来源。
3. EN: Existing quick wallpaper thumbnail switching remains intact; the shared picker only replaces the duplicated URL/Gallery form controls.
   中文：既有壁纸缩略图快捷切换仍保留；共享选择器只替换重复的 URL/Gallery 表单控件。
4. EN: Validation passed: `npm test -- tests\appearance-wallpaper-picker.test.js tests\shopping-view.test.js tests\assets-view.test.js tests\system-appearance-wallpaper.test.js`, `npm run lint`, and `npm run build`.
   中文：验证通过：`npm test -- tests\appearance-wallpaper-picker.test.js tests\shopping-view.test.js tests\assets-view.test.js tests\system-appearance-wallpaper.test.js`、`npm run lint` 与 `npm run build`。
5. EN: Next recommended slice: either adopt the shared picker in one more image-heavy module such as Map background/profile imagery, or return to Shopping-to-Chat gift context visibility if connector work is higher priority.
   中文：下一步建议：继续将共享选择器接入 Map 背景/个人资料图像等重图片模块；若联动优先级更高，则回到 Shopping-to-Chat 赠礼上下文回显。

---

## 2026-05-05 Map Picker + Chat Gift Context Sync Batch

Status: DONE

1. EN: `MapVisualSettingsPanel.vue` now uses `ImageSourcePicker` for default-vs-Gallery map visual selection while preserving the existing mode/asset events owned by `MapView.vue`.
   中文：`MapVisualSettingsPanel.vue` 已使用 `ImageSourcePicker` 承载默认/Gallery 地图视觉选择，同时保留由 `MapView.vue` 持有的原 mode/asset 事件。
2. EN: Chat now surfaces read-only confirmed Shopping gift-order context for the active conversation when Shopping orders contain matching `giftRecipient` chat/contact ids.
   中文：当 Shopping 订单包含匹配当前会话的 `giftRecipient` chat/contact ID 时，Chat 现在会只读展示已确认赠礼订单上下文。
3. EN: Gift context cards route back to Shopping with `intent=gift_order` and `orderId`; Chat still does not create carts, orders, or checkout state.
   中文：赠礼上下文卡片会携带 `intent=gift_order` 与 `orderId` 回到 Shopping；Chat 仍不创建购物车、订单或结算状态。
4. EN: Validation passed: `npm test -- tests\map-visual-picker.test.js tests\chat-shopping-preview-routing.test.js tests\appearance-wallpaper-picker.test.js tests\shopping-view.test.js tests\assets-view.test.js`, `npm run lint`, and `npm run build`.
   中文：验证通过：`npm test -- tests\map-visual-picker.test.js tests\chat-shopping-preview-routing.test.js tests\appearance-wallpaper-picker.test.js tests\shopping-view.test.js tests\assets-view.test.js`、`npm run lint` 与 `npm run build`。
5. EN: Next recommended slice: either add Shopping-side highlighting for `intent=gift_order&orderId=...`, or continue image-source consolidation into Profile/Contacts avatar selection.
   中文：下一步建议：要么在 Shopping 侧补充 `intent=gift_order&orderId=...` 的订单高亮/定位，要么继续把图片来源收敛推进到 Profile/Contacts 头像选择。

---

## 2026-05-05 Shopping Gift Order Route Highlight

Status: DONE

1. EN: `ShoppingView.vue` now accepts `source=chat&intent=gift_order&orderId=...` and highlights the matching order.
   中文：`ShoppingView.vue` 现在承接 `source=chat&intent=gift_order&orderId=...`，并高亮对应订单。
2. EN: If the target order is outside the normal recent-order slice, it is pulled into the visible order list so the Chat return path lands on a visible result.
   中文：如果目标订单不在普通最近订单列表中，也会被提到可见订单列表，确保 Chat 跳转落到可见结果。
3. EN: Chat can still only view and route to the gift order; Shopping remains the owner of cart, order, and checkout state.
   中文：Chat 仍只能查看并跳转到赠礼订单；购物车、订单和结算状态继续归 Shopping。
4. EN: Validation passed: `npm test -- tests\shopping-view.test.js tests\chat-shopping-preview-routing.test.js`.
   中文：验证通过：`npm test -- tests\shopping-view.test.js tests\chat-shopping-preview-routing.test.js`。
5. EN: Next recommended slice: continue media-source consolidation into Profile/Contacts avatars, or add a small Shopping order-detail panel if order review needs more depth.
   中文：下一步建议继续把媒体来源收敛推进到 Profile/Contacts 头像；如果订单查看需要更深层入口，则补一个小型 Shopping 订单详情面板。

---

## 2026-05-05 Profile + Contacts Avatar Source Consolidation

Status: DONE

1. EN: `UserProfileView.vue` now uses `ImageSourcePicker` for default, URL, and Gallery avatar sources while keeping legacy `user.avatar` URL compatibility.
   中文：`UserProfileView.vue` 现在使用 `ImageSourcePicker` 管理默认、URL、Gallery 三类头像来源，同时保留旧 `user.avatar` URL 兼容。
2. EN: `ContactsView.vue` now lets role profiles choose default, URL, or Gallery avatar sources and persists structured `avatarImage` metadata on role profiles.
   中文：`ContactsView.vue` 现在允许角色档案选择默认、URL 或 Gallery 头像来源，并在角色档案上持久化结构化 `avatarImage` 元数据。
3. EN: `ImageSourcePicker.vue` now emits both camelCase and kebab-case update events so future explicit listeners and `v-model` consumers share the same component safely.
   中文：`ImageSourcePicker.vue` 现在同时发出 camelCase 与 kebab-case 更新事件，确保后续显式监听和 `v-model` 消费方都能稳定复用。
4. EN: Validation passed: `npm test -- tests\user-profile-avatar-picker.test.js tests\contacts-wallet-ledger-context.test.js tests\shopping-view.test.js tests\assets-view.test.js tests\appearance-wallpaper-picker.test.js tests\map-visual-picker.test.js`.
   中文：验证通过：`npm test -- tests\user-profile-avatar-picker.test.js tests\contacts-wallet-ledger-context.test.js tests\shopping-view.test.js tests\assets-view.test.js tests\appearance-wallpaper-picker.test.js tests\map-visual-picker.test.js`。
5. EN: Next recommended slice: wire Gallery avatar resolution into Chat avatar rendering, or add a focused Shopping order-detail panel if order review becomes higher priority.
   中文：下一步建议将 Gallery 头像解析接入 Chat 头像渲染链；如果订单查看优先级更高，则补一个聚焦的 Shopping 订单详情面板。
---

## 2026-05-05 Chat Gallery Avatar Rendering

Status: DONE

1. EN: Chat list avatars, active assistant-message avatars, and active self-message avatars now resolve structured URL/Gallery avatar sources from Contacts and Profile.
   中文：Chat 会话列表头像、对方消息头像、自己消息头像现在会读取 Contacts/Profile 中结构化保存的 URL/Gallery 头像来源。
2. EN: Thread-level and module-level avatar overrides still take priority over global role/profile Gallery avatars.
   中文：单会话头像覆写和模块级头像覆写仍优先于全局角色/用户 Gallery 头像。
3. EN: ChatDirectory role binding rows now render the same Gallery avatar sources, keeping directory management visually consistent with the actual Chat entry.
   中文：Chat Directory 的角色绑定列表也会显示同一套 Gallery 头像来源，保证管理页和实际聊天入口一致。
4. EN: A small shared resolver was added for display-time avatar image source resolution; Gallery file preview lifecycle remains owned by the views, not by the Chat store.
   中文：新增了小型共享解析工具处理展示期头像来源；Gallery 文件预览 URL 生命周期仍由视图层管理，不塞进 Chat store。
5. EN: Validation passed: `npm test -- tests\chat-avatar-image-source.test.js`.
   中文：验证通过：`npm test -- tests\chat-avatar-image-source.test.js`。
6. EN: Next recommended slice: add a focused Shopping order-detail panel, or continue ChatDirectory/service account polish if Shopping review depth is not yet needed.
   中文：下一步建议：补一个聚焦的 Shopping 订单详情面板；如果暂不需要更深订单查看，则继续推进 ChatDirectory/服务号管理的小型打磨。

---

## 2026-05-05 Shopping Order Detail Panel

Status: DONE

1. EN: Shopping recent orders now support a focused read-only order-detail panel with total, status, item lines, gift context, and ownership-boundary copy.
   中文：Shopping 最近订单现在支持聚焦的只读订单详情面板，展示总额、状态、商品明细、赠礼上下文和归属边界说明。
2. EN: Chat gift-order routes automatically open the matching order detail when `source=chat&intent=gift_order&orderId=...` is present.
   中文：从 Chat 赠礼订单跳回 Shopping 时，若带有 `source=chat&intent=gift_order&orderId=...`，会自动打开对应订单详情。
3. EN: The panel can return to the originating Chat thread when `chatId` is present, but it does not create or mutate cart/checkout state.
   中文：详情面板在存在 `chatId` 时可返回原 Chat 会话，但不会创建或修改购物车/结算状态。
4. EN: Validation passed: `npm test -- tests\shopping-view.test.js`.
   中文：验证通过：`npm test -- tests\shopping-view.test.js`。
5. EN: Next recommended slice: let ChatDirectory service/official accounts adopt the shared image-source avatar contract, or continue order-lifecycle status controls if Shopping depth remains priority.
   中文：下一步建议：让 ChatDirectory 的服务号/公众号接入共享头像来源契约；如果 Shopping 深度仍是优先，则继续补订单生命周期状态控制。
---

## 2026-05-05 ChatDirectory Service Avatar Source Contract

Status: DONE

1. EN: ChatDirectory service and official account editing now uses the shared `ImageSourcePicker` contract with default, URL, and Gallery avatar modes.
   中文：ChatDirectory 的服务号/官方账号编辑已接入共享 `ImageSourcePicker`，支持默认头像、URL 头像、Gallery 素材头像三种来源。
2. EN: `chatStore` now persists contact-level `avatarImage` metadata for non-role chat entries while keeping legacy URL avatar compatibility.
   中文：`chatStore` 已为非角色类聊天对象持久化 contact 级 `avatarImage` 元数据，同时保留旧 URL 头像兼容。
3. EN: Service/official account rows render explicit URL/Gallery avatars when configured and keep the existing service/official icons when no explicit avatar is set.
   中文：服务号/官方账号列表在配置头像后会显示 URL/Gallery 头像；未配置时继续保留现有服务号/官方账号图标，不强制生成通用头像。
4. EN: Validation passed: `npm test -- tests\chat-avatar-image-source.test.js tests\chat-store-model.test.js tests\contacts-wallet-ledger-context.test.js tests\chat-shopping-preview-routing.test.js`.
   中文：验证通过：`npm test -- tests\chat-avatar-image-source.test.js tests\chat-store-model.test.js tests\contacts-wallet-ledger-context.test.js tests\chat-shopping-preview-routing.test.js`。
5. EN: Next recommended slice: continue Shopping order lifecycle controls, because the order-detail panel is already landed and needs explicit completion/cancellation states.
   中文：下一步建议推进 Shopping 订单生命周期控制，因为订单详情面板已落地，需要补齐明确的完成/取消状态。

---

## 2026-05-05 Shopping Order Lifecycle Controls

Status: DONE

1. EN: `shoppingStore` now exposes `updateOrderStatus`, `markOrderCompleted`, and `cancelOrder` for explicit local order lifecycle control.
   中文：`shoppingStore` 已提供 `updateOrderStatus`、`markOrderCompleted`、`cancelOrder`，用于本地订单生命周期状态控制。
2. EN: Completing or cancelling a Shopping order now closes the related Calendar delivery cue, keeping Shopping as order owner and Calendar as explicit handoff consumer.
   中文：Shopping 订单标记完成或取消时，会关闭相关 Calendar 配送线索，保持 Shopping 拥有订单状态、Calendar 只消费显式交接。
3. EN: The Shopping order-detail panel now includes status action buttons and updates the visible status immediately.
   中文：Shopping 订单详情面板已加入状态操作按钮，状态会在详情面板中即时更新。
4. EN: Validation passed: `npm test -- tests\shopping-store.test.js tests\shopping-view.test.js`.
   中文：验证通过：`npm test -- tests\shopping-store.test.js tests\shopping-view.test.js`。
5. EN: Next recommended slice: run a broader connector regression, then consider Shopping service/account presets or Assets-Map location handoff as the next same-size task.
   中文：下一步建议先跑一组更宽的联动回归；随后可考虑 Shopping 服务/店铺预设，或 Assets 与 Map 的位置交接作为同体量任务。
---

## 2026-05-05 Shopping Service Presets

Status: DONE

1. EN: Shopping now has stable service/shop presets (`schat_mall`, `style_cloud`, `nova_digital`, `daily_fresh`) for platform-like grouping inside the Shopping module.
   中文：Shopping 已新增稳定服务/店铺预设（`schat_mall`、`style_cloud`、`nova_digital`、`daily_fresh`），用于在购物模块内部模拟不同购物平台。
2. EN: Products now persist `serviceKey`; seed products and user-created products can be grouped by service without creating separate foreground app modules.
   中文：商品现已持久化 `serviceKey`；内置商品和用户自定义商品都可按服务/店铺归属分组，但不会生成新的前台独立 App。
3. EN: ShoppingView now supports service filtering and custom-product service selection while preserving the existing category query and Home folder category flow.
   中文：ShoppingView 已支持服务/店铺筛选和自定义商品服务选择，同时保留现有品类 query 与 Home 文件夹品类入口流程。
4. EN: Validation passed: `npm test -- tests\planned-module-registry.test.js tests\shopping-store.test.js tests\shopping-view.test.js`.
   中文：验证通过：`npm test -- tests\planned-module-registry.test.js tests\shopping-store.test.js tests\shopping-view.test.js`。
5. EN: Next recommended slice: either connect Shopping service presets to ChatDirectory service accounts, or run broader connector regression before moving to Assets-to-Map handoff.
   中文：下一步建议：要么把 Shopping 店铺预设与 ChatDirectory 服务号账号衔接，要么先跑更宽联动回归后转入 Assets-to-Map 交接。

---

## 2026-05-05 ChatDirectory Shopping Service Account Binding

Status: DONE

1. EN: Chat contacts now persist a normalized `shoppingServiceKey` on service/official accounts so ChatDirectory can reference a Shopping shop identity.
   中文：Chat 联系人现在会在服务号/公众号对象上持久化标准化的 `shoppingServiceKey`，让 ChatDirectory 可以引用 Shopping 店铺身份。
2. EN: ChatDirectory now offers Shopping shop account presets and can create service accounts pre-bound to `schat_mall`, `style_cloud`, `nova_digital`, or `daily_fresh`.
   中文：ChatDirectory 现在提供 Shopping 店铺账号预设，可一键创建绑定 `schat_mall`、`style_cloud`、`nova_digital` 或 `daily_fresh` 的服务号。
3. EN: The service-account edit modal also supports manual Shopping shop binding, and the service list displays the bound shop label.
   中文：服务号编辑弹窗也支持手动绑定 Shopping 店铺，服务号列表会显示已绑定的店铺名称。
4. EN: Ownership remains unchanged: ChatDirectory stores only the chat-facing shop identity reference; Shopping still owns products, cart, orders, checkout, and order status.
   中文：归属边界不变：ChatDirectory 只保存面向聊天的店铺身份引用；商品、购物车、订单、结算和订单状态仍全部归 Shopping 管理。
5. EN: Validation passed: `npm test -- tests\chat-store-model.test.js tests\chat-avatar-image-source.test.js`.
   中文：验证通过：`npm test -- tests\chat-store-model.test.js tests\chat-avatar-image-source.test.js`。
6. EN: Next recommended slice: add Chat-facing product card/service-account sender context, or start Assets-to-Map location handoff if Shopping/Chat linkage is paused.
   中文：下一步建议：补 Chat 侧商品卡/服务号发送者上下文；如果暂缓 Shopping/Chat 联动，则启动 Assets-to-Map 位置交接。

---

## 2026-05-05 Chat Product Card Shop Context

Status: DONE

1. EN: Chat `product_card` blocks now preserve Shopping `serviceKey` and `serviceLabel` after store normalization.
   中文：Chat 的 `product_card` 消息块现在会在 store 归一化后保留 Shopping `serviceKey` 与 `serviceLabel`。
2. EN: Chat product previews now show the Shopping shop label and pass `service` back to `/shopping` when opened.
   中文：Chat 商品预览现在会显示 Shopping 店铺名称，并在跳转 `/shopping` 时携带 `service`。
3. EN: If the active chat contact is a Shopping-bound service account, the `+` panel prioritizes products from that bound shop.
   中文：如果当前聊天对象是已绑定 Shopping 店铺的服务号，`+` 面板会优先展示该店铺的商品。
4. EN: Checkout ownership remains unchanged: Chat can display and send product cards, but cart, order, and checkout still stay in Shopping.
   中文：结算归属不变：Chat 可以展示和发送商品卡，但购物车、订单和结算仍归 Shopping。
5. EN: Validation passed: `npm test -- tests\chat-store-model.test.js tests\chat-user-action-shopping-entry.test.js tests\chat-shopping-preview-routing.test.js`.
   中文：验证通过：`npm test -- tests\chat-store-model.test.js tests\chat-user-action-shopping-entry.test.js tests\chat-shopping-preview-routing.test.js`。
6. EN: Next recommended slice: run broader Shopping/Chat regression, then either add service-account order reminder copy or start Assets-to-Map location handoff.
   中文：下一步建议：先跑更宽 Shopping/Chat 回归；随后可补服务号订单提醒文案，或启动 Assets-to-Map 位置交接。

---

## 2026-05-05 Shopping Logistics Peer Entry

Status: DONE

1. EN: Shopping now has a peer folder/category entry `logistics` for delivery and follow-up tracking.
   中文：Shopping 现在新增与其他购物品类平级的 `logistics` / 物流入口，用于配送和跟进聚合。
2. EN: The Home Shopping folder automatically exposes Logistics because child entries are sourced from `SHOPPING_CATEGORY_ENTRIES`.
   中文：主屏 Shopping 文件夹会自动展示物流入口，因为子入口来源于 `SHOPPING_CATEGORY_ENTRIES`。
3. EN: `ShoppingView.vue` now shows a logistics panel when opened with `category=logistics`; it aggregates Shopping orders and Calendar delivery cues without showing product cards.
   中文：`ShoppingView.vue` 在 `category=logistics` 下展示物流面板，聚合 Shopping 订单与 Calendar 配送线索，不展示商品卡列表。
4. EN: Logistics is not available as a custom-product category, preventing users from creating products under the logistics entry.
   中文：物流不会出现在自定义商品品类选项中，避免用户把物流入口当成商品分类。
5. EN: Linkage judgment: Calendar is the strongest current integration; Chat service accounts can later send shipment messages; Map can later consume delivery/pickup locations; Wallet and Assets remain downstream record consumers only.
   中文：联动判断：Calendar 是当前最强联动；Chat 店铺服务号后续可发货/到达消息；Map 后续可消费配送/取件位置；Wallet 和 Assets 仅作为下游记录消费方。
6. EN: Validation passed: `npm test -- tests\planned-module-registry.test.js tests\shopping-store.test.js tests\shopping-view.test.js`.
   中文：验证通过：`npm test -- tests\planned-module-registry.test.js tests\shopping-store.test.js tests\shopping-view.test.js`。
7. EN: Next recommended slice: add Chat service-account shipment/arrival reminder cards, then decide whether Map should receive delivery-address handoff.
   中文：下一步建议：补 Chat 店铺服务号发货/到达提醒卡，再判断 Map 是否接收配送地址交接。
---

## 2026-05-05 Chat Service Logistics Context

Status: DONE

1. EN: Shopping order items now persist `serviceKey` and `serviceLabel`, so historical logistics context keeps its shop identity even if the product catalog later changes.
   中文：Shopping 订单项现在会固化 `serviceKey` 与 `serviceLabel`，即使后续商品目录调整，历史物流上下文仍保留所属店铺身份。
2. EN: Chat service accounts bound to a Shopping shop now show a read-only logistics reminder context for matching active Calendar delivery cues.
   中文：绑定 Shopping 店铺的 Chat 服务号现在会展示只读物流提醒上下文，仅匹配该店铺相关且仍活跃的 Calendar 配送线索。
3. EN: The Chat logistics context routes back to `/shopping?category=logistics&intent=logistics`, carrying `chatId`, `service`, and `orderId` for review/highlight.
   中文：Chat 物流上下文会跳回 `/shopping?category=logistics&intent=logistics`，并携带 `chatId`、`service`、`orderId` 便于查看和高亮。
4. EN: `ShoppingView.vue` now recognizes Chat logistics source banners and highlights the linked logistics order row.
   中文：`ShoppingView.vue` 现在识别来自 Chat 的物流来源横幅，并高亮对应物流订单行。
5. EN: Ownership remains unchanged: Chat displays and routes; Shopping owns orders/status; Calendar owns reminder lifecycle.
   中文：归属边界不变：Chat 只负责展示与跳转；Shopping 拥有订单和订单状态；Calendar 拥有提醒生命周期。
6. EN: Validation passed: `npm test -- tests\shopping-store.test.js tests\chat-shopping-preview-routing.test.js tests\shopping-view.test.js tests\calendar-shopping-cue-view.test.js`.
   中文：验证通过：`npm test -- tests\shopping-store.test.js tests\chat-shopping-preview-routing.test.js tests\shopping-view.test.js tests\calendar-shopping-cue-view.test.js`。
7. EN: Next recommended slice: add explicit Chat message-card composition for shipment/arrival updates, or move to Map delivery-address handoff if the logistics flow needs location context next.
   中文：下一步建议：补充可发送的 Chat 发货/到达消息卡；若物流流转下一步更需要位置语境，则转向 Map 配送地址交接。

---

## 2026-05-05 Shopping Promotion / Logistics Service / Food Delivery Baseline

Status: DONE

1. EN: Product boundary updated: Shopping shop service accounts should focus on new-arrival, discount, and product-promotion pushes; logistics reminders are now owned by dedicated Logistics service accounts.
   中文：产品边界已更新：Shopping 店铺服务号聚焦新品、折扣和商品推广推送；物流提醒改由独立的物流服务号承接。
2. EN: Chat contacts now support normalized `logisticsServiceKey` and `foodDeliveryServiceKey`, with ChatDirectory presets for Local Express, Standard Courier, International Logistics, and Food Delivery Dispatch.
   中文：Chat 联系人现在支持标准化 `logisticsServiceKey` 与 `foodDeliveryServiceKey`；ChatDirectory 已提供同城急送、普通快递、国际物流、外卖通知等服务号预设。
3. EN: Chat logistics context is now visible only in Logistics service-account chats and aggregates active Shopping/Calendar delivery cues instead of being scoped to a Shopping shop account.
   中文：Chat 物流上下文现在只在物流服务号会话中显示，并统一聚合活跃的 Shopping/Calendar 配送线索，不再绑定到某个 Shopping 店铺号。
4. EN: Food Delivery is now a Home folder-style module at `/food-delivery`, with child entries for restaurants, nearby, fast food, cafe/drinks, dessert, and grocery delivery.
   中文：外卖已作为主屏文件夹式模块落地，Route 为 `/food-delivery`，子入口包括餐厅、附近、快餐、咖啡饮品、甜品、生鲜外送。
5. EN: Food Delivery and Map boundary is documented in code: Food Delivery owns restaurant/order state; Map should only provide restaurant location, delivery address, nearby filters, courier route, and ETA context.
   中文：外卖与 Map 的边界已在代码中明确：外卖拥有餐厅和订单状态；Map 只提供餐厅位置、配送地址、附近筛选、骑手路线与 ETA 上下文。
6. EN: Validation passed: `npm test -- tests\planned-module-registry.test.js tests\home-folder-entry.test.js tests\food-delivery-view.test.js tests\chat-store-model.test.js tests\chat-avatar-image-source.test.js tests\chat-shopping-preview-routing.test.js tests\system-widget-import.test.js tests\app-icon-presentation.test.js`.
   中文：验证通过：`npm test -- tests\planned-module-registry.test.js tests\home-folder-entry.test.js tests\food-delivery-view.test.js tests\chat-store-model.test.js tests\chat-avatar-image-source.test.js tests\chat-shopping-preview-routing.test.js tests\system-widget-import.test.js tests\app-icon-presentation.test.js`。
7. EN: Next recommended slice: add a local Food Delivery data baseline for restaurants, menus, cart, and order skeleton before deepening Map courier handoff.
   中文：下一步建议：先补外卖本地数据基线，包括餐厅、菜单、购物车和订单骨架，再深化 Map 骑手/路线交接。

---

## 2026-05-05 Food Delivery Local Data Baseline

Status: DONE

1. EN: Added a persisted `foodDelivery` Pinia store with restaurant records, menu items, single-restaurant cart behavior, local food orders, order status updates, backup/restore, and storage hydration.
   中文：新增持久化 `foodDelivery` Pinia store，包含餐厅记录、菜单项、单餐厅购物车、本地外卖订单、订单状态更新、备份/恢复与存储水合。
2. EN: `FoodDeliveryView.vue` now shows local restaurant/menu data, supports adding menu items to the food cart, creates baseline food orders, and keeps Map handoff copy visible.
   中文：`FoodDeliveryView.vue` 现在展示本地餐厅/菜单数据，支持把菜单项加入外卖购物车，生成基础外卖订单，并保留 Map 交接边界说明。
3. EN: Settings backup/export/import and storage diagnostics now include `store:food-delivery`, so Food Delivery data is not a local orphan.
   中文：Settings 备份导出/导入和存储诊断已纳入 `store:food-delivery`，避免外卖数据成为本地孤岛。
4. EN: Validation passed: `npm test -- tests\food-delivery-store.test.js tests\food-delivery-view.test.js tests\home-folder-entry.test.js tests\system-widget-import.test.js`.
   中文：验证通过：`npm test -- tests\food-delivery-store.test.js tests\food-delivery-view.test.js tests\home-folder-entry.test.js tests\system-widget-import.test.js`。
5. EN: Next recommended slice: add Chat food-delivery service-account push context for accepted/cooking/rider pickup/delivered/exception states before Map ETA handoff.
   中文：下一步建议：先补 Chat 外卖服务号推送上下文，覆盖接单、备餐、骑手取餐、送达、异常等状态，再推进 Map ETA 交接。

---

## 2026-05-05 Chat Food Delivery Service Context

Status: DONE

1. EN: Chat now shows read-only Food Delivery service-account push context only when the active contact has `foodDeliveryServiceKey`.
   中文：Chat 现在只会在当前联系人绑定 `foodDeliveryServiceKey` 时显示只读外卖服务号推送上下文。
2. EN: The push card displays restaurant name, primary menu item, amount, delivery address summary, and Food Delivery order status labels such as accepted/cooking/rider pickup/delivered/cancelled.
   中文：推送卡会展示餐厅名、主要菜品、金额、配送地址摘要，以及接单、备餐、骑手取餐、送达、取消等外卖订单状态标签。
3. EN: Opening a push routes to `/food-delivery?source=chat&intent=food_delivery_order&orderId=...`; Food Delivery shows a Chat source banner and highlights the linked order.
   中文：点击推送会跳转到 `/food-delivery?source=chat&intent=food_delivery_order&orderId=...`；外卖页会显示 Chat 来源提示并高亮对应订单。
4. EN: Ownership remains unchanged: Chat displays and routes; Food Delivery owns restaurants, menus, cart, orders, and order status.
   中文：归属边界不变：Chat 只负责展示和跳转；Food Delivery 拥有餐厅、菜单、购物车、订单和订单状态。
5. EN: Validation passed: `npm test -- tests\chat-shopping-preview-routing.test.js tests\food-delivery-view.test.js`.
   中文：验证通过：`npm test -- tests\chat-shopping-preview-routing.test.js tests\food-delivery-view.test.js`。
6. EN: Next recommended slice: connect Map as a read-only Food Delivery location/ETA provider, then add user-created restaurant/menu image sources using the shared Gallery/URL contract.
   中文：下一步建议：接入 Map 作为只读外卖位置/ETA 提供方，然后补用户自定义餐厅/菜单图片来源并复用 Gallery/URL 契约。

---

## 2026-05-05 Map Food Delivery Read-Only Handoff

Status: DONE

1. EN: `mapStore.buildFoodDeliveryMapHandoff()` now returns read-only Food Delivery context with restaurant pickup point, current delivery address, distance, ETA, route summary, and source metadata.
   中文：`mapStore.buildFoodDeliveryMapHandoff()` 现在会返回只读外卖上下文，包括餐厅取餐点、当前配送地址、距离、ETA、路线摘要和来源元数据。
2. EN: The handoff explicitly marks `readOnly`, `orderOwner: "food_delivery"`, and `mapOwner: "location_eta_context"` so Map does not create or own food orders.
   中文：该交接显式标记 `readOnly`、`orderOwner: "food_delivery"` 和 `mapOwner: "location_eta_context"`，避免 Map 创建或拥有外卖订单。
3. EN: `FoodDeliveryView.vue` now shows a Map delivery context panel and uses the Map current location as the checkout delivery address.
   中文：`FoodDeliveryView.vue` 现在展示 Map 配送上下文面板，并在生成外卖订单时使用 Map 当前定位作为配送地址。
4. EN: Validation passed: `npm test -- tests\map-trip-baseline.test.js tests\food-delivery-view.test.js`.
   中文：验证通过：`npm test -- tests\map-trip-baseline.test.js tests\food-delivery-view.test.js`。
5. EN: Next recommended slice: add user-created restaurant/menu image sources via the shared Gallery/URL contract, then deepen Food Delivery exception/status message cards.
   中文：下一步建议：通过共享 Gallery/URL 契约补用户自定义餐厅/菜单图片来源，然后深化外卖异常/状态消息卡。

---

## 2026-05-05 Food Delivery Custom Image Sources

Status: DONE

1. EN: `FoodDeliveryView.vue` now supports user-created restaurants with category, cuisine, address, delivery fee, distance, ETA, and URL/Gallery image source.
   中文：`FoodDeliveryView.vue` 现在支持用户自定义餐厅，可填写分类、菜系、地址、配送费、距离、ETA，并配置 URL/Gallery 图片来源。
2. EN: The same view also supports user-created menu items with restaurant binding, category, price, description, and URL/Gallery image source.
   中文：同一页面也支持用户自定义菜单项，可绑定餐厅、分类、价格、描述，并配置 URL/Gallery 图片来源。
3. EN: Restaurant and menu cards render URL images directly and Gallery images through scoped Gallery preview URLs; local files still enter Gallery first.
   中文：餐厅卡和菜单卡会直接渲染 URL 图片，并通过有作用域的 Gallery 预览 URL 渲染 Gallery 图片；本地文件仍先进入 Gallery。
4. EN: Validation passed: `npm test -- tests\food-delivery-view.test.js tests\food-delivery-store.test.js`.
   中文：验证通过：`npm test -- tests\food-delivery-view.test.js tests\food-delivery-store.test.js`。
5. EN: Next recommended slice: deepen Food Delivery exception/status message cards for rider delay, restaurant cancellation, address change, and ETA update.
   中文：下一步建议：深化外卖异常/状态消息卡，覆盖骑手延迟、商家取消、改地址和预计送达变化。
