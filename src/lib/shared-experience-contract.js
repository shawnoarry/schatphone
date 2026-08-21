export const SHARED_EXPERIENCE_SCHEMA_VERSION = 1

export const SHARED_EXPERIENCE_LIFECYCLE = Object.freeze({
  PLANNED: 'planned',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
})

const SHARED_EXPERIENCE_LIFECYCLES = new Set(Object.values(SHARED_EXPERIENCE_LIFECYCLE))
const CONTRACT_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/

const isPlainObject = (value) =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const normalizeText = (value, maxLength) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized || normalized.length > maxLength) return ''
  return normalized
}

const normalizeContractId = (value, maxLength = 220) => {
  const normalized = normalizeText(value, maxLength)
  if (!normalized || normalized !== normalized.toLowerCase()) return ''
  return CONTRACT_ID_PATTERN.test(normalized) ? normalized : ''
}

const normalizeTimestamp = (value) =>
  Number.isSafeInteger(value) && value >= 0 ? value : null

const normalizeUniqueIdList = (rawIds) => {
  if (!Array.isArray(rawIds) || rawIds.length === 0) return null
  const ids = rawIds.map((id) => normalizeContractId(id))
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return null
  return ids
}

const normalizeRelationshipTarget = (rawTarget) => {
  if (!isPlainObject(rawTarget)) return null
  const entityKey = normalizeText(rawTarget.entityKey, 160)
  const kind = normalizeContractId(rawTarget.kind, 40)
  const displayName = normalizeText(rawTarget.displayName, 120)
  if (!entityKey || !kind || !displayName) return null
  return { entityKey, kind, displayName }
}

const normalizeOwnerRecordRef = (rawRef) => {
  if (!isPlainObject(rawRef)) return null
  const id = normalizeContractId(rawRef.id)
  const ownerModule = normalizeContractId(rawRef.ownerModule, 80)
  const recordType = normalizeContractId(rawRef.recordType, 80)
  const recordId = normalizeText(rawRef.recordId, 220)
  if (!id || !ownerModule || !recordType || !recordId) return null

  const ref = { id, ownerModule, recordType, recordId }
  if (rawRef.ownerRevision !== undefined) {
    if (!Number.isSafeInteger(rawRef.ownerRevision) || rawRef.ownerRevision < 1) return null
    ref.ownerRevision = rawRef.ownerRevision
  }
  return ref
}

const normalizeProgress = (rawProgress) => {
  if (!isPlainObject(rawProgress)) return null
  const id = normalizeContractId(rawProgress.id)
  const kind = normalizeContractId(rawProgress.kind, 100)
  const summary = normalizeText(rawProgress.summary, 500)
  const occurredAt = normalizeTimestamp(rawProgress.occurredAt)
  const ownerRecordRefIds = normalizeUniqueIdList(rawProgress.ownerRecordRefIds)
  if (!id || !kind || !summary || occurredAt === null || !ownerRecordRefIds) return null
  return { id, kind, summary, occurredAt, ownerRecordRefIds }
}

const normalizeRoleMemory = (rawMemory) => {
  if (!isPlainObject(rawMemory)) return null
  const memoryKey = normalizeContractId(rawMemory.memoryKey)
  const summary = normalizeText(rawMemory.summary, 1000)
  const updatedAt = normalizeTimestamp(rawMemory.updatedAt)
  const sourceProgressIds = normalizeUniqueIdList(rawMemory.sourceProgressIds)
  if (!memoryKey || !summary || updatedAt === null || !sourceProgressIds) return null
  return { memoryKey, summary, updatedAt, sourceProgressIds }
}

const normalizeEvery = (items, normalizeItem) => {
  if (!Array.isArray(items) || items.length === 0) return null
  const normalized = items.map(normalizeItem)
  return normalized.some((item) => !item) ? null : normalized
}

const listsMatch = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index])

export const normalizeSharedExperienceId = (value) => normalizeContractId(value)

export const buildShoppingGiftExperienceId = (orderId) => {
  const id = normalizeContractId(orderId)
  return id ? `gift:${id}` : ''
}

export const resolveShoppingGiftExperienceId = (order = {}) => {
  if (!isPlainObject(order) || !isPlainObject(order.giftRecipient)) return ''
  const derivedId = buildShoppingGiftExperienceId(order.id)
  if (!derivedId) return ''
  const explicitId = normalizeSharedExperienceId(order.sharedExperienceId)
  return explicitId && explicitId !== derivedId ? '' : explicitId || derivedId
}

export const buildSharedExperienceMemoryKey = (experienceId) => {
  const id = normalizeContractId(experienceId)
  return id ? `shared_experience__${id}` : ''
}

export const normalizeSharedExperienceV1 = (rawExperience) => {
  if (!isPlainObject(rawExperience) || rawExperience.schemaVersion !== SHARED_EXPERIENCE_SCHEMA_VERSION) {
    return null
  }

  const id = normalizeContractId(rawExperience.id)
  const kind = normalizeContractId(rawExperience.kind, 80)
  const lifecycle = normalizeContractId(rawExperience.lifecycle, 40)
  const title = normalizeText(rawExperience.title, 180)
  const relationshipTarget = normalizeRelationshipTarget(rawExperience.relationshipTarget)
  const createdAt = normalizeTimestamp(rawExperience.createdAt)
  const updatedAt = normalizeTimestamp(rawExperience.updatedAt)
  const progress = normalizeEvery(rawExperience.progress, normalizeProgress)
  const ownerRecordRefs = normalizeEvery(rawExperience.ownerRecordRefs, normalizeOwnerRecordRef)
  const roleMemory = normalizeRoleMemory(rawExperience.roleMemory)

  if (
    !id ||
    !kind ||
    !SHARED_EXPERIENCE_LIFECYCLES.has(lifecycle) ||
    !title ||
    !relationshipTarget ||
    createdAt === null ||
    updatedAt === null ||
    createdAt > updatedAt ||
    !progress ||
    !ownerRecordRefs ||
    !roleMemory
  ) {
    return null
  }

  const progressIds = progress.map((item) => item.id)
  const ownerRefIds = ownerRecordRefs.map((item) => item.id)
  const ownerRecordKeys = ownerRecordRefs.map(
    (item) => `${item.ownerModule}\u0000${item.recordType}\u0000${item.recordId}`,
  )
  if (
    new Set(progressIds).size !== progressIds.length ||
    new Set(ownerRefIds).size !== ownerRefIds.length ||
    new Set(ownerRecordKeys).size !== ownerRecordKeys.length ||
    roleMemory.memoryKey !== buildSharedExperienceMemoryKey(id) ||
    !listsMatch(roleMemory.sourceProgressIds, progressIds)
  ) {
    return null
  }

  const knownOwnerRefs = new Set(ownerRefIds)
  const usedOwnerRefs = new Set()
  for (let index = 0; index < progress.length; index += 1) {
    const item = progress[index]
    const previous = progress[index - 1]
    if (
      item.occurredAt < createdAt ||
      item.occurredAt > updatedAt ||
      (previous && item.occurredAt < previous.occurredAt)
    ) {
      return null
    }
    for (const refId of item.ownerRecordRefIds) {
      if (!knownOwnerRefs.has(refId)) return null
      usedOwnerRefs.add(refId)
    }
  }

  if (
    usedOwnerRefs.size !== knownOwnerRefs.size ||
    roleMemory.updatedAt < progress.at(-1).occurredAt ||
    roleMemory.updatedAt > updatedAt
  ) {
    return null
  }

  return {
    schemaVersion: SHARED_EXPERIENCE_SCHEMA_VERSION,
    id,
    kind,
    lifecycle,
    title,
    relationshipTarget,
    progress,
    roleMemory,
    ownerRecordRefs,
    createdAt,
    updatedAt,
  }
}

export const normalizeSharedExperiencesV1 = (rawExperiences) => {
  if (!Array.isArray(rawExperiences)) return { experiences: [], rejected: [], inputCount: 0 }
  const experiences = []
  const rejected = []
  const seen = new Set()

  rawExperiences.forEach((rawExperience, index) => {
    const experience = normalizeSharedExperienceV1(rawExperience)
    if (!experience) {
      rejected.push({
        index,
        id: normalizeContractId(rawExperience?.id),
        reason: 'invalid_shared_experience_v1',
      })
      return
    }
    if (seen.has(experience.id)) {
      rejected.push({ index, id: experience.id, reason: 'duplicate_shared_experience_id' })
      return
    }
    seen.add(experience.id)
    experiences.push(experience)
  })

  return { experiences, rejected, inputCount: rawExperiences.length }
}

const normalizeRecordList = (value) => (Array.isArray(value) ? value.filter(isPlainObject) : [])

const recordMatchesGiftExperience = (record, experienceId, orderId) => {
  const linkedId = normalizeSharedExperienceId(record?.sharedExperienceId)
  if (linkedId) return linkedId === experienceId
  return normalizeText(record?.sourceId, 220) === orderId
}

const buildOwnerRecordRef = ({ ownerModule, recordType, record }) => {
  const owner = normalizeContractId(ownerModule, 80)
  const type = normalizeContractId(recordType, 80)
  const recordId = normalizeText(record?.id, 220)
  const idPart = normalizeContractId(recordId.toLowerCase(), 180)
  if (!owner || !type || !recordId || !idPart) return null
  const ref = {
    id: `${owner}:${type}:${idPart}`,
    ownerModule: owner,
    recordType: type,
    recordId,
  }
  if (Number.isSafeInteger(record?.ownerRevision) && record.ownerRevision > 0) {
    ref.ownerRevision = record.ownerRevision
  }
  return ref
}

const recordTimestamp = (record = {}) => {
  for (const value of [record.startedAt, record.createdAt, record.updatedAt]) {
    const timestamp = normalizeTimestamp(value)
    if (timestamp !== null) return timestamp
  }
  return null
}

const flattenChatMessages = (rawMessages) => {
  if (Array.isArray(rawMessages)) return rawMessages.filter(isPlainObject)
  if (!isPlainObject(rawMessages)) return []
  return Object.values(rawMessages).flatMap((messages) => normalizeRecordList(messages))
}

const chatMessageMatchesGiftExperience = (message, experienceId, orderId) =>
  normalizeRecordList(message?.blocks).some((block) => {
    if (block.type !== 'service_notification') return false
    const linkedId = normalizeSharedExperienceId(block.sharedExperienceId)
    if (linkedId) return linkedId === experienceId
    return normalizeText(block.sourceId, 220) === orderId
  })

const buildGiftTarget = (giftRecipient = {}) => {
  const profileId = Number.isSafeInteger(Number(giftRecipient.profileId))
    ? Math.max(0, Math.floor(Number(giftRecipient.profileId)))
    : 0
  const contactId = Number.isSafeInteger(Number(giftRecipient.contactId ?? giftRecipient.chatId))
    ? Math.max(0, Math.floor(Number(giftRecipient.contactId ?? giftRecipient.chatId)))
    : 0
  const displayName = normalizeText(
    giftRecipient.name || giftRecipient.displayName || giftRecipient.recipientName,
    120,
  )
  if (!displayName) return null
  const entityKey = profileId > 0
    ? `role:${profileId}`
    : contactId > 0
      ? `contact:${contactId}`
      : `name:${displayName.toLowerCase()}`
  return {
    entityKey,
    kind: normalizeContractId(giftRecipient.kind, 40) || (profileId > 0 ? 'role' : 'contact'),
    displayName,
  }
}

const giftItemSummary = (order = {}) => {
  const titles = normalizeRecordList(order.items)
    .slice(0, 3)
    .map((item) => normalizeText(item.title || item.name, 80))
    .filter(Boolean)
  return titles.join(' / ') || 'gift'
}

export const buildGiftSharedExperienceV1 = ({
  order,
  walletTransactions = [],
  reminderCues = [],
  calendarEvents = [],
  phoneCalls = [],
  chatMessages = [],
} = {}) => {
  const experienceId = resolveShoppingGiftExperienceId(order)
  const target = buildGiftTarget(order?.giftRecipient)
  const orderId = normalizeText(order?.id, 220)
  const createdAt = normalizeTimestamp(order?.createdAt)
  if (!experienceId || !target || !orderId || createdAt === null) return null

  const ownerRecordRefs = []
  const ownerRefIds = new Set()
  const addOwnerRef = (ownerModule, recordType, record) => {
    const ref = buildOwnerRecordRef({ ownerModule, recordType, record })
    if (!ref || ownerRefIds.has(ref.id)) return ''
    ownerRefIds.add(ref.id)
    ownerRecordRefs.push(ref)
    return ref.id
  }

  const orderRefId = addOwnerRef('shopping', 'order', order)
  if (!orderRefId) return null
  const reservedRefIds = [orderRefId]

  normalizeRecordList(walletTransactions)
    .filter((record) => recordMatchesGiftExperience(record, experienceId, orderId))
    .forEach((record) => {
      const refId = addOwnerRef('wallet', 'transaction', record)
      if (refId) reservedRefIds.push(refId)
    })
  normalizeRecordList(reminderCues)
    .filter((record) => recordMatchesGiftExperience(record, experienceId, orderId))
    .forEach((record) => {
      const refId = addOwnerRef('reminders', 'delivery_cue', record)
      if (refId) reservedRefIds.push(refId)
    })
  normalizeRecordList(calendarEvents)
    .filter((record) => recordMatchesGiftExperience(record, experienceId, orderId))
    .forEach((record) => {
      const refId = addOwnerRef('calendar', 'event', record)
      if (refId) reservedRefIds.push(refId)
    })
  flattenChatMessages(chatMessages)
    .filter((record) => chatMessageMatchesGiftExperience(record, experienceId, orderId))
    .forEach((record) => {
      const refId = addOwnerRef('chat', 'message', record)
      if (refId) reservedRefIds.push(refId)
    })

  const progress = [
    {
      id: `${experienceId}:reserved`,
      kind: 'gift_reserved',
      summary: `Reserved ${giftItemSummary(order)} for ${target.displayName} and planned its delivery.`,
      occurredAt: createdAt,
      ownerRecordRefIds: reservedRefIds,
    },
  ]

  const status = normalizeContractId(order?.status, 40)
  const completedAt = normalizeTimestamp(order?.completedAt ?? order?.updatedAt)
  if (status === 'completed') {
    if (completedAt === null || completedAt < createdAt) return null
    progress.push({
      id: `${experienceId}:delivered`,
      kind: 'gift_delivered',
      summary: `The gift was delivered to ${target.displayName}.`,
      occurredAt: completedAt,
      ownerRecordRefIds: [orderRefId],
    })
  }

  const linkedCalls = normalizeRecordList(phoneCalls)
    .filter((record) => recordMatchesGiftExperience(record, experienceId, orderId))
    .map((record) => ({ record, occurredAt: recordTimestamp(record) }))
    .sort((left, right) => (left.occurredAt ?? 0) - (right.occurredAt ?? 0))
  if (linkedCalls.length > 0) {
    if (status !== 'completed' || linkedCalls.some((item) => item.occurredAt === null || item.occurredAt < completedAt)) {
      return null
    }
    const phoneRefIds = linkedCalls
      .map(({ record }) => addOwnerRef('phone', 'call', record))
      .filter(Boolean)
    if (phoneRefIds.length !== linkedCalls.length) return null
    const latestCall = linkedCalls.at(-1).record
    const feedback = normalizeText(latestCall.summary || latestCall.note, 240)
    progress.push({
      id: `${experienceId}:feedback`,
      kind: 'recipient_feedback_received',
      summary: feedback
        ? `${target.displayName} called with gift feedback: ${feedback}`
        : `${target.displayName} called with feedback about the gift.`,
      occurredAt: linkedCalls.at(-1).occurredAt,
      ownerRecordRefIds: phoneRefIds,
    })
  }

  const cancelledAt = normalizeTimestamp(order?.cancelledAt ?? order?.updatedAt)
  if (status === 'cancelled') {
    if (cancelledAt === null || cancelledAt < createdAt) return null
    progress.push({
      id: `${experienceId}:cancelled`,
      kind: 'gift_cancelled',
      summary: `The gift order for ${target.displayName} was cancelled.`,
      occurredAt: cancelledAt,
      ownerRecordRefIds: [orderRefId],
    })
  }

  const latestProgress = progress.at(-1)
  const lifecycle = status === 'cancelled'
    ? SHARED_EXPERIENCE_LIFECYCLE.CANCELLED
    : linkedCalls.length > 0
      ? SHARED_EXPERIENCE_LIFECYCLE.COMPLETED
      : SHARED_EXPERIENCE_LIFECYCLE.ACTIVE
  const roleMemorySummary = status === 'cancelled'
    ? `The gift order for ${target.displayName} was cancelled.`
    : linkedCalls.length > 0
      ? `The gift for ${target.displayName} was delivered, and ${latestProgress.summary}`
      : status === 'completed'
        ? `The gift for ${target.displayName} was delivered.`
        : `A gift for ${target.displayName} was ordered and delivery was planned.`
  const updatedAt = Math.max(
    latestProgress.occurredAt,
    normalizeTimestamp(order?.updatedAt) ?? createdAt,
  )

  return normalizeSharedExperienceV1({
    schemaVersion: SHARED_EXPERIENCE_SCHEMA_VERSION,
    id: experienceId,
    kind: 'gift',
    lifecycle,
    title: `Gift for ${target.displayName}`,
    relationshipTarget: target,
    progress,
    roleMemory: {
      memoryKey: buildSharedExperienceMemoryKey(experienceId),
      summary: roleMemorySummary,
      updatedAt: latestProgress.occurredAt,
      sourceProgressIds: progress.map((item) => item.id),
    },
    ownerRecordRefs,
    createdAt,
    updatedAt,
  })
}
