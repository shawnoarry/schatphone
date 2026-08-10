export const EVENT_SURFACE_SCHEMA_VERSION = 1

export const EVENT_SURFACE_STATE = Object.freeze({
  READY: 'ready',
  PENDING: 'pending',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
  BLOCKED: 'blocked',
  FAILED: 'failed',
  UNAVAILABLE: 'unavailable',
})

export const EVENT_SURFACE_RISK = Object.freeze({
  NONE: 'none',
  LOW: 'low',
  HIGH: 'high',
  UNKNOWN: 'unknown',
})

export const EVENT_SURFACE_REVIEW_STATE = Object.freeze({
  NOT_REQUIRED: 'not_required',
  PENDING: 'pending',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  FAILED: 'failed',
})

export const EVENT_SURFACE_ANCHOR_KIND = Object.freeze({
  STABLE_PLACE: 'stable_place',
  GEOGRAPHIC: 'geographic_coordinate',
  NORMALIZED_CANVAS: 'normalized_canvas_coordinate',
})

export const EVENT_SURFACE_EXPANSION_KIND = Object.freeze({
  HOST_DETAIL: 'host_detail',
  WORLD_HUB: 'world_hub',
  MINI_SCENE: 'mini_scene',
})

export const EVENT_SURFACE_ACTION_KIND = Object.freeze({
  OPEN_DETAIL: 'open_detail',
  OPEN_WORLD_HUB: 'open_world_hub',
  DISMISS_SURFACE: 'dismiss_surface',
  REQUEST_BOUNDED_OUTCOME: 'request_bounded_outcome',
})

export const EVENT_SURFACE_UNAVAILABLE_REASON = Object.freeze({
  SOURCE_STALE: 'source_stale',
  ANCHOR_INVALID: 'anchor_invalid',
  ACTION_UNKNOWN: 'action_unknown',
  ACTION_OUTCOME_UNBOUND: 'action_outcome_unbound',
  EXPANSION_INVALID: 'expansion_invalid',
  STATE_INVALID: 'state_invalid',
})

const SURFACE_STATES = new Set(Object.values(EVENT_SURFACE_STATE))
const SURFACE_RISKS = new Set(Object.values(EVENT_SURFACE_RISK))
const REVIEW_STATES = new Set(Object.values(EVENT_SURFACE_REVIEW_STATE))
const ACTION_KINDS = new Set(Object.values(EVENT_SURFACE_ACTION_KIND))
const EXPANSION_KINDS = new Set(Object.values(EVENT_SURFACE_EXPANSION_KIND))

const STATUS_COPY = Object.freeze({
  [EVENT_SURFACE_STATE.READY]: Object.freeze({ zh: '可查看', en: 'Ready' }),
  [EVENT_SURFACE_STATE.PENDING]: Object.freeze({ zh: '等待处理', en: 'Pending review' }),
  [EVENT_SURFACE_STATE.RESOLVED]: Object.freeze({ zh: '已处理', en: 'Resolved' }),
  [EVENT_SURFACE_STATE.DISMISSED]: Object.freeze({ zh: '已忽略', en: 'Dismissed' }),
  [EVENT_SURFACE_STATE.BLOCKED]: Object.freeze({ zh: '已阻止', en: 'Blocked' }),
  [EVENT_SURFACE_STATE.FAILED]: Object.freeze({ zh: '处理失败', en: 'Failed' }),
  [EVENT_SURFACE_STATE.UNAVAILABLE]: Object.freeze({ zh: '来源已失效', en: 'Source unavailable' }),
})

const ACTION_COPY = Object.freeze({
  [EVENT_SURFACE_ACTION_KIND.OPEN_DETAIL]: Object.freeze({ zh: '展开事件', en: 'Expand event' }),
  [EVENT_SURFACE_ACTION_KIND.OPEN_WORLD_HUB]: Object.freeze({ zh: '在世界中枢查看', en: 'Open in World Hub' }),
  [EVENT_SURFACE_ACTION_KIND.DISMISS_SURFACE]: Object.freeze({ zh: '忽略', en: 'Dismiss' }),
  [EVENT_SURFACE_ACTION_KIND.REQUEST_BOUNDED_OUTCOME]: Object.freeze({ zh: '选择结果', en: 'Choose outcome' }),
})

const CHAT_EVENT_COPY = Object.freeze({
  role_greeting_request: Object.freeze({ zh: '角色发起了问候', en: 'Role greeting request' }),
  role_refuse_messages: Object.freeze({ zh: '角色请求拒收消息', en: 'Role message refusal' }),
  role_restore_messages: Object.freeze({ zh: '角色请求恢复消息', en: 'Role message restoration' }),
  role_block_user: Object.freeze({ zh: '角色请求屏蔽用户', en: 'Role block request' }),
  role_unblock_user: Object.freeze({ zh: '角色请求解除屏蔽', en: 'Role unblock request' }),
  user_accept_request: Object.freeze({ zh: '用户接受了联系请求', en: 'Contact request accepted' }),
  user_decline_request: Object.freeze({ zh: '用户拒绝了联系请求', en: 'Contact request declined' }),
  user_block_role: Object.freeze({ zh: '用户屏蔽了角色', en: 'Role blocked by user' }),
  user_unblock_role: Object.freeze({ zh: '用户解除了角色屏蔽', en: 'Role unblocked by user' }),
})

const trimText = (value, fallback = '', max = 180) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeTimestamp = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0
}

const normalizeIdList = (values, maxItems = 16) => {
  if (!Array.isArray(values)) return []
  const seen = new Set()
  return values
    .map((value) => trimText(value, '', 160))
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
    .slice(0, maxItems)
    .sort((left, right) => left.localeCompare(right))
}

const normalizeFiniteNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const normalizeEventSurfaceAnchor = (rawAnchor) => {
  if (!isObject(rawAnchor)) return null
  const rawKind = trimText(rawAnchor.kind, '', 80)
  const mapPackId = trimText(rawAnchor.mapPackId, '', 140)
  if (!mapPackId) return null

  if (rawKind === EVENT_SURFACE_ANCHOR_KIND.STABLE_PLACE) {
    const placeId = trimText(rawAnchor.placeId, '', 160)
    return placeId ? { kind: rawKind, mapPackId, placeId } : null
  }

  if (rawKind === EVENT_SURFACE_ANCHOR_KIND.GEOGRAPHIC || rawKind === 'geo') {
    const latitude = normalizeFiniteNumber(rawAnchor.latitude ?? rawAnchor.lat)
    const longitude = normalizeFiniteNumber(rawAnchor.longitude ?? rawAnchor.lng)
    if (latitude === null || longitude === null) return null
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
    return {
      kind: EVENT_SURFACE_ANCHOR_KIND.GEOGRAPHIC,
      mapPackId,
      latitude,
      longitude,
    }
  }

  if (rawKind === EVENT_SURFACE_ANCHOR_KIND.NORMALIZED_CANVAS || rawKind === 'canvas') {
    const x = normalizeFiniteNumber(rawAnchor.x)
    const y = normalizeFiniteNumber(rawAnchor.y)
    if (x === null || y === null || x < 0 || x > 1 || y < 0 || y > 1) return null
    return {
      kind: EVENT_SURFACE_ANCHOR_KIND.NORMALIZED_CANVAS,
      mapPackId,
      x,
      y,
    }
  }

  return null
}

const normalizeExpansion = (rawExpansion, sourceModule, proposalId) => {
  if (!isObject(rawExpansion)) return null
  const kind = trimText(rawExpansion.kind, '', 80)
  if (!EXPANSION_KINDS.has(kind)) return null
  const targetId = trimText(rawExpansion.targetId, proposalId, 180)

  if (kind === EVENT_SURFACE_EXPANSION_KIND.HOST_DETAIL) {
    const hostKey = trimText(rawExpansion.hostKey, sourceModule, 80).toLowerCase()
    return hostKey && targetId ? { kind, hostKey, targetId } : null
  }
  if (kind === EVENT_SURFACE_EXPANSION_KIND.WORLD_HUB) {
    return targetId ? { kind, targetId } : null
  }

  const sceneType = trimText(rawExpansion.sceneType, '', 140)
  return targetId && sceneType ? { kind, targetId, sceneType } : null
}

const normalizeAction = (rawAction, outcomeIds) => {
  if (!isObject(rawAction)) return null
  const kind = trimText(rawAction.kind, '', 80)
  if (!ACTION_KINDS.has(kind)) return null
  const outcomeId = trimText(rawAction.outcomeId, '', 120)
  if (kind === EVENT_SURFACE_ACTION_KIND.REQUEST_BOUNDED_OUTCOME) {
    if (!outcomeId || !outcomeIds.includes(outcomeId)) return null
  }
  const fallbackCopy = ACTION_COPY[kind]
  return {
    id: trimText(rawAction.id, `${kind}${outcomeId ? `:${outcomeId}` : ''}`, 160),
    kind,
    ...(outcomeId ? { outcomeId } : {}),
    labelZh: trimText(rawAction.labelZh, fallbackCopy.zh, 80),
    labelEn: trimText(rawAction.labelEn, fallbackCopy.en, 80),
  }
}

const normalizeParticipants = (rawParticipants) => {
  if (!Array.isArray(rawParticipants)) return []
  const seen = new Set()
  return rawParticipants
    .map((item) => {
      if (!isObject(item)) return null
      const kind = trimText(item.kind, '', 80)
      const id = trimText(item.id, '', 160)
      if (!kind || !id) return null
      return {
        kind,
        id,
        label: trimText(item.label, '', 120),
      }
    })
    .filter((item) => {
      const key = item ? `${item.kind}:${item.id}` : ''
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 8)
}

const normalizeRuntimeReference = (rawRuntime) => {
  if (!isObject(rawRuntime)) return null
  const logId = trimText(rawRuntime.logId, '', 180)
  if (!logId) return null
  return {
    logId,
    status: trimText(rawRuntime.status, '', 40),
    reason: trimText(rawRuntime.reason, '', 220),
    at: normalizeTimestamp(rawRuntime.at),
  }
}

export const normalizeEventSurfaceProjection = (rawProjection) => {
  if (!isObject(rawProjection)) return null
  const proposalId = trimText(rawProjection.proposalId, '', 180)
  const eventId = trimText(rawProjection.eventId, '', 160)
  const sourceInput = isObject(rawProjection.source) ? rawProjection.source : {}
  const sourceModule = trimText(sourceInput.moduleKey, '', 80).toLowerCase()
  const sourceRecordType = trimText(sourceInput.recordType, '', 80)
  const sourceRecordId = trimText(sourceInput.recordId, '', 180)
  if (!proposalId || !eventId || !sourceModule || !sourceRecordType || !sourceRecordId) return null

  const requestedState = trimText(rawProjection.status, '', 40)
  const sourceAvailable = rawProjection.availability?.state === 'available'
  let unavailableReason = sourceAvailable
    ? ''
    : trimText(
        rawProjection.availability?.reason,
        EVENT_SURFACE_UNAVAILABLE_REASON.SOURCE_STALE,
        120,
      )
  if (!SURFACE_STATES.has(requestedState)) {
    unavailableReason = EVENT_SURFACE_UNAVAILABLE_REASON.STATE_INVALID
  }
  if (requestedState === EVENT_SURFACE_STATE.UNAVAILABLE && !unavailableReason) {
    unavailableReason = EVENT_SURFACE_UNAVAILABLE_REASON.SOURCE_STALE
  }

  const worldMapPackId = trimText(rawProjection.world?.mapPackId, '', 140)
  const hasAnchor = rawProjection.anchor !== null && rawProjection.anchor !== undefined
  const anchor = normalizeEventSurfaceAnchor(rawProjection.anchor)
  if (hasAnchor && !anchor) unavailableReason = EVENT_SURFACE_UNAVAILABLE_REASON.ANCHOR_INVALID
  if (anchor && worldMapPackId && anchor.mapPackId !== worldMapPackId) {
    unavailableReason = EVENT_SURFACE_UNAVAILABLE_REASON.ANCHOR_INVALID
  }

  const outcomeIds = normalizeIdList(rawProjection.outcomeIds, 8)
  const hasInvalidActionContainer =
    rawProjection.actions !== undefined && !Array.isArray(rawProjection.actions)
  const rawActions = Array.isArray(rawProjection.actions) ? rawProjection.actions.slice(0, 8) : []
  const actions = rawActions.map((action) => normalizeAction(action, outcomeIds))
  if (hasInvalidActionContainer || actions.some((action) => !action)) {
    unavailableReason = rawActions.some(
      (action) =>
        isObject(action) &&
        action.kind === EVENT_SURFACE_ACTION_KIND.REQUEST_BOUNDED_OUTCOME &&
        !outcomeIds.includes(trimText(action.outcomeId, '', 120)),
    )
      ? EVENT_SURFACE_UNAVAILABLE_REASON.ACTION_OUTCOME_UNBOUND
      : EVENT_SURFACE_UNAVAILABLE_REASON.ACTION_UNKNOWN
  }

  const hasExpansion = rawProjection.expansion !== null && rawProjection.expansion !== undefined
  const expansion = normalizeExpansion(rawProjection.expansion, sourceModule, proposalId)
  if (hasExpansion && !expansion) {
    unavailableReason = EVENT_SURFACE_UNAVAILABLE_REASON.EXPANSION_INVALID
  }

  const unavailable = Boolean(unavailableReason) || requestedState === EVENT_SURFACE_STATE.UNAVAILABLE
  const status = unavailable ? EVENT_SURFACE_STATE.UNAVAILABLE : requestedState
  const statusCopy = STATUS_COPY[status]
  const titleZh = trimText(rawProjection.copy?.titleZh, eventId, 120)
  const titleEn = trimText(rawProjection.copy?.titleEn, eventId, 120)
  const statusLabelZh = trimText(rawProjection.copy?.statusLabelZh, statusCopy.zh, 80)
  const statusLabelEn = trimText(rawProjection.copy?.statusLabelEn, statusCopy.en, 80)

  return {
    schemaVersion: EVENT_SURFACE_SCHEMA_VERSION,
    id: trimText(rawProjection.id, `event_surface:${sourceModule}:${proposalId}`, 240),
    eventId,
    proposalId,
    source: {
      moduleKey: sourceModule,
      recordType: sourceRecordType,
      recordId: sourceRecordId,
      runtimeLogId: trimText(sourceInput.runtimeLogId, '', 180),
    },
    ownership: {
      eventTruthOwner: 'event_runtime',
      sourceTruthOwner: sourceModule,
      effectOwner: sourceModule,
    },
    status,
    availability: {
      state: unavailable ? 'stale' : 'available',
      reason: unavailableReason,
    },
    risk: SURFACE_RISKS.has(rawProjection.risk)
      ? rawProjection.risk
      : EVENT_SURFACE_RISK.UNKNOWN,
    review: {
      state: REVIEW_STATES.has(rawProjection.review?.state)
        ? rawProjection.review.state
        : EVENT_SURFACE_REVIEW_STATE.NOT_REQUIRED,
      mode: trimText(rawProjection.review?.mode, '', 80),
      reason: trimText(rawProjection.review?.reason, '', 220),
    },
    copy: {
      titleZh,
      titleEn,
      summaryZh: trimText(rawProjection.copy?.summaryZh, '', 360),
      summaryEn: trimText(rawProjection.copy?.summaryEn, '', 360),
      detailZh: trimText(rawProjection.copy?.detailZh, '', 480),
      detailEn: trimText(rawProjection.copy?.detailEn, '', 480),
      statusLabelZh,
      statusLabelEn,
      accessibilityLabelZh: trimText(
        rawProjection.copy?.accessibilityLabelZh,
        `${titleZh}，${statusLabelZh}`,
        240,
      ),
      accessibilityLabelEn: trimText(
        rawProjection.copy?.accessibilityLabelEn,
        `${titleEn}, ${statusLabelEn}`,
        240,
      ),
    },
    world: {
      worldContextId: trimText(rawProjection.world?.worldContextId, '', 180),
      worldPackId: trimText(rawProjection.world?.worldPackId, '', 140),
      mapPackId: worldMapPackId || anchor?.mapPackId || '',
    },
    participants: normalizeParticipants(rawProjection.participants),
    runtime: normalizeRuntimeReference(rawProjection.runtime),
    anchor: unavailable ? null : anchor,
    expansion: unavailable ? null : expansion,
    outcomeIds,
    actions: unavailable ? [] : actions.filter(Boolean),
    createdAt: normalizeTimestamp(rawProjection.createdAt),
    updatedAt: normalizeTimestamp(rawProjection.updatedAt),
  }
}

const findRuntimeLog = (runtimeLogs, runtimeLogId, eventId, targetId) => {
  if (!runtimeLogId || !Array.isArray(runtimeLogs)) return null
  const match = runtimeLogs.find((item) => item?.id === runtimeLogId)
  if (!match || match.eventId !== eventId) return null
  if (targetId && match.targetId && String(match.targetId) !== String(targetId)) return null
  return {
    logId: runtimeLogId,
    status: match.status,
    reason: match.reason,
    at: match.at,
  }
}

const resolveMapStatus = (status) => {
  if (status === 'pending_review') return EVENT_SURFACE_STATE.PENDING
  if (status === 'applied') return EVENT_SURFACE_STATE.RESOLVED
  if (status === 'dismissed') return EVENT_SURFACE_STATE.DISMISSED
  if (status === 'failed') return EVENT_SURFACE_STATE.FAILED
  return EVENT_SURFACE_STATE.UNAVAILABLE
}

const resolveMapReviewState = (status) => {
  if (status === 'pending_review') return EVENT_SURFACE_REVIEW_STATE.PENDING
  if (status === 'applied' || status === 'dismissed') return EVENT_SURFACE_REVIEW_STATE.COMPLETED
  return EVENT_SURFACE_REVIEW_STATE.FAILED
}

const isMapSourceCurrent = (proposal, sourceRecord) => {
  if (!isObject(sourceRecord)) return false
  const proposalJourneyId = trimText(proposal.journeyId || proposal.source?.journeyId, '', 140)
  const sourceJourneyId = trimText(sourceRecord.journeyId || sourceRecord.id, '', 140)
  if (!proposalJourneyId || sourceJourneyId !== proposalJourneyId) return false
  if (proposal.source?.journeyId && proposal.source.journeyId !== proposalJourneyId) return false
  const proposalCheckpointId = trimText(proposal.checkpointId, '', 80)
  if (
    !proposalCheckpointId ||
    (proposal.source?.checkpointId && proposal.source.checkpointId !== proposalCheckpointId)
  ) {
    return false
  }

  const proposalSchemaVersion = Number(proposal.source?.journeySchemaVersion) || 0
  const sourceSchemaVersion = Number(sourceRecord.journeySchemaVersion) || 0
  if (proposalSchemaVersion > 0 && sourceSchemaVersion > 0 && proposalSchemaVersion !== sourceSchemaVersion) {
    return false
  }

  const proposalMapPackId = trimText(proposal.source?.mapPackId, '', 140)
  const sourceMapPackId = trimText(sourceRecord.mapPackId, proposalMapPackId, 140)
  if (proposalMapPackId && sourceMapPackId !== proposalMapPackId) return false

  const interruption = sourceRecord.activeInterruption
  if (interruption) {
    if (interruption.proposalId && interruption.proposalId !== proposal.id) return false
    if (interruption.eventId && interruption.eventId !== proposal.eventId) return false
    if (interruption.journeyId && interruption.journeyId !== proposalJourneyId) return false
    if (interruption.checkpointId && interruption.checkpointId !== proposalCheckpointId) return false
  }
  return true
}

const mapActions = (proposal) => {
  const actions = [
    { id: 'expand', kind: EVENT_SURFACE_ACTION_KIND.OPEN_DETAIL },
  ]
  if (proposal.status !== 'pending_review') return actions
  actions.push({ id: 'dismiss', kind: EVENT_SURFACE_ACTION_KIND.DISMISS_SURFACE })
  normalizeIdList(proposal.allowedOutcomes, 4).forEach((outcomeId) => {
    actions.push({
      id: `outcome:${outcomeId}`,
      kind: EVENT_SURFACE_ACTION_KIND.REQUEST_BOUNDED_OUTCOME,
      outcomeId,
      labelZh: outcomeId === 'delay' ? '接受延迟' : '继续行程',
      labelEn: outcomeId === 'delay' ? 'Accept delay' : 'Continue journey',
    })
  })
  return actions
}

export const projectMapJourneyEventSurface = ({
  proposal,
  sourceRecord,
  runtimeLogs = [],
  anchor = null,
} = {}) => {
  if (!isObject(proposal)) return null
  const proposalId = trimText(proposal.id, '', 180)
  const eventId = trimText(proposal.eventId, '', 160)
  const journeyId = trimText(proposal.journeyId || proposal.source?.journeyId, '', 140)
  const checkpointId = trimText(proposal.checkpointId || proposal.source?.checkpointId, '', 80)
  if (!proposalId || !eventId || !journeyId || !checkpointId) return null

  const runtimeLogId = trimText(proposal.provenance?.runtimeLogId, '', 180)
  const outcomeIds = normalizeIdList(proposal.allowedOutcomes, 4)
  const sourceAvailable = isMapSourceCurrent(proposal, sourceRecord)
  return normalizeEventSurfaceProjection({
    eventId,
    proposalId,
    source: {
      moduleKey: 'map',
      recordType: 'map_journey',
      recordId: journeyId,
      runtimeLogId,
    },
    status: resolveMapStatus(proposal.status),
    availability: {
      state: sourceAvailable ? 'available' : 'stale',
      reason: sourceAvailable ? '' : EVENT_SURFACE_UNAVAILABLE_REASON.SOURCE_STALE,
    },
    risk: EVENT_SURFACE_RISK.LOW,
    review: {
      state: resolveMapReviewState(proposal.status),
      mode: 'source_owner_review',
      reason: proposal.resolutionReason,
    },
    copy: {
      titleZh: proposal.titleZh,
      titleEn: proposal.titleEn,
      summaryZh: proposal.summaryZh,
      summaryEn: proposal.summaryEn,
      detailZh: proposal.detailZh,
      detailEn: proposal.detailEn,
    },
    world: {
      worldContextId: proposal.provenance?.worldContextId,
      worldPackId: proposal.source?.worldPackId,
      mapPackId: proposal.source?.mapPackId,
    },
    runtime: findRuntimeLog(runtimeLogs, runtimeLogId, eventId, journeyId),
    anchor,
    expansion: {
      kind: EVENT_SURFACE_EXPANSION_KIND.HOST_DETAIL,
      hostKey: 'map',
      targetId: proposalId,
    },
    outcomeIds,
    actions: mapActions(proposal),
    createdAt: proposal.createdAt,
    updatedAt: Math.max(
      normalizeTimestamp(proposal.createdAt),
      normalizeTimestamp(proposal.reviewedAt),
      normalizeTimestamp(proposal.appliedAt),
    ),
  })
}

const resolveChatStatus = (status) => {
  if (status === 'ready_to_apply') return EVENT_SURFACE_STATE.READY
  if (status === 'pending_review') return EVENT_SURFACE_STATE.PENDING
  if (status === 'applied') return EVENT_SURFACE_STATE.RESOLVED
  if (status === 'dismissed') return EVENT_SURFACE_STATE.DISMISSED
  if (status === 'blocked') return EVENT_SURFACE_STATE.BLOCKED
  if (status === 'failed') return EVENT_SURFACE_STATE.FAILED
  return EVENT_SURFACE_STATE.UNAVAILABLE
}

const resolveChatReviewState = (status) => {
  if (status === 'pending_review') return EVENT_SURFACE_REVIEW_STATE.PENDING
  if (status === 'blocked') return EVENT_SURFACE_REVIEW_STATE.BLOCKED
  if (status === 'failed') return EVENT_SURFACE_REVIEW_STATE.FAILED
  if (status === 'applied' || status === 'dismissed') return EVENT_SURFACE_REVIEW_STATE.COMPLETED
  return EVENT_SURFACE_REVIEW_STATE.NOT_REQUIRED
}

const isChatSourceCurrent = (proposal, sourceRecord) => {
  if (!isObject(sourceRecord)) return false
  const contactId = String(proposal.targetContactId || '')
  const sourceContactId = String(sourceRecord.contactId || sourceRecord.id || '')
  if (!contactId || sourceContactId !== contactId) return false
  if (proposal.source?.moduleKey && proposal.source.moduleKey !== 'chat') return false
  if (proposal.source?.conversationId && String(proposal.source.conversationId) !== contactId) {
    return false
  }
  const profileId = String(proposal.targetProfileId || '')
  const sourceProfileId = String(sourceRecord.profileId || '')
  return !profileId || !sourceProfileId || profileId === sourceProfileId
}

export const projectChatSocialEventSurface = ({
  proposal,
  sourceRecord,
  runtimeLogs = [],
} = {}) => {
  if (!isObject(proposal)) return null
  const proposalId = trimText(proposal.id, '', 180)
  const eventId = trimText(proposal.eventId, '', 160)
  const eventType = trimText(proposal.eventType, '', 120)
  const contactId = trimText(proposal.targetContactId, '', 160)
  if (!proposalId || !eventId || !eventType || !contactId) return null

  const runtimeLogId = trimText(proposal.source?.runtimeLogId, '', 180)
  const eventCopy = CHAT_EVENT_COPY[eventType] || { zh: '聊天社交事件', en: 'Chat social event' }
  const targetName = trimText(proposal.targetName, '', 120)
  const sourceAvailable = isChatSourceCurrent(proposal, sourceRecord)
  const actions = [
    { id: 'open_world_hub', kind: EVENT_SURFACE_ACTION_KIND.OPEN_WORLD_HUB },
  ]
  if (proposal.status === 'pending_review') {
    actions.push({ id: 'dismiss', kind: EVENT_SURFACE_ACTION_KIND.DISMISS_SURFACE })
  }

  return normalizeEventSurfaceProjection({
    eventId,
    proposalId,
    source: {
      moduleKey: 'chat',
      recordType: 'chat_contact',
      recordId: contactId,
      runtimeLogId,
    },
    status: resolveChatStatus(proposal.status),
    availability: {
      state: sourceAvailable ? 'available' : 'stale',
      reason: sourceAvailable ? '' : EVENT_SURFACE_UNAVAILABLE_REASON.SOURCE_STALE,
    },
    risk: proposal.risk,
    review: {
      state: resolveChatReviewState(proposal.status),
      mode: proposal.reviewMode,
      reason: proposal.reason,
    },
    copy: {
      titleZh: targetName ? `${eventCopy.zh}：${targetName}` : eventCopy.zh,
      titleEn: targetName ? `${eventCopy.en}: ${targetName}` : eventCopy.en,
      summaryZh: proposal.explanation || proposal.reason,
      summaryEn: proposal.explanation || proposal.reason,
    },
    participants: [
      {
        kind: 'chat_contact',
        id: contactId,
        label: targetName,
      },
      ...(proposal.targetProfileId
        ? [{ kind: 'role_profile', id: String(proposal.targetProfileId), label: targetName }]
        : []),
    ],
    runtime: findRuntimeLog(runtimeLogs, runtimeLogId, eventId, contactId),
    expansion: {
      kind: EVENT_SURFACE_EXPANSION_KIND.WORLD_HUB,
      targetId: proposalId,
    },
    actions,
    createdAt: proposal.createdAt,
    updatedAt: Math.max(
      normalizeTimestamp(proposal.createdAt),
      normalizeTimestamp(proposal.reviewedAt),
      normalizeTimestamp(proposal.appliedAt),
    ),
  })
}
