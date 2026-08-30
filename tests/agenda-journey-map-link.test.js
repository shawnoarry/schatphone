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
      agendaJourneyId: 'aj::manual::stage-rehearsal',
      agendaJourneyStepId: 'aj::manual::stage-rehearsal::travel',
      agendaExecutionRevision: 'agenda-revision-1',
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
      sourceAgendaExecutionRevision: input.agendaExecutionRevision,
    })
    expect(second).toMatchObject({
      ok: true,
      code: 'SCHEDULED_TRIP_REUSED',
      reused: true,
      journeyId: first.journeyId,
      sourceAgendaJourneyStepId: input.agendaJourneyStepId,
      sourceAgendaExecutionRevision: input.agendaExecutionRevision,
    })
    expect(store.tripState).toMatchObject({
      journeyId: first.journeyId,
      sourceAgendaJourneyStepId: input.agendaJourneyStepId,
      sourceAgendaExecutionRevision: input.agendaExecutionRevision,
      destinationPlaceId: locationRef.placeId,
    })
  })

  test('rejects reuse from a stale Agenda execution revision', () => {
    const store = useMapStore()
    const input = {
      agendaJourneyId: 'aj::calendar::revisioned',
      agendaJourneyStepId: 'aj::calendar::revisioned::travel',
      agendaExecutionRevision: 'calendar-fingerprint-v1',
      startsAt: NOW + 45 * 60_000,
      locationRef,
      transportMode: 'public_transit',
      now: NOW,
    }
    expect(store.startScheduledTravel(input).ok).toBe(true)
    expect(store.startScheduledTravel({
      ...input,
      agendaExecutionRevision: 'calendar-fingerprint-v2',
    })).toMatchObject({
      ok: false,
      code: 'SCHEDULED_TRIP_SOURCE_REVISION_CONFLICT',
    })
  })

  test('preserves the Agenda Journey step reference through arrival history and backup restore', () => {
    const store = useMapStore()
    const sourceAgendaJourneyStepId = 'aj::calendar::music-show::travel'
    const started = store.startScheduledTravel({
      calendarEventId: 'calendar_event_music_show',
      agendaJourneyId: 'aj::calendar::music-show',
      agendaJourneyStepId: sourceAgendaJourneyStepId,
      agendaExecutionRevision: 'music-show-v1',
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
      sourceAgendaExecutionRevision: 'music-show-v1',
    })
    expect(store.tripHistory[0]).toMatchObject({
      status: 'arrived',
      journeyId: started.journeyId,
      sourceCalendarEventId: 'calendar_event_music_show',
      sourceAgendaJourneyStepId,
      sourceAgendaExecutionRevision: 'music-show-v1',
    })

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restored = useMapStore()
    expect(restored.restoreFromBackup(snapshot)).toBe(true)
    expect(restored.tripState.sourceAgendaJourneyStepId).toBe(sourceAgendaJourneyStepId)
    expect(restored.tripHistory[0].sourceAgendaJourneyStepId).toBe(sourceAgendaJourneyStepId)
  })
})
