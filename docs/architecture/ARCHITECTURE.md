# SchatPhone Architecture

Updated: 2026-08-21

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
- present cross-module events inside the owning apps while keeping runtime review optional;
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
            Music provider metadata/lyrics cache
            external AI provider APIs
            optional push relay

GitHub Pages
  hosts only the built static SPA

Personal project image bed
  serves project-owned runtime artwork from public schatphone-assets/ URLs
  protects optional unique masters under schatphone-source/
  is not the shared writable Gallery store for all users

Optional Node push relay
  stores VAPID config, subscriptions, and schedules in local JSON
  sends Web Push payloads
  does not own app state or generate world events
```

The application uses Vue Router hash history and Vite base `/schatphone/`, so static hosting does not need server route rewriting.

Development, preview, and production use the same public project-image origin. PWA/install/offline bootstrap icons remain local; external runtime artwork is an online dependency and must never point at the authenticated `schatphone-source/` prefix. Future owner Gallery uploads use a separate device credential and `schatphone-user/` Adapter boundary.

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

`App.vue` is about 1225 lines and coordinates several infrastructure owners. Future work should prefer focused shell services/composables when adding lifecycle behavior.

### `src/router/index.js`

Owns:

- lazy route imports;
- compatibility redirects;
- the global lock guard.

The current tree contains 42 route-view files, 19 Pinia stores, 52 Vue files under `src/components`, 37 JavaScript composables, and 224 static Vitest test files. Normal user-facing modules are lazy-loaded. `/music` is a first-class installed app, `/files` is internal/compatibility, `/control-center` is optional World Hub, and `/more` redirects to Settings.

### Entry Model And Current Product Modules

SchatPhone separates a capability from the way users reach or review it. A module does not need a desktop icon merely because it owns important behavior.

| Entry form | Current meaning | Examples |
| --- | --- | --- |
| ordinary installed app | direct repeated user workflow | Chat, Contacts, Map, Calendar, Music, Camera, Gallery, Shopping, Food Delivery, Wallet |
| protected system entry | shell/configuration recovery that must remain reachable | App Store, Settings, Network |
| optional placeable entry | available from App Store or a feature switch without being mandatory on Home | World Hub |
| world or folder entry | reviewed presentation that opens an existing owning route with context | World Pack app bindings, Food Delivery shop mini apps |
| host-embedded surface | contextual action or projection inside the app where the underlying activity occurs | Chat share cards, Map journey/event cards, Calendar event cards, global Music player |
| hidden internal module | coordination with no user-facing route of its own | Event Runtime, future Schedule Orchestrator |
| future privileged tool | separately unlocked control with stronger authorization and audit | Cheats |

Current product families are:

- shell and configuration: Lock, Home, App Store, Settings, Appearance, Widgets, Network, backup/recovery, and internal Files compatibility;
- communication and identity: Chat, Chat Directory, groups/service accounts, Contacts, Phone, role binding, and relationship memory;
- world and continuity: Book, WorldBook, World Pack bindings, Map, Calendar, Reminders, Event Runtime, and optional World Hub review;
- media: Gallery, Camera/shared image generation, Music, the global player, and bounded Chat/Map media projections;
- life and economy: Shopping, multiple Food Delivery shop facades, Wallet, Assets, and Stock.

An `Event` desktop app is intentionally absent. Event Runtime is a hidden coordination Module; event interaction appears in the owning host app, while cross-module audit and adjustment enter through World Hub.

## 5. State Layer

SchatPhone has 19 Pinia stores.

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

`src/stores/system.js` is 4834 lines and is imported by 26 of 42 route views. It currently spans appearance, Home, app placement, notification, API/network, push, world compatibility, automation, backup reminders, Music's compatibility-carried public state, and user/system settings.

The preferred strategy is stable facades, not a big-bang store split:

- `useSystemNotifications.js` and `useSystemApiReports.js` are existing examples;
- new facades must preserve the storage key and backup shape until a separate migration is approved;
- one ownership area should move behind an interface per slice.

## 6. Shared Contract Layer

### AI And Image Generation

Provider transport is split by product meaning:

- `src/lib/ai.js` is the approved text/conversation AI transport entry;
- `src/lib/image-generation-contract.js`, `src/lib/image-generation-api.js`, and `src/stores/imageGeneration.js` form the dedicated shared Image Generation Module for Camera and separately promoted callers.
- `src/lib/tts-contract.js`, `src/lib/tts-api.js`, and `src/stores/tts.js` form the shared runtime Text To Speech Module. Cloudflare MeloTTS runs through the Workers AI binding, MiniMax uses a device-local user Key through its dedicated browser Adapter, and the first slice owns temporary preview audio only rather than Chat messages.

The text/conversation transport supports:

- Gemini native;
- OpenAI-compatible chat;
- OpenAI Responses;
- Anthropic Messages;
- Azure OpenAI;
- local/server-auth gateway URL shapes.

`src/lib/ai-context-envelope.js` is the provider-neutral transient context boundary for text AI callers. A caller supplies an ordered stable prefix (world rules, role identity, and output contract) followed by dynamic context (current scene, relationship/memory projection, and turn capabilities). The compiler does not own or persist facts, summarize memories, read Store internals, or change caller limits; domain owners remain responsible for the bounded projections they provide. Chat replies and Event Text Composer use this same boundary, and future world, schedule, or narrative callers must reuse it instead of creating provider-specific prompt assembly.

`src/lib/chat-context-budget.js` is Chat's provider-neutral transient message-window Module. After rich and recalled records are normalized into AI-visible text, it preserves a contiguous newest-first window under both the thread turn limit and a conservative character ceiling. The latest oversized message is represented by a deterministic head/tail projection, while the stored Chat record remains untouched. The same selected source references drive quote candidates and image-reference collection, and the same selected AI text drives Relationship Runtime recall and provider transport, preventing those views of the current turn from drifting when users switch models or providers. Its contiguous-recency policy is Chat-specific; Event and world knowledge retain their own priority rules while reusing the shared envelope and owner-projection pattern.

`src/lib/memory-recall.js` is the deterministic recall Module used at that context seam. It ranks owner-supplied memory summaries against a bounded recent-context query, keeps pinned memories first, excludes archived memories by default, and enforces item/character budgets without another AI call. Relationship Runtime remains the sole owner of relationship memories and exposes the recall Interface; Chat supplies recent visible message text but does not copy, rewrite, summarize, archive, or delete memories. Event and future world/narrative callers may reuse this Interface only through owner-provided projections and their own explicit knowledge/permission rules.

`src/lib/memory-consolidation-pressure.js` is a provider-neutral, read-only pressure projection over owner-supplied memory groups. It counts the complete working set, active/pinned/archived groups, original source references, and summary characters, then reports stable watch/review reasons plus existing `memoryKey` candidates whose explicit group has dense evidence or an unusually long summary. It does not merge similar text across keys, create a replacement summary, call AI, persist candidates, or mutate review/evidence state. Relationship Runtime exposes this Interface for one target at a time and remains the sole owner of relationship memories. Future world chronology and role-to-role knowledge must provide separate Owner Adapters and data even if they reuse the pressure Module.

`src/lib/role-continuity-projection.js` combines Contacts-owned role details with recalled Relationship Runtime summaries without becoming another truth owner. User-authored manual Preferences, Life Pattern, and Social Graph details form bounded stable character facts. Event-attached detail is dynamic supporting context only when its `memoryKey` matches a memory selected for the current turn; orphan or non-recalled clues stay out, and duplicate clue text is suppressed. This preserves the product rule that event clues cannot override confirmed role details while making Contacts authoring materially affect role Chat.

`src/lib/role-identity-projection.js` is the read-only Contacts-to-Chat identity projection. For a bound role it resolves the current profile name, role, bio, template-labelled concrete values, relationship premise, stable manual details, and recalled event continuity behind one Interface. Service, official, group, missing-profile, and Self Profile records fail closed to no role projection. Relationship Runtime remains dynamic truth, WorldBook remains template/world knowledge owner, Contacts remains profile-value owner, and the projection adds no persistence field or copied character Store.

`src/lib/ai.js` may translate that boundary into provider cache hints only for the official `api.openai.com` endpoint. GPT-5.6 uses an explicit breakpoint after the stable prefix; other official OpenAI models receive only the compatible cache key and keep automatic caching. Azure, Gemini, Anthropic, local models, and third-party OpenAI-compatible endpoints retain their existing request shape and are reported as unmanaged rather than unsupported. Cache status is true only when managed official-OpenAI usage reports cached input tokens; requesting a key or receiving an unverified compatible-provider field is not a SchatPhone-managed cache hit. Cache keys use opaque stable identities plus a fingerprint of the stable prefix, so model/provider switches and relationship/message changes reuse the same key while edits to role identity or world rules invalidate it. Normalized input/output/cache-read/cache-write usage is transient call metadata and never includes the prompt.

Image-reference transport also fails closed. Automatic mode attempts native image input only on the currently supported official OpenAI Adapter; unknown compatible endpoints and other providers receive label/caption cues without source URLs, Gallery asset IDs, provider names, transport modes, or storage-error language. A user's explicit native-image preference may still request one compatible native attempt and falls back on supported request-shape errors. Execution diagnostics stay transient and are not rendered beneath ordinary Chat messages; the role is instructed to respond naturally without claiming unavailable visual detail or exposing model limitations.

The Image Generation Module normalizes OpenAI-compatible Images/Edit, OpenAI-compatible Chat image output, and Grsai asynchronous generation behind one request/task/candidate boundary. Public provider/default/routing configuration participates in backup and rollback; API keys, proxy tokens, and temporary candidates remain device-local and excluded from ordinary backup.

Views and source stores may build domain prompts/context and decide why a request exists, but they must not implement provider HTTP calls independently of the matching shared transport module.

Full assembled prompts, raw provider responses, headers, and transport payloads are transient transport/diagnostic material rather than persistent product truth. Any artifact that an owning module formally publishes, confirms, applies, or admits into revisitable/continuity-bearing history becomes that module's durable canonical content regardless of user/AI/system origin. Durable storage therefore includes committed module content, authoritative state/facts, cross-module references, validated structured proposals/effects, and minimum provenance. Full-payload capture requires an explicit temporary diagnostic mode with hard limits and user clearing.

Event Text Composer's durable terminal reuse of already materialized event copy is separate from provider prompt caching. The former prevents another provider call for the same Event Instance; the latter may reduce billed input for repeated stable prefixes and must never be reported without provider usage evidence.

Automatic memory consolidation remains a separate future persistence decision. The landed pressure projection can identify review candidates but does not authorize summarization, replacement, archival, or deletion. Any later consolidation must preserve original evidence, distinguish role memory from world chronology and role-to-role knowledge, support review/rollback, and cannot use prompt-cache metadata as memory truth.

Role continuity is available only to role conversations. Service, official, and group conversations never inherit role profile or Relationship Runtime context from a stale/imported `profileId`; disabling Relationship Runtime removes its memory recall and event-attached clues while leaving Contacts-authored manual character facts intact.

### Music

`docs/architecture/MUSIC_MODULE_CONTRACT.md` defines the implemented Music first slice:

- `music-contract.js` normalizes versioned public state, tracks, provider profiles, JSON response mappings, and GET/POST search requests;
- `chksz-music-adapter.js` owns ChKSz NetEase/QQ/Kugou search, user-action playback resolution, NetEase lyrics/playlist intake, quota metadata, bounded retry, and Key-redacted errors;
- `music-playback-runtime.js` is the sole browser `Audio` and Media Session runtime;
- `music-local-media-storage.js` owns the separate `schatphone-music-media` IndexedDB carrier for imported audio blobs and obeys the current-save writer boundary;
- `music-provider-cache.js` owns the separate rebuildable `schatphone-music-provider-cache` IndexedDB carrier for expiring normalized provider metadata and lyrics; API keys, stream URLs, and audio bytes are excluded;
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

`docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` defines an architecture-accepted shared Module whose pure Stage 1 foundation and first text baseline are now landed:

- source Apps retain source truth, Event Runtime establishes that an event occurred, and the current `simulation` registration submits one bounded request through the shared Interface;
- Settings owns an explicit per-module unconfigured/off, text, or interactive-HTML choice; world/profile/caller suggestions cannot override it;
- Book narrative rules remain independent from separate `structured_json` Mini Scene transform profiles, and WorldBook narrative activation remains independent from Mini Scene profile binding;
- World Pack may reference a reviewed profile as an optional grouped capability but is not required for custom worlds and cannot auto-enable Book content;
- the Module owns world/profile resolution, AI-required structured artifact generation and validation, bounded safe transforms, presenter selection, optional retained-artifact lifecycle, the artifact's universal text representation, and interaction audit;
- Text and sandboxed HTML Presenter Adapters form the presentation seam. Raw AI HTML and legacy Chat `htmlSnippet` remain inert;
- the Stage 1 contract/profile modules remain pure and the regex layer still validates without executing;
- `store:mini-scene` V1 owns the current shell's durable artifacts, policies, bindings, and interaction audit; the target CMG-08 contract retains complete artifacts only after explicit user choice, removes silent row eviction, and exposes paged management. Complete-backup v4 includes the `miniScene` section and still verifies complete v3 packages;
- source owners persist canonical event results, while Relationship Runtime and any approved diary/timeline projection owner persist concise memory/continuity records regardless of full-scene retention. There is no prebuilt library of finished AI scenes; Book is the reusable rules/profile/template source library, and retained Mini Scenes are user history;
- Event Runtime is the only functional registered caller. Missing AI, invalid Drafts, forbidden markup, or missing provider provenance create no artifact; the root Text Presenter records choices as owner-validation requests and returns to World Hub;
- Calendar remains V3 and has no Mini Scene-specific authoring fields, generator button, or registered caller;
- a production Event Runtime trigger Adapter, profile-binding UI, safe Book transform execution, interactive HTML, and source-owner integrations remain unimplemented.

### Role And Relationship

- `role-binding-contract.js` normalizes Contacts-to-Chat role context;
- `relationship-fact-adapters.js` accepts low-impact module facts;
- `relationship-event-gating.js` reads stored category/modifier classifications, never raw premise prose;
- relationship runtime owns memory grouping and current state;
- one continuing matter is one shared experience with progress updates, a concise role-memory summary, and references to owner-native supporting records. Summaries are grouped by experience or subject, never by an arbitrary row count;
- Chat consumes current relationship truth from Relationship Runtime exactly once. Profile premise/classification remains context and cannot become a competing current answer;
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
- committed relationship facts, Event Instances, and retained Mini Scene artifacts cannot be removed by fixed row-count caps. User interfaces may page and AI callers may read bounded relevant summaries without deleting owner history; explicit user deletion of an optional retained Mini Scene never deletes the event result or memory projections;
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
- `src/lib/persistence-owner-inventory.js` now independently classifies the 17 persisted stores, serialized mirror, Gallery binary carrier, Music local-media and rebuildable provider-cache carriers, image-generation credential/candidate/legacy carriers, Music's device-local credential carrier, TTS's device-local configuration/credential carriers, Home local hint, Chat session feedback, the active Book Repository database and six stores, the direct legacy Book fallback, and logical-owner/data-class ownership; Settings diagnostics retain the stable 17-store audit projection, including Book and public image-generation configuration;
- `src/lib/backup-section-registry.js` continues to validate legacy v2 shape and records its historical Chat module-identity gap; `src/lib/complete-backup-package.js` requires all 27 current v3 sections, including Chat `moduleIdentity` and `moduleAvatarOverrides`, and integrity-checks them. Public `imageGeneration` configuration and Music library/provider/import metadata participate in backup, while device-local credentials, TTS configuration, runtime TTS previews, Music local-audio binaries, rebuildable Music provider cache, and image-generation temporary candidates remain excluded; shape-valid legacy files remain importable but are never relabeled complete. `docs/architecture/PERSISTENCE_REPOSITORY_CONTRACT.md` is `ARCHITECTURE_ACCEPTED` with exact IndexedDB v1 stores/keyPaths, record-version/generation-membership, pointer/journal, contextual persistence permission, fail-closed tab coordination, and Book foundation/fixture rules;
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

### Location-Aware Event Experience

```text
owning module action or explicit checkpoint
  -> bounded source snapshot
  -> Event Runtime eligibility, cooldown/cap, proposal, provenance, and log
  -> event-surface projection with stable source references and optional coordinate anchor
  -> host card in Map, Chat, Calendar, or another registered owner
  -> user expands through host detail or the shared Mini Scene Interface
  -> bounded choice request returns to the owning module for validation
  -> optional World Hub review, explanation, and narrow correction
```

The projection is not another canonical event record. Map owns coordinates, pins, places, and journey truth; the source module owns its business records; Event Runtime owns eligibility and audit; Mini Scene owns optional presentation artifacts. A coordinate anchor may place a card on the large-map surface, but it cannot silently create a Map place, move a journey, or transfer source ownership to Map.

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

### World Suite Installation

```text
World Suite manifest
  -> validate stable resource IDs, native owners, versions, and dependencies
  -> build an idempotent install/update/review plan
  -> the same native owner Adapter performs Suite or independent installation
  -> verify the native owner result before recording installed evidence
  -> checkpoint completed resources so an interrupted operation can resume safely
  -> installed resource stays independently manageable and separately enableable
  -> suite uninstall detaches origin and preserves shared, modified, in-use, and historical truth
```

`src/lib/world-suite-manifest.js` is the pure reusable planning Module. `src/lib/world-suite-inventory.js` stores only stable native IDs, versions, install origins, bounded owner evidence, and resumable Suite checkpoints inside the existing System user carrier. `src/lib/world-suite-owner-adapters.js` provides the shared execution Interface for both Suite and independent catalog installation, verifies native owner truth before and after mutations, and checkpoints only completed work. If a native install or removal succeeded but its inventory checkpoint was interrupted, retry repairs the coordination evidence from native truth without repeating the Owner mutation. The inventory is required in current complete backup through the existing `user` section; legacy backups restore an empty inventory instead of claiming historical Suite provenance.

Book is the first production implementation of this flow. A manifest names the logical Book resource, Book-native ID, Catalog ID, and Catalog version but never carries the text. The Book Catalog resolves the body; `book-world-suite-owner-adapter.js` verifies explicit provenance and current WorldBook references; `bookStore.commitManagedAssetMutation()` commits one create/update/remove through the active legacy or Repository carrier and restores the prior in-memory snapshot on write failure. Independent catalog and Suite origins therefore share one Book asset without claiming existing built-ins or user documents.

These Modules deliberately contain no built-in K-pop manifest, startup registration, UI, or activation policy. `src/lib/map-world-suite-inspection.js` supplies the Map read-only Interface, and `src/lib/production-map-world-suite-inspection-adapter.js` composes Map, Gallery, Event Runtime, and Chat owner evidence behind that seam. It classifies built-in, user-custom, correctly Catalog-managed, other-Catalog, ambiguous, and absent native identity; computes a managed topology/metadata fingerprint; inventories Gallery references, player places, active/world binding, visibility, Footprints knowledge, position/place session, active/history Map Journeys, current/history Event records, persisted Chat location cards, and 12-pack capacity; and returns immutable evidence without copying chat/event bodies. Trusted Catalog provenance round-trips through restore/save/reopen, Map returns the real persistence result, Gallery hard-blocks deletion and in-place replacement of assets referenced by custom Map packs, and `mapStore.commitManagedMapPackMutation()` commits one trusted managed create/update/delete while restoring the exact pre-mutation snapshot on persistence failure.

`src/lib/map-world-suite-owner-adapter.js` is the separately constructed Map mutation Adapter. It resolves the real Catalog record rather than reading content from the manifest, accepts at most 500 strictly normalized authored canvas places only under trusted Catalog provenance, requires the referenced Gallery asset to be installed first, and reuses the shared independent/Suite Owner Adapter execution Interface. `src/lib/gallery-world-suite-owner-adapter.js` gives Gallery the matching stable-folder/stable-URL-asset Adapter; Gallery persists pack/asset provenance, refuses ID or URL collisions, treats other-folder membership and native consumers as use, and rolls failed managed mutations back exactly. Map never installs or removes Gallery content. Both Adapters fail closed for user modification and native references, and Map additionally blocks topology replacement without an explicit migration.

`src/lib/world-resource-catalog.js` is the typed/versioned Book/Gallery/Map Catalog seam. `src/lib/map-gallery-world-suite-runtime.js` composes the Gallery-before-Map dependency registry, and `src/lib/production-world-suite-runtime.js` adds Book plus product use cases for preview, independent install, Suite install, and Suite uninstall over the real Owner Stores and System-owned durable inventory. Each checkpoint must receive a successful System persistence receipt; a failed checkpoint does not claim success, and the next attempt re-inspects native truth instead of repeating an already completed Owner mutation. Only one operation may run at a time. This runtime is explicitly constructed rather than invoked at app startup, contains no built-in Catalog or K-pop manifest, and never activates a resource, binds a world or Map, relocates a role, changes Journey truth, or deletes owner history. The ordinary product Map inspection remains read-only unless this explicit runtime supplies the mutation Adapter, so existing defaults are never retroactively marked as Suite-installed.

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
  -> Agenda Journey instance with separate travel/activity steps
  -> optional Map Journey evidence and later Activity Session evidence
  -> explicit Agenda Journey outcome
  -> later Event Runtime eligibility, outcome, and audit after a registered Adapter
  -> future bounded Narrative Timeline projection
```

Calendar remains the long-range planned truth; Agenda Journey is short-range execution truth; Map remains travel truth. The orchestrator links records and reconciles time but does not become another owner of them.

### Mini Scene Request

```text
Calendar / Map / Chat / Agenda Journey / future source owner
  -> source-owned canonical facts
  -> Event Runtime eligibility and trigger provenance
  -> Mini Scene request Interface
  -> explicit Settings mode + world/profile resolver
  -> required AI structured draft + optional bounded Book transform profile
  -> validated temporary presentation payload
  -> Text Presenter or future Presenter Adapter
  -> allowlisted interaction request
  -> owning source module validates any source action and persists canonical result
  -> Relationship Runtime / diary or timeline owner persists concise projections
  -> explicit user retention choice
      -> retained Mini Scene artifact and future recall entry
      -> release temporary presentation payload only
```

## 9. Event Runtime And Push

### Foreground Runtime

- runs only while the application/session lifecycle allows it;
- uses module permissions, Surprise Mode, cooldowns, caps, safe conditions, and logs;
- current automatic families are deliberately conservative;
- high-risk Chat social proposals wait for review.

### Event Experience And Hidden Control Entries

- Event Runtime remains a hidden coordination Module and receives no ordinary Home or desktop entry.
- Event cards are host-embedded projections. The next Map direction uses coordinate-anchored cards inside the existing Map UI, with an explicit action to expand the event; other modules may expose their own contextual cards through the same projection contract.
- `World Hub / 世界中枢` is the existing integrated hidden-by-default review entry (`app_control_center`, `/control-center`). It is already reachable from Settings, manageable in App Store/Home placement, and shown in the Home utility area when available.
- Event review, event history, pending choices, runtime notes, and bounded correction belong in World Hub rather than a new Event app. Ordinary user reminders and confirmed schedules remain Reminders/Calendar records.
- `Cheats / 金手指` remains a separate future privileged tool for explicit value/state overrides. It may share the hidden utility area, selected-event context, and audit format with World Hub, but it must not share World Hub's default permission level or be folded into Event Runtime.
- internal Files compatibility and the future Schedule Orchestrator are not event-review entrances.

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
- the current tree contains 220 static Vitest test files;
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

Cloudflare uses `wrangler.jsonc` and `server/cloudflare-worker.mjs` for a third root-path build. One Worker routes `/api/openai/v1/models` and `/api/openai/v1/chat/completions` through the same Web Platform relay core, routes `/api/tts/v1/speech` through the bounded Workers AI MeloTTS handler, and delegates other requests to Workers Static Assets with SPA fallback. Commit `a1418ed` enables public restricted dynamic mode so GitHub Pages can relay different users' OpenAI-compatible URLs without operator-per-provider setup; the deployed Chat routes passed both the no-secret upstream probe and the real-provider 6-model/Chat-`OK` browser smoke. Native Gemini, Anthropic, Azure, Responses, and MiniMax TTS protocols remain direct. Origin/fetch metadata can be spoofed outside browsers, rate limits are not globally durable, and DNS rebinding is not completely eliminated, so the shared routes remain development/compatibility infrastructure rather than abuse-proof multi-tenant gateways.

## 11. Current Debt And Direction

Highest-risk files:

- `FoodDeliveryView.vue` 12248 lines;
- `ContactsView.vue` 5233 lines;
- `ChatView.vue` 5089 lines;
- `system.js` 4834 lines;
- `WalletView.vue` 4551 lines;
- `WidgetsView.vue` 4519 lines;
- `HomeView.vue` 4451 lines;
- `foodDelivery.js` 4313 lines;
- `WorldBookView.vue` 4104 lines;
- `MapView.vue` 4029 lines;
- `MusicView.vue` 3918 lines;
- `ChatDirectoryView.vue` 3916 lines;

Other debt:

- direct store-to-store coupling across some ownership boundaries;
- no shared persisted event-surface projection yet for location-aware cards across host apps;
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
- `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`
- `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`
- `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`
- `docs/architecture/CAMERA_GALLERY_IMAGE_GENERATION_ARCHITECTURE_PLAN.md`
- `docs/architecture/CAMERA_GALLERY_IMAGE_GENERATION_TODO.md`
- `docs/architecture/MUSIC_MODULE_CONTRACT.md`

The Camera documents record the promoted first slice plus deferred inventory. They are supporting contracts, not execution boards; roadmap 4.10 remains authoritative for status and promotion.

The Music contract records the implemented first slice plus the real-provider, true-device, and caller gates. Roadmap 4.13 remains authoritative for status and promotion.
