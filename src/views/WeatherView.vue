<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import WeatherAppHero from '../components/weather/WeatherAppHero.vue'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  WEATHER_DISPLAY_MODE_CUSTOM,
  WEATHER_DISPLAY_MODE_SOURCE,
  WEATHER_DISPLAY_MODE_WORLD,
  WEATHER_MAPPING_SCOPE_GLOBAL,
  WEATHER_MAPPING_SCOPE_WORLD,
  resolveWeatherConditionMeta,
  resolveWeatherDisplayLocationName,
  resolveWeatherLocationCountry,
  resolveWeatherLocationName,
} from '../lib/weather-contract'
import { useWeatherStore } from '../stores/weather'

const router = useRouter()
const route = useRoute()
const weatherStore = useWeatherStore()
const { languageBase, systemLanguage, t } = useI18n()
const {
  activeForecast,
  activeMapping,
  activeMappingScope,
  activeLocation,
  displayLocationName,
  error,
  isLoading,
  isStale,
  savedLocations,
  searchError,
  searchLoading,
  searchResults,
  worldLocationName,
  worldMappingOverride,
} = storeToRefs(weatherStore)

const citySheetOpen = ref(false)
const sourcePickerOpen = ref(false)
const cityQuery = ref('')
const mappingScopeDraft = ref(WEATHER_MAPPING_SCOPE_GLOBAL)
const displayModeDraft = ref(WEATHER_DISPLAY_MODE_SOURCE)
const displayNameDraft = ref('')
const sourceLocationIdDraft = ref('')
const exposeSourceLocationToAiDraft = ref(false)
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine !== false)
let searchTimer = null

const current = computed(() => activeForecast.value?.current || null)
const hourly = computed(() => activeForecast.value?.hourly || [])
const daily = computed(() => activeForecast.value?.daily || [])
const currentCondition = computed(() =>
  current.value?.condition || resolveWeatherConditionMeta(0, true),
)
const sourceLocationName = computed(() =>
  resolveWeatherLocationName(activeLocation.value, systemLanguage.value),
)
const locationName = computed(() => displayLocationName.value)
const isMappedDisplay = computed(() => locationName.value !== sourceLocationName.value)
const locationCountry = computed(() => isMappedDisplay.value
  ? t('世界天气映射', 'World weather mapping')
  : resolveWeatherLocationCountry(activeLocation.value, systemLanguage.value))
const heroState = computed(() => current.value?.visualState || 'clear')
const mappingScopeOptions = computed(() => [
  { id: WEATHER_MAPPING_SCOPE_GLOBAL, label: t('所有世界', 'All worlds') },
  { id: WEATHER_MAPPING_SCOPE_WORLD, label: t('当前世界', 'Current world') },
])
const displayModeOptions = computed(() => [
  {
    id: WEATHER_DISPLAY_MODE_WORLD,
    icon: 'fas fa-map-location-dot',
    label: t('跟随世界位置', 'Follow world location'),
    detail: worldLocationName.value || t('地图中尚未设置位置', 'No Map location set'),
  },
  {
    id: WEATHER_DISPLAY_MODE_CUSTOM,
    icon: 'fas fa-pen',
    label: t('自定义名称', 'Custom name'),
    detail: t('适合首尔或虚构城市', 'For Seoul or a fictional city'),
  },
  {
    id: WEATHER_DISPLAY_MODE_SOURCE,
    icon: 'fas fa-location-dot',
    label: t('显示数据城市', 'Show source city'),
    detail: t('直接显示天气来源', 'Use the weather source name'),
  },
])
const sourceLocationDraft = computed(() =>
  savedLocations.value.find((location) => location.id === sourceLocationIdDraft.value) ||
  savedLocations.value[0],
)
const sourceLocationDraftName = computed(() =>
  resolveWeatherLocationName(sourceLocationDraft.value, systemLanguage.value),
)
const sourceLocationDraftCountry = computed(() =>
  resolveWeatherLocationCountry(sourceLocationDraft.value, systemLanguage.value),
)
const mappingPreviewName = computed(() => resolveWeatherDisplayLocationName({
  mapping: {
    displayMode: displayModeDraft.value,
    displayName: displayNameDraft.value,
    sourceLocationId: sourceLocationIdDraft.value,
    exposeSourceLocationToAi: exposeSourceLocationToAiDraft.value,
  },
  sourceLocation: sourceLocationDraft.value,
  worldLocationName: worldLocationName.value,
  language: systemLanguage.value,
}))
const canSaveMapping = computed(() =>
  displayModeDraft.value !== WEATHER_DISPLAY_MODE_CUSTOM || Boolean(displayNameDraft.value.trim()),
)
const statusMessage = computed(() => {
  if (!online.value) return t('当前离线，显示最近一次天气', 'Offline. Showing the latest saved forecast.')
  if (error.value && activeForecast.value) return t('更新失败，仍在显示缓存天气', 'Refresh failed. Cached weather is still shown.')
  if (isStale.value) return t('天气可能已过期，正在等待更新', 'Forecast may be out of date.')
  return ''
})
const currentUpdatedLabel = computed(() => {
  if (!activeForecast.value?.fetchedAt) return ''
  return new Intl.DateTimeFormat(systemLanguage.value, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(activeForecast.value.fetchedAt))
})
const weatherMetricItems = computed(() => [
  {
    id: 'feels',
    icon: 'fas fa-temperature-half',
    label: t('体感', 'Feels like'),
    value: `${current.value?.apparentTemperature ?? '--'}°`,
  },
  {
    id: 'humidity',
    icon: 'fas fa-droplet',
    label: t('湿度', 'Humidity'),
    value: `${current.value?.humidity ?? '--'}%`,
  },
  {
    id: 'wind',
    icon: 'fas fa-wind',
    label: t('风速', 'Wind'),
    value: `${current.value?.windSpeed ?? '--'} km/h`,
  },
  {
    id: 'rain',
    icon: 'fas fa-cloud-rain',
    label: t('降水概率', 'Precipitation'),
    value: `${current.value?.precipitationProbability ?? '--'}%`,
  },
  {
    id: 'sunrise',
    icon: 'fas fa-sun',
    label: t('日出', 'Sunrise'),
    value: formatClock(current.value?.sunrise),
  },
  {
    id: 'sunset',
    icon: 'fas fa-moon',
    label: t('日落', 'Sunset'),
    value: formatClock(current.value?.sunset),
  },
])

const formatHour = (value, offset = 0) => {
  if (isMappedDisplay.value && offset > 0) {
    return languageBase.value === 'zh' ? `+${offset}小时` : `+${offset}h`
  }
  const time = String(value || '').split('T')[1] || ''
  if (!time) return '--'
  const hour = Number(time.slice(0, 2))
  if (languageBase.value === 'zh') return `${hour}时`
  return new Intl.DateTimeFormat(systemLanguage.value, { hour: 'numeric' }).format(
    new Date(2026, 0, 1, hour),
  )
}

const formatClock = (value) => {
  const time = String(value || '').split('T')[1]
  return time ? time.slice(0, 5) : '--:--'
}

const formatDay = (value, index) => {
  if (index === 0) return t('今天', 'Today')
  if (index === 1) return t('明天', 'Tomorrow')
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat(systemLanguage.value, { weekday: 'short' }).format(date)
}

const formatCondition = (condition) =>
  languageBase.value === 'zh' ? condition?.labelZh : condition?.labelEn

const goBack = () => pushReturnTarget(router, route, '/home')
const refreshWeather = () => weatherStore.refresh({ force: true })

const applyMappingDraft = (mapping) => {
  displayModeDraft.value = mapping.displayMode
  displayNameDraft.value = mapping.displayName
  sourceLocationIdDraft.value = mapping.sourceLocationId
  exposeSourceLocationToAiDraft.value = mapping.exposeSourceLocationToAi === true
}

const chooseMappingScope = (scope) => {
  mappingScopeDraft.value = scope
  const mapping = scope === WEATHER_MAPPING_SCOPE_WORLD
    ? worldMappingOverride.value || activeMapping.value
    : weatherStore.settings.mapping.global
  applyMappingDraft(mapping)
}

const openCitySheet = () => {
  citySheetOpen.value = true
  sourcePickerOpen.value = false
  cityQuery.value = ''
  weatherStore.clearSearch()
  mappingScopeDraft.value = activeMappingScope.value
  applyMappingDraft(activeMapping.value)
}

const closeCitySheet = () => {
  citySheetOpen.value = false
  sourcePickerOpen.value = false
  cityQuery.value = ''
  weatherStore.clearSearch()
}

const openSourcePicker = () => {
  sourcePickerOpen.value = true
  cityQuery.value = ''
  weatherStore.clearSearch()
}

const closeSourcePicker = () => {
  sourcePickerOpen.value = false
  cityQuery.value = ''
  weatherStore.clearSearch()
}

const chooseSavedLocation = (locationId) => {
  sourceLocationIdDraft.value = locationId
  closeSourcePicker()
}

const chooseSearchLocation = (location) => {
  const normalized = weatherStore.addLocation(location)
  sourceLocationIdDraft.value = normalized.id
  closeSourcePicker()
}

const removeSavedLocation = (locationId) => {
  if (locationId === sourceLocationIdDraft.value) return
  weatherStore.removeLocation(locationId)
}

const saveWeatherMapping = async () => {
  if (!canSaveMapping.value) return
  await weatherStore.saveMapping({
    displayMode: displayModeDraft.value,
    displayName: displayNameDraft.value,
    sourceLocationId: sourceLocationIdDraft.value,
    exposeSourceLocationToAi: exposeSourceLocationToAiDraft.value,
  }, {
    scope: mappingScopeDraft.value,
  })
  closeCitySheet()
}

const removeCurrentWorldMapping = async () => {
  await weatherStore.clearWorldMapping()
  closeCitySheet()
}

const handleOnline = () => {
  online.value = true
  void weatherStore.refresh()
}
const handleOffline = () => {
  online.value = false
}

watch(cityQuery, (query) => {
  if (searchTimer) clearTimeout(searchTimer)
  const normalized = query.trim()
  if (normalized.length < 2) {
    weatherStore.clearSearch()
    return
  }
  searchTimer = setTimeout(() => {
    void weatherStore.searchLocations(normalized)
  }, 320)
})

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  void weatherStore.refresh()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<template>
  <main class="weather-page" :class="`is-${heroState}`" data-testid="weather-view">
    <header class="weather-header">
      <button class="weather-icon-button" type="button" :aria-label="t('返回', 'Back')" @click="goBack">
        <i class="fas fa-chevron-left"></i>
      </button>
      <button class="weather-location-button" type="button" @click="openCitySheet">
        <span>{{ locationName }}</span>
        <small>{{ locationCountry }}</small>
        <i class="fas fa-chevron-down"></i>
      </button>
      <button
        class="weather-icon-button"
        type="button"
        :aria-label="t('刷新天气', 'Refresh weather')"
        :disabled="isLoading"
        @click="refreshWeather"
      >
        <i class="fas fa-arrows-rotate" :class="{ 'is-spinning': isLoading }"></i>
      </button>
    </header>

    <div class="weather-scroll">
      <section class="weather-hero" aria-labelledby="weather-current-title">
        <div class="weather-hero-copy">
          <p>{{ t('当前天气', 'Current weather') }}</p>
          <h1 id="weather-current-title">{{ current?.temperature ?? '--' }}°</h1>
          <strong>{{ formatCondition(currentCondition) }}</strong>
          <span>
            {{ t(`最高 ${current?.high ?? '--'}° · 最低 ${current?.low ?? '--'}°`, `H ${current?.high ?? '--'}° · L ${current?.low ?? '--'}°`) }}
          </span>
        </div>
        <WeatherAppHero :state="heroState" />
        <div v-if="statusMessage" class="weather-status" role="status">
          <i :class="online ? 'fas fa-clock-rotate-left' : 'fas fa-wifi-slash'"></i>
          <span>{{ statusMessage }}</span>
        </div>
        <div v-else-if="currentUpdatedLabel" class="weather-updated">
          {{ t(`更新于 ${currentUpdatedLabel}`, `Updated ${currentUpdatedLabel}`) }}
        </div>
      </section>

      <section v-if="!activeForecast && isLoading" class="weather-loading" aria-live="polite">
        <i class="fas fa-cloud-sun"></i>
        <strong>{{ t('正在读取天空', 'Reading the sky') }}</strong>
        <span>{{ t('正在获取当前城市的天气', 'Fetching weather for this city') }}</span>
      </section>

      <section v-else-if="!activeForecast && error" class="weather-error" role="alert">
        <i class="fas fa-cloud-bolt"></i>
        <strong>{{ t('暂时无法取得天气', 'Weather is unavailable') }}</strong>
        <span>{{ t('检查网络后重试，已选择的城市不会丢失。', 'Check your connection and retry. Your city is still saved.') }}</span>
        <button type="button" @click="refreshWeather">{{ t('重新获取', 'Try again') }}</button>
      </section>

      <template v-else-if="activeForecast">
        <section class="weather-section weather-hourly" aria-labelledby="weather-hourly-title">
          <div class="weather-section-heading">
            <span>{{ t('逐小时', 'Hourly') }}</span>
            <small>{{ t('未来 24 小时', 'Next 24 hours') }}</small>
          </div>
          <div class="weather-hourly-track">
            <article v-for="(item, index) in hourly" :key="item.time" :class="{ 'is-now': index === 0 }">
              <time>{{ index === 0 ? t('现在', 'Now') : formatHour(item.time, index) }}</time>
              <i :class="item.condition.icon"></i>
              <strong>{{ item.temperature }}°</strong>
              <span><i class="fas fa-droplet"></i>{{ item.precipitationProbability }}%</span>
            </article>
          </div>
        </section>

        <section class="weather-section weather-daily" aria-labelledby="weather-daily-title">
          <div class="weather-section-heading">
            <span id="weather-daily-title">{{ t('七日天气', '7-day forecast') }}</span>
            <small>{{ t('高低温与降水', 'High, low and rain') }}</small>
          </div>
          <div class="weather-daily-list">
            <article v-for="(item, index) in daily" :key="item.date">
              <strong>{{ formatDay(item.date, index) }}</strong>
              <span class="weather-daily-condition"><i :class="item.condition.icon"></i>{{ formatCondition(item.condition) }}</span>
              <span class="weather-daily-rain"><i class="fas fa-droplet"></i>{{ item.precipitationProbability }}%</span>
              <span class="weather-daily-temp"><b>{{ item.high }}°</b><small>{{ item.low }}°</small></span>
            </article>
          </div>
        </section>

        <section class="weather-section weather-details" aria-labelledby="weather-details-title">
          <div class="weather-section-heading">
            <span id="weather-details-title">{{ t('天气详情', 'Weather details') }}</span>
            <small>{{ t('此刻的空气与日照', 'Air and daylight now') }}</small>
          </div>
          <div class="weather-metric-grid">
            <article v-for="metric in weatherMetricItems" :key="metric.id">
              <i :class="metric.icon"></i>
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </article>
          </div>
        </section>

        <footer class="weather-attribution">
          <span>{{ t('天气数据', 'Weather data') }}</span>
          <strong>Open-Meteo</strong>
        </footer>
      </template>
    </div>

    <transition name="weather-sheet">
      <div v-if="citySheetOpen" class="weather-sheet-layer" @click.self="closeCitySheet">
        <section
          class="weather-city-sheet"
          role="dialog"
          aria-modal="true"
          :aria-label="t('天气映射设置', 'Weather mapping settings')"
          data-testid="weather-mapping-sheet"
        >
          <div class="weather-sheet-grabber"></div>
          <template v-if="!sourcePickerOpen">
            <div class="weather-sheet-heading">
              <div>
                <span>{{ t('世界天气', 'World weather') }}</span>
                <strong>{{ t('天气映射', 'Weather mapping') }}</strong>
              </div>
              <button class="weather-icon-button" type="button" :aria-label="t('关闭', 'Close')" @click="closeCitySheet">
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <div class="weather-mapping-preview">
              <span>{{ t('角色与组件将看到', 'Characters and widgets will see') }}</span>
              <div>
                <strong>{{ mappingPreviewName }}</strong>
                <b>{{ current?.temperature ?? '--' }}°</b>
              </div>
              <small>{{ formatCondition(currentCondition) }}</small>
              <p>
                <i class="fas fa-link"></i>
                {{ t(`天气同步自 ${sourceLocationDraftName}`, `Weather synced from ${sourceLocationDraftName}`) }}
              </p>
            </div>

            <section class="weather-mapping-section">
              <div class="weather-mapping-label">
                <span>{{ t('应用范围', 'Applies to') }}</span>
                <small v-if="mappingScopeDraft === WEATHER_MAPPING_SCOPE_WORLD && !worldMappingOverride">
                  {{ t('当前继承默认映射', 'Currently inherits the default') }}
                </small>
              </div>
              <div class="weather-segmented-control" role="group" :aria-label="t('映射应用范围', 'Mapping scope')">
                <button
                  v-for="option in mappingScopeOptions"
                  :key="option.id"
                  type="button"
                  :class="{ 'is-active': mappingScopeDraft === option.id }"
                  @click="chooseMappingScope(option.id)"
                >
                  {{ option.label }}
                </button>
              </div>
            </section>

            <section class="weather-mapping-section">
              <div class="weather-mapping-label">
                <span>{{ t('世界中显示为', 'Display in the world as') }}</span>
              </div>
              <div class="weather-display-mode-list">
                <button
                  v-for="option in displayModeOptions"
                  :key="option.id"
                  type="button"
                  :class="{ 'is-active': displayModeDraft === option.id }"
                  @click="displayModeDraft = option.id"
                >
                  <i :class="option.icon"></i>
                  <span><strong>{{ option.label }}</strong><small>{{ option.detail }}</small></span>
                  <i :class="displayModeDraft === option.id ? 'fas fa-circle-check' : 'far fa-circle'"></i>
                </button>
              </div>
              <label v-if="displayModeDraft === WEATHER_DISPLAY_MODE_CUSTOM" class="weather-custom-name-field">
                <span>{{ t('地点名称', 'Location name') }}</span>
                <input
                  v-model="displayNameDraft"
                  type="text"
                  maxlength="80"
                  :placeholder="t('例如：首尔、伊莱西亚', 'e.g. Seoul or Elysia')"
                />
              </label>
            </section>

            <section class="weather-mapping-section">
              <div class="weather-mapping-label">
                <span>{{ t('天气同步自', 'Weather syncs from') }}</span>
                <small>{{ t('仅作为数据来源', 'Used only as the data source') }}</small>
              </div>
              <button class="weather-source-button" type="button" @click="openSourcePicker">
                <i class="fas fa-location-crosshairs"></i>
                <span><strong>{{ sourceLocationDraftName }}</strong><small>{{ sourceLocationDraftCountry }}</small></span>
                <i class="fas fa-chevron-right"></i>
              </button>
            </section>

            <section class="weather-mapping-section weather-privacy-section">
              <button
                class="weather-privacy-toggle"
                type="button"
                role="switch"
                :aria-checked="exposeSourceLocationToAiDraft"
                @click="exposeSourceLocationToAiDraft = !exposeSourceLocationToAiDraft"
              >
                <i class="fas fa-user-shield"></i>
                <span>
                  <strong>{{ t('允许角色知道数据城市', 'Let characters know the source city') }}</strong>
                  <small>{{ t('默认关闭。角色只会收到显示地点与天气摘要。', 'Off by default. Characters receive only the display name and weather summary.') }}</small>
                </span>
                <b :class="{ 'is-on': exposeSourceLocationToAiDraft }"><i></i></b>
              </button>
            </section>

            <div class="weather-mapping-actions">
              <button
                v-if="mappingScopeDraft === WEATHER_MAPPING_SCOPE_WORLD && worldMappingOverride"
                class="weather-remove-override"
                type="button"
                @click="removeCurrentWorldMapping"
              >
                {{ t('移除当前世界覆盖', 'Remove current-world override') }}
              </button>
              <button
                class="weather-save-mapping"
                type="button"
                :disabled="!canSaveMapping || isLoading"
                @click="saveWeatherMapping"
              >
                <i class="fas fa-check"></i>
                {{ t('保存映射', 'Save mapping') }}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="weather-sheet-heading weather-source-heading">
              <button class="weather-icon-button" type="button" :aria-label="t('返回映射设置', 'Back to mapping settings')" @click="closeSourcePicker">
                <i class="fas fa-chevron-left"></i>
              </button>
              <div>
                <span>{{ t('天气数据', 'Weather data') }}</span>
                <strong>{{ t('选择现实城市', 'Choose a real city') }}</strong>
              </div>
              <span></span>
            </div>
            <label class="weather-search-field">
              <i class="fas fa-magnifying-glass"></i>
              <input
                v-model="cityQuery"
                type="search"
                autocomplete="off"
                :placeholder="t('搜索城市，例如温哥华', 'Search a city, e.g. Vancouver')"
              />
              <i v-if="searchLoading" class="fas fa-circle-notch is-spinning"></i>
            </label>

            <div v-if="cityQuery.trim().length < 2" class="weather-saved-cities">
              <span class="weather-sheet-label">{{ t('已保存的数据城市', 'Saved source cities') }}</span>
              <article v-for="location in savedLocations" :key="location.id" :class="{ 'is-active': location.id === sourceLocationIdDraft }">
                <button type="button" @click="chooseSavedLocation(location.id)">
                  <i class="fas fa-location-dot"></i>
                  <span>
                    <strong>{{ resolveWeatherLocationName(location, systemLanguage) }}</strong>
                    <small>{{ resolveWeatherLocationCountry(location, systemLanguage) }}</small>
                  </span>
                  <i v-if="location.id === sourceLocationIdDraft" class="fas fa-check"></i>
                </button>
                <button
                  v-if="savedLocations.length > 1 && location.id !== sourceLocationIdDraft"
                  class="weather-remove-city"
                  type="button"
                  :aria-label="t('移除城市', 'Remove city')"
                  @click="removeSavedLocation(location.id)"
                >
                  <i class="fas fa-trash-can"></i>
                </button>
              </article>
            </div>

            <div v-else class="weather-search-results">
              <p v-if="searchError" class="weather-search-empty">{{ t('搜索失败，请稍后重试', 'Search failed. Try again shortly.') }}</p>
              <p v-else-if="!searchLoading && searchResults.length === 0" class="weather-search-empty">{{ t('没有找到匹配城市', 'No matching cities found.') }}</p>
              <button v-for="location in searchResults" :key="location.id" type="button" @click="chooseSearchLocation(location)">
                <i class="fas fa-location-dot"></i>
                <span>
                  <strong>{{ resolveWeatherLocationName(location, systemLanguage) }}</strong>
                  <small>{{ [location.admin1, resolveWeatherLocationCountry(location, systemLanguage)].filter(Boolean).join(' · ') }}</small>
                </span>
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </template>
        </section>
      </div>
    </transition>
  </main>
</template>

<style scoped>
.weather-page {
  --weather-sky-top: #a9dce8;
  --weather-sky-bottom: #eef5e9;
  --weather-ink: #17343b;
  --weather-muted: rgba(23, 52, 59, 0.62);
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--weather-ink);
  background: linear-gradient(180deg, var(--weather-sky-top), var(--weather-sky-bottom) 42%, #f4f5ef 72%);
  transition: background 500ms ease, color 500ms ease;
}

.weather-page.is-cloudy { --weather-sky-top: #9fb9c1; --weather-sky-bottom: #dce6e3; }
.weather-page.is-rain { --weather-sky-top: #66818d; --weather-sky-bottom: #bdcbd0; --weather-ink: #f5fbfc; --weather-muted: rgba(245, 251, 252, 0.7); }
.weather-page.is-night { --weather-sky-top: #101936; --weather-sky-bottom: #28365a; --weather-ink: #f4f3ff; --weather-muted: rgba(236, 235, 255, 0.66); }

.weather-header {
  position: relative;
  z-index: 5;
  min-height: 88px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 10px;
  padding: calc(34px + env(safe-area-inset-top)) 16px 8px;
}

.weather-icon-button,
.weather-location-button,
.weather-error button,
.weather-search-results button,
.weather-saved-cities button {
  border: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.weather-icon-button {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.24);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.weather-icon-button:disabled { opacity: 0.58; cursor: default; }
.weather-location-button { min-width: 0; display: grid; grid-template-columns: minmax(0, auto) auto; justify-content: center; align-items: center; gap: 0 7px; background: transparent; }
.weather-location-button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 800; }
.weather-location-button small { grid-column: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--weather-muted); font-size: 9px; text-align: center; }
.weather-location-button i { grid-column: 2; grid-row: 1 / span 2; font-size: 10px; }

.weather-scroll { min-height: 0; flex: 1; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; padding-bottom: calc(30px + env(safe-area-inset-bottom)); }
.weather-scroll::-webkit-scrollbar { display: none; }

.weather-hero { position: relative; min-height: 370px; display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(170px, 1.1fr); align-items: center; padding: 12px 18px 34px; overflow: hidden; }
.weather-hero::before { content: ''; position: absolute; inset: 12% -18% auto; height: 62%; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.34), transparent 66%); filter: blur(8px); pointer-events: none; }
.weather-hero-copy { position: relative; z-index: 2; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; text-shadow: 0 1px 12px rgba(255,255,255,.2); }
.weather-hero-copy p { margin: 0 0 8px; color: var(--weather-muted); font-size: 10px; font-weight: 800; text-transform: uppercase; }
.weather-hero-copy h1 { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(70px, 20vw, 104px); line-height: .82; font-weight: 500; letter-spacing: 0; }
.weather-hero-copy strong { margin-top: 15px; font-size: 18px; }
.weather-hero-copy span { margin-top: 5px; color: var(--weather-muted); font-size: 11px; }
.weather-status, .weather-updated { position: absolute; z-index: 3; left: 18px; right: 18px; bottom: 12px; min-height: 30px; display: flex; align-items: center; justify-content: center; gap: 7px; color: var(--weather-muted); font-size: 10px; }

.weather-section, .weather-loading, .weather-error { margin: 0 12px 12px; border: 1px solid rgba(255,255,255,.36); border-radius: 8px; background: rgba(248, 250, 246, .76); color: #1f3438; box-shadow: 0 12px 30px rgba(28, 55, 61, .08), inset 0 1px 0 rgba(255,255,255,.68); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.weather-section { padding: 15px 0; }
.weather-section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 0 15px 12px; }
.weather-section-heading span { font-size: 13px; font-weight: 850; }
.weather-section-heading small { color: rgba(31,52,56,.52); font-size: 9px; }

.weather-hourly-track { display: flex; gap: 4px; overflow-x: auto; scroll-snap-type: x proximity; scrollbar-width: none; padding: 0 11px 3px; }
.weather-hourly-track::-webkit-scrollbar { display: none; }
.weather-hourly article { min-width: 61px; height: 116px; scroll-snap-align: start; display: grid; grid-template-rows: auto 1fr auto auto; justify-items: center; align-items: center; padding: 9px 5px; border-radius: 8px; background: rgba(255,255,255,.35); }
.weather-hourly article.is-now { color: #f8ffff; background: #386e76; box-shadow: 0 8px 18px rgba(48,102,111,.22); }
.weather-hourly time { font-size: 9px; font-weight: 750; }
.weather-hourly article > i { font-size: 19px; }
.weather-hourly strong { font-size: 15px; }
.weather-hourly article span { display: flex; align-items: center; gap: 3px; color: #4f8793; font-size: 8px; }
.weather-hourly article.is-now span { color: #bce9ee; }

.weather-daily-list { padding: 0 15px; }
.weather-daily-list article { min-height: 46px; display: grid; grid-template-columns: 56px minmax(90px, 1fr) 54px 58px; align-items: center; gap: 7px; border-top: 1px solid rgba(42,67,71,.08); }
.weather-daily-list article:first-child { border-top: 0; }
.weather-daily-list > article > strong { font-size: 11px; }
.weather-daily-condition { min-width: 0; display: flex; align-items: center; gap: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #4a5d60; font-size: 10px; }
.weather-daily-condition i { width: 18px; color: #497c84; text-align: center; }
.weather-daily-rain { display: flex; align-items: center; gap: 4px; color: #578c98; font-size: 9px; }
.weather-daily-temp { display: flex; justify-content: flex-end; gap: 8px; font-size: 11px; }
.weather-daily-temp small { color: rgba(31,52,56,.48); }

.weather-metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; overflow: hidden; margin: 0 15px; border-radius: 8px; background: rgba(43,72,77,.09); }
.weather-metric-grid article { min-width: 0; min-height: 84px; display: grid; grid-template-columns: auto minmax(0, 1fr); align-content: center; gap: 5px 7px; padding: 11px; background: rgba(255,255,255,.55); }
.weather-metric-grid i { color: #4e858d; }
.weather-metric-grid span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(31,52,56,.55); font-size: 9px; }
.weather-metric-grid strong { grid-column: 1 / -1; overflow-wrap: anywhere; font-size: 13px; }

.weather-loading, .weather-error { min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 24px; text-align: center; }
.weather-loading > i, .weather-error > i { margin-bottom: 6px; color: #4e858d; font-size: 34px; }
.weather-loading strong, .weather-error strong { font-size: 15px; }
.weather-loading span, .weather-error span { max-width: 280px; color: #65777a; font-size: 11px; line-height: 1.6; }
.weather-error button { min-height: 36px; margin-top: 8px; border-radius: 18px; padding: 0 17px; background: #386e76; color: #fff; font-size: 11px; font-weight: 800; }
.weather-attribution { display: flex; align-items: baseline; justify-content: center; gap: 6px; padding: 12px; color: rgba(33,56,60,.45); font-size: 9px; }

.weather-sheet-layer { position: absolute; inset: 0; z-index: 60; display: flex; align-items: flex-end; background: rgba(7,18,24,.34); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); }
.weather-city-sheet { width: 100%; max-height: min(88%, 760px); overflow-y: auto; overscroll-behavior: contain; border-radius: 18px 18px 0 0; padding: 8px 16px calc(18px + env(safe-area-inset-bottom)); color: var(--system-text); background: var(--system-surface-strong); box-shadow: 0 -20px 50px rgba(10,22,28,.24); }
.weather-sheet-grabber { width: 38px; height: 4px; margin: 0 auto 13px; border-radius: 4px; background: var(--system-control-border); }
.weather-sheet-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.weather-sheet-heading > div { display: grid; }
.weather-sheet-heading span, .weather-sheet-label { color: var(--system-text-muted); font-size: 9px; font-weight: 800; text-transform: uppercase; }
.weather-sheet-heading strong { font-size: 18px; }
.weather-sheet-heading .weather-icon-button { background: var(--system-control-bg); }
.weather-source-heading { display: grid; grid-template-columns: 38px minmax(0, 1fr) 38px; }
.weather-source-heading > div { text-align: center; }
.weather-mapping-preview { position: relative; min-height: 116px; display: grid; align-content: center; gap: 5px; margin-top: 14px; overflow: hidden; border-radius: 8px; padding: 17px 18px; color: #f7ffff; background: linear-gradient(135deg, #3d7078, #214b55 58%, #183941); box-shadow: 0 12px 26px rgba(22,58,67,.2); }
.weather-mapping-preview::after { content: ''; position: absolute; width: 112px; height: 112px; right: -25px; top: -35px; border: 18px solid rgba(255,255,255,.08); border-radius: 50%; }
.weather-mapping-preview > span { position: relative; z-index: 1; color: rgba(242,255,255,.66); font-size: 9px; font-weight: 800; text-transform: uppercase; }
.weather-mapping-preview > div { position: relative; z-index: 1; min-width: 0; display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.weather-mapping-preview > div strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 24px; }
.weather-mapping-preview > div b { font-family: Georgia, 'Times New Roman', serif; font-size: 33px; font-weight: 500; }
.weather-mapping-preview > small { position: relative; z-index: 1; color: rgba(242,255,255,.82); font-size: 10px; }
.weather-mapping-preview > p { position: relative; z-index: 1; display: flex; align-items: center; gap: 6px; margin: 7px 0 0; color: rgba(242,255,255,.58); font-size: 9px; }
.weather-mapping-section { margin-top: 18px; }
.weather-mapping-label { min-height: 20px; display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.weather-mapping-label > span { font-size: 11px; font-weight: 850; }
.weather-mapping-label > small { color: var(--system-text-muted); font-size: 8px; text-align: right; }
.weather-segmented-control { height: 38px; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 3px; border-radius: 8px; padding: 3px; background: var(--system-control-bg); }
.weather-segmented-control button { min-width: 0; border: 0; border-radius: 6px; color: var(--system-text-muted); background: transparent; font: inherit; font-size: 10px; font-weight: 800; cursor: pointer; }
.weather-segmented-control button.is-active { color: var(--system-text); background: var(--system-surface-strong); box-shadow: 0 2px 8px rgba(20,38,44,.1); }
.weather-display-mode-list { display: grid; gap: 6px; }
.weather-display-mode-list button { min-height: 55px; display: grid; grid-template-columns: 26px minmax(0,1fr) 18px; align-items: center; gap: 9px; border: 1px solid var(--system-control-border); border-radius: 8px; padding: 8px 11px; color: var(--system-text); background: var(--system-control-bg); font: inherit; text-align: left; cursor: pointer; }
.weather-display-mode-list button.is-active { border-color: var(--system-accent); background: color-mix(in srgb, var(--system-accent) 8%, var(--system-control-bg)); }
.weather-display-mode-list button > i:first-child { color: var(--system-accent); text-align: center; }
.weather-display-mode-list button > i:last-child { color: var(--system-accent); }
.weather-display-mode-list button > span { min-width: 0; display: grid; gap: 2px; }
.weather-display-mode-list strong { font-size: 11px; }
.weather-display-mode-list small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--system-text-muted); font-size: 8px; }
.weather-custom-name-field { display: grid; gap: 6px; margin-top: 8px; }
.weather-custom-name-field > span { color: var(--system-text-muted); font-size: 9px; }
.weather-custom-name-field input { width: 100%; height: 42px; border: 1px solid var(--system-control-border); border-radius: 8px; outline: 0; padding: 0 12px; color: var(--system-text); background: var(--system-control-bg); font: inherit; font-size: 11px; }
.weather-custom-name-field input:focus { border-color: var(--system-accent); }
.weather-source-button { width: 100%; min-height: 56px; display: grid; grid-template-columns: 28px minmax(0,1fr) 16px; align-items: center; gap: 10px; border: 1px solid var(--system-control-border); border-radius: 8px; padding: 8px 12px; color: var(--system-text); background: var(--system-control-bg); font: inherit; text-align: left; cursor: pointer; }
.weather-source-button > i:first-child { color: var(--system-accent); text-align: center; }
.weather-source-button > i:last-child { color: var(--system-text-muted); font-size: 9px; }
.weather-source-button > span { min-width: 0; display: grid; }
.weather-source-button strong, .weather-source-button small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.weather-source-button strong { font-size: 12px; }
.weather-source-button small { color: var(--system-text-muted); font-size: 9px; }
.weather-privacy-section { padding-top: 4px; border-top: 1px solid var(--system-control-border); }
.weather-privacy-toggle { width: 100%; min-height: 58px; display: grid; grid-template-columns: 25px minmax(0,1fr) 38px; align-items: center; gap: 9px; border: 0; padding: 0; color: var(--system-text); background: transparent; font: inherit; text-align: left; cursor: pointer; }
.weather-privacy-toggle > i { color: var(--system-accent); text-align: center; }
.weather-privacy-toggle > span { min-width: 0; display: grid; gap: 3px; }
.weather-privacy-toggle strong { font-size: 10px; }
.weather-privacy-toggle small { color: var(--system-text-muted); font-size: 8px; line-height: 1.45; }
.weather-privacy-toggle > b { width: 36px; height: 21px; display: flex; align-items: center; border-radius: 12px; padding: 2px; background: var(--system-control-border); transition: background 180ms ease; }
.weather-privacy-toggle > b i { width: 17px; height: 17px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(20,40,48,.2); transition: transform 180ms ease; }
.weather-privacy-toggle > b.is-on { background: var(--system-accent); }
.weather-privacy-toggle > b.is-on i { transform: translateX(15px); }
.weather-mapping-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.weather-mapping-actions button { min-height: 40px; border: 0; border-radius: 8px; padding: 0 15px; font: inherit; font-size: 10px; font-weight: 850; cursor: pointer; }
.weather-remove-override { color: var(--system-danger, #b94b4b); background: transparent; }
.weather-save-mapping { display: inline-flex; align-items: center; justify-content: center; gap: 7px; color: #fff; background: var(--system-accent); }
.weather-save-mapping:disabled { opacity: .45; cursor: default; }
.weather-search-field { height: 44px; display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 9px; margin-top: 15px; border-radius: 8px; padding: 0 12px; color: var(--system-text-muted); background: var(--system-control-bg); }
.weather-search-field input { min-width: 0; border: 0; outline: 0; color: var(--system-text); background: transparent; font: inherit; font-size: 12px; }
.weather-saved-cities, .weather-search-results { display: grid; gap: 7px; margin-top: 16px; }
.weather-saved-cities article { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; border: 1px solid var(--system-control-border); border-radius: 8px; background: var(--system-control-bg); }
.weather-saved-cities article.is-active { border-color: var(--system-accent); }
.weather-saved-cities article > button:first-child, .weather-search-results button { min-height: 52px; display: grid; grid-template-columns: 22px minmax(0,1fr) auto; align-items: center; gap: 9px; padding: 7px 12px; background: transparent; text-align: left; }
.weather-saved-cities button > span, .weather-search-results button > span { min-width: 0; display: grid; }
.weather-saved-cities button strong, .weather-search-results button strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.weather-saved-cities button small, .weather-search-results button small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--system-text-muted); font-size: 9px; }
.weather-remove-city { width: 38px; height: 38px; display: grid; place-items: center; margin-right: 5px; border-radius: 50%; background: transparent; color: var(--system-danger, #b94b4b); }
.weather-search-results button { border-radius: 8px; background: var(--system-control-bg); }
.weather-search-empty { padding: 28px 12px; color: var(--system-text-muted); font-size: 11px; text-align: center; }
.is-spinning { animation: weather-spin 800ms linear infinite; }

.weather-sheet-enter-active, .weather-sheet-leave-active { transition: opacity 220ms ease; }
.weather-sheet-enter-active .weather-city-sheet, .weather-sheet-leave-active .weather-city-sheet { transition: transform 260ms cubic-bezier(.2,.8,.2,1); }
.weather-sheet-enter-from, .weather-sheet-leave-to { opacity: 0; }
.weather-sheet-enter-from .weather-city-sheet, .weather-sheet-leave-to .weather-city-sheet { transform: translateY(100%); }

@keyframes weather-spin { to { transform: rotate(360deg); } }

@media (max-width: 430px) {
  .weather-hero { min-height: 342px; grid-template-columns: minmax(0,.92fr) minmax(145px,1.08fr); padding-inline: 15px; }
  .weather-hero-copy h1 { font-size: 72px; }
  .weather-daily-list article { grid-template-columns: 48px minmax(76px,1fr) 48px 52px; gap: 4px; }
  .weather-daily-condition { font-size: 9px; }
  .weather-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 760px) {
  .weather-scroll { padding-inline: max(20px, calc((100% - 920px) / 2)); }
  .weather-hero { min-height: 420px; grid-template-columns: minmax(0,1fr) 360px; padding-inline: 44px; }
  .weather-hero-copy h1 { font-size: 108px; }
  .weather-section, .weather-loading, .weather-error { margin-inline: 0; }
  .weather-city-sheet { width: min(520px, 100%); margin: 0 auto; border-radius: 18px 18px 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .weather-page, .weather-sheet-enter-active, .weather-sheet-leave-active, .weather-city-sheet { transition-duration: 1ms !important; }
  .is-spinning { animation: none; }
}
</style>
