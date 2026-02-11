# SchatPhone 项目进度与待办

更新时间：2026-02-11

## 1. 当前项目状态

项目处于“主链路可用，核心交互打磨阶段”。

可用主链路：
- 锁屏 -> Home -> Chat / Settings / 功能模块跳转
- Network API 配置 -> 模型拉取 -> Chat 调用
- Appearance 配置 -> 主题/样式/Widget 注入 -> Home 实时生效

## 2. 本轮已完成

### 2.1 Home 布局编辑系统

- 长按桌面空白进入编辑模式
- 同屏拖拽排序
- 跨屏拖拽（边缘切屏）
- 重置默认布局
- 取消抖动动画

### 2.2 Home 规则升级

- 默认扩展为 5 屏结构（前 2 屏有内容，后 3 屏预留）
- 功能入口（`app_*`）锁定：不可删除/隐藏，仅可换位置
- Widget 与自定义 Widget 可隐藏，隐藏后无空白占位

### 2.3 自定义 Widget 管理

- 支持添加/编辑/删除/放置
- 支持 JSON 导入
- 支持尺寸：`1x1/2x1/2x2/4x2/4x3`
- 提供通用模板展示、复制模板、导出模板文本（TXT）
- 新增内置 Widget 单项恢复/移动面板（不再只能整屏重置）

### 2.4 Appearance 二级菜单

- Appearance 拆分为三类入口：主题美化、字体、Widget
- 字体支持全局字体预设和自定义字体栈
- 返回路径统一：二级页返回外观首页，外观首页返回 Settings

### 2.5 Settings / Network / Appearance 分层

- 用户信息独立为 `/profile`
- 世界书独立为 `/worldbook`
- 网络配置独立为 `/network`
- 美化与 Widget 管理独立为 `/appearance`

### 2.6 Network 预设与模型

- URL + Key 自动识别 API 类型
- 自动/手动刷新模型列表
- 预设保存、切换、删除、清空

### 2.7 验证结果

- `npm run lint`：通过
- `npm run build`：通过
- `npm run test`：通过

## 3. 当前默认 Home 结构

### 第一屏

- Widget：`weather`、`calendar`、`music`
- App：`Network`、`Chat`、`Wallet`、`Themes`

### 第二屏

- Widget：`system`、`quick_heart`、`quick_disc`
- App：`Phone`、`Map`、`Calendar`、`Files`、`Stock`

### 第三至第五屏

- 预留空屏，供后续模块与 Widget 扩展

## 4. 当前 Settings 二级结构

- 用户卡片 -> `/profile`
- 世界书 -> `/worldbook`
- 通用（内嵌二级页）
- 通知（内嵌二级页）
- 备份导出（JSON）
- 关于（内嵌二级页）

独立配置入口：
- 网络与 API：`/network`
- 外观工坊：`/appearance`

## 5. 模块完成度（当前评估）

- Home：88%
- Settings（含 Profile/WorldBook）：88%
- Network：82%
- Appearance：80%
- Chat：76%
- Map：66%
- Contacts：60%
- Phone/Calendar/Wallet/Stock：30%~45%

## 6. 待办计划（优先级）

### P0（建议先做）

1. 内置 Widget 复位/回收站能力
- 已补：内置 Widget 列表 + 单项加回/移动。
- 待补：历史隐藏记录和批量恢复体验。

2. 网络错误分级反馈
- 将模型拉取错误区分为 URL 错误、鉴权失败、CORS、服务端错误。

3. 功能占位页补最小 MVP
- `Files` / `More` 目前仍为占位交互，建议补最小可用页面。

### P1

4. Chat 会话管理增强
- 置顶、未读、会话标签、草稿状态。

5. Widget 体系增强
- 预置 Widget 库（官方模板）
- 导入校验与安全隔离策略

6. 设置体验增强
- iOS 风格更细化（分组 footer、危险操作区、搜索入口）

### P2

7. Phone / Wallet / Calendar / Stock 深化
- 先 Mock 数据闭环，再逐步接真实 API。

8. 跨模块联动
- 例如：日程提醒触发聊天卡片、股价波动推送到 Home。

## 7. 协作规则

1. 每次改动路由/Store 字段/Home 规则，必须同步更新本文档。
2. 每次合并前至少执行：`npm run lint` + `npm run build`。
3. 涉及交互行为改动时，补跑：`npm run test`。
4. Home 与 Settings 职责分离：Home 偏使用入口，Settings 偏配置管理。
