import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemNotifications } from '../src/composables/useSystemNotifications'
import { useSystemStore } from '../src/stores/system'

describe('system notification interface', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('exposes sorted recent notifications and unread count behind a narrow interface', () => {
    const systemStore = useSystemStore()
    const notifications = useSystemNotifications({ systemStore })

    const olderId = notifications.addNotification({
      title: 'Older',
      content: 'Older content',
      createdAt: 1_000,
      source: 'system',
    })
    const newerId = notifications.addNotification({
      title: 'Newer',
      content: 'Newer content',
      createdAt: 3_000,
      source: 'chat',
    })
    notifications.markNotificationRead(olderId)

    expect(notifications.notificationEnabled.value).toBe(true)
    expect(notifications.unreadNotificationCount.value).toBe(1)
    expect(notifications.listRecentNotifications(1).map((note) => note.id)).toEqual([newerId])
    expect(notifications.listRecentNotifications().map((note) => note.id)).toEqual([
      newerId,
      olderId,
    ])
  })

  test('keeps disabled notification behavior compatible with systemStore', () => {
    const systemStore = useSystemStore()
    const notifications = useSystemNotifications({ systemStore })
    systemStore.settings.system.notifications = false

    const notificationId = notifications.addNotification({
      title: 'Blocked',
      content: 'Should not appear',
    })

    expect(notifications.notificationEnabled.value).toBe(false)
    expect(notificationId).toBe('')
    expect(notifications.notificationItems.value).toHaveLength(0)
  })

  test('updates notification enabled state behind the interface', () => {
    const systemStore = useSystemStore()
    const saveSpy = vi.spyOn(systemStore, 'saveNow')
    const notifications = useSystemNotifications({ systemStore })

    expect(notifications.setNotificationEnabled(false, { save: true })).toBe(false)
    expect(notifications.notificationEnabled.value).toBe(false)
    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(
      notifications.addNotification({
        title: 'Muted',
        content: 'Should not appear',
      }),
    ).toBe('')

    expect(notifications.setNotificationEnabled(true)).toBe(true)
    const notificationId = notifications.addNotification({
      title: 'Allowed',
      content: 'Should appear',
    })

    expect(notificationId).toBeTruthy()
    expect(notifications.notificationItems.value).toHaveLength(1)
  })

  test('can remove or clear notifications with explicit persistence', () => {
    const systemStore = useSystemStore()
    const saveSpy = vi.spyOn(systemStore, 'saveNow')
    const notifications = useSystemNotifications({ systemStore })

    const firstId = notifications.addNotification({
      title: 'First',
      content: 'First content',
      createdAt: 1_000,
    })
    notifications.addNotification({
      title: 'Second',
      content: 'Second content',
      createdAt: 2_000,
    })

    notifications.removeNotification(firstId, { save: true })
    expect(notifications.notificationItems.value.map((note) => note.title)).toEqual(['Second'])
    expect(saveSpy).toHaveBeenCalledTimes(1)

    notifications.clearNotifications({ save: true })
    expect(notifications.notificationItems.value).toEqual([])
    expect(saveSpy).toHaveBeenCalledTimes(2)
  })
})
