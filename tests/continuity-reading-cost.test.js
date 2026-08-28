import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { EVENT_RUNTIME_MINI_SCENE_TYPE } from '../src/lib/mini-scene-runtime'
import { useMiniSceneStore } from '../src/stores/miniScene'
import {
  RELATIONSHIP_PROMPT_READING_LIMITS,
  useRelationshipRuntimeStore,
} from '../src/stores/relationshipRuntime'

const createRelationshipEvent = ({ index, entityKey, profileId }) => ({
  id: `continuity_event_${profileId}_${index}`,
  entityKey,
  targetLabel: `Role ${profileId}`,
  sourceModule: 'relationship_performance_fixture',
  sourceId: `private_owner_record_${profileId}_${index}`,
  memoryKey: `continuity_memory_${profileId}_${index}`,
  factType: 'history_note',
  summary: `Continuity note ${profileId}-${index}.`,
  metricDeltas: {},
  status: 'applied',
  effectApplied: false,
  createdAt: index,
})

const createMiniSceneArtifact = (index) => ({
  artifactId: `continuity_event_${index}:mini_scene:ai:text:v1`,
  requestId: `continuity_event_${index}:mini_scene`,
  source: {
    moduleKey: 'simulation',
    recordId: `continuity_event_${index}`,
    eventId: `continuity_event_${index}`,
  },
  sceneType: EVENT_RUNTIME_MINI_SCENE_TYPE,
  worldId: 'legacy_single_world',
  content: {
    title: `Retained scene ${index}`,
    summary: `Summary ${index}`,
    textFallback: `Scene text ${index}`,
    beats: [{ id: 'beat', text: `Beat ${index}`, participantIds: [] }],
    choices: [],
    document: { templateId: '', variantId: '', slots: {}, assetIds: [] },
  },
  provenance: {
    sourceKind: 'ai',
    providerId: 'test',
    modelId: 'test-model',
    generatedAt: 10_000 - index,
  },
  revision: 1,
  previousArtifactId: '',
  retention: {
    state: index % 2 === 0 ? 'archived' : 'retained',
    retainedAt: 10_000 - index,
    archivedAt: index % 2 === 0 ? 20_000 - index : 0,
  },
  interactionState: { selectedChoiceId: '' },
})

describe('CMG-09 bounded continuity reading', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('pages one Contacts owner without scanning other owners on every warm read', () => {
    const store = useRelationshipRuntimeStore()
    const targetProfileId = 9001
    const targetEntityKey = `role:${targetProfileId}`
    const targetEvents = Array.from({ length: 800 }, (_, index) =>
      createRelationshipEvent({ index, entityKey: targetEntityKey, profileId: targetProfileId }),
    )
    const otherEvents = Array.from({ length: 4_000 }, (_, index) => {
      const profileId = 10_000 + (index % 100)
      return createRelationshipEvent({
        index,
        entityKey: `role:${profileId}`,
        profileId,
      })
    })
    expect(store.restoreFromBackup({
      entities: [
        { entityKey: targetEntityKey, profileId: targetProfileId, kind: 'role', displayName: 'Target' },
        ...Array.from({ length: 100 }, (_, index) => ({
          entityKey: `role:${10_000 + index}`,
          profileId: 10_000 + index,
          kind: 'role',
          displayName: `Other ${index}`,
        })),
      ],
      events: [...targetEvents, ...otherEvents],
    })).toBe(true)

    const coldStartedAt = performance.now()
    const firstPage = store.listMemoryGroupPageForTarget(
      { profileId: targetProfileId },
      { limit: 12, offset: 0 },
    )
    const coldDurationMs = performance.now() - coldStartedAt
    const warmStartedAt = performance.now()
    const lastPage = store.listMemoryGroupPageForTarget(
      { profileId: targetProfileId },
      { limit: 12, offset: 792 },
    )
    const warmDurationMs = performance.now() - warmStartedAt

    expect(firstPage).toMatchObject({ totalCount: 800, page: 1, pageCount: 67 })
    expect(firstPage.items).toHaveLength(12)
    expect(lastPage.items).toHaveLength(8)
    expect(store.events).toHaveLength(4_800)
    expect(coldDurationMs).toBeLessThan(1_500)
    expect(warmDurationMs).toBeLessThan(100)
  })

  test('bounds Chat continuity to summaries and excludes supporting owner records', () => {
    const store = useRelationshipRuntimeStore()
    const profileId = 9100
    const entityKey = `role:${profileId}`
    const history = Array.from({ length: 1_000 }, (_, index) =>
      createRelationshipEvent({ index, entityKey, profileId }),
    )
    history.push(
      {
        ...createRelationshipEvent({ index: 1_001, entityKey, profileId }),
        id: 'shared_experience_primary',
        sourceModule: 'relationship_shopping_gift',
        sourceId: 'private_gift_order_record',
        memoryKey: 'shared_experience__gift_9100',
        sharedExperienceId: 'gift:9100',
        summary: 'Gift order owner record.',
        memorySummary: 'A gift was planned for this relationship.',
        effectApplied: true,
      },
      {
        ...createRelationshipEvent({ index: 1_002, entityKey, profileId }),
        id: 'shared_experience_supporting',
        sourceModule: 'relationship_phone_call',
        sourceId: 'private_phone_record',
        memoryKey: 'shared_experience__gift_9100',
        sharedExperienceId: 'gift:9100',
        summary: 'SUPPORTING_OWNER_RECORD_MUST_NOT_ENTER_PROMPT',
        memorySummary: 'The gift arrived and the recipient called to say they loved it.',
        memoryRole: 'supporting',
        forceSupportingMemory: true,
        effectApplied: false,
      },
    )
    expect(store.restoreFromBackup({
      entities: [{ entityKey, profileId, kind: 'role', displayName: 'Prompt Target' }],
      events: history,
    })).toBe(true)

    const projection = store.buildPromptProjectionForTarget(
      { profileId },
      {
        recallQuery: 'Continuity note 9100-12',
        memoryLimit: 99,
        memoryCharacterBudget: 99_999,
        sharedExperienceLimit: 99,
        sharedExperienceCharacterBudget: 99_999,
      },
    )

    expect(projection.memoryRecall.items.length).toBeLessThanOrEqual(
      RELATIONSHIP_PROMPT_READING_LIMITS.relevantMemoryItems,
    )
    expect(projection.memoryRecall.characterCount).toBeLessThanOrEqual(
      RELATIONSHIP_PROMPT_READING_LIMITS.relevantMemoryCharacters,
    )
    expect(projection.sharedExperienceSummaries.items).toHaveLength(1)
    expect(projection.sharedExperienceSummaries.characterCount).toBeLessThanOrEqual(
      RELATIONSHIP_PROMPT_READING_LIMITS.sharedExperienceCharacters,
    )
    expect(projection.text).toContain(
      'Active shared experiences: The gift arrived and the recipient called to say they loved it.',
    )
    expect(projection.text).not.toContain('SUPPORTING_OWNER_RECORD_MUST_NOT_ENTER_PROMPT')
    expect(projection.text).not.toContain('private_phone_record')
    expect(projection.text).not.toContain('relationship_phone_call')
    expect(projection.text).not.toContain('Recent relationship events:')
    expect(projection.text.length).toBeLessThan(1_800)
    expect(store.events).toHaveLength(1_002)
  })

  test('pages retained Mini Scene history through the cached state index', () => {
    const store = useMiniSceneStore()
    const artifacts = Array.from({ length: 1_500 }, (_, index) =>
      createMiniSceneArtifact(index + 1),
    )
    expect(store.restoreFromBackup({
      schemaVersion: 2,
      modulePolicies: [],
      profileBindings: [],
      artifacts,
      interactionAudit: [],
    })).toBe(true)

    const coldStartedAt = performance.now()
    const firstPage = store.listRetainedArtifacts({ state: 'retained', page: 1, pageSize: 8 })
    const coldDurationMs = performance.now() - coldStartedAt
    const warmStartedAt = performance.now()
    const laterPage = store.listRetainedArtifacts({ state: 'retained', page: 50, pageSize: 8 })
    const warmDurationMs = performance.now() - warmStartedAt

    expect(firstPage).toMatchObject({ total: 750, page: 1, pageSize: 8, totalPages: 94 })
    expect(firstPage.items).toHaveLength(8)
    expect(laterPage.items).toHaveLength(8)
    expect(store.artifacts).toHaveLength(1_500)
    expect(coldDurationMs).toBeLessThan(1_000)
    expect(warmDurationMs).toBeLessThan(100)
  })
})
