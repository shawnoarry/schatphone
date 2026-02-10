# SchatPhone 项目进度与后续待办（当前版）

更新时间：2026-02-10

## 1. 项目目标

SchatPhone 当前目标是构建“仿 iOS 的移动端交互壳”，以聊天为核心，支持：
- 桌面 App/Widget 多模块入口
- 全局设定（用户档案、世界书、系统参数）
- 可扩展的外观自定义（主题、壁纸、CSS）
- 可配置 API 与模型自动拉取

## 2. 当前技术栈（已落地）

- 框架：Vue 3（Composition API）
- 路由：Vue Router 5（Hash 模式）
- 状态管理：Pinia 3
- 构建：Vite 7
- 样式：Tailwind CSS v4 + 自定义 CSS 变量
- 图标：Font Awesome
- 质量：ESLint + Prettier + Vitest
- CI/CD：GitHub Actions（CI + GitHub Pages 部署）

关键文件：
- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

## 3. 信息架构（当前）

### 3.1 路由

已注册：
- `/lock` 锁屏
- `/home` 主屏
- `/settings` 设置
- `/appearance` 外观工坊（独立模块）
- `/chat`、`/chat/:id` 聊天
- `/contacts` 联系人
- `/gallery` 相册
- `/map` 地图
- `/phone`、`/calendar`、`/wallet`、`/worldbook`、`/stock`（扩展模块）

关键文件：`src/router/index.js`

### 3.2 状态分层

- `system`：系统配置、API 配置、主题配置、用户档案
- `chat`：联系人、会话历史
- `map`：地址簿、当前位置、行程估算

关键文件：
- `src/stores/system.js`
- `src/stores/chat.js`
- `src/stores/map.js`

## 4. 已完成进度（Done）

### 4.1 主屏与模块入口
- 主屏支持分页滑动、Dock、图标入口。
- 重复入口已替换为模块入口（Map/Wallet/Calendar/Phone/WorldBook/Stock）。
- 主题入口仅保留在 Home（Themes），Settings 不再重复入口。

关键文件：`src/views/HomeView.vue`

### 4.2 外观模块独立
- 外观已从 Settings 逻辑中拆出为独立页面。
- 支持 Y2K / Pure White、壁纸 URL、自定义 CSS。

关键文件：`src/views/AppearanceView.vue`

### 4.3 Settings 重构（可用）
- 保留网络/API、世界书、系统设置、数据导出。
- API 改为 URL + Key 自动识别，不再手动选 OpenAI/Gemini。
- 支持模型自动拉取 + 下拉选择 + 手动模型兜底。

关键文件：
- `src/views/SettingsView.vue`
- `src/lib/ai.js`

### 4.4 Chat 主链路
- 会话列表与单聊窗口可用。
- AI 回复主链路可用。
- 支持智能建议回复与位置共享消息注入。

关键文件：`src/views/ChatView.vue`

### 4.5 Contacts 与 Map
- Contacts：支持新增主联系人/NPC，支持 AI 补全人设草稿。
- Map：支持地址簿、定位切换、手动定位、打车估算。

关键文件：
- `src/views/ContactsView.vue`
- `src/views/MapView.vue`

### 4.6 数据持久化（已完成基础版）
- `system/chat/map` 已接入本地持久化（localStorage）。
- 已加入版本号（schema version）封装，支持后续迁移。
- 刷新页面后，设置/联系人/聊天记录/地图数据可恢复。

关键文件：
- `src/lib/persistence.js`
- `src/stores/system.js`
- `src/stores/chat.js`
- `src/stores/map.js`

### 4.7 工程化与部署
- CI：push / PR 自动执行 lint + build。
- Deploy：main 分支自动部署 GitHub Pages。

关键文件：
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

## 5. 模块完成度评估

- LockScreen：`80%`
- Home：`78%`
- Settings：`75%`
- Appearance：`68%`
- Chat：`72%`
- Contacts：`58%`
- Map：`65%`
- Phone/Calendar/Wallet/WorldBook/Stock：`20%~35%`

## 6. 当前风险与技术债

1. 文案与编码历史包袱
- 仍存在少量历史文件可能有编码风险（已新增编码约束防回退）。
- 建议统一做一轮“术语与文案”标准化。

2. API 模型拉取受网关策略影响
- 某些服务不开放 `/models` 或存在 CORS 限制，自动拉取可能失败。
- 当前已有手动模型名兜底，但错误提示可继续细化。

3. 扩展模块目前以占位为主
- Phone/Calendar/Wallet/WorldBook/Stock 需要逐步从占位走向可用 MVP。

## 7. 后续待办（按优先级）

## P0（先做，保障可持续）

1. Settings 分层定稿
- 固化二级菜单：`用户档案`、`世界书`、`网络与 API`、`系统`、`备份恢复`。
- API 预设（多套 URL+Key+Model）支持保存与切换。

2. 文案标准化
- 统一术语与中英文风格（例如：首页/主页、世界书/World Book 的统一规则）。
- 清理残余乱码或不一致提示文案。

3. 持久化增强
- 增加“清除本地数据”入口。
- 增加迁移函数模板（为未来字段变更做准备）。

## P1（核心体验增强）

4. 外观工坊增强
- App 名称自定义（显示层）
- App 图标自定义（URL/本地上传）
- Widget 页面编辑（排序、开关、恢复默认）

5. Chat 能力增强
- 订阅号/频道消息流（可配置 Prompt）
- 消息类型体系（文本/系统卡片/位置/提醒）
- 会话置顶、未读、草稿

6. 联系人关系网
- 主联系人与 NPC 绑定关系
- 聊天上下文按关系网注入

## P2（业务扩展）

7. 世界书模块化
- 条目管理、优先级、标签、检索
- 与聊天注入策略联动

8. 钱包/日程/股票联动
- 先 Mock 数据链路，再换真实 API
- 支持事件触发聊天（账单、股价异动）

9. 相册生图
- provider 开关、参数模板、历史记录、失败重试

## 8. 推荐执行顺序

Sprint A
1. Settings 分层定稿
2. 文案标准化
3. 持久化增强（清除与迁移模板）

Sprint B
1. 外观工坊增强（图标/名称/Widget 编辑）
2. Chat 订阅号 MVP

Sprint C
1. 联系人关系网 + 世界书条目化
2. 钱包/日程/股票联动 MVP

## 9. 每次提交前检查清单

- `npm run lint`
- `npm run build`
- 关键路径手测：`/home`、`/settings`、`/appearance`、`/chat`
- API URL + Key + 模型拉取流程回归

## 10. 当前建议的下一步

建议直接开始：`P0-1 Settings 分层定稿（先把“用户档案”独立成完整二级页）`。

原因：
- 这是后续“联系人关系网 + 世界书注入 + 主题美化”的配置中枢。
- 定稿后再做功能扩展，返工最少。
## 11. 开发规则（固定）

以下规则作为本项目后续协作的固定约束，除非你明确要求调整，否则默认长期生效。

### 11.1 架构规则

1. 页面职责分离：`Home` 负责入口与使用，`Settings` 负责系统配置，`Appearance` 负责美化，`Network` 负责 API。
2. 禁止在组件内直写 AI 请求：统一走 `src/lib/ai.js`。
3. 状态按业务域拆分：`system/chat/map`，不回退到单一巨型 store。
4. 新增模块必须先注册路由，再接入 Home 入口图标。
5. API 配置结构统一放在 `settings.api`，预设统一放在 `settings.api.presets`。
6. 所有可主题化样式优先走 CSS 变量，不在页面里硬编码颜色。
7. 本地持久化保留版本号封装，后续字段变更必须带迁移逻辑。

### 11.2 UI / 交互规则

1. 项目目标为“手机屏幕交互壳”，不再新增手机外框视觉。
2. `Settings` UI 按 iOS 分层：用户设定、世界书设定、系统设置、备份恢复。
3. 用户信息与世界书分离：用户设定页不再混入世界观文本；世界书页只管世界观。
4. 网络(API)与美化均为独立入口模块，不回塞到 Settings 主流程。
5. 主页图标命名优先面向用户语义（例如 `API`、`Themes`），避免技术名泄露。
6. 高风险操作（如清空预设）必须二次确认。
7. 输入类页面默认提供清晰反馈：加载态、错误提示、空状态。

### 11.3 开发流程规则

1. 每次改动后必须至少通过：`npm run lint`、`npm run build`。
2. 修改信息架构（路由、store 字段、入口）后，同步更新本文件。
3. 提交前检查关键路径：`/home`、`/settings`、`/appearance`、`/network`、`/chat`。
4. 任何会影响历史数据的字段变更，先做兼容，再做清理。
5. 对话上下文接近上限时，优先把“决定”写入文档，而不是只留在会话中。

### 11.4 上下文压缩续接清单

当上下文窗口接近 100% 或发生自动压缩时，继续开发前按下面顺序执行：

1. 先读 `PROJECT_STATUS.md` 的“开发规则（固定）”。
2. 再读“后续待办（按优先级）”，确认当前 Sprint 目标。
3. 开始改动前先声明“本次只做哪一项”，避免范围漂移。
4. 改完后把新增约束/变更写回文档，形成闭环。

---

执行优先级说明：
- 若“临时对话指令”与本规则冲突，以你当次明确指令为准。
- 若无冲突，默认严格按本规则执行。