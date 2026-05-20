import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'

export const RELATIONSHIP_RUNTIME_STORAGE_KEY = 'store:relationship-runtime'
export const RELATIONSHIP_RUNTIME_STORAGE_VERSION = 1

const RELATIONSHIP_ENTITY_LIMIT = 300
const RELATIONSHIP_EVENT_LIMIT = 500
const METRIC_KEYS = ['affinity', 'trust', 'intimacy', 'tension', 'dependency']
export const RELATIONSHIP_EVENT_STATUS = Object.freeze({
  APPLIED: 'applied',
  PENDING_CONFIRMATION: 'pending_confirmation',
  DISMISSED: 'dismissed',
  SKIPPED_DISABLED: 'skipped_disabled',
})
export const RELATIONSHIP_MEMORY_REVIEW_STATES = Object.freeze({
  ACTIVE: 'active',
  PINNED: 'pinned',
  ARCHIVED: 'archived',
})
const DEFAULT_RELATIONSHIP_METRICS = Object.freeze({
  affinity: 50,
  trust: 50,
  intimacy: 20,
  tension: 10,
  dependency: 10,
})
const MAX_MEMORY_REVIEW_NOTE_LENGTH = 400

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const clamp = (value, min = 0, max = 100) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return min
  return Math.min(max, Math.max(min, num))
}

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeTag = (value) => normalizeText(value, '', 40).toLowerCase()

const normalizeMetric = (value, fallback = 0) => clamp(toInt(value, fallback), 0, 100)

const normalizeMetricDeltas = (rawDeltas = {}) => {
  const source = rawDeltas && typeof rawDeltas === 'object' ? rawDeltas : {}
  return METRIC_KEYS.reduce((acc, key) => {
    const delta = Number(source[key])
    if (Number.isFinite(delta) && delta !== 0) {
      acc[key] = clamp(Math.round(delta), -30, 30)
    }
    return acc
  }, {})
}

const normalizeMemoryKey = (value) => normalizeText(value, '', 160).toLowerCase()
const normalizeMemoryReviewStatus = (value) => {
  const status = normalizeText(value, '', 40)
  return Object.values(RELATIONSHIP_MEMORY_REVIEW_STATES).includes(status)
    ? status
    : RELATIONSHIP_MEMORY_REVIEW_STATES.ACTIVE
}

const createRelationshipEventId = () =>
  `relationship_event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeWorldContext = (rawContext = {}) => {
  const source = rawContext && typeof rawContext === 'object' ? rawContext : {}
  const tags = Array.isArray(source.tags)
    ? [...new Set(source.tags.map(normalizeTag).filter(Boolean))].slice(0, 12)
    : []
  return {
    worldContextId: normalizeText(source.worldContextId, '', 80),
    eventPackId: normalizeText(source.eventPackId, '', 80),
    variantId: normalizeText(source.variantId, '', 80),
    tags,
  }
}

export const buildRelationshipEntityKey = (rawTarget = {}) => {
  const target = rawTarget && typeof rawTarget === 'object' ? rawTarget : {}
  const explicitKey = normalizeText(target.entityKey, '', 120)
  if (explicitKey) return explicitKey

  const profileId = toInt(target.profileId ?? target.roleProfileId, 0)
  if (profileId > 0) return `role:${profileId}`

  const roleProfileId = target.sourceType === 'roleProfile' ? toInt(target.id, 0) : 0
  if (roleProfileId > 0) return `role:${roleProfileId}`

  const contactId = toInt(target.contactId ?? (target.sourceType === 'contact' ? target.id : 0), 0)
  if (contactId > 0) return `contact:${contactId}`

  const name = normalizeText(target.name || target.displayName, '', 100).toLowerCase()
  return name ? `name:${name}` : ''
}

const normalizeTargetMeta = (rawTarget = {}) => {
  const target = rawTarget && typeof rawTarget === 'object' ? rawTarget : {}
  const entityKey = buildRelationshipEntityKey(target)
  if (!entityKey) return null

  const explicitRoleProfileId = entityKey.startsWith('role:') ? toInt(entityKey.slice(5), 0) : 0
  const explicitContactId = entityKey.startsWith('contact:') ? toInt(entityKey.slice(8), 0) : 0
  const profileId = toInt(target.profileId ?? target.roleProfileId, 0) || explicitRoleProfileId
  const sourceProfileId = target.sourceType === 'roleProfile' ? toInt(target.id, 0) : 0
  const contactId = toInt(target.contactId ?? (target.sourceType === 'contact' ? target.id : 0), 0) || explicitContactId
  const kind = normalizeText(target.kind, entityKey.startsWith('role:') ? 'role' : 'contact', 40)

  return {
    entityKey,
    profileId: profileId > 0 ? profileId : sourceProfileId,
    contactId,
    kind,
    displayName: normalizeText(target.name || target.displayName, '', 100),
  }
}

const deriveRelationshipStage = (metrics = {}) => {
  const affinity = normalizeMetric(metrics.affinity, DEFAULT_RELATIONSHIP_METRICS.affinity)
  const trust = normalizeMetric(metrics.trust, DEFAULT_RELATIONSHIP_METRICS.trust)
  const intimacy = normalizeMetric(metrics.intimacy, DEFAULT_RELATIONSHIP_METRICS.intimacy)
  const tension = normalizeMetric(metrics.tension, DEFAULT_RELATIONSHIP_METRICS.tension)

  if (tension >= 72) return 'conflict'
  if (affinity <= 22 || trust <= 22) return 'distant'
  if (affinity >= 86 && trust >= 72 && intimacy >= 78) return 'intimate'
  if (affinity >= 72 && trust >= 62 && intimacy >= 52) return 'close'
  if (affinity >= 56 && trust >= 46) return 'friend'
  if (affinity >= 38) return 'acquaintance'
  return 'stranger'
}

const normalizeMilestones = (rawMilestones = []) => {
  if (!Array.isArray(rawMilestones)) return []
  const seen = new Set()
  return rawMilestones
    .map((item, index) => {
      const source = item && typeof item === 'object' ? item : { label: item }
      const label = normalizeText(source.label || source.title || source.name, '', 100)
      if (!label) return null
      const key = label.toLowerCase()
      if (seen.has(key)) return null
      seen.add(key)
      const createdAt = Math.max(0, toInt(source.createdAt, Date.now() - index))
      return {
        id: normalizeText(source.id, `milestone_${createdAt}_${index}`, 100),
        label,
        sourceEventId: normalizeText(source.sourceEventId, '', 120),
        createdAt,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 40)
}

const normalizeGrowthTraits = (rawTraits = []) => {
  if (!Array.isArray(rawTraits)) return []
  return [...new Set(rawTraits.map(normalizeTag).filter(Boolean))].slice(0, 40)
}

const createDefaultEntity = (meta = {}) => {
  const now = Date.now()
  const metrics = { ...DEFAULT_RELATIONSHIP_METRICS }
  return {
    entityKey: meta.entityKey || '',
    profileId: toInt(meta.profileId, 0),
    contactId: toInt(meta.contactId, 0),
    kind: normalizeText(meta.kind, 'role', 40),
    displayName: normalizeText(meta.displayName, '', 100),
    metrics,
    relationshipStage: deriveRelationshipStage(metrics),
    milestones: [],
    growthTraits: [],
    createdAt: now,
    updatedAt: now,
  }
}

const normalizeEntity = (rawEntity = {}, index = 0) => {
  const source = rawEntity && typeof rawEntity === 'object' ? rawEntity : {}
  const meta = normalizeTargetMeta(source)
  if (!meta) return null

  const metrics = METRIC_KEYS.reduce((acc, key) => {
    acc[key] = normalizeMetric(source.metrics?.[key] ?? source[key], DEFAULT_RELATIONSHIP_METRICS[key])
    return acc
  }, {})
  const createdAt = Math.max(0, toInt(source.createdAt, Date.now() - index))
  const relationshipStage =
    normalizeText(source.relationshipStage, '', 40) || deriveRelationshipStage(metrics)

  return {
    entityKey: meta.entityKey,
    profileId: meta.profileId,
    contactId: meta.contactId,
    kind: meta.kind,
    displayName: meta.displayName,
    metrics,
    relationshipStage,
    milestones: normalizeMilestones(source.milestones),
    growthTraits: normalizeGrowthTraits(source.growthTraits),
    createdAt,
    updatedAt: Math.max(createdAt, toInt(source.updatedAt, createdAt)),
  }
}

const normalizeRelationshipEvent = (rawEvent = {}, index = 0) => {
  const source = rawEvent && typeof rawEvent === 'object' ? rawEvent : {}
  const target = source.target && typeof source.target === 'object' ? source.target : source
  const meta = normalizeTargetMeta({
    ...target,
    entityKey: source.entityKey || target.entityKey,
  })
  if (!meta) return null

  const createdAt = Math.max(0, toInt(source.createdAt, Date.now() - index))
  const status = normalizeText(source.status, '', 40)
  const normalizedStatus = Object.values(RELATIONSHIP_EVENT_STATUS).includes(status)
    ? status
    : source.requiresConfirmation === true
      ? RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION
      : RELATIONSHIP_EVENT_STATUS.APPLIED

  return {
    id: normalizeText(source.id, `relationship_event_legacy_${createdAt}_${index}`, 120),
    entityKey: meta.entityKey,
    memoryKey: normalizeMemoryKey(source.memoryKey),
    memoryRole: normalizeText(source.memoryRole, '', 20),
    forceSupportingMemory: source.forceSupportingMemory === true,
    targetLabel: normalizeText(source.targetLabel || meta.displayName, '', 100),
    sourceModule: normalizeText(source.sourceModule, 'relationship_runtime', 60),
    sourceId: normalizeText(source.sourceId, '', 140),
    factType: normalizeText(source.factType || source.type, 'relationship_fact', 80),
    summary: normalizeText(source.summary || source.note || source.title, '', 220),
    intensity: clamp(toInt(source.intensity, 1), 1, 5),
    metricDeltas: normalizeMetricDeltas(source.metricDeltas),
    milestone: normalizeText(source.milestone, '', 100),
    growthTraits: normalizeGrowthTraits(source.growthTraits),
    requiresConfirmation: source.requiresConfirmation === true,
    status: normalizedStatus,
    effectApplied: source.effectApplied !== false,
    worldContext: normalizeWorldContext(source.worldContext),
    createdAt,
    appliedAt: Math.max(0, toInt(source.appliedAt, 0)),
    dismissedAt: Math.max(0, toInt(source.dismissedAt, 0)),
  }
}

const createDefaultSettings = () => ({
  enabled: true,
  autoApplyLowImpact: true,
  requireConfirmationForMajorEffects: true,
})

const normalizeSettings = (rawSettings = {}) => {
  const source = rawSettings && typeof rawSettings === 'object' ? rawSettings : {}
  return {
    enabled: source.enabled !== false,
    autoApplyLowImpact: source.autoApplyLowImpact !== false,
    requireConfirmationForMajorEffects: source.requireConfirmationForMajorEffects !== false,
  }
}

const isMajorRelationshipEvent = (event) => {
  if (!event) return false
  if (event.requiresConfirmation) return true
  if (event.milestone && event.intensity >= 4) return true
  return Object.values(event.metricDeltas || {}).some((delta) => Math.abs(Number(delta) || 0) >= 16)
}

const summarizeEventsForPrompt = (items = []) => {
  if (!items.length) return 'none'
  return items
    .slice(0, 3)
    .map((event) => {
      const summary = event.summary || event.factType || 'relationship fact'
      return `${event.sourceModule}:${event.factType} - ${summary}`
    })
    .join('; ')
}

const buildDefaultMemoryAggregate = (memoryKey, entityKey = '') => ({
  memoryKey,
  entityKey,
  sourceModules: [],
  sourceIds: [],
  factTypes: [],
  growthTraits: [],
  milestones: [],
  supportingCount: 0,
  primarySourceModule: '',
  primaryFactType: '',
  primarySummary: '',
  primaryCreatedAt: 0,
  displaySummary: '',
  latestSummary: '',
  latestCreatedAt: 0,
})

const buildMemoryAggregateMapKey = (entityKey, memoryKey) => {
  const normalizedEntityKey = normalizeText(entityKey, '', 120)
  const normalizedMemoryKey = normalizeMemoryKey(memoryKey)
  if (!normalizedEntityKey || !normalizedMemoryKey) return ''
  return `${normalizedEntityKey}::${normalizedMemoryKey}`
}

const createDefaultMemoryReviewEntry = (entityKey, memoryKey) => {
  const now = Date.now()
  return {
    entityKey: normalizeText(entityKey, '', 120),
    memoryKey: normalizeMemoryKey(memoryKey),
    status: RELATIONSHIP_MEMORY_REVIEW_STATES.ACTIVE,
    note: '',
    createdAt: now,
    updatedAt: now,
  }
}

const getMemoryReviewPriority = (status) => {
  if (status === RELATIONSHIP_MEMORY_REVIEW_STATES.PINNED) return 0
  if (status === RELATIONSHIP_MEMORY_REVIEW_STATES.ACTIVE) return 1
  if (status === RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED) return 2
  return 3
}

const compareMemorySummaryEntries = (left = {}, right = {}, options = {}) => {
  const sortMode = normalizeText(options.sortMode, 'recent', 20)
  const reviewDelta = getMemoryReviewPriority(left.reviewStatus) - getMemoryReviewPriority(right.reviewStatus)
  if (reviewDelta !== 0) return reviewDelta
  if (sortMode === 'supporting') {
    const supportingDelta = (Number(right.supportingCount) || 0) - (Number(left.supportingCount) || 0)
    if (supportingDelta !== 0) return supportingDelta
  }
  return (Number(right.latestCreatedAt) || 0) - (Number(left.latestCreatedAt) || 0)
}

const compareRelationshipEventsByCreatedAtDesc = (left = {}, right = {}) =>
  (Number(right.createdAt) || 0) - (Number(left.createdAt) || 0)

const shouldIncludeArchivedMemories = (options = {}) => options.includeArchivedMemories === true

const normalizeMemoryReviewEntry = (rawEntry = {}, index = 0) => {
  const source = rawEntry && typeof rawEntry === 'object' ? rawEntry : {}
  const entityKey = normalizeText(source.entityKey, '', 120)
  const memoryKey = normalizeMemoryKey(source.memoryKey)
  if (!entityKey || !memoryKey) return null
  const createdAt = Math.max(0, toInt(source.createdAt, Date.now() - index))
  return {
    entityKey,
    memoryKey,
    status: normalizeMemoryReviewStatus(source.status),
    note: normalizeText(source.note, '', MAX_MEMORY_REVIEW_NOTE_LENGTH),
    createdAt,
    updatedAt: Math.max(createdAt, toInt(source.updatedAt, createdAt)),
  }
}

const normalizeMemoryReviewEntries = (rawEntries = []) => {
  if (!Array.isArray(rawEntries)) return []
  const seen = new Set()
  return rawEntries
    .map((entry, index) => normalizeMemoryReviewEntry(entry, index))
    .filter(Boolean)
    .filter((entry) => {
      const key = buildMemoryAggregateMapKey(entry.entityKey, entry.memoryKey)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

const cloneRelationshipEvent = (event) => ({
  ...event,
  metricDeltas: { ...event.metricDeltas },
  growthTraits: [...event.growthTraits],
  worldContext: {
    ...event.worldContext,
    tags: Array.isArray(event.worldContext?.tags) ? [...event.worldContext.tags] : [],
  },
})

const buildSourceRefsFromEvents = (items = []) => {
  const seen = new Set()
  return items
    .map((event) => ({
      sourceModule: normalizeText(event?.sourceModule, '', 60),
      sourceId: normalizeText(event?.sourceId, '', 140),
    }))
    .filter((ref) => ref.sourceModule && ref.sourceId)
    .filter((ref) => {
      const key = `${ref.sourceModule}:${ref.sourceId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) =>
      `${left.sourceModule}:${left.sourceId}`.localeCompare(`${right.sourceModule}:${right.sourceId}`),
    )
}

const summarizeSourceModules = (items = []) =>
  items.reduce((acc, event) => {
    const moduleKey = normalizeText(event?.sourceModule, 'relationship_runtime', 60)
    acc[moduleKey] = (acc[moduleKey] || 0) + 1
    return acc
  }, {})

export const useRelationshipRuntimeStore = defineStore('relationshipRuntime', () => {
  const settings = ref(createDefaultSettings())
  const entities = ref([])
  const events = ref([])
  const memoryReviews = ref([])
  const hasFinishedStorageHydration = ref(false)

  const entityMap = computed(() => {
    const map = new Map()
    entities.value.forEach((entity) => {
      map.set(entity.entityKey, entity)
    })
    return map
  })
  const entityCount = computed(() => entities.value.length)
  const pendingEventCount = computed(
    () => events.value.filter((event) => event.status === RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION).length,
  )
  const memoryAggregateMap = computed(() => {
    const map = new Map()
    events.value.forEach((event) => {
      if (event.status !== RELATIONSHIP_EVENT_STATUS.APPLIED) return
      if (!event.memoryKey) return
      const aggregateKey = buildMemoryAggregateMapKey(event.entityKey, event.memoryKey)
      if (!aggregateKey) return
      const existing = map.get(aggregateKey) || buildDefaultMemoryAggregate(event.memoryKey, event.entityKey)
      existing.entityKey = existing.entityKey || event.entityKey
      existing.supportingCount += 1
      if (event.sourceModule && !existing.sourceModules.includes(event.sourceModule)) {
        existing.sourceModules.push(event.sourceModule)
      }
      if (event.sourceId && !existing.sourceIds.includes(event.sourceId)) {
        existing.sourceIds.push(event.sourceId)
      }
      if (event.factType && !existing.factTypes.includes(event.factType)) {
        existing.factTypes.push(event.factType)
      }
      event.growthTraits.forEach((trait) => {
        if (trait && !existing.growthTraits.includes(trait)) {
          existing.growthTraits.push(trait)
        }
      })
      if (event.milestone && !existing.milestones.includes(event.milestone)) {
        existing.milestones.push(event.milestone)
      }
      if (event.createdAt >= existing.latestCreatedAt) {
        existing.latestCreatedAt = event.createdAt
        existing.latestSummary = event.summary || existing.latestSummary
      }
      if (!existing.primarySourceModule && event.effectApplied !== false) {
        existing.primarySourceModule = event.sourceModule
      }
      if (!existing.primaryFactType && event.effectApplied !== false) {
        existing.primaryFactType = event.factType
      }
      if (event.effectApplied !== false && event.createdAt >= existing.primaryCreatedAt) {
        existing.primaryCreatedAt = event.createdAt
        existing.primarySummary = event.summary || existing.primarySummary
      }
      existing.displaySummary = existing.primarySummary || existing.latestSummary || existing.displaySummary
      map.set(aggregateKey, existing)
    })
    return map
  })
  const memoryReviewMap = computed(() => {
    const map = new Map()
    normalizeMemoryReviewEntries(memoryReviews.value).forEach((entry) => {
      map.set(buildMemoryAggregateMapKey(entry.entityKey, entry.memoryKey), entry)
    })
    return map
  })

  const pruneMemoryReviews = () => {
    const validKeys = new Set(memoryAggregateMap.value.keys())
    const current = normalizeMemoryReviewEntries(memoryReviews.value)
    const next = current.filter((entry) =>
      validKeys.has(buildMemoryAggregateMapKey(entry.entityKey, entry.memoryKey)),
    )
    if (next.length !== current.length) {
      memoryReviews.value = next
    }
  }

  const findEntity = (target = {}) => {
    const key = buildRelationshipEntityKey(target)
    return key ? entityMap.value.get(key) || null : null
  }

  const findEventBySource = (sourceModule, sourceId) => {
    const moduleKey = normalizeText(sourceModule, '', 60)
    const id = normalizeText(sourceId, '', 140)
    if (!moduleKey || !id) return null
    const event = events.value.find((item) => item.sourceModule === moduleKey && item.sourceId === id)
    return event ? { ...event, metricDeltas: { ...event.metricDeltas } } : null
  }

  const hasAppliedEffectForMemory = (event) => {
    if (!event?.memoryKey || !event?.entityKey) return false
    return events.value.some(
      (item) =>
        item.entityKey === event.entityKey &&
        item.memoryKey === event.memoryKey &&
        item.status === RELATIONSHIP_EVENT_STATUS.APPLIED &&
        item.effectApplied !== false,
    )
  }

  const listMemoryAggregatesForTarget = (target = {}, limit = 5, options = {}) => {
    const key = buildRelationshipEntityKey(target)
    if (!key) return []
    return [...memoryAggregateMap.value.values()]
      .filter((item) => item.entityKey === key)
      .map((item) => ({
        ...(memoryReviewMap.value.get(buildMemoryAggregateMapKey(item.entityKey, item.memoryKey)) || {}),
        memoryKey: item.memoryKey,
        entityKey: item.entityKey,
        sourceModules: [...item.sourceModules],
        sourceIds: [...item.sourceIds],
        factTypes: [...item.factTypes],
        growthTraits: [...item.growthTraits],
        milestones: [...item.milestones],
        supportingCount: item.supportingCount,
        primarySourceModule: item.primarySourceModule || '',
        primaryFactType: item.primaryFactType || '',
        primarySummary: item.primarySummary || '',
        displaySummary: item.displaySummary || item.primarySummary || item.latestSummary || '',
        latestSummary: item.latestSummary,
        latestCreatedAt: item.latestCreatedAt,
        reviewStatus:
          memoryReviewMap.value.get(buildMemoryAggregateMapKey(item.entityKey, item.memoryKey))?.status ||
          RELATIONSHIP_MEMORY_REVIEW_STATES.ACTIVE,
        reviewNote:
          memoryReviewMap.value.get(buildMemoryAggregateMapKey(item.entityKey, item.memoryKey))?.note || '',
        reviewUpdatedAt:
          memoryReviewMap.value.get(buildMemoryAggregateMapKey(item.entityKey, item.memoryKey))?.updatedAt ||
          item.latestCreatedAt,
      }))
      .sort((left, right) => compareMemorySummaryEntries(left, right, options))
      .slice(0, clamp(toInt(limit, 5), 0, 50))
  }

  const listMemoryGroupsForTarget = (target = {}, limit = 50, options = {}) =>
    listMemoryAggregatesForTarget(target, limit, options)

  const listSourceRefsForTarget = (target = {}) => {
    const key = buildRelationshipEntityKey(target)
    if (!key) return []
    return buildSourceRefsFromEvents(events.value.filter((event) => event.entityKey === key))
  }

  const getMemoryGroupDetail = (target = {}, memoryKey = '') => {
    const key = buildRelationshipEntityKey(target)
    const normalizedMemoryKey = normalizeMemoryKey(memoryKey)
    if (!key || !normalizedMemoryKey) return null
    const aggregate =
      memoryAggregateMap.value.get(buildMemoryAggregateMapKey(key, normalizedMemoryKey)) || null
    const groupEvents = events.value
      .filter((event) => event.entityKey === key && event.memoryKey === normalizedMemoryKey)
      .sort((a, b) => b.createdAt - a.createdAt)
    if (!aggregate && groupEvents.length === 0) return null
    const review = memoryReviewMap.value.get(buildMemoryAggregateMapKey(key, normalizedMemoryKey)) || null
    return {
      ...(aggregate || buildDefaultMemoryAggregate(normalizedMemoryKey, key)),
      sourceModules: aggregate ? [...aggregate.sourceModules] : [],
      sourceIds: aggregate ? [...aggregate.sourceIds] : [],
      factTypes: aggregate ? [...aggregate.factTypes] : [],
      growthTraits: aggregate ? [...aggregate.growthTraits] : [],
      milestones: aggregate ? [...aggregate.milestones] : [],
      events: groupEvents.map(cloneRelationshipEvent),
      sourceRefs: buildSourceRefsFromEvents(groupEvents),
      sourceModuleCounts: summarizeSourceModules(groupEvents),
      reviewStatus: review?.status || RELATIONSHIP_MEMORY_REVIEW_STATES.ACTIVE,
      reviewNote: review?.note || '',
      reviewUpdatedAt: review?.updatedAt || (aggregate?.latestCreatedAt || 0),
    }
  }

  const updateMemoryReviewForTarget = (target = {}, memoryKey = '', updates = {}) => {
    const key = buildRelationshipEntityKey(target)
    const normalizedMemoryKey = normalizeMemoryKey(memoryKey)
    const aggregateKey = buildMemoryAggregateMapKey(key, normalizedMemoryKey)
    if (!key || !normalizedMemoryKey || !aggregateKey || !memoryAggregateMap.value.has(aggregateKey)) return null

    const current =
      memoryReviewMap.value.get(aggregateKey) || createDefaultMemoryReviewEntry(key, normalizedMemoryKey)
    const next = normalizeMemoryReviewEntry({
      entityKey: key,
      memoryKey: normalizedMemoryKey,
      status:
        Object.prototype.hasOwnProperty.call(updates, 'status')
          ? updates.status
          : current.status,
      note:
        Object.prototype.hasOwnProperty.call(updates, 'note')
          ? updates.note
          : current.note,
      createdAt: current.createdAt,
      updatedAt: Date.now(),
    })
    if (!next) return null

    const currentEntries = normalizeMemoryReviewEntries(memoryReviews.value)
    const nextEntries = currentEntries.filter(
      (entry) => buildMemoryAggregateMapKey(entry.entityKey, entry.memoryKey) !== aggregateKey,
    )
    nextEntries.unshift(next)
    memoryReviews.value = normalizeMemoryReviewEntries(nextEntries)
    return { ...next }
  }

  const ensureEntity = (target = {}) => {
    const meta = normalizeTargetMeta(target)
    if (!meta) return null
    const existing = entityMap.value.get(meta.entityKey)
    if (existing) {
      existing.profileId = meta.profileId || existing.profileId
      existing.contactId = meta.contactId || existing.contactId
      existing.kind = meta.kind || existing.kind
      existing.displayName = meta.displayName || existing.displayName
      return existing
    }
    const created = createDefaultEntity(meta)
    entities.value.unshift(created)
    if (entities.value.length > RELATIONSHIP_ENTITY_LIMIT) {
      entities.value.splice(RELATIONSHIP_ENTITY_LIMIT)
    }
    return created
  }

  const upsertEntity = (target = {}, updates = {}) => {
    const entity = ensureEntity(target)
    if (!entity) return null
    const source = updates && typeof updates === 'object' ? updates : {}
    if (source.metrics && typeof source.metrics === 'object') {
      METRIC_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(source.metrics, key)) {
          entity.metrics[key] = normalizeMetric(source.metrics[key], entity.metrics[key])
        }
      })
    }
    if (Array.isArray(source.growthTraits)) {
      entity.growthTraits = normalizeGrowthTraits([...entity.growthTraits, ...source.growthTraits])
    }
    if (Array.isArray(source.milestones)) {
      entity.milestones = normalizeMilestones([...entity.milestones, ...source.milestones])
    }
    entity.relationshipStage = normalizeText(source.relationshipStage, '', 40) || deriveRelationshipStage(entity.metrics)
    entity.updatedAt = Date.now()
    return { ...entity, metrics: { ...entity.metrics } }
  }

  const addMilestone = (entity, milestoneLabel, sourceEventId = '', createdAt = Date.now()) => {
    const label = normalizeText(milestoneLabel, '', 100)
    if (!entity || !label) return
    const exists = entity.milestones.some((item) => item.label.toLowerCase() === label.toLowerCase())
    if (exists) return
    entity.milestones.unshift({
      id: `milestone_${createdAt}_${Math.random().toString(36).slice(2, 6)}`,
      label,
      sourceEventId: normalizeText(sourceEventId, '', 120),
      createdAt,
    })
    entity.milestones = normalizeMilestones(entity.milestones)
  }

  const applyEventToEntity = (event) => {
    const entity = ensureEntity({
      entityKey: event.entityKey,
      name: event.targetLabel,
    })
    if (!entity) return null

    METRIC_KEYS.forEach((key) => {
      const delta = Number(event.metricDeltas?.[key] || 0)
      if (delta !== 0) {
        entity.metrics[key] = normalizeMetric(entity.metrics[key] + delta, DEFAULT_RELATIONSHIP_METRICS[key])
      }
    })
    if (event.milestone) addMilestone(entity, event.milestone, event.id, event.createdAt)
    if (event.growthTraits.length > 0) {
      entity.growthTraits = normalizeGrowthTraits([...entity.growthTraits, ...event.growthTraits])
    }
    entity.relationshipStage = deriveRelationshipStage(entity.metrics)
    entity.updatedAt = Date.now()
    return entity
  }

  const removeEntityByKey = (entityKey) => {
    const key = normalizeText(entityKey, '', 120)
    if (!key) return false
    const before = entities.value.length
    entities.value = entities.value.filter((entity) => entity.entityKey !== key)
    return entities.value.length !== before
  }

  const recomputeEntityForKey = (entityKey) => {
    const key = normalizeText(entityKey, '', 120)
    if (!key) return null
    const remainingEvents = events.value
      .filter(
        (event) =>
          event.entityKey === key &&
          event.status === RELATIONSHIP_EVENT_STATUS.APPLIED &&
          event.effectApplied !== false,
      )
      .sort((a, b) => a.createdAt - b.createdAt)
    const existing = entityMap.value.get(key)
    const fallbackMeta =
      existing ||
      events.value.find((event) => event.entityKey === key) ||
      remainingEvents[0] ||
      null
    removeEntityByKey(key)
    if (remainingEvents.length === 0) return null
    const meta = normalizeTargetMeta({
      entityKey: key,
      profileId: fallbackMeta?.profileId,
      contactId: fallbackMeta?.contactId,
      kind: fallbackMeta?.kind,
      displayName: fallbackMeta?.displayName || fallbackMeta?.targetLabel,
      name: fallbackMeta?.displayName || fallbackMeta?.targetLabel,
    })
    const recreated = ensureEntity(meta || { entityKey: key })
    if (recreated && meta) {
      recreated.profileId = meta.profileId || recreated.profileId
      recreated.contactId = meta.contactId || recreated.contactId
      recreated.kind = meta.kind || recreated.kind
      recreated.displayName = meta.displayName || recreated.displayName
    }
    remainingEvents.forEach((event) => {
      applyEventToEntity(event)
    })
    return entityMap.value.get(key) || recreated || null
  }

  const recordRelationshipFact = (input = {}) => {
    const target = input.target && typeof input.target === 'object' ? input.target : input
    const event = normalizeRelationshipEvent({
      ...input,
      id: input.id || createRelationshipEventId(),
      target,
      createdAt: input.createdAt || Date.now(),
    })
    if (!event) return null

    const major = settings.value.requireConfirmationForMajorEffects && isMajorRelationshipEvent(event)
    if (!settings.value.enabled && input.force !== true) {
      event.status = RELATIONSHIP_EVENT_STATUS.SKIPPED_DISABLED
      event.effectApplied = false
    } else if (major) {
      event.status = RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION
      event.effectApplied = false
    } else if (input.forceSupportingMemory === true) {
      event.status = RELATIONSHIP_EVENT_STATUS.APPLIED
      event.appliedAt = Date.now()
      event.effectApplied = false
      event.memoryRole = event.memoryKey ? 'supporting' : ''
    } else if (settings.value.autoApplyLowImpact) {
      event.status = RELATIONSHIP_EVENT_STATUS.APPLIED
      event.appliedAt = Date.now()
      const shouldApplyEffect =
        input.allowMetricStackWithinMemory === true || !hasAppliedEffectForMemory(event)
      event.effectApplied = shouldApplyEffect
      event.memoryRole = event.memoryKey ? (shouldApplyEffect ? 'primary' : 'supporting') : ''
      if (shouldApplyEffect) {
        applyEventToEntity(event)
      }
    } else {
      event.status = RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION
      event.effectApplied = false
    }

    events.value.unshift(event)
    if (events.value.length > RELATIONSHIP_EVENT_LIMIT) {
      events.value.splice(RELATIONSHIP_EVENT_LIMIT)
    }
    return { ...event, metricDeltas: { ...event.metricDeltas } }
  }

  const applyPendingRelationshipEvent = (eventId) => {
    const id = normalizeText(eventId, '', 120)
    if (!id) return false
    const event = events.value.find((item) => item.id === id)
    if (!event || event.status !== RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION) return false
    event.status = RELATIONSHIP_EVENT_STATUS.APPLIED
    event.appliedAt = Date.now()
    const shouldApplyEffect = event.forceSupportingMemory !== true && !hasAppliedEffectForMemory(event)
    event.effectApplied = shouldApplyEffect
    event.memoryRole = event.memoryKey ? (shouldApplyEffect ? 'primary' : 'supporting') : ''
    if (shouldApplyEffect) {
      applyEventToEntity(event)
    }
    return true
  }

  const dismissRelationshipEvent = (eventId) => {
    const id = normalizeText(eventId, '', 120)
    if (!id) return false
    const event = events.value.find((item) => item.id === id)
    if (!event || event.status !== RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION) return false
    event.status = RELATIONSHIP_EVENT_STATUS.DISMISSED
    event.dismissedAt = Date.now()
    return true
  }

  const listEventsForTarget = (target = {}, limit = 5) => {
    const key = buildRelationshipEntityKey(target)
    if (!key) return []
    return events.value
      .filter((event) => event.entityKey === key)
      .sort(compareRelationshipEventsByCreatedAtDesc)
      .slice(0, clamp(toInt(limit, 5), 0, 50))
      .map((event) => ({ ...event, metricDeltas: { ...event.metricDeltas } }))
  }

  const removeRelationshipFactsForSourceRecord = (sourceModule, recordId) => {
    const moduleKey = normalizeText(sourceModule, '', 60)
    const id = normalizeText(recordId, '', 140)
    if (!moduleKey || !id) {
      return {
        ok: false,
        reason: 'source_not_found',
        sourceModule: moduleKey,
        recordId: id,
        removedEventCount: 0,
        sourceRefs: [],
        sourceModuleCounts: {},
      }
    }

    const sourcePrefix = `${id}:`
    const removedEvents = events.value.filter(
      (event) =>
        event.sourceModule === moduleKey &&
        (event.sourceId === id || event.sourceId.startsWith(sourcePrefix)),
    )

    if (removedEvents.length === 0) {
      return {
        ok: false,
        reason: 'source_not_found',
        sourceModule: moduleKey,
        recordId: id,
        removedEventCount: 0,
        sourceRefs: [],
        sourceModuleCounts: {},
      }
    }

    const removedIds = new Set(removedEvents.map((event) => event.id))
    const affectedEntityKeys = [...new Set(removedEvents.map((event) => event.entityKey).filter(Boolean))]
    events.value = events.value.filter((event) => !removedIds.has(event.id))
    affectedEntityKeys.forEach((key) => {
      recomputeEntityForKey(key)
    })
    pruneMemoryReviews()

    return {
      ok: true,
      sourceModule: moduleKey,
      recordId: id,
      removedEventCount: removedEvents.length,
      sourceRefs: buildSourceRefsFromEvents(removedEvents),
      sourceModuleCounts: summarizeSourceModules(removedEvents),
      removedEvents: removedEvents.map(cloneRelationshipEvent),
    }
  }

  const removeMemoryGroupForTarget = (target = {}, memoryKey = '') => {
    const key = buildRelationshipEntityKey(target)
    const normalizedMemoryKey = normalizeMemoryKey(memoryKey)
    if (!key || !normalizedMemoryKey) {
      return {
        ok: false,
        reason: 'memory_group_not_found',
        entityKey: key,
        memoryKey: normalizedMemoryKey,
        removedEventCount: 0,
        sourceRefs: [],
        sourceModuleCounts: {},
      }
    }
    const removedEvents = events.value.filter(
      (event) => event.entityKey === key && event.memoryKey === normalizedMemoryKey,
    )
    if (removedEvents.length === 0) {
      return {
        ok: false,
        reason: 'memory_group_not_found',
        entityKey: key,
        memoryKey: normalizedMemoryKey,
        removedEventCount: 0,
        sourceRefs: [],
        sourceModuleCounts: {},
      }
    }
    events.value = events.value.filter(
      (event) => !(event.entityKey === key && event.memoryKey === normalizedMemoryKey),
    )
    const remainingEntity = recomputeEntityForKey(key)
    pruneMemoryReviews()
    return {
      ok: true,
      entityKey: key,
      memoryKey: normalizedMemoryKey,
      removedEventCount: removedEvents.length,
      sourceRefs: buildSourceRefsFromEvents(removedEvents),
      sourceModuleCounts: summarizeSourceModules(removedEvents),
      removedEvents: removedEvents.map(cloneRelationshipEvent),
      remainingSummary: remainingEntity
        ? summarizeEntityForTarget({ entityKey: key }, { eventLimit: 3, memoryLimit: 3 })
        : null,
    }
  }

  const resetRelationshipForTarget = (target = {}) => {
    const key = buildRelationshipEntityKey(target)
    if (!key) {
      return {
        ok: false,
        reason: 'target_not_found',
        entityKey: '',
        removedEventCount: 0,
        sourceRefs: [],
        sourceModuleCounts: {},
      }
    }
    const removedEvents = events.value.filter((event) => event.entityKey === key)
    const hadEntity = removeEntityByKey(key)
    events.value = events.value.filter((event) => event.entityKey !== key)
    pruneMemoryReviews()
    return {
      ok: removedEvents.length > 0 || hadEntity,
      entityKey: key,
      removedEventCount: removedEvents.length,
      removedEntityCount: hadEntity ? 1 : 0,
      sourceRefs: buildSourceRefsFromEvents(removedEvents),
      sourceModuleCounts: summarizeSourceModules(removedEvents),
      removedEvents: removedEvents.map(cloneRelationshipEvent),
    }
  }

  const deleteRuntimeForTarget = (target = {}) => resetRelationshipForTarget(target)

  const summarizeEntityForTarget = (target = {}, options = {}) => {
    const meta = normalizeTargetMeta(target)
    if (!meta) return null
    const entity = entityMap.value.get(meta.entityKey)
    const fallback = entity || createDefaultEntity(meta)
    const memoryLimit = clamp(toInt(options.memoryLimit, 3), 0, 20)
    const memorySortMode = normalizeText(options.memorySortMode, 'recent', 20)
    const rawMemorySummaries =
      memoryLimit > 0
        ? listMemoryAggregatesForTarget(meta, 50, { sortMode: memorySortMode })
        : []
    const hiddenArchivedMemoryKeys = shouldIncludeArchivedMemories(options)
      ? new Set()
      : new Set(
          rawMemorySummaries
            .filter((item) => item.reviewStatus === RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED)
            .map((item) => item.memoryKey)
            .filter(Boolean),
        )
    const memorySummaries =
      memoryLimit > 0
        ? rawMemorySummaries
            .filter((item) =>
              shouldIncludeArchivedMemories(options)
                ? true
                : item.reviewStatus !== RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED,
            )
            .slice(0, memoryLimit)
        : []
    const allEntityEvents = events.value.filter((event) => event.entityKey === meta.entityKey)
    const visibleEntityEvents = shouldIncludeArchivedMemories(options)
      ? allEntityEvents
      : allEntityEvents.filter(
          (event) => !event.memoryKey || !hiddenArchivedMemoryKeys.has(event.memoryKey),
        )
    const visibleAppliedEntityEvents = visibleEntityEvents.filter(
      (event) => event.status === RELATIONSHIP_EVENT_STATUS.APPLIED,
    )
    const eventLimit = clamp(toInt(options.eventLimit, 3), 0, 20)
    const recentEventCandidates =
      eventLimit > 0
        ? visibleEntityEvents
            .slice()
            .sort(compareRelationshipEventsByCreatedAtDesc)
        : []
    const recentEvents =
      eventLimit > 0
        ? recentEventCandidates
            .slice(0, eventLimit)
            .map(cloneRelationshipEvent)
        : []
    const appliedEvents = recentEvents.filter(
      (event) =>
        event.status === RELATIONSHIP_EVENT_STATUS.APPLIED &&
        event.effectApplied !== false,
    )
    const latestEvent = appliedEvents[0] || null
    const archivedMemoryCount = rawMemorySummaries.filter(
      (item) => item.reviewStatus === RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED,
    ).length
    const primaryMemory = memorySummaries[0] || null

    return {
      exists: Boolean(entity),
      entityKey: meta.entityKey,
      displayName: fallback.displayName || meta.displayName,
      profileId: fallback.profileId,
      contactId: fallback.contactId,
      kind: fallback.kind,
      metrics: { ...fallback.metrics },
      relationshipStage: fallback.relationshipStage,
      milestones: fallback.milestones.map((item) => ({ ...item })),
      growthTraits: [...fallback.growthTraits],
      recentEvents,
      memorySummaries,
      primaryMemory,
      totalMemoryCount: rawMemorySummaries.length,
      visibleMemoryCount: memorySummaries.length,
      archivedMemoryCount,
      hasArchivedOnlyMemories:
        rawMemorySummaries.length > 0 &&
        archivedMemoryCount > 0 &&
        memorySummaries.length === 0,
      sourceRefs: buildSourceRefsFromEvents(visibleAppliedEntityEvents),
      sourceModuleCounts: summarizeSourceModules(visibleAppliedEntityEvents),
      latestEventSummary: latestEvent?.summary || latestEvent?.factType || '',
      pendingEventCount: events.value.filter(
        (event) =>
          event.entityKey === meta.entityKey &&
          event.status === RELATIONSHIP_EVENT_STATUS.PENDING_CONFIRMATION,
      ).length,
      updatedAt: fallback.updatedAt,
    }
  }

  const buildPromptContextForTarget = (target = {}, options = {}) => {
    if (!settings.value.enabled && options.includeDisabled !== true) return ''
    const snapshot = summarizeEntityForTarget(target, {
      eventLimit: options.eventLimit ?? 3,
      memoryLimit: options.memoryLimit ?? 3,
      includeArchivedMemories: options.includeArchivedMemories === true,
    })
    if (!snapshot) return ''
    if (!snapshot.exists && options.includeNeutral !== true) return ''

    const metrics = snapshot.metrics
    const milestones = snapshot.milestones.map((item) => item.label).slice(0, 3).join('; ') || 'none'
    const traits = snapshot.growthTraits.slice(0, 6).join(', ') || 'none'
    const hiddenArchivedMemoryKeys =
      options.includeArchivedMemories === true
        ? new Set()
        : new Set(
            snapshot.memorySummaries
              .filter((item) => item.reviewStatus === RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED)
              .map((item) => item.memoryKey)
              .filter(Boolean),
          )
    const recentEvents = summarizeEventsForPrompt(
      snapshot.recentEvents.filter(
        (event) =>
          event.status === RELATIONSHIP_EVENT_STATUS.APPLIED &&
          event.effectApplied !== false &&
          (!event.memoryKey || !hiddenArchivedMemoryKeys.has(event.memoryKey)),
      ),
    )
    const promptMemorySummaries = snapshot.memorySummaries
      .filter((item) =>
        options.includeArchivedMemories === true
          ? true
          : item.reviewStatus !== RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED,
      )
      .sort((left, right) => compareMemorySummaryEntries(left, right))
    const memories = promptMemorySummaries.length > 0
      ? promptMemorySummaries
          .slice(0, 3)
          .map((item) => item.displaySummary || item.primarySummary || item.latestSummary || item.memoryKey || 'memory')
          .join('; ')
      : 'none'

    return [
      `Relationship runtime snapshot: ${snapshot.displayName || 'unknown target'}.`,
      `Stage: ${snapshot.relationshipStage}; metrics affinity/trust/intimacy/tension/dependency: ${metrics.affinity}/${metrics.trust}/${metrics.intimacy}/${metrics.tension}/${metrics.dependency}.`,
      `Milestones: ${milestones}.`,
      `Growth traits: ${traits}.`,
      `Memory summaries: ${memories}.`,
      `Recent relationship events: ${recentEvents}.`,
    ].join('\n')
  }

  const setRuntimeEnabled = (enabled) => {
    settings.value.enabled = enabled !== false
  }

  const setAutoApplyLowImpact = (enabled) => {
    settings.value.autoApplyLowImpact = enabled !== false
  }

  const applyPersistedSource = (source = {}) => {
    const rawSource =
      source && typeof source.relationshipRuntime === 'object' && source.relationshipRuntime
        ? source.relationshipRuntime
        : source
    if (!rawSource || typeof rawSource !== 'object') return false

    const rawEntities = Array.isArray(rawSource.entities)
      ? rawSource.entities
      : Array.isArray(rawSource.relationshipEntities)
        ? rawSource.relationshipEntities
        : null
    const rawEvents = Array.isArray(rawSource.events)
      ? rawSource.events
      : Array.isArray(rawSource.relationshipEvents)
        ? rawSource.relationshipEvents
        : null
    const rawMemoryReviews = Array.isArray(rawSource.memoryReviews)
      ? rawSource.memoryReviews
      : Array.isArray(rawSource.relationshipMemoryReviews)
        ? rawSource.relationshipMemoryReviews
        : null

    settings.value = normalizeSettings(rawSource.settings)
    entities.value = (rawEntities || [])
      .map(normalizeEntity)
      .filter(Boolean)
      .slice(0, RELATIONSHIP_ENTITY_LIMIT)
    events.value = (rawEvents || [])
      .map(normalizeRelationshipEvent)
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, RELATIONSHIP_EVENT_LIMIT)
    memoryReviews.value = normalizeMemoryReviewEntries(rawMemoryReviews || [])
    pruneMemoryReviews()
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(RELATIONSHIP_RUNTIME_STORAGE_KEY, {
      version: RELATIONSHIP_RUNTIME_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(RELATIONSHIP_RUNTIME_STORAGE_KEY, {
      version: RELATIONSHIP_RUNTIME_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    settings: { ...settings.value },
    entities: entities.value.map((entity) => ({
      ...entity,
      metrics: { ...entity.metrics },
      milestones: entity.milestones.map((item) => ({ ...item })),
      growthTraits: [...entity.growthTraits],
    })),
    events: events.value.map((event) => ({
      ...event,
      metricDeltas: { ...event.metricDeltas },
      growthTraits: [...event.growthTraits],
      worldContext: {
        ...event.worldContext,
        tags: [...event.worldContext.tags],
      },
    })),
    memoryReviews: normalizeMemoryReviewEntries(memoryReviews.value).filter((entry) =>
      memoryAggregateMap.value.has(buildMemoryAggregateMapKey(entry.entityKey, entry.memoryKey)),
    ),
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => applyPersistedSource(snapshot)

  const persistToStorage = () => {
    writePersistedState(RELATIONSHIP_RUNTIME_STORAGE_KEY, createBackupSnapshot(), {
      version: RELATIONSHIP_RUNTIME_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    settings.value = createDefaultSettings()
    entities.value = []
    events.value = []
    memoryReviews.value = []
  }

  const hydratedFromLocal = hydrateFromStorage()

  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [settings, entities, events, memoryReviews],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    settings,
    entities,
    events,
    memoryReviews,
    entityCount,
    pendingEventCount,
    hasFinishedStorageHydration,
    findEntity,
    findEventBySource,
    listMemoryAggregatesForTarget,
    listMemoryGroupsForTarget,
    listSourceRefsForTarget,
    getMemoryGroupDetail,
    updateMemoryReviewForTarget,
    upsertEntity,
    recordRelationshipFact,
    applyPendingRelationshipEvent,
    dismissRelationshipEvent,
    listEventsForTarget,
    removeRelationshipFactsForSourceRecord,
    removeMemoryGroupForTarget,
    resetRelationshipForTarget,
    deleteRuntimeForTarget,
    summarizeEntityForTarget,
    buildPromptContextForTarget,
    setRuntimeEnabled,
    setAutoApplyLowImpact,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
