# Module Architecture Governance Package

Updated: 2026-08-21

Use this package for state ownership, persistence, security/toolchain maintenance, CI/release confidence, refactor planning, module maturity, and architecture debt.

Current state:

- domain ownership and shared `lib` contracts are strong enough to preserve;
- browsers and installable PWAs are confirmed as complete first-class clients, with one isolated storage container owning one current save;
- authoritative histories and relationship evidence require explicit user deletion; automatic capacity management is limited to reversible archival/compaction or rebuildable data. A complete Mini Scene is optional presentation history and may be explicitly removed without removing its event result or memory projections;
- roadmap 4.5-CMG is the active cross-PC governance plan for shared experiences, role memory, Event Instance and Mini Scene retention, confirmed persistence, and the audited direct defects. `TODO_ROADMAP.md` owns every item status; this package owns the current execution handoff and does not duplicate the ledger;
- formally committed canonical module content is durable regardless of user/AI/system origin; full AI prompts/raw responses, uncommitted drafts, and rebuildable projections remain temporary, while canonical content, authoritative state/facts, references, and minimum provenance persist. A generated Mini Scene stays temporary until the user explicitly retains the complete presentation;
- optional remote backup is personal BYOS rather than one shared project cloud: Cloudflare R2 is the first officially guided target, each user owns a separate destination and personal Worker gateway, SchatPhone never retains the R2 API Secret, and browser/PWA automation is limited to launch and open-app execution;
- personal remote backups are client-encrypted and use dual recovery: either a recovery password or separately downloaded recovery file can restore, while Cloudflare/Worker receives neither plaintext secret;
- the Gallery/material-library preservation contract now keeps accepted media locally first, separates `keep` from backup, uses one default-on whole-library inclusion choice instead of per-item backup selection, preserves URL sources as URLs, and keeps R2 backup-only rather than releasing local originals;
- manual backup remains available while automatic backup is an explicit default-off opt-in; multiple local or remote versions are allowed, but every version must be a complete standalone importable package rather than an incremental dependency chain;
- local export naming and destination use a user-editable product-name-plus-date default and the platform save/share flow;
- SchatPhone keeps no internal local backup library, but a configured personal R2 must be directly visible for in-app backup selection and restore so users do not have to operate the Cloudflare dashboard;
- explicit in-app deletion permanently deletes the selected connected-R2 backup and requires an unmistakable cloud-deletion warning; it is not a local hide action;
- SchatPhone never rotates or deletes personal-R2 backups automatically; every version remains until explicit user-confirmed deletion, even when quota pressure prevents another backup;
- the complete-backup/recovery engineering contract is accepted: new complete versions require manifest/section/binary integrity, capacity preflight, staged atomic activation, crash-safe rollback, and explicit failure states; Book is the first and only migrated owner;
- the canonical persistence-owner inventory now classifies all current store, mirror, binary, direct-local, and session carriers independently from backup coverage; Settings diagnostics consumes its 17-store projection, including Book and public image-generation configuration;
- roadmap 4.10's first shared Image Generation Module slice is implemented separately from `src/lib/ai.js`: public provider/default/routing state is backup-covered, API keys/proxy tokens and bounded candidates remain separate device-local carriers, and only explicit Gallery keep creates durable reusable media;
- roadmap 4.10 now also accepts a separate personal image-bed Adapter follow-up: an explicit Gallery action may upload to the owner's image bed and retain only the returned URL, while its scoped token remains device-local and ordinary local `Keep` continues to avoid silent upload;
- repository-owned artwork externalization is active under roadmap 4.5: runtime assets use public `schatphone-assets/` URLs, protected masters use `schatphone-source/` only when they are unique, project publishing uses a separate upload/list credential, and offline Git/CI gates prevent future generated media from silently returning to the repository;
- roadmap 4.15's first runtime TTS slice is implemented separately from `src/lib/ai.js` and the ElevenLabs agent Skills: Cloudflare MeloTTS uses the project Workers AI binding, MiniMax uses a user-owned device-local Key for Chinese validation, provider configuration and credentials are separately inventoried device-local backup exclusions, and generated preview audio is runtime-only. The Cloudflare path now exposes only verified `zh`/`en`, detects WAV/MP3 from the returned bytes, retries one temporary provider failure, and presents an explicit outage fallback. The bounded Worker is deployed at `https://schatphone.noarry.workers.dev`; stable provider playback proof remains pending after Workers AI returned provider-side `3043`/`TTS_PROVIDER_UNAVAILABLE` errors during the final recheck;
- Music's module slice is implemented behind `music-contract.js`, `chksz-music-adapter.js`, `music-module-interface.js`, `music-playback-runtime.js`, `music-local-media-storage.js`, `music-provider-cache.js`, and `stores/music.js`: generic JSON, the no-key Radio Browser HTTPS/MP3 live-station preset, and dedicated ChKSz search/on-demand resolution share one normalized boundary. ChKSz supports broader metadata variants, 24-hour memory-only stream reuse with same-track single-flight and a 50-track LRU limit, plus a separate 30-day rebuildable IndexedDB cache for normalized metadata and lyrics; no API Key, resolved stream, or audio byte enters that cache. Cached playback failures invalidate the stream and trigger at most one new resolution. Direct HTTPS URLs persist as Music tracks; imported local binaries use a separate Music-owned IndexedDB carrier and runtime-only object URLs. Public library/provider/import metadata is backup-covered through System settings, while API keys, local audio binaries, and rebuildable provider cache remain device-local backup exclusions. Chat/Map receive bounded references/projections without stream URLs, media IDs, raw queues, or provider secrets. The first Chat caller converts a track payload into a source-owned card through one transient internal-share draft; card return opens details without playback. The first Map caller consumes bounded now-playing/quick-track/station projections during an active journey, while Music retains radio queue, audio runtime, and global floating-player ownership;
- schema v3 local export now creates a self-verifying required-section manifest with canonical SHA-256 evidence, includes Chat module identity/avatar settings and retained Gallery binaries by default, and fails instead of emitting a partial full-material package; legacy v1/v2 imports remain compatible and are never relabeled complete;
- the Repository contract is now `ARCHITECTURE_ACCEPTED` with an exact separate IndexedDB v1 schema, immutable record-version/generation-membership model, atomic pointer/journal, contextual persistent-storage policy, fail-closed multi-tab coordination, and Book Adapter/fixture/rollback contract;
- each isolated browser or desktop Web App storage container remains one independent current save; same-container tabs coordinate one writer plus read-only previews, cooperative release triggers a safe bounded retry, and different entry containers never auto-sync or silently merge;
- the unified world-setting contract is architecture-accepted and Stage W1 is complete: `legacy_single_world` supplies stable compatibility identity/scope, WorldBook and Contacts read the shared immutable projections, Pack state is capability-only, and neither identity is a save slot;
- the reusable World Suite foundation now includes pure manifest planning, a bounded durable installation inventory inside the existing System user carrier, and one Owner Adapter execution Interface shared by Suite and independent catalog installation. It verifies native owner truth before and after mutations, repairs interrupted install/remove checkpoints without repeating completed Owner mutations, and checkpoints partial progress without copying native resource bodies;
- Book is the first production World Suite Owner Adapter: Book Catalog IDs resolve the actual text, Book persists the native asset and explicit Catalog/resource provenance, and independent/Suite origins share that single asset. ID collisions, existing built-in K-pop defaults, capacity/read-only conflicts, user edits, WorldBook references, and failed legacy/Repository writes fail closed;
- Gallery and Map now have production-backed World Suite Owner Adapters over their native transactional mutation Interfaces. Gallery installs one stable folder plus stable-ID URL assets, persists pack/asset provenance, rejects ID/URL collisions, and blocks update/removal while native consumers or other folders reference material. Map classifies native identity and current/history Map/Event/Chat/Gallery evidence without copying owner bodies, preserves strictly normalized Catalog-authored places, consumes an already installed Gallery asset ID, blocks topology replacement without migration, and restores exact native truth on failed writes. One typed/versioned Catalog and `production-world-suite-runtime.js` compose Book/Gallery/Map preview/install/uninstall over real Stores with receipt-gated System checkpoints and retry from native truth. No built-in K-pop Catalog/manifest, startup caller, UI, activation, world binding, relocation, or Journey mutation exists;
- Book owns reusable text assets while WorldBook owns source-link activation, structured encyclopedia entries, profile-template definitions, and reviewed per-world Pack enablement; zero Pack and zero encyclopedia selection remain valid, and Pack activation never binds Book content;
- legacy backups may restore valid core data with a missing-material report and type-appropriate placeholders, while exact local binaries are reused and current-only retained Gallery material is not deleted or hidden by an older restore;
- the non-active Batch 2B foundation and the separately approved Book-only Repository cutover completed on 2026-07-22 with focused Vitest and real-Chromium coverage; Book keeps its byte-identical legacy fallback and never dual-writes, while Gallery/R2 and all other owner migrations remain unapproved;
- the layered-persistence freshness foundation prepares all 17 inventory targets before Store mount, mutates only the 16 non-Book layered owners, orders valid heads by lineage/sequence rather than timestamps, fails closed on ambiguous/conflicting heads, verifies repairs, and bounds unavailable IndexedDB startup; product-level recovery aggregates structured failures in the root shell, one page-level writer keeps later same-container pages read-only, ordinary active-writer occupancy is presented as a calm preview and automatically retries after cooperative release, and the release-local v3 backup path now journals the previous complete metadata-plus-binary save and recovers interrupted restores before mount;
- the cross-module Mini Scene direction now has its pure Stage 1 foundation plus a separately authorized AI/text shell: `store:mini-scene` V1, complete-backup v4/v3 compatibility, global `unconfigured | off | text` policy, an Event Runtime registration, provider-neutral AI-required Draft generation, and a root Text Presenter are landed;
- the current shell has no prebuilt finished-scene library and no user-facing retained-scene manager. It currently commits each generated artifact before presentation; `CMG-08` must add one-occurrence reuse, optional full-scene retention, paging/management, and no silent 120-artifact eviction while event results and approved memories remain independent;
- Mini Scene was not added to persistence Batch 2B and is not a Repository migration. Calendar authoring/entry was rejected and removed. A production event-trigger Adapter, profile-binding UI, safe Book transform execution, interactive HTML, and source-owner integrations remain unimplemented;
- Settings has 3 workflow composables, Chat 15 focused composables, Contacts 10, and WorldBook 3;
- the remaining structural hotspots are the large route views, especially the five-facade `FoodDeliveryView.vue`, `systemStore`, and direct cross-store coordination;
- the isolated Vitest migration is complete at 4.1.10: it reuses root Vite 7.3.6 and removes the nested Vite 5/esbuild advisory chain and the prior critical finding;
- every complete local JSON export now presents one fixed danger warning before payload construction, keeps configured credentials and private local data intact, and exits without export/report side effects when cancelled;
- normal npm resolution refreshed only compatible transitive advisory nodes, kept `package.json` and all direct versions unchanged, used no override/resolution or major migration, and reported production/full audits at 0/0 in the 2026-07-22 baseline with 185 files / 1170 tests and 56 pass / 4 existing Playwright skips;
- the 2026-08-07 audit repair refreshed only the lockfile's transitive `js-yaml` node from 4.3.0 to 4.3.1 after the remote Pages gate exposed its high advisory; `package.json`, direct versions, and override/resolution policy remain unchanged, with production/full audits back at 0/0;
- the CI/release workflow first slice defines fail-closed production/full audits, lint, unit, build, and one full E2E run for PR verification and main Pages release; remote Pages Run #130 and the deployed `/schatphone/` smoke are proven;
- the Git-connected Vercel root-path project deploys commit `a1418ed` with a direct-default, explicitly selected, restricted per-request relay for user-owned OpenAI-compatible URLs/keys/models while preserving legacy fixed-upstream compatibility; the production route passed a no-secret upstream probe and real-provider model/Chat smoke;
- the Git-connected Cloudflare Worker/static-assets third root-path host keeps `a1418ed` as its reproducible relay baseline at `https://schatphone.noarry.workers.dev`; root/static checks, a no-secret dynamic-target probe, and GitHub Pages real-provider 6-model/Chat-`OK` relay proof pass. Pre-integration manual Worker version `d9e15cf0-f81f-46dc-bc04-22752547a994` added the working-tree TTS route and reliability hardening; after this slice is pushed, Git-connected `main` builds become the reproducible TTS baseline and the active version should be read from Wrangler rather than frozen here;
- the root bootstrap points to a thin cross-task execution contract, while task packages and specialist workflows own their execution detail;
- project-local skill inventory and workflow layering are guarded by automated governance tests;
- framework replacement or a broad TypeScript migration is not recommended.

## Read This Package In This Order

1. `STATUS_AND_HANDOFF.md`
2. `PRODUCT_BOUNDARY.md`
3. `IMPLEMENTATION_WORKSTREAMS.md`
4. `docs/architecture/ARCHITECTURE_DEBT_REVIEW.md`

Also read:

- `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
- `docs/overview/FUNCTIONAL_CODE_NEXT_STEPS.md`
- `docs/roadmap/PROJECT_MODULE_AUDIT.md`
- `docs/strategy/STATE_OWNERSHIP_STRATEGY.md`
- `docs/strategy/STORAGE_STRATEGY.md`
- `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md`
- `docs/architecture/PERSISTENCE_REPOSITORY_CONTRACT.md`
- `docs/architecture/WORLD_SETTING_ARCHITECTURE.md`
- `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`
- `docs/architecture/MUSIC_MODULE_CONTRACT.md`
- `docs/architecture/TTS_MODULE_CONTRACT.md`

## Guardrails

1. promote one concrete slice before implementation;
2. preserve storage/backup compatibility unless migration and rollback are explicit;
3. do not combine dependency migration, product behavior, and large refactoring;
4. measure before and after;
5. sync the live roadmap and PM status when priority or release posture changes.
6. do not begin storage implementation merely because the backup/recovery acceptance contract is complete.
7. do not execute legacy Chat `htmlSnippet`, raw AI HTML, or Book regex outside the accepted Mini Scene validation and Presenter seams.
8. do not persist `activeWorldPackId` as canonical world identity or turn future world definitions into internal save slots.
9. do not let World Pack activation enable, disable, replace, or require Book/WorldBook content.
