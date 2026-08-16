import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { startAgendaJourneyRuntime } from '../src/lib/agenda-journey-runtime'
import { useAgendaJourneyStore } from '../src/stores/agendaJourney'
import { useScheduleOrchestratorStore } from '../src/stores/scheduleOrchestrator'

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
    JSON.stringify({ version: 3, savedAt: NOW, data: { events: [event] } }),
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
    await vi.waitFor(() => {
      expect(orchestrator.hasFinishedStorageHydration).toBe(true)
      expect(agenda.hasFinishedStorageHydration).toBe(true)
    })
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
    runtime.stop()
  })

  test('evaluates required deadlines after materialization without creating a second journey', async () => {
    const event = writeCalendarSnapshot({
      startsAt: NOW - 2 * HOUR_MS,
      endsAt: NOW - HOUR_MS,
    })
    const orchestrator = useScheduleOrchestratorStore()
    const agenda = useAgendaJourneyStore()
    await vi.waitFor(() => {
      expect(orchestrator.hasFinishedStorageHydration).toBe(true)
      expect(agenda.hasFinishedStorageHydration).toBe(true)
    })
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
})
