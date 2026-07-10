# SchatPhone

Updated / 更新时间: 2026-07-10

SchatPhone is a local-first virtual phone and AI life-simulation product built with Vue 3. It combines a phone shell, AI role/world context, relationship continuity, media, maps and schedules, commerce/finance apps, push delivery, and optional runtime review.

SchatPhone 是一个基于 Vue 3 的本地优先虚拟手机与 AI 生活模拟产品，包含手机壳层、AI 角色与世界上下文、关系连续性、媒体、地图日程、商业金融应用、推送送达，以及可选的运行时审阅。

## Current State / 当前状态

- Product stage: integrated local-first V1, not a prototype and not yet a production-hardened final release.
- Completed roadmap baselines: Contacts V2 IA, explicit-lineage memory dedupe, World Hub review quality, and commerce service-account continuity.
- Active lane: architecture, security, CI, and documentation maintenance.
- Partial lane: World Pack/App Archetype/Service Template phone hardening.
- Decision lane: Modern Seoul K-pop content carrier governance.

- 产品阶段：已集成的本地优先 V1，不再是原型，但尚未达到完整生产硬化与最终视觉质量。
- 已完成主线：通讯录 V2 信息架构、显式来源记忆去重、世界中枢审阅质量、商业服务号连续性。
- 当前主线：架构、安全、CI 与文档治理。
- 部分完成：世界包/应用原型/服务模板的真机验证与加固。
- 待决策：现代首尔 K-pop 内容载体治理。

The only live execution board is `docs/roadmap/TODO_ROADMAP.md`.

## Product Shape / 产品形态

- Shell: Lock, Home, Today View, notifications, widgets, Settings, Appearance, Network, App Store.
- Communication: Chat, Chat Directory, Contacts, groups, service/official accounts, Phone.
- World and relationship: Book, WorldBook, World Pack, relationship runtime, Event Runtime, optional World Hub.
- Life apps: Gallery, Map, Calendar, Reminders.
- Commerce and finance: Shopping, Logistics, Food Delivery, Wallet, Assets, Stock.
- Storage: localStorage primary state, IndexedDB mirror/repair, optional Gallery binary backup packages.
- Push: browser service worker plus an optional lightweight Node relay.

- 壳层：锁屏、主屏、今日视图、通知、组件、设置、外观、网络、应用商城。
- 通信：聊天、Chat 通讯录、通讯录、群聊、服务号/公众号、电话。
- 世界与关系：文本库、世界书、世界包、关系运行时、事件运行时、可选世界中枢。
- 生活应用：照片、地图、日历、提醒事项。
- 商业金融：购物、物流、外卖、钱包、资产、股票。
- 存储：localStorage 主状态、IndexedDB 镜像与修复、可选照片二进制备份包。
- 推送：浏览器 Service Worker 与可选轻量 Node 中继。

## Product Boundaries / 产品边界

- Contacts owns the global role archive; Chat Directory owns Chat binding.
- Chat owns messages/channel state; relationship runtime owns current relationship truth and memory.
- Book owns long text; WorldBook owns activation; World Pack owns reviewed capability bundles.
- Calendar owns confirmed schedules; Reminders owns raw cues; Map owns route/location truth.
- commerce apps own orders; Wallet owns downstream ledger records; Chat stores notification references only.
- World Hub is optional review; Cheats is not a finished feature.
- Files is an internal compatibility/index surface.

## Tech Stack / 技术栈

- Vue 3.5 + Composition API
- Vue Router 5, hash mode
- Pinia 3
- Vite 7
- Tailwind CSS 4 + project CSS tokens
- Marked + Font Awesome
- Vitest + Vue Test Utils + jsdom
- Playwright
- ESLint + Prettier
- lightweight Node `web-push` relay

Application source is JavaScript/Vue. TypeScript is installed but the current app has no `.ts/.tsx` source files.

## Local Development / 本地开发

```bash
npm install
npm run dev
```

Real push development uses a second process:

```bash
npm run push:keys
npm run push:server
```

The relay writes local VAPID keys, subscriptions, and schedules under `server/data/`; these files are ignored by Git.

The relay is intended for local/single-operator trials. It has no authentication or multi-user production security model.

## Quality Checks / 质量检查

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

Verified on 2026-07-10:

- lint: pass;
- unit/component: 171 files, 1050 tests, pass;
- production build: pass;
- Playwright: 18 desktop/mobile tests, pass;
- production dependency audit: 0 known vulnerabilities;
- full dependency audit: development/tooling advisories remain and are tracked in roadmap 4.5.

CI currently runs lint, unit tests, and build. It does not yet run Playwright or dependency audit.

## Data Security Note / 数据安全说明

SchatPhone is local-first, but local does not mean encrypted:

- AI provider settings and user data are stored in the browser profile;
- current backup JSON includes the full settings snapshot, including the configured API key;
- backup files must be treated as sensitive;
- the credential-export policy is an active P0 roadmap item.

## Routes / 路由

Main routes:

- `/lock`, `/home`
- `/settings`, `/appearance`, `/widgets`, `/network`, `/profile`, `/app-store`
- `/chat`, `/chat/:id`, `/chat-contacts`, `/chat-groups`, `/chat-me`, `/chat-settings`, `/chat-settings/appearance`
- `/contacts`, `/gallery`, `/phone`
- `/worldbook`, `/book`
- `/map`, `/calendar`, `/reminders`
- `/shopping`, `/food-delivery`, `/wallet`, `/assets`, `/stock`

Optional/internal:

- `/control-center`: World Hub
- `/files`: internal compatibility route
- `/more`: redirect to Settings

## Documentation / 文档

Start here:

- `docs/README.md`: documentation map and authority rules
- `docs/overview/PROJECT_MASTER_GUIDE.md`: detailed project/architecture/progress overview
- `docs/roadmap/TODO_ROADMAP.md`: only live execution board
- `docs/pm/TODO_PM_STATUS_REPORT.md`: PM-readable status
- `docs/architecture/ARCHITECTURE.md`: technical architecture and boundaries
- `docs/pm/TASK_PACKAGE_INDEX.md`: task-package routing
- `docs/process/AI_WORK_MODE.md`: workflow and documentation sync rules
