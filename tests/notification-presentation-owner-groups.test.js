import { describe, expect, test } from 'vitest'
import { resolveNotificationModuleMeta } from '../src/lib/notification-presentation'

describe('notification presentation owner groups', () => {
  test.each([
    ['calendar_departure_ready', '/calendar', 'calendar', 'app_calendar', '日历'],
    ['phone_missed_call', '/phone', 'phone', 'app_phone', '电话'],
    ['wallet_payment', '/wallet', 'wallet', 'app_wallet', '钱包'],
    ['mail_arrival', '/mail', 'mail', 'app_daon_mail', '邮件'],
    ['food_delivery_rider_pickup', '/food-delivery', 'food_delivery', 'app_food_delivery', '外卖'],
  ])('resolves %s to its owner app', (source, route, key, appId, label) => {
    const result = resolveNotificationModuleMeta({ source, route }, 'zh-CN')
    expect(result).toMatchObject({ key, appId, label })
  })

  test('fails closed to Settings for an unknown notification source', () => {
    const result = resolveNotificationModuleMeta(
      { source: 'unknown_owner', route: '/unknown-owner' },
      'en-US',
    )
    expect(result).toMatchObject({ key: 'system', appId: 'app_settings', label: 'Settings' })
  })
})
