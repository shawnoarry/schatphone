# SchatPhone 架构说明

Updated / 更新时间: 2026-02-23

## 1. Architecture Goals / 架构目标

SchatPhone follows a "mobile shell + configurable capability center + AI chat domain" architecture.  
SchatPhone 采用“移动端交互壳 + 可配置能力中心 + AI 对话域”架构。

Primary goals / 优先目标：
- Smooth interaction on Home/Chat/Settings main path / 保证 Home/Chat/Settings 主链路流畅
- User-configurable API/theme/layout / API、主题、布局可配置
- Extensible module model without rewriting foundations / 新模块扩展不重做底层
- Controlled AI cost with explicit user triggers / AI 调用成本可控，强调用户显式触发

## 2. Tech Stack and Versions / 技术栈与版本

- Vue: `3.5.24`
- Vue Router: `5.0.2` (Hash history) / Hash 模式
- Pinia: `3.0.4`
- Vite: `7.2.4`
- Tailwind CSS: `4.1.18` (`@tailwindcss/vite`)
- Test: Vitest `1.6.0` + jsdom
- Lint/Format: ESLint 9 + Prettier 3
- UI helpers / UI 辅助: Font Awesome, marked

## 3. Layered Design / 分层设计

### 3.1 App Shell Layer / App Shell 层

Responsibility / 职责：global container, route switching, theme and style injection.  
全局容器、路由切换、主题与样式注入。

- `src/App.vue`
- `src/main.js`
- `src/router/index.js`

Key points / 关键点：
- Hash router for GitHub Pages compatibility / 使用 Hash 路由适配 GitHub Pages
- App-level CSS variable injection / App 层统一注入主题变量与自定义 CSS

### 3.2 State Layer (Pinia) / 状态层（Pinia）

Responsibility / 职责：domain-split stores to avoid one oversized store.  
按领域拆分状态，避免单体大 Store。

- `src/stores/system.js`
  - `settings.api`: `url/key/model/presets`
  - `settings.appearance`: `theme/wallpaper/customCss/customVars/homeWidgetPages/customWidgets`
  - `user`: profile, worldbook, chat status / 用户资料、世界书、聊天状态
- `src/stores/chat.js`
  - contact kind: `role/group/service/official`
  - conversations: `conversations`
  - messages: `messagesByConversation`
- `src/stores/map.js`

### 3.3 Service Layer / 服务层

Responsibility / 职责：external API integration and persistence abstraction.  
统一外部调用与本地持久化。

- `src/lib/ai.js`
  - API kind detection / API 类型识别
  - model fetching / 模型拉取
  - unified chat call entry / 统一聊天调用入口
  - unified error mapping / 统一错误分级映射
- `src/lib/persistence.js`
  - localStorage read/write with version envelope / localStorage 读写与版本封装

Rule / 规则：components must not call AI fetch directly; use `src/lib/ai.js` only.  
组件禁止直连 AI fetch，统一走 `src/lib/ai.js`。

### 3.4 View Layer / 页面层

Responsibility / 职责：screen orchestration and user interaction.  
负责页面编排与交互，不承载协议细节。

Core routes / 核心路由：
- Home: `/home`
- Settings: `/settings`
- Network: `/network`
- Appearance: `/appearance`
- Chat list: `/chat`
- Chat directory: `/chat-contacts`
- Chat thread: `/chat/:id`

## 4. Chat Domain Architecture / Chat 领域架构

### 4.1 Data Structures / 数据结构

- Contact / 对话对象：`id`, `name`, `kind`, `role`, `bio`, `serviceTemplate`
- Conversation / 会话：`draft`, `unread`, `lastMessage`, `updatedAt`, `pinned`, `aiPrefs`, `proactiveOpenedAt`
- Message / 消息：`id`, `role`, `content`, `blocks`, `quote`, `aiMeta`, `createdAt`, `status`
- Message status / 消息状态：`sending/sent/failed/delivered/read`
- Assistant block types / 助手消息块类型：
  `text`, `voice_virtual`, `module_link`, `transfer_virtual`, `image_virtual`, `mini_scene`
- Conversation AI prefs / 会话级 AI 设置：
  `suggestedRepliesEnabled`, `contextTurns`, `bilingualEnabled`, `secondaryLanguage`,
  `allowQuoteReply`, `allowSelfQuote`, `virtualVoiceEnabled`,
  `replyMode`, `replyCount`, `responseStyle`, `proactiveOpenerEnabled`, `proactiveOpenerStrategy`

### 4.2 Interaction Model / 交互模型

- User messages are persisted locally first / 用户消息先落本地消息流
- AI replies support manual trigger and optional auto trigger / AI 支持手动触发与可选自动触发
- Supports continuous trigger in one thread / 支持同一会话连续触发
- Supports cancel and retry / 支持取消与失败重试
- One API call can produce multiple assistant messages (controlled by replyCount)  
  单次 API 调用可生成多条助手消息（由 replyCount 控制）
- User message state transitions / 用户消息状态切换：
  default `delivered` before trigger, switch to `read` when AI request starts  
  默认触发前为 `已送达`，AI 请求开始时切换为 `已读`
- Typing indicator is system-state UI (not stored as message node)  
  “对方正在输入”作为系统态 UI 展示，不写入消息列表数据
- Service/official templates managed in-thread / 服务号/公众号模板在会话页内管理
- Per-thread AI settings are edited in Chat layered menu and persisted in store  
  会话级 AI 设置在 Chat 分级菜单中编辑并持久化
- Proactive opener strategy is tracked by `proactiveOpenedAt` to prevent unwanted repeats  
  主动开场通过 `proactiveOpenedAt` 记录触发状态，避免重复触发

### 4.3 Conversation Taxonomy / 会话对象分层

- `role/group`: immersive role-play conversations / 角色与群聊
- `service/official`: info and operation-driven conversations / 服务号与公众号
- Chat directory is separate from global contacts / 会话通讯录与全局 Contacts 分离

## 5. Home Layout System / Home 布局系统

Data model / 数据模型：`settings.appearance.homeWidgetPages` (2D array / 二维数组)

Rules / 规则：
- `app_*` entries cannot be hidden/deleted / `app_*` 不可隐藏或删除
- Widgets and custom widgets can be hidden / Widget 与自定义 Widget 可隐藏
- Default 5 pages, with pages 3-5 reserved / 默认 5 屏，后 3 屏预留

## 6. Data and Security Boundaries / 数据与安全边界

- Local-only persistence by default / 默认本地持久化
- No platform-managed cloud hosting / 不做平台云托管
- Context is sent only on explicit user trigger / 仅在用户触发时发送上下文
- Conversation deletion is local deletion / 删除会话对象属于本地删除
- Future cloud sync must include auth and conflict policy / 云同步需补授权和冲突策略

## 7. Engineering and Deployment / 工程化与部署

- CI: `.github/workflows/ci.yml` (`lint + build`)
- Deploy: `.github/workflows/deploy.yml` (GitHub Pages)
- URL / 部署地址：`https://shawnoarry.github.io/schatphone/`

## 8. Extension Rules / 扩展规范

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
