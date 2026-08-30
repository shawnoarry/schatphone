import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  EVENT_TEXT_FAILURE_CODE,
  EVENT_TEXT_MODE,
  EVENT_TEXT_STATUS,
  normalizeEventInstanceV1,
  normalizeEventInstancesV1,
  normalizeEventTemplateV2,
  normalizeEventVariantPackV1,
} from '../src/lib/simulation/event-contracts'
import {
  EVENT_REGISTRY_ERROR,
  createEventTemplateRegistry,
  createEventVariantPackRegistry,
} from '../src/lib/simulation/event-registry'
import {
  EVENT_INSTANCE_MATERIALIZATION_ERROR,
  materializeLocalEventInstanceV1,
} from '../src/lib/simulation/event-instance-materializer'
import { composeEventTextV1 } from '../src/lib/simulation/event-text-composer'
import {
  BUILT_IN_KPOP_EVENT_PACK,
  BUILT_IN_KPOP_EVENT_TEMPLATE,
  KPOP_REALISM_EVENT_ADAPTER_KEY,
  createBuiltInKpopEventRegistries,
} from '../src/lib/simulation/kpop-realism-event-pack'
import {
  SIMULATION_EVENT_TEXT_MODE,
  SIMULATION_SURPRISE_MODE,
  useSimulationStore,
} from '../src/stores/simulation'

const readFixture = (name) =>
  JSON.parse(readFileSync(resolve('tests/fixtures/events/kpop-realism-v1', name), 'utf8'))

const contractFixture = readFixture('template-and-variant-pack-v1.json')
const instanceFixture = readFixture('instance-cases-v1.json')

const createMaterializationInput = (overrides = {}) => ({
  instanceId: 'event_instance_test_001',
  source: {
    moduleKey: 'map',
    recordType: 'map_place_session',
    recordId: 'map_place_session_test_001',
    recordRevision: 2,
    checkpointId: 'map.place_session.entered.v1',
    checkpointAt: 1_786_338_060_000,
  },
  world: {
    worldId: 'world_local_primary',
    worldContextId: 'world_context_daily',
    worldPackId: 'default_world',
    mapPackId: 'real-seoul-v1',
    mapPackVersion: 1,
    semanticVersionId: 'semantic_1_abcdef123456',
    semanticManifestRevision: 1,
    semanticManifestHash: 'a'.repeat(64),
    semanticSourceFingerprint: 'b'.repeat(64),
  },
  place: {
    placeId: 'seoul-mbc-hq',
    placeCategoryId: 'broadcast_station',
    capabilityIds: ['work', 'meet', 'wait', 'record', 'perform'],
  },
  presence: {
    activationScope: 'interior',
    relation: 'inside',
    provenance: 'journey_arrival',
    placeSessionId: 'map_place_session_test_001',
    placeSessionRevision: 2,
    journeyId: 'map_journey_test_001',
    evidenceAt: 1_786_338_060_000,
  },
  runtime: {
    proposalId: 'event_proposal_test_001',
    eligibilityLogId: 'simulation_event_test_001',
  },
  locale: 'en',
  contextHash: 'ctx_test_001',
  seed: 'fixture:test:001',
  now: 1_786_338_060_000,
  ...overrides,
})

const createAiCopy = () => ({
  locale: 'en',
  title: 'A quiet minute before production',
  opening: 'Beyond the lobby doors, the production floor settles into a measured rhythm.',
  environment: 'A coordinator has left a short briefing beside the access desk.',
  dialogue: [
    {
      speakerRef: 'staff_coordinator',
      text: 'You have a few minutes. Choose the preparation route that works for you.',
    },
  ],
  choiceLabels: {
    review_brief: 'Read the production brief',
    check_equipment: 'Run a quick equipment check',
    wait_for_staff: 'Stay in the waiting area',
  },
  consequenceByOutcomeId: {
    brief_reviewed: 'The key notes are clear, and the next move remains yours.',
    equipment_checked: 'The check is complete without changing inventory.',
    wait_acknowledged: 'You keep your place without changing the production schedule.',
  },
})

describe('EVE-2B contract normalizers and registries', () => {
  test('normalizes the frozen template, pack, and all six instance cases', () => {
    expect(normalizeEventTemplateV2(contractFixture.eventTemplate)).toEqual(
      BUILT_IN_KPOP_EVENT_TEMPLATE,
    )
    expect(normalizeEventVariantPackV1(contractFixture.variantPack)).toEqual(
      BUILT_IN_KPOP_EVENT_PACK,
    )

    const result = normalizeEventInstancesV1(
      instanceFixture.cases.map((fixtureCase) => fixtureCase.instance),
    )
    expect(result.instances).toHaveLength(6)
    expect(result.rejected).toEqual([])
    expect(result.instances.map((instance) => instance.id)).toEqual(
      instanceFixture.cases.map((fixtureCase) => fixtureCase.instance.id),
    )
  })

  test('fails closed for unknown schemas, duplicate registrations, and incomplete variant copy', () => {
    expect(
      normalizeEventTemplateV2({ ...contractFixture.eventTemplate, schemaVersion: 3 }),
    ).toBeNull()
    expect(
      normalizeEventInstanceV1({ ...instanceFixture.cases[0].instance, schemaVersion: 2 }),
    ).toBeNull()

    const templateRegistry = createEventTemplateRegistry([contractFixture.eventTemplate], {
      adapterKeys: [KPOP_REALISM_EVENT_ADAPTER_KEY],
    })
    expect(templateRegistry.register(contractFixture.eventTemplate).errors[0].code).toBe(
      EVENT_REGISTRY_ERROR.TEMPLATE_DUPLICATE,
    )

    const incompletePack = structuredClone(contractFixture.variantPack)
    delete incompletePack.templateVariants['workplace.arrival_briefing'][0].localCopy.choicesById
      .review_brief
    const packRegistry = createEventVariantPackRegistry([], { templateRegistry })
    expect(packRegistry.register(incompletePack).errors[0].code).toBe(
      EVENT_REGISTRY_ERROR.VARIANT_COPY_INCOMPLETE,
    )
  })
})

describe('EVE-2B local instance materializer', () => {
  test('materializes complete local text and optional-AI pending state without domain effects', () => {
    const localResult = materializeLocalEventInstanceV1(createMaterializationInput())
    expect(localResult).toMatchObject({ ok: true, reason: 'local_instance_materialized' })
    expect(localResult.instance).toMatchObject({
      lifecycle: 'active',
      templateRef: { id: 'workplace.arrival_briefing', schemaVersion: 2, version: 1 },
      text: {
        status: EVENT_TEXT_STATUS.LOCAL_ONLY,
        source: 'local',
        attemptCount: 0,
        contextHash: 'ctx_test_001',
      },
      media: { renderMode: 'text_only' },
      outcome: {
        adapterKey: KPOP_REALISM_EVENT_ADAPTER_KEY,
        requestState: 'not_requested',
      },
    })
    expect(localResult.instance.text.normalizedCopy.choiceLabels).toEqual({
      review_brief: 'Review the briefing',
      check_equipment: 'Check your equipment',
      wait_for_staff: 'Wait for staff',
    })

    const aiPending = materializeLocalEventInstanceV1(
      createMaterializationInput({ textMode: EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY }),
    )
    expect(aiPending.instance.text.status).toBe(EVENT_TEXT_STATUS.PENDING)
    expect(aiPending.instance.text.normalizedCopy).toEqual(localResult.instance.text.normalizedCopy)
  })

  test('rejects place and presence input that cannot prove the frozen template eligibility', () => {
    const wrongPlace = materializeLocalEventInstanceV1(
      createMaterializationInput({
        place: {
          placeId: 'seoul-cafe-test',
          placeCategoryId: 'cafe',
          capabilityIds: ['wait'],
        },
      }),
    )
    expect(wrongPlace.reason).toBe(EVENT_INSTANCE_MATERIALIZATION_ERROR.PLACE_INELIGIBLE)

    const remote = materializeLocalEventInstanceV1(
      createMaterializationInput({
        presence: {
          activationScope: 'remote',
          relation: 'remote',
          provenance: 'manual',
          placeSessionId: 'map_place_session_test_001',
          placeSessionRevision: 2,
        },
      }),
    )
    expect(remote.reason).toBe(EVENT_INSTANCE_MATERIALIZATION_ERROR.PRESENCE_INELIGIBLE)
  })

  test('supports explicit reusable registries instead of depending on Seoul place IDs', () => {
    const { templateRegistry, variantPackRegistry } = createBuiltInKpopEventRegistries()
    const result = materializeLocalEventInstanceV1(
      createMaterializationInput({
        templateRegistry,
        variantPackRegistry,
        world: {
          worldContextId: 'world_context_daily_custom',
          worldPackId: 'custom_kpop_world',
          mapPackId: 'fictional-city-v1',
          mapPackVersion: 4,
        },
        place: {
          placeId: 'fictional-broadcast-house',
          placeCategoryId: 'broadcast_station',
          capabilityIds: ['work', 'wait'],
        },
      }),
    )
    expect(result.ok).toBe(true)
    expect(result.instance.place.placeId).toBe('fictional-broadcast-house')
    expect(result.instance.world.mapPackId).toBe('fictional-city-v1')
  })
})

describe('EVE-2B provider-neutral Event Text Composer', () => {
  test('accepts one valid provider result, persists normalized IDs, and reopens from cache', async () => {
    const pending = materializeLocalEventInstanceV1(
      createMaterializationInput({ textMode: EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY }),
    ).instance
    const providerAdapter = vi.fn(async () => ({
      text: JSON.stringify(createAiCopy()),
      meta: {
        providerId: 'fixture-provider',
        modelId: 'fixture-text-model',
        requestId: 'fixture-request-ai-001',
      },
    }))
    const instanceStore = { upsertEventInstance: vi.fn((instance) => instance) }

    const result = await composeEventTextV1({
      instance: pending,
      template: BUILT_IN_KPOP_EVENT_TEMPLATE,
      textMode: EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY,
      contextHash: pending.text.contextHash,
      participantIds: ['staff_coordinator'],
      providerAdapter,
      instanceStore,
      now: pending.timestamps.createdAt + 1_000,
    })
    expect(result).toMatchObject({
      ok: true,
      providerCallCount: 1,
      reason: 'ai_text_materialized',
      cachePersisted: true,
    })
    expect(instanceStore.upsertEventInstance).toHaveBeenCalledWith(result.instance)
    expect(providerAdapter.mock.calls[0][0].contextEnvelope).toMatchObject({
      cache: {
        key: expect.stringMatching(/^schatphone:event-text:v1:id-[a-f0-9]{8}$/),
      },
    })
    expect(providerAdapter.mock.calls[0][0].contextEnvelope.cache.key).not.toContain('composer')
    expect(providerAdapter.mock.calls[0][0].contextEnvelope.stablePrefix).toContain(
      'logic is already fixed locally',
    )
    expect(result.instance.text).toMatchObject({
      status: EVENT_TEXT_STATUS.SUCCEEDED,
      source: 'ai',
      attemptCount: 1,
      provenance: {
        providerId: 'fixture-provider',
        modelId: 'fixture-text-model',
        requestId: 'fixture-request-ai-001',
      },
    })
    expect(Object.keys(result.instance.text.normalizedCopy.choiceLabels).sort()).toEqual(
      ['review_brief', 'check_equipment', 'wait_for_staff'].sort(),
    )

    const reopened = await composeEventTextV1({
      instance: result.instance,
      template: BUILT_IN_KPOP_EVENT_TEMPLATE,
      textMode: EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY,
      providerAdapter,
    })
    expect(reopened).toMatchObject({ ok: true, providerCallCount: 0, reason: 'cached' })
    expect(providerAdapter).toHaveBeenCalledTimes(1)
  })

  test('rejects provider-added choice IDs and keeps the complete local fallback terminal', async () => {
    const pending = materializeLocalEventInstanceV1(
      createMaterializationInput({ textMode: EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY }),
    ).instance
    const unsafeCopy = createAiCopy()
    unsafeCopy.choiceLabels.teleport_inside = 'Teleport inside'
    const providerAdapter = vi.fn(async () => unsafeCopy)

    const result = await composeEventTextV1({
      instance: pending,
      template: BUILT_IN_KPOP_EVENT_TEMPLATE,
      textMode: EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY,
      contextHash: pending.text.contextHash,
      participantIds: ['staff_coordinator'],
      providerAdapter,
    })
    expect(result).toMatchObject({
      ok: false,
      providerCallCount: 1,
      reason: EVENT_TEXT_FAILURE_CODE.INVALID_SCHEMA,
    })
    expect(result.instance.text).toMatchObject({
      status: EVENT_TEXT_STATUS.FALLBACK,
      source: 'local',
      attemptCount: 1,
    })
    expect(result.instance.text.normalizedCopy.choiceLabels.teleport_inside).toBeUndefined()

    const reopened = await composeEventTextV1({
      instance: result.instance,
      template: BUILT_IN_KPOP_EVENT_TEMPLATE,
      textMode: EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY,
      providerAdapter,
    })
    expect(reopened.providerCallCount).toBe(0)
    expect(providerAdapter).toHaveBeenCalledTimes(1)
  })

  test('turns provider failure and stale context into deterministic no-retry local results', async () => {
    const pending = materializeLocalEventInstanceV1(
      createMaterializationInput({ textMode: EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY }),
    ).instance
    const providerAdapter = vi.fn(async () => {
      const error = new Error('timed out')
      error.code = 'TIMEOUT'
      throw error
    })
    const failed = await composeEventTextV1({
      instance: pending,
      template: BUILT_IN_KPOP_EVENT_TEMPLATE,
      textMode: EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY,
      contextHash: pending.text.contextHash,
      providerAdapter,
    })
    expect(failed).toMatchObject({
      providerCallCount: 1,
      reason: EVENT_TEXT_FAILURE_CODE.PROVIDER_TIMEOUT,
    })

    const staleProvider = vi.fn()
    const stale = await composeEventTextV1({
      instance: pending,
      template: BUILT_IN_KPOP_EVENT_TEMPLATE,
      textMode: EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY,
      contextHash: 'ctx_changed',
      providerAdapter: staleProvider,
    })
    expect(stale).toMatchObject({
      providerCallCount: 0,
      reason: EVENT_TEXT_FAILURE_CODE.CONTEXT_STALE,
    })
    expect(staleProvider).not.toHaveBeenCalled()
  })
})

describe('EVE-2B simulation persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('stores durable instances without truncation and reports rejected backup entries', () => {
    const store = useSimulationStore()
    store.resetForTesting()
    const valid = instanceFixture.cases[0].instance
    const durableInstances = Array.from({ length: 260 }, (_, index) => ({
      ...structuredClone(valid),
      id: `event_instance_retention_${String(index + 1).padStart(3, '0')}`,
    }))
    durableInstances.forEach((instance) => expect(store.upsertEventInstance(instance)).toBeTruthy())
    expect(store.eventInstanceCount).toBe(260)
    expect(store.getEventInstance(durableInstances[0].id)?.text.status).toBe(
      EVENT_TEXT_STATUS.LOCAL_ONLY,
    )
    expect(store.eventTextMode).toBe(SIMULATION_EVENT_TEXT_MODE.LOCAL_ONLY)
    expect(store.setEventTextMode(SIMULATION_EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY)).toBe(
      SIMULATION_EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY,
    )

    const snapshot = store.createBackupSnapshot()
    expect(snapshot.eventInstances).toHaveLength(260)
    store.resetForTesting()
    expect(
      store.restoreFromBackup({
        simulation: {
          ...snapshot,
          eventInstances: [
            ...durableInstances,
            { ...valid, id: 'invalid_schema', schemaVersion: 99 },
          ],
        },
      }),
    ).toBe(true)
    expect(store.eventInstances).toHaveLength(260)
    expect(store.eventInstanceRestoreReport).toMatchObject({
      inputCount: 261,
      restoredCount: 260,
    })
    expect(store.eventInstanceRestoreReport.rejected).toHaveLength(1)
  })

  test('migrates v1 storage by preserving existing simulation data and initializing EVE-2B fields', () => {
    localStorage.setItem(
      'schatphone:store:simulation',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          eventLogs: [
            {
              id: 'legacy_log_001',
              eventId: 'shopping.discount_expiring.v1',
              moduleKey: 'shopping',
              triggerSource: 'condition',
              status: 'skipped',
              at: Date.now(),
            },
          ],
          cooldownsByEvent: {},
          dailyCounters: {},
          chatSocialEventProposals: [],
          mapJourneyEventProposals: [],
          settings: { surpriseMode: SIMULATION_SURPRISE_MODE.BALANCED },
        },
      }),
    )

    const store = useSimulationStore()
    expect(store.eventLogs).toHaveLength(1)
    expect(store.eventLogs[0].id).toBe('legacy_log_001')
    expect(store.eventInstances).toEqual([])
    expect(store.surpriseMode).toBe(SIMULATION_SURPRISE_MODE.BALANCED)
    expect(store.eventTextMode).toBe(SIMULATION_EVENT_TEXT_MODE.LOCAL_ONLY)
  })

  test('allows only monotonic lifecycle advances and preserves frozen source lineage', () => {
    const store = useSimulationStore()
    store.resetForTesting()
    const active = normalizeEventInstanceV1(instanceFixture.cases[0].instance)
    expect(store.upsertEventInstance(active)).toBeTruthy()

    const rewrittenSource = structuredClone(active)
    rewrittenSource.source.recordId = 'map_place_session_rewritten'
    rewrittenSource.timestamps.updatedAt += 1
    expect(store.upsertEventInstance(rewrittenSource)).toBeNull()

    const resolved = structuredClone(active)
    resolved.lifecycle = 'resolved'
    resolved.choices.selectedId = 'review_brief'
    resolved.choices.outcomeId = 'brief_reviewed'
    resolved.outcome.requestState = 'validated'
    resolved.outcome.ownerResultCode = 'PLACE_SESSION_EVENT_RESOLUTION_VALID'
    resolved.timestamps.resolvedAt = resolved.timestamps.updatedAt + 1_000
    resolved.timestamps.updatedAt = resolved.timestamps.resolvedAt
    expect(store.upsertEventInstance(resolved)?.lifecycle).toBe('resolved')

    const reverted = structuredClone(resolved)
    reverted.lifecycle = 'active'
    reverted.timestamps.updatedAt += 1
    expect(store.upsertEventInstance(reverted)).toBeNull()
    expect(store.getEventInstance(active.id)?.lifecycle).toBe('resolved')
  })
})
