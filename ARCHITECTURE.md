# SchatPhone 架构说明

更新时间：2026-02-03

## 1. 技术栈概览

核心开发框架
- Vue 3（Composition API + `script setup`）
- Vite 7（开发/构建工具）

功能逻辑支撑
- Vue Router 5（Hash 模式，适配 GitHub Pages）
- Pinia 3（全局状态管理）
- Marked（聊天 Markdown 渲染）

界面与视觉实现
- Tailwind CSS v4 + `@tailwindcss/vite`
- 自定义 CSS（玻璃拟态、动画、布局）
- Font Awesome（图标库）

工程化
- ESLint（Vue SFC + JS）
- GitHub Actions：CI + Pages 部署

## 2. 项目结构规范

```
src/
  App.vue                 # 应用外壳与全局布局（状态栏/壁纸/路由出口）
  main.js                 # 入口（Pinia + Router + 样式）
  style.css               # 全局样式与主题变量
  router/
    index.js              # 路由定义（Hash 模式）
  stores/
    system.js             # 系统/主题/用户配置
    chat.js               # 联系人与聊天数据
  views/
    LockScreen.vue        # 锁屏
    HomeView.vue          # 主屏
    SettingsView.vue      # 设置
    ChatView.vue          # 聊天
    ContactsView.vue      # 联系人
    GalleryView.vue       # 相册
  lib/
    ai.js                 # AI 请求封装
```

## 3. 主题与样式规范

- 主题变量统一放在 `src/style.css` 的 `:root` 中。
- 所有可定制颜色必须由 CSS 变量驱动（示例：`--chat-*`）。
- 主题切换由 `App.vue` 中的 `.app-shell[data-theme="..."]` 控制。
- 禁止在 `views` 中硬编码颜色（除非是局部特效且有注释说明原因）。

## 4. 路由规范

- 采用 Hash 路由，保证 GitHub Pages 刷新不 404。
- `HomeView` 作为入口，其他页面通过路由进入。
- 新页面必须先注册路由，再在主屏入口中挂载。

## 5. 状态管理规范

- 系统级设置与主题配置放 `system` store。
- 用户信息、世界观配置放 `system` store。
- 聊天相关放 `chat` store。
- AI 调用统一经由 `lib/ai.js`，禁止在组件内重复写 fetch 逻辑。

## 6. 运行与部署

本地开发
```
npm install
npm run dev
```

CI
- GitHub Actions 执行 `npm ci -> npm run lint -> npm run build`

Pages 部署
- 分支 `main` 触发部署
- 站点地址：`https://shawnoarry.github.io/schatphone/`

## 7. 当前缺失与建议补齐

必须项（建议尽快补齐）
- Prettier（统一格式化规范）
- `.env.example`（API Key 等敏感配置说明）
- 基础测试（如 Vitest + Vue Test Utils）

可选项（后续增强）
- 类型系统（TypeScript）
- 组件库/原子组件抽象（提升复用）
- 用户自定义 CSS 注入（在设置中提供）

