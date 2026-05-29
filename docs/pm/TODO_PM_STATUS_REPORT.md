# SchatPhone PM Status And TODO

Updated: 2026-05-27

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
- Shopping, logistics, and Food Delivery service contexts now connect into Chat through reusable service-notification messages with source references and route actions.
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
- Contacts now has a V1 designed/implemented path for Self Profile, Main Role, NPC, and WorldBook-driven profile templates. WorldBook owns template rules; Contacts owns concrete person values.
- NPC profiles can be upgraded to Main Role without losing the existing profile, Chat binding, or chat history.
- Chat context can consume primary worldview rules, current role profile values, visible user self-profile values, relationship runtime context, and supplemental WorldBook knowledge in a clearer order.

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
- A new review-ready design proposes a reusable World Pack / App Archetype / Service Account Template system so world-specific apps and user-created service accounts can be assembled from templates instead of hand-coded one by one.
- Current product direction is the older, lower-complexity entry model: WorldBook stays under Settings/contextual links, and World Pack selection/activation should appear inside the full WorldBook management page.

PM meaning:

- WorldBook is becoming the shared world-context layer;
- World Pack should assemble defaults from WorldBook and existing app archetypes, not replace WorldBook as a second lore source;
- World Pack activation should feel like choosing the current world configuration, not like shopping in a separate storefront;
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
- Shopping checkout can push order notifications into matching Shopping service accounts.
- Logistics events can push tracking notifications into matching Logistics service accounts.
- Completed gift orders can now write low-impact relationship memory when recorded into Wallet.

PM meaning:

- Shopping is stable as an independent app lane;
- gifts are now a real bridge into relationship continuity.

### Food Delivery

- Food Delivery has folder-style app planning, restaurant categories, menu items, custom restaurant/menu creation, cart/order flow, and URL/Gallery image sources.
- Food Delivery order events support rider delay, ETA update, restaurant cancellation, address change, and status update concepts.
- Food Delivery checkout and order events can push service notifications into the Food Delivery Dispatch service account.
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
  - Contacts 4.1 detail IA and memory presentation acceptance is now reached;
  - 4.2 memory dedupe/merge and recall cleanup has reached current acceptance, with explicit-lineage coverage across Phone callback, Shopping gift plus Calendar follow-up, Shopping/Food Wallet support, and Map shared-route plus Calendar follow-up chains;
  - Chat consumes prompt-facing primary-led recall summaries, while Contacts and World Hub show UI-facing related-record summaries so supporting Calendar/Wallet facts enrich the same memory instead of taking over the memory headline;
  - Calendar confirmed-event cards now show relationship review detail for lineage, target, memory role, and duplicate-growth status;
  - memory review state is now visible in both Contacts and World Hub, and Contacts memory source filtering no longer drops off-screen matches because of early list truncation;
  - relationship snapshots now sort recent events by timestamp rather than insertion order, reducing wrong “latest event” summaries after delayed imports or backfilled facts;
  - archived memories are now hidden from default live summaries across runtime, Contacts, and Chat unless a caller explicitly opts in;
  - runtime relationship snapshots now expose canonical primary-memory, memory-count, and source-summary fields that both Contacts and World Hub consume directly;
  - Contacts linked-activity source totals now dedupe runtime refs against event-attached detail refs, preventing one shared event from inflating source counts;
  - Assets, Stock, Phone, and several secondary modules still need deeper product loops;
- true closed-page background event generation would still require a larger backend design.

## 4. Current Priority

### P0: Keep Runtime And Memory Systems Safe And Understandable

1. Preserve the completed 4.3 World Hub review-pack baseline before adding stronger controls.
   - Calendar now writes relationship facts only from confirmed schedule-like events.
   - raw cue drafts remain owned by Reminders.
   - same-life-event schedule follow-ups merge into the existing memory when upstream lineage is explicit.
   - Calendar keeps source-audit review detail, while Contacts/World Hub use product-grade related-record copy instead of technical source labels.
   - World Hub can now filter and inspect event logs and relationship facts with selected-detail explanations.
2. Continue the relationship-growth event system through safe adapters.
   - relationship progress and character growth should use one shared truth layer instead of scattered module-local fields.
3. Add clearer user-facing explanation for automatic foreground events.
4. Keep World Hub controls narrow until event logs and Settings controls are trusted.

### P1: Build Useful Cross-Module Loops

1. Preserve the 4.2 memory dedupe baseline and 4.3 World Hub review-pack baseline.
2. Keep relationship runtime, Contacts, and Chat aligned on one memory truth layer.
3. Preserve the 4.4 service-notification boundary: Chat stores messages and source links, source modules own business state.
4. Continue Map and delivery integration as read-only context, not ownership transfer.

### P2: Expand World-Aware Gameplay Carefully

1. Add a lightweight `Current World Pack / 当前设定包` area inside WorldBook for selection, review, and activation.
2. Generate or confirm world-specific event packs from WorldBook and the active World Pack.
3. Add task/unlock systems behind World Hub, keeping World Hub and Cheats separate from WorldBook authoring.
4. Add more adapters through the shared event engine.

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
- Whether the World Pack / App Archetype / Service Account Template system should use one active world per save in V1 or a narrower per-profile/per-thread world scope.
- Which first app archetype should be promoted after service-account notifications: marketplace/auction, reservation, transit, subscription, or publication feed.
- Whether true closed-page background events are worth backend complexity.
- Whether Wallet should support editable fictional funds soon or remain downstream first.

## 6. Recommended Next Engineering Slice

Recommended next:

Move from the completed 4.4 service-account continuity slice to the next roadmap lane: safe architecture cleanup and the next promoted product package, unless PM asks for a focused polish pass. A review-ready world-pack/app-archetype/service-template design exists, and the focused WorldBook B-plan now defines the near-term path: stabilize WorldBook functional IA, add a shared world-interface seam, then add `Settings -> WorldBook -> Current World Pack` rather than a standalone world-store app.

Why:

- role ID, relationship-runtime ownership, memory-group APIs, delete/reset orchestration, backup/restore, and Contacts 4.1 detail IA are now in place as a baseline;
- fragmented memory summaries are controlled for current explicit source-id chains;
- primary-led recall summaries are now available for Chat prompt context, and UI-facing review summaries are used by Contacts and World Hub;
- Calendar relationship review detail now exposes lineage and duplicate-growth status without forcing that audit language into default Contacts/World Hub summaries;
- World Hub now supports filtered event-log and relationship-fact review with selected-detail explanations, while still deferring broad value, funds, unlock, and freeform override controls.
- Shopping/logistics/Food Delivery now push Chat service-notification messages without transferring order, wallet, or route ownership.

Fallback same-size task:

- add another read-only World Hub explanation slice only if PM/QA finds a concrete review gap;
- polish service-notification visual language only if product review asks for it; the functional 4.4 baseline is complete.
- turn the world-pack design into an implementation plan only after confirming first pack examples and first archetype target, because it is a multi-slice architecture lane rather than a small polish task.

## 7. Workflow And Skill Reading Path

Use this file as the PM entry point, then read:

- `docs/roadmap/TODO_ROADMAP.md` for the live engineering board;
- `docs/pm/TASK_PACKAGE_INDEX.md` for package ownership;
- `docs/process/AI_WORK_MODE.md` for workflow rules and top-level skill routing;
- `docs/process/DEVELOPMENT_TOOLING.md` for skill inventory and setup assumptions;
- `docs/process/EVENT_WORKFLOW.md` for event/runtime lane skill usage;
- `docs/process/VISUAL_WORKFLOW.md` for visual/IA lane skill usage.

This matters because the skill guidance is not lost, but intentionally split by workflow lane.
