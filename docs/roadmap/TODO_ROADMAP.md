# SchatPhone TODO Roadmap

Updated: 2026-07-14

This is the only live execution board for implementation order.

If an older plan, package note, PM brief, or `docs/superpowers/**` artifact conflicts with this file, this file wins. Package handoffs provide domain context, but they do not create a second backlog.

## 1. Status Legend

- `TODO`: accepted work that has not started
- `IN_PROGRESS`: the current active lane
- `PARTIAL_DONE`: a usable baseline exists, but named acceptance work remains
- `DONE`: current acceptance has been reached
- `ON_HOLD`: intentionally deferred
- `DECISION`: implementation must wait for a product or technical decision

## 2. Current Project Snapshot

SchatPhone is past prototype viability and now has a stable local-first product baseline.

Verified on 2026-07-10:

1. the worktree baseline passes lint, 172 Vitest files / 1054 tests, production build, and 18 Playwright desktop/mobile scenarios;
2. 30 route views and 16 Pinia domain stores implement the phone shell plus communication, world, relationship, map/date, media, commerce, finance, and runtime lanes;
3. the production dependency audit is clean;
4. final visual consistency, production security hardening, true-device QA, and several secondary-module loops are not complete;
5. the largest engineering risk remains concentrated in oversized views and `systemStore` fan-out.

Roadmap interpretation:

- four delivery lanes, 4.1 through 4.4, have reached current acceptance;
- 4.5 is the active maintenance/governance lane;
- 4.6 has an integrated V1 but still needs product hardening;
- 4.7 is a decision gate, not approved implementation work.

## 3. Completed Baselines

These are foundations to preserve. They are no longer valid “next task” recommendations.

### 4.1 Contacts V2 Detail IA And Memory Presentation

Status: `DONE`

Current acceptance:

- Contacts is the global role archive and destructive role-management surface;
- Chat Directory owns Chat-side binding only;
- Contacts presents Self Profile, Main Role, NPC, relationship snapshot, manual/event-attached details, memory review, source audit, lifecycle state, and guarded cleanup;
- WorldBook defines profile templates while Contacts stores concrete person values;
- NPC to Main Role upgrade preserves Chat binding and history;
- relationship premise/classification is profile context, while relationship runtime remains current truth.

Later work is polish or a new explicit template-authoring slice, not unfinished 4.1 baseline work.

### 4.2 Text-First Memory Dedupe And Recall Rules

Status: `DONE`

Current acceptance:

- explicit source-id lineage merges Phone callback, Shopping gift, Food Delivery shared meal, Wallet support, Map route, and Calendar follow-up records into one primary memory where appropriate;
- supporting facts preserve source audit without multiplying relationship growth;
- Chat uses prompt-facing `recallSummary`, while Contacts and World Hub use product-facing review summaries;
- memory counts describe the full target state even when UI lists are capped;
- Calendar exposes relationship lineage and supporting-only review details.

Fuzzy same-text merging remains outside scope until a separate decision.

### 4.3 World Hub Review Quality Before Stronger Controls

Status: `DONE`

Current acceptance:

- event logs and relationship facts can be filtered, selected, and explained;
- trigger source, reason, target, adapter boundary, metrics, source record, pending effect, and supporting-only behavior are reviewable;
- generated Chat greeting/refusal/block/restore/unblock proposals use Event Runtime audit, with high-risk changes waiting for World Hub review;
- Settings explains foreground ticking, Surprise Mode, module permissions, latest result, and the World Hub review path;
- broad value, funds, affinity, unlock, and freeform editing remains deliberately excluded.

### 4.4 Service-Account Continuity

Status: `DONE`

Current acceptance:

- Shopping checkout, Shopping logistics, Food Delivery checkout, and Food Delivery order events can push `service_notification` messages to existing joined service accounts;
- Chat owns message history, unread/mute/fold state, replies, and source links;
- source modules retain products, orders, logistics, Wallet, route, and schedule truth;
- World Pack candidates require user opt-in and do not auto-create subscriptions or source records;
- service-account linkage and source-notification-plan contracts are test protected.

## 4. Active And Upcoming Work

### 4.5 Architecture, Security, And Documentation Maintenance

Status: `IN_PROGRESS`

Goal:

Keep the integrated product maintainable and make its local-first security boundary explicit before adding another broad feature family.

Completed in the 2026-07-10 audit round:

1. rebuilt the project, architecture, PM, maturity, and roadmap snapshot from code and validation evidence;
2. removed stale recommendations that still treated completed 4.1-4.4 work as the next lane;
3. corrected global Appearance pack semantics: portable packs exclude app icons, app skins, app/world-app scoped CSS, Home layout/widgets, and Chat appearance;
4. recorded the K-pop planning artifact as a decision gate rather than a shadow backlog.

Completed in the 2026-07-14 workflow-governance round:

1. retired the self-referential `schatphone-workflow` skill and the removed Superpowers planning skills;
2. added root `AGENTS.md` as a short, reviewable bootstrap while keeping `AI_WORK_MODE.md` as the only process rulebook;
3. unified active reading-order and skill-inventory documentation;
4. added an automated governance check for skill provenance, retired references, bootstrap independence, task-package structure, and mojibake.

Completed in the 2026-07-14 visual-governance round:

1. removed the project-local Superpowers skills and their active workflow routing;
2. reduced visual work to at most one specialist skill per round;
3. added a focused Playwright visual-quality gate for Home, Settings, and Appearance across day/night and desktop/mobile, including screenshots, horizontal-overflow checks, page-error checks, and critical axe checks;
4. added the focused visual-quality gate and failure report artifact to CI.

Open slices, in order:

1. `P0 Security/toolchain maintenance` - `TODO`
   - decide whether backup export should exclude API credentials by default, require an explicit secrets option, or present a clear sensitive-data warning;
   - update the Vite 7 patch line and transitive lockfile where compatible;
   - plan the Vitest 1 to supported-version migration separately because the audit fix is a major upgrade;
   - re-run the full dependency audit and validation after the upgrade.
2. `P1 CI and release gating` - `PARTIAL_DONE`
   - the focused visual-quality Playwright suite now gates pull requests; decide separately whether the full product E2E suite and dependency audit should also gate;
   - ensure GitHub Pages deployment cannot be treated as validated merely because its build-only workflow passed.
3. `P1 Hotspot decomposition` - `TODO`
   - select one named seam from `ContactsView.vue`, `ChatView.vue`, `WorldBookView.vue`, `HomeView.vue`, `ChatDirectoryView.vue`, or `systemStore`;
   - preserve storage shapes and product behavior;
   - add focused regression coverage instead of mixing decomposition with feature redesign.
4. `P1 Cross-store adapter depth` - `TODO`
   - deepen one ownership-sensitive path, starting with Calendar relationship-fact submission, so domain stores pass domain events rather than concrete cross-owner store instances where practical.
5. `P2 Incremental contract typing` - `TODO`
   - add JSDoc or TypeScript only around high-value shared payload contracts; do not start a whole-app migration.

Acceptance for 4.5:

- active docs describe the same current priorities;
- high-severity development-tool advisories have an explicit remediation path;
- backup credential handling has a documented product decision and regression coverage;
- each cleanup slice reduces a measured hotspot or direct coupling without changing user-visible semantics accidentally.

Primary package:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`

### 4.6 World Pack / App Archetype / Service Template System

Status: `PARTIAL_DONE`

Integrated V1 already landed:

- Book owns long text; WorldBook owns activation; World Pack owns reviewed world capability bundles;
- compatible expansion packs can be enabled additively;
- app bindings become App Store/Home entries and open target apps with world context;
- Shopping marketplace, Food Delivery dispatch, Calendar reservation, and Map transit are concrete target-app paths;
- guarded AI/pasted proposals can confirm supported nonstandard app bindings and service templates;
- Wallet owns injected currencies and exchange-rate settings;
- app-specific customization exists, but global Appearance packs intentionally do not transport those app-owned layers.

Remaining acceptance work:

1. run true phone-device testing for Book import/export, WorldBook activation/diff, multi-pack enablement, App Store placement, target-app launch, and Chat Services opt-in;
2. harden target-app labels, context, safe defaults, and visual variants only where testing shows confusion;
3. exercise ready source-notification plans from concrete source modules without automatic subscription creation;
4. select the next archetype only after the current marketplace/dispatch/reservation/transit paths are understood;
5. keep unsupported entries such as `black_market` blocked until a dedicated product surface exists.

Primary packages:

- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`
- `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`

### 4.7 Modern Seoul K-pop Content And Carrier Governance

Status: `DECISION`

Decision source:

- `docs/superpowers/plans/2026-06-24-modern-seoul-kpop-worldbook-worldpack-system-planning.md`

Verified current state:

- the newer merged K-pop content drafts exist;
- built-in Book registration still imports the older small drafts;
- the planning file proposes moving content into the correct carriers: Book text, Contacts templates, Calendar types, Map locations, Chat service accounts, World Pack app bindings, and Event Runtime seeds;
- the planning file is marked `PLANNING_DRAFT` and has not been approved as an execution package.

Decision required before implementation:

1. confirm that no separate “debuted artist schedule encyclopedia” is needed;
2. confirm the carrier split between encyclopedia, profile template, schedule type, location, service account, app binding, and event seed;
3. choose the first concrete promoted slice: recommended first slice is built-in Book registration/content migration with extraction and regression tests;
4. promote only that slice into this roadmap and the owning package handoff.

Do not execute the draft's P1-P4 lists directly while this item remains `DECISION`.

## 5. Guarded Or Deferred Directions

### Gallery-Driven Relationship Memory

Status: `ON_HOLD`

Gallery remains an asset and atmosphere surface. Do not force structured relationship-memory authoring around manually supplied images.

### High-Impact Automatic Relationship Events

Status: `ON_HOLD`

High-impact romance, conflict, exposure, and relationship-stage automation must build on explicit Event Runtime and World Hub review. It must not write directly to Chat, Contacts, or relationship runtime.

### Cheats As A Finished Product Surface

Status: `DECISION`

World Hub is the current narrow review surface. Cheats still lacks a frozen unlock source, route shape, and editing contract.

### Closed-Page Autonomous Event Generation

Status: `DECISION`

The current relay delivers and schedules push payloads. It is not an authenticated backend simulation service. Closed-page event generation requires a separate decision covering identity, privacy, server-side storage, conflict handling, and AI context.

## 6. Current Execution Queue

1. `P0` 4.5 security/toolchain maintenance.
2. `P1` 4.5 CI/release gating and one named architecture seam.
3. `P1` 4.6 true-device World Pack loop validation and resulting focused fixes.
4. `DECISION` 4.7 K-pop carrier split and first promoted migration slice.
5. `P2` secondary-module deepening only after one of the above is explicitly selected.

## 7. Validation Rule

For every meaningful implementation round:

1. run `npm.cmd run lint`;
2. run `npm.cmd run test` when behavior or active docs guarded by tests change;
3. run `npm.cmd run build`;
4. run targeted or full `npm.cmd run test:e2e` for user-facing route flows;
5. sync the documents required by `docs/process/AI_WORK_MODE.md`.

## 8. Read Next

1. `docs/pm/TASK_PACKAGE_INDEX.md`
2. the matching package `README.md`
3. the matching package `STATUS_AND_HANDOFF.md`
4. `docs/process/AI_WORK_MODE.md`
