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
  fields: [
    {
      id: 'agency',
      label: 'Agency',
      description: 'Current management company.',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
      defaultVisibilityLevel: PROFILE_VISIBILITY_LEVELS.PUBLIC,
      entityTypes: [CONTACTS_ENTITY_TYPES.MAIN_ROLE],
    },
    {
      id: 'tags',
      label: 'Tags',
      type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
      defaultVisibilityLevel: PROFILE_VISIBILITY_LEVELS.INTIMATE,
      entityTypes: [CONTACTS_ENTITY_TYPES.MAIN_ROLE],
    },
    {
      id: 'self_only',
      label: 'Self-only note',
      type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
      entityTypes: [CONTACTS_ENTITY_TYPES.SELF_PROFILE],
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
  currentWorldTemplates = [currentTemplate],
  universalTemplates = [universalTemplate],
  currentWorldId = 'default_world',
  templatesById = {},
} = {}) =>
  useContactsWorldFieldModel({
    selectedProfile: ref(profile),
    selectedProfileEntityType: ref(profile?.entityType || CONTACTS_ENTITY_TYPES.MAIN_ROLE),
    selectedProfileValues: ref(profileValues),
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
    expect(model.selectedWorldFieldIntroText.value).toBe('From template: Current stage profile')
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
      'Fill concrete role, self-profile, or NPC values defined by WorldBook templates.',
    )
    expect(formatProfileValue({ value: ['one', 'two'] })).toBe('one, two')
    expect(profileVisibilityLevelLabel('', model.profileTemplateVisibilityOptions.value, t)).toBe('Familiar')
    expect(buildProfileValueLabel({ fieldId: 'pheromone' }, [], t)).toBe('Pheromone')
    expect(fieldMatchesProfileEntity({ entityTypes: [] }, CONTACTS_ENTITY_TYPES.NPC)).toBe(true)
  })
})
