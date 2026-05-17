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
import { useSystemStore } from './system'

const MAP_STORAGE_KEY = 'store:map'
const MAP_STORAGE_VERSION = 2
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
    descriptionZh: '足够多的探索和稳定路线会打开更远区域的叙事空间。',
    descriptionEn: 'Enough exploration and trusted routes open narrative space beyond the usual area.',
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
  { id: 1, label: '家', detail: '首尔市江南区清潭洞 88-1' },
  { id: 2, label: '公司', detail: '首尔市麻浦区世界杯北路 400' },
  { id: 3, label: '练习室', detail: '首尔市龙山区汉江大路 120' },
]

const toInt = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

const createDefaultCurrentLocation = () => ({
  source: 'saved',
  label: SEED_ADDRESSES[0].label,
  detail: SEED_ADDRESSES[0].detail,
})

const createDefaultTripForm = () => ({
  from: SEED_ADDRESSES[0].detail,
  to: SEED_ADDRESSES[1].detail,
})

const createIdleTripState = () => ({
  status: TRIP_STATUS_IDLE,
  from: '',
  to: '',
  fromLabel: '',
  toLabel: '',
  distanceKm: 0,
  fare: 0,
  durationSeconds: 0,
  startedAt: 0,
  etaAt: 0,
  arrivedAt: 0,
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

const computeTripEstimate = (fromText = '', toText = '') => {
  const from = typeof fromText === 'string' ? fromText.trim() : ''
  const to = typeof toText === 'string' ? toText.trim() : ''
  const baseKm = Math.max(3, Math.abs(from.length - to.length) % 18 + 3)
  const minutes = Math.round(baseKm * 3.5)
  const fare = 4800 + baseKm * 900
  return {
    distanceKm: baseKm,
    minutes,
    durationSeconds: Math.max(60, minutes * 60),
    fare,
  }
}

const normalizeAddressRecord = (item, index = 0) => {
  if (!item || typeof item !== 'object') return null
  const label = typeof item.label === 'string' ? item.label.trim() : ''
  const detail = typeof item.detail === 'string' ? item.detail.trim() : ''
  if (!label || !detail) return null
  const rawId = Number(item.id)
  return {
    id: Number.isFinite(rawId) ? Math.trunc(rawId) : Date.now() + index,
    label,
    detail,
  }
}

const normalizeCurrentLocation = (raw) => {
  const fallback = createDefaultCurrentLocation()
  if (!raw || typeof raw !== 'object') return fallback
  const detail = typeof raw.detail === 'string' ? raw.detail.trim() : ''
  if (!detail) return fallback
  return {
    source: typeof raw.source === 'string' ? raw.source : fallback.source,
    label:
      typeof raw.label === 'string' && raw.label.trim()
        ? raw.label.trim()
        : fallback.label,
    detail,
  }
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
  }
}

const normalizeTripState = (raw) => {
  if (!raw || typeof raw !== 'object') return createIdleTripState()
  const status =
    raw.status === TRIP_STATUS_TRAVELING || raw.status === TRIP_STATUS_ARRIVED
      ? raw.status
      : TRIP_STATUS_IDLE
  if (status === TRIP_STATUS_IDLE) return createIdleTripState()
  return {
    status,
    from: typeof raw.from === 'string' ? raw.from.trim() : '',
    to: typeof raw.to === 'string' ? raw.to.trim() : '',
    fromLabel: typeof raw.fromLabel === 'string' ? raw.fromLabel.trim() : '',
    toLabel: typeof raw.toLabel === 'string' ? raw.toLabel.trim() : '',
    distanceKm: Math.max(0, toInt(raw.distanceKm, 0)),
    fare: Math.max(0, toInt(raw.fare, 0)),
    durationSeconds: Math.max(0, toInt(raw.durationSeconds, 0)),
    startedAt: Math.max(0, toInt(raw.startedAt, 0)),
    etaAt: Math.max(0, toInt(raw.etaAt, 0)),
    arrivedAt: Math.max(0, toInt(raw.arrivedAt, 0)),
    scheduledPushId:
      typeof raw.scheduledPushId === 'string' && raw.scheduledPushId.trim()
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
  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id.trim()
        : `trip_hist_${endedAt}_${index}`,
    status,
    from,
    to,
    fromLabel: typeof raw.fromLabel === 'string' ? raw.fromLabel.trim() : '',
    toLabel: typeof raw.toLabel === 'string' ? raw.toLabel.trim() : '',
    distanceKm: Math.max(0, toInt(raw.distanceKm, 0)),
    fare: Math.max(0, toInt(raw.fare, 0)),
    durationSeconds: Math.max(0, toInt(raw.durationSeconds, 0)),
    startedAt: Math.max(0, toInt(raw.startedAt, 0)),
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

const createMapTripScheduleId = (startedAt = 0) => {
  const normalizedStartedAt = Math.max(0, toInt(startedAt, 0))
  if (!normalizedStartedAt) {
    return `map_trip_${Date.now()}`
  }
  return `map_trip_${normalizedStartedAt}`
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
  const addresses = reactive(SEED_ADDRESSES.map((item) => ({ ...item })))

  const currentLocation = ref(createDefaultCurrentLocation())

  const tripForm = reactive(createDefaultTripForm())
  const tripState = ref(createIdleTripState())
  const tripHistory = ref([])
  const mapCalendarReminderPreferences = ref({})
  const mapVisualSettings = ref(createDefaultMapVisualSettings())
  const mapAutomationRuntime = ref(createDefaultMapAutomationRuntime())
  const runtimeNow = ref(Date.now())
  let tripArrivalTimer = null
  let tripPushSchedulePromise = null
  let tripPushCancelPromise = null
  let mapAutomationHandlerRegistered = false
  let mapProviderRunnerOverride = null
  const hasFinishedStorageHydration = ref(false)

  const tripEstimate = computed(() => {
    const { distanceKm, minutes, fare } = computeTripEstimate(tripForm.from, tripForm.to)
    return { distanceKm, minutes, fare }
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

    if (state.status === TRIP_STATUS_ARRIVED) {
      return {
        ...state,
        progress: 1,
        elapsedSeconds: state.durationSeconds,
        remainingSeconds: 0,
      }
    }

    const now = runtimeNow.value
    const durationSeconds = Math.max(1, state.durationSeconds)
    const elapsedSeconds = Math.max(
      0,
      Math.min(durationSeconds, Math.floor((now - state.startedAt) / 1000)),
    )
    const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds)
    return {
      ...state,
      progress: Math.min(1, elapsedSeconds / durationSeconds),
      elapsedSeconds,
      remainingSeconds,
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
    return (
      systemSettings.notifications !== false &&
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
      (state.startedAt ? createMapTripScheduleId(state.startedAt) : '')

    if (!nextScheduleId) {
      return { ok: false, reason: 'schedule_missing' }
    }

    if (tripPushCancelPromise) return tripPushCancelPromise

    tripPushCancelPromise = (async () => {
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
          systemStore.addApiReport({
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
      } finally {
        tripPushCancelPromise = null
      }
    })()

    return tripPushCancelPromise
  }

  const ensureTripArrivalPushScheduled = async ({ force = false, source = '' } = {}) => {
    const systemStore = getSystemStore()
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_TRAVELING || !state.etaAt) {
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

    const scheduleId = state.scheduledPushId || createMapTripScheduleId(state.startedAt)
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
          systemStore.addApiReport({
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
          latestState.startedAt === state.startedAt
        ) {
          tripState.value = {
            ...latestState,
            scheduledPushId: result.scheduleId || scheduleId,
          }
        }

        systemStore.addApiReport({
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

  const resolveAddressLabel = (detailText, fallbackLabel) => {
    const detail = typeof detailText === 'string' ? detailText.trim() : ''
    if (!detail) return fallbackLabel
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

  const refreshTripState = (nowInput = Date.now()) => {
    runtimeNow.value = Math.max(0, toInt(nowInput, Date.now()))
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_TRAVELING) return false
    if (!state.etaAt || runtimeNow.value < state.etaAt) return false

    const arrivedAt = runtimeNow.value
    const scheduleId = state.scheduledPushId || (state.startedAt ? createMapTripScheduleId(state.startedAt) : '')
    tripState.value = {
      ...state,
      status: TRIP_STATUS_ARRIVED,
      arrivedAt,
      scheduledPushId: '',
    }
    currentLocation.value = {
      source: 'trip_arrived',
      label: state.toLabel || resolveAddressLabel(state.to, '目的地'),
      detail: state.to,
    }
    const reward = buildTripArrivalReward(state)
    appendTripHistory({
      id: `trip_hist_${arrivedAt}`,
      status: 'arrived',
      from: state.from,
      to: state.to,
      fromLabel: state.fromLabel,
      toLabel: state.toLabel,
      distanceKm: state.distanceKm,
      fare: state.fare,
      durationSeconds: state.durationSeconds,
      startedAt: state.startedAt,
      endedAt: arrivedAt,
      ...reward,
    })
    clearTripArrivalTimer()
    if (scheduleId) {
      void cancelTripArrivalPushScheduled({
        scheduleId,
        source: 'map_trip_arrived',
      })
    }
    return true
  }

  const scheduleTripArrivalCheck = () => {
    clearTripArrivalTimer()
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_TRAVELING || !state.etaAt) return
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
      systemStore.addNotification({
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
      systemStore.addNotification({
        title: useChinese ? '地图后台更新' : 'Map background update',
        content: summary || (useChinese ? '地图状态已更新。' : 'Map status updated.'),
        icon: 'fas fa-map-location-dot',
        route: '/map',
        source: 'map_auto_update',
        createdAt: now,
      })
    }

    systemStore.addApiReport({
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
        systemStore.addNotification({
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

  const setCurrentLocation = ({ label, detail, source = 'manual' }) => {
    if (!detail?.trim()) return
    currentLocation.value = {
      source,
      label: label?.trim() || '当前位置',
      detail: detail.trim(),
    }
  }

  const setCurrentLocationByAddressId = (addressId) => {
    const match = addresses.find((item) => item.id === Number(addressId))
    if (!match) return
    setCurrentLocation({ label: match.label, detail: match.detail, source: 'saved' })
  }

  const setTripEndpoint = (endpoint, detail) => {
    if (endpoint !== 'from' && endpoint !== 'to') return
    tripForm[endpoint] = typeof detail === 'string' ? detail.trim() : ''
  }

  const applyAddressToTripEndpoint = (addressId, endpoint) => {
    if (endpoint !== 'from' && endpoint !== 'to') return false
    const match = addresses.find((item) => item.id === Number(addressId))
    if (!match) return false
    setTripEndpoint(endpoint, match.detail)
    return true
  }

  const addAddress = ({ label, detail }) => {
    if (!label?.trim() || !detail?.trim()) return false
    addresses.push({
      id: Date.now(),
      label: label.trim(),
      detail: detail.trim(),
    })
    return true
  }

  const removeAddress = (addressId) => {
    const index = addresses.findIndex((item) => item.id === Number(addressId))
    if (index < 0) return
    addresses.splice(index, 1)
  }

  const buildFoodDeliveryMapHandoff = ({ restaurant = {}, categoryKey = '' } = {}) => {
    const current = normalizeCurrentLocation(currentLocation.value)
    const restaurantContext = normalizeFoodDeliveryRestaurantContext(restaurant)
    const normalizedCategory = trimLine(categoryKey, 40)
    const pickupPoint = restaurantContext.address || restaurantContext.name
    const dropoffPoint = current.detail || ''
    const estimate = pickupPoint && dropoffPoint
      ? computeTripEstimate(pickupPoint, dropoffPoint)
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
    const current = normalizeCurrentLocation(currentLocation.value)
    const context = normalizeDeliveryEventLocationContext({
      ownerModule,
      order,
      event,
    })
    const dropoffPoint = context.dropoffPoint || current.detail || ''
    const pickupPoint = context.pickupPoint || context.locationHint || ''
    const estimate = pickupPoint && dropoffPoint
      ? computeTripEstimate(pickupPoint, dropoffPoint)
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

    const from = typeof tripForm.from === 'string' ? tripForm.from.trim() : ''
    const to = typeof tripForm.to === 'string' ? tripForm.to.trim() : ''
    if (!from || !to) return { ok: false, code: 'TRIP_ENDPOINT_EMPTY' }
    if (from === to) return { ok: false, code: 'TRIP_ENDPOINT_SAME' }

    const estimate = computeTripEstimate(from, to)
    const startedAt = Date.now()
    const etaAt = startedAt + estimate.durationSeconds * 1000

    tripState.value = {
      status: TRIP_STATUS_TRAVELING,
      from,
      to,
      fromLabel: resolveAddressLabel(from, '起点'),
      toLabel: resolveAddressLabel(to, '目的地'),
      distanceKm: estimate.distanceKm,
      fare: estimate.fare,
      durationSeconds: estimate.durationSeconds,
      startedAt,
      etaAt,
      arrivedAt: 0,
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
      remotePushPromise,
    }
  }

  const cancelTrip = () => {
    refreshTripState(Date.now())
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_TRAVELING) return false
    const endedAt = Date.now()
    const scheduleId = state.scheduledPushId || (state.startedAt ? createMapTripScheduleId(state.startedAt) : '')
    appendTripHistory({
      id: `trip_hist_${endedAt}`,
      status: 'cancelled',
      from: state.from,
      to: state.to,
      fromLabel: state.fromLabel,
      toLabel: state.toLabel,
      distanceKm: state.distanceKm,
      fare: state.fare,
      durationSeconds: Math.max(
        1,
        Math.floor((endedAt - state.startedAt) / 1000),
      ),
      startedAt: state.startedAt,
      endedAt,
    })
    tripState.value = createIdleTripState()
    runtimeNow.value = endedAt
    clearTripArrivalTimer()
    if (scheduleId) {
      void cancelTripArrivalPushScheduled({
        scheduleId,
        source: 'map_trip_cancel',
      })
    }
    return true
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

    if (Array.isArray(source.addresses)) {
      const normalizedAddresses = source.addresses
        .map((item, index) => normalizeAddressRecord(item, index))
        .filter(Boolean)
      if (normalizedAddresses.length > 0) {
        addresses.splice(0, addresses.length, ...normalizedAddresses)
      }
    }

    currentLocation.value = normalizeCurrentLocation(source.currentLocation)

    const normalizedTripForm = normalizeTripForm(source.tripForm)
    tripForm.from = normalizedTripForm.from
    tripForm.to = normalizedTripForm.to

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
    if (normalizeTripState(tripState.value).status === TRIP_STATUS_TRAVELING) {
      void ensureTripArrivalPushScheduled({
        source: 'map_trip_restore',
      })
    }
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(MAP_STORAGE_KEY, {
      version: MAP_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(MAP_STORAGE_KEY, {
      version: MAP_STORAGE_VERSION,
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
    addresses: addresses.map((item) => ({ ...item })),
    currentLocation: { ...currentLocation.value },
    tripForm: { ...tripForm },
    tripState: { ...tripState.value },
    tripHistory: tripHistory.value.map((item) => ({ ...item })),
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
    mapVisualSettings.value = createDefaultMapVisualSettings()
    mapAutomationRuntime.value = createDefaultMapAutomationRuntime()
    runtimeNow.value = Date.now()
  }

  const setMapAiProviderRunnerForTesting = (runner) => {
    mapProviderRunnerOverride = typeof runner === 'function' ? runner : null
  }

  const persistToStorage = () => {
    writePersistedState(
      MAP_STORAGE_KEY,
      createBackupSnapshot(),
      { version: MAP_STORAGE_VERSION },
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
      addresses,
      currentLocation,
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
        normalizeTripState(tripState.value).startedAt,
        normalizeTripState(tripState.value).etaAt,
      ]
    },
    () => {
      if (!hasFinishedStorageHydration.value) return
      const state = normalizeTripState(tripState.value)
      if (state.status !== TRIP_STATUS_TRAVELING) return
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
    addresses,
    currentLocation,
    currentLocationText,
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
    setCurrentLocation,
    setCurrentLocationByAddressId,
    setTripEndpoint,
    applyAddressToTripEndpoint,
    addAddress,
    removeAddress,
    buildFoodDeliveryMapHandoff,
    buildDeliveryEventMapHandoff,
    startTrip,
    cancelTrip,
    acknowledgeTripArrival,
    confirmMapCalendarReminder,
    setMapCalendarReminderPinned,
    dismissMapCalendarReminder,
    resetMapCalendarReminderPreference,
    refreshTripState,
    tickTripRuntime,
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
    saveNow,
  }
})
