# SchatPhone PM Status And TODO

Updated: 2026-07-22

> **PM status mirror / 产品状态镜像**
>
> This document explains current product state. It is not an execution board. Concrete task status belongs only in `docs/roadmap/TODO_ROADMAP.md`.

## 1. Executive Summary

SchatPhone is in an internal personal-development phase: product definition, core-system deepening, and evolvable architecture construction. Existing integrated loops are real, but they do not establish whole-product completion.

The core product can already support meaningful use and continued development:

- Lock -> Home -> app navigation is stable;
- Chat, Contacts, relationship memory, WorldBook/Book, Map/Calendar/Reminders, Gallery, Shopping/Food Delivery/Wallet, and optional runtime review are connected;
- backup/restore, storage diagnostics, push delivery, App Store entry management, and mobile-responsive flows exist;
- the current repository baseline is green across lint, 185 unit-test files / 1170 tests, build, and 60 collected Playwright cases with 56 passed and 4 existing project-specific skips; CI and Pages definitions include the full suite, but remote execution and deployed-artifact proof remain open.

The current work is concentrated in four areas:

1. first-value activation from a clean browser to the first successful Chat reply;
2. current-save write/conflict safety and a complete local recovery point;
3. one world/role journey and one ordinary daily-life cross-module loop;
4. deployed PWA, hosted-provider, backup, and true-device release proof.

The 2026-07-22 product-finish review intentionally moves personal R2, broad storage migration, hotspot decomposition, and secondary-module depth out of the first usable-product critical path. The product now advances by user-verifiable milestones rather than by accumulating architecture gates.

Roadmap closure is concrete: 4.1 Contacts IA, 4.2 memory dedupe, 4.3 World Hub review, and 4.4 service-account continuity are complete at current acceptance. 4.5 maintenance is active with Book Repository cutover and World Setting Stage W1 complete; 4.6 World Pack is partial, 4.7 has promoted the independent K-pop Book/WorldBook 2 + 6 + 1 content slice, 4.8 has a pure Mini Scene foundation with runtime still staged, and 4.9 now owns the usable-product-preview sequence.

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
| Settings / Network / backup | `Activation loop usable, recovery incomplete` | Chat now reaches the existing Network flow and returns after save plus smoke success for the first manual reply; complete-backup/recovery contracts are accepted and Book is the first active Repository owner, while product-wide current-save safety and complete recovery remain open |
| Chat | `Stable core, structurally heavy` | deepest everyday loop; group orchestration and real-device media QA remain |
| Contacts / relationship | `Stable V2 baseline` | ownership, detail IA, memory review, classification, and cleanup are landed |
| Book / WorldBook | `Integrated V1, World Setting W1 done` | long text and activation are correctly split; strict JSON plus editable Markdown/TXT export, stable Pack-independent compatibility identity, and the independent K-pop 2 + 6 + 1 catalog are landed |
| World Pack / App Store | `Integrated V1, partial` | four target-app paths and reviewed proposals work; optional Book/encyclopedia/template references are non-binding diagnostics, while broader hardening is pending |
| Mini Scene | `Pure foundation landed, no runtime` | schemas, empty caller registry, Book profile/regex validation, and world resolution are tested; persistence, Settings, presenters, and source triggers remain separate |
| Map / Calendar / Reminders / Phone | `Stable MVP` | product boundaries and cross-module handoffs are real; visual/depth polish remains |
| Shopping / Food Delivery / Logistics | `Integrated V1` | order and notification loops are strong; store/detail/tracking polish remains |
| Wallet / Gallery | `Stable support platforms` | useful shared owners; deeper economy/Photos ambitions remain controlled |
| Assets / Stock | `Usable but shallow` | persisted MVPs, not yet headline product fantasies |
| Event Runtime / World Hub | `Partial / Guarded` | safe foreground review baseline; stronger controls and background autonomy are not finished |
| Visual system | `Partial` | several polished surfaces exist, but the product is not visually final end to end |
| QA / release | `Strong local baseline, workflow gate pending remote proof` | PR and Pages definitions now gate full E2E plus both audit scopes; external checks, deployed base-path smoke, and true-device QA remain open |

## 4. What Users Can Do Now

### Phone And System

- unlock and return through a phone shell;
- organize Home entries, folders, widgets, and recover apps through App Store;
- manage theme, wallpaper, global CSS, app icons, app skins, and Chat appearance through their owning surfaces;
- back up and restore local product state;
- inspect and repair localStorage/IndexedDB mirror drift;
- configure AI endpoints, models, and push delivery.

### Communication And Roles

- create and manage Self Profile, Main Role, and NPC profiles;
- bind roles into Chat without making Chat Directory the global role archive;
- use direct and group conversations, rich messages, quote/edit/save/delete/recall flows, and explicit AI invocation;
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

- manage trips/routes, confirmed Calendar events, raw Reminders cues, and Phone callbacks;
- browse and create Shopping/Food Delivery records, checkout, track updates, and produce downstream Wallet/relationship continuity;
- use Gallery assets across modules;
- use Wallet currencies and source-linked transactions;
- access Assets and Stock MVP loops.

## 5. What Is Not Finished

### Product And UX

- the shell and several large modules do not yet share final production-level visual consistency;
- current mobile E2E uses browser emulation; keyboard, safe areas, touch feel, browser chrome, permissions, media picker, and weak network still need real-device review;
- World Pack setup and target-app handoffs need true phone testing;
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
- production and full dependency audits both report 0 after a compatible transitive lock refresh with no direct, override/resolution, or major changes;
- PR CI and main Pages build definitions now fail closed on both audits, lint, unit, build, and one full E2E run that includes focused visual coverage; remote execution, external protections, and a deployed base-path smoke are still pending;
- browser local storage is the user-data security boundary; there is no encryption-at-rest layer.

### Persistence And Recovery

- browsers and installable PWAs are confirmed as complete first-class clients;
- one isolated browser/Web App storage container owns one current save;
- authoritative user-visible records and relationship evidence cannot be silently or irreversibly deleted; capacity management must preserve reversible review/restore semantics;
- any content formally published, confirmed, applied, or admitted into an owning module's history becomes durable when it can be revisited, referenced, or affect continuity, including future social/forum/offline/narrative/performance/state-history records regardless of user/AI/system origin;
- full AI prompts/raw responses, uncommitted drafts, and rebuildable projections are not retained by default; canonical committed content, authoritative state/facts, references, structured outcomes, and minimum provenance remain durable;
- non-Book structured stores still use whole `localStorage` snapshots with an IndexedDB mirror rather than an IndexedDB-first database;
- Chat history, Gallery total binary usage, and several role/world collections need explicit growth and retention contracts;
- backup/restore is usable but current code does not yet implement the accepted complete-package manifest, integrity, capacity preflight, staged atomic activation, crash recovery, or unified metadata/binary rollback contract;
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

- the largest route views remain between roughly 3.1k and 4.8k lines;
- `systemStore` is 4186 lines and imported by 22 of 30 route views;
- source contracts are JavaScript-only;
- some cross-domain adapters still receive concrete store instances.

## 6. Current Priorities

### P0: Usable Product Preview

1. `DONE 2026-07-22`: close the first successful Chat activation loop through the existing Network flow with originating thread/draft continuity and desktop plus simulated-mobile first-reply evidence;
2. make current-save writes fail visibly, prevent unsafe same-container writers, and complete the local export/restore/reopen recovery boundary;
3. then prove one explicit world/role -> Chat path and one ordinary Food Delivery or Shopping consequence through existing Calendar, Wallet, Chat, and relationship continuity;
4. finish with remote CI/Pages, deployed PWA/install/relaunch, hosted-provider, backup round-trip, and named true-device evidence.

This is the only current product-completion sequence. It does not require a broad onboarding wizard, mandatory built-in content, another World Pack archetype, Mini Scene runtime, or a general visual rebuild.

### P0: Local Persistence, Backup, And Data Lifecycle Architecture

1. make local and mirror writes return visible, actionable failure rather than silently swallowing quota, security, or unavailable-carrier errors;
2. preserve the newest valid envelope and extend the accepted read-only conflict boundary beyond Book without force takeover or last-write-wins;
3. implement the accepted independently importable complete-version backup, integrity, capacity/failure, staged restore, local delivery, legacy fallback, crash recovery, and rollback boundary;
4. `DONE 2026-07-22`: the non-active Batch 2B Repository foundation and active Book-only cutover remain the reference pilot;
5. move provider-neutral R2/Worker onboarding after the first usable local release; keep Gallery schema, dual write, legacy Book deletion, garbage collection, and every non-Book Repository migration separately approved.

### P0: Security And Toolchain Maintenance After The Storage Contract

1. `DONE 2026-07-22`: require a clear pre-download warning for every complete local backup while preserving all migration contents, including configured credentials; cancellation creates no file or report;
2. `DONE 2026-07-21`: update the compatible direct Vite 7 line and its required root transitive dependencies;
3. `DONE 2026-07-22`: migrate Vitest independently to 4.1.10 and remove its nested Vite 5/esbuild chain;
4. `DONE 2026-07-22`: use normal npm resolution to refresh only compatible transitive advisory nodes, keeping `package.json`, direct versions, overrides/resolutions, and major lines unchanged while closing production/full audit at 0/0.

### P1: Release And Architecture Confidence

1. prove the full-product CI E2E/audit and Pages build dependency remotely, confirm external required checks/environment protection, and run the deployed base-path/PWA smoke;
2. prove one hosted-origin provider setup -> connection test -> Chat reply path and complete local backup export/import/reopen;
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

## 7. PM Decisions Still Needed

1. first reference domain for the later IndexedDB-first migration;
2. production intent for the push relay versus a real authenticated backend;
3. the exact first-release device matrix and which immature Home entries should be demoted from the default shipping surface;
4. next World Pack archetype after marketplace, dispatch, reservation, and transit;
5. whether closed-page autonomy is worth its identity/privacy/server complexity;
6. when Cheats should become a real product surface, if ever.

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

## 9. Read Next

- live execution: `docs/roadmap/TODO_ROADMAP.md`
- whole-project detail: `docs/overview/PROJECT_MASTER_GUIDE.md`
- architecture: `docs/architecture/ARCHITECTURE.md`
- package ownership: `docs/pm/TASK_PACKAGE_INDEX.md`
- workflow: `docs/process/AI_WORK_MODE.md`
