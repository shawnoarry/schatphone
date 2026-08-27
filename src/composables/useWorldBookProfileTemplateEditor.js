import { computed, reactive } from 'vue'
import {
  CONTACTS_ENTITY_TYPE_KEYS,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_VISIBILITY_LEVELS,
  cloneProfileTemplate,
  createProfileTemplateCategoryId,
  createProfileTemplateFieldId,
  listAllowedProfileTemplateFieldPurposes,
  normalizeProfileTemplateFieldPurposes,
} from '../lib/profile-template-schema'

const trimText = (value = '') => String(value || '').trim()

const createCategoryDraft = ({ label = 'New category', occupiedIds = [] } = {}) => ({
  id: createProfileTemplateCategoryId({ occupiedIds }),
  label,
  description: '',
  order: 0,
})

const createFieldDraft = ({ categoryId = '', label = 'New field', occupiedIds = [] } = {}) => ({
  id: createProfileTemplateFieldId({ occupiedIds }),
  categoryId,
  label,
  description: '',
  type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
  defaultVisibilityLevel: PROFILE_VISIBILITY_LEVELS.FAMILIAR,
  entityTypes: [...CONTACTS_ENTITY_TYPE_KEYS],
  options: [],
  optionsDraft: '',
  purposes: [],
  required: false,
  recommended: true,
  order: 0,
})

export const createBlankWorldProfileTemplateDraft = ({
  worldId = 'default_world',
  categoryLabel = 'Basic profile',
} = {}) => {
  const category = createCategoryDraft({ label: categoryLabel })
  return {
    id: '',
    title: '',
    description: '',
    scope: PROFILE_TEMPLATE_SCOPES.WORLD,
    worldId,
    enabled: true,
    version: 0,
    categories: [category],
    fields: [],
  }
}

export const createWorldProfileTemplateEditorDraft = (template = {}) => {
  const clone = cloneProfileTemplate(template)
  const categories = Array.isArray(clone.categories) ? clone.categories : []
  const safeCategories = categories.length > 0
    ? categories
    : [createCategoryDraft({ label: 'Basic profile' })]
  const fallbackCategoryId = safeCategories[0].id
  const fields = Array.isArray(clone.fields)
    ? clone.fields.map((field) => ({
        ...field,
        categoryId: safeCategories.some((category) => category.id === field.categoryId)
          ? field.categoryId
          : fallbackCategoryId,
        entityTypes: Array.isArray(field.entityTypes) && field.entityTypes.length > 0
          ? [...field.entityTypes]
          : [...CONTACTS_ENTITY_TYPE_KEYS],
        purposes: Array.isArray(field.purposes) ? [...field.purposes] : [],
        options: Array.isArray(field.options) ? [...field.options] : [],
        optionsDraft: Array.isArray(field.options) ? field.options.join(', ') : '',
      }))
    : []

  return {
    ...clone,
    scope: PROFILE_TEMPLATE_SCOPES.WORLD,
    categories: safeCategories.map((category) => ({ ...category })),
    fields,
  }
}

const replaceReactiveRecord = (target, source) => {
  Object.keys(target).forEach((key) => delete target[key])
  Object.assign(target, source)
}

const moveItem = (items, index, direction) => {
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return false
  const current = items[index]
  items[index] = items[targetIndex]
  items[targetIndex] = current
  return true
}

const parseOptions = (value = '') => [...new Set(
  String(value || '')
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean),
)]

export const buildWorldProfileTemplateSaveInput = (draft = {}) => {
  const categories = (Array.isArray(draft.categories) ? draft.categories : [])
    .map((category, index) => ({
      ...category,
      label: trimText(category.label) || `Category ${index + 1}`,
      description: trimText(category.description),
      order: index,
    }))
  const fallbackCategoryId = categories[0]?.id || ''
  const categoryIds = new Set(categories.map((category) => category.id))
  const fields = categories
    .flatMap((category) =>
      (Array.isArray(draft.fields) ? draft.fields : []).filter(
        (field) => field.categoryId === category.id,
      ),
    )
    .concat(
      (Array.isArray(draft.fields) ? draft.fields : []).filter(
        (field) => !categoryIds.has(field.categoryId),
      ),
    )
    .map((field, index) => {
      const supportsOptions = [
        PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
        PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
      ].includes(field.type)
      return {
        id: field.id,
        categoryId: categoryIds.has(field.categoryId) ? field.categoryId : fallbackCategoryId,
        label: trimText(field.label) || `Field ${index + 1}`,
        description: trimText(field.description),
        type: field.type,
        defaultVisibilityLevel: field.defaultVisibilityLevel,
        entityTypes: Array.isArray(field.entityTypes) && field.entityTypes.length > 0
          ? [...field.entityTypes]
          : [...CONTACTS_ENTITY_TYPE_KEYS],
        options: supportsOptions ? parseOptions(field.optionsDraft) : [],
        purposes: normalizeProfileTemplateFieldPurposes(field.purposes, field.type),
        required: field.required === true,
        recommended: field.recommended !== false,
        order: index,
      }
    })

  return {
    ...draft,
    title: trimText(draft.title),
    description: trimText(draft.description),
    categories,
    fields,
  }
}

export function useWorldBookProfileTemplateEditor({ initialTemplate = {} } = {}) {
  const draft = reactive(createWorldProfileTemplateEditorDraft(initialTemplate))
  const pendingCategoryDelete = reactive({ categoryId: '', destinationCategoryId: '' })

  const orderedCategories = computed(() =>
    (Array.isArray(draft.categories) ? draft.categories : []).map((category) => ({
      ...category,
      fields: (Array.isArray(draft.fields) ? draft.fields : []).filter(
        (field) => field.categoryId === category.id,
      ),
    })),
  )

  const loadTemplate = (template = {}) => {
    replaceReactiveRecord(draft, createWorldProfileTemplateEditorDraft(template))
    pendingCategoryDelete.categoryId = ''
    pendingCategoryDelete.destinationCategoryId = ''
  }

  const addCategory = (label = 'New category') => {
    const category = createCategoryDraft({
      label,
      occupiedIds: draft.categories.map((item) => item.id),
    })
    category.order = draft.categories.length
    draft.categories.push(category)
    return category
  }

  const moveCategory = (categoryId, direction) =>
    moveItem(
      draft.categories,
      draft.categories.findIndex((category) => category.id === categoryId),
      direction,
    )

  const requestDeleteCategory = (categoryId) => {
    const category = draft.categories.find((item) => item.id === categoryId)
    if (!category) return { ok: false, reason: 'missing_category' }
    const linkedFields = draft.fields.filter((field) => field.categoryId === categoryId)
    if (linkedFields.length === 0) {
      draft.categories.splice(draft.categories.indexOf(category), 1)
      return { ok: true, reason: 'deleted_empty' }
    }
    const destination = draft.categories.find((item) => item.id !== categoryId)
    if (!destination) return { ok: false, reason: 'destination_required' }
    pendingCategoryDelete.categoryId = categoryId
    pendingCategoryDelete.destinationCategoryId = destination.id
    return { ok: false, reason: 'review_required', linkedFieldCount: linkedFields.length }
  }

  const cancelDeleteCategory = () => {
    pendingCategoryDelete.categoryId = ''
    pendingCategoryDelete.destinationCategoryId = ''
  }

  const confirmDeleteCategory = () => {
    const categoryId = pendingCategoryDelete.categoryId
    const destinationId = pendingCategoryDelete.destinationCategoryId
    const categoryIndex = draft.categories.findIndex((item) => item.id === categoryId)
    if (
      categoryIndex < 0 ||
      !destinationId ||
      destinationId === categoryId ||
      !draft.categories.some((item) => item.id === destinationId)
    ) {
      return false
    }
    draft.fields.forEach((field) => {
      if (field.categoryId === categoryId) field.categoryId = destinationId
    })
    draft.categories.splice(categoryIndex, 1)
    cancelDeleteCategory()
    return true
  }

  const addField = (categoryId, label = 'New field') => {
    const targetCategoryId = draft.categories.some((category) => category.id === categoryId)
      ? categoryId
      : draft.categories[0]?.id || ''
    if (!targetCategoryId) return null
    const field = createFieldDraft({
      categoryId: targetCategoryId,
      label,
      occupiedIds: draft.fields.map((item) => item.id),
    })
    field.order = draft.fields.length
    draft.fields.push(field)
    return field
  }

  const removeField = (fieldId) => {
    const index = draft.fields.findIndex((field) => field.id === fieldId)
    if (index < 0) return false
    draft.fields.splice(index, 1)
    return true
  }

  const moveField = (fieldId, direction) => {
    const field = draft.fields.find((item) => item.id === fieldId)
    if (!field) return false
    const categoryFields = draft.fields.filter((item) => item.categoryId === field.categoryId)
    const categoryIndex = categoryFields.findIndex((item) => item.id === fieldId)
    const target = categoryFields[categoryIndex + direction]
    if (!target) return false
    const fieldIndex = draft.fields.indexOf(field)
    const targetIndex = draft.fields.indexOf(target)
    draft.fields[fieldIndex] = target
    draft.fields[targetIndex] = field
    return true
  }

  const updateFieldType = (field) => {
    if (!field) return
    field.purposes = normalizeProfileTemplateFieldPurposes(field.purposes, field.type)
  }

  const toggleFieldEntityType = (field, entityType) => {
    if (!field || !CONTACTS_ENTITY_TYPE_KEYS.includes(entityType)) return false
    const current = Array.isArray(field.entityTypes) ? field.entityTypes : []
    if (current.includes(entityType)) {
      if (current.length <= 1) return false
      field.entityTypes = current.filter((type) => type !== entityType)
      return true
    }
    field.entityTypes = [...current, entityType]
    return true
  }

  const toggleFieldPurpose = (field, purpose) => {
    if (!field || !listAllowedProfileTemplateFieldPurposes(field.type).includes(purpose)) return false
    const current = Array.isArray(field.purposes) ? field.purposes : []
    field.purposes = current.includes(purpose)
      ? current.filter((item) => item !== purpose)
      : [...current, purpose]
    return true
  }

  const canSave = computed(() =>
    Boolean(trimText(draft.title)) && draft.categories.length > 0 && !pendingCategoryDelete.categoryId,
  )

  return {
    addCategory,
    addField,
    buildSaveInput: () => buildWorldProfileTemplateSaveInput(draft),
    canSave,
    cancelDeleteCategory,
    confirmDeleteCategory,
    draft,
    loadTemplate,
    moveCategory,
    moveField,
    orderedCategories,
    pendingCategoryDelete,
    removeField,
    requestDeleteCategory,
    toggleFieldEntityType,
    toggleFieldPurpose,
    updateFieldType,
  }
}
