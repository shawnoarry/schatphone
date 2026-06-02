import { describe, expect, test, vi } from 'vitest'
import {
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_VISIBILITY_LEVELS,
} from '../src/lib/profile-template-schema'
import {
  buildProfileTemplateValueAssistantPrompt,
  normalizeProfileTemplateValueSuggestionPayload,
  suggestProfileTemplateValues,
} from '../src/lib/profile-template-value-assistant'

const template = {
  id: 'world_template_entertainment',
  title: 'Entertainment profile',
  version: 2,
  fields: [
    {
      id: 'public_persona',
      label: 'Public persona',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
      options: ['Idol', 'Manager'],
      defaultVisibilityLevel: PROFILE_VISIBILITY_LEVELS.PUBLIC,
    },
    {
      id: 'private_risk',
      label: 'Private risk',
      type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
      defaultVisibilityLevel: PROFILE_VISIBILITY_LEVELS.HIDDEN,
    },
    {
      id: 'scene_tags',
      label: 'Scene tags',
      type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
    },
  ],
}

describe('profile template value assistant', () => {
  test('builds a draft-only prompt with template fields, profile, user, and existing values', () => {
    const prompt = buildProfileTemplateValueAssistantPrompt({
      template,
      profile: {
        name: 'Mira',
        role: 'Singer',
        entityType: 'main_role',
        bio: 'Keeps a polished public image.',
      },
      user: { name: 'Test User' },
      existingValues: [{ fieldId: 'public_persona', value: 'Idol', visibilityLevel: 'public' }],
    })

    expect(prompt).toContain('Entertainment profile')
    expect(prompt).toContain('public_persona')
    expect(prompt).toContain('private_risk')
    expect(prompt).toContain('Mira')
    expect(prompt).toContain('Singer')
    expect(prompt).toContain('Test User')
    expect(prompt).toContain('Idol')
    expect(prompt).toContain('draft-only')
    expect(prompt).toContain('Do not overwrite')
    expect(prompt).toContain('Return JSON only')
  })

  test('normalizes provider suggestions against known template fields', () => {
    const result = normalizeProfileTemplateValueSuggestionPayload(
      {
        values: [
          { fieldId: 'public_persona', value: 'Idol', confidence: 'high', reason: 'Public role.' },
          { fieldId: 'scene_tags', value: ['idol', 'public-facing', 'idol'] },
          { fieldId: 'unknown_field', value: 'Drop me' },
        ],
      },
      { fields: template.fields },
    )

    expect(result.suggestions).toEqual([
      expect.objectContaining({
        fieldId: 'public_persona',
        value: 'Idol',
        confidence: 'high',
        reason: 'Public role.',
      }),
      expect.objectContaining({
        fieldId: 'scene_tags',
        value: ['idol', 'public-facing'],
      }),
    ])
    expect(result.droppedCount).toBe(1)
  })

  test('calls AI through the injected seam and returns draft suggestions', async () => {
    const callAi = vi.fn(async () =>
      JSON.stringify({
        values: [
          { fieldId: 'private_risk', value: 'Rumors can affect agency contracts.' },
        ],
      }),
    )

    const result = await suggestProfileTemplateValues({
      template,
      profile: { name: 'Mira', role: 'Singer', entityType: 'main_role' },
      user: { name: 'Test User' },
      existingValues: [],
      settings: { api: { key: 'test-key' } },
      callAi,
    })

    expect(callAi).toHaveBeenCalledTimes(1)
    expect(callAi.mock.calls[0][0].systemPrompt).toContain('draft-only')
    expect(result.ok).toBe(true)
    expect(result.reason).toBe('suggested')
    expect(result.suggestions).toEqual([
      expect.objectContaining({
        fieldId: 'private_risk',
        value: 'Rumors can affect agency contracts.',
      }),
    ])
  })

  test('returns parse_failed when provider text is not usable JSON', async () => {
    const result = await suggestProfileTemplateValues({
      template,
      profile: { name: 'Mira' },
      callAi: vi.fn(async () => 'not json'),
    })

    expect(result).toEqual({
      ok: false,
      reason: 'parse_failed',
      suggestions: [],
      droppedCount: 0,
    })
  })
})
