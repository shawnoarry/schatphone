import { createActivitySessionCompletionEvidence } from './activity-session'
import { useActivitySessionStore } from '../stores/activitySession'
import { useAgendaJourneyStore } from '../stores/agendaJourney'
import { useSimulationStore } from '../stores/simulation'
import {
  listActivitySessionEventCheckpointSnapshots,
  reconcilePendingActivitySessionEvents,
  runActivitySessionCheckpointEvent,
} from './simulation/adapters/activity-session-events'

const MAX_WAKE_DELAY_MS = 30_000

const collectAgendaActivitySteps = (agendaJourneyStore) =>
  agendaJourneyStore.journeys.flatMap((journey) =>
    journey.steps.map((step) => ({
      ...step,
      sourceAgendaJourneyId: journey.id,
    })),
  )

export const reconcileActivitySessionOwners = ({
  activitySessionStore,
  agendaJourneyStore,
  simulationStore,
  now = Date.now(),
} = {}) => {
  if (!activitySessionStore || !agendaJourneyStore) {
    return { changed: 0, applied: 0, acknowledged: 0 }
  }
  const reconciledAt = Number.isFinite(Number(now)) ? Math.max(0, Math.floor(Number(now))) : Date.now()
  let checkpointChanges = 0
  let evaluated = 0
  let eventResolved = 0
  let eventFailed = 0
  if (simulationStore) {
    const checkpointReconciliation = activitySessionStore.reconcileSessions({
      sourceSteps: collectAgendaActivitySteps(agendaJourneyStore),
      now: reconciledAt,
      checkpointsOnly: true,
    })
    checkpointChanges = checkpointReconciliation.changed
    for (const snapshot of listActivitySessionEventCheckpointSnapshots(
      activitySessionStore.sessions,
      { now: reconciledAt },
    )) {
      const result = runActivitySessionCheckpointEvent({
        simulationStore,
        activitySessionStore,
        snapshot,
        now: reconciledAt,
      })
      if (result.code !== 'ACTIVITY_SESSION_EVENT_ALREADY_EVALUATED') evaluated += 1
      if (result.code === 'ACTIVITY_SESSION_EVENT_RESOLVED') eventResolved += 1
      if (result.record?.status === 'failed') eventFailed += 1
    }
    const recovered = reconcilePendingActivitySessionEvents({
      simulationStore,
      activitySessionStore,
      now: reconciledAt,
    })
    eventResolved += recovered.resolved
    eventFailed += recovered.failed
  }
  const reconciliation = activitySessionStore.reconcileSessions({
    sourceSteps: collectAgendaActivitySteps(agendaJourneyStore),
    now: reconciledAt,
  })
  if (simulationStore) {
    const finalized = reconcilePendingActivitySessionEvents({
      simulationStore,
      activitySessionStore,
      now: reconciledAt,
    })
    eventResolved += finalized.resolved
    eventFailed += finalized.failed
  }
  let applied = 0
  let acknowledged = 0
  for (const session of activitySessionStore.pendingOwnerCompletions) {
    const evidence = createActivitySessionCompletionEvidence(session)
    if (!evidence) continue
    const result = agendaJourneyStore.applyActivitySessionEvidence(
      session.agendaJourneyId,
      session.agendaJourneyStepId,
      evidence,
      { now: reconciledAt },
    )
    if (!result.ok) continue
    if (result.code === 'AGENDA_ACTIVITY_SESSION_EVIDENCE_APPLIED') applied += 1
    if (activitySessionStore.acknowledgeOwnerCompletion(session.id, { now: reconciledAt })) {
      acknowledged += 1
    }
  }
  return {
    changed: checkpointChanges + reconciliation.changed,
    applied,
    acknowledged,
    evaluated,
    eventResolved,
    eventFailed,
  }
}

export const startActivitySessionRuntime = ({
  pinia,
  windowRef = typeof window !== 'undefined' ? window : null,
  now = () => Date.now(),
} = {}) => {
  const activitySessionStore = useActivitySessionStore(pinia)
  const agendaJourneyStore = useAgendaJourneyStore(pinia)
  const simulationStore = useSimulationStore(pinia)
  let disposed = false
  let hydrationTimerId = null
  let wakeTimerId = null
  let reconciling = false
  let rerunRequested = false

  const ownersHydrated = () =>
    activitySessionStore.hasFinishedStorageHydration === true &&
    agendaJourneyStore.hasFinishedStorageHydration === true

  const clearWakeTimer = () => {
    if (wakeTimerId != null && windowRef) windowRef.clearTimeout(wakeTimerId)
    wakeTimerId = null
  }

  const scheduleWake = () => {
    clearWakeTimer()
    if (disposed || !windowRef) return
    const currentTime = now()
    const nextEndsAt = activitySessionStore.sessions
      .filter((session) => session.status === 'running')
      .flatMap((session) => [
        session.endsAt,
        ...session.checkpointPlan
          .filter(
            (checkpoint) =>
              !session.processedCheckpointIds.includes(checkpoint.id) &&
              checkpoint.offsetMs < session.effectiveDurationMs,
          )
          .map(
            (checkpoint) =>
              session.startedAt + checkpoint.offsetMs + session.accumulatedPausedMs,
          ),
      ])
      .filter((timestamp) => timestamp > currentTime)
      .sort((left, right) => left - right)[0]
    const delay = nextEndsAt
      ? Math.max(0, Math.min(MAX_WAKE_DELAY_MS, nextEndsAt - currentTime))
      : MAX_WAKE_DELAY_MS
    wakeTimerId = windowRef.setTimeout(() => {
      wakeTimerId = null
      reconcile()
    }, delay)
  }

  const reconcile = () => {
    if (disposed) return null
    if (!ownersHydrated()) {
      if (hydrationTimerId == null && windowRef) {
        hydrationTimerId = windowRef.setTimeout(() => {
          hydrationTimerId = null
          reconcile()
        }, 50)
      }
      return null
    }
    if (reconciling) {
      rerunRequested = true
      return null
    }
    reconciling = true
    const result = reconcileActivitySessionOwners({
      activitySessionStore,
      agendaJourneyStore,
      simulationStore:
        simulationStore.hasFinishedStorageHydration === true ? simulationStore : null,
      now: now(),
    })
    reconciling = false
    scheduleWake()
    if (rerunRequested && !disposed) {
      rerunRequested = false
      return reconcile()
    }
    return result
  }

  const unsubscribeActivity = activitySessionStore.$subscribe(() => reconcile())
  const unsubscribeAgenda = agendaJourneyStore.$subscribe(() => reconcile())
  const unsubscribeSimulation = simulationStore.$subscribe(() => reconcile())
  const handleResume = () => reconcile()
  const handleVisibility = () => {
    if (!windowRef?.document || windowRef.document.visibilityState === 'visible') reconcile()
  }
  windowRef?.addEventListener?.('pageshow', handleResume)
  windowRef?.document?.addEventListener?.('visibilitychange', handleVisibility)
  reconcile()

  return {
    reconcile,
    stop() {
      disposed = true
      if (hydrationTimerId != null && windowRef) windowRef.clearTimeout(hydrationTimerId)
      hydrationTimerId = null
      clearWakeTimer()
      unsubscribeActivity()
      unsubscribeAgenda()
      unsubscribeSimulation()
      windowRef?.removeEventListener?.('pageshow', handleResume)
      windowRef?.document?.removeEventListener?.('visibilitychange', handleVisibility)
    },
  }
}
