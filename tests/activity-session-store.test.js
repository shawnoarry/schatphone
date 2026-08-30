import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useActivitySessionStore } from '../src/stores/activitySession'

const NOW = new Date('2026-08-16T09:00:00+08:00').getTime()
const MINUTE_MS = 60_000

const request = (stepId, patch = {}) => ({
  sourceOwner: 'agenda-journey',
  sourceStepKind: 'activity',
  sourceStepStatus: 'available',
  agendaJourneyId: `aj::${stepId}`,
  agendaJourneyStepId: stepId,
  agendaExecutionRevision: 'agenda-revision-1',
  plannedDurationMs: 25 * MINUTE_MS,
  completionPolicy: 'user_confirmation',
  pausePolicy: 'allow_pause',
  ...patch,
})

describe('Activity Session store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('persists one session per Agenda activity step and restores a missing legacy child as empty', async () => {
    const store = useActivitySessionStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    const started = store.startForAgendaRequest(request('agenda-step-1'), { now: NOW })
    const reused = store.startForAgendaRequest(request('agenda-step-1'), { now: NOW + 1000 })

    expect(started).toMatchObject({ ok: true, reused: false })
    expect(reused).toMatchObject({ ok: true, reused: true })
    expect(store.sessions).toHaveLength(1)
    store.saveNow()

    setActivePinia(createPinia())
    const reopened = useActivitySessionStore()
    expect(reopened.findSessionByStepId('agenda-step-1')).toMatchObject({ status: 'running' })
    expect(reopened.restoreFromBackup({ calendar: { events: [] } })).toBe(true)
    expect(reopened.sessions).toEqual([])
  })

  test('blocks a second live activity but reconciles completed duration from timestamps', async () => {
    const store = useActivitySessionStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    const started = store.startForAgendaRequest(
      request('agenda-step-1', { completionPolicy: 'duration_sufficient' }),
      { now: NOW },
    )
    expect(started.ok).toBe(true)
    expect(store.inspectStartRequest(request('agenda-step-2'))).toMatchObject({
      ok: false,
      code: 'ACTIVITY_SESSION_ACTIVE_CONFLICT',
    })

    const reconciled = store.reconcileSessions({
      sourceSteps: [{ id: 'agenda-step-1', kind: 'activity', status: 'active' }],
      now: NOW + 30 * MINUTE_MS,
    })
    expect(reconciled.changed).toBe(1)
    expect(store.findSessionByStepId('agenda-step-1')).toMatchObject({
      status: 'completed',
      ownerCompletionAcknowledgedAt: 0,
    })
    expect(store.pendingOwnerCompletions).toHaveLength(1)
  })

  test('rejects a stale request for the same Agenda step revision', async () => {
    const store = useActivitySessionStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    expect(store.startForAgendaRequest(request('agenda-step-revision'), { now: NOW }).ok).toBe(true)
    expect(store.inspectStartRequest(request('agenda-step-revision', {
      agendaExecutionRevision: 'agenda-revision-2',
    }))).toMatchObject({
      ok: false,
      code: 'ACTIVITY_SESSION_EXECUTION_REVISION_CONFLICT',
    })
  })

  test('cancels a live timer when its source activity becomes terminal elsewhere', async () => {
    const store = useActivitySessionStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    store.startForAgendaRequest(request('agenda-step-1'), { now: NOW })

    store.reconcileSessions({
      sourceSteps: [{ id: 'agenda-step-1', kind: 'activity', status: 'missed' }],
      now: NOW + MINUTE_MS,
    })

    expect(store.findSessionByStepId('agenda-step-1')).toMatchObject({
      status: 'cancelled',
      completionReason: 'source_step_terminal',
    })
  })

  test('migrates V1 sessions to V3 with an empty event-resolution ledger', async () => {
    const store = useActivitySessionStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    store.startForAgendaRequest(request('agenda-step-v1'), { now: NOW })
    const legacy = store.createBackupSnapshot()
    localStorage.setItem(
      'schatphone:store:activity-session',
      JSON.stringify({
        version: 1,
        savedAt: NOW,
        data: {
          ...legacy,
          schemaVersion: 1,
          sessions: legacy.sessions.map((session) => {
            const legacySession = { ...session, schemaVersion: 1 }
            delete legacySession.eventResolutions
            return legacySession
          }),
        },
      }),
    )

    setActivePinia(createPinia())
    const restored = useActivitySessionStore()
    expect(restored.findSessionByStepId('agenda-step-v1')).toMatchObject({
      schemaVersion: 3,
      eventResolutions: [],
    })
    expect(restored.createBackupSnapshot().schemaVersion).toBe(3)
  })
})
