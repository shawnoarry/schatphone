import { useScheduleOrchestratorStore } from '../stores/scheduleOrchestrator'
import { readPersistedState, readPersistedStateAsync } from './persistence'
import { subscribeScheduleOrchestratorCalendarChanges } from './schedule-orchestrator-calendar-signal'

const CALENDAR_STORAGE_KEY = 'store:calendar'
const CALENDAR_STORAGE_VERSION = 4

export const startScheduleOrchestratorRuntime = ({
  pinia,
  windowRef = typeof window !== 'undefined' ? window : null,
  now = () => Date.now(),
} = {}) => {
  const orchestratorStore = useScheduleOrchestratorStore(pinia)
  let timerId = null
  let disposed = false
  let reconcilePromise = null

  const clearTimer = () => {
    if (timerId == null || !windowRef) return
    windowRef.clearTimeout(timerId)
    timerId = null
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

  const reconcile = () => {
    if (disposed) return Promise.resolve(null)
    if (orchestratorStore.hasFinishedStorageHydration !== true) {
      clearTimer()
      if (windowRef) timerId = windowRef.setTimeout(() => void reconcile(), 50)
      return Promise.resolve(null)
    }
    if (reconcilePromise) return reconcilePromise
    reconcilePromise = readCalendarEvents()
      .then((calendarEvents) => {
        if (disposed) return null
        const result = orchestratorStore.reconcileCalendarSnapshot(calendarEvents, {
          now: now(),
        })
        clearTimer()
        if (windowRef && result.nextReconcileAt > 0) {
          const delay = Math.min(2_147_483_647, Math.max(1_000, result.nextReconcileAt - now()))
          timerId = windowRef.setTimeout(() => void reconcile(), delay)
        }
        return result
      })
      .finally(() => {
        reconcilePromise = null
      })
    return reconcilePromise
  }

  const unsubscribeCalendarChanges = subscribeScheduleOrchestratorCalendarChanges(() => {
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
      clearTimer()
      unsubscribeCalendarChanges()
      windowRef?.removeEventListener?.('pageshow', handleResume)
      windowRef?.document?.removeEventListener?.('visibilitychange', handleVisibility)
    },
  }
}
