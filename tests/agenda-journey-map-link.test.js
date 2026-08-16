import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../src/stores/map'

const NOW = new Date('2026-08-16T09:00:00+08:00').getTime()

const locationRef = {
  owner: 'map',
  mapPackId: 'real-seoul-v1',
  placeId: 'seoul-sm-hq',
  labelZh: 'SM 娱乐总部',
  labelEn: 'SM Entertainment HQ',
}

describe('Agenda Journey to Map Journey ownership link', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    useMapStore().resetTripRuntimeForTesting()
    vi.useRealTimers()
  })

  test('creates and reuses one Map Journey for one Agenda Journey travel step', () => {
    const store = useMapStore()
    const input = {
      agendaJourneyStepId: 'aj::manual::stage-rehearsal::travel',
      startsAt: NOW + 45 * 60_000,
      locationRef,
      transportMode: 'public_transit',
      now: NOW,
    }

    const first = store.startScheduledTravel(input)
    const second = store.startScheduledTravel(input)

    expect(first).toMatchObject({
      ok: true,
      code: 'SCHEDULED_TRIP_STARTED',
      reused: false,
      sourceAgendaJourneyStepId: input.agendaJourneyStepId,
    })
    expect(second).toMatchObject({
      ok: true,
      code: 'SCHEDULED_TRIP_REUSED',
      reused: true,
      journeyId: first.journeyId,
      sourceAgendaJourneyStepId: input.agendaJourneyStepId,
    })
    expect(store.tripState).toMatchObject({
      journeyId: first.journeyId,
      sourceAgendaJourneyStepId: input.agendaJourneyStepId,
      destinationPlaceId: locationRef.placeId,
    })
  })

  test('preserves the Agenda Journey step reference through arrival history and backup restore', () => {
    const store = useMapStore()
    const sourceAgendaJourneyStepId = 'aj::calendar::music-show::travel'
    const started = store.startScheduledTravel({
      calendarEventId: 'calendar_event_music_show',
      agendaJourneyStepId: sourceAgendaJourneyStepId,
      startsAt: NOW + 60 * 60_000,
      locationRef,
      transportMode: 'hired_vehicle',
      now: NOW,
    })

    expect(started.ok).toBe(true)
    vi.advanceTimersByTime(store.tripState.durationSeconds * 1000 + 1000)

    expect(store.tripState).toMatchObject({
      status: 'arrived',
      sourceAgendaJourneyStepId,
    })
    expect(store.tripHistory[0]).toMatchObject({
      status: 'arrived',
      journeyId: started.journeyId,
      sourceCalendarEventId: 'calendar_event_music_show',
      sourceAgendaJourneyStepId,
    })

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restored = useMapStore()
    expect(restored.restoreFromBackup(snapshot)).toBe(true)
    expect(restored.tripState.sourceAgendaJourneyStepId).toBe(sourceAgendaJourneyStepId)
    expect(restored.tripHistory[0].sourceAgendaJourneyStepId).toBe(sourceAgendaJourneyStepId)
  })
})
