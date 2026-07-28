import { describe, expect, test, vi } from 'vitest'
import {
  buildPushNotificationPayload,
  cancelScheduledPushNotification,
  checkPushServerHealth,
  ensurePushServiceWorkerRegistration,
  normalizePushPermission,
  normalizePushServerUrl,
  schedulePushNotification,
  syncExistingWebPushSubscription,
} from '../src/lib/push'

describe('push web baseline helpers', () => {
  test('normalizes push server url and trims trailing slash', () => {
    expect(normalizePushServerUrl('http://localhost:8787/')).toBe('http://localhost:8787')
    expect(normalizePushServerUrl('https://example.com/push/')).toBe('https://example.com/push')
    expect(normalizePushServerUrl('not-a-url', '')).toBe('')
  })

  test('normalizes push permission values safely', () => {
    expect(normalizePushPermission('granted')).toBe('granted')
    expect(normalizePushPermission('denied')).toBe('denied')
    expect(normalizePushPermission('unsupported')).toBe('unsupported')
    expect(normalizePushPermission('other')).toBe('default')
  })

  test('checks the service worker script without reusing the HTTP cache', async () => {
    const secureContextDescriptor = Object.getOwnPropertyDescriptor(window, 'isSecureContext')
    const pushManagerDescriptor = Object.getOwnPropertyDescriptor(window, 'PushManager')
    const serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
    const notificationDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Notification')
    const registration = {}
    const register = vi.fn().mockResolvedValue(registration)

    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: class PushManager {},
    })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        register,
      },
    })
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: { permission: 'default' },
    })

    try {
      await expect(ensurePushServiceWorkerRegistration()).resolves.toBe(registration)
      expect(register).toHaveBeenCalledWith(expect.stringContaining('service-worker.js'), {
        scope: expect.any(String),
        updateViaCache: 'none',
      })
    } finally {
      const restore = (target, key, descriptor) => {
        if (descriptor) Object.defineProperty(target, key, descriptor)
        else delete target[key]
      }
      restore(window, 'isSecureContext', secureContextDescriptor)
      restore(window, 'PushManager', pushManagerDescriptor)
      restore(navigator, 'serviceWorker', serviceWorkerDescriptor)
      restore(globalThis, 'Notification', notificationDescriptor)
    }
  })

  test('builds stable push payload with minimal external fallback by default', () => {
    const payload = buildPushNotificationPayload({
      title: 'A'.repeat(80),
      content: 'B'.repeat(200),
      route: '/chat/1',
      source: 'chat_ai_reply',
      createdAt: 123,
      pushLocale: 'zh-CN',
    })

    expect(payload.title).toBe('SchatPhone')
    expect(payload.body).toBe('你有一条新的提醒')
    expect(payload.route).toBe('/chat/1')
    expect(payload.source).toBe('chat_ai_reply')
    expect(payload.createdAt).toBe(123)
    expect(payload.icon).toContain('icons/pwa-icon-192.png')
    expect(payload.badge).toContain('icons/pwa-icon-192.png')
  })

  test('builds module-aware copy when standard mode is requested', () => {
    const payload = buildPushNotificationPayload({
      title: 'Ignored internal title',
      content: 'Ignored internal body',
      route: '/map',
      source: 'map_trip_arrival',
      createdAt: 456,
      pushLocale: 'en-US',
      pushDisplayMode: 'standard',
    })

    expect(payload.title).toBe('SchatPhone')
    expect(payload.body).toBe('You have a new trip reminder.')
    expect(payload.route).toBe('/map')
    expect(payload.createdAt).toBe(456)
  })

  test('uses preview text only when preview mode is enabled', () => {
    const payload = buildPushNotificationPayload({
      title: 'Ignored internal title',
      content: 'A'.repeat(220),
      pushTitle: 'SchatPhone Custom',
      pushBody: 'B'.repeat(220),
      pushIconUrl: 'https://cdn.example.com/icon.png',
      route: '/map',
      source: 'map_trip_arrival',
      createdAt: 456,
      pushDisplayMode: 'preview',
    })

    expect(payload.title).toBe('SchatPhone Custom')
    expect(payload.body.length).toBeLessThanOrEqual(160)
    expect(payload.body.startsWith('B')).toBe(true)
    expect(payload.icon).toBe('https://cdn.example.com/icon.png')
    expect(payload.route).toBe('/map')
    expect(payload.createdAt).toBe(456)
  })

  test('guards health check and resync when server url is missing', async () => {
    const health = await checkPushServerHealth({ serverUrl: '' })
    const resync = await syncExistingWebPushSubscription({ serverUrl: '' })

    expect(health.ok).toBe(false)
    expect(health.reason).toBe('server_url_missing')
    expect(resync.ok).toBe(false)
    expect(resync.reason).toBe('server_url_missing')
  })

  test('guards scheduled push helpers when configuration is incomplete', async () => {
    const schedule = await schedulePushNotification({
      serverUrl: '',
      deviceId: 'push_device',
      deliverAt: Date.now() + 60_000,
      notification: { title: 'Map', content: 'Arrived.' },
    })
    const cancel = await cancelScheduledPushNotification({
      serverUrl: '',
      scheduleId: 'sched_1',
    })

    expect(schedule.ok).toBe(false)
    expect(schedule.reason).toBe('config_missing')
    expect(cancel.ok).toBe(false)
    expect(cancel.reason).toBe('config_missing')
  })

  test('guards scheduled push helper when deliverAt is invalid', async () => {
    return schedulePushNotification({
      serverUrl: 'http://localhost:8787',
      deviceId: 'push_device',
      deliverAt: 0,
      notification: { title: 'Map', content: 'Arrived.' },
    }).then((result) => {
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('deliver_at_invalid')
    })
  })
})
