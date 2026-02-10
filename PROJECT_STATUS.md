# SchatPhone 项目进度与待办

更新时间：2026-02-10

## 1. 当前项目状态

项目处于“主链路可用，持续迭代优化”阶段。

主链路：
- 锁屏 -> Home -> Chat / Settings / 功能模块跳转
- API 配置 -> 模型拉取 -> Chat 调用链路
- 外观主题与自定义 CSS 注入链路

## 2. 本轮已完成（最新）

### 2.1 Settings 分层重构

- Settings 改为 iOS 风格分组列表
- 用户信息从世界书拆分为独立页：`/profile`
- 世界书页面只保留 worldBook 编辑：`/worldbook`

涉及文件：
- `src/views/SettingsView.vue`
- `src/views/UserProfileView.vue`
- `src/views/WorldBookView.vue`
- `src/router/index.js`

### 2.2 Home 入口去重

- 去除与 Settings 重叠的 Home 入口（Profile / WorldBook）
- 默认入口改为更偏功能使用场景
- 历史布局自动映射并去重，防止旧数据重复

涉及文件：
- `src/views/HomeView.vue`
- `src/stores/system.js`

### 2.3 输入页显式保存按钮

新增“保存”反馈按钮，便于用户确认已保存：
- 通用设置、通知设置
- 用户信息
- 世界书
- 网络设置
- 外观设置

涉及文件：
- `src/views/SettingsView.vue`
- `src/views/UserProfileView.vue`
- `src/views/WorldBookView.vue`
- `src/views/NetworkView.vue`
- `src/views/AppearanceView.vue`
- `src/stores/system.js`（`saveNow()`）

### 2.4 验证结果

- `npm run lint`：通过
- `npm run build`：通过

## 3. 当前 Home 默认入口清单

### 第一屏

- Widget：`weather`、`calendar`、`music`
- App：`Network`、`Chat`、`Wallet`、`Themes`

### 第二屏

- Widget：`system`、`quick_heart`、`quick_disc`
- App：`Phone`、`Map`、`Calendar`、`Files`、`Stock`

## 4. 当前 Settings 二级项

Settings 首页分组：
- 用户卡片（进入 `Profile`）
- 内容设置：`世界书`、`通用`、`通知`
- 数据与安全：`备份与导出`、`关于`

独立设置页：
- `/network`（API 与模型预设）
- `/appearance`（主题、壁纸、自定义 CSS）

## 5. 完成度评估（当前）

- Home：82%
- Settings（含 Profile/WorldBook 拆分）：86%
- Network：78%
- Appearance：72%
- Chat：74%
- Contacts：58%
- Map：65%
- Phone/Calendar/Wallet/Stock：25%~40%（分模块推进）

## 6. 后续待办（按优先级）

## P0（立即）

1. Home 布局编辑器
- 用户可拖拽排序入口
- 可隐藏/显示入口
- 一键恢复默认布局

2. Network 稳定性增强
- 模型拉取失败原因分级提示（鉴权/CORS/URL 错误）
- 预设导入导出

3. 文案与编码统一
- 清理遗留乱码文案
- 统一中英文术语

## P1（核心体验增强）

4. Chat 能力补强
- 会话置顶/未读
- 会话分组或标签
- 消息类型扩展（系统卡片/提醒/位置）

5. Appearance 用户化能力
- 图标自定义
- Widget 开关与排序
- 主题变量可视化编辑

6. 世界书结构化
- 条目化管理（标签/优先级）
- 与聊天注入策略联动

## P2（功能扩展）

7. Phone / Wallet / Calendar / Stock 模块 MVP 化
- 先 Mock 数据闭环
- 再逐步接真实 API

8. 跨模块联动
- 事件触发聊天（例如日程提醒、价格波动）

## 7. 协作规则（持续生效）

1. 路由、入口、Store 字段发生变化时，同步更新本文件。
2. 每次合并前至少执行：`npm run lint` + `npm run build`。
3. 新页面默认不放 Home，先验证业务价值后再挂入口。
4. Settings 负责“配置”，Home 负责“使用入口”，避免重复。
