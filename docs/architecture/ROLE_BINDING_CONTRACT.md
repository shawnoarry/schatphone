# SchatPhone Role Binding Contract / SchatPhone 角色绑定契约

Updated: 2026-08-28

## 1. Purpose

This document defines the reusable cross-module contract for role profile, avatar hierarchy, Chat-side binding metadata, and asset-context consumption.

Goal:

- future modules should consume one stable contract instead of reassembling role data on their own;
- Chat-side binding data should stay reusable without pretending to be the full relationship-truth layer.

## 2. Contract Entry

Primary API in `src/stores/chat.js`:

1. `getRoleBindingContract(contactId, { moduleKey })`
2. `listRoleBindingContracts(contactIds?, { moduleKey })`
3. `bindRoleProfile(profileId, options?)` for idempotent Chat-target creation or reuse

Compatibility API kept for existing chat asset flow:

1. `getRoleBindingAssetContext(contactId)` (legacy-friendly shape)

## 3. Contract Shape

`getRoleBindingContract` returns:

1. `contractVersion`: current schema version
2. `moduleKey`: consumer module key
3. `roleBound`: whether this contact is actually bound to a global role profile
4. `contact`: `{ id, kind, name, profileId }`
5. `profile`: `{ id, name, role, isMain, entityType, templateLink, profileValues, capabilities, tags }`
6. `relationship`: `{ level, note }`
7. `avatar`:
   - `resolved`
   - `activeLayer`
   - `threadAvatar`
   - `moduleAvatar`
   - `globalAvatar`
   - `fallbackSeed`
8. `assets`:
   - `preferredImageAssetId`
   - `recommendedImageAssetId`
   - `profileAssetPack`
   - `profileAssetIds`
   - `profileAssetFolderBindings`

Profile extension fields:

- `entityType`
  - one of `self_profile`, `main_role`, `supporting_role`, `npc`
- `isMain`
  - legacy binary compatibility only; it is `true` only when canonical `entityType` is `main_role`
- `templateLink`
  - one primary world/template context and supplemental knowledge point ids
- `profileValues`
  - copied profile-template values owned by Contacts
- `capabilities`
  - feature flags such as `canAppearInChatDirectory`, `canUseFullRelationshipProgress`, `canUseMemoryGroups`, and `canUseRouteProgression`

## 4. Important Semantic Boundary

This contract is not the owner of full relationship truth.

Treat fields this way:

- `profileId`
  - internal role-profile key for binding and lookup
- `relationship.level`
  - Chat-side compatibility or lightweight annotation field; UI should label this as Chat-local tuning, not current affinity
- `relationship.note`
  - Chat-side compatibility or lightweight annotation field; UI should label this as a Chat-local note
- `entityType`
  - describes Contacts profile type, not Chat Directory membership
- `profileValues`
  - concrete Contacts-owned person values copied from WorldBook templates

Current relationship truth must stay owned by `relationshipRuntimeStore`, including:

- affinity/trust/intimacy/tension/dependency
- relationship stage
- milestones
- growth traits
- shared memory groups

Do not use this contract alone to decide the authoritative current relationship-progress state in product-facing UI. If a surface displays the live relationship, read `relationshipRuntimeStore`; if it displays these fields, make the Chat-local annotation semantics explicit.

Chat Directory is a chat target list, not a Main Role filter.

Rules:

- Self Profile must not be bound as a Chat target.
- Supporting Role and NPC may be bound as Chat targets when their Contacts-owned capabilities allow it.
- Contacts may invoke `bindRoleProfile()` only from an explicit eligible-role `Start Chat` action; Contacts must not duplicate binding rules or Chat-local metadata.
- Chat Directory remains the review, unbind, and Chat-local metadata management surface, but it is not a mandatory navigation hop for that explicit Contacts action.
- An already-bound non-Self role reuses its existing contact and conversation; a disabled unbound role must not create a new target.
- Chat binding does not prove that an entity is a Main Role.
- World NPC -> Supporting Role -> Main Role, including the compatibility direct NPC -> Main Role path, must preserve existing Chat binding and history.
- Archiving a Contacts person preserves the binding, conversation, and messages for review, but the archived profile cannot create a new binding or new generated Chat messages until explicit restore succeeds.
- Restoring a person reuses the same profile, contact, and conversation IDs; it does not bind by name or create a replacement thread.
- Permanent profile deletion remains Contacts-owned lifecycle orchestration. After the archive-first confirmation, Chat removes the binding/conversation/messages under the confirmed destructive scope, while a Contacts tombstone reserves the old profile and role IDs outside this binding contract.
- Capacity management may page or reversibly cold-archive Chat history, but cannot silently or irreversibly delete authoritative role-thread history; lifecycle ownership remains in Contacts rather than this binding contract.

The archived-person binding and Chat eligibility rules above are implemented by `CONTACTS-V3-4A`. V3-4B provides the internal archive-first removal/tombstone coordinator, and V3-4C exposes the complete user flow: active people archive first, archived detail is read-only, Wallet payees suspend/restore under the same ID, and permanent deletion is available only from archived-person management.

## 5. Hierarchy Rules

Avatar priority is fixed as:

1. `thread`
2. `module`
3. `global`
4. `fallback`

Recommended image asset priority is fixed as:

1. `preferredImageAssetId`
2. first reference asset
3. first scenario asset
4. first emoji asset
5. first wallpaper asset

## 6. New Module Checklist

For every new module that needs role context:

1. do not read `contacts/roleProfiles` directly for assembly
2. use `getRoleBindingContract` as the only role-context source for Chat-side binding data
3. pass a module-specific `moduleKey` for diagnostics
4. treat `roleBound=false` as valid input and degrade gracefully
5. never assume `preferredImageAssetId` exists
6. use `avatar.activeLayer` only for UI hints or debug, not for business-truth branching

If the module needs current relationship progress, also read from relationship runtime instead of trusting `relationship.level/note`.

## 7. Regression Baseline

Current tests covering this contract:

1. `tests/role-binding-contract.test.js`
2. `tests/chat-store-model.test.js`
3. `tests/contacts-chat-directory-boundary-copy.test.js`

Any contract field or semantic change must update tests and this document in the same commit batch.
