const OPERATORS = new Set(['eq', 'not_eq', 'in', 'not_in', 'gt', 'gte', 'lt', 'lte', 'exists'])

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

export const getByPath = (source, path) => {
  const normalizedPath = normalizeText(path, '', 240)
  if (!normalizedPath) return source
  if (!source || typeof source !== 'object') return undefined

  return normalizedPath.split('.').reduce((current, segment) => {
    if (current == null) return undefined
    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      return current[Number(segment)]
    }
    if (typeof current !== 'object') return undefined
    return current[segment]
  }, source)
}

const compareNumbers = (actual, expected, compare) => {
  const actualNum = Number(actual)
  const expectedNum = Number(expected)
  if (!Number.isFinite(actualNum) || !Number.isFinite(expectedNum)) return false
  return compare(actualNum, expectedNum)
}

const evaluateOperator = (actual, op, expected) => {
  if (op === 'exists') return actual !== undefined && actual !== null && actual !== ''
  if (op === 'eq') return actual === expected
  if (op === 'not_eq') return actual !== expected
  if (op === 'in') return Array.isArray(expected) && expected.includes(actual)
  if (op === 'not_in') return Array.isArray(expected) && !expected.includes(actual)
  if (op === 'gt') return compareNumbers(actual, expected, (left, right) => left > right)
  if (op === 'gte') return compareNumbers(actual, expected, (left, right) => left >= right)
  if (op === 'lt') return compareNumbers(actual, expected, (left, right) => left < right)
  if (op === 'lte') return compareNumbers(actual, expected, (left, right) => left <= right)
  return false
}

export const evaluateCondition = (condition, context = {}) => {
  if (!condition || typeof condition !== 'object') {
    return {
      passed: false,
      key: '',
      op: '',
      actual: undefined,
      expected: undefined,
      reason: 'invalid_condition',
    }
  }

  const key = normalizeText(condition.key || condition.path, '', 240)
  const op = normalizeText(condition.op || condition.operator, 'eq', 40)
  if (!key || !OPERATORS.has(op)) {
    return {
      passed: false,
      key,
      op,
      actual: undefined,
      expected: condition.value,
      reason: !key ? 'missing_key' : 'unsupported_operator',
    }
  }

  const actual = getByPath(context, key)
  const passed = evaluateOperator(actual, op, condition.value)

  return {
    passed,
    key,
    op,
    actual,
    expected: condition.value,
    reason: passed ? 'condition_passed' : 'condition_failed',
  }
}

export const evaluateConditions = (conditions = [], context = {}) => {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return {
      passed: true,
      results: [],
      reason: 'no_conditions',
    }
  }

  const results = conditions.map((condition) => evaluateCondition(condition, context))
  const passed = results.every((result) => result.passed)

  return {
    passed,
    results,
    reason: passed ? 'conditions_passed' : 'conditions_failed',
  }
}
