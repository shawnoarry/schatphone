import { describe, expect, test } from 'vitest'
import {
  evaluateCondition,
  evaluateConditions,
  getByPath,
} from '../src/lib/simulation/condition-evaluator'

describe('simulation condition evaluator', () => {
  const context = {
    order: {
      status: 'cooking',
      etaMinutes: 32,
      events: [{ type: 'placed' }, { type: 'rider_delay' }],
    },
    rider: {
      assigned: true,
    },
  }

  test('reads nested paths and array indexes safely', () => {
    expect(getByPath(context, 'order.status')).toBe('cooking')
    expect(getByPath(context, 'order.events.1.type')).toBe('rider_delay')
    expect(getByPath(context, 'missing.value')).toBeUndefined()
  })

  test('evaluates basic operators without throwing on missing context', () => {
    expect(evaluateCondition({ key: 'order.status', op: 'eq', value: 'cooking' }, context).passed).toBe(true)
    expect(evaluateCondition({ key: 'order.status', op: 'not_eq', value: 'delivered' }, context).passed).toBe(true)
    expect(evaluateCondition({ key: 'order.status', op: 'in', value: ['accepted', 'cooking'] }, context).passed).toBe(true)
    expect(evaluateCondition({ key: 'order.status', op: 'not_in', value: ['cancelled'] }, context).passed).toBe(true)
    expect(evaluateCondition({ key: 'order.etaMinutes', op: 'gt', value: 20 }, context).passed).toBe(true)
    expect(evaluateCondition({ key: 'order.etaMinutes', op: 'gte', value: 32 }, context).passed).toBe(true)
    expect(evaluateCondition({ key: 'order.etaMinutes', op: 'lt', value: 40 }, context).passed).toBe(true)
    expect(evaluateCondition({ key: 'rider.assigned', op: 'exists' }, context).passed).toBe(true)
    expect(evaluateCondition({ key: 'rider.missing', op: 'exists' }, context).passed).toBe(false)
  })

  test('aggregates condition groups and marks malformed conditions as failed', () => {
    expect(
      evaluateConditions(
        [
          { key: 'order.status', op: 'eq', value: 'cooking' },
          { key: 'order.etaMinutes', op: 'lte', value: 35 },
        ],
        context,
      ),
    ).toMatchObject({
      passed: true,
      reason: 'conditions_passed',
    })

    expect(
      evaluateConditions(
        [
          { key: 'order.status', op: 'eq', value: 'cooking' },
          { key: 'order.etaMinutes', op: 'gt', value: 60 },
        ],
        context,
      ),
    ).toMatchObject({
      passed: false,
      reason: 'conditions_failed',
    })

    expect(evaluateCondition({ key: '', op: 'eq' }, context)).toMatchObject({
      passed: false,
      reason: 'missing_key',
    })
    expect(evaluateCondition({ key: 'order.status', op: 'contains' }, context)).toMatchObject({
      passed: false,
      reason: 'unsupported_operator',
    })
    expect(evaluateConditions([], context)).toMatchObject({
      passed: true,
      reason: 'no_conditions',
    })
  })
})
