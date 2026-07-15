# SchatPhone Architecture

Updated: 2026-07-16

## 1. Architecture Goals

SchatPhone is a static, local-first Vue application organized around:

1. a phone shell and lazy route modules;
2. Pinia domain stores with one product owner per record family;
3. shared contracts for AI, persistence, world context, relationship facts, media, and app entries;
4. a small optional Node push relay for delivery, not world-state authority;
5. tests and documentation as semantic guardrails for cross-module boundaries.

Primary goals:

- keep the Lock/Home/Chat/Settings path stable;
- preserve user data across migrations and backup/restore;
- prevent shell or control surfaces from absorbing domain records;
- keep AI transport replaceable and explicit;
- grow World Pack/runtime features through reviewed contracts;
- reduce the cost of working in large product-critical files.

## 2. Runtime Topology

```text
Browser / static SPA
  App shell + hash router
    Route views
      Focused components/composables
        Pinia domain stores
          Shared lib contracts
            localStorage primary state
            IndexedDB serialized mirror
            Gallery binary storage
            external AI provider APIs
            optional push relay

GitHub Pages
  hosts only the built static SPA

Optional Node push relay
  stores VAPID config, subscriptions, and schedules in local JSON
  sends Web Push payloads
  does not own app state or generate world events
```

The application uses Vue Router hash history and Vite base `/schatphone/`, so static hosting does not need server route rewriting.

## 3. Technical Stack

| Concern | Current baseline |
| --- | --- |
| UI | Vue 3.5.27, Composition API, `<script setup>` |
| Router | Vue Router 5.0.2, hash history |
| State | Pinia 3.0.4 |
| Build | Vite 7.3.1, plugin-vue 6.0.4 |
| Styling | Tailwind CSS 4.1.18, shared CSS tokens, Font Awesome 7.1.0 |
| Long text | Marked 17.0.1 |
| Unit tests | Vitest 1.6.1, jsdom, Vue Test Utils |
| E2E | Playwright 1.60.0 |
| Quality | ESLint 9, Prettier 3 |
| Push | Node HTTP, `web-push` 3.6.7, service worker |
| Source language | JavaScript and Vue; TypeScript dependency exists but no `.ts/.tsx` application files |

## 4. Shell And Route Layer

### `src/main.js`

Owns:

- Vue/Pinia/router bootstrap;
- CSS and deferred icon loading;
- mobile viewport/gesture guards;
- deferred push service-worker registration.

### `src/App.vue`

Owns:

- the visual phone shell and global status/home indicators;
- global/scoped/Chat appearance style injection;
- Gallery-backed wallpaper resolution;
- foreground notification banner queue;
- root automation tick coordination;
- foreground simulation lifecycle;
- push startup self-heal and Chat auto-push scheduling.

`App.vue` is about 1049 lines and coordinates several infrastructure owners. Future work should prefer focused shell services/composables when adding lifecycle behavior.

### `src/router/index.js`

Owns:

- lazy route imports;
- compatibility redirects;
- the global lock guard.

There are 30 route views. Normal user-facing modules are lazy-loaded. `/files` is internal/compatibility, `/control-center` is optional World Hub, and `/more` redirects to Settings.

## 5. State Layer

SchatPhone has 16 Pinia stores.

| Store | Owned records and responsibility |
| --- | --- |
| `system` | system/API/push settings, appearance, Home/App Store placement, notifications, reports, user/world compatibility state, automation queue |
| `chat` | role profiles, Chat Directory contacts, groups/service accounts, conversations/messages, Chat-side social state and AI prefs |
| `relationshipRuntime` | current relationship facts, metrics, stage, milestones, memory groups, review state, pending confirmations |
| `simulation` | event/runtime logs, cooldowns, caps, permissions, Surprise Mode, execution metadata |
| `book` | reusable long-form text assets |
| `gallery` | media metadata, binary references, categories, cross-module asset operations |
| `map` | location, destination, route, trip, ETA, familiarity, travel context |
| `calendar` | confirmed events, event time changes, push schedule state, confirmed relationship handoff |
| `reminders` | raw cross-module cue queue and handling state |
| `shopping` | products, cart, orders, logistics events, commerce handoffs |
| `foodDelivery` | restaurants, menus, cart, food orders, delivery events |
| `wallet` | sourced transactions, currency registry, primary currency, reference rates |
| `assets` | durable owned-object records |
| `stock` | stock/watchlist/simulated market state |
| `phone` | call log and callback records |
| `files` | internal metadata/index bridge |

### State Ownership Rules

1. domain stores own domain records;
2. shared stores may carry references and compact snapshots, not copied truth;
3. shell settings do not become business records;
4. World Hub reviews runtime state but does not become the source of ordinary app data;
5. compatibility fields stay contained until a tested migration removes them.

### `systemStore` Concentration

`src/stores/system.js` is about 4186 lines and is imported by 22 of 30 route views. It currently spans appearance, Home, app placement, notification, API/network, push, world compatibility, automation, backup reminders, and user/system settings.

The preferred strategy is stable facades, not a big-bang store split:

- `useSystemNotifications.js` and `useSystemApiReports.js` are existing examples;
- new facades must preserve the storage key and backup shape until a separate migration is approved;
- one ownership area should move behind an interface per slice.

## 6. Shared Contract Layer

### AI

`src/lib/ai.js` is the only approved provider transport entry.

It supports:

- Gemini native;
- OpenAI-compatible chat;
- OpenAI Responses;
- Anthropic Messages;
- Azure OpenAI;
- local/server-auth gateway URL shapes.

Views and stores may build domain prompts/context, but they must not implement provider HTTP calls independently.

Full assembled prompts, raw provider responses, headers, and transport payloads are transient transport/diagnostic material rather than persistent product truth. Any artifact that an owning module formally publishes, confirms, applies, or admits into revisitable/continuity-bearing history becomes that module's durable canonical content regardless of user/AI/system origin. Durable storage therefore includes committed module content, authoritative state/facts, cross-module references, validated structured proposals/effects, and minimum provenance. Full-payload capture requires an explicit temporary diagnostic mode with hard limits and user clearing.

### World Context

- `world-interface.js` produces shared active-world context for Chat and runtime;
- `book-text-schema.js` and `bookStore` own long text assets;
- `world-pack-schema.js`, compatibility helpers, app bindings, service templates, and proposal registries normalize reviewed capability data;
- target apps receive route/context metadata and retain business ownership.

### Role And Relationship

- `role-binding-contract.js` normalizes Contacts-to-Chat role context;
- `relationship-fact-adapters.js` accepts low-impact module facts;
- `relationship-event-gating.js` reads stored category/modifier classifications, never raw premise prose;
- relationship runtime owns memory grouping and current state;
- cleanup helpers remove or anonymize source-linked data through explicit handlers.

### Media And Sharing

- `image-source-contract.js` normalizes URL/Gallery/project asset sources;
- Gallery owns user media and preview lifecycle;
- `shareable-object.js` carries source-owned share cards into Chat;
- cards keep source ids/routes and a display snapshot, not editable source business state.

### Entry And Appearance

- Home/App Store registries normalize apps, folders, mini apps, and world entries;
- app-shell scope attributes provide stable CSS targets;
- global Appearance, app identity/skins, world-app scoped CSS, Chat appearance, and Home/widgets remain separate owners.

Global Appearance packs export only global portable fields. They exclude:

- `appIconOverrides`;
- `appSkins`;
- `scopedCustomCss` for app/world-app targets;
- Home placement and widgets;
- Chat appearance.

## 7. Persistence And Backup

### Layered Persistence

`src/lib/persistence.js` uses:

1. namespaced `localStorage` as the synchronous primary layer;
2. IndexedDB as an asynchronous serialized mirror by default;
3. versioned envelopes with `version`, `savedAt`, and `data`;
4. inspection/reconciliation that selects the newest valid layer and repairs drift.

Each store supplies its own normalization, hydration, migration, and snapshot logic. This keeps legacy data handling close to the domain owner.

Confirmed target direction, not current implementation:

- browsers and installable PWAs remain complete first-class clients;
- IndexedDB becomes the primary structured store behind domain repository contracts, while `localStorage` becomes small hot state and recovery metadata;
- authoritative history/evidence requires explicit user deletion and may otherwise move only into reversible cold archives;
- committed content records are durable regardless of user/AI/system origin, while full AI transport payloads, uncommitted drafts, and rebuildable projections are not retained by default;
- optional remote backup uses separate user-owned Cloudflare R2 destinations rather than one project/workgroup cloud, keeps local state authoritative, and remains provider-neutral below the first officially guided R2 adapter;
- each personal R2 destination is reached through that user's Cloudflare Worker gateway; the client may retain a revocable, scoped device token but must not retain an R2 API Secret;
- remote backup is encrypted on the client and supports either a recovery password or a separately downloaded recovery file; Cloudflare/Worker receives no plaintext recovery secret, losing both paths is irreversible, and setup must verify recovery before automatic backup is ready;
- ordinary browser/PWA automation may run after launch and while the app is open, but remote backup is not live server storage, cross-device sync, automatic merge, or guaranteed closed-app scheduling;
- Gallery is the reusable media/material owner, generated media remains source-module candidate state until the user confirms retention, and URL/local/provider source is independent of the asset's image/sticker/GIF/audio meaning;
- selective cloud inclusion, exact-byte protection for URL sources, and backup-only versus verified-R2 local-cache offload remain an explicit product gate; no fixed `8 GB` budget or per-generation three-way storage prompt is approved;
- no persistence migration begins until the data classes, backup/integrity contract, migration/rollback path, quota behavior, multi-tab policy, and one reference slice are approved.

### Gallery Binaries

Gallery metadata participates in store backup. Binary assets use a dedicated storage helper and are optional in exported backup packages with size/item limits.

### Backup/Restore

Settings coordinates:

- snapshots for all 16 stores and system state;
- optional Gallery binary packaging;
- schema validation;
- ordered restore;
- rollback if import fails;
- storage diagnostics and reports.

Current security gap:

- backup payload includes `settings` directly;
- `settings.api.key` is therefore exported in plaintext JSON;
- backup files must be treated as secrets until policy and code change;
- complete local migration backup is confirmed to retain configured credentials and therefore requires an explicit sensitive-file warning; a redacted/shareable export and encrypted personal remote backup are separate future contracts.

## 8. Cross-Module Data Flows

### Chat AI Reply

```text
Chat thread
  -> role binding context
  -> WorldBook/Book active context
  -> relationship runtime summary
  -> thread history and optional media references
  -> src/lib/ai.js
  -> normalized assistant result
  -> Chat message history
  -> optional social proposal -> Event Runtime / World Hub review
```

### Relationship Fact

```text
Owning module explicit event
  -> relationship fact adapter
  -> classification gate audit
  -> relationship runtime
  -> primary/supporting memory grouping
  -> Contacts/World Hub review and Chat recall summary
```

### Service Notification

```text
Shopping / logistics / Food Delivery source event
  -> existing joined Chat service account
  -> service_notification with source references/actions
  -> Chat thread/unread/reply state
  -> source action returns to owning module
```

### World App Entry

```text
WorldBook reviewed World Pack
  -> app binding registry
  -> App Store / Home placement
  -> target route with worldPack/worldApp context
  -> target app resolves presentation/defaults
  -> target store remains record owner
```

## 9. Event Runtime And Push

### Foreground Runtime

- runs only while the application/session lifecycle allows it;
- uses module permissions, Surprise Mode, cooldowns, caps, safe conditions, and logs;
- current automatic families are deliberately conservative;
- high-risk Chat social proposals wait for review.

### Push Relay

`server/push-server.mjs` supports:

- VAPID key generation/loading;
- subscribe/unsubscribe;
- schedule/list/cancel;
- retry and delivery;
- health and test endpoints.

Its boundary is important:

- JSON-file persistence;
- no authentication/authorization;
- permissive CORS;
- no rate limiting, tenancy, encrypted secret store, or authoritative app data;
- suitable for local/single-operator trials, not a public multi-user production service.

## 10. Testing, CI, And Deployment

### Local Baseline

- ESLint;
- 172 Vitest files / 1054 tests;
- Vite production build;
- 30 Playwright scenarios across desktop and mobile emulation.

### CI

`.github/workflows/ci.yml` runs Node 20, `npm ci`, lint, unit tests, and build.

Gaps:

- no Playwright job;
- no dependency-audit job;
- no coverage threshold;
- local audit used Node 22 while CI uses Node 20, so both supported environments should remain tested intentionally.

### Deployment

`.github/workflows/deploy.yml` builds and deploys `dist` to GitHub Pages on `main`.

It does not deploy the push relay. The deploy job also runs only build, so workflow/repository protections must ensure failed quality checks cannot be interpreted as a validated release.

## 11. Current Debt And Direction

Highest-risk files:

- `ContactsView.vue` 4754 lines;
- `ChatView.vue` 4312 lines;
- `system.js` 4186 lines;
- `WorldBookView.vue` 4130 lines;
- `HomeView.vue` 3920 lines;
- `ChatDirectoryView.vue` 3802 lines.

Other debt:

- direct store-to-store coupling across some ownership boundaries;
- no compile-time contract layer;
- development dependency advisories;
- CI/release gaps;
- incomplete true-device and push/provider QA.

Recommended order:

1. credential/toolchain and release-gate decisions;
2. one measured hotspot or facade slice;
3. one deeper cross-store adapter;
4. incremental types for shared contracts only;
5. broader World Pack/runtime features after the foundation remains green.

## 12. Documents To Read With This One

- `docs/overview/PROJECT_MASTER_GUIDE.md`
- `docs/roadmap/TODO_ROADMAP.md`
- `docs/architecture/ARCHITECTURE_DEBT_REVIEW.md`
- `docs/architecture/ROLE_BINDING_CONTRACT.md`
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
- `docs/architecture/SIMULATION_EVENT_ENGINE.md`
