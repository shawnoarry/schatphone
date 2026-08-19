import { describe, expect, test } from 'vitest'
import {
  normalizeMiniSceneArtifact,
  normalizeMiniSceneModulePolicy,
  normalizeMiniSceneProfileBinding,
  resolveMiniScenePresentationPolicy,
  validateMiniSceneArtifact,
  validateMiniSceneDraft,
  validateMiniSceneRequest,
} from '../src/lib/mini-scene-schema'

describe('mini scene schemas', () => {
  test('normalizes a bounded request and strips fields outside the Interface', () => {
    const result = validateMiniSceneRequest({
      requestId: 'Request 1',
      source: {
        moduleKey: 'Calendar',
        recordId: 'Event 1',
        eventId: 'Runtime 1',
        route: '/calendar',
        copiedRecord: { should: 'drop' },
      },
      sceneType: 'schedule.music_show_day',
      worldContext: {
        mainWorldviewAssetId: 'World 1',
        activeWorldPackId: 'Default World',
        rawWorldText: 'drop',
      },
      participants: [
        { id: 'Role 1', name: 'Yuna', role: 'performer', secret: 'drop' },
        { id: 'missing_name' },
      ],
      facts: [
        { id: 'Fact 1', key: 'schedule.status', value: 'confirmed', authority: 'authoritative' },
        { id: 'Fact 2', key: 'scene.color', value: 'blue', authority: 'generated_fiction' },
        { id: 'bad', key: '', value: { nested: 'drop' } },
      ],
      presentationHint: 'interactive_html',
      rawPrompt: 'drop',
      html: '<script>drop</script>',
    })

    expect(result.ok).toBe(true)
    expect(result.request).toEqual({
      schemaVersion: 1,
      requestId: 'request_1',
      source: {
        moduleKey: 'calendar',
        recordId: 'event_1',
        eventId: 'runtime_1',
        route: '/calendar',
      },
      sceneType: 'schedule.music_show_day',
      worldContext: {
        worldId: 'legacy_single_world',
        mainWorldviewAssetId: 'world_1',
        activeWorldPackId: 'default_world',
        manualScopeId: '',
      },
      participants: [{ id: 'role_1', name: 'Yuna', role: 'performer' }],
      time: { startAt: '', endAt: '', label: '', timeZone: '' },
      place: { placeId: '', name: '', address: '' },
      facts: [
        {
          id: 'fact_1',
          key: 'schedule.status',
          label: '',
          value: 'confirmed',
          authority: 'authoritative',
        },
        {
          id: 'fact_2',
          key: 'scene.color',
          label: '',
          value: 'blue',
          authority: 'generated_fiction',
        },
      ],
      presentationHint: 'interactive_html',
    })
  })

  test('returns stable request errors without inventing source identity', () => {
    const result = validateMiniSceneRequest({
      source: { route: 'javascript:alert(1)' },
    })

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      { code: 'MINI_SCENE_REQUEST_INVALID', path: 'requestId', reason: 'required' },
      { code: 'MINI_SCENE_REQUEST_INVALID', path: 'sceneType', reason: 'required' },
      { code: 'MINI_SCENE_REQUEST_INVALID', path: 'source.moduleKey', reason: 'required' },
      { code: 'MINI_SCENE_REQUEST_INVALID', path: 'source.recordId', reason: 'required' },
    ])
    expect(result.request.source.route).toBe('')
  })

  test('keeps user mode authoritative and only permits downgrades', () => {
    expect(resolveMiniScenePresentationPolicy()).toEqual({ mode: 'off', reason: 'unconfigured' })
    expect(
      resolveMiniScenePresentationPolicy({
        policy: { moduleKey: 'calendar', mode: 'interactive_html' },
        supportedModes: ['text'],
      }),
    ).toEqual({ mode: 'text', reason: 'downgraded_to_text' })
    expect(
      resolveMiniScenePresentationPolicy({
        policy: { moduleKey: 'calendar', mode: 'interactive_html' },
        supportedModes: ['text', 'interactive_html'],
        presentationHint: 'text',
      }),
    ).toEqual({ mode: 'text', reason: 'downgraded_to_text' })
    expect(
      resolveMiniScenePresentationPolicy({
        policy: { moduleKey: 'calendar', mode: 'text' },
        supportedModes: ['interactive_html'],
      }),
    ).toEqual({ mode: 'off', reason: 'unsupported' })
    expect(
      resolveMiniScenePresentationPolicy({
        policy: { moduleKey: 'calendar', mode: 'interactive_html' },
        pauseAll: true,
      }),
    ).toEqual({ mode: 'off', reason: 'paused' })
  })

  test('keeps unconfigured separate from off and stores only explicit dimension choices', () => {
    expect(normalizeMiniSceneModulePolicy({ moduleKey: 'Calendar', mode: 'unknown', extra: true })).toEqual({
      moduleKey: 'calendar',
      mode: 'unconfigured',
    })

    expect(
      normalizeMiniSceneProfileBinding({
        id: 'Binding 1',
        profileId: 'Profile 1',
        active: true,
        scope: { kind: 'book_worldview', id: 'World 1' },
        contentDimensionChoices: {
          romance: 'include',
          sensitive: 'unconfigured',
          violence: 'exclude',
          unknown: 'automatic',
        },
      }),
    ).toEqual({
      id: 'binding_1',
      worldId: 'legacy_single_world',
      profileId: 'profile_1',
      scope: { kind: 'book_worldview', id: 'world_1' },
      active: true,
      contentDimensionChoices: {
        romance: 'include',
        violence: 'exclude',
      },
    })
  })

  test('requires a text fallback and never admits raw HTML into a draft or artifact', () => {
    const invalidDraft = validateMiniSceneDraft({ title: 'Backstage', html: '<button>Go</button>' })
    expect(invalidDraft.ok).toBe(false)
    expect(invalidDraft.errors).toEqual([
      { code: 'MINI_SCENE_DRAFT_INVALID', path: 'textFallback', reason: 'required' },
    ])
    expect(invalidDraft.draft.html).toBeUndefined()

    const artifact = normalizeMiniSceneArtifact({
      artifactId: 'Artifact 1',
      requestId: 'Request 1',
      source: { moduleKey: 'calendar', recordId: 'event_1' },
      sceneType: 'schedule.music_show_day',
      profileId: 'kpop.music_show.v1',
      profileVersion: 1,
      provenance: {
        sourceKind: 'ai',
        providerId: 'openai_compatible',
        modelId: 'test-model',
        requestId: 'provider-request-1',
        generatedAt: 1_787_180_000_000,
      },
      content: {
        title: 'Backstage',
        textFallback: 'The group waits for the cue.',
        html: '<button onclick="steal()">Go</button>',
        document: {
          templateId: 'mini_scene.music_show_day.v1',
          slots: { status: 'waiting', unsafe: { html: '<script />' } },
        },
      },
      rawPrompt: 'drop',
      rawProviderResponse: 'drop',
      renderedHtml: '<script>drop</script>',
    })

    expect(artifact.content).toMatchObject({
      title: 'Backstage',
      textFallback: 'The group waits for the cue.',
      document: {
        templateId: 'mini_scene.music_show_day.v1',
        slots: { status: 'waiting' },
      },
    })
    expect(artifact.content.html).toBeUndefined()
    expect(artifact.rawPrompt).toBeUndefined()
    expect(artifact.renderedHtml).toBeUndefined()
    expect(validateMiniSceneArtifact(artifact).ok).toBe(true)

    expect(
      validateMiniSceneArtifact({
        ...artifact,
        provenance: {
          sourceKind: 'deterministic_calendar',
          generatedAt: 1_787_180_000_000,
        },
      }),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          path: 'provenance.sourceKind',
          reason: 'ai_required',
        }),
        expect.objectContaining({
          path: 'provenance.providerId',
          reason: 'required',
        }),
      ]),
    })
  })

  test('rejects duplicate ids and collection overflow instead of silently accepting ambiguity', () => {
    const request = validateMiniSceneRequest({
      requestId: 'request_1',
      source: { moduleKey: 'calendar', recordId: 'event_1', route: '/calendar' },
      sceneType: 'schedule.music_show_day',
      participants: [
        { id: 'same', name: 'A' },
        { id: 'same', name: 'B' },
      ],
      facts: Array.from({ length: 65 }, (_, index) => ({
        id: `fact_${index}`,
        key: `fact.${index}`,
        value: index,
      })),
    })

    expect(request.ok).toBe(false)
    expect(request.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'facts', reason: 'limit_exceeded', max: 64 }),
        expect.objectContaining({ path: 'participants', reason: 'duplicate_id', ids: ['same'] }),
      ]),
    )
  })
})
