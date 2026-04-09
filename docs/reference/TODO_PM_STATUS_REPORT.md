# SchatPhone TODO PM Status Report / SchatPhone 待办状态（产品经理视角）
Updated / 更新时间: 2026-04-09
Source / 来源: `TODO_ROADMAP.md`

## 1. Why this report exists / 这份报告的用途
1. EN: This is the PM-readable mirror of the engineering TODO board.
   中文：这是工程待办看板的产品经理可读镜像。
2. EN: It explains what is done, what is next, why it matters, and what decisions are needed.
   中文：它说明“做到了什么、下一步做什么、为什么重要、需要你做什么决策”。

## 2. Current overall judgment / 当前整体判断
1. EN: Product direction is on track: immersive phone shell + chat-driven AI interaction.
   中文：项目方向保持正确：沉浸式手机壳层 + Chat 驱动 AI 互动。
2. EN: Core foundation is stable enough; storage/backup closure is completed for current scope.
   中文：核心基础已稳定；当前范围内的存储与备份收口已完成。
3. EN: `P0-1` to `P0-7` are now closed; immediate focus moves to P1 kickoff.
   中文：`P0-1` 至 `P0-7` 已全部收口；当前立即执行重点切换为 P1 启动阶段。

## 3. P0 status at a glance / P0 状态总览
1. `P0-1` AI 单条语义修订: `DONE`
2. `P0-2` Chat 一级页底部功能位: `DONE`
3. `P0-3` 头像层级 B: `DONE`
4. `P0-4` 用户富消息链路加固: `DONE`
5. `P0-5` 相册全局素材中心 v1: `DONE`
6. `P0-6` 角色绑定与素材复用: `DONE`
7. `P0-7` 存储与备份加固: `DONE`

## 4. What was completed recently / 最近完成了什么（你能感知到的）
1. EN: Chat supports richer user-send content lanes while keeping `Trigger Reply` as a dedicated AI trigger.
   中文：Chat 已支持更丰富的用户发送内容，同时保留 `Trigger Reply` 作为专用 AI 调用按钮。
2. EN: Role profile and chat-thread asset binding baseline is landed.
   中文：角色档案与会话素材绑定基线已落地。
3. EN: Global gallery assets can now be reused in chat flows with role-aware defaults.
   中文：全局相册素材已可在 chat 中复用，并能按角色上下文给出默认项。
4. EN: Backup now supports metadata-first export with optional asset package mode, and import reports partial package restore clearly.
   中文：备份现支持“元数据优先 + 可选素材包”导出，导入时可清晰报告素材包部分恢复结果。
5. EN: Import preflight now clearly distinguishes invalid JSON, unsupported schema version, and unsupported backup structure.
   中文：导入预检已可清晰区分 JSON 无效、版本过高、结构不支持三类问题。
6. EN: Chat rich-message forms now provide pre-submit validation hints and disabled-state submit controls.
   中文：Chat 富消息表单现已提供提交前校验提示与禁用态提交按钮。
7. EN: Chat `+` action grid now applies availability-state guards for gallery/location with disabled-state buttons and inline hints.
   中文：Chat `+` 动作网格现已对素材库/位置接入可用性守卫，提供禁用态按钮与内联提示文案。
8. EN: Message editing moved from browser prompt to in-chat modal editor (assistant semantic revision and restore path kept).
   中文：消息编辑已从浏览器 prompt 迁移为 Chat 内弹层编辑（并保留助手语义修订与恢复原文路径）。
9. EN: Chat top-level bottom dock baseline (`Prefs/Identity/Labs`) is online and routed.
   中文：Chat 一级页底部功能位基线（偏好/身份/实验室）已上线并可路由跳转。
10. EN: Added dedicated unit tests for message-edit validation rules to reduce regressions in later UI updates.
    中文：已补齐消息编辑校验规则的专项单测，降低后续 UI 更新时的回归风险。
11. EN: `preferences/labs` dock pages are now production-usable (batch preference apply + maintenance tools), closing `P0-2`.
    中文：`preferences/labs` 底部功能页已实装可用（偏好批量应用 + 运维工具），`P0-2` 已收口。
12. EN: Added component-level semantic-revision regression tests (open/edit/save/restore), closing `P0-1`.
    中文：已补齐语义修订组件级回归测试（打开/编辑/保存/恢复），`P0-1` 已收口。
13. EN: Added configurable semantic-revision trace policy (`silent` default, optional `meta_hint`) and edge-state success feedback, closing `P0-4`.
    中文：已加入可配置语义修订痕迹策略（默认 `silent`，可选 `meta_hint`）与边界成功提示，`P0-4` 已收口。
14. EN: Closed `P0-3/P0-6` by landing unified role-binding contract APIs, compatibility mapping, and contract checklist doc.
    中文：已通过统一角色绑定契约 API、兼容映射与契约清单文档完成 `P0-3/P0-6` 收口。
15. EN: `P0-5` export UX hardening pass is landed: mode summary, package limit hint, partial-package warning code, and export/import mutual exclusion.
    中文：`P0-5` 导出体验加固批次已落地：模式摘要、素材包上限提示、部分打包告警编码、导入导出互斥保护。
16. EN: `P0-5` closure is complete: backup copy style switch (`direct`/`immersive`) and diagnostics-center naming are now live.
    中文：`P0-5` 已完成最终收口：备份文案风格切换（`直白`/`沉浸`）与“诊断报告中心”命名已上线。
17. EN: Added regression tests for backup copy-tone default/restore/invalid fallback behavior.
    中文：新增备份文案风格默认值/恢复值/非法值回退的回归测试。

## 5. Immediate next task in plain language / 下一项待办（白话版）
### `P1` Kickoff (Preview) / `P1` 启动预览

What we are solving / 我们要解决什么:
1. EN: P0 closure is complete; next priority is adding immersive modules without breaking stable core paths.
   中文：P0 已收口；下一优先级是在不破坏稳定主链路的前提下扩展沉浸模块。
2. EN: New modules should reuse role/asset contracts and current storage/backup diagnostics.
   中文：新模块需复用现有角色/素材契约与存储/备份诊断体系。

What will be delivered / 本步交付什么:
1. EN: Kick off P1 item-1 (AI image-reference pipeline, provider-capability dependent).
   中文：启动 P1 第 1 项（AI 图生图参考链路，依赖供应商能力）。
2. EN: Preserve existing backup/reporting behavior while adding new immersive capabilities.
   中文：新增沉浸能力时保持现有备份与诊断行为稳定。
3. EN: Keep PM-facing wording bilingual and non-technical.
   中文：持续保持产品侧文档双语且非技术可读。

How you can review it / 你可以怎么验收:
1. EN: Verify P0 backup flows still pass in Settings/Network after P1 kickoff changes.
   中文：确认 P1 启动后，Settings/Network 的 P0 备份链路仍稳定。
2. EN: Verify new module changes do not break role-binding contract behavior.
   中文：确认新模块改动不破坏角色绑定契约行为。

## 6. Why this order is chosen / 为什么按这个顺序
1. EN: P0 export UX risks are now closed, so P1 can focus on feature depth.
   中文：P0 导出体验风险已关闭，P1 可以聚焦功能深度。
2. EN: Reusing existing contracts/persistence policies keeps delivery speed high and regression risk low.
   中文：复用既有契约与持久化策略可兼顾开发速度与回归风险控制。

## 7. PM decisions currently needed / 当前需要你拍板的点
1. EN: No blocking PM decision for P0 closure; current defaults are active (`direct` tone + metadata-first).
   中文：P0 收口无阻塞决策；当前默认策略已生效（`直白文案` + `元数据优先`）。
2. EN: For P1, prioritize module order (image-reference vs mini-scene vs cross-module role reuse).
   中文：P1 需拍板模块优先顺序（图生图参考链路 / 互动小剧场 / 跨模块角色复用）。

## 8. Risk watch (PM version) / 风险提醒（产品经理版）
1. EN: If TODO docs are not updated per commit, team alignment will drift quickly.
   中文：若每次提交不同步 TODO，协作口径会很快漂移。
2. EN: If backup strategy explanation is weak, users may think data is “auto-safe” and skip backup.
   中文：若备份说明不清，用户会误以为数据“自动绝对安全”，从而不做备份。
3. EN: If new modules bypass current role/storage contracts, future maintenance cost will rise sharply.
   中文：若新模块绕过现有角色/存储契约，后续维护成本会明显上升。

## 9. Next after current phase (preview only) / 当前阶段之后（预告）
1. EN: Start P1 immersive modules in staged order with strict reuse of existing contracts.
   中文：按阶段启动 P1 沉浸模块，并严格复用既有契约。
2. EN: Keep diagnostics readability and backup reliability as non-regression baseline.
   中文：将“诊断可读性 + 备份可靠性”作为不可回退基线。

## 10. Change log / 变更记录
1. 2026-04-07 EN: Rewrote from short summary into detailed PM-level execution report.
   2026-04-07 中文：从简版摘要重写为详细的产品经理执行报告。
2. 2026-04-07 EN: Synced with latest role-asset binding progress and storage-closure priority.
   2026-04-07 中文：已同步最新角色素材绑定进度与存储收口优先级。
3. 2026-04-07 EN: Updated status to `P0-7 DONE`, and switched immediate focus to `P0-4`.
   2026-04-07 中文：将状态更新为 `P0-7 DONE`，并把当前主任务切换为 `P0-4`。
4. 2026-04-07 EN: Synced `P0-4` progress with action-grid availability closure (gallery/location) and full lint/test/build pass.
   2026-04-07 中文：同步 `P0-4` 最新进展：完成素材库/位置动作网格可用性收口，并通过 lint/test/build 全量验证。
5. 2026-04-07 EN: Synced progress for in-chat message edit modal and updated `P0-1/P0-2` to `PARTIAL_DONE`.
   2026-04-07 中文：同步 Chat 内消息编辑弹层进度，并将 `P0-1/P0-2` 更新为 `PARTIAL_DONE`。
6. 2026-04-07 EN: Added `chat-message-edit` helper tests and passed lint/test/build full gate.
   2026-04-07 中文：新增 `chat-message-edit` 辅助测试并通过 lint/test/build 全量闸门。
7. 2026-04-08 EN: Upgraded chat dock `preferences/labs` from placeholders to production-usable tools and closed `P0-2`.
   2026-04-08 中文：将 Chat 底部 `preferences/labs` 从占位页升级为可用工具，并完成 `P0-2` 收口。
8. 2026-04-09 EN: Closed `P0-1` with component-level semantic revision flow tests.
   2026-04-09 中文：通过组件级语义修订流程测试完成 `P0-1` 收口。
9. 2026-04-09 EN: Closed `P0-4` with edge-state messaging polish and revision-trace policy.
   2026-04-09 中文：通过边界状态提示打磨与修订痕迹策略完成 `P0-4` 收口。
10. 2026-04-09 EN: Closed `P0-3/P0-6` with unified role-binding contract API + checklist documentation.
    2026-04-09 中文：通过统一角色绑定契约 API 与接入清单文档完成 `P0-3/P0-6` 收口。
11. 2026-04-09 EN: Closed `P0-5` with backup copy-tone switch, diagnostics-center naming, and regression tests.
    2026-04-09 中文：通过备份文案风格切换、诊断中心命名统一与回归测试完成 `P0-5` 收口。
