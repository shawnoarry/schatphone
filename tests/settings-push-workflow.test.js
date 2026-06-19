import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsPushWorkflow } from '../src/composables/useSettingsPushWorkflow'
import { useSystemStore } from '../src/stores/system'

const t = (zh, en) => en || zh

describe('Settings push workflow interface', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-19T10:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('checks push server health and records a reachable status report', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.pushServerUrl = 'http://localhost:8787/'
    const checkPushServerHealth = vi.fn(async () => ({
      ok: true,
      serverUrl: 'http://localhost:8787',
      subscriptionCount: 2,
      scheduledCount: 3,
    }))

    const workflow = useSettingsPushWorkflow({
      systemStore,
      t,
      confirmDialog: vi.fn(async () => true),
      checkPushServerHealth,
    })

    await workflow.checkPushServerHealthNow()

    expect(checkPushServerHealth).toHaveBeenCalledWith({
      serverUrl: 'http://localhost:8787',
    })
    expect(workflow.pushServerHealthState.value).toBe('ok')
    expect(workflow.pushLastHealthCheckAt.value).toBe(Date.parse('2026-06-19T10:00:00.000Z'))
    expect(workflow.pushServerHealthMessage.value).toContain('2 subscription')
    expect(workflow.pushFeedbackType.value).toBe('success')
    expect(systemStore.settings.system.pushLastError).toBe('')
    expect(systemStore.apiReports[0]).toMatchObject({
      level: 'info',
      module: 'push',
      action: 'health_check',
      message: 'Push Server health check passed.',
    })

    workflow.disposeSettingsPushWorkflow()
  })

  test('marks the browser subscription inactive when resync cannot find the local subscription', async () => {
    const systemStore = useSystemStore()
    systemStore.setPushState({
      realPushEnabled: true,
      pushServerUrl: 'http://localhost:8787',
      pushDeviceId: 'device-1',
      pushSubscriptionActive: true,
    })
    const syncExistingWebPushSubscription = vi.fn(async () => ({
      ok: false,
      reason: 'subscription_missing',
      message: 'No active browser subscription found.',
    }))

    const workflow = useSettingsPushWorkflow({
      systemStore,
      t,
      confirmDialog: vi.fn(async () => true),
      readPushPermission: () => 'granted',
      syncExistingWebPushSubscription,
    })

    await workflow.resyncRealPushNow()

    expect(syncExistingWebPushSubscription).toHaveBeenCalledWith({
      serverUrl: 'http://localhost:8787',
      deviceId: 'device-1',
    })
    expect(systemStore.settings.system.pushPermission).toBe('granted')
    expect(systemStore.settings.system.pushSubscriptionActive).toBe(false)
    expect(systemStore.settings.system.pushLastError).toBe('No active browser subscription found.')
    expect(workflow.pushFeedbackType.value).toBe('warn')
    expect(systemStore.apiReports[0]).toMatchObject({
      level: 'error',
      module: 'push',
      action: 'resync',
      code: 'subscription_missing',
    })

    workflow.disposeSettingsPushWorkflow()
  })

  test('keeps push disabled and writes a subscribe report when subscription fails', async () => {
    const systemStore = useSystemStore()
    systemStore.settings.system.pushServerUrl = 'http://localhost:8787'
    const subscribeWebPush = vi.fn(async () => ({
      ok: false,
      reason: 'permission_not_granted',
      message: 'Notification permission not granted.',
    }))

    const workflow = useSettingsPushWorkflow({
      systemStore,
      t,
      confirmDialog: vi.fn(async () => true),
      isWebPushSupported: () => true,
      readPushPermission: () => 'denied',
      subscribeWebPush,
    })

    await workflow.subscribeRealPushNow()

    expect(subscribeWebPush).toHaveBeenCalledWith({
      serverUrl: 'http://localhost:8787',
      deviceId: '',
    })
    expect(systemStore.settings.system.realPushEnabled).toBe(false)
    expect(systemStore.settings.system.pushSubscriptionActive).toBe(false)
    expect(systemStore.settings.system.pushPermission).toBe('denied')
    expect(systemStore.settings.system.pushLastError).toBe('Notification permission not granted.')
    expect(workflow.pushFeedbackType.value).toBe('warn')
    expect(workflow.pushFeedbackMessage.value).toBe('Notification permission not granted.')
    expect(systemStore.apiReports[0]).toMatchObject({
      level: 'error',
      module: 'push',
      action: 'subscribe',
      code: 'permission_not_granted',
    })

    workflow.disposeSettingsPushWorkflow()
  })

  test('confirms before unsubscribe and clears the active subscription state on success', async () => {
    const systemStore = useSystemStore()
    systemStore.setPushState({
      realPushEnabled: true,
      pushServerUrl: 'http://localhost:8787',
      pushDeviceId: 'device-1',
      pushSubscriptionActive: true,
      pushVapidPublicKey: 'public-key',
    })
    const confirmDialog = vi.fn(async () => true)
    const unsubscribeWebPush = vi.fn(async () => ({ ok: true, unsubscribed: true }))

    const workflow = useSettingsPushWorkflow({
      systemStore,
      t,
      confirmDialog,
      readPushPermission: () => 'default',
      unsubscribeWebPush,
    })

    await workflow.unsubscribeRealPushNow()

    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Disable real push',
      tone: 'danger',
    }))
    expect(unsubscribeWebPush).toHaveBeenCalledWith({
      serverUrl: 'http://localhost:8787',
      deviceId: 'device-1',
    })
    expect(systemStore.settings.system.realPushEnabled).toBe(false)
    expect(systemStore.settings.system.pushSubscriptionActive).toBe(false)
    expect(systemStore.settings.system.pushVapidPublicKey).toBe('')
    expect(systemStore.settings.system.pushLastSyncedAt).toBe(Date.parse('2026-06-19T10:00:00.000Z'))
    expect(systemStore.apiReports[0]).toMatchObject({
      level: 'info',
      module: 'push',
      action: 'unsubscribe',
      message: 'Real push unsubscribed.',
    })
    expect(workflow.pushFeedbackType.value).toBe('success')

    workflow.disposeSettingsPushWorkflow()
  })

  test('cleans push feedback and notification saved timers through the workflow disposer', () => {
    const systemStore = useSystemStore()
    const workflow = useSettingsPushWorkflow({
      systemStore,
      t,
      confirmDialog: vi.fn(async () => true),
    })

    workflow.setPushFeedback('success', 'Saved.')
    workflow.updateNotificationEnabled(false)

    expect(workflow.pushFeedbackMessage.value).toBe('Saved.')
    expect(workflow.notificationSaved.value).toBe(true)

    workflow.disposeSettingsPushWorkflow()
    vi.advanceTimersByTime(2200)

    expect(workflow.pushFeedbackMessage.value).toBe('Saved.')
    expect(workflow.notificationSaved.value).toBe(true)
  })
})
