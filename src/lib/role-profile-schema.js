export const ROLE_PROFILE_ID_PATTERN = /^\d+[A-Za-z]*$/

export const ROLE_DETAIL_SECTIONS = Object.freeze({
  PREFERENCES: 'preferences',
  LIFE_PATTERN: 'lifePattern',
  SOCIAL_GRAPH: 'socialGraph',
})

export const ROLE_DETAIL_SOURCE_KINDS = Object.freeze({
  MANUAL: 'manual',
  EVENT_ATTACHED: 'event_attached',
})

export const ROLE_DETAIL_SECTION_KEYS = Object.freeze(Object.values(ROLE_DETAIL_SECTIONS))
export const ROLE_DETAIL_SOURCE_KIND_KEYS = Object.freeze(Object.values(ROLE_DETAIL_SOURCE_KINDS))

const MAX_ROLE_ID_LENGTH = 24
const MAX_DETAIL_ID_LENGTH = 140
const MAX_DETAIL_TITLE_LENGTH = 80
const MAX_DETAIL_TEXT_LENGTH = 600
const MAX_SOURCE_TEXT_LENGTH = 140

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const createRoleDetailItemId = (index = 0) =>
  `role_detail_${Date.now()}_${Math.max(0, toInt(index, 0))}_${Math.random().toString(36).slice(2, 8)}`

const sourceRefKey = (sourceRef = {}) => {
  const sourceModule = normalizeText(sourceRef.sourceModule, '', MAX_SOURCE_TEXT_LENGTH)
  const sourceId = normalizeText(sourceRef.sourceId, '', MAX_SOURCE_TEXT_LENGTH)
  return sourceModule && sourceId ? `${sourceModule}:${sourceId}` : ''
}

export const normalizeRoleId = (value, fallback = '') => {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
  const candidate = raw || (typeof fallback === 'string' || typeof fallback === 'number' ? String(fallback).trim() : '')
  return candidate.slice(0, MAX_ROLE_ID_LENGTH)
}

export const isValidRoleId = (value) => ROLE_PROFILE_ID_PATTERN.test(normalizeRoleId(value))

export const createRoleIdFromProfileId = (profileId, fallbackIndex = 0) => {
  const parsedId = toInt(profileId, 0)
  if (parsedId > 0) return String(parsedId)
  return String(Math.max(1, toInt(fallbackIndex, 0) + 1))
}

const numberSuffix = (index) => {
  const normalizedIndex = Math.max(1, toInt(index, 1))
  let value = normalizedIndex
  let output = ''
  while (value > 0) {
    value -= 1
    output = String.fromCharCode(65 + (value % 26)) + output
    value = Math.floor(value / 26)
  }
  return output || 'A'
}

export const ensureUniqueRoleProfileRoleIds = (profiles = []) => {
  if (!Array.isArray(profiles)) return []
  const used = new Set()
  return profiles.map((profile, index) => {
    const baseId = isValidRoleId(profile?.roleId)
      ? normalizeRoleId(profile.roleId)
      : createRoleIdFromProfileId(profile?.id, index)
    let candidate = baseId
    let suffixIndex = 1
    while (used.has(candidate.toLowerCase())) {
      candidate = `${baseId}${numberSuffix(suffixIndex)}`
      suffixIndex += 1
    }
    used.add(candidate.toLowerCase())
    return {
      ...profile,
      roleId: candidate,
    }
  })
}

export const normalizeRoleDetailSection = (value) => {
  const section = normalizeText(value, '', 40)
  return ROLE_DETAIL_SECTION_KEYS.includes(section) ? section : ROLE_DETAIL_SECTIONS.PREFERENCES
}

export const normalizeRoleDetailSourceKind = (value) => {
  const kind = normalizeText(value, '', 40)
  return ROLE_DETAIL_SOURCE_KIND_KEYS.includes(kind) ? kind : ROLE_DETAIL_SOURCE_KINDS.MANUAL
}

export const normalizeRoleDetailItem = (rawItem = {}, index = 0) => {
  const source = rawItem && typeof rawItem === 'object' ? rawItem : {}
  const title = normalizeText(source.title || source.label || source.name, '', MAX_DETAIL_TITLE_LENGTH)
  const detail = normalizeText(
    source.detail || source.content || source.description || source.summary,
    '',
    MAX_DETAIL_TEXT_LENGTH,
  )
  if (!title && !detail) return null

  const createdAt = Math.max(0, toInt(source.createdAt, Date.now() - Math.max(0, toInt(index, 0))))
  return {
    id: normalizeText(source.id, '', MAX_DETAIL_ID_LENGTH) || createRoleDetailItemId(index),
    section: normalizeRoleDetailSection(source.section || source.kind),
    sourceKind: normalizeRoleDetailSourceKind(source.sourceKind || source.sourceType),
    title,
    detail,
    sourceModule: normalizeText(source.sourceModule, '', MAX_SOURCE_TEXT_LENGTH),
    sourceId: normalizeText(source.sourceId, '', MAX_SOURCE_TEXT_LENGTH),
    memoryKey: normalizeText(source.memoryKey, '', MAX_SOURCE_TEXT_LENGTH).toLowerCase(),
    relationshipEventId: normalizeText(source.relationshipEventId || source.eventId, '', MAX_SOURCE_TEXT_LENGTH),
    createdAt,
    updatedAt: Math.max(createdAt, toInt(source.updatedAt, createdAt)),
  }
}

export const normalizeRoleDetailItems = (rawItems = [], fallbackIndex = 0) => {
  if (!Array.isArray(rawItems)) return []
  const seen = new Set()
  return rawItems
    .map((item, index) => normalizeRoleDetailItem(item, fallbackIndex + index))
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 200)
}

export const createRoleDetailItem = (section, input = {}) =>
  normalizeRoleDetailItem(
    {
      ...input,
      section,
      sourceKind: input.sourceKind || ROLE_DETAIL_SOURCE_KINDS.MANUAL,
      createdAt: input.createdAt || Date.now(),
      updatedAt: input.updatedAt || Date.now(),
    },
    0,
  )

export const cloneRoleDetailItems = (items = []) =>
  normalizeRoleDetailItems(items).map((item) => ({ ...item }))

export const filterRoleDetailItemsForReset = (items = []) =>
  normalizeRoleDetailItems(items).filter(
    (item) => item.sourceKind !== ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED,
  )

export const filterRoleDetailItemsForMemoryDelete = (items = [], { memoryKey = '', sourceRefs = [] } = {}) => {
  const normalizedMemoryKey = normalizeText(memoryKey, '', MAX_SOURCE_TEXT_LENGTH).toLowerCase()
  const sourceRefKeys = new Set(
    Array.isArray(sourceRefs)
      ? sourceRefs.map(sourceRefKey).filter(Boolean)
      : [],
  )
  return normalizeRoleDetailItems(items).filter((item) => {
    if (item.sourceKind !== ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED) return true
    if (normalizedMemoryKey && item.memoryKey === normalizedMemoryKey) return false
    if (sourceRefKeys.size > 0 && sourceRefKeys.has(sourceRefKey(item))) return false
    return true
  })
}
