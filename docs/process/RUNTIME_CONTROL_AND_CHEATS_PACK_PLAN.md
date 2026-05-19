# Runtime Control And Cheats Pack Plan / 运行控制与金手指任务包规划

Updated: 2026-05-19

> **Planning reference / 规划参考**
>
> This file is not an active implementation plan or live execution board. It defines how the future Runtime Control / World Hub / Cheats package should be split. If work becomes active, first promote a concrete slice into `docs/roadmap/TODO_ROADMAP.md` and the future package `STATUS_AND_HANDOFF.md`.

This is the planning entry for the future `Event / Runtime / World Hub / Cheats` task package.

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

## 2. Proposed Future Pack Scope

Recommended future pack folder:

`docs/pm/runtime-control-and-cheats/`

Recommended files:

1. `README.md`
2. `PRODUCT_BOUNDARY.md`
3. `WORLD_HUB.md`
4. `CHEATS.md`
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
- distinction between World Hub narrow controls and Cheats stronger overrides
- PM-readable task package for this lane

## 5. Immediate Workflow Rule

Until the dedicated runtime-control pack is created, any task touching:

- World Hub
- runtime review
- GM control
- Cheats
- unlock control
- freeform value editing

must read:

1. `docs/process/EVENT_WORKFLOW.md`
2. `docs/architecture/SIMULATION_EVENT_ENGINE.md`
3. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when relationship runtime is involved
4. `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`
5. `docs/overview/IMMERSIVE_EVENT_TODO.md`

## 6. Recommended Next Documentation Slice

When the team wants to formalize this lane, the first step should be:

1. create `docs/pm/runtime-control-and-cheats/README.md`
2. freeze `World Hub / 世界中枢` vs `Cheats / 金手指` product difference
3. define whether Cheats is:
   - a stronger tab inside World Hub
   - a separately unlocked hidden app
   - or a future-only concept with no route yet
