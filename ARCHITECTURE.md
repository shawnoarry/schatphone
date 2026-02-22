# SchatPhone 架构说明

更新时间：2026-02-22

## 1. 架构目标

SchatPhone 采用“移动端交互壳 + 可配置能力中心 + AI 对话域”架构，优先保证：
- 交互流畅：Home / Chat / Settings 主链路稳定
- 可配置：API、主题、样式、布局可由用户调整
- 可扩展：后续接入新模块与 Widget 时不重做底层
- 可控成本：AI 调用尽量由用户显式触发

## 2. 技术栈与版本（当前）

- Vue：`3.5.24`
- Vue Router：`5.0.2`（Hash History）
- Pinia：`3.0.4`
- Vite：`7.2.4`
- Tailwind CSS：`4.1.18`（`@tailwindcss/vite`）
- Test：Vitest `1.6.0` + jsdom
- Lint/Format：ESLint 9 + Prettier 3
- UI 辅助：Font Awesome、marked

## 3. 分层设计

### 3.1 App Shell 层

职责：全局容器、壁纸主题、路由切换、全局样式注入。

- `src/App.vue`
- `src/main.js`
- `src/router/index.js`

关键点：
- 使用 Hash 路由适配 GitHub Pages
- App 层统一注入自定义 CSS 与主题变量

### 3.2 状态层（Pinia）

职责：按领域拆分状态，避免单一巨大 Store。

- `src/stores/system.js`
  - `settings.api`：url/key/model/presets
  - `settings.appearance`：theme/wallpaper/customCss/customVars/homeWidgetPages/customWidgets
  - `user`：资料、世界书、聊天状态（`chatStatus`）
- `src/stores/chat.js`
  - 联系人类型：`role` / `group` / `service` / `official`
  - 会话：`conversations`
  - 消息：`messagesByConversation`
- `src/stores/map.js`

### 3.3 服务层

职责：统一外部调用与本地持久化。

- `src/lib/ai.js`
  - API 类型识别
  - 模型列表拉取
  - 统一聊天调用入口
  - 统一错误分级映射
- `src/lib/persistence.js`
  - localStorage 读写与版本封装

规则：组件不直写 fetch 到 AI 服务，统一走 `src/lib/ai.js`。

### 3.4 页面层（Views）

职责：页面编排与交互，不承载底层协议细节。

核心页面：
- Home：`/home`
- Settings：`/settings`
- Network：`/network`
- Appearance：`/appearance`
- Chat：`/chat`
- ChatDirectory：`/chat-contacts`
- ChatThread：`/chat/:id`

## 4. Chat 领域架构（当前）

### 4.1 数据结构

- 对话对象（contact）
  - `id`, `name`, `kind`, `role`, `bio`, `serviceTemplate`
- 会话（conversation）
  - `draft`, `unread`, `lastMessage`, `updatedAt`, `pinned`
- 消息（message）
  - `id`, `role`, `content`, `createdAt`, `status`

### 4.2 交互模型

- 用户发送消息：先落本地消息流
- AI 回复：由“触发回复”按钮显式触发
- 可连续触发同一会话回复
- 失败支持重试，请求中支持取消
- 服务号/公众号在对话页内维护服务模板

### 4.3 会话对象分层

- 角色/群聊：沉浸式角色对话
- 服务号/公众号：信息流与运营型对话
- 会话通讯录统一管理两类对象，但与全局 Contacts 分离

## 5. Home 布局系统

数据模型：`settings.appearance.homeWidgetPages`（二维数组）。

规则：
- 功能入口（`app_*`）不可删除/隐藏，仅可换位
- Widget 与自定义 Widget 可隐藏
- 默认 5 屏（后 3 屏预留）

## 6. 数据与安全边界

- 默认仅本地持久化，不做平台云端托管
- 仅在用户触发调用时把上下文发送到用户配置的 API 地址
- 删除会话对象为本地删除
- 后续如扩展云同步，需新增显式授权与冲突策略

## 7. 工程化与部署

- CI：`.github/workflows/ci.yml`（lint + build）
- Deploy：`.github/workflows/deploy.yml`（GitHub Pages）
- 部署地址：`https://shawnoarry.github.io/schatphone/`

## 8. 扩展规范

1. 新模块先建 View，再注册 Router，再评估是否挂 Home 入口。
2. 配置类数据进入 `system` store，业务类数据进入对应域 store。
3. 主题优先走 CSS 变量，避免页面硬编码。
4. 所有 AI 请求统一走 `src/lib/ai.js`。
5. 影响路由/数据结构/主交互时，必须同步更新文档。
