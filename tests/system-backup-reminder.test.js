import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

describe('system backup reminder', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('initializes reminder baseline without immediate notification', () => {
    const store = useSystemStore()
    store.settings.system.backupReminderEnabled = true
    store.settings.system.backupReminderIntervalHours = 24

    const result = store.checkBackupReminderDue(1_000)

    expect(result.triggered).toBe(false)
    expect(result.initialized).toBe(true)
    expect(store.settings.system.backupReminderLastNotifiedAt).toBe(1_000)
    expect(store.notifications.length).toBe(0)
  })

  test('triggers system-style backup reminder when interval is due', () => {
    const store = useSystemStore()
    store.settings.system.backupReminderEnabled = true
    store.settings.system.backupReminderIntervalHours = 24

    store.checkBackupReminderDue(2_000)
    const dueAt = 2_000 + 24 * 60 * 60 * 1000 + 1
    const result = store.checkBackupReminderDue(dueAt, {
      title: 'Backup reminder',
      content: 'Export backup now.',
      route: '/settings',
    })

    expect(result.triggered).toBe(true)
    expect(store.notifications.length).toBe(1)
    expect(store.notifications[0].source).toBe('system_backup_reminder')
    expect(store.notifications[0].title).toBe('Backup reminder')
    expect(store.settings.system.backupReminderLastNotifiedAt).toBe(dueAt)
  })

  test('markBackupExported postpones next reminder window', () => {
    const store = useSystemStore()
    store.settings.system.backupReminderEnabled = true
    store.settings.system.backupReminderIntervalHours = 24

    store.markBackupExported(10_000)
    const result = store.checkBackupReminderDue(10_000 + 60_000)

    expect(result.triggered).toBe(false)
    expect(result.reason).toBe('not_due')
  })

  test('does not trigger reminders when backup reminder is disabled', () => {
    const store = useSystemStore()
    store.settings.system.backupReminderEnabled = false

    const result = store.checkBackupReminderDue(5_000)

    expect(result.triggered).toBe(false)
    expect(result.reason).toBe('disabled')
    expect(store.notifications.length).toBe(0)
  })
})
