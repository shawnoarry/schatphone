import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import {
  WEATHER_CACHE_STORAGE_KEY,
  WEATHER_MAPPING_SCOPE_GLOBAL,
  WEATHER_MAPPING_SCOPE_WORLD,
  WEATHER_MAX_SAVED_LOCATIONS,
  isWeatherForecastFresh,
  normalizeWeatherLocation,
  normalizeWeatherMapping,
  normalizeWeatherSettings,
  resolveWeatherDisplayLocationName,
} from '../lib/weather-contract'
import { LEGACY_SINGLE_WORLD_ID } from '../lib/world-interface'
import {
  fetchOpenMeteoForecast,
  searchOpenMeteoLocations,
} from '../lib/weather-open-meteo'
import { buildWeatherSearchQueries } from '../lib/weather-chinese'
import { useSystemStore } from './system'
import { useMapStore } from './map'

const WEATHER_CACHE_VERSION = 1
const WEATHER_SEARCH_RESULT_LIMIT = 8

const normalizeWeatherSearchText = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()

const searchSavedWeatherLocations = (locations, queries) => {
  const tokenGroups = (Array.isArray(queries) ? queries : [queries])
    .map((query) => normalizeWeatherSearchText(query).split(/\s+/).filter(Boolean))
    .filter((tokens) => tokens.length > 0)
  if (tokenGroups.length === 0) return []
  return (Array.isArray(locations) ? locations : []).filter((location) => {
    const searchableText = normalizeWeatherSearchText([
      location?.name,
      location?.nameZh,
      location?.nameEn,
      location?.admin1,
      location?.country,
      location?.countryZh,
      location?.countryEn,
      location?.countryCode,
    ].filter(Boolean).join(' '))
    return tokenGroups.some((tokens) =>
      tokens.every((token) => searchableText.includes(token)),
    )
  })
}

const mergeWeatherLocationResults = (...groups) => {
  const seenIds = new Set()
  return groups.flat().reduce((results, location) => {
    const normalized = normalizeWeatherLocation(location)
    if (seenIds.has(normalized.id)) return results
    seenIds.add(normalized.id)
    results.push(normalized)
    return results
  }, []).slice(0, WEATHER_SEARCH_RESULT_LIMIT)
}

const hasBrowserStorage = () =>
  typeof window !== 'undefined' && Boolean(window.localStorage)

const normalizeCachedForecast = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (!value.current || !Array.isArray(value.hourly) || !Array.isArray(value.daily)) return null
  const fetchedAt = Number(value.fetchedAt)
  if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return null
  return {
    ...value,
    fetchedAt,
    location: normalizeWeatherLocation(value.location),
    hourly: value.hourly.slice(0, 24),
    daily: value.daily.slice(0, 7),
  }
}

const readWeatherCache = () => {
  if (!hasBrowserStorage()) return {}
  try {
    const envelope = JSON.parse(window.localStorage.getItem(WEATHER_CACHE_STORAGE_KEY) || 'null')
    if (envelope?.version !== WEATHER_CACHE_VERSION || !envelope.entries) return {}
    return Object.fromEntries(
      Object.entries(envelope.entries)
        .map(([locationId, forecast]) => [locationId, normalizeCachedForecast(forecast)])
        .filter(([, forecast]) => Boolean(forecast))
        .slice(0, WEATHER_MAX_SAVED_LOCATIONS),
    )
  } catch {
    return {}
  }
}

const writeWeatherCache = (entries) => {
  if (!hasBrowserStorage()) return false
  try {
    window.localStorage.setItem(
      WEATHER_CACHE_STORAGE_KEY,
      JSON.stringify({
        version: WEATHER_CACHE_VERSION,
        entries: Object.fromEntries(
          Object.entries(entries)
            .filter(([, forecast]) => Boolean(normalizeCachedForecast(forecast)))
            .slice(0, WEATHER_MAX_SAVED_LOCATIONS),
        ),
      }),
    )
    return true
  } catch {
    return false
  }
}

export const useWeatherStore = defineStore('weather', () => {
  const systemStore = useSystemStore()
  const mapStore = useMapStore()
  const forecastsByLocation = reactive(readWeatherCache())
  const loadingLocationIds = reactive({})
  const errorByLocation = reactive({})
  const searchResults = ref([])
  const searchLoading = ref(false)
  const searchError = ref('')
  let searchRequestId = 0

  const settings = computed(() => normalizeWeatherSettings(systemStore.settings.weather))
  const savedLocations = computed(() => settings.value.savedLocations)
  const currentWorldId = computed(() => LEGACY_SINGLE_WORLD_ID)
  const worldMappingOverride = computed(
    () => settings.value.mapping.byWorld[currentWorldId.value] || null,
  )
  const activeMapping = computed(
    () => worldMappingOverride.value || settings.value.mapping.global,
  )
  const activeMappingScope = computed(() =>
    worldMappingOverride.value ? WEATHER_MAPPING_SCOPE_WORLD : WEATHER_MAPPING_SCOPE_GLOBAL,
  )
  const activeLocation = computed(
    () =>
      savedLocations.value.find((location) => location.id === activeMapping.value.sourceLocationId) ||
      savedLocations.value[0],
  )
  const worldLocationName = computed(() => {
    const currentLocation = mapStore.currentLocation
    return typeof currentLocation?.detail === 'string' && currentLocation.detail.trim()
      ? currentLocation.detail.trim()
      : typeof currentLocation?.label === 'string'
        ? currentLocation.label.trim()
        : ''
  })
  const displayLocationName = computed(() => resolveWeatherDisplayLocationName({
    mapping: activeMapping.value,
    sourceLocation: activeLocation.value,
    worldLocationName: worldLocationName.value,
    language: systemStore.settings.system.language,
  }))
  const activeForecast = computed(() => forecastsByLocation[activeLocation.value?.id] || null)
  const isLoading = computed(() => loadingLocationIds[activeLocation.value?.id] === true)
  const error = computed(() => errorByLocation[activeLocation.value?.id] || '')
  const isStale = computed(() =>
    activeForecast.value ? !isWeatherForecastFresh(activeForecast.value) : false,
  )

  const persistCache = () => writeWeatherCache(forecastsByLocation)

  const refreshLocation = async (
    location = activeLocation.value,
    { force = false, fetchImpl = globalThis.fetch } = {},
  ) => {
    if (!location) return null
    const normalizedLocation = normalizeWeatherLocation(location)
    const cached = forecastsByLocation[normalizedLocation.id]
    if (!force && isWeatherForecastFresh(cached)) return cached
    if (loadingLocationIds[normalizedLocation.id]) return cached || null

    loadingLocationIds[normalizedLocation.id] = true
    errorByLocation[normalizedLocation.id] = ''
    try {
      const forecast = await fetchOpenMeteoForecast(normalizedLocation, { fetchImpl })
      forecastsByLocation[normalizedLocation.id] = forecast
      persistCache()
      return forecast
    } catch (requestError) {
      errorByLocation[normalizedLocation.id] = requestError?.code || 'weather_request_failed'
      return cached || null
    } finally {
      loadingLocationIds[normalizedLocation.id] = false
    }
  }

  const refresh = (options = {}) => refreshLocation(activeLocation.value, options)

  const searchLocations = async (
    query,
    { language = systemStore.settings.system.language, fetchImpl = globalThis.fetch } = {},
  ) => {
    const requestId = ++searchRequestId
    const immediateLocalResults = searchSavedWeatherLocations(savedLocations.value, query)
    let localResults = immediateLocalResults
    searchLoading.value = true
    searchError.value = ''
    searchResults.value = immediateLocalResults
    try {
      const queryVariants = await buildWeatherSearchQueries(query)
      localResults = searchSavedWeatherLocations(savedLocations.value, queryVariants)
      if (requestId === searchRequestId) searchResults.value = localResults

      const onlineRequests = await Promise.allSettled(
        queryVariants.map((variant) =>
          searchOpenMeteoLocations(variant, { language, fetchImpl }),
        ),
      )
      const onlineResults = onlineRequests.flatMap((request) =>
        request.status === 'fulfilled' ? request.value : [],
      )
      const firstFailure = onlineRequests.find((request) => request.status === 'rejected')
      if (onlineRequests.length > 0 &&
        onlineRequests.every((request) => request.status === 'rejected')) {
        throw firstFailure.reason
      }
      const results = mergeWeatherLocationResults(localResults, onlineResults)
      if (requestId === searchRequestId) searchResults.value = results
      return results
    } catch (requestError) {
      if (requestId === searchRequestId) {
        searchResults.value = localResults
        searchError.value = localResults.length > 0
          ? ''
          : requestError?.code || 'weather_request_failed'
      }
      return localResults
    } finally {
      if (requestId === searchRequestId) searchLoading.value = false
    }
  }

  const clearSearch = () => {
    searchRequestId += 1
    searchResults.value = []
    searchLoading.value = false
    searchError.value = ''
  }

  const addLocation = (location) => {
    const normalized = normalizeWeatherLocation(location)
    const nextLocations = [
      normalized,
      ...savedLocations.value.filter((item) => item.id !== normalized.id),
    ].slice(0, WEATHER_MAX_SAVED_LOCATIONS)
    systemStore.setWeatherSettings({ savedLocations: nextLocations })
    return normalized
  }

  const saveMapping = async (mapping, {
    scope = WEATHER_MAPPING_SCOPE_WORLD,
    worldId = currentWorldId.value,
    refresh = true,
    fetchImpl = globalThis.fetch,
  } = {}) => {
    const normalized = normalizeWeatherMapping(mapping, {
      fallback: activeMapping.value,
      validLocationIds: new Set(savedLocations.value.map((location) => location.id)),
    })
    if (scope === WEATHER_MAPPING_SCOPE_GLOBAL) {
      systemStore.setWeatherSettings({
        activeLocationId: normalized.sourceLocationId,
        mapping: { global: normalized },
      })
    } else {
      const normalizedWorldId = typeof worldId === 'string' && worldId.trim()
        ? worldId.trim().slice(0, 120)
        : currentWorldId.value
      systemStore.setWeatherSettings({
        activeLocationId: normalized.sourceLocationId,
        mapping: {
          byWorld: {
            ...settings.value.mapping.byWorld,
            [normalizedWorldId]: normalized,
          },
        },
      })
    }
    clearSearch()
    return refresh ? refreshLocation(activeLocation.value, { force: true, fetchImpl }) : normalized
  }

  const clearWorldMapping = async ({
    worldId = currentWorldId.value,
    refresh = true,
    fetchImpl = globalThis.fetch,
  } = {}) => {
    const normalizedWorldId = typeof worldId === 'string' && worldId.trim()
      ? worldId.trim().slice(0, 120)
      : currentWorldId.value
    const nextByWorld = { ...settings.value.mapping.byWorld }
    if (!nextByWorld[normalizedWorldId]) return false
    delete nextByWorld[normalizedWorldId]
    systemStore.setWeatherSettings({
      activeLocationId: settings.value.mapping.global.sourceLocationId,
      mapping: { byWorld: nextByWorld },
    })
    if (refresh) await refreshLocation(activeLocation.value, { force: true, fetchImpl })
    return true
  }

  const selectLocation = async (location, options = {}) => {
    const normalized = addLocation(location)
    return saveMapping({ ...activeMapping.value, sourceLocationId: normalized.id }, {
      scope: activeMappingScope.value,
      ...options,
    })
  }

  const setActiveLocation = async (locationId, options = {}) => {
    const nextLocation = savedLocations.value.find((location) => location.id === locationId)
    if (!nextLocation) return null
    return saveMapping({ ...activeMapping.value, sourceLocationId: nextLocation.id }, {
      scope: activeMappingScope.value,
      ...options,
    })
  }

  const removeLocation = (locationId) => {
    if (savedLocations.value.length <= 1) return false
    const nextLocations = savedLocations.value.filter((location) => location.id !== locationId)
    if (nextLocations.length === savedLocations.value.length) return false
    const fallbackLocationId = nextLocations[0].id
    const replaceRemovedSource = (mapping) => mapping.sourceLocationId === locationId
      ? { ...mapping, sourceLocationId: fallbackLocationId }
      : mapping
    systemStore.setWeatherSettings({
      savedLocations: nextLocations,
      activeLocationId:
        settings.value.activeLocationId === locationId
          ? fallbackLocationId
          : settings.value.activeLocationId,
      mapping: {
        global: replaceRemovedSource(settings.value.mapping.global),
        byWorld: Object.fromEntries(
          Object.entries(settings.value.mapping.byWorld).map(([worldId, mapping]) => [
            worldId,
            replaceRemovedSource(mapping),
          ]),
        ),
      },
    })
    delete forecastsByLocation[locationId]
    delete errorByLocation[locationId]
    persistCache()
    return true
  }

  return {
    forecastsByLocation,
    searchResults,
    searchLoading,
    searchError,
    settings,
    savedLocations,
    currentWorldId,
    worldMappingOverride,
    activeMapping,
    activeMappingScope,
    activeLocation,
    worldLocationName,
    displayLocationName,
    activeForecast,
    isLoading,
    isStale,
    error,
    refresh,
    refreshLocation,
    searchLocations,
    clearSearch,
    addLocation,
    saveMapping,
    clearWorldMapping,
    selectLocation,
    setActiveLocation,
    removeLocation,
  }
})
