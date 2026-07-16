# SchatPhone Storage Strategy

Updated: 2026-07-16

Purpose: summarize how SchatPhone should store settings, saves, chat records, world state, runtime truth, and AI-related data without making browser storage too large, too fragile, or too semantically muddy.

Core recommendation:

> keep browsers and installable PWAs as complete first-class clients, but do not treat `localStorage` as the main database; move toward IndexedDB-first structured storage behind ownership-aware repository contracts.

Confirmed product boundary:

- one isolated browser/Web App storage container owns one current save;
- there is no internal save-slot, workspace-switching, cross-save merge, or mandatory server-sync layer;
- authoritative user-visible history and accepted relationship evidence cannot be silently or irreversibly deleted; paging, compression, dedupe, and cold archival must preserve review and restore semantics;
- automatic rotation is limited to rebuildable caches/projections and explicitly classified diagnostic or operational logs;
- any content formally published, confirmed, applied, or admitted into an owning module's history is a durable committed record when it is expected to be revisited, referenced, or affect continuity, regardless of whether it came from the user, AI, or deterministic code;
- durable committed content includes current and future Chat messages, social posts/replies, forum threads, public-feed records, offline scenes, long-form narrative, performance/episode records, and character-state history, with each canonical record stored by its product owner;
- full AI prompts, raw provider responses, transport payloads, and uncommitted drafts are non-authoritative and are not retained by default; authoritative state/facts, committed content, cross-module references, and minimum provenance remain durable;
- any full AI diagnostic capture must be explicitly enabled, temporary, bounded, separately clearable, and prevented from becoming a hidden permanent archive;
- a desktop wrapper may add a storage adapter later, but cannot make SQLite or a native filesystem a requirement for the complete browser/PWA product.
- this document records the target direction; no persistence migration is approved merely by this decision.

Use this file together with:

- `docs/strategy/STATE_OWNERSHIP_STRATEGY.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/product-decisions/FILES_INTERNAL_STORAGE_ROLE.md`
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`

## 1. Main Risk

Current implementation evidence:

- 16 domain stores write whole JSON snapshots to `localStorage` and asynchronously mirror them into one IndexedDB state store;
- normal startup reads valid `localStorage` first and consults the IndexedDB mirror only when the local snapshot is unavailable;
- Gallery file binaries use a separate IndexedDB database, while Gallery metadata remains in the snapshot system;
- Chat message counts, Gallery total asset count/bytes, and several role/world collections do not have one durable archive budget;
- one-off Chat images/GIFs can be stored as base64 inside the Chat snapshot;
- storage diagnostics checks mirror readability/drift, not actual quota, persistent-storage status, total backup completeness, or every store.

If all long-term project data is stored directly in browser `localStorage`, the project will eventually hit:

- quota limits;
- performance problems;
- fragile restore/import behavior;
- noisy duplication of truth;
- harder future migration.

High-risk data types:

- long chat histories;
- repeated prompt fragments;
- large event logs;
- relationship-memory snapshots duplicated too many times;
- image/base64-heavy assets;
- growing runtime/audit histories.

Do not persist repeated full AI prompt context merely for debugging. It duplicates role, world, memory, relationship, conversation, and future social/narrative records while expanding privacy and backup exposure. This does not permit discarding an AI-generated artifact after an owning module has formally published or committed it.

## 2. Target Layered Storage Model

### Layer A: `localStorage` for small hot state

Use this only for small, high-frequency, configuration-like values:

- user settings;
- language, notification, and automation switches;
- active IDs and light route/session hints;
- scheduler checkpoints;
- last-active timestamps;
- import/export metadata;
- lightweight UI preferences.

Rule:

- keep this layer small and fast;
- do not let it become the main archive;
- do not keep large histories here just because it is easy.

### Layer B: structured local archive for long-lived app truth

IndexedDB should become the main long-term structured storage layer for the browser/PWA product.

Recommended contents:

- role profile archives;
- relationship runtime state;
- conversation records and message history;
- canonical social/feed/forum posts, replies, and publication records;
- offline scene, narrative, performance/episode, and committed character-state records;
- event logs;
- wallet and ledger state;
- map and itinerary state;
- Calendar event state;
- Reminders cue state;
- notification history;
- accepted memory summaries;
- module-owned long-lived records.

This layer should favor:

- per-record append/update and indexed queries instead of whole-store rewrites;
- versioned domain repositories while Pinia remains an in-memory UI/cache layer;
- transactions, idempotency, and explicit cross-owner handoff records;
- structured retrieval;
- better capacity posture;
- clearer migration/recovery behavior than endlessly expanding `localStorage`.

### Gallery / material-library preservation checkpoint

Confirmed product meaning:

- Gallery is the reusable media/material owner, while each source module owns the reason an accepted asset is used and Chat continues to own message-scoped media records;
- image/media generation output is a transient candidate until the user explicitly keeps it; rejected candidates do not become durable Gallery or backup records;
- choosing `keep` persists the accepted result locally first and admits reusable material into Gallery; it never uploads or automatically includes the item in remote backup;
- media meaning is independent of storage source, so a URL-backed image, sticker, GIF, audio item, or other media does not need to become a local binary merely to be recognized or used;
- ordinary generation flows must not ask users to manage low-level local/cloud placement for every result;
- backup always includes the complete core save and exposes only one material choice: include Gallery binaries as a whole, default on, with no second per-item selection step because saving into Gallery was already the curation action;
- URL-backed media always contributes its original URL and minimum type/name/source metadata, even when Gallery binaries are excluded; backup does not fetch an exact byte copy, so a later-broken external URL cannot be made recoverable by this record alone;
- R2 remains recovery backup rather than live media storage or local-space offload, and successful backup does not release local originals.

Confirmed backup-package behavior:

1. manual backup is always available;
2. automatic backup is a separate setting that defaults off and runs only after explicit user opt-in;
3. keep multiple recovery versions, but make every local file or remote object a complete, independently readable and importable package with no base-version or delta dependency;
4. local export lets the user edit the filename, starts from a stable product-name-plus-date default, and delegates destination choice to the operating system's save/share flow, whose available locations differ across iOS, Android, and desktop browsers;
5. SchatPhone does not retain exported files in an internal local backup library; the user selects a local file again when importing;
6. once personal R2 is configured, SchatPhone lists available remote backup files and restores the selected file directly inside the product, without requiring a prior Cloudflare-dashboard download or creating another hidden local backup copy.

Confirmed retention behavior:

1. SchatPhone does not rotate, expire, or delete local export files or personal-R2 backup versions automatically;
2. every complete cloud version remains until the user explicitly confirms permanent deletion;
3. quota pressure may produce a warning or block creation of a new backup, but cannot silently remove an existing recovery point;
4. backup-size and quota reporting must help the user decide what to delete manually without converting that guidance into automatic cleanup.

Confirmed explicit deletion behavior:

- the in-app R2 view may permanently delete the selected SchatPhone backup object from the connected personal R2 rather than merely hiding it;
- the destructive modal names the backup, prominently states that the connected cloud copy is deleted and cannot be restored through SchatPhone, and clarifies that the current save, other backups, and local export files remain unchanged;
- the visible row remains until the personal Worker confirms deletion success; failure leaves the backup visible and reports that the cloud file was not deleted;
- the personal Worker must scope list/get/delete operations to SchatPhone's backup prefix rather than exposing arbitrary objects in the user's R2 destination;
- Cloudflare's Workers R2 API currently exposes strongly consistent `list` and `delete` bucket operations, so this product behavior is technically feasible through the already-confirmed personal Worker gateway: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/.

No fixed `8 GB` budget, per-generation three-way storage prompt, per-backup item picker, public image-host authority, remote-media offload, incremental backup chain, or automatic backup deletion is approved.

### Layer C: optional server storage

This is only needed when product goals go beyond local-first single-device play.

Typical uses:

- cross-device sync;
- remote backup;
- durable push delivery;
- persistent scheduled jobs;
- later backend-orchestrated autonomy if the product explicitly chooses it.

Server storage is not part of the confirmed local persistence migration and must not become a hidden requirement for ordinary use.

Confirmed personal remote-backup direction:

- SchatPhone does not provide one project- or workgroup-owned backup archive; each participating user owns a separate Cloudflare account and R2 destination;
- Cloudflare R2 is the first officially guided BYOS target, but backup packaging and remote-provider contracts must remain portable to later S3-compatible, WebDAV, or other adapters;
- each user deploys a personal Cloudflare Worker gateway bound to that user's R2 destination; the app may retain only a revocable, scoped device token and must never retain an R2 API Secret;
- backup content is encrypted on the client and supports either a recovery password or a separately downloaded recovery file; Cloudflare/Worker receives neither plaintext recovery secret, losing both paths is irreversible, and initial setup must verify recovery before automatic backup is ready;
- the local save remains authoritative, while the remote destination stores client-created backup objects rather than live module truth;
- manual backup remains available; automatic backup defaults off, requires explicit user opt-in, and in ordinary browsers/PWAs may check and run only after launch or while the app remains open;
- every remote version is a complete standalone encrypted recovery package rather than a delta that depends on an earlier object;
- remote backup does not release local media originals or become the authoritative material library;
- the configured R2 connection supports an in-app backup-file list and direct restore; users do not need to visit Cloudflare first, and SchatPhone does not duplicate the remote files into an internal local backup library;
- this does not add internal save slots, automatic merge, or cross-device sync;
- implementation requires a complete self-checking setup/recovery guide; quota reporting, backup-creation failure handling, and exact backup scheduling still require engineering acceptance.

### Layer D: optional desktop-native adapter

A future packaged desktop client may provide SQLite/filesystem persistence through the same repository contracts. It is an enhancement path, not the canonical contract while browsers/PWAs remain complete clients.

## 3. Current Placement Guidance

### Good candidates for lightweight storage

- settings;
- toggles;
- last-open metadata;
- lightweight checkpoint values;
- tiny compatibility flags.

### Good candidates for structured archive storage

- role profiles;
- relationship metrics, stages, milestones, and memory groups;
- long chat histories;
- event and consequence records;
- map records and itinerary history;
- wallet records, gifts, receipts, and balances;
- Calendar confirmed events;
- Reminders raw cues;
- summary memories and continuity snapshots.

### Avoid long-term duplicate clutter

Avoid storing:

- repeated full prompt payloads;
- many derived copies of the same truth;
- large base64 asset payloads outside their owning asset strategy;
- giant raw text that should later become structured summary or archive.

## 4. Ownership-Aware Storage Rules

Storage must respect product ownership.

Examples:

- `Contacts` may display relationship summaries, but `relationship runtime` owns the underlying relationship truth.
- `Chat Directory` may store binding/config data, but not the live relationship truth.
- `Calendar` owns confirmed schedule/date records.
- `Reminders` owns raw cues and follow-up records.
- `Files` may keep metadata/index/bridge records, but should not become the main user-facing owner of assets or relationship data.
- `Gallery` owns visible media asset workflows; do not duplicate those records into Files as if Files were the asset source of truth.

## 5. Anti-Bloat Strategy

To prevent local storage from growing uncontrollably:

1. keep recent raw history, summarize older history where appropriate;
2. prefer structured state over repeated prose;
3. cap diagnostic/event log growth where safe;
4. archive or compress low-priority historical data later if needed;
5. avoid storing regenerated content twice;
6. avoid storing the same continuity concept in several unrelated module-local mirrors.

Confirmed retention rules:

- authoritative user/domain records require explicit user deletion and may otherwise move only into reversible cold storage;
- committed content records follow the same rule regardless of user, AI, or deterministic origin;
- accepted relationship facts and audit evidence must remain reviewable even when removed from the hot working set;
- derived projections, indexes, and previews may be rebuilt;
- diagnostic/runtime logs may rotate under named limits;
- AI transport diagnostics may retain full payloads only inside an explicit temporary diagnostic session; ordinary audit keeps structured outcomes and minimal provenance instead;
- still-referenced binary assets require explicit user deletion; unreferenced or temporary binaries need a separately defined cleanup policy, visible storage budgets, and complete-backup reporting.

## 6. Safety And Reliability

Storage design should support:

- recovery;
- migration;
- import/export trust;
- backward compatibility where appropriate.

Recommended practices:

- version backup formats;
- include a manifest and integrity checks;
- validate and restore into staging before replacing the current save;
- preserve import rollback ability;
- support legacy-to-new migration;
- keep export readable and inspectable;
- identify complete migration exports as sensitive local files because they include configured credentials;
- keep any future redacted/shareable export separate from the complete migration contract;
- treat ownership-shifting migrations as product-boundary changes, not only technical refactors.

## 7. Practical Migration Posture

Current practical posture:

1. freeze the data classes, repository boundaries, backup contract, migration/rollback path, quota behavior, and multi-tab policy before changing persistence code;
2. keep settings and lightweight recovery metadata small and hot;
3. move one approved reference domain from legacy snapshots to IndexedDB-first repositories, with compatibility import and focused tests;
4. validate the reference migration before selecting later domains such as Chat history, relationship audit, or binary assets;
5. keep server storage optional until cross-device sync, durable push, or backend autonomy is truly justified;
6. do not let convenience storage choices quietly redefine product ownership.

## 8. Practical Rule

The project should save truth, not clutter.

Storage is not only a capacity problem. It is also:

- a continuity problem;
- an ownership problem;
- a migration problem;
- a long-term maintainability problem.

## 9. Change Log

1. 2026-03-29: created as the first layered-storage strategy note.
2. 2026-05-19: rewritten to align with current ownership boundaries, relationship runtime, Calendar/Reminders split, and Files/Gallery roles.
