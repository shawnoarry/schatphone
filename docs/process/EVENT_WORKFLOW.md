# SchatPhone Event Workflow / SchatPhone 事件专项流程

Updated / 更新时间: 2026-05-16

This document defines the "Event 专项" workflow. It is separate from the visual workflow and from the ordinary feature-progress track. Use it when the team is designing or implementing random triggers, condition-driven interactions, simulated life events, module event presets, event logs, surprise-mode behavior, or cross-module event handoff.

本文定义“事件专项”流程。它独立于视觉专项，也独立于普通功能推进。凡涉及随机触发、条件触发、模拟生活事件、模块事件预设、事件日志、惊喜模式、跨模块事件交接时，优先进入本流程。

## 1. Trigger Phrase / 触发口令

Use this phrase to enter the event workflow:

```text
事件专项
```

Recommended variants:

```text
事件专项：先建架构，不改代码
事件专项：推进外卖事件预设
事件专项：做随机触发基座
事件专项：只做事件 TODO 和接口设计
事件专项：开始实现 simulation store
```

When this phrase appears, the assistant should treat the task as an event-system workflow, not as a visual-polish task or a one-off feature patch.

## 2. Scope Boundary / 范围边界

Event 专项 may change files that define, evaluate, trigger, record, or display simulated events:

- Event architecture docs: `docs/architecture/SIMULATION_EVENT_ENGINE.md`
- World-aware event variant standard: `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`
- Event TODO and handoff docs: `docs/overview/IMMERSIVE_EVENT_TODO.md`
- Event process docs: `docs/process/EVENT_WORKFLOW.md`
- Future event library: `src/lib/simulation/*`
- Future simulation store: `src/stores/simulation.js`
- Module event adapters, for example `src/lib/simulation/adapters/food-delivery-events.js`
- Domain stores only through owned actions, such as `foodDeliveryStore.addOrderEvent(...)`
- Module views only when they need to display event outcomes
- Tests for deterministic event selection, cooldowns, adapters, persistence, and visible surfaces

Event 专项 should avoid:

- Restyling screens unless event display requires a small UI support change
- Moving domain ownership into a global event engine
- Creating a visible Home app named Files/Event/Simulation unless product explicitly decides it
- Letting random events silently mutate important user data without explanation or undo path
- Calling AI directly to mutate state in the first implementation phase
- Replacing normal module actions with a game engine before the product needs Canvas/WebGL/game-loop behavior

If an event change needs visual work, first decide the user-facing surface owner by `docs/process/VISUAL_WORKFLOW.md`.

## 3. Default Working Rules / 默认工作规则

1. Preserve module ownership. Events orchestrate; domain modules still own their own state.
2. Every event must name its trigger source, module owner, adapter action, visible surface, side effects, and tests.
3. Manual, condition-driven, random, scheduled, and AI-assisted events should share one event-template shape.
4. Random events must have cooldowns, daily caps, user controls, and deterministic test paths.
5. Important or negative events must be explainable to the user and dismissible where appropriate.
6. Chat and notifications are display surfaces unless the event explicitly belongs to Chat.
7. Map may provide location, ETA, distance, and route context, but should not own another module's order or payment lifecycle.
8. Wallet, Calendar, Gallery, Files, and Assets should remain downstream consumers unless their own module action creates the event.
9. AI may enrich copy or suggest event candidates later, but should not become the first source of state mutation.
10. Store persistence, backup/restore, and migration safety must be considered before closing an event slice.
11. Tests must avoid flaky randomness. Use fixed seeds or injected random values.
12. Event logs should be readable by future AI assistants, not only rendered to users.
13. World-aware events must follow `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.
14. Runtime event triggers should use local event variant packs by default; API calls are for generating or refreshing packs, not for every random event.

## 4. Event Entry Audit / 事件入口审查

Before changing event code, record or mentally check:

```text
Event name:
Trigger source: manual | condition | random | scheduled | AI-assisted | system
Module owner:
Adapter action:
Input context:
World context:
Variant pack:
Variant id:
Conditions:
Random probability:
Cooldown and caps:
User-visible surfaces:
Side effects:
Reversibility / dismissal:
Persistence and backup impact:
Tests:
```

Decision rules:

1. Module state belongs to the module. The event engine calls an adapter; it does not reach into module internals directly.
2. The adapter is the seam. If an event can be implemented through one module action, keep the interface small.
3. The event engine owns eligibility, timing, probability, cooldowns, caps, and event-log records.
4. The module owner owns real state mutation and data normalization.
5. Cross-module surfaces should display event context, not duplicate ownership.
6. A surprising event should still feel fair: the user should understand why it happened and what changed.

## 5. Event Template Draft / 事件模板草案

Future event templates should be close to this shape:

```js
{
  id: 'food_delivery.rider_delay.v1',
  moduleKey: 'food_delivery',
  type: 'rider_delay',
  title: 'Rider delay',
  summary: 'Courier route slowed down because of traffic.',
  triggerModes: ['manual', 'condition', 'random'],
  conditions: [
    { key: 'order.status', op: 'in', value: ['accepted', 'cooking', 'rider_pickup'] },
  ],
  probability: 0.18,
  cooldownMs: 30 * 60 * 1000,
  dailyLimit: 2,
  effect: {
    adapterKey: 'food_delivery.add_order_event',
    payloadSchema: 'FoodDeliveryOrderEventInput',
  },
  surfaces: ['food_delivery.order_card', 'chat.food_delivery_service'],
}
```

The exact implementation may evolve, but future code should keep the same conceptual interface: template -> eligibility -> trigger -> adapter -> event log -> surface display.

## 6. Installed Skills / 已安装技能

Use these skills when an event task needs their specific guidance:

- `pinia`: use for Pinia store shape, actions, getters, hydration, and persistence patterns.
- `vue-pinia-best-practices`: use for Vue + Pinia reactivity and store-consumption decisions.
- `unit-test-vue-pinia`: use for unit tests around stores, components, and composables.
- `playwright-testing`: use later for browser-level event journeys; do not use by default for small store-level slices.
- `game-engine`: use only when the task becomes a real game-loop, Canvas/WebGL, collision, sprite, or minigame implementation.
- `improve-codebase-architecture`: use when deciding seams, adapters, module depth, locality, and leverage for the event system.

Current guidance:

- The Simulation Event Engine should start as a Vue/Pinia/library architecture, not as a Canvas game engine.
- XState or a full statechart library is deferred until state transitions become too complex for simple templates and adapters.
- The `game-engine` skill is valuable later for minigames or animated simulation surfaces, but it is not the default event-orchestration foundation.

### 6.1 Skill Invocation Matrix / Skill 调用矩阵

Use this matrix before implementation so future developers and AI assistants do not guess which skill applies.

| Event work part / 事件工作部分 | Skill to load / 优先调用 skill | When to use / 何时使用 | Do not use for / 不用于 |
| --- | --- | --- | --- |
| Event architecture, seams, adapters, ownership / 事件架构、接口缝合、适配器、归属 | `improve-codebase-architecture` | Designing engine/module seams, deciding whether a module should own state, reviewing locality/leverage before adding an adapter. / 设计事件引擎与模块之间的 seam、判断状态归属、评估适配器是否有足够局部性与杠杆。 | Pure copy edits or already-decided small tests. / 纯文案或已明确的小测试。 |
| Pinia store foundation / Pinia store 基座 | `pinia` + `vue-pinia-best-practices` | Adding `simulationStore`, event logs, cooldowns, daily caps, settings, hydration, backup/restore shape, or cross-store reads. / 新增 `simulationStore`、事件日志、冷却、每日上限、设置、水合、备份恢复或跨 store 读取。 | Static docs or presentational-only UI. / 静态文档或纯展示 UI。 |
| Store/component unit tests / store 与组件单元测试 | `unit-test-vue-pinia` | Writing or revising Vitest tests for stores, adapters, composables, and Vue event surfaces. / 编写或修订 store、adapter、composable、Vue 事件展示面的 Vitest 测试。 | Browser journey tests that need routing/clicking across screens. / 需要浏览器跨页面点击的旅程测试。 |
| Browser-level event journeys / 浏览器级事件旅程 | `playwright-testing` | Later E2E checks for Home -> Chat -> Food Delivery -> Map -> notification flows, especially when user-visible routing or multiple screens must be verified. / 后续验证 Home、Chat、外卖、Map、通知等跨页面可见旅程。 | Small deterministic engine/store slices; keep those in Vitest first. / 小型确定性引擎或 store 切片，优先用 Vitest。 |
| True minigame or game-loop surfaces / 真正小游戏或 game-loop 表面 | `game-engine` | Canvas/WebGL, game loops, sprites, collision, physics, tile maps, or explicit interactive game scenes. / Canvas/WebGL、游戏循环、精灵、碰撞、物理、瓦片地图或明确小游戏场景。 | Ordinary random events, Food Delivery updates, logistics alerts, or notification simulation. / 普通随机事件、外卖状态、物流提醒、通知模拟。 |
| Event-facing UI polish / 事件展示 UI 打磨 | `frontend-logic-design` first, then visual skills from `docs/process/VISUAL_WORKFLOW.md` if needed | When event surfaces become confusing, visually inconsistent, or require host-surface ownership decisions. / 当事件展示面信息层级混乱、视觉不一致或需要判断宿主视觉归属。 | Core event eligibility, random logic, or store ownership. / 事件资格判断、随机逻辑或 store 归属。 |
| OpenAI API event enrichment / OpenAI 事件文案增强 | `openai-docs` | Only when implementing current OpenAI API calls for event copy enrichment or AI-assisted suggestions. / 仅在接入 OpenAI API 做事件文案增强或 AI 辅助建议时使用。 | Local template work that does not call OpenAI APIs. / 不调用 OpenAI API 的本地模板工作。 |

Default sequence / 默认调用顺序:

1. Architecture question: load `improve-codebase-architecture`.
2. Store or persistence question: load `pinia` and `vue-pinia-best-practices`.
3. Tests for store/component/adapters: load `unit-test-vue-pinia`.
4. Cross-screen browser journey: load `playwright-testing`.
5. Minigame/game-loop implementation: load `game-engine`.
6. Visual/event-surface polish: follow `docs/process/VISUAL_WORKFLOW.md`.

If multiple parts apply, start with architecture first, then store, then tests, then UI/browser verification. Do not load every skill by default.

## 7. Standard Work Sequence / 标准工作顺序

Use this sequence for event work unless the user asks for a narrower path.

1. Read `docs/process/EVENT_WORKFLOW.md`.
2. Read `docs/architecture/SIMULATION_EVENT_ENGINE.md`.
3. If the event depends on WorldBook, worldview, or AI-generated copy, read `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.
4. Check `docs/overview/IMMERSIVE_EVENT_TODO.md` and `docs/roadmap/TODO_ROADMAP.md`.
5. Identify whether the task is documentation-only, store/library foundation, module adapter, user-facing surface, browser journey, or game-loop work.
6. Choose skills from Section 6.1 before editing. Do not load every installed skill by default.
7. Run the event entry audit.
8. Prefer the smallest useful module adapter before broad cross-module orchestration.
9. Add deterministic tests before adding random trigger behavior.
10. Preserve backup/restore and storage diagnostics when new persistent data is introduced.
11. Update `docs/overview/IMMERSIVE_EVENT_TODO.md` with landed work and next recommendation.
12. If the task becomes active implementation work, update `docs/roadmap/TODO_ROADMAP.md` without turning this workflow into a second roadmap.
13. Verify with `git diff --check`, then run targeted tests for touched stores/views.

## 8. First Prompt Template / 首次启动提示词

Use this prompt to start an event session:

```text
事件专项：先读取 docs/process/EVENT_WORKFLOW.md、docs/architecture/SIMULATION_EVENT_ENGINE.md 和 docs/overview/IMMERSIVE_EVENT_TODO.md。
本轮只围绕事件系统工作：随机触发、条件触发、事件预设、事件日志、模块适配器或相关测试。
请先判断事件归属、触发源、适配器接口、用户可见面和持久化影响，再决定是否改代码。
```

For direct implementation:

```text
事件专项：按既有事件流程直接推进 [模块/事件类型]。
保持模块所有权不变，事件引擎只做触发、冷却、概率、日志和适配器调用。
随机逻辑必须可测试，不允许产生不可复现的测试。
```

For documentation-only work:

```text
事件专项：只更新事件架构和 TODO，不改功能代码。
请同步 docs/process、docs/architecture、docs/overview，并说明下一步代码切片。
```

## 9. Verification / 验证

For documentation-only event planning:

```text
git diff --check
```

For event store/library changes:

```text
npm test -- tests\<targeted-store-or-view-test>.test.js
```

For broad event engine changes:

```text
npm run lint
npm test
npm run build
```

For random-event work, verify:

- Fixed-seed or injected-random tests pass reliably.
- Cooldown and daily caps are tested.
- Event logs persist and restore correctly.
- User-visible surfaces explain the event without exposing implementation labels.
- World-aware events use local variant packs at runtime and do not call an API on every random trigger.
