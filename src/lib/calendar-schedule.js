const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_DURATION_MS = 60 * 60 * 1000
const OCCURRENCE_LIMIT = 840

export const CALENDAR_VIEW_MODES = Object.freeze(['month', 'week', 'agenda'])
export const CALENDAR_RECURRENCE_RULES = Object.freeze([
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
])
export const CALENDAR_REQUIREMENTS = Object.freeze(['required', 'optional'])

const toTimestamp = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback
}

export const normalizeCalendarViewMode = (value, fallback = 'month') =>
  CALENDAR_VIEW_MODES.includes(value) ? value : fallback

export const normalizeCalendarRecurrence = (value, fallback = 'none') =>
  CALENDAR_RECURRENCE_RULES.includes(value) ? value : fallback

export const normalizeCalendarRequirement = (value, fallback = 'required') =>
  CALENDAR_REQUIREMENTS.includes(value) ? value : fallback

export const normalizeCalendarReminderLeadMinutes = (value, fallback = 0) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(43_200, Math.max(0, Math.trunc(parsed)))
}

export const startOfCalendarDay = (value = Date.now()) => {
  const date = new Date(toTimestamp(value, Date.now()))
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export const addCalendarDays = (value, amount = 0) => {
  const date = new Date(toTimestamp(value, Date.now()))
  date.setDate(date.getDate() + Math.trunc(Number(amount) || 0))
  return date.getTime()
}

export const endOfCalendarDay = (value = Date.now()) =>
  addCalendarDays(startOfCalendarDay(value), 1) - 1

export const startOfCalendarWeek = (value = Date.now()) => {
  const dayStart = startOfCalendarDay(value)
  const date = new Date(dayStart)
  const mondayOffset = (date.getDay() + 6) % 7
  return addCalendarDays(dayStart, -mondayOffset)
}

export const startOfCalendarMonth = (value = Date.now()) => {
  const date = new Date(toTimestamp(value, Date.now()))
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export const addCalendarMonths = (value, amount = 0) => {
  const source = new Date(toTimestamp(value, Date.now()))
  const day = source.getDate()
  const next = new Date(source)
  next.setDate(1)
  next.setMonth(next.getMonth() + Math.trunc(Number(amount) || 0))
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return next.getTime()
}

export const isSameCalendarDay = (left, right) =>
  startOfCalendarDay(left) === startOfCalendarDay(right)

export const getCalendarEventDurationMs = (event = {}) => {
  const startsAt = toTimestamp(event.startsAt, 0)
  const endsAt = toTimestamp(event.endsAt, 0)
  if (startsAt && endsAt > startsAt) return endsAt - startsAt
  return event.allDay === true ? DAY_MS : DEFAULT_DURATION_MS
}

export const getCalendarAllDaySpanDays = (event = {}) => {
  const startsAt = toTimestamp(event.startsAt, 0)
  const endsAt = toTimestamp(event.endsAt, 0)
  if (!startsAt || endsAt <= startsAt) return 1
  const startDate = new Date(startOfCalendarDay(startsAt))
  const endDate = new Date(startOfCalendarDay(Math.max(startsAt, endsAt - 1)))
  const startOrdinal = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  )
  const endOrdinal = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  return Math.max(1, Math.round((endOrdinal - startOrdinal) / DAY_MS) + 1)
}

export const getCalendarEventEndForStart = (event = {}, startsAt = 0) => {
  const normalizedStartsAt = toTimestamp(startsAt, 0)
  if (!normalizedStartsAt) return 0
  if (event.allDay === true) {
    return addCalendarDays(normalizedStartsAt, getCalendarAllDaySpanDays(event))
  }
  return normalizedStartsAt + getCalendarEventDurationMs(event)
}

export const getCalendarEventReminderAt = (event = {}) => {
  const startsAt = toTimestamp(event.startsAt, 0)
  if (!startsAt) return 0
  return Math.max(
    0,
    startsAt - normalizeCalendarReminderLeadMinutes(event.reminderLeadMinutes, 0) * 60_000,
  )
}

export const getCalendarViewRange = ({ viewMode = 'month', anchorAt = Date.now() } = {}) => {
  const normalizedView = normalizeCalendarViewMode(viewMode)
  if (normalizedView === 'week') {
    const rangeStart = startOfCalendarWeek(anchorAt)
    return { rangeStart, rangeEnd: addCalendarDays(rangeStart, 7) }
  }
  if (normalizedView === 'agenda') {
    const rangeStart = startOfCalendarMonth(anchorAt)
    return { rangeStart, rangeEnd: addCalendarMonths(rangeStart, 1) }
  }
  const days = buildCalendarMonthDays(anchorAt)
  return {
    rangeStart: days[0].startsAt,
    rangeEnd: days[days.length - 1].endsAt,
  }
}

const getRecurrenceStartIndex = (startsAt, rangeStart, recurrence) => {
  if (rangeStart <= startsAt) return 0
  if (recurrence === 'daily') return Math.max(0, Math.floor((rangeStart - startsAt) / DAY_MS) - 2)
  if (recurrence === 'weekly') {
    return Math.max(0, Math.floor((rangeStart - startsAt) / (7 * DAY_MS)) - 2)
  }
  const startDate = new Date(startsAt)
  const rangeDate = new Date(rangeStart)
  if (recurrence === 'monthly') {
    return Math.max(
      0,
      (rangeDate.getFullYear() - startDate.getFullYear()) * 12 +
        rangeDate.getMonth() -
        startDate.getMonth() -
        2,
    )
  }
  if (recurrence === 'yearly') {
    return Math.max(0, rangeDate.getFullYear() - startDate.getFullYear() - 2)
  }
  return 0
}

const addRecurrence = (startsAt, recurrence, index) => {
  if (index <= 0 || recurrence === 'none') return startsAt
  if (recurrence === 'daily') return addCalendarDays(startsAt, index)
  if (recurrence === 'weekly') return addCalendarDays(startsAt, index * 7)
  if (recurrence === 'monthly') return addCalendarMonths(startsAt, index)
  if (recurrence === 'yearly') return addCalendarMonths(startsAt, index * 12)
  return startsAt
}

export const getNextCalendarEventReminderAt = (event = {}, now = Date.now()) => {
  const baseStartsAt = toTimestamp(event.startsAt, 0)
  if (!baseStartsAt) return 0
  const leadMs = normalizeCalendarReminderLeadMinutes(event.reminderLeadMinutes, 0) * 60_000
  const recurrence = normalizeCalendarRecurrence(event.recurrence)
  const current = toTimestamp(now, Date.now())
  const baseReminderAt = Math.max(0, baseStartsAt - leadMs)
  if (recurrence === 'none' || baseReminderAt >= current) return baseReminderAt

  const recurrenceUntil = toTimestamp(event.recurrenceUntil, 0)
  const firstIndex = getRecurrenceStartIndex(baseStartsAt, current + leadMs, recurrence)
  for (let index = firstIndex; index < OCCURRENCE_LIMIT; index += 1) {
    const occurrenceStartsAt = addRecurrence(baseStartsAt, recurrence, index)
    if (recurrenceUntil && occurrenceStartsAt > recurrenceUntil) return 0
    const reminderAt = Math.max(0, occurrenceStartsAt - leadMs)
    if (reminderAt >= current) return reminderAt
  }
  return 0
}

const occurrenceFor = (event, startsAt, endsAt, index) => ({
  ...event,
  sourceEventId: event.id,
  sourceStartsAt: event.startsAt,
  sourceEndsAt: event.endsAt,
  occurrenceId: `${event.id}::${startsAt}`,
  occurrenceIndex: index,
  startsAt,
  endsAt,
  isRecurring: normalizeCalendarRecurrence(event.recurrence) !== 'none',
  isMultiDay: startOfCalendarDay(startsAt) !== startOfCalendarDay(Math.max(startsAt, endsAt - 1)),
})

export const expandCalendarEventOccurrences = ({
  events = [],
  rangeStart = 0,
  rangeEnd = 0,
  limit = OCCURRENCE_LIMIT,
} = {}) => {
  const start = toTimestamp(rangeStart, 0)
  const end = toTimestamp(rangeEnd, 0)
  if (!start || !end || end <= start || !Array.isArray(events)) return []

  const occurrences = []
  for (const event of events) {
    if (!event || event.status === 'cancelled') continue
    const baseStartsAt = toTimestamp(event.startsAt, 0)
    if (!baseStartsAt) continue
    const recurrence = normalizeCalendarRecurrence(event.recurrence)
    const recurrenceUntil = toTimestamp(event.recurrenceUntil, 0)
    const startIndex = getRecurrenceStartIndex(baseStartsAt, start, recurrence)

    for (let index = startIndex; index < OCCURRENCE_LIMIT; index += 1) {
      const occurrenceStartsAt = addRecurrence(baseStartsAt, recurrence, index)
      const occurrenceEndsAt = getCalendarEventEndForStart(event, occurrenceStartsAt)
      if (recurrenceUntil && occurrenceStartsAt > recurrenceUntil) break
      if (occurrenceStartsAt >= end) break
      if (occurrenceEndsAt > start) {
        occurrences.push(occurrenceFor(event, occurrenceStartsAt, occurrenceEndsAt, index))
      }
      if (recurrence === 'none' || occurrences.length >= limit) break
    }
    if (occurrences.length >= limit) break
  }

  return occurrences.sort((left, right) => {
    if (left.startsAt !== right.startsAt) return left.startsAt - right.startsAt
    if (left.allDay !== right.allDay) return left.allDay ? -1 : 1
    return String(left.titleZh || left.titleEn || '').localeCompare(
      String(right.titleZh || right.titleEn || ''),
    )
  })
}

export const buildCalendarMonthDays = (anchorAt = Date.now()) => {
  const firstOfMonth = startOfCalendarMonth(anchorAt)
  const gridStart = startOfCalendarWeek(firstOfMonth)
  return Array.from({ length: 42 }, (_, index) => {
    const startsAt = addCalendarDays(gridStart, index)
    return {
      startsAt,
      endsAt: addCalendarDays(startsAt, 1),
      dayOfMonth: new Date(startsAt).getDate(),
      inCurrentMonth: new Date(startsAt).getMonth() === new Date(firstOfMonth).getMonth(),
    }
  })
}

export const buildCalendarWeekDays = (anchorAt = Date.now()) => {
  const weekStart = startOfCalendarWeek(anchorAt)
  return Array.from({ length: 7 }, (_, index) => {
    const startsAt = addCalendarDays(weekStart, index)
    return {
      startsAt,
      endsAt: addCalendarDays(startsAt, 1),
      dayOfMonth: new Date(startsAt).getDate(),
    }
  })
}

export const calendarOccurrencesForDay = (occurrences = [], dayStartsAt = Date.now()) => {
  const startsAt = startOfCalendarDay(dayStartsAt)
  const endsAt = addCalendarDays(startsAt, 1)
  return occurrences.filter(
    (occurrence) => occurrence.startsAt < endsAt && occurrence.endsAt > startsAt,
  )
}

export const getCalendarOccurrenceDayPosition = (occurrence = {}, dayStartsAt = Date.now()) => {
  const dayStart = startOfCalendarDay(dayStartsAt)
  const firstDay = startOfCalendarDay(occurrence.startsAt)
  const lastDay = startOfCalendarDay(
    Math.max(toTimestamp(occurrence.startsAt, 0), toTimestamp(occurrence.endsAt, 0) - 1),
  )
  return {
    isFirstDay: dayStart === firstDay,
    isLastDay: dayStart === lastDay,
    isMiddleDay: dayStart > firstDay && dayStart < lastDay,
  }
}

export const groupCalendarOccurrencesByDay = (occurrences = []) => {
  const groups = new Map()
  occurrences.forEach((occurrence) => {
    let cursor = startOfCalendarDay(occurrence.startsAt)
    const lastDay = startOfCalendarDay(Math.max(occurrence.startsAt, occurrence.endsAt - 1))
    while (cursor <= lastDay) {
      const key = String(cursor)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(occurrence)
      cursor = addCalendarDays(cursor, 1)
    }
  })
  return groups
}
