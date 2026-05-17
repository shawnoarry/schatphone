# World Context Event Variant Standard / 世界观事件变体标准需求

Updated: 2026-05-16

This document is the standard requirement for making SchatPhone events world-aware. It extends the Simulation Event Engine with WorldBook-driven world context and local event variant packs.

本文是事件专项的标准需求，用于规定后续所有事件适配器如何接入 WorldBook 绑定后的统一世界观。核心目标是：不同世界观可以触发不同风格的事件，但所有模块仍复用同一个事件基座，不为每个模块重新做一套随机系统。

## 1. Core Decision / 核心决策

SchatPhone events must be generated and executed through this shared chain:

```text
WorldBook bindings
-> world context summary
-> local event variant pack
-> shared event engine
-> module adapter
-> module-owned store action
-> visible module/chat/notification surface
```

The runtime event path should be local by default. API calls should not happen every time a random event triggers.

运行时事件默认本地执行。API 不应在每次随机事件触发时调用。

## 2. Goals / 目标

- Let the same functional event become different immersive events under different WorldBook/worldview bindings.
- Keep random, condition, cooldown, daily cap, and event logging in the shared simulation foundation.
- Keep real data mutation inside the owning module store.
- Let AI generate or refresh event material in batches, then save it locally for later reuse.
- Make future adapters for Shopping, Logistics, Map, Phone, Gallery, Assets, Calendar, Wallet, and Chat follow the same standard.

## 3. Non-Goals / 非目标

- Do not call an API for every event trigger by default.
- Do not let AI directly mutate module state.
- Do not let every module invent its own world-context format.
- Do not store raw WorldBook text in every event log.
- Do not make a visible standalone Simulation/Event app unless product explicitly decides it later.
- Do not use `game-engine` patterns unless the surface is a real minigame, Canvas/WebGL scene, or game loop.

## 4. Required Concepts / 必须统一的概念

### 4.1 World Context / 世界观上下文

`worldContext` is a compact, normalized summary derived from active WorldBook bindings. It is the event engine's worldview input.

它不是完整 WorldBook 原文，而是适合事件系统读取的结构化摘要。

Required shape:

```js
{
  id: 'world_context_sci_fi_city',
  source: 'worldbook_binding',
  activeWorldBookIds: ['wb_sci_fi_city_01'],
  sourceScope: 'conversation',
  genreTags: ['sci_fi', 'city'],
  toneTags: ['clean', 'high_tech', 'quiet_tension'],
  techLevel: 'high',
  dangerLevel: 'medium',
  socialOrder: 'stable',
  economyMode: 'credits',
  magicLevel: 'none',
  locale: 'zh-CN',
  version: 1,
  updatedAt: 1778918400000
}
```

Field rules:

- `id`: stable local id for the summarized context.
- `source`: `default`, `worldbook_binding`, `manual`, or `ai_generated_summary`.
- `activeWorldBookIds`: references only; avoid copying full WorldBook content into logs.
- `sourceScope`: `global`, `conversation`, `role`, `module`, or `route`.
- `genreTags`: broad world categories such as `daily`, `sci_fi`, `apocalypse`, `fantasy`, `cyberpunk`, `historical`, `supernatural`.
- `toneTags`: surface tone hints; examples: `warm`, `tense`, `absurd`, `official`, `romantic`, `grim`, `luxury`.
- `techLevel`, `dangerLevel`, `socialOrder`, `economyMode`, `magicLevel`: small enums, not free-form essays.
- `locale`: event-copy language target.

### 4.2 Event Template / 事件模板

An event template defines the functional event. It should be stable across worlds.

事件模板定义“功能上发生了什么”，不直接等同于最终文案。

Example:

```js
{
  id: 'food_delivery.rider_delay.v1',
  moduleKey: 'food_delivery',
  type: 'rider_delay',
  triggerModes: ['manual', 'condition', 'random'],
  conditions: [
    { key: 'order.status', op: 'in', value: ['accepted', 'cooking', 'rider_pickup'] }
  ],
  probability: 0.18,
  cooldownMs: 30 * 60 * 1000,
  dailyLimit: 2,
  effect: {
    adapterKey: 'food_delivery.add_order_event',
    payloadSchema: 'FoodDeliveryOrderEventInput'
  },
  surfaces: ['food_delivery.order_card', 'chat.food_delivery_service']
}
```

### 4.3 Event Variant / 事件变体

An event variant is the world-aware expression of one template.

事件变体定义“在某个世界观中，这个功能事件被包装成什么沉浸式事件”。

Example:

```js
{
  id: 'food_delivery.rider_delay.sci_fi.drone_lane_queue.v1',
  templateId: 'food_delivery.rider_delay.v1',
  worldScope: ['sci_fi', 'city'],
  title: '低空航道排队',
  summaryTemplates: [
    '配送无人机进入低空航道管制队列，预计晚到 {etaDeltaMinutes} 分钟。',
    '城市空域调度延迟，配送路线已自动重排。'
  ],
  detailTemplates: [
    '订单仍在派送中。系统已根据当前航道拥堵重新计算 ETA。'
  ],
  payloadHints: {
    eventType: 'rider_delay',
    severity: 'soft_delay'
  },
  probabilityMultiplier: 1,
  cooldownMultiplier: 1,
  impactLevel: 'non_destructive',
  reversible: true,
  requiresUserConfirmation: false,
  safetyTags: ['no_data_loss', 'explainable'],
  locale: 'zh-CN'
}
```

### 4.4 Event Variant Pack / 事件变体包

An event variant pack is a local library of variants generated or curated for a world context.

事件变体包是一组本地保存的世界观事件素材。它可以来自内置默认包、用户手写、AI 批量生成、或后续编辑。

Required shape:

```js
{
  id: 'variant_pack_sci_fi_city_v1',
  worldContextId: 'world_context_sci_fi_city',
  worldContextHash: 'ctx_hash_abc123',
  activeWorldBookIds: ['wb_sci_fi_city_01'],
  source: 'ai_generated',
  moduleKeys: ['food_delivery', 'shopping', 'map'],
  templateIds: ['food_delivery.rider_delay.v1'],
  variantsByTemplateId: {
    'food_delivery.rider_delay.v1': [
      {
        id: 'food_delivery.rider_delay.sci_fi.drone_lane_queue.v1',
        title: '低空航道排队',
        summaryTemplates: ['配送无人机进入低空航道管制队列，预计晚到 {etaDeltaMinutes} 分钟。']
      }
    ]
  },
  version: 1,
  createdAt: 1778918400000,
  updatedAt: 1778918400000
}
```

## 5. Runtime Flow / 运行时流程

The runtime event flow must not depend on an API call.

运行时流程必须可以完全本地执行：

1. Resolve active `worldContext`.
2. Load matching local `eventVariantPack`.
3. Find eligible event templates for the module.
4. Resolve the best event variant for each template.
5. Evaluate template conditions through `condition-evaluator`.
6. Evaluate random gate through deterministic random helper.
7. Check cooldowns and daily caps through `simulationStore`.
8. Call the module adapter.
9. Adapter calls the owning module store action.
10. Write event log with template id, variant id, world context id, trigger source, and result.
11. Existing module surfaces display the result.

If no variant pack exists, use the built-in fallback variant for `daily`.

## 6. API Usage Policy / API 使用策略

API usage is allowed for material generation, not ordinary runtime execution.

Recommended API moments:

- User clicks "generate world event pack" after binding a WorldBook.
- User refreshes or expands an existing event variant pack.
- User asks for richer copy for a selected event.
- Future advanced mode asks AI to suggest candidate event packs, which the engine still validates.

Forbidden default pattern:

```text
random event triggers
-> call API
-> generate copy
-> mutate module state
```

Required default pattern:

```text
WorldBook selected or changed
-> optionally call API once to generate/refresh a variant pack
-> save variant pack locally
-> later random events use local variants only
```

This keeps cost predictable, preserves deterministic tests, and prevents slow/random network behavior from blocking immersion.

## 7. World Context Priority / 世界观来源优先级

When multiple WorldBook bindings exist, resolve world context in this order unless a module has a stronger product rule:

1. Explicit module/route context.
2. Active Chat conversation binding.
3. Active role binding.
4. Global worldview or world kernel.
5. Default `daily` context.

The selected context id should be logged so future developers and AI assistants can explain why an event appeared in a given style.

## 8. Adapter Standard / 适配器标准

Every module event adapter must follow this interface discipline:

- Accept event input from the shared event engine, not from a module-local random system.
- Accept or resolve a `variant`, but do not read raw WorldBook text directly.
- Mutate only the owning module's store through existing or new module-owned actions.
- Return a normalized adapter result that can be logged.
- Preserve module ownership: Shopping owns orders, Food Delivery owns food orders, Map owns routes/ETA, Calendar owns reminders, Wallet owns ledger entries.
- Provide a default `daily` variant so the module works without API and without WorldBook.
- Add tests for at least default daily behavior and one world-context variant.

Recommended adapter input:

```js
{
  template,
  variant,
  context,
  worldContext,
  variantPack,
  targetId,
  triggerSource,
  now
}
```

Recommended adapter result:

```js
{
  ok: true,
  moduleKey: 'food_delivery',
  templateId: 'food_delivery.rider_delay.v1',
  variantId: 'food_delivery.rider_delay.sci_fi.drone_lane_queue.v1',
  targetId: 'food_order_123',
  mutationId: 'food_event_456',
  visibleSurface: 'food_delivery.order_card'
}
```

## 9. Event Log Standard / 事件日志标准

Future simulation event logs should include world metadata.

Required fields to add when this feature is implemented:

```js
{
  eventId: 'food_delivery.rider_delay.v1',
  moduleKey: 'food_delivery',
  triggerSource: 'random',
  status: 'triggered',
  targetId: 'food_order_123',
  adapterKey: 'food_delivery.add_order_event',
  variantId: 'food_delivery.rider_delay.sci_fi.drone_lane_queue.v1',
  variantPackId: 'variant_pack_sci_fi_city_v1',
  worldContextId: 'world_context_sci_fi_city',
  activeWorldBookIds: ['wb_sci_fi_city_01'],
  reason: 'eligible_random_passed',
  at: 1778918400000
}
```

Do not log raw WorldBook content by default.

## 10. Safety Standard / 安全标准

Random events must stay fair and explainable.

Rules:

- `impactLevel: non_destructive` events may run randomly when cooldown/cap/user settings allow.
- `impactLevel: reversible` events may run randomly only if the visible surface explains what changed.
- `impactLevel: destructive` events must not run randomly by default.
- Events that cancel orders, delete content, spend currency, alter assets, or change relationships need explicit confirmation or a product-approved high-intensity mode.
- Every negative event must have a user-facing explanation and a dismissal/acknowledgement path.
- Surprise Mode must be respected once exposed.

## 11. Required Built-In Variant Families / 必须内置的基础世界观

To avoid API dependency, the project should eventually include built-in local variants for at least:

- `daily`: normal modern phone life.
- `sci_fi`: high-tech, drone, orbital, AI, cyber-city language.
- `apocalypse`: scarcity, checkpoints, sealed roads, supply teams, unstable infrastructure.

Later optional families:

- `fantasy`
- `cyberpunk`
- `supernatural`
- `historical`
- `romance`
- `slice_of_life`

## 12. Module Examples / 模块示例

### Food Delivery

Template: `food_delivery.rider_delay.v1`

- `daily`: rider delayed by traffic or rain.
- `sci_fi`: delivery drone delayed by low-altitude corridor control.
- `apocalypse`: courier reroutes around a sealed checkpoint.

### Shopping / Logistics

Template: `shopping.package_delayed.v1`

- `daily`: courier network delay.
- `sci_fi`: orbital customs queue or autonomous sorting node delay.
- `apocalypse`: convoy delayed by supply checkpoint.

### Map

Template: `map.route_disrupted.v1`

- `daily`: road congestion or accident.
- `sci_fi`: air-lane congestion or signal blackout.
- `apocalypse`: blocked road, patrol zone, unstable bridge.

### Assets

Template: `assets.maintenance_due.v1`

- `daily`: vehicle service/property maintenance.
- `sci_fi`: ship module calibration or apartment oxygen filter service.
- `apocalypse`: shelter reinforcement or generator maintenance.

## 13. Persistence Requirement / 持久化要求

Initial implementation should extend `simulationStore` unless event packs become too large.

Suggested future fields:

```js
{
  worldContexts: [],
  variantPacks: [],
  activeWorldContextId: '',
  activeVariantPackId: ''
}
```

If variant packs become large, create a dedicated store only after the interface is stable. The event engine should still consume the same normalized shape.

Backup/export/import/storage diagnostics must include any persistent event-pack state.

## 14. Test Requirements / 测试要求

Every world-aware adapter must cover:

- World context normalization.
- Variant pack fallback to `daily`.
- Variant selection for at least one non-default world, preferably `sci_fi` or `apocalypse`.
- Runtime trigger path does not call API.
- Cooldown and daily cap still work.
- Event log includes `worldContextId`, `variantPackId`, and `variantId` once implemented.
- Adapter mutates only the owning module store.
- Existing visible surfaces display the result without exposing internal ids.

## 15. Implementation Phases / 实施阶段

### Phase A: Standard and Data Shape

- Land this standard requirement.
- Keep existing event engine unchanged unless needed for metadata passthrough.

### Phase B: World Context Resolver

- Add a resolver that converts active WorldBook bindings into `worldContext`.
- Start with deterministic local mapping; AI summary is optional later.

### Phase C: Variant Pack Storage

- Add local built-in packs for `daily`, `sci_fi`, and `apocalypse`.
- Persist user/AI-generated packs.

### Phase D: Food Delivery Pilot

- Add world-aware variants for ETA update and rider delay.
- Log variant metadata.
- Keep cancellation/manual-only until safety design is finished.

### Phase E: Cross-Module Adapter Expansion

- Add Shopping/logistics, Map, Phone, Gallery, Assets, Calendar, and Wallet event presets using this same standard.

## 16. Acceptance Checklist / 验收清单

Before closing any world-aware event adapter:

- It uses the shared event engine.
- It has a `daily` fallback.
- It can resolve at least one WorldBook-derived variant.
- It does not call API during ordinary runtime trigger.
- It respects cooldowns, daily caps, and future Surprise Mode.
- It logs enough metadata for future AI/developer handoff.
- It does not move module ownership into the event engine.
- It has deterministic tests.

## 17. 2026-05-16 Implementation Baseline

The first implementation baseline is now available in code.

Landed files:

- `src/lib/simulation/world-context.js`
- `src/lib/simulation/event-variants.js`
- `src/lib/simulation/adapters/food-delivery-events.js`
- `src/stores/simulation.js`

Implemented behavior:

- `resolveWorldContextFromWorldBook(...)` derives a compact `worldContext` from global worldview text and enabled knowledge points.
- The first built-in families are `daily`, `sci_fi`, and `apocalypse`.
- `createBuiltInVariantPack(...)`, `selectEventVariant(...)`, and `renderEventVariantCopy(...)` provide local variant selection and copy rendering.
- Food Delivery ETA update and rider-delay events now use built-in local variants.
- Event logs can record `variantId`, `variantPackId`, `worldContextId`, and `activeWorldBookIds`.

Important limits:

- Variant packs are currently built-in code assets, not persisted user/AI-generated packs.
- Only Food Delivery ETA update and rider delay are world-aware.
- Runtime event triggering still does not call API.
- Destructive events remain blocked from random execution.

Validation:

- `npm test -- tests\simulation-world-context.test.js tests\simulation-event-variants.test.js tests\simulation-store.test.js tests\simulation-event-engine.test.js tests\food-delivery-event-adapter.test.js tests\food-delivery-view.test.js`

Next standard requirement for future adapters:

- Shopping/logistics, Map, Assets, Phone, Calendar, Wallet, Gallery, and Chat adapters should reuse these same `worldContext` and `eventVariantPack` shapes.
- New adapters should start with one `daily` fallback and one non-default family before adding AI-generated packs.
