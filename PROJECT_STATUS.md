# SchatPhone 项目进度与待办

Updated / 更新时间: 2026-04-04

## 1. Current Project Status / 当前项目状态

The project is in "stable core path + immersive-phase consolidation" stage: baseline shell is stable, real-time scheduler and minimal truth layer are integrated, and focus now moves to block-policy hardening and settings UX consistency.  
项目处于“主链路稳定 + 沉浸阶段收敛”状态：壳层基线稳定，现实时间调度器与系统真值最小层已接入，当前重点转向结构化消息策略加固与设置体验一致性。

Available core paths / 可用主链路：
- Lock -> Home -> Chat / Settings / modules  
锁屏 -> Home -> Chat / Settings / 功能模块
- Locked state + AI reply -> lock notification -> tap notification -> unlock and open target route  
锁定状态 + AI 回复 -> 锁屏通知 -> 点通知解锁并进入目标页面
- Network setup -> model fetch -> Chat request  
Network 配置 -> 模型拉取 -> Chat 调用
- Appearance setup -> theme/style/widget injection -> Home updates  
Appearance 配置 -> 主题/样式/Widget 注入 -> Home 实时生效
- System language setup -> unified UI labels (P0-2 baseline completed, keep incremental maintenance)  
系统语言设置 -> 系统 UI 文案统一（P0-2 基线完成，后续增量维护）

## 2. Completed Capabilities / 已完成能力

### 2.1 Home and Appearance / Home 与外观

- Long-press blank area to enter edit mode / 长按空白进入编辑
- In-page and cross-page drag with 5-page layout / 同屏与跨屏拖拽、5 屏布局
- App entries are fixed (reorder only) / App 入口不可隐藏，仅可换位
- Widgets can be hidden without blank holes / Widget 可隐藏且无空白占位
- Appearance split into theme/font/widget sections / 外观入口拆分为主题/字体/Widget
- Status bar toggle and haptic toggle / 顶部状态栏与触感开关
- Lock clock style can be configured in Appearance / 锁屏时间样式可在外观中配置
- Widget JSON import safety baseline completed (schema validation, danger filtering, rollback-safe apply).  
Widget JSON 导入安全基线已完成（结构校验、危险内容拦截、失败回滚保护）。

### 2.2 Network

- API kind auto-detection from URL + Key / URL + Key 自动识别 API 类型
- Auto/manual model refresh / 自动与手动刷新模型
- Preset save/switch/delete/clear / 预设保存、切换、删除、清空
- Error grading for URL/auth/404/rate-limit/timeout/network-CORS/server  
模型拉取错误分级：URL/鉴权/404/限流/超时/网络-CORS/服务端
- Call/Error history center with filter and clear controls (network + chat logs)  
调用/报错历史中心已上线（支持筛选与清空，覆盖 network + chat 记录）

### 2.3 Chat Data Model Upgrade / Chat 数据模型升级

- `conversations` + `messagesByConversation`
- Global role profile archive: `roleProfiles` / 全局角色档案：`roleProfiles`
- Message status: `sending/sent/failed/delivered/read` / 消息状态
- Draft, unread count, conversation sort / 草稿、未读、会话排序
- Conversation-level AI preferences / 会话级 AI 偏好配置（建议回复、上下文轮数、双语、引用、虚拟语音）
- Structured assistant messages (`blocks`) with quote/meta fields / 结构化助手消息（`blocks`）及引用/元信息字段
- Role binding fields: `profileId`, `relationshipLevel`, `relationshipNote` / 角色会话绑定字段：`profileId`、`relationshipLevel`、`relationshipNote`
- Legacy data migration compatibility / 旧数据迁移兼容
- Backup restore compatibility: supports new shape + legacy chat backup migration / 备份恢复兼容：支持新结构与旧版聊天备份迁移

### 2.4 Chat Interaction Upgrade / Chat 交互升级

- Sending a user message no longer auto-calls API / 发消息后默认不自动调 API
- "Trigger Reply" button with continuous triggering / “触发回复”支持连续触发
- Supports in-flight cancellation and failed retry / 支持取消与失败重试
- Delivered -> Read transition tied to AI trigger lifecycle / 用户消息状态随触发链路切换“已送达 -> 已读”
- Assistant-side typing indicator uses system-state UI text / 等待回复时使用 AI 侧“对方正在输入...”系统态提示
- Thread layered menu now includes AI controls (suggestions/context/bilingual/quote/virtual voice)  
会话分级菜单已支持 AI 控制（可选回复/上下文轮数/双语/引用/虚拟语音）
- Thread layered menu now includes mode/count/style/proactive opener controls  
会话分级菜单已支持模式/条数/风格/主动开场策略
- Auto mode supports post-send trigger and one-call multi-message generation  
自动模式支持发送后触发，并支持单次调用生成多条回复
- Global/module/thread autonomous controls are available (master switch, module switch, per-thread interval).  
全局/模块/会话三级自主调用控制已可用（总开关、模块开关、会话间隔）。
- Autonomous flow includes conflict cooldown and context dedupe guards; manual trigger keeps higher priority.  
自主调用链路已包含冲突冷却与上下文去重保护；手动触发保持更高优先级。
- Message action menu baseline completed: quote/copy/edit/delete/reroll with role constraints  
消息操作菜单基线已完成：引用/复制/编辑/删除/重roll，并带角色约束
- Reroll uses pre-target context and replaces target assistant message in place  
重roll 使用目标消息之前的上下文，并原位替换目标助手消息
- System-owned truth layer is active: relationship metrics and event timeline are persisted and reused in prompt context.  
系统真值最小层已启用：关系指标与事件时间线可持久化，并复用于提示词上下文。
- Structured block hardening batch-1 is integrated: block field sanitization, quote candidate safety, and markdown HTML sanitize are active.  
结构化消息加固第一批已接入：block 字段清洗、引用候选安全、Markdown HTML 清洗已生效。
- Chat list/thread headers support core navigation and status display  
聊天列表/会话头部支持核心导航与状态展示
- User status: idle/busy/away / 用户状态：空闲/忙碌/离开
- New chat directory route: `/chat-contacts` / 新增会话通讯录
- Chat directory split: role binding + service management / 会话通讯录拆分为“角色绑定层 + 服务号管理层”
- Main contacts (`/contacts`) manage global role profiles (create/edit/delete) / 主通讯录（`/contacts`）负责全局角色档案（新增/编辑/删除）
- Chat directory role deletion is unbind-only and does not delete global profile / 会话通讯录中删除角色仅做解绑，不会删除全局档案
- Chat directory now has search and quick filter baseline in both role and service sections / 会话通讯录已补齐角色区与服务区的搜索+快速筛选基线
- Chat directory now has batch-mode baseline (multi-select, bulk unbind/delete, filtered bulk bind) / 会话通讯录已补齐批量模式基线（多选、批量解绑/删除、按筛选批量绑定）
- Chat directory template preset center is completed (role-meta presets + service presets) / 会话通讯录模板预设中心已完成（角色变量模板 + 服务模板）
- Contact model fields: `kind`, `serviceTemplate`, `profileId`, `relationshipLevel`, `relationshipNote` / 联系人模型新增字段

### 2.5 Lock Screen and Notification Loop / 锁屏与通知闭环

- Default route enters lock screen (`/` -> `/lock`) / 默认入口为锁屏（`/` -> `/lock`）
- Non-lock routes are guarded by `isLocked` state / 锁定状态下阻止访问非锁屏路由
- Chat pushes lock notifications when AI replies arrive while locked  
设备锁定期间 AI 回复到达时，可推送锁屏通知
- Lock screen supports banner animation, unread stack, and tap-to-open-and-unlock  
锁屏支持横幅动画、未读堆叠和点通知解锁跳转
- Notification queue is persisted in local storage / 通知队列可本地持久化

### 2.6 System Language Rollout (UI Scope) / 系统语言统一（UI 范围）

- `settings.system.language` supports `zh-CN/en-US/ko-KR` with normalization  
`settings.system.language` 支持 `zh-CN/en-US/ko-KR` 并做归一化
- i18n utilities are introduced (`src/lib/locale.js`, `src/composables/useI18n.js`)  
已引入 i18n 工具（`src/lib/locale.js`、`src/composables/useI18n.js`）
- Multiple pages are migrated to `t(...)` UI labels  
多个页面已迁移为 `t(...)` 系统文案
- P0-2 target pages completed: `Appearance`, `ChatDirectory`, `LockScreen`, `UserProfile`, `WorldBook`  
P0-2 目标页面已完成：`Appearance`、`ChatDirectory`、`LockScreen`、`UserProfile`、`WorldBook`
- Scope boundary is explicit: system language does not rewrite AI-generated content  
边界明确：系统语言不改写 AI 生成内容

### 2.7 Files and More / Files 与 More

- Files: search, favorite filter, delete, quick note  
Files：检索、收藏筛选、删除、新建便签
- More: shortcuts, feature flags, expansion suggestions  
More：快捷入口、实验开关、扩展建议

### 2.8 Validation / 验证结果

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
- General / Notifications / AI Automation (embedded second-level pages)  
通用 / 通知 / AI 自动响应（内嵌二级页）
- Beginner guidance + quick-access entry set is now available on settings root.  
设置首页已新增新手引导与快捷入口组合。
- Backup export (JSON) and About / 备份导出（JSON）与关于
- Backup JSON now includes `roleProfiles` for global-role recovery / 备份 JSON 已包含 `roleProfiles`，可恢复全局角色档案
- Backup restore import (JSON) is available with rollback-safe failure recovery / 已支持备份恢复导入（JSON），失败自动回滚保护

Independent entries / 独立入口：
- Network/API: `/network`
- Appearance studio: `/appearance`
- Network report center now exposes readable issue type/suggested fix and copy-report action.  
Network 报错中心现提供可读问题类型、建议处理与复制报告能力。

## 5. Module Completion Estimate / 模块完成度评估

- Lock screen + notification loop: 88%
- Home: 90%
- Settings (+Profile/Worldbook): 89%
- Network: 85%
- Appearance: 84%
- Chat: 96%
- Chat Directory: 93%
- System-language rollout (UI): 90%
- Map: 66%
- Contacts (global): 78%
- Files/More: 72%
- Phone/Calendar/Wallet/Stock: 30%-45%

## 6. Next Roadmap / 下一步待办

### P0

1. Mainline alignment is completed (2026-03-30) / 主线对齐已完成（2026-03-30）  
Execution docs are now aligned with immersive real-time direction.
执行文档已与“现实时间沉浸主线”对齐。
2. `P1-1 M3` template preset center is completed (2026-03-30) / `P1-1 M3` 模板预设中心已完成（2026-03-30）  
Chat-directory enhancement is now fully closed.
会话通讯录增强已完成收口。
3. `P0-A1` completed: real-time scheduler baseline / `P0-A1` 已完成：现实时间调度器基线  
Global checkpoints now drive autonomous actions with resume-time recheck hooks.
引入系统时间驱动的自主行为检查点。
4. `P0-A4` completed: autonomous control policy baseline is integrated / `P0-A4` 已完成：自主调用控制策略基线已接入  
Quiet-hours + notify-only + manual-priority policy now runs through settings and chat runtime.
安静时段 + 仅通知 + 手动优先策略已贯通设置与聊天运行态。
5. `P0-B1` is completed (2026-04-03): system-owned truth minimal layer is integrated into store, chat runtime, prompt injection, and backup path.  
5. `P0-B1` 已完成（2026-04-03）：系统真值最小层已接入 store、Chat 运行态、提示词注入与备份链路。

### P1

1. Structured block policy hardening (`P1-2`) is in progress (batch-1 completed) / 结构化消息策略加固（`P1-2`）进行中（第一批已完成）
2. Settings UX refinement (`P1-3`) is in progress (batch-1 completed) / 设置体验优化（`P1-3`）进行中（第一批已完成）
3. Storage layering preparation (`P1-4`) / 分层存储迁移准备（`P1-4`）

### P2

1. Phone/Wallet/Calendar/Stock deepening / 先 Mock 业务闭环，再逐步接真实数据
2. Cross-module linkage / 跨模块联动（聊天与 Home 事件联动）
3. Role reuse across map/forum and future modules / 地图、论坛及后续模块的角色复用

## 7. Collaboration Rules / 协作规则

1. Any route/store/home-rule change must update this file.  
改动路由/Store/Home 规则必须同步更新本文档。
2. If lock-screen/i18n behavior changes, sync `README.md`, `ARCHITECTURE.md`, and `SYNC_SNAPSHOT.md` together.  
若改动锁屏或系统语言行为，必须同步更新 `README.md`、`ARCHITECTURE.md`、`SYNC_SNAPSHOT.md`。
3. Run `npm run lint` and `npm run build` before merge.  
合并前至少执行 lint 与 build。
4. Run `npm run test` when behavior logic changes.  
涉及行为逻辑改动时补跑 test。
5. Keep Home for entry usage and Settings for configuration management.  
Home 偏使用入口，Settings 偏配置管理。
