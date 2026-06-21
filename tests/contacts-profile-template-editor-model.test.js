import { describe, expect, test } from 'vitest'
import { reactive, ref } from 'vue'
import {
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_VISIBILITY_LEVELS,
} from '../src/lib/profile-template-schema'
import {
  buildProfileTemplateEditorFieldRow,
  profileTemplateDraftTagList,
  useContactsProfileTemplateEditorModel,
} from '../src/composables/useContactsProfileTemplateEditorModel'

const t = (zh, en) => en || zh

const template = {
  id: 'stage_profile',
  title: 'Stage Profile',
  fields: [
    {
      id: 'agency',
      label: 'Agency',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
      defaultVisibilityLevel: PROFILE_VISIBILITY_LEVELS.PUBLIC,
    },
    {
      id: 'notes',
      label: 'Notes',
      type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
    },
    {
      id: 'position',
      label: 'Position',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
      options: ['Vocal', 'Dance'],
    },
    {
      id: 'tags',
      label: 'Tags',
      type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
    },
    {
      id: 'mentor',
      label: 'Mentor',
      type: PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE,
    },
    {
      id: 'self_only',
      label: 'Self only',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
      entityTypes: ['self_profile'],
    },
  ],
}

const createModel = ({
  draft = {
    templateId: template.id,
    values: {
      tags: 'vocal, center, live',
    },
    visibility: {},
  },
  profileValues = [
    { fieldId: 'agency', value: 'Starship', visibilityLevel: PROFILE_VISIBILITY_LEVELS.PUBLIC },
    { fieldId: 'legacy_note', value: 'Old note', visibilityLevel: PROFILE_VISIBILITY_LEVELS.HIDDEN },
  ],
} = {}) => {
  const valueMap = new Map(profileValues.map((value) => [value.fieldId, value]))
  return useContactsProfileTemplateEditorModel({
    profileTemplateDraft: reactive(draft),
    selectedProfileValues: ref(profileValues),
    selectedProfileValueMap: ref(valueMap),
    fieldMatchesSelectedProfileEntity: (field) => !field.entityTypes,
    getProfileTemplateById: (id) => (id === template.id ? template : null),
    formatProfileValue: (value) => (Array.isArray(value?.value) ? value.value.join(', ') : value?.value || ''),
    profileValueLabel: (value) => (value.fieldId === 'legacy_note' ? 'Legacy note' : value.fieldId),
    profileVisibilityLevelLabel: (level) => (level === PROFILE_VISIBILITY_LEVELS.HIDDEN ? 'Hidden' : 'Public'),
    t,
  })
}

describe('Contacts profile-template editor model interface', () => {
  test('builds draft template fields and preserved custom rows', () => {
    const model = createModel()

    expect(model.profileTemplateDraftTemplate.value).toBe(template)
    expect(model.profileTemplateDraftFields.value.map((field) => field.id)).toEqual([
      'agency',
      'notes',
      'position',
      'tags',
      'mentor',
    ])
    expect([...model.profileTemplateDraftFieldIds.value]).toEqual([
      'agency',
      'notes',
      'position',
      'tags',
      'mentor',
    ])
    expect(model.profileTemplateDraftPreservedRows.value).toEqual([
      {
        key: 'legacy_note',
        fieldId: 'legacy_note',
        title: 'Legacy note',
        value: 'Old note',
        visibility: 'Hidden',
      },
    ])
  })

  test('builds field rows with control kind, helper copy, placeholder, icons, and tag preview', () => {
    const model = createModel()

    expect(model.profileTemplateDraftFieldRows.value.map((row) => ({
      id: row.id,
      controlKind: row.controlKind,
      iconClass: row.iconClass,
      typeLabel: row.typeLabel,
      helper: row.helper,
      placeholder: row.placeholder,
      tagPreview: row.tagPreview,
      hasTagPreview: row.hasTagPreview,
    }))).toEqual([
      {
        id: 'agency',
        controlKind: 'input',
        iconClass: 'fas fa-pen',
        typeLabel: 'Text',
        helper: 'Enter this person\u2019s concrete value in the current world.',
        placeholder: 'Enter this profile value',
        tagPreview: [],
        hasTagPreview: false,
      },
      {
        id: 'notes',
        controlKind: 'textarea',
        iconClass: 'fas fa-align-left',
        typeLabel: 'Notes',
        helper: 'Use this for longer private context, relationship background, or world-specific notes.',
        placeholder: 'Enter this profile value',
        tagPreview: [],
        hasTagPreview: false,
      },
      {
        id: 'position',
        controlKind: 'select',
        iconClass: 'fas fa-list-ul',
        typeLabel: 'Choice',
        helper: 'Choose one option from this world template.',
        placeholder: 'Enter this profile value',
        tagPreview: [],
        hasTagPreview: false,
      },
      {
        id: 'tags',
        controlKind: 'input',
        iconClass: 'fas fa-tags',
        typeLabel: 'Tags',
        helper: 'Use commas to separate tags. They save as this person\u2019s tag list.',
        placeholder: 'Separate tags with commas',
        tagPreview: ['vocal', 'center', 'live'],
        hasTagPreview: true,
      },
      {
        id: 'mentor',
        controlKind: 'input',
        iconClass: 'fas fa-user-tag',
        typeLabel: 'Person',
        helper: 'Enter a related person or role ID; a picker can be added later.',
        placeholder: 'Enter related person or role ID',
        tagPreview: [],
        hasTagPreview: false,
      },
    ])
  })

  test('builds save-review display facts and empty copy', () => {
    const model = createModel()

    expect(model.profileTemplateChangeReview.value).toMatchObject({
      updateCount: 5,
      preservedCount: 1,
      title: 'Save review',
      summary: 'Changing templates will not silently delete old details; review what updates and what stays.',
      facts: [
        { key: 'updated-fields', text: 'These fields will update this profile: 5' },
        { key: 'preserved-custom', text: 'Old fields will stay as custom fields: 1' },
        { key: 'cleanup-policy', text: 'To delete old fields, clean them up separately in the role profile.' },
      ],
    })
    expect(model.emptyTemplateFieldText.value).toBe('This template has no fields for this profile type.')
    expect(model.emptyTemplateOptionsText.value).toBe(
      'This world has no role profile template yet. Create or copy one in WorldBook first.',
    )
    expect(model.tagPreviewEmptyText.value).toBe('Tags preview here as you type')
  })

  test('handles missing template and caps tag previews', () => {
    const draft = {
      templateId: 'missing',
      values: {
        tags: 'a,b,c,d,e,f,g,h,i',
      },
      visibility: {},
    }
    const model = createModel({ draft, profileValues: [] })

    expect(model.profileTemplateDraftTemplate.value).toBe(null)
    expect(model.profileTemplateDraftFields.value).toEqual([])
    expect(model.profileTemplateDraftPreservedValues.value).toEqual([])
    expect(profileTemplateDraftTagList(template.fields[3], draft)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    expect(buildProfileTemplateEditorFieldRow({ id: 'empty_choice', type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT }, draft, t)).toMatchObject({
      controlKind: 'input',
      helper: 'No fixed options yet; enter a custom value for this world.',
    })
  })
})
