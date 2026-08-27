import { describe, expect, test } from 'vitest'
import {
  PROFILE_TEMPLATE_FIELD_PURPOSES,
  PROFILE_TEMPLATE_FIELD_TYPES,
} from '../src/lib/profile-template-schema'
import {
  buildWorldProfileTemplateSaveInput,
  createBlankWorldProfileTemplateDraft,
  createWorldProfileTemplateEditorDraft,
  useWorldBookProfileTemplateEditor,
} from '../src/composables/useWorldBookProfileTemplateEditor'

const createTemplate = () => ({
  id: 'world_template_existing',
  title: 'Existing profile',
  description: 'Original description',
  worldId: 'default_world',
  version: 3,
  categories: [
    { id: 'identity', label: 'Identity', order: 0 },
    { id: 'organization', label: 'Organization', order: 1 },
  ],
  fields: [
    {
      id: 'occupation',
      categoryId: 'identity',
      label: 'Occupation',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
      entityTypes: ['self_profile', 'main_role'],
      purposes: [PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT],
      order: 0,
    },
    {
      id: 'agency',
      categoryId: 'organization',
      label: 'Agency',
      type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
      entityTypes: ['main_role'],
      purposes: [PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING],
      order: 1,
    },
  ],
})

describe('WorldBook manual profile-template editor', () => {
  test('creates a blank draft without persisting a template', () => {
    const draft = createBlankWorldProfileTemplateDraft({
      worldId: 'world_custom',
      categoryLabel: 'Basic details',
    })

    expect(draft).toMatchObject({
      id: '',
      title: '',
      worldId: 'world_custom',
      version: 0,
    })
    expect(draft.categories).toEqual([
      expect.objectContaining({ label: 'Basic details' }),
    ])
    expect(draft.fields).toEqual([])
  })

  test('keeps existing templates untouched until a save input is built', () => {
    const template = createTemplate()
    const draft = createWorldProfileTemplateEditorDraft(template)

    draft.title = 'Changed profile'
    draft.categories[0].label = 'Core identity'
    draft.fields[0].label = 'Career'

    expect(template.title).toBe('Existing profile')
    expect(template.categories[0].label).toBe('Identity')
    expect(template.fields[0]).toMatchObject({ id: 'occupation', label: 'Occupation' })

    const saveInput = buildWorldProfileTemplateSaveInput(draft)
    expect(saveInput).toMatchObject({ id: template.id, title: 'Changed profile' })
    expect(saveInput.fields[0]).toMatchObject({ id: 'occupation', label: 'Career' })
  })

  test('adds stable fields, reorders them, and safely removes invalid purposes', () => {
    const editor = useWorldBookProfileTemplateEditor({ initialTemplate: createTemplate() })
    const field = editor.addField('identity', 'Birthday')
    const stableId = field.id

    field.label = 'Date of birth'
    field.type = PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT
    field.purposes = [
      PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
      PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
      PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
    ]
    editor.updateFieldType(field)
    editor.moveField(field.id, -1)

    expect(field.id).toBe(stableId)
    expect(field.purposes).toEqual([PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT])
    expect(editor.orderedCategories.value[0].fields.map((item) => item.id)).toEqual([
      stableId,
      'occupation',
    ])
  })

  test('requires a destination before deleting a category with fields', () => {
    const editor = useWorldBookProfileTemplateEditor({ initialTemplate: createTemplate() })

    const review = editor.requestDeleteCategory('organization')
    expect(review).toMatchObject({ reason: 'review_required', linkedFieldCount: 1 })
    expect(editor.draft.categories.map((category) => category.id)).toContain('organization')

    editor.pendingCategoryDelete.destinationCategoryId = 'identity'
    expect(editor.confirmDeleteCategory()).toBe(true)
    expect(editor.draft.categories.map((category) => category.id)).toEqual(['identity'])
    expect(editor.draft.fields.find((field) => field.id === 'agency')?.categoryId).toBe('identity')
  })

  test('serializes categories and options in visible order', () => {
    const editor = useWorldBookProfileTemplateEditor({ initialTemplate: createTemplate() })
    const field = editor.addField('organization', 'Department')
    field.type = PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT
    field.optionsDraft = 'Music, Acting, Music'
    editor.moveCategory('organization', -1)

    const saved = editor.buildSaveInput()
    expect(saved.categories.map((category) => category.id)).toEqual(['organization', 'identity'])
    expect(saved.fields.map((item) => item.id)).toEqual(['agency', field.id, 'occupation'])
    expect(saved.fields.find((item) => item.id === field.id)?.options).toEqual(['Music', 'Acting'])
  })
})
