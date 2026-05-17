export const clampProbability = (value, fallback = 0) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return clampProbability(fallback, 0)
  return Math.min(1, Math.max(0, num))
}

export const normalizeRandomValue = (value, fallback = 1) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return normalizeRandomValue(fallback, 1)
  return Math.min(1, Math.max(0, num))
}

const hashSeed = (seed = '') => {
  const serialized = typeof seed === 'string' ? seed : JSON.stringify(seed)
  const input = typeof serialized === 'string' ? serialized : String(seed ?? '')
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const createSeededRandom = (seed = '') => {
  let state = hashSeed(seed) || 1
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const resolveRandomValue = ({ randomValue, seed } = {}) => {
  if (randomValue !== undefined) {
    return {
      value: normalizeRandomValue(randomValue),
      source: 'injected',
    }
  }
  if (seed !== undefined && seed !== null && `${seed}`.trim()) {
    return {
      value: createSeededRandom(seed)(),
      source: 'seeded',
    }
  }
  return {
    value: 1,
    source: 'missing',
  }
}

export const evaluateRandomGate = ({ probability = 0, randomValue, seed } = {}) => {
  const normalizedProbability = clampProbability(probability)
  const resolvedRandom = resolveRandomValue({ randomValue, seed })

  if (normalizedProbability <= 0) {
    return {
      passed: false,
      probability: normalizedProbability,
      randomValue: resolvedRandom.value,
      randomSource: resolvedRandom.source,
      reason: 'probability_zero',
    }
  }

  if (normalizedProbability >= 1) {
    return {
      passed: true,
      probability: normalizedProbability,
      randomValue: resolvedRandom.value,
      randomSource: resolvedRandom.source,
      reason: 'probability_full',
    }
  }

  if (resolvedRandom.source === 'missing') {
    return {
      passed: false,
      probability: normalizedProbability,
      randomValue: resolvedRandom.value,
      randomSource: resolvedRandom.source,
      reason: 'random_missing',
    }
  }

  const passed = resolvedRandom.value < normalizedProbability
  return {
    passed,
    probability: normalizedProbability,
    randomValue: resolvedRandom.value,
    randomSource: resolvedRandom.source,
    reason: passed ? 'random_passed' : 'random_failed',
  }
}

export const pickWeightedItem = (
  items = [],
  {
    randomValue,
    seed,
    getWeight = (item) => item?.weight,
  } = {},
) => {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      item: null,
      index: -1,
      reason: 'empty_items',
    }
  }

  const weightedItems = items
    .map((item, index) => ({
      item,
      index,
      weight: Math.max(0, Number(getWeight(item, index)) || 0),
    }))
    .filter((entry) => entry.weight > 0)

  if (weightedItems.length === 0) {
    return {
      item: null,
      index: -1,
      reason: 'empty_weights',
    }
  }

  const totalWeight = weightedItems.reduce((sum, entry) => sum + entry.weight, 0)
  const resolvedRandom = resolveRandomValue({ randomValue, seed })
  if (resolvedRandom.source === 'missing') {
    return {
      item: null,
      index: -1,
      randomValue: resolvedRandom.value,
      randomSource: resolvedRandom.source,
      reason: 'random_missing',
    }
  }
  const roll = Math.min(totalWeight - Number.EPSILON, resolvedRandom.value * totalWeight)
  let cursor = 0

  for (const entry of weightedItems) {
    cursor += entry.weight
    if (roll < cursor) {
      return {
        item: entry.item,
        index: entry.index,
        weight: entry.weight,
        totalWeight,
        randomValue: resolvedRandom.value,
        randomSource: resolvedRandom.source,
        reason: 'weighted_item_selected',
      }
    }
  }

  const fallbackEntry = weightedItems[weightedItems.length - 1]
  return {
    item: fallbackEntry.item,
    index: fallbackEntry.index,
    weight: fallbackEntry.weight,
    totalWeight,
    randomValue: resolvedRandom.value,
    randomSource: resolvedRandom.source,
    reason: 'weighted_item_selected',
  }
}
