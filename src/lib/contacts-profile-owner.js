import { sanitizeAvatarUrl } from './avatar'
import { normalizeImageSource } from './image-source-contract'
import {
  RELATIONSHIP_CLASSIFICATION_SOURCE,
  cloneRelationshipProfileFields,
  normalizeRelationshipProfileFields,
} from './relationship-classification-schema'
import {
  ROLE_ASSET_FOLDER_SLOT_KEYS,
  cloneRoleAssetFolderBindings,
  cloneRoleAssetPack,
  normalizeRoleAssetFolderBindings,
  normalizeRoleAssetPack,
} from './role-binding-contract'
import {
  CONTACTS_ENTITY_TYPES,
  cloneProfileExtensions,
  cloneRoleDetailItems,
  createDefaultCapabilitiesForEntityType,
  createRoleDetailItem,
  createRoleIdFromProfileId,
  ensureUniqueRoleProfileRoleIds,
  filterRoleDetailItemsForMemoryDelete,
  filterRoleDetailItemsForReset,
  isValidRoleId,
  normalizeContactsEntityType,
  normalizeProfileCapabilities,
  normalizeProfileExtensions,
  normalizeProfileTemplateLink,
  normalizeProfileValues,
  normalizeRoleDetailItems,
  normalizeRoleDetailSection,
  normalizeRoleId,
  normalizeRoleKnowledgePointIds,
} from './role-profile-schema'
import { cloneRolePayeeAccounts, normalizeRolePayeeAccounts } from './wallet-banking'

export const CONTACTS_PROFILE_OWNER_CODES = Object.freeze({
  PROFILE_CREATED: 'profile_created',
  PROFILE_REVISED: 'profile_revised',
  PROFILE_ARCHIVED: 'profile_archived',
  PROFILE_RESTORED: 'profile_restored',
  PROFILE_PERMANENTLY_DELETED: 'profile_permanently_deleted',
  PROFILE_REMOVED: 'profile_removed',
  PROFILES_REPLACED: 'profiles_replaced',
  PROFILE_NOT_FOUND: 'profile_not_found',
  INVALID_PROFILE_ID: 'invalid_profile_id',
  DUPLICATE_PROFILE_ID: 'duplicate_profile_id',
  INVALID_ROLE_ID: 'invalid_role_id',
  ROLE_ID_CONFLICT: 'role_id_conflict',
  ROLE_ID_IMMUTABLE: 'role_id_immutable',
  PROFILE_ID_RESERVED: 'profile_id_reserved',
  PROFILE_NOT_ARCHIVED: 'profile_not_archived',
  SELF_PROFILE_LIFECYCLE_FORBIDDEN: 'self_profile_lifecycle_forbidden',
  INVALID_ENTITY_TRANSITION: 'invalid_entity_transition',
  STALE_REVISION: 'stale_revision',
  SELF_PROFILE_WORLD_AMBIGUOUS: 'self_profile_world_ambiguous',
  USER_EDITED_PROTECTED: 'user_edited_protected',
  WRITE_REJECTED: 'write_rejected',
})

export const CONTACTS_PROFILE_LIFECYCLE_STATES = Object.freeze({
  ACTIVE: 'active',
  ARCHIVED: 'archived',
})

export const CONTACTS_PROFILE_LIFECYCLE_SCHEMA_VERSION = 1

const MAX_ARCHIVE_NOTE_LENGTH = 240

const RELATIONSHIP_PROFILE_FIELD_KEYS = [
  'relationshipLabelText',
  'relationshipLabelNote',
  'initialRelationshipSeed',
  'primaryRelationshipCategoryId',
  'relationshipModifierIds',
  'classificationConfidence',
  'classificationSource',
  'classificationUpdatedAt',
  'classificationExplanation',
]

const ENTITY_TYPE_KEYS = new Set(Object.values(CONTACTS_ENTITY_TYPES))

const toPositiveInt = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

const normalizeTimestamp = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

const normalizeArchiveNote = (value) =>
  typeof value === 'string'
    ? value.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, MAX_ARCHIVE_NOTE_LENGTH)
    : ''

export const normalizeContactsProfileLifecycle = (rawLifecycle = {}) => {
  const source = rawLifecycle && typeof rawLifecycle === 'object' ? rawLifecycle : {}
  const state = source.state === CONTACTS_PROFILE_LIFECYCLE_STATES.ARCHIVED
    ? CONTACTS_PROFILE_LIFECYCLE_STATES.ARCHIVED
    : CONTACTS_PROFILE_LIFECYCLE_STATES.ACTIVE
  return {
    state,
    archivedAt: normalizeTimestamp(source.archivedAt),
    restoredAt: normalizeTimestamp(source.restoredAt),
    archiveNote: normalizeArchiveNote(source.archiveNote),
  }
}

export const isContactsProfileArchived = (profile = {}) =>
  normalizeContactsProfileLifecycle(profile?.lifecycle).state ===
  CONTACTS_PROFILE_LIFECYCLE_STATES.ARCHIVED

export const isContactsProfileActive = (profile = {}) => !isContactsProfileArchived(profile)

const normalizeContactsProfileTombstone = (rawTombstone = {}) => {
  const profileId = toPositiveInt(rawTombstone?.profileId)
  const roleId = normalizeRoleId(rawTombstone?.roleId)
  if (!profileId || !isValidRoleId(roleId)) return null
  return {
    profileId,
    roleId,
    entityType: ENTITY_TYPE_KEYS.has(rawTombstone?.entityType)
      ? rawTombstone.entityType
      : CONTACTS_ENTITY_TYPES.NPC,
    worldId: typeof rawTombstone?.worldId === 'string'
      ? rawTombstone.worldId.normalize('NFKC').trim().slice(0, 120)
      : '',
    deletedAt: normalizeTimestamp(rawTombstone?.deletedAt),
    schemaVersion: Math.max(1, toPositiveInt(rawTombstone?.schemaVersion)),
  }
}

export const normalizeContactsProfileLifecycleState = (rawState = {}, rawProfiles = []) => {
  const source = rawState && typeof rawState === 'object' && !Array.isArray(rawState) ? rawState : {}
  const tombstones = []
  const seenProfileIds = new Set()
  const seenRoleIds = new Set()
  for (const rawTombstone of Array.isArray(source.tombstones) ? source.tombstones : []) {
    const tombstone = normalizeContactsProfileTombstone(rawTombstone)
    if (!tombstone) continue
    const roleKey = tombstone.roleId.toLowerCase()
    if (seenProfileIds.has(tombstone.profileId) || seenRoleIds.has(roleKey)) continue
    seenProfileIds.add(tombstone.profileId)
    seenRoleIds.add(roleKey)
    tombstones.push(tombstone)
  }
  tombstones.sort((left, right) => left.profileId - right.profileId)
  const maxLiveProfileId = (Array.isArray(rawProfiles) ? rawProfiles : []).reduce(
    (max, profile) => Math.max(max, toPositiveInt(profile?.id)),
    0,
  )
  const maxTombstoneProfileId = tombstones.reduce(
    (max, tombstone) => Math.max(max, tombstone.profileId),
    0,
  )
  return {
    schemaVersion: CONTACTS_PROFILE_LIFECYCLE_SCHEMA_VERSION,
    profileIdHighWaterMark: Math.max(
      toPositiveInt(source.profileIdHighWaterMark),
      maxLiveProfileId,
      maxTombstoneProfileId,
    ),
    tombstones,
  }
}

export const normalizeContactsProfileRevision = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1
}

const normalizeAvatarImageSource = (rawSource = {}, legacyAvatar = '', fallbackAlt = 'Avatar') => {
  const normalized = normalizeImageSource(rawSource, { alt: fallbackAlt })
  if (normalized.sourceType !== 'none') return normalized

  const legacyUrl = sanitizeAvatarUrl(legacyAvatar)
  if (!legacyUrl) return normalized

  return normalizeImageSource(
    {
      imageSourceType: 'url',
      imageUrl: legacyUrl,
    },
    { alt: fallbackAlt },
  )
}

const avatarImageToLegacyAvatar = (avatarImage = {}) =>
  avatarImage?.sourceType === 'url' && typeof avatarImage.url === 'string' ? avatarImage.url : ''

const mergeRoleProfileAssetFolderBindings = (currentBindings, updates) => {
  const base = normalizeRoleAssetFolderBindings(currentBindings)
  if (!updates || typeof updates !== 'object') return base

  const merged = {}
  ROLE_ASSET_FOLDER_SLOT_KEYS.forEach((slotKey) => {
    const currentSlot = base[slotKey] && typeof base[slotKey] === 'object' ? base[slotKey] : {}
    const nextSlot = updates[slotKey] && typeof updates[slotKey] === 'object' ? updates[slotKey] : {}
    merged[slotKey] = {
      ...currentSlot,
      ...nextSlot,
    }
  })
  return normalizeRoleAssetFolderBindings(merged)
}

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach((item) => deepFreeze(item))
  return Object.freeze(value)
}

export const cloneContactsProfile = (profile = {}) => ({
  ...profile,
  ...cloneRelationshipProfileFields(profile),
  avatarImage: profile.avatarImage && typeof profile.avatarImage === 'object'
    ? { ...profile.avatarImage }
    : {},
  encyclopediaEntryIds: Array.isArray(profile.encyclopediaEntryIds)
    ? [...profile.encyclopediaEntryIds]
    : [],
  knowledgePointIds: Array.isArray(profile.knowledgePointIds)
    ? [...profile.knowledgePointIds]
    : [],
  templateLink: {
    ...(profile.templateLink || {}),
    supplementalKnowledgePointIds: Array.isArray(profile.templateLink?.supplementalKnowledgePointIds)
      ? [...profile.templateLink.supplementalKnowledgePointIds]
      : [],
  },
  profileValues: Array.isArray(profile.profileValues)
    ? profile.profileValues.map((item) => ({
        ...item,
        value: Array.isArray(item?.value) ? [...item.value] : item?.value,
      }))
    : [],
  profileExtensions: cloneProfileExtensions(profile.profileExtensions),
  capabilities: { ...(profile.capabilities || {}) },
  detailItems: cloneRoleDetailItems(profile.detailItems),
  payeeAccounts: cloneRolePayeeAccounts(profile.payeeAccounts),
  assetPack: cloneRoleAssetPack(profile.assetPack),
  assetFolderBindings: cloneRoleAssetFolderBindings(profile.assetFolderBindings),
  tags: Array.isArray(profile.tags) ? [...profile.tags] : [],
  lifecycle: normalizeContactsProfileLifecycle(profile.lifecycle),
})

const immutableProfile = (profile) => (profile ? deepFreeze(cloneContactsProfile(profile)) : null)

export const normalizeContactsProfile = (
  rawProfile = {},
  fallbackIndex = 0,
  { now = Date.now } = {},
) => {
  const parsedId = toPositiveInt(rawProfile?.id)
  const id = parsedId || Math.max(1, Math.floor(now()) + Math.max(0, Number(fallbackIndex) || 0))
  const name =
    typeof rawProfile?.name === 'string' && rawProfile.name.trim()
      ? rawProfile.name.trim()
      : `角色 ${id}`
  const legacyAvatar = typeof rawProfile?.avatar === 'string' ? rawProfile.avatar : ''
  const avatarImage = normalizeAvatarImageSource(rawProfile?.avatarImage, legacyAvatar, name)
  const entityType = normalizeContactsEntityType(
    rawProfile?.entityType,
    rawProfile?.isSelfProfile
      ? CONTACTS_ENTITY_TYPES.SELF_PROFILE
      : rawProfile?.isMain === false
        ? CONTACTS_ENTITY_TYPES.NPC
        : CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  )
  const roleId = normalizeRoleId(rawProfile?.roleId, createRoleIdFromProfileId(id, fallbackIndex))
  const knowledgePointIds = normalizeRoleKnowledgePointIds(
    rawProfile?.encyclopediaEntryIds || rawProfile?.knowledgePointIds,
  )
  const relationshipFields = normalizeRelationshipProfileFields(rawProfile)
  const timestamp = Math.max(0, Math.floor(now()))

  return {
    id,
    roleId,
    name,
    role: typeof rawProfile?.role === 'string' ? rawProfile.role : '',
    entityType,
    isMain: entityType === CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    avatar: avatarImageToLegacyAvatar(avatarImage) || legacyAvatar,
    avatarImage,
    bio: typeof rawProfile?.bio === 'string' ? rawProfile.bio : '',
    ...relationshipFields,
    encyclopediaEntryIds: knowledgePointIds,
    knowledgePointIds,
    templateLink: normalizeProfileTemplateLink(rawProfile?.templateLink),
    profileValues: normalizeProfileValues(rawProfile?.profileValues),
    profileExtensions: normalizeProfileExtensions(rawProfile?.profileExtensions),
    capabilities: normalizeProfileCapabilities(rawProfile?.capabilities, entityType),
    detailItems: normalizeRoleDetailItems(rawProfile?.detailItems, fallbackIndex),
    payeeAccounts: normalizeRolePayeeAccounts(rawProfile?.payeeAccounts, {
      profileId: id,
      roleId,
      entityType,
    }),
    assetPack: normalizeRoleAssetPack(rawProfile?.assetPack),
    assetFolderBindings: normalizeRoleAssetFolderBindings(rawProfile?.assetFolderBindings),
    tags: Array.isArray(rawProfile?.tags)
      ? rawProfile.tags
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      : [],
    lifecycle: normalizeContactsProfileLifecycle(rawProfile?.lifecycle),
    revision: normalizeContactsProfileRevision(rawProfile?.revision),
    createdAt:
      typeof rawProfile?.createdAt === 'number' && Number.isFinite(rawProfile.createdAt)
        ? Math.max(0, Math.floor(rawProfile.createdAt))
        : timestamp,
    updatedAt:
      typeof rawProfile?.updatedAt === 'number' && Number.isFinite(rawProfile.updatedAt)
        ? Math.max(0, Math.floor(rawProfile.updatedAt))
        : timestamp,
  }
}

const prepareProfileList = (rawProfiles, now) => {
  if (!Array.isArray(rawProfiles)) {
    return { ok: false, code: CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, profiles: [] }
  }

  const seenIds = new Set()
  const duplicateProfileIds = []
  for (const rawProfile of rawProfiles) {
    const profileId = toPositiveInt(rawProfile?.id)
    if (!profileId) {
      return {
        ok: false,
        code: CONTACTS_PROFILE_OWNER_CODES.INVALID_PROFILE_ID,
        profiles: [],
      }
    }
    if (seenIds.has(profileId)) duplicateProfileIds.push(profileId)
    seenIds.add(profileId)
  }

  if (duplicateProfileIds.length > 0) {
    return {
      ok: false,
      code: CONTACTS_PROFILE_OWNER_CODES.DUPLICATE_PROFILE_ID,
      duplicateProfileIds: [...new Set(duplicateProfileIds)],
      profiles: [],
    }
  }

  return {
    ok: true,
    code: CONTACTS_PROFILE_OWNER_CODES.PROFILES_REPLACED,
    profiles: ensureUniqueRoleProfileRoleIds(
      rawProfiles.map((profile, index) => normalizeContactsProfile(profile, index, { now })),
    ),
  }
}

const failureReceipt = (code, extra = {}) => deepFreeze({ ok: false, code, ...extra })

const successReceipt = (code, profile, previousRevision = 0, extra = {}) =>
  deepFreeze({
    ok: true,
    code,
    profileId: toPositiveInt(profile?.id),
    previousRevision,
    revision: normalizeContactsProfileRevision(profile?.revision),
    profile: immutableProfile(profile),
    ...extra,
  })

export const createContactsProfileOwner = ({ profiles, lifecycleState = {}, now = Date.now } = {}) => {
  if (!Array.isArray(profiles)) {
    throw new TypeError('Contacts Profile Owner requires an array carrier.')
  }
  if (!lifecycleState || typeof lifecycleState !== 'object' || Array.isArray(lifecycleState)) {
    throw new TypeError('Contacts Profile Owner requires an object lifecycle carrier.')
  }

  const applyLifecycleState = (rawState = {}, profileList = profiles) => {
    const normalized = normalizeContactsProfileLifecycleState(rawState, profileList)
    Object.keys(lifecycleState).forEach((key) => delete lifecycleState[key])
    Object.assign(lifecycleState, normalized)
    return normalized
  }

  applyLifecycleState(lifecycleState, profiles)

  const findMutableProfileById = (profileId) => {
    const numericId = toPositiveInt(profileId)
    if (!numericId) return null
    return profiles.find((profile) => Number(profile.id) === numericId) || null
  }

  const touchProfile = (profile) => {
    profile.revision = Math.min(
      Number.MAX_SAFE_INTEGER,
      normalizeContactsProfileRevision(profile.revision) + 1,
    )
    profile.updatedAt = Math.max(0, Math.floor(now()))
  }

  const validateMutation = (profileId, options = {}) => {
    const numericId = toPositiveInt(profileId)
    if (!numericId) {
      return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.INVALID_PROFILE_ID)
    }
    const profile = findMutableProfileById(numericId)
    if (!profile) {
      return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.PROFILE_NOT_FOUND, { profileId: numericId })
    }
    if (Object.prototype.hasOwnProperty.call(options, 'expectedRevision')) {
      const expectedRevision = Number(options.expectedRevision)
      if (!Number.isFinite(expectedRevision) || Math.floor(expectedRevision) !== profile.revision) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.STALE_REVISION, {
          profileId: numericId,
          revision: profile.revision,
        })
      }
    }
    if (isContactsProfileArchived(profile) && options.allowArchived !== true) {
      return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.PROFILE_ARCHIVED, {
        profileId: numericId,
        revision: profile.revision,
      })
    }
    return { ok: true, profile }
  }

  const isRoleIdAvailable = (roleId, excludeProfileId = 0) => {
    const normalized = normalizeRoleId(roleId)
    if (!isValidRoleId(normalized)) return false
    const excluded = toPositiveInt(excludeProfileId)
    const conflictsWithLiveProfile = profiles.some(
      (profile) =>
        Number(profile.id) !== excluded &&
        normalizeRoleId(profile.roleId).toLowerCase() === normalized.toLowerCase(),
    )
    const conflictsWithTombstone = lifecycleState.tombstones.some(
      (tombstone) => normalizeRoleId(tombstone.roleId).toLowerCase() === normalized.toLowerCase(),
    )
    return !conflictsWithLiveProfile && !conflictsWithTombstone
  }

  const reviseProfile = (profileId, updates = {}, options = {}) => {
    const validation = validateMutation(profileId, options)
    if (!validation.ok) return validation
    if (!updates || typeof updates !== 'object') {
      return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
        profileId: toPositiveInt(profileId),
      })
    }

    const target = validation.profile
    const previousRevision = target.revision

    if (Object.prototype.hasOwnProperty.call(updates, 'roleId')) {
      const roleId = normalizeRoleId(updates.roleId)
      if (!isValidRoleId(roleId)) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.INVALID_ROLE_ID, { profileId: target.id })
      }
      if (roleId !== target.roleId) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.ROLE_ID_IMMUTABLE, {
          profileId: target.id,
          revision: target.revision,
          roleId: target.roleId,
        })
      }
    }

    if (typeof updates.name === 'string' && updates.name.trim()) target.name = updates.name.trim()
    if (typeof updates.role === 'string') target.role = updates.role
    if (typeof updates.avatar === 'string') {
      target.avatar = updates.avatar
      target.avatarImage = normalizeAvatarImageSource(target.avatarImage, updates.avatar, target.name)
    }
    if (updates.avatarImage && typeof updates.avatarImage === 'object') {
      target.avatarImage = normalizeAvatarImageSource(updates.avatarImage, target.avatar, target.name)
      target.avatar = avatarImageToLegacyAvatar(target.avatarImage)
    }
    if (typeof updates.bio === 'string') target.bio = updates.bio

    let nextEntityType = target.entityType
    if (Object.prototype.hasOwnProperty.call(updates, 'entityType')) {
      if (!ENTITY_TYPE_KEYS.has(updates.entityType)) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.INVALID_ENTITY_TRANSITION, {
          profileId: target.id,
        })
      }
      nextEntityType = updates.entityType
    } else if (typeof updates.isMain === 'boolean' && target.entityType !== CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
      if (updates.isMain) {
        nextEntityType = CONTACTS_ENTITY_TYPES.MAIN_ROLE
      } else if (target.entityType === CONTACTS_ENTITY_TYPES.MAIN_ROLE) {
        nextEntityType = CONTACTS_ENTITY_TYPES.NPC
      }
    }

    if (nextEntityType !== target.entityType) {
      target.entityType = nextEntityType
      target.capabilities = normalizeProfileCapabilities(target.capabilities, nextEntityType)
    }
    target.isMain = target.entityType === CONTACTS_ENTITY_TYPES.MAIN_ROLE

    if (Array.isArray(updates.payeeAccounts)) {
      target.payeeAccounts = normalizeRolePayeeAccounts(updates.payeeAccounts, {
        profileId: target.id,
        roleId: target.roleId,
        entityType: target.entityType,
      })
    } else {
      target.payeeAccounts = normalizeRolePayeeAccounts(target.payeeAccounts, {
        profileId: target.id,
        roleId: target.roleId,
        entityType: target.entityType,
      })
    }
    if (updates.templateLink && typeof updates.templateLink === 'object') {
      target.templateLink = normalizeProfileTemplateLink(updates.templateLink)
    }
    if (Array.isArray(updates.profileValues)) {
      target.profileValues = normalizeProfileValues(updates.profileValues)
    }
    if (updates.profileExtensions && typeof updates.profileExtensions === 'object') {
      target.profileExtensions = normalizeProfileExtensions(updates.profileExtensions)
    }
    if (updates.capabilities && typeof updates.capabilities === 'object') {
      target.capabilities = normalizeProfileCapabilities(updates.capabilities, target.entityType)
    }
    if (Array.isArray(updates.tags)) {
      target.tags = updates.tags
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    }
    if (Array.isArray(updates.encyclopediaEntryIds) || Array.isArray(updates.knowledgePointIds)) {
      const nextIds = normalizeRoleKnowledgePointIds(
        updates.encyclopediaEntryIds || updates.knowledgePointIds,
      )
      target.encyclopediaEntryIds = nextIds
      target.knowledgePointIds = nextIds
    }
    if (Array.isArray(updates.detailItems)) {
      target.detailItems = normalizeRoleDetailItems(updates.detailItems)
    }
    if (updates.assetPack && typeof updates.assetPack === 'object') {
      target.assetPack = normalizeRoleAssetPack({ ...target.assetPack, ...updates.assetPack })
    }
    if (updates.assetFolderBindings && typeof updates.assetFolderBindings === 'object') {
      target.assetFolderBindings = mergeRoleProfileAssetFolderBindings(
        target.assetFolderBindings,
        updates.assetFolderBindings,
      )
    }
    if (RELATIONSHIP_PROFILE_FIELD_KEYS.some((key) => Object.prototype.hasOwnProperty.call(updates, key))) {
      Object.assign(target, normalizeRelationshipProfileFields({ ...target, ...updates }))
    }

    touchProfile(target)
    return successReceipt(
      CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
      target,
      previousRevision,
    )
  }

  return {
    listProfileReferences({ includeArchived = false } = {}) {
      return deepFreeze(
        profiles
          .filter((profile) => includeArchived || isContactsProfileActive(profile))
          .map((profile) => ({
          profileId: profile.id,
          roleId: profile.roleId,
          name: profile.name,
          role: profile.role,
          entityType: profile.entityType,
          worldId: profile.templateLink?.primaryWorldId || '',
          templateId: profile.templateLink?.profileTemplateId || '',
          revision: profile.revision,
          lifecycleState: profile.lifecycle.state,
        })),
      )
    },

    getProfileSnapshot(profileId) {
      return immutableProfile(findMutableProfileById(profileId))
    },

    getProfileByRoleId(roleId) {
      const normalized = normalizeRoleId(roleId)
      if (!normalized) return null
      return immutableProfile(
        profiles.find(
          (profile) => normalizeRoleId(profile.roleId).toLowerCase() === normalized.toLowerCase(),
        ) || null,
      )
    },

    isRoleIdAvailable,

    selectSelfProfileForWorld(worldId) {
      const normalizedWorldId = typeof worldId === 'string' ? worldId.trim() : ''
      const selfProfiles = profiles.filter(
        (profile) =>
          profile.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE &&
          isContactsProfileActive(profile),
      )
      const exactMatches = normalizedWorldId
        ? selfProfiles.filter(
            (profile) => profile.templateLink?.primaryWorldId === normalizedWorldId,
          )
        : []

      if (exactMatches.length > 1) {
        return deepFreeze({
          ok: false,
          code: CONTACTS_PROFILE_OWNER_CODES.SELF_PROFILE_WORLD_AMBIGUOUS,
          status: 'ambiguous',
          worldId: normalizedWorldId,
          profileIds: exactMatches.map((profile) => profile.id),
        })
      }
      if (exactMatches.length === 1) {
        return deepFreeze({
          ok: true,
          code: 'self_profile_found',
          status: 'found',
          worldId: normalizedWorldId,
          profile: immutableProfile(exactMatches[0]),
        })
      }

      const legacyProfiles = selfProfiles.filter(
        (profile) => !profile.templateLink?.primaryWorldId,
      )
      if (legacyProfiles.length > 1) {
        return deepFreeze({
          ok: false,
          code: CONTACTS_PROFILE_OWNER_CODES.SELF_PROFILE_WORLD_AMBIGUOUS,
          status: 'ambiguous',
          worldId: normalizedWorldId,
          profileIds: legacyProfiles.map((profile) => profile.id),
        })
      }
      if (legacyProfiles.length === 1) {
        return deepFreeze({
          ok: true,
          code: 'self_profile_legacy_unscoped',
          status: 'legacy_unscoped',
          worldId: normalizedWorldId,
          profile: immutableProfile(legacyProfiles[0]),
        })
      }
      return deepFreeze({
        ok: false,
        code: 'self_profile_missing',
        status: 'missing',
        worldId: normalizedWorldId,
        profileIds: [],
      })
    },

    createPersistenceSnapshot() {
      return profiles.map((profile) => cloneContactsProfile(profile))
    },

    createLifecyclePersistenceSnapshot() {
      return structuredClone(normalizeContactsProfileLifecycleState(lifecycleState, profiles))
    },

    createProfile(payload = {}) {
      const hasExplicitId = Object.prototype.hasOwnProperty.call(payload, 'id')
      const explicitId = hasExplicitId ? toPositiveInt(payload.id) : 0
      if (hasExplicitId && !explicitId) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.INVALID_PROFILE_ID)
      }
      if (explicitId && findMutableProfileById(explicitId)) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.DUPLICATE_PROFILE_ID, {
          profileId: explicitId,
        })
      }
      if (explicitId && lifecycleState.tombstones.some((item) => item.profileId === explicitId)) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.PROFILE_ID_RESERVED, {
          profileId: explicitId,
        })
      }

      const nextId = explicitId || lifecycleState.profileIdHighWaterMark + 1
      const normalized = normalizeContactsProfile(
        { ...payload, id: nextId },
        profiles.length,
        { now },
      )
      if (!isValidRoleId(normalized.roleId)) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.INVALID_ROLE_ID, { profileId: nextId })
      }
      if (!isRoleIdAvailable(normalized.roleId)) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.ROLE_ID_CONFLICT, { profileId: nextId })
      }
      profiles.push(normalized)
      lifecycleState.profileIdHighWaterMark = Math.max(
        lifecycleState.profileIdHighWaterMark,
        normalized.id,
      )
      return successReceipt(CONTACTS_PROFILE_OWNER_CODES.PROFILE_CREATED, normalized, 0)
    },

    reviseProfile,

    archiveProfile(profileId, archiveInput = {}, options = {}) {
      const validation = validateMutation(profileId, options)
      if (!validation.ok) return validation
      const target = validation.profile
      if (target.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.SELF_PROFILE_LIFECYCLE_FORBIDDEN, {
          profileId: target.id,
          revision: target.revision,
        })
      }
      const previousRevision = target.revision
      target.lifecycle = {
        ...normalizeContactsProfileLifecycle(target.lifecycle),
        state: CONTACTS_PROFILE_LIFECYCLE_STATES.ARCHIVED,
        archivedAt: Math.max(0, Math.floor(now())),
        archiveNote: normalizeArchiveNote(archiveInput?.note),
      }
      touchProfile(target)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_ARCHIVED,
        target,
        previousRevision,
      )
    },

    restoreProfile(profileId, options = {}) {
      const validation = validateMutation(profileId, { ...options, allowArchived: true })
      if (!validation.ok) return validation
      const target = validation.profile
      if (target.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.SELF_PROFILE_LIFECYCLE_FORBIDDEN, {
          profileId: target.id,
          revision: target.revision,
        })
      }
      if (!isContactsProfileArchived(target)) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.PROFILE_NOT_ARCHIVED, {
          profileId: target.id,
          revision: target.revision,
        })
      }
      const previousRevision = target.revision
      target.lifecycle = {
        ...normalizeContactsProfileLifecycle(target.lifecycle),
        state: CONTACTS_PROFILE_LIFECYCLE_STATES.ACTIVE,
        restoredAt: Math.max(0, Math.floor(now())),
      }
      touchProfile(target)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_RESTORED,
        target,
        previousRevision,
      )
    },

    permanentlyDeleteArchivedProfile(profileId, options = {}) {
      const validation = validateMutation(profileId, { ...options, allowArchived: true })
      if (!validation.ok) return validation
      const target = validation.profile
      if (target.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.SELF_PROFILE_LIFECYCLE_FORBIDDEN, {
          profileId: target.id,
          revision: target.revision,
        })
      }
      if (!isContactsProfileArchived(target)) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.PROFILE_NOT_ARCHIVED, {
          profileId: target.id,
          revision: target.revision,
        })
      }

      const index = profiles.findIndex((profile) => Number(profile.id) === Number(target.id))
      if (index < 0) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.PROFILE_NOT_FOUND, {
          profileId: target.id,
        })
      }
      const tombstone = normalizeContactsProfileTombstone({
        profileId: target.id,
        roleId: target.roleId,
        entityType: target.entityType,
        worldId: target.templateLink?.primaryWorldId,
        deletedAt: Math.max(0, Math.floor(now())),
        schemaVersion: CONTACTS_PROFILE_LIFECYCLE_SCHEMA_VERSION,
      })
      if (!tombstone) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: target.id,
          revision: target.revision,
        })
      }

      const snapshot = immutableProfile(target)
      profiles.splice(index, 1)
      applyLifecycleState(
        {
          ...lifecycleState,
          tombstones: [...lifecycleState.tombstones, tombstone],
        },
        profiles,
      )
      return deepFreeze({
        ok: true,
        code: CONTACTS_PROFILE_OWNER_CODES.PROFILE_PERMANENTLY_DELETED,
        profileId: target.id,
        previousRevision: target.revision,
        revision: target.revision,
        profile: snapshot,
        tombstone: structuredClone(tombstone),
      })
    },

    listDetailItems(profileId, section = '') {
      const profile = findMutableProfileById(profileId)
      if (!profile) return []
      const normalizedSection = section ? normalizeRoleDetailSection(section) : ''
      return cloneRoleDetailItems(profile.detailItems).filter(
        (item) => !normalizedSection || item.section === normalizedSection,
      )
    },

    addDetailItem(profileId, section, input = {}, options = {}) {
      const validation = validateMutation(profileId, options)
      if (!validation.ok) return validation
      const item = createRoleDetailItem(section, input)
      if (!item) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: validation.profile.id,
        })
      }
      const previousRevision = validation.profile.revision
      validation.profile.detailItems = normalizeRoleDetailItems([
        item,
        ...(validation.profile.detailItems || []),
      ])
      touchProfile(validation.profile)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
        validation.profile,
        previousRevision,
        { item: deepFreeze({ ...item }) },
      )
    },

    updateDetailItem(profileId, itemId, updates = {}, options = {}) {
      const validation = validateMutation(profileId, options)
      const id = typeof itemId === 'string' ? itemId.trim() : ''
      if (!validation.ok) return validation
      if (!id || !updates || typeof updates !== 'object') {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: validation.profile.id,
        })
      }
      const current = normalizeRoleDetailItems(validation.profile.detailItems)
      const index = current.findIndex((item) => item.id === id)
      if (index < 0) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: validation.profile.id,
        })
      }
      const existing = current[index]
      const item = createRoleDetailItem(existing.section, {
        ...existing,
        ...updates,
        id: existing.id,
        section: existing.section,
        sourceKind: existing.sourceKind,
        sourceModule: existing.sourceModule,
        sourceId: existing.sourceId,
        memoryKey: existing.memoryKey,
        relationshipEventId: existing.relationshipEventId,
        createdAt: existing.createdAt,
        updatedAt: now(),
      })
      if (!item) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: validation.profile.id,
        })
      }
      const previousRevision = validation.profile.revision
      const next = [...current]
      next.splice(index, 1, item)
      validation.profile.detailItems = normalizeRoleDetailItems(next)
      touchProfile(validation.profile)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
        validation.profile,
        previousRevision,
        { item: deepFreeze({ ...item }) },
      )
    },

    removeDetailItem(profileId, itemId, options = {}) {
      const validation = validateMutation(profileId, options)
      const id = typeof itemId === 'string' ? itemId.trim() : ''
      if (!validation.ok) return validation
      if (!id) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: validation.profile.id,
        })
      }
      const current = normalizeRoleDetailItems(validation.profile.detailItems)
      const next = current.filter((item) => item.id !== id)
      if (next.length === current.length) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: validation.profile.id,
        })
      }
      const previousRevision = validation.profile.revision
      validation.profile.detailItems = next
      touchProfile(validation.profile)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
        validation.profile,
        previousRevision,
      )
    },

    clearEventAttachedDetailItems(profileId, clearOptions = {}, options = {}) {
      const validation = validateMutation(profileId, options)
      if (!validation.ok) return validation
      const current = normalizeRoleDetailItems(validation.profile.detailItems)
      const next = clearOptions?.memoryKey || Array.isArray(clearOptions?.sourceRefs)
        ? filterRoleDetailItemsForMemoryDelete(current, clearOptions)
        : filterRoleDetailItemsForReset(current)
      const removedCount = current.length - next.length
      if (removedCount <= 0) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: validation.profile.id,
          removedCount: 0,
        })
      }
      const previousRevision = validation.profile.revision
      validation.profile.detailItems = next
      touchProfile(validation.profile)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
        validation.profile,
        previousRevision,
        { removedCount },
      )
    },

    setAssetPack(profileId, nextPack = {}, options = {}) {
      const validation = validateMutation(profileId, options)
      if (!validation.ok) return validation
      const current = normalizeRoleAssetPack(validation.profile.assetPack)
      const normalized = normalizeRoleAssetPack({
        ...current,
        ...(nextPack && typeof nextPack === 'object' ? nextPack : {}),
      })
      if (JSON.stringify(current) === JSON.stringify(normalized)) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: validation.profile.id,
        })
      }
      const previousRevision = validation.profile.revision
      validation.profile.assetPack = normalized
      touchProfile(validation.profile)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
        validation.profile,
        previousRevision,
      )
    },

    setAssetFolderBindings(profileId, nextBindings = {}, options = {}) {
      const validation = validateMutation(profileId, options)
      if (!validation.ok) return validation
      const current = normalizeRoleAssetFolderBindings(validation.profile.assetFolderBindings)
      const normalized = mergeRoleProfileAssetFolderBindings(current, nextBindings)
      if (JSON.stringify(current) === JSON.stringify(normalized)) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: validation.profile.id,
        })
      }
      const previousRevision = validation.profile.revision
      validation.profile.assetFolderBindings = normalized
      touchProfile(validation.profile)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
        validation.profile,
        previousRevision,
      )
    },

    updateRelationshipPremise(profileId, updates = {}, options = {}) {
      if (!updates || typeof updates !== 'object') {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: toPositiveInt(profileId),
        })
      }
      const premiseUpdates = {}
      ;['relationshipLabelText', 'relationshipLabelNote', 'initialRelationshipSeed'].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
          premiseUpdates[key] = updates[key]
        }
      })
      if (Object.keys(premiseUpdates).length === 0) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.WRITE_REJECTED, {
          profileId: toPositiveInt(profileId),
        })
      }
      return reviseProfile(profileId, premiseUpdates, options)
    },

    saveRelationshipClassification(profileId, classification = {}, options = {}) {
      const validation = validateMutation(profileId, options)
      if (!validation.ok) return validation
      const target = validation.profile
      const input = classification && typeof classification === 'object' ? classification : {}
      const requestedSource = options.source || input.classificationSource || ''
      const protectedUserEdit =
        target.classificationSource === RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED &&
        requestedSource !== RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED &&
        options.force !== true
      if (protectedUserEdit) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.USER_EDITED_PROTECTED, {
          profileId: target.id,
        })
      }

      const previousRevision = target.revision
      Object.assign(
        target,
        normalizeRelationshipProfileFields({
          ...target,
          ...input,
          classificationSource: requestedSource || input.classificationSource,
          classificationUpdatedAt: Object.prototype.hasOwnProperty.call(input, 'classificationUpdatedAt')
            ? input.classificationUpdatedAt
            : now(),
        }),
      )
      touchProfile(target)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
        target,
        previousRevision,
      )
    },

    upgradeNpcToMainRole(profileId, upgradeOptions = {}, options = {}) {
      const validation = validateMutation(profileId, options)
      if (!validation.ok) return validation
      const target = validation.profile
      if (target.entityType !== CONTACTS_ENTITY_TYPES.NPC) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.INVALID_ENTITY_TRANSITION, {
          profileId: target.id,
        })
      }

      const previousRevision = target.revision
      const relationshipMode = upgradeOptions.relationshipMode === 'full' ? 'full' : 'lightweight'
      target.entityType = CONTACTS_ENTITY_TYPES.MAIN_ROLE
      target.isMain = true
      if (typeof upgradeOptions.role === 'string') target.role = upgradeOptions.role
      if (typeof upgradeOptions.bio === 'string') target.bio = upgradeOptions.bio
      target.capabilities = normalizeProfileCapabilities(
        {
          ...createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.MAIN_ROLE),
          canUseFullRelationshipProgress: relationshipMode === 'full',
          canUseMemoryGroups: relationshipMode === 'full',
          canUseRouteProgression: relationshipMode === 'full',
        },
        CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      )
      target.payeeAccounts = normalizeRolePayeeAccounts(target.payeeAccounts, {
        profileId: target.id,
        roleId: target.roleId,
        entityType: target.entityType,
      })
      touchProfile(target)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
        target,
        previousRevision,
      )
    },

    upgradeNpcToSupportingRole(profileId, upgradeOptions = {}, options = {}) {
      const validation = validateMutation(profileId, options)
      if (!validation.ok) return validation
      const target = validation.profile
      if (target.entityType !== CONTACTS_ENTITY_TYPES.NPC) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.INVALID_ENTITY_TRANSITION, {
          profileId: target.id,
        })
      }

      const previousRevision = target.revision
      target.entityType = CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE
      target.isMain = false
      if (typeof upgradeOptions.role === 'string') target.role = upgradeOptions.role
      if (typeof upgradeOptions.bio === 'string') target.bio = upgradeOptions.bio
      target.capabilities = normalizeProfileCapabilities(
        {
          ...target.capabilities,
          canAppearInChatDirectory: true,
          canUseFullRelationshipProgress: false,
          canUseMemoryGroups: true,
          canUseRouteProgression: false,
        },
        CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
      )
      target.payeeAccounts = normalizeRolePayeeAccounts(target.payeeAccounts, {
        profileId: target.id,
        roleId: target.roleId,
        entityType: target.entityType,
      })
      touchProfile(target)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
        target,
        previousRevision,
      )
    },

    upgradeSupportingRoleToMainRole(profileId, upgradeOptions = {}, options = {}) {
      const validation = validateMutation(profileId, options)
      if (!validation.ok) return validation
      const target = validation.profile
      if (target.entityType !== CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.INVALID_ENTITY_TRANSITION, {
          profileId: target.id,
        })
      }

      const previousRevision = target.revision
      const relationshipMode = upgradeOptions.relationshipMode === 'full' ? 'full' : 'lightweight'
      target.entityType = CONTACTS_ENTITY_TYPES.MAIN_ROLE
      target.isMain = true
      if (typeof upgradeOptions.role === 'string') target.role = upgradeOptions.role
      if (typeof upgradeOptions.bio === 'string') target.bio = upgradeOptions.bio
      target.capabilities = normalizeProfileCapabilities(
        {
          ...createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.MAIN_ROLE),
          canUseFullRelationshipProgress: relationshipMode === 'full',
          canUseMemoryGroups: relationshipMode === 'full',
          canUseRouteProgression: relationshipMode === 'full',
        },
        CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      )
      target.payeeAccounts = normalizeRolePayeeAccounts(target.payeeAccounts, {
        profileId: target.id,
        roleId: target.roleId,
        entityType: target.entityType,
      })
      touchProfile(target)
      return successReceipt(
        CONTACTS_PROFILE_OWNER_CODES.PROFILE_REVISED,
        target,
        previousRevision,
      )
    },

    removeProfile(profileId, options = {}) {
      const validation = validateMutation(profileId, options)
      if (!validation.ok) return validation
      const target = validation.profile
      const previousRevision = target.revision
      const index = profiles.findIndex((profile) => Number(profile.id) === Number(target.id))
      if (index < 0) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.PROFILE_NOT_FOUND, {
          profileId: target.id,
        })
      }
      const snapshot = immutableProfile(target)
      profiles.splice(index, 1)
      return deepFreeze({
        ok: true,
        code: CONTACTS_PROFILE_OWNER_CODES.PROFILE_REMOVED,
        profileId: target.id,
        previousRevision,
        revision: previousRevision,
        profile: snapshot,
      })
    },

    replaceAllProfiles(rawProfiles = [], options = {}) {
      const prepared = prepareProfileList(rawProfiles, now)
      if (!prepared.ok) {
        return failureReceipt(prepared.code, {
          duplicateProfileIds: prepared.duplicateProfileIds || [],
        })
      }
      const nextLifecycleState = normalizeContactsProfileLifecycleState(
        options.lifecycleState ?? lifecycleState,
        prepared.profiles,
      )
      const tombstoneProfileIds = new Set(
        nextLifecycleState.tombstones.map((tombstone) => tombstone.profileId),
      )
      const tombstoneRoleIds = new Set(
        nextLifecycleState.tombstones.map((tombstone) => tombstone.roleId.toLowerCase()),
      )
      const reservedProfile = prepared.profiles.find(
        (profile) =>
          tombstoneProfileIds.has(profile.id) ||
          tombstoneRoleIds.has(normalizeRoleId(profile.roleId).toLowerCase()),
      )
      if (reservedProfile) {
        return failureReceipt(CONTACTS_PROFILE_OWNER_CODES.PROFILE_ID_RESERVED, {
          profileId: reservedProfile.id,
        })
      }
      profiles.splice(0, profiles.length, ...prepared.profiles)
      applyLifecycleState(nextLifecycleState, profiles)
      return deepFreeze({
        ok: true,
        code: CONTACTS_PROFILE_OWNER_CODES.PROFILES_REPLACED,
        count: profiles.length,
      })
    },
  }
}
