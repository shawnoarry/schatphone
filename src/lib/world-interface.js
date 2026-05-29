import {
  normalizeWorldBookSourceLinks,
  resolveWorldBookSourceText,
} from './book-text-schema'
import { DEFAULT_WORLD_PACK_ID } from './world-pack-schema'

export const WORLD_CONTEXT_PROMPT_KNOWLEDGE_LIMIT = 8
export const WORLD_CONTEXT_BOOK_SOURCE_CHAR_LIMIT = 2400
export const WORLD_CONTEXT_BOOK_SOURCE_ITEM_CHAR_LIMIT = 1200

export const DEFAULT_WORLD_PACK = Object.freeze({
  id: DEFAULT_WORLD_PACK_ID,
  name: 'Default world',
  title: '默认世界',
  state: 'active',
  source: 'worldbook',
})

export const WORLD_INTERFACE_CONSUMERS = Object.freeze([
  { key: 'chat', label: 'Chat', title: '聊天', consumesPromptContext: true },
  { key: 'contacts', label: 'Contacts', title: '联系人', consumesPromptContext: false },
  { key: 'map', label: 'Map', title: '地图', consumesPromptContext: true },
  { key: 'calendar', label: 'Calendar', title: '日历', consumesPromptContext: true },
  { key: 'runtime', label: 'Event Runtime', title: '事件运行时', consumesPromptContext: true },
])

const clampLimit = (value, fallback = WORLD_CONTEXT_PROMPT_KNOWLEDGE_LIMIT) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(1, Math.min(24, Math.floor(numeric)))
}

const normalizeText = (value, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const normalizePreview = (value, maxLength = 120) => {
  const normalized = normalizeText(value).replace(/\s+/g, ' ')
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

const clampText = (value, maxLength = WORLD_CONTEXT_BOOK_SOURCE_ITEM_CHAR_LIMIT) => {
  const normalized = normalizeText(value)
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized
}

const normalizeKnowledgePoint = (point = {}) => ({
  ...point,
  id: normalizeText(point?.id),
  title: normalizeText(point?.title, 'Knowledge'),
  content: normalizeText(point?.content),
  tags: Array.isArray(point?.tags) ? point.tags.filter((tag) => normalizeText(tag)) : [],
  enabled: point?.enabled !== false,
})

const listKnowledgePointsFromStore = (systemStore) => {
  if (typeof systemStore?.listKnowledgePoints === 'function') {
    return systemStore.listKnowledgePoints()
  }
  return Array.isArray(systemStore?.user?.knowledgePoints) ? systemStore.user.knowledgePoints : []
}

const listWorldProfileTemplatesFromStore = (systemStore, worldId = DEFAULT_WORLD_PACK.id) => {
  if (typeof systemStore?.listWorldProfileTemplates === 'function') {
    return systemStore.listWorldProfileTemplates(worldId)
  }
  const templates = Array.isArray(systemStore?.user?.profileTemplates)
    ? systemStore.user.profileTemplates
    : []
  return templates.filter((template) => template?.scope === 'world' && template?.worldId === worldId)
}

const listWorldBookSourceLinksFromStore = (systemStore) => {
  if (typeof systemStore?.listWorldBookSourceLinks === 'function') {
    return systemStore.listWorldBookSourceLinks()
  }
  return normalizeWorldBookSourceLinks(systemStore?.user?.worldBookSourceLinks)
}

const resolveActiveWorldPack = (systemStore) => {
  if (typeof systemStore?.getActiveWorldPack === 'function') {
    return systemStore.getActiveWorldPack() || DEFAULT_WORLD_PACK
  }
  const activePackId =
    typeof systemStore?.user?.activeWorldPackId === 'string' && systemStore.user.activeWorldPackId.trim()
      ? systemStore.user.activeWorldPackId.trim()
      : DEFAULT_WORLD_PACK_ID
  const packs = Array.isArray(systemStore?.user?.worldPacks) ? systemStore.user.worldPacks : []
  return packs.find((pack) => pack?.id === activePackId) || DEFAULT_WORLD_PACK
}

const resolveWorldPackActivationState = (systemStore, activePack = DEFAULT_WORLD_PACK) => {
  const activation = systemStore?.user?.worldPackActivation
  if (activation && typeof activation === 'object' && activation.activePackId === activePack.id) {
    return activation.state || activePack.state || 'active'
  }
  return activePack.state || 'active'
}

const resolveBookAsset = (bookStore, assetId = '') => {
  const id = normalizeText(assetId)
  if (!id) return null
  if (typeof bookStore?.findAssetById === 'function') return bookStore.findAssetById(id)
  return Array.isArray(bookStore?.assets)
    ? bookStore.assets.find((asset) => asset?.id === id) || null
    : null
}

const resolveActiveBookSources = ({ systemStore, bookStore } = {}) => {
  const links = listWorldBookSourceLinksFromStore(systemStore)
  const activeLinks = links.filter((link) => link.enabled !== false)
  const resolved = activeLinks.map((link) => {
    const asset = resolveBookAsset(bookStore, link.assetId)
    if (!asset) {
      return {
        ...link,
        title: link.titleOverride || link.assetId,
        missing: true,
        changed: false,
        warning: link.warning || 'missing_source',
        charCount: 0,
        preview: '',
        promptText: '',
      }
    }

    const rawContent = resolveWorldBookSourceText(asset, link.sectionIds)
    const promptText = clampText(rawContent)
    const hasSnapshot = link.sourceSnapshotUpdatedAt > 0 || typeof link.sourceSnapshotText === 'string'
    const snapshotIsPartial =
      Number(link.sourceSnapshotCharCount || 0) > String(link.sourceSnapshotText || '').length
    const changed =
      Boolean(link.sourceFingerprint) &&
      Boolean(asset.contentFingerprint) &&
      link.sourceFingerprint !== asset.contentFingerprint &&
      (!hasSnapshot || snapshotIsPartial || String(link.sourceSnapshotText || '') !== rawContent)

    return {
      ...link,
      title: link.titleOverride || asset.title,
      assetStatus: asset.status,
      assetVersion: asset.version,
      missing: false,
      changed,
      warning: link.warning || (changed ? 'changed_source' : ''),
      charCount: rawContent.length,
      preview: normalizePreview(rawContent, 140),
      promptText,
    }
  })

  const promptChunks = []
  let remaining = WORLD_CONTEXT_BOOK_SOURCE_CHAR_LIMIT
  resolved
    .filter((item) => !item.missing && item.promptText)
    .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt)
    .forEach((item) => {
      if (remaining <= 0) return
      const label = item.title ? `${item.title}: ` : ''
      const chunk = clampText(`${label}${item.promptText}`, remaining)
      if (!chunk) return
      promptChunks.push(chunk)
      remaining -= chunk.length
    })

  return {
    links,
    activeLinks,
    resolved,
    promptText: promptChunks.join('\n\n'),
    linkedSourceCount: links.length,
    activeSourceCount: activeLinks.length,
    resolvedSourceCount: resolved.filter((item) => !item.missing && item.promptText).length,
    missingSourceCount: resolved.filter((item) => item.missing).length,
    changedSourceCount: resolved.filter((item) => item.changed).length,
  }
}

const resolveRoleProfile = (chatStore, profileId) => {
  const numericId = Number(profileId)
  if (!Number.isFinite(numericId) || numericId <= 0) return null
  if (typeof chatStore?.getRoleProfileById === 'function') {
    return chatStore.getRoleProfileById(numericId)
  }
  return Array.isArray(chatStore?.roleProfiles)
    ? chatStore.roleProfiles.find((profile) => Number(profile?.id) === numericId) || null
    : null
}

export const resolveWorldviewText = (systemStore, options = {}) => {
  const user = systemStore?.user || {}
  const fromGlobal = normalizeText(user.globalWorldview)
  const fallback = fromGlobal || normalizeText(user.worldBook)
  const bookSources = resolveActiveBookSources({
    systemStore,
    bookStore: options.bookStore,
  })
  if (!bookSources.promptText) return fallback
  return [bookSources.promptText, fallback].filter(Boolean).join('\n\n')
}

export const formatWorldKnowledgePointForPrompt = (point = {}) => {
  const normalized = normalizeKnowledgePoint(point)
  const tags = normalized.tags.length > 0 ? ` [tags: ${normalized.tags.join(', ')}]` : ''
  return `${normalized.title}: ${normalized.content || normalized.title}${tags}`
}

export const resolveRoleKnowledgeState = ({
  systemStore,
  chatStore,
  contact,
  limit = WORLD_CONTEXT_PROMPT_KNOWLEDGE_LIMIT,
} = {}) => {
  const promptLimit = clampLimit(limit)
  const empty = {
    roleBound: false,
    profileName: '',
    configuredCount: 0,
    enabledPoints: [],
    injectedPoints: [],
    injectedCount: 0,
    disabledCount: 0,
    missingCount: 0,
    overflowCount: 0,
  }

  if (!contact || (contact.kind || 'role') !== 'role') return empty

  const profile = resolveRoleProfile(chatStore, contact.profileId)
  if (!profile) {
    return {
      ...empty,
      profileName: normalizeText(contact.name),
    }
  }

  const configuredIds = Array.isArray(profile.knowledgePointIds)
    ? profile.knowledgePointIds.filter((id) => normalizeText(id))
    : []
  if (configuredIds.length === 0) {
    return {
      ...empty,
      roleBound: true,
      profileName: normalizeText(profile.name, normalizeText(contact.name)),
    }
  }

  const pointMap = new Map(
    listKnowledgePointsFromStore(systemStore)
      .filter((point) => point && typeof point === 'object' && normalizeText(point.id))
      .map((point) => [normalizeText(point.id), point]),
  )

  const enabledPoints = []
  let disabledCount = 0
  let missingCount = 0

  configuredIds.forEach((id) => {
    const point = pointMap.get(id)
    if (!point) {
      missingCount += 1
      return
    }
    if (point.enabled === false) {
      disabledCount += 1
      return
    }
    enabledPoints.push(normalizeKnowledgePoint(point))
  })

  const injectedPoints = enabledPoints.slice(0, promptLimit)

  return {
    roleBound: true,
    profileName: normalizeText(profile.name, normalizeText(contact.name)),
    configuredCount: configuredIds.length,
    enabledPoints,
    injectedPoints,
    injectedCount: injectedPoints.length,
    disabledCount,
    missingCount,
    overflowCount: Math.max(0, enabledPoints.length - injectedPoints.length),
  }
}

export const resolveWorldContextForConsumer = ({
  systemStore,
  chatStore,
  bookStore,
  contact,
  consumer = 'chat',
  limit = WORLD_CONTEXT_PROMPT_KNOWLEDGE_LIMIT,
} = {}) => {
  const bookSources = resolveActiveBookSources({ systemStore, bookStore })
  const activePack = resolveActiveWorldPack(systemStore)
  const worldview = resolveWorldviewText(systemStore, { bookStore })
  const roleKnowledge = resolveRoleKnowledgeState({
    systemStore,
    chatStore,
    contact,
    limit,
  })
  const consumerConfig =
    WORLD_INTERFACE_CONSUMERS.find((item) => item.key === consumer) ||
    WORLD_INTERFACE_CONSUMERS[0]

  return {
    consumer: consumerConfig.key,
    consumerLabel: consumerConfig.label,
    consumerTitle: consumerConfig.title,
    activePack,
    worldPackActivationState: resolveWorldPackActivationState(systemStore, activePack),
    worldPackAppBindingCount: Array.isArray(activePack.appBindings) ? activePack.appBindings.length : 0,
    worldPackServiceTemplateCount: Array.isArray(activePack.serviceAccountTemplates)
      ? activePack.serviceAccountTemplates.length
      : 0,
    worldPackAppBindings: Array.isArray(activePack.appBindings) ? activePack.appBindings : [],
    worldPackServiceAccountTemplates: Array.isArray(activePack.serviceAccountTemplates)
      ? activePack.serviceAccountTemplates
      : [],
    worldview,
    worldviewPreview: normalizePreview(worldview, 120),
    worldviewCharCount: worldview.length,
    hasWorldview: Boolean(worldview),
    bookSources: bookSources.resolved,
    linkedBookSourceCount: bookSources.linkedSourceCount,
    activeBookSourceCount: bookSources.activeSourceCount,
    missingBookSourceCount: bookSources.missingSourceCount,
    changedBookSourceCount: bookSources.changedSourceCount,
    consumers: WORLD_INTERFACE_CONSUMERS,
    ...roleKnowledge,
  }
}

export const buildWorldPromptBlock = (worldContext = {}) => {
  const worldview = normalizeText(worldContext.worldview, 'none')
  const injectedPoints = Array.isArray(worldContext.injectedPoints)
    ? worldContext.injectedPoints
    : []
  const boundSummary =
    injectedPoints.length > 0
      ? injectedPoints.map((point) => formatWorldKnowledgePointForPrompt(point)).join('; ')
      : 'none'

  return [
    `Primary worldview rules: ${worldview}`,
    `Supplemental role-bound knowledge points: ${boundSummary}.`,
  ].join('\n')
}

export const resolveActiveWorldOverview = ({ systemStore, bookStore } = {}) => {
  const bookSources = resolveActiveBookSources({ systemStore, bookStore })
  const activePack = resolveActiveWorldPack(systemStore)
  const worldview = resolveWorldviewText(systemStore, { bookStore })
  const points = listKnowledgePointsFromStore(systemStore)
  const enabledKnowledgeCount = points.filter((point) => point?.enabled !== false).length
  const disabledKnowledgeCount = Math.max(0, points.length - enabledKnowledgeCount)
  const worldProfileTemplates = listWorldProfileTemplatesFromStore(systemStore, activePack.id)

  return {
    activePack,
    worldPackActivationState: resolveWorldPackActivationState(systemStore, activePack),
    worldPackAppBindingCount: Array.isArray(activePack.appBindings) ? activePack.appBindings.length : 0,
    worldPackServiceTemplateCount: Array.isArray(activePack.serviceAccountTemplates)
      ? activePack.serviceAccountTemplates.length
      : 0,
    worldPackAppBindings: Array.isArray(activePack.appBindings) ? activePack.appBindings : [],
    worldPackServiceAccountTemplates: Array.isArray(activePack.serviceAccountTemplates)
      ? activePack.serviceAccountTemplates
      : [],
    worldview,
    worldviewPreview: normalizePreview(worldview, 120),
    worldviewCharCount: worldview.length,
    hasWorldview: Boolean(worldview),
    knowledgeCount: points.length,
    enabledKnowledgeCount,
    disabledKnowledgeCount,
    profileTemplateCount: worldProfileTemplates.length,
    linkedBookSourceCount: bookSources.linkedSourceCount,
    activeBookSourceCount: bookSources.activeSourceCount,
    missingBookSourceCount: bookSources.missingSourceCount,
    changedBookSourceCount: bookSources.changedSourceCount,
    bookSources: bookSources.resolved,
    consumers: WORLD_INTERFACE_CONSUMERS,
    promptConsumerCount: WORLD_INTERFACE_CONSUMERS.filter((item) => item.consumesPromptContext).length,
  }
}
