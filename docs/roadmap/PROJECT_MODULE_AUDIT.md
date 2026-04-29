# SchatPhone Project Module Audit / SchatPhone 项目模块梳理表

Updated / 更新时间: 2026-04-29

## 1. Purpose / 用途

This document is a working audit table for product planning and engineering handoff. It summarizes each module by current state, user-visible gaps, technical debt, next suggested work, and priority.

本文档用于产品规划与工程接手：按模块汇总当前状态、用户可见缺口、技术债、下一步建议与优先级。

Authority note / 职责说明：

- This is a candidate pool and maturity audit, not the live execution board.
  本文是候选池和成熟度梳理表，不是动态执行看板。
- When a suggested item becomes active work, copy or summarize it into `docs/roadmap/TODO_ROADMAP.md`.
  当某条建议进入实际开发，必须复制或摘要到 `docs/roadmap/TODO_ROADMAP.md`。
- Workflow rules live in `docs/process/AI_WORK_MODE.md`.
  流程规范统一放在 `docs/process/AI_WORK_MODE.md`。

Priority legend / 优先级说明：

- `P0.5`: near-term stabilization or polish before broad P1 expansion / P1 大扩展前应优先稳定或打磨
- `P1`: active immersive expansion / 当前沉浸扩展主线
- `P2`: later module growth / 后续模块成长
- `Watch`: keep healthy, no immediate feature push / 持续观察，不急于加功能

## 2. Overall Judgment / 总体判断

The project is past the P0 closure stage. The strongest usable foundation is now:

项目已越过 P0 收口阶段。当前最强的可用基线是：

1. Core phone shell: Lock, Home, Settings, notifications.
   核心手机壳：锁屏、桌面、设置、通知。
2. AI relationship loop: Chat, Contacts, Chat Directory, role binding.
   AI 关系链路：聊天、通讯录、会话通讯录、角色绑定。
3. Asset and continuity layer: Gallery asset hub, persistence, backup, diagnostics.
   素材与连续性层：相册素材中台、持久化、备份、诊断。
4. Immersion expansion base: WorldBook and Map simulation-first baseline.
   沉浸扩展基线：世界书与模拟优先地图。

The weakest current area is not architecture, but module maturity imbalance: some modules are production-like, while Phone/Calendar/Wallet/Stock remain placeholder-grade.

当前最弱点不是架构，而是模块成熟度不均：部分模块接近可用产品，Phone/Calendar/Wallet/Stock 仍是占位级。

## 3. Module Audit Table / 模块梳理表

| Module / 模块 | Current State / 当前状态 | User-Visible Gaps / 用户可见缺口 | Technical Debt / 技术债 | Next Suggested Work / 下一步建议 | Priority / 优先级 |
| --- | --- | --- | --- | --- | --- |
| Lock Screen / 锁屏 | Stable default entry with lock guard, grouped notifications, tap-through unlock. | Notification density and grouping may need more real-device style polish. | Notification rendering depends on shared shell state; future modules must not bypass notification meta rules. | Add a small notification-surface checklist for every new module. | Watch |
| Home / 桌面 | Stable 5-page shell, protected app entries, optional gated layout editing. | Layout editing is intentionally hidden; users may not discover customization. | Drag/layout logic is concentrated in one large view. | Decide whether layout edit is a dev-only tool or a user feature; if user-facing, add a clear settings entry. | P1 |
| Settings / 设置 | Strong configuration center: general, notification, automation, backup, diagnostics, push. | Page is large and dense; non-technical users may struggle with backup/push wording. | `SettingsView.vue` is one of the largest files and mixes many subdomains. | Split Settings into smaller section components after current cleanup stabilizes. | P0.5 |
| Network / 网络 | Usable API setup, model fetch, presets, diagnostics. | Provider setup still feels technical. | Error/report copy is spread between Network and system report logic. | Add provider preset examples and a “test connection” guided state. | P1 |
| Chat / 聊天 | Core gameplay path is strong: rich send, manual trigger, message actions, preferences, structured assistant blocks, scheduled push mirror. | Chat settings are still dense; AI reference-image behavior may be hard to understand. | `ChatView.vue` is very large and owns many unrelated UI flows. | Extract message action sheet, thread settings, rich-send panel, and AI status blocks into components. | P0.5 |
| Chat Directory / 会话通讯录 | Role/service binding, templates, batch mode, asset readiness previews. | Role/service/template concepts may be hard for non-technical users. | UI and template management are concentrated in one large view. | Add a plain-language “role vs service” empty-state guide and split template modal logic. | P1 |
| Contacts / 主通讯录 | Global role archive with profile editing, asset-folder slots, knowledge-point binding. | Role profile creation can still feel like configuration rather than character creation. | Role asset and world-knowledge controls share a dense form. | Add profile creation presets and a simplified first-time role setup flow. | P1 |
| Gallery / 相册素材中台 | Global asset hub with import, folders, usage badges, in-use filtering, delete/replace safety. | Still balances two identities: iOS-like album vs asset-management console. | Asset hub behavior is embedded in a large page; future modules may need shared picker components. | Extract shared asset picker/usage badge components; keep Gallery UI photo-first. | P0.5 |
| Appearance / 外观 | Theme, widgets, wallpaper source modes, app icon presets, gallery wallpaper integration. | Uploaded custom app icons are not supported; icon customization is preset-only. | Widget import/editor and appearance settings live together. | Decide if uploaded app icons are in scope; otherwise mark presets as the official model. | P1 |
| WorldBook / 世界书 | Global worldview + knowledge points are split and bindable into Chat; usage visibility plus filters/sorting are now available. | Users can see and manage usage states, but broader non-Chat module consumption is still thin. | Consumption is strongest in Chat; broader module usage is still thin. | Decide broader module consumption or move product depth to Map rewards/events. | P1 |
| Map / 地图 | Simulation-first baseline with trip lifecycle, reminders, history, gallery/default visuals, optional AI visual refresh, trip rewards/events, route familiarity tiers, derived area unlocks, lightweight area feedback, and Calendar reminder cues with confirm/pin/dismiss state. | Reward depth is improving, but Map should remain the suggestion source rather than owning Calendar push delivery. | Map store/view include automation, visual, trip, reward, route familiarity, area unlock, feedback, reminder choices, and push concerns together. | Keep Map as cue source; keep real reminder scheduling owned by Calendar events. | P1 |
| Files / 文件 | MVP file list, search, favorite, quick note creation. | Mock/local-only feel; not yet connected to real project assets or role/world data. | Data is local component state, not persisted or integrated. | Decide product role: document notebook, asset metadata browser, or future file manager. | P2 |
| More / 更多 | MVP quick entries and experimental toggles. | Toggles are local UI only and do not persist. | Feature toggles are illustrative, not wired into system settings. | Either wire toggles to real feature flags or rename this page as “Labs”/“Shortcuts”. | P2 |
| Profile / 用户信息 | Basic profile editor with persistence via system store. | Profile does not yet show downstream effects in Chat/world prompts. | Simple page is fine, but copy can better explain role in AI context. | Add a short “used in AI context” hint and optional preview of prompt-facing profile summary. | P1 |
| Phone / 电话 | Placeholder module with corrected Chinese copy. | No real calling/log/social loop yet. | None beyond placeholder status. | Define whether Phone should support role calls, missed-call events, or AI-generated call summaries. | P2 |
| Calendar / 日历 | Lightweight reminder surface consumes Map-derived area feedback cues, lets users confirm/pin/dismiss, stores confirmed reminders as Calendar events, supports event time editing, and schedules real push from confirmed event times. | Calendar still lacks a fuller event list, push delivery history, and quiet-hours visibility. | Calendar reads Map cues, writes user choice back to Map reminder preferences, owns a small persisted event store, preserves user-edited event times, and tracks scheduled push state. | Add Calendar push history/status polish or a fuller event management surface. | P1 |
| Wallet / 钱包 | Placeholder module with corrected Chinese copy. | No balance, transaction, transfer, or economy loop. | None beyond placeholder status. | Reuse Chat transfer blocks as the first ledger source; add fake balance history. | P2 |
| Stock / 股票 | Placeholder module with corrected Chinese copy. | No watchlist, holdings, event-driven price changes. | None beyond placeholder status. | Treat as simulation module tied to Calendar/World events, not real finance first. | P2 |
| Push Server / 推送服务 | Lightweight relay supports real and scheduled push delivery. | Does not generate closed-page autonomous events. | Server is intentionally small; future orchestration needs a separate design. | Decide if next milestone should include server-side event generation or keep push as delivery-only. | P1 decision |
| Persistence / 备份与存储 | Layered local persistence, backup, diagnostics, asset package path. | Backup model can still confuse non-technical users. | Storage concerns are broad and high-risk; docs must stay synced. | Add backup “what is included” checklist in Settings and docs. | P0.5 |

## 4. Cross-Cutting Workstreams / 横向工作流

| Workstream / 工作流 | Why It Matters / 为什么重要 | Suggested Next Step / 下一步建议 |
| --- | --- | --- |
| Mojibake guard / 中文乱码守卫 | Recent cleanup found user-visible mojibake in MVP pages. | Add a lightweight script or test that scans `src` for known mojibake fragments. |
| Component extraction / 组件拆分 | `ChatView.vue`, `SettingsView.vue`, and `ChatDirectoryView.vue` are large and riskier to edit. | Extract one low-risk UI panel at a time, starting with Chat rich-send panel or Settings storage diagnostics. |
| Shared dialog rule / 统一页内对话框规则 | Browser-native prompts have been cleaned from current views. | Add a lint-like scan in tests or docs to prevent new `window.confirm/window.prompt`. |
| Asset picker reuse / 素材选择器复用 | Gallery, Appearance, Contacts, Chat, and Map all touch assets. | Shared badge is landed across Gallery, Appearance, Chat, Map, and Contacts; next decide whether a shared thumbnail picker is worth extracting. |
| Module maturity tiers / 模块成熟度分层 | Prevents placeholder modules from being mistaken for complete features. | Track every module as `Stable / MVP / Placeholder / Future`. |
| Server orchestration decision / 服务端编排决策 | Real push delivery exists; closed-page event generation does not. | Make a PM decision before writing server automation code. |

## 5. Recommended Ordering / 推荐推进顺序

1. P0.5 cleanup: add mojibake guard, keep lint/build/test green, and prevent browser-native dialog regression.
   P0.5 清理：增加乱码守卫，保持 lint/build/test 通过，防止浏览器原生弹窗回潮。
2. P0.5 component split: reduce risk in Chat, Settings, and Gallery by extracting shared panels.
   P0.5 组件拆分：通过提取共享面板降低 Chat、Settings、Gallery 的修改风险。
3. P1 product depth: Map rewards/events/familiarity/area unlocks/feedback, WorldBook usage visibility, Calendar reminder integration.
   P1 产品深度：地图奖励/事件/熟悉度/区域解锁/反馈、世界书使用可见性、日历提醒接入。
4. P1 decision: choose whether closed-page autonomous event generation is in the next milestone.
   P1 决策：确认“页面关闭后自动生成事件”是否进入下一里程碑。
5. P2 module growth: Phone, Wallet, Stock, Files, and More can grow after the main immersion loops are clearer.
   P2 模块成长：Phone、Wallet、Stock、Files、More 在主沉浸循环更清楚后再扩展。

## 6. Next Suggested Slice / 下一步建议切片

Status / 状态: promoted to `docs/roadmap/TODO_ROADMAP.md` on 2026-04-29.

状态：已于 2026-04-29 转入 `docs/roadmap/TODO_ROADMAP.md`。

Best next implementation slice:

最推荐的下一步实现切片：

1. Add a `mojibake` regression scan script/test for `src` — `DONE` in `tests/mojibake-guard.test.js`.
   为 `src` 增加中文乱码回归扫描脚本/测试 — 已在 `tests/mojibake-guard.test.js` 完成。
2. Add a module maturity table link to active planning docs — `DONE` in `docs/README.md` and `docs/roadmap/TODO_ROADMAP.md`.
   在活跃规划文档中加入模块成熟度表入口 — 已在 `docs/README.md` 与 `docs/roadmap/TODO_ROADMAP.md` 完成。
3. Start one low-risk component extraction from `ChatView.vue` or `SettingsView.vue` — `DONE` with Settings display components.
   从 `ChatView.vue` 或 `SettingsView.vue` 开始做一个低风险组件拆分 — 已通过 Settings 展示组件完成。
4. Extract the first shared asset status display piece — `DONE` with `AssetStatusBadge.vue` in Gallery and Appearance.
   抽出第一个共享素材状态展示组件 — 已通过 Gallery 与 Appearance 共用的 `AssetStatusBadge.vue` 完成。
5. Apply the shared asset status language to Chat, Map, and Contacts — `DONE`.
   将共享素材状态语言扩展到 Chat、Map、Contacts — 已完成。
6. WorldBook usage visibility phase-1 — `DONE`.
   世界书使用可见性第一阶段 — 已完成。
7. WorldBook usage filters/sorting — `DONE`.
   WorldBook 使用状态筛选/排序 — 已完成。
8. Map rewards/events phase-1 — `DONE`.
   地图奖励/事件第一阶段 — 已完成。
9. Map route familiarity phase-2 — `DONE`.
   地图路线熟悉度第二阶段 — 已完成。
10. Map area unlocks phase-1 — `DONE`.
    地图区域解锁第一阶段 — 已完成。
11. Map area feedback phase-1 — `DONE`.
    地图区域反馈第一阶段 — 已完成。
12. Calendar map-reminder phase-1 — `DONE`.
    日历地图提醒第一阶段 — 已完成。
13. Calendar reminder confirmation/pinning — `DONE`.
    日历提醒确认/固定 — 已完成。
14. Calendar event store phase-1 — `DONE`.
    日历事件存储第一阶段 — 已完成。
15. Calendar event time editing — `DONE`.
    日历事件时间编辑 — 已完成。
16. Calendar event scheduled push handoff — `DONE`.
    日历事件定时推送接入 — 已完成。
17. Calendar event push reschedule/cancel guard — `DONE`.
    日历事件推送重排/取消守卫 — 已完成。
18. Next best slice: add Calendar push delivery history/quiet-hours visibility; keep WorldBook search/tag filters as a later support task.
    下一步最推荐：补充 Calendar 推送送达历史/勿扰策略可见性；WorldBook 搜索/标签筛选作为后续支持任务保留。
