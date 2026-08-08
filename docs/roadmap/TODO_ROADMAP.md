# SchatPhone TODO Roadmap

Updated: 2026-08-09

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

Inventory refreshed on 2026-07-30; validation state is tracked separately below:

1. the current tree contains 40 route-view files, 17 Pinia stores, 44 Vue components under `src/components`, 37 JavaScript composables, and 209 static unit-test files;
2. Camera/shared image generation, five independent Food Delivery shop facades, and world-bound local Map packs are implemented at their named partial baselines;
3. the current local integration passes lint, 210 Vitest files / 1483 tests, production and Cloudflare root-path builds, governance, both audit scopes, focused Map tests, and desktop/Pixel 5 Map plus Peach Cloud interaction checks; remote CI and deployed Pages have successful-run and deployed-browser-smoke evidence, the Vercel root/proxy baseline is deployed, and the Git-connected Cloudflare Worker/static-assets root path is deployed with URL smoke at `https://schatphone.noarry.workers.dev`; named physical-device plus independently rerunnable audit proof remain separate;
4. final visual consistency, production security hardening, true-device QA, and several secondary-module loops are not complete;
5. the largest engineering risk remains concentrated in oversized views, especially Food Delivery, and `systemStore` fan-out.

Roadmap interpretation:

- four delivery lanes, 4.1 through 4.4, have reached current acceptance;
- 4.5 is the active maintenance/governance lane;
- 4.6 has an integrated V1 but still needs product hardening;
- 4.7 has a promoted Book/WorldBook content-carrier slice; its focused K-pop rule is the first planned content input for the separately staged Mini Scene Module;
- 4.8 has an architecture-accepted cross-module Mini Scene direction, but no runtime, popup, regex execution, or source-module trigger is implemented yet.
- 4.9 is now the product-control lane: turn the integrated modules into a usable product preview by closing first-value activation, current-save safety, one ordinary life loop, and deployed PWA proof before more infrastructure or feature breadth.
- 4.11 is `P2 PARTIAL_DONE / MJE-1 THROUGH MJE-4 USER_ACCEPTED_INTEGRATED_LOCAL`: the accepted MJE-3 checkpoint event remains non-blocking, and MJE-4 presents passive progress as Footprints plus an optional per-world place-knowledge mode. In Footprints-gated worlds, completed positioned journeys can reveal a small deterministic set of nearby authored facilities; old saves remain all-known. MJE-5 remains separately gated.
- 4.12 is `ARCHITECTURE_ACCEPTED / DOCUMENTATION_ONLY / NOT_STARTED`: the visible Calendar remains the long-range confirmed-plan app, its future Month/Week/Agenda views are distinct from a future short-range Agenda Journey app, and a hidden Schedule Orchestrator will link them without taking ownership of Map Journey, Event Runtime, Activity Session, or downstream values. No route, store, timer, popup, narrative projection, persistence field, or migration is implemented by this decision.

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

4.5 maintenance inventory follows. Section 6 owns the cross-lane execution order:

1. `P0 Local persistence, backup, and data-lifecycle architecture` - `IN_PROGRESS`
   - confirmed product boundary: ordinary browsers and installable PWAs remain complete first-class clients;
   - preserve one isolated browser/Web App storage container as one current save; different isolated entry containers remain independent and move state only through user-selected complete backups, with no internal save slots, workspace switching, automatic sync, or silent merge;
   - confirmed same-container tab boundary: after a safe write wait times out, the later tab remains read-only with retry and refresh-current-save actions; last-write-wins and force takeover are excluded;
   - confirmed persistent-storage boundary: never ask on first launch; ask contextually before the first qualifying high-volume durable action, and expose status plus explicit retry in Settings;
   - plan IndexedDB as the future primary structured store, with `localStorage` limited to small hot state and recovery metadata;
   - confirmed retention boundary: authoritative user-visible records and relationship evidence cannot be silently or irreversibly deleted; capacity management may page, compress, dedupe, or move them into reversible cold archives, while only rebuildable caches and named diagnostic logs may rotate automatically;
   - confirmed committed-record boundary: any content formally published, confirmed, applied, or admitted into an owning module's history becomes durable when it is expected to be revisited, referenced, or affect continuity, regardless of whether it came from the user, AI, or deterministic code; this includes future social posts/replies, forum records, offline scenes, long-form narrative, performance/episode records, and character-state history;
   - full prompts, raw provider responses, transport payloads, uncommitted drafts, and rebuildable presentation remain non-authoritative and are not retained by default; persist canonical committed records, authoritative state/facts, cross-module references, and minimum provenance, with any full diagnostic capture explicit, temporary, bounded, and user-clearable;
   - classify authoritative records, append-only audit evidence, rebuildable projections, binary assets, caches, and diagnostic logs before defining retention or compaction;
   - complete-package and recovery acceptance is now frozen in `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md`: versioned manifests, required sections, integrity verification, capacity/quota states, creation self-check, staged/atomic restore, legacy migration, crash recovery, rollback, provider failure handling, and a focused test matrix are `ARCHITECTURE_ACCEPTED`;
   - `ARCHITECTURE_ACCEPTED 2026-07-21`: Batch 2A defines the exact `schatphone-repository` version-1 object stores/keyPaths/indexes, immutable record versions plus generation membership, atomic pointer/journal, WriteCoordinator behavior, persistent-storage policy, Book Adapter/fixtures, legacy reader, and rollback gates;
   - `DONE 2026-07-22`: Batch 2B implements the exact non-active IndexedDB foundation plus Book Adapter/fixture/staging slice, including focused Vitest and real-Chromium IndexedDB/same-container coordination gates;
   - `DONE 2026-07-22`: the separately approved Book-only runtime cutover adds an explicit Book upgrade action, contextual persistent-storage request, fenced atomic activation/reopen, automatic rollback, Repository-only later writes, read-only conflict retry/refresh, and byte-identical retained legacy fallback; backup restore waits for Repository commit before success;
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
   - the Gallery/backup product gate, complete-backup/recovery contract, Batch 2A Repository technical gate, Batch 2B foundation, and Book reference cutover are complete;
   - `Other-owner storage runtime implementation/activation = NOT_APPROVED`: no R2, Gallery schema, non-Book migration, dual write, garbage collection, or legacy Book deletion follows from the Book cutover.
2. `P0 Security/toolchain maintenance` - `PARTIAL_DONE`
   - `DONE 2026-07-21`: updated the direct Vite 7 line to 7.3.6 and refreshed only its compatible root transitive toolchain to esbuild 0.28.1, Rollup 4.62.2, and required lockfile metadata;
   - `DONE 2026-07-22`: migrated Vitest 1.6.1 to the official-registry current stable 4.1.10 line; Vitest now reuses root Vite 7.3.6 and the nested Vite 5.4.21/esbuild 0.21.5 chain is removed;
   - `DONE 2026-07-22`: the isolated Vitest migration reduced full audit from 14 advisories (3 moderate, 10 high, 1 critical) to 10 (1 moderate, 9 high, 0 critical) without changing the direct Vite line;
   - `DONE 2026-07-22`: every complete local JSON export now requires an explicit danger confirmation before payload construction or download; the warning names configured API credentials plus private chat/role/world data, cancellation has no export/report side effects, and the full credential-bearing payload remains unchanged;
   - any redacted/shareable export remains a separate future contract and cannot silently replace the complete migration backup;
   - `DONE 2026-07-22`: normal npm resolution refreshed only the approved compatible transitive advisory nodes and required `hasown` child closure; production and full audits are both 0, with `package.json`, direct dependency versions, overrides/resolutions, and major versions unchanged;
   - `DONE 2026-08-07`: remote Pages Run #128 exposed a newly published high advisory in the transitive `js-yaml` 4.3.0 lock; the lockfile now pins 4.3.1 without changing direct dependencies, and production/full audits are again 0/0. Run #130 passed the repaired remote gate and deployment; latest main Run #132 also passed and deployed `13c910b`.
   - `DONE 2026-08-08`: Pages Run #134 exposed a newly published high advisory in transitive `nanoid` 3.3.16 shared through PostCSS. The lockfile now pins 3.3.18 without changing direct dependencies; official-registry `npm ci`, production/full audits, lint, and build pass locally. The corrected Pages run remains remote proof.
   - the 2026-07-22 architecture baseline passed 185 Vitest files / 1170 tests, production build, and 60 collected Playwright cases with 56 passed and 4 existing project-specific skips; this is historical evidence, not validation of the later OpenFreeMap checkpoint.
3. `P1 CI and release gating` - `PARTIAL_DONE`
   - `WORKFLOW_IMPLEMENTED 2026-07-22`: PR/manual CI and main-only Pages release definitions now fail closed on separate production/full audits, lint, unit, build, and one full Playwright collection that already includes the focused visual-quality cases;
   - both paths reject flaky recovery, cap intentional skips at four, retain failure-only Playwright diagnostics for seven days, and avoid a duplicate `test:visual` run;
   - Pages config/upload/deploy follows the verified build job; Run #130 proves remote GitHub execution and the deployed `dist` base-path smoke, while Run #132 proves the latest main commit passes and deploys. External required-check and environment-protection policy remain unverified;
   - keep this slice `PARTIAL_DONE` until the external required-check/environment-protection policy is verified; a successful workflow and deployment alone do not prove those controls.
4. `P1 Unified world-setting identity` - `STAGE_W1_DONE / STAGE_W2_NOT_APPROVED`
   - `DONE 2026-07-22`: the shared World Setting Interface exposes stable `legacy_single_world` compatibility identity separately from narrative, encyclopedia, profile-template, Pack-capability, and diagnostic projections;
   - WorldBook and Contacts consume the Interface; Pack switching cannot change displayed identity, Book/encyclopedia/template selection, or create new Pack-shaped template/contact scope values;
   - legacy Pack content references are optional review diagnostics and no longer block capability Pack activation;
   - persisted WorldBook-owned world definitions, backup migration, multiple worlds, and switching remain separate W2/W3 decisions.
5. `P1 Hotspot decomposition` - `TODO`
   - select one named seam from `ContactsView.vue`, `ChatView.vue`, `WorldBookView.vue`, `HomeView.vue`, `ChatDirectoryView.vue`, or `systemStore`;
   - preserve storage shapes and product behavior;
   - add focused regression coverage instead of mixing decomposition with feature redesign.
6. `P1 Cross-store adapter depth` - `TODO`
   - deepen one ownership-sensitive path, starting with Calendar relationship-fact submission, so domain stores pass domain events rather than concrete cross-owner store instances where practical.
7. `P2 Incremental contract typing` - `TODO`
   - add JSDoc or TypeScript only around high-value shared payload contracts; do not start a whole-app migration.

Acceptance for 4.5:

- active docs describe the same current priorities;
- the browser/PWA-first persistence target, data classes, accepted backup/recovery contract, IndexedDB-first schema, and first reference migration acceptance are explicit before storage code changes;
- the decision ledger preserves confirmed and withdrawn behavior, and each backup or persistence implementation slice stays inside its separately approved schema, owner, migration, and rollback boundary;
- high-severity development-tool advisories have an explicit remediation path;
- complete migration backup sensitivity has a documented product contract and later implementation receives regression coverage;
- each cleanup slice reduces a measured hotspot or direct coupling without changing user-visible semantics accidentally.

Primary package:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`

### 4.6 World Pack / App Archetype / Service Template System

Status: `PARTIAL_DONE`

Integrated V1 already landed:

- Book owns long text; WorldBook owns activation; World Pack owns reviewed world capability bundles;
- the first unified world-setting workspace now presents Book manuscripts, WorldBook activation, structured encyclopedia entries, profile templates, optional capabilities/apps, and compatibility fallback as parallel layers rather than a required sequence;
- Book manuscripts can be exported as strict versioned/lossless `.worldbook.json`, editable/re-importable `.md`, or portable body-only `.txt`, and export never changes activation state;
- compatible expansion packs can be enabled additively;
- app bindings become App Store/Home entries and open target apps with world context;
- Shopping marketplace, Food Delivery dispatch, Calendar reservation, and Map transit are concrete target-app paths;
- guarded AI/pasted proposals can confirm supported nonstandard app bindings and service templates;
- Wallet owns injected currencies and exchange-rate settings;
- app-specific customization exists, but global Appearance packs intentionally do not transport those app-owned layers.
- `DONE 2026-08-08`: Chat's first-level `Contacts` tab replaces the legacy `Objects` label; contact rows open Chat directly, state-dependent social actions stay primary, and Chat-local preferences, block, and unbind live in a secondary action menu without changing Contacts global-role or Chat Directory binding ownership.

Remaining acceptance work:

1. run true phone-device testing for Book JSON/Markdown/TXT import/export, WorldBook activation/diff, multi-pack enablement, App Store placement, target-app launch, and Chat Services opt-in;
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
2. the existing K-pop music-show-day prose rule may later provide optional narrative context to roadmap 4.8, but it is not the shared Mini Scene Module, a structured transform profile, a popup trigger, or executable HTML;
3. a later K-pop Calendar integration must add a separate structured Book transform-profile asset and use the shared Mini Scene Interface; it must not convert the prose rule into executable configuration or create a dedicated K-pop World Pack;
4. profile templates, Calendar types, Map locations, Chat service accounts, app bindings, and Event Runtime seeds remain independent future decisions and must not be inferred from the historical planning draft;
5. `docs/superpowers/**` K-pop plans and content remain historical planning/content evidence, not an executable P1-P4 backlog.

Primary package for the promoted Book/WorldBook slice:

- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

### 4.8 Cross-Module Mini Scene / 小剧场

Status: `TODO`

Architecture accepted on 2026-07-21:

1. one shared Mini Scene Module will serve explicitly registered callers such as Calendar, Map, Chat, a future Agenda Journey app, and future streaming modules;
2. each registered module has an explicit user mode: unconfigured/off, plain text, or interactive HTML; unconfigured behaves as off, and no Book, WorldBook, World Pack, caller, or world profile may silently change the user's choice;
3. calling modules and Event Runtime own trigger intent, source truth, eligibility, and provenance; the Mini Scene Module owns request validation, world-profile resolution, artifact creation, transforms, presentation, fallback, and interaction audit;
4. Book will keep narrative rules and separate `structured_json` Mini Scene transform-profile assets. WorldBook narrative activation and Mini Scene profile binding remain separate choices;
5. World Pack may reference a reviewed profile as one optional grouped capability, but pure content is not repackaged, Book assets are not auto-enabled, and custom worlds do not require a World Pack;
6. regex is a bounded optional transform over validated structured fields, not a full-response parser, sanitizer, trigger engine, or code-execution path;
7. interactive output is a validated declarative document rendered by a sandboxed HTML Presenter Adapter with restrictive CSP and allowlisted interaction commands. Raw AI HTML and legacy Chat `htmlSnippet` remain inert;
8. every interactive artifact carries a plain-text fallback, and any validation, transform, asset, or renderer failure downgrades visibly without changing source-module truth;
9. profile-declared content dimensions, including sensitive dimensions, begin unconfigured and require an explicit per-world/profile include/exclude choice; they never become a global filter or restrict user-authored/imported content;
10. committed Mini Scene artifacts and interaction state are future durable owner records, while prompts, raw provider responses, rendered iframe HTML, and failed drafts remain transient;
11. `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` owns the exact Interfaces, Book profile shape, world resolution, regex limits, presenter security, persistence prerequisites, delivery stages, tests, and stop conditions.

Delivery order:

1. `DONE`: architecture contract and cross-package routing only;
2. `DONE 2026-07-21`: pure request/draft/artifact/profile/module-policy schemas, empty-by-default dynamic module registry, deterministic profile resolver, Book structured-profile/regex validator, and 22 focused tests, with no runtime or UI;
3. `TODO / SEPARATE_APPROVAL_REQUIRED`: the Book Repository foundation prerequisite is complete; persistence-owner/backup contract and Settings policy foundation still require a separate approved Mini Scene slice;
4. `TODO`: shared Module, Text Presenter Adapter, and per-module/profile Settings controls;
5. `TODO / SECURITY_REVIEW_REQUIRED`: sandboxed HTML Presenter Adapter and Book transform-profile editor/preview;
6. `TODO`: first K-pop Calendar music-show-day Adapter and structured Book transform profile;
7. `TODO`: separately reviewed Map and Chat Adapters;
8. `ON_HOLD`: streaming Adapters until a streaming module has an approved product contract and source-record model.

Primary package:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`

Secondary packages are engaged only when their owned stage begins:

- `visual-and-ia-governance` for Settings, Book/WorldBook authoring, and presenter interaction quality;
- `event-runtime-and-world-hub` for runtime-trigger eligibility, cooldown/cap policy, provenance, and review;
- `map-calendar-reminders` for Calendar/Map source truth and request Adapters;
- `chat-and-chat-directory` for Chat source truth and legacy/new Mini Scene message compatibility.

### 4.9 Usable Product Preview

Status: `IN_PROGRESS`

Product outcome:

- a new user can open the phone, configure a user-owned AI provider, receive the first successful role reply, and return to the same conversation without learning the internal module architecture;
- blank/custom worlds and the optional built-in K-pop content both remain valid; Book text, encyclopedia selection, World Pack capability, and role creation are never mandatory prerequisites for the first reply;
- the user can later create or select a world and role, complete one believable daily-life flow, and see its Chat, schedule, finance, or relationship continuity consequences;
- the current save reports failed writes instead of silently claiming success, prevents later tabs from overwriting after the safe wait expires, and can be exported and restored as a complete local recovery point;
- the exact release commit is proven through remote gates, the deployed `/schatphone/` base path, install/relaunch behavior, representative mobile use, and one hosted-provider Chat journey.

Delivery stages:

1. `P0 First successful Chat activation` - `DONE 2026-07-22`
   - on fresh storage, Chat turns missing provider configuration into an explicit `Network & API` recovery action rather than a dead-end error;
   - preserve the originating thread and typed content, keep provider configuration owned by Network, and return to the same Chat after save plus successful connection test;
   - prove one manual AI reply across desktop and simulated mobile without adding a broad onboarding wizard, duplicated provider form, automatic automation, or mandatory world setup.
   - focused Playwright now proves the complete fresh-storage journey in desktop and simulated Pixel 5 Chromium, including bounded return context, preserved draft/thread, fake-provider smoke plus first reply, no page errors or horizontal overflow, no critical axe violations, and no rendered fake credential; true-device and hosted-provider proof remain in stage 4.
2. `P0 Current-save safety and complete local recovery` - `DONE 2026-08-09`, parallel architecture lane
   - `DONE 2026-07-22`: return structured persistence write results without breaking existing callers; local primary and mirror outcomes are independently observable;
   - `DONE 2026-07-22`: reconcile local/mirror freshness by lineage and sequence before Store mount, with bounded unavailable-IndexedDB startup, conflict zero-write behavior, verified repair, and the repository-owned legacy Book carrier explicitly inspect-only;
   - `DONE 2026-08-07`: surface structured sync/async and Book Repository failures through one product-level save-failed/read-only recovery state with retry, confirmed reload-current-save, and handoff to the existing complete-backup section; desktop and simulated Pixel 5 fault injection cover quota recovery, unresolved zero-write conflict, action sizing, containment, and overflow without changing persistence or backup formats;
   - `DONE 2026-08-07`: extend the accepted same-container read-only timeout across the current save. One page-level writer is acquired before reconciliation and Store mount; later pages inspect all 17 targets without repair, block layered sync/async/deferred mirror writes plus Book, Gallery binary, and image-generation device-local writes, and may retry only after the active page releases ownership. Focused Vitest and two-page Chromium prove cross-owner zero-write behavior, retry after release, and stale-head rejection without force takeover or last-write-wins;
   - `DONE 2026-08-09`: schema v3 complete local packages now require all current sections, including Chat identity/avatar state, carry canonical SHA-256 section/payload and Gallery-binary evidence, include every retained Gallery binary by default, and fail before delivery on missing or corrupt material. Import verifies before mutation, durably stages the previous metadata-plus-binary save in the Repository journal, restores current-only Gallery material non-destructively, rolls back failed or interrupted restore work before mount, and preserves legacy v1/v2 compatibility without relabeling those files complete. Focused Vitest plus desktop and simulated-mobile Chromium prove corruption rejection, full-material restore, rollback, crash recovery, and reopen;
   - personal R2/Worker transport remains post-release because it cannot repair an unsafe or incomplete local recovery point.
3. `P1 Core personal-life vertical slice` - `IN_PROGRESS`
   - `DONE 2026-07-22`: prove one explicit custom role -> Chat journey without changing the valid zero-Book/zero-encyclopedia/zero-Pack boundary; Contacts starts the explicit action, Chat owns idempotent binding/conversation execution, and Chat Directory remains the management surface;
   - focused Playwright proves create/select -> Start Chat -> missing-provider recovery -> first manual reply -> return to the same Contacts profile in desktop and simulated Pixel 5 Chromium, while an explicit empty custom-role fixture leaves seeded fresh-storage roles unchanged;
   - `DONE 2026-07-29`: Verdant Day is the fifth independent Food Delivery shop app, with a route-driven Home/Menu/Detail/Bag/Orders/Order UI, complete twelve-photo product pack, corrected hierarchical back navigation, and focused desktop/mobile Playwright coverage; this shop-app milestone does not complete the remaining ordinary Food Delivery/Shopping cross-module life-consequence proof;
   - `DONE 2026-07-31`: Dash Grill's one-Hero/ten-product pack and Jade Hearth's one-Hero/twelve-product pack were generated from separate brand capsules, accepted onto their stable `public/` paths, and visually reviewed in desktop Chromium plus simulated Pixel 5 Home/Menu/Detail flows; Jade Hearth's whole-fish Home card received one item-scoped `object-contain` correction without changing its Menu/detail crops. This closes those two recorded formal-asset gaps but is not named physical-device proof and does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-07-31`: River Noodles, Daylight Cafe, and Sugar Lane each received nine-item menus, four shop-specific sections, existing-save missing-ID migration, and one-Hero/nine-product stable asset contracts. This records the shared content and asset-list preparation milestone; visual completion remains tracked per shop;
   - `DONE 2026-07-31`: Daylight Cafe's one-Hero/nine-product bright-morning pack was generated from its own terrazzo/cafe capsule, accepted onto the stable `public/` paths, and visually reviewed in the generic shop facade at desktop Chromium plus `393x851` mobile. Its shop identity crop now focuses the center-right breakfast group and its detail image alone uses `object-contain` on Cream so cups, glasses, plates, and pastries remain complete. River Noodles and Sugar Lane remained pending at this historical milestone and are closed by the 2026-08-07 media milestone below. This is not named physical-device proof and does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-01`: Harbor Roast received an original premium coffee-chain baseline with twelve menu items across four drinks-first sections, safe existing-save migration, a generated Food Delivery-bound App Store settings entry, and an initial one-Hero/twelve-product stable asset contract. The 2026-08-02 current-facade audit expanded that formal contract to `29` PNGs across brand/App Store, campaign, product, order-state, and empty-state groups; this baseline milestone did not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-02`: Harbor Roast's `29`-PNG formal pack was generated, accepted onto stable `public/images/ui-assets/apps/food-delivery/harbor-roast/` paths, and connected across Home campaigns, campaign detail pages, product surfaces, empty Bag/Orders, order status/detail, and App Store defaults. Focused Vitest and Playwright pass in desktop Chromium plus simulated Mobile Chrome, including media decoding, pickup/dine-in checkout, order routing, safe-area spacing, and page-level overflow; named physical-device proof remains separate, and this visual/media milestone does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-02`: Harbor Roast added a route-driven Captain Supply station and four merchandise advertisement details over a backward-compatible Food Delivery-owned commerce model. Distinct bean-stamp costs gate redemption, eligible rewards create zero-price gift bag lines, cash merchandise retains purchase pricing, removed unsubmitted gifts refund their stamps, and drinks/purchases/gifts share Harbor's bag and order snapshot. Browsing, redemption, purchase, and bag actions add no Wallet, Assets, Chat, Map, or external reward writes; submitted orders retain the package's existing service-account notification path. Five accepted Supply/merchandise images expand the formal Harbor pack from `29` to `34` PNGs; focused store/view tests and desktop/mobile Playwright cover qualification, media decode, mixed checkout, order display, and overflow. Named physical-device proof remains separate, and this shop-depth milestone does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-03`: Harbor Roast replaced its generic full-menu cards with a dark coffee-board ordering surface that exposes temperature availability, cup sizes, starting price, and a dedicated customize command. Detail now persists hot/iced, `8 / 12 / 16oz`, permanent-cup or removable campaign-sleeve choices and selected unit prices through restaurant-scoped Bag, checkout, backup-compatible cart normalization, and order detail; old lines remain readable and distinct variants merge only by an identical selection key. A thirteenth stable collaboration combo and fourth Home campaign open the route-driven Pompompurin activity page. Seven CLI-generated, accepted, and connected PNGs add a permanent Harbor paper cup, removable collaboration sleeve, separate handled carrier, combo, carousel, portrait Hero, and packaging story without Sanrio wordmarks or official logos, expanding Harbor's formal pack from `34` to `41`. Focused Vitest, desktop Chromium, Mobile Chrome, and manual default-desktop/`393x851` review pass route flow, pricing, media decode, subject completeness, console state, and horizontal overflow. The retired circular Harbor detail composition remains a future transferable pattern candidate; Verdant Day's ingredient-level modifiers remain documented but not implemented, while Dash Grill and Jade Hearth advance separately below. Named physical-device proof remains separate, this shop-depth milestone does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-03`: Peach Cloud removed duplicate Home recommendation-menu cards while retaining category and Search ordering, then separated campaign discovery into route-driven New, Peach Club, and mascot Merch pages. Home restores the `3:2` horizontal brand Hero before its always-visible five-category navigation; the single region below that navigation defaults to a full-width carousel that stops on one complete `2:3` poster at a time and swaps to the selected category's menu until `返回海报 / Posters` restores it. New retains the full-poster carousel. Three accepted `1024x1536` launch, seasonal, and mascot-goods posters carry their own final advertising copy without code masks, split copy panels, or adjacent-slide strips. The original-size Golden Peach horizontal advertisement remains one fixed `48 CNY` product and opens the standard detail sheet; the rejected Pairing route and Solo/Double/Party chooser are absent. Three cash-purchase mascot goods share Peach Cloud's restaurant-scoped bag, checkout, backup, and order snapshots with food without introducing a second reward store. The mascot-market campaign, three merchandise images, and three poster images expand the formal pack from `26` to `33` files; focused Vitest and desktop/mobile Playwright cover Hero/poster media decode, layout order, category replacement and restoration, carousel geometry, fixed-product detail behavior, mixed checkout, order routing, console errors, and horizontal overflow. Named physical-device proof remains separate, and this shop-depth milestone does not complete the remaining cross-module life-consequence slice;
   - `PARTIAL_DONE 2026-08-03`: Peach Cloud proved one poster-specific dynamic price slot without flattening its advertising layout. A versioned White Peach Lime derivative removes only the baked price, preserves the original file and all pixels outside the accepted repair, and renders Wallet-driven CNY/EUR/KRW values on both Home and Discover/New with responsive amount sizing. Focused component and desktop/mobile Playwright coverage verifies formatting, poster bounds, media, route flow, console state, and horizontal overflow. The other two posters retain baked prices, the formal Peach Cloud pack remains `33` files, and no shared finance-wide poster schema or historical-record conversion is claimed;
   - `DONE 2026-08-06`: the user-promoted Wallet currency foundation adds built-in/custom currency exponents, integer-minor-unit `Money`, decimal-string rate-set revisions, deterministic `ROUND_HALF_UP` quotation, locale-aware formatting, explicit missing-rate results, and backward-compatible legacy numeric-rate loading. Wallet exposes the shared quote/format service, persists revision provenance through backup/restore, and the Peach Cloud White Peach Lime pilot now consumes that service while retaining honest CNY source display when a selected custom currency has no rate. Existing exponent-2 `*Cents` records remain untouched. Focused unit and Food Delivery component coverage passes; Baemin structured minimum-order money, general Food Delivery/Shopping adoption, immutable checkout/order/ledger quote snapshots, explicit World Pack exponent authoring, and a general poster-anchor schema remain separately gated. This enabling slice does not complete the ordinary life-consequence flow;
   - `DONE 2026-08-06`: the user-promoted commerce quote-adoption slice adds a registry-aware adapter for legacy exponent-2 `*Cents`, Wallet-primary Shopping catalog/cart quotations with honest source fallback, and full current Food Delivery quotation across menus, modifier deltas, delivery fees, Baemin campaign picks/thresholds, carts, and checkout totals while retaining restaurant/menu source values. Custom Food Delivery menu records inherit their restaurant currency; Dash Grill and Harbor Roast customization stays source-native until quotation; Baemin enforces its structured minimum before checkout and submission. New Shopping/Food Delivery/Food Platform orders retain immutable quote provenance through backup, and explicit Shopping/Food Delivery Wallet expenses reuse the exact source-order snapshot. World Pack currency authoring accepts exponent `0-6`. Focused currency, store, view, backup, historical-stability, modifier, threshold, and ledger-propagation tests pass. Mixed-currency Shopping settlement, future refund snapshots, general poster anchors, and named physical-device proof remain separate;
   - `DONE 2026-08-06`: the user-promoted Wallet card-pack baseline turns Wallet into a card-first installed app rather than a finance console. Six fictional single-currency accounts and debit cards anchor CNY, KRW, USD, EUR, JPY, and HKD to six reality-based major-bank references, while one fictional Hana multi-currency credit card supports all six and bills in KRW. Ledger rows remain the only cash truth, older rows map by recorded currency without amount rewrites, credit availability stays outside cash/Assets, and display-currency/rate controls move into Wallet Settings without triggering exchange. Current/default/frozen card state and account/card lineage persist through backup/restore. Focused Vitest plus desktop Chromium and simulated Pixel 5 Playwright cover card management, CNY transfer, EUR receipt, advanced rates, screenshots, console/page errors, bottom-navigation clearance, and overflow. No real logos, real account/product claims, separate Bank app, automatic exchange, or named physical-device proof is claimed. This enabling slice does not complete the ordinary life-consequence flow;
   - `DONE 2026-08-06`: role receiving-account V1 connects a role's persistent fictional bank reference to a user-confirmed Wallet transfer without turning Chat into a ledger. Chat sends a user account request and a system-generated verified `payee_account` card; no balance changes at disclosure time. Wallet validates account-card lineage, locks recipient/currency, offers only same-currency accounts, requires sufficient funds plus an active debit card, and persists the confirmed transaction, receipt URL, Activity reopen action, Chat return route, and one low-impact relationship fact. Role deletion clears disclosed payee references while relationship reset keeps them. AI may not invent account credentials or claim an unconfirmed transfer completed. No NPC wealth balance, automatic exchange, background settlement, separate Bank app, real bank product claim, or named physical-device proof is introduced;
   - `PARTIAL_DONE 2026-08-06`: Dash Grill advances from a generic detail sheet to a shop-specific tray/order-ticket flow. The two featured combos now require a side and drink, expose option deltas, route quick-add into configuration, and persist distinct selection keys, localized labels, and chosen unit prices through restaurant-scoped Bag, checkout, backup, and Order detail. All ten built-in items now present accurate `zh-CN` by default and `en-US` with the system language, search across both built-in languages, and leave user-authored fields literal. Exact legacy seed wording migrates to the complete-meal contract without overwriting same-ID user edits. Focused store/view tests pass. User visual acceptance remains pending, and two additional complete default-tray photographs remain `NOT_GENERATED / NOT_CONNECTED`; the accepted ten single-item assets are unchanged. This shop-depth slice does not complete the ordinary life-consequence flow;
   - `PARTIAL_DONE 2026-08-07`: Jade Hearth now presents its Chinese identity as `玉炉雅席` while keeping `Jade Hearth` in English, and all twelve built-in dishes follow system language through a presentation-only resolver that preserves user-authored records. The connected Home/Menu/Feast/detail candidate replaces generic square cards and round-plus actions with one integrated paper-banquet-menu hierarchy: real chapters, stable dish sequence, vertical title slips, vessel-aware media, rectangular `添菜 / Add dish` columns, shared/solo feast suggestions, and a sticky quantity/total action. Overflow rails expose visible scrollbars and support touch, wheel/trackpad, pointer drag, arrow controls, and keyboard navigation. Existing accepted Hero and twelve-product media remain unchanged; user visual acceptance and named physical-device proof remain pending. This shop-depth slice does not complete the ordinary life-consequence flow;
   - `DONE 2026-08-03`: Peach Cloud removed the detached carousel arrow group and moved previous/next actions into `48px` hit zones on each poster's left and right edges across Home and Discover/New. White Peach Lime and Waxberry Lychee posters now open distinct route-driven long campaign pages instead of immediately opening the quantity sheet; each page uses one accepted `1024x1536` text-free Hero plus two accepted `1536x1024` story images, localized editorial copy, Wallet-following price, and an explicit quantity CTA into the existing detail/cart runtime. The mascot poster still opens Merch, whose existing campaign image and navigation remain unchanged while direct editorial copy replaces the old left solid-color mask. Six accepted WebPs expand the formal Peach Cloud pack from `33` to `39` files; exact CLI prompts, references, candidates, masters, and acceptance decisions remain under `output/imagegen/peach-cloud-campaign-pages/`. Focused Vitest and desktop/mobile Playwright plus manual `393x851` review cover route separation, media decode, subject framing, CTA behavior, Merch Hero treatment, console state, and horizontal overflow. Named physical-device proof remains separate, and this campaign-depth milestone does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-01`: the previously placeholder-only `cafe_counter`, `convenience_shelf`, and `street_food_stall` options became reusable Food Delivery browsing structures, proven by Daylight Cafe, Sugar Lane, and River Noodles. They open a real first category without `All`, preserve the shared restaurant-scoped cart/checkout/order runtime, accept App Store identity overrides without source-brand leakage, and passed focused desktop Chromium plus simulated Pixel 5 review. River Noodles and Sugar Lane's media remained pending at this historical template milestone and are closed below; this template-library milestone does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-07`: River Noodles and Sugar Lane each received one `1200x750` cover plus nine `768x768` product PNGs generated through the user-selected bundled ImageGen CLI with `gpt-image-2` and separate shop capsules. Exact prompts, candidates, accepted masters, contact sheets, and acceptance records remain under `output/imagegen/river-noodles/` and `output/imagegen/sugar-lane/`; stable runtime copies close the recorded `20`-PNG gap. Focused desktop Chromium and simulated Pixel 5 Playwright verify local media dimensions, category switching, menu/detail rendering, App Store template reassignment, console state, and horizontal overflow. The shared detail control row now sits above loaded media so Close and Edit remain clickable. This is not named physical-device proof and does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-07`: Baemin menu batching resumed with Reverse Station Hanwoo Gukbap as the first complete five-image merchant family. Four distinct `gpt-image-2` / `high` CLI requests deliver the two-person kimchi beef hot pot, light beef-bone breakfast set, spicy shredded-beef hangover soup, and seafood kimchi pancake as accepted `768x768` local PNGs without replacing the existing signature pilot. Requests, untouched candidates, deterministic accepted exports, hashes, and the five-image contact sheet remain under `output/imagegen/baemin-platform/`; the current Baemin gap falls from `54` to `50`, plus the separately deferred delayed-state illustration. Focused desktop Chromium and simulated Pixel 5 verify all five menu images at their real merchant-page slots. This is not named physical-device proof and does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-07`: Sushi Hana is the second complete Baemin five-image merchant family. Four distinct `gpt-image-2` / `high` CLI requests deliver the pork-katsu bento, salmon-and-roe chirashi, seared-eel avocado roll, and red-miso clam soup in the accepted pale-ceramic, bamboo, blue-grey Japanese editorial capsule. The first eel-roll candidate remains rejected because it returned seven pieces; the accepted targeted retry has eight complete pieces. Exact requests, untouched candidates, deterministic `768x768` accepted exports, hashes, contact sheet, and review evidence remain under `output/imagegen/baemin-platform/`; the current Baemin gap falls from `50` to `46`, plus the separately deferred delayed-state illustration. Focused desktop Chromium and simulated Pixel 5 verify all five menu images at their real merchant-page slots. This is not named physical-device proof and does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-01`: the user-selectable Food Delivery structure library expanded from four to six options. Harbor Roast now proves the dense `cafe_counter`; Daylight Cafe moved to the time-indexed `daypart_journal`; and the brand-neutral `menu_mosaic` adds a category atlas plus asymmetric product grid for future customization. Both new structures open the first real category without `All`, retain shared detail/cart/checkout/order ownership, and passed focused Vitest plus desktop Chromium and simulated Pixel 5 route/override/overflow review. Harbor Roast's later dedicated-facade and formal-media delivery does not change that reusable-template ownership, and this UI-template milestone does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-06`: one ordinary Shopping gift-card order is proven through its existing user-confirmed consequences. Focused Playwright creates the matching Chat service account explicitly, places a gift order for an existing role, verifies the source-owned order notification, confirms the delivery cue through Reminders into Calendar, completes the Shopping order, records the expense into Wallet, reopens Wallet Activity, and verifies the Shopping gift plus Wallet support fact as one Contacts memory. The same Shopping `orderId` anchors downstream lineage; Wallet support remains metric-neutral, reopen produces no duplicate transaction or memory fact, and desktop Chromium plus simulated Pixel 5 pass. No Chat identity or Wallet record is auto-created, no new ownership is introduced, and named physical-device proof is still pending;
   - `DONE 2026-08-07`: the user-promoted Wallet quote-explainability slice adds one general Activity transaction-detail path without broadening role-transfer receipt semantics. Saved Shopping/Food/other quote snapshots show source money, settled quoted money, exact recorded rate, `rateSetId`, rate source, and quote time without re-quotation; legacy, malformed, missing, deleted, and unavailable-currency states remain honest. Direct `transactionId` reopen, return cleanup, current-rate stability, account/card lineage, desktop Chromium, simulated Pixel 5, screenshots, and overflow are regression-covered. Mixed-currency settlement, refunds, broader Wallet expansion, and named physical-device proof remain separate;
   - `DONE 2026-08-07`: configurable multi-screen Home release curation defaults normal use to three formal pages: glanceable widgets plus Wallet/Appearance/Photos/Camera, then Phone/Map/Calendar/Reminders/Shopping/Food Delivery, then System Status/Quick Heart/Quick Disc. Appearance lets users choose two through five visible pages; reducing the count hides trailing retained pages only and never changes their templates, slot placements, or content, while Home edit mode always shows all five pages. Network, Stock, Assets, and the duplicate formal-page App Store entry remain usable through App Store, Widget Center, Today View, or edit mode without appearing equally mature. Setup version 4 migrates only recognized earlier defaults while preserving customized layouts; focused unit and desktop/mobile Playwright cover migration, page count, route context, and App Store recovery.
4. `P1 Hosted product proof` - `TODO`
   - observe the remote CI and Pages jobs for the exact release commit and verify external required-check/environment policy;
   - add deployed base-path, manifest/install, controlled online-to-offline relaunch, hosted-provider Chat, and complete backup export/import smoke evidence;
   - run a named true-device matrix for safe areas, browser chrome, keyboard/composer, touch, back navigation, file save/import, and PWA relaunch.
5. `P2 Post-preview depth` - `ON_HOLD`
   - Mini Scene Text Presenter and the first Calendar Adapter may resume only after the product-preview P0 gates; interactive HTML remains a later security stage;
   - personal R2, production push, Gallery schema, non-Book Repository migrations, World Setting W2, hotspot decomposition, broad typing, and secondary-app depth do not block the first usable product preview.

Acceptance for 4.9:

- a fresh-storage user reaches one successful AI reply through an automated browser journey;
- write, conflict, backup, restore, and reopen failure paths never silently report success or destroy the previous readable save;
- one world/role path and one daily-life cross-module consequence are browser-proven;
- the deployed PWA and representative true-device paths are verified before the project claims a public release;
- every stage yields a user-verifiable increment and avoids unrelated refactors or new platform infrastructure.

Primary package:

- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

Secondary packages:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md` for current-save safety, recovery, and release proof;
- `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md` for first-reply and Chat continuity;
- `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`, `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`, and `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md` only when the named life vertical slice starts.

### 4.10 Camera And Shared Image Generation

Status: `PARTIAL_DONE`

Promoted first slice completed on 2026-07-29:

- added a dedicated shared Image Generation Module instead of expanding text reply behavior in `src/lib/ai.js`;
- implemented OpenAI-compatible Images/Edit, OpenAI-compatible Chat image output, and Grsai asynchronous adapters for the confirmed LJQ Club, Aixoras, and Grsai targets;
- added Camera as an installed Home/App Store app with a concise iOS-like capture surface and separate provider, default, routing, diagnostics, and task pages;
- kept URL, API key, proxy, model discovery, and module routing off the main capture surface;
- added Gallery reference selection plus distinct Download, Keep in Gallery, and Discard outcomes; only explicit Keep creates a durable Gallery asset;
- persisted public provider/default/routing configuration separately from device-local credentials and bounded candidates;
- added public image-generation configuration to ordinary backup/restore/rollback while excluding API keys, proxy tokens, and temporary candidates;
- proved the promoted flow with focused unit tests plus desktop and simulated-mobile Chromium checks for Home entry, Camera layout, reference selection, explicit retention, provider fields, routing pages, page errors, and overflow.

Remaining stages are not implied by this completed slice:

- Gallery `People / 人物` smart views and user/role reference curation;
- automatic person/intent reference resolution and separate confirmation before a kept image becomes a person reference;
- Chat, Community, Map, and other source-module callers;
- prompt-assistant management UI, hosted proxy security/deployment, true-device validation, and opt-in hosted-provider smoke.

Primary packages:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md` for shared contracts, persistence, credentials, backup, and adapters;
- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md` for Camera entry ownership, capture IA, settings hierarchy, and responsive acceptance.

Focused contract and remaining inventory:

- `docs/architecture/CAMERA_GALLERY_IMAGE_GENERATION_ARCHITECTURE_PLAN.md`;
- `docs/architecture/CAMERA_GALLERY_IMAGE_GENERATION_TODO.md`.

### 4.11 Local Narrative Map Packs And Journey Exploration

Status: `PARTIAL_DONE / MJE-1_THROUGH_MJE-4_USER_ACCEPTED_INTEGRATED_LOCAL`

Promoted baseline completed on 2026-07-30:

1. added a versioned local map-pack contract without device location, route planning, paid POI lookup, or commercial map runtime calls;
2. added `real-seoul-v1` with a locally hosted CC0 real-city street-map asset, curated real places, and geographic coordinates;
3. added `cyber-wasteland-v1` with a fixed cyber-wasteland asset, four explicit factions, curated fictional places, and normalized canvas coordinates;
4. added Map pan/zoom, local pack/player-place search, categorized click-to-place player pins, consistent place details, deterministic geographic/fictional distance, persistence, and active-trip map-change protection;
5. preserved legacy text-only addresses and existing Map trip, reminder, relationship, World Pack context, backup, and visual-background behavior;
6. bound one recommended or overridden map to each world, with `survival_city` resolving to the cyber wasteland and current modern presets resolving to Seoul; the everyday Map route has no real/fantasy switch;
7. added a dedicated Map Settings route for world binding, Gallery-backed local-image import, shared-image-service fictional-map generation, explicit candidate acceptance, and visual presentation controls;
8. proved desktop and simulated-mobile world activation, correct map resolution, local search, explicit pin placement, Settings dialogs, layout containment, and zero commercial-map requests with focused Playwright coverage.
9. separated everyday place use from detailed pin administration: Map Settings now edits seed/player pin metadata and coordinates through explicit reselection, keeps built-in pack places read-only, allows pin placement during trips, and preserves the Map parent across nested settings returns.
10. completed the OpenFreeMap + MapLibre geographic runtime with keyless public styling, visible attribution, lazy loading, canonical marker/click coordinates, fictional/custom zero-request containment, and a local fallback that preserves Map state and interactions.
11. expanded Seoul V1 to 101 versioned read-only real places. The additional everyday-city and community-service catalog covers general and luxury shopping, supermarkets, a deliberately small convenience-store set, nightlife, general and plastic-surgery hospitals, four housing tiers, major transport hubs, parks, universities, landmark hotels, pharmacy districts, sports facilities, cinemas, bank headquarters, and public-safety institutions while preserving the earlier entertainment, media, company, civic, cultural, event, and beauty-salon places.
12. made coordinate placement exclusive across MapLibre and local Leaflet renderers so saved markers cannot intercept the tap or replace an editor draft, including active-trip Pixel 5 coverage.
13. refactored the everyday Map idle state around progressive disclosure: compact map controls remain primary, route/place-detail surfaces require explicit context, and fictional faction legends start collapsed.
14. added persisted per-map pin visibility with separate category and individual-place controls. Hidden places remain searchable, inspectable, and usable as trip destinations; dense everyday categories default off, and convenience stores stay out of empty-search suggestions until the user searches or selects that category.
15. MJE-4 adds a separate per-world place-knowledge policy. Existing saves normalize to `all_known`; optional `footprint_gated` mode withholds undiscovered convenience stores and pharmacy districts from markers, search, journey pickers, Places, and Settings lists until a completed positioned journey reveals them within the deterministic local radius. Marker visibility remains a separate presentation preference, manual role-position changes do not reveal places, and mode changes retain discovery evidence.

Approved Journey / Footprints / Exploration direction:

- Map remains the player entry and source owner for known-destination journeys and active area exploration; the Map Journey Runtime is a Map-owned domain service, not a separate app.
- transport choice belongs to journey planning. A separate Transit app is deferred until a static or live network has meaningful independent browsing, schedule/ticket/vehicle, authoring, or progression use.
- the current `Explore` points, route familiarity, area unlocks, and static feedback are the passive `Footprints` foundation. They are not yet active exploration and must not be deleted when the IA is corrected.
- journey events are checkpoint-driven. MJE-3 keeps a triggered route update pending while the journey timer continues; only the reviewed bounded two-minute delay changes ETA. Event Runtime owns eligibility, cooldown/cap, proposal/review, and audit, while Map validates every result and remains the journey source of truth. Destination change and event-driven cancellation remain later decisions.
- an ordinary journey with no event remains a supported outcome.

Execution order and live status:

1. `MJE-1 USER_ACCEPTED / IMPLEMENTED_IN_CURRENT_TREE`: explicit transport selection, mode-aware estimates, active/history transport snapshots, backup/restore, and legacy compatibility are implemented and user-accepted. The current physical tree remains uncommitted and this status does not claim an integrated commit.
2. `MJE-2 USER_ACCEPTED / IMPLEMENTED_IN_CURRENT_TREE`: the user accepted the versioned Map-owned active-journey lifecycle, small deterministic duration-based checkpoint plan, and safe pause/resume with timer and arrival-push correction by explicitly authorizing MJE-3. The ordinary uneventful completion path, existing `idle` / `traveling` / `arrived` compatibility, transport snapshots, reminders, familiarity, rewards, relationship lineage, and backup/restore remain covered. This does not claim an integrated commit.
3. `MJE-3 USER_ACCEPTED / IMPLEMENTED_IN_CURRENT_TREE`: the user confirmed that the sample journey event appears without pausing travel. The first low-impact, world-aware Map checkpoint Event Runtime adapter remains bounded to completed `en_route` and `near_arrival` checkpoints, with Event Runtime owning eligibility, cooldown/cap, proposal/review, provenance, and audit while Map validates exact lineage and applies only no ETA change or a reviewed bounded delay. Event wording, values, and richer transport/asset/ability variants are deferred to the separate project-event work. This is not an integrated commit.
4. `MJE-4 USER_ACCEPTED / INTEGRATED_LOCAL`: the passive Map entry and dashboard are now `Footprints / 足迹`, preserving points, route familiarity, area progression, feedback, and history without claiming active exploration. Map Settings adds a per-world `all_known` or `footprint_gated` knowledge choice. Old saves stay all-known; Footprints-gated mode hides undiscovered authored convenience stores and pharmacy districts from markers, search, journey pickers, Places, and Settings. A completed journey whose destination resolves to a canonical coordinate reveals up to four nearby eligible authored facilities within 1.2 km, in stable distance/ID order, with persisted world/map/trip evidence. Manual role-position changes and cancelled journeys reveal nothing; mode changes preserve discovery records; marker visibility remains presentation-only. The accepted endpoint correction keeps role-position display text separate from the saved address/coordinate used for distance estimates. Event-based reveals, generated candidate places, keep/discard ownership, and active exploration remain MJE-5 or later.
5. `MJE-5 TODO / USER_ACCEPTANCE_REQUIRED`: add active area exploration with time/approach choices, exploration checkpoints, and explicit keep/discard ownership for discovered places or knowledge.
6. `MJE-6 TODO / SEPARATE_DECISION`: add reviewed static transport modes/lines/stations/topology to versioned map packs, then reconsider a Transit app only against its independent-use threshold; realtime, routing, traffic, and provider licensing remain separate decisions.

Focused architecture and acceptance boundaries:

- `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`

Remaining work is separately gated:

- full package-manifest import/export, topology and coordinate validation, calibrated scale tools, editable faction regions, seed-place authoring, and migration preview;
- a building-level georeferenced Seoul package, such as local PMTiles, if city-scale image calibration proves insufficient;
- broader real-city pack catalog and reviewed world recommendation policy;
- separately reviewed public-transit topology/data adapters, without implying realtime arrival or route planning;
- true-device map gesture and large-package/offline-cache validation.

These remaining items do not authorize live navigation, traffic, device location, paid POI search, or a provider-specific canonical place model.

Primary package:

- `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`

Focused decision:

- `docs/product-decisions/LOCAL_NARRATIVE_MAP_PACKS.md`

### 4.12 Calendar, Agenda Journey, Activity Session, And Event Orchestration

Status: `ARCHITECTURE_ACCEPTED / DOCUMENTATION_ONLY / NOT_STARTED`

Accepted product and ownership direction:

- `日历 / Calendar` remains a visible Home app and the canonical owner of confirmed long-range schedule/date facts. Its current frontend is a list-first confirmed-event baseline, not yet a conventional month/week/date-grid calendar.
- Calendar's future visible views are `Month`, `Week`, and `Agenda / 日程`; `日程` is a view of Calendar events, not another long-range planning app.
- the future user-facing `行程 / Agenda Journey` app owns today's and the near-term execution plan, activity steps, completion/miss state, performance, and outcome references. It is distinct from Map Journey.
- the hidden `Schedule Orchestrator / 时间编排模块` materializes confirmed near-term Calendar commitments into Agenda Journey instances and reconciles deadlines. It links stable IDs and cannot become a Home app or a new owner of copied downstream records.
- an Agenda Journey step may request a Map Journey or an Activity Session. Map arrival is valid travel/presence evidence but cannot prove that a rehearsal, broadcast, performance, class, or meeting was completed.
- Activity Session uses absolute timestamps and explicit checkpoints. Minimizing or navigating inside SchatPhone does not stop it; application suspension is reconciled on resume. A closed or OS-suspended browser/PWA cannot promise an exact interactive popup.
- Event Runtime owns eligibility, deterministic/random gates, cooldown/cap, proposal/review, and audit. Turning Mini Scene presentation `off` suppresses the popup but does not disable event eligibility; only policy-approved low-impact outcomes may auto-resolve, while high-impact effects retain owner confirmation/review.
- a future Story/Diary/Journal surface may consume a bounded `Narrative Timeline` projection, but its product name, route, persistence owner, retention policy, and AI-context Interface are not approved yet.

Execution order and live status:

1. `CJA-0 DONE / DOCUMENTATION_ONLY`: freeze terminology, ownership, frontend reality/target, cross-module references, background timing limits, automatic-resolution policy, and stop conditions.
2. `CJA-1 TODO / USER_ACCEPTANCE_REQUIRED`: freeze Calendar Month/Week/Agenda information architecture, selected-day detail, multi-day spans, and event authoring before modifying `/calendar`.
3. `CJA-2 TODO / USER_ACCEPTANCE_REQUIRED`: define a pure Schedule Orchestrator Interface, idempotent materialization fixtures, deadline reconciliation, persistence owner, backup/restore, and legacy compatibility without adding a visible app.
4. `CJA-3 TODO / USER_ACCEPTANCE_REQUIRED`: add an Agenda Journey V1 around one manual or Calendar-derived day plan without requiring random events.
5. `CJA-4 TODO / USER_ACCEPTANCE_REQUIRED`: add one Activity Session with minimize/navigation/reopen reconciliation and no claim of exact closed-app popup delivery.
6. `CJA-5 TODO / USER_ACCEPTANCE_REQUIRED`: add one low-impact Event Runtime Adapter with automatic resolution when presentation is off and a text interaction path; interactive HTML remains gated by Mini Scene security.
7. `CJA-6 TODO / SEPARATE_DECISION`: add a Narrative Timeline projection and bounded Forum/Chat AI-context Interface only after owner, retention, permission, review, and backup contracts are approved.

Focused architecture and product decision:

- `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`

This lane does not modify or block roadmap 4.11 Map Journey work. MJE stages remain owned and reviewed separately.

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

1. `P0 DONE 2026-07-22`: 4.9 first successful Chat activation loop.
2. `P0 DONE 2026-08-09`: 4.9 current-save write/conflict safety and the release-local complete backup/recovery boundary; broader Repository migration, capacity reporting, and personal R2 remain separately reviewable architecture slices.
3. `P1 PARTIAL_DONE`: 4.10 Camera and shared image-generation first slice is complete; Gallery People curation and source-module callers require separately promoted follow-ups.
4. `P1 DONE 2026-08-07`: the explicit custom role -> Chat journey, Wallet exact-money/card-pack foundations, role receiving-account V1, one ordinary Shopping life-consequence flow, focused Wallet quote explainability, and configurable multi-screen Home release curation are complete at local desktop/simulated-mobile acceptance.
5. `P1 PARTIAL_DONE` 4.9/4.5 hosted release proof: GitHub Pages remote gates/base-path smoke, the Git-connected Vercel root-path plus fail-closed AI-proxy baseline, and the Git-connected Cloudflare Worker/static-assets root path plus URL smoke are deployed. Configured real-provider Chat, installed-PWA/relaunch, backup round trip, external protection checks, and named true-device evidence remain.
6. `P1` 4.6 true-device World Pack validation only where it overlaps the release device matrix; another archetype is not scheduled.
7. `P2` 4.8 Text Presenter and first Calendar integration after the product-preview P0 gates; HTML and additional callers remain separately gated.
8. `ON_HOLD` until after the first usable product preview: personal R2/Worker, production push, Gallery/non-Book migration, World Setting W2, hotspot decomposition, incremental typing, and secondary-module expansion.
9. `P2 PARTIAL_DONE / MJE-1 THROUGH MJE-4 USER_ACCEPTED_INTEGRATED_LOCAL`: 4.11 local narrative-map baseline now includes accepted transport planning, lifecycle/checkpoints, the first non-blocking checkpoint event adapter, Footprints IA, and optional per-world authored-facility discovery. Active exploration, event-driven place reveal, candidate-place ownership, transit topology, broader-city, and true-device stages remain gated by the explicit order above.
10. `P2 ARCHITECTURE_ACCEPTED / NOT_STARTED`: 4.12 Calendar/Agenda Journey orchestration is documented only. CJA-1 Calendar information architecture requires a separate user acceptance decision; no Agenda Journey, Schedule Orchestrator, Activity Session, event popup, Narrative Timeline, or persistence implementation has started.

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
