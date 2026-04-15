# SchatPhone Product Manager Brief / SchatPhone 产品经理总览
Updated / 更新时间: 2026-04-15

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

## 2.1 Requirement Freeze: Global Asset Hub / 需求冻结：全局素材中台
1. EN: Gallery is the global asset hub, not a chat-only helper.
   中文：相册是全局素材中台，不是仅服务聊天的附属功能。
2. EN: Assets must support cross-module reuse: appearance wallpaper, chat image references, map location visuals, emoji/stickers, role dynamic posts (future forum/IG-like modules), and other immersive visual lanes.
   中文：素材必须支持跨模块复用：美化壁纸、聊天参考图、地图地点图、表情包、角色动态内容（后续论坛/IG类模块）及其他沉浸视觉链路。
3. EN: Custom folders are required. Role-facing lanes (profile photo source, dynamic image pack, emoji/sticker pack, etc.) must support dropdown binding to user-defined folders.
   中文：必须支持自定义文件夹。角色相关链路（形象照来源、动态图包、表情包等）需支持下拉绑定到用户自定义文件夹。
4. EN: Upload is not forced into gallery for every module. Some scenarios can use one-off upload or one-off AI generation; after upload, system should ask whether to import into gallery.
   中文：并非所有场景都强制进相册。部分场景可走单次上传或单次 AI 生图；上传后应询问是否导入素材库。
5. EN: Asset format support should be broad, with enforced size limits for smooth runtime performance.
   中文：素材格式应尽量广泛支持，但必须有体积上限以保证运行流畅性。
6. EN: Bound assets remain deletable/replaceable with explicit second confirmation; if removed, each module must fall back to its own default mode without blocking baseline gameplay.
   中文：被绑定素材允许删除/替换，但需二次确认；删除后各模块必须回退到默认模式，不得阻塞基础玩法。

## 2.2 Binding Model Decision / 绑定模型决策
1. EN: V1 uses "single-folder binding per slot" for stability and maintainability.
   中文：V1 采用“每个槽位绑定单个文件夹”，优先稳定和可维护。
2. EN: "Folder + priority chain" is a reserved extension for V2+, allowing fallback order (e.g., role folder first, shared folder second).
   中文：“文件夹 + 优先级链”作为 V2+ 预留扩展，用于按顺序回退（如先角色文件夹，再公共文件夹）。
3. EN: Data schema must reserve future priority fields even if UI remains single-folder in V1.
   中文：即使 V1 UI 保持单文件夹绑定，数据结构也要预留优先级字段。

## 2.3 Worldview and Map Direction (PM Confirmed) / 世界观与地图方向（产品确认）
1. EN: Current baseline is a single worldbook text, but next iteration must split it into:
   中文：当前基线是单段世界书文本，下一轮必须拆分为：
   - EN: global worldview (always-on global context).
     中文：全局世界观（全局常驻上下文）。
   - EN: knowledge points (targeted patches bindable per role/module).
     中文：知识点（可按角色/模块绑定的定向补丁）。
2. EN: Knowledge points are role-bindable assets and should be managed like reusable data, not hard-coded per chat turn.
   中文：知识点属于可绑定复用的数据资产，不应在每轮对话里手工硬编码。
3. EN: Map module baseline should be simulation-first and low-API:
   中文：地图模块基线应采用模拟优先、低 API 依赖：
   - EN: travel/time/progression must run from system logic.
     中文：移动/时间/进度必须由系统逻辑计算。
   - EN: AI generation in map is optional enhancement (visual/event flavor), not mandatory for baseline gameplay.
     中文：地图中的 AI 生成仅为可选增强（视觉/事件文案），不是基础玩法必需。
4. EN: Architecture should reserve future real-map integration mode, but first release must not depend on external map provider availability.
   中文：架构可预留现实地图接入模式，但首发不可依赖外部地图服务可用性。

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
9. EN: Chat dock pages `preferences/identity/labs` are now usable management tools instead of pure placeholders.
   中文：Chat 底部 `preferences/identity/labs` 页面已是可用管理工具，而非纯占位页。
10. EN: Semantic revision trace policy is configurable (`silent` default, optional `meta_hint`).
    中文：语义修订痕迹策略已可配置（默认 `silent`，可选 `meta_hint`）。

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
6. EN: Worldbook entry is already online in Settings and acts as current global context source.
   中文：设置内已提供世界书入口，当前作为全局上下文来源。

## 5) Priority Refinement (P0) / 需细化优先级（P0）
### P0-4 Rich Message Lane Polish / 富消息链路打磨
Status / 状态: `DONE`
1. EN: Unify validation and failure-state behavior.
   中文：统一输入校验与失败态表现。
2. EN: Front-load form guidance (inline hints + disabled submit before valid input).
   中文：前置表单引导（内联提示 + 输入有效前禁用提交）。
3. EN: Keep `Trigger Reply` lane unaffected while improving user-send quality.
   中文：在优化用户发送质量时保持 `Trigger Reply` 通道不受影响。
4. EN: In-chat edit modal regression flow is covered by component tests and accepted.
   中文：Chat 内编辑弹层流程已由组件测试覆盖并通过验收。

### P0-7 Storage & Backup Hardening / 存储与备份加固
Status / 状态: `DONE`
1. EN: Close binary storage path (IndexedDB-first).
   中文：完成二进制存储路径收口（IndexedDB 优先）。
2. EN: Finalize metadata-first export + optional asset package policy.
   中文：完成“元数据优先 + 可选素材包”导出策略收口。
3. EN: Improve restore diagnostics and keep rollback-safe behavior.
   中文：完善恢复诊断并保持回滚安全。

### P0-5 Gallery Export UX Closure / 相册导出体验收口
Status / 状态: `DONE`
1. EN: Metadata-first export and optional asset package flow are now clearly explained in UI.
   中文：元数据优先导出与可选素材包流程已在 UI 中清晰说明。
2. EN: Backup copy style switch is now available (`direct` / `immersive`) for non-technical readability.
   中文：备份提示文案现支持风格切换（`直白` / `沉浸`），提升非技术可读性。
3. EN: Network report history naming is unified as diagnostics center (`API/Storage`).
   中文：Network 历史入口命名已统一为“诊断报告中心（API/存储）”。

### P1-1 AI Image-Reference Pipeline (Phase-1/2+) / P1-1 AI 参考图链路（第一/二阶段+）
Status / 状态: `IN_PROGRESS`
1. EN: Chat now extracts recent user image messages as reference cues for the same AI call.
   中文：Chat 现可提取近期用户图片消息作为同轮 AI 调用的参考线索。
2. EN: OpenAI-compatible path attempts native URL image transport first; on unsupported response it falls back to context-only reference injection automatically.
   中文：OpenAI 兼容路径先尝试原生 URL 图输入；若不支持会自动回退为“上下文参考图注入”。
3. EN: Gemini path currently uses context-only reference injection to keep compatibility.
   中文：Gemini 路径当前使用“仅上下文参考图注入”，以保证兼容性。
4. EN: Local gallery file assets can now be converted to data URLs (size-guarded) and included as same-call references.
   中文：本地相册文件素材现可在大小守卫下转为 data URL，并作为同轮参考图输入。
5. EN: If local file size exceeds the guard, the pipeline downgrades to text-only cues instead of hard failure.
   中文：当本地文件超过大小上限时，链路会自动降级为文字线索，而不是直接失败。
6. EN: Assistant message metadata now records reference execution result (`mode/count/fallback/provider`) and exposes compact in-thread hints.
   中文：助手消息元信息现会记录参考图执行结果（`模式/数量/回退/供应商`），并在会话里展示精简提示。

### P1-2 Global Asset Hub V2 (Requirement Locked) / P1-2 全局素材中台 V2（需求已冻结）
Status / 状态: `IN_PROGRESS`
1. EN: `DONE` data + baseline UI: custom folder model is online; Gallery has folder CRUD and per-asset quick add/remove folder actions.
   中文：`DONE` 数据与基础 UI：自定义文件夹模型已上线；Gallery 已支持文件夹增删改和素材快速归档/移除。
2. EN: `PARTIAL_DONE` role-slot + chat consumption: Contacts supports profile-image/dynamic-media/emoji/reference folder bindings; Chat now consumes folder-bound assets in preferred-asset options, gallery-send ranking, and AI image-reference fallback.
   中文：`PARTIAL_DONE` 角色槽位 + Chat 消费：通讯录已支持形象照/动态图/表情包/参考图文件夹绑定；Chat 已接入文件夹绑定素材用于会话优先素材候选、素材发送排序与 AI 参考图回退。
3. EN: `DONE (phase-1)` deletion/replacement second-confirmation flow is now online in Gallery for bound folders and bound assets (`delete + URL/file replace`), while forced delete remains available.
   中文：`DONE（第一阶段）` Gallery 已上线绑定文件夹与绑定素材（`删除 + URL/文件替换`）的二次确认流程，同时保留强制删除能力。
4. EN: Implement per-module fallback defaults so missing assets never break baseline usage:
   中文：实现按模块的默认回退策略，确保缺少素材不影响基础使用：
   - EN: role lane fallback = `PARTIAL_DONE` in Chat: when no references are available, thread now defaults to text-first (no image block output), with optional per-thread override for AI-generated image blocks.
     中文：角色链路回退 = Chat 侧 `PARTIAL_DONE`：无参考图时会话默认文字优先（不输出图片消息），并提供每会话可选开关允许 AI 图片消息。
   - EN: appearance fallback = built-in default wallpaper.
     中文：美化链路回退 = 内置默认壁纸。
   - EN: map fallback (future) = icon/default image with optional first-time AI generation prompt.
     中文：地图链路回退（后续）= icon/默认图，首次可询问是否 AI 生图。
5. EN: `IN_PROGRESS` one-off upload lane: Chat now supports "import before send" or "one-off send without import" (with size guard); shopping/takeout and other modules remain pending.
   中文：`IN_PROGRESS` 单次上传链路：Chat 已支持“先入库再发送”或“单次发送不入库”（带体积守卫）；购物/外卖等模块待接入。
6. EN: Keep V1 binding simple (single-folder per slot) while reserving schema fields for future folder-priority chain.
   中文：V1 绑定保持简单（每槽位单文件夹），同时在 schema 中预留未来“文件夹优先级链”字段。
7. EN: `DONE (phase-1)` media-size policy is now centralized for Chat/Gallery: import, replace and one-off send all use unified limits with explicit oversize guidance; video limits are reserved for future modules.
   中文：`DONE（第一阶段）` Chat/Gallery 已统一媒体体积策略：导入、替换、单次发送均接入同一上限与超限提示；视频上限已预留给后续模块。

### P1-3 World Kernel + Map Baseline Refactor / P1-3 世界内核 + 地图基线重构
Status / 状态: `IN_PROGRESS`
1. EN: `DONE (phase-1)` world-kernel data split is landed in store: `globalWorldview` + `knowledgePoints`, with backward compatibility for legacy `worldBook`.
   中文：`DONE（第一阶段）` 世界内核数据拆分已在 store 落地：`globalWorldview` + `knowledgePoints`，并兼容旧版 `worldBook`。
2. EN: `DONE (phase-1)` contacts now support role-level knowledge-point binding, and unbind does not delete source knowledge-point records.
   中文：`DONE（第一阶段）` 通讯录已支持角色级知识点绑定，且解绑不会删除源知识点记录。
3. EN: `DONE (phase-1)` chat prompt assembly is now deterministic: global worldview -> role profile -> bound knowledge points -> conversation context.
   中文：`DONE（第一阶段）` Chat 提示词组装已固定顺序：全局世界观 -> 角色档案 -> 绑定知识点 -> 会话上下文。
4. EN: `DONE (phase-1)` map baseline loop is now runnable without mandatory external API: location setup + trip lifecycle (`ready -> traveling -> arrived/cancelled`) + system-time progression + persisted trip history.
   中文：`DONE（第一阶段）` 地图基线循环已可在不依赖外部 API 的情况下运行：地点设置 + 行程生命周期（`待出发 -> 进行中 -> 到达/取消`）+ 系统时间推进 + 行程记录持久化。
5. EN: `DONE (phase-1)` map fallback defaults are now online: map supports `default/gallery` visual mode and auto-falls back to default icon/visual when bound gallery asset is unavailable.
   中文：`DONE（第一阶段）` 地图默认回退已上线：地图支持 `默认/素材库` 视觉模式，并在绑定素材不可用时自动回退到默认图标/视觉。
6. EN: `DONE (phase-2 baseline)` map AI visual controls are now aligned with module-level automation runtime policy (`master/module/notify-only/quiet-hours`) and include map-side manual trigger + policy feedback.
   中文：`DONE（第二阶段基线）` 地图 AI 视觉控制已与模块级自动化运行策略对齐（`总开关/模块开关/仅通知/安静时段`），并具备地图侧手动触发与策略反馈。
7. EN: `DONE (phase-3 baseline)` optional provider-side map visual generation is now connected under the current policy gate, with deterministic fallback when API key/provider generation is unavailable.
   中文：`DONE（第三阶段基线）` 可选的供应商地图视觉生成已接入当前策略守卫，并在 API key 缺失或供应商生成失败时保持确定性回退。

### P0-1 AI Single-Message Semantic Revision / AI 单条语义修订
Status / 状态: `DONE`
1. EN: Single assistant-message semantic revision path is online.
   中文：单条助手消息语义修订路径已上线。
2. EN: Revised text is reused as next-turn context default.
   中文：修订文本已作为后续轮次上下文默认值复用。
3. EN: Dedicated UI tests and revision-trace policy are now completed.
   中文：专项 UI 测试与修订痕迹策略已完成。

### P0-2 Chat Top-Level Bottom Dock / Chat 一级页底部功能位
Status / 状态: `DONE`
1. EN: Chat list page bottom dock baseline (`Prefs/Identity/Labs`) is online.
   中文：Chat 一级列表页底部功能位基线（偏好/身份/实验室）已上线。
2. EN: `preferences/labs` now provide production-usable settings and maintenance actions.
   中文：`preferences/labs` 现已提供可用的设置与运维动作。
3. EN: Thread entry flow remains unchanged after dock feature expansion.
   中文：底部功能位扩展后，会话进入主流程保持不变。

### P0-3 and P0-6 Closure / P0-3 与 P0-6 收口
Status / 状态: `DONE`
1. EN: Cross-module role/avatar/asset contract APIs are now landed in chat store.
   中文：跨模块角色/头像/素材契约 API 已在 chat store 落地。
2. EN: Contract acceptance checklist is documented in `docs/reference/ROLE_BINDING_CONTRACT.md`.
   中文：契约验收清单已沉淀到 `docs/reference/ROLE_BINDING_CONTRACT.md`。
3. EN: P0 closure is complete; next focus moves to P1 immersive module kickoff.
   中文：P0 收口已完成；下一阶段聚焦 P1 沉浸模块启动。

## 6) PM Decision Checklist / 产品经理待决策清单
1. EN: P0 has no blocking decision now; keep defaults (`direct` copy tone + metadata-first export).
   中文：P0 当前无阻塞决策，保持默认（`直白文案` + `元数据优先导出`）。
2. EN: Asset-hub requirement is now locked by PM (custom folders, cross-module reuse, fallback defaults, one-off upload optional import).
   中文：素材中台需求已由产品侧冻结（自定义文件夹、跨模块复用、默认回退、单次上传可选入库）。
3. EN: Current decision focus moved from "rollout order" to "map baseline rules" (travel-time model, default location set, and fallback visuals) under the already-started `P1-3`.
   中文：当前决策重点已从“上线顺序”转为已启动 `P1-3` 下的“地图基线规则”（行程时间模型、默认地点集、视觉回退方案）。
4. EN: Future naming decision (non-blocking): whether to rename "WorldBook" in UI to a more immersive but understandable label.
   中文：后续命名决策（非阻塞）：是否将 UI 中的“世界书”改为更沉浸且易懂的名称。

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
5. 2026-04-08 EN: Implemented production-ready `preferences/labs` pages and closed `P0-2`.
   2026-04-08 中文：实装 `preferences/labs` 可用页面并完成 `P0-2` 收口。
6. 2026-04-09 EN: Closed `P0-1` and `P0-4` with component-level regression tests and semantic-revision trace policy.
   2026-04-09 中文：通过组件级回归测试与语义修订痕迹策略，完成 `P0-1` 与 `P0-4` 收口。
7. 2026-04-09 EN: Closed `P0-3/P0-6` by landing role-binding contract APIs and integration checklist docs.
   2026-04-09 中文：通过角色绑定契约 API 与接入清单文档落地，完成 `P0-3/P0-6` 收口。
8. 2026-04-09 EN: Closed `P0-5` with backup copy-style switch, diagnostics naming unification, and regression tests.
   2026-04-09 中文：通过备份文案风格切换、诊断命名统一与回归测试，完成 `P0-5` 收口。
9. 2026-04-10 EN: Started `P1-1` phase-1 by landing provider-aware image-reference transport and fallback baseline.
   2026-04-10 中文：通过落地按供应商能力的参考图传输与回退基线，启动 `P1-1` 第一阶段。
10. 2026-04-10 EN: Extended `P1-1` with local file-reference data URL path (size guard + overflow downgrade) and assistant metadata hints.
    2026-04-10 中文：扩展 `P1-1`：新增本地文件参考图 data URL 路径（大小守卫 + 超限降级）与助手元信息提示。
11. 2026-04-10 EN: Locked PM requirements for global asset hub V2 (custom folders, module-slot binding, delete/replace confirmation, fallback defaults, one-off upload optional import).
    2026-04-10 中文：冻结全局素材中台 V2 产品需求（自定义文件夹、模块槽位绑定、删除/替换确认、默认回退、单次上传可选入库）。
12. 2026-04-12 EN: Started P1-2 UI rollout: Contacts now has folder-slot pickers for profile-image/dynamic-media/emoji/reference, and Gallery now has folder CRUD + quick asset-folder operations.
    2026-04-12 中文：已启动 P1-2 UI 落地：通讯录已提供形象照/动态图/表情包/参考图槽位绑定，Gallery 已提供文件夹增删改与素材快速归档操作。
13. 2026-04-12 EN: Landed P1-2 chat-consumption phase-1: folder-bound assets are now consumed inside Chat for thread preferred asset selection, gallery picker ranking badges, and role-bound AI image-reference fallback.
    2026-04-12 中文：已落地 P1-2 Chat 消费第一阶段：文件夹绑定素材已用于会话优先素材选择、素材选择面板排序标识与角色绑定 AI 参考图回退链路。
14. 2026-04-12 EN: Landed role-lane fallback control in Chat thread settings: no-reference turns now default to text-first (image blocks disallowed), with optional per-thread override to allow AI-generated image blocks.
    2026-04-12 中文：已落地 Chat 会话级角色回退控制：无参考图时默认文字优先（禁用图片消息），并提供每会话可选开关允许 AI 图片消息生成。
15. 2026-04-12 EN: Landed Chat one-off media upload lane: when sending local media, user can choose import-before-send or one-off send without importing to gallery.
    2026-04-12 中文：已落地 Chat 单次媒体上传链路：发送本地媒体时，用户可选择“先入库后发送”或“不入库单次发送”。
16. 2026-04-12 EN: PM confirmed world-map direction: split world kernel into global worldview + bindable knowledge points, and keep map simulation-first with optional AI enhancement.
    2026-04-12 中文：产品侧确认世界观-地图方向：世界内核拆分为全局世界观 + 可绑定知识点，地图采用模拟优先并将 AI 作为可选增强。
17. 2026-04-12 EN: Landed `P1-3` phase-1: system store world-kernel split, contacts knowledge-point binding, and deterministic chat prompt injection order.
    2026-04-12 中文：已落地 `P1-3` 第一阶段：system store 世界内核拆分、通讯录知识点绑定、Chat 固定顺序提示词注入。
18. 2026-04-14 EN: Landed map baseline phase-1 for `P1-3`: no-external-API trip loop (start/travel/arrive/cancel), system-time countdown, trip history, and backup snapshot continuity.
    2026-04-14 中文：已落地 `P1-3` 地图基线第一阶段：无外部 API 的行程循环（开始/进行中/到达/取消）、系统时间倒计时、行程记录与备份快照连续性。
19. 2026-04-14 EN: Landed map fallback phase-1: visual mode switch (`default/gallery`), onboarding guidance, gallery asset binding, and auto fallback when bound asset is missing.
    2026-04-14 中文：已落地地图回退第一阶段：视觉模式切换（`默认/素材库`）、首启引导、素材库绑定，以及绑定素材缺失时的自动回退。
20. 2026-04-15 EN: Landed map provider-visual phase-3 baseline: optional provider visual generation is now wired under policy guard with deterministic fallback (`no key`/`provider failed`) and runtime status surfaced in map UI.
    2026-04-15 中文：已落地地图供应商视觉第三阶段基线：可选供应商视觉生成已接入策略守卫，并在 `缺少 key`/`供应商失败` 时保持确定性回退，同时在地图 UI 展示运行状态。
21. 2026-04-14 EN: Landed map automation-alignment baseline: map AI visual refresh now follows system automation runtime policy and supports manual trigger with in-page policy hints.
    2026-04-14 中文：已落地地图自动化对齐基线：地图 AI 视觉刷新现遵循系统自动化运行策略，并支持手动触发与页面内策略提示。
22. 2026-04-15 EN: Landed asset safety phase-1 in Gallery: bound asset replacement (`URL/file`) now uses two-step confirmation and preserves existing bindings by keeping asset IDs stable.
    2026-04-15 中文：已落地 Gallery 素材安全第一阶段：绑定素材替换（`URL/文件`）采用双重确认，并通过保持素材 ID 稳定来保留现有绑定关系。
23. 2026-04-15 EN: Landed media-size policy phase-1: Chat/Gallery now share centralized size limits and oversize copy for one-off send, import and replacement paths.
    2026-04-15 中文：已落地媒体体积策略第一阶段：Chat/Gallery 现统一单次发送、导入、替换的体积上限与超限提示文案。
