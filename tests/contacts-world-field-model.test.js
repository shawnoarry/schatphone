import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/role-profile-schema'
import {
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_VISIBILITY_LEVELS,
} from '../src/lib/profile-template-schema'
import {
  buildProfileValueLabel,
  fieldMatchesProfileEntity,
  formatContactsProfileTemplateOption,
  formatProfileValue,
  profileTemplateAdaptationTitle,
  profileVisibilityLevelLabel,
  useContactsWorldFieldModel,
} from '../src/composables/useContactsWorldFieldModel'

const t = (zh, en) => en || zh

const currentTemplate = {
  id: 'world_current',
  title: 'Current stage profile',
  scope: PROFILE_TEMPLATE_SCOPES.WORLD,
  worldId: 'default_world',
  version: 3,
  updatedAt: 300,
  categories: [
    { id: 'identity', label: 'Identity', description: 'Stable public identity.', order: 0 },
    { id: 'private', label: 'Private context', description: 'Closer personal details.', order: 1 },
  ],
  fields: [
    {
      id: 'agency',
      label: 'Agency',
      description: 'Current management company.',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
      defaultVisibilityLevel: PROFILE_VISIBILITY_LEVELS.PUBLIC,
      entityTypes: [CONTACTS_ENTITY_TYPES.MAIN_ROLE],
      categoryId: 'identity',
    },
    {
      id: 'tags',
      label: 'Tags',
      type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
      defaultVisibilityLevel: PROFILE_VISIBILITY_LEVELS.INTIMATE,
      entityTypes: [CONTACTS_ENTITY_TYPES.MAIN_ROLE],
      categoryId: 'private',
    },
    {
      id: 'self_only',
      label: 'Self-only note',
      type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
      entityTypes: [CONTACTS_ENTITY_TYPES.SELF_PROFILE],
      categoryId: 'private',
    },
  ],
}

const universalTemplate = {
  id: 'preset_basic',
  title: 'Basic profile',
  scope: PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET,
  version: 1,
  fields: [],
}

const legacyTemplate = {
  id: 'legacy_template',
  title: 'Legacy profile',
  scope: PROFILE_TEMPLATE_SCOPES.WORLD,
  worldId: 'legacy_world',
  version: 1,
  fields: [{ id: 'legacy_note', label: 'Legacy note' }],
}

const createModel = ({
  profile = {
    id: 1,
    name: 'Mira',
    entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    templateLink: {
      primaryWorldId: 'default_world',
      profileTemplateId: currentTemplate.id,
      profileTemplateVersion: currentTemplate.version,
    },
  },
  profileValues = [],
  profileExtensions = profile?.profileExtensions || {},
  currentWorldTemplates = [currentTemplate],
  universalTemplates = [universalTemplate],
  currentWorldId = 'legacy_single_world',
  templatesById = {},
} = {}) =>
  useContactsWorldFieldModel({
    selectedProfile: ref(profile),
    selectedProfileEntityType: ref(profile?.entityType || CONTACTS_ENTITY_TYPES.MAIN_ROLE),
    selectedProfileValues: ref(profileValues),
    selectedProfileExtensions: ref(profileExtensions),
    currentWorldProfileTemplates: ref(currentWorldTemplates),
    universalProfileTemplates: ref(universalTemplates),
    currentContactsWorldId: ref(currentWorldId),
    getProfileTemplateById: (id) => ({
      [currentTemplate.id]: currentTemplate,
      [universalTemplate.id]: universalTemplate,
      [legacyTemplate.id]: legacyTemplate,
      ...templatesById,
    })[id] || null,
    t,
  })

describe('Contacts world field model interface', () => {
  test('builds template options from current-world, universal, and selected legacy templates without duplicates', () => {
    const model = createModel({
      profile: {
        id: 2,
        entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
        templateLink: {
          primaryWorldId: 'legacy_world',
          profileTemplateId: legacyTemplate.id,
          profileTemplateVersion: 1,
        },
      },
      currentWorldTemplates: [currentTemplate, currentTemplate],
      universalTemplates: [universalTemplate],
    })

    expect(model.contactsProfileTemplateOptions.value.map((template) => template.id)).toEqual([
      currentTemplate.id,
      universalTemplate.id,
      legacyTemplate.id,
    ])
    expect(formatContactsProfileTemplateOption(currentTemplate, t)).toBe('Current world \u00b7 Current stage profile')
    expect(model.formatContactsProfileTemplateOption(universalTemplate)).toBe('Universal \u00b7 Basic profile')
  })

  test('builds template and custom world-field rows with display values and visibility badges', () => {
    const model = createModel({
      profileValues: [
        { fieldId: 'agency', value: 'Starship', visibilityLevel: PROFILE_VISIBILITY_LEVELS.PUBLIC },
        { fieldId: 'tags', value: ['vocal', 'dance'], visibilityLevel: PROFILE_VISIBILITY_LEVELS.INTIMATE },
        { fieldId: 'legacy_note', value: 'Old contract note', visibilityLevel: PROFILE_VISIBILITY_LEVELS.HIDDEN },
      ],
    })

    expect(model.selectedProfileTemplateFields.value.map((field) => field.id)).toEqual(['agency', 'tags'])
    expect(model.fieldMatchesSelectedProfileEntity(currentTemplate.fields[0])).toBe(true)
    expect(model.fieldMatchesSelectedProfileEntity(currentTemplate.fields[2])).toBe(false)
    expect(model.selectedWorldFieldIntroText.value).toBe(
      'Record identity, personality, habits, and your relationship in clear groups.',
    )
    expect(model.selectedProfileWorldFieldRows.value.map((row) => ({
      key: row.key,
      title: row.title,
      displayValue: row.displayValue,
      badgeLabel: row.badgeLabel,
      isTemplateField: row.isTemplateField,
    }))).toEqual([
      {
        key: 'agency',
        title: 'Agency',
        displayValue: 'Starship',
        badgeLabel: 'Public',
        isTemplateField: true,
      },
      {
        key: 'tags',
        title: 'Tags',
        displayValue: 'vocal, dance',
        badgeLabel: 'Intimate',
        isTemplateField: true,
      },
      {
        key: 'legacy_note',
        title: 'legacy_note',
        displayValue: 'Old contract note',
        badgeLabel: 'Hidden \u00b7 Custom',
        isTemplateField: false,
      },
    ])
  })

  test('groups the read state by template category and uses natural missing-detail prompts', () => {
    const model = createModel({
      profileValues: [
        { fieldId: 'agency', value: 'Starship', visibilityLevel: PROFILE_VISIBILITY_LEVELS.PUBLIC },
      ],
    })

    expect(model.selectedProfileWorldFieldGroups.value.map((group) => ({
      key: group.key,
      label: group.label,
      filled: group.filledRows.map((row) => row.key),
      promptText: group.promptText,
    }))).toEqual([
      {
        key: 'identity',
        label: 'Identity',
        filled: ['agency'],
        promptText: '',
      },
      {
        key: 'private',
        label: 'Private context',
        filled: [],
        promptText: 'Consider adding Tags.',
      },
    ])
    expect(model.selectedProfileWorldFieldGroups.value[1].promptText).not.toMatch(/\d+\/\d+/)
  })

  test('places old flat templates in the default profile category', () => {
    const model = createModel({
      profile: {
        id: 5,
        entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
        templateLink: {
          primaryWorldId: 'legacy_world',
          profileTemplateId: legacyTemplate.id,
          profileTemplateVersion: 1,
        },
      },
      profileValues: [
        { fieldId: 'legacy_note', value: 'Preserved note', visibilityLevel: PROFILE_VISIBILITY_LEVELS.HIDDEN },
      ],
    })

    expect(model.selectedProfileWorldFieldGroups.value).toHaveLength(1)
    expect(model.selectedProfileWorldFieldGroups.value[0]).toMatchObject({
      key: 'general',
      label: 'General',
    })
    expect(model.selectedProfileWorldFieldGroups.value[0].filledRows[0]).toMatchObject({
      key: 'legacy_note',
      displayValue: 'Preserved note',
    })
  })

  test('merges person-only fields into the same read card without treating them as old unknown values', () => {
    const model = createModel({
      profileExtensions: {
        categories: [{ id: 'private_story', label: 'Private story', order: 0 }],
        fields: [
          {
            id: 'private_nickname_rule',
            categoryId: 'private_story',
            label: 'Nickname rule',
            type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
            entityTypes: [CONTACTS_ENTITY_TYPES.MAIN_ROLE],
          },
          {
            id: 'stage_habit',
            categoryId: 'identity',
            label: 'Stage habit',
            type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
            entityTypes: [CONTACTS_ENTITY_TYPES.MAIN_ROLE],
          },
        ],
      },
      profileValues: [
        {
          fieldId: 'private_nickname_rule',
          value: 'Do not use the full name in private.',
          visibilityLevel: PROFILE_VISIBILITY_LEVELS.HIDDEN,
        },
        {
          fieldId: 'stage_habit',
          value: 'Checks the in-ear monitor twice.',
          visibilityLevel: PROFILE_VISIBILITY_LEVELS.FAMILIAR,
        },
      ],
    })

    expect(model.selectedProfileFields.value.map((field) => field.id)).toEqual([
      'agency',
      'tags',
      'private_nickname_rule',
      'stage_habit',
    ])
    expect(model.selectedProfileWorldFieldGroups.value.map((group) => ({
      key: group.key,
      personOnly: group.isPersonExtension,
      rows: group.rows.map((row) => ({ key: row.key, personOnly: row.isPersonExtension })),
    }))).toEqual([
      {
        key: 'identity',
        personOnly: false,
        rows: [
          { key: 'agency', personOnly: false },
          { key: 'stage_habit', personOnly: true },
        ],
      },
      {
        key: 'private',
        personOnly: false,
        rows: [{ key: 'tags', personOnly: false }],
      },
      {
        key: 'private_story',
        personOnly: true,
        rows: [{ key: 'private_nickname_rule', personOnly: true }],
      },
    ])
    expect(
      model.selectedProfileWorldFieldRows.value.find((row) => row.key === 'private_nickname_rule')
        .badgeLabel,
    ).toBe('Hidden · Person only')
  })

  test('reports template-adaptation display for profiles that need current-world migration', () => {
    const model = createModel({
      profile: {
        id: 3,
        name: 'Mira',
        entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
        templateLink: {
          primaryWorldId: 'legacy_world',
          profileTemplateId: legacyTemplate.id,
          profileTemplateVersion: 1,
        },
        profileValues: [
          { fieldId: 'agency', value: 'Starship', visibilityLevel: PROFILE_VISIBILITY_LEVELS.PUBLIC },
          { fieldId: 'legacy_note', value: 'Old contract note', visibilityLevel: PROFILE_VISIBILITY_LEVELS.HIDDEN },
        ],
      },
      profileValues: [
        { fieldId: 'agency', value: 'Starship', visibilityLevel: PROFILE_VISIBILITY_LEVELS.PUBLIC },
        { fieldId: 'legacy_note', value: 'Old contract note', visibilityLevel: PROFILE_VISIBILITY_LEVELS.HIDDEN },
      ],
    })

    expect(model.selectedProfileTemplateAdaptationReview.value).toMatchObject({
      needsAttention: true,
      reason: 'outside_current_world',
      recommendedTemplateId: currentTemplate.id,
      sharedValueCount: 1,
      preservedCustomCount: 1,
    })
    expect(model.selectedProfileTemplateAdaptationDisplay.value).toEqual({
      needsAttention: true,
      title: 'This profile comes from another world template.',
      summary:
        'Suggested target: Current stage profile. AI will only create a draft; old fields stay as custom fields until you review and save.',
      facts: [
        { key: 'recommended-template', text: 'Recommended template: Current stage profile \u00b7 v3' },
        { key: 'shared-values', text: 'Reusable existing field(s): 1' },
        { key: 'preserved-custom', text: 'Will stay as custom field(s): 1' },
      ],
    })
    expect(profileTemplateAdaptationTitle({ reason: 'missing_template' }, t)).toBe(
      'This person uses a template that is not available here.',
    )
  })

  test('keeps empty state and fallback labels when there is no selected template', () => {
    const model = createModel({
      profile: {
        id: 4,
        entityType: CONTACTS_ENTITY_TYPES.NPC,
        templateLink: {},
      },
      profileValues: [],
      currentWorldTemplates: [],
      universalTemplates: [],
    })

    expect(model.selectedProfileTemplate.value).toBe(null)
    expect(model.selectedProfileWorldFieldRows.value).toEqual([])
    expect(model.selectedProfileTemplateAdaptationDisplay.value.needsAttention).toBe(false)
    expect(model.selectedWorldFieldIntroText.value).toBe(
      'Choose a profile style, then paste a persona or fill it in item by item.',
    )
    expect(formatProfileValue({ value: ['one', 'two'] })).toBe('one, two')
    expect(
      formatProfileValue(
        { value: 'true' },
        { type: PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN },
        t,
      ),
    ).toBe('Yes')
    expect(profileVisibilityLevelLabel('', model.profileTemplateVisibilityOptions.value, t)).toBe('Familiar')
    expect(buildProfileValueLabel({ fieldId: 'pheromone' }, [], t)).toBe('Pheromone')
    expect(fieldMatchesProfileEntity({ entityTypes: [] }, CONTACTS_ENTITY_TYPES.NPC)).toBe(true)
  })
})
