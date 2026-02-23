# SchatPhone

Updated / 更新时间: 2026-02-23

SchatPhone is a Vue 3 mobile interaction shell that simulates an iOS-like full-screen phone experience.  
SchatPhone 是一个基于 Vue 3 的移动端交互壳项目，目标是构建仿 iOS 的全屏手机体验。

Current focus areas / 当前核心主线：
- Home editable layout (entry apps + widgets) / Home 可编辑布局（入口与 Widget）
- Chat main workflow / Chat 主功能链路
- Settings as configuration center (network/theme/customization) / Settings 分层配置能力（网络/主题/自定义）

## Current Capabilities / 当前能力

- 5-page Home layout, long-press edit mode, cross-page drag-and-drop  
支持 5 屏 Home、长按编辑、跨屏拖拽排序
- `app_*` entries are locked from hide/delete and can only be repositioned  
`app_*` 功能入口不可隐藏/删除，仅可换位
- Custom widgets support: `1x1/2x1/2x2/4x2/4x3`, code paste, JSON import  
支持自定义 Widget 尺寸、代码粘贴与 JSON 导入
- Network page supports API kind detection, model pull, preset save/switch  
Network 支持 API 类型识别、模型拉取、预设保存与切换
- Chat supports manual trigger flow, cancel/retry, and error classification  
Chat 支持手动触发、取消/重试、错误分级提示
- Chat supports per-thread AI settings (suggestion toggle, context turns, bilingual output, quote mode, virtual voice)  
Chat 支持会话级 AI 设置（可选回复开关、上下文轮数、双语输出、引用模式、虚拟语音）
- User message status flow supports delivered/read transitions with AI-side typing indicator  
用户消息状态支持“已送达 -> 已读”切换，并提供 AI 侧“对方正在输入”系统态提示
- Assistant messages support structured blocks (text/virtual voice/module link/virtual transfer/virtual image/mini scene)  
助手消息支持结构化块（文本/虚拟语音/模块链接/虚拟转账/虚拟图片/迷你互动场景）
- Files and More pages are available as MVP modules  
Files / More 已升级为可用 MVP 页面
- Key input pages provide explicit Save actions with persistence  
关键输入页保留显式保存按钮并持久化
- CI + GitHub Pages deployment are configured  
已接入 CI 与 GitHub Pages 自动部署

## Tech Stack / 技术栈

- Vue 3 (`script setup`)
- Vite 7
- Vue Router (Hash mode) / Vue Router（Hash 模式）
- Pinia
- Tailwind CSS v4 (`@tailwindcss/vite`)
- ESLint + Prettier
- Vitest + Vue Test Utils

## Local Development / 本地开发

```bash
npm install
npm run dev
```

## Quality Checks / 质量检查

```bash
npm run lint
npm run build
npm run test
```

## Routes / 当前路由

- `/lock`
- `/home`
- `/settings`
- `/appearance`
- `/network`
- `/profile`
- `/worldbook`
- `/chat`
- `/chat-contacts`
- `/chat/:id`
- `/contacts`
- `/gallery`
- `/phone`
- `/map`
- `/calendar`
- `/wallet`
- `/stock`
- `/files`
- `/more`

## Documentation Index / 文档索引

- `ARCHITECTURE.md`: Architecture and boundaries / 架构与边界
- `PROJECT_STATUS.md`: Current status and roadmap / 当前状态与路线图
- `CHAT_PROGRESS.md`: Chat-domain progress and milestones / Chat 域进展与里程碑
- `CHAT_FEATURE_DECISIONS.md`: Chat proposal decisions and pending items / Chat 建议决议与待确认项
- `SYNC_SNAPSHOT.md`: One-page quick snapshot / 一页快速快照
- `操作指南-新版.md`: Operational guide / 操作流程指南
- `TASK_EXECUTION_PLAN.md`: Task execution board / 任务执行清单
- `AI_WORK_MODE.md`: AI collaboration operating mode / AI 协作工作模式
- `Tips-需求整理模板.md`: Requirement self-check template / 需求自检模板
- `AI-需求话术模板.md`: Prompt template for AI coding assistants / AI 协作话术模板
