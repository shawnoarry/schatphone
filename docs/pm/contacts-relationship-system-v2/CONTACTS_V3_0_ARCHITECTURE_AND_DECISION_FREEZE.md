# Contacts V3-0 Architecture And Decision Freeze / 联系人 V3-0 架构与决策冻结

Updated: 2026-08-27

Status: `CONTACTS-V3-0 DONE / CONTACTS-V3-1 READY_FOR_IMPLEMENTATION`

Integrated baseline inspected: `c47faa4`

Execution authority: `docs/roadmap/TODO_ROADMAP.md`

Primary package: `docs/pm/contacts-relationship-system-v2/`

This document freezes the current-state ownership map, Self Profile world model, compatibility rules, migration inventory, rollback expectations, and first implementation file set required before Contacts becomes the executable profile owner. It authorizes `CONTACTS-V3-1` only. It does not authorize Persona Confirmation UI, Work Hub promotion, a new event family, or a broad Contacts redesign.

## 1. Frozen Outcome

The accepted direction is:

`global device account -> per-world Contacts Self Profile -> purpose-specific read-only projections`

Contacts owns stable Self Profile, Main Role, and NPC identity. Chat may continue carrying the persisted profile array during the compatibility stage, but Chat must no longer remain the place where profile ownership rules are implemented.

The first implementation deepens one real Seam:

`existing Chat carrier <-> Contacts Profile Owner Module`

This Seam has two concrete Adapters over the migration period:

1. the current `store:chat.roleProfiles` compatibility Adapter;
2. the later Contacts-owned physical carrier Adapter, promoted only after backup, restore, binding, lifecycle, and rollback evidence exists.

The deletion test supports this Module: without it, normalization, revision, stable identity, lifecycle, Self Profile selection, and migration behavior reappear across Chat, Contacts, Mail, Gallery, Wallet, WorldBook, and Event callers. Concentrating those rules creates real Depth, Leverage, and Locality.

## 2. Frozen Product Decisions

### D1. Account And World Identity

Decision: `one global device account + one independent Self Profile per world`.

Rules:

1. `system.user` remains the device/account and onboarding source for global name, avatar, language-adjacent preferences, and legacy user-authored persona fields;
2. `system.user.occupation`, `relationship`, and `bio` are compatibility input, not canonical world identity after a confirmed Self Profile exists;
3. the canonical world-facing identity is the Contacts Self Profile whose `templateLink.primaryWorldId` matches the requested world;
4. occupation, affiliation, species, public identity, relationship visibility, and other world-specific values do not silently cross worlds;
5. copying selected fields between worlds requires a later explicit copy/adapt action and creates an independent revision history;
6. the current single-world runtime remains supported through `legacy_single_world`; this decision does not promote World Setting W2 or full multi-world switching.

Legacy handling:

- an existing Self Profile with an empty world link remains readable but is `legacy_unscoped` for selection purposes;
- a legacy-unscoped Self Profile may be offered for explicit linking or copying later;
- it is never silently attached to a newly activated world;
- a world with zero matching Self Profiles returns `missing`;
- a world with more than one matching Self Profile returns `ambiguous` and fails closed until the user resolves it;
- no migration automatically merges, deletes, or chooses between duplicate Self Profiles.

### D2. Executable Profile Ownership

Decision: the Contacts Profile Owner Module owns all profile-record behavior even while the physical array remains inside the Chat persistence envelope.

The Module owns:

- record normalization and cloning;
- Self Profile, Main Role, and NPC type invariants;
- `profileId`, visible `roleId`, template link, profile values, capabilities, tags, details, asset bindings, receiving-account definitions, timestamps, and revision semantics;
- create, revise, NPC upgrade, profile removal, snapshot replacement, and Self Profile selection behavior;
- compatibility-safe snapshot creation for persistence and backup.

It does not own:

- Chat contacts, conversations, messages, thread preferences, social-channel state, or binding-local avatar overrides;
- Relationship Runtime metrics, milestones, facts, or memories;
- Wallet learned payees or immutable transaction history;
- Gallery binaries or person-tag records;
- WorldBook template definitions;
- Work Hub organization records;
- Event Runtime eligibility, progression, or audit.

### D3. Stable Identity And Revision

Rules:

1. `profile.id` remains the stable internal profile reference used by Chat bindings and downstream records;
2. migration never renumbers an existing profile;
3. NPC upgrade preserves the same `profile.id`, visible `roleId`, Chat binding, relationship target, asset links, and history;
4. `roleId` remains the user-visible Contacts ID, must match `/^\d+[A-Za-z]*$/`, and is unique case-insensitively;
5. `revision` starts at `1` and increments once for every accepted profile-owned mutation;
6. no caller may mutate the live record while bypassing revision handling;
7. new owner writes accept an optional `expectedRevision` and return `stale_revision` without mutation when it no longer matches;
8. read Interfaces return immutable snapshots, readonly projections, or compatibility views whose mutation is not treated as an accepted write;
9. the current max-plus-one allocator is retained only for the behavior-preserving V3-1 foundation; permanent non-reuse across destructive deletion must be frozen with the V3-4 lifecycle/tombstone decision before retained external references rely on that guarantee.

The last rule distinguishes migration stability from an unimplemented permanent tombstone system. V3-1 must preserve every existing ID and must not claim lifetime non-reuse yet.

### D4. Persona Confirmation

Persona Confirmation remains a separate V3-2 Module.

V3-1 must make the owner ready for it but must not add the visible flow. The future write path remains:

`manual structured input or user-authored text -> candidate -> user review -> expected-revision write -> new Self Profile revision`

Structured manual input may save explicitly. Free text and AI output remain transient candidates until confirmation. Provider output cannot grant identity, affiliation, organization membership, permission, Work Hub mode, or event eligibility.

### D5. Purpose-Specific Projections

No universal complete-profile projection is accepted.

Existing specialized Interfaces are preserved:

1. Role Binding Contract for Chat target/binding and asset context;
2. Role Identity Projection for formal Chat target-role persona and bounded continuity;
3. Player Context V1 for revision-aware K-pop Self Profile eligibility.

They are not merged in V3-1. The owner foundation first supplies stable reads and Self Profile selection; each projection is deepened in its own consumer stage.

### D6. Persistence And Compatibility

For V3-1:

1. the physical storage key remains `store:chat`;
2. the persisted field remains `roleProfiles`;
3. complete and legacy backups continue to expose the top-level `roleProfiles` array;
4. the backup registry continues to classify that array as Contacts-owned required data;
5. Chat Store remains a compatibility Adapter exposing the existing `roleProfiles` state and method names;
6. existing callers receive their current return shapes while the owner Module may use a consistent internal result receipt;
7. no second persisted profile Store is created;
8. no eager record rewrite is performed merely because the owner Module exists;
9. old snapshots without revisions continue to normalize to revision `1`;
10. old contacts missing valid profile references continue through the existing legacy derivation path, with migration diagnostics added only if separately accepted.

### D7. Rollback

V3-1 is rollback-safe only if:

1. persisted `roleProfiles` bytes remain readable by the pre-V3 Chat Store normalization path;
2. the compatibility Adapter preserves existing Chat Store methods and binding behavior;
3. no new required backup section is introduced;
4. a failed restore returns to the complete pre-import roleProfiles, contacts, conversations, messages, Relationship Runtime, and linked-owner snapshot;
5. the owner Module can be removed without a data migration by restoring the delegated behavior to Chat Store;
6. no V3-1 completion claim is made if stable IDs, revisions, NPC upgrade, delete cascade, receiving accounts, or backup round trips differ from the current accepted behavior.

## 3. Current-State Ownership And Carrier Map

| Concern | Current implementation | Current meaning | V3 direction |
| --- | --- | --- | --- |
| profile array and persistence | `src/stores/chat.js` / `store:chat.roleProfiles` | Chat is the physical carrier and executable owner | retain as compatibility Adapter in V3-1; move behavior into Contacts Profile Owner Module |
| persistence ownership registry | `src/lib/persistence-owner-inventory.js` | already records Contacts as logical owner and `store:chat` as the physical carrier | preserve and use as migration evidence; do not create a competing ownership registry |
| profile normalization | local `normalizeRoleProfile()` and `normalizeRoleProfileList()` in `src/stores/chat.js` | normalizes every profile field, revision, timestamps, and legacy data | owner Module implementation |
| field/type schemas | `src/lib/profile-template-schema.js`, `src/lib/role-profile-schema.js` | entity types, template links, values, capabilities, role IDs, details | retained supporting Modules behind owner Interface |
| Contacts authoring | `src/views/ContactsView.vue` | calls Chat Store for create/edit/template values/details/classification/upgrade/delete | unchanged in V3-1; later consume owner Interface directly |
| Chat binding | `src/stores/chat.js`, `src/lib/role-binding-contract.js` | maps profile to Chat contact and bounded binding snapshot | Chat-owned binding remains; profile reads come through owner Adapter |
| formal Chat target identity | `src/lib/role-identity-projection.js`, `src/lib/role-continuity-projection.js` | bounded target-role prompt projection | preserve and later add exact visibility/revision/world evidence where required |
| Chat user identity | `src/stores/system.js`, `src/views/UserProfileView.vue`, `src/composables/useChatAiPromptContextModel.js` | global user summary plus first-array Self Profile values | global input becomes compatibility fallback; confirmed Self Profile is canonical world identity |
| event identity | `src/lib/simulation/player-context-projection.js` | strict immutable revision/world/template allowlisted projection | preserve; production adoption remains separately gated |
| Work Hub identity | `src/lib/workplace-shell-data.js` | fixed `V / artist / Morrow Entertainment` fixture | later consume Work Hub purpose projection; fixture never becomes identity truth |
| Mail persona | `src/views/MailView.vue` | reads the first Self Profile's name and role | later consume a world-selected Mail identity projection |
| WorldBook usage | `src/lib/world-interface.js`, `src/composables/useWorldBookKnowledgeModel.js` | direct profile lookup and profile-array usage counts | later use profile refs and knowledge projection |
| Gallery and Camera people | `src/views/GalleryView.vue`, `src/views/CameraView.vue` | direct full-array reads; Gallery also clears asset bindings through profile updates | later consume People/Asset projections and lifecycle cleanup Adapter |
| Relationship lifecycle | `src/lib/contacts-relationship-actions.js` | Contacts orchestrates runtime cleanup then calls Chat profile removal | V3-4 Role Lifecycle Module; unchanged in V3-1 |
| receiving accounts | profile `payeeAccounts`, `src/lib/wallet-banking.js`, `src/stores/wallet.js` | stable profile definitions; Wallet keeps disclosed learned copies and transaction references | owner preserves definitions; Wallet remains owner of learned payees/history; stale-revision policy deferred |
| backup and restore | `src/composables/useSettingsBackupWorkflow.js`, `src/lib/backup-section-registry.js`, `src/lib/complete-backup-package.js` | root `roleProfiles` is Contacts-owned but Chat restores it | keep root shape and rollback contract during owner migration |

## 4. Current Invariants To Preserve

1. profile IDs remain positive numeric references;
2. visible role IDs remain unique and validated;
3. Self Profile cannot bind as a Chat target and cannot receive role payee accounts;
4. Main Role and NPC capability defaults remain type-specific;
5. NPC upgrade preserves identity and existing Chat binding;
6. every current profile mutation that uses Chat Store increments revision;
7. old backups without profile revisions remain readable;
8. current Contacts V2 list, Role Hub, relationship, memory, world-field, detail, asset, and danger-zone behavior remains unchanged;
9. delete cascade removes the profile and Chat bindings, clears relationship runtime, optionally cleans linked source records, and separately removes Wallet learned payees;
10. relationship reset does not delete the profile or receiving-account definitions;
11. Gallery asset/folder cleanup continues to remove profile bindings through accepted profile writes;
12. Chat conversation/message keys remain contact IDs, not profile IDs.
13. Relationship Runtime and several downstream records use the numeric profile ID as `role:<profileId>` or a stored profile reference; migration cannot renumber it locally.
14. the current profile revision is a monotonic mutation counter, not a browsable historical-version ledger.

## 5. Verified Architectural Friction

### 5.1 Public Mutable Records Bypass Revision

`roleProfiles` and `getRoleProfileById()` expose mutable records. A caller can change profile values, capabilities, type, accounts, or revision-sensitive fields without `touchRoleProfile()`.

Required correction: owner writes become the only accepted mutation path. Compatibility views may remain reactive for V3-1, but tests and new callers must use the owner Interface; later consumers receive readonly projections.

### 5.2 Self Profile Selection Uses Array Order

Chat and Mail call `find()` for the first Self Profile. Contacts itself supports multiple Self Profiles, but no world uniqueness or selection rule exists.

Required correction: `selectSelfProfileForWorld(worldId)` returns an explicit `found`, `missing`, `legacy_unscoped`, or `ambiguous` result. Callers must not guess.

### 5.3 Global User Persona And Self Profile Overlap

Non-anonymous Chat currently receives both `system.user` identity text and visible Self Profile values. The global form includes occupation, relationship, and biography even though Contacts is meant to own world identity.

Required correction: V3-1 records the ownership distinction; V3-2/3 later route confirmed world identity through Contacts and retain global fields only as account basics or compatibility fallback.

### 5.4 Existing Projections Have Different Guarantees

- Role Binding Contract is versioned and cloned but lacks profile revision/world evidence and defaults missing capabilities broadly;
- Role Identity Projection is bounded but does not filter target profile values by visibility/source kind or include revision evidence;
- Player Context V1 is strict, immutable, revision-aware, allowlisted, and fail-closed, but is not yet a production Event Runtime caller;
- WorldBook, Mail, Gallery, Camera, and several Chat paths still read complete profile records directly.

Required correction: retain the specialized Interfaces and deepen them per purpose. Do not replace them with one larger contract.

### 5.5 Work Hub Is Still A Fixture

Work Hub currently owns a local preview state but its membership is fixed to `V`, `artist`, and `Morrow Entertainment`. Its revision is a fixture revision, not a Contacts profile revision.

Required correction: no Work Hub production promotion until it receives a confirmed Self Profile role/affiliation projection and supports missing/unaffiliated identity without inventing an employer.

### 5.6 Wallet Learned Accounts Lack Source Revision

Wallet learned payees retain `ownerProfileId`, `ownerRoleId`, and `ownerContactId`, while immutable transaction history retains recipient references. They do not retain the source profile revision.

Required correction: V3-1 preserves current behavior. A later receiving-account policy decides whether current usable learned accounts require source revision/status validation; historical transactions remain immutable.

### 5.7 Storage Version Has No Migration Callback

Chat reads `store:chat` at storage version `2` without a migrate callback. The shared persistence reader returns no data when the stored version differs and no migration is supplied.

Required correction: V3-1 must not bump `CHAT_STORAGE_VERSION`. A later physical-carrier or envelope change requires an explicit migration Adapter, failure handling, reopen proof, and rollback before the version changes.

### 5.8 Numeric IDs Are Wider Than Chat

The numeric profile ID is carried by Chat contacts, Relationship Runtime `role:<id>` keys, legacy System truth, Simulation social proposals, Calendar relationship bindings, Shopping/Food/Phone/Map source records, Wallet payees and transactions, Gallery `personIds`, and Mini Scene profile bindings.

Required correction: V3-1 preserves IDs byte-for-byte and performs no remap. Any later remap would require one shared cross-owner mapping and coordinated rollback; individual callers may not repair IDs independently.

### 5.9 Delete Cascade Is Not Yet A Complete Lifecycle Interface

Current deletion removes Relationship Runtime, optional registered source records, the profile, Chat bindings, conversations, and messages. ContactsView separately removes Wallet learned payees. Gallery person tags, Mini Scene bindings, Simulation historical proposals, legacy truth, and unregistered retained references are not uniformly handled.

Required correction: V3-1 preserves the current accepted cascade without broadening it. V3-4 must define archive, restore, tombstone, cleanup registration, partial-failure receipts, and retained-history behavior before profile deletion is centralized.

### 5.10 Restore Normalization Has Ambiguities

Current restore repairs duplicate visible role IDs but does not explicitly reject duplicate numeric profile IDs. Missing contact profile references may be repaired by matching the first profile with the same name. Legacy input can also carry contradictory `entityType` and `isMain` values.

Required correction: V3-1 owner tests must make `entityType` canonical, expose duplicate numeric IDs as a rejected/diagnostic condition rather than silently selecting the first, and preserve legacy name repair only through the compatibility Adapter. No cross-record ID remap is authorized.

## 6. Contacts Profile Owner Interface Freeze

The exact implementation syntax may remain JavaScript, but callers and tests must observe this semantic Interface.

### Reads

- list profile references without exposing mutable full records;
- read one immutable profile snapshot by `profileId`;
- read one profile by visible `roleId`;
- select one Self Profile for an exact world with explicit missing/ambiguous outcomes;
- report role-ID availability;
- create a persistence/backup snapshot preserving the legacy shape.

### Writes

- create one normalized profile;
- revise accepted profile-owned fields with optional `expectedRevision`;
- add/update/remove manual and event-attached detail records through owner rules;
- update relationship premise/classification while preserving `user_edited` protection;
- update asset packs and folder bindings;
- upgrade NPC to Main Role without replacing identity;
- remove a profile record only after lifecycle orchestration authorizes the operation;
- replace all profiles from a normalized legacy/current snapshot during hydration or rollback.

### Result Semantics

Internal owner writes return a consistent receipt containing at least:

- `ok`;
- stable `code`;
- `profileId` when known;
- previous and resulting revision when a mutation occurs;
- immutable resulting snapshot when appropriate.

Required failure codes include:

- `profile_not_found`;
- `invalid_profile_id`;
- `invalid_role_id`;
- `role_id_conflict`;
- `invalid_entity_transition`;
- `stale_revision`;
- `self_profile_world_ambiguous`;
- `write_rejected`.

The Chat compatibility Adapter preserves existing boolean/null/object return shapes for old callers and translates from the owner receipt.

## 7. Migration Inventory

### Owner Writes Inside Chat Store

Move behind the owner Module in V3-1:

- role profile list normalization and unique role-ID repair;
- add and update profile;
- revision touch;
- asset pack/folder binding writes;
- detail list/add/update/remove/reset writes;
- relationship premise and classification writes;
- NPC upgrade;
- profile remove;
- profile hydration, legacy derivation, snapshot replacement, and persistence clone.

Keep Chat-owned:

- bind/unbind role profile to Chat contact;
- contact normalization and social state;
- conversation/message creation, deletion, summaries, and persistence;
- Chat avatar/thread overrides;
- Chat-specific Role Binding Contract assembly until its Contacts read dependency is migrated.

### Direct Readers To Migrate Later

Do not change them in V3-1, but keep them in the adoption inventory:

- Contacts and Chat Directory list views;
- formal Chat Self Profile selection and target-profile lookup;
- Mail persona;
- WorldBook knowledge usage;
- Gallery people/asset cleanup;
- Camera person labels;
- Chat social event and relationship gating;
- Wallet receiving-account display and stale-account validation;
- production Event Runtime caller;
- Work Hub role and affiliation selection.

## 8. CONTACTS-V3-1 First Implementation File Set

Authorized additions:

1. `src/lib/contacts-profile-owner.js` — deep Contacts Profile Owner Module;
2. `src/lib/contacts-profile-projections.js` — minimal profile-reference and Self Profile selection projections only;
3. `tests/contacts-profile-owner.test.js`;
4. `tests/contacts-profile-projections.test.js`.

Authorized modifications:

1. `src/stores/chat.js` — delegate profile behavior while preserving `store:chat`, `roleProfiles`, current method names, persistence shape, and Chat-owned behavior;
2. `src/lib/role-profile-schema.js` and `src/lib/profile-template-schema.js` only where shared normalization must move behind the owner Module;
3. focused existing tests required to prove exact compatibility.

Required existing regression set:

- `tests/contacts-profile-entities-store.test.js`;
- `tests/chat-store-model.test.js`;
- `tests/contacts-relationship-backup-restore.test.js`;
- `tests/settings-contacts-relationship-import-rollback.test.js`;
- `tests/role-binding-contract.test.js`;
- `tests/contacts-chat-directory-boundary-copy.test.js`;
- `tests/wallet-store.test.js`;
- `tests/player-context-projection.test.js`;
- `tests/role-identity-projection.test.js`.

Explicitly excluded from V3-1:

- `ContactsView.vue` visual or information-architecture redesign;
- User Profile or onboarding redesign;
- Persona Confirmation UI or provider call;
- Work Hub, Mail, Gallery, Camera, WorldBook, Chat prompt, Wallet, or Event Runtime consumer migration;
- new profile storage key or second persisted Store;
- complete-backup schema bump;
- Chat storage-version bump without an explicit migration Adapter;
- archive/restore UI, tombstones, permanent ID non-reuse, or broad lifecycle rewrite;
- new event family or visible identity-conditioned behavior.

## 9. V3-1 Acceptance And Rollback Checks

V3-1 is complete only when:

1. Chat Store no longer implements profile normalization, revision, CRUD, NPC upgrade, or snapshot replacement rules itself;
2. the owner Interface is the test surface for those rules;
3. existing Chat Store profile methods remain compatible for current callers;
4. existing profile IDs, role IDs, revisions, template links, values, capabilities, details, accounts, assets, and timestamps survive close/reopen;
5. old backups and current complete backups restore without data loss;
6. failed import restores the exact prior Contacts/Chat/Relationship state;
7. NPC upgrade preserves identity and binding;
8. delete cascade and Wallet learned-payee cleanup remain unchanged;
9. Self Profile selection reports missing and ambiguous worlds explicitly;
10. duplicate numeric profile IDs and contradictory entity type compatibility inputs have explicit, test-protected handling;
11. no visible route or fixture behavior changes;
12. lint, full unit tests, build, governance, and `git diff --check` pass.

Rollback procedure:

1. restore the previous Chat Store method implementations;
2. remove the owner/projection Modules;
3. retain the unchanged `store:chat.roleProfiles` payload;
4. reopen the same save and rerun profile, binding, backup, rollback, lifecycle, Wallet, and projection regression tests.

No data transform is needed for this rollback because V3-1 does not move or reshape the persisted profile array.

## 10. Remaining Decisions After V3-0

These are assigned to later stages and do not block V3-1:

1. V3-2: which universal identity fields every world requires versus template-defined fields;
2. V3-2: exact Persona Confirmation candidate storage lifetime and review UI;
3. V3-3: minimum formal-Chat profile completeness and global-user fallback removal rules;
4. V3-3: how a major Self Profile revision affects active Work Hub membership and pending events;
5. V3-3: Role Binding Contract revision/world evidence and stricter legacy capability defaults;
6. V3-4: archive/restore, tombstone, permanent profile-ID non-reuse, and receiving-account revocation semantics;
7. V3-5: consumer-by-consumer adoption order after formal Chat.

## 11. Next Safe Slice

The next task is `CONTACTS-V3-1 Contacts Profile Owner Foundation` using only the file set and acceptance above.

It begins by extracting profile behavior behind the owner Interface while the Chat Store remains the persistence carrier and compatibility Adapter. It stops before any visible Persona Confirmation, consumer migration, Work Hub promotion, or event behavior.
