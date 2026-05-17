# Simulation Event Engine / 模拟事件引擎架构

Updated / 更新时间: 2026-05-16

This document records the proposed architecture for SchatPhone's immersive event foundation: random surprises, condition-triggered events, scheduled simulation, and module-owned event side effects.

本文记录 SchatPhone 沉浸式事件基座的架构方向：随机惊喜、条件触发、定时模拟、以及由各模块自行拥有的事件副作用。

## 1. Goal / 目标

Make SchatPhone feel alive without turning every module into a manually operated admin panel.

让 SchatPhone 不只是“用户自己点按钮管理数据”，而是能在合适条件下出现有解释、有节奏、有边界的沉浸式事件。

The event foundation should support:

- Manual trigger: user or developer explicitly starts an event.
- Condition trigger: state changes make an event eligible.
- Random trigger: eligible event is selected with probability, cooldown, and caps.
- Scheduled trigger: local time or app session cadence checks event eligibility.
- AI-assisted trigger: AI may later suggest event copy or candidates, but should not own state mutation by default.
- World-aware variants: active WorldBook bindings may select local event variants through `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.

## 2. Non-Goals / 非目标

This architecture is not:

- A full game engine.
- A Canvas/WebGL rendering engine.
- A replacement for Pinia domain stores.
- A hidden backend that owns all module state.
- A reason to show a new Home app named Event, Simulation, Files, or Backend.
- A permission to randomly mutate important user data without explanation or controls.

The event foundation should be an internal coordination layer. User-facing immersion appears through existing modules: Chat, Food Delivery, Shopping, Map, Calendar, Phone, Gallery, Assets, Wallet, and notifications.

## 3. Core Concepts / 核心概念

### Event Template / 事件模板

A declarative record describing what can happen, when it is eligible, how often it may happen, what adapter should run, and where the user can see the result.

事件模板描述“什么可能发生、何时有资格发生、多久能发生一次、调用哪个适配器、用户在哪里看到结果”。

### Trigger Source / 触发源

The reason an event is evaluated:

- `manual`
- `condition`
- `random`
- `scheduled`
- `AI-assisted`
- `system`

### Event Engine / 事件引擎

The module that evaluates templates, checks cooldowns/caps, applies deterministic random selection, calls adapters, and writes event logs.

事件引擎只负责资格判断、冷却/上限、确定性随机、适配器调用和事件日志，不直接拥有业务状态。

### Module Adapter / 模块适配器

A concrete adapter at a seam between the event engine and a domain store.

Examples:

- Food Delivery adapter calls `foodDeliveryStore.addOrderEvent(...)`.
- Shopping adapter may call a future promotion/order event action.
- Phone adapter may call a future incoming-call or missed-call action.
- Calendar adapter may call a future cue/reminder action.

### Event Log / 事件日志

A persistent record of event execution, useful for user explanation, debugging, backup/restore, and future AI assistant handoff.

### Surprise Mode / 惊喜模式

A future user-level control that decides how actively random events can appear. It should include at least:

- Off
- Low
- Balanced
- High

The first implementation may keep this hidden or defaulted, but the architecture should reserve the setting.

## 4. Proposed File Layout / 建议文件布局

Initial foundation:

```text
src/lib/simulation/event-registry.js
src/lib/simulation/event-engine.js
src/lib/simulation/condition-evaluator.js
src/lib/simulation/random.js
src/stores/simulation.js
```

Module adapters:

```text
src/lib/simulation/adapters/food-delivery-events.js
src/lib/simulation/adapters/shopping-events.js
src/lib/simulation/adapters/map-events.js
src/lib/simulation/adapters/phone-events.js
src/lib/simulation/adapters/calendar-events.js
```

Tests:

```text
tests/simulation-event-engine.test.js
tests/simulation-store.test.js
tests/food-delivery-event-adapter.test.js
```

The first implementation does not need every file above. The important part is to keep the seam clear: engine logic in `src/lib/simulation/*`, persistent settings/logs in `src/stores/simulation.js`, domain mutation through adapters only.

## 5. Interface Sketch / 接口草案

An event template should be close to:

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

An engine execution result should be close to:

```js
{
  eventId: 'food_delivery.rider_delay.v1',
  moduleKey: 'food_delivery',
  triggerSource: 'random',
  status: 'triggered',
  targetId: 'food-order-123',
  adapterKey: 'food_delivery.add_order_event',
  at: 1778918400000,
  reason: 'eligible_random_passed',
}
```

## 6. Execution Flow / 执行流程

1. Collect context snapshot from relevant stores.
2. Load event templates from the registry.
3. Filter templates by trigger source.
4. Evaluate template conditions.
5. Check cooldowns and daily caps.
6. Apply deterministic random selection when needed.
7. Build adapter payload.
8. Call the module adapter.
9. Write event log to the simulation store.
10. Let existing module views, Chat service accounts, notifications, or Calendar cues display the result.

## 7. Ownership Rules / 归属规则

### Food Delivery

- Owns restaurants, menus, cart, orders, order status, and order event records.
- Event engine may trigger Food Delivery events through an adapter.
- Chat may display Food Delivery service-account event context.
- Map may provide address/ETA context, not order ownership.

### Shopping

- Owns products, cart, orders, checkout, shop identity, promotion candidates, and logistics entry state.
- Store service accounts may push new arrivals, discounts, and recommendations.
- Logistics service accounts own logistics-message display, not Shopping order mutation.

### Map

- Owns location, route, distance, ETA, area context, and trip simulation.
- May provide context to Food Delivery, Shopping logistics, Assets locations, and Calendar planning.
- Must not own restaurant orders, shopping orders, Wallet ledger entries, or asset records.

### Chat

- Owns conversations, contacts, service-account bindings, and visible message surfaces.
- Event engine should not write arbitrary chat messages as the first implementation.
- Chat can display read-only service-account event cards and route users to the owning module.

### Calendar

- Owns reminders, cues, scheduled events, and user-confirmed calendar records.
- Event engine may create candidate cues later, but Calendar should own confirmation/dismissal.

### Wallet and Assets

- Downstream consumers by default.
- Wallet may receive expense suggestions; it owns ledger writes.
- Assets may receive maintenance/ownership events; it owns asset records.

## 8. First Pilot / 首个试点

The safest pilot is Food Delivery status/exception events, because the baseline already exists:

- Store action: `foodDeliveryStore.addOrderEvent(orderId, eventInput)`
- Event types already represented:
  - Rider delay
  - Restaurant cancellation
  - Address change
  - ETA update
  - Status update
- Visible surfaces:
  - Food Delivery order card
  - Chat Food Delivery service-account card
- Tests already cover event persistence and display.

Recommended next pilot step:

1. Extract Food Delivery event preset definitions.
2. Add a deterministic manual trigger helper.
3. Then add random eligibility only after tests prove cooldown and caps.

## 9. Randomness Policy / 随机策略

Random event work must be testable and respectful:

- Never call `Math.random()` directly in business logic.
- Use injected random values or a seeded helper.
- Keep random eligibility separate from side effects.
- Store the reason an event did or did not trigger.
- Respect cooldowns and daily caps.
- Allow future user control through Surprise Mode.

Suggested helper:

```js
evaluateRandomGate({
  probability: 0.18,
  randomValue: 0.12,
})
```

This is boring in the best way: boring tests, surprising product.

## 10. AI Role / AI 角色

AI should be optional and layered:

- Phase 1: no AI needed. Templates and copy are local.
- Phase 2: AI may generate richer user-facing copy from a safe event payload.
- Phase 3: AI may suggest possible event candidates, but the engine still validates them.
- Phase 4: AI-assisted simulation can be explored only after audit logs, user controls, and deterministic fallbacks exist.

AI should not be the first state mutator because it makes tests, user trust, and backup recovery harder.

World-aware event copy should follow `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`: API calls may generate or refresh local event variant packs, but ordinary runtime random triggers should use saved local variants.

## 11. Migration Path / 迁移路径

Phase 0: Documentation and ownership map.

Phase 1: Food Delivery event presets and adapter extraction.

Phase 2: `simulationStore` with event logs, cooldowns, caps, and user-level settings.

Phase 3: `event-engine` library with deterministic condition and random evaluation.

Phase 4: Add Shopping/logistics, Phone, Calendar, Map, and Gallery event templates.

Phase 5: Consider XState/statecharts only if event transition logic becomes too complex.

Phase 6: Use `game-engine` skill only for true minigame or Canvas/WebGL surfaces, not ordinary module events.

## 12. Testing Requirements / 测试要求

Minimum tests for an event engine slice:

- Template eligibility with explicit context.
- Random gate with injected values.
- Cooldown and daily cap behavior.
- Adapter calls with normalized payload.
- Event log persistence and restore.
- Module view displays event outcome without exposing internal labels.
- Chat or notification display stays read-only when ownership belongs elsewhere.

For the Food Delivery pilot, targeted tests should include:

```text
tests/food-delivery-store.test.js
tests/food-delivery-view.test.js
tests/chat-shopping-preview-routing.test.js
```

When the shared simulation engine exists, add:

```text
tests/simulation-event-engine.test.js
tests/simulation-store.test.js
```

## 13. 2026-05-16 Landed Baseline / 2026-05-16 Event Foundation Baseline

The shared event foundation now exists in code.

Landed:

- `src/stores/simulation.js` persists event logs, cooldowns, daily counters, module enable flags, and Surprise Mode.
- `src/lib/simulation/random.js` provides injected/seeded deterministic random helpers.
- `src/lib/simulation/condition-evaluator.js` evaluates basic template conditions.
- `src/lib/simulation/event-engine.js` evaluates eligibility, random gates, cooldowns, daily caps, adapter execution, and event logs.
- `src/lib/simulation/adapters/food-delivery-events.js` is the first module adapter and exposes `runFoodDeliveryOrderEventPreset(...)`.
- Settings backup/import/rollback and storage diagnostics include `store:simulation`.

Updated migration path:

- Next: wire a guarded low-frequency Food Delivery random pilot on active orders.
- Then: add Shopping/logistics presets through the same adapter seam.
- For WorldBook-aware behavior, implement world context and event variant packs through `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.
- Keep XState/statecharts deferred until event transitions become too complex for simple templates.
- Keep `game-engine` skill reserved for true minigames or Canvas/WebGL surfaces, not ordinary module events.

## 14. 2026-05-16 Low-Frequency Pilot Update

The first guarded runtime pilot now exists.

Landed:

- `runFoodDeliveryRandomOrderEventPilot(...)` in `src/lib/simulation/adapters/food-delivery-events.js`.
- Pilot-level event id: `food_delivery.random_order_pilot.v1`.
- Pilot-level cooldown and daily cap are checked before any module mutation.
- The pilot safe-list only includes:
  - `food_delivery.eta_update.v1`
  - `food_delivery.rider_delay.v1`
- `FoodDeliveryView.vue` can manually trigger the pilot from an order card for demo/testing.

Architecture meaning:

- The event engine remains the shared evaluator and audit layer.
- The Food Delivery adapter remains the only caller that mutates Food Delivery order events.
- The view does not implement random/cooldown/cap logic directly.
- Restaurant cancellation and other destructive/negative events are still not allowed in automatic random execution.

## 15. 2026-05-16 World-Aware Metadata Update

The event engine and simulation store now reserve and persist world-aware metadata:

```js
{
  variantId: 'food_delivery.rider_delay.sci_fi.corridor_queue.v1',
  variantPackId: 'variant_pack_world_context_sci_fi_global_built_in',
  worldContextId: 'world_context_sci_fi_global',
  activeWorldBookIds: ['kp_city']
}
```

Current scope:

- The metadata is used by Food Delivery event pilot logs.
- It is intentionally compact and does not copy raw WorldBook text into event logs.
- Built-in variants are local code assets, not API-generated material.

Next architecture step:

- Add the same adapter pattern for Shopping/logistics events.
- If runtime scheduling is added, keep scheduling as a thin caller of existing adapters rather than a new owner of module state.

## 16. 2026-05-16 Shopping Logistics Adapter Update

Shopping/logistics now uses the same shared event engine pattern as Food Delivery.

Landed:

- `src/stores/shopping.js` persists order-level logistics events at `order.events`.
- `shoppingStore.addOrderEvent(...)` is the only Shopping-owned mutation seam for those events.
- `src/lib/simulation/adapters/shopping-logistics-events.js` defines presets for package shipped, package arrived, pickup point changed, and international logistics delay.
- `runShoppingLogisticsEventPreset(...)` delegates eligibility, cooldowns, caps, skipped logs, failed logs, and adapter execution to `runEventAdapter(...)`.
- `ShoppingView.vue` and `ChatView.vue` only read the latest Shopping logistics event for display.

Runtime policy:

- Shopping/logistics presets currently allow `manual` and `condition` trigger sources only.
- No Shopping/logistics random runtime trigger is enabled yet.
- Scheduling should remain a thin caller of existing adapters; it must not own Shopping order state.

Next architecture step:

- Add a session/scheduled event tick helper that can call existing safe pilots at low frequency.
- The tick helper should consult Surprise Mode, module enable flags, cooldowns, and daily caps before adapter execution.
- Keep the first runtime tick scope limited to Food Delivery safe-list events until Shopping/logistics explanation and dismissal rules are designed.

## 17. 2026-05-16 Session Tick Runner Update

The first shared tick runner now exists as a library, not an automatic background process.

Landed:

- `src/lib/simulation/event-tick-runner.js`
- `SIMULATION_EVENT_TICK_ID = "simulation.session_tick.v1"`
- `canRunSimulationEventTick(...)`
- `runSimulationEventTick(...)`

Current execution scope:

- Checks Surprise Mode first.
- Checks tick-level cooldown and daily cap before pilots.
- Calls only `runFoodDeliveryRandomOrderEventPilot(...)`.
- Uses the existing Food Delivery safe-list: ETA update and rider delay only.
- Does not enable Shopping/logistics random execution.
- Does not run automatically from app lifecycle yet.

Important behavior:

- If a pilot triggers, the tick records its own cooldown/daily counter.
- If a pilot skips, the tick logs the skip but does not mark its own cooldown as triggered.
- The tick runner is a caller/coordinator only; module-owned stores still perform all real mutations.

Next architecture step:

- Add a manual Diagnostics/Settings caller for `runSimulationEventTick(...)`.
- Only after manual diagnostics proves stable should the project add foreground app-session automatic ticks.

## 18. 2026-05-17 Manual Diagnostics Caller

The first explicit caller for `runSimulationEventTick(...)` now exists.

Landed:

- Settings > About includes an Event Tick Diagnostics card.
- The card runs exactly one tick on user/developer action.
- The caller writes a `simulation/run_event_tick` report into system reports.
- Network reports can filter the `simulation` module and label tick triggered/skipped results.

Current boundary:

- The helper is callable manually only.
- No app lifecycle hook or background interval calls it yet.
- The allowed pilot set remains Food Delivery safe events only.
- Shopping/logistics random execution remains disabled.

Next architecture step:

- Add a readonly event-log explanation surface so users/developers can inspect why an event happened or why a tick skipped.
- Automatic foreground ticks should wait until that explanation surface exists.

## 19. 2026-05-17 Readonly Event Log Explanation Surface

Settings > About now provides the first readonly explanation surface for simulation event logs.

Landed:

- `SettingsView.vue` maps compact simulation logs to human-readable labels for event id, module, trigger source, status, reason, target, and world variant metadata.
- `SettingsStorageDiagnosticsSection.vue` renders recent simulation logs without mutating module data.
- The panel keeps technical ids visible so developers and AI assistants can trace adapter behavior.

Current boundary:

- This is an explanation and audit surface only.
- It does not enable automatic app lifecycle ticks.
- It does not change Surprise Mode, cooldown, daily cap, or adapter execution policy.
- It remains compatible with future Food Delivery, Shopping/logistics, Map, Phone, Gallery, Assets, Calendar, Wallet, and Chat adapters because it reads the shared `simulationStore` log shape.

Next architecture step:

- Add a guarded foreground-session tick caller with a long interval and no destructive events.
- Keep the first automatic scope limited to Food Delivery ETA/rider-delay safe-list events.
- Shopping/logistics random execution should remain disabled until notice explanation and dismissal rules are designed.

## 20. 2026-05-17 Foreground Session Tick Controller Foundation

The event engine now has a reusable foreground-session tick controller foundation.

Landed:

- `src/lib/simulation/foreground-session-tick.js`
- `createForegroundSessionTickController(...)`
- `SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS = 10 minutes`
- `SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS = 1 minute`

Boundary:

- The controller is a scheduler/caller only.
- It delegates real event execution to `runSimulationEventTick(...)`.
- It does not own any module state.
- It is not connected to app lifecycle, route hooks, or background execution yet.

Reasoning:

- Automatic event execution should have a reusable guardrail before it is wired into the UI.
- Enforcing a minimum interval prevents accidental high-frequency random loops.
- Keeping it library-only lets future work decide whether user control belongs in Settings > Automation or a developer diagnostics surface.

Next architecture step:

- Decide the explicit user-facing control location.
- Then wire the controller with clear copy for Surprise Mode, interval, and the currently enabled safe-list.

## 21. 2026-05-17 Map Readonly Delivery Event Handoff

Map now has a shared readonly handoff for delivery-related event locations.

Landed:

- `mapStore.buildDeliveryEventMapHandoff(...)`
- Food Delivery event input can produce pickup/dropoff/ETA context.
- Shopping logistics event input can produce pickup/dropoff/location/tracking/carrier context.

Boundary:

- Map does not mutate Food Delivery or Shopping orders.
- Map does not start a trip from this handoff.
- Map does not write trip history from this handoff.
- The handoff output is source metadata and route/location context only.

Future use:

- Food Delivery can show "View route context" for ETA/rider/order events.
- Shopping logistics can show "View route context" for pickup point, package arrival, and delivery-delay events.
- Automatic event adapters can include route context later without moving ownership away from the source module.

## 22. 2026-05-17 Optional Runtime Control Surface

The event engine is an internal reusable foundation. Its user-facing runtime-control surface is optional.

Current decision:

- `app_control_center` / `/control-center` is the Director app entry.
- The entry appears on Home only when `settings.more.featureToggles.control_center === true`.
- When the toggle is off, Home must normalize away `app_control_center` even if old/imported layouts contain it.
- Direct route access is allowed, but the page should explain that the runtime-control layer is optional and can be enabled from More.

Boundary:

- Director may coordinate event controls, logs, surprise mode, affinity, funds, unlocks, and other future game-like values.
- Director must not become the required intake surface for roles, assets, map places, shopping products, food delivery restaurants, or other module-native records.
- Module stores keep owning mutation. The event engine and Director call adapters or store actions; they do not take over domain data.

Next architecture step:

- Connect Director to read-only `simulationStore` state before adding mutation controls.
- First read-only panel should show event mode, event-log count, recent event summaries, module adapter enablement, and world-variant pack status.
- Mutation controls should wait until audit logs, explanation copy, and undo/dismissal semantics are clear.
