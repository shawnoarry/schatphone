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
1. EN: Target task now is `P0-7` (storage and backup hardening).
   中文：当前目标任务是 `P0-7`（存储与备份加固）。
2. EN: Start from these files first:
   中文：先从这些文件开始阅读与改动：
   - `src/lib/persistence.js`
   - `src/lib/asset-binary-storage.js`
   - `src/stores/gallery.js`
   - `src/views/SettingsView.vue`
   - `src/views/NetworkView.vue`
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
4. EN: Current main risk shifted to storage/backup closure for media-heavy usage.
   中文：当前主风险已转为“素材重场景下的存储与备份收口”。

---

## 4. Next Up (Immediate) / 下一项待办（立即执行）

### P0-7 Storage and Backup Hardening / P0-7 存储与备份加固
Status / 状态: `IN_PROGRESS`
Priority / 优先级: `Highest now / 当前最高`

#### 4.1 Problem Statement / 问题定义
1. EN: Rich assets are now used across chat/contacts/gallery, but long-term storage safety needs final closure.
   中文：素材已在 chat/通讯录/相册跨模块使用，但长期存储安全仍需最终收口。
2. EN: Users can clear browser cache unexpectedly; backup strategy must remain understandable and reliable.
   中文：用户可能清理浏览器缓存，备份策略必须对小白可理解且可靠。
3. EN: Import/restore failures must be transparent and rollback-safe.
   中文：导入/恢复失败必须可见、可解释、可回滚。

#### 4.2 Scope / 本轮范围
1. EN: Asset binary persistence path hardening (IndexedDB-first, with compatibility fallback).
   中文：素材二进制持久化收口（IndexedDB 主路径，兼容回退）。
2. EN: Metadata-first export plus optional asset package strategy clarification.
   中文：明确“元数据优先导出 + 可选素材包”策略。
3. EN: Restore diagnostics and error history traceability.
   中文：恢复流程诊断与报错历史可追踪。
4. EN: Regression-proofing for current backup/restore flows already in settings.
   中文：为现有 Settings 备份/恢复流程补齐回归保障。

#### 4.3 Out of Scope (This Step) / 本步不做
1. EN: New social modules (forum/map deep integration).
   中文：论坛/地图等新社交模块深度接线。
2. EN: AI image generation feature expansion.
   中文：AI 生图功能扩展。
3. EN: UX redesign of unrelated settings sections.
   中文：与存储无关的设置页 UI 重构。

#### 4.4 Execution Breakdown / 执行拆分
1. `P0-7.A` EN: Validate current binary storage path and enforce IndexedDB-first writes.
   `P0-7.A` 中文：验证当前二进制写入路径并强制 IndexedDB 优先。
2. `P0-7.B` EN: Define export format contract (metadata required, assets optional package).
   `P0-7.B` 中文：定义导出格式契约（元数据必备，素材包可选）。
3. `P0-7.C` EN: Improve restore error taxonomy and store-readable diagnostics.
   `P0-7.C` 中文：完善恢复错误分型与可读诊断记录。
4. `P0-7.D` EN: Add migration guards for old backups and partial import failures.
   `P0-7.D` 中文：为旧版备份与部分导入失败增加迁移守卫。
5. `P0-7.E` EN: Add tests and run lint/test/build full gate before close.
   `P0-7.E` 中文：补测试并执行 lint/test/build 全量闸门后收口。

#### 4.5 Acceptance Criteria / 验收标准
1. EN: Binary asset writes no longer rely on localStorage-heavy payload paths.
   中文：素材二进制写入不再依赖 localStorage 大载荷路径。
2. EN: Export can always produce metadata backup, regardless of binary package choice.
   中文：无论是否导出素材包，都能稳定导出元数据备份。
3. EN: Import/restore failures provide readable reason + recovery suggestion.
   中文：导入/恢复失败提供可读原因与恢复建议。
4. EN: Restore flow is rollback-safe and does not silently corrupt state.
   中文：恢复流程具备回滚保障，不会静默污染状态。
5. EN: Test/build/lint all pass after integration.
   中文：集成后测试/构建/lint 全通过。

#### 4.6 Regression Checklist / 回归清单
1. EN: Chat thread messages remain readable after restore.
   中文：恢复后 Chat 会话消息可正常读取。
2. EN: Role profile bindings still resolve in chat directory and thread.
   中文：恢复后角色绑定在会话通讯录和会话页仍可正确解析。
3. EN: Gallery assets remain selectable from chat `+` panel.
   中文：恢复后 chat `+` 面板仍可选用相册素材。
4. EN: Settings backup reminder and report center still function.
   中文：恢复后设置中的备份提醒和报告中心仍可用。

---

## 5. P0 Board / P0 任务看板（细化版）

### P0-1 AI Single-Message Semantic Revision / AI 单条语义修订
Status / 状态: `TODO`

Goal / 目标:
1. EN: Let users revise one assistant message without full reroll.
   中文：允许用户只修订单条 AI 回复，不做整轮重 roll。
2. EN: Revised text becomes default context in later calls.
   中文：修订文本进入后续调用默认上下文。
3. EN: Non-text media stays unless user explicitly asks regeneration.
   中文：非文本媒体默认保留，除非用户主动要求重生成。

Implementation Notes / 实现要点:
1. EN: Extend edit entry from user messages to assistant messages.
   中文：将编辑入口从用户消息扩展到助手消息。
2. EN: Add rollback-to-original safety path.
   中文：提供恢复原文兜底路径。
3. EN: Keep immersion (no persistent “revised” badge noise).
   中文：保持沉浸（不常驻“已修订”标签）。

Exit Criteria / 退出条件:
1. EN: Assistant message edit works end-to-end.
   中文：助手消息编辑链路完整可用。
2. EN: Context consumes revised text by default.
   中文：上下文默认消费修订文本。

---

### P0-2 Chat Top-Level Bottom Dock / Chat 一级页底部功能位
Status / 状态: `TODO`

Goal / 目标:
1. EN: Add at least 3 fixed expansion entries on `/chat` list page.
   中文：在 `/chat` 一级列表页提供至少 3 个固定扩展入口。
2. EN: Keep current conversation-entry behavior unchanged.
   中文：不破坏现有会话进入主路径。

Implementation Notes / 实现要点:
1. EN: First iteration can route to placeholder pages, but routes must be real.
   中文：首版可接占位页，但路由必须真实可达。
2. EN: Dock is only shown in chat top-level list, not thread view.
   中文：功能位仅在 Chat 一级列表展示，不进入会话页。

Exit Criteria / 退出条件:
1. EN: Buttons always visible on `/chat`.
   中文：`/chat` 页按钮持续可见。
2. EN: No regression in opening chat threads.
   中文：进入会话流程无回归。

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

Remaining / 剩余:
1. EN: Validation and failure-state consistency polish.
   中文：输入校验与失败态一致性打磨。
2. EN: Align edit behavior with P0-1 semantic revision model.
   中文：编辑行为与 P0-1 语义修订模型对齐。

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
Status / 状态: `IN_PROGRESS`

Current / 当前:
1. EN: Layered persistence baseline and diagnostics are available.
   中文：分层持久化基线与诊断能力已可用。
2. EN: Backup restore has rollback-safe baseline.
   中文：备份恢复已具备回滚基线。

Focus / 聚焦:
1. EN: Binary path closure + export/import policy closure.
   中文：二进制路径收口 + 导入导出策略收口。

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

---

## 9. Change Log / 变更记录
1. 2026-04-07 EN: Replaced compressed TODO with detailed execution-grade bilingual board.
   2026-04-07 中文：将过度简化版 TODO 重写为“可执行细纲双语版”。
2. 2026-04-07 EN: Explicitly set `P0-7` as immediate next task with subtask breakdown.
   2026-04-07 中文：明确 `P0-7` 为下一项待办，并给出子任务拆分。
3. 2026-04-07 EN: Updated `P0-6` to `PARTIAL_DONE` and captured remaining closure points.
   2026-04-07 中文：将 `P0-6` 更新为 `PARTIAL_DONE`，并记录剩余收口点。
