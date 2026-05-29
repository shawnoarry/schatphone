export const WORLD_CONTEXT_PROMPT_KNOWLEDGE_LIMIT = 8

export const DEFAULT_WORLD_PACK = Object.freeze({
  id: 'default_world',
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

export const resolveWorldviewText = (systemStore) => {
  const user = systemStore?.user || {}
  const fromGlobal = normalizeText(user.globalWorldview)
  if (fromGlobal) return fromGlobal
  return normalizeText(user.worldBook)
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
  contact,
  consumer = 'chat',
  limit = WORLD_CONTEXT_PROMPT_KNOWLEDGE_LIMIT,
} = {}) => {
  const worldview = resolveWorldviewText(systemStore)
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
    activePack: DEFAULT_WORLD_PACK,
    worldview,
    worldviewPreview: normalizePreview(worldview, 120),
    worldviewCharCount: worldview.length,
    hasWorldview: Boolean(worldview),
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

export const resolveActiveWorldOverview = ({ systemStore } = {}) => {
  const worldview = resolveWorldviewText(systemStore)
  const points = listKnowledgePointsFromStore(systemStore)
  const enabledKnowledgeCount = points.filter((point) => point?.enabled !== false).length
  const disabledKnowledgeCount = Math.max(0, points.length - enabledKnowledgeCount)
  const worldProfileTemplates = listWorldProfileTemplatesFromStore(systemStore)

  return {
    activePack: DEFAULT_WORLD_PACK,
    worldview,
    worldviewPreview: normalizePreview(worldview, 120),
    worldviewCharCount: worldview.length,
    hasWorldview: Boolean(worldview),
    knowledgeCount: points.length,
    enabledKnowledgeCount,
    disabledKnowledgeCount,
    profileTemplateCount: worldProfileTemplates.length,
    consumers: WORLD_INTERFACE_CONSUMERS,
    promptConsumerCount: WORLD_INTERFACE_CONSUMERS.filter((item) => item.consumesPromptContext).length,
  }
}

