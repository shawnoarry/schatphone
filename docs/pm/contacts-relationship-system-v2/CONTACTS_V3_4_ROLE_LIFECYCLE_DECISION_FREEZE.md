# Contacts V3.4 Role Lifecycle Decision Freeze / 人物生命周期决策冻结

Updated: 2026-08-28

Status: `DECISION_FREEZE_COMPLETE / V3-4A_FOUNDATION_DONE 2026-08-28 / V3-4B_COORDINATOR_DONE 2026-08-28 / V3-4C_UI_DONE 2026-08-28 / V3-5_GATED`

Execution authority: `docs/roadmap/TODO_ROADMAP.md`

This contract defines what it means to archive, restore, upgrade, or permanently delete a Contacts person. V3-4A implements the archive/restore and ID-reservation foundation, and V3-4B implements internal tombstone/Wallet/cross-owner permanent-delete coordination. It does not claim that the V3-4C archived-people UI, archived Wallet suspension, confirmation flow, or legacy-entry replacement already exists.

## 1. Plain-Language Outcome

Contacts has three distinct person states:

1. `Active / 正常使用`: the person may appear in ordinary Contacts, Chat, identity projections, and eligible owner flows.
2. `Archived / 已归档`: the person is temporarily put away. Their identity, profile card, Chat history, relationship progress, memories, receiving-account definition, and source lineage remain intact and can be restored.
3. `Deleted tombstone / 已永久删除的保留编号`: the live profile is gone. A minimal non-person record reserves the old internal and visible IDs so no future person can inherit the deleted person's history.

Archive is reversible. Permanent deletion is destructive. Memory archival, Chat unbinding, relationship reset, and person archival are separate actions.

## 2. Pre-V3-4A Evidence

The baseline before V3-4A did not satisfy this contract:

- `src/lib/contacts-profile-owner.js` has create, revise, person-depth upgrade, remove, and replace-all behavior, but no profile lifecycle state, archive, restore, tombstone, or ID high-water mark.
- automatic profile IDs use `max(current profile ID) + 1`; deleting the highest profile therefore allows accidental ID reuse.
- `src/stores/chat.js` physically carries `roleProfiles`; removing a profile can remove its Chat binding, conversation, and messages.
- `src/lib/contacts-relationship-actions.js` deletes Relationship Runtime first, optionally cleans registered source records, and removes the profile last. It does not provide one atomic rollback receipt across all owners.
- `src/views/ContactsView.vue` removes Wallet known-payee references only after the existing cascade succeeds, outside the Contacts Profile Owner and cascade Module.
- Gallery person tags, Mini Scene profile bindings, Simulation proposals, legacy System truth, and historical owner records do not share one lifecycle registry.
- complete backup requires `roleProfiles`, but carries no profile tombstones or profile-ID high-water mark.
- person-depth upgrades already preserve the live profile ID and Chat history; this behavior is retained.

## 3. Scope

V3.4 owns lifecycle semantics and orchestration for non-self Contacts people:

- Main Role;
- Supporting Role;
- World NPC.

The first V3.4 implementation must fail closed for ordinary Self Profile archive or deletion. A per-world Self Profile can be replaced or removed only through a later world/account identity flow that guarantees another valid current identity or an explicit world reset. This prevents an ordinary person-management action from deleting the user's current world identity.

V3.4 does not create organization authority, events, Calendar commitments, Work Hub records, Chronicle entries, or public content.

## 4. Stable Lifecycle Model

### 4.1 Active

An active person:

- participates according to their entity type, capabilities, visibility, world, template, and profile revision;
- may be shown in ordinary Contacts groups and search;
- may be bound to Chat when eligible;
- may expose purpose-authorized projections;
- owns an active fictional receiving-account definition when the existing profile rules provide one.

### 4.2 Archived

Archiving is a Contacts-owned profile revision, not deletion.

Archive must:

- keep the same numeric `profileId` and visible `roleId`;
- keep the complete profile card, person extensions, detail items, assets, world/template references, capabilities, tags, and current revision as the predecessor of the archive revision;
- keep Chat binding, conversation, and messages;
- keep Relationship Runtime metrics, facts, memory groups, and review state;
- keep source records and historical references;
- keep receiving-account definitions and Wallet's learned reference so restore does not create a new account identity;
- record archive time and an optional bounded user note;
- increment the profile revision exactly once after successful persistence.

While archived, the person:

- is hidden from default active Contacts groups, recent shortcuts, ordinary search results, and new-target pickers;
- appears in one explicit archived-people review surface;
- keeps existing Chat history readable, but cannot send or receive new generated Chat messages until restored;
- cannot be newly bound to Chat;
- is excluded from new Event Runtime eligibility, Work Hub matching, public-content projection, automatic contact candidates, and new relationship effects;
- cannot disclose or receive a new Wallet payee action, although immutable historical transactions and receipts remain visible;
- cannot be silently restored by an event, AI output, imported draft, or downstream consumer.

Archiving one person does not archive their memories individually, reset their relationship, delete a Chat thread, or remove them from historical records.

### 4.3 Restore

Restore reactivates the archived record in place.

Restore must:

- require the same profile and expected archived revision;
- keep the same profile and role IDs;
- keep Chat binding/history, profile values/extensions, relationship truth, memories, receiving accounts, and source lineage;
- clear the active archive marker while retaining lifecycle audit timestamps;
- increment the profile revision exactly once after successful persistence;
- make new Chat, projection, matching, and eligible owner actions available again only after the write succeeds.

Restore does not create a new person, merge two people, rebuild missing history by name, or grant organization authority.

If any required stable reference is corrupt or ambiguous, restore fails visibly and leaves the archived record unchanged.

### 4.4 Person-Depth Upgrade

`World NPC -> Supporting Role -> Main Role`, including the compatibility direct World NPC -> Main Role path, remains an in-place profile revision.

Upgrade must preserve:

- profile and role IDs;
- active/archive state;
- Chat binding and history;
- profile values and person extensions;
- relationship references, facts, and memories;
- receiving-account identity;
- world/organization references;
- event and owner-record lineage;
- backup compatibility.

An archived person must be restored before a user can upgrade them. Upgrade cannot be used as an implicit restore.

## 5. Permanent Deletion

Permanent deletion is allowed only for an archived non-self person in the target V3.4 flow. The current direct-delete UI remains legacy behavior until the new lifecycle flow replaces it; implementation must not partially impose the new precondition without updating the complete user path.

The user must receive:

1. an impact preview covering profile, Chat, relationship, memory, Wallet, Gallery/person tags, owner records, and unsupported references;
2. a clear choice for registered linked source records where cleanup policy allows a choice;
3. a typed visible role-ID confirmation;
4. a final statement that restore is impossible except by restoring a complete older backup that rewinds the whole save.

Successful permanent deletion must:

- remove the live Contacts profile;
- remove its Chat binding, conversation, and messages under the confirmed destructive scope;
- remove its live Relationship Runtime entity, facts, and memory groups under the confirmed scope;
- remove or anonymize registered linked source records according to their owner cleanup policy;
- unlink Gallery person tags and active Mini Scene/person bindings without deleting unrelated media or retained canonical owner records;
- revoke the profile's receiving-account definition and remove or disable Wallet's learned payee entry;
- preserve immutable Wallet transactions, receipts, orders, Calendar history, event audit, and other owner history with their original snapshots and deleted-person reference;
- create one minimal tombstone that permanently reserves the old profile and role IDs in the current save lineage.

Permanent deletion must never reassign an old record to another person or rewrite an immutable receipt as though the deleted person never existed.

## 6. Tombstone And ID Rules

A tombstone is not a profile and must never appear as a Chat or event person.

The minimum tombstone contains:

- numeric `profileId`;
- visible `roleId`;
- last entity type;
- last world ID when available;
- deletion timestamp;
- deletion schema version.

It must not retain biography, avatar, profile values, person extensions, relationship text, messages, memories, receiving-account details, or private free text.

Rules:

- neither `profileId` nor `roleId` may be reused while its tombstone exists;
- automatic numeric allocation uses a persisted high-water mark and considers both live profiles and tombstones;
- user-entered role IDs are checked against live profiles and tombstones;
- a tombstone cannot be restored into a live profile through ordinary Contacts UI;
- historical owners may display their own saved name/recipient snapshot, otherwise they show a neutral `Deleted person / 已删除人物` label plus the old visible role ID;
- a complete backup includes tombstones and the high-water mark;
- restoring a complete older backup is an explicit whole-save rewind and may legitimately return to a point before deletion. Partial import or merge must not bypass current tombstones.

## 7. Receiving Accounts And Wallet History

Contacts owns the fictional receiving-account definition attached to a non-self profile. Wallet owns learned payee references, confirmed transfers, balances, receipts, and transaction history.

Lifecycle meaning:

- active: new disclosure and transfer may proceed through existing Wallet confirmation;
- archived: account identity is preserved but suspended for new disclosure and transfer;
- restored: the same account identity becomes usable again;
- permanently deleted: the profile definition is removed and learned payee access is revoked;
- historical transaction and receipt records remain immutable and may retain their original account/profile snapshots.

Wallet cleanup must move from the current view-only follow-up into the lifecycle coordinator or a registered Wallet lifecycle Adapter. A profile must not disappear while its learned payee remains usable.

## 8. Cross-Module Failure And Rollback

One lifecycle command must return one structured receipt.

Before a write, the coordinator captures the smallest complete rollback snapshot for every participating owner. It then validates expected profile revision, lifecycle state, stable references, cleanup coverage, and persistence availability.

Rules:

- archive and restore commit the Contacts profile revision before exposing the new state to consumers;
- permanent deletion must not report success after only some owners changed;
- a failed required owner step restores every already-mutated owner and re-persists the previous save;
- an unsupported optional historical reference remains visible in the impact preview and receives an explicit retained/orphan policy; it is not silently ignored;
- the final receipt records success/failure, affected owner, counts, retained-history counts, cleanup decisions, tombstone ID, and rollback result without copying private record bodies.

## 9. Persistence And Compatibility

The physical carrier may remain inside the current Chat storage envelope during V3.4, but logical ownership remains Contacts.

The first implementation must add compatibility-safe persisted values for:

- profile lifecycle state;
- profile tombstones;
- profile-ID high-water mark.

It must also:

- provide an explicit reader/migration for the current `store:chat` version instead of raising the version and treating old data as empty;
- keep current top-level `roleProfiles` complete-backup compatibility;
- add tombstone/high-water coverage to complete backup, integrity checking, restore rollback, and persistence inventory;
- normalize legacy profiles as active;
- initialize a missing high-water mark from the maximum live/tombstone ID;
- reject duplicate numeric profile IDs instead of repairing them by name;
- preserve current stable `roleId` normalization without reusing tombstoned IDs.

## 10. UI Contract

The target Contacts flow is:

`Manage person -> Archive -> Archived people -> Restore or permanently delete`

UI rules:

- Archive is the primary reversible action and must not use permanent-delete copy.
- Archived people have one dedicated entry, count, search, and clear status label.
- An archived person's page is readable but editing, Chat, event/matching actions, and person-depth upgrade are disabled until restore.
- Permanent delete is available only inside archived-person management.
- Delete impact is grouped by what will be deleted, what will be unlinked, what will remain as history, and what cannot be restored.
- Memory archive controls remain inside memory review and must not be labeled as person archive.
- Chat unbind and relationship reset keep their existing distinct meanings.

## 11. Implementation Slices

### V3-4A Archive/Restore Foundation - `DONE 2026-08-28`

- lifecycle schema and compatibility normalization;
- persisted ID high-water mark and tombstone reservation carrier;
- Contacts Profile Owner archive/restore receipts with expected revision and rollback-safe persistence;
- active/archived read projections;
- archived profiles fail closed in Chat, Event, Work Hub, and new-target pickers;
- focused Store/schema/backup/projection tests;
- no permanent-delete rewrite yet.

### V3-4B Permanent Delete Coordinator

- complete impact inventory and cleanup Adapter registry;
- archive-first destructive flow;
- tombstone commit and ID reservation;
- Wallet revocation inside orchestration;
- Gallery, Mini Scene, Simulation, Calendar/commerce history policies;
- atomic failure/rollback receipts;
- focused destructive/backup/reopen tests.

Status: `DONE 2026-08-28`.

### V3-4C Contacts Lifecycle UI

- archived-people list and detail state;
- archive/restore actions;
- archive-first permanent-delete flow and grouped impact preview;
- desktop/mobile E2E, accessibility, reload, and failure-path proof;
- no unrelated Contacts visual redesign.

Status: `DONE 2026-08-28`.

### V3-4A Implementation Record

V3-4A now provides the compatibility-safe data foundation without exposing an archive UI:

- legacy profiles normalize to active; `contactsLifecycle` persists schema version, profile-ID high-water mark, and tombstone reservations in the existing Chat carrier;
- non-Self profiles archive and restore in place with expected-revision checks, one revision per successful write, and full profile/lifecycle rollback after persistence failure;
- profile/role IDs remain stable, automatic allocation does not fall back after the highest live profile disappears, and imported tombstones block profile/role-ID reuse;
- default Contacts groups/search/recent shortcuts, Chat binding and message generation, Chat social proposals/automatic greetings, formal identity projections, Work Hub matching, and new Chat/Gallery target choices fail closed for archived people;
- Chat binding, conversation, messages, profile values/extensions, relationship truth, receiving-account definitions, and historical references remain stored;
- complete backup schema v5 carries lifecycle reservations, while valid v3/v4 packages remain importable and legacy v2 explicitly reports the missing reservation coverage.

Not implemented by V3-4A: archived-people UI, Wallet payee suspension/revocation, the archive-first permanent-delete coordinator, tombstone creation during deletion, cleanup Adapter expansion, or cross-owner permanent-delete rollback.

### V3-4B Implementation Record

V3-4B provides the internal coordinator that V3-4C now exposes through the archive-first Contacts UI:

- only an archived non-Self person with the exact expected revision may enter permanent deletion;
- impact inventory covers Chat, Relationship Runtime, Wallet payees/history, Gallery person tags, Mini Scene bindings, retained Simulation proposals, registered cleanup owners, and unsupported source modules;
- unsupported source modules require an explicit retain policy, while registered cleanup owners must expose snapshot, restore, and persistence Interfaces before mutation;
- every participating owner is snapshotted before cleanup; any cleanup, mutation, or persistence failure restores and re-persists all participants in reverse order;
- successful deletion revokes learned Wallet payees, preserves transaction snapshots while clearing live links and adding a minimal deleted-person reference, unlinks Gallery/Mini Scene references, removes live relationship and Chat data, and commits a minimal Contacts tombstone;
- tombstones survive Chat reopen and complete backup, and both the old profile ID and visible role ID remain unavailable for reuse.

Not implemented by V3-4B alone: archived-people UI, archive/restore controls, Wallet payee suspension while a person is merely archived, typed role-ID confirmation, grouped impact presentation, switching the legacy direct-delete entry, or user-facing E2E. These are implemented by V3-4C.

### V3-4C Implementation Record

V3-4C now exposes the accepted lifecycle without redesigning the wider Contacts surface:

- the Contacts home page has one archived-people entry with count, independent search, empty state, and person-detail navigation;
- archiving an active non-Self person uses a short confirmation, preserves profile/chat/relationship/history, and suspends learned Wallet payees under their original IDs;
- archived person detail is visibly read-only; Chat start/open, profile edit, person-depth upgrade, and detail-sheet mutation controls are unavailable until restore;
- restore reactivates the same profile and Wallet payee identity only after both owners persist successfully;
- permanent deletion appears only inside archived-person management and presents grouped delete, unlink, retained-history, and unregistered-reference impact;
- unsupported source modules require an explicit retain choice before visible role-ID confirmation and the V3-4B coordinator call;
- active-person relationship reset remains separate, while the legacy direct-delete entry is replaced by archive;
- failure receipts distinguish complete rollback from incomplete rollback in user-visible feedback;
- focused component tests cover archive/search/read-only/restore, Wallet continuity, permanent-delete gating, unknown references, and rollback; desktop/mobile Playwright covers reload, search, restore, WCAG A/AA, landscape, and horizontal overflow.

## 12. Acceptance

V3.4 is complete only when:

1. archive and restore preserve the same person and all accepted continuity;
2. archived people cannot participate in new Chat generation, identity projections, matching, or events;
3. permanent deletion cannot reuse profile or role IDs;
4. a learned Wallet payee cannot remain usable after profile deletion;
5. immutable history remains reviewable and cannot bind to a future person;
6. old saves and complete backups migrate without losing profiles;
7. required-step failure restores the exact previous save;
8. Self Profile ordinary archive/delete fails closed;
9. archive, relationship reset, Chat unbind, memory archive, and permanent delete remain visibly distinct;
10. lint, unit tests, production build, targeted E2E, governance, and diff checks pass for the implemented slices.

## 13. Stop Line

This freeze is complete. V3-4A, V3-4B, and V3-4C are implemented within the bounded scopes above. V3-5 consumer adoption is separately gated and must not begin from this document.

Do not begin Work Hub organization ownership, a Work Hub event, Chronicle, Community/Media, SMS, EVE-5, Mini Scene event expansion, broad consumer migration, or a new persisted Contacts Store from this document.
