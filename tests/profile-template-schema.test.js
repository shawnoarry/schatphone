import { describe, expect, test } from 'vitest'
import {
  CONTACTS_ENTITY_TYPES,
  PROFILE_TEMPLATE_FIELD_PURPOSES,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_DEFAULT_CATEGORY_ID,
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_VISIBILITY_LEVELS,
  cloneProfileTemplate,
  cloneProfileExtensions,
  createProfileExtensionCategoryId,
  createProfileExtensionFieldId,
  createProfileTemplateCategoryId,
  createProfileTemplateFieldId,
  createDefaultCapabilitiesForEntityType,
  createDefaultProfileTemplatePresets,
  normalizeProfileTemplate,
  normalizeProfileTemplateCategories,
  normalizeProfileTemplateField,
  normalizeProfileTemplateFieldPurposes,
  normalizeProfileTemplateLink,
  normalizeProfileExtensions,
  normalizeProfileValues,
  mergeProfileTemplateExtensions,
} from '../src/lib/profile-template-schema'

describe('profile template schema', () => {
  test('normalizes template fields with V1 field types and visibility levels', () => {
    const field = normalizeProfileTemplateField({
      id: 'pheromone',
      label: 'Pheromone',
      type: 'single_select',
      defaultVisibilityLevel: 'familiar',
      entityTypes: ['self_profile', 'main_role', 'supporting_role', 'npc', 'bad'],
      options: ['White tea', 'Snow pine', 'White tea'],
      required: true,
      recommended: true,
      order: 2,
    })

    expect(field).toMatchObject({
      id: 'pheromone',
      label: 'Pheromone',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
      defaultVisibilityLevel: PROFILE_VISIBILITY_LEVELS.FAMILIAR,
      entityTypes: [
        CONTACTS_ENTITY_TYPES.SELF_PROFILE,
        CONTACTS_ENTITY_TYPES.MAIN_ROLE,
        CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
        CONTACTS_ENTITY_TYPES.NPC,
      ],
      options: ['White tea', 'Snow pine'],
      required: true,
      recommended: true,
      order: 2,
    })
  })

  test('adds date, yes/no, and organization reference fields with safe purpose markers', () => {
    const organization = normalizeProfileTemplateField({
      id: 'agency',
      label: 'Agency',
      type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
      purposes: [
        PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
        PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
        PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
        PROFILE_TEMPLATE_FIELD_PURPOSES.PUBLIC_CONTENT,
        'unknown',
      ],
    })
    const date = normalizeProfileTemplateField({
      id: 'debut_date',
      label: 'Debut date',
      type: PROFILE_TEMPLATE_FIELD_TYPES.DATE,
      usageScopes: [
        PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
        PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
      ],
    })
    const yesNo = normalizeProfileTemplateField({
      id: 'public_figure',
      label: 'Public figure',
      type: PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN,
    })
    const notes = normalizeProfileTemplateField({
      id: 'notes',
      label: 'Notes',
      type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
      purposes: Object.values(PROFILE_TEMPLATE_FIELD_PURPOSES),
    })

    expect(organization.purposes).toEqual(Object.values(PROFILE_TEMPLATE_FIELD_PURPOSES))
    expect(date.purposes).toEqual([PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY])
    expect(yesNo).toMatchObject({
      type: PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN,
      purposes: [],
    })
    expect(notes.purposes).toEqual([
      PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
      PROFILE_TEMPLATE_FIELD_PURPOSES.PUBLIC_CONTENT,
    ])
    expect(normalizeProfileTemplateFieldPurposes(null, PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT)).toEqual([])
  })

  test('creates system-managed field IDs that survive label changes and avoid collisions', () => {
    const id = createProfileTemplateFieldId({ now: 12345, random: 0.25 })
    const nextId = createProfileTemplateFieldId({
      occupiedIds: [id],
      now: 12345,
      random: 0.25,
    })
    const categoryId = createProfileTemplateCategoryId({ now: 12345, random: 0.5 })
    const original = normalizeProfileTemplateField({ id, label: 'Agency' })
    const renamed = normalizeProfileTemplateField({ ...original, label: 'Management company' })

    expect(id).toMatch(/^profile_field_12345_[a-z0-9]+$/)
    expect(nextId).toBe(`${id}_2`)
    expect(categoryId).toMatch(/^profile_category_12345_[a-z0-9]+$/)
    expect(renamed.id).toBe(original.id)
    expect(renamed.label).toBe('Management company')
  })

  test('normalizes world-specific templates and keeps version metadata', () => {
    const template = normalizeProfileTemplate({
      id: 'abo_world_template',
      title: 'ABO world template',
      scope: 'world',
      worldId: 'world_abo',
      version: 3,
      fields: [
        { id: 'pheromone', label: 'Pheromone', type: 'short_text' },
        { id: 'bond', label: 'Bond mark', type: 'long_text' },
      ],
    })

    expect(template).toMatchObject({
      id: 'abo_world_template',
      title: 'ABO world template',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'world_abo',
      version: 3,
    })
    expect(template.fields.map((field) => field.id)).toEqual(['pheromone', 'bond'])
    expect(template.categories).toEqual([
      expect.objectContaining({ id: PROFILE_TEMPLATE_DEFAULT_CATEGORY_ID }),
    ])
    expect(template.fields.every((field) => field.categoryId === PROFILE_TEMPLATE_DEFAULT_CATEGORY_ID)).toBe(true)
  })

  test('normalizes ordered categories and safely rehomes fields with missing category references', () => {
    const template = normalizeProfileTemplate({
      id: 'idol_profile',
      title: 'Idol profile',
      categories: [
        { id: 'organization', label: 'Organization', order: 2 },
        { id: 'identity', label: 'Identity', order: 1 },
        { id: 'identity', label: 'Duplicate identity', order: 3 },
      ],
      fields: [
        { id: 'occupation', label: 'Occupation', categoryId: 'identity' },
        { id: 'agency', label: 'Agency', categoryId: 'organization' },
        { id: 'legacy_note', label: 'Legacy note', categoryId: 'removed_category' },
      ],
    })

    expect(template.categories.map((category) => category.id)).toEqual(['identity', 'organization'])
    expect(template.fields).toEqual([
      expect.objectContaining({ id: 'occupation', categoryId: 'identity' }),
      expect.objectContaining({ id: 'agency', categoryId: 'organization' }),
      expect.objectContaining({ id: 'legacy_note', categoryId: 'identity' }),
    ])
  })

  test('dedupes and caps category definitions without mutating cloned templates', () => {
    const categories = normalizeProfileTemplateCategories([
      { id: 'identity', label: 'Identity', order: 1 },
      { id: 'identity', label: 'Duplicate', order: 2 },
      ...Array.from({ length: 30 }, (_, index) => ({
        id: `category_${index}`,
        label: `Category ${index}`,
        order: index + 3,
      })),
    ])

    expect(categories).toHaveLength(24)
    expect(categories.filter((category) => category.id === 'identity')).toHaveLength(1)

    const template = normalizeProfileTemplate({
      id: 'clone_test',
      categories: [{ id: 'identity', label: 'Identity' }],
      fields: [{ id: 'name', label: 'Name', categoryId: 'identity' }],
    })
    const clone = cloneProfileTemplate(template)
    clone.categories[0].label = 'Changed'
    clone.fields[0].label = 'Changed name'

    expect(template.categories[0].label).toBe('Identity')
    expect(template.fields[0].label).toBe('Name')
  })

  test('normalizes profile template link and values without dropping unknown user data', () => {
    const link = normalizeProfileTemplateLink({
      primaryWorldId: 'world_abo',
      profileTemplateId: 'template_abo',
      profileTemplateVersion: 2,
      supplementalKnowledgePointIds: ['kp_a', 'kp_a', 'bad id'],
    })
    const values = normalizeProfileValues([
      { fieldId: 'pheromone', value: 'White tea', visibilityLevel: 'familiar', sourceKind: 'manual' },
      { fieldId: 'note', value: 'Only close roles may know this', visibilityLevel: 'intimate' },
    ])

    expect(link).toMatchObject({
      primaryWorldId: 'world_abo',
      profileTemplateId: 'template_abo',
      profileTemplateVersion: 2,
      supplementalKnowledgePointIds: ['kp_a'],
    })
    expect(values).toHaveLength(2)
    expect(values[0]).toMatchObject({
      fieldId: 'pheromone',
      value: 'White tea',
      visibilityLevel: PROFILE_VISIBILITY_LEVELS.FAMILIAR,
      sourceKind: 'manual',
    })
  })

  test('normalizes and clones person-only profile extensions without sharing nested data', () => {
    const extensions = normalizeProfileExtensions({
      categories: [{ id: 'private_story', label: 'Private story' }],
      fields: [
        {
          id: 'profile_field_private_story',
          categoryId: 'private_story',
          label: 'Private story note',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
        },
      ],
    })
    const clone = cloneProfileExtensions(extensions)
    clone.categories[0].label = 'Changed category'
    clone.fields[0].label = 'Changed field'

    expect(extensions.categories[0].label).toBe('Private story')
    expect(extensions.fields[0].label).toBe('Private story note')
    expect(normalizeProfileExtensions(null)).toEqual({ categories: [], fields: [] })
  })

  test('merges world and person structures while generated extension IDs avoid both scopes', () => {
    const templateCategories = [{ id: 'identity', label: 'Identity' }]
    const templateFields = [{ id: 'occupation', label: 'Occupation', categoryId: 'identity' }]
    const profileExtensions = {
      categories: [{ id: 'private_story', label: 'Private story' }],
      fields: [
        {
          id: 'private_note',
          categoryId: 'private_story',
          label: 'Private note',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
        },
      ],
    }
    const merged = mergeProfileTemplateExtensions({
      templateCategories,
      templateFields,
      profileExtensions,
    })
    const occupiedCategoryId = createProfileTemplateCategoryId({ now: 12345, random: 0.5 })
    const occupiedFieldId = createProfileTemplateFieldId({ now: 12345, random: 0.25 })
    const generatedCategoryId = createProfileExtensionCategoryId({
      templateCategories: [{ id: occupiedCategoryId }],
      profileExtensions,
      now: 12345,
      random: 0.5,
    })
    const generatedFieldId = createProfileExtensionFieldId({
      templateFields: [{ id: occupiedFieldId }],
      profileExtensions,
      now: 12345,
      random: 0.25,
    })

    expect(merged.categories.map((category) => category.id)).toEqual(['identity', 'private_story'])
    expect(merged.fields.map((field) => field.id)).toEqual(['occupation', 'private_note'])
    expect(merged.personCategoryIds).toEqual(['private_story'])
    expect(merged.personFieldIds).toEqual(['private_note'])
    expect(generatedCategoryId).toBe(`${occupiedCategoryId}_2`)
    expect(generatedFieldId).toBe(`${occupiedFieldId}_2`)
  })

  test('sets safe default capabilities for self profile, main, supporting, and NPC roles', () => {
    expect(createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.SELF_PROFILE)).toMatchObject({
      canAppearInChatDirectory: false,
      canUseFullRelationshipProgress: false,
      canUseMemoryGroups: false,
      canUseRouteProgression: false,
      canAppearInWorldEvents: true,
      canAppearInSocialFeed: true,
    })
    expect(createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.MAIN_ROLE)).toMatchObject({
      canAppearInChatDirectory: true,
      canUseFullRelationshipProgress: true,
      canUseMemoryGroups: true,
      canUseRouteProgression: true,
    })
    expect(createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE)).toMatchObject({
      canAppearInChatDirectory: true,
      canUseFullRelationshipProgress: false,
      canUseMemoryGroups: true,
      canUseRouteProgression: false,
      canAppearInWorldEvents: true,
      canAppearInSocialFeed: true,
    })
    expect(createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.NPC)).toMatchObject({
      canAppearInChatDirectory: true,
      canUseFullRelationshipProgress: false,
      canUseMemoryGroups: false,
      canUseRouteProgression: false,
      canAppearInWorldEvents: true,
      canAppearInSocialFeed: true,
    })
  })

  test('ships a small preset library without forcing active world templates', () => {
    const presets = createDefaultProfileTemplatePresets()

    expect(presets.length).toBeGreaterThanOrEqual(3)
    expect(presets.every((template) => template.scope === PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET)).toBe(true)
    expect(presets.some((template) => /ABO/i.test(template.title))).toBe(true)
  })
})
