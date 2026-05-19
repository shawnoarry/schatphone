# SchatPhone PM Status And TODO

Updated: 2026-05-19

> **PM status mirror / 产品状态镜像**
>
> This file is not an active TODO, roadmap, or implementation source. It explains current product state for PM/design/review work. Concrete execution order still belongs only in `docs/roadmap/TODO_ROADMAP.md`.

Audience: product managers, designers, non-engineering collaborators, and future AI assistants.

## 1. Product Positioning

SchatPhone is an immersive virtual-phone product. The user should feel like they are using a believable phone with many app-like modules, while the system behind it can coordinate AI chat, world settings, local records, maps, shopping, delivery, assets, wallet-style ledgers, and optional game-style runtime systems.

It is not a simple chat UI. It is closer to:

- a virtual phone shell with app modules;
- a local-first role/world/life-simulation workspace;
- an AI relationship and story system with optional game-like runtime;
- a modular product where each app owns its own data, while shared services coordinate storage, media, events, push, and diagnostics.

Important boundary:

- ordinary users should not need to understand the runtime layer to use normal modules;
- `World Hub` is an optional advanced runtime review/control app, not a required user path;
- data creation should stay immersive and distributed across the owning apps;
- events, growth systems, and numeric state should support continuity, not make the product feel like a visible backend console.

## 2. What Works Now

### Module Naming And Core Boundaries

- `docs/pm/MODULE_NAME_GLOSSARY.md` now provides a stable Chinese/English naming map.
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md` now defines the Calendar vs Reminders split.
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md` now defines World Hub as optional.
- `docs/product-decisions/FILES_INTERNAL_STORAGE_ROLE.md` now defines Files as an internal component, not a normal user-facing app.

PM meaning:

- product and engineering can speak about the same modules without falling back to route names or code terms;
- ownership rules are much less ambiguous than before.

### Phone Shell / Home / Settings

- Lock screen, Home screen, app entry layout, status bar, wallpaper settings, notifications, and app navigation are available.
- Home supports normal entries plus folder-style grouped entries.
- More / Experimental Toggles can hide or show optional entries such as World Hub.
- Settings owns backup, restore, storage diagnostics, API/network configuration, push settings, automation settings, and appearance settings.

PM meaning:

- the phone metaphor already has a functional base;
- visual quality is still not the final target, but shell behavior is stable enough to support deeper module work.

### Chat

- Chat supports contact threads, AI replies, rich message behavior, WorldBook prompt context, message editing, and service-account style contexts.
- Shopping, logistics, and Food Delivery service contexts have started connecting into Chat.
- Role chats can now receive compact relationship runtime context, including relationship stage, metrics, milestones, growth traits, and recent relationship facts.

PM meaning:

- Chat is one of the product cores;
- future product work can make it feel closer to polished messaging apps, but current priority remains ownership clarity and functional stability.

### Contacts / Relationship Runtime

- Contacts can show read-only relationship snapshots for role profiles.
- Contacts Relationship System V2 baseline is now partially implemented:
  - visible `roleId` schema, validation, duplicate checks, and backup/restore migration exist;
  - Contacts and Chat Directory now have a clearer boundary between global role archive and Chat-side binding;
  - relationship runtime can list/delete one memory group, reset one target, recompute relationship state, and remove facts by source record;
  - Contacts exposes safe role delete, relationship reset, and single-memory delete flows with impact summaries and typed confirmation;
  - World Hub can review relationship runtime entities and run reset/delete-memory cleanup without deleting the Contacts role profile;
  - module-owned source records can be deleted or anonymized through shared cleanup handlers for Calendar, Phone, Wallet, Shopping, Food Delivery, and Map.

PM meaning:

- the product finally has a realistic path toward "delete one role", "reset one relationship", and "delete one memory group" without pretending everything lives in one module;
- Contacts is clearly becoming the role-centered management hub.

### Calendar / Reminders / Push

- Calendar can turn confirmed Map reminders into stored Calendar events.
- Calendar event times can be edited, shifted, restored, scheduled, rescheduled, and canceled.
- Push relay integration exists for scheduled notifications.
- Calendar and Reminders are now explicitly split:
  - `Reminders` owns raw cues and follow-up style queues;
  - `Calendar` owns confirmed schedule/date events and real push scheduling.
- `/calendar` now emphasizes schedule overview, confirmed events, event time editing, push state, and Reminders summary.
- `/reminders` is reachable from Home and can filter cues by source and handling state.
- Confirmed Calendar events can now record low-impact relationship facts after explicit Chat-contact selection.

PM meaning:

- the split is no longer just theoretical;
- future work should not pull raw cue-inbox behavior back into Calendar.

### WorldBook / Knowledge

- WorldBook can store global worldview and knowledge points.
- Knowledge points can be searched, filtered, tagged, edited, enabled/disabled, and linked to context.
- Calendar, Chat, and Map can read WorldBook context.

PM meaning:

- WorldBook is becoming the shared world-context layer;
- data entry should still stay distributed instead of forcing everything into one control console.

### Gallery / Media Assets

- Gallery acts as the shared media asset center.
- Other modules can reference Gallery assets instead of duplicating local binary files.
- URL/Gallery image source contracts are used by modules such as Food Delivery.

PM meaning:

- Gallery is currently more about asset ownership and atmosphere than about being a core relationship-memory input surface.

### Map

- Map supports route/trip concepts, exploration points, familiarity, area unlock progress, and area feedback.
- Calendar can consume Map-derived reminders.
- Map can build read-only route/location context for Food Delivery and Shopping logistics events.
- Map now has a map-first IA baseline with map canvas, destination search, route summary, and bottom navigation.

PM meaning:

- Map is no longer just a placeholder utility view;
- current gains are structural and ownership-related, not yet the final visual rebuild.

### Shopping / Logistics

- Shopping has its own Home entry planning and product/store/order concepts.
- Orders can persist logistics/status events.
- Logistics has service-account context in Chat.
- Completed gift orders can now write low-impact relationship memory when recorded into Wallet.

PM meaning:

- Shopping is stable as an independent app lane;
- gifts are now a real bridge into relationship continuity.

### Food Delivery

- Food Delivery has folder-style app planning, restaurant categories, menu items, custom restaurant/menu creation, cart/order flow, and URL/Gallery image sources.
- Food Delivery order events support rider delay, ETA update, restaurant cancellation, address change, and status update concepts.
- A guarded random pilot exists for active orders.
- The automatic event safe-list currently allows only non-destructive ETA-update / rider-delay style outcomes.
- Delivered orders can now mark a selected contact as a shared-meal target when recorded into Wallet, creating a low-impact relationship memory.

PM meaning:

- Food Delivery is still the best low-risk event-runtime pilot lane;
- shared-meal memory now supports relationship continuity without forcing hidden inference.

### Event Runtime / World Hub

- `simulationStore` persists event logs, cooldowns, daily caps, module enablement, Surprise Mode, and foreground tick settings.
- A shared event engine handles condition checks, logs, cooldowns, caps, and adapter exceptions.
- Food Delivery has the first safe automatic pilot.
- World-aware event variants exist as a standard direction.
- Settings > Automation has an opt-in foreground event tick switch.
- App lifecycle wiring exists for foreground ticking only when the user enables it.
- World Hub reads simulation runtime state and relationship runtime review data.
- Relationship pending-confirmation effects can be approved or dismissed from World Hub.

PM meaning:

- the runtime is now a reusable base, not a one-off trick inside one module;
- World Hub is still intentionally narrow and optional.

## 3. What Is Not Finished

- visual rebuild is not finished;
- World Hub still does not offer broad user-facing sliders, freeform overrides, funds editing, affinity editing, or unlock editing;
- event runtime has only one automatic safe-list path: the Food Delivery ETA/rider-delay pilot;
- Shopping/logistics random events are not enabled automatically;
- Map route context is still read-only and does not transfer ownership away from Shopping/Food Delivery;
- Contacts Relationship System V2 is not fully complete:
  - destructive-action baseline is in;
  - full Contacts detail IA polish is still pending;
  - manual-vs-event-attached visual language is still pending;
  - preferences, life-pattern, social-graph, and long-term memory compression/expiry controls are still future work;
- Assets, Stock, Phone, and several secondary modules still need deeper product loops;
- true closed-page background event generation would still require a larger backend design.

## 4. Current Priority

### P0: Keep Runtime And Memory Systems Safe And Understandable

1. Continue from the first true schedule/date memory slice.
   - Calendar now writes relationship facts only from confirmed schedule-like events.
   - raw cue drafts remain owned by Reminders.
2. Continue the relationship-growth event system through safe adapters.
   - relationship progress and character growth should use one shared truth layer instead of scattered module-local fields.
3. Add clearer user-facing explanation for automatic foreground events.
4. Keep World Hub controls narrow until event logs and Settings controls are trusted.

### P1: Build Useful Cross-Module Loops

1. Finish the Contacts V2 detail IA and memory-management presentation layer.
2. Keep relationship runtime, Contacts, and Chat aligned on one memory truth layer.
3. Continue Shopping logistics service-account pushes in Chat.
4. Continue Food Delivery service-account pushes in Chat.
5. Continue Map and delivery integration as read-only context, not ownership transfer.

### P2: Expand World-Aware Gameplay Carefully

1. Generate or confirm world-specific event packs from WorldBook.
2. Add task/unlock systems behind World Hub.
3. Add more adapters through the shared event engine.

### P3: Visual Rebuild Return

1. Rebuild the global shell toward stronger real-phone immersion.
2. Rebuild Chat with messaging-app references.
3. Rebuild Map with stronger mapping and ride-hailing references.
4. Rebuild Gallery toward stronger Photos-style collections.
5. Rebuild Shopping/Food Delivery Home-folder presentation once module behavior is stable.

## 5. Product Decisions Still Needed Later

- Whether automatic foreground events should become a normal visible feature or remain experimental.
- What default event intensity should be for new users.
- Whether World Hub unlock conditions should be world-dependent from the beginning.
- Which world packs should be prioritized first.
- Whether true closed-page background events are worth backend complexity.
- Whether Wallet should support editable fictional funds soon or remain downstream first.

## 6. Recommended Next Engineering Slice

Recommended next:

Finish the Contacts V2 detail IA layer and memory-management presentation.

Why:

- role ID, relationship-runtime ownership, memory-group APIs, delete/reset orchestration, backup/restore, and module cleanup seams are now in place as a baseline;
- Contacts already has destructive-action surfaces, but the role-detail page still needs clearer product-grade information architecture;
- the next useful step is to make manual information and event-attached information visibly distinct before adding more derived facts.

Fallback same-size task:

- deepen text-first memory dedupe/merge rules;
- improve Calendar relationship review details.

## 7. Workflow And Skill Reading Path

Use this file as the PM entry point, then read:

- `docs/roadmap/TODO_ROADMAP.md` for the live engineering board;
- `docs/pm/TASK_PACKAGE_INDEX.md` for package ownership;
- `docs/process/AI_WORK_MODE.md` for workflow rules and top-level skill routing;
- `docs/process/DEVELOPMENT_TOOLING.md` for skill inventory and setup assumptions;
- `docs/process/EVENT_WORKFLOW.md` for event/runtime lane skill usage;
- `docs/process/VISUAL_WORKFLOW.md` for visual/IA lane skill usage.

This matters because the skill guidance is not lost, but intentionally split by workflow lane.
