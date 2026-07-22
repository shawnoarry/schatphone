# World Setting Architecture Contract

Updated: 2026-07-22

Status: `ARCHITECTURE_ACCEPTED / STAGE_W1_DONE`

Purpose: define one coherent world-setting architecture across Book, WorldBook, World Pack, structured encyclopedia entries, profile templates, and consuming modules without turning World Pack activation into world identity or creating internal save slots.

This contract records product and architecture meaning and the completed Stage W1 compatibility resolver. It does not approve a persisted world-definition schema, multi-world switching, another Repository owner migration, or a backup-shape change.

## 1. Confirmed Product Meaning

1. Book and WorldBook form one world-setting workflow, but they remain separate owners.
2. Book owns reusable text assets and categories. WorldBook owns whether and how a Book asset is used by the current world context.
3. Core texts, world rules, and encyclopedia manuscripts are independently selectable. Any subset, including zero encyclopedia manuscripts, is valid.
4. A World Pack is an optional reviewed capability package. It is not a world, a Book bundle, or a required container for a custom world.
5. Pack activation never creates, enables, disables, replaces, or removes Book source links, structured encyclopedia selections, profile templates, or Mini Scene policy.
6. Built-in material is optional example content. It does not restrict user-created worlds, play styles, or sensitive-content choices.
7. Sensitive-content dimensions remain unconfigured until the user makes an explicit choice. They are not global product filters.
8. One isolated browser, browser profile, site-data container, or separately isolated desktop Web App container remains one current save. World identity must not become a save-slot or workspace identifier.

## 2. Canonical Terms

### Current Save

All authoritative state inside one isolated storage container. Moving a current save between containers uses a user-selected complete backup. There is no internal save-slot list, automatic sync, cross-container discovery, or silent merge.

### World Identity

A stable `worldId` and user-facing title that identify one logical setting context inside the current save. `worldId` is not a `packId`, Book asset ID, browser-container ID, account ID, backup ID, or gameplay save slot.

The current product has one world context per current save. Future support for more than one authored world definition may reuse `worldId`, but runtime switching is not approved by this contract.

### Book Asset

A reusable long-form text owned by Book. Its identity, category, content, version, tags, import/export behavior, and storage lifecycle do not depend on whether any world uses it.

### WorldBook Source Link

WorldBook-owned activation metadata that points to a Book asset or selected sections and records role, enabled state, priority, version/fingerprint evidence, and review state. The link is the decision that makes text part of a world context; the Book asset remains the text source of truth.

### Structured Encyclopedia Entry

A WorldBook-owned structured fact entry used by explicit world or role references. It is distinct from an encyclopedia manuscript stored as a Book asset. Enabling one form must not enable the other.

### Profile Template

A WorldBook-owned definition of fields expected by a world. Contacts owns the concrete values filled for the user, roles, and NPCs.

### World Pack

A capability definition owned by the World Pack Module. It may provide reviewed app bindings, service-account templates, terminology, economy suggestions, relationship registries, and compatibility evidence. It may recommend related setting material, but it cannot own or silently activate that material.

### World Context Snapshot

An immutable, consumer-specific projection resolved through one Interface. It separates identity, narrative context, structured context, profile-template context, capabilities, and diagnostics. Consuming modules read this snapshot instead of interpreting mutable `systemStore` fields directly.

## 3. Current-Code Audit

The current implementation is a valid single-world Stage W1 compatibility baseline. It exposes a stable resolver identity, but it does not yet persist a canonical WorldBook-owned world definition.

| Current fact | Evidence | Architectural consequence |
| --- | --- | --- |
| `user.activeWorldPackId` selects the active capability Pack. | `src/stores/system.js` | This field remains a Pack identifier only. |
| WorldBook and Contacts read current identity and enabled templates through `world-interface.js`. | `src/views/WorldBookView.vue`, `src/views/ContactsView.vue` | Pack changes no longer change displayed world identity or template selection. |
| `resolveCurrentWorldContext()` returns `legacy_single_world` plus separate narrative, encyclopedia, profile, capability, and diagnostic projections. | `src/lib/world-interface.js` | Consumers no longer need to interpret Pack state as world identity. |
| `worldBookSourceLinks` has no `worldId` and is stored as one current-save global list. | `src/lib/book-text-schema.js`, `src/stores/system.js` | It is the source-link set for the one current world, not a multi-world model. |
| Structured encyclopedia entries are a current-save global list with item-level `enabled`. | `src/stores/system.js` | Their current enabled state is single-world compatibility state. |
| Historical world profile templates may contain Pack-shaped `worldId` values; new W1 writes use the stable `legacy_single_world` compatibility scope sentinel. | `src/views/WorldBookView.vue`, `src/views/ContactsView.vue` | Existing values remain reviewable and require an explicit W2 migration; no active Pack ID is written by new flows. |
| World Packs can retain legacy `bookSourceLinkIds`, `encyclopediaEntryIds`, and `profileTemplateIds`. | `src/lib/world-pack-schema.js` | Missing optional references are non-blocking diagnostics, never activation ownership. |
| Pack activation changes capability state only; it neither toggles content nor blocks on missing optional content references. | `src/stores/system.js`, `src/lib/world-pack-schema.js` | This non-binding behavior must be preserved. |
| Book assets/categories are stored in the Book section while WorldBook links, Packs, entries, and templates are stored in the System user section. | `src/composables/useSettingsBackupWorkflow.js` | Complete backup/restore must verify both owners and their cross-references as one activation unit. |

One remaining documentation label is legacy-imprecise and must not guide new code: the persistence inventory describes Book data as including WorldBook source links even though links are physically and logically WorldBook-owned.

## 4. Ownership Matrix

| Data or behavior | Sole owner | Other modules may |
| --- | --- | --- |
| Book asset body, category, version, tags, import, standalone export | Book | Refer by stable asset ID and inspect availability/version. |
| Current world identity and title | WorldBook | Read through the World Setting Interface. |
| Book source-link activation, role, priority, section selection, change review | WorldBook | Read resolved text and diagnostics; never mutate links directly. |
| Structured encyclopedia records and their world/role references | WorldBook | Read selected projections through the Interface. |
| Profile-template definitions and world association | WorldBook | Contacts fills concrete values without changing template ownership. |
| Concrete user/role/NPC profile values | Contacts | WorldBook defines expected fields only. |
| Pack definitions, compatibility, app bindings, service templates, terminology | World Pack Module | WorldBook records reviewed per-world enablement. |
| Per-world Pack enablement and review evidence | WorldBook | Pack and consuming modules read the confirmed result. |
| Module records such as messages, routes, events, schedules, orders, and relationship truth | The source module named by the record | Read world context but never move record truth into WorldBook. |
| World-context projection and diagnostics | World Setting Module | Adapters resolve owner data behind one Interface. |
| Complete-backup orchestration and restore result | Settings / Backup Module | Owners stage, verify, activate, and roll back their sections. |
| Standalone Book file delivery | Book | Use platform save/share; it is not a complete-world backup. |

Files may index exported artifacts or user-visible files, but it never owns Book text, WorldBook activation, or a hidden copy of world-setting truth.

## 5. Target World Setting Module

The architecture target is one deep World Setting Module. Its Interface hides current storage placement and legacy aliases while preserving explicit owner commands.

### 5.1 Read Interface

The minimum consumer projection is conceptually:

```js
{
  identity: {
    worldId,
    title,
  },
  narrative: {
    activeSources,
    promptText,
    fallbackText,
  },
  encyclopedia: {
    selectedEntries,
    roleBoundEntries,
  },
  profiles: {
    enabledTemplates,
  },
  capabilities: {
    enabledPacks,
    appBindings,
    serviceTemplates,
    terminology,
    economy,
  },
  diagnostics: {
    missingSourceIds,
    changedSourceIds,
    unresolvedReferenceIds,
  },
}
```

The exact JavaScript shape is a later implementation decision, but the six groups and their ownership separation are mandatory. `identity.worldId` cannot be derived from `capabilities.enabledPacks`.

The Interface must support at least:

1. `resolveCurrentWorldContext(consumerKey)` for current product callers;
2. a later `resolveWorldContext(worldId, consumerKey)` only after persisted world identity exists;
3. a readiness/diagnostic projection for the World Setting Workspace;
4. immutable return values or defensive copies so callers cannot mutate owner state.

### 5.2 Write Interfaces

WorldBook commands remain explicit and user-confirmed:

- link, update, disable, or remove one Book source;
- choose selected sections and source role;
- accept a changed Book version;
- create/update/select one structured encyclopedia entry;
- create/update/enable one profile template;
- review and enable/disable one capability Pack.

Book commands edit assets and categories only. Pack commands edit capability definitions only. A source module cannot use the read Interface to write WorldBook state.

### 5.3 Compatibility Identity

Before a WorldBook-owned world definition exists, `legacy_single_world` represents the one current world in the resolver and acts as the stable compatibility scope sentinel in the existing profile-template and contact-template-link fields. It is independent of `activeWorldPackId`, is not an `activeWorldId` or a persisted world record, and must not be presented as a user-created multi-world definition.

Existing profile-template values that use a Pack ID remain discoverable through private compatibility lookup. Those Pack aliases must not be returned as canonical `worldId` or written by new code; explicit W1 saves replace them with the stable compatibility sentinel.

## 6. Zero-Pack And Independent-Selection Rules

1. A valid current world may have zero enabled Packs.
2. The built-in `default_world` Pack means no extra Pack capabilities in compatibility code. It is not canonical world identity.
3. A valid current world may have zero Book source links and use only explicit fallback text, or may have multiple independent links.
4. A valid current world may select any Book encyclopedia subset, including zero.
5. Structured encyclopedia entries, Book encyclopedia manuscripts, and profile templates are separate optional layers.
6. Pack catalog presence, compatibility recommendation, enablement, or activation cannot toggle any setting layer.
7. Legacy Pack content-reference fields may be displayed as review evidence. They cannot block a capability-only Pack merely because optional content is absent, and new Pack definitions must not use those fields as required content ownership.
8. Mini Scene profile binding and per-module mode remain separate explicit choices. A world, Book asset, or Pack cannot silently enable a popup.

## 7. Consumer Contract

| Consumer | May consume | Must keep owning |
| --- | --- | --- |
| Chat | Narrative prompt block, role-bound encyclopedia entries, world identity | Conversation/message truth and prompt-request assembly. |
| Contacts | World identity, enabled profile-template definitions, role-bound references | Concrete profile values and role lifecycle. |
| Map | World identity, relevant narrative/structured context, confirmed capability terminology | Locations, routes, trips, and Map-trigger truth. |
| Calendar | World identity, relevant narrative/structured context, confirmed capability terminology | Confirmed schedules, time edits, push state, and Calendar-trigger truth. |
| Event Runtime / World Hub | World identity and eligible context snapshot | Event/proposal definitions, provenance, review state, and runtime truth. |
| World-capability adapters | Confirmed Pack capability projection | Their source-module records and user actions. |
| Mini Scene Module | Explicit world identity, resolved content/profile references, caller request | Validation, transforms, artifact/presenter/fallback flow under its separate contract. |

Every consumer declares a stable `consumerKey`. Consumer-specific limits and projections live behind the Interface. Consumers must not independently concatenate Book text, filter templates by `activeWorldPackId`, or read Pack content-reference fields as activation truth.

## 8. Backup, Restore, And Portable Export

### Complete backup

1. A current W1 complete backup contains Book-owned assets/categories plus WorldBook-owned links, structured entries, templates, and Pack enablement. It does not contain a persisted world-identity record: restore reconstructs the stable `legacy_single_world` compatibility identity. If W2 is later approved, its accepted manifest must add the WorldBook-owned identity explicitly.
2. The manifest records stable owner/data-class IDs and cross-section dependency evidence.
3. Restore stages Book and WorldBook owner data before activation, resolves every source/template/entry/Pack reference, and reports missing or invalid references.
4. Activation is atomic for the complete world-setting graph. If either owner fails verification or persistence, both return to the previous active generation/state.
5. A missing Book asset does not cause silent substitution, link deletion, Pack fallback, or newest-timestamp arbitration. The unresolved link and its diagnostic evidence remain reviewable.
6. `worldId`, Book asset IDs, source-link IDs, entry IDs, template IDs, and Pack IDs remain stable across successful complete restore.
7. Cross-container restore transfers one current save. It does not merge two saves or discover another container automatically.

### Standalone Book export

1. `.worldbook.json` is a lossless Book-asset interchange file, not a complete world-setting package despite the legacy extension name.
2. `.md` and `.txt` are portable text for external reading, copying, editing, and expansion.
3. Standalone Book exports do not contain current `worldId`, source-link enablement, structured encyclopedia entries, profile templates, Pack enablement, module records, or complete-backup recovery metadata.
4. Importing a standalone Book file creates a Book asset only. An unused imported ID is preserved; an ID that already belongs to a user or built-in asset is remapped to a new unused ID. Import never overwrites an existing asset, changes an existing WorldBook link target, or activates the imported asset.

A future user-selectable whole-world interchange package requires a separate schema, collision policy, reference remap, security review, and import confirmation. It cannot reuse standalone Book export semantics by implication.

## 9. Future Multi-World Compatibility

This contract makes future multi-world definitions possible without approving a world switcher now.

1. All new world-scoped data must be able to reference an opaque stable `worldId` without assuming a Pack ID.
2. Book assets may be shared by several future worlds through separate WorldBook source links; editing one shared asset must surface changed-version review independently for every referencing world.
3. Capability Packs may be enabled independently per future world.
4. Multiple world definitions inside one current save would remain setting definitions, not independent gameplay saves or isolated module histories.
5. Runtime switching cannot begin until Calendar, Map, Chat, Contacts, Event Runtime, relationship truth, Mini Scene artifacts, and every other world-sensitive record has an accepted association rule: global, world-scoped, or explicitly portable.
6. Until that association audit and migration are accepted, the application retains one current world context and no world selector.

## 10. Migration Sequence

### Stage W0 - Contract

This document and package handoff only. No source, test, route, storage, backup shape, or user-visible behavior changes.

### Stage W1 - Resolver Seam (`DONE 2026-07-22`)

Implemented and validated:

- deepen `src/lib/world-interface.js` or a focused successor into the World Setting Module Interface;
- return stable `legacy_single_world` identity separately from Pack capability state;
- route WorldBook and Contacts current-world reads through that Interface;
- keep all persisted shapes and backup bytes unchanged;
- preserve current one-world behavior, Book activation, Pack behavior, and UI flows;
- add focused tests proving Pack changes do not change resolved world identity, source-link selection, encyclopedia selection, or profile-template selection;
- display canonical compatibility identity in WorldBook while keeping Pack names inside capability surfaces;
- write no new Pack-shaped template or contact world scope;
- treat missing legacy Pack content references as non-blocking review diagnostics.

### Stage W2 - Persisted Identity And Reference Migration

Not approved by this contract. It requires:

- an exact persisted world identity/selection schema;
- owner inventory and complete-backup manifest updates;
- deterministic migration of the `legacy_single_world` compatibility sentinel, global source links, encyclopedia enablement, historical profile-template Pack aliases, contact template links, and Pack enablements into one canonical world;
- preflight, immutable source backup, atomic activation, reopen verification, and rollback;
- explicit handling of legacy `default_world` and other Pack-shaped template scopes;
- real-browser persistence and complete restore tests.

### Stage W3 - Multiple World Definitions Or Switching

Not approved. It requires a product decision and an ownership audit for every world-sensitive record. It cannot be treated as a storage UI or internal save-slot feature.

## 11. Acceptance Matrix For Stage W1

| Case | Required result |
| --- | --- |
| Custom world with zero Pack | Stable world identity, selected text/entries/templates available, capability list empty. |
| Pack activation change | Capability projection changes; world identity and Book/encyclopedia/template activation do not. |
| Zero encyclopedia selection | Valid context with no hidden default encyclopedia activation. |
| Missing Book asset | Link remains reviewable, diagnostic reports missing ID, no fallback asset is silently selected. |
| Changed Book asset | Existing changed-version review remains explicit and per link. |
| Contacts template lookup | Uses canonical world identity, with private legacy Pack alias only during compatibility resolution. |
| Consumer projection | Caller receives only its declared projection and cannot mutate owner state. |
| Complete backup/restore | Book and WorldBook reference graph verifies together or rolls back together. |
| Standalone Book import | Asset becomes available but no WorldBook link is created. |
| Isolated containers | No discovery, merge, or implicit world sharing occurs. |

## 12. Stop Conditions

Stop the implementation slice if it would:

1. persist `activeWorldPackId` as canonical `worldId`;
2. make Pack activation switch the world, select Book text, select an encyclopedia, select a profile template, or enable Mini Scene;
3. add a world selector, save-slot list, workspace switcher, or cross-container sync/merge;
4. add `worldId` to only some world-sensitive records without an accepted migration for the rest;
5. change the System or Book backup shape without manifest, rollback, and compatibility acceptance;
6. move Book bodies into WorldBook/System or move WorldBook source links into Book ownership;
7. let Files, Settings, or a source module become a second owner of world-setting truth;
8. delete or silently rewrite legacy Pack-shaped template scope values;
9. introduce a new Pack that requires bundled Book content to function;
10. resume Mini Scene runtime, regex, popup, or caller work as part of the world-identity migration.

## 13. Decision Summary

- `worldId` and `packId` are distinct identities.
- One container still owns one current save and one current world context.
- Book and WorldBook are integrated at the workflow and Interface levels, not merged as data owners.
- World Pack is optional capability composition and cannot bind content automatically.
- `legacy_single_world` is the permitted pre-migration resolver identity and existing-field compatibility scope sentinel; it is not a persisted world definition. Active Pack IDs are historical private aliases only.
- Stage W1 is complete. Persisted world definitions, reference migration, multiple worlds, and switching remain separately gated by W2/W3.
