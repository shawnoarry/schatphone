# SchatPhone TODO Roadmap / SchatPhone 动态待办清单
Updated / 更新时间: 2026-04-07

## 0. Read First / 阅读顺序
1. EN: This file is the live execution board for implementation order.
   中文：本文件是实现顺序的动态执行看板。
2. EN: For product context, read `PROJECT_MASTER_GUIDE.md` first, then return here.
   中文：先读 `PROJECT_MASTER_GUIDE.md` 了解全局，再回到本文件执行。
3. EN: If any old document conflicts with this file, this file wins.
   中文：若旧文档与本文件冲突，以本文件为准。

## 0.5 AI Quick Start (10 min) / AI 接手速览（10分钟）
1. EN: Target task now is `P0-4` (chat rich-message lane hardening).
   中文：当前目标任务是 `P0-4`（聊天富消息链路加固）。
2. EN: Start from these files first:
   中文：先从这些文件开始阅读与改动：
   - `src/views/ChatView.vue`
   - `src/stores/chat.js`
   - `src/views/ChatDirectoryView.vue`
   - `src/views/GalleryView.vue`
   - `src/views/SettingsView.vue`
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
4. EN: Storage/backup closure has entered completed state; current main focus returns to chat rich-message consistency.
   中文：存储与备份收口已进入完成态，当前主焦点回到聊天富消息一致性。

---

## 4. Next Up (Immediate) / 下一项待办（立即执行）

### P0-4 User Rich Message Lane Hardening / P0-4 用户富消息链路加固
Status / 状态: `IN_PROGRESS`
Priority / 优先级: `Highest now / 当前最高`

#### 4.1 Problem Statement / 问题定义
1. EN: Link/transfer/voice-card forms should behave consistently before submit (validation, disabled state, hint language).
   中文：链接/转账/语音卡片表单在提交前需要统一行为（校验、禁用态、提示文案）。
2. EN: Current rich-message lane still has scattered failure behavior and needs stronger UX consistency.
   中文：当前富消息发送仍有分散失败态，需要进一步统一体验。
3. EN: `Trigger Reply` must remain independent and unaffected.
   中文：`Trigger Reply` 必须保持独立，不受影响。

#### 4.2 Scope / 本轮范围
1. EN: Front-load validation for link/transfer/voice-card forms with shared rule source.
   中文：为链接/转账/语音卡片前置校验，并统一规则来源。
2. EN: Add disabled-state submit buttons and inline hint text in `+` panel forms.
   中文：在 `+` 面板表单加入提交按钮禁用态与内联提示文案。
3. EN: Keep click-time error feedback as fallback path (defensive UX).
   中文：保留点击时错误提示作为兜底（防御式体验）。
4. EN: Ensure no regression for media send, gallery send, and manual AI trigger lane.
   中文：确保媒体发送、素材库发送与手动 AI 触发通道无回归。

#### 4.3 Out of Scope (This Step) / 本步不做
1. EN: New rich-message types beyond current baseline.
   中文：不新增当前基线以外的新富消息类型。
2. EN: Major visual redesign of chat shell.
   中文：不做 Chat 壳层的大改版视觉重构。
3. EN: Cross-module social expansion.
   中文：不推进跨模块社交扩展。

#### 4.4 Execution Breakdown / 执行拆分
1. `P0-4.A` EN: Shared validation state for link/transfer/voice-card forms.
   `P0-4.A` 中文：为链接/转账/语音卡片建立共享校验状态。
2. `P0-4.B` EN: Button disabled-state + inline hint integration in template.
   `P0-4.B` 中文：模板层接入按钮禁用态与内联提示。
3. `P0-4.C` EN: Submit handler alignment with validation state.
   `P0-4.C` 中文：提交处理函数与校验状态对齐。
4. `P0-4.D` EN: Regression verification + docs sync.
   `P0-4.D` 中文：回归验证并同步文档。

#### 4.5 Acceptance Criteria / 验收标准
1. EN: Invalid form input is visible before submit.
   中文：无效输入在提交前就可见。
2. EN: Submit button remains disabled until payload is valid.
   中文：提交按钮在输入有效前保持禁用。
3. EN: Click-time fallback error still works.
   中文：点击时兜底错误提示仍正常生效。
4. EN: `Trigger Reply` lane behavior remains unchanged.
   中文：`Trigger Reply` 通道行为保持不变。
5. EN: Test/build/lint all pass after integration.
   中文：集成后测试/构建/lint 全通过。

#### 4.6 Regression Checklist / 回归清单
1. EN: Link card send works with valid URL and remains blocked with invalid URL.
   中文：链接卡片在 URL 有效时可发送，URL 无效时被阻止。
2. EN: Transfer card send works with valid amount/currency and blocks malformed payload.
   中文：转账卡片在金额/币种有效时可发送，格式错误时被阻止。
3. EN: Voice card requires transcript and valid duration.
   中文：语音卡片要求文本内容与有效时长。
4. EN: Gallery/image/gif/location sends are unaffected.
   中文：素材库/图片/gif/位置发送不受影响。

---

## 5. P0 Board / P0 任务看板（细化版）

### P0-1 AI Single-Message Semantic Revision / AI 单条语义修订
Status / 状态: `PARTIAL_DONE`

Done / 已完成:
1. EN: Assistant message semantic revision is available from message actions (without full reroll).
   中文：助手消息已支持从消息动作入口进行语义修订（不需要整轮重 roll）。
2. EN: Revised text is persisted into message context and reused in later calls.
   中文：修订文本会写入消息上下文，并在后续调用中继续使用。
3. EN: Rollback path is available via `Restore original`.
   中文：可通过 `恢复原文` 执行回滚。
4. EN: Edit UX moved from browser prompt to in-chat modal editor for better immersion.
   中文：编辑交互已从浏览器 `prompt` 改为 Chat 内弹层编辑，沉浸感更好。

Remaining / 剩余:
1. EN: Add dedicated tests for semantic-revision UI flow (open/edit/save/restore).
   中文：补齐语义修订 UI 流程（打开/编辑/保存/恢复）的专门测试。
2. EN: Add optional change-log annotation policy for future traceability (if PM requires).
   中文：按需补充“修订痕迹策略”（若产品需要可追溯标记）。

---

### P0-2 Chat Top-Level Bottom Dock / Chat 一级页底部功能位
Status / 状态: `PARTIAL_DONE`

Done / 已完成:
1. EN: `/chat` list page now has fixed bottom dock entries (`Prefs` / `Identity` / `Labs`).
   中文：`/chat` 一级列表页已提供固定底部入口（`偏好` / `身份` / `实验室`）。
2. EN: Dock routes to real pages (`/chat-feature/:feature`) and keeps chat thread entry unchanged.
   中文：底部入口已路由到真实页面（`/chat-feature/:feature`），且不影响会话进入主流程。

Remaining / 剩余:
1. EN: Replace placeholder feature pages with production-grade module pages in later phase.
   中文：后续阶段将占位页替换为正式模块页。

---

### P0-3 Avatar Hierarchy B / 头像层级 B（会话 > 模块 > 全局 > 兜底）
Status / 状态: `PARTIAL_DONE`

Done / 已完成:
1. EN: Shared resolver baseline landed.
   中文：统一解析器基线已落地。
2. EN: Module-level override entry available.
   中文：模块级覆写入口已可用。
3. EN: Thread-level self/contact override available.
   中文：会话级自己/对方覆写已可配。

Remaining / 剩余:
1. EN: Cross-module consumption contracts (forum/map future reuse).
   中文：跨模块消费契约（论坛/地图后续复用）。
2. EN: Edge-case UX validation (missing avatar fallback consistency).
   中文：边界体验验收（缺失头像兜底一致性）。

---

### P0-4 User Rich Message Lane Hardening / 用户富消息链路加固
Status / 状态: `IN_PROGRESS`

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

Remaining / 剩余:
1. EN: Continue consistency polish for remaining rich-message interactions (focus on edge-state messaging clarity).
   中文：继续补齐其余富消息交互的一致性打磨（重点是边界状态提示清晰度）。
2. EN: Add dedicated regression checks for in-chat edit modal and semantic-revision restore flow.
   中文：补齐 Chat 内编辑弹层与语义修订恢复流程的专项回归检查。

---

### P0-5 Gallery Global Asset Center v1 / 相册全局素材中心 v1
Status / 状态: `PARTIAL_DONE`

Done / 已完成:
1. EN: Unified gallery store with asset categories.
   中文：统一素材 store 与分类体系已上线。
2. EN: Local + URL import with dedupe checks.
   中文：本地 + URL 导入与去重校验已上线。
3. EN: Safe delete path with usage guard.
   中文：使用守卫 + 安全删除路径已上线。
4. EN: Backup metadata wiring and chat consumption wiring completed.
   中文：备份元数据接线与 Chat 消费接线已完成。

Remaining / 剩余:
1. EN: Finalize export UX for metadata-first + optional asset package.
   中文：完成“元数据优先 + 可选素材包”导出体验收口。

---

### P0-6 Role Binding and Asset Reuse / 角色绑定与素材复用
Status / 状态: `PARTIAL_DONE`

Done / 已完成:
1. EN: `/contacts` role profile supports asset-pack binding.
   中文：`/contacts` 角色档案支持素材包绑定。
2. EN: Chat directory supports thread-level preferred asset override.
   中文：会话通讯录支持会话级优先素材覆盖。
3. EN: Chat asset selection uses role-binding context.
   中文：Chat 素材选择已接入角色绑定上下文。

Remaining / 剩余:
1. EN: Reuse contract for future modules (forum/map/scenario modules).
   中文：后续模块（论坛/地图/场景模块）复用契约待补齐。
2. EN: Unified cross-module acceptance list.
   中文：跨模块统一验收清单待补齐。

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
3. EN: Cross-module divergence if binding contracts are not fixed early.
   中文：若绑定契约不提前固定，跨模块实现会逐步失配。
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
10. EN: `P0-1` and `P0-2` are now tracked as `PARTIAL_DONE` based on landed baseline features.
    中文：基于已落地基线功能，`P0-1` 与 `P0-2` 状态已更新为 `PARTIAL_DONE`。
11. EN: Added dedicated unit tests for chat message-edit validation helper to reduce regression risk in future UI refactors.
    中文：已为聊天消息编辑校验辅助函数新增专项单测，降低后续 UI 重构回归风险。

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
