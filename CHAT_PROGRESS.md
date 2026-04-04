# SchatPhone Chat 进度说明

Updated / 更新时间: 2026-04-04

## 1. Current Conclusion / 当前结论

Chat has moved from prototype to usable beta with lock-screen notification linkage and system-owned truth continuity baseline.  
聊天模块已从原型进入可用 Beta，并已打通锁屏通知联动与系统真值连续性基线。

Current baseline / 当前基线：
- Stable core data model / 底层数据结构稳定
- Stable manual-trigger response flow / 手动触发链路稳定
- Contact stratification is implemented (`role/group/service/official`)  
会话对象分层已落地（角色/群聊/服务号/公众号）
- Thread-level AI controls baseline is implemented  
会话级 AI 控制基础能力已落地
- Lock-state AI reply now maps to system notifications on lock screen  
锁定状态下 AI 回复已可映射到锁屏系统通知
- Ready for "simulated social" feature expansion  
具备继续扩展“模拟社交”能力的基础

## 2. Completed Scope / 已完成能力

### 2.1 Data Model / 数据模型

- `conversations` + `messagesByConversation`
- Message status: `sending/sent/failed/delivered/read` / 消息状态
- Draft, unread count, and sort integrated / 草稿、未读、排序已打通
- Conversation-level AI prefs are persisted / 会话级 AI 偏好可持久化
- Structured assistant reply model supports blocks, quote, and metadata  
结构化助手回复模型支持 blocks、引用与元信息
- Legacy migration compatibility / 历史数据自动迁移兼容
- Backup restore now supports both legacy chat backup and new role-profile binding shape  
备份恢复现已兼容旧版聊天备份与新版角色档案绑定结构

### 2.2 API Calls and Error Handling / 调用与错误处理

- Unified AI call entry: `src/lib/ai.js`
- Graded errors: URL/auth/404/rate-limit/timeout/network/CORS/server  
错误分级提示：URL/鉴权/404/限流/超时/网络/CORS/服务端
- In-flight cancel and failed retry / 支持取消当前请求与失败重试

### 2.3 Interaction and IA / 交互与信息架构

- Chat list/thread headers provide core navigation and status context  
聊天列表/会话头部提供核心导航与状态信息
- User status: idle/busy/away with indicator light  
用户状态：空闲/忙碌/离开（状态灯）
- Thread behavior: send message does not auto-call AI  
对话页发送消息后默认不自动调 AI
- "Trigger Reply" supports continuous generation  
“触发回复”支持连续触发（无新消息也可继续）
- User message state transition: delivered before trigger, read on AI request start  
用户消息状态切换：触发前已送达，发起 AI 请求后切为已读
- Thread layered menu adds AI settings (suggestions/context turns/bilingual/quote/virtual voice)  
会话分级菜单已支持 AI 设置（建议回复/上下文轮数/双语/引用/虚拟语音）
- Thread layered menu now also includes reply mode/reply count/style/proactive opener strategy  
会话分级菜单已补齐回复模式/回复条数/回复风格/主动开场策略
- Auto mode can trigger AI after user send, and multi-message replies can be returned in one API call  
自动模式可在用户发送后触发 AI，且可在单次调用中返回多条回复
- Autonomous control now supports global switch, module switch, and per-thread timed invoke interval.  
自主调用控制已支持全局总开关、模块开关与会话级定时间隔。
- Conflict cooldown + context dedupe are wired; manual trigger has higher priority when near overlap occurs.  
冲突冷却与上下文去重已接入；手动触发与自动触发接近重叠时，手动优先。
- Message action menu is now available in thread (quote/copy/edit/delete/reroll)  
会话页消息操作菜单已可用（引用/复制/编辑/删除/重roll）
- Reroll replaces target assistant message in-place and marks reroll metadata for traceability  
重roll 采用原位替换目标助手消息，并记录 reroll 元信息便于追踪
- Assistant typing state shown as system UI text: "对方正在输入..."  
AI 输入中状态以系统态文本展示：“对方正在输入...”
- System-owned truth baseline is integrated: runtime writes relationship/event truth and prompt context reads truth snapshot.  
系统真值基线已接入：运行态写入关系/事件真值，提示词读取真值快照。
- Structured block hardening batch-1 is integrated: unsafe route/url fields are sanitized, quote fallback is context-safe, and markdown HTML is sanitized before render.  
结构化消息加固第一批已接入：不安全 route/url 会被清洗，引用回退基于上下文安全候选，Markdown 渲染前做 HTML 清洗。
- Structured block hardening batch-2 is integrated: assistant JSON parser now handles fenced/embedded payloads and secondary-language blocks are more readable.  
结构化消息加固第二批已接入：助手 JSON 解析支持代码块/嵌入式返回，双语次级文本可读性提升。
- Structured block hardening batch-3 is integrated: payload fallback now accepts `content/text/message/output_text` variants and guarantees a primary text block for each assistant message.  
结构化消息加固第三批已接入：payload 回退兼容 `content/text/message/output_text` 变体，并保证每条助手消息都有主文本块。
- Settings UX batch-2 is integrated in chat thread flow: save feedback in layered menu now mirrors settings/network patterns (`Saved` state + short header confirmation).  
设置体验优化第二批已接入会话链路：分级菜单保存反馈已与 settings/network 模式对齐（`已保存` 状态 + 头部短暂确认）。
- Settings backup import/export flow now uses inline feedback (success/error) instead of blocking alerts, matching the same lightweight UX direction.  
Settings 备份导入/导出链路现已采用页内反馈（成功/失败）替代阻塞弹窗，保持同一套轻量反馈体验方向。
- Network page now aligns with the same direction: preset validation and copy-report failure are surfaced via inline feedback.  
Network 页面也已对齐该方向：预设校验与报告复制失败改为页内反馈提示。
- Appearance widget page now also aligns: copy/export/import/restore feedback is rendered inline without blocking alerts.  
Appearance Widget 页面也已对齐：复制/导出/导入/恢复反馈均改为页内提示，不再阻塞弹窗。
- Chat thread now renders non-critical operational notices inline (copy/edit/delete failure, location missing, invalid route) to avoid interaction interruption.  
Chat 会话页已将非关键操作提示改为页内显示（复制/编辑/删除失败、位置缺失、无效链接），减少交互中断。
- Contacts and ChatDirectory now align as well: validation/failure/success messages are surfaced inline instead of blocking alerts (confirm dialogs kept for destructive actions).  
Contacts 与 ChatDirectory 也已对齐：校验/失败/成功提示改为页内展示，不再使用阻塞弹窗（破坏性操作仍保留确认弹窗）。
- Home page fallback notice now also uses inline toast for unfinished app entries, eliminating remaining non-critical blocking alerts in active views.  
Home 页对未完成应用入口的提示也已改为页内 toast，清理了活跃页面剩余的非关键阻塞弹窗。
- New route: `/chat-contacts` with category split  
新增 `/chat-contacts`，按角色/群聊与服务号/公众号分段管理
- Role directory model is now split: main contacts own global role profiles, chat directory handles binding/meta only  
通讯录模型已拆分：主通讯录负责全局角色档案，会话通讯录仅负责绑定与会话局部变量
- Role unbind in chat directory does not delete global profile; service/official entries remain full CRUD in chat directory  
会话通讯录中的角色删除仅解绑不删总档案；服务号/公众号仍在会话通讯录内完整增删改
- Chat directory now includes search + quick filter chips for role/service sections  
会话通讯录现已支持搜索与快速筛选标签（角色区/服务区）
- Chat directory now supports batch mode for role/service lists (multi-select, bulk unbind/delete, filtered bulk bind).  
会话通讯录现已支持角色/服务列表批量模式（多选、批量解绑/删除、按筛选结果批量绑定）。
- Chat directory template preset center is completed (role-meta presets + service presets).  
会话通讯录模板预设中心已完成（角色变量模板 + 服务模板）。
- Service/official templates configured in-thread menu  
服务号/公众号模板可在会话页菜单配置

### 2.4 Lock-Screen Notification Linkage / 锁屏通知联动

- If AI replies while locked, Chat appends a system notification with route target  
锁定状态下 AI 回复到达时，Chat 会写入带目标路由的系统通知
- Lock-screen banner and stack can open corresponding chat directly  
锁屏横幅与通知堆叠可直接进入对应会话
- Read-state updates and unlock flow are connected in one interaction  
通知已读状态更新与解锁跳转在一次交互中完成

### 2.5 Language Boundary in Chat / Chat 语言边界

- System language now localizes Chat system UI labels and menus  
系统语言已可本地化 Chat 系统 UI 文案与菜单
- AI-generated message content remains model/context driven  
AI 生成消息内容仍由模型与上下文驱动
- Bilingual output in replies remains controlled by per-thread AI prefs  
回复双语输出仍由会话级 AI 偏好控制

### 2.6 Test Status / 测试状态

- `tests/chat-store-model.test.js`: pass / 通过
- `tests/ai-error-format.test.js`: pass / 通过
- `tests/system-automation.test.js`: pass / 通过
- `tests/system-truth.test.js`: pass / 通过
- Full test run: pass / 全量测试通过

## 3. Current Gaps / 当前限制

- Truth baseline is integrated, but metric calibration and stage-threshold tuning still need product playtest feedback.  
真值基线已接入，但指标校准与关系阶段阈值仍需结合产品实测继续调优。
- Structured block policy hardening baseline is completed (batch-1/2/3 landed); further tuning is now product-policy level.  
结构化消息策略加固基线已完成（第一/二/三批已落地）；后续优化主要转向产品策略层调参。
- Cross-module role binding (forum/map etc.) is not wired yet, currently chat-first  
跨模块角色绑定（论坛/地图等）尚未接线，目前优先落在 Chat
- Chat-adjacent pages are now covered by system-language migration baseline; keep regression checks for new pages  
聊天相关页面已完成系统语言迁移基线，后续新增页面需持续做回归检查
- Quote-style diversity policy still needs product-level tuning (when to prefer quote vs plain).  
引用型回复的触发策略仍需产品层面继续细化（何时引用、何时普通回复）。

## 4. Next Steps / 下一步建议

### P0

1. `P0-B1` is completed (2026-04-03): system-owned truth minimal layer is integrated into store/runtime/prompt/backup.  
`P0-B1` 已完成（2026-04-03）：系统真值最小层已接入 store/运行态/提示词/备份链路。
2. Keep truth tuning loop active: adjust metric delta and stage threshold using real playtest transcripts.  
保持真值调优回路：结合真实体验记录微调指标增量与关系阶段阈值。

### P1

1. Storage layering preparation (`P1-4`) / 分层存储迁移准备（`P1-4`）
2. Optional streaming response / 可选流式输出（状态扩展 `streaming`）
3. Truth metric and quote-policy tuning based on playtest transcripts / 基于实测对真值指标与引用策略继续调参

## 5. Exit Criteria for Next Stage / 阶段验收标准

Move to "Chat enhancement stage" once all are true:  
达到以下标准后进入“聊天增强阶段”：
- Manual trigger flow recovers under poor network without state loss  
异常网络下手动触发可恢复且不丢状态
- Role and service sessions behave differently under prompt/template injection  
角色会话与服务会话在设定注入上行为可区分
- Add/edit/delete contact does not break history rendering  
会话对象新增/编辑/删除不破坏历史展示
- Lock-state notification -> open-thread flow is stable  
锁定状态通知 -> 会话打开链路稳定
- `npm run lint`, `npm run test`, `npm run build` all pass  
lint/test/build 全通过
