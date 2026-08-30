import { describe, expect, test } from 'vitest'
import {
  createCalendarOccurrenceFingerprint,
  createScheduleLogicalExecutionKey,
  createScheduleOrchestrationId,
  reconcileScheduleOrchestration,
} from '../src/lib/schedule-orchestrator'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const NOW = new Date('2026-08-16T03:00:00.000Z').getTime()

const createEvent = (patch = {}) => ({
  id: 'calendar_event_rehearsal',
  status: 'confirmed',
  titleZh: '回归排练',
  titleEn: 'Comeback rehearsal',
  startsAt: NOW + 6 * HOUR_MS,
  endsAt: NOW + 8 * HOUR_MS,
  allDay: false,
  recurrence: 'none',
  recurrenceUntil: 0,
  requirement: 'required',
  reminderLeadMinutes: 30,
  locationRef: {
    owner: 'map',
    mapPackId: 'seoul-v1',
    placeId: 'practice-room',
    labelZh: '练习室',
  },
  updatedAt: NOW - HOUR_MS,
  ...patch,
})

describe('Schedule Orchestrator pure interface', () => {
  test('creates stable occurrence IDs and fingerprints without persisting copied display records', () => {
    const event = createEvent()
    const id = createScheduleOrchestrationId(event.id, event.startsAt)
    const fingerprint = createCalendarOccurrenceFingerprint(event)

    expect(id).toBe(`schedule_orchestration::${event.id}::${event.startsAt}`)
    expect(createScheduleOrchestrationId(event.id, event.startsAt)).toBe(id)
    expect(createScheduleLogicalExecutionKey(event.id, event.startsAt, 'none')).toBe(
      `calendar_event::${event.id}::one_off`,
    )
    expect(fingerprint).toMatch(/^[a-f0-9]{16}$/)
    expect(createCalendarOccurrenceFingerprint({ ...event, locationRef: { ...event.locationRef, labelZh: '其他显示名' } })).toBe(
      fingerprint,
    )
    expect(createCalendarOccurrenceFingerprint({ ...event, titleZh: '舞台彩排' })).not.toBe(
      fingerprint,
    )
  })

  test('materializes the same occurrence idempotently and separates recurring occurrences', () => {
    const recurring = createEvent({
      id: 'calendar_event_daily_training',
      recurrence: 'daily',
      recurrenceUntil: NOW + 3 * DAY_MS,
      startsAt: NOW - 2 * HOUR_MS,
      endsAt: NOW - HOUR_MS,
    })
    const first = reconcileScheduleOrchestration({
      calendarEvents: [recurring],
      now: NOW,
      config: { materializationLeadMs: 2 * DAY_MS },
    })
    const reopened = reconcileScheduleOrchestration({
      calendarEvents: [recurring],
      existingRecords: first.records,
      now: NOW + 5 * 60_000,
      config: { materializationLeadMs: 2 * DAY_MS },
    })

    expect(first.records).toHaveLength(3)
    expect(new Set(first.records.map((record) => record.id)).size).toBe(3)
    expect(reopened.records).toHaveLength(3)
    expect(reopened.records.map((record) => record.materializationRequestedAt)).toEqual(
      first.records.map((record) => record.materializationRequestedAt),
    )
    expect(reopened.materializationRequestCount).toBe(3)
  })

  test('keeps one orchestration decision for one multi-day occurrence', () => {
    const multiDay = createEvent({
      id: 'calendar_event_concert_weekend',
      startsAt: NOW - DAY_MS,
      endsAt: NOW + 2 * DAY_MS,
      allDay: false,
    })
    const result = reconcileScheduleOrchestration({
      calendarEvents: [multiDay],
      now: NOW,
      config: { materializationLeadMs: DAY_MS },
    })

    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      sourceCalendarEventId: multiDay.id,
      occurrenceStartsAt: multiDay.startsAt,
      occurrenceEndsAt: multiDay.endsAt,
    })
  })

  test('refreshes a changed occurrence and retires replaced or removed Calendar sources', () => {
    const event = createEvent()
    const first = reconcileScheduleOrchestration({ calendarEvents: [event], now: NOW })
    const changed = createEvent({ titleZh: '舞台彩排', updatedAt: NOW })
    const refreshed = reconcileScheduleOrchestration({
      calendarEvents: [changed],
      existingRecords: first.records,
      now: NOW + 60_000,
    })

    expect(refreshed.records).toHaveLength(1)
    expect(refreshed.records[0].calendarFingerprint).not.toBe(
      first.records[0].calendarFingerprint,
    )
    expect(refreshed.records[0].materializationRequestedAt).toBe(NOW + 60_000)

    const rescheduledEvent = createEvent({
      startsAt: event.startsAt + DAY_MS,
      endsAt: event.endsAt + DAY_MS,
      updatedAt: NOW + 2 * 60_000,
    })
    const rescheduled = reconcileScheduleOrchestration({
      calendarEvents: [rescheduledEvent],
      existingRecords: refreshed.records,
      now: NOW + 2 * 60_000,
      config: { materializationLeadMs: 2 * DAY_MS },
    })
    expect(rescheduled.records).toHaveLength(1)
    expect(rescheduled.records[0]).toMatchObject({
      id: first.records[0].id,
      logicalExecutionKey: `calendar_event::${event.id}::one_off`,
      occurrenceStartsAt: rescheduledEvent.startsAt,
      retiredAt: 0,
    })

    const removed = reconcileScheduleOrchestration({
      calendarEvents: [],
      existingRecords: rescheduled.records,
      now: NOW + 3 * 60_000,
    })
    expect(removed.records.filter((record) => !record.retiredAt)).toHaveLength(0)
    expect(removed.records.every((record) => record.retirementReason)).toBe(true)
  })

  test('changes the fingerprint when Calendar source lineage changes', () => {
    const event = createEvent({
      sourceRef: {
        sourceOwner: 'workplace',
        sourceRecordId: 'proposal-change',
        sourceRevision: 'package:r2:proposal-change:r1',
        sourceReturnContext: { path: '/workplace', query: { section: 'work' } },
        previousSourceRefs: [{
          sourceOwner: 'workplace',
          sourceRecordId: 'proposal-original',
          sourceRevision: 'package:r1:proposal-original:r1',
        }],
      },
    })
    expect(createCalendarOccurrenceFingerprint({
      ...event,
      sourceRef: {
        ...event.sourceRef,
        sourceRevision: 'package:r3:proposal-change:r1',
      },
    })).not.toBe(createCalendarOccurrenceFingerprint(event))
  })

  test('requests an overdue required deadline once and reopens without duplicating it', () => {
    const overdue = createEvent({
      startsAt: NOW - 3 * HOUR_MS,
      endsAt: NOW - HOUR_MS,
      requirement: 'required',
    })
    const first = reconcileScheduleOrchestration({ calendarEvents: [overdue], now: NOW })
    const reopened = reconcileScheduleOrchestration({
      calendarEvents: [overdue],
      existingRecords: first.records,
      now: NOW + 2 * HOUR_MS,
    })

    expect(first.deadlineEvaluationRequestCount).toBe(1)
    expect(reopened.deadlineEvaluationRequestCount).toBe(1)
    expect(reopened.records[0].deadlineEvaluationRequestedAt).toBe(
      first.records[0].deadlineEvaluationRequestedAt,
    )

    const optional = reconcileScheduleOrchestration({
      calendarEvents: [{ ...overdue, requirement: 'optional', updatedAt: NOW + HOUR_MS }],
      existingRecords: reopened.records,
      now: NOW + 3 * HOUR_MS,
    })
    expect(optional.deadlineEvaluationRequestCount).toBe(0)
  })
})
