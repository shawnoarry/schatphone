# SchatPhone Project Master Guide

Updated: 2026-08-09

## 1. Purpose And Status Method

This is the main whole-project overview for product, design, QA, engineering, and incoming AI assistants.

Use it to understand:

- what SchatPhone is;
- how the product and code are organized;
- what is complete, partial, guarded, or deferred;
- which risks matter now;
- which documents control execution.

This guide does not claim one synthetic “project completion percentage.” A single number would mix stable infrastructure, integrated V1 features, unfinished visual quality, and deferred product decisions. Current progress is reported through four evidence-based states:

- `Stable`: a core path is usable, tested, and safe to build on;
- `Integrated V1`: the cross-module loop works, but product hardening remains;
- `Partial / Guarded`: a narrow baseline exists and broader behavior is intentionally constrained;
- `Deferred / Decision`: work must not start without a new decision.

Concrete execution status belongs only in `docs/roadmap/TODO_ROADMAP.md`.

## 2. Product Definition

SchatPhone is a local-first immersive virtual-phone and AI life-simulation product.

The intended experience combines:

1. a believable phone shell with lock screen, Home, notifications, and app-like modules;
2. a role, world, relationship, schedule, location, media, commerce, and finance workspace;
3. AI conversation and story continuity that stays behind normal phone interactions where possible;
4. optional event/runtime review without making ordinary use feel like an administration console;
5. an extensible app system where each module owns its records and shared seams coordinate context, storage, media, events, and diagnostics.

The product is no longer a prototype shell. It is an integrated local-first V1 with uneven depth: the core communication/world/relationship loops are substantial, while final visual quality, production hardening, true-device QA, and some secondary modules remain incomplete.

## 3. Frozen Product Boundaries

### 3.1 Contacts, Chat Directory, Chat, Relationship Runtime

- `Contacts / 通讯录` owns the global role archive, concrete role/self/NPC profile values, role-centered destructive actions, and read-only relationship review.
- `Chat Directory / Chat 通讯录` owns Chat-side role binding, groups, and service/official account subscription management.
- `Chat` owns conversations, messages, rich cards, applied communication state, and manual message actions.
- `Relationship Runtime` owns current metrics, stage, milestones, memory groups, and confirmed continuity facts.
- Chat compatibility fields such as `relationshipLevel` and `relationshipNote` are local tuning/annotation only.

### 3.2 Book, WorldBook, World Pack

- `Book / 文本库` owns reusable long-form worldviews, world rules, and encyclopedia text.
- `WorldBook / 世界书` owns activation, selected Book links/sections, knowledge bindings, profile-template definitions, and active-world review.
- `World Pack / 世界包` owns reviewed capability bundles such as app bindings, service templates, terminology, currencies, and compatible extensions.
- Target apps retain their business records. A World Pack app binding is launch/presentation context unless a narrower explicit contract says otherwise.

### 3.3 Calendar, Reminders, Map

- `Calendar / 日历` owns confirmed schedule/date events and push scheduling.
- `Reminders / 提醒事项` owns raw cross-module cues, callbacks, follow-ups, and future objective/task cues.
- `Map / 地图` owns location, route, trip, ETA, familiarity, and travel continuity.
- Raw reminder cues do not write relationship facts; confirmed Calendar events may do so through the shared relationship adapter path.

### 3.4 Commerce And Finance

- Shopping and Food Delivery own catalog/menu, cart, checkout, order, and source-event truth.
- Logistics is a tracking/communication lane, not a storefront.
- Wallet owns downstream ledger records, primary currency, and exchange-rate settings.
- Assets owns durable owned-object records; Stock owns its own simulated market/holding lane.
- Chat service notifications store source references and presentation snapshots, not copied business truth.

### 3.5 World Hub, Cheats, Push

- `World Hub / 世界中枢` is an optional review and narrow-control app.
- `Cheats` is not a finished product surface.
- the Node push relay schedules/delivers push payloads; it is not a closed-page simulation backend.

## 4. Verified Repository Baseline

Inventory date: 2026-07-31. Validation rows distinguish current local integration evidence from remaining remote and physical-device proof.

| Evidence | Result |
| --- | --- |
| Git baseline | local `main` at `f36dc9fd20fe22f1ff0be145fe2b672c54d1b4e3` before this architecture documentation commit |
| Source scale | 238 JavaScript/Vue files / 131,038 lines under `src` |
| Application shape | 40 route-view files, 17 Pinia stores, 44 Vue components under `src/components`, 37 JavaScript composables |
| Unit-test inventory | 210 static `*.test.js` files / 1497 passing tests in the current local run |
| Validation posture | current local gates and desktop/Pixel 5 restricted-relay evidence pass; remote Pages/direct-provider Chat and Git-connected Vercel/Cloudflare `ced45db` root baselines are proven. The dynamic relay is unpushed; deployed relay, installed-PWA, external-protection, named physical-device, and independent audit proof remain open |
| Dependency audit | production and full audits are clean after the accepted compatible transitive lock refresh; independent rerun availability remains a release-evidence concern |

Build-size signals:

- main entry chunk: about 482 KB, 145 KB gzip;
- Chat route chunk: about 217 KB, 67 KB gzip;
- Book store/content chunk: about 130 KB, 47 KB gzip;
- large route chunks remain acceptable for the current local-first V1, but future splitting should be driven by measurements and user impact.

Test limitations:

- there is no coverage threshold or published branch/statement coverage metric;
- CI definitions run lint, unit, build, both audit scopes, and full Playwright; remote Pages execution is proven, while external enforcement remains unverified;
- current E2E is browser emulation, not real-device QA;
- push delivery, browser permission behavior, weak-network recovery, and provider-specific AI behavior still require environment/manual testing.

## 5. Functional Progress

### 5.1 Roadmap Closure

Four major lanes have reached current acceptance:

1. Contacts V2 detail IA and memory presentation;
2. explicit-lineage relationship-memory dedupe and recall;
3. World Hub review quality before stronger controls;
4. Shopping/logistics/Food Delivery service-account continuity.

Active or incomplete:

- architecture, security, CI, and documentation maintenance is active;
- World Pack/App Archetype/Service Template is an integrated V1 with phone QA and hardening remaining;
- the K-pop 2 + 6 + 1 Book/WorldBook content carrier is landed while Mini Scene runtime remains separately staged;
- Camera/shared image generation has a focused V1, Food Delivery has five independent shop facades, and the world-bound Map baseline includes the integrated OpenFreeMap renderer plus 35 versioned Seoul places.

### 5.2 Module Completion Matrix

| Product area | State | What is real now | Main remaining gap |
| --- | --- | --- | --- |
| Lock / Home / shell | `Stable` | lock guard, status shell, notifications, Home pages, Today View, app/folder/widget placement, App Store recovery | final device-level visual/touch polish; Home remains a large view |
| Settings / Network | `Stable` | URL-first AI provider setup, backup/restore, storage diagnostics, automation, push, appearance, software update shell | credential-export policy, production security guidance, push/provider environment QA |
| Chat | `Stable, heavy` | role/service/group threads, AI replies, rich messages, message edit/delete/recall/save, Chat appearance, service subscriptions, social-event review | deeper group speaker orchestration, real-device media flows, large-view/store maintainability |
| Contacts / relationship | `Stable V2 baseline` | role archive, role IDs, Self/Main/NPC, WorldBook fields, relationship snapshot/classification, memory review/source audit, guarded cleanup | template-adaptation visual diff, richer template authoring, later polish; high-impact automation remains deferred |
| Book / WorldBook | `Integrated V1` | Book source library, section activation, changed-source review, active-world context, knowledge/profile templates, K-pop 2 + 6 + 1 carrier | phone trial hardening and separately staged Mini Scene profile work |
| World Pack / App Store | `Integrated V1` | compatible packs, world app entries, guarded app/service proposals, target-app context, currencies | true-device end-to-end testing, broader target-app hardening, next archetype decision |
| Map / Calendar / Reminders / Phone | `Map partial; schedule/phone stable MVP` | world-bound Seoul/cyber-wasteland packs, integrated OpenFreeMap with local fallback, 35 versioned Seoul places, custom image intake/generation, pins/trips, confirmed schedule, raw cue inbox, push and callback adapters | true-device gestures/offline-cache proof, package authoring, PMTiles/transit decisions, and richer cue/task semantics |
| Shopping / Food Delivery / Logistics | `Integrated V1` | product/menu/order flows, five independent Food Delivery shop facades over one runtime, Wallet/Map/Chat handoffs, service notifications | prove one ordinary cross-module consequence flow; tracking share and later polish remain separate |
| Wallet | `Stable support` | sourced ledger, currencies, primary currency, exchange rates, Chat/commerce integration | cleanup/explainability polish; deeper economy remains a product decision |
| Gallery | `Stable platform service` | shared media assets, binary storage, image-source contracts, cross-module references | stronger Photos-like collections/visual polish; relationship-memory authoring stays deferred |
| Camera / Image Generation | `Focused V1` | Camera capture/settings, shared provider adapters, bounded candidates, explicit Gallery keep, public-config backup | Gallery People/reference curation, source callers, hosted-provider and true-device proof |
| Assets / Stock | `Usable but shallow` | persisted MVP records and supporting connectors | deeper user-facing loops and clearer rollout value |
| Event Runtime / World Hub | `Partial / Guarded` | logs, cooldowns, caps, foreground tick, safe Food Delivery pilot, Chat social proposal audit/review | richer scheduling and adapters, stronger controls only after safety decisions; no closed-page backend autonomy |
| Appearance / visual system | `Partial` | themes, wallpaper, widgets, app icons, app skins, Chat appearance, global/scoped CSS ownership | cross-module visual consistency and real-device polish remain unfinished |
| Files | `Internal` | hidden metadata/index compatibility surface | must not become a normal public app without a new decision |

## 6. Technical Stack

Current installed baseline:

| Area | Technology |
| --- | --- |
| UI | Vue 3.5.27 with Composition API and `<script setup>` |
| Routing | Vue Router 5.0.2, hash history |
| State | Pinia 3.0.4 |
| Build | Vite 7.3.6 and `@vitejs/plugin-vue` 6.0.4 |
| Styling | Tailwind CSS 4.1.18 plus project CSS/tokens and Font Awesome 7.1.0 |
| Text rendering | Marked 17.0.1 |
| Unit/component tests | Vitest 4.1.10, jsdom, Vue Test Utils |
| E2E | Playwright 1.60.0 |
| Quality | ESLint 9, Prettier 3 |
| Push relay | Node HTTP server plus `web-push` 3.6.7 |
| Language | application source is JavaScript/Vue; TypeScript is installed but there are zero `.ts/.tsx` source files |

The stack is appropriate for the current product. No framework rewrite is recommended. The most recent Map source audit reported 0 production vulnerabilities and 10 high development-only findings in existing ESLint/Vue Test Utils tooling paths; the controller's current rerun was blocked because the configured npm mirror does not implement the audit endpoint.

## 7. Architecture

### 7.1 Shell And Routing

Primary files:

- `src/main.js`: app/bootstrap, mobile viewport guards, deferred icons, service-worker registration;
- `src/App.vue`: phone shell, notification banners, global appearance layers, automation/push lifecycle coordination;
- `src/router/index.js`: lazy route modules and lock guard.

The app is a static SPA deployed under `/schatphone/` with hash routing. Most route views are lazy-loaded, while central stores/shared helpers remain in common chunks.

### 7.2 State Ownership

Sixteen stores exist:

| Store | Primary owner |
| --- | --- |
| `system` | settings, Home placement, appearance, notifications, AI/network config, world compatibility state, automation queue |
| `chat` | role profiles, Chat Directory contacts, groups/service accounts, conversations/messages, Chat AI preferences |
| `relationshipRuntime` | relationship facts, metrics, stages, milestones, memory groups, pending confirmations |
| `simulation` | runtime logs, cooldowns, caps, module permissions, execution metadata |
| `book` | long-form text assets |
| `gallery` | media assets and binary-reference ownership |
| `map` | locations, routes, trips, familiarity, route context |
| `calendar` | confirmed events and push schedule state |
| `reminders` | raw cues and handling state |
| `shopping` | products, cart, orders, logistics events |
| `foodDelivery` | restaurants, menus, cart, food orders, delivery events |
| `wallet` | sourced transactions and currencies |
| `assets` | durable asset records |
| `stock` | simulated stock/watchlist state |
| `phone` | call/callback records |
| `files` | internal metadata/index state |

Domain-store separation is sound overall. The main exception is `systemStore`, which has become a broad infrastructure and compatibility bucket.

### 7.3 Shared Contract Layer

Important seams include:

- `src/lib/ai.js`: approved text/conversation AI transport entry;
- `src/lib/image-generation-contract.js`, `src/lib/image-generation-api.js`, and `src/stores/imageGeneration.js`: dedicated shared image-generation transport, configuration, task, and candidate boundary;
- `src/lib/persistence.js`: version envelopes, local writes, IndexedDB mirroring, inspection, and reconciliation;
- `src/lib/relationship-fact-adapters.js`: low-impact cross-module facts;
- `src/lib/role-binding-contract.js`: Contacts/Chat role context;
- `src/lib/world-interface.js`: active world context for Chat and runtime;
- `src/lib/world-pack-app-bindings.js`: reviewed world-app entry and target context;
- `src/lib/shareable-object.js`: source-owned rich sharing;
- focused composables that expose narrower view/store interfaces.

### 7.4 Persistence

- primary synchronous persistence is namespaced browser `localStorage`;
- IndexedDB mirrors the same serialized envelopes by default and can repair layer drift;
- Gallery binaries use a separate binary-storage path while metadata remains in stores;
- each domain store owns hydration, migration, snapshot, and save behavior;
- Settings backup/restore coordinates all stores and supports rollback plus optional Gallery asset packages.

Security implication: backup currently exports `settings` wholesale, which includes the configured AI API key. Backup files must therefore be treated as sensitive until a credential-export policy is implemented.

### 7.5 AI And Runtime

- browser-side text/conversation AI requests go through `src/lib/ai.js`, while image requests go through the dedicated Image Generation Module;
- URL detection supports Gemini native, OpenAI-compatible chat, OpenAI Responses, Anthropic Messages, Azure OpenAI, and local/server-auth gateways;
- prompt assembly consumes WorldBook, role profile, self profile, relationship, and thread context through explicit helpers/composables;
- foreground automation is opt-in and local-session based;
- high-impact social proposals use runtime audit and World Hub review before Chat state changes.

### 7.6 Push And Deployment

- the PWA service worker and Node relay support subscriptions, scheduled payloads, cancellation, retry, and delivery;
- the relay persists VAPID keys, subscriptions, and schedules in local JSON files;
- it has permissive CORS and no authentication, so it is a development/single-operator relay, not a production multi-user backend;
- GitHub Pages deploys the static client; the relay is not deployed by that workflow;
- true closed-page event generation is not implemented.

### 7.7 Appearance Ownership

Visual ownership is intentionally split:

- global Appearance owns theme, wallpaper, global CSS, and shell-level portable settings;
- App Store/app owners own app icon identity and standard app skins;
- scoped app/world-app CSS stays app/world-specific;
- Chat Appearance owns Chat layout and Chat CSS;
- Home/Widgets own layout and widget records.

Global Appearance pack export/import includes only global portable fields such as theme, wallpaper, status-bar/haptic settings, global CSS, variables, and lock-clock style. It excludes app icons, app skins, app/world-app scoped CSS, Home layout/widgets, and Chat appearance.

## 8. Architecture And Product Risks

### P0: Security And Toolchain

1. backup JSON includes locally stored AI credentials through the full settings snapshot;
2. the most recent Map source audit reported 0 production vulnerabilities and 10 high development-only findings; the configured npm mirror currently blocks an independent controller rerun;
3. the push relay is not authenticated or production hardened;
4. local AI keys and world/chat data rely on the browser/profile security boundary, not encryption at rest.

### P1: Maintainability

Largest current files:

- `FoodDeliveryView.vue`: 10329 lines;
- `ContactsView.vue`: 5232 lines;
- `ChatView.vue`: 4776 lines;
- `system.js`: 4644 lines;
- `HomeView.vue`: 4373 lines;
- `ChatDirectoryView.vue`: 4122 lines;
- `WorldBookView.vue`: 4093 lines.

`systemStore` is imported by 24 of 40 route views. Focused composables have reduced inline logic, but the files remain mixed-responsibility hotspots.

### P1: Release Confidence

- CI and Pages workflow definitions include E2E and both dependency-audit scopes, but remote runs and external required-check/environment protection remain unverified;
- OpenFreeMap local integration and focused desktop/Pixel 5 interaction proof are complete; named physical-device gestures/offline-cache, deployed-network, remote CI, and independently rerunnable audit proof remain;
- no coverage threshold exists;
- mobile checks are emulated, not true-device checks.

### P1: Product Finish

- visual consistency is uneven across shell and large modules;
- World Pack flows need real phone testing;
- group orchestration, Assets, Stock, and several support loops are less deep than Chat/WorldBook/commerce;
- World Hub remains intentionally narrow and closed-page autonomy is undecided.

### P2: Contract Hardening

- application contracts are JavaScript-only and depend on normalizers/tests;
- some domain stores still receive concrete cross-owner stores through adapters;
- old compatibility fields and routes must remain contained until migrations can be removed safely.

## 9. Current Execution Direction

1. security/toolchain and credential-backup policy;
2. CI/release gating and one named architecture hotspot slice;
3. World Pack true-device validation and focused hardening;
4. decision on the K-pop content carrier split and first migration slice;
5. secondary-module or runtime expansion only after explicit promotion.

See `docs/roadmap/TODO_ROADMAP.md` for exact status and acceptance.

## 10. Reading Order

For implementation:

1. `docs/README.md`
2. this guide
3. `docs/roadmap/TODO_ROADMAP.md`
4. `docs/pm/TASK_PACKAGE_INDEX.md`
5. matching package `README.md`
6. matching package `STATUS_AND_HANDOFF.md`
7. `docs/process/AI_WORK_MODE.md`

For PM/design review:

1. `docs/pm/TODO_PM_STATUS_REPORT.md`
2. this guide
3. `docs/pm/PRODUCT_MANAGER_PROJECT_BRIEF.md`
4. `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`
