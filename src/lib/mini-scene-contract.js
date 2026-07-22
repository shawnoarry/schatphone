export const MINI_SCENE_SCHEMA_VERSION = 1

export const MINI_SCENE_PRESENTATION_MODES = Object.freeze([
  'unconfigured',
  'off',
  'text',
  'interactive_html',
])

export const MINI_SCENE_ACTIVE_PRESENTATION_MODES = Object.freeze([
  'text',
  'interactive_html',
])

export const MINI_SCENE_WORLD_SCOPE_KINDS = Object.freeze([
  'book_worldview',
  'world_pack',
  'manual',
])

export const MINI_SCENE_CONTENT_DIMENSION_CHOICES = Object.freeze([
  'include',
  'exclude',
])

export const MINI_SCENE_TRANSFORM_OPERATIONS = Object.freeze([
  'replace_text',
  'capture_slot',
  'select_variant',
])

export const MINI_SCENE_TRANSFORM_INPUT_FIELDS = Object.freeze([
  'title',
  'summary',
  'beat_text',
  'choice_label',
])

export const MINI_SCENE_REGEX_FLAGS = Object.freeze(['g', 'i', 'm', 's', 'u'])

export const MINI_SCENE_LIMITS = Object.freeze({
  maxIdChars: 160,
  maxTitleChars: 160,
  maxSummaryChars: 2_000,
  maxTextChars: 12_000,
  maxFacts: 64,
  maxParticipants: 32,
  maxBeats: 24,
  maxChoices: 16,
  maxAssetIds: 32,
  maxProfileChars: 64_000,
  maxProfileRules: 32,
  maxPatternChars: 512,
  maxReplacementChars: 2_000,
  maxInputChars: 12_000,
  maxWorldScopes: 16,
  maxContentDimensions: 32,
})

export const MINI_SCENE_ERROR_CODES = Object.freeze({
  REQUEST_INVALID: 'MINI_SCENE_REQUEST_INVALID',
  DRAFT_INVALID: 'MINI_SCENE_DRAFT_INVALID',
  ARTIFACT_INVALID: 'MINI_SCENE_ARTIFACT_INVALID',
  MODULE_INVALID: 'MINI_SCENE_MODULE_INVALID',
  MODULE_DUPLICATE: 'MINI_SCENE_MODULE_DUPLICATE',
  MODULE_NOT_REGISTERED: 'MINI_SCENE_MODULE_NOT_REGISTERED',
  SCENE_TYPE_UNSUPPORTED: 'MINI_SCENE_SCENE_TYPE_UNSUPPORTED',
  SOURCE_ROUTE_MISMATCH: 'MINI_SCENE_SOURCE_ROUTE_MISMATCH',
  PROFILE_INVALID: 'MINI_SCENE_PROFILE_INVALID',
  PROFILE_SCOPE_MISMATCH: 'MINI_SCENE_PROFILE_SCOPE_MISMATCH',
  REGEX_INVALID: 'MINI_SCENE_REGEX_INVALID',
  REGEX_UNSUPPORTED: 'MINI_SCENE_REGEX_UNSUPPORTED',
  REGEX_LIMIT_EXCEEDED: 'MINI_SCENE_REGEX_LIMIT_EXCEEDED',
  REGEX_TIMEOUT: 'MINI_SCENE_REGEX_TIMEOUT',
  TEMPLATE_MISSING: 'MINI_SCENE_TEMPLATE_MISSING',
  FIELDS_IGNORED: 'MINI_SCENE_FIELDS_IGNORED',
})

export const isMiniScenePlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const normalizeMiniSceneText = (value, fallback = '', maxLength = 1_000) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) return fallback
  return normalized.slice(0, Math.max(1, Number(maxLength) || 1_000))
}

export const normalizeMiniSceneInlineText = (value, fallback = '', maxLength = 180) =>
  normalizeMiniSceneText(value, fallback, maxLength).replace(/\s+/g, ' ')

export const normalizeMiniSceneId = (value, fallback = '') => {
  const normalized = normalizeMiniSceneInlineText(
    value,
    '',
    MINI_SCENE_LIMITS.maxIdChars,
  )
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || fallback
}

export const normalizeMiniSceneIdList = (value, { maxItems = 64, sort = false } = {}) => {
  const source = Array.isArray(value) ? value : value ? [value] : []
  const seen = new Set()
  const normalized = []
  source.forEach((item) => {
    const id = normalizeMiniSceneId(item)
    if (!id || seen.has(id) || normalized.length >= maxItems) return
    seen.add(id)
    normalized.push(id)
  })
  return sort ? normalized.sort((a, b) => a.localeCompare(b)) : normalized
}

export const normalizeMiniSceneRoute = (value) => {
  const route = normalizeMiniSceneInlineText(value, '', 240)
  if (!route || !route.startsWith('/') || route.startsWith('//') || /\s/.test(route)) return ''
  if (/^javascript:/i.test(route)) return ''
  return route
}

export const listMiniSceneUnknownFields = (source, allowedFields) => {
  if (!isMiniScenePlainObject(source)) return []
  const allowed = allowedFields instanceof Set ? allowedFields : new Set(allowedFields)
  return Object.keys(source)
    .filter((field) => !allowed.has(field))
    .sort((a, b) => a.localeCompare(b))
}

export const sortMiniSceneIssues = (issues = []) =>
  [...(Array.isArray(issues) ? issues : [])].sort((left, right) => {
    const pathDelta = String(left?.path || '').localeCompare(String(right?.path || ''))
    if (pathDelta !== 0) return pathDelta
    const codeDelta = String(left?.code || '').localeCompare(String(right?.code || ''))
    if (codeDelta !== 0) return codeDelta
    return String(left?.reason || '').localeCompare(String(right?.reason || ''))
  })

export const cloneMiniSceneValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneMiniSceneValue)
  if (!isMiniScenePlainObject(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, cloneMiniSceneValue(nestedValue)]),
  )
}
