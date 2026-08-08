# Module Architecture Governance Status And Handoff

Updated: 2026-08-09

This is the current handoff for architecture cleanup, state ownership, persistence, security, and release-quality work.

## 1. Current Status

Status: `IN_PROGRESS`

Roadmap owner: 4.5 Architecture, Security, And Documentation Maintenance.

SchatPhone's domain architecture is sound enough to preserve. The current problem is concentration and hardening, not missing architecture or a need for framework replacement.

Current active architecture slice:

- ordinary browsers and installable PWAs remain complete first-class clients;
- one isolated browser/Web App storage container owns one current save; different isolated entry containers remain independent and move state only through a user-selected complete backup, never automatic sync or silent merge;
- same-container tabs use a fail-closed writer boundary: after the safe wait times out, the later page remains read-only with retry and refresh-current-save actions; force takeover and last-write-wins are excluded;
- persistent-storage permission is never requested on first launch; the first qualifying high-volume durable action asks in context, while Settings exposes current status and explicit retry;
- authoritative Chat/role/relationship/memory/user-document records and still-referenced assets cannot be silently or irreversibly deleted; cold archival must remain reversible;
- any content formally published, confirmed, applied, or admitted into an owning module's history is durable when it can be revisited, referenced, or affect continuity, regardless of user/AI/system origin;
- full AI prompts, raw provider responses, transport payloads, uncommitted drafts, and rebuildable projections remain non-authoritative; canonical committed content, authoritative state/facts, cross-module references, and minimum provenance are durable;
- IndexedDB-first structured persistence is the target direction, while `localStorage` becomes small hot state and recovery metadata;
- optional remote backup is personal BYOS: there is no project/workgroup-owned unique cloud, each user owns a separate Cloudflare account and R2 destination, and Cloudflare R2 is the first officially guided target behind a provider-neutral contract;
- each user deploys a personal Cloudflare Worker gateway bound to that user's R2 destination; SchatPhone may retain only a revocable, scoped device token and must not retain an R2 API Secret;
- personal remote backups are encrypted on the client and support two independent recovery paths: a recovery password or separately downloaded recovery file; Cloudflare/Worker receives no plaintext recovery secret, losing both paths is irreversible, and initial setup must verify recovery before automatic backup becomes ready;
- remote backup keeps the local save authoritative and may run after app launch and while the browser/PWA remains open; it is not live server storage, cross-device sync, automatic merge, or a promise of closed-app background execution;
- choosing `keep` in any source module stores the accepted media locally first; reusable retained media enters Gallery's local material-library scope, and keeping an item never uploads or enrolls it in remote backup by itself;
- backup always protects the complete core save, while one user-facing `include material library` choice controls local Gallery binaries as a group and defaults on; when included, all already-kept Gallery material is packaged without another per-item selection step;
- URL-backed media always preserves the original URL and minimum type/name/source metadata rather than downloading exact bytes for backup; this URL record remains part of backup even when Gallery binaries are excluded, but restore cannot guarantee content whose external URL has stopped working;
- backup exists for rollback and damaged-save recovery, not cloud-library browsing, sync, or local-space offload; successful backup never releases local originals;
- manual backup is always available; automatic backup is a separate opt-in setting that defaults off and follows the existing browser/PWA open-app execution limit;
- local exports support a user-edited filename with a generated product-name-plus-date default and hand the destination choice to the platform save/share flow; iOS, Android, and desktop browsers may expose different location controls;
- multiple restore versions are allowed, but every local or remote backup object must be a complete, independently readable and importable package with no dependency on a previous version;
- SchatPhone does not create an internal local backup library: exported local files remain under the phone/computer file system and re-enter the app only when the user selects one for import;
- after personal R2 is connected, SchatPhone provides a direct cloud-backup view that lists available backup files and restores the selected file without sending the user to the Cloudflare dashboard first; the files remain in the user's R2 and are not duplicated into a hidden in-app backup store;
- the same view may permanently delete a selected SchatPhone backup object from the connected personal R2; deletion is not a local hide action and must use a conspicuous destructive confirmation that names the backup, states that the connected cloud file will also be deleted and cannot be restored through SchatPhone, and clarifies that the current save, other backups, and local exports are unaffected;
- SchatPhone never rotates, expires, or deletes a cloud backup automatically; every personal-R2 backup remains until the user explicitly confirms permanent deletion, and quota pressure may block a new backup or prompt manual cleanup but cannot authorize silent removal;
- the complete-backup/recovery engineering contract is accepted: new complete packages use a versioned required-section manifest, integrity evidence, capacity preflight, creation self-check, staged generation restore, atomic activation, crash journal, failure taxonomy, and metadata-plus-binary rollback;
- the executable canonical inventory independently classifies 17 persisted stores, the serialized mirror, Gallery binary storage, image-generation credential/candidate/legacy carriers, the Home local hint, Chat session feedback, and their logical owner/data classes; Contacts-in-Chat and WorldBook-in-System remain explicit rather than inheriting the physical store owner;
- Settings diagnostics consumes the inventory's stable 17-store projection and includes Book plus public image-generation configuration; schema v3 complete local export covers every current required section, including `imageGeneration` public configuration and Chat identity/avatar state, while preserving legacy v1/v2 import compatibility and excluding image credentials/candidates;
- roadmap 4.10's first shared Image Generation Module slice is implemented behind dedicated contract/API/Store files rather than `src/lib/ai.js`; OpenAI Images/Edit, OpenAI Chat image output, and Grsai async adapters share normalized requests, redacted errors, direct-first/profile-proxy routing, model discovery, tasks, and bounded candidate behavior. Public profiles/defaults/module routing participate in backup/restore/rollback, while device-local API keys/proxy tokens and temporary candidates do not;
- legacy inspection still returns `shapeOk` separately from `completePackageEligible`; legacy v2's missing Chat `moduleIdentity` and `moduleAvatarOverrides` remain an explicit historical gap, while v3 requires and integrity-checks both sections;
- `docs/architecture/PERSISTENCE_REPOSITORY_CONTRACT.md` is `ARCHITECTURE_ACCEPTED`: it fixes the separate `schatphone-repository` v1 stores/keyPaths/indexes, immutable record versions plus generation membership, atomic pointer/journal, localStorage hint allowlist, contextual quota/persist policy, fail-closed WriteCoordinator, and Book Adapter/fixture/legacy-reader/rollback contract;
- Batch 2B completed as the exact non-active foundation, followed on 2026-07-22 by the separately approved Book-only runtime cutover: explicit Book UI confirmation, contextual persistent-storage request, atomic activation/reopen, Repository-only later writes, unchanged legacy rollback bytes, and real-Chromium rollback evidence are implemented; dual write, legacy deletion, Gallery/R2, and other owners remain unapproved;
- the structured write-result primitive, lineage/sequence local/mirror freshness bootstrap, product-level save-failed/read-only recovery surface, and product-wide same-container writer boundary are integrated. A page acquires the current-save writer before reconciliation and Store mount; later pages inspect without repair and fail closed across layered, Book, Gallery binary, and image-generation device-local writes until retry succeeds. The release-local v3 backup/restore/reopen/rollback boundary is now implemented;
- `docs/architecture/WORLD_SETTING_ARCHITECTURE.md` is `ARCHITECTURE_ACCEPTED / STAGE_W1_DONE`: `legacy_single_world` is stable compatibility identity/scope, Pack capability is separate, Book/WorldBook/Pack/template ownership is frozen, and zero-Pack/zero-encyclopedia/zero-text worlds remain valid;
- WorldBook and Contacts now read immutable identity/narrative/encyclopedia/profile/capability/diagnostic projections through `world-interface.js`; Pack switching does not change world identity or setting selection, and new template/contact writes do not record active Pack IDs;
- legacy Pack content references remain reviewable compatibility evidence, but missing Book, encyclopedia, or template references no longer block capability Pack activation;
- `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` is architecture-accepted as a later staged feature: one shared Module owns request validation, world/profile resolution, structured artifacts, safe transforms, presenter selection, fallback, and interaction audit while source modules retain trigger and record truth;
- Mini Scene per-module modes are explicit user choices (`unconfigured/off`, `text`, or `interactive_html`), Book narrative rules and structured transform profiles are separate assets, World Pack references remain optional, and raw AI/legacy Chat HTML is never executed;
- Mini Scene content dimensions, including sensitive dimensions, begin unconfigured and require an explicit per-world/profile include/exclude choice; they do not become a global filter;
- Mini Scene Stage 1 pure foundation is landed in five unreferenced `src/lib` modules with four focused test files: the caller registry starts empty, Book profile/regex handling validates without executing, and world/profile resolution fails closed to neutral;
- Mini Scene persistence, Settings controls, popup UI, regex execution, Text/HTML Presenters, and Calendar/Map/Chat triggers are not implemented and are not part of Batch 2B;
- binary-excluded and legacy restores reuse exact matching local Gallery binaries before declaring media unavailable, and restoring an older backup never deletes or hides current-only material the user already kept locally;
- a valid legacy core may restore as `legacy_degraded` after a missing-material summary; unresolved image/GIF/audio/video/file references render a type-appropriate placeholder, and saved caption/alternative/generation-description text may remain readable without retaining raw AI transport payloads;
- a complete self-checking Cloudflare setup, backup, recovery, revocation, quota, and troubleshooting guide is required before this can become an implementation slice;
- this is a promoted architecture-decision slice; beyond the completed Book-only cutover, it does not approve migration of any additional application owner.
- first successful Chat activation and the explicit custom-role-to-Chat journey are completed product evidence rather than architecture prerequisites; the Git-connected Vercel root-path app and fail-closed proxy Functions are deployed, while hosted PWA, true-device, and configured real-provider proof remain release work.

### Product Decision Checkpoint - 2026-07-21

| Area | Status | Current meaning |
| --- | --- | --- |
| Browser/PWA persistence | `CONFIRMED` | One isolated browser/Web App container owns one current save; IndexedDB-first is the target and `localStorage` becomes small hot/recovery state. |
| Isolated entry containers | `CONFIRMED` | Each isolated browser profile/site-data or separately isolated desktop Web App container is an independent current save. There is no internal slot, automatic sync, cross-container discovery, or silent merge; transfer uses a user-selected complete backup. |
| Same-container tabs | `IMPLEMENTED` | One page-level writer gates current durable carriers. After timeout the later page is inspect-only/read-only and offers retry/refresh-current-save only; last-write-wins and force takeover are excluded. |
| Persistent-storage timing | `CONFIRMED` | Do not ask at first launch. Ask in context before the first qualifying high-volume durable action, and expose browser status plus explicit retry in Settings. |
| IndexedDB / Book pilot | `BOOK_CUTOVER_DONE` | Batch 2B foundation and the separately approved Book runtime cutover are implemented and browser-tested; the unchanged legacy carrier remains rollback-only. |
| Durable records | `CONFIRMED` | Committed user/AI/system content and authoritative/audit truth remain durable under their owning modules; raw transport and rebuildable material do not. |
| Personal cloud | `CONFIRMED` | No shared project/workgroup archive. Each user owns a separate Cloudflare R2 destination behind a provider-neutral contract. |
| Remote security | `CONFIRMED` | A personal Worker gateway uses a revocable scoped device token; the app never stores the R2 API Secret. Backups are client-encrypted with recovery-password or recovery-file restore. |
| Browser automation | `CONFIRMED` | Manual backup is always available. Automatic backup is a separate user opt-in that defaults off and may run only after launch or while the app is open; closed-app scheduling, sync, and merge are not promised. |
| Gallery role | `CONFIRMED` | Gallery is the user-facing reusable media/material library. Source modules own why/how a retained asset is used; Chat still owns message-scoped media records. |
| Generated media | `CONFIRMED` | Every image/media generation flow must present a user retention decision before the result becomes durable; rejected candidates remain transient. |
| URL media | `CONFIRMED` | Media type and storage source are separate. A URL may represent an image, sticker, GIF, audio item, or other media without first becoming a local file. |
| Per-result three-way storage choice | `WITHDRAWN` | Do not require `discard / local only / cloud protected` on every generated result; this exposed storage mechanics as a primary workflow. |
| Fixed `8 GB` product budget | `WITHDRAWN` | No fixed budget is approved before real backup-size measurement and a media-retention contract exist. |
| Local keep versus backup | `CONFIRMED` | `Keep` saves locally and admits reusable media into Gallery; it does not upload or opt the item into backup. Backup remains a later user action. |
| Backup material scope | `CONFIRMED` | Core save data is always complete. One default-on choice includes all locally retained Gallery material; users do not reselect individual assets during backup. |
| Remote media placement | `CONFIRMED` | R2 stores recovery backups only. It does not become the live material library and successful upload never releases local originals. |
| URL backup representation | `CONFIRMED` | Backups preserve the original URL plus minimum descriptive/source metadata, not an exact byte copy. URL records remain included regardless of the Gallery-binary choice. |
| Backup version independence | `CONFIRMED` | Keep multiple versions, but every version is a complete standalone package that can be read and imported without any earlier backup. Delta/incremental dependency chains are excluded. |
| Local export name and destination | `CONFIRMED` | Let the user edit the filename, generate a stable product-name-plus-date default, and use the platform save/share picker for the destination where supported. |
| Backup access surface | `CONFIRMED` | Do not build an internal local backup library. Local files are imported through the platform picker; a connected personal R2 is listed and restored directly inside SchatPhone without a separate Cloudflare download step. |
| In-app R2 deletion | `CONFIRMED` | Deleting in SchatPhone permanently deletes the selected backup object from the connected personal R2. A prominent modal must name the backup, explicitly say the cloud copy is also deleted, distinguish the unaffected current save/other/local files, and require a destructive confirmation. |
| Cloud version retention | `CONFIRMED` | SchatPhone never automatically rotates or deletes personal-R2 backups. Every version remains until explicit user-confirmed deletion; quota pressure may warn or block a new backup but cannot silently remove an existing recovery point. |
| Same-device material preservation | `CONFIRMED` | A restore first reuses exact matching local binaries and does not delete or hide current-only retained Gallery material merely because an older or binary-excluded backup lacks it. |
| Legacy incomplete media | `CONFIRMED` | Valid legacy core data may restore after a clear missing-material summary. Unresolved media remains as a typed placeholder with stored descriptive text where available rather than corrupting or removing the owning record. |
| Backup/recovery engineering contract | `ARCHITECTURE_ACCEPTED` | Complete package, integrity, capacity, staged restore, migration, failure, crash recovery, rollback, and acceptance-test boundaries are frozen in `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md`. |
| Persistence inventory and Repository contract | `BOOK_ACTIVE` | Canonical inventory includes the active Book Repository database/six stores and direct legacy fallback; exact schema, staging, policy, coordination, activation, reopen, and rollback gates pass. |
| Storage runtime implementation | `BOOK_ONLY_DONE` | Book is the sole active Repository owner. Cloudflare connector, media offload, Gallery schema, legacy deletion, garbage collection, and every other owner migration remain unapproved. |
| Unified world-setting architecture | `STAGE_W1_DONE` | `worldId` is distinct from `packId` and save identity. Book owns text, WorldBook owns activation/current-world context, Packs own optional capabilities, and consumers read an immutable shared projection. Persisted world definitions, W2 migration, and switching remain unapproved. |
| Cross-module Mini Scene | `FOUNDATION_DONE` | Pure request/draft/artifact/policy schemas, empty-by-default caller registry, Book structured-profile/regex validation, and deterministic profile resolution are landed and tested. No caller or runtime path imports them yet. |
| Mini Scene persistence/runtime | `NOT_STARTED / SEPARATE_APPROVAL` | Artifact/profile-binding/policy data classes, popup UI, safe regex engine, HTML sandbox, and each source Adapter remain staged work outside persistence Batch 2B. |

Current inventory and validation posture:

- 40 route-view files, 17 Pinia stores, 44 Vue components under `src/components`, and 37 JavaScript composables;
- 153 JavaScript files, 85 Vue files, and 131,038 source lines under `src`;
- 209 static unit-test files;
- the 2026-07-22 architecture baseline passed 185 Vitest files / 1170 tests, lint, production build, both audit scopes, and 56 of 60 Playwright cases with 4 intentional skips;
- the current local integration passes lint, 209 Vitest files / 1479 tests, production build, and both audit scopes; remote CI and the deployed Pages artifact have Run #130 and deployed-browser smoke evidence, while named physical-device and independently rerunnable audit proof remain open.

## 2. Landed Architecture Baselines

### Ownership Contracts

- Contacts, Chat Directory, Chat, and relationship runtime have distinct owners;
- Book, WorldBook, World Pack, and Files have distinct owners;
- WorldBook owns current-world identity and activation while Book owns reusable text assets and the World Pack Module owns optional capability definitions; Pack activation is not world selection or content binding;
- Calendar, Reminders, and Map have distinct owners;
- Shopping/Food Delivery, Logistics, Wallet, Assets, and Chat notification references have distinct owners;
- World Hub reviews runtime state without becoming an ordinary record owner.

### Shared Interfaces

- `src/lib/ai.js` is the approved text/conversation provider transport entry, while `src/lib/image-generation-contract.js`, `src/lib/image-generation-api.js`, and `src/stores/imageGeneration.js` own the dedicated shared image-generation transport/configuration/task boundary;
- `src/lib/world-interface.js` now exposes stable compatibility identity separately from narrative, encyclopedia, profile-template, Pack-capability, and diagnostic projections;
- `docs/architecture/WORLD_SETTING_ARCHITECTURE.md` defines the accepted Interface and the separately gated W2 migration from compatibility scope to persisted WorldBook-owned identity;
- relationship facts, role bindings, source cleanup, app bindings, service templates, shareable objects, image sources, and persistence use named helper contracts;
- notification and API report access has focused `systemStore` facades;
- Settings backup, storage diagnostics, and push orchestration has focused workflow composables.

### Large-View Decomposition Already Landed

Do not repeat these seams.

Chat has 15 focused composables for:

- active thread;
- AI request state;
- AI prompt context;
- AI image references;
- assistant response parsing;
- assistant result post-processing;
- automation status;
- home list;
- service-thread display;
- service feedback;
- message edit display;
- message action sheet;
- user action panel;
- thread menu;
- pending quote.

Contacts has 10 focused composables for:

- home list;
- memory list;
- memory detail;
- linked activity;
- Role Hub;
- world fields/template adaptation display;
- danger zone;
- detail sections;
- profile header;
- profile-template editor display.

WorldBook has 3 focused composables for:

- Book source links/picker/diff;
- knowledge filters/readiness/deep links;
- profile-template display.

Settings has focused workflows for:

- backup/restore;
- storage diagnostics/repair;
- push setup and lifecycle.

## 3. Current Measured Debt

### Largest Views

| File | Lines |
| --- | ---: |
| `FoodDeliveryView.vue` | 10329 |
| `ContactsView.vue` | 5232 |
| `ChatView.vue` | 4776 |
| `HomeView.vue` | 4373 |
| `ChatDirectoryView.vue` | 4122 |
| `WorldBookView.vue` | 4093 |
| `WidgetsView.vue` | 4050 |
| `AppStoreView.vue` | 3647 |

### Central Store

`src/stores/system.js` is 4644 lines and directly imported by 24 of 40 route views. It coordinates settings, appearance, Home, app placement, notifications, API/network, push, world compatibility, automation, reports, and backup-reminder state.

Preferred response: add one stable facade at a time while preserving storage/backup compatibility. Do not split the store wholesale.

### Direct Store Coupling

Current direct store imports include:

```text
calendar      -> Reminders, Chat, RelationshipRuntime, System
foodDelivery  -> Chat
gallery       -> Map, System
map           -> System
phone         -> Calendar, System
reminders     -> Calendar, Map
shopping      -> Calendar, Chat
stock         -> Calendar
```

Calendar's relationship-fact path is the best first adapter-depth candidate because Calendar still passes concrete Chat and relationship-runtime stores into the shared adapter.

### Current-World Identity Compatibility

Stage W1 is complete, while the single-world baseline still has no WorldBook-owned persisted world definition:

- `WorldBookView.vue` and `ContactsView.vue` read stable `legacy_single_world` identity and current templates through the shared Interface;
- WorldBook displays the stable world setting separately from the Pack capability panel;
- WorldBook source links and structured encyclopedia enablement are one current-save global set;
- historical profile templates can retain Pack-shaped aliases, while new explicit saves use the stable compatibility scope sentinel;
- Pack schemas retain legacy Book/encyclopedia/template reference fields only as non-blocking diagnostics.

Preferred response: preserve Stage W1 and do not start W2 until the persisted world-definition schema, complete-backup manifest, deterministic legacy-scope migration, atomic activation, and rollback are separately approved. A world selector or partial per-record migration remains prohibited.

### Type Coverage

There are zero `.ts/.tsx` source files. Existing normalizers and tests are valuable, but high-value shared payloads have no compile-time contract.

Use incremental JSDoc or TypeScript for new/extracted contract modules only. Do not begin a whole-app migration.

## 4. Security And Release Debt

### Backup Credentials

Settings backup exports the full settings snapshot, including `settings.api.key`, in plaintext JSON.

Confirmed product contract:

- complete local migration backup remains a whole-product snapshot and includes configured credentials;
- the product must describe the exported file as sensitive local data before download;
- a future redacted/shareable export may exclude credentials, but it must not silently replace the migration backup;
- encryption remains optional future work and requires an explicit key-management and recovery contract.

Implemented 2026-07-22:

- every complete local backup JSON export asks for explicit danger confirmation before building the payload, Blob, object URL, or download;
- the fixed warning names configured API credentials and private chat, role, and world data, and does not weaken under immersive copy tone;
- cancellation resets the busy state and creates no payload, download, success/failure feedback, backup timestamp, or storage report;
- confirmed metadata-only and whole-asset-package exports retain the v2 shape and configured API key unchanged.

### Dependency Audit

2026-07-22 dependency-maintenance results:

- direct Vite is 7.3.6, with compatible root esbuild 0.28.1 and Rollup 4.62.2; Vue 3.5.27 and plugin-vue 6.0.4 remain unchanged;
- Vitest is 4.1.10 and reuses root Vite 7.3.6; the previous nested Vite 5.4.21, vite-node 1.6.1, and esbuild 0.21.5 packages are removed;
- the isolated Vitest migration first reduced full audit from 14 advisories to 10 and removed the old nested Vite/esbuild critical path;
- normal npm resolution then refreshed only compatible transitive advisory nodes and the required `hasown` child closure, without changing `package.json`, any direct dependency version, override/resolution policy, or major line;
- production audit: 0 vulnerabilities; full audit: 0 vulnerabilities.

2026-08-07 audit repair:

- Pages Run #128 stopped before deployment at `Audit all dependencies` because the lockfile held the transitive `js-yaml` 4.3.0 advisory range;
- normal npm resolution refreshed only `node_modules/js-yaml` to 4.3.1 in `package-lock.json`, with no `package.json`, direct dependency, override, or resolution change;
- production audit and full audit report 0 vulnerabilities; local lint, 209 Vitest files / 1479 tests, and production build pass; remote Pages Run #130 is green and deployed successfully.

Do not report only the production audit when describing developer/CI safety.

### Push Relay

The relay is development/single-operator infrastructure:

- no authentication or authorization;
- permissive CORS;
- local JSON persistence for VAPID keys, subscriptions, and schedules;
- no rate limits, tenancy, secret manager, or authoritative app state;
- not deployed by GitHub Pages.

Do not describe it as a production backend or closed-page simulation engine.

### CI And Deployment

- the PR/manual CI workflow definition runs Node 24, `npm ci`, separate official-registry production/full audits, lint, unit, build, one Chromium install, and one full product E2E collection;
- the full E2E collection already includes the focused visual-quality cases, uses a dedicated strict port, fails on flaky recovery, and enforces no more than the four existing intentional skips;
- the main/manual-main Pages build definition runs the same gates on a separate strict port before configure/upload, and `deploy` still requires that verified build job;
- E2E/summary failures upload HTML, test-results, and JSON diagnostics for seven days without retaining download or storage-state data;
- no coverage threshold exists;
- local validation and CI both use Node 24.
- remote GitHub execution and a deployed Pages base-path smoke are proven by Run #130 and the live `/schatphone/` browser check;
- Vercel project `shawn-e-s-projects/schatphone` serves the root-path app at `https://schatphone.vercel.app` and detects fixed-upstream `/api/openai/v1/models` plus `/api/openai/v1/chat/completions` Functions; the unconfigured endpoint returns `503 PROXY_NOT_CONFIGURED` without leaking provider details;
- the initial Vercel production upload came from the local dirty tree; the `main` commit containing this deployment contract is the reproducible source for automatic later builds;
- the Git-connected Cloudflare Worker/static-assets deployment is live at `https://schatphone.noarry.workers.dev`: `npm run build:cloudflare` builds at `/`, the Worker serves the SPA and the same two fixed proxy routes, unknown API routes fail as JSON `404`, and the first Git-triggered build plus root, manifest, hash-route, static-asset, and fail-closed proxy smoke checks pass;
- external branch/environment required checks, production proxy secrets, one real-provider reply, installed-PWA/relaunch, and named true-device evidence remain separately unverified, so this release slice is partial.

## 5. Completed Governance Rounds

### 2026-07-22 Compatible Transitive Advisory Refresh

1. refreshed only the approved advisory nodes and required `hasown` child closure through normal npm resolution;
2. kept `package.json`, Vite 7.3.6, Vitest 4.1.10, plugin-vue 6.0.4, Playwright 1.60.0, jsdom 24.1.3, ESLint 9.39.2, Vue Test Utils 2.4.6, and eslint-plugin-vue 9.33.0 unchanged;
3. used no override/resolution or direct/major dependency migration and left production/full audit at 0/0;
4. passed lint, 185 Vitest files / 1170 tests, production build, and 60 collected Playwright cases with 56 passed and 4 existing project-specific skips.

### 2026-07-22 Vitest 4 Isolated Migration

1. confirmed through the official npm registry that Vitest 4.1.10 is the current stable 4.x release, supports Node 20/22/24, and peers with Vite 7;
2. updated only Vitest and its required lockfile dependency tree, leaving Vue, plugin-vue, root Vite 7.3.6, esbuild 0.28.1, and Rollup 4.62.2 unchanged;
3. replaced the old test-body `vi.stubEnv` module-reload assumption with a test-mode-only Vite define so the same environment-default assertions remain valid under Vitest 4/Vite 7;
4. preserved the then-current complete unit and Playwright baselines and passed lint plus production build;
5. kept production audit clean and reduced full development audit from 14 advisories to 10, with no critical advisory remaining.

### 2026-07-21 Vite 7 Compatible Patch

1. confirmed through the official npm registry that Vite 7.3.6 is the current compatible Vite 7 patch and preserves the existing Node engine floor;
2. updated only the direct Vite range and its compatible root esbuild, Rollup, `@types/estree`, platform packages, and lockfile metadata;
3. kept Vue, plugin-vue, Vitest, and the nested Vitest Vite/esbuild line unchanged;
4. passed governance, lint, 173 Vitest files / 1071 tests, production build, and 34 Playwright scenarios;
5. kept the full development audit explicit at 14 advisories while the production audit remains clean.

### 2026-07-16 Workflow Layering

1. reduced `AI_WORK_MODE.md` from a universal implementation workflow to a thin cross-task execution contract;
2. delegated domain reading order, workstreams, validation detail, and documentation sync to the seven task packages;
3. kept event/runtime and visual/IA skill routing inside their specialist workflow documents;
4. removed the stale Contacts reference to a local workflow skill;
5. extended governance tests to prevent task-specific routing and specialist skills from moving back into the cross-task contract.

### 2026-07-14 Workflow Governance

1. retired `schatphone-workflow` so a workflow or skill cannot make itself mandatory or prove its own correctness;
2. retained `AI_WORK_MODE.md` as the central process authority and added root `AGENTS.md` as a short bootstrap;
3. removed the retired Superpowers planning skills and synchronized active inventory documentation;
4. added `npm.cmd run governance:check` for inventory, retired-reference, bootstrap, task-package, and mojibake checks;
5. aligned the documented local Node/npm baseline with the current machine without changing the CI Node version.

### 2026-07-10 Project Governance

1. rebuilt master, roadmap, PM, architecture, maturity, strategy, and candidate docs from one evidence baseline;
2. removed recommendations to begin already completed 4.1-4.4 work;
3. corrected global Appearance pack semantics;
4. recorded the K-pop planning artifact as a decision gate;
5. ran full lint/unit/build/E2E and dependency audits;
6. kept code and storage behavior unchanged.

## 6. Recommended Next Slice

Use the live roadmap order.

The 2026-07-22 product-release audit changes that order through roadmap 4.9:

1. personal R2/Worker onboarding is post-release because remote transport cannot repair an unsafe local write or an incomplete local recovery package;
2. structured write results, newest-valid local/mirror reconciliation, product-level save-failed/read-only recovery, and the product-wide same-container writer boundary are integrated foundations;
3. `DONE 2026-08-09`: the release-local v3 backup/restore/reopen boundary covers required Chat identity/avatar state, default-on retained Gallery material, integrity verification, durable rollback checkpoints, startup crash recovery, and legacy compatibility;
4. first Chat activation and the explicit custom-role-to-Chat journey are already product-side complete; remote CI/Pages, the deployed `/schatphone/` smoke, the Git-connected Vercel root/proxy baseline, and the Git-connected Cloudflare Worker/static-assets deployment plus URL smoke are complete. Deployed PWA/install/offline, configured hosted-provider Chat, and named true-device backup evidence still close the public-release gate;
5. Gallery schema, non-Book Repository cutovers, production push, hotspot decomposition, incremental typing, Mini Scene, and World Setting W2 remain post-preview unless a current product blocker requires a separately approved slice.
6. roadmap 4.10's Camera/shared-image-generation first slice is complete; the shared Vercel proxy transport exists, but Camera provider routing through it, Gallery People truth, source-module callers, true-device checks, and hosted-provider smoke require separate promotion.

### P0: Current Save Safety And Complete Local Recovery

Status: `DONE 2026-08-09` for the roadmap 4.9 release-local boundary; write-result, local/mirror freshness, product-level failure recovery, same-container read-only enforcement, and complete v3 local export/restore/crash recovery are implemented.

Completed release-local slice:

- v3 requires all 27 current backup sections, including Chat identity/avatar state, and writes canonical per-section, payload, manifest, and Gallery-binary SHA-256 evidence;
- whole-Gallery material is default-on and fail-closed: missing, unreadable, corrupt, or skipped retained binaries stop complete export or required restore;
- import verifies before current-save mutation, durably stages a clone-safe metadata-plus-binary rollback snapshot in the existing Repository journal, preserves current-only Gallery material during older restore, closes successful/failed checkpoints, and rolls back unfinished restore work before mount;
- desktop and simulated-mobile Chromium prove sensitive export, Chat identity round trip, completed-log reopen, interrupted-restore rollback, and blocked-IndexedDB fail-closed startup; the full E2E suite passes with 128 tests and four intentional skips.

Next coherent architecture work remains separate: predictive capacity reporting, independent inventory-to-registry closure, broader cross-owner Repository generations, local destination confirmation, legacy unavailable-media presentation, and personal R2/Worker transport. None reopens the completed roadmap 4.9 release-local gate unless release evidence exposes a blocker.

`DONE 2026-08-07`: one page-level current-save writer is acquired before reconciliation and Store mount. A later same-container page times out into the existing read-only recovery state, inspects all 17 targets without repair, and cannot mutate layered sync/async/deferred mirror carriers, Book Repository/legacy writes, Gallery binaries, or image-generation credentials/candidates. Releasing the first page permits retry and captured owner writes; unchanged heads persist, while a head changed by the former writer remains reconciliation-blocked. Focused Vitest and real two-page Chromium cover cross-owner zero-write behavior, fallback heartbeat lease loss, retry, and stale-head rejection. Store snapshots, envelopes, Repository schema, backup format, force takeover, and last-write-wins remain unchanged.

`DONE 2026-08-07`: sync and async layered write failures plus Book Repository failures now enter one non-persisted product status. The root shell distinguishes primary-save failure, read-only conflict, and local-primary/mirror-degraded states; retryable incidents can retry their captured owner write, successful writes clear only their matching incident, and non-retryable errors do not expose false retry. Reload-current-save requires destructive confirmation, and the emergency action opens the existing Settings complete-backup section instead of inventing a second backup owner. Desktop Chromium and simulated Pixel 5 failure injection prove quota recovery, unresolved zero-write conflict, backup handoff, 44px actions, viewport containment, and no horizontal overflow. Envelope, Store, Repository, and backup formats are unchanged; broader same-container WriteCoordinator coverage and complete recovery remain open.

`READY_FOR_INTEGRATION_REVIEW 2026-07-22`: the approved write-result primitive now returns stable structured results from the existing synchronous and asynchronous persistence entrypoints. Serialization, quota, security, unavailable-carrier, and IndexedDB mirror failures are classified; failed writes retain the last confirmed bytes; asynchronous results expose local primary and mirror outcomes separately. Focused failure-injection coverage and the full lint/unit/build baseline pass. Existing Store callers may continue ignoring the return value. Store/UI adoption, read-path reconciliation, broader WriteCoordinator coverage, complete recovery, and local/mirror authority decisions remain separate slices.

`DONE 2026-07-22`, inventory extended 2026-07-29: the approved local/mirror freshness foundation adds optional lineage/sequence envelope metadata, applies clock-independent frozen winner/conflict rules, re-reads heads before repair, verifies repaired bytes, rejects mirror regression and sequence overflow, and blocks later writes when reconciliation is unresolved, including a semantic conflict detected by deferred mirror flush. Inspection separates payload validity from ordering validity and carrier applicability from availability: malformed generation remains readable-unordered, a disabled mirror is not applicable, and an enabled but unavailable mirror degrades/forks and reports async failure. Partial local-repair failure keeps the proven mirror winner available through Store fallback, while unresolved conflicts return null and remain write-blocked; sync and async generation exhaustion retain the non-retryable generation result. `main.js` performs a bounded preparation before Pinia Store creation/mount from the independent 17-target inventory; `store:book` is repository-owned inspect-only and remains byte-identical, while the other 16 layered owners may reconcile. Focused Vitest and real-Chromium coverage prove reversed-clock mirror recovery, stable reopen, corrupt/absent/unavailable handling, zero-write conflicts and legacy ambiguity, source-change/partial-repair behavior, bootstrap ordering, and blocked-IndexedDB timeout. This foundation itself added no Store/UI/WriteCoordinator/backup/Repository migration; its structured results are now consumed by the separate 2026-08-07 product-level recovery slice above.

### P0: Local Persistence, Backup, And Data Lifecycle Architecture

Status: `IN_PROGRESS`; the non-active foundation and separately approved Book-only application cutover are complete, while every non-Book migration/cutover remains unapproved.

1. `READY_FOR_CONTROL_REVIEW 2026-07-21`, extended 2026-07-29: independently classify authoritative, auditable, rebuildable, binary, secret, hint, and transient data and connect the 17-store diagnostic projection;
2. `DONE 2026-07-18`: translate the confirmed local-keep, whole-Gallery option, URL-only backup, recovery-only R2 role, default-off automation, platform save/share behavior, and direct in-app R2 restore view into testable implementation acceptance;
3. `DONE 2026-07-18`: translate complete-package, explicit R2 retention, backup-size/quota, creation/delivery failure, integrity, staged restore, legacy degraded recovery, local-material reuse, migration, crash recovery, and rollback into testable acceptance;
4. `ARCHITECTURE_ACCEPTED 2026-07-21`: the owner-aware Repository Interface, exact separate IndexedDB v1 stores/keyPaths/indexes, immutable record versions and generation membership, atomic pointer/journal, localStorage hints, contextual persistent-storage request, read-only multi-tab conflict behavior, and rollback gates are accepted;
5. `DONE 2026-07-18`: freeze complete standalone backup objects, manifest/integrity checks, non-destructive Gallery resolution, local save/share delivery states, staged atomic activation, rollback, and legacy snapshot migration in `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md`;
6. preserve the provider-neutral remote-backup and Cloudflare R2 onboarding acceptance as post-release architecture work under the confirmed Worker, encryption, recovery, and browser-scheduling boundaries;
7. `DONE 2026-07-22`: implemented the exact non-active Batch 2B Adapter/schema/fixture/test list, including `e2e/persistence-repository-foundation.spec.js`, without Store import, cutover, dual write, or activation;
8. `DONE 2026-07-22`: implemented the separately approved Book-only runtime cutover with explicit in-context permission flow, fenced atomic activation, normal-Adapter reopen verification, automatic first-cutover rollback, Repository-only later writes, byte-identical retained legacy data, awaited backup-restore persistence, and focused Chromium coverage; the section-6/10 activation, reopen, rollback, backup, and product-equivalence gates pass, while Mini Scene persistence/policy remains a separate roadmap 4.8 decision.

Cross-package dependencies:

- Contacts owns global role lifecycle and archived-role recovery semantics;
- Relationship Runtime remains the sole owner/writer of persistent relationship truth and audit evidence;
- Event Runtime owns event/proposal definitions and provenance while its ontology remains extensible;
- Chat owns conversation records and thread behavior only, including future paused-thread read-only enforcement.
- Gallery owns reusable retained media and cross-module asset references; source modules own generated-candidate meaning and the records that use accepted media; Settings owns backup controls and status, not media truth.

### P0: Security/Toolchain After The Storage Contract

1. `DONE 2026-07-22`: add the confirmed sensitive-file warning before every complete JSON export without changing complete-migration contents or adding a shareable variant;
2. `DONE 2026-07-21`: update the compatible direct Vite 7 patch and required root transitive dependencies;
3. `DONE 2026-07-22`: migrate Vitest independently to 4.1.10 and remove the nested Vite 5/esbuild advisory chain without reducing test coverage;
4. `DONE 2026-07-22`: refresh the remaining compatible transitive advisory nodes through normal npm resolution and close production/full audit at 0/0 without direct, override, or major changes;
5. `DONE 2026-07-22`: define the full-product E2E and separate production/full dependency-audit workflow policy independently from completed dependency remediation.

### P1: Release Gate

1. `WORKFLOW_IMPLEMENTED 2026-07-22`: PR verification and main Pages build now define the same full fail-closed gate while preserving focused visual coverage inside the full E2E suite;
2. `DONE 2026-08-07`: verify the remote main Pages workflow. Run #130 passed its fail-closed build gate and `deploy` job for `9c263cb`; external main required-check and `github-pages` environment-protection policy remain separately unverified.
3. `DONE 2026-08-07`: smoke the deployed `/schatphone/` artifact through lock -> Home -> Map, including the manifest, base-path route, map rendering, console-error, and horizontal-overflow checks.

### P1: Cross-Module Mini Scene Foundation

Status: `STAGE_1_DONE / STAGE_2_SEPARATE_APPROVAL`.

1. `DONE 2026-07-21`: pure Stage 1 request/draft/artifact/profile/module-policy schemas, dynamic caller registry, world/profile resolver, Book structured-profile validator, and 22 focused tests;
2. preserve the empty caller registry and absence of regex execution, Settings UI, persistence, popup runtime, iframe rendering, AI calls, and source-module triggers;
3. approve persistence ownership and complete-backup coverage separately after the Book Repository foundation before storing `mini_scene.artifact`, profile bindings, or module policies;
4. add Text and HTML Presenter Adapters in separate stages, with interactive HTML blocked until sandbox/CSP/message-bridge/malicious-input tests pass;
5. make the K-pop Calendar music-show day the first optional world-specific integration only after the shared Module is ready; Map, Chat, and future streaming each require a later focused Adapter slice.

### P1: Unified World Setting Identity

Status: `STAGE_W1_DONE / STAGE_W2_NOT_APPROVED`.

1. `DONE 2026-07-22`: accept `docs/architecture/WORLD_SETTING_ARCHITECTURE.md` without widening it into persisted world definitions or multi-world switching;
2. `DONE 2026-07-22`: deepen the current world Interface so `legacy_single_world` identity is stable and Pack capability state is a separate projection;
3. `DONE 2026-07-22`: route WorldBook and Contacts reads through the Interface; new template/contact writes use the stable compatibility sentinel instead of Pack IDs;
4. `DONE 2026-07-22`: prove Pack changes cannot change identity, Book links, encyclopedia selection, or profile-template selection, and make missing legacy content references non-blocking;
5. preserve unchanged System/Book schema and complete-backup bytes from Stage W1;
6. require a separate Stage W2 schema/migration/rollback review before persisting WorldBook-owned world definitions.

### P1: One Architecture Seam

With Stage W1 complete, the following remain unapproved comparison candidates, not accepted architecture and not approval for any Calendar carrier change:

- a `systemStore` facade;
- one Home edit/library seam;
- one Chat Directory management seam;
- the Calendar relationship adapter.

One slice must preserve storage shapes and product behavior, add focused tests, and update measurements.

## 7. Do Not Do

1. do not refactor several hotspots in one round;
2. do not combine dependency migration with product features;
3. do not split `systemStore` before defining storage migration and rollback;
4. do not repeat completed Chat/Contacts/WorldBook composable seams;
5. do not use TypeScript adoption as a broad rewrite;
6. do not turn cleanup into new product requirements;
7. do not treat `docs/superpowers/**` plans as active work without roadmap promotion;
8. do not remove compatibility state without migration evidence.
9. do not treat the current IndexedDB mirror as the primary database or as proof that `localStorage` capacity is no longer a constraint.
10. do not introduce SQLite-only assumptions while browsers/PWAs remain complete first-class clients.
11. do not solve capacity pressure by silently deleting authoritative history, accepted relationship evidence, user documents, or referenced assets.
12. do not turn AI diagnostics, API reports, backups, or audit records into an undeclared permanent copy of full prompts or raw provider responses.
13. do not classify durable content by today's module list or discard an AI-generated post, scene, long-form record, performance record, or state history after its owner has formally committed it.
14. do not make `keep` upload media or silently opt it into backup.
15. do not add a per-item material picker to the backup flow; Gallery admission is the curation step and backup uses one whole-library choice.
16. do not implement delta/incremental backup chains in which one restore version depends on another.
17. do not use successful remote backup as permission to release local originals.
18. do not create a hidden or user-facing in-app local backup library; local export files remain owned by the platform file system.
19. do not require users to visit the Cloudflare dashboard before restoring a backup that SchatPhone can access through the configured personal R2 connection.
20. do not label R2 deletion as a generic `delete` or treat it as hiding a list row; the action must say it permanently deletes the connected cloud backup.
21. do not remove the row locally until the personal Worker confirms that the R2 object deletion succeeded.
22. do not rotate, expire, or delete any local export or personal-R2 backup automatically; capacity pressure may block creation and request user action, but it cannot authorize silent cleanup.
23. do not let an older restore delete or hide current-only retained Gallery material, and do not attach a local binary by filename, label, prompt, or URL without exact identity/digest evidence.
24. do not label a missing-media placeholder as a recovered original or discard the owning message/record because its binary is unavailable.
25. do not treat acceptance of `BACKUP_RECOVERY_ENGINEERING_CONTRACT.md` as approval for IndexedDB, R2, Gallery schema, or reference-migration implementation.
26. do not add Mini Scene runtime, persistence, Settings fields, regex execution, or popup UI to the approved persistence Batch 2B file set.
27. do not execute raw AI HTML, Book/profile HTML, or legacy Chat `htmlSnippet`, and do not run unbounded native regex on the UI thread.
28. do not let Book/WorldBook/World Pack activation or a caller hint silently override an explicit per-module Mini Scene mode.
29. do not make a K-pop profile, a sensitive-content choice, or World Pack membership a prerequisite for custom-world Mini Scenes.
30. do not persist `activeWorldPackId`, `default_world`, or another Pack ID as canonical `worldId`.
31. do not let Pack activation switch world identity or bind Book sources, encyclopedia entries, profile templates, sensitive choices, or Mini Scene policy.
32. do not implement future world definitions as internal save slots, workspace switching, cross-container discovery, sync, or merge.
33. do not begin a partial persisted-world migration before every world-sensitive owner has an explicit global/world-scoped/portable classification and rollback path.

## 8. Validation

Required for every meaningful 4.5 slice:

- `npm.cmd run governance:check` when workflow, active documentation, task packages, or skills change;
- targeted tests for the new interface/migration;
- `npm.cmd run lint`;
- `npm.cmd run test`;
- `npm.cmd run build`;
- Playwright when routes or user flows are affected;
- dependency audit when the lockfile changes.

## 9. Must Sync

1. this file and package README;
2. `docs/roadmap/TODO_ROADMAP.md`;
3. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`;
4. `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`;
5. `docs/roadmap/PROJECT_MODULE_AUDIT.md`;
6. `docs/architecture/ARCHITECTURE.md` and debt review when evidence/semantics change;
7. `docs/pm/TODO_PM_STATUS_REPORT.md` when priority or release posture changes.
8. `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md` when complete-package, integrity, capacity, restore, migration, or rollback acceptance changes.
9. `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` and the relevant source/presentation/runtime package handoff when Mini Scene Interfaces, world resolution, Book transforms, presenters, persistence, or calling-module meaning changes.
10. `docs/architecture/WORLD_SETTING_ARCHITECTURE.md` when world identity, Book/WorldBook ownership, Pack capability meaning, consumer projections, complete-backup references, or migration gates change.
