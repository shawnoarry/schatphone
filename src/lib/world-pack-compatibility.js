export const WORLD_PACK_FIT_STATUS = Object.freeze({
  RECOMMENDED: 'recommended',
  ADAPTABLE: 'adaptable',
  NEEDS_CONTEXT: 'needs_context',
  CONFLICTING: 'conflicting',
  UNSUPPORTED: 'unsupported',
})

const FIT_ORDER = [
  WORLD_PACK_FIT_STATUS.RECOMMENDED,
  WORLD_PACK_FIT_STATUS.ADAPTABLE,
  WORLD_PACK_FIT_STATUS.NEEDS_CONTEXT,
  WORLD_PACK_FIT_STATUS.CONFLICTING,
  WORLD_PACK_FIT_STATUS.UNSUPPORTED,
]

const WORLD_PROFILE_FIELDS = [
  'era',
  'settingTraits',
  'realism',
  'socialRoles',
  'economyTraits',
  'technologyLevel',
]

const normalizeText = (value, fallback = '', maxLength = 500) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.slice(0, maxLength)
}

const normalizeId = (value, fallback = '') => {
  const text = normalizeText(value, fallback, 120).toLowerCase()
  const normalized = text.replace(/[^a-z0-9_:-]+/g, '_').replace(/^_+|_+$/g, '')
  return normalized || fallback
}

const normalizeStringList = (value, maxLength = 80) => {
  const source = Array.isArray(value) ? value : value ? [value] : []
  const seen = new Set()
  const result = []
  source.forEach((item) => {
    const normalized = normalizeId(item, '')
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    result.push(normalized.slice(0, maxLength))
  })
  return result
}

const normalizeEvidenceList = (value) => {
  const source = Array.isArray(value) ? value : value ? [value] : []
  const seen = new Set()
  const result = []
  source.forEach((item) => {
    const normalized = normalizeText(item, '', 220)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    result.push(normalized)
  })
  return result.slice(0, 8)
}

const normalizeConfidence = (value) => {
  const normalized = normalizeId(value, 'low')
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized
  return 'low'
}

const normalizeTraitCondition = (value = {}) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(
    WORLD_PROFILE_FIELDS.map((field) => [field, normalizeStringList(source[field])]).filter(
      ([, items]) => items.length > 0,
    ),
  )
}

const readProfileValues = (worldProfile, field) => {
  const value = worldProfile?.[field]
  if (Array.isArray(value)) return normalizeStringList(value)
  return normalizeStringList(value)
}

const countMatches = (worldProfile, condition = {}) => {
  const matched = []
  const missing = []
  Object.entries(condition).forEach(([field, requiredValues]) => {
    const profileValues = readProfileValues(worldProfile, field)
    requiredValues.forEach((value) => {
      if (profileValues.includes(value)) matched.push(`${field}:${value}`)
      else missing.push(`${field}:${value}`)
    })
  })
  return { matched, missing }
}

export const normalizeWorldProfile = (raw = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    era: normalizeId(source.era, 'unknown'),
    settingTraits: normalizeStringList(source.settingTraits),
    realism: normalizeId(source.realism, 'unknown'),
    socialRoles: normalizeStringList(source.socialRoles),
    economyTraits: normalizeStringList(source.economyTraits),
    technologyLevel: normalizeId(source.technologyLevel, 'unknown'),
    confidence: normalizeConfidence(source.confidence),
    evidence: normalizeEvidenceList(source.evidence),
    analyzedAt: Number.isFinite(Number(source.analyzedAt)) ? Math.max(0, Math.floor(Number(source.analyzedAt))) : 0,
  }
}

export const normalizeWorldPackCompatibility = (raw = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    required: normalizeTraitCondition(source.required),
    recommended: normalizeTraitCondition(source.recommended),
    adaptable: normalizeTraitCondition(source.adaptable),
    requiresConfirmation: normalizeTraitCondition(source.requiresConfirmation),
    conflicts: normalizeTraitCondition(source.conflicts),
  }
}

export const buildWorldPackCompatibilityReview = ({ pack = {}, worldProfile = {} } = {}) => {
  const normalizedProfile = normalizeWorldProfile(worldProfile)
  const compatibility = normalizeWorldPackCompatibility(pack.compatibility)
  const supportState = normalizeId(pack.supportState, 'supported')
  const unsupportedReason = normalizeId(pack.unsupportedReason, '')
  const required = countMatches(normalizedProfile, compatibility.required)
  const recommended = countMatches(normalizedProfile, compatibility.recommended)
  const adaptable = countMatches(normalizedProfile, compatibility.adaptable)
  const needsContext = countMatches(normalizedProfile, compatibility.requiresConfirmation)
  const conflicts = countMatches(normalizedProfile, compatibility.conflicts)

  let fitStatus = WORLD_PACK_FIT_STATUS.ADAPTABLE
  if (supportState === 'unsupported' || unsupportedReason) {
    fitStatus = WORLD_PACK_FIT_STATUS.UNSUPPORTED
  } else if (conflicts.matched.length > 0) {
    fitStatus = WORLD_PACK_FIT_STATUS.CONFLICTING
  } else if (required.missing.length > 0 || needsContext.missing.length > 0) {
    fitStatus = WORLD_PACK_FIT_STATUS.NEEDS_CONTEXT
  } else if (recommended.matched.length > 0 && recommended.missing.length === 0) {
    fitStatus = WORLD_PACK_FIT_STATUS.RECOMMENDED
  } else if (adaptable.matched.length > 0 || recommended.matched.length > 0) {
    fitStatus = WORLD_PACK_FIT_STATUS.ADAPTABLE
  }

  const reasons = [
    ...recommended.matched.map((item) => `matches ${item}`),
    ...adaptable.matched.map((item) => `can adapt through ${item}`),
    ...required.missing.map((item) => `missing required ${item}`),
    ...needsContext.missing.map((item) => `needs confirmation for ${item}`),
    ...conflicts.matched.map((item) => `conflicts with ${item}`),
  ].slice(0, 12)

  return {
    packId: normalizeId(pack.id, ''),
    packTitle: normalizeText(pack.title || pack.name || pack.id, 'World Pack', 120),
    packName: normalizeText(pack.name || pack.title || pack.id, 'World Pack', 120),
    fitStatus,
    enableable: fitStatus !== WORLD_PACK_FIT_STATUS.UNSUPPORTED,
    unsupportedReason: fitStatus === WORLD_PACK_FIT_STATUS.UNSUPPORTED ? unsupportedReason || 'unsupported' : '',
    score:
      recommended.matched.length * 4 +
      adaptable.matched.length * 2 -
      required.missing.length * 3 -
      needsContext.missing.length * 2 -
      conflicts.matched.length * 5,
    reasons,
    required,
    recommended,
    adaptable,
    needsContext,
    conflicts,
  }
}

export const groupWorldPackRecommendations = (reviews = []) => {
  const normalized = (Array.isArray(reviews) ? reviews : [])
    .filter((item) => item && typeof item === 'object')
    .sort((a, b) => {
      const orderDelta = FIT_ORDER.indexOf(a.fitStatus) - FIT_ORDER.indexOf(b.fitStatus)
      if (orderDelta !== 0) return orderDelta
      return (b.score || 0) - (a.score || 0)
    })

  const groups = {
    recommended: [],
    adaptable: [],
    needsContext: [],
    conflicting: [],
    unsupported: [],
    browseable: [],
  }

  normalized.forEach((review) => {
    if (review.fitStatus === WORLD_PACK_FIT_STATUS.RECOMMENDED) groups.recommended.push(review)
    else if (review.fitStatus === WORLD_PACK_FIT_STATUS.ADAPTABLE) groups.adaptable.push(review)
    else if (review.fitStatus === WORLD_PACK_FIT_STATUS.NEEDS_CONTEXT) groups.needsContext.push(review)
    else if (review.fitStatus === WORLD_PACK_FIT_STATUS.CONFLICTING) groups.conflicting.push(review)
    else groups.unsupported.push(review)
  })

  groups.browseable = [
    ...groups.recommended,
    ...groups.adaptable,
    ...groups.needsContext,
    ...groups.conflicting,
  ]

  return groups
}
