import { extractAssistantPayloadText, parseAssistantJsonPayload } from '../chat-response'
import { createAiContextEnvelope } from '../ai-context-envelope'
import {
  EVENT_INSTANCE_LIFECYCLE,
  EVENT_TEXT_FAILURE_CODE,
  EVENT_TEXT_LIMITS,
  EVENT_TEXT_MODE,
  EVENT_TEXT_SOURCE,
  EVENT_TEXT_STATUS,
  cloneEventValue,
  normalizeEventComposerCopyV1,
  normalizeEventId,
  normalizeEventInstanceV1,
  normalizeEventTemplateV2,
  normalizeEventText,
} from './event-contracts'
import { normalizeEventComposerContext } from './event-instance-materializer'

const COPY_KEYS = new Set([
  'locale',
  'title',
  'opening',
  'environment',
  'dialogue',
  'choiceLabels',
  'consequenceByOutcomeId',
])
const TERMINAL_TEXT_STATUSES = new Set([
  EVENT_TEXT_STATUS.LOCAL_ONLY,
  EVENT_TEXT_STATUS.SUCCEEDED,
  EVENT_TEXT_STATUS.FALLBACK,
])
const HTML_PATTERN = /<\/?[a-z][^>]*>/i

const normalizeFailureCode = (error) => {
  const code = normalizeEventId(error?.code || error?.name, 80)
  if (code.includes('timeout') || code === 'aborterror') {
    return EVENT_TEXT_FAILURE_CODE.PROVIDER_TIMEOUT
  }
  if (code.includes('rate')) return EVENT_TEXT_FAILURE_CODE.RATE_LIMITED
  if (code.includes('quota')) return EVENT_TEXT_FAILURE_CODE.QUOTA_EXHAUSTED
  if (code.includes('offline') || code.includes('network')) return EVENT_TEXT_FAILURE_CODE.OFFLINE
  if (code.includes('content') || code.includes('safety')) {
    return EVENT_TEXT_FAILURE_CODE.CONTENT_REJECTED
  }
  if (code.includes('interrupt') || code.includes('abort')) {
    return EVENT_TEXT_FAILURE_CODE.REQUEST_INTERRUPTED
  }
  return EVENT_TEXT_FAILURE_CODE.PROVIDER_UNAVAILABLE
}

const getProviderCall = (providerAdapter) => {
  if (typeof providerAdapter === 'function') return providerAdapter
  if (typeof providerAdapter?.generateText === 'function') {
    return (input) => providerAdapter.generateText(input)
  }
  if (typeof providerAdapter?.callAI === 'function') {
    return (input) => providerAdapter.callAI(input)
  }
  return null
}

const getResponsePayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null
  const direct = response.normalizedCopy || response.copy
  if (direct && typeof direct === 'object') return direct
  const text = extractAssistantPayloadText(response)
  if (text) {
    const parsed = parseAssistantJsonPayload(text)
    return parsed?.normalizedCopy || parsed?.copy || parsed
  }
  if (response.title || response.opening) return response
  return null
}

const hasForbiddenMarkup = (value) => {
  if (typeof value === 'string') return HTML_PATTERN.test(value)
  if (Array.isArray(value)) return value.some(hasForbiddenMarkup)
  if (value && typeof value === 'object') return Object.values(value).some(hasForbiddenMarkup)
  return false
}

const hasExactCopyShape = (copy, allowedParticipantIds) => {
  if (!copy || typeof copy !== 'object' || Array.isArray(copy)) return false
  if (Object.keys(copy).some((key) => !COPY_KEYS.has(key))) return false
  if (hasForbiddenMarkup(copy)) return false
  const allowedParticipants = new Set(allowedParticipantIds)
  return !(
    Array.isArray(copy.dialogue) &&
    copy.dialogue.some((beat) => {
      const speakerRef = normalizeEventId(beat?.speakerRef)
      return speakerRef && !allowedParticipants.has(speakerRef)
    })
  )
}

const createRequestPayload = ({ instance, template, context }) => ({
  schemaVersion: 1,
  instanceId: instance.id,
  template: {
    id: template.id,
    version: template.version,
    archetypeId: template.archetypeId,
    choiceIds: template.choices.map((choice) => choice.id),
    outcomeIds: template.choices.map((choice) => choice.outcomeId),
  },
  world: {
    worldContextId: instance.world.worldContextId,
    worldPackId: instance.world.worldPackId,
    variantPackId: instance.world.variantPackId,
    digest: context.worldContextDigest,
  },
  place: {
    categoryId: instance.place.placeCategoryId,
    capabilityIds: instance.place.capabilityIds,
    sceneKey: instance.media.intent.sceneKey,
    toneTags: instance.media.intent.toneTags,
  },
  participants: context.participants,
  facts: context.facts,
  localCopy: instance.text.normalizedCopy,
})

const serializeBoundedRequest = (request) => {
  const bounded = cloneEventValue(request)
  let serialized = JSON.stringify(bounded)
  while (
    serialized.length > EVENT_TEXT_LIMITS.serializedRequestCharacters &&
    bounded.facts.length > 0
  ) {
    bounded.facts.pop()
    serialized = JSON.stringify(bounded)
  }
  if (serialized.length > EVENT_TEXT_LIMITS.serializedRequestCharacters) {
    bounded.world.digest = ''
    serialized = JSON.stringify(bounded)
  }
  return serialized.length <= EVENT_TEXT_LIMITS.serializedRequestCharacters
    ? { request: bounded, serialized }
    : null
}

const buildPromptContext = () =>
  createAiContextEnvelope({
    stableBlocks: [[
    'You compose display text for one SchatPhone event whose logic is already fixed locally.',
    'Return JSON only with keys: locale, title, opening, environment, dialogue, choiceLabels, consequenceByOutcomeId.',
    'Use every supplied choice ID exactly once and never invent choices, outcomes, participants, effects, places, facts, commands, HTML, or URLs.',
    'Do not change money, relationships, schedules, inventory, location, or any other canonical value.',
    ].join(' ')],
    cacheNamespace: 'event-text',
    cacheIdentity: 'composer',
  })

const createFallbackText = (instanceOrText, failureCode, provenance = {}) => {
  const baseText = instanceOrText?.text || instanceOrText
  return {
    ...baseText,
    status: EVENT_TEXT_STATUS.FALLBACK,
    source: EVENT_TEXT_SOURCE.LOCAL,
    attemptCount: Math.min(1, Math.max(0, Number(baseText?.attemptCount) || 0)),
    failureCode,
    provenance: {
      providerId: normalizeEventText(provenance.providerId, '', 160),
      modelId: normalizeEventText(provenance.modelId, '', 160),
      requestId: normalizeEventText(provenance.requestId, '', 180),
      generatedAt: Math.max(0, Math.floor(Number(provenance.generatedAt) || 0)),
    },
  }
}

const updateInstanceText = (instance, text, now) =>
  normalizeEventInstanceV1({
    ...instance,
    text,
    timestamps: {
      ...instance.timestamps,
      updatedAt: Math.max(instance.timestamps.updatedAt, Math.max(0, Math.floor(Number(now) || 0))),
    },
  })

const createNoCallResult = (instance, reason) => ({
  ok: reason === 'cached',
  instance,
  text: instance?.text || null,
  providerCallCount: 0,
  reason,
})

const callWithTimeout = async (providerCall, input, timeoutMs) => {
  const controller = new AbortController()
  let timeoutId = null
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      const error = new Error('Event text provider timeout')
      error.code = 'PROVIDER_TIMEOUT'
      reject(error)
    }, timeoutMs)
  })
  try {
    return await Promise.race([providerCall({ ...input, signal: controller.signal }), timeout])
  } finally {
    clearTimeout(timeoutId)
  }
}

export const composeEventTextV1 = async ({
  instance: rawInstance,
  template: rawTemplate,
  textMode = EVENT_TEXT_MODE.LOCAL_ONLY,
  context = {},
  contextHash = '',
  participantIds = [],
  providerAdapter = null,
  providerSettings = {},
  providerMetadata = {},
  instanceStore = null,
  timeoutMs = EVENT_TEXT_LIMITS.requestTimeoutMs,
  now = Date.now(),
} = {}) => {
  const instance = normalizeEventInstanceV1(rawInstance)
  const template = normalizeEventTemplateV2(rawTemplate)
  const finish = (result) => {
    const stored = result.instance && instanceStore?.upsertEventInstance?.(result.instance)
    return {
      ...result,
      cachePersisted: Boolean(stored),
    }
  }
  if (!instance || !template || template.id !== instance.templateRef.id) {
    return finish(createNoCallResult(instance, 'invalid_contract'))
  }
  if (TERMINAL_TEXT_STATUSES.has(instance.text.status) || instance.text.attemptCount >= 1) {
    return finish(createNoCallResult(instance, 'cached'))
  }
  if (
    instance.lifecycle !== EVENT_INSTANCE_LIFECYCLE.ACTIVE ||
    instance.choices.selectedId ||
    instance.choices.outcomeId
  ) {
    const next = updateInstanceText(
      instance,
      createFallbackText(instance, EVENT_TEXT_FAILURE_CODE.CONTEXT_STALE),
      now,
    )
    return finish(createNoCallResult(next, EVENT_TEXT_FAILURE_CODE.CONTEXT_STALE))
  }
  if (textMode !== EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY) {
    const next = updateInstanceText(
      instance,
      {
        ...instance.text,
        status: EVENT_TEXT_STATUS.LOCAL_ONLY,
        source: EVENT_TEXT_SOURCE.LOCAL,
        failureCode: '',
      },
      now,
    )
    return finish(createNoCallResult(next, EVENT_TEXT_FAILURE_CODE.TEXT_MODE_LOCAL_ONLY))
  }
  const expectedContextHash = normalizeEventText(contextHash, instance.text.contextHash, 180)
  if (expectedContextHash !== instance.text.contextHash) {
    const next = updateInstanceText(
      instance,
      createFallbackText(instance, EVENT_TEXT_FAILURE_CODE.CONTEXT_STALE),
      now,
    )
    return finish(createNoCallResult(next, EVENT_TEXT_FAILURE_CODE.CONTEXT_STALE))
  }
  const providerCall = getProviderCall(providerAdapter)
  if (!providerCall) {
    const next = updateInstanceText(
      instance,
      createFallbackText(instance, EVENT_TEXT_FAILURE_CODE.PROVIDER_DISABLED),
      now,
    )
    return finish(createNoCallResult(next, EVENT_TEXT_FAILURE_CODE.PROVIDER_DISABLED))
  }

  const normalizedContext = normalizeEventComposerContext(context)
  const boundedRequest = serializeBoundedRequest(
    createRequestPayload({ instance, template, context: normalizedContext }),
  )
  if (!boundedRequest) {
    const next = updateInstanceText(
      instance,
      createFallbackText(instance, EVENT_TEXT_FAILURE_CODE.INVALID_SCHEMA),
      now,
    )
    return finish(createNoCallResult(next, EVENT_TEXT_FAILURE_CODE.INVALID_SCHEMA))
  }
  const attemptedText = { ...instance.text, attemptCount: 1 }
  const allowedChoiceIds = template.choices.map((choice) => choice.id)
  const allowedOutcomeIds = template.choices.map((choice) => choice.outcomeId)
  const allowedParticipantIds = [
    ...new Set([
      ...participantIds.map((item) => normalizeEventId(item)).filter(Boolean),
      ...normalizedContext.participants.map((item) => item.id),
    ]),
  ]

  try {
    const promptContext = buildPromptContext()
    const response = await callWithTimeout(
      providerCall,
      {
        eventRequest: boundedRequest.request,
        messages: [{ role: 'user', content: boundedRequest.serialized }],
        systemPrompt: promptContext.systemPrompt,
        contextEnvelope: promptContext,
        settings: providerSettings,
      },
      Math.min(
        EVENT_TEXT_LIMITS.requestTimeoutMs,
        Math.max(1, Math.floor(Number(timeoutMs) || EVENT_TEXT_LIMITS.requestTimeoutMs)),
      ),
    )
    const payload = getResponsePayload(response)
    const normalizedCopy = hasExactCopyShape(payload, allowedParticipantIds)
      ? normalizeEventComposerCopyV1(payload, {
          choiceIds: allowedChoiceIds,
          outcomeIds: allowedOutcomeIds,
          participantIds: allowedParticipantIds,
        })
      : null
    const responseMeta = response?.meta || response?.provenance || {}
    const provenance = {
      providerId:
        response?.providerId || responseMeta.providerId || providerMetadata.providerId || '',
      modelId: response?.modelId || responseMeta.modelId || providerMetadata.modelId || '',
      requestId: response?.requestId || responseMeta.requestId || '',
      generatedAt: Math.max(0, Math.floor(Number(now) || 0)),
    }
    const text = normalizedCopy
      ? {
          ...attemptedText,
          status: EVENT_TEXT_STATUS.SUCCEEDED,
          source: EVENT_TEXT_SOURCE.AI,
          failureCode: '',
          provenance,
          normalizedCopy,
        }
      : createFallbackText(attemptedText, EVENT_TEXT_FAILURE_CODE.INVALID_SCHEMA, provenance)
    const next = updateInstanceText(instance, text, now)
    return finish({
      ok: Boolean(normalizedCopy),
      instance: next,
      text: next.text,
      providerCallCount: 1,
      reason: normalizedCopy ? 'ai_text_materialized' : EVENT_TEXT_FAILURE_CODE.INVALID_SCHEMA,
    })
  } catch (error) {
    const failureCode = normalizeFailureCode(error)
    const next = updateInstanceText(
      instance,
      createFallbackText(attemptedText, failureCode, {
        providerId: providerMetadata.providerId,
        modelId: providerMetadata.modelId,
        generatedAt: now,
      }),
      now,
    )
    return finish({
      ok: false,
      instance: next,
      text: next.text,
      providerCallCount: 1,
      reason: failureCode,
    })
  }
}
