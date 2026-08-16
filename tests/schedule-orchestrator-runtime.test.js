import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { notifyScheduleOrchestratorCalendarChanged } from '../src/lib/schedule-orchestrator-calendar-signal'
import { startScheduleOrchestratorRuntime } from '../src/lib/schedule-orchestrator-runtime'
import { useScheduleOrchestratorStore } from '../src/stores/scheduleOrchestrator'

const NOW = new Date('2026-08-16T03:00:00.000Z').getTime()
const HOUR_MS = 60 * 60 * 1000

const writeCalendarSnapshot = (patch = {}) => {
  const event = {
    id: 'calendar_event_runtime_rehearsal',
    status: 'confirmed',
    titleZh: '运行时排练',
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

describe('Schedule Orchestrator runtime', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('reads the persisted Calendar snapshot and refreshes after the lightweight change signal', async () => {
    const event = writeCalendarSnapshot()
    const store = useScheduleOrchestratorStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    const windowRef = {
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      document: {
        visibilityState: 'visible',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    }
    const runtime = startScheduleOrchestratorRuntime({
      pinia: null,
      windowRef,
      now: () => NOW,
    })

    await runtime.reconcile()
    expect(store.records).toHaveLength(1)
    const firstFingerprint = store.records[0].calendarFingerprint

    writeCalendarSnapshot({ ...event, titleZh: '更新后的运行时排练', updatedAt: NOW })
    notifyScheduleOrchestratorCalendarChanged()
    await vi.waitFor(() =>
      expect(store.records[0].calendarFingerprint).not.toBe(firstFingerprint),
    )

    expect(store.pendingMaterializationRequests).toHaveLength(1)
    runtime.stop()
    expect(windowRef.removeEventListener).toHaveBeenCalledWith('pageshow', expect.any(Function))
  })
})
