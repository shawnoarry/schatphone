import { createGalleryWorldSuiteOwnerAdapter } from './gallery-world-suite-owner-adapter'
import { createProductionMapWorldSuiteOwnerAdapter } from './map-world-suite-owner-adapter'
import { createWorldResourceCatalog } from './world-resource-catalog'
import { createWorldSuiteOwnerAdapterRegistry } from './world-suite-owner-adapters'

export const createMapGalleryWorldSuiteRuntime = ({
  galleryStore,
  mapStore,
  simulationStore,
  chatStore,
  catalogRecords = [],
} = {}) => {
  const catalog = createWorldResourceCatalog(catalogRecords)
  const galleryAdapter = createGalleryWorldSuiteOwnerAdapter({
    galleryStore,
    resolveCatalogAssetPack: catalog.createResolver({
      owner: 'gallery',
      type: 'gallery_asset_pack',
    }),
  })
  const mapAdapter = createProductionMapWorldSuiteOwnerAdapter({
    mapStore,
    galleryStore,
    simulationStore,
    chatStore,
    resolveCatalogMapPack: catalog.createResolver({
      owner: 'map',
      type: 'map_pack',
    }),
  })
  const adapterRegistry = createWorldSuiteOwnerAdapterRegistry([
    galleryAdapter,
    mapAdapter,
  ])

  return {
    catalog,
    adapterRegistry,
    adapters: Object.freeze({ gallery: galleryAdapter, map: mapAdapter }),
    ready: catalog.initialErrors.length === 0 && adapterRegistry.initialErrors.length === 0,
  }
}
