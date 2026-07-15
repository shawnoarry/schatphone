# Module Architecture Governance Status And Handoff

Updated: 2026-07-16

This is the current handoff for architecture cleanup, state ownership, persistence, security, and release-quality work.

## 1. Current Status

Status: `IN_PROGRESS`

Roadmap owner: 4.5 Architecture, Security, And Documentation Maintenance.

SchatPhone's domain architecture is sound enough to preserve. The current problem is concentration and hardening, not missing architecture or a need for framework replacement.

Current active architecture slice:

- ordinary browsers and installable PWAs remain complete first-class clients;
- one isolated browser/Web App storage container owns one current save;
- authoritative Chat/role/relationship/memory/user-document records and still-referenced assets cannot be silently or irreversibly deleted; cold archival must remain reversible;
- any content formally published, confirmed, applied, or admitted into an owning module's history is durable when it can be revisited, referenced, or affect continuity, regardless of user/AI/system origin;
- full AI prompts, raw provider responses, transport payloads, uncommitted drafts, and rebuildable projections remain non-authoritative; canonical committed content, authoritative state/facts, cross-module references, and minimum provenance are durable;
- IndexedDB-first structured persistence is the target direction, while `localStorage` becomes small hot state and recovery metadata;
- optional remote backup is personal BYOS: there is no project/workgroup-owned unique cloud, each user owns a separate Cloudflare account and R2 destination, and Cloudflare R2 is the first officially guided target behind a provider-neutral contract;
- each user deploys a personal Cloudflare Worker gateway bound to that user's R2 destination; SchatPhone may retain only a revocable, scoped device token and must not retain an R2 API Secret;
- personal remote backups are encrypted on the client and support two independent recovery paths: a recovery password or separately downloaded recovery file; Cloudflare/Worker receives no plaintext recovery secret, losing both paths is irreversible, and initial setup must verify recovery before automatic backup becomes ready;
- remote backup keeps the local save authoritative and may run after app launch and while the browser/PWA remains open; it is not live server storage, cross-device sync, automatic merge, or a promise of closed-app background execution;
- a complete self-checking Cloudflare setup, backup, recovery, revocation, quota, and troubleshooting guide is required before this can become an implementation slice;
- this is a promoted architecture-decision slice, not approval to migrate application storage yet.

### Product Decision Checkpoint - 2026-07-16

| Area | Status | Current meaning |
| --- | --- | --- |
| Browser/PWA persistence | `CONFIRMED` | One isolated browser/Web App container owns one current save; IndexedDB-first is the target and `localStorage` becomes small hot/recovery state. |
| Durable records | `CONFIRMED` | Committed user/AI/system content and authoritative/audit truth remain durable under their owning modules; raw transport and rebuildable material do not. |
| Personal cloud | `CONFIRMED` | No shared project/workgroup archive. Each user owns a separate Cloudflare R2 destination behind a provider-neutral contract. |
| Remote security | `CONFIRMED` | A personal Worker gateway uses a revocable scoped device token; the app never stores the R2 API Secret. Backups are client-encrypted with recovery-password or recovery-file restore. |
| Browser automation | `CONFIRMED` | Automatic backup may run after launch and while the app remains open; closed-app scheduling, sync, and merge are not promised. |
| Gallery role | `CONFIRMED` | Gallery is the user-facing reusable media/material library. Source modules own why/how a retained asset is used; Chat still owns message-scoped media records. |
| Generated media | `CONFIRMED` | Every image/media generation flow must present a user retention decision before the result becomes durable; rejected candidates remain transient. |
| URL media | `CONFIRMED` | Media type and storage source are separate. A URL may represent an image, sticker, GIF, audio item, or other media without first becoming a local file. |
| Per-result three-way storage choice | `WITHDRAWN` | Do not require `discard / local only / cloud protected` on every generated result; this exposed storage mechanics as a primary workflow. |
| Fixed `8 GB` product budget | `WITHDRAWN` | No fixed budget is approved before real backup-size measurement and a media-retention contract exist. |
| Selective media protection | `UNRESOLVED` | Define whether kept material is cloud-protected by default, how users exclude or bulk-select it, and how favorites/current use/module importance affect recommendations or priority. |
| Remote media placement | `UNRESOLVED` | Decide whether R2 remains backup-only or may hold verified originals while SchatPhone releases local binary cache to reduce device storage. |
| URL exact-copy policy | `UNRESOLVED` | Decide when backup stores only URL/provenance and when it protects exact bytes; public/free image hosts are sources, not yet an approved authoritative backup layer. |
| Deletion/version retention | `UNRESOLVED` | Define current deletion, historical restore, changed content behind one URL, asset cleanup, and quota-aware version rotation after the earlier gates close. |
| Storage implementation | `NOT_APPROVED` | No IndexedDB migration, Cloudflare connector, media offload, or Gallery schema implementation begins from planning alone. |

Verified baseline:

- 30 route views, 16 Pinia stores, 36 components, 36 composables;
- about 104k source lines;
- 172 Vitest files / 1054 tests pass;
- 30 Playwright desktop/mobile scenarios pass;
- lint and production build pass;
- production dependency audit is clean;
- full dependency audit reports development/tooling advisories.

## 2. Landed Architecture Baselines

### Ownership Contracts

- Contacts, Chat Directory, Chat, and relationship runtime have distinct owners;
- Book, WorldBook, World Pack, and Files have distinct owners;
- Calendar, Reminders, and Map have distinct owners;
- Shopping/Food Delivery, Logistics, Wallet, Assets, and Chat notification references have distinct owners;
- World Hub reviews runtime state without becoming an ordinary record owner.

### Shared Interfaces

- `src/lib/ai.js` is the only provider transport entry;
- `src/lib/world-interface.js` centralizes active world context;
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
| `ContactsView.vue` | 4754 |
| `ChatView.vue` | 4312 |
| `WorldBookView.vue` | 4130 |
| `HomeView.vue` | 3920 |
| `ChatDirectoryView.vue` | 3802 |
| `WidgetsView.vue` | 3617 |
| `AppStoreView.vue` | 3352 |
| `FoodDeliveryView.vue` | 3161 |

### Central Store

`src/stores/system.js` is 4186 lines and directly imported by 22 of 30 route views. It coordinates settings, appearance, Home, app placement, notifications, API/network, push, world compatibility, automation, reports, and backup-reminder state.

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

### Dependency Audit

2026-07-10 results:

- production audit: 0 vulnerabilities;
- full audit: 1 critical, 9 high, 5 moderate advisories;
- Vite can receive a compatible 7.x patch update;
- Vitest remediation is a major upgrade and must be isolated.

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

- CI runs lint, unit tests, and build;
- CI does not run Playwright or dependency audit;
- no coverage threshold exists;
- Pages deployment performs a build-only workflow;
- local validation uses Node 24 while CI uses Node 20.

## 5. Completed Governance Rounds

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

### P0: Local Persistence, Backup, And Data Lifecycle Architecture

Status: `IN_PROGRESS` planning; no migration implementation is approved.

1. classify authoritative, auditable, rebuildable, binary, cache, and diagnostic data;
2. close the Gallery/material-library preservation gate: define candidate-to-keep/discard semantics, reusable Gallery ownership versus module-scoped media, and user-visible selective-protection behavior;
3. decide URL-only versus exact-byte protection, then decide whether verified R2 media may release local binary cache and what offline behavior remains;
4. define deletion/replacement/history semantics and quota-aware version retention only after backup-size reporting requirements are explicit;
5. define an IndexedDB-first logical schema, reversible hot/cold archive boundaries, append/update behavior, transactions, idempotency, multi-tab coordination, quota visibility, and domain repository contracts;
6. define versioned complete backup, integrity checks, staged restore, binary inclusion, rollback, and legacy `localStorage` snapshot migration;
7. finish the provider-neutral remote-backup and Cloudflare R2 onboarding acceptance under the confirmed Worker, encryption, recovery, and browser-scheduling boundaries;
8. select one small reference migration only after the preceding contracts and acceptance criteria are approved.

Cross-package dependencies:

- Contacts owns global role lifecycle and archived-role recovery semantics;
- Relationship Runtime remains the sole owner/writer of persistent relationship truth and audit evidence;
- Event Runtime owns event/proposal definitions and provenance while its ontology remains extensible;
- Chat owns conversation records and thread behavior only, including future paused-thread read-only enforcement.
- Gallery owns reusable retained media and cross-module asset references; source modules own generated-candidate meaning and the records that use accepted media; Settings owns backup controls and status, not media truth.

### P0: Security/Toolchain After The Storage Contract

1. add the confirmed sensitive-file warning without changing complete-migration contents;
2. update compatible Vite/transitive dependencies;
3. plan the Vitest migration separately;
4. validate and re-audit.

### P1: Release Gate

1. add or explicitly defer Playwright/audit CI gates;
2. align Pages release policy with the Definition of Done.

### P1: One Architecture Seam

Choose one:

- a `systemStore` facade;
- Current World Pack display/review state;
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
