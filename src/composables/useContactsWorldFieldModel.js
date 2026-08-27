import { computed } from 'vue'
import { buildProfileTemplateAdaptationReview } from '../lib/profile-template-adaptation-assistant'
import {
  PROFILE_TEMPLATE_DEFAULT_CATEGORY_ID,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_VISIBILITY_LEVELS,
  mergeProfileTemplateExtensions,
} from '../lib/profile-template-schema'

const defaultT = (zh, en) => en || zh

const readValue = (source) => (source && typeof source === 'object' && 'value' in source ? source.value : source)
const readArray = (source) => {
  const value = readValue(source)
  return Array.isArray(value) ? value : []
}

const profileTemplateCategoryLabel = (category = {}, t = defaultT) => {
  const label = String(category?.label || category?.title || '').trim()
  if (category?.id === PROFILE_TEMPLATE_DEFAULT_CATEGORY_ID && (!label || label === 'General')) {
    return t('基本资料', 'General')
  }
  return label || t('人物资料', 'Profile details')
}

const buildCategoryPrompt = (rows = [], t = defaultT) => {
  const missingRequired = rows.filter((row) => row.isMissing && row.required)
  const missingRecommended = rows.filter(
    (row) => row.isMissing && !row.required && row.recommended,
  )
  const candidates = missingRequired.length > 0 ? missingRequired : missingRecommended
  if (candidates.length === 0) return ''

  const labels = [...new Set(candidates.map((row) => row.title).filter(Boolean))]
  const visibleLabels = labels.slice(0, 2)
  const zhFields = `${visibleLabels.join('、')}${labels.length > 2 ? '等资料' : ''}`
  const enFields = `${visibleLabels.join(' and ')}${labels.length > 2 ? ' and other details' : ''}`
  return missingRequired.length > 0
    ? t(`请补充${zhFields}。`, `Add ${enFields}.`)
    : t(`建议补充${zhFields}。`, `Consider adding ${enFields}.`)
}

export const createProfileTemplateVisibilityOptions = (t = defaultT) => [
  { value: PROFILE_VISIBILITY_LEVELS.PUBLIC, label: t('\u516c\u5f00\u8d44\u6599', 'Public') },
  { value: PROFILE_VISIBILITY_LEVELS.FAMILIAR, label: t('\u719f\u6089\u540e\u77e5\u9053', 'Familiar') },
  { value: PROFILE_VISIBILITY_LEVELS.INTIMATE, label: t('\u4eb2\u5bc6\u540e\u77e5\u9053', 'Intimate') },
  { value: PROFILE_VISIBILITY_LEVELS.HIDDEN, label: t('\u9690\u85cf\u8bbe\u5b9a', 'Hidden') },
  { value: PROFILE_VISIBILITY_LEVELS.WORLD_SPECIFIC, label: t('\u4e16\u754c\u4e13\u5c5e', 'World-specific') },
]

export const formatContactsProfileTemplateOption = (template = {}, t = defaultT) => {
  if (template.scope === PROFILE_TEMPLATE_SCOPES.WORLD) {
    return t(`\u5f53\u524d\u4e16\u754c \u00b7 ${template.title}`, `Current world \u00b7 ${template.title}`)
  }
  return t(`\u901a\u7528 \u00b7 ${template.title}`, `Universal \u00b7 ${template.title}`)
}

export const fieldMatchesProfileEntity = (field = {}, entityType = '') => {
  const entityTypes = Array.isArray(field.entityTypes) ? field.entityTypes : []
  return entityTypes.length === 0 || entityTypes.includes(entityType)
}

export const formatProfileValue = (value, field = {}, t = defaultT) => {
  if (Array.isArray(value?.value)) return value.value.join(', ')
  const rawValue = typeof value?.value === 'string' ? value.value : ''
  if (field?.type === PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN) {
    if (rawValue === 'true') return t('\u662f', 'Yes')
    if (rawValue === 'false') return t('\u5426', 'No')
  }
  return rawValue
}

export const profileVisibilityLevelLabel = (level = '', options = [], t = defaultT) =>
  options.find((option) => option.value === level)?.label || t('\u719f\u6089\u540e\u77e5\u9053', 'Familiar')

export const buildProfileValueLabel = (value, templateFields = [], t = defaultT) => {
  if (!value?.fieldId) return t('\u81ea\u5b9a\u4e49\u5b57\u6bb5', 'Custom field')
  const matchedField = templateFields.find((field) => field.id === value.fieldId)
  if (matchedField?.label) return matchedField.label
  if (value.fieldId === 'pheromone') return t('\u4fe1\u606f\u7d20', 'Pheromone')
  if (value.fieldId === 'relationship_setting') return t('\u5173\u7cfb\u8bbe\u5b9a', 'Relationship setting')
  return value.fieldId
}

export const profileTemplateAdaptationTitle = (review = {}, t = defaultT) => {
  if (review.reason === 'no_template') {
    return t(
      '\u8fd9\u4e2a\u4eba\u7269\u8fd8\u6ca1\u6709\u5957\u7528\u5f53\u524d\u4e16\u754c\u7684\u6863\u6848\u6a21\u677f\u3002',
      'This person has no current-world profile template yet.',
    )
  }
  if (review.reason === 'missing_template') {
    return t(
      '\u8fd9\u4e2a\u4eba\u7269\u4f7f\u7528\u7684\u65e7\u6a21\u677f\u5f53\u524d\u4e0d\u53ef\u7528\u3002',
      'This person uses a template that is not available here.',
    )
  }
  if (review.reason === 'outside_current_world') {
    return t(
      '\u8fd9\u4e2a\u4eba\u7269\u7684\u6863\u6848\u6765\u81ea\u53e6\u4e00\u4e2a\u4e16\u754c\u6a21\u677f\u3002',
      'This profile comes from another world template.',
    )
  }
  if (review.reason === 'outdated_template') {
    return t(
      '\u8fd9\u4e2a\u4eba\u7269\u4f7f\u7528\u7684\u662f\u65e7\u7248\u672c\u6a21\u677f\u3002',
      'This profile uses an older template version.',
    )
  }
  return t(
    '\u8fd9\u4e2a\u4eba\u7269\u7684\u4e16\u754c\u6863\u6848\u53ef\u4ee5\u7ee7\u7eed\u4f7f\u7528\u3002',
    'This world profile can continue to be used.',
  )
}

export const profileTemplateAdaptationSummary = (review = {}, t = defaultT) => {
  const target = review.recommendedTemplateTitle || t('\u5f53\u524d\u4e16\u754c\u6a21\u677f', 'current-world template')
  return t(
    `\u5efa\u8bae\u9002\u914d\u5230\u300c${target}\u300d\u3002AI \u53ea\u4f1a\u751f\u6210\u8349\u7a3f\uff0c\u65e7\u5b57\u6bb5\u4f1a\u4fdd\u7559\u4e3a\u81ea\u5b9a\u4e49\u5b57\u6bb5\uff0c\u786e\u8ba4\u4fdd\u5b58\u540e\u624d\u4f1a\u66f4\u65b0\u8fd9\u4e2a\u4eba\u7269\u3002`,
    `Suggested target: ${target}. AI will only create a draft; old fields stay as custom fields until you review and save.`,
  )
}

const buildWorldFieldRow = ({
  key,
  field = null,
  value = null,
  title = '',
  description = '',
  isTemplateField = false,
  isPersonExtension = false,
  visibilityOptions = [],
  t = defaultT,
} = {}) => {
  const visibilityLevel = value?.visibilityLevel || field?.defaultVisibilityLevel || ''
  const visibilityLabel = profileVisibilityLevelLabel(visibilityLevel, visibilityOptions, t)
  const displayValue = formatProfileValue(value, field, t)

  return {
    key,
    field,
    value,
    title,
    description,
    isTemplateField,
    isPersonExtension,
    displayValue,
    isMissing: !displayValue,
    required: field?.required === true,
    recommended: field ? field.recommended !== false : false,
    visibilityLevel,
    visibilityLabel,
    badgeLabel: isTemplateField
      ? visibilityLabel
      : isPersonExtension
        ? t(`${visibilityLabel} \u00b7 \u4eba\u7269\u4e13\u5c5e`, `${visibilityLabel} \u00b7 Person only`)
        : value
          ? t(`${visibilityLabel} \u00b7 \u81ea\u5b9a\u4e49`, `${visibilityLabel} \u00b7 Custom`)
          : t('\u81ea\u5b9a\u4e49\u5b57\u6bb5', 'Custom field'),
  }
}

export function useContactsWorldFieldModel({
  selectedProfile,
  selectedProfileEntityType,
  selectedProfileValues,
  selectedProfileExtensions,
  currentWorldProfileTemplates,
  universalProfileTemplates,
  currentContactsWorldId,
  getProfileTemplateById = () => null,
  t = defaultT,
} = {}) {
  const profileTemplateVisibilityOptions = computed(() => createProfileTemplateVisibilityOptions(t))

  const contactsProfileTemplateOptions = computed(() => {
    const orderedTemplates = [
      ...readArray(currentWorldProfileTemplates),
      ...readArray(universalProfileTemplates),
    ]
    const profile = readValue(selectedProfile) || {}
    const selectedTemplateId = profile.templateLink?.profileTemplateId || ''
    const selectedTemplate = selectedTemplateId ? getProfileTemplateById(selectedTemplateId) : null
    const templates = selectedTemplate ? [...orderedTemplates, selectedTemplate] : orderedTemplates
    const seen = new Set()
    return templates.filter((template) => {
      if (!template?.id || seen.has(template.id)) return false
      seen.add(template.id)
      return true
    })
  })

  const selectedProfileTemplate = computed(() => {
    const profile = readValue(selectedProfile) || {}
    const templateId = profile.templateLink?.profileTemplateId || ''
    return templateId ? getProfileTemplateById(templateId) : null
  })

  const selectedProfileTemplateAdaptationReview = computed(() =>
    {
      const currentTemplates = readArray(currentWorldProfileTemplates)
      return buildProfileTemplateAdaptationReview({
        profile: readValue(selectedProfile) || {},
        currentTemplate: selectedProfileTemplate.value,
        currentWorldTemplates: currentTemplates,
        currentWorldTemplateIds: currentTemplates.map((template) => template?.id).filter(Boolean),
        currentWorldId: readValue(currentContactsWorldId),
      })
    },
  )

  const fieldMatchesSelectedProfileEntity = (field = {}) =>
    fieldMatchesProfileEntity(field, readValue(selectedProfileEntityType))

  const selectedProfileTemplateFields = computed(() =>
    Array.isArray(selectedProfileTemplate.value?.fields)
      ? selectedProfileTemplate.value.fields.filter(fieldMatchesSelectedProfileEntity)
      : [],
  )

  const selectedProfileFieldStructure = computed(() => {
    const template = selectedProfileTemplate.value
    return mergeProfileTemplateExtensions({
      templateCategories: Array.isArray(template?.categories) ? template.categories : [],
      templateFields: selectedProfileTemplateFields.value,
      profileExtensions: readValue(selectedProfileExtensions) || {},
    })
  })

  const selectedProfileTemplateCategories = computed(
    () => selectedProfileFieldStructure.value.categories,
  )

  const selectedProfilePersonFieldIds = computed(
    () => new Set(selectedProfileFieldStructure.value.personFieldIds),
  )

  const selectedProfilePersonCategoryIds = computed(
    () => new Set(selectedProfileFieldStructure.value.personCategoryIds),
  )

  const selectedProfileFields = computed(() =>
    selectedProfileFieldStructure.value.fields.filter(fieldMatchesSelectedProfileEntity),
  )

  const selectedProfileValueMap = computed(() => {
    const map = new Map()
    readArray(selectedProfileValues).forEach((value) => {
      if (value?.fieldId) map.set(value.fieldId, value)
    })
    return map
  })

  const profileValueLabel = (value) =>
    buildProfileValueLabel(value, selectedProfileFields.value, t)

  const selectedProfileWorldFieldRows = computed(() => {
    const templateFieldIds = new Set(selectedProfileTemplateFields.value.map((field) => field.id))
    const knownFieldIds = new Set(selectedProfileFields.value.map((field) => field.id))
    const visibilityOptions = profileTemplateVisibilityOptions.value
    const knownRows = selectedProfileFields.value.map((field) =>
      buildWorldFieldRow({
        key: field.id,
        field,
        value: selectedProfileValueMap.value.get(field.id) || null,
        title: field.label || field.id,
        description: field.description || '',
        isTemplateField: templateFieldIds.has(field.id),
        isPersonExtension: selectedProfilePersonFieldIds.value.has(field.id),
        visibilityOptions,
        t,
      }),
    )
    const extraRows = readArray(selectedProfileValues)
      .filter((value) => value?.fieldId && !knownFieldIds.has(value.fieldId))
      .map((value) =>
        buildWorldFieldRow({
          key: value.fieldId,
          field: null,
          value,
          title: profileValueLabel(value),
          description: '',
          isTemplateField: false,
          isPersonExtension: false,
          visibilityOptions,
          t,
        }),
      )
    return [...knownRows, ...extraRows]
  })

  const selectedProfileWorldFieldGroups = computed(() => {
    const rows = selectedProfileWorldFieldRows.value
    const knownRows = rows.filter((row) => row.isTemplateField || row.isPersonExtension)
    const customRows = rows.filter((row) => !row.isTemplateField && !row.isPersonExtension)
    const categories = selectedProfileTemplateCategories.value
    const fallbackCategoryId = categories[0]?.id || PROFILE_TEMPLATE_DEFAULT_CATEGORY_ID
    const groups = categories
      .map((category) => {
        const categoryRows = knownRows.filter(
          (row) => (row.field?.categoryId || fallbackCategoryId) === category.id,
        )
        if (categoryRows.length === 0) return null
        const filledRows = categoryRows.filter((row) => !row.isMissing)
        return {
          key: category.id,
          label: profileTemplateCategoryLabel(category, t),
          description: category.description || '',
          rows: categoryRows,
          filledRows,
          promptText: buildCategoryPrompt(categoryRows, t),
          emptyText: t('暂时没有已填写内容。', 'No saved details yet.'),
          isCustom: false,
          isPersonExtension: selectedProfilePersonCategoryIds.value.has(category.id),
        }
      })
      .filter(Boolean)

    if (customRows.length > 0) {
      groups.push({
        key: 'custom_details',
        label: t('补充资料', 'Custom details'),
        description: t(
          '这些内容来自旧模板或人物原有资料，仍会继续保留。',
          'These details came from an older template or this person\'s existing profile and remain preserved.',
        ),
        rows: customRows,
        filledRows: customRows.filter((row) => !row.isMissing),
        promptText: '',
        emptyText: t('暂时没有已填写内容。', 'No saved details yet.'),
        isCustom: true,
        isPersonExtension: false,
      })
    }

    return groups
  })

  const selectedWorldFieldIntroText = computed(() =>
    selectedProfileTemplate.value
      ? t(
          `\u6765\u81ea\u6a21\u677f\uff1a${selectedProfileTemplate.value.title}`,
          `From template: ${selectedProfileTemplate.value.title}`,
        )
      : t(
          '\u8fd9\u91cc\u586b\u5199\u7531\u4e16\u754c\u4e66\u6a21\u677f\u5b9a\u4e49\u7684\u89d2\u8272\u3001\u7528\u6237\u6863\u6848\u6216 NPC \u4e13\u5c5e\u8d44\u6599\u3002',
          'Fill concrete role, self-profile, or NPC values defined by WorldBook templates.',
        ),
  )

  const selectedProfileTemplateAdaptationDisplay = computed(() => {
    const review = selectedProfileTemplateAdaptationReview.value || {}
    return {
      needsAttention: Boolean(review.needsAttention),
      title: profileTemplateAdaptationTitle(review, t),
      summary: profileTemplateAdaptationSummary(review, t),
      facts: [
        {
          key: 'recommended-template',
          text: t(
            `\u63a8\u8350\u6a21\u677f\uff1a${review.recommendedTemplateTitle} \u00b7 v${review.recommendedTemplateVersion}`,
            `Recommended template: ${review.recommendedTemplateTitle} \u00b7 v${review.recommendedTemplateVersion}`,
          ),
        },
        {
          key: 'shared-values',
          text: t(
            `\u53ef\u76f4\u63a5\u6cbf\u7528\u7684\u5b57\u6bb5\uff1a${review.sharedValueCount} \u9879`,
            `Reusable existing field(s): ${review.sharedValueCount}`,
          ),
        },
        {
          key: 'preserved-custom',
          text: t(
            `\u4f1a\u4fdd\u7559\u4e3a\u81ea\u5b9a\u4e49\u5b57\u6bb5\uff1a${review.preservedCustomCount} \u9879`,
            `Will stay as custom field(s): ${review.preservedCustomCount}`,
          ),
        },
      ],
    }
  })

  return {
    contactsProfileTemplateOptions,
    fieldMatchesSelectedProfileEntity,
    formatContactsProfileTemplateOption: (template = {}) => formatContactsProfileTemplateOption(template, t),
    formatProfileValue,
    profileTemplateVisibilityOptions,
    profileValueLabel,
    profileVisibilityLevelLabel: (level = '') =>
      profileVisibilityLevelLabel(level, profileTemplateVisibilityOptions.value, t),
    selectedProfileTemplate,
    selectedProfileTemplateCategories,
    selectedProfileFields,
    selectedProfilePersonCategoryIds,
    selectedProfilePersonFieldIds,
    selectedProfileTemplateAdaptationDisplay,
    selectedProfileTemplateAdaptationReview,
    selectedProfileTemplateFields,
    selectedProfileValueMap,
    selectedProfileWorldFieldGroups,
    selectedProfileWorldFieldRows,
    selectedWorldFieldIntroText,
  }
}
