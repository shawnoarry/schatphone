# SchatPhone

Updated / 更新时间: 2026-06-01

SchatPhone is a local-first virtual phone and AI life-simulation shell built with Vue 3. It combines phone-like apps, AI role/world context, relationship continuity, shared media/storage, real push delivery, and optional game-like runtime controls.

SchatPhone 是一个本地优先的虚拟手机与 AI 生活模拟壳层。它把类手机应用、AI 角色与世界观上下文、关系连续性、共享素材/存储、真实推送送达，以及可选的游戏化运行时控制组合在一起。

## Current Direction / 当前方向

- Current project-level focus: `I1 Ownership Closure`.
- Completed project-level foundation: `I0 Governance Reset`.
- The project-level plan lives in `docs/strategy/PROJECT_ITERATION_PLAN.md`.
- Concrete execution tasks still belong only in `docs/roadmap/TODO_ROADMAP.md`.
- Visual rebuild work is parked unless explicitly resumed.
- The next feature-risk is ownership clarity, not missing isolated features.

- 当前项目级重点：`I1 职责收口`。
- 已完成项目级基础：`I0 治理复位`。
- 项目级计划见 `docs/strategy/PROJECT_ITERATION_PLAN.md`。
- 具体执行任务仍只进入 `docs/roadmap/TODO_ROADMAP.md`。
- 视觉重建已暂存，除非明确恢复。
- 当前最大功能风险是职责归属清晰度，而不是缺少单点功能。

## Current Product Shape / 当前产品形态

- Shell: lock screen, Home, fixed `-1` Today View, widgets, Settings, Appearance, Network, and system notifications.
- Communication: Chat, Chat Directory, Contacts, Phone, AI prompt context, rich messages, role/service accounts, and scheduled push hints.
- World and relationship layer: WorldBook, Book text library, relationship runtime, safe relationship facts, event runtime, and optional World Hub review.
- Media, commerce, and ownership apps: Gallery, Assets, Wallet, Stock, Map, Calendar, Reminders, Shopping, Food Delivery, and App Store-managed folder mini-app facades.
- Push: real web-push delivery is available through the lightweight relay server. Fully closed-page event generation is still future backend orchestration work.
- Storage: local persistence, IndexedDB mirror checks, backup/export/import, and diagnostics are available through Settings.

- 壳层：锁屏、Home、固定 `-1` 今日视图、Widget、Settings、Appearance、Network 与系统通知。
- 通信：Chat、Chat Directory、Contacts、Phone、AI 上下文、富消息、角色/服务号与定时推送提示。
- 世界与关系层：WorldBook、关系运行时、安全关系事实、事件运行时与可选 World Hub 审阅。
- 媒体与归属应用：Gallery、Assets、Wallet、Stock、Map、Calendar、Reminders、Shopping、Food Delivery、More。
- 推送：已支持通过轻量中继服务进行真实 Web Push 送达。页面关闭后的完整事件生成仍是后续后端编排工作。
- 存储：本地持久化、IndexedDB 镜像检查、备份/导出/导入与诊断集中在 Settings。

## Product Boundaries / 产品边界

- Calendar should become the real schedule/date app.
- Reminders should own cross-module cues, callbacks, follow-ups, logistics reminders, stock review cues, and world/task objectives.
- Reminders is a visible Home app beside Calendar; it should not be hidden in More.
- Files is internal storage and diagnostics infrastructure. `/files` may remain as a compatibility/developer route, but Files should not be promoted as a normal frontend app.
- World Hub is optional runtime review/control. It uses `/control-center` and `app_control_center` for technical compatibility, but normal app flows should not require it.
- Relationship facts should come from explicit, low-impact user actions first. High-impact romance/conflict automation remains guarded or deferred.

- Calendar 应回归真实日程/日期应用。
- Reminders 应承接跨模块线索、回拨、跟进、物流提醒、股票复盘线索与世界/任务目标。
- Reminders 是与 Calendar 并列的 Home 可见应用，不应被隐藏进 More。
- Files 是内部存储与诊断基础设施。`/files` 可作为兼容/开发者路由保留，但不应作为普通前台 App 推广。
- World Hub 是可选运行时审阅/控制入口。技术兼容名仍是 `/control-center` 与 `app_control_center`，但普通应用流程不应依赖它。
- 关系事实应优先来自低影响、显式用户行为。高影响恋爱/冲突自动化继续受控或暂缓。

## Tech Stack / 技术栈

- Vue 3 with `script setup`
- Vite 7
- Vue Router hash mode
- Pinia
- Tailwind CSS v4 with `@tailwindcss/vite`
- ESLint + Prettier
- Vitest + Vue Test Utils
- Lightweight Node web-push relay server

## Local Development / 本地开发

```bash
npm install
npm run dev
npm run push:server
```

Push development note / 推送开发说明：

- Run `npm run push:server` alongside `npm run dev` when testing real push locally.
- The first `npm run push:keys` or `npm run push:server` run creates local VAPID keys in `server/data/`; those JSON files are ignored by Git.

- 本地测试真推送时，需要同时运行 `npm run push:server` 与 `npm run dev`。
- 首次运行 `npm run push:keys` 或 `npm run push:server` 时，会在 `server/data/` 生成本地 VAPID 密钥；这些 JSON 文件已被 Git 忽略。

## Quality Checks / 质量检查

```bash
npm run lint
npm test
npm run build
```

CI should run the same baseline checks: lint, test, then build.

CI 应运行同一组基线检查：lint、test、build。

## Experimental Flags / 实验开关

- `VITE_ENABLE_LAYOUT_EDIT`: default `false`; keeps Home layout drag-edit hidden for normal users.
- To enable layout edit in development, set both:
  - `.env` contains `VITE_ENABLE_LAYOUT_EDIT=true`
  - browser `localStorage` contains `schatphone:layout_edit_enabled=true`

- `VITE_ENABLE_LAYOUT_EDIT`：默认 `false`，用于让 Home 拖拽布局编辑能力在普通用户场景保持关闭。
- 开发调试布局编辑时需同时满足：
  - `.env` 包含 `VITE_ENABLE_LAYOUT_EDIT=true`
  - 浏览器 `localStorage` 包含 `schatphone:layout_edit_enabled=true`

## Routes / 当前路由

Main user-facing routes:

- `/lock`
- `/home`
- `/settings`
- `/appearance`
- `/app-store`
- `/widgets`
- `/network`
- `/profile`
- `/worldbook`
- `/book`
- `/chat`
- `/chat-contacts`
- `/chat-feature/:feature`
- `/chat/:id`
- `/contacts`
- `/gallery`
- `/phone`
- `/map`
- `/calendar`
- `/reminders`
- `/wallet`
- `/stock`
- `/shopping`
- `/food-delivery`
- `/assets`
- `/more`

Compatibility or optional routes:

- `/control-center`: optional World Hub runtime-control surface.
- `/files`: internal/developer compatibility route for Files.

## Documentation Index / 文档索引

Start here / 文档总入口：

- `docs/README.md`: documentation map, reading order, and archive rules.
- `docs/strategy/PROJECT_ITERATION_PLAN.md`: project-level iteration direction and promotion rules.
- `docs/roadmap/TODO_ROADMAP.md`: only live execution board for concrete work.
- `docs/pm/TODO_PM_STATUS_REPORT.md`: PM-readable current status.
- `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`: product module catalog and route/function details.

Key decision docs / 关键决策文档：

- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
- `docs/product-decisions/FILES_INTERNAL_STORAGE_ROLE.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`

Main folders / 主要目录：

- `docs/pm/`: PM status, project brief, feature catalog, and glossary.
- `docs/strategy/`: project-level iteration plan and long-range direction.
- `docs/roadmap/`: live roadmap and module candidate pool.
- `docs/overview/`: project master guide and handoff references.
- `docs/process/`: workflow, operation, tooling, and validation rules.
- `docs/architecture/`: architecture and cross-module contracts.
- `docs/product-decisions/`: current topic-level product decisions.
- `docs/templates/`: reusable requirement, audit, and prompt templates.
- `docs/archive/`: obsolete or historical docs only.
