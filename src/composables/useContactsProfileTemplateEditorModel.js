import { computed } from 'vue'
import { PROFILE_TEMPLATE_FIELD_TYPES } from '../lib/profile-template-schema'

const defaultT = (zh, en) => en || zh

const readValue = (source) => (source && typeof source === 'object' && 'value' in source ? source.value : source)
const readArray = (source) => {
  const value = readValue(source)
  return Array.isArray(value) ? value : []
}

const readDraftValue = (draft, fieldId = '') => String(draft?.values?.[fieldId] || '')

export const profileTemplateFieldPlaceholder = (field = {}, t = defaultT) => {
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) {
    return t('\u7528\u9017\u53f7\u5206\u9694\u591a\u4e2a\u6807\u7b7e', 'Separate tags with commas')
  }
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE) {
    return t('\u586b\u5199\u76f8\u5173\u4eba\u7269\u6216\u89d2\u8272 ID', 'Enter related person or role ID')
  }
  return t('\u586b\u5199\u8fd9\u4e2a\u89d2\u8272\u7684\u5177\u4f53\u503c', 'Enter this profile value')
}

export const profileTemplateFieldTypeLabel = (field = {}, t = defaultT) => {
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT) return t('\u957f\u6587\u672c', 'Notes')
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT) return t('\u5355\u9009', 'Choice')
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) return t('\u6807\u7b7e', 'Tags')
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE) return t('\u4eba\u7269', 'Person')
  return t('\u6587\u672c', 'Text')
}

export const profileTemplateFieldIconClass = (field = {}) => {
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT) return 'fas fa-align-left'
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT) return 'fas fa-list-ul'
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) return 'fas fa-tags'
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE) return 'fas fa-user-tag'
  return 'fas fa-pen'
}

export const profileTemplateFieldHelper = (field = {}, t = defaultT) => {
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) {
    return t(
      '\u7528\u9017\u53f7\u5206\u9694\u591a\u4e2a\u6807\u7b7e\uff0c\u4f1a\u4fdd\u5b58\u6210\u8fd9\u4e2a\u4eba\u7269\u7684\u6807\u7b7e\u5217\u8868\u3002',
      'Use commas to separate tags. They save as this person\u2019s tag list.',
    )
  }
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE) {
    return t(
      '\u586b\u5199\u76f8\u5173\u4eba\u7269\u59d3\u540d\u6216\u89d2\u8272 ID\uff1b\u6b63\u5f0f\u9009\u62e9\u5668\u540e\u7eed\u518d\u63a5\u5165\u3002',
      'Enter a related person or role ID; a picker can be added later.',
    )
  }
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT) {
    return t(
      '\u9002\u5408\u8bb0\u5f55\u8f83\u957f\u7684\u79c1\u8bbe\u3001\u5173\u7cfb\u80cc\u666f\u6216\u4e16\u754c\u89c2\u8865\u5145\u3002',
      'Use this for longer private context, relationship background, or world-specific notes.',
    )
  }
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT) {
    return field.options?.length > 0
      ? t('\u4ece\u5f53\u524d\u4e16\u754c\u6a21\u677f\u7ed9\u51fa\u7684\u9009\u9879\u4e2d\u9009\u62e9\u4e00\u4e2a\u3002', 'Choose one option from this world template.')
      : t('\u5f53\u524d\u6a21\u677f\u6ca1\u6709\u56fa\u5b9a\u9009\u9879\uff0c\u53ef\u5148\u586b\u5199\u81ea\u5b9a\u4e49\u503c\u3002', 'No fixed options yet; enter a custom value for this world.')
  }
  return t('\u586b\u5199\u8fd9\u4e2a\u4eba\u7269\u5728\u5f53\u524d\u4e16\u754c\u91cc\u7684\u5177\u4f53\u503c\u3002', 'Enter this person\u2019s concrete value in the current world.')
}

export const profileTemplateDraftTagList = (field = {}, draft = {}) => {
  if (field.type !== PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) return []
  return readDraftValue(draft, field.id)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
}

export const buildProfileTemplateEditorFieldRow = (field = {}, draft = {}, t = defaultT) => ({
  ...field,
  key: field.id,
  iconClass: profileTemplateFieldIconClass(field),
  typeLabel: profileTemplateFieldTypeLabel(field, t),
  helper: profileTemplateFieldHelper(field, t),
  placeholder: profileTemplateFieldPlaceholder(field, t),
  tagPreview: profileTemplateDraftTagList(field, draft),
  hasTagPreview: field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
  controlKind:
    field.type === PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT && field.options?.length > 0
      ? 'select'
      : field.type === PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT
        ? 'textarea'
        : 'input',
})

export function useContactsProfileTemplateEditorModel({
  profileTemplateDraft,
  selectedProfileValues,
  fieldMatchesSelectedProfileEntity = () => true,
  getProfileTemplateById = () => null,
  formatProfileValue = () => '',
  profileValueLabel = (value) => value?.fieldId || '',
  profileVisibilityLevelLabel = () => '',
  t = defaultT,
} = {}) {
  const profileTemplateDraftTemplate = computed(() =>
    profileTemplateDraft?.templateId
      ? getProfileTemplateById(profileTemplateDraft.templateId)
      : null,
  )

  const profileTemplateDraftFields = computed(() =>
    Array.isArray(profileTemplateDraftTemplate.value?.fields)
      ? profileTemplateDraftTemplate.value.fields.filter(fieldMatchesSelectedProfileEntity)
      : [],
  )

  const profileTemplateDraftFieldIds = computed(
    () => new Set(profileTemplateDraftFields.value.map((field) => field.id).filter(Boolean)),
  )

  const profileTemplateDraftPreservedValues = computed(() =>
    readArray(selectedProfileValues).filter(
      (value) => value?.fieldId && !profileTemplateDraftFieldIds.value.has(value.fieldId),
    ),
  )

  const profileTemplateDraftPreservedRows = computed(() =>
    profileTemplateDraftPreservedValues.value.map((value) => ({
      key: value.fieldId,
      fieldId: value.fieldId,
      title: profileValueLabel(value),
      value: formatProfileValue(value),
      visibility: profileVisibilityLevelLabel(value.visibilityLevel),
    })),
  )

  const profileTemplateDraftFieldRows = computed(() =>
    profileTemplateDraftFields.value.map((field) =>
      buildProfileTemplateEditorFieldRow(field, profileTemplateDraft, t),
    ),
  )

  const profileTemplateChangeReview = computed(() => ({
    updateCount: profileTemplateDraftFields.value.length,
    preservedCount: profileTemplateDraftPreservedRows.value.length,
    title: t('\u4fdd\u5b58\u524d\u9884\u89c8', 'Save review'),
    summary: t(
      '\u6362\u6a21\u677f\u4e0d\u4f1a\u9759\u9ed8\u5220\u9664\u65e7\u8d44\u6599\uff1b\u4fdd\u5b58\u524d\u5148\u786e\u8ba4\u66f4\u65b0\u548c\u4fdd\u7559\u8303\u56f4\u3002',
      'Changing templates will not silently delete old details; review what updates and what stays.',
    ),
    facts: [
      {
        key: 'updated-fields',
        text: t(
          `\u8fd9\u4e9b\u5b57\u6bb5\u4f1a\u66f4\u65b0\u5230\u5f53\u524d\u89d2\u8272\u6863\u6848\uff1a${profileTemplateDraftFields.value.length} \u9879`,
          `These fields will update this profile: ${profileTemplateDraftFields.value.length}`,
        ),
      },
      {
        key: 'preserved-custom',
        text: t(
          `\u4e0d\u5c5e\u4e8e\u8fd9\u4e2a\u6a21\u677f\u7684\u65e7\u5b57\u6bb5\u4f1a\u4fdd\u7559\u4e3a\u81ea\u5b9a\u4e49\u5b57\u6bb5\uff1a${profileTemplateDraftPreservedRows.value.length} \u9879`,
          `Old fields will stay as custom fields: ${profileTemplateDraftPreservedRows.value.length}`,
        ),
      },
      {
        key: 'cleanup-policy',
        text: t(
          '\u5982\u9700\u5220\u9664\u65e7\u5b57\u6bb5\uff0c\u8bf7\u5728\u89d2\u8272\u6863\u6848\u4e2d\u5355\u72ec\u6e05\u7406\u3002',
          'To delete old fields, clean them up separately in the role profile.',
        ),
      },
    ],
  }))

  const emptyTemplateFieldText = computed(() =>
    t(
      '\u8fd9\u4e2a\u6a21\u677f\u6ca1\u6709\u9002\u7528\u4e8e\u5f53\u524d\u4eba\u7269\u7c7b\u578b\u7684\u5b57\u6bb5\u3002',
      'This template has no fields for this profile type.',
    ),
  )

  const emptyTemplateOptionsText = computed(() =>
    t(
      '\u5f53\u524d\u4e16\u754c\u8fd8\u6ca1\u6709\u89d2\u8272\u6863\u6848\u6a21\u677f\u3002\u5148\u5230\u4e16\u754c\u4e66\u590d\u5236\u6216\u5efa\u7acb\u6a21\u677f\uff0c\u518d\u56de\u6765\u586b\u5199\u89d2\u8272\u503c\u3002',
      'This world has no role profile template yet. Create or copy one in WorldBook first.',
    ),
  )

  const tagPreviewEmptyText = computed(() =>
    t('\u8f93\u5165\u540e\u4f1a\u5728\u8fd9\u91cc\u9884\u89c8\u6807\u7b7e', 'Tags preview here as you type'),
  )

  return {
    profileTemplateDraftTemplate,
    profileTemplateDraftFields,
    profileTemplateDraftFieldIds,
    profileTemplateDraftFieldRows,
    profileTemplateDraftPreservedValues,
    profileTemplateDraftPreservedRows,
    profileTemplateChangeReview,
    emptyTemplateFieldText,
    emptyTemplateOptionsText,
    tagPreviewEmptyText,
  }
}
