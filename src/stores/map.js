import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { callAI, formatApiErrorForUi } from '../lib/ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from '../lib/chat-response'
import {
  cancelScheduledPushNotification,
  schedulePushNotification,
} from '../lib/push'
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
  }
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
    const notification = buildTripArrivalNotification(state)

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

  const mapAutomationTaskHandler = async (task, context = {}) => {
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
      mode: settings.mode,
      assetId: settings.assetId,
      providerMode: providerResult.mode,
      providerApplied: providerResult.ok,
    }
  }

  const drainMapAutomationQueue = async (maxRounds = 2) => {
    const systemStore = getSystemStore()
    const rounds = Math.max(1, toInt(maxRounds, 2))
    for (let i = 0; i < rounds; i += 1) {
      const result = await systemStore.runAiAutomationQueueTick(Date.now())
      if (!result?.handled) break
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
    mapVisualSettings: { ...mapVisualSettings.value },
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const resetTripRuntimeForTesting = () => {
    clearTripArrivalTimer()
    tripState.value = createIdleTripState()
    tripHistory.value = []
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
    [addresses, currentLocation, tripForm, tripState, tripHistory, mapVisualSettings],
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

  return {
    addresses,
    currentLocation,
    currentLocationText,
    tripForm,
    tripEstimate,
    tripState,
    tripRuntime,
    tripHistory,
    mapVisualSettings,
    mapAutomationRuntime,
    mapAiVisualAutomationPolicy,
    setCurrentLocation,
    setCurrentLocationByAddressId,
    setTripEndpoint,
    applyAddressToTripEndpoint,
    addAddress,
    removeAddress,
    startTrip,
    cancelTrip,
    acknowledgeTripArrival,
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
