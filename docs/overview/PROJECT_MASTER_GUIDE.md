# SchatPhone Project Master Guide

Updated: 2026-06-01

## 1. Purpose

This is the main whole-project overview for product readers, designers, QA, and incoming AI engineers.

Use this file to understand:

- what SchatPhone is;
- which product direction is current;
- how the major modules relate to each other;
- which docs to read next.

If an older document conflicts with this file, use this file together with `docs/roadmap/TODO_ROADMAP.md` as the current reference.

## 2. Product Definition

SchatPhone is an immersive virtual-phone product.

It is not just a chat UI and not just a module playground. The intended experience is:

1. a believable phone shell with lock screen, Home, notifications, and app modules;
2. a local-first world, role, and life-simulation workspace;
3. an AI relationship and story system that stays behind the scenes as much as possible;
4. an extensible module ecosystem where each app owns its own records, while shared services coordinate storage, prompts, events, media, and diagnostics.

The product goal is to make the user feel they are living inside a coherent virtual phone world.

Events, growth, tasks, and numeric systems are allowed, but they should support immersion rather than make the product feel like a visible admin panel or a rigid task manager.

## 3. Key Product Boundaries

These boundaries are now frozen at the product level unless a later decision explicitly changes them.

### 3.1 Contacts vs Chat Directory

- `Contacts` is the global role archive and role-centered management hub.
- `Chat Directory` is the Chat-side contact list and binding surface.
- A role can exist in Contacts without being bound into Chat.
- Unbinding a role in Chat Directory must not delete the Contacts role profile.

### 3.2 Chat vs Relationship Runtime

- `Chat` owns message history, thread behavior, and manual chat-message deletion.
- `Relationship Runtime` owns relationship progress, memory groups, milestones, and compact continuity summaries.
- Legacy Chat-side fields such as `relationshipLevel` or `relationshipNote` are compatibility or light-annotation fields only.
- Chat Directory now labels those legacy fields as Chat-local tuning/note, not `Affinity` or current relationship progress.

### 3.3 Calendar vs Reminders

- `Calendar` owns confirmed schedule/date meaning.
- `Reminders` owns cross-module cue queues, callbacks, follow-ups, logistics reminders, and future objective/task cues.
- Raw reminder cues must not directly write relationship facts; they must first become confirmed Calendar events.

### 3.4 World Hub vs Cheats

- `World Hub` is the optional runtime review and narrow-control app.
- `Cheats` belongs to the same future control family, but is not yet a completed product surface.
- Neither should become the normal user path for everyday data entry.

## 4. Current State Snapshot

Project stage: stable core shell plus immersive-expansion baseline.

Already stable enough to build on:

1. `Lock -> Home -> Chat / Settings` main path;
2. local-first persistence, backup/restore, and storage diagnostics baseline;
3. Chat manual trigger flow plus optional richer prompt context;
4. global role profiles, profile-side relationship premise/classification storage, Chat-side role binding, and relationship-runtime baseline;
5. Gallery as shared media center for cross-module asset references;
6. Map simulation baseline with trip/location context;
7. Calendar and Reminders split baseline;
8. low-impact relationship fact adapters across several modules;
9. optional World Hub runtime review baseline.

Still not final:

1. visual rebuild across the shell and several major modules;
2. full Contacts detail IA polish;
3. stronger World Hub controls and frozen Cheats design;
4. deeper product loops for some secondary modules such as Assets and Stock.
5. world-driven app and service-account templating beyond the current service-notification baseline.

Immediate active lane:

- 4.2 memory dedupe has reached current acceptance for explicit-lineage chains across Phone callback, Shopping gift plus Calendar delivery follow-up, Food Delivery shared meal plus Wallet support, Shopping gift plus Wallet support, and Map shared-route plus Map-derived Calendar follow-up.
- relationship runtime now separates prompt-facing `recallSummary` from UI-facing review summaries, so Chat can keep source context while Contacts and World Hub show product-facing related-record copy.
- relationship runtime summary counts are now full target-state counts independent of display caps, so short UI memory lists no longer undercount total, visible, or archived memories.
- Calendar now exposes relationship review detail on confirmed events, including lineage, target, memory role, and duplicate-growth status.
- 4.3 World Hub review quality now has a complete review-pack baseline: event logs and relationship facts can be filtered, selected, and inspected with product-facing explanations before any stronger controls are considered.
- 4.4 service-account continuity is now landed for Shopping checkout, Shopping logistics events, Food Delivery checkout, and Food Delivery order events. Chat stores notification messages with source references and route actions, while Shopping/Food Delivery/Wallet/Map keep the authoritative business state.
- the V1 WorldBook baseline now uses the older entry model: `Settings -> WorldBook -> Current World Pack`, with active-world overview and a shared `world-interface` seam feeding Chat, runtime worldview fallback, active Book source links, and the active World Pack. World Pack V1 now has persisted packs, activation review, one-active-pack-per-save semantics, and service-account template availability. WorldBook no longer creates Chat Directory entries directly; it shows the enabled service-account count, while Chat Directory's `Services` management area lets the user opt into current-world service/official account candidates through the Chat-owned idempotent create/reuse seam. The first concrete app-binding path remains `survival_city` opening Shopping as `补给站` with a safe Daily Fresh / Grocery filter; other archetypes remain guarded. The first global app-entry seam is now landed: active World Pack app bindings become stable `world_app_*` entries in App Store and Home/App Library placement flows, then launch target apps with `worldPack`/`worldApp` route context. Current World Pack only shows the active snapshot and tells users that world entries live in the App Store `World` section; it does not provide App Store jump buttons or per-app launch links inside Settings. The world UX package now has a first target-app seam through shared `world-pack-app-bindings` context: Shopping, Food Delivery, Calendar, and Map can show active-pack title/context/boundary copy and safe default views without moving source-module ownership.
- World Pack service-account candidates are now user-adjustable before subscription: Chat Directory's `Services` management area can edit and reset built-in active-pack service/official account candidates, storing user overrides on the World Pack template metadata. Chat Services also has the reviewed AI/pasted candidate lane for service/official accounts: proposals read active WorldBook/World Pack context, low-confidence/duplicate/unknown-binding suggestions are blocked, and confirmation only adds a World Pack template. Joining still creates/reuses a Chat-owned subscription entry, later candidate edits do not silently overwrite already joined accounts, and source notification plans now show which Shopping/logistics/Food Delivery event streams become ready after join without auto-subscribing or creating source records.
- the current World Pack UX slice adds `transit -> Map` as a concrete target-app context: `survival_city` now includes `survival_safe_route_pass`, and Map can show the active-pack transit title/context/boundary banner while keeping route, trip, location, ETA, and shared-route facts owned by Map.
- the guarded World Pack direction is not "AI creates new apps". It is a built-in nonstandard-app archetype/template registry plus AI extraction from active WorldBook context. The Current World Pack panel now exposes the review UI as an advanced/collapsible review area: AI or pasted JSON can propose matching entries, loading/empty/error/rejected states are explicit, the whitelist/normalizer separates confirmable vs rejected items, and user confirmation writes an appBinding to the active pack only. The confirmed-entry path is now covered through App Store detail/open, Home library placement/launch, and Map target-app context for a generated `transit_pass`; `reservation_board` is covered from confirmation through App Store open into Calendar context; and `dispatch_board` is covered from confirmation through App Store open into Food Delivery context with a safe Nearby default. `black_market` is deliberately blocked with `needs_dedicated_app` and does not map onto Shopping. Rejected or unconfirmed proposals stay out of App Store and normal apps continue unchanged.
- Appearance customization remains a core freedom layer. Global CSS and Chat-scoped CSS already exist; `src/lib/app-shell-scope.js` now gives the root app shell stable `data-app`, `data-route-scope`, `data-world-pack`, and `data-world-app` hooks, and `src/lib/appearance-scoped-css.js` plus the Appearance Advanced CSS sheet now provide app/world-app scoped CSS authoring through `settings.appearance.scopedCustomCss`. The World App scoped editor can choose from the active World Pack's current app entries while keeping manual targets as fallback, and it exposes target selectors plus pause/clear recovery controls; when app-scoped and world-app-scoped CSS both target the same element, the world-app layer is narrower and emitted later. Appearance packs can now export/import portable visual settings, including theme, wallpaper, icon overrides, global CSS, and scoped CSS, without copying Home layout, widgets, or Chat-specific appearance.
- Book text-library V1 now exists as a separate app for long worldbook documents, knowledge notes, rules, glossary text, and reusable references. `Settings -> WorldBook` remains the activation panel that links whole documents or selected Book sections into active world context.
- the Book source chain is now tested through the consumer path: Chat prompt context, Chat thread summary, and runtime world-context resolution all receive active Book source text through explicit `bookStore` adapters.
- Chat App now has a clearer messaging-app shell: `Messages`, `Objects`, `Groups`, `Services`, and `Me`. The main message list stays immersive while binding, group management, and service accounts have explicit control layers; the top-right gear opens dedicated Chat Settings, `Me` owns Chat identity/anonymity and recent social data, and Chat Settings owns appearance plus maintenance diagnostics.
- incoming Chat social/channel states such as greetings, accepted/declined requests, blocks, and being-blocked markers now have both a direct Chat-side V1 shell and a generated-event review seam. User actions still happen inside Chat; Chat AI responses can return optional normalized social proposals, the foreground/session runtime can propose conservative role greetings for stranger or declined role contacts, and role refusal/block/restore/unblock proposals wait for World Hub review before Chat applies the communication state. World Hub explains proposal source, trigger policy, and safety boundaries; Contacts displays role-level snapshots only, and relationship runtime records only confirmed relationship facts or memories.
- Chat Directory relationship compatibility containment is landed: legacy `relationshipLevel` and `relationshipNote` are still persisted for binding compatibility, but visible copy now calls them Chat-local tuning/note and states that current relationship truth is owned by relationship runtime.
- relationship classification Rounds 1 through 4 are landed for the profile/store/AI/Contacts/event surface: Contacts role profiles can persist free-text relationship premise fields, initial seed values, and stored category/modifier classification metadata; `src/lib/relationship-label-classifier.js` classifies labels through `src/lib/ai.js` plus shared JSON parsing; the Contacts detail page shows the read-only current relationship runtime snapshot first, then edits the profile-side relationship premise, seed, category, modifiers, and classification audit. High-confidence AI results save as `ai_auto`, medium/low confidence requires confirmation before `ai_confirmed`, manual edits save as `user_edited`, existing `user_edited` classifications remain protected from silent AI overwrite, and event/runtime reads saved classification fields rather than raw premise prose. Relationship runtime still owns current metrics, stage, milestones, and memories.
- relationship classification Round 4 is landed for the event/runtime seam: low-impact module facts attach read-only `relationshipGate` audit metadata derived from saved `primaryRelationshipCategoryId`, `relationshipModifierIds`, and classification audit fields only. Event gating does not read `relationshipLabelText` or `relationshipLabelNote`; named high-risk hard-gate presets now exist for tests/future event packs, but no new high-impact automation or event classes are enabled.
- fuzzy same-text memory merging remains out of scope until a later product decision.

## 5. Technical Stack

Current stack from `package.json` and `package-lock.json`:

1. Vue `^3.5.24` (locked `3.5.27`)
2. Vue Router `^5.0.2` (locked `5.0.2`)
3. Pinia `^3.0.4` (locked `3.0.4`)
4. Vite `^7.2.4` (locked `7.3.1`)
5. Tailwind CSS `^4.1.18` (locked `4.1.18`)
6. Vitest `^1.6.0` with jsdom (locked `1.6.1`)
7. ESLint 9 plus Prettier 3

## 6. Core Architecture

### 6.1 App Shell

The shell owns:

- lock state;
- Home and app entry navigation;
- top-level route switching;
- theme, wallpaper, and shell-level behavior.

Important files:

- `src/App.vue`
- `src/main.js`
- `src/router/index.js`

### 6.2 State Layer

Major stores:

- `src/stores/system.js`
  - system settings
  - appearance, including Chat-scoped appearance preferences and custom CSS
  - notifications
  - backup/restore hooks
  - general user profile and worldview settings
- `src/stores/chat.js`
  - role profiles
  - profile-side relationship premise and stored classification metadata
  - Chat Directory contacts and service accounts
  - conversations and messages
  - service notification messages with source references, not copied order state
  - thread-level AI preferences
- `src/stores/relationshipRuntime.js`
  - relationship metrics
  - memory groups
  - milestones
  - pending confirmations
- `src/stores/reminders.js`
  - cross-module cue queues
- `src/stores/map.js`
  - local trip and location simulation
- `src/stores/simulation.js`
  - event runtime logs, cooldowns, caps, and runtime execution metadata
- `src/stores/book.js`
  - reusable text-source library for long worldbook material and knowledge/reference documents, separate from hidden Files indexing

### 6.3 Service And Utility Layer

Important shared seams:

- `src/lib/ai.js`
  - the only approved entry point for AI requests
- `src/lib/persistence.js`
  - local persistence and storage-layer migration helpers
- `src/lib/chat-response.js`
  - assistant payload parsing and fallback extraction
- `src/lib/relationship-fact-adapters.js`
  - shared seam for cross-module relationship facts

Rule: views and components should not invent their own provider-calling logic or relationship-truth layer.

## 7. Current Functional Modules

### 7.1 Lock Screen

- default entry route;
- unlock guard;
- notification return path.

### 7.2 Home

- app grid and widgets;
- hidden or optional app entry handling;
- folder-style grouping for some module families.

### 7.3 Settings

- backup/restore;
- diagnostics;
- automation;
- push behavior;
- appearance and general system settings.

### 7.4 Network

- provider URL and key setup;
- model selection;
- diagnostics.

### 7.5 Chat

- user messages and AI invocation;
- thread-level preferences;
- rich message surfaces;
- service-account style communication;
- service-account notifications with source module/id references and route actions;
- group-chat targets with Chat-side member ids and reply-mode metadata;
- compact relationship context consumption.
- Chat-local settings routes for Chat appearance, default behavior entry points, maintenance diagnostics, and the user/social `Me` surface.

### 7.6 Contacts and Chat Directory

- `/contacts`: global role archive and role-centered management
- `/chat-contacts`: Chat-side binding and service-account management

This split is important. They are related, but they are not the same product surface.

### 7.7 Gallery

- shared media center;
- cross-module asset references;
- local image intake before structured module consumption when appropriate.

### 7.8 Map

- local trip and route simulation;
- route context for other modules;
- exploration and location continuity.

### 7.9 Calendar and Reminders

- Calendar: confirmed schedule/date surface
- Reminders: cross-module cue surface

### 7.10 Shopping, Logistics, Food Delivery, Wallet, Assets, Stock

- Shopping and Food Delivery own their own business records;
- Logistics is a delivery/tracking-facing surface, not a storefront;
- Wallet is the downstream ledger, not the owner of orders;
- Assets and Stock are separate future-deepening lanes.
- world-specific variants should register these modules through app archetypes and world app bindings instead of copying their business records into WorldBook. The first landed examples are `marketplace -> Shopping`, `dispatch -> Food Delivery`, `reservation -> Calendar`, and `transit -> Map`, where World Pack provides entry/context/UX language while the target apps still own catalog, carts, orders, delivery events, schedules, push state, route/trip truth, and downstream suggestions.
- when a World Pack changes an app's UI/UX, that change should be visible in the actual target app and global entry surfaces, not only described inside Settings or WorldBook.
- user customization is allowed to sit above World Pack defaults. The app shell now exposes stable scoped hooks for app id, route scope, world pack id, and world app id, and Appearance can store scoped custom CSS for app/world-app targets plus import/export portable Appearance packs; future CSS work should continue targeting those hooks instead of implementation-only utility classes.

### 7.11 World Hub

- optional hidden-by-default runtime review/control app;
- can inspect event runtime and relationship runtime;
- currently remains narrow and safer than a full cheat console.

### 7.12 Book / Text Library Direction

- visible app-like text workspace for long worldbooks, knowledge notes, rules, glossary material, and reusable references;
- reachable as `Book`, while product copy can describe it as a text library;
- does not replace `Settings -> WorldBook`, because WorldBook owns activation and injection governance;
- does not replace `Files`, because Files remains a hidden/internal metadata and storage-index component;
- imports/creates/edits/exports text assets and exposes active-source state for WorldBook links;
- supports trial-ready WorldBook activation through whole-document links, selected-section links, changed-source warning, and source-version refresh;
- active Book sources are expected to affect Chat prompt context and runtime world-context resolution, not only the WorldBook settings page;
- future novel, fanfic, or reader-style features should use a different module name and not overload Book.

## 8. Data And Storage Model

Current storage direction:

1. local-first persistence is the baseline;
2. domain stores own their own product records;
3. shared services coordinate persistence, media references, prompt assembly, and diagnostics;
4. relationship runtime stores compact continuity data, not full copies of module-owned records;
5. backup/restore must preserve user-visible continuity without collapsing module boundaries.

## 9. AI Interaction Rules

1. all AI requests must go through `src/lib/ai.js`;
2. manual trigger must remain clear and available in Chat;
3. system language controls UI text, not the meaning of AI-generated content;
4. prompt assembly can use worldview, role, memory, and thread context, but should preserve clear ownership boundaries;
5. modules should degrade gracefully when an AI feature is disabled or unavailable.
6. relationship-label classification uses the shared AI seam and only expresses the confidence/save policy; event/runtime gating reads saved classification fields, not raw premise prose, and current Round 4 only adds low-risk audit metadata plus named helper-level high-risk hard-gating presets.

## 10. Documentation Reading Order

If you are taking over coding work:

1. `docs/README.md`
2. this file
3. `docs/roadmap/TODO_ROADMAP.md`
4. `docs/pm/TASK_PACKAGE_INDEX.md`
5. the matching package `README.md`
6. the matching package `STATUS_AND_HANDOFF.md`
7. the matching package boundary and workstream docs
8. `docs/process/AI_WORK_MODE.md`

If you are reviewing product status:

1. `docs/pm/TODO_PM_STATUS_REPORT.md`
2. this file
3. `docs/strategy/PROJECT_ITERATION_PLAN.md`
4. `docs/pm/TASK_PACKAGE_INDEX.md`

## 11. Collaboration Rules For Incoming AI Engineers

1. read this file and `docs/roadmap/TODO_ROADMAP.md` before coding;
2. use `docs/pm/TASK_PACKAGE_INDEX.md` to pick the correct task package;
3. always read the package `STATUS_AND_HANDOFF.md` before changing code;
4. after each meaningful round, sync the required docs in `docs/process/AI_WORK_MODE.md`;
5. do not let code semantics outrun product semantics in the docs.

## 12. Current High-Value References

- `docs/process/AI_WORK_MODE.md`
- `docs/pm/TASK_PACKAGE_INDEX.md`
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
- `docs/architecture/ROLE_BINDING_CONTRACT.md`
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`
