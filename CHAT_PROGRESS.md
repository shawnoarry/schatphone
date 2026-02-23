# SchatPhone Chat 进度说明

Updated / 更新时间: 2026-02-23

## 1. Current Conclusion / 当前结论

Chat has moved from prototype to usable beta.  
聊天模块已从原型进入可用 Beta。

Current baseline / 当前基线：
- Stable core data model / 底层数据结构稳定
- Stable manual-trigger response flow / 手动触发链路稳定
- Contact stratification is implemented (`role/group/service/official`)  
会话对象分层已落地（角色/群聊/服务号/公众号）
- Thread-level AI controls baseline is implemented  
会话级 AI 控制基础能力已落地
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
- Assistant typing state shown as system UI text: "对方正在输入..."  
AI 输入中状态以系统态文本展示：“对方正在输入...”
- New route: `/chat-contacts` with category split  
新增 `/chat-contacts`，按角色/群聊与服务号/公众号分段管理
- Service/official templates configured in-thread menu  
服务号/公众号模板可在会话页菜单配置

### 2.4 Test Status / 测试状态

- `tests/chat-store-model.test.js`: pass / 通过
- `tests/ai-error-format.test.js`: pass / 通过
- Full test run: pass / 全量测试通过

## 3. Current Gaps / 当前限制

- Message long-press actions not complete (quote/edit/re-roll)  
消息长按操作（引用/编辑/重roll）尚未落地
- Budget/threshold reminder not implemented  
调用预算与额度提醒尚未落地
- Directory lacks search and batch management  
会话通讯录缺搜索与批量管理

## 4. Next Steps / 下一步建议

### P0

1. Message action menu / 消息操作菜单  
Quote, edit, delete, copy, re-roll.
2. Budget control / 调用预算控制  
Usage count, threshold warning, pre-trigger confirmation.
3. Structured block policy hardening / 结构化消息策略加固  
Fallback consistency, quote safety, and rendering detail polish.

### P1

1. Directory enhancement / 通讯录增强（搜索、批量、模板库）
2. Streaming response / 流式输出（状态扩展 `streaming`）
3. Input UX / 输入体验（多行、发送策略、草稿提示）

## 5. Exit Criteria for Next Stage / 阶段验收标准

Move to "Chat enhancement stage" once all are true:  
达到以下标准后进入“聊天增强阶段”：
- Manual trigger flow recovers under poor network without state loss  
异常网络下手动触发可恢复且不丢状态
- Role and service sessions behave differently under prompt/template injection  
角色会话与服务会话在设定注入上行为可区分
- Add/edit/delete contact does not break history rendering  
会话对象新增/编辑/删除不破坏历史展示
- `npm run lint`, `npm run test`, `npm run build` all pass  
lint/test/build 全通过
