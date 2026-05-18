# Immersive Event TODO / 沉浸式事件 TODO

Updated / 更新时间: 2026-05-16

## 1. Purpose / 用途

This is the active handoff board for the Event 专项 track. It records the work needed to turn SchatPhone's high-freedom modules into a more alive system with manual, condition-driven, scheduled, and random events.

本文是“事件专项”的接手看板，用来记录如何把 SchatPhone 当前自由度较高的模块，逐步升级为具备手动触发、条件触发、定时触发和随机触发的沉浸式系统。

Authority note / 职责说明:

- This file is a handoff and planning reference, not the only live execution board.
- Active implementation status still belongs in `docs/roadmap/TODO_ROADMAP.md`.
- Process rules live in `docs/process/EVENT_WORKFLOW.md`.
- Architecture rules live in `docs/architecture/SIMULATION_EVENT_ENGINE.md`.
- World-aware event variant rules live in `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.
- Visual event presentation should still follow `docs/process/VISUAL_WORKFLOW.md`.

North star / 北极星原则:

- Events are not meant to restrict the user or turn SchatPhone into a task checklist.
- Event, growth, and numeric systems should make the virtual phone world feel more alive, more continuous, and more real.
- If an event mechanic reduces free roleplay, exposes too much machinery, or feels like artificial control, redesign it as optional, lower-impact, or behind World Hub review.
- The recurring question for future work: does this increase immersive freedom, or does it make the system feel more managed?

## 2. Current Working State / 当前状态

Recently landed event-relevant baseline:

- Food Delivery now has local restaurants, menus, cart, orders, order status, and user-created image-source support.
- Map now provides read-only Food Delivery location/ETA context.
- Chat now has read-only Food Delivery service-account context.
- Food Delivery order events now support status/exception records such as rider delay, restaurant cancellation, address change, ETA update, and status update.
- Food Delivery event records are displayed in Food Delivery order cards and Chat Food Delivery service-account cards.
- Relationship runtime now has its first safe fact-adapter batch: Shopping gift purchase and Food Delivery shared meal.
- Targeted tests already cover Food Delivery event persistence and display.

Recently installed event-supporting skills:

- `pinia`
- `vue-pinia-best-practices`
- `unit-test-vue-pinia`
- `playwright-testing`
- `game-engine`

Important decision:

- The next foundation should be a Simulation Event Engine built with local Vue/Pinia/library seams.
- Do not start with a full game engine, XState migration, or AI-owned state mutation.

## 3. P0 Tasks / 最高优先级

### P0.1 Freeze Event Workflow Docs

Goal / 目标:

- Establish a stable event-specialist workflow parallel to the visual workflow.

Status / 状态:

- Baseline created in `docs/process/EVENT_WORKFLOW.md`.

Acceptance / 验收:

- The workflow defines trigger phrase, scope, audit template, skills, standard sequence, and verification rules.
- It explicitly prevents event work from taking over module ownership.

### P0.2 Freeze Simulation Event Engine Architecture

Goal / 目标:

- Record the proposed event engine interface, file layout, ownership rules, random policy, AI role, and migration path.

Status / 状态:

- Baseline created in `docs/architecture/SIMULATION_EVENT_ENGINE.md`.

Acceptance / 验收:

- Future workers can understand the planned seam between event engine and module adapters.
- Random event work has deterministic testing rules before code begins.

### P0.3 Promote Food Delivery Event Baseline Into Presets

Goal / 目标:

- Convert the current Food Delivery order-event behavior into explicit reusable event presets.

Status / 状态:

- Done on 2026-05-16.
- Landed module: `src/lib/simulation/adapters/food-delivery-events.js`.
- Landed tests: `tests/food-delivery-event-adapter.test.js`.

Suggested code scope / 建议代码范围:

- Add a small Food Delivery event preset module, likely under `src/lib/simulation/adapters/` or a temporary Food Delivery-local event preset file.
- Keep real mutation in `foodDeliveryStore.addOrderEvent(...)`.
- Add deterministic tests before any random trigger behavior.

Acceptance / 验收:

- Presets cover rider delay, restaurant cancellation, address change, ETA update, and status update.
- Presets can be triggered manually in tests without UI randomness.
- Existing Food Delivery and Chat service-account display tests continue to pass.

Validation / 验证:

- `npm test -- tests\food-delivery-event-adapter.test.js tests\food-delivery-store.test.js tests\food-delivery-view.test.js tests\chat-shopping-preview-routing.test.js`

## 4. P1 Tasks / 第一阶段

### P1.1 Add `simulationStore`

Goal / 目标:

- Persist event logs, cooldown history, daily counters, and future user controls such as Surprise Mode.

Suggested fields / 建议字段:

- `eventLogs`
- `cooldownsByEvent`
- `dailyCounters`
- `settings.surpriseMode`
- `settings.enabledModules`

Acceptance / 验收:

- Store hydrates safely.
- Backup/restore can include simulation data when persistent state is introduced.
- Tests cover normalization, logging, cooldown/cap reads, and restore.

### P1.2 Add Deterministic Random Helper

Goal / 目标:

- Prevent flaky random tests and scattered `Math.random()` calls.

Suggested file / 建议文件:

- `src/lib/simulation/random.js`

Acceptance / 验收:

- Random gates accept injected values or seeded input.
- Tests cover pass/fail boundaries.
- Event engine code does not call `Math.random()` directly.

### P1.3 Add Condition Evaluator

Goal / 目标:

- Evaluate simple event conditions without hardcoding every module rule inside the engine.

Suggested file / 建议文件:

- `src/lib/simulation/condition-evaluator.js`

Acceptance / 验收:

- Supports basic operators such as `eq`, `not_eq`, `in`, `gt`, `gte`, `lt`, `lte`, `exists`.
- Handles missing context safely.
- Tests cover positive, negative, and malformed conditions.

### P1.4 Add Event Engine Library

Goal / 目标:

- Evaluate templates and call adapters through a small interface.

Suggested file / 建议文件:

- `src/lib/simulation/event-engine.js`

Acceptance / 验收:

- Engine can evaluate explicit template + context + trigger source.
- Engine separates eligibility from side effects.
- Engine writes an event execution result that can feed `simulationStore`.

## 5. P2 Cross-Module Event Tracks / 第二阶段跨模块事件

### P2.1 Shopping And Logistics Events

Candidate events:

- Store new-arrival push.
- Discount expiring soon.
- Package shipped.
- Package arrived.
- Pickup point changed.
- International logistics delay.

Ownership:

- Shopping owns products/orders/promotions.
- Logistics service accounts display delivery status.
- Calendar owns reminders.
- Map may provide delivery/pickup location context.

### P2.2 Food Delivery Events

Candidate events:

- Rider delayed.
- Restaurant cancelled.
- Restaurant substitutes unavailable item.
- ETA changed.
- Rider arrived downstairs.
- Address clarification requested.
- Order completed and Wallet expense suggestion created.
- Shared meal with a selected contact recorded as a low-impact relationship memory.

Ownership:

- Food Delivery owns orders and order events.
- Chat displays service-account pushes.
- Map provides ETA/address context.
- Wallet only receives downstream expense suggestions.

### P2.6 Relationship Fact Adapters

Status:

- DONE for the first expanded safe adapter batch on 2026-05-17.

Landed:

- Shared adapter seam: `src/lib/relationship-fact-adapters.js`.
- Shopping gift facts: completed gift orders can create `gift_purchased` relationship facts when written to Wallet.
- Food Delivery shared-meal facts: delivered orders can create `shared_meal` relationship facts when the user selects a contact and writes the expense to Wallet.
- Phone call facts: completed and missed calls can create low-impact relationship facts when the user binds the call to an existing Chat contact.
- Map shared-route facts: arrived trips can create low-impact shared-route facts when the user selects a companion.
- Wallet transfer/expense facts: manual virtual transfers can create low-impact wallet interaction facts when the user binds the transfer to an existing Chat contact.
- Runtime dedupe: `relationshipRuntimeStore.findEventBySource(sourceModule, sourceId)` prevents duplicate value changes from repeated imports.

Acceptance already covered:

- Shopping and Food Delivery keep ownership of orders.
- Wallet keeps ownership of ledger records.
- Relationship runtime receives compact facts only.
- Contacts and Chat can later read the resulting relationship snapshot.
- Tests cover adapters and page-level behavior.

Next candidates:

- Calendar scheduled-date / anniversary / missed-plan relationship facts.
- Gallery shared-photo / people-album / trip-memory relationship facts.
- Assets property / vehicle / special-item relationship facts.
- World Hub relationship-event filtering/detail view if pending/applied/dismissed lists become noisy.

### P2.7 World Hub Relationship Runtime Review

Status:

- PARTIAL_DONE on 2026-05-17 for review plus narrow pending-event controls.

Landed:

- World Hub now reads relationship runtime status without mutating it.
- The panel shows relationship entity count, relationship event count, pending effects, runtime enabled state, top snapshots, and recent facts.
- Pending relationship events can be applied or dismissed from World Hub.
- Tests confirm mounting World Hub does not create relationship events, and explicit buttons are required for apply/dismiss.

Remaining:

- Keep direct value editing for affinity, money, unlocks, and task state behind a later explicit optional World Hub design.
- Add filtering/detail controls if the relationship event list becomes difficult for PM/QA to review.

### P2.3 Phone And Chat Events

Candidate events:

- Missed call.
- Callback reminder.
- Service-account proactive notice.
- Relationship-relevant role event.

Ownership:

- Phone owns call logs.
- Calendar owns callback reminders.
- Chat owns conversations and service-account display.

### P2.4 Map Events

Candidate events:

- Traffic delay.
- Weather affects route.
- Nearby restaurant recommendation.
- Area memory or recurring place cue.
- Ride-hailing ETA update.

Ownership:

- Map owns route/location/ETA/trip context.
- Food Delivery, Shopping logistics, and Assets consume relevant context.

### P2.5 Gallery And Memory Events

Candidate events:

- Memory collection suggestion.
- People/place/trip recap.
- Wallpaper suggestion from Gallery.
- Anniversary or seasonal album cue.

Ownership:

- Gallery owns albums, image sources, and memory collections.
- Appearance consumes wallpapers.
- Chat may display shared media context only when user sends or confirms it.

### P2.6 Assets Events

Candidate events:

- Property maintenance reminder.
- Vehicle service/insurance reminder.
- Investment price alert handoff.
- Special asset provenance or location cue.

Ownership:

- Assets owns asset records.
- Stock may provide market context.
- Calendar owns scheduled reminders.
- Map provides location context.

## 6. Deferred / 暂缓

Do not start these until the event foundation is stable:

- Full XState migration.
- Full Canvas/WebGL game engine.
- Multiplayer or realtime server coordination.
- AI directly mutating store state.
- Random destructive events.
- A visible standalone Event/Simulation app on Home.
- Deep economy simulation across Wallet, Stock, Shopping, and Assets without user controls.

## 7. Recommended Next Action / 下一步建议

Recommended next sequence:

1. Keep this event-specialist documentation set as the current baseline.
2. Start `P1.1 simulationStore` with event logs, cooldown history, and settings.
3. Then add deterministic random and condition-evaluator helpers.
4. Only after those are tested, enable low-frequency random Food Delivery events.

Practical next code slice:

- Build `simulationStore` first. It is the next seam needed before cooldowns, daily caps, event logs, and Surprise Mode can become real.

Alternative same-size slice:

- Build `src/lib/simulation/random.js` and `src/lib/simulation/condition-evaluator.js` first if the team wants pure foundation code before module presets.

## 8. 2026-05-16 Foundation Landing Update / 2026-05-16 Event Foundation Landing

Status:

- `P1.1 simulationStore` is DONE.
- `P1.2 deterministic random helper` is DONE.
- `P1.3 condition evaluator` is DONE.
- `P1.4 event engine library` is DONE.
- Food Delivery presets now have a real shared-engine runner: `runFoodDeliveryOrderEventPreset(...)`.
- Settings backup/import/rollback and storage diagnostics now include `store:simulation`.

Landed files:

- `src/stores/simulation.js`
- `src/lib/simulation/random.js`
- `src/lib/simulation/condition-evaluator.js`
- `src/lib/simulation/event-engine.js`
- `src/lib/simulation/adapters/food-delivery-events.js`

Validation:

- `npm test -- tests\simulation-store.test.js tests\simulation-random.test.js tests\simulation-condition-evaluator.test.js tests\simulation-event-engine.test.js tests\food-delivery-event-adapter.test.js tests\food-delivery-store.test.js`

Next recommended code slice:

- `P1.5 Wire Low-Frequency Food Delivery Random Pilot`.
- Start with active-order ETA update or rider delay because they are reversible and non-destructive.
- Use `runFoodDeliveryOrderEventPreset(...)` and keep real mutation in `foodDeliveryStore.addOrderEvent(...)`.
- Respect `simulationStore` cooldowns, daily caps, and module enable flags.
- Do not auto-fire restaurant cancellation or other negative events until user-visible explanation and dismissal rules are designed.

Alternative same-size slice:

- Add Shopping/logistics event presets and keep them manual/test-only until the Food Delivery pilot proves stable.

## 9. WorldBook-Aware Event Variant Standard / WorldBook World-Aware Event Variant Standard

Status:

- DONE as a standard requirement on 2026-05-16.
- Source of truth: `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.

Decision:

- Event runtime should be local by default.
- API calls should generate or refresh event variant packs, not run on every random trigger.
- WorldBook bindings should resolve into compact `worldContext`, then select local `eventVariantPack`.
- All future module adapters should reuse the shared event engine and variant-pack standard.

Next recommended code slice after Food Delivery random pilot:

- Add a deterministic `worldContext` resolver from active WorldBook bindings.
- Add built-in `daily`, `sci_fi`, and `apocalypse` event variants for Food Delivery ETA update/rider delay.
- Extend event logs with `worldContextId`, `variantPackId`, and `variantId`.

## 10. 2026-05-16 Food Delivery Random Pilot And World Variants

Status:

- `P1.5 Wire Low-Frequency Food Delivery Random Pilot` is DONE.
- `Phase B: World Context Resolver` is DONE as a deterministic local baseline.
- `Phase C: Built-in Food Delivery variant packs` is PARTIAL_DONE for ETA update and rider delay only.
- `Phase D: Food Delivery Pilot` is PARTIAL_DONE: safe/non-destructive events are wired; cancellation remains manual-only.

Landed code:

- `runFoodDeliveryRandomOrderEventPilot(...)` chooses only safe Food Delivery presets: ETA update and rider delay.
- The pilot checks active orders, module enable flags, pilot-level cooldown, pilot-level daily cap, and event-level cooldown/cap before mutation.
- `FoodDeliveryView.vue` exposes a small manual trigger for order-card testing/demo; it still calls the shared pilot instead of writing order events directly.
- `src/lib/simulation/world-context.js` resolves compact local `worldContext` from global WorldBook/worldview text and enabled knowledge points.
- `src/lib/simulation/event-variants.js` selects and renders local event variants without API calls.
- Food Delivery now ships built-in `daily`, `sci_fi`, and `apocalypse` variants for ETA update and rider delay.
- Simulation event logs now preserve `variantId`, `variantPackId`, `worldContextId`, and `activeWorldBookIds`.

Validation:

- `npm test -- tests\simulation-world-context.test.js tests\simulation-event-variants.test.js tests\simulation-store.test.js tests\simulation-event-engine.test.js tests\food-delivery-event-adapter.test.js tests\food-delivery-view.test.js`

Safety notes:

- Runtime random/event execution remains local by default and does not call API.
- Random destructive events are still deferred.
- Food Delivery remains the owner of restaurant/order/event mutation.
- WorldBook raw text is not copied into event logs; logs keep only compact ids.

Next recommended code slice:

- Add Shopping/logistics event presets through the same adapter seam, starting manual/test-only.
- Good first events: package shipped, package arrived, pickup point changed, international delay.
- Keep Logistics service accounts as the Chat display surface and Shopping as the owner of shopping orders.

Alternative same-size slice:

- Add a scheduled/session-level event tick helper that calls existing pilots at low frequency.
- It should respect Surprise Mode and module enable flags before any adapter runs.

## 11. 2026-05-16 Shopping Logistics Event Presets

Status:

- `P2.1 Shopping And Logistics Events` is PARTIAL_DONE.
- Shopping/logistics now reuses the shared event-engine adapter seam instead of adding page-local logistics mutations.
- Runtime random execution remains intentionally OFF for Shopping/logistics; presets are manual/condition only until scheduling and user-facing explanation rules are designed.

Landed code:

- `src/stores/shopping.js` now persists order-level logistics events through `order.events`.
- `shoppingStore.addOrderEvent(orderId, eventInput)` is the single Shopping-owned mutation entry for logistics event records.
- `src/lib/simulation/adapters/shopping-logistics-events.js` defines reusable presets for:
  - package shipped
  - package arrived
  - pickup point changed
  - international logistics delay
- `runShoppingLogisticsEventPreset(...)` runs those presets through `runEventAdapter(...)`, so cooldowns, daily caps, skipped logs, failed logs, and future world-aware metadata can remain shared.
- `ShoppingView.vue` displays the latest logistics event inside the Shopping logistics panel.
- `ChatView.vue` displays the same latest event inside dedicated Logistics service-account context.

Ownership notes:

- Shopping owns order state and logistics event records.
- Chat Logistics service accounts only read and route; they do not mutate Shopping orders.
- Calendar still owns reminder confirmation/dismissal.
- Map is still read-only future context for delivery address, pickup point, and route/ETA.
- No Shopping random logistics event fires at runtime yet.

Validation:

- `npm test -- tests\shopping-store.test.js tests\shopping-logistics-event-adapter.test.js tests\shopping-view.test.js tests\chat-shopping-preview-routing.test.js tests\simulation-event-engine.test.js tests\simulation-store.test.js`

Next recommended code slice:

- Add a session/scheduled event tick helper that calls existing pilots at low frequency.
- The tick helper should respect Surprise Mode, module enable flags, cooldowns, and daily caps before invoking any adapter.
- Initial enabled runtime pilot should remain Food Delivery ETA/rider-delay only.
- Shopping/logistics should stay manual/condition-only until product rules define how surprise logistics notices are explained and dismissed.

Alternative same-size slice:

- Add a Map read-only delivery-address handoff for Shopping logistics events, starting with pickup point/location hints from `order.events`.

## 12. 2026-05-16 Session Event Tick Helper

Status:

- `P1.6 Session/Scheduled Event Tick Helper` is PARTIAL_DONE.
- The shared tick helper exists as a deterministic, testable library.
- It is not yet wired into app lifecycle, router hooks, foreground timers, or UI controls.

Landed code:

- `src/lib/simulation/event-tick-runner.js`
- `tests/simulation-event-tick-runner.test.js`

Runtime policy:

- The tick helper checks Surprise Mode before any pilot runs.
- It checks tick-level cooldown and daily cap before calling pilots.
- It currently calls only the safe Food Delivery random pilot.
- Shopping/logistics random execution remains disabled.
- If a pilot is skipped, the tick does not mark its own cooldown as triggered.

Validation:

- `npm test -- tests\simulation-event-tick-runner.test.js tests\food-delivery-event-adapter.test.js tests\simulation-store.test.js tests\simulation-event-engine.test.js`

Next recommended code slice:

- Wire the tick helper into one explicit, low-risk lifecycle caller.
- Preferred first caller: a manual/developer-only Settings or Diagnostics action, not automatic background execution.
- After that, consider a guarded app-session foreground tick with a long interval and clear user-facing explanation.

Alternative same-size slice:

- Add read-only Map handoff for Food Delivery and Shopping logistics event locations before enabling automatic session ticks.

## 13. 2026-05-17 Manual Tick Diagnostics Entry

Status:

- `P1.7 Manual Diagnostics Caller For Event Tick` is DONE.
- The event tick helper now has one explicit manual caller in Settings > About diagnostics.
- Automatic app lifecycle/background execution remains OFF.

Landed code:

- `SettingsView.vue` calls `runSimulationEventTick(...)` from a manual diagnostics action.
- `SettingsStorageDiagnosticsSection.vue` displays an Event Tick Diagnostics card.
- `NetworkView.vue` can filter reports by `simulation`.
- `network-report-labels.js` labels `simulation`, `run_event_tick`, `SIMULATION_TICK_TRIGGERED`, and `SIMULATION_TICK_SKIPPED`.
- `settings-general-section.test.js` covers the manual UI path.

Runtime policy:

- Manual diagnostics uses the same guarded tick helper as future automatic execution.
- Current allowed pilot remains Food Delivery ETA/rider-delay only.
- Shopping/logistics random execution remains disabled.
- The action writes a simulation report for auditability.

Validation:

- `npm test -- tests\settings-general-section.test.js tests\simulation-event-tick-runner.test.js tests\food-delivery-event-adapter.test.js`

Next recommended code slice:

- Add a user-facing explanation surface for event logs before enabling automatic foreground ticks.
- Good first surface: Settings/About recent simulation report summary, or a small Simulation/Event Log readonly panel.

Alternative same-size slice:

- Add Map read-only handoff for delivery event locations, using Food Delivery address/ETA and Shopping logistics pickup/location hints.

## 14. 2026-05-17 Readonly Event Log Explanation Surface

Status:

- `P1.8 Readonly Event Log Explanation Surface` is DONE.
- Settings > About diagnostics now includes a readonly recent event-log panel.
- Automatic app lifecycle/background execution remains OFF.

Landed code:

- `SettingsView.vue` maps compact simulation logs into human-readable labels for event, module, trigger source, status, reason, target, and world variant metadata.
- `SettingsStorageDiagnosticsSection.vue` displays the latest simulation logs without mutating module data.
- `settings-general-section.test.js` verifies that a manual tick writes visible explanation rows after a safe Food Delivery event triggers.

Why this came before automatic ticks:

- Random/condition events need an explanation surface before they can safely become immersive background behavior.
- The panel gives non-technical users a plain-language reason while preserving raw ids for developers and AI assistants.
- It confirms that event logs can serve as the shared audit trail for Food Delivery, Shopping/logistics, and future adapters.

Validation:

- `npm test -- tests\settings-general-section.test.js tests\simulation-event-tick-runner.test.js tests\food-delivery-event-adapter.test.js`

Next recommended code slice:

- Add a guarded foreground-session tick caller with a long interval, still limited to the Food Delivery ETA/rider-delay safe-list.
- The caller should run only when Surprise Mode is not off, should reuse `runSimulationEventTick(...)`, and should not add any Shopping/logistics random execution yet.

Alternative same-size slice:

- Add Map read-only handoff for Food Delivery and Shopping logistics event locations before automatic ticks.

## 15. 2026-05-17 Foreground Session Tick Controller Foundation

Status:

- `P1.9 Foreground Session Tick Controller Foundation` is DONE.
- The project now has a guarded foreground-session tick controller library.
- It is not yet connected to app lifecycle or route hooks.

Landed code:

- `src/lib/simulation/foreground-session-tick.js`
- `tests/simulation-foreground-session-tick.test.js`
- `resolveTickRandomValue(...)` in `event-tick-runner.js` now supports deterministic seed/time values instead of requiring hardcoded random values.

Runtime policy:

- Default foreground interval is 10 minutes.
- Minimum interval is 1 minute, so future callers cannot accidentally create high-frequency random loops.
- The controller can start, stop, execute once, and report current state.
- It delegates actual event execution to `runSimulationEventTick(...)`; it does not own Food Delivery, Shopping, or any module state.

Validation:

- `npm test -- tests\simulation-foreground-session-tick.test.js tests\simulation-event-tick-runner.test.js`

Next recommended code slice:

- Wire this controller into a guarded app-session caller only after deciding the exact user-facing control location.
- Recommended control location: Settings > Automation or Settings > About diagnostics, with Surprise Mode copy and an explicit enabled state.

Alternative same-size slice:

- Add Map read-only handoff for Food Delivery and Shopping logistics event locations before turning on automatic foreground ticks.

## 16. 2026-05-17 Map Readonly Delivery Event Handoff

Status:

- `P2.4 Map Readonly Delivery Event Handoff` is PARTIAL_DONE.
- Map can now build readonly location/ETA context from Food Delivery order events and Shopping logistics events.
- This does not start a trip and does not move order ownership into Map.

Landed code:

- `mapStore.buildDeliveryEventMapHandoff(...)`
- Tests in `tests/map-trip-baseline.test.js` for Food Delivery event handoff and Shopping logistics event handoff.

Ownership:

- Food Delivery still owns restaurant/order/event mutation.
- Shopping still owns shopping orders and logistics event records.
- Map only provides `delivery_location_context` summaries such as pickup point, dropoff point, ETA, carrier/tracking hints, and source metadata.

Validation:

- `npm test -- tests\map-trip-baseline.test.js`

Next recommended code slice:

- Decide whether to expose this Map handoff visually inside Food Delivery/Shopping logistics cards or keep it store-only until the visual rebuild.
- If exposed now, keep it as read-only "View route context" and do not create Map trips automatically.

Alternative same-size slice:

- Wire the foreground-session tick controller into an explicit Settings control after the user-facing control location is chosen.

## 17. 2026-05-17 Optional Runtime Control / World Hub App Baseline

Status:

- `Runtime Control / World Hub App optional entry baseline` is DONE.
- The event system remains reusable across modules, but the user-facing control surface is optional.

Product decision:

- Runtime control is exposed as the World Hub app (`app_control_center`, `/control-center`) only when the More toggle `control_center` is enabled.
- When disabled, Home hides the World Hub entry and normal module flows continue unchanged.
- Data intake remains immersive and distributed: roles, assets, map places, shopping products, food delivery restaurants, and other records should still be created inside their owning modules.
- World Hub is for orchestration, review, override, and future game-like controls such as event frequency, logs, affinity, funds, unlocks, and task state.
- Product decision reference: `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`.

Landed code:

- `src/views/ControlCenterView.vue`
- `src/router/index.js`
- `src/stores/system.js`
- `src/lib/planned-module-registry.js`
- `src/lib/home-entry-registry.js`
- `src/lib/app-icon-presentation.js`
- `src/views/HomeView.vue`
- `src/views/MoreView.vue`

Validation target:

- `npm test -- tests\system-widget-import.test.js tests\home-folder-entry.test.js tests\more-toggle-ui-consumption.test.js tests\app-icon-presentation.test.js tests\planned-module-registry.test.js`

Next recommended code slice:

- Connect the World Hub placeholder to read-only `simulationStore` data first.
- Suggested first read-only fields: event mode, event-log count, recent triggered events, adapter enablement status, and world-variant pack status.
- Do not add mutation controls until the read-only boundary is verified.

## 18. 2026-05-17 World Hub Readonly Simulation Runtime Panel

Status:

- `P1.10 World Hub Readonly Simulation Runtime Panel` is DONE.
- `/control-center` now provides a read-only runtime panel backed by `simulationStore`.
- The panel does not trigger events and does not mutate module-owned data.

Landed code:

- `src/views/ControlCenterView.vue`
- `tests/control-center-view.test.js`

Runtime coverage:

- Displays Surprise Mode, event-log count, active cooldown count, and recent triggered/skipped/failed counts.
- Displays module event enablement for Food Delivery, Shopping/logistics, Map, Chat, Calendar, Wallet, and Assets.
- Displays recent event logs with event/module/source/status/reason/target/world-variant metadata.
- Displays world-context and event-variant metadata without copying raw WorldBook text.

Validation:

- `npm test -- tests\control-center-view.test.js`

Next recommended code slice:

- Add an explicit user-facing foreground-session tick control location before automatic runtime execution is enabled.
- Preferred location: Settings > Automation, because it is a real settings surface and can explain Surprise Mode clearly.
- Keep automatic runtime execution limited to the existing Food Delivery ETA/rider-delay safe-list.

Alternative same-size slice:

- Expose the existing Map read-only delivery event handoff from Food Delivery/Shopping cards as "View route context", without auto-starting Map trips.

## 19. 2026-05-17 Settings Foreground Tick Control Baseline

Status:

- `P1.11 Settings Foreground Tick Control Baseline` is DONE.
- Settings > Automation now has an explicit Foreground event tick control.
- This is a persisted control baseline only; app lifecycle automatic execution is still not connected.

Landed code:

- `simulationStore.settings.foregroundSessionTickEnabled`
- `simulationStore.settings.foregroundSessionTickIntervalMs`
- `SettingsAutomationSection.vue` foreground event tick controls
- `SettingsView.vue` save/normalization handlers

Safety policy:

- Toggling this setting does not run an event immediately.
- The minimum interval is clamped to 1 minute.
- The first future automatic runtime path must remain limited to Food Delivery ETA/rider-delay safe-list events.

Validation:

- `npm test -- tests\simulation-store.test.js tests\settings-general-section.test.js tests\simulation-foreground-session-tick.test.js`

Next recommended code slice:

- Wire the foreground-session tick controller into `App.vue` lifecycle only when `simulationStore.settings.foregroundSessionTickEnabled === true`.
- Use a visibility guard, reuse the persisted interval, and write system reports for triggered/skipped ticks.
- Keep automatic execution off by default.

Alternative same-size slice:

- Expose the existing Map read-only delivery event handoff in Food Delivery/Shopping UI before automatic foreground ticks.

## 20. 2026-05-17 App Lifecycle Foreground Tick Wiring

Status:

- `P1.12 App Lifecycle Foreground Tick Wiring` is DONE.
- The foreground-session event tick can now run from `App.vue`, but only when the persisted Settings > Automation switch is enabled.
- Automatic runtime execution remains off by default.

Landed code:

- `src/lib/simulation/foreground-session-tick-lifecycle.js`
- `src/App.vue`
- `src/lib/network-report-labels.js`
- `tests/simulation-foreground-session-tick-lifecycle.test.js`
- `tests/network-guidance.test.js`

Runtime safety rules:

- The lifecycle does not start unless `simulationStore.settings.foregroundSessionTickEnabled === true`.
- The lifecycle stops or refuses to start when the phone is locked, the route is `/lock`, or the document is hidden.
- The interval is read from `foregroundSessionTickIntervalMs` and clamped through the shared foreground tick minimum.
- Triggered/skipped results write `simulation/foreground_event_tick` diagnostics reports so PM/QA can audit what happened.
- The underlying tick remains limited to the existing Food Delivery ETA/rider-delay safe-list path.

Product meaning:

- This is the first real bridge from the optional event system into normal app runtime.
- The bridge is still user-controlled and low-risk: no automatic events happen for users who do not enable the Settings switch.
- World Hub remains a read-only observation surface for now; it does not trigger or mutate events.

Validation:

- `npm test -- tests\simulation-foreground-session-tick-lifecycle.test.js tests\network-guidance.test.js`

Next recommended code slice:

- Expose the existing Map read-only delivery event handoff in Food Delivery/Shopping cards as a non-mutating "View route context" action.
- This keeps the next step product-visible while preserving ownership: orders stay in Food Delivery/Shopping, Map only explains route/location context.

Alternative same-size slice:

- Add Wallet expense suggestions from completed Shopping/Food Delivery orders, keeping Wallet as downstream ledger only.

---

## 21. 2026-05-17 Delivery Route Context UI Handoff

Status:

- `P1.13 Delivery Route Context UI Handoff` is DONE.
- Food Delivery order-event cards now show read-only Map route context.
- Shopping logistics cards now show the same read-only Map route context when a real logistics event exists.

Landed code:

- `src/components/map/DeliveryRouteContextCard.vue`
- `src/views/FoodDeliveryView.vue`
- `src/views/ShoppingView.vue`
- `tests/food-delivery-view.test.js`
- `tests/shopping-view.test.js`

Runtime and ownership rules:

- Rendering the card does not start a Map trip.
- Rendering the card does not write Map trip history.
- Food Delivery and Shopping still own their orders and events.
- Map only explains pickup/dropoff, ETA, route summary, carrier, and tracking context.

Product meaning:

- Delivery events now feel less like isolated backend logs and more like visible mobile-app logistics context.
- The same shared card can later be reused in Chat service-account pushes or Map drawers.
- This is still a functional handoff baseline, not a final visual rebuild.

Validation:

- `npm test -- tests\food-delivery-view.test.js tests\shopping-view.test.js tests\map-trip-baseline.test.js`

Next recommended code slice:

- Add Wallet expense suggestions from completed Shopping/Food Delivery orders, still requiring explicit user confirmation before Wallet writes.

Alternative same-size slice:

- Add Chat service-account delivery/logistics push cards that reference the same order/event ids without owning fulfillment.

---

## 22. 2026-05-17 Wallet Completed-Order Expense Suggestions

Status:

- `P2 downstream Wallet ledger loop` is DONE for completed Shopping orders and delivered Food Delivery orders.
- Wallet remains a downstream ledger and does not own Shopping or Food Delivery orders.

Landed behavior:

- Shopping Wallet suggestions now appear only after a Shopping order is completed.
- Food Delivery Wallet suggestions now appear only after a Food Delivery order is marked delivered.
- Writing an expense to Wallet requires an explicit user click.
- Wallet source filters now separate `Orders` from `Manual` and `Chat`.
- Contacts relationship ledger summaries can distinguish order-origin ledger records from manual and Chat-origin records.

Validation:

- `npm test -- tests\wallet-store.test.js tests\contacts-wallet-ledger-context.test.js tests\shopping-view.test.js tests\food-delivery-view.test.js`

Product meaning:

- Shopping and Food Delivery can now feed life-simulation spending records into Wallet without moving order ownership.
- These records are suitable future facts for relationship/growth adapters, for example gifts, shared meals, repayments, or expense-related tension.

Next recommended code slice:

- Start the Relationship Growth Event System baseline documented in `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`.
- Build the relationship runtime store/truth-layer slice before adding automatic affinity or stage changes.

Alternative same-size slice:

- Add Chat service-account delivery/logistics push cards using existing order/event ids and the same ownership boundaries.

---

## 23. 2026-05-17 Relationship Runtime Baseline

Status:

- `P1 relationship/growth runtime baseline` is DONE for the shared store, backup support, Contacts read-only display, and Chat prompt context.
- Automatic romance/conflict progression is still intentionally deferred.

Landed behavior:

- Added `src/stores/relationshipRuntime.js` as the shared relationship/growth truth layer.
- Relationship runtime can store role/contact entities, affinity/trust/intimacy/tension/dependency metrics, relationship stage, milestones, growth traits, event history, and pending major effects.
- Low-impact facts can apply locally; high-impact or explicitly risky facts remain `pending_confirmation`.
- Contacts now shows a read-only relationship snapshot for role profiles.
- Chat prompt assembly now includes compact relationship runtime context for role conversations.
- Settings backup/import rollback and storage diagnostics include `store:relationship-runtime`.

Validation:

- `npm test -- tests\relationship-runtime-store.test.js tests\contacts-wallet-ledger-context.test.js tests\chat-worldbook-binding-visibility.test.js`

Product meaning:

- The project now has a reusable relationship-growth foundation that can serve Chat, Contacts, Map, Shopping, Food Delivery, Wallet, Phone, Calendar, Gallery, Assets, and future World Hub controls.
- This does not limit user freedom. It stores continuity so the virtual phone world can feel more alive.

Next recommended code slice:

- Add the first safe fact adapter: Wallet/Shopping gift or shared-expense facts into `relationshipRuntimeStore.recordRelationshipFact(...)`.
- Keep all writes explicit, low-impact, and test-covered.

Alternative same-size slice:

- Add a World Hub read-only panel showing relationship runtime status and pending relationship events, without enabling direct value editing yet.

---

## 24. 2026-05-17 Expanded Relationship Fact Adapter Batch

Status:

- `P2.6 Relationship Fact Adapters` is DONE for the first expanded safe adapter batch.
- `P2.7 World Hub Relationship Runtime Review` is PARTIAL_DONE with narrow pending-event controls.

Landed behavior:

- Phone can record completed-call and missed-call relationship facts when the user binds the call to an existing Chat contact.
- Map can record shared-route relationship facts when the user selects a companion and acknowledges an arrived trip.
- Wallet can record transfer/shared-expense relationship facts when the user binds a manual virtual transfer to an existing Chat contact.
- World Hub can apply or dismiss `pending_confirmation` relationship events.
- Direct value editing, funds editing, unlock editing, and hidden romance/conflict automation remain deferred.

Ownership:

- Phone owns call logs and missed-call notifications.
- Map owns trips, route state, and trip history.
- Wallet owns ledger records.
- Relationship runtime owns only compact relationship facts and snapshots.
- World Hub only reviews pending effects; it does not become the data-entry surface for normal module records.

Validation:

- `npm test -- tests\relationship-fact-adapters.test.js tests\relationship-runtime-store.test.js tests\phone-store.test.js tests\phone-view.test.js tests\wallet-store.test.js tests\wallet-view.test.js tests\map-view-information-architecture.test.js tests\control-center-view.test.js`

Product meaning:

- More ordinary phone-life actions can now become relationship continuity: calls, missed calls, shared routes, and money interactions.
- These memories are explicit and low-impact by default, so they support immersion without restricting user freedom.
- Chat and Contacts can read these facts through the existing relationship runtime context.

Next recommended code slice:

- Start the Calendar / Reminders split before adding Calendar relationship facts.
- Tighten relationship-memory dedupe/merge rules before adding new media-driven memory inputs.

Alternative same-size slice:

- Add Assets relationship facts for home/property, vehicle, investment pressure, and special-item ownership memories.

---

## 25. 2026-05-17 Calendar / Reminders Split For Event And Task Cues

Status:

- `P2.8 Calendar / Reminders product boundary` is DOCUMENTED.
- Product decision: `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`.
- Module naming table: `docs/pm/MODULE_NAME_GLOSSARY.md`.

Product meaning:

- Calendar should be the real schedule/date app: plans, dates, anniversaries, recurring events, and confirmed timed items.
- Reminders should be the user-facing action queue: callbacks, package follow-ups, Food Delivery updates, Stock review cues, Map place follow-ups, and world/task objectives.
- World Hub remains optional runtime control. It can review/override event systems later, but normal reminder management should not require World Hub.

Event-system rule:

- Raw generated cues should enter Reminders first.
- Only user-confirmed, date/time-bearing items should become Calendar events.
- Relationship runtime should not treat every raw cue as a relationship memory.
- World-aware task packs may surface actionable objectives through Reminders while World Hub keeps advanced controls optional.

Recommended next:

- Add a non-breaking `Reminders / 提醒事项` code seam before moving existing Calendar cue arrays.
- Defer Calendar relationship facts until Calendar owns only true schedule/date facts.
- Defer Gallery relationship facts until image sources become naturally produced and low-friction; prioritize text/event-first memory dedupe if Calendar split needs more planning.
