import {
  MAP_WORLD_SUITE_PROVENANCE_KIND,
  computeManagedMapPackFingerprint,
} from '../../src/lib/map-world-suite-inspection'

export const createMapWorldSuiteResourceFixture = (version = 1, overrides = {}) => ({
  id: 'map.neon-borough',
  type: 'map_pack',
  owner: 'map',
  ownerResourceId: 'catalog-neon-borough-v1',
  catalogId: 'neon-borough-catalog',
  version,
  ...overrides,
})

export const createCatalogManagedMapPackFixture = ({
  resource = createMapWorldSuiteResourceFixture(),
  catalogVersion = resource.version,
  overrides = {},
} = {}) => {
  const pack = {
    id: resource.ownerResourceId,
    version: 1,
    kind: 'fictional',
    coordinateKind: 'canvas',
    source: 'custom',
    assetId: 'gallery-neon-map',
    assetUrl: '',
    assetWidth: 1600,
    assetHeight: 1024,
    distanceScaleKm: 24,
    labelZh: '霓虹城区',
    labelEn: 'Neon Borough',
    shortLabelZh: '霓虹城',
    shortLabelEn: 'Neon',
    descriptionZh: '由目录安装的虚构城市地图。',
    descriptionEn: 'A fictional city map installed from the catalog.',
    attributionZh: '世界地图 · 本地素材',
    attributionEn: 'World map · Local asset',
    factions: [
      {
        id: 'north-ring',
        labelZh: '北环',
        labelEn: 'North Ring',
        tone: '#21a4a8',
        position: { kind: 'canvas', x: 0.3, y: 0.3 },
      },
    ],
    places: [],
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  }
  pack.provenance = {
    kind: MAP_WORLD_SUITE_PROVENANCE_KIND,
    resourceId: resource.id,
    catalogId: resource.catalogId,
    catalogVersion,
    installedFingerprint: computeManagedMapPackFingerprint(pack),
  }
  return pack
}

export const createMapWorldSuiteStateFixture = (overrides = {}) => ({
  activeMapPackId: 'real-seoul-v1',
  customMapPacks: [],
  worldMapPackBindings: {},
  mapPinVisibilityByPack: {},
  mapPlaceKnowledgeByWorld: {},
  addresses: [],
  currentLocation: {
    mapPackId: 'real-seoul-v1',
    placeId: 'seoul-station',
    position: { kind: 'geo', lat: 37.5547, lng: 126.9707 },
  },
  placeSession: { state: 'left', mapPackId: '', sessionId: '', placeId: '' },
  tripState: { status: 'idle', mapPackId: '', journeyId: '' },
  tripHistory: [],
  ...overrides,
})
