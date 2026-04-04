# SchatPhone 架构说明

Updated / 更新时间: 2026-04-04

## 1. Architecture Goals / 架构目标

SchatPhone follows a "mobile shell + configurable capability center + AI chat domain" architecture.  
SchatPhone 采用“移动端交互壳 + 可配置能力中心 + AI 对话域”架构。

Primary goals / 优先目标：
- Smooth interaction on Lock/Home/Chat/Settings main path / 保证 Lock/Home/Chat/Settings 主链路流畅
- User-configurable API/theme/layout/language / API、主题、布局、系统语言可配置
- Extensible module model without rewriting foundations / 新模块扩展不重做底层
- Controlled AI cost with explicit user triggers / AI 调用成本可控，强调用户显式触发
- Keep immersive lock-screen notification experience / 保持锁屏沉浸通知体验

## 2. Tech Stack and Versions / 技术栈与版本

- Vue: `3.5.24`
- Vue Router: `5.0.2` (Hash history) / Hash 模式
- Pinia: `3.0.4`
- Vite: `7.2.4+`
- Tailwind CSS: `4.1.18` (`@tailwindcss/vite`)
- Test: Vitest `1.6.0` + jsdom
- Lint/Format: ESLint 9 + Prettier 3
- UI helpers / UI 辅助: Font Awesome, marked

## 3. Layered Design / 分层设计

### 3.1 App Shell Layer / App Shell 层

Responsibility / 职责：global container, route switching, theme/style/language shell behavior.  
全局容器、路由切换、主题样式与系统语言壳层行为。

- `src/App.vue`
- `src/main.js`
- `src/router/index.js`

Key points / 关键点：
- Hash router for GitHub Pages compatibility / 使用 Hash 路由适配 GitHub Pages
- App-level CSS variable and custom CSS injection / App 层统一注入主题变量与自定义 CSS
- Default entry route redirects to lock screen (`/` -> `/lock`)  
默认入口路由重定向到锁屏（`/` -> `/lock`）
- Lock-state route guard prevents non-lock access when device is locked  
锁定状态下阻止访问非锁屏路由

### 3.2 State Layer (Pinia) / 状态层（Pinia）

Responsibility / 职责：domain-split stores to avoid one oversized store.  
按领域拆分状态，避免单体大 Store。

- `src/stores/system.js`
  - `settings.api`: `url/key/model/presets`
  - `settings.appearance`:  
    `theme/wallpaper/customCss/customVars/homeWidgetPages/customWidgets/lockClockStyle`
  - `settings.system`: `language/timezone/notifications`
  - `notifications`: lock-screen notification queue / 锁屏通知队列
  - `truthState`: system-owned truth entities/events for relationship continuity / 系统真值实体与事件时间线（关系连续性）
  - `isLocked`: lock state flag / 锁定状态标记
  - `user`: profile, worldbook, chat status / 用户资料、世界书、聊天状态
- `src/stores/chat.js`
  - global role profiles: `roleProfiles`
  - chat contact kind: `role/group/service/official`
  - role contact bindings: `profileId`, `relationshipLevel`, `relationshipNote`
  - conversations: `conversations`
  - messages: `messagesByConversation`
- `src/stores/map.js`

### 3.3 Service and Utility Layer / 服务与工具层

Responsibility / 职责：external API integration, persistence abstraction, locale utilities.  
统一外部调用、本地持久化与语言工具能力。

- `src/lib/ai.js`
  - API kind detection / API 类型识别
  - model fetching / 模型拉取
  - unified chat call entry / 统一聊天调用入口
  - unified error mapping / 统一错误分级映射
- `src/lib/persistence.js`
  - localStorage read/write with version envelope / localStorage 读写与版本封装
- `src/lib/locale.js`
  - system language normalization / 系统语言归一化
  - language-base resolution / 语言基类解析
  - localized text fallback / 本地化文案回退
- `src/lib/chat-response.js`
  - fenced/embedded JSON candidate extraction / 代码块与嵌入式 JSON 候选提取
  - resilient assistant payload parsing / 助手响应稳健解析
  - payload text fallback extraction (`content/text/message/output_text`) / payload 文本回退提取（`content/text/message/output_text`）
- `src/composables/useI18n.js`
  - UI translation helper (`t`) and language state access  
  UI 文案翻译方法（`t`）与系统语言状态访问

Rule / 规则：components must not call AI fetch directly; use `src/lib/ai.js` only.  
组件禁止直连 AI fetch，统一走 `src/lib/ai.js`。

### 3.4 View Layer / 页面层

Responsibility / 职责：screen orchestration and user interaction.  
负责页面编排与交互，不承载协议细节。

Core routes / 核心路由：
- Lock: `/lock`
- Home: `/home`
- Settings: `/settings`
- Network: `/network`
- Appearance: `/appearance`
- Chat list: `/chat`
- Chat directory: `/chat-contacts`
- Chat thread: `/chat/:id`

## 4. Lock and Notification Architecture / 锁屏与通知架构

### 4.1 Lock Flow / 锁屏流转

- Enter `/lock` -> set `isLocked = true` / 进入 `/lock` 时设置 `isLocked = true`
- Attempting to access non-lock route while locked -> redirect to `/lock`  
锁定时访问非锁屏路由会被重定向到 `/lock`
- Unlock action sets `isLocked = false` and navigates to target route  
解锁动作设置 `isLocked = false` 并跳转目标页面

### 4.2 Notification Flow / 通知流转

- AI reply completes in locked state -> append system notification  
锁定状态下 AI 回复完成 -> 写入系统通知
- Lock screen shows banner animation for latest unread notification  
锁屏对最新未读通知显示横幅动画
- User can tap banner/list card to mark read, unlock, and open route  
用户可点横幅或列表卡片，标记已读后解锁并进入目标页面
- Notification data is persisted locally  
通知数据本地持久化

## 5. Chat Domain Architecture / Chat 领域架构

### 5.1 Data Structures / 数据结构

- Role profile (global) / 全局角色档案：`id`, `name`, `role`, `isMain`, `avatar`, `bio`, `tags`
- Chat contact (binding or service) / 会话对象（绑定或服务）：`id`, `name`, `kind`, `profileId`, `role`, `bio`, `serviceTemplate`, `relationshipLevel`, `relationshipNote`
- Conversation / 会话：`draft`, `unread`, `lastMessage`, `updatedAt`, `pinned`, `aiPrefs`, `proactiveOpenedAt`
- Message / 消息：`id`, `role`, `content`, `blocks`, `quote`, `aiMeta`, `createdAt`, `editedAt`, `status`
- `aiMeta.rerollOf` marks reroll lineage for replaced assistant messages  
`aiMeta.rerollOf` 用于标记重roll后助手消息的来源链路
- Truth entity / 真值实体：`entityKey`, `affinity`, `trust`, `distance`, `dependency`, `tension`, `relationshipStage`, counters/timestamps
- Truth event / 真值事件：`id`, `entityKey`, `action`, `payload`, `at`
- Message status / 消息状态：`sending/sent/failed/delivered/read`
- Assistant block types / 助手消息块类型：  
  `text`, `voice_virtual`, `module_link`, `transfer_virtual`, `image_virtual`, `mini_scene`
- Conversation AI prefs / 会话级 AI 设置：  
  `suggestedRepliesEnabled`, `contextTurns`, `bilingualEnabled`, `secondaryLanguage`,  
  `allowQuoteReply`, `allowSelfQuote`, `virtualVoiceEnabled`,  
  `replyMode`, `replyCount`, `responseStyle`, `proactiveOpenerEnabled`, `proactiveOpenerStrategy`

### 5.2 Interaction Model / 交互模型

- User messages are persisted locally first / 用户消息先落本地消息流
- AI replies support manual trigger and optional auto trigger / AI 支持手动触发与可选自动触发
- Supports continuous trigger in one thread / 支持同一会话连续触发
- Supports cancel and retry / 支持取消与失败重试
- One API call can produce multiple assistant messages (controlled by replyCount)  
  单次 API 调用可生成多条助手消息（由 replyCount 控制）
- Message action menu is available in-thread: quote/copy/edit/delete/reroll  
  会话页支持消息操作菜单：引用/复制/编辑/删除/重roll
- Reroll model / 重roll模型：  
  use context before the target assistant message, then replace target message in place  
  读取目标助手消息之前上下文，再原位替换目标消息
- User message state transitions / 用户消息状态切换：  
  default `delivered` before trigger, switch to `read` when AI request starts  
  默认触发前为 `已送达`，AI 请求开始时切换为 `已读`
- Typing indicator is system-state UI (not stored as message node)  
  “对方正在输入”作为系统态 UI 展示，不写入消息列表数据
- Runtime writes truth events on key actions (`user_message`, `manual_trigger`, `auto_trigger`, `assistant_reply`, `reroll`, `notify_only_skip`, `resume_settlement`).  
  运行态会在关键动作写入真值事件（`user_message`、`manual_trigger`、`auto_trigger`、`assistant_reply`、`reroll`、`notify_only_skip`、`resume_settlement`）。
- Prompt assembly reads a truth snapshot (`getChatTruthSnapshot`) to keep relationship continuity across providers.  
  提示词组装会读取真值快照（`getChatTruthSnapshot`），保证跨供应商关系连续性。
- Structured assistant payload normalization now enforces safe route/url fields and context-safe quote resolution.  
  结构化助手消息归一化已强制 route/url 安全校验，并通过上下文候选做引用安全解析。
- Assistant parser now tolerates fenced/embedded JSON outputs and downgrades safely when parsing fails.  
  助手解析器现可容错代码块/嵌入式 JSON 输出，并在解析失败时安全降级。
- Assistant message normalization guarantees a primary text block for readability even when upstream payload only contains secondary/fallback fields.  
  助手消息归一化保证主文本块存在，即使上游 payload 仅返回次级文本或回退字段也可稳定显示。
- Markdown blocks are sanitized before rendering to avoid unsafe HTML execution via `v-html`.  
  Markdown 文本块在渲染前会进行 HTML 清洗，避免 `v-html` 执行不安全内容。
- Service/official templates managed in-thread / 服务号/公众号模板在会话页内管理
- Per-thread AI settings are edited in Chat layered menu and persisted in store  
  会话级 AI 设置在 Chat 分级菜单中编辑并持久化
- Responsibility split / 职责拆分：`/contacts` manages global role profiles; `/chat-contacts` manages role bindings and service account CRUD  
  `/contacts` 负责全局角色档案；`/chat-contacts` 负责角色绑定与服务号增删改
- Directory baseline / 通讯录基线：`/chat-contacts` includes search/filter and batch mode for role/service entries  
  `/chat-contacts` 已支持角色/服务对象搜索筛选与批量操作基线

### 5.3 Language Boundary in Chat / Chat 语言边界

- System language controls UI labels and menus only / 系统语言仅控制界面标签与菜单
- AI-generated content remains model-driven and context-driven  
AI 生成内容保持模型与上下文驱动，不做系统语言强改写
- Bilingual output is controlled by per-thread AI preferences  
双语输出由会话级 AI 偏好控制

## 6. Home Layout System / Home 布局系统

Data model / 数据模型：`settings.appearance.homeWidgetPages` (2D array / 二维数组)

Rules / 规则：
- `app_*` entries cannot be hidden/deleted / `app_*` 不可隐藏或删除
- Widgets and custom widgets can be hidden / Widget 与自定义 Widget 可隐藏
- Default 5 pages, with pages 3-5 reserved / 默认 5 屏，后 3 屏预留
- Layout edit is gated by env + localStorage feature flags  
布局编辑能力受 env + localStorage 双开关控制

## 7. Data and Security Boundaries / 数据与安全边界

- Local-only persistence by default / 默认本地持久化
- No platform-managed cloud hosting / 不做平台云托管
- Context is sent only on explicit user trigger / 仅在用户触发时发送上下文
- Conversation deletion is local deletion / 删除会话对象属于本地删除
- Backup import in Settings applies store-level restore with rollback-safe fallback on parse/shape failure  
  Settings 中的备份导入采用 Store 级恢复，解析/结构失败时自动回滚
- Future cloud sync must include auth and conflict policy / 云同步需补授权和冲突策略

## 8. Engineering and Deployment / 工程化与部署

- CI: `.github/workflows/ci.yml` (`lint + build`)
- Deploy: `.github/workflows/deploy.yml` (GitHub Pages)
- URL / 部署地址：`https://shawnoarry.github.io/schatphone/`

## 9. Extension Rules / 扩展规范

1. Create View first, then register route, then evaluate Home entry.  
先建 View，再注册 Router，再评估是否上 Home 入口。
2. Put config data in `system` store and business data in domain stores.  
配置数据进 `system`，业务数据进对应域 store。
3. Prefer CSS variables over hard-coded style values.  
主题优先走 CSS 变量，避免硬编码。
4. Route all AI requests through `src/lib/ai.js`.  
所有 AI 请求统一走 `src/lib/ai.js`。
5. If route/schema/core interaction changes, update docs in same PR.  
涉及路由/数据结构/主交互改动时，同步更新文档。
6. If lock/i18n behavior changes, sync `README.md`, `PROJECT_STATUS.md`, and `SYNC_SNAPSHOT.md`.  
涉及锁屏或系统语言行为改动时，同步更新 `README.md`、`PROJECT_STATUS.md`、`SYNC_SNAPSHOT.md`。
