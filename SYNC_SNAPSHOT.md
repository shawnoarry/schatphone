# SchatPhone 同步快照

更新时间：2026-02-22

## 当前版本一句话

这是一个基于 Vue 3 + Vite + Pinia 的“移动端壳层 + AI 模拟社交聊天”项目，核心主线已可用，聊天模块正在做结构化增强。

## 当前技术栈

- Framework：Vue 3 (Composition API)
- Build：Vite 7
- Style：Tailwind CSS v4 + CSS Variables
- State：Pinia
- Router：Vue Router (Hash)
- Test：Vitest + jsdom
- Lint/Format：ESLint + Prettier

## 当前聊天设计关键点

- 用户消息与 AI 回复解耦：发送不等于立即调用
- AI 调用由“触发回复”按钮控制，支持连续触发
- 会话对象分层：角色/群聊/服务号/公众号
- 新增会话通讯录页统一管理会话对象

## 当前路由重点

- `/home`：主屏
- `/chat`：聊天列表
- `/chat/:id`：单聊/群聊/服务号会话
- `/chat-contacts`：会话通讯录
- `/network`：API 配置
- `/appearance`：主题/字体/Widget

## 数据与隐私边界

- 默认数据存储在本地浏览器
- 不做平台云端托管
- 仅在用户触发时向用户配置的 API 地址发请求

## 下一阶段推荐顺序

1. 会话设置页（手动/自动、回复条数、风格）
2. 消息操作菜单（引用/编辑/重roll）
3. 调用预算控制（计数、提醒、确认）
