import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useActivitySessionStore } from '../src/stores/activitySession'
import {
  SIMULATION_SURPRISE_MODE,
  useSimulationStore,
} from '../src/stores/simulation'
import {
  ACTIVITY_SESSION_EVENT_MODULE_KEY,
  ACTIVITY_SESSION_EVENT_OUTCOME,
  ACTIVITY_SESSION_EVENT_PRESENTATION_MODE,
} from '../src/lib/activity-session-event-interface'
import {
  buildActivitySessionCheckpointSnapshot,
  resolveActivitySessionCheckpointEvent,
  runActivitySessionCheckpointEvent,
} from '../src/lib/simulation/adapters/activity-session-events'

const NOW = new Date('2026-08-16T09:00:00+08:00').getTime()
const MINUTE_MS = 60_000

const request = {
  sourceOwner: 'agenda-journey',
  sourceStepKind: 'activity',
  sourceStepStatus: 'available',
  agendaJourneyId: 'aj::activity-event-test',
  agendaJourneyStepId: 'aj::activity-event-test::activity',
  plannedDurationMs: 20 * MINUTE_MS,
  completionPolicy: 'duration_sufficient',
  pausePolicy: 'allow_pause',
}

const createCheckpointFixture = async ({ presentationMode = 'off' } = {}) => {
  const activitySessionStore = useActivitySessionStore()
  const simulationStore = useSimulationStore()
  await vi.waitFor(() => {
    expect(activitySessionStore.hasFinishedStorageHydration).toBe(true)
    expect(simulationStore.hasFinishedStorageHydration).toBe(true)
  })
  simulationStore.resetForTesting()
  simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
  simulationStore.setEventPresentationMode(
    ACTIVITY_SESSION_EVENT_MODULE_KEY,
    presentationMode,
  )
  const started = activitySessionStore.startForAgendaRequest(request, { now: NOW })
  expect(started.ok).toBe(true)
  activitySessionStore.reconcileSessions({
    sourceSteps: [{ id: request.agendaJourneyStepId, kind: 'activity', status: 'active' }],
    now: NOW + 10 * MINUTE_MS,
    checkpointsOnly: true,
  })
  const session = activitySessionStore.findSessionById(started.session.id)
  const midpoint = session.checkpointPlan.find((checkpoint) => checkpoint.type === 'duration_milestone')
  return {
    activitySessionStore,
    simulationStore,
    session,
    snapshot: buildActivitySessionCheckpointSnapshot(session, midpoint.id, {
      now: NOW + 10 * MINUTE_MS,
    }),
  }
}

describe('Activity Session checkpoint events', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('evaluates the midpoint once and silently keeps rhythm when presentation is off', async () => {
    const fixture = await createCheckpointFixture()
    const first = runActivitySessionCheckpointEvent({
      ...fixture,
      randomValue: 0,
      now: NOW + 10 * MINUTE_MS,
    })
    const second = runActivitySessionCheckpointEvent({
      ...fixture,
      randomValue: 0,
      now: NOW + 11 * MINUTE_MS,
    })

    expect(first).toMatchObject({ ok: true, code: 'ACTIVITY_SESSION_EVENT_RESOLVED' })
    expect(first.record).toMatchObject({
      status: 'resolved',
      presentationMode: ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.OFF,
      selectedOutcome: ACTIVITY_SESSION_EVENT_OUTCOME.KEEP_RHYTHM,
      resolutionMode: 'automatic',
    })
    expect(second).toMatchObject({
      ok: true,
      code: 'ACTIVITY_SESSION_EVENT_ALREADY_EVALUATED',
    })
    expect(fixture.simulationStore.activitySessionEventRecords).toHaveLength(1)
    expect(
      fixture.activitySessionStore.findSessionById(fixture.session.id),
    ).toMatchObject({
      effectiveDurationMs: 20 * MINUTE_MS,
      eventDurationAdjustmentMs: 0,
      eventResolutions: [
        expect.objectContaining({ outcomeId: ACTIVITY_SESSION_EVENT_OUTCOME.KEEP_RHYTHM }),
      ],
    })
  })

  test('keeps a text event pending until the owner validates an allowlisted choice', async () => {
    const fixture = await createCheckpointFixture({
      presentationMode: ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.TEXT,
    })
    const pending = runActivitySessionCheckpointEvent({
      ...fixture,
      randomValue: 0,
      now: NOW + 10 * MINUTE_MS,
    })
    const resolved = resolveActivitySessionCheckpointEvent({
      simulationStore: fixture.simulationStore,
      activitySessionStore: fixture.activitySessionStore,
      eventRecordId: pending.record.id,
      outcomeId: ACTIVITY_SESSION_EVENT_OUTCOME.ADD_RECOVERY_BUFFER,
      now: NOW + 10 * MINUTE_MS + 1000,
    })

    expect(pending.record).toMatchObject({ status: 'pending', presentationMode: 'text' })
    expect(resolved).toMatchObject({ ok: true, code: 'ACTIVITY_SESSION_EVENT_RESOLVED' })
    expect(resolved.record).toMatchObject({
      status: 'resolved',
      selectedOutcome: ACTIVITY_SESSION_EVENT_OUTCOME.ADD_RECOVERY_BUFFER,
      resolutionMode: 'user_choice',
    })
    expect(
      fixture.activitySessionStore.findSessionById(fixture.session.id),
    ).toMatchObject({
      effectiveDurationMs: 22 * MINUTE_MS,
      eventDurationAdjustmentMs: 2 * MINUTE_MS,
      endsAt: NOW + 22 * MINUTE_MS,
    })
    expect(
      resolveActivitySessionCheckpointEvent({
        simulationStore: fixture.simulationStore,
        activitySessionStore: fixture.activitySessionStore,
        eventRecordId: pending.record.id,
        outcomeId: ACTIVITY_SESSION_EVENT_OUTCOME.ADD_RECOVERY_BUFFER,
        now: NOW + 12 * MINUTE_MS,
      }),
    ).toMatchObject({ ok: true, code: 'ACTIVITY_SESSION_EVENT_ALREADY_RESOLVED' })
  })

  test('records no-event gates and never lets a stale text choice mutate a terminal session', async () => {
    const disabled = await createCheckpointFixture({ presentationMode: 'text' })
    disabled.simulationStore.setModuleEventsEnabled(ACTIVITY_SESSION_EVENT_MODULE_KEY, false)
    const noEvent = runActivitySessionCheckpointEvent({
      ...disabled,
      randomValue: 0,
      now: NOW + 10 * MINUTE_MS,
    })
    expect(noEvent.record).toMatchObject({
      status: 'no_event',
      reason: 'module_events_disabled',
    })
    expect(disabled.activitySessionStore.findSessionById(disabled.session.id).eventResolutions).toEqual([])

    localStorage.clear()
    setActivePinia(createPinia())
    const stale = await createCheckpointFixture({ presentationMode: 'text' })
    const pending = runActivitySessionCheckpointEvent({
      ...stale,
      randomValue: 0,
      now: NOW + 10 * MINUTE_MS,
    })
    stale.activitySessionStore.cancelSession(stale.session.id, {
      now: NOW + 11 * MINUTE_MS,
      reason: 'test_terminal',
    })
    const rejected = resolveActivitySessionCheckpointEvent({
      simulationStore: stale.simulationStore,
      activitySessionStore: stale.activitySessionStore,
      eventRecordId: pending.record.id,
      outcomeId: ACTIVITY_SESSION_EVENT_OUTCOME.ADD_RECOVERY_BUFFER,
      now: NOW + 12 * MINUTE_MS,
    })
    expect(rejected).toMatchObject({
      ok: false,
      code: 'ACTIVITY_SESSION_EVENT_SOURCE_STALE',
      record: { status: 'failed' },
    })
    expect(stale.activitySessionStore.findSessionById(stale.session.id)).toMatchObject({
      status: 'cancelled',
      eventDurationAdjustmentMs: 0,
    })
  })
})
