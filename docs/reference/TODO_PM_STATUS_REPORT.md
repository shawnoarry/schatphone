# SchatPhone TODO PM Status Report / SchatPhone 待办状态（产品经理视角）
Updated / 更新时间: 2026-04-07
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
3. EN: Therefore the immediate execution focus is now `P0-4` (rich-message lane consistency).
   中文：因此当前立即执行重点切换为 `P0-4`（富消息链路一致性）。

## 3. P0 status at a glance / P0 状态总览
1. `P0-1` AI 单条语义修订: `PARTIAL_DONE`
2. `P0-2` Chat 一级页底部功能位: `PARTIAL_DONE`
3. `P0-3` 头像层级 B: `PARTIAL_DONE`
4. `P0-4` 用户富消息链路加固: `IN_PROGRESS`
5. `P0-5` 相册全局素材中心 v1: `PARTIAL_DONE`
6. `P0-6` 角色绑定与素材复用: `PARTIAL_DONE`
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

## 5. Immediate next task in plain language / 下一项待办（白话版）
### `P0-4` Rich Message Lane Hardening / 富消息链路加固

What we are solving / 我们要解决什么:
1. EN: Rich-message forms should be consistent before submit (validation, disabled state, guidance).
   中文：富消息表单在提交前应保持一致体验（校验、禁用态、提示文案）。
2. EN: Reduce trial-and-error by making invalid input visible early.
   中文：让无效输入提前可见，减少“点了才知道错”的试错感。
3. EN: Keep manual AI trigger lane unaffected while improving user send UX.
   中文：在优化用户发送体验的同时，保持手动 AI 触发通道不受影响。

What will be delivered / 本步交付什么:
1. EN: Shared validation state for link/transfer/voice-card forms.
   中文：链接/转账/语音卡片统一校验状态。
2. EN: Disabled submit buttons until input becomes valid.
   中文：输入有效前提交按钮保持禁用。
3. EN: Inline hints plus fallback error notices.
   中文：内联提示 + 兜底错误提示并存。
4. EN: Gallery/location actions in `+` panel follow the same availability-state logic and guidance.
   中文：`+` 面板中的素材库/位置动作已按同一可用性逻辑与提示策略执行。

How you can review it / 你可以怎么验收:
1. EN: In chat `+` panel, try invalid and valid link/transfer/voice inputs.
   中文：在 chat `+` 面板分别输入无效和有效的链接/转账/语音数据。
2. EN: Confirm button disable/enable transitions are intuitive.
   中文：确认按钮禁用/启用切换符合直觉。
3. EN: Confirm `Trigger Reply` and other send paths still work.
   中文：确认 `Trigger Reply` 与其他发送通道不受影响。

## 6. Why this order is chosen / 为什么按这个顺序
1. EN: Storage risk has been reduced, so user-facing chat consistency now has higher product impact.
   中文：存储风险已下降，因此用户可感知的聊天一致性现在更有产品影响力。
2. EN: This step improves daily usage feel without adding new complexity to users.
   中文：这一步提升日常使用手感，同时不增加用户认知负担。
3. EN: It prepares a cleaner base for upcoming semantic revision (`P0-1`).
   中文：这为后续语义修订（`P0-1`）打下更干净的交互基础。

## 7. PM decisions currently needed / 当前需要你拍板的点
1. EN: Confirm backup UX wording style: “simple and direct” vs “immersive narrative”.
   中文：确认备份提示文案风格：偏“直接简明”还是偏“沉浸叙事”。
2. EN: Confirm default export choice in UI: metadata-only first, asset package optional toggle.
   中文：确认导出默认策略：是否默认仅元数据，素材包由用户手动勾选。
3. EN: Confirm error-history entry naming for API/storage diagnostics in settings/network.
   中文：确认设置/网络中 API 与存储报错历史入口命名（便于用户理解）。

## 8. Risk watch (PM version) / 风险提醒（产品经理版）
1. EN: If TODO docs are not updated per commit, team alignment will drift quickly.
   中文：若每次提交不同步 TODO，协作口径会很快漂移。
2. EN: If backup strategy explanation is weak, users may think data is “auto-safe” and skip backup.
   中文：若备份说明不清，用户会误以为数据“自动绝对安全”，从而不做备份。
3. EN: If cross-module asset contracts are delayed too long, future modules may require expensive refactors.
   中文：若跨模块素材契约迟迟不定，未来模块接入会产生高成本返工。

## 9. Next after P0-4 (preview only) / P0-4 之后（预告）
1. EN: Close remaining `P0-1` items (tests and revision trace policy).
   中文：收口 `P0-1` 剩余项（测试与修订痕迹策略）。
2. EN: Close remaining `P0-2` items (replace placeholders with production module pages).
   中文：收口 `P0-2` 剩余项（占位页替换为正式模块页）。
3. EN: Continue cross-module closure for `P0-3` and `P0-6`.
   中文：继续 `P0-3` 与 `P0-6` 的跨模块收口。

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
