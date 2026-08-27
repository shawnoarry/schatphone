export const CONTACTS_ENTITY_TYPES = Object.freeze({
  SELF_PROFILE: 'self_profile',
  MAIN_ROLE: 'main_role',
  SUPPORTING_ROLE: 'supporting_role',
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
  DATE: 'date',
  BOOLEAN: 'boolean',
  PERSON_REFERENCE: 'person_reference',
  ORGANIZATION_REFERENCE: 'organization_reference',
})

export const PROFILE_TEMPLATE_FIELD_TYPE_KEYS = Object.freeze(
  Object.values(PROFILE_TEMPLATE_FIELD_TYPES),
)

export const PROFILE_TEMPLATE_FIELD_PURPOSES = Object.freeze({
  CHAT_CONTEXT: 'chat_context',
  EVENT_ELIGIBILITY: 'event_eligibility',
  WORK_HUB_MATCHING: 'work_hub_matching',
  PUBLIC_CONTENT: 'public_content',
})

export const PROFILE_TEMPLATE_FIELD_PURPOSE_KEYS = Object.freeze(
  Object.values(PROFILE_TEMPLATE_FIELD_PURPOSES),
)

export const PROFILE_TEMPLATE_DEFAULT_CATEGORY_ID = 'general'

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
const MAX_CATEGORIES = 24
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
  purposes: Array.isArray(field.purposes) ? [...field.purposes] : [],
})

const cloneTemplateCategory = (category = {}) => ({ ...category })

export const cloneProfileTemplate = (template = {}) => ({
  ...template,
  categories: Array.isArray(template.categories)
    ? template.categories.map(cloneTemplateCategory)
    : [],
  fields: Array.isArray(template.fields) ? template.fields.map(cloneTemplateField) : [],
})

export const cloneProfileExtensions = (extensions = {}) => ({
  categories: Array.isArray(extensions?.categories)
    ? extensions.categories.map(cloneTemplateCategory)
    : [],
  fields: Array.isArray(extensions?.fields)
    ? extensions.fields.map(cloneTemplateField)
    : [],
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

const EVENT_ELIGIBILITY_FIELD_TYPES = new Set([
  PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
  PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
  PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
  PROFILE_TEMPLATE_FIELD_TYPES.DATE,
  PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN,
  PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE,
  PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
])

const WORK_HUB_MATCHING_FIELD_TYPES = new Set([
  PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
  PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
  PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
  PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE,
  PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
])

export const listAllowedProfileTemplateFieldPurposes = (
  fieldType = PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
) => {
  const type = normalizeProfileTemplateFieldType(fieldType)
  return PROFILE_TEMPLATE_FIELD_PURPOSE_KEYS.filter((purpose) => {
    if (purpose === PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY) {
      return EVENT_ELIGIBILITY_FIELD_TYPES.has(type)
    }
    if (purpose === PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING) {
      return WORK_HUB_MATCHING_FIELD_TYPES.has(type)
    }
    return true
  })
}

export const normalizeProfileTemplateFieldPurposes = (purposes = [], fieldType) => {
  const allowed = new Set(listAllowedProfileTemplateFieldPurposes(fieldType))
  return unique(
    Array.isArray(purposes)
      ? purposes.filter((purpose) => PROFILE_TEMPLATE_FIELD_PURPOSE_KEYS.includes(purpose))
      : [],
  ).filter((purpose) => allowed.has(purpose))
}

export const normalizeProfileVisibilityLevel = (
  value,
  fallback = PROFILE_VISIBILITY_LEVELS.FAMILIAR,
) => (PROFILE_VISIBILITY_LEVEL_KEYS.includes(value) ? value : fallback)

export const normalizeProfileValueSourceKind = (
  value,
  fallback = PROFILE_VALUE_SOURCE_KINDS.MANUAL,
) => (PROFILE_VALUE_SOURCE_KIND_KEYS.includes(value) ? value : fallback)

const createManagedProfileTemplateId = (prefix, {
  occupiedIds = [],
  now = Date.now(),
  random = Math.random(),
} = {}) => {
  const occupied = new Set(
    Array.isArray(occupiedIds) ? occupiedIds.map((id) => normalizeId(id)).filter(Boolean) : [],
  )
  const timestamp = Math.max(0, toInt(now, Date.now()))
  const randomPart = Math.max(0, Math.floor(Number(random) * 0xffffff))
    .toString(36)
    .padStart(5, '0')
  const base = `${prefix}_${timestamp}_${randomPart}`.slice(0, MAX_ID)
  let candidate = base
  let suffix = 2
  while (occupied.has(candidate)) {
    candidate = `${base.slice(0, Math.max(1, MAX_ID - String(suffix).length - 1))}_${suffix}`
    suffix += 1
  }
  return candidate
}

export const createProfileTemplateFieldId = (options = {}) =>
  createManagedProfileTemplateId('profile_field', options)

export const createProfileTemplateCategoryId = (options = {}) =>
  createManagedProfileTemplateId('profile_category', options)

export const normalizeKnowledgePointIdsForTemplate = (ids = []) =>
  unique(Array.isArray(ids) ? ids.map((id) => normalizeId(id)).filter(Boolean) : []).slice(
    0,
    MAX_KNOWLEDGE_POINTS,
  )

export const normalizeProfileTemplateCategory = (rawCategory = {}, fallbackIndex = 0) => {
  const source = rawCategory && typeof rawCategory === 'object' ? rawCategory : {}
  const id = normalizeId(source.id, `category_${Math.max(0, toInt(fallbackIndex, 0))}`)

  return {
    id,
    label: normalizeText(source.label || source.title || id, id, MAX_SHORT_TEXT),
    description: normalizeText(source.description || source.helpText, '', MAX_TEXT),
    order: Math.max(0, toInt(source.order, fallbackIndex)),
  }
}

export const normalizeProfileTemplateCategories = (categories = []) => {
  if (!Array.isArray(categories)) return []
  const seen = new Set()
  return categories
    .map((category, index) => normalizeProfileTemplateCategory(category, index))
    .filter((category) => {
      if (seen.has(category.id)) return false
      seen.add(category.id)
      return true
    })
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .slice(0, MAX_CATEGORIES)
}

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
  if (type === CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE) {
    return {
      canAppearInChatDirectory: true,
      canUseFullRelationshipProgress: false,
      canUseMemoryGroups: true,
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
  const type = normalizeProfileTemplateFieldType(source.type)

  return {
    id,
    categoryId: normalizeId(source.categoryId || source.sectionId, ''),
    label,
    description: normalizeText(source.description || source.helpText, '', MAX_TEXT),
    type,
    defaultVisibilityLevel: normalizeProfileVisibilityLevel(source.defaultVisibilityLevel),
    entityTypes: entityTypes.length > 0 ? entityTypes : CONTACTS_ENTITY_TYPE_KEYS,
    options: unique(
      Array.isArray(source.options)
        ? source.options.map((option) => normalizeText(option, '', MAX_SHORT_TEXT)).filter(Boolean)
        : [],
    ).slice(0, MAX_OPTIONS),
    purposes: normalizeProfileTemplateFieldPurposes(
      source.purposes || source.usageScopes,
      type,
    ),
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

export const normalizeProfileExtensions = (rawExtensions = {}) => {
  const source = rawExtensions && typeof rawExtensions === 'object' ? rawExtensions : {}
  return {
    categories: normalizeProfileTemplateCategories(source.categories),
    fields: normalizeProfileTemplateFields(source.fields),
  }
}

export const mergeProfileTemplateExtensions = ({
  templateCategories = [],
  templateFields = [],
  profileExtensions = {},
} = {}) => {
  const normalizedTemplateCategories = Array.isArray(templateCategories)
    ? templateCategories.map(cloneTemplateCategory)
    : []
  const normalizedTemplateFields = Array.isArray(templateFields)
    ? templateFields.map((field = {}) => ({
        ...field,
        ...(Array.isArray(field.entityTypes) ? { entityTypes: [...field.entityTypes] } : {}),
        ...(Array.isArray(field.options) ? { options: [...field.options] } : {}),
        ...(Array.isArray(field.purposes) ? { purposes: [...field.purposes] } : {}),
      }))
    : []
  const normalizedExtensions = normalizeProfileExtensions(profileExtensions)
  const templateCategoryIds = new Set(normalizedTemplateCategories.map((category) => category.id))
  const templateFieldIds = new Set(normalizedTemplateFields.map((field) => field.id))
  const personCategories = normalizedExtensions.categories.filter(
    (category) => !templateCategoryIds.has(category.id),
  )
  const personFields = normalizedExtensions.fields.filter((field) => !templateFieldIds.has(field.id))
  const categories = [...normalizedTemplateCategories, ...personCategories]
  const fields = [...normalizedTemplateFields, ...personFields]

  if (fields.length > 0 && categories.length === 0) {
    categories.push(
      normalizeProfileTemplateCategory({
        id: PROFILE_TEMPLATE_DEFAULT_CATEGORY_ID,
        label: 'General',
        order: 0,
      }),
    )
  }

  return {
    categories,
    fields,
    personCategoryIds: personCategories.map((category) => category.id),
    personFieldIds: personFields.map((field) => field.id),
  }
}

export const createProfileExtensionCategoryId = ({
  templateCategories = [],
  profileExtensions = {},
  occupiedIds = [],
  ...options
} = {}) =>
  createProfileTemplateCategoryId({
    ...options,
    occupiedIds: [
      ...occupiedIds,
      ...templateCategories.map((category) => category?.id),
      ...(Array.isArray(profileExtensions?.categories)
        ? profileExtensions.categories.map((category) => category?.id)
        : []),
    ],
  })

export const createProfileExtensionFieldId = ({
  templateFields = [],
  profileExtensions = {},
  occupiedIds = [],
  ...options
} = {}) =>
  createProfileTemplateFieldId({
    ...options,
    occupiedIds: [
      ...occupiedIds,
      ...templateFields.map((field) => field?.id),
      ...(Array.isArray(profileExtensions?.fields)
        ? profileExtensions.fields.map((field) => field?.id)
        : []),
    ],
  })

export const normalizeProfileTemplate = (rawTemplate = {}, fallbackIndex = 0) => {
  const source = rawTemplate && typeof rawTemplate === 'object' ? rawTemplate : {}
  const scope = normalizeProfileTemplateScope(source.scope)
  const id = normalizeId(source.id, `profile_template_${Date.now()}_${fallbackIndex}`)
  const now = Date.now()
  const normalizedFields = normalizeProfileTemplateFields(source.fields)
  const normalizedCategories = normalizeProfileTemplateCategories(source.categories)
  const categories =
    normalizedFields.length > 0 && normalizedCategories.length === 0
      ? [
          normalizeProfileTemplateCategory({
            id: PROFILE_TEMPLATE_DEFAULT_CATEGORY_ID,
            label: 'General',
            order: 0,
          }),
        ]
      : normalizedCategories
  const categoryIds = new Set(categories.map((category) => category.id))
  const fallbackCategoryId = categories[0]?.id || ''
  const fields = normalizedFields.map((field) => ({
    ...field,
    categoryId: categoryIds.has(field.categoryId) ? field.categoryId : fallbackCategoryId,
  }))

  return {
    id,
    title: normalizeText(source.title || source.name || id, id, MAX_SHORT_TEXT),
    description: normalizeText(source.description || source.summary, '', MAX_TEXT),
    scope,
    worldId:
      scope === PROFILE_TEMPLATE_SCOPES.WORLD ? normalizeId(source.worldId, 'default_world') : '',
    enabled: source.enabled !== false,
    version: Math.max(1, toInt(source.version, 1)),
    categories,
    fields,
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
