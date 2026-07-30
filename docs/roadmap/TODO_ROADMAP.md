# SchatPhone TODO Roadmap

Updated: 2026-07-30

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
- 4.7 has a promoted Book/WorldBook content-carrier slice; its focused K-pop rule is the first planned content input for the separately staged Mini Scene Module;
- 4.8 has an architecture-accepted cross-module Mini Scene direction, but no runtime, popup, regex execution, or source-module trigger is implemented yet.
- 4.9 is now the product-control lane: turn the integrated modules into a usable product preview by closing first-value activation, current-save safety, one ordinary life loop, and deployed PWA proof before more infrastructure or feature breadth.
- 4.11 has a user-promoted local narrative-map baseline: real Seoul and a faction-based cyber wasteland share one place, pin, and trip surface; per-world binding plus lightweight image import/generation are landed. The user has selected OpenFreeMap + MapLibre for real-world rendering with local fallback, but the migration is currently `IN_PROGRESS_UNVALIDATED`; see the map package handoff. Full package authoring remains later separate work.

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
   - current validation passes 185 Vitest files / 1170 tests, production build, and 60 collected Playwright cases with 56 passed and 4 existing project-specific skips.
3. `P1 CI and release gating` - `PARTIAL_DONE`
   - `WORKFLOW_IMPLEMENTED 2026-07-22`: PR/manual CI and main-only Pages release definitions now fail closed on separate production/full audits, lint, unit, build, and one full Playwright collection that already includes the focused visual-quality cases;
   - both paths reject flaky recovery, cap intentional skips at four, retain failure-only Playwright diagnostics for seven days, and avoid a duplicate `test:visual` run;
   - Pages config/upload/deploy now follows the verified build job, but remote GitHub execution, external required-check/environment protection, and a deployed `dist` base-path smoke remain unverified;
   - keep this slice `PARTIAL_DONE` until those remote/external checks pass; do not treat the local workflow definition as release proof.
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

1. one shared Mini Scene Module will serve explicitly registered callers such as Calendar, Map, Chat, and future streaming modules;
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
2. `P0 Current-save safety and complete local recovery` - `IN_PROGRESS`, parallel architecture lane
   - `DONE 2026-07-22`: return structured persistence write results without breaking existing callers; local primary and mirror outcomes are independently observable;
   - `DONE 2026-07-22`: reconcile local/mirror freshness by lineage and sequence before Store mount, with bounded unavailable-IndexedDB startup, conflict zero-write behavior, verified repair, and the repository-owned legacy Book carrier explicitly inspect-only;
   - still TODO: surface quota/carrier failure at product level and connect unresolved reconciliation to user-visible recovery actions;
   - extend the accepted same-container read-only timeout behavior beyond Book without introducing force takeover or last-write-wins;
   - close complete-package coverage, including required Chat identity/avatar state and default-on retained Gallery material, then prove integrity, staged activation, rollback, and reopen;
   - personal R2/Worker transport remains post-release because it cannot repair an unsafe or incomplete local recovery point.
3. `P1 Core personal-life vertical slice` - `IN_PROGRESS`
   - `DONE 2026-07-22`: prove one explicit custom role -> Chat journey without changing the valid zero-Book/zero-encyclopedia/zero-Pack boundary; Contacts starts the explicit action, Chat owns idempotent binding/conversation execution, and Chat Directory remains the management surface;
   - focused Playwright proves create/select -> Start Chat -> missing-provider recovery -> first manual reply -> return to the same Contacts profile in desktop and simulated Pixel 5 Chromium, while an explicit empty custom-role fixture leaves seeded fresh-storage roles unchanged;
   - `DONE 2026-07-29`: Verdant Day is the fifth independent Food Delivery shop app, with a route-driven Home/Menu/Detail/Bag/Orders/Order UI, complete twelve-photo product pack, corrected hierarchical back navigation, and focused desktop/mobile Playwright coverage; this shop-app milestone does not complete the remaining ordinary Food Delivery/Shopping cross-module life-consequence proof;
   - still TODO: prove one ordinary Food Delivery or Shopping action through its existing Wallet, Calendar, Chat service-notification, and relationship-memory consequences;
   - curate the default Home release surface so partial utilities do not appear equally mature; hiding or demoting an entry changes discoverability and requires a focused product review.
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

### 4.11 Local Narrative Map Packs

Status: `PARTIAL_DONE`

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

Remaining work is separately gated:

- full package-manifest import/export, topology and coordinate validation, calibrated scale tools, editable faction regions, seed-place authoring, and migration preview;
- a building-level georeferenced Seoul package, such as local PMTiles, if city-scale image calibration proves insufficient;
- finish and validate the selected OpenFreeMap + MapLibre real-world renderer, including deterministic external-service tests, local fallback, lazy bundle measurement, attribution, privacy/network review, and no provider POI or production-data ownership;
- broader real-city pack catalog and reviewed world recommendation policy;
- true-device map gesture and large-package/offline-cache validation.

These remaining items do not authorize live navigation, traffic, device location, paid POI search, or a provider-specific canonical place model.

Primary package:

- `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`

Focused decision:

- `docs/product-decisions/LOCAL_NARRATIVE_MAP_PACKS.md`

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
2. `P0 CURRENT`: 4.9 current-save write/conflict safety followed by complete local recovery; architecture work proceeds only as separately reviewable slices.
3. `P1 PARTIAL_DONE`: 4.10 Camera and shared image-generation first slice is complete; Gallery People curation and source-module callers require separately promoted follow-ups.
4. `P1 IN_PROGRESS`: the explicit custom role -> Chat half is done; next prove one ordinary life-consequence flow, with default Home release curation reviewed as a product choice.
5. `P1` 4.9/4.5 hosted release proof: remote gates, deployed base-path/PWA/install/relaunch, real-provider Chat, backup round trip, and named true-device evidence.
6. `P1` 4.6 true-device World Pack validation only where it overlaps the release device matrix; another archetype is not scheduled.
7. `P2` 4.8 Text Presenter and first Calendar integration after the product-preview P0 gates; HTML and additional callers remain separately gated.
8. `ON_HOLD` until after the first usable product preview: personal R2/Worker, production push, Gallery/non-Book migration, World Setting W2, hotspot decomposition, incremental typing, and secondary-module expansion.
9. `P2 IN_PROGRESS_UNVALIDATED`: 4.11 local narrative-map baseline, per-world binding, and lightweight image import/generation are complete; the selected OpenFreeMap + MapLibre real-world renderer is partially edited and must resume from the map package handoff before full package authoring or broader catalogs.

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
