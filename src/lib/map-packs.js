import { SEOUL_ADDITIONAL_PLACES } from './seoul-map-places'
import { SEOUL_EVERYDAY_PLACES } from './seoul-map-everyday-places'
import { SEOUL_COMMUNITY_PLACES } from './seoul-map-community-places'
import { SEOUL_FOOD_DELIVERY_PLACES } from './seoul-map-food-places'
import {
  MAP_PLACE_ICON_TYPES,
  getMapPlaceCategoryVisual,
} from './map-place-categories'
import { projectAssetUrl } from './project-assets'

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0))
export const DEFAULT_MAP_PACK_ID = 'real-seoul-v1'
export const FICTIONAL_MAP_PACK_ID = 'cyber-wasteland-v1'
export const MAP_CATALOG_PROVENANCE_KIND = 'map_catalog'

export const CUSTOM_MAP_PACK_LIMIT = 12
export const CATALOG_MAP_PACK_PLACE_LIMIT = 500

const MAP_PACK_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,179}$/i
const MAP_PACK_FINGERPRINT_PATTERN = /^map_fp_[a-z0-9]+_[0-9]+$/i
const MAP_FACTION_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/i
const MAP_PLACE_ICON_PATTERN = /^fa[bsr] fa-[a-z0-9-]+$/i
const MAP_PLACE_CATEGORY_IDS = new Set(MAP_PLACE_ICON_TYPES.map((category) => category.id))

const WORLD_MAP_PACK_DEFAULTS = Object.freeze({
  default_world: DEFAULT_MAP_PACK_ID,
  modern_parallel: DEFAULT_MAP_PACK_ID,
  school_life: DEFAULT_MAP_PACK_ID,
  business_family: DEFAULT_MAP_PACK_ID,
  urban_mystery: DEFAULT_MAP_PACK_ID,
  fandom_parallel: DEFAULT_MAP_PACK_ID,
  survival_city: FICTIONAL_MAP_PACK_ID,
})

const SEOUL_GEO_BOUNDS = Object.freeze({
  west: 126.35,
  south: 37.14,
  east: 127.62,
  north: 37.92,
})

const MAP_PACKS = Object.freeze([
  Object.freeze({
    id: DEFAULT_MAP_PACK_ID,
    version: 1,
    kind: 'real',
    coordinateKind: 'geo',
    labelZh: '现实首尔',
    labelEn: 'Real Seoul',
    shortLabelZh: '首尔',
    shortLabelEn: 'Seoul',
    descriptionZh: '基于真实街道、江流、绿地与城市轮廓的现代世界地图。',
    descriptionEn: 'A modern-world map grounded in real streets, waterways, green space, and city form.',
    assetUrl: projectAssetUrl('images/ui-assets/apps/map/seoul-street-map-v1.webp'),
    assetWidth: 4096,
    assetHeight: 3319,
    bounds: SEOUL_GEO_BOUNDS,
    attributionZh: '首尔街道图·VectorMap·CC0',
    attributionEn: 'Seoul street map · VectorMap · CC0',
    places: Object.freeze([
      {
        id: 'seoul-sm-hq',
        nameZh: 'SM 娱乐总部',
        nameEn: 'SM Entertainment HQ',
        detailZh: '首尔特别市城东区王十里路 83-21',
        detailEn: '83-21 Wangsimni-ro, Seongdong-gu, Seoul',
        category: 'work',
        icon: 'fas fa-building',
        position: { kind: 'geo', lat: 37.5444, lng: 127.0441 },
        aliases: ['SM', 'SMTOWN', '城东区'],
      },
      {
        id: 'seoul-hybe-hq',
        nameZh: 'HYBE 总部',
        nameEn: 'HYBE HQ',
        detailZh: '首尔特别市龙山区汉江大路 42',
        detailEn: '42 Hangang-daero, Yongsan-gu, Seoul',
        category: 'work',
        icon: 'fas fa-building',
        position: { kind: 'geo', lat: 37.5243, lng: 126.9634 },
        aliases: ['HYBE', '龙山'],
      },
      {
        id: 'seoul-samsung-town',
        nameZh: '三星城',
        nameEn: 'Samsung Town',
        detailZh: '首尔特别市瑞草区瑞草大路 74街 11',
        detailEn: '11 Seocho-daero 74-gil, Seocho-gu, Seoul',
        category: 'work',
        icon: 'fas fa-city',
        position: { kind: 'geo', lat: 37.4967, lng: 127.0267 },
        aliases: ['Samsung', '三星大楼', '江南'],
      },
      {
        id: 'seoul-station',
        nameZh: '首尔站',
        nameEn: 'Seoul Station',
        detailZh: '首尔特别市龙山区汉江大路 405',
        detailEn: '405 Hangang-daero, Yongsan-gu, Seoul',
        category: 'transit',
        icon: 'fas fa-train-subway',
        position: { kind: 'geo', lat: 37.5547, lng: 126.9707 },
        aliases: ['Seoul Station', 'KTX'],
      },
      {
        id: 'seoul-gwanghwamun',
        nameZh: '光化门广场',
        nameEn: 'Gwanghwamun Square',
        detailZh: '首尔特别市钟路区世宗大路 172',
        detailEn: '172 Sejong-daero, Jongno-gu, Seoul',
        category: 'culture',
        icon: 'fas fa-landmark',
        position: { kind: 'geo', lat: 37.5759, lng: 126.9768 },
        aliases: ['Gwanghwamun', '世宗大路'],
      },
      {
        id: 'seoul-hongdae',
        nameZh: '弘大入口',
        nameEn: 'Hongik University Street',
        detailZh: '首尔特别市麻浦区洪益路',
        detailEn: 'Hongik-ro, Mapo-gu, Seoul',
        category: 'leisure',
        icon: 'fas fa-music',
        position: { kind: 'geo', lat: 37.5563, lng: 126.9236 },
        aliases: ['Hongdae', '麻浦'],
      },
      {
        id: 'seoul-lotte-world',
        nameZh: '乐天世界',
        nameEn: 'Lotte World',
        detailZh: '首尔特别市松坡区奥林匹克路 240',
        detailEn: '240 Olympic-ro, Songpa-gu, Seoul',
        category: 'leisure',
        icon: 'fas fa-ticket',
        position: { kind: 'geo', lat: 37.5112, lng: 127.098 },
        aliases: ['Lotte', '蚕室'],
      },
      ...SEOUL_ADDITIONAL_PLACES,
      ...SEOUL_EVERYDAY_PLACES,
      ...SEOUL_COMMUNITY_PLACES,
      ...SEOUL_FOOD_DELIVERY_PLACES,
    ]),
    factions: Object.freeze([]),
  }),
  Object.freeze({
    id: FICTIONAL_MAP_PACK_ID,
    version: 1,
    kind: 'fictional',
    coordinateKind: 'canvas',
    labelZh: '赤锈废都',
    labelEn: 'Redrust Expanse',
    shortLabelZh: '废都',
    shortLabelEn: 'Wasteland',
    descriptionZh: '赛博遗迹与荒原聚落叠合的封闭城市，四个阵营共同争夺水、能源和数据网。',
    descriptionEn: 'A sealed city of cyber ruins and wasteland settlements where four factions contest water, power, and the data grid.',
    assetUrl: projectAssetUrl('images/ui-assets/apps/map/cyber-wasteland-city-v1.svg'),
    assetWidth: 1600,
    assetHeight: 1280,
    distanceScaleKm: 42,
    attributionZh: '本地程序化地图·SchatPhone',
    attributionEn: 'Local procedural map · SchatPhone',
    factions: Object.freeze([
      {
        id: 'helix-covenant',
        labelZh: '螺旋协约',
        labelEn: 'Helix Covenant',
        tone: '#23c7c9',
        position: { kind: 'canvas', x: 0.74, y: 0.23 },
      },
      {
        id: 'rust-union',
        labelZh: '赤锈同盟',
        labelEn: 'Rust Union',
        tone: '#dc5a4d',
        position: { kind: 'canvas', x: 0.25, y: 0.7 },
      },
      {
        id: 'verdant-protocol',
        labelZh: '翠域协议',
        labelEn: 'Verdant Protocol',
        tone: '#4da66d',
        position: { kind: 'canvas', x: 0.22, y: 0.23 },
      },
      {
        id: 'freeband',
        labelZh: '无旗自由带',
        labelEn: 'Freeband',
        tone: '#d6a83f',
        position: { kind: 'canvas', x: 0.77, y: 0.73 },
      },
    ]),
    places: Object.freeze([
      {
        id: 'waste-helix-spire',
        nameZh: '螺旋塔',
        nameEn: 'Helix Spire',
        detailZh: '协约科技城塞与主数据节点',
        detailEn: 'Covenant technocitadel and primary data node',
        category: 'faction',
        factionId: 'helix-covenant',
        icon: 'fas fa-tower-broadcast',
        position: { kind: 'canvas', x: 0.76, y: 0.26 },
        aliases: ['Helix', '协约总部'],
      },
      {
        id: 'waste-rust-foundry',
        nameZh: '赤锈熔炉',
        nameEn: 'Rust Foundry',
        detailZh: '同盟重工区、车队工场与燃料储罐群',
        detailEn: 'Union heavy industry, convoy works, and fuel reservoir',
        category: 'faction',
        factionId: 'rust-union',
        icon: 'fas fa-industry',
        position: { kind: 'canvas', x: 0.24, y: 0.72 },
        aliases: ['Foundry', '熔炉'],
      },
      {
        id: 'waste-verdant-vault',
        nameZh: '翠域穹库',
        nameEn: 'Verdant Vault',
        detailZh: '种子库、净水塔和封闭生态区',
        detailEn: 'Seed vault, water purification towers, and sealed biosphere',
        category: 'faction',
        factionId: 'verdant-protocol',
        icon: 'fas fa-seedling',
        position: { kind: 'canvas', x: 0.22, y: 0.24 },
        aliases: ['Vault', '种子库'],
      },
      {
        id: 'waste-freeband-port',
        nameZh: '无旗浮港',
        nameEn: 'Freeband Floatport',
        detailZh: '拼装载具、飞艇与走私商队的自由港',
        detailEn: 'Free port for patched vehicles, skiffs, and smuggler caravans',
        category: 'faction',
        factionId: 'freeband',
        icon: 'fas fa-plane-departure',
        position: { kind: 'canvas', x: 0.77, y: 0.75 },
        aliases: ['Floatport', '自由港'],
      },
      {
        id: 'waste-ash-market',
        nameZh: '灰烬集市',
        nameEn: 'Ash Market',
        detailZh: '四方势力默认停火的中立交易区',
        detailEn: 'Neutral exchange where all four factions observe a fragile ceasefire',
        category: 'commerce',
        factionId: '',
        icon: 'fas fa-store',
        position: { kind: 'canvas', x: 0.5, y: 0.51 },
        aliases: ['Market', '中立区'],
      },
      {
        id: 'waste-blackrain-clinic',
        nameZh: '黑雨诊所',
        nameEn: 'Blackrain Clinic',
        detailZh: '废弃磁悬站下的地下医疗点',
        detailEn: 'Underground clinic beneath the abandoned maglev interchange',
        category: 'medical',
        factionId: '',
        icon: 'fas fa-kit-medical',
        position: { kind: 'canvas', x: 0.52, y: 0.68 },
        aliases: ['Clinic', '诊所'],
      },
      {
        id: 'waste-dead-grid',
        nameZh: '死寂网格',
        nameEn: 'Dead Grid',
        detailZh: '传感器失效的高危无主区',
        detailEn: 'High-risk unclaimed zone where every sensor has gone dark',
        category: 'story',
        factionId: '',
        icon: 'fas fa-triangle-exclamation',
        position: { kind: 'canvas', x: 0.48, y: 0.32 },
        aliases: ['Dead Grid', '无主区'],
      },
    ]),
  }),
])

const normalizeMapPackText = (value, fallback = '', maxLength = 160) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  return (text || fallback).slice(0, maxLength)
}

const cloneMapPackValue = (value) => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Vue/Pinia proxies remain JSON-compatible even when structuredClone rejects them.
    }
  }
  return JSON.parse(JSON.stringify(value))
}

const canonicalizeMapPackValue = (value) => {
  if (Array.isArray(value)) return value.map(canonicalizeMapPackValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeMapPackValue(value[key])]),
    )
  }
  return value
}

const computeMapPackTextFingerprint = (value = '') => {
  const text = typeof value === 'string' ? value : ''
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return `map_fp_${hash.toString(36)}_${text.length}`
}

const buildManagedMapPackContent = (rawPack = {}) => {
  const source = rawPack && typeof rawPack === 'object' ? rawPack : {}
  const content = { ...cloneMapPackValue(source) }
  delete content.assetUrl
  delete content.createdAt
  delete content.updatedAt
  delete content.provenance
  delete content.source
  return canonicalizeMapPackValue(content)
}

export const computeManagedMapPackFingerprint = (pack = {}) =>
  computeMapPackTextFingerprint(JSON.stringify(buildManagedMapPackContent(pack)))

export const normalizeMapCatalogProvenance = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const kind = normalizeMapPackText(raw.kind, '', 40)
  const resourceId = normalizeMapPackText(raw.resourceId, '', 180)
  const catalogId = normalizeMapPackText(raw.catalogId, '', 180)
  const catalogVersion = Math.max(0, Math.floor(Number(raw.catalogVersion) || 0))
  const installedFingerprint = normalizeMapPackText(raw.installedFingerprint, '', 120)
  if (
    kind !== MAP_CATALOG_PROVENANCE_KIND ||
    !MAP_PACK_ID_PATTERN.test(resourceId) ||
    !MAP_PACK_ID_PATTERN.test(catalogId) ||
    catalogVersion < 1 ||
    !MAP_PACK_FINGERPRINT_PATTERN.test(installedFingerprint)
  ) {
    return null
  }
  return {
    kind: MAP_CATALOG_PROVENANCE_KIND,
    resourceId,
    catalogId,
    catalogVersion,
    installedFingerprint,
  }
}

const normalizeCustomFaction = (raw, index = 0) => {
  const label = normalizeMapPackText(raw?.label || raw?.labelZh || raw?.labelEn, '', 60)
  if (!label) return null
  const palette = ['#21a4a8', '#c84e43', '#3f8f5d', '#c3942e', '#7c5cc4', '#3478b8']
  return {
    id: normalizeMapPackText(raw?.id, `faction-${index + 1}`, 80)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-'),
    labelZh: normalizeMapPackText(raw?.labelZh, label, 60),
    labelEn: normalizeMapPackText(raw?.labelEn, label, 60),
    tone: /^#[0-9a-f]{6}$/i.test(raw?.tone || '') ? raw.tone : palette[index % palette.length],
    position: normalizeMapPosition(raw?.position, 'canvas') || {
      kind: 'canvas',
      x: index % 2 === 0 ? 0.24 : 0.76,
      y: index < 2 ? 0.24 : 0.76,
    },
  }
}

const normalizeCatalogMapPlace = (raw, factionIds) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const id = normalizeMapPackText(raw.id, '', 180).toLowerCase()
  const name = normalizeMapPackText(raw.nameZh || raw.nameEn || raw.name, '', 100)
  const category = normalizeMapPackText(raw.category, '', 80).toLowerCase()
  const rawX = Number(raw.position?.x)
  const rawY = Number(raw.position?.y)
  if (
    raw.position?.kind !== 'canvas' ||
    !Number.isFinite(rawX) ||
    !Number.isFinite(rawY) ||
    rawX < 0 ||
    rawX > 1 ||
    rawY < 0 ||
    rawY > 1
  ) {
    return null
  }
  const position = normalizeMapPosition(raw.position, 'canvas')
  if (
    !id ||
    !MAP_PACK_ID_PATTERN.test(id) ||
    !name ||
    !MAP_PLACE_CATEGORY_IDS.has(category) ||
    !position
  ) {
    return null
  }
  const factionId = normalizeMapPackText(raw.factionId, '', 80).toLowerCase()
  if (factionId && !factionIds.has(factionId)) return null
  const aliases = [
    ...new Set(
      (Array.isArray(raw.aliases) ? raw.aliases : [])
        .map((alias) => normalizeMapPackText(alias, '', 80))
        .filter(Boolean),
    ),
  ].slice(0, 16)
  const semanticConceptIds = [
    ...new Set(
      (Array.isArray(raw.semanticConceptIds) ? raw.semanticConceptIds : [])
        .map((conceptId) => normalizeMapPackText(conceptId, '', 180))
        .filter(Boolean),
    ),
  ].slice(0, 24)
  const categoryIcon = getMapPlaceCategoryVisual(category).icon
  const icon = normalizeMapPackText(raw.icon, '', 80)
  return {
    id,
    nameZh: normalizeMapPackText(raw.nameZh, name, 100),
    nameEn: normalizeMapPackText(raw.nameEn, name, 100),
    detailZh: normalizeMapPackText(raw.detailZh || raw.detail, '', 240),
    detailEn: normalizeMapPackText(raw.detailEn || raw.detail, '', 240),
    category,
    factionId,
    icon: MAP_PLACE_ICON_PATTERN.test(icon) ? icon : categoryIcon,
    position,
    aliases,
    semanticConceptIds,
  }
}

const normalizeCatalogMapPlaces = (rawPlaces, factions) => {
  if (rawPlaces == null) return []
  if (!Array.isArray(rawPlaces) || rawPlaces.length > CATALOG_MAP_PACK_PLACE_LIMIT) return null
  const factionIds = new Set(factions.map((faction) => faction.id))
  const normalized = rawPlaces.map((place) => normalizeCatalogMapPlace(place, factionIds))
  if (normalized.some((place) => !place)) return null
  const placeIds = normalized.map((place) => place.id)
  if (new Set(placeIds).size !== placeIds.length) return null
  return normalized
}

const catalogFactionInputsAreValid = (rawFactions, factions) => {
  if (!Array.isArray(rawFactions) || rawFactions.length > 8) return false
  if (rawFactions.length !== factions.length) return false
  const factionIds = factions.map((faction) => faction.id)
  if (new Set(factionIds).size !== factionIds.length) return false
  return rawFactions.every((faction, index) => {
    const rawId = normalizeMapPackText(faction?.id, '', 80).toLowerCase()
    const x = Number(faction?.position?.x)
    const y = Number(faction?.position?.y)
    return (
      MAP_FACTION_ID_PATTERN.test(rawId) &&
      factions[index]?.id === rawId &&
      faction?.position?.kind === 'canvas' &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= 0 &&
      x <= 1 &&
      y >= 0 &&
      y <= 1
    )
  })
}

export const normalizeCustomMapPack = (
  raw,
  index = 0,
  { preserveCatalogProvenance = false } = {},
) => {
  if (!raw || typeof raw !== 'object') return null
  const assetId = normalizeMapPackText(raw.assetId, '', 160)
  if (!assetId) return null
  const fallbackId = `custom-map-${Date.now()}-${index + 1}`
  const id = normalizeMapPackText(raw.id, fallbackId, 120)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
  const name = normalizeMapPackText(raw.labelZh || raw.labelEn || raw.name, `自定义地图 ${index + 1}`, 80)
  const factions = (Array.isArray(raw.factions) ? raw.factions : [])
    .map((faction, factionIndex) => normalizeCustomFaction(faction, factionIndex))
    .filter(Boolean)
    .slice(0, 8)
  const provenance = preserveCatalogProvenance
    ? normalizeMapCatalogProvenance(raw.provenance)
    : null
  if (provenance && !catalogFactionInputsAreValid(raw.factions || [], factions)) return null
  const catalogPlaces = provenance ? normalizeCatalogMapPlaces(raw.places, factions) : []
  if (catalogPlaces == null) return null
  const pack = {
    id,
    version: Math.max(1, Math.floor(Number(raw.version) || 1)),
    kind: 'fictional',
    coordinateKind: 'canvas',
    source: 'custom',
    assetId,
    assetUrl: '',
    assetWidth: Math.max(320, Math.floor(Number(raw.assetWidth) || 1600)),
    assetHeight: Math.max(240, Math.floor(Number(raw.assetHeight) || 1024)),
    distanceScaleKm: Math.max(1, Math.min(500, Number(raw.distanceScaleKm) || 24)),
    labelZh: normalizeMapPackText(raw.labelZh, name, 80),
    labelEn: normalizeMapPackText(raw.labelEn, name, 80),
    shortLabelZh: normalizeMapPackText(raw.shortLabelZh, name, 36),
    shortLabelEn: normalizeMapPackText(raw.shortLabelEn, name, 36),
    descriptionZh: normalizeMapPackText(raw.descriptionZh, '玩家导入或生成的世界地图。', 240),
    descriptionEn: normalizeMapPackText(raw.descriptionEn, 'A player-imported or generated world map.', 240),
    attributionZh: normalizeMapPackText(raw.attributionZh, '玩家地图 · 本地素材', 100),
    attributionEn: normalizeMapPackText(raw.attributionEn, 'Player map · Local asset', 100),
    factions: Object.freeze(factions),
    places: Object.freeze(catalogPlaces),
    createdAt: Math.max(0, Math.floor(Number(raw.createdAt) || Date.now())),
    updatedAt: Math.max(0, Math.floor(Number(raw.updatedAt) || Date.now())),
  }
  if (provenance) pack.provenance = provenance
  return pack
}

export const normalizeCustomMapPacks = (
  rawPacks = [],
  { preserveCatalogProvenance = false } = {},
) => {
  const byId = new Map()
  ;(Array.isArray(rawPacks) ? rawPacks : []).forEach((raw, index) => {
    const pack = normalizeCustomMapPack(raw, index, { preserveCatalogProvenance })
    if (pack && !MAP_PACKS.some((builtIn) => builtIn.id === pack.id)) byId.set(pack.id, pack)
  })
  return [...byId.values()].slice(0, CUSTOM_MAP_PACK_LIMIT)
}

export const listMapPacks = (customPacks = []) => [
  ...MAP_PACKS,
  ...normalizeCustomMapPacks(customPacks, { preserveCatalogProvenance: true }),
]

export const getMapPackById = (packId, customPacks = []) =>
  listMapPacks(customPacks).find((pack) => pack.id === packId) || MAP_PACKS[0]

export const getRecommendedMapPackIdForWorldPack = (worldPack = {}) => {
  const worldPackId = normalizeMapPackText(
    typeof worldPack === 'string' ? worldPack : worldPack?.id,
    'default_world',
    120,
  )
  return WORLD_MAP_PACK_DEFAULTS[worldPackId] || DEFAULT_MAP_PACK_ID
}

export const normalizeMapPosition = (raw, coordinateKind = '') => {
  if (!raw || typeof raw !== 'object') return null
  const kind = raw.kind === 'geo' || raw.kind === 'canvas' ? raw.kind : coordinateKind
  if (kind === 'geo') {
    const lat = Number(raw.lat)
    const lng = Number(raw.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { kind, lat, lng }
  }
  if (kind === 'canvas') {
    const x = Number(raw.x)
    const y = Number(raw.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    return { kind, x: clamp01(x), y: clamp01(y) }
  }
  return null
}

const mercatorY = (latitude) => {
  const safeLatitude = Math.max(-85, Math.min(85, Number(latitude) || 0))
  const radians = (safeLatitude * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + radians / 2))
}

export const mapPositionToNormalized = (pack, rawPosition) => {
  const position = normalizeMapPosition(rawPosition, pack?.coordinateKind)
  if (!pack || !position) return null
  if (position.kind === 'canvas') return { x: position.x, y: position.y }
  if (position.kind !== 'geo' || !pack.bounds) return null

  const { west, south, east, north } = pack.bounds
  const x = (position.lng - west) / (east - west)
  const northY = mercatorY(north)
  const southY = mercatorY(south)
  const y = (northY - mercatorY(position.lat)) / (northY - southY)
  return { x: clamp01(x), y: clamp01(y) }
}

export const normalizedToMapPosition = (pack, rawPoint) => {
  if (!pack || !rawPoint || typeof rawPoint !== 'object') return null
  const x = clamp01(rawPoint.x)
  const y = clamp01(rawPoint.y)
  if (pack.coordinateKind === 'canvas') return { kind: 'canvas', x, y }
  if (pack.coordinateKind !== 'geo' || !pack.bounds) return null

  const { west, south, east, north } = pack.bounds
  const lng = west + x * (east - west)
  const northY = mercatorY(north)
  const southY = mercatorY(south)
  const projected = northY - y * (northY - southY)
  const lat = (Math.atan(Math.sinh(projected)) * 180) / Math.PI
  return { kind: 'geo', lat, lng }
}

const haversineDistanceKm = (from, to) => {
  const earthRadiusKm = 6371
  const toRadians = (value) => (value * Math.PI) / 180
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine))
}

export const calculateMapDistanceKm = (pack, rawFrom, rawTo) => {
  const from = normalizeMapPosition(rawFrom, pack?.coordinateKind)
  const to = normalizeMapPosition(rawTo, pack?.coordinateKind)
  if (!pack || !from || !to || from.kind !== to.kind) return null
  if (from.kind === 'geo') return haversineDistanceKm(from, to)

  const scaleKm = Math.max(1, Number(pack.distanceScaleKm) || 1)
  const aspect = Math.max(0.25, Number(pack.assetWidth) / Number(pack.assetHeight) || 1)
  const deltaX = (from.x - to.x) * scaleKm
  const deltaY = ((from.y - to.y) * scaleKm) / aspect
  return Math.sqrt(deltaX ** 2 + deltaY ** 2)
}

export const formatMapPosition = (position) => {
  const normalized = normalizeMapPosition(position)
  if (!normalized) return ''
  if (normalized.kind === 'geo') {
    return `${normalized.lat.toFixed(5)}, ${normalized.lng.toFixed(5)}`
  }
  return `${Math.round(normalized.x * 100)}%, ${Math.round(normalized.y * 100)}%`
}
