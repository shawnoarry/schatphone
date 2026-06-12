# Immersive Event TODO

Updated: 2026-06-12

> **Frozen reference / 冻结参考**
>
> This file is not an active TODO, roadmap, or implementation source. Do not start work from this file directly. If an idea here becomes active, first promote the concrete slice into `docs/roadmap/TODO_ROADMAP.md` and the matching task package `STATUS_AND_HANDOFF.md`.

Purpose: this is the frozen event-lane reference board.

It is not a live execution board. Use it to understand the current event/runtime baseline, what is already landed, what is intentionally deferred, and which candidate slices previously looked safe.

Authority:

- active execution status still belongs in `docs/roadmap/TODO_ROADMAP.md`;
- event workflow rules belong in `docs/process/EVENT_WORKFLOW.md`;
- event architecture rules belong in `docs/architecture/SIMULATION_EVENT_ENGINE.md`;
- world-aware variant rules belong in `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`;
- visual event presentation still follows `docs/process/VISUAL_WORKFLOW.md`.

## 1. North Star

Events should make SchatPhone feel more alive, more continuous, and more believable.

They should not:

- reduce free roleplay into a checklist;
- expose too much backend machinery;
- silently take ownership away from normal modules;
- mutate important user state without explanation, review, or clear boundaries.

The recurring question for future work is:

> does this increase immersive freedom, or does it make the system feel more managed?

## 2. Current Event Baseline

These foundations are already landed:

### Event engine and runtime

- `simulationStore` exists and persists:
  - event logs
  - cooldowns
  - daily caps
  - module enablement
  - Surprise Mode
  - foreground tick settings
- shared event-engine helpers exist for:
  - deterministic random
  - condition evaluation
  - adapter-based execution
- world-aware event context/variant-pack direction is documented and has a local baseline

### Current safe pilot lane

- Food Delivery is the first automatic safe pilot lane.
- Current safe-list remains low-impact and reversible:
  - ETA update
  - rider delay

### Cross-module event handoffs already landed

- Shopping logistics presets reuse the shared event-adapter seam.
- Map can expose read-only delivery route/location context for Food Delivery and Shopping events.
- completed Shopping and delivered Food Delivery flows can write downstream Wallet suggestions.

### Relationship-runtime event bridge

- relationship runtime has a safe explicit fact-adapter baseline for:
  - Shopping gifts
  - Food Delivery shared meals
  - Phone completed/missed calls
  - Map shared routes
  - Wallet manual shared transfers/expenses
  - confirmed Calendar events
- World Hub can review relationship runtime status and approve/dismiss pending relationship effects.

### Foreground runtime control baseline

- Settings has an explicit foreground event tick control.
- `App.vue` lifecycle wiring exists for that foreground tick.
- runtime auto-execution remains opt-in and off by default.

## 3. Current Product Boundary

Keep these ownership rules stable:

- event engine owns eligibility, timing, cooldowns, caps, logs, and adapter dispatch;
- module stores still own real state mutation;
- Chat and notifications are display surfaces unless the event truly belongs to Chat;
- Map can provide route/location/ETA context, but should not own another module's order or payment lifecycle;
- Wallet remains a downstream ledger unless the Wallet module itself creates the interaction;
- relationship runtime owns compact relationship facts and memory continuity, not full source records;
- World Hub is review/control, not the main authoring surface for ordinary module data.

## 4. What Is Done Enough To Stop Re-Deciding

These are no longer open questions for near-term work:

1. the event system should be a local Vue/Pinia/library architecture first, not a full game engine;
2. random/event execution should remain deterministic and testable;
3. Food Delivery is the right first pilot lane;
4. World Hub remains optional and narrow;
5. raw cue/task-like inputs should not be treated as Calendar memories by default;
6. Gallery-driven relationship memory is still deferred until image sources become low-friction and naturally produced.

## 5. Current Priority Work

### P0: keep the runtime explainable and safe

1. improve user-facing explanation for automatic foreground events;
2. keep World Hub review narrow while event logs and Settings controls mature;
3. avoid broad hidden automation or destructive random effects.

### P1: continue explicit cross-module continuity

1. continue text/event-first memory dedupe and merge rules;
2. keep Calendar relationship facts tied only to confirmed schedule/date events;
3. deepen review surfaces so PM/QA/users can understand why something did or did not trigger.

### P2: expand event adapters only after the above stays readable

Candidate later lanes:

- Shopping/logistics random execution
- richer world-aware event packs
- task/unlock systems behind World Hub
- broader service-account event delivery in Chat

## 6. Deferred On Purpose

Do not start these until the current foundation is trusted:

- full XState migration;
- full Canvas/WebGL game-engine direction;
- multiplayer or realtime server coordination;
- AI directly mutating module state;
- random destructive events;
- a visible standalone Event/Simulation app on Home;
- Gallery-driven relationship memory as a mainline input;
- deep economy simulation across Wallet, Stock, Shopping, and Assets without stronger controls.

## 7. Candidate Next Event Slices (Frozen Reference)

Candidate order from this frozen reference:

1. improve event explanation and review quality before widening automation;
2. keep relationship-memory growth on the text/event-first path;
3. only then consider the next safe automatic adapter lane.

Practical same-size code slices:

- strengthen user-facing explanation around foreground ticks and skipped-trigger reasons;
- improve World Hub filtering/review readability for simulation and relationship runtime;
- deepen Calendar relationship review details without broadening its ownership boundary.

## 8. Skill And Workflow Reminder

For event work, do not guess which skill to load. Read:

1. `docs/process/EVENT_WORKFLOW.md`
2. `docs/process/AI_WORK_MODE.md`
3. `docs/process/DEVELOPMENT_TOOLING.md`

Current event-lane skills already documented there include:

- `improve-codebase-architecture`
- `pinia`
- `vue-pinia-best-practices`
- `unit-test-vue-pinia`
- `playwright-testing`
- `game-engine` only for true game-loop work
- `frontend-logic-design` when the event-facing UI has IA problems

## 9. Reading Path

Use this file as the short frozen event reference entry, then read:

1. `docs/process/EVENT_WORKFLOW.md`
2. `docs/architecture/SIMULATION_EVENT_ENGINE.md`
3. `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`
4. `docs/roadmap/TODO_ROADMAP.md`
5. `docs/pm/event-runtime-and-world-hub/README.md`
6. `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`

## 10. Change Log

1. 2026-05-16: event workflow, event-engine baseline, and first pilot lanes were documented and partially landed.
2. 2026-05-17: runtime control, foreground tick, route-context handoff, Wallet loops, and relationship-runtime bridges expanded the baseline.
3. 2026-05-19: historical mixed-encoding and long log-style notes were condensed into a cleaner current-state handoff document.
