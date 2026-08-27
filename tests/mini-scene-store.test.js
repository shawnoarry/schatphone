import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  EVENT_RUNTIME_MINI_SCENE_TYPE,
  generateAndPresentMiniScene,
} from '../src/lib/mini-scene-runtime'
import {
  MINI_SCENE_STORAGE_VERSION,
  migrateMiniSceneStorage,
  useMiniSceneStore,
} from '../src/stores/miniScene'

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

const createArtifact = (index = 1, overrides = {}) => ({
  artifactId: `event_instance_${index}:mini_scene:ai:text:v1`,
  requestId: `event_instance_${index}:mini_scene`,
  source: {
    moduleKey: 'simulation',
    recordId: `event_instance_${index}`,
    eventId: `event_instance_${index}`,
  },
  sceneType: EVENT_RUNTIME_MINI_SCENE_TYPE,
  worldId: 'legacy_single_world',
  content: createDraft({ title: `Scene ${index}` }),
  provenance: {
    sourceKind: 'ai',
    providerId: 'openai_compatible',
    modelId: 'test-model',
    generatedAt: NOW - index,
  },
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

  test('presents AI output temporarily, exposes an owner request, and persists only after retain', async () => {
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
    expect(store.activeArtifact?.retention.state).toBe('temporary')
    expect(store.artifacts).toEqual([])
    expect(store.interactionAudit).toEqual([])

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
    expect(store.artifacts).toEqual([])
    expect(store.interactionAudit).toEqual([])

    expect(store.retainActiveArtifact({ now: NOW + 1 })).toMatchObject({
      ok: true,
      artifact: { retention: { state: 'retained', retainedAt: NOW + 1 } },
    })
    expect(store.artifacts).toHaveLength(1)
    expect(store.closeActiveArtifact()).toBe(true)
    expect(store.saveNow()).toMatchObject({ ok: true })

    setActivePinia(createPinia())
    const restored = useMiniSceneStore()
    expect(restored.artifacts).toHaveLength(1)
    expect(restored.artifacts[0]).toMatchObject({
      interactionState: { selectedChoiceId: 'step_forward', closed: true },
      retention: { state: 'retained', retainedAt: NOW + 1 },
      provenance: { sourceKind: 'ai', providerId: 'openai_compatible' },
    })
    expect(restored.activeArtifact).toBeNull()
  })

  test('reopens the same retained occurrence before calling the provider and versions explicit regeneration', async () => {
    const store = useMiniSceneStore()
    store.setModulePresentationMode('simulation', 'text')
    const provider = vi.fn(async () => ({
      text: JSON.stringify(createDraft()),
      meta: { apiKind: 'openai_compatible' },
    }))

    const first = await generateAndPresentMiniScene(
      { request: createRequest() },
      { miniSceneStore: store, providerAdapter: provider, now: NOW },
    )
    expect(first.providerCallCount).toBe(1)
    expect(store.retainActiveArtifact({ now: NOW + 1 }).ok).toBe(true)
    store.closeActiveArtifact()

    const differentRecord = await generateAndPresentMiniScene(
      {
        request: createRequest({
          requestId: 'event_instance_2:mini_scene',
          source: {
            moduleKey: 'simulation',
            recordId: 'event_instance_2',
            eventId: 'event_instance_1',
            route: '/control-center',
          },
        }),
      },
      { miniSceneStore: store, providerAdapter: provider, now: NOW + 2 },
    )
    expect(differentRecord.providerCallCount).toBe(1)
    store.closeActiveArtifact()

    const reopened = await generateAndPresentMiniScene(
      { request: createRequest({ requestId: 'event_instance_1:mini_scene:reopen' }) },
      { miniSceneStore: store, providerAdapter: provider, now: NOW + 3 },
    )
    expect(reopened).toMatchObject({
      ok: true,
      reason: 'reused_retained',
      providerCallCount: 0,
      artifact: { artifactId: first.artifact.artifactId, revision: 1 },
    })
    expect(provider).toHaveBeenCalledTimes(2)
    store.closeActiveArtifact()

    const regenerated = await generateAndPresentMiniScene(
      {
        request: createRequest({ requestId: 'event_instance_1:mini_scene:regenerated' }),
        regenerationOfArtifactId: first.artifact.artifactId,
      },
      { miniSceneStore: store, providerAdapter: provider, now: NOW + 4 },
    )
    expect(regenerated).toMatchObject({
      ok: true,
      providerCallCount: 1,
      artifact: {
        artifactId: 'event_instance_1:mini_scene:regenerated:ai:text:v2',
        revision: 2,
        previousArtifactId: first.artifact.artifactId,
        retention: { state: 'temporary' },
      },
    })
    expect(store.artifacts).toHaveLength(1)
    expect(provider).toHaveBeenCalledTimes(3)
  })

  test('migrates V1 artifacts as retained, keeps more than 120, and pages without deleting history', () => {
    const legacyArtifacts = Array.from({ length: 125 }, (_, index) => createArtifact(index + 1))
    localStorage.setItem(
      'schatphone:store:mini-scene',
      JSON.stringify({
        version: 1,
        savedAt: NOW,
        data: {
          schemaVersion: 1,
          modulePolicies: [{ moduleKey: 'simulation', mode: 'text' }],
          profileBindings: [],
          artifacts: legacyArtifacts,
          interactionAudit: [],
        },
      }),
    )
    setActivePinia(createPinia())
    const store = useMiniSceneStore()

    expect(MINI_SCENE_STORAGE_VERSION).toBe(2)
    expect(migrateMiniSceneStorage({ version: 3, data: {} })).toBeNull()
    expect(store.artifacts).toHaveLength(125)
    expect(store.artifacts.every((artifact) => artifact.retention.state === 'retained')).toBe(true)
    expect(store.artifacts.every((artifact) => artifact.revision === 1)).toBe(true)

    const page = store.listRetainedArtifacts({ page: 3, pageSize: 50 })
    expect(page).toMatchObject({ total: 125, page: 3, pageSize: 50, totalPages: 3 })
    expect(page.items).toHaveLength(25)
    expect(store.artifacts).toHaveLength(125)
    expect(store.createBackupSnapshot()).toMatchObject({ schemaVersion: 2 })

    const legacyBackupStore = useMiniSceneStore(createPinia())
    expect(legacyBackupStore.restoreFromBackup({
      miniScene: {
        schemaVersion: 1,
        modulePolicies: [],
        profileBindings: [],
        artifacts: [createArtifact(999)],
        interactionAudit: [],
      },
    })).toBe(true)
    expect(legacyBackupStore.artifacts[0]).toMatchObject({
      artifactId: 'event_instance_999:mini_scene:ai:text:v1',
      retention: { state: 'retained' },
    })
  })

  test('archives, restores, and deletes retained Mini Scenes through receipt-gated commands', () => {
    const store = useMiniSceneStore()
    const artifact = store.commitArtifact(createArtifact())
    expect(store.saveNow()).toMatchObject({ ok: true })

    expect(store.archiveArtifact(artifact.artifactId, { now: NOW + 1 })).toMatchObject({
      ok: true,
      artifact: { retention: { state: 'archived', archivedAt: NOW + 1 } },
    })
    expect(store.listRetainedArtifacts({ state: 'archived' }).total).toBe(1)
    expect(store.restoreArtifact(artifact.artifactId, { now: NOW + 2 })).toMatchObject({
      ok: true,
      artifact: { retention: { state: 'retained', archivedAt: 0 } },
    })
    expect(store.deleteArtifact(artifact.artifactId, { now: NOW + 3 })).toMatchObject({ ok: true })
    expect(store.artifacts).toEqual([])
    expect(store.interactionAudit.some((entry) => entry.action === 'deleted')).toBe(true)
  })

  test('rolls back archive and delete when their persistence receipt fails', () => {
    const store = useMiniSceneStore()
    const artifact = store.commitArtifact(createArtifact())
    expect(store.saveNow()).toMatchObject({ ok: true })
    const originalSetItem = Storage.prototype.setItem
    let shouldFail = true
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (shouldFail && key === 'schatphone:store:mini-scene') {
        throw new DOMException('quota', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    })

    expect(store.archiveArtifact(artifact.artifactId)).toMatchObject({
      ok: false,
      reason: 'quota_exceeded',
    })
    expect(store.findArtifactById(artifact.artifactId)?.retention.state).toBe('retained')

    shouldFail = false
    expect(store.archiveArtifact(artifact.artifactId)).toMatchObject({ ok: true })
    shouldFail = true
    expect(store.deleteArtifact(artifact.artifactId)).toMatchObject({
      ok: false,
      reason: 'quota_exceeded',
    })
    expect(store.findArtifactById(artifact.artifactId)?.retention.state).toBe('archived')
    failure.mockRestore()
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
