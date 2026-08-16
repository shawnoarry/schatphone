import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAgendaJourneyStore } from '../src/stores/agendaJourney'

const NOW = new Date('2026-08-16T09:00:00+08:00').getTime()
const HOUR_MS = 60 * 60 * 1000

describe('Agenda Journey store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('persists a near-term manual plan and restores older backups without the owner as empty', async () => {
    const store = useAgendaJourneyStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))

    expect(
      store.createManualPlan(
        {
          title: '超出近期范围',
          startsAt: NOW + 20 * 24 * HOUR_MS,
          endsAt: NOW + 20 * 24 * HOUR_MS + HOUR_MS,
        },
        { now: NOW },
      ),
    ).toMatchObject({ ok: false, code: 'MANUAL_AGENDA_JOURNEY_OUTSIDE_HORIZON' })

    const created = store.createManualPlan(
      {
        title: '准备直播提纲',
        startsAt: NOW + HOUR_MS,
        endsAt: NOW + 2 * HOUR_MS,
      },
      { now: NOW },
    )
    expect(created.ok).toBe(true)
    store.saveNow()

    setActivePinia(createPinia())
    const reopened = useAgendaJourneyStore()
    expect(reopened.findJourneyById(created.journey.id)?.titleZh).toBe('准备直播提纲')

    expect(reopened.restoreFromBackup({ calendar: { events: [] } })).toBe(true)
    expect(reopened.journeys).toEqual([])
  })

  test('links and reconciles Map evidence while leaving activity completion user-owned', async () => {
    const store = useAgendaJourneyStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    const created = store.createManualPlan(
      {
        title: '录音棚会面',
        startsAt: NOW + HOUR_MS,
        endsAt: NOW + 2 * HOUR_MS,
        locationRef: {
          mapPackId: 'real-seoul-v1',
          placeId: 'seoul-sm-hq',
          labelZh: 'SM 娱乐总部',
          labelEn: 'SM Entertainment HQ',
        },
      },
      { now: NOW },
    )
    const travel = created.journey.steps[0]

    const linked = store.linkMapJourney(
      created.journey.id,
      travel.id,
      { ok: true, journeyId: 'map_journey_store', transportMode: 'walk' },
      { now: NOW + 1000 },
    )
    expect(linked.ok).toBe(true)

    expect(
      store.reconcileMapEvidence({
        mapJourneyHistory: [
          {
            status: 'arrived',
            journeyId: 'map_journey_store',
            sourceAgendaJourneyStepId: travel.id,
            endedAt: NOW + 45 * 60_000,
          },
        ],
        now: NOW + 45 * 60_000,
      }),
    ).toBe(1)

    const arrived = store.findJourneyById(created.journey.id)
    expect(arrived.steps[0].status).toBe('completed')
    expect(arrived.steps[1].status).toBe('available')
    expect(arrived.status).not.toBe('completed')
  })
})
