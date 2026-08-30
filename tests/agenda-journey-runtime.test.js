import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { startAgendaJourneyRuntime } from '../src/lib/agenda-journey-runtime'
import { useAgendaJourneyStore } from '../src/stores/agendaJourney'
import { useScheduleOrchestratorStore } from '../src/stores/scheduleOrchestrator'
import { useSystemStore } from '../src/stores/system'

const NOW = new Date('2026-08-16T03:00:00.000Z').getTime()
const HOUR_MS = 60 * 60 * 1000

const writeCalendarSnapshot = (patch = {}) => {
  const event = {
    id: 'calendar_event_agenda_runtime',
    status: 'confirmed',
    titleZh: '运行时舞台彩排',
    titleEn: 'Runtime stage rehearsal',
    startsAt: NOW + 2 * HOUR_MS,
    endsAt: NOW + 3 * HOUR_MS,
    recurrence: 'none',
    requirement: 'required',
    updatedAt: NOW - HOUR_MS,
    ...patch,
  }
  localStorage.setItem(
    'schatphone:store:calendar',
    JSON.stringify({ version: 4, savedAt: NOW, data: { events: [event] } }),
  )
  return event
}

const createWindowRef = () => ({
  setTimeout: vi.fn(() => 1),
  clearTimeout: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  document: {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
})
describe('Agenda Journey runtime', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('consumes CJA-2 materialization requests and acknowledges one stable Agenda Journey ID', async () => {
    const event = writeCalendarSnapshot()
    const orchestrator = useScheduleOrchestratorStore()
    const agenda = useAgendaJourneyStore()
    const system = useSystemStore()
    await vi.waitFor(() => {
      expect(orchestrator.hasFinishedStorageHydration).toBe(true)
      expect(agenda.hasFinishedStorageHydration).toBe(true)
      expect(system.hasFinishedStorageHydration).toBe(true)
    })
    system.settings.appearance.soundEffectsEnabled = false
    system.settings.appearance.hapticFeedbackEnabled = false
    orchestrator.reconcileCalendarSnapshot([event], { now: NOW })
    expect(orchestrator.pendingMaterializationRequests).toHaveLength(1)

    const runtime = startAgendaJourneyRuntime({
      pinia: null,
      windowRef: createWindowRef(),
      now: () => NOW,
    })
    const result = await runtime.reconcile()

    expect(result).toMatchObject({ materialized: 1, agendaJourneyCount: 1 })
    expect(agenda.journeys[0]).toMatchObject({
      sourceCalendarEventId: event.id,
      sourceOccurrenceId: `${event.id}::${event.startsAt}`,
      titleZh: event.titleZh,
    })
    expect(orchestrator.pendingMaterializationRequests).toEqual([])
    expect(orchestrator.records[0].agendaJourneyId).toBe(agenda.journeys[0].id)
    expect(agenda.journeys[0].executionNotificationRevision).toBe(
      agenda.journeys[0].executionRevision,
    )
    expect(system.notifications).toHaveLength(1)
    expect(system.notifications[0].route).toContain(
      `journeyId=${encodeURIComponent(agenda.journeys[0].id)}`,
    )
    runtime.stop()
  })

  test('evaluates required deadlines after materialization without creating a second journey', async () => {
    const event = writeCalendarSnapshot({
      startsAt: NOW - 2 * HOUR_MS,
      endsAt: NOW - HOUR_MS,
    })
    const orchestrator = useScheduleOrchestratorStore()
    const agenda = useAgendaJourneyStore()
    const system = useSystemStore()
    await vi.waitFor(() => {
      expect(orchestrator.hasFinishedStorageHydration).toBe(true)
      expect(agenda.hasFinishedStorageHydration).toBe(true)
      expect(system.hasFinishedStorageHydration).toBe(true)
    })
    system.settings.appearance.soundEffectsEnabled = false
    system.settings.appearance.hapticFeedbackEnabled = false
    orchestrator.reconcileCalendarSnapshot([event], { now: NOW })

    const runtime = startAgendaJourneyRuntime({
      pinia: null,
      windowRef: createWindowRef(),
      now: () => NOW,
    })
    await runtime.reconcile()

    expect(agenda.journeys).toHaveLength(1)
    expect(agenda.journeys[0].status).toBe('missed')
    expect(orchestrator.pendingDeadlineEvaluationRequests).toEqual([])
    runtime.stop()
  })

  test('rolls back a notification marker and leaves materialization retryable when System persistence fails', async () => {
    const event = writeCalendarSnapshot({ id: 'calendar_event_notification_rollback' })
    const orchestrator = useScheduleOrchestratorStore()
    const agenda = useAgendaJourneyStore()
    const system = useSystemStore()
    await vi.waitFor(() => {
      expect(orchestrator.hasFinishedStorageHydration).toBe(true)
      expect(agenda.hasFinishedStorageHydration).toBe(true)
      expect(system.hasFinishedStorageHydration).toBe(true)
    })
    system.settings.appearance.soundEffectsEnabled = false
    system.settings.appearance.hapticFeedbackEnabled = false
    orchestrator.reconcileCalendarSnapshot([event], { now: NOW })
    const saveSpy = vi.spyOn(system, 'saveNow').mockReturnValue({
      ok: false,
      error: 'forced_notification_write_failure',
    })
    const runtime = startAgendaJourneyRuntime({
      pinia: null,
      windowRef: createWindowRef(),
      now: () => NOW,
    })

    const failed = await runtime.reconcile()
    expect(failed).toMatchObject({ materialized: 0, agendaJourneyCount: 1 })
    expect(system.notifications).toEqual([])
    expect(agenda.journeys[0].executionNotificationId).toBe('')
    expect(orchestrator.pendingMaterializationRequests).toHaveLength(1)
    expect(orchestrator.records[0].materializationBlockedCode).toBe(
      'agenda_notification_persistence_failed',
    )

    saveSpy.mockRestore()
    const retried = await runtime.reconcile()
    expect(retried).toMatchObject({ materialized: 1 })
    expect(system.notifications).toHaveLength(1)
    expect(orchestrator.pendingMaterializationRequests).toEqual([])
    runtime.stop()
  })
})
