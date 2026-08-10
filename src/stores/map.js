import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { callAI, formatApiErrorForUi } from '../lib/ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from '../lib/chat-response'
import {
  cancelScheduledPushNotification,
  schedulePushNotification,
} from '../lib/push'
import { FOOD_DELIVERY_SOURCE_KEYS, LOGISTICS_SOURCE_KEYS } from '../lib/planned-module-registry'
import {
  anonymizeRelationshipText,
  bindingMatchesProfile,
  clearRelationshipBinding,
  normalizeRelationshipBinding,
} from '../lib/relationship-cleanup-helpers'
import {
  DEFAULT_MAP_PACK_ID,
  calculateMapDistanceKm,
  getMapPackById,
  getRecommendedMapPackIdForWorldPack,
  listMapPacks,
  normalizeCustomMapPack,
  normalizeCustomMapPacks,
  normalizeMapPosition,
} from '../lib/map-packs'
import {
  getMapPlaceCategoryVisual,
  isMapPlaceCategoryDefaultVisible,
  matchesMapPlaceCategoryFilter,
  normalizeUserMapPlaceCategory,
} from '../lib/map-place-categories'
import {
  MAP_PLACE_DISPLAY_MODE,
  normalizeMapPlaceDisplayMode,
} from '../lib/map-place-localization'
import {
  MAP_PLACE_DISCOVERY_SOURCE,
  createMapPlaceKnowledgeState,
  findNearbyFootprintDiscoveries,
  isMapPlaceFootprintDiscoverable,
  isMapPlaceKnown as isPlaceKnownByPolicy,
  normalizeMapPlaceKnowledgeByWorld,
  normalizeMapPlaceKnowledgeMode,
} from '../lib/map-place-discovery'
import {
  LEGACY_MAP_TRANSPORT_MODE,
  MAP_JOURNEY_PHASE,
  MAP_JOURNEY_SCHEMA_VERSION,
  MAP_TRIP_ESTIMATE_VERSION,
  advanceMapJourneyCheckpoints,
  calculateMapJourneyRuntime,
  createMapJourneyCheckpointPlan,
  createMapJourneyId,
  estimateMapJourney,
  isMapTransportMode,
  normalizeMapJourneyCheckpoints,
  normalizeMapTransportMode,
  resolveMapJourneyPhase,
} from '../lib/map-journey'
import {
  MAP_JOURNEY_EVENT_DELAY_SECONDS,
  MAP_JOURNEY_EVENT_ELIGIBLE_CHECKPOINT_IDS,
  MAP_JOURNEY_EVENT_OUTCOME,
  runMapJourneyCheckpointEvent,
} from '../lib/simulation/adapters/map-journey-events'
import {
  MAP_EVENT_POSITION_PROVENANCE,
  MAP_PLACE_SESSION_CHECKPOINT_ID,
  MAP_PLACE_SESSION_RECORD_TYPE,
  MAP_PLACE_SESSION_STATE,
  clusterMapEventSurfacePins,
  createEmptyMapPlaceSession,
  createMapEventSurfaceHostRegistry,
  createMapPositionEvidence,
  dismissMapPlaceSessionEventInstance,
  enterMapPlaceSession,
  evaluateMapPlaceSessionEventInvitation,
  getMapPlaceSessionEventAdapterKey,
  getMapPlaceSessionEventTemplate,
  leaveMapPlaceSession,
  normalizeMapPlaceSession,
  normalizeMapPositionEvidence,
  projectMapPlaceSessionEventSurface,
  resolveMapPlaceSessionEventInstance,
} from '../lib/simulation/adapters/map-place-session-events'
import {
  KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
  KPOP_REALISM_EVENT_PACK_ID,
} from '../lib/simulation/kpop-realism-event-pack'
import {
  createEventContextHash,
  materializeLocalEventInstanceV1,
} from '../lib/simulation/event-instance-materializer'
import { composeEventTextV1 } from '../lib/simulation/event-text-composer'
import {
  EVENT_INSTANCE_LIFECYCLE,
  EVENT_TEXT_MODE,
  normalizeEventInstanceV1,
} from '../lib/simulation/event-contracts'
import { resolveWorldContextFromSystemStore } from '../lib/simulation/world-context'
import { useSystemApiReports } from '../composables/useSystemApiReports'
import { useSystemNotifications } from '../composables/useSystemNotifications'
import { useSimulationStore } from './simulation'
import { useSystemStore } from './system'

const MAP_STORAGE_KEY = 'store:map'
const MAP_STORAGE_VERSION = 3
const MAP_JOURNEY_POSITION_EVIDENCE_AUTHORIZATION = Symbol('map_journey_position_evidence')
const MAP_PIN_VISIBILITY_CATEGORY_LIMIT = 80
const MAP_PIN_VISIBILITY_PLACE_LIMIT = 500
const TRIP_STATUS_IDLE = 'idle'
const TRIP_STATUS_TRAVELING = 'traveling'
const TRIP_STATUS_ARRIVED = 'arrived'
const TRIP_HISTORY_LIMIT = 40
const MAP_AUTOMATION_MODULE_KEY = 'map'
const MAP_VISUAL_MODE_DEFAULT = 'default'
const MAP_VISUAL_MODE_GALLERY = 'gallery'
const MAP_PROVIDER_VISUAL_MODE_DISABLED = 'disabled'
const MAP_PROVIDER_VISUAL_MODE_SKIPPED_NO_KEY = 'skipped_no_key'
const MAP_PROVIDER_VISUAL_MODE_SKIPPED_NO_RUNNER = 'skipped_no_runner'
const MAP_PROVIDER_VISUAL_MODE_FAILED = 'provider_failed'
const MAP_PROVIDER_VISUAL_MODE_TEXT = 'provider_text'
const MAP_PROVIDER_VISUAL_MODE_IMAGE_URL = 'provider_image_url'
const ROUTE_FAMILIARITY_LIMIT = 8
const ROUTE_FAMILIARITY_TIERS = [
  {
    tier: 'new_route',
    minPoints: 0,
    minCompletedCount: 1,
    tierLabelZh: '新路线',
    tierLabelEn: 'New route',
    tone: 'blue',
  },
  {
    tier: 'known_route',
    minPoints: 20,
    minCompletedCount: 2,
    tierLabelZh: '熟悉路线',
    tierLabelEn: 'Known route',
    tone: 'amber',
  },
  {
    tier: 'trusted_route',
    minPoints: 60,
    minCompletedCount: 4,
    tierLabelZh: '稳定路线',
    tierLabelEn: 'Trusted route',
    tone: 'emerald',
  },
  {
    tier: 'signature_route',
    minPoints: 120,
    minCompletedCount: 8,
    tierLabelZh: '招牌路线',
    tierLabelEn: 'Signature route',
    tone: 'sky-solid',
  },
]
const MAP_AREA_UNLOCKS = [
  {
    id: 'city_core',
    areaLabelZh: '城市核心',
    areaLabelEn: 'City core',
    descriptionZh: '完成第一段移动后，地图开始记录你的城市活动范围。',
    descriptionEn: 'The map starts tracking your city activity range after the first completed trip.',
    requiredPoints: 8,
    requiredCompletedTrips: 1,
    requiredKnownRoutes: 0,
    requiredTrustedRoutes: 0,
    tone: 'emerald',
    icon: 'fas fa-map-location-dot',
  },
  {
    id: 'commute_belt',
    areaLabelZh: '通勤走廊',
    areaLabelEn: 'Commute belt',
    descriptionZh: '重复完成路线后，常用移动带会被识别为稳定活动区域。',
    descriptionEn: 'Repeated completed routes reveal a stable movement corridor.',
    requiredPoints: 30,
    requiredCompletedTrips: 2,
    requiredKnownRoutes: 1,
    requiredTrustedRoutes: 0,
    tone: 'blue',
    icon: 'fas fa-route',
  },
  {
    id: 'routine_nodes',
    areaLabelZh: '日常据点',
    areaLabelEn: 'Routine nodes',
    descriptionZh: '稳定路线会沉淀出常去地点，可作为后续日常事件节点。',
    descriptionEn: 'Trusted routes turn recurring destinations into future routine event nodes.',
    requiredPoints: 70,
    requiredCompletedTrips: 4,
    requiredKnownRoutes: 1,
    requiredTrustedRoutes: 1,
    tone: 'amber',
    icon: 'fas fa-location-dot',
  },
  {
    id: 'outer_ring',
    areaLabelZh: '远行外环',
    areaLabelEn: 'Outer ring',
    descriptionZh: '足够多的足迹和稳定路线会打开更远区域的叙事空间。',
    descriptionEn: 'Enough Footprints and trusted routes open narrative space beyond the usual area.',
    requiredPoints: 120,
    requiredCompletedTrips: 6,
    requiredKnownRoutes: 2,
    requiredTrustedRoutes: 1,
    tone: 'sky-solid',
    icon: 'fas fa-compass',
  },
]
const MAP_AREA_FEEDBACK_LIMIT = 4
const MAP_CALENDAR_REMINDER_LIMIT = 4
const MAP_CALENDAR_REMINDER_STATUS_CONFIRMED = 'confirmed'
const MAP_CALENDAR_REMINDER_STATUS_DISMISSED = 'dismissed'
const MAP_CALENDAR_REMINDER_STATUS_DRAFT = 'draft'
const MAP_CALENDAR_REMINDER_STATUS_SUGGESTED = 'suggested'
const MAP_CALENDAR_REMINDER_STATUSES = new Set([
  MAP_CALENDAR_REMINDER_STATUS_CONFIRMED,
  MAP_CALENDAR_REMINDER_STATUS_DISMISSED,
  MAP_CALENDAR_REMINDER_STATUS_DRAFT,
  MAP_CALENDAR_REMINDER_STATUS_SUGGESTED,
])
const MAP_AREA_FEEDBACK_RULES = {
  city_core: {
    titleZh: '城市核心已点亮',
    titleEn: 'City core activated',
    summaryZh: '首次完成行程后，地图开始把移动记录转化为可追踪的城市活动范围。',
    summaryEn: 'After the first completed trip, the map starts turning movement history into a trackable city range.',
  },
  commute_belt: {
    titleZh: '通勤走廊成形',
    titleEn: 'Commute corridor formed',
    summaryZh: '重复路线已经形成稳定移动带，后续可用于通勤提醒、到达反馈和日常事件。',
    summaryEn: 'Repeated routes have formed a stable corridor for future commute reminders, arrival feedback, and routine events.',
  },
  routine_nodes: {
    titleZh: '日常据点浮现',
    titleEn: 'Routine nodes surfaced',
    summaryZh: '稳定路线沉淀出常去地点，地图可以开始围绕这些地点生成轻量生活反馈。',
    summaryEn: 'Trusted routes reveal recurring destinations that can support lightweight daily location feedback.',
  },
  outer_ring: {
    titleZh: '远行外环开启',
    titleEn: 'Outer ring opened',
    summaryZh: '更远范围已经具备叙事入口，后续可承接远行、偶遇和跨区事件。',
    summaryEn: 'The wider range now has narrative entry points for future long rides, encounters, and cross-area events.',
  },
}

const SEED_ADDRESSES = [
  {
    id: 1,
    label: '家',
    detail: '首尔市江南区清潭洞 88-1',
    category: 'home',
    mapPackId: DEFAULT_MAP_PACK_ID,
    position: { kind: 'geo', lat: 37.524, lng: 127.049 },
  },
  {
    id: 2,
    label: '公司',
    detail: '首尔市麻浦区世界杯北路 400',
    category: 'work',
    mapPackId: DEFAULT_MAP_PACK_ID,
    position: { kind: 'geo', lat: 37.5801, lng: 126.8896 },
  },
  {
    id: 3,
    label: '练习室',
    detail: '首尔市龙山区汉江大路 120',
    category: 'work',
    mapPackId: DEFAULT_MAP_PACK_ID,
    position: { kind: 'geo', lat: 37.5312, lng: 126.9726 },
  },
]

const toInt = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

const createDefaultCurrentLocation = () => {
  const evidenceAt = Date.now()
  return {
    source: 'saved',
    label: SEED_ADDRESSES[0].label,
    detail: SEED_ADDRESSES[0].detail,
    mapPackId: SEED_ADDRESSES[0].mapPackId,
    placeId: `address:${SEED_ADDRESSES[0].id}`,
    position: { ...SEED_ADDRESSES[0].position },
    positionEvidence: createMapPositionEvidence({
      provenance: MAP_EVENT_POSITION_PROVENANCE.MANUAL,
      placeId: `address:${SEED_ADDRESSES[0].id}`,
      evidenceAt,
    }),
  }
}

const createDefaultTripForm = () => ({
  from: SEED_ADDRESSES[0].detail,
  to: SEED_ADDRESSES[1].detail,
  transportMode: '',
})

const createIdleTripState = () => ({
  status: TRIP_STATUS_IDLE,
  journeySchemaVersion: 0,
  journeyId: '',
  phase: '',
  checkpoints: [],
  eventCheckpointIds: [],
  activeInterruption: null,
  eventDelaySeconds: 0,
  worldPackId: '',
  mapPackId: '',
  from: '',
  to: '',
  fromLabel: '',
  toLabel: '',
  destinationPlaceId: '',
  transportMode: '',
  estimateVersion: 0,
  distanceKm: 0,
  fare: 0,
  durationSeconds: 0,
  startedAt: 0,
  etaAt: 0,
  arrivedAt: 0,
  pausedAt: 0,
  remainingSecondsAtPause: 0,
  totalPausedSeconds: 0,
  pushScheduleRevision: 0,
  scheduledPushId: '',
})

const createDefaultMapVisualSettings = () => ({
  mode: MAP_VISUAL_MODE_DEFAULT,
  assetId: '',
  aiVisualEnabled: false,
  providerVisualEnabled: false,
  onboardingPromptPending: true,
})

const createDefaultMapAutomationRuntime = () => ({
  lastRequestAt: 0,
  lastExecuteAt: 0,
  lastNotifyOnlyAt: 0,
  lastResult: '',
  lastReason: '',
  lastTaskId: '',
  lastProviderAttemptAt: 0,
  lastProviderSuccessAt: 0,
  lastProviderMode: MAP_PROVIDER_VISUAL_MODE_DISABLED,
  lastProviderErrorCode: '',
  lastProviderMessage: '',
  lastProviderSummary: '',
  lastProviderImageUrl: '',
})

const findMapPackInList = (mapPacks, packId) =>
  (Array.isArray(mapPacks) ? mapPacks : []).find((pack) => pack.id === packId) ||
  getMapPackById(DEFAULT_MAP_PACK_ID)

const normalizeAddressCategory = (value) => normalizeUserMapPlaceCategory(value)

const normalizeAddressRecord = (item, index = 0, mapPacks = listMapPacks()) => {
  if (!item || typeof item !== 'object') return null
  const label = typeof item.label === 'string' ? item.label.trim() : ''
  const detail = typeof item.detail === 'string' ? item.detail.trim() : ''
  if (!label || !detail) return null
  const rawId = Number(item.id)
  const mapPackId =
    typeof item.mapPackId === 'string' && item.mapPackId.trim()
      ? findMapPackInList(mapPacks, item.mapPackId.trim()).id
      : DEFAULT_MAP_PACK_ID
  const position = normalizeMapPosition(item.position, findMapPackInList(mapPacks, mapPackId).coordinateKind)
  return {
    id: Number.isFinite(rawId) ? Math.trunc(rawId) : Date.now() + index,
    label,
    detail,
    category: normalizeAddressCategory(item.category),
    mapPackId,
    position,
  }
}

const normalizeCurrentLocation = (raw, mapPacks = listMapPacks()) => {
  const fallback = createDefaultCurrentLocation()
  if (!raw || typeof raw !== 'object') return fallback
  const detail = typeof raw.detail === 'string' ? raw.detail.trim() : ''
  if (!detail) return fallback
  const placeId =
    typeof raw.placeId === 'string' ? raw.placeId.trim().toLowerCase().slice(0, 180) : ''
  return {
    source: typeof raw.source === 'string' ? raw.source : fallback.source,
    label:
      typeof raw.label === 'string' && raw.label.trim()
        ? raw.label.trim()
        : fallback.label,
    detail,
    mapPackId:
      typeof raw.mapPackId === 'string' && raw.mapPackId.trim()
        ? findMapPackInList(mapPacks, raw.mapPackId.trim()).id
        : fallback.mapPackId,
    position:
      normalizeMapPosition(
        raw.position,
        findMapPackInList(mapPacks, raw.mapPackId || fallback.mapPackId).coordinateKind,
      ) || null,
    placeId,
    positionEvidence: normalizeMapPositionEvidence(raw.positionEvidence, {
      provenance: MAP_EVENT_POSITION_PROVENANCE.MANUAL,
      placeId,
      evidenceAt: raw.updatedAt || Date.now(),
    }),
  }
}

const normalizeWorldMapPackBindings = (raw, mapPacks = listMapPacks()) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const availableIds = new Set(mapPacks.map((pack) => pack.id))
  return Object.fromEntries(
    Object.entries(raw)
      .map(([worldPackId, mapPackId]) => [
        typeof worldPackId === 'string' ? worldPackId.trim().slice(0, 120) : '',
        typeof mapPackId === 'string' ? mapPackId.trim().slice(0, 120) : '',
      ])
      .filter(([worldPackId, mapPackId]) => worldPackId && availableIds.has(mapPackId)),
  )
}

const normalizeMapPinVisibilityOverrides = (raw, limit) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw)
      .map(([id, visible]) => [
        typeof id === 'string' ? id.trim().slice(0, 180) : '',
        visible,
      ])
      .filter(([id, visible]) => id && typeof visible === 'boolean')
      .slice(0, limit),
  )
}

const normalizeMapPinVisibilityByPack = (raw, mapPacks = listMapPacks()) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const availablePackIds = new Set(mapPacks.map((pack) => pack.id))
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([mapPackId, state]) => availablePackIds.has(mapPackId) && state && typeof state === 'object')
      .map(([mapPackId, state]) => [
        mapPackId,
        {
          categoryVisibility: normalizeMapPinVisibilityOverrides(
            state.categoryVisibility,
            MAP_PIN_VISIBILITY_CATEGORY_LIMIT,
          ),
          placeVisibility: normalizeMapPinVisibilityOverrides(
            state.placeVisibility,
            MAP_PIN_VISIBILITY_PLACE_LIMIT,
          ),
        },
      ]),
  )
}

const normalizeTripForm = (raw) => {
  const fallback = createDefaultTripForm()
  if (!raw || typeof raw !== 'object') return fallback
  return {
    from:
      typeof raw.from === 'string' && raw.from.trim()
        ? raw.from.trim()
        : fallback.from,
    to:
      typeof raw.to === 'string' && raw.to.trim()
        ? raw.to.trim()
        : fallback.to,
    transportMode: normalizeMapTransportMode(raw.transportMode),
  }
}

const normalizeTripEventCheckpointIds = (rawIds) => {
  if (!Array.isArray(rawIds)) return []
  const allowedIds = new Set(MAP_JOURNEY_EVENT_ELIGIBLE_CHECKPOINT_IDS)
  return [...new Set(rawIds)]
    .filter((id) => typeof id === 'string' && allowedIds.has(id.trim()))
    .map((id) => id.trim())
}

const normalizeTripActiveInterruption = (raw, journeyId) => {
  if (!raw || typeof raw !== 'object') return null
  const proposalId = typeof raw.proposalId === 'string' ? raw.proposalId.trim().slice(0, 180) : ''
  const eventId = typeof raw.eventId === 'string' ? raw.eventId.trim().slice(0, 160) : ''
  const checkpointId =
    typeof raw.checkpointId === 'string' ? raw.checkpointId.trim().slice(0, 80) : ''
  const sourceJourneyId =
    typeof raw.journeyId === 'string' ? raw.journeyId.trim().slice(0, 140) : journeyId
  if (
    !proposalId ||
    !eventId ||
    sourceJourneyId !== journeyId ||
    !MAP_JOURNEY_EVENT_ELIGIBLE_CHECKPOINT_IDS.includes(checkpointId)
  ) {
    return null
  }
  return {
    proposalId,
    eventId,
    journeyId,
    checkpointId,
    requestedAt: Math.max(0, toInt(raw.requestedAt, 0)),
  }
}

const normalizeTripState = (raw) => {
  if (!raw || typeof raw !== 'object') return createIdleTripState()
  const status =
    raw.status === TRIP_STATUS_TRAVELING || raw.status === TRIP_STATUS_ARRIVED
      ? raw.status
      : TRIP_STATUS_IDLE
  if (status === TRIP_STATUS_IDLE) return createIdleTripState()
  const startedAt = Math.max(0, toInt(raw.startedAt, 0))
  const durationSeconds = Math.max(0, toInt(raw.durationSeconds, 0))
  const arrivedAt = Math.max(0, toInt(raw.arrivedAt, 0))
  const isArrived = status === TRIP_STATUS_ARRIVED
  const rawJourneySchemaVersion = Math.max(0, toInt(raw.journeySchemaVersion, 0))
  const isPaused = status === TRIP_STATUS_TRAVELING && raw.phase === MAP_JOURNEY_PHASE.PAUSED
  const journeyId =
    typeof raw.journeyId === 'string' && raw.journeyId.trim()
      ? raw.journeyId.trim().slice(0, 140)
      : createMapJourneyId(startedAt)
  const checkpoints = normalizeMapJourneyCheckpoints(raw.checkpoints, {
    startedAt,
    durationSeconds,
    arrivedAt,
    isArrived,
  })
  const activeInterruption =
    status === TRIP_STATUS_TRAVELING
      ? normalizeTripActiveInterruption(raw.activeInterruption, journeyId)
      : null
  const pausedAt = isPaused ? Math.max(0, toInt(raw.pausedAt, startedAt)) : 0
  const remainingSecondsAtPause = isPaused
    ? Math.min(durationSeconds, Math.max(0, toInt(raw.remainingSecondsAtPause, durationSeconds)))
    : 0
  const migratesBlockingJourneyEvent =
    isPaused &&
    Boolean(activeInterruption) &&
    rawJourneySchemaVersion > 0 &&
    rawJourneySchemaVersion < MAP_JOURNEY_SCHEMA_VERSION
  const migratedAt = migratesBlockingJourneyEvent ? Date.now() : 0
  const migratedPauseDurationMs = migratesBlockingJourneyEvent
    ? Math.max(0, migratedAt - pausedAt)
    : 0
  const rawEtaAt = Math.max(0, toInt(raw.etaAt, 0))
  return {
    status,
    journeySchemaVersion: migratesBlockingJourneyEvent
      ? MAP_JOURNEY_SCHEMA_VERSION
      : rawJourneySchemaVersion,
    journeyId,
    phase: resolveMapJourneyPhase(checkpoints, {
      paused: isPaused && !migratesBlockingJourneyEvent,
      arrived: isArrived,
    }),
    checkpoints,
    eventCheckpointIds: normalizeTripEventCheckpointIds(raw.eventCheckpointIds),
    activeInterruption,
    eventDelaySeconds: Math.max(0, toInt(raw.eventDelaySeconds, 0)),
    worldPackId:
      typeof raw.worldPackId === 'string' ? raw.worldPackId.trim().slice(0, 120) : '',
    mapPackId:
      typeof raw.mapPackId === 'string' ? raw.mapPackId.trim().slice(0, 120) : '',
    from: typeof raw.from === 'string' ? raw.from.trim() : '',
    to: typeof raw.to === 'string' ? raw.to.trim() : '',
    fromLabel: typeof raw.fromLabel === 'string' ? raw.fromLabel.trim() : '',
    toLabel: typeof raw.toLabel === 'string' ? raw.toLabel.trim() : '',
    destinationPlaceId:
      typeof raw.destinationPlaceId === 'string'
        ? raw.destinationPlaceId.trim().toLowerCase().slice(0, 180)
        : '',
    transportMode: normalizeMapTransportMode(raw.transportMode, LEGACY_MAP_TRANSPORT_MODE),
    estimateVersion: Math.max(0, toInt(raw.estimateVersion, 0)),
    distanceKm: Math.max(0, Number(raw.distanceKm) || 0),
    fare: Math.max(0, toInt(raw.fare, 0)),
    durationSeconds,
    startedAt,
    etaAt: migratesBlockingJourneyEvent
      ? rawEtaAt > 0
        ? rawEtaAt + migratedPauseDurationMs
        : migratedAt + remainingSecondsAtPause * 1000
      : rawEtaAt,
    arrivedAt,
    pausedAt: isPaused && !migratesBlockingJourneyEvent ? pausedAt : 0,
    remainingSecondsAtPause:
      isPaused && !migratesBlockingJourneyEvent ? remainingSecondsAtPause : 0,
    totalPausedSeconds:
      Math.max(0, toInt(raw.totalPausedSeconds, 0)) +
      Math.floor(migratedPauseDurationMs / 1000),
    pushScheduleRevision:
      Math.max(0, toInt(raw.pushScheduleRevision, 0)) +
      (migratesBlockingJourneyEvent ? 1 : 0),
    scheduledPushId:
      !isPaused && typeof raw.scheduledPushId === 'string' && raw.scheduledPushId.trim()
        ? raw.scheduledPushId.trim().slice(0, 120)
        : '',
  }
}

const normalizeTripHistoryItem = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const status = raw.status === 'cancelled' ? 'cancelled' : 'arrived'
  const from = typeof raw.from === 'string' ? raw.from.trim() : ''
  const to = typeof raw.to === 'string' ? raw.to.trim() : ''
  if (!from || !to) return null
  const endedAt = Math.max(0, toInt(raw.endedAt, 0))
  if (!endedAt) return null
  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `trip_hist_${endedAt}_${index}`
  const startedAt = Math.max(0, toInt(raw.startedAt, 0))
  const durationSeconds = Math.max(0, toInt(raw.durationSeconds, 0))
  const checkpoints = normalizeMapJourneyCheckpoints(raw.checkpoints, {
    startedAt,
    durationSeconds,
    arrivedAt: status === 'arrived' ? endedAt : 0,
    isArrived: status === 'arrived',
  })
  return {
    id,
    status,
    journeySchemaVersion: Math.max(0, toInt(raw.journeySchemaVersion, 0)),
    journeyId:
      typeof raw.journeyId === 'string' && raw.journeyId.trim()
        ? raw.journeyId.trim().slice(0, 140)
        : createMapJourneyId(startedAt || endedAt),
    phase:
      status === 'arrived'
        ? MAP_JOURNEY_PHASE.ARRIVED
        : MAP_JOURNEY_PHASE.CANCELLED,
    checkpoints,
    eventCheckpointIds: normalizeTripEventCheckpointIds(raw.eventCheckpointIds),
    eventDelaySeconds: Math.max(0, toInt(raw.eventDelaySeconds, 0)),
    totalPausedSeconds: Math.max(0, toInt(raw.totalPausedSeconds, 0)),
    worldPackId:
      typeof raw.worldPackId === 'string' ? raw.worldPackId.trim().slice(0, 120) : '',
    mapPackId:
      typeof raw.mapPackId === 'string' ? raw.mapPackId.trim().slice(0, 120) : '',
    from,
    to,
    fromLabel: typeof raw.fromLabel === 'string' ? raw.fromLabel.trim() : '',
    toLabel: typeof raw.toLabel === 'string' ? raw.toLabel.trim() : '',
    destinationPlaceId:
      typeof raw.destinationPlaceId === 'string'
        ? raw.destinationPlaceId.trim().toLowerCase().slice(0, 180)
        : '',
    transportMode: normalizeMapTransportMode(raw.transportMode, LEGACY_MAP_TRANSPORT_MODE),
    estimateVersion: Math.max(0, toInt(raw.estimateVersion, 0)),
    distanceKm: Math.max(0, Number(raw.distanceKm) || 0),
    fare: Math.max(0, toInt(raw.fare, 0)),
    durationSeconds,
    startedAt,
    endedAt,
    rewardPoints:
      status === 'arrived'
        ? Math.max(0, toInt(raw.rewardPoints, 0))
        : 0,
    eventKind:
      typeof raw.eventKind === 'string' && raw.eventKind.trim()
        ? raw.eventKind.trim().slice(0, 80)
        : '',
    eventTitleZh:
      typeof raw.eventTitleZh === 'string' && raw.eventTitleZh.trim()
        ? raw.eventTitleZh.trim().slice(0, 80)
        : '',
    eventTitleEn:
      typeof raw.eventTitleEn === 'string' && raw.eventTitleEn.trim()
        ? raw.eventTitleEn.trim().slice(0, 80)
        : '',
    eventSummaryZh:
      typeof raw.eventSummaryZh === 'string' && raw.eventSummaryZh.trim()
        ? raw.eventSummaryZh.trim().slice(0, 180)
        : '',
    eventSummaryEn:
      typeof raw.eventSummaryEn === 'string' && raw.eventSummaryEn.trim()
        ? raw.eventSummaryEn.trim().slice(0, 180)
        : '',
    relationshipBinding: normalizeRelationshipBinding(raw.relationshipBinding),
  }
}

const mapPositionsEqual = (left, right, coordinateKind) => {
  const normalizedLeft = normalizeMapPosition(left, coordinateKind)
  const normalizedRight = normalizeMapPosition(right, coordinateKind)
  if (!normalizedLeft || !normalizedRight || normalizedLeft.kind !== normalizedRight.kind) return false
  if (normalizedLeft.kind === 'geo') {
    return (
      Math.abs(normalizedLeft.lat - normalizedRight.lat) <= 0.000001 &&
      Math.abs(normalizedLeft.lng - normalizedRight.lng) <= 0.000001
    )
  }
  return (
    Math.abs(normalizedLeft.x - normalizedRight.x) <= 0.000001 &&
    Math.abs(normalizedLeft.y - normalizedRight.y) <= 0.000001
  )
}

const findLegacyCurrentLocationPlace = (data = {}) => {
  const availableMapPacks = listMapPacks(normalizeCustomMapPacks(data.customMapPacks))
  const mapPack = findMapPackInList(availableMapPacks, data.currentLocation?.mapPackId)
  const addresses = Array.isArray(data.addresses)
    ? data.addresses
        .map((item, index) => normalizeAddressRecord(item, index, availableMapPacks))
        .filter(Boolean)
    : []
  const candidates = [
    ...(mapPack.places || []).map((place) => ({ ...place, placeId: place.id })),
    ...addresses
      .filter((address) => address.mapPackId === mapPack.id)
      .map((address) => ({ ...address, placeId: `address:${address.id}` })),
  ]
  const current = data.currentLocation || {}
  const requestedPlaceId =
    typeof current.placeId === 'string' ? current.placeId.trim().toLowerCase() : ''
  if (requestedPlaceId) {
    return candidates.find((place) => String(place.placeId).toLowerCase() === requestedPlaceId) || null
  }
  const currentTexts = [current.label, current.detail]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim().toLocaleLowerCase())
  return candidates.find((place) => {
    const placeTexts = [
      place.label,
      place.detail,
      place.nameZh,
      place.nameEn,
      place.detailZh,
      place.detailEn,
    ]
      .filter((value) => typeof value === 'string' && value.trim())
      .map((value) => value.trim().toLocaleLowerCase())
    return (
      currentTexts.some((value) => placeTexts.includes(value)) &&
      mapPositionsEqual(current.position, place.position, mapPack.coordinateKind)
    )
  }) || null
}

const migrateMapCurrentLocationV3 = (data = {}, { migratedAt = Date.now() } = {}) => {
  const current = data.currentLocation && typeof data.currentLocation === 'object'
    ? data.currentLocation
    : createDefaultCurrentLocation()
  const place = findLegacyCurrentLocationPlace(data)
  const placeId = place?.placeId || ''
  const trip = data.tripState && typeof data.tripState === 'object' ? data.tripState : {}
  const tripDestinationTexts = [trip.to, trip.toLabel]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim().toLocaleLowerCase())
  const placeTexts = place
    ? [place.label, place.detail, place.nameZh, place.nameEn, place.detailZh, place.detailEn]
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => value.trim().toLocaleLowerCase())
    : []
  const provesJourneyArrival =
    current.source === 'trip_arrived' &&
    trip.status === TRIP_STATUS_ARRIVED &&
    typeof trip.journeyId === 'string' &&
    Boolean(trip.journeyId.trim()) &&
    Number(trip.arrivedAt) > 0 &&
    String(trip.mapPackId || current.mapPackId) === String(current.mapPackId) &&
    Boolean(placeId) &&
    tripDestinationTexts.some((value) => placeTexts.includes(value))
  return {
    ...current,
    placeId,
    positionEvidence: createMapPositionEvidence({
      provenance: provesJourneyArrival
        ? MAP_EVENT_POSITION_PROVENANCE.JOURNEY_ARRIVAL
        : MAP_EVENT_POSITION_PROVENANCE.MANUAL,
      placeId,
      evidenceAt: provesJourneyArrival
        ? Number(trip.arrivedAt)
        : Math.max(1, toInt(migratedAt, 1)),
      journeyId: provesJourneyArrival ? trip.journeyId : '',
      journeyArrivedAt: provesJourneyArrival ? Number(trip.arrivedAt) : 0,
    }),
  }
}

export const migrateMapStorage = ({ version, data, savedAt } = {}) => {
  if (Number(version) !== 2 || !data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }
  return {
    ...data,
    currentLocation: migrateMapCurrentLocationV3(data, { migratedAt: savedAt }),
    placeSession: createEmptyMapPlaceSession(),
  }
}

const buildTripArrivalReward = (state = {}) => {
  const distanceKm = Math.max(0, toInt(state.distanceKm, 0))
  const durationSeconds = Math.max(0, toInt(state.durationSeconds, 0))
  const destination = `${state.toLabel || ''} ${state.to || ''}`.toLowerCase()
  const rewardPoints = Math.max(8, Math.round(distanceKm * 3) + (durationSeconds >= 1800 ? 8 : 3))

  if (distanceKm >= 15) {
    return {
      rewardPoints,
      eventKind: 'long_ride',
      eventTitleZh: '远距离行程',
      eventTitleEn: 'Long ride',
      eventSummaryZh: '完成了一段较长距离移动，城市区域理解度提升。',
      eventSummaryEn: 'Completed a longer route and improved city familiarity.',
    }
  }

  if (/公司|office|work|workplace/.test(destination)) {
    return {
      rewardPoints,
      eventKind: 'work_route',
      eventTitleZh: '通勤路线',
      eventTitleEn: 'Work route',
      eventSummaryZh: '常用通勤路线已记录，可作为后续日程和事件触发参考。',
      eventSummaryEn: 'A routine work route was logged for future schedule and event hooks.',
    }
  }

  if (/练习室|studio|gym|practice/.test(destination)) {
    return {
      rewardPoints,
      eventKind: 'routine_stop',
      eventTitleZh: '固定据点',
      eventTitleEn: 'Routine stop',
      eventSummaryZh: '常去地点已形成记忆，后续可扩展为日常事件节点。',
      eventSummaryEn: 'A familiar stop was logged and can later become a routine event node.',
    }
  }

  return {
    rewardPoints,
    eventKind: 'city_pulse',
    eventTitleZh: '城市脉冲',
    eventTitleEn: 'City pulse',
    eventSummaryZh: '完成一次城市移动，地图沉浸进度小幅提升。',
    eventSummaryEn: 'Completed a city movement and gained a small immersion progress boost.',
  }
}

const normalizeRouteEndpoint = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ')
}

const createTripRouteKey = (from, to) => {
  const normalizedFrom = normalizeRouteEndpoint(from)
  const normalizedTo = normalizeRouteEndpoint(to)
  if (!normalizedFrom || !normalizedTo) return ''
  return `${normalizedFrom} -> ${normalizedTo}`
}

const buildRouteFamiliarityTier = (pointsInput = 0, completedCountInput = 0) => {
  const points = Math.max(0, toInt(pointsInput, 0))
  const completedCount = Math.max(0, toInt(completedCountInput, 0))
  let selectedIndex = 0

  ROUTE_FAMILIARITY_TIERS.forEach((tier, index) => {
    if (points >= tier.minPoints || completedCount >= tier.minCompletedCount) {
      selectedIndex = index
    }
  })

  const tier = ROUTE_FAMILIARITY_TIERS[selectedIndex]
  const nextTier = ROUTE_FAMILIARITY_TIERS[selectedIndex + 1] || null
  return {
    tier: tier.tier,
    tierLabelZh: tier.tierLabelZh,
    tierLabelEn: tier.tierLabelEn,
    tone: tier.tone,
    nextTier: nextTier?.tier || '',
    nextTierLabelZh: nextTier?.tierLabelZh || '',
    nextTierLabelEn: nextTier?.tierLabelEn || '',
    nextPoints: nextTier ? Math.max(0, nextTier.minPoints - points) : 0,
    nextCompletedCount: nextTier
      ? Math.max(0, nextTier.minCompletedCount - completedCount)
      : 0,
  }
}

const isKnownRouteTier = (tier) =>
  tier === 'known_route' || tier === 'trusted_route' || tier === 'signature_route'

const isTrustedRouteTier = (tier) =>
  tier === 'trusted_route' || tier === 'signature_route'

const calculateAreaRequirementProgress = (current, required) => {
  const normalizedRequired = Math.max(0, toInt(required, 0))
  if (normalizedRequired <= 0) return 1
  return Math.max(0, Math.min(1, Math.max(0, toInt(current, 0)) / normalizedRequired))
}

const buildMapAreaUnlocks = ({ tripHistory = [], routeFamiliarity = [] } = {}) => {
  const arrivedTrips = Array.isArray(tripHistory)
    ? tripHistory.filter((item) => item?.status === 'arrived')
    : []
  const totalPoints = arrivedTrips.reduce(
    (sum, item) => sum + Math.max(0, toInt(item.rewardPoints, 0)),
    0,
  )
  const completedTrips = arrivedTrips.length
  const knownRoutes = Array.isArray(routeFamiliarity)
    ? routeFamiliarity.filter((route) => isKnownRouteTier(route?.tier)).length
    : 0
  const trustedRoutes = Array.isArray(routeFamiliarity)
    ? routeFamiliarity.filter((route) => isTrustedRouteTier(route?.tier)).length
    : 0

  return MAP_AREA_UNLOCKS.map((area) => {
    const requirementProgress = [
      calculateAreaRequirementProgress(totalPoints, area.requiredPoints),
      calculateAreaRequirementProgress(completedTrips, area.requiredCompletedTrips),
      calculateAreaRequirementProgress(knownRoutes, area.requiredKnownRoutes),
      calculateAreaRequirementProgress(trustedRoutes, area.requiredTrustedRoutes),
    ]
    const progress = Math.min(...requirementProgress)
    const unlocked = progress >= 1
    return {
      ...area,
      unlocked,
      status: unlocked ? 'unlocked' : 'locked',
      progress,
      progressPercent: Math.round(progress * 100),
      currentPoints: totalPoints,
      currentCompletedTrips: completedTrips,
      currentKnownRoutes: knownRoutes,
      currentTrustedRoutes: trustedRoutes,
      remainingPoints: Math.max(0, area.requiredPoints - totalPoints),
      remainingCompletedTrips: Math.max(0, area.requiredCompletedTrips - completedTrips),
      remainingKnownRoutes: Math.max(0, area.requiredKnownRoutes - knownRoutes),
      remainingTrustedRoutes: Math.max(0, area.requiredTrustedRoutes - trustedRoutes),
    }
  })
}

const resolveFeedbackRouteEndpoint = (label, raw) => {
  const normalizedLabel = normalizeRouteEndpoint(label)
  const normalizedRaw = normalizeRouteEndpoint(raw)
  if (!normalizedRaw) return normalizedLabel
  if (!normalizedLabel || normalizedLabel === '起点' || normalizedLabel === '目的地') {
    return normalizedRaw
  }
  return normalizedLabel
}

const buildMapAreaFeedback = ({ areaUnlocks = [], tripHistory = [], routeFamiliarity = [] } = {}) => {
  const unlockedAreas = Array.isArray(areaUnlocks)
    ? areaUnlocks.filter((area) => area?.unlocked)
    : []
  if (unlockedAreas.length <= 0) return []

  const arrivedTrips = Array.isArray(tripHistory)
    ? tripHistory.filter((item) => item?.status === 'arrived')
    : []
  const latestArrivedAt = arrivedTrips.reduce(
    (latest, item) => Math.max(latest, toInt(item.endedAt, 0)),
    0,
  )
  const latestArrivedTrip = arrivedTrips
    .slice()
    .sort((a, b) => toInt(b.endedAt, 0) - toInt(a.endedAt, 0))[0] || null
  const topRoute = Array.isArray(routeFamiliarity) ? routeFamiliarity[0] : null
  const routeLabel = topRoute
    ? `${resolveFeedbackRouteEndpoint(topRoute.fromLabel, topRoute.from)} -> ${resolveFeedbackRouteEndpoint(topRoute.toLabel, topRoute.to)}`.trim()
    : ''

  return unlockedAreas
    .map((area) => {
      const rule = MAP_AREA_FEEDBACK_RULES[area.id] || {
        titleZh: area.areaLabelZh || '区域反馈',
        titleEn: area.areaLabelEn || 'Area feedback',
        summaryZh: area.descriptionZh || '',
        summaryEn: area.descriptionEn || '',
      }
      return {
        id: `area_feedback_${area.id}`,
        areaId: area.id,
        areaLabelZh: area.areaLabelZh,
        areaLabelEn: area.areaLabelEn,
        titleZh: rule.titleZh,
        titleEn: rule.titleEn,
        summaryZh: rule.summaryZh,
        summaryEn: rule.summaryEn,
        tone: area.tone,
        icon: area.icon || 'fas fa-location-dot',
        triggeredAt: latestArrivedAt,
        sourceTripId: latestArrivedTrip?.id || '',
        routeLabel,
        completedTrips: area.currentCompletedTrips,
        explorationPoints: area.currentPoints,
      }
    })
    .slice(0, MAP_AREA_FEEDBACK_LIMIT)
}

const normalizeMapCalendarReminderId = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 120)
}

const normalizeMapCalendarReminderStatus = (value, fallback = '') => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (MAP_CALENDAR_REMINDER_STATUSES.has(normalized)) return normalized
  return fallback
}

const normalizeMapCalendarReminderPreference = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const status = normalizeMapCalendarReminderStatus(raw.status, '')
  const pinned = raw.pinned === true && status !== MAP_CALENDAR_REMINDER_STATUS_DISMISSED
  return {
    status,
    pinned,
    confirmedAt: Math.max(0, toInt(raw.confirmedAt, 0)),
    pinnedAt: pinned ? Math.max(0, toInt(raw.pinnedAt, 0)) : 0,
    dismissedAt:
      status === MAP_CALENDAR_REMINDER_STATUS_DISMISSED
        ? Math.max(0, toInt(raw.dismissedAt, 0))
        : 0,
    updatedAt: Math.max(0, toInt(raw.updatedAt, 0)),
  }
}

const normalizeMapCalendarReminderPreferences = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.entries(raw).reduce((output, [rawId, rawPreference]) => {
    const id = normalizeMapCalendarReminderId(rawId)
    const preference = normalizeMapCalendarReminderPreference(rawPreference)
    if (!id || !preference) return output
    output[id] = preference
    return output
  }, {})
}

const getMapCalendarReminderSortPriority = (reminder) => {
  if (reminder?.pinned) return 0
  if (reminder?.status === MAP_CALENDAR_REMINDER_STATUS_CONFIRMED) return 1
  if (reminder?.status === MAP_CALENDAR_REMINDER_STATUS_DISMISSED) return 3
  return 2
}

const buildMapCalendarReminders = ({ areaFeedback = [], preferences = {} } = {}) => {
  if (!Array.isArray(areaFeedback) || areaFeedback.length <= 0) return []

  return areaFeedback
    .map((feedback) => {
      const triggeredAt = Math.max(0, toInt(feedback.triggeredAt, 0))
      const dueAt = triggeredAt > 0 ? triggeredAt + 24 * 60 * 60 * 1000 : 0
      const routeCue = typeof feedback.routeLabel === 'string' ? feedback.routeLabel.trim() : ''
      const id = `map_calendar_${feedback.areaId}`
      const baseStatus = dueAt > 0
        ? MAP_CALENDAR_REMINDER_STATUS_SUGGESTED
        : MAP_CALENDAR_REMINDER_STATUS_DRAFT
      const preference = normalizeMapCalendarReminderPreference(preferences[id]) || {}
      const status =
        preference.status === MAP_CALENDAR_REMINDER_STATUS_CONFIRMED ||
        preference.status === MAP_CALENDAR_REMINDER_STATUS_DISMISSED
          ? preference.status
          : baseStatus
      const pinned =
        status !== MAP_CALENDAR_REMINDER_STATUS_DISMISSED && preference.pinned === true
      return {
        id,
        source: 'map_area_feedback',
        areaId: feedback.areaId,
        sourceTripId: feedback.sourceTripId || '',
        titleZh: `${feedback.areaLabelZh || '地图区域'}回访`,
        titleEn: `${feedback.areaLabelEn || 'Map area'} follow-up`,
        summaryZh: routeCue
          ? `基于 ${routeCue} 的地点反馈，适合加入后续提醒或日程线索。`
          : '基于已解锁区域的地点反馈，适合加入后续提醒或日程线索。',
        summaryEn: routeCue
          ? `Location feedback from ${routeCue}, ready to become a later reminder or schedule cue.`
          : 'Location feedback from an unlocked area, ready to become a later reminder or schedule cue.',
        dueAt,
        status,
        pinned,
        confirmedAt: Math.max(0, toInt(preference.confirmedAt, 0)),
        pinnedAt: pinned ? Math.max(0, toInt(preference.pinnedAt, 0)) : 0,
        dismissedAt:
          status === MAP_CALENDAR_REMINDER_STATUS_DISMISSED
            ? Math.max(0, toInt(preference.dismissedAt, 0))
            : 0,
        updatedAt: Math.max(0, toInt(preference.updatedAt, 0)),
        userManaged: Boolean(preference.updatedAt),
        route: '/map',
        icon: feedback.icon || 'fas fa-location-dot',
        tone: feedback.tone || 'blue',
        explorationPoints: Math.max(0, toInt(feedback.explorationPoints, 0)),
      }
    })
    .sort((a, b) => {
      const priorityDelta =
        getMapCalendarReminderSortPriority(a) - getMapCalendarReminderSortPriority(b)
      if (priorityDelta !== 0) return priorityDelta
      if (a.dueAt !== b.dueAt) return a.dueAt - b.dueAt
      return 0
    })
    .slice(0, MAP_CALENDAR_REMINDER_LIMIT)
}

const normalizeMapVisualSettings = (raw) => {
  const fallback = createDefaultMapVisualSettings()
  if (!raw || typeof raw !== 'object') return fallback
  const mode =
    raw.mode === MAP_VISUAL_MODE_GALLERY
      ? MAP_VISUAL_MODE_GALLERY
      : MAP_VISUAL_MODE_DEFAULT
  return {
    mode,
    assetId:
      typeof raw.assetId === 'string' && raw.assetId.trim()
        ? raw.assetId.trim()
        : '',
    aiVisualEnabled: raw.aiVisualEnabled === true,
    providerVisualEnabled: raw.providerVisualEnabled === true,
    onboardingPromptPending:
      typeof raw.onboardingPromptPending === 'boolean'
        ? raw.onboardingPromptPending
        : fallback.onboardingPromptPending,
  }
}

const createMapTripScheduleId = (startedAt = 0, revision = 0) => {
  const normalizedStartedAt = Math.max(0, toInt(startedAt, 0))
  const normalizedRevision = Math.max(0, toInt(revision, 0))
  if (!normalizedStartedAt) {
    return `map_trip_${Date.now()}_r${normalizedRevision}`
  }
  return `map_trip_${normalizedStartedAt}_r${normalizedRevision}`
}

const sanitizeHttpUrl = (value) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  if (!normalized) return ''
  try {
    const parsed = new URL(normalized)
    const protocol = parsed.protocol.toLowerCase()
    if (protocol !== 'http:' && protocol !== 'https:') return ''
    return parsed.href
  } catch {
    return ''
  }
}

const trimLine = (value, max = 200) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return ''
  return normalized.slice(0, max)
}

const normalizeFoodDeliveryRestaurantContext = (restaurant = {}) => {
  const rawRestaurant = restaurant && typeof restaurant === 'object' ? restaurant : {}
  const id = trimLine(rawRestaurant.id || rawRestaurant.restaurantId || '', 120)
  const name = trimLine(rawRestaurant.name || rawRestaurant.title || '', 90)
  const address = trimLine(rawRestaurant.address || rawRestaurant.detail || '', 160)
  return {
    id,
    name,
    address,
    distanceKm: Number(rawRestaurant.distanceKm),
    deliveryEtaMinutes: Number(rawRestaurant.deliveryEtaMinutes || rawRestaurant.etaMinutes),
  }
}

const normalizeDeliveryEventLocationContext = ({
  ownerModule = '',
  order = {},
  event = {},
} = {}) => {
  const rawOrder = order && typeof order === 'object' ? order : {}
  const rawEvent = event && typeof event === 'object' ? event : {}
  const normalizedOwner = trimLine(ownerModule, 40) || 'delivery'
  const orderId = trimLine(rawOrder.id || rawEvent.orderId || '', 140)
  const eventId = trimLine(rawEvent.id || rawEvent.eventId || '', 140)
  const pickupPoint = trimLine(
    rawEvent.pickupPoint ||
      rawEvent.pickupAddress ||
      rawEvent.restaurantAddress ||
      rawOrder.pickupPoint ||
      rawOrder.restaurantAddress ||
      rawOrder.restaurantName ||
      rawOrder.restaurant ||
      '',
    180,
  )
  const dropoffPoint = trimLine(
    rawEvent.deliveryAddress ||
      rawEvent.dropoffPoint ||
      rawOrder.deliveryAddress ||
      rawOrder.recipientAddress ||
      '',
    180,
  )
  const locationHint = trimLine(rawEvent.locationHint || rawEvent.location || rawEvent.city || '', 160)
  const title = trimLine(rawEvent.title || rawOrder.title || '', 120)
  const summary = trimLine(rawEvent.summary || rawEvent.desc || rawOrder.note || '', 240)
  const etaMinutesRaw = Number(rawEvent.etaMinutes || rawOrder.etaMinutes || rawOrder.deliveryEtaMinutes)
  const etaDaysRaw = Number(rawEvent.etaDays)

  return {
    ownerModule: normalizedOwner,
    orderId,
    eventId,
    eventType: trimLine(rawEvent.type || rawEvent.eventType || '', 80),
    title,
    summary,
    pickupPoint,
    dropoffPoint,
    locationHint,
    trackingCode: trimLine(rawEvent.trackingCode || rawEvent.trackingNo || '', 120),
    carrierName: trimLine(rawEvent.carrierName || rawEvent.carrier || '', 120),
    etaMinutes: Number.isFinite(etaMinutesRaw) && etaMinutesRaw > 0 ? Math.round(etaMinutesRaw) : 0,
    etaDays: Number.isFinite(etaDaysRaw) && etaDaysRaw >= 0 ? Math.round(etaDaysRaw) : null,
  }
}

const buildMapProviderVisualPrompt = ({ settings, locationText, tripSnapshot }) => {
  const mode = settings?.mode === MAP_VISUAL_MODE_GALLERY ? 'gallery' : 'default'
  const tripText = tripSnapshot?.status === TRIP_STATUS_TRAVELING
    ? `Traveling from ${tripSnapshot.fromLabel || tripSnapshot.from || 'Unknown'} to ${tripSnapshot.toLabel || tripSnapshot.to || 'Unknown'}`
    : tripSnapshot?.status === TRIP_STATUS_ARRIVED
      ? `Arrived at ${tripSnapshot.toLabel || tripSnapshot.to || 'destination'}`
      : 'No active trip'
  const location = trimLine(locationText, 160)
  return [
    'Generate one compact map visual brief for an immersive mobile map UI.',
    `Visual mode: ${mode}`,
    `Current location: ${location || 'Unknown location'}`,
    `Trip status: ${tripText}`,
    'Return strict JSON only with keys:',
    '{"sceneLabel":"...","visualNote":"...","imageUrl":"https://... or empty"}',
    'Rules:',
    '- sceneLabel <= 40 chars',
    '- visualNote <= 180 chars',
    '- imageUrl can be empty if unavailable',
  ].join('\n')
}

const normalizeMapProviderVisualResult = (rawText) => {
  const payload = parseAssistantJsonPayload(rawText)
  const fromObject = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null
  const sceneLabel = trimLine(fromObject?.sceneLabel || fromObject?.title || '', 40)
  const visualNote = trimLine(fromObject?.visualNote || fromObject?.note || rawText, 180)
  const imageUrl = sanitizeHttpUrl(fromObject?.imageUrl || fromObject?.image || '')
  return {
    sceneLabel,
    visualNote: visualNote || sceneLabel || 'Map visual refreshed.',
    imageUrl,
  }
}

export const useMapStore = defineStore('map', () => {
  const getSystemStore = () => useSystemStore()
  const getSimulationStore = () => useSimulationStore()
  const getSystemApiReports = () => useSystemApiReports({ systemStore: getSystemStore() })
  const getSystemNotifications = () => useSystemNotifications({ systemStore: getSystemStore() })
  const customMapPacks = ref([])
  const worldMapPackBindings = ref({})
  const mapPinVisibilityByPack = ref({})
  const mapPlaceKnowledgeByWorld = ref({})
  const mapPlaceDisplayMode = ref(MAP_PLACE_DISPLAY_MODE.SYSTEM)
  const mapPacks = computed(() => listMapPacks(customMapPacks.value))
  const activeMapPackId = ref(DEFAULT_MAP_PACK_ID)
  const addresses = reactive(SEED_ADDRESSES.map((item) => ({ ...item })))

  const currentLocation = ref(createDefaultCurrentLocation())
  const placeSession = ref(createEmptyMapPlaceSession())

  const tripForm = reactive(createDefaultTripForm())
  const tripState = ref(createIdleTripState())
  const tripHistory = ref([])
  const mapCalendarReminderPreferences = ref({})
  const mapVisualSettings = ref(createDefaultMapVisualSettings())
  const mapAutomationRuntime = ref(createDefaultMapAutomationRuntime())
  const runtimeNow = ref(Date.now())
  let tripArrivalTimer = null
  let tripPushSchedulePromise = null
  let tripPushPausePromise = null
  const tripPushCancelPromises = new Map()
  let mapAutomationHandlerRegistered = false
  let mapProviderRunnerOverride = null
  let mapEventTextProviderRunnerOverride = null
  let journeyCheckpointEventEvaluationEnabled = false
  let journeyEventRandomValueOverride
  const hasFinishedStorageHydration = ref(false)

  const activeMapPack = computed(() => findMapPackInList(mapPacks.value, activeMapPackId.value))

  const activeWorldPackId = computed(() => {
    const worldPack = getSystemStore().getActiveWorldPack?.()
    return typeof worldPack?.id === 'string' && worldPack.id.trim()
      ? worldPack.id.trim().slice(0, 120)
      : 'default_world'
  })

  const getAvailableMapPackById = (packId) => findMapPackInList(mapPacks.value, packId)

  const buildMapPlacesForPack = (packInput) => {
    const pack = findMapPackInList(mapPacks.value, packInput?.id || packInput)
    const builtInPlaces = (pack.places || []).map((place) => ({
      ...place,
      placeId: place.id,
      source: 'map_pack',
      mapPackId: pack.id,
    }))
    const userPlaces = addresses
      .filter((address) => address.mapPackId === pack.id)
      .map((address) => {
        const category = normalizeAddressCategory(address.category)
        return {
          ...address,
          category,
          placeId: `address:${address.id}`,
          source: 'user',
          nameZh: address.label,
          nameEn: address.label,
          detailZh: address.detail,
          detailEn: address.detail,
          icon: getMapPlaceCategoryVisual(category).icon,
        }
      })
    return [...builtInPlaces, ...userPlaces]
  }

  const activeMapAllPlaces = computed(() => buildMapPlacesForPack(activeMapPack.value))

  const mapEventSurfaceHostRegistry = createMapEventSurfaceHostRegistry()

  const mapEventSurfaces = computed(() => {
    const simulationStore = getSimulationStore()
    return simulationStore.eventInstances
      .filter(
        (instance) =>
          instance?.templateRef?.id === KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID &&
          instance.lifecycle !== EVENT_INSTANCE_LIFECYCLE.DISMISSED,
      )
      .map((instance) => {
        const mapPack = getAvailableMapPackById(instance.world.mapPackId)
        if (mapPack.id !== instance.world.mapPackId) return null
        const place = buildMapPlacesForPack(mapPack).find(
          (candidate) => candidate.placeId === instance.place.placeId,
        )
        const surface = projectMapPlaceSessionEventSurface({
          instance,
          sourceRecord: placeSession.value,
          mapPack,
          place,
        })
        if (!surface) return null
        const validation = mapEventSurfaceHostRegistry.validateProjection('map', surface)
        return validation.ok ? validation.projection : null
      })
      .filter(Boolean)
  })

  const mapEventSurfacePins = computed(() =>
    clusterMapEventSurfacePins(mapEventSurfaces.value, {
      mapPackId: activeMapPackId.value,
    }),
  )

  const getMapPlaceKnowledgeState = (worldPackId = activeWorldPackId.value) =>
    mapPlaceKnowledgeByWorld.value[worldPackId] || createMapPlaceKnowledgeState()

  const getMapPlaceDiscoveries = (
    worldPackId = activeWorldPackId.value,
    mapPackId = activeMapPackId.value,
  ) =>
    getMapPlaceKnowledgeState(worldPackId).discoveriesByMapPack?.[mapPackId] || {
      placeIds: [],
      evidenceByPlaceId: {},
    }

  const activeMapPlaceKnowledgeMode = computed(
    () => getMapPlaceKnowledgeState(activeWorldPackId.value).mode,
  )

  const activeMapPlaces = computed(() => {
    const discoveries = getMapPlaceDiscoveries(
      activeWorldPackId.value,
      activeMapPackId.value,
    )
    return activeMapAllPlaces.value.filter((place) =>
      isPlaceKnownByPolicy({
        place,
        mode: activeMapPlaceKnowledgeMode.value,
        discoveredPlaceIds: discoveries.placeIds,
      }),
    )
  })

  const activeMapPlaceDiscoverySummary = computed(() => {
    const discoveries = getMapPlaceDiscoveries(
      activeWorldPackId.value,
      activeMapPackId.value,
    )
    const discoverablePlaces = activeMapAllPlaces.value.filter(isMapPlaceFootprintDiscoverable)
    const placeById = new Map(
      discoverablePlaces.map((place) => [place.placeId || place.id, place]),
    )
    const recentDiscoveries = discoveries.placeIds
      .map((placeId) => ({
        placeId,
        place: placeById.get(placeId) || null,
        evidence: discoveries.evidenceByPlaceId?.[placeId] || null,
      }))
      .filter((item) => item.place)
      .sort(
        (left, right) =>
          Number(right.evidence?.discoveredAt || 0) - Number(left.evidence?.discoveredAt || 0) ||
          left.placeId.localeCompare(right.placeId),
      )
      .slice(0, 4)
    return {
      mode: activeMapPlaceKnowledgeMode.value,
      totalCount: discoverablePlaces.length,
      discoveredCount: discoveries.placeIds.filter((placeId) => placeById.has(placeId)).length,
      recentDiscoveries,
    }
  })

  const getMapPinVisibilityState = (mapPackId = activeMapPackId.value) =>
    mapPinVisibilityByPack.value[mapPackId] || {
      categoryVisibility: {},
      placeVisibility: {},
    }

  const isMapPlaceVisible = (placeInput) => {
    const place =
      typeof placeInput === 'string'
        ? activeMapPlaces.value.find((candidate) => candidate.placeId === placeInput)
        : placeInput
    if (!place) return false
    const mapPackId = place.mapPackId || activeMapPackId.value
    const state = getMapPinVisibilityState(mapPackId)
    const placeId = place.placeId || place.id
    if (typeof state.placeVisibility?.[placeId] === 'boolean') {
      return state.placeVisibility[placeId]
    }
    if (typeof state.categoryVisibility?.[place.category] === 'boolean') {
      return state.categoryVisibility[place.category]
    }
    return isMapPlaceCategoryDefaultVisible(place.category)
  }

  const activeMapVisiblePlaces = computed(() =>
    activeMapPlaces.value.filter((place) => isMapPlaceVisible(place)),
  )

  const getMapPlaceCategoryVisibility = (categoryId = 'all') => {
    const places =
      categoryId === 'all'
        ? activeMapPlaces.value
        : activeMapPlaces.value.filter((place) =>
            matchesMapPlaceCategoryFilter(place.category, categoryId),
          )
    const visibleCount = places.filter((place) => isMapPlaceVisible(place)).length
    return {
      visibleCount,
      totalCount: places.length,
      state:
        visibleCount === 0
          ? 'hidden'
          : visibleCount === places.length
            ? 'visible'
            : 'mixed',
    }
  }

  const setMapPlaceVisibility = (placeId, visible) => {
    const place = activeMapPlaces.value.find((candidate) => candidate.placeId === placeId)
    if (!place || typeof visible !== 'boolean') return false
    const mapPackId = place.mapPackId || activeMapPackId.value
    const current = getMapPinVisibilityState(mapPackId)
    mapPinVisibilityByPack.value = {
      ...mapPinVisibilityByPack.value,
      [mapPackId]: {
        categoryVisibility: { ...current.categoryVisibility },
        placeVisibility: {
          ...current.placeVisibility,
          [place.placeId]: visible,
        },
      },
    }
    return true
  }

  const setMapPlaceCategoryVisibility = (categoryId, visible) => {
    if (typeof visible !== 'boolean') return false
    const places =
      categoryId === 'all'
        ? activeMapPlaces.value
        : activeMapPlaces.value.filter((place) =>
            matchesMapPlaceCategoryFilter(place.category, categoryId),
          )
    if (places.length === 0) return false
    const mapPackId = activeMapPackId.value
    const current = getMapPinVisibilityState(mapPackId)
    const categoryVisibility = { ...current.categoryVisibility }
    const placeVisibility = { ...current.placeVisibility }
    const categoryIds = new Set(places.map((place) => place.category))
    categoryIds.forEach((id) => { categoryVisibility[id] = visible })
    places.forEach((place) => { delete placeVisibility[place.placeId] })
    mapPinVisibilityByPack.value = {
      ...mapPinVisibilityByPack.value,
      [mapPackId]: { categoryVisibility, placeVisibility },
    }
    return true
  }

  const resetActiveMapPinVisibility = () => {
    if (!mapPinVisibilityByPack.value[activeMapPackId.value]) return false
    const next = { ...mapPinVisibilityByPack.value }
    delete next[activeMapPackId.value]
    mapPinVisibilityByPack.value = next
    return true
  }

  const findMapPlaceByText = (textInput, places = activeMapAllPlaces.value) => {
    const text = typeof textInput === 'string' ? textInput.trim().toLocaleLowerCase() : ''
    if (!text) return null
    return (
      places.find((place) => {
        const candidates = [
          place.label,
          place.detail,
          place.nameZh,
          place.nameEn,
          place.detailZh,
          place.detailEn,
          ...(Array.isArray(place.aliases) ? place.aliases : []),
        ]
        return candidates.some(
          (candidate) =>
            typeof candidate === 'string' && candidate.trim().toLocaleLowerCase() === text,
        )
      }) || null
    )
  }

  const findActivePlaceByText = (textInput) => findMapPlaceByText(textInput)

  const findCurrentLocationByText = (textInput) => {
    const text = typeof textInput === 'string' ? textInput.trim().toLocaleLowerCase() : ''
    const current = currentLocation.value
    if (
      !text ||
      !current?.position ||
      current.mapPackId !== activeMapPackId.value
    ) return null
    const candidates = [
      current.label,
      current.detail,
      `${current.label || ''} · ${current.detail || ''}`,
    ]
    if (!candidates.some((candidate) =>
      typeof candidate === 'string' && candidate.trim().toLocaleLowerCase() === text
    )) return null
    return {
      ...current,
      id: 'map-role-position',
      placeId: 'map-role-position',
      source: 'role_position',
    }
  }

  const findTripEndpointByText = (textInput) =>
    findCurrentLocationByText(textInput) || findActivePlaceByText(textInput)

  const setMapPlaceDisplayMode = (mode) => {
    const normalizedMode = normalizeMapPlaceDisplayMode(mode)
    if (mapPlaceDisplayMode.value === normalizedMode) return false
    mapPlaceDisplayMode.value = normalizedMode
    return true
  }

  const setMapPlaceKnowledgeMode = (
    modeInput,
    worldPackId = activeWorldPackId.value,
  ) => {
    const normalizedWorldPackId =
      typeof worldPackId === 'string' ? worldPackId.trim().slice(0, 120) : ''
    const mode = normalizeMapPlaceKnowledgeMode(modeInput, '')
    if (!normalizedWorldPackId || !mode) return false
    const current = getMapPlaceKnowledgeState(normalizedWorldPackId)
    mapPlaceKnowledgeByWorld.value = {
      ...mapPlaceKnowledgeByWorld.value,
      [normalizedWorldPackId]: {
        ...current,
        mode,
        discoveriesByMapPack: { ...current.discoveriesByMapPack },
      },
    }
    return true
  }

  const recordMapPlaceDiscoveriesForArrival = ({
    trip,
    destinationPlace,
    sourceTripId,
    discoveredAt,
  } = {}) => {
    const worldPackId = trip?.worldPackId || activeWorldPackId.value
    const mapPackId = trip?.mapPackId || activeMapPackId.value
    const mapPack = getAvailableMapPackById(mapPackId)
    const sourceId = typeof sourceTripId === 'string' ? sourceTripId.trim() : ''
    const at = Math.max(0, Math.floor(Number(discoveredAt) || 0))
    if (!worldPackId || !mapPack || !destinationPlace?.position || !sourceId || !at) return []

    const worldState = getMapPlaceKnowledgeState(worldPackId)
    const packState = getMapPlaceDiscoveries(worldPackId, mapPackId)
    const discoveries = findNearbyFootprintDiscoveries({
      mapPack,
      places: buildMapPlacesForPack(mapPack),
      position: destinationPlace.position,
      discoveredPlaceIds: packState.placeIds,
    })
    if (discoveries.length === 0) return []

    const placeIds = [...packState.placeIds]
    const evidenceByPlaceId = { ...packState.evidenceByPlaceId }
    discoveries.forEach(({ place }) => {
      const placeId = place.placeId || place.id
      if (!placeIds.includes(placeId)) placeIds.push(placeId)
      evidenceByPlaceId[placeId] = {
        sourceType: MAP_PLACE_DISCOVERY_SOURCE.TRIP_ARRIVAL,
        sourceId,
        discoveredAt: at,
      }
    })
    mapPlaceKnowledgeByWorld.value = {
      ...mapPlaceKnowledgeByWorld.value,
      [worldPackId]: {
        ...worldState,
        discoveriesByMapPack: {
          ...worldState.discoveriesByMapPack,
          [mapPackId]: { placeIds, evidenceByPlaceId },
        },
      },
    }
    return discoveries.map(({ place, distanceKm }) => ({
      placeId: place.placeId || place.id,
      distanceKm,
    }))
  }

  const computeActiveTripEstimate = (fromText, toText, transportMode = tripForm.transportMode) => {
    const fromPlace = findTripEndpointByText(fromText)
    const toPlace = findTripEndpointByText(toText)
    const measuredDistanceKm =
      fromPlace?.position && toPlace?.position
        ? calculateMapDistanceKm(activeMapPack.value, fromPlace.position, toPlace.position)
        : null
    return estimateMapJourney({
      fromText,
      toText,
      measuredDistanceKm,
      transportMode,
    })
  }

  const tripEstimate = computed(() => {
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_IDLE) {
      const derived = estimateMapJourney({
        measuredDistanceKm: state.distanceKm,
        transportMode: state.transportMode,
      })
      return {
        ...derived,
        estimateVersion: state.estimateVersion,
        distanceKm: state.distanceKm,
        minutes: Math.max(0, Math.round(state.durationSeconds / 60)),
        durationSeconds: state.durationSeconds,
        fare: state.fare,
      }
    }
    return computeActiveTripEstimate(tripForm.from, tripForm.to)
  })

  const currentLocationText = computed(() => {
    if (!currentLocation.value.detail) return '未设置当前位置'
    return `${currentLocation.value.label} · ${currentLocation.value.detail}`
  })

  const tripRuntime = computed(() => {
    const state = normalizeTripState(tripState.value)
    if (state.status === TRIP_STATUS_IDLE) {
      return {
        ...state,
        progress: 0,
        elapsedSeconds: 0,
        remainingSeconds: 0,
      }
    }

    return {
      ...state,
      ...calculateMapJourneyRuntime(state, runtimeNow.value),
    }
  })

  const routeFamiliarity = computed(() => {
    const routeMap = new Map()

    tripHistory.value.forEach((item) => {
      if (item?.status !== 'arrived') return
      const routeKey = createTripRouteKey(item.from, item.to)
      if (!routeKey) return

      const existing = routeMap.get(routeKey) || {
        key: routeKey,
        from: normalizeRouteEndpoint(item.from),
        to: normalizeRouteEndpoint(item.to),
        fromLabel: normalizeRouteEndpoint(item.fromLabel || item.from),
        toLabel: normalizeRouteEndpoint(item.toLabel || item.to),
        points: 0,
        completedCount: 0,
        latestAt: 0,
        totalDistanceKm: 0,
        totalDurationSeconds: 0,
      }

      existing.points += Math.max(0, toInt(item.rewardPoints, 0))
      existing.completedCount += 1
      existing.latestAt = Math.max(existing.latestAt, toInt(item.endedAt, 0))
      existing.totalDistanceKm += Math.max(0, toInt(item.distanceKm, 0))
      existing.totalDurationSeconds += Math.max(0, toInt(item.durationSeconds, 0))
      routeMap.set(routeKey, existing)
    })

    return Array.from(routeMap.values())
      .map((route) => {
        const averageDistanceKm = route.completedCount
          ? Math.round((route.totalDistanceKm / route.completedCount) * 10) / 10
          : 0
        const averageDurationSeconds = route.completedCount
          ? Math.round(route.totalDurationSeconds / route.completedCount)
          : 0
        return {
          ...route,
          averageDistanceKm,
          averageDurationSeconds,
          ...buildRouteFamiliarityTier(route.points, route.completedCount),
        }
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount
        return b.latestAt - a.latestAt
      })
      .slice(0, ROUTE_FAMILIARITY_LIMIT)
  })

  const mapAreaUnlocks = computed(() =>
    buildMapAreaUnlocks({
      tripHistory: tripHistory.value,
      routeFamiliarity: routeFamiliarity.value,
    }),
  )

  const mapAreaFeedback = computed(() =>
    buildMapAreaFeedback({
      areaUnlocks: mapAreaUnlocks.value,
      tripHistory: tripHistory.value,
      routeFamiliarity: routeFamiliarity.value,
    }),
  )

  const mapCalendarReminders = computed(() =>
    buildMapCalendarReminders({
      areaFeedback: mapAreaFeedback.value,
      preferences: mapCalendarReminderPreferences.value,
    }),
  )

  const mapAiVisualAutomationPolicy = computed(() => {
    const systemStore = getSystemStore()
    const now = Date.now()
    const systemPolicy = systemStore.getAiAutomationRuntimePolicy(
      MAP_AUTOMATION_MODULE_KEY,
      now,
    )
    const toggleEnabled = mapVisualSettings.value.aiVisualEnabled === true
    const invokeEnabled = Boolean(systemPolicy.invokeEnabled && toggleEnabled)
    let reason = ''
    if (!toggleEnabled) {
      reason = 'map_ai_visual_disabled'
    } else if (!systemPolicy.masterEnabled) {
      reason = 'master_disabled'
    } else if (!systemPolicy.moduleEnabled) {
      reason = 'module_disabled'
    } else if (systemPolicy.notifyOnly) {
      reason = systemPolicy.quietHoursActive ? 'quiet_hours_notify_only' : 'notify_only_mode'
    }

    return {
      moduleKey: MAP_AUTOMATION_MODULE_KEY,
      toggleEnabled,
      masterEnabled: systemPolicy.masterEnabled,
      moduleEnabled: systemPolicy.moduleEnabled,
      quietHoursActive: systemPolicy.quietHoursActive,
      notifyOnly: systemPolicy.notifyOnly,
      enabled: Boolean(systemPolicy.enabled && toggleEnabled),
      invokeEnabled,
      reason,
    }
  })

  const useChineseSystemCopy = () =>
    String(getSystemStore().settings?.system?.language || '').toLowerCase().startsWith('zh')

  const resolveMapAutomationTaskKind = (task = {}) => {
    const reason = typeof task?.reason === 'string' ? task.reason.trim() : ''
    const source = typeof task?.source === 'string' ? task.source.trim() : ''
    const targetId = typeof task?.targetId === 'string' ? task.targetId.trim() : ''

    if (reason === 'map_visual_refresh' || targetId === 'map_visual' || source.startsWith('map_manual')) {
      return 'visual'
    }
    if (reason === 'map:auto' || targetId === 'map:auto' || source === 'map_background_tick') {
      return 'background'
    }
    return 'background'
  }

  const ensureMapAutomationHandlerRegistered = () => {
    if (mapAutomationHandlerRegistered) return true
    const systemStore = getSystemStore()
    const ok = systemStore.registerAiAutomationHandler(
      MAP_AUTOMATION_MODULE_KEY,
      mapAutomationTaskHandler,
    )
    mapAutomationHandlerRegistered = Boolean(ok)
    return mapAutomationHandlerRegistered
  }

  const clearTripArrivalTimer = () => {
    if (tripArrivalTimer === null) return
    clearTimeout(tripArrivalTimer)
    tripArrivalTimer = null
  }

  const canUseTripArrivalRealPush = () => {
    const systemStore = getSystemStore()
    const systemSettings = systemStore.settings?.system || {}
    const systemNotifications = getSystemNotifications()
    return (
      systemNotifications.notificationEnabled.value &&
      systemSettings.realPushEnabled === true &&
      systemSettings.pushSubscriptionActive === true &&
      typeof systemSettings.pushServerUrl === 'string' &&
      systemSettings.pushServerUrl.trim() &&
      typeof systemSettings.pushDeviceId === 'string' &&
      systemSettings.pushDeviceId.trim()
    )
  }

  const buildTripArrivalNotification = (state) => {
    const systemStore = getSystemStore()
    const useChinese = String(systemStore.settings?.system?.language || '').toLowerCase().startsWith('zh')
    const destination = state.toLabel || resolveAddressLabel(state.to, useChinese ? '目的地' : 'destination')

    return {
      id: `map_trip_arrival_${state.startedAt || Date.now()}`,
      title: useChinese ? '地图' : 'Map',
      content: useChinese ? `已到达 ${destination}。` : `Arrived at ${destination}.`,
      route: '/map',
      source: 'map_trip_arrival',
      createdAt: state.etaAt || Date.now(),
    }
  }

  const cancelTripArrivalPushScheduled = async ({ scheduleId = '', source = '' } = {}) => {
    const systemStore = getSystemStore()
    const state = normalizeTripState(tripState.value)
    const nextScheduleId =
      (typeof scheduleId === 'string' && scheduleId.trim()) ||
      state.scheduledPushId ||
      (state.startedAt
        ? createMapTripScheduleId(state.startedAt, state.pushScheduleRevision)
        : '')

    if (!nextScheduleId) {
      return { ok: false, reason: 'schedule_missing' }
    }

    if (tripPushCancelPromises.has(nextScheduleId)) {
      return tripPushCancelPromises.get(nextScheduleId)
    }

    const cancelPromise = (async () => {
      try {
        const serverUrl = systemStore.settings?.system?.pushServerUrl || ''
        if (!serverUrl) {
          if (normalizeTripState(tripState.value).scheduledPushId === nextScheduleId) {
            tripState.value = {
              ...normalizeTripState(tripState.value),
              scheduledPushId: '',
            }
          }
          return { ok: false, reason: 'server_url_missing' }
        }

        const result = await cancelScheduledPushNotification({
          serverUrl,
          scheduleId: nextScheduleId,
        })

        if (normalizeTripState(tripState.value).scheduledPushId === nextScheduleId) {
          tripState.value = {
            ...normalizeTripState(tripState.value),
            scheduledPushId: '',
          }
        }

        if (!result.ok) {
          getSystemApiReports().addReport({
            level: 'error',
            module: 'push',
            action: 'cancel_schedule',
            provider: 'push_relay',
            model: source || 'map_trip_arrival',
            code: result.reason || 'cancel_schedule_failed',
            message: result.message || 'Failed to cancel scheduled push notification.',
            createdAt: Date.now(),
          })
          return result
        }

        return {
          ok: true,
          removed: result.removed === true,
          scheduleId: nextScheduleId,
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to cancel scheduled push notification.'
        getSystemApiReports().addReport({
          level: 'error',
          module: 'push',
          action: 'cancel_schedule',
          provider: 'push_relay',
          model: source || 'map_trip_arrival',
          code: 'cancel_schedule_failed',
          message,
          createdAt: Date.now(),
        })
        return { ok: false, reason: 'cancel_schedule_failed', message }
      } finally {
        tripPushCancelPromises.delete(nextScheduleId)
      }
    })()

    tripPushCancelPromises.set(nextScheduleId, cancelPromise)
    return cancelPromise
  }

  const ensureTripArrivalPushScheduled = async ({ force = false, source = '' } = {}) => {
    const systemStore = getSystemStore()
    const state = normalizeTripState(tripState.value)
    if (
      state.status !== TRIP_STATUS_TRAVELING ||
      state.phase === MAP_JOURNEY_PHASE.PAUSED ||
      !state.etaAt
    ) {
      return { ok: false, reason: 'no_active_trip' }
    }

    if (!canUseTripArrivalRealPush()) {
      return { ok: false, reason: 'real_push_disabled' }
    }

    if (tripPushSchedulePromise) return tripPushSchedulePromise
    if (!force && state.scheduledPushId) {
      return {
        ok: true,
        reason: 'already_scheduled',
        scheduleId: state.scheduledPushId,
        deliverAt: state.etaAt,
      }
    }

    const scheduleRevision = state.pushScheduleRevision
    const scheduleId =
      state.scheduledPushId || createMapTripScheduleId(state.startedAt, scheduleRevision)
    const notification = {
      ...buildTripArrivalNotification(state),
      pushDisplayMode: systemStore.settings.system.pushDisplayMode || 'minimal',
    }

    tripPushSchedulePromise = (async () => {
      try {
        const result = await schedulePushNotification({
          serverUrl: systemStore.settings.system.pushServerUrl,
          deviceId: systemStore.settings.system.pushDeviceId,
          deliverAt: state.etaAt,
          scheduleId,
          source: source || 'map_trip_arrival',
          category: 'map_trip',
          notification,
        })

        if (!result.ok) {
          getSystemApiReports().addReport({
            level: 'error',
            module: 'push',
            action: 'schedule',
            provider: 'push_relay',
            model: source || 'map_trip_arrival',
            code: result.reason || 'schedule_failed',
            message: result.message || 'Failed to schedule map arrival push.',
            createdAt: Date.now(),
          })
          return result
        }

        const latestState = normalizeTripState(tripState.value)
        if (
          latestState.status === TRIP_STATUS_TRAVELING &&
          latestState.phase !== MAP_JOURNEY_PHASE.PAUSED &&
          latestState.startedAt === state.startedAt &&
          latestState.pushScheduleRevision === scheduleRevision
        ) {
          tripState.value = {
            ...latestState,
            scheduledPushId: result.scheduleId || scheduleId,
          }
        }

        getSystemApiReports().addReport({
          level: 'info',
          module: 'push',
          action: 'schedule',
          provider: 'push_relay',
          model: source || 'map_trip_arrival',
          message: 'Map arrival push scheduled.',
          createdAt: Date.now(),
        })

        return {
          ok: true,
          scheduleId: result.scheduleId || scheduleId,
          deliverAt: result.deliverAt || state.etaAt,
        }
      } finally {
        tripPushSchedulePromise = null
      }
    })()

    return tripPushSchedulePromise
  }

  const cancelTripArrivalPushAfterPending = async ({
    pendingSchedulePromise = null,
    scheduleId = '',
    source = '',
  } = {}) => {
    let nextScheduleId = scheduleId
    if (pendingSchedulePromise) {
      try {
        const scheduleResult = await pendingSchedulePromise
        if (scheduleResult?.ok && scheduleResult.scheduleId) {
          nextScheduleId = scheduleResult.scheduleId
        }
      } catch {
        // A failed schedule has nothing remote to cancel; the fallback ID is still safe to try.
      }
    }
    return cancelTripArrivalPushScheduled({
      scheduleId: nextScheduleId,
      source,
    })
  }

  const resolveAddressLabel = (detailText, fallbackLabel) => {
    const detail = typeof detailText === 'string' ? detailText.trim() : ''
    if (!detail) return fallbackLabel
    const activePlace = findTripEndpointByText(detail)
    if (activePlace) {
      return activePlace.label || activePlace.nameZh || activePlace.nameEn || fallbackLabel
    }
    const exact = addresses.find((item) => item.detail === detail)
    if (exact) return exact.label
    const byLabel = addresses.find((item) => item.label === detail)
    if (byLabel) return byLabel.label
    return fallbackLabel
  }

  const appendTripHistory = (entry) => {
    const normalized = normalizeTripHistoryItem(entry, 0)
    if (!normalized) return
    tripHistory.value = [normalized, ...tripHistory.value].slice(0, TRIP_HISTORY_LIMIT)
  }

  const updateTripHistoryItem = (tripId, patch = {}) => {
    const id = trimLine(tripId, 140)
    if (!id) return false
    const index = tripHistory.value.findIndex((item) => item.id === id)
    if (index < 0) return false
    const next = normalizeTripHistoryItem(
      {
        ...tripHistory.value[index],
        ...patch,
      },
      index,
    )
    if (!next) return false
    tripHistory.value.splice(index, 1, next)
    return true
  }

  const removeTripHistoryItem = (tripId) => {
    const id = trimLine(tripId, 140)
    if (!id) return false
    const before = tripHistory.value.length
    tripHistory.value = tripHistory.value.filter((item) => item.id !== id)
    return tripHistory.value.length !== before
  }

  const bindRelationshipToTrip = (tripId, binding = {}) =>
    updateTripHistoryItem(tripId, {
      relationshipBinding: normalizeRelationshipBinding(binding),
    })

  const neutralizeRelationshipTrip = (
    tripId,
    profile = {},
    replacementName = 'someone',
  ) => {
    const id = trimLine(tripId, 140)
    if (!id) return false
    const trip = tripHistory.value.find((item) => item.id === id)
    if (!trip) return false
    if (!bindingMatchesProfile(trip.relationshipBinding, profile)) return false
    const nextName = trimLine(replacementName, 'someone', 120)
    const nextEventTitleEn =
      anonymizeRelationshipText(trip.eventTitleEn, profile?.name, nextName) ||
      `Trip with ${nextName}`
    const nextEventSummaryEn =
      anonymizeRelationshipText(trip.eventSummaryEn, profile?.name, nextName) ||
      `Shared route with ${nextName}.`
    const nextEventTitleZh =
      anonymizeRelationshipText(trip.eventTitleZh, profile?.name, nextName) ||
      `与${nextName}的行程`
    const nextEventSummaryZh =
      anonymizeRelationshipText(trip.eventSummaryZh, profile?.name, nextName) ||
      `与${nextName}的同行路线。`
    return updateTripHistoryItem(id, {
      eventTitleZh: nextEventTitleZh,
      eventTitleEn: nextEventTitleEn,
      eventSummaryZh: nextEventSummaryZh,
      eventSummaryEn: nextEventSummaryEn,
      relationshipBinding: clearRelationshipBinding(),
    })
  }

  const cleanupRelationshipForProfile = (profile = {}, options = {}) => {
    const mode = trimLine(options.cleanupMode, 'delete_role', 60)
    const replacementName = trimLine(options.replacementName, 'someone', 120)
    const matchedTrips = tripHistory.value.filter((trip) =>
      bindingMatchesProfile(trip.relationshipBinding, profile),
    )

    let removedCount = 0
    let unlinkedCount = 0
    matchedTrips.forEach((trip) => {
      if (mode === 'delete_role') {
        if (removeTripHistoryItem(trip.id)) removedCount += 1
        return
      }
      if (neutralizeRelationshipTrip(trip.id, profile, replacementName)) {
        unlinkedCount += 1
      }
    })

    return {
      ok: removedCount > 0 || unlinkedCount > 0 || matchedTrips.length === 0,
      removedCount,
      unlinkedCount,
      anonymizedCount: unlinkedCount,
      updatedCount: unlinkedCount,
    }
  }

  const setJourneyCheckpointEventEvaluationEnabled = (enabled = true) => {
    journeyCheckpointEventEvaluationEnabled = enabled === true
    return journeyCheckpointEventEvaluationEnabled
  }

  const setJourneyEventRandomValueForTesting = (value) => {
    journeyEventRandomValueOverride = value === undefined ? undefined : Number(value)
  }

  const evaluateReachedJourneyEventCheckpoints = (state, now) => {
    if (
      !journeyCheckpointEventEvaluationEnabled ||
      state.status !== TRIP_STATUS_TRAVELING ||
      state.phase === MAP_JOURNEY_PHASE.PAUSED ||
      state.activeInterruption
    ) {
      return { state, changed: false }
    }

    const evaluatedIds = new Set(state.eventCheckpointIds)
    const candidates = state.checkpoints.filter(
      (checkpoint) =>
        checkpoint?.status === 'completed' &&
        MAP_JOURNEY_EVENT_ELIGIBLE_CHECKPOINT_IDS.includes(checkpoint.id) &&
        !evaluatedIds.has(checkpoint.id),
    )
    if (candidates.length === 0) return { state, changed: false }

    const simulationStore = getSimulationStore()
    const systemStore = getSystemStore()
    const activeWorldPack = systemStore.getActiveWorldPack?.() || {}
    const worldContext = resolveWorldContextFromSystemStore(systemStore)
    let nextState = state

    for (const checkpoint of candidates) {
      evaluatedIds.add(checkpoint.id)
      nextState = {
        ...nextState,
        eventCheckpointIds: [...evaluatedIds],
      }

      let result
      try {
        result = runMapJourneyCheckpointEvent({
          simulationStore,
          snapshot: {
            journeyId: nextState.journeyId,
            journeySchemaVersion: nextState.journeySchemaVersion,
            status: nextState.status,
            phase: nextState.phase,
            checkpointId: checkpoint.id,
            checkpointReachedAt: checkpoint.reachedAt,
            checkpoints: nextState.checkpoints,
            mapPackId: activeMapPackId.value,
            worldPackId: activeWorldPack.id || '',
            fromLabel: nextState.fromLabel || nextState.from,
            toLabel: nextState.toLabel || nextState.to,
            transportMode: nextState.transportMode,
          },
          worldContext,
          randomValue: journeyEventRandomValueOverride,
          now,
        })
      } catch {
        simulationStore.recordEventLog({
          eventId: 'map.journey.route_condition.v1',
          moduleKey: 'map',
          targetId: nextState.journeyId,
          adapterKey: 'map.journey.propose_interruption',
          triggerSource: 'random',
          status: 'failed',
          reason: 'map_journey_adapter_threw',
          at: now,
        })
        continue
      }

      const proposal = result?.ok ? result.adapterResult : null
      if (!proposal?.id) continue
      nextState = {
        ...nextState,
        activeInterruption: {
          proposalId: proposal.id,
          eventId: proposal.eventId,
          journeyId: nextState.journeyId,
          checkpointId: checkpoint.id,
          requestedAt: now,
        },
      }
      return { state: nextState, changed: true }
    }

    return { state: nextState, changed: true }
  }

  const refreshTripState = (nowInput = Date.now()) => {
    runtimeNow.value = Math.max(0, toInt(nowInput, Date.now()))
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_TRAVELING) return false
    if (state.phase === MAP_JOURNEY_PHASE.PAUSED) return false

    const runtime = calculateMapJourneyRuntime(state, runtimeNow.value)
    const advanced = advanceMapJourneyCheckpoints({
      checkpoints: state.checkpoints,
      progress: runtime.progress,
      startedAt: state.startedAt,
      durationSeconds: state.durationSeconds,
      totalPausedSeconds: state.totalPausedSeconds,
      reachedAt: runtimeNow.value,
    })
    if (runtime.remainingSeconds > 0) {
      const checkpointState = {
        ...state,
        phase: advanced.phase,
        checkpoints: advanced.checkpoints,
      }
      const eventEvaluation = evaluateReachedJourneyEventCheckpoints(
        checkpointState,
        runtimeNow.value,
      )
      if (
        !advanced.changed &&
        state.phase === advanced.phase &&
        !eventEvaluation.changed
      ) return false
      tripState.value = eventEvaluation.state
      return true
    }

    const arrivedAt = runtimeNow.value
    const scheduleId =
      state.scheduledPushId ||
      (state.startedAt
        ? createMapTripScheduleId(state.startedAt, state.pushScheduleRevision)
        : '')
    const pendingSchedulePromise = tripPushSchedulePromise
    if (state.activeInterruption?.proposalId) {
      getSimulationStore().dismissMapJourneyEventProposal(state.activeInterruption.proposalId, {
        reason: 'map_journey_arrived_before_review',
        at: arrivedAt,
      })
    }
    tripState.value = {
      ...state,
      status: TRIP_STATUS_ARRIVED,
      phase: MAP_JOURNEY_PHASE.ARRIVED,
      checkpoints: advanced.checkpoints,
      eventCheckpointIds: state.eventCheckpointIds,
      activeInterruption: null,
      eventDelaySeconds: state.eventDelaySeconds,
      arrivedAt,
      pausedAt: 0,
      remainingSecondsAtPause: 0,
      scheduledPushId: '',
    }
    const journeyMapPack = getAvailableMapPackById(state.mapPackId || activeMapPackId.value)
    const journeyPlaces = buildMapPlacesForPack(journeyMapPack)
    const destinationPlace = state.destinationPlaceId
      ? journeyPlaces.find((place) => place.placeId === state.destinationPlaceId) || null
      : null
    setCurrentLocation({
      source: 'trip_arrived',
      label: state.toLabel || resolveAddressLabel(state.to, '目的地'),
      detail: state.to,
      mapPackId: journeyMapPack.id,
      placeId: destinationPlace?.placeId || '',
      position: destinationPlace?.position || null,
      provenance: MAP_EVENT_POSITION_PROVENANCE.JOURNEY_ARRIVAL,
      evidenceAt: arrivedAt,
      journeyId: state.journeyId,
      journeyArrivedAt: arrivedAt,
    }, MAP_JOURNEY_POSITION_EVIDENCE_AUTHORIZATION)
    const reward = buildTripArrivalReward(state)
    const historyId = `trip_hist_${arrivedAt}`
    appendTripHistory({
      id: historyId,
      status: 'arrived',
      journeySchemaVersion: state.journeySchemaVersion,
      journeyId: state.journeyId,
      phase: MAP_JOURNEY_PHASE.ARRIVED,
      checkpoints: advanced.checkpoints,
      eventCheckpointIds: state.eventCheckpointIds,
      eventDelaySeconds: state.eventDelaySeconds,
      totalPausedSeconds: state.totalPausedSeconds,
      worldPackId: state.worldPackId,
      mapPackId: state.mapPackId,
      from: state.from,
      to: state.to,
      fromLabel: state.fromLabel,
      toLabel: state.toLabel,
      destinationPlaceId: state.destinationPlaceId,
      transportMode: state.transportMode,
      estimateVersion: state.estimateVersion,
      distanceKm: state.distanceKm,
      fare: state.fare,
      durationSeconds: state.durationSeconds,
      startedAt: state.startedAt,
      endedAt: arrivedAt,
      ...reward,
    })
    recordMapPlaceDiscoveriesForArrival({
      trip: state,
      destinationPlace,
      sourceTripId: historyId,
      discoveredAt: arrivedAt,
    })
    clearTripArrivalTimer()
    if (scheduleId) {
      void cancelTripArrivalPushAfterPending({
        pendingSchedulePromise,
        scheduleId,
        source: 'map_trip_arrived',
      })
    }
    return true
  }

  const scheduleTripArrivalCheck = () => {
    clearTripArrivalTimer()
    const state = normalizeTripState(tripState.value)
    if (
      state.status !== TRIP_STATUS_TRAVELING ||
      state.phase === MAP_JOURNEY_PHASE.PAUSED ||
      !state.etaAt
    ) return
    const delayMs = Math.max(250, state.etaAt - Date.now())
    tripArrivalTimer = setTimeout(() => {
      refreshTripState(Date.now())
      scheduleTripArrivalCheck()
    }, delayMs)
  }

  const tickTripRuntime = (nowInput = Date.now()) => {
    runtimeNow.value = Math.max(0, toInt(nowInput, Date.now()))
    refreshTripState(runtimeNow.value)
  }

  const buildMapVisualRefreshFingerprint = (baseAt = Date.now()) => {
    const settings = normalizeMapVisualSettings(mapVisualSettings.value)
    const minuteSlot = Math.floor(baseAt / 60_000)
    return [
      'map_visual',
      settings.mode,
      settings.assetId || 'none',
      minuteSlot,
    ].join(':')
  }

  const executeMapProviderVisualRefresh = async ({ now = Date.now(), task } = {}) => {
    const systemStore = getSystemStore()
    const settings = normalizeMapVisualSettings(mapVisualSettings.value)
    if (!settings.providerVisualEnabled) {
      return {
        ok: false,
        mode: MAP_PROVIDER_VISUAL_MODE_DISABLED,
        summary: '',
        imageUrl: '',
        errorCode: '',
      }
    }

    const apiKey = typeof systemStore.settings?.api?.key === 'string'
      ? systemStore.settings.api.key.trim()
      : ''
    if (!apiKey) {
      return {
        ok: false,
        mode: MAP_PROVIDER_VISUAL_MODE_SKIPPED_NO_KEY,
        summary: 'Provider visual refresh skipped: missing API key.',
        imageUrl: '',
        errorCode: 'NO_API_KEY',
      }
    }

    const runner = typeof mapProviderRunnerOverride === 'function'
      ? mapProviderRunnerOverride
      : async (context) => {
          const rawPayload = await callAI({
            settings: systemStore.settings,
            systemPrompt:
              'You generate compact map visual guidance for a mobile app. Output strict JSON only.',
            messages: [
              {
                role: 'user',
                content: context.prompt,
              },
            ],
            withMeta: true,
          })
          const text = typeof rawPayload?.text === 'string'
            ? rawPayload.text
            : extractAssistantPayloadText(rawPayload)
          return {
            text,
            meta: rawPayload?.meta || {},
          }
        }

    if (typeof runner !== 'function') {
      return {
        ok: false,
        mode: MAP_PROVIDER_VISUAL_MODE_SKIPPED_NO_RUNNER,
        summary: '',
        imageUrl: '',
        errorCode: 'NO_RUNNER',
      }
    }

    try {
      const prompt = buildMapProviderVisualPrompt({
        settings,
        locationText: currentLocationText.value,
        tripSnapshot: normalizeTripState(tripState.value),
      })
      const generated = await runner({
        now,
        task,
        settings,
        prompt,
        currentLocation: { ...currentLocation.value },
        tripState: normalizeTripState(tripState.value),
      })
      const text = typeof generated?.text === 'string'
        ? generated.text
        : extractAssistantPayloadText(generated)
      const normalized = normalizeMapProviderVisualResult(text)
      const appliedMode = normalized.imageUrl
        ? MAP_PROVIDER_VISUAL_MODE_IMAGE_URL
        : MAP_PROVIDER_VISUAL_MODE_TEXT
      return {
        ok: true,
        mode: appliedMode,
        summary: normalized.visualNote,
        imageUrl: normalized.imageUrl,
        errorCode: '',
      }
    } catch (error) {
      return {
        ok: false,
        mode: MAP_PROVIDER_VISUAL_MODE_FAILED,
        summary: formatApiErrorForUi(error, 'Map visual refresh failed.'),
        imageUrl: '',
        errorCode: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
      }
    }
  }

  const executeMapVisualAutomationTask = async (task, context = {}) => {
    const systemStore = getSystemStore()
    const now = Number.isFinite(Number(context?.now)) ? Number(context.now) : Date.now()
    const settings = normalizeMapVisualSettings(mapVisualSettings.value)
    const assetAvailable = Boolean(settings.assetId)
    const providerResult = await executeMapProviderVisualRefresh({ now, task })
    mapAutomationRuntime.value = {
      ...mapAutomationRuntime.value,
      lastExecuteAt: now,
      lastResult: 'executed',
      lastReason: '',
      lastTaskId: typeof task?.id === 'string' ? task.id : '',
      lastProviderAttemptAt: now,
      lastProviderSuccessAt: providerResult.ok ? now : mapAutomationRuntime.value.lastProviderSuccessAt,
      lastProviderMode: providerResult.mode,
      lastProviderErrorCode: providerResult.errorCode || '',
      lastProviderMessage: providerResult.ok ? '' : providerResult.summary,
      lastProviderSummary: providerResult.summary,
      lastProviderImageUrl: providerResult.imageUrl || '',
    }

    if (systemStore.isLocked) {
      const providerHint =
        providerResult.mode === MAP_PROVIDER_VISUAL_MODE_IMAGE_URL
          ? ' Provider image applied.'
          : providerResult.mode === MAP_PROVIDER_VISUAL_MODE_TEXT
            ? ' Provider style note updated.'
            : ''
      getSystemNotifications().addNotification({
        title: 'Map',
        content:
          settings.mode === MAP_VISUAL_MODE_GALLERY && assetAvailable
            ? 'Map visual refresh completed (gallery mode).'
            : `Map visual refresh completed (default mode).${providerHint}`,
        icon: 'fas fa-map-location-dot',
        route: '/map',
        source: 'map_ai_visual_refresh_done',
        createdAt: now,
      })
    }

    return {
      ok: true,
      kind: 'visual',
      mode: settings.mode,
      assetId: settings.assetId,
      providerMode: providerResult.mode,
      providerApplied: providerResult.ok,
    }
  }

  const executeMapBackgroundAutomationTask = async (task, context = {}) => {
    const systemStore = getSystemStore()
    const now = Number.isFinite(Number(context?.now)) ? Number(context.now) : Date.now()
    const useChinese = useChineseSystemCopy()
    const locationText =
      typeof task?.payload?.locationText === 'string' && task.payload.locationText.trim()
        ? task.payload.locationText.trim()
        : currentLocationText.value || ''
    const minutes = Number(task?.payload?.minutes)
    const distanceKm = Number(task?.payload?.distanceKm)
    const summary = [
      locationText || (useChinese ? '定位状态已同步。' : 'Location status synced.'),
      Number.isFinite(distanceKm) && distanceKm > 0
        ? `${useChinese ? '预计距离' : 'Distance'}: ${distanceKm}km`
        : '',
      Number.isFinite(minutes) && minutes > 0
        ? `${useChinese ? '预计时长' : 'ETA'}: ${minutes}${useChinese ? '分钟' : 'min'}`
        : '',
    ]
      .filter(Boolean)
      .join(' | ')

    if (systemStore.isLocked) {
      getSystemNotifications().addNotification({
        title: useChinese ? '地图后台更新' : 'Map background update',
        content: summary || (useChinese ? '地图状态已更新。' : 'Map status updated.'),
        icon: 'fas fa-map-location-dot',
        route: '/map',
        source: 'map_auto_update',
        createdAt: now,
      })
    }

    getSystemApiReports().addReport({
      level: 'info',
      module: 'map',
      action: 'auto_background_update',
      message: summary || (useChinese ? '地图后台状态已更新。' : 'Map background status updated.'),
      createdAt: now,
    })

    return {
      ok: true,
      kind: 'background',
      summary,
    }
  }

  const mapAutomationTaskHandler = async (task, context = {}) => {
    const taskKind = resolveMapAutomationTaskKind(task)
    if (taskKind === 'visual') {
      return executeMapVisualAutomationTask(task, context)
    }
    return executeMapBackgroundAutomationTask(task, context)
  }

  const drainMapAutomationQueue = async (maxRounds = 2) => {
    const systemStore = getSystemStore()
    const rounds = Math.max(1, toInt(maxRounds, 2))
    for (let i = 0; i < rounds; i += 1) {
      const result = await systemStore.runAiAutomationQueueTick(Date.now())
      if (!result?.handled && !result?.queueAdvanced) break
    }
  }

  const requestMapAiVisualRefresh = async (options = {}) => {
    ensureMapAutomationHandlerRegistered()
    const systemStore = getSystemStore()
    const now = Date.now()
    const source = typeof options?.source === 'string' ? options.source.trim() : 'map_manual'
    const policy = mapAiVisualAutomationPolicy.value
    mapAutomationRuntime.value = {
      ...mapAutomationRuntime.value,
      lastRequestAt: now,
    }

    if (!policy.toggleEnabled) {
      mapAutomationRuntime.value = {
        ...mapAutomationRuntime.value,
        lastResult: 'blocked',
        lastReason: 'map_ai_visual_disabled',
      }
      return { ok: false, reason: 'map_ai_visual_disabled', policy }
    }

    if (!policy.masterEnabled) {
      mapAutomationRuntime.value = {
        ...mapAutomationRuntime.value,
        lastResult: 'blocked',
        lastReason: 'master_disabled',
      }
      return { ok: false, reason: 'master_disabled', policy }
    }

    if (!policy.moduleEnabled) {
      mapAutomationRuntime.value = {
        ...mapAutomationRuntime.value,
        lastResult: 'blocked',
        lastReason: 'module_disabled',
      }
      return { ok: false, reason: 'module_disabled', policy }
    }

    if (policy.notifyOnly) {
      mapAutomationRuntime.value = {
        ...mapAutomationRuntime.value,
        lastNotifyOnlyAt: now,
        lastResult: 'notify_only',
        lastReason: policy.quietHoursActive ? 'quiet_hours_notify_only' : 'notify_only_mode',
      }
      if (systemStore.isLocked) {
        getSystemNotifications().addNotification({
          title: 'Map',
          content: policy.quietHoursActive
            ? 'Quiet-hours notify-only: skipped AI visual refresh.'
            : 'Notify-only mode: skipped AI visual refresh.',
          icon: 'fas fa-bell',
          route: '/map',
          source: 'map_ai_visual_notify_only',
          createdAt: now,
        })
      }
      return { ok: false, reason: mapAutomationRuntime.value.lastReason, policy, notifyOnly: true }
    }

    const settings = normalizeMapVisualSettings(mapVisualSettings.value)
    const enqueueResult = systemStore.enqueueAiAutomationTask(
      {
        moduleKey: MAP_AUTOMATION_MODULE_KEY,
        targetId: 'map_visual',
        source,
        reason: 'map_visual_refresh',
        dueAt: now,
        fingerprint: buildMapVisualRefreshFingerprint(now),
        payload: {
          mode: settings.mode,
          assetId: settings.assetId,
        },
      },
      {
        baseAt: now,
      },
    )

    if (!enqueueResult?.accepted) {
      mapAutomationRuntime.value = {
        ...mapAutomationRuntime.value,
        lastResult: 'enqueue_rejected',
        lastReason: typeof enqueueResult?.reason === 'string' ? enqueueResult.reason : 'enqueue_failed',
      }
      return {
        ok: false,
        reason: mapAutomationRuntime.value.lastReason,
        policy,
      }
    }

    mapAutomationRuntime.value = {
      ...mapAutomationRuntime.value,
      lastTaskId: enqueueResult.taskId || '',
      lastResult: 'queued',
      lastReason: '',
    }

    await drainMapAutomationQueue(2)
    const runtimeResult = mapAutomationRuntime.value.lastResult || 'queued'
    return {
      ok: runtimeResult === 'executed' || runtimeResult === 'queued',
      reason: mapAutomationRuntime.value.lastReason || '',
      taskId: enqueueResult.taskId || '',
      policy,
      runtimeResult,
    }
  }

  const setMapVisualMode = (nextMode) => {
    const normalizedMode =
      nextMode === MAP_VISUAL_MODE_GALLERY
        ? MAP_VISUAL_MODE_GALLERY
        : MAP_VISUAL_MODE_DEFAULT
    mapVisualSettings.value = {
      ...mapVisualSettings.value,
      mode: normalizedMode,
    }
    return normalizedMode
  }

  const setMapVisualAssetId = (assetId = '') => {
    mapVisualSettings.value = {
      ...mapVisualSettings.value,
      assetId: typeof assetId === 'string' ? assetId.trim() : '',
    }
    return mapVisualSettings.value.assetId
  }

  const setMapAiVisualEnabled = (enabled) => {
    mapVisualSettings.value = {
      ...mapVisualSettings.value,
      aiVisualEnabled: enabled === true,
    }
    if (mapVisualSettings.value.aiVisualEnabled !== true) {
      mapAutomationRuntime.value = {
        ...mapAutomationRuntime.value,
        lastResult: '',
        lastReason: '',
      }
    }
    return mapVisualSettings.value.aiVisualEnabled
  }

  const setMapProviderVisualEnabled = (enabled) => {
    mapVisualSettings.value = {
      ...mapVisualSettings.value,
      providerVisualEnabled: enabled === true,
    }
    if (!mapVisualSettings.value.providerVisualEnabled) {
      mapAutomationRuntime.value = {
        ...mapAutomationRuntime.value,
        lastProviderMode: MAP_PROVIDER_VISUAL_MODE_DISABLED,
        lastProviderSummary: '',
        lastProviderImageUrl: '',
        lastProviderMessage: '',
        lastProviderErrorCode: '',
      }
    }
    return mapVisualSettings.value.providerVisualEnabled
  }

  const dismissMapVisualOnboardingPrompt = () => {
    if (mapVisualSettings.value.onboardingPromptPending === false) return false
    mapVisualSettings.value = {
      ...mapVisualSettings.value,
      onboardingPromptPending: false,
    }
    return true
  }

  const resolveMapVisualMode = ({ assetAvailable = false } = {}) => {
    const settings = normalizeMapVisualSettings(mapVisualSettings.value)
    if (settings.mode === MAP_VISUAL_MODE_GALLERY && assetAvailable) {
      return MAP_VISUAL_MODE_GALLERY
    }
    return MAP_VISUAL_MODE_DEFAULT
  }

  const enforceMapVisualFallback = ({ assetAvailable = false } = {}) => {
    const settings = normalizeMapVisualSettings(mapVisualSettings.value)
    if (settings.mode !== MAP_VISUAL_MODE_GALLERY) return false
    if (assetAvailable) return false
    mapVisualSettings.value = {
      ...settings,
      mode: MAP_VISUAL_MODE_DEFAULT,
      assetId: '',
    }
    return true
  }

  const resolveMapPackIdForWorld = (worldPack = {}) => {
    const worldPackId =
      typeof worldPack === 'string'
        ? worldPack.trim()
        : typeof worldPack?.id === 'string'
          ? worldPack.id.trim()
          : 'default_world'
    const boundMapPackId = worldMapPackBindings.value[worldPackId]
    if (boundMapPackId && mapPacks.value.some((pack) => pack.id === boundMapPackId)) {
      return boundMapPackId
    }
    return getRecommendedMapPackIdForWorldPack(worldPackId)
  }

  const createCustomMapPack = (input = {}) => {
    const id =
      typeof input.id === 'string' && input.id.trim()
        ? input.id.trim()
        : `custom-map-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    if (mapPacks.value.some((pack) => pack.id === id)) return null
    const pack = normalizeCustomMapPack({ ...input, id }, customMapPacks.value.length)
    if (!pack) return null
    customMapPacks.value = normalizeCustomMapPacks([...customMapPacks.value, pack])
    return customMapPacks.value.find((item) => item.id === pack.id) || null
  }

  const removeCustomMapPack = (packId) => {
    const id = typeof packId === 'string' ? packId.trim() : ''
    if (!id || !customMapPacks.value.some((pack) => pack.id === id)) return false
    const isReferenced =
      activeMapPackId.value === id ||
      addresses.some((address) => address.mapPackId === id) ||
      Object.values(worldMapPackBindings.value).includes(id)
    if (isReferenced) return false
    customMapPacks.value = customMapPacks.value.filter((pack) => pack.id !== id)
    return true
  }

  const setActiveMapPack = (packId) => {
    const requestedId = typeof packId === 'string' ? packId.trim() : ''
    const pack = mapPacks.value.find((item) => item.id === requestedId)
    if (!pack || normalizeTripState(tripState.value).status === TRIP_STATUS_TRAVELING) {
      return false
    }
    if (pack.id === activeMapPackId.value) return true

    activeMapPackId.value = pack.id
    const savedAddress = addresses.find((address) => address.mapPackId === pack.id)
    const firstPlace = savedAddress || pack.places?.[0]
    const secondPlace = pack.places?.[1] || firstPlace
    if (firstPlace) {
      setCurrentLocation({
        label: firstPlace.label || firstPlace.nameZh || firstPlace.nameEn,
        detail: firstPlace.detail || firstPlace.detailZh || firstPlace.detailEn,
        source: savedAddress ? 'saved' : 'map_pack',
        mapPackId: pack.id,
        placeId: savedAddress ? `address:${savedAddress.id}` : firstPlace.id,
        position: firstPlace.position,
      })
      tripForm.from = firstPlace.detail || firstPlace.detailZh || firstPlace.detailEn || ''
    }
    tripForm.to = secondPlace?.detail || secondPlace?.detailZh || secondPlace?.detailEn || ''
    return true
  }

  const bindMapPackToWorld = (worldPack, mapPackId) => {
    const worldPackId =
      typeof worldPack === 'string'
        ? worldPack.trim()
        : typeof worldPack?.id === 'string'
          ? worldPack.id.trim()
          : ''
    const pack = mapPacks.value.find((item) => item.id === mapPackId)
    if (!worldPackId || !pack || normalizeTripState(tripState.value).status === TRIP_STATUS_TRAVELING) {
      return false
    }
    if (!setActiveMapPack(pack.id)) return false
    worldMapPackBindings.value = {
      ...worldMapPackBindings.value,
      [worldPackId]: pack.id,
    }
    return true
  }

  const resetWorldMapPackBinding = (worldPack = {}) => {
    const worldPackId =
      typeof worldPack === 'string'
        ? worldPack.trim()
        : typeof worldPack?.id === 'string'
          ? worldPack.id.trim()
          : 'default_world'
    const recommendedId = getRecommendedMapPackIdForWorldPack(worldPack)
    if (!setActiveMapPack(recommendedId)) return false
    const next = { ...worldMapPackBindings.value }
    delete next[worldPackId]
    worldMapPackBindings.value = next
    return true
  }

  const syncMapPackForWorld = (worldPack = {}) => {
    const mapPackId = resolveMapPackIdForWorld(worldPack)
    if (mapPackId === activeMapPackId.value) return true
    return setActiveMapPack(mapPackId)
  }

  const setCurrentLocation = ({
    label,
    detail,
    source = 'manual',
    mapPackId = activeMapPackId.value,
    placeId = '',
    position = null,
    provenance = MAP_EVENT_POSITION_PROVENANCE.MANUAL,
    evidenceAt = Date.now(),
    journeyId = '',
    journeyArrivedAt = 0,
    syncTripOrigin = false,
  }, evidenceAuthorization = null) => {
    if (!detail?.trim()) return false
    const pack = getAvailableMapPackById(mapPackId)
    if (placeSession.value.state === MAP_PLACE_SESSION_STATE.INSIDE) {
      const left = leaveMapPlaceSession(placeSession.value, { now: evidenceAt })
      if (left.ok) placeSession.value = left.session
    }
    const normalizedPlaceId =
      typeof placeId === 'string' ? placeId.trim().toLowerCase().slice(0, 180) : ''
    const canWriteJourneyArrival =
      evidenceAuthorization === MAP_JOURNEY_POSITION_EVIDENCE_AUTHORIZATION &&
      provenance === MAP_EVENT_POSITION_PROVENANCE.JOURNEY_ARRIVAL
    currentLocation.value = {
      source,
      label: label?.trim() || '当前位置',
      detail: detail.trim(),
      mapPackId: pack.id,
      placeId: normalizedPlaceId,
      position: normalizeMapPosition(position, pack.coordinateKind),
      positionEvidence: createMapPositionEvidence({
        provenance: canWriteJourneyArrival
          ? MAP_EVENT_POSITION_PROVENANCE.JOURNEY_ARRIVAL
          : MAP_EVENT_POSITION_PROVENANCE.MANUAL,
        placeId: normalizedPlaceId,
        evidenceAt,
        journeyId: canWriteJourneyArrival ? journeyId : '',
        journeyArrivedAt: canWriteJourneyArrival ? journeyArrivedAt : 0,
      }),
    }
    if (syncTripOrigin && normalizeTripState(tripState.value).status === TRIP_STATUS_IDLE) {
      tripForm.from = currentLocation.value.detail
    }
    return true
  }

  const setCurrentLocationByAddressId = (addressId) => {
    const match = addresses.find((item) => item.id === Number(addressId))
    if (!match) return
    setCurrentLocation({
      label: match.label,
      detail: match.detail,
      source: 'saved',
      mapPackId: match.mapPackId,
      placeId: `address:${match.id}`,
      position: match.position,
      syncTripOrigin: true,
    })
  }

  const findMapPlaceById = (placeId, mapPackId = activeMapPackId.value) => {
    const normalizedPlaceId =
      typeof placeId === 'string' ? placeId.trim().toLowerCase().slice(0, 180) : ''
    if (!normalizedPlaceId) return null
    const mapPack = getAvailableMapPackById(mapPackId)
    if (mapPack.id !== mapPackId) return null
    return buildMapPlacesForPack(mapPack).find((place) => place.placeId === normalizedPlaceId) || null
  }

  const enterPlace = (placeId, { now = Date.now() } = {}) => {
    const place = findMapPlaceById(placeId)
    if (!place) return { ok: false, code: 'PLACE_SESSION_PLACE_MISSING' }
    const trip = normalizeTripState(tripState.value)
    if (trip.status === TRIP_STATUS_TRAVELING) {
      return { ok: false, code: 'PLACE_SESSION_JOURNEY_ACTIVE' }
    }
    if (
      trip.status === TRIP_STATUS_ARRIVED &&
      trip.destinationPlaceId &&
      trip.destinationPlaceId !== place.placeId
    ) {
      return { ok: false, code: 'PLACE_SESSION_ARRIVAL_PLACE_MISMATCH' }
    }
    const result = enterMapPlaceSession({
      previousSession: placeSession.value,
      currentLocation: currentLocation.value,
      place,
      worldPackId: activeWorldPackId.value,
      mapPackVersion: activeMapPack.value.version || 1,
      now,
    })
    if (result.ok) placeSession.value = result.session
    return result
  }

  const leavePlace = ({ now = Date.now() } = {}) => {
    const result = leaveMapPlaceSession(placeSession.value, { now })
    if (result.ok) placeSession.value = result.session
    return result
  }

  const getPlaceSessionEventInvitation = ({ locale = 'zh-CN', at = Date.now() } = {}) => {
    const checkpoint = placeSession.value
    const place = findMapPlaceById(checkpoint.placeId, checkpoint.mapPackId)
    if (!place) return { eligible: false, reason: 'place_missing', invitation: null, checkpoint: null }
    const simulationStore = getSimulationStore()
    const existingInstance = simulationStore.eventInstances.find(
      (instance) =>
        instance.templateRef?.id === KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID &&
        instance.world?.variantPackId === KPOP_REALISM_EVENT_PACK_ID &&
        instance.source?.recordId === checkpoint.sessionId &&
        instance.source?.recordRevision === checkpoint.revision &&
        instance.lifecycle !== EVENT_INSTANCE_LIFECYCLE.DISMISSED,
    )
    if (existingInstance) {
      const copy = existingInstance.text.normalizedCopy
      return {
        eligible: true,
        reason: 'existing_event_instance',
        checkpoint,
        existingInstanceId: existingInstance.id,
        invitation: {
          schemaVersion: 1,
          id: `map_event_invitation_${checkpoint.sessionId}_${checkpoint.revision}`.slice(0, 220),
          eventId: KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
          proposalId: existingInstance.runtime.proposalId || existingInstance.id,
          sourceRecordId: checkpoint.sessionId,
          sourceRecordRevision: checkpoint.revision,
          mapPackId: checkpoint.mapPackId,
          placeId: checkpoint.placeId,
          tokenCost: 0,
          lifecycle: existingInstance.lifecycle,
          copy: {
            title: copy.title,
            summary: copy.opening,
            titleZh: copy.title,
            titleEn: copy.title,
            summaryZh: copy.opening,
            summaryEn: copy.opening,
          },
        },
      }
    }
    const template = getMapPlaceSessionEventTemplate()
    const worldContext = resolveWorldContextFromSystemStore(getSystemStore(), { locale })
    const dayKey = new Date(Math.max(0, Number(at) || Date.now())).toISOString().slice(0, 10)
    return evaluateMapPlaceSessionEventInvitation({
      session: checkpoint,
      currentLocation: currentLocation.value,
      place,
      locale,
      worldContextFamily: worldContext.genreTags[0] || 'daily',
      moduleEnabled: simulationStore.isModuleEventsEnabled('map'),
      intensity: simulationStore.surpriseMode,
      cooldownActive: simulationStore.isCoolingDown(template.id, {
        targetId: checkpoint.placeId,
        at,
      }),
      dailyLimitReached: !simulationStore.canUseDailyQuota(template.id, {
        targetId: checkpoint.placeId,
        dayKey,
        limit: template.trigger.dailyLimit,
      }),
    })
  }

  const expandPlaceSessionEvent = ({ locale = 'zh-CN', now = Date.now() } = {}) => {
    const invitationResult = getPlaceSessionEventInvitation({ locale, at: now })
    if (!invitationResult.eligible || !invitationResult.invitation || !invitationResult.checkpoint) {
      return { ok: false, code: invitationResult.reason || 'EVENT_INVITATION_UNAVAILABLE' }
    }
    const simulationStore = getSimulationStore()
    if (invitationResult.existingInstanceId) {
      const existing = simulationStore.getEventInstance(invitationResult.existingInstanceId)
      return { ok: Boolean(existing), code: existing ? 'EVENT_INSTANCE_REOPENED' : 'EVENT_INSTANCE_MISSING', instance: existing, composePromise: null }
    }

    const checkpoint = invitationResult.checkpoint
    const place = findMapPlaceById(checkpoint.placeId, checkpoint.mapPackId)
    const systemStore = getSystemStore()
    const worldContext = resolveWorldContextFromSystemStore(systemStore, { locale })
    const textContext = {
      worldContextDigest: [
        worldContext.genreTags.join(', '),
        worldContext.toneTags.join(', '),
        worldContext.socialOrder,
      ].filter(Boolean).join(' | '),
      participants: [],
      facts: [
        `Place: ${place?.nameEn || place?.nameZh || place?.label || checkpoint.placeId}`,
        `Position provenance: ${checkpoint.presence.provenance}`,
      ],
    }
    const contextHash = createEventContextHash(textContext)
    const materialized = materializeLocalEventInstanceV1({
      templateId: KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
      variantPackId: KPOP_REALISM_EVENT_PACK_ID,
      source: {
        moduleKey: 'map',
        recordType: MAP_PLACE_SESSION_RECORD_TYPE,
        recordId: checkpoint.sessionId,
        recordRevision: checkpoint.revision,
        checkpointId: MAP_PLACE_SESSION_CHECKPOINT_ID,
        checkpointAt: checkpoint.enteredAt,
      },
      world: {
        worldContextId: worldContext.id,
        worldPackId: checkpoint.worldPackId,
        mapPackId: checkpoint.mapPackId,
        mapPackVersion: checkpoint.mapPackVersion,
      },
      place: {
        placeId: checkpoint.placeId,
        placeCategoryId: checkpoint.placeCategoryId,
        capabilityIds: checkpoint.capabilityIds,
        anchor: {
          kind: 'stable_place',
          mapPackId: checkpoint.mapPackId,
          placeId: checkpoint.placeId,
        },
      },
      presence: {
        activationScope: 'interior',
        relation: checkpoint.presence.relation,
        provenance: checkpoint.presence.provenance,
        placeSessionId: checkpoint.sessionId,
        placeSessionRevision: checkpoint.revision,
        journeyId: checkpoint.presence.journeyId,
        evidenceAt: checkpoint.presence.evidenceAt,
      },
      runtime: { proposalId: invitationResult.invitation.proposalId },
      locale,
      textMode: simulationStore.eventTextMode,
      textContext,
      contextHash,
      seed: `${checkpoint.sessionId}:${checkpoint.revision}:${checkpoint.placeId}`,
      now,
    })
    if (!materialized.ok) {
      return { ok: false, code: materialized.reason || 'EVENT_INSTANCE_MATERIALIZATION_FAILED' }
    }
    const template = getMapPlaceSessionEventTemplate()
    const eligibilityLog = simulationStore.recordEventTrigger({
      eventId: template.id,
      moduleKey: 'map',
      targetId: checkpoint.placeId,
      adapterKey: getMapPlaceSessionEventAdapterKey(),
      triggerSource: 'condition',
      status: 'triggered',
      reason: 'place_session_event_eligible',
      cooldownMs: template.trigger.cooldownMs,
      dailyLimit: template.trigger.dailyLimit,
      at: now,
    })
    const instance = normalizeEventInstanceV1({
      ...materialized.instance,
      runtime: {
        ...materialized.instance.runtime,
        eligibilityLogId: eligibilityLog?.id || '',
      },
    })
    const stored = simulationStore.upsertEventInstance(instance)
    if (!stored) return { ok: false, code: 'EVENT_INSTANCE_STORE_REJECTED' }

    let composePromise = null
    if (stored.text.status === 'pending' && simulationStore.eventTextMode === EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY) {
      const providerAdapter =
        typeof mapEventTextProviderRunnerOverride === 'function'
          ? mapEventTextProviderRunnerOverride
          : ({ messages, systemPrompt, signal }) =>
              callAI({
                messages,
                systemPrompt,
                signal,
                settings: systemStore.settings,
                withMeta: true,
              })
      composePromise = composeEventTextV1({
        instance: stored,
        template,
        textMode: simulationStore.eventTextMode,
        context: textContext,
        contextHash,
        providerAdapter,
        providerMetadata: {
          providerId: systemStore.settings?.api?.resolvedKind || '',
          modelId: systemStore.settings?.api?.model || '',
        },
        instanceStore: simulationStore,
        now,
      })
    }
    return { ok: true, code: 'EVENT_INSTANCE_ENTERED', instance: stored, composePromise }
  }

  const resolvePlaceSessionEventChoice = (
    instanceId,
    choiceId,
    { now = Date.now() } = {},
  ) => {
    const simulationStore = getSimulationStore()
    const instance = simulationStore.getEventInstance(instanceId)
    const checked = resolveMapPlaceSessionEventInstance({
      instance,
      session: placeSession.value,
      choiceId,
      now,
    })
    if (!checked.ok) return checked
    const outcomeLog = simulationStore.recordEventLog({
      eventId: KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
      moduleKey: 'map',
      targetId: placeSession.value.placeId,
      adapterKey: getMapPlaceSessionEventAdapterKey(),
      triggerSource: 'manual',
      status: 'triggered',
      reason: `place_session_event_${checked.outcomeId}`,
      at: now,
    })
    const resolved = resolveMapPlaceSessionEventInstance({
      instance,
      session: placeSession.value,
      choiceId,
      outcomeLogId: outcomeLog?.id || '',
      now,
    })
    const stored = resolved.instance && simulationStore.upsertEventInstance(resolved.instance)
    return stored ? { ...resolved, instance: stored } : { ok: false, code: 'EVENT_INSTANCE_STORE_REJECTED' }
  }

  const dismissPlaceSessionEvent = (instanceId, { now = Date.now() } = {}) => {
    const simulationStore = getSimulationStore()
    const instance = simulationStore.getEventInstance(instanceId)
    const dismissed = dismissMapPlaceSessionEventInstance(instance, { now })
    if (!dismissed) return { ok: false, code: 'EVENT_INSTANCE_NOT_ACTIVE' }
    const stored = simulationStore.upsertEventInstance(dismissed)
    if (!stored) return { ok: false, code: 'EVENT_INSTANCE_STORE_REJECTED' }
    simulationStore.recordEventLog({
      eventId: KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
      moduleKey: 'map',
      targetId: dismissed.place.placeId,
      adapterKey: getMapPlaceSessionEventAdapterKey(),
      triggerSource: 'manual',
      status: 'skipped',
      reason: 'place_session_event_dismissed',
      at: now,
    })
    return { ok: true, code: 'EVENT_INSTANCE_DISMISSED', instance: stored }
  }

  const setMapEventTextProviderRunnerForTesting = (runner) => {
    mapEventTextProviderRunnerOverride = typeof runner === 'function' ? runner : null
  }

  const setTripEndpoint = (endpoint, detail) => {
    if (endpoint !== 'from' && endpoint !== 'to') return
    tripForm[endpoint] = typeof detail === 'string' ? detail.trim() : ''
  }

  const setTripTransportMode = (transportMode) => {
    refreshTripState(Date.now())
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_IDLE) {
      return {
        ok: false,
        code: 'TRIP_TRANSPORT_LOCKED',
        transportMode: state.transportMode,
      }
    }
    if (!isMapTransportMode(transportMode)) {
      return { ok: false, code: 'TRIP_TRANSPORT_INVALID', transportMode: '' }
    }
    tripForm.transportMode = normalizeMapTransportMode(transportMode)
    return { ok: true, transportMode: tripForm.transportMode }
  }

  const applyAddressToTripEndpoint = (addressId, endpoint) => {
    if (endpoint !== 'from' && endpoint !== 'to') return false
    const match = addresses.find((item) => item.id === Number(addressId))
    if (!match) return false
    setTripEndpoint(endpoint, match.detail)
    return true
  }

  const addAddress = ({
    label,
    detail,
    category = 'home',
    mapPackId = activeMapPackId.value,
    position = null,
  }) => {
    if (!label?.trim() || !detail?.trim()) return false
    const pack = getAvailableMapPackById(mapPackId)
    addresses.push({
      id: Date.now(),
      label: label.trim(),
      detail: detail.trim(),
      category: normalizeAddressCategory(category),
      mapPackId: pack.id,
      position: normalizeMapPosition(position, pack.coordinateKind),
    })
    return true
  }

  const updateAddress = (addressId, updates = {}) => {
    const match = addresses.find((item) => item.id === Number(addressId))
    if (!match || !updates || typeof updates !== 'object') return false

    const pack = getAvailableMapPackById(updates.mapPackId || match.mapPackId)
    const label = typeof updates.label === 'string' ? updates.label.trim() : match.label
    const detail = typeof updates.detail === 'string' ? updates.detail.trim() : match.detail
    if (!label || !detail) return false

    const previousDetail = match.detail
    const nextPosition = Object.hasOwn(updates, 'position')
      ? normalizeMapPosition(updates.position, pack.coordinateKind)
      : normalizeMapPosition(match.position, pack.coordinateKind)

    Object.assign(match, {
      label,
      detail,
      category: normalizeAddressCategory(updates.category ?? match.category),
      mapPackId: pack.id,
      position: nextPosition,
    })

    if (currentLocation.value.source === 'saved' && currentLocation.value.detail === previousDetail) {
      setCurrentLocation({
        label,
        detail,
        source: 'saved',
        mapPackId: pack.id,
        placeId: `address:${match.id}`,
        position: nextPosition,
      })
    }
    return true
  }

  const removeAddress = (addressId) => {
    const index = addresses.findIndex((item) => item.id === Number(addressId))
    if (index < 0) return
    addresses.splice(index, 1)
  }

  const buildFoodDeliveryMapHandoff = ({ restaurant = {}, categoryKey = '' } = {}) => {
    const current = normalizeCurrentLocation(currentLocation.value, mapPacks.value)
    const restaurantContext = normalizeFoodDeliveryRestaurantContext(restaurant)
    const normalizedCategory = trimLine(categoryKey, 40)
    const pickupPoint = restaurantContext.address || restaurantContext.name
    const dropoffPoint = current.detail || ''
    const estimate = pickupPoint && dropoffPoint
      ? estimateMapJourney({
          fromText: pickupPoint,
          toText: dropoffPoint,
          transportMode: LEGACY_MAP_TRANSPORT_MODE,
        })
      : { distanceKm: 0, minutes: 0, fare: 0 }
    const distanceKm = Number.isFinite(restaurantContext.distanceKm) && restaurantContext.distanceKm > 0
      ? Math.round(restaurantContext.distanceKm * 10) / 10
      : estimate.distanceKm
    const etaMinutes =
      Number.isFinite(restaurantContext.deliveryEtaMinutes) && restaurantContext.deliveryEtaMinutes > 0
        ? Math.max(5, Math.round(restaurantContext.deliveryEtaMinutes))
        : Math.max(5, Math.round(estimate.minutes || 0))
    const restaurantLabel = restaurantContext.name || pickupPoint || 'Restaurant'
    const deliveryLabel = current.label || '当前位置'
    const sourceId = `map_food_delivery_${restaurantContext.id || normalizedCategory || 'context'}`.slice(0, 140)

    return {
      sourceModule: FOOD_DELIVERY_SOURCE_KEYS.MAP_COURIER_ROUTE,
      sourceKeys: [
        FOOD_DELIVERY_SOURCE_KEYS.MAP_RESTAURANT_LOCATION,
        FOOD_DELIVERY_SOURCE_KEYS.MAP_COURIER_ROUTE,
      ],
      sourceId,
      categoryKey: normalizedCategory,
      readOnly: true,
      orderOwner: 'food_delivery',
      mapOwner: 'location_eta_context',
      currentLocationLabel: current.label,
      currentLocationDetail: current.detail,
      deliveryAddress: current.detail,
      pickupPoint,
      dropoffPoint,
      restaurantId: restaurantContext.id,
      restaurantName: restaurantContext.name,
      restaurantAddress: restaurantContext.address,
      distanceKm,
      etaMinutes,
      routeSummaryZh: `${restaurantLabel} → ${deliveryLabel} · 约 ${distanceKm} km · ${etaMinutes} min`,
      routeSummaryEn: `${restaurantLabel} -> ${deliveryLabel || 'Current location'} · about ${distanceKm} km · ${etaMinutes} min`,
    }
  }

  const buildDeliveryEventMapHandoff = ({
    ownerModule = '',
    order = {},
    event = {},
  } = {}) => {
    const current = normalizeCurrentLocation(currentLocation.value, mapPacks.value)
    const context = normalizeDeliveryEventLocationContext({
      ownerModule,
      order,
      event,
    })
    const dropoffPoint = context.dropoffPoint || current.detail || ''
    const pickupPoint = context.pickupPoint || context.locationHint || ''
    const estimate = pickupPoint && dropoffPoint
      ? estimateMapJourney({
          fromText: pickupPoint,
          toText: dropoffPoint,
          transportMode: LEGACY_MAP_TRANSPORT_MODE,
        })
      : { distanceKm: 0, minutes: 0, fare: 0 }
    const etaMinutes = context.etaMinutes > 0
      ? Math.max(1, context.etaMinutes)
      : context.etaDays !== null
        ? Math.max(0, context.etaDays) * 24 * 60
        : Math.max(0, Math.round(estimate.minutes || 0))
    const ownerLabel = context.ownerModule === 'food_delivery'
      ? 'Food Delivery'
      : context.ownerModule === 'shopping'
        ? 'Shopping logistics'
        : context.ownerModule
    const sourceId = `map_delivery_event_${context.ownerModule}_${context.orderId || context.eventId || 'context'}`.slice(0, 140)

    return {
      sourceModule:
        context.ownerModule === 'food_delivery'
          ? FOOD_DELIVERY_SOURCE_KEYS.MAP_COURIER_ROUTE
          : LOGISTICS_SOURCE_KEYS.MAP_DELIVERY_LOCATION,
      sourceId,
      readOnly: true,
      eventOwner: context.ownerModule,
      orderOwner: context.ownerModule,
      mapOwner: 'delivery_location_context',
      orderId: context.orderId,
      eventId: context.eventId,
      eventType: context.eventType,
      title: context.title,
      summary: context.summary,
      trackingCode: context.trackingCode,
      carrierName: context.carrierName,
      currentLocationLabel: current.label,
      currentLocationDetail: current.detail,
      pickupPoint,
      dropoffPoint,
      locationHint: context.locationHint,
      distanceKm: estimate.distanceKm,
      etaMinutes,
      etaDays: context.etaDays,
      routeSummaryZh: `${ownerLabel} · ${pickupPoint || context.locationHint || '位置待定'} → ${dropoffPoint || '当前位置'} · ${etaMinutes ? `${etaMinutes} min` : 'ETA TBD'}`,
      routeSummaryEn: `${ownerLabel} · ${pickupPoint || context.locationHint || 'Location TBD'} -> ${dropoffPoint || 'Current location'} · ${etaMinutes ? `${etaMinutes} min` : 'ETA TBD'}`,
    }
  }

  const startTrip = () => {
    refreshTripState(Date.now())
    if (tripState.value.status === TRIP_STATUS_TRAVELING) {
      return { ok: false, code: 'TRIP_ALREADY_IN_PROGRESS' }
    }
    if (tripState.value.status === TRIP_STATUS_ARRIVED) {
      return { ok: false, code: 'TRIP_ARRIVAL_PENDING' }
    }

    const from = typeof tripForm.from === 'string' ? tripForm.from.trim() : ''
    const to = typeof tripForm.to === 'string' ? tripForm.to.trim() : ''
    if (!from || !to) return { ok: false, code: 'TRIP_ENDPOINT_EMPTY' }
    if (from === to) return { ok: false, code: 'TRIP_ENDPOINT_SAME' }
    const transportMode = normalizeMapTransportMode(tripForm.transportMode)
    if (!transportMode) return { ok: false, code: 'TRIP_TRANSPORT_REQUIRED' }

    const estimate = computeActiveTripEstimate(from, to, transportMode)
    const startedAt = Date.now()
    const etaAt = startedAt + estimate.durationSeconds * 1000
    const journeyId = createMapJourneyId(startedAt)
    const worldPackId = activeWorldPackId.value
    const mapPackId = activeMapPackId.value
    const destinationPlace = findActivePlaceByText(to)
    const destinationPlaceId =
      destinationPlace?.mapPackId === mapPackId
        ? destinationPlace.placeId || destinationPlace.id || ''
        : ''

    tripState.value = {
      status: TRIP_STATUS_TRAVELING,
      journeySchemaVersion: MAP_JOURNEY_SCHEMA_VERSION,
      journeyId,
      phase: MAP_JOURNEY_PHASE.DEPARTED,
      checkpoints: createMapJourneyCheckpointPlan({ startedAt }),
      eventCheckpointIds: [],
      activeInterruption: null,
      eventDelaySeconds: 0,
      worldPackId,
      mapPackId,
      from,
      to,
      transportMode,
      estimateVersion: MAP_TRIP_ESTIMATE_VERSION,
      fromLabel: resolveAddressLabel(from, '起点'),
      toLabel: resolveAddressLabel(to, '目的地'),
      destinationPlaceId,
      distanceKm: estimate.distanceKm,
      fare: estimate.fare,
      durationSeconds: estimate.durationSeconds,
      startedAt,
      etaAt,
      arrivedAt: 0,
      pausedAt: 0,
      remainingSecondsAtPause: 0,
      totalPausedSeconds: 0,
      pushScheduleRevision: 0,
      scheduledPushId: '',
    }
    runtimeNow.value = startedAt
    scheduleTripArrivalCheck()
    const remotePushPromise = ensureTripArrivalPushScheduled({
      source: 'map_trip_start',
    })
    return {
      ok: true,
      etaAt,
      durationSeconds: estimate.durationSeconds,
      transportMode,
      journeyId,
      worldPackId,
      mapPackId,
      remotePushPromise,
    }
  }

  const cancelTrip = () => {
    const endedAt = Date.now()
    refreshTripState(endedAt)
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_TRAVELING) return false
    const runtime = calculateMapJourneyRuntime(state, endedAt)
    const pendingSchedulePromise = tripPushSchedulePromise
    const scheduleId =
      state.scheduledPushId ||
      (state.startedAt
        ? createMapTripScheduleId(state.startedAt, state.pushScheduleRevision)
        : '')
    appendTripHistory({
      id: `trip_hist_${endedAt}`,
      status: 'cancelled',
      journeySchemaVersion: state.journeySchemaVersion,
      journeyId: state.journeyId,
      phase: MAP_JOURNEY_PHASE.CANCELLED,
      checkpoints: state.checkpoints,
      eventCheckpointIds: state.eventCheckpointIds,
      eventDelaySeconds: state.eventDelaySeconds,
      totalPausedSeconds: state.totalPausedSeconds,
      worldPackId: state.worldPackId,
      mapPackId: state.mapPackId,
      from: state.from,
      to: state.to,
      fromLabel: state.fromLabel,
      toLabel: state.toLabel,
      destinationPlaceId: state.destinationPlaceId,
      transportMode: state.transportMode,
      estimateVersion: state.estimateVersion,
      distanceKm: state.distanceKm,
      fare: state.fare,
      durationSeconds: Math.max(1, runtime.elapsedSeconds),
      startedAt: state.startedAt,
      endedAt,
    })
    if (state.activeInterruption?.proposalId) {
      getSimulationStore().dismissMapJourneyEventProposal(state.activeInterruption.proposalId, {
        reason: 'map_journey_cancelled',
        at: endedAt,
      })
    }
    tripState.value = createIdleTripState()
    runtimeNow.value = endedAt
    clearTripArrivalTimer()
    if (scheduleId) {
      void cancelTripArrivalPushAfterPending({
        pendingSchedulePromise,
        scheduleId,
        source: 'map_trip_cancel',
      })
    }
    return true
  }

  const pauseTrip = async ({ now = Date.now() } = {}) => {
    const pausedAt = Math.max(0, toInt(now, Date.now()))
    refreshTripState(pausedAt)
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_TRAVELING) {
      return {
        ok: false,
        code:
          state.status === TRIP_STATUS_ARRIVED
            ? 'TRIP_ALREADY_ARRIVED'
            : 'TRIP_NOT_ACTIVE',
      }
    }
    if (state.phase === MAP_JOURNEY_PHASE.PAUSED) {
      return { ok: false, code: 'TRIP_ALREADY_PAUSED' }
    }

    const runtime = calculateMapJourneyRuntime(state, pausedAt)
    if (runtime.remainingSeconds <= 0) {
      refreshTripState(pausedAt)
      return { ok: false, code: 'TRIP_ALREADY_ARRIVED' }
    }
    const advanced = advanceMapJourneyCheckpoints({
      checkpoints: state.checkpoints,
      progress: runtime.progress,
      startedAt: state.startedAt,
      durationSeconds: state.durationSeconds,
      totalPausedSeconds: state.totalPausedSeconds,
      reachedAt: pausedAt,
    })
    const pendingSchedulePromise = tripPushSchedulePromise
    const scheduleId =
      state.scheduledPushId ||
      createMapTripScheduleId(state.startedAt, state.pushScheduleRevision)

    tripState.value = {
      ...state,
      phase: MAP_JOURNEY_PHASE.PAUSED,
      checkpoints: advanced.checkpoints,
      pausedAt,
      remainingSecondsAtPause: runtime.remainingSeconds,
      pushScheduleRevision: state.pushScheduleRevision + 1,
      scheduledPushId: '',
    }
    runtimeNow.value = pausedAt
    clearTripArrivalTimer()

    const pausePushPromise = cancelTripArrivalPushAfterPending({
      pendingSchedulePromise,
      scheduleId,
      source: 'map_trip_pause',
    })
    tripPushPausePromise = pausePushPromise
    let pushResult
    try {
      pushResult = await pausePushPromise
    } finally {
      if (tripPushPausePromise === pausePushPromise) tripPushPausePromise = null
    }
    return {
      ok: true,
      code: 'TRIP_PAUSED',
      remainingSeconds: runtime.remainingSeconds,
      pushResult,
    }
  }

  const resumeTrip = async ({ now = Date.now() } = {}) => {
    if (tripPushPausePromise) await tripPushPausePromise
    const resumedAt = Math.max(0, toInt(now, Date.now()))
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_TRAVELING) {
      return {
        ok: false,
        code:
          state.status === TRIP_STATUS_ARRIVED
            ? 'TRIP_ALREADY_ARRIVED'
            : 'TRIP_NOT_ACTIVE',
      }
    }
    if (state.phase !== MAP_JOURNEY_PHASE.PAUSED) {
      return { ok: false, code: 'TRIP_NOT_PAUSED' }
    }

    const pausedDurationMs = Math.max(0, resumedAt - state.pausedAt)
    const etaAt = state.etaAt + pausedDurationMs
    tripState.value = {
      ...state,
      phase: resolveMapJourneyPhase(state.checkpoints),
      etaAt,
      pausedAt: 0,
      remainingSecondsAtPause: 0,
      totalPausedSeconds:
        state.totalPausedSeconds + Math.floor(pausedDurationMs / 1000),
      scheduledPushId: '',
    }
    runtimeNow.value = resumedAt
    scheduleTripArrivalCheck()
    const remotePushPromise = ensureTripArrivalPushScheduled({
      force: true,
      source: 'map_trip_resume',
    })
    return {
      ok: true,
      code: 'TRIP_RESUMED',
      etaAt,
      remotePushPromise,
    }
  }

  const validateJourneyEventOutcome = (result = {}) => {
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_TRAVELING) {
      return { ok: false, code: 'JOURNEY_EVENT_TRIP_NOT_ACTIVE' }
    }
    if (!state.activeInterruption) {
      return { ok: false, code: 'JOURNEY_EVENT_NOT_PENDING' }
    }
    if (result.authorization !== 'event_runtime_reviewed') {
      return { ok: false, code: 'JOURNEY_EVENT_AUTHORIZATION_INVALID' }
    }
    if (
      result.proposalId !== state.activeInterruption.proposalId ||
      result.eventId !== state.activeInterruption.eventId ||
      result.journeyId !== state.journeyId ||
      result.checkpointId !== state.activeInterruption.checkpointId
    ) {
      return { ok: false, code: 'JOURNEY_EVENT_SOURCE_STALE' }
    }
    if (!Object.values(MAP_JOURNEY_EVENT_OUTCOME).includes(result.outcome)) {
      return { ok: false, code: 'JOURNEY_EVENT_OUTCOME_UNSUPPORTED' }
    }
    const delaySeconds = Math.max(0, toInt(result.delaySeconds, 0))
    if (
      (result.outcome === MAP_JOURNEY_EVENT_OUTCOME.CONTINUE && delaySeconds !== 0) ||
      (result.outcome === MAP_JOURNEY_EVENT_OUTCOME.DELAY &&
        (delaySeconds <= 0 || delaySeconds > MAP_JOURNEY_EVENT_DELAY_SECONDS))
    ) {
      return { ok: false, code: 'JOURNEY_EVENT_DELAY_INVALID' }
    }
    return { ok: true, code: 'JOURNEY_EVENT_OUTCOME_VALID', delaySeconds }
  }

  const applyJourneyEventOutcome = async (result = {}, { now = Date.now() } = {}) => {
    const appliedAt = Math.max(0, toInt(now, Date.now()))
    refreshTripState(appliedAt)
    let validation = validateJourneyEventOutcome(result)
    if (!validation.ok) return validation
    const state = normalizeTripState(tripState.value)
    const delaySeconds = validation.delaySeconds
    const isPaused = state.phase === MAP_JOURNEY_PHASE.PAUSED
    const pendingSchedulePromise = tripPushSchedulePromise
    const scheduleId =
      state.scheduledPushId ||
      (state.startedAt
        ? createMapTripScheduleId(state.startedAt, state.pushScheduleRevision)
        : '')
    tripState.value = {
      ...state,
      durationSeconds: state.durationSeconds + delaySeconds,
      etaAt: state.etaAt + delaySeconds * 1000,
      remainingSecondsAtPause: isPaused
        ? state.remainingSecondsAtPause + delaySeconds
        : 0,
      eventDelaySeconds: state.eventDelaySeconds + delaySeconds,
      activeInterruption: null,
    }
    runtimeNow.value = appliedAt
    if (!isPaused) scheduleTripArrivalCheck()

    const remotePushPromise =
      delaySeconds > 0 && !isPaused
        ? (async () => {
            await cancelTripArrivalPushAfterPending({
              pendingSchedulePromise,
              scheduleId,
              source: 'map_journey_event_delay',
            })
            const latestState = normalizeTripState(tripState.value)
            if (
              latestState.status !== TRIP_STATUS_TRAVELING ||
              latestState.phase === MAP_JOURNEY_PHASE.PAUSED ||
              latestState.journeyId !== state.journeyId
            ) {
              return { ok: false, reason: 'no_active_trip' }
            }
            tripState.value = {
              ...latestState,
              pushScheduleRevision: latestState.pushScheduleRevision + 1,
              scheduledPushId: '',
            }
            return ensureTripArrivalPushScheduled({
              force: true,
              source: 'map_journey_event_delay',
            })
          })()
        : null
    return {
      ok: true,
      code:
        delaySeconds > 0
          ? 'JOURNEY_EVENT_DELAY_APPLIED'
          : 'JOURNEY_EVENT_NO_CHANGE_APPLIED',
      proposalId: result.proposalId,
      outcome: result.outcome,
      delaySeconds,
      etaAt: tripState.value.etaAt,
      remotePushPromise,
    }
  }

  const recoverJourneyEventInterruption = async ({ now = Date.now() } = {}) => {
    const recoveredAt = Math.max(0, toInt(now, Date.now()))
    refreshTripState(recoveredAt)
    const state = normalizeTripState(tripState.value)
    if (
      state.status !== TRIP_STATUS_TRAVELING ||
      !state.activeInterruption
    ) {
      return { ok: false, code: 'JOURNEY_EVENT_NOT_PENDING' }
    }
    getSimulationStore().dismissMapJourneyEventProposal(
      state.activeInterruption.proposalId,
      {
        reason: 'map_journey_event_source_unavailable',
        at: recoveredAt,
      },
    )
    tripState.value = {
      ...state,
      activeInterruption: null,
    }
    return { ok: true, code: 'JOURNEY_EVENT_NOTICE_CLEARED' }
  }

  const requestTripTransition = async (transition, options = {}) => {
    if (transition === 'pause') return pauseTrip(options)
    if (transition === 'resume') return resumeTrip(options)
    if (transition === 'cancel') {
      const state = normalizeTripState(tripState.value)
      if (state.status !== TRIP_STATUS_TRAVELING) {
        return {
          ok: false,
          code:
            state.status === TRIP_STATUS_ARRIVED
              ? 'TRIP_ALREADY_ARRIVED'
              : 'TRIP_NOT_ACTIVE',
        }
      }
      return cancelTrip()
        ? { ok: true, code: 'TRIP_CANCELLED' }
        : { ok: false, code: 'TRIP_TRANSITION_REJECTED' }
    }
    return { ok: false, code: 'TRIP_TRANSITION_UNSUPPORTED' }
  }

  const acknowledgeTripArrival = () => {
    refreshTripState(Date.now())
    if (tripState.value.status !== TRIP_STATUS_ARRIVED) return false
    tripState.value = createIdleTripState()
    runtimeNow.value = Date.now()
    return true
  }

  const setMapCalendarReminderPreference = (reminderId, updates = {}) => {
    const id = normalizeMapCalendarReminderId(reminderId)
    if (!id || !updates || typeof updates !== 'object') return false

    const now = Date.now()
    const current =
      normalizeMapCalendarReminderPreference(mapCalendarReminderPreferences.value[id]) || {
        status: '',
        pinned: false,
        confirmedAt: 0,
        pinnedAt: 0,
        dismissedAt: 0,
        updatedAt: 0,
      }
    const nextStatus = normalizeMapCalendarReminderStatus(updates.status, current.status)
    const nextPinned =
      Object.prototype.hasOwnProperty.call(updates, 'pinned')
        ? updates.pinned === true
        : current.pinned === true
    const next = {
      ...current,
      status: nextStatus,
      pinned: nextPinned,
      updatedAt: now,
    }

    if (next.status === MAP_CALENDAR_REMINDER_STATUS_CONFIRMED && !next.confirmedAt) {
      next.confirmedAt = now
    }

    if (next.pinned) {
      next.status = MAP_CALENDAR_REMINDER_STATUS_CONFIRMED
      next.pinnedAt = next.pinnedAt || now
      next.confirmedAt = next.confirmedAt || now
    } else {
      next.pinnedAt = 0
    }

    if (next.status === MAP_CALENDAR_REMINDER_STATUS_DISMISSED) {
      next.pinned = false
      next.pinnedAt = 0
      next.dismissedAt = next.dismissedAt || now
    } else {
      next.dismissedAt = 0
    }

    mapCalendarReminderPreferences.value = {
      ...mapCalendarReminderPreferences.value,
      [id]: normalizeMapCalendarReminderPreference(next),
    }
    return true
  }

  const confirmMapCalendarReminder = (reminderId) =>
    setMapCalendarReminderPreference(reminderId, {
      status: MAP_CALENDAR_REMINDER_STATUS_CONFIRMED,
    })

  const setMapCalendarReminderPinned = (reminderId, pinned = true) =>
    setMapCalendarReminderPreference(reminderId, {
      pinned: pinned === true,
    })

  const dismissMapCalendarReminder = (reminderId) =>
    setMapCalendarReminderPreference(reminderId, {
      status: MAP_CALENDAR_REMINDER_STATUS_DISMISSED,
      pinned: false,
    })

  const resetMapCalendarReminderPreference = (reminderId) => {
    const id = normalizeMapCalendarReminderId(reminderId)
    if (!id || !mapCalendarReminderPreferences.value[id]) return false
    const next = { ...mapCalendarReminderPreferences.value }
    delete next[id]
    mapCalendarReminderPreferences.value = next
    return true
  }

  const applyPersistedSource = (source) => {
    if (!source || typeof source !== 'object') return false

    customMapPacks.value = normalizeCustomMapPacks(source.customMapPacks)
    worldMapPackBindings.value = normalizeWorldMapPackBindings(
      source.worldMapPackBindings,
      mapPacks.value,
    )
    mapPinVisibilityByPack.value = normalizeMapPinVisibilityByPack(
      source.mapPinVisibilityByPack,
      mapPacks.value,
    )
    mapPlaceKnowledgeByWorld.value = normalizeMapPlaceKnowledgeByWorld(
      source.mapPlaceKnowledgeByWorld,
    )
    mapPlaceDisplayMode.value = normalizeMapPlaceDisplayMode(source.mapPlaceDisplayMode)
    activeMapPackId.value = getAvailableMapPackById(source.activeMapPackId).id

    if (Array.isArray(source.addresses)) {
      const normalizedAddresses = source.addresses
        .map((item, index) => normalizeAddressRecord(item, index, mapPacks.value))
        .filter(Boolean)
      if (normalizedAddresses.length > 0) {
        addresses.splice(0, addresses.length, ...normalizedAddresses)
      }
    }

    const currentLocationSource = source.currentLocation?.positionEvidence
      ? source.currentLocation
      : migrateMapCurrentLocationV3(source)
    currentLocation.value = normalizeCurrentLocation(currentLocationSource, mapPacks.value)
    placeSession.value = normalizeMapPlaceSession(source.placeSession)
    if (
      placeSession.value.state === MAP_PLACE_SESSION_STATE.INSIDE &&
      (
        placeSession.value.mapPackId !== currentLocation.value.mapPackId ||
        placeSession.value.placeId !== currentLocation.value.positionEvidence.placeId ||
        placeSession.value.presence.provenance !== currentLocation.value.positionEvidence.provenance
      )
    ) {
      const left = leaveMapPlaceSession(placeSession.value, { now: Date.now() })
      placeSession.value = left.ok ? left.session : createEmptyMapPlaceSession()
    }

    const normalizedTripForm = normalizeTripForm(source.tripForm)
    tripForm.from = normalizedTripForm.from
    tripForm.to = normalizedTripForm.to
    tripForm.transportMode = normalizedTripForm.transportMode

    tripState.value = normalizeTripState(source.tripState)

    if (Array.isArray(source.tripHistory)) {
      tripHistory.value = source.tripHistory
        .map((item, index) => normalizeTripHistoryItem(item, index))
        .filter(Boolean)
        .slice(0, TRIP_HISTORY_LIMIT)
    }

    mapCalendarReminderPreferences.value =
      normalizeMapCalendarReminderPreferences(source.mapCalendarReminderPreferences)
    mapVisualSettings.value = normalizeMapVisualSettings(source.mapVisualSettings)
    mapAutomationRuntime.value = createDefaultMapAutomationRuntime()

    runtimeNow.value = Date.now()
    refreshTripState(runtimeNow.value)
    scheduleTripArrivalCheck()
    const restoredTripState = normalizeTripState(tripState.value)
    if (
      restoredTripState.status === TRIP_STATUS_TRAVELING &&
      restoredTripState.phase !== MAP_JOURNEY_PHASE.PAUSED
    ) {
      void ensureTripArrivalPushScheduled({
        source: 'map_trip_restore',
      })
    }
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(MAP_STORAGE_KEY, {
      version: MAP_STORAGE_VERSION,
      migrate: migrateMapStorage,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(MAP_STORAGE_KEY, {
      version: MAP_STORAGE_VERSION,
      migrate: migrateMapStorage,
    })
    return applyPersistedSource(persisted)
  }

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.map === 'object' && snapshot.map
        ? snapshot.map
        : snapshot
    return applyPersistedSource(source)
  }

  const createBackupSnapshot = () => ({
    activeMapPackId: activeMapPackId.value,
    customMapPacks: customMapPacks.value.map((pack) => ({
      ...pack,
      factions: pack.factions.map((faction) => ({ ...faction, position: { ...faction.position } })),
      places: [],
    })),
    worldMapPackBindings: { ...worldMapPackBindings.value },
    mapPlaceKnowledgeByWorld: normalizeMapPlaceKnowledgeByWorld(
      mapPlaceKnowledgeByWorld.value,
    ),
    mapPlaceDisplayMode: mapPlaceDisplayMode.value,
    mapPinVisibilityByPack: Object.fromEntries(
      Object.entries(mapPinVisibilityByPack.value).map(([mapPackId, state]) => [
        mapPackId,
        {
          categoryVisibility: { ...state.categoryVisibility },
          placeVisibility: { ...state.placeVisibility },
        },
      ]),
    ),
    addresses: addresses.map((item) => ({ ...item })),
    currentLocation: {
      ...currentLocation.value,
      position: currentLocation.value.position ? { ...currentLocation.value.position } : null,
      positionEvidence: { ...currentLocation.value.positionEvidence },
    },
    placeSession: {
      ...placeSession.value,
      capabilityIds: [...placeSession.value.capabilityIds],
      presence: { ...placeSession.value.presence },
    },
    tripForm: { ...tripForm },
    tripState: {
      ...tripState.value,
      checkpoints: Array.isArray(tripState.value.checkpoints)
        ? tripState.value.checkpoints.map((checkpoint) => ({ ...checkpoint }))
        : [],
      eventCheckpointIds: Array.isArray(tripState.value.eventCheckpointIds)
        ? [...tripState.value.eventCheckpointIds]
        : [],
      activeInterruption: tripState.value.activeInterruption
        ? { ...tripState.value.activeInterruption }
        : null,
    },
    tripHistory: tripHistory.value.map((item) => ({
      ...item,
      checkpoints: Array.isArray(item.checkpoints)
        ? item.checkpoints.map((checkpoint) => ({ ...checkpoint }))
        : [],
      eventCheckpointIds: Array.isArray(item.eventCheckpointIds)
        ? [...item.eventCheckpointIds]
        : [],
    })),
    mapCalendarReminderPreferences: normalizeMapCalendarReminderPreferences(
      mapCalendarReminderPreferences.value,
    ),
    mapVisualSettings: { ...mapVisualSettings.value },
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const resetTripRuntimeForTesting = () => {
    clearTripArrivalTimer()
    tripState.value = createIdleTripState()
    tripHistory.value = []
    mapCalendarReminderPreferences.value = {}
    activeMapPackId.value = DEFAULT_MAP_PACK_ID
    mapPinVisibilityByPack.value = {}
    mapPlaceKnowledgeByWorld.value = {}
    mapPlaceDisplayMode.value = MAP_PLACE_DISPLAY_MODE.SYSTEM
    mapVisualSettings.value = createDefaultMapVisualSettings()
    mapAutomationRuntime.value = createDefaultMapAutomationRuntime()
    placeSession.value = createEmptyMapPlaceSession()
    mapEventTextProviderRunnerOverride = null
    journeyCheckpointEventEvaluationEnabled = false
    journeyEventRandomValueOverride = undefined
    runtimeNow.value = Date.now()
  }

  const setMapAiProviderRunnerForTesting = (runner) => {
    mapProviderRunnerOverride = typeof runner === 'function' ? runner : null
  }

  const persistToStorage = () => {
    writePersistedState(
      MAP_STORAGE_KEY,
      createBackupSnapshot(),
      { version: MAP_STORAGE_VERSION, migrate: migrateMapStorage },
    )
  }

  const saveNow = () => {
    persistToStorage()
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    refreshTripState(Date.now())
    scheduleTripArrivalCheck()
    persistToStorage()
  })()

  watch(
    [
      activeMapPackId,
      customMapPacks,
      worldMapPackBindings,
      mapPinVisibilityByPack,
      mapPlaceKnowledgeByWorld,
      mapPlaceDisplayMode,
      addresses,
      currentLocation,
      placeSession,
      tripForm,
      tripState,
      tripHistory,
      mapCalendarReminderPreferences,
      mapVisualSettings,
    ],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  watch(
    () => {
      const systemStore = getSystemStore()
      const systemSettings = systemStore.settings?.system || {}
      return [
        systemSettings.realPushEnabled === true,
        systemSettings.pushSubscriptionActive === true,
        typeof systemSettings.pushServerUrl === 'string' ? systemSettings.pushServerUrl : '',
        typeof systemSettings.pushDeviceId === 'string' ? systemSettings.pushDeviceId : '',
        normalizeTripState(tripState.value).status,
        normalizeTripState(tripState.value).phase,
        normalizeTripState(tripState.value).startedAt,
        normalizeTripState(tripState.value).etaAt,
        normalizeTripState(tripState.value).pushScheduleRevision,
      ]
    },
    () => {
      if (!hasFinishedStorageHydration.value) return
      const state = normalizeTripState(tripState.value)
      if (state.status !== TRIP_STATUS_TRAVELING) return
      if (state.phase === MAP_JOURNEY_PHASE.PAUSED) {
        if (state.scheduledPushId) {
          void cancelTripArrivalPushScheduled({
            scheduleId: state.scheduledPushId,
            source: 'map_trip_paused_sync',
          })
        }
        return
      }
      if (canUseTripArrivalRealPush()) {
        void ensureTripArrivalPushScheduled({
          source: 'map_trip_runtime_sync',
        })
        return
      }
      if (state.scheduledPushId) {
        void cancelTripArrivalPushScheduled({
          scheduleId: state.scheduledPushId,
          source: 'map_trip_push_disabled',
        })
      }
    },
    { deep: false },
  )

  ensureMapAutomationHandlerRegistered()

  return {
    mapPacks,
    customMapPacks,
    worldMapPackBindings,
    mapPinVisibilityByPack,
    mapPlaceKnowledgeByWorld,
    mapPlaceDisplayMode,
    activeMapPackId,
    activeMapPack,
    activeMapAllPlaces,
    activeMapPlaces,
    activeMapVisiblePlaces,
    activeMapPlaceKnowledgeMode,
    activeMapPlaceDiscoverySummary,
    addresses,
    currentLocation,
    currentLocationText,
    placeSession,
    mapEventSurfaces,
    mapEventSurfacePins,
    tripForm,
    tripEstimate,
    tripState,
    tripRuntime,
    tripHistory,
    routeFamiliarity,
    mapAreaUnlocks,
    mapAreaFeedback,
    mapCalendarReminders,
    mapCalendarReminderPreferences,
    mapVisualSettings,
    mapAutomationRuntime,
    mapAiVisualAutomationPolicy,
    resolveMapPackIdForWorld,
    createCustomMapPack,
    removeCustomMapPack,
    setActiveMapPack,
    bindMapPackToWorld,
    resetWorldMapPackBinding,
    syncMapPackForWorld,
    setMapPlaceDisplayMode,
    setMapPlaceKnowledgeMode,
    isMapPlaceVisible,
    getMapPlaceCategoryVisibility,
    setMapPlaceVisibility,
    setMapPlaceCategoryVisibility,
    resetActiveMapPinVisibility,
    setCurrentLocation,
    setCurrentLocationByAddressId,
    enterPlace,
    leavePlace,
    getPlaceSessionEventInvitation,
    expandPlaceSessionEvent,
    resolvePlaceSessionEventChoice,
    dismissPlaceSessionEvent,
    setTripEndpoint,
    setTripTransportMode,
    applyAddressToTripEndpoint,
    addAddress,
    updateAddress,
    removeAddress,
    buildFoodDeliveryMapHandoff,
    buildDeliveryEventMapHandoff,
    startTrip,
    cancelTrip,
    pauseTrip,
    resumeTrip,
    validateJourneyEventOutcome,
    applyJourneyEventOutcome,
    recoverJourneyEventInterruption,
    requestTripTransition,
    acknowledgeTripArrival,
    confirmMapCalendarReminder,
    setMapCalendarReminderPinned,
    dismissMapCalendarReminder,
    resetMapCalendarReminderPreference,
    refreshTripState,
    tickTripRuntime,
    updateTripHistoryItem,
    removeTripHistoryItem,
    bindRelationshipToTrip,
    neutralizeRelationshipTrip,
    cleanupRelationshipForProfile,
    setMapVisualMode,
    setMapVisualAssetId,
    setMapAiVisualEnabled,
    setMapProviderVisualEnabled,
    dismissMapVisualOnboardingPrompt,
    resolveMapVisualMode,
    enforceMapVisualFallback,
    ensureMapAutomationHandlerRegistered,
    requestMapAiVisualRefresh,
    ensureTripArrivalPushScheduled,
    cancelTripArrivalPushScheduled,
    restoreFromBackup,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    resetTripRuntimeForTesting,
    setMapAiProviderRunnerForTesting,
    setMapEventTextProviderRunnerForTesting,
    setJourneyCheckpointEventEvaluationEnabled,
    setJourneyEventRandomValueForTesting,
    saveNow,
  }
})
