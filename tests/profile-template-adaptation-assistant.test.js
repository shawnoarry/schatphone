import { describe, expect, test, vi } from 'vitest'
import {
  CONTACTS_ENTITY_TYPES,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_SCOPES,
} from '../src/lib/profile-template-schema'
import {
  adaptProfileTemplateValues,
  buildProfileTemplateAdaptationPrompt,
  buildProfileTemplateAdaptationReview,
} from '../src/lib/profile-template-adaptation-assistant'

const legacyTemplate = {
  id: 'world_template_legacy_entertainment',
  title: 'Legacy entertainment profile',
  scope: PROFILE_TEMPLATE_SCOPES.WORLD,
  worldId: 'legacy_world',
  version: 1,
  fields: [
    {
      id: 'shared_identity',
      label: 'Shared identity',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
    },
    {
      id: 'old_secret',
      label: 'Old secret',
      type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
    },
  ],
}

const currentTemplate = {
  id: 'world_template_current_entertainment',
  title: 'Current entertainment profile',
  scope: PROFILE_TEMPLATE_SCOPES.WORLD,
  worldId: 'default_world',
  version: 2,
  fields: [
    {
      id: 'shared_identity',
      label: 'Shared identity',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
    },
    {
      id: 'public_persona',
      label: 'Public persona',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
      options: ['Idol', 'Manager'],
    },
  ],
}

const profile = {
  id: 1,
  name: 'Mira',
  role: 'Singer',
  entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  templateLink: {
    primaryWorldId: 'legacy_world',
    profileTemplateId: legacyTemplate.id,
    profileTemplateVersion: 1,
  },
  profileValues: [
    { fieldId: 'shared_identity', value: 'Known singer', visibilityLevel: 'familiar' },
    { fieldId: 'old_secret', value: 'Old contract secret', visibilityLevel: 'hidden' },
  ],
}

describe('profile template adaptation assistant', () => {
  test('recommends a current-world template when the profile uses another world template', () => {
    const review = buildProfileTemplateAdaptationReview({
      profile,
      currentTemplate: legacyTemplate,
      currentWorldTemplates: [currentTemplate],
      currentWorldId: 'default_world',
    })

    expect(review.needsAttention).toBe(true)
    expect(review.reason).toBe('outside_current_world')
    expect(review.recommendedTemplateId).toBe(currentTemplate.id)
    expect(review.sharedValueCount).toBe(1)
    expect(review.preservedCustomCount).toBe(1)
    expect(review.targetFieldCount).toBe(2)
  })

  test('flags an older saved template version and keeps the same current-world template as target', () => {
    const review = buildProfileTemplateAdaptationReview({
      profile: {
        ...profile,
        templateLink: {
          primaryWorldId: 'default_world',
          profileTemplateId: currentTemplate.id,
          profileTemplateVersion: 1,
        },
      },
      currentTemplate,
      currentWorldTemplates: [currentTemplate],
      currentWorldId: 'default_world',
    })

    expect(review.needsAttention).toBe(true)
    expect(review.reason).toBe('outdated_template')
    expect(review.recommendedTemplateId).toBe(currentTemplate.id)
    expect(review.recommendedTemplateVersion).toBe(2)
  })

  test('builds a draft-only adaptation prompt with source values and target fields', () => {
    const prompt = buildProfileTemplateAdaptationPrompt({
      sourceTemplate: legacyTemplate,
      targetTemplate: currentTemplate,
      profile,
      user: { name: 'Test User' },
      existingValues: profile.profileValues,
    })

    expect(prompt).toContain('Legacy entertainment profile')
    expect(prompt).toContain('Current entertainment profile')
    expect(prompt).toContain('old_secret')
    expect(prompt).toContain('public_persona')
    expect(prompt).toContain('Old contract secret')
    expect(prompt).toContain('draft-only')
    expect(prompt).toContain('Do not save')
    expect(prompt).toContain('Return JSON only')
  })

  test('calls AI through the injected seam and normalizes suggestions against the target template', async () => {
    const callAi = vi.fn(async () =>
      JSON.stringify({
        values: [
          { fieldId: 'public_persona', value: 'Idol', confidence: 'high' },
          { fieldId: 'old_secret', value: 'Should be dropped' },
        ],
      }),
    )

    const result = await adaptProfileTemplateValues({
      sourceTemplate: legacyTemplate,
      targetTemplate: currentTemplate,
      profile,
      user: { name: 'Test User' },
      existingValues: profile.profileValues,
      callAi,
    })

    expect(callAi).toHaveBeenCalledTimes(1)
    expect(callAi.mock.calls[0][0].systemPrompt).toContain('draft-only')
    expect(result.ok).toBe(true)
    expect(result.suggestions).toEqual([
      expect.objectContaining({
        fieldId: 'public_persona',
        value: 'Idol',
        confidence: 'high',
      }),
    ])
    expect(result.droppedCount).toBe(1)
  })
})
