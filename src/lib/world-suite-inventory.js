import {
  normalizeInstalledWorldResource,
  normalizeWorldSuiteOrigin,
  normalizeWorldSuiteResource,
} from './world-suite-manifest'

export const WORLD_SUITE_INVENTORY_VERSION = 1

export const WORLD_SUITE_OPERATION_TYPES = Object.freeze({
  INSTALL: 'install',
  UNINSTALL: 'uninstall',
})

export const WORLD_SUITE_OPERATION_STATUSES = Object.freeze({
  RUNNING: 'running',
  INSTALLED: 'installed',
  DETACHED: 'detached',
  PARTIAL: 'partial',
  REVIEW_REQUIRED: 'review_required',
  FAILED: 'failed',
})

const OPERATION_TYPE_SET = new Set(Object.values(WORLD_SUITE_OPERATION_TYPES))
const OPERATION_STATUS_SET = new Set(Object.values(WORLD_SUITE_OPERATION_STATUSES))
const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,179}$/i
const RESOURCE_LIMIT = 600
const SUITE_STATE_LIMIT = 120

const normalizeText = (value, max = 180) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
}

const normalizeId = (value) => {
  const normalized = normalizeText(value)
  return ID_PATTERN.test(normalized) ? normalized : ''
}

const normalizeVersion = (value, fallback = 1) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(1, Math.floor(numeric))
}

const normalizeTimestamp = (value) => Math.max(0, Math.floor(Number(value) || 0))

const uniqueIds = (values = [], limit = RESOURCE_LIMIT) => [
  ...new Set((Array.isArray(values) ? values : []).map(normalizeId).filter(Boolean)),
].slice(0, limit)

const clone = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

const normalizeInstalledResourceRecord = (rawResource = {}) => {
  const resource = normalizeInstalledWorldResource(rawResource)
  if (
    !resource.id ||
    !resource.type ||
    !resource.owner ||
    !resource.ownerResourceId ||
    resource.installed !== true
  ) {
    return null
  }
  return resource
}

export const normalizeWorldSuiteState = (rawState = {}) => {
  const source = rawState && typeof rawState === 'object' ? rawState : {}
  const suiteId = normalizeId(source.suiteId || source.id)
  if (!suiteId) return null
  const operation = OPERATION_TYPE_SET.has(source.operation)
    ? source.operation
    : WORLD_SUITE_OPERATION_TYPES.INSTALL
  const status = OPERATION_STATUS_SET.has(source.status)
    ? source.status
    : WORLD_SUITE_OPERATION_STATUSES.FAILED
  const resourceIds = uniqueIds(source.resourceIds)
  const completedResourceIds = uniqueIds(source.completedResourceIds).filter((resourceId) =>
    resourceIds.includes(resourceId),
  )
  const declaredPendingResourceIds = uniqueIds(source.pendingResourceIds).filter((resourceId) =>
    resourceIds.includes(resourceId) && !completedResourceIds.includes(resourceId),
  )
  const pendingResourceIds = declaredPendingResourceIds.length > 0
    ? declaredPendingResourceIds
    : resourceIds.filter((resourceId) => !completedResourceIds.includes(resourceId))
  const startedAt = normalizeTimestamp(source.startedAt)
  const updatedAt = normalizeTimestamp(source.updatedAt || startedAt)

  return {
    suiteId,
    manifestVersion: normalizeVersion(source.manifestVersion || source.version),
    operation,
    status,
    resourceIds,
    completedResourceIds,
    pendingResourceIds,
    failedResourceId: normalizeId(source.failedResourceId),
    errorCode: normalizeId(source.errorCode),
    startedAt,
    updatedAt,
    completedAt: normalizeTimestamp(source.completedAt),
  }
}

export const normalizeWorldSuiteInventory = (rawInventory = {}) => {
  const source = rawInventory && typeof rawInventory === 'object' ? rawInventory : {}
  const resourceById = new Map()
  ;(Array.isArray(source.resources) ? source.resources : []).forEach((rawResource) => {
    const resource = normalizeInstalledResourceRecord(rawResource)
    if (resource) resourceById.set(resource.id, resource)
  })
  const suiteStateById = new Map()
  ;(Array.isArray(source.suiteStates) ? source.suiteStates : []).forEach((rawState) => {
    const suiteState = normalizeWorldSuiteState(rawState)
    if (suiteState) suiteStateById.set(suiteState.suiteId, suiteState)
  })

  return {
    schemaVersion: WORLD_SUITE_INVENTORY_VERSION,
    resources: [...resourceById.values()]
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, RESOURCE_LIMIT),
    suiteStates: [...suiteStateById.values()]
      .sort((left, right) => left.suiteId.localeCompare(right.suiteId))
      .slice(0, SUITE_STATE_LIMIT),
  }
}

export const createEmptyWorldSuiteInventory = () => normalizeWorldSuiteInventory()

export const listInstalledWorldResources = (inventory = {}) =>
  clone(normalizeWorldSuiteInventory(inventory).resources)

export const findInstalledWorldResource = (inventory = {}, resourceId = '') => {
  const normalizedId = normalizeId(resourceId)
  const resource = normalizeWorldSuiteInventory(inventory).resources.find(
    (item) => item.id === normalizedId,
  )
  return resource ? clone(resource) : null
}

export const recordInstalledWorldResource = ({
  inventory,
  resource,
  evidence,
  origin,
  now = Date.now(),
} = {}) => {
  const current = normalizeWorldSuiteInventory(inventory)
  const normalizedResource = normalizeWorldSuiteResource(resource)
  const rawEvidence = evidence && typeof evidence === 'object' ? evidence : {}
  if (
    rawEvidence.installed !== true ||
    !Number.isFinite(Number(rawEvidence.version)) ||
    Number(rawEvidence.version) < 1 ||
    (rawEvidence.id && normalizeId(rawEvidence.id) !== normalizedResource.id) ||
    (rawEvidence.type && normalizeId(rawEvidence.type) !== normalizedResource.type) ||
    (rawEvidence.owner && normalizeId(rawEvidence.owner) !== normalizedResource.owner) ||
    (rawEvidence.ownerResourceId &&
      normalizeId(rawEvidence.ownerResourceId) !== normalizedResource.ownerResourceId)
  ) {
    return { ok: false, code: 'owner_evidence_invalid', inventory: current, resource: null }
  }
  const normalizedEvidence = normalizeInstalledWorldResource({
    ...rawEvidence,
    id: normalizedResource.id,
    type: normalizedResource.type,
    owner: normalizedResource.owner,
    ownerResourceId: evidence?.ownerResourceId || normalizedResource.ownerResourceId,
    catalogId: normalizedResource.catalogId,
  })
  const normalizedOrigin = normalizeWorldSuiteOrigin(origin)
  if (
    !normalizedResource.id ||
    !normalizedResource.type ||
    !normalizedResource.ownerResourceId ||
    normalizedEvidence.installed !== true ||
    normalizedEvidence.ownerResourceId !== normalizedResource.ownerResourceId ||
    normalizedEvidence.version < normalizedResource.version
  ) {
    return { ok: false, code: 'owner_evidence_invalid', inventory: current, resource: null }
  }

  const existing = current.resources.find((item) => item.id === normalizedResource.id) || null
  if (
    existing &&
    (existing.type !== normalizedResource.type ||
      existing.owner !== normalizedResource.owner ||
      existing.ownerResourceId !== normalizedResource.ownerResourceId)
  ) {
    return { ok: false, code: 'installed_identity_collision', inventory: current, resource: null }
  }

  const verifiedAt = normalizeTimestamp(now) || Date.now()
  const origins = [
    ...(existing?.origins || []),
    ...(normalizedOrigin ? [normalizedOrigin] : []),
  ]
  const nextResource = normalizeInstalledResourceRecord({
    ...normalizedEvidence,
    id: normalizedResource.id,
    type: normalizedResource.type,
    owner: normalizedResource.owner,
    ownerResourceId: normalizedResource.ownerResourceId,
    catalogId: normalizedResource.catalogId,
    version: normalizedEvidence.version,
    installed: true,
    origins,
    installedAt: existing?.installedAt || verifiedAt,
    updatedAt: verifiedAt,
    lastVerifiedAt: verifiedAt,
  })
  const resources = current.resources.filter((item) => item.id !== normalizedResource.id)
  resources.push(nextResource)
  const nextInventory = normalizeWorldSuiteInventory({ ...current, resources })
  return { ok: true, code: '', inventory: nextInventory, resource: clone(nextResource) }
}

export const detachWorldResourceOrigin = ({ inventory, resourceId, origin } = {}) => {
  const current = normalizeWorldSuiteInventory(inventory)
  const normalizedId = normalizeId(resourceId)
  const normalizedOrigin = normalizeWorldSuiteOrigin(origin)
  if (!normalizedId || !normalizedOrigin) {
    return { ok: false, code: 'origin_invalid', inventory: current, resource: null }
  }
  const existing = current.resources.find((item) => item.id === normalizedId)
  if (!existing) return { ok: true, code: '', inventory: current, resource: null }
  const origins = existing.origins.filter(
    (item) => !(item.kind === normalizedOrigin.kind && item.id === normalizedOrigin.id),
  )
  const nextResource = { ...existing, origins }
  const resources = current.resources.map((item) =>
    item.id === normalizedId ? nextResource : item,
  )
  return {
    ok: true,
    code: '',
    inventory: normalizeWorldSuiteInventory({ ...current, resources }),
    resource: clone(nextResource),
  }
}

export const removeInstalledWorldResource = (inventory = {}, resourceId = '') => {
  const current = normalizeWorldSuiteInventory(inventory)
  const normalizedId = normalizeId(resourceId)
  if (!normalizedId) return current
  return normalizeWorldSuiteInventory({
    ...current,
    resources: current.resources.filter((item) => item.id !== normalizedId),
  })
}

export const recordWorldSuiteState = (inventory = {}, rawState = {}) => {
  const current = normalizeWorldSuiteInventory(inventory)
  const suiteState = normalizeWorldSuiteState(rawState)
  if (!suiteState) return current
  return normalizeWorldSuiteInventory({
    ...current,
    suiteStates: [
      ...current.suiteStates.filter((item) => item.suiteId !== suiteState.suiteId),
      suiteState,
    ],
  })
}
