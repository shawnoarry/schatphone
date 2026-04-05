# Product Manager Priority Plan / 产品经理优先级任务单

Updated / 更新时间: 2026-04-06

## 1. Purpose / 用途
This document captures product-level priorities in plain language and aligns them with current implementation constraints.  
本文用产品经理可读语言记录优先级，并与当前技术实现约束对齐。

## 2. Product Direction Snapshot / 项目方向快照
SchatPhone is an immersive virtual-phone experience: lock screen + home shell + chat-driven world simulation.  
SchatPhone 是一个沉浸式虚拟手机体验：由锁屏、主屏外壳和聊天驱动的世界模拟组成。

Core principle / 核心原则:  
Interaction continuity and immersion quality are more important than adding isolated features quickly.  
交互连续性与沉浸体验质量，优先于零散功能堆叠。

## 3. Current Baseline / 当前基础能力
1. Lock/Home/Settings main path is stable.  
锁屏/Home/Settings 主链路稳定。
2. Chat supports manual trigger, message operations, and structured assistant blocks.  
Chat 已支持手动触发、消息操作、结构化助手消息块。
3. Global AI automation controls are available (master/module/thread-level).  
全局 AI 自动响应控制已具备（总开关/模块/会话层）。
4. Backup, restore, and storage diagnostics are available.  
备份、恢复与存储诊断链路已可用。
5. System UI language scope is available (`zh-CN/en-US/ko-KR`).  
系统 UI 多语言范围已可用（`zh-CN/en-US/ko-KR`）。
6. Chat rich send lane (`+` panel) is online, and `Trigger Reply` remains persistent.  
Chat 富消息发送通道（`+` 面板）已上线，`Trigger Reply` 仍保持常驻。

## 4. Newly Confirmed Planning (Highest Priority) / 新确认规划（最高优先级）

### 4.1 Single-Message Semantic Revision for AI Replies / AI 回复单条语义修订
Goal / 目标: allow users to revise one assistant message without full reroll when wording or expression is not satisfactory.  
目标：当语句不当或不满意时，允许用户对单条助手消息进行修订，而不是整条重 roll。

Must-keep rules / 硬性要求:
1. Revision is not reroll; no mandatory API call is required to apply edits.  
修订不是重 roll；应用修改时不强制调用 API。
2. Revised text becomes the default context text for subsequent turns.  
修订后的文本将作为后续轮次的默认上下文文本。
3. For non-text blocks (image/voice/etc.), visual media can remain while context text is updated.  
对非文本块（图片/语音等）允许保留原视觉素材，仅更新上下文文本。
4. No persistent immersion-breaking label in chat bubble (e.g., avoid always-on “已修订”).  
聊天气泡内不常驻破坏沉浸的修订标签（避免持续显示“已修订”）。

Key decisions / 关键决策:
1. Extend message edit entry from user-only to assistant messages as well.  
将消息编辑入口从仅用户消息扩展到助手消息。
2. Introduce “semantic revision text” as first-class context source across message types.  
引入“语义修订文本”并作为跨消息类型的一等上下文来源。
3. Preserve original media unless user explicitly requests regeneration.  
除非用户明确要求重生成，否则保留原媒体素材。
4. Provide rollback-to-original for safety.  
提供恢复原文能力用于兜底。

### 4.2 Chat List Bottom Feature Dock / Chat 一级页底部功能位
Goal / 目标: reserve stable expansion slots for future chat-adjacent features.  
目标：在 Chat 一级页预留稳定的功能扩展位。

Must-keep rules / 硬性要求:
1. At least 3 bottom buttons must be visible on chat list page.  
Chat 一级页底部至少显示 3 个按钮。
2. First release can route to placeholder pages, but routing must be real and stable.  
首期可跳转占位页，但路由必须真实可用且稳定。

Key decisions / 关键决策:
1. Keep current chat list interaction intact; do not displace primary conversation entry behavior.  
保持现有会话列表主交互，不挤占进入会话的主路径。
2. Use fixed bottom dock only on chat top-level list view.  
底部功能位仅在 Chat 一级列表视图显示。

### 4.3 Avatar Override Hierarchy B (Global + Module + Thread) / 头像覆写层级 B（全局 + 模块 + 会话）
Goal / 目标: increase immersion and support future anonymous/community gameplay.  
目标：提升沉浸感并为后续匿名/社区玩法提供身份层能力。

Hierarchy / 层级规则:
1. Thread override > Module override > Global profile avatar > Fallback avatar.  
会话级覆写 > 模块级覆写 > 全局档案头像 > 默认兜底头像。
2. Applies to both self identity and AI/contact identity.  
该层级同时作用于“用户自己”和“AI/联系人”。

Key decisions / 关键决策:
1. Global contacts/profile remain canonical defaults for all modules.  
全局通讯录/用户档案仍作为全模块默认基线。
2. Each module may customize self/AI avatar independently for immersion scenes.  
各模块可独立自定义“自己/AI”头像以支持沉浸场景。
3. Chat may further customize per-thread identity visuals.  
Chat 允许进一步按会话覆写身份视觉。
4. Future forum/map/offline scenarios can leverage anonymous identity without rewriting global profile.  
后续论坛/地图/线下场景可用匿名身份玩法，无需改写全局档案。

### 4.4 Chat UX Rebuild Continuity / Chat 交互重构延续项
Goal / 目标: keep mainstream chat-app interaction quality while preserving existing progress.  
目标：在保留已落地进展基础上，继续对齐主流聊天软件交互体验。

Key decisions / 关键决策:
1. Input row remains the primary control center: `+` panel, input, `Trigger Reply`, send.  
输入区继续作为一级操作中心：`+` 面板、输入框、`Trigger Reply`、发送。
2. Message action remains long-press/context-menu + bottom action sheet.  
消息操作继续采用长按/右键 + 底部动作面板。
3. User rich send capabilities stay independent from AI preference toggles.  
用户富消息发送能力继续独立于 AI 偏好开关。

### 4.5 Promote Gallery to Global Asset Center / 相册升级为全局素材中心
Goal / 目标: import once, reuse across chat, appearance, and role-bound scenarios.  
目标：素材一次导入，全局复用到聊天、外观和角色绑定场景。

Key decisions / 关键决策:
1. Asset import is centralized in Gallery (local upload + URL import).  
素材导入统一放在相册（本地上传 + URL 导入）。
2. Contacts only bind asset packs; contacts do not re-import files.  
通讯录只负责绑定素材包，不重复导入文件。
3. Chat input `+` panel only consumes assets from global library.  
Chat 输入区 `+` 面板只调用全局素材库。
4. Emoji packs become one asset type inside Gallery (not a separate import system).  
表情包作为相册素材中心中的一种类型，不再做独立导入体系。

## 5. Priority Roadmap (Reordered) / 优先级路线（重排后）

### P0-1 AI Single-Message Semantic Revision / AI 单条语义修订
1. Enable editing on assistant messages without triggering reroll.  
开放助手消息编辑能力，不触发整体重 roll。
2. Introduce context-first revised text model for all message types.  
为所有消息类型引入“修订文本优先”的上下文模型。
3. Support rollback to original and persistence in backup/export.  
支持恢复原文，并纳入备份/导出持久化。

### P0-2 Chat Top-Level Bottom Dock / Chat 一级页底部功能位
1. Add at least 3 fixed bottom buttons in chat list page.  
在 Chat 一级页新增至少 3 个固定底部按钮。
2. Connect each button to a placeholder route for phase-1.  
首期每个按钮接入可跳转占位路由。

### P0-3 Avatar Hierarchy B / 头像层级 B（会话 > 模块 > 全局）
1. Define shared resolver for self/contact avatar priority across modules.  
定义跨模块通用头像解析器（自己/联系人同规则）。
2. Add module-level override settings.  
增加模块级头像覆写配置。
3. Add thread-level override settings in chat.  
在 Chat 增加会话级头像覆写配置。

### P0-4 User Rich Message Lane Hardening / 用户富消息链路加固
1. Keep existing message types stable: text/image/gif/link/location/transfer/voice-card.  
稳定现有富消息类型：文本/图片/gif/链接/位置/转账/语音卡片。
2. Align message editing behavior with new semantic-revision model.  
使消息编辑行为与新语义修订模型对齐。
3. Keep AI invoke flow as a separate lane with clear status transitions.  
维持 AI 调用链路独立且状态流转清晰。

### P0-5 Gallery Asset Center v1 / 相册素材中心 v1（保留原待办）
1. Global import (`png/jpg/webp/gif` + URL).  
全局导入能力（`png/jpg/webp/gif` + URL）。
2. Asset categorization (wallpaper/emoji/reference/scenario).  
素材分类（壁纸/表情/参考图/场景图）。
3. Deduplication and safe deletion.  
素材去重与安全删除。

### P0-6 Role Binding and Reuse / 角色绑定与复用（保留原待办）
1. Bind global asset packs in `/contacts` role profile settings.  
在 `/contacts` 角色档案中绑定素材包。
2. Chat reads role-bound packs with optional thread override.  
会话读取角色绑定素材包，支持会话级覆盖。

### P0-7 Storage and Backup Hardening / 存储与备份加固（保留原待办）
1. Store asset binaries in IndexedDB (not localStorage).  
素材二进制存储使用 IndexedDB（不放 localStorage）。
2. Add backup/export strategy for metadata first, optional asset package export later.  
先做元数据备份导出，后续补可选素材包导出。

### P1 (after P0 stable) / P1（P0 稳定后）
1. AI image-reference pipeline (provider-dependent image input).  
AI 图生图参考链路（依赖供应商图片输入能力）。
2. Scenario cards for pseudo video-call/offline-date immersive scenes.  
伪视频通话/线下约会等场景卡片能力。

## 6. Tech-Stack Feasibility Mapping / 技术栈可行性映射
1. UI restructuring: Vue 3 + Tailwind is fully sufficient.  
UI 重构：Vue 3 + Tailwind 完全可支撑。
2. State orchestration: Pinia supports global assets + role binding + chat consumption.  
状态编排：Pinia 能支撑全局素材、角色绑定与聊天调用。
3. Asset persistence: must use IndexedDB path in existing persistence strategy.  
素材持久化：必须走现有策略中的 IndexedDB 路径。
4. Semantic revision model requires context-text precedence over rendered media payload.  
语义修订模型需要“上下文文本优先于渲染媒体载荷”。
5. Avatar resolver requires shared priority logic (`thread > module > global > fallback`) for self and AI entities.  
头像解析需对“自己/AI”统一实现优先级逻辑（`会话 > 模块 > 全局 > 兜底`）。
6. URL import constraints: cross-origin fetch may fail; fallback and diagnostics are required.  
URL 导入约束：可能受跨域限制，必须有回退和报错诊断。

## 7. UX Guardrails / 体验守则
1. Preserve immersion: no heavy modal interruptions for routine actions.  
保持沉浸：常规操作避免高打断弹窗。
2. Keep `Trigger Reply` explicit and always discoverable.  
`Trigger Reply` 必须明确、常驻、可发现。
3. Distinguish user send capabilities from AI reply policy settings.  
严格区分“用户发送能力”和“AI 回复策略设置”。
4. Avoid duplicated import paths; one global library, multiple consumers.  
避免重复导入入口：一个全局素材库，多处调用。
5. Do not show persistent “revised” badge in message bubbles by default.  
默认不在消息气泡常驻显示“已修订”标记。
6. Non-text message revision updates context text first; media regeneration remains optional.  
非文本消息修订优先更新上下文文本；媒体重生成保持可选。

## 8. Acceptance Checklist / 验收清单
1. User can revise a single assistant message without full reroll.  
用户可在不整体重 roll 的情况下修订单条助手消息。
2. Revised text is used as default context in subsequent AI turns.  
后续 AI 轮次默认使用修订后的文本上下文。
3. For image/voice and other non-text blocks, media can remain while revised text takes effect in context.  
图片/语音等非文本块允许保留原素材，同时修订文本在上下文中生效。
4. Chat top-level page contains at least 3 bottom dock buttons and all route to placeholder pages.  
Chat 一级页包含至少 3 个底部按钮，且均可跳转占位页。
5. Avatar hierarchy works as `thread > module > global > fallback` for both self and AI/contact visuals.  
头像层级 `会话 > 模块 > 全局 > 兜底` 对“自己”和“AI/联系人”均生效。
6. `Trigger Reply` remains in input area and works under all chat states.  
`Trigger Reply` 在所有聊天状态下均可见可用。
7. Emoji/asset import happens once in Gallery and is reusable by contacts/chat.  
表情包/素材在相册导入一次，可被通讯录与聊天复用。
8. Storage does not regress to localStorage-heavy binary writes.  
存储不会退回到 localStorage 大体积二进制写入。

## 9. Decision Log / 决策记录
1. 2026-04-05: confirmed Chat UX rebuild should be prioritized before further cross-module expansion.  
2026-04-05：确认在继续跨模块扩展前，优先完成 Chat 交互骨架重构。
2. 2026-04-05: confirmed `Trigger Reply` button is mandatory and must stay visible in chat input area.  
2026-04-05：确认 `Trigger Reply` 为强制保留功能，且需在输入区常驻。
3. 2026-04-05: confirmed Gallery will be upgraded to global asset center, including emoji pack import/reuse.  
2026-04-05：确认相册升级为全局素材中心，纳入表情包导入与复用。
4. 2026-04-05: started `P0-C1` phase-1 implementation (message action entry migrated to long-press + bottom action sheet, `Trigger Reply` kept persistent).  
2026-04-05：已启动 `P0-C1` 第一阶段实现（消息操作入口迁移为长按 + 底部动作面板，`Trigger Reply` 保持常驻）。
5. 2026-04-06: completed `P0-C1` phase-1 and started `P0-C2` phase-1 (`+` panel rich-message lane: image/gif/link/location/transfer/voice-card).  
2026-04-06：完成 `P0-C1` 第一阶段并启动 `P0-C2` 第一阶段（`+` 面板富消息链路：图片/gif/链接/位置/转账/语音卡片）。
6. 2026-04-06: `P0-C2` phase-2 landed in progress: link/transfer/voice-card now use inline form composer in `+` panel instead of prompt dialogs.  
2026-04-06：`P0-C2` 第二阶段已落地进行中：链接/转账/语音卡片改为 `+` 面板内联表单，不再使用 prompt 弹窗。
7. 2026-04-06: confirmed AI single-message semantic revision requirement; no full reroll required for wording correction.  
2026-04-06：确认 AI 单条语义修订需求；修正文案无需触发整体重 roll。
8. 2026-04-06: confirmed context should consume revised text by default, while non-text media may stay unchanged.  
2026-04-06：确认上下文默认读取修订文本；非文本媒体可保持不变。
9. 2026-04-06: confirmed chat top-level page needs at least three bottom feature buttons with real placeholder routes.  
2026-04-06：确认 Chat 一级页需新增至少三个底部功能按钮，并接入真实占位路由。
10. 2026-04-06: confirmed avatar hierarchy B (`thread > module > global`) for both user and AI identities to support immersion and future anonymous gameplay.  
2026-04-06：确认采用头像层级 B（`会话 > 模块 > 全局`），同时作用于用户与 AI 身份，以支持沉浸及后续匿名玩法。
11. 2026-04-06: `P0-3` phase-1 landed: shared avatar resolver is online (`thread > module > global > fallback`), chat module-level overrides are configurable in `/chat-feature/identity`, and thread-level self/contact overrides are configurable in chat thread menu.  
2026-04-06：`P0-3` 第一阶段已落地：统一头像解析器上线（`会话 > 模块 > 全局 > 兜底`），Chat 模块级覆写可在 `/chat-feature/identity` 配置，会话级自己/对方覆写可在会话菜单配置。
