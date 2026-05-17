import { evaluateConditions } from './condition-evaluator'
import { evaluateRandomGate } from './random'

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeTriggerSource = (value, fallback = 'manual') =>
  normalizeText(value, fallback, 40)

const getTemplateTriggerModes = (template = {}) =>
  Array.isArray(template.triggerModes) ? template.triggerModes : ['manual']

const createDayKey = (at = Date.now()) => {
  const date = new Date(Number.isFinite(Number(at)) ? Number(at) : Date.now())
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

const createSkippedResult = ({
  template,
  evaluation,
  simulationStore,
  targetId = '',
  adapterKey = '',
  now = Date.now(),
  reason = '',
  variant,
  variantPack,
  worldContext,
} = {}) => {
  const skippedLogInput = createEventExecutionLogInput(template, evaluation, {
    targetId,
    adapterKey,
    at: now,
    status: 'skipped',
    reason: reason || evaluation.reason,
    variant,
    variantPack,
    worldContext,
  })
  const log = simulationStore?.recordEventLog?.(skippedLogInput) || skippedLogInput
  return {
    ok: false,
    status: 'skipped',
    evaluation: {
      ...evaluation,
      reason: reason || evaluation.reason,
    },
    adapterResult: null,
    log,
  }
}

export const isTriggerSourceAllowed = (template = {}, triggerSource = 'manual') => {
  const normalizedTriggerSource = normalizeTriggerSource(triggerSource)
  return getTemplateTriggerModes(template).includes(normalizedTriggerSource)
}

export const evaluateEventEligibility = (
  template = {},
  context = {},
  { triggerSource = 'manual' } = {},
) => {
  const eventId = normalizeText(template.id || template.eventId, '', 160)
  const moduleKey = normalizeText(template.moduleKey, 'simulation', 80)
  const normalizedTriggerSource = normalizeTriggerSource(triggerSource)

  if (!eventId) {
    return {
      eligible: false,
      eventId,
      moduleKey,
      triggerSource: normalizedTriggerSource,
      reason: 'missing_event_id',
      conditions: evaluateConditions([], context),
    }
  }

  if (!isTriggerSourceAllowed(template, normalizedTriggerSource)) {
    return {
      eligible: false,
      eventId,
      moduleKey,
      triggerSource: normalizedTriggerSource,
      reason: 'trigger_source_not_allowed',
      conditions: evaluateConditions([], context),
    }
  }

  const conditionResult = evaluateConditions(template.conditions, context)
  return {
    eligible: conditionResult.passed,
    eventId,
    moduleKey,
    triggerSource: normalizedTriggerSource,
    reason: conditionResult.passed ? 'eligible' : conditionResult.reason,
    conditions: conditionResult,
  }
}

export const evaluateEventTemplate = (
  template = {},
  context = {},
  {
    triggerSource = 'manual',
    randomValue,
    seed,
  } = {},
) => {
  const eligibility = evaluateEventEligibility(template, context, { triggerSource })
  if (!eligibility.eligible) {
    return {
      ...eligibility,
      passed: false,
      random: null,
      reason: eligibility.reason,
    }
  }

  if (eligibility.triggerSource !== 'random') {
    return {
      ...eligibility,
      passed: true,
      random: null,
      reason: 'eligible_non_random',
    }
  }

  const randomResult = evaluateRandomGate({
    probability: template.probability,
    randomValue,
    seed,
  })

  return {
    ...eligibility,
    passed: randomResult.passed,
    random: randomResult,
    reason: randomResult.passed ? 'eligible_random_passed' : randomResult.reason,
  }
}

export const createEventExecutionLogInput = (
  template = {},
  evaluation = {},
  {
    targetId = '',
    adapterKey,
    at = Date.now(),
    status,
    reason,
    variant,
    variantPack,
    worldContext,
  } = {},
) => ({
  eventId: normalizeText(template.id || evaluation.eventId, '', 160),
  moduleKey: normalizeText(template.moduleKey || evaluation.moduleKey, 'simulation', 80),
  targetId: normalizeText(targetId, '', 160),
  adapterKey: normalizeText(adapterKey || template.effect?.adapterKey, '', 160),
  triggerSource: normalizeTriggerSource(evaluation.triggerSource),
  status: normalizeText(status, evaluation.passed ? 'triggered' : 'skipped', 40),
  reason: normalizeText(reason || evaluation.reason, '', 220),
  variantId: normalizeText(variant?.id, '', 180),
  variantPackId: normalizeText(variantPack?.id, '', 180),
  worldContextId: normalizeText(worldContext?.id || variantPack?.worldContextId, '', 180),
  activeWorldBookIds: Array.isArray(worldContext?.activeWorldBookIds)
    ? worldContext.activeWorldBookIds
    : Array.isArray(variantPack?.activeWorldBookIds)
      ? variantPack.activeWorldBookIds
      : [],
  at,
})

export const runEventAdapter = ({
  template,
  context = {},
  adapters = {},
  triggerSource = 'manual',
  randomValue,
  seed,
  targetId = '',
  now = Date.now(),
  simulationStore,
  variant,
  variantPack,
  worldContext,
} = {}) => {
  const evaluation = evaluateEventTemplate(template, context, {
    triggerSource,
    randomValue,
    seed,
  })
  const adapterKey = normalizeText(template?.effect?.adapterKey, '', 160)

  if (!evaluation.passed) {
    return createSkippedResult({
      template,
      evaluation,
      simulationStore,
      targetId,
      adapterKey,
      now,
      variant,
      variantPack,
      worldContext,
    })
  }

  if (simulationStore?.isCoolingDown?.(evaluation.eventId, { targetId, at: now })) {
    return createSkippedResult({
      template,
      evaluation,
      simulationStore,
      targetId,
      adapterKey,
      now,
      reason: 'cooldown_active',
      variant,
      variantPack,
      worldContext,
    })
  }

  if (
    simulationStore?.canUseDailyQuota &&
    !simulationStore.canUseDailyQuota(evaluation.eventId, {
      targetId,
      dayKey: createDayKey(now),
      limit: template.dailyLimit,
    })
  ) {
    return createSkippedResult({
      template,
      evaluation,
      simulationStore,
      targetId,
      adapterKey,
      now,
      reason: 'daily_limit_reached',
      variant,
      variantPack,
      worldContext,
    })
  }

  const adapter = adapters[adapterKey]
  if (typeof adapter !== 'function') {
    const failedLogInput = createEventExecutionLogInput(template, evaluation, {
      targetId,
      adapterKey,
      at: now,
      status: 'failed',
      reason: 'adapter_missing',
      variant,
      variantPack,
      worldContext,
    })
    const log = simulationStore?.recordEventLog?.(failedLogInput) || failedLogInput
    return {
      ok: false,
      status: 'failed',
      evaluation,
      adapterResult: null,
      log,
    }
  }

  let adapterResult = null
  let adapterError = null
  try {
    adapterResult = adapter({ template, context, evaluation, targetId, now })
  } catch (error) {
    adapterError = error
  }
  const triggeredLogInput = createEventExecutionLogInput(template, evaluation, {
    targetId,
    adapterKey,
    at: now,
    status: adapterResult ? 'triggered' : 'failed',
    reason: adapterResult ? evaluation.reason : adapterError ? 'adapter_threw' : 'adapter_returned_empty',
    variant,
    variantPack,
    worldContext,
  })
  const log =
    simulationStore?.recordEventTrigger?.({
      ...triggeredLogInput,
      cooldownMs: template.cooldownMs,
      dailyLimit: template.dailyLimit,
    }) ||
    simulationStore?.recordEventLog?.(triggeredLogInput) ||
    triggeredLogInput

  return {
    ok: Boolean(adapterResult),
    status: adapterResult ? 'triggered' : 'failed',
    evaluation,
    adapterResult,
    adapterError,
    log,
  }
}
