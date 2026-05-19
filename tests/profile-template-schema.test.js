import { describe, expect, test } from 'vitest'
import {
  CONTACTS_ENTITY_TYPES,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_VISIBILITY_LEVELS,
  createDefaultCapabilitiesForEntityType,
  createDefaultProfileTemplatePresets,
  normalizeProfileTemplate,
  normalizeProfileTemplateField,
  normalizeProfileTemplateLink,
  normalizeProfileValues,
} from '../src/lib/profile-template-schema'

describe('profile template schema', () => {
  test('normalizes template fields with V1 field types and visibility levels', () => {
    const field = normalizeProfileTemplateField({
      id: 'pheromone',
      label: 'Pheromone',
      type: 'single_select',
      defaultVisibilityLevel: 'familiar',
      entityTypes: ['self_profile', 'main_role', 'npc', 'bad'],
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
        CONTACTS_ENTITY_TYPES.NPC,
      ],
      options: ['White tea', 'Snow pine'],
      required: true,
      recommended: true,
      order: 2,
    })
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

  test('sets safe default capabilities for self profile, main role, and NPC', () => {
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
