# SchatPhone 项目进度与待办

更新时间：2026-02-22

## 1. 当前项目状态

项目处于“主链路可用 + 聊天模块进入结构化迭代”阶段。

可用主链路：
- 锁屏 -> Home -> Chat / Settings / 功能模块跳转
- Network API 配置 -> 模型拉取 -> Chat 调用
- Appearance 配置 -> 主题/样式/Widget 注入 -> Home 实时生效

## 2. 已完成能力（最新）

### 2.1 Home 与外观

- Home 长按空白进入编辑模式
- 同屏拖拽 + 跨屏拖拽 + 5 屏布局
- App 入口不可隐藏，仅可换位
- Widget 可隐藏且无空白占位
- 外观入口拆分：主题/字体/Widget
- 顶部状态栏开关、触感开关

### 2.2 Network

- URL + Key 自动识别 API 类型
- 自动/手动刷新模型列表
- 预设保存、切换、删除、清空
- 模型拉取错误分级提示（URL/鉴权/404/限流/超时/网络-CORS/服务端）

### 2.3 Chat 数据模型升级

- 会话/消息分离结构：`conversations` + `messagesByConversation`
- 消息状态：`sending` / `sent` / `failed`
- 草稿保存、未读计数、会话排序
- 旧数据自动迁移兼容

### 2.4 Chat 交互升级（本轮重点）

- 回复触发改为用户主导：输入消息后默认不自动调 API
- 对话页支持“触发回复”按钮，允许连续触发
- 支持取消当前请求、失败重试
- 聊天列表顶部改为：返回桌面 + 用户状态 + 新建 + 添加服务号
- 用户状态：空闲/忙碌/离开（状态灯动画）
- 新增会话通讯录：`/chat-contacts`
  - 分层管理：角色/群聊 与 服务号/公众号
  - 支持新建、编辑、删除、进入会话
- 联系人模型扩展字段：`kind`、`serviceTemplate`
- 对话页菜单支持服务模板设置（服务号/公众号）

### 2.5 Files / More

- Files：检索、收藏筛选、删除、新建便签
- More：快捷入口、实验开关、扩展建议

### 2.6 验证结果

- `npm run lint`：通过
- `npm run test`：通过
- `npm run build`：通过

## 3. 当前默认 Home 结构

### 第一屏

- Widget：`weather`、`calendar`、`music`
- App：`Network`、`Chat`、`Wallet`、`Themes`

### 第二屏

- Widget：`system`、`quick_heart`、`quick_disc`
- App：`Phone`、`Map`、`Calendar`、`Files`、`Stock`、`More`

### 第三至第五屏

- 预留空屏，供后续模块与 Widget 扩展

## 4. 当前 Settings 结构

- 用户卡片 -> `/profile`
- 世界书 -> `/worldbook`
- 通用（内嵌二级页）
- 通知（内嵌二级页）
- 备份导出（JSON）
- 关于（内嵌二级页）

独立入口：
- 网络与 API：`/network`
- 外观工坊：`/appearance`

## 5. 模块完成度（当前评估）

- Home：90%
- Settings（含 Profile/WorldBook）：89%
- Network：85%
- Appearance：83%
- Chat：92%
- Chat 会话通讯录：82%
- Map：66%
- Contacts（全局联系人）：62%
- Files / More：72%
- Phone/Calendar/Wallet/Stock：30%~45%

## 6. 下一步待办（优先级）

### P0

1. Chat 会话设置页
- 每会话配置：手动/自动回复、回复条数、回复风格、主动开场策略。

2. Chat 消息操作菜单
- 引用、编辑、删除、复制、按轮重roll。

3. Chat 调用预算控制
- 每会话调用计数、阈值提醒、触发前二次确认（可选）。

4. 文档与编码治理
- 修复历史乱码文档，保持 UTF-8 一致。

### P1

1. 会话通讯录增强
- 搜索、批量管理、模板预设库。

2. Widget 安全与校验
- 导入 schema 校验、危险字段过滤、失败回退。

3. 设置体验优化
- 更贴近 iOS 分组与提示反馈。

### P2

1. Phone / Wallet / Calendar / Stock 深化
- 先 Mock 业务闭环，再逐步接真实数据。

2. 跨模块联动
- 日程/提醒/股价等事件联动到聊天和 Home。

## 7. 协作规则

1. 每次改动路由/Store 字段/Home 规则，必须同步更新本文档。
2. 每次合并前至少执行：`npm run lint` + `npm run build`。
3. 涉及交互行为改动时，补跑：`npm run test`。
4. Home 与 Settings 职责分离：Home 偏使用入口，Settings 偏配置管理。
