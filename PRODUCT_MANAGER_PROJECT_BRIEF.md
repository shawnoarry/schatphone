# SchatPhone Product Manager Brief / SchatPhone 产品经理总览
Updated / 更新时间: 2026-04-07

## 1) Document Purpose / 文档用途
1. EN: This file is the PM-focused single-page summary for project direction, stack, delivered scope, and current priorities.
   中文：本文件是面向产品经理的一页式总览，覆盖项目方向、技术栈、已交付范围和当前优先级。
2. EN: It is designed for non-technical product review and cross-session AI handoff.
   中文：它用于非技术产品评审，也用于跨会话 AI 接力。

## 2) Project Overview / 项目概述
1. EN: SchatPhone is an immersive virtual-phone HTML experience.
   中文：SchatPhone 是一个沉浸式虚拟手机 HTML 体验。
2. EN: Core loop: lock screen -> home shell -> chat-driven AI interaction -> notification feedback.
   中文：核心循环：锁屏 -> 主屏壳层 -> Chat 驱动 AI 互动 -> 通知反馈。
3. EN: Product goal: relationship simulation and narrative continuity through AI-assisted interactions.
   中文：产品目标：通过 AI 交互实现关系养成和叙事连续性。
4. EN: Product principle: continuity and immersion quality are more important than feature quantity.
   中文：产品原则：连续性和沉浸感优先于功能数量。

## 3) Tech Stack (PM-readable) / 技术栈（PM可读版）
1. EN: UI Framework: Vue 3.
   中文：界面框架：Vue 3。
2. EN: Routing: Vue Router (Hash mode).
   中文：路由：Vue Router（Hash 模式）。
3. EN: State Management: Pinia (global app state and module state).
   中文：状态管理：Pinia（全局状态与模块状态）。
4. EN: Build Tool: Vite.
   中文：构建工具：Vite。
5. EN: Styling: Tailwind CSS.
   中文：样式系统：Tailwind CSS。
6. EN: Test: Vitest + jsdom.
   中文：测试：Vitest + jsdom。
7. EN: Lint/Format: ESLint + Prettier.
   中文：代码规范：ESLint + Prettier。
8. EN: Data persistence strategy: localStorage + IndexedDB layered approach.
   中文：数据持久化策略：localStorage + IndexedDB 分层方案。

## 4) Delivered Features (Current) / 当前已实现功能
### 4.1 Core Shell / 核心壳层
1. EN: Lock/Home/Settings primary navigation is stable.
   中文：锁屏/Home/Settings 主导航稳定。
2. EN: Lock-state guard is active (non-lock routes blocked when locked).
   中文：锁定态守卫生效（锁定时拦截非锁屏路由）。
3. EN: Lock screen supports notification stack and click-to-unlock jump.
   中文：锁屏支持通知堆叠与点击解锁跳转。

### 4.2 Chat Core / 聊天核心
1. EN: `Trigger Reply` stays persistent as manual AI trigger.
   中文：`Trigger Reply` 常驻，作为手动 AI 调用按钮。
2. EN: User rich-send lane is available in `+` panel (image/gif/link/location/transfer/voice-card).
   中文：用户富消息发送在 `+` 面板可用（图片/gif/链接/位置/转账/语音卡片）。
3. EN: Message actions are long-press based with bottom action sheet.
   中文：消息操作改为长按触发并进入底部动作面板。
4. EN: Conversation-level AI preferences are configurable.
   中文：会话级 AI 偏好可配置。
5. EN: Structured assistant block rendering and sanitization are online.
   中文：结构化助手消息渲染与清洗已上线。
6. EN: `+` panel now gives consistent availability guidance for gallery/location (disabled state + inline hint + guard notice).
   中文：`+` 面板已对素材库/位置提供一致可用性引导（禁用态 + 内联提示 + 守卫提示）。
7. EN: Message editing is now in-chat modal based (no browser prompt), keeping assistant semantic revision and restore path.
   中文：消息编辑已改为 Chat 内弹层（不再依赖浏览器 prompt），并保留助手语义修订与恢复原文路径。
8. EN: Message-edit validation is now isolated in a reusable helper with dedicated tests.
   中文：消息编辑校验已拆分为可复用辅助函数，并补齐专项测试。

### 4.3 Contacts and Role Binding / 通讯录与角色绑定
1. EN: Main contacts (`/contacts`) manage global role profiles.
   中文：主通讯录（`/contacts`）管理全局角色档案。
2. EN: Chat directory (`/chat-contacts`) manages thread/service bindings.
   中文：会话通讯录（`/chat-contacts`）管理会话绑定与服务号。
3. EN: Role profile supports asset-pack binding.
   中文：角色档案支持素材包绑定。
4. EN: Thread can set preferred asset override without deleting global profile.
   中文：会话可设置优先素材覆盖，且不会删除全局档案。

### 4.4 Gallery and Assets / 相册与素材
1. EN: Global asset center supports local file import and URL import.
   中文：全局素材中心支持本地导入和 URL 导入。
2. EN: Asset categories include wallpaper/emoji/reference/scenario.
   中文：素材分类包含壁纸/表情/参考图/场景图。
3. EN: Dedupe and safe deletion guard are implemented.
   中文：去重和安全删除守卫已实现。
4. EN: Chat can consume gallery assets with role-aware defaults.
   中文：Chat 可消费相册素材，并支持角色上下文默认项。

### 4.5 Settings and Reliability / 设置与可靠性
1. EN: Backup export/import flow is available with rollback-safe behavior.
   中文：备份导出/导入流程可用，具备回滚安全。
2. EN: Backup export supports metadata-first mode and optional gallery asset package mode.
   中文：备份导出支持“元数据优先模式”与“可选相册素材包模式”。
3. EN: Storage diagnostics and repair entry are available.
   中文：存储诊断与修复入口可用。
4. EN: System UI language supports `zh-CN/en-US/ko-KR`.
   中文：系统 UI 语言支持 `zh-CN/en-US/ko-KR`。
5. EN: Backup reminder supports system-style notifications (non-blocking).
   中文：备份提醒支持系统式通知（非弹窗打断）。

## 5) Priority Refinement (P0) / 需细化优先级（P0）
### P0-4 Rich Message Lane Polish / 富消息链路打磨
Status / 状态: `IN_PROGRESS`（Current highest / 当前最高）
1. EN: Unify validation and failure-state behavior.
   中文：统一输入校验与失败态表现。
2. EN: Front-load form guidance (inline hints + disabled submit before valid input).
   中文：前置表单引导（内联提示 + 输入有效前禁用提交）。
3. EN: Keep `Trigger Reply` lane unaffected while improving user-send quality.
   中文：在优化用户发送质量时保持 `Trigger Reply` 通道不受影响。
4. EN: Current pass completed for link/transfer/voice forms and gallery/location action availability; remaining work is edit-lane alignment with `P0-1`.
   中文：当前批次已完成链接/转账/语音表单及素材库/位置动作可用性收口；剩余重点是与 `P0-1` 的编辑链路对齐。

### P0-7 Storage & Backup Hardening / 存储与备份加固
Status / 状态: `DONE`
1. EN: Close binary storage path (IndexedDB-first).
   中文：完成二进制存储路径收口（IndexedDB 优先）。
2. EN: Finalize metadata-first export + optional asset package policy.
   中文：完成“元数据优先 + 可选素材包”导出策略收口。
3. EN: Improve restore diagnostics and keep rollback-safe behavior.
   中文：完善恢复诊断并保持回滚安全。

### P0-1 AI Single-Message Semantic Revision / AI 单条语义修订
Status / 状态: `PARTIAL_DONE`
1. EN: Single assistant-message semantic revision path is online.
   中文：单条助手消息语义修订路径已上线。
2. EN: Revised text is reused as next-turn context default.
   中文：修订文本已作为后续轮次上下文默认值复用。
3. EN: Remaining: add dedicated UI tests and finalize revision-trace policy.
   中文：剩余：补齐专门 UI 测试并确定修订痕迹策略。

### P0-2 Chat Top-Level Bottom Dock / Chat 一级页底部功能位
Status / 状态: `PARTIAL_DONE`
1. EN: Chat list page bottom dock baseline (`Prefs/Identity/Labs`) is online.
   中文：Chat 一级列表页底部功能位基线（偏好/身份/实验室）已上线。
2. EN: Current entries route to real placeholder pages without breaking thread entry flow.
   中文：当前入口已路由到真实占位页，且不影响会话进入流程。
3. EN: Remaining: replace placeholders with production module pages.
   中文：剩余：将占位页替换为正式模块页。

### P0-3 and P0-6 Closure / P0-3 与 P0-6 收口
Status / 状态: `PARTIAL_DONE`
1. EN: Complete cross-module reuse contract and acceptance list.
   中文：补齐跨模块复用契约与统一验收清单。

## 6) PM Decision Checklist / 产品经理待决策清单
1. EN: Backup wording style in UI: direct style vs immersive narrative style.
   中文：备份相关 UI 文案风格：直接说明 vs 沉浸叙事。
2. EN: Default export option: metadata-only by default or include asset package by default.
   中文：导出默认项：仅元数据默认，还是默认包含素材包。
3. EN: Error history naming for user clarity (API/storage reports).
   中文：报错历史入口命名（API/存储报告）是否足够用户可理解。

## 7) Quick Read Path / 快速阅读路径
1. EN: Product overview and architecture: `PROJECT_MASTER_GUIDE.md`.
   中文：项目总览与架构：`PROJECT_MASTER_GUIDE.md`。
2. EN: Live execution board: `TODO_ROADMAP.md`.
   中文：动态执行看板：`TODO_ROADMAP.md`。
3. EN: PM status report: `docs/reference/TODO_PM_STATUS_REPORT.md`.
   中文：产品经理状态报告：`docs/reference/TODO_PM_STATUS_REPORT.md`。

## 8) Change Log / 变更记录
1. 2026-04-07 EN: Created PM-focused consolidated brief.
   2026-04-07 中文：新增产品经理专用整合总览文档。
2. 2026-04-07 EN: Synced `P0-4` progress: action-grid availability closure for gallery/location and full lint/test/build verification.
   2026-04-07 中文：同步 `P0-4` 进展：完成素材库/位置动作网格可用性收口，并通过 lint/test/build 全量验证。
3. 2026-04-07 EN: Added in-chat message edit modal progress and updated `P0-1/P0-2` to `PARTIAL_DONE`.
   2026-04-07 中文：补充 Chat 内消息编辑弹层进度，并将 `P0-1/P0-2` 更新为 `PARTIAL_DONE`。
4. 2026-04-07 EN: Added `chat-message-edit` validation helper and dedicated tests for safer future UI iteration.
   2026-04-07 中文：新增 `chat-message-edit` 校验辅助与专项测试，提升后续 UI 迭代安全性。
