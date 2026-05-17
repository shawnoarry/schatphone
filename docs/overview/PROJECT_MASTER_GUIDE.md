# SchatPhone Project Master Guide / SchatPhone 项目总说明

Updated / 更新时间: 2026-05-14

## 1. Why This File Exists / 这份文档的用途

This is the primary "understand the whole project" document for both product-facing readers and incoming AI engineers. It should be treated as the current project-wide overview unless a more specific current document overrides a detail.

这是面向产品侧读者与后续 AI 工程师的主总览文档。除非有更具体且当前有效的专题文档覆盖某个细节，否则应把本文视为项目级总说明。

If there is any conflict with older docs, this file + `docs/roadmap/TODO_ROADMAP.md` should be treated as current priority references.

如与旧文档冲突，以本文和 `docs/roadmap/TODO_ROADMAP.md` 作为当前优先参考。

---

## 2. Product Definition / 项目定义

SchatPhone is an immersive virtual-phone HTML game shell.

SchatPhone 是一个沉浸式虚拟手机 HTML 游戏壳层。

Core gameplay direction / 核心玩法方向：

1. Simulate a phone-like lifecycle: lock screen, home, notifications, and app modules.
   模拟手机生命周期：锁屏、桌面、通知与应用模块。
2. Use AI as the primary content engine for social and relationship interactions.
   以 AI 作为社交与关系互动内容的主要引擎。
3. Keep continuity and immersion more important than isolated feature stacking.
   将连续性与沉浸感放在零散功能堆叠之前。
4. Treat events, growth, tasks, and numeric data as tools for user freedom and virtual-life realism, not as restrictions.
   将事件、养成、任务和数值视为服务用户自由度与虚拟生活真实感的工具，而不是限制用户的规则。

---

## 3. Target Users and Reading Roles / 目标读者与使用角色

1. Product manager (non-coding): evaluate UX direction, priorities, and release readiness.
   产品经理（非技术）：评估体验方向、优先级与上线准备度。
2. AI engineer (Codex/Claude): implement features, preserve architecture consistency, and keep docs synced.
   AI 工程师（Codex/Claude）：实现功能、保持架构一致性，并同步文档。

---

## 4. Current State Snapshot / 当前阶段快照

Project stage: stable core shell + immersive expansion baseline.

项目阶段：核心壳层稳定 + 沉浸扩展基线成立。

Already stable / 已稳定能力：

1. `Lock -> Home -> Chat/Settings` main path.
   `锁屏 -> 桌面 -> 聊天/设置` 主链路。
2. Global system language for UI scope with `zh-CN / en-US / ko-KR`.
   系统 UI 多语言：`zh-CN / en-US / ko-KR`。
3. Chat manual trigger flow with persistent `Trigger Reply` control.
   Chat 手动触发链路，且 `Trigger Reply` 按钮常驻。
4. Lock-screen notification loop for AI replies while locked.
   锁定状态下 AI 回复可回流到锁屏通知。
5. Backup/restore plus storage diagnostics baseline.
   备份恢复与存储诊断基线。
6. WorldBook entry already manages `global worldview + knowledge points`, while legacy `worldBook` alias remains only for compatibility.
   世界书入口已管理 `全局世界观 + 知识点`，旧 `worldBook` 别名仅作兼容保留。
7. Chat prompt assembly already follows `global worldview -> role profile -> bound knowledge points -> conversation context`.
   Chat 提示词组装已遵循 `全局世界观 -> 角色档案 -> 绑定知识点 -> 会话上下文`。
8. Global asset hub folder binding is online across Gallery, Contacts, Chat Directory, Chat, and Map baseline flows.
   全局素材中台文件夹绑定已贯通 Gallery、Contacts、Chat Directory、Chat 与 Map 基线链路。
9. Map module already runs a persisted local simulation baseline without requiring an external map API.
   地图模块已具备可持久化的本地模拟基线，无需外部地图 API 也可运行。
10. Real web-push delivery baseline is online for instant and scheduled reminders.
    真 Web Push 送达基线已上线，可支持即时与定时提醒。

Current active priorities are tracked in `docs/roadmap/TODO_ROADMAP.md`.

当前进行中的优先级以 `docs/roadmap/TODO_ROADMAP.md` 为准。

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
   当 `system.isLocked = true` 时，禁止访问非锁屏路由。

Key files / 关键文件：

1. `src/main.js`
2. `src/App.vue`
3. `src/router/index.js`

### 6.2 State Layer (Pinia) / 状态层（Pinia）

1. `src/stores/system.js`: settings, lock state, notifications, automation policy, truth state, persistence and diagnostics hooks.
   `src/stores/system.js`：设置、锁定状态、通知、自动化策略、系统真值、持久化与诊断钩子。
2. `src/stores/chat.js`: contacts, profiles, conversations, messages, chat preferences, avatar override hierarchy, message semantics.
   `src/stores/chat.js`：联系人、角色档案、会话、消息、聊天偏好、头像覆盖层级、消息语义。
3. `src/stores/map.js`: map-module local simulation baseline.
   `src/stores/map.js`：地图模块本地模拟状态基线。
4. `src/stores/system.js` `user`: profile + `globalWorldview` + `knowledgePoints`, with legacy `worldBook` alias mirrored for restore compatibility.
   `src/stores/system.js` 的 `user`：用户资料 + `globalWorldview` + `knowledgePoints`，并保留 `worldBook` 别名用于恢复兼容。

### 6.3 Service and Utility Layer / 服务与工具层

1. `src/lib/ai.js`: unified AI provider calls and error mapping.
   `src/lib/ai.js`：统一 AI 调用与错误映射。
2. `src/lib/persistence.js`: local persistence, async layered APIs, mirror drift inspect/reconcile.
   `src/lib/persistence.js`：本地持久化、异步分层 API、镜像漂移检查与修复。
3. `src/lib/locale.js` + `src/composables/useI18n.js`: system UI i18n utilities.
   `src/lib/locale.js` + `src/composables/useI18n.js`：系统 UI 国际化能力。
4. `src/lib/chat-response.js`: robust assistant payload parsing and fallback extraction.
   `src/lib/chat-response.js`：助手响应解析与回退提取。

Rule / 规则：

- Components should not directly implement provider fetch logic; use `src/lib/ai.js`.
  组件层不应直接编写供应商调用逻辑，应统一经由 `src/lib/ai.js`。

---

## 7. Functional Modules (Current) / 当前模块能力

### 7.1 Lock Screen / 锁屏

1. Default entry with unlock guard.
   默认入口与解锁守卫。
2. Banner + stacked notification list.
   横幅 + 堆叠通知列表。
3. Tap a notification to unlock and deep-link into the target route.
   点击通知可解锁并跳转目标页面。

### 7.2 Home / 桌面

1. 5-page layout baseline (pages 3-5 reserved expansion).
   5 屏基线（3-5 屏为扩展预留）。
2. Widget and app tile organization with edit-mode gating.
   Widget 与应用入口组织，含编辑模式开关门控。
3. App entry tiles are protected from hide/delete.
   应用入口 tile 禁止隐藏/删除。
4. Widget Center is a system-owned entry: tap the Home Widgets icon or open `/widgets` from Appearance; long-press the Home Widgets icon to enter Home widget edit mode.
   Widget 中心是系统层入口：点击 Home 的组件图标或从 Appearance 进入 `/widgets`；长按 Home 组件图标进入 Home Widget 编辑模式。

### 7.3 Settings / 设置

1. Profile / WorldBook / General / Notifications / AI Automation structure.
   Profile / WorldBook / General / Notifications / AI Automation 结构。
2. Backup export/import with rollback-safe behavior.
   备份导出/导入，失败可回滚。
3. Storage consistency diagnostics and repair entry.
   存储一致性诊断与修复入口。
4. WorldBook is currently the global lore setting entry; naming can be adjusted later for immersion, but semantic role must stay clear.
   世界书当前是全局设定入口；名称后续可做沉浸化调整，但语义角色必须保持清晰。

### 7.4 Network / 网络配置

1. Provider URL + key setup and model fetch.
   供应商 URL + key 配置与模型拉取。
2. Presets and report center with readable error grading.
   预设与报错中心，错误分级可读。

### 7.5 Chat / 聊天

1. User send and AI invoke are decoupled.
   用户发送与 AI 调用解耦。
2. `Trigger Reply` is persistent and explicit.
   `Trigger Reply` 常驻且显式。
3. Message actions use long-press/context-menu + bottom action sheet.
   消息操作使用长按/右键 + 底部动作面板。
4. `+` panel supports rich user message types: image, gif, link, location, transfer, voice-card.
   `+` 面板支持富消息类型：图片、gif、链接、位置、转账、语音卡片。
5. Conversation-level AI prefs are configurable: mode, count, style, context, bilingual, quote, voice.
   会话级 AI 偏好可配置：模式、条数、风格、上下文、双语、引用、语音。
6. Structured assistant blocks are supported and sanitized.
   支持结构化助手消息块并做安全清洗。

### 7.6 Contacts and Directory Split / 主通讯录与会话通讯录拆分

1. `/contacts`: global role profile archive (create/edit/delete).
   `/contacts`：全局角色档案（增删改）。
2. `/chat-contacts`: role binding + service-account management.
   `/chat-contacts`：角色绑定与服务号管理。
3. Unbind in chat directory does not delete global profile.
   在会话通讯录中解除绑定不会删除全局档案。

### 7.7 World Kernel and Map / 世界内核与地图

Current / 当前：

1. World kernel is already split into `global worldview` and bindable `knowledge points`, with legacy `worldBook` alias preserved for backup/migration compatibility.
   世界内核已拆为 `global worldview` 与可绑定的 `knowledge points`，旧 `worldBook` 别名仅作备份/迁移兼容保留。
2. Map runs as a simulation-first baseline with location setup, trip lifecycle, persisted history, reminders, and optional AI visual enhancement.
   地图运行在“模拟优先”基线上，具备地点设置、行程生命周期、历史记录、提醒与可选 AI 视觉增强。

Next confirmed direction / 已确认下一方向：

1. Deepen world-kernel consumption across more modules, not only Chat.
   继续把世界内核消费扩展到更多模块，而不只是在 Chat 中使用。
2. Keep map baseline simulation-first; AI usage in map remains optional visual/event enhancement, not a core dependency.
   地图坚持模拟优先；地图内 AI 仅作视觉/事件增强，而不是核心进度依赖。

---

## 8. Data and Storage Model / 数据与存储模型

### 8.1 Core Chat Shapes / Chat 关键数据形态

1. `roleProfiles`
2. `contacts`
3. `conversations`
4. `messagesByConversation`

Message includes status + blocks + quote + `semanticRevision` support.

消息结构包含状态、块、引用与 `semanticRevision` 支持。

World kernel note / 世界内核说明：

1. Current persisted shape: `user.globalWorldview` + `user.knowledgePoints[]`, with mirrored `user.worldBook` alias for backward compatibility.
   当前持久化形态：`user.globalWorldview` + `user.knowledgePoints[]`，并镜像保留 `user.worldBook` 用于旧数据兼容。
2. Ongoing extension shape: worldview and knowledge-point consumption will keep expanding through role/module bindings.
   持续扩展方向：世界观与知识点消费会继续通过角色/模块绑定向更多模块扩展。

### 8.2 Persistence Strategy / 持久化策略

1. Local-first persistence baseline is active.
   本地优先持久化基线已启用。
2. Storage layering migration prep is integrated: sync-first + async fallback + mirror diagnostics.
   分层存储迁移准备已接入：同步优先 + 异步回退 + 镜像诊断。
3. Asset storage hardening is already online as baseline; current work is cross-module polish rather than first-time storage closure.
   素材存储加固基线已上线；当前重点是跨模块打磨，而不是第一次建立存储能力。

---

## 9. AI Interaction Rules / AI 调用规则

1. Manual trigger must stay available and clear.
   手动触发必须始终可用且清晰可见。
2. Autonomous invocation is policy-controlled at global/module/thread levels.
   自主调用受全局/模块/会话级策略控制。
3. Manual trigger has higher practical priority when overlap risk occurs.
   出现重叠风险时，手动触发优先。
4. System language does not rewrite AI-generated content.
   系统语言不会改写 AI 生成内容。
5. Prompt assembly must preserve worldview layering: global worldview always-on, role-bound knowledge points selectively injected.
   提示词组装必须保留世界观分层：全局世界观常驻注入，角色绑定知识点按需注入。
6. Map core progression (location/travel/time) should remain system-computed even when map AI enhancements are enabled.
   即使开启地图 AI 增强，地图核心进度（地点/移动/时间）也必须由系统计算。

---

## 10. Current Documentation Structure / 当前文档结构说明

Start from `docs/README.md` when you are unsure which document to read.

如果不确定该看哪份文档，先从 `docs/README.md` 开始。

Rule of thumb / 使用原则：

1. `docs/roadmap/TODO_ROADMAP.md` is the only live execution board.
   `docs/roadmap/TODO_ROADMAP.md` 是唯一动态执行看板。
2. `docs/roadmap/PROJECT_MODULE_AUDIT.md` is the module candidate pool and maturity audit, not a second roadmap.
   `docs/roadmap/PROJECT_MODULE_AUDIT.md` 是模块候选池与成熟度梳理表，不是第二路线图。
3. `docs/process/AI_WORK_MODE.md` owns workflow and documentation governance.
   `docs/process/AI_WORK_MODE.md` 负责流程规范与文档治理。
4. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md` is the handoff-oriented engineering maturity reference; use it to judge module readiness, file-size hotspots, and decomposition order.
   `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md` 是面向接手者的工程成熟度参考；可用于判断模块成熟度、文件体量热点与拆分顺序。
5. `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md` records concrete functional-code candidates after visual work was parked; use it to choose a safe next code slice without creating a second live roadmap.
   `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md` 记录视觉工作搁置后的具体功能代码候选；用于选择安全的下一刀代码工作，但不作为第二动态路线图。
6. `docs/process/EVENT_WORKFLOW.md`, `docs/architecture/SIMULATION_EVENT_ENGINE.md`, and `docs/overview/IMMERSIVE_EVENT_TODO.md` define the event-specialist track for random, condition-driven, scheduled, and module-owned immersive events.
   `docs/process/EVENT_WORKFLOW.md`、`docs/architecture/SIMULATION_EVENT_ENGINE.md` 与 `docs/overview/IMMERSIVE_EVENT_TODO.md` 定义事件专项，用于随机触发、条件触发、定时触发与模块自有沉浸式事件。
7. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` defines the relationship-growth event standard for affinity, interpersonal progress, character growth, world-aware relationship packs, and future World Hub controls.
   `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` 定义关系成长事件标准，用于好感度、人际关系进展、角色成长、世界观适配关系事件包，以及后续 World Hub 控制/改写。
8. `docs/overview/APPEARANCE_REBUILD_SCOPE.md` is the visual rebuild reference; use it to judge which shell and module surfaces should be fully redesigned instead of incrementally polished.
   `docs/overview/APPEARANCE_REBUILD_SCOPE.md` 是外观重建参考文档；用于判断哪些壳层与模块界面应做完整视觉重建，而不是继续局部打磨。
9. `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md` is the visual style direction brief; use it to judge the desired references and mood for the rebuild.
   `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md` 是视觉风格方向简报；用于判断外观重建应参考哪些 App/系统，以及整体气质应如何收敛。
10. `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md` parks visual-rebuild next steps while current focus returns to functional code.
   `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md` 用于暂存视觉重建后续建议，当前阶段则先回到功能代码推进。

Functional folders / 职能目录：

- `docs/pm/`: PM status and product overview / PM 状态与产品总览
- `docs/roadmap/`: roadmap and module candidate pool / 路线图与模块候选池
- `docs/overview/`: project master guide and handoff references / 项目总说明与接手参考
- `docs/process/`: workflow and operation guide / 流程规范与操作指引
- `docs/architecture/`: architecture and cross-module contracts / 架构与跨模块契约
- `docs/product-decisions/`: current topic-level product decisions / 当前专题级产品决策
- `docs/strategy/`: long-range strategy / 长线策略
- `docs/templates/`: reusable requirement and AI collaboration templates / 可复用需求与 AI 协作模板
- `docs/archive/`: obsolete or historical docs only / 仅存放过时或历史文档

Archived docs / 已归档文档：

1. Superseded planning/status docs were moved to `docs/archive/2026-04-19-doc-audit/`.
   已被替代的计划/状态文档已移入 `docs/archive/2026-04-19-doc-audit/`。
2. Closed Chat identity refactor docs were moved to `docs/archive/obsolete/2026-04-29-chat-identity/`.
   已关闭的 Chat 身份重构文档已移至 `docs/archive/obsolete/2026-04-29-chat-identity/`。

---

## 11. Collaboration Rules for Incoming AI Engineers / 给后续 AI 工程师的协作规则

1. Read this file + `docs/roadmap/TODO_ROADMAP.md` before coding.
   编码前先阅读本文与 `docs/roadmap/TODO_ROADMAP.md`。
2. Treat `docs/roadmap/TODO_ROADMAP.md` as current execution order.
   将 `docs/roadmap/TODO_ROADMAP.md` 视为当前执行顺序来源。
3. Use `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md` when deciding where engineering work is safest or most maintainable to start.
   当判断工程工作从哪里开始最安全、最易维护时，参考 `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`。
4. When visual work is parked and the next question is code implementation, read `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`.
   当视觉工作搁置、下一步问题转为代码实现时，阅读 `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`。
5. When the task involves random/condition/scheduled triggers, simulated events, surprise mode, or event logs, read `docs/process/EVENT_WORKFLOW.md` first.
   当任务涉及随机/条件/定时触发、模拟事件、惊喜模式或事件日志时，先阅读 `docs/process/EVENT_WORKFLOW.md`。
6. For visual-direction decisions, also read `docs/overview/APPEARANCE_REBUILD_SCOPE.md` before treating an existing UI as final.
   涉及视觉方向判断时，也应先阅读 `docs/overview/APPEARANCE_REBUILD_SCOPE.md`，不要默认现有 UI 已接近最终态。
7. When choosing a concrete visual style, read `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md` so module-specific references are preserved.
   选择具体视觉风格时，应阅读 `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md`，确保模块级参考方向被保留。
8. If visual work is intentionally paused, use `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md` as the parked reference and return to the functional roadmap docs.
   如果视觉工作被暂时搁置，使用 `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md` 作为暂存参考，并回到功能路线文档。
9. When route/schema/core behavior changes, update docs in the same PR/commit batch.
   涉及路由、数据结构或核心行为变更时，要在同批次同步文档。
10. Keep product-facing language readable; avoid deep technical shorthand in status summaries.
   面向产品的状态总结要保持可读，避免只写技术缩写。

---

## 12. Change Log / 变更记录

10. 2026-05-17: added `docs/pm/MODULE_NAME_GLOSSARY.md` as the module Chinese/English naming source, and `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md` as the Calendar vs Reminders product boundary. Calendar should become the real schedule/date app; Reminders should own cross-module cues, follow-ups, and world/task objectives before more Calendar relationship facts are added.
    2026-05-17：新增 `docs/pm/MODULE_NAME_GLOSSARY.md` 作为模块中英命名来源，并新增 `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md` 作为 Calendar 与 Reminders 的产品边界。Calendar 回归真实日程/日期应用；Reminders 承接跨模块线索、跟进事项与世界观任务目标，再继续扩展 Calendar 关系事实。

1. 2026-04-06: created as the consolidated master guide from previously split status, architecture, and progress docs.
   2026-04-06：由原先分散的状态、架构与进度文档整合生成本文。
2. 2026-04-12: synced confirmed world-map direction (world kernel split plan + map simulation-first baseline) and clarified current-vs-target data model.
   2026-04-12：同步世界观-地图已确认方向（世界内核拆分计划 + 地图模拟优先基线），并明确当前与目标数据模型差异。
3. 2026-05-02: added explicit reference to `MODULE_MATURITY_AND_ENGINEERING_MAP.md` as the engineering handoff view for module readiness, file-size hotspots, and decomposition order.
   2026-05-02：新增对 `MODULE_MATURITY_AND_ENGINEERING_MAP.md` 的显式引用，作为模块成熟度、文件体量热点与拆分顺序的工程接手视图。
4. 2026-05-02: added explicit reference to `APPEARANCE_REBUILD_SCOPE.md` as the visual rebuild reference for shell and module surfaces.
   2026-05-02：新增对 `APPEARANCE_REBUILD_SCOPE.md` 的显式引用，作为壳层与各模块界面的外观重建参考。
5. 2026-05-02: added explicit reference to `VISUAL_STYLE_DIRECTION_BRIEF.md` as the module-level visual style direction source.
   2026-05-02：新增对 `VISUAL_STYLE_DIRECTION_BRIEF.md` 的显式引用，作为模块级视觉风格方向来源。
6. 2026-05-02: added explicit reference to `DEFERRED_VISUAL_REBUILD_TODO.md` as the parked visual-rebuild TODO archive.
   2026-05-02：新增对 `DEFERRED_VISUAL_REBUILD_TODO.md` 的显式引用，作为暂存视觉重建 TODO 存档。
7. 2026-05-02: added explicit reference to `FUNCTIONAL_CODE_NEXT_STEPS.md` as the post-visual-pause functional-code handoff.
   2026-05-02：新增对 `FUNCTIONAL_CODE_NEXT_STEPS.md` 的引用，作为视觉暂停后的功能代码接手单。
8. 2026-05-16: added the event-specialist track and linked Event Workflow, Simulation Event Engine, and Immersive Event TODO.
   2026-05-16：新增事件专项，并挂载 Event Workflow、Simulation Event Engine 与 Immersive Event TODO。
9. 2026-05-14: synced the current Home Widget Center behavior and preserved the expanded visual/functional handoff document references.
   2026-05-14：同步当前 Home Widget Center 行为，并保留扩展后的视觉与功能接手文档引用。
