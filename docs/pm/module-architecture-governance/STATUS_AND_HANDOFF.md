# Module Architecture Governance Status And Handoff

Updated: 2026-08-21

This is the current handoff for architecture cleanup, state ownership, persistence, security, and release-quality work.

## 1. Current Status

Status: `IN_PROGRESS`

Roadmap owner: 4.5 Architecture, Security, And Documentation Maintenance.

SchatPhone's domain architecture is sound enough to preserve. The current problem is concentration and hardening, not missing architecture or a need for framework replacement.

Current active architecture slice:

- ordinary browsers and installable PWAs remain complete first-class clients;
- one isolated browser/Web App storage container owns one current save; different isolated entry containers remain independent and move state only through a user-selected complete backup, never automatic sync or silent merge;
- same-container tabs use a fail-closed writer boundary: after the safe wait times out, the later page remains a read-only preview with retry and refresh-current-save actions; cooperative release triggers the same bounded retry automatically, while force takeover and last-write-wins remain excluded;
- persistent-storage permission is never requested on first launch; the first qualifying high-volume durable action asks in context, while Settings exposes current status and explicit retry;
- authoritative Chat/role/relationship/memory/user-document records and still-referenced assets cannot be silently or irreversibly deleted; cold archival must remain reversible;
- roadmap 4.5-CMG now governs the confirmed shared-experience, role-memory, Event Instance, Mini Scene, and persistence-result defects through fixed IDs. `CMG-00` through `CMG-04` and `DCF-05` are complete; no item is currently reserved, and `CMG-05`, `CMG-08`, or `DCF-06` may be claimed next only after recording an exact non-overlapping reservation;
- any content formally published, confirmed, applied, or admitted into an owning module's history is durable when it can be revisited, referenced, or affect continuity, regardless of user/AI/system origin;
- full AI prompts, raw provider responses, transport payloads, uncommitted drafts, and rebuildable projections remain non-authoritative; canonical committed content, authoritative state/facts, cross-module references, and minimum provenance are durable;
- text AI callers now share a transient stable-prefix/dynamic-context envelope: Chat and Event Text Composer consume it without transferring fact ownership, official OpenAI requests receive conservative cache hints, unmanaged providers keep their prior shape, and only managed official-OpenAI token usage can report a cache hit; cache routing identities are opaque rather than readable role identifiers;
- `memory-recall.js` adds a deterministic, provider-free recall Module at the same seam: it ranks bounded owner-supplied summaries using recent context, preserves pinned/archived review semantics, and never persists, rewrites, or deletes source memories;
- IndexedDB-first structured persistence is the target direction, while `localStorage` becomes small hot state and recovery metadata;
- optional remote backup is personal BYOS: there is no project/workgroup-owned unique cloud, each user owns a separate Cloudflare account and R2 destination, and Cloudflare R2 is the first officially guided target behind a provider-neutral contract;
- each user deploys a personal Cloudflare Worker gateway bound to that user's R2 destination; SchatPhone may retain only a revocable, scoped device token and must not retain an R2 API Secret;
- personal remote backups are encrypted on the client and support two independent recovery paths: a recovery password or separately downloaded recovery file; Cloudflare/Worker receives no plaintext recovery secret, losing both paths is irreversible, and initial setup must verify recovery before automatic backup becomes ready;
- remote backup keeps the local save authoritative and may run after app launch and while the browser/PWA remains open; it is not live server storage, cross-device sync, automatic merge, or a promise of closed-app background execution;
- choosing `keep` in any source module stores the accepted media locally first; reusable retained media enters Gallery's local material-library scope, and keeping an item never uploads or enrolls it in remote backup by itself;
- backup always protects the complete core save, while one user-facing `include material library` choice controls local Gallery binaries as a group and defaults on; when included, all already-kept Gallery material is packaged without another per-item selection step;
- URL-backed media always preserves the original URL and minimum type/name/source metadata rather than downloading exact bytes for backup; this URL record remains part of backup even when Gallery binaries are excluded, but restore cannot guarantee content whose external URL has stopped working;
- backup exists for rollback and damaged-save recovery, not cloud-library browsing, sync, or local-space offload; successful backup never releases local originals;
- manual backup is always available; automatic backup is a separate opt-in setting that defaults off and follows the existing browser/PWA open-app execution limit;
- local exports support a user-edited filename with a generated product-name-plus-date default and hand the destination choice to the platform save/share flow; iOS, Android, and desktop browsers may expose different location controls;
- multiple restore versions are allowed, but every local or remote backup object must be a complete, independently readable and importable package with no dependency on a previous version;
- SchatPhone does not create an internal local backup library: exported local files remain under the phone/computer file system and re-enter the app only when the user selects one for import;
- after personal R2 is connected, SchatPhone provides a direct cloud-backup view that lists available backup files and restores the selected file without sending the user to the Cloudflare dashboard first; the files remain in the user's R2 and are not duplicated into a hidden in-app backup store;
- the same view may permanently delete a selected SchatPhone backup object from the connected personal R2; deletion is not a local hide action and must use a conspicuous destructive confirmation that names the backup, states that the connected cloud file will also be deleted and cannot be restored through SchatPhone, and clarifies that the current save, other backups, and local exports are unaffected;
- SchatPhone never rotates, expires, or deletes a cloud backup automatically; every personal-R2 backup remains until the user explicitly confirms permanent deletion, and quota pressure may block a new backup or prompt manual cleanup but cannot authorize silent removal;
- the complete-backup/recovery engineering contract is accepted: new complete packages use a versioned required-section manifest, integrity evidence, capacity preflight, creation self-check, staged generation restore, atomic activation, crash journal, failure taxonomy, and metadata-plus-binary rollback;
- the executable canonical inventory independently classifies 17 persisted stores, the serialized mirror, Gallery binary storage, image-generation credential/candidate/legacy carriers, Music credentials/local media/rebuildable provider cache, TTS device configuration/credentials, the Home local hint, Chat session feedback, and their logical owner/data classes; Contacts-in-Chat and WorldBook-in-System remain explicit rather than inheriting the physical store owner;
- Settings diagnostics consumes the inventory's stable 17-store projection and includes Book plus public image-generation configuration; schema v3 complete local export covers every current required section, including `imageGeneration` public configuration and Chat identity/avatar state, while preserving legacy v1/v2 import compatibility and excluding image credentials/candidates;
- roadmap 4.10's first shared Image Generation Module slice is implemented behind dedicated contract/API/Store files rather than `src/lib/ai.js`; OpenAI Images/Edit, OpenAI Chat image output, and Grsai async adapters share normalized requests, redacted errors, direct-first/profile-proxy routing, model discovery, tasks, and bounded candidate behavior. Public profiles/defaults/module routing participate in backup/restore/rollback, while device-local API keys/proxy tokens and temporary candidates do not;
- the project-local `gpt-image` skill is vendored from reviewed upstream commit `068dd9e24aadc8731e46f38548ca4dcd94515d35` as a scenario-specific prompt/reference atlas. It is not a Vue/runtime/build dependency and does not replace the shared Image Generation Module or machine-provided `imagegen`/`codex-image` execution. The bundled local-Key CLI, `.env` loading, moving-`main` `uvx` fallback, billable calls, and relaxed moderation default remain outside normal project execution unless the user explicitly approves that boundary; external gallery provenance is not shipping permission;
- roadmap 4.10 accepts a separate personal image-bed Adapter follow-up. Gallery will expose an explicit storage action that uploads to the owner's image bed with a scoped device-local token and records only the returned URL, without changing ordinary local `Keep`, silently uploading media, or treating the image bed as recovery backup. Public/link-accessible media requires a warning until a private authenticated-media contract is implemented;
- roadmap 4.5's repository-asset externalization slice is complete. The registry contains 843 unique byte- and SHA-256-verified objects: 415 public runtime objects under `schatphone-assets/` and 428 masters, generation sources, or candidates under protected `schatphone-source/`. The authenticated batch endpoint is deployed; the long-lived upload/list-only project credential is configured per publishing workstation; and runtime URLs use centralized public construction. The credential-free queue document is an asset upload list (`素材上传清单`): confirmation authorizes automated transfer but is not an artwork-final decision, and later revisions register new SHA-256 content. Audit screenshots, Playwright reports, contact sheets, prompts, and JSON/JSONL evidence are excluded. Confirmed lists publish automatically in pre-commit, stay offline when none exists, and use an exact credential-free Git fallback when publication is temporarily unavailable so another PC can continue. Successful publication re-downloads and verifies bytes, stages the registry, and removes exact generated work files. The original migration/poster files and the 23-object 2026-08-12 follow-up were copied and reverified in device-local home-PC archive storage whose path is not project configuration. PWA/install/offline resources and files outside confirmed lists remain local. Commits `f654b81` and `ffae433` established the original pushed baseline; GitHub Pages Run `31537206567` plus Vercel and Cloudflare deployment checks passed, all three production hosts loaded 18/18 observed image-bed images without browser errors, and the temporary migration token is revoked while the project publisher remains active;
- roadmap 4.15's first shared runtime TTS slice is implemented behind `tts-contract.js`, `tts-api.js`, `stores/tts.js`, and `/chat-settings/voice`. Cloudflare MeloTTS runs through the bounded `/api/tts/v1/speech` Workers AI handler deployed at `https://schatphone.noarry.workers.dev`; its verified first-slice languages are `zh`/`en`, returned WAV/MP3 containers are identified from their bytes, one temporary provider failure receives a cancellable bounded retry, and the settings surface explains the MiniMax fallback. MiniMax directly consumes a user-owned device-local Key for Chinese voice/emotion/prosody validation. Configuration and credentials are separately inventoried device-local backup exclusions, preview audio uses revocable runtime object URLs, and Chat message schema/`voice_virtual` remain unchanged;
- Music's module slice is implemented behind dedicated contract, ChKSz Adapter, cross-module Interface, playback runtime, Music-local binary storage, rebuildable provider cache, and Pinia Store files. The no-key Radio Browser preset reuses generic JSON normalization with a fixed public endpoint and healthy HTTPS/MP3 station filters; its third-party live streams remain runtime playback sources and do not replace Map's library-backed journey-radio catalog. The ChKSz path supports NetEase/QQ/Kugou search, broader cover/album/artist/date normalization, on-demand stream resolution, same-track single-flight, 24-hour memory-only stream reuse with a 50-track LRU limit, 30-day device metadata/lyrics cache, NetEase playlist intake, quota/error handling, and a fixed official endpoint. Cached playback failures invalidate the stream and trigger at most one new resolution. Keys remain device-local; stream URLs and audio bytes never enter the rebuildable cache or backup. Direct HTTPS URLs and local-file metadata normalize into the public library; imported blobs use the separate `schatphone-music-media` IndexedDB carrier, resolve to revocable object URLs only at Play, and remain excluded from ordinary backup. Public library/provider/integration state is required through `system-settings`; `schatphone:music:credentials` remains a separately inventoried device-local secret carrier. The first Chat caller uses a bounded track payload plus the excluded 24-hour internal-share draft, while confirmed Chat history stores only the normalized source card. The active-journey Map caller consumes bounded now-playing, quick-track, and library-backed station projections; explicit user actions delegate into Music, which retains queue/radio/audio/floating-player ownership. Chat/Map routes and projections omit credentials, endpoint/header data, raw responses, queue contents, stream URLs, and local media IDs;
- legacy inspection still returns `shapeOk` separately from `completePackageEligible`; legacy v2's missing Chat `moduleIdentity` and `moduleAvatarOverrides` remain an explicit historical gap, while v3 requires and integrity-checks both sections;
- `docs/architecture/PERSISTENCE_REPOSITORY_CONTRACT.md` is `ARCHITECTURE_ACCEPTED`: it fixes the separate `schatphone-repository` v1 stores/keyPaths/indexes, immutable record versions plus generation membership, atomic pointer/journal, localStorage hint allowlist, contextual quota/persist policy, fail-closed WriteCoordinator, and Book Adapter/fixture/legacy-reader/rollback contract;
- Batch 2B completed as the exact non-active foundation, followed on 2026-07-22 by the separately approved Book-only runtime cutover: explicit Book UI confirmation, contextual persistent-storage request, atomic activation/reopen, Repository-only later writes, unchanged legacy rollback bytes, and real-Chromium rollback evidence are implemented; dual write, legacy deletion, Gallery/R2, and other owners remain unapproved;
- the structured write-result primitive, lineage/sequence local/mirror freshness bootstrap, product-level save-failed/read-only recovery surface, and product-wide same-container writer boundary are integrated. A page acquires the current-save writer before reconciliation and Store mount; later pages inspect without repair and fail closed across layered, Book, Gallery binary, and image-generation device-local writes until retry succeeds. Ordinary occupancy is distinguished from a real save conflict, and a cooperative release automatically starts the same safe retry without weakening lease authority. The release-local v3 backup/restore/reopen/rollback boundary is now implemented;
- `docs/architecture/WORLD_SETTING_ARCHITECTURE.md` is `ARCHITECTURE_ACCEPTED / STAGE_W1_DONE`: `legacy_single_world` is stable compatibility identity/scope, Pack capability is separate, Book/WorldBook/Pack/template ownership is frozen, and zero-Pack/zero-encyclopedia/zero-text worlds remain valid;
- WorldBook and Contacts now read immutable identity/narrative/encyclopedia/profile/capability/diagnostic projections through `world-interface.js`; Pack switching does not change world identity or setting selection, and new template/contact writes do not record active Pack IDs;
- legacy Pack content references remain reviewable compatibility evidence, but missing Book, encyclopedia, or template references no longer block capability Pack activation;
- `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` is architecture-accepted as a later staged feature: one shared Module owns request validation, world/profile resolution, structured artifacts, safe transforms, presenter selection, fallback, and interaction audit while source modules retain trigger and record truth;
- Mini Scene per-module modes are explicit user choices (`unconfigured/off`, `text`, or `interactive_html`), Book narrative rules and structured transform profiles are separate assets, World Pack references remain optional, and raw AI/legacy Chat HTML is never executed;
- Mini Scene content dimensions, including sensitive dimensions, begin unconfigured and require an explicit per-world/profile include/exclude choice; they do not become a global filter;
- Mini Scene Stage 1 pure foundation remains landed: Book profile/regex handling validates without executing, and world/profile resolution fails closed to neutral;
- the separately authorized 2026-08-19 AI/text shell adds `store:mini-scene` V1, complete-backup v4 with integrity-checked v3 compatibility, global `unconfigured | off | text` policy, an Event Runtime registration, AI-required exact-Draft validation/provenance, and a global accessible Text Presenter. It is not part of Batch 2B and does not add a Repository owner;
- the rejected Calendar form/Adapter path has been removed. A production Event Runtime trigger Adapter, profile-binding UI, safe Book transform execution, HTML, and source-owner integrations remain unimplemented;
- binary-excluded and legacy restores reuse exact matching local Gallery binaries before declaring media unavailable, and restoring an older backup never deletes or hides current-only material the user already kept locally;
- a valid legacy core may restore as `legacy_degraded` after a missing-material summary; unresolved image/GIF/audio/video/file references render a type-appropriate placeholder, and saved caption/alternative/generation-description text may remain readable without retaining raw AI transport payloads;
- a complete self-checking Cloudflare setup, backup, recovery, revocation, quota, and troubleshooting guide is required before this can become an implementation slice;
- this is a promoted architecture-decision slice; beyond the completed Book-only cutover, it does not approve migration of any additional application owner.
- first successful Chat activation and the explicit custom-role-to-Chat journey are completed product evidence rather than architecture prerequisites; GitHub Pages now has direct user-configured provider model discovery, connection, one real Chat reply, reload persistence, and real-provider restricted-relay evidence through both deployed Vercel and Cloudflare backends, while hosted PWA and true-device proof remain release work.

### Product Decision Checkpoint - 2026-07-21

| Area | Status | Current meaning |
| --- | --- | --- |
| Browser/PWA persistence | `CONFIRMED` | One isolated browser/Web App container owns one current save; IndexedDB-first is the target and `localStorage` becomes small hot/recovery state. |
| Isolated entry containers | `CONFIRMED` | Each isolated browser profile/site-data or separately isolated desktop Web App container is an independent current save. There is no internal slot, automatic sync, cross-container discovery, or silent merge; transfer uses a user-selected complete backup. |
| Same-container tabs | `IMPLEMENTED` | One page-level writer gates current durable carriers. After timeout the later page is an inspect-only/read-only preview with retry/refresh-current-save only; cooperative release may trigger a bounded retry automatically, while last-write-wins and force takeover remain excluded. |
| Persistent-storage timing | `CONFIRMED` | Do not ask at first launch. Ask in context before the first qualifying high-volume durable action, and expose browser status plus explicit retry in Settings. |
| IndexedDB / Book pilot | `BOOK_CUTOVER_DONE` | Batch 2B foundation and the separately approved Book runtime cutover are implemented and browser-tested; the unchanged legacy carrier remains rollback-only. |
| Durable records | `CONFIRMED` | Committed user/AI/system content and authoritative/audit truth remain durable under their owning modules; raw transport and rebuildable material do not. |
| Personal cloud | `CONFIRMED` | No shared project/workgroup archive. Each user owns a separate Cloudflare R2 destination behind a provider-neutral contract. |
| Remote security | `CONFIRMED` | A personal Worker gateway uses a revocable scoped device token; the app never stores the R2 API Secret. Backups are client-encrypted with recovery-password or recovery-file restore. |
| Browser automation | `CONFIRMED` | Manual backup is always available. Automatic backup is a separate user opt-in that defaults off and may run only after launch or while the app is open; closed-app scheduling, sync, and merge are not promised. |
| Gallery role | `CONFIRMED` | Gallery is the user-facing reusable media/material library. Source modules own why/how a retained asset is used; Chat still owns message-scoped media records. |
| Generated media | `CONFIRMED` | Every image/media generation flow must present a user retention decision before the result becomes durable; rejected candidates remain transient. |
| URL media | `CONFIRMED` | Media type and storage source are separate. A URL may represent an image, sticker, GIF, audio item, or other media without first becoming a local file. |
| Per-result three-way storage choice | `WITHDRAWN` | Do not require `discard / local only / cloud protected` on every generated result; this exposed storage mechanics as a primary workflow. |
| Fixed `8 GB` product budget | `WITHDRAWN` | No fixed budget is approved before real backup-size measurement and a media-retention contract exist. |
| Local keep versus backup | `CONFIRMED` | `Keep` saves locally and admits reusable media into Gallery; it does not upload or opt the item into backup. Backup remains a later user action. |
| Personal image-bed storage | `ACCEPTED FOLLOW-UP` | A separate explicit Gallery action may upload to the owner's image bed and retain the returned URL without a second local binary. Its scoped token is device-local; ordinary `Keep` remains local and no personal media uploads silently. |
| Backup material scope | `CONFIRMED` | Core save data is always complete. One default-on choice includes all locally retained Gallery material; users do not reselect individual assets during backup. |
| Remote media placement | `CONFIRMED` | R2 stores recovery backups only. It does not become the live material library and successful upload never releases local originals. |
| URL backup representation | `CONFIRMED` | Backups preserve the original URL plus minimum descriptive/source metadata, not an exact byte copy. URL records remain included regardless of the Gallery-binary choice. |
| Backup version independence | `CONFIRMED` | Keep multiple versions, but every version is a complete standalone package that can be read and imported without any earlier backup. Delta/incremental dependency chains are excluded. |
| Local export name and destination | `CONFIRMED` | Let the user edit the filename, generate a stable product-name-plus-date default, and use the platform save/share picker for the destination where supported. |
| Backup access surface | `CONFIRMED` | Do not build an internal local backup library. Local files are imported through the platform picker; a connected personal R2 is listed and restored directly inside SchatPhone without a separate Cloudflare download step. |
| In-app R2 deletion | `CONFIRMED` | Deleting in SchatPhone permanently deletes the selected backup object from the connected personal R2. A prominent modal must name the backup, explicitly say the cloud copy is also deleted, distinguish the unaffected current save/other/local files, and require a destructive confirmation. |
| Cloud version retention | `CONFIRMED` | SchatPhone never automatically rotates or deletes personal-R2 backups. Every version remains until explicit user-confirmed deletion; quota pressure may warn or block a new backup but cannot silently remove an existing recovery point. |
| Same-device material preservation | `CONFIRMED` | A restore first reuses exact matching local binaries and does not delete or hide current-only retained Gallery material merely because an older or binary-excluded backup lacks it. |
| Legacy incomplete media | `CONFIRMED` | Valid legacy core data may restore after a clear missing-material summary. Unresolved media remains as a typed placeholder with stored descriptive text where available rather than corrupting or removing the owning record. |
| Backup/recovery engineering contract | `ARCHITECTURE_ACCEPTED` | Complete package, integrity, capacity, staged restore, migration, failure, crash recovery, rollback, and acceptance-test boundaries are frozen in `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md`. |
| Persistence inventory and Repository contract | `BOOK_ACTIVE` | Canonical inventory includes the active Book Repository database/six stores and direct legacy fallback; exact schema, staging, policy, coordination, activation, reopen, and rollback gates pass. |
| Storage runtime implementation | `BOOK_ONLY_DONE` | Book is the sole active Repository owner. Cloudflare connector, media offload, Gallery schema, legacy deletion, garbage collection, and every other owner migration remain unapproved. |
| Unified world-setting architecture | `STAGE_W1_DONE` | `worldId` is distinct from `packId` and save identity. Book owns text, WorldBook owns activation/current-world context, Packs own optional capabilities, and consumers read an immutable shared projection. Persisted world definitions, W2 migration, and switching remain unapproved. |
| Cross-module Mini Scene | `AI_RUNTIME_AND_TEXT_SHELL_DONE_2026-08-19` | Pure contracts plus durable AI artifacts/policies, provider-neutral required-AI generation, Event Runtime registration, and the root Text Presenter are landed and tested. |
| Mini Scene remaining depth | `PARTIAL / SEPARATELY_GATED` | Production event triggering, profile binding, safe Book transforms, HTML sandbox, and source-owner Adapters remain staged outside persistence Batch 2B. |

Current inventory and validation posture:

- 42 route-view files, 19 Pinia stores, 52 Vue components under `src/components`, and 37 JavaScript composables;
- 173 JavaScript files, 93 Vue files, and 171,987 source lines under `src` in the current worktree;
- 214 static unit-test files;
- the 2026-08-09 current Music + ChKSz + Radio Browser + direct/local intake + active-journey Map media worktree passes diff check, governance, lint, 217 Vitest files / 1559 tests, production build, and 12 focused Music/Map Playwright cases across desktop and simulated mobile. Direct Radio Browser inspection returned HTTP 200 with wildcard CORS, and the prior 12-case default/zen system visual gate plus direct browser inspection also pass; the existing MapLibre/jsdom canvas messages remain non-failing test-environment notices;
- the 2026-08-10 Music provider-cache/favorite follow-up passes 44 focused Adapter/Store/View/persistence-inventory tests, full lint, governance, production build, the full 225-file / 1635-test Vitest suite, all 12 desktop/mobile `music-app.spec.js` cases, and manual default-desktop plus 393 x 852 visual/overflow inspection. Store coverage proves 24-hour reuse, expiry refresh, the 50-track LRU boundary, same-track single-flight, and synchronous/asynchronous cached-stream retry;
- the 2026-07-22 architecture baseline passed 185 Vitest files / 1170 tests, lint, production build, both audit scopes, and 56 of 60 Playwright cases with 4 intentional skips;
- release commit `a1418ed` passes lint, 210 Vitest files / 1497 tests, production and Cloudflare builds, governance, focused relay E2E, and remote Pages Run #31294272595; both deployed relay backends have real-provider model/Chat smoke evidence, while named physical-device and independently rerunnable audit proof remain open.

## 2. Landed Architecture Baselines

### Ownership Contracts

- Contacts, Chat Directory, Chat, and relationship runtime have distinct owners;
- Book, WorldBook, World Pack, and Files have distinct owners;
- WorldBook owns current-world identity and activation while Book owns reusable text assets and the World Pack Module owns optional capability definitions; Pack activation is not world selection or content binding;
- Calendar, Reminders, and Map have distinct owners;
- Shopping/Food Delivery, Logistics, Wallet, Assets, and Chat notification references have distinct owners;
- World Hub reviews runtime state without becoming an ordinary record owner.

### Shared Interfaces

- `src/lib/ai.js` is the approved text/conversation provider transport entry, while `src/lib/image-generation-contract.js`, `src/lib/image-generation-api.js`, and `src/stores/imageGeneration.js` own the dedicated shared image-generation transport/configuration/task boundary;
- `src/lib/ai-context-envelope.js` compiles ordered transient stable and dynamic text for Chat, Event, and future world/narrative callers; it is not a memory Store, fact owner, summarizer, or durable prompt log;
- `src/lib/chat-context-budget.js` owns Chat's provider-neutral transient contiguous message-window projection after rich-message normalization; the selected source references and AI text stay aligned for quotes, images, recall, and transport, while stored messages remain unchanged and Event/world owners keep their own priority policies;
- `src/lib/memory-recall.js` owns reusable relevance ranking and character/item budgets for supplied memory projections; Relationship Runtime returns the prompt text and selected memory references through one transient projection, remains the relationship-memory owner, and future world chronology requires its own approved owner;
- `src/lib/memory-consolidation-pressure.js` owns deterministic read-only pressure thresholds, source-reference normalization, and existing-group candidate ordering for owner-supplied memories; Relationship Runtime supplies one target's complete groups and remains the relationship-memory owner, while future world chronology and role-to-role knowledge require separate Owner Adapters and data;
- `src/lib/role-continuity-projection.js` owns bounded stable/dynamic assembly for Contacts-owned role details plus recalled relationship memories; manual details are stable confirmed facts, while event-attached clues require recalled-memory lineage and remain dynamic supporting context;
- `src/lib/role-identity-projection.js` deepens the Contacts-to-Chat seam into one immutable identity projection covering current profile identity, template-labelled concrete values, relationship premise, stable manual details, and recalled event clues without becoming a profile, memory, or social-graph owner;
- `src/lib/world-suite-manifest.js`, `src/lib/world-suite-inventory.js`, and `src/lib/world-suite-owner-adapters.js` provide the reusable World Suite plan, durable coordination inventory, and execution Interface. Suite and independent catalog installation share the same native Owner Adapter; native truth is inspected before and after mutations, so retry repairs an interrupted install/remove checkpoint without repeating an already completed Owner mutation; interrupted batches preserve completed/pending checkpoints; shared, modified, in-use, and historical resources remain protected. The existing System user carrier and current complete-backup `user` section include the bounded inventory, while legacy backups restore it empty;
- `src/lib/book-world-suite-owner-adapter.js` is the first production Adapter. It resolves actual text through the Book Catalog instead of the manifest, persists one native Book asset with explicit resource/catalog/version/fingerprint provenance, and lets independent and Suite origins share that asset. It never claims built-in K-pop defaults or colliding user documents; it separates Catalog version from Book edit version; it treats title/category/format/tag/content edits as user modification; it blocks automatic update while any WorldBook link is enabled and blocks removal while any current or historical link exists; it preserves Book-owned favorite/status/locked state on pristine update; and it advances only after a confirmed legacy or Repository write. Failed writes restore in-memory native truth before coordination inventory can advance;
- `src/lib/map-world-suite-inspection.js` is the Map read-only inspection Module, and `src/lib/production-map-world-suite-inspection-adapter.js` composes Map, Gallery, Event Runtime, and Chat owner evidence behind it. It distinguishes built-in, user custom, correctly Catalog-managed, other-resource, ambiguous, and absent identities; fingerprints managed metadata/topology; and inventories Gallery availability, player places, active/world binding, visibility, Footprints knowledge, current position/place session, active/history Map Journeys, current/history Event references, persisted Chat location cards, and capacity without copying owner bodies. `src/lib/map-world-suite-owner-adapter.js` adds a separately constructed resolver-backed Adapter for shared independent/Suite install/update/remove. It requires existing Gallery-owned material, strictly validates authored canvas places and Catalog identity/version, blocks user edits/current-history references/topology replacement, and never activates or binds. Native readiness is approved, but the default production inspection exposes no mutation methods and the product runtime registers no mutation Adapter;
- `src/lib/music-contract.js`, `src/lib/chksz-music-adapter.js`, `src/lib/music-module-interface.js`, `src/lib/music-playback-runtime.js`, and `src/stores/music.js` own Music normalization, generic JSON, the Radio Browser preset, dedicated ChKSz provider behavior, browser playback, persistence facade, and bounded Chat/Map seams;
- `src/lib/tts-contract.js`, `src/lib/tts-api.js`, and `src/stores/tts.js` own runtime speech normalization, Cloudflare/MiniMax Adapters, device-local configuration/credentials, temporary preview lifecycle, and the future caller boundary defined by `docs/architecture/TTS_MODULE_CONTRACT.md`;
- `src/lib/world-interface.js` now exposes stable compatibility identity separately from narrative, encyclopedia, profile-template, Pack-capability, and diagnostic projections;
- `docs/architecture/WORLD_SETTING_ARCHITECTURE.md` defines the accepted Interface and the separately gated W2 migration from compatibility scope to persisted WorldBook-owned identity;
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
| `FoodDeliveryView.vue` | 10329 |
| `ContactsView.vue` | 5232 |
| `ChatView.vue` | 4776 |
| `HomeView.vue` | 4373 |
| `ChatDirectoryView.vue` | 4122 |
| `WorldBookView.vue` | 4093 |
| `WidgetsView.vue` | 4050 |
| `AppStoreView.vue` | 3647 |

### Central Store

`src/stores/system.js` is 4644 lines and directly imported by 24 of 40 route views. It coordinates settings, appearance, Home, app placement, notifications, API/network, push, world compatibility, automation, reports, and backup-reminder state.

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

### Current-World Identity Compatibility

Stage W1 is complete, while the single-world baseline still has no WorldBook-owned persisted world definition:

- `WorldBookView.vue` and `ContactsView.vue` read stable `legacy_single_world` identity and current templates through the shared Interface;
- WorldBook displays the stable world setting separately from the Pack capability panel;
- WorldBook source links and structured encyclopedia enablement are one current-save global set;
- historical profile templates can retain Pack-shaped aliases, while new explicit saves use the stable compatibility scope sentinel;
- Pack schemas retain legacy Book/encyclopedia/template reference fields only as non-blocking diagnostics.

Preferred response: preserve Stage W1 and do not start W2 until the persisted world-definition schema, complete-backup manifest, deterministic legacy-scope migration, atomic activation, and rollback are separately approved. A world selector or partial per-record migration remains prohibited.

### Type Coverage

There are zero `.ts/.tsx` source files. Existing normalizers and tests are valuable, but high-value shared payloads have no compile-time contract.

Use incremental JSDoc or TypeScript for new/extracted contract modules only. Do not begin a whole-app migration.

## 4. Security And Release Debt

### Backup Credentials

Settings backup exports the full settings snapshot, including `settings.api.key`, in plaintext JSON.

Confirmed product contract:

- complete local migration backup remains a whole-product snapshot and includes configured credentials;
- the product must describe the exported file as sensitive local data before download;
- a future redacted/shareable export may exclude credentials, but it must not silently replace the migration backup;
- encryption remains optional future work and requires an explicit key-management and recovery contract.

Implemented 2026-07-22:

- every complete local backup JSON export asks for explicit danger confirmation before building the payload, Blob, object URL, or download;
- the fixed warning names configured API credentials and private chat, role, and world data, and does not weaken under immersive copy tone;
- cancellation resets the busy state and creates no payload, download, success/failure feedback, backup timestamp, or storage report;
- confirmed metadata-only and whole-asset-package exports retain the v2 shape and configured API key unchanged.

### Dependency Audit

2026-07-22 dependency-maintenance results:

- direct Vite is 7.3.6, with compatible root esbuild 0.28.1 and Rollup 4.62.2; Vue 3.5.27 and plugin-vue 6.0.4 remain unchanged;
- Vitest is 4.1.10 and reuses root Vite 7.3.6; the previous nested Vite 5.4.21, vite-node 1.6.1, and esbuild 0.21.5 packages are removed;
- the isolated Vitest migration first reduced full audit from 14 advisories to 10 and removed the old nested Vite/esbuild critical path;
- normal npm resolution then refreshed only compatible transitive advisory nodes and the required `hasown` child closure, without changing `package.json`, any direct dependency version, override/resolution policy, or major line;
- production audit: 0 vulnerabilities; full audit: 0 vulnerabilities.

2026-08-07 audit repair:

- Pages Run #128 stopped before deployment at `Audit all dependencies` because the lockfile held the transitive `js-yaml` 4.3.0 advisory range;
- normal npm resolution refreshed only `node_modules/js-yaml` to 4.3.1 in `package-lock.json`, with no `package.json`, direct dependency, override, or resolution change;
- production audit and full audit report 0 vulnerabilities; local lint, 209 Vitest files / 1479 tests, and production build pass; remote Pages Run #130 is green and deployed successfully.

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

- the PR/manual CI workflow definition runs Node 24, `npm ci`, separate official-registry production/full audits, lint, unit, build, one Chromium install, and one full product E2E collection;
- the full E2E collection already includes the focused visual-quality cases, uses a dedicated strict port, fails on flaky recovery, and enforces no more than the four existing intentional skips;
- the main/manual-main Pages build definition runs the same gates on a separate strict port before configure/upload, and `deploy` still requires that verified build job;
- E2E/summary failures upload HTML, test-results, and JSON diagnostics for seven days without retaining download or storage-state data;
- no coverage threshold exists;
- local validation and CI both use Node 24.
- remote GitHub execution and a deployed Pages base-path smoke are proven by Run #130 and the live `/schatphone/` browser check;
- Vercel project `shawn-e-s-projects/schatphone` serves the root-path app at `https://schatphone.vercel.app`; commit `a1418ed` deploys restricted per-request OpenAI-compatible targets on the same two routes without making proxy transport the default, and production passed both a no-secret upstream probe and a GitHub Pages real-provider model/Chat smoke;
- the initial Vercel production upload came from the local dirty tree; the `main` commit containing this deployment contract is the reproducible source for automatic later builds;
- the Git-connected Cloudflare Worker/static-assets deployment is live at `https://schatphone.noarry.workers.dev`: `npm run build:cloudflare` builds at `/`, the Worker serves the SPA, two restricted AI proxy routes, and the bounded TTS route, while unknown API routes fail as JSON `404`. Commit `a1418ed` remains the earlier reproducible relay baseline; pre-integration manual version `d9e15cf0-f81f-46dc-bc04-22752547a994` contains the TTS slice and reliability hardening. After integration, the Git-connected `main` build is authoritative and its active version should be verified with Wrangler;
- the local Network UI now keeps Direct selected by default and progressively reveals Compatibility Proxy, optional custom relay URL, credential-routing disclosure, and optional independent proxy-access token. Desktop/Pixel 5 Playwright proves relay URL plus target-header routing, hidden fake credentials, zero horizontal overflow, and zero critical accessibility violations;
- the shared relay restricts dynamic targets to public HTTPS/443 OpenAI-compatible model/chat endpoints, blocks local/private literals and domains, URL credentials, redirects, and loops, bounds request size/time, and applies a best-effort per-runtime rate limit. Origin/fetch metadata spoofing, non-durable global rate limits, and residual DNS rebinding remain explicit production risks; this is not an abuse-proof gateway;
- external branch/environment required checks, installed-PWA/relaunch, and named true-device evidence remain unverified, so this release slice is partial. The deployed dynamic-relay smoke is complete; higher-volume exposure still needs durable authentication or global rate limiting.

## 5. Completed Governance Rounds

### 2026-07-22 Compatible Transitive Advisory Refresh

1. refreshed only the approved advisory nodes and required `hasown` child closure through normal npm resolution;
2. kept `package.json`, Vite 7.3.6, Vitest 4.1.10, plugin-vue 6.0.4, Playwright 1.60.0, jsdom 24.1.3, ESLint 9.39.2, Vue Test Utils 2.4.6, and eslint-plugin-vue 9.33.0 unchanged;
3. used no override/resolution or direct/major dependency migration and left production/full audit at 0/0;
4. passed lint, 185 Vitest files / 1170 tests, production build, and 60 collected Playwright cases with 56 passed and 4 existing project-specific skips.

### 2026-07-22 Vitest 4 Isolated Migration

1. confirmed through the official npm registry that Vitest 4.1.10 is the current stable 4.x release, supports Node 20/22/24, and peers with Vite 7;
2. updated only Vitest and its required lockfile dependency tree, leaving Vue, plugin-vue, root Vite 7.3.6, esbuild 0.28.1, and Rollup 4.62.2 unchanged;
3. replaced the old test-body `vi.stubEnv` module-reload assumption with a test-mode-only Vite define so the same environment-default assertions remain valid under Vitest 4/Vite 7;
4. preserved the then-current complete unit and Playwright baselines and passed lint plus production build;
5. kept production audit clean and reduced full development audit from 14 advisories to 10, with no critical advisory remaining.

### 2026-07-21 Vite 7 Compatible Patch

1. confirmed through the official npm registry that Vite 7.3.6 is the current compatible Vite 7 patch and preserves the existing Node engine floor;
2. updated only the direct Vite range and its compatible root esbuild, Rollup, `@types/estree`, platform packages, and lockfile metadata;
3. kept Vue, plugin-vue, Vitest, and the nested Vitest Vite/esbuild line unchanged;
4. passed governance, lint, 173 Vitest files / 1071 tests, production build, and 34 Playwright scenarios;
5. kept the full development audit explicit at 14 advisories while the production audit remains clean.

### 2026-07-16 Workflow Layering

1. reduced `AI_WORK_MODE.md` from a universal implementation workflow to a thin cross-task execution contract;
2. delegated domain reading order, workstreams, validation detail, and documentation sync to the seven task packages;
3. kept event/runtime and visual/IA skill routing inside their specialist workflow documents;
4. removed the stale Contacts reference to a local workflow skill;
5. extended governance tests to prevent task-specific routing and specialist skills from moving back into the cross-task contract.

### 2026-07-14 Workflow Governance

1. retired `schatphone-workflow` so a workflow or skill cannot make itself mandatory or prove its own correctness;
2. retained `AI_WORK_MODE.md` as the central process authority and added root `AGENTS.md` as a short bootstrap;
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

### P0: 4.5-CMG Cross-PC Execution Handoff

Canonical ledger: `docs/roadmap/TODO_ROADMAP.md`, subsection `4.5-CMG Shared Experience, Memory, And Durable History Governance`.

Current execution record:

| Field | Value |
| --- | --- |
| Plan baseline | `CMG-00 DONE 2026-08-20` at `fef7989`; `CMG-01 DONE 2026-08-20` at `73672df`; `CMG-02 DONE 2026-08-20` at `208e1dc`; `CMG-03 DONE 2026-08-20` at `86270d8`; `DCF-05 DONE 2026-08-20` at `f140557`; `DCF-03 DONE 2026-08-21`, behavior at `42742e5` and regression evidence at `e9607c0`; `CMG-04 DONE 2026-08-21` at `134f7f7` |
| Next dependency-safe items | `CMG-05` may now be claimed; `CMG-08` and `DCF-06` remain separately assignable only after an exact non-overlapping reservation |
| Active item | `NONE` |
| Integration controller PC | `SKY-20250212UBG` |
| PC-A physical machine / role | `SKY-20250212UBG` / integration controller; no implementation item currently claimed |
| PC-B physical machine / role | `UNASSIGNED` |
| Source branch, base, and worktree | `main`; last completed implementation `134f7f7`; `D:\github\schatphone` |
| Existing dirty/untracked inventory | User-owned `docs/design/MAP_PLACE_DETAIL_UI_REVIEW.md`; unrelated `tmp/**` experiments and `tmp/vitest-out.txt`. The Calendar appearance work was independently integrated at `4172741` during this round. Preserve and never stage remaining user files. |
| Risk lane | No active implementation slice. The next executor must reassess from the synchronized remote base, preserve unrelated dirty files, and reserve non-overlapping paths before editing. |
| Reserved paths | `NONE` |
| Acceptance | `CMG-04` acceptance is met: hospital and birthday memories stay separate; later clinic/hospital detail updates one hospital memory with both exact sources; unknown subjects stay separate; legacy generic memory remains readable. |
| Required checks | The next item must record its own focused and full checks before implementation. This completion-only documentation round requires governance and `git diff --check`. |
| Integration state | `CMG-04 DONE 2026-08-21`; implementation `134f7f7` is integrated on `main` |
| Remote synchronization | Implementation `134f7f7` is present on `origin/main`; this completion record must be pushed before another PC claims the next item |

For every item start, replace the current execution record with the task ID, executor PC, worktree path, branch, exact base commit, dirty/untracked inventory, risk lane, reserved paths, acceptance, and required checks. For every workgroup handoff, record the source commit and `READY_FOR_INTEGRATION_REVIEW` without changing the roadmap row to `DONE`. After integration and controller validation, append a compact completion entry below and update the canonical ledger with the date and evidence commit.

Completion log:

1. `CMG-00 DONE 2026-08-20`: accepted the one-shared-experience model, separated role memory from supporting owner records, inventoried all confirmed defects, froze dependency order and two-PC execution rules, and changed no behavior code. Validation belongs to this documentation round.
2. `CMG-01 DONE 2026-08-20`: implementation `73672df` added `shared-experience-contract.js`, the Xia gift fixture, and five focused tests. One continuing gift experience now has three ordered progress updates and one concise role memory while Shopping, Wallet, Calendar, and Phone records stay separately owned and stably referenced. No runtime caller or persisted data was changed. Full-suite load also reproduced and logged `DCF-06`; the previously planned `DCF-05` remains open.
3. `CMG-03 DONE 2026-08-20`: implementation `86270d8` removed System Store relationship stage/metrics and warm/conflict timestamps from Chat prompts. Bounded Chat activity remains, Contacts premise stays labelled as premise, and the same transient Relationship Runtime projection supplies the one current relationship answer plus recalled memory references. No persisted state or visible page changed.
4. `DCF-05 DONE 2026-08-20`: implementation `f140557` added deterministic deferred-mirror completion evidence and replaced fixed-delay test guesses with actual write-start and idle signals. The waiter includes writes queued while a slow batch is active; Store schemas, saved payloads, and synchronous write-success meaning remain unchanged. The target test passed 10 consecutive runs and inside the full suite; the only full-suite failure remains the separately tracked `DCF-06` image-bed tooling timeout, which passed alone.
5. `CMG-02 DONE 2026-08-20`: implementation `208e1dc` makes the named Relationship, Event Instance V2, Mini Scene, and Food Delivery actions report success only after confirmed persistence. Quota, read-only, and reconciliation failures restore pre-action state; stable-ID retry reuses the committed result without duplicate owner records. No schema, retention cap, provider-call reuse, or route/UI behavior changed. Focused coverage passed; full Vitest reproduced only tracked `DCF-06`, which passed alone at 13/13.
6. `DCF-03 DONE 2026-08-21`: behavior source `42742e5` makes Settings ringtone preview and real incoming calls follow the same `ringtoneEnabled` switch rather than the unrelated system sound-effects switch. Regression evidence `e9607c0` covers preview playback with system effects off and preview disablement with ringtones off. Focused tests, 2/2 Phone audio Settings Playwright, lint, 300-file / 2114-test full Vitest, production build, governance, and diff checks passed. No ringtone media, phone call-audio profile, keypad tones, or Calendar behavior changed.
7. `CMG-04 DONE 2026-08-21`: implementation `134f7f7` replaces the one generic new-disclosure memory bucket with conservative subject-aware keys. Hospital and birthday facts stay separately recallable; later clinic/hospital detail updates the same hospital memory and retains every exact Chat message source. Unknown subjects stay separate, and legacy `chat_disclosure__user_shared` data is neither migrated nor deleted. Focused tests passed 4 files / 45 tests; lint, production build, governance at 2 files / 14 tests, and diff checks passed. Full Vitest passed 299/300 files and 2115/2116 tests; only tracked `DCF-06` timed out at 5 seconds, while that file passed alone at 13/13 in 2.44 seconds. No UI, ordinary-message scan, AI-candidate activation, relationship metric, or persistence shape changed.

`CMG-04` is complete, so `CMG-05` may be claimed next. Do not begin `CMG-06` or remove the 500/240/120 caps before `CMG-05` and the named persistence, migration, rollback, pagination, and long-run gates are accepted. Open direct fixes `DCF-01`, `DCF-02`, `DCF-04`, and test repair `DCF-06` may run independently on PC-B only after exact paths are reserved and the controller confirms a non-overlapping base.

The 2026-07-22 product-release audit changes that order through roadmap 4.9:

1. personal R2/Worker onboarding is post-release because remote transport cannot repair an unsafe local write or an incomplete local recovery package;
2. structured write results, newest-valid local/mirror reconciliation, product-level save-failed/read-only recovery, and the product-wide same-container writer boundary are integrated foundations;
3. `DONE 2026-08-09`: the release-local v3 backup/restore/reopen boundary covers required Chat identity/avatar state, default-on retained Gallery material, integrity verification, durable rollback checkpoints, startup crash recovery, and legacy compatibility;
4. first Chat activation and the explicit custom-role-to-Chat journey are already product-side complete; remote CI/Pages, the deployed `/schatphone/` smoke, and the Git-connected Vercel plus Cloudflare Worker/static-assets `a1418ed` restricted relays are complete with real-provider model/Chat smoke. Deployed PWA/install/offline and named true-device backup evidence still close the public-release gate;
5. Gallery schema, non-Book Repository cutovers, production push, hotspot decomposition, incremental typing, Mini Scene, and World Setting W2 remain post-preview unless a current product blocker requires a separately approved slice.
6. roadmap 4.10's Camera/shared-image-generation first slice is complete; the new Chat/Network compatibility relay does not automatically become Camera image-generation transport. Gallery People truth, source-module callers, true-device checks, and hosted image-provider smoke require separate promotion.
7. `DONE 2026-08-12`: Book, Gallery, and Map now have production-backed World Suite Owner Adapters. Book retains real Store/Repository persistence, Catalog provenance, collision/capacity/read-only protection, WorldBook reference review, and exact rollback. Gallery adds stable folder/URL-asset packs, pack/asset provenance, duplicate ID/URL protection, other-folder/native-use review, and transactional create/update/delete. Map retains production-composed body-free Map/Gallery/Event/Chat inspection, stable Catalog-authored places, topology/reference protection, and transactional mutation. One typed/versioned Book/Gallery/Map Catalog plus `map-gallery-world-suite-runtime.js` and `production-world-suite-runtime.js` now compose real Store preview/install/uninstall, dependency order, independent/Suite reuse, receipt-gated System checkpoints, serialized operations, reopen proof, and retry without duplicate Owner mutation. The default standalone Map inspection remains read-only, and there is still no built-in K-pop Catalog/manifest, startup caller, UI, activation, world binding, relocation, or Journey mutation. Do not start WorldBook/System or Event Runtime mutation work, whose current write paths still combine activation/current-world or runtime-registration meaning.
8. Contacts remains the concrete role-profile Owner and Relationship Runtime remains the relationship-memory Owner. The next relationship-network work should add read projections over existing role IDs and confirmed facts rather than create another role Store. Reuse deterministic recall and pressure Modules separately for relationship memory, future world chronology, and future role-to-role knowledge; do not enable automatic replacement summaries, a mixed global memory Store, or separate role/world provider settings before a real background-world runtime is approved.

### P0: Current Save Safety And Complete Local Recovery

Status: `DONE 2026-08-09` for the roadmap 4.9 release-local boundary; write-result, local/mirror freshness, product-level failure recovery, same-container read-only enforcement, and complete v3 local export/restore/crash recovery are implemented.

Completed release-local slice:

- v3 requires all 27 current backup sections, including Chat identity/avatar state, and writes canonical per-section, payload, manifest, and Gallery-binary SHA-256 evidence;
- whole-Gallery material is default-on and fail-closed: missing, unreadable, corrupt, or skipped retained binaries stop complete export or required restore;
- import verifies before current-save mutation, durably stages a clone-safe metadata-plus-binary rollback snapshot in the existing Repository journal, preserves current-only Gallery material during older restore, closes successful/failed checkpoints, and rolls back unfinished restore work before mount;
- desktop and simulated-mobile Chromium prove sensitive export, Chat identity round trip, completed-log reopen, interrupted-restore rollback, and blocked-IndexedDB fail-closed startup; the full E2E suite passes with 128 tests and four intentional skips.

Next coherent architecture work remains separate: predictive capacity reporting, independent inventory-to-registry closure, broader cross-owner Repository generations, local destination confirmation, legacy unavailable-media presentation, and personal R2/Worker transport. None reopens the completed roadmap 4.9 release-local gate unless release evidence exposes a blocker.

`DONE 2026-08-07`: one page-level current-save writer is acquired before reconciliation and Store mount. A later same-container page times out into the existing read-only recovery state, inspects all 17 targets without repair, and cannot mutate layered sync/async/deferred mirror carriers, Book Repository/legacy writes, Gallery binaries, or image-generation credentials/candidates. Releasing the first page permits retry and captured owner writes; unchanged heads persist, while a head changed by the former writer remains reconciliation-blocked. Focused Vitest and real two-page Chromium cover cross-owner zero-write behavior, fallback heartbeat lease loss, retry, and stale-head rejection. Store snapshots, envelopes, Repository schema, backup format, force takeover, and last-write-wins remain unchanged.

`DONE 2026-08-09`: same-container development and preview pages now preserve the same single-writer boundary without presenting ordinary occupancy as save corruption. `timed_out` current-save acquisition is surfaced as `active_writer`; the later page uses a calm read-only-preview status with only safe retry/reload actions; page exit cooperatively releases the writer; and bounded BroadcastChannel release metadata triggers captured-write retry automatically. The Web Lock or fenced fallback lease remains authoritative, so simultaneous waiting pages promote at most one writer and leave the rest read-only. Focused Vitest passes 47 cases across the coordinator/runtime/status/UI/bootstrap files, and real Chromium passes the two-page zero-write/automatic-release flow plus the existing save-failure and frozen-conflict recovery cases. Persisted shapes, backup formats, Repository schema, force takeover, merge, and last-write-wins remain unchanged.

`DONE 2026-08-07`: sync and async layered write failures plus Book Repository failures now enter one non-persisted product status. The root shell distinguishes primary-save failure, read-only conflict, and local-primary/mirror-degraded states; retryable incidents can retry their captured owner write, successful writes clear only their matching incident, and non-retryable errors do not expose false retry. Reload-current-save requires destructive confirmation, and the emergency action opens the existing Settings complete-backup section instead of inventing a second backup owner. Desktop Chromium and simulated Pixel 5 failure injection prove quota recovery, unresolved zero-write conflict, backup handoff, 44px actions, viewport containment, and no horizontal overflow. Envelope, Store, Repository, and backup formats are unchanged; broader same-container WriteCoordinator coverage and complete recovery remain open.

`READY_FOR_INTEGRATION_REVIEW 2026-07-22`: the approved write-result primitive now returns stable structured results from the existing synchronous and asynchronous persistence entrypoints. Serialization, quota, security, unavailable-carrier, and IndexedDB mirror failures are classified; failed writes retain the last confirmed bytes; asynchronous results expose local primary and mirror outcomes separately. Focused failure-injection coverage and the full lint/unit/build baseline pass. Existing Store callers may continue ignoring the return value. Store/UI adoption, read-path reconciliation, broader WriteCoordinator coverage, complete recovery, and local/mirror authority decisions remain separate slices.

`DONE 2026-07-22`, inventory extended 2026-07-29: the approved local/mirror freshness foundation adds optional lineage/sequence envelope metadata, applies clock-independent frozen winner/conflict rules, re-reads heads before repair, verifies repaired bytes, rejects mirror regression and sequence overflow, and blocks later writes when reconciliation is unresolved, including a semantic conflict detected by deferred mirror flush. Inspection separates payload validity from ordering validity and carrier applicability from availability: malformed generation remains readable-unordered, a disabled mirror is not applicable, and an enabled but unavailable mirror degrades/forks and reports async failure. Partial local-repair failure keeps the proven mirror winner available through Store fallback, while unresolved conflicts return null and remain write-blocked; sync and async generation exhaustion retain the non-retryable generation result. `main.js` performs a bounded preparation before Pinia Store creation/mount from the independent 17-target inventory; `store:book` is repository-owned inspect-only and remains byte-identical, while the other 16 layered owners may reconcile. Focused Vitest and real-Chromium coverage prove reversed-clock mirror recovery, stable reopen, corrupt/absent/unavailable handling, zero-write conflicts and legacy ambiguity, source-change/partial-repair behavior, bootstrap ordering, and blocked-IndexedDB timeout. This foundation itself added no Store/UI/WriteCoordinator/backup/Repository migration; its structured results are now consumed by the separate 2026-08-07 product-level recovery slice above.

### P0: Local Persistence, Backup, And Data Lifecycle Architecture

Status: `IN_PROGRESS`; the non-active foundation and separately approved Book-only application cutover are complete, while every non-Book migration/cutover remains unapproved.

1. `READY_FOR_CONTROL_REVIEW 2026-07-21`, extended 2026-07-29: independently classify authoritative, auditable, rebuildable, binary, secret, hint, and transient data and connect the 17-store diagnostic projection;
2. `DONE 2026-07-18`: translate the confirmed local-keep, whole-Gallery option, URL-only backup, recovery-only R2 role, default-off automation, platform save/share behavior, and direct in-app R2 restore view into testable implementation acceptance;
3. `DONE 2026-07-18`: translate complete-package, explicit R2 retention, backup-size/quota, creation/delivery failure, integrity, staged restore, legacy degraded recovery, local-material reuse, migration, crash recovery, and rollback into testable acceptance;
4. `ARCHITECTURE_ACCEPTED 2026-07-21`: the owner-aware Repository Interface, exact separate IndexedDB v1 stores/keyPaths/indexes, immutable record versions and generation membership, atomic pointer/journal, localStorage hints, contextual persistent-storage request, read-only multi-tab conflict behavior, and rollback gates are accepted;
5. `DONE 2026-07-18`: freeze complete standalone backup objects, manifest/integrity checks, non-destructive Gallery resolution, local save/share delivery states, staged atomic activation, rollback, and legacy snapshot migration in `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md`;
6. preserve the provider-neutral remote-backup and Cloudflare R2 onboarding acceptance as post-release architecture work under the confirmed Worker, encryption, recovery, and browser-scheduling boundaries;
7. `DONE 2026-07-22`: implemented the exact non-active Batch 2B Adapter/schema/fixture/test list, including `e2e/persistence-repository-foundation.spec.js`, without Store import, cutover, dual write, or activation;
8. `DONE 2026-07-22`: implemented the separately approved Book-only runtime cutover with explicit in-context permission flow, fenced atomic activation, normal-Adapter reopen verification, automatic first-cutover rollback, Repository-only later writes, byte-identical retained legacy data, awaited backup-restore persistence, and focused Chromium coverage; the section-6/10 activation, reopen, rollback, backup, and product-equivalence gates pass, while Mini Scene persistence/policy remains a separate roadmap 4.8 decision.

Cross-package dependencies:

- Contacts owns global role lifecycle and archived-role recovery semantics;
- Relationship Runtime remains the sole owner/writer of persistent relationship truth and audit evidence;
- Event Runtime owns event/proposal definitions and provenance while its ontology remains extensible;
- Chat owns conversation records and thread behavior only, including future paused-thread read-only enforcement.
- Gallery owns reusable retained media and cross-module asset references; source modules own generated-candidate meaning and the records that use accepted media; Settings owns backup controls and status, not media truth.

### P0: Security/Toolchain After The Storage Contract

1. `DONE 2026-07-22`: add the confirmed sensitive-file warning before every complete JSON export without changing complete-migration contents or adding a shareable variant;
2. `DONE 2026-07-21`: update the compatible direct Vite 7 patch and required root transitive dependencies;
3. `DONE 2026-07-22`: migrate Vitest independently to 4.1.10 and remove the nested Vite 5/esbuild advisory chain without reducing test coverage;
4. `DONE 2026-07-22`: refresh the remaining compatible transitive advisory nodes through normal npm resolution and close production/full audit at 0/0 without direct, override, or major changes;
5. `DONE 2026-07-22`: define the full-product E2E and separate production/full dependency-audit workflow policy independently from completed dependency remediation.

### P1: Release Gate

1. `WORKFLOW_IMPLEMENTED 2026-07-22`: PR verification and main Pages build now define the same full fail-closed gate while preserving focused visual coverage inside the full E2E suite;
2. `DONE 2026-08-07`: verify the remote main Pages workflow. Run #130 passed its fail-closed build gate and `deploy` job for `9c263cb`; external main required-check and `github-pages` environment-protection policy remain separately unverified.
3. `DONE 2026-08-07`: smoke the deployed `/schatphone/` artifact through lock -> Home -> Map, including the manifest, base-path route, map rendering, console-error, and horizontal-overflow checks.

### P1: Cross-Module Mini Scene Foundation

Status: `STAGE_1_DONE / AI_RUNTIME_AND_TEXT_SHELL_DONE_2026-08-19 / PRODUCTION_TRIGGER_AND_HTML_GATED`.

1. `DONE 2026-07-21`: pure Stage 1 request/draft/artifact/profile/module-policy schemas, dynamic caller registry, world/profile resolver, Book structured-profile validator, and 22 focused tests;
2. `DONE 2026-08-19`: persist bounded artifacts/policies/bindings/audit through `store:mini-scene` V1 and include them in complete-backup v4 plus rollback/crash recovery while retaining v3 manifest verification;
3. `DONE SHELL 2026-08-19`: register Event Runtime as the only functional caller, require an injected AI provider and exact HTML-free structured Draft with provider provenance, fail closed without a deterministic substitute, and expose a global Text Presenter plus bounded owner-validation choice request;
4. `REJECTED AND REMOVED 2026-08-19`: Calendar V4 carrier fields, Calendar generator entry, and deterministic Calendar scene construction. Calendar remains V3 and Settings edits presentation form only;
5. preserve the absence of regex execution, iframe rendering, profile-binding UI, and production Map/Chat/Agenda Journey/Event Instance triggers; add each separately through its accepted owner/runtime Adapter.

### P1: Unified World Setting Identity

Status: `STAGE_W1_DONE / STAGE_W2_NOT_APPROVED`.

1. `DONE 2026-07-22`: accept `docs/architecture/WORLD_SETTING_ARCHITECTURE.md` without widening it into persisted world definitions or multi-world switching;
2. `DONE 2026-07-22`: deepen the current world Interface so `legacy_single_world` identity is stable and Pack capability state is a separate projection;
3. `DONE 2026-07-22`: route WorldBook and Contacts reads through the Interface; new template/contact writes use the stable compatibility sentinel instead of Pack IDs;
4. `DONE 2026-07-22`: prove Pack changes cannot change identity, Book links, encyclopedia selection, or profile-template selection, and make missing legacy content references non-blocking;
5. preserve unchanged System/Book schema and complete-backup bytes from Stage W1;
6. require a separate Stage W2 schema/migration/rollback review before persisting WorldBook-owned world definitions.

### P1: One Architecture Seam

With Stage W1 complete, the following remain unapproved comparison candidates, not accepted architecture and not approval for any Calendar carrier change:

- a `systemStore` facade;
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
9. do not treat the current IndexedDB mirror as the primary database or as proof that `localStorage` capacity is no longer a constraint.
10. do not introduce SQLite-only assumptions while browsers/PWAs remain complete first-class clients.
11. do not solve capacity pressure by silently deleting authoritative history, accepted relationship evidence, user documents, or referenced assets.
12. do not turn AI diagnostics, API reports, backups, or audit records into an undeclared permanent copy of full prompts or raw provider responses.
13. do not classify durable content by today's module list or discard an AI-generated post, scene, long-form record, performance record, or state history after its owner has formally committed it.
14. do not make `keep` upload media or silently opt it into backup.
15. do not add a per-item material picker to the backup flow; Gallery admission is the curation step and backup uses one whole-library choice.
16. do not implement delta/incremental backup chains in which one restore version depends on another.
17. do not use successful remote backup as permission to release local originals.
18. do not create a hidden or user-facing in-app local backup library; local export files remain owned by the platform file system.
19. do not require users to visit the Cloudflare dashboard before restoring a backup that SchatPhone can access through the configured personal R2 connection.
20. do not label R2 deletion as a generic `delete` or treat it as hiding a list row; the action must say it permanently deletes the connected cloud backup.
21. do not remove the row locally until the personal Worker confirms that the R2 object deletion succeeded.
22. do not rotate, expire, or delete any local export or personal-R2 backup automatically; capacity pressure may block creation and request user action, but it cannot authorize silent cleanup.
23. do not let an older restore delete or hide current-only retained Gallery material, and do not attach a local binary by filename, label, prompt, or URL without exact identity/digest evidence.
24. do not label a missing-media placeholder as a recovered original or discard the owning message/record because its binary is unavailable.
25. do not treat acceptance of `BACKUP_RECOVERY_ENGINEERING_CONTRACT.md` as approval for IndexedDB, R2, Gallery schema, or reference-migration implementation.
26. do not add Mini Scene runtime, persistence, Settings fields, regex execution, or popup UI to the approved persistence Batch 2B file set.
27. do not execute raw AI HTML, Book/profile HTML, or legacy Chat `htmlSnippet`, and do not run unbounded native regex on the UI thread.
28. do not let Book/WorldBook/World Pack activation or a caller hint silently override an explicit per-module Mini Scene mode.
29. do not make a K-pop profile, a sensitive-content choice, or World Pack membership a prerequisite for custom-world Mini Scenes.
30. do not persist `activeWorldPackId`, `default_world`, or another Pack ID as canonical `worldId`.
31. do not let Pack activation switch world identity or bind Book sources, encyclopedia entries, profile templates, sensitive choices, or Mini Scene policy.
32. do not implement future world definitions as internal save slots, workspace switching, cross-container discovery, sync, or merge.
33. do not begin a partial persisted-world migration before every world-sensitive owner has an explicit global/world-scoped/portable classification and rollback path.
34. do not treat a requested prompt cache key, an Event Instance's reused terminal copy, or absent provider usage as proof of a provider cache hit.
35. do not let deterministic recall become an undeclared memory Store, automatic summarizer, role-to-role knowledge graph, or world-timeline owner.
36. do not treat a memory-pressure candidate as an approved replacement summary, archive/delete instruction, persisted queue, or cross-owner merge; original evidence and existing review/rollback semantics remain authoritative.
37. do not let a World Suite become a second owner or copy of Book, WorldBook, Map, commerce, Chat, Event, Calendar, Music, Gallery, or Mini Scene resources; every resource must keep a stable native ID and independent install path.
38. do not equate Suite installation with activation or delete owner history on Suite uninstall; shared, modified, in-use, or historically referenced resources must be retained or explicitly reviewed.
39. do not let a World Suite inventory row stand in for native owner truth, copy a native resource body, or mark current defaults as Suite-installed without verified provenance.

## 8. Validation

Current `CMG-04` validation on 2026-08-21:

- focused Chat disclosure, Relationship Adapter, and Runtime coverage passes 4 files / 45 tests;
- ESLint, production build, governance at 2 files / 14 tests, and `git diff --check` pass;
- full Vitest passes 299/300 files and 2115/2116 tests. The only failure is tracked `DCF-06`, where `tests/imgbed-publishing-tooling.test.js` exceeded its 5-second full-suite limit; that file passes alone at 13/13 in 2.44 seconds;
- no route or visible control changed, so no new Playwright path was required.

Current TTS-1 validation on 2026-08-10:

- 4 focused Vitest files / 22 tests pass for the Cloudflare/MiniMax Adapters, Store, settings view, and Worker, including the new MIME, language, retry, non-retry, and cancellation boundaries;
- the focused Playwright route passes in desktop Chromium and simulated Pixel 5, including device-secret separation and horizontal-overflow checks;
- production build, governance, `git diff --check`, focused ESLint, standalone persistence-write regression, and Wrangler dry-run with the `AI` binding pass;
- Wrangler OAuth and account identity were verified, pre-integration manual Worker version `d9e15cf0-f81f-46dc-bc04-22752547a994` was deployed, and the live route reached the Workers AI binding;
- live probing found that SchatPhone's public `zh` must map to MeloTTS's provider-native `ZH`; the mapping is implemented and test-protected. One authorized Chinese diagnosis returned 87,398 WAV bytes with a `RIFF`/`WAVE` signature, exposing and motivating the previous MIME correction. Two bounded post-deployment Chinese requests returned `502 TTS_PROVIDER_UNAVAILABLE`, consistent with the earlier provider-side `3043 Internal server error`, so stable end-to-end quality/playback proof remains open;
- the final isolated full-suite run passes 225 files / 1624 tests. The TTS-focused tests, lint, production and Cloudflare builds, governance, desktop/mobile Playwright, Wrangler dry-run, and diff check also pass.

Required for every meaningful 4.5 slice:

- `npm.cmd run governance:check` when workflow, active documentation, task packages, or skills change;
- targeted tests for the new interface/migration;
- `npm.cmd run lint`;
- `npm.cmd run test`;
- `npm.cmd run build`;
- Playwright when routes or user flows are affected;
- dependency audit when the lockfile changes.

Current World Suite foundation validation on 2026-08-12:

- the current focused continuity/World Suite baseline passes 31 Vitest files / 232 tests. It covers role identity/continuity, prompt cache evidence, image-reference natural fallback, context envelopes and budgets, deterministic recall/pressure, Relationship Runtime integration, Book legacy/Repository mutation, Gallery native asset packs, Map inspection/native mutation, typed Book/Gallery/Map Catalog isolation, explicit real-Store runtime composition, independent/Suite origin reuse, dependency order/reversal, full reopen, malformed input rejection, concurrent-operation exclusion, partial retry, history-safe uninstall, reference/topology protection, fail-closed Owner receipts, and receipt-gated System checkpoints;
- project lint, production build, governance, focused ESLint, and `git diff --check` pass on 2026-08-12;
- the earlier parallel full-suite run exposed two stale test assumptions: Appearance still expected Home desktop setup version `5` after the integrated Home/Widgets contract advanced to `6`, and the real child-process image-bed CLI test retained the default 5-second timeout. Both test contracts are now aligned with the implemented behavior and the CLI test has a bounded 15-second timeout; the final full-suite result is recorded with this integration's validation evidence. Existing jsdom Map canvas stderr remains non-failing test noise;
- the final K-pop Catalog/manifest, startup registration, later Owner integrations, activation UI, App Store/WorldBook presentation, and retroactive provenance migration remain unimplemented. The expanded slice includes Gallery-native managed packs, a typed Book/Gallery/Map Catalog, explicit Map/Gallery and production real-Store runtime composition, body-free Map/Event/Chat reference inspection, transactional native mutations, stable authored places/assets, dependency reversal, topology migration protection, receipt-gated System checkpoints, serialized operations, and retry after a lost checkpoint. Product install/update/remove has a tested use-case Module but remains unreachable from the shipped UI/startup graph; the ordinary standalone Map inspection still exposes only `owner + inspect`.

## 9. Must Sync

1. this file and package README;
2. `docs/roadmap/TODO_ROADMAP.md`;
3. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`;
4. `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`;
5. `docs/roadmap/PROJECT_MODULE_AUDIT.md`;
6. `docs/architecture/ARCHITECTURE.md` and debt review when evidence/semantics change;
7. `docs/pm/TODO_PM_STATUS_REPORT.md` when priority or release posture changes.
8. `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md` when complete-package, integrity, capacity, restore, migration, or rollback acceptance changes.
9. `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` and the relevant source/presentation/runtime package handoff when Mini Scene Interfaces, world resolution, Book transforms, presenters, persistence, or calling-module meaning changes.
10. `docs/architecture/WORLD_SETTING_ARCHITECTURE.md` when world identity, Book/WorldBook ownership, Pack capability meaning, consumer projections, complete-backup references, or migration gates change.
11. `docs/architecture/MUSIC_MODULE_CONTRACT.md` when Music provider, playback, credential, persistence, backup, or Chat/Map Interface meaning changes.
12. `docs/architecture/TTS_MODULE_CONTRACT.md` and `docs/process/TTS_PROVIDER_SETUP.md` when speech providers, credentials, Worker deployment, persistence, preview media, or caller meaning changes.
