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
  profileExtensions = {},
} = {}) => {
  const valueMap = new Map(profileValues.map((value) => [value.fieldId, value]))
  return useContactsProfileTemplateEditorModel({
    profileTemplateDraft: reactive(draft),
    selectedProfileValues: ref(profileValues),
    selectedProfileExtensions: ref(profileExtensions),
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
    expect(model.profileTemplateDraftFieldGroups.value).toHaveLength(1)
    expect(model.profileTemplateDraftFieldGroups.value[0]).toMatchObject({
      key: 'general',
      label: 'General',
    })
    expect(model.profileTemplateDraftFieldGroups.value[0].fields.map((field) => field.id)).toEqual([
      'agency',
      'notes',
      'position',
      'tags',
      'mentor',
    ])
  })

  test('groups the edit form from category metadata without category-specific UI code', () => {
    const categorizedTemplate = {
      ...template,
      id: 'categorized_stage_profile',
      categories: [
        { id: 'identity', label: 'Identity', description: 'Stable identity.' },
        { id: 'private', label: 'Private context', description: 'Closer details.' },
      ],
      fields: template.fields.map((field, index) => ({
        ...field,
        categoryId: index < 2 ? 'identity' : 'private',
      })),
    }
    const draft = reactive({
      templateId: categorizedTemplate.id,
      values: {},
      visibility: {},
    })
    const model = useContactsProfileTemplateEditorModel({
      profileTemplateDraft: draft,
      selectedProfileValues: ref([]),
      fieldMatchesSelectedProfileEntity: (field) => !field.entityTypes,
      getProfileTemplateById: (id) => (id === categorizedTemplate.id ? categorizedTemplate : null),
      t,
    })

    expect(model.profileTemplateDraftFieldGroups.value.map((group) => ({
      key: group.key,
      fields: group.fields.map((field) => field.id),
    }))).toEqual([
      { key: 'identity', fields: ['agency', 'notes'] },
      { key: 'private', fields: ['position', 'tags', 'mentor'] },
    ])
  })

  test('edits person-only fields beside template fields and keeps their category markers', () => {
    const categorizedTemplate = {
      ...template,
      categories: [{ id: 'identity', label: 'Identity' }],
      fields: template.fields.map((field) => ({ ...field, categoryId: 'identity' })),
    }
    const model = useContactsProfileTemplateEditorModel({
      profileTemplateDraft: reactive({
        templateId: categorizedTemplate.id,
        values: {},
        visibility: {},
      }),
      selectedProfileValues: ref([]),
      selectedProfileExtensions: ref({
        categories: [{ id: 'private_story', label: 'Private story' }],
        fields: [
          {
            id: 'private_note',
            categoryId: 'private_story',
            label: 'Private note',
            type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
          },
          {
            id: 'stage_habit',
            categoryId: 'identity',
            label: 'Stage habit',
            type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
          },
        ],
      }),
      fieldMatchesSelectedProfileEntity: () => true,
      getProfileTemplateById: (id) => (id === categorizedTemplate.id ? categorizedTemplate : null),
      t,
    })

    expect(model.profileTemplateDraftFieldGroups.value.map((group) => ({
      key: group.key,
      personOnly: group.isPersonExtension,
      fields: group.fields.map((field) => ({ id: field.id, personOnly: field.isPersonExtension })),
    }))).toEqual([
      {
        key: 'identity',
        personOnly: false,
        fields: [
          { id: 'agency', personOnly: false },
          { id: 'notes', personOnly: false },
          { id: 'position', personOnly: false },
          { id: 'tags', personOnly: false },
          { id: 'mentor', personOnly: false },
          { id: 'self_only', personOnly: false },
          { id: 'stage_habit', personOnly: true },
        ],
      },
      {
        key: 'private_story',
        personOnly: true,
        fields: [{ id: 'private_note', personOnly: true }],
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
        helper: 'Enter this person\u2019s details.',
        placeholder: 'Enter this person\u2019s details',
        tagPreview: [],
        hasTagPreview: false,
      },
      {
        id: 'notes',
        controlKind: 'textarea',
        iconClass: 'fas fa-align-left',
        typeLabel: 'Notes',
        helper: 'Use this for longer private context, relationship background, or world-specific notes.',
        placeholder: 'Enter this person\u2019s details',
        tagPreview: [],
        hasTagPreview: false,
      },
      {
        id: 'position',
        controlKind: 'select',
        iconClass: 'fas fa-list-ul',
        typeLabel: 'Choice',
        helper: 'Choose one of the available options.',
        placeholder: 'Enter this person\u2019s details',
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
        helper: 'Enter a related person\u2019s name or role number to link them.',
        placeholder: 'Enter the related person\u2019s name',
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
      helper: 'Enter the value that fits this person.',
    })
  })

  test('builds date, yes/no, and organization reference controls', () => {
    const draft = { values: {}, visibility: {} }
    const date = buildProfileTemplateEditorFieldRow(
      { id: 'birthday', type: PROFILE_TEMPLATE_FIELD_TYPES.DATE },
      draft,
      t,
    )
    const yesNo = buildProfileTemplateEditorFieldRow(
      { id: 'public_figure', type: PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN },
      draft,
      t,
    )
    const organization = buildProfileTemplateEditorFieldRow(
      { id: 'agency', type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE },
      draft,
      t,
    )

    expect(date).toMatchObject({
      controlKind: 'input',
      inputType: 'date',
      typeLabel: 'Date',
      iconClass: 'fas fa-calendar-day',
    })
    expect(yesNo).toMatchObject({
      controlKind: 'select',
      typeLabel: 'Yes / No',
      controlOptions: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' },
      ],
    })
    expect(organization).toMatchObject({
      controlKind: 'input',
      inputType: 'text',
      typeLabel: 'Organization',
      iconClass: 'fas fa-building',
      placeholder: 'Enter a company, school, team, or organization',
    })
    expect(organization.helper).toBe('Enter a company, school, team, or other organization.')
  })
})
