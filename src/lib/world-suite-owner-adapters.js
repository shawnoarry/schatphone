import {
  WORLD_SUITE_PLAN_ACTIONS,
  normalizeInstalledWorldResource,
  normalizeWorldSuiteResource,
  validateWorldSuiteManifest,
} from './world-suite-manifest'
import {
  WORLD_SUITE_OPERATION_STATUSES,
  WORLD_SUITE_OPERATION_TYPES,
  detachWorldResourceOrigin,
  normalizeWorldSuiteInventory,
  recordInstalledWorldResource,
  recordWorldSuiteState,
  removeInstalledWorldResource,
} from './world-suite-inventory'

export const WORLD_SUITE_ADAPTER_ERROR_CODES = Object.freeze({
  INVALID_PLAN: 'invalid_plan',
  INVALID_MANIFEST: 'invalid_manifest',
  OWNER_NOT_REGISTERED: 'owner_not_registered',
  OWNER_ACTION_UNSUPPORTED: 'owner_action_unsupported',
  OWNER_OPERATION_FAILED: 'owner_operation_failed',
  OWNER_EVIDENCE_INVALID: 'owner_evidence_invalid',
  OWNER_INSTALL_NOT_CONFIRMED: 'owner_install_not_confirmed',
  OWNER_REMOVE_NOT_CONFIRMED: 'owner_remove_not_confirmed',
  INVENTORY_CHECKPOINT_FAILED: 'inventory_checkpoint_failed',
  REVIEW_REQUIRED: 'review_required',
})

const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,179}$/i

const normalizeId = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  const normalized = String(value).normalize('NFKC').trim().slice(0, 180)
  return ID_PATTERN.test(normalized) ? normalized : ''
}

const clone = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

const normalizeAdapter = (rawAdapter = {}) => {
  const source = rawAdapter && typeof rawAdapter === 'object' ? rawAdapter : {}
  const owner = normalizeId(source.owner)
  if (!owner || typeof source.inspect !== 'function') return null
  return {
    owner,
    inspect: source.inspect,
    install: typeof source.install === 'function' ? source.install : null,
    update: typeof source.update === 'function' ? source.update : null,
    remove: typeof source.remove === 'function' ? source.remove : null,
  }
}

export const createWorldSuiteOwnerAdapterRegistry = (initialAdapters = []) => {
  const adapters = new Map()

  const register = (rawAdapter) => {
    const adapter = normalizeAdapter(rawAdapter)
    if (!adapter) {
      return { ok: false, code: 'adapter_invalid', owner: '' }
    }
    if (adapters.has(adapter.owner)) {
      return { ok: false, code: 'adapter_duplicate', owner: adapter.owner }
    }
    adapters.set(adapter.owner, adapter)
    return { ok: true, code: '', owner: adapter.owner }
  }

  const initialErrors = []
  ;(Array.isArray(initialAdapters) ? initialAdapters : []).forEach((adapter) => {
    const result = register(adapter)
    if (!result.ok) initialErrors.push(result)
  })

  return {
    initialErrors,
    register,
    unregister: (owner) => adapters.delete(normalizeId(owner)),
    has: (owner) => adapters.has(normalizeId(owner)),
    get: (owner) => adapters.get(normalizeId(owner)) || null,
    listOwners: () => [...adapters.keys()].sort((left, right) => left.localeCompare(right)),
  }
}

const BLOCKING_ACTIONS = new Set([
  WORLD_SUITE_PLAN_ACTIONS.BLOCKED,
  WORLD_SUITE_PLAN_ACTIONS.REVIEW_UPDATE,
  WORLD_SUITE_PLAN_ACTIONS.WAIT_FOR_DEPENDENCY_REVIEW,
])

const OWNER_ACTIONS = new Set([
  WORLD_SUITE_PLAN_ACTIONS.INSTALL,
  WORLD_SUITE_PLAN_ACTIONS.UPDATE,
  WORLD_SUITE_PLAN_ACTIONS.KEEP,
  WORLD_SUITE_PLAN_ACTIONS.REMOVE,
])

const INSTALL_PLAN_ACTIONS = new Set([
  WORLD_SUITE_PLAN_ACTIONS.INSTALL,
  WORLD_SUITE_PLAN_ACTIONS.UPDATE,
  WORLD_SUITE_PLAN_ACTIONS.KEEP,
  WORLD_SUITE_PLAN_ACTIONS.NO_ACTION,
  ...BLOCKING_ACTIONS,
])

const UNINSTALL_PLAN_ACTIONS = new Set([
  WORLD_SUITE_PLAN_ACTIONS.DETACH_ORIGIN,
  WORLD_SUITE_PLAN_ACTIONS.DETACH_ORIGIN_AND_KEEP,
  WORLD_SUITE_PLAN_ACTIONS.REMOVE,
  WORLD_SUITE_PLAN_ACTIONS.NO_ACTION,
])

const normalizeOwnerEvidence = (rawEvidence, resource) => {
  const source = rawEvidence && typeof rawEvidence === 'object' ? rawEvidence : {}
  if (
    typeof source.installed !== 'boolean' ||
    (source.installed && (!Number.isFinite(Number(source.version)) || Number(source.version) < 1)) ||
    (source.id && normalizeId(source.id) !== resource.id) ||
    (source.type && normalizeId(source.type) !== resource.type) ||
    (source.owner && normalizeId(source.owner) !== resource.owner) ||
    (source.ownerResourceId && normalizeId(source.ownerResourceId) !== resource.ownerResourceId)
  ) {
    return null
  }
  const evidence = normalizeInstalledWorldResource({
    ...source,
    id: resource.id,
    type: resource.type,
    owner: resource.owner,
    ownerResourceId: rawEvidence?.ownerResourceId || resource.ownerResourceId,
    catalogId: resource.catalogId,
  })
  if (
    evidence.id !== resource.id ||
    evidence.type !== resource.type ||
    evidence.owner !== resource.owner ||
    evidence.ownerResourceId !== resource.ownerResourceId
  ) {
    return null
  }
  return evidence
}

const callOwner = async (callback, context) => {
  try {
    const result = await callback(context)
    if (result?.ok === false) {
      return {
        ok: false,
        code: normalizeId(result.code) || WORLD_SUITE_ADAPTER_ERROR_CODES.OWNER_OPERATION_FAILED,
      }
    }
    return { ok: true, code: '', result }
  } catch (error) {
    return {
      ok: false,
      code: normalizeId(error?.code) || WORLD_SUITE_ADAPTER_ERROR_CODES.OWNER_OPERATION_FAILED,
    }
  }
}

const inspectOwnerResource = async ({ adapter, resource, origin, action }) => {
  const inspected = await callOwner(adapter.inspect, {
    resource: clone(resource),
    origin: clone(origin),
    action,
  })
  if (!inspected.ok) return inspected
  const evidence = normalizeOwnerEvidence(inspected.result?.resource || inspected.result, resource)
  if (!evidence) {
    return { ok: false, code: WORLD_SUITE_ADAPTER_ERROR_CODES.OWNER_EVIDENCE_INVALID }
  }
  return { ok: true, code: '', evidence }
}

const executeOwnerAction = async ({ adapter, resource, action, origin }) => {
  const beforeMutation = await inspectOwnerResource({ adapter, resource, origin, action })
  if (!beforeMutation.ok) return beforeMutation

  if (action === WORLD_SUITE_PLAN_ACTIONS.KEEP) {
    const inspected = beforeMutation
    if (!inspected.evidence.installed || inspected.evidence.version < resource.version) {
      return { ok: false, code: WORLD_SUITE_ADAPTER_ERROR_CODES.OWNER_INSTALL_NOT_CONFIRMED }
    }
    return inspected
  }

  if (
    (action === WORLD_SUITE_PLAN_ACTIONS.INSTALL ||
      action === WORLD_SUITE_PLAN_ACTIONS.UPDATE) &&
    beforeMutation.evidence.installed &&
    beforeMutation.evidence.version >= resource.version
  ) {
    return beforeMutation
  }

  if (action === WORLD_SUITE_PLAN_ACTIONS.REMOVE && !beforeMutation.evidence.installed) {
    return beforeMutation
  }

  const methodName = action === WORLD_SUITE_PLAN_ACTIONS.INSTALL
    ? 'install'
    : action === WORLD_SUITE_PLAN_ACTIONS.UPDATE
      ? 'update'
      : 'remove'
  const callback = adapter[methodName]
  if (typeof callback !== 'function') {
    return { ok: false, code: WORLD_SUITE_ADAPTER_ERROR_CODES.OWNER_ACTION_UNSUPPORTED }
  }
  const operation = await callOwner(callback, {
    resource: clone(resource),
    origin: clone(origin),
    action,
  })
  if (!operation.ok) return operation
  const inspected = await inspectOwnerResource({ adapter, resource, origin, action })
  if (!inspected.ok) return inspected
  if (action === WORLD_SUITE_PLAN_ACTIONS.REMOVE) {
    if (inspected.evidence.installed) {
      return { ok: false, code: WORLD_SUITE_ADAPTER_ERROR_CODES.OWNER_REMOVE_NOT_CONFIRMED }
    }
    return inspected
  }
  if (!inspected.evidence.installed || inspected.evidence.version < resource.version) {
    return { ok: false, code: WORLD_SUITE_ADAPTER_ERROR_CODES.OWNER_INSTALL_NOT_CONFIRMED }
  }
  return inspected
}

const checkpointInventory = async (onInventoryChanged, inventory, detail) => {
  if (typeof onInventoryChanged !== 'function') return { ok: true, code: '' }
  try {
    const result = await onInventoryChanged(clone(inventory), clone(detail))
    if (result === false || result?.ok === false) {
      return { ok: false, code: WORLD_SUITE_ADAPTER_ERROR_CODES.INVENTORY_CHECKPOINT_FAILED }
    }
    return { ok: true, code: '' }
  } catch {
    return { ok: false, code: WORLD_SUITE_ADAPTER_ERROR_CODES.INVENTORY_CHECKPOINT_FAILED }
  }
}

const buildSuiteState = ({
  suiteId,
  manifestVersion,
  operation,
  status,
  resourceIds,
  completedResourceIds,
  failedResourceId = '',
  errorCode = '',
  startedAt,
  now,
}) => ({
  suiteId,
  manifestVersion,
  operation,
  status,
  resourceIds,
  completedResourceIds,
  pendingResourceIds: resourceIds.filter((resourceId) => !completedResourceIds.includes(resourceId)),
  failedResourceId,
  errorCode,
  startedAt,
  updatedAt: now,
  completedAt:
    status === WORLD_SUITE_OPERATION_STATUSES.INSTALLED ||
    status === WORLD_SUITE_OPERATION_STATUSES.DETACHED
      ? now
      : 0,
})

export const executeWorldResourcePlan = async ({
  resource,
  plan,
  inventory,
  adapterRegistry,
  originId = '',
  onInventoryChanged,
  now = Date.now(),
} = {}) => {
  const normalizedResource = normalizeWorldSuiteResource(resource)
  let nextInventory = normalizeWorldSuiteInventory(inventory)
  if (
    !normalizedResource.id ||
    !normalizedResource.type ||
    !normalizedResource.owner ||
    !normalizedResource.ownerResourceId ||
    plan?.resourceId !== normalizedResource.id ||
    plan?.type !== normalizedResource.type ||
    plan?.owner !== normalizedResource.owner ||
    plan?.ownerResourceId !== normalizedResource.ownerResourceId
  ) {
    return {
      ok: false,
      code: WORLD_SUITE_ADAPTER_ERROR_CODES.INVALID_PLAN,
      inventory: nextInventory,
    }
  }
  if (BLOCKING_ACTIONS.has(plan.action)) {
    return {
      ok: false,
      code: WORLD_SUITE_ADAPTER_ERROR_CODES.REVIEW_REQUIRED,
      inventory: nextInventory,
    }
  }
  if (![WORLD_SUITE_PLAN_ACTIONS.INSTALL, WORLD_SUITE_PLAN_ACTIONS.UPDATE, WORLD_SUITE_PLAN_ACTIONS.KEEP].includes(plan.action)) {
    return {
      ok: false,
      code: WORLD_SUITE_ADAPTER_ERROR_CODES.INVALID_PLAN,
      inventory: nextInventory,
    }
  }
  const adapter = adapterRegistry?.get?.(normalizedResource.owner)
  if (!adapter) {
    return {
      ok: false,
      code: WORLD_SUITE_ADAPTER_ERROR_CODES.OWNER_NOT_REGISTERED,
      inventory: nextInventory,
    }
  }
  const origin = {
    kind: 'independent',
    id: normalizeId(originId) || normalizedResource.catalogId || normalizedResource.ownerResourceId,
  }
  const ownerResult = await executeOwnerAction({
    adapter,
    resource: normalizedResource,
    action: plan.action,
    origin,
  })
  if (!ownerResult.ok) {
    return { ok: false, code: ownerResult.code, inventory: nextInventory }
  }
  const recorded = recordInstalledWorldResource({
    inventory: nextInventory,
    resource: normalizedResource,
    evidence: ownerResult.evidence,
    origin,
    now,
  })
  if (!recorded.ok) return recorded
  nextInventory = recorded.inventory
  const checkpoint = await checkpointInventory(onInventoryChanged, nextInventory, {
    action: clone(plan),
    origin: clone(origin),
  })
  if (!checkpoint.ok) {
    return { ok: false, code: checkpoint.code, inventory: nextInventory }
  }
  return {
    ok: true,
    code: '',
    inventory: nextInventory,
    resource: clone(recorded.resource),
  }
}

export const executeWorldSuitePlan = async ({
  manifest,
  plan,
  inventory,
  adapterRegistry,
  operation = WORLD_SUITE_OPERATION_TYPES.INSTALL,
  onInventoryChanged,
  now = Date.now(),
} = {}) => {
  const validation = validateWorldSuiteManifest(manifest)
  let nextInventory = normalizeWorldSuiteInventory(inventory)
  if (!validation.ok) {
    return {
      ok: false,
      code: WORLD_SUITE_ADAPTER_ERROR_CODES.INVALID_MANIFEST,
      inventory: nextInventory,
      completedResourceIds: [],
    }
  }
  const normalizedOperation = operation === WORLD_SUITE_OPERATION_TYPES.UNINSTALL
    ? WORLD_SUITE_OPERATION_TYPES.UNINSTALL
    : WORLD_SUITE_OPERATION_TYPES.INSTALL
  const actions = Array.isArray(plan?.actions) ? plan.actions : []
  if (plan?.ok !== true || plan.suiteId !== validation.manifest.id || actions.length === 0) {
    return {
      ok: false,
      code: WORLD_SUITE_ADAPTER_ERROR_CODES.INVALID_PLAN,
      inventory: nextInventory,
      completedResourceIds: [],
    }
  }
  const resourceById = new Map(
    validation.manifest.resources.map((resource) => [resource.id, resource]),
  )
  if (actions.some((action) => !resourceById.has(action.resourceId))) {
    return {
      ok: false,
      code: WORLD_SUITE_ADAPTER_ERROR_CODES.INVALID_PLAN,
      inventory: nextInventory,
      completedResourceIds: [],
    }
  }
  const plannedResourceIds = actions.map((action) => action.resourceId)
  const manifestResourceIds = validation.manifest.resources.map((resource) => resource.id)
  if (
    new Set(plannedResourceIds).size !== plannedResourceIds.length ||
    plannedResourceIds.length !== manifestResourceIds.length ||
    manifestResourceIds.some((resourceId) => !plannedResourceIds.includes(resourceId)) ||
    (plan.suiteVersion != null && Number(plan.suiteVersion) !== validation.manifest.version)
  ) {
    return {
      ok: false,
      code: WORLD_SUITE_ADAPTER_ERROR_CODES.INVALID_PLAN,
      inventory: nextInventory,
      completedResourceIds: [],
    }
  }
  const allowedActions = normalizedOperation === WORLD_SUITE_OPERATION_TYPES.UNINSTALL
    ? UNINSTALL_PLAN_ACTIONS
    : INSTALL_PLAN_ACTIONS
  if (actions.some((action) => !allowedActions.has(action.action))) {
    return {
      ok: false,
      code: WORLD_SUITE_ADAPTER_ERROR_CODES.INVALID_PLAN,
      inventory: nextInventory,
      completedResourceIds: [],
    }
  }

  const resourceIds = actions.map((action) => action.resourceId)
  const completedResourceIds = []
  const startedAt = Math.max(0, Math.floor(Number(now) || Date.now()))
  const origin = { kind: 'suite', id: validation.manifest.id }
  const blockingAction = actions.find((action) => BLOCKING_ACTIONS.has(action.action))
  if (blockingAction) {
    const suiteState = buildSuiteState({
      suiteId: validation.manifest.id,
      manifestVersion: validation.manifest.version,
      operation: normalizedOperation,
      status: WORLD_SUITE_OPERATION_STATUSES.REVIEW_REQUIRED,
      resourceIds,
      completedResourceIds,
      failedResourceId: blockingAction.resourceId,
      errorCode: WORLD_SUITE_ADAPTER_ERROR_CODES.REVIEW_REQUIRED,
      startedAt,
      now: startedAt,
    })
    nextInventory = recordWorldSuiteState(nextInventory, suiteState)
    await checkpointInventory(onInventoryChanged, nextInventory, { suiteState })
    return {
      ok: false,
      code: WORLD_SUITE_ADAPTER_ERROR_CODES.REVIEW_REQUIRED,
      inventory: nextInventory,
      completedResourceIds,
      failedResourceId: blockingAction.resourceId,
    }
  }

  const runningState = buildSuiteState({
    suiteId: validation.manifest.id,
    manifestVersion: validation.manifest.version,
    operation: normalizedOperation,
    status: WORLD_SUITE_OPERATION_STATUSES.RUNNING,
    resourceIds,
    completedResourceIds,
    startedAt,
    now: startedAt,
  })
  nextInventory = recordWorldSuiteState(nextInventory, runningState)
  const initialCheckpoint = await checkpointInventory(onInventoryChanged, nextInventory, {
    suiteState: runningState,
  })
  if (!initialCheckpoint.ok) {
    return {
      ok: false,
      code: initialCheckpoint.code,
      inventory: nextInventory,
      completedResourceIds,
    }
  }

  const fail = async (failedResourceId, errorCode) => {
    const status = completedResourceIds.length > 0 && completedResourceIds.length < resourceIds.length
      ? WORLD_SUITE_OPERATION_STATUSES.PARTIAL
      : WORLD_SUITE_OPERATION_STATUSES.FAILED
    const failedAt = Math.max(startedAt, Math.floor(Number(now) || Date.now()))
    const suiteState = buildSuiteState({
      suiteId: validation.manifest.id,
      manifestVersion: validation.manifest.version,
      operation: normalizedOperation,
      status,
      resourceIds,
      completedResourceIds,
      failedResourceId,
      errorCode,
      startedAt,
      now: failedAt,
    })
    nextInventory = recordWorldSuiteState(nextInventory, suiteState)
    await checkpointInventory(onInventoryChanged, nextInventory, { suiteState })
    return {
      ok: false,
      code: errorCode,
      inventory: nextInventory,
      completedResourceIds: [...completedResourceIds],
      failedResourceId,
    }
  }

  for (const action of actions) {
    const resource = resourceById.get(action.resourceId)
    if (OWNER_ACTIONS.has(action.action)) {
      const adapter = adapterRegistry?.get?.(resource.owner)
      if (!adapter) {
        return fail(resource.id, WORLD_SUITE_ADAPTER_ERROR_CODES.OWNER_NOT_REGISTERED)
      }
      const ownerResult = await executeOwnerAction({
        adapter,
        resource,
        action: action.action,
        origin,
      })
      if (!ownerResult.ok) return fail(resource.id, ownerResult.code)
      if (action.action === WORLD_SUITE_PLAN_ACTIONS.REMOVE) {
        nextInventory = removeInstalledWorldResource(nextInventory, resource.id)
      } else {
        const recorded = recordInstalledWorldResource({
          inventory: nextInventory,
          resource,
          evidence: ownerResult.evidence,
          origin,
          now,
        })
        if (!recorded.ok) return fail(resource.id, recorded.code)
        nextInventory = recorded.inventory
      }
    } else if (
      action.action === WORLD_SUITE_PLAN_ACTIONS.DETACH_ORIGIN ||
      action.action === WORLD_SUITE_PLAN_ACTIONS.DETACH_ORIGIN_AND_KEEP
    ) {
      nextInventory = detachWorldResourceOrigin({
        inventory: nextInventory,
        resourceId: resource.id,
        origin,
      }).inventory
    }
    completedResourceIds.push(resource.id)
    const progressState = buildSuiteState({
      suiteId: validation.manifest.id,
      manifestVersion: validation.manifest.version,
      operation: normalizedOperation,
      status: WORLD_SUITE_OPERATION_STATUSES.RUNNING,
      resourceIds,
      completedResourceIds,
      startedAt,
      now: Math.max(startedAt, Math.floor(Number(now) || Date.now())),
    })
    nextInventory = recordWorldSuiteState(nextInventory, progressState)
    const checkpoint = await checkpointInventory(onInventoryChanged, nextInventory, {
      action: clone(action),
      completedResourceIds: [...completedResourceIds],
    })
    if (!checkpoint.ok) return fail(resource.id, checkpoint.code)
  }

  const completedAt = Math.max(startedAt, Math.floor(Number(now) || Date.now()))
  const finalStatus = normalizedOperation === WORLD_SUITE_OPERATION_TYPES.UNINSTALL
    ? WORLD_SUITE_OPERATION_STATUSES.DETACHED
    : WORLD_SUITE_OPERATION_STATUSES.INSTALLED
  const suiteState = buildSuiteState({
    suiteId: validation.manifest.id,
    manifestVersion: validation.manifest.version,
    operation: normalizedOperation,
    status: finalStatus,
    resourceIds,
    completedResourceIds,
    startedAt,
    now: completedAt,
  })
  nextInventory = recordWorldSuiteState(nextInventory, suiteState)
  const finalCheckpoint = await checkpointInventory(onInventoryChanged, nextInventory, {
    suiteState,
  })
  if (!finalCheckpoint.ok) {
    return fail('', finalCheckpoint.code)
  }
  return {
    ok: true,
    code: '',
    inventory: nextInventory,
    completedResourceIds: [...completedResourceIds],
    suiteState: clone(suiteState),
  }
}
