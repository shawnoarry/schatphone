# Runtime Control And Cheats Pack Plan / 运行控制与金手指任务包规划

Updated: 2026-08-10

> **Planning reference / 规划参考**
>
> This file is not an active implementation plan or live execution board. The package now exists at `docs/pm/event-runtime-and-world-hub/`; its `STATUS_AND_HANDOFF.md` and `docs/roadmap/TODO_ROADMAP.md` own current work.

This is a compatibility planning reference for the current `Event Runtime / World Hub / Cheats` task package.

It exists so future engineers do not treat `World Hub / 世界中枢` and `Cheats / 金手指` as random UI leftovers. They are part of the same runtime-control lane, but they are not the same product surface.

## 1. Why This Needs Its Own Pack

The current project already contains:

- `World Hub / 世界中枢`
  - optional runtime-control app
  - route `/control-center`
  - toggle id `control_center`
  - current review and cleanup implementation
- `Cheats / 金手指`
  - Home hidden-system placeholder
  - product wording that it should unlock later
  - no complete route, unlock source, or value-editing UX yet

Without a dedicated pack, later workers can easily confuse:

- event runtime
- World Hub review
- GM control
- Cheats unlock
- freeform value editing

## 2. Current Package Scope

Current package folder:

`docs/pm/event-runtime-and-world-hub/`

Authoritative files:

1. `README.md`
2. `PRODUCT_BOUNDARY.md`
3. `STATUS_AND_HANDOFF.md`
4. `WORLD_HUB_AND_CHEATS.md`
5. `IMPLEMENTATION_WORKSTREAMS.md`

## 3. Product Boundary To Freeze

### Event Runtime / 事件运行时

- internal coordination layer
- owns logs, cooldowns, caps, trigger policy
- not a user-facing app

### World Hub / 世界中枢

- optional runtime review/control app
- GM-like coordination surface
- narrow controls first
- should stay readable and not turn normal phone use into admin work

### Cheats / 金手指

- stronger, more game-like override lane than World Hub
- can later hold value editing, forced triggers, unlock forcing, funds editing, debug correction, or sandbox-style control
- should not be visible by default
- should not be designed before World Hub review surfaces are stable

## 4. Current Project State

Already present:

- World Hub product decision doc
- World Hub toggle and Home visibility rules
- World Hub read-only and narrow relationship/runtime controls
- Cheats placeholder in Home hidden-system area

Not complete yet:

- Cheats route
- Cheats unlock source
- Cheats installation/visibility rule
- Cheats preview/undo/recompute and privileged write Interfaces

Now frozen:

- Event receives no ordinary Home app;
- Event Runtime remains the hidden coordination Module;
- event history, pending review, explanations, and event-scoped notes merge into the existing World Hub hidden entry;
- Cheats stays a separately unlocked privileged Module even if World Hub later links to it and shares selected-event context/audit formatting.

## 5. Immediate Workflow Rule

Any task touching:

- World Hub
- runtime review
- GM control
- Cheats
- unlock control
- freeform value editing

must read:

1. `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
2. `docs/pm/event-runtime-and-world-hub/PRODUCT_BOUNDARY.md`
3. `docs/pm/event-runtime-and-world-hub/WORLD_HUB_AND_CHEATS.md`
4. `docs/process/EVENT_WORKFLOW.md`
5. `docs/architecture/SIMULATION_EVENT_ENGINE.md`
6. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when relationship runtime is involved
7. `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`

## 6. Superseded Documentation Slice

This historical sequence is complete except for the exact Cheats route/unlock mechanics:

1. use the existing `docs/pm/event-runtime-and-world-hub/README.md`
2. freeze `World Hub / 世界中枢` vs `Cheats / 金手指` product difference
3. keep the exact Cheats route separately gated:
   - World Hub may link to Cheats only after unlock
   - route and unlock mechanics remain unapproved
   - a normal World Hub session never inherits privileged write authority
