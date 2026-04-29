import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import {
  cancelScheduledPushNotification,
  schedulePushNotification,
} from '../lib/push'
import { useSystemStore } from './system'

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

const createCalendarEventScheduleId = (eventId) => {
  const normalizedEventId = normalizeEventId(eventId)
  return normalizedEventId ? `calendar_event_push_${normalizedEventId}` : ''
}

const normalizeCalendarEventRecord = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const startsAt = Math.max(0, toInt(raw.startsAt ?? raw.dueAt, 0))
  const originalStartsAt = Math.max(0, toInt(raw.originalStartsAt ?? startsAt, startsAt))
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
    originalStartsAt,
    timeEditedAt: Math.max(0, toInt(raw.timeEditedAt, 0)),
    status: normalizeCalendarEventStatus(raw.status),
    pinned: raw.pinned === true,
    route: trimLine(raw.route, '', 120),
    icon: trimLine(raw.icon, 'fas fa-calendar-day', 80),
    tone: trimLine(raw.tone, 'blue', 40),
    scheduledPushId: trimLine(raw.scheduledPushId, '', 140),
    scheduledPushAt: Math.max(0, toInt(raw.scheduledPushAt, 0)),
    lastPushError: trimLine(raw.lastPushError, '', 120),
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
  const getSystemStore = () => useSystemStore()
  const events = ref([])
  const hasFinishedStorageHydration = ref(false)
  let eventPushSchedulePromise = null
  let eventPushCancelPromise = null

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
    const eventId = createCalendarEventIdFromReminder(reminderId)
    const existing = findEventById(eventId)
    const reminderStartsAt = Math.max(0, toInt(reminder.dueAt, 0))
    const hasEditedTime = Math.max(0, toInt(existing?.timeEditedAt, 0)) > 0
    return upsertEvent({
      id: eventId,
      source: 'map_calendar_reminder',
      sourceReminderId: reminderId,
      sourceAreaId: reminder.areaId || '',
      titleZh: reminder.titleZh || '地图提醒',
      titleEn: reminder.titleEn || 'Map reminder',
      summaryZh: reminder.summaryZh || '',
      summaryEn: reminder.summaryEn || '',
      startsAt: hasEditedTime ? existing.startsAt : reminderStartsAt,
      originalStartsAt: existing?.originalStartsAt || reminderStartsAt,
      timeEditedAt: existing?.timeEditedAt || 0,
      status: CALENDAR_EVENT_STATUS_CONFIRMED,
      pinned: reminder.pinned === true,
      route: reminder.route || '/map',
      icon: reminder.icon || 'fas fa-location-dot',
      tone: reminder.tone || 'blue',
      scheduledPushId: existing?.scheduledPushId || '',
      scheduledPushAt: existing?.scheduledPushAt || 0,
      lastPushError: existing?.lastPushError || '',
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

  const canUseCalendarEventRealPush = () => {
    const systemStore = getSystemStore()
    const systemSettings = systemStore.settings?.system || {}
    return (
      systemSettings.notifications !== false &&
      systemSettings.realPushEnabled === true &&
      systemSettings.pushSubscriptionActive === true &&
      typeof systemSettings.pushServerUrl === 'string' &&
      systemSettings.pushServerUrl.trim() &&
      typeof systemSettings.pushDeviceId === 'string' &&
      systemSettings.pushDeviceId.trim()
    )
  }

  const buildCalendarEventNotification = (event) => {
    const systemStore = getSystemStore()
    const useChinese = String(systemStore.settings?.system?.language || '')
      .toLowerCase()
      .startsWith('zh')
    return {
      id: `calendar_event_${event.id}`,
      title: useChinese ? '日历' : 'Calendar',
      content: useChinese
        ? `${event.titleZh || event.titleEn || '日历事件'} 即将开始。`
        : `${event.titleEn || event.titleZh || 'Calendar event'} is coming up.`,
      route: '/calendar',
      source: 'calendar_event',
      createdAt: event.startsAt || Date.now(),
    }
  }

  const markEventPushState = (eventId, patch = {}) => {
    const event = findEventById(eventId)
    if (!event) return false
    return Boolean(
      upsertEvent({
        ...event,
        ...patch,
      }),
    )
  }

  const cancelEventPushScheduled = async ({ eventId = '', scheduleId = '', source = '' } = {}) => {
    const systemStore = getSystemStore()
    const event = findEventById(eventId)
    const nextScheduleId =
      trimLine(scheduleId, '', 140) ||
      trimLine(event?.scheduledPushId, '', 140) ||
      createCalendarEventScheduleId(eventId)

    if (!nextScheduleId) return { ok: false, reason: 'schedule_missing' }
    if (eventPushCancelPromise) return eventPushCancelPromise

    eventPushCancelPromise = (async () => {
      try {
        const serverUrl = systemStore.settings?.system?.pushServerUrl || ''
        if (!serverUrl) {
          if (event?.id) {
            markEventPushState(event.id, {
              scheduledPushId: '',
              scheduledPushAt: 0,
            })
          }
          return { ok: false, reason: 'server_url_missing' }
        }

        const result = await cancelScheduledPushNotification({
          serverUrl,
          scheduleId: nextScheduleId,
        })

        if (event?.id) {
          markEventPushState(event.id, {
            scheduledPushId: '',
            scheduledPushAt: 0,
            lastPushError: result.ok ? '' : result.reason || 'cancel_schedule_failed',
          })
        }

        if (!result.ok) {
          systemStore.addApiReport({
            level: 'error',
            module: 'push',
            action: 'cancel_schedule',
            provider: 'push_relay',
            model: source || 'calendar_event',
            code: result.reason || 'cancel_schedule_failed',
            message: result.message || 'Failed to cancel scheduled Calendar event push.',
            createdAt: Date.now(),
          })
          return result
        }

        return {
          ok: true,
          removed: result.removed === true,
          scheduleId: nextScheduleId,
        }
      } finally {
        eventPushCancelPromise = null
      }
    })()

    return eventPushCancelPromise
  }

  const cancelEventPushScheduledBySourceReminderId = async (reminderId, options = {}) => {
    const event = findEventBySourceReminderId(reminderId)
    if (!event) return { ok: false, reason: 'event_missing' }
    return cancelEventPushScheduled({
      eventId: event.id,
      source: options.source || 'calendar_event_source_reminder',
    })
  }

  const ensureEventPushScheduled = async (eventId, { force = false, source = '' } = {}) => {
    const systemStore = getSystemStore()
    const event = findEventById(eventId)
    if (!event || event.status !== CALENDAR_EVENT_STATUS_CONFIRMED) {
      return { ok: false, reason: 'event_missing' }
    }
    if (!event.startsAt) return { ok: false, reason: 'deliver_at_invalid' }
    if (!canUseCalendarEventRealPush()) return { ok: false, reason: 'real_push_disabled' }
    if (eventPushSchedulePromise) return eventPushSchedulePromise
    if (!force && event.scheduledPushId && event.scheduledPushAt === event.startsAt) {
      return {
        ok: true,
        reason: 'already_scheduled',
        scheduleId: event.scheduledPushId,
        deliverAt: event.scheduledPushAt,
      }
    }

    const scheduleId = event.scheduledPushId || createCalendarEventScheduleId(event.id)
    const notification = {
      ...buildCalendarEventNotification(event),
      pushDisplayMode: systemStore.settings.system.pushDisplayMode || 'minimal',
    }

    eventPushSchedulePromise = (async () => {
      try {
        const result = await schedulePushNotification({
          serverUrl: systemStore.settings.system.pushServerUrl,
          deviceId: systemStore.settings.system.pushDeviceId,
          deliverAt: event.startsAt,
          scheduleId,
          source: source || 'calendar_event',
          category: 'calendar_event',
          notification,
        })

        if (!result.ok) {
          markEventPushState(event.id, {
            lastPushError: result.reason || 'schedule_failed',
          })
          systemStore.addApiReport({
            level: 'error',
            module: 'push',
            action: 'schedule',
            provider: 'push_relay',
            model: source || 'calendar_event',
            code: result.reason || 'schedule_failed',
            message: result.message || 'Failed to schedule Calendar event push.',
            createdAt: Date.now(),
          })
          return result
        }

        markEventPushState(event.id, {
          scheduledPushId: result.scheduleId || scheduleId,
          scheduledPushAt: result.deliverAt || event.startsAt,
          lastPushError: '',
        })

        systemStore.addApiReport({
          level: 'info',
          module: 'push',
          action: 'schedule',
          provider: 'push_relay',
          model: source || 'calendar_event',
          message: 'Calendar event push scheduled.',
          createdAt: Date.now(),
        })

        return {
          ok: true,
          scheduleId: result.scheduleId || scheduleId,
          deliverAt: result.deliverAt || event.startsAt,
        }
      } finally {
        eventPushSchedulePromise = null
      }
    })()

    return eventPushSchedulePromise
  }

  const rescheduleEventPush = async (eventId, { source = '' } = {}) => {
    const event = findEventById(eventId)
    if (!event) return { ok: false, reason: 'event_missing' }
    if (event.scheduledPushId && event.scheduledPushAt !== event.startsAt) {
      await cancelEventPushScheduled({
        eventId: event.id,
        scheduleId: event.scheduledPushId,
        source: source || 'calendar_event_reschedule',
      })
    }
    return ensureEventPushScheduled(event.id, {
      force: true,
      source: source || 'calendar_event_reschedule',
    })
  }

  const setEventStartsAt = (eventId, startsAt) => {
    const event = findEventById(eventId)
    const normalizedStartsAt = Math.max(0, toInt(startsAt, 0))
    if (!event || normalizedStartsAt <= 0) return false
    return Boolean(
      upsertEvent({
        ...event,
        startsAt: normalizedStartsAt,
        originalStartsAt: event.originalStartsAt || event.startsAt,
        timeEditedAt: Date.now(),
      }),
    )
  }

  const setEventStartsAtBySourceReminderId = (reminderId, startsAt) => {
    const event = findEventBySourceReminderId(reminderId)
    if (!event) return false
    return setEventStartsAt(event.id, startsAt)
  }

  const resetEventStartsAt = (eventId) => {
    const event = findEventById(eventId)
    if (!event) return false
    const originalStartsAt = Math.max(0, toInt(event.originalStartsAt || event.startsAt, 0))
    if (originalStartsAt <= 0) return false
    return Boolean(
      upsertEvent({
        ...event,
        startsAt: originalStartsAt,
        originalStartsAt,
        timeEditedAt: 0,
      }),
    )
  }

  const resetEventStartsAtBySourceReminderId = (reminderId) => {
    const event = findEventBySourceReminderId(reminderId)
    if (!event) return false
    return resetEventStartsAt(event.id)
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
    ensureEventPushScheduled,
    rescheduleEventPush,
    cancelEventPushScheduled,
    cancelEventPushScheduledBySourceReminderId,
    setEventStartsAt,
    setEventStartsAtBySourceReminderId,
    resetEventStartsAt,
    resetEventStartsAtBySourceReminderId,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
