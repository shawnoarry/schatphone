import { describe, expect, test } from 'vitest'
import {
  SERVICE_ACCOUNT_SOURCE_PLAN_STATUS,
  buildServiceAccountSourceNotificationPlan,
} from '../src/lib/service-account-source-plan'

describe('service account source notification plan', () => {
  test('maps active source bindings into event-driven source-module schedules', () => {
    const plan = buildServiceAccountSourceNotificationPlan({
      sourceBindings: {
        shoppingServiceKey: 'daily_fresh',
        logisticsServiceKey: 'standard_courier',
        foodDeliveryServiceKey: '',
      },
      origin: {
        worldPackId: 'survival_city',
        worldServiceTemplateId: 'shelter_bulletin',
        worldAppBindingId: 'survival_dispatch',
      },
    })

    expect(plan).toMatchObject({
      status: SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.READY,
      origin: {
        worldPackId: 'survival_city',
        worldServiceTemplateId: 'shelter_bulletin',
        worldAppBindingId: 'survival_dispatch',
      },
      boundary: {
        owner: 'source_module',
        chatReceivesNotificationsOnly: true,
        chatMayMutateSourceRecords: false,
        autoCreatesSubscription: false,
        autoCreatesSourceRecords: false,
      },
    })
    expect(plan.rows).toEqual([
      expect.objectContaining({
        id: 'shopping_orders',
        sourceModule: 'shopping_order_update',
        serviceBindingKey: 'shoppingServiceKey',
        serviceKey: 'daily_fresh',
        schedule: expect.objectContaining({
          mode: 'event_driven',
          owner: 'source_module',
          autoCreatesSubscription: false,
          autoCreatesSourceRecords: false,
        }),
      }),
      expect.objectContaining({
        id: 'shopping_logistics',
        sourceModule: 'shopping_logistics_tracking',
        serviceBindingKey: 'logisticsServiceKey',
        serviceKey: 'standard_courier',
        notificationKinds: ['logistics_update'],
      }),
    ])
  })

  test('marks template candidates as available after join instead of ready', () => {
    const plan = buildServiceAccountSourceNotificationPlan(
      {
        foodDeliveryServiceKey: 'food_delivery_dispatch',
      },
      { subscriptionState: 'available' },
    )

    expect(plan.status).toBe(SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.AVAILABLE_AFTER_JOIN)
    expect(plan.summary).toContain('ready after the user joins')
    expect(plan.rows).toHaveLength(1)
    expect(plan.rows[0]).toMatchObject({
      sourceModule: 'food_delivery_chat_push',
      serviceBindingKey: 'foodDeliveryServiceKey',
      status: SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.AVAILABLE_AFTER_JOIN,
      notificationKinds: ['food_delivery_order', 'food_delivery_update'],
    })
  })

  test('keeps unbound public channels descriptive and non-mutating', () => {
    const plan = buildServiceAccountSourceNotificationPlan({
      origin: {
        worldPackId: 'fandom_parallel',
        worldServiceTemplateId: 'official_feed',
      },
    })

    expect(plan.status).toBe(SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.NOT_CONNECTED)
    expect(plan.rows).toEqual([])
    expect(plan.summary).toContain('No source-module notification schedule')
    expect(plan.boundary.chatMayMutateSourceRecords).toBe(false)
  })
})
