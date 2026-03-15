# SchatPhone 同步快照

Updated / 更新时间: 2026-03-15

## Purpose / 用途

This file is a one-page snapshot merged from `PROJECT_STATUS.md` and `CHAT_PROGRESS.md`.  
本文件是从 `PROJECT_STATUS.md` 与 `CHAT_PROGRESS.md` 汇总出的单页快照。

Maintenance rule / 维护规则：  
Detailed changes must be updated in source docs first, then reflected here.  
详细变更先更新源文档，再同步到本快照，避免信息分叉。

## One-Line Summary / 当前版本一句话

SchatPhone is a Vue 3 + Vite + Pinia mobile shell with lock-screen immersion and AI social-chat simulation; core flows are stable and the system-language UI baseline is completed.  
SchatPhone 是基于 Vue 3 + Vite + Pinia 的移动端壳层 + AI 模拟社交聊天项目，已具备锁屏沉浸主链路，系统语言 UI 收口基线已完成。

## Stack Snapshot / 技术栈快照

- Vue 3 (Composition API)
- Vite 7
- Tailwind CSS v4 + CSS Variables
- Pinia
- Vue Router (Hash)
- Vitest + jsdom
- ESLint + Prettier

## Chat Key Design / Chat 关键设计

- User send and AI call are decoupled / 用户发送与 AI 调用解耦
- AI call is controlled by "Trigger Reply" and supports continuous generation  
AI 调用由“触发回复”控制，支持连续触发
- User message status transitions follow `delivered -> read` with trigger lifecycle  
用户消息状态随触发链路切换 `已送达 -> 已读`
- Thread layered menu contains AI controls (suggestions/context turns/bilingual/quote/virtual voice)  
会话分级菜单已具备 AI 控制（建议回复/上下文轮数/双语/引用/虚拟语音）
- Thread layered menu also includes mode/count/style/proactive opener strategy  
会话分级菜单也已支持模式/条数/风格/主动开场策略
- Autonomous trigger controls are available at global/module/thread levels with conflict cooldown and dedupe guard  
自主调用已具备全局/模块/会话三级控制，并接入冲突冷却与去重保护
- Message action menu baseline completed: quote/copy/edit/delete/reroll  
消息操作菜单基线已完成：引用/复制/编辑/删除/重roll
- Reroll uses pre-target context and replaces the target assistant message  
重roll 使用目标消息之前上下文，并原位替换目标助手消息
- Assistant supports structured block rendering (text/virtual voice/link/transfer/image/mini scene)  
助手消息支持结构化块渲染（文本/虚拟语音/链接/转账/图片/互动场景）
- Conversation kinds: `role/group/service/official`  
会话对象分层：角色/群聊/服务号/公众号
- Global role archive + chat binding split is active: `/contacts` owns role profiles, `/chat-contacts` owns binding/meta and service CRUD  
全局角色档案与会话绑定已拆分：`/contacts` 管档案，`/chat-contacts` 管绑定/会话变量与服务号增删改
- `/chat-contacts` manages chat contacts separately from global contacts  
`/chat-contacts` 独立管理聊天会话对象

## Lock and Notification Key Design / 锁屏与通知关键设计

- Default route is lock screen (`/` -> `/lock`) with lock-state guard  
默认入口为锁屏（`/` -> `/lock`），并由锁定状态守卫控制访问
- Chat can push lock notifications when AI replies arrive while device is locked  
设备处于锁定状态时，Chat 在 AI 回复到达后可推送锁屏通知
- Lock screen supports banner animation + unread stack + tap-to-open-and-unlock  
锁屏支持横幅动画 + 未读堆叠 + 点击通知解锁跳转
- Notification queue is persisted in local store  
通知队列由本地 Store 持久化

## System Language Snapshot / 系统语言快照

- System UI language supports `zh-CN/en-US/ko-KR` with normalization  
系统 UI 语言支持 `zh-CN/en-US/ko-KR`，并做归一化处理
- i18n utilities are provided by `src/lib/locale.js` and `src/composables/useI18n.js`  
i18n 能力由 `src/lib/locale.js` 与 `src/composables/useI18n.js` 提供
- P0-2 target views are completed (`Appearance`, `ChatDirectory`, `LockScreen`, `UserProfile`, `WorldBook`)  
P0-2 目标页面已完成（`Appearance`、`ChatDirectory`、`LockScreen`、`UserProfile`、`WorldBook`）
- Scope boundary: applies to system UI labels only, not AI-generated chat content  
边界约束：仅作用于系统 UI 文案，不改写 AI 生成聊天内容

## Important Routes / 关键路由

- `/lock`
- `/home`
- `/chat`
- `/chat/:id`
- `/chat-contacts`
- `/network`
- `/appearance`

## Data and Privacy Boundaries / 数据与隐私边界

- Local browser persistence by default / 默认本地浏览器存储
- No platform cloud hosting / 不做平台云托管
- API requests on explicit trigger plus optional autonomous trigger (when enabled) / 默认用户触发，开启后可按规则自主触发
- Widget JSON import now uses schema validation + rollback-safe apply / Widget JSON 导入已接入结构校验与失败回滚保护

## Recommended Next Sequence / 推荐下一阶段顺序

1. Autonomous-control acceptance pass / 自主调用验收收口（手动优先、重叠冲突、文案一致性）
2. Widget import policy tuning / Widget 导入策略调优（严格度、阈值、反馈文案）
3. Structured block policy hardening / 结构化消息策略加固（回退一致性、引用安全）
