# SchatPhone

SchatPhone 是一个基于 Vue 3 的移动端交互壳项目，目标是构建“仿 iOS 的手机屏幕体验”，核心聚焦在：
- Chat 主功能
- Settings 分层管理
- Theme / CSS / Widget 可扩展美化能力

当前已去掉手机外框，页面以“纯屏幕交互”方式运行，优先适配移动端体验。

## 当前能力（2026-02-10）

- Home 双屏入口与 Widget 结构可用，支持左右滑动切屏
- Settings 已改为 iOS 风格分层结构
- 用户信息已从世界书拆分为独立页面
- 网络（API）已独立入口，支持 URL + Key + 模型自动拉取 + 预设保存
- 外观（Appearance）已独立入口，支持 Y2K / 纯白主题、壁纸 URL、自定义 CSS
- Settings / Profile / WorldBook / Appearance / Network 的输入页均有显式“保存”按钮
- GitHub Actions 已接入 CI 与 Pages 自动部署

## 技术栈

- Vue 3 (`script setup`)
- Vite 7
- Vue Router 5（Hash 模式）
- Pinia 3
- Tailwind CSS v4（`@tailwindcss/vite`）
- ESLint + Prettier
- Vitest + Vue Test Utils

## 本地开发

```bash
npm install
npm run dev
```

## 质量检查

```bash
npm run lint
npm run build
npm run test
```

## 当前路由

- `/lock`
- `/home`
- `/settings`
- `/appearance`
- `/network`
- `/profile`
- `/worldbook`
- `/chat` / `/chat/:id`
- `/contacts`
- `/gallery`
- `/phone`
- `/map`
- `/calendar`
- `/wallet`
- `/stock`

## 文档索引

- 架构说明：`ARCHITECTURE.md`
- 进度与待办：`PROJECT_STATUS.md`
- 操作指南：`操作指南-新版.md`
- 需求表达模板：`Tips-需求整理模板.md`
- AI 提示词模板：`AI-需求话术模板.md`
