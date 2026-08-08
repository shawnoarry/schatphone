# Complete Backup And Recovery Engineering Contract

Updated: 2026-08-09

Status: `ARCHITECTURE_ACCEPTED`; roadmap 4.9 release-local v3 recovery is implemented, while the broader target remains staged.

Purpose: define the engineering contract for complete standalone backup packages, integrity checks, staged restore, capacity reporting, failure handling, legacy migration, and rollback. This contract freezes acceptance boundaries; it does not approve an IndexedDB migration, Cloudflare connector, Gallery schema change, or application-code slice.

Use this contract with:

- `docs/strategy/STORAGE_STRATEGY.md` for product-level storage direction;
- `docs/strategy/STATE_OWNERSHIP_STRATEGY.md` for canonical owners;
- `docs/architecture/ARCHITECTURE.md` for the current persistence topology;
- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md` for live execution status.

## Current Implementation State

Roadmap 4.9 now has a release-local implementation of the core recovery boundary:

- `src/lib/complete-backup-package.js` creates schema v3 files with package magic/identity, all 27 current required sections, canonical per-section byte size and SHA-256 evidence, manifest and payload digests, plus exact Gallery binary inventory/digest checks;
- Settings includes Chat `moduleIdentity` and `moduleAvatarOverrides`, defaults whole-Gallery material on, and stops complete export when retained binaries are missing, unreadable, skipped, oversized for the chosen path, or corrupt;
- restore verifies v3 integrity before mutation, keeps legacy v1/v2 import compatibility without relabeling those files complete, preserves current-only retained Gallery material, and requires all declared full-material binaries;
- the previous metadata-plus-binary current save is cloned into an external Repository operation before Store mutation; commit failure restores it, startup closes pre-apply checkpoints, and unfinished applying checkpoints roll back before app mount;
- desktop and simulated-mobile Chromium prove sensitive export, Chat identity round trip, completed reopen evidence, interrupted-restore recovery, blocked-IndexedDB fail-closed startup, and the full route suite.

The broader target in this contract remains intentionally incomplete: independent canonical-inventory-to-registry closure, predictive source/package/staging/destination capacity reporting, a cross-owner Repository root-generation switch, platform-confirmed local-save durability, the complete legacy unavailable-media presentation path, and personal R2/Worker transport. `src/lib/persistence.js` also remains `localStorage` primary with an IndexedDB mirror for non-Book owners. These follow-ups require separate architecture slices and must not be inferred from the release-local v3 milestone.

## 1. User Outcome

The user must be able to create a backup, keep several independently usable versions, inspect whether a version is usable, and restore one without risking the current save before validation succeeds.

The visible result is:

1. every new version described as `complete` contains the whole core save and can restore without an earlier backup;
2. the one default-on `include material library` choice includes every retained local Gallery binary, with no per-item picker;
3. a backup that excludes Gallery binaries can still reuse matching binaries already present on the same device;
4. restoring an older backup does not implicitly delete or hide material the user has already kept in the current local Gallery;
5. a legacy backup with unrecoverable media may still restore its valid core data after an explicit missing-material summary;
6. missing media appears through a type-appropriate unavailable placeholder so a Chat thread or other owning-module record remains readable rather than becoming corrupt;
7. when a saved caption, alternative description, or natural-language image-generation description exists, the unavailable-media detail may show that text instead of a blank viewer;
8. capacity, validation, migration, upload, commit, and rollback failures never masquerade as backup or restore success.

## 2. Modules, Interfaces, And Ownership

The target design uses small Interfaces around ownership-preserving Modules:

| Module | Responsibility | Must not own |
| --- | --- | --- |
| Backup Package | Freeze a consistent source image, build the manifest, serialize sections, calculate integrity evidence, and self-verify the package. | Domain truth or remote-provider credentials. |
| Canonical Persistence-Owner Inventory | Independently enumerate durable owners/data classes, durability reasons, authority/rebuildability classification, and storage presence for coverage checks. | Backup section declarations or package assembly. |
| Backup Section Registry | Declare the required section set for one backup schema and route each section to its owning module Adapter. | Cross-module truth or UI state. |
| Capacity Preflight | Estimate source, package, temporary working, destination, and restore-staging capacity. | Deletion or retention policy. |
| Restore Orchestrator | Inspect, verify, migrate in staging, resolve assets, plan commit, activate, post-verify, and roll back. | Domain normalization rules. |
| Migration Registry | Compose version-to-version package and domain migrations without mutating the source package. | User-visible product policy. |
| Asset Resolver | Resolve package binaries, exact matching local binaries, URLs, and unavailable references in that order. | Gallery ownership or fabricated replacement content. |
| Local Export Adapter | Hand a verified package to the platform file/save/share surface and report what the platform actually confirms. | An internal local backup library. |
| Remote Backup Adapter | Put, verify, list, read, and explicitly delete provider objects behind a provider-neutral Interface. | Live module truth, sync, or arbitrary provider objects. |

Ownership remains unchanged:

- each domain Module owns its canonical section and migration Adapter;
- Relationship Runtime remains the only owner/writer of persistent relationship truth;
- Event Runtime owns event/proposal definitions and provenance;
- Chat owns conversation and message records, including media references and fallback descriptions attached to those records;
- Gallery owns reusable retained material and local binary identity;
- Settings owns backup controls, progress, status, and recovery entry points, not the backed-up truth.

## 3. Logical Package Contract

The physical container may evolve, but every package has the same logical layers:

```text
delivery object
  -> package envelope
     -> protection metadata
     -> verified logical payload
        -> manifest
        -> required owner sections
        -> optional compatible extensions
        -> included Gallery binary objects
```

### 3.1 Envelope

The envelope must identify:

- SchatPhone package magic/type;
- container-format version;
- protection mode such as local plaintext or client-encrypted remote;
- digest and encryption-suite identifiers;
- payload length;
- enough non-sensitive metadata to reject an unsupported or truncated object before parsing the payload.

Remote objects must use authenticated client-side encryption. Decryption/authentication failure stops before manifest parsing. The personal Worker and storage provider receive no plaintext recovery secret or payload.

### 3.2 Manifest

The verified manifest must include:

- immutable `packageId`;
- backup schema version;
- canonical persistence-owner inventory version used for independent coverage validation;
- creation timestamp;
- source app version and build identifier;
- package purpose and protection mode;
- core-save completeness declaration;
- Gallery binary inclusion mode;
- ordered section inventory;
- per-section owner, schema version, required/optional classification, byte size, record count where meaningful, and digest;
- binary inventory with stable asset identity, byte size, media type, and digest;
- URL-asset inventory with original URL and minimum type/name/source metadata, never a claim that exact bytes are protected;
- total logical and physical byte counts;
- manifest/payload integrity evidence;
- migration provenance added only to a staged migrated copy, never written back into the source package.

Every section required by that backup schema must be present even when its record count is zero. Future modules join the versioned Backup Section Registry rather than being appended by an untracked ad hoc export call.

### 3.3 Independent Coverage And Registry Closure

The Backup Section Registry cannot prove its own completeness. Creation and self-verification must compare it with a separately maintained Canonical Persistence-Owner Inventory that is not generated from the registry or package manifest.

Coverage rules:

1. every durable owner/data class carrying user-visible continuity, authoritative state, audit evidence, settings/security state, or cross-module references maps to a declared required backup section;
2. an inventory entry may be excluded from required coverage only when it is explicitly classified as non-authoritative or rebuildable and records the reason plus its rebuild source;
3. an optional extension may add compatible non-authoritative data, but cannot be the only package carrier of authoritative data;
4. adding or changing a durable owner/data class without updating backup coverage and the applicable schema blocks `complete` package creation;
5. coverage validation compares independent inventory and registry identities in both directions, rejecting an uncovered durable inventory entry, an unexplained registry entry, or conflicting owner/data-class classification;
6. the inventory version and coverage result enter integrity evidence, but the result must be recomputed from the independent inventory during self-verification rather than trusted from the manifest.

For whole-Gallery mode, Gallery must expose an authoritative retained-binary inventory from its owner boundary for the captured source generation. The Backup Package compares the exact set of stable asset ID plus content digest pairs against the package binary inventory. Missing pairs, unexpected pairs, duplicate identities, or digest mismatches fail creation. A Gallery snapshot's self-reported package list is reference evidence only and cannot prove this set is complete.

### 3.4 Standalone Completeness Invariants

A new package may be labeled `complete` only when all of these are true:

1. the independent canonical persistence-owner/data-class inventory is fully covered by required sections or explicit non-authoritative/rebuildable exclusions with recorded reasons;
2. every required core section is present, readable, and valid for its declared owner/version;
3. no optional extension is the only carrier of authoritative data;
4. every section and included binary matches its declared digest and byte size;
5. all required cross-section references resolve or are explicitly valid external/URL references;
6. when Gallery binaries are included, the package binary stable-ID/digest set exactly equals Gallery's authoritative retained-binary set for the captured generation; count or size limits may not omit items;
7. when Gallery binaries are excluded by the user, the manifest says so and retains Gallery metadata, URL records, and source references without claiming binary completeness;
8. no package depends on a base version, previous object, live local record, or remote sidecar in order to restore on a clean compatible client.

Reusing an already-present local binary is a same-device restore optimization, not part of the package's standalone-completeness claim.

## 4. Backup Creation Pipeline

Backup creation must pass these phases in order:

1. `source_snapshot`: obtain a consistent read generation across all owner sections, the independent canonical persistence-owner inventory, and Gallery's authoritative retained-binary inventory;
2. `inventory`: reconcile canonical owner/data-class coverage against the Backup Section Registry, then enumerate required sections, retained binaries, URL records, counts, and sizes;
3. `capacity_preflight`: estimate package and temporary working capacity before expensive encoding or upload;
4. `assemble_staging`: serialize into a new staging object without mutating the live save;
5. `finalize_manifest`: calculate sizes and digests after content is fixed;
6. `self_verify`: read the staged result through the same inspection and integrity Interfaces used by restore, recompute registry coverage from the independent canonical inventory, and compare the whole-Gallery package ID/digest set with the captured authoritative Gallery set;
7. `deliver`: hand the verified local package to the platform, or encrypt and upload the remote object;
8. `destination_confirm`: record only the durability evidence the destination can actually provide;
9. `complete`: report success only for the phases that were confirmed.

If the source changes during snapshot capture and the persistence Adapter cannot provide one consistent generation, creation retries from a new generation or fails before delivery. It must not mix records from different save moments.

For local export, a verified package and an initiated browser download/share action do not prove that the user kept the file. The result must distinguish `package verified`, `handoff initiated`, `save confirmed`, and `confirmation unavailable` according to platform capability.

For remote export, incomplete upload objects are staging artifacts, not backup versions. They must not appear in the user's backup list. Bounded cleanup of failed staging artifacts is allowed because they never became confirmed recovery points; confirmed backup objects remain exempt from automatic rotation or deletion.

## 5. Integrity Verification

Inspection and restore use the same ordered verification pipeline:

1. envelope magic, supported container version, and declared length;
2. authenticated decryption when protected;
3. payload parseability and structural limits;
4. manifest presence, schema support, and manifest digest;
5. exact required-section inventory for the declared schema;
6. per-section byte size, digest, shape, and owner validation;
7. cross-section identity/reference consistency;
8. included-binary inventory, byte size, digest, media type, and Gallery-reference consistency;
9. migration-path availability for older schemas;
10. current-schema validation after staged migration;
11. restore-capacity and commit-plan validation.

URL availability is not an integrity requirement because the confirmed product contract protects the URL record, not remote bytes. A broken URL resolves to the unavailable-media path without corrupting the owning record.

The verifier returns structured evidence, not one boolean:

- package identity and source version;
- `current_complete`, `legacy_complete`, or `legacy_degraded` classification;
- verified and failed section counts;
- included, reusable-local, URL-only, and unavailable media counts;
- migration path and warnings;
- capacity result;
- blocking error codes.

## 6. Capacity And Quota Contract

Capacity preflight must report separately:

- current save bytes by major owner/data class;
- selected Gallery binary count and bytes;
- estimated final package bytes;
- estimated peak temporary working bytes for creation or restore;
- browser storage usage/quota and persistent-storage status when the platform exposes them;
- remote object size limits, reported usage/quota, and upload headroom when the provider exposes them;
- `available`, `insufficient`, `unknown`, or `unavailable` confidence for each destination.

No universal fixed-size budget is implied. Estimates must state their confidence and include format/encoding overhead. An Adapter may use streaming to reduce peak memory, but cannot omit content to fit.

Creation is blocked before delivery when:

- a required section cannot be read consistently;
- the selected whole-Gallery package contains a missing/unreadable local binary;
- known local working capacity is insufficient for the chosen creation path;
- a known destination limit cannot accept the verified package;
- self-verification fails.

The user may explicitly turn off the whole-Gallery option and create a core-complete package, but the product must not turn it off automatically. Capacity pressure may explain size and ask the user to free space, choose a different destination, or remove old cloud versions manually. It never authorizes automatic deletion or silent partial packaging.

An unknown browser/provider quota is not reported as safe capacity. The Adapter may continue only when its write path can fail without changing the live save or publishing a false recovery point.

## 7. Staged Restore And Atomic Activation

Restore follows this state machine:

```text
inspect
  -> verify
  -> migrate_staging (when required)
  -> resolve_assets
  -> build_plan
  -> acquire_restore_lease
  -> stage_new_generation
  -> verify_staged_generation
  -> activate
  -> post_commit_verify
  -> complete

any commit failure
  -> rollback
  -> verify_previous_generation
  -> failed_without_save_change
```

Required invariants:

1. inspection, decryption, verification, migration, asset resolution, and planning do not mutate the current save;
2. restore acquires a cross-tab lease and stops other writers before staging a commit;
3. the source package remains immutable;
4. the complete target state, including required binaries, is written to a separate generation or equivalent transaction boundary;
5. activation is one atomic root/generation switch, not sequential store replacement;
6. the previous generation remains available until post-commit verification succeeds;
7. metadata and binaries commit or roll back together;
8. success is reported only after the active generation reopens and verifies;
9. the restore journal records only the minimum phase/generation evidence needed to recover from a crash and is cleared after verified completion or rollback.

On launch after interruption, normal writes remain locked while the Restore Orchestrator inspects the journal. It must either verify the new active generation or reactivate and verify the previous generation. It may not continue from a mixed or unverified state.

## 8. Local Material Preservation And Resolution

Restoring an older or binary-excluded backup is non-destructive toward material the user has already kept locally.

Resolution order for each media reference is:

1. verified binary contained in the package;
2. exact local match by stable asset identity plus digest, or by content digest when the identity changed through migration;
3. original URL record when the media is URL-backed;
4. unresolved reference rendered through the unavailable-media fallback.

Safety rules:

- filename, display name, prompt text, or URL alone is never sufficient to attach a local binary;
- an identity/digest conflict never overwrites the current local original; migration remaps the staged reference or leaves it unresolved;
- current local Gallery items that are absent from the older backup remain retained and visible; restore is not an implicit Gallery deletion action;
- package Gallery metadata may add or restore entries, references, and folders, but must merge through stable identities without deleting current-only retained material;
- reused local binaries are included in staged verification before activation;
- unresolved references retain their original identity and provenance so a later exact re-link can replace the fallback without rewriting history.

This is deliberately different from an internal multi-save system. There is still one current save; Gallery preservation is a non-destructive retained-material rule inside that container.

## 9. Legacy And Missing-Media Recovery

Legacy packages created before this contract may lack complete manifests, digests, sections, or local binaries. A version-specific legacy Adapter may migrate them when it can prove the valid core records it is importing.

Legacy behavior:

1. a legacy source is never relabeled as an original complete package;
2. inspection reports recoverable core sections and unavailable media before commit;
3. known historical absence may receive version-defined defaults; declared-but-corrupt content may not be defaulted silently;
4. valid core data may restore under `legacy_degraded` after the user is told that named/countable material cannot be recovered;
5. any local exact matches are reused before an item is classified unavailable;
6. the staged current-format result must pass all current core-section and reference checks before activation;
7. the restore completion result and each unresolved reference retain enough missing-material identity, type, and provenance for review and later exact re-link; this does not establish an undeclared permanent report library, and the report page, navigation entry, and retention period remain later implementation UX acceptance.

### 9.1 Unavailable-Media Fallback

The fallback is a derived presentation state, not a fabricated asset and not proof that the original file was backed up.

It must:

- preserve the owning record, message order, sender, timestamp, media kind, aspect/layout hint where known, and original reference/provenance;
- render a stable type-appropriate placeholder for image, animated image/GIF, audio, video, or generic file so surrounding history remains readable;
- prevent repeated failing network/binary reads from breaking the containing view;
- show a saved caption, alternative description, or natural-language generation description when one exists;
- let an image-message detail surface show that text when no image can be resolved;
- avoid inventing a description when none was stored;
- avoid retaining full AI prompts, raw provider responses, headers, or transport payloads merely to support fallback text.

The natural-language generation description is canonical user-facing media metadata only when the source module stored it for that result. It is not the same as retaining hidden provider request/response diagnostics.

## 10. Migration Contract

Three version axes remain separate:

- container format version;
- backup schema version;
- owner-section/domain schema version.

Migration rules:

1. reject unsupported future required schemas without mutating the current save;
2. migrate one declared version step at a time through a registry;
3. keep every step deterministic, idempotent, and testable against immutable fixtures;
4. validate structural limits before a step and owner invariants after it;
5. record migration provenance only in the staged result/report;
6. let each owner Module migrate its own section while the orchestrator handles ordering and cross-section reference remaps;
7. never rewrite the user's source file or remote object;
8. stop when no complete migration path exists;
9. distinguish a legacy degraded recovery from a newly created complete package;
10. require an export/restore compatibility fixture for every supported historical version before removing its Adapter.

Storage-engine migration is a separate Implementation concern. A backup migration may produce the logical current state, but it does not authorize an IndexedDB schema, repository layout, or Gallery binary schema.

## 11. Rollback And Crash Recovery

The rollback boundary includes every owner section, Gallery metadata, resolved package/local binaries, relationship truth, event records, and the active-generation pointer.

Before activation, the journal must identify the previous verified generation and the staged candidate. If activation or post-commit verification fails:

1. reactivate the previous generation;
2. reopen and verify its required sections and binary references;
3. discard only the uncommitted staged generation after recovery evidence is recorded;
4. leave confirmed local/remote backup versions untouched;
5. report the failing phase and whether the previous save was verified unchanged.

A rollback that cannot verify the previous generation is `ROLLBACK_FAILED`, never ordinary import failure or success. Normal writes remain blocked until the recovery path verifies one generation. Exact emergency UI/copy belongs to a later implementation slice; the engineering acceptance is that mixed state cannot be used silently.

## 12. Failure Taxonomy

Every failure record includes a stable code, phase, package ID when readable, retryability, destination/provider when relevant, current-save impact, and minimum non-secret diagnostics.

| Category | Representative codes | Required effect |
| --- | --- | --- |
| Source capture | `SOURCE_READ_FAILED`, `SOURCE_CHANGED`, `REQUIRED_SECTION_UNAVAILABLE` | No package delivery. |
| Capacity | `WORKING_CAPACITY_INSUFFICIENT`, `DESTINATION_CAPACITY_INSUFFICIENT`, `CAPACITY_UNKNOWN_WRITE_FAILED` | No content omission or automatic deletion. |
| Package | `CONTAINER_INVALID`, `SCHEMA_UNSUPPORTED_FUTURE`, `MANIFEST_INVALID`, `REQUIRED_SECTION_MISSING` | Stop before current-save mutation. |
| Integrity | `SECTION_DIGEST_MISMATCH`, `BINARY_MISSING`, `BINARY_DIGEST_MISMATCH`, `REFERENCE_INVALID` | New package is not complete; restore does not commit. |
| Protection | `DECRYPTION_FAILED`, `RECOVERY_SECRET_INVALID` | No plaintext or secret leakage; no restore mutation. |
| Migration | `MIGRATION_PATH_MISSING`, `MIGRATION_STEP_FAILED`, `MIGRATED_STATE_INVALID` | Source remains unchanged; staged result is discarded. |
| Coordination | `RESTORE_LOCKED`, `ACTIVE_WRITER_CHANGED`, `COMMIT_INTERRUPTED` | Retry or crash recovery before normal writes resume. |
| Commit | `STAGING_WRITE_FAILED`, `ACTIVATION_FAILED`, `POST_COMMIT_VERIFY_FAILED` | Roll back metadata and binaries together. |
| Rollback | `ROLLBACK_FAILED` | Block normal writes and retain journal/recovery evidence. |
| Local delivery | `LOCAL_HANDOFF_CANCELLED`, `LOCAL_SAVE_UNCONFIRMED`, `LOCAL_WRITE_FAILED` | Do not claim a durable local backup. |
| Remote | `REMOTE_AUTH_FAILED`, `REMOTE_QUOTA_EXCEEDED`, `REMOTE_TRANSPORT_FAILED`, `REMOTE_VERIFY_FAILED` | Do not list a staging object as a backup; preserve existing versions. |

Partial packages and partial commits are never success-with-warning under the new contract. `legacy_degraded` applies only to an inspected historical source whose recoverable core is staged and validated under the explicit legacy rules.

## 13. Remote Adapter Acceptance

The provider-neutral remote Adapter must:

- scope list/get/put/delete to the SchatPhone backup prefix;
- list only confirmed backup objects and expose package date/name/size/integrity status available without plaintext content;
- upload a complete client-encrypted object and verify provider-confirmed size/identity before listing it as ready;
- preserve existing objects when authentication, quota, transport, or verification fails;
- distinguish retryable transport failures from invalid credentials and insufficient quota;
- never auto-delete a confirmed object;
- require the already-confirmed explicit destructive flow before deleting one selected cloud object;
- leave the visible object in the list until deletion is confirmed by the provider;
- support direct in-app selection and restore without creating an internal local backup library.

Cloudflare R2 is the first guided Adapter, not a semantic dependency of the package, integrity, migration, or restore Modules.

## 14. Acceptance And Test Matrix

No persistence implementation may be approved until its focused tests prove at least:

1. a newly generated package restores on an empty compatible container without any earlier version;
2. omitting a durable owner/data class from the Backup Section Registry, or carrying its authoritative data only in an optional extension, fails creation when compared with the independent canonical inventory;
3. every independently covered required section is present even when empty;
4. one-byte section or binary corruption is rejected before current-save mutation;
5. whole-Gallery inclusion fails when the authoritative retained stable-ID/digest set and package binary set have any missing, extra, duplicate, or mismatched entry;
6. whole-Gallery inclusion fails rather than silently skipping an unreadable or over-limit retained binary;
7. binary-excluded restore reuses an exact local match and rejects a name-only false match;
8. restoring an older backup leaves current-only retained Gallery material visible;
9. a broken URL or absent legacy binary produces the type-appropriate placeholder while preserving record order and provenance;
10. stored generation-description fallback opens when the image is unavailable;
11. legacy degraded restore reports missing media and restores validated core data;
12. unsupported future schema, failed migration, and insufficient capacity leave the current save byte-for-byte/logically unchanged;
13. a failure at every commit phase reactivates and verifies the previous generation, including Gallery binaries;
14. simulated crash recovery completes or rolls back from each journal checkpoint without exposing mixed state;
15. concurrent-tab writes are blocked during activation;
16. local delivery distinguishes verified package creation from destination confirmation;
17. remote upload/auth/quota/verification failure creates no visible recovery version and deletes no earlier version;
18. complete local export still contains configured credentials and displays the separately confirmed sensitive-file warning when that UI slice is implemented;
19. remote package content is encrypted before leaving the client and can be recovered through either confirmed recovery path.

Target implementation validation will require focused unit/integration fixtures plus the full persistence baseline (`lint`, unit tests, build, and relevant E2E). This documentation slice itself requires only documentation/governance validation.

## 15. Explicit Non-Approval

This contract does not approve:

- an IndexedDB database or table/schema design;
- a Gallery metadata or binary schema change;
- an R2 Worker or provider implementation;
- a reference-domain migration;
- internal save slots or an internal local backup library;
- incremental/delta backup chains;
- remote media offload, sync, or automatic merge;
- a fixed storage budget;
- automatic deletion of confirmed backup versions;
- exact emergency-screen wording or visual design.

The next implementation-bearing slice must be separately promoted after its own schema, Adapter, migration fixture, rollback proof, and validation scope are accepted.
