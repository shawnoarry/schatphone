# SchatPhone Project Master Guide

Updated: 2026-05-29

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
4. global role profiles, Chat-side role binding, and relationship-runtime baseline;
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
- Calendar now exposes relationship review detail on confirmed events, including lineage, target, memory role, and duplicate-growth status.
- 4.3 World Hub review quality now has a complete review-pack baseline: event logs and relationship facts can be filtered, selected, and inspected with product-facing explanations before any stronger controls are considered.
- 4.4 service-account continuity is now landed for Shopping checkout, Shopping logistics events, Food Delivery checkout, and Food Delivery order events. Chat stores notification messages with source references and route actions, while Shopping/Food Delivery/Wallet/Map keep the authoritative business state.
- the V1 WorldBook baseline now uses the older entry model: `Settings -> WorldBook -> Current World Pack`, with active-world overview and a shared `world-interface` seam feeding Chat, runtime worldview fallback, active Book source links, and the active World Pack. World Pack V1 now has persisted packs, activation review, one-active-pack-per-save semantics, user-approved service-account template generation into Chat Directory, and the first concrete app-binding path: `survival_city` opens Shopping as `补给站` with a safe Daily Fresh / Grocery filter; other archetypes remain guarded.
- Book text-library V1 now exists as a separate app for long worldbook documents, knowledge notes, rules, glossary text, and reusable references. `Settings -> WorldBook` remains the activation panel that links whole documents or selected Book sections into active world context.
- the Book source chain is now tested through the consumer path: Chat prompt context, Chat thread summary, and runtime world-context resolution all receive active Book source text through explicit `bookStore` adapters.
- fuzzy same-text memory merging remains out of scope until a later product decision.

## 5. Technical Stack

Current stack from the codebase:

1. Vue `3.5.24`
2. Vue Router `5.0.2`
3. Pinia `3.0.4`
4. Vite `7.2.4`
5. Tailwind CSS `4.1.18`
6. Vitest `1.6.1` with jsdom
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
  - appearance
  - notifications
  - backup/restore hooks
  - general user profile and worldview settings
- `src/stores/chat.js`
  - role profiles
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
- compact relationship context consumption.

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
- world-specific variants should register these modules through app archetypes and world app bindings instead of copying their business records into WorldBook. The first landed example is `marketplace -> Shopping`, where World Pack provides the `补给站` entry context and Shopping still owns catalog, cart, checkout, orders, and downstream suggestions.

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
