# Persistence Repository Contract

Status: `DRAFT_FOR_CONTROL_REVIEW`

Updated: 2026-07-21

Owner: Module Architecture / Technical Governance

Purpose: close the inventory, ownership, Repository Interface, generation, capacity, coordination, and reference-migration contract before any IndexedDB-first write path is approved.

This document is a technical contract for review. It does not authorize a storage migration.

## 1. Decision State

Approved direction for this draft:

1. browser and installable PWA clients remain complete first-class clients;
2. the future Repository uses a hybrid physical model: a generic record envelope for most structured owner records, plus only the specialized binary or projection stores that earn a separate Adapter;
3. restore and migration activation use a staged generation plus one atomic active-generation pointer;
4. Book is the first low-risk reference-migration candidate, but only immutable fixture and failure acceptance is defined here;
5. `system.truthState` remains required legacy compatibility data until immutable fixtures prove it can be reconstructed without continuity loss;
6. Calendar reminder cues remain legacy import compatibility, while Reminders is the canonical reminder owner;
7. persistent-storage prompt timing and multi-tab timeout/conflict UI remain `USER_DECISION_REQUIRED` and configurable at the Interface.

Explicit status:

- `Storage implementation = NOT_APPROVED`;
- `IndexedDB-first keyPath and object-store schema = NOT_APPROVED`;
- `Gallery binary schema = NOT_APPROVED`;
- `R2 Adapter or Worker implementation = NOT_APPROVED`;
- `Book migration/cutover = NOT_APPROVED`;
- `dual write = NOT_APPROVED`;
- `runtime generation activation = NOT_APPROVED`.

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

## 4. Hybrid Physical Model

### 4.1 Generic Record Envelope

Most structured owner records use one logical envelope:

```text
ownerId
dataClassId
recordId
recordSchemaVersion
generationId
revision
createdAt
updatedAt
payload
sourceReferences[]
integrityMetadata
```

Contract rules:

- `payload` contains owner data, not copied truth from another module;
- envelope metadata is sufficient to validate owner/class/version before decoding payload;
- `revision` is monotonic within one stable record identity and generation lineage;
- timestamps cannot be used as identity;
- provenance/reference fields remain compact and cannot become a second copy of full owner content;
- record digests may be used for integrity and exact binary matching but do not replace stable identity.

This is a logical envelope. Concrete IndexedDB keyPaths, compound keys, object-store count, transaction grouping, serialization encoding, and indexes remain unapproved.

### 4.2 Specialized Stores

A specialized Adapter is permitted only when a generic record envelope cannot provide required correctness or performance without leaking complexity to callers.

Current justified categories for design review:

- Gallery binary content, because Blob lifecycle, byte size, digest, streaming, and reference integrity differ from ordinary structured records;
- rebuildable query/search projections, only when they can be recreated from authoritative owner records and carry an explicit source generation.

Specialized does not mean separately authoritative. A projection records its source owner/class/generation and is disposable. Gallery metadata remains in the Gallery owner model even if bytes use a binary Adapter.

## 5. Stable Identity And References

1. IDs are generated once by the canonical owner and survive export, import, migration, archive, pause, and restore.
2. Cross-module references use `{ ownerId, dataClassId, recordId }` plus relation/source type where needed.
3. A physical key, array index, display name, filename, prompt, URL, or timestamp cannot serve as cross-module identity.
4. Legacy numeric/string IDs are preserved through a declared normalization rule; migration cannot silently mint replacements that strand references.
5. Gallery local-binary reuse requires stable asset/blob identity plus exact digest evidence. Filename, label, prompt, and URL matching are insufficient.
6. URL-backed media keeps the original URL and descriptive/source metadata as an external reference. URL availability is not package integrity.
7. Removing a record with inbound authoritative references requires the owning product lifecycle rule; Repository deletion cannot invent cascade behavior.

## 6. Generations, Journal, And Atomic Activation

A generation is an immutable candidate snapshot after verification. Ordinary record edits may build a new committed generation internally, but callers observe one active generation at a time.

Required states:

```text
staging -> verified -> activating -> active
                    -> aborted
activating -> rollback_required -> previous_active
```

Activation protocol:

1. capture the current active generation and operation ID in the recovery journal;
2. finish all staged structured and binary writes;
3. verify required owner/classes, schemas, references, and binary evidence;
4. durably mark the candidate verified;
5. update one atomic active-generation pointer;
6. reopen through the normal read Interface and verify the new active generation;
7. clear or finalize the journal only after reopen succeeds;
8. on failure, restore the previous pointer and verify it before reporting rollback success.

No active metadata may point to binary content from a different uncommitted generation. Staging cleanup is allowed only for never-activated artifacts and must not delete a confirmed recovery point.

### 6.1 LocalStorage Hint Allowlist

After an approved cutover, `localStorage` may hold only bounded boot/recovery hints such as:

- the active-generation pointer or a compact pointer cache;
- a bounded crash-recovery journal pointer/status;
- schema/build compatibility hints needed before IndexedDB opens;
- explicitly classified non-authoritative feature flags such as the current Home layout-edit flag.

The current 16 whole-store snapshots remain legacy compatibility carriers until each owner migration is approved. This draft does not delete, relocate, dual-write, or reinterpret them. Chat session feedback remains `sessionStorage` transient state and is not promoted into durable recovery metadata.

## 7. Capacity And Persistent Storage Interface

The capacity Adapter normalizes platform capabilities without deciding user-visible timing. It must support:

- `navigator.storage.estimate()` when available, returning usage/quota and `available`, `insufficient`, `unknown`, or `unavailable` confidence;
- `navigator.storage.persisted()` when available;
- a separately invoked `navigator.storage.persist()` attempt only after product UX approves when to ask;
- per-owner/data-class logical bytes, Gallery binary bytes, staged-generation bytes, and estimated peak working bytes;
- structured unsupported/denied/error results rather than treating all false values alike.

Conservative defaults:

- absence of an estimate is `unknown`, not zero capacity and not permission to skip preflight;
- denial of persistent storage does not corrupt or erase the current save;
- capacity pressure never authorizes silent deletion of authoritative records or retained binaries;
- the Adapter reports facts; Settings or another approved UX Module decides copy and next actions.

`USER_DECISION_REQUIRED`: the first prompt timing, repeat-prompt policy, and exact visible explanation for persistent-storage permission are not approved.

## 8. WriteCoordinator Interface

All mutating Repository operations cross a WriteCoordinator seam. Its Interface provides:

- operation ID and intended owner/class/generation scope;
- lease acquisition with configurable timeout;
- heartbeat/renewal when the chosen Adapter needs it;
- commit/release and crash-expiry evidence;
- stale-writer rejection using active generation/revision;
- a cross-tab notification containing only bounded coordination metadata;
- structured `busy`, `timed_out`, `stale_generation`, `lease_lost`, and `unsupported` outcomes.

Possible future Adapters include Web Locks plus BroadcastChannel, or a durable lease record plus BroadcastChannel fallback. This draft does not choose one or prescribe timeout values.

Conservative behavior before UX approval: an unresolved competing write must fail closed without changing the active generation. It cannot silently merge owner state, steal a live lease, or show a success result.

`USER_DECISION_REQUIRED`: exact UI after a multi-tab timeout/conflict, including retry, switch-tab, force-takeover, or read-only choices, is not approved. The Interface keeps timeout and allowed actions configurable so implementation cannot freeze that decision.

## 9. Book Reference-Migration Fixtures

Book is the first candidate because it has one owner, a bounded Interface (`assets` and `categories`), stable IDs, no separate binary carrier, focused store tests, and lower cross-store write coupling than Chat, System, Gallery, or Relationship Runtime.

Before any migration runtime exists, the following fixtures must be checked into a later approved slice as immutable inputs. A fixture is never rewritten by the migration under test.

| Fixture ID | Required evidence |
| --- | --- |
| `book-empty-v1` | empty assets/categories round-trip and stable empty ordering |
| `book-single-v1` | one asset/category with all normalized required fields |
| `book-multi-category-v1` | deterministic category and asset ordering with stable links |
| `book-worldbook-links-v1` | valid and missing WorldBook source references are reported distinctly |
| `book-legacy-normalization-v1` | accepted legacy aliases/defaults normalize without identity loss |
| `book-limit-edge-v1` | maximum accepted record counts and long text do not truncate silently |
| `book-invalid-v1` | malformed IDs, duplicate IDs, invalid category links, and unsupported versions are rejected with stable codes |

Each fixture set requires:

- original legacy envelope bytes and digest;
- expected canonical records and ordering;
- expected warnings/errors and reference report;
- expected rollback state;
- a mutation guard proving the source fixture is byte-identical after every run.

### 9.1 Failure-Injection Matrix

| Phase | Injected failure | Required result |
| --- | --- | --- |
| inspect | unreadable/unsupported Book envelope | no staging write; active save unchanged |
| normalize | duplicate or invalid stable ID | deterministic validation error; no generated replacement ID |
| stage records | failure before first/middle/final record | incomplete generation remains inactive and cleanable |
| stage index | projection/index build failure | authoritative staged records never activate alone |
| verify | count, digest, schema, order, or reference mismatch | candidate rejected; active pointer unchanged |
| acquire write lease | another tab owns the lease | structured busy/timeout result; no partial write |
| pointer activation | atomic update fails | previous active generation remains selected |
| reopen verify | candidate cannot reopen | journal enters rollback-required and previous generation is restored |
| rollback | previous pointer cannot reopen | hard recovery error retains both generations and journal evidence |
| crash/reload | crash at every journal transition | deterministic resume or rollback without mixed generations |

Passing this matrix approves only the Book Adapter implementation presented for review. It does not approve cutover.

## 10. Migration And Rollback Gates

A future owner migration cannot begin until all gates pass:

1. canonical inventory and Backup Section Registry cover the owner/data class independently;
2. current and legacy backup fixtures include that owner and preserve stable references;
3. logical Repository Interface, owner schema, Adapter transactions, and error codes receive control review;
4. capacity and peak-working-space behavior is measured;
5. immutable source fixtures and the complete failure matrix pass;
6. migration writes only to an inactive generation;
7. activation and reopen verification are atomic at the generation pointer;
8. rollback restores structured records, projections, and binaries as one consistency unit;
9. the legacy carrier remains readable until rollback support is explicitly retired;
10. any user-visible behavior difference enters `USER_DECISION_REQUIRED` before implementation.

Cutover proof must compare owner-visible behavior and exact stable-reference sets before and after migration. Record counts alone are insufficient.

No dual-write period is assumed. If later proposed, it requires a separate consistency, precedence, conflict, telemetry, and removal contract; it cannot be introduced as a temporary shortcut.

## 11. Acceptance For Control Review

This draft is ready for control review when:

1. source-level tests fail for an unclassified persisted key, IndexedDB carrier/store, or direct browser-storage key;
2. Settings diagnostics consume the inventory projection and audit all 16 stores including Book;
3. the current exporter consumes the independent legacy v2 schema/section shape registry without changing the exported JSON or import order, and the result distinguishes shape validity from complete-package eligibility;
4. durable authoritative classes cannot be satisfied by an `optional` or `excluded` registry entry;
5. the Chat identity v2 gap is explicit and cannot support a future complete-package claim;
6. owner/class, Repository Interface, hybrid model, envelope, identity, generation, allowlist, quota, coordination, Book fixtures, migration, and rollback rules are reviewable;
7. every still-unapproved implementation and user-visible behavior is labeled rather than inferred.

Approval of this document would approve the technical contract only. Storage implementation remains `NOT_APPROVED` until a later package slice names exact files, schema/Adapter details, fixtures, rollback, validation, and stop conditions.
