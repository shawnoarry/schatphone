import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import WeatherView from '../src/views/WeatherView.vue'
import {
  normalizeOpenMeteoForecast,
  normalizeOpenMeteoLocationResult,
} from '../src/lib/weather-open-meteo'
import {
  WEATHER_CACHE_STORAGE_KEY,
  WEATHER_DISPLAY_MODE_CUSTOM,
  WEATHER_MAPPING_SCOPE_WORLD,
  normalizeWeatherSettings,
  resolveWeatherLocationCountry,
  resolveWeatherLocationName,
} from '../src/lib/weather-contract'
import { buildWeatherWorldProjection } from '../src/lib/weather-world-projection'
import { useSystemStore } from '../src/stores/system'
import { useWeatherStore } from '../src/stores/weather'

const TOKYO_FORECAST_PAYLOAD = {
  timezone: 'Asia/Tokyo',
  utc_offset_seconds: 32400,
  current: {
    time: '2026-08-15T16:00',
    temperature_2m: 29.4,
    relative_humidity_2m: 72,
    apparent_temperature: 32.1,
    is_day: 1,
    precipitation: 0,
    rain: 0,
    showers: 0,
    snowfall: 0,
    weather_code: 2,
    cloud_cover: 46,
    pressure_msl: 1008,
    wind_speed_10m: 12.4,
    wind_direction_10m: 160,
    wind_gusts_10m: 19.2,
  },
  hourly: {
    time: ['2026-08-15T15:00', '2026-08-15T16:00', '2026-08-15T17:00'],
    temperature_2m: [30, 29, 28],
    precipitation_probability: [10, 20, 30],
    weather_code: [1, 2, 61],
    is_day: [1, 1, 1],
  },
  daily: {
    time: ['2026-08-15', '2026-08-16'],
    weather_code: [2, 61],
    temperature_2m_max: [31, 27],
    temperature_2m_min: [24, 23],
    sunrise: ['2026-08-15T05:01', '2026-08-16T05:02'],
    sunset: ['2026-08-15T18:31', '2026-08-16T18:30'],
    precipitation_probability_max: [30, 78],
  },
}

const VANCOUVER_LOCATION = {
  id: 'open-meteo-6173331',
  providerId: '6173331',
  name: 'Vancouver',
  nameZh: '温哥华',
  nameEn: 'Vancouver',
  country: 'Canada',
  countryZh: '加拿大',
  countryEn: 'Canada',
  latitude: 49.2827,
  longitude: -123.1207,
  timezone: 'America/Vancouver',
}

const VANCOUVER_TRADITIONAL_LOCATION = {
  ...VANCOUVER_LOCATION,
  name: '溫哥華',
  nameZh: '溫哥華',
}

const jsonResponse = (payload) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(payload),
})

describe('Weather feature', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('keeps a searched city identity instead of inheriting Tokyo translations', () => {
    const shanghai = normalizeOpenMeteoLocationResult(
      {
        id: 1796236,
        name: 'Shanghai',
        country: 'China',
        country_code: 'CN',
        latitude: 31.22222,
        longitude: 121.45806,
        timezone: 'Asia/Shanghai',
      },
      'en',
    )

    expect(shanghai).toMatchObject({
      id: 'open-meteo-1796236',
      nameZh: 'Shanghai',
      nameEn: 'Shanghai',
      countryZh: 'China',
      countryEn: 'China',
      admin1: '',
      countryCode: 'CN',
      timezone: 'Asia/Shanghai',
    })
  })

  test('normalizes exact provider conditions while mapping the widget to a visual state', () => {
    const forecast = normalizeOpenMeteoForecast(
      TOKYO_FORECAST_PAYLOAD,
      useSystemStore().settings.weather.savedLocations[0],
      1000,
    )

    expect(forecast.current).toMatchObject({
      temperature: 29,
      apparentTemperature: 32,
      weatherCode: 2,
      visualState: 'cloudy',
      high: 31,
      low: 24,
    })
    expect(forecast.hourly).toHaveLength(2)
    expect(forecast.hourly[1].condition.key).toBe('rain_light')
    expect(forecast.daily[1].precipitationProbability).toBe(78)
  })

  test('uses a fresh rebuildable cache and persists city and widget preferences separately', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(TOKYO_FORECAST_PAYLOAD))
    const systemStore = useSystemStore()
    const weatherStore = useWeatherStore()

    await weatherStore.refresh({ fetchImpl })
    await weatherStore.refresh({ fetchImpl })
    systemStore.setWeatherWidgetAction('none')

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(weatherStore.activeForecast.current.temperature).toBe(29)
    expect(systemStore.settings.weather.widgetAction).toBe('none')
    expect(JSON.parse(localStorage.getItem(WEATHER_CACHE_STORAGE_KEY))).toMatchObject({
      version: 1,
      entries: {
        'open-meteo-1850147': { provider: 'open-meteo' },
      },
    })
  })

  test('finds a saved traditional city name from simplified input when online geocoding cannot', async () => {
    const weatherStore = useWeatherStore()
    weatherStore.addLocation(VANCOUVER_TRADITIONAL_LOCATION)
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))

    const results = await weatherStore.searchLocations('温哥华', {
      language: 'zh-CN',
      fetchImpl,
    })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      id: VANCOUVER_LOCATION.id,
      nameZh: '溫哥華',
      countryZh: '加拿大',
    })
    expect(resolveWeatherLocationName(results[0], 'zh-CN')).toBe('温哥华')
    expect(resolveWeatherLocationCountry(results[0], 'zh-CN')).toBe('加拿大')
    expect(weatherStore.searchResults).toEqual(results)
    expect(weatherStore.searchError).toBe('')
  })

  test('queries a traditional variant and localizes the provider result for simplified Chinese', async () => {
    const weatherStore = useWeatherStore()
    const requestedQueries = []
    const fetchImpl = vi.fn().mockImplementation((url) => {
      const query = new URL(url).searchParams.get('name')
      requestedQueries.push(query)
      return Promise.resolve(jsonResponse({
        results: query === '溫哥華'
          ? [{
              id: 6173331,
              name: '溫哥華',
              country: '加拿大',
              country_code: 'CA',
              latitude: 49.24966,
              longitude: -123.11934,
              timezone: 'America/Vancouver',
            }]
          : [],
      }))
    })

    const results = await weatherStore.searchLocations('温哥华', {
      language: 'zh-CN',
      fetchImpl,
    })

    expect(requestedQueries).toEqual(['温哥华', '溫哥華'])
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      id: VANCOUVER_LOCATION.id,
      name: '温哥华',
      nameZh: '温哥华',
      countryZh: '加拿大',
    })
  })

  test('keeps English city search to one unchanged provider query', async () => {
    const weatherStore = useWeatherStore()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      results: [{
        id: 6173331,
        name: 'Vancouver',
        country: 'Canada',
        country_code: 'CA',
        latitude: 49.24966,
        longitude: -123.11934,
        timezone: 'America/Vancouver',
      }],
    }))

    const results = await weatherStore.searchLocations('Vancouver', {
      language: 'en-US',
      fetchImpl,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(new URL(fetchImpl.mock.calls[0][0]).searchParams.get('name')).toBe('Vancouver')
    expect(results[0]).toMatchObject({ name: 'Vancouver', nameEn: 'Vancouver' })
  })

  test('deduplicates a saved city from the online geocoding result', async () => {
    const weatherStore = useWeatherStore()
    weatherStore.addLocation(VANCOUVER_LOCATION)
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      results: [
        {
          id: 6173331,
          name: '温哥华',
          country: '加拿大',
          country_code: 'CA',
          latitude: 49.24966,
          longitude: -123.11934,
          timezone: 'America/Vancouver',
        },
      ],
    }))

    const results = await weatherStore.searchLocations('温哥华', {
      language: 'zh-CN',
      fetchImpl,
    })

    expect(results.map((location) => location.id)).toEqual([VANCOUVER_LOCATION.id])
  })

  test('migrates the legacy active city into a global mapping and supports a private world override', async () => {
    const migrated = normalizeWeatherSettings({
      savedLocations: [useSystemStore().settings.weather.savedLocations[0], VANCOUVER_LOCATION],
      activeLocationId: VANCOUVER_LOCATION.id,
    })
    expect(migrated.mapping.global).toMatchObject({
      displayMode: 'source_location',
      sourceLocationId: VANCOUVER_LOCATION.id,
      exposeSourceLocationToAi: false,
    })

    const systemStore = useSystemStore()
    const weatherStore = useWeatherStore()
    weatherStore.addLocation(VANCOUVER_LOCATION)
    await weatherStore.saveMapping({
      displayMode: WEATHER_DISPLAY_MODE_CUSTOM,
      displayName: '首尔',
      sourceLocationId: VANCOUVER_LOCATION.id,
      exposeSourceLocationToAi: false,
    }, {
      scope: WEATHER_MAPPING_SCOPE_WORLD,
      refresh: false,
    })

    expect(weatherStore.displayLocationName).toBe('首尔')
    expect(weatherStore.activeLocation.id).toBe(VANCOUVER_LOCATION.id)
    expect(systemStore.settings.weather.mapping.byWorld.legacy_single_world).toMatchObject({
      displayName: '首尔',
      sourceLocationId: VANCOUVER_LOCATION.id,
    })

    const projection = buildWeatherWorldProjection({
      weatherSettings: systemStore.settings.weather,
      worldId: 'legacy_single_world',
      forecast: {
        current: {
          temperature: 12,
          apparentTemperature: 10,
          precipitationProbability: 70,
          condition: { labelZh: '小雨', labelEn: 'Light rain' },
        },
      },
      language: 'zh-CN',
    })
    expect(projection.promptText).toContain('首尔')
    expect(projection.promptText).toContain('小雨')
    expect(projection.promptText).not.toContain('温哥华')
    expect(projection.sourceLocationName).toBe('')
  })

  test('renders current, hourly, daily, details, and city management on the Weather route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(TOKYO_FORECAST_PAYLOAD)))
    useSystemStore().settings.system.language = 'en-US'
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/home', component: { template: '<div />' } },
        { path: '/weather', component: WeatherView },
      ],
    })
    await router.push('/weather?from=home&homePage=2')
    await router.isReady()

    const wrapper = mount(WeatherView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.get('[data-testid="weather-view"]').classes()).toContain('is-cloudy')
    expect(wrapper.find('.weather-app-hero-art.is-cloudy').exists()).toBe(true)
    expect(wrapper.find('.weather-app-hero-art .weather-app-scene').attributes('src')).toContain(
      'widgets/weather-terrarium/weather-terrarium-cloudy-scene.webp',
    )
    expect(wrapper.find('.weather-hero .built-in-widget-visual').exists()).toBe(false)
    expect(wrapper.text()).toContain('29°')
    expect(wrapper.text()).toContain('Open-Meteo')
    expect(wrapper.findAll('.weather-hourly article')).toHaveLength(2)
    expect(wrapper.findAll('.weather-daily-list article')).toHaveLength(2)
    expect(wrapper.findAll('.weather-metric-grid article')).toHaveLength(6)

    await wrapper.get('.weather-location-button').trigger('click')
    expect(wrapper.find('.weather-city-sheet').exists()).toBe(true)
    expect(wrapper.text()).toContain('Tokyo')

    await wrapper.get('.weather-header .weather-icon-button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/home?homePage=2')
  })
})
