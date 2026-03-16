# SchatPhone Chat 进度说明

Updated / 更新时间: 2026-03-16

## 1. Current Conclusion / 当前结论

Chat has moved from prototype to usable beta with lock-screen notification linkage.  
聊天模块已从原型进入可用 Beta，并已打通锁屏通知联动。

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
- Full test run: pass / 全量测试通过

## 3. Current Gaps / 当前限制

- Directory still lacks preset template center (search/filter/batch baseline completed)  
会话通讯录仍缺模板预设中心（搜索/筛选/批量基线已完成）
- Cross-module role binding (forum/map etc.) is not wired yet, currently chat-first  
跨模块角色绑定（论坛/地图等）尚未接线，目前优先落在 Chat
- Chat-adjacent pages are now covered by system-language migration baseline; keep regression checks for new pages  
聊天相关页面已完成系统语言迁移基线，后续新增页面需持续做回归检查
- Quote-style diversity policy still needs product-level tuning (when to prefer quote vs plain).  
引用型回复的触发策略仍需产品层面继续细化（何时引用、何时普通回复）。

## 4. Next Steps / 下一步建议

### P0

1. Autonomous control acceptance / 自主调用验收收口  
Manual/auto overlap cases, timer strategy polish, and user-facing copy consistency.
手动/自动重叠场景、计时策略细化与用户提示文案一致性。
2. Structured block policy hardening / 结构化消息策略加固  
Fallback consistency, quote safety, and rendering detail polish.

### P1

1. Directory enhancement / 通讯录增强（搜索、批量、模板库）
2. Input UX / 输入体验（多行、发送策略、草稿提示）
3. Optional streaming response / 可选流式输出（状态扩展 `streaming`）

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
