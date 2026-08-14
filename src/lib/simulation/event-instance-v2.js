import {
  EVENT_INSTANCE_V2_LIFECYCLE,
  EVENT_NODE_KIND,
  OWNER_ACTION_REQUEST_STATUS,
  normalizeEventInstanceV2,
  normalizeOwnerActionRequestV1,
  normalizeOwnerFactV1,
} from './commerce-interaction-contracts'
import { cloneEventValue, isEventPlainObject, normalizeEventId, normalizeEventText } from './event-contracts'
import { pickWeightedItem } from './random'

const EVENT_NODE_KINDS = new Set(Object.values(EVENT_NODE_KIND))
const CONDITION_OPERATORS = new Set(['equals', 'in', 'exists'])
const TERMINAL_LIFECYCLES = new Set([
  EVENT_INSTANCE_V2_LIFECYCLE.RESOLVED,
  EVENT_INSTANCE_V2_LIFECYCLE.FAILED,
  EVENT_INSTANCE_V2_LIFECYCLE.CANCELLED,
])

const normalizeTimestamp = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : Math.max(0, fallback)
}

const normalizeNodeId = (value) => normalizeEventId(value, 180)

const normalizeNode = (rawNode) => {
  if (!isEventPlainObject(rawNode)) return null
  const id = normalizeNodeId(rawNode.id)
  const kind = normalizeEventId(rawNode.kind, 60)
  if (!id || !EVENT_NODE_KINDS.has(kind)) return null
  if (kind === EVENT_NODE_KIND.CONDITION) {
    const contextKey = normalizeEventId(rawNode.contextKey, 120)
    const operator = normalizeEventId(rawNode.operator, 40)
    const onTrue = normalizeNodeId(rawNode.onTrue)
    const onFalse = normalizeNodeId(rawNode.onFalse)
    if (!contextKey || !CONDITION_OPERATORS.has(operator) || !onTrue || !onFalse) return null
    return { id, kind, contextKey, operator, value: cloneEventValue(rawNode.value), onTrue, onFalse }
  }
  if (kind === EVENT_NODE_KIND.BRANCH) {
    const contextKey = normalizeEventId(rawNode.contextKey, 120)
    const factType = normalizeEventId(rawNode.factType, 180)
    const cases = isEventPlainObject(rawNode.cases)
      ? Object.fromEntries(
          Object.entries(rawNode.cases)
            .map(([key, nodeId]) => [normalizeEventId(key, 160), normalizeNodeId(nodeId)])
            .filter(([key, nodeId]) => key && nodeId),
        )
      : {}
    const defaultNodeId = normalizeNodeId(rawNode.defaultNodeId)
    if ((!contextKey && !factType) || Object.keys(cases).length === 0 || !defaultNodeId) return null
    return { id, kind, contextKey, factType, cases, defaultNodeId }
  }
  if (kind === EVENT_NODE_KIND.RANDOM_GATE) {
    const decisionKey = normalizeEventId(rawNode.decisionKey, 160)
    const outcomes = Array.isArray(rawNode.outcomes)
      ? rawNode.outcomes
          .map((item) => ({
            id: normalizeEventId(item?.id, 120),
            weight: Math.max(0, Number(item?.weight) || 0),
            nextNodeId: normalizeNodeId(item?.nextNodeId),
          }))
          .filter((item) => item.id && item.weight > 0 && item.nextNodeId)
      : []
    if (!decisionKey || outcomes.length < 2) return null
    return { id, kind, decisionKey, outcomes, seedSuffix: normalizeEventText(rawNode.seedSuffix, '', 120) }
  }
  if (kind === EVENT_NODE_KIND.AWAIT_FACT) {
    const factTypes = Array.isArray(rawNode.factTypes)
      ? [...new Set(rawNode.factTypes.map((item) => normalizeEventId(item, 180)).filter(Boolean))]
      : []
    const resultCodeToNode = isEventPlainObject(rawNode.resultCodeToNode)
      ? Object.fromEntries(
          Object.entries(rawNode.resultCodeToNode)
            .map(([key, nodeId]) => [normalizeEventId(key, 160), normalizeNodeId(nodeId)])
            .filter(([key, nodeId]) => key && nodeId),
        )
      : {}
    const defaultNodeId = normalizeNodeId(rawNode.defaultNodeId)
    const deadlineId = normalizeEventId(rawNode.deadlineId, 160)
    const durationMs = Math.max(0, Math.floor(Number(rawNode.durationMs) || 0))
    const onTimeout = normalizeNodeId(rawNode.onTimeout)
    if (factTypes.length === 0 || (!defaultNodeId && Object.keys(resultCodeToNode).length === 0)) return null
    if ((deadlineId || durationMs || onTimeout) && (!deadlineId || !durationMs || !onTimeout)) return null
    return { id, kind, factTypes, resultCodeToNode, defaultNodeId, deadlineId, durationMs, onTimeout }
  }
  if (kind === EVENT_NODE_KIND.TIMEOUT) {
    const deadlineId = normalizeEventId(rawNode.deadlineId, 160)
    const durationMs = Math.max(1, Math.floor(Number(rawNode.durationMs) || 0))
    const onExpired = normalizeNodeId(rawNode.onExpired)
    if (!deadlineId || !durationMs || !onExpired) return null
    return { id, kind, deadlineId, durationMs, onExpired }
  }
  if (kind === EVENT_NODE_KIND.REQUEST_ACTION) {
    const actionKey = normalizeEventId(rawNode.actionKey, 180)
    const targetModule = normalizeEventId(rawNode.targetModule, 80)
    const nextNodeId = normalizeNodeId(rawNode.nextNodeId)
    const contextRefKeys = Array.isArray(rawNode.contextRefKeys)
      ? [...new Set(rawNode.contextRefKeys.map((item) => normalizeEventId(item, 120)).filter(Boolean))].slice(0, 24)
      : []
    if (!actionKey.startsWith(`${targetModule}.`) || !targetModule || !nextNodeId) return null
    return {
      id,
      kind,
      actionKey,
      targetModule,
      contextRefKeys,
      staticContextRefs: isEventPlainObject(rawNode.staticContextRefs)
        ? cloneEventValue(rawNode.staticContextRefs)
        : {},
      nextNodeId,
    }
  }
  const lifecycle = normalizeEventId(rawNode.lifecycle, 40)
  const resultCode = normalizeEventId(rawNode.resultCode, 160)
  if (!TERMINAL_LIFECYCLES.has(lifecycle) || !resultCode) return null
  return { id, kind, lifecycle, resultCode }
}

export const normalizeEventTemplateV2 = (rawTemplate) => {
  if (!isEventPlainObject(rawTemplate) || Number(rawTemplate.schemaVersion || 2) !== 2) return null
  const id = normalizeEventId(rawTemplate.id, 220)
  const startNodeId = normalizeNodeId(rawTemplate.startNodeId)
  const nodes = Array.isArray(rawTemplate.nodes) ? rawTemplate.nodes.map(normalizeNode).filter(Boolean) : []
  if (!id || !startNodeId || nodes.length === 0 || nodes.length !== rawTemplate.nodes.length) return null
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  if (nodeMap.size !== nodes.length || !nodeMap.has(startNodeId)) return null
  const links = nodes.flatMap((node) => {
    if (node.kind === EVENT_NODE_KIND.CONDITION) return [node.onTrue, node.onFalse]
    if (node.kind === EVENT_NODE_KIND.BRANCH) return [...Object.values(node.cases), node.defaultNodeId]
    if (node.kind === EVENT_NODE_KIND.RANDOM_GATE) return node.outcomes.map((item) => item.nextNodeId)
    if (node.kind === EVENT_NODE_KIND.AWAIT_FACT) {
      return [...Object.values(node.resultCodeToNode), node.defaultNodeId, node.onTimeout].filter(Boolean)
    }
    if (node.kind === EVENT_NODE_KIND.TIMEOUT) return [node.onExpired]
    if (node.kind === EVENT_NODE_KIND.REQUEST_ACTION) return [node.nextNodeId]
    return []
  })
  if (links.some((nodeId) => !nodeMap.has(nodeId))) return null
  return { schemaVersion: 2, id, startNodeId, nodes }
}

export const createEventInstanceV2 = ({ id = '', template = null, contextRefs = {}, now = Date.now() } = {}) => {
  const normalizedTemplate = normalizeEventTemplateV2(template)
  const createdAt = normalizeTimestamp(now)
  if (!normalizedTemplate || !createdAt) return null
  return normalizeEventInstanceV2({
    schemaVersion: 2,
    id,
    templateId: normalizedTemplate.id,
    lifecycle: EVENT_INSTANCE_V2_LIFECYCLE.ACTIVE,
    currentNodeId: normalizedTemplate.startNodeId,
    contextRefs,
    decisionLedger: [],
    deadlines: [],
    pendingOwnerRequests: [],
    observedFactIds: [],
    resultCodes: [],
    createdAt,
    updatedAt: createdAt,
  })
}

const evaluateCondition = (node, contextRefs) => {
  const current = contextRefs[node.contextKey]
  if (node.operator === 'exists') return current !== undefined && current !== null && current !== ''
  if (node.operator === 'in') return Array.isArray(node.value) && node.value.includes(current)
  return current === node.value
}

const selectFact = (facts, instance, factTypes) =>
  facts.find(
    (fact) =>
      factTypes.includes(fact.type) &&
      fact.correlationId === instance.id &&
      !instance.observedFactIds.includes(fact.id),
  ) || null

const updateRequestsFromFacts = (instance, facts) => ({
  ...instance,
  pendingOwnerRequests: instance.pendingOwnerRequests.map((request) => {
    if (request.status !== OWNER_ACTION_REQUEST_STATUS.PENDING) return request
    const fact = facts.find(
      (item) =>
        item.correlationId === instance.id &&
        (item.causationId === request.id || item.refs.owner_request_id === request.id),
    )
    if (!fact) return request
    const rejected = fact.resultCode.includes('rejected') || fact.resultCode.includes('failed')
    return {
      ...request,
      status: rejected ? OWNER_ACTION_REQUEST_STATUS.REJECTED : OWNER_ACTION_REQUEST_STATUS.ACCEPTED,
      resultFactId: fact.id,
    }
  }),
})

export const advanceEventInstanceV2 = ({
  instance: rawInstance,
  template: rawTemplate,
  ownerFacts = [],
  randomValues = {},
  now = Date.now(),
  maxSteps = 40,
} = {}) => {
  const template = normalizeEventTemplateV2(rawTemplate)
  let instance = normalizeEventInstanceV2(rawInstance)
  const facts = Array.isArray(ownerFacts) ? ownerFacts.map(normalizeOwnerFactV1).filter(Boolean) : []
  const normalizedNow = normalizeTimestamp(now)
  if (!template || !instance || instance.templateId !== template.id || !normalizedNow) {
    return { ok: false, changed: false, reason: 'runtime_input_invalid', instance: null }
  }
  if (instance.lifecycle !== EVENT_INSTANCE_V2_LIFECYCLE.ACTIVE) {
    return { ok: true, changed: false, reason: 'instance_terminal', instance }
  }
  const nodeMap = new Map(template.nodes.map((node) => [node.id, node]))
  let changed = false
  let reason = 'awaiting_input'
  instance = updateRequestsFromFacts(instance, facts)

  for (let step = 0; step < Math.max(1, maxSteps); step += 1) {
    const node = nodeMap.get(instance.currentNodeId)
    if (!node) return { ok: false, changed, reason: 'current_node_missing', instance: null }
    let nextNodeId = ''
    if (node.kind === EVENT_NODE_KIND.CONDITION) {
      nextNodeId = evaluateCondition(node, instance.contextRefs) ? node.onTrue : node.onFalse
    } else if (node.kind === EVENT_NODE_KIND.BRANCH) {
      const fact = node.factType
        ? facts.find((item) => item.type === node.factType && item.correlationId === instance.id)
        : null
      const value = node.contextKey ? instance.contextRefs[node.contextKey] : fact?.resultCode
      nextNodeId = node.cases[normalizeEventId(value, 160)] || node.defaultNodeId
    } else if (node.kind === EVENT_NODE_KIND.RANDOM_GATE) {
      const existing = instance.decisionLedger.find((item) => item.key === node.decisionKey)
      if (existing) {
        nextNodeId = node.outcomes.find((item) => item.id === existing.outcome)?.nextNodeId || ''
        if (!nextNodeId) return { ok: false, changed, reason: 'persisted_decision_invalid', instance: null }
      } else {
        const randomValue = isEventPlainObject(randomValues)
          ? randomValues[node.decisionKey]
          : randomValues
        const seed = `${instance.id}:${node.decisionKey}:${node.seedSuffix || 'v1'}`
        const selected = pickWeightedItem(node.outcomes, { randomValue, seed })
        if (!selected.item) return { ok: false, changed, reason: selected.reason, instance: null }
        instance = {
          ...instance,
          decisionLedger: [
            ...instance.decisionLedger,
            {
              key: node.decisionKey,
              outcome: selected.item.id,
              randomValue: selected.randomValue,
              seed,
              decidedAt: normalizedNow,
            },
          ],
        }
        nextNodeId = selected.item.nextNodeId
      }
    } else if (node.kind === EVENT_NODE_KIND.AWAIT_FACT) {
      const fact = selectFact(facts, instance, node.factTypes)
      if (!fact && node.deadlineId) {
        const deadline = instance.deadlines.find((item) => item.id === node.deadlineId)
        if (!deadline) {
          instance = {
            ...instance,
            deadlines: [
              ...instance.deadlines,
              { id: node.deadlineId, dueAt: normalizedNow + node.durationMs, reconciledAt: 0 },
            ],
            updatedAt: normalizedNow,
          }
          changed = true
          reason = 'deadline_scheduled'
          break
        }
        if (normalizedNow >= deadline.dueAt) {
          instance = {
            ...instance,
            deadlines: instance.deadlines.map((item) =>
              item.id === deadline.id && !item.reconciledAt
                ? { ...item, reconciledAt: normalizedNow }
                : item,
            ),
          }
          nextNodeId = node.onTimeout
        } else {
          reason = 'deadline_pending'
          break
        }
      }
      if (!fact && !nextNodeId) break
      if (nextNodeId) {
        // Deadline reconciliation selected the timeout path; no fact is consumed.
      } else {
      instance = {
        ...instance,
        observedFactIds: [...instance.observedFactIds, fact.id],
      }
      nextNodeId = node.resultCodeToNode[fact.resultCode] || node.defaultNodeId
      if (!nextNodeId) break
      }
    } else if (node.kind === EVENT_NODE_KIND.TIMEOUT) {
      const deadline = instance.deadlines.find((item) => item.id === node.deadlineId)
      if (!deadline) {
        instance = {
          ...instance,
          deadlines: [
            ...instance.deadlines,
            { id: node.deadlineId, dueAt: normalizedNow + node.durationMs, reconciledAt: 0 },
          ],
          updatedAt: normalizedNow,
        }
        changed = true
        reason = 'deadline_scheduled'
        break
      }
      if (normalizedNow < deadline.dueAt) {
        reason = 'deadline_pending'
        break
      }
      instance = {
        ...instance,
        deadlines: instance.deadlines.map((item) =>
          item.id === deadline.id && !item.reconciledAt
            ? { ...item, reconciledAt: normalizedNow }
            : item,
        ),
      }
      nextNodeId = node.onExpired
    } else if (node.kind === EVENT_NODE_KIND.REQUEST_ACTION) {
      const idempotencyKey = `${instance.id}:${node.id}`
      const existing = instance.pendingOwnerRequests.find((item) => item.idempotencyKey === idempotencyKey)
      if (!existing) {
        const selectedContext = Object.fromEntries(
          node.contextRefKeys
            .filter((key) => instance.contextRefs[key] !== undefined)
            .map((key) => [key, instance.contextRefs[key]]),
        )
        const request = normalizeOwnerActionRequestV1({
          schemaVersion: 1,
          id: `owner_request_${instance.id}_${node.id}`,
          actionKey: node.actionKey,
          targetModule: node.targetModule,
          requestedByInstanceId: instance.id,
          contextRefs: { ...node.staticContextRefs, ...selectedContext },
          idempotencyKey,
          status: OWNER_ACTION_REQUEST_STATUS.PENDING,
          requestedAt: normalizedNow,
        })
        if (!request) return { ok: false, changed, reason: 'owner_request_invalid', instance: null }
        instance = {
          ...instance,
          pendingOwnerRequests: [...instance.pendingOwnerRequests, request],
        }
      }
      nextNodeId = node.nextNodeId
    } else if (node.kind === EVENT_NODE_KIND.TERMINAL) {
      instance = {
        ...instance,
        lifecycle: node.lifecycle,
        resultCodes: instance.resultCodes.includes(node.resultCode)
          ? instance.resultCodes
          : [...instance.resultCodes, node.resultCode],
        updatedAt: normalizedNow,
      }
      changed = true
      reason = 'terminal'
      break
    }
    if (!nextNodeId || nextNodeId === instance.currentNodeId) break
    instance = { ...instance, currentNodeId: nextNodeId, updatedAt: normalizedNow }
    changed = true
    reason = 'advanced'
  }

  const normalized = normalizeEventInstanceV2(instance)
  return normalized
    ? { ok: true, changed, reason, instance: normalized }
    : { ok: false, changed, reason: 'runtime_output_invalid', instance: null }
}
