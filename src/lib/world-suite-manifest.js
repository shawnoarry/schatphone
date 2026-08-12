export const WORLD_SUITE_MANIFEST_VERSION = 1

export const WORLD_SUITE_RESOURCE_TYPES = Object.freeze({
  BOOK_ASSET: 'book_asset',
  WORLDBOOK_CANDIDATE: 'worldbook_candidate',
  PROFILE_TEMPLATE: 'profile_template',
  CAPABILITY_PACK: 'capability_pack',
  MAP_PACK: 'map_pack',
  APP_ENTRY: 'app_entry',
  SERVICE_ACCOUNT_TEMPLATE: 'service_account_template',
  SHOPPING_FACADE: 'shopping_facade',
  FOOD_DELIVERY_FACADE: 'food_delivery_facade',
  EVENT_TEMPLATE_PACK: 'event_template_pack',
  EVENT_VARIANT_PACK: 'event_variant_pack',
  CALENDAR_TEMPLATE: 'calendar_template',
  MUSIC_CATALOG: 'music_catalog',
  GALLERY_ASSET_PACK: 'gallery_asset_pack',
  MINI_SCENE_PROFILE: 'mini_scene_profile',
})

export const WORLD_SUITE_RESOURCE_OWNERS = Object.freeze({
  [WORLD_SUITE_RESOURCE_TYPES.BOOK_ASSET]: 'book',
  [WORLD_SUITE_RESOURCE_TYPES.WORLDBOOK_CANDIDATE]: 'worldbook',
  [WORLD_SUITE_RESOURCE_TYPES.PROFILE_TEMPLATE]: 'worldbook',
  [WORLD_SUITE_RESOURCE_TYPES.CAPABILITY_PACK]: 'world_pack',
  [WORLD_SUITE_RESOURCE_TYPES.MAP_PACK]: 'map',
  [WORLD_SUITE_RESOURCE_TYPES.APP_ENTRY]: 'app_store',
  [WORLD_SUITE_RESOURCE_TYPES.SERVICE_ACCOUNT_TEMPLATE]: 'world_pack',
  [WORLD_SUITE_RESOURCE_TYPES.SHOPPING_FACADE]: 'shopping',
  [WORLD_SUITE_RESOURCE_TYPES.FOOD_DELIVERY_FACADE]: 'food_delivery',
  [WORLD_SUITE_RESOURCE_TYPES.EVENT_TEMPLATE_PACK]: 'event_runtime',
  [WORLD_SUITE_RESOURCE_TYPES.EVENT_VARIANT_PACK]: 'event_runtime',
  [WORLD_SUITE_RESOURCE_TYPES.CALENDAR_TEMPLATE]: 'calendar',
  [WORLD_SUITE_RESOURCE_TYPES.MUSIC_CATALOG]: 'music',
  [WORLD_SUITE_RESOURCE_TYPES.GALLERY_ASSET_PACK]: 'gallery',
  [WORLD_SUITE_RESOURCE_TYPES.MINI_SCENE_PROFILE]: 'mini_scene',
})

export const WORLD_SUITE_UPDATE_POLICIES = Object.freeze({
  REPLACE_IF_UNMODIFIED: 'replace_if_unmodified',
  MANUAL_REVIEW: 'manual_review',
})

export const WORLD_SUITE_UNINSTALL_POLICIES = Object.freeze({
  REMOVE_IF_PRISTINE: 'remove_if_pristine',
  DETACH_ONLY: 'detach_only',
})

export const WORLD_SUITE_PLAN_ACTIONS = Object.freeze({
  INSTALL: 'install',
  UPDATE: 'update',
  KEEP: 'keep',
  REVIEW_UPDATE: 'review_update',
  BLOCKED: 'blocked',
  WAIT_FOR_DEPENDENCY_REVIEW: 'wait_for_dependency_review',
  DETACH_ORIGIN: 'detach_origin',
  DETACH_ORIGIN_AND_KEEP: 'detach_origin_and_keep',
  REMOVE: 'remove',
  NO_ACTION: 'no_action',
})

const RESOURCE_TYPE_SET = new Set(Object.values(WORLD_SUITE_RESOURCE_TYPES))
const UPDATE_POLICY_SET = new Set(Object.values(WORLD_SUITE_UPDATE_POLICIES))
const UNINSTALL_POLICY_SET = new Set(Object.values(WORLD_SUITE_UNINSTALL_POLICIES))
const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,179}$/i

const normalizeText = (value, max = 240) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
}

const normalizeId = (value) => {
  const normalized = normalizeText(value, 180)
  return ID_PATTERN.test(normalized) ? normalized : ''
}

const normalizeVersion = (value, fallback = 1) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(1, Math.floor(numeric))
}

const uniqueIds = (items = []) => [
  ...new Set((Array.isArray(items) ? items : []).map(normalizeId).filter(Boolean)),
]

const clone = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

export const normalizeWorldSuiteResource = (rawResource = {}) => {
  const source = rawResource && typeof rawResource === 'object' ? rawResource : {}
  const type = RESOURCE_TYPE_SET.has(source.type) ? source.type : ''
  const expectedOwner = WORLD_SUITE_RESOURCE_OWNERS[type] || ''
  const owner = normalizeId(source.owner) || expectedOwner
  const updatePolicy = UPDATE_POLICY_SET.has(source.updatePolicy)
    ? source.updatePolicy
    : WORLD_SUITE_UPDATE_POLICIES.REPLACE_IF_UNMODIFIED
  const uninstallPolicy = UNINSTALL_POLICY_SET.has(source.uninstallPolicy)
    ? source.uninstallPolicy
    : WORLD_SUITE_UNINSTALL_POLICIES.REMOVE_IF_PRISTINE

  return {
    id: normalizeId(source.id),
    type,
    owner,
    ownerResourceId: normalizeId(source.ownerResourceId || source.nativeId || source.id),
    version: normalizeVersion(source.version),
    title: normalizeText(source.title || source.name, 160),
    description: normalizeText(source.description, 600),
    catalogId: normalizeId(source.catalogId || source.ownerResourceId || source.nativeId || source.id),
    dependencies: uniqueIds(source.dependencies),
    optional: source.optional === true,
    independentlyInstallable: source.independentlyInstallable !== false,
    recommendEnable: source.recommendEnable === true,
    updatePolicy,
    uninstallPolicy,
  }
}

const findDependencyCycle = (resources = []) => {
  const byId = new Map(resources.map((resource) => [resource.id, resource]))
  const visiting = new Set()
  const visited = new Set()

  const visit = (resourceId, path = []) => {
    if (visiting.has(resourceId)) return [...path, resourceId]
    if (visited.has(resourceId)) return null
    visiting.add(resourceId)
    const resource = byId.get(resourceId)
    for (const dependencyId of resource?.dependencies || []) {
      if (!byId.has(dependencyId)) continue
      const cycle = visit(dependencyId, [...path, resourceId])
      if (cycle) return cycle
    }
    visiting.delete(resourceId)
    visited.add(resourceId)
    return null
  }

  for (const resource of resources) {
    const cycle = visit(resource.id)
    if (cycle) return cycle
  }
  return []
}

export const validateWorldSuiteManifest = (rawManifest = {}) => {
  const source = rawManifest && typeof rawManifest === 'object' ? rawManifest : {}
  const resources = (Array.isArray(source.resources) ? source.resources : []).map(
    normalizeWorldSuiteResource,
  )
  const errors = []
  const manifestId = normalizeId(source.id)
  if (!manifestId) errors.push({ code: 'invalid_suite_id', path: 'id' })
  if (resources.length === 0) errors.push({ code: 'empty_suite_resources', path: 'resources' })

  const seen = new Set()
  resources.forEach((resource, index) => {
    const path = `resources.${index}`
    if (!resource.id) errors.push({ code: 'invalid_resource_id', path: `${path}.id` })
    if (!resource.type) errors.push({ code: 'invalid_resource_type', path: `${path}.type` })
    if (!resource.ownerResourceId) {
      errors.push({ code: 'invalid_owner_resource_id', path: `${path}.ownerResourceId` })
    }
    if (!resource.independentlyInstallable) {
      errors.push({
        code: 'resource_not_independently_installable',
        path: `${path}.independentlyInstallable`,
        resourceId: resource.id,
      })
    }
    const expectedOwner = WORLD_SUITE_RESOURCE_OWNERS[resource.type]
    if (expectedOwner && resource.owner !== expectedOwner) {
      errors.push({
        code: 'resource_owner_mismatch',
        path: `${path}.owner`,
        expectedOwner,
        actualOwner: resource.owner,
      })
    }
    if (resource.id && seen.has(resource.id)) {
      errors.push({ code: 'duplicate_resource_id', path: `${path}.id`, resourceId: resource.id })
    }
    seen.add(resource.id)
  })

  const resourceIds = new Set(resources.map((resource) => resource.id).filter(Boolean))
  resources.forEach((resource, index) => {
    resource.dependencies.forEach((dependencyId) => {
      if (!resourceIds.has(dependencyId)) {
        errors.push({
          code: 'missing_manifest_dependency',
          path: `resources.${index}.dependencies`,
          resourceId: resource.id,
          dependencyId,
        })
      }
    })
  })
  const dependencyCycle = findDependencyCycle(resources)
  if (dependencyCycle.length > 0) {
    errors.push({ code: 'dependency_cycle', path: 'resources', resourceIds: dependencyCycle })
  }

  const manifest = {
    schemaVersion: WORLD_SUITE_MANIFEST_VERSION,
    id: manifestId,
    version: normalizeVersion(source.version),
    title: normalizeText(source.title || source.name || manifestId, 160),
    description: normalizeText(source.description, 800),
    worldArchetype: normalizeId(source.worldArchetype),
    resources,
  }

  return {
    ok: errors.length === 0,
    manifest: deepFreeze(manifest),
    errors: deepFreeze(errors),
  }
}

export const normalizeWorldSuiteOrigin = (rawOrigin = {}) => {
  const source = rawOrigin && typeof rawOrigin === 'object' ? rawOrigin : {}
  const kind = source.kind === 'suite' ? 'suite' : 'independent'
  const id = normalizeId(source.id)
  return id ? { kind, id } : null
}

export const normalizeInstalledWorldResource = (rawResource = {}) => {
  const source = rawResource && typeof rawResource === 'object' ? rawResource : {}
  const originKeys = new Set()
  return {
    id: normalizeId(source.id),
    type: RESOURCE_TYPE_SET.has(source.type) ? source.type : '',
    owner: normalizeId(source.owner),
    ownerResourceId: normalizeId(source.ownerResourceId || source.nativeId),
    catalogId: normalizeId(source.catalogId || source.ownerResourceId || source.nativeId),
    version: normalizeVersion(source.version),
    installed: source.installed !== false,
    enabled: source.enabled === true,
    inUse: source.inUse === true,
    userModified: source.userModified === true,
    historicalReferenceCount: Math.max(0, Math.floor(Number(source.historicalReferenceCount) || 0)),
    origins: (Array.isArray(source.origins) ? source.origins : [])
      .map(normalizeWorldSuiteOrigin)
      .filter((origin) => {
        if (!origin) return false
        const key = `${origin.kind}:${origin.id}`
        if (originKeys.has(key)) return false
        originKeys.add(key)
        return true
      }),
    installedAt: Math.max(0, Math.floor(Number(source.installedAt) || 0)),
    updatedAt: Math.max(0, Math.floor(Number(source.updatedAt) || 0)),
    lastVerifiedAt: Math.max(0, Math.floor(Number(source.lastVerifiedAt) || 0)),
  }
}

const listResourcesInDependencyOrder = (resources = []) => {
  const byId = new Map(resources.map((resource) => [resource.id, resource]))
  const visited = new Set()
  const ordered = []
  const visit = (resource) => {
    if (!resource || visited.has(resource.id)) return
    visited.add(resource.id)
    resource.dependencies.forEach((dependencyId) => visit(byId.get(dependencyId)))
    ordered.push(resource)
  }
  resources.forEach(visit)
  return ordered
}

const classifyInstallAction = (resource, installed) => {
  if (!installed || installed.installed === false) {
    return { action: WORLD_SUITE_PLAN_ACTIONS.INSTALL, reason: 'not_installed' }
  }
  if (
    installed.type !== resource.type ||
    installed.owner !== resource.owner ||
    (installed.ownerResourceId && installed.ownerResourceId !== resource.ownerResourceId)
  ) {
    return { action: WORLD_SUITE_PLAN_ACTIONS.BLOCKED, reason: 'installed_identity_collision' }
  }
  if (installed.version >= resource.version) {
    return { action: WORLD_SUITE_PLAN_ACTIONS.KEEP, reason: 'current_or_newer_version' }
  }
  if (
    installed.userModified ||
    installed.inUse ||
    resource.updatePolicy === WORLD_SUITE_UPDATE_POLICIES.MANUAL_REVIEW
  ) {
    return {
      action: WORLD_SUITE_PLAN_ACTIONS.REVIEW_UPDATE,
      reason: installed.inUse ? 'resource_in_use' : 'user_review_required',
    }
  }
  return { action: WORLD_SUITE_PLAN_ACTIONS.UPDATE, reason: 'older_unmodified_version' }
}

const createPlanRow = (resource, installed, classification) => ({
  resourceId: resource.id,
  type: resource.type,
  owner: resource.owner,
  ownerResourceId: resource.ownerResourceId,
  catalogId: resource.catalogId,
  fromVersion: installed?.installed === false ? 0 : installed?.version || 0,
  toVersion: resource.version,
  dependencies: [...resource.dependencies],
  action: classification.action,
  reason: classification.reason,
  recommendEnable: resource.recommendEnable,
})

export const buildWorldResourceInstallPlan = ({ resource, installedResources = [] } = {}) => {
  const normalizedResource = normalizeWorldSuiteResource(resource)
  const installedById = new Map(
    (Array.isArray(installedResources) ? installedResources : [])
      .map(normalizeInstalledWorldResource)
      .filter((item) => item.id)
      .map((item) => [item.id, item]),
  )
  const installed = installedById.get(normalizedResource.id) || null
  const missingDependencies = normalizedResource.dependencies.filter(
    (dependencyId) => installedById.get(dependencyId)?.installed !== true,
  )
  const classification = classifyInstallAction(normalizedResource, installed)
  if (
    missingDependencies.length > 0 &&
    [WORLD_SUITE_PLAN_ACTIONS.INSTALL, WORLD_SUITE_PLAN_ACTIONS.UPDATE].includes(
      classification.action,
    )
  ) {
    classification.action = WORLD_SUITE_PLAN_ACTIONS.WAIT_FOR_DEPENDENCY_REVIEW
    classification.reason = 'dependencies_not_installed'
  }
  return deepFreeze(
    {
      ...createPlanRow(normalizedResource, installed, classification),
      missingDependencies,
    },
  )
}

export const buildWorldSuiteInstallPlan = ({ manifest, installedResources = [] } = {}) => {
  const validation = validateWorldSuiteManifest(manifest)
  if (!validation.ok) {
    return deepFreeze({
      ok: false,
      readyToApply: false,
      suiteId: validation.manifest.id,
      actions: [],
      enableRecommendations: [],
      errors: validation.errors,
    })
  }

  const installedById = new Map(
    (Array.isArray(installedResources) ? installedResources : [])
      .map(normalizeInstalledWorldResource)
      .filter((item) => item.id)
      .map((item) => [item.id, item]),
  )
  const actions = listResourcesInDependencyOrder(validation.manifest.resources).map((resource) => {
    const installed = installedById.get(resource.id) || null
    return createPlanRow(resource, installed, classifyInstallAction(resource, installed))
  })
  const actionById = new Map(actions.map((action) => [action.resourceId, action]))
  actions.forEach((action) => {
    if (![WORLD_SUITE_PLAN_ACTIONS.INSTALL, WORLD_SUITE_PLAN_ACTIONS.UPDATE].includes(action.action)) {
      return
    }
    const dependencyNeedsReview = action.dependencies.some((dependencyId) =>
      [
        WORLD_SUITE_PLAN_ACTIONS.BLOCKED,
        WORLD_SUITE_PLAN_ACTIONS.REVIEW_UPDATE,
        WORLD_SUITE_PLAN_ACTIONS.WAIT_FOR_DEPENDENCY_REVIEW,
      ].includes(actionById.get(dependencyId)?.action),
    )
    if (dependencyNeedsReview) {
      action.action = WORLD_SUITE_PLAN_ACTIONS.WAIT_FOR_DEPENDENCY_REVIEW
      action.reason = 'dependency_requires_review'
    }
  })

  const blockingActions = new Set([
    WORLD_SUITE_PLAN_ACTIONS.BLOCKED,
    WORLD_SUITE_PLAN_ACTIONS.REVIEW_UPDATE,
    WORLD_SUITE_PLAN_ACTIONS.WAIT_FOR_DEPENDENCY_REVIEW,
  ])
  return deepFreeze({
    ok: true,
    readyToApply: actions.every((action) => !blockingActions.has(action.action)),
    suiteId: validation.manifest.id,
    suiteVersion: validation.manifest.version,
    actions,
    enableRecommendations: actions
      .filter((action) => action.recommendEnable)
      .map((action) => action.resourceId),
    errors: [],
  })
}

export const buildWorldSuiteUninstallPlan = ({ manifest, installedResources = [] } = {}) => {
  const validation = validateWorldSuiteManifest(manifest)
  if (!validation.ok) {
    return deepFreeze({ ok: false, suiteId: validation.manifest.id, actions: [], errors: validation.errors })
  }
  const installedById = new Map(
    (Array.isArray(installedResources) ? installedResources : [])
      .map(normalizeInstalledWorldResource)
      .filter((item) => item.id)
      .map((item) => [item.id, item]),
  )
  const resources = listResourcesInDependencyOrder(validation.manifest.resources).reverse()
  const actions = resources.map((resource) => {
    const installed = installedById.get(resource.id)
    if (!installed?.installed) {
      return createPlanRow(resource, installed, {
        action: WORLD_SUITE_PLAN_ACTIONS.NO_ACTION,
        reason: 'not_installed',
      })
    }
    const hasSuiteOrigin = installed.origins.some(
      (origin) => origin.kind === 'suite' && origin.id === validation.manifest.id,
    )
    if (!hasSuiteOrigin) {
      return createPlanRow(resource, installed, {
        action: WORLD_SUITE_PLAN_ACTIONS.NO_ACTION,
        reason: 'not_installed_by_suite',
      })
    }
    const remainingOrigins = installed.origins.filter(
      (origin) => !(origin.kind === 'suite' && origin.id === validation.manifest.id),
    )
    if (remainingOrigins.length > 0) {
      return createPlanRow(resource, installed, {
        action: WORLD_SUITE_PLAN_ACTIONS.DETACH_ORIGIN,
        reason: 'shared_or_independent_install',
      })
    }
    if (
      resource.uninstallPolicy === WORLD_SUITE_UNINSTALL_POLICIES.DETACH_ONLY ||
      installed.userModified ||
      installed.inUse ||
      installed.historicalReferenceCount > 0
    ) {
      return createPlanRow(resource, installed, {
        action: WORLD_SUITE_PLAN_ACTIONS.DETACH_ORIGIN_AND_KEEP,
        reason: installed.historicalReferenceCount > 0
          ? 'historical_references_preserved'
          : installed.userModified
            ? 'user_changes_preserved'
            : installed.inUse
              ? 'resource_in_use'
              : 'detach_only_policy',
      })
    }
    return createPlanRow(resource, installed, {
      action: WORLD_SUITE_PLAN_ACTIONS.REMOVE,
      reason: 'suite_only_pristine_resource',
    })
  })

  return deepFreeze({
    ok: true,
    suiteId: validation.manifest.id,
    actions,
    historyDeletionActions: [],
    errors: [],
  })
}

export const createWorldSuiteRegistry = (initialManifests = []) => {
  const records = new Map()
  const register = (manifest) => {
    const validation = validateWorldSuiteManifest(manifest)
    if (!validation.ok) return { ok: false, manifest: null, errors: validation.errors }
    if (records.has(validation.manifest.id)) {
      return {
        ok: false,
        manifest: null,
        errors: [{ code: 'duplicate_suite_id', path: 'id', suiteId: validation.manifest.id }],
      }
    }
    records.set(validation.manifest.id, validation.manifest)
    return { ok: true, manifest: clone(validation.manifest), errors: [] }
  }
  const initialErrors = []
  ;(Array.isArray(initialManifests) ? initialManifests : []).forEach((manifest) => {
    const result = register(manifest)
    if (!result.ok) initialErrors.push(...result.errors)
  })

  return {
    initialErrors: deepFreeze(initialErrors),
    register,
    unregister: (suiteId) => records.delete(normalizeId(suiteId)),
    get: (suiteId) => {
      const manifest = records.get(normalizeId(suiteId))
      return manifest ? clone(manifest) : null
    },
    list: () => [...records.values()].sort((a, b) => a.id.localeCompare(b.id)).map(clone),
  }
}
