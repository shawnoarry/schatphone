import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useScheduleOrchestratorStore } from '../src/stores/scheduleOrchestrator'

const HOUR_MS = 60 * 60 * 1000
const NOW = new Date('2026-08-16T03:00:00.000Z').getTime()

const createOverdueEvent = () => ({
  id: 'calendar_event_required_rehearsal',
  status: 'confirmed',
  titleZh: '必到排练',
  titleEn: 'Required rehearsal',
  startsAt: NOW - 2 * HOUR_MS,
  endsAt: NOW - HOUR_MS,
  recurrence: 'none',
  recurrenceUntil: 0,
  requirement: 'required',
  reminderLeadMinutes: 0,
  updatedAt: NOW - 3 * HOUR_MS,
})

describe('Schedule Orchestrator store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.setSystemTime(NOW)
    setActivePinia(createPinia())
  })

  test('acknowledges stable materialization and deadline requests through public actions', () => {
    const store = useScheduleOrchestratorStore()
    store.reconcileCalendarSnapshot([createOverdueEvent()], { now: NOW })

    expect(store.pendingMaterializationRequests).toHaveLength(1)
    expect(store.pendingDeadlineEvaluationRequests).toHaveLength(1)
    const materialization = store.pendingMaterializationRequests[0]
    const deadline = store.pendingDeadlineEvaluationRequests[0]

    expect(
      store.acknowledgeMaterialization({
        orchestrationId: materialization.orchestrationId,
        agendaJourneyId: 'agenda_journey_rehearsal_1',
        calendarFingerprint: materialization.calendarFingerprint,
        acknowledgedAt: NOW + 1_000,
      }),
    ).toBe(true)
    expect(
      store.acknowledgeDeadlineEvaluation({
        orchestrationId: deadline.orchestrationId,
        calendarFingerprint: deadline.calendarFingerprint,
        acknowledgedAt: NOW + 2_000,
      }),
    ).toBe(true)
    expect(store.pendingMaterializationRequests).toEqual([])
    expect(store.pendingDeadlineEvaluationRequests).toEqual([])
    expect(store.records[0].agendaJourneyId).toBe('agenda_journey_rehearsal_1')
  })

  test('round-trips backup state and preserves once-only reconciliation after reopen', () => {
    const store = useScheduleOrchestratorStore()
    store.reconcileCalendarSnapshot([createOverdueEvent()], { now: NOW })
    const request = store.pendingDeadlineEvaluationRequests[0]
    store.acknowledgeDeadlineEvaluation({
      orchestrationId: request.orchestrationId,
      calendarFingerprint: request.calendarFingerprint,
      acknowledgedAt: NOW + 1_000,
    })
    const snapshot = store.createBackupSnapshot()

    setActivePinia(createPinia())
    const reopened = useScheduleOrchestratorStore()
    expect(
      reopened.restoreFromBackup({
        calendar: { scheduleOrchestrator: snapshot },
      }),
    ).toBe(true)
    reopened.reconcileCalendarSnapshot([createOverdueEvent()], { now: NOW + 6 * HOUR_MS })

    expect(reopened.pendingDeadlineEvaluationRequests).toEqual([])
    expect(reopened.records).toHaveLength(1)
    expect(reopened.records[0].deadlineEvaluationAcknowledgedRevision).toBe(
      reopened.records[0].deadlineEvaluationRevision,
    )
  })

  test('treats a legacy backup without the new Calendar child section as an empty owner snapshot', () => {
    const store = useScheduleOrchestratorStore()
    store.reconcileCalendarSnapshot([createOverdueEvent()], { now: NOW })
    expect(store.records).toHaveLength(1)

    expect(store.restoreFromBackup({})).toBe(true)
    expect(store.records).toEqual([])
    expect(store.lastReconciledAt).toBe(0)
    expect(store.nextReconcileAt).toBe(0)
  })
})
