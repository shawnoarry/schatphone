import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CALENDAR_DEPARTURE_READINESS_CODE,
  projectCalendarDepartureReadiness,
} from '../src/lib/calendar-departure-readiness'
import { migrateCalendarStorage, useCalendarStore } from '../src/stores/calendar'
import { useMapStore } from '../src/stores/map'

const appointmentLocation = {
  owner: 'map',
  mapPackId: 'real-seoul-v1',
  placeId: 'seoul-sm-hq',
  labelZh: 'SM 娱乐总部',
  labelEn: 'SM Entertainment HQ',
}

describe('Calendar departure readiness projection', () => {
  test('reports predicted lateness without rewriting appointment truth', () => {
    const now = Date.UTC(2026, 7, 15, 1, 0)
    const startsAt = now + 20 * 60_000
    const projection = projectCalendarDepartureReadiness({
      now,
      startsAt,
      origin: {
        mapPackId: 'real-seoul-v1',
        placeId: 'address:1',
        labelZh: '超市',
        detail: '清潭超市',
        position: { kind: 'geo', lat: 37.52, lng: 127.04 },
        provenance: 'manual',
      },
      destination: {
        mapPackId: 'real-seoul-v1',
        placeId: 'seoul-sm-hq',
        labelZh: '工作室',
        detail: '城东工作室',
        position: { kind: 'geo', lat: 37.54, lng: 127.04 },
      },
      transportMode: 'public_transit',
      estimate: {
        estimateVersion: 1,
        transportMode: 'public_transit',
        distanceKm: 8,
        minutes: 30,
        durationSeconds: 1800,
        fare: 2400,
      },
    })

    expect(projection).toMatchObject({
      ready: true,
      code: CALENDAR_DEPARTURE_READINESS_CODE.READY,
      status: 'late',
      lateByMinutes: 10,
      predictedArrivalAt: now + 30 * 60_000,
      recommendedDepartureAt: startsAt - 30 * 60_000,
    })
    expect(startsAt).toBe(now + 20 * 60_000)
  })

  test('fails closed across map packs', () => {
    const projection = projectCalendarDepartureReadiness({
      startsAt: Date.now() + 60_000,
      origin: {
        mapPackId: 'real-seoul-v1',
        detail: 'Seoul',
        position: { kind: 'geo', lat: 37.5, lng: 127 },
      },
      destination: {
        mapPackId: 'cyber-wasteland-v1',
        placeId: 'waste-rust-foundry',
        detail: 'Rust Foundry',
        position: { kind: 'canvas', x: 0.2, y: 0.7 },
      },
      transportMode: 'walk',
      estimate: { transportMode: 'walk', minutes: 10, durationSeconds: 600 },
    })

    expect(projection).toMatchObject({
      ready: false,
      code: CALENDAR_DEPARTURE_READINESS_CODE.MAP_PACK_MISMATCH,
    })
  })
})

describe('Calendar and Map scheduled travel handoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T09:00:00+08:00'))
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    useMapStore().resetTripRuntimeForTesting()
    vi.useRealTimers()
  })

  test('migrates and persists a stable Map-owned appointment place reference', () => {
    const migrated = migrateCalendarStorage({
      version: 1,
      data: {
        events: [
          {
            id: 'calendar_event_studio',
            titleZh: '练习',
            startsAt: Date.now() + 60 * 60_000,
            destinationRef: appointmentLocation,
          },
        ],
      },
    })
    expect(migrated.events[0].locationRef).toMatchObject(appointmentLocation)

    const calendarStore = useCalendarStore()
    const event = calendarStore.upsertEvent(migrated.events[0])
    calendarStore.saveNow()
    expect(event.locationRef).toMatchObject(appointmentLocation)

    setActivePinia(createPinia())
    expect(useCalendarStore().findEventById(event.id)?.locationRef).toMatchObject(appointmentLocation)
  })

  test('recalculates from the current position and selected transport mode', () => {
    const mapStore = useMapStore()
    const startsAt = Date.now() + 45 * 60_000

    const fromHome = mapStore.getScheduledTravelProjection({
      startsAt,
      locationRef: appointmentLocation,
      transportMode: 'public_transit',
      now: Date.now(),
    })
    const walking = mapStore.getScheduledTravelProjection({
      startsAt,
      locationRef: appointmentLocation,
      transportMode: 'walk',
      now: Date.now(),
    })

    mapStore.setCurrentLocationByAddressId(2)
    const fromCompany = mapStore.getScheduledTravelProjection({
      startsAt,
      locationRef: appointmentLocation,
      transportMode: 'public_transit',
      now: Date.now(),
    })

    expect(fromHome.ready).toBe(true)
    expect(walking.estimate.minutes).not.toBe(fromHome.estimate.minutes)
    expect(fromCompany.origin.labelZh).toBe('公司')
    expect(fromCompany.origin.provenance).toBe('manual')
    expect(fromCompany.estimate.minutes).not.toBe(fromHome.estimate.minutes)
  })

  test('supports fictional canvas anchors and fails closed for stale destinations', () => {
    const mapStore = useMapStore()
    expect(mapStore.setActiveMapPack('cyber-wasteland-v1')).toBe(true)
    const startsAt = Date.now() + 90 * 60_000
    const valid = mapStore.getScheduledTravelProjection({
      startsAt,
      locationRef: {
        mapPackId: 'cyber-wasteland-v1',
        placeId: 'waste-rust-foundry',
      },
      transportMode: 'hired_vehicle',
      now: Date.now(),
    })
    const stale = mapStore.getScheduledTravelProjection({
      startsAt,
      locationRef: {
        mapPackId: 'cyber-wasteland-v1',
        placeId: 'missing-place',
      },
      transportMode: 'hired_vehicle',
      now: Date.now(),
    })

    expect(valid).toMatchObject({
      ready: true,
      origin: { mapPackId: 'cyber-wasteland-v1' },
      destination: { placeId: 'waste-rust-foundry' },
    })
    expect(stale).toMatchObject({ ready: false, code: 'destination_stale' })
  })

  test('starts and reuses one canonical Map Journey from the latest position', () => {
    const mapStore = useMapStore()
    mapStore.setCurrentLocationByAddressId(2)
    const startsAt = Date.now() + 20 * 60_000
    const input = {
      calendarEventId: 'calendar_event_studio',
      startsAt,
      locationRef: appointmentLocation,
      transportMode: 'public_transit',
      now: Date.now(),
    }

    const first = mapStore.startScheduledTravel(input)
    const second = mapStore.startScheduledTravel(input)

    expect(first).toMatchObject({
      ok: true,
      code: 'SCHEDULED_TRIP_STARTED',
      reused: false,
      sourceCalendarEventId: input.calendarEventId,
    })
    expect(second).toMatchObject({
      ok: true,
      code: 'SCHEDULED_TRIP_REUSED',
      reused: true,
      journeyId: first.journeyId,
    })
    expect(mapStore.tripState).toMatchObject({
      journeyId: first.journeyId,
      sourceCalendarEventId: input.calendarEventId,
      fromLabel: '公司',
      destinationPlaceId: appointmentLocation.placeId,
    })
  })
})
