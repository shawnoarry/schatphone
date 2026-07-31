import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  MAP_JOURNEY_EVENT_OUTCOME,
  MAP_JOURNEY_EVENT_PROPOSAL_STATUS,
  MAP_JOURNEY_ROUTE_CONDITION_EVENT_ID,
  resolveMapJourneyEventVariant,
  runMapJourneyCheckpointEvent,
} from '../src/lib/simulation/adapters/map-journey-events'
import { SIMULATION_SURPRISE_MODE, useSimulationStore } from '../src/stores/simulation'

const now = new Date('2026-01-01T00:00:00.000Z').getTime()

const createSnapshot = (overrides = {}) => ({
  journeyId: 'map_journey_event_test',
  journeySchemaVersion: 2,
  status: 'traveling',
  phase: 'en_route',
  checkpointId: 'en_route',
  checkpointReachedAt: now,
  mapPackId: 'seoul-real-v1',
  worldPackId: 'default_world',
  fromLabel: 'Home',
  toLabel: 'Office',
  transportMode: 'public_transit',
  ...overrides,
})

const createWorldContext = (family = 'daily') => ({
  id: `world_context_${family}_test`,
  source: 'manual',
  genreTags: [family],
  activeWorldBookIds: [`book_${family}`],
  updatedAt: now,
})

describe('Map journey checkpoint event adapter', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(now)
    setActivePinia(createPinia())
  })

  test('evaluates only eligible journey checkpoints and selects world-aware variants', () => {
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)

    const departure = runMapJourneyCheckpointEvent({
      simulationStore,
      snapshot: createSnapshot({ checkpointId: 'departure', phase: 'departed' }),
      worldContext: createWorldContext('daily'),
      randomValue: 0,
      now,
    })
    expect(departure).toMatchObject({
      ok: false,
      status: 'skipped',
      reason: 'checkpoint_not_eligible',
    })
    expect(simulationStore.mapJourneyEventProposals).toHaveLength(0)

    const triggered = runMapJourneyCheckpointEvent({
      simulationStore,
      snapshot: createSnapshot(),
      worldContext: createWorldContext('sci_fi'),
      randomValue: 0,
      now,
    })
    expect(triggered).toMatchObject({
      ok: true,
      status: 'triggered',
      adapterResult: {
        status: MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW,
        journeyId: 'map_journey_event_test',
        checkpointId: 'en_route',
        allowedOutcomes: ['continue', 'delay'],
        provenance: {
          variantId: 'map.journey.route_condition.sci_fi.corridor_check.v1',
          worldContextId: 'world_context_sci_fi_test',
          activeWorldBookIds: ['book_sci_fi'],
        },
      },
    })
    expect(simulationStore.eventLogs[0]).toMatchObject({
      eventId: MAP_JOURNEY_ROUTE_CONDITION_EVENT_ID,
      moduleKey: 'map',
      targetId: 'map_journey_event_test',
      status: 'triggered',
      variantId: 'map.journey.route_condition.sci_fi.corridor_check.v1',
    })

    expect(
      resolveMapJourneyEventVariant({
        worldContext: createWorldContext('daily'),
        randomValue: 0,
        now,
      }),
    ).toMatchObject({
      reason: 'world_variant_selected',
      variant: {
        id: 'map.journey.route_condition.daily.brief_slowdown.v1',
      },
    })
  })

  test('respects Map permission and Surprise Mode before running the adapter', () => {
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()
    simulationStore.setModuleEventsEnabled('map', false)

    expect(
      runMapJourneyCheckpointEvent({
        simulationStore,
        snapshot: createSnapshot(),
        worldContext: createWorldContext(),
        randomValue: 0,
        now,
      }),
    ).toMatchObject({
      ok: false,
      reason: 'module_events_disabled',
    })

    simulationStore.setModuleEventsEnabled('map', true)
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.OFF)
    expect(
      runMapJourneyCheckpointEvent({
        simulationStore,
        snapshot: createSnapshot({ journeyId: 'map_journey_surprise_off' }),
        worldContext: createWorldContext(),
        randomValue: 0,
        now,
      }),
    ).toMatchObject({
      ok: false,
      reason: 'surprise_mode_off',
    })
    expect(simulationStore.mapJourneyEventProposals).toHaveLength(0)
  })

  test('preserves a deterministic no-event path and enforces cooldown plus daily cap', () => {
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()

    const noEvent = runMapJourneyCheckpointEvent({
      simulationStore,
      snapshot: createSnapshot({ journeyId: 'map_journey_no_event' }),
      worldContext: createWorldContext(),
      randomValue: 1,
      now,
    })
    expect(noEvent).toMatchObject({
      ok: false,
      status: 'skipped',
      reason: 'random_failed',
    })
    expect(simulationStore.mapJourneyEventProposals).toHaveLength(0)

    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    const first = runMapJourneyCheckpointEvent({
      simulationStore,
      snapshot: createSnapshot({ journeyId: 'map_journey_limited' }),
      worldContext: createWorldContext(),
      randomValue: 0,
      now,
    })
    expect(first.ok).toBe(true)

    const coolingDown = runMapJourneyCheckpointEvent({
      simulationStore,
      snapshot: createSnapshot({
        journeyId: 'map_journey_limited',
        checkpointId: 'near_arrival',
        phase: 'near_arrival',
      }),
      worldContext: createWorldContext(),
      randomValue: 0,
      now: now + 1000,
    })
    expect(coolingDown).toMatchObject({
      ok: false,
      evaluation: { reason: 'cooldown_active' },
    })

    const capped = runMapJourneyCheckpointEvent({
      simulationStore,
      snapshot: createSnapshot({
        journeyId: 'map_journey_limited',
        checkpointId: 'near_arrival',
        phase: 'near_arrival',
      }),
      worldContext: createWorldContext(),
      randomValue: 0,
      now: now + 31 * 60 * 1000,
    })
    expect(capped).toMatchObject({
      ok: false,
      evaluation: { reason: 'daily_limit_reached' },
    })
  })

  test('records adapter failures without creating a pending proposal', () => {
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)

    const failed = runMapJourneyCheckpointEvent({
      simulationStore,
      snapshot: createSnapshot({ journeyId: 'map_journey_adapter_failure' }),
      worldContext: createWorldContext(),
      randomValue: 0,
      now,
      proposalAdapter: () => {
        throw new Error('adapter failed')
      },
    })
    expect(failed).toMatchObject({
      ok: false,
      status: 'failed',
    })
    expect(failed.adapterError).toBeInstanceOf(Error)
    expect(simulationStore.mapJourneyEventProposals).toHaveLength(0)
    expect(simulationStore.eventLogs[0]).toMatchObject({
      status: 'failed',
      reason: 'adapter_threw',
    })
  })

  test('persists pending proposals, reviewed outcomes, and provenance through backup restore', () => {
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    const triggered = runMapJourneyCheckpointEvent({
      simulationStore,
      snapshot: createSnapshot({ journeyId: 'map_journey_restore' }),
      worldContext: createWorldContext('apocalypse'),
      randomValue: 0,
      now,
    })
    const proposalId = triggered.adapterResult.id
    const pendingSnapshot = simulationStore.createBackupSnapshot()

    setActivePinia(createPinia())
    const restored = useSimulationStore()
    restored.resetForTesting()
    expect(restored.restoreFromBackup({ simulation: pendingSnapshot })).toBe(true)
    expect(restored.getMapJourneyEventProposal(proposalId)).toMatchObject({
      status: MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW,
      source: {
        journeyId: 'map_journey_restore',
        checkpointId: 'en_route',
      },
      provenance: {
        variantId: 'map.journey.route_condition.apocalypse.passage_check.v1',
      },
    })

    const reviewed = restored.reviewMapJourneyEventProposal(
      proposalId,
      MAP_JOURNEY_EVENT_OUTCOME.DELAY,
      { at: now + 1000 },
    )
    expect(reviewed).toMatchObject({
      ok: true,
      authorization: 'event_runtime_reviewed',
      outcome: 'delay',
      delaySeconds: 120,
    })
    expect(
      restored.finalizeMapJourneyEventProposal(proposalId, {
        outcome: reviewed.outcome,
        applied: true,
        at: now + 1000,
      }),
    ).toMatchObject({
      status: MAP_JOURNEY_EVENT_PROPOSAL_STATUS.APPLIED,
      selectedOutcome: 'delay',
      appliedAt: now + 1000,
    })

    const appliedSnapshot = restored.createBackupSnapshot()
    setActivePinia(createPinia())
    const appliedRestore = useSimulationStore()
    appliedRestore.resetForTesting()
    expect(appliedRestore.restoreFromBackup({ simulation: appliedSnapshot })).toBe(true)
    expect(appliedRestore.getMapJourneyEventProposal(proposalId)).toMatchObject({
      status: MAP_JOURNEY_EVENT_PROPOSAL_STATUS.APPLIED,
      selectedOutcome: 'delay',
      resolutionReason: 'map_journey_outcome_applied',
    })
  })
})
