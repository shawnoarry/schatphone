# SchatPhone

Updated / 更新时间: 2026-04-12

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
- Exporting backup resets the reminder timer to avoid repeated immediate reminders  
导出备份后会重置提醒计时，避免刚备份就重复提醒
- Worldbook currently acts as global lore context source and is injected into chat prompt assembly  
世界书当前作为全局设定上下文来源，并会注入聊天提示词组装
- Map module currently runs a local simulation baseline (address book + ride estimate) without mandatory external map API  
地图模块当前为本地模拟基线（地址簿 + 打车估算），不依赖外部地图 API 才能运行
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
```

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
- World-kernel split is pending: move from single worldbook text to global worldview + bindable knowledge points.  
世界内核拆分待落地：从单一世界书文本升级为“全局世界观 + 可绑定知识点”。
- Map baseline refactor is pending: keep simulation-first core while reserving optional real-map integration path.  
地图基线重构待落地：核心保持模拟优先，并预留可选现实地图接入路径。

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
- `TODO_ROADMAP.md`: live execution board and next priorities / 动态待办与下一步优先级

Reference docs / 参考文档：
- `docs/reference/ARCHITECTURE.md`: Architecture and boundaries / 架构与边界
- `PRODUCT_MANAGER_PRIORITY_PLAN.md`: Current canonical PM priorities / 当前产品经理标准优先级
- `docs/reference/PROJECT_STATUS.md`: Current status and roadmap / 当前状态与路线图
- `docs/reference/CHAT_PROGRESS.md`: Chat-domain progress and milestones / Chat 域进展与里程碑
- `docs/reference/CHAT_FEATURE_DECISIONS.md`: Chat proposal decisions and pending items / Chat 建议决议与待确认项
- `docs/reference/TODO_PM_STATUS_REPORT.md`: Product-manager-readable TODO status report / 产品经理可读的 TODO 状态汇报
- `docs/reference/SYNC_SNAPSHOT.md`: One-page quick snapshot / 一页快速快照
- `docs/reference/操作指南-新版.md`: Operational guide / 操作流程指南
- `docs/reference/TASK_EXECUTION_PLAN.md`: Task execution board / 任务执行清单
- `docs/strategy/BACKGROUND_ACTIVITY_STRATEGY.md`: Background activity and real-time immersion strategy / 后台活动与现实时间沉浸策略
- `docs/strategy/IMMERSIVE_PHONE_MASTER_BLUEPRINT.md`: Master entry for immersive-phone direction / 沉浸式虚拟手机方向总入口
- `docs/strategy/PROJECT_EXPANSION_BLUEPRINT.md`: Product expansion blueprint / 项目扩展蓝图
- `docs/strategy/STATE_OWNERSHIP_STRATEGY.md`: State ownership and AI generation rules / 状态归属与 AI 生成规则
- `docs/strategy/STORAGE_STRATEGY.md`: Layered storage and save strategy / 分层存储与存档策略
- `docs/reference/AI_WORK_MODE.md`: AI collaboration operating mode / AI 协作工作模式
- `docs/templates/Tips-需求整理模板.md`: Requirement self-check template / 需求自检模板
- `docs/templates/PAGE_REPRO_BRIEF_TEMPLATE.md`: Reusable page recreation brief template / 页面复现需求可复用模板
- `docs/templates/AI-需求话术模板.md`: Prompt template for AI coding assistants / AI 协作话术模板

