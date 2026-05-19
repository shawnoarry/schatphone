# SchatPhone Product Manager Brief

Updated: 2026-05-19

Purpose: this is the PM-facing one-page brief for current direction, delivered baseline, and near-term priorities.

Use this file when a product manager, designer, QA partner, or incoming AI assistant needs the fast answer to:

- what SchatPhone is now;
- what is already real versus still experimental;
- which product boundaries are frozen;
- what should be prioritized next.

For exact bilingual module labels, pair this brief with:

- `docs/pm/MODULE_NAME_GLOSSARY.md`
- `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`
- `docs/pm/TODO_PM_STATUS_REPORT.md`
- `docs/roadmap/TODO_ROADMAP.md`

## 1. Product Positioning

SchatPhone is an immersive virtual-phone product.

It is not just a chat interface and not just a collection of toy modules. The intended experience is:

1. a believable phone shell with lock screen, Home, notifications, and app-like modules;
2. a local-first role, world, and life-simulation workspace;
3. an AI relationship and story system that stays mostly behind the scenes;
4. a modular product where each app owns its own records while shared services coordinate storage, media, events, push, and diagnostics.

Short version:

> a local-first virtual phone where relationships, world context, and everyday module actions form one coherent life loop.

## 2. What Is Frozen At Product Level

These boundaries should now be treated as stable unless a later explicit decision changes them:

1. `Contacts` vs `Chat Directory`
   - `Contacts` is the global role archive and the role-centered management hub.
   - `Chat Directory` is the Chat-side binding list and service-account entry surface.
2. `Chat` vs `relationship runtime`
   - `Chat` owns message history and thread behavior.
   - `relationship runtime` owns relationship truth, milestones, and memory groups.
3. `Calendar` vs `Reminders`
   - `Calendar` owns confirmed schedule and date meaning.
   - `Reminders` owns raw cues, callbacks, and follow-up style prompts.
4. `World Hub` vs future `Cheats`
   - `World Hub` is optional review and narrow runtime control.
   - `Cheats` is still a future stronger override lane.
5. `Files`
   - `Files` is an internal metadata/index component, not a normal public app.
6. `Photos`
   - `Photos` is asset-first and atmosphere-first for now, not the mainline relationship-memory authoring surface.

## 3. What Already Works Now

### Shell baseline

The product already has:

- lock screen, Home, notifications, and app-entry behavior;
- Settings, Appearance, backup/restore, diagnostics, and push settings;
- a shell strong enough to support deeper module work.

### Chat and role continuity

The product already has:

- Chat as the strongest everyday interaction surface;
- Contacts and Chat Directory as separate product surfaces;
- role profiles, Chat-side role binding, and relationship-runtime baseline;
- compact relationship context flowing back into Chat.

### Shared world and media layers

The product already has:

- WorldBook as a shared worldview and reusable knowledge layer;
- Photos as the shared media center;
- cross-module asset references instead of duplicated media ownership.

### Map / Calendar / Reminders lane

The product already has:

- Map as a real route and location-context module;
- Calendar as a confirmed schedule/date app;
- Reminders as a cross-module cue surface;
- push scheduling and notification handoff on top of confirmed events.

### Commerce and support loops

The product already has:

- Shopping and Food Delivery as real app lanes rather than placeholders;
- Wallet as a downstream ledger lane;
- module-to-relationship fact adapters for safe low-impact continuity;
- support modules such as Phone, Assets, and Stock at real MVP level.

### Runtime and optional control

The product already has:

- a shared event-runtime foundation;
- a narrow World Hub baseline for runtime review and cleanup;
- guarded foreground automation and delivery-only push baseline.

## 4. What Is Still Not Finished

These areas are real, but not finished:

1. broad visual rebuild across the shell and several major modules;
2. full Contacts V2 detail IA and role-detail polish;
3. stronger World Hub detail and readability before broader controls;
4. deeper long-term loops for some secondary modules;
5. a final decision on true closed-page backend autonomy.

## 5. Current PM Priorities

### P0: keep runtime and memory systems safe and understandable

Focus:

1. keep relationship and memory truth compact and deduped;
2. keep Calendar and Reminders ownership clean;
3. improve review quality before broadening automation;
4. keep World Hub narrow and optional.

### P1: deepen useful cross-module loops

Focus:

1. finish Contacts V2 detail IA and memory-management presentation;
2. keep Chat, Contacts, and relationship runtime aligned on one truth layer;
3. continue safe commerce and service-account continuity;
4. keep Map and delivery integration as context, not ownership transfer.

### P2: expand world-aware gameplay carefully

Focus:

1. deepen event variants and runtime packs through existing shared seams;
2. add task and unlock concepts only behind the World Hub lane;
3. grow support modules only when they strengthen continuity.

### P3: return to visual rebuild later

Visual rebuild remains intentionally deferred until ownership and runtime semantics are more stable.

## 6. Decisions Still Needed Later

These still need later product decisions:

1. whether closed-page backend autonomy is worth the complexity;
2. what default event intensity should be for normal users;
3. when, if ever, Cheats becomes a frozen surface rather than a placeholder concept;
4. which world-aware event families should be prioritized after runtime review quality improves;
5. when Wallet should remain downstream-only versus gain deeper editable economy systems.

## 7. Best Next Slice

The cleanest next product slice is still:

> finish the Contacts V2 detail IA and memory-management presentation layer.

Why:

- delete/reset/memory cleanup seams now exist;
- relationship runtime truth is real enough to surface better;
- the main weakness is no longer plumbing, but product-grade explanation and organization.

Fallback same-size slice:

- tighten text/event-first relationship-memory dedupe and recall rules;
- improve World Hub review readability.

## 8. Reading Path

If you want current PM truth:

1. `docs/pm/TODO_PM_STATUS_REPORT.md`
2. this file
3. `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`
4. `docs/pm/MODULE_NAME_GLOSSARY.md`
5. `docs/roadmap/TODO_ROADMAP.md`

If you want module-by-module detail:

1. `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`
2. the split category docs under `docs/pm/product-module-feature-catalog/`

## 9. Change Log

1. 2026-04-07: created as a PM-focused consolidated brief.
2. 2026-05-19: rewritten to remove mixed-encoding residue, align with the current ownership model, and point PM readers to the modern roadmap/task-package/doc-workflow structure.
