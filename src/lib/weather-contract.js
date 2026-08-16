import { localizeWeatherChineseText } from './weather-chinese'

export const WEATHER_REFRESH_INTERVAL_MS = 30 * 60 * 1000
export const WEATHER_CACHE_STORAGE_KEY = 'schatphone:weather:cache'
export const WEATHER_MAX_SAVED_LOCATIONS = 6

export const WEATHER_WIDGET_ACTION_OPEN = 'open_weather'
export const WEATHER_WIDGET_ACTION_EXPAND = 'toggle_details'
export const WEATHER_WIDGET_ACTION_NONE = 'none'

export const WEATHER_DISPLAY_MODE_WORLD = 'world_location'
export const WEATHER_DISPLAY_MODE_CUSTOM = 'custom'
export const WEATHER_DISPLAY_MODE_SOURCE = 'source_location'

export const WEATHER_DISPLAY_MODES = Object.freeze([
  WEATHER_DISPLAY_MODE_WORLD,
  WEATHER_DISPLAY_MODE_CUSTOM,
  WEATHER_DISPLAY_MODE_SOURCE,
])

export const WEATHER_MAPPING_SCOPE_GLOBAL = 'global'
export const WEATHER_MAPPING_SCOPE_WORLD = 'current_world'

export const WEATHER_WIDGET_ACTIONS = Object.freeze([
  WEATHER_WIDGET_ACTION_OPEN,
  WEATHER_WIDGET_ACTION_EXPAND,
  WEATHER_WIDGET_ACTION_NONE,
])

const WEATHER_WIDGET_ACTION_SET = new Set(WEATHER_WIDGET_ACTIONS)
const WEATHER_DISPLAY_MODE_SET = new Set(WEATHER_DISPLAY_MODES)

export const DEFAULT_WEATHER_LOCATION = Object.freeze({
  id: 'open-meteo-1850147',
  providerId: '1850147',
  name: 'Tokyo',
  nameZh: '东京',
  nameEn: 'Tokyo',
  admin1: 'Tokyo',
  country: 'Japan',
  countryZh: '日本',
  countryEn: 'Japan',
  countryCode: 'JP',
  latitude: 35.6895,
  longitude: 139.69171,
  timezone: 'Asia/Tokyo',
})

const WMO_CONDITION_META = Object.freeze({
  0: ['clear', '晴朗', 'Clear', 'fas fa-sun'],
  1: ['mostly_clear', '大致晴朗', 'Mostly clear', 'fas fa-sun'],
  2: ['partly_cloudy', '局部多云', 'Partly cloudy', 'fas fa-cloud-sun'],
  3: ['overcast', '阴天', 'Overcast', 'fas fa-cloud'],
  45: ['fog', '有雾', 'Fog', 'fas fa-smog'],
  48: ['rime_fog', '雾凇', 'Rime fog', 'fas fa-smog'],
  51: ['drizzle_light', '小毛雨', 'Light drizzle', 'fas fa-cloud-rain'],
  53: ['drizzle', '毛雨', 'Drizzle', 'fas fa-cloud-rain'],
  55: ['drizzle_heavy', '较强毛雨', 'Heavy drizzle', 'fas fa-cloud-rain'],
  56: ['freezing_drizzle_light', '轻微冻毛雨', 'Light freezing drizzle', 'fas fa-cloud-rain'],
  57: ['freezing_drizzle', '冻毛雨', 'Freezing drizzle', 'fas fa-cloud-rain'],
  61: ['rain_light', '小雨', 'Light rain', 'fas fa-cloud-rain'],
  63: ['rain', '中雨', 'Rain', 'fas fa-cloud-showers-heavy'],
  65: ['rain_heavy', '大雨', 'Heavy rain', 'fas fa-cloud-showers-heavy'],
  66: ['freezing_rain_light', '轻微冻雨', 'Light freezing rain', 'fas fa-cloud-rain'],
  67: ['freezing_rain', '冻雨', 'Freezing rain', 'fas fa-cloud-showers-heavy'],
  71: ['snow_light', '小雪', 'Light snow', 'fas fa-snowflake'],
  73: ['snow', '中雪', 'Snow', 'fas fa-snowflake'],
  75: ['snow_heavy', '大雪', 'Heavy snow', 'fas fa-snowflake'],
  77: ['snow_grains', '米雪', 'Snow grains', 'fas fa-snowflake'],
  80: ['showers_light', '零星阵雨', 'Light showers', 'fas fa-cloud-sun-rain'],
  81: ['showers', '阵雨', 'Showers', 'fas fa-cloud-showers-heavy'],
  82: ['showers_heavy', '强阵雨', 'Heavy showers', 'fas fa-cloud-showers-heavy'],
  85: ['snow_showers_light', '轻微阵雪', 'Light snow showers', 'fas fa-snowflake'],
  86: ['snow_showers', '阵雪', 'Snow showers', 'fas fa-snowflake'],
  95: ['thunderstorm', '雷暴', 'Thunderstorm', 'fas fa-cloud-bolt'],
  96: ['thunderstorm_hail_light', '雷暴伴小冰雹', 'Thunderstorm with light hail', 'fas fa-cloud-bolt'],
  99: ['thunderstorm_hail', '雷暴伴冰雹', 'Thunderstorm with hail', 'fas fa-cloud-bolt'],
})

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const trimText = (value, fallback = '', max = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeCoordinate = (value, min, max, fallback) => {
  const parsed = toFiniteNumber(value, fallback)
  return Math.min(max, Math.max(min, parsed))
}

export const createWeatherLocationId = (raw = {}) => {
  const providerId = trimText(raw.providerId || raw.id, '', 80)
  if (providerId) return `open-meteo-${providerId.replace(/^open-meteo-/, '')}`
  const latitude = normalizeCoordinate(raw.latitude, -90, 90, 0).toFixed(4)
  const longitude = normalizeCoordinate(raw.longitude, -180, 180, 0).toFixed(4)
  return `coordinates-${latitude}-${longitude}`
}

export const normalizeWeatherLocation = (raw, fallback = DEFAULT_WEATHER_LOCATION) => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const fallbackSource = fallback && typeof fallback === 'object' ? fallback : DEFAULT_WEATHER_LOCATION
  const name = trimText(source.name, trimText(fallbackSource.name, 'Tokyo', 80), 80)
  const hasOwnLocationIdentity = Boolean(
    trimText(source.name, '', 80) ||
      trimText(source.providerId || source.id, '', 80) ||
      Number.isFinite(Number(source.latitude)) ||
      Number.isFinite(Number(source.longitude)),
  )
  const fallbackNameZh = hasOwnLocationIdentity ? name : trimText(fallbackSource.nameZh, name, 80)
  const fallbackNameEn = hasOwnLocationIdentity ? name : trimText(fallbackSource.nameEn, name, 80)
  const sourceCountry = trimText(source.country, '', 80)
  const fallbackCountry = hasOwnLocationIdentity ? '' : trimText(fallbackSource.country, '', 80)
  const country = sourceCountry || fallbackCountry
  const fallbackCountryZh = sourceCountry
    ? sourceCountry
    : trimText(fallbackSource.countryZh, country, 80)
  const fallbackCountryEn = sourceCountry
    ? sourceCountry
    : trimText(fallbackSource.countryEn, country, 80)
  const normalized = {
    id: '',
    providerId: trimText(
      source.providerId || source.id,
      hasOwnLocationIdentity ? '' : trimText(fallbackSource.providerId, '', 80),
      80,
    )
      .replace(/^open-meteo-/, ''),
    name,
    nameZh: trimText(source.nameZh, fallbackNameZh, 80),
    nameEn: trimText(source.nameEn, fallbackNameEn, 80),
    admin1: trimText(
      source.admin1,
      hasOwnLocationIdentity ? '' : trimText(fallbackSource.admin1, '', 80),
      80,
    ),
    country,
    countryZh: trimText(source.countryZh, fallbackCountryZh, 80),
    countryEn: trimText(source.countryEn, fallbackCountryEn, 80),
    countryCode: trimText(
      source.countryCode || source.country_code,
      hasOwnLocationIdentity ? '' : fallbackSource.countryCode || '',
      8,
    ).toUpperCase(),
    latitude: normalizeCoordinate(source.latitude, -90, 90, fallbackSource.latitude),
    longitude: normalizeCoordinate(source.longitude, -180, 180, fallbackSource.longitude),
    timezone: trimText(
      source.timezone,
      hasOwnLocationIdentity ? 'auto' : trimText(fallbackSource.timezone, 'auto', 80),
      80,
    ),
  }
  normalized.id = createWeatherLocationId({ ...normalized, id: source.id })
  return normalized
}

export const normalizeWeatherWidgetAction = (value) => {
  const normalized = trimText(value, '').toLowerCase()
  return WEATHER_WIDGET_ACTION_SET.has(normalized) ? normalized : WEATHER_WIDGET_ACTION_OPEN
}

const normalizeWeatherSourceLocationId = (value, fallback, validLocationIds) => {
  const normalized = trimText(value, '', 120)
  if (normalized && (!validLocationIds || validLocationIds.has(normalized))) return normalized
  return fallback
}

export const createDefaultWeatherMapping = (
  sourceLocationId = DEFAULT_WEATHER_LOCATION.id,
) => ({
  displayMode: WEATHER_DISPLAY_MODE_SOURCE,
  displayName: '',
  sourceLocationId: trimText(sourceLocationId, DEFAULT_WEATHER_LOCATION.id, 120),
  exposeSourceLocationToAi: false,
})

export const normalizeWeatherMapping = (raw, options = {}) => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const fallback = options.fallback && typeof options.fallback === 'object'
    ? options.fallback
    : createDefaultWeatherMapping(options.fallbackSourceLocationId)
  const validLocationIds = options.validLocationIds instanceof Set
    ? options.validLocationIds
    : null
  const requestedMode = trimText(source.displayMode, fallback.displayMode, 40)
  const displayMode = WEATHER_DISPLAY_MODE_SET.has(requestedMode)
    ? requestedMode
    : WEATHER_DISPLAY_MODE_SOURCE
  const fallbackSourceLocationId = normalizeWeatherSourceLocationId(
    fallback.sourceLocationId,
    DEFAULT_WEATHER_LOCATION.id,
    validLocationIds,
  )

  return {
    displayMode,
    displayName: trimText(source.displayName, '', 80),
    sourceLocationId: normalizeWeatherSourceLocationId(
      source.sourceLocationId,
      fallbackSourceLocationId,
      validLocationIds,
    ),
    exposeSourceLocationToAi: source.exposeSourceLocationToAi === true,
  }
}

export const resolveWeatherMappingForWorld = (weatherSettings, worldId = '') => {
  const normalized = normalizeWeatherSettings(weatherSettings)
  const normalizedWorldId = trimText(worldId, '', 120)
  return normalizedWorldId && normalized.mapping.byWorld[normalizedWorldId]
    ? normalized.mapping.byWorld[normalizedWorldId]
    : normalized.mapping.global
}

export const resolveWeatherDisplayLocationName = ({
  mapping,
  sourceLocation,
  worldLocationName = '',
  language = 'en',
} = {}) => {
  const normalizedSource = normalizeWeatherLocation(sourceLocation)
  const normalizedMapping = normalizeWeatherMapping(mapping, {
    fallbackSourceLocationId: normalizedSource.id,
    validLocationIds: new Set([normalizedSource.id]),
  })
  if (normalizedMapping.displayMode === WEATHER_DISPLAY_MODE_CUSTOM && normalizedMapping.displayName) {
    return normalizedMapping.displayName
  }
  if (normalizedMapping.displayMode === WEATHER_DISPLAY_MODE_WORLD) {
    const normalizedWorldLocation = trimText(worldLocationName, '', 80)
    if (normalizedWorldLocation) return normalizedWorldLocation
  }
  return resolveWeatherLocationName(normalizedSource, language)
}

export const createDefaultWeatherSettings = () => ({
  savedLocations: [{ ...DEFAULT_WEATHER_LOCATION }],
  activeLocationId: DEFAULT_WEATHER_LOCATION.id,
  widgetAction: WEATHER_WIDGET_ACTION_OPEN,
  mapping: {
    global: createDefaultWeatherMapping(),
    byWorld: {},
  },
})

export const normalizeWeatherSettings = (raw) => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const normalizedLocations = []
  const seenIds = new Set()
  const sourceLocations = Array.isArray(source.savedLocations) ? source.savedLocations : []

  sourceLocations.slice(0, WEATHER_MAX_SAVED_LOCATIONS).forEach((location) => {
    const normalized = normalizeWeatherLocation(location)
    if (seenIds.has(normalized.id)) return
    seenIds.add(normalized.id)
    normalizedLocations.push(normalized)
  })

  if (normalizedLocations.length === 0) normalizedLocations.push({ ...DEFAULT_WEATHER_LOCATION })
  const requestedActiveId = trimText(source.activeLocationId, '', 120)
  const activeLocationId = normalizedLocations.some((location) => location.id === requestedActiveId)
    ? requestedActiveId
    : normalizedLocations[0].id
  const validLocationIds = new Set(normalizedLocations.map((location) => location.id))
  const sourceMapping = source.mapping && typeof source.mapping === 'object' && !Array.isArray(source.mapping)
    ? source.mapping
    : {}
  const globalMapping = normalizeWeatherMapping(sourceMapping.global, {
    fallback: createDefaultWeatherMapping(activeLocationId),
    validLocationIds,
  })
  const byWorld = Object.fromEntries(
    Object.entries(
      sourceMapping.byWorld && typeof sourceMapping.byWorld === 'object' && !Array.isArray(sourceMapping.byWorld)
        ? sourceMapping.byWorld
        : {},
    )
      .map(([worldId, mapping]) => [
        trimText(worldId, '', 120),
        normalizeWeatherMapping(mapping, { fallback: globalMapping, validLocationIds }),
      ])
      .filter(([worldId]) => Boolean(worldId))
      .slice(0, 24),
  )

  return {
    savedLocations: normalizedLocations,
    activeLocationId,
    widgetAction: normalizeWeatherWidgetAction(source.widgetAction),
    mapping: {
      global: globalMapping,
      byWorld,
    },
  }
}

export const resolveWeatherLocationName = (location, language = 'en') => {
  const normalized = normalizeWeatherLocation(location)
  return String(language || '').toLowerCase().startsWith('zh')
    ? localizeWeatherChineseText(normalized.nameZh || normalized.name, language)
    : normalized.nameEn || normalized.name
}

export const resolveWeatherLocationCountry = (location, language = 'en') => {
  const normalized = normalizeWeatherLocation(location)
  return String(language || '').toLowerCase().startsWith('zh')
    ? localizeWeatherChineseText(normalized.countryZh || normalized.country, language)
    : normalized.countryEn || normalized.country
}

export const resolveWeatherVisualStateFromCode = (weatherCode, isDay = true) => {
  const code = Math.round(toFiniteNumber(weatherCode, 0))
  if (code >= 51) return 'rain'
  if ([2, 3, 45, 48].includes(code)) return 'cloudy'
  return isDay === false || Number(isDay) === 0 ? 'night' : 'clear'
}

export const resolveWeatherConditionMeta = (weatherCode, isDay = true) => {
  const code = Math.round(toFiniteNumber(weatherCode, 0))
  const source = WMO_CONDITION_META[code] || ['unknown', '天气变化', 'Changing weather', 'fas fa-cloud']
  return {
    code,
    key: source[0],
    labelZh: source[1],
    labelEn: source[2],
    icon: source[3],
    visualState: resolveWeatherVisualStateFromCode(code, isDay),
  }
}

export const isWeatherForecastFresh = (forecast, now = Date.now()) => {
  const fetchedAt = toFiniteNumber(forecast?.fetchedAt, 0)
  return fetchedAt > 0 && Math.max(0, now - fetchedAt) < WEATHER_REFRESH_INTERVAL_MS
}
