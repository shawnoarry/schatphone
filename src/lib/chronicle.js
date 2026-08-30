export const CHRONICLE_SCHEMA_VERSION = 1

export const CHRONICLE_ENTRY_KIND = Object.freeze({
  DIARY: 'diary',
})

export const CHRONICLE_MOOD = Object.freeze({
  UNMARKED: 'unmarked',
  CALM: 'calm',
  BRIGHT: 'bright',
  EXCITED: 'excited',
  TIRED: 'tired',
  HEAVY: 'heavy',
})

export const CHRONICLE_SOURCE_OWNER = Object.freeze({
  CALENDAR: 'calendar',
  AGENDA_JOURNEY: 'agenda-journey',
  MAP: 'map',
  ACTIVITY_SESSION: 'activity-session',
  WORK_HUB: 'work-hub',
  EVENT_RUNTIME: 'event-runtime',
})

const MAX_TIMESTAMP = 8_640_000_000_000_000
const ENTRY_LIMIT = 1000
const SOURCE_REF_LIMIT = 8
const TAG_LIMIT = 8
const MEDIA_REF_LIMIT = 8

const SOURCE_ROUTES = Object.freeze({
  [CHRONICLE_SOURCE_OWNER.CALENDAR]: '/calendar',
  [CHRONICLE_SOURCE_OWNER.AGENDA_JOURNEY]: '/agenda-journey',
  [CHRONICLE_SOURCE_OWNER.MAP]: '/map',
  [CHRONICLE_SOURCE_OWNER.ACTIVITY_SESSION]: '/agenda-journey',
  [CHRONICLE_SOURCE_OWNER.WORK_HUB]: '/workplace',
  [CHRONICLE_SOURCE_OWNER.EVENT_RUNTIME]: '/workplace',
})

const trimLine = (value, fallback = '', max = 220) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const trimBody = (value, max = 12_000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

const toTimestamp = (value, fallback = 0) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(MAX_TIMESTAMP, Math.max(0, Math.floor(numeric)))
}

const normalizeDateKey = (value, fallbackTimestamp = Date.now()) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim()
  }
  const timestamp = toTimestamp(value, toTimestamp(fallbackTimestamp, Date.now()))
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeScalarQuery = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
      .slice(0, 12)
      .map(([key, value]) => [trimLine(key, '', 80), trimLine(String(value), '', 240)])
      .filter(([key, value]) => key && value),
  )
}

export const normalizeChronicleSourceRef = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const owner = trimLine(raw.owner, '', 80)
  const recordType = trimLine(raw.recordType, '', 120)
  const recordId = trimLine(raw.recordId, '', 220)
  const route = SOURCE_ROUTES[owner]
  if (!route || !recordType || !recordId) return null
  return {
    owner,
    recordType,
    recordId,
    revision: trimLine(raw.revision, '', 220),
    route,
    query: normalizeScalarQuery(raw.query),
  }
}

export const normalizeChronicleSourceRefs = (raw) => {
  const byKey = new Map()
  ;(Array.isArray(raw) ? raw : []).forEach((candidate) => {
    const reference = normalizeChronicleSourceRef(candidate)
    if (!reference) return
    const key = `${reference.owner}::${reference.recordType}::${reference.recordId}::${reference.revision}`
    byKey.set(key, reference)
  })
  return [...byKey.values()].slice(0, SOURCE_REF_LIMIT)
}

const normalizeTags = (raw) => {
  const tags = new Set()
  ;(Array.isArray(raw) ? raw : []).forEach((candidate) => {
    const tag = trimLine(candidate, '', 32).toLowerCase()
    if (tag) tags.add(tag)
  })
  return [...tags].slice(0, TAG_LIMIT)
}

const normalizeMediaRefs = (raw) => {
  const byId = new Map()
  ;(Array.isArray(raw) ? raw : []).forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return
    const assetId = trimLine(candidate.assetId, '', 180)
    if (!assetId) return
    byId.set(assetId, { owner: 'gallery', assetId })
  })
  return [...byId.values()].slice(0, MEDIA_REF_LIMIT)
}

export const normalizeChronicleEntry = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const id = trimLine(raw.id, '', 220)
  const kind = trimLine(raw.kind, CHRONICLE_ENTRY_KIND.DIARY, 40)
  const createdAt = toTimestamp(raw.createdAt, 0)
  const updatedAt = Math.max(createdAt, toTimestamp(raw.updatedAt, createdAt))
  const entryDate = normalizeDateKey(raw.entryDate || createdAt, createdAt)
  const body = trimBody(raw.body)
  if (!id || kind !== CHRONICLE_ENTRY_KIND.DIARY || !createdAt || !entryDate || !body) {
    return null
  }
  const mood = Object.values(CHRONICLE_MOOD).includes(raw.mood)
    ? raw.mood
    : CHRONICLE_MOOD.UNMARKED
  return {
    schemaVersion: CHRONICLE_SCHEMA_VERSION,
    id,
    kind,
    entryDate,
    title: trimLine(raw.title, '', 160),
    body,
    mood,
    tags: normalizeTags(raw.tags),
    mediaRefs: normalizeMediaRefs(raw.mediaRefs),
    sourceRefs: normalizeChronicleSourceRefs(raw.sourceRefs),
    createdAt,
    updatedAt,
  }
}

export const normalizeChronicleEntries = (raw) => {
  const byId = new Map()
  ;(Array.isArray(raw) ? raw : []).forEach((candidate) => {
    const entry = normalizeChronicleEntry(candidate)
    if (!entry) return
    const current = byId.get(entry.id)
    if (!current || entry.updatedAt >= current.updatedAt) byId.set(entry.id, entry)
  })
  return [...byId.values()]
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
    .slice(-ENTRY_LIMIT)
}

export const createChronicleEntry = (input = {}, { id = '', now = Date.now() } = {}) =>
  normalizeChronicleEntry({
    ...input,
    id,
    kind: CHRONICLE_ENTRY_KIND.DIARY,
    createdAt: now,
    updatedAt: now,
    entryDate: input.entryDate || now,
  })

export const updateChronicleEntry = (rawEntry, updates = {}, { now = Date.now() } = {}) => {
  const current = normalizeChronicleEntry(rawEntry)
  if (!current) return null
  return normalizeChronicleEntry({
    ...current,
    ...updates,
    id: current.id,
    kind: current.kind,
    createdAt: current.createdAt,
    updatedAt: Math.max(current.updatedAt, toTimestamp(now, Date.now())),
  })
}

export const chronicleDateKey = normalizeDateKey
