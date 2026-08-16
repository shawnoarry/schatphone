import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  reconcileActivitySessionOwners,
  startActivitySessionRuntime,
} from '../src/lib/activity-session-runtime'
import { useActivitySessionStore } from '../src/stores/activitySession'
import { useAgendaJourneyStore } from '../src/stores/agendaJourney'
import {
  SIMULATION_SURPRISE_MODE,
  useSimulationStore,
} from '../src/stores/simulation'
import {
  ACTIVITY_SESSION_EVENT_MODULE_KEY,
  ACTIVITY_SESSION_EVENT_PRESENTATION_MODE,
} from '../src/lib/activity-session-event-interface'

const NOW = new Date('2026-08-16T09:00:00+08:00').getTime()
const HOUR_MS = 60 * 60 * 1000

const createStoresWithSession = async (completionPolicy = 'duration_sufficient') => {
  const agenda = useAgendaJourneyStore()
  const sessions = useActivitySessionStore()
  await vi.waitFor(() => {
    expect(agenda.hasFinishedStorageHydration).toBe(true)
    expect(sessions.hasFinishedStorageHydration).toBe(true)
  })
  const created = agenda.createManualPlan(
    {
      title: '声乐练习',
      startsAt: NOW + HOUR_MS,
      endsAt: NOW + 2 * HOUR_MS,
    },
    { now: NOW },
  )
  const activity = created.journey.steps[0]
  const prepared = agenda.prepareActivitySession(created.journey.id, activity.id, {
    completionPolicy,
    pausePolicy: 'allow_pause',
  })
  const started = sessions.startForAgendaRequest(prepared.request, { now: NOW })
  agenda.beginActivitySession(created.journey.id, activity.id, {
    completionPolicy,
    now: NOW,
  })
  return { agenda, sessions, journeyId: created.journey.id, activity, started }
}

describe('Activity Session runtime', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('reconciles an elapsed duration and returns bounded completion evidence to Agenda Journey once', async () => {
    const { agenda, sessions, journeyId, activity } = await createStoresWithSession()
    const first = reconcileActivitySessionOwners({
      activitySessionStore: sessions,
      agendaJourneyStore: agenda,
      now: NOW + 2 * HOUR_MS,
    })
    const second = reconcileActivitySessionOwners({
      activitySessionStore: sessions,
      agendaJourneyStore: agenda,
      now: NOW + 3 * HOUR_MS,
    })

    expect(first).toMatchObject({ changed: 1, applied: 1, acknowledged: 1 })
    expect(second).toMatchObject({ changed: 0, applied: 0, acknowledged: 0 })
    expect(sessions.findSessionByStepId(activity.id)).toMatchObject({
      status: 'completed',
      ownerCompletionAcknowledgedAt: NOW + 2 * HOUR_MS,
    })
    expect(agenda.findJourneyById(journeyId)).toMatchObject({ status: 'completed' })
    expect(agenda.findJourneyById(journeyId).steps[0].evidenceRefs).toContainEqual(
      expect.objectContaining({ owner: 'activity-session', status: 'completed' }),
    )
  })

  test('keeps an elapsed user-confirmation session active until the user completes it', async () => {
    const { agenda, sessions, journeyId, activity } = await createStoresWithSession(
      'user_confirmation',
    )
    const elapsed = reconcileActivitySessionOwners({
      activitySessionStore: sessions,
      agendaJourneyStore: agenda,
      now: NOW + 2 * HOUR_MS,
    })

    expect(elapsed.applied).toBe(0)
    expect(sessions.findSessionByStepId(activity.id).status).toBe('running')
    expect(agenda.findJourneyById(journeyId).steps[0].status).toBe('active')

    sessions.completeSession(sessions.findSessionByStepId(activity.id).id, {
      now: NOW + 2 * HOUR_MS + 1000,
    })
    const confirmed = reconcileActivitySessionOwners({
      activitySessionStore: sessions,
      agendaJourneyStore: agenda,
      now: NOW + 2 * HOUR_MS + 1000,
    })
    expect(confirmed.applied).toBe(1)
    expect(agenda.findJourneyById(journeyId).status).toBe('completed')
  })

  test('reconciles on visible-document return without promising closed-app interaction', async () => {
    const { agenda, sessions, journeyId } = await createStoresWithSession()
    let currentTime = NOW
    const listeners = new Map()
    const documentListeners = new Map()
    const windowRef = {
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
      addEventListener: vi.fn((name, handler) => listeners.set(name, handler)),
      removeEventListener: vi.fn(),
      document: {
        visibilityState: 'visible',
        addEventListener: vi.fn((name, handler) => documentListeners.set(name, handler)),
        removeEventListener: vi.fn(),
      },
    }
    const runtime = startActivitySessionRuntime({
      pinia: null,
      windowRef,
      now: () => currentTime,
    })

    currentTime = NOW + 2 * HOUR_MS
    documentListeners.get('visibilitychange')()

    expect(agenda.findJourneyById(journeyId).status).toBe('completed')
    expect(sessions.pendingOwnerCompletions).toEqual([])
    expect(listeners.has('pageshow')).toBe(true)
    runtime.stop()
  })

  test('submits one midpoint snapshot and leaves the base activity usable in text mode', async () => {
    const { agenda, sessions, activity } = await createStoresWithSession('duration_sufficient')
    const simulation = useSimulationStore()
    await vi.waitFor(() => expect(simulation.hasFinishedStorageHydration).toBe(true))
    simulation.resetForTesting()
    simulation.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    simulation.setEventPresentationMode(
      ACTIVITY_SESSION_EVENT_MODULE_KEY,
      ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.TEXT,
    )

    const midpoint = reconcileActivitySessionOwners({
      activitySessionStore: sessions,
      agendaJourneyStore: agenda,
      simulationStore: simulation,
      now: NOW + 31 * 60 * 1000,
    })
    const repeated = reconcileActivitySessionOwners({
      activitySessionStore: sessions,
      agendaJourneyStore: agenda,
      simulationStore: simulation,
      now: NOW + 32 * 60 * 1000,
    })

    expect(midpoint.evaluated).toBe(1)
    expect(repeated.evaluated).toBe(0)
    expect(
      simulation.findActivitySessionEventForSession(
        sessions.findSessionByStepId(activity.id).id,
      ),
    ).toMatchObject({ status: 'pending', presentationMode: 'text' })
    expect(sessions.findSessionByStepId(activity.id).status).toBe('running')
    expect(agenda.journeys[0].status).toBe('active')
  })
})
