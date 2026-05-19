# SchatPhone Immersive Phone Master Blueprint

Updated: 2026-05-19

Purpose: this is the highest-level strategic blueprint for SchatPhone.

Use it to answer:

- what kind of product SchatPhone is becoming;
- which long-range principles should stay stable even when modules change;
- how product, runtime, memory, ownership, and storage strategy fit together.

This file is not the live execution board.

For active sequencing and implementation order, read:

- `docs/strategy/PROJECT_ITERATION_PLAN.md`
- `docs/roadmap/TODO_ROADMAP.md`
- `docs/process/AI_WORK_MODE.md`

## 1. Product Definition

SchatPhone is not just a chat shell.

It is a virtual-phone-based relationship simulation and interactive narrative system with:

- a believable phone shell;
- multiple app-like modules;
- AI roles that can appear across those modules;
- continuity anchored by system-owned truth, not by hoping the model remembers everything;
- optional runtime/game-like control surfaces for users who want them.

Short version:

> a local-first immersive virtual phone where relationships, world context, and everyday module actions form one coherent life loop.

## 2. Core Strategic Principles

### 2.1 System truth over model memory

Anything that affects continuity must be owned by the project itself.

This includes:

- relationship progress;
- event state;
- task/objective state;
- balances and transfers;
- trip and schedule state;
- notification state;
- memory summaries accepted into long-term continuity.

### 2.2 Cross-module life over single-page novelty

The product should feel like one lived-in phone, not a collection of isolated demos.

That means the same role, memory, asset, or event may appear across:

- Chat
- Contacts
- Map
- Calendar
- Reminders
- Wallet
- Shopping
- Food Delivery
- Gallery

### 2.3 Explicit user action before hidden automation

Near-term continuity should come from explicit, low-risk user actions first.

This is why the current relationship-memory direction is:

- text/event-first;
- low-impact;
- reviewable;
- deduped;
- source-aware.

High-impact hidden automation remains deliberately constrained.

### 2.4 Optional runtime control, not forced game admin

`World Hub / 世界中枢` belongs to the product, but it must remain optional.

It is useful for:

- runtime review;
- pending-effect review;
- future narrow overrides;
- future deeper control lanes such as Cheats.

It must not become the normal place where users are forced to manage ordinary phone life.

### 2.5 Immersion through ownership clarity

Immersion is not just visual.

It also depends on each concept having a stable home:

- `Contacts` owns global role archive and role-centered management;
- `Chat Directory` owns Chat-side binding;
- `Chat` owns message history;
- `relationship runtime` owns relationship progress and memory groups;
- `Calendar` owns confirmed schedule/date meaning;
- `Reminders` owns raw cross-module cues and follow-ups;
- `Files` stays internal;
- `Gallery` is asset-first before it becomes anything else.

## 3. Current Product Thesis

The project has already moved beyond shell-building.

It now has:

- a usable phone shell;
- meaningful module loops;
- relationship-runtime baseline;
- event-runtime baseline;
- optional World Hub baseline;
- cross-module asset and continuity seams;
- stronger doc/workflow/task-package governance.

So the next strategic risk is no longer "can we build more modules?"
The real risk is:

> piling more behavior onto already-heavy surfaces before ownership, memory semantics, and runtime review quality are stable enough.

## 4. Strategic System Pillars

### 4.1 Shell and entry coherence

The phone shell is the delivery surface.

This includes:

- lock/home/notifications;
- system-owned vs installed-app-owned visual entry rules;
- stable navigation return behavior;
- restrained optional-system surfaces such as World Hub.

### 4.2 Relationship and memory truth layer

This is now one of the main strategic pillars.

It should continue evolving around:

- system-owned relationship metrics and stages;
- compact memory groups rather than scattered module-local "relationship" fields;
- explicit source-aware facts;
- dedupe, merge, recall, and review rules;
- Contacts as the main human-facing role-management hub.

### 4.3 Runtime and event layer

This layer should remain:

- opt-in where needed;
- explainable;
- deterministic enough to test;
- adapter-based rather than module-invasive;
- reviewable before it becomes more powerful.

### 4.4 Role behavior and continuity layer

Roles should feel persistent and situated, not like stateless responders.

That eventually includes:

- schedule and availability logic;
- emotional continuity;
- proactive outreach rules;
- silence and missed-moment reactions;
- world-aware event and memory context.

### 4.5 Storage and archival layer

The long-range storage strategy is layered, not "everything in one browser bucket."
Small hot config can stay light.

Large structured archives, histories, and runtime truth should follow a stronger layered model over time.

### 4.6 Cross-module evidence and media layer

Images, route context, ledger context, service-account context, and other structured artifacts should support immersion without stealing ownership from their source modules.

## 5. Current Frozen Product Boundaries

These are not the places to improvise casually:

1. `Contacts` vs `Chat Directory`
2. `Calendar` vs `Reminders`
3. `World Hub` vs future `Cheats`
4. `Files` internal role
5. `relationshipLevel` / `relationshipNote` as compatibility fields, not relationship truth
6. Gallery as asset-first, not current mainline relationship-memory input surface

## 6. Near-To-Mid-Term Strategic Sequence

The current strategic order is:

1. finish ownership closure;
2. deepen architecture around existing hotspots;
3. tighten cross-module memory loops;
4. improve runtime review quality before stronger control;
5. return to broad visual rebuild only after the above is stable.

That sequence is tracked in more operational form inside:

- `docs/strategy/PROJECT_ITERATION_PLAN.md`
- `docs/roadmap/TODO_ROADMAP.md`

## 7. Anti-Goals

Do not let the project drift into these traps:

1. more pages without stronger continuity;
2. visible backend/admin feeling in ordinary user flows;
3. hidden automation before explanation and review quality;
4. duplicating the same truth across module-local fields and runtime truth layers;
5. forcing Gallery/media workflows before input friction is low enough;
6. making World Hub mandatory for users who only want immersive phone-life/chat play.

## 8. Companion Strategy Docs

After reading this file, use these documents by topic:

- `docs/strategy/PROJECT_ITERATION_PLAN.md`
  - current sequence and exit criteria
- `docs/strategy/STATE_OWNERSHIP_STRATEGY.md`
  - what belongs to user-defined core, system truth, AI-assisted draft, or AI-generated presentation
- `docs/strategy/STORAGE_STRATEGY.md`
  - layered storage target and migration posture
- `docs/strategy/BACKGROUND_ACTIVITY_STRATEGY.md`
  - real-time rhythm, restore-time logic, and background/autonomy decisions
- `docs/strategy/PROJECT_EXPANSION_BLUEPRINT.md`
  - long-range ecosystem expansion themes, not the main current execution order

## 9. Practical Rule For Future Work

Whenever a major new feature is proposed, evaluate it with these questions:

1. Does it strengthen continuity?
2. Does it reuse one shared world/relationship/runtime truth instead of inventing another?
3. Does it preserve module ownership?
4. Does it keep user control ahead of hidden automation?
5. Does it improve immersion without turning the product into a visible admin console?

If the answer is mostly no, it should not be prioritized yet.

## 10. Change Log

1. 2026-04-12: created as a high-level immersive virtual-phone blueprint.
2. 2026-05-19: rewritten to align with the current task-package system, ownership closures, relationship runtime, World Hub strategy, Calendar/Reminders split, Files decision, and workflow governance.
