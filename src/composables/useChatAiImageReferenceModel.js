import {
  getRoleAssetFolderSlotKeysByCategory,
  resolveFolderBoundAssetIds,
} from '../lib/role-asset-folder-resolver'

export const CHAT_AI_IMAGE_REFERENCE_LIMITS = Object.freeze({
  maxReferences: 3,
  maxReferenceImageBytes: 1_500_000,
  maxProviderLength: 32,
  roleFolderResolveLimit: 80,
})

export const CHAT_AI_IMAGE_REFERENCE_TRANSPORT_MODES = new Set([
  'none',
  'context_only',
  'native_url',
])

export const createEmptyChatReferenceProfileAssetPack = () => ({
  wallpaperAssetIds: [],
  emojiAssetIds: [],
  referenceAssetIds: [],
  scenarioAssetIds: [],
})

export const normalizeChatImageReferenceTransportMode = (value) =>
  CHAT_AI_IMAGE_REFERENCE_TRANSPORT_MODES.has(value) ? value : 'none'

export const normalizeChatImageReferenceCount = (
  value,
  maxReferences = CHAT_AI_IMAGE_REFERENCE_LIMITS.maxReferences,
) => {
  const count = Number(value)
  if (!Number.isFinite(count)) return 0
  const limit = Number.isFinite(Number(maxReferences))
    ? Math.max(0, Math.floor(Number(maxReferences)))
    : CHAT_AI_IMAGE_REFERENCE_LIMITS.maxReferences
  return Math.min(limit, Math.max(0, Math.floor(count)))
}

export const normalizeChatImageReferenceProvider = (
  value,
  maxLength = CHAT_AI_IMAGE_REFERENCE_LIMITS.maxProviderLength,
) => {
  const text = typeof value === 'string' && value.trim() ? value.trim() : ''
  if (!text) return ''
  const limit = Number.isFinite(Number(maxLength))
    ? Math.max(0, Math.floor(Number(maxLength)))
    : CHAT_AI_IMAGE_REFERENCE_LIMITS.maxProviderLength
  return text.slice(0, limit)
}

export const buildChatAssistantImageReferenceMeta = (
  callMeta = null,
  fallbackReferenceCount = 0,
  fallbackProvider = '',
  options = {},
) => ({
  imageReferenceMode: normalizeChatImageReferenceTransportMode(callMeta?.finalTransportMode),
  imageReferenceCount: normalizeChatImageReferenceCount(
    callMeta?.referenceCount ?? fallbackReferenceCount,
    options.maxReferences,
  ),
  imageReferenceFallback: Boolean(callMeta?.fallbackUsed),
  imageReferenceProvider: normalizeChatImageReferenceProvider(callMeta?.apiKind || fallbackProvider),
})

const trimText = (value) => (typeof value === 'string' ? value.trim() : '')

const toUniqueStringList = (items = []) => {
  const output = []
  ;(Array.isArray(items) ? items : []).forEach((item) => {
    const value = trimText(item)
    if (!value || output.includes(value)) return
    output.push(value)
  })
  return output
}

export const useChatAiImageReferenceModel = ({
  chatStore,
  galleryStore,
  t,
  maxReferences = CHAT_AI_IMAGE_REFERENCE_LIMITS.maxReferences,
  maxReferenceImageBytes = CHAT_AI_IMAGE_REFERENCE_LIMITS.maxReferenceImageBytes,
  roleFolderResolveLimit = CHAT_AI_IMAGE_REFERENCE_LIMITS.roleFolderResolveLimit,
} = {}) => {
  const normalizedMaxReferences = Number.isFinite(Number(maxReferences))
    ? Math.max(0, Math.floor(Number(maxReferences)))
    : CHAT_AI_IMAGE_REFERENCE_LIMITS.maxReferences
  const normalizedMaxReferenceImageBytes = Number.isFinite(Number(maxReferenceImageBytes))
    ? Math.max(0, Math.floor(Number(maxReferenceImageBytes)))
    : CHAT_AI_IMAGE_REFERENCE_LIMITS.maxReferenceImageBytes
  const normalizedRoleFolderResolveLimit = Number.isFinite(Number(roleFolderResolveLimit))
    ? Math.max(1, Math.floor(Number(roleFolderResolveLimit)))
    : CHAT_AI_IMAGE_REFERENCE_LIMITS.roleFolderResolveLimit

  const translate = (zh, en) => (typeof t === 'function' ? t(zh, en) : en || zh)

  const roleFolderSlotHintLabel = (slotKey) => {
    if (slotKey === 'imageReference') return translate('参考图', 'Reference')
    if (slotKey === 'dynamicMedia') return translate('动态图', 'Dynamic')
    if (slotKey === 'profileImage') return translate('形象照', 'Profile image')
    if (slotKey === 'emojiPack') return translate('表情包', 'Emoji')
    return slotKey || ''
  }

  const findAssetById = (assetId) =>
    galleryStore && typeof galleryStore.findAssetById === 'function'
      ? galleryStore.findAssetById(assetId)
      : null

  const resolveAssetAiReferenceUrl = async (assetId) => {
    if (!galleryStore || typeof galleryStore.getAssetAiReferenceUrl !== 'function') return null
    return galleryStore.getAssetAiReferenceUrl(assetId, {
      maxBytes: normalizedMaxReferenceImageBytes,
    })
  }

  const buildAssistantImageReferenceMeta = (
    callMeta = null,
    fallbackReferenceCount = 0,
    fallbackProvider = '',
  ) =>
    buildChatAssistantImageReferenceMeta(callMeta, fallbackReferenceCount, fallbackProvider, {
      maxReferences: normalizedMaxReferences,
    })

  const buildRoleBoundReferenceCandidates = (contactId) => {
    const contract =
      chatStore && typeof chatStore.getRoleBindingContract === 'function'
        ? chatStore.getRoleBindingContract(contactId, { moduleKey: 'chat' })
        : null
    if (!contract?.roleBound) {
      return {
        profileName: '',
        candidateAssetIds: [],
        sourceByAssetId: {},
      }
    }

    const profilePack =
      contract.assets?.profileAssetPack || createEmptyChatReferenceProfileAssetPack()
    const folderResolved = resolveFolderBoundAssetIds(
      galleryStore,
      contract.assets?.profileAssetFolderBindings,
      getRoleAssetFolderSlotKeysByCategory('reference'),
      {
        category: 'all',
        limit: normalizedRoleFolderResolveLimit,
      },
    )

    const candidateAssetIds = []
    const pushAssetId = (assetId) => {
      const normalized = trimText(assetId)
      if (!normalized || candidateAssetIds.includes(normalized)) return
      candidateAssetIds.push(normalized)
    }

    pushAssetId(contract.assets?.preferredImageAssetId)
    ;(Array.isArray(profilePack.referenceAssetIds) ? profilePack.referenceAssetIds : []).forEach(
      (id) => pushAssetId(id),
    )
    ;(Array.isArray(profilePack.scenarioAssetIds) ? profilePack.scenarioAssetIds : []).forEach(
      (id) => pushAssetId(id),
    )
    ;(Array.isArray(folderResolved.assetIds) ? folderResolved.assetIds : []).forEach((id) =>
      pushAssetId(id),
    )

    return {
      profileName: contract.profile?.name || contract.contact?.name || '',
      candidateAssetIds,
      sourceByAssetId: folderResolved.sourceByAssetId || {},
    }
  }

  const collectImageReferencesFromContextMessages = async (messages = []) => {
    if (!Array.isArray(messages) || messages.length === 0) return []
    const collected = []
    const seen = new Set()

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (collected.length >= normalizedMaxReferences) break
      const message = messages[i]
      if (message?.role !== 'user' || !Array.isArray(message.blocks)) continue

      for (const block of message.blocks) {
        if (collected.length >= normalizedMaxReferences) break
        if (!block || block.type !== 'image_virtual') continue

        const assetId = trimText(block.assetId)
        const asset = assetId ? findAssetById(assetId) : null
        let sourceUrl = trimText(block.url)
        let sourceReason = ''

        if (!sourceUrl && assetId) {
          const resolved = await resolveAssetAiReferenceUrl(assetId)
          if (resolved?.ok && trimText(resolved.url)) {
            sourceUrl = trimText(resolved.url)
          } else if (resolved?.reason) {
            sourceReason = resolved.reason
          }
        }

        const label =
          trimText(block.alt) ||
          trimText(asset?.name) ||
          translate('参考图', 'Reference image')
        const noteBase =
          trimText(block.caption) || translate('来自聊天上下文', 'From chat context')
        const note =
          sourceReason === 'blob_too_large'
            ? `${noteBase} · ${translate('本地图片过大，按文字线索处理', 'Local image too large, using text-only cue')}`
            : noteBase
        const sourceKey = `${label}|${assetId}|${sourceUrl.slice(0, 120)}`
        if (seen.has(sourceKey)) continue
        seen.add(sourceKey)
        collected.push({
          label,
          note,
          sourceUrl,
          assetId,
        })
      }
    }

    return collected
  }

  const collectImageReferencesFromRoleBindings = async (
    contactId,
    { limit = normalizedMaxReferences, excludeAssetIds = [] } = {},
  ) => {
    const normalizedLimit = Number.isFinite(Number(limit))
      ? Math.max(0, Math.floor(Number(limit)))
      : 0
    if (normalizedLimit <= 0) return []

    const excludeSet = new Set(toUniqueStringList(excludeAssetIds))
    const { profileName, candidateAssetIds, sourceByAssetId } =
      buildRoleBoundReferenceCandidates(contactId)
    if (!candidateAssetIds.length) return []

    const collected = []
    const seen = new Set()

    for (const assetId of candidateAssetIds) {
      if (collected.length >= normalizedLimit) break
      if (excludeSet.has(assetId)) continue

      const asset = findAssetById(assetId)
      if (!asset) continue
      if (asset.category === 'emoji') continue

      const resolved = await resolveAssetAiReferenceUrl(assetId)
      const sourceUrl = resolved?.ok && trimText(resolved.url) ? trimText(resolved.url) : ''
      const sourceReason = trimText(resolved?.reason)

      const sourceEntry = sourceByAssetId?.[assetId]
      const slotLabels =
        Array.isArray(sourceEntry?.slotKeys) && sourceEntry.slotKeys.length > 0
          ? sourceEntry.slotKeys.map((slotKey) => roleFolderSlotHintLabel(slotKey)).filter(Boolean)
          : []
      const slotHint = slotLabels.length > 0 ? slotLabels.join('/') : ''
      const noteBase = slotHint
        ? translate(
            `来自角色绑定素材（${slotHint}${profileName ? ` · ${profileName}` : ''}）`,
            `From role-bound asset (${slotHint}${profileName ? ` · ${profileName}` : ''})`,
          )
        : translate(
            `来自角色绑定素材${profileName ? `（${profileName}）` : ''}`,
            `From role-bound asset${profileName ? ` (${profileName})` : ''}`,
          )
      const note =
        sourceReason === 'blob_too_large'
          ? `${noteBase} · ${translate('本地图片过大，按文字线索处理', 'Local image too large, using text-only cue')}`
          : noteBase
      const label =
        trimText(asset?.name) || translate('角色参考图', 'Profile reference image')

      const sourceKey = `${label}|${assetId}|${sourceUrl.slice(0, 120)}`
      if (seen.has(sourceKey)) continue
      seen.add(sourceKey)
      collected.push({
        label,
        note,
        sourceUrl,
        assetId,
      })
    }
    return collected
  }

  const collectImageReferencesForAiCall = async (contactId, contextMessages = []) => {
    const contextReferences = await collectImageReferencesFromContextMessages(contextMessages)
    const remain = Math.max(0, normalizedMaxReferences - contextReferences.length)
    if (remain <= 0) return contextReferences.slice(0, normalizedMaxReferences)

    const roleReferences = await collectImageReferencesFromRoleBindings(contactId, {
      limit: remain,
      excludeAssetIds: contextReferences
        .map((item) => trimText(item?.assetId))
        .filter(Boolean),
    })

    return [...contextReferences, ...roleReferences].slice(0, normalizedMaxReferences)
  }

  return {
    buildAssistantImageReferenceMeta,
    buildRoleBoundReferenceCandidates,
    collectImageReferencesForAiCall,
    collectImageReferencesFromContextMessages,
    collectImageReferencesFromRoleBindings,
    roleFolderSlotHintLabel,
  }
}
