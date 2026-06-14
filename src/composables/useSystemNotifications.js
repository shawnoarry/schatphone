import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSystemStore } from '../stores/system'

const normalizeListLimit = (value, fallback = 8) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(0, Math.floor(numeric))
}

export const useSystemNotifications = (options = {}) => {
  const systemStore = options.systemStore || useSystemStore()
  const { notifications, settings } = storeToRefs(systemStore)

  const notificationItems = computed(() =>
    Array.isArray(notifications.value) ? notifications.value : [],
  )

  const notificationEnabled = computed(() => settings.value?.system?.notifications !== false)

  const unreadNotificationCount = computed(() =>
    notificationItems.value.reduce((count, note) => count + (note?.read ? 0 : 1), 0),
  )

  const listRecentNotifications = (limit = 8) => {
    const normalizedLimit = normalizeListLimit(limit, 8)
    const sorted = [...notificationItems.value].sort(
      (a, b) => (b?.createdAt || 0) - (a?.createdAt || 0),
    )
    return normalizedLimit > 0 ? sorted.slice(0, normalizedLimit) : sorted
  }

  const addNotification = (rawNote = {}) => systemStore.addNotification(rawNote)

  const setNotificationEnabled = (enabled, options = {}) => {
    if (!settings.value.system || typeof settings.value.system !== 'object') {
      settings.value.system = {}
    }
    settings.value.system.notifications = enabled === true
    if (options.save === true) systemStore.saveNow()
    return settings.value.system.notifications
  }

  const markNotificationRead = (notificationId) =>
    systemStore.markNotificationRead(notificationId)

  const markAllNotificationsRead = () => systemStore.markAllNotificationsRead()

  const removeNotification = (notificationId, options = {}) => {
    systemStore.removeNotification(notificationId)
    if (options.save === true) systemStore.saveNow()
  }

  const clearNotifications = (options = {}) => {
    systemStore.clearNotifications()
    if (options.save === true) systemStore.saveNow()
  }

  return {
    notificationItems,
    notificationEnabled,
    unreadNotificationCount,
    listRecentNotifications,
    addNotification,
    setNotificationEnabled,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    clearNotifications,
  }
}
