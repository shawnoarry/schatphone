# SchatPhone TODO PM Status Report / SchatPhone 待办状态（产品经理视角）
Updated / 更新时间: 2026-04-10
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
3. EN: `P0-1` to `P0-7` are closed; current active work is `P1-1` AI image-reference pipeline phase-2+ hardening.
   中文：`P0-1` 至 `P0-7` 已收口；当前进入 `P1-1` AI 参考图链路第二阶段+加固。

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
18. EN: Added thread-level image-reference mode switch in chat settings (`auto/context_only/native_url`) with persisted AI prefs.
    中文：在聊天会话设置中新增参考图模式开关（`auto/context_only/native_url`），并接入 AI 偏好持久化。
19. EN: Local gallery file assets can now be converted to data URLs for same-call AI references, with automatic text-only downgrade on size overflow.
    中文：本地相册文件素材现可转为 data URL 参与同轮 AI 参考图调用，超限会自动降级为文字线索。
20. EN: Assistant message metadata now records image-reference execution result (`mode/count/fallback/provider`) and shows compact hints in thread.
    中文：助手消息元信息现可记录参考图执行结果（`模式/数量/回退/供应商`），并在会话内展示精简提示。
21. EN: PM has now locked global asset hub requirements for next phase (custom folders, slot binding, delete/replace confirmation, module fallback defaults, one-off upload optional import).
    中文：产品侧已冻结下一阶段素材中台需求（自定义文件夹、槽位绑定、删除/替换确认、模块默认回退、单次上传可选入库）。

## 5. Immediate next task in plain language / 下一项待办（白话版）
### `P1-1` AI Image-Reference Pipeline / `P1-1` AI 参考图链路

What we are solving / 我们要解决什么:
1. EN: We need image-reference support for AI replies while keeping one-call flow and broad provider compatibility.
   中文：需要在保持“一次调用”体验的前提下，为 AI 回复加入参考图能力并兼容不同供应商。
2. EN: Native multimodal support differs by provider, so fallback behavior and user mode controls must stay explicit.
   中文：不同供应商的原生多模态支持差异大，因此回退策略与用户模式控制都必须明确。

What will be delivered / 本步交付什么:
1. EN: Phase-1 landed: chat extracts recent user image blocks as references and sends them in the same AI call.
   中文：第一阶段已落地：Chat 会提取近期用户图片消息作为参考图，并在同一轮 AI 调用中发送。
2. EN: OpenAI-compatible path now attempts native URL image transport, then auto-falls back to context-only mode on unsupported status.
   中文：OpenAI 兼容路径会先尝试原生 URL 图输入，若不支持会自动回退到“上下文参考图”模式。
3. EN: Thread-level image-reference mode is configurable in chat settings (`auto/context_only/native_url`).
   中文：会话内已支持参考图模式配置（`auto/context_only/native_url`）。
4. EN: Added helper tests for reference normalization/capability resolution/context text generation.
   中文：已补齐参考图归一化、能力判定、上下文文本生成的辅助函数测试。
5. EN: Local file references now have a production path: convert image blob -> data URL under size guard -> include in one call when possible.
   中文：本地文件参考图现已有生产路径：图片 blob ->（大小守卫）-> data URL -> 条件满足时进入同轮调用。
6. EN: Reference execution outcome is written into assistant metadata and surfaced as lightweight in-thread hints.
   中文：参考图执行结果会写入助手元信息，并在会话中以轻量提示展示。
7. EN: Next delivery block is asset hub V2 execution: custom folder model + slot binding + fallback defaults + safe delete/replace + optional gallery import prompt for one-off uploads.
   中文：下一交付块为素材中台 V2 执行：自定义文件夹模型 + 槽位绑定 + 默认回退 + 安全删除/替换 + 单次上传可选入库弹窗。

How you can review it / 你可以怎么验收:
1. EN: Verify replies still work with and without image references in manual trigger/reroll paths.
   中文：确认手动触发与重 roll 场景下，“有参考图/无参考图”都能稳定回复。
2. EN: Verify provider fallback works (native attempt -> context-only) without extra user action.
   中文：确认供应商回退链路（原生尝试 -> 上下文回退）可自动完成，不需要用户额外操作。

## 6. Why this order is chosen / 为什么按这个顺序
1. EN: P0 export UX risks are now closed, so P1 can focus on feature depth.
   中文：P0 导出体验风险已关闭，P1 可以聚焦功能深度。
2. EN: Reusing existing contracts/persistence policies keeps delivery speed high and regression risk low.
   中文：复用既有契约与持久化策略可兼顾开发速度与回归风险控制。

## 7. PM decisions currently needed / 当前需要你拍板的点
1. EN: Confirm default recommendation copy for reference-mode switch (`auto` currently recommended).
   中文：确认参考图模式开关的默认推荐文案（当前推荐 `auto`）。
2. EN: Confirm rollout order between `P1-2` asset hub execution and scenario-card expansion (`P1-3`).
   中文：确认 `P1-2` 素材中台执行与 `P1-3` 场景卡片扩展的上线顺序。

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
12. 2026-04-10 EN: Started `P1-1` phase-1 by landing provider-aware image-reference transport + fallback and helper tests.
    2026-04-10 中文：通过落地“按供应商能力的参考图传输 + 回退”与辅助测试，启动 `P1-1` 第一阶段。
13. 2026-04-10 EN: Added thread-level reference-mode control and persisted it in conversation AI preferences.
    2026-04-10 中文：新增会话级参考图模式控制，并接入会话 AI 偏好持久化。
14. 2026-04-10 EN: Added local file reference conversion path (data URL with size guard and overflow downgrade).
    2026-04-10 中文：新增本地文件参考图转换路径（带大小守卫的 data URL 与超限降级）。
15. 2026-04-10 EN: Added assistant metadata and thread hints for image-reference execution outcomes.
    2026-04-10 中文：新增参考图执行结果的助手元信息与会话提示展示。
16. 2026-04-10 EN: Locked global asset hub V2 PM requirements and added handoff-ready execution checklist in roadmap.
    2026-04-10 中文：冻结全局素材中台 V2 产品需求，并在 roadmap 增加可交接执行清单。
