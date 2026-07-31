import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../src/stores/map'
import {
  MAP_JOURNEY_EVENT_OUTCOME,
  MAP_JOURNEY_EVENT_PROPOSAL_STATUS,
} from '../src/lib/simulation/adapters/map-journey-events'
import { SIMULATION_SURPRISE_MODE, useSimulationStore } from '../src/stores/simulation'

const startJourney = (mapStore, mode = 'public_transit') => {
  mapStore.setTripEndpoint('from', 'Home')
  mapStore.setTripEndpoint('to', 'Office')
  expect(mapStore.setTripTransportMode(mode).ok).toBe(true)
  expect(mapStore.startTrip().ok).toBe(true)
}

const reachCheckpoint = (mapStore, threshold) => {
  const at =
    mapStore.tripState.startedAt +
    Math.ceil(mapStore.tripState.durationSeconds * threshold) * 1000
  vi.setSystemTime(at)
  mapStore.tickTripRuntime(at)
  return at
}

describe('Map-owned journey event result validation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('submits once at an explicit checkpoint without pausing or evaluating per tick', () => {
    const simulationStore = useSimulationStore()
    const mapStore = useMapStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    mapStore.setJourneyCheckpointEventEvaluationEnabled(true)
    mapStore.setJourneyEventRandomValueForTesting(0)
    startJourney(mapStore)

    reachCheckpoint(mapStore, 0.39)
    expect(simulationStore.eventLogs).toHaveLength(0)
    expect(mapStore.tripState.eventCheckpointIds).toEqual([])

    reachCheckpoint(mapStore, 0.4)
    expect(mapStore.tripState).toMatchObject({
      status: 'traveling',
      phase: 'en_route',
      eventCheckpointIds: ['en_route'],
      activeInterruption: {
        checkpointId: 'en_route',
      },
    })
    expect(simulationStore.mapJourneyEventProposals).toHaveLength(1)
    expect(simulationStore.eventLogs).toHaveLength(1)
    const remainingWithPendingEvent = mapStore.tripRuntime.remainingSeconds

    mapStore.tickTripRuntime(Date.now())
    mapStore.tickTripRuntime(Date.now() + 1000)
    expect(simulationStore.mapJourneyEventProposals).toHaveLength(1)
    expect(simulationStore.eventLogs).toHaveLength(1)
    expect(mapStore.tripState.phase).toBe('en_route')
    expect(mapStore.tripRuntime.remainingSeconds).toBeLessThan(remainingWithPendingEvent)
  })

  test('rejects forged and stale outcomes, then returns safely to the active journey', async () => {
    const simulationStore = useSimulationStore()
    const mapStore = useMapStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    mapStore.setJourneyCheckpointEventEvaluationEnabled(true)
    mapStore.setJourneyEventRandomValueForTesting(0)
    startJourney(mapStore)
    reachCheckpoint(mapStore, 0.4)

    const proposal = simulationStore.mapJourneyEventProposals[0]
    expect(mapStore.validateJourneyEventOutcome({
      proposalId: proposal.id,
      journeyId: proposal.journeyId,
      checkpointId: proposal.checkpointId,
      eventId: proposal.eventId,
      outcome: 'continue',
      delaySeconds: 0,
    })).toEqual({
      ok: false,
      code: 'JOURNEY_EVENT_AUTHORIZATION_INVALID',
    })

    const reviewed = simulationStore.reviewMapJourneyEventProposal(
      proposal.id,
      MAP_JOURNEY_EVENT_OUTCOME.CONTINUE,
      { at: Date.now() },
    )
    expect(mapStore.validateJourneyEventOutcome({
      ...reviewed,
      journeyId: 'stale_journey',
    })).toEqual({
      ok: false,
      code: 'JOURNEY_EVENT_SOURCE_STALE',
    })
    expect(mapStore.validateJourneyEventOutcome({
      ...reviewed,
      outcome: 'continue',
      delaySeconds: 120,
    })).toEqual({
      ok: false,
      code: 'JOURNEY_EVENT_DELAY_INVALID',
    })

    const applied = await mapStore.applyJourneyEventOutcome(reviewed, { now: Date.now() })
    expect(applied).toMatchObject({
      ok: true,
      code: 'JOURNEY_EVENT_NO_CHANGE_APPLIED',
      outcome: 'continue',
      delaySeconds: 0,
    })
    simulationStore.finalizeMapJourneyEventProposal(proposal.id, {
      outcome: reviewed.outcome,
      applied: true,
      at: Date.now(),
    })
    expect(mapStore.tripState.phase).toBe('en_route')
    expect(mapStore.tripState.activeInterruption).toBeNull()
    expect(simulationStore.getMapJourneyEventProposal(proposal.id)?.status).toBe(
      MAP_JOURNEY_EVENT_PROPOSAL_STATUS.APPLIED,
    )

    const arrivalAt = mapStore.tripState.etaAt + 1000
    vi.setSystemTime(arrivalAt)
    mapStore.tickTripRuntime(arrivalAt)
    expect(mapStore.tripState.status).toBe('arrived')
    expect(mapStore.tripHistory[0]).toMatchObject({
      status: 'arrived',
      journeyId: proposal.journeyId,
      eventCheckpointIds: ['en_route'],
      eventDelaySeconds: 0,
    })
    expect(mapStore.tripHistory[0].rewardPoints).toBeGreaterThan(0)
    expect(mapStore.mapCalendarReminders.length).toBeGreaterThan(0)
    expect(mapStore.mapCalendarReminders[0].sourceTripId).toBe(mapStore.tripHistory[0].id)
  })

  test('applies only the bounded delay without restoring review time to the ETA', async () => {
    const simulationStore = useSimulationStore()
    const mapStore = useMapStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    mapStore.setJourneyCheckpointEventEvaluationEnabled(true)
    mapStore.setJourneyEventRandomValueForTesting(0)
    startJourney(mapStore, 'private_vehicle')
    reachCheckpoint(mapStore, 0.4)

    const proposal = simulationStore.mapJourneyEventProposals[0]
    const durationBefore = mapStore.tripState.durationSeconds
    const etaBefore = mapStore.tripState.etaAt
    const remainingBefore = mapStore.tripRuntime.remainingSeconds
    const reviewedAt = Date.now() + 30_000
    vi.setSystemTime(reviewedAt)
    const reviewed = simulationStore.reviewMapJourneyEventProposal(
      proposal.id,
      MAP_JOURNEY_EVENT_OUTCOME.DELAY,
      { at: reviewedAt },
    )
    const applied = await mapStore.applyJourneyEventOutcome(reviewed, { now: reviewedAt })

    expect(applied).toMatchObject({
      ok: true,
      code: 'JOURNEY_EVENT_DELAY_APPLIED',
      delaySeconds: 120,
    })
    expect(mapStore.tripState).toMatchObject({
      status: 'traveling',
      phase: 'en_route',
      durationSeconds: durationBefore + 120,
      etaAt: etaBefore + 120_000,
      eventDelaySeconds: 120,
      activeInterruption: null,
    })
    expect(mapStore.tripRuntime.remainingSeconds).toBe(remainingBefore + 90)
  })

  test('restores a pending route update with both owners and allows cancellation', async () => {
    const simulationStoreA = useSimulationStore()
    const mapStoreA = useMapStore()
    simulationStoreA.resetForTesting()
    simulationStoreA.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    mapStoreA.setJourneyCheckpointEventEvaluationEnabled(true)
    mapStoreA.setJourneyEventRandomValueForTesting(0)
    startJourney(mapStoreA)
    reachCheckpoint(mapStoreA, 0.4)

    const proposalId = mapStoreA.tripState.activeInterruption.proposalId
    const mapSnapshot = mapStoreA.createBackupSnapshot()
    const simulationSnapshot = simulationStoreA.createBackupSnapshot()

    setActivePinia(createPinia())
    const simulationStoreB = useSimulationStore()
    simulationStoreB.resetForTesting()
    expect(simulationStoreB.restoreFromBackup({ simulation: simulationSnapshot })).toBe(true)
    const mapStoreB = useMapStore()
    expect(mapStoreB.restoreFromBackup({ map: mapSnapshot })).toBe(true)

    expect(mapStoreB.tripState).toMatchObject({
      status: 'traveling',
      phase: 'en_route',
      activeInterruption: {
        proposalId,
        checkpointId: 'en_route',
      },
    })
    expect(simulationStoreB.getMapJourneyEventProposal(proposalId)?.status).toBe(
      MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW,
    )
    expect(mapStoreB.cancelTrip()).toBe(true)
    expect(mapStoreB.tripState.status).toBe('idle')
    expect(simulationStoreB.getMapJourneyEventProposal(proposalId)).toMatchObject({
      status: MAP_JOURNEY_EVENT_PROPOSAL_STATUS.DISMISSED,
      resolutionReason: 'map_journey_cancelled',
    })
    expect(mapStoreB.tripHistory[0]).toMatchObject({
      status: 'cancelled',
      eventCheckpointIds: ['en_route'],
      rewardPoints: 0,
    })
  })

  test('migrates a legacy event-blocked journey back to active timing without losing the proposal', () => {
    const mapStore = useMapStore()
    const pausedAt = Date.now() - 45_000
    const etaAt = pausedAt + 300_000

    expect(mapStore.restoreFromBackup({
      map: {
        tripState: {
          status: 'traveling',
          journeySchemaVersion: 2,
          journeyId: 'map_journey_legacy_event_pause',
          phase: 'paused',
          checkpoints: [
            { id: 'departure', status: 'completed', reachedAt: pausedAt - 120_000 },
            { id: 'en_route', status: 'completed', reachedAt: pausedAt },
          ],
          eventCheckpointIds: ['en_route'],
          activeInterruption: {
            proposalId: 'map_journey_event_legacy_pause_en_route',
            eventId: 'map.journey.route_condition.v1',
            journeyId: 'map_journey_legacy_event_pause',
            checkpointId: 'en_route',
            requestedAt: pausedAt,
          },
          from: 'Home',
          to: 'Office',
          transportMode: 'public_transit',
          estimateVersion: 1,
          durationSeconds: 600,
          startedAt: pausedAt - 240_000,
          etaAt,
          pausedAt,
          remainingSecondsAtPause: 300,
          totalPausedSeconds: 0,
          pushScheduleRevision: 1,
        },
      },
    })).toBe(true)

    expect(mapStore.tripState).toMatchObject({
      status: 'traveling',
      journeySchemaVersion: 3,
      phase: 'en_route',
      activeInterruption: {
        proposalId: 'map_journey_event_legacy_pause_en_route',
      },
      pausedAt: 0,
      remainingSecondsAtPause: 0,
      totalPausedSeconds: 45,
      pushScheduleRevision: 2,
    })
    expect(mapStore.tripState.etaAt).toBe(etaAt + 45_000)
    expect(mapStore.tripRuntime.remainingSeconds).toBe(300)
  })

  test('dismisses an unreviewed route update when the journey arrives normally', () => {
    const simulationStore = useSimulationStore()
    const mapStore = useMapStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    mapStore.setJourneyCheckpointEventEvaluationEnabled(true)
    mapStore.setJourneyEventRandomValueForTesting(0)
    startJourney(mapStore)
    reachCheckpoint(mapStore, 0.4)

    const proposalId = mapStore.tripState.activeInterruption.proposalId
    mapStore.tickTripRuntime(mapStore.tripState.etaAt + 1000)

    expect(mapStore.tripState.status).toBe('arrived')
    expect(simulationStore.getMapJourneyEventProposal(proposalId)).toMatchObject({
      status: MAP_JOURNEY_EVENT_PROPOSAL_STATUS.DISMISSED,
      resolutionReason: 'map_journey_arrived_before_review',
    })
  })

  test('marks skipped checkpoints once and preserves uneventful automatic arrival', () => {
    const simulationStore = useSimulationStore()
    const mapStore = useMapStore()
    simulationStore.resetForTesting()
    mapStore.setJourneyCheckpointEventEvaluationEnabled(true)
    mapStore.setJourneyEventRandomValueForTesting(1)
    startJourney(mapStore, 'walk')

    reachCheckpoint(mapStore, 0.85)
    expect(mapStore.tripState.phase).toBe('near_arrival')
    expect(mapStore.tripState.eventCheckpointIds).toEqual(['en_route', 'near_arrival'])
    expect(simulationStore.eventLogs).toHaveLength(2)
    expect(simulationStore.eventLogs.every((log) => log.reason === 'random_failed')).toBe(true)

    mapStore.tickTripRuntime(Date.now() + 1000)
    expect(simulationStore.eventLogs).toHaveLength(2)
    const arrivalAt = mapStore.tripState.etaAt + 1000
    mapStore.tickTripRuntime(arrivalAt)
    expect(mapStore.tripState.status).toBe('arrived')
    expect(mapStore.tripHistory[0]).toMatchObject({
      status: 'arrived',
      eventCheckpointIds: ['en_route', 'near_arrival'],
    })
  })

  test('fails open to the ordinary journey when the proposal adapter fails', () => {
    const simulationStore = useSimulationStore()
    const mapStore = useMapStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    mapStore.setJourneyCheckpointEventEvaluationEnabled(true)
    mapStore.setJourneyEventRandomValueForTesting(0)
    vi.spyOn(simulationStore, 'upsertMapJourneyEventProposal').mockImplementation(() => {
      throw new Error('proposal persistence failed')
    })
    startJourney(mapStore)

    reachCheckpoint(mapStore, 0.4)
    expect(mapStore.tripState).toMatchObject({
      status: 'traveling',
      phase: 'en_route',
      eventCheckpointIds: ['en_route'],
      activeInterruption: null,
    })
    expect(simulationStore.eventLogs[0]).toMatchObject({
      status: 'failed',
      reason: 'adapter_threw',
    })

    const arrivalAt = mapStore.tripState.etaAt + 1000
    mapStore.tickTripRuntime(arrivalAt)
    expect(mapStore.tripState.status).toBe('arrived')
  })

  test('normalizes MJE-2 records without event fields while preserving journey values', () => {
    const mapStore = useMapStore()
    const startedAt = Date.now() - 60_000
    expect(mapStore.restoreFromBackup({
      map: {
        tripState: {
          status: 'traveling',
          journeySchemaVersion: 1,
          journeyId: 'map_journey_mje2_legacy',
          phase: 'en_route',
          checkpoints: [
            { id: 'departure', status: 'completed', reachedAt: startedAt },
            { id: 'en_route', status: 'completed', reachedAt: startedAt + 40_000 },
          ],
          from: 'Old home',
          to: 'Old office',
          transportMode: 'hired_vehicle',
          estimateVersion: 1,
          distanceKm: 3.7,
          fare: 8123,
          durationSeconds: 600,
          startedAt,
          etaAt: startedAt + 600_000,
        },
      },
    })).toBe(true)

    expect(mapStore.tripState).toMatchObject({
      status: 'traveling',
      journeySchemaVersion: 1,
      journeyId: 'map_journey_mje2_legacy',
      transportMode: 'hired_vehicle',
      fare: 8123,
      eventCheckpointIds: [],
      activeInterruption: null,
      eventDelaySeconds: 0,
    })
  })
})
