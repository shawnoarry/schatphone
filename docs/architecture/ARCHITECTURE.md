# SchatPhone Architecture

Updated: 2026-08-09

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
            Music local-audio storage
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
| Build | Vite 7.3.6, plugin-vue 6.0.4 |
| Styling | Tailwind CSS 4.1.18, shared CSS tokens, Font Awesome 7.1.0 |
| Long text | Marked 17.0.1 |
| Unit tests | Vitest 4.1.10, jsdom, Vue Test Utils |
| E2E | Playwright 1.60.0 |
| Quality | ESLint 9, Prettier 3 |
| Push | Node HTTP, `web-push` 3.6.7, service worker |
| Source language | JavaScript and Vue; TypeScript dependency exists but no `.ts/.tsx` application files |

## 4. Shell And Route Layer

### `src/main.js`

Owns:

- Vue/Pinia/router bootstrap;
- bounded local/mirror preparation before Pinia Store creation and application mount;
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

There are 41 route-view files. Normal user-facing modules are lazy-loaded. `/music` is a first-class installed app, `/files` is internal/compatibility, `/control-center` is optional World Hub, and `/more` redirects to Settings.

## 5. State Layer

SchatPhone has 18 Pinia stores.

| Store | Owned records and responsibility |
| --- | --- |
| `system` | system/API/push settings, appearance, Home/App Store placement, notifications, reports, user/world compatibility state, automation queue |
| `chat` | role profiles, Chat Directory contacts, groups/service accounts, conversations/messages, Chat-side social state and AI prefs |
| `relationshipRuntime` | current relationship facts, metrics, stage, milestones, memory groups, review state, pending confirmations |
| `simulation` | event/runtime logs, cooldowns, caps, permissions, Surprise Mode, execution metadata |
| `book` | reusable long-form text assets |
| `gallery` | media metadata, binary references, categories, cross-module asset operations |
| `imageGeneration` | public image-provider profiles/defaults/routing, device-local credential references, bounded candidates, and generation tasks |
| `music` | Music library, favorites, playlists, queue/radio construction, playback and floating-player policy/runtime facade, direct URL/local-file intake, public provider profiles, device-local credential/media access, and Chat/Map projections |
| `map` | location, destination, route, trip, ETA, familiarity, travel context, and active-journey media presentation |
| `calendar` | confirmed events, event time changes, push schedule state, confirmed relationship handoff |
| `reminders` | raw cross-module cue queue and handling state |
| `shopping` | products, cart, orders, logistics events, commerce handoffs |
| `foodDelivery` | restaurants, menus, cart, food orders, delivery events |
| `wallet` | sourced transactions, currency registry, primary currency, reference rates |
| `assets` | durable owned-object records |
| `stock` | stock/watchlist/simulated market state |
| `phone` | call log and callback records |
| `files` | internal metadata/index bridge |

The accepted Calendar/Agenda Journey direction does not add another landed store to this table. A future `Schedule Orchestrator`, `Agenda Journey`, `Activity Session`, and `Narrative Timeline` require separately approved Interfaces, persistence owners, backup contracts, and migrations before implementation. Their ownership contract lives in `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`.

### State Ownership Rules

1. domain stores own domain records;
2. shared stores may carry references and compact snapshots, not copied truth;
3. shell settings do not become business records;
4. World Hub reviews runtime state but does not become the source of ordinary app data;
5. compatibility fields stay contained until a tested migration removes them.

### `systemStore` Concentration

`src/stores/system.js` is 4808 lines and is imported by 25 of 41 route views. It currently spans appearance, Home, app placement, notification, API/network, push, world compatibility, automation, backup reminders, Music's compatibility-carried public state, and user/system settings.

The preferred strategy is stable facades, not a big-bang store split:

- `useSystemNotifications.js` and `useSystemApiReports.js` are existing examples;
- new facades must preserve the storage key and backup shape until a separate migration is approved;
- one ownership area should move behind an interface per slice.

## 6. Shared Contract Layer

### AI And Image Generation

Provider transport is split by product meaning:

- `src/lib/ai.js` is the approved text/conversation AI transport entry;
- `src/lib/image-generation-contract.js`, `src/lib/image-generation-api.js`, and `src/stores/imageGeneration.js` form the dedicated shared Image Generation Module for Camera and separately promoted callers.

The text/conversation transport supports:

- Gemini native;
- OpenAI-compatible chat;
- OpenAI Responses;
- Anthropic Messages;
- Azure OpenAI;
- local/server-auth gateway URL shapes.

The Image Generation Module normalizes OpenAI-compatible Images/Edit, OpenAI-compatible Chat image output, and Grsai asynchronous generation behind one request/task/candidate boundary. Public provider/default/routing configuration participates in backup and rollback; API keys, proxy tokens, and temporary candidates remain device-local and excluded from ordinary backup.

Views and source stores may build domain prompts/context and decide why a request exists, but they must not implement provider HTTP calls independently of the matching shared transport module.

Full assembled prompts, raw provider responses, headers, and transport payloads are transient transport/diagnostic material rather than persistent product truth. Any artifact that an owning module formally publishes, confirms, applies, or admits into revisitable/continuity-bearing history becomes that module's durable canonical content regardless of user/AI/system origin. Durable storage therefore includes committed module content, authoritative state/facts, cross-module references, validated structured proposals/effects, and minimum provenance. Full-payload capture requires an explicit temporary diagnostic mode with hard limits and user clearing.

### Music

`docs/architecture/MUSIC_MODULE_CONTRACT.md` defines the implemented Music first slice:

- `music-contract.js` normalizes versioned public state, tracks, provider profiles, JSON response mappings, and GET/POST search requests;
- `chksz-music-adapter.js` owns ChKSz NetEase/QQ/Kugou search, user-action playback resolution, NetEase lyrics/playlist intake, quota metadata, bounded retry, and Key-redacted errors;
- `music-playback-runtime.js` is the sole browser `Audio` and Media Session runtime;
- `music-local-media-storage.js` owns the separate `schatphone-music-media` IndexedDB carrier for imported audio blobs and obeys the current-save writer boundary;
- `stores/music.js` owns the library/queue/playback/import facade while using `systemStore.settings.music` as the public metadata compatibility carrier;
- `music-module-interface.js` exposes bounded Chat/Map routes, capability discovery, track-share payloads, now-playing/quick-track projections, and deterministic library-backed journey-radio catalogs;
- `schatphone:music:credentials` stores provider API keys only on the current device and is excluded from ordinary backup;
- direct HTTPS URLs persist as Music tracks, while local binaries persist separately and become revocable object URLs only during playback;
- external route requests cannot directly start playback, and cross-module projections omit credentials, endpoints, headers, raw responses, queue contents, stream URLs, and local media IDs. Map's active-journey panel may delegate an explicit user click to Music-owned play/radio actions without receiving source or queue ownership.

The generic provider contract supports user-authorized JSON search APIs that return browser-playable HTTP(S) audio URLs. The dedicated ChKSz Adapter instead stores stable public source references and resolves an ephemeral stream URL only when the user presses Play; those URLs, lyrics, and quota/error projections remain outside durable state and Chat/Map payloads. Provider licensing, CORS, autoplay, mixed-content, expiring URLs, DRM, and proprietary signing remain explicit provider/browser constraints rather than capabilities SchatPhone can bypass.

### World Context

- `world-interface.js` produces shared active-world context for Chat and runtime;
- `book-text-schema.js` and `bookStore` own long text assets;
- `world-pack-schema.js`, compatibility helpers, app bindings, service templates, and proposal registries normalize reviewed capability data;
- target apps receive route/context metadata and retain business ownership.

### Mini Scene

`docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` defines an architecture-accepted shared Module whose pure Stage 1 foundation is now landed:

- registered callers such as Calendar, Map, Chat, and future streaming modules submit bounded source facts through one request Interface and retain source-record/trigger truth;
- Settings owns an explicit per-module unconfigured/off, text, or interactive-HTML choice; world/profile/caller suggestions cannot override it;
- Book narrative rules remain independent from separate `structured_json` Mini Scene transform profiles, and WorldBook narrative activation remains independent from Mini Scene profile binding;
- World Pack may reference a reviewed profile as an optional grouped capability but is not required for custom worlds and cannot auto-enable Book content;
- the Module owns world/profile resolution, structured artifact validation, bounded safe transforms, presenter selection, text fallback, and interaction audit;
- Text and sandboxed HTML Presenter Adapters form the presentation seam. Raw AI HTML and legacy Chat `htmlSnippet` remain inert;
- `mini-scene-contract.js`, `mini-scene-schema.js`, `mini-scene-module-registry.js`, `mini-scene-transform-profile.js`, and `mini-scene-profile-resolver.js` provide unreferenced/test-only contracts; the caller registry is empty and the regex layer validates without executing;
- no Mini Scene runtime or persistence is implemented yet, and its future owner/data classes are outside the approved Book Repository foundation pilot.

### Role And Relationship

- `role-binding-contract.js` normalizes Contacts-to-Chat role context;
- `relationship-fact-adapters.js` accepts low-impact module facts;
- `relationship-event-gating.js` reads stored category/modifier classifications, never raw premise prose;
- relationship runtime owns memory grouping and current state;
- cleanup helpers remove or anonymize source-linked data through explicit handlers.

### Media And Sharing

- `image-source-contract.js` normalizes URL/Gallery/project asset sources;
- Gallery owns user media and preview lifecycle;
- generated images remain bounded Image Generation Module candidates until an explicit Keep action creates a durable Gallery asset;
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
3. versioned envelopes with `version`, `savedAt`, `data`, and optional ordered `generation` metadata;
4. generation-based inspection/reconciliation before Store hydration, with `savedAt` and IndexedDB timestamps retained only for diagnostics.

Ordered envelopes use a stable non-empty lineage plus a positive safe-integer sequence. Same-lineage heads compare sequence without consulting clocks; same-generation byte differences and different-lineage data differences block reconciliation with zero writes. Malformed generation metadata is rejected as ordering evidence while a decodable owner payload remains an unordered recovery candidate. Equal canonical owner data may adopt or converge onto a fresh lineage, while divergent unordered legacy data remains `legacy_freshness_unknown`. Repair re-reads both heads before writing, verifies repaired bytes afterward, and keeps the selected readable winner when a repair is partial or fails; synchronous hydration returns no stale local value when that operational winner is the asynchronous mirror.

A disabled mirror is `not_applicable` and does not cause degraded/fork behavior. When the mirror feature is enabled, a missing, inaccessible, blocked, or failed IndexedDB carrier is applicable but `unavailable`: bounded degraded local service is allowed, the state is not fully reconciled, asynchronous writes report the failed mirror separately, and the next local write forks a fresh lineage. `fullyReconciled` requires empty applicable layers or a valid equivalent operational candidate; byte-identical corrupt heads are not sufficient. Deferred mirror precondition conflicts block later writes until reconciliation rather than being reduced to carrier warnings.

`src/main.js` prepares the independent 17-store audit inventory before any Pinia Store is instantiated or mounted. The legacy `store:book` carrier is explicitly repository-owned inspect-only, so its local and mirror bytes are never re-encoded or repaired; the other 16 layered owners are mutable in this bootstrap pass.

Each store supplies its own normalization, hydration, migration, and snapshot logic. This keeps legacy data handling close to the domain owner.

Confirmed target direction and current non-active foundation:

- browsers and installable PWAs remain complete first-class clients;
- IndexedDB becomes the primary structured store behind domain repository contracts, while `localStorage` becomes small hot state and recovery metadata;
- authoritative history/evidence requires explicit user deletion and may otherwise move only into reversible cold archives;
- committed content records are durable regardless of user/AI/system origin, while full AI transport payloads, uncommitted drafts, and rebuildable projections are not retained by default;
- optional remote backup uses separate user-owned Cloudflare R2 destinations rather than one project/workgroup cloud, keeps local state authoritative, and remains provider-neutral below the first officially guided R2 adapter;
- each personal R2 destination is reached through that user's Cloudflare Worker gateway; the client may retain a revocable, scoped device token but must not retain an R2 API Secret;
- remote backup is encrypted on the client and supports either a recovery password or a separately downloaded recovery file; Cloudflare/Worker receives no plaintext recovery secret, losing both paths is irreversible, and setup must verify recovery before automatic backup is ready;
- ordinary browser/PWA automation may run after launch and while the app is open, but remote backup is not live server storage, cross-device sync, automatic merge, or guaranteed closed-app scheduling;
- Gallery is the reusable media/material owner, generated media remains source-module candidate state until the user confirms retention, and URL/local/provider source is independent of the asset's image/sticker/GIF/audio meaning;
- choosing `keep` stores media locally first and never triggers backup; core save data is always included in backup, while one default-on whole-Gallery choice controls retained local binaries without per-item reselection;
- URL-backed media always preserves its original URL and minimum metadata rather than exact bytes, including when Gallery binaries are excluded;
- R2 remains recovery backup and never becomes the live media owner or permission to release local originals;
- manual backup is always available, automatic backup defaults off until the user opts in, and multiple versions are allowed only as complete independently importable packages rather than delta chains;
- local export uses a user-editable product-name-plus-date default and the platform save/share flow for destination selection;
- there is no internal local backup library: exported files remain in the platform file system and return only through user-selected import;
- a configured personal R2 exposes its backup-file list and direct restore inside SchatPhone, without a required Cloudflare-dashboard download or a hidden duplicate local backup store;
- in-app deletion permanently deletes the selected SchatPhone backup object from the connected personal R2 and requires a prominent cloud-deletion confirmation; the list row remains until the Worker confirms success;
- SchatPhone never rotates, expires, or deletes personal-R2 backups automatically; every version remains until explicit user-confirmed deletion, and quota pressure may warn or block a new backup but cannot silently remove an existing recovery point;
- complete-package and recovery acceptance is defined by `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md`; the roadmap 4.9 release-local v3 boundary now implements required-section manifests, integrity evidence, complete selected Gallery material, durable rollback checkpoints, startup crash recovery, legacy compatibility, and metadata/binary rollback, while predictive capacity and cross-owner root-generation activation remain separate work;
- `src/lib/persistence-owner-inventory.js` now independently classifies the 17 persisted carriers, serialized mirror, Gallery binary carrier, Music local-media carrier, image-generation credential/candidate/legacy carriers, Music's device-local credential carrier, Home local hint, Chat session feedback, the active Book Repository database and six stores, the direct legacy Book fallback, and logical-owner/data-class ownership; Settings diagnostics retain the stable 17-store audit projection, including Book and public image-generation configuration;
- `src/lib/backup-section-registry.js` continues to validate legacy v2 shape and records its historical Chat module-identity gap; `src/lib/complete-backup-package.js` requires all 27 current v3 sections, including Chat `moduleIdentity` and `moduleAvatarOverrides`, and integrity-checks them. Public `imageGeneration` configuration and Music library/provider/import metadata participate in backup, while device-local credentials, Music local-audio binaries, and image-generation temporary candidates remain excluded; shape-valid legacy files remain importable but are never relabeled complete. `docs/architecture/PERSISTENCE_REPOSITORY_CONTRACT.md` is `ARCHITECTURE_ACCEPTED` with exact IndexedDB v1 stores/keyPaths, record-version/generation-membership, pointer/journal, contextual persistence permission, fail-closed tab coordination, and Book foundation/fixture rules;
- binary-excluded or legacy restore first resolves exact local Gallery matches and preserves current-only retained material; absent media remains an unresolved owner reference rendered through a typed placeholder and saved description where available;
- no fixed `8 GB` budget, per-generation three-way storage prompt, per-backup item picker, or automatic backup deletion is approved;
- one isolated storage container remains one independent current save; different entry containers never auto-sync or silently merge, and same-container later pages become read-only previews with retry/refresh rather than force takeover or last-write-wins. Ordinary writer occupancy is distinct from a true save conflict, and cooperative release may trigger the same bounded retry automatically;
- Batch 2B completed as the non-active foundation, followed by a separately approved Book-only runtime cutover on 2026-07-22. Book now activates verified generations through the fenced pointer/journal flow, preserves the byte-identical legacy carrier for rollback, and performs no dual write; Gallery/R2 and every other owner migration remain unapproved.
- the current layered-persistence foundation reports local and mirror write outcomes separately, blocks writes after unresolved reconciliation/precondition conflicts, rejects mirror generation regression, and preserves the last readable durable bytes; a non-persisted root-shell status aggregates layered and Book Repository failure/read-only results with retry, confirmed reload-current-save, and Settings backup handoff. A page-level current-save writer keeps later same-container pages inspect-only/read-only across current durable carriers; normal page exit releases cooperatively, and bounded release metadata automatically starts the same lease-authoritative retry while multiple waiters still promote at most one writer. The release-local v3 path verifies before mutation, durably checkpoints the prior metadata-plus-binary save, rolls back failure or interrupted work before mount, and closes completed checkpoints. A broader cross-owner Repository root-generation switch remains separate work.

### Gallery Binaries

Gallery metadata participates in core backup. One default-on user choice includes all locally retained Gallery binaries; there is no backup-time per-item picker. URL-backed items preserve their original URL and minimum metadata instead of exact bytes.

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
- backup files must be treated as secrets;
- every complete local JSON export now requires an explicit danger confirmation before payload construction or download, while keeping configured credentials and private local data unchanged;
- a redacted/shareable export and encrypted personal remote backup remain separate future contracts.

Current release-local behavior and remaining target:

- a schema v3 `complete` package is a self-verified standalone object with every required owner section and every selected Gallery binary accounted for by size and integrity evidence;
- package inspection, integrity verification, legacy migration, and local-asset resolution occur before current-save mutation; predictive source/package/staging/destination capacity reporting remains separate work;
- release-local restore durably checkpoints a clone-safe metadata-plus-binary snapshot before applying changes, verifies the result, rolls back failures and interrupted work, and closes successful checkpoints; staging every owner behind one atomic Repository root switch remains a broader target;
- restoring an older version is non-destructive toward currently retained local Gallery material, but local reuse never weakens clean-device standalone-package requirements;
- legacy core data remains import-compatible, while the complete unavailable-media reporting and stable-placeholder presentation path remains future work; raw provider prompts/responses stay outside durable fallback metadata;
- local platform handoff, remote object confirmation, and restore activation have distinct success states so the UI cannot claim more durability than the Adapter proved.

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

### Music Integration

```text
Chat or Map intent
  -> normalized Music integration request
  -> /music open/search, explicit Music confirmation, or active-journey user action
  -> Music-owned playback/library/queue state
  -> bounded track-share, now-playing, quick-track, or journey-station projection
  -> Chat/Map-owned presentation only
```

Provider keys, endpoints, headers, stream URLs, queue contents, local media IDs, and raw provider responses never cross this Interface. Chat's track-share caller and Map's active-journey music/radio caller consume it; Chat search and external Map queue-request flows remain unimplemented.

### Calendar To Agenda Journey

```text
confirmed Calendar event
  -> hidden Schedule Orchestrator reaches the materialization window
  -> future Agenda Journey instance and activity steps
  -> optional Map Journey and/or Activity Session evidence
  -> Event Runtime eligibility, outcome, and audit
  -> owning modules validate effects
  -> future bounded Narrative Timeline projection
```

Calendar remains the long-range planned truth; Agenda Journey is short-range execution truth; Map remains travel truth. The orchestrator links records and reconciles time but does not become another owner of them.

### Mini Scene Request

```text
Calendar / Map / Chat / future Agenda Journey / future registered caller
  -> source-owned eligibility and canonical facts
  -> optional Event Runtime trigger policy/provenance
  -> Mini Scene request Interface
  -> explicit Settings mode + world/profile resolver
  -> structured draft + optional bounded Book transform profile
  -> committed Mini Scene artifact
  -> Text Presenter or sandboxed HTML Presenter Adapter
  -> allowlisted interaction request
  -> owning source module validates any source action
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

### Validation Posture

- the 2026-07-22 architecture baseline passed ESLint, 185 Vitest files / 1170 tests, Vite production build, both npm audit scopes, and 56 of 60 Playwright cases with 4 intentional skips;
- the current tree contains 209 static Vitest test files;
- later promoted Camera, Food Delivery, and local-map slices have focused desktop/mobile evidence;
- release commit `a1418ed` has passing lint, unit, production and Cloudflare builds, governance, focused browser evidence, and remote Pages Run #31294272595. The deployed `/schatphone/` direct-provider flow and the Vercel/Cloudflare restricted-relay model-list plus Chat smoke are proven, while installed PWA, named physical-device, external protection, and independently rerunnable audit proof remain open.

### CI

`.github/workflows/ci.yml` runs for pull requests and manual dispatch with Node 20, `npm ci`, separate official-registry production/full audits, lint, unit tests, build, one Chromium install, and one full product E2E collection. The full collection includes the focused visual-quality cases and rejects flaky recovery or more than four intentional skips.

Gaps:

- the new workflow definition has not yet run on GitHub and its external required-check setting is unverified;
- no coverage threshold;
- local validation uses Node 24 while CI uses Node 20, so both supported environments should remain tested intentionally.

### Deployment

`.github/workflows/deploy.yml` runs the same hard gates on main push or main-only manual dispatch before configuring and uploading `dist`; the deploy job requires that verified build job. Remote Pages Run #130 and the live `/schatphone/` base-path smoke are proven. It does not deploy the push relay.

Vercel project `shawn-e-s-projects/schatphone` is connected to `shawnoarry/schatphone` and serves the root-path app at `https://schatphone.vercel.app`. Commit `a1418ed` deploys the restricted per-request OpenAI-compatible relay on the two reserved Functions: users explicitly select Compatibility Proxy while retaining their own provider URL, key, and model; Direct remains the default. Public HTTPS/443 target validation, browser-origin checks, request size/time limits, redirect and loop rejection, redacted errors, and a best-effort instance-local rate limit bound the relay. Optional token mode uses a separate proxy-access token, and legacy fixed-upstream behavior remains compatible. A no-secret upstream probe and a GitHub Pages real-provider model-list plus Chat smoke pass against production.

Cloudflare uses `wrangler.jsonc` and `server/cloudflare-worker.mjs` for a third root-path build. One Worker routes only `/api/openai/v1/models` and `/api/openai/v1/chat/completions` through the same Web Platform relay core and delegates other requests to Workers Static Assets with SPA fallback. Commit `a1418ed` enables public restricted dynamic mode so GitHub Pages can relay different users' OpenAI-compatible URLs without operator-per-provider setup; the deployed route passed both the no-secret upstream probe and the real-provider 6-model/Chat-`OK` browser smoke. Native Gemini, Anthropic, Azure, and Responses protocols remain direct. Origin/fetch metadata can be spoofed outside browsers, rate limits are not globally durable, and DNS rebinding is not completely eliminated, so this remains compatibility infrastructure rather than an abuse-proof multi-tenant gateway.

## 11. Current Debt And Direction

Highest-risk files:

- `FoodDeliveryView.vue` 12195 lines;
- `ContactsView.vue` 5233 lines;
- `ChatView.vue` 4960 lines;
- `system.js` 4808 lines;
- `HomeView.vue` 4456 lines;
- `WorldBookView.vue` 4104 lines;
- `ChatDirectoryView.vue` 3916 lines;
- `MusicView.vue` 2783 lines.

Other debt:

- direct store-to-store coupling across some ownership boundaries;
- no compile-time contract layer;
- remaining installed-PWA/external-protection/true-device release proof; direct configured-provider Chat is proven on deployed GitHub Pages, while optional proxy proof remains provider-specific;
- incomplete true-device and push/provider QA.

Recommended order:

1. preserve proven Pages direct-provider, Git-connected Vercel, and Git-connected Cloudflare infrastructure baselines, then close external protection, PWA/relaunch, and named true-device proof;
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
- `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`
- `docs/architecture/CAMERA_GALLERY_IMAGE_GENERATION_ARCHITECTURE_PLAN.md`
- `docs/architecture/CAMERA_GALLERY_IMAGE_GENERATION_TODO.md`
- `docs/architecture/MUSIC_MODULE_CONTRACT.md`

The Camera documents record the promoted first slice plus deferred inventory. They are supporting contracts, not execution boards; roadmap 4.10 remains authoritative for status and promotion.

The Music contract records the implemented first slice plus the real-provider, true-device, and caller gates. Roadmap 4.13 remains authoritative for status and promotion.
