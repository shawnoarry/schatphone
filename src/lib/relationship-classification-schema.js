const METRIC_KEYS = ['affinity', 'trust', 'intimacy', 'tension', 'dependency']

const DEFAULT_INITIAL_RELATIONSHIP_SEED = Object.freeze({
  affinity: 50,
  trust: 50,
  intimacy: 20,
  tension: 10,
  dependency: 10,
})

export const RELATIONSHIP_CLASSIFICATION_CONFIDENCE = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
})

export const RELATIONSHIP_CLASSIFICATION_SOURCE = Object.freeze({
  AI_AUTO: 'ai_auto',
  AI_CONFIRMED: 'ai_confirmed',
  USER_EDITED: 'user_edited',
  WORLD_TEMPLATE: 'world_template',
})

export const BASE_RELATIONSHIP_CATEGORIES = Object.freeze([
  { id: 'ordinary_acquaintance', label: 'Ordinary acquaintance', fallbackCategoryId: '' },
  { id: 'family_bond', label: 'Family bond', fallbackCategoryId: 'ordinary_acquaintance' },
  { id: 'friendship_bond', label: 'Friendship bond', fallbackCategoryId: 'ordinary_acquaintance' },
  { id: 'romance_candidate', label: 'Romance candidate', fallbackCategoryId: 'friendship_bond' },
  { id: 'romantic_bond', label: 'Romantic bond', fallbackCategoryId: 'romance_candidate' },
  { id: 'mentor_bond', label: 'Mentor bond', fallbackCategoryId: 'professional_bond' },
  { id: 'professional_bond', label: 'Professional bond', fallbackCategoryId: 'ordinary_acquaintance' },
  { id: 'power_bond', label: 'Power bond', fallbackCategoryId: 'professional_bond' },
  { id: 'fandom_bond', label: 'Fandom bond', fallbackCategoryId: 'ordinary_acquaintance' },
  { id: 'rival_bond', label: 'Rival bond', fallbackCategoryId: 'ordinary_acquaintance' },
])

export const BASE_RELATIONSHIP_MODIFIERS = Object.freeze([
  { id: 'childhood_connection', label: 'Childhood connection' },
  { id: 'long_term_companion', label: 'Long-term companion' },
  { id: 'unrequited', label: 'Unrequited' },
  { id: 'mutual', label: 'Mutual' },
  { id: 'secret', label: 'Secret' },
  { id: 'protective', label: 'Protective' },
  { id: 'admiring', label: 'Admiring' },
  { id: 'obsessive', label: 'Obsessive' },
  { id: 'estranged', label: 'Estranged' },
  { id: 'high_status_gap', label: 'High status gap' },
  { id: 'caretaking', label: 'Caretaking' },
])

const toInt = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.floor(numeric) : fallback
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, toInt(value, min)))

const normalizeText = (value, fallback = '', max = 240) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeId = (value, fallback = '') =>
  normalizeText(value, fallback, 120)
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback

const normalizeIdList = (value, max = 12) => {
  const seen = new Set()
  return (Array.isArray(value) ? value : [])
    .map((item) => normalizeId(item, ''))
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
    .slice(0, max)
}

const normalizeRegistryEntry = (item, fallbackId = '') => {
  const source = item && typeof item === 'object' ? item : { id: item }
  const id = normalizeId(source.id, fallbackId)
  if (!id) return null
  return {
    id,
    label: normalizeText(source.label || source.name, id, 80),
    description: normalizeText(source.description, '', 300),
    fallbackCategoryId: normalizeId(source.fallbackCategoryId || source.fallbackId, ''),
    source: normalizeId(source.source, 'base'),
  }
}

const dedupeByFirstId = (items) => {
  const seen = new Set()
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export const normalizeInitialRelationshipSeed = (seed = {}) =>
  METRIC_KEYS.reduce((acc, key) => {
    acc[key] = clamp(seed?.[key] ?? DEFAULT_INITIAL_RELATIONSHIP_SEED[key], 0, 100)
    return acc
  }, {})

export const buildRelationshipClassificationRegistry = ({
  worldCategories = [],
  worldModifiers = [],
} = {}) => {
  const categories = [
    ...BASE_RELATIONSHIP_CATEGORIES.map((item) => ({ ...item, source: 'base' })),
    ...worldCategories
      .map((item, index) => normalizeRegistryEntry(item, `world_category_${index + 1}`))
      .filter(Boolean)
      .map((item) => ({ ...item, source: item.source === 'base' ? 'world' : item.source })),
  ]
  const modifiers = [
    ...BASE_RELATIONSHIP_MODIFIERS.map((item) => ({ ...item, source: 'base', description: '' })),
    ...worldModifiers
      .map((item, index) => normalizeRegistryEntry(item, `world_modifier_${index + 1}`))
      .filter(Boolean)
      .map((item) => ({ ...item, source: item.source === 'base' ? 'world' : item.source })),
  ]
  const normalizedCategories = dedupeByFirstId(categories)
  const normalizedModifiers = dedupeByFirstId(modifiers)
  return {
    categories: normalizedCategories,
    modifiers: normalizedModifiers,
    categoryById: new Map(normalizedCategories.map((item) => [item.id, item])),
    modifierById: new Map(normalizedModifiers.map((item) => [item.id, item])),
  }
}

export const normalizeRelationshipProfileFields = (rawProfile = {}) => {
  const profile = rawProfile && typeof rawProfile === 'object' ? rawProfile : {}
  const confidence = normalizeId(profile.classificationConfidence, '')
  const source = normalizeId(profile.classificationSource, '')
  return {
    relationshipLabelText: normalizeText(profile.relationshipLabelText, '', 120),
    relationshipLabelNote: normalizeText(profile.relationshipLabelNote, '', 600),
    initialRelationshipSeed: normalizeInitialRelationshipSeed(profile.initialRelationshipSeed),
    primaryRelationshipCategoryId: normalizeId(profile.primaryRelationshipCategoryId, ''),
    relationshipModifierIds: normalizeIdList(profile.relationshipModifierIds, 12),
    classificationConfidence: Object.values(RELATIONSHIP_CLASSIFICATION_CONFIDENCE).includes(confidence)
      ? confidence
      : '',
    classificationSource: Object.values(RELATIONSHIP_CLASSIFICATION_SOURCE).includes(source)
      ? source
      : '',
    classificationUpdatedAt: Math.max(0, toInt(profile.classificationUpdatedAt, 0)),
    classificationExplanation: normalizeText(profile.classificationExplanation, '', 500),
  }
}

export const cloneRelationshipProfileFields = (profile = {}) => {
  const fields = normalizeRelationshipProfileFields(profile)
  return {
    ...fields,
    initialRelationshipSeed: { ...fields.initialRelationshipSeed },
    relationshipModifierIds: [...fields.relationshipModifierIds],
  }
}
