# SchatPhone TODO Roadmap

Updated: 2026-08-27

Integrated baseline: `c47faa4`

Working tree: preserved but excluded from integrated capability and measurement claims.

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

Static inventory refreshed on 2026-08-26 from integrated baseline `f06a575`; validation results remain attached to their named runs and commits below:

1. the integrated tree contains 58 route-view files, 24 Pinia store files, 144 Vue components under `src/components`, 49 top-level JavaScript composables, 291 JavaScript source files, 203 Vue source files, zero TypeScript source files, 328 unit/component test files, and 72 Playwright spec files;
2. Camera/shared image generation, Music, Weather, Calendar/Agenda Journey/Activity Session, expanded Map media, eleven Shopping storefronts, fifteen Food Delivery entries, commerce checkout/support, and thirteen installed S1 App previews are implemented at their named scoped baselines;
3. PR CI and main Pages workflow definitions run separate production/full dependency audits, lint, unit tests, production build, and one full Playwright collection. Hosted GitHub Pages, Vercel, and Cloudflare baselines plus direct/restricted-provider Chat smokes remain recorded in their named evidence; installed-PWA/relaunch, backup round trip, external protections, and named physical-device proof remain open;
4. final cross-module visual consistency, production security hardening, true-device QA, and several secondary-module loops are not complete;
5. the largest engineering risk remains concentrated in oversized views and central Store fan-out: `FoodDeliveryView.vue` is 12716 lines, `system.js` is 5361 lines, and direct `useSystemStore` use appears in 42 of 58 route views at the integrated baseline. These measurements do not override the current hold on hotspot decomposition.

Roadmap interpretation:

- four delivery lanes, 4.1 through 4.4, have reached current acceptance;
- 4.17 is the P0 Contacts V3 Identity And Role Core lane. `CONTACTS-V3-0` completed its decision/inventory freeze, `CONTACTS-V3-1` completed the Contacts-owned profile behavior foundation, V3-2A `CARD-1` completed the category carrier, `ROLE-1` completed the four-person-type baseline, `CARD-2` completed field purposes plus date/yes-no/organization-reference inputs, `CARD-3` completed manual WorldBook category/field editing, `CARD-4` completed read-first dynamic person-page rendering, `CARD-5` completed isolated person-specific extensions, and `CARD-6` completed deterministic/optional-AI current-world profile-card proposals on 2026-08-27. `PERSONA-1` reviewable free-text classification is next;
- 4.5 is the active maintenance/governance lane;
- 4.6 has an integrated V1 but still needs product hardening;
- 4.7 has a promoted Book/WorldBook content-carrier slice; its focused K-pop rule is the first planned content input for the separately staged Mini Scene Module;
- 4.8 now has an AI-required text foundation: durable shared artifacts/policies, an Event Runtime caller contract, a provider-neutral structured generation pipeline, and a global Text Presenter are landed. No Calendar authoring field or source button exists; production event-trigger Adapters, profile binding, safe regex execution, and HTML remain staged.
- 4.9 is now the product-control lane: turn the integrated modules into a usable product preview by closing first-value activation, current-save safety, one ordinary life loop, and deployed PWA proof before more infrastructure or feature breadth.
- 4.11 is `P2 PARTIAL_DONE / MJE-1_MJE-2_MJE-4_INTEGRATED / MJE-3_ADAPTER_RETAINED_PRODUCTION_TRIGGER_SUSPENDED`: the generic MJE-3 route-obstruction adapter remains compatibility-tested but production Map mounting disables it after product review. MJE-4 presents passive progress as Footprints plus an optional per-world place-knowledge mode. In Footprints-gated worlds, completed positioned journeys can reveal a small deterministic set of nearby authored facilities; old saves remain all-known. MJE-5 remains separately gated.
- 4.12 is `PARTIAL_DONE / CALENDAR_DEPARTURE_READINESS_V1_DONE 2026-08-15 / CJA-1_DONE 2026-08-15 / CJA-2_DONE 2026-08-16 / CJA-3_DONE 2026-08-16 / CJA-4_DONE 2026-08-16 / CJA-5_DONE 2026-08-16 / CJA-6A_CONTRACT_DONE 2026-08-17`: Calendar V3 supports Month/Week/Agenda and stable Map destinations; the hidden Schedule Orchestrator persists occurrence requests; the separate Agenda Journey app materializes or manually creates near-term execution plans; Activity Session owns absolute-time activity timing; one midpoint-only low-impact Event Runtime family supports silent `off` resolution or an inline Focus Companion text choice; and CJA-6A now freezes the read-only Narrative Timeline/source-reference contract. Appointment auto-entry, media callers/richer companions, and CJA-6B Timeline implementation remain unimplemented and separately gated.
- 4.13 is `PARTIAL_DONE / CHKSZ_PRIMARY_RADIO_BROWSER_LOCAL_AND_MAP_MEDIA_INTEGRATED_LOCAL`: Music is an installed listening app with browser playback, library/queue/search, ChKSz as the primary user-authorized online source, supplementary generic JSON configuration, a no-key Radio Browser HTTPS/MP3 live-station preset, direct HTTPS URL songs, Music-owned device-local file import, a global floating player, Chat track sharing, and an active-journey Map music/radio panel. ChKSz resolved playback URLs now use an expiry-aware memory cache for up to 7 days while retaining automatic invalidation and one bounded re-resolution. Live-station uptime remains external; real-key rights/CORS smoke, true-device media behavior, Chat search, and external Map queue requests remain separate gates.
- 4.14 is `P1 PARTIAL_DONE / EVE-4B REFERENCE_VERTICAL_DONE / EVE-4C DONE 2026-08-14 / PLAYER_CONTEXT_V1_FOUNDATION_DONE 2026-08-15 / EVENT_REASON_COPY_AND_FEEDBACK_MAINTENANCE_DONE / WORK_HUB_FIRST_NEXT_DIRECTION_ACCEPTED 2026-08-26 / CONTACTS_V3_IDENTITY_FOUNDATION_PREREQUISITE_ACCEPTED 2026-08-27`: Event is a cross-module causal chain, not a universal card system. EVE-2A/2B/2C and EVE-3 remain landed; EVE-4A's Food Delivery host/card/manual trigger remains withdrawn. EVE-4C supersedes the EVE-4B pickup-time trigger and specialized Runtime shape with explicit owner-native user initiation, shared commerce contracts, Event Instance V2, Service Cases, owner facts/requests, Phone resolution proposals, Map estimate/reroute references, and separate Food Delivery/Shopping owner Adapters. The current user-visible commerce case stops at Food Delivery's address-escalation chain; Shopping is only an Adapter/interface proof and is not an accepted user-facing Shopping event case. Remaining Shopping product work stays with the Shopping owner as planned follow-up. Player Context V1 now provides revision-aware read-only K-pop manager/public-idol eligibility; dynamic world evolution and information propagation are planned later, and EVE-5 is a later separately gated stage. Contacts V3 identity ownership and persona confirmation now precede new formal identity-conditioned event work. The later product sequence remains Work Hub organization owner/ordinary loop -> Work Hub-native schedule-change event -> Chronicle, with NEXT limited to external opportunities and SMS conditional. The 2026-08-26 maintenance slice centralizes bilingual runtime-result copy, keeps technical IDs only in diagnostic summaries, and exposes Chat role-contact cooldown/quota guardrails without changing event behavior.
- 4.15 is `P2 PARTIAL_DONE / TTS-1 DEPLOYED / PROVIDER QUALITY SMOKE PENDING`: the first shared runtime TTS slice provides Cloudflare Workers AI MeloTTS and user-key MiniMax Chinese preview behind one contract. The bounded Worker route is deployed at `https://schatphone.noarry.workers.dev`; Chat message audio, automatic read-aloud, durable media, stable real-provider quality/playback proof, and production gateway hardening remain separately gated.
- 4.16 is `P1 INITIAL_SHELL_PORTFOLIO_DONE / SHP-1 THROUGH SHP-11 S1_DONE 2026-08-24 / WORK_HUB_FIRST_NEXT_SEQUENCE_ACCEPTED 2026-08-26 / CONTACTS_V3_IDENTITY_FOUNDATION_PRECEDES_WORK_HUB_PROMOTION 2026-08-27`: the accepted shell-first wave now includes thirteen installed S1 Apps—Mail, Browser, Community, Healthcare, Housing, Workplace, Fandom, Tickets, Travel, Intercity, Creator Rights, Parcel, and Career—plus the unlocked native-system Notification Center. The four final shells are `联程 / VIA`, `谱权 / CREDO`, `递送 / POSTA`, and `机会 / NEXT`; each preserves local-preview/fail-closed semantics and explicit S2/S3 seams. Contacts V3 now comes first so Work Hub can select role and affiliation from one confirmed Self Profile instead of a universal fixture. The later product sequence deepens Work Hub before its first internal-organization event, then adds Chronicle; NEXT stays external-opportunity-only and SMS stays conditional. `CMG-08` remains separately assignable persistence work.

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

Completed in the 2026-08-24 Appearance foundation round:

1. separated persisted day/night mode from the system-theme registry while retaining `default` / `zen` compatibility for existing saves, routes, CSS selectors, backups, and tests;
2. kept curated native-system App icon packs as an independent axis under the frozen per-app override priority;
3. added non-locking style-kit composition for system theme + system icon pack + optional recommended wallpaper, including `customized` status after users change a composed part;
4. preserved personal Gallery/URL wallpaper unless the user explicitly applies a kit wallpaper, and kept Home layout/widgets, Chat appearance, app skins, global custom CSS, commercial logos, and per-app overrides outside style-kit mutation. Dedicated Playwright coverage passes 4/4 across desktop Chromium and simulated Pixel 5, including personal-wallpaper retention, persistence after reload, commercial-logo preservation, page-error checks, and horizontal-overflow checks; the full Vitest suite passes 314 files / 2326 tests, with lint, the 655-module production build, governance, and diff checks also passing. The first authored Cloud Pastel, Dessert Bakery, and Misty Glass visual assets remain follow-up work rather than part of this foundation slice.

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
   - `DONE 2026-08-12`: repository-owned artwork is externalized to the personal image bed without making it a shared user service. The registry now holds 843 byte- and SHA-256-verified objects: 415 public runtime objects under `schatphone-assets/` and 428 masters, generation sources, or candidates under protected `schatphone-source/`. The credential-free work item is formally named an asset upload list (`素材上传清单`); confirming it authorizes automated transfer but does not declare artwork final, and later revisions use new SHA-256 content. Audit screenshots, Playwright reports, contact sheets, prompts, and JSON/JSONL evidence are excluded from image-bed payloads. Authenticated batching, centralized public runtime URLs, separate project/migration/Gallery credential boundaries, cross-PC Git fallback, and copy/verify archival are complete. Commits `f654b81` and `ffae433` established the original deployed baseline; GitHub Pages Run `31537206567`, Vercel, and Cloudflare deployment checks passed, all three production hosts loaded 18/18 observed image-bed images without browser errors, and the temporary migration token is revoked while the upload/list-only project publisher remains active;
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

#### 4.5-CMG Shared Experience, Memory, And Durable History Governance

Status: `P0 IN_PROGRESS / CMG-00, CMG-01, CMG-02, CMG-03, AND DCF-05 DONE 2026-08-20 / DCF-01, DCF-03, CMG-04, CMG-05, CMG-06, AND CMG-07 DONE 2026-08-21`

This subsection is the only live execution checklist for this governance round. Other documents may describe product meaning or the current handoff, but they must reference these IDs instead of copying their status.

Accepted product meaning:

1. one continuing real-life matter is one shared experience. Booking a gift, its delivery, and the recipient calling to say they liked it are progress in the same experience, not three role memories;
2. a shared experience, the concise detail a role actually remembers, and module-owned supporting records are different records with different jobs;
3. summaries are allowed and required for useful recall, but they are formed by shared experience or subject, never by an arbitrary rule such as every ten rows;
4. Relationship Runtime owns current relationship truth. Chat may read that truth once, but cannot inject a competing legacy relationship answer;
5. committed relationship facts, Event Instances, and other canonical owner history cannot disappear because an array reached a row limit. A complete Mini Scene is optional presentation history: it is retained only after an explicit user choice, has no silent row-limit eviction, and may be explicitly archived/deleted without deleting the event result, role memory, diary/timeline projection, or owner audit evidence. Lists may page and AI prompts may select only relevant summaries;
6. a user-visible durable action reports success only after the owning module receives a successful persistence result. A failed save remains visible and retryable;
7. repeating the same request or confirmed action identifier must not call a provider again or create a second committed result unless the user explicitly requests regeneration.

Implementation ledger:

| ID | Priority | Status | Scope and completion evidence | Depends on | Primary package / suggested PC lane |
| --- | --- | --- | --- | --- | --- |
| `CMG-00` | P0 | `DONE 2026-08-20` | Record the confirmed model, audited defects, numbered execution order, and cross-PC handoff rules. Documentation/governance checks must pass; no behavior code is changed. | none | module architecture / controller PC |
| `DCF-05` | P0 | `DONE 2026-08-20` | Completed by `f140557`: deferred mirror completion now waits for scheduled, active, and follow-up writes to become idle. The test uses actual write-start/completion evidence instead of fixed 30/160/40 ms delays and passes repeatedly and inside the full suite. | `CMG-00` | module architecture / controller fallback (`SKY-20250212UBG`) |
| `CMG-01` | P0 | `DONE 2026-08-20` | Frozen by `73672df`: the executable gift fixture produces one experience, three ordered progress points, one evolving role-memory summary, and stable Shopping/Wallet/Calendar/Phone owner-record references. Invalid, duplicate, dangling, out-of-order, or silently shortened evidence fails closed; no Store, storage, retention, or page behavior changed. | `CMG-00` | module architecture + Contacts/relationship + Event / PC-A (`SKY-20250212UBG`) |
| `CMG-02` | P0 | `DONE 2026-08-20` | Completed by `208e1dc`: Relationship facts/decisions, Event Instance V2 start/advance and owner facts, Mini Scene commit/presentation, and the Food Delivery address-interaction path now confirm persistence before reporting success. Failed writes restore pre-action owner state, keep the existing recovery surface active, and stable-ID retries do not duplicate committed records. Storage shapes and the 500/240/120 limits are unchanged. | `DCF-05`, `CMG-01` | module architecture + source owners / PC-A (`SKY-20250212UBG`) |
| `CMG-03` | P0 | `DONE 2026-08-20` | Completed by `86270d8`: role Chat now receives current relationship state exactly once from Relationship Runtime. Legacy System Store relationship stage/metrics and warm/conflict timestamps no longer enter the prompt; bounded Chat activity counters/timestamps remain, and Contacts relationship premise stays explicitly labelled profile context. | `CMG-01` | Contacts/relationship + Chat / PC-A (`SKY-20250212UBG`) |
| `CMG-04` | P0 | `DONE 2026-08-21` | Completed by `134f7f7`: explicit hospital and birthday disclosures now remain separately recallable, while a later clinic/hospital statement updates the same hospital memory and preserves every exact Chat message source. Unknown subjects stay separate rather than being guessed together; legacy `chat_disclosure__user_shared` records remain readable and unchanged. | `CMG-01`, `CMG-02`, `CMG-03` | Contacts/relationship + Chat / PC-A (`SKY-20250212UBG`) |
| `CMG-05` | P0 | `DONE 2026-08-21` | Completed by `d8662cb`: one gift order now carries one stable experience ID through Shopping, Chat, Reminder/Calendar, Wallet, Phone, and Relationship records. Reserved, delivered, and recipient-feedback progress updates one concise role memory; retries and supporting records do not stack relationship metrics. Legacy gift orders derive the ID on read, and existing `shopping_gift__*` memories remain in place and receive later progress without migration or deletion. | `CMG-01`, `CMG-02`, `CMG-03` | Contacts/relationship + commerce + Chat/Event / PC-A (`SKY-20250212UBG`) |
| `CMG-06` | P0 | `DONE 2026-08-21` | Completed in controller commit `f9f14f9` on the reserved Relationship Runtime/Contacts paths. The v2 carrier removes the global 500-event and 300-entity silent retention, reads v1 payloads through an explicit compatibility path, preserves save-failure rollback, adds page/offset memory projections and Contacts page/source controls, and keeps prompt output bounded by item/character budgets. Focused Runtime/Contacts coverage passes 31/31, Contacts E2E passes 1/1, full Vitest passes 301 files / 2129 tests, and lint, build, governance, and diff checks pass. Existing v1 payloads preserve every row they still contain; rows already discarded by older builds remain unrecoverable and are not claimed back. | `CMG-02`, `CMG-04`, `CMG-05` | module architecture + Contacts/relationship / PC-A |
| `CMG-07` | P0 | `DONE 2026-08-21` | Completed in behavior commit `d8b46fc` on the reserved Simulation/Event Runtime paths. Event Instance V2 no longer has a global 240-row writer slice; Simulation V7 accepts V1-V6 carriers, preserves active and terminal instances through 241+ rows, close/reopen, complete backup restore, and save-failure rollback, and keeps a long-running address-change Service Case inspectable. Focused Simulation/Event Runtime coverage passes 19/19 across 3 files; full Vitest passes 301 files / 2132 tests; lint, production build, governance, and `git diff --check` pass. Event logs, Owner Facts, Activity Session records, and Mini Scene's current 120-artifact behavior remain unchanged. | `CMG-01`, `CMG-02`, `CMG-05` | Event Runtime + commerce / PC-A |
| `CMG-08` | P0 | `TODO` | Split Mini Scene presentation from optional full-scene retention. Before calling a provider, the same occurrence/request must reopen the retained artifact; a new occurrence may generate a different artifact; explicit regeneration uses a new revision/request. A user choice to retain the complete scene creates a durable replayable artifact and a future management entry; declining it releases only the full presentation payload. Event results, approved role memories, and diary/timeline projections persist either way. Remove the historical 120-artifact silent truncation, use paging/filters for reading, allow explicit archive/delete of retained scenes without deleting canonical event history, and make retained-scene save failures visible and retryable. The current shell's commit-before-present behavior is transitional and must be covered by migration/rollback tests. | `CMG-02` | module architecture + Event Runtime / PC-B |
| `CMG-09` | P0 | `TODO` | Bound reading cost without deleting history: Contacts and World Hub page owner history, Chat reads one current relationship plus relevant role memories and active shared-experience summaries, and supporting records stay out of prompts unless specifically needed. Record prompt-size and list-performance tests. | `CMG-03` through `CMG-08` | module architecture + all consumers / PC-A |
| `CMG-10` | P0 | `TODO` | Close migration and recovery. Upgrade legacy rows without inventing links, report records that cannot be grouped, preserve current backup compatibility and rollback, and prove owner history above 500/240 and retained Mini Scene history above 120, save failure, reopen, restore, and the complete gift journey in focused and full tests. Previously truncated data is recoverable only from surviving owner records or backup and must not be claimed otherwise. | `CMG-06` through `CMG-09` | module architecture / controller PC |
| `DCF-01` | P1 | `DONE 2026-08-21` | Completed by `4654e02`: WorldBook navigation now preserves all string-valued query-array entry IDs, then trims, de-duplicates, and applies the existing eight-ID cap. Direct navigation/model coverage passes 20/20; WorldBook Chromium route coverage passes 8/8 across desktop and simulated mobile. Changed-file ESLint, production build, governance, and `git diff --check` pass. Full Vitest passes 300/301 files and 2135/2136 tests; the only failure is the tracked `DCF-06` image-bed publishing timeout. Full lint remains blocked by the unrelated generated `output/**/download-selected-sources.mjs:150` empty block. | `CMG-00` | Chat + WorldBook / PC-B |
| `DCF-02` | P1 | `DONE 2026-08-21` | Completed by `8ff85c7`: Chat Appearance now accepts complete imported CSS through the 20,000-character supported limit and rejects larger files with a visible size message, leaving the current draft, enabled state, and profile name unchanged. Focused Chat Appearance unit coverage passes 33/33; Chat Appearance Chromium E2E passes 3/3; changed-file ESLint, production build, governance, and `git diff --check` pass. Full Vitest passes 300/301 files and 2133/2134 tests; the only failure is the pre-existing tracked `DCF-06` image-bed tooling timeout. | `CMG-00` | Chat / PC-B |
| `DCF-03` | P1 | `DONE 2026-08-21` | Behavior integrated by `42742e5`; regression evidence `e9607c0` proves that ringtone preview remains available when system sound effects are off and becomes unavailable when ringtones are off. Preview and real incoming calls use the same `ringtoneEnabled` setting. No ringtone media, phone call-audio profile, keypad tones, or Calendar behavior changed. | `CMG-00` | Phone + Settings / PC-A (`SKY-20250212UBG`) |
| `DCF-04` | P1 | `DONE 2026-08-22` | Completed by `26534bd`: the incoming-call dialog receives focus when it opens, contains forward and reverse Tab movement across Decline/Accept, and restores the connected prior focus target after close. Existing ringtone and vibration behavior is unchanged. The focused Phone Playwright suite passes 4/4 across desktop Chromium and simulated mobile. | `CMG-00` | Phone / current PC |
| `DCF-06` | P1 | `DONE 2026-08-22` | Completed by `ec31855`: the former monolithic fallback/recovery test now exposes separate fallback-staging, unsafe-cleanup rejection, and verified-recovery phases; fixture setup uses two fewer Git processes and one staged-path query instead of two. The default timeout is unchanged. Focused coverage passes 15/15 in 2.52 seconds and full Vitest passes 302 files / 2165 tests. | `CMG-00` | module architecture / current PC |

Status and cross-PC execution rules:

1. `TODO` means no implementation is authorized by inference; `IN_PROGRESS` means the current package handoff records the executor PC label, branch, base commit, exact reserved paths, acceptance, and checks; `DONE` requires integrated code, validation, and a roadmap status update with date and evidence commit;
2. `READY_FOR_INTEGRATION_REVIEW` is a handoff state, not completion. Only the integration controller marks a ledger row `DONE` after reviewing and integrating the work;
3. PC-A is the suggested controller/core lane and PC-B is the suggested repair/Event/Mini Scene lane. The physical machine mapping is recorded before `CMG-01` or `DCF-05` starts and may change only through an explicit handoff update;
4. implementation workgroups do not edit this ledger concurrently. They return a commit and structured handoff; the controller serializes integration and status updates;
5. two PCs may work in parallel only when the controller records non-overlapping source/test path reservations and no dependency is open. Shared persistence, prompt, roadmap, and package-handoff files are serialized;
6. every new slice begins from the latest integrated commit. Do not copy changed files between PCs, do not infer completion from chat history, and do not start from an unpushed commit on another PC;
7. remote push remains a separate user-authorized synchronization action. Until the controller confirms the intended remote commit, the other PC must treat its older baseline as stale;
8. each completion handoff records task ID, user-visible result, base/source/integrated commit, exact files, validation, remaining risks, and confirmation that unrelated changes were preserved;
9. each behavior/shared-code slice runs lint, full Vitest, and build plus focused tests. User-facing routes add targeted Playwright; storage/schema slices add migration, failure-injection, reopen, backup/restore, and rollback coverage;
10. current unrelated dirty files or untracked experiments are never staged, reset, cleaned, or moved as part of this plan.

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

Reusable World Suite foundation landed on 2026-08-12:

1. `src/lib/world-suite-manifest.js` now defines a pure manifest/registry and idempotent install/update/uninstall plan for independently installable Book, WorldBook, profile-template, World Pack, Map, App Store, service-account, commerce, Event, Calendar, Music, Gallery, and future Mini Scene resources;
2. the manifest coordinates native owner IDs, versions, dependencies, update review, origin tracking, and history-safe uninstall only. Installation remains distinct from enablement/use, and each resource retains its native owner and standalone installation path;
3. `src/lib/world-suite-inventory.js` and `src/lib/world-suite-owner-adapters.js` now add a bounded durable installed-resource/origin inventory plus one execution Interface shared by Suite and independent catalog installation. Native truth is inspected before and after mutations, interrupted install/remove checkpoints can be repaired without repeating completed Owner mutations, partial batches retain completed/pending IDs, and current complete backup carries the inventory through the existing `user` section; legacy backups restore it empty;
4. `DONE 2026-08-12`: Book is the first production Owner Adapter. Independent Book Catalog install and later Suite install now share one native path; the manifest carries only catalog/native IDs and versions, while Book persists the actual asset plus explicit Catalog provenance. Existing built-in K-pop defaults and colliding user documents are never retroactively claimed;
5. the Book Adapter fails closed on missing/mismatched Catalog assets, read-only storage, capacity exhaustion, native-ID/resource-ID collisions, user edits, active or historical WorldBook references, and persistence failure. Catalog version is separate from Book edit version; pristine updates preserve Book-owned favorite/status/locked state; failed legacy or Repository writes roll in-memory truth back before the Suite inventory can advance;
6. the final K-pop Suite manifest, concrete WorldBook/App Store/commerce/Event/Calendar/Music mutation Owner Adapters, startup registration, activation UI, App Store/WorldBook presentation, and user-visible batch installation remain unimplemented;
7. future fantasy, post-apocalyptic, and other themes must reuse this same plan/inventory/Owner-Adapter flow rather than embed theme-specific installation logic;
8. `DONE 2026-08-12`: the reusable Map and Gallery Owner Adapters are complete. `src/lib/map-world-suite-inspection.js` plus the default production inspection composition retain an immutable read-only Interface over Map, Gallery, Event Runtime, and Chat evidence; `src/lib/map-world-suite-owner-adapter.js` adds separately constructed Catalog-backed `install/update/remove`; and `src/lib/gallery-world-suite-owner-adapter.js` plus `galleryStore.commitManagedAssetPackMutation()` give Gallery one native folder/URL-asset installation path with stable IDs, provenance, exact rollback, duplicate-ID/URL protection, and reference-safe update/removal. Map consumes an already installed Gallery asset ID and never owns or deletes Gallery material. Managed updates/removal fail closed for collisions, user edits, current or historical references, missing dependencies, native write failure, and Map topology replacement without an explicit migration. The default standalone Map inspection Adapter remains deliberately read-only and still reports `mutationAdapterAvailable: false` and `canInstall: false`.
9. `DONE 2026-08-12`: `src/lib/world-resource-catalog.js` now supplies one typed/versioned Book, Gallery, and Map Catalog seam, while `src/lib/map-gallery-world-suite-runtime.js` and `src/lib/production-world-suite-runtime.js` compose the verified Owner registry and product installation use cases. Suite and independent Catalog installation reuse the same native resources; dependencies install Gallery before Map and uninstall in reverse; every System inventory checkpoint requires a real persistence receipt; partial or lost checkpoints retry from native owner truth without duplicating completed mutations; and concurrent operations fail closed. The runtime registers no built-in K-pop manifest or Catalog content, has no startup caller or UI, and never activates WorldBook, binds a world/map, relocates a role, changes Journey state, or touches Contacts/Relationship Runtime truth. WorldBook/System mutation and Event Runtime remain later candidates because their current write paths combine activation/current-world or runtime-registration meaning.

Primary package for the promoted Book/WorldBook slice:

- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

### 4.8 Cross-Module Mini Scene / 小剧场

Status: `PARTIAL_DONE / AI_RUNTIME_AND_TEXT_SHELL_DONE_2026-08-19`

Architecture accepted on 2026-07-21:

1. one shared Mini Scene Module serves Event Runtime requests created after source-owned events occur; Calendar, Map, Chat, Agenda Journey, and future modules may later provide bounded event facts through separately reviewed source Adapters, but they do not author scenes;
2. each registered module has an explicit user mode: unconfigured/off, plain text, or interactive HTML; unconfigured behaves as off, and no Book, WorldBook, World Pack, caller, or world profile may silently change the user's choice;
3. source modules retain source truth, while Event Runtime owns trigger intent, eligibility, cooldown/caps, and request provenance; the Mini Scene Module owns request validation, AI-required structured artifact creation, world-profile resolution, transforms, presentation, and interaction audit;
4. Book will keep narrative rules and separate `structured_json` Mini Scene transform-profile assets. WorldBook narrative activation and Mini Scene profile binding remain separate choices;
5. World Pack may reference a reviewed profile as one optional grouped capability, but pure content is not repackaged, Book assets are not auto-enabled, and custom worlds do not require a World Pack;
6. regex is a bounded optional transform over validated structured fields, not a full-response parser, sanitizer, trigger engine, or code-execution path;
7. interactive output is a validated declarative document rendered by a sandboxed HTML Presenter Adapter with restrictive CSP and allowlisted interaction commands. Raw AI HTML and legacy Chat `htmlSnippet` remain inert;
8. every AI-generated artifact carries a plain-text representation. Missing providers, failed calls, or invalid drafts create no artifact; only a later interactive-renderer failure may downgrade an already validated artifact to its AI-generated text representation;
9. profile-declared content dimensions, including sensitive dimensions, begin unconfigured and require an explicit per-world/profile include/exclude choice; they never become a global filter or restrict user-authored/imported content;
10. retained Mini Scene artifacts and interaction state are durable optional presentation records; event results and approved memory/diary projections remain owner records regardless of full-scene retention, while prompts, raw provider responses, rendered iframe HTML, and failed drafts remain transient;
11. `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` owns the exact Interfaces, Book profile shape, world resolution, regex limits, presenter security, persistence prerequisites, delivery stages, tests, and stop conditions.

Delivery order:

1. `DONE`: architecture contract and cross-package routing only;
2. `DONE 2026-07-21`: pure request/draft/artifact/profile/module-policy schemas, empty-by-default dynamic module registry, deterministic profile resolver, Book structured-profile/regex validator, and 22 focused tests, with no runtime or UI;
3. `DONE 2026-08-19`: the separately authorized text baseline adds `store:mini-scene` V1, persistence inventory ownership, complete-backup v4 with integrity-checked v3 compatibility, rollback-safe restore ordering, canonical `legacy_single_world` request/binding identity, and dynamic registered-caller presentation policy;
4. `DONE SHELL 2026-08-19`: Event Runtime is the only functional registered caller. The provider-neutral generation path requires AI, accepts bounded event facts and optional narrative rules, validates an exact HTML-free Draft, records AI provider provenance, commits only valid artifacts, and fails closed without a deterministic substitute. The root Text Presenter supports copy/close, records a bounded `mini_scene.choose` owner-validation request, and returns to World Hub; global Settings controls only `unconfigured/off | text` presentation;
5. `TODO / SECURITY_REVIEW_REQUIRED`: sandboxed HTML Presenter Adapter and Book transform-profile editor/preview;
6. `TODO`: connect one real Event Runtime automatic/condition-trigger Adapter that builds the request from an existing Event Instance and source-owner facts, passes the configured AI provider, and validates any selected choice through the event/source owner. Calendar has no Mini Scene authoring fields, generator button, or registered caller;
7. `TODO`: profile-binding UI, custom/manual-world proof, and separately reviewed Map/Chat/event-source Adapters;
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
   - focused Playwright now proves the complete fresh-storage journey in desktop and simulated Pixel 5 Chromium, including bounded return context, preserved draft/thread, fake-provider smoke plus first reply, no page errors or horizontal overflow, no critical axe violations, and no rendered fake credential; a deployed Pages direct-provider model/connection/real-reply/reload check now covers the hosted-provider path, while installed-PWA and true-device proof remain in stage 4.
2. `P0 Current-save safety and complete local recovery` - `DONE 2026-08-09`, parallel architecture lane
   - `DONE 2026-07-22`: return structured persistence write results without breaking existing callers; local primary and mirror outcomes are independently observable;
   - `DONE 2026-07-22`: reconcile local/mirror freshness by lineage and sequence before Store mount, with bounded unavailable-IndexedDB startup, conflict zero-write behavior, verified repair, and the repository-owned legacy Book carrier explicitly inspect-only;
   - `DONE 2026-08-07`: surface structured sync/async and Book Repository failures through one product-level save-failed/read-only recovery state with retry, confirmed reload-current-save, and handoff to the existing complete-backup section; desktop and simulated Pixel 5 fault injection cover quota recovery, unresolved zero-write conflict, action sizing, containment, and overflow without changing persistence or backup formats;
   - `DONE 2026-08-07`: extend the accepted same-container read-only timeout across the current save. One page-level writer is acquired before reconciliation and Store mount; later pages inspect all 17 targets without repair, block layered sync/async/deferred mirror writes plus Book, Gallery binary, and image-generation device-local writes, and may retry only after the active page releases ownership. Focused Vitest and two-page Chromium prove cross-owner zero-write behavior, retry after release, and stale-head rejection without force takeover or last-write-wins;
   - `DONE 2026-08-09`: distinguish ordinary `active_writer` occupancy from a true save conflict, present later local/development pages as calm read-only previews, cooperatively release ownership on page exit, and use bounded release metadata to trigger the same safe retry automatically. Multiple waiting pages still promote at most one writer; persisted shapes, backup formats, force takeover, merge, and last-write-wins remain unchanged;
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
   - `PARTIAL_DONE 2026-08-09`: Dash Grill advances from a generic detail sheet to a shop-specific tray/order-ticket flow. The two featured combos now require a side and drink, expose option deltas, route quick-add into configuration, and persist distinct selection keys, localized labels, and chosen unit prices through restaurant-scoped Bag, checkout, backup, and Order detail. All ten built-in items now present accurate `zh-CN` by default and `en-US` with the system language, search across both built-in languages, and leave user-authored fields literal. Exact legacy seed wording migrates to the complete-meal contract without overwriting same-ID user edits. The two accepted `1024x1024` complete default-tray photographs are connected for the exact Sea-Salt Fries and Fountain Cola defaults; any changed side or drink returns the large media to the honest single-main image while the option map shows the selected components. Focused store/view tests pass. User visual acceptance remains pending, and the accepted ten single-item assets remain unchanged. This shop-depth slice does not complete the ordinary life-consequence flow;
   - `PARTIAL_DONE 2026-08-07`: Jade Hearth now presents its Chinese identity as `玉炉雅席` while keeping `Jade Hearth` in English, and all twelve built-in dishes follow system language through a presentation-only resolver that preserves user-authored records. The connected Home/Menu/Feast/detail candidate replaces generic square cards and round-plus actions with one integrated paper-banquet-menu hierarchy: real chapters, stable dish sequence, vertical title slips, vessel-aware media, rectangular `添菜 / Add dish` columns, shared/solo feast suggestions, and a sticky quantity/total action. Overflow rails expose visible scrollbars and support touch, wheel/trackpad, pointer drag, arrow controls, and keyboard navigation. Existing accepted Hero and twelve-product media remain unchanged; user visual acceptance and named physical-device proof remain pending. This shop-depth slice does not complete the ordinary life-consequence flow;
   - `DONE 2026-08-03`: Peach Cloud removed the detached carousel arrow group and moved previous/next actions into `48px` hit zones on each poster's left and right edges across Home and Discover/New. White Peach Lime and Waxberry Lychee posters now open distinct route-driven long campaign pages instead of immediately opening the quantity sheet; each page uses one accepted `1024x1536` text-free Hero plus two accepted `1536x1024` story images, localized editorial copy, Wallet-following price, and an explicit quantity CTA into the existing detail/cart runtime. The mascot poster still opens Merch, whose existing campaign image and navigation remain unchanged while direct editorial copy replaces the old left solid-color mask. Six accepted WebPs expand the formal Peach Cloud pack from `33` to `39` files; exact CLI prompts, references, candidates, masters, and acceptance decisions remain under `output/imagegen/peach-cloud-campaign-pages/`. Focused Vitest and desktop/mobile Playwright plus manual `393x851` review cover route separation, media decode, subject framing, CTA behavior, Merch Hero treatment, console state, and horizontal overflow. Named physical-device proof remains separate, and this campaign-depth milestone does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-01`: the previously placeholder-only `cafe_counter`, `convenience_shelf`, and `street_food_stall` options became reusable Food Delivery browsing structures, proven by Daylight Cafe, Sugar Lane, and River Noodles. They open a real first category without `All`, preserve the shared restaurant-scoped cart/checkout/order runtime, accept App Store identity overrides without source-brand leakage, and passed focused desktop Chromium plus simulated Pixel 5 review. River Noodles and Sugar Lane's media remained pending at this historical template milestone and are closed below; this template-library milestone does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-07`: River Noodles and Sugar Lane each received one `1200x750` cover plus nine `768x768` product PNGs generated through the user-selected bundled ImageGen CLI with `gpt-image-2` and separate shop capsules. Exact prompts, candidates, accepted masters, contact sheets, and acceptance records remain under `output/imagegen/river-noodles/` and `output/imagegen/sugar-lane/`; stable runtime copies close the recorded `20`-PNG gap. Focused desktop Chromium and simulated Pixel 5 Playwright verify local media dimensions, category switching, menu/detail rendering, App Store template reassignment, console state, and horizontal overflow. The shared detail control row now sits above loaded media so Close and Edit remain clickable. This is not named physical-device proof and does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-07`: Baemin menu batching resumed with Reverse Station Hanwoo Gukbap as the first complete five-image merchant family. Four distinct `gpt-image-2` / `high` CLI requests deliver the two-person kimchi beef hot pot, light beef-bone breakfast set, spicy shredded-beef hangover soup, and seafood kimchi pancake as accepted `768x768` local PNGs without replacing the existing signature pilot. Requests, untouched candidates, deterministic accepted exports, hashes, and the five-image contact sheet remain under `output/imagegen/baemin-platform/`; the current Baemin gap falls from `54` to `50`, plus the separately deferred delayed-state illustration. Focused desktop Chromium and simulated Pixel 5 verify all five menu images at their real merchant-page slots. This is not named physical-device proof and does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-07`: Sushi Hana is the second complete Baemin five-image merchant family. Four distinct `gpt-image-2` / `high` CLI requests deliver the pork-katsu bento, salmon-and-roe chirashi, seared-eel avocado roll, and red-miso clam soup in the accepted pale-ceramic, bamboo, blue-grey Japanese editorial capsule. The first eel-roll candidate remains rejected because it returned seven pieces; the accepted targeted retry has eight complete pieces. Exact requests, untouched candidates, deterministic `768x768` accepted exports, hashes, contact sheet, and review evidence remain under `output/imagegen/baemin-platform/`; the current Baemin gap falls from `50` to `46`, plus the separately deferred delayed-state illustration. Focused desktop Chromium and simulated Pixel 5 verify all five menu images at their real merchant-page slots. This is not named physical-device proof and does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-09`: the user-approved Baemin completion batch connects the remaining nine five-image merchant families, seven photography-merchant order marks, and seven accepted current order-flow illustrations without changing Food Delivery business behavior. Thirty-six menu candidates are promoted through an explicit selection manifest and deterministic `768x768` RGB exports; the V2 black-garlic boneless chicken is selected over rejected V3/V4 variants, the mistaken fries retouch remains excluded, and the corrected half-and-half wings resolve to Hwadeok Pizza. All eleven merchant directories now expose `menu-item-01..05`, while all eleven compact order identities resolve through four existing logo marks plus seven new true-alpha RGBA marks. Checkout, empty Orders, and placed/preparing/delivering/delivered/cancelled detail states now resolve their accepted `1024x1024` true-alpha illustrations and retain the diagnostic image only for load failures. Accepted and runtime hashes match. Platform-decoration review, existing-cover re-review, the deferred delayed-state illustration, and named physical-device proof remain separate;
   - `DONE 2026-08-01`: the user-selectable Food Delivery structure library expanded from four to six options. Harbor Roast now proves the dense `cafe_counter`; Daylight Cafe moved to the time-indexed `daypart_journal`; and the brand-neutral `menu_mosaic` adds a category atlas plus asymmetric product grid for future customization. Both new structures open the first real category without `All`, retain shared detail/cart/checkout/order ownership, and passed focused Vitest plus desktop Chromium and simulated Pixel 5 route/override/overflow review. Harbor Roast's later dedicated-facade and formal-media delivery does not change that reusable-template ownership, and this UI-template milestone does not complete the remaining cross-module life-consequence slice;
   - `DONE 2026-08-06`: one ordinary Shopping gift-card order is proven through its existing user-confirmed consequences. Focused Playwright creates the matching Chat service account explicitly, places a gift order for an existing role, verifies the source-owned order notification, confirms the delivery cue through Reminders into Calendar, completes the Shopping order, records the expense into Wallet, reopens Wallet Activity, and verifies the Shopping gift plus Wallet support fact as one Contacts memory. The same Shopping `orderId` anchors downstream lineage; Wallet support remains metric-neutral, reopen produces no duplicate transaction or memory fact, and desktop Chromium plus simulated Pixel 5 pass. No Chat identity or Wallet record is auto-created, no new ownership is introduced, and named physical-device proof is still pending;
   - `DONE 2026-08-07`: the user-promoted Wallet quote-explainability slice adds one general Activity transaction-detail path without broadening role-transfer receipt semantics. Saved Shopping/Food/other quote snapshots show source money, settled quoted money, exact recorded rate, `rateSetId`, rate source, and quote time without re-quotation; legacy, malformed, missing, deleted, and unavailable-currency states remain honest. Direct `transactionId` reopen, return cleanup, current-rate stability, account/card lineage, desktop Chromium, simulated Pixel 5, screenshots, and overflow are regression-covered. Mixed-currency settlement, refunds, broader Wallet expansion, and named physical-device proof remain separate;
   - `DONE 2026-08-09`: the user-promoted Wallet Activity search slice builds on the existing source filters without changing ledger or quote ownership. Search matches recorded title, counterparty, note, currency, source module/record, receipt, account/card lineage, and amount; it composes with Wallet/Chat/purchase filters, reports the current result count, clears explicitly, and distinguishes no-match from an empty category. Every result retains the same general transaction-detail path, and no historical amount or quote snapshot is recomputed. Focused component tests plus desktop Chromium and simulated Pixel 5 Playwright cover matching, combined filtering, empty/clear states, page/console errors, and horizontal overflow. Receipt sharing was a separate slice and is closed below; checkout payment selection and named physical-device proof remain separate;
   - `DONE 2026-08-09`: Wallet Activity now exposes a focused monthly-statement page backed only by retained ledger records. Available local calendar months are selectable newest-first; each month reports record count and separate income, spending, and net totals for every recorded currency without cross-currency aggregation or current-rate quotation. Monthly rows keep the general transaction-detail path, return to the selected statement month, and leave Activity-only delete and role-receipt actions out of the read-only statement surface. Empty history is explicit. Pure store tests, black-box view tests, and desktop Chromium plus simulated Pixel 5 Playwright cover month boundaries, multi-currency totals, negative net, month switching, empty state, detail return, console/page errors, and horizontal overflow. Receipt sharing was a separate slice and is closed below; formal statement export, checkout payment selection, and named physical-device proof remain separate;
   - `DONE 2026-08-09`: Wallet Home now exposes a focused verified-payee management path over retained role-account references. The list shows owner, institution, masked account, currency, and verification state; every active row enters the existing same-currency role-transfer confirmation with amount and note empty. Explicit `wallet_payees`, `chat`, and `activity` origins keep transfer and receipt returns honest without duplicating the ledger, receipt, balance, card-validation, or relationship-fact runtime. Empty state, list consistency, repeat transfer, route cleanup, desktop Chromium, simulated Pixel 5, console/page errors, and horizontal overflow are regression-covered. Receipt sharing was a separate slice and is closed below; checkout payment selection, formal statement export, and named physical-device proof remain separate;
   - `DONE 2026-08-09`: user-promoted Wallet receipt sharing reuses the bounded internal App-to-Chat draft instead of adding a second sharing runtime. A completed role-transfer receipt can be shared only after the user chooses a Chat conversation and confirms send; Chat stores a `wallet_receipt_share` snapshot and finalizes its route with the receiving conversation id. Opening the card restores the Wallet-owned receipt without changing ledger, amount, balance, relationship fact, or original `sourceChatId`, and return targets the receiving conversation even when the transfer originated in another thread. Activity reopen remains Wallet-local, cancel restores the exact source receipt, and desktop Chromium plus simulated Pixel 5 prove conversation A transfer -> conversation B share -> Wallet -> conversation B return with no horizontal overflow or page/console errors. This is internal App collaboration, not OS/PWA sharing, refund behavior, or mixed-currency settlement;
   - `DONE 2026-08-09`: configurable multi-screen Home release curation defaults normal use to three formal pages: Weather/Calendar/Music widgets plus Wallet/Appearance/Photos/Camera, then Phone/Map/Music/Calendar/Reminders/Shopping/Food Delivery, then System Status/Quick Heart/Quick Disc. Appearance lets users choose two through five visible pages; reducing the count hides trailing retained pages only and never changes their templates, slot placements, or content, while Home edit mode always shows all five pages. Network, Stock, Assets, and the duplicate formal-page App Store entry remain usable through App Store, Widget Center, Today View, or edit mode without appearing equally mature. Setup version 5 migrates only recognized earlier defaults, including the pre-Music release layout, while preserving customized layouts; focused unit and desktop/mobile Playwright cover migration, page count, route context, and App Store recovery.
    - `DONE 2026-08-10`: the user-promoted Shopping expansion replaces the thin shared catalog facade with three real-name Korean marketplace Apps (Coupang, 29CM, Kurly) and three real-name specialty-store Apps (WORKSOUT, IKEA Korea, OLIVE YOUNG). Stable service IDs preserve saved data while six canonical App routes, storefront templates, CLI-redrawn App Store brand icons, 24 bilingual fictional seed products, restrained brand-color reference, and six read-only Seoul setting anchors drive distinct storefront headers and layouts. Official storefront research informed logo identity, interaction, color, fulfillment, curation, and category grammar; no official catalog, product imagery, prices, advertising copy, branch claim, or affiliation is imported. The Home pseudo-folder is launcher-only, and its collapsed preview retains four independently rounded, spaced child icons instead of an edge-to-edge square mosaic. The Apps share one Shopping-owned schema, quote, backup, and persistence implementation underneath, while favorites, carts, checkout, order views, logistics, and downstream suggestions are scoped by `serviceKey`; there is no aggregate hub, in-App platform switcher, cross-App cart, or mixed checkout. Normal hydration adds only missing stable product IDs; explicit backup restore remains snapshot-faithful. Focused unit tests plus desktop Chromium and simulated Pixel 5 Playwright cover every App, setting anchors, search, isolation, checkout, console state, animation settling, and horizontal overflow. Formal product photography and named physical-device proof remain separate.
     - `DONE 2026-08-21 (local shell + interaction acceptance)`: all eleven Shopping storefronts expose independent local interaction grammar without changing Shopping ownership. The original six retain Coupang review/fulfillment confirmation, 29CM Objects/Lookbook + Issue Index, Kurly Chilled/Frozen/Ambient lane preview, WORKSOUT Drop/Lookbook, IKEA Blueprint/Sunlit/Night room tone, and OLIVE YOUNG AM/PM/Travel/Gift routine builder. The five extensions add TRADERS Pallet/List with member campaign wall and pack focus, CU Shelf/Quick Pickup with scene promos and pickup board, MUSINSA campaign wall/lookbook chapters, BOONTHESHOP buyer stories/material desk/fitting-room rail, and Galleria private campaigns/hall map/service strip. Component behavior is regression-covered in desktop Chromium and simulated Mobile Chrome; formal media packs, deeper authored campaign/editorial content, and named physical-device proof remain separate.
     - `DONE 2026-08-21 (local multi-page product acceptance)`: all eleven Shopping storefronts now own distinct route vocabularies and page families for Home, paginated Category/Collection, full PDP, Cart/Bag, Checkout Review, Orders, Order Detail, Logistics, and Service/Help while reusing the Shopping-owned transaction and persistence kernel. The old shared long-page Cart/Orders/Logistics DOM and generic checkout overlay are removed. Store-specific decision surfaces cover fulfillment, editorial selection, cold chain, size/fit, room measurements, routines, warehouse value, pickup, fitting, and concierge service. Focused Shopping lint and 85 related unit tests pass; the ten-case desktop Chromium plus simulated Mobile Chrome storefront suite passes, and the production build passes. Formal media packs, deeper campaign/editorial content routes, and named physical-device proof remain separate.
    - `DONE 2026-08-10`: the Food Delivery real-shop expansion adds five independent reality-anchored Seoul restaurant Apps: Myeongdong Kyoja, London Bagel Museum Anguk, Knotted Cheongdam, Kyochon Chicken Yeoksam No. 1, and EGGDROP Gangnam Woosung. Each retains a stable Food Delivery ID, four original menu items, an independent restaurant bag/order flow, additive normal hydration, snapshot-faithful backup restore, a dedicated runtime icon, and one stable Map `sourceId`. Home now renders Baemin plus fourteen shops as exactly 15 peer launchers on fixed `3 x 3` pages (`9 + 6`) with touch, pointer-drag, wheel/trackpad, keyboard, arrows, dots, reset/clamp, and underlying-Home gesture containment while preserving the collapsed four-icon preview. Thirteen reviewed `gpt-image-2` masters and compact runtime WebPs cover Baemin and shops lacking dedicated marks; Peach Cloud and Harbor Roast remain byte-identical. Map alone owns the five reviewed bilingual branch/address/coordinate records, extending current Seoul V1 from 101 to 106 places; Food Delivery owns no place mutation. Public research informed brand identity, cuisine category, branch, and address only; no official menu, product image, price, description, combination, campaign, advertising, or affiliation is imported. Focused Vitest passes 4 files / 146 tests, the dedicated desktop/simulated-Pixel-5 Home/Food/Map Playwright flow passes 4/4, and the existing geographic Seoul regression passes 2/2. Named physical-device evidence remains separate.
4. `P1 Hosted product proof` - `TODO`
   - observe the remote CI and Pages jobs for the exact release commit and verify external required-check/environment policy;
   - add deployed base-path, manifest/install, controlled online-to-offline relaunch, hosted-provider Chat, and complete backup export/import smoke evidence;
   - `PARTIAL_DONE 2026-08-09`: local desktop and simulated Pixel 5 automation prove rich-media type/size recovery, one-off/Gallery image rendering, and the first internal App collaboration flow. Map places, Music tracks, and Wallet role-transfer receipts support source-owned structured sharing through Chat recipient selection and explicit send/cancel; Map/Music also prove lock/reload recovery and quoting. Source return is exact: Music does not auto-play, Map does not change trip state, and a Wallet receipt returns to the conversation that received the card rather than the transaction's original Chat lineage. This is project-internal App collaboration, not an OS/PWA share target;
   - run a named true-device matrix for safe areas, browser chrome, keyboard/composer, touch, back navigation, file save/import, and PWA relaunch.
5. `P2 Post-preview depth` - `PARTIAL_DONE`
   - `PARTIAL_DONE 2026-08-19`: after the product-preview P0 gates, the user separately resumed the Mini Scene foundation. Persistence, AI-required generation, global text presentation, and Event Runtime caller contracts are landed; a production event-trigger Adapter and interactive HTML remain separately gated;
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
- `ACCEPTED FOLLOW-UP 2026-08-11`: add an explicit personal image-bed storage action for Gallery. It uses a device-local scoped token, uploads to the owner's `schatphone-user/` prefix, and admits the returned HTTPS URL without retaining a second local binary. It is separate from ordinary local `Keep`, never uploads silently, and requires a link-accessibility warning until private authenticated media is implemented;
- prompt-assistant management UI, hosted proxy security/deployment, true-device validation, and opt-in hosted-provider smoke.

Primary packages:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md` for shared contracts, persistence, credentials, backup, and adapters;
- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md` for Camera entry ownership, capture IA, settings hierarchy, and responsive acceptance.

Focused contract and remaining inventory:

- `docs/architecture/CAMERA_GALLERY_IMAGE_GENERATION_ARCHITECTURE_PLAN.md`;
- `docs/architecture/CAMERA_GALLERY_IMAGE_GENERATION_TODO.md`.

### 4.11 Local Narrative Map Packs And Journey Exploration

Status: `PARTIAL_DONE / MJE-1_MJE-2_MJE-4_INTEGRATED / MJE-3_ADAPTER_RETAINED_PRODUCTION_TRIGGER_SUSPENDED`

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
16. added a separate place-media V1 registry without changing the 106 canonical Seoul place records. Thirteen Seoul places now have reviewed licensed photography: the first seven-place pilot plus six overview heroes and eighteen detail-gallery slides for six additional places. The detail card supports button, keyboard, and touch navigation while keeping per-slide exact-place versus area-atmosphere truth, author/source/license/change attribution, and a non-evidentiary category fallback for fictional, player, missing, or failed media. Generated reconstruction remains schema-supported but unused.

Approved Journey / Footprints / Exploration direction:

- Map remains the player entry and source owner for known-destination journeys and active area exploration; the Map Journey Runtime is a Map-owned domain service, not a separate app.
- transport choice belongs to journey planning. A separate Transit app is deferred until a static or live network has meaningful independent browsing, schedule/ticket/vehicle, authoring, or progression use.
- the current `Explore` points, route familiarity, area unlocks, and static feedback are the passive `Footprints` foundation. They are not yet active exploration and must not be deleted when the IA is corrected.
- journey events remain checkpoint-driven, but the generic MJE-3 route obstruction is no longer production-enabled. Its adapter and exact-lineage/no-event/recovery tests remain as compatibility evidence. A future replacement must name the affected actor, transport-specific capability, actionable response, and owner-native consequence before Map enables it.
- an ordinary journey with no event remains a supported outcome.

Execution order and live status:

1. `MJE-1 USER_ACCEPTED / IMPLEMENTED_IN_CURRENT_TREE`: explicit transport selection, mode-aware estimates, active/history transport snapshots, backup/restore, and legacy compatibility are implemented and user-accepted. The current physical tree remains uncommitted and this status does not claim an integrated commit.
2. `MJE-2 USER_ACCEPTED / IMPLEMENTED_IN_CURRENT_TREE`: the user accepted the versioned Map-owned active-journey lifecycle, small deterministic duration-based checkpoint plan, and safe pause/resume with timer and arrival-push correction by explicitly authorizing MJE-3. The ordinary uneventful completion path, existing `idle` / `traveling` / `arrived` compatibility, transport snapshots, reminders, familiarity, rewards, relationship lineage, and backup/restore remain covered. This does not claim an integrated commit.
3. `MJE-3 TECHNICAL_ADAPTER_RETAINED / PRODUCTION_TRIGGER_SUSPENDED 2026-08-15`: the first low-impact Map checkpoint adapter remains bounded to completed `en_route` and `near_arrival` checkpoints, with Event Runtime owning eligibility/provenance/audit and Map validating exact lineage. Later product review rejected the generic temporary-obstruction presentation because it did not establish the affected actor, transport-specific action, or downstream schedule consequence. Production Map mounting now disables evaluation; deterministic compatibility tests retain the legacy no-ETA-change and bounded-120-second paths. This does not authorize destination changes, traffic claims, or MJE-5.
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

Status: `PARTIAL_DONE / CALENDAR_DEPARTURE_READINESS_V1_DONE 2026-08-15 / CJA-1_DONE 2026-08-15 / CJA-2_DONE 2026-08-16 / CJA-3_DONE 2026-08-16 / CJA-4_DONE 2026-08-16 / CJA-5_DONE 2026-08-16 / CJA-6A_CONTRACT_DONE 2026-08-17`

Accepted product and ownership direction:

- `日历 / Calendar` remains a visible Home app and the canonical owner of confirmed long-range schedule/date facts. CJA-1 now provides `Month`, `Week`, and `Agenda / 日程` over the same Calendar-owned events; `日程` is a Calendar view, not another long-range planning app.
- Calendar storage V3 supports explicit start/end ranges, all-day and multi-day events, recurrence, required/optional participation, notes, reminder lead time, and an optional stable Map-owned `locationRef`, with V1/V2 migration and no inferred destination identity.
- the user-facing `行程 / Agenda Journey` app owns today's and the near-term execution plan, travel/activity steps, completion/miss/skip/cancel state, evidence references, and outcome summaries. It is distinct from Map Journey.
- the hidden `Schedule Orchestrator / 时间编排模块` materializes confirmed near-term Calendar commitments into Agenda Journey instances and reconciles deadlines. It links stable IDs and cannot become a Home app or a new owner of copied downstream records.
- an Agenda Journey step may request a Map Journey or an Activity Session. Map arrival is valid travel/presence evidence but cannot prove that a rehearsal, broadcast, performance, class, or meeting was completed.
- Calendar owns the appointment start, duration, and destination. Recommended departure is recalculated from the canonical current Map position; the planning origin is only a hint. Explicit confirmation creates one linked Map Journey, and opening Map reuses that same journey instead of asking the user to plan it again.
- the landed departure-readiness V1 implements that bounded Calendar-to-Map seam in the selected Calendar event detail: Map derives the exact current-origin estimate and lateness from the occurrence time and stable destination, and explicit `Leave now` creates or reuses one Journey carrying the source Calendar event ID.
- CJA-1 adds Calendar information architecture and authoring. CJA-2 adds the separate hidden Schedule Orchestrator owner. CJA-3 consumes its bounded requests into one persisted Agenda Journey owner and visible app without adding Activity Session, appointment auto-entry, or Event Runtime participation.
- CJA-3 keeps travel and activity as separate steps: explicit departure starts or reuses one Map-owned journey carrying `sourceAgendaJourneyStepId`; validated arrival completes only the travel step and unlocks the activity, which still requires explicit start and completion or skip.
- validated linked arrival may unlock or, for an explicitly approved indoor appointment, enter the destination place session. Arrival and entry remain presence evidence only; Activity Session owns timing and an explicit completion policy.
- Activity Session uses absolute timestamps and explicit checkpoints. Minimizing or navigating inside SchatPhone does not stop it; application suspension is reconciled on resume. A closed or OS-suspended browser/PWA cannot promise an exact interactive popup.
- `Focus Companion` is an optional Activity Session presentation, with Pomodoro as one preset rather than a separate event system. It may reference Gallery backgrounds, Music/ambient playback, or a decorative companion without copying those owners' assets or creating a second clock for a Map-owned long journey.
- Event Runtime owns eligibility, deterministic/random gates, cooldown/cap, proposal/review, and audit. Turning Mini Scene presentation `off` suppresses the popup but does not disable event eligibility; only policy-approved low-impact outcomes may auto-resolve, while high-impact effects retain owner confirmation/review.
- module event permission, random-event intensity, and presentation mode are independent controls. Optional events may enrich an activity checkpoint, but the base scheduled activity must remain startable and completable without them.
- a future Story/Diary/Journal surface may consume a bounded `Narrative Timeline` projection. CJA-6A approves only the read-only contract and bounded AI-context rules; its product name, route, persistence owner, retention policy, review model, and implementation remain unapproved.

Execution order and live status:

0. `CALENDAR DEPARTURE READINESS V1 DONE 2026-08-15`: stable optional `locationRef` with V1 migration, current-origin and transport-specific projection, predicted lateness, explicit unique Map Journey creation/reuse, active-journey conflict handling, and Calendar return context are implemented in the existing owners. Focused unit/view coverage and desktop/simulated Pixel 5 Playwright protect the vertical; no physical-device evidence is claimed.
1. `CJA-0 DONE / DOCUMENTATION_ONLY`: freeze terminology, ownership, frontend reality/target, cross-module references, background timing limits, automatic-resolution policy, and stop conditions.
2. `CJA-1 DONE 2026-08-15`: Calendar storage V3, V1/V2 migration, Month/Week/Agenda views, Monday-first 42-day month grid, selected-day and selected-event detail, all-day/multi-day/recurring occurrence projection, complete manual create/edit/delete, reminder-lead scheduling, stable Map place selection, and occurrence-aware departure preparation are implemented. Focused Calendar tests pass 10 files / 35 tests; Calendar plus Map focused Playwright passes 6/6 across desktop Chromium and simulated Pixel 5 with default/zen presentation, critical Axe, page-error, and zero-horizontal-overflow checks. No physical-device proof is claimed.
3. `CJA-2 DONE 2026-08-16`: a pure Schedule Orchestrator Interface and hidden schema-V1 owner now create deterministic Calendar-occurrence materialization requests, refresh changed occurrences, retire removed/replaced occurrences, request required-work deadline evaluation once per Calendar revision, and reconcile on startup, Calendar changes, timer wake, page resume, and visibility return. The owner persists only stable IDs, occurrence timing, fingerprints, request acknowledgements, and optional Agenda Journey links after downstream acknowledgement; its backup is nested in the existing Calendar section, while older backups without that child restore an empty owner state. CJA-2 itself creates no visible app, Agenda Journey record, automatic departure, activity completion, or downstream effect.
4. `CJA-3 DONE 2026-08-16`: schema-V1 `store:agenda-journey`, a separate `/agenda-journey` Home/App Store entry, Calendar-occurrence materialization, manual plans within the next 14 days, explicit required/optional execution, travel/activity separation, deadline/source-retirement reconciliation, backup/restore, and one stable Map Journey link per travel step are implemented. Map retains route/current-position/arrival truth and stores only `sourceAgendaJourneyStepId`; arrival unlocks but never completes the activity. The app provides today/upcoming/in-progress/finished views, current-origin transport estimates, explicit departure, activity start/complete/skip/cancel, accessible desktop/mobile layouts, return context, and zero-horizontal-overflow coverage. No random event, Activity Session, auto-entry, Narrative Timeline, or physical-device claim is included.
5. `CJA-4 DONE 2026-08-16`: schema-V1 `store:activity-session` now owns one deterministic session per Agenda Journey activity step, absolute `startedAt` / `endsAt` timing, bounded pause/resume, deterministic checkpoints, `duration_sufficient` or `user_confirmation` completion policy, startup/visibility/reopen reconciliation, nested Calendar backup compatibility, and exact owner acknowledgement. The Agenda Journey execution detail hosts a quiet built-in Focus Companion with pause/resume, minimize/reopen, explicit completion, accessibility, text fitting, and zero-horizontal-overflow coverage. Travel steps and Map-owned clocks fail closed; no Event Runtime, appointment auto-entry, Gallery/Music caller, richer companion state, exact closed-app popup, or physical-device claim is included. Focused CJA-4 and persistence coverage passes 9 files / 65 tests; the bounded two-worker full suite passes 287 files / 2037 tests; desktop Chromium plus simulated Pixel 5 Agenda/Activity Playwright passes 4/4.
6. `CJA-5 DONE 2026-08-16`: Activity Session storage V2 and Simulation storage V6 add one durable midpoint-only `activity_session.focus_reset.v1` collaboration. Event Runtime evaluates exactly once from a bounded processed checkpoint snapshot, preserves durable `no_event | pending | resolved | failed` truth, applies permission/Surprise Mode/deterministic random/cooldown/cap gates, and keeps module permission independent from `off | text` presentation. `off` creates no popup and owner-validates automatic `keep_rhythm`; `text` renders only inside Focus Companion and offers allowlisted `keep_rhythm` or `add_recovery_buffer`, where Activity Session alone may add a 2-minute timer buffer. Stale, terminal, disabled, missed, restored, duplicate, and no-event paths fail closed without blocking the base activity or creating a second clock. Interactive HTML, Mini Scene, high-impact effects, appointment auto-entry, and Gallery/Music callers remain unimplemented. Focused CJA-5/persistence coverage passes 10 files / 66 tests; the bounded two-worker full suite passes 290 files / 2047 tests; desktop Chromium plus simulated Pixel 5 Activity Session Playwright passes 4/4 with critical Axe, page-error, refresh-idempotence, text-fit, and zero-horizontal-overflow checks. No physical-device evidence is claimed.
7. `CJA-6A DONE 2026-08-17`: documentation-only Narrative Timeline contract. It defines owner-confirmed summaries, typed `sourceRefs`, stale/deleted/unauthorized-source fail-closed behavior, and bounded read-only Forum/Chat AI-context rules. It creates no store, route, backup section, migration, or visible App.
8. `CJA-6B TODO / SEPARATE_DECISION`: implement the projection only after the visible product, persistence owner, retention, review, migration, and backup contracts are approved.

Focused architecture and product decision:

- `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md`
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`

This lane does not modify or block roadmap 4.11 Map Journey work. MJE stages remain owned and reviewed separately.

### 4.13 Music App And User-Owned Provider Playback

Status: `PARTIAL_DONE / CHKSZ_PRIMARY_RADIO_BROWSER_LOCAL_AND_MAP_MEDIA_INTEGRATED_LOCAL`

Promoted first slice completed on 2026-08-09:

1. added `/music` as a Home/App Store installed app with a listening-first record-library identity rather than a Settings or administration surface;
2. added Listen Now, Browse, Library, favorites, recent tracks, playlists, search, queue, shuffle/repeat, seek, volume, expanded Now Playing, and a live Home Music widget;
3. added real browser `Audio` playback, Media Session support, and a shell mini-player that preserves the active session across unlocked routes while clearing Home and app-owned bottom controls;
4. added user-configurable GET/POST JSON music APIs with endpoint/search path, auth mode, query/limit fields, result path, response-field mapping, relative URL normalization, connection testing, and playable-URL detection;
5. normalized public Music library/provider/integration state under `systemStore.settings.music`, required it through the existing `system-settings` backup section, and separately inventoried `schatphone:music:credentials` as a device-local secret excluded from plaintext backup;
6. added stable Chat/Map integration requests, capability discovery, share/now-playing projections, and explicit gesture/confirmation boundaries without changing current Chat or Map business behavior;
7. added app icon, app skin, scoped-CSS, custom-widget action, notification-presentation, App Store, Home migration, contract/store/view/persistence tests, and targeted desktop/simulated-mobile Playwright coverage for both default and zen themes.

Dedicated ChKSz follow-up integrated locally on 2026-08-09:

8. added a preset Adapter for NetEase, QQ, and Kugou search without requiring endpoint paths or response mappings;
9. added click-to-resolve playback so ChKSz search/library/queue records retain stable source references while expiring stream URLs remain runtime-only; ChKSz is the primary user-authorized online source, and resolved URLs may be reused in memory for up to 7 days while provider-declared expiry shortens that window with a 5-minute safety margin;
10. added device-local query-parameter authentication, Key-redacted errors, `401/402/403/429/503` handling, quota headers, and one bounded `Retry-After` retry;
11. added NetEase lyrics and explicit playlist-ID import inside consumer Music surfaces, while leaving QQ member Cookie unsupported;
12. added focused Adapter/Store/View tests plus desktop and simulated-mobile browser coverage for search, resolve, lyrics, import, quota display, secret visibility, and overflow.

Music-owned intake follow-up integrated locally on 2026-08-09:

13. added `Music Settings -> Add Music` as an IA peer of `Music Sources`, with URL and Local Files modes kept out of Library and separate from Gallery/image resources;
14. added validated direct HTTPS audio URLs plus multi-file local audio import, compact imported-song management, real playback, missing-file feedback, and deletion of Music-owned metadata/binaries/references;
15. added the independently inventoried `schatphone-music-media` IndexedDB carrier, runtime-only object URLs with explicit revocation, device-local backup exclusion for imported binaries, focused contract/Store/View/inventory tests, and desktop/simulated-mobile Playwright coverage.

Active-journey Map media follow-up integrated locally on 2026-08-09:

16. added a traveling/paused-only Map music/radio button and focused bottom panel with bounded now-playing, quick-track, transport, and three deterministic library-backed station projections;
17. kept queue construction, radio loops, provider/local-file resolution, browser Audio, credentials, source URLs, and floating-player state inside Music; Map never receives raw queue contents, stream URLs, local media IDs, endpoints, headers, or API keys;
18. promoted the shell mini-player into a Music-owned collapsed/expanded/dismissible global floating player that coexists beneath the Map panel, survives Map-panel close and journey exit, preserves Map/Home return context, and stays dismissed across automatic ended-to-next transitions;
19. added focused contract/Store/View tests and desktop/simulated Pixel 5 Playwright coverage for journey-only entry, radio activation, panel/float coexistence, layer order, dismissal, Music return, page errors, and horizontal overflow.
20. added a no-key Radio Browser preset under `Music Sources`, with a fixed public endpoint, healthy HTTPS/MP3 station filtering, station-field normalization, live-radio labeling, and desktop/simulated-mobile search-to-playback coverage; Map's existing library-backed journey stations remain unchanged.
21. tightened the non-Chat global floating player into a compact right-side capsule with track identity, play/pause, expand, and dismiss, while keeping skip, quick-track/radio, and explicit order/repeat-all/repeat-one/shuffle policy in the expanded state. Phone Now Playing now exposes the same playback-policy entry instead of hiding it behind desktop-only controls; order mode automatically advances and stops at the queue boundary, while browser-gated page-load autoplay remains outside the product promise.

Current local-intake evidence passes 33 focused contract/Store/View/persistence tests, the full 217-file / 1549-test Vitest suite, lint, production build, governance and diff checks, 8 Music Playwright cases across desktop and simulated mobile, the 12-case default/zen visual gate, and direct browser inspection at desktop and 393 x 852 with no document or settings-panel overflow.

Current Music plus active-journey Map media and Radio Browser evidence passes the full 217-file / 1559-test Vitest suite, lint, production build, governance and diff checks, and 12 focused Music/Map Playwright cases across desktop and simulated Pixel 5. Radio Browser's public search endpoint returned HTTP 200 with wildcard CORS during direct inspection; the prior 12-case default/zen visual gate remains green.

The 2026-08-22 ChKSz primary-source cache follow-up passes 4 focused Music files / 52 tests, lint, the full 303-file / 2175-test Vitest suite, production build across 594 modules with only the existing chunk-size warning, governance at 2 files / 14 tests, all 12 `music-app.spec.js` desktop/simulated-Pixel-5 cases, and `git diff --check`. It extends memory-only same-track URL reuse from 24 hours to an expiry-aware ceiling of 7 days, recognizes absolute URL expiry plus absolute/relative response expiry, applies a 5-minute safety margin, and preserves automatic invalidation with at most one provider re-resolution.

The 2026-08-22 ChKSz access-diagnosis and quality-fallback follow-up passes 4 focused Music files / 61 tests, lint, the full 303-file / 2186-test Vitest suite, production build across 594 modules with only the existing chunk-size warning, governance at 2 files / 14 tests, all 12 `music-app.spec.js` desktop/simulated-Pixel-5 cases, the 16-case visual gate, and `git diff --check`. Search normalizes bounded QQ `pay` and NetEase `fee`/availability hints into `VIP`, `Purchase`, or `Limited` labels without disabling Play. If a selected high quality returns no URL or an explicit quality/format error, NetEase retries once at `standard` and QQ/Kugou once at `mp3`; the saved preference does not change, and authentication, quota, rate-limit, provider-unavailable HTTP, cancellation, and network failures do not trigger fallback. The existing cached-stream invalidation still performs at most one provider re-resolution, so the combined worst-case provider path is fixed at four requests rather than an open retry loop. Desktop 1280 x 800 and simulated Pixel 5 inspection confirms zero horizontal overflow plus the existing 78 px bottom-nav and 7.17 px gesture clearance. Real-key provider-rights behavior remains an opt-in external gate rather than a completion claim.

The 2026-08-22 compact-player and playback-policy follow-up passes 2 focused Music files / 40 tests, lint, the full 303-file / 2187-test Vitest suite, production build across 594 modules with only the existing chunk-size warning, governance at 2 files / 14 tests, 14 focused Music/Map Playwright cases across desktop Chromium and simulated Pixel 5, the 16-case visual gate, and `git diff --check`. Direct 393 x 852 inspection confirms the 252 px collapsed capsule, approximately 16.5 px Home-Dock clearance, 369 px expanded surface, visible phone Now Playing mode entry, successful order/repeat-all/repeat-one switching, and zero horizontal overflow. Initial autoplay without a user gesture, real-key provider-rights behavior, and true-device safe-area/media behavior remain separate gates.

Acceptance boundary:

- the app can play built-in samples, generic results with usable browser audio URLs, and ChKSz results that successfully resolve at the user's Play action;
- users can add a stable HTTPS audio URL or import supported local audio files from Music Settings; local binaries remain in Music-owned device storage and never enter Gallery;
- provider licensing, CORS, mixed-content, expiring signed URLs, DRM, cookies, proprietary signing, and byte-range behavior remain provider/browser constraints;
- cross-module projections never include API keys, endpoints, headers, raw responses, queue contents, or stream URLs;
- external route requests cannot directly start playback, while Map's active-journey panel may delegate only an explicit user click to Music-owned actions; queue requests remain behind Music policy plus user confirmation.

Remaining stages are separately gated:

- opt-in smoke against ChKSz with a real user-authorized device Key and playable track, including rights, CORS, quota, and expiring-URL behavior;
- true-device audio focus/interruption, headset or lock controls, safe areas, keyboard, and PWA relaunch proof;
- optional local-audio backup packaging and a same-track relink flow; restored metadata currently reports a missing local file and requires re-import;
- Chat search UI and external Map queue-request consumers;
- provider-specific OAuth, signed-stream, DRM, QQ Cookie, non-NetEase lyrics/playlist import, cast, download/offline, or hosted-proxy contracts.

Primary packages:

- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md` for installed-app identity, Home/App Store entry, Now Playing, floating-player, and Map-panel acceptance;
- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md` for provider, playback, persistence, credential, backup, and Chat/Map Interface boundaries.

Focused contract:

- `docs/architecture/MUSIC_MODULE_CONTRACT.md`.

### 4.14 Cross-Module Event Experience And Map Event Cards

Status: `P1 PARTIAL_DONE / EVE-0 DONE / EVE-1 DONE / EVE-2A DONE / EVE-2B DONE / EVE-2C DONE 2026-08-10 / EVE-3 DONE / EVE-4A TECHNICAL_SPIKE_COMPLETE / PRODUCT_ACCEPTANCE_WITHDRAWN / EVE-4B REFERENCE_VERTICAL_DONE 2026-08-14 / EVE-4C DONE 2026-08-14 / PLAYER_CONTEXT_V1_FOUNDATION_DONE 2026-08-15 / CHAT_ROLE_GREETING_CONTINUITY_DONE 2026-08-18 / CHAT_DISCLOSURE_SUPPORTING_FACT_DONE 2026-08-18 / CHAT_AI_DISCLOSURE_CANDIDATE_PARSER_DONE 2026-08-18 / EVENT_REASON_COPY_AND_FEEDBACK_MAINTENANCE_DONE 2026-08-26`

Accepted product and entry direction on 2026-08-10:

1. Event is an important cross-module product family, but it does not receive an ordinary Home/Desktop app like Chat or Map.
2. Event Runtime remains the hidden coordination Module for eligibility, deterministic/random gates, cooldowns, caps, proposals, provenance, review state, and logs.
3. event consequences appear through owner-native messages, order/status changes, calls, posts, information flows, journeys, Map encounters, optional host cards, or later Mini Scenes. A Module can participate in an event chain without registering an Event Surface.
4. ordinary Map pin selection opens the Map-owned place-focus sheet, not an Event Runtime card. It provides `Go` for idle remote places, existing-journey reuse while travel is locked, `Enter` at a coordinate-matched stable current place, contextual `Leave` while inside, and progressive Details/Share/player-owned Manage without a permanent Event placeholder.
5. immediate relocation remains a sandbox action that skips travel and records `manual` evidence without creating a Map Journey. Only the internal completed-journey path records `journey_arrival`; public manual movement cannot forge it. `Enter` creates or resumes a Map-owned place session rather than directly starting an event.
6. a place focus shows an event invitation only when Event Runtime provides an eligible event or an approved locked teaser. Location-aware templates retain an authored activation scope such as `remote`, `nearby`, `onsite`, `interior`, `journey_checkpoint`, or later `activity_checkpoint`; distance may affect eligibility but cannot convert one scope into another.
7. Map is the first registered large-surface host. The single approved production-arrival-briefing family presents a compact invitation or stacked provider-neutral event pin in the existing Map UI with an explicit expansion command.
8. Map owns geographic/canvas anchor validation, card placement, clustering/stacking, selection, layer coexistence, place relation/session state, position provenance, and return context. It does not own the event proposal/log or another module's source record/effect.
9. an event coordinate cannot silently create a place, change knowledge/visibility, move a role or journey, or authorize an outcome.
10. `World Hub / 世界中枢` is the existing integrated hidden-by-default entry for event history, pending review, explanations, event-scoped notes, and bounded correction. Ordinary reminders and confirmed plans remain Reminders/Calendar data.
11. `Cheats / 金手指` may share the hidden utility area, selected-event context, and audit format, but remains a separately unlocked privileged Module with separate write Interfaces and undo/recompute policy.
12. richer event expansion may later use the shared Mini Scene Interface, but EVE-1/EVE-2 do not authorize Mini Scene persistence, Settings, Presenter, regex, or HTML runtime.
13. the first product content pack targets the current modern K-pop realism world, while reusable event templates, place capabilities, instance lifecycle, choice/effect requests, and engine logic remain world-neutral.
14. V1 runtime AI is optional and text-only after local eligibility plus an approved explicit event-entry/presentation checkpoint. Ordinary ticks, distance updates, place focus, eligibility filtering, and compact invitations remain local and zero-token; local K-pop variants are the required offline/provider-failure fallback.
15. location/scene imagery primarily follows Map/world asset packs. Event Runtime stores stable references and minimal semantic media intent only. Later CG remains a separate image-generation/media-resolution Adapter with independent permission, cost, privacy, candidate retention, and failure policy.
16. `DEFERRED / EVENT_CONTRACT_REQUIRED`: a direct Map restaurant-place shortcut into a Food Delivery storefront, menu, dine-in, pickup, or order flow is not a current implementation target. Existing stable Map place IDs and Food Delivery `sourceId` links remain context-only. Any future onsite-consumption flow requires a separately accepted place-session event contract naming activation scope, the Map Place Session checkpoint, Event Runtime eligibility/projection, a Food Delivery-owned Adapter action, the visible host surface, order/payment side effects, and return behavior. This decision does not promote EVE-3, EVE-4, or EVE-5.
17. `ACCEPTED 2026-08-14 / USER_INITIATED_COMMERCE_INTERACTION`: order-related commerce service events begin only after an explicit user interaction in the owner App or a registered Chat service account with valid owner context. Native support behavior opens first; model classification may propose a recipe but cannot infer human intent or mutate business truth. Food Delivery/Shopping own orders and Service Cases, Chat owns messages and service-account bindings, Phone owns call/transcript/resolution proposals, Map owns journey/ETA/reroute, Wallet owns settlement, and Event Runtime owns generic fact-driven progression, persisted decisions/deadlines, owner requests, provenance, and audit.
18. The implemented EVE-4B pickup-time random trigger and `foodDeliveryCausalChains` are reference/migration inputs, not the final reusable Interface. EVE-4C requires versioned shared Interfaces and a generic Event Instance V2 or compatible versioned extension; Event Instance V1 remains frozen for EVE-2A/2B/2C. Ordinary commerce messaging, Service Cases, address editing, Map ETA/reroute, Wallet settlement, and Phone sessions must remain functional with optional events disabled.
19. `PLAYER_CONTEXT_V1_FOUNDATION_DONE 2026-08-15`: Contacts Self Profile now persists a monotonic profile revision and may supply a bounded read-only K-pop identity snapshot from exact world/template/version evidence. V1 reads only manual `public` / matching-world `world_specific` values for the template-declared `occupation`, `affiliation`, and `public_identity` allowlist; it deterministically proves manager or public-idol family eligibility and stores only body-free owner references. Volatile player values remain with their natural owners or a separately justified minimal Player State owner; raw profile prose, coordinates, event-attached values, and model classification cannot independently establish occupation, intent, behavior, guilt, relationship, or truth.
20. `DIRECTION_CAPTURED 2026-08-15 / WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION`: existing Modules own every world fact they can honestly confirm. A future ownerless World State And Arc Ledger is considered only if one Event Instance and current owners are insufficient. Future forum/X/Weibo-like/social/news content belongs to a Community/Media Module that keeps owner-confirmed facts, account/person claims, and committed posts distinct; future clue retention requires a separate Investigation/Knowledge owner.
21. AI may later draft bounded incident, claim, or publication candidates only after local structured eligibility. It cannot become the source of canonical identity, player/world values, user actions, facts, publication authority, or numeric mutation, and ordinary Tick/no-event/feed eligibility must not require a provider call.
22. `CHAT_ROLE_GREETING_CONTINUITY_DONE 2026-08-18`: an applied low-risk `role_greeting_request` may invoke an owner callback that records one explicit, role-targeted, supporting-only Relationship Runtime fact under `chat_social__role_greeting`. It has no metric delta and does not cover blocked/dismissed/pending/high-risk social proposals, free-text relationship extraction, or a generic Event-to-role candidate API.
23. `CHAT_DISCLOSURE_SUPPORTING_FACT_DONE 2026-08-18 / SUBJECT_GROUPING_DONE 2026-08-21`: Chat offers an explicit `让 TA 记住 / Remember for them` action only for one user-authored message in one role thread. The Chat Owner Adapter binds the exact conversation/message source and records one supporting-only `relationship_chat_user_disclosure` fact, with no metric or stage change and source-level dedupe. New records use conservative subject keys such as `chat_disclosure__hospital` and `chat_disclosure__birthday`: the same recognized subject updates one memory with all message sources retained, unrelated or unknown subjects remain separate, and old `chat_disclosure__user_shared` records stay readable without migration. This is not automatic message analysis, model-generated extraction, periodic consolidation, or a new memory store.
24. `CHAT_AI_DISCLOSURE_CANDIDATE_PARSER_DONE 2026-08-18`: Chat now has a pure, disabled-by-default `disclosureCandidates` parser for a future explicit review checkpoint. It accepts only a bounded summary/reason tied to a trusted role and exact current user-message id, returns a temporary `pending_review` object, and rejects model-selected roles, memory keys, metric deltas, persistence decisions, recalled/assistant messages, service/group targets, and malformed/provider-fallback output. It is not a Relationship Runtime write path and has no user-facing review UI yet.
25. `WORK_HUB_FIRST_NEXT_EVENT_DIRECTION_ACCEPTED 2026-08-26`: the former NEXT-first career appointment plan is superseded as the default path. Work Hub owns work inside an existing organization; `NEXT / 机会` owns public jobs, external auditions/casting, headhunting, and cross-organization invitations. The next safe sequence is production organization owner/authority -> ordinary non-event Work Hub loop -> first Work Hub-native schedule-change event -> `生活志 / Chronicle`. Internal recording, music-show, radio, performance, rehearsal, class, assignment, and company schedule changes follow Work Hub -> Calendar -> Agenda Journey -> Map/Activity. Messages/SMS remains conditional on a concrete number/short-code need. This entry changes planning priority only and claims none of those slices implemented.

The detailed direction is `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md`. Only its `PLAYER_CONTEXT_V1_FOUNDATION`, `CHAT_ROLE_GREETING_CONTINUITY`, `CHAT_DISCLOSURE_SUPPORTING_FACT`, and `CHAT_AI_DISCLOSURE_CANDIDATE_PARSER` proofs are implemented: a backward-compatible Contacts profile revision plus pure eligibility projection/evaluator, an owner-callback relationship fact after an applied low-risk Chat greeting, an explicit user-authored Chat disclosure fact, and a disabled-by-default temporary AI candidate parser. It creates no EVE stage, new Store, route, Event Surface host, forum/news UI, claim/post persistence, clue system, random incident, model call on ordinary chat, automatic free-text memory extraction, or closed-page simulation; all broader world-evolution and information-propagation work remains separately gated.

Execution stages:

1. `EVE-0 DONE 2026-08-10`: refresh the total architecture and freeze entry/ownership direction across Event Runtime, host apps, World Hub, and Cheats.
2. `EVE-1 DONE 2026-08-10`: `src/lib/simulation/event-surface-projection.js` now derives bounded Map Journey and Chat social surfaces with stable source/proposal/log references, ownership, lifecycle and risk/review state, bilingual/accessibility copy, strict stable-place/geographic/canvas anchors, bounded expansion/action descriptors, and stale-source fail-closed behavior. `src/lib/simulation/event-surface-host-registry.js` adds an empty-by-default explicit capability registry. The slice adds no route, Store field, persistent record, host UI, outcome execution, or new event content.
3. `EVE-2A DONE 2026-08-10 / DOCUMENTATION_AND_FIXTURES`: inventoried the current 101-place default Map, froze conservative legacy and exact K-pop place semantics, Event Template V2, Event Instance V1, variant/text/media/Map-session Interfaces, limits, local fallback, cache/reopen/persistence policy, selected the production-arrival-briefing archetype, and added six immutable fixture cases. This stage added no runtime writes, host registration, provider calls, Map card, or scene asset.
4. `EVE-2B DONE 2026-08-10 / RUNTIME_FOUNDATION`: implemented pure frozen-contract normalizers and registries, the built-in K-pop fallback pack, deterministic local Event Instance materialization, provider-neutral validated one-call/no-retry text composition, and `store:simulation` V2 durable `eventInstances` plus independent text mode, V1 migration, restore rejection reporting, backup, and rollback. No Map Place Session field, host registration, UI, scene asset, or external domain mutation was added.
5. `EVE-2C DONE 2026-08-10 / FIRST MAP K-POP VERTICAL SLICE`: upgraded `store:map` to V3 for manual-versus-internally-authorized-journey position evidence, stable destination-place lineage, explicit `inside` / `left` sessions, and V2 migration; registered exactly one Map host for the frozen production-arrival-briefing archetype; added zero-token no-event/invitation behavior, explicit `Enter` / expansion, local or cached optional text, three allowlisted Map-validated choices with `canonicalMutation: none`, derived projections, geographic/canvas anchors, stale/off-pack fail-closed behavior, clustering/stacking, layer coexistence, and return context. Focused tests pass 8 files / 109 tests, full Vitest passes 228 files / 1671 tests, lint/build pass, and dedicated Playwright passes 6/6 on desktop Chromium and simulated Pixel 5 with accessibility, page-error, and zero-overflow checks. This does not claim physical-device proof.
6. `EVE-3 DONE 2026-08-12 / WORLD_HUB_EVENT_NOTEBOOK`: `src/lib/simulation/event-notebook.js` now builds a deterministic review model over Event Instances, event logs, Chat social proposals, Map Journey proposals, and stable event-scoped notes without creating a second event record. `store:simulation` V3 persists authoritative review notes, migrates V1/V2, includes notes in backup/restore, and keeps them after bounded event-log rotation. World Hub provides all/pending/noted counts, source/module/status filters, stable lineage and stale-source review, explicit selection, and add/edit/delete note actions; selection and notes do not retrigger events or mutate source truth, create Reminders/Calendar plans, or grant Cheats authority. Focused tests pass 4 files / 37 tests; the bounded-worker full suite passes 239 files / 1767 tests; lint/build/governance pass; dedicated Playwright passes 2/2 on desktop Chromium and simulated Pixel 5 with critical Axe, page/console-error, and zero-horizontal-overflow checks. Four screenshots provide visual evidence. This does not claim physical-device proof.
7. `EVE-4 RESET / EVE-4A TECHNICAL_SPIKE_COMPLETE / PRODUCT_ACCEPTANCE_WITHDRAWN 2026-08-12`: the Food Delivery spike proved exact one-to-one order/event/runtime-log lineage, owner-only linking, injection/rebinding/log-reuse rejection, and backup compatibility. Product review found the host/card slice wrong for SchatPhone: the order-screen update action manufactured a delay, the `Dispatch brief` duplicated native fulfillment truth, and `canonicalMutation: none` contradicted the ETA consequence. The correction removes the Food Delivery production host, card, expand/acknowledge actions, manual trigger, dedicated surface E2E, and screenshots; legitimate Runtime delivery exceptions now update Food Delivery-owned `order.etaMinutes`, append the native timeline, and use the existing Chat dispatch notification. EVE-4B now satisfies the reset with a separately accepted owner-native Food Delivery/Wallet/Map/Phone address-escalation chain; no generic card or second Event Surface was restored.
8. `EVE-4B REFERENCE_VERTICAL_DONE 2026-08-14`: implemented the first non-card technical reference across paid Food Delivery checkout, Wallet commerce payment, Map-owned courier journey/reroute, Food Delivery-native order messages, system notifications, and the Phone text-call shell. Runtime storage V4 persists only owner references and checkpoint lineage with deterministic random/no-event gates; no Food Delivery Event Surface, Event Home app, copied owner records, or `canonicalMutation` is introduced. Focused owner/runtime tests, full Vitest, lint, build, governance, and diff checks pass; direct Moon Bistro browser evidence passes on desktop Chromium and simulated Pixel 5. Product review retains the owner capabilities/evidence but supersedes the pickup-time trigger and specialized Runtime shape for future work. Full Playwright remains a bounded follow-up because the broad run did not complete within its time budget.
9. `EVE-4C USER_INITIATED_COMMERCE_INTERACTION_FOUNDATION / DONE 2026-08-14`: shared order-reference, interaction-trigger, Service Case, owner-fact, owner-request, Phone-resolution, and Map-estimate Interfaces are frozen with fixtures and pure tests. Simulation V5 adds generic Event Instance V2 progression and migrates legacy `foodDeliveryCausalChains` into read-only audit lineage without fabricating user intent. Food Delivery V3 makes an explicit owner-thread or registered Chat service-account action create/reuse one canonical Service Case; the after-pickup no-response recipe opens a Phone text call, Phone emits a structured proposal, Food Delivery validates it, and Map alone commits the revision-aware reroute. Wallet payment and receipt truth remain owner-native, ordinary/no-event behavior remains available, and Shopping V2 proves the same commerce owner seam separately. Full Vitest passes 263 files / 1935 tests; lint, production build, governance at 2 files / 14 tests, and `git diff --check` pass. The dedicated desktop Chromium and simulated Pixel 5 flow passes 2/2 and covers checkout, Wallet payment, request, timeout, Phone resolution, owner validation, reroute, return context, accessibility, persistence, and zero horizontal overflow without claiming physical-device proof. No Food Delivery Event Surface, Event Home app, Mini Scene, Calendar/Agenda Journey effect, second event record, or EVE-5 implementation is introduced. Read `docs/architecture/USER_INITIATED_COMMERCE_INTERACTION_EVENT_ARCHITECTURE.md`.
10. `PLAYER_CONTEXT_V1 FOUNDATION_DONE 2026-08-15`: `store:chat` role profiles now migrate to and persist a monotonic revision through all profile-owned write seams. `src/lib/simulation/player-context-projection.js` builds immutable body-free Self Profile snapshots from exact profile/world/template revision evidence and manual visible allowlisted K-pop identity fields, validates owner reference revisions, and locally evaluates only manager and public-idol family eligibility. Focused tests pass 4 files / 20 tests; the bounded two-worker full suite passes 265 files / 1946 tests; lint, production build, governance, and diff checks pass. No Event Instance, random incident, AI call, owner mutation, route, host, UI, E2E, or visual evidence is added.
11. `EVE-5 MINI_SCENE_AND_MEDIA_GATES_REQUIRED`: add richer text/interactive expansion only through the roadmap 4.8 shared Module after its persistence, Settings, security, and Presenter prerequisites are accepted; later CG remains separately gated from text materialization.

Primary package:

- `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`

Secondary packages by implemented slice:

- `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`
- `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md` for EVE-4A

Focused contracts:

- `docs/architecture/SIMULATION_EVENT_ENGINE.md`
- `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`
- `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`
- `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md`
- `docs/architecture/USER_INITIATED_COMMERCE_INTERACTION_EVENT_ARCHITECTURE.md`
- `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`

This lane does not authorize MJE-5 active exploration, event-driven place discovery, Agenda Journey, a new Event route/Store, broad high-impact automation, a Player State or World State Store, Community/Media or Investigation implementation, closed-page simulation, or Cheats implementation.

### 4.15 Shared Runtime Text To Speech

Status: `P2 PARTIAL_DONE / TTS-1 DEPLOYED / PROVIDER QUALITY SMOKE PENDING`

Promoted first slice completed on 2026-08-10:

1. added one shared TTS contract/API/Store boundary separately from conversation AI, Music, Image Generation, and development-time audio Skills;
2. added Cloudflare Workers AI MeloTTS at the bounded `POST /api/tts/v1/speech` route with AI binding, origin/method/input/language/rate/output controls, binary/Base64 response normalization, and redacted errors;
3. added direct MiniMax T2A with a device-local user Key, official-host restriction, Chinese language boost, selectable model/voice/emotion/speed, Hex MP3 validation, and normalized Blob output;
4. added `/chat-settings/voice` for provider configuration and temporary Chinese preview, while leaving Chat messages, `voice_virtual`, automatic reply reading, and durable audio unchanged;
5. separately inventoried `schatphone:tts:config` and `schatphone:tts:credentials` as device-local ordinary-backup exclusions, and kept preview audio in revocable runtime object URLs only;
6. added contract/Adapter/Store/View/Worker tests, desktop/simulated-mobile route coverage, Wrangler AI-binding dry-run, an architecture contract, and a cross-PC provider setup handoff.
7. authenticated Wrangler against account `0de8b7a0ecea09c02667775b8c467ffd`, deployed the Worker route, and corrected the public `zh` to provider-native `ZH` boundary discovered during live inference. The final end-to-end playback smoke remains open because subsequent Workers AI calls returned provider-side `3043 Internal server error` for both English and Chinese while the Worker route and binding remained healthy.
8. deployed reliability hardening as Worker version `d9e15cf0-f81f-46dc-bc04-22752547a994`: MeloTTS now exposes only the verified `zh`/`en` inputs, validates and labels WAV/MP3 from actual bytes, retries one temporary provider failure with shared cancellation/timeout, and presents a provider-outage fallback to MiniMax. One diagnosis returned 87,398 valid WAV bytes, while two bounded post-deployment Chinese requests still returned `TTS_PROVIDER_UNAVAILABLE`; provider quality/playback proof therefore remains open.

Remaining stages are separately gated:

- one stable authorized end-to-end Chinese quality/cost/playback smoke for MeloTTS after the provider-side `3043` failure clears, plus the separately keyed MiniMax smoke;
- production decision for user-owned keys or personal gateways, durable abuse controls, quota/cost ownership, and monitoring;
- explicit Chat read-aloud and/or durable voice-message contract covering user gesture, cancellation, playback, schema, media retention, accessibility, backup, and migration;
- additional providers only through normalized Adapters, without provider branching in Chat.

Primary package:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`

Secondary package:

- `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`

Focused contracts:

- `docs/architecture/TTS_MODULE_CONTRACT.md`
- `docs/process/TTS_PROVIDER_SETUP.md`

### 4.16 Everyday App Shell Preview Wave

Status: `P1 INITIAL_SHELL_PORTFOLIO_DONE / SHP-1 MAIL / SHP-1B MAIL_AI_ARRIVAL / SHP-2 BROWSER_COMMUNITY_HEALTHCARE_HOUSING / SHP-3 NOTIFICATION / SHP-4 WORKPLACE / SHP-5 FANDOM / SHP-6 TICKETS / SHP-7 TRAVEL / SHP-8 INTERCITY / SHP-9 CREATOR_RIGHTS / SHP-10 PARCEL / SHP-11 CAREER DONE 2026-08-24`

Candidate source and grouping:

- `docs/pm/event-runtime-and-world-hub/EVENT_ECOSYSTEM_APP_SHELLS_PLANNING_HANDOFF.md` owns the candidate decomposition, shared product rules, and workgroup acceptance template;
- `docs/pm/event-runtime-and-world-hub/EVENT_APP_SHELL_PRIORITY_MATRIX.md` owns shell prototyping priority, the S0/S1/S2/S3 maturity model, and the recommended waves;
- this lane is the roadmap authorization those documents deliberately do not provide. It does not modify their candidate list or supersede the `CMG-08` P0 ledger item.

Goal:

- turn the highest-value future app candidates into user-visible, high-visual-quality shells without waiting for full owner chains;
- first-batch shells must reach at least matrix level S1: an ordinary no-event loop over local fixtures with stable IDs, complete empty/loading/failure/long-content states, day/night, zh/en, desktop and simulated Pixel 5, accessibility, and zero horizontal overflow;
- visual completion is itself an acceptance bar: each shell needs its own visual argument and five-dimension differentiation under `docs/design/DESIGN.md`, and must not look like a generic admin interface;
- each shell leaves explicit S2 (owner Store/schema/backup) and S3 (Event Runtime chain) seams without implementing them.

Delivery stages:

1. `SHP-1 Mail S1 shell (Daon Mail)` - `DONE 2026-08-23`
   - a fictional Korean portal mail identity with fixture accounts, folders, and 8-10 bilingual threads referencing the existing Seoul world;
   - inbox, thread detail, local compose/drafts, archive, star, search, and local-sent as an ordinary no-event loop;
   - S1 preview state persists under a registered device-local key excluded from backup; no production Store, backup section, cross-owner write, notification write, or Event Runtime participation;
   - Home page-2 entry, App Store presence, icon/customization registration, focused Vitest plus desktop and simulated Pixel 5 Playwright, and visual-gate coverage.
2. `SHP-1B Mail AI arrival` - `DONE 2026-08-23 / EXPLICIT_ENTRY_PROVIDER_EXCEPTION`
   - a header `Receive` action performs exactly one provider call per click through the shared `callAI` transport and the user's Network & API settings;
   - the prompt carries bounded context only (user-managed sender whitelist, active world name plus a bounded worldview excerpt, Self Profile display name and public role, current system language); ordinary browsing stays zero-token and this receive action is the shell's only provider entry — the sole accepted exception to the S1 zero-provider checklist;
   - strict JSON validation (sender shape, length caps, label allowlist, HTML rejection) gates one locally committed unread letter with provider/model provenance; missing provider surfaces honest recovery into Network & API, and provider failures or invalid drafts create no letter and never fall back to a deterministic substitute;
   - the sender whitelist is user configuration (`schatphone:mail-shell:sender-whitelist`, registered and excluded from backup): fixture institutions by default, add/remove/restore in-app, and validated AI-invented senders enrolled with an explicit generated origin when `allowNewSenders` is on;
   - generated letters are in-world display content: no relationship, metric, world, or other-owner writes. Product rules and gated follow-ups (arrival system notifications wait for the Notification Center shell; world-pack mailbox backfill; S2 owner) live in `docs/pm/visual-and-ia-governance/MAIL_SHELL_FEATURE_PLAN.md`.
3. `SHP-2 Browser / Community Core / Healthcare / Housing S1 shells` - `DONE 2026-08-23`
   - `Prism Browser / 折光浏览器`: zero-provider Help + Current World search, honest unavailable Web source, source filters, full local detail, history/bookmarks/recent visits, stale fail-closed, and owner-App return context;
   - `Ripple / 涟漪`: Following/Explore/News/Saved, accounts, committed posts, explicit verified/account-claim/published-content semantics, corrections and unavailable-source handling, with no publication or Community-owner write;
   - `Ondam Care / 温谈健康`: institution/service discovery, care overview, local appointment create/reschedule/cancel, authored report inbox/detail/revision handling, and stable Map place-reference handoff without diagnosis or real-health intake;
   - `Jari / 住处`: rent/buy discovery, filters, favorites/recent, listing detail, local viewing drafts, and Map-owned residential-area handoff. Housing reuses the existing Map place catalog and never renders a fake map or listing coordinate;
   - shared `/browser`, `/community`, `/healthcare`, and `/housing` routes, Home/App Store entries, icon/skin registration, return context, version-9 pristine-default Home migration, and excluded preview-state inventory are integrated. Existing customized Home layouts remain untouched;
   - the lightweight UI structure review preserves four distinct product hierarchies and adds only discoverability corrections: visible Browser utilities, Community status guide, Healthcare appointment/report overview, and separate Housing area-filter/real-Map actions.
4. `SHP-3 System Notification Center S1` - `DONE 2026-08-24`
   - a native unlocked shade opens from the status bar by tap or downward gesture and reuses the existing bounded persisted notifications, foreground banner source, lock-screen records, and owner routes;
   - notifications group by resolved App identity with All/Unread filters, mark-one/all-read, dismiss-one, clear-all, deep links, and honest disabled/empty states;
   - dismissal changes notification presentation only; no owner record, Event Instance, Calendar item, Map state, Mail item, Home/App Store entry, route, or new Store is created or mutated;
   - focused unit coverage passes 17/17 and dedicated Playwright passes 8/8 across desktop Chromium and simulated Pixel 5 with day/night, zh/en, accessibility, long text, owner-record non-mutation, and zero horizontal overflow. No physical-device evidence is claimed.
5. `SHP-4 Organization Workplace S1` - `DONE 2026-08-24`
   - `工作台 / Work Hub` is an independent artist-first agency App with Today, Channels, Work, and Org workspaces, one fixture membership/team roster, call-sheet and checkpoint reading, bounded local team messages, task completion, explicit status reports, and schedule-proposal decisions; the earlier `幕间 / Interlude` default is retired;
   - Calendar, Agenda Journey, and Map receive stable references and return context only. Proposal acceptance remains waiting for scheduling staff, coordinates never create attendance, and no canonical owner record is copied or mutated;
   - the artist-community action persists pending application state only and cannot grant artist publishing access. Manager, assistant, producer, employee, and student role templates prove reusable composition without claiming a production organization owner;
   - route, Home/App Store entry, app skin/icon identity, pristine Home version-10 migration, return-source handling, and excluded preview-state inventory are integrated while customized Home layouts remain unchanged;
   - the Org page can rename the App through the shared Home/App Store identity override and store a local organization display alias. Workplace preview V2 migrates V1 interactions; display naming never edits the canonical affiliation credential or grants authority;
   - focused unit/integration tests pass 8 files / 112 tests and dedicated Playwright passes 10/10 across desktop Chromium and simulated Pixel 5 with day/night, zh/en, accessibility, naming persistence/reopen, unchanged credential truth, long text, owner-boundary checks, and zero page-level horizontal overflow. Screenshots are under `output/e2e/workplace-app-shell/`; no physical-device evidence is claimed.
6. `SHP-5 Unified Fandom S1` - `DONE 2026-08-24`
   - `星集 / Aster` is an installed one-brand fandom App with Home, Artists, Aster Notes, and My-space workspaces, plus local follow/bookmark/read/tab/alert preferences;
   - public Ripple content is projected by stable post ID instead of copied into a second publication record, and artist subscription messages are presented as platform content rather than ordinary Chat DMs;
   - the artist workspace remains hidden and fail-closed without a future platform entitlement. Work Hub pending state changes explanation and return context only; it never grants publishing authority;
   - route, Home/App Store entry, shared App identity/skin, version-11 pristine Home migration, navigation return, and excluded preview-state inventory are integrated while customized Home layouts remain unchanged;
   - focused Vitest passes 5 files / 77 tests and dedicated Playwright passes 10/10 across desktop Chromium and simulated Pixel 5 with day/night, zh/en, accessibility, reopen persistence, Work Hub return, locked publishing, and zero horizontal overflow. Screenshots are under `output/e2e/fandom-app-shell/`; no physical-device evidence is claimed;
   - no Community owner, entitlement grant, paid subscription, Wallet record, notification write, provider/AI call, Event Surface, or Event Runtime chain is introduced. Tickets S1 has since landed; Fandom S2/S3 remains separately gated.
7. `SHP-6 Tickets S1` - `DONE 2026-08-24`
   - `入场 / GATE` is an installed independent Tickets App with Discover, Search, Passes, and My workspaces; five stable fixtures cover concerts, music shows, film, exhibitions, and fan events;
   - availability is explicit across on-sale, lottery-open, reservation, waitlist, and sold-out states. Sold-out activity fails closed and cannot create a local draft;
   - favorites, recent views, sale-alert preference, and admission-intent drafts remain bounded local preview state. Passes labels entries `LOCAL DRAFT` and never claims an order, payment, seat, lottery result, accepted waitlist, or valid ticket;
   - venue Map IDs are read-only references. No Map place/route/presence, Calendar record, Agenda Journey, Wallet transaction, Mail receipt, notification, ticket owner, provider/AI call, Event Surface, or Event Runtime chain is created;
   - route, Home/App Store entry, App identity/skin, navigation return, version-12 pristine Home migration, and persistence inventory V13 are integrated while customized Home layouts remain unchanged;
   - focused Vitest passes 6 files / 85 tests and dedicated Playwright passes 8/8 across desktop Chromium and simulated Pixel 5 with drafting, sold-out fail-closed, reopen persistence, day/night, zh/en, accessibility, and zero horizontal overflow. Screenshots are under `output/e2e/tickets-app-shell/`; no physical-device evidence is claimed.
8. `SHP-7 Travel / Hotel S1` - `DONE 2026-08-24`
   - `漫泊 / ROAM` is an installed independent Travel App with Explore, Search, Trip book, and My workspaces; five stable fixtures cover city, coast, nature, and culture stays;
   - availability is explicit across available, limited, unavailable, and source-stale states. Unavailable and stale entries fail closed and cannot create a local draft, waitlist, or invented inventory;
   - favorites, recent views, deal-alert preference, dates, guests, room selection, and stay-intent drafts remain bounded local preview state. Trip book labels entries `LOCAL DRAFT` and never claims a reservation, payment, room hold, confirmation, Calendar stay, or valid itinerary;
   - Map place IDs are read-only references. No Map place/route/position/presence, Calendar record, Agenda Journey, Wallet transaction, Mail confirmation, notification, travel owner, provider/AI call, Event Surface, or Event Runtime chain is created;
   - route, Home/App Store entry, App identity/skin, navigation return, version-13 pristine Home migration, and persistence inventory V14 are integrated while customized Home layouts remain unchanged;
   - focused Vitest passes 6 files / 86 tests and dedicated Playwright passes 8/8 across desktop Chromium and simulated Pixel 5 with drafting, stale-source fail-closed, reopen persistence, day/night, zh/en, accessibility, and zero horizontal overflow. Screenshots are under `output/e2e/travel-app-shell/`; no physical-device evidence is claimed.
9. `SHP-8 Intercity S1` - `DONE 2026-08-24`
   - `联程 / VIA` compares rail, flight, coach, and ferry options with explicit inventory/source states and local passenger/fare/trip-intent drafts;
   - existing Map terminal IDs are read-only; no booking, ticket, seat, Wallet, Mail, Calendar, Agenda, Map Journey, notification, provider, or Event Runtime record is created.
10. `SHP-9 Creator Rights S1` - `DONE 2026-08-24`
   - `谱权 / CREDO` provides works, creator roles, rights-share previews, royalty statements, and annual declaration drafts;
   - no copyright, certification, registration, signature, share mutation, Wallet settlement, provider, or Event Runtime result is created.
11. `SHP-10 Parcel S1` - `DONE 2026-08-24`
   - `递送 / POSTA` provides parcel lookup, delivery inbox, pinning, explicit logistics states, and local send drafts;
   - no shipment, label, pickup, address mutation, signature, delivery proof, refund, notification, provider, or Event Runtime result is created.
12. `SHP-11 Career S1` - `DONE 2026-08-24`
   - `机会 / NEXT` provides jobs, auditions, invitations, saved opportunities, and local application/profile drafts; invite-only and stale sources fail closed;
   - no submission, institution receipt, interview, offer, credential, Mail, Calendar, Work Hub, notification, provider, or Event Runtime result is created.

Next Event production candidate:

- `NEXT_EVENT_PRODUCTION_PLAN_AFTER_SHELL_PORTFOLIO.md` now records the accepted Work Hub-first sequence: correct/deepen Work Hub and organization authority, prove an ordinary non-event organization loop, then add one Work Hub-native schedule-change event with Calendar confirmation and Agenda Journey/Map/Activity execution. `NEXT / 机会` participates only for external opportunities. `生活志 / Chronicle` follows the first meaningful event chain; Messages/SMS remains conditional. This roadmap entry records the plan only; implementation remains separately gated.

Portfolio navigation:

- `docs/pm/event-runtime-and-world-hub/EVENT_APP_SHELL_PRIORITY_MATRIX.md` is the single index for current maturity, next work, and detailed-plan routing across completed, planned, extension-first, gated, and explicitly non-App shell candidates. It mirrors this roadmap/package status and does not create a second execution queue or authorize the next shell.

Acceptance for 4.16:

- the matrix section 9 S1 checklist holds for every promoted shell: entry/route/return context, list + detail + primary action page, ordinary no-event operability, stable fixture IDs across refresh, empty/loading/failure/unavailable/long-content states, day/night plus zh/en plus desktop and simulated Pixel 5 with zero horizontal overflow, accessibility names/focus/targets, no internal architecture copy, no unimplemented buttons, no fake success states, no other-owner writes, no provider calls, no Event Surface registration;
- visual quality is accepted against the storefront guide's five-dimension differentiation and the project visual gate, not against a component checklist alone;
- S2/S3 seams are documented but unimplemented until separately accepted.

Boundary:

- this lane does not authorize Event Runtime integration, new production Stores, backup sections, schema migration, CJA-6B implementation, a Community/Media owner, per-App notification channels, physical-device push claims, or any promotion of shells the user has not separately accepted.

Primary package:

- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

Secondary packages:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md` only when a shell is promoted from S1 fixture preview to S2 owner implementation;
- `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md` only when a shell is promoted to an S3 event chain.

### 4.17 Contacts V3 Identity And Role Core

Status: `P0 IMPLEMENTATION_ACTIVE / CONTACTS-V3-0 DONE 2026-08-27 / CONTACTS-V3-1 DONE 2026-08-27 / CONTACTS-V3-2A ACTIVE / CARD-1 DONE 2026-08-27 / ROLE-0 DECISION_DONE 2026-08-27 / ROLE-1 DONE 2026-08-27 / CARD-2 DONE 2026-08-27 / CARD-3 DONE 2026-08-27 / CARD-4 DONE 2026-08-27 / CARD-5 DONE 2026-08-27 / CARD-6 DONE 2026-08-27 / PERSONA-1 NEXT`

Goal:

Make Contacts the executable stable identity owner for Self Profile, Main Role, Supporting Role, and World NPC records so user-authored persona can be confirmed once and consumed safely by formal Chat, Event Runtime, Work Hub, and later public/social projections.

Accepted direction:

1. Contacts V2 remains complete and is not reopened; V3 extends ownership, persona confirmation, projections, and lifecycle without discarding the landed relationship, memory, WorldBook-field, cleanup, or Role Hub baseline.
2. The user-authored persona is an accepted identity source. Structured manual input may save explicitly; free-text or AI interpretation remains a transient candidate until the user reviews and confirms it into structured Contacts-owned values and a new profile revision.
3. Contacts Profile Owner becomes the executable owner of role profiles. The current `store:chat.roleProfiles` carrier remains compatibility-protected until stable IDs, bindings, persistence, backup/restore, receiving accounts, NPC upgrade, cleanup, rollback, and migration are frozen and tested.
4. Formal Chat, Event Runtime, Work Hub, Mail, and future Community/Media consume bounded purpose-specific projections. No universal full-profile object or duplicated downstream identity form is accepted.
5. Contacts retains stable identity only. Relationship Runtime keeps metrics and memory truth; Chat keeps messages and threads; Work Hub keeps organization work records; Calendar keeps confirmed time; Event Runtime keeps eligibility/progression/audit.
6. `CONTACTS-V3-0` freezes one global device account plus one independent Contacts Self Profile per world while retaining the current single-world runtime compatibility baseline.
7. Person depth and relationship labels are separate. `World NPC -> Supporting Role -> Main Role` is an identity-preserving unlock path; family/friend/colleague/etc. remain multi-select context and cannot grant entity capabilities. Existing `npc` records remain World NPC unless the user explicitly changes them.

Delivery order:

1. `CONTACTS-V3-0 DONE 2026-08-27`: architecture and decision freeze, ownership map, migration inventory, per-world Self Profile decision, compatibility/rollback contract, first implementation file set;
2. `CONTACTS-V3-1 DONE 2026-08-27`: Contacts Profile Owner foundation behind the current persisted shape, with Chat compatibility methods and backup shape preserved;
3. `CONTACTS-V3-2A ACTIVE / CARD-1 DONE 2026-08-27 / ROLE-0 DECISION_DONE 2026-08-27 / ROLE-1 DONE 2026-08-27 / CARD-2 DONE 2026-08-27 / CARD-3 DONE 2026-08-27 / CARD-4 DONE 2026-08-27 / CARD-5 DONE 2026-08-27 / CARD-6 DONE 2026-08-27 / PERSONA-1 NEXT`: the category carrier, four-person-type baseline, additive purpose markers, added input types, manual WorldBook category/field editing, read-first dynamic person-page form, Contacts-owned person-specific extensions, and reviewable current-world template proposals preserve legacy templates, old NPC classifications, old-field permissions, stable IDs, existing values, and backup compatibility; next classify pasted persona text into one review-only draft without changing a person before explicit confirmation;
4. `CONTACTS-V3-2B`: Persona Confirmation writes one explicitly reviewed Self Profile revision;
5. `CONTACTS-V3-3`: purpose-specific projections, with formal Chat first and Player Context/Work Hub alignment after review;
6. `CONTACTS-V3-4`: role lifecycle concentration for create/update/archive/restore/NPC upgrade/delete;
7. `CONTACTS-V3-5`: consumer adoption without Contacts V2, Chat history, relationship, or backup regressions.

First acceptance gate:

- `CONTACTS-V3-0` is complete in `CONTACTS_V3_0_ARCHITECTURE_AND_DECISION_FREEZE.md`;
- `CONTACTS-V3-1` retains the Chat persistence carrier and complete-backup shape while moving profile behavior behind the Contacts owner; no new persisted Store, route, profile move, Contacts/Chat redesign, downstream consumer migration, Work Hub owner, event family, or visible capability was added;
- V3-2A may compatibly extend the existing WorldBook template-authoring flow with categories, field types, visibility, and purpose markers, but every world suggestion, custom field, and free-text classification result remains editable and unsaved until the user confirms it.

Primary package:

- `docs/pm/contacts-relationship-system-v2/CONTACTS_V3_IDENTITY_AND_ROLE_CORE_PLAN.md`
- `docs/pm/contacts-relationship-system-v2/CONTACTS_V3_0_ARCHITECTURE_AND_DECISION_FREEZE.md`
- `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`

Secondary contracts:

- `docs/architecture/ROLE_BINDING_CONTRACT.md` when Chat binding or contract meaning changes;
- `docs/architecture/PLAYER_CONTEXT_WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_ARCHITECTURE.md` when Self Profile projection or eligibility meaning changes;
- Chat, Event Runtime, and Work Hub package handoffs only when a concrete consumer implementation is promoted.

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

1. `P0 CONTACTS_V3_IDENTITY_AND_ROLE_CORE / CONTACTS-V3-0 DONE 2026-08-27 / CONTACTS-V3-1 DONE 2026-08-27 / CONTACTS-V3-2A ACTIVE / CARD-1 DONE 2026-08-27 / ROLE-0 DECISION_DONE 2026-08-27 / ROLE-1 DONE 2026-08-27 / CARD-2 DONE 2026-08-27 / CARD-3 DONE 2026-08-27 / CARD-4 DONE 2026-08-27 / CARD-5 DONE 2026-08-27 / CARD-6 DONE 2026-08-27 / PERSONA-1 NEXT`: execute the small-slice checklist in `CONTACTS_V3_2A_EXECUTION_PLAN.md`. The category carrier, four-person-type baseline, field-purpose/input rules, manual WorldBook category/field editor, read-first dynamic Contacts person-page form, person-specific extension path, and reviewable current-world proposal flow are complete locally without changing old NPC classifications, visible list grouping, old-field permissions, existing values, or consumer behavior. Reviewable free-text classification is next; Event identity projection and Work Hub event work remain queued after Persona Confirmation. `EVENT-PREP-1` remains available as a parallel documentation-only identity-field comparison and may not create events.
2. `P0 IN_PROGRESS / CMG-00, CMG-01, CMG-02, CMG-03, AND DCF-05 DONE 2026-08-20 / DCF-01, DCF-03, CMG-04, CMG-05, CMG-06, CMG-07, AND DCF-02 DONE 2026-08-21 / DCF-04 AND DCF-06 DONE 2026-08-22`: the first production gift shared-experience vertical is complete at `d8662cb`; `CMG-06` is complete at `f9f14f9`, `CMG-07` is complete at `d8b46fc`, `DCF-04` is complete at `26534bd` on the incoming-call focus boundary, and `DCF-06` is complete at `ec31855` on the image-bed tooling-test boundary. `CMG-08` remains the next separately assignable persistence item and requires its own non-overlapping reservation.
3. `P0 DONE 2026-07-22`: 4.9 first successful Chat activation loop.
4. `P0 DONE 2026-08-09`: 4.9 current-save write/conflict safety and the release-local complete backup/recovery boundary; broader Repository migration, capacity reporting, and personal R2 remain separately reviewable architecture slices.
5. `P1 PARTIAL_DONE`: 4.10 Camera and shared image-generation first slice is complete; the personal Gallery image-bed Adapter is accepted as an explicit separately promoted follow-up, while Gallery People curation and source-module callers remain separate.
6. `P2 PARTIAL_DONE / CHKSZ_RADIO_BROWSER_LOCAL_AND_MAP_MEDIA_INTEGRATED_LOCAL`: 4.13 Music has the installed app, browser playback, library/queue/search, generic JSON, no-key Radio Browser live radio, and ChKSz sources, direct HTTPS URL songs, Music-owned local-file import, Home/App Store integration, a global floating player, Chat track sharing, and an active-journey Map music/radio caller. Live-station uptime remains external; real-key rights/CORS smoke, true-device media behavior, optional local-binary backup/relink, Chat search, and external Map queue requests remain separately promoted work.
7. `P1 DONE 2026-08-10`: the explicit custom role -> Chat journey, Wallet exact-money/card-pack foundations, role receiving-account V1, one ordinary Shopping life-consequence flow, focused Wallet quote explainability, Wallet Activity search/monthly statements/verified payees, Wallet receipt sharing, configurable multi-screen Home release curation, the eleven-facade Shopping pseudo-folder expansion, and the 15-entry Food Delivery real-shop expansion with five Map-owned Seoul destinations are complete at local desktop/simulated-mobile acceptance.
8. `P1 PARTIAL_DONE 2026-08-09` 4.9/4.5 hosted release proof: GitHub Pages Run #31294272595, base-path smoke, and the prior direct-provider Chat/reload flow pass. Commit `a1418ed` is deployed through the Git-connected Vercel and Cloudflare builds; both restricted relay backends passed a no-secret upstream probe plus a GitHub Pages real-provider model-list and Chat smoke (`6` models, reply `OK`). Installed-PWA/relaunch, backup round trip, external protection checks, and named true-device evidence remain.
   - `DONE 2026-08-17` local hosted-product-proof asset closure: real CDN bytes are retried, cached, de-duplicated per request context, and fulfilled fail-closed by the Playwright route helper; Food Delivery, Shopping, and Map evidence specs use explicit approved packs for interaction-mounted and lazy assets. The scoped 34-test desktop + simulated Pixel 5 Chromium focus set passes with both two-worker and default four-worker execution. Hosted deployment, installed-PWA/relaunch, and physical-device evidence remain open and are not claimed by this local slice.
9. `P1` 4.6 true-device World Pack validation only where it overlaps the release device matrix; another archetype is not scheduled.
10. `P1 PARTIAL_DONE / EVE-4C DONE 2026-08-14 / PLAYER_CONTEXT_V1_FOUNDATION_DONE 2026-08-15 / EVENT_REASON_COPY_AND_FEEDBACK_MAINTENANCE_DONE 2026-08-26 / CONTACTS_V3_IDENTITY_FOUNDATION_PREREQUISITE_ACCEPTED 2026-08-27`: 4.14 retains the pure Event Surface Projection, frozen EVE-2A contracts/fixtures, EVE-2B reusable runtime, the first Map/K-pop vertical slice, the World Hub Event Notebook, the owner-native user-initiated commerce foundation, and revision-aware read-only Self Profile eligibility for K-pop manager/public-idol families. The latest maintenance slice centralizes bilingual reason copy across Settings, World Hub, and foreground Tick diagnostics, preserves raw IDs only in technical summaries, and explains Chat role-contact cooldown/quota guardrails without changing runtime behavior. Contacts V3 profile ownership and Persona Confirmation must land before a new formal identity-conditioned event family is promoted. Food Delivery retains no Event Surface host. Dynamic world arcs, Community/Media publication, investigation clues, actual identity-conditioned incident creation, and EVE-5 Mini Scene/media expansion remain documentation-only or separately gated.
11. `P2 PARTIAL_DONE / TTS-1 DEPLOYED / PROVIDER QUALITY SMOKE PENDING`: 4.15 has landed Cloudflare MeloTTS and device-key MiniMax behind the shared runtime TTS Module for temporary Chinese preview, and the bounded Worker route is deployed. Stable end-to-end provider playback proof, production gateway policy, Chat read-aloud, and durable voice messages remain separate gates.
12. `P2 PARTIAL_DONE / MINI_SCENE_AI_RUNTIME_AND_TEXT_SHELL_DONE_2026-08-19`: 4.8 now has durable artifacts/policies, an AI-required structured generation runtime, an Event Runtime registration, and a root Text Presenter. Calendar authoring/entry was explicitly rejected and removed; a production event-trigger Adapter, profile binding, safe Book transforms, and HTML remain separately gated.
13. `ON_HOLD` until after the first usable product preview: personal R2/Worker, production push, Gallery/non-Book migration, World Setting W2, hotspot decomposition, incremental typing, and secondary-module expansion.
14. `P2 PARTIAL_DONE / MJE-1_MJE-2_MJE-4_INTEGRATED / MJE-3_PRODUCTION_TRIGGER_SUSPENDED / PLACE_MEDIA_V1_70_SEOUL_PLACES_INTEGRATED_LOCAL`: 4.11 retains transport planning, lifecycle/checkpoints, Footprints IA, optional per-world authored-facility discovery, and governed place-detail media for 70 of 106 Seoul places. The generic checkpoint obstruction remains compatibility-tested but is not production-enabled. Active exploration, event-driven place reveal, candidate-place ownership, the remaining 36 Seoul place-specific media decisions, generated reconstruction, transit topology, broader-city, and true-device stages remain gated.
15. `P2 PARTIAL_DONE / CALENDAR_DEPARTURE_READINESS_V1_DONE 2026-08-15 / CJA-1_DONE 2026-08-15 / CJA-2_DONE 2026-08-16 / CJA-3_DONE 2026-08-16 / CJA-4_DONE 2026-08-16 / CJA-5_DONE 2026-08-16`: 4.12 now has Calendar V3 authoring and occurrence views, the direct Calendar-to-Map departure vertical, hidden persisted orchestration, the separate Agenda Journey execution app, one absolute-time Activity Session, and one midpoint-only low-impact Event Runtime family with restrained Focus Companion presentation. Appointment auto-entry, broader event families, media callers/richer companions, and Narrative Timeline remain unimplemented.
16. `P1 INITIAL_SHELL_PORTFOLIO_DONE / SHP-1 THROUGH SHP-11 DONE 2026-08-24 / WORK_HUB_FIRST_NEXT_SEQUENCE_ACCEPTED 2026-08-26 / CONTACTS_V3_IDENTITY_FOUNDATION_PRECEDES_WORK_HUB_PROMOTION 2026-08-27`: 4.16 now lands thirteen accepted installed-App previews plus the unlocked native-system Notification Center. The final four—VIA, CREDO, POSTA, and NEXT—add intercity transport, creator rights, parcel logistics, and external career-opportunity structures without inventing booking, rights, shipment, application, payment, scheduling, or event success. Focused tests, desktop/simulated-Pixel-5 E2E, visual comparison, and accessibility checks are integrated; no physical-device evidence is claimed. Mail's explicit Receive action remains the sole accepted S1 provider exception. Contacts V3 must first provide a confirmed Self Profile role and affiliation projection; the later product sequence then promotes Work Hub organization ownership and an ordinary internal-work loop before its first event. Chronicle follows, while SMS remains conditional. `CMG-08` remains a separately assignable P0 persistence item.

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
