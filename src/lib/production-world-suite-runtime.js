import { createBookWorldSuiteOwnerAdapter } from './book-world-suite-owner-adapter'
import { createMapGalleryWorldSuiteRuntime } from './map-gallery-world-suite-runtime'
import {
  WORLD_SUITE_RESOURCE_OWNERS,
  buildWorldResourceInstallPlan,
  buildWorldSuiteInstallPlan,
  buildWorldSuiteUninstallPlan,
  createWorldSuiteRegistry,
  normalizeWorldSuiteResource,
} from './world-suite-manifest'
import {
  WORLD_SUITE_OPERATION_TYPES,
  normalizeWorldSuiteInventory,
} from './world-suite-inventory'
import {
  executeWorldResourcePlan,
  executeWorldSuitePlan,
} from './world-suite-owner-adapters'

export const PRODUCTION_WORLD_SUITE_ERROR_CODES = Object.freeze({
  RUNTIME_NOT_READY: 'runtime_not_ready',
  SUITE_NOT_FOUND: 'suite_not_found',
  INVALID_RESOURCE: 'invalid_resource',
  OPERATION_IN_PROGRESS: 'operation_in_progress',
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

const requireSystemInventoryStore = (systemStore) => {
  if (
    !systemStore ||
    typeof systemStore.getWorldSuiteInventorySnapshot !== 'function' ||
    typeof systemStore.replaceWorldSuiteInventory !== 'function' ||
    typeof systemStore.saveNow !== 'function' ||
    typeof systemStore.listWorldBookSourceLinks !== 'function'
  ) {
    throw new TypeError('A System Store with World Suite inventory persistence is required.')
  }
}

const createRuntimeFailure = (code, extras = {}) => ({
  ok: false,
  code,
  ...extras,
})

export const createProductionWorldSuiteRuntime = ({
  systemStore,
  bookStore,
  galleryStore,
  mapStore,
  simulationStore,
  chatStore,
  manifests = [],
  catalogRecords = [],
} = {}) => {
  requireSystemInventoryStore(systemStore)

  const nativeRuntime = createMapGalleryWorldSuiteRuntime({
    galleryStore,
    mapStore,
    simulationStore,
    chatStore,
    catalogRecords,
  })
  const bookAdapter = createBookWorldSuiteOwnerAdapter({
    bookStore,
    listWorldBookSourceLinks: () => systemStore.listWorldBookSourceLinks(),
    resolveCatalogAsset: nativeRuntime.catalog.createResolver({
      owner: 'book',
      type: 'book_asset',
    }),
  })
  const bookRegistration = nativeRuntime.adapterRegistry.register(bookAdapter)
  const suiteRegistry = createWorldSuiteRegistry(manifests)
  const startupErrors = Object.freeze([
    ...nativeRuntime.catalog.initialErrors.map(clone),
    ...nativeRuntime.adapterRegistry.initialErrors.map(clone),
    ...(bookRegistration.ok ? [] : [clone(bookRegistration)]),
    ...suiteRegistry.initialErrors.map(clone),
  ])
  let operationInProgress = false

  const isReady = () => startupErrors.length === 0
  const getInventorySnapshot = () =>
    normalizeWorldSuiteInventory(systemStore.getWorldSuiteInventorySnapshot())

  const checkpointInventory = async (inventory) => {
    const previousInventory = getInventorySnapshot()
    systemStore.replaceWorldSuiteInventory(inventory)
    try {
      const receipt = await systemStore.saveNow()
      if (receipt?.ok === true) return { ok: true }
    } catch {
      // The rollback below preserves the last confirmed coordination evidence.
    }
    systemStore.replaceWorldSuiteInventory(previousInventory)
    return { ok: false }
  }

  const getManifest = (suiteId) => suiteRegistry.get(normalizeId(suiteId))

  const previewSuite = (suiteId, operation = WORLD_SUITE_OPERATION_TYPES.INSTALL) => {
    if (!isReady()) {
      return createRuntimeFailure(PRODUCTION_WORLD_SUITE_ERROR_CODES.RUNTIME_NOT_READY, {
        errors: startupErrors.map(clone),
      })
    }
    const manifest = getManifest(suiteId)
    if (!manifest) {
      return createRuntimeFailure(PRODUCTION_WORLD_SUITE_ERROR_CODES.SUITE_NOT_FOUND)
    }
    const inventory = getInventorySnapshot()
    const plan = operation === WORLD_SUITE_OPERATION_TYPES.UNINSTALL
      ? buildWorldSuiteUninstallPlan({
          manifest,
          installedResources: inventory.resources,
        })
      : buildWorldSuiteInstallPlan({
          manifest,
          installedResources: inventory.resources,
        })
    return {
      ok: plan.ok === true,
      code: plan.ok === true ? '' : 'invalid_plan',
      manifest,
      plan,
      inventory,
    }
  }

  const runExclusive = async (callback) => {
    if (operationInProgress) {
      return createRuntimeFailure(PRODUCTION_WORLD_SUITE_ERROR_CODES.OPERATION_IN_PROGRESS)
    }
    operationInProgress = true
    try {
      return await callback()
    } finally {
      operationInProgress = false
    }
  }

  const executeSuite = (suiteId, operation, now) => runExclusive(async () => {
    const preview = previewSuite(suiteId, operation)
    if (!preview.ok) return preview
    const result = await executeWorldSuitePlan({
      manifest: preview.manifest,
      plan: preview.plan,
      inventory: preview.inventory,
      adapterRegistry: nativeRuntime.adapterRegistry,
      operation,
      onInventoryChanged: checkpointInventory,
      now,
    })
    return {
      ...result,
      manifest: preview.manifest,
      plan: preview.plan,
    }
  })

  const previewResourceInstall = (resource) => {
    if (!isReady()) {
      return createRuntimeFailure(PRODUCTION_WORLD_SUITE_ERROR_CODES.RUNTIME_NOT_READY, {
        errors: startupErrors.map(clone),
      })
    }
    const normalizedResource = normalizeWorldSuiteResource(resource)
    if (
      !normalizedResource.id ||
      !normalizedResource.type ||
      !normalizedResource.ownerResourceId ||
      !normalizedResource.catalogId ||
      normalizedResource.independentlyInstallable !== true ||
      WORLD_SUITE_RESOURCE_OWNERS[normalizedResource.type] !== normalizedResource.owner
    ) {
      return createRuntimeFailure(PRODUCTION_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE)
    }
    const inventory = getInventorySnapshot()
    const plan = buildWorldResourceInstallPlan({
      resource: normalizedResource,
      installedResources: inventory.resources,
    })
    return { ok: true, code: '', resource: normalizedResource, plan, inventory }
  }

  const installResource = (resource, { originId = '', now } = {}) => runExclusive(async () => {
    const preview = previewResourceInstall(resource)
    if (!preview.ok) return preview
    const result = await executeWorldResourcePlan({
      resource: preview.resource,
      plan: preview.plan,
      inventory: preview.inventory,
      adapterRegistry: nativeRuntime.adapterRegistry,
      originId,
      onInventoryChanged: checkpointInventory,
      now,
    })
    return { ...result, plan: preview.plan }
  })

  return {
    get ready() {
      return isReady()
    },
    get operationInProgress() {
      return operationInProgress
    },
    startupErrors,
    registerSuite: suiteRegistry.register,
    unregisterSuite: suiteRegistry.unregister,
    getSuite: getManifest,
    listSuites: suiteRegistry.list,
    registerCatalogRecord: nativeRuntime.catalog.register,
    unregisterCatalogRecord: nativeRuntime.catalog.unregister,
    listCatalogDescriptors: () => nativeRuntime.catalog.list().map((record) => ({
      owner: record.owner,
      type: record.type,
      catalogId: record.catalogId,
      catalogVersion: record.catalogVersion,
    })),
    listRegisteredOwners: nativeRuntime.adapterRegistry.listOwners,
    getInventorySnapshot,
    previewSuiteInstall: (suiteId) => previewSuite(suiteId, WORLD_SUITE_OPERATION_TYPES.INSTALL),
    previewSuiteUninstall: (suiteId) => previewSuite(suiteId, WORLD_SUITE_OPERATION_TYPES.UNINSTALL),
    installSuite: (suiteId, options = {}) =>
      executeSuite(suiteId, WORLD_SUITE_OPERATION_TYPES.INSTALL, options.now),
    uninstallSuite: (suiteId, options = {}) =>
      executeSuite(suiteId, WORLD_SUITE_OPERATION_TYPES.UNINSTALL, options.now),
    previewResourceInstall,
    installResource,
  }
}
