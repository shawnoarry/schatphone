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
2. EN: Core foundation is stable enough; current risk is no longer UI basics, but storage/backup reliability for media-heavy usage.
   中文：核心基础已稳定，当前风险不在基础 UI，而在重素材场景下的存储与备份可靠性。
3. EN: Therefore the immediate execution focus is `P0-7`.
   中文：因此当前立即执行重点是 `P0-7`。

## 3. P0 status at a glance / P0 状态总览
1. `P0-1` AI 单条语义修订: `TODO`
2. `P0-2` Chat 一级页底部功能位: `TODO`
3. `P0-3` 头像层级 B: `PARTIAL_DONE`
4. `P0-4` 用户富消息链路加固: `IN_PROGRESS`
5. `P0-5` 相册全局素材中心 v1: `PARTIAL_DONE`
6. `P0-6` 角色绑定与素材复用: `PARTIAL_DONE`
7. `P0-7` 存储与备份加固: `IN_PROGRESS`（Next Up）

## 4. What was completed recently / 最近完成了什么（你能感知到的）
1. EN: Chat supports richer user-send content lanes while keeping `Trigger Reply` as a dedicated AI trigger.
   中文：Chat 已支持更丰富的用户发送内容，同时保留 `Trigger Reply` 作为专用 AI 调用按钮。
2. EN: Role profile and chat-thread asset binding baseline is landed.
   中文：角色档案与会话素材绑定基线已落地。
3. EN: Global gallery assets can now be reused in chat flows with role-aware defaults.
   中文：全局相册素材已可在 chat 中复用，并能按角色上下文给出默认项。

## 5. Immediate next task in plain language / 下一项待办（白话版）
### `P0-7` Storage & Backup Hardening / 存储与备份加固

What we are solving / 我们要解决什么:
1. EN: Prevent long-term data loss risk when users import many images/gifs and later clean browser data.
   中文：避免用户导入大量图片/gif 后，因浏览器清理导致长期数据丢失风险。
2. EN: Make backup and restore behavior easier to understand for non-technical users.
   中文：让备份与恢复对非技术用户更清晰、更可控。
3. EN: Make failures diagnosable instead of “silent weird behavior”.
   中文：让失败可诊断，避免“莫名其妙异常”。

What will be delivered / 本步交付什么:
1. EN: Stronger media storage path (IndexedDB-first strategy closure).
   中文：更稳的素材存储路径（IndexedDB 主策略收口）。
2. EN: Backup strategy clarity (metadata always exportable; asset package optional).
   中文：备份策略清晰化（元数据始终可导出；素材包可选）。
3. EN: Better restore error messages + rollback safety.
   中文：更好的恢复错误提示 + 回滚安全。

How you can review it / 你可以怎么验收:
1. EN: Simulate backup, clear/replace state, and restore in settings flow.
   中文：在设置里模拟备份、清空/替换状态、再恢复。
2. EN: Confirm chat/contacts/gallery still correctly linked after restore.
   中文：确认恢复后 chat/通讯录/相册绑定关系正常。
3. EN: Confirm failures show readable reason and next-step hints.
   中文：确认失败提示有可读原因与后续处理建议。

## 6. Why this order is chosen / 为什么按这个顺序
1. EN: If storage is not hardened first, later feature expansion increases migration cost and bug surface.
   中文：若不先收口存储，后续功能越多，迁移成本和 bug 面积会更大。
2. EN: This task improves reliability for all current modules at once.
   中文：这个任务是全模块收益，一次收口，处处受益。
3. EN: It protects user trust before we expand advanced immersive content.
   中文：在扩展高级沉浸内容前，先保护用户数据可信度。

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

## 9. Next after P0-7 (preview only) / P0-7 之后（预告）
1. EN: Return to `P0-4` polish (rich message failure-state consistency).
   中文：回到 `P0-4` 做富消息失败态一致性打磨。
2. EN: Start `P0-1` single-message semantic revision.
   中文：启动 `P0-1` 单条语义修订。
3. EN: Then proceed with `P0-2` chat top-level bottom dock expansion entries.
   中文：随后推进 `P0-2` Chat 一级页底部扩展入口。

## 10. Change log / 变更记录
1. 2026-04-07 EN: Rewrote from short summary into detailed PM-level execution report.
   2026-04-07 中文：从简版摘要重写为详细的产品经理执行报告。
2. 2026-04-07 EN: Synced with latest role-asset binding progress and storage-closure priority.
   2026-04-07 中文：已同步最新角色素材绑定进度与存储收口优先级。
