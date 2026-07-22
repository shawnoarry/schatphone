import { describe, expect, test } from 'vitest'
import {
  MINI_SCENE_TRANSFORM_PROFILE_TYPE,
  validateMiniSceneTransformProfile,
  validateMiniSceneTransformProfileAsset,
} from '../src/lib/mini-scene-transform-profile'

const KPOP_SCOPE = {
  kind: 'book_worldview',
  id: 'built_in_modern_seoul_kpop_main_worldview',
}

const createProfile = (overrides = {}) => ({
  type: MINI_SCENE_TRANSFORM_PROFILE_TYPE,
  schemaVersion: 1,
  profileId: 'modern_seoul_kpop.music_show_day.v1',
  worldScopes: [KPOP_SCOPE],
  appliesTo: {
    moduleKeys: ['calendar'],
    sceneTypes: ['schedule.music_show_day'],
  },
  contentDimensions: [
    {
      id: 'public_private_tension',
      label: 'Public/private tension',
      description: 'Allow a contrast between public schedule and private waiting-room beats.',
    },
  ],
  templateId: 'mini_scene.music_show_day.v1',
  rules: [
    {
      id: 'normalize_stage_label',
      order: 20,
      operation: 'replace_text',
      inputField: 'beat_text',
      pattern: 'music\\s+show',
      flags: 'ug',
      replacement: 'music show',
    },
    {
      id: 'capture_waiting_room',
      order: 10,
      operation: 'capture_slot',
      inputField: 'summary',
      pattern: '\\[waiting-room:([^\\]]+)\\]',
      flags: 'i',
      targetSlot: 'waiting_room_note',
    },
  ],
  ...overrides,
})

describe('mini scene transform profile', () => {
  test('validates a Book structured profile and canonicalizes rule order without executing it', () => {
    const result = validateMiniSceneTransformProfileAsset({
      id: 'book_profile_1',
      category: 'world_rule',
      format: 'structured_json',
      content: JSON.stringify(createProfile({ ignoredTopLevel: 'drop' })),
      enabled: true,
    })

    expect(result.ok).toBe(true)
    expect(result.profile).toEqual({
      type: MINI_SCENE_TRANSFORM_PROFILE_TYPE,
      schemaVersion: 1,
      profileId: 'modern_seoul_kpop.music_show_day.v1',
      worldScopes: [
        { kind: 'book_worldview', id: 'built_in_modern_seoul_kpop_main_worldview' },
      ],
      appliesTo: {
        moduleKeys: ['calendar'],
        sceneTypes: ['schedule.music_show_day'],
      },
      contentDimensions: [
        {
          id: 'public_private_tension',
          label: 'Public/private tension',
          description: 'Allow a contrast between public schedule and private waiting-room beats.',
        },
      ],
      templateId: 'mini_scene.music_show_day.v1',
      rules: [
        expect.objectContaining({ id: 'capture_waiting_room', order: 10, flags: 'i' }),
        expect.objectContaining({ id: 'normalize_stage_label', order: 20, flags: 'gu' }),
      ],
    })
    expect(result.profile.enabled).toBeUndefined()
    expect(result.profile.ignoredTopLevel).toBeUndefined()
    expect(result.warnings).toEqual([
      {
        code: 'MINI_SCENE_FIELDS_IGNORED',
        path: '',
        fields: ['ignoredTopLevel'],
      },
    ])
  })

  test('requires a world-rule structured-json Book asset without activating it', () => {
    expect(
      validateMiniSceneTransformProfileAsset({
        category: 'world_rule',
        format: 'markdown',
        content: '# Narrative rule',
      }),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          code: 'MINI_SCENE_PROFILE_INVALID',
          path: 'asset',
          reason: 'world_rule_structured_json_required',
        },
      ],
    })
  })

  test('rejects a profile that presets a content-dimension choice', () => {
    const result = validateMiniSceneTransformProfile(
      createProfile({
        contentDimensions: [
          {
            id: 'sensitive_content',
            label: 'Sensitive content',
            enabled: false,
          },
        ],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MINI_SCENE_PROFILE_INVALID',
          path: 'contentDimensions[0]',
          reason: 'content_dimension_choice_forbidden',
          fields: ['enabled'],
        }),
      ]),
    )
    expect(result.profile.contentDimensions[0]).toEqual({
      id: 'sensitive_content',
      label: 'Sensitive content',
      description: '',
    })
  })

  test('rejects unsupported or invalid regex syntax with stable errors', () => {
    const result = validateMiniSceneTransformProfile(
      createProfile({
        rules: [
          {
            id: 'lookahead',
            order: 1,
            operation: 'replace_text',
            inputField: 'summary',
            pattern: 'idol(?= stage)',
            flags: 'g',
            replacement: 'artist',
          },
          {
            id: 'bad_flags',
            order: 2,
            operation: 'replace_text',
            inputField: 'summary',
            pattern: 'idol',
            flags: 'gg',
            replacement: 'artist',
          },
          {
            id: 'broken',
            order: 3,
            operation: 'replace_text',
            inputField: 'title',
            pattern: '[',
            flags: 'u',
            replacement: '',
          },
        ],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MINI_SCENE_REGEX_UNSUPPORTED',
          path: 'rules[0].pattern',
          reason: 'not_re2_compatible',
        }),
        expect.objectContaining({
          code: 'MINI_SCENE_REGEX_UNSUPPORTED',
          path: 'rules[1].flags',
          reason: 'flags_not_allowed',
        }),
        expect.objectContaining({
          code: 'MINI_SCENE_REGEX_INVALID',
          path: 'rules[2].pattern',
          reason: 'compile_failed',
        }),
      ]),
    )
  })

  test('enforces rule, pattern, and replacement limits before any runtime engine exists', () => {
    const tooManyRules = Array.from({ length: 33 }, (_, index) => ({
      id: `rule_${index}`,
      order: index,
      operation: 'replace_text',
      inputField: 'summary',
      pattern: index === 0 ? 'x'.repeat(513) : 'x',
      flags: 'g',
      replacement: index === 1 ? 'y'.repeat(2_001) : 'y',
    }))
    const result = validateMiniSceneTransformProfile(createProfile({ rules: tooManyRules }))

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MINI_SCENE_REGEX_LIMIT_EXCEEDED',
          path: 'rules',
          reason: 'too_many_rules',
        }),
        expect.objectContaining({
          code: 'MINI_SCENE_REGEX_LIMIT_EXCEEDED',
          path: 'rules[0].pattern',
          reason: 'pattern_too_long',
        }),
        expect.objectContaining({
          code: 'MINI_SCENE_REGEX_LIMIT_EXCEEDED',
          path: 'rules[1].replacement',
          reason: 'replacement_too_long',
        }),
      ]),
    )
    expect(result.profile.rules).toHaveLength(32)
  })

  test('rejects invalid or duplicate world scopes instead of falling through to another world', () => {
    const result = validateMiniSceneTransformProfile(
      createProfile({
        worldScopes: [
          KPOP_SCOPE,
          { ...KPOP_SCOPE },
          { kind: 'unknown_scope', id: 'other' },
        ],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MINI_SCENE_PROFILE_INVALID',
          path: 'worldScopes',
          reason: 'duplicate_scope',
        }),
        expect.objectContaining({
          code: 'MINI_SCENE_PROFILE_INVALID',
          path: 'worldScopes[2]',
          reason: 'invalid_scope',
        }),
      ]),
    )
  })
})
