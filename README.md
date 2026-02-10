# SchatPhone

SchatPhone 是一个基于 Vue 3 的移动端交互壳项目，目标是构建仿 iOS 的手机屏幕体验。
当前重点聚焦在三条主线：
- Home 可编辑布局（入口与 Widget）
- Chat 主功能链路
- Settings 分层与用户可配置能力（网络/主题/自定义）

项目已去除手机外框，采用纯屏幕交互，优先适配移动端体验和主流浏览器（Safari/Chrome/Edge）。

## 当前能力（2026-02-11）

- Home 支持 5 屏结构、左右滑动、长按空白进入编辑、跨屏拖拽排序
- Home 规则：功能入口（`app_*`）不可删除/隐藏，仅可换位置；Widget 与自定义 Widget 可隐藏
- 支持自定义 Widget（尺寸 `1x1/2x1/2x2/4x2/4x3`），支持代码粘贴与 JSON 导入
- Settings 已重构为 iOS 风格分层菜单；用户信息与世界书拆分为独立页面
- Network 独立入口：URL + Key 自动识别 API 类型并拉取模型；支持预设保存与切换
- Appearance 独立入口：二级菜单（主题美化/字体/Widget），支持模板复制与 TXT 导出
- 关键输入页均有显式“保存”按钮，同时保留自动持久化
- GitHub Actions 已接入 CI 与 GitHub Pages 自动部署

## 技术栈

- Vue 3 (`script setup`)
- Vite 7
- Vue Router（Hash 模式）
- Pinia
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
- 需求整理模板：`Tips-需求整理模板.md`
- AI 协作模板：`AI-需求话术模板.md`
