# Module Architecture Governance Package

Updated: 2026-07-22

Use this package for state ownership, persistence, security/toolchain maintenance, CI/release confidence, refactor planning, module maturity, and architecture debt.

Current state:

- domain ownership and shared `lib` contracts are strong enough to preserve;
- browsers and installable PWAs are confirmed as complete first-class clients, with one isolated storage container owning one current save;
- authoritative histories and relationship evidence require explicit user deletion; automatic capacity management is limited to reversible archival/compaction or rebuildable data;
- formally committed module content is durable regardless of user/AI/system origin; full AI prompts/raw responses, uncommitted drafts, and rebuildable projections remain temporary, while canonical content, authoritative state/facts, references, and minimum provenance persist;
- optional remote backup is personal BYOS rather than one shared project cloud: Cloudflare R2 is the first officially guided target, each user owns a separate destination and personal Worker gateway, SchatPhone never retains the R2 API Secret, and browser/PWA automation is limited to launch and open-app execution;
- personal remote backups are client-encrypted and use dual recovery: either a recovery password or separately downloaded recovery file can restore, while Cloudflare/Worker receives neither plaintext secret;
- the Gallery/material-library preservation contract now keeps accepted media locally first, separates `keep` from backup, uses one default-on whole-library inclusion choice instead of per-item backup selection, preserves URL sources as URLs, and keeps R2 backup-only rather than releasing local originals;
- manual backup remains available while automatic backup is an explicit default-off opt-in; multiple local or remote versions are allowed, but every version must be a complete standalone importable package rather than an incremental dependency chain;
- local export naming and destination use a user-editable product-name-plus-date default and the platform save/share flow;
- SchatPhone keeps no internal local backup library, but a configured personal R2 must be directly visible for in-app backup selection and restore so users do not have to operate the Cloudflare dashboard;
- explicit in-app deletion permanently deletes the selected connected-R2 backup and requires an unmistakable cloud-deletion warning; it is not a local hide action;
- SchatPhone never rotates or deletes personal-R2 backups automatically; every version remains until explicit user-confirmed deletion, even when quota pressure prevents another backup;
- the complete-backup/recovery engineering contract is accepted: new complete versions require manifest/section/binary integrity, capacity preflight, staged atomic activation, crash-safe rollback, and explicit failure states; Book is the first and only migrated owner;
- the canonical persistence-owner inventory now classifies all current store, mirror, binary, direct-local, and session carriers independently from backup coverage; Settings diagnostics consumes its 16-store projection and now includes Book;
- legacy v2 export consumes a section-shape registry while preserving the existing payload and import behavior; shape validity is reported separately from complete-package eligibility, and omitted Chat module identity/avatar settings remain an explicit required legacy gap;
- the Repository contract is now `ARCHITECTURE_ACCEPTED` with an exact separate IndexedDB v1 schema, immutable record-version/generation-membership model, atomic pointer/journal, contextual persistent-storage policy, fail-closed multi-tab coordination, and Book Adapter/fixture/rollback contract;
- each isolated browser or desktop Web App storage container remains one independent current save; same-container tabs coordinate writes, while different entry containers never auto-sync or silently merge;
- the unified world-setting contract is architecture-accepted and Stage W1 is complete: `legacy_single_world` supplies stable compatibility identity/scope, WorldBook and Contacts read the shared immutable projections, Pack state is capability-only, and neither identity is a save slot;
- Book owns reusable text assets while WorldBook owns source-link activation, structured encyclopedia entries, profile-template definitions, and reviewed per-world Pack enablement; zero Pack and zero encyclopedia selection remain valid, and Pack activation never binds Book content;
- legacy backups may restore valid core data with a missing-material report and type-appropriate placeholders, while exact local binaries are reused and current-only retained Gallery material is not deleted or hidden by an older restore;
- the non-active Batch 2B foundation and the separately approved Book-only Repository cutover completed on 2026-07-22 with focused Vitest and real-Chromium coverage; Book keeps its byte-identical legacy fallback and never dual-writes, while Gallery/R2 and all other owner migrations remain unapproved;
- the cross-module Mini Scene direction is architecture-accepted and its pure Stage 1 foundation is landed: request/draft/artifact/policy schemas, an empty-by-default caller registry, Book structured-profile/regex validation, and deterministic world/profile resolution exist without runtime imports; later Settings, persistence, presenters, and source Adapters remain unimplemented;
- Mini Scene was not added to persistence Batch 2B. Its future artifact/profile-binding/policy data classes still require a separate persistence and complete-backup approval after the completed Book foundation pilot;
- Settings has 3 workflow composables, Chat 15 focused composables, Contacts 10, and WorldBook 3;
- the remaining structural hotspots are the large route views, `systemStore`, and direct cross-store coordination;
- the isolated Vitest migration is complete at 4.1.10: it reuses root Vite 7.3.6, removes the nested Vite 5/esbuild advisory chain and the prior critical finding, and preserves the 184-file / 1163-test baseline;
- every complete local JSON export now presents one fixed danger warning before payload construction, keeps configured credentials and private local data intact, and exits without export/report side effects when cancelled;
- the active 4.5 lane still includes 10 non-production development dependency advisories and CI/release gating;
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
