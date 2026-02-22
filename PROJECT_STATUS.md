# SchatPhone 项目进度与待办

Updated / 更新时间: 2026-02-23

## 1. Current Project Status / 当前项目状态

The project is in "stable core path + structured Chat iteration" stage.  
项目处于“主链路可用 + Chat 结构化迭代”阶段。

Available core paths / 可用主链路：
- Lock -> Home -> Chat / Settings / modules  
锁屏 -> Home -> Chat / Settings / 功能模块
- Network setup -> model fetch -> Chat request  
Network 配置 -> 模型拉取 -> Chat 调用
- Appearance setup -> theme/style/widget injection -> Home updates  
Appearance 配置 -> 主题/样式/Widget 注入 -> Home 实时生效

## 2. Completed Capabilities / 已完成能力

### 2.1 Home and Appearance / Home 与外观

- Long-press blank area to enter edit mode / 长按空白进入编辑
- In-page and cross-page drag with 5-page layout / 同屏与跨屏拖拽、5 屏布局
- App entries are fixed (reorder only) / App 入口不可隐藏，仅可换位
- Widgets can be hidden without blank holes / Widget 可隐藏且无空白占位
- Appearance split into theme/font/widget sections / 外观入口拆分为主题/字体/Widget
- Status bar toggle and haptic toggle / 顶部状态栏与触感开关

### 2.2 Network

- API kind auto-detection from URL + Key / URL + Key 自动识别 API 类型
- Auto/manual model refresh / 自动与手动刷新模型
- Preset save/switch/delete/clear / 预设保存、切换、删除、清空
- Error grading for URL/auth/404/rate-limit/timeout/network-CORS/server  
模型拉取错误分级：URL/鉴权/404/限流/超时/网络-CORS/服务端

### 2.3 Chat Data Model Upgrade / Chat 数据模型升级

- `conversations` + `messagesByConversation`
- Message status: `sending/sent/failed` / 消息状态
- Draft, unread count, conversation sort / 草稿、未读、会话排序
- Legacy data migration compatibility / 旧数据迁移兼容

### 2.4 Chat Interaction Upgrade / Chat 交互升级

- Sending a user message no longer auto-calls API / 发消息后默认不自动调 API
- "Trigger Reply" button with continuous triggering / “触发回复”支持连续触发
- Supports in-flight cancellation and failed retry / 支持取消与失败重试
- Chat header: back-to-home + user status + create + add service account  
聊天列表顶部：返回桌面 + 用户状态 + 新建 + 添加服务号
- User status: idle/busy/away / 用户状态：空闲/忙碌/离开
- New chat directory route: `/chat-contacts` / 新增会话通讯录
- Contact model fields: `kind`, `serviceTemplate` / 联系人模型新增字段

### 2.5 Files and More / Files 与 More

- Files: search, favorite filter, delete, quick note  
Files：检索、收藏筛选、删除、新建便签
- More: shortcuts, feature flags, expansion suggestions  
More：快捷入口、实验开关、扩展建议

### 2.6 Validation / 验证结果

- `npm run lint`: pass / 通过
- `npm run test`: pass / 通过
- `npm run build`: pass / 通过

## 3. Default Home Layout / 默认 Home 结构

- Page 1 / 第一屏  
  Widgets: `weather`, `calendar`, `music`  
  Apps: `Network`, `Chat`, `Wallet`, `Themes`
- Page 2 / 第二屏  
  Widgets: `system`, `quick_heart`, `quick_disc`  
  Apps: `Phone`, `Map`, `Calendar`, `Files`, `Stock`, `More`
- Page 3-5 reserved / 第三至第五屏预留扩展

## 4. Current Settings Structure / 当前 Settings 结构

- Profile card -> `/profile`
- Worldbook -> `/worldbook`
- General / Notifications (embedded second-level pages)  
通用与通知（内嵌二级页）
- Backup export (JSON) and About / 备份导出（JSON）与关于

Independent entries / 独立入口：
- Network/API: `/network`
- Appearance studio: `/appearance`

## 5. Module Completion Estimate / 模块完成度评估

- Home: 90%
- Settings (+Profile/Worldbook): 89%
- Network: 85%
- Appearance: 83%
- Chat: 92%
- Chat Directory: 82%
- Map: 66%
- Contacts (global): 62%
- Files/More: 72%
- Phone/Calendar/Wallet/Stock: 30%-45%

## 6. Next Roadmap / 下一步待办

### P0

1. Conversation settings page / Chat 会话设置页  
Per-thread manual/auto mode, reply count, style, proactive opening.
2. Message action menu / Chat 消息操作菜单  
Quote, edit, delete, copy, and re-roll.
3. Budget control / Chat 调用预算控制  
Per-thread usage count, threshold warning, optional confirmation.
4. Doc and encoding hygiene / 文档与编码治理  
Fix historical mojibake and standardize UTF-8.

### P1

1. Chat directory enhancement / 会话通讯录增强（搜索、批量、模板预设）
2. Widget import safety / Widget 安全与校验（schema、过滤、回退）
3. Settings UX refinement / 设置体验优化（iOS 分组与反馈）

### P2

1. Phone/Wallet/Calendar/Stock deepening / 先 Mock 业务闭环，再逐步接真实数据
2. Cross-module linkage / 跨模块联动（聊天与 Home 事件联动）

## 7. Collaboration Rules / 协作规则

1. Any route/store/home-rule change must update this file.  
改动路由/Store/Home 规则必须同步更新本文档。
2. Run `npm run lint` and `npm run build` before merge.  
合并前至少执行 lint 与 build。
3. Run `npm run test` when behavior logic changes.  
涉及行为逻辑改动时补跑 test。
4. Keep Home for entry usage and Settings for configuration management.  
Home 偏使用入口，Settings 偏配置管理。
