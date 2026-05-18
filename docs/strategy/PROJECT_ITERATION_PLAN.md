# SchatPhone Project Iteration Plan / 项目级迭代计划

Updated / 更新时间: 2026-05-18

Audience / 读者: product, design, engineering, QA, and future AI assistants.

## 1. Purpose / 文档用途

This document is the project-level iteration plan for SchatPhone. It describes the overall direction, sequencing, and acceptance gates for the whole product.

本文是 SchatPhone 的项目级迭代计划。它用于描述整个项目的大方向、阶段顺序和阶段验收门槛。

It is intentionally different from these documents:

- `docs/roadmap/TODO_ROADMAP.md`: live execution board for concrete implementation tasks.
- `docs/overview/IMMERSIVE_EVENT_TODO.md`: event-specialist TODO and event runtime handoff.
- `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md`: parked visual rebuild TODO.
- `docs/roadmap/PROJECT_MODULE_AUDIT.md`: module maturity audit and candidate task pool.
- `docs/product-decisions/*.md`: topic-level product decisions.

本文刻意区别于以下文档：

- `docs/roadmap/TODO_ROADMAP.md`：具体开发任务的动态执行看板。
- `docs/overview/IMMERSIVE_EVENT_TODO.md`：事件专项 TODO 与事件运行时接手顺序。
- `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md`：已搁置的视觉重建 TODO。
- `docs/roadmap/PROJECT_MODULE_AUDIT.md`：模块成熟度审计与候选任务池。
- `docs/product-decisions/*.md`：专题级产品决策。

## 2. Operating Rule / 使用规则

This file should answer: "What kind of work should the project prioritize next, and why?"

本文回答：“整个项目接下来应该优先做哪一类事情，为什么？”

It should not list every implementation task. When a direction becomes active work, summarize the concrete implementation item in `docs/roadmap/TODO_ROADMAP.md` with acceptance criteria and regression checks.

本文不应列出每一个实现任务。某个方向进入实际开发时，应把具体实现项摘要进入 `docs/roadmap/TODO_ROADMAP.md`，并补充验收标准与回归检查。

Status meanings:

- `NOW`: current project-level focus.
- `NEXT`: should start after the current focus reaches its exit criteria.
- `LATER`: known direction, not yet ready for active scheduling.
- `PARKED`: intentionally deferred until an explicit decision reactivates it.
- `DECISION`: needs product or technical decision before implementation.
- `DONE`: reached the current exit criteria.

状态含义：

- `NOW`：当前项目级重点。
- `NEXT`：当前重点达到退出条件后应启动。
- `LATER`：已知方向，但暂不进入主动排期。
- `PARKED`：明确搁置，除非重新决策。
- `DECISION`：先要产品或技术决策，再进入实现。
- `DONE`：已达到当前退出条件。

## 3. Current Project Thesis / 当前项目主线判断

SchatPhone is no longer just a chat shell. The project has become a local-first virtual phone with app-like modules, shared media/storage, AI role/world context, relationship continuity, push delivery, and optional game-like runtime.

SchatPhone 已经不只是聊天壳。当前项目更像一个本地优先的虚拟手机：包含类 App 模块、共享素材/存储、AI 角色与世界观上下文、关系连续性、推送送达，以及可选的游戏化运行时。

The next project risk is not missing isolated features. The main risk is that new immersive features may keep piling into large views and central stores, making ownership harder to understand.

下一个项目风险不是缺少单点功能，而是沉浸式功能继续堆进大视图和中心 store，导致职责归属越来越难理解。

Therefore the next project-level direction is:

1. Close product ownership splits before expanding new loops.
2. Keep runtime systems safe, explainable, and opt-in.
3. Convert explicit user actions into cross-module memory before enabling hidden automation.
4. Improve architecture depth and test coverage around existing hot spots.
5. Re-enter visual rebuild only after functional ownership is stable.

因此，项目级方向是：

1. 先收口产品职责拆分，再扩张新联动。
2. 让运行时系统保持安全、可解释、可显式开启。
3. 先把用户显式行为转成跨模块记忆，再开放隐藏自动化。
4. 围绕现有热点提升架构深度和测试覆盖。
5. 等功能归属稳定后，再恢复完整视觉重建。

## 4. Iteration Map / 阶段地图

| Phase / 阶段 | Status / 状态 | Project Goal / 项目目标 | Exit Criteria / 退出条件 |
| --- | --- | --- | --- |
| I0 Governance Reset / 治理复位 | DONE | Make the docs, CI, and dependency posture trustworthy. / 让文档、CI 与依赖状态可信。 | README/current docs are aligned; CI runs tests; safe dependency update policy is recorded. / README 与当前文档对齐；CI 跑测试；依赖升级策略明确。 |
| I1 Ownership Closure / 职责收口 | NOW | Finish product ownership splits that block later growth. / 收口阻塞后续增长的产品职责拆分。 | Calendar/Reminders ownership is separated; Reminders is visible on Home; Files remains internal; World Hub remains optional. / Calendar/Reminders 归属拆开；Reminders 在 Home 可见；Files 保持内部；World Hub 保持可选。 |
| I2 Architecture Deepening / 架构加深 | NEXT | Reduce large-view/store risk before adding more behavior. / 在继续加行为前降低大视图和 store 风险。 | Hot spots have smaller interfaces, focused tests, and clearer ownership notes. / 热点具备更小接口、聚焦测试与清晰职责说明。 |
| I3 Cross-Module Memory Loops / 跨模块记忆闭环 | NEXT | Turn explicit user actions into stable relationship/world memories. / 将用户显式行为转成稳定关系与世界记忆。 | Text/event-first memories dedupe and merge cleanly; Calendar and selected existing modules submit safe facts through shared adapters; media-driven memory inputs stay optional until they become low-friction. / 以文字与事件为主的记忆先做好去重与归并；Calendar 与部分既有模块通过共享适配器提交安全事实；媒体驱动记忆入口在足够低摩擦前保持可选。 |
| I4 Runtime Expansion / 运行时扩展 | LATER | Expand events, tasks, and World Hub controls without making normal use feel technical. / 扩展事件、任务与 World Hub 控制，同时不让普通使用技术化。 | Event explanations are user-facing; World Hub has filtered review and narrow controls; high-impact automation remains guarded. / 事件解释面向用户；World Hub 有筛选审阅和窄控制；高影响自动化仍受控。 |
| I5 Background Autonomy Decision / 后台自治决策 | DECISION | Decide whether true closed-page event generation is worth backend complexity. / 决定是否为真正离页事件生成承担后端复杂度。 | Product decision exists: delivery-only push vs server-side orchestration. / 形成产品决策：只做推送送达，还是进入服务端编排。 |
| I6 Visual Rebuild Return / 视觉重建恢复 | PARKED | Rebuild toward believable phone immersion after functional ownership stabilizes. / 在功能归属稳定后重建真实手机沉浸感。 | Visual rebuild is promoted from deferred docs into the live roadmap with a focused scope. / 视觉重建从暂存文档晋级到执行看板，并限定范围。 |

## 5. Project-Level TODO / 项目级大方向 TODO

### I0. Governance Reset / 治理复位

Status / 状态: `NOW`

Goal / 目标:

Make future work start from current truth instead of stale summaries.

让后续工作从当前事实出发，而不是从过期摘要出发。

Project-level TODO:

1. Refresh `README.md` so it reflects the current module state, route list, Files role, Calendar/Reminders split, and current gaps.
2. Update `docs/roadmap/TODO_ROADMAP.md` header/date and add a short note that it remains the only concrete execution board.
3. Add `npm test` to CI after lint and before or after build.
4. Record dependency update policy:
   - patch/minor updates can be batched after `lint + test + build`;
   - major updates need separate migration branches;
   - `vite`, `vitest`, `eslint`, `jsdom`, and `marked` major jumps should not be mixed with feature work.
5. Remove clearly unused scaffold assets only after verifying no references:
   - `public/vite.svg`
   - `src/assets/vue.svg`

项目级 TODO:

1. 刷新 `README.md`，同步当前模块状态、路由列表、Files 角色、Calendar/Reminders 拆分和当前缺口。
2. 更新 `docs/roadmap/TODO_ROADMAP.md` 的头部日期，并说明它仍是唯一具体执行看板。
3. 在 CI 中加入 `npm test`。
4. 记录依赖升级策略：
   - patch/minor 可在 `lint + test + build` 通过后批量升级；
   - major 升级单独开迁移分支；
   - `vite`、`vitest`、`eslint`、`jsdom`、`marked` 的大版本升级不与功能开发混在一起。
5. 确认无引用后清理脚手架残留：
   - `public/vite.svg`
   - `src/assets/vue.svg`

Exit criteria / 退出条件:

- `README.md`, `docs/README.md`, PM status, and live roadmap no longer contradict each other on current project state.
- CI can catch test regressions, not only lint/build regressions.
- Known harmless leftovers are either removed or explicitly documented as compatibility assets.

退出条件：

- `README.md`、`docs/README.md`、PM 状态、执行看板在当前项目状态上不互相冲突。
- CI 能捕获测试回归，而不仅是 lint/build 回归。
- 已知无害遗留要么清理，要么明确记录为兼容资产。

### I1. Ownership Closure / 职责收口

Status / 状态: `NOW`

Goal / 目标:

Close the ownership splits that currently block future event, relationship, and UX work.

收口当前会阻塞事件、关系和体验继续推进的职责拆分。

Project-level TODO:

1. Finish Calendar / Reminders split:
   - Reminders owns raw cues, follow-ups, callbacks, logistics reminders, stock review cues, and world/task objectives.
   - Calendar owns confirmed schedule/date events and push scheduling for real events.
   - Calendar relationship facts now start only from confirmed schedule/date events, after explicit contact selection.
2. Keep Files internal:
   - `/files` can remain a compatibility/developer route;
   - Home, More, onboarding, and icon customization should not promote Files as a normal app.
3. Keep World Hub optional:
   - normal modules remain immersive and distributed;
   - World Hub reviews runtime state and pending effects;
   - freeform value/funds/unlock editing stays out until explicitly designed.
4. Preserve module ownership in cross-module handoffs:
   - Shopping and Food Delivery own orders;
   - Wallet owns ledger records;
   - Map explains route/location context;
   - relationship runtime owns relationship facts only.

项目级 TODO:

1. 完成 Calendar / Reminders 拆分：
   - Reminders 拥有原始线索、跟进、回拨、物流提醒、股票复盘线索和世界/任务目标；
   - Calendar 拥有已确认的日程/日期事件，以及真实事件的推送排程；
   - Calendar 不再持有原始线索队列前，不扩展 Calendar 关系事实。
2. 保持 Files 内部化：
   - `/files` 可继续作为兼容/开发者路由；
   - Home、More、引导页和图标自定义不应把 Files 当普通应用推广。
3. 保持 World Hub 可选：
   - 普通模块继续保持沉浸式分布录入；
   - World Hub 审阅运行时状态和待确认效果；
   - 自由数值、资金、解锁编辑等到明确设计后再开放。
4. 维护跨模块交接中的模块所有权：
   - Shopping / Food Delivery 拥有订单；
   - Wallet 拥有账本；
   - Map 解释路线/位置上下文；
   - relationship runtime 只拥有关系事实。

Exit criteria / 退出条件:

- Future developers can answer "which module owns this data" without reading multiple large views.
- Calendar and Reminders can evolve independently.
- Relationship facts can be added without making Calendar or World Hub absorb unrelated data entry.

退出条件：

- 后续开发者无需读多个大视图，也能判断“这份数据由哪个模块拥有”。
- Calendar 与 Reminders 可以独立演进。
- 添加关系事实时，不会让 Calendar 或 World Hub 吸收无关数据录入职责。

### I2. Architecture Deepening / 架构加深

Status / 状态: `NEXT`

Goal / 目标:

Improve locality and leverage around the largest modules before adding more product surface.

在继续扩产品面之前，提升大型模块的本地性和接口杠杆。

Project-level TODO:

1. Continue decomposing large views by behavior surface, not by visual decoration:
   - Chat: message list/action orchestration, AI status, thread preferences, service/product context, scheduled push hints.
   - Settings: remaining backup/push/automation orchestration should move behind smaller interfaces where safe.
   - Map: route context, rewards, event explanations, trip lifecycle, and visual settings should stay separate.
   - Chat Directory: role/service/template management should become easier to understand and test.
2. Split central runtime responsibilities only when there is a real second adapter:
   - keep shallow pass-through helpers out;
   - extract only when the interface hides real complexity.
3. Create focused test seams for:
   - Calendar/Reminders cue ownership;
   - relationship fact adapters;
   - event runtime explanations;
   - notification and push scheduling;
   - Home entry normalization.
4. Keep store migration backward-compatible:
   - legacy `worldBook` alias remains compatibility only;
   - old Home entries such as `app_files` remain normalized away;
   - persisted data changes need restore/import tests.

项目级 TODO:

1. 继续按行为面拆大视图，而不是按视觉装饰拆：
   - Chat：消息列表/动作编排、AI 状态、会话偏好、服务/商品上下文、定时推送提示；
   - Settings：剩余备份/推送/自动化编排在安全时继续收进更小接口；
   - Map：路线上下文、奖励、事件解释、行程生命周期、视觉设置保持区隔；
   - Chat Directory：角色/服务号/模板管理要更容易理解和测试。
2. 只有出现真实第二个适配器时才拆中心运行时职责：
   - 避免浅层转发 helper；
   - 只抽取能隐藏真实复杂度的接口。
3. 为以下方向建立聚焦测试面：
   - Calendar/Reminders 线索归属；
   - 关系事实适配器；
   - 事件运行时解释；
   - 通知与推送排程；
   - Home 入口归一化。
4. 保持 store 迁移向后兼容：
   - legacy `worldBook` 只作为兼容别名；
   - `app_files` 等旧 Home 入口继续被归一化移除；
   - 持久化数据变化必须补恢复/导入测试。

Exit criteria / 退出条件:

- Hot files stop growing as the default place for new features.
- New features can be tested through stable interfaces instead of mounting whole pages.
- The project can accept small product loops without raising regression cost sharply.

退出条件：

- 热点文件不再成为所有新功能的默认堆放点。
- 新功能可以通过稳定接口测试，而不是总要挂载整页。
- 项目能继续接小型产品闭环，而不会显著抬高回归成本。

### I3. Cross-Module Memory Loops / 跨模块记忆闭环

Status / 状态: `NEXT`

Goal / 目标:

Make the virtual phone feel continuous by turning explicit user actions into safe shared memories.

通过把用户显式行为转成安全共享记忆，让虚拟手机生活更连续。

Project-level TODO:

1. Tighten memory dedupe and merge rules for text/event-first relationship facts:
   - one life event should not become multiple top-level memories;
   - source-level attachments can exist without multiplying relationship growth;
   - recall should prefer one primary memory plus optional supporting anchors.
2. Add Calendar relationship facts only after I1 Calendar/Reminders ownership closure:
   - scheduled dates;
   - anniversaries;
   - missed plans;
   - recurring reminders.
   - current baseline: confirmed events can record low-impact scheduled-event facts after the user selects a Chat contact.
3. Keep Gallery/media-driven relationship facts deferred until image sources become naturally produced and low-friction:
   - user-supplied images alone should not create mandatory memory-structuring work;
   - Gallery remains an asset/atmosphere surface before becoming a core memory-entry surface.
4. Continue safe adapters before hidden mutation:
   - low-impact, explicit, deduped facts first;
   - high-impact romance/conflict effects remain pending-confirmation or deferred.
5. Improve user-facing memory review:
   - Contacts can show compact relationship snapshots;
   - Chat can consume compact relationship context;
   - World Hub can review pending effects without becoming the normal data-entry surface.
6. Keep Chat free:
   - relationship facts provide context;
   - they should not hard-lock conversation behavior.

项目级 TODO:

1. 先收紧以文字与事件为主的关系记忆去重与归并规则：
   - 同一段生活事件不应变成多条并列顶层记忆；
   - 不同来源的附件材料可以存在，但不应重复累加关系成长；
   - 召回应优先围绕一条主记忆，再按需补充锚点材料。
2. I1 完成 Calendar/Reminders 归属收口后，再增加 Calendar 关系事实：
   - 约会/日程；
   - 纪念日；
   - 错过的计划；
   - 周期提醒。
   - 当前基线：已确认事件在用户显式选择 Chat 联系人后，可记录低影响日程事实。
3. Gallery/媒体驱动关系事实继续后置，直到图片来源足够自然且录入足够低摩擦：
   - 在主要还是用户手动提供图片的阶段，不应强迫用户额外做记忆结构化录入；
   - Gallery 现阶段优先承担资产与氛围，不承担核心记忆录入主链路。
4. 隐藏变更前继续走安全适配器：
   - 先做低影响、显式、去重的事实；
   - 高影响恋爱/冲突效果保持待确认或继续搁置。
5. 改善用户可见的记忆审阅：
   - Contacts 展示紧凑关系快照；
   - Chat 消费紧凑关系上下文；
   - World Hub 审阅待确认效果，但不成为普通数据录入口。
6. 保持 Chat 自由：
   - 关系事实提供上下文；
   - 不应硬性锁死对话行为。

Exit criteria / 退出条件:

- Cross-module memories come from clear user actions and have source-level dedupe.
- Contacts and Chat can benefit from shared continuity without owning every source.
- Users can review sensitive changes before they affect high-impact relationship state.

退出条件：

- 跨模块记忆来自清晰用户动作，并具备来源级去重。
- Contacts 与 Chat 能受益于共享连续性，但不需要拥有所有来源数据。
- 敏感变化影响高价值关系状态前，用户可以审阅。

### I4. Runtime Expansion / 运行时扩展

Status / 状态: `LATER`

Goal / 目标:

Grow event and task systems while keeping them understandable, optional, and immersive.

扩展事件与任务系统，同时保持可理解、可选和沉浸。

Project-level TODO:

1. Add user-facing event explanations:
   - why an event triggered;
   - why a tick skipped;
   - which module owns the result;
   - what the user can safely ignore.
2. Expand event adapters only after explanation/dismissal rules exist:
   - Shopping/logistics random execution remains disabled until then.
3. Add world-aware event packs:
   - daily life;
   - campus;
   - fantasy;
   - sci-fi;
   - apocalypse.
4. Add task/unlock concepts behind World Hub:
   - review first;
   - narrow controls second;
   - broad editing later.
5. Keep foreground runtime opt-in:
   - no surprise background mutation by default;
   - safe lists before destructive events;
   - diagnostics remain visible.

项目级 TODO:

1. 增加用户可见的事件解释：
   - 为什么触发；
   - 为什么跳过；
   - 哪个模块拥有结果；
   - 用户可以安全忽略什么。
2. 只有解释/忽略规则存在后，再扩展事件适配器：
   - Shopping/logistics 随机执行在此之前继续禁用。
3. 增加世界观事件包：
   - 日常；
   - 校园；
   - 奇幻；
   - 科幻；
   - 末世。
4. 在 World Hub 后方增加任务/解锁概念：
   - 先审阅；
   - 再开放窄控制；
   - 广泛编辑继续后置。
5. 保持前台运行时显式开启：
   - 默认不做意外后台变更；
   - 破坏性事件前先做安全名单；
   - 诊断持续可见。

Exit criteria / 退出条件:

- PM/QA/users can understand event behavior from the UI and diagnostics.
- Runtime expansion does not make normal modules feel like backend consoles.
- High-impact changes remain reviewable.

退出条件：

- PM、QA、用户能从界面和诊断理解事件行为。
- 运行时扩展不会让普通模块变成后台控制台。
- 高影响变化保持可审阅。

### I5. Background Autonomy Decision / 后台自治决策

Status / 状态: `DECISION`

Goal / 目标:

Decide whether the product needs true closed-page autonomous event generation.

决定产品是否真的需要“页面关闭后仍自主生成事件”。

Project-level TODO:

1. Clarify product expectation:
   - delivery-only push is already available;
   - closed-page event creation requires server-side orchestration.
2. Compare two paths:
   - Path A: keep push as delivery-only, continue foreground/local-first runtime;
   - Path B: add backend orchestration for off-page event generation.
3. If choosing Path B, define:
   - auth;
   - storage ownership;
   - conflict policy;
   - event receipt/proof model;
   - server scheduling and failure recovery;
   - privacy boundary for AI context.
4. Do not start backend automation until this decision is explicit.

项目级 TODO:

1. 澄清产品期待：
   - 当前已具备推送送达；
   - 离页事件生成需要服务端编排。
2. 比较两条路线：
   - 路线 A：推送保持送达用途，继续前台/本地优先运行时；
   - 路线 B：增加服务端编排，支持离页事件生成。
3. 如果选择路线 B，先定义：
   - 授权；
   - 存储归属；
   - 冲突策略；
   - 事件回执/证明模型；
   - 服务端排程与失败恢复；
   - AI 上下文隐私边界。
4. 这个决策明确前，不启动后端自动化实现。

Exit criteria / 退出条件:

- Project has a written decision on delivery-only push vs backend orchestration.
- If backend work starts, it has architecture requirements and privacy boundaries.

退出条件：

- 项目有明确书面决策：推送仅送达，还是进入后端编排。
- 若启动后端工作，必须已有架构要求和隐私边界。

### I6. Visual Rebuild Return / 视觉重建恢复

Status / 状态: `PARKED`

Goal / 目标:

Return to visual work after functional ownership and runtime safety are stable.

在功能归属与运行时安全稳定后，恢复视觉工作。

Project-level TODO:

1. Do not resume broad visual rebuild during I0-I2 unless explicitly requested.
2. When reactivated, promote only one focused visual scope at a time:
   - global shell and lock/home/dock;
   - Chat;
   - Map;
   - Gallery;
   - Shopping/Food Delivery home-folder presentation.
3. Keep visual ownership rule:
   - surfaces opened inside an app keep that app's immersive logic;
   - system-owned full pages can use system visual language.
4. Avoid mixing visual rebuild with data ownership migrations.

项目级 TODO:

1. I0-I2 阶段除非明确要求，不恢复大范围视觉重建。
2. 恢复时一次只晋级一个聚焦范围：
   - 全局壳层与锁屏/Home/Dock；
   - Chat；
   - Map；
   - Gallery；
   - Shopping/Food Delivery 主屏文件夹呈现。
3. 保持视觉归属规则：
   - 从某个 App 内打开的表面，保持该 App 的沉浸逻辑；
   - 系统拥有的完整页面使用系统视觉语言。
4. 不把视觉重建和数据归属迁移混在同一轮。

Exit criteria / 退出条件:

- Visual work has a focused scope and does not reopen unresolved product ownership questions.
- Each visual phase can be validated independently.

退出条件：

- 视觉工作范围聚焦，并且不重新打开未解决的产品归属问题。
- 每个视觉阶段可以独立验收。

## 6. Promotion Rules / 晋级规则

Use these rules to decide when a project-level TODO becomes concrete work.

用以下规则判断项目级 TODO 何时转成具体执行项。

1. If it changes data ownership, create or update a product-decision doc first.
2. If it changes runtime behavior, update architecture/process docs and add tests.
3. If it changes a route, store shape, backup/import behavior, or user-visible module ownership, update the PM status and module catalog.
4. If it is a concrete implementation task, put it in `docs/roadmap/TODO_ROADMAP.md`.
5. If it is a visual-only future scope, keep it in `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md` until explicitly promoted.
6. If it needs backend or dependency major upgrades, isolate it from product feature work.

1. 如果改变数据归属，先创建或更新产品决策文档。
2. 如果改变运行时行为，更新架构/流程文档并补测试。
3. 如果改变路由、store 形态、备份/导入行为或用户可见模块归属，更新 PM 状态和模块目录。
4. 如果已经是具体实现任务，进入 `docs/roadmap/TODO_ROADMAP.md`。
5. 如果只是未来视觉范围，继续留在 `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md`，直到明确晋级。
6. 如果需要后端或依赖大版本升级，应与产品功能开发隔离。

## 7. Recommended Near-Term Sequence / 近期推荐顺序

Recommended sequence:

1. I0 Governance Reset.
2. I1 Calendar / Reminders ownership closure.
3. I2 Architecture deepening around Calendar/Reminders, Chat, Settings, Map, and system runtime.
4. I3 text/event-first memory dedupe plus Calendar relationship facts after ownership closure.
5. I4 user-facing runtime explanation and safer event expansion.
6. I5 backend autonomy decision.
7. I6 visual rebuild return.

推荐顺序：

1. I0 治理复位。
2. I1 Calendar / Reminders 职责收口。
3. I2 围绕 Calendar/Reminders、Chat、Settings、Map 和系统运行时做架构加深。
4. I3 文字/事件优先的记忆去重，以及职责收口后的 Calendar 关系事实。
5. I4 用户可见运行时解释与更安全的事件扩展。
6. I5 后台自治决策。
7. I6 恢复视觉重建。

## 8. Change Log / 变更记录

1. 2026-05-18: Created as the project-level iteration plan after a full project review. It separates portfolio-level direction from concrete module or specialist TODO lists.
   2026-05-18：在整体项目回顾后新增，作为项目级迭代计划，用于区分组合级方向与具体模块/专项 TODO。
2. 2026-05-18: Updated I1 exit criteria after Reminders became a visible Home app with source/status management.
   2026-05-18：Reminders 成为 Home 可见应用并补齐来源/状态管理后，更新 I1 退出标准。
3. 2026-05-18: Updated I1/I3 wording after Calendar confirmed-event relationship facts landed as the first safe schedule/date memory slice.
   2026-05-18：Calendar 已确认事件关系事实作为第一阶段安全日程/日期记忆落地后，更新 I1/I3 表述。
4. 2026-05-18: De-prioritized Gallery relationship facts as a near-term mainline task; current priority is text/event-first memory dedupe, merge, and recall rules.
   2026-05-18：将 Gallery 关系事实从近期主线下调；当前优先级改为文字/事件优先的记忆去重、归并与召回规则。
