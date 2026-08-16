import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  readPersistedState,
  readPersistedStateAsync,
  writePersistedState,
} from '../lib/persistence'
import {
  AGENDA_JOURNEY_SCHEMA_VERSION,
  applyAgendaJourneyActivitySessionEvidence,
  cancelAgendaJourney,
  createManualAgendaJourney,
  evaluateAgendaJourneyDeadline,
  linkAgendaJourneyMapJourney,
  materializeCalendarAgendaJourney,
  normalizeAgendaJourney,
  normalizeAgendaJourneys,
  prepareAgendaJourneyActivitySessionRequest,
  reconcileAgendaJourneyMapEvidence,
  retireCalendarAgendaJourneySource,
  setAgendaJourneyStepTransportMode,
  transitionAgendaJourneyActivityStep,
} from '../lib/agenda-journey'
import { startOfCalendarDay } from '../lib/calendar-schedule'

const AGENDA_JOURNEY_STORAGE_KEY = 'store:agenda-journey'
const AGENDA_JOURNEY_STORAGE_VERSION = 1
const DAY_MS = 24 * 60 * 60 * 1000
const MANUAL_PLAN_HORIZON_MS = 14 * DAY_MS

const toTimestamp = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback
}

const resolveBackupSource = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {}
  if (snapshot.agendaJourney && typeof snapshot.agendaJourney === 'object') {
    return snapshot.agendaJourney
  }
  if (snapshot.calendar && typeof snapshot.calendar === 'object') {
    return snapshot.calendar.agendaJourney && typeof snapshot.calendar.agendaJourney === 'object'
      ? snapshot.calendar.agendaJourney
      : {}
  }
  return Array.isArray(snapshot.journeys) ? snapshot : {}
}

export const useAgendaJourneyStore = defineStore('agendaJourney', () => {
  const journeys = ref([])
  const lastReconciledAt = ref(0)
  const hasFinishedStorageHydration = ref(false)

  const orderedJourneys = computed(() =>
    [...journeys.value].sort(
      (left, right) =>
        left.scheduledStartsAt - right.scheduledStartsAt || left.id.localeCompare(right.id),
    ),
  )

  const findJourneyById = (journeyId) => {
    if (typeof journeyId !== 'string' || !journeyId.trim()) return null
    return journeys.value.find((journey) => journey.id === journeyId.trim()) || null
  }

  const replaceJourney = (rawJourney) => {
    const normalized = normalizeAgendaJourney(rawJourney)
    if (!normalized) return false
    const index = journeys.value.findIndex((journey) => journey.id === normalized.id)
    if (index < 0) journeys.value = normalizeAgendaJourneys([...journeys.value, normalized])
    else {
      const next = [...journeys.value]
      next[index] = normalized
      journeys.value = normalizeAgendaJourneys(next)
    }
    return true
  }

  const applyPersistedSource = (source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false
    journeys.value = normalizeAgendaJourneys(source.journeys)
    lastReconciledAt.value = toTimestamp(source.lastReconciledAt, 0)
    return true
  }

  const createPersistedSnapshot = () => ({
    schemaVersion: AGENDA_JOURNEY_SCHEMA_VERSION,
    journeys: journeys.value.map((journey) => ({
      ...journey,
      locationRef: journey.locationRef ? { ...journey.locationRef } : null,
      steps: journey.steps.map((step) => ({
        ...step,
        locationRef: step.locationRef ? { ...step.locationRef } : null,
        evidenceRefs: step.evidenceRefs.map((reference) => ({ ...reference })),
      })),
    })),
    lastReconciledAt: lastReconciledAt.value,
  })

  const createBackupSnapshot = () => createPersistedSnapshot()
  const createBackupSnapshotAsync = async () => createBackupSnapshot()
  const restoreFromBackup = (snapshot = {}) => applyPersistedSource(resolveBackupSource(snapshot))

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(AGENDA_JOURNEY_STORAGE_KEY, {
      version: AGENDA_JOURNEY_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(AGENDA_JOURNEY_STORAGE_KEY, {
      version: AGENDA_JOURNEY_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const persistToStorage = () =>
    writePersistedState(AGENDA_JOURNEY_STORAGE_KEY, createPersistedSnapshot(), {
      version: AGENDA_JOURNEY_STORAGE_VERSION,
    })

  const createManualPlan = (input = {}, { now = Date.now() } = {}) => {
    const createdAt = toTimestamp(now, Date.now())
    const startsAt = toTimestamp(input.startsAt, 0)
    const dayFloor = startOfCalendarDay(createdAt)
    if (startsAt < dayFloor || startsAt > dayFloor + MANUAL_PLAN_HORIZON_MS) {
      return { ok: false, code: 'MANUAL_AGENDA_JOURNEY_OUTSIDE_HORIZON', journey: null }
    }
    let suffix = journeys.value.length
    let id = `aj::manual::${createdAt}::${suffix}`
    while (findJourneyById(id)) {
      suffix += 1
      id = `aj::manual::${createdAt}::${suffix}`
    }
    const result = createManualAgendaJourney({ ...input, id, now: createdAt })
    if (!result.ok || !replaceJourney(result.journey)) return result
    return { ...result, journey: findJourneyById(result.journey.id) }
  }

  const materializeCalendarOccurrence = ({ occurrence = {}, request = {}, now = Date.now() } = {}) => {
    const journeyId = request.agendaJourneyId || ''
    const existing = journeyId
      ? findJourneyById(journeyId)
      : journeys.value.find(
          (journey) => journey.scheduleOrchestrationId === request.orchestrationId,
        ) || null
    const result = materializeCalendarAgendaJourney({
      occurrence,
      request,
      existingJourney: existing,
      now,
    })
    if (!result.ok || !replaceJourney(result.journey)) return result
    lastReconciledAt.value = toTimestamp(now, Date.now())
    return { ...result, journey: findJourneyById(result.journey.id) }
  }

  const retireOrchestrationRecords = (records = [], { now = Date.now() } = {}) => {
    const retiredAt = toTimestamp(now, Date.now())
    let changed = 0
    ;(Array.isArray(records) ? records : []).forEach((record) => {
      if (!record?.retiredAt) return
      const journey = record.agendaJourneyId
        ? findJourneyById(record.agendaJourneyId)
        : journeys.value.find(
            (candidate) => candidate.scheduleOrchestrationId === record.id,
          ) || null
      if (!journey || journey.sourceState === 'retired') return
      const retired = retireCalendarAgendaJourneySource(journey, {
        retiredAt: record.retiredAt || retiredAt,
        reason: record.retirementReason || 'calendar_source_retired',
      })
      if (retired && replaceJourney(retired)) changed += 1
    })
    if (changed) lastReconciledAt.value = retiredAt
    return changed
  }

  const evaluateDeadlineRequest = (request = {}, { now = Date.now() } = {}) => {
    const journey = request.agendaJourneyId
      ? findJourneyById(request.agendaJourneyId)
      : journeys.value.find(
          (candidate) => candidate.scheduleOrchestrationId === request.orchestrationId,
        ) || null
    const result = evaluateAgendaJourneyDeadline(journey, { evaluatedAt: now })
    if (!result.ok || !replaceJourney(result.journey)) return result
    lastReconciledAt.value = toTimestamp(now, Date.now())
    return { ...result, journey: findJourneyById(result.journey.id) }
  }

  const setStepTransportMode = (journeyId, stepId, transportMode, { now = Date.now() } = {}) => {
    const journey = findJourneyById(journeyId)
    const updated = setAgendaJourneyStepTransportMode(journey, stepId, transportMode, { now })
    return updated ? replaceJourney(updated) : false
  }

  const linkMapJourney = (
    journeyId,
    stepId,
    mapJourneyResult = {},
    { now = Date.now() } = {},
  ) => {
    const result = linkAgendaJourneyMapJourney(
      findJourneyById(journeyId),
      stepId,
      mapJourneyResult,
      { now },
    )
    if (!result.ok || !replaceJourney(result.journey)) return result
    return { ...result, journey: findJourneyById(journeyId) }
  }

  const reconcileMapEvidence = ({
    activeMapJourney = null,
    mapJourneyHistory = [],
    now = Date.now(),
  } = {}) => {
    const reconciledAt = toTimestamp(now, Date.now())
    let changed = 0
    journeys.value.forEach((journey) => {
      const reconciled = reconcileAgendaJourneyMapEvidence(journey, {
        activeMapJourney,
        mapJourneyHistory,
        now: reconciledAt,
      })
      if (JSON.stringify(reconciled) === JSON.stringify(journey)) return
      if (replaceJourney(reconciled)) changed += 1
    })
    if (changed) lastReconciledAt.value = reconciledAt
    return changed
  }

  const transitionActivity = (
    journeyId,
    stepId,
    action,
    { now = Date.now() } = {},
  ) => {
    const result = transitionAgendaJourneyActivityStep(
      findJourneyById(journeyId),
      stepId,
      action,
      { now },
    )
    if (!result.ok || !replaceJourney(result.journey)) return result
    return { ...result, journey: findJourneyById(journeyId) }
  }

  const prepareActivitySession = (journeyId, stepId, options = {}) =>
    prepareAgendaJourneyActivitySessionRequest(findJourneyById(journeyId), stepId, options)

  const beginActivitySession = (
    journeyId,
    stepId,
    { completionPolicy = 'user_confirmation', now = Date.now() } = {},
  ) =>
    transitionActivity(journeyId, stepId, 'start', { now, completionPolicy })

  const applyActivitySessionEvidence = (
    journeyId,
    stepId,
    evidence = {},
    { now = Date.now() } = {},
  ) => {
    const result = applyAgendaJourneyActivitySessionEvidence(
      findJourneyById(journeyId),
      stepId,
      evidence,
      { now },
    )
    if (!result.ok || !replaceJourney(result.journey)) return result
    return { ...result, journey: findJourneyById(journeyId) }
  }

  const cancelPlan = (journeyId, { now = Date.now(), reason = '' } = {}) => {
    const cancelled = cancelAgendaJourney(findJourneyById(journeyId), { now, reason })
    return cancelled ? replaceJourney(cancelled) : false
  }

  const saveNow = () => persistToStorage()

  const resetForTesting = () => {
    journeys.value = []
    lastReconciledAt.value = 0
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) await hydrateFromStorageAsync()
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [journeys, lastReconciledAt],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    journeys,
    orderedJourneys,
    lastReconciledAt,
    hasFinishedStorageHydration,
    findJourneyById,
    createManualPlan,
    materializeCalendarOccurrence,
    retireOrchestrationRecords,
    evaluateDeadlineRequest,
    setStepTransportMode,
    linkMapJourney,
    reconcileMapEvidence,
    transitionActivity,
    prepareActivitySession,
    beginActivitySession,
    applyActivitySessionEvidence,
    cancelPlan,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    saveNow,
    resetForTesting,
  }
})
