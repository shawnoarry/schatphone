# SchatPhone

Updated / 更新时间: 2026-08-26

Integrated baseline / 已集成基线: `f06a575`

SchatPhone is a local-first immersive virtual phone and AI life-simulation product built with Vue 3. It combines a phone shell, persistent roles and worlds, relationship continuity, communication, media, maps and schedules, commerce/finance, installed app experiences, and optional runtime review.

SchatPhone 是一个基于 Vue 3 的本地优先沉浸式虚拟手机与 AI 生活模拟产品，包含手机壳层、持续角色与世界、关系连续性、通信、媒体、地图日程、商业金融、安装式 App 体验，以及可选的运行时审阅。

## Current State / 当前状态

- Product stage: integrated local-first V1 in product-preview, durable-continuity, and release-hardening work.
- Current execution: `CMG-08` is the next separately assignable P0 item; `CMG-09` and `CMG-10` follow its dependency chain.
- Release posture: browser/CI/hosted baselines are substantial; installed-PWA/relaunch, external protections, backup round trip, and named physical-device proof remain open.
- Scope rule: a whole-project summary never replaces package-level milestones. For example, an S1 App Shell may be complete while its future S2 owner and S3 event chain remain unimplemented.

- 产品阶段：本地优先 V1 已集成，当前重点是产品预览、连续性收口与发布硬化。
- 当前执行：`CMG-08` 是下一个可独立分配的 P0；随后按依赖推进 `CMG-09`、`CMG-10`。
- 发布状态：浏览器、CI 与托管基线已较完整；安装后 PWA 重启、外部保护、备份往返和具名真机证据仍未闭合。
- 范围规则：全局总结不能覆盖各 package 的单项进度。例如 App Shell 的 S1 完成，不代表其 S2 owner 或 S3 事件链已经完成。

The only live execution board is `docs/roadmap/TODO_ROADMAP.md`.

## Product Shape / 产品形态

- Shell and system: Lock, Home, Today View, Notification Center, widgets, Settings, Appearance, Network, App Store.
- Communication: Chat, Chat Directory, Contacts, groups, service accounts, Phone, Mail.
- World and continuity: Book, WorldBook, World Pack, Relationship Runtime, Event Runtime, optional World Hub.
- Life and media: Gallery, Camera/Image Generation, Music, TTS preview, Weather, Map, Calendar, Agenda Journey, Reminders.
- Commerce and finance: independent Shopping storefronts, Food Delivery entries, Logistics, Wallet, Assets, Stock.
- S1 installed-app previews: Browser, Community, Healthcare, Housing, Workplace, Fandom, Tickets, Travel, Intercity, Creator Rights, Parcel, and Career.
- Storage: local-first Store state, layered recovery, IndexedDB Repository foundation with Book as the reference cutover, and complete local backup packages.
- Hosted support: GitHub Pages plus optional Vercel/Cloudflare compatibility routes; the lightweight push relay is not a production backend.

## Product Boundaries / 产品边界

- Contacts owns the global role archive; Chat Directory owns Chat binding.
- Chat owns messages and channel state; Relationship Runtime owns current relationship truth and memory.
- Book owns long text; WorldBook owns activation; World Pack owns reviewed capability bundles.
- Calendar owns confirmed schedules; Reminders owns raw cues; Map owns route, place, and journey truth.
- Commerce Apps own orders; Wallet owns downstream ledger truth; Chat stores source references and presentation only.
- Event Runtime coordinates causality and review but does not take over source-owner records.
- World Hub remains optional review; Cheats and closed-page autonomy are not finished product capabilities.
- Files remains an internal compatibility/index surface.

## Tech Stack / 技术栈

- Vue 3.5 and Composition API
- Vue Router 5, hash mode
- Pinia 3
- Vite 7 and Tailwind CSS 4
- Marked, Font Awesome, Leaflet, and MapLibre GL
- Vitest, Vue Test Utils, jsdom, and Playwright
- ESLint and Prettier
- lightweight Node `web-push` relay

Application source remains JavaScript/Vue. TypeScript is installed for tooling, but the integrated application source has no `.ts/.tsx` files.

## Local Development / 本地开发

```bash
npm install
npm run dev
```

Real push development uses a separate local process:

```bash
npm run push:keys
npm run push:server
```

The relay stores local trial data under `server/data/`. It has no production authentication, tenancy, or authoritative simulation model.

## Quality Checks / 质量检查

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
npm run governance:check
```

PR CI and main Pages deployment definitions run separate production/full dependency audits, lint, unit tests, production build, and one full Playwright collection. Passing those browser gates does not by itself prove installed-PWA behavior, every provider, OS permission behavior, weak-network recovery, or physical-device ergonomics.

## Data Security Note / 数据安全说明

Local-first does not mean encrypted at rest:

- provider settings and user data rely on the browser/profile security boundary;
- a complete local migration backup intentionally includes configured settings and credentials under the current contract;
- every complete export requires a prominent sensitive-file warning;
- a redacted/shareable export and encrypted personal remote backup remain separate future contracts and must not silently replace complete migration backup.

## Documentation / 文档

Start here:

- `AGENTS.md`: stable agent bootstrap
- `docs/process/AI_WORK_MODE.md`: project execution contract
- `docs/roadmap/TODO_ROADMAP.md`: only live execution board
- `docs/pm/TASK_PACKAGE_INDEX.md`: ownership routing
- matching package `README.md` and `STATUS_AND_HANDOFF.md`: detailed scoped progress
- `docs/overview/PROJECT_MASTER_GUIDE.md`: whole-project context
- `docs/pm/TODO_PM_STATUS_REPORT.md`: current PM rollup
- `docs/process/DOCUMENT_GOVERNANCE.md`: document alignment and status-preservation rules
