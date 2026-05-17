import { describe, expect, test } from 'vitest'
import {
  clampProbability,
  createSeededRandom,
  evaluateRandomGate,
  pickWeightedItem,
} from '../src/lib/simulation/random'

describe('simulation random helpers', () => {
  test('clamps probabilities and evaluates injected random gates deterministically', () => {
    expect(clampProbability(-1)).toBe(0)
    expect(clampProbability(2)).toBe(1)
    expect(clampProbability('bad', 0.4)).toBe(0.4)

    expect(evaluateRandomGate({ probability: 0, randomValue: 0 })).toMatchObject({
      passed: false,
      reason: 'probability_zero',
    })
    expect(evaluateRandomGate({ probability: 1, randomValue: 1 })).toMatchObject({
      passed: true,
      reason: 'probability_full',
    })
    expect(evaluateRandomGate({ probability: 0.5, randomValue: 0.49 })).toMatchObject({
      passed: true,
      reason: 'random_passed',
      randomSource: 'injected',
    })
    expect(evaluateRandomGate({ probability: 0.5, randomValue: 0.5 })).toMatchObject({
      passed: false,
      reason: 'random_failed',
    })
  })

  test('uses seeded random values when explicit random values are not provided', () => {
    const firstGenerator = createSeededRandom('food-order-1')
    const secondGenerator = createSeededRandom('food-order-1')

    expect(firstGenerator()).toBe(secondGenerator())
    expect(evaluateRandomGate({ probability: 0.99, seed: 'stable-seed' }).randomSource).toBe('seeded')
    expect(evaluateRandomGate({ probability: 0.5 })).toMatchObject({
      passed: false,
      reason: 'random_missing',
    })
  })

  test('picks weighted items without global Math.random business logic', () => {
    const items = [
      { id: 'low', weight: 1 },
      { id: 'high', weight: 9 },
    ]

    expect(pickWeightedItem(items, { randomValue: 0.05 }).item?.id).toBe('low')
    expect(pickWeightedItem(items, { randomValue: 0.95 }).item?.id).toBe('high')
    expect(pickWeightedItem([{ id: 'empty', weight: 0 }])).toMatchObject({
      item: null,
      reason: 'empty_weights',
    })
    expect(pickWeightedItem(items)).toMatchObject({
      item: null,
      reason: 'random_missing',
    })
    expect(pickWeightedItem([])).toMatchObject({
      item: null,
      reason: 'empty_items',
    })
  })
})
