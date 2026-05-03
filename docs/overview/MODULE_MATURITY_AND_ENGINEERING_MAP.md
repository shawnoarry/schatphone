# SchatPhone Module Maturity and Engineering Map / SchatPhone 模块成熟度与工程接手地图

Updated / 更新时间: 2026-05-02

## 1. Purpose / 用途

This document is a handoff-oriented reference for future developers and AI coding assistants.  
It translates the current roadmap, PM status, module audit, routes, file sizes, and test coverage into a practical map for implementation sequencing.

本文档是给后续开发同事与 AI 编程助手使用的“接手参考图”。  
它把当前路线图、PM 状态、模块审计、路由、文件体量与测试覆盖，整理成更适合实施排序的工程地图。

Authority note / 职责说明：

- This file is a current reference document for understanding module maturity and engineering risk.
  本文是当前有效的“模块成熟度与工程风险参考文档”。
- It is not a live execution board and must not carry task status changes.
  它不是动态执行看板，不承载任务状态变更。
- Active work with status still belongs only in `docs/roadmap/TODO_ROADMAP.md`.
  任何带状态的执行任务仍只允许进入 `docs/roadmap/TODO_ROADMAP.md`。
- Use this file to decide where implementation is cheapest, riskiest, or most ready to expand.
  使用本文来判断哪些地方最适合扩展、最该稳住、以及哪些改动风险最高。

Source set / 参考来源：

- `docs/pm/TODO_PM_STATUS_REPORT.md`
- `docs/pm/PRODUCT_MANAGER_PROJECT_BRIEF.md`
- `docs/roadmap/TODO_ROADMAP.md`
- `docs/roadmap/PROJECT_MODULE_AUDIT.md`
- `docs/overview/PROJECT_MASTER_GUIDE.md`
- `docs/process/AI_WORK_MODE.md`
- `src/router/index.js`

---

## 2. Quick Judgment / 快速结论

The project is no longer in the "can it run?" stage.  
It is now in the "stable baseline + selective P1 expansion" stage.

项目已经不处于“能不能跑起来”的阶段。  
当前阶段更准确地说是“稳定基线 + 选择性 P1 扩展”。

The main engineering risk is not missing architecture, but maturity imbalance and oversized views.

当前最大的工程风险并不是架构缺失，而是模块成熟度不均，以及几个关键页面已经过大。

The strongest user-facing loops today are:

当前最强的用户闭环是：

1. Lock -> Home -> Chat -> Notification feedback  
   锁屏 -> 桌面 -> 聊天 -> 通知反馈
2. WorldBook -> Chat prompt injection  
   世界书 -> Chat 提示词注入
3. Map simulation -> Calendar reminder -> Calendar event -> Scheduled push  
   地图模拟 -> 日历提醒 -> 日历事件 -> 定时推送
4. Gallery asset hub -> cross-module asset consumption  
   相册素材中台 -> 跨模块素材消费

The cheapest next engineering work is still low-risk view decomposition, especially in Chat, Settings, and Map.

当前最划算的下一类工程工作仍是低风险视图拆分，尤其是 Chat、Settings、Map。

---

## 3. Maturity Tiers / 成熟度分层

### 3.1 Tier A: Stable Core Loops / A 档：稳定核心闭环

These modules already form real product loops and should be treated as active foundations, not placeholders.

这些模块已经形成真实产品闭环，应视为主基础设施，而不是占位页。

| Module / 模块 | Maturity / 成熟度 | Why / 原因 |
| --- | --- | --- |
| Lock Screen / 锁屏 | Stable | Default entry, lock guard, notification tap-through are all in place. / 默认入口、锁定守卫、通知点击跳转都已成形。 |
| Home / 桌面 | Stable | Protected app entries, multi-page shell, edit gating are working. / 受保护应用入口、多屏壳层、编辑门控已工作。 |
| Chat / 聊天 | Stable but oversized | Main gameplay path is usable and deep, but view size is a risk. / 主玩法链路完整可用，但视图体量已成风险。 |
| Gallery / 相册素材中台 | Stable | Cross-module asset hub responsibilities are already real. / 全局素材中台职责已真实存在。 |
| WorldBook / 世界书 | Stable for current scope | Split worldview/knowledge-point model is online and already consumed by multiple modules. / 世界观与知识点拆分已上线，并被多个模块消费。 |
| Map / 地图 | Stable baseline + active expansion | Simulation-first progression is online and already connected to Calendar. / 模拟优先进度已上线，并已和 Calendar 接通。 |
| Calendar / 日历 | Stable MVP | Reminder -> event -> scheduled push loop is already meaningful. / 提醒 -> 事件 -> 定时推送链路已形成。 |
| Persistence / 存储 | Stable infrastructure | Backup, restore, diagnostics, and layered persistence are all active. / 备份、恢复、诊断与分层持久化都已可用。 |
| Push Server / 推送服务 | Stable delivery infrastructure | Real delivery and scheduled delivery are both online. / 即时与定时送达能力都已上线。 |

### 3.2 Tier B: Usable but Structurally Heavy / B 档：可用，但结构偏重

These modules are useful today, but continued feature growth without decomposition will become expensive.

这些模块今天已经可用，但如果不先拆分，继续长功能会越来越贵。

| Module / 模块 | Maturity / 成熟度 | Main Risk / 主要风险 |
| --- | --- | --- |
| Settings / 设置 | Usable but dense | Too many subdomains live in one page. / 太多子领域堆在同一页。 |
| Chat Directory / 会话通讯录 | Strong internal tool | Role/service/template concepts are cognitively dense. / 角色/服务号/模板概念叠加，理解成本高。 |
| Contacts / 主通讯录 | Usable admin-like flow | More like configuration than character-creation UX. / 更像配置后台，不像角色创建流程。 |
| Map / 地图 | Feature-rich but concentrated | View/store now carry too many concerns together. / 视图与 store 同时承担过多子职责。 |
| Gallery / 相册素材中台 | Stable but multi-identity | Must balance “Photos app” feel and asset management. / 既要像相册，又要像素材管理台。 |

### 3.3 Tier C: MVP Present, Role Still Unclear / C 档：已有 MVP，但产品角色仍需收束

These modules exist and can be used, but their long-term product identity is still open.

这些模块已经存在并可使用，但长期产品定位仍未完全收束。

| Module / 模块 | Maturity / 成熟度 | Open Question / 未决问题 |
| --- | --- | --- |
| Network / 网络 | Strong MVP | Should provider setup become more guided for non-technical users? / 是否要把供应商配置进一步产品化引导？ |
| Appearance / 外观 | Strong MVP | Are uploaded custom app icons in scope, or are presets the official path? / 自定义上传图标要不要做，还是预设图标就是官方模型？ |
| Profile / 用户信息 | Basic MVP | How visible should profile-to-AI-context impact be? / 用户资料对 AI 上下文的影响要不要更显式？ |
| Files / 文件 | Persisted file-index MVP / 持久化文件索引 MVP | Is it a notebook, metadata browser, or future file manager? / 它到底是笔记本、元数据浏览器，还是未来文件管理器？ |
| More / 更多 | MVP shell | Should it stay a shortcut bucket or become a Labs surface? / 它该继续做快捷入口，还是明确为 Labs？ |

### 3.4 Tier D: Placeholder / D 档：明确占位

These modules should not compete with the main immersion loop yet.

这些模块暂时不应和主沉浸循环争优先级。

| Module / 模块 | Maturity / 成熟度 | Best Future Starting Point / 最合理起点 |
| --- | --- | --- |
| Phone / 电话 | Placeholder | Role calls, missed-call events, or AI call summaries. / 角色通话、未接来电事件或 AI 通话摘要。 |
| Wallet / 钱包 | Placeholder | Reuse Chat transfer blocks as the first ledger source. / 先复用 Chat 转账 block 做账本起点。 |
| Stock / 股票 | Placeholder | Simulated market tied to world/calendar events. / 与世界观或日历事件绑定的模拟行情。 |

---

## 4. Engineering Risk Map / 工程风险地图

### 4.1 Largest Views / 最大视图文件

These files are the clearest “edit risk hot spots”.

这些文件是最明显的“修改风险热点”。

| File / 文件 | Approx. Lines / 行数 | Interpretation / 解读 |
| --- | --- | --- |
| `src/views/ChatView.vue` | 4968 | Highest-priority decomposition candidate. / 最高优先级拆分对象。 |
| `src/views/SettingsView.vue` | 2302 | High-density configuration surface. / 高密度配置页面。 |
| `src/views/MapView.vue` | 1802 | Multiple feature layers are concentrated here. / 多层功能叠在同一视图。 |
| `src/views/ChatDirectoryView.vue` | 1659 | Role/service/template management is concentrated. / 角色/服务号/模板管理集中。 |
| `src/views/GalleryView.vue` | 1259 | Still manageable, but future shared picker work should reduce pressure. / 仍可控，但后续共享选择器应减压。 |
| `src/views/ContactsView.vue` | 1118 | Dense form-heavy page. / 偏表单型、信息密集。 |
| `src/views/WorldBookView.vue` | 850 | Still understandable, but should not keep growing blindly. / 还可控，但不适合继续无节制堆功能。 |
| `src/views/CalendarView.vue` | 675 | Comparatively healthy. / 相对健康。 |

### 4.2 Largest Stores / 最大状态文件

Store size alone is not the current problem, because many of these files already have test coverage.

状态文件大并不是当前首要问题，因为其中不少已经有较强测试护城河。

| File / 文件 | Approx. Lines / 行数 | Interpretation / 解读 |
| --- | --- | --- |
| `src/stores/system.js` | 2735 | Central infrastructure store; change carefully. / 核心基础设施 store，改动要谨慎。 |
| `src/stores/chat.js` | 2226 | Rich domain logic, but relatively well-defended by tests. / 领域逻辑很重，但测试相对完整。 |
| `src/stores/map.js` | 2047 | Map logic is broad; prefer UI extraction before store redesign. / 地图逻辑范围广，优先拆 UI 而不是改 store 结构。 |
| `src/stores/gallery.js` | 1461 | Important asset rules live here; avoid casual refactors. / 关键素材规则在这里，不宜随意大改。 |
| `src/stores/calendar.js` | 672 | Compact and still manageable. / 较小且可控。 |

### 4.3 Practical Rule / 实操建议

Prefer this order when improving maintainability:

提升可维护性时，优先遵循这个顺序：

1. Extract display components from large views first.  
   先从大视图里抽展示组件。
2. Extract interaction panels and modal state next.  
   再抽交互面板与弹层状态。
3. Touch store/domain contracts only when product behavior truly changes.  
   只有在产品行为真的变化时，才改 store 和领域契约。

---

## 5. Test Coverage Signals / 测试覆盖信号

The current repo already has meaningful coverage around the core domain stores and the most important cross-module loops.

当前仓库在核心领域 store 和关键跨模块链路上，已经有比较实质的测试覆盖。

### 5.1 Strongly Defended Areas / 护城河较强的区域

- `system` store:
  - `tests/system-automation.test.js`
  - `tests/system-world-kernel.test.js`
  - `tests/system-widget-import.test.js`
  - `tests/system-backup-reminder.test.js`
  - `tests/system-backup-copy-tone.test.js`
  - `tests/system-truth.test.js`
- `chat` store and chat behavior:
  - `tests/chat-store-model.test.js`
  - `tests/chat-role-knowledge-binding.test.js`
  - `tests/chat-view-semantic-revision.test.js`
  - `tests/chat-worldbook-binding-visibility.test.js`
- `map` store and baseline flow:
  - `tests/map-trip-baseline.test.js`
  - `tests/map-worldbook-context.test.js`
- `calendar` store and cross-module flow:
  - `tests/calendar-event-store.test.js`
  - `tests/calendar-worldbook-context.test.js`
- `gallery` asset logic:
  - `tests/gallery-store.test.js`
- `worldbook` filtering UX:
  - `tests/worldbook-view-filters.test.js`

### 5.2 Engineering Meaning / 工程含义

These signals suggest:

这些信号意味着：

1. Store refactors are not impossible, but are more expensive to validate.  
   Store 重构不是不能做，但验证成本更高。
2. View extraction is currently the lowest-risk maintainability investment.  
   视图拆分是当前风险最低的可维护性投资。
3. Calendar/Map/WorldBook cross-module behavior now has enough tests that major behavior changes should be deliberate and documented.  
   Calendar / Map / WorldBook 的跨模块行为已有一定测试，后续大改必须更明确地记录和验证。

---

## 6. Module-by-Module Engineering Notes / 按模块的工程接手备注

### 6.1 Lock Screen / 锁屏

- Product state: stable.
- Engineering note: future modules must reuse the existing notification metadata path instead of inventing their own foreground/lock behavior.
- Recommendation: no proactive refactor needed.

### 6.2 Home / 桌面

- Product state: stable shell.
- Engineering note: layout editing is intentionally gated and should not be casually promoted into a user-facing feature without product confirmation.
- Recommendation: treat as shell infrastructure, not a place for rapid experimentation.

### 6.3 Settings / 设置

- Product state: strong configuration center.
- Engineering note: high-value but high-density surface.
- Recommendation: continue low-risk section extraction; do not redesign backup/push logic while splitting.

### 6.4 Network / 网络

- Product state: technically usable.
- Engineering note: provider setup is functional but still technical in tone.
- Recommendation: next product polish should be examples, guided states, and connection testing rather than deeper transport changes.

### 6.5 Chat / 聊天

- Product state: strongest gameplay module.
- Engineering note: most important maintainability hotspot.
- Recommendation: split thread menu, action sheet, rich-send panel, and AI status sections before adding more thread-side features.

### 6.6 Chat Directory / 会话通讯录

- Product state: real management tool.
- Engineering note: concept density is the bigger problem than raw capability.
- Recommendation: improve plain-language guidance before adding more management actions.

### 6.7 Contacts / 主通讯录

- Product state: useful archive/configuration module.
- Engineering note: dense combined form for role profile, asset slots, and knowledge binding.
- Recommendation: if revisited, improve first-time role creation flow instead of expanding raw fields.

### 6.8 Gallery / 相册素材中台

- Product state: true platform-level asset hub.
- Engineering note: avoid letting Gallery become a second admin console.
- Recommendation: keep Gallery photo-first, and extract shared pickers/status pieces outward where possible.

### 6.9 Appearance / 外观

- Product state: strong MVP.
- Engineering note: do not let widget/editor concerns blur with appearance basics.
- Recommendation: clarify whether app-icon uploads are intentionally out of scope.

### 6.10 WorldBook / 世界书

- Product state: now a real cross-module world kernel, not just a Chat helper.
- Engineering note: feature growth is no longer the main need; comprehensibility is.
- Recommendation: pause feature growth and protect readability.

### 6.11 Map / 地图

- Product state: active P1 expansion core.
- Engineering note: product depth is rising quickly, so ownership boundaries matter.
- Recommendation: keep Map as a cue/progression source; keep reminder scheduling and delivery semantics owned by Calendar + Push.

### 6.12 Calendar / 日历

- Product state: meaningful MVP with live workflow.
- Engineering note: already has real business responsibility and should not be mistaken for a placeholder anymore.
- Recommendation: next step is either richer event management or server delivery receipts, not redoing baseline cue consumption.

### 6.13 Files / 文件

- Product state: persisted metadata-only file-index MVP.
- Engineering note: quick notes, favorites, deletes, and local file metadata import now live in `src/stores/files.js`; original file content is not copied or stored.
- Recommendation: define product purpose before large engineering investment or connecting Files to Gallery assets, role/world documents, or binary storage.

### 6.14 More / 更多

- Product state: shell MVP / shortcut bucket.
- Engineering note: local-only toggles can confuse future maintainers if treated like real settings.
- Recommendation: either wire to real flags or explicitly position as Labs/Shortcuts.

### 6.15 Phone / 电话

- Product state: placeholder.
- Engineering note: do not build generic call UI without deciding its narrative role.
- Recommendation: only start once role-call or event-call direction is chosen.

### 6.16 Wallet / 钱包

- Product state: placeholder.
- Engineering note: cheapest entry is to consume existing transfer blocks.
- Recommendation: fake ledger before economy simulation.

### 6.17 Stock / 股票

- Product state: placeholder.
- Engineering note: real-market integration would fight the project’s simulation-first nature.
- Recommendation: treat as narrative simulation if activated.

---

## 7. Recommended Next Engineering Order / 推荐的下一工程顺序

### 7.1 Best Immediate Work / 最推荐的近期工作

1. Return to low-risk component extraction.
   回到低风险组件拆分。
2. Start with Chat thread menu / WorldBook summary surfaces.
   优先从 Chat 线程菜单 / WorldBook 摘要区开始。
3. Continue Settings display decomposition if Chat scope is too risky in the current branch.
   如果当前分支不适合碰 Chat，就继续拆 Settings 展示层。
4. Only then consider Map view extraction.
   之后再考虑 Map 视图拆分。

### 7.2 Work to Avoid Right Now / 当前不建议优先做的事

1. Do not start major Chat store redesign.
   不建议现在启动 Chat store 大改。
2. Do not expand Phone/Wallet/Stock before the main immersion loops are more settled.
   不建议在主沉浸循环更稳之前扩 Phone / Wallet / Stock。
3. Do not keep adding WorldBook features without first protecting page readability.
   不建议在没有先保护可理解性的前提下继续堆 WorldBook 功能。
4. Do not move reminder ownership back from Calendar to Map.
   不建议把提醒调度职责从 Calendar 拉回 Map。

---

## 8. Component Extraction Candidate List / 组件拆分候选清单

This section turns the maturity map into concrete decomposition candidates for future implementation.

这一节把成熟度地图进一步落成“可以执行的拆分候选清单”，方便后续直接开工。

### 8.1 ChatView.vue Candidates / ChatView.vue 拆分候选

Current size / 当前体量: about 4968 lines.  
Engineering meaning / 工程含义: highest-priority large-view hotspot.

#### Candidate A: Thread Menu Panel / 会话线程菜单面板

- Source signals:
  - `showThreadMenu`
  - thread settings
  - service template summary
  - current WorldBook context
  - thread-level AI preferences
- Approximate template area:
  - around the thread menu block near `v-if="showThreadMenu"`
- Why first:
  - mostly display + form controls
  - already visually distinct
  - limited interaction boundary
- Suggested component name:
  - `src/components/chat/ChatThreadMenuPanel.vue`
- Props to pass first:
  - active chat identity data
  - active AI prefs
  - service summary state
  - WorldBook context summary
  - save-state flags and callbacks
- Avoid changing:
  - prompt assembly order
  - conversation persistence shape
  - role-binding contract logic
- Acceptance:
  - same thread menu behavior
  - same save feedback
  - same WorldBook jump behavior

#### Candidate B: User Rich-Send Action Panel / 用户富消息发送面板

- Source signals:
  - `showUserActionPanel`
  - gallery picker
  - link/transfer/voice-card inline forms
  - user action grid hints
- Why second:
  - already internally segmented
  - strong UI boundary
  - can reduce main-thread clutter without touching AI call core
- Suggested component names:
  - `src/components/chat/ChatUserActionPanel.vue`
  - optional subcomponents later:
    - `ChatGalleryPicker.vue`
    - `ChatInlineActionForms.vue`
- Avoid changing:
  - media import policy
  - gallery asset selection logic
  - send payload normalization
- Acceptance:
  - same panel open/close behavior
  - same inline validation
  - same one-off import / send path

#### Candidate C: Message Edit Modal / 消息编辑弹层

- Source signals:
  - `showEditMessageModal`
  - `editingMessage*`
  - `messageEditState`
- Why third:
  - highly isolated state
  - behavior already has targeted regression coverage
- Suggested component name:
  - `src/components/chat/ChatMessageEditModal.vue`
- Avoid changing:
  - semantic revision policy
  - revision restore flow
  - message-edit validation helper contract
- Acceptance:
  - same edit/save/cancel behavior
  - existing semantic-revision tests remain green

#### Candidate D: AI Status and Suggestion Strip / AI 状态与建议条

- Source signals:
  - `showSuggestions`
  - `suggestions`
  - `headerSecondaryStatusText`
  - automation hint texts
- Why later:
  - lower risk, but less payoff than thread menu and action panel
- Suggested component name:
  - `src/components/chat/ChatAiStatusStrip.vue`

### 8.2 SettingsView.vue Candidates / SettingsView.vue 拆分候选

Current size / 当前体量: about 2302 lines.  
Engineering meaning / 工程含义: dense multi-domain configuration page.

#### Candidate A: Backup and Restore Section / 备份与恢复区块

- Source signals:
  - backup export/import state
  - export mode hints
  - import rollback feedback
- Why first:
  - visually independent
  - product language-heavy
  - can improve readability without touching routing
- Suggested component name:
  - `src/components/settings/SettingsBackupSection.vue`
- Avoid changing:
  - backup schema logic
  - asset package export behavior
  - rollback semantics
- Acceptance:
  - same export/import actions
  - same feedback messages
  - same file-input trigger behavior

#### Candidate B: Push and Notification Section / 推送与通知区块

- Source signals:
  - push subscription/unsubscription
  - health check
  - external push display mode
  - test push
- Suggested component name:
  - `src/components/settings/SettingsPushSection.vue`
- Status:
  - `DONE` on 2026-05-02; component extracted and push orchestration / diagnostics ownership kept in `SettingsView.vue`.
  - 2026-05-02 已落地；组件已抽出，推送编排与诊断职责仍留在 `SettingsView.vue`。
- Why second:
  - strongly grouped by one domain
  - currently one of the densest parts of the page
- Avoid changing:
  - actual push orchestration
  - diagnostics report writing
  - browser capability detection

#### Candidate C: Storage Diagnostics Section / 存储诊断区块

- Source signals:
  - storage audit / repair
  - latest storage report
  - clear report actions
- Suggested component name:
  - `src/components/settings/SettingsStorageDiagnosticsSection.vue`
- Why third:
  - mostly self-contained
  - good low-risk extraction target
- Avoid changing:
  - persistence inspect/reconcile API contracts
  - report normalization

#### Candidate D: AI Automation Section / AI 自动响应区块

- Source signals:
  - automation toggles
  - quiet hours
  - policy summaries
  - save state
- Suggested component name:
  - `src/components/settings/SettingsAutomationSection.vue`
- Status:
  - `DONE` on 2026-05-02; component extracted and enable confirmation / normalization / runtime policy ownership kept in `SettingsView.vue`.
  - 2026-05-02 已落地；组件已抽出，开启确认、归一化与运行策略职责仍留在 `SettingsView.vue`。
- Why later:
  - domain is self-contained, but state interactions are broader than backup/storage
- Avoid changing:
  - automation runtime policy semantics
  - per-module policy ownership

### 8.3 MapView.vue Candidates / MapView.vue 拆分候选

Current size / 当前体量: about 1802 lines.  
Engineering meaning / 工程含义: rich product layer with concentrated display concerns.

#### Candidate A: Map Visual Settings Panel / 地图视觉设置面板

- Source signals:
  - `map-visual-panel`
  - visual mode switch
  - gallery background binding
  - AI visual refresh
  - provider visual status
- Suggested component name:
  - `src/components/map/MapVisualSettingsPanel.vue`
- Status:
  - `DONE` on 2026-05-02; component extracted and store writes/provider logic kept in `MapView.vue`.
  - 2026-05-02 已落地；组件已抽出，store 写入与供应商逻辑仍留在 `MapView.vue`。
- Why first:
  - strongest visual boundary
  - least entangled with trip progression
- Avoid changing:
  - provider call path
  - one-off upload policy
  - gallery fallback semantics

#### Candidate B: Area Feedback Panel / 区域反馈面板

- Source signals:
  - area feedback list
  - WorldBook relevance chips
  - direct WorldBook jumps
- Suggested component name:
  - `src/components/map/MapAreaFeedbackPanel.vue`
- Status:
  - `DONE` on 2026-05-02; component extracted and feedback derivation / WorldBook route query ownership kept in `MapView.vue`.
  - 2026-05-02 已落地；组件已抽出，反馈派生与 WorldBook 路由 query 职责仍留在 `MapView.vue`。
- Why second:
  - read-only derived data
  - limited mutation behavior
- Avoid changing:
  - feedback derivation rules
  - WorldBook route query building

#### Candidate C: Trip Control and Status Panel / 行程控制与状态面板

- Source signals:
  - trip start/cancel
  - background arrival push status
  - trip progress display
- Suggested component name:
  - `src/components/map/MapTripControlPanel.vue`
- Status:
  - `DONE` on 2026-05-02; component extracted and trip lifecycle / push arming ownership kept in `MapView.vue`.
  - 2026-05-02 已落地；组件已抽出，行程生命周期与推送布置职责仍留在 `MapView.vue`。
- Why third:
  - central interaction block, but still visually separable
- Avoid changing:
  - trip lifecycle logic
  - arrival scheduling ownership
  - push arming semantics

#### Candidate D: Route Familiarity Panel / 路线熟悉度面板

- Source signals:
  - route familiarity list
  - tier labels
  - related WorldBook chips
- Suggested component name:
  - `src/components/map/MapRouteFamiliarityPanel.vue`
- Status:
  - `DONE` on 2026-05-03; component extracted and route derivation / WorldBook route query ownership kept in `MapView.vue`.
  - 2026-05-03 已落地；组件已抽出，路线派生与 WorldBook 路由 query 职责仍留在 `MapView.vue`。
- Why fourth:
  - derived display-only zone
  - low business-side mutation risk

#### Candidate E: Trip History Panel / 行程记录面板

- Source signals:
  - trip history list
  - reward summaries
  - related WorldBook chips
- Suggested component name:
  - `src/components/map/MapTripHistoryPanel.vue`
- Current status:
  - `DONE` on 2026-05-03; component extracted and trip-history derivation / WorldBook route query ownership kept in `MapView.vue`.
  - 2026-05-03 已落地；组件已抽出，行程记录派生与 WorldBook 路由 query 职责仍留在 `MapView.vue`。
- Why fifth:
  - also display-heavy and derived
  - good candidate after visual and control panel split

### 8.4 Recommended Decomposition Order / 推荐拆分顺序

If future contributors want a practical low-risk order, use this:

如果后续接手者需要一个更实际的低风险顺序，建议按这个顺序拆：

1. `ChatThreadMenuPanel`
2. `SettingsBackupSection`
3. `SettingsStorageDiagnosticsSection`
4. `ChatMessageEditModal`
5. `MapVisualSettingsPanel`
6. `ChatUserActionPanel`
7. `MapAreaFeedbackPanel`
8. `SettingsPushSection`
9. `MapTripControlPanel`
10. `SettingsAutomationSection`
11. `MapRouteFamiliarityPanel`
12. `MapTripHistoryPanel`

### 8.5 Shared Extraction Rules / 共享拆分规则

For all of the candidates above:

以上候选块统一遵循这些规则：

1. Prefer “display extraction first, logic extraction second”.
   先抽展示，再抽逻辑。
2. Keep store writes in the parent view on the first extraction unless the boundary is already very clear.
   第一轮拆分时，除非边界特别清楚，否则先把 store 写操作留在父视图。
3. Do not rewrite data contracts and component extraction in the same step.
   不要在同一刀里同时改数据契约和做组件拆分。
4. Preserve existing tests before adding new features in the extracted area.
   先保住现有测试，再在拆出的区域上长新功能。
5. If extraction affects route/schema/core interaction, sync docs in the same batch.
   如果拆分影响路由/数据结构/核心交互，同批同步文档。

---

## 9. Reading Path for Future Contributors / 给后续接手者的阅读路径

If you are taking over implementation work, read in this order:

如果你要接手开发，建议按这个顺序阅读：

1. `docs/README.md`
2. `docs/pm/TODO_PM_STATUS_REPORT.md`
3. `docs/roadmap/TODO_ROADMAP.md`
4. `docs/overview/PROJECT_MASTER_GUIDE.md`
5. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
6. Module-specific files and tests you plan to touch

If you are deciding what to build next:

如果你是在判断下一步做什么：

1. Check `docs/roadmap/TODO_ROADMAP.md` for active execution order.
2. Use this file to judge engineering risk and maturity.
3. Use `docs/roadmap/PROJECT_MODULE_AUDIT.md` only for candidate discovery, not for live status.

---

## 10. Change Log / 变更记录

1. 2026-05-02 EN: Created as a dedicated handoff reference that bridges PM status, roadmap, module audit, file-size hotspots, and test-coverage signals for future developers and AI assistants.
   2026-05-02 中文：新增为面向后续开发同事与 AI 助手的接手参考文档，打通 PM 状态、路线图、模块审计、文件体量热点与测试覆盖信号。
2. 2026-05-02 EN: Added a concrete component extraction candidate list for `ChatView.vue`, `SettingsView.vue`, and `MapView.vue`, including suggested boundaries, sequencing, and guardrails.
   2026-05-02 中文：补充 `ChatView.vue`、`SettingsView.vue`、`MapView.vue` 的具体组件拆分候选清单，包含推荐边界、拆分顺序与守则。
3. 2026-05-03 EN: Marked `MapTripHistoryPanel.vue` as landed after extracting the trip-history display panel from `MapView.vue`.
   2026-05-03 中文：在从 `MapView.vue` 抽出行程记录展示面板后，将 `MapTripHistoryPanel.vue` 标记为已落地。
