import {
  cloneEventValue,
  isEventPlainObject,
  normalizeEventId,
  normalizeEventText,
} from './event-contracts'

export const COMMERCE_CONTRACT_SCHEMA_VERSION = 1
export const EVENT_INSTANCE_V2_SCHEMA_VERSION = 2

export const COMMERCE_OWNER_MODULE = Object.freeze({
  FOOD_DELIVERY: 'food_delivery',
  SHOPPING: 'shopping',
})

export const COMMERCE_INTERACTION_ENTRY_SURFACE = Object.freeze({
  OWNER_APP: 'owner_app',
  CHAT_SERVICE_ACCOUNT: 'chat_service_account',
})

export const COMMERCE_INTERACTION_CHANNEL = Object.freeze({
  MERCHANT: 'merchant',
  RIDER: 'rider',
  PLATFORM: 'platform',
})

export const COMMERCE_SERVICE_CASE_STATUS = Object.freeze({
  OPEN: 'open',
  WAITING_OWNER: 'waiting_owner',
  WAITING_USER: 'waiting_user',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
})

export const INTERACTION_RESOLUTION_STATUS = Object.freeze({
  PROPOSED: 'proposed',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
})

export const DESTINATION_CHANGE_RESOLUTION_OUTCOME = Object.freeze({
  ACCEPTED: 'accepted_new_destination',
  DECLINED: 'declined_destination_change',
  UNCLEAR: 'no_clear_commitment',
  NOT_CONNECTED: 'call_not_connected',
})

export const EVENT_INSTANCE_V2_LIFECYCLE = Object.freeze({
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
})

export const EVENT_NODE_KIND = Object.freeze({
  CONDITION: 'condition',
  BRANCH: 'branch',
  RANDOM_GATE: 'random_gate',
  AWAIT_FACT: 'await_fact',
  TIMEOUT: 'timeout',
  REQUEST_ACTION: 'request_action',
  TERMINAL: 'terminal',
})

export const OWNER_ACTION_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
})

const COMMERCE_OWNER_MODULES = new Set(Object.values(COMMERCE_OWNER_MODULE))
const ENTRY_SURFACES = new Set(Object.values(COMMERCE_INTERACTION_ENTRY_SURFACE))
const INTERACTION_CHANNELS = new Set(Object.values(COMMERCE_INTERACTION_CHANNEL))
const SERVICE_CASE_STATUSES = new Set(Object.values(COMMERCE_SERVICE_CASE_STATUS))
const RESOLUTION_STATUSES = new Set(Object.values(INTERACTION_RESOLUTION_STATUS))
const DESTINATION_CHANGE_OUTCOMES = new Set(Object.values(DESTINATION_CHANGE_RESOLUTION_OUTCOME))
const EVENT_INSTANCE_V2_LIFECYCLES = new Set(Object.values(EVENT_INSTANCE_V2_LIFECYCLE))
const OWNER_ACTION_REQUEST_STATUSES = new Set(Object.values(OWNER_ACTION_REQUEST_STATUS))

const normalizeTimestamp = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : Math.max(0, fallback)
}

const normalizeRevision = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : Math.max(0, fallback)
}

const normalizeIdList = (items, limit = 24) => {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  const output = []
  items.forEach((item) => {
    const id = normalizeEventId(item, 220)
    if (!id || seen.has(id)) return
    seen.add(id)
    output.push(id)
  })
  return output.slice(0, limit)
}

const normalizeRoute = (value) => {
  const route = normalizeEventText(value, '', 300)
  return route.startsWith('/') && !route.startsWith('//') ? route : ''
}

const normalizeReferenceRecord = (rawRecord, { maxEntries = 24 } = {}) => {
  if (!isEventPlainObject(rawRecord)) return {}
  return Object.fromEntries(
    Object.entries(rawRecord)
      .map(([rawKey, rawValue]) => {
        const key = normalizeEventId(rawKey, 100)
        if (!key) return null
        if (typeof rawValue === 'boolean') return [key, rawValue]
        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) return [key, rawValue]
        if (typeof rawValue === 'string') {
          const value = normalizeEventText(rawValue, '', 300)
          return value ? [key, value] : null
        }
        if (isEventPlainObject(rawValue)) {
          const kind = normalizeEventId(rawValue.kind, 80)
          const id = normalizeEventText(rawValue.id, '', 220)
          const revision = normalizeRevision(rawValue.revision)
          return kind && id ? [key, { kind, id, revision }] : null
        }
        return null
      })
      .filter(Boolean)
      .slice(0, maxEntries),
  )
}

export const normalizeCommerceOrderReferenceV1 = (rawReference, { mutationCapable = false } = {}) => {
  if (!isEventPlainObject(rawReference) || Number(rawReference.schemaVersion || 1) !== 1) return null
  const ownerModule = normalizeEventId(rawReference.ownerModule, 80)
  const orderId = normalizeEventText(rawReference.orderId, '', 180)
  const ownerRevision = normalizeRevision(rawReference.ownerRevision)
  if (!COMMERCE_OWNER_MODULES.has(ownerModule) || !orderId || (mutationCapable && ownerRevision < 1)) {
    return null
  }
  return {
    schemaVersion: COMMERCE_CONTRACT_SCHEMA_VERSION,
    ownerModule,
    orderId,
    merchantId: normalizeEventText(rawReference.merchantId, '', 180),
    fulfillmentId: normalizeEventText(rawReference.fulfillmentId, '', 180),
    lineItemIds: normalizeIdList(rawReference.lineItemIds, 40),
    ownerRevision,
    sourceRoute: normalizeRoute(rawReference.sourceRoute),
  }
}

export const normalizeCommerceInteractionTriggerV1 = (rawTrigger) => {
  if (!isEventPlainObject(rawTrigger) || Number(rawTrigger.schemaVersion || 1) !== 1) return null
  const id = normalizeEventText(rawTrigger.id, '', 220)
  const kind = normalizeEventId(rawTrigger.kind, 120)
  const initiatedBy = normalizeEventId(rawTrigger.initiatedBy, 40)
  const entrySurface = normalizeEventId(rawTrigger.entrySurface, 80)
  const channel = normalizeEventId(rawTrigger.channel, 40)
  const userAction = normalizeEventId(rawTrigger.userAction, 120)
  const orderRef = normalizeCommerceOrderReferenceV1(rawTrigger.orderRef, { mutationCapable: true })
  const sourceMessageOwner = normalizeEventId(rawTrigger.sourceMessageRef?.ownerModule, 80)
  const sourceMessageId = normalizeEventText(rawTrigger.sourceMessageRef?.messageId, '', 220)
  const occurredAt = normalizeTimestamp(rawTrigger.occurredAt)
  if (
    !id ||
    kind !== 'commerce.user_service_interaction' ||
    initiatedBy !== 'user' ||
    !ENTRY_SURFACES.has(entrySurface) ||
    !INTERACTION_CHANNELS.has(channel) ||
    !userAction ||
    !orderRef ||
    !occurredAt
  ) {
    return null
  }
  if (entrySurface === COMMERCE_INTERACTION_ENTRY_SURFACE.CHAT_SERVICE_ACCOUNT) {
    if (sourceMessageOwner !== 'chat' || !sourceMessageId) return null
  } else if (!sourceMessageId || sourceMessageOwner !== orderRef.ownerModule) {
    return null
  }
  return {
    schemaVersion: COMMERCE_CONTRACT_SCHEMA_VERSION,
    id,
    kind,
    initiatedBy,
    entrySurface,
    channel,
    userAction,
    orderRef,
    sourceMessageRef: { ownerModule: sourceMessageOwner, messageId: sourceMessageId },
    occurredAt,
  }
}

export const normalizeCommerceServiceCaseReferenceV1 = (rawReference) => {
  if (!isEventPlainObject(rawReference) || Number(rawReference.schemaVersion || 1) !== 1) return null
  const ownerModule = normalizeEventId(rawReference.ownerModule, 80)
  const caseId = normalizeEventText(rawReference.caseId, '', 220)
  const orderId = normalizeEventText(rawReference.orderId, '', 180)
  const caseType = normalizeEventId(rawReference.caseType, 120)
  const status = normalizeEventId(rawReference.status, 60)
  const sourceInteractionId = normalizeEventText(rawReference.sourceInteractionId, '', 220)
  const ownerRevision = normalizeRevision(rawReference.ownerRevision)
  if (
    !COMMERCE_OWNER_MODULES.has(ownerModule) ||
    !caseId ||
    !orderId ||
    !caseType ||
    !SERVICE_CASE_STATUSES.has(status) ||
    !sourceInteractionId ||
    ownerRevision < 1
  ) {
    return null
  }
  return {
    schemaVersion: COMMERCE_CONTRACT_SCHEMA_VERSION,
    ownerModule,
    caseId,
    orderId,
    caseType,
    status,
    sourceInteractionId,
    ownerRevision,
  }
}

export const normalizeOwnerFactV1 = (rawFact) => {
  if (!isEventPlainObject(rawFact) || Number(rawFact.schemaVersion || 1) !== 1) return null
  const id = normalizeEventText(rawFact.id, '', 220)
  const type = normalizeEventId(rawFact.type, 180)
  const sourceModule = normalizeEventId(rawFact.sourceModule, 80)
  const subjectKind = normalizeEventId(rawFact.subjectRef?.kind, 80)
  const subjectId = normalizeEventText(rawFact.subjectRef?.id, '', 220)
  const subjectRevision = normalizeRevision(rawFact.subjectRef?.revision)
  const resultCode = normalizeEventId(rawFact.resultCode, 160)
  const occurredAt = normalizeTimestamp(rawFact.occurredAt)
  if (!id || !type.includes('.') || !sourceModule || !subjectKind || !subjectId || !resultCode || !occurredAt) {
    return null
  }
  if (!type.startsWith(`${sourceModule}.`)) return null
  return {
    schemaVersion: COMMERCE_CONTRACT_SCHEMA_VERSION,
    id,
    type,
    sourceModule,
    subjectRef: { kind: subjectKind, id: subjectId, revision: subjectRevision },
    correlationId: normalizeEventText(rawFact.correlationId, '', 220),
    causationId: normalizeEventText(rawFact.causationId, '', 220),
    resultCode,
    refs: normalizeReferenceRecord(rawFact.refs),
    occurredAt,
  }
}

export const normalizeOwnerActionRequestV1 = (rawRequest) => {
  if (!isEventPlainObject(rawRequest) || Number(rawRequest.schemaVersion || 1) !== 1) return null
  const id = normalizeEventText(rawRequest.id, '', 220)
  const actionKey = normalizeEventId(rawRequest.actionKey, 180)
  const targetModule = normalizeEventId(rawRequest.targetModule, 80)
  const requestedByInstanceId = normalizeEventText(rawRequest.requestedByInstanceId, '', 220)
  const idempotencyKey = normalizeEventText(rawRequest.idempotencyKey, '', 260)
  const status = normalizeEventId(rawRequest.status, 40) || OWNER_ACTION_REQUEST_STATUS.PENDING
  if (
    !id ||
    !actionKey.startsWith(`${targetModule}.`) ||
    !targetModule ||
    !requestedByInstanceId ||
    !idempotencyKey ||
    !OWNER_ACTION_REQUEST_STATUSES.has(status)
  ) {
    return null
  }
  return {
    schemaVersion: COMMERCE_CONTRACT_SCHEMA_VERSION,
    id,
    actionKey,
    targetModule,
    requestedByInstanceId,
    contextRefs: normalizeReferenceRecord(rawRequest.contextRefs),
    idempotencyKey,
    status,
    resultFactId: normalizeEventText(rawRequest.resultFactId, '', 220),
    requestedAt: normalizeTimestamp(rawRequest.requestedAt),
  }
}

const normalizeCommitment = (rawCommitment) => {
  if (!isEventPlainObject(rawCommitment)) return null
  const actorRef = normalizeEventText(rawCommitment.actorRef, '', 180)
  const action = normalizeEventId(rawCommitment.action, 120)
  const objectRef = normalizeEventText(rawCommitment.objectRef, '', 220)
  const status = normalizeEventId(rawCommitment.status, 40)
  const evidenceMessageIds = normalizeIdList(rawCommitment.evidenceMessageIds, 12)
  if (!actorRef || !action || !objectRef || !['accepted', 'declined', 'unclear'].includes(status)) return null
  return { actorRef, action, objectRef, status, evidenceMessageIds }
}

export const normalizeInteractionResolutionV1 = (rawResolution) => {
  if (!isEventPlainObject(rawResolution) || Number(rawResolution.schemaVersion || 1) !== 1) return null
  const ownerModule = normalizeEventId(rawResolution.ownerModule, 80)
  const sessionId = normalizeEventText(rawResolution.sessionId, '', 220)
  const resolutionContractKey = normalizeEventId(rawResolution.resolutionContractKey, 180)
  const outcomeCode = normalizeEventId(rawResolution.outcomeCode, 120)
  const status = normalizeEventId(rawResolution.status, 40)
  const commitments = Array.isArray(rawResolution.commitments)
    ? rawResolution.commitments.map(normalizeCommitment).filter(Boolean).slice(0, 12)
    : []
  const resolvedAt = normalizeTimestamp(rawResolution.resolvedAt)
  if (
    ownerModule !== 'phone' ||
    !sessionId ||
    resolutionContractKey !== 'commerce.destination_change.v1' ||
    !DESTINATION_CHANGE_OUTCOMES.has(outcomeCode) ||
    !RESOLUTION_STATUSES.has(status) ||
    !resolvedAt
  ) {
    return null
  }
  if (outcomeCode === DESTINATION_CHANGE_RESOLUTION_OUTCOME.ACCEPTED) {
    const accepted = commitments.some(
      (item) => item.action === 'change_destination' && item.status === 'accepted' && item.evidenceMessageIds.length > 0,
    )
    if (!accepted) return null
  }
  return {
    schemaVersion: COMMERCE_CONTRACT_SCHEMA_VERSION,
    ownerModule,
    sessionId,
    resolutionContractKey,
    outcomeCode,
    status,
    commitments,
    resolvedAt,
  }
}

export const normalizeMapJourneyEstimateReferenceV1 = (rawReference) => {
  if (!isEventPlainObject(rawReference) || Number(rawReference.schemaVersion || 1) !== 1) return null
  const journeyId = normalizeEventText(rawReference.journeyId, '', 220)
  const journeyRevision = normalizeRevision(rawReference.journeyRevision)
  const state = normalizeEventId(rawReference.state, 80)
  const etaAt = normalizeTimestamp(rawReference.etaAt)
  const remainingSeconds = normalizeRevision(rawReference.remainingSeconds)
  const calculatedAt = normalizeTimestamp(rawReference.calculatedAt)
  const sourceModule = normalizeEventId(rawReference.sourceModule, 80)
  if (!journeyId || journeyRevision < 1 || !state || !etaAt || !calculatedAt || sourceModule !== 'map') return null
  return {
    schemaVersion: COMMERCE_CONTRACT_SCHEMA_VERSION,
    journeyId,
    journeyRevision,
    state,
    etaAt,
    remainingSeconds,
    calculatedAt,
    sourceModule,
  }
}

const normalizeDecision = (rawDecision) => {
  if (!isEventPlainObject(rawDecision)) return null
  const key = normalizeEventId(rawDecision.key, 160)
  const outcome = normalizeEventId(rawDecision.outcome, 120)
  const decidedAt = normalizeTimestamp(rawDecision.decidedAt)
  if (!key || !outcome || !decidedAt) return null
  return {
    key,
    outcome,
    randomValue: Number.isFinite(Number(rawDecision.randomValue))
      ? Math.min(1, Math.max(0, Number(rawDecision.randomValue)))
      : null,
    seed: normalizeEventText(rawDecision.seed, '', 240),
    decidedAt,
  }
}

const normalizeDeadline = (rawDeadline) => {
  if (!isEventPlainObject(rawDeadline)) return null
  const id = normalizeEventId(rawDeadline.id, 160)
  const dueAt = normalizeTimestamp(rawDeadline.dueAt)
  if (!id || !dueAt) return null
  return {
    id,
    dueAt,
    reconciledAt: normalizeTimestamp(rawDeadline.reconciledAt),
  }
}

export const normalizeEventInstanceV2 = (rawInstance) => {
  if (!isEventPlainObject(rawInstance) || Number(rawInstance.schemaVersion) !== 2) return null
  const id = normalizeEventText(rawInstance.id, '', 220)
  const templateId = normalizeEventId(rawInstance.templateId, 220)
  const lifecycle = normalizeEventId(rawInstance.lifecycle, 40)
  const currentNodeId = normalizeEventId(rawInstance.currentNodeId, 180)
  const createdAt = normalizeTimestamp(rawInstance.createdAt)
  const updatedAt = normalizeTimestamp(rawInstance.updatedAt)
  if (
    !id ||
    !templateId ||
    !EVENT_INSTANCE_V2_LIFECYCLES.has(lifecycle) ||
    !currentNodeId ||
    !createdAt ||
    updatedAt < createdAt
  ) {
    return null
  }
  const decisionLedger = Array.isArray(rawInstance.decisionLedger)
    ? rawInstance.decisionLedger.map(normalizeDecision).filter(Boolean).slice(0, 80)
    : []
  const deadlines = Array.isArray(rawInstance.deadlines)
    ? rawInstance.deadlines.map(normalizeDeadline).filter(Boolean).slice(0, 40)
    : []
  const pendingOwnerRequests = Array.isArray(rawInstance.pendingOwnerRequests)
    ? rawInstance.pendingOwnerRequests.map(normalizeOwnerActionRequestV1).filter(Boolean).slice(0, 40)
    : []
  if (
    new Set(decisionLedger.map((item) => item.key)).size !== decisionLedger.length ||
    new Set(deadlines.map((item) => item.id)).size !== deadlines.length ||
    new Set(pendingOwnerRequests.map((item) => item.idempotencyKey)).size !== pendingOwnerRequests.length
  ) {
    return null
  }
  return {
    schemaVersion: EVENT_INSTANCE_V2_SCHEMA_VERSION,
    id,
    templateId,
    lifecycle,
    currentNodeId,
    contextRefs: normalizeReferenceRecord(rawInstance.contextRefs, { maxEntries: 40 }),
    decisionLedger,
    deadlines,
    pendingOwnerRequests,
    observedFactIds: normalizeIdList(rawInstance.observedFactIds, 120),
    resultCodes: normalizeIdList(rawInstance.resultCodes, 80),
    createdAt,
    updatedAt,
  }
}

export const normalizeEventInstancesV2 = (rawInstances) => {
  if (!Array.isArray(rawInstances)) return { instances: [], rejected: [], inputCount: 0 }
  const instances = []
  const rejected = []
  const seen = new Set()
  rawInstances.forEach((rawInstance, index) => {
    const instance = normalizeEventInstanceV2(rawInstance)
    if (!instance) {
      rejected.push({ index, id: normalizeEventText(rawInstance?.id, '', 220), reason: 'invalid_instance_v2' })
      return
    }
    if (seen.has(instance.id)) {
      rejected.push({ index, id: instance.id, reason: 'duplicate_instance_id' })
      return
    }
    seen.add(instance.id)
    instances.push(instance)
  })
  return { instances, rejected, inputCount: rawInstances.length }
}

export const cloneCommerceContract = (value) => cloneEventValue(value)
