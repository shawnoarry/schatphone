import { resolveAvatarHierarchy } from './avatar'

export const ROLE_BINDING_CONTRACT_VERSION = '1.0.0'

const MAX_ASSET_ID_LENGTH = 128
const MAX_ASSET_IDS_PER_CATEGORY = 24
const MAX_FOLDER_ID_LENGTH = 128
const MAX_FOLDER_IDS_PER_SLOT = 8
const MAX_SLOT_PRIORITY = 999
const MAX_KNOWLEDGE_POINT_ID_LENGTH = 64
const MAX_KNOWLEDGE_POINT_IDS_PER_PROFILE = 80
const VALID_PROFILE_ENTITY_TYPES = new Set(['self_profile', 'main_role', 'npc'])
const VALID_PROFILE_VISIBILITY_LEVELS = new Set([
  'public',
  'familiar',
  'intimate',
  'hidden',
  'world_specific',
])
const VALID_PROFILE_VALUE_SOURCE_KINDS = new Set(['manual', 'template_default', 'event_attached'])

export const ROLE_ASSET_FOLDER_SLOT_KEYS = Object.freeze([
  'profileImage',
  'dynamicMedia',
  'emojiPack',
  'imageReference',
])

const trimTo = (value, maxLength = 500) => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''
  if (!Number.isFinite(Number(maxLength)) || maxLength <= 0) return text
  return text.length <= maxLength ? text : text.slice(0, maxLength)
}

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const sanitizeRoleBindingAssetId = (value) => {
  const raw = trimTo(value, MAX_ASSET_ID_LENGTH)
  if (!raw) return ''
  return /^[a-z0-9_-]+$/i.test(raw) ? raw : ''
}

export const sanitizeRoleBindingFolderId = (value) => {
  const raw = trimTo(value, MAX_FOLDER_ID_LENGTH)
  if (!raw) return ''
  return /^[a-z0-9_-]+$/i.test(raw) ? raw : ''
}

export const createEmptyRoleAssetPack = () => ({
  wallpaperAssetIds: [],
  emojiAssetIds: [],
  referenceAssetIds: [],
  scenarioAssetIds: [],
})

const createEmptyRoleAssetFolderSlotBinding = () => ({
  folderId: '',
  folderPriority: 0,
  folderPriorityChain: [],
})

export const createEmptyRoleAssetFolderBindings = () =>
  Object.fromEntries(
    ROLE_ASSET_FOLDER_SLOT_KEYS.map((slotKey) => [slotKey, createEmptyRoleAssetFolderSlotBinding()]),
  )

const normalizeRoleAssetIdList = (input) => {
  if (!Array.isArray(input)) return []
  const uniqueIds = []
  input.forEach((rawId) => {
    const id = sanitizeRoleBindingAssetId(rawId)
    if (!id || uniqueIds.includes(id)) return
    uniqueIds.push(id)
  })
  return uniqueIds.slice(0, MAX_ASSET_IDS_PER_CATEGORY)
}

const normalizeRoleFolderIdList = (input) => {
  if (!Array.isArray(input)) return []
  const uniqueIds = []
  input.forEach((rawId) => {
    const id = sanitizeRoleBindingFolderId(rawId)
    if (!id || uniqueIds.includes(id)) return
    uniqueIds.push(id)
  })
  return uniqueIds.slice(0, MAX_FOLDER_IDS_PER_SLOT)
}

const sanitizeKnowledgePointId = (value) => {
  const raw = trimTo(value, MAX_KNOWLEDGE_POINT_ID_LENGTH)
  if (!raw) return ''
  return /^[a-z0-9_-]+$/i.test(raw) ? raw : ''
}

const normalizeKnowledgePointIdList = (input) => {
  if (!Array.isArray(input)) return []
  const uniqueIds = []
  input.forEach((rawId) => {
    const id = sanitizeKnowledgePointId(rawId)
    if (!id || uniqueIds.includes(id)) return
    uniqueIds.push(id)
  })
  return uniqueIds.slice(0, MAX_KNOWLEDGE_POINT_IDS_PER_PROFILE)
}

const normalizeProfileTemplateLinkForContract = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  return {
    primaryWorldId: sanitizeKnowledgePointId(source.primaryWorldId),
    profileTemplateId: sanitizeKnowledgePointId(source.profileTemplateId),
    profileTemplateVersion: Math.max(0, toInt(source.profileTemplateVersion, 0)),
    supplementalKnowledgePointIds: normalizeKnowledgePointIdList(
      source.supplementalKnowledgePointIds || source.knowledgePointIds,
    ),
  }
}

const normalizeProfileValuesForContract = (input = []) => {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  return input
    .map((item, index) => {
      const source = item && typeof item === 'object' ? item : {}
      const fieldId = sanitizeKnowledgePointId(source.fieldId || source.id)
      if (!fieldId || seen.has(fieldId)) return null
      seen.add(fieldId)
      return {
        id: sanitizeKnowledgePointId(source.id) || `${fieldId}_${index}`,
        fieldId,
        value: Array.isArray(source.value)
          ? source.value.map((value) => trimTo(value, 120)).filter(Boolean).slice(0, 80)
          : trimTo(source.value, 600),
        visibilityLevel: VALID_PROFILE_VISIBILITY_LEVELS.has(source.visibilityLevel)
          ? source.visibilityLevel
          : 'familiar',
        sourceKind: VALID_PROFILE_VALUE_SOURCE_KINDS.has(source.sourceKind)
          ? source.sourceKind
          : 'manual',
        updatedAt: Math.max(0, toInt(source.updatedAt, 0)),
      }
    })
    .filter(Boolean)
    .slice(0, 160)
}

const normalizeProfileCapabilitiesForContract = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  const defaults = {
    canAppearInChatDirectory: true,
    canUseFullRelationshipProgress: true,
    canUseMemoryGroups: true,
    canUseRouteProgression: true,
    canAppearInWorldEvents: true,
    canAppearInSocialFeed: true,
  }
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      typeof source[key] === 'boolean' ? source[key] : fallback,
    ]),
  )
}

export const normalizeRoleAssetPack = (rawPack) => {
  const input = rawPack && typeof rawPack === 'object' ? rawPack : {}
  return {
    wallpaperAssetIds: normalizeRoleAssetIdList(input.wallpaperAssetIds),
    emojiAssetIds: normalizeRoleAssetIdList(input.emojiAssetIds),
    referenceAssetIds: normalizeRoleAssetIdList(input.referenceAssetIds),
    scenarioAssetIds: normalizeRoleAssetIdList(input.scenarioAssetIds),
  }
}

export const normalizeRoleAssetFolderBindings = (rawBindings) => {
  const source = rawBindings && typeof rawBindings === 'object' ? rawBindings : {}
  const output = {}

  ROLE_ASSET_FOLDER_SLOT_KEYS.forEach((slotKey) => {
    const slotInput = source[slotKey] && typeof source[slotKey] === 'object' ? source[slotKey] : {}
    output[slotKey] = {
      folderId: sanitizeRoleBindingFolderId(slotInput.folderId),
      folderPriority: clamp(toInt(slotInput.folderPriority, 0), 0, MAX_SLOT_PRIORITY),
      folderPriorityChain: normalizeRoleFolderIdList(slotInput.folderPriorityChain),
    }
  })

  return output
}

export const cloneRoleAssetPack = (assetPack) => {
  const normalized = normalizeRoleAssetPack(assetPack)
  return {
    wallpaperAssetIds: [...normalized.wallpaperAssetIds],
    emojiAssetIds: [...normalized.emojiAssetIds],
    referenceAssetIds: [...normalized.referenceAssetIds],
    scenarioAssetIds: [...normalized.scenarioAssetIds],
  }
}

export const cloneRoleAssetFolderBindings = (bindings) => {
  const normalized = normalizeRoleAssetFolderBindings(bindings)
  const output = {}
  ROLE_ASSET_FOLDER_SLOT_KEYS.forEach((slotKey) => {
    const slotBinding = normalized[slotKey]
    output[slotKey] = {
      folderId: slotBinding.folderId,
      folderPriority: slotBinding.folderPriority,
      folderPriorityChain: [...slotBinding.folderPriorityChain],
    }
  })
  return output
}

export const flattenRoleAssetPack = (assetPack) => {
  const normalized = normalizeRoleAssetPack(assetPack)
  const merged = [
    ...normalized.wallpaperAssetIds,
    ...normalized.emojiAssetIds,
    ...normalized.referenceAssetIds,
    ...normalized.scenarioAssetIds,
  ]
  return normalizeRoleAssetIdList(merged)
}

const getRecommendedImageAssetId = (preferredImageAssetId, profileAssetPack) => {
  const preferred = sanitizeRoleBindingAssetId(preferredImageAssetId)
  if (preferred) return preferred
  const pack = normalizeRoleAssetPack(profileAssetPack)
  return (
    pack.referenceAssetIds[0] ||
    pack.scenarioAssetIds[0] ||
    pack.emojiAssetIds[0] ||
    pack.wallpaperAssetIds[0] ||
    ''
  )
}

export const createRoleBindingContract = (input = {}) => {
  const contactInput = input.contact && typeof input.contact === 'object' ? input.contact : {}
  const profileInput = input.profile && typeof input.profile === 'object' ? input.profile : {}

  const contactId = Math.max(0, toInt(contactInput.id, 0))
  const contactKind = trimTo(contactInput.kind, 32) || 'role'
  const contactName = trimTo(contactInput.name, 120)
  const profileId = Math.max(0, toInt(contactInput.profileId ?? profileInput.id, 0))
  const profileAssetPack = normalizeRoleAssetPack(input.profileAssetPack ?? profileInput.assetPack)
  const profileAssetFolderBindings = normalizeRoleAssetFolderBindings(
    input.profileAssetFolderBindings ?? profileInput.assetFolderBindings,
  )

  const preferredImageAssetId = sanitizeRoleBindingAssetId(input.preferredImageAssetId)
  const recommendedImageAssetId = getRecommendedImageAssetId(
    preferredImageAssetId,
    profileAssetPack,
  )

  const avatarSources = input.avatarSources && typeof input.avatarSources === 'object'
    ? input.avatarSources
    : {}
  const avatarResolution = resolveAvatarHierarchy({
    threadAvatar: avatarSources.threadAvatar,
    moduleAvatar: avatarSources.moduleAvatar,
    globalAvatar: avatarSources.globalAvatar,
    fallbackSeed: avatarSources.fallbackSeed || contactName || `contact-${contactId || 0}`,
  })

  return {
    contractVersion: ROLE_BINDING_CONTRACT_VERSION,
    moduleKey: trimTo(input.moduleKey, 64) || 'chat',
    roleBound: contactKind === 'role' && profileId > 0,
    contact: {
      id: contactId,
      kind: contactKind,
      name: contactName,
      profileId,
    },
    profile: {
      id: profileId,
      name: trimTo(profileInput.name, 120),
      role: trimTo(profileInput.role, 120),
      isMain: Boolean(profileInput.isMain),
      entityType: VALID_PROFILE_ENTITY_TYPES.has(profileInput.entityType)
        ? profileInput.entityType
        : profileInput.isMain
          ? 'main_role'
          : 'npc',
      templateLink: normalizeProfileTemplateLinkForContract(profileInput.templateLink),
      profileValues: normalizeProfileValuesForContract(profileInput.profileValues),
      capabilities: normalizeProfileCapabilitiesForContract(profileInput.capabilities),
      knowledgePointIds: normalizeKnowledgePointIdList(profileInput.knowledgePointIds),
      tags: Array.isArray(profileInput.tags)
        ? profileInput.tags
            .map((item) => trimTo(item, 80))
            .filter(Boolean)
        : [],
    },
    relationship: {
      level: clamp(toInt(input.relationshipLevel, 50), 0, 100),
      note: trimTo(input.relationshipNote, 500),
    },
    avatar: {
      resolved: avatarResolution.avatar,
      activeLayer: avatarResolution.layer,
      threadAvatar: trimTo(avatarSources.threadAvatar, 500),
      moduleAvatar: trimTo(avatarSources.moduleAvatar, 500),
      globalAvatar: trimTo(avatarSources.globalAvatar, 500),
      fallbackSeed: trimTo(avatarSources.fallbackSeed, 120),
    },
    assets: {
      preferredImageAssetId,
      recommendedImageAssetId,
      profileAssetPack: cloneRoleAssetPack(profileAssetPack),
      profileAssetIds: flattenRoleAssetPack(profileAssetPack),
      profileAssetFolderBindings: cloneRoleAssetFolderBindings(profileAssetFolderBindings),
    },
  }
}

export const toRoleBindingAssetContext = (contract) => {
  const input = contract && typeof contract === 'object' ? contract : {}
  const assets = input.assets && typeof input.assets === 'object' ? input.assets : {}
  const profile = input.profile && typeof input.profile === 'object' ? input.profile : {}
  const contact = input.contact && typeof input.contact === 'object' ? input.contact : {}
  return {
    profileId: Math.max(0, toInt(profile.id, 0)),
    profileName: trimTo(profile.name || contact.name, 120),
    preferredImageAssetId: sanitizeRoleBindingAssetId(assets.preferredImageAssetId),
    recommendedImageAssetId: sanitizeRoleBindingAssetId(assets.recommendedImageAssetId),
    profileAssetPack: cloneRoleAssetPack(assets.profileAssetPack),
    profileAssetIds: flattenRoleAssetPack(assets.profileAssetPack),
    profileAssetFolderBindings: cloneRoleAssetFolderBindings(assets.profileAssetFolderBindings),
  }
}
