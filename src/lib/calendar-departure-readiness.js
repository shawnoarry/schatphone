const toTimestamp = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0
}

const trimText = (value, max = 180) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''

const normalizeEndpoint = (raw = {}) => ({
  mapPackId: trimText(raw.mapPackId, 120),
  placeId: trimText(raw.placeId, 180).toLowerCase(),
  labelZh: trimText(raw.labelZh || raw.label, 120),
  labelEn: trimText(raw.labelEn || raw.labelZh || raw.label, 120),
  detail: trimText(raw.detail || raw.detailZh || raw.detailEn, 240),
  position: raw.position && typeof raw.position === 'object' ? { ...raw.position } : null,
  provenance: trimText(raw.provenance, 80),
  evidenceAt: toTimestamp(raw.evidenceAt),
})

export const CALENDAR_DEPARTURE_READINESS_CODE = Object.freeze({
  READY: 'ready',
  EVENT_TIME_MISSING: 'event_time_missing',
  CURRENT_POSITION_MISSING: 'current_position_missing',
  DESTINATION_MISSING: 'destination_missing',
  MAP_PACK_MISMATCH: 'map_pack_mismatch',
  TRANSPORT_REQUIRED: 'transport_required',
  ESTIMATE_MISSING: 'estimate_missing',
})

const fail = (code) => ({
  ready: false,
  code,
  status: 'unavailable',
  origin: null,
  destination: null,
  transportMode: '',
  estimate: null,
  recommendedDepartureAt: 0,
  predictedArrivalAt: 0,
  minutesUntilDeparture: 0,
  lateByMinutes: 0,
  isLate: false,
  shouldDepartNow: false,
})

export const projectCalendarDepartureReadiness = ({
  now = Date.now(),
  startsAt = 0,
  origin = null,
  destination = null,
  transportMode = '',
  estimate = null,
} = {}) => {
  const currentTime = toTimestamp(now)
  const appointmentStartsAt = toTimestamp(startsAt)
  if (!appointmentStartsAt) return fail(CALENDAR_DEPARTURE_READINESS_CODE.EVENT_TIME_MISSING)

  const normalizedOrigin = normalizeEndpoint(origin || {})
  if (!normalizedOrigin.mapPackId || !normalizedOrigin.detail || !normalizedOrigin.position) {
    return fail(CALENDAR_DEPARTURE_READINESS_CODE.CURRENT_POSITION_MISSING)
  }

  const normalizedDestination = normalizeEndpoint(destination || {})
  if (
    !normalizedDestination.mapPackId ||
    !normalizedDestination.placeId ||
    !normalizedDestination.detail ||
    !normalizedDestination.position
  ) {
    return fail(CALENDAR_DEPARTURE_READINESS_CODE.DESTINATION_MISSING)
  }

  if (normalizedOrigin.mapPackId !== normalizedDestination.mapPackId) {
    return fail(CALENDAR_DEPARTURE_READINESS_CODE.MAP_PACK_MISMATCH)
  }

  const normalizedTransportMode = trimText(transportMode, 60)
  if (!normalizedTransportMode) {
    return fail(CALENDAR_DEPARTURE_READINESS_CODE.TRANSPORT_REQUIRED)
  }

  const durationSeconds = Math.max(0, Math.trunc(Number(estimate?.durationSeconds) || 0))
  const minutes = Math.max(0, Math.round(Number(estimate?.minutes) || durationSeconds / 60))
  if (
    !durationSeconds ||
    !minutes ||
    trimText(estimate?.transportMode, 60) !== normalizedTransportMode
  ) {
    return fail(CALENDAR_DEPARTURE_READINESS_CODE.ESTIMATE_MISSING)
  }

  const durationMs = durationSeconds * 1000
  const recommendedDepartureAt = appointmentStartsAt - durationMs
  const predictedArrivalAt = currentTime + durationMs
  const lateByMs = Math.max(0, predictedArrivalAt - appointmentStartsAt)
  const lateByMinutes = lateByMs > 0 ? Math.ceil(lateByMs / 60_000) : 0
  const minutesUntilDeparture = Math.max(
    0,
    Math.ceil((recommendedDepartureAt - currentTime) / 60_000),
  )

  return {
    ready: true,
    code: CALENDAR_DEPARTURE_READINESS_CODE.READY,
    status: lateByMinutes > 0 ? 'late' : 'on_time',
    origin: normalizedOrigin,
    destination: normalizedDestination,
    transportMode: normalizedTransportMode,
    estimate: {
      estimateVersion: Math.max(0, Math.trunc(Number(estimate.estimateVersion) || 0)),
      transportMode: normalizedTransportMode,
      distanceKm: Math.max(0, Number(estimate.distanceKm) || 0),
      minutes,
      durationSeconds,
      fare: Math.max(0, Math.trunc(Number(estimate.fare) || 0)),
      consumptionLevel: trimText(estimate.consumptionLevel, 40),
    },
    recommendedDepartureAt,
    predictedArrivalAt,
    minutesUntilDeparture,
    lateByMinutes,
    isLate: lateByMinutes > 0,
    shouldDepartNow: currentTime >= recommendedDepartureAt,
  }
}
