# Module Architecture Governance Status And Handoff

Updated: 2026-07-14

This is the current handoff for architecture cleanup, state ownership, persistence, security, and release-quality work.

## 1. Current Status

Status: `IN_PROGRESS`

Roadmap owner: 4.5 Architecture, Security, And Documentation Maintenance.

SchatPhone's domain architecture is sound enough to preserve. The current problem is concentration and hardening, not missing architecture or a need for framework replacement.

Verified baseline:

- 30 route views, 16 Pinia stores, 36 components, 36 composables;
- about 104k source lines;
- 172 Vitest files / 1054 tests pass;
- 18 Playwright desktop/mobile scenarios pass;
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

Decision required:

- exclude credentials by default;
- or require explicit opt-in with a strong warning;
- or design encryption and key management.

The roadmap recommends exclude-by-default as the simplest safe first implementation, but product acceptance must be promoted before changing backup compatibility.

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

### 2026-07-14 Workflow Governance

1. retired `schatphone-workflow` so a workflow or skill cannot make itself mandatory or prove its own correctness;
2. retained `AI_WORK_MODE.md` as the only process rulebook and added root `AGENTS.md` as a short bootstrap;
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

### P0: Security/Toolchain

1. promote and implement backup credential policy;
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
