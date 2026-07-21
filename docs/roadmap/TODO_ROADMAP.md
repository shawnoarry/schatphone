# SchatPhone TODO Roadmap

Updated: 2026-07-21

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

1. the worktree baseline passes lint, 172 Vitest files / 1054 tests, production build, and 30 Playwright desktop/mobile scenarios;
2. 30 route views and 16 Pinia domain stores implement the phone shell plus communication, world, relationship, map/date, media, commerce, finance, and runtime lanes;
3. the production dependency audit is clean;
4. final visual consistency, production security hardening, true-device QA, and several secondary-module loops are not complete;
5. the largest engineering risk remains concentrated in oversized views and `systemStore` fan-out.

Roadmap interpretation:

- four delivery lanes, 4.1 through 4.4, have reached current acceptance;
- 4.5 is the active maintenance/governance lane;
- 4.6 has an integrated V1 but still needs product hardening;
- 4.7 has a promoted Book/WorldBook content-carrier slice; later K-pop carriers still require separate promotion.

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
2. added root `AGENTS.md` as a short, reviewable bootstrap while keeping `AI_WORK_MODE.md` as the central cross-task process authority;
3. unified active reading-order and skill-inventory documentation;
4. added an automated governance check for skill provenance, retired references, bootstrap independence, task-package structure, and mojibake.

Completed in the 2026-07-14 visual-governance round:

1. removed the project-local Superpowers skills and their active workflow routing;
2. reduced visual work to at most one specialist skill per round;
3. added a focused Playwright visual-quality gate for Home, Settings, and Appearance across day/night and desktop/mobile, including screenshots, horizontal-overflow checks, page-error checks, and critical axe checks;
4. added the focused visual-quality gate and failure report artifact to CI.

Completed in the 2026-07-16 workflow-layering round:

1. reduced `AI_WORK_MODE.md` to a thin cross-task execution contract;
2. delegated domain reading order, workstreams, validation detail, and documentation sync to the seven task packages;
3. kept specialist skill routing in event/runtime, visual/IA, and tooling workflow documents;
4. added governance coverage that prevents task-specific workflow detail from returning to the cross-task contract.

Open slices, in order:

1. `P0 Local persistence, backup, and data-lifecycle architecture` - `IN_PROGRESS`
   - confirmed product boundary: ordinary browsers and installable PWAs remain complete first-class clients;
   - preserve one isolated browser/Web App storage container as one current save; do not add internal save slots, workspace switching, or server sync;
   - plan IndexedDB as the future primary structured store, with `localStorage` limited to small hot state and recovery metadata;
   - confirmed retention boundary: authoritative user-visible records and relationship evidence cannot be silently or irreversibly deleted; capacity management may page, compress, dedupe, or move them into reversible cold archives, while only rebuildable caches and named diagnostic logs may rotate automatically;
   - confirmed committed-record boundary: any content formally published, confirmed, applied, or admitted into an owning module's history becomes durable when it is expected to be revisited, referenced, or affect continuity, regardless of whether it came from the user, AI, or deterministic code; this includes future social posts/replies, forum records, offline scenes, long-form narrative, performance/episode records, and character-state history;
   - full prompts, raw provider responses, transport payloads, uncommitted drafts, and rebuildable presentation remain non-authoritative and are not retained by default; persist canonical committed records, authoritative state/facts, cross-module references, and minimum provenance, with any full diagnostic capture explicit, temporary, bounded, and user-clearable;
   - classify authoritative records, append-only audit evidence, rebuildable projections, binary assets, caches, and diagnostic logs before defining retention or compaction;
   - complete-package and recovery acceptance is now frozen in `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md`: versioned manifests, required sections, integrity verification, capacity/quota states, creation self-check, staged/atomic restore, legacy migration, crash recovery, rollback, provider failure handling, and a focused test matrix are `ARCHITECTURE_ACCEPTED`;
   - remaining persistence planning still must define IndexedDB-first repository/schema details, persistent-storage requests, hot/cold record placement, and the first reference migration before implementation;
   - confirmed optional remote-backup boundary: do not create one project- or workgroup-owned cloud archive; each participating user configures and owns a separate Cloudflare account and R2 destination, while the internal remote-backup contract remains provider-neutral;
   - treat Cloudflare R2 as the first officially guided personal BYOS target, require a complete self-checking setup/recovery guide, keep the local save authoritative, and do not turn remote backup into live server storage, automatic merge, or cross-device sync;
   - confirmed remote-authentication boundary: each user deploys a personal Cloudflare Worker gateway bound to that user's R2 destination; SchatPhone may retain only a revocable, scoped device token and must not retain an R2 API Secret;
   - confirmed remote-recovery boundary: backup content is encrypted on the client and can be recovered with either the user's recovery password or a separately downloaded recovery file; Cloudflare/Worker never receives plaintext recovery secrets, losing both recovery methods is irreversible, and first-time setup must verify recovery before automatic backup is treated as ready;
   - in ordinary browsers/PWAs, automatic remote backup may run after launch and while the app remains open, but must not promise scheduled execution after the app is fully closed;
   - confirmed media-intent boundary: image/media generation results remain temporary candidates until the user explicitly keeps them; rejected candidates are not durable, Gallery owns reusable retained media, and source modules keep their own use/meaning records;
   - confirmed representation boundary: image, sticker, GIF, audio, or other media meaning is independent of whether its source is a URL, local binary, Gallery asset, or provider record; URL-backed media must not be forced into local storage merely to be recognized as media;
   - confirmed keep/backup boundary: choosing `keep` stores accepted media locally first and admits reusable material into Gallery, but does not upload or enroll it in backup; backup is a later user action;
   - confirmed backup-scope boundary: core save data is always complete, while one default-on `include material library` choice includes all locally retained Gallery binaries without asking users to reselect individual assets;
   - confirmed URL-backup boundary: URL-backed media always preserves its original URL and minimum descriptive/source metadata, including when Gallery binaries are excluded; backup does not create an exact byte copy and cannot recover content after the external URL stops working;
   - confirmed recovery-purpose boundary: local and personal-R2 backups exist for rollback and damaged-save recovery, not sync, cloud-library browsing, or local-space offload; successful backup never releases local originals;
   - confirmed execution boundary: manual backup is always available, while automatic backup is a separate default-off opt-in and remains limited to launch/open-app execution in browsers and PWAs;
   - confirmed version-package boundary: keep multiple versions, but every local file and remote object is a complete independently readable/importable package with no dependency on an earlier version;
   - confirmed local-export boundary: users may edit the filename from a generated product-name-plus-date default and choose the destination through the platform save/share flow, with iOS, Android, and desktop controls allowed to differ;
   - confirmed backup-access boundary: SchatPhone keeps no internal local backup library; local exports return only through user-selected import, while a configured personal R2 must be listed and restored directly inside SchatPhone without a prior Cloudflare-dashboard download;
   - confirmed cloud-deletion boundary: deleting from the in-app backup view permanently deletes the selected SchatPhone backup object from the connected personal R2; a prominent destructive modal must name the backup, say the cloud copy is also deleted, distinguish unaffected current/other/local data, and wait for cloud confirmation before removing the row;
   - confirmed cloud-retention boundary: SchatPhone never rotates, expires, or deletes cloud backups automatically; every version remains until explicit user-confirmed deletion, while quota pressure may warn or block a new backup but cannot silently remove an existing recovery point;
   - confirmed same-device restore boundary: binary-excluded and legacy backups first reuse exact matching local binaries, and an older restore does not delete or hide current-only retained Gallery material;
   - confirmed missing-media boundary: valid legacy core data may restore after a missing-material summary; unresolved media keeps its owner record and uses a type-appropriate placeholder plus stored caption/alternative/generation-description text when available;
   - withdrawn proposals: do not require a fixed `8 GB` budget now, and do not ask users to choose `discard / local only / cloud protected` for every generated result; neither proposal is an approved requirement;
   - the Gallery/backup product gate and complete-backup/recovery engineering-contract gate are closed; keep implementation blocked until the IndexedDB-first logical schema and one reference migration are separately approved;
   - `Storage implementation = NOT_APPROVED`: no IndexedDB, R2, Gallery schema, or reference-migration implementation begins from this contract.
2. `P0 Security/toolchain maintenance` - `PARTIAL_DONE`
   - `DONE 2026-07-21`: updated the direct Vite 7 line to 7.3.6 and refreshed only its compatible root transitive toolchain to esbuild 0.28.1, Rollup 4.62.2, and required lockfile metadata;
   - `DONE 2026-07-21`: production audit remains 0; full audit is 14 advisories (3 moderate, 10 high, 1 critical), one fewer high advisory after removing the Rollup-related finding;
   - `TODO`: preserve complete local migration backups, including configured credentials, while adding an explicit sensitive-file warning; any redacted/shareable export is a separate future contract;
   - `TODO`: plan the Vitest 1 major migration separately; Vitest 1.6.1 and its nested Vite 5.4.21/esbuild 0.21.5 advisory chain remain and the reported remediation crosses the approved batch boundary.
3. `P1 CI and release gating` - `PARTIAL_DONE`
   - the focused visual-quality Playwright suite now gates pull requests; decide separately whether the full product E2E suite and dependency audit should also gate;
   - ensure GitHub Pages deployment cannot be treated as validated merely because its build-only workflow passed.
4. `P1 Hotspot decomposition` - `TODO`
   - select one named seam from `ContactsView.vue`, `ChatView.vue`, `WorldBookView.vue`, `HomeView.vue`, `ChatDirectoryView.vue`, or `systemStore`;
   - preserve storage shapes and product behavior;
   - add focused regression coverage instead of mixing decomposition with feature redesign.
5. `P1 Cross-store adapter depth` - `TODO`
   - deepen one ownership-sensitive path, starting with Calendar relationship-fact submission, so domain stores pass domain events rather than concrete cross-owner store instances where practical.
6. `P2 Incremental contract typing` - `TODO`
   - add JSDoc or TypeScript only around high-value shared payload contracts; do not start a whole-app migration.

Acceptance for 4.5:

- active docs describe the same current priorities;
- the browser/PWA-first persistence target, data classes, accepted backup/recovery contract, IndexedDB-first schema, and first reference migration acceptance are explicit before storage code changes;
- the decision ledger preserves confirmed and withdrawn behavior, and backup implementation does not begin until the separately unapproved persistence schema and reference-migration gates close;
- high-severity development-tool advisories have an explicit remediation path;
- complete migration backup sensitivity has a documented product contract and later implementation receives regression coverage;
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

Status: `PARTIAL_DONE`

Confirmed product direction on 2026-07-21:

1. core setting texts and encyclopedia manuscripts are independent Book assets, not one required installation bundle;
2. encyclopedia manuscripts in the Book/WorldBook catalog are independent optional candidates, and WorldBook persists only the links the user explicitly chooses; any subset, including zero encyclopedia selections, is valid;
3. no dedicated `modern_seoul_kpop` World Pack exists for pure Book/encyclopedia content, and core texts must not auto-select or bind encyclopedia manuscripts;
4. World Pack remains reserved for a future separately approved capability bundle with concrete app bindings, service templates, runtime seeds, or similar grouped behavior;
5. built-in K-pop content is example and user-interest content, not the only supported play style or a restriction on user-authored/imported material;
6. any future sensitive-content dimension must begin unselected and user-configured; built-in authoring policy must not become a global input filter.

First promoted slice:

- Book keeps the two independent K-pop core texts and now publishes the six merged encyclopedia manuscripts as six independent built-in assets;
- WorldBook uses the existing per-manuscript source-link contract, which supports explicit single selection, arbitrary subsets, removal back to zero, and persisted restoration;
- retired small-draft asset IDs remain hidden compatibility lookups for existing persisted links, while the public Book/WorldBook catalog exposes the current 2 + 6 encyclopedia baseline plus one independent focused world rule;
- regression coverage protects clean markdown extraction, exact source registration, individual WorldBook selection, arbitrary-subset persistence, and zero selection;
- this slice creates no World Pack, app binding, service template, schedule type, map location, event seed, global sensitive-content default, or store-schema change.

First focused schedule-scene content slice:

- the 2 + 6 content audit found broad music-show context across world rules and the industry, production, fandom, city, entity, and functional-role encyclopedias, but no independently selectable rule for one confirmed schedule scene;
- the public catalog now follows a `2 + 6 + 1` shape: two core texts, six independent encyclopedia manuscripts, and one independent `K-pop 音乐节目打歌日小剧场规则` world-rule asset;
- the focused rule is an optional candidate under WorldBook Setting Text -> Rules and creates no source link until the user explicitly enables it; the six encyclopedias remain independently optional and zero encyclopedia selection remains valid;
- the rule defines applicability, required inputs, ordered scene beats, participating roles, public/private boundaries, time/place continuity, optional variants, facts that must not be invented, and semantic expectations for a future structured mini_scene result;
- no module trigger, HTML/dialog renderer, mini_scene transport, Calendar/Map/Event Runtime schema, World Pack binding, sensitive default, or global input restriction is implemented by this content slice.

Remaining governance:

1. the current 2 + 6 + 1 catalog does not include a separate debuted-artist schedule encyclopedia; whether one is needed later, and whether its material belongs in a static encyclopedia or a Calendar schedule carrier, requires separate evaluation and approval;
2. profile templates, Calendar types, Map locations, Chat service accounts, app bindings, and Event Runtime seeds remain independent future decisions and must not be inferred from the historical planning draft;
3. `docs/superpowers/**` K-pop plans and content remain historical planning/content evidence, not an executable P1-P4 backlog.

Primary package for the promoted Book/WorldBook slice:

- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

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

1. `P0` 4.5 local persistence, backup, and data-lifecycle architecture decision.
2. `P0` 4.5 security/toolchain maintenance after the persistence contract is clear.
3. `P1` 4.5 CI/release gating and one named architecture seam.
4. `P1` 4.6 true-device World Pack loop validation and resulting focused fixes.
5. `P1` 4.7 K-pop Book/WorldBook 2 + 6 + 1 content-carrier control review; later triggers, renderers, and carriers remain separately gated.
6. `P2` secondary-module deepening only after one of the above is explicitly selected.

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
