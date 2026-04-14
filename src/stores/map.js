import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'

const MAP_STORAGE_KEY = 'store:map'
const MAP_STORAGE_VERSION = 2
const TRIP_STATUS_IDLE = 'idle'
const TRIP_STATUS_TRAVELING = 'traveling'
const TRIP_STATUS_ARRIVED = 'arrived'
const TRIP_HISTORY_LIMIT = 40
const MAP_VISUAL_MODE_DEFAULT = 'default'
const MAP_VISUAL_MODE_GALLERY = 'gallery'

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
})

const createDefaultMapVisualSettings = () => ({
  mode: MAP_VISUAL_MODE_DEFAULT,
  assetId: '',
  aiVisualEnabled: false,
  onboardingPromptPending: true,
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
    onboardingPromptPending:
      typeof raw.onboardingPromptPending === 'boolean'
        ? raw.onboardingPromptPending
        : fallback.onboardingPromptPending,
  }
}

export const useMapStore = defineStore('map', () => {
  const addresses = reactive(SEED_ADDRESSES.map((item) => ({ ...item })))

  const currentLocation = ref(createDefaultCurrentLocation())

  const tripForm = reactive(createDefaultTripForm())
  const tripState = ref(createIdleTripState())
  const tripHistory = ref([])
  const mapVisualSettings = ref(createDefaultMapVisualSettings())
  const runtimeNow = ref(Date.now())
  let tripArrivalTimer = null
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

  const clearTripArrivalTimer = () => {
    if (tripArrivalTimer === null) return
    clearTimeout(tripArrivalTimer)
    tripArrivalTimer = null
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
    tripState.value = {
      ...state,
      status: TRIP_STATUS_ARRIVED,
      arrivedAt,
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
    return mapVisualSettings.value.aiVisualEnabled
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
    }
    runtimeNow.value = startedAt
    scheduleTripArrivalCheck()
    return {
      ok: true,
      etaAt,
      durationSeconds: estimate.durationSeconds,
    }
  }

  const cancelTrip = () => {
    refreshTripState(Date.now())
    const state = normalizeTripState(tripState.value)
    if (state.status !== TRIP_STATUS_TRAVELING) return false
    const endedAt = Date.now()
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

    runtimeNow.value = Date.now()
    refreshTripState(runtimeNow.value)
    scheduleTripArrivalCheck()
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
    runtimeNow.value = Date.now()
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
    dismissMapVisualOnboardingPrompt,
    resolveMapVisualMode,
    enforceMapVisualFallback,
    restoreFromBackup,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    resetTripRuntimeForTesting,
    saveNow,
  }
})
