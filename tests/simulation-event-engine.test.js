import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  createEventExecutionLogInput,
  evaluateEventEligibility,
  evaluateEventTemplate,
  isTriggerSourceAllowed,
  runEventAdapter,
} from '../src/lib/simulation/event-engine'
import { useSimulationStore } from '../src/stores/simulation'

const template = {
  id: 'food_delivery.rider_delay.v1',
  moduleKey: 'food_delivery',
  triggerModes: ['manual', 'random'],
  conditions: [{ key: 'order.status', op: 'in', value: ['accepted', 'cooking'] }],
  probability: 0.5,
  cooldownMs: 1000,
  dailyLimit: 2,
  effect: {
    adapterKey: 'food_delivery.add_order_event',
  },
}

describe('simulation event engine', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('evaluates trigger source and condition eligibility separately from side effects', () => {
    expect(isTriggerSourceAllowed(template, 'manual')).toBe(true)
    expect(isTriggerSourceAllowed(template, 'scheduled')).toBe(false)

    expect(evaluateEventEligibility(template, { order: { status: 'cooking' } }, { triggerSource: 'manual' })).toMatchObject({
      eligible: true,
      reason: 'eligible',
    })
    expect(evaluateEventEligibility(template, { order: { status: 'delivered' } }, { triggerSource: 'manual' })).toMatchObject({
      eligible: false,
      reason: 'conditions_failed',
    })
    expect(evaluateEventEligibility({ ...template, id: '' }, {}, { triggerSource: 'manual' })).toMatchObject({
      eligible: false,
      reason: 'missing_event_id',
    })
  })

  test('evaluates random templates with injected values', () => {
    expect(
      evaluateEventTemplate(template, { order: { status: 'cooking' } }, { triggerSource: 'random', randomValue: 0.2 }),
    ).toMatchObject({
      passed: true,
      reason: 'eligible_random_passed',
    })
    expect(
      evaluateEventTemplate(template, { order: { status: 'cooking' } }, { triggerSource: 'random', randomValue: 0.8 }),
    ).toMatchObject({
      passed: false,
      reason: 'random_failed',
    })
    expect(
      evaluateEventTemplate(template, { order: { status: 'cooking' } }, { triggerSource: 'manual' }),
    ).toMatchObject({
      passed: true,
      reason: 'eligible_non_random',
    })
  })

  test('runs adapters and writes simulation logs without owning module mutation', () => {
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()
    const adapter = vi.fn(() => ({ id: 'food_event_1' }))

    const result = runEventAdapter({
      template,
      context: { order: { status: 'cooking' } },
      adapters: {
        'food_delivery.add_order_event': adapter,
      },
      triggerSource: 'manual',
      targetId: 'order-1',
      now: Date.now(),
      simulationStore,
    })

    expect(result).toMatchObject({
      ok: true,
      status: 'triggered',
      adapterResult: { id: 'food_event_1' },
    })
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(simulationStore.eventLogs[0]).toMatchObject({
      eventId: template.id,
      moduleKey: 'food_delivery',
      targetId: 'order-1',
      adapterKey: 'food_delivery.add_order_event',
      status: 'triggered',
    })
    expect(simulationStore.isCoolingDown(template.id, { targetId: 'order-1', at: Date.now() + 500 })).toBe(true)
    expect(simulationStore.getDailyCounterState(template.id, { targetId: 'order-1', limit: 2 }).count).toBe(1)
  })

  test('records skipped and failed execution attempts for auditability', () => {
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()

    const skipped = runEventAdapter({
      template,
      context: { order: { status: 'cooking' } },
      adapters: {
        'food_delivery.add_order_event': vi.fn(() => ({ id: 'never' })),
      },
      triggerSource: 'random',
      randomValue: 0.9,
      targetId: 'order-1',
      now: Date.now(),
      simulationStore,
    })
    expect(skipped).toMatchObject({
      ok: false,
      status: 'skipped',
    })
    expect(simulationStore.eventLogs[0]).toMatchObject({
      status: 'skipped',
      reason: 'random_failed',
    })

    const failed = runEventAdapter({
      template,
      context: { order: { status: 'cooking' } },
      adapters: {},
      triggerSource: 'manual',
      targetId: 'order-2',
      now: Date.now(),
      simulationStore,
    })
    expect(failed).toMatchObject({
      ok: false,
      status: 'failed',
    })
    expect(simulationStore.eventLogs[0]).toMatchObject({
      status: 'failed',
      reason: 'adapter_missing',
    })

    const thrown = runEventAdapter({
      template,
      context: { order: { status: 'cooking' } },
      adapters: {
        'food_delivery.add_order_event': () => {
          throw new Error('adapter exploded')
        },
      },
      triggerSource: 'manual',
      targetId: 'order-3',
      now: Date.now(),
      simulationStore,
    })
    expect(thrown).toMatchObject({
      ok: false,
      status: 'failed',
    })
    expect(thrown.adapterError).toBeInstanceOf(Error)
    expect(simulationStore.eventLogs[0]).toMatchObject({
      status: 'failed',
      reason: 'adapter_threw',
    })
  })

  test('skips adapter execution when cooldown or daily caps block an event', () => {
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()
    simulationStore.markCooldown({
      eventId: template.id,
      targetId: 'order-cooldown',
      cooldownMs: 1000,
      at: Date.now(),
    })

    const cooldownAdapter = vi.fn(() => ({ id: 'should-not-run' }))
    const cooldownResult = runEventAdapter({
      template,
      context: { order: { status: 'cooking' } },
      adapters: {
        'food_delivery.add_order_event': cooldownAdapter,
      },
      triggerSource: 'manual',
      targetId: 'order-cooldown',
      now: Date.now() + 500,
      simulationStore,
    })

    expect(cooldownResult).toMatchObject({
      ok: false,
      status: 'skipped',
      evaluation: {
        reason: 'cooldown_active',
      },
    })
    expect(cooldownAdapter).not.toHaveBeenCalled()

    simulationStore.incrementDailyCounter({
      eventId: template.id,
      targetId: 'order-capped',
      limit: template.dailyLimit,
      at: Date.now(),
    })
    simulationStore.incrementDailyCounter({
      eventId: template.id,
      targetId: 'order-capped',
      limit: template.dailyLimit,
      at: Date.now(),
    })
    const dailyAdapter = vi.fn(() => ({ id: 'should-not-run' }))
    const dailyResult = runEventAdapter({
      template,
      context: { order: { status: 'cooking' } },
      adapters: {
        'food_delivery.add_order_event': dailyAdapter,
      },
      triggerSource: 'manual',
      targetId: 'order-capped',
      now: Date.now(),
      simulationStore,
    })

    expect(dailyResult).toMatchObject({
      ok: false,
      status: 'skipped',
      evaluation: {
        reason: 'daily_limit_reached',
      },
    })
    expect(dailyAdapter).not.toHaveBeenCalled()
  })

  test('builds log inputs from evaluated templates', () => {
    const evaluation = evaluateEventTemplate(template, { order: { status: 'cooking' } }, { triggerSource: 'manual' })

    expect(
      createEventExecutionLogInput(template, evaluation, {
        targetId: 'order-9',
        at: Date.now(),
        variant: { id: 'food_delivery.rider_delay.sci_fi.corridor_queue.v1' },
        variantPack: {
          id: 'variant_pack_sci_fi',
          activeWorldBookIds: ['kp_city'],
        },
        worldContext: {
          id: 'world_context_sci_fi',
          activeWorldBookIds: ['kp_city'],
        },
      }),
    ).toMatchObject({
      eventId: template.id,
      moduleKey: 'food_delivery',
      targetId: 'order-9',
      adapterKey: 'food_delivery.add_order_event',
      triggerSource: 'manual',
      status: 'triggered',
      variantId: 'food_delivery.rider_delay.sci_fi.corridor_queue.v1',
      variantPackId: 'variant_pack_sci_fi',
      worldContextId: 'world_context_sci_fi',
      activeWorldBookIds: ['kp_city'],
    })
  })
})
