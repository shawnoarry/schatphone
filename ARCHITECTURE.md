# SchatPhone 架构说明

更新时间：2026-02-10

## 1. 架构目标

SchatPhone 采用“可扩展移动端交互壳”架构，优先保证三件事：
- 交互流畅：Home / Chat / Settings 主链路稳定
- 可配置：用户可管理 API、主题、样式、基础人设
- 可扩展：后续能接 Widget 自定义与模块扩展，不重做底层

## 2. 分层设计

### 2.1 App Shell 层

职责：全局容器、状态栏、壁纸、路由切换、主题注入。

- `src/App.vue`
- `src/main.js`
- `src/router/index.js`

设计要点：
- 使用 Hash 路由，适配 GitHub Pages 刷新场景
- 在 App 层统一挂载自定义 CSS 注入能力

### 2.2 业务状态层（Pinia）

职责：按业务域拆分状态，避免巨型单 Store。

- `src/stores/system.js`
  - `settings.api`：URL / Key / model / presets
  - `settings.appearance`：theme / wallpaper / customCss / customVars / homeWidgetPages
  - `settings.system`：语言、时区、通知
  - `user`：用户信息 + worldBook
- `src/stores/chat.js`
  - 联系人与聊天记录
- `src/stores/map.js`
  - 地址簿与当前位置

设计要点：
- 通过 `watch(..., { deep: true })` 自动持久化
- 提供 `saveNow()` 供 UI“保存按钮”显式触发

### 2.3 服务层

职责：统一外部调用与持久化策略。

- `src/lib/ai.js`
  - 统一 AI 调用入口
  - 基于 URL 自动识别 API 类型
  - 拉取可用模型（失败时允许手动兜底）
- `src/lib/persistence.js`
  - localStorage 读写与版本封装

规则：组件内不直写 fetch，统一走 `lib/ai.js`。

### 2.4 页面层（Views）

职责：页面编排与交互，不承载底层协议逻辑。

关键页面：
- Home：`src/views/HomeView.vue`
- Settings（iOS 风格入口页）：`src/views/SettingsView.vue`
- Profile：`src/views/UserProfileView.vue`
- WorldBook：`src/views/WorldBookView.vue`
- Network：`src/views/NetworkView.vue`
- Appearance：`src/views/AppearanceView.vue`
- Chat：`src/views/ChatView.vue`

## 3. Home 入口策略（去重后）

默认布局（`settings.appearance.homeWidgetPages`）：

- 第一屏 App：`Network`、`Chat`、`Wallet`、`Themes`
- 第一屏 Widget：`weather`、`calendar`、`music`
- 第二屏 App：`Phone`、`Map`、`Calendar`、`Files`、`Stock`
- 第二屏 Widget：`system`、`quick_heart`、`quick_disc`

约束：
- Profile 和 WorldBook 归属 Settings 体系，不再出现在 Home 入口
- 对历史布局做自动映射与去重，避免老数据出现重复按钮

## 4. Settings 架构（当前）

Settings 仅做“设置导航与系统项”，采用 iOS 分组风格：

- 用户卡片（进入 Profile）
- 内容设置：WorldBook、通用、通知
- 数据与安全：备份导出、关于

二级页面拆分：
- Profile：只负责用户信息编辑
- WorldBook：只负责世界书文本
- Network：独立入口，负责 API 配置与预设
- Appearance：独立入口，负责主题和样式

## 5. 保存策略

当前采取“双轨保存”：

- 自动保存：Store watch 自动持久化
- 显式保存：关键输入页提供“保存”按钮，调用 `systemStore.saveNow()` 并给出反馈

已覆盖保存按钮页面：
- `SettingsView.vue`（通用、通知）
- `UserProfileView.vue`
- `WorldBookView.vue`
- `NetworkView.vue`
- `AppearanceView.vue`

## 6. 工程化

- CI：`.github/workflows/ci.yml`（lint + build）
- 部署：`.github/workflows/deploy.yml`（GitHub Pages）
- 站点：`https://shawnoarry.github.io/schatphone/`

## 7. 扩展规范

后续新增功能时遵循：

1. 新模块先建 View，再注册 Router，再决定是否放 Home 入口。
2. 需要全局配置的数据进入 `system` store；业务数据进入对应域 store。
3. 主题相关优先用 CSS 变量，不在页面硬编码颜色。
4. 所有 API 调用统一走服务层，避免散落在组件。
5. 影响布局结构时同步更新 `PROJECT_STATUS.md` 与本文件。
