# SchatPhone 同步快照

Updated / 更新时间: 2026-02-23

## Purpose / 用途

This file is a one-page snapshot merged from `PROJECT_STATUS.md` and `CHAT_PROGRESS.md`.  
本文件是从 `PROJECT_STATUS.md` 与 `CHAT_PROGRESS.md` 汇总出的单页快照。

Maintenance rule / 维护规则：  
Detailed changes must be updated in source docs first, then reflected here.  
详细变更先更新源文档，再同步到本快照，避免信息分叉。

## One-Line Summary / 当前版本一句话

SchatPhone is a Vue 3 + Vite + Pinia mobile shell with AI social-chat simulation; core paths are usable and Chat is under structured enhancement.  
SchatPhone 是基于 Vue 3 + Vite + Pinia 的移动端壳层 + AI 模拟社交聊天项目，核心主线可用，Chat 正在结构化增强。

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
- Assistant supports structured block rendering (text/virtual voice/link/transfer/image/mini scene)  
助手消息支持结构化块渲染（文本/虚拟语音/链接/转账/图片/互动场景）
- Conversation kinds: `role/group/service/official`  
会话对象分层：角色/群聊/服务号/公众号
- `/chat-contacts` manages chat contacts separately from global contacts  
`/chat-contacts` 独立管理聊天会话对象

## Important Routes / 关键路由

- `/home`
- `/chat`
- `/chat/:id`
- `/chat-contacts`
- `/network`
- `/appearance`

## Data and Privacy Boundaries / 数据与隐私边界

- Local browser persistence by default / 默认本地浏览器存储
- No platform cloud hosting / 不做平台云托管
- API requests only on explicit user trigger / 仅在用户触发时发请求

## Recommended Next Sequence / 推荐下一阶段顺序

1. Message action menu / 消息操作菜单（引用/编辑/重roll）
2. Budget control / 调用预算控制（计数、提醒、确认）
3. Structured block polish / 结构化消息块打磨（回退、一致性、可读性）
