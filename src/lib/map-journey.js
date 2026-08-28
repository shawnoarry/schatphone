export const MAP_TRIP_ESTIMATE_VERSION = 2

export const MAP_JOURNEY_SCHEMA_VERSION = 3

export const MAP_JOURNEY_PHASE = Object.freeze({
  DEPARTED: 'departed',
  EN_ROUTE: 'en_route',
  NEAR_ARRIVAL: 'near_arrival',
  PAUSED: 'paused',
  ARRIVED: 'arrived',
  CANCELLED: 'cancelled',
})

export const MAP_JOURNEY_CHECKPOINT_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'departure',
    threshold: 0,
    phase: MAP_JOURNEY_PHASE.DEPARTED,
    labelZh: '已出发',
    labelEn: 'Departed',
  }),
  Object.freeze({
    id: 'en_route',
    threshold: 0.4,
    phase: MAP_JOURNEY_PHASE.EN_ROUTE,
    labelZh: '途中',
    labelEn: 'En route',
  }),
  Object.freeze({
    id: 'near_arrival',
    threshold: 0.8,
    phase: MAP_JOURNEY_PHASE.NEAR_ARRIVAL,
    labelZh: '接近目的地',
    labelEn: 'Near destination',
  }),
  Object.freeze({
    id: 'arrival',
    threshold: 1,
    phase: MAP_JOURNEY_PHASE.ARRIVED,
    labelZh: '已到达',
    labelEn: 'Arrived',
  }),
])

export const LEGACY_MAP_TRANSPORT_MODE = 'hired_vehicle'

export const MAP_TRANSPORT_MODES = Object.freeze([
  Object.freeze({
    id: 'walk',
    icon: 'fas fa-person-walking',
    labelZh: '步行',
    labelEn: 'Walk',
    neutralLabelZh: '步行',
    neutralLabelEn: 'Walk',
    consumptionLevel: 'high',
  }),
  Object.freeze({
    id: 'public_transit',
    icon: 'fas fa-bus-simple',
    labelZh: '公共交通',
    labelEn: 'Public transit',
    neutralLabelZh: '公共运输',
    neutralLabelEn: 'Shared transit',
    consumptionLevel: 'low',
  }),
  Object.freeze({
    id: 'hired_vehicle',
    icon: 'fas fa-car-side',
    labelZh: '出租车',
    labelEn: 'Taxi',
    neutralLabelZh: '雇佣载具',
    neutralLabelEn: 'Hired vehicle',
    consumptionLevel: 'medium',
  }),
  Object.freeze({
    id: 'private_vehicle',
    icon: 'fas fa-car',
    labelZh: '自驾',
    labelEn: 'Drive',
    neutralLabelZh: '私人载具',
    neutralLabelEn: 'Private vehicle',
    consumptionLevel: 'medium',
  }),
])

const TRANSPORT_MODE_BY_ID = new Map(MAP_TRANSPORT_MODES.map((mode) => [mode.id, mode]))
const JOURNEY_CHECKPOINT_BY_ID = new Map(
  MAP_JOURNEY_CHECKPOINT_DEFINITIONS.map((checkpoint) => [checkpoint.id, checkpoint]),
)

const ESTIMATE_PROFILES = Object.freeze({
  walk: Object.freeze({ minutesPerKm: 12.5, overheadMinutes: 0, minimumMinutes: 1 }),
  public_transit: Object.freeze({ minutesPerKm: 3, overheadMinutes: 6, minimumMinutes: 8 }),
  hired_vehicle: Object.freeze({ minutesPerKm: 3.5, overheadMinutes: 0, minimumMinutes: 3 }),
  private_vehicle: Object.freeze({ minutesPerKm: 2.8, overheadMinutes: 3, minimumMinutes: 4 }),
})

const roundToHundred = (value) => Math.max(0, Math.round(value / 100) * 100)

const estimateFare = (transportMode, distanceKm) => {
  if (transportMode === 'walk') return 0
  if (transportMode === 'public_transit') return roundToHundred(1400 + distanceKm * 120)
  if (transportMode === 'private_vehicle') return roundToHundred(800 + distanceKm * 250)
  return Math.round(4800 + distanceKm * 900)
}

export const getMapTransportMode = (value) =>
  typeof value === 'string' ? TRANSPORT_MODE_BY_ID.get(value.trim()) || null : null

export const isMapTransportMode = (value) => Boolean(getMapTransportMode(value))

export const normalizeMapTransportMode = (value, fallback = '') =>
  getMapTransportMode(value)?.id || getMapTransportMode(fallback)?.id || ''

const toNonNegativeInteger = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback
}

const clampProgress = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(1, parsed))
}

export const createMapJourneyId = (startedAt = Date.now()) =>
  `map_journey_${Math.max(1, toNonNegativeInteger(startedAt, Date.now()))}`

export const createMapJourneyCheckpointPlan = ({ startedAt = 0, arrivedAt = 0 } = {}) =>
  MAP_JOURNEY_CHECKPOINT_DEFINITIONS.map((definition, index) => ({
    id: definition.id,
    threshold: definition.threshold,
    status: index === 0 || arrivedAt > 0 ? 'completed' : 'pending',
    reachedAt:
      arrivedAt > 0
        ? definition.id === 'arrival'
          ? toNonNegativeInteger(arrivedAt)
          : toNonNegativeInteger(startedAt)
        : index === 0
          ? toNonNegativeInteger(startedAt)
          : 0,
  }))

export const normalizeMapJourneyCheckpoints = (
  raw,
  { startedAt = 0, durationSeconds = 0, arrivedAt = 0, isArrived = false } = {},
) => {
  const rawList = Array.isArray(raw) ? raw : []
  const rawById = new Map(
    rawList
      .filter((checkpoint) => checkpoint && JOURNEY_CHECKPOINT_BY_ID.has(checkpoint.id))
      .map((checkpoint) => [checkpoint.id, checkpoint]),
  )
  let highestCompletedIndex = 0
  MAP_JOURNEY_CHECKPOINT_DEFINITIONS.forEach((definition, index) => {
    if (rawById.get(definition.id)?.status === 'completed') highestCompletedIndex = index
  })
  if (isArrived || arrivedAt > 0) {
    highestCompletedIndex = MAP_JOURNEY_CHECKPOINT_DEFINITIONS.length - 1
  }

  const normalizedStartedAt = toNonNegativeInteger(startedAt)
  const normalizedDuration = toNonNegativeInteger(durationSeconds)
  const normalizedArrivedAt = toNonNegativeInteger(arrivedAt)

  return MAP_JOURNEY_CHECKPOINT_DEFINITIONS.map((definition, index) => {
    const existing = rawById.get(definition.id)
    const completed = index <= highestCompletedIndex
    const fallbackReachedAt = completed
      ? definition.id === 'arrival' && normalizedArrivedAt
        ? normalizedArrivedAt
        : normalizedStartedAt + Math.round(normalizedDuration * definition.threshold) * 1000
      : 0
    return {
      id: definition.id,
      threshold: definition.threshold,
      status: completed ? 'completed' : 'pending',
      reachedAt: completed
        ? toNonNegativeInteger(existing?.reachedAt, fallbackReachedAt)
        : 0,
    }
  })
}

export const resolveMapJourneyPhase = (
  checkpoints,
  { paused = false, arrived = false } = {},
) => {
  if (arrived) return MAP_JOURNEY_PHASE.ARRIVED
  if (paused) return MAP_JOURNEY_PHASE.PAUSED
  const completedIds = new Set(
    (Array.isArray(checkpoints) ? checkpoints : [])
      .filter((checkpoint) => checkpoint?.status === 'completed')
      .map((checkpoint) => checkpoint.id),
  )
  const latest = [...MAP_JOURNEY_CHECKPOINT_DEFINITIONS]
    .reverse()
    .find((definition) => completedIds.has(definition.id))
  return latest?.phase || MAP_JOURNEY_PHASE.DEPARTED
}

export const advanceMapJourneyCheckpoints = ({
  checkpoints,
  progress = 0,
  startedAt = 0,
  durationSeconds = 0,
  totalPausedSeconds = 0,
  reachedAt = Date.now(),
} = {}) => {
  const normalized = normalizeMapJourneyCheckpoints(checkpoints, {
    startedAt,
    durationSeconds,
  })
  const targetProgress = clampProgress(progress)
  const normalizedReachedAt = toNonNegativeInteger(reachedAt, Date.now())
  const pauseOffsetMs = toNonNegativeInteger(totalPausedSeconds) * 1000
  let changed = false

  const next = normalized.map((checkpoint) => {
    if (checkpoint.status === 'completed' || checkpoint.threshold > targetProgress) {
      return checkpoint
    }
    changed = true
    const expectedAt =
      toNonNegativeInteger(startedAt) +
      pauseOffsetMs +
      Math.round(toNonNegativeInteger(durationSeconds) * checkpoint.threshold) * 1000
    return {
      ...checkpoint,
      status: 'completed',
      reachedAt: Math.min(normalizedReachedAt, expectedAt || normalizedReachedAt),
    }
  })

  return {
    changed,
    checkpoints: next,
    phase: resolveMapJourneyPhase(next, { arrived: targetProgress >= 1 }),
  }
}

export const calculateMapJourneyRuntime = (state = {}, nowInput = Date.now()) => {
  const durationSeconds = Math.max(1, toNonNegativeInteger(state.durationSeconds, 1))
  const now = toNonNegativeInteger(nowInput, Date.now())
  if (state.status === 'arrived') {
    return {
      progress: 1,
      elapsedSeconds: durationSeconds,
      remainingSeconds: 0,
    }
  }

  if (state.phase === MAP_JOURNEY_PHASE.PAUSED) {
    const remainingSeconds = Math.min(
      durationSeconds,
      toNonNegativeInteger(state.remainingSecondsAtPause, durationSeconds),
    )
    return {
      progress: (durationSeconds - remainingSeconds) / durationSeconds,
      elapsedSeconds: durationSeconds - remainingSeconds,
      remainingSeconds,
    }
  }

  const etaAt = toNonNegativeInteger(state.etaAt)
  const startedAt = toNonNegativeInteger(state.startedAt)
  const totalPausedSeconds = toNonNegativeInteger(state.totalPausedSeconds)
  const remainingSeconds = etaAt
    ? Math.max(0, Math.min(durationSeconds, Math.ceil((etaAt - now) / 1000)))
    : Math.max(
        0,
        Math.min(
          durationSeconds,
          durationSeconds - Math.max(0, Math.floor((now - startedAt) / 1000) - totalPausedSeconds),
        ),
      )
  const elapsedSeconds = durationSeconds - remainingSeconds
  return {
    progress: elapsedSeconds / durationSeconds,
    elapsedSeconds,
    remainingSeconds,
  }
}

export const estimateMapJourney = ({
  fromText = '',
  toText = '',
  measuredDistanceKm = null,
  transportMode = '',
} = {}) => {
  const from = typeof fromText === 'string' ? fromText.trim() : ''
  const to = typeof toText === 'string' ? toText.trim() : ''
  const measured = Number(measuredDistanceKm)
  const hasMeasuredDistance = measuredDistanceKm !== null && measuredDistanceKm !== ''
  const distanceKm = hasMeasuredDistance && Number.isFinite(measured) && measured >= 0
    ? Math.round(measured * 1000) / 1000
    : Math.max(3, Math.abs(from.length - to.length) % 18 + 3)
  const normalizedMode = normalizeMapTransportMode(transportMode)
  const mode = getMapTransportMode(normalizedMode)

  if (!mode) {
    return {
      estimateVersion: MAP_TRIP_ESTIMATE_VERSION,
      transportMode: '',
      distanceKm,
      minutes: 0,
      durationSeconds: 0,
      fare: 0,
      consumptionLevel: '',
    }
  }

  const profile = ESTIMATE_PROFILES[normalizedMode]
  const minutes = Math.max(
    profile.minimumMinutes,
    Math.round(distanceKm * profile.minutesPerKm + profile.overheadMinutes),
  )

  return {
    estimateVersion: MAP_TRIP_ESTIMATE_VERSION,
    transportMode: normalizedMode,
    distanceKm,
    minutes,
    durationSeconds: Math.max(60, minutes * 60),
    fare: estimateFare(normalizedMode, distanceKm),
    consumptionLevel: mode.consumptionLevel,
  }
}
