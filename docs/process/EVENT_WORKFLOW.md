# SchatPhone Event Workflow

Updated: 2026-08-10

This document defines the `事件专项` workflow.

Use it when the team is designing or implementing:

- random triggers;
- condition-driven interactions;
- simulated life events;
- module event presets;
- event logs;
- surprise-mode behavior;
- cross-module event handoff;
- host-embedded event cards and optional Map coordinate anchors;
- World Hub runtime review behavior tied to the event engine.

This workflow is separate from:

- the visual workflow;
- ordinary feature-progress work;
- long-range portfolio planning.

## 1. Trigger Phrase

Use this phrase to enter the event workflow:

```text
事件专项
```

Recommended variants:

```text
事件专项：先搭架构，不改代码
事件专项：推进外卖事件预设
事件专项：做随机触发基座
事件专项：只做事件 TODO 和接口设计
事件专项：开始实现 simulation store
```

When this phrase appears, treat the task as event-system work, not as visual polish or a one-off feature patch.

## 2. Scope Boundary

`事件专项` may change files that define, evaluate, trigger, record, or display simulated events:

- event architecture docs:
  - `docs/architecture/SIMULATION_EVENT_ENGINE.md`
  - `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`
  - `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`
- frozen event reference docs:
  - `docs/overview/IMMERSIVE_EVENT_TODO.md`
- live event handoff docs:
  - `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
  - `docs/process/EVENT_WORKFLOW.md`
- future event library:
  - `src/lib/simulation/*`
- future simulation store:
  - `src/stores/simulation.js`
- module event adapters, for example:
  - `src/lib/simulation/adapters/food-delivery-events.js`
- domain stores only through owned actions;
- module views only when they need to display event outcomes;
- pure Event Surface Projection and registered-host contracts in `src/lib/simulation/event-surface-projection.js` and `src/lib/simulation/event-surface-host-registry.js`;
- tests for deterministic selection, cooldowns, adapters, persistence, and user-visible surfaces.

`事件专项` should avoid:

- large visual restyling unless event display needs a small UI-support change;
- moving domain ownership into a global event engine;
- creating a visible Home app named Files/Event/Simulation unless product explicitly decides it;
- silent random mutation of important user data without explanation or undo/review path;
- calling AI directly to mutate state in the first implementation phase;
- replacing ordinary module actions with a game engine before the product truly needs game-loop behavior.

If an event change needs visual work, first decide visual ownership through `docs/process/VISUAL_WORKFLOW.md`.

## 3. Default Working Rules

1. Preserve module ownership. Events orchestrate; domain modules still own their own state.
2. Every event must name:
   - trigger source;
   - module owner;
   - adapter action;
   - visible surface;
   - side effects;
   - tests.
3. Manual, condition-driven, random, scheduled, and AI-assisted events should share one event-template shape.
4. Random events must have cooldowns, daily caps, user controls, and deterministic test paths.
5. Important or negative events must be explainable to the user and dismissible or reviewable where appropriate.
6. Chat and notifications are display surfaces unless the event explicitly belongs to Chat.
7. Map may provide location, ETA, distance, and route context, but should not own another module's order or payment lifecycle.
8. Wallet, Calendar, Gallery, Files, and Assets should remain downstream consumers unless their own module action creates the event.
9. AI may enrich copy or suggest event candidates later, but should not become the first source of state mutation.
10. Store persistence, backup/restore, and migration safety must be considered before closing an event slice.
11. Tests must avoid flaky randomness. Use fixed seeds or injected random values.
12. Event logs should be readable by future AI assistants, not only rendered to users.
13. World-aware events must follow `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.
14. Runtime event triggers should use local event variant packs by default. API calls may generate/refresh packs or optionally materialize bounded text after an approved explicit event-entry/presentation checkpoint, but never run for every random event, Tick, distance update, place focus, eligibility check, or compact invitation.
15. World Hub review should keep event-log explanations read-only and inspectable by module, status, trigger source, reason, adapter boundary, target, and world variant context.
16. Relationship event gating must consume saved role-profile classification fields (`primaryRelationshipCategoryId`, `relationshipModifierIds`, and classification audit metadata), not raw `relationshipLabelText` or `relationshipLabelNote`.
17. Low-risk relationship facts may attach classification gate metadata as soft-reference audit context and still allow the fact. High-risk hard-gate behavior must remain explicit, testable, and review/confirmation-oriented before any high-impact automation is enabled.
18. Future high-risk relationship event packs should consume named gate presets from `src/lib/relationship-event-gating.js` instead of duplicating hard-gate rule objects in module adapters.
19. Generated Chat social events such as role-initiated greetings, refusal, blocks, restores, and unblocks must use the explicit event-runtime review/audit seam before mutating Chat channel state. Low-risk greetings may auto-apply with audit; high-risk communication changes must stay review-first in World Hub. World Hub should explain proposal source, trigger policy, and the rule that Chat owns final communication reachability while Contacts and Relationship Runtime stay separate.
20. Event Surface Projections are bounded read models, not a second event store or an authorization token. A host card may expose an explicit expansion command, but every outcome still returns through the owning Module Adapter.
21. Map coordinate anchors are presentation context only. They cannot create places, reveal discoveries, change visibility, move role/journey truth, or invent a fallback position for invalid/stale events.
22. Cross-module event history, pending review, explanations, and event-scoped notes use the existing World Hub hidden entry. Event receives no normal Home app; Cheats keeps separate privileged authority.
23. Location-aware templates keep an authored activation scope. Distance may satisfy or fail that scope, but it never converts an onsite/interior event into a remote event.
24. Map owns place relation, manual-versus-journey position provenance, and place-entry sessions. A place `Enter` action may submit an event checkpoint, but Event Runtime does not own or fabricate presence.
25. Optional event permission, random-event intensity, and presentation mode are separate controls. Disabling optional events cannot remove deterministic schedule, journey, activity, deadline, or safety behavior.
26. The first product content target is the current modern K-pop realism world, but engine templates, place capabilities, instance lifecycle, choice IDs, and effect requests remain world-neutral. Do not build parallel world packs before the first K-pop vertical slice is accepted.
27. V1 runtime AI is optional and text-only. It cannot create executable actions, effect identifiers, unbounded numbers, image/audio payloads, external media URLs, or direct domain writes; accepted normalized text is cached per Event Instance and always has a local fallback.
28. Place/scene imagery primarily follows Map/world asset packs. Event Runtime stores stable references and minimal semantic media intent only. Later CG uses a separately permissioned image-generation/media-resolution Adapter and is not a reason to add V1 provider fields or empty controls.
29. EVE-3 Event Notebook composition must remain a deterministic read model over existing Event Instances, logs, Chat social proposals, and Map Journey proposals. Do not persist a second event projection or use Notebook selection as authorization.
30. Event-scoped notes belong to Simulation durability, carry stable source references, survive bounded log rotation and backup/restore, and change only through explicit note create/update/delete actions. They are not Reminders, Calendar plans, source-owner mutations, or Cheats controls.

## 4. Event Entry Audit

Before changing event code, record or mentally check:

```text
Event name:
Event archetype:
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
Event surface projection: none | host card | host detail | World Hub review | Mini Scene
Map anchor: none | stable place | geographic coordinate | normalized canvas coordinate
Activation scope: none | remote | nearby | onsite | interior | journey_checkpoint | activity_checkpoint
Discoverability: hidden_until_eligible | teaser_when_locked | always_visible
Presence requirement: none | any_valid_presence | journey_arrival_only | explicit_place_entry
Position provenance accepted: manual | journey_arrival | either | not_applicable
Place category and required capabilities:
Expansion target: none | host detail | World Hub | Mini Scene
Event controls: module permission | intensity | presentation | per-session override
Text materialization: local_only | optional_ai_after_entry | not_applicable
Local fallback and instance-cache behavior:
Media intent / authored asset source / future CG eligibility:
Side effects:
Reversibility / dismissal:
Persistence and backup impact:
Tests:
Relationship classification gate: none | soft-reference audit | hard block | hard confirm | hard allow
High-risk gate preset: none | romance_confession | relationship_confirmation | jealous_boundary | world-pack-specific preset
Social/channel state change: none | direct user action | generated pending review | confirmed applied
```

Decision rules:

1. Module state belongs to the module. The event engine calls an adapter; it does not reach into module internals directly.
2. The adapter is the seam. If an event can be implemented through one module action, keep the interface small.
3. The event engine owns eligibility, timing, probability, cooldowns, caps, and event-log records.
4. The module owner owns real state mutation and data normalization.
5. Cross-module surfaces should display event context, not duplicate ownership.
6. A surprising event should still feel fair: the user should understand why it happened and what changed.
7. A place card exposes an event invitation only when an eligible event or approved locked teaser exists; do not reserve an empty permanent Event button.
8. A deterministic scheduled activity remains executable when no event template is eligible or when optional event permission is off.

## 5. Event Template Draft

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

The exact implementation may evolve, but the conceptual interface should stay:

`template -> eligibility -> trigger -> adapter -> event log -> surface display`

## 6. Installed Skills

Use these skills only when that event task needs their guidance:

- `pinia`: Pinia store shape, actions, getters, hydration, persistence patterns.
- `vue-pinia-best-practices`: Vue + Pinia reactivity and store-consumption decisions.
- `unit-test-vue-pinia`: unit tests for stores, components, and composables.
- `playwright-testing`: browser-level event journeys; do not use by default for small store-level slices.
- `game-engine`: only when the task becomes a true game-loop, Canvas/WebGL, collision, sprite, or minigame implementation.
- `improve-codebase-architecture`: seams, adapters, module depth, locality, and leverage.
- `frontend-logic-design`: when the event-facing surface itself has IA or interaction-logic problems.

Current guidance:

- the Simulation Event Engine should start as a Vue/Pinia/library architecture, not a Canvas game engine;
- XState or a full statechart library stays deferred until simple templates and adapters are no longer enough;
- `game-engine` is valuable later for minigames or animated simulation surfaces, but it is not the default event-orchestration foundation.

### 6.1 Skill Invocation Matrix

| Event work part | Skill to load | When to use | Do not use for |
| --- | --- | --- | --- |
| event architecture, seams, adapters, ownership | `improve-codebase-architecture` | designing engine/module seams, deciding state ownership, reviewing locality/leverage before adding an adapter | pure copy edits or already-decided small tests |
| Pinia store foundation | `pinia` + `vue-pinia-best-practices` | adding `simulationStore`, event logs, cooldowns, daily caps, settings, hydration, backup/restore shape, or cross-store reads | static docs or presentational-only UI |
| store/component unit tests | `unit-test-vue-pinia` | writing or revising Vitest tests for stores, adapters, composables, and Vue event surfaces | browser journey tests that need routing/clicking across screens |
| browser-level event journeys | `playwright-testing` | later E2E checks for Home -> Chat -> Food Delivery -> Map -> notification flows | small deterministic engine/store slices; keep those in Vitest first |
| true minigame or game-loop surfaces | `game-engine` | Canvas/WebGL, game loops, sprites, collision, physics, tile maps, or explicit interactive game scenes | ordinary random events, delivery updates, logistics alerts, or notification simulation |
| event-facing UI polish | `frontend-logic-design` first, then visual skills from `docs/process/VISUAL_WORKFLOW.md` if needed | when event surfaces become confusing, visually inconsistent, or require host-surface ownership decisions | core event eligibility, random logic, or store ownership |

Default sequence:

1. architecture question: load `improve-codebase-architecture`;
2. store or persistence question: load `pinia` and `vue-pinia-best-practices`;
3. store/component/adapters tests: load `unit-test-vue-pinia`;
4. cross-screen browser journey: load `playwright-testing`;
5. minigame/game-loop implementation: load `game-engine`;
6. visual/event-surface polish: follow `docs/process/VISUAL_WORKFLOW.md`.

Do not load every installed skill by default.

## 7. Standard Work Sequence

Use this sequence for event work unless the user asks for a narrower path:

1. Read `docs/process/EVENT_WORKFLOW.md`.
2. Read `docs/architecture/SIMULATION_EVENT_ENGINE.md`.
3. If the event depends on WorldBook, worldview, or AI-generated copy, read `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`.
4. For the current default K-pop content lane or any EVE-2A/2B/2C work, read `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`.
5. Check `docs/overview/IMMERSIVE_EVENT_TODO.md` as frozen reference, then check `docs/roadmap/TODO_ROADMAP.md` and the event package `STATUS_AND_HANDOFF.md` for active status.
6. Identify whether the task is:
   - documentation-only;
   - store/library foundation;
   - module adapter;
   - user-facing surface;
   - browser journey;
   - game-loop work.
7. Choose skills from Section 6.1 before editing.
8. Run the event entry audit.
9. Prefer the smallest useful module adapter before broad cross-module orchestration.
10. Roadmap 4.14 EVE-1's pure projection/host-registration contract, EVE-2A frozen contracts/fixtures, EVE-2B reusable runtime, EVE-2C first Map/K-pop vertical slice, and EVE-3 World Hub Event Notebook are landed. Keep projections free of persistence/effect authority, preserve the single Map host and frozen archetype, and keep Notebook notes event-scoped without Reminder/Calendar/Cheats authority. EVE-4 and EVE-5 require separate approval.
11. Add deterministic tests before adding random trigger behavior.
12. Preserve backup/restore and storage diagnostics when new persistent data is introduced.
13. Amend `docs/overview/IMMERSIVE_EVENT_TODO.md` only for frozen-baseline clarification or candidate-history cleanup; do not use it as the live next-task board.
14. If the task becomes active implementation work, update `docs/roadmap/TODO_ROADMAP.md` and the event package `STATUS_AND_HANDOFF.md` without turning this workflow into a second roadmap.
15. Verify with `git diff --check`, then run targeted tests for touched stores/views.

## 8. First Prompt Templates

Start an event session:

```text
事件专项：先读取 docs/process/EVENT_WORKFLOW.md、docs/architecture/SIMULATION_EVENT_ENGINE.md 和 docs/overview/IMMERSIVE_EVENT_TODO.md。本轮只围绕事件系统工作：随机触发、条件触发、事件预设、事件日志、模块适配器或相关测试。请先判断事件归属、触发源、适配器接口、用户可见面和持久化影响，再决定是否改代码。
```

Direct implementation:

```text
事件专项：按既有事件流程直接推进 [模块/事件类型]。保持模块所有权不变，事件引擎只做触发、冷却、概率、日志和适配器调用。随机逻辑必须可测试，不允许产生不可复现的测试。
```

Documentation-only work:

```text
事件专项：只更新事件架构和 TODO，不改功能代码。请同步 docs/process、docs/architecture、docs/overview，并说明下一步代码切片。
```

## 9. Verification

For documentation-only event planning:

```text
git diff --check
```

For event store/library changes:

```text
npm test -- tests/<targeted-store-or-view-test>.test.js
```

For broader event-engine changes:

```text
npm run lint
npm test
npm run build
```

For random-event work, verify:

- fixed-seed or injected-random tests pass reliably;
- cooldown and daily caps are tested;
- event logs persist and restore correctly;
- user-visible surfaces explain the event without exposing implementation labels;
- world-aware events use local variant packs at runtime and do not call an API on every random trigger.
- optional event text generation occurs only after the accepted entry/presentation checkpoint, validates against local allowlists, caches by Event Instance, and proves local fallback/provider failure without live network dependence.
