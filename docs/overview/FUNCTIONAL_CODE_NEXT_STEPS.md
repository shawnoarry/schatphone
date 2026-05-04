# Functional Code Next Steps / 功能代码推进项接手单

Updated / 更新时间: 2026-05-04

## 1. Purpose / 用途

This document records the current functional-code opportunities after visual rebuild work was intentionally parked.  
It is for future developers and AI coding assistants who need to decide what code work can safely move next.

本文记录视觉重建被主动搁置后，当前功能代码层面仍可推进的事项。  
它面向后续开发同事与 AI 编程助手，用于判断下一步代码工作从哪里开最安全、最有收益。

Authority note / 职责说明:

- This file is a handoff reference, not the live execution board.
  本文件是接手参考，不是动态执行看板。
- Active tasks with status still belong only in `docs/roadmap/TODO_ROADMAP.md`.
  带状态的执行任务仍只允许进入 `docs/roadmap/TODO_ROADMAP.md`。
- If one item below becomes active work, summarize it into `docs/roadmap/TODO_ROADMAP.md` before or during implementation.
  若下列某项进入实际开发，应先在或同步在 `docs/roadmap/TODO_ROADMAP.md` 摘要登记。
- Visual rebuild notes remain parked in `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md`.
  视觉重建建议仍暂存于 `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md`。

Source set / 参考来源:

- `docs/roadmap/TODO_ROADMAP.md`
- `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
- `docs/pm/TODO_PM_STATUS_REPORT.md`
- Current source scan of `src/views`, `src/components`, and `tests`

---

## 2. Quick Verdict / 快速结论

The next functional-code move should not be a large new gameplay feature.  
The safest and most valuable move is still low-risk decomposition of oversized views.

下一步功能代码不建议先做大体量新玩法。  
当前最安全、最有收益的方向仍是对超大视图做低风险拆分。

Current result and recommended immediate priority / 当前结果与推荐近期优先级:

1. Landed first: extracted `ChatThreadMenuPanel` from `src/views/ChatView.vue` into `src/components/chat/ChatThreadMenuPanel.vue`.
   已先落地：将 `ChatThreadMenuPanel` 从 `src/views/ChatView.vue` 抽入 `src/components/chat/ChatThreadMenuPanel.vue`。
2. Landed second: extracted `SettingsStorageDiagnosticsSection` from `src/views/SettingsView.vue`.
   已第二步落地：从 `src/views/SettingsView.vue` 抽出 `SettingsStorageDiagnosticsSection`。
3. Landed third: extracted `SettingsBackupSection` from `src/views/SettingsView.vue`.
   已第三步落地：从 `src/views/SettingsView.vue` 抽出 `SettingsBackupSection`。
4. Landed fourth: extracted `ChatMessageEditModal` from `src/views/ChatView.vue`.
   已第四步落地：从 `src/views/ChatView.vue` 抽出 `ChatMessageEditModal`。
5. Landed fifth: extracted `MapVisualSettingsPanel` from `src/views/MapView.vue`.
   已第五步落地：从 `src/views/MapView.vue` 抽出 `MapVisualSettingsPanel`。
6. Landed sixth: extracted `ChatUserActionPanel` from `src/views/ChatView.vue`.
   已第六步落地：从 `src/views/ChatView.vue` 抽出 `ChatUserActionPanel`。
7. Landed seventh: extracted `MapAreaFeedbackPanel` from `src/views/MapView.vue`.
   已第七步落地：从 `src/views/MapView.vue` 抽出 `MapAreaFeedbackPanel`。
8. Landed eighth: extracted `SettingsPushSection` from `src/views/SettingsView.vue`.
   已第八步落地：从 `src/views/SettingsView.vue` 抽出 `SettingsPushSection`。
9. Landed ninth: extracted `MapTripControlPanel` from `src/views/MapView.vue`.
   已第九步落地：从 `src/views/MapView.vue` 抽出 `MapTripControlPanel`。
10. Landed tenth: extracted `SettingsAutomationSection` from `src/views/SettingsView.vue`.
    已第十步落地：从 `src/views/SettingsView.vue` 抽出 `SettingsAutomationSection`。
11. Landed eleventh: extracted `MapRouteFamiliarityPanel` from `src/views/MapView.vue`.
    已第十一步落地：从 `src/views/MapView.vue` 抽出 `MapRouteFamiliarityPanel`。
12. Landed twelfth: extracted `MapTripHistoryPanel` from `src/views/MapView.vue`.
    已第十二步落地：从 `src/views/MapView.vue` 抽出 `MapTripHistoryPanel`。
13. Landed thirteenth: shared thumbnail cleanup now covers the major asset-consuming surfaces.
    已落地第十三步：共享缩略图清理已覆盖主要素材消费界面。
14. Landed fourteenth: Network guided setup first slice now provides provider templates, setup progress, and next-step copy in `NetworkView.vue`.
    已落地第十四步：Network 引导配置第一刀已在 `NetworkView.vue` 提供供应商模板、配置进度与下一步提示文案。
15. Landed fifteenth: Network connection-test failures now classify likely cause, show actionable fixes, and write clearer diagnostics.
    已落地第十五步：Network 连接测试失败现在会分类可能原因、展示可执行修复建议，并写入更清晰的诊断记录。
16. Landed sixteenth: Network endpoint guidance now checks custom gateway path/CORS/auth risks and confirms manual-model fallback.
    已落地第十六步：Network 接口指引现在会检查自定义网关路径、CORS、鉴权风险，并确认手动模型兜底。
17. Landed seventeenth: Network preset safety now warns before saving risky presets and clarifies local key/model fallback handling.
    已落地第十七步：Network 预设安全现在会在保存风险预设前提示，并说明 Key 本地保存与模型兜底处理。
18. Landed eighteenth: Network now has a real Chat smoke-test path that calls `callAI` without writing chat history and records diagnostics.
    已落地第十八步：Network 现在具备真实 Chat 烟测链路，会调用 `callAI`，不写入聊天记录，并记录诊断。
19. Landed nineteenth: Files now has a persisted metadata-only file index store, local import indexing, quick-note/favorite/delete behavior, and regression tests.
    已落地第十九步：Files 现在具备持久化的“仅元数据”文件索引 store、本地导入索引、便签/收藏/删除行为与回归测试。
20. Landed twentieth: More experimental toggles now persist through `settings.more.featureToggles` with normalized store helpers and regression tests.
    已落地第二十步：More 实验开关现在通过 `settings.more.featureToggles` 持久化，并具备归一化 store 方法与回归测试。
21. Landed twenty-first: Profile now shows the same prompt-facing user AI context summary that Chat injects for non-anonymous conversations.
    已落地第二十一步：Profile 现在展示与 Chat 非匿名会话实际注入一致的用户 AI 上下文摘要。
22. Landed twenty-second: Wallet now has a local virtual ledger store, balance summary, manual transfer records, persistence, and regression tests.
    已落地第二十二步：Wallet 现在具备本地虚拟账本 store、余额汇总、手动转账流水、持久化与回归测试。
23. Landed twenty-third: Phone now has a local role-call log store, recent-call UI, missed/completed counters, persistence, backup/restore, and regression tests.
    已落地第二十三步：Phone 现在具备本地角色通话记录 store、最近通话 UI、未接/已接统计、持久化、备份恢复与回归测试。
24. Landed twenty-fourth: Stock now has a local simulated-market store, watchlist/holdings UI, top-mover display, persistence, backup/restore, and regression tests.
    已落地第二十四步：Stock 现在具备本地模拟行情 store、关注/持仓 UI、波动提示、持久化、备份恢复与回归测试。
25. Landed twenty-fifth: Settings backup and storage diagnostics now include Files, Wallet, Phone, and Stock while keeping old backups backward-compatible.
    已落地第二十五步：Settings 备份与存储诊断现已纳入 Files、Wallet、Phone、Stock，并保持旧备份向后兼容。
26. Next recommended slice: connect one of the new local MVPs to an existing loop, preferably Chat `transfer_virtual` blocks into Wallet ledger entries, or missed Phone calls into notification/Calendar cues.
    下一推荐切片：把一个新的本地 MVP 接入既有闭环，优先考虑将 Chat `transfer_virtual` 卡片接入 Wallet 流水，或将 Phone 未接来电接入通知/日历线索。
27. Keep deferring visual redesign and broad store rewrites.
   继续暂缓视觉重建与大范围 store 重构。

Why / 原因:

- Core product loops already run; the main risk is maintainability.
  核心产品闭环已经可运行，当前主要风险是可维护性。
- `ChatView.vue`, `SettingsView.vue`, and `MapView.vue` are large enough that continued feature stacking will raise regression cost.
  `ChatView.vue`、`SettingsView.vue`、`MapView.vue` 已经足够大，继续堆功能会抬高回归成本。
- Existing tests protect important behavior, so display-first extraction is currently cheaper than domain redesign.
  现有测试已经保护关键行为，因此先抽展示层比重做领域逻辑更划算。

---

## 3. Current Functional Baseline / 当前功能基线

The following loops are already meaningful and should be protected during new work:

以下闭环已经成立，后续改动应优先保护它们：

1. `Lock -> Home -> Chat -> notification feedback`
   `锁屏 -> 桌面 -> 聊天 -> 通知反馈`
2. `WorldBook -> Chat prompt injection`
   `世界书 -> Chat 提示词注入`
3. `Map trip -> reward/event summary -> Calendar reminder -> Calendar event -> scheduled push`
   `地图行程 -> 奖励/事件摘要 -> 日历提醒 -> 日历事件 -> 定时推送`
4. `Gallery asset hub -> Contacts / Chat Directory / Chat / Map / Appearance consumption`
   `相册素材中台 -> 通讯录 / 会话通讯录 / Chat / Map / Appearance 消费`
5. `Settings backup/restore -> storage diagnostics -> persistence recovery`
   `设置备份恢复 -> 存储诊断 -> 持久化恢复`

Practical meaning / 实操含义:

- Prefer refactors that reduce future edit risk without changing these flows.
  优先做不改变这些闭环、但能降低后续修改风险的重构。
- Avoid changing store contracts while extracting UI panels.
  抽 UI 面板时避免同时改 store 契约。
- Keep route, persistence, prompt assembly, push scheduling, and backup semantics stable unless the task explicitly targets them.
  除非任务明确要改，否则保持路由、持久化、提示词组装、推送调度与备份语义稳定。

---

## 4. Evidence from Current Code / 当前代码信号

Largest view hotspots / 最大视图热点:

| File / 文件 | Approx. lines / 约行数 | Meaning / 含义 |
| --- | ---: | --- |
| `src/views/ChatView.vue` | 4968 | Highest maintainability risk; should be decomposed before adding more Chat-side features. / 可维护性风险最高；继续加 Chat 功能前应先拆。 |
| `src/views/SettingsView.vue` | 2302 | Dense configuration page; good candidate for section extraction. / 配置密度高，适合按区块拆。 |
| `src/views/MapView.vue` | 1802 | Feature-rich but concentrated; extract panels before adding more trip/event layers. / 功能层丰富但集中，继续加行程/事件层前应先拆面板。 |
| `src/views/ChatDirectoryView.vue` | 1659 | Concept-heavy management surface; improve guidance before more management actions. / 概念密度高，继续加管理动作前应先改善可理解性。 |
| `src/views/AppearanceView.vue` | 1507 | Visual work is parked; avoid investing here unless functional bugfixes are needed. / 视觉工作已搁置，除功能缺陷外不建议先投入。 |

Existing extracted components / 已有抽取组件:

- `src/components/AppDialogHost.vue`
- `src/components/assets/AssetStatusBadge.vue`
- `src/components/settings/SettingsMenuItem.vue`
- `src/components/settings/SettingsQuickAccessButton.vue`

Useful test coverage / 可用测试护栏:

- Chat behavior: `tests/chat-view-semantic-revision.test.js`, `tests/chat-worldbook-binding-visibility.test.js`, `tests/chat-message-edit.test.js`
- Map behavior: `tests/map-trip-baseline.test.js`, `tests/map-worldbook-context.test.js`
- Calendar behavior: `tests/calendar-event-store.test.js`, `tests/calendar-worldbook-context.test.js`
- System and persistence: `tests/system-automation.test.js`, `tests/system-backup-reminder.test.js`, `tests/system-backup-copy-tone.test.js`, `tests/persistence-layer-reconcile.test.js`
- Gallery assets: `tests/gallery-store.test.js`

---

## 5. Recommended Code Queue / 推荐代码推进队列

### 5.1 Landed First Slice: `ChatThreadMenuPanel`

Suggested target / 建议目标:

- New component: `src/components/chat/ChatThreadMenuPanel.vue`
- Source block: the `v-if="showThreadMenu"` menu inside `src/views/ChatView.vue`
- Main parent state kept in parent: `showThreadMenu`, `threadIdentityDraft`, `threadSettingsDraft`, active service summary, active WorldBook context, automation hints

Status / 状态:

- `DONE` in code on 2026-05-02.
  2026-05-02 已在代码中落地。
- Store writes, navigation, prompt assembly, and persistence stayed in `ChatView.vue`.
  store 写入、导航、提示词组装与持久化仍留在 `ChatView.vue`。
- Verified with `npm run lint` and targeted Chat tests.
  已通过 `npm run lint` 与 Chat 专项测试验证。

Why first / 为什么优先:

- It reduces the largest file in the repo.
  它能直接降低仓库最大文件的维护压力。
- The thread menu is already visually and behaviorally bounded.
  会话菜单在视觉和行为上已经相对成块。
- Current tests already cover WorldBook visibility and Chat semantic behavior.
  当前已有测试覆盖 WorldBook 可见性与 Chat 语义行为。

Keep in parent on first extraction / 第一轮先留在父组件:

- Store writes
- Prompt assembly
- Conversation persistence
- Save handlers such as `saveThreadSettings` and `saveThreadIdentityOverrides`
- Navigation handlers such as `openWorldBookFromThreadContext` and `openChatDirectory`

Acceptance / 验收:

- Thread menu opens/closes the same way.
  会话菜单开关行为不变。
- Service template summary still jumps to Chat Directory.
  服务模板摘要仍可跳转会话通讯录。
- WorldBook summary still shows worldview, injected counts, point chips, and warnings.
  WorldBook 摘要仍显示世界观、注入数量、知识点 chip 与告警。
- Thread tuning and identity override save behavior remains unchanged.
  会话调校与身份覆写保存行为不变。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/chat-worldbook-binding-visibility.test.js`
- `npm test -- tests/chat-view-semantic-revision.test.js`

Risk / 风险:

- Prop boundary will be wide. Keep it boring and explicit; do not redesign the settings model in the same slice.
  props 边界会偏宽。第一刀宁可朴素明确，不要同时重做设置模型。

### 5.2 Landed Second Slice: `SettingsStorageDiagnosticsSection`

Suggested target / 建议目标:

- New component: `src/components/settings/SettingsStorageDiagnosticsSection.vue`
- Source block: storage diagnostics content inside the Settings `about` subpage

Status / 状态:

- `DONE` in code on 2026-05-02.
  2026-05-02 已在代码中落地。
- Persistence inspection, repair, report cleanup, and Network routing stayed in `SettingsView.vue`.
  持久化检查、修复、报告清理与 Network 路由仍留在 `SettingsView.vue`。
- Verified with `npm run lint`, `tests/persistence-layer-reconcile.test.js`, and `tests/system-automation.test.js`.
  已通过 `npm run lint`、`tests/persistence-layer-reconcile.test.js` 与 `tests/system-automation.test.js` 验证。

Why it is safer / 为什么更安全:

- The section is mostly display + callback buttons.
  该区块主要是展示和回调按钮。
- It has a clear domain: storage audit, latest report, repair, and report jumps.
  领域边界清晰：存储检查、最近报告、修复与报告跳转。
- It does not need to change persistence APIs.
  不需要改变持久化 API。

Acceptance / 验收:

- Running storage audit, repairing drift, clearing reports, and opening Network reports behave the same.
  运行检查、修复漂移、清理报告与跳转 Network 报告行为不变。
- The `about` subpage still performs silent audit when opened.
  打开 `about` 子页时仍执行静默检查。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/persistence-layer-reconcile.test.js`
- `npm test -- tests/system-automation.test.js`

### 5.3 Landed Third Slice: `SettingsBackupSection`

Suggested target / 建议目标:

- New component: `src/components/settings/SettingsBackupSection.vue`
- Source block: Data & Security backup/export/import UI in `SettingsView.vue`

Status / 状态:

- `DONE` in code on 2026-05-02.
  2026-05-02 已在代码中落地。
- Backup payload building, import rollback, file input ownership, and store restore/export calls stayed in `SettingsView.vue`.
  备份组包、导入回滚、文件 input 所有权与 store 恢复/导出调用仍留在 `SettingsView.vue`。
- Verified with `npm run lint`, `tests/system-backup-reminder.test.js`, `tests/system-backup-copy-tone.test.js`, and `tests/gallery-store.test.js`.
  已通过 `npm run lint`、`tests/system-backup-reminder.test.js`、`tests/system-backup-copy-tone.test.js` 与 `tests/gallery-store.test.js` 验证。

Why it matters / 为什么有价值:

- Backup is important user trust infrastructure.
  备份是用户信任基础设施。
- The UI block is product-language heavy and clutters `SettingsView.vue`.
  这个 UI 区块文案密度高，会增加 `SettingsView.vue` 阅读成本。

Keep in parent on first extraction / 第一轮先留在父组件:

- Actual backup payload building
- Import rollback
- File input ownership if extraction gets too awkward
- Store restore/export calls

Acceptance / 验收:

- Export/import buttons behave exactly the same.
  导出/导入按钮行为完全不变。
- Asset package option, copy tone, and feedback messages remain unchanged.
  素材包选项、提示语气与反馈消息保持不变。
- Failed import still rolls back.
  导入失败仍可回滚。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/system-backup-reminder.test.js`
- `npm test -- tests/system-backup-copy-tone.test.js`
- `npm test -- tests/gallery-store.test.js`

### 5.4 Landed Fourth Slice: `ChatMessageEditModal`

Suggested target / 建议目标:

- New component: `src/components/chat/ChatMessageEditModal.vue`
- Source block: the `v-if="showEditMessageModal"` editor modal in `src/views/ChatView.vue`

Status / 状态:

- `DONE` in code on 2026-05-02.
  2026-05-02 已在代码中落地。
- Edit validation, user-message update, assistant semantic revision persistence, and UI notices stayed in `ChatView.vue`.
  编辑校验、用户消息更新、AI 语义修订持久化与 UI 提示仍留在 `ChatView.vue`。
- Verified with `npm run lint`, `tests/chat-message-edit.test.js`, `tests/chat-view-semantic-revision.test.js`, and `npm run build`.
  已通过 `npm run lint`、`tests/chat-message-edit.test.js`、`tests/chat-view-semantic-revision.test.js` 与 `npm run build` 验证。

Why it matters / 为什么有价值:

- It keeps the Chat edit surface isolated before more message-action work.
  它在继续扩展消息操作前，先把 Chat 编辑弹层隔离出来。
- The boundary is small and explicit, so behavior risk is lower than extracting prompt or store logic.
  边界小且明确，因此风险低于拆提示词或 store 逻辑。

Keep in parent on first extraction / 第一轮先留在父组件:

- Message edit validation
- Store calls for user-message update
- Store calls for assistant semantic revision
- Success/error notice handling

Acceptance / 验收:

- User-message edit still updates the message.
  用户消息编辑仍能更新消息。
- Assistant edit still writes semantic revision rather than replacing the raw message flow.
  AI 消息编辑仍写入语义修订，而不是改变原始消息流程。
- Invalid draft state, cancel, save, and restore-related behavior remain unchanged.
  无效草稿状态、取消、保存与恢复相关行为保持不变。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/chat-message-edit.test.js`
- `npm test -- tests/chat-view-semantic-revision.test.js`

### 5.5 Landed Fifth Slice: `MapVisualSettingsPanel`

Suggested target / 建议目标:

- New component: `src/components/map/MapVisualSettingsPanel.vue`
- Source block: `map-visual-panel` inside `src/views/MapView.vue`

Status / 状态:

- `DONE` in code on 2026-05-02.
  2026-05-02 已在代码中落地。
- Visual mode resolution, gallery preview loading, one-off upload policy, gallery import, provider refresh, and store writes stayed in `MapView.vue`.
  视觉模式解析、素材预览加载、单次上传策略、素材库导入、供应商刷新与 store 写入仍留在 `MapView.vue`。
- The hidden file input stayed in `MapView.vue` so the upload picker ref and import policy remain owned by the parent.
  隐藏文件 input 仍留在 `MapView.vue`，因此上传选择器 ref 与导入策略继续由父组件拥有。
- Verified with `npm run lint`, `tests/map-trip-baseline.test.js`, `tests/map-worldbook-context.test.js`, `tests/gallery-store.test.js`, and `npm run build`.
  已通过 `npm run lint`、`tests/map-trip-baseline.test.js`、`tests/map-worldbook-context.test.js`、`tests/gallery-store.test.js` 与 `npm run build` 验证。

Why it matters / 为什么有价值:

- It has a strong panel boundary.
  它的面板边界清晰。
- Visual work is currently parked, so this was intentionally framed as maintainability work, not visual redesign.
  视觉工作当前已搁置，因此这次刻意定位为可维护性拆分，而不是视觉重做。

Acceptance / 验收:

- Default/gallery/one-off/provider visual modes behave the same.
  默认、素材库、单次、供应商视觉模式行为不变。
- Gallery fallback and one-off upload policy remain unchanged.
  素材库回退与单次上传策略不变。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/map-trip-baseline.test.js`
- `npm test -- tests/map-worldbook-context.test.js`
- `npm test -- tests/gallery-store.test.js`

### 5.6 Landed Sixth Slice: `ChatUserActionPanel`

Suggested target / 建议目标:

- New component: `src/components/chat/ChatUserActionPanel.vue`
- Source block: the `v-if="showUserActionPanel"` + panel inside `src/views/ChatView.vue`

Status / 状态:

- `DONE` in code on 2026-05-02.
  2026-05-02 已在代码中落地。
- Media file input ownership, form validation, current-location checks, gallery preview loading, asset import, message append, and store writes stayed in `ChatView.vue`.
  媒体文件 input 所有权、表单校验、当前位置检查、素材预览加载、素材导入、消息追加与 store 写入仍留在 `ChatView.vue`。
- Verified with `npm run lint`, `tests/chat-store-model.test.js`, `tests/chat-view-semantic-revision.test.js`, `tests/chat-worldbook-binding-visibility.test.js`, `tests/gallery-store.test.js`, and `npm run build`.
  已通过 `npm run lint`、`tests/chat-store-model.test.js`、`tests/chat-view-semantic-revision.test.js`、`tests/chat-worldbook-binding-visibility.test.js`、`tests/gallery-store.test.js` 与 `npm run build` 验证。

Why it matters / 为什么有价值:

- It removes a dense multi-form surface from `ChatView.vue` without changing rich-message semantics.
  它从 `ChatView.vue` 中移出密集的多表单界面，同时不改变富消息语义。
- It keeps future work on image/GIF/gallery/link/location/transfer/voice lanes more approachable.
  它让后续维护图片/GIF/素材库/链接/位置/转账/语音通道更容易下手。

Keep in parent on first extraction / 第一轮先留在父组件:

- File input ref and upload picker
- Link, transfer, voice, gallery, and location validation
- Gallery preview loading and preview release
- Asset import and usage binding
- Message append and AI auto-reply scheduling

Acceptance / 验收:

- Image/GIF picker behavior remains unchanged.
  图片/GIF 选择器行为保持不变。
- Gallery asset send and role-bound asset badges remain unchanged.
  素材库发送与角色绑定素材标识保持不变。
- Link card, transfer card, voice card, current-location share, suggested replies, back, and collapse behavior remain unchanged.
  链接卡片、转账卡片、语音卡片、当前位置分享、建议回复、返回与收起行为保持不变。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/chat-store-model.test.js`
- `npm test -- tests/chat-view-semantic-revision.test.js`
- `npm test -- tests/chat-worldbook-binding-visibility.test.js`
- `npm test -- tests/gallery-store.test.js`

### 5.7 Landed Seventh Slice: `MapAreaFeedbackPanel`

Suggested target / 建议目标:

- New component: `src/components/map/MapAreaFeedbackPanel.vue`
- Source block: Area feedback panel inside `src/views/MapView.vue`

Status / 状态:

- `DONE` in code on 2026-05-02.
  2026-05-02 已在代码中落地。
- Feedback derivation, related knowledge-point index building, time formatting, and WorldBook route query building stayed in `MapView.vue`.
  反馈派生、关联知识点索引、时间格式化与 WorldBook 路由 query 构建仍留在 `MapView.vue`。
- Verified with `npm run lint`, `tests/map-worldbook-context.test.js`, `tests/map-trip-baseline.test.js`, and `npm run build`.
  已通过 `npm run lint`、`tests/map-worldbook-context.test.js`、`tests/map-trip-baseline.test.js` 与 `npm run build` 验证。

Why it matters / 为什么有价值:

- It removes a WorldBook-linked derived-data panel from `MapView.vue` without touching map progression rules.
  它从 `MapView.vue` 中移出一块连接 WorldBook 的派生数据面板，同时不触碰地图进度规则。
- It keeps future Map event or trip work from having to edit the area feedback rendering block directly.
  它让后续 Map 事件或行程工作不必直接改区域反馈渲染块。

Keep in parent on first extraction / 第一轮先留在父组件:

- Area feedback derivation
- Related knowledge-point index construction
- Time formatting
- WorldBook route query building

Acceptance / 验收:

- Area feedback count, empty state, and feedback cards remain unchanged.
  区域反馈数量、空状态与反馈卡片保持不变。
- Route cue text and exploration badges remain unchanged.
  参考路线文案与探索点标识保持不变。
- Related WorldBook display and chip deep links remain unchanged.
  关联 WorldBook 展示与 chip 深链保持不变。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/map-worldbook-context.test.js`
- `npm test -- tests/map-trip-baseline.test.js`

### 5.8 Landed Eighth Slice: `SettingsPushSection`

Suggested target / 建议目标:

- New component: `src/components/settings/SettingsPushSection.vue`
- Source block: notification / real-push content inside the Settings notification subpage

Status / 状态:

- `DONE` in code on 2026-05-02.
  2026-05-02 已在代码中落地。
- Push orchestration, permission sync, health checks, diagnostics writing, and subscribe/resync/test/unsubscribe flows stayed in `SettingsView.vue`.
  推送编排、权限同步、健康检查、诊断写入与订阅/重同步/测试/取消订阅流程仍留在 `SettingsView.vue`。
- Verified with `npm run lint`, `tests/push-web-baseline.test.js`, `tests/system-automation.test.js`, `tests/system-backup-reminder.test.js`, `tests/system-backup-copy-tone.test.js`, and `npm run build`.
  已通过 `npm run lint`、`tests/push-web-baseline.test.js`、`tests/system-automation.test.js`、`tests/system-backup-reminder.test.js`、`tests/system-backup-copy-tone.test.js` 与 `npm run build` 验证。

Why it matters / 为什么有价值:

- It removes one of the densest Settings subpage blocks while keeping push behavior centralized.
  它移出了 Settings 子页中最密集的区块之一，同时保持推送行为集中在父视图。
- It makes later push UX refinement easier without touching subscription or diagnostics internals.
  它让后续推送体验打磨更容易，而不必直接碰订阅或诊断内部流程。

Keep in parent on first extraction / 第一轮先留在父组件:

- Push permission sync
- Server health check
- Subscribe, resync, test-send, and unsubscribe flows
- Diagnostics/report writing
- Push URL normalization on save

Acceptance / 验收:

- Notification and real-push toggles still update the same settings fields.
  通知与真推送开关仍更新相同设置字段。
- Push display mode and Push Server URL save behavior remains unchanged.
  外部通知样式与 Push Server 地址保存行为保持不变。
- Real-push subscribe, resync, test, unsubscribe, and health-check buttons keep the same disabled states and callbacks.
  真推送订阅、重同步、测试、取消订阅与健康检查按钮保持相同禁用态和回调。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/push-web-baseline.test.js`
- `npm test -- tests/system-automation.test.js`
- `npm test -- tests/system-backup-reminder.test.js`
- `npm test -- tests/system-backup-copy-tone.test.js`

### 5.9 Landed Ninth Slice: `MapTripControlPanel`

Suggested target / 建议目标:

- New component: `src/components/map/MapTripControlPanel.vue`
- Source block: trip simulation / runtime control panel inside `src/views/MapView.vue`

Status / 状态:

- `DONE` in code on 2026-05-02.
  2026-05-02 已在代码中落地。
- Trip lifecycle, arrival scheduling, background-push arming, reward/history writes, and store calls stayed in `MapView.vue`.
  行程生命周期、到达调度、后台推送布置、奖励/历史写入与 store 调用仍留在 `MapView.vue`。
- Verified with `npm run lint`, `tests/map-trip-baseline.test.js`, `tests/map-worldbook-context.test.js`, `tests/push-web-baseline.test.js`, and `npm run build`.
  已通过 `npm run lint`、`tests/map-trip-baseline.test.js`、`tests/map-worldbook-context.test.js`、`tests/push-web-baseline.test.js` 与 `npm run build` 验证。

Why it matters / 为什么有价值:

- It removes the central trip-control surface from `MapView.vue` without changing the simulation-first trip model.
  它从 `MapView.vue` 中移出核心行程控制界面，同时不改变 simulation-first 的行程模型。
- It gives future ride-hailing or trip-status UI work a safer component boundary.
  它为后续打车/行程状态 UI 工作提供了更安全的组件边界。

Keep in parent on first extraction / 第一轮先留在父组件:

- Trip lifecycle calls
- Arrival push arming and labels
- Reward and trip-history writes
- Store mutations and runtime timer ownership

Acceptance / 验收:

- Trip endpoint edits still update the same trip form fields.
  行程起终点编辑仍更新相同行程表单字段。
- Start eligibility, traveling progress, arrived state, cancel, and acknowledge behavior remain unchanged.
  开始条件、进行中进度、已到达状态、取消与确认完成行为保持不变。
- Background-arrival push status and hints remain unchanged.
  后台到达推送状态与提示保持不变。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/map-trip-baseline.test.js`
- `npm test -- tests/map-worldbook-context.test.js`
- `npm test -- tests/push-web-baseline.test.js`

### 5.10 Landed Tenth Slice: `SettingsAutomationSection`

Suggested target / 建议目标:

- New component: `src/components/settings/SettingsAutomationSection.vue`
- Source block: AI automation content inside the Settings automation subpage

Status / 状态:

- `DONE` in code on 2026-05-02.
  2026-05-02 已在代码中落地。
- Enable confirmation, input normalization, runtime policy calculation, routing, diagnostics ownership, and store semantics stayed in `SettingsView.vue`.
  开启确认、输入归一化、运行策略计算、路由、诊断职责与 store 语义仍留在 `SettingsView.vue`。
- Verified with `npm run lint`, `tests/system-automation.test.js`, `tests/system-backup-reminder.test.js`, `tests/system-backup-copy-tone.test.js`, `tests/push-web-baseline.test.js`, and `npm run build`.
  已通过 `npm run lint`、`tests/system-automation.test.js`、`tests/system-backup-reminder.test.js`、`tests/system-backup-copy-tone.test.js`、`tests/push-web-baseline.test.js` 与 `npm run build` 验证。

Why it matters / 为什么有价值:

- It removes the remaining dense Settings automation surface without changing automation policy semantics.
  它移出了 Settings 中剩余的高密度自动化界面，同时不改变自动化策略语义。
- It makes future automation UX work safer because confirmation and normalization are still centralized in the parent.
  它让后续自动化体验打磨更安全，因为确认与归一化仍集中在父视图。

Keep in parent on first extraction / 第一轮先留在父组件:

- Enable-master confirmation dialog
- Priority / seconds / clock normalization
- Runtime policy calculation
- Chat and Network routing
- Store ownership and diagnostics semantics

Acceptance / 验收:

- Global automation, per-module toggles, and priority fields still update the same settings fields.
  全局自动化、模块开关与优先级字段仍更新相同设置字段。
- Notify-only, quiet-hours controls, runtime-policy text, cooldown, and dedupe inputs remain unchanged.
  仅通知、安静时段控件、运行态文案、冷却与防重复输入保持不变。
- Save confirmation and normalization behavior remain unchanged.
  保存确认与归一化行为保持不变。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/system-automation.test.js`
- `npm test -- tests/system-backup-reminder.test.js`
- `npm test -- tests/system-backup-copy-tone.test.js`
- `npm test -- tests/push-web-baseline.test.js`

### 5.11 Landed Eleventh Slice: `MapRouteFamiliarityPanel`

Suggested target / 建议目标:

- New component: `src/components/map/MapRouteFamiliarityPanel.vue`
- Source block: route familiarity display panel inside `src/views/MapView.vue`

Status / 状态:

- `DONE` in code on 2026-05-03.
  2026-05-03 已在代码中落地。
- Route derivation, related knowledge-point index building, next-tier hint logic, and WorldBook route query building stayed in `MapView.vue`.
  路线派生、关联知识点索引、下一阶段提示逻辑与 WorldBook 路由 query 构建仍留在 `MapView.vue`。
- Verified with `npm run lint`, `tests/map-worldbook-context.test.js`, `tests/map-trip-baseline.test.js`, and `npm run build`.
  已通过 `npm run lint`、`tests/map-worldbook-context.test.js`、`tests/map-trip-baseline.test.js` 与 `npm run build` 验证。

Why it matters / 为什么有价值:

- It removes another WorldBook-linked derived-data panel from `MapView.vue` without touching route familiarity derivation.
  它从 `MapView.vue` 中移出另一块连接 WorldBook 的派生数据面板，同时不触碰路线熟悉度派生逻辑。
- It keeps future Map route or reward display work easier to isolate.
  它让后续 Map 路线或奖励展示维护更容易隔离。

Keep in parent on first extraction / 第一轮先留在父组件:

- Route familiarity derivation
- Related knowledge-point index construction
- Next-tier hint logic
- WorldBook route query building

Acceptance / 验收:

- Route familiarity count, empty state, and route cards remain unchanged.
  路线熟悉度数量、空状态与路线卡片保持不变。
- Tier badge, completion count, exploration points, average distance, and next-tier hint remain unchanged.
  等级标识、完成次数、探索点、平均距离与下一阶段提示保持不变。
- Related WorldBook display and chip deep links remain unchanged.
  关联 WorldBook 展示与 chip 深链保持不变。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/map-worldbook-context.test.js`
- `npm test -- tests/map-trip-baseline.test.js`

### 5.12 Landed Twelfth Slice: `MapTripHistoryPanel`

Suggested target / 建议目标:

- New component: `src/components/map/MapTripHistoryPanel.vue`
- Source block: trip history display panel inside `src/views/MapView.vue`

Status / 状态:

- `DONE` in code on 2026-05-03.
  2026-05-03 已在代码中落地。
- Trip-history derivation, reward scoring, related knowledge-point index building, time formatting, and WorldBook route query handling stayed in `MapView.vue`.
  行程记录派生、奖励总分、关联知识点索引、时间格式化与 WorldBook 路由 query 处理仍留在 `MapView.vue`。
- Verified with `npm run lint`, `tests/map-worldbook-context.test.js`, `tests/map-trip-baseline.test.js`, and `npm run build`.
  已通过 `npm run lint`、`tests/map-worldbook-context.test.js`、`tests/map-trip-baseline.test.js` 与 `npm run build` 验证。

Why it matters / 为什么有价值:

- It removes the last obvious Map derived-data display panel from `MapView.vue` without touching trip lifecycle or store writes.
  它从 `MapView.vue` 移出最后一块明显的 Map 派生数据展示面板，同时不触碰行程生命周期或 store 写入。
- It keeps trip history cards, reward/event summaries, and related WorldBook chips isolated for future UI or copy work.
  它把行程记录卡片、奖励/事件摘要与关联 WorldBook chip 隔离出来，方便后续 UI 或文案维护。

Keep in parent on first extraction / 第一轮先留在父组件:

- Trip-history slicing and reward score calculation
- Related knowledge-point index construction
- Time and duration formatting
- WorldBook route query handling

Acceptance / 验收:

- Trip-history empty state, cards, status labels, fare/duration display, reward/event summaries, and total score remain unchanged.
  行程记录空状态、卡片、状态标签、费用/时长展示、奖励/事件摘要与总分保持不变。
- Related WorldBook display and chip deep links remain unchanged.
  关联 WorldBook 展示与 chip 深链保持不变。

Suggested checks / 建议检查:

- `npm run lint`
- `npm run build`
- `npm test -- tests/map-worldbook-context.test.js`
- `npm test -- tests/map-trip-baseline.test.js`

---

## 6. Functional Feature Candidates After Decomposition / 拆分后可考虑的功能候选

These are not recommended before the first decomposition slice unless the user explicitly reprioritizes feature growth.

除非用户明确要求优先做新功能，否则以下事项建议在第一轮拆分后再考虑。

1. Shared thumbnail picker extraction.
   共享缩略图选择器抽取。
   Good source surfaces: Gallery usage, Chat gallery picker, Map visual quick switch, Contacts folder-slot preview.
   可参考界面：Gallery 使用状态、Chat 素材发送、Map 视觉快切、Contacts 文件夹槽位预览。
   Phase 1 landed on 2026-05-03 as `src/components/assets/AssetThumbnailOption.vue`, reused by Chat gallery send and Map visual quick switch while keeping preview loading and store writes in parents.
   第一阶段已于 2026-05-03 以 `src/components/assets/AssetThumbnailOption.vue` 落地，已复用于 Chat 素材发送与 Map 视觉快切，同时将预览加载与 store 写入保留在父级。
   Phase 2 landed on 2026-05-03 by adding the non-interactive `mini` variant and reusing it in Contacts folder-slot previews.
   第二阶段已于 2026-05-03 落地：新增只读 `mini` 变体，并复用于 Contacts 文件夹槽位预览。
   Phase 3 landed on 2026-05-03 by widening `AssetThumbnailOption.vue` variants and reusing it in Contacts asset-pack grid, ChatDirectory role preview strips / preferred-image switcher, and Appearance wallpaper quick switch.
   第三阶段已于 2026-05-03 落地：扩展 `AssetThumbnailOption.vue` 变体，并复用于 Contacts 素材包网格、ChatDirectory 角色预览条/会话优先图切换、Appearance 壁纸快切。
   Phase 4 landed on 2026-05-03 by adding the square variant and reusing it in Gallery hero previews and asset cards while keeping delete/replace/folder operations in `GalleryView.vue`.
   第四阶段已于 2026-05-03 落地：新增方形变体，并复用于 Gallery 顶部预览与素材卡片，同时将删除、替换与文件夹操作保留在 `GalleryView.vue`。

2. Network guided setup and connection testing polish.
   Network 引导式配置与连接测试打磨。
   Best if the goal is to make provider setup easier for non-technical users.
   如果目标是降低非技术用户配置供应商的难度，这项收益较高。

3. Calendar event management expansion.
   Calendar 事件管理扩展。
   Candidate scope: richer confirmed-event list operations, delivery status history, or server delivery receipts if the push relay supports them.
   候选范围：已确认事件的更多管理、送达状态历史，或在 push relay 支持时接入服务端送达回执。

4. Map ambient event queue.
   Map 轻量环境事件队列。
   Candidate scope: derive small events from unlocked areas, familiar routes, and WorldBook context without changing core trip lifecycle.
   候选范围：基于已解锁区域、熟悉路线与 WorldBook 上下文派生小事件，但不改变核心行程生命周期。

5. Chat user action panel extraction.
   Chat 用户动作面板抽取。
   Landed as `ChatUserActionPanel`; media input ownership, send handlers, validation, gallery preview loading, and store writes remain in `ChatView.vue`.
   已作为 `ChatUserActionPanel` 落地；媒体 input 所有权、发送处理、校验、素材预览加载与 store 写入仍留在 `ChatView.vue`。

---

## 7. Work to Avoid Right Now / 当前不建议优先做

1. Do not start Phone, Wallet, or Stock as generic standalone apps yet.
   暂时不要把 Phone、Wallet、Stock 当作普通独立 App 先做起来。
2. Do not redesign `chat.js`, `map.js`, or `system.js` store contracts during a UI extraction slice.
   UI 拆分时不要同时重做 `chat.js`、`map.js` 或 `system.js` 的 store 契约。
3. Do not add more WorldBook feature layers before protecting readability.
   在保护可读性之前，不建议继续给 WorldBook 堆功能层。
4. Do not resume visual rebuild by accident while touching Map/Gallery/Appearance.
   修改 Map/Gallery/Appearance 时不要无意中重启视觉重建。
5. Do not move Calendar reminder ownership back into Map.
   不要把日历提醒的职责从 Calendar 拉回 Map。

---

## 8. Promotion Template / 转入执行看板模板

If one item becomes active work, add a short entry to `docs/roadmap/TODO_ROADMAP.md` using this shape:

若某项进入实际执行，可用以下格式摘要加入 `docs/roadmap/TODO_ROADMAP.md`：

```md
EN: P1 maintainability slice: extract [ComponentName] from [ViewName] — `IN_PROGRESS`.
中文：P1 可维护性切片：从 [ViewName] 抽出 [ComponentName] — `IN_PROGRESS`。

- EN: Scope: display/interaction extraction only; keep store contracts and domain behavior unchanged.
  中文：范围：仅做展示/交互拆分；保持 store 契约与领域行为不变。
- EN: Acceptance: current behavior remains unchanged and targeted tests pass.
  中文：验收：当前行为不变，相关测试通过。
- EN: Regression checks: `npm run lint`, `npm run build`, and targeted tests.
  中文：回归检查：`npm run lint`、`npm run build` 与相关专项测试。
```

---

## 9. Recommended Next Human Decision / 建议下一步人工决策

After the landed extraction slices, choose one of these two tracks:

已落地的拆分切片之后，建议只在以下两条路线中选一条：

1. Switch back to another functional module if Network setup UX is considered sufficient for now.
   如果当前 Network 配置体验已足够，则切回其它功能模块。
2. Add component-level coverage for Network smoke controls if we keep hardening Network.
   如果继续加固 Network，则为烟测控件补组件级覆盖。

My recommendation / 我的建议:

Switch back to another functional module if the goal is broader product progress.
Network guided setup, failure guidance, endpoint/gateway checks, preset safety, and the real Chat smoke path now cover the first painful setup loop; the next practical slice is either component-level coverage for the smoke controls or a new functional module.

如果目标是推进更广的产品功能，建议切回其它功能模块。
Network 引导配置、失败指引、接口/网关检查、预设安全与真实 Chat 烟测已覆盖第一轮痛点；下一刀要么给烟测控件补组件级覆盖，要么进入新的功能模块。

---

## 10. Change Log / 变更记录

1. 2026-05-02 EN: Created after visual rebuild work was parked, to record concrete functional-code next steps and safe implementation candidates.
   2026-05-02 中文：在视觉重建工作被暂时搁置后新增，用于记录具体功能代码推进项与安全实施候选。
2. 2026-05-02 EN: Updated after landing `ChatThreadMenuPanel.vue`; next recommended extraction moved to Settings diagnostics or backup sections.
   2026-05-02 中文：在 `ChatThreadMenuPanel.vue` 落地后更新；下一推荐拆分顺延至 Settings 诊断或备份区块。
3. 2026-05-02 EN: Updated after landing `SettingsStorageDiagnosticsSection.vue`; next recommended extraction moved to `SettingsBackupSection` or `ChatMessageEditModal`.
   2026-05-02 中文：在 `SettingsStorageDiagnosticsSection.vue` 落地后更新；下一推荐拆分顺延至 `SettingsBackupSection` 或 `ChatMessageEditModal`。
4. 2026-05-02 EN: Updated after landing `SettingsBackupSection.vue`; next recommended extraction moved to `ChatMessageEditModal` or `MapVisualSettingsPanel`.
   2026-05-02 中文：在 `SettingsBackupSection.vue` 落地后更新；下一推荐拆分顺延至 `ChatMessageEditModal` 或 `MapVisualSettingsPanel`。
5. 2026-05-02 EN: Updated after landing `ChatMessageEditModal.vue`; next recommended extraction moved to `MapVisualSettingsPanel` or `ChatUserActionPanel`.
   2026-05-02 中文：在 `ChatMessageEditModal.vue` 落地后更新；下一推荐拆分顺延至 `MapVisualSettingsPanel` 或 `ChatUserActionPanel`。
6. 2026-05-02 EN: Updated after landing `MapVisualSettingsPanel.vue`; next recommended extraction moved to `ChatUserActionPanel` or `MapAreaFeedbackPanel`.
   2026-05-02 中文：在 `MapVisualSettingsPanel.vue` 落地后更新；下一推荐拆分顺延至 `ChatUserActionPanel` 或 `MapAreaFeedbackPanel`。
7. 2026-05-02 EN: Updated after landing `ChatUserActionPanel.vue`; next recommended extraction moved to `MapAreaFeedbackPanel` or `SettingsPushSection`.
   2026-05-02 中文：在 `ChatUserActionPanel.vue` 落地后更新；下一推荐拆分顺延至 `MapAreaFeedbackPanel` 或 `SettingsPushSection`。
8. 2026-05-02 EN: Updated after landing `MapAreaFeedbackPanel.vue`; next recommended extraction moved to `SettingsPushSection` or `MapTripControlPanel`.
   2026-05-02 中文：在 `MapAreaFeedbackPanel.vue` 落地后更新；下一推荐拆分顺延至 `SettingsPushSection` 或 `MapTripControlPanel`。
9. 2026-05-02 EN: Updated after landing `SettingsPushSection.vue`; next recommended extraction moved to `MapTripControlPanel` or `SettingsAutomationSection`.
   2026-05-02 中文：在 `SettingsPushSection.vue` 落地后更新；下一推荐拆分顺延至 `MapTripControlPanel` 或 `SettingsAutomationSection`。
10. 2026-05-02 EN: Updated after landing `MapTripControlPanel.vue`; next recommended extraction moved to `SettingsAutomationSection`, `MapRouteFamiliarityPanel`, or `MapTripHistoryPanel`.
    2026-05-02 中文：在 `MapTripControlPanel.vue` 落地后更新；下一推荐拆分顺延至 `SettingsAutomationSection`、`MapRouteFamiliarityPanel` 或 `MapTripHistoryPanel`。
11. 2026-05-02 EN: Updated after landing `SettingsAutomationSection.vue`; next recommended extraction moved to `MapRouteFamiliarityPanel`, `MapTripHistoryPanel`, or Network guided setup.
    2026-05-02 中文：在 `SettingsAutomationSection.vue` 落地后更新；下一推荐拆分顺延至 `MapRouteFamiliarityPanel`、`MapTripHistoryPanel` 或 Network 引导配置。
12. 2026-05-03 EN: Updated after landing `MapRouteFamiliarityPanel.vue`; next recommended extraction moved to `MapTripHistoryPanel` or Network guided setup.
    2026-05-03 中文：在 `MapRouteFamiliarityPanel.vue` 落地后更新；下一推荐拆分顺延至 `MapTripHistoryPanel` 或 Network 引导配置。
13. 2026-05-03 EN: Updated after landing `MapTripHistoryPanel.vue`; next recommended work moved to Network guided setup or shared thumbnail picker extraction.
    2026-05-03 中文：在 `MapTripHistoryPanel.vue` 落地后更新；下一推荐工作顺延至 Network 引导配置或共享缩略图选择器抽取。
14. 2026-05-03 EN: Landed shared thumbnail option phase 1 as `AssetThumbnailOption.vue`, reused by Chat gallery send and Map visual quick switch; next reuse candidates are Contacts folder-slot previews, ChatDirectory preview strips, and Appearance wallpaper thumbnails.
    2026-05-03 中文：共享缩略图选项第一阶段以 `AssetThumbnailOption.vue` 落地，并复用于 Chat 素材发送与 Map 视觉快切；下一批复用候选为 Contacts 文件夹槽位预览、ChatDirectory 预览条与 Appearance 壁纸缩略图。
15. 2026-05-03 EN: Landed shared thumbnail option phase 2 by adding a non-interactive `mini` variant and reusing it in Contacts folder-slot previews; next reuse candidates are ChatDirectory preview strips and Appearance wallpaper thumbnails.
    2026-05-03 中文：共享缩略图选项第二阶段已落地：新增只读 `mini` 变体并复用于 Contacts 文件夹槽位预览；下一批复用候选为 ChatDirectory 预览条与 Appearance 壁纸缩略图。
16. 2026-05-03 EN: Landed shared thumbnail option phase 3 across Contacts asset-pack grid, ChatDirectory preview strips / preferred-image switcher, and Appearance wallpaper quick switch; next maintainability candidate is Gallery cleanup, or switch to Network guided setup.
    2026-05-03 中文：共享缩略图选项第三阶段已覆盖 Contacts 素材包网格、ChatDirectory 预览条/会话优先图切换与 Appearance 壁纸快切；下一维护性候选为 Gallery 清理，或切换到 Network 引导配置。
17. 2026-05-03 EN: Landed shared thumbnail option phase 4 in Gallery hero previews and asset cards; shared thumbnail cleanup now covers the major asset-consuming surfaces.
    2026-05-03 中文：共享缩略图选项第四阶段已覆盖 Gallery 顶部预览与素材卡片；共享缩略图清理现已覆盖主要素材消费界面。
18. 2026-05-03 EN: Landed Network guided setup phase 1 with provider templates, setup-progress derivation, next-step copy, and helper tests; next recommended work is connection-test failure guidance and diagnostics handoff.
    2026-05-03 中文：Network 引导配置第一阶段已落地，包含供应商模板、配置进度派生、下一步提示文案与 helper 测试；下一推荐工作是连接测试失败指引与诊断交接。
19. 2026-05-03 EN: Landed Network connection-test failure guidance with reusable classification copy, inline failure card, and clearer diagnostics handoff; next recommended work is provider-preset quality and custom gateway guidance.
    2026-05-03 中文：Network 连接测试失败指引已落地，包含可复用失败分类文案、页内失败卡片与更清晰的诊断交接；下一推荐工作是供应商预设质量与自定义网关指引。
20. 2026-05-03 EN: Landed Network endpoint/gateway guidance with reusable URL quality checks for protocol, path, CORS, auth forwarding, and manual-model fallback; next recommended work is preset safety and key-handling copy.
    2026-05-03 中文：Network 接口/网关指引已落地，新增可复用 URL 质量检查，覆盖协议、路径、CORS、鉴权转发与手动模型兜底；下一推荐工作是预设安全性与 Key 处理文案。
21. 2026-05-03 EN: Landed Network preset safety with reusable save guidance, local key-storage copy, custom-gateway warnings, and manual-model fallback confirmation; next recommended work is a Network-to-Chat smoke path or another functional module.
    2026-05-03 中文：Network 预设安全已落地，包含可复用保存指引、Key 本地保存文案、自定义网关警告与手动模型兜底确认；下一推荐工作是 Network 到 Chat 的烟测链路或切回其它功能模块。
22. 2026-05-03 EN: Landed Network-to-Chat smoke path with a real `callAI` request, no chat-history writes, stale-result protection, and diagnostics records for both success and failure; next recommended work is another functional module or component-level coverage.
    2026-05-03 中文：Network 到 Chat 烟测链路已落地，使用真实 `callAI` 请求、不写入聊天记录、具备陈旧结果保护，并为成功/失败写入诊断记录；下一推荐工作是切回其它功能模块或补组件级覆盖。
23. 2026-05-04 EN: Landed Phone and Stock local MVPs plus backup/storage diagnostics coverage for Files, Wallet, Phone, and Stock; next recommended work is connecting one new MVP to an existing loop.
    2026-05-04 中文：已落地 Phone 与 Stock 本地 MVP，并将 Files、Wallet、Phone、Stock 纳入备份与存储诊断；下一推荐工作是把一个新 MVP 接入既有闭环。
