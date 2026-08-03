<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import MapPinCategoryGuide from '../components/map/MapPinCategoryGuide.vue'
import MapSceneCanvas from '../components/map/MapSceneCanvas.vue'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { formatMapPosition } from '../lib/map-packs'
import {
  MAP_PLACE_CATEGORY_GROUPS,
  getMapPlaceCategoryGroupVisual,
  matchesMapPlaceCategoryFilter,
  resolveMapPlaceVisual,
} from '../lib/map-place-categories'
import { searchMapPlaces } from '../lib/map-place-search'
import { normalizeHomePageQuery } from '../lib/navigation-return'
import { useGalleryStore } from '../stores/gallery'
import { useMapStore } from '../stores/map'
import { useSystemStore } from '../stores/system'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const mapStore = useMapStore()
const galleryStore = useGalleryStore()
const systemStore = useSystemStore()
const { activeMapPack, activeMapPackId, activeMapPlaces, addresses, currentLocation } =
  storeToRefs(mapStore)

const MAP_PACK_PREVIEW_SCOPE_ID = 'map-place-settings'
const customMapPreviewUrl = ref('')
const editorOpen = ref(false)
const coordinateMode = ref(false)
const editingAddressId = ref(null)
const categoryGuideOpen = ref(false)
const managementSearchText = ref('')
const managementCategory = ref('all')
const feedback = ref({ tone: '', text: '' })

const placeForm = reactive({
  label: '',
  detail: '',
  category: 'home',
  position: null,
})

const activeWorldPack = computed(() => systemStore.getActiveWorldPack?.() || { id: 'default_world' })
const renderedMapPack = computed(() => ({
  ...activeMapPack.value,
  assetUrl:
    activeMapPack.value?.source === 'custom'
      ? customMapPreviewUrl.value
      : activeMapPack.value?.assetUrl,
}))
const userPlaces = computed(() =>
  addresses.value.filter((item) => item.mapPackId === activeMapPackId.value),
)
const worldPlaces = computed(() => activeMapPack.value?.places || [])
const mapPlaceVisual = (place) =>
  resolveMapPlaceVisual(place, activeMapPack.value?.factions)
const selectedPlaceIconType = computed(() => resolveMapPlaceVisual({ category: placeForm.category }))
const selectedPlaceCategoryGroup = computed(() =>
  getMapPlaceCategoryGroupVisual(placeForm.category),
)
const managementCategoryOptions = computed(() => {
  const categories = new Map()
  activeMapPlaces.value.forEach((place) => {
    const visual = getMapPlaceCategoryGroupVisual(place.category)
    const current = categories.get(visual.id)
    categories.set(visual.id, {
      ...visual,
      count: Number(current?.count || 0) + 1,
    })
  })
  return [
    {
      id: 'all',
      icon: 'fas fa-layer-group',
      tone: '#18705a',
      labelZh: '全部',
      labelEn: 'All',
      count: activeMapPlaces.value.length,
      order: -1,
    },
    ...Array.from(categories.values()).sort(
      (left, right) => Number(left.order || 999) - Number(right.order || 999),
    ),
  ]
})
const managedPlaces = computed(() => {
  const query = managementSearchText.value.trim()
  if (query) {
    return searchMapPlaces(activeMapPlaces.value, query, {
      categoryId: managementCategory.value,
      limit: Math.max(1, activeMapPlaces.value.length),
    }).map((result) => result.place)
  }
  if (managementCategory.value === 'all') return activeMapPlaces.value
  return activeMapPlaces.value.filter(
    (place) => matchesMapPlaceCategoryFilter(place.category, managementCategory.value),
  )
})
const filteredUserPlaces = computed(() =>
  managedPlaces.value.filter((place) => place.source === 'user'),
)
const filteredWorldPlaces = computed(() =>
  managedPlaces.value.filter((place) => place.source !== 'user'),
)
const mapScenePins = computed(() =>
  activeMapPlaces.value.map((place) => ({
    ...place,
    icon: mapPlaceVisual(place).icon,
    tone: mapPlaceVisual(place).tone,
  })),
)
const canSave = computed(() =>
  Boolean(placeForm.label.trim() && placeForm.detail.trim() && placeForm.position),
)
const mapFocusPosition = computed(() =>
  placeForm.position ||
  (currentLocation.value?.mapPackId === activeMapPackId.value
    ? currentLocation.value.position
    : null),
)
const mapContextQuery = computed(() => {
  const homePage = normalizeHomePageQuery(route.query.homePage)
  return {
    ...(route.query.from === 'home' ? { from: 'home' } : {}),
    ...(homePage ? { homePage } : {}),
  }
})

const mapPlaceName = (place) =>
  t(place?.nameZh || place?.labelZh || place?.label || '', place?.nameEn || place?.labelEn || place?.label || '')

const mapPlaceDetail = (place) =>
  t(place?.detailZh || place?.detail || '', place?.detailEn || place?.detail || '')

const resetForm = () => {
  placeForm.label = ''
  placeForm.detail = ''
  placeForm.category = 'home'
  placeForm.position = null
}

const openCreate = () => {
  resetForm()
  editingAddressId.value = null
  coordinateMode.value = false
  editorOpen.value = true
}

const openEdit = (address) => {
  if (!address) return
  editingAddressId.value = address.id
  placeForm.label = address.label
  placeForm.detail = address.detail
  placeForm.category = address.category || 'other'
  placeForm.position = address.position ? { ...address.position } : null
  coordinateMode.value = false
  editorOpen.value = true
}

const closeEditor = () => {
  editorOpen.value = false
  coordinateMode.value = false
}

const startCoordinateSelection = () => {
  editorOpen.value = false
  coordinateMode.value = true
}

const cancelCoordinateSelection = () => {
  coordinateMode.value = false
  editorOpen.value = true
}

const onCoordinateSelected = ({ position }) => {
  if (!coordinateMode.value || !position) return
  placeForm.position = { ...position }
  if (!placeForm.detail.trim()) placeForm.detail = formatMapPosition(position)
  coordinateMode.value = false
  editorOpen.value = true
}

const onMapPinSelected = (place) => {
  if (coordinateMode.value || place?.source !== 'user') return
  openEdit(place)
}

const useCurrentCoordinate = () => {
  if (!currentLocation.value?.position || currentLocation.value.mapPackId !== activeMapPackId.value) return
  placeForm.position = { ...currentLocation.value.position }
  if (!placeForm.detail.trim()) placeForm.detail = formatMapPosition(placeForm.position)
}

const savePlace = () => {
  if (!canSave.value) return
  const payload = {
    label: placeForm.label,
    detail: placeForm.detail,
    category: placeForm.category,
    mapPackId: activeMapPackId.value,
    position: placeForm.position,
  }
  const ok = editingAddressId.value
    ? mapStore.updateAddress(editingAddressId.value, payload)
    : mapStore.addAddress(payload)
  if (!ok) return
  feedback.value = {
    tone: 'success',
    text: editingAddressId.value
      ? t('地点与图钉已更新。', 'Place and pin updated.')
      : t('地点与图钉已创建。', 'Place and pin created.'),
  }
  closeEditor()
}

const removePlace = async () => {
  const address = userPlaces.value.find((item) => item.id === editingAddressId.value)
  if (!address) return
  const confirmed = await confirmDialog({
    title: t('删除地点', 'Delete place'),
    message: t(`确定删除“${address.label}”吗？`, `Delete “${address.label}”?`),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return
  mapStore.removeAddress(address.id)
  feedback.value = { tone: 'success', text: t('地点已删除。', 'Place deleted.') }
  closeEditor()
}

const goBack = () => {
  router.push({ path: '/map/settings', query: mapContextQuery.value })
}

watch(
  () => activeWorldPack.value?.id,
  () => mapStore.syncMapPackForWorld(activeWorldPack.value),
  { immediate: true },
)

watch(
  () => `${activeMapPack.value?.id || ''}:${activeMapPack.value?.assetId || ''}`,
  async () => {
    galleryStore.releaseAssetPreviewScope(MAP_PACK_PREVIEW_SCOPE_ID)
    customMapPreviewUrl.value = ''
    if (activeMapPack.value?.source !== 'custom' || !activeMapPack.value.assetId) return
    customMapPreviewUrl.value = await galleryStore.getAssetPreviewUrl(activeMapPack.value.assetId, {
      scopeId: MAP_PACK_PREVIEW_SCOPE_ID,
    })
  },
  { immediate: true },
)

watch(
  () => route.query.addressId,
  (rawAddressId) => {
    const value = Array.isArray(rawAddressId) ? rawAddressId[0] : rawAddressId
    const address = userPlaces.value.find((item) => item.id === Number(value))
    if (address) openEdit(address)
  },
  { immediate: true },
)

watch(
  () => route.query.create,
  (create) => {
    if (String(create || '') === '1') openCreate()
  },
  { immediate: true },
)

onBeforeUnmount(() => galleryStore.releaseAssetPreviewScope(MAP_PACK_PREVIEW_SCOPE_ID))
</script>

<template>
  <div class="map-pin-settings" data-testid="map-pin-settings-view">
    <header class="map-pin-header">
      <button type="button" :aria-label="t('返回地图设置', 'Back to Map settings')" data-testid="map-pin-settings-back" @click="goBack">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <div class="min-w-0">
        <span>{{ t('地图设置', 'MAP SETTINGS') }}</span>
        <h1>{{ t('地点与图钉', 'Places and pins') }}</h1>
      </div>
      <button type="button" :aria-label="t('新增地点', 'Add place')" data-testid="map-pin-create" @click="openCreate">
        <i class="fas fa-plus" aria-hidden="true"></i>
      </button>
    </header>

    <main class="map-pin-workspace">
      <section class="map-pin-canvas" data-testid="map-pin-management-canvas">
        <MapSceneCanvas
          :map-pack="renderedMapPack"
          :pins="mapScenePins"
          :pending-position="coordinateMode ? placeForm.position : null"
          :focus-position="mapFocusPosition"
          :allow-pin-placement="coordinateMode"
          @place-pin="onCoordinateSelected"
          @select-pin="onMapPinSelected"
        />
        <div v-if="coordinateMode" class="map-pin-placement" data-testid="map-pin-coordinate-mode">
          <i class="fas fa-location-crosshairs" aria-hidden="true"></i>
          <span><strong>{{ t('选择图钉坐标', 'Select pin coordinates') }}</strong><small>{{ t('点击地图确认，不会通过拖拽误改位置', 'Tap the map to confirm; pins are never moved by dragging') }}</small></span>
          <button type="button" @click="cancelCoordinateSelection">{{ t('取消', 'Cancel') }}</button>
        </div>
      </section>

      <section class="map-pin-list-panel no-scrollbar">
        <div class="map-pin-filter" data-testid="map-pin-management-filter">
          <label>
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <input
              v-model="managementSearchText"
              type="search"
              data-testid="map-pin-management-search"
              :placeholder="t('搜索名称、地址或类型', 'Search name, address, or type')"
            />
          </label>
          <div
            class="map-pin-filter-categories no-scrollbar"
            data-testid="map-pin-management-categories"
            :aria-label="t('按地点类型筛选', 'Filter by place type')"
          >
            <button
              v-for="category in managementCategoryOptions"
              :key="category.id"
              type="button"
              :class="{ 'is-active': managementCategory === category.id }"
              :style="{ '--map-place-tone': category.tone }"
              :aria-pressed="managementCategory === category.id"
              :data-testid="`map-pin-management-category-${category.id}`"
              @click="managementCategory = category.id"
            >
              <i :class="category.icon" aria-hidden="true"></i>
              <span>{{ t(category.labelZh, category.labelEn) }}</span>
              <small>{{ category.count }}</small>
            </button>
          </div>
        </div>

        <div class="map-pin-list-heading">
          <div>
            <span>{{ t(activeMapPack.shortLabelZh, activeMapPack.shortLabelEn) }}</span>
            <h2>{{ t('我的图钉', 'My pins') }}</h2>
          </div>
          <div class="map-pin-heading-actions">
            <button type="button" :aria-label="t('查看图钉类型说明', 'View pin type guide')" data-testid="map-pin-category-guide-trigger" @click="categoryGuideOpen = true">
              <i class="fas fa-circle-info" aria-hidden="true"></i>
            </button>
            <small>{{ filteredUserPlaces.length }}/{{ userPlaces.length }}</small>
          </div>
        </div>

        <p v-if="feedback.text" class="map-pin-feedback" :class="`is-${feedback.tone}`" role="status">{{ feedback.text }}</p>

        <div v-if="filteredUserPlaces.length" class="map-pin-list" data-testid="map-user-pin-list">
          <button v-for="address in filteredUserPlaces" :key="address.id" type="button" class="map-pin-row" :style="{ '--map-place-tone': mapPlaceVisual(address).tone }" :data-testid="`map-user-pin-${address.id}`" @click="openEdit(address)">
            <i :class="mapPlaceVisual(address).icon" aria-hidden="true"></i>
            <span><strong>{{ address.label }}</strong><small>{{ address.detail }}</small></span>
            <span class="map-pin-coordinate">{{ formatMapPosition(address.position) || t('未设置', 'Not set') }}</span>
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
        <div v-else class="map-pin-empty">
          <i class="fas fa-location-dot" aria-hidden="true"></i>
          <span>{{ userPlaces.length ? t('没有符合条件的自定义图钉', 'No custom pins match this filter') : t('还没有自定义图钉', 'No custom pins yet') }}</span>
          <button v-if="!userPlaces.length" type="button" data-testid="map-pin-create-empty" @click="openCreate">{{ t('新增第一个图钉', 'Add first pin') }}</button>
        </div>

        <div class="map-pin-list-heading is-world">
          <div>
            <span>{{ t('地图包内容', 'MAP PACK CONTENT') }}</span>
            <h2>{{ t('世界地点', 'World places') }}</h2>
          </div>
          <small><i class="fas fa-lock" aria-hidden="true"></i> {{ filteredWorldPlaces.length }}/{{ worldPlaces.length }}</small>
        </div>
        <div v-if="filteredWorldPlaces.length" class="map-pin-list" data-testid="map-world-pin-list">
          <div v-for="place in filteredWorldPlaces" :key="place.id" class="map-pin-row is-readonly" :style="{ '--map-place-tone': mapPlaceVisual(place).tone }">
            <i :class="mapPlaceVisual(place).icon" aria-hidden="true"></i>
            <span><strong>{{ mapPlaceName(place) }}</strong><small>{{ mapPlaceDetail(place) }}</small></span>
            <span class="map-pin-coordinate">{{ formatMapPosition(place.position) }}</span>
            <i class="fas fa-lock" aria-hidden="true"></i>
          </div>
        </div>
        <div v-else class="map-pin-empty is-compact">
          <i class="fas fa-filter-circle-xmark" aria-hidden="true"></i>
          <span>{{ t('没有符合条件的世界地点', 'No world places match this filter') }}</span>
        </div>
      </section>
    </main>

    <div v-if="editorOpen" class="map-pin-editor-backdrop" @click.self="closeEditor">
      <section class="map-pin-editor" role="dialog" aria-modal="true" :aria-label="editingAddressId ? t('编辑地点', 'Edit place') : t('新增地点', 'Add place')" data-testid="map-pin-editor">
        <div class="map-pin-editor-head">
          <div>
            <span>{{ editingAddressId ? t('我的图钉', 'MY PIN') : t('新图钉', 'NEW PIN') }}</span>
            <h2>{{ editingAddressId ? t('编辑地点', 'Edit place') : t('新增地点', 'Add place') }}</h2>
          </div>
          <div class="map-pin-editor-head-actions">
            <button type="button" :aria-label="t('查看图钉类型说明', 'View pin type guide')" data-testid="map-pin-category-guide-editor-trigger" @click="categoryGuideOpen = true"><i class="fas fa-circle-info" aria-hidden="true"></i></button>
            <button type="button" :aria-label="t('关闭', 'Close')" @click="closeEditor"><i class="fas fa-xmark" aria-hidden="true"></i></button>
          </div>
        </div>

        <div
          class="map-pin-type-summary"
          :style="{ '--map-place-tone': selectedPlaceIconType.tone }"
          data-testid="map-pin-selected-type"
        >
          <span><i :class="selectedPlaceIconType.icon" aria-hidden="true"></i></span>
          <div>
            <small>{{ t('地点分类与图标', 'Category and icon') }}</small>
            <strong>
              {{ t(selectedPlaceCategoryGroup.labelZh, selectedPlaceCategoryGroup.labelEn) }}
              · {{ t(selectedPlaceIconType.labelZh, selectedPlaceIconType.labelEn) }}
            </strong>
          </div>
        </div>

        <div class="map-pin-category-groups" :aria-label="t('选择地点图标', 'Choose place icon')">
          <section
            v-for="group in MAP_PLACE_CATEGORY_GROUPS"
            :key="group.id"
            class="map-pin-category-group"
            :class="{ 'is-selected': selectedPlaceCategoryGroup.id === group.id }"
            :style="{ '--map-group-tone': group.tone }"
            :data-testid="`map-pin-icon-group-${group.id}`"
          >
            <div class="map-pin-category-group-heading">
              <i :class="group.icon" aria-hidden="true"></i>
              <strong>{{ t(group.labelZh, group.labelEn) }}</strong>
              <small>{{ group.iconTypes.length }}</small>
            </div>
            <div class="map-pin-category-grid" role="group" :aria-label="t(group.labelZh, group.labelEn)">
              <button
                v-for="iconType in group.iconTypes"
                :key="iconType.id"
                type="button"
                :class="{ 'is-active': placeForm.category === iconType.id }"
                :style="{ '--map-place-tone': iconType.tone }"
                :aria-pressed="placeForm.category === iconType.id"
                :data-testid="`map-pin-icon-type-${iconType.id}`"
                @click="placeForm.category = iconType.id"
              >
                <i :class="iconType.icon" aria-hidden="true"></i>
                <span>{{ t(iconType.labelZh, iconType.labelEn) }}</span>
              </button>
            </div>
          </section>
        </div>

        <label class="map-pin-field">
          <span>{{ t('名称', 'Name') }}</span>
          <input v-model="placeForm.label" data-testid="map-pin-name" :placeholder="t('例如：家、公司、避难所', 'Home, office, shelter...')" />
        </label>
        <label class="map-pin-field">
          <span>{{ t('地址或地点说明', 'Address or description') }}</span>
          <input v-model="placeForm.detail" data-testid="map-pin-detail" :placeholder="t('用于识别和搜索，不决定图钉位置', 'Used for recognition and search, not pin placement')" />
        </label>

        <div class="map-pin-position-summary" :class="{ 'has-position': placeForm.position }">
          <i class="fas fa-map-pin" aria-hidden="true"></i>
          <span><strong>{{ placeForm.position ? t('地图坐标已设置', 'Map coordinates set') : t('地图坐标未设置', 'Map coordinates not set') }}</strong><small>{{ formatMapPosition(placeForm.position) || t('坐标决定图钉在地图上的位置', 'Coordinates determine the pin position') }}</small></span>
        </div>
        <div class="map-pin-position-actions">
          <button type="button" data-testid="map-pin-reselect-coordinate" @click="startCoordinateSelection"><i class="fas fa-crosshairs" aria-hidden="true"></i>{{ placeForm.position ? t('重新选点', 'Reselect') : t('地图选点', 'Choose on map') }}</button>
          <button type="button" :disabled="!currentLocation.position || currentLocation.mapPackId !== activeMapPackId" @click="useCurrentCoordinate"><i class="fas fa-location-arrow" aria-hidden="true"></i>{{ t('使用角色位置', 'Use role position') }}</button>
        </div>

        <div class="map-pin-editor-actions">
          <button v-if="editingAddressId" type="button" class="is-danger" @click="removePlace"><i class="fas fa-trash-can" aria-hidden="true"></i><span>{{ t('删除', 'Delete') }}</span></button>
          <button type="button" class="is-primary" :disabled="!canSave" data-testid="map-pin-save" @click="savePlace"><i class="fas fa-check" aria-hidden="true"></i><span>{{ t('保存', 'Save') }}</span></button>
        </div>
      </section>
    </div>

    <MapPinCategoryGuide v-if="categoryGuideOpen" @close="categoryGuideOpen = false" />
  </div>
</template>

<style scoped>
.map-pin-settings {
  --pin-ink: #17211d;
  --pin-muted: #69746e;
  --pin-line: #dce2de;
  --pin-accent: #18705a;
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #eef1ee;
  color: var(--pin-ink);
}

.map-pin-header {
  z-index: 5;
  display: grid;
  min-height: 104px;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--pin-line);
  background: rgba(250, 251, 249, 0.96);
  padding: 42px 16px 14px;
}

.map-pin-header > button,
.map-pin-editor-head-actions > button {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid var(--pin-line);
  border-radius: 8px;
  background: #fff;
  color: var(--pin-ink);
}

.map-pin-header span,
.map-pin-editor-head span,
.map-pin-list-heading span {
  display: block;
  color: var(--pin-muted);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}

.map-pin-header h1,
.map-pin-editor-head h2,
.map-pin-list-heading h2 {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0;
}

.map-pin-workspace {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-rows: minmax(260px, 42%) minmax(0, 1fr);
}

.map-pin-canvas {
  position: relative;
  min-height: 260px;
  overflow: hidden;
  border-bottom: 1px solid var(--pin-line);
  background: #1f2b26;
}

.map-pin-canvas :deep(.map-scene-identity) { top: 14px; }
.map-pin-canvas :deep(.map-scene-faction-control) { top: 56px; }
.map-pin-canvas :deep(.map-scene-attribution) { top: auto; bottom: 8px; }
.map-pin-canvas :deep(.leaflet-control-zoom),
.map-pin-canvas :deep(.map-scene-canvas[data-map-kind='real'] .leaflet-control-zoom) { margin-top: 72px; }

.map-pin-placement {
  position: absolute;
  right: 12px;
  bottom: 14px;
  left: 12px;
  z-index: 500;
  display: grid;
  min-height: 58px;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 8px;
  background: rgba(19, 32, 26, 0.92);
  padding: 8px 9px;
  color: #fff;
  box-shadow: 0 14px 34px rgba(12, 20, 16, 0.28);
  backdrop-filter: blur(12px);
}

.map-pin-placement > i { text-align: center; }
.map-pin-placement span { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.map-pin-placement strong { font-size: 11px; }
.map-pin-placement small { font-size: 9px; line-height: 1.35; opacity: 0.72; }
.map-pin-placement button { min-height: 34px; padding: 0 8px; color: #bfe7d5; font-size: 10px; font-weight: 800; }

.map-pin-list-panel { min-height: 0; overflow-y: auto; background: #f7f8f6; padding: 17px 17px calc(32px + env(safe-area-inset-bottom)); }
.map-pin-filter { display: grid; gap: 9px; margin-bottom: 18px; }
.map-pin-filter > label { display: grid; min-height: 40px; grid-template-columns: 30px minmax(0, 1fr); align-items: center; border: 1px solid var(--pin-line); border-radius: 7px; background: #fff; color: #78847d; }
.map-pin-filter > label > i { text-align: center; font-size: 10px; }
.map-pin-filter input { min-width: 0; height: 38px; border: 0; background: transparent; padding: 0 9px 0 0; color: var(--pin-ink); font-size: 11px; outline: none; }
.map-pin-filter-categories { display: flex; flex-wrap: wrap; gap: 6px; padding-bottom: 2px; }
.map-pin-filter-categories button { display: inline-flex; min-height: 34px; flex: 0 0 auto; align-items: center; gap: 6px; border: 1px solid var(--pin-line); border-radius: 7px; background: #fff; padding: 0 8px; color: #5f6e66; font-size: 9px; font-weight: 800; }
.map-pin-filter-categories button.is-active { border-color: var(--map-place-tone); background: color-mix(in srgb, var(--map-place-tone) 10%, white); color: var(--map-place-tone); }
.map-pin-filter-categories button small { border-radius: 4px; background: #eef2ef; padding: 2px 4px; color: inherit; font-size: 8px; }
.map-pin-list-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.map-pin-list-heading.is-world { margin-top: 22px; }
.map-pin-heading-actions { display: flex; align-items: center; gap: 6px; }
.map-pin-heading-actions > button { display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid var(--pin-line); border-radius: 6px; background: #fff; color: #526158; font-size: 10px; }
.map-pin-list-heading > small,
.map-pin-heading-actions > small { border-radius: 6px; background: #e4ebe6; padding: 4px 7px; color: #476154; font-size: 9px; font-weight: 800; }
.map-pin-list { border-top: 1px solid var(--pin-line); }

.map-pin-row {
  display: grid;
  width: 100%;
  min-height: 66px;
  grid-template-columns: 36px minmax(0, 1fr) minmax(64px, auto) 10px;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid var(--pin-line);
  text-align: left;
}

.map-pin-row > i:first-child { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 7px; background: color-mix(in srgb, var(--map-place-tone) 14%, white); color: var(--map-place-tone); font-size: 11px; }
.map-pin-row > span:nth-child(2) { min-width: 0; }
.map-pin-row strong,
.map-pin-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.map-pin-row strong { font-size: 12px; }
.map-pin-row small { margin-top: 3px; color: var(--pin-muted); font-size: 9px; }
.map-pin-row > i:last-child { color: #95a099; font-size: 8px; }
.map-pin-row.is-readonly { color: #4f5b54; }
.map-pin-coordinate { color: var(--pin-muted); font-size: 8px; text-align: right; }
.map-pin-empty { display: flex; width: 100%; min-height: 92px; flex-direction: column; align-items: center; justify-content: center; gap: 7px; border: 1px dashed #bdc8c1; border-radius: 8px; color: var(--pin-muted); font-size: 11px; }
.map-pin-empty.is-compact { min-height: 70px; }
.map-pin-empty button { min-height: 34px; border-radius: 7px; background: var(--pin-accent); padding: 0 12px; color: #fff; font-size: 10px; font-weight: 800; }
.map-pin-feedback { margin-bottom: 10px; border: 1px solid #c4d8cc; border-radius: 7px; background: #e9f3ed; padding: 9px 10px; color: #32644d; font-size: 11px; }

.map-pin-editor-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(17, 28, 23, 0.42);
}

.map-pin-editor {
  width: min(100%, 640px);
  max-height: 82vh;
  overflow-y: auto;
  border: 1px solid var(--pin-line);
  border-radius: 8px 8px 0 0;
  background: #fafbf9;
  padding: 17px 18px calc(22px + env(safe-area-inset-bottom));
  box-shadow: 0 -18px 60px rgba(20, 32, 26, 0.24);
}

.map-pin-editor-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.map-pin-editor-head-actions { display: flex; flex: 0 0 auto; gap: 6px; }
.map-pin-type-summary { display: grid; min-height: 56px; grid-template-columns: 38px minmax(0, 1fr); align-items: center; gap: 10px; margin-top: 14px; border: 1px solid color-mix(in srgb, var(--map-place-tone) 30%, var(--pin-line)); border-radius: 7px; background: color-mix(in srgb, var(--map-place-tone) 7%, white); padding: 8px 10px; }
.map-pin-type-summary > span { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 7px; background: color-mix(in srgb, var(--map-place-tone) 14%, white); color: var(--map-place-tone); }
.map-pin-type-summary small,
.map-pin-type-summary strong { display: block; }
.map-pin-type-summary small { color: var(--pin-muted); font-size: 8px; font-weight: 800; }
.map-pin-type-summary strong { margin-top: 2px; font-size: 11px; }
.map-pin-category-groups { margin-top: 8px; border-top: 1px solid var(--pin-line); }
.map-pin-category-group { padding: 10px 0; border-bottom: 1px solid var(--pin-line); }
.map-pin-category-group-heading { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 5px; color: #5c6962; }
.map-pin-category-group-heading > i { color: var(--map-group-tone); font-size: 9px; text-align: center; }
.map-pin-category-group-heading strong { font-size: 9px; }
.map-pin-category-group-heading small { border-radius: 4px; background: #e9eeeb; padding: 2px 5px; color: #68756e; font-size: 8px; font-weight: 800; }
.map-pin-category-group.is-selected .map-pin-category-group-heading { color: var(--map-group-tone); }
.map-pin-category-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 7px; }
.map-pin-category-grid button { display: flex; min-width: 0; min-height: 56px; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border: 1px solid var(--pin-line); border-radius: 7px; background: color-mix(in srgb, var(--map-place-tone) 5%, white); padding: 6px 4px; color: var(--map-place-tone); font-size: 8px; font-weight: 800; line-height: 1.25; text-align: center; }
.map-pin-category-grid button span { max-width: 100%; overflow-wrap: anywhere; }
.map-pin-category-grid button.is-active { border-color: var(--map-place-tone); background: color-mix(in srgb, var(--map-place-tone) 14%, white); color: var(--map-place-tone); box-shadow: inset 0 0 0 1px var(--map-place-tone); }
.map-pin-field { display: block; margin-top: 12px; }
.map-pin-field > span { display: block; margin-bottom: 5px; color: var(--pin-muted); font-size: 10px; font-weight: 800; }
.map-pin-field input { width: 100%; min-height: 42px; border: 1px solid #ced7d1; border-radius: 7px; background: #fff; padding: 0 10px; color: var(--pin-ink); font-size: 12px; outline: none; }
.map-pin-field input:focus { border-color: var(--pin-accent); box-shadow: 0 0 0 3px rgba(24, 112, 90, 0.12); }
.map-pin-position-summary { display: grid; min-height: 58px; grid-template-columns: 32px minmax(0, 1fr); align-items: center; gap: 9px; margin-top: 13px; border: 1px solid var(--pin-line); border-radius: 7px; background: #f1f3f1; padding: 8px; color: #78837d; }
.map-pin-position-summary.has-position { border-color: #b9d4c5; background: #eaf3ee; color: var(--pin-accent); }
.map-pin-position-summary > i { text-align: center; }
.map-pin-position-summary span { min-width: 0; }
.map-pin-position-summary strong,
.map-pin-position-summary small { display: block; }
.map-pin-position-summary strong { font-size: 11px; }
.map-pin-position-summary small { margin-top: 3px; overflow: hidden; color: var(--pin-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.map-pin-position-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 8px; }
.map-pin-position-actions button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--pin-line); border-radius: 7px; background: #fff; color: #42564b; font-size: 10px; font-weight: 800; }
.map-pin-position-actions button:disabled { opacity: 0.45; }
.map-pin-editor-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 15px; }
.map-pin-editor-actions button { display: inline-flex; min-width: 86px; min-height: 44px; align-items: center; justify-content: center; gap: 7px; border-radius: 7px; padding: 0 14px; font-size: 11px; font-weight: 800; }
.map-pin-editor-actions .is-primary { background: var(--pin-accent); color: #fff; }
.map-pin-editor-actions .is-danger { margin-right: auto; color: #a54238; }
.map-pin-editor-actions button:disabled { opacity: 0.5; }

button:focus-visible,
input:focus-visible { outline: 2px solid #0f8061; outline-offset: 2px; }

@media (min-width: 760px) {
  .map-pin-workspace { grid-template-columns: minmax(0, 1.15fr) minmax(330px, 0.85fr); grid-template-rows: minmax(0, 1fr); }
  .map-pin-canvas { border-right: 1px solid var(--pin-line); border-bottom: 0; }
  .map-pin-editor { margin-bottom: 22px; border-radius: 8px; }
  .map-pin-category-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
