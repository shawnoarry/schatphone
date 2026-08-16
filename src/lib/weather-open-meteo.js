import {
  normalizeWeatherLocation,
  resolveWeatherConditionMeta,
} from './weather-contract'
import { localizeWeatherChineseText } from './weather-chinese'

export const OPEN_METEO_FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'
export const OPEN_METEO_GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search'

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'rain',
  'showers',
  'snowfall',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
]

const HOURLY_FIELDS = [
  'temperature_2m',
  'precipitation_probability',
  'weather_code',
  'is_day',
]

const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset',
  'precipitation_probability_max',
]

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const roundTemperature = (value) => Math.round(toFiniteNumber(value, 0))
const roundMetric = (value) => Math.round(toFiniteNumber(value, 0) * 10) / 10
const arrayValue = (source, key, index, fallback = null) => {
  const values = source && Array.isArray(source[key]) ? source[key] : []
  return index >= 0 && index < values.length ? values[index] : fallback
}

const createWeatherRequestError = (code, status = 0) => {
  const error = new Error(code)
  error.code = code
  error.status = status
  return error
}

const requestJson = async (url, { fetchImpl = globalThis.fetch, signal } = {}) => {
  if (typeof fetchImpl !== 'function') throw createWeatherRequestError('weather_fetch_unavailable')
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response?.ok) throw createWeatherRequestError('weather_request_failed', response?.status || 0)
  try {
    return await response.json()
  } catch {
    throw createWeatherRequestError('weather_response_invalid', response?.status || 0)
  }
}

export const buildOpenMeteoForecastUrl = (location) => {
  const normalized = normalizeWeatherLocation(location)
  const params = new URLSearchParams({
    latitude: String(normalized.latitude),
    longitude: String(normalized.longitude),
    current: CURRENT_FIELDS.join(','),
    hourly: HOURLY_FIELDS.join(','),
    daily: DAILY_FIELDS.join(','),
    timezone: normalized.timezone || 'auto',
    forecast_days: '7',
  })
  return `${OPEN_METEO_FORECAST_ENDPOINT}?${params.toString()}`
}

export const buildOpenMeteoGeocodingUrl = (query, language = 'en') => {
  const params = new URLSearchParams({
    name: String(query || '').trim(),
    count: '8',
    language: String(language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en',
    format: 'json',
  })
  return `${OPEN_METEO_GEOCODING_ENDPOINT}?${params.toString()}`
}

export const normalizeOpenMeteoLocationResult = (raw, language = 'en') => {
  if (!raw || typeof raw !== 'object') return null
  const isChinese = String(language || '').toLowerCase().startsWith('zh')
  const rawName = typeof raw.name === 'string' ? raw.name.trim() : ''
  const name = isChinese ? localizeWeatherChineseText(rawName, language) : rawName
  if (!name || !Number.isFinite(Number(raw.latitude)) || !Number.isFinite(Number(raw.longitude))) {
    return null
  }
  const rawCountry = typeof raw.country === 'string' ? raw.country.trim() : ''
  const country = isChinese ? localizeWeatherChineseText(rawCountry, language) : rawCountry
  const rawAdmin1 = typeof raw.admin1 === 'string' ? raw.admin1.trim() : ''
  const providerId = raw.id == null ? '' : String(raw.id)
  return normalizeWeatherLocation({
    id: providerId,
    providerId,
    name,
    nameZh: isChinese ? name : '',
    nameEn: isChinese ? '' : name,
    admin1: isChinese ? localizeWeatherChineseText(rawAdmin1, language) : rawAdmin1,
    country,
    countryZh: isChinese ? country : '',
    countryEn: isChinese ? '' : country,
    countryCode: raw.country_code,
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone || 'auto',
  })
}

export const searchOpenMeteoLocations = async (
  query,
  { language = 'en', fetchImpl = globalThis.fetch, signal } = {},
) => {
  const normalizedQuery = String(query || '').trim()
  if (normalizedQuery.length < 2) return []
  const payload = await requestJson(buildOpenMeteoGeocodingUrl(normalizedQuery, language), {
    fetchImpl,
    signal,
  })
  return (Array.isArray(payload?.results) ? payload.results : [])
    .map((item) => normalizeOpenMeteoLocationResult(item, language))
    .filter(Boolean)
}

export const normalizeOpenMeteoForecast = (payload, location, fetchedAt = Date.now()) => {
  if (!payload || typeof payload !== 'object' || !payload.current || !payload.daily) {
    throw createWeatherRequestError('weather_response_incomplete')
  }
  const normalizedLocation = normalizeWeatherLocation(location)
  const current = payload.current
  const currentIsDay = Number(current.is_day) !== 0
  const currentCondition = resolveWeatherConditionMeta(current.weather_code, currentIsDay)
  const daily = payload.daily
  const currentTime = typeof current.time === 'string' ? current.time : ''
  const hourlyTimes = Array.isArray(payload.hourly?.time) ? payload.hourly.time : []
  let hourlyStartIndex = hourlyTimes.findIndex((time) => time >= currentTime)
  if (hourlyStartIndex < 0) hourlyStartIndex = 0

  const hourly = hourlyTimes.slice(hourlyStartIndex, hourlyStartIndex + 24).map((time, offset) => {
    const index = hourlyStartIndex + offset
    const isDay = Number(arrayValue(payload.hourly, 'is_day', index, 1)) !== 0
    const weatherCode = Math.round(toFiniteNumber(arrayValue(payload.hourly, 'weather_code', index, 0), 0))
    return {
      time,
      temperature: roundTemperature(arrayValue(payload.hourly, 'temperature_2m', index, 0)),
      precipitationProbability: Math.round(
        toFiniteNumber(arrayValue(payload.hourly, 'precipitation_probability', index, 0), 0),
      ),
      weatherCode,
      isDay,
      condition: resolveWeatherConditionMeta(weatherCode, isDay),
    }
  })

  const dailyTimes = Array.isArray(daily.time) ? daily.time : []
  const dailyForecast = dailyTimes.slice(0, 7).map((date, index) => {
    const weatherCode = Math.round(toFiniteNumber(arrayValue(daily, 'weather_code', index, 0), 0))
    return {
      date,
      weatherCode,
      condition: resolveWeatherConditionMeta(weatherCode, true),
      high: roundTemperature(arrayValue(daily, 'temperature_2m_max', index, 0)),
      low: roundTemperature(arrayValue(daily, 'temperature_2m_min', index, 0)),
      precipitationProbability: Math.round(
        toFiniteNumber(arrayValue(daily, 'precipitation_probability_max', index, 0), 0),
      ),
      sunrise: arrayValue(daily, 'sunrise', index, ''),
      sunset: arrayValue(daily, 'sunset', index, ''),
    }
  })

  return {
    provider: 'open-meteo',
    fetchedAt: Math.max(0, toFiniteNumber(fetchedAt, Date.now())),
    timezone: typeof payload.timezone === 'string' ? payload.timezone : normalizedLocation.timezone,
    utcOffsetSeconds: Math.round(toFiniteNumber(payload.utc_offset_seconds, 0)),
    location: normalizedLocation,
    current: {
      time: currentTime,
      temperature: roundTemperature(current.temperature_2m),
      apparentTemperature: roundTemperature(current.apparent_temperature),
      humidity: Math.round(toFiniteNumber(current.relative_humidity_2m, 0)),
      isDay: currentIsDay,
      weatherCode: currentCondition.code,
      condition: currentCondition,
      visualState: currentCondition.visualState,
      precipitation: roundMetric(current.precipitation),
      rain: roundMetric(current.rain),
      showers: roundMetric(current.showers),
      snowfall: roundMetric(current.snowfall),
      cloudCover: Math.round(toFiniteNumber(current.cloud_cover, 0)),
      pressure: Math.round(toFiniteNumber(current.pressure_msl, 0)),
      windSpeed: roundMetric(current.wind_speed_10m),
      windDirection: Math.round(toFiniteNumber(current.wind_direction_10m, 0)),
      windGusts: roundMetric(current.wind_gusts_10m),
      high: dailyForecast[0]?.high ?? 0,
      low: dailyForecast[0]?.low ?? 0,
      precipitationProbability: dailyForecast[0]?.precipitationProbability ?? 0,
      sunrise: dailyForecast[0]?.sunrise || '',
      sunset: dailyForecast[0]?.sunset || '',
    },
    hourly,
    daily: dailyForecast,
  }
}

export const fetchOpenMeteoForecast = async (
  location,
  { fetchImpl = globalThis.fetch, signal, fetchedAt = Date.now() } = {},
) => {
  const normalizedLocation = normalizeWeatherLocation(location)
  const payload = await requestJson(buildOpenMeteoForecastUrl(normalizedLocation), {
    fetchImpl,
    signal,
  })
  return normalizeOpenMeteoForecast(payload, normalizedLocation, fetchedAt)
}
