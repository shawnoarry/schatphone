# SchatPhone PM Status And TODO

Updated: 2026-05-17

Audience: product managers, designers, non-engineering collaborators, and future AI assistants.

## 1. Product Positioning

SchatPhone is an immersive virtual-phone product. The user should feel like they are using a believable phone with many app-like modules, while the system behind it can coordinate AI chat, world settings, local records, maps, shopping, delivery, assets, wallet-like ledgers, and optional game-style events.

The current product direction is not a simple chat UI. It is closer to:

- A virtual phone shell with app modules.
- A local-first role/world/life-simulation workspace.
- An AI relationship and story system with optional game-like runtime.
- A modular product where each app owns its own data, while shared services coordinate storage, media, events, push, and diagnostics.

Important boundary:

- Users do not need to understand the technical runtime to use normal modules.
- The optional World Hub app is for advanced runtime review and future override controls. Its technical route/code name remains `/control-center` / `control_center`.
- Data creation should stay immersive and distributed: roles in Contacts/Chat, places in Map, products in Shopping, restaurants in Food Delivery, images in Gallery.
- Events, growth systems, tasks, and numeric data exist to make the virtual phone life feel freer, more continuous, and more real; they should not make the product feel like a rigid task manager or visible backend.

## 2. What Works Now

### Module Naming / Calendar-Reminders Decision

Current capability:

- A clean module Chinese/English glossary now exists at `docs/pm/MODULE_NAME_GLOSSARY.md`.
- Calendar and Reminders now have an explicit product split decision at `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`.
- Calendar should become the real schedule/date app.
- Reminders should become the cross-module cue, follow-up, and task surface.
- Current code still combines these responsibilities in Calendar until the refactor lands.

PM meaning:

- Non-technical collaborators can use the glossary to discuss modules without remembering route names or code names.
- Future Calendar work should not deepen the cue-inbox behavior before the Reminders seam exists.
- Reminder-style tasks can later connect to World Hub/world control without making World Hub mandatory for normal users.

### Phone Shell / Home / Settings

Current capability:

- Lock screen, Home screen, app entry layout, status bar, wallpaper settings, notifications, and app navigation are available.
- Home supports normal app entries and folder-style entry patterns for grouped modules.
- More / Experimental Toggles can hide or show optional entries such as World Hub.
- Settings owns backup, restore, storage diagnostics, API/network configuration, push settings, automation settings, and appearance settings.

PM meaning:

- The phone metaphor already has a usable functional base.
- Visual design is still not final; appearance rebuild remains a separate visual workstream.

### Chat

Current capability:

- Chat supports contact threads, AI replies, rich message behavior, WorldBook prompt context, message editing, and service-account style contexts.
- Shopping, logistics, and food delivery service contexts have started to connect into Chat.
- WorldBook binding is visible enough to verify what knowledge enters the prompt path.
- Role chats can now receive compact relationship runtime context, including relationship stage, affinity/trust/intimacy/tension/dependency, milestones, growth traits, and recent relationship facts.

PM meaning:

- Chat is a core mature module, but the file is large and should continue to be refactored carefully.
- Future product work can make Chat feel more like KakaoTalk / WhatsApp / iMessage, but current priority is functional stability.
- Relationship runtime context is meant to help characters remember cross-module life events more naturally, not to restrict free chat.

### WorldBook / Knowledge / Contacts

Current capability:

- WorldBook can store global worldview and knowledge points.
- Knowledge points can be searched, filtered, tagged, edited, enabled/disabled, and linked to context.
- Calendar, Chat, and Map can read WorldBook context.
- Contacts can participate in knowledge usage and profile linkage.
- Contacts can now show read-only relationship snapshots for role profiles.

PM meaning:

- WorldBook is becoming the shared world-context layer.
- The preferred future direction is not to force all imports into one central console; users should still enter data from immersive module locations.
- Contacts is becoming the natural place to review a character's identity plus lightweight relationship continuity.

### Gallery / Media Assets

Current capability:

- Gallery acts as the shared media asset center.
- Modules can reference Gallery assets instead of duplicating local binary files.
- URL/Gallery image source contracts are used by modules such as Food Delivery.

PM meaning:

- Local uploads should generally enter Gallery first, then other modules store structured references.
- This avoids each module inventing its own incompatible file storage.

### Map

Current capability:

- Map supports route/trip concepts, exploration points, route familiarity, area unlock progress, and area feedback.
- Calendar can consume Map-derived reminders.
- Map can build read-only delivery route/location context from Food Delivery order events and Shopping logistics events.
- Map now has a map-first information architecture baseline: the primary screen leads with a map canvas, destination search, route summary, and bottom navigation; secondary tools move into an in-app drawer.

PM meaning:

- Map is evolving from a utility page into a gameplay/immersion surface.
- The current Map change is structural, not the final Google Maps visual rebuild.
- The next practical product-visible step is to expose read-only delivery route context from Food Delivery/Shopping cards.

### Shopping

Current capability:

- Shopping has independent Home entry planning and product/store/order concepts.
- Orders can persist logistics/status events.
- Logistics has service-account context in Chat.
- Shopping logistics event presets exist for manual/condition use.
- Completed gift orders can now write a low-impact relationship memory when the user records the order into Wallet.

PM meaning:

- Shopping should remain its own app/module.
- Logistics can be a peer entry inside Shopping, while Chat receives service-account pushes.
- Random Shopping logistics events are intentionally deferred until explanation and dismissal rules are designed.
- Gifts are now the first Shopping behavior that can quietly support relationship continuity across Contacts and Chat.

### Food Delivery

Current capability:

- Food Delivery has folder-style app planning, restaurant categories, menu items, custom restaurant/menu creation, cart/order flow, and URL/Gallery image sources.
- Food Delivery order events support rider delay, ETA update, restaurant cancellation, address change, and status update concepts.
- A guarded random pilot exists for active orders.
- The automatic event safe-list currently only allows non-destructive ETA update / rider-delay style outcomes.
- Delivered orders can now optionally mark a selected contact as a shared-meal target when recording the order into Wallet, creating a low-impact relationship memory.

PM meaning:

- Food Delivery is the first module where random runtime events are becoming real.
- It is a good pilot because small delivery updates feel immersive and low-risk.
- Food Delivery can now support relationship texture without guessing who the user ate with; the user chooses the target explicitly.

### Calendar / Push / Network

Current capability:

- Calendar can turn confirmed Map reminders into stored Calendar events.
- Calendar event times can be edited, shifted, restored, scheduled, rescheduled, and canceled.
- Real push relay integration exists for scheduled notifications.
- Network diagnostics can label API, storage, push, and simulation reports.
- Product decision now says Calendar and Reminders should split: Calendar keeps confirmed schedule/date meaning, while raw cue queues move toward Reminders.

PM meaning:

- Reminder and push infrastructure is usable.
- Push delivery history is not the same as server-side delivery proof unless a backend later provides receipt APIs.
- Do not add more Calendar-specific relationship facts until the Calendar/Reminders responsibility split is started.

### World Hub / Optional Runtime Control

Current capability:

- World Hub (`/control-center`) is optional and hidden by default.
- Users can enable it from More / Experimental Toggles.
- World Hub currently reads simulation runtime state without triggering or mutating events.
- It shows Surprise Mode, event log counts, cooldowns, module event enablement, recent events, and world-variant metadata.
- World Hub now also shows a read-only relationship runtime review: relationship entity count, recent relationship facts, pending effect count, and top relationship snapshots.
- Relationship runtime pending-confirmation data can now be approved or dismissed from World Hub. Direct value editing is still future work.

PM meaning:

- World Hub is the future "GM / cheat / runtime control" app.
- It should eventually control event intensity, affinity, funds, unlocks, task state, and runtime overrides.
- It should remain optional so users who only want free chat are not forced into game controls.
- The current World Hub relationship panel is intentionally narrow: it can review pending relationship effects, but it still does not expose freeform value editing.

### Event Runtime

Current capability:

- A shared `simulationStore` persists event logs, cooldowns, daily caps, module enablement, Surprise Mode, and foreground tick settings.
- A shared event engine handles condition checks, logs, cooldowns, caps, and adapter exceptions.
- Food Delivery has the first safe random adapter.
- World-aware event variants exist as a standard direction: WorldBook context can lead to different event wording/packs for daily, sci-fi, apocalypse, etc.
- Settings > Automation now has an opt-in foreground event tick switch and interval.
- `App.vue` now wires the foreground tick lifecycle, but only when the user enables it. It stops while locked, on `/lock`, or when the browser tab is hidden.
- Triggered/skipped foreground ticks write Network diagnostics reports.
- Relationship runtime has an expanded safe fact-adapter batch: Shopping gift purchase, Food Delivery shared meal, Phone completed/missed calls, Map shared routes, and Wallet shared transfer/expense records.

PM meaning:

- The event system is now a reusable base, not a per-module one-off.
- It can support future game-like surprises, but it is still controlled and off by default.
- Relationship facts are still starting from explicit, low-risk user actions before any automatic romance/conflict mutation is introduced.

### Delivery Route Context

Current capability:

- Food Delivery order-event cards can show Map-provided route/location context.
- Shopping logistics cards can show Map-provided route/location context when a logistics event exists.
- The card can show route summary, pickup/dropoff, ETA, carrier/tracking metadata, and a clear ownership boundary.

PM meaning:

- Delivery updates are no longer just internal logs; users can see route context where the order/logistics event appears.
- This does not mean Map owns the delivery. Food Delivery and Shopping still own orders, while Map only explains location and ETA.

## 3. What Is Not Finished

- Visual rebuild is not finished. Current UI should be treated as functional scaffolding, not final iOS-like immersion.
- World Hub can approve or dismiss pending relationship effects, but it does not yet offer user-facing sliders, freeform overrides, funds editing, affinity editing, or unlock editing.
- Event runtime has only one automatic safe-list path: Food Delivery ETA/rider-delay pilot.
- Shopping/logistics random events are not enabled automatically.
- Map delivery route context is now exposed inside Food Delivery order-event cards and Shopping logistics cards as read-only context; it still does not create Map trips or move order ownership.
- Map still needs a later full visual pass for Google Maps-like detail, markers, route drawing, and ride-hailing polish.
- Wallet is now a downstream ledger for completed Shopping orders and delivered Food Delivery orders, but deeper fictional funds and relationship-value controls are still future work.
- Assets, Stock, Phone, and several secondary modules still need deeper product loops.
- Backend/server-side runtime is not required for current foreground events, but true background event generation after the page is closed would require a larger backend design.

## 4. Current Priority TODO

### P0: Keep The Event Runtime Safe And Understandable

0. Start the Calendar / Reminders split before expanding Calendar relationship facts.
   Outcome: Calendar remains immersive as a real schedule app, while Reminders becomes the user-facing follow-up/task surface for cross-module cues and world-control-linked objectives.

1. Continue the relationship-growth event system through safe adapters.
   Outcome: affinity, relationship progress, and character growth use one shared truth layer instead of being scattered across modules.

2. Add clearer user-facing explanation for automatic foreground events.
   Outcome: PM/QA/users can understand why an event did or did not trigger.

3. Keep World Hub controls narrow until the event logs and Settings controls are trusted.
   Outcome: users can approve/dismiss pending relationship effects without exposing broad value editing too early.
   Current status: World Hub can read simulation runtime, read relationship runtime, and approve/dismiss pending relationship events only.

### P1: Build Useful Cross-Module Loops

1. Relationship runtime store / truth-layer baseline plus safe adapters.
   Outcome: Contacts and Chat can read stable affinity, stage, milestone, growth summaries, Shopping gift memories, Food Delivery shared-meal memories, Phone call memories, Map shared-route memories, and Wallet transfer/expense memories.

2. Shopping logistics service-account pushes in Chat.
   Outcome: discounts/new arrivals and logistics updates can feel like real app/service notifications.

3. Food Delivery service-account pushes in Chat.
   Outcome: order updates and restaurant promotions can arrive in a dedicated service account.

4. Map and delivery integration.
   Outcome: delivery events can show route/location context, but trip creation remains manual unless explicitly designed.

### P2: Expand World-Aware Gameplay

1. Generate or confirm world-specific event packs from WorldBook.
   Outcome: school, sci-fi, apocalypse, fantasy, and daily-life worlds can produce different event/task sets.

2. Add task/unlock system behind World Hub.
   Outcome: examples include "check in at 3 campus club locations to unlock a feature" or "discover monster shop to unlock fantasy control."

3. Add more adapters through the shared event engine.
   Outcome: Shopping, Map, Wallet, Assets, and Chat can receive events without each module inventing its own random system.

### P3: Visual Rebuild

1. Rebuild global shell toward iOS-like real-phone immersion.
2. Rebuild Chat with KakaoTalk as the primary reference and WhatsApp/iMessage as secondary references.
3. Rebuild Map with Google Maps plus ride-hailing/trip-system references.
4. Rebuild Gallery toward iOS Photos style collections: wallpapers, memories, people, journeys.
5. Rebuild Shopping/Food Delivery folder-style Home presentation once functional modules are stable.

## 5. Product Decisions Needed Later

- Whether automatic foreground events should be shown to users as a normal feature or remain experimental.
- What default event intensity should be for new users.
- Whether World Hub unlock conditions should be world-dependent from the beginning.
- Which world examples should be prioritized first: campus, fantasy, sci-fi, apocalypse, daily city life, or another set.
- Whether true closed-page background events are worth backend complexity.
- Whether Wallet should support editable fictional funds soon, or only consume downstream expense suggestions first.

## 6. Recommended Next Engineering Slice

Recommended next: start the Calendar / Reminders split, then add Gallery relationship facts.

Why this is the best next step:

- The Relationship Growth Event System baseline and expanded adapter batch are now in place.
- Shopping, Food Delivery, Phone, Map, and Wallet prove that explicit user actions can become relationship memories without moving module ownership.
- World Hub can now approve/dismiss pending relationship effects, so high-impact candidates have a safe review path.
- Contacts and Chat can already read relationship runtime snapshots.
- Calendar is currently carrying both schedule events and raw cue confirmation, so Calendar relationship facts should wait until Reminders owns the cue/follow-up layer.
- The next useful step is to split Calendar/Reminders first, then let Calendar submit true schedule/date facts and Gallery submit shared photo/memory facts.
- This keeps future affinity, relationship stages, milestones, and character growth consistent across Chat, Contacts, Map, Shopping, Wallet, Phone, Calendar, Gallery, and later Assets.

Fallback same-size task: add Gallery relationship facts first, or add World Hub relationship-event filters/details without changing Calendar yet.

## 7. Reading Path

Use this file as the PM entry point, then read:

- `docs/roadmap/TODO_ROADMAP.md` for the active engineering board.
- `docs/overview/IMMERSIVE_EVENT_TODO.md` for the event-special-topic history and next slices.
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md` for World Hub/runtime-control decisions.
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md` for the Calendar vs Reminders product boundary.
- `docs/pm/MODULE_NAME_GLOSSARY.md` for module Chinese/English naming.
- `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md` for module-by-module feature catalog.
- `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md` for parked visual rebuild scope.
