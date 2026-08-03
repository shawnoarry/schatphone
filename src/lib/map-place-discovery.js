import { calculateMapDistanceKm } from './map-packs'

export const MAP_PLACE_KNOWLEDGE_SCHEMA_VERSION = 1

export const MAP_PLACE_KNOWLEDGE_MODE = Object.freeze({
  ALL_KNOWN: 'all_known',
  FOOTPRINT_GATED: 'footprint_gated',
})

export const MAP_PLACE_DISCOVERY_SOURCE = Object.freeze({
  TRIP_ARRIVAL: 'trip_arrival',
})

export const MAP_PLACE_DISCOVERY_RADIUS_KM = 1.2
export const MAP_PLACE_DISCOVERY_LIMIT_PER_ARRIVAL = 4

const MAP_PLACE_KNOWLEDGE_WORLD_LIMIT = 40
const MAP_PLACE_KNOWLEDGE_PACK_LIMIT = 40
const MAP_PLACE_DISCOVERY_LIMIT = 500
const FOOTPRINT_DISCOVERY_CATEGORIES = new Set(['convenience_store', 'pharmacy'])

const normalizeId = (value, maxLength = 180) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

export const normalizeMapPlaceKnowledgeMode = (
  value,
  fallback = MAP_PLACE_KNOWLEDGE_MODE.ALL_KNOWN,
) =>
  Object.values(MAP_PLACE_KNOWLEDGE_MODE).includes(value) ? value : fallback

const normalizeDiscoveryEvidence = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const sourceType = normalizeId(raw.sourceType, 60)
  const sourceId = normalizeId(raw.sourceId)
  const discoveredAt = Math.max(0, Math.floor(Number(raw.discoveredAt) || 0))
  if (!sourceType || !sourceId || !discoveredAt) return null
  return { sourceType, sourceId, discoveredAt }
}

const normalizePackDiscoveries = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { placeIds: [], evidenceByPlaceId: {} }
  }

  const placeIds = Array.isArray(raw.placeIds)
    ? [...new Set(raw.placeIds.map((id) => normalizeId(id)).filter(Boolean))]
        .slice(0, MAP_PLACE_DISCOVERY_LIMIT)
    : []
  const allowedIds = new Set(placeIds)
  const evidenceByPlaceId = Object.fromEntries(
    Object.entries(raw.evidenceByPlaceId || {})
      .map(([placeId, evidence]) => [normalizeId(placeId), normalizeDiscoveryEvidence(evidence)])
      .filter(([placeId, evidence]) => allowedIds.has(placeId) && evidence)
      .slice(0, MAP_PLACE_DISCOVERY_LIMIT),
  )
  return { placeIds, evidenceByPlaceId }
}

export const normalizeMapPlaceKnowledgeByWorld = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw)
      .map(([worldPackId, state]) => {
        const normalizedWorldPackId = normalizeId(worldPackId, 120)
        if (!normalizedWorldPackId || !state || typeof state !== 'object' || Array.isArray(state)) {
          return null
        }
        const discoveriesByMapPack = Object.fromEntries(
          Object.entries(state.discoveriesByMapPack || {})
            .map(([mapPackId, discoveries]) => [
              normalizeId(mapPackId, 120),
              normalizePackDiscoveries(discoveries),
            ])
            .filter(([mapPackId]) => mapPackId)
            .slice(0, MAP_PLACE_KNOWLEDGE_PACK_LIMIT),
        )
        return [
          normalizedWorldPackId,
          {
            schemaVersion: MAP_PLACE_KNOWLEDGE_SCHEMA_VERSION,
            mode: normalizeMapPlaceKnowledgeMode(state.mode),
            discoveriesByMapPack,
          },
        ]
      })
      .filter(Boolean)
      .slice(0, MAP_PLACE_KNOWLEDGE_WORLD_LIMIT),
  )
}

export const createMapPlaceKnowledgeState = (
  mode = MAP_PLACE_KNOWLEDGE_MODE.ALL_KNOWN,
) => ({
  schemaVersion: MAP_PLACE_KNOWLEDGE_SCHEMA_VERSION,
  mode: normalizeMapPlaceKnowledgeMode(mode),
  discoveriesByMapPack: {},
})

export const isMapPlaceFootprintDiscoverable = (place) =>
  Boolean(
    place &&
    place.source !== 'user' &&
    place.position &&
    FOOTPRINT_DISCOVERY_CATEGORIES.has(place.category),
  )

export const isMapPlaceKnown = ({ place, mode, discoveredPlaceIds = [] } = {}) => {
  if (!place) return false
  if (normalizeMapPlaceKnowledgeMode(mode) === MAP_PLACE_KNOWLEDGE_MODE.ALL_KNOWN) {
    return true
  }
  if (!isMapPlaceFootprintDiscoverable(place)) return true
  return new Set(discoveredPlaceIds).has(place.placeId || place.id)
}

export const findNearbyFootprintDiscoveries = ({
  mapPack,
  places = [],
  position,
  discoveredPlaceIds = [],
  radiusKm = MAP_PLACE_DISCOVERY_RADIUS_KM,
  limit = MAP_PLACE_DISCOVERY_LIMIT_PER_ARRIVAL,
} = {}) => {
  if (!mapPack || !position) return []
  const discoveredIds = new Set(discoveredPlaceIds)
  const safeRadiusKm = Math.max(0, Number(radiusKm) || 0)
  const safeLimit = Math.max(0, Math.floor(Number(limit) || 0))
  if (!safeRadiusKm || !safeLimit) return []

  return (Array.isArray(places) ? places : [])
    .filter((place) => {
      const placeId = place?.placeId || place?.id
      return placeId && !discoveredIds.has(placeId) && isMapPlaceFootprintDiscoverable(place)
    })
    .map((place) => ({
      place,
      distanceKm: calculateMapDistanceKm(mapPack, position, place.position),
    }))
    .filter((item) => Number.isFinite(item.distanceKm) && item.distanceKm <= safeRadiusKm)
    .sort((left, right) =>
      left.distanceKm - right.distanceKm ||
      String(left.place.placeId || left.place.id).localeCompare(
        String(right.place.placeId || right.place.id),
      ),
    )
    .slice(0, safeLimit)
}
