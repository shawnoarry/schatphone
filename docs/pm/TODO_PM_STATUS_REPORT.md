# SchatPhone PM Status And TODO

Updated: 2026-07-16

> **PM status mirror / 产品状态镜像**
>
> This document explains current product state. It is not an execution board. Concrete task status belongs only in `docs/roadmap/TODO_ROADMAP.md`.

## 1. Executive Summary

SchatPhone is in an internal personal-development phase: product definition, core-system deepening, and evolvable architecture construction. Existing integrated loops are real, but they do not establish whole-product completion.

The core product can already support meaningful use and continued development:

- Lock -> Home -> app navigation is stable;
- Chat, Contacts, relationship memory, WorldBook/Book, Map/Calendar/Reminders, Gallery, Shopping/Food Delivery/Wallet, and optional runtime review are connected;
- backup/restore, storage diagnostics, push delivery, App Store entry management, and mobile-responsive flows exist;
- the verified repository baseline is green across lint, 1050 unit tests, build, and 18 desktop/mobile E2E scenarios.

The current work is concentrated in four areas:

1. local persistence, backup, data-lifecycle, and state-ownership architecture;
2. core product definition and module depth;
3. oversized views and central-store maintainability;
4. later security/toolchain, device, release, content, and secondary-loop work in dependency order.

Roadmap closure is concrete: 4.1 Contacts IA, 4.2 memory dedupe, 4.3 World Hub review, and 4.4 service-account continuity are complete at current acceptance. 4.5 maintenance is active, 4.6 World Pack is partial, and the new K-pop carrier plan is waiting for a decision.

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
| Settings / Network / backup | `Usable, architecture decision active` | whole-snapshot persistence works; IndexedDB-first, complete-backup, quota, and migration contracts are being defined |
| Chat | `Stable core, structurally heavy` | deepest everyday loop; group orchestration and real-device media QA remain |
| Contacts / relationship | `Stable V2 baseline` | ownership, detail IA, memory review, classification, and cleanup are landed |
| Book / WorldBook | `Integrated V1` | long text and activation are correctly split; phone hardening and K-pop migration remain |
| World Pack / App Store | `Integrated V1, partial` | four target-app paths and reviewed proposals work; broader hardening is pending |
| Map / Calendar / Reminders / Phone | `Stable MVP` | product boundaries and cross-module handoffs are real; visual/depth polish remains |
| Shopping / Food Delivery / Logistics | `Integrated V1` | order and notification loops are strong; store/detail/tracking polish remains |
| Wallet / Gallery | `Stable support platforms` | useful shared owners; deeper economy/Photos ambitions remain controlled |
| Assets / Stock | `Usable but shallow` | persisted MVPs, not yet headline product fantasies |
| Event Runtime / World Hub | `Partial / Guarded` | safe foreground review baseline; stronger controls and background autonomy are not finished |
| Visual system | `Partial` | several polished surfaces exist, but the product is not visually final end to end |
| QA / release | `Strong local baseline, partial release gate` | CI now gates focused visual-quality Playwright checks; full E2E, dependency audit, and true-device QA remain outside the gate |

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
- full dependency audit reports development/tool advisories even though production dependencies are clean;
- CI runs the focused visual-quality Playwright suite, but not the full product E2E suite or dependency audit; the Pages build workflow is not a full quality gate;
- browser local storage is the user-data security boundary; there is no encryption-at-rest layer.

### Persistence And Recovery

- browsers and installable PWAs are confirmed as complete first-class clients;
- one isolated browser/Web App storage container owns one current save;
- authoritative user-visible records and relationship evidence cannot be silently or irreversibly deleted; capacity management must preserve reversible review/restore semantics;
- any content formally published, confirmed, applied, or admitted into an owning module's history becomes durable when it can be revisited, referenced, or affect continuity, including future social/forum/offline/narrative/performance/state-history records regardless of user/AI/system origin;
- full AI prompts/raw responses, uncommitted drafts, and rebuildable projections are not retained by default; canonical committed content, authoritative state/facts, references, structured outcomes, and minimum provenance remain durable;
- current structured stores still use whole `localStorage` snapshots with an IndexedDB mirror rather than an IndexedDB-first database;
- Chat history, Gallery total binary usage, Book text, and several role/world collections need explicit growth and retention contracts;
- backup/restore is usable but does not yet provide a fully verified, staged, atomic archive contract for all metadata and binaries;
- optional cloud backup is confirmed as personal BYOS rather than one shared workgroup archive: each user owns a separate Cloudflare account and R2 destination, with R2 as the first officially guided target;
- each user connects through a personal Cloudflare Worker gateway; SchatPhone may store a revocable, scoped device token but never the R2 API Secret;
- cloud backup is encrypted on the client and can be recovered with either a recovery password or a separately downloaded recovery file; Cloudflare/Worker receives no plaintext recovery secret, and initial setup must verify recovery;
- browser/PWA automatic backup is intended to run after launch and while the app remains open; closed-app scheduling, live server storage, automatic merge, and cross-device sync are outside the confirmed boundary;
- Gallery is the reusable material library, generated media remains temporary until the user confirms retention, and URL media does not need local conversion merely to be recognized;
- selective cloud inclusion, URL exact-copy behavior, and whether R2 may release local media binaries remain the current decision gate; the earlier fixed `8 GB` and per-result local/cloud-choice proposals are withdrawn.

### Engineering

- the largest route views remain between roughly 3.1k and 4.8k lines;
- `systemStore` is 4186 lines and imported by 22 of 30 route views;
- source contracts are JavaScript-only;
- some cross-domain adapters still receive concrete store instances.

## 6. Current Priorities

### P0: Local Persistence, Backup, And Data Lifecycle Architecture

1. classify authoritative, auditable, rebuildable, binary, cache, and diagnostic data under the confirmed no-silent-deletion boundary;
2. define IndexedDB-first repository, transaction, quota, persistent-storage, and multi-tab contracts;
3. define versioned complete backup, integrity, staged restore, legacy migration, and rollback;
4. define a provider-neutral remote-backup contract and complete self-checking Cloudflare R2 personal-setup/recovery guidance;
5. close the Gallery/material-library preservation gate, including generated-result confirmation, selective cloud inclusion, URL exact-copy behavior, and backup-only versus local-space offload;
6. decide deletion/history cleanup and quota-aware version retention after the media gate and size-reporting requirements are explicit;
7. approve one reference migration separately; do not begin broad migration from this planning decision alone.

### P0: Security And Toolchain Maintenance After The Storage Contract

1. add a clear sensitive-file warning while preserving complete migration backup contents, including credentials;
2. update compatible Vite/transitive dependencies;
3. plan the Vitest major migration separately;
4. re-run audit, lint, unit, build, and E2E.

### P1: Release And Architecture Confidence

1. decide full-product CI E2E/audit gating and Pages deployment dependency after the focused visual gate stabilizes;
2. take one named large-view or `systemStore` seam at a time;
3. deepen one cross-store adapter without changing product ownership;
4. keep docs synchronized in the same round.

### P1: World Pack Hardening

1. run true-device Book -> WorldBook -> World Pack -> App Store -> target app -> Chat Services testing;
2. fix only observed language, default, layout, or recovery problems;
3. exercise existing source-notification plans before adding another service family;
4. choose another archetype only after the current four paths are understood.

### Decision: K-pop Carrier Governance

The 2026-06-24 planning draft correctly identifies a carrier problem, but it is not approved implementation work.

Decision required:

- keep long world context in Book/WorldBook;
- put concrete people in Contacts templates;
- put schedules in Calendar types, places in Map context, messages in service templates, capabilities in World Pack, and dynamic behavior in Event Runtime seeds;
- choose one first migration slice before any broad P1-P4 execution.

## 7. PM Decisions Still Needed

1. first reference domain for the later IndexedDB-first migration;
2. production intent for the push relay versus a real authenticated backend;
3. whether CI must gate E2E and security audit;
4. K-pop content carrier split and first migration slice;
5. next World Pack archetype after marketplace, dispatch, reservation, and transit;
6. whether closed-page autonomy is worth its identity/privacy/server complexity;
7. when Cheats should become a real product surface, if ever.

## 8. Verified Quality Baseline

Run on 2026-07-10:

- `npm.cmd run lint`: pass;
- `npm.cmd run test`: 172 files, 1054 tests, pass;
- `npm.cmd run build`: pass, no warning;
- `npm.cmd run test:e2e`: 30 tests, pass across desktop and mobile projects;
- `npm.cmd audit --omit=dev`: 0 vulnerabilities;
- full `npm.cmd audit`: 15 development/tooling advisories.

## 9. Read Next

- live execution: `docs/roadmap/TODO_ROADMAP.md`
- whole-project detail: `docs/overview/PROJECT_MASTER_GUIDE.md`
- architecture: `docs/architecture/ARCHITECTURE.md`
- package ownership: `docs/pm/TASK_PACKAGE_INDEX.md`
- workflow: `docs/process/AI_WORK_MODE.md`
