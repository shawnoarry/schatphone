# SchatPhone PM Status And TODO

Updated: 2026-06-01

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
- Chat now has a messaging-app style first layer: Messages, Objects, Groups, Services, and Me.
- The top-right gear opens Chat Settings. Chat Settings owns Chat Appearance, default-behavior entry points, and maintenance diagnostics; Me owns Chat identity/anonymity, recent interaction data, and a lightweight derived feed.
- Chat Appearance V1 stores its state under system appearance settings, defaults to the Kakao-like immersive preset, supports WeChat/Kakao/iMessage message-layout modes, and has a Chat-scoped custom CSS channel separate from global Appearance CSS.
- Shopping, logistics, and Food Delivery service contexts now connect into Chat through reusable service-notification messages with source references and route actions.
- Service accounts now expose descriptive source notification plans in Services, service threads, and the Chat linkage contract; plans identify supported Shopping/logistics/Food Delivery event streams without creating subscriptions or source records.
- Group chats are now visible as Chat-native targets with member selection and reply-mode metadata; deeper multi-speaker orchestration remains a later behavior layer.
- Incoming generated social events now have the first review path and two conservative sources: Chat AI responses may include optional normalized social proposals, and the foreground/session runtime may propose a role greeting for stranger or declined role contacts. Low-risk role greetings can become audited pending message requests, while role refusal/block/restore/unblock proposals wait for World Hub approval before Chat changes the communication state. World Hub explains source, trigger policy, and safety boundaries for these proposals; Chat owns the applied channel state, Contacts displays role snapshots, Event Runtime reviews generated events, and relationship runtime records confirmed continuity only.
- Role chats can now receive compact relationship runtime context, including relationship stage, metrics, milestones, growth traits, and recent relationship facts.

PM meaning:

- Chat is one of the product cores;
- the Chat home should feel closer to a polished messaging app while keeping object, group, service, identity/anonymity, appearance, and diagnostics controls explicit but not duplicated.

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
- Contacts role profiles now persist profile-side relationship premise/classification fields: free-text label, label note, initial seed values, primary relationship category, modifier tags, confidence/source/timestamp, and explanation.
- Relationship classification now has an AI seam: suggestions go through `src/lib/ai.js`, JSON is normalized through the shared response parser path, high-confidence suggestions can save as `ai_auto`, medium/low confidence requires confirmation before `ai_confirmed`, and existing `user_edited` classifications cannot be silently overwritten by later AI or world-template writes.
- Contacts detail now includes the first role-control page surface for relationship classification: the current relationship runtime snapshot stays display-only at the top, while profile-side premise fields, seed values, primary category, modifiers, and classification audit can be edited below it.
- Contacts now shows the role's current Chat communication snapshot as read-only status; it does not apply generated friend/block/refusal outcomes.
- Event/runtime now consumes saved relationship classification fields as stable semantic context. Current low-impact relationship facts attach `relationshipGate` audit metadata from saved category/modifier fields only; raw `relationshipLabelText` and `relationshipLabelNote` are not read for event decisions. Named high-risk gate presets exist for future event packs, but no high-impact automation is enabled.
- Chat Directory now keeps legacy `relationshipLevel` and `relationshipNote` as Chat-local tuning/note compatibility fields only; visible copy no longer presents them as current affinity.
- NPC profiles can be upgraded to Main Role without losing the existing profile, Chat binding, or chat history.
- Chat context can consume primary worldview rules, current role profile values, visible user self-profile values, relationship runtime context, and supplemental WorldBook knowledge in a clearer order.

PM meaning:

- the product finally has a realistic path toward "delete one role", "reset one relationship", and "delete one memory group" without pretending everything lives in one module;
- Contacts is clearly becoming the role-centered management hub;
- relationship premise/classification data belongs to the profile layer, while current metrics, stage, milestones, and memories remain owned by relationship runtime; Contacts remains profile editing/current snapshot only, while event/runtime owns gate decisions.

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
- WorldBook now opens with an active-world overview and a usable `Current World Pack / 当前设定包` activation panel inside Settings.
- Calendar, Chat, Map, and event runtime can read WorldBook context.
- Chat prompt context and the Chat thread WorldBook summary now share the same `world-interface` result, so user-visible injection state matches the context sent to AI.
- Book text-library V1 now separates long-form source text from activation: `Book` stores reusable worldbook documents, knowledge notes, rules, glossary text, and reference notes, while `Settings -> WorldBook` can choose whole documents or selected sections as active world context, preview changed-source diffs, and accept a newer source version after review.
- World Pack V1 now persists built-in/user world packs, supports activation review, keeps one active pack per save, and exposes active-pack app/service-template metadata through `world-interface`. Current World Pack now shows enabled service-account template availability only; Chat Directory's `Services` management area now lets users edit/reset built-in current-world service/official account candidates before opting in through the Chat-owned idempotent create/reuse seam, shows descriptive source notification plans for supported event streams, and keeps WorldBook out of account creation.
- World Pack schema can now carry relationship category/modifier registry additions as data-only extensions for later classification and event rules; there is no world-category editor UI in this slice.
- The reusable World Pack / App Archetype / Service Account Template direction is now partially implemented for service-account entry generation and the first concrete app-binding behavior: `survival_city` can open Shopping as `补给站`, show active world context, and apply a safe Daily Fresh / Grocery filter.
- The first global World Pack app-entry unlock seam is implemented: active app bindings become stable `world_app_*` entries in App Store and Home/App Library placement flows, and launch target modules with `worldPack`/`worldApp` route context instead of staying trapped in WorldBook.
- Current World Pack now behaves like an activation/status surface rather than a launcher: it shows the active world-app snapshot and tells users to use App Store's `World` section for world-app browsing, placement, and launch, without adding a Settings-side App Store jump button.
- The first world UX package target-app seam is implemented through `src/lib/world-pack-app-bindings.js`: target modules can resolve active-pack labels, terminology, accent, route query, and boundary copy. Food Delivery consumes confirmed `dispatch -> Food Delivery` bindings as hero title, read-only context banner, route-context preservation, and safe Nearby default, Calendar consumes the `reservation -> Calendar` binding as title/context treatment, and Map consumes the `transit -> Map` binding as title/context treatment, without changing restaurants, menus, carts, orders, delivery events, schedules, push state, Wallet, Map trip/location truth, or Chat ownership.
- Current product direction is the older, lower-complexity entry model: WorldBook stays under Settings/contextual links, and World Pack selection/activation should appear inside the full WorldBook management page.
- The remaining World Pack global-effects work is to harden and broaden the world UX package for existing apps: labels, terminology, accents, context banners, and safe UX variants should appear in each actual target app without moving source-module ownership.
- New product direction from PM discussion: later "nonstandard apps" should be generated as confirmed World Pack appBindings from a built-in archetype/template registry, not as new code modules. The registry/review seam is now in `src/lib/world-app-template-registry.js`, and the Current World Pack panel exposes AI extraction plus pasted-JSON review before confirmation with explicit loading, empty, parse/API error, and rejected-state treatment in an advanced review area. AI may read active WorldBook context to propose matching entries, but only against the guarded registry; mismatched, low-confidence, unsupported, or unconfirmed proposals should not appear in App Store and should not affect ordinary app behavior. `black_market` is currently blocked with `needs_dedicated_app` so it does not masquerade as Shopping. Confirmed entries now have regression coverage through App Store detail/open, Home placement/launch, Map target-app context for `transit_pass`, Calendar target-app context for `reservation_board`, and Food Delivery target-app context for `dispatch_board`.

PM meaning:

- WorldBook is becoming the shared world-context layer;
- Book is the long-text editing and storage workspace, not a novel reader, public file manager, or world-store shell;
- World Pack should assemble defaults from WorldBook and existing app archetypes, not replace WorldBook as a second lore source; built-in service-account defaults can be user-edited/reset in Chat Services, and AI/pasted service candidates now use a reviewed proposal flow that confirms templates without auto-subscribing users;
- World Pack activation should feel like choosing the current world configuration, not like shopping in a separate storefront; after activation, the changed UI/UX should appear in the actual app and global app-entry surfaces, not only inside Settings;
- World Pack provides an immersive default layer, but user customization should remain first-class. Global Appearance CSS and Chat-scoped CSS already sit above World Pack defaults; the root app shell now exposes stable `data-app`, `data-route-scope`, `data-world-pack`, and `data-world-app` hooks; Appearance stores app/world-app scoped CSS in `settings.appearance.scopedCustomCss` with an active World Pack entry picker, manual fallback, exact target preview, pause/clear recovery controls, and predictable app-vs-world-app layer order; and Appearance packs now export/import portable visual settings without copying Home layout, widgets, or Chat-specific appearance;
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
- Shopping can now consume the active World Pack's marketplace app binding as context only: `补给站` changes the entry label, explanation, and default filter, while Shopping still owns catalog, cart, checkout, orders, logistics review, and downstream suggestions.
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
- Food Delivery can now show active World Pack dispatch context for built-in `survival_city` / `survival_dispatch` and confirmed nonstandard `dispatch_board` entries as a visible UX package hero/banner and safe Nearby default while still owning all food-order truth.
- Calendar can now show active World Pack reservation context for `fandom_parallel` / `fandom_schedule_board` as visible title/context/boundary treatment while still owning confirmed schedules, time edits, reminder promotion, and push scheduling.
- Map can now show active World Pack transit context for `survival_city` / `survival_safe_route_pass` as visible title/context/boundary treatment while still owning route, trip, location, ETA, shared-route facts, and Map-derived Calendar handoff.
- A guarded random pilot exists for active orders.
- The automatic event safe-list currently allows non-destructive ETA-update / rider-delay style Food Delivery outcomes and a conservative Chat role greeting candidate that still goes through Event Runtime review.
- Delivered orders can now mark a selected contact as a shared-meal target when recorded into Wallet, creating a low-impact relationship memory.

PM meaning:

- Food Delivery is still the best low-risk event-runtime pilot lane;
- shared-meal memory now supports relationship continuity without forcing hidden inference.

### Event Runtime / World Hub

- `simulationStore` persists event logs, cooldowns, daily caps, module enablement, Surprise Mode, and foreground tick settings.
- A shared event engine handles condition checks, logs, cooldowns, caps, and adapter exceptions.
- Food Delivery has the first safe automatic pilot.
- World-aware event variants exist as a standard direction.
- Generated Chat social events such as greetings, refusal, block, restore, and unblock now enter here as reviewed social/channel events from Chat AI proposal output or the foreground/session runtime greeting source, not as direct Chat or Contacts writes.
- Settings > AI Automation / 设置 > AI 自动响应 has an opt-in `事件前台 Tick / Foreground event tick` control. It now explains the current safe-check range, including `外卖安全事件 / Food Delivery safety events` and `角色主动联系候选 / Role proactive contact candidate`, shows the latest related runtime result, and links users to `世界中枢 / World Hub` for detailed review.
- Settings > AI Automation / 设置 > AI 自动响应 also exposes `惊喜模式 / Surprise Mode` and current `模块事件权限 / Module event permissions` for Chat role-contact events and Food Delivery safety events, so users can tell whether randomness is off, conservative, balanced, or high, and whether each app lane may receive runtime events.
- App lifecycle wiring exists for foreground ticking only when the user enables it.
- World Hub reads simulation runtime state and relationship runtime review data.
- Relationship pending-confirmation effects can be approved or dismissed from World Hub.
- World Hub can also approve or dismiss high-risk generated Chat social proposals before Chat applies the communication state, and it now explains whether a proposal came from Chat AI output or the foreground/session event tick.

PM meaning:

- the runtime is now a reusable base, not a one-off trick inside one module;
- World Hub is still intentionally narrow and optional.

## 3. What Is Not Finished

- visual rebuild is not finished;
- World Hub still does not offer broad user-facing sliders, freeform overrides, funds editing, affinity editing, or unlock editing;
- event runtime has one module-side automatic safe-list path, the Food Delivery ETA/rider-delay pilot, plus a reviewed Chat runtime greeting proposal path;
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
  - runtime memory-count fields now describe the full target state before display caps, so compact UI requests do not undercount total, visible, or archived memory groups;
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
- World Hub can now show read-only relationship gate audit details on relationship facts and review high-risk generated Chat social proposals. This is review metadata and confirmation flow, not a new broad editor or Cheats surface.
2. Continue the relationship-growth event system through safe adapters.
   - relationship progress and character growth should use one shared truth layer instead of scattered module-local fields.
3. Keep user-facing explanation for automatic foreground events readable as new safe checks are added; the current Settings control already exposes the switch, check range, latest result, and World Hub review path.
4. Keep World Hub controls narrow until event logs and Settings controls are trusted.

### P1: Build Useful Cross-Module Loops

1. Preserve the 4.2 memory dedupe baseline and 4.3 World Hub review-pack baseline.
2. Keep relationship runtime, Contacts, and Chat aligned on one memory truth layer.
3. Preserve the 4.4 service-notification boundary: Chat stores messages and source links, source modules own business state.
4. Continue Map and delivery integration as read-only context, not ownership transfer.

### P2: Expand World-Aware Gameplay Carefully

1. User-test the Book import/export -> WorldBook source activation -> changed-source diff review -> World Pack activation -> Chat/runtime context loop on phone-sized devices.
2. User-test the WorldBook -> `补给站` -> Shopping filter path, `救援调度` -> Food Delivery hero/banner/default Nearby view, `fandom_schedule_board` -> Calendar reservation context, and `survival_safe_route_pass` -> Map transit context on phone-sized devices.
3. User-test and harden global World Pack app-entry unlocking now that world-specific apps appear in App Store/App Library/Home placement rules.
4. User-test Appearance pack import/export plus scoped CSS recovery, and add finer selectors only where needed.
5. Harden and broaden the world UX package seam for app labels, terminology, accents, contextual banners, and safe UX variants.
6. User-test and polish the guarded nonstandard-app review flow now that the UI exists: loading, empty, parse/API error, rejected proposals, confirmed `transit_pass`, confirmed `reservation_board`, and confirmed `dispatch_board` are covered by regression tests, but phone-sized copy/readability still needs product review.
7. Generate or confirm world-specific event packs from WorldBook and the active World Pack.
8. Broaden user-approved service/subscription account opt-in beyond the current active-pack service-account V1, then exercise ready source notification plans from source modules without making Chat own source records.
9. Deepen generated Chat social-event sources only through Event Runtime review, keeping Chat as the applied communication owner; the V1 foreground/session greeting source and World Hub explanation layer are landed, while richer scheduling and high-risk behavior remain guarded.
10. Add task/unlock systems behind World Hub, keeping World Hub and Cheats separate from WorldBook authoring.
11. Add more adapters through the shared event engine.

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
- Which next app archetype should be promoted after the current Shopping marketplace, Food Delivery dispatch, Calendar reservation, and Map transit trials: auction, subscription, or publication feed.
- Whether later world-specific app entries should ever auto-place on Home after activation; the current seam only makes them recoverable/placable through App Store/App Library.
- Which existing apps should consume the next world UX package slice beyond Shopping, Food Delivery, Calendar, and Map.
- Which built-in nonstandard-app templates should ship first, and what confidence/evidence threshold AI extraction needs before proposing them.
- Whether the next scoped custom CSS step should prioritize finer component selectors, phone-sized authoring polish, or pack-sharing recovery QA.
- Whether true closed-page background events are worth backend complexity.
- Whether Wallet should support editable fictional funds soon or remain downstream first.

## 6. Recommended Next Engineering Slice

Recommended next:

Move from the completed 4.4 service-account continuity slice to the next roadmap lane: safe architecture cleanup and the next promoted product package, unless PM asks for a focused polish pass. The focused WorldBook B-plan is now trial-ready: `Settings -> WorldBook` shows active world state and the `Current World Pack` activation panel, while `world-interface` anchors Chat, runtime world-context reading, active Book source links, and active World Pack metadata. Book V1 is now the text library for long worldbooks and reusable notes, with import/export, section activation, changed-source warning, diff review, and reviewed refresh flows ready for phone-sized user testing. Active-pack service-account templates can now be edited/reset, AI-reviewed, and user-confirmed from Chat Directory's `Services` management area instead of being created from WorldBook. The first concrete app-archetype V1 is also trial-ready: `survival_city` opens Shopping as `补给站` and can apply a safe Daily Fresh / Grocery filter without moving Shopping records into World Pack. Active world app bindings now unlock globally into App Store/Home/App Library placement as `world_app_*` entries; the first world UX package target-app seam is live for Shopping, Food Delivery dispatch context, Calendar reservation context, and Map transit context; Appearance packs can import/export portable visual layers; and the nonstandard-app template registry now has a whitelist/review UI with loading/error/empty/rejected states plus confirmed `transit_pass`, `reservation_board`, and `dispatch_board` regression coverage. The next World Pack slice should broaden safe UX variants only where user testing proves the target-app experience is clear.

Why:

World Pack service-account status update: active-pack built-in service/official account candidates can now be edited/reset in Chat Directory `Services` before the user subscribes, and Chat Services can review AI/pasted candidates from active WorldBook/World Pack context. Confirmation only adds a World Pack template; users still subscribe manually, and WorldBook still does not create Chat accounts. Confirmed/joinable templates and joined service threads now show descriptive source notification plans for supported Shopping/logistics/Food Delivery event streams. The next service-account slice should exercise those ready plans from concrete source modules without moving source-module records into Chat.

- role ID, relationship-runtime ownership, memory-group APIs, delete/reset orchestration, backup/restore, and Contacts 4.1 detail IA are now in place as a baseline;
- fragmented memory summaries are controlled for current explicit source-id chains;
- primary-led recall summaries are now available for Chat prompt context, and UI-facing review summaries are used by Contacts and World Hub;
- Calendar relationship review detail now exposes lineage and duplicate-growth status without forcing that audit language into default Contacts/World Hub summaries;
- World Hub now supports filtered event-log and relationship-fact review with selected-detail explanations, and can review high-risk generated Chat social proposals while still deferring broad value, funds, unlock, and freeform override controls.
- Shopping/logistics/Food Delivery now push Chat service-notification messages without transferring order, wallet, or route ownership.
- World Pack Shopping context now changes entry semantics and filters without transferring catalog, cart, checkout, order, Wallet, Assets, Calendar, or Chat ownership.

Fallback same-size task:

- add another read-only World Hub explanation slice only if PM/QA finds a concrete review gap;
- polish service-notification visual language only if product review asks for it; the functional 4.4 baseline is complete.
- expand the world-pack design only after phone-sized testing confirms the current Book/WorldBook/World Pack/Shopping V1 path is clear, because the remaining archetypes are a multi-slice architecture lane rather than a small polish task.
- use `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md` and `docs/superpowers/plans/2026-05-29-book-text-library-worldbook-plan.md` when another machine takes over the Book/WorldBook source-library work.

## 7. Workflow And Skill Reading Path

Use this file as the PM entry point, then read:

- `docs/roadmap/TODO_ROADMAP.md` for the live engineering board;
- `docs/pm/TASK_PACKAGE_INDEX.md` for package ownership;
- `docs/process/AI_WORK_MODE.md` for workflow rules and top-level skill routing;
- `docs/process/DEVELOPMENT_TOOLING.md` for skill inventory and setup assumptions;
- `docs/process/EVENT_WORKFLOW.md` for event/runtime lane skill usage;
- `docs/process/VISUAL_WORKFLOW.md` for visual/IA lane skill usage.

This matters because the skill guidance is not lost, but intentionally split by workflow lane.
