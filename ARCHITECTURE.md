# SchatPhone 架构说明

更新时间：2026-02-11

## 1. 架构目标

SchatPhone 采用“移动端交互壳 + 可配置能力中心”架构，优先保证：
- 交互流畅：Home / Chat / Settings 主链路稳定
- 可配置：API、主题、样式、布局可由用户调整
- 可扩展：后续可持续接入功能模块与 Widget，不重做底层

## 2. 分层设计

### 2.1 App Shell 层

职责：全局容器、状态栏、壁纸、路由切换、主题注入、自定义 CSS 注入。

- `src/App.vue`
- `src/main.js`
- `src/router/index.js`

设计要点：
- 使用 Hash 路由，适配 GitHub Pages 刷新场景
- 在 App 层统一注入 `settings.appearance.customCss`

### 2.2 状态层（Pinia）

职责：按业务域拆分状态，避免巨型 Store。

- `src/stores/system.js`
  - `settings.api`：url、key、model、resolvedKind、presets、activePresetId
  - `settings.appearance`：theme、wallpaper、customCss、customVars、homeWidgetPages、customWidgets
  - `settings.system`：语言、时区、通知
  - `user`：用户基础信息与 worldBook
- `src/stores/chat.js`：联系人与消息
- `src/stores/map.js`：地址数据与当前位置

设计要点：
- 深度 watch 自动持久化
- 关键页面通过 `saveNow()` 提供显式保存反馈
- Home 布局归一化（去重、补齐必备入口、最小屏数）集中在 `system` store

### 2.3 服务层

职责：统一外部调用与持久化封装。

- `src/lib/ai.js`
  - 基于 URL 自动识别 API 类型
  - 拉取模型列表（OpenAI-Compatible / Gemini）
  - 统一聊天调用入口
  - 统一错误分级（URL/鉴权/404/429/5xx/超时/网络）
- `src/lib/persistence.js`
  - localStorage 读写与版本封装

规则：组件内不直写 AI fetch，统一走 `lib/ai.js`。

### 2.4 页面层（Views）

职责：页面编排与交互实现，不承载底层协议细节。

关键页面：
- Home：`src/views/HomeView.vue`
- Settings：`src/views/SettingsView.vue`
- Profile：`src/views/UserProfileView.vue`
- WorldBook：`src/views/WorldBookView.vue`
- Network：`src/views/NetworkView.vue`
- Appearance：`src/views/AppearanceView.vue`
- Chat：`src/views/ChatView.vue`
- Files：`src/views/FilesView.vue`
- More：`src/views/MoreView.vue`

## 3. Home 布局系统

数据模型：`settings.appearance.homeWidgetPages`（二维数组）。

默认布局（5 屏，后 3 屏初始为空）：
- 第一屏：`weather`、`calendar`、`music`、`app_network`、`app_chat`、`app_wallet`、`app_themes`
- 第二屏：`system`、`quick_heart`、`quick_disc`、`app_phone`、`app_map`、`app_calendar`、`app_files`、`app_stock`、`app_more`
- 第三至第五屏：空

交互能力：
- 左右滑动切屏
- 长按空白进入编辑
- 拖拽排序（同屏）
- 跨屏拖拽（靠边自动切屏）
- 重置默认布局

规则：
- 功能入口（`app_*`）不可删除/隐藏，只允许换位置
- Widget 与自定义 Widget 可隐藏
- 隐藏后不保留空白占位，网格自动重排

## 4. Settings 信息架构

Settings 只负责“系统设置导航与系统项”，采用 iOS 分组风格：
- 用户卡片（进入 Profile）
- 内容设置：WorldBook、通用、通知
- 数据与安全：备份导出、关于

独立配置页：
- `/network`：API 配置、模型拉取、预设管理
- `/appearance`：二级菜单结构
  - 主题美化：主题、壁纸、自定义 CSS
  - 字体：全局字体预设与自定义字体栈
  - Widget：模板展示、复制/导出、创建/导入/管理

## 5. Widget 扩展模型

### 5.1 内置 Widget

- `weather` / `calendar` / `music` / `system` / `quick_heart` / `quick_disc`
- 可被隐藏，可通过重置布局恢复

### 5.2 自定义 Widget

- 数据存储在 `settings.appearance.customWidgets`
- 支持尺寸：`1x1`、`2x1`、`2x2`、`4x2`、`4x3`
- 支持页面放置、编辑、删除、JSON 导入
- 提供通用 JSON 模板展示，可复制或导出为文本

## 6. 工程化与部署

- CI：`.github/workflows/ci.yml`（lint + build）
- Deploy：`.github/workflows/deploy.yml`（GitHub Pages）
- 站点：`https://shawnoarry.github.io/schatphone/`

## 7. 扩展规范

1. 新模块先建 View，再注册 Router，再评估是否挂 Home 入口。
2. 配置类数据进入 `system` store，业务类数据进入对应域 store。
3. 主题优先走 CSS 变量，不在页面散落硬编码。
4. 所有 AI 请求统一走 `src/lib/ai.js`。
5. 影响路由、布局、配置模型时，必须同步更新 `PROJECT_STATUS.md` 与本文件。
