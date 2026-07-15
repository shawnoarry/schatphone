# Module Architecture Governance Package

Updated: 2026-07-16

Use this package for state ownership, persistence, security/toolchain maintenance, CI/release confidence, refactor planning, module maturity, and architecture debt.

Current state:

- domain ownership and shared `lib` contracts are strong enough to preserve;
- browsers and installable PWAs are confirmed as complete first-class clients, with one isolated storage container owning one current save;
- authoritative histories and relationship evidence require explicit user deletion; automatic capacity management is limited to reversible archival/compaction or rebuildable data;
- formally committed module content is durable regardless of user/AI/system origin; full AI prompts/raw responses, uncommitted drafts, and rebuildable projections remain temporary, while canonical content, authoritative state/facts, references, and minimum provenance persist;
- optional remote backup is personal BYOS rather than one shared project cloud: Cloudflare R2 is the first officially guided target, each user owns a separate destination and personal Worker gateway, SchatPhone never retains the R2 API Secret, and browser/PWA automation is limited to launch and open-app execution;
- personal remote backups are client-encrypted and use dual recovery: either a recovery password or separately downloaded recovery file can restore, while Cloudflare/Worker receives neither plaintext secret;
- the current product gate is Gallery/material-library preservation: generated media requires explicit keep/discard confirmation, media meaning is independent of URL/local/provider source, and selective cloud protection versus local-space offload remains unresolved;
- the next architecture slice is an IndexedDB-first persistence, complete-backup, data-lifecycle, and legacy-migration contract; no storage migration is approved yet;
- Settings has 3 workflow composables, Chat 15 focused composables, Contacts 10, and WorldBook 3;
- the remaining structural hotspots are the large route views, `systemStore`, and direct cross-store coordination;
- the active 4.5 lane also includes complete-backup sensitivity, development dependency advisories, and CI/release gating;
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

## Guardrails

1. promote one concrete slice before implementation;
2. preserve storage/backup compatibility unless migration and rollback are explicit;
3. do not combine dependency migration, product behavior, and large refactoring;
4. measure before and after;
5. sync the live roadmap and PM status when priority or release posture changes.
