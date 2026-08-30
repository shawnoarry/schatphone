import {
  computeBookContentFingerprint,
  normalizeWorldBookSourceLinks,
  resolveWorldBookSourceText,
} from './book-text-schema'
import { DEFAULT_WORLD_PACK_ID } from './world-pack-schema'
import {
  PRIMARY_PERSISTED_WORLD_ID,
  normalizeWorldSettingState,
} from './world-setting-state'

export const LEGACY_SINGLE_WORLD_ID = 'legacy_single_world'

const createImmutableSnapshot = (value) => {
  const copies = new WeakMap()

  const clone = (current) => {
    if (current === null || typeof current !== 'object') return current
    if (copies.has(current)) return copies.get(current)

    const copy = Array.isArray(current) ? [] : {}
    copies.set(current, copy)
    Reflect.ownKeys(current).forEach((key) => {
      copy[key] = clone(current[key])
    })
    return Object.freeze(copy)
  }

  return clone(value)
}

export const LEGACY_SINGLE_WORLD_IDENTITY = createImmutableSnapshot({
  worldId: LEGACY_SINGLE_WORLD_ID,
  title: 'Current world',
})

export const PRIMARY_PERSISTED_WORLD_IDENTITY = createImmutableSnapshot({
  worldId: PRIMARY_PERSISTED_WORLD_ID,
  title: 'My world',
})

export const DEFAULT_WORLD_PACK = Object.freeze({
  id: DEFAULT_WORLD_PACK_ID,
  name: 'Default world',
  title: '默认世界',
  state: 'active',
  source: 'worldbook',
})

export const WORLD_INTERFACE_CONSUMERS = createImmutableSnapshot([
  { key: 'chat', label: 'Chat', title: '聊天', consumesPromptContext: true },
  { key: 'contacts', label: 'Contacts', title: '联系人', consumesPromptContext: false },
  { key: 'map', label: 'Map', title: '地图', consumesPromptContext: true },
  { key: 'calendar', label: 'Calendar', title: '日历', consumesPromptContext: true },
  { key: 'runtime', label: 'Event Runtime', title: '事件运行时', consumesPromptContext: true },
])

const normalizeOptionalLimit = (value) => {
  if (value === undefined || value === null || value === '') return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  return Math.max(1, Math.min(24, Math.floor(numeric)))
}

const normalizeText = (value, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const normalizePreview = (value, maxLength = 120) => {
  const normalized = normalizeText(value).replace(/\s+/g, ' ')
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

const normalizeEncyclopediaEntry = (entry = {}) => ({
  ...entry,
  id: normalizeText(entry?.id),
  title: normalizeText(entry?.title, 'Encyclopedia entry'),
  content: normalizeText(entry?.content),
  tags: Array.isArray(entry?.tags) ? entry.tags.filter((tag) => normalizeText(tag)) : [],
  enabled: entry?.enabled !== false,
})

const normalizeKnowledgePoint = normalizeEncyclopediaEntry

const listEncyclopediaEntriesFromStore = (systemStore) => {
  if (typeof systemStore?.listEncyclopediaEntries === 'function') {
    return systemStore.listEncyclopediaEntries()
  }
  if (typeof systemStore?.listKnowledgePoints === 'function') {
    return systemStore.listKnowledgePoints()
  }
  if (Array.isArray(systemStore?.user?.encyclopediaEntries)) return systemStore.user.encyclopediaEntries
  return Array.isArray(systemStore?.user?.knowledgePoints) ? systemStore.user.knowledgePoints : []
}

const listKnowledgePointsFromStore = listEncyclopediaEntriesFromStore

const listCurrentWorldProfileTemplatesFromStore = (systemStore) => {
  const templates = typeof systemStore?.listProfileTemplates === 'function'
    ? systemStore.listProfileTemplates()
    : Array.isArray(systemStore?.user?.profileTemplates)
      ? systemStore.user.profileTemplates
      : []
  return templates.filter(
    (template) =>
      template?.scope === 'world' &&
      template?.enabled !== false,
  )
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

const resolveCurrentWorldIdentity = (systemStore) => {
  const rawState = typeof systemStore?.getWorldSettingState === 'function'
    ? systemStore.getWorldSettingState()
    : systemStore?.user?.worldSetting
  if (!rawState || typeof rawState !== 'object') return LEGACY_SINGLE_WORLD_IDENTITY
  const state = normalizeWorldSettingState(rawState)
  return createImmutableSnapshot({
    worldId: state.identity.worldId,
    title: state.identity.title,
  })
}

const listEnabledWorldPacksFromStore = (systemStore) => {
  if (typeof systemStore?.listEnabledWorldPacks === 'function') {
    const packs = systemStore.listEnabledWorldPacks()
    return Array.isArray(packs)
      ? packs.filter((pack) => pack?.id !== DEFAULT_WORLD_PACK_ID)
      : []
  }
  const active = resolveActiveWorldPack(systemStore)
  return active && active.id !== DEFAULT_WORLD_PACK_ID ? [active] : []
}

const countPackItems = (packs = [], field = '') =>
  packs.reduce((total, pack) => total + (Array.isArray(pack?.[field]) ? pack[field].length : 0), 0)

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
    const promptText = normalizeText(rawContent)
    const hasSnapshot = link.sourceSnapshotUpdatedAt > 0 || typeof link.sourceSnapshotText === 'string'
    const currentSnapshotFingerprint = computeBookContentFingerprint(rawContent)
    const snapshotFingerprintChanged = link.sourceSnapshotFingerprint
      ? link.sourceSnapshotFingerprint !== currentSnapshotFingerprint
      : null
    const snapshotIsPartial =
      Number(link.sourceSnapshotCharCount || 0) > String(link.sourceSnapshotText || '').length
    const changed =
      Boolean(link.sourceFingerprint) &&
      Boolean(asset.contentFingerprint) &&
      link.sourceFingerprint !== asset.contentFingerprint &&
      (snapshotFingerprintChanged === null
        ? !hasSnapshot || snapshotIsPartial || String(link.sourceSnapshotText || '') !== rawContent
        : snapshotFingerprintChanged)

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

  const promptText = resolved
    .filter((item) => !item.missing && item.promptText)
    .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt)
    .map((item) => {
      const label = item.title ? `${item.title}: ` : ''
      return `${label}${item.promptText}`
    })
    .join('\n\n')

  return {
    links,
    activeLinks,
    resolved,
    promptText,
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
  return bookSources.promptText
}

const buildWorldSettingProjection = ({
  identity,
  activePack,
  enabledWorldPacks,
  worldview,
  fallbackText,
  bookSources,
  encyclopediaEntries,
  worldProfileTemplates,
  roleKnowledge = {},
} = {}) => {
  const projectCapabilityPack = (pack) => {
    if (!pack || pack.id === DEFAULT_WORLD_PACK_ID) return null
    const projected = { ...pack }
    delete projected.bookSourceLinkIds
    delete projected.encyclopediaEntryIds
    delete projected.knowledgePointIds
    delete projected.profileTemplateIds
    return projected
  }
  const capabilityActivePack = projectCapabilityPack(activePack)
  const capabilityPacks = enabledWorldPacks.map(projectCapabilityPack).filter(Boolean)
  const appBindings = enabledWorldPacks.flatMap((pack) =>
    Array.isArray(pack?.appBindings) ? pack.appBindings : [],
  )
  const serviceTemplates = enabledWorldPacks.flatMap((pack) =>
    Array.isArray(pack?.serviceAccountTemplates) ? pack.serviceAccountTemplates : [],
  )

  return {
    identity: identity || LEGACY_SINGLE_WORLD_IDENTITY,
    narrative: {
      activeSources: bookSources.resolved,
      promptText: worldview,
      fallbackText,
    },
    encyclopedia: {
      selectedEntries: encyclopediaEntries.filter((entry) => entry.enabled !== false),
      roleBoundEntries: Array.isArray(roleKnowledge.enabledEntries)
        ? roleKnowledge.enabledEntries
        : [],
    },
    profiles: {
      enabledTemplates: worldProfileTemplates.map((template) => {
        const projected = { ...template }
        delete projected.worldId
        return projected
      }),
    },
    capabilities: {
      activePack: capabilityActivePack,
      enabledPacks: capabilityPacks,
      appBindings,
      serviceTemplates,
      terminology: capabilityActivePack?.terminology || {},
      economy: capabilityActivePack?.economy || {},
    },
    diagnostics: {
      missingSourceIds: bookSources.resolved
        .filter((source) => source.missing)
        .map((source) => source.assetId),
      changedSourceIds: bookSources.resolved
        .filter((source) => source.changed)
        .map((source) => source.assetId),
      unresolvedReferenceIds: bookSources.resolved
        .filter((source) => source.missing)
        .map((source) => source.assetId),
    },
  }
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
  limit,
} = {}) => {
  const promptLimit = normalizeOptionalLimit(limit)
  const empty = {
    roleBound: false,
    profileName: '',
    profileId: 0,
    configuredCount: 0,
    enabledEntries: [],
    enabledPoints: [],
    injectedEntries: [],
    injectedPoints: [],
    injectedEntryCount: 0,
    injectedCount: 0,
    disabledCount: 0,
    missingCount: 0,
    overflowCount: 0,
    disabledPointIds: [],
    missingPointIds: [],
  }

  if (!contact || (contact.kind || 'role') !== 'role') return empty

  const profile = resolveRoleProfile(chatStore, contact.profileId)
  if (!profile) {
    return {
      ...empty,
      profileName: normalizeText(contact.name),
    }
  }

  const configuredIds = Array.isArray(profile.encyclopediaEntryIds)
    ? profile.encyclopediaEntryIds.filter((id) => normalizeText(id))
    : Array.isArray(profile.knowledgePointIds)
      ? profile.knowledgePointIds.filter((id) => normalizeText(id))
      : []
  if (configuredIds.length === 0) {
    return {
      ...empty,
      roleBound: true,
      profileName: normalizeText(profile.name, normalizeText(contact.name)),
      profileId: Number.isFinite(Number(profile.id)) ? Number(profile.id) : 0,
    }
  }

  const pointMap = new Map(
    listEncyclopediaEntriesFromStore(systemStore)
      .filter((point) => point && typeof point === 'object' && normalizeText(point.id))
      .map((point) => [normalizeText(point.id), point]),
  )

  const enabledPoints = []
  const disabledPointIds = []
  const missingPointIds = []
  let disabledCount = 0
  let missingCount = 0

  configuredIds.forEach((id) => {
    const point = pointMap.get(id)
    if (!point) {
      missingCount += 1
      missingPointIds.push(id)
      return
    }
    if (point.enabled === false) {
      disabledCount += 1
      disabledPointIds.push(id)
      return
    }
    enabledPoints.push(normalizeKnowledgePoint(point))
  })

  const injectedPoints = promptLimit === null ? enabledPoints : enabledPoints.slice(0, promptLimit)

  return {
    roleBound: true,
    profileName: normalizeText(profile.name, normalizeText(contact.name)),
    profileId: Number.isFinite(Number(profile.id)) ? Number(profile.id) : 0,
    configuredCount: configuredIds.length,
    enabledEntries: enabledPoints,
    enabledPoints,
    injectedEntries: injectedPoints,
    injectedPoints,
    injectedEntryCount: injectedPoints.length,
    injectedCount: injectedPoints.length,
    disabledCount,
    missingCount,
    overflowCount: promptLimit === null ? 0 : Math.max(0, enabledPoints.length - injectedPoints.length),
    disabledPointIds,
    missingPointIds,
  }
}

export const resolveCurrentWorldContext = ({
  systemStore,
  chatStore,
  bookStore,
  contact,
  consumer = 'chat',
  limit,
} = {}) => {
  const bookSources = resolveActiveBookSources({ systemStore, bookStore })
  const identity = resolveCurrentWorldIdentity(systemStore)
  const activePack = resolveActiveWorldPack(systemStore)
  const enabledWorldPacks = listEnabledWorldPacksFromStore(systemStore)
  const worldview = resolveWorldviewText(systemStore, { bookStore })
  const fallbackText = normalizeText(systemStore?.user?.globalWorldview) ||
    normalizeText(systemStore?.user?.worldBook)
  const encyclopediaEntries = listEncyclopediaEntriesFromStore(systemStore).map(
    normalizeEncyclopediaEntry,
  )
  const worldProfileTemplates = listCurrentWorldProfileTemplatesFromStore(systemStore)
  const roleKnowledge = resolveRoleKnowledgeState({
    systemStore,
    chatStore,
    contact,
    limit,
  })
  const consumerConfig =
    WORLD_INTERFACE_CONSUMERS.find((item) => item.key === consumer) ||
    WORLD_INTERFACE_CONSUMERS[0]

  const projection = buildWorldSettingProjection({
    identity,
    activePack,
    enabledWorldPacks,
    worldview,
    fallbackText,
    bookSources,
    encyclopediaEntries,
    worldProfileTemplates,
    roleKnowledge,
  })

  return createImmutableSnapshot({
    consumer: consumerConfig.key,
    consumerLabel: consumerConfig.label,
    consumerTitle: consumerConfig.title,
    activePack,
    enabledWorldPacks,
    enabledWorldPackCount: enabledWorldPacks.length,
    worldPackActivationState: resolveWorldPackActivationState(systemStore, activePack),
    worldPackAppBindingCount: countPackItems(enabledWorldPacks, 'appBindings'),
    worldPackServiceTemplateCount: countPackItems(enabledWorldPacks, 'serviceAccountTemplates'),
    worldPackAppBindings: projection.capabilities.appBindings,
    worldPackServiceAccountTemplates: projection.capabilities.serviceTemplates,
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
    ...projection,
    ...roleKnowledge,
  })
}

export const resolveWorldContextForConsumer = (options = {}) =>
  resolveCurrentWorldContext(options)

export const buildWorldPromptBlock = (worldContext = {}) => {
  const worldview = normalizeText(worldContext.worldview, 'none')
  const injectedPoints = Array.isArray(worldContext.injectedEntries)
    ? worldContext.injectedEntries
    : Array.isArray(worldContext.injectedPoints)
      ? worldContext.injectedPoints
      : []
  const boundSummary =
    injectedPoints.length > 0
      ? injectedPoints.map((point) => formatWorldKnowledgePointForPrompt(point)).join('; ')
      : 'none'

  return [
    `Primary worldview rules: ${worldview}`,
    `Supplemental role-bound encyclopedia entries: ${boundSummary}.`,
  ].join('\n')
}

export const resolveActiveWorldOverview = ({ systemStore, bookStore } = {}) => {
  const bookSources = resolveActiveBookSources({ systemStore, bookStore })
  const identity = resolveCurrentWorldIdentity(systemStore)
  const activePack = resolveActiveWorldPack(systemStore)
  const enabledWorldPacks = listEnabledWorldPacksFromStore(systemStore)
  const worldview = resolveWorldviewText(systemStore, { bookStore })
  const points = listKnowledgePointsFromStore(systemStore).map(normalizeKnowledgePoint)
  const enabledKnowledgeCount = points.filter((point) => point?.enabled !== false).length
  const disabledKnowledgeCount = Math.max(0, points.length - enabledKnowledgeCount)
  const worldProfileTemplates = listCurrentWorldProfileTemplatesFromStore(systemStore)
  const fallbackText = normalizeText(systemStore?.user?.globalWorldview) ||
    normalizeText(systemStore?.user?.worldBook)
  const projection = buildWorldSettingProjection({
    identity,
    activePack,
    enabledWorldPacks,
    worldview,
    fallbackText,
    bookSources,
    encyclopediaEntries: points,
    worldProfileTemplates,
  })

  return createImmutableSnapshot({
    activePack,
    enabledWorldPacks,
    enabledWorldPackCount: enabledWorldPacks.length,
    worldPackActivationState: resolveWorldPackActivationState(systemStore, activePack),
    worldPackAppBindingCount: countPackItems(enabledWorldPacks, 'appBindings'),
    worldPackServiceTemplateCount: countPackItems(enabledWorldPacks, 'serviceAccountTemplates'),
    worldPackAppBindings: projection.capabilities.appBindings,
    worldPackServiceAccountTemplates: projection.capabilities.serviceTemplates,
    worldview,
    worldviewPreview: normalizePreview(worldview, 120),
    worldviewCharCount: worldview.length,
    hasWorldview: Boolean(worldview),
    encyclopediaEntryCount: points.length,
    knowledgeCount: points.length,
    enabledEncyclopediaEntryCount: enabledKnowledgeCount,
    enabledKnowledgeCount,
    disabledEncyclopediaEntryCount: disabledKnowledgeCount,
    disabledKnowledgeCount,
    profileTemplateCount: worldProfileTemplates.length,
    linkedBookSourceCount: bookSources.linkedSourceCount,
    activeBookSourceCount: bookSources.activeSourceCount,
    missingBookSourceCount: bookSources.missingSourceCount,
    changedBookSourceCount: bookSources.changedSourceCount,
    bookSources: bookSources.resolved,
    consumers: WORLD_INTERFACE_CONSUMERS,
    promptConsumerCount: WORLD_INTERFACE_CONSUMERS.filter((item) => item.consumesPromptContext).length,
    ...projection,
  })
}
