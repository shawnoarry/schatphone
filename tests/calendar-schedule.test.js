import { describe, expect, test } from 'vitest'
import {
  addCalendarDays,
  addCalendarMonths,
  buildCalendarMonthDays,
  calendarOccurrencesForDay,
  expandCalendarEventOccurrences,
  getCalendarOccurrenceDayPosition,
  getCalendarViewRange,
  getNextCalendarEventReminderAt,
  startOfCalendarDay,
} from '../src/lib/calendar-schedule'

const localTime = (year, month, day, hour = 0, minute = 0) =>
  new Date(year, month - 1, day, hour, minute, 0, 0).getTime()

describe('calendar schedule projections', () => {
  test('builds Monday-first 42-day month and bounded week/agenda ranges', () => {
    const anchorAt = localTime(2026, 8, 15, 12)
    const days = buildCalendarMonthDays(anchorAt)
    const monthRange = getCalendarViewRange({ viewMode: 'month', anchorAt })
    const weekRange = getCalendarViewRange({ viewMode: 'week', anchorAt })
    const agendaRange = getCalendarViewRange({ viewMode: 'agenda', anchorAt })

    expect(days).toHaveLength(42)
    expect(new Date(days[0].startsAt).getDay()).toBe(1)
    expect(monthRange).toEqual({
      rangeStart: days[0].startsAt,
      rangeEnd: days[41].endsAt,
    })
    expect(weekRange.rangeEnd).toBe(addCalendarDays(weekRange.rangeStart, 7))
    expect(agendaRange.rangeEnd).toBe(addCalendarMonths(agendaRange.rangeStart, 1))
  })

  test('expands recurring events without copying source identity', () => {
    const startsAt = localTime(2026, 8, 3, 9)
    const endsAt = localTime(2026, 8, 3, 10, 30)
    const occurrences = expandCalendarEventOccurrences({
      events: [
        {
          id: 'calendar_event_weekly_rehearsal',
          titleZh: '排练',
          startsAt,
          endsAt,
          recurrence: 'weekly',
          recurrenceUntil: localTime(2026, 8, 24, 23, 59),
          status: 'confirmed',
        },
      ],
      rangeStart: localTime(2026, 8, 1),
      rangeEnd: localTime(2026, 9, 1),
    })

    expect(occurrences.map((item) => new Date(item.startsAt).getDate())).toEqual([3, 10, 17, 24])
    expect(occurrences.every((item) => item.sourceEventId === 'calendar_event_weekly_rehearsal')).toBe(true)
    expect(occurrences.map((item) => item.occurrenceId)).toEqual([
      `calendar_event_weekly_rehearsal::${localTime(2026, 8, 3, 9)}`,
      `calendar_event_weekly_rehearsal::${localTime(2026, 8, 10, 9)}`,
      `calendar_event_weekly_rehearsal::${localTime(2026, 8, 17, 9)}`,
      `calendar_event_weekly_rehearsal::${localTime(2026, 8, 24, 9)}`,
    ])
    expect(occurrences[0].endsAt - occurrences[0].startsAt).toBe(90 * 60_000)
  })

  test('projects multi-day all-day spans onto every covered calendar day', () => {
    const startsAt = localTime(2026, 8, 4)
    const endsAt = localTime(2026, 8, 8)
    const [occurrence] = expandCalendarEventOccurrences({
      events: [
        {
          id: 'calendar_event_concert_run',
          titleZh: '演唱会行程',
          startsAt,
          endsAt,
          allDay: true,
          recurrence: 'none',
          status: 'confirmed',
        },
      ],
      rangeStart: localTime(2026, 8, 1),
      rangeEnd: localTime(2026, 9, 1),
    })

    expect(occurrence.isMultiDay).toBe(true)
    expect(calendarOccurrencesForDay([occurrence], localTime(2026, 8, 4))).toHaveLength(1)
    expect(calendarOccurrencesForDay([occurrence], localTime(2026, 8, 7))).toHaveLength(1)
    expect(calendarOccurrencesForDay([occurrence], localTime(2026, 8, 8))).toHaveLength(0)
    expect(getCalendarOccurrenceDayPosition(occurrence, localTime(2026, 8, 4))).toMatchObject({
      isFirstDay: true,
      isLastDay: false,
    })
    expect(getCalendarOccurrenceDayPosition(occurrence, localTime(2026, 8, 6))).toMatchObject({
      isMiddleDay: true,
    })
    expect(getCalendarOccurrenceDayPosition(occurrence, localTime(2026, 8, 7))).toMatchObject({
      isFirstDay: false,
      isLastDay: true,
    })
  })

  test('uses local calendar month clamping and selects the next recurring reminder', () => {
    expect(addCalendarMonths(localTime(2026, 1, 31, 9), 1)).toBe(localTime(2026, 2, 28, 9))

    const event = {
      startsAt: localTime(2026, 8, 1, 9),
      endsAt: localTime(2026, 8, 1, 10),
      recurrence: 'daily',
      recurrenceUntil: localTime(2026, 8, 20, 23, 59),
      reminderLeadMinutes: 30,
    }
    expect(getNextCalendarEventReminderAt(event, localTime(2026, 8, 15, 8))).toBe(
      localTime(2026, 8, 15, 8, 30),
    )
    expect(getNextCalendarEventReminderAt(event, localTime(2026, 8, 15, 8, 45))).toBe(
      localTime(2026, 8, 16, 8, 30),
    )
    expect(getNextCalendarEventReminderAt(event, localTime(2026, 8, 21))).toBe(0)
    expect(startOfCalendarDay(event.startsAt)).toBe(localTime(2026, 8, 1))
  })
})
