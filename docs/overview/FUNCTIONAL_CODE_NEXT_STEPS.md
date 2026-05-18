# Functional Code Next Steps / 功能代码推进项接手单

Updated / 更新时间: 2026-05-05

## 1. Purpose / 用途

This document records the current functional-code opportunities after visual rebuild work was intentionally parked.  
It is for future developers and AI coding assistants who need to decide what code work can safely move next.

## 2026-05-17 Calendar / Reminders Split Before More Calendar Facts

Status:

- Product decision landed in `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`.
- Module Chinese/English naming glossary landed in `docs/pm/MODULE_NAME_GLOSSARY.md`.
- Calendar should become the real schedule/date app.
- Reminders should own cross-module cues, callbacks, follow-ups, logistics reminders, stock review cues, and world/task cues.
- Current code still combines these responsibilities in `src/stores/calendar.js` and `src/views/CalendarView.vue`.

Recommended next:

- Start with a non-breaking Reminders seam: define the target store/view boundary and keep compatibility with existing Calendar cue behavior.
- Move cue queues before adding Calendar relationship facts, so relationship runtime only receives true schedule/date memories from Calendar.
- Gallery relationship facts are no longer a near-term mainline candidate; until image sources become naturally produced and low-friction, prioritize text/event-first memory dedupe and merge rules instead.

本文记录视觉重建被主动搁置后，当前功能代码层面仍可推进的事项。  
它面向后续开发同事与 AI 编程助手，用于判断下一步代码工作从哪里开最安全、最有收益。

Authority note / 职责说明:

- This file is a handoff reference, not the live execution board.
  本文件是接手参考，不是动态执行看板。
- Active tasks with status still belong only in `docs/roadmap/TODO_ROADMAP.md`.
  带状态的执行任务仍只允许进入 `docs/roadmap/TODO_ROADMAP.md`。
- If one item below becomes active work, summarize it into `docs/roadmap/TODO_ROADMAP.md` before or during implementation.
  若下列某项进入实际开发，应先在或同步在 `docs/roadmap/TODO_ROADMAP.md` 摘要登记。
- At the end of every coding task, add a short "next recommended slice" note here and append the matching landed/next-step record to `docs/roadmap/TODO_ROADMAP.md`.
  每次代码任务结束时，必须在本文补充简短“下一推荐切片”，并在 `docs/roadmap/TODO_ROADMAP.md` 追加对应的已落地/下一步记录。
- Visual rebuild notes remain parked in `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md`.
  视觉重建建议仍暂存于 `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md`。

Source set / 参考来源:

- `docs/roadmap/TODO_ROADMAP.md`
- `docs/roadmap/FOOD_DELIVERY_REVIEW_AND_NEXT_TODO_2026-05-16.md`
- `docs/process/EVENT_WORKFLOW.md`
- `docs/architecture/SIMULATION_EVENT_ENGINE.md`
- `docs/overview/IMMERSIVE_EVENT_TODO.md`
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
26. Landed twenty-sixth: Chat `transfer_virtual` cards now sync into Wallet ledger entries with `chat_transfer` source metadata and message-id dedupe.
    已落地第二十六步：Chat `transfer_virtual` 卡片现已同步为 Wallet 流水，并带有 `chat_transfer` 来源元数据与 message-id 去重。
27. Landed twenty-seventh: Phone missed-call records now create shell notifications through the shared system notification surface.
    已落地第二十七步：Phone 未接来电记录现已通过共享系统通知面生成 shell 通知。
28. Landed twenty-eighth: Phone missed-call records now create Calendar callback cues that can be confirmed into Calendar events or dismissed without moving scheduling ownership out of Calendar.
    已落地第二十八步：Phone 未接来电记录现会生成 Calendar 回拨线索，可确认成 Calendar 事件或忽略，同时真实调度职责仍留在 Calendar。
29. Landed twenty-ninth: Wallet now surfaces Chat-origin ledger source counts, filters, and badges so Chat transfer records are distinguishable from manual entries.
    已落地第二十九步：Wallet 现在展示来自 Chat 的流水来源计数、筛选与徽标，可区分 Chat 转账记录和手动流水。
30. Landed thirtieth: More/Labs toggles now drive visible low-risk UI behavior: Home smart panel, Lock focus-mode notification condensation, and More scene-switch preview.
    已落地第三十步：More/Labs 开关现在驱动低风险可见 UI 行为：Home 智能面板、Lock 专注模式通知收敛、More 场景切换预览。
31. Landed thirty-first: Files product role is now decided; it is hidden as a standalone frontend entry and retained as an internal storage/coordination component.
    已落地第三十一步：Files 产品角色已明确；不作为独立前台入口展示，保留为内部储存与跨模块协调组件。
32. Landed thirty-second: Network smoke controls now have component-level coverage for Chat smoke preflight/success/failure, model refresh preflight/success, and diagnostics filtering/clearing.
    已落地第三十二步：Network 烟测控件现已具备组件级覆盖，包含 Chat 烟测预检/成功/失败、模型刷新预检/成功，以及诊断报告筛选/清空。
33. Landed thirty-third: Network smoke and diagnostics display sections were extracted into `NetworkSmokeControlsPanel.vue` and `NetworkDiagnosticsPanel.vue` while keeping API calls, report writes, routing, and dialog ownership in `NetworkView.vue`.
    已落地第三十三步：Network 烟测与诊断展示区已提取为 `NetworkSmokeControlsPanel.vue` 与 `NetworkDiagnosticsPanel.vue`，同时 API 调用、报告写入、路由与弹窗所有权仍留在 `NetworkView.vue`。
34. Landed thirty-fourth: Relationship runtime baseline now provides a shared store, backup support, Contacts read-only relationship snapshots, and Chat prompt context.
    已落地第三十四步：关系运行时基线已提供共享 store、备份支持、Contacts 只读关系快照与 Chat 提示词上下文。
35. Next recommended slice: add the first safe relationship fact adapter from Wallet/Shopping gift or shared-expense records.
    下一推荐切片：从 Wallet/Shopping 的礼物或共同消费记录接入第一个安全关系事实适配器。
36. Keep deferring visual redesign, broad store rewrites, and high-impact automatic romance/conflict mutation.
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

After the landed MVP connector slices, use this priority order:

已落地的 MVP 连接切片之后，建议按以下优先级推进：

1. Network component coverage: `DONE`; smoke controls and diagnostics report interactions now have component-level coverage.
   Network 组件覆盖：`DONE`；烟测控件与诊断报告交互现已有组件级覆盖。
2. Network smoke/diagnostics display extraction: `DONE`; display moved into small components while ownership stayed in `NetworkView.vue`.
   Network 烟测/诊断展示层拆分：`DONE`；展示已进入小组件，所有权仍留在 `NetworkView.vue`。
3. Files product-role decision: `DONE`; Files is hidden from standalone frontend entry and kept as internal storage/coordination.
   Files 产品角色决策：`DONE`；Files 不作为独立前台入口展示，保留为内部储存与跨模块协调。
4. Phone AI call summaries: only after the Calendar cue loop feels clear, add AI-assisted summaries or role binding for call logs.
   Phone AI 通话摘要：只有当 Calendar 线索闭环足够清楚后，再为通话记录增加 AI 摘要或角色绑定。

My recommendation / 我的建议:

Extract Network provider-template/setup/preset display next.
Smoke and diagnostics are already protected and split, so the next low-risk Network move is to extract the setup/preset display while keeping preset save/remove and API settings writes in `NetworkView.vue`.

建议下一步拆 Network 供应商模板/配置向导/预设展示区。
烟测和诊断已经有测试护栏且完成拆分，因此下一刀可以继续做低风险展示层拆分，把预设保存/删除与 API 设置写入仍留在 `NetworkView.vue`。

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
24. 2026-05-04 EN: Landed two cross-module MVP connectors: Chat transfer cards now create deduped Wallet ledger records, and new Phone missed-call records create shared system notifications.
    2026-05-04 中文：已落地两条跨模块 MVP 连接：Chat 转账卡现在会生成去重的 Wallet 流水，新建 Phone 未接来电记录会生成共享系统通知。
25. 2026-05-04 EN: Landed Phone -> Calendar callback cues; next recommended work moved to Wallet source visibility for Chat-origin ledger entries.
    2026-05-04 中文：已落地 Phone -> Calendar 回拨线索；下一推荐工作顺延为 Wallet 中 Chat 来源流水的来源可见性。
26. 2026-05-04 EN: Landed Wallet source visibility for Chat-origin ledger entries; next recommended work moved to consuming one persisted More/Labs toggle in visible UI.
    2026-05-04 中文：已落地 Wallet 中 Chat 来源流水的来源可见性；下一推荐工作顺延为让一个已持久化的 More/Labs 开关驱动可见 UI。
27. 2026-05-04 EN: Landed three More/Labs toggle consumers: Home smart panel, Lock focus mode, and More scene-switch preview; next recommended work moved to Network component coverage unless Files product role is chosen.
    2026-05-04 中文：已落地三个 More/Labs 开关消费点：Home 智能面板、Lock 专注模式、More 场景切换预览；下一推荐工作顺延为 Network 组件覆盖，除非先选择 Files 产品角色。
28. 2026-05-04 EN: Landed Files product-role decision and frontend hiding: Files is no longer promoted as a standalone Home/More/Appearance entry and remains an internal storage/coordination component; next recommended work is Network component coverage.
    2026-05-04 中文：已落地 Files 产品角色决策与前台隐藏：Files 不再作为 Home/More/Appearance 的独立入口推广，保留为内部储存与协调组件；下一推荐工作为 Network 组件覆盖。
29. 2026-05-04 EN: Landed Network component coverage for smoke controls and diagnostics interactions; next recommended work is a display-only extraction of Network smoke/diagnostics sections.
    2026-05-04 中文：已落地 Network 烟测控件与诊断交互的组件级覆盖；下一推荐工作为将 Network 烟测/诊断区做展示层拆分。
30. 2026-05-04 EN: Landed Network smoke/diagnostics display extraction into `NetworkSmokeControlsPanel.vue` and `NetworkDiagnosticsPanel.vue`; next recommended work is provider-template/setup/preset display extraction.
    2026-05-04 中文：已落地 Network 烟测/诊断展示层拆分，新增 `NetworkSmokeControlsPanel.vue` 与 `NetworkDiagnosticsPanel.vue`；下一推荐工作为供应商模板/配置向导/预设展示区拆分。
---

## 2026-05-04 Update: Network Decomposition Batch

Status:

- EN: Landed Network setup/preset display extraction with `NetworkSetupPresetPanel.vue`.
  中文：已落地 Network 配置向导/预设展示层拆分，新增 `NetworkSetupPresetPanel.vue`。
- EN: Landed manual model/save display extraction with `NetworkManualModelSavePanel.vue`.
  中文：已落地手动模型兜底与保存按钮展示层拆分，新增 `NetworkManualModelSavePanel.vue`。
- EN: Moved diagnostics label and report filtering/summary helpers into `network-report-labels.js` and `network-report-state.js`.
  中文：已将诊断报告标签、筛选与汇总 helper 移入 `network-report-labels.js` 和 `network-report-state.js`。
- EN: `NetworkView.vue` now remains the orchestration owner for API calls, smoke tests, preset mutations, route jumps, report writes, and dialog confirmation.
  中文：`NetworkView.vue` 现在继续只负责 API 调用、烟测、预设变更、路由跳转、报告写入与确认弹窗等编排职责。

Validation:

- `npm run lint`
- `npm test -- tests/network-guidance.test.js tests/network-view-smoke-controls.test.js`
- `npm run build`

Recommended next:

- EN: Pause broad Network restructuring for now. The next useful work should move to a small functional connector or another maintainability hotspot: Chat/WorldBook service-template clarity, Settings remaining section extraction, or Calendar cue lifecycle polish.
  中文：建议暂时暂停大范围 Network 重构。下一步更适合转向小型功能连接点或其它可维护性热点：Chat/WorldBook 服务模板清晰度、Settings 剩余区块拆分，或 Calendar 线索生命周期打磨。

---

## 2026-05-04 Update: Settings General/About Batch

Status:

- EN: Landed `SettingsGeneralSection.vue` for General settings display and input events.
  中文：已落地 `SettingsGeneralSection.vue`，承接通用设置展示与输入事件。
- EN: Landed `SettingsSubPageHeader.vue` for repeated Settings subpage headers.
  中文：已落地 `SettingsSubPageHeader.vue`，复用 Settings 子页顶部返回栏。
- EN: Landed `SettingsAboutInfoCard.vue` for the About version/stack card.
  中文：已落地 `SettingsAboutInfoCard.vue`，承接 About 版本/技术栈信息卡。
- EN: Moved backup-reminder interval options, labeling, and normalization into `backup-reminder-settings.js`.
  中文：已将备份提醒间隔选项、标签与归一化规则移入 `backup-reminder-settings.js`。

Validation:

- `npm run lint`
- `npm test -- tests/settings-general-section.test.js tests/system-backup-reminder.test.js`
- `npm run build`

Recommended next:

- EN: Continue with one more low-risk Settings landing-page display extraction, then reassess whether to move to Calendar cue lifecycle polish.
  中文：建议继续做一个低风险 Settings 首页展示层拆分，之后再评估是否转向 Calendar 线索生命周期打磨。

---

## 2026-05-04 Update: Settings Landing Batch

Status:

- EN: Landed `SettingsLandingSection.vue` for Settings profile entry, beginner tip, quick access, and content settings menu display.
  中文：已落地 `SettingsLandingSection.vue`，承接 Settings 首页资料入口、新手提示、快捷入口与内容设置菜单展示。
- EN: Added stable selectors to `SettingsMenuItem.vue` and `SettingsQuickAccessButton.vue` for route/subpage regression coverage.
  中文：已为 `SettingsMenuItem.vue` 与 `SettingsQuickAccessButton.vue` 补充稳定选择器，用于路由与子页回归覆盖。
- EN: `SettingsView.vue` still owns profile/worldbook/network/chat/appearance routing and Settings subpage state.
  中文：`SettingsView.vue` 仍然拥有资料、世界书、Network、Chat、Appearance 路由跳转与 Settings 子页状态。

Validation:

- `npm run lint`
- `npm test -- tests/settings-general-section.test.js tests/system-backup-reminder.test.js`
- `npm run build`

Recommended next:

- EN: Move to Calendar cue lifecycle polish. This is the next low-risk functional-code slice after the Settings display extraction, because it improves an existing Phone -> Calendar connector without requiring a new visual direction.
  中文：建议转向 Calendar 线索生命周期打磨。这是 Settings 展示拆分后的低风险功能代码切片，可以增强现有 Phone -> Calendar 连接点，且不需要新的视觉方向决策。

---

## 2026-05-04 Update: Calendar Push Lifecycle Batch

Status:

- EN: Replaced the single global Calendar push schedule/cancel promise with per-event and per-schedule in-flight maps.
  中文：已将 Calendar 推送调度/取消的单个全局 promise 改为按事件与排程隔离的 in-flight map。
- EN: Different events can now schedule real push concurrently without reusing another event's result.
  中文：不同事件现在可以并发安排真实推送，不会复用另一个事件的结果。
- EN: Duplicate same-event scheduling still dedupes, so repeated clicks do not create duplicate schedules.
  中文：同一事件的重复调度仍会去重，因此重复点击不会创建重复排程。

Validation:

- `npm run lint`
- `npm test -- tests/calendar-event-store.test.js tests/phone-store.test.js`
- `npm run build`

Recommended next:

- EN: The next safe code slice is Calendar view display extraction for cue/event cards, but keep it display-only to avoid colliding with the parked visual rebuild. If that feels too visual-adjacent, switch to another small connector.
  中文：下一步安全代码切片是 Calendar 视图线索/事件卡片展示层拆分，但应保持纯展示拆分，避免和已搁置的视觉重建冲突；如果它过于贴近视觉工作，则转向其它小型功能连接点。

---

## 2026-05-04 Update: Calendar Cue Card Extraction Batch

Status:

- EN: Landed `CalendarMapReminderCard.vue` for Map-derived reminder cue display and WorldBook chips.
  中文：已落地 `CalendarMapReminderCard.vue`，承接 Map 派生日程线索展示与 WorldBook chips。
- EN: Landed `CalendarPhoneCueCard.vue` for Phone missed-call callback cue display.
  中文：已落地 `CalendarPhoneCueCard.vue`，承接 Phone 未接来电回拨线索展示。
- EN: `CalendarView.vue` keeps ownership of reminder synchronization, cue confirmation/dismissal, time formatting, related-knowledge derivation, and route jumps.
  中文：`CalendarView.vue` 继续拥有提醒同步、线索确认/忽略、时间格式化、相关知识点派生与路由跳转职责。

Validation:

- `npm run lint`
- `npm test -- tests/calendar-event-store.test.js tests/calendar-worldbook-context.test.js tests/phone-store.test.js`
- `npm run build`

Recommended next:

- EN: A display-only extraction of the confirmed Calendar event card is still safe, but stop before redesigning visual language. If avoiding visual-adjacent work, move to a small functional connector such as Stock/Calendar or Wallet/Contacts.
  中文：已确认 Calendar 事件卡片仍可做纯展示拆分，但应在重新设计视觉语言前停住；如果要避开视觉邻近工作，则转向 Stock/Calendar 或 Wallet/Contacts 这类小型功能连接点。

---

## 2026-05-04 Update: Calendar Event Card Extraction Batch

Status:

- EN: Landed `CalendarEventCard.vue` for confirmed Calendar event display, related WorldBook chips, time controls, and push status presentation.
  中文：已落地 `CalendarEventCard.vue`，承接已确认 Calendar 事件展示、相关 WorldBook chips、时间控件与推送状态呈现。
- EN: `CalendarView.vue` remains the owner of time edits, quick shifts, reset handling, push rescheduling, status/detail derivation, and navigation.
  中文：`CalendarView.vue` 仍拥有时间编辑、快捷偏移、恢复处理、推送重排、状态/详情派生与导航职责。

Validation:

- `npm run lint`
- `npm test -- tests/calendar-event-store.test.js tests/calendar-worldbook-context.test.js tests/phone-store.test.js`
- `npm run build`

Recommended next:

- EN: Stop Calendar display extraction here unless more pure-maintenance work is explicitly desired. The next functional direction should be chosen between small connectors like Stock -> Calendar market reminders, Wallet -> Contacts ledger context, or returning to another large-view maintainability pass.
  中文：Calendar 展示拆分建议先停在这里，除非明确继续做纯维护。下一步功能方向可在 Stock -> Calendar 行情提醒、Wallet -> Contacts 账本上下文，或其它大型视图可维护性拆分之间选择。

---

## 2026-05-04 Update: Stock/Wallet Connector Batch

Status:

- EN: Stock now generates Calendar market-review cues for large simulated moves, using the existing Calendar cue -> event -> push lifecycle.
  中文：Stock 现在会为明显波动的模拟标的生成 Calendar 行情复盘线索，复用既有 Calendar 线索 -> 事件 -> 推送生命周期。
- EN: Calendar displays Stock market cues with confirm/dismiss actions via `CalendarStockCueCard.vue`.
  中文：Calendar 通过 `CalendarStockCueCard.vue` 展示 Stock 行情线索，并提供确认/忽略操作。
- EN: Wallet now exposes counterparty ledger summaries, and Contacts displays matching role-profile ledger context as read-only relationship information.
  中文：Wallet 现在提供按交易对象汇总的账本摘要，Contacts 将匹配角色档案的账本上下文作为只读关系信息展示。

Validation:

- `npm run lint`
- `npm test -- tests/stock-store.test.js tests/calendar-event-store.test.js tests/wallet-store.test.js tests/contacts-wallet-ledger-context.test.js`
- `npm run build`

Recommended next:

- EN: Add Calendar view-level interaction coverage for Stock cues, then choose the next module pair before adding more cross-module behavior.
  中文：建议下一步补 Calendar 行情线索的视图级交互覆盖，然后再选择下一组模块连接点，避免无目标地扩散跨模块行为。

Follow-up:

- EN: Calendar Stock cue view interaction coverage landed in `tests/calendar-stock-cue-view.test.js`.
  中文：Calendar 行情线索视图交互覆盖已落地于 `tests/calendar-stock-cue-view.test.js`。
- EN: Next work should pause connector expansion until a new module pair is selected, or switch back to maintainability cleanup.
  中文：下一步建议在选择新的模块组合前暂停连接点扩展，或切回可维护性清理。

---

## 2026-05-04 Update: Home Folder / Shopping / Assets Direction

Status:

- EN: Product direction selected: introduce a reusable Home folder entry pattern, use Shopping as the first folder-style module, and add Assets as an independent module.
  中文：产品方向已选择：新增可复用的主屏文件夹入口形态，购物作为第一个文件夹式模块落地，资产作为独立模块新增。
- EN: Shopping should not be implemented as a one-off Home exception. The folder shell belongs to the Home/system entry layer; Shopping only owns its child categories and commerce data.
  中文：购物不应做成主屏一次性特例。文件夹外壳属于 Home/系统入口层；购物只拥有子入口分类与电商业务数据。
- EN: Assets should stay separate from Stock. Stock owns market/watchlist behavior; Assets can consume Stock holdings as one investment category summary later.
  中文：资产应与 Stock 保持分离。Stock 负责行情/自选/市场行为；资产后续可把 Stock 持仓作为投资分类摘要消费。
- EN: Files remains hidden from the frontend as an internal storage/coordination component, so new Shopping and Assets user-facing records should live under their own module entries.
  中文：Files 继续作为内部储存/协调组件隐藏在前台之外，因此购物与资产面向用户的记录应分别归属自己的模块入口。

Immediate implementation TODO:

1. EN: Add generic Home entry metadata support for `type: "folder"` while preserving existing app/widget/custom-widget entries.
   中文：新增通用 Home 入口元数据对 `type: "folder"` 的支持，同时保留现有 app/widget/custom-widget 入口。
2. EN: Render a 1x1 Home folder tile that visually occupies the same grid footprint as a normal app icon and opens an immersive child-entry panel.
   中文：渲染一个占位等同普通 App 图标的 1x1 主屏文件夹入口，并可打开沉浸式子入口面板。
3. EN: Add Shopping as the first folder-backed module entry with child categories such as mall, fashion, beauty, digital, grocery, home, luxury, and gifts.
   中文：将购物作为第一个文件夹承载模块入口，子分类可包括商城、服饰、美妆、数码、生鲜、家居、奢侈品与礼物。
4. EN: Add Assets as a standalone module shell with categories for real estate, investment, vehicles, and special assets.
   中文：新增资产独立模块壳层，分类包括不动产、投资、交通工具与特殊资产。
5. EN: Defer rich visual theming to the appearance rebuild, but keep the technical boundary ready for Appearance to style folder blur, icon masks, preview density, and open animation.
   中文：丰富视觉样式暂缓到外观重建，但技术边界需预留给 Appearance 后续控制文件夹毛玻璃、图标蒙版、预览密度与打开动效。

Recommended next:

- EN: Start with the generic Home folder baseline before adding Shopping-specific screens. This reduces future rework if other modules also reuse the folder pattern.
  中文：先做通用 Home 文件夹基座，再做购物专属页面。这样如果后续其他模块也复用文件夹形态，可以显著减少返工。

Follow-up:

- EN: Home folder baseline, Shopping shell, Assets shell, planned-module registry, future source keys, and regression tests are now landed.
  中文：Home 文件夹基座、Shopping 壳层、Assets 壳层、规划模块注册表、未来 source key 与回归测试均已落地。
- EN: Next work should shift from infrastructure to module data behavior. Recommended order: Shopping local store/product-cart-order baseline first, then Assets local store/asset CRUD baseline.
  中文：下一步应从基础设施转向模块数据行为。推荐顺序：先做 Shopping 本地 store/商品-购物车-订单基线，再做 Assets 本地 store/资产 CRUD 基线。
- EN: Keep Chat/Wallet/Map/Stock handoffs source-key-only until Shopping and Assets stores are stable.
  中文：在 Shopping 和 Assets store 稳定前，Chat/Wallet/Map/Stock 联动先保持 source key 预留或只读边界，不急于写入真实联动。

---

## 2026-05-04 Update: Shopping Data Baseline

Status:

- EN: Shopping now has a local store for product catalog, favorites, cart lines, local orders, persistence, and backup/restore.
  中文：Shopping 现在已有本地 store，承载商品目录、收藏、购物车行、本地订单、持久化与备份/恢复。
- EN: `ShoppingView.vue` is wired to real local state for category browsing, favorite toggles, cart quantity edits, local checkout, and recent-order removal.
  中文：`ShoppingView.vue` 已接入真实本地状态，支持分类浏览、收藏切换、购物车数量调整、本地结算与最近订单删除。
- EN: Settings storage diagnostics and backup payload now include `store:shopping`.
  中文：Settings 存储诊断与备份载荷现在包含 `store:shopping`。
- EN: Folder visual status has been archived as a partial scaffold, not final Appearance-controlled theming.
  中文：文件夹视觉状态已存档为“局部脚手架”，不是最终由 Appearance 控制的主题化完成态。

Validation:

- `npm run lint`
- `npm test -- tests/shopping-store.test.js tests/shopping-view.test.js tests/home-folder-entry.test.js tests/system-widget-import.test.js`
- `npm test -- tests/system-automation.test.js tests/shopping-store.test.js tests/shopping-view.test.js`
- `npm run build`

Recommended next:

- EN: Move to Assets data baseline: local asset store, category summaries, valuation totals, CRUD basics, backup/restore, and then only later Map/Stock/Wallet handoffs.
  中文：下一步推进 Assets 数据基线：本地资产 store、分类摘要、估值合计、CRUD 基础、备份/恢复；Map/Stock/Wallet 联动再后置。

---

## 2026-05-04 Update: Assets Data Baseline

Status:

- EN: Assets now has a local store for long-term owned-object records, category summaries, status, valuation totals, persistence, and backup/restore.
  中文：Assets 现在已有本地 store，承载长期拥有物记录、分类摘要、状态、估值合计、持久化与备份/恢复。
- EN: `AssetsView.vue` is wired to real local state for category browsing, total/active counters, manual create/edit/status/delete, and recent asset display.
  中文：`AssetsView.vue` 已接入真实本地状态，支持分类浏览、总数/持有中统计、手动新增/编辑/状态更新/删除与最近资产展示。
- EN: Settings storage diagnostics and backup payload now include `store:assets`.
  中文：Settings 存储诊断与备份载荷现在包含 `store:assets`。
- EN: Backup import has a compatibility guard so old Gallery `assets` arrays are not treated as Assets ledger records.
  中文：备份导入已加入兼容保护，避免旧 Gallery 的 `assets` 数组被当成资产总账记录。
- EN: Assets visual identity is still deferred to the Appearance rebuild; the current page is only a functional baseline.
  中文：Assets 视觉身份仍后置到 Appearance 重建；当前页面只是功能基线。

Validation:

- `npm run lint`
- `npm test -- tests/assets-store.test.js tests/assets-view.test.js`
- `npm test -- tests/assets-store.test.js tests/assets-view.test.js tests/shopping-store.test.js tests/shopping-view.test.js`
- `npm run build`

Recommended next:

- EN: Move to Shopping -> Assets handoff baseline: surface manual/importable asset suggestions from asset-eligible Shopping orders, then defer Wallet/Map/Stock writebacks until the handoff UX is explicit.
  中文：下一步推进 Shopping -> Assets 交接基线：从可转资产的购物订单中展示手动/可导入资产建议；Wallet/Map/Stock 写回等到交接体验明确后再做。

---

## 2026-05-04 Update: Shopping -> Assets Handoff Baseline

Status:

- EN: Shopping now detects asset-eligible local order items and displays manual transfer suggestions inside `ShoppingView.vue`.
  中文：Shopping 现在会识别本地订单中可转资产的商品，并在 `ShoppingView.vue` 中展示手动转入建议。
- EN: Checkout does not write Assets automatically; the Assets store is written only after the user clicks the transfer action.
  中文：结算不会自动写入 Assets；只有用户点击转入动作后，Assets store 才会被写入。
- EN: Imported assets use deterministic ids and `assets_shopping_purchase` source metadata, preventing duplicate imports for the same order item.
  中文：转入资产使用确定性 ID 与 `assets_shopping_purchase` 来源元数据，避免同一订单商品重复导入。

Validation:

- `npm run lint`
- `npm test -- tests/shopping-view.test.js tests/assets-store.test.js tests/assets-view.test.js`
- `npm run build`

Recommended next:

- EN: Continue with manual-confirmation handoffs rather than automatic writebacks. Good candidates are Shopping -> Wallet expense suggestions or Shopping -> Calendar delivery/reminder suggestions.
  中文：继续做“手动确认式交接”，不要直接自动写回。候选项是 Shopping -> Wallet 消费建议，或 Shopping -> Calendar 配送/提醒建议。

---

## 2026-05-04 Update: Shopping -> Wallet Handoff Baseline

Status:

- EN: Shopping now displays manual Wallet expense suggestions for local orders.
  中文：Shopping 现在会为本地订单展示手动 Wallet 消费记账建议。
- EN: Checkout does not write Wallet automatically; Wallet receives an expense only after the user clicks the record action.
  中文：结算不会自动写入 Wallet；只有用户点击记账动作后，Wallet 才会生成消费流水。
- EN: Wallet expense records use `shopping_wallet_expense` and the order id as source metadata, preventing duplicate entries for the same order.
  中文：Wallet 消费记录使用 `shopping_wallet_expense` 与订单 ID 作为来源元数据，避免同一订单重复记账。

Validation:

- `npm run lint`
- `npm test -- tests/shopping-view.test.js tests/wallet-store.test.js tests/planned-module-registry.test.js`
- `npm run build`

Recommended next:

- EN: Continue the same pattern with Shopping -> Calendar delivery/reminder suggestions, or pause connector growth and clean up the mojibake-heavy Shopping page copy before adding more UI.
  中文：历史中文行在当前终端中显示异常；最新状态见下方 Shopping -> Calendar 更新块。

---

## 2026-05-04 Update: Shopping -> Calendar Handoff Baseline

Status:

- EN: Shopping checkout now writes a delivery/follow-up cue into Calendar while keeping the order itself owned by Shopping.
  中文：Shopping 结算现在会向 Calendar 写入配送/跟进线索，同时订单本身仍归 Shopping 拥有。
- EN: `CalendarView.vue` now displays Shopping delivery cues through `CalendarShoppingCueCard.vue`.
  中文：`CalendarView.vue` 现在通过 `CalendarShoppingCueCard.vue` 展示 Shopping 配送线索。
- EN: The handoff remains manual-confirmation based: only Calendar confirmation turns the cue into an event and attempts real push scheduling.
  中文：该交接继续采用手动确认规则：只有在 Calendar 内确认后，线索才会变成事件并尝试真实推送排程。
- EN: Removing a Shopping order dismisses the related Calendar cue and removes any confirmed event tied to that cue.
  中文：删除 Shopping 订单会忽略相关 Calendar 线索，并移除与该线索绑定的已确认事件。

Validation:

- `npm run lint`
- `npm test -- tests/shopping-store.test.js tests/shopping-view.test.js tests/calendar-event-store.test.js tests/calendar-shopping-cue-view.test.js tests/calendar-stock-cue-view.test.js tests/planned-module-registry.test.js`

Recommended next:

- EN: Pause broad connector expansion and do a focused copy/encoding cleanup for Shopping and Calendar visible strings, or add a very small Chat -> Shopping product-card suggestion while preserving Shopping checkout ownership.
  中文：建议暂停大范围联动扩张，先聚焦清理 Shopping 与 Calendar 可见文案/编码；或做一个很小的 Chat -> Shopping 商品卡建议，但必须保持 Shopping 拥有结算流程。
  中文：下一步可沿用同样模式做 Shopping -> Calendar 配送/提醒建议；也可以暂停连接点扩展，先清理 Shopping 页面里历史遗留的乱码文案再继续加 UI。

---

## 2026-05-04 Update: Shopping / Calendar Handoff Copy Clarification

Status:

- EN: `ShoppingView.vue` now labels the handoff section as current boundary status instead of future-only boundaries.
  中文：`ShoppingView.vue` 已将交接区说明改为当前边界状态，而不是全部描述成未来边界。
- EN: Shopping copy now states that Wallet, Assets, and Calendar handoffs exist but still require user confirmation.
  中文：Shopping 文案现在说明 Wallet、Assets 与 Calendar 交接已存在，但仍需要用户确认。
- EN: `CalendarView.vue` now explains Calendar as the cue-confirmation layer for Map, Phone, Shopping, and Stock.
  中文：`CalendarView.vue` 现在说明 Calendar 是 Map、Phone、Shopping、Stock 的线索确认层。
- EN: This slice did not add new behavior; it reduced product-state ambiguity before more connector work.
  中文：本切片没有新增行为，只是在继续新增连接点前降低产品状态误解。

Validation:

- `npm run lint`
- `npm test -- tests/shopping-view.test.js tests/calendar-shopping-cue-view.test.js tests/calendar-event-store.test.js`
- `npm run build`

Recommended next:

- EN: Add targeted component assertions for the clarified Shopping/Calendar status copy, or proceed to a small Chat -> Shopping product-card suggestion without moving checkout ownership out of Shopping.
  中文：下一步可补 Shopping/Calendar 状态文案的组件断言；或推进一个小型 Chat -> Shopping 商品卡建议，但不能把结算归属从 Shopping 移走。

---

## 2026-05-04 Update: Chat -> Shopping Product Suggestion Entry

Status:

- EN: Shopping/Calendar boundary copy now has targeted component assertions.
  中文：Shopping/Calendar 边界文案现在已有针对性组件断言保护。
- EN: Chat `+` panel now contains a small Shopping suggestion entry.
  中文：Chat 的 `+` 面板现在包含一个小型购物建议入口。
- EN: The entry routes to `/shopping?source=chat&intent=product_card`; all cart, order, checkout, Wallet, Assets, and Calendar ownership remains outside Chat.
  中文：该入口跳转到 `/shopping?source=chat&intent=product_card`；购物车、订单、结算、Wallet、Assets 与 Calendar 归属仍不进入 Chat。

Validation:

- `npm test -- tests\shopping-view.test.js tests\calendar-shopping-cue-view.test.js tests\chat-user-action-shopping-entry.test.js`

Recommended next:

- EN: If continuing Shopping/Chat work, add a read-only Chat product-card preview sourced from the Shopping catalog. If not, return to maintainability cleanup on a large view. Keep checkout Shopping-owned.
  中文：若继续推进 Shopping/Chat，可做读取 Shopping 商品目录的只读 Chat 商品卡预览；否则回到大视图可维护性清理。结算继续归 Shopping。

---

## 2026-05-04 Update: Chat Read-Only Shopping Product Preview

Status:

- EN: Chat now reads Shopping catalog products and shows up to three available items in the `+` panel as read-only previews.
  中文：Chat 现在读取 Shopping 商品目录，并在 `+` 面板中以只读预览展示最多三个有货商品。
- EN: Preview cards route back to Shopping with `source=chat`, `intent=product_card`, `category`, and `productId`.
  中文：预览卡会携带 `source=chat`、`intent=product_card`、`category` 与 `productId` 回到 Shopping。
- EN: `ShoppingView.vue` highlights the target product when opened with a `productId` query.
  中文：`ShoppingView.vue` 在携带 `productId` query 打开时会高亮目标商品。
- EN: No cart/order/checkout ownership moved into Chat.
  中文：购物车、订单与结算归属没有进入 Chat。

Validation:

- `npm test -- tests\chat-user-action-shopping-entry.test.js tests\chat-shopping-preview-routing.test.js tests\shopping-view.test.js`

Recommended next:

- EN: If continuing the same connector, add explicit "send product card as local chat message" composition while keeping checkout in Shopping. Otherwise return to maintainability cleanup on a large view.
  中文：若继续同一连接线，可新增“作为本地聊天消息发送商品卡”的组装能力，但结算继续留在 Shopping；否则回到大视图可维护性清理。

---

## 2026-05-04 Update: Chat Shopping Product Card Message Batch

Status:

- EN: Chat now supports a structured `product_card` block from store normalization through visual rendering.
  中文：Chat 现在支持结构化 `product_card` 消息块，从 store 归一化到视觉渲染均已接通。
- EN: The Chat `+` panel can either route a product preview to Shopping or send it as a local Chat product-card message.
  中文：Chat `+` 面板既可以把商品预览跳转到 Shopping，也可以将其作为本地 Chat 商品卡消息发送。
- EN: Shopping shows a Chat-source banner when opened from a product card and offers a return-to-chat action when `chatId` is present.
  中文：Shopping 从商品卡打开时会显示 Chat 来源承接提示，并在存在 `chatId` 时提供返回聊天动作。
- EN: No cart/order/checkout ownership moved into Chat.
  中文：购物车、订单与结算归属仍未进入 Chat。

Validation:

- `npm test -- tests\chat-store-model.test.js tests\chat-user-action-shopping-entry.test.js tests\chat-shopping-preview-routing.test.js tests\shopping-view.test.js`

Recommended next:

- EN: Continue Shopping with gift-intent handoff: let checkout attach an optional Chat recipient/thread context and then surface the confirmed gift context back in Chat. Keep checkout owned by Shopping.
  中文：继续 Shopping 线可推进赠礼意图交接：结算时可选附带 Chat 收礼对象/会话上下文，再把确认后的赠礼上下文回显到 Chat；结算仍归 Shopping。

---

## 2026-05-04 Update: Shopping Product Source / Image Source Contract

Status:

- EN: New product decision: Shopping products should support system seed/catalog, user-custom, and future AI-assisted/generated origins.
  中文：新增产品决策：Shopping 商品应支持系统预设/目录、用户自定义、未来 AI 辅助/生成三类来源。
- EN: New technical direction: user image input across the project should converge on one source contract: URL, Gallery asset, local file through Gallery, and future AI-generated asset.
  中文：新增技术方向：全项目用户图片输入应收敛到同一个来源契约：URL、Gallery 素材、通过 Gallery 的本地文件，以及未来 AI 生成素材。
- EN: Immediate Shopping slice: add product image metadata, custom product creation, URL image support, and Gallery image support.
  中文：Shopping 当前立即推进项：商品图片元数据、自定义商品创建、URL 图片支持与 Gallery 图片支持。

Recommended next:

- EN: Build reusable image-source utilities/components only after the first Shopping implementation proves the contract shape. Do not duplicate file-upload storage outside Gallery.
  中文：先通过 Shopping 第一刀验证契约形态，再抽可复用图片来源工具/组件；不要在 Gallery 之外重复建设文件上传存储。

---

## 2026-05-04 Update: Shopping Custom Product Images Landed

Status:

- EN: `src/stores/shopping.js` now normalizes product origin as `seed`, `user`, or `ai`.
  中文：`src/stores/shopping.js` 现在会将商品来源归一化为 `seed`、`user` 或 `ai`。
- EN: Shopping product images now use a shared source shape: `none`, `url`, `gallery`, or `ai`.
  中文：Shopping 商品图片现在使用统一来源结构：`none`、`url`、`gallery` 或 `ai`。
- EN: `ShoppingView.vue` now lets users create custom products with URL images or Gallery asset images.
  中文：`ShoppingView.vue` 现在支持用户创建自定义商品，并选择 URL 图片或 Gallery 素材图片。
- EN: Local file upload remains centralized in Gallery: Shopping references Gallery assets instead of owning a separate upload/storage flow.
  中文：本地文件上传继续集中在 Gallery：Shopping 引用 Gallery 素材，不单独拥有一套上传/存储流程。
- EN: Validation passed: `npm test -- tests\shopping-store.test.js tests\shopping-view.test.js`.
  中文：验证通过：`npm test -- tests\shopping-store.test.js tests\shopping-view.test.js`。

Recommended next:

- EN: Extract a reusable image-source picker only after one more module adopts the same input contract, so the abstraction has at least two real consumers.
  中文：等第二个模块也采用同一图片来源契约后，再抽取可复用图片来源选择器，让抽象至少被两个真实消费者验证。
- EN: If Shopping remains the priority, continue with gift-recipient handoff: allow a confirmed Shopping order to attach optional Chat/contact recipient context while keeping checkout owned by Shopping.
  中文：如果继续优先推进 Shopping，则下一步做赠礼收件人交接：让已确认 Shopping 订单可选附带 Chat/联系人收礼上下文，但结算归属仍留在 Shopping。

---

## 2026-05-05 Update: Joint Shopping Gift + Assets Image Batch

Status:

- EN: Starting a joint functional batch rather than two isolated micro-steps.
  中文：开始一个联合功能批次，而不是两个孤立小步。
- EN: Shopping gift-recipient handoff will store optional Chat/contact context on the order, without moving cart or checkout behavior into Chat.
  中文：Shopping 赠礼收件人交接会把可选 Chat/联系人上下文存到订单上，但不会把购物车或结算行为移入 Chat。
- EN: Assets image-source support will reuse the same source shape proven in Shopping: URL, Gallery asset, local file through Gallery, and future AI-generated asset.
  中文：Assets 图片来源支持将复用 Shopping 已验证的来源结构：URL、Gallery 素材、通过 Gallery 的本地文件，以及未来 AI 生成素材。
- EN: Local file upload remains centralized in Gallery.
  中文：本地文件上传继续集中在 Gallery。
- EN: Landed: Shopping orders persist structured `giftRecipient` context and `ShoppingView.vue` can prefill it from Chat product-card routes.
  中文：已落地：Shopping 订单会持久化结构化 `giftRecipient` 上下文，`ShoppingView.vue` 可从 Chat 商品卡路由预填该上下文。
- EN: Landed: Assets now uses the shared image-source contract for URL/Gallery/AI-reserved asset images.
  中文：已落地：Assets 现在使用共享图片来源契约承载 URL/Gallery/AI 预留资产图片。
- EN: Validation passed: `npm test -- tests\shopping-store.test.js tests\shopping-view.test.js tests\assets-store.test.js tests\assets-view.test.js`, `npm run lint`, and `npm run build`.
  中文：验证通过：`npm test -- tests\shopping-store.test.js tests\shopping-view.test.js tests\assets-store.test.js tests\assets-view.test.js`、`npm run lint` 与 `npm run build`。

Recommended next after this batch:

- EN: Extract a reusable image-source picker component from Shopping + Assets usage before adding the same picker to more modules.
  中文：先从 Shopping + Assets 两处用法抽取通用图片来源选择器组件，再把同样选择器扩展到更多模块。
- EN: After that, continue Shopping-to-Chat gift context visibility so Chat can show confirmed gift-order context without owning checkout.
  中文：之后再继续 Shopping 到 Chat 的赠礼上下文回显，让 Chat 能展示已确认赠礼订单上下文，但不拥有结算。

---

## 2026-05-05 Update: Shared Image Source Picker Landed

Status:

- EN: `src/components/shared/ImageSourcePicker.vue` now owns the common URL/Gallery/AI-reserved picker UI.
  中文：`src/components/shared/ImageSourcePicker.vue` 现在承载通用 URL/Gallery/AI 预留图片来源选择 UI。
- EN: Shopping custom product creation and Assets manual asset creation/editing now consume the shared picker.
  中文：Shopping 自定义商品创建与 Assets 手动资产新增/编辑现在都消费共享选择器。
- EN: The existing test-id contract was preserved so current view tests still protect the same user paths.
  中文：既有 test-id 契约已保留，因此当前视图测试仍保护同样的用户路径。
- EN: Validation passed: `npm test -- tests\shopping-view.test.js tests\assets-view.test.js tests\shopping-store.test.js tests\assets-store.test.js`, `npm run lint`, and `npm run build`.
  中文：验证通过：`npm test -- tests\shopping-view.test.js tests\assets-view.test.js tests\shopping-store.test.js tests\assets-store.test.js`、`npm run lint` 与 `npm run build`。

Recommended next:

- EN: Legacy picker template blocks are now removed from Shopping and Assets. Next, adopt `ImageSourcePicker` in the next image-heavy module, or return to Shopping-to-Chat gift context visibility if connector work is the priority.
  中文：Shopping 与 Assets 中旧选择器模板块已清理。下一步可将 `ImageSourcePicker` 接入下一个重图片模块；若继续优先联动，则回到 Shopping-to-Chat 赠礼上下文回显。

---

## 2026-05-05 Update: Appearance Wallpaper Picker Uses Shared Image Source UI

Status:

- EN: `ImageSourcePicker.vue` now accepts custom source options, allowing non-product workflows such as wallpaper sources to use the same component without showing irrelevant AI/default-icon choices.
  中文：`ImageSourcePicker.vue` 现在支持自定义来源选项，因此壁纸来源这类非商品流程也能复用同一组件，而不会显示无关的 AI/默认图标选项。
- EN: Appearance wallpaper selection now uses the shared picker for Theme, URL, and Gallery modes while preserving existing system-store wallpaper behavior.
  中文：Appearance 壁纸选择现在使用共享选择器承载主题、URL 与 Gallery 三种模式，同时保留原有 system store 壁纸行为。
- EN: `tests/appearance-wallpaper-picker.test.js` covers URL, Gallery, and theme wallpaper application through the shared picker.
  中文：`tests/appearance-wallpaper-picker.test.js` 已覆盖通过共享选择器应用 URL、Gallery 与主题壁纸。

Recommended next:

- EN: Continue image-source consolidation in one more visual/media-heavy module, preferably Map background imagery or profile/contact avatar selection. Keep direct local file upload centralized in Gallery.
  中文：下一步建议继续在一个重视觉/媒体模块中收敛图片来源，优先候选是 Map 背景图或 Profile/Contacts 头像选择。直接本地文件上传仍统一集中在 Gallery。

---

## 2026-05-05 Update: Map Picker + Chat Gift Context Sync Batch

Status:

- EN: Map visual selection now consumes `ImageSourcePicker` for default/Gallery mode selection, making Map the fourth real shared-picker consumer after Shopping, Assets, and Appearance.
  中文：Map 视觉选择现在使用 `ImageSourcePicker` 承载默认/Gallery 模式选择，成为 Shopping、Assets、Appearance 之后第四个真实共享选择器消费者。
- EN: Chat now reads confirmed Shopping gift orders for the active conversation and displays them as read-only context cards.
  中文：Chat 现在会读取当前会话相关的已确认 Shopping 赠礼订单，并以只读上下文卡片展示。
- EN: The ownership boundary is preserved: Chat can view and route to Shopping gift orders, but cannot create or mutate Shopping checkout state.
  中文：归属边界保持不变：Chat 可以查看并跳转到 Shopping 赠礼订单，但不能创建或修改 Shopping 结算状态。

Recommended next:

- EN: Add Shopping-side support for `intent=gift_order&orderId=...` so the route from Chat lands on a highlighted order, or continue media-source consolidation into Profile/Contacts avatars.
  中文：下一步建议在 Shopping 侧支持 `intent=gift_order&orderId=...`，让 Chat 跳转能定位高亮订单；或继续把媒体来源收敛推进到 Profile/Contacts 头像。

---

## 2026-05-05 Update: Shopping Gift Order Route Highlight

Status:

- EN: `ShoppingView.vue` now reads `source=chat&intent=gift_order&orderId=...` and turns the matching order into the visible, highlighted target.
  中文：`ShoppingView.vue` 现在读取 `source=chat&intent=gift_order&orderId=...`，并将对应订单变成可见且高亮的目标。
- EN: The recent-order list now pulls in the target order when it would otherwise be outside the normal short list, so Chat-to-Shopping navigation does not land on an invisible state.
  中文：最近订单列表会在目标订单原本不在短列表内时主动纳入该订单，避免 Chat 跳转到 Shopping 后看不到目标。
- EN: Ownership remains unchanged: Chat surfaces and routes to gift context, while Shopping owns product, cart, order, and checkout state.
  中文：归属不变：Chat 只展示并跳转赠礼上下文；商品、购物车、订单和结算状态仍归 Shopping。
- EN: Validation passed: `npm test -- tests\shopping-view.test.js tests\chat-shopping-preview-routing.test.js`.
  中文：验证通过：`npm test -- tests\shopping-view.test.js tests\chat-shopping-preview-routing.test.js`。

Recommended next:

- EN: Continue media-source consolidation into Profile/Contacts avatar selection, or add a focused Shopping order-detail panel if order review needs a clearer drill-in surface.
  中文：下一步建议继续把媒体来源收敛推进到 Profile/Contacts 头像选择；如果订单查看需要更清晰的下钻面板，则补一个聚焦的 Shopping 订单详情面板。

---

## 2026-05-05 Update: Profile + Contacts Avatar Source Consolidation

Status:

- EN: User profile avatar selection now consumes the shared `ImageSourcePicker` with default, URL, and Gallery modes.
  中文：用户资料头像选择现在接入共享 `ImageSourcePicker`，支持默认、URL 与 Gallery 三种模式。
- EN: Role profiles in Contacts now persist structured `avatarImage` metadata while keeping legacy URL avatar compatibility for current Chat/contact rendering.
  中文：Contacts 中的角色档案现在持久化结构化 `avatarImage` 元数据，同时保留旧 URL 头像兼容，避免破坏当前 Chat/contact 渲染。
- EN: `ImageSourcePicker` now supports both camelCase and kebab-case update events, reducing integration risk for future explicit event listeners.
  中文：`ImageSourcePicker` 现在支持 camelCase 与 kebab-case 两类更新事件，降低后续显式事件监听接入风险。
- EN: Validation passed: `npm test -- tests\user-profile-avatar-picker.test.js tests\contacts-wallet-ledger-context.test.js tests\shopping-view.test.js tests\assets-view.test.js tests\appearance-wallpaper-picker.test.js tests\map-visual-picker.test.js`.
  中文：验证通过：`npm test -- tests\user-profile-avatar-picker.test.js tests\contacts-wallet-ledger-context.test.js tests\shopping-view.test.js tests\assets-view.test.js tests\appearance-wallpaper-picker.test.js tests\map-visual-picker.test.js`。

Recommended next:

- EN: Continue with Gallery avatar resolution in Chat avatar rendering, or shift to a Shopping order-detail panel if order review needs a deeper surface.
  中文：下一步建议继续把 Gallery 头像解析接入 Chat 头像渲染链；如果订单查看需要更深层界面，则转做 Shopping 订单详情面板。
---

## 2026-05-05 Update: Chat Gallery Avatar Rendering

Status:

- EN: Chat now resolves structured URL/Gallery avatar sources from Profile and Contacts in the conversation list, assistant-side message avatars, and self-side message avatars.
  中文：Chat 现在会在会话列表、对方消息头像、自己消息头像中解析 Profile 与 Contacts 保存的结构化 URL/Gallery 头像来源。
- EN: Thread-level and module-level avatar overrides still win over global role/profile avatars, so existing identity override behavior is preserved.
  中文：单会话头像覆写和模块级头像覆写仍优先于全局角色/用户头像，因此既有身份覆写行为不变。
- EN: ChatDirectory role binding rows now use the same Gallery avatar resolution, keeping management and chat-entry display aligned.
  中文：Chat Directory 的角色绑定行也使用同一套 Gallery 头像解析，保证管理页与聊天入口显示一致。
- EN: Validation passed: `npm test -- tests\chat-avatar-image-source.test.js`.
  中文：验证通过：`npm test -- tests\chat-avatar-image-source.test.js`。

Recommended next:

- EN: Add a focused Shopping order-detail panel next, because Chat can already route to orders and Shopping now needs a clearer drill-in surface for review.
  中文：下一步建议补一个聚焦的 Shopping 订单详情面板，因为 Chat 已经能跳回订单，Shopping 侧需要更清晰的下钻查看面。
- EN: If order review is paused, continue small ChatDirectory/service-account polish without changing Chat/store ownership boundaries.
  中文：如果暂缓订单详情，则继续做 ChatDirectory/服务号管理的小型打磨，但不改变 Chat/store 的归属边界。

---

## 2026-05-05 Update: Shopping Order Detail Panel

Status:

- EN: Shopping now has a focused read-only order-detail panel for recent orders and Chat gift-order returns.
  中文：Shopping 现在为最近订单与 Chat 赠礼订单返回路径提供聚焦的只读订单详情面板。
- EN: The panel shows order total, status, item lines, gift context, and clear copy that Shopping owns checkout while other modules only receive explicit handoffs.
  中文：面板展示订单总额、状态、商品明细、赠礼上下文，并明确说明 Shopping 拥有结算，其他模块只接收显式交接。
- EN: Validation passed: `npm test -- tests\shopping-view.test.js`.
  中文：验证通过：`npm test -- tests\shopping-view.test.js`。

Recommended next:

- EN: Let ChatDirectory service/official accounts adopt the shared avatar image-source contract so non-role chat entries can also use URL/Gallery avatars.
  中文：下一步建议让 ChatDirectory 的服务号/公众号接入共享头像来源契约，使非角色类聊天对象也能使用 URL/Gallery 头像。
- EN: Alternative if Shopping remains the focus: add explicit order-lifecycle status controls, such as mark completed/cancelled, without moving Wallet/Assets ownership.
  中文：如果继续聚焦 Shopping，则可补订单生命周期状态控制，例如标记完成/取消，但不移动 Wallet/Assets 归属。
---

## 2026-05-05 Update: ChatDirectory Service Avatar Source Contract

Status:

- EN: ChatDirectory service and official account editing now consumes the shared `ImageSourcePicker` with default, URL, and Gallery avatar modes.
  中文：ChatDirectory 服务号/官方账号编辑已复用共享 `ImageSourcePicker`，支持默认、URL、Gallery 三类头像来源。
- EN: Contact-level `avatarImage` metadata now persists for service/official chat entries, while existing service/official fallback icons remain when no explicit avatar is configured.
  中文：服务号/官方账号聊天对象已持久化 contact 级 `avatarImage`；未配置头像时仍保留服务号/官方账号默认图标。
- EN: Validation passed across avatar rendering, Chat store model, contacts context, and Chat-to-Shopping routing tests.
  中文：头像渲染、Chat store 模型、联系人上下文、Chat-to-Shopping 路由相关测试均已通过。

Recommended next:

- EN: Continue Shopping order lifecycle controls because the order-detail panel is already landed and needs explicit completion/cancellation states.
  中文：下一步建议继续补 Shopping 订单生命周期控制，因为订单详情面板已落地，需要明确完成/取消状态。

---

## 2026-05-05 Update: Shopping Order Lifecycle Controls

Status:

- EN: Shopping now has explicit local order lifecycle APIs: `updateOrderStatus`, `markOrderCompleted`, and `cancelOrder`.
  中文：Shopping 已具备明确的本地订单生命周期 API：`updateOrderStatus`、`markOrderCompleted`、`cancelOrder`。
- EN: The order-detail panel now exposes complete/cancel actions; completing or cancelling an order closes its Calendar delivery cue.
  中文：订单详情面板已提供完成/取消操作；完成或取消订单会关闭对应 Calendar 配送线索。
- EN: This preserves ownership boundaries: Shopping owns order state; Calendar only carries confirmed handoff cues.
  中文：该设计保持归属边界：Shopping 拥有订单状态，Calendar 只承载已交接的跟进线索。
- EN: Validation passed: `npm test -- tests\shopping-store.test.js tests\shopping-view.test.js`.
  中文：验证通过：`npm test -- tests\shopping-store.test.js tests\shopping-view.test.js`。

Recommended next:

- EN: Run the broader connector regression next, then choose between Shopping service/shop presets and Assets-to-Map location handoff.
  中文：下一步建议先跑更宽的联动回归，然后在 Shopping 服务/店铺预设与 Assets-to-Map 位置交接之间选择同体量任务。
---

## 2026-05-05 Update: Shopping Service Presets

Status:

- EN: Shopping now defines stable service/shop presets for platform-like grouping inside the Shopping module.
  中文：Shopping 已定义稳定的服务/店铺预设，用于在购物模块内部形成类似多个购物平台的分组。
- EN: Products persist `serviceKey`, and both seed products and user-created products can be filtered by service.
  中文：商品会持久化 `serviceKey`，内置商品与用户自定义商品均可按服务/店铺筛选。
- EN: This deliberately avoids creating multiple standalone foreground apps; Home folder immersion remains a visual/navigation layer, while Shopping owns catalog, cart, and orders.
  中文：这一步刻意不新增多个独立前台 App；主屏文件夹沉浸感仍属于视觉/导航层，Shopping 继续拥有商品、购物车和订单。
- EN: Validation passed: `npm test -- tests\planned-module-registry.test.js tests\shopping-store.test.js tests\shopping-view.test.js`.
  中文：验证通过：`npm test -- tests\planned-module-registry.test.js tests\shopping-store.test.js tests\shopping-view.test.js`。

Recommended next:

- EN: Connect Shopping service presets to ChatDirectory service accounts so platform/shop identities can appear in Chat without moving Shopping ownership.
  中文：下一步建议把 Shopping 店铺预设与 ChatDirectory 服务号账号衔接，让平台/店铺身份能出现在 Chat 中，但不转移 Shopping 归属。
- EN: Alternative: run broader connector regression and then start Assets-to-Map location handoff.
  中文：备选是先跑更宽联动回归，再开始 Assets-to-Map 位置交接。

---

## 2026-05-05 Update: ChatDirectory Shopping Service Account Binding

Status:

- EN: ChatDirectory can now create Shopping shop service accounts from shared shop presets.
  中文：ChatDirectory 现在可以从共享店铺预设创建 Shopping 店铺服务号。
- EN: Service and official contacts persist a normalized `shoppingServiceKey`, and the service editor can manually bind or clear a Shopping shop reference.
  中文：服务号/公众号联系人会持久化标准化的 `shoppingServiceKey`，服务编辑弹窗可手动绑定或清空 Shopping 店铺引用。
- EN: The service list displays the bound Shopping shop label so future Chat interactions can identify which shop/account is speaking.
  中文：服务号列表会显示已绑定的 Shopping 店铺名称，后续 Chat 互动可明确是哪一个店铺/账号在发言。
- EN: Validation passed: `npm test -- tests\chat-store-model.test.js tests\chat-avatar-image-source.test.js`.
  中文：验证通过：`npm test -- tests\chat-store-model.test.js tests\chat-avatar-image-source.test.js`。

Recommended next:

- EN: Add Chat-facing product-card/service-account sender context so a shop-bound service account can recommend or discuss Shopping products without owning checkout.
  中文：下一步建议补 Chat 侧商品卡/服务号发送者上下文，让绑定店铺的服务号能推荐或讨论 Shopping 商品，但不接管结算。
- EN: Alternative same-size slice: begin Assets-to-Map location handoff for real estate and vehicle assets.
  中文：同体量备选任务是启动 Assets-to-Map 位置交接，让不动产和交通工具类资产开始服务地图系统。

---

## 2026-05-05 Update: Chat Product Card Shop Context

Status:

- EN: Chat product cards now carry Shopping shop context through `serviceKey` and `serviceLabel`.
  中文：Chat 商品卡现在会通过 `serviceKey` 与 `serviceLabel` 携带 Shopping 店铺上下文。
- EN: Product previews and sent product-card messages display the shop label and route back to Shopping with the `service` query.
  中文：商品预览和已发送商品卡会显示店铺名称，并在跳转 Shopping 时携带 `service` query。
- EN: Shopping-bound service account chats now prioritize products from the bound shop in the `+` panel.
  中文：已绑定 Shopping 店铺的服务号聊天中，`+` 面板会优先展示该店铺商品。
- EN: Validation passed: `npm test -- tests\chat-store-model.test.js tests\chat-user-action-shopping-entry.test.js tests\chat-shopping-preview-routing.test.js`.
  中文：验证通过：`npm test -- tests\chat-store-model.test.js tests\chat-user-action-shopping-entry.test.js tests\chat-shopping-preview-routing.test.js`。

Recommended next:

- EN: Run the broader Shopping/Chat regression before adding another connector.
  中文：下一步先跑更宽的 Shopping/Chat 回归，再继续新增连接点。
- EN: Good next slice: service-account order reminder copy in Chat, or Assets-to-Map location handoff if shifting away from Shopping.
  中文：可选下一切片：补 Chat 服务号订单提醒文案；若切出 Shopping，则推进 Assets-to-Map 位置交接。

---

## 2026-05-05 Update: Shopping Logistics Peer Entry

Status:

- EN: Shopping now includes a peer `logistics` entry alongside product categories.
  中文：Shopping 现在新增与商品品类平级的 `logistics` / 物流入口。
- EN: The logistics view aggregates Shopping orders and Calendar delivery cues instead of creating a separate logistics store.
  中文：物流视图聚合 Shopping 订单与 Calendar 配送线索，不新增独立物流 store。
- EN: Logistics is intentionally excluded from the custom-product category selector.
  中文：物流被刻意排除在自定义商品品类选择器之外。
- EN: Validation passed: `npm test -- tests\planned-module-registry.test.js tests\shopping-store.test.js tests\shopping-view.test.js`.
  中文：验证通过：`npm test -- tests\planned-module-registry.test.js tests\shopping-store.test.js tests\shopping-view.test.js`。

Linkage judgment:

- EN: Calendar: current strongest linkage. Shopping checkout already creates delivery cues; logistics displays them.
  中文：Calendar：当前最强联动。Shopping 结算已生成配送线索，物流入口负责展示。
- EN: Chat: next strong candidate. Shop service accounts can send shipment, arrival, delay, and pickup messages.
  中文：Chat：下一强候选。店铺服务号可发送发货、到达、延迟、取件消息。
- EN: Map: future candidate. Delivery address, pickup point, courier route, or ETA can become Map context later.
  中文：Map：未来候选。配送地址、取件点、配送路线或 ETA 后续可进入 Map 上下文。
- EN: Wallet/Assets: downstream consumers only. Logistics should not own expenses or owned objects.
  中文：Wallet/Assets：仅作为下游消费方。物流不应拥有消费流水或拥有物记录。

Recommended next:

- EN: Add Chat service-account shipment/arrival reminder cards before starting Map address handoff.
  中文：建议先补 Chat 店铺服务号发货/到达提醒卡，再启动 Map 地址交接。
---

## 2026-05-05 Update: Chat Service Logistics Context

Status:

- EN: Shopping order items now persist shop identity through `serviceKey` and `serviceLabel`.
  中文：Shopping 订单项现在通过 `serviceKey` 与 `serviceLabel` 固化店铺身份。
- EN: Chat service accounts bound to Shopping shops show read-only logistics reminders for matching active Calendar delivery cues.
  中文：绑定 Shopping 店铺的 Chat 服务号会展示匹配该店铺、仍活跃的 Calendar 配送线索，且保持只读。
- EN: Chat routes these reminders back to Shopping Logistics with `category=logistics`, `intent=logistics`, `service`, `chatId`, and `orderId`.
  中文：Chat 会携带 `category=logistics`、`intent=logistics`、`service`、`chatId`、`orderId` 跳回 Shopping 物流入口。
- EN: Shopping recognizes the Chat logistics source banner and highlights the linked logistics order row.
  中文：Shopping 会识别来自 Chat 的物流来源横幅，并高亮对应物流订单行。
- EN: Validation passed: `npm test -- tests\shopping-store.test.js tests\chat-shopping-preview-routing.test.js tests\shopping-view.test.js tests\calendar-shopping-cue-view.test.js`.
  中文：验证通过：`npm test -- tests\shopping-store.test.js tests\chat-shopping-preview-routing.test.js tests\shopping-view.test.js tests\calendar-shopping-cue-view.test.js`。

Recommended next:

- EN: Add explicit Chat message-card composition for shipment/arrival updates if continuing Shopping/Chat immersion.
  中文：若继续深化 Shopping/Chat 沉浸联动，下一步建议做可发送的 Chat 发货/到达消息卡。
- EN: Alternative same-size slice: start Map delivery-address handoff, keeping Map as a location consumer rather than a logistics owner.
  中文：同体量备选任务是启动 Map 配送地址交接，但 Map 只作为位置消费方，不成为物流归属方。

---

## 2026-05-05 Update: Shopping Promotion / Logistics Service / Food Delivery Baseline

Status:

- EN: The Shopping service-account boundary has changed: shop accounts should push new arrivals, discounts, and product recommendations, while logistics belongs to separate Logistics service accounts.
  中文：Shopping 服务号边界已调整：店铺号负责新品、折扣和商品推荐；物流信息统一归独立物流服务号。
- EN: ChatDirectory now supports dedicated Logistics and Food Delivery service-account presets, and Chat contacts persist `logisticsServiceKey` / `foodDeliveryServiceKey`.
  中文：ChatDirectory 已支持独立物流服务号与外卖通知服务号预设，Chat 联系人会持久化 `logisticsServiceKey` / `foodDeliveryServiceKey`。
- EN: Chat logistics reminders now appear only for Logistics service accounts and aggregate active delivery cues from Shopping/Calendar.
  中文：Chat 物流提醒现在只在物流服务号会话中出现，并聚合来自 Shopping/Calendar 的活跃配送线索。
- EN: Food Delivery now has a Home folder-style entry and a light `/food-delivery` route with category navigation and Map handoff boundary copy.
  中文：外卖已具备主屏文件夹式入口和轻量 `/food-delivery` 页面，支持分类导航，并明确与 Map 的交接边界。
- EN: Validation passed across planned registry, Home folder, Food Delivery view, Chat store, ChatDirectory, logistics routing, system widget import, and icon-presentation tests.
  中文：已通过规划注册、主屏文件夹、外卖页面、Chat store、ChatDirectory、物流路由、系统桌面导入和图标展示相关回归。

Recommended next:

- EN: Add a local Food Delivery data baseline: restaurant records, menu items, delivery cart, order skeleton, and a read-only Chat food-delivery push context.
  中文：下一步建议补外卖本地数据基线：餐厅记录、菜单项、外卖购物车、订单骨架，以及 Chat 中只读外卖推送上下文。
- EN: After that, connect Map as a location/ETA provider for Food Delivery, not as the owner of restaurant orders or payment.
  中文：随后再让 Map 作为外卖的位置/ETA 提供方接入，而不是接管餐厅订单或支付。

---

## 2026-05-05 Update: Food Delivery Local Data Baseline

Status:

- EN: Food Delivery now has a persisted local store for restaurants, menu items, cart lines, orders, and order status.
  中文：Food Delivery 现在具备持久化本地 store，管理餐厅、菜单项、购物车行、订单和订单状态。
- EN: The Food Delivery page can create a baseline order from seed menu data while keeping Map as a future location/ETA provider.
  中文：外卖页面现在可从种子菜单数据生成基础订单，同时继续把 Map 定位为后续位置/ETA 提供方。
- EN: Settings backup/import/rollback and storage diagnostics now include Food Delivery data.
  中文：Settings 的备份、导入、回滚和存储诊断已包含外卖数据。
- EN: Validation passed: Food Delivery store/view, Home folder, and system widget import tests.
  中文：已通过外卖 store/view、主屏文件夹和系统桌面导入相关测试。

Recommended next:

- EN: Add Chat food-delivery service-account push context next, using the existing `foodDeliveryServiceKey` contact binding and Food Delivery order status.
  中文：下一步建议补 Chat 外卖服务号推送上下文，复用现有 `foodDeliveryServiceKey` 联系人绑定和外卖订单状态。
- EN: Keep Map handoff read-only until Food Delivery order state is stable in Chat.
  中文：在外卖订单状态进入 Chat 并稳定前，Map 交接继续保持只读。

---

## 2026-05-05 Update: Chat Food Delivery Service Context

Status:

- EN: Chat now has a read-only Food Delivery service-account context block keyed by `foodDeliveryServiceKey`.
  中文：Chat 已新增基于 `foodDeliveryServiceKey` 的只读外卖服务号上下文块。
- EN: The context block shows recent Food Delivery orders with restaurant, menu item, amount, delivery address summary, and localized status label.
  中文：该上下文块会展示最近外卖订单的餐厅、菜品、金额、配送地址摘要和本地化状态标签。
- EN: Clicking the block routes to Food Delivery, where a Chat source banner appears and the linked food order is highlighted.
  中文：点击该卡片会跳到外卖模块，外卖页会出现 Chat 来源提示并高亮对应订单。
- EN: Validation passed: `npm test -- tests\chat-shopping-preview-routing.test.js tests\food-delivery-view.test.js`.
  中文：验证通过：`npm test -- tests\chat-shopping-preview-routing.test.js tests\food-delivery-view.test.js`。

Recommended next:

- EN: Start the Map read-only Food Delivery handoff: delivery address, restaurant location, nearby filter, rider route, and ETA should be consumed by Food Delivery without moving order ownership.
  中文：下一步建议启动 Map -> Food Delivery 的只读交接：配送地址、餐厅位置、附近筛选、骑手路线和 ETA 可被外卖消费，但不移动订单归属。
- EN: Parallel same-size follow-up: add user-created restaurant/menu image source fields using the shared Gallery/URL image-source contract.
  中文：同体量备选是补用户自定义餐厅/菜单图片来源字段，复用全项目 Gallery/URL 图片来源契约。

---

## 2026-05-05 Update: Map Food Delivery Read-Only Handoff

Status:

- EN: Map now exposes `buildFoodDeliveryMapHandoff()` for Food Delivery to consume location/ETA context without creating trips or orders.
  中文：Map 已新增 `buildFoodDeliveryMapHandoff()`，供 Food Delivery 消费位置/ETA 上下文，但不会创建行程或订单。
- EN: The handoff includes delivery address, restaurant pickup point, estimated distance, ETA, route summary, and stable source metadata.
  中文：该交接包含配送地址、餐厅取餐点、预计距离、ETA、路线摘要和稳定来源元数据。
- EN: Food Delivery displays the Map delivery context panel and uses the current Map location as the checkout delivery address.
  中文：Food Delivery 会展示 Map 配送上下文面板，并在下单时使用当前 Map 定位作为配送地址。
- EN: Validation passed: `npm test -- tests\map-trip-baseline.test.js tests\food-delivery-view.test.js`.
  中文：验证通过：`npm test -- tests\map-trip-baseline.test.js tests\food-delivery-view.test.js`。

Recommended next:

- EN: Add user-created restaurant/menu image source fields using the shared Gallery/URL image-source contract.
  中文：下一步建议补用户自定义餐厅/菜单图片来源字段，复用共享 Gallery/URL 图片来源契约。
- EN: Then deepen Food Delivery status/exception message cards, such as rider delay, restaurant cancellation, address change, and ETA update.
  中文：随后深化外卖状态/异常消息卡，例如骑手延迟、商家取消、改地址和预计送达变化。

---

## 2026-05-16 Update: Event Specialist Track Created

Status:

- EN: Event-specialist workflow docs now exist for random, condition-driven, scheduled, and module-owned immersive events.
  中文：事件专项流程已建立，用于随机触发、条件触发、定时触发与模块自有沉浸式事件。
- EN: Architecture baseline is recorded in `docs/architecture/SIMULATION_EVENT_ENGINE.md`; it keeps event orchestration separate from module state ownership.
  中文：事件引擎架构基线已记录在 `docs/architecture/SIMULATION_EVENT_ENGINE.md`；事件编排与模块状态归属保持分离。
- EN: Event TODO is now tracked in `docs/overview/IMMERSIVE_EVENT_TODO.md`.
  中文：事件专项 TODO 已记录在 `docs/overview/IMMERSIVE_EVENT_TODO.md`。

Recommended next:

- EN: Promote the current Food Delivery order-event behavior into explicit presets, then add a `simulationStore` for event logs, cooldowns, caps, and future Surprise Mode.
  中文：下一步建议把当前外卖订单事件行为整理为显式预设，然后新增 `simulationStore` 承载事件日志、冷却、上限与未来“惊喜模式”。
- EN: Alternative pure-foundation slice: add deterministic random and condition-evaluator helpers before touching module adapters.
  中文：同体量纯基座方案是先补确定性随机与条件评估 helper，再进入模块适配器。

---

## 2026-05-16 Update: Food Delivery Event Preset Adapter

Status:

- EN: Food Delivery order-event behavior is now exposed through reusable presets and an adapter seam in `src/lib/simulation/adapters/food-delivery-events.js`.
  中文：外卖订单事件行为已通过 `src/lib/simulation/adapters/food-delivery-events.js` 暴露为可复用预设与适配器 seam。
- EN: The adapter keeps real order mutation inside `foodDeliveryStore.addOrderEvent(...)`.
  中文：适配器不接管订单状态，真实变更仍留在 `foodDeliveryStore.addOrderEvent(...)`。
- EN: Presets cover rider delay, restaurant cancellation, address change, ETA update, and status update.
  中文：预设已覆盖骑手延迟、商家取消、地址变更、ETA 更新与状态更新。
- EN: Validation passed: `npm test -- tests\food-delivery-event-adapter.test.js tests\food-delivery-store.test.js tests\food-delivery-view.test.js tests\chat-shopping-preview-routing.test.js`.
  中文：验证通过：`npm test -- tests\food-delivery-event-adapter.test.js tests\food-delivery-store.test.js tests\food-delivery-view.test.js tests\chat-shopping-preview-routing.test.js`。

Recommended next:

- EN: Add `simulationStore` for event logs, cooldown history, daily caps, and future Surprise Mode.
  中文：下一步建议新增 `simulationStore`，承载事件日志、冷却历史、每日上限与未来“惊喜模式”。
- EN: Alternative same-size slice: add deterministic random and condition-evaluator helpers before wiring them into the store.
  中文：同体量备选是先补确定性随机与条件评估 helper，再接入 store。

---

## 2026-05-16 Update: Simulation Event Foundation

Status:

- EN: `simulationStore` now persists event logs, cooldown history, daily caps, module enable flags, and Surprise Mode.
  中文：`simulationStore` 已持久化事件日志、冷却历史、每日上限、模块启用标记与“惊喜模式”。
- EN: Shared simulation helpers now cover deterministic random gates, weighted selection, condition evaluation, event template evaluation, cooldown/cap checks, adapter execution, and audit logs.
  中文：共享 simulation helper 已覆盖确定性随机门、权重选择、条件评估、事件模板评估、冷却/上限检查、适配器执行与审计日志。
- EN: Settings backup/import/rollback and storage diagnostics now include `store:simulation`.
  中文：Settings 备份、导入、回滚与存储诊断已纳入 `store:simulation`。
- EN: Food Delivery presets can run through the shared engine via `runFoodDeliveryOrderEventPreset(...)`.
  中文：外卖事件预设可通过 `runFoodDeliveryOrderEventPreset(...)` 走共享引擎执行。
- EN: Validation passed: `npm test -- tests\simulation-store.test.js tests\simulation-random.test.js tests\simulation-condition-evaluator.test.js tests\simulation-event-engine.test.js tests\food-delivery-event-adapter.test.js tests\food-delivery-store.test.js`.
  中文：验证通过：`npm test -- tests\simulation-store.test.js tests\simulation-random.test.js tests\simulation-condition-evaluator.test.js tests\simulation-event-engine.test.js tests\food-delivery-event-adapter.test.js tests\food-delivery-store.test.js`。

Recommended next:

- EN: Wire a guarded low-frequency Food Delivery random pilot for active orders, starting with ETA update or rider delay.
  中文：下一步建议给活跃外卖订单接入受保护的低频随机 pilot，优先从 ETA 更新或骑手延迟开始。
- EN: Alternative same-size slice: add Shopping/logistics event presets but keep them manual/test-only until the Food Delivery pilot proves stable.
  中文：同体量备选是新增 Shopping/物流事件预设，但先保持手动/测试态，等外卖 pilot 稳定后再开放运行时随机。

---

## 2026-05-16 Update: WorldBook-Aware Event Variant Standard

Status:

- EN: Standard requirement added in `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.
  中文：标准需求已新增到 `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`。
- EN: The standard defines `worldContext`, `eventVariant`, and `eventVariantPack` as the shared way to make events change by WorldBook/worldview.
  中文：该标准定义了 `worldContext`、`eventVariant`、`eventVariantPack`，作为事件随 WorldBook/世界观变化的统一方式。
- EN: Runtime random events should use local saved variants. API calls are reserved for generating or refreshing variant packs.
  中文：运行时随机事件应使用本地已保存变体。API 调用只保留给生成或刷新事件变体包。
- EN: Future adapters for Shopping, Logistics, Map, Phone, Gallery, Assets, Calendar, Wallet, and Chat should follow the same chain.
  中文：后续 Shopping、物流、地图、电话、相册、资产、日历、钱包、Chat 适配器都应遵守同一链路。

Recommended next:

- EN: After the Food Delivery random pilot, add a deterministic `worldContext` resolver from WorldBook bindings.
  中文：外卖随机 pilot 后，建议新增从 WorldBook 绑定解析 `worldContext` 的确定性 resolver。
- EN: Then add built-in `daily`, `sci_fi`, and `apocalypse` variants for Food Delivery ETA/rider-delay events.
  中文：随后为外卖 ETA/骑手延迟事件内置 `daily`、`sci_fi`、`apocalypse` 三类变体。

---

## 2026-05-16 Update: Food Delivery Random Pilot And World Variants

Status:

- EN: Food Delivery now has a guarded low-frequency random pilot for active orders.
  中文：Food Delivery 现在已有受保护的低频随机事件 pilot，可作用于进行中的外卖订单。
- EN: The pilot safe-list only includes non-destructive ETA update and rider delay events.
  中文：pilot 白名单只包含非破坏性的 ETA 更新与骑手延误事件。
- EN: The pilot checks module enable flags, pilot-level cooldown, pilot-level daily cap, and event-level cooldown/cap before mutating Food Delivery.
  中文：pilot 在变更外卖数据前会检查模块启用状态、pilot 级冷却、pilot 级每日上限，以及事件自身冷却/上限。
- EN: WorldBook/worldview now resolves into compact local `worldContext`, and Food Delivery ETA/rider-delay can select built-in `daily`, `sci_fi`, or `apocalypse` variants without API calls.
  中文：WorldBook/世界观现在可解析为紧凑的本地 `worldContext`，外卖 ETA/骑手延误可选择内置 `daily`、`sci_fi`、`apocalypse` 变体，运行时不调用 API。
- EN: Event logs now preserve `variantId`, `variantPackId`, `worldContextId`, and `activeWorldBookIds` for future explanation and debugging.
  中文：事件日志现在保留 `variantId`、`variantPackId`、`worldContextId`、`activeWorldBookIds`，便于后续解释与排查。
- EN: Validation passed: `npm test -- tests\simulation-world-context.test.js tests\simulation-event-variants.test.js tests\simulation-store.test.js tests\simulation-event-engine.test.js tests\food-delivery-event-adapter.test.js tests\food-delivery-view.test.js`.
  中文：验证通过：`npm test -- tests\simulation-world-context.test.js tests\simulation-event-variants.test.js tests\simulation-store.test.js tests\simulation-event-engine.test.js tests\food-delivery-event-adapter.test.js tests\food-delivery-view.test.js`。

Recommended next:

- EN: Add Shopping/logistics event presets using the same adapter seam, starting manual/test-only before runtime random triggers.
  中文：下一步建议为 Shopping/物流新增事件预设，并复用同一适配器 seam；先保持手动/测试态，再开放运行时随机触发。
- EN: Alternative same-size slice: add a session/scheduled event tick helper that calls existing pilots at low frequency and respects Surprise Mode.
  中文：同体量备选任务是新增会话/定时事件 tick helper，以低频调用已有 pilot，并遵守 Surprise Mode。

---

## 2026-05-16 Update: Shopping Logistics Event Presets

Status:

- EN: Shopping orders now persist structured logistics events in `order.events`.
  中文：Shopping 订单现在在 `order.events` 中持久化结构化物流事件。
- EN: `shoppingStore.addOrderEvent(...)` is the Shopping-owned write seam; adapters and views should not mutate logistics event arrays directly.
  中文：`shoppingStore.addOrderEvent(...)` 是由 Shopping 拥有的写入 seam；适配器和视图不应直接改物流事件数组。
- EN: `src/lib/simulation/adapters/shopping-logistics-events.js` adds reusable presets for package shipped, package arrived, pickup point changed, and international logistics delay.
  中文：`src/lib/simulation/adapters/shopping-logistics-events.js` 已新增可复用预设，覆盖发货、到达、取件点变更与国际物流延迟。
- EN: Shopping logistics panel and Chat Logistics service-account context now read the same latest Shopping order event.
  中文：Shopping 物流页和 Chat 物流服务号上下文现在读取同一条 Shopping 订单最新事件。
- EN: Shopping/logistics remains manual/condition-only; runtime random triggers are deferred.
  中文：Shopping/物流目前保持手动/条件触发，运行时随机触发后置。
- EN: Validation passed: `npm test -- tests\shopping-store.test.js tests\shopping-logistics-event-adapter.test.js tests\shopping-view.test.js tests\chat-shopping-preview-routing.test.js tests\simulation-event-engine.test.js tests\simulation-store.test.js`.
  中文：验证通过：`npm test -- tests\shopping-store.test.js tests\shopping-logistics-event-adapter.test.js tests\shopping-view.test.js tests\chat-shopping-preview-routing.test.js tests\simulation-event-engine.test.js tests\simulation-store.test.js`。

Recommended next:

- EN: Add a session/scheduled event tick helper that calls safe pilots at low frequency and respects Surprise Mode, module enable flags, cooldowns, and daily caps.
  中文：下一步建议新增会话/定时事件 tick helper，以低频调用安全 pilot，并遵守 Surprise Mode、模块开关、冷却与每日上限。
- EN: Keep the first runtime tick scope limited to Food Delivery ETA/rider-delay; Shopping/logistics random notices should wait for explanation/dismissal rules.
  中文：第一阶段运行时 tick 范围仍应限制在外卖 ETA/骑手延迟；Shopping/物流随机通知应等待解释/关闭规则明确后再开放。
- EN: Alternative same-size slice: add Map read-only delivery-address/pickup-point handoff from Shopping logistics events.
  中文：同体量备选任务：从 Shopping 物流事件向 Map 增加只读配送地址/取件点交接。

---

## 2026-05-16 Update: Session Event Tick Helper

Status:

- EN: `src/lib/simulation/event-tick-runner.js` now provides a deterministic session/scheduled tick helper.
  中文：`src/lib/simulation/event-tick-runner.js` 现在提供确定性的会话/定时 tick helper。
- EN: The helper checks Surprise Mode, tick-level cooldown, tick-level daily cap, and then calls only the existing safe Food Delivery random pilot.
  中文：该 helper 会先检查 Surprise Mode、tick 级冷却、tick 级每日上限，然后只调用现有安全的外卖随机 pilot。
- EN: Shopping/logistics random execution is still intentionally disabled.
  中文：Shopping/物流随机执行仍然刻意禁用。
- EN: The helper is library-only for now; it is not wired into automatic app lifecycle execution yet.
  中文：当前 helper 仍是纯 library，尚未接入自动应用生命周期执行。
- EN: Validation passed: `npm test -- tests\simulation-event-tick-runner.test.js tests\food-delivery-event-adapter.test.js tests\simulation-store.test.js tests\simulation-event-engine.test.js`.
  中文：验证通过：`npm test -- tests\simulation-event-tick-runner.test.js tests\food-delivery-event-adapter.test.js tests\simulation-store.test.js tests\simulation-event-engine.test.js`。

Recommended next:

- EN: Add one explicit low-risk caller for the tick helper, preferably a manual/developer-only Settings or Diagnostics action before any automatic background tick.
  中文：下一步建议为 tick helper 增加一个显式低风险调用方，优先放在手动/开发者用 Settings 或 Diagnostics 操作中，而不是立刻自动后台执行。
- EN: After manual diagnostics proves stable, add a guarded app-session foreground tick with long interval and user-facing explanation.
  中文：手动诊断稳定后，再考虑加入带长间隔和用户解释的前台会话 tick。
- EN: Alternative same-size slice: add Map read-only handoff for delivery locations before enabling automatic ticks.
  中文：同体量备选任务：在启用自动 tick 前，先补 Map 对配送位置的只读交接。

---

## 2026-05-17 Update: Manual Event Tick Diagnostics

Status:

- EN: Settings > About now exposes a manual Event Tick Diagnostics action.
  中文：Settings > About 现在提供手动 Event Tick Diagnostics 操作。
- EN: The action calls `runSimulationEventTick(...)`, writes a `simulation/run_event_tick` report, and displays the latest tick result.
  中文：该操作会调用 `runSimulationEventTick(...)`，写入 `simulation/run_event_tick` 报告，并显示最新 tick 结果。
- EN: Network reports now include a `simulation` module filter and labels for tick triggered/skipped results.
  中文：Network 报告现在包含 `simulation` 模块筛选项，并补充 tick 触发/跳过的标签。
- EN: Automatic app lifecycle/background execution remains disabled.
  中文：自动应用生命周期/后台执行仍保持关闭。
- EN: Validation passed: `npm test -- tests\settings-general-section.test.js tests\simulation-event-tick-runner.test.js tests\food-delivery-event-adapter.test.js`.
  中文：验证通过：`npm test -- tests\settings-general-section.test.js tests\simulation-event-tick-runner.test.js tests\food-delivery-event-adapter.test.js`。

Recommended next:

- EN: Add a readonly event-log explanation surface before enabling automatic foreground ticks.
  中文：下一步建议在启用自动前台 tick 前，先补一个只读事件日志解释界面。
- EN: Good first option: Settings/About recent simulation report summary or a small Simulation/Event Log panel.
  中文：优先选项：Settings/About 最近 simulation 报告摘要，或一个小型 Simulation/Event Log 面板。
- EN: Alternative same-size slice: Map read-only delivery-event handoff for Food Delivery and Shopping logistics locations.
  中文：同体量备选任务：为 Food Delivery 和 Shopping 物流位置增加 Map 只读交接。

---

## 2026-05-17 Update: Readonly Event Log Explanation Surface

Status:

- EN: Settings > About now includes a readonly recent simulation event-log panel.
  中文：Settings > About 现在包含只读的最近事件日志解释面板。
- EN: The panel explains event id, module, trigger source, status, reason, target, and world variant metadata in user-readable copy while preserving technical ids for debugging.
  中文：该面板会用可读文案解释事件 id、模块、触发来源、状态、原因、目标与世界观变体元数据，同时保留技术 id 便于排障。
- EN: It does not mutate module data and does not enable automatic foreground/background ticks.
  中文：该面板不修改任何模块数据，也不启用自动前台/后台 tick。
- EN: Validation target: `npm test -- tests\settings-general-section.test.js tests\simulation-event-tick-runner.test.js tests\food-delivery-event-adapter.test.js`.
  中文：验证目标：`npm test -- tests\settings-general-section.test.js tests\simulation-event-tick-runner.test.js tests\food-delivery-event-adapter.test.js`。

Recommended next:

- EN: Add a guarded foreground-session tick caller with a long interval, still limited to Food Delivery ETA/rider-delay safe-list events.
  中文：下一步建议加入受保护的前台会话 tick 调用方，保持较长间隔，并仍只允许外卖 ETA/骑手延迟安全事件。
- EN: Alternative same-size slice: add Map read-only handoff for Food Delivery and Shopping logistics event locations.
  中文：同体量备选任务：为 Food Delivery 和 Shopping 物流事件位置补 Map 只读交接。

---

## 2026-05-17 Update: Foreground Session Tick Controller Foundation

Status:

- EN: Added a guarded foreground-session tick controller library at `src/lib/simulation/foreground-session-tick.js`.
  中文：已在 `src/lib/simulation/foreground-session-tick.js` 新增受保护的前台会话 tick 控制器库。
- EN: The controller supports start/stop/execute/state and delegates real execution to `runSimulationEventTick(...)`.
  中文：控制器支持启动、停止、执行一次、读取状态，并将真实执行委托给 `runSimulationEventTick(...)`。
- EN: It enforces a 10-minute default interval and 1-minute minimum interval, but is not yet wired into app lifecycle.
  中文：它强制默认 10 分钟间隔和最小 1 分钟间隔，但尚未接入应用生命周期。
- EN: Validation target: `npm test -- tests\simulation-foreground-session-tick.test.js tests\simulation-event-tick-runner.test.js`.
  中文：验证目标：`npm test -- tests\simulation-foreground-session-tick.test.js tests\simulation-event-tick-runner.test.js`。

Recommended next:

- EN: Decide and wire an explicit user-facing control location before automatic ticks become active.
  中文：在自动 tick 真正生效前，先确定并接入显式用户控制位置。
- EN: Preferred options are Settings > Automation for real user control, or Settings > About diagnostics for developer-only pilot control.
  中文：优先选项是 Settings > Automation 作为真实用户控制，或 Settings > About diagnostics 作为开发/诊断 pilot 控制。

---

## 2026-05-17 Update: Map Readonly Delivery Event Handoff

Status:

- EN: `mapStore.buildDeliveryEventMapHandoff(...)` now builds readonly route/location context from Food Delivery order events and Shopping logistics events.
  中文：`mapStore.buildDeliveryEventMapHandoff(...)` 现在可从外卖订单事件和购物物流事件构建只读路线/位置上下文。
- EN: The handoff does not start a Map trip, does not write trip history, and does not move order ownership into Map.
  中文：该交接不会启动 Map 行程，不写入行程历史，也不会把订单所有权转移给 Map。
- EN: Validation target: `npm test -- tests\map-trip-baseline.test.js`.
  中文：验证目标：`npm test -- tests\map-trip-baseline.test.js`。

Recommended next:

- EN: Decide whether to expose a read-only "View route context" action in Food Delivery/Shopping now, or keep this store-only until the visual rebuild.
  中文：下一步建议决定现在是否在 Food Delivery/Shopping 展示只读“查看路线上下文”动作，或先保持 store-only 等待视觉重建。
- EN: Alternative same-size slice: wire the foreground-session tick controller into an explicit Settings control after the control location is chosen.
  中文：同体量备选任务：在控制位置确定后，把前台会话 tick 控制器接入显式 Settings 开关。

---

## 2026-05-17 Update: Optional Runtime Control / World Hub App

Status:

- EN: Optional Runtime Control / World Hub App baseline is landed.
  中文：可选运行控制 / 世界中枢基线已落地。
- EN: `control_center` is off by default, so Home does not show `app_control_center` for users who prefer free chat and normal module use.
  中文：`control_center` 默认关闭，因此偏好自由聊天和常规模块使用的用户不会在主屏看到 `app_control_center`。
- EN: Enabling the More toggle restores the World Hub entry on Home; disabling it removes the entry without changing other module tiles.
  中文：开启 More 开关会把世界中枢入口恢复到主屏；关闭会移除入口，且不影响其他模块图标。
- EN: `/control-center` currently provides a safe placeholder that explains the optional boundary.
  中文：`/control-center` 当前是安全占位页，用于解释可选边界。
- EN: Product decision reference: `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`.
  中文：产品决策参考 `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`。

Validation target:

- `npm test -- tests\system-widget-import.test.js tests\home-folder-entry.test.js tests\more-toggle-ui-consumption.test.js tests\app-icon-presentation.test.js tests\planned-module-registry.test.js`

Next recommended slice:

- EN: Connect `ControlCenterView.vue` to read-only `simulationStore` state: event-log count, recent event summaries, adapter enablement, Surprise Mode state, and world-variant pack status.
  中文：将 `ControlCenterView.vue` 接入只读 `simulationStore` 状态：事件日志数量、最近事件摘要、适配器启用状态、Surprise Mode 状态、世界观变体包状态。
- EN: Do not add mutation controls yet; prove the read-only boundary first.
  中文：暂不加入改写控件，先验证只读边界。
- EN: Alternative same-size slice: extract the Network provider-template/setup/preset display area into a small component without moving preset save/remove logic.
  中文：同体量备选切片是继续抽取 Network 供应商模板/配置向导/预设展示区，但不迁移预设保存/删除逻辑。

---

## 2026-05-17 Update: World Hub Readonly Simulation Runtime Panel

Status:

- EN: `ControlCenterView.vue` now reads `simulationStore` as a read-only runtime panel.
  中文：`ControlCenterView.vue` 现在以只读运行面板读取 `simulationStore`。
- EN: It displays Surprise Mode, event-log count, active cooldown count, recent status counts, module event enablement, recent logs, and world-variant metadata.
  中文：它展示 Surprise Mode、事件日志数量、活跃冷却数量、近期状态统计、模块事件启用状态、最近日志与世界观变体元数据。
- EN: Mounting the page does not trigger events and does not mutate module stores.
  中文：挂载该页面不会触发事件，也不会改写模块 store。
- EN: Validation passed: `npm test -- tests\control-center-view.test.js`.
  中文：验证通过：`npm test -- tests\control-center-view.test.js`。

Recommended next:

- EN: Wire the foreground-session tick controller into an explicit Settings > Automation control before any automatic event runtime is enabled.
  中文：在任何自动事件运行时真正启用前，把前台会话 tick 控制器接入 Settings > Automation 的显式控制。
- EN: Keep the first automatic runtime path limited to Food Delivery ETA/rider-delay safe-list events.
  中文：第一条自动运行时路径仍应限制在外卖 ETA/骑手延迟安全事件白名单内。
- EN: Alternative same-size slice: expose Map read-only delivery route context from Food Delivery/Shopping cards while keeping trip creation manual.
  中文：同体量备选：在 Food Delivery/Shopping 卡片中展示 Map 只读配送路线/位置上下文，同时保持行程创建为手动。

---

## 2026-05-17 Update: Settings Foreground Tick Control Baseline

Status:

- EN: Settings > Automation now exposes foreground event tick controls backed by `simulationStore`.
  中文：Settings > Automation 现在展示由 `simulationStore` 支撑的前台事件 tick 控制。
- EN: The controls persist `foregroundSessionTickEnabled` and `foregroundSessionTickIntervalMs`.
  中文：这些控件会持久化 `foregroundSessionTickEnabled` 与 `foregroundSessionTickIntervalMs`。
- EN: Toggling the control does not run events immediately and does not wire automatic lifecycle execution yet.
  中文：切换该控制不会立即运行事件，也尚未接入自动生命周期执行。
- EN: Validation passed: `npm test -- tests\simulation-store.test.js tests\settings-general-section.test.js tests\simulation-foreground-session-tick.test.js`.
  中文：验证通过：`npm test -- tests\simulation-store.test.js tests\settings-general-section.test.js tests\simulation-foreground-session-tick.test.js`。

Recommended next:

- EN: Wire the foreground-session tick controller into `App.vue` only when the persisted setting is enabled.
  中文：仅在持久化设置开启时，把前台会话 tick 控制器接入 `App.vue`。
- EN: Add visibility guards and audit reports for triggered/skipped ticks.
  中文：为触发/跳过的 tick 增加可见性保护与审计报告。
- EN: Keep automatic execution off by default and limited to Food Delivery ETA/rider-delay safe-list events.
  中文：自动执行默认仍关闭，并继续限制在外卖 ETA/骑手延迟安全事件白名单内。

---

## 2026-05-17 Update: App Lifecycle Foreground Tick Wiring

Status:

- EN: The foreground-session tick controller is now wired into `App.vue` through `src/lib/simulation/foreground-session-tick-lifecycle.js`.
  中文：前台会话 tick 控制器已通过 `src/lib/simulation/foreground-session-tick-lifecycle.js` 接入 `App.vue`。
- EN: Runtime execution is gated by Settings > Automation, route, lock state, and document visibility.
  中文：运行执行受 Settings > Automation、路由、锁屏状态和页面可见性共同保护。
- EN: Triggered/skipped ticks write `simulation/foreground_event_tick` diagnostics reports for auditability.
  中文：触发/跳过的 tick 会写入 `simulation/foreground_event_tick` 诊断报告，便于审计。
- EN: The first automatic path still delegates only to the safe Food Delivery ETA/rider-delay pilot.
  中文：第一条自动路径仍只委托给安全的外卖 ETA/骑手延迟 pilot。
- EN: Validation passed for lifecycle and Network label coverage.
  中文：生命周期与 Network 标签覆盖测试已通过。

Recommended next:

- EN: Product-visible next step: expose Map read-only delivery route context inside Food Delivery/Shopping cards.
  中文：产品可见的下一步：在 Food Delivery/Shopping 卡片中展示 Map 只读配送路线/位置上下文。
- EN: Architecture next step: keep adding future event adapters through `simulationStore -> shared event engine -> module-owned action`, not by putting random logic inside views.
  中文：架构下一步：未来事件适配器继续走 `simulationStore -> shared event engine -> module-owned action`，不要把随机逻辑塞进页面。
- EN: Alternative same-size slice: Wallet downstream expense suggestions from completed Shopping/Food Delivery orders.
  中文：同体量备选：从已完成购物/外卖订单生成 Wallet 下游消费建议。

---

## 2026-05-17 Update: Map Information Architecture Baseline

Status:

- EN: `MapView.vue` now uses a map-first primary screen instead of leading with a backend-style panel stack.
  中文：`MapView.vue` 现在使用地图优先的一级界面，不再以后台式面板堆栈作为首屏。
- EN: The primary layer contains a map canvas, current-location/search card, route summary card, and bottom navigation.
  中文：一级层包含地图画布、当前位置/搜索卡、路线摘要卡和底部导航。
- EN: Existing secondary tools remain available in an in-app drawer: trip controls, places/address book, exploration progress, and visual/layer settings.
  中文：现有二级工具仍保留在 app 内抽屉里：行程控制、地点/地址簿、探索进度、视觉/图层设置。
- EN: This is an information-architecture correction, not the final Google Maps visual rebuild.
  中文：这是信息架构修正，不是最终 Google Maps 视觉重建。
- EN: Validation passed: `npm test -- tests\map-view-information-architecture.test.js tests\map-worldbook-context.test.js tests\map-visual-picker.test.js tests\map-trip-baseline.test.js`.
  中文：验证通过：`npm test -- tests\map-view-information-architecture.test.js tests\map-worldbook-context.test.js tests\map-visual-picker.test.js tests\map-trip-baseline.test.js`。

Recommended next:

- EN: Continue with the product-visible handoff: expose Map read-only delivery route context inside Food Delivery/Shopping cards.
  中文：下一步继续产品可见交接：在 Food Delivery/Shopping 卡片中展示 Map 只读配送路线/位置上下文。
- EN: Keep full Map visual polish in the deferred visual rebuild track.
  中文：完整地图视觉精修继续放在后续视觉重建专项中。

---

## 2026-05-17 Update: Delivery Route Context UI Handoff

Status:

- EN: `DeliveryRouteContextCard.vue` now provides one shared read-only Map route-context card for delivery-like order events.
  中文：`DeliveryRouteContextCard.vue` 现在提供一套共享的只读 Map 路线上下文卡片，用于配送类订单事件。
- EN: `FoodDeliveryView.vue` renders this card inside each recent order event.
  中文：`FoodDeliveryView.vue` 会在最近订单事件内渲染该卡片。
- EN: `ShoppingView.vue` renders this card inside logistics order rows when a real logistics event exists.
  中文：`ShoppingView.vue` 会在存在真实物流事件时，在物流订单行内渲染该卡片。
- EN: Tests assert the visible context and confirm no Map trip starts and no trip history is written.
  中文：测试已断言上下文可见，并确认不会启动 Map 行程或写入行程历史。

Validation target:

- `npm test -- tests\food-delivery-view.test.js tests\shopping-view.test.js tests\map-trip-baseline.test.js`

Recommended next:

- EN: Add Wallet expense suggestions from completed Shopping/Food Delivery orders, keeping Wallet as an explicit-confirmation downstream ledger.
  中文：下一步建议从已完成的 Shopping/Food Delivery 订单生成 Wallet 消费建议，并保持 Wallet 为需要显式确认的下游账本。
- EN: Alternative same-size slice: add Chat service-account delivery/logistics push cards using the same order/event ids.
  中文：同体量备选任务：在 Chat 服务号里增加外卖/物流推送卡，并复用同一订单/事件 id。

---

## 2026-05-17 Update: Wallet Completed-Order Expense Suggestions

Status:

- EN: Wallet downstream expense suggestions now cover completed Shopping orders and delivered Food Delivery orders.
  中文：Wallet 下游消费建议现在覆盖已完成 Shopping 订单与已送达 Food Delivery 订单。
- EN: Shopping suggestions are hidden until the order is completed.
  中文：Shopping 消费建议会在订单完成前保持隐藏。
- EN: Food Delivery suggestions are hidden until the order is marked delivered.
  中文：Food Delivery 消费建议会在订单标记送达前保持隐藏。
- EN: Wallet has an `Orders` source filter and order-origin badges, so order expenses are no longer mixed into manual records.
  中文：Wallet 已新增 `Orders` 来源筛选与订单来源标识，订单消费不再混入手动流水。
- EN: Contacts Wallet ledger summaries now distinguish order-origin records, which prepares relationship/growth adapters to read spending facts safely.
  中文：Contacts 的 Wallet 账本摘要现在可区分订单来源记录，为后续关系/成长适配器安全读取消费事实做准备。

Validation:

- `npm test -- tests\wallet-store.test.js tests\contacts-wallet-ledger-context.test.js tests\shopping-view.test.js tests\food-delivery-view.test.js`

Recommended next:

- EN: Historical note: the Relationship Growth Event System baseline has since landed; use the 2026-05-17 Relationship Runtime Baseline update below as current status.
  中文：历史说明：关系成长事件系统基线现已落地；当前状态以下方 2026-05-17 关系运行时基线更新为准。
- EN: Next current slice is now the first safe relationship fact adapter from Wallet/Shopping or a World Hub read-only review surface.
  中文：当前下一步已变为 Wallet/Shopping 的第一个安全关系事实适配器，或 World Hub 只读审阅界面。

---

## 2026-05-17 Update: Relationship Runtime Baseline

Status:

- EN: Added `src/stores/relationshipRuntime.js` as the shared relationship/growth truth layer.
  中文：新增 `src/stores/relationshipRuntime.js`，作为共享关系/成长真值层。
- EN: The store persists relationship entities, metrics, stages, milestones, growth traits, event history, pending confirmations, and backup/restore snapshots.
  中文：该 store 可持久化关系实体、指标、阶段、里程碑、成长标签、事件历史、待确认事件与备份恢复快照。
- EN: Contacts now displays read-only relationship snapshots for role profiles.
  中文：Contacts 现在会为角色档案展示只读关系快照。
- EN: Chat prompt assembly now reads compact relationship runtime context for role conversations without making an extra API call.
  中文：Chat 提示词组装现在会读取角色会话的紧凑关系运行时上下文，且不额外调用 API。
- EN: Settings backup/import rollback and storage diagnostics include `store:relationship-runtime`.
  中文：Settings 备份、导入回滚和存储诊断现已纳入 `store:relationship-runtime`。

Validation:

- `npm test -- tests\relationship-runtime-store.test.js tests\contacts-wallet-ledger-context.test.js tests\chat-worldbook-binding-visibility.test.js`

Recommended next:

- EN: Add the first safe relationship fact adapter, preferably Wallet/Shopping gift or shared-expense facts.
  中文：下一步建议接入第一个安全关系事实适配器，优先 Wallet/Shopping 礼物或共同消费事实。
- EN: Keep module ownership intact: adapters submit facts through `recordRelationshipFact(...)`; they do not edit metrics directly.
  中文：保持模块所有权不变：适配器只通过 `recordRelationshipFact(...)` 提交事实，不直接编辑关系指标。
- EN: Alternative same-size slice: add World Hub read-only relationship runtime review before enabling value editing.
  中文：同体量备选任务：先做 World Hub 只读关系运行时审阅，再考虑开放数值编辑。

---

## 2026-05-17 Update: First Safe Relationship Fact Adapters

Status:

- EN: `src/lib/relationship-fact-adapters.js` now provides the first reusable adapter seam for relationship-relevant module facts.
  中文：`src/lib/relationship-fact-adapters.js` 现在提供第一批可复用的关系事实适配器入口。
- EN: Shopping completed gift orders can create a low-impact `gift_purchased` relationship fact when the user records the order into Wallet.
  中文：Shopping 已完成的赠礼订单在用户写入 Wallet 时，可同步生成低影响的 `gift_purchased` 关系事实。
- EN: Food Delivery delivered orders can optionally create a low-impact `shared_meal` relationship fact when the user selects a contact and records the order into Wallet.
  中文：Food Delivery 已送达订单在用户选择共餐联系人并写入 Wallet 时，可同步生成低影响的 `shared_meal` 关系事实。
- EN: Relationship runtime now supports source dedupe through `findEventBySource(sourceModule, sourceId)`.
  中文：Relationship runtime 现在支持通过 `findEventBySource(sourceModule, sourceId)` 按来源去重，避免重复导入叠加数值。
- EN: Shopping, Food Delivery, and Wallet keep their own ownership; adapters submit compact facts only.
  中文：Shopping、Food Delivery 与 Wallet 仍保留各自数据所有权；适配器只提交紧凑事实。

Validation:

- `npm test -- tests\relationship-runtime-store.test.js tests\relationship-fact-adapters.test.js tests\shopping-view.test.js tests\food-delivery-view.test.js`

Recommended next:

- EN: Add Phone completed/missed-call relationship facts and Map shared-route/check-in relationship facts.
  中文：下一步建议接入 Phone 已接/未接来电关系事实，以及 Map 共享路线/地点打卡关系事实。
- EN: Alternative same-size slice: add a World Hub read-only relationship review panel so PM/QA can inspect relationship events before value editing exists.
  中文：同体量备选任务：增加 World Hub 只读关系审阅面板，让 PM/QA 在开放数值编辑前先能检查关系事件。

---

## 2026-05-17 Update: World Hub Relationship Runtime Review

Status:

- EN: World Hub now includes a read-only Relationship Runtime panel.
  中文：World Hub 现在包含只读 Relationship Runtime 审阅面板。
- EN: The panel shows relationship entity count, event count, pending effect count, runtime switch, top entity snapshots, and recent relationship facts.
  中文：该面板展示关系实体数、事件数、待确认效果数、运行时开关、主要实体快照与最近关系事实。
- EN: Mounting World Hub remains non-mutating; it does not apply, dismiss, edit, or generate relationship events.
  中文：打开 World Hub 仍然不会改写数据；它不会应用、忽略、编辑或生成关系事件。

Validation:

- `npm test -- tests\control-center-view.test.js tests\relationship-runtime-store.test.js tests\relationship-fact-adapters.test.js`

Recommended next:

- EN: Add Phone completed/missed-call relationship facts and Map shared-route/check-in relationship facts.
  中文：下一步建议增加 Phone 已接/未接来电关系事实，以及 Map 共享路线/地点打卡关系事实。
- EN: Alternative same-size slice: add Wallet shared-expense/transfer relationship facts.
  中文：同体量备选任务：增加 Wallet 共同消费/转账关系事实。

---

## 2026-05-17 Update: Expanded Relationship Fact Adapter Batch

Status:

- EN: Phone completed/missed calls can now create low-impact relationship facts when the call is bound to an existing Chat contact.
  Chinese: Phone completed/missed calls can now create low-impact relationship facts when the call is bound to an existing Chat contact.
- EN: Map arrived trips can now create shared-route relationship facts when the user selects a companion before acknowledging arrival.
  Chinese: Map arrived trips can now create shared-route relationship facts when the user selects a companion before acknowledging arrival.
- EN: Wallet manual virtual transfers can now create wallet interaction relationship facts when bound to an existing Chat contact.
  Chinese: Wallet manual virtual transfers can now create wallet interaction relationship facts when bound to an existing Chat contact.
- EN: World Hub can now apply or dismiss `pending_confirmation` relationship events, while freeform value/funds/unlock editing remains deferred.
  Chinese: World Hub can now apply or dismiss `pending_confirmation` relationship events, while freeform value/funds/unlock editing remains deferred.
- EN: Validation passed: `npm test -- tests\relationship-fact-adapters.test.js tests\relationship-runtime-store.test.js tests\phone-store.test.js tests\phone-view.test.js tests\wallet-store.test.js tests\wallet-view.test.js tests\map-view-information-architecture.test.js tests\control-center-view.test.js`.
  Chinese: Targeted relationship, Phone, Wallet, Map, and World Hub tests passed.

Recommended next:

- EN: Add Calendar relationship facts for scheduled dates, anniversaries, missed plans, and recurring reminders.
  Chinese: Next, add Calendar relationship facts for scheduled dates, anniversaries, missed plans, and recurring reminders.
- EN: Tighten text/event-first relationship-memory dedupe, merge, and recall rules before adding new media-driven memory inputs.
  Chinese: 同体量下一步：在新增媒体驱动记忆入口前，先收紧文字/事件优先的关系记忆去重、归并与召回规则。
- EN: Keep high-impact romance/conflict automation deferred until world-aware event packs and World Hub review details are stronger.
  Chinese: Keep high-impact romance/conflict automation deferred until world-aware event packs and World Hub review details are stronger.

---

## 2026-05-05 Update: Food Delivery Custom Image Sources

Status:

- EN: Food Delivery now has user-created restaurant and menu item forms with shared URL/Gallery image-source controls.
  中文：Food Delivery 已新增用户自定义餐厅和菜单项表单，并复用共享 URL/Gallery 图片来源控件。
- EN: Restaurant cards and menu cards render configured image sources, including scoped Gallery preview URLs.
  中文：餐厅卡和菜单卡会渲染已配置的图片来源，包括有作用域的 Gallery 预览 URL。
- EN: Local file ownership remains in Gallery; Food Delivery stores only structured image-source metadata.
  中文：本地文件归属仍在 Gallery；Food Delivery 只保存结构化图片来源元数据。
- EN: Validation passed: `npm test -- tests\food-delivery-view.test.js tests\food-delivery-store.test.js`.
  中文：验证通过：`npm test -- tests\food-delivery-view.test.js tests\food-delivery-store.test.js`。

Recommended next:

- EN: Deepen Food Delivery status/exception message cards for rider delay, restaurant cancellation, address change, and ETA update.
  中文：下一步建议深化外卖状态/异常消息卡，覆盖骑手延迟、商家取消、改地址和预计送达变化。
- EN: Historical note: Wallet food-expense suggestions have since landed; use the latest 2026-05-17 Wallet completed-order update above as the current status.
  中文：历史说明：Wallet 外卖消费建议现已落地；当前状态以本文上方 2026-05-17 Wallet 完成订单更新为准。
