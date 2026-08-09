# SchatPhone PM Status And TODO

Updated: 2026-08-09

> **PM status mirror / 产品状态镜像**
>
> This document explains current product state. It is not an execution board. Concrete task status belongs only in `docs/roadmap/TODO_ROADMAP.md`.

## 1. Executive Summary

SchatPhone is in an internal personal-development phase: product definition, core-system deepening, and evolvable architecture construction. Existing integrated loops are real, but they do not establish whole-product completion.

The core product can already support meaningful use and continued development:

- Lock -> Home -> app navigation is stable;
- Chat, Contacts, relationship memory, WorldBook/Book, Map/Calendar/Reminders, Camera/Gallery, Shopping/Food Delivery/Wallet, and optional runtime review are connected;
- backup/restore, storage diagnostics, push delivery, App Store entry management, and mobile-responsive flows exist;
- the current local integration has passing lint, unit, build, governance, and focused browser evidence; remote Pages Run #130, the deployed `/schatphone/` smoke plus direct configured-provider Chat/reload proof, the Git-connected Vercel root/optional-proxy baseline, and the Git-connected Cloudflare Worker/static-assets deployment plus URL smoke are proven. Installed PWA, external protections, and named physical-device proof remain open.

The current work is concentrated in four areas:

1. preserving the completed first-value Chat activation and custom-role journey;
2. preserving the completed current-save write/conflict safety and complete local v3 recovery point;
3. one ordinary daily-life cross-module loop;
4. deployed PWA, backup, external-protection, and true-device release proof; hosted direct-provider Chat is proven, while optional proxy proof is conditional.

The 2026-07-22 product-finish review intentionally moves personal R2, broad storage migration, hotspot decomposition, and secondary-module depth out of the first usable-product critical path. The product now advances by user-verifiable milestones rather than by accumulating architecture gates.

Roadmap closure is concrete: 4.1 Contacts IA, 4.2 memory dedupe, 4.3 World Hub review, and 4.4 service-account continuity are complete at current acceptance. 4.5 maintenance is active with Book Repository cutover and World Setting Stage W1 complete; 4.6 World Pack is partial, 4.7 has promoted the independent K-pop Book/WorldBook 2 + 6 + 1 content slice, 4.8 has a pure Mini Scene foundation with runtime still staged, 4.9 owns the usable-product-preview sequence, 4.10 has completed the first Camera/shared-image-generation slice while Gallery People and source callers remain deferred, and 4.11 has landed world-bound real Seoul/cyber-wasteland maps plus lightweight custom-map intake.

## 2. Product Positioning

SchatPhone combines:

- a believable phone shell;
- local-first user, role, world, relationship, media, schedule, location, commerce, and finance data;
- AI conversation/context through user-configured providers;
- safe cross-module continuity;
- optional event/runtime review rather than mandatory administration.

Normal use should stay inside the owning apps. World Hub, diagnostics, and advanced configuration are support/control surfaces, not the everyday product center.

## 3. Completion Dashboard

| Area | Current state | PM judgment |
| --- | --- | --- |
| Shell / Lock / Home | `Stable` | reliable foundation; final device polish remains |
| Settings / Network / backup | `Activation and local recovery usable` | Chat reaches Network and returns after save plus smoke success; root-shell recovery offers retry/reload, one page-level writer prevents unsafe later-page writes, and schema v3 complete backup now verifies required sections and Gallery binaries, restores Chat identity, rolls back failures, and recovers interrupted import before mount |
| Chat | `Stable core, structurally heavy` | deepest everyday loop; group orchestration and real-device media QA remain |
| Contacts / relationship | `Stable V2 baseline` | ownership, detail IA, memory review, classification, and cleanup are landed |
| Book / WorldBook | `Integrated V1, World Setting W1 done` | long text and activation are correctly split; strict JSON plus editable Markdown/TXT export, stable Pack-independent compatibility identity, and the independent K-pop 2 + 6 + 1 catalog are landed |
| World Pack / App Store | `Integrated V1, partial` | four target-app paths and reviewed proposals work; optional Book/encyclopedia/template references are non-binding diagnostics, while broader hardening is pending |
| Mini Scene | `Pure foundation landed, no runtime` | schemas, empty caller registry, Book profile/regex validation, and world resolution are tested; persistence, Settings, presenters, and source triggers remain separate |
| Map / Reminders / Phone | `Map partial; MJE-3 ready for user review` | Map resolves one map per world and renders geographic packs through keyless OpenFreeMap + MapLibre, while fictional/custom packs and startup fallback remain local. MJE-1 transport-aware planning and MJE-2 lifecycle/checkpoints are user-accepted in the current uncommitted tree; MJE-3 adds one validated low-impact checkpoint event family and awaits user review. Active exploration, public-transit topology, and a standalone Transit app remain separately gated |
| Calendar / Agenda Journey | `Calendar list baseline; orchestration architecture only` | Calendar is a visible list-first app for confirmed events, push state, and reminder context. Month/Week/Agenda Calendar views, the separate short-range Agenda Journey app, hidden Schedule Orchestrator, Activity Session timer, related event adapters, and Narrative Timeline have accepted terminology and ownership only; no CJA runtime or UI implementation has started |
| Shopping / Food Delivery / Logistics | `Integrated V1` | five independent Food Delivery shop facades share one Food Delivery runtime; the next roadmap-owned gap is one ordinary Food Delivery/Shopping consequence flow, while tracking and polish remain separate |
| Wallet / Gallery | `Wallet card-pack + role-payee V1 + historical quote detail; Gallery support platform` | Wallet exposes six fictional single-currency accounts/debit cards and one fictional six-currency credit card over one ledger truth; verified role account cards lead to explicit same-currency confirmation and separate receipts, while every Activity row can open a general detail that presents saved quote provenance without re-quotation; display currency and rates stay in Wallet Settings, NPC balances and automatic exchange remain excluded, and Gallery's deeper Photos ambitions remain controlled |
| Camera / Image Generation | `Focused V1, follow-ups staged` | Camera capture/configuration, three adapter families, bounded candidates, explicit Gallery keep, and public-config backup are implemented; Gallery People, other callers, hosted-provider and true-device proof remain |
| Assets / Stock | `Usable but shallow` | persisted MVPs, not yet headline product fantasies |
| Event Runtime / World Hub | `Partial / Guarded` | safe foreground review baseline; stronger controls and background autonomy are not finished |
| Visual system | `Partial` | several polished surfaces exist, but the product is not visually final end to end |
| QA / release | `Strong local baseline; hosted infrastructure partial` | remote Pages and `/schatphone/` smoke plus direct configured-provider Chat/reload pass; the Git-connected Vercel root/fail-closed optional AI proxy and Cloudflare Worker/static-assets root plus URL smoke are deployed; external checks, installed PWA, and true-device QA remain open |

## 4. What Users Can Do Now

### Phone And System

- unlock and return through a phone shell;
- organize Home entries, folders, widgets, and recover apps through App Store;
- manage theme, wallpaper, global CSS, app icons, app skins, and Chat appearance through their owning surfaces;
- back up and restore local product state;
- inspect and repair localStorage/IndexedDB mirror drift;
- configure AI endpoints, models, and push delivery.
- configure image providers/models inside Camera, choose Gallery references, review generated candidates, and explicitly download, keep, or discard them.

### Communication And Roles

- create and manage Self Profile, Main Role, and NPC profiles;
- bind roles into Chat without making Chat Directory the global role archive;
- use direct and group conversations, rich messages, quote/edit/save/delete/recall flows, and explicit AI invocation;
- request a role's system-verified fictional receiving-account card in Chat, then confirm the matching-currency transfer and review its receipt in Wallet;
- subscribe to service/official accounts and receive source-linked commerce/logistics updates;
- review current relationship metrics, memories, source records, and guarded cleanup from Contacts;
- review generated high-risk Chat social proposals before communication state changes.

### World And Continuity

- write/import long worldview, rules, and encyclopedia text in Book;
- link whole texts or selected sections into WorldBook and review changed versions;
- enable compatible World Packs, reviewed world app entries, service candidates, terminology, and currencies;
- feed active world/role/relationship context into Chat and event runtime;
- use explicit source lineage so one life event does not become multiple top-level relationship memories.

### Life And Commerce Apps

- use a world-bound real Seoul or cyber-wasteland map, render geographic Seoul through OpenFreeMap with a local fallback, search local places, add categorized pins, explicitly edit their coordinates in Map Settings, and manage trips without device location, provider POI, or live routing;
- bind another local map image or an explicitly accepted generated fictional map to the current world from Map Settings;
- manage confirmed Calendar events through the current list-first Calendar surface, raw Reminders cues, and Phone callbacks;
- browse and create Shopping/Food Delivery records, checkout, track updates, and produce downstream Wallet/relationship continuity;
- use Gallery assets across modules;
- use Wallet as a card-first app with six currency-specific virtual bank accounts/debit cards, one six-currency credit card, account-scoped transfers/receipts, Chat-disclosed role payees, activity, display-currency settings, and source-linked transactions whose saved historical quote details remain stable without automatic exchange;
- access Assets and Stock MVP loops.

## 5. What Is Not Finished

### Product And UX

- the shell and several large modules do not yet share final production-level visual consistency;
- current mobile E2E uses browser emulation; keyboard, safe areas, touch feel, browser chrome, permissions, media picker, and weak network still need real-device review;
- World Pack setup and target-app handoffs need true phone testing;
- Map gestures and large custom-map/offline behavior still need true-device testing; complete map-package validation, editing, georeferencing, and export are not implemented;
- Map's current Explore dashboard is passive Footprints-style progression, not active area exploration; MJE-1 transport planning and MJE-2 lifecycle/checkpoints are user-accepted in the current uncommitted tree, while MJE-3 is implemented and validated there but remains `READY_FOR_USER_REVIEW`; MJE-4 active exploration remains separately gated in roadmap 4.11;
- Calendar does not yet provide conventional Month/Week/Agenda views or full event authoring; Agenda Journey, Schedule Orchestrator, Activity Session, their event collaboration, and Narrative Timeline are architecture-only under roadmap 4.12;
- group chat has target/member/reply-mode V1, not full multi-speaker orchestration;
- Assets and Stock remain less deep than core modules;
- Cheats has no frozen product contract.

### Runtime

- foreground/local-session automation exists; true closed-page event generation does not;
- only conservative event families are enabled;
- high-impact relationship, romance, conflict, exposure, and destructive outcomes remain guarded or deferred;
- World Hub does not provide broad affinity/funds/unlock/freeform editing.

### Security And Release

- Settings backup currently includes the configured AI API key because it exports the full settings snapshot;
- the local push relay has no authentication and permissive CORS;
- the most recent Map source audit reported 0 production vulnerabilities and 10 high development-only findings in existing tooling paths; the controller's current rerun was blocked because the configured npm mirror does not implement the audit endpoint;
- PR CI and main Pages build definitions fail closed on both audits, lint, unit, build, and one full E2E run that includes focused visual coverage; remote Pages execution and the deployed base-path smoke are proven, while external protections remain pending;
- the Vercel Functions proxy keeps the upstream API key server-side and requires a separate client token, fixed HTTPS upstream, allowed origins, bounded request size/time, and redacted errors; it is a personal deployment boundary, not a public multi-tenant gateway or substitute for rate limiting and abuse controls;
- browser local storage is the user-data security boundary; there is no encryption-at-rest layer.

### Persistence And Recovery

- browsers and installable PWAs are confirmed as complete first-class clients;
- one isolated browser/Web App storage container owns one current save;
- authoritative user-visible records and relationship evidence cannot be silently or irreversibly deleted; capacity management must preserve reversible review/restore semantics;
- any content formally published, confirmed, applied, or admitted into an owning module's history becomes durable when it can be revisited, referenced, or affect continuity, including future social/forum/offline/narrative/performance/state-history records regardless of user/AI/system origin;
- full AI prompts/raw responses, uncommitted drafts, and rebuildable projections are not retained by default; canonical committed content, authoritative state/facts, references, structured outcomes, and minimum provenance remain durable;
- non-Book structured stores still use whole `localStorage` snapshots with an IndexedDB mirror rather than an IndexedDB-first database;
- Chat history, Gallery total binary usage, and several role/world collections need explicit growth and retention contracts;
- roadmap 4.9's release-local backup/restore now implements a schema v3 required-section manifest, section/payload/Gallery-binary integrity, default-on complete retained material, durable metadata-plus-binary rollback checkpoints, startup crash recovery, and reopen proof; predictive capacity reporting, a cross-owner Repository root-generation switch, platform-confirmed file durability, and remote transport remain separate architecture work;
- optional cloud backup is confirmed as personal BYOS rather than one shared workgroup archive: each user owns a separate Cloudflare account and R2 destination, with R2 as the first officially guided target;
- each user connects through a personal Cloudflare Worker gateway; SchatPhone may store a revocable, scoped device token but never the R2 API Secret;
- cloud backup is encrypted on the client and can be recovered with either a recovery password or a separately downloaded recovery file; Cloudflare/Worker receives no plaintext recovery secret, and initial setup must verify recovery;
- manual backup is always available; automatic backup defaults off, requires explicit user opt-in, and can run only after launch or while a browser/PWA remains open;
- Gallery is the reusable local material library: generated media remains temporary until the user keeps it, and keeping it never uploads or automatically includes it in backup;
- core save data is always complete; one default-on choice includes the entire locally retained Gallery library without another per-item selection step;
- URL-backed media always preserves the original URL and minimum metadata rather than exact bytes, including when Gallery binaries are excluded;
- backups are for rollback and damaged-save recovery, not sync or local-space offload; multiple versions are allowed, every version is a complete standalone importable package, and local originals remain local;
- local exports use a user-editable product-name-plus-date default and the platform save/share flow;
- SchatPhone keeps no internal local backup library; local files return only through user-selected import, while configured personal-R2 files are listed and restored directly inside SchatPhone without a separate Cloudflare download;
- users may permanently delete a selected cloud backup inside SchatPhone; the warning must name the file and explicitly state that the connected R2 copy is also deleted, while the current save, other backups, and local exports remain unchanged;
- SchatPhone never rotates or deletes cloud backups automatically; each version remains until explicit user-confirmed deletion, and capacity pressure may warn or block another backup but cannot silently remove a recovery point;
- restoring a binary-excluded or legacy backup reuses exact matching local binaries and does not delete or hide current-only Gallery material the user already kept;
- valid legacy core data may restore after a missing-material summary; unavailable media keeps the owning record readable through a typed placeholder and stored descriptive text where available;
- the complete-backup/recovery engineering contract is accepted, the non-active IndexedDB/Book foundation is implemented, and the separately approved Book-only Repository import/cutover is active; R2, Gallery schema, dual write, legacy Book deletion, garbage collection, and every non-Book reference migration remain unapproved;
- the earlier fixed `8 GB`, per-result local/cloud choice, per-backup item picker, and incremental-version chain proposals are not approved.

### Engineering

- the largest route view is now `FoodDeliveryView.vue` at 10329 lines after five distinct shop facades landed;
- `systemStore` is 4644 lines and imported by 24 of 40 route views;
- source contracts are JavaScript-only;
- some cross-domain adapters still receive concrete store instances.

## 6. Current Priorities

### P0: Usable Product Preview

1. `DONE 2026-07-22`: close the first successful Chat activation loop through the existing Network flow with originating thread/draft continuity and desktop plus simulated-mobile first-reply evidence;
2. `DONE 2026-08-09`: make current-save writes fail visibly, prevent unsafe same-container writers, and complete the release-local v3 export/restore/reopen/crash-recovery boundary;
3. `DONE 2026-08-07`: preserve the custom role -> Chat path, prove one ordinary Shopping consequence through Calendar, Wallet, Chat, and relationship continuity, add Wallet historical quote detail, and curate the default Home release surface without disabling demoted apps;
4. finish the partial hosted baseline with deployed PWA/install/relaunch, backup round-trip, external protection checks, and named true-device evidence; preserve the proven direct-provider Chat path and configure a fixed proxy only for a provider that actually requires it.

This is the only current product-completion sequence. It does not require a broad onboarding wizard, mandatory built-in content, another World Pack archetype, Mini Scene runtime, or a general visual rebuild.

### P0: Local Persistence, Backup, And Data Lifecycle Architecture

1. `DONE 2026-08-07`: make structured layered and Book Repository failures visible through one product-level recovery state with retry, confirmed reload-current-save, and complete-backup handoff;
2. `DONE 2026-08-07`: preserve the newest valid envelope and extend the accepted read-only conflict boundary beyond Book without force takeover or last-write-wins;
3. `DONE 2026-08-09` for the release-local boundary: independently importable schema v3 packages, required-section and Gallery-binary integrity, fail-closed local delivery, legacy compatibility, durable rollback checkpoints, crash recovery, and reopen proof; predictive capacity detail, cross-owner root-generation activation, and remote delivery remain separately staged;
4. `DONE 2026-07-22`: the non-active Batch 2B Repository foundation and active Book-only cutover remain the reference pilot;
5. move provider-neutral R2/Worker onboarding after the first usable local release; keep Gallery schema, dual write, legacy Book deletion, garbage collection, and every non-Book Repository migration separately approved.

### P0: Security And Toolchain Maintenance After The Storage Contract

1. `DONE 2026-07-22`: require a clear pre-download warning for every complete local backup while preserving all migration contents, including configured credentials; cancellation creates no file or report;
2. `DONE 2026-07-21`: update the compatible direct Vite 7 line and its required root transitive dependencies;
3. `DONE 2026-07-22`: migrate Vitest independently to 4.1.10 and remove its nested Vite 5/esbuild chain;
4. `DONE 2026-07-22`: use normal npm resolution to refresh only compatible transitive advisory nodes, keeping `package.json`, direct versions, overrides/resolutions, and major lines unchanged while closing production/full audit at 0/0.

### P1: Release And Architecture Confidence

1. preserve the proven remote Pages build and deployed base-path smoke, then confirm external required checks/environment protection plus the Vercel Git-triggered production build and installed-PWA/relaunch path;
2. configure the Vercel proxy through secure Environment Variables, then prove one hosted-origin provider setup -> connection test -> Chat reply path and complete local backup export/import/reopen;
3. run the named true-device release matrix before claiming mobile/PWA completion;
4. defer large-view seams, `systemStore` facades, cross-store cleanup, and incremental typing unless a selected product slice is blocked by them.

### P1: World Pack Hardening

1. run true-device Book -> WorldBook -> World Pack -> App Store -> target app -> Chat Services testing;
2. fix only observed language, default, layout, or recovery problems;
3. exercise existing source-notification plans before adding another service family;
4. choose another archetype only after the current four paths are understood.

### P1: K-pop Book / WorldBook Carrier Slice

The 2026-06-24 planning draft remains historical evidence rather than an executable work package. The dedicated `modern_seoul_kpop` World Pack proposal for pure Book/encyclopedia content is withdrawn.

Confirmed and promoted:

- keep the two core texts and six merged encyclopedia manuscripts as independent built-in Book assets;
- add one independently selectable music-show-day mini-scene world rule without implementing a trigger, renderer, or module schema;
- let WorldBook persist only explicit per-manuscript choices, including arbitrary encyclopedia subsets or zero selections;
- do not auto-select encyclopedias from a core text and do not wrap pure content in a World Pack;
- preserve retired built-in IDs only as hidden compatibility lookups for existing links;
- keep built-in real-person authoring policy separate from user-authored/imported content and add no global filter or sensitive-content default.

Still separately gated:

- Contacts profile templates, Calendar types, Map locations, Chat service accounts, app bindings, and Event Runtime seeds;
- any future World Pack requires concrete grouped capabilities and its own approval;
- K-pop popup behavior now follows roadmap 4.8 and `MINI_SCENE_MODULE_CONTRACT.md`; the current prose rule is content input, not regex configuration or an implemented renderer.

### P1: Cross-Module Mini Scene

Product direction is accepted; pure Stage 1 foundation is complete and user-visible implementation has not started.

- use one shared Mini Scene Module for registered callers rather than module-specific popup implementations;
- expose an explicit per-module user choice for off, plain text, or interactive HTML, with unconfigured modules behaving as off;
- keep Book narrative rules separate from structured world-specific transform-profile assets, and keep WorldBook activation separate from profile binding;
- keep profile-declared sensitive/content dimensions unconfigured until the user explicitly includes or excludes them for that world/profile; do not create a global filter;
- allow World Pack to reference a reviewed profile only as an optional capability; custom worlds work without a Pack;
- render interactive scenes from validated structured documents in a sandboxed Presenter Adapter and retain a plain-text fallback;
- implement in stages: pure contracts, persistence/policy approval, text runtime, HTML security, first K-pop Calendar Adapter, then separate Map/Chat/future streaming Adapters.

Stage 1 landed on 2026-07-21 with five pure library modules and 22 focused tests. The registry intentionally contains no default caller and the regex layer validates but does not execute.

### P2: Calendar And Agenda Journey Orchestration

Roadmap 4.12 is `ARCHITECTURE_ACCEPTED / DOCUMENTATION_ONLY / NOT_STARTED`:

- keep Calendar as the visible long-range confirmed-plan app and later add Month, Week, and Agenda views over the same records;
- treat `Agenda / 日程` as a Calendar view, while the future `Agenda Journey / 行程` app owns today and near-term execution;
- keep `Map Journey / 地图行程` independently Map-owned and use its arrival only as travel/presence evidence, not proof of non-travel activity completion;
- place idempotent Calendar-to-Journey materialization and deadline reconciliation behind a hidden Schedule Orchestrator;
- use timestamp-based Activity Sessions and explicit event checkpoints, with Event Runtime owning eligibility/provenance and source modules validating every requested result;
- keep future Story/Diary naming open while reserving a bounded, source-linked Narrative Timeline projection contract.

CJA-0 documentation is complete. CJA-1 Calendar information architecture and every later implementation stage require separate user acceptance. This lane does not modify or block roadmap 4.11 Map work.

## 7. PM Decisions Still Needed

1. production intent for the push relay versus a real authenticated backend;
2. the exact first-release device matrix and acceptance owners for named physical-device evidence;
3. next World Pack archetype after marketplace, dispatch, reservation, and transit;
4. whether closed-page autonomy is worth its identity/privacy/server complexity;
5. when Cheats should become a real product surface, if ever.

Mini Scene Stage 1 is complete. Later persistence, safe-regex dependency, HTML security, and each source-module Adapter require their named technical/implementation gates, not a return to the rejected prose-only or mandatory-World-Pack design.

## 8. Verified Quality Baseline

Run on 2026-07-10:

- `npm.cmd run lint`: pass;
- `npm.cmd run test`: 172 files, 1054 tests, pass;
- `npm.cmd run build`: pass, no warning;
- `npm.cmd run test:e2e`: 30 tests, pass across desktop and mobile projects;
- `npm.cmd audit --omit=dev`: 0 vulnerabilities;
- full `npm.cmd audit`: 15 development/tooling advisories.

Mini Scene Stage 1 validation on 2026-07-21:

- focused Mini Scene tests: 4 files / 22 tests, pass;
- `npm.cmd run lint`: pass;
- `npm.cmd run test`: 177 files / 1103 tests, pass at that stage;
- `npm.cmd run build`: pass, Vite 7.3.6 / 266 modules;
- no E2E run because no Store, View, route, browser storage, popup, or user flow imports the new pure modules.

Repository / Book Batch 2B validation on 2026-07-22:

- focused persistence tests: 6 files / 35 tests, pass;
- focused real-browser foundation: 3 Chromium tests pass, with 3 mobile-project cases explicitly skipped because the contract targets one real Chromium desktop environment;
- `npm.cmd run lint`: pass;
- `npm.cmd run test`: 182 files / 1129 tests, pass;
- `npm.cmd run build`: pass, Vite 7.3.6 / 266 modules;
- `npm.cmd run governance:check`: 2 files / 11 tests, pass;
- no Store, View, route, application entry, dependency, active pointer, legacy Book write, or user-visible behavior changed.

Compatible transitive advisory refresh validation on 2026-07-22:

- `npm.cmd audit --omit=dev`: 0 vulnerabilities;
- full `npm.cmd audit`: 0 vulnerabilities;
- `npm.cmd run lint`: pass;
- `npm.cmd run test`: 185 files / 1170 tests, pass;
- `npm.cmd run build`: pass, Vite 7.3.6 / 277 modules;
- `npm.cmd run test:e2e`: 60 collected, 56 passed, 4 existing project-specific skips;
- `package.json` and all direct dependency versions remain unchanged; no override/resolution or major migration was added.

CI/release workflow first-slice validation on 2026-07-22:

- both workflow files parse through the existing `js-yaml` dependency and retain explicit triggers, permissions, concurrency/timeout, failure artifacts, and `deploy.needs: build`;
- local CI-mode full E2E simulation on strict port 5181 collected 60 cases: 56 expected, 4 skipped, 0 unexpected, and 0 flaky; the inline JSON guard passed;
- remote GitHub execution, branch/environment protection, and deployed `dist` base-path behavior were not tested and remain release blockers.

Current checkpoint note on 2026-07-31:

- Camera/shared image generation, five-shop Food Delivery, and the world-bound local-map baseline have their named focused evidence;
- OpenFreeMap + MapLibre is integrated locally with focused unit/E2E, bundle, fallback, attribution, real-network desktop/mobile visual, and controller interaction evidence; named physical-device gestures/offline-cache and deployed-network proof remain separate.

Hosted checkpoint note on 2026-08-09:

- Pages Run #130 and the deployed `/schatphone/` browser smoke are proven;
- Vercel serves the root app and fail-closed optional AI proxy Functions. The first production upload came from the local dirty tree, and this repository baseline supersedes it for automatic later builds; deployed Pages direct-provider Chat already passes, while a Vercel-specific provider run is conditional origin/PWA evidence.

## 9. Read Next

- live execution: `docs/roadmap/TODO_ROADMAP.md`
- whole-project detail: `docs/overview/PROJECT_MASTER_GUIDE.md`
- architecture: `docs/architecture/ARCHITECTURE.md`
- package ownership: `docs/pm/TASK_PACKAGE_INDEX.md`
- workflow: `docs/process/AI_WORK_MODE.md`
