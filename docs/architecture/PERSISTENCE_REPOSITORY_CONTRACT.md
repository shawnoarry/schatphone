# Persistence Repository Contract

Status: `ARCHITECTURE_ACCEPTED`

Updated: 2026-07-22

Owner: Module Architecture / Technical Governance

Purpose: define and record the architecture-accepted container, IndexedDB-first Repository Interface, generation, capacity, coordination, and Book reference cutover.

This document records both the completed non-active Batch 2B foundation and the separately user-approved Book runtime cutover completed on 2026-07-22. Approval remains limited to Book; no other owner migration follows from it.

## 1. Decision State

Confirmed product direction and proposed technical closure:

1. browser and installable PWA clients remain complete first-class clients;
2. each isolated browser profile/site-data container or separately isolated desktop Web App container owns exactly one current save; different containers remain independent and never auto-sync, silently merge, or expose internal save slots;
3. tabs that share one storage container share one current save; after a bounded safe wait, a competing later tab remains read-only and exposes only retry and refresh/reload-current-save actions, never last-write-wins or force takeover;
4. persistent-storage permission is never requested on first launch; it is requested contextually before the first qualifying high-volume durable action, while Settings exposes current status and an explicit retry;
5. the Repository uses a hybrid physical model: immutable generic record versions plus generation membership for structured owner records, with specialized stores only where correctness requires them;
6. restore and migration activation use a staged generation plus one atomic active-generation pointer and crash journal;
7. Book is the first active Repository owner; its schema, Adapter Interface, immutable fixtures, explicit cutover, legacy fallback, and rollback behavior are implemented and tested;
8. `system.truthState` remains required legacy compatibility data until immutable fixtures prove it can be reconstructed without continuity loss;
9. Calendar reminder cues remain legacy import compatibility, while Reminders is the canonical reminder owner.

Explicit status:

- `Book Repository runtime implementation/activation = IMPLEMENTED`;
- `IndexedDB-first schema and Book foundation contract = ARCHITECTURE_ACCEPTED`;
- `Batch 2B non-active foundation/fixture/staging pilot = APPROVED`;
- `Gallery binary schema = NOT_APPROVED`;
- `R2 Adapter or Worker implementation = NOT_APPROVED`;
- `Book migration/cutover = IMPLEMENTED`;
- `dual write = FORBIDDEN_AND_NOT_USED`;
- `other-owner runtime generation activation = NOT_APPROVED`.

Batch 2B remains the historical non-active foundation boundary in section 11. Section 12 records the later, separately approved Book-only runtime slice and does not broaden approval to Gallery, R2, or any other owner.

### 1.1 Storage-Container Invariant

The Repository has no `saveId`, workspace ID, account ID, or slot ID in any keyPath. The storage container is the save boundary. A second browser profile, another browser's isolated site data, or a separately isolated installed/desktop Web App may therefore hold another independent current save, but the application does not discover or coordinate it.

Same-container tabs coordinate writes because they can see the same IndexedDB database. Different containers cannot see each other's database and must remain independent. Moving state between them requires a complete user-exported backup chosen for import; there is no automatic sync, background reconciliation, cross-container conflict resolution, or silent merge.

## 2. Current Evidence And Canonical Inventory

The executable inventory lives in `src/lib/persistence-owner-inventory.js`. It is independent from `src/lib/backup-section-registry.js` and from any generated backup payload.

Current physical carriers:

| Carrier | Current role | Authority |
| --- | --- | --- |
| namespaced `localStorage` persisted envelopes | synchronous primary for 16 store snapshots | current primary |
| `schatphone-layered-storage/state` | serialized asynchronous mirror of the same envelopes | rebuildable duplicate, never a second truth owner |
| `schatphone-gallery-assets/blobs` | Gallery local file binaries keyed by asset/blob ID | Gallery-owned durable binary carrier |
| `schatphone:layout_edit_enabled` | environment-gated Home feature hint | non-authoritative, excluded from backup |
| `schatphone:chat-service-route-feedback` | short-lived Chat return feedback in `sessionStorage` | transient, excluded from backup |

The 16 persisted store keys, versions, and diagnostic order are one projection of that inventory. Adding a new `writePersistedState` key, IndexedDB database/store, or direct browser-storage key without classifying it must fail source-level coverage tests.

Logical owner groups:

| Physical carrier | Logical owner/data classes that must not be collapsed into the carrier name |
| --- | --- |
| `store:system` | Settings application settings; Settings current-user profile; WorldBook world context/packs/source links/templates; System notifications; Technical Governance API/storage audit reports; required legacy `truthState` |
| `store:chat` | Contacts role profiles and lifecycle; Chat directory/conversation state; Chat user-visible messages; Chat module identity/anonymity/avatar settings |
| `store:calendar` | Calendar events and legacy reminder-cue compatibility only |
| `store:reminders` | canonical reminder records and reviewed reminder cues |
| `store:gallery` plus Gallery binary DB | Gallery metadata/folders/source references plus user-retained local binaries |
| other store keys | the corresponding Map, Files, Book, Shopping, Food Delivery, Event Runtime, Assets, Wallet, Phone, Stock, or Relationship Runtime owner |

Relationship Runtime remains the sole owner of validated relationship truth. World Hub may review its projections and evidence but cannot become a second writer. Chat owns conversation-side records only. Physical placement cannot redefine these product owners.

### 2.1 Legacy V2 Shape Validation And Known-Gap Audit

`src/lib/backup-section-registry.js` describes and validates only the schema/section shape the legacy v2 exporter already produces. The exporter consumes this registry before download; it does not change the JSON shape, field names, Gallery default, size/item limits, or import order. `shapeOk` means only that these legacy fields have the expected shape. It is not a complete-backup coverage result.

The registry separately records one explicit existing gap: legacy v2 exports omit Chat `moduleIdentity` and `moduleAvatarOverrides`. This durable user-visible class is neither optional nor rebuildable. The draft inventory labels it `required`, while the legacy registry labels it `known_gap`. Inspection therefore returns `completePackageEligible: false` even for `shapeOk: true`. A future complete-package implementation must add real coverage before claiming completeness; this batch does not change legacy v2 fields or user behavior.

Gallery retained binaries are `user_selected`, not an optional extension and not an exclusion. Current v2 continues its existing best-effort package behavior. Future whole-Gallery complete packages remain subject to the stricter exact stable-ID/digest-set rules in `BACKUP_RECOVERY_ENGINEERING_CONTRACT.md`.

## 3. Repository Module And Seam

The Repository Module is the owner-aware persistence seam. Callers work in logical owner/data-class terms and do not know IndexedDB object-store names, keyPaths, active-generation storage, serialization format, or cross-tab primitives.

The Interface must provide these capabilities, whether as one facade or a small cohesive family:

| Capability | Required Interface behavior |
| --- | --- |
| `read` | read one owner/data-class record by stable ID from one explicit generation; distinguish absent, unreadable, unsupported-schema, and unavailable-carrier results |
| `query` | return a deterministic owner-scoped result using declared indexes/order, with bounded pagination for growing classes |
| `snapshot` | obtain a consistent read generation and its canonical owner-inventory version for backup or migration |
| `stage` | write records/binaries only into a new inactive generation; never mutate the active generation in place |
| `verify` | validate owner/class/schema, stable references, counts/digests where applicable, and generation completeness before activation |
| `activate` | switch one verified staged generation through the atomic pointer and record journal evidence |
| `abort` | discard or mark an inactive staged generation without changing the active save |
| `inspectCapacity` | report usage, quota, persistence status, estimate confidence, and peak working-space requirements without prompting |
| `coordinateWrite` | acquire, renew, release, time out, or reject a write lease through the configured WriteCoordinator Adapter |

Interface invariants:

1. every call names a canonical logical owner and data class, even when several classes share one physical Adapter;
2. reads never fall through silently from corrupt active data to another generation;
3. writes are idempotent for the same operation ID or fail with a structured conflict;
4. a caller cannot activate an unverified or incomplete generation;
5. optional projections and rebuildable indexes cannot be the only carrier of authoritative content;
6. errors use stable codes with owner/class/generation context and never require parsing console text;
7. the Interface is the test surface; tests may use an in-memory Adapter only when it preserves the same ordering, failure, transaction, and generation invariants.

The deletion test for this Module is positive: without it, generation rules, quota interpretation, conflict handling, and error classification would reappear across every Pinia store. The seam therefore earns leverage for callers and locality for storage failures.

## 4. IndexedDB-First Physical Contract

The primary structured database is `schatphone-repository`, version `1`. It is intentionally separate from the current `schatphone-layered-storage/state` mirror so the pilot cannot reinterpret or destructively upgrade the compatibility mirror. Version 1 creates only the six stores below. It creates no Gallery binary, search-projection, remote-provider, or per-save-slot store.

### 4.1 Immutable Record Version

Authoritative structured payloads are immutable revisions in `record_versions`:

```text
ownerId
dataClassId
recordId
revision
recordSchemaVersion
createdAt
updatedAt
payload
sourceReferences[]
integrity.sha256
```

Physical keyPath: `['ownerId', 'dataClassId', 'recordId', 'revision']`.

Contract rules:

- `revision` is a positive integer and is monotonic for one owner/class/record identity;
- inserting an existing compound key is idempotent only when its canonical digest is identical; a different digest is `revision_digest_conflict` and cannot overwrite the stored version;
- `payload` contains owner data, not copied truth from another module;
- `payload.id`, when the current owner shape includes it, equals `recordId`;
- timestamps, array positions, labels, filenames, prompts, and URLs cannot become identity;
- provenance remains compact and cannot become a second copy of another owner's content;
- SHA-256 validates canonical UTF-8 JSON bytes using sorted object keys and preserved array order.

### 4.2 Generation Membership

`generation_records` maps a complete generation snapshot to immutable record revisions:

```text
generationId
ownerId
dataClassId
recordId
revision
recordDigest
indexKeys.position
indexKeys.updatedAt
indexKeys.category
indexKeys.status
```

Physical keyPath: `['generationId', 'ownerId', 'dataClassId', 'recordId']`.

Every owner/data class declared in a generation manifest has a complete membership set, including an explicit zero count. An unchanged record may reuse an earlier immutable revision, so staging a generation copies only small membership rows rather than duplicating every long-form payload. A membership row whose referenced revision or digest is missing fails verification.

No garbage collection is approved in Batch 2B. A record revision or generation cannot be removed while any active, previous rollback, staged, journal-referenced, or backup-required state may still need it.

### 4.3 Exact Version-1 Object Stores And Indexes

| Object store | keyPath | Required indexes |
| --- | --- | --- |
| `record_versions` | `['ownerId', 'dataClassId', 'recordId', 'revision']` | `by_record = ['ownerId', 'dataClassId', 'recordId']`; `by_digest = 'integrity.sha256'` |
| `generation_records` | `['generationId', 'ownerId', 'dataClassId', 'recordId']` | `by_generation_owner_class = ['generationId', 'ownerId', 'dataClassId']`; `by_generation_owner_class_position = ['generationId', 'ownerId', 'dataClassId', 'indexKeys.position', 'recordId']`; `by_generation_owner_class_updated = ['generationId', 'ownerId', 'dataClassId', 'indexKeys.updatedAt', 'recordId']`; `by_generation_owner_class_category = ['generationId', 'ownerId', 'dataClassId', 'indexKeys.category', 'indexKeys.position', 'recordId']`; `by_generation_owner_class_status = ['generationId', 'ownerId', 'dataClassId', 'indexKeys.status', 'indexKeys.position', 'recordId']` |
| `generations` | `'generationId'` | `by_status_updated = ['status', 'updatedAt', 'generationId']`; `by_operation = 'operationId'` with `unique: true` |
| `repository_meta` | `'key'` | none |
| `operation_journal` | `'operationId'` | `by_phase_updated = ['phase', 'updatedAt', 'operationId']`; `by_candidate = 'candidateGenerationId'` |
| `write_leases` | `'scopeKey'` | `by_expires_at = 'expiresAt'` |

All indexes are non-unique unless explicitly stated. Upgrade code must compare the actual store/index/keyPath contract with this table; a missing, extra, renamed, or differently configured store/index fails schema acceptance rather than being silently tolerated.

The Adapter factory accepts an explicit database-name override only for tests. Production callers use the fixed `schatphone-repository` name. The focused Playwright test uses a unique disposable name per case so it can inspect real Chromium schema/transactions and delete the database without touching the current save.

`repository_meta` allows only named singleton records. Version 1 defines:

- `repository-schema`: database version, contract version, and canonical inventory version;
- `container-instance`: a diagnostic random ID created once for this storage container; it is not a user-visible save slot or cross-container account key;
- `active-generation`: the authoritative pointer `{ generationId, pointerRevision, updatedAt, operationId }`, absent before first activation;
- `persistent-storage-request`: last known platform status and user-initiated attempt metadata, never a substitute for `navigator.storage.persisted()`.

### 4.4 Book Logical Mapping

The inventory class `book.long-form-library` maps to two Repository classes owned by `book`:

| dataClassId | recordId | payload | membership index keys |
| --- | --- | --- | --- |
| `book.asset` | current Book asset `id` | `id`, `title`, `category`, `assetType`, `format`, `categoryId`, `tags`, `content`, `sections`, `status`, `locked`, `favorite`, `source`, `version`, `createdAt`, `updatedAt`, `contentFingerprint` | canonical snapshot `position`, `updatedAt`, `category`, `status` |
| `book.category` | current category `id` | `id`, `title`, `color` | canonical snapshot `position`; other index keys omitted |

User-created/imported assets and categories are durable records. Built-in Book assets remain immutable application-package sources and are not copied into IndexedDB; their stable IDs continue to resolve through `built-in-book-assets.js`. WorldBook source-link truth remains in `worldbook.world-context` inside the current System compatibility carrier until its own migration is approved. The Book Adapter may report link resolution but cannot move or rewrite those links.

Book snapshot order is explicit: adapter round-trip returns assets in the same canonical order produced by `normalizeBookTextAssets`, with `recordId` as the deterministic tie-breaker, and categories in their normalized persisted order. The existing 300 user-asset limit remains unchanged. Search, tag filtering, built-in merging, lock rules, active-source deletion guards, imports, and exports remain Book product behavior rather than IndexedDB schema behavior.

### 4.5 Specialized Stores Deferred

Gallery binary content and rebuildable search projections may later justify specialized stores, but neither is part of database version 1. Specialized never means separately authoritative: Gallery owns Gallery metadata/binaries, and a future projection must declare its source generation and remain disposable.

## 5. Stable Identity And References

1. IDs are generated once by the canonical owner and survive export, import, migration, archive, pause, and restore.
2. Cross-module references use `{ ownerId, dataClassId, recordId }` plus relation/source type where needed.
3. A physical key, array index, display name, filename, prompt, URL, or timestamp cannot serve as cross-module identity.
4. Legacy numeric/string IDs are preserved through a declared normalization rule; migration cannot silently mint replacements that strand references.
5. Gallery local-binary reuse requires stable asset/blob identity plus exact digest evidence. Filename, label, prompt, and URL matching are insufficient.
6. URL-backed media keeps the original URL and descriptive/source metadata as an external reference. URL availability is not package integrity.
7. Removing a record with inbound authoritative references requires the owning product lifecycle rule; Repository deletion cannot invent cascade behavior.

## 6. Generations, Journal, And Atomic Activation

A generation is an immutable membership snapshot after verification. Callers observe at most one active Repository generation in one storage container. Owner classes not yet cut over continue using their declared legacy carriers and do not silently fall through the Repository.

Required states:

```text
staging -> verified -> activating -> active
                    -> aborted
active -> superseded
activating/reopen_failed -> rollback_required -> rolled_back
superseded -> active (rollback only)
```

`generations` rows contain `generationId`, `parentGenerationId`, `operationId`, `status`, `inventoryVersion`, `repositorySchemaVersion`, `createdAt`, `updatedAt`, `verifiedAt`, `activatedAt`, `ownerClassCounts`, `ownerClassDigests`, and immutable legacy-source evidence where applicable.

`operation_journal` rows contain `operationId`, `operationType`, `phase`, `previousGenerationId`, `candidateGenerationId`, `expectedPointerRevision`, `legacyFallbacks`, `startedAt`, `updatedAt`, `errorCode`, and `recoveryAction`. Journal phases are `prepared`, `staging`, `verified`, `activating`, `reopen_pending`, `completed`, `rollback_required`, `rolled_back`, or `hard_failure`.

Activation protocol, reserved for a later cutover slice:

1. the WriteCoordinator acquires the container-wide `repository-write` lease and captures its fencing token;
2. the journal records the current pointer and candidate before activation starts;
3. all record versions and memberships are staged and the generation manifest is verified;
4. one IndexedDB readwrite transaction across `repository_meta`, `generations`, and `operation_journal` compares the expected pointer revision, marks the candidate active, marks the previous generation superseded when present, increments the pointer revision, and moves the journal to `reopen_pending`;
5. the application reopens the candidate through the normal read Interface and compares owner/class counts, digests, stable IDs, ordering, and reference outcomes;
6. success moves the journal to `completed`; failure moves it to `rollback_required` and a second fenced transaction restores the previous pointer/status;
7. for the first Book migration, `previousGenerationId` is null and `legacyFallbacks` names `schatphone:store:book` plus its digest; rollback removes the Repository route and reopens the unchanged legacy snapshot;
8. rollback is reported successful only after the previous generation or legacy source reopens and reproduces the expected Book snapshot.

On startup, a nonterminal journal is resolved before any new mutation. If the pointer selects a verified candidate and reopen verification succeeds, recovery completes it; otherwise recovery rolls back. It never merges generations or selects a winner by timestamp. A hard failure retains the candidate, previous generation, legacy source, and journal evidence.

Batch 2B may create, stage, inspect, verify, and abort inactive generations in tests and an unreferenced Adapter. It may not execute steps 4-8 from an application runtime path.

### 6.1 LocalStorage Hint Allowlist

After an approved cutover, `localStorage` may hold only bounded boot/recovery hints:

- `schatphone:repository-active-generation`: a non-authoritative cache of database version, generation ID, and pointer revision;
- `schatphone:repository-recovery`: a bounded operation ID and recovery-required flag with no owner payload;
- explicitly inventoried non-authoritative feature flags such as the current Home layout-edit flag.

IndexedDB `repository_meta/active-generation` is authoritative. A missing or mismatched local hint is ignored and later repaired from IndexedDB; it cannot select another save or override the pointer.

The current 16 whole-store snapshots remain legacy compatibility carriers until each owner migration is approved. This draft does not delete, relocate, dual-write, or reinterpret them. Chat session feedback remains `sessionStorage` transient state and is not promoted into durable recovery metadata.

## 7. Capacity And Persistent Storage Interface

The capacity Adapter normalizes platform capabilities without deciding user-visible timing. It must support:

- `navigator.storage.estimate()` when available, returning usage/quota and `available`, `insufficient`, `unknown`, or `unavailable` confidence;
- `navigator.storage.persisted()` when available;
- a separately invoked `navigator.storage.persist()` attempt only when the confirmed contextual policy below qualifies and the user explicitly continues;
- per-owner/data-class logical bytes, Gallery binary bytes, staged-generation bytes, and estimated peak working bytes;
- structured unsupported/denied/error results rather than treating all false values alike.

Confirmed request policy:

- absence of an estimate is `unknown`, not zero capacity and not permission to skip preflight;
- denial of persistent storage does not corrupt or erase the current save;
- capacity pressure never authorizes silent deletion of authoritative records or retained binaries;
- startup, hydration, ordinary Book edits, and small settings changes never call `navigator.storage.persist()` or display the permission explanation;
- before the first qualifying action in a container, the policy checks `persisted()` and `estimate()`, explains the risk in that action's context, and calls `persist()` only after the user explicitly continues;
- qualifying actions are: keeping the first local binary; starting a complete-backup restore; starting a storage migration/cutover; a single Book import estimated at 1 MiB or more; or any batch durable write estimated to add at least 5 MiB or require at least 10 MiB peak working space;
- byte thresholds are named policy constants, not scattered UI checks; changing them requires technical review and measurement but not a new storage format;
- denial/cancellation lets the user cancel the pending action or continue with normal best-effort browser storage when that action's existing product contract permits it; it never pretends protection was granted;
- Settings shows `unsupported`, `not_persistent`, `requesting`, `persistent`, `denied`, or `error`, the last checked/attempt context, and an explicit retry action;
- Settings retry is user-initiated, rechecks platform state first, and never runs on page load;
- `repository_meta/persistent-storage-request` stores only attempt metadata. Current truth is refreshed from the browser API because browser/site settings may change outside SchatPhone.

Batch 2B may implement the policy classifier and capability Adapter without wiring a prompt into Settings, Gallery, backup restore, or Book UI. User-visible copy and component placement remain a later UX acceptance detail, but the request timing and available Settings retry behavior are confirmed.

## 8. WriteCoordinator Interface

All mutating Repository operations cross a WriteCoordinator seam. Its Interface provides:

- operation ID and intended owner/class/generation scope;
- lease acquisition with configurable timeout;
- heartbeat/renewal when the chosen Adapter needs it;
- commit/release and crash-expiry evidence;
- stale-writer rejection using active generation/revision;
- a cross-tab notification containing only bounded coordination metadata;
- structured `busy`, `timed_out`, `stale_generation`, `lease_lost`, and `unsupported` outcomes.

Version 1 uses one container-wide write scope, `repository-write`. The preferred Adapter is an exclusive Web Lock plus bounded BroadcastChannel metadata. When Web Locks is unavailable, `write_leases/repository-write` provides an IndexedDB compare-and-swap lease plus fencing token; BroadcastChannel remains an optimization, not authority.

Default policy constants are `waitTimeoutMs = 8000`, `leaseDurationMs = 15000`, and `heartbeatMs = 5000`. Tests use injected clocks and shorter values but preserve ordering. A fallback lease is reclaimable only after expiry, a fencing-token compare-and-swap, and recovery of any nonterminal journal; this is crash recovery, not user-visible force takeover. If safety cannot be proved, the page stays read-only.

Same-container behavior:

1. a page captures the active generation/pointer revision before requesting the write lease;
2. if it acquires the lease, it rechecks that revision before staging and again before commit;
3. if another page still owns the lease after the safe wait, the later page enters `read_only_conflict`, discards no durable data, and offers `Retry` and `Refresh current save`;
4. `Retry` starts a new bounded acquisition attempt and keeps the page read-only until acquisition plus active-revision recheck succeeds;
5. `Refresh current save` discards only that page's uncommitted in-memory mutation, reloads the authoritative active generation, and permits a later ordinary retry; it does not merge local edits;
6. lease loss or stale revision aborts the inactive operation with a structured error and never changes the active pointer;
7. there is no force-takeover action, last-write-wins path, timestamp winner, background merge, or silent success.

Different isolated storage containers do not share this Coordinator and do not coordinate through network, backup, or device identity.

## 9. Book Repository Adapter And Reference Fixtures

Book is the first candidate because it has one owner, a bounded Interface (`assets` and `categories`), stable IDs, no separate binary carrier, focused store tests, and lower cross-store write coupling than Chat, System, Gallery, or Relationship Runtime.

### 9.1 Book Repository Adapter Interface

The Book Adapter is owner-specific mapping over the generic Repository. It does not own activation, cross-tab UI, built-in content, or WorldBook source links.

| Method | Contract |
| --- | --- |
| `inspectLegacySource({ localRaw, mirrorRaw })` | return source availability, raw-byte digests, envelope version, parse/decode status, and mirror drift without writing either carrier |
| `normalizeLegacySnapshot({ sourceKind, raw })` | decode wrapped v1 or accepted unwrapped legacy shape through current Book normalizers; return canonical assets/categories, ordering, warnings, and source digest without mutating input |
| `stageSnapshot({ operationId, generationId, parentGenerationId, snapshot, sourceEvidence })` | write immutable `book.asset`/`book.category` revisions plus a complete membership set into an inactive generation; never activate |
| `verifyGeneration({ generationId, expected })` | validate schema, counts, ordered stable-ID sets, payload/member digests, asset/category round-trip, source evidence, and WorldBook link resolution report |
| `readSnapshot({ generationId })` | reconstruct the current `{ assets, categories }` Book backup shape in canonical order and distinguish missing/corrupt/unsupported results |
| `readAsset({ generationId, assetId })` | read one user asset by stable ID; built-in fallback remains outside the Adapter |
| `listAssets({ generationId, category, status, cursor, limit })` | return deterministic user-asset records using declared membership indexes; search/tag filtering may remain in the bounded Book model |
| `abortGeneration({ operationId, generationId })` | mark a never-active candidate aborted; no active pointer or legacy carrier changes |

All methods return stable codes including `legacy_missing`, `legacy_parse_failed`, `legacy_version_unsupported`, `revision_digest_conflict`, `generation_incomplete`, `reference_report_mismatch`, `lease_timed_out`, `quota_insufficient`, and `carrier_unavailable`. Console text is not an API.

### 9.2 Immutable Fixtures

Before any migration runtime exists, Batch 2B checks in the following immutable inputs. A fixture is never rewritten by the migration under test.

| Fixture ID | Required evidence |
| --- | --- |
| `book-empty-v1` | empty assets/categories round-trip and stable empty ordering |
| `book-single-v1` | one asset/category with all normalized required fields |
| `book-multi-category-v1` | deterministic category and asset ordering with stable links |
| `book-worldbook-links-v1` | valid and missing WorldBook source references are reported distinctly |
| `book-legacy-unwrapped-v0` | accepted pre-envelope assets/categories normalize without identity loss |
| `book-limit-edge-v1` | maximum accepted record counts and long text do not truncate silently |
| `book-invalid-v1` | malformed IDs, duplicate IDs, invalid category links, and unsupported versions are rejected with stable codes |

Each fixture set requires:

- original legacy envelope bytes and digest;
- expected canonical records and ordering;
- expected warnings/errors and reference report;
- expected rollback state;
- a mutation guard proving the source fixture is byte-identical after every run.

### 9.3 Failure-Injection Matrix

| Phase | Injected failure | Required result |
| --- | --- | --- |
| inspect | unreadable/unsupported Book envelope | no staging write; active save unchanged |
| inspect | valid local source plus different mirror | local primary is selected, drift is reported, and no newest-timestamp winner is inferred |
| inspect | missing/invalid local plus valid mirror | named `legacy_recovery_candidate`; no silent activation or local overwrite |
| normalize | duplicate or invalid stable ID | deterministic validation error; no generated replacement ID |
| schema open/upgrade | missing, extra, or wrong keyPath/index | schema acceptance fails; legacy Book remains current |
| capacity preflight | insufficient or unknown peak space | no stage when insufficient; explicit unknown result is retained for caller policy |
| stage records | failure before first/middle/final record | incomplete generation remains inactive and cleanable |
| stage membership | missing revision/digest or position gap | authoritative record versions never activate without a complete membership set |
| verify | count, digest, schema, order, or reference mismatch | candidate rejected; active pointer unchanged |
| acquire write lease | another tab owns the lease past 8-second wait | later page receives `read_only_conflict` with retry/refresh only; no partial write or takeover |
| lease loss | heartbeat/fencing token changes during stage | operation aborts inactive; active pointer unchanged |
| pointer activation | atomic update fails | previous active generation remains selected |
| first Book reopen verify | candidate cannot reopen | journal enters rollback-required and unchanged `schatphone:store:book` reopens |
| later reopen verify | candidate cannot reopen | journal enters rollback-required and previous generation is restored |
| rollback | previous pointer cannot reopen | hard recovery error retains both generations and journal evidence |
| crash/reload | crash at every journal transition | deterministic resume or rollback without mixed generations |
| persistent-storage request | unsupported, denied, or thrown error | classified status and Settings-retry eligibility; no save deletion or false protected state |

Passing this matrix approves only the Book foundation/fixture implementation presented for review. It does not approve application import, cutover, dual write, or runtime activation.

## 10. Migration And Rollback Gates

### 10.1 Legacy Book Read And Stage Flow

The exact current source is localStorage key `schatphone:store:book`, normally a version-1 `{ version, savedAt, data: { assets, categories } }` envelope. Accepted unwrapped `{ assets, categories }` input is legacy version 0. The current `schatphone-layered-storage/state` row with the same full key remains a rebuildable mirror, not a timestamp-based co-owner.

The future migration flow is:

1. acquire `repository-write` and resolve any earlier nonterminal journal;
2. read the local raw string and mirror raw string without changing either;
3. prefer a valid local source; record mirror equality/drift but never choose the newest timestamp;
4. if local is missing/invalid and the mirror is valid, classify it as `legacy_recovery_candidate`; Batch 2B may test/stage that candidate but cannot silently overwrite local or activate it;
5. SHA-256 the exact UTF-8 source bytes before parse, decode only accepted envelope versions, and preserve the immutable bytes in fixture evidence;
6. normalize through the same Book schema functions used by the current store, excluding built-in package assets from persisted records;
7. stage a complete inactive Book generation with `book.asset` and `book.category` membership, counts, ordered ID sets, and digests;
8. read the staged snapshot back and compare exact canonical payloads/order plus valid/missing WorldBook link outcomes;
9. on any failure, abort the candidate and continue reading the unchanged legacy source;
10. stop. Batch 2B does not write the active pointer, import the Adapter into `book.js`, delete legacy state, or begin dual write.

### 10.2 Later Cutover And Rollback Gate

Before the completed Book runtime cutover began, all of these gates were required to pass:

1. canonical inventory and future complete-backup coverage independently include the Repository database, both Book classes, active pointer, and migration evidence;
2. current and legacy backup fixtures preserve Book stable IDs, category order, long text, and WorldBook reference outcomes;
3. the implementation conforms to the accepted schema, Adapter transactions, error codes, and permission/coordination behavior and passes implementation review;
4. measured usage and peak working space pass capacity preflight;
5. immutable source fixtures and the complete failure matrix pass in supported browser storage;
6. migration writes only to an inactive generation and retains raw legacy evidence;
7. activation and reopen verification use the fenced atomic pointer protocol in section 6;
8. first-cutover rollback returns to the unchanged localStorage source; later rollback restores the previous generation;
9. `src/stores/book.js` behavior, built-in resolution, backup snapshot, import/export, locks, delete guards, order, and WorldBook reference reports are equivalent before and after;
10. the legacy carrier remains readable until a separately approved retirement slice with backup/recovery evidence;
11. any newly discovered user-visible behavior difference enters `USER_DECISION_REQUIRED` before cutover.

No dual-write period is assumed. If later proposed, it requires a separate consistency, precedence, conflict, telemetry, and removal contract; it cannot be introduced as a temporary shortcut.

## 11. Batch 2A Acceptance And Completed Batch 2B

### 11.1 Batch 2A Technical-Acceptance Checklist

This contract is `ARCHITECTURE_ACCEPTED` because:

1. the storage-container boundary explicitly forbids save slots, automatic sync, silent merge, and cross-container coordination;
2. database name/version, six object stores, every keyPath/index, singleton metadata, record-version and generation-membership shape are exact;
3. Book assets/categories, built-in exclusion, WorldBook ownership, ordering, Adapter methods, fixtures, errors, and failure injection are exact;
4. legacy localStorage and mirror precedence, immutable source evidence, inactive staging, verification, cutover, and rollback are separated;
5. multi-tab wait/read-only/retry/refresh behavior is confirmed and force takeover/last-write-wins is prohibited;
6. persistent-storage timing, qualifying actions, status states, and Settings retry behavior are confirmed without prompting on startup;
7. Gallery schema, R2, other owner migrations, Book cutover, dual write, garbage collection, and runtime activation were explicitly excluded from Batch 2B; section 12 records the later Book-only approval.

Architecture acceptance closed the technical design gate for the non-active Batch 2B scope below. Batch 2B completed on 2026-07-22 without an application import or active-pointer write. At that point, application storage runtime import, Book cutover, active-pointer activation, Gallery/R2, and other owners remained `NOT_APPROVED`; section 12 records the later separately reviewed Book-only slice.

### 11.2 Completed Batch 2B Exact Files

Batch 2B is the completed non-active IndexedDB foundation plus Book fixture/staging pilot. Its exact implementation files are:

New runtime modules, not imported by application stores or entrypoints:

- `src/lib/persistence-repository-schema.js`
- `src/lib/persistence-repository.js`
- `src/lib/write-coordinator.js`
- `src/lib/persistent-storage-policy.js`
- `src/lib/book-repository-adapter.js`
- `src/lib/book-legacy-migration.js`

One required inventory update:

- `src/lib/persistence-owner-inventory.js`

Immutable fixture files:

- `tests/fixtures/persistence/book/book-empty-v1.json`
- `tests/fixtures/persistence/book/book-single-v1.json`
- `tests/fixtures/persistence/book/book-multi-category-v1.json`
- `tests/fixtures/persistence/book/book-worldbook-links-v1.json`
- `tests/fixtures/persistence/book/book-legacy-unwrapped-v0.json`
- `tests/fixtures/persistence/book/book-limit-edge-v1.json`
- `tests/fixtures/persistence/book/book-invalid-v1.json`

Test files:

- `tests/persistence-repository-schema.test.js`
- `tests/write-coordinator.test.js`
- `tests/persistent-storage-policy.test.js`
- `tests/book-repository-adapter.test.js`
- `tests/book-legacy-migration.test.js`
- `tests/persistence-owner-inventory.test.js`
- `e2e/persistence-repository-foundation.spec.js`

No package dependency, Store, View, composable, router, backup workflow, Gallery module, current `src/lib/persistence.js`, or application entrypoint is in the 2B file list.

The current Node 24 Vitest environment has no `globalThis.indexedDB`, so Vitest alone cannot prove browser object-store creation, transaction semantics, Web Locks, or BroadcastChannel behavior. The focused Playwright spec imports the otherwise unreferenced Repository modules directly inside a Chromium page environment served by the existing test server. It passes a unique disposable database name, opens/upgrades the real IndexedDB database, inspects every store/keyPath/index, exercises commit/abort/reopen transactions, closes all connections, and verifies deletion in cleanup. It does not add or modify an application route, Store, entrypoint, or runtime import.

The same spec uses two pages in one Playwright browser context to prove same-container coordination. It covers the available Web Locks plus BroadcastChannel path and a dependency-injected forced fallback that uses the real IndexedDB lease store/fencing behavior. Cross-context or cross-profile synchronization is neither implemented nor tested because isolated containers must remain independent.

### 11.3 Batch 2B Acceptance

1. Vitest proves the exact schema descriptor, canonical serialization/digests, policy state machines, pure Coordinator rules, fixture immutability, Adapter mapping, migration precedence, and deterministic failure codes;
2. source-level inventory coverage detects the new database, every store, direct storage key, and version;
3. immutable fixture digests and mutation guards pass;
4. Book Adapter round-trips exact canonical snapshots/order and preserves valid/missing WorldBook reference reports without writing WorldBook;
5. legacy tests prove local-first precedence, named mirror recovery candidate, inactive staging, idempotence, and unchanged source bytes;
6. failure injection proves no active pointer change, no partial active generation, and stable structured errors;
7. `e2e/persistence-repository-foundation.spec.js` opens a uniquely named real Chromium IndexedDB database and proves exact object-store/keyPath/index equality, transaction commit/abort, close/reopen consistency, schema-drift rejection, and cleanup deletion;
8. that focused Playwright spec uses two same-context pages to prove the Web Locks/BroadcastChannel path and forced IndexedDB fallback lease path, including one writer, bounded timeout, read-only conflict, retry/refresh, fencing, crash recovery, and no force takeover/last-write-wins;
9. persistent-storage policy tests prove no startup request, contextual qualifying triggers, browser-state refresh, denial/error classification, and explicit Settings retry capability;
10. `git diff --check`, governance, lint, targeted Vitest, full unit tests, build, and `npx.cmd playwright test e2e/persistence-repository-foundation.spec.js` pass. The full product E2E suite is not required unless implementation unexpectedly touches an application runtime path.

### 11.4 Batch 2B Stop Conditions

Stop and return to control review if implementation would require:

- importing the new Repository into `src/stores/book.js` or any app runtime entry;
- writing the active-generation pointer outside tests, deleting/rewriting `schatphone:store:book`, or adding dual write;
- changing Book user-visible behavior, snapshot shape, 300-asset limit, built-in catalog, WorldBook links, or backup payload;
- adding Gallery binary/projection schema, R2/provider code, another owner migration, internal save slots, cross-container sync, or merge behavior;
- adding a force-takeover or last-write-wins path;
- prompting for persistent storage on startup or adding unreviewed Settings/UI copy;
- introducing a dependency or changing a file outside the exact list;
- failing fixture immutability, stable-ID/reference equivalence, capacity preflight, schema drift, rollback, or supported-browser tests.

### 11.5 Batch 2B Implementation Evidence

Completed on 2026-07-22:

1. the six unreferenced Repository/Book/policy/coordinator modules and seven immutable fixtures were added without any Store, View, route, entrypoint, backup workflow, dependency, or current `persistence.js` change;
2. the physical-carrier inventory now registers `schatphone-repository` version 1, all six stores, and the direct legacy Book source while retaining the current 16-store diagnostics projection;
3. focused Vitest passes 6 files / 35 tests, including exact schema descriptors, canonical digests, fixture immutability, local-first legacy precedence, mirror recovery-candidate handling, Book round-trip/reference outcomes, capacity stops, pointer staleness, platform-failure classification, and read-only conflict behavior;
4. focused Playwright passes 3 Chromium tests and proves exact stores/keyPaths/indexes, commit/abort/reopen, schema-drift rejection, transaction-level rollback after a middle-record digest conflict, cleanup deletion, Web Locks plus BroadcastChannel, and the forced real-IndexedDB lease/fencing/recovery path;
5. full validation passes lint, 182 Vitest files / 1129 tests, Vite 7.3.6 production build with 266 modules, governance 11/11, and `git diff --check`;
6. no code path writes `repository_meta/active-generation`, imports the Repository into the application, rewrites `schatphone:store:book`, or changes Book/WorldBook product behavior.

Completion of this foundation did not itself approve cutover. The later Book-only runtime slice below returned to and passed the activation, reopen, rollback, backup, and product-equivalence gates in sections 6 and 10.

## 12. Completed Book Runtime Cutover

Completed on 2026-07-22 after explicit user approval:

1. `src/stores/book.js` now opens the authoritative active pointer at startup. A missing pointer keeps the unchanged legacy Book carrier active; startup never creates or activates a Repository generation.
2. `src/views/BookView.vue` exposes one explicit in-context upgrade action. Persistent storage is checked/requested only after confirmation; denial or unsupported status requires a second best-effort confirmation, while insufficient or unknown capacity stops the cutover.
3. `src/lib/book-repository-runtime.js` acquires `repository-write`, stages and verifies a complete generation, rechecks the pointer, activates it atomically, reopens through the Book Adapter, and completes the journal only after exact snapshot verification.
4. Activation or reopen failure rolls back to the previous generation or, for the first cutover, removes the Repository route and keeps `schatphone:store:book` authoritative. Hard rollback failure retains a `hard_failure` journal for manual recovery.
5. Valid local legacy bytes always win. A mirror-only valid source remains `legacy_recovery_candidate` and requires a separate user confirmation. Startup and cutover never rewrite or delete either legacy layer.
6. After cutover, Book mutations create new immutable Repository generations and never write the legacy carrier. The legacy bytes remain available as the first-cutover recovery source; no dual write or timestamp arbitration exists.
7. Same-container conflicts enter `read_only_conflict` and expose only retry and refresh-current-save. Refresh discards only that page's uncommitted in-memory mutation; no force takeover, merge, or last-write-wins path exists.
8. Book's `{ assets, categories }` backup shape, 300-user-asset limit, built-in resolution, WorldBook source links, imports/exports, lock/delete rules, and canonical order remain unchanged. Complete-backup restore now waits for the Repository save result before reporting success.
9. Focused Vitest protects Store/View/Adapter/migration/coordinator behavior. `e2e/book-repository-cutover.spec.js` proves real-Chromium explicit cutover, reopen, Repository-only later writes with byte-identical legacy fallback, and automatic first-activation rollback after injected reopen failure.
10. Final validation passes lint, 182 Vitest files / 1132 tests, Vite 7.3.6 production build with 273 modules, governance 11/11, the 3 focused Chromium foundation cases, and the 5 desktop/mobile cutover/recovery cases.

Still not approved: Gallery binary Repository schema, R2/provider runtime, another owner migration, garbage collection, cross-container sync/merge, or deletion of the legacy Book fallback.
