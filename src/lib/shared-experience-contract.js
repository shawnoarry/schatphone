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
