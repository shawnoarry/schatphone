import { describe, expect, test } from 'vitest'
import {
  buildPushNotificationPayload,
  cancelScheduledPushNotification,
  checkPushServerHealth,
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

  test('builds stable push payload with defaults and truncation', () => {
    const payload = buildPushNotificationPayload({
      title: 'A'.repeat(80),
      content: 'B'.repeat(200),
      route: '/chat/1',
      source: 'chat_ai_reply',
      createdAt: 123,
    })

    expect(payload.title.length).toBeLessThanOrEqual(60)
    expect(payload.body.length).toBeLessThanOrEqual(160)
    expect(payload.route).toBe('/chat/1')
    expect(payload.source).toBe('chat_ai_reply')
    expect(payload.createdAt).toBe(123)
    expect(payload.icon).toContain('icons/pwa-icon.svg')
    expect(payload.badge).toContain('icons/pwa-icon.svg')
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
