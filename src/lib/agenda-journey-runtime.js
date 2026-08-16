import { expandCalendarEventOccurrences } from './calendar-schedule'
import { readPersistedState, readPersistedStateAsync } from './persistence'
import { useAgendaJourneyStore } from '../stores/agendaJourney'
import { useScheduleOrchestratorStore } from '../stores/scheduleOrchestrator'

const CALENDAR_STORAGE_KEY = 'store:calendar'
const CALENDAR_STORAGE_VERSION = 3

const findOccurrenceForRequest = (calendarEvents, request) => {
  const event = (Array.isArray(calendarEvents) ? calendarEvents : []).find(
    (candidate) => candidate?.id === request.sourceCalendarEventId,
  )
  if (!event) return null
  return (
    expandCalendarEventOccurrences({
      events: [event],
      rangeStart: request.occurrenceStartsAt,
      rangeEnd: request.occurrenceStartsAt + 1,
      limit: 4,
    }).find((occurrence) => occurrence.startsAt === request.occurrenceStartsAt) || null
  )
}
export const startAgendaJourneyRuntime = ({
  pinia,
  windowRef = typeof window !== 'undefined' ? window : null,
  now = () => Date.now(),
} = {}) => {
  const agendaJourneyStore = useAgendaJourneyStore(pinia)
  const scheduleOrchestratorStore = useScheduleOrchestratorStore(pinia)
  let disposed = false
  let hydrationTimerId = null
  let reconcilePromise = null
  let rerunRequested = false

  const readCalendarEvents = async () => {
    const local = readPersistedState(CALENDAR_STORAGE_KEY, {
      version: CALENDAR_STORAGE_VERSION,
    })
    const source =
      local ||
      (await readPersistedStateAsync(CALENDAR_STORAGE_KEY, {
        version: CALENDAR_STORAGE_VERSION,
      }))
    return Array.isArray(source?.events) ? source.events : []
  }

  const ownersHydrated = () =>
    agendaJourneyStore.hasFinishedStorageHydration === true &&
    scheduleOrchestratorStore.hasFinishedStorageHydration === true

  const reconcile = () => {
    if (disposed) return Promise.resolve(null)
    if (!ownersHydrated()) {
      if (hydrationTimerId == null && windowRef) {
        hydrationTimerId = windowRef.setTimeout(() => {
          hydrationTimerId = null
          void reconcile()
        }, 50)
      }
      return Promise.resolve(null)
    }
    if (reconcilePromise) {
      rerunRequested = true
      return reconcilePromise
    }
    const reconciledAt = now()
    reconcilePromise = readCalendarEvents()
      .then((calendarEvents) => {
        if (disposed) return null
        agendaJourneyStore.retireOrchestrationRecords(scheduleOrchestratorStore.records, {
          now: reconciledAt,
        })

        let materialized = 0
        let deadlinesEvaluated = 0
        for (const request of scheduleOrchestratorStore.pendingMaterializationRequests) {
          const occurrence = findOccurrenceForRequest(calendarEvents, request)
          if (!occurrence) continue
          const result = agendaJourneyStore.materializeCalendarOccurrence({
            occurrence,
            request,
            now: reconciledAt,
          })
          if (!result.ok || !result.journey?.id) continue
          const acknowledged = scheduleOrchestratorStore.acknowledgeMaterialization({
            orchestrationId: request.orchestrationId,
            agendaJourneyId: result.journey.id,
            calendarFingerprint: request.calendarFingerprint,
            acknowledgedAt: reconciledAt,
          })
          if (acknowledged) materialized += 1
        }

        for (const request of scheduleOrchestratorStore.pendingDeadlineEvaluationRequests) {
          const result = agendaJourneyStore.evaluateDeadlineRequest(request, {
            now: reconciledAt,
          })
          if (!result.ok) continue
          const acknowledged = scheduleOrchestratorStore.acknowledgeDeadlineEvaluation({
            orchestrationId: request.orchestrationId,
            calendarFingerprint: request.calendarFingerprint,
            acknowledgedAt: reconciledAt,
          })
          if (acknowledged) deadlinesEvaluated += 1
        }

        return {
          reconciledAt,
          materialized,
          deadlinesEvaluated,
          agendaJourneyCount: agendaJourneyStore.journeys.length,
        }
      })
      .finally(() => {
        reconcilePromise = null
        if (rerunRequested && !disposed) {
          rerunRequested = false
          void reconcile()
        }
      })
    return reconcilePromise
  }

  const unsubscribeOrchestrator = scheduleOrchestratorStore.$subscribe(() => {
    void reconcile()
  })
  const handleResume = () => void reconcile()
  const handleVisibility = () => {
    if (!windowRef?.document || windowRef.document.visibilityState === 'visible') void reconcile()
  }
  windowRef?.addEventListener?.('pageshow', handleResume)
  windowRef?.document?.addEventListener?.('visibilitychange', handleVisibility)
  void reconcile()

  return {
    reconcile,
    stop() {
      disposed = true
      if (hydrationTimerId != null && windowRef) windowRef.clearTimeout(hydrationTimerId)
      hydrationTimerId = null
      unsubscribeOrchestrator()
      windowRef?.removeEventListener?.('pageshow', handleResume)
      windowRef?.document?.removeEventListener?.('visibilitychange', handleVisibility)
    },
  }
}
