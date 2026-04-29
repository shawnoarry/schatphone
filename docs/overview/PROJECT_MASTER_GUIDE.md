# SchatPhone Project Master Guide / SchatPhone 项目总说明

Updated / 更新时间: 2026-04-19

## 1. Why This File Exists / 这份文档的用途

This is the primary "understand the whole project" document for both product-facing readers and incoming AI engineers.  
这是面向产品经理视角和后续 AI 程序员的主说明文档，用来快速理解项目全貌。

If there is any conflict with older docs, this file + `docs/roadmap/TODO_ROADMAP.md` should be treated as current priority references.  
如果与旧文档存在冲突，以本文件 + `docs/roadmap/TODO_ROADMAP.md` 作为当前优先参考。

---

## 2. Product Definition / 项目定义

SchatPhone is an immersive virtual-phone HTML game shell.  
SchatPhone 是一个沉浸式虚拟手机 HTML 游戏外壳。

Core gameplay direction:  
核心玩法方向：

1. Simulate a phone-like lifecycle (lock screen, home, notifications, app modules).  
模拟手机生命周期（锁屏、桌面、通知、模块入口）。
2. Use AI as the primary content engine for social/relationship interactions.  
以 AI 作为社交与关系养成内容的核心生成引擎。
3. Keep continuity and immersion more important than isolated feature stacking.  
将连续性与沉浸感优先于零散功能堆叠。

---

## 3. Target Users and Reading Roles / 目标读者与使用角色

1. Product manager (non-coding): evaluate UX direction, priorities, and release readiness.  
产品经理（非技术）：评估体验方向、优先级和上线节奏。
2. AI engineer (Codex/Claude): implement features, keep architecture consistency, and maintain docs.  
AI 工程师（Codex/Claude）：落地实现、保持架构一致、同步文档。

---

## 4. Current State Snapshot / 当前阶段快照

Project stage: stable core shell + immersive expansion baseline.  
项目阶段：核心壳层稳定 + 沉浸式扩展基线阶段。

Already stable:
已稳定能力：

1. Lock -> Home -> Chat/Settings main path.  
锁屏 -> Home -> Chat/Settings 主链路。
2. Global system language (UI scope) with `zh-CN/en-US/ko-KR`.  
系统 UI 多语言（`zh-CN/en-US/ko-KR`）。
3. Chat manual trigger flow with `Trigger Reply` persistent button.  
Chat 手动触发链路，`Trigger Reply` 按钮常驻。
4. Lock-screen notification loop for AI replies while locked.  
锁定状态下 AI 回复通知回流到锁屏。
5. Backup/restore + storage diagnostics baseline.  
备份恢复与存储诊断基线。
6. WorldBook entry already manages `global worldview + knowledge points`, with legacy `worldBook` alias kept only for compatibility.  
世界书入口已管理 `全局世界观 + 知识点`，旧 `worldBook` 仅作为兼容别名保留。
7. Chat prompt assembly is already layered as `global worldview -> role profile -> bound knowledge points -> conversation context`.  
Chat 提示词组装已按 `全局世界观 -> 角色档案 -> 绑定知识点 -> 会话上下文` 分层执行。
8. Global asset hub folder binding is online across Gallery, Contacts, Chat Directory, Chat, and Map baseline flows.  
全局素材中台的文件夹绑定已贯通 Gallery、通讯录、会话通讯录、Chat 与地图基线链路。
9. Map module now runs a persisted local simulation baseline (location setup + trip lifecycle + history + reminder), without mandatory external map API dependency.  
地图模块现已具备可持久化的本地模拟基线（地点设置 + 行程生命周期 + 历史记录 + 提醒），不依赖外部地图 API 也能运行。
10. Real web-push delivery baseline is online for instant and scheduled reminders.  
真 Web Push 送达基线已上线，可支持即时与定时提醒。

Current active priorities are tracked in `docs/roadmap/TODO_ROADMAP.md`.  
当前进行中优先级见 `docs/roadmap/TODO_ROADMAP.md`。

---

## 5. Technical Stack / 技术栈

From codebase (`package.json`) / 以代码为准：

1. Vue `3.5.24`
2. Vue Router `5.0.2` (Hash mode)
3. Pinia `3.0.4`
4. Vite `7.2.4`
5. Tailwind CSS `4.1.18` (`@tailwindcss/vite`)
6. Vitest `1.6.0` + jsdom
7. ESLint 9 + Prettier 3
8. Utilities: Font Awesome, marked

---

## 6. Core Architecture / 核心架构

### 6.1 App Shell / 应用壳层

1. Route entry defaults to `/lock` (`/` redirects).  
默认从 `/lock` 进入（`/` 重定向）。
2. Non-lock routes are blocked when `system.isLocked = true`.  
当 `system.isLocked = true` 时，阻止访问非锁屏路由。

Key files / 关键文件:

1. `src/main.js`
2. `src/App.vue`
3. `src/router/index.js`

### 6.2 State Layer (Pinia) / 状态层（Pinia）

1. `src/stores/system.js`: settings, lock state, notifications, automation policy, truth state, persistence/diagnostics hooks.  
`src/stores/system.js`：设置、锁定状态、通知、自主调用策略、系统真值、持久化与诊断钩子。
2. `src/stores/chat.js`: contacts/profiles/conversations/messages, chat preferences, avatar override hierarchy, message semantics.  
`src/stores/chat.js`：联系人/角色档案/会话/消息、会话偏好、头像层级覆写、消息语义能力。
3. `src/stores/map.js`: map-module local simulation state baseline.  
`src/stores/map.js`：地图模块本地模拟状态基线。
4. `src/stores/system.js` `user`: profile + `globalWorldview` + `knowledgePoints`; legacy `worldBook` alias is still mirrored for restore compatibility.  
`src/stores/system.js` 的 `user`：用户资料 + `globalWorldview` + `knowledgePoints`；旧 `worldBook` 别名仍会同步，用于恢复兼容。

### 6.3 Service/Utility Layer / 服务与工具层

1. `src/lib/ai.js`: unified AI provider calls and error mapping.  
`src/lib/ai.js`：统一 AI 调用与错误映射。
2. `src/lib/persistence.js`: local persistence, async layered APIs, mirror drift inspect/reconcile.  
`src/lib/persistence.js`：本地持久化、异步分层 API、镜像漂移检查修复。
3. `src/lib/locale.js` + `src/composables/useI18n.js`: system UI i18n utilities.  
`src/lib/locale.js` + `src/composables/useI18n.js`：系统 UI 国际化能力。
4. `src/lib/chat-response.js`: robust assistant payload parsing and fallback extraction.  
`src/lib/chat-response.js`：助手响应解析与回退提取。

Rule: components should not directly implement provider fetch logic; use `src/lib/ai.js`.  
规则：组件层不直接写供应商调用细节，统一走 `src/lib/ai.js`。

---

## 7. Functional Modules (Current) / 当前模块能力

### 7.1 Lock Screen / 锁屏

1. Default entry with unlock guard.  
默认入口与解锁守卫。
2. Banner + stacked notification list.  
横幅 + 堆叠通知列表。
3. Tap notification to unlock and deep-link into target route.  
点击通知可解锁并深跳目标页面。

### 7.2 Home / 桌面

1. 5-page layout baseline (pages 3-5 reserved expansion).  
5 屏基线（3-5 屏为扩展预留）。
2. Widget and app tile organization with edit-mode gating.  
Widget 与应用入口组织，含编辑模式开关门控。
3. App entry tiles are protected from hide/delete.  
应用入口 tile 禁止隐藏/删除。

### 7.3 Settings / 设置

1. Profile/WorldBook/General/Notifications/AI Automation structure.  
Profile/WorldBook/通用/通知/AI 自动响应结构。
2. Backup export/import with rollback-safe behavior.  
备份导出/导入，失败可回滚。
3. Storage consistency diagnostics and repair entry.  
存储一致性诊断与修复入口。
4. WorldBook is currently the global lore setting entry; naming can be adjusted later for immersion, but semantic role should remain clear for users.
世界书当前是全局设定入口；名称后续可做沉浸化调整，但语义角色必须保持用户可理解。

### 7.4 Network / 网络配置

1. Provider URL+key setup and model fetch.  
供应商 URL+key 配置与模型拉取。
2. Presets and report center with readable error grading.  
预设与报错中心（分级可读）。

### 7.5 Chat / 聊天

1. User send and AI invoke are decoupled.  
用户发送与 AI 调用解耦。
2. `Trigger Reply` is persistent and explicit.  
`Trigger Reply` 常驻且显式。
3. Message actions use long-press/context-menu + bottom action sheet.  
消息操作使用长按/右键 + 底部动作面板。
4. `+` panel supports rich user message types (image/gif/link/location/transfer/voice-card).  
`+` 面板支持富消息发送（图片/gif/链接/位置/转账/语音卡片）。
5. Conversation-level AI prefs are configurable (mode/count/style/context/bilingual/quote/voice).  
会话级 AI 偏好可配置（模式/条数/风格/上下文/双语/引用/语音）。
6. Structured assistant blocks are supported and sanitized.  
支持结构化助手消息块并做安全清洗。

### 7.6 Contacts and Directory Split / 主通讯录与会话通讯录拆分

1. `/contacts`: global role profile archive (create/edit/delete).  
`/contacts`：全局角色档案（增删改）。
2. `/chat-contacts`: role binding + service account management.  
`/chat-contacts`：角色绑定与服务号管理。
3. Unbind in chat directory does not delete global profile.  
会话通讯录中的解绑不会删除全局档案。

### 7.7 World Kernel and Map (Current + Next) / 世界内核与地图（当前 + 下一步）

Current / 当前：
1. World kernel is already split into `global worldview` and bindable `knowledge points`, with legacy `worldBook` alias preserved for backup/migration compatibility.  
世界内核已拆分为 `全局世界观` 与可绑定 `知识点`，旧 `worldBook` 仅为备份/迁移兼容保留。
2. Map now runs as a simulation-first baseline with location setup, trip lifecycle, persisted history, reminders, and optional AI visual enhancement.  
地图现已运行在“模拟优先”的基线上，具备地点设置、行程生命周期、历史记录、提醒，以及可选 AI 视觉增强。

Next confirmed direction / 已确认下一方向：
1. Deepen world-kernel consumption across more modules, not only Chat.  
继续把世界内核消费扩展到更多模块，而不只是在 Chat 中使用。
2. Keep map baseline simulation-first; AI usage in map remains optional enhancement for visuals/events, not mandatory for core progress.  
地图仍坚持模拟优先；地图内 AI 只作为视觉/事件增强，不作为核心进度的必需依赖。

---

## 8. Data and Storage Model / 数据与存储模型

### 8.1 Core Chat Shapes / Chat 关键数据形态

1. `roleProfiles`
2. `contacts`
3. `conversations`
4. `messagesByConversation`

Message includes status + blocks + quote + `semanticRevision` support.  
消息结构包含状态、块、引用和 `semanticRevision` 语义修订支持。

World kernel note / 世界内核说明：
1. Current persisted shape: `user.globalWorldview` + `user.knowledgePoints[]`, with mirrored `user.worldBook` alias for backward compatibility.  
当前持久化形态：`user.globalWorldview` + `user.knowledgePoints[]`，并镜像保留 `user.worldBook` 兼容旧数据。
2. Ongoing extension shape: worldview/knowledge-point consumption will keep expanding through role/module bindings.
持续扩展形态：世界观/知识点会继续通过角色/模块绑定向更多模块扩展消费。

### 8.2 Persistence Strategy / 持久化策略

1. Local-first persistence baseline is active.  
本地优先持久化基线已启用。
2. Storage layering migration prep is integrated (sync-first + async fallback + mirror diagnostics).  
分层存储迁移准备已接入（同步优先 + 异步回退 + 镜像诊断）。
3. Asset storage hardening is already online as baseline; current work is cross-module polish rather than first-time storage closure.  
素材存储加固基线已上线；当前重点是跨模块打磨，而不是第一次建立存储能力。

---

## 9. AI Interaction Rules / AI 调用规则

1. Manual trigger must stay available and clear.  
手动触发必须始终可用且清晰可见。
2. Autonomous invocation is policy-controlled (global/module/thread).  
自主调用受策略控制（全局/模块/会话）。
3. Manual trigger has higher practical priority when overlap risk occurs.  
发生重叠风险时，手动触发优先。
4. System language does not rewrite AI-generated content.  
系统语言不会改写 AI 生成内容。
5. Prompt assembly must preserve worldview layering: global worldview always-on, role-bound knowledge points selectively injected.
提示词组装必须保持世界观分层：全局世界观始终注入，角色绑定知识点按需注入。
6. Map core progression (location/travel/time) should remain system-computed even when map AI enhancements are enabled.
即使开启地图 AI 增强，地图核心进度（地点/移动/时间）也必须由系统计算。

---

## 10. Current Documentation Structure / 当前文档结构说明

Start from `docs/README.md` when you are unsure which document to read.
如果不确定应该读哪份文档，先从 `docs/README.md` 开始。

Rule of thumb / 使用原则：

1. `docs/roadmap/TODO_ROADMAP.md` is the only live execution board.
`docs/roadmap/TODO_ROADMAP.md` 是唯一动态执行看板。
2. `docs/roadmap/PROJECT_MODULE_AUDIT.md` is the module candidate pool and maturity audit, not a second roadmap.
`docs/roadmap/PROJECT_MODULE_AUDIT.md` 是模块候选池和成熟度梳理表，不是第二路线图。
3. `docs/process/AI_WORK_MODE.md` owns workflow and documentation governance.
`docs/process/AI_WORK_MODE.md` 负责流程规范与文档治理。

Functional folders / 职能目录：

- `docs/pm/`: PM status and product overview / PM 状态与产品总览
- `docs/roadmap/`: roadmap and module candidate pool / 路线图与模块候选池
- `docs/overview/`: project master guide / 项目总说明
- `docs/process/`: workflow and operation guide / 流程规范与操作指南
- `docs/architecture/`: architecture and cross-module contracts / 架构与跨模块契约
- `docs/product-decisions/`: current topic-level product decisions / 当前专题产品决策
- `docs/strategy/`: long-range strategy / 长线策略
- `docs/templates/`: reusable requirement and AI collaboration templates / 可复用需求与 AI 协作模板
- `docs/archive/`: obsolete or historical docs only / 仅存放过时或历史归档

Archived docs / 已归档文档：

1. Superseded planning/status docs were moved to `docs/archive/2026-04-19-doc-audit/`.  
已被替代的计划/状态文档已移动至 `docs/archive/2026-04-19-doc-audit/`。
2. Closed Chat identity refactor docs were moved to `docs/archive/obsolete/2026-04-29-chat-identity/`.
已关闭的 Chat 身份重构文档已移动至 `docs/archive/obsolete/2026-04-29-chat-identity/`。

---

## 11. Collaboration Rules for Incoming AI Engineers / 给后续 AI 程序员的协作规则

1. Read this file + `docs/roadmap/TODO_ROADMAP.md` before coding.  
编码前先读本文件 + `docs/roadmap/TODO_ROADMAP.md`。
2. Treat `docs/roadmap/TODO_ROADMAP.md` as current execution order.  
将 `docs/roadmap/TODO_ROADMAP.md` 视为当前执行顺序来源。
3. When route/schema/core behavior changes, update docs in same PR/commit batch.  
涉及路由/数据结构/核心行为变更时，同批次同步文档。
4. Keep product-facing language readable; avoid deep technical shorthand in status summaries.  
进度汇报要保持产品可读，不要只写技术缩写。

---

## 12. Change Log / 变更记录

1. 2026-04-06: created as consolidated master guide from previously split status/architecture/progress docs.  
2026-04-06：由原先分散的状态/架构/进度文档整合生成本主说明。
2. 2026-04-12: synced confirmed world-map direction (world kernel split plan + map simulation-first baseline) and clarified current-vs-target data model.
2026-04-12：同步世界观-地图已确认方向（世界内核拆分计划 + 地图模拟优先基线），并明确当前与目标数据模型差异。

