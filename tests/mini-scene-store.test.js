import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  EVENT_RUNTIME_MINI_SCENE_TYPE,
  generateAndPresentMiniScene,
} from '../src/lib/mini-scene-runtime'
import { useMiniSceneStore } from '../src/stores/miniScene'

const NOW = new Date('2026-08-19T06:00:00.000Z').getTime()

const createRequest = (overrides = {}) => ({
  requestId: 'event_instance_1:mini_scene',
  source: {
    moduleKey: 'simulation',
    recordId: 'event_instance_1',
    eventId: 'event_instance_1',
    route: '/control-center',
  },
  sceneType: EVENT_RUNTIME_MINI_SCENE_TYPE,
  worldContext: { worldId: 'legacy_single_world' },
  participants: [
    { id: 'player', name: 'Lin Xia', role: 'performer' },
    { id: 'manager', name: 'Mina', role: 'manager' },
  ],
  facts: [
    {
      id: 'event_status',
      key: 'event.status',
      label: 'Event status',
      value: 'triggered',
      authority: 'authoritative',
    },
  ],
  presentationHint: 'text',
  ...overrides,
})

const createDraft = (overrides = {}) => ({
  title: 'The cue light turns red',
  summary: 'A short choice-driven moment after the event begins.',
  textFallback: 'The stage manager raises a hand. The next cue belongs to you.',
  beats: [
    {
      id: 'cue',
      text: 'Mina points toward the stage entrance while the countdown starts.',
      participantIds: ['manager', 'player'],
    },
  ],
  choices: [
    { id: 'step_forward', label: 'Step toward the stage', value: 'step_forward' },
    { id: 'ask_for_time', label: 'Ask for one more minute', value: 'ask_for_time' },
  ],
  document: { templateId: '', variantId: '', slots: {}, assetIds: [] },
  ...overrides,
})

describe('Mini Scene AI runtime and store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('registers Event Runtime and keeps a new presentation policy unconfigured', () => {
    const store = useMiniSceneStore()

    expect(store.registeredModules).toEqual([
      expect.objectContaining({
        moduleKey: 'simulation',
        route: '/control-center',
        sceneTypes: [EVENT_RUNTIME_MINI_SCENE_TYPE],
      }),
    ])
    expect(store.getModulePolicy('simulation')).toEqual({
      moduleKey: 'simulation',
      mode: 'unconfigured',
    })
  })

  test('requires AI and never commits a deterministic or invalid fallback', async () => {
    const store = useMiniSceneStore()
    store.setModulePresentationMode('simulation', 'text')

    const missingProvider = await generateAndPresentMiniScene(
      { request: createRequest() },
      { miniSceneStore: store, now: NOW },
    )
    expect(missingProvider).toMatchObject({
      ok: false,
      status: 'failed',
      reason: 'provider_missing',
      providerCallCount: 0,
    })

    const invalidProvider = vi.fn(async () => ({
      text: JSON.stringify(createDraft({ textFallback: '<button>Continue</button>' })),
      meta: { apiKind: 'openai_compatible' },
    }))
    const invalid = await generateAndPresentMiniScene(
      { request: createRequest() },
      { miniSceneStore: store, providerAdapter: invalidProvider, now: NOW },
    )

    expect(invalid).toMatchObject({
      ok: false,
      status: 'failed',
      reason: 'response_invalid',
      providerCallCount: 1,
    })
    expect(store.artifacts).toEqual([])
    expect(store.activeArtifact).toBeNull()
  })

  test('generates through AI, validates, commits, audits, persists, and exposes an owner request', async () => {
    const store = useMiniSceneStore()
    expect(store.setModulePresentationMode('simulation', 'text')).toBe(true)
    const provider = vi.fn(async ({ miniSceneRequest, systemPrompt }) => {
      expect(miniSceneRequest.request.source).toMatchObject({
        moduleKey: 'simulation',
        eventId: 'event_instance_1',
      })
      expect(miniSceneRequest.narrativeRules).toContain('Keep the countdown tense')
      expect(systemPrompt).toContain('Event Runtime has already established')
      return {
        text: JSON.stringify(createDraft()),
        meta: {
          apiKind: 'openai_compatible',
          requestId: 'provider-request-1',
        },
      }
    })

    const result = await generateAndPresentMiniScene(
      {
        request: createRequest(),
        narrativeRules: 'Keep the countdown tense without changing event facts.',
      },
      {
        miniSceneStore: store,
        providerAdapter: provider,
        providerMetadata: { modelId: 'test-model' },
        now: NOW,
      },
    )

    expect(result).toMatchObject({
      ok: true,
      status: 'presented_text',
      providerCallCount: 1,
      artifact: {
        source: { moduleKey: 'simulation', eventId: 'event_instance_1' },
        provenance: {
          sourceKind: 'ai',
          providerId: 'openai_compatible',
          modelId: 'test-model',
          generatedAt: NOW,
        },
      },
    })
    expect(provider).toHaveBeenCalledTimes(1)
    expect(store.activeArtifact?.content.choices).toHaveLength(2)

    expect(store.chooseActiveArtifact('step_forward')).toBe(true)
    expect(store.getActiveChoiceRequest()).toEqual({
      ok: true,
      reason: 'owner_validation_required',
      request: {
        command: 'mini_scene.choose',
        artifactId: 'event_instance_1:mini_scene:ai:text:v1',
        requestId: 'event_instance_1:mini_scene',
        source: {
          moduleKey: 'simulation',
          recordId: 'event_instance_1',
          eventId: 'event_instance_1',
        },
        choice: {
          id: 'step_forward',
          label: 'Step toward the stage',
          value: 'step_forward',
        },
      },
    })
    expect(store.closeActiveArtifact()).toBe(true)
    expect(store.saveNow()).toMatchObject({ ok: true })

    setActivePinia(createPinia())
    const restored = useMiniSceneStore()
    expect(restored.artifacts).toHaveLength(1)
    expect(restored.artifacts[0]).toMatchObject({
      interactionState: { selectedChoiceId: 'step_forward', closed: true },
      provenance: { sourceKind: 'ai', providerId: 'openai_compatible' },
    })
    expect(restored.activeArtifact).toBeNull()
  })

  test('off and unconfigured policies suppress the AI call without changing event eligibility', async () => {
    const store = useMiniSceneStore()
    const provider = vi.fn(async () => ({
      text: JSON.stringify(createDraft()),
      meta: { apiKind: 'openai_compatible' },
    }))

    const unconfigured = await generateAndPresentMiniScene(
      { request: createRequest() },
      { miniSceneStore: store, providerAdapter: provider, now: NOW },
    )
    expect(unconfigured).toMatchObject({
      ok: true,
      status: 'skipped',
      reason: 'unconfigured',
      providerCallCount: 0,
    })

    store.setModulePresentationMode('simulation', 'off')
    const off = await generateAndPresentMiniScene(
      { request: createRequest() },
      { miniSceneStore: store, providerAdapter: provider, now: NOW },
    )
    expect(off).toMatchObject({
      ok: true,
      status: 'skipped',
      reason: 'user_off',
      providerCallCount: 0,
    })
    expect(provider).not.toHaveBeenCalled()
    expect(store.artifacts).toEqual([])
  })
})
