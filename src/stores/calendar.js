import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'

const CALENDAR_STORAGE_KEY = 'store:calendar'
const CALENDAR_STORAGE_VERSION = 1
const CALENDAR_EVENT_LIMIT = 120
const CALENDAR_EVENT_STATUS_CONFIRMED = 'confirmed'
const CALENDAR_EVENT_STATUS_CANCELLED = 'cancelled'
const CALENDAR_EVENT_STATUSES = new Set([
  CALENDAR_EVENT_STATUS_CONFIRMED,
  CALENDAR_EVENT_STATUS_CANCELLED,
])

const toInt = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

const trimLine = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeEventId = (value) => trimLine(value, '', 140)

const normalizeCalendarEventStatus = (value, fallback = CALENDAR_EVENT_STATUS_CONFIRMED) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (CALENDAR_EVENT_STATUSES.has(normalized)) return normalized
  return fallback
}

const createCalendarEventIdFromReminder = (reminderId) => {
  const normalizedReminderId = normalizeEventId(reminderId)
  return normalizedReminderId ? `calendar_event_${normalizedReminderId}` : ''
}

const normalizeCalendarEventRecord = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const startsAt = Math.max(0, toInt(raw.startsAt ?? raw.dueAt, 0))
  const id =
    normalizeEventId(raw.id) ||
    createCalendarEventIdFromReminder(raw.sourceReminderId) ||
    `calendar_event_legacy_${startsAt || Date.now()}_${index}`
  const titleEn = trimLine(raw.titleEn, '', 100)
  const titleZh = trimLine(raw.titleZh, titleEn || '日历事件', 100)
  if (!id || !titleZh) return null

  return {
    id,
    source: trimLine(raw.source, 'manual', 80),
    sourceReminderId: normalizeEventId(raw.sourceReminderId),
    sourceAreaId: normalizeEventId(raw.sourceAreaId || raw.areaId),
    titleZh,
    titleEn: titleEn || titleZh,
    summaryZh: trimLine(raw.summaryZh, '', 240),
    summaryEn: trimLine(raw.summaryEn, '', 240),
    startsAt,
    status: normalizeCalendarEventStatus(raw.status),
    pinned: raw.pinned === true,
    route: trimLine(raw.route, '', 120),
    icon: trimLine(raw.icon, 'fas fa-calendar-day', 80),
    tone: trimLine(raw.tone, 'blue', 40),
    createdAt: Math.max(0, toInt(raw.createdAt, 0)),
    updatedAt: Math.max(0, toInt(raw.updatedAt, 0)),
  }
}

const normalizeCalendarEvents = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => normalizeCalendarEventRecord(item, index))
    .filter(Boolean)
    .slice(0, CALENDAR_EVENT_LIMIT)
}

const sortCalendarEvents = (items = []) =>
  [...items].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === CALENDAR_EVENT_STATUS_CONFIRMED) return -1
      if (b.status === CALENDAR_EVENT_STATUS_CONFIRMED) return 1
    }
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.startsAt !== b.startsAt) return a.startsAt - b.startsAt
    return b.updatedAt - a.updatedAt
  })

export const useCalendarStore = defineStore('calendar', () => {
  const events = ref([])
  const hasFinishedStorageHydration = ref(false)

  const upcomingEvents = computed(() =>
    sortCalendarEvents(
      events.value.filter((event) => event.status === CALENDAR_EVENT_STATUS_CONFIRMED),
    ),
  )

  const eventCount = computed(() => events.value.length)

  const findEventById = (eventId) => {
    const id = normalizeEventId(eventId)
    if (!id) return null
    return events.value.find((event) => event.id === id) || null
  }

  const findEventBySourceReminderId = (reminderId) => {
    const sourceReminderId = normalizeEventId(reminderId)
    if (!sourceReminderId) return null
    return events.value.find((event) => event.sourceReminderId === sourceReminderId) || null
  }

  const upsertEvent = (rawEvent = {}) => {
    const now = Date.now()
    const normalized = normalizeCalendarEventRecord(
      {
        ...rawEvent,
        createdAt: rawEvent.createdAt || now,
        updatedAt: now,
      },
      events.value.length,
    )
    if (!normalized) return null

    const index = events.value.findIndex((event) => event.id === normalized.id)
    if (index >= 0) {
      const existing = events.value[index]
      events.value.splice(index, 1, {
        ...existing,
        ...normalized,
        createdAt: existing.createdAt || normalized.createdAt,
      })
    } else {
      events.value.unshift(normalized)
      if (events.value.length > CALENDAR_EVENT_LIMIT) {
        events.value.splice(CALENDAR_EVENT_LIMIT)
      }
    }
    return findEventById(normalized.id)
  }

  const upsertEventFromMapReminder = (reminder = {}) => {
    const reminderId = normalizeEventId(reminder.id)
    if (!reminderId) return null
    return upsertEvent({
      id: createCalendarEventIdFromReminder(reminderId),
      source: 'map_calendar_reminder',
      sourceReminderId: reminderId,
      sourceAreaId: reminder.areaId || '',
      titleZh: reminder.titleZh || '地图提醒',
      titleEn: reminder.titleEn || 'Map reminder',
      summaryZh: reminder.summaryZh || '',
      summaryEn: reminder.summaryEn || '',
      startsAt: reminder.dueAt,
      status: CALENDAR_EVENT_STATUS_CONFIRMED,
      pinned: reminder.pinned === true,
      route: reminder.route || '/map',
      icon: reminder.icon || 'fas fa-location-dot',
      tone: reminder.tone || 'blue',
    })
  }

  const removeEventBySourceReminderId = (reminderId) => {
    const sourceReminderId = normalizeEventId(reminderId)
    if (!sourceReminderId) return false
    const index = events.value.findIndex((event) => event.sourceReminderId === sourceReminderId)
    if (index < 0) return false
    events.value.splice(index, 1)
    return true
  }

  const setEventPinnedBySourceReminderId = (reminderId, pinned = true) => {
    const event = findEventBySourceReminderId(reminderId)
    if (!event) return false
    return Boolean(
      upsertEvent({
        ...event,
        pinned: pinned === true,
      }),
    )
  }

  const applyPersistedSource = (source) => {
    if (!source || typeof source !== 'object') return false
    events.value = normalizeCalendarEvents(source.events)
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(CALENDAR_STORAGE_KEY, {
      version: CALENDAR_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(CALENDAR_STORAGE_KEY, {
      version: CALENDAR_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    events: events.value.map((event) => ({ ...event })),
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.calendar === 'object' && snapshot.calendar
        ? snapshot.calendar
        : snapshot
    return applyPersistedSource(source)
  }

  const persistToStorage = () => {
    writePersistedState(CALENDAR_STORAGE_KEY, createBackupSnapshot(), {
      version: CALENDAR_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    events.value = []
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    events,
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    events,
    upcomingEvents,
    eventCount,
    hasFinishedStorageHydration,
    findEventById,
    findEventBySourceReminderId,
    upsertEvent,
    upsertEventFromMapReminder,
    removeEventBySourceReminderId,
    setEventPinnedBySourceReminderId,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
