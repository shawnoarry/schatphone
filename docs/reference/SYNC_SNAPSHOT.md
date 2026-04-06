# SchatPhone 同步快照

Updated / 更新时间: 2026-04-06

Document position / 文档定位（2026-04-06）: snapshot reference.  
本文件用于快照复核；主说明与动态待办请以 PROJECT_MASTER_GUIDE.md 与 TODO_ROADMAP.md 为准。

## Purpose / 用途

This file is a one-page snapshot merged from `docs/reference/PROJECT_STATUS.md` and `docs/reference/CHAT_PROGRESS.md`.  
本文件是从 `docs/reference/PROJECT_STATUS.md` 与 `docs/reference/CHAT_PROGRESS.md` 汇总出的单页快照。

Maintenance rule / 维护规则：  
Detailed changes must be updated in source docs first, then reflected here.  
详细变更先更新源文档，再同步到本快照，避免信息分叉。

## One-Line Summary / 当前版本一句话

SchatPhone has stable lock/home/chat/settings core flows; scheduler + restore-time settlement + system-owned truth + storage-layering prep are integrated, and current focus is chat semantic revision, chat-list dock, and gallery-centered asset reuse.  
SchatPhone 已稳定锁屏/Home/Chat/Settings 主链路；调度器、恢复补算、系统真值与分层存储准备均已接入，当前重点转向 Chat 语义修订、聊天一级页底部功能位与相册素材中心复用。

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
- Cross-module automation queue baseline is active: module handlers can register into a unified scheduler with priority-based due-task dispatch (Chat + Map wired in v1).  
跨模块自动化队列基线已启用：模块处理器可注册到统一调度器，并按模块优先级分发到期任务（v1 已接入 Chat + Map）。
- Message action entry is now long-press/context-menu driven: bubble top-right entry removed, and quote/copy/edit/delete/reroll are handled in bottom action sheet.  
消息操作入口现已改为长按/右键触发：气泡右上角入口已移除，引用/复制/编辑/删除/重roll 统一在底部动作面板处理。
- Input row now exposes `+` action panel as user-send hub: image/gif/link/location/transfer/voice-card messages are available, while `Trigger Reply` stays persistent as a separate AI invoke lane.  
输入区现已通过 `+` 动作面板承载用户发送中枢：图片/gif/链接/位置/转账/语音卡片均可发送，`Trigger Reply` 仍作为独立 AI 调用通道常驻。
- Link/transfer/voice-card creation now uses inline form composer inside `+` panel (instead of prompt dialogs) for lower-interruption messaging flow.  
链接/转账/语音卡片创建现已改为 `+` 面板内联表单（替代 prompt 弹窗），以降低消息发送打断感。
- Reroll uses pre-target context and replaces the target assistant message  
重roll 使用目标消息之前上下文，并原位替换目标助手消息
- System-owned truth baseline is active: relationship metrics + event timeline persist in store and are injected into prompt context.  
系统真值基线已启用：关系指标与事件时间线已持久化到 store，并注入提示词上下文。
- Structured block hardening batch-1 is active: route/url sanitization, quote candidate safety, and markdown sanitize are integrated.  
结构化消息加固第一批已生效：route/url 清洗、引用候选安全、Markdown 清洗已接入。
- Structured block hardening batch-2 is active: assistant parser now tolerates fenced/embedded JSON payloads and mixed-content readability is improved.  
结构化消息加固第二批已生效：助手解析器可容错代码块/嵌入式 JSON 返回，混合内容可读性已提升。
- Structured block hardening batch-3 is active: payload fallback supports `content/text/message/output_text` and primary text block is guaranteed for stable mixed-content rendering.  
结构化消息加固第三批已生效：payload 回退支持 `content/text/message/output_text`，并保证主文本块存在以稳定混排展示。
- Settings UX batch-1/2/3 is completed: beginner guidance, quick access, clearer report-center copy flow, chat-thread save feedback consistency, inline backup import/export feedback, network inline validation/copy hints, appearance widget inline feedback, and inline non-critical notices across chat/contacts/chat-directory/home are integrated.  
设置体验优化第一/二/三批已完成：新手引导、快捷入口、报错中心复制流程、会话页保存反馈一致性、备份导入/导出页内反馈、Network 页内校验/复制提示、Appearance Widget 页内反馈，以及 chat/contacts/chat-directory/home 的非关键页内提示均已接入。
- Storage layering prep (`P1-4`) is completed (2026-04-05): async layered APIs + mirror queue + sync-first/async-fallback hydration guard + drift inspect/reconcile + diagnostics linkage are fully landed.  
分层存储准备（`P1-4`）已于 2026-04-05 完成：异步分层 API、镜像队列、同步优先/异步回退写保护、漂移检查修复与诊断联动已全部落地。
- Storage audit/repair outcomes are now routed into unified report history (`module=storage`) for centralized review in Network report center.  
存储检查/修复结果现已进入统一报告历史（`module=storage`），可在 Network 报告中心集中查看。
- Cross-page diagnostics are now connected: Settings storage diagnostics can deep-link to filtered Network reports, and Network storage records can deep-link back to Settings > About for repair.  
跨页诊断链路现已打通：Settings 存储诊断可深链到筛选后的 Network 报告，Network 存储记录也可回跳 Settings > About 执行修复。
- Settings storage diagnostics now surfaces latest storage report summary and quick jumps for storage all/error views in Network report center.  
Settings 存储诊断现已展示最近存储报告摘要，并支持一键跳转到 Network 报告中心的 storage 全部/仅错误视图。
- Report history cleanup supports scoped clearing by active filter in Network report center, and Settings diagnostics adds storage-only cleanup for reduced troubleshooting noise.  
报告历史清理现支持在 Network 报告中心按当前筛选范围清理，Settings 诊断也新增 storage 专项清理以降低排查噪音。
- Assistant supports structured block rendering (text/virtual voice/link/transfer/image/mini scene)  
助手消息支持结构化块渲染（文本/虚拟语音/链接/转账/图片/互动场景）
- Conversation kinds: `role/group/service/official`  
会话对象分层：角色/群聊/服务号/公众号
- Global role archive + chat binding split is active: `/contacts` owns role profiles, `/chat-contacts` owns binding/meta and service CRUD  
全局角色档案与会话绑定已拆分：`/contacts` 管档案，`/chat-contacts` 管绑定/会话变量与服务号增删改
- Avatar hierarchy baseline is active (`thread > module > global > fallback`), with module-level config in `/chat-feature/identity` and thread-level overrides in chat thread menu.  
头像层级基线已启用（`会话 > 模块 > 全局 > 兜底`），模块级配置位于 `/chat-feature/identity`，会话级覆写位于会话菜单。
- `/chat-contacts` manages chat contacts separately from global contacts  
`/chat-contacts` 独立管理聊天会话对象
- Chat directory search/filter baseline is available for role and service entries  
会话通讯录已具备角色与服务对象的搜索/筛选基线能力
- Chat directory batch baseline is available (multi-select and bulk actions with safety confirmations)  
会话通讯录已具备批量操作基线（多选与安全确认下的批量动作）

## Lock and Notification Key Design / 锁屏与通知关键设计

- Default route is lock screen (`/` -> `/lock`) with lock-state guard  
默认入口为锁屏（`/` -> `/lock`），并由锁定状态守卫控制访问
- Chat can push lock notifications when AI replies arrive while device is locked  
设备处于锁定状态时，Chat 在 AI 回复到达后可推送锁屏通知
- Lock screen supports banner animation + unread stack + tap-to-open-and-unlock  
锁屏支持横幅动画 + 未读堆叠 + 点击通知解锁跳转
- Notification queue is persisted in local store  
通知队列由本地 Store 持久化
- Settings General supports periodic backup reminders with configurable interval, and reminders are sent as system-style notifications (no modal pop-up).  
Settings 通用页支持可配置间隔的周期性备份提醒，提醒以系统推送样式通知发送（无弹窗）。

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
- Settings backup restore (JSON) now supports rollback-safe import and legacy/new chat data compatibility  
Settings 备份恢复（JSON）已支持失败回滚，并兼容旧版/新版聊天数据结构

## Recommended Next Sequence / 推荐下一阶段顺序

1. `P0-1`: AI single-message semantic revision (edit assistant message without full reroll; revised text becomes default context). / `P0-1`：AI 单条语义修订（可编辑助手消息且不需整轮重roll；修订文本作为默认上下文）。
2. `P0-2`: Chat top-level bottom dock (at least 3 stable bottom actions with real placeholder routes). / `P0-2`：Chat 一级页底部 Dock（至少 3 个稳定按钮并接入真实占位路由）。
3. Continue `P0-C2` / PM `P0-4`: rich-message lane hardening in `+` panel while keeping `Trigger Reply` as separate AI invoke lane. / 持续推进 `P0-C2` / 产品经理优先级 `P0-4`：加固 `+` 面板富消息链路，并保持 `Trigger Reply` 独立调用通道。
4. `P0-5` + `P0-6`: Gallery global asset center and role-bound reuse across chat/appearance/scenarios. / `P0-5` + `P0-6`：相册全局素材中心与角色绑定复用（覆盖 chat/外观/场景）。
5. `P0-7`: storage and backup hardening for asset binaries (IndexedDB-first and export strategy). / `P0-7`：素材二进制存储与备份加固（IndexedDB 主路径与导出策略）。


