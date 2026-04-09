# SchatPhone TODO Roadmap / SchatPhone 动态待办清单
Updated / 更新时间: 2026-04-09

## 0. Read First / 阅读顺序
1. EN: This file is the live execution board for implementation order.
   中文：本文件是实现顺序的动态执行看板。
2. EN: For product context, read `PROJECT_MASTER_GUIDE.md` first, then return here.
   中文：先读 `PROJECT_MASTER_GUIDE.md` 了解全局，再回到本文件执行。
3. EN: If any old document conflicts with this file, this file wins.
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

---

## 4. Next Up (Immediate) / 下一项待办（立即执行）

### P1 Kickoff Preview / P1 启动预览
Status / 状态: `TODO`
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
   - `docs/reference/ROLE_BINDING_CONTRACT.md`
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
1. EN: AI image-reference pipeline (provider capability dependent).
   中文：AI 图生图参考链路（依赖供应商能力）。
2. EN: Scenario cards and interactive mini-scenes.
   中文：场景卡片与互动小剧场扩展。
3. EN: Cross-module role/asset identity reuse.
   中文：跨模块角色/素材身份复用。

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
