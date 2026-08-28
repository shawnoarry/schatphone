import { describe, expect, test } from 'vitest'
import {
  MAP_JOURNEY_CHECKPOINT_DEFINITIONS,
  MAP_JOURNEY_PHASE,
  MAP_JOURNEY_SCHEMA_VERSION,
  MAP_TRIP_ESTIMATE_VERSION,
  advanceMapJourneyCheckpoints,
  calculateMapJourneyRuntime,
  createMapJourneyCheckpointPlan,
  estimateMapJourney,
  normalizeMapTransportMode,
} from '../src/lib/map-journey'

describe('map journey transport estimates', () => {
  test('requires a stable transport mode before producing duration or cost', () => {
    const estimate = estimateMapJourney({
      fromText: 'Home',
      toText: 'Office',
      measuredDistanceKm: 6,
    })

    expect(estimate).toMatchObject({
      estimateVersion: MAP_TRIP_ESTIMATE_VERSION,
      transportMode: '',
      distanceKm: 6,
      minutes: 0,
      durationSeconds: 0,
      fare: 0,
    })
    expect(normalizeMapTransportMode('metro')).toBe('')
  })

  test('changes duration and cost snapshots by transport mode for the same distance', () => {
    const modes = ['walk', 'public_transit', 'hired_vehicle', 'private_vehicle']
    const estimates = modes.map((transportMode) =>
      estimateMapJourney({ measuredDistanceKm: 8, transportMode }),
    )

    expect(estimates.map((estimate) => estimate.transportMode)).toEqual(modes)
    expect(new Set(estimates.map((estimate) => estimate.minutes)).size).toBe(modes.length)
    expect(estimates[0]).toMatchObject({ fare: 0, consumptionLevel: 'high' })
    expect(estimates[1].fare).toBeLessThan(estimates[2].fare)
    expect(estimates[3].minutes).toBeLessThan(estimates[2].minutes)
    expect(estimates.every((estimate) => estimate.estimateVersion === MAP_TRIP_ESTIMATE_VERSION)).toBe(true)
  })

  test('keeps a measured walking distance of a few meters instead of inflating it to 300 meters', () => {
    expect(estimateMapJourney({ measuredDistanceKm: 0.007, transportMode: 'walk' })).toMatchObject({
      distanceKm: 0.007,
      minutes: 1,
      durationSeconds: 60,
    })
  })

  test('keeps the text-based fallback when no measured distance is available', () => {
    expect(
      estimateMapJourney({
        fromText: 'Home',
        toText: 'Unknown destination',
        measuredDistanceKm: null,
        transportMode: 'walk',
      }).distanceKm,
    ).toBeGreaterThanOrEqual(3)
  })
})

describe('map journey lifecycle', () => {
  test('creates a stable versioned checkpoint order with departure completed', () => {
    const startedAt = 1_000_000
    const checkpoints = createMapJourneyCheckpointPlan({ startedAt })

    expect(MAP_JOURNEY_SCHEMA_VERSION).toBe(3)
    expect(checkpoints.map((checkpoint) => checkpoint.id)).toEqual(
      MAP_JOURNEY_CHECKPOINT_DEFINITIONS.map((checkpoint) => checkpoint.id),
    )
    expect(checkpoints[0]).toMatchObject({
      id: 'departure',
      threshold: 0,
      status: 'completed',
      reachedAt: startedAt,
    })
    expect(checkpoints.slice(1).every((checkpoint) => checkpoint.status === 'pending')).toBe(true)
  })

  test('completes every crossed checkpoint across a large time step without duplicates', () => {
    const startedAt = 1_000_000
    const durationSeconds = 1000
    const initial = createMapJourneyCheckpointPlan({ startedAt })
    const advanced = advanceMapJourneyCheckpoints({
      checkpoints: initial,
      progress: 0.85,
      startedAt,
      durationSeconds,
      reachedAt: startedAt + 850_000,
    })

    expect(advanced.phase).toBe(MAP_JOURNEY_PHASE.NEAR_ARRIVAL)
    expect(advanced.checkpoints.map((checkpoint) => checkpoint.status)).toEqual([
      'completed',
      'completed',
      'completed',
      'pending',
    ])
    expect(advanced.checkpoints.map((checkpoint) => checkpoint.reachedAt)).toEqual([
      startedAt,
      startedAt + 400_000,
      startedAt + 800_000,
      0,
    ])

    const repeated = advanceMapJourneyCheckpoints({
      checkpoints: advanced.checkpoints,
      progress: 0.85,
      startedAt,
      durationSeconds,
      reachedAt: startedAt + 900_000,
    })
    expect(repeated.changed).toBe(false)
    expect(repeated.checkpoints).toEqual(advanced.checkpoints)
  })

  test('freezes runtime progress while paused', () => {
    const runtime = calculateMapJourneyRuntime(
      {
        status: 'traveling',
        phase: MAP_JOURNEY_PHASE.PAUSED,
        durationSeconds: 900,
        remainingSecondsAtPause: 540,
      },
      9_999_999,
    )

    expect(runtime).toEqual({
      progress: 0.4,
      elapsedSeconds: 360,
      remainingSeconds: 540,
    })
  })
})
