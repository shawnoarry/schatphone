# SchatPhone PM Status And TODO

Updated: 2026-07-14

> **PM status mirror / 产品状态镜像**
>
> This document explains current product state. It is not an execution board. Concrete task status belongs only in `docs/roadmap/TODO_ROADMAP.md`.

## 1. Executive Summary

SchatPhone is an integrated local-first virtual-phone V1, not a prototype and not a finished production product.

The core product can already support meaningful use and continued development:

- Lock -> Home -> app navigation is stable;
- Chat, Contacts, relationship memory, WorldBook/Book, Map/Calendar/Reminders, Gallery, Shopping/Food Delivery/Wallet, and optional runtime review are connected;
- backup/restore, storage diagnostics, push delivery, App Store entry management, and mobile-responsive flows exist;
- the verified repository baseline is green across lint, 1050 unit tests, build, and 18 desktop/mobile E2E scenarios.

The remaining work is concentrated in four areas:

1. production security/toolchain hardening;
2. oversized views and central-store maintainability;
3. final visual consistency and true-device QA;
4. broader depth for World Pack, runtime, groups, Assets, Stock, and other secondary loops.

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
| Settings / Network / backup | `Stable with security gap` | feature-complete baseline; credential export policy must be fixed/decided |
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
| QA / release | `Strong local baseline, partial release gate` | all current checks pass; CI lacks E2E/audit and true-device QA |

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
- CI does not run Playwright or dependency audit, and the Pages build workflow is not a full quality gate;
- browser local storage is the user-data security boundary; there is no encryption-at-rest layer.

### Engineering

- the largest route views remain between roughly 3.1k and 4.8k lines;
- `systemStore` is 4186 lines and imported by 22 of 30 route views;
- source contracts are JavaScript-only;
- some cross-domain adapters still receive concrete store instances.

## 6. Current Priorities

### P0: Security And Toolchain Maintenance

1. decide and implement backup credential handling;
2. update compatible Vite/transitive dependencies;
3. plan the Vitest major migration separately;
4. re-run audit, lint, unit, build, and E2E.

### P1: Release And Architecture Confidence

1. decide CI E2E/audit gating and Pages deployment dependency;
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

1. backup credential export policy;
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
- `npm.cmd run test:e2e`: 18 tests, pass across desktop and mobile projects;
- `npm.cmd audit --omit=dev`: 0 vulnerabilities;
- full `npm.cmd audit`: 15 development/tooling advisories.

## 9. Read Next

- live execution: `docs/roadmap/TODO_ROADMAP.md`
- whole-project detail: `docs/overview/PROJECT_MASTER_GUIDE.md`
- architecture: `docs/architecture/ARCHITECTURE.md`
- package ownership: `docs/pm/TASK_PACKAGE_INDEX.md`
- workflow: `docs/process/AI_WORK_MODE.md`
