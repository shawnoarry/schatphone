import { expandCalendarEventOccurrences } from './calendar-schedule'
import { readPersistedState, readPersistedStateAsync } from './persistence'
import { useAgendaJourneyStore } from '../stores/agendaJourney'
import { useScheduleOrchestratorStore } from '../stores/scheduleOrchestrator'
import { useSimulationStore } from '../stores/simulation'
import { useWorkHubStore } from '../stores/workHub'
import { useSystemStore } from '../stores/system'
import { inspectWorkScheduleExecutionEligibility } from './work-schedule-execution'

const CALENDAR_STORAGE_KEY = 'store:calendar'
const CALENDAR_STORAGE_VERSION = 4

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
  const simulationStore = useSimulationStore(pinia)
  const workHubStore = useWorkHubStore(pinia)
  const systemStore = useSystemStore(pinia)
  let disposed = false
  let hydrationTimerId = null
  let reconcilePromise = null
  let rerunRequested = false
  let suppressedOrchestratorSubscriptions = 0

  const mutateOrchestrator = (mutation) => {
    suppressedOrchestratorSubscriptions += 1
    const result = mutation()
    if (!result) suppressedOrchestratorSubscriptions = Math.max(
      0,
      suppressedOrchestratorSubscriptions - 1,
    )
    return result
  }

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
    scheduleOrchestratorStore.hasFinishedStorageHydration === true &&
    systemStore.hasFinishedStorageHydration === true

  const notifyExecutionReady = (journey, notifiedAt) => {
    if (
      !journey?.id ||
      !journey.executionRevision ||
      journey.executionNotificationRevision === journey.executionRevision ||
      journey.sourceReviewRequired ||
      ['completed', 'missed', 'skipped', 'cancelled'].includes(journey.status)
    ) {
      return { ok: true, notified: false }
    }
    const language = String(systemStore.settings?.system?.language || '').toLowerCase()
    const english = language.startsWith('en')
    const oldNotificationId = journey.executionNotificationId || ''
    const notificationId = systemStore.addNotification({
      title: english ? 'Agenda plan ready' : '行程计划已准备',
      content: english
        ? `${journey.titleEn || journey.titleZh} is ready for your explicit next step.`
        : `${journey.titleZh || journey.titleEn}已可由你明确开始下一步。`,
      icon: 'fas fa-route',
      route: `/agenda-journey?journeyId=${encodeURIComponent(journey.id)}&source=notification`,
      source: `agenda_journey_ready::${journey.id}::${journey.executionRevision}`,
      createdAt: notifiedAt,
    })
    if (!notificationId) return { ok: true, notified: false }
    if (!agendaJourneyStore.recordExecutionNotification(journey.id, {
      revision: journey.executionRevision,
      notificationId,
      notifiedAt,
    })) {
      systemStore.removeNotification(notificationId)
      return { ok: false, notified: false, code: 'agenda_notification_marker_failed' }
    }
    const agendaPersistence = agendaJourneyStore.saveNow()
    const systemPersistence = systemStore.saveNow()
    if (agendaPersistence?.ok !== true || systemPersistence?.ok !== true) {
      agendaJourneyStore.clearExecutionNotification(journey.id, notificationId)
      systemStore.removeNotification(notificationId)
      agendaJourneyStore.saveNow()
      systemStore.saveNow()
      return { ok: false, notified: false, code: 'agenda_notification_persistence_failed' }
    }
    if (oldNotificationId && oldNotificationId !== notificationId) {
      systemStore.removeNotification(oldNotificationId)
      systemStore.saveNow()
    }
    return { ok: true, notified: true, notificationId }
  }

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
          const eligibility = inspectWorkScheduleExecutionEligibility({
            calendarEvent: occurrence,
            calendarFingerprint: request.calendarFingerprint,
            authorityPackage: workHubStore.authorityPackage,
            expectedBinding:
              workHubStore.runtimeBinding || workHubStore.authorityPackage?.worldBinding,
            receipts: workHubStore.receipts,
            eventInstances: simulationStore.eventInstancesV2,
            ownerFacts: simulationStore.ownerFacts,
            now: reconciledAt,
          })
          if (
            eligibility.proofRequired &&
            (simulationStore.hasFinishedStorageHydration !== true ||
              workHubStore.hasFinishedStorageHydration !== true)
          ) {
            rerunRequested = true
            continue
          }
          if (!eligibility.ok) {
            mutateOrchestrator(() => scheduleOrchestratorStore.recordMaterializationBlock({
              orchestrationId: request.orchestrationId,
              calendarFingerprint: request.calendarFingerprint,
              code: eligibility.code,
              blockedAt: reconciledAt,
            }))
            continue
          }
          const result = agendaJourneyStore.materializeCalendarOccurrence({
            occurrence,
            request: { ...request, executionProof: eligibility.proof },
            now: reconciledAt,
          })
          if (!result.ok || !result.journey?.id) continue
          const notification = notifyExecutionReady(result.journey, reconciledAt)
          if (!notification.ok) {
            mutateOrchestrator(() => scheduleOrchestratorStore.recordMaterializationBlock({
              orchestrationId: request.orchestrationId,
              calendarFingerprint: request.calendarFingerprint,
              code: notification.code,
              blockedAt: reconciledAt,
            }))
            continue
          }
          const acknowledged = mutateOrchestrator(() => scheduleOrchestratorStore.acknowledgeMaterialization({
            orchestrationId: request.orchestrationId,
            agendaJourneyId: result.journey.id,
            calendarFingerprint: request.calendarFingerprint,
            acknowledgedAt: reconciledAt,
          }))
          if (acknowledged) materialized += 1
        }

        for (const request of scheduleOrchestratorStore.pendingDeadlineEvaluationRequests) {
          const result = agendaJourneyStore.evaluateDeadlineRequest(request, {
            now: reconciledAt,
          })
          if (!result.ok) continue
          const acknowledged = mutateOrchestrator(() => scheduleOrchestratorStore.acknowledgeDeadlineEvaluation({
            orchestrationId: request.orchestrationId,
            calendarFingerprint: request.calendarFingerprint,
            acknowledgedAt: reconciledAt,
          }))
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
    if (suppressedOrchestratorSubscriptions > 0) {
      suppressedOrchestratorSubscriptions -= 1
      return
    }
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
