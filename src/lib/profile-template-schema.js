export const CONTACTS_ENTITY_TYPES = Object.freeze({
  SELF_PROFILE: 'self_profile',
  MAIN_ROLE: 'main_role',
  NPC: 'npc',
})

export const CONTACTS_ENTITY_TYPE_KEYS = Object.freeze(Object.values(CONTACTS_ENTITY_TYPES))

export const PROFILE_TEMPLATE_SCOPES = Object.freeze({
  GLOBAL_PRESET: 'global_preset',
  WORLD: 'world',
  ROLE_SPECIFIC: 'role_specific',
})

export const PROFILE_TEMPLATE_SCOPE_KEYS = Object.freeze(Object.values(PROFILE_TEMPLATE_SCOPES))

export const PROFILE_TEMPLATE_FIELD_TYPES = Object.freeze({
  SHORT_TEXT: 'short_text',
  LONG_TEXT: 'long_text',
  SINGLE_SELECT: 'single_select',
  MULTI_SELECT_TAGS: 'multi_select_tags',
  PERSON_REFERENCE: 'person_reference',
})

export const PROFILE_TEMPLATE_FIELD_TYPE_KEYS = Object.freeze(
  Object.values(PROFILE_TEMPLATE_FIELD_TYPES),
)

export const PROFILE_VISIBILITY_LEVELS = Object.freeze({
  PUBLIC: 'public',
  FAMILIAR: 'familiar',
  INTIMATE: 'intimate',
  HIDDEN: 'hidden',
  WORLD_SPECIFIC: 'world_specific',
})

export const PROFILE_VISIBILITY_LEVEL_KEYS = Object.freeze(Object.values(PROFILE_VISIBILITY_LEVELS))

export const PROFILE_VALUE_SOURCE_KINDS = Object.freeze({
  MANUAL: 'manual',
  TEMPLATE_DEFAULT: 'template_default',
  EVENT_ATTACHED: 'event_attached',
})

export const PROFILE_VALUE_SOURCE_KIND_KEYS = Object.freeze(
  Object.values(PROFILE_VALUE_SOURCE_KINDS),
)

const MAX_TEXT = 600
const MAX_SHORT_TEXT = 120
const MAX_ID = 80
const MAX_FIELDS = 80
const MAX_VALUES = 160
const MAX_OPTIONS = 80
const MAX_KNOWLEDGE_POINTS = 40

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeText = (value, fallback = '', max = MAX_SHORT_TEXT) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeId = (value, fallback = '') => {
  const normalized = normalizeText(value, fallback, MAX_ID)
  return /^[a-z0-9_-]+$/i.test(normalized) ? normalized : fallback
}

const unique = (items = []) => [...new Set(items)]

const cloneTemplateField = (field = {}) => ({
  ...field,
  entityTypes: Array.isArray(field.entityTypes) ? [...field.entityTypes] : [],
  options: Array.isArray(field.options) ? [...field.options] : [],
})

export const cloneProfileTemplate = (template = {}) => ({
  ...template,
  fields: Array.isArray(template.fields) ? template.fields.map(cloneTemplateField) : [],
})

export const normalizeContactsEntityType = (
  value,
  fallback = CONTACTS_ENTITY_TYPES.MAIN_ROLE,
) => (CONTACTS_ENTITY_TYPE_KEYS.includes(value) ? value : fallback)

export const normalizeProfileTemplateScope = (
  value,
  fallback = PROFILE_TEMPLATE_SCOPES.WORLD,
) => (PROFILE_TEMPLATE_SCOPE_KEYS.includes(value) ? value : fallback)

export const normalizeProfileTemplateFieldType = (
  value,
  fallback = PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
) => (PROFILE_TEMPLATE_FIELD_TYPE_KEYS.includes(value) ? value : fallback)

export const normalizeProfileVisibilityLevel = (
  value,
  fallback = PROFILE_VISIBILITY_LEVELS.FAMILIAR,
) => (PROFILE_VISIBILITY_LEVEL_KEYS.includes(value) ? value : fallback)

export const normalizeProfileValueSourceKind = (
  value,
  fallback = PROFILE_VALUE_SOURCE_KINDS.MANUAL,
) => (PROFILE_VALUE_SOURCE_KIND_KEYS.includes(value) ? value : fallback)

export const normalizeKnowledgePointIdsForTemplate = (ids = []) =>
  unique(Array.isArray(ids) ? ids.map((id) => normalizeId(id)).filter(Boolean) : []).slice(
    0,
    MAX_KNOWLEDGE_POINTS,
  )

export const createDefaultCapabilitiesForEntityType = (
  entityType = CONTACTS_ENTITY_TYPES.MAIN_ROLE,
) => {
  const type = normalizeContactsEntityType(entityType)
  if (type === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
    return {
      canAppearInChatDirectory: false,
      canUseFullRelationshipProgress: false,
      canUseMemoryGroups: false,
      canUseRouteProgression: false,
      canAppearInWorldEvents: true,
      canAppearInSocialFeed: true,
    }
  }
  if (type === CONTACTS_ENTITY_TYPES.NPC) {
    return {
      canAppearInChatDirectory: true,
      canUseFullRelationshipProgress: false,
      canUseMemoryGroups: false,
      canUseRouteProgression: false,
      canAppearInWorldEvents: true,
      canAppearInSocialFeed: true,
    }
  }
  return {
    canAppearInChatDirectory: true,
    canUseFullRelationshipProgress: true,
    canUseMemoryGroups: true,
    canUseRouteProgression: true,
    canAppearInWorldEvents: true,
    canAppearInSocialFeed: true,
  }
}

export const normalizeProfileCapabilities = (rawCapabilities = {}, entityType) => {
  const defaults = createDefaultCapabilitiesForEntityType(entityType)
  const source = rawCapabilities && typeof rawCapabilities === 'object' ? rawCapabilities : {}
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      typeof source[key] === 'boolean' ? source[key] : fallback,
    ]),
  )
}

export const normalizeProfileTemplateField = (rawField = {}, fallbackIndex = 0) => {
  const source = rawField && typeof rawField === 'object' ? rawField : {}
  const id = normalizeId(source.id, `field_${Math.max(0, toInt(fallbackIndex, 0))}`)
  const label = normalizeText(source.label || source.title || id, id, MAX_SHORT_TEXT)
  const entityTypes = unique(
    Array.isArray(source.entityTypes)
      ? source.entityTypes.filter((type) => CONTACTS_ENTITY_TYPE_KEYS.includes(type))
      : CONTACTS_ENTITY_TYPE_KEYS,
  )

  return {
    id,
    label,
    description: normalizeText(source.description || source.helpText, '', MAX_TEXT),
    type: normalizeProfileTemplateFieldType(source.type),
    defaultVisibilityLevel: normalizeProfileVisibilityLevel(source.defaultVisibilityLevel),
    entityTypes: entityTypes.length > 0 ? entityTypes : CONTACTS_ENTITY_TYPE_KEYS,
    options: unique(
      Array.isArray(source.options)
        ? source.options.map((option) => normalizeText(option, '', MAX_SHORT_TEXT)).filter(Boolean)
        : [],
    ).slice(0, MAX_OPTIONS),
    required: source.required === true,
    recommended: source.recommended !== false,
    order: Math.max(0, toInt(source.order, fallbackIndex)),
  }
}

export const normalizeProfileTemplateFields = (fields = []) => {
  if (!Array.isArray(fields)) return []
  const seen = new Set()
  return fields
    .map((field, index) => normalizeProfileTemplateField(field, index))
    .filter((field) => {
      if (seen.has(field.id)) return false
      seen.add(field.id)
      return true
    })
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .slice(0, MAX_FIELDS)
}

export const normalizeProfileTemplate = (rawTemplate = {}, fallbackIndex = 0) => {
  const source = rawTemplate && typeof rawTemplate === 'object' ? rawTemplate : {}
  const scope = normalizeProfileTemplateScope(source.scope)
  const id = normalizeId(source.id, `profile_template_${Date.now()}_${fallbackIndex}`)
  const now = Date.now()

  return {
    id,
    title: normalizeText(source.title || source.name || id, id, MAX_SHORT_TEXT),
    description: normalizeText(source.description || source.summary, '', MAX_TEXT),
    scope,
    worldId:
      scope === PROFILE_TEMPLATE_SCOPES.WORLD ? normalizeId(source.worldId, 'default_world') : '',
    enabled: source.enabled !== false,
    version: Math.max(1, toInt(source.version, 1)),
    fields: normalizeProfileTemplateFields(source.fields),
    createdAt: Math.max(0, toInt(source.createdAt, now)),
    updatedAt: Math.max(0, toInt(source.updatedAt, now)),
  }
}

export const normalizeProfileTemplates = (templates = []) => {
  if (!Array.isArray(templates)) return []
  const seen = new Set()
  return templates
    .map((template, index) => normalizeProfileTemplate(template, index))
    .filter((template) => {
      if (seen.has(template.id)) return false
      seen.add(template.id)
      return true
    })
}

export const normalizeProfileTemplateLink = (rawLink = {}) => {
  const source = rawLink && typeof rawLink === 'object' ? rawLink : {}
  return {
    primaryWorldId: normalizeId(source.primaryWorldId),
    profileTemplateId: normalizeId(source.profileTemplateId),
    profileTemplateVersion: Math.max(0, toInt(source.profileTemplateVersion, 0)),
    supplementalKnowledgePointIds: normalizeKnowledgePointIdsForTemplate(
      source.supplementalKnowledgePointIds || source.knowledgePointIds,
    ),
  }
}

export const normalizeProfileValue = (rawValue = {}, fallbackIndex = 0) => {
  const source = rawValue && typeof rawValue === 'object' ? rawValue : {}
  const fieldId = normalizeId(source.fieldId || source.id, `value_${fallbackIndex}`)
  return {
    id: normalizeId(source.id, `${fieldId}_${fallbackIndex}`),
    fieldId,
    value: Array.isArray(source.value)
      ? unique(source.value.map((item) => normalizeText(item, '', MAX_SHORT_TEXT)).filter(Boolean)).slice(
          0,
          MAX_OPTIONS,
        )
      : normalizeText(source.value, '', MAX_TEXT),
    visibilityLevel: normalizeProfileVisibilityLevel(source.visibilityLevel),
    sourceKind: normalizeProfileValueSourceKind(source.sourceKind),
    updatedAt: Math.max(0, toInt(source.updatedAt, Date.now())),
  }
}

export const normalizeProfileValues = (values = []) => {
  if (!Array.isArray(values)) return []
  const seen = new Set()
  return values
    .map((value, index) => normalizeProfileValue(value, index))
    .filter((value) => {
      if (seen.has(value.fieldId)) return false
      seen.add(value.fieldId)
      return Boolean(value.fieldId)
    })
    .slice(0, MAX_VALUES)
}

export const createDefaultProfileTemplatePresets = () =>
  normalizeProfileTemplates([
    {
      id: 'preset_basic_modern',
      title: 'Basic Modern Profile',
      description: 'Baseline identity, relationship, and habit fields for ordinary worlds.',
      scope: PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET,
      fields: [
        { id: 'identity', label: 'Identity', type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT },
        {
          id: 'relationship_setting',
          label: 'Relationship setting',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
        },
        {
          id: 'life_habit',
          label: 'Life habits',
          type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
        },
      ],
    },
    {
      id: 'preset_abo',
      title: 'ABO Profile',
      description: 'Secondary gender, pheromone, and bond-mark fields.',
      scope: PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET,
      fields: [
        {
          id: 'secondary_gender',
          label: 'Secondary gender',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
          options: ['Alpha', 'Beta', 'Omega'],
        },
        { id: 'pheromone', label: 'Pheromone', type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT },
        {
          id: 'bond_mark',
          label: 'Bond mark',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
        },
      ],
    },
    {
      id: 'preset_xianxia',
      title: 'Xianxia Profile',
      description: 'Cultivation, spiritual root, and sect/faction fields.',
      scope: PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET,
      fields: [
        {
          id: 'cultivation_stage',
          label: 'Cultivation stage',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
        },
        {
          id: 'spiritual_root',
          label: 'Spiritual root',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
        { id: 'sect', label: 'Sect', type: PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE },
      ],
    },
  ])
