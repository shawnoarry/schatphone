# SchatPhone

Updated / 更新时间: 2026-04-19

SchatPhone is a Vue 3 mobile interaction shell that simulates an iOS-like full-screen phone experience.  
SchatPhone 是一个基于 Vue 3 的移动端交互壳项目，目标是构建仿 iOS 的全屏手机体验。

Current focus areas / 当前核心主线：
- Home editable layout (entry apps + widgets) / Home 可编辑布局（入口与 Widget）
- Chat main workflow / Chat 主功能链路
- Settings as configuration center (network/theme/customization) / Settings 分层配置能力（网络/主题/自定义）
- Lock-screen immersion + notification loop / 锁屏沉浸态与通知闭环
- Global system-language unification (UI only) / 全局系统语言统一（仅系统 UI）
- Immersive real-time phase (scheduler + restore-time settlement) / 现实时间沉浸阶段（调度器 + 恢复补算）
- System-owned truth continuity and storage layering / 系统真值连续性与分层存储
- World-kernel evolution (global worldview + role-bindable knowledge points) / 世界内核演进（全局世界观 + 角色可绑定知识点）
- Map simulation-first baseline with optional AI enhancement / 地图模拟优先基线（AI 仅可选增强）
- Real web-push delivery baseline (PWA + service worker + push relay server) / 真推送基线（PWA + service worker + 推送中继服务）

## Current Capabilities / 当前能力

- 5-page Home layout, long-press edit mode, cross-page drag-and-drop  
支持 5 屏 Home、长按编辑、跨屏拖拽排序
- `app_*` entries are locked from hide/delete and can only be repositioned  
`app_*` 功能入口不可隐藏/删除，仅可换位
- Lock screen is the default entry route (`/` -> `/lock`) with route guard by lock state  
默认进入锁屏（`/` -> `/lock`），并由锁定状态路由守卫控制解锁前访问
- Lock screen supports notification banner + stacked list + tap-to-open-and-unlock  
锁屏支持通知横幅、通知堆叠列表、点击通知直接解锁并进入目标页面
- Custom widgets support: `1x1/2x1/2x2/4x2/4x3`, code paste, JSON import  
支持自定义 Widget 尺寸、代码粘贴与 JSON 导入
- Network page supports API kind detection, model pull, preset save/switch  
Network 支持 API 类型识别、模型拉取、预设保存与切换
- Chat supports manual trigger flow, cancel/retry, and error classification  
Chat 支持手动触发、取消/重试、错误分级提示
- Chat supports per-thread AI settings (suggestion toggle, context turns, bilingual output, quote mode, virtual voice)  
Chat 支持会话级 AI 设置（可选回复开关、上下文轮数、双语输出、引用模式、虚拟语音）
- Chat thread now includes message action menu (quote/edit/delete/copy/re-roll) with role-based constraints  
Chat 对话页已支持消息操作菜单（引用/编辑/删除/复制/重 roll），并带角色约束
- Chat message actions now use long-press/context-menu + bottom action sheet (bubble top-right entry removed)  
Chat 消息操作现使用长按/右键 + 底部动作面板（已移除气泡右上角入口）
- Chat input row now uses `+` panel as user-send hub (image/gif/link/location/transfer/voice-card) while keeping `Trigger Reply` persistent  
Chat 输入区现以 `+` 面板作为用户发送中枢（图片/gif/链接/位置/转账/语音卡片），并保留 `Trigger Reply` 常驻
- Chat directory supports search and quick filtering for role/service entries  
会话通讯录已支持角色/服务对象的搜索与快速筛选
- Chat directory supports batch mode for role/service entries (multi-select + bulk actions)  
会话通讯录已支持角色/服务对象批量模式（多选 + 批量操作）
- Chat directory now includes template preset center (role-meta presets + service presets)  
会话通讯录现已包含模板预设中心（角色会话变量模板 + 服务号模板）
- User message status flow supports delivered/read transitions with AI-side typing indicator  
用户消息状态支持“已送达 -> 已读”切换，并提供 AI 侧“对方正在输入”系统态提示
- Assistant messages support structured blocks (text/virtual voice/module link/virtual transfer/virtual image/mini scene)  
助手消息支持结构化块（文本/虚拟语音/模块链接/虚拟转账/虚拟图片/迷你互动场景）
- Real-time scheduler + restore-time settlement + autonomous control policy are integrated  
现实时间调度器 + 恢复时补算 + 自主调用控制策略已接入
- System-owned truth layer is integrated and injected into prompt context  
系统真值层已接入并注入提示词上下文
- Avatar hierarchy baseline is integrated (`thread > module > global > fallback`) with module/thread override entries in Chat  
头像层级基线已接入（`会话 > 模块 > 全局 > 兜底`），并在 Chat 提供模块级/会话级覆写入口
- Global system UI language supports `zh-CN/en-US/ko-KR` with normalized persistence  
全局系统 UI 语言支持 `zh-CN/en-US/ko-KR`，并带持久化归一化处理
- i18n foundation is implemented via `src/lib/locale.js` + `src/composables/useI18n.js`  
国际化基础已通过 `src/lib/locale.js` + `src/composables/useI18n.js` 落地
- System language applies to menus/settings/UI labels only, not AI-generated chat content  
系统语言仅作用于菜单/设置/UI 文案，不改写 AI 生成的聊天内容
- Settings About page now provides storage consistency check/repair for localStorage and IndexedDB mirror drift  
Settings 关于页现已提供 localStorage 与 IndexedDB 镜像的一致性检查与漂移修复
- Settings General supports periodic backup reminders (1 hour to 30 days) via system-style notifications instead of pop-up dialogs  
Settings 通用页支持周期性备份提醒（1 小时到 30 天），提醒通过系统推送样式通知呈现，不使用弹窗
- Settings Notification now supports real push subscription, permission state, server URL configuration, and test push actions  
Settings 通知页现已支持真推送订阅、权限状态查看、服务端地址配置与测试推送
- PWA/web-push baseline is now online: app registers a service worker, exposes manifest metadata, and can deliver real system notifications through the lightweight push relay server  
PWA/Web Push 基线现已上线：应用会注册 service worker、提供 manifest，并可通过轻量推送中继服务发送真正的系统通知
- Push refinement is now online: Settings can check server health and resync the current browser subscription when relay state drifts  
推送细化现已上线：Settings 可检查服务健康状态，并在中继记录漂移时重同步当前浏览器订阅
- Push diagnostics are now unified into the diagnostics center, and app startup performs a silent health-check/resync self-heal for enabled real-push setups  
推送诊断现已接入统一诊断中心；对于已开启的真推送配置，应用启动时也会执行静默健康检查与重同步自愈
- Scheduled real-push baseline is now online: the push server can queue timed deliveries, and Map trips can arm a background arrival reminder that still lands after the page is closed  
真推送定时基线现已上线：推送服务端可排队定时送达，地图行程也可布置后台到达提醒，即使页面关闭后仍可按时落到系统通知
- Chat scheduled-push baseline is now online: auto-invoke threads can mirror their next trigger into the push queue, so role reminders can still arrive as system notifications after the page is closed  
Chat 定时推送基线现已上线：启用自动触发的会话会将下一次触发时间镜像到推送队列，因此页面关闭后角色提醒仍可作为系统通知到达
- External push display modes are now user-selectable in Settings (`Minimal / Standard / Preview`) and apply to both instant relays and scheduled deliveries  
外部系统推送显示模式现已可在 Settings 中切换（`极简 / 标准 / 预览`），并同时作用于即时推送与定时推送
- App-icon customization now covers all built-in home modules, and the selected glyph/accent also flows into in-shell notification rendering  
功能图标自定义现已覆盖全部内建首页模块，所选图标与色系也会同步影响壳内通知渲染
- Current scope note: real push delivery is available, but fully closed-page event generation still depends on future server-side automation/orchestration  
当前范围说明：真正的推送送达已经可用，但“页面完全关闭后仍自动生成事件”仍依赖后续服务端自动化/编排
- Exporting backup resets the reminder timer to avoid repeated immediate reminders  
导出备份后会重置提醒计时，避免刚备份就重复提醒
- WorldBook entry now manages `global worldview + knowledge points`, and Chat already assembles prompts in the order `global worldview -> role profile -> bound knowledge points -> conversation context`  
世界书入口现已管理 `全局世界观 + 知识点`，Chat 也已按 `全局世界观 -> 角色档案 -> 绑定知识点 -> 会话上下文` 的顺序组装提示词
- Map module now runs a persisted local simulation baseline (location setup + trip lifecycle + countdown + arrival reminders) without mandatory external map API  
地图模块现已具备可持久化的本地模拟基线（地点设置 + 行程生命周期 + 倒计时 + 到达提醒），不依赖外部地图 API 也能运行
- Files and More pages are available as MVP modules  
Files / More 已升级为可用 MVP 页面
- Key input pages provide explicit Save actions with persistence  
关键输入页保留显式保存按钮并持久化
- CI + GitHub Pages deployment are configured  
已接入 CI 与 GitHub Pages 自动部署

## Tech Stack / 技术栈

- Vue 3 (`script setup`)
- Vite 7
- Vue Router (Hash mode) / Vue Router（Hash 模式）
- Pinia
- Tailwind CSS v4 (`@tailwindcss/vite`)
- ESLint + Prettier
- Vitest + Vue Test Utils

## Local Development / 本地开发

```bash
npm install
npm run dev
npm run push:server
```

Push development note / 推送开发说明：
- Run `npm run push:server` alongside `npm run dev` when testing real push locally.  
  本地测试真推送时，需要同时运行 `npm run push:server` 与 `npm run dev`。
- The first `npm run push:keys` or `npm run push:server` run creates local VAPID keys in `server/data/`, and those JSON files are ignored by Git.  
  首次运行 `npm run push:keys` 或 `npm run push:server` 时，会在 `server/data/` 生成本地 VAPID 密钥，这些 JSON 文件已被 Git 忽略。

## Quality Checks / 质量检查

```bash
npm run lint
npm run build
npm run test
```

## Experimental Flags / 实验开关

- `VITE_ENABLE_LAYOUT_EDIT`: default `false`; keeps Home layout drag-edit hidden for normal users  
`VITE_ENABLE_LAYOUT_EDIT`：默认 `false`，用于让 Home 拖拽布局编辑能力在普通用户场景保持关闭
- To enable in development, set both:  
开发调试时需同时满足两项：
  - `.env` contains `VITE_ENABLE_LAYOUT_EDIT=true`
  - browser `localStorage` contains `schatphone:layout_edit_enabled=true`

## Current Gap Snapshot / 当前缺口快照

- P1-2 asset hub V2 closure remains active (safety confirmations, fallback completion, and cross-module one-off upload expansion).  
P1-2 素材中台 V2 仍在进行（安全确认流、回退策略收口、跨模块单次上传扩展）。
- Map baseline is online, but deeper gameplay/event value is still pending (movement rewards, area unlocks, ambient events, and richer low-API progression).  
地图基线已经上线，但更深的玩法/事件价值仍待补完（移动奖励、区域解锁、环境事件、以及更丰富的低 API 进度层）。
- Fully closed-page autonomous event generation is still future work: current real push solves delivery, but not full server-side event creation.  
“页面彻底关闭后仍自动生成事件”仍是后续工作：当前真推送解决的是送达，不是完整的服务端事件生成。

## Routes / 当前路由

- `/lock`
- `/home`
- `/settings`
- `/appearance`
- `/network`
- `/profile`
- `/worldbook`
- `/chat`
- `/chat-contacts`
- `/chat/:id`
- `/contacts`
- `/gallery`
- `/phone`
- `/map`
- `/calendar`
- `/wallet`
- `/stock`
- `/files`
- `/more`

## Documentation Index / 文档索引

Primary entry docs / 主入口文档：
- `PROJECT_MASTER_GUIDE.md`: project-wide master explanation for product + AI engineers / 面向产品经理与 AI 工程师的项目总说明
- `PRODUCT_MANAGER_PROJECT_BRIEF.md`: PM-facing overview, current stack, delivered scope, and priorities / 面向产品经理的总览、技术栈、已实现范围与当前优先级
- `TODO_ROADMAP.md`: live execution board and next priorities / 动态待办与下一步优先级

Reference docs / 参考文档：
- `docs/reference/ARCHITECTURE.md`: Architecture and boundaries / 架构与边界
- `docs/reference/CHAT_FEATURE_DECISIONS.md`: Chat proposal decisions and pending items / Chat 建议决议与待确认项
- `docs/reference/TODO_PM_STATUS_REPORT.md`: Product-manager-readable TODO status report / 产品经理可读的 TODO 状态汇报
- `docs/reference/操作指南-新版.md`: Operational guide / 操作流程指南
- `docs/reference/NOTIFICATION_AND_APP_ICON_REQUIREMENTS.md`: Notification and app-identity rules / 通知与功能身份规则
- `docs/reference/ROLE_BINDING_CONTRACT.md`: Cross-module role-binding contract / 跨模块角色绑定契约
- `docs/strategy/BACKGROUND_ACTIVITY_STRATEGY.md`: Background activity and real-time immersion strategy / 后台活动与现实时间沉浸策略
- `docs/strategy/IMMERSIVE_PHONE_MASTER_BLUEPRINT.md`: Master entry for immersive-phone direction / 沉浸式虚拟手机方向总入口
- `docs/strategy/PROJECT_EXPANSION_BLUEPRINT.md`: Product expansion blueprint / 项目扩展蓝图
- `docs/strategy/STATE_OWNERSHIP_STRATEGY.md`: State ownership and AI generation rules / 状态归属与 AI 生成规则
- `docs/strategy/STORAGE_STRATEGY.md`: Layered storage and save strategy / 分层存储与存档策略
- `docs/reference/AI_WORK_MODE.md`: AI collaboration operating mode / AI 协作工作模式
- `docs/templates/Tips-需求整理模板.md`: Requirement self-check template / 需求自检模板
- `docs/templates/PAGE_REPRO_BRIEF_TEMPLATE.md`: Reusable page recreation brief template / 页面复现需求可复用模板
- `docs/templates/AI-需求话术模板.md`: Prompt template for AI coding assistants / AI 协作话术模板
- `docs/templates/PM_REQUIREMENT_TEMPLATE.md`: PM-facing reusable requirement brief template / 面向产品经理的通用需求模板
- `docs/templates/VISUAL_REDESIGN_BRIEF_TEMPLATE.md`: Visual redesign requirement template / 视觉改版需求模板
- `docs/templates/ENTRY_NAVIGATION_AUDIT_TEMPLATE.md`: Entry and navigation issue template / 入口与导航问题模板

Archived docs / 已归档文档：
- `docs/archive/2026-04-19-doc-audit/`: superseded planning/status docs kept for historical lookup only / 已被替代的计划与状态文档，仅保留历史参考

