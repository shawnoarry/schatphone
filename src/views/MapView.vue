<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useMapStore } from '../stores/map'
import { useGalleryStore } from '../stores/gallery'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'
import { buildWorldBookRouteQuery } from '../lib/worldbook-navigation'
import { normalizeHomePageQuery, pushReturnTarget } from '../lib/navigation-return'
import {
  RELATIONSHIP_FACT_SOURCE_KEYS,
  recordMapSharedRouteRelationshipFact,
} from '../lib/relationship-fact-adapters'
import { resolveWorldAppUxContext } from '../lib/world-pack-app-bindings'
import { formatMapPosition } from '../lib/map-packs'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import MapAreaFeedbackPanel from '../components/map/MapAreaFeedbackPanel.vue'
import MapRouteFamiliarityPanel from '../components/map/MapRouteFamiliarityPanel.vue'
import MapSceneCanvas from '../components/map/MapSceneCanvas.vue'
import MapTripControlPanel from '../components/map/MapTripControlPanel.vue'
import MapTripHistoryPanel from '../components/map/MapTripHistoryPanel.vue'
import MapVisualSettingsPanel from '../components/map/MapVisualSettingsPanel.vue'
import { useChatStore } from '../stores/chat'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'
import {
  MEDIA_KIND,
  MEDIA_SIZE_SCENE,
  formatBytesCompact,
  resolveMediaSizeLimitBytes,
  validateMediaFileBySize,
} from '../lib/media-policy'

const router = useRouter()
const route = useRoute()
const chatStore = useChatStore()
const mapStore = useMapStore()
const galleryStore = useGalleryStore()
const systemStore = useSystemStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()

const {
  activeMapPackId,
  activeMapPack,
  activeMapPlaces,
  currentLocation,
  currentLocationText,
  tripForm,
  tripEstimate,
  tripRuntime,
  tripHistory,
  routeFamiliarity,
  mapAreaUnlocks,
  mapAreaFeedback,
  mapVisualSettings,
  mapAutomationRuntime,
  mapAiVisualAutomationPolicy,
} =
  storeToRefs(mapStore)

const addressForm = reactive({
  label: '',
  detail: '',
  position: null,
  category: 'home',
})
const pendingMapPosition = ref(null)
const mapSearchSuggestionsOpen = ref(false)
const placeCreatorOpen = ref(false)
const placePinMode = ref(false)
const selectedMapPlace = ref(null)
const activeCustomMapPreviewUrl = ref('')
const tripActionHint = ref({
  tone: '',
  message: '',
})
const mapVisualHint = ref({
  tone: '',
  message: '',
})
const mapVisualPreviewUrl = ref('')
const mapVisualQuickPreviewMap = reactive({})
const MAP_ASSET_PREVIEW_SCOPE_ID = 'map-view'
const mapOneOffVisualUrl = ref('')
const mapOneOffVisualName = ref('')
const mapVisualFileInputRef = ref(null)
const mapVisualLoading = ref(false)
const mapAiVisualRefreshing = ref(false)
const mapDrawerOpen = ref(false)
const mapDrawerFocus = ref('trip')
const sharedRouteContactId = ref('')
let runtimeTimer = null

const MAP_PACK_PREVIEW_SCOPE_ID = 'map-runtime-pack'

const MAP_DRAWER_SECTIONS = Object.freeze([
  { key: 'trip', icon: 'fas fa-route', labelZh: '行程', labelEn: 'Trip' },
  { key: 'places', icon: 'fas fa-map-location-dot', labelZh: '地点', labelEn: 'Places' },
  { key: 'progress', icon: 'fas fa-layer-group', labelZh: '探索', labelEn: 'Progress' },
  { key: 'visual', icon: 'fas fa-map', labelZh: '图层', labelEn: 'Layers' },
])
const MAP_PRIMARY_SECTIONS = MAP_DRAWER_SECTIONS.filter((section) => section.key !== 'visual')
const MAP_PLACE_CATEGORIES = Object.freeze([
  { id: 'home', icon: 'fas fa-house', labelZh: '居住', labelEn: 'Home' },
  { id: 'work', icon: 'fas fa-building', labelZh: '工作', labelEn: 'Work' },
  { id: 'school', icon: 'fas fa-graduation-cap', labelZh: '学校', labelEn: 'School' },
  { id: 'shop', icon: 'fas fa-store', labelZh: '商店', labelEn: 'Shop' },
  { id: 'leisure', icon: 'fas fa-mug-hot', labelZh: '休闲', labelEn: 'Leisure' },
  { id: 'other', icon: 'fas fa-location-dot', labelZh: '其他', labelEn: 'Other' },
])

const activeWorldPack = computed(() => systemStore.getActiveWorldPack?.() || {
  id: 'default_world',
  title: '默认世界',
  name: 'Default world',
})
const activeWorldName = computed(() =>
  t(
    activeWorldPack.value?.title || activeWorldPack.value?.name || '默认世界',
    activeWorldPack.value?.name || activeWorldPack.value?.title || 'Default world',
  ),
)
const renderedActiveMapPack = computed(() => ({
  ...activeMapPack.value,
  assetUrl:
    activeMapPack.value?.source === 'custom'
      ? activeCustomMapPreviewUrl.value
      : activeMapPack.value?.assetUrl,
}))
const mapFocusPosition = computed(() =>
  currentLocation.value?.mapPackId === activeMapPackId.value
    ? currentLocation.value.position
    : null,
)
const mapDrawerTitle = computed(() => {
  const section = MAP_DRAWER_SECTIONS.find((item) => item.key === mapDrawerFocus.value)
  return section ? t(section.labelZh, section.labelEn) : t('地图', 'Map')
})

const mapWorldAppContext = computed(() =>
  resolveWorldAppUxContext({
    systemStore,
    moduleKey: 'map',
    routeQuery: route.query,
    expectedArchetypes: ['transit'],
  }),
)
const mapAppTitle = computed(() => mapWorldAppContext.value?.bindingTitle || t('地图', 'Map'))
const mapRouteEyebrow = computed(() =>
  mapWorldAppContext.value
    ? t(mapWorldAppContext.value.packTitle, mapWorldAppContext.value.packName)
    : t('路线', 'Route'),
)
const returnsToMapSettings = computed(() => {
  const source = Array.isArray(route.query.source) ? route.query.source[0] : route.query.source
  return source === 'map-settings'
})

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const openWorldBook = (options = {}) => {
  router.push({
    path: '/worldbook',
    query: buildWorldBookRouteQuery({
      source: 'map',
      homePage: route.query.homePage,
      pointIds: options.pointIds,
      keyword: options.keyword,
      tag: options.tag,
      usage: options.usage,
    }),
  })
}

const openMapDrawer = (section = 'trip') => {
  const nextSection = MAP_DRAWER_SECTIONS.some((item) => item.key === section) ? section : 'trip'
  mapDrawerFocus.value = nextSection
  mapDrawerOpen.value = true
}

const closeMapDrawer = () => {
  mapDrawerOpen.value = false
}

const buildMapSettingsQuery = () => {
  const homePage = normalizeHomePageQuery(route.query.homePage)
  return {
    ...(route.query.from === 'home' ? { from: 'home' } : {}),
    ...(homePage ? { homePage } : {}),
  }
}

const openMapSettings = () => {
  router.push({ path: '/map/settings', query: buildMapSettingsQuery() })
}

const openSelectedPlaceManager = () => {
  const place = selectedMapPlace.value
  if (!place || place.source !== 'user') return
  router.push({
    path: '/map/settings/places',
    query: { ...buildMapSettingsQuery(), addressId: String(place.id) },
  })
  closePlaceDetail()
}

const resetAddressDraft = () => {
  addressForm.label = ''
  addressForm.detail = ''
  addressForm.position = null
  addressForm.category = 'home'
  pendingMapPosition.value = null
}

const openPlaceCreator = () => {
  selectedMapPlace.value = null
  resetAddressDraft()
  placeCreatorOpen.value = true
}

const closePlaceCreator = () => {
  placeCreatorOpen.value = false
}

const startPlacePinMode = () => {
  placeCreatorOpen.value = false
  closeMapDrawer()
  placePinMode.value = true
}

const cancelPlacePinMode = () => {
  placePinMode.value = false
  pendingMapPosition.value = null
  addressForm.position = null
  placeCreatorOpen.value = true
}

const useCurrentPositionForDraft = () => {
  if (!currentLocation.value?.position || currentLocation.value.mapPackId !== activeMapPackId.value) return
  addressForm.position = { ...currentLocation.value.position }
  pendingMapPosition.value = { ...currentLocation.value.position }
}

const addAddress = () => {
  const ok = mapStore.addAddress({
    ...addressForm,
    mapPackId: activeMapPackId.value,
    category: addressForm.category,
  })
  if (!ok) return
  const saved = activeMapPlaces.value.find(
    (place) => place.source === 'user' && place.label === addressForm.label.trim(),
  )
  selectedMapPlace.value = saved || null
  placeCreatorOpen.value = false
  placePinMode.value = false
  resetAddressDraft()
}

const updateTripFrom = (value) => {
  tripForm.value.from = value
}

const updateTripTo = (value) => {
  tripForm.value.to = value
  mapSearchSuggestionsOpen.value = true
}

const mapPlaceName = (place) =>
  t(place?.nameZh || place?.label || '', place?.nameEn || place?.label || '')

const mapPlaceDetail = (place) =>
  t(place?.detailZh || place?.detail || '', place?.detailEn || place?.detail || '')

const mapScenePins = computed(() =>
  activeMapPlaces.value
    .filter((place) => place?.position)
    .map((place) => ({
      ...place,
      name: mapPlaceName(place),
      detail: mapPlaceDetail(place),
      tone:
        activeMapPack.value.factions?.find((faction) => faction.id === place.factionId)?.tone ||
        (place.source === 'user' ? '#2563eb' : '#0f766e'),
    })),
)

const mapPlaceSearchResults = computed(() => {
  if (!mapSearchSuggestionsOpen.value) return []
  const query = typeof tripForm.value.to === 'string' ? tripForm.value.to.trim().toLocaleLowerCase() : ''
  if (!query) return []
  return activeMapPlaces.value
    .filter((place) => {
      const searchable = [
        mapPlaceName(place),
        mapPlaceDetail(place),
        place.nameZh,
        place.nameEn,
        place.detailZh,
        place.detailEn,
        place.label,
        place.detail,
        ...(Array.isArray(place.aliases) ? place.aliases : []),
      ]
      return searchable.some(
        (value) => typeof value === 'string' && value.toLocaleLowerCase().includes(query),
      )
    })
    .slice(0, 6)
})

const selectMapDestination = (place) => {
  mapStore.setTripEndpoint('to', mapPlaceDetail(place) || mapPlaceName(place))
  mapSearchSuggestionsOpen.value = false
  tripActionHint.value = { tone: '', message: '' }
}

const useMapPlaceAsCurrent = (place) => {
  mapStore.setCurrentLocation({
    label: mapPlaceName(place),
    detail: mapPlaceDetail(place),
    source: place.source === 'user' ? 'saved' : 'map_pack',
    mapPackId: activeMapPackId.value,
    position: place.position,
  })
  tripActionHint.value = { tone: '', message: '' }
}

const setTripFromMapPlace = (place) => {
  mapStore.setTripEndpoint('from', mapPlaceDetail(place) || mapPlaceName(place))
  tripActionHint.value = { tone: '', message: '' }
}

const setTripToMapPlace = (place) => {
  selectMapDestination(place)
}

const onMapPlacePin = ({ position }) => {
  if (!placePinMode.value) return
  pendingMapPosition.value = position
  addressForm.position = position
  if (!addressForm.detail.trim()) addressForm.detail = formatMapPosition(position)
  placePinMode.value = false
  placeCreatorOpen.value = true
}

const onMapPinSelected = (place) => {
  selectedMapPlace.value = place
  mapSearchSuggestionsOpen.value = false
}

const closePlaceDetail = () => {
  selectedMapPlace.value = null
}

const useSelectedPlaceAsCurrent = () => {
  if (!selectedMapPlace.value) return
  useMapPlaceAsCurrent(selectedMapPlace.value)
  closePlaceDetail()
}

const useSelectedPlaceAsDestination = () => {
  if (!selectedMapPlace.value) return
  setTripToMapPlace(selectedMapPlace.value)
  closePlaceDetail()
}

const useSelectedPlaceAsStart = () => {
  if (!selectedMapPlace.value) return
  setTripFromMapPlace(selectedMapPlace.value)
  closePlaceDetail()
}

const canSavePlace = computed(() =>
  Boolean(addressForm.label.trim() && addressForm.detail.trim() && addressForm.position),
)

const placeCategoryIcon = (category = '') =>
  MAP_PLACE_CATEGORIES.find((item) => item.id === category)?.icon || 'fas fa-location-dot'

const removeSelectedPlace = async () => {
  const place = selectedMapPlace.value
  if (!place || place.source !== 'user') return
  const confirmed = await confirmDialog({
    title: t('删除地点', 'Delete place'),
    message: t(`确定删除“${mapPlaceName(place)}”吗？`, `Delete “${mapPlaceName(place)}”?`),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return
  mapStore.removeAddress(place.id)
  closePlaceDetail()
}

const mapVisualAssetOptions = computed(() =>
  galleryStore
    .getAssetsByCategory('scenario')
    .concat(galleryStore.getAssetsByCategory('reference'))
    .filter((asset, index, list) => list.findIndex((item) => item.id === asset.id) === index)
    .slice(0, 200),
)

const mapVisualSelectedAsset = computed(() => {
  const assetId =
    typeof mapVisualSettings.value?.assetId === 'string'
      ? mapVisualSettings.value.assetId.trim()
      : ''
  if (!assetId) return null
  return galleryStore.findAssetById(assetId)
})

const mapVisualQuickAssetOptions = computed(() => {
  const merged = []
  const pushAsset = (asset) => {
    if (!asset?.id || merged.some((item) => item.id === asset.id)) return
    merged.push(asset)
  }

  pushAsset(mapVisualSelectedAsset.value)
  mapVisualAssetOptions.value.forEach((asset) => pushAsset(asset))
  return merged.slice(0, 5)
})

const mapVisualQuickOverflowCount = computed(() =>
  Math.max(0, mapVisualAssetOptions.value.length - mapVisualQuickAssetOptions.value.length),
)

const mapVisualQuickPreviewAssetIds = computed(() =>
  mapVisualQuickAssetOptions.value
    .map((asset) => (typeof asset?.id === 'string' ? asset.id.trim() : ''))
    .filter(Boolean),
)

const mapVisualSelectionTitle = computed(() => {
  if (mapVisualSelectedAsset.value) {
    return t('当前地图背景素材', 'Current map background asset')
  }
  return t('尚未选择地图背景', 'No map background selected yet')
})

const mapVisualSelectionDescription = computed(() => {
  if (mapVisualSelectedAsset.value) {
    return t(
      '当前地图会优先使用这张图作为背景；你可以点下方缩略图快速切换。',
      'This asset is currently used as the map background. Tap a thumbnail below to switch quickly.',
    )
  }
  return t(
    '你可以直接点下方缩略图快速绑定地图背景，也可以继续去相册管理素材。',
    'Tap a thumbnail below to bind a map background quickly, or continue managing assets in Gallery.',
  )
})

const mapVisualBindingStatusText = computed(() => {
  if (mapOneOffVisualUrl.value) {
    return t(
      '当前正在使用本次会话的单次背景；刷新页面后不会保留。',
      'A one-off visual is active for this session and will not persist after refresh.',
    )
  }
  if (resolvedMapVisualMode.value === 'gallery' && mapVisualSelectedAsset.value) {
    return t(
      '当前地图已启用素材库背景。',
      'The map is currently using a gallery-backed visual.',
    )
  }
  if (mapVisualSelectedAsset.value) {
    return t(
      '当前已记住一张素材库背景，但页面仍在默认视觉模式。',
      'A gallery background is remembered, but the page is still using default visual mode.',
    )
  }
  return t(
    '当前没有记住任何素材库背景，地图会继续使用默认视觉。',
    'No gallery background is remembered, so the map will continue using the default visual.',
  )
})

const resolvedMapVisualMode = computed(() =>
  mapStore.resolveMapVisualMode({
    assetAvailable: Boolean(mapVisualSelectedAsset.value),
  }),
)

const showMapVisualOnboarding = computed(
  () => mapVisualSettings.value?.onboardingPromptPending === true,
)

const useDefaultMapVisual = () => {
  mapStore.setMapVisualMode('default')
  mapStore.dismissMapVisualOnboardingPrompt()
  mapVisualHint.value = {
    tone: 'success',
    message: t('已使用默认地图视觉。', 'Using default map visual style.'),
  }
}

const useGalleryMapVisual = () => {
  mapStore.setMapVisualMode('gallery')
  mapStore.dismissMapVisualOnboardingPrompt()
  mapVisualHint.value = {
    tone: 'info',
    message: t('请从素材库选择地图背景图。', 'Please choose a map visual from gallery assets.'),
  }
}

const onMapVisualModeChange = (event) => {
  const mode = event?.target?.value
  mapStore.setMapVisualMode(mode)
  mapStore.dismissMapVisualOnboardingPrompt()
  mapVisualHint.value = { tone: '', message: '' }
}

const onMapVisualAssetChange = (event) => {
  const assetId = event?.target?.value || ''
  mapStore.setMapVisualAssetId(assetId)
  mapStore.dismissMapVisualOnboardingPrompt()
  mapVisualHint.value = { tone: '', message: '' }
}

const applyQuickMapVisualAsset = (assetId) => {
  if (typeof assetId !== 'string' || !assetId.trim()) return
  mapStore.setMapVisualMode('gallery')
  mapStore.setMapVisualAssetId(assetId.trim())
  mapStore.dismissMapVisualOnboardingPrompt()
  mapVisualHint.value = { tone: '', message: '' }
}

const openGallery = () => {
  router.push('/gallery')
}

const restoreDefaultMapVisual = () => {
  if (mapOneOffVisualUrl.value) {
    mapOneOffVisualUrl.value = ''
    mapOneOffVisualName.value = ''
  }
  mapStore.setMapVisualMode('default')
  mapStore.dismissMapVisualOnboardingPrompt()
  mapVisualHint.value = {
    tone: 'info',
    message: t('已切回默认地图视觉。', 'Switched back to default map visual.'),
  }
}

const clearMapVisualBinding = () => {
  const assetId =
    typeof mapVisualSettings.value?.assetId === 'string'
      ? mapVisualSettings.value.assetId.trim()
      : ''
  if (!assetId) return
  mapStore.setMapVisualAssetId('')
  if (mapVisualSettings.value?.mode === 'gallery') {
    mapStore.setMapVisualMode('default')
  }
  mapStore.dismissMapVisualOnboardingPrompt()
  mapVisualHint.value = {
    tone: 'info',
    message: t(
      '已清除地图背景绑定，当前回退为默认视觉。',
      'Cleared map background binding; default visual is now active.',
    ),
  }
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve) => {
    if (!(file instanceof File)) {
      resolve('')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })

const openMapVisualUploadPicker = () => {
  const input = mapVisualFileInputRef.value
  if (!(input instanceof HTMLInputElement)) return
  input.value = ''
  input.click()
}

const clearMapOneOffVisual = () => {
  if (!mapOneOffVisualUrl.value) return
  mapOneOffVisualUrl.value = ''
  mapOneOffVisualName.value = ''
  mapVisualHint.value = {
    tone: 'info',
    message: t('已清除本次地图背景。', 'One-off map visual was cleared.'),
  }
}

const onMapVisualFilePicked = async (event) => {
  const inputEl = event?.target
  const file = inputEl?.files?.[0]
  if (!(file instanceof File)) return

  try {
    const shouldImportToGallery = await confirmDialog({
      title: t('应用地图背景', 'Apply map visual'),
      message: t(
        '是否先导入素材库再应用？点击“取消”将仅本次使用，不入库。',
        'Import to gallery before applying? Click "Cancel" to apply as one-off without importing.',
      ),
      confirmText: t('导入后应用', 'Import first'),
      cancelText: t('仅本次使用', 'One-off use'),
      tone: 'accent',
    })

    if (!shouldImportToGallery) {
      const sizeGuard = validateMediaFileBySize(file, {
        scene: MEDIA_SIZE_SCENE.ONE_OFF_INLINE,
        fallbackKind: MEDIA_KIND.IMAGE,
      })
      if (!sizeGuard.ok && sizeGuard.reason === 'too_large') {
        mapVisualHint.value = {
          tone: 'warn',
          message: t(
            `单次地图背景过大（上限 ${formatBytesCompact(sizeGuard.maxBytes)}），请改为“导入素材库后应用”。`,
            `One-off map visual is too large (limit ${formatBytesCompact(sizeGuard.maxBytes)}). Use import-then-apply mode.`,
          ),
        }
        return
      }

      const dataUrl = await readFileAsDataUrl(file)
      if (!dataUrl) {
        mapVisualHint.value = {
          tone: 'warn',
          message: t('读取本地文件失败，请重试。', 'Failed to read local file. Please retry.'),
        }
        return
      }

      mapOneOffVisualUrl.value = dataUrl
      mapOneOffVisualName.value =
        typeof file.name === 'string' && file.name.trim()
          ? file.name.trim()
          : t('单次地图背景', 'One-off map visual')
      mapStore.setMapVisualMode('default')
      mapStore.dismissMapVisualOnboardingPrompt()
      mapVisualHint.value = {
        tone: 'success',
        message: t(
          '已应用本次地图背景（未入库，刷新后不会保留）。',
          'Applied as one-off map visual (not imported, not persisted after refresh).',
        ),
      }
      return
    }

    const result = await galleryStore.importAssetsFromFiles([file], {
      category: 'scenario',
    })

    let targetAssetId = ''
    if (Array.isArray(result?.importedIds) && result.importedIds.length > 0) {
      targetAssetId = result.importedIds[0]
    } else if (Array.isArray(result?.duplicateAssetIds) && result.duplicateAssetIds.length > 0) {
      targetAssetId = result.duplicateAssetIds[0]
      mapVisualHint.value = {
        tone: 'info',
        message: t('素材已存在，已复用素材库资源。', 'Asset already exists and was reused from gallery.'),
      }
    }

    if (!targetAssetId) {
      if (Number(result?.skippedTooLargeCount || 0) > 0) {
        const sizeLimitByKind = result?.sizeLimitByKind || {}
        const fallbackLimit = resolveMediaSizeLimitBytes(MEDIA_KIND.IMAGE, {
          scene: MEDIA_SIZE_SCENE.GALLERY_IMPORT,
        })
        const imageLimit = Number(sizeLimitByKind.image || fallbackLimit)
        mapVisualHint.value = {
          tone: 'warn',
          message: t(
            `文件超过素材导入上限（${formatBytesCompact(imageLimit)}），请压缩后重试。`,
            `File exceeds gallery import limit (${formatBytesCompact(imageLimit)}). Compress and retry.`,
          ),
        }
        return
      }
      mapVisualHint.value = {
        tone: 'warn',
        message: t('导入素材库失败，请重试。', 'Failed to import into gallery. Please retry.'),
      }
      return
    }

    mapOneOffVisualUrl.value = ''
    mapOneOffVisualName.value = ''
    mapStore.setMapVisualMode('gallery')
    mapStore.setMapVisualAssetId(targetAssetId)
    mapStore.dismissMapVisualOnboardingPrompt()
    mapVisualHint.value = {
      tone: 'success',
      message: t('已导入素材库并应用到地图背景。', 'Imported to gallery and applied as map visual.'),
    }
  } finally {
    if (inputEl) inputEl.value = ''
  }
}

const onMapAiVisualToggle = (event) => {
  mapStore.setMapAiVisualEnabled(event?.target?.checked === true)
  mapVisualHint.value = { tone: '', message: '' }
}

const onMapProviderVisualToggle = (event) => {
  mapStore.setMapProviderVisualEnabled(event?.target?.checked === true)
  mapVisualHint.value = { tone: '', message: '' }
}

const mapAiPolicySummary = computed(() => {
  const policy = mapAiVisualAutomationPolicy.value || {}
  if (policy.invokeEnabled) return t('可执行', 'Ready')
  if (policy.notifyOnly) return t('仅通知', 'Notify-only')
  if (!policy.masterEnabled) return t('总开关关闭', 'Master off')
  if (!policy.moduleEnabled) return t('地图模块关闭', 'Map module off')
  if (!policy.toggleEnabled) return t('地图内 AI 关闭', 'Map AI off')
  return t('不可执行', 'Blocked')
})

const mapAiPolicyHint = computed(() => {
  const policy = mapAiVisualAutomationPolicy.value || {}
  if (policy.invokeEnabled) {
    return t('当前可触发 AI 地图视觉刷新。', 'AI map visual refresh is available now.')
  }
  if (policy.reason === 'quiet_hours_notify_only') {
    return t('安静时段仅通知，不执行 AI 刷新。', 'Quiet hours are notify-only, AI refresh is skipped.')
  }
  if (policy.reason === 'notify_only_mode') {
    return t('仅通知模式开启，不执行 AI 刷新。', 'Notify-only mode is active, AI refresh is skipped.')
  }
  if (policy.reason === 'master_disabled') {
    return t('系统自动化总开关已关闭。', 'System automation master switch is off.')
  }
  if (policy.reason === 'module_disabled') {
    return t('设置中地图自动化模块未开启。', 'Map automation module is off in settings.')
  }
  if (policy.reason === 'map_ai_visual_disabled') {
    return t('当前页面的 AI 地图视觉开关未开启。', 'Map AI visual toggle is off on this page.')
  }
  return t('当前不可执行 AI 刷新。', 'AI refresh is currently unavailable.')
})

const mapProviderStatusLabel = computed(() => {
  const mode = mapAutomationRuntime.value?.lastProviderMode || ''
  if (mode === 'provider_image_url') return t('已生成图片链接', 'Generated image link')
  if (mode === 'provider_text') return t('已生成视觉描述', 'Generated visual note')
  if (mode === 'provider_failed') return t('供应商调用失败', 'Provider failed')
  if (mode === 'skipped_no_key') return t('缺少 API Key', 'API key missing')
  if (mode === 'disabled') return t('未启用', 'Disabled')
  if (mode === 'skipped_no_runner') return t('运行器不可用', 'Runner unavailable')
  return t('未执行', 'Not executed')
})

const mapProviderGeneratedImageUrl = computed(() => {
  const raw =
    typeof mapAutomationRuntime.value?.lastProviderImageUrl === 'string'
      ? mapAutomationRuntime.value.lastProviderImageUrl.trim()
      : ''
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) return ''
  return raw
})

const openAutomationSettings = () => {
  router.push({ path: '/settings', query: { menu: 'automation' } })
}

const triggerMapAiVisualRefresh = async () => {
  if (mapAiVisualRefreshing.value) return
  mapAiVisualRefreshing.value = true
  try {
    const result = await mapStore.requestMapAiVisualRefresh({ source: 'map_manual_refresh' })
    if (result?.ok && result?.runtimeResult === 'executed') {
      const providerMode = mapAutomationRuntime.value?.lastProviderMode || ''
      if (providerMode === 'provider_failed') {
        mapVisualHint.value = {
          tone: 'warn',
          message:
            mapAutomationRuntime.value?.lastProviderMessage ||
            t('供应商视觉生成失败，已自动回退默认视觉。', 'Provider visual failed; fallback remains available.'),
        }
        return
      }
      if (providerMode === 'skipped_no_key') {
        mapVisualHint.value = {
          tone: 'warn',
          message: t('未配置 API Key，已跳过供应商视觉生成。', 'API key missing. Provider visual step was skipped.'),
        }
        return
      }
      mapVisualHint.value = {
        tone: 'success',
        message: t('AI 地图视觉刷新完成。', 'AI map visual refresh completed.'),
      }
      return
    }
    if (result?.ok) {
      mapVisualHint.value = {
        tone: 'info',
        message: t('刷新请求已进入队列。', 'Refresh request has been queued.'),
      }
      return
    }

    const reason = result?.reason || ''
    if (reason === 'quiet_hours_notify_only' || reason === 'notify_only_mode') {
      mapVisualHint.value = {
        tone: 'warn',
        message: t('当前仅通知模式，已跳过执行。', 'Notify-only mode active, execution skipped.'),
      }
      return
    }
    if (reason === 'master_disabled' || reason === 'module_disabled') {
      mapVisualHint.value = {
        tone: 'warn',
        message: t('系统自动化策略阻止了本次刷新。', 'System automation policy blocked this refresh.'),
      }
      return
    }
    if (reason === 'map_ai_visual_disabled') {
      mapVisualHint.value = {
        tone: 'warn',
        message: t('请先开启“AI 地图视觉”。', 'Please enable "AI map visual" first.'),
      }
      return
    }
    mapVisualHint.value = {
      tone: 'warn',
      message: t('刷新请求未成功，请稍后重试。', 'Refresh request failed, please try again later.'),
    }
  } finally {
    mapAiVisualRefreshing.value = false
  }
}

const refreshMapVisualPreview = async () => {
  const selected = mapVisualSelectedAsset.value
  if (!selected) {
    mapVisualPreviewUrl.value = ''
    return
  }
  mapVisualLoading.value = true
  try {
    const previewUrl = await galleryStore.getAssetPreviewUrl(selected.id, {
      scopeId: MAP_ASSET_PREVIEW_SCOPE_ID,
    })
    mapVisualPreviewUrl.value = typeof previewUrl === 'string' ? previewUrl : ''
  } finally {
    mapVisualLoading.value = false
  }
}

const ensureMapVisualQuickPreview = async (assetId) => {
  if (!assetId || mapVisualQuickPreviewMap[assetId]) return
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId, {
    scopeId: MAP_ASSET_PREVIEW_SCOPE_ID,
  })
  if (!previewUrl) return
  mapVisualQuickPreviewMap[assetId] = previewUrl
}

watch(
  [() => mapVisualSettings.value?.mode, () => mapVisualSettings.value?.assetId, mapVisualSelectedAsset],
  async () => {
    if (mapVisualSettings.value?.mode === 'gallery' && !mapVisualSelectedAsset.value) {
      const fallbackApplied = mapStore.enforceMapVisualFallback({ assetAvailable: false })
      if (fallbackApplied) {
        mapVisualHint.value = {
          tone: 'warn',
          message: t(
            '绑定素材不可用，已自动回退为默认地图视觉。',
            'Bound asset is unavailable; auto-fallback switched to default map visual.',
          ),
        }
      }
    }
    await refreshMapVisualPreview()
  },
  { immediate: true },
)

watch(
  mapVisualQuickPreviewAssetIds,
  (assetIds) => {
    const activeSet = new Set(assetIds)
    assetIds.forEach((assetId) => {
      void ensureMapVisualQuickPreview(assetId)
    })
    Object.keys(mapVisualQuickPreviewMap).forEach((assetId) => {
      if (!activeSet.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, MAP_ASSET_PREVIEW_SCOPE_ID)
        delete mapVisualQuickPreviewMap[assetId]
      }
    })
  },
  { immediate: true },
)

const isTripTraveling = computed(() => tripRuntime.value.status === 'traveling')
const isTripArrived = computed(() => tripRuntime.value.status === 'arrived')

const relationshipContactOptions = computed(() =>
  chatStore.contacts
    .filter((contact) => contact.kind !== 'service' && contact.kind !== 'official')
    .map((contact) => ({
      ...contact,
      optionValue: String(contact.id),
      optionLabel: contact.name || `Contact ${contact.id}`,
    })),
)

const selectedSharedRouteContact = computed(() =>
  relationshipContactOptions.value.find(
    (contact) => contact.optionValue === String(sharedRouteContactId.value || ''),
  ) || null,
)

const canStartTrip = computed(() => {
  const from = typeof tripForm.value?.from === 'string' ? tripForm.value.from.trim() : ''
  const to = typeof tripForm.value?.to === 'string' ? tripForm.value.to.trim() : ''
  return Boolean(from && to && from !== to && !isTripTraveling.value)
})

const tripStatusLabel = computed(() => {
  if (isTripTraveling.value) return t('进行中', 'In transit')
  if (isTripArrived.value) return t('已到达', 'Arrived')
  return t('待出发', 'Ready')
})

const tripProgressPercent = computed(() => {
  const progress = Number(tripRuntime.value?.progress || 0)
  if (!Number.isFinite(progress)) return 0
  return Math.max(0, Math.min(100, Math.round(progress * 100)))
})

const tripArrivalPushStatusLabel = computed(() => {
  if (!isTripTraveling.value) return t('未布置', 'Not armed')
  if (tripRuntime.value?.scheduledPushId) return t('已布置', 'Armed')
  return t('未布置', 'Not armed')
})

const tripArrivalPushHint = computed(() => {
  if (!isTripTraveling.value) {
    return t('开始行程后，可在支持真推送时布置后台到达提醒。', 'Once a trip starts, a background arrival reminder can be armed when real push is available.')
  }
  if (tripRuntime.value?.scheduledPushId) {
    return t('即使页面关闭，只要推送服务可达，到点后仍可收到系统通知。', 'Even with the page closed, a system notification can still arrive when the schedule is due.')
  }
  return t('当前未布置后台到达提醒；请检查真推送订阅与服务状态。', 'Background arrival reminder is not armed yet; check real push subscription and server status.')
})

const mapRewardScore = computed(() =>
  tripHistory.value.reduce(
    (sum, item) => sum + (item?.status === 'arrived' ? Math.max(0, Number(item.rewardPoints) || 0) : 0),
    0,
  ),
)

const visibleRouteFamiliarity = computed(() => routeFamiliarity.value.slice(0, 5))
const unlockedMapAreaCount = computed(() =>
  mapAreaUnlocks.value.filter((area) => area?.unlocked).length,
)
const visibleMapAreaUnlocks = computed(() => mapAreaUnlocks.value.slice(0, 4))
const visibleMapAreaFeedback = computed(() => mapAreaFeedback.value.slice(0, 4))
const visibleTripHistory = computed(() => tripHistory.value.slice(0, 8))
const primaryMapAreaFeedback = computed(() => visibleMapAreaFeedback.value[0] || null)
const primaryRouteFamiliarity = computed(() => visibleRouteFamiliarity.value[0] || null)
const activeTripRouteLabel = computed(() => {
  const from =
    tripRuntime.value?.fromLabel ||
    tripForm.value?.from ||
    currentLocation.value?.label ||
    t('当前位置', 'Current location')
  const to = tripRuntime.value?.toLabel || tripForm.value?.to || t('目的地', 'Destination')
  return `${from} -> ${to}`
})

const mapDestinationHint = computed(() => {
  const to = typeof tripForm.value?.to === 'string' ? tripForm.value.to.trim() : ''
  if (to) return to
  if (primaryMapAreaFeedback.value) {
    return t(primaryMapAreaFeedback.value.titleZh, primaryMapAreaFeedback.value.titleEn)
  }
  if (primaryRouteFamiliarity.value) {
    return primaryRouteFamiliarity.value.toLabel || primaryRouteFamiliarity.value.to || ''
  }
  return ''
})

const mapPrimarySheetTitle = computed(() => {
  if (isTripTraveling.value) return t('正在前往目的地', 'Heading to destination')
  if (isTripArrived.value) return t('已到达目的地', 'Arrived at destination')
  if (mapDestinationHint.value) return t('准备规划路线', 'Ready to plan route')
  return t('选择目的地', 'Choose a destination')
})

const mapPrimarySheetDescription = computed(() => {
  if (isTripTraveling.value || isTripArrived.value) return activeTripRouteLabel.value
  if (mapDestinationHint.value) {
    return t(`当前位置到 ${mapDestinationHint.value}`, `Current location to ${mapDestinationHint.value}`)
  }
  return t('输入目的地，或从地点、探索反馈和历史路线中选择。', 'Enter a destination, or choose from places, feedback, and route history.')
})

const buildMapKnowledgeContextTexts = (item = {}) =>
  [
    item.titleZh,
    item.titleEn,
    item.summaryZh,
    item.summaryEn,
    item.areaLabelZh,
    item.areaLabelEn,
    item.descriptionZh,
    item.descriptionEn,
    item.routeLabel,
    item.from,
    item.to,
    item.fromLabel,
    item.toLabel,
    item.tierLabelZh,
    item.tierLabelEn,
    item.eventTitleZh,
    item.eventTitleEn,
    item.eventSummaryZh,
    item.eventSummaryEn,
  ]
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)

const buildMapKnowledgeContextTags = (item = {}, options = {}) => {
  const tags = ['map', 'travel']
  const kind = typeof options.kind === 'string' ? options.kind.trim() : ''
  if (kind) tags.push(kind)

  const areaId = typeof item.areaId === 'string' && item.areaId.trim() ? item.areaId.trim() : ''
  const tier = typeof item.tier === 'string' && item.tier.trim() ? item.tier.trim() : ''
  const eventKind =
    typeof item.eventKind === 'string' && item.eventKind.trim() ? item.eventKind.trim() : ''

  if (areaId) tags.push(areaId)
  if (tier) tags.push(tier)
  if (eventKind) tags.push(eventKind)

  return tags
}

const buildRelatedKnowledgePointIndex = (items = [], options = {}) =>
  Object.fromEntries(
    items
      .map((item) => {
        const itemKey =
          typeof item?.id === 'string' && item.id.trim()
            ? item.id.trim()
            : typeof item?.key === 'string' && item.key.trim()
              ? item.key.trim()
              : ''
        if (!itemKey) return null
        return [
          itemKey,
          systemStore.findRelevantKnowledgePoints({
            texts: buildMapKnowledgeContextTexts(item),
            tags: buildMapKnowledgeContextTags(item, options),
            limit: 3,
          }),
        ]
      })
      .filter(Boolean),
  )

const mapAreaFeedbackKnowledgePoints = computed(() =>
  buildRelatedKnowledgePointIndex(visibleMapAreaFeedback.value, { kind: 'area_feedback' }),
)
const routeFamiliarityKnowledgePoints = computed(() =>
  buildRelatedKnowledgePointIndex(visibleRouteFamiliarity.value, { kind: 'route' }),
)
const tripHistoryKnowledgePoints = computed(() =>
  buildRelatedKnowledgePointIndex(visibleTripHistory.value, { kind: 'trip_history' }),
)

const getRelatedKnowledgePoints = (collection, itemId) => {
  const source = collection?.value ?? collection ?? {}
  return source[itemId] || []
}

const getRouteFamiliarityNextHint = (route) => {
  if (!route?.nextTier) {
    return t('这条路线已达到当前最高熟悉度。', 'This route is at the current top familiarity tier.')
  }
  return t(
    `距下一等级还需 ${Number(route.nextPoints) || 0} 点或 ${Number(route.nextCompletedCount) || 0} 次完成`,
    `Next tier: ${Number(route.nextPoints) || 0} pts or ${Number(route.nextCompletedCount) || 0} completions`,
  )
}

const getMapAreaUnlockHint = (area) => {
  if (area?.unlocked) {
    return t('已解锁，可作为后续地图事件和地点反馈的基础。', 'Unlocked for future map events and location feedback.')
  }

  const requirements = []
  if (Number(area?.remainingPoints) > 0) {
    requirements.push(t(`${area.remainingPoints} 点探索`, `${area.remainingPoints} pts`))
  }
  if (Number(area?.remainingCompletedTrips) > 0) {
    requirements.push(t(`${area.remainingCompletedTrips} 次行程`, `${area.remainingCompletedTrips} trips`))
  }
  if (Number(area?.remainingKnownRoutes) > 0) {
    requirements.push(t(`${area.remainingKnownRoutes} 条熟悉路线`, `${area.remainingKnownRoutes} known routes`))
  }
  if (Number(area?.remainingTrustedRoutes) > 0) {
    requirements.push(t(`${area.remainingTrustedRoutes} 条稳定路线`, `${area.remainingTrustedRoutes} trusted routes`))
  }

  if (requirements.length <= 0) {
    return t('继续完成行程即可推进解锁。', 'Complete more trips to progress this unlock.')
  }
  return t(`还需 ${requirements.join(' / ')}`, `Needs ${requirements.join(' / ')}`)
}

const formatSeconds = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const remain = total % 60
  if (!minutes) return t(`${remain} 秒`, `${remain}s`)
  return t(`${minutes} 分 ${remain} 秒`, `${minutes}m ${remain}s`)
}

const formatTime = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return '--:--'
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const startTrip = async () => {
  const result = mapStore.startTrip()
  if (result?.ok) {
    tripActionHint.value = {
      tone: 'success',
      message: t('行程已开始，系统会按真实时间推进。', 'Trip started. Progress now follows real time.'),
    }
    if (result?.remotePushPromise) {
      const remoteResult = await result.remotePushPromise
      if (remoteResult?.ok) {
        tripActionHint.value = {
          tone: 'success',
          message: t(
            '行程已开始，后台到达提醒也已布置。',
            'Trip started and background arrival push is armed.',
          ),
        }
      } else if (remoteResult?.reason === 'real_push_disabled') {
        tripActionHint.value = {
          tone: 'info',
          message: t(
            '行程已开始，但当前未满足真推送条件，未布置后台到达提醒。',
            'Trip started, but real push is not ready, so no background arrival push was armed.',
          ),
        }
      } else if (remoteResult?.reason) {
        tripActionHint.value = {
          tone: 'warn',
          message: t(
            '行程已开始，但后台到达提醒布置失败，请检查推送服务。',
            'Trip started, but background arrival push failed to arm. Please check push service.',
          ),
        }
      }
    }
    return
  }

  const code = result?.code || ''
  if (code === 'TRIP_ALREADY_IN_PROGRESS') {
    tripActionHint.value = {
      tone: 'warn',
      message: t('已有进行中的行程。', 'A trip is already in progress.'),
    }
    return
  }
  if (code === 'TRIP_ENDPOINT_SAME') {
    tripActionHint.value = {
      tone: 'warn',
      message: t('起点和终点不能相同。', 'From and to cannot be the same.'),
    }
    return
  }
  tripActionHint.value = {
    tone: 'warn',
    message: t('请先填写完整起点和终点。', 'Please fill both from and to first.'),
  }
}

const cancelTrip = () => {
  const ok = mapStore.cancelTrip()
  if (!ok) return
  tripActionHint.value = {
    tone: 'warn',
    message: t('已取消当前行程。', 'Current trip was cancelled.'),
  }
}

const acknowledgeArrival = () => {
  const sharedRouteTarget = selectedSharedRouteContact.value
  const ok = mapStore.acknowledgeTripArrival()
  if (!ok) return
  const latestReward = tripHistory.value.find((item) => item?.status === 'arrived' && Number(item.rewardPoints) > 0)
  if (latestReward && sharedRouteTarget) {
    mapStore.bindRelationshipToTrip(latestReward.id, {
      contactId: Number(sharedRouteTarget.id) || 0,
      profileId: Number(sharedRouteTarget.profileId || 0),
      kind: sharedRouteTarget.kind,
      name: sharedRouteTarget.name,
      sourceModule: 'chat',
      sourceId: String(sharedRouteTarget.id || ''),
    })
  }
  if (latestReward && sharedRouteTarget) {
    recordMapSharedRouteRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      trip: latestReward,
      target: sharedRouteTarget,
    })
  }
  tripActionHint.value = {
    tone: 'success',
    message: latestReward
      ? t(
          `行程已完成，获得 ${Number(latestReward.rewardPoints) || 0} 点探索进度。`,
          `Trip completed. Gained ${Number(latestReward.rewardPoints) || 0} exploration points.`,
        )
      : t('行程已完成。', 'Trip marked as completed.'),
  }
}

const deleteTripHistoryItem = (tripId) => {
  if (!mapStore.removeTripHistoryItem(tripId)) return
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.MAP_SHARED_ROUTE,
    tripId,
  )
}

const tickRuntime = () => {
  mapStore.tickTripRuntime(Date.now())
}

watch(
  () => activeWorldPack.value?.id,
  () => {
    const synced = mapStore.syncMapPackForWorld(activeWorldPack.value)
    if (!synced && activeMapPackId.value !== mapStore.resolveMapPackIdForWorld(activeWorldPack.value)) {
      tripActionHint.value = {
        tone: 'warn',
        message: t('行程结束后会切换到当前世界的地图。', 'This world map will become active after the trip ends.'),
      }
    }
  },
  { immediate: true },
)

watch(
  () => `${activeMapPack.value?.id || ''}:${activeMapPack.value?.assetId || ''}`,
  async () => {
    galleryStore.releaseAssetPreviewScope(MAP_PACK_PREVIEW_SCOPE_ID)
    activeCustomMapPreviewUrl.value = ''
    if (activeMapPack.value?.source !== 'custom' || !activeMapPack.value.assetId) return
    activeCustomMapPreviewUrl.value = await galleryStore.getAssetPreviewUrl(
      activeMapPack.value.assetId,
      { scopeId: MAP_PACK_PREVIEW_SCOPE_ID },
    )
  },
  { immediate: true },
)

watch(
  () => route.query.panel,
  (panel) => {
    if (panel === 'visual') openMapDrawer('visual')
  },
  { immediate: true },
)

onMounted(() => {
  tickRuntime()
  runtimeTimer = setInterval(() => {
    tickRuntime()
  }, 1000)
})

onBeforeUnmount(() => {
  if (runtimeTimer) {
    clearInterval(runtimeTimer)
    runtimeTimer = null
  }
  Object.keys(mapVisualQuickPreviewMap).forEach((assetId) => {
    galleryStore.releaseAssetPreview(assetId, MAP_ASSET_PREVIEW_SCOPE_ID)
    delete mapVisualQuickPreviewMap[assetId]
  })
  galleryStore.releaseAssetPreviewScope(MAP_ASSET_PREVIEW_SCOPE_ID)
  galleryStore.releaseAssetPreviewScope(MAP_PACK_PREVIEW_SCOPE_ID)
})
</script>

<template>
  <div class="map-immersive-root" data-app="map" :data-world-pack="activeWorldPack.id">
    <header class="map-topbar">
      <button type="button" class="map-topbar-button" :aria-label="returnsToMapSettings ? t('返回地图设置', 'Back to Map settings') : t('返回首页', 'Back to Home')" @click="goHome">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <div class="map-topbar-title">
        <h1>{{ mapAppTitle }}</h1>
        <p>{{ activeWorldName }} · {{ t(activeMapPack.shortLabelZh, activeMapPack.shortLabelEn) }}</p>
      </div>
      <button type="button" class="map-topbar-button" data-testid="map-open-settings" :aria-label="t('地图设置', 'Map settings')" @click="openMapSettings">
        <i class="fas fa-gear" aria-hidden="true"></i>
      </button>
    </header>

    <main class="map-canvas-shell" data-testid="map-primary-shell">
      <section class="map-canvas" data-testid="map-primary-canvas">
        <MapSceneCanvas
          :map-pack="renderedActiveMapPack"
          :pins="mapScenePins"
          :pending-position="pendingMapPosition"
          :focus-position="mapFocusPosition"
          :allow-pin-placement="placePinMode"
          @place-pin="onMapPlacePin"
          @select-pin="onMapPinSelected"
        />

        <div class="map-search-card" :class="{ 'has-results': mapPlaceSearchResults.length > 0 }">
          <label class="map-search-row">
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <input
              :value="tripForm.to"
              class="map-destination-input"
              :placeholder="t('搜索地点或输入目的地', 'Search places or enter destination')"
              data-testid="map-destination-search"
              @input="updateTripTo($event.target.value)"
            />
            <button
              v-if="tripForm.to"
              type="button"
              :aria-label="t('清除搜索', 'Clear search')"
              @click="updateTripTo('')"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </label>
          <div
            v-if="mapPlaceSearchResults.length > 0"
            class="map-place-results"
            data-testid="map-local-place-results"
          >
            <button
              v-for="place in mapPlaceSearchResults"
              :key="place.placeId"
              type="button"
              class="map-place-result"
              @click="onMapPinSelected(place)"
            >
              <span class="map-place-result-icon">
                <i :class="place.icon || 'fas fa-location-dot'" aria-hidden="true"></i>
              </span>
              <span class="min-w-0 text-left">
                <span class="block truncate text-xs font-semibold text-slate-900">{{ mapPlaceName(place) }}</span>
                <span class="block truncate text-[10px] text-slate-500">{{ mapPlaceDetail(place) }}</span>
              </span>
            </button>
          </div>
        </div>

        <div class="map-context-strip" data-testid="map-world-context">
          <span><i :class="activeMapPack.kind === 'real' ? 'fas fa-city' : 'fas fa-shield-halved'" aria-hidden="true"></i>{{ activeWorldName }}</span>
          <button type="button" @click="openMapSettings">{{ t('地图来源', 'Map source') }}</button>
        </div>

        <div class="map-location-chip">
          <i class="fas fa-location-crosshairs" aria-hidden="true"></i>
          <span><small>{{ t('当前位置', 'Current location') }}</small><strong>{{ currentLocationText }}</strong></span>
        </div>

        <button type="button" class="map-current-location-button" data-testid="map-open-places" :aria-label="t('地点列表', 'Places')" @click="openMapDrawer('places')">
          <i class="fas fa-bookmark" aria-hidden="true"></i>
        </button>

        <button type="button" class="map-add-place-button" data-testid="map-add-place" @click="openPlaceCreator">
          <i class="fas fa-plus" aria-hidden="true"></i>
          <span>{{ t('添加地点', 'Add place') }}</span>
        </button>

        <div v-if="placePinMode" class="map-placement-banner" data-testid="map-placement-mode">
          <i class="fas fa-location-crosshairs" aria-hidden="true"></i>
          <span>{{ t('点击地图确定地点位置', 'Tap the map to place this location') }}</span>
          <button type="button" @click="cancelPlacePinMode">{{ t('取消', 'Cancel') }}</button>
        </div>

        <div class="map-route-card" data-testid="map-primary-route-card">
          <div
            v-if="mapWorldAppContext"
            class="map-world-app-line"
            data-testid="map-world-app-context"
            :data-world-pack="mapWorldAppContext.packId"
            :data-world-app="mapWorldAppContext.bindingId"
          >
            <i :class="mapWorldAppContext.icon" aria-hidden="true"></i>
            <span>{{ mapWorldAppContext.bindingTitle }}</span>
          </div>
          <div class="map-route-summary">
            <div class="min-w-0">
              <p>{{ mapRouteEyebrow }}</p>
              <h2>{{ mapPrimarySheetTitle }}</h2>
              <span>{{ mapPrimarySheetDescription }}</span>
            </div>
            <div class="map-route-metrics">
              <strong>{{ tripEstimate.minutes }}</strong>
              <small>{{ t('分钟', 'min') }}</small>
            </div>
          </div>
          <div v-if="isTripTraveling || isTripArrived" class="mt-3">
            <div class="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                class="h-full rounded-full bg-blue-500 transition-all duration-500"
                :style="{ width: `${tripProgressPercent}%` }"
              ></div>
            </div>
            <p class="mt-1 text-[11px] text-slate-500">
              {{ tripProgressPercent }}% 路 {{ formatSeconds(tripRuntime.remainingSeconds) }}
            </p>
          </div>
          <div class="map-route-actions">
            <button
              type="button"
              class="map-primary-action"
              :disabled="!canStartTrip"
              :class="{ 'map-primary-action-disabled': !canStartTrip }"
              data-testid="map-primary-start-trip"
              @click="startTrip"
            >
              {{ isTripTraveling ? t('进行中', 'In transit') : isTripArrived ? t('已到达', 'Arrived') : t('开始行程', 'Start trip') }}
            </button>
            <button
              type="button"
              class="map-secondary-action"
              data-testid="map-open-trip-drawer"
              @click="openMapDrawer('trip')"
            >
              {{ t('详情', 'Details') }}
            </button>
          </div>
        </div>

        <nav class="map-bottom-nav" data-testid="map-secondary-menu">
          <button
            v-for="section in MAP_PRIMARY_SECTIONS"
            :key="section.key"
            type="button"
            class="map-bottom-nav-item"
            @click="openMapDrawer(section.key)"
          >
            <i :class="section.icon"></i>
            <span>{{ t(section.labelZh, section.labelEn) }}</span>
          </button>
        </nav>
      </section>
    </main>

    <div
      v-if="mapDrawerOpen"
      class="map-drawer-backdrop"
      data-testid="map-secondary-drawer"
      @click.self="closeMapDrawer"
    >
      <aside class="map-bottom-drawer">
        <div class="map-drawer-handle"></div>
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {{ activeWorldName }}
            </p>
            <h2 class="text-lg font-bold text-slate-950">
              {{ mapDrawerTitle }}
            </h2>
          </div>
          <button
            v-if="returnsToMapSettings && mapDrawerFocus === 'visual'"
            type="button"
            class="h-9 w-9 rounded-full bg-slate-100 text-slate-600"
            :aria-label="t('返回地图设置', 'Back to Map settings')"
            data-testid="map-visual-return-settings"
            @click="goHome"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          <button
            v-else
            type="button"
            class="h-9 w-9 rounded-full bg-slate-100 text-slate-600"
            :aria-label="t('关闭', 'Close')"
            @click="closeMapDrawer"
          >
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div class="map-drawer-tabs">
          <button
            v-for="section in MAP_PRIMARY_SECTIONS"
            :key="section.key"
            type="button"
            class="map-drawer-tab"
            :class="{ 'map-drawer-tab-active': mapDrawerFocus === section.key }"
            @click="mapDrawerFocus = section.key"
          >
            <i :class="section.icon"></i>
            {{ t(section.labelZh, section.labelEn) }}
          </button>
        </div>

        <div class="map-drawer-content no-scrollbar p-4 space-y-4">
      <MapVisualSettingsPanel
        v-show="mapDrawerFocus === 'visual'"
        :current-location-text="currentLocationText"
        :resolved-map-visual-mode="resolvedMapVisualMode"
        :map-visual-preview-url="mapVisualPreviewUrl"
        :map-one-off-visual-url="mapOneOffVisualUrl"
        :map-one-off-visual-name="mapOneOffVisualName"
        :map-provider-generated-image-url="mapProviderGeneratedImageUrl"
        :map-visual-binding-status-text="mapVisualBindingStatusText"
        :show-map-visual-onboarding="showMapVisualOnboarding"
        :map-visual-settings="mapVisualSettings"
        :map-visual-asset-options="mapVisualAssetOptions"
        :map-visual-selected-asset="mapVisualSelectedAsset"
        :map-visual-selection-title="mapVisualSelectionTitle"
        :map-visual-selection-description="mapVisualSelectionDescription"
        :map-visual-quick-asset-options="mapVisualQuickAssetOptions"
        :map-visual-quick-overflow-count="mapVisualQuickOverflowCount"
        :map-visual-quick-preview-map="mapVisualQuickPreviewMap"
        :map-automation-runtime="mapAutomationRuntime"
        :map-ai-visual-automation-policy="mapAiVisualAutomationPolicy"
        :map-ai-policy-summary="mapAiPolicySummary"
        :map-ai-policy-hint="mapAiPolicyHint"
        :map-provider-status-label="mapProviderStatusLabel"
        :map-ai-visual-refreshing="mapAiVisualRefreshing"
        :map-visual-loading="mapVisualLoading"
        :map-visual-hint="mapVisualHint"
        :format-time="formatTime"
        @use-default-map-visual="useDefaultMapVisual"
        @use-gallery-map-visual="useGalleryMapVisual"
        @change-map-visual-mode="onMapVisualModeChange"
        @change-map-visual-asset="onMapVisualAssetChange"
        @open-gallery="openGallery"
        @restore-default-map-visual="restoreDefaultMapVisual"
        @clear-map-visual-binding="clearMapVisualBinding"
        @apply-quick-map-visual-asset="applyQuickMapVisualAsset"
        @open-upload-picker="openMapVisualUploadPicker"
        @clear-map-one-off-visual="clearMapOneOffVisual"
        @toggle-map-ai-visual="onMapAiVisualToggle"
        @toggle-map-provider-visual="onMapProviderVisualToggle"
        @trigger-map-ai-visual-refresh="triggerMapAiVisualRefresh"
        @open-automation-settings="openAutomationSettings"
      />
      <input
        ref="mapVisualFileInputRef"
        type="file"
        class="hidden"
        accept="image/*"
        @change="onMapVisualFilePicked"
      />

      <section v-show="mapDrawerFocus === 'places'" class="map-glass-panel rounded-[1.75rem] p-4">
        <div class="map-places-drawer-heading">
          <div>
            <span>{{ t('当前位置', 'Current location') }}</span>
            <strong>{{ currentLocationText }}</strong>
          </div>
          <button type="button" data-testid="map-add-place-drawer" @click="openPlaceCreator">
            <i class="fas fa-plus" aria-hidden="true"></i>
            {{ t('添加地点', 'Add place') }}
          </button>
        </div>
        <div class="map-place-list">
          <button
            v-for="item in activeMapPlaces"
            :key="item.placeId"
            type="button"
            class="map-place-list-row"
            @click="onMapPinSelected(item)"
          >
            <span class="map-place-list-icon">
              <i :class="item.icon || placeCategoryIcon(item.category)" aria-hidden="true"></i>
            </span>
            <span class="min-w-0 text-left">
              <strong>{{ mapPlaceName(item) }}</strong>
              <small>{{ mapPlaceDetail(item) }}</small>
            </span>
            <span class="map-place-list-source">{{ item.source === 'user' ? t('我的', 'Mine') : t('世界', 'World') }}</span>
            <i class="fas fa-chevron-right map-place-list-chevron" aria-hidden="true"></i>
          </button>
          <div v-if="activeMapPlaces.length === 0" class="map-place-list-empty">
            <i class="fas fa-map-pin" aria-hidden="true"></i>
            <span>{{ t('还没有地点', 'No places yet') }}</span>
          </div>
        </div>
      </section>

      <MapAreaFeedbackPanel
        v-show="mapDrawerFocus === 'progress'"
        :map-area-feedback="mapAreaFeedback"
        :visible-map-area-feedback="visibleMapAreaFeedback"
        :map-area-feedback-knowledge-points="mapAreaFeedbackKnowledgePoints"
        :format-time="formatTime"
        :get-related-knowledge-points="getRelatedKnowledgePoints"
        @open-worldbook="openWorldBook"
        @delete-trip="deleteTripHistoryItem"
      />

      <MapTripControlPanel
        v-show="mapDrawerFocus === 'trip'"
        :trip-form="tripForm"
        :trip-estimate="tripEstimate"
        :trip-runtime="tripRuntime"
        :trip-status-label="tripStatusLabel"
        :trip-progress-percent="tripProgressPercent"
        :trip-arrival-push-status-label="tripArrivalPushStatusLabel"
        :trip-arrival-push-hint="tripArrivalPushHint"
        :trip-action-hint="tripActionHint"
        :is-trip-traveling="isTripTraveling"
        :is-trip-arrived="isTripArrived"
        :can-start-trip="canStartTrip"
        :format-seconds="formatSeconds"
        :format-time="formatTime"
        @update-trip-from="updateTripFrom"
        @update-trip-to="updateTripTo"
        @start-trip="startTrip"
        @cancel-trip="cancelTrip"
        @acknowledge-arrival="acknowledgeArrival"
      />

      <section v-show="mapDrawerFocus === 'trip'" class="map-glass-panel rounded-[1.75rem] p-4">
        <label class="block">
          <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {{ t('同行路线', 'Shared route') }}
          </span>
          <select
            v-model="sharedRouteContactId"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none"
            data-testid="map-relationship-contact"
          >
            <option value="">{{ t('可选同行人', 'Optional companion') }}</option>
            <option
              v-for="contact in relationshipContactOptions"
              :key="contact.id"
              :value="contact.optionValue"
            >
              {{ contact.optionLabel }}
            </option>
          </select>
        </label>
      </section>

      <MapRouteFamiliarityPanel
        v-show="mapDrawerFocus === 'progress'"
        :route-familiarity="routeFamiliarity"
        :visible-route-familiarity="visibleRouteFamiliarity"
        :route-familiarity-knowledge-points="routeFamiliarityKnowledgePoints"
        :get-route-familiarity-next-hint="getRouteFamiliarityNextHint"
        :get-related-knowledge-points="getRelatedKnowledgePoints"
        @open-worldbook="openWorldBook"
      />

      <section v-show="mapDrawerFocus === 'progress'" class="map-glass-panel rounded-[1.75rem] p-4">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h2 class="font-semibold">{{ t('区域解锁', 'Area unlocks') }}</h2>
          <AssetStatusBadge
            :label="t(`${unlockedMapAreaCount}/${mapAreaUnlocks.length} 已解锁`, `${unlockedMapAreaCount}/${mapAreaUnlocks.length} unlocked`)"
            icon="fas fa-unlock"
            tone="emerald"
            :truncate="false"
          />
        </div>
        <div class="space-y-2">
          <div
            v-for="area in visibleMapAreaUnlocks"
            :key="area.id"
            class="rounded-lg border border-white/30 bg-white/45 p-2"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-medium">
                  <i :class="[area.icon, 'mr-1 text-[11px] text-gray-500']"></i>
                  {{ t(area.areaLabelZh, area.areaLabelEn) }}
                </p>
                <p class="text-[11px] text-gray-500">
                  {{ t(area.descriptionZh, area.descriptionEn) }}
                </p>
              </div>
              <AssetStatusBadge
                :label="area.unlocked ? t('已解锁', 'Unlocked') : t(`${area.progressPercent}%`, `${area.progressPercent}%`)"
                :icon="area.unlocked ? 'fas fa-check' : 'fas fa-lock'"
                :tone="area.unlocked ? area.tone : 'neutral'"
                :truncate="false"
              />
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
              <div
                class="h-full rounded-full bg-emerald-500 transition-all duration-500"
                :style="{ width: `${area.progressPercent}%` }"
              ></div>
            </div>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ getMapAreaUnlockHint(area) }}
            </p>
          </div>
        </div>
      </section>

      <MapTripHistoryPanel
        v-show="mapDrawerFocus === 'progress'"
        :trip-history="tripHistory"
        :visible-trip-history="visibleTripHistory"
        :trip-history-knowledge-points="tripHistoryKnowledgePoints"
        :map-reward-score="mapRewardScore"
        :format-seconds="formatSeconds"
        :format-time="formatTime"
        :get-related-knowledge-points="getRelatedKnowledgePoints"
        @open-worldbook="openWorldBook"
      />

        </div>
      </aside>
    </div>

    <div v-if="placeCreatorOpen" class="map-place-modal-backdrop" @click.self="closePlaceCreator">
      <section class="map-place-modal" role="dialog" aria-modal="true" :aria-label="t('添加地点', 'Add place')" data-testid="map-place-creator">
        <div class="map-place-modal-header">
          <div>
            <span>{{ t(activeMapPack.shortLabelZh, activeMapPack.shortLabelEn) }}</span>
            <h2>{{ t('添加地点', 'Add place') }}</h2>
          </div>
          <button type="button" :aria-label="t('关闭', 'Close')" @click="closePlaceCreator">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div class="map-place-category-grid" role="group" :aria-label="t('地点类型', 'Place type')">
          <button
            v-for="category in MAP_PLACE_CATEGORIES"
            :key="category.id"
            type="button"
            :class="{ 'is-active': addressForm.category === category.id }"
            :aria-pressed="addressForm.category === category.id"
            @click="addressForm.category = category.id"
          >
            <i :class="category.icon" aria-hidden="true"></i>
            <span>{{ t(category.labelZh, category.labelEn) }}</span>
          </button>
        </div>

        <label class="map-place-field">
          <span>{{ t('地点名称', 'Place name') }}</span>
          <input v-model="addressForm.label" data-testid="map-place-name" :placeholder="t('例如：家、公司、练习室', 'Home, office, studio...')" />
        </label>
        <label class="map-place-field">
          <span>{{ t('地址或说明', 'Address or description') }}</span>
          <input v-model="addressForm.detail" data-testid="map-place-detail" :placeholder="t('输入真实地址或自定义描述', 'Enter an address or custom description')" />
        </label>

        <div class="map-place-position-row" :class="{ 'has-position': addressForm.position }">
          <span class="map-place-position-icon"><i class="fas fa-map-pin" aria-hidden="true"></i></span>
          <span class="min-w-0">
            <strong>{{ addressForm.position ? t('位置已确定', 'Position selected') : t('尚未设置位置', 'Position not set') }}</strong>
            <small>{{ addressForm.position ? formatMapPosition(addressForm.position) : t('在地图上选择，或使用当前位置', 'Choose on the map or use current location') }}</small>
          </span>
          <i v-if="addressForm.position" class="fas fa-check" aria-hidden="true"></i>
        </div>
        <p v-if="addressForm.position" class="sr-only" data-testid="map-pending-pin-status">{{ t('已在地图上选定图钉位置', 'Pin position selected on the map') }}</p>

        <div class="map-place-position-actions">
          <button type="button" data-testid="map-choose-pin" @click="startPlacePinMode">
            <i class="fas fa-crosshairs" aria-hidden="true"></i>
            {{ addressForm.position ? t('重新选点', 'Choose again') : t('在地图选点', 'Choose on map') }}
          </button>
          <button type="button" :disabled="!currentLocation.position || currentLocation.mapPackId !== activeMapPackId" @click="useCurrentPositionForDraft">
            <i class="fas fa-location-arrow" aria-hidden="true"></i>
            {{ t('使用当前位置', 'Use current') }}
          </button>
        </div>

        <button type="button" class="map-place-save-button" :disabled="!canSavePlace" data-testid="map-save-address" @click="addAddress">
          {{ t('保存地点', 'Save place') }}
        </button>
      </section>
    </div>

    <div v-if="selectedMapPlace" class="map-place-modal-backdrop" @click.self="closePlaceDetail">
      <section class="map-place-detail-sheet" role="dialog" aria-modal="true" :aria-label="mapPlaceName(selectedMapPlace)" data-testid="map-place-detail-sheet">
        <div class="map-place-detail-head">
          <span class="map-place-detail-icon"><i :class="selectedMapPlace.icon || placeCategoryIcon(selectedMapPlace.category)" aria-hidden="true"></i></span>
          <div class="min-w-0">
            <small>{{ selectedMapPlace.source === 'user' ? t('我的地点', 'My place') : t('世界地点', 'World place') }}</small>
            <h2>{{ mapPlaceName(selectedMapPlace) }}</h2>
            <p>{{ mapPlaceDetail(selectedMapPlace) }}</p>
          </div>
          <button type="button" :aria-label="t('关闭', 'Close')" @click="closePlaceDetail"><i class="fas fa-xmark" aria-hidden="true"></i></button>
        </div>
        <div class="map-place-detail-actions">
          <button type="button" class="is-primary" data-testid="map-place-use-destination" @click="useSelectedPlaceAsDestination">
            <i class="fas fa-location-arrow" aria-hidden="true"></i>
            {{ t('设为目的地', 'Set destination') }}
          </button>
          <button type="button" @click="useSelectedPlaceAsStart">
            <i class="fas fa-route" aria-hidden="true"></i>
            {{ t('设为起点', 'Set start') }}
          </button>
          <button type="button" @click="useSelectedPlaceAsCurrent">
            <i class="fas fa-crosshairs" aria-hidden="true"></i>
            {{ t('设为当前位置', 'Set current') }}
          </button>
        </div>
        <button v-if="selectedMapPlace.source === 'user'" type="button" class="map-place-manage-button" data-testid="map-place-manage-pin" @click="openSelectedPlaceManager">
          <i class="fas fa-pen-to-square" aria-hidden="true"></i>
          {{ t('编辑地点与图钉', 'Edit place and pin') }}
        </button>
        <button v-if="selectedMapPlace.source === 'user'" type="button" class="map-place-delete-button" @click="removeSelectedPlace">
          <i class="fas fa-trash-can" aria-hidden="true"></i>
          {{ t('删除地点', 'Delete place') }}
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.map-immersive-root {
  background:
    radial-gradient(circle at 18% 8%, rgba(56, 189, 248, 0.28), transparent 30%),
    radial-gradient(circle at 84% 18%, rgba(45, 212, 191, 0.22), transparent 28%),
    linear-gradient(160deg, #07111f 0%, #0d1b2f 48%, #101827 100%);
}

.map-topbar {
  background: linear-gradient(180deg, rgba(7, 17, 31, 0.92), rgba(7, 17, 31, 0.42));
  backdrop-filter: blur(18px);
}

.map-canvas-shell {
  min-height: 0;
  padding: 0 14px 14px;
}

.map-canvas {
  position: relative;
  height: 100%;
  min-height: 620px;
  overflow: hidden;
  border-radius: 2rem 2rem 1.6rem 1.6rem;
  background:
    radial-gradient(circle at 20% 24%, rgba(59, 130, 246, 0.18), transparent 18%),
    radial-gradient(circle at 76% 18%, rgba(16, 185, 129, 0.14), transparent 18%),
    linear-gradient(135deg, #d8eadc 0%, #e8f3e8 38%, #dbeaf6 39%, #eef5f8 100%);
  box-shadow: 0 28px 70px rgba(2, 6, 23, 0.34);
  color: #0f172a;
}

.map-grid-layer {
  position: absolute;
  inset: -18%;
  opacity: 0.46;
  background-image:
    linear-gradient(rgba(15, 23, 42, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.08) 1px, transparent 1px);
  background-size: 58px 58px;
  transform: rotate(-10deg);
}

.map-road {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow:
    inset 0 0 0 1px rgba(148, 163, 184, 0.34),
    0 6px 18px rgba(15, 23, 42, 0.08);
}

.map-road-main {
  top: 33%;
  left: -14%;
  width: 132%;
  height: 30px;
  transform: rotate(-18deg);
}

.map-road-cross {
  top: 10%;
  left: 51%;
  width: 28px;
  height: 86%;
  transform: rotate(19deg);
}

.map-road-ring {
  right: -20%;
  bottom: 12%;
  width: 82%;
  height: 28px;
  transform: rotate(31deg);
}

.map-waterway {
  position: absolute;
  right: -14%;
  top: 8%;
  width: 34%;
  height: 94%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.42), rgba(56, 189, 248, 0.2));
  transform: rotate(13deg);
  filter: blur(1px);
}

.map-search-card {
  position: absolute;
  top: 18px;
  left: 16px;
  right: 16px;
  z-index: 4;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 1.35rem;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(16px);
}

.map-search-row {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
}

.map-search-divider {
  height: 1px;
  margin-left: 44px;
  background: rgba(148, 163, 184, 0.24);
}

.map-pack-switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  min-height: 42px;
  padding: 5px 8px;
  background: rgba(241, 245, 249, 0.72);
}

.map-pack-option {
  display: inline-flex;
  min-width: 0;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 10px;
  color: #64748b;
  font-size: 11px;
  font-weight: 750;
}

.map-pack-option-active {
  background: #0f172a;
  color: #fff;
  box-shadow: 0 7px 16px rgba(15, 23, 42, 0.18);
}

.map-pack-option:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.map-place-results {
  max-height: 214px;
  overflow-y: auto;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  padding: 6px;
  background: rgba(248, 250, 252, 0.98);
}

.map-place-result {
  display: grid;
  width: 100%;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  padding: 6px 8px;
}

.map-place-result:hover,
.map-place-result:focus-visible {
  background: #e2e8f0;
}

.map-place-result-icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 9px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 11px;
}

.map-destination-input {
  width: 100%;
  border: 0;
  background: transparent;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 650;
  outline: none;
}

.map-destination-input::placeholder {
  color: rgba(71, 85, 105, 0.62);
}

.map-layer-button,
.map-current-location-button {
  position: absolute;
  right: 18px;
  z-index: 4;
  display: grid;
  height: 44px;
  width: 44px;
  place-items: center;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.14);
}

.map-layer-button {
  top: 192px;
}

.map-current-location-button {
  top: 246px;
}

.map-route-card {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 92px;
  z-index: 5;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 1.7rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 14px 16px;
  box-shadow: 0 24px 54px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(18px);
}

.map-route-pill {
  border-radius: 999px;
  background: #eff6ff;
  padding: 6px 10px;
  color: #1e3a8a;
}

.map-primary-action,
.map-secondary-action {
  min-height: 40px;
  border-radius: 999px;
  padding: 0 16px;
  font-size: 0.85rem;
  font-weight: 750;
}

.map-primary-action {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.28);
}

.map-primary-action-disabled {
  background: #cbd5e1;
  box-shadow: none;
  color: #64748b;
  cursor: not-allowed;
}

.map-secondary-action {
  background: #f1f5f9;
  color: #0f172a;
}

.map-bottom-nav {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 18px;
  z-index: 6;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  border: 1px solid rgba(226, 232, 240, 0.88);
  border-radius: 1.35rem;
  background: rgba(255, 255, 255, 0.92);
  padding: 8px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(18px);
}

.map-bottom-nav-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border-radius: 1rem;
  padding: 8px 4px;
  color: #475569;
  font-size: 0.66rem;
  font-weight: 700;
}

.map-bottom-nav-item i {
  color: #2563eb;
  font-size: 0.95rem;
}

.map-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(2, 6, 23, 0.34);
  padding: 12px;
}

.map-bottom-drawer {
  display: flex;
  max-height: min(82vh, 760px);
  width: min(100%, 720px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 2rem 2rem 1.4rem 1.4rem;
  background: rgba(248, 250, 252, 0.96);
  padding: 10px 12px 12px;
  box-shadow: 0 -28px 80px rgba(2, 6, 23, 0.28);
  color: #0f172a;
  backdrop-filter: blur(22px);
}

.map-drawer-handle {
  margin: 2px auto 12px;
  height: 5px;
  width: 44px;
  border-radius: 999px;
  background: #cbd5e1;
}

.map-drawer-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.map-drawer-tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  background: #e2e8f0;
  padding: 8px 12px;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 750;
}

.map-drawer-tab-active {
  background: #0f172a;
  color: #fff;
}

.map-drawer-content {
  overflow-y: auto;
}

.map-glass-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.06));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(24px);
}

.map-glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.12), transparent 42%);
}

.map-glass-panel input,
.map-glass-panel select {
  border-color: rgba(255, 255, 255, 0.14) !important;
  background: rgba(255, 255, 255, 0.1) !important;
  color: rgba(255, 255, 255, 0.9) !important;
}

.map-glass-panel option {
  color: #0f172a;
}

.map-glass-panel .bg-white,
.map-glass-panel .bg-gray-50 {
  border-color: rgba(255, 255, 255, 0.12) !important;
  background: rgba(255, 255, 255, 0.08) !important;
}

.map-glass-panel .text-gray-500,
.map-glass-panel .text-gray-600,
.map-glass-panel .text-gray-700,
.map-glass-panel .text-gray-800 {
  color: rgba(255, 255, 255, 0.68) !important;
}

.map-glass-panel .border,
.map-glass-panel .border-gray-200,
.map-glass-panel .border-gray-300 {
  border-color: rgba(255, 255, 255, 0.14) !important;
}

/* City-map information architecture */
.map-immersive-root {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: #eef1ed;
  color: #17211d;
}

.map-topbar {
  z-index: 20;
  display: grid;
  min-height: 102px;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(205, 214, 208, 0.92);
  background: rgba(249, 250, 248, 0.97);
  padding: 42px 14px 13px;
  color: #17211d;
  backdrop-filter: blur(14px);
}

.map-topbar-button {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid #d9dfdb;
  border-radius: 8px;
  background: #fff;
  color: #26352e;
}

.map-topbar-title {
  min-width: 0;
  text-align: center;
}

.map-topbar-title h1 {
  overflow: hidden;
  font-size: 15px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-topbar-title p {
  overflow: hidden;
  margin-top: 2px;
  color: #718078;
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-canvas-shell {
  min-height: 0;
  flex: 1;
  padding: 0;
}

.map-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: 0;
  background: #dce4de;
  box-shadow: none;
  color: #17211d;
}

.map-search-card {
  position: absolute;
  top: 14px;
  right: 14px;
  left: 14px;
  z-index: 12;
  overflow: hidden;
  border: 1px solid rgba(210, 219, 213, 0.95);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 10px 28px rgba(31, 48, 39, 0.14);
  backdrop-filter: blur(12px);
}

.map-search-row {
  display: grid;
  min-height: 48px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
}

.map-search-row > i {
  color: #236d58;
  font-size: 13px;
}

.map-search-row > button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 7px;
  color: #718078;
}

.map-destination-input {
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
  color: #17211d;
  font-size: 13px;
  font-weight: 750;
  outline: none;
}

.map-place-results {
  max-height: 230px;
  overflow-y: auto;
  border-top: 1px solid #e1e6e2;
  background: #fff;
  padding: 5px;
}

.map-place-result {
  display: grid;
  width: 100%;
  min-height: 52px;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  border-radius: 7px;
  padding: 6px 8px;
}

.map-place-result:hover,
.map-place-result:focus-visible {
  background: #edf3ef;
}

.map-place-result-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 7px;
  background: #dfece5;
  color: #17664f;
  font-size: 11px;
}

.map-context-strip {
  position: absolute;
  top: 70px;
  left: 14px;
  z-index: 8;
  display: inline-flex;
  max-width: calc(100% - 28px);
  min-height: 28px;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(211, 221, 214, 0.92);
  border-radius: 7px;
  background: rgba(247, 249, 247, 0.94);
  padding: 3px 5px 3px 8px;
  color: #354a40;
  box-shadow: 0 6px 18px rgba(31, 48, 39, 0.1);
  backdrop-filter: blur(10px);
}

.map-context-strip > span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  font-size: 10px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-context-strip > button {
  flex: 0 0 auto;
  border-radius: 5px;
  background: #dfe9e3;
  padding: 4px 7px;
  color: #17664f;
  font-size: 9px;
  font-weight: 800;
}

.map-location-chip {
  position: absolute;
  top: 108px;
  left: 14px;
  z-index: 8;
  display: grid;
  width: min(70%, 310px);
  min-height: 44px;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(211, 221, 214, 0.9);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  padding: 6px 9px;
  box-shadow: 0 8px 22px rgba(31, 48, 39, 0.12);
}

.map-location-chip > i {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 7px;
  background: #17664f;
  color: #fff;
  font-size: 11px;
}

.map-location-chip > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.map-location-chip small {
  color: #718078;
  font-size: 8px;
  font-weight: 800;
}

.map-location-chip strong {
  overflow: hidden;
  margin-top: 1px;
  font-size: 10px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-current-location-button,
.map-add-place-button {
  position: absolute;
  right: 14px;
  z-index: 9;
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(210, 219, 213, 0.95);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  color: #25372e;
  box-shadow: 0 9px 24px rgba(31, 48, 39, 0.14);
}

.map-current-location-button {
  top: 108px;
  width: 44px;
}

.map-add-place-button {
  top: 160px;
  gap: 7px;
  padding: 0 12px;
  background: #17664f;
  color: #fff;
  font-size: 11px;
  font-weight: 850;
}

.map-placement-banner {
  position: absolute;
  top: 160px;
  right: 14px;
  left: 14px;
  z-index: 15;
  display: grid;
  min-height: 46px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 1px solid #d7bf73;
  border-radius: 8px;
  background: #fff8dd;
  padding: 7px 9px;
  color: #5f4b11;
  box-shadow: 0 10px 26px rgba(82, 62, 9, 0.16);
  font-size: 11px;
  font-weight: 800;
}

.map-placement-banner > button {
  min-height: 30px;
  border-radius: 6px;
  background: #efe0a8;
  padding: 0 8px;
  font-size: 10px;
}

.map-route-card {
  position: absolute;
  right: 14px;
  bottom: 80px;
  left: 14px;
  z-index: 10;
  border: 1px solid rgba(210, 219, 213, 0.95);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.97);
  padding: 11px 12px;
  color: #17211d;
  box-shadow: 0 14px 38px rgba(31, 48, 39, 0.17);
  backdrop-filter: blur(14px);
}

.map-world-app-line {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
  border-radius: 5px;
  background: #e3eee8;
  padding: 4px 7px;
  color: #17664f;
  font-size: 9px;
  font-weight: 850;
}

.map-world-app-line span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-route-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 54px;
  align-items: center;
  gap: 10px;
}

.map-route-summary p {
  color: #718078;
  font-size: 8px;
  font-weight: 850;
  text-transform: uppercase;
}

.map-route-summary h2 {
  overflow: hidden;
  margin-top: 2px;
  font-size: 14px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-route-summary > div > span {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: #647168;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-route-metrics {
  display: flex;
  min-height: 46px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-left: 1px solid #e2e7e3;
  color: #17664f;
}

.map-route-metrics strong { font-size: 18px; line-height: 1; }
.map-route-metrics small { margin-top: 3px; font-size: 8px; font-weight: 800; }

.map-route-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 10px;
}

.map-primary-action,
.map-secondary-action {
  min-height: 38px;
  border-radius: 7px;
  padding: 0 13px;
  font-size: 11px;
  font-weight: 850;
}

.map-primary-action {
  background: #17664f;
  color: #fff;
  box-shadow: none;
}

.map-primary-action-disabled {
  background: #d5ddd8;
  color: #79847e;
}

.map-secondary-action {
  border: 1px solid #dce2de;
  background: #f5f7f5;
  color: #26372f;
}

.map-bottom-nav {
  position: absolute;
  right: 14px;
  bottom: 12px;
  left: 14px;
  z-index: 11;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  border: 1px solid rgba(210, 219, 213, 0.96);
  border-radius: 8px;
  background: rgba(250, 251, 249, 0.97);
  padding: 5px;
  box-shadow: 0 10px 30px rgba(31, 48, 39, 0.15);
  backdrop-filter: blur(14px);
}

.map-bottom-nav-item {
  display: flex;
  min-width: 0;
  min-height: 48px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 6px;
  padding: 0 5px;
  color: #526158;
  font-size: 10px;
  font-weight: 800;
}

.map-bottom-nav-item i { color: #17664f; font-size: 12px; }

.map-drawer-backdrop,
.map-place-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(21, 33, 27, 0.42);
  padding: 0;
}

.map-bottom-drawer,
.map-place-modal,
.map-place-detail-sheet {
  display: flex;
  width: min(100%, 720px);
  max-height: 86vh;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dce2de;
  border-radius: 8px 8px 0 0;
  background: #f8faf8;
  padding: 10px 12px calc(14px + env(safe-area-inset-bottom));
  color: #17211d;
  box-shadow: 0 -20px 64px rgba(24, 38, 30, 0.24);
  backdrop-filter: none;
}

.map-drawer-handle {
  margin: 0 auto 10px;
  height: 4px;
  width: 38px;
  border-radius: 999px;
  background: #c9d1cc;
}

.map-drawer-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  overflow: visible;
  padding-bottom: 9px;
}

.map-drawer-tab {
  display: inline-flex;
  min-width: 0;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 7px;
  background: #e8ece9;
  padding: 0 7px;
  color: #526158;
  font-size: 10px;
  font-weight: 800;
}

.map-drawer-tab-active {
  background: #17664f;
  color: #fff;
}

.map-drawer-content { overflow-y: auto; padding: 8px 4px 4px; }
.map-glass-panel {
  overflow: visible;
  border: 1px solid #dfe5e1;
  border-radius: 8px !important;
  background: #fff;
  box-shadow: none;
  backdrop-filter: none;
}
.map-glass-panel::before { display: none; }
.map-glass-panel input,
.map-glass-panel select { border-color: #d9e0db !important; background: #fff !important; color: #17211d !important; }
.map-glass-panel .bg-white,
.map-glass-panel .bg-gray-50 { border-color: #dfe5e1 !important; background: #f7f9f7 !important; }
.map-glass-panel .text-gray-500,
.map-glass-panel .text-gray-600,
.map-glass-panel .text-gray-700,
.map-glass-panel .text-gray-800 { color: #647168 !important; }
.map-glass-panel .border,
.map-glass-panel .border-gray-200,
.map-glass-panel .border-gray-300 { border-color: #dfe5e1 !important; }

.map-places-drawer-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e7e3;
}
.map-places-drawer-heading > div { min-width: 0; }
.map-places-drawer-heading span { display: block; color: #718078; font-size: 9px; font-weight: 800; }
.map-places-drawer-heading strong { display: block; overflow: hidden; margin-top: 3px; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.map-places-drawer-heading button { display: inline-flex; min-height: 38px; flex: 0 0 auto; align-items: center; gap: 6px; border-radius: 7px; background: #17664f; padding: 0 10px; color: #fff; font-size: 10px; font-weight: 800; }
.map-place-list { margin-top: 4px; }
.map-place-list-row { display: grid; width: 100%; min-height: 58px; grid-template-columns: 36px minmax(0, 1fr) auto 12px; align-items: center; gap: 9px; border-bottom: 1px solid #e5e9e6; }
.map-place-list-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 7px; background: #e3ece6; color: #17664f; font-size: 11px; }
.map-place-list-row strong,
.map-place-list-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.map-place-list-row strong { font-size: 11px; }
.map-place-list-row small { margin-top: 3px; color: #758179; font-size: 9px; }
.map-place-list-source { border-radius: 5px; background: #edf1ee; padding: 3px 5px; color: #6d7972; font-size: 8px; font-weight: 800; }
.map-place-list-chevron { color: #9aa49e; font-size: 8px; }
.map-place-list-empty { display: flex; min-height: 100px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #839088; font-size: 11px; }

.map-place-modal,
.map-place-detail-sheet {
  overflow-y: auto;
  padding: 18px 18px calc(22px + env(safe-area-inset-bottom));
}

.map-place-modal-header,
.map-place-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.map-place-modal-header span { color: #718078; font-size: 9px; font-weight: 800; text-transform: uppercase; }
.map-place-modal-header h2,
.map-place-detail-head h2 { margin-top: 3px; font-size: 18px; font-weight: 850; }
.map-place-modal-header > button,
.map-place-detail-head > button { display: grid; width: 38px; height: 38px; flex: 0 0 auto; place-items: center; border: 1px solid #dce2de; border-radius: 7px; background: #fff; color: #526158; }
.map-place-category-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 16px; }
.map-place-category-grid button { display: flex; min-height: 52px; min-width: 0; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border: 1px solid #dde4df; border-radius: 7px; background: #fff; color: #66736b; font-size: 9px; font-weight: 800; }
.map-place-category-grid button.is-active { border-color: #17664f; background: #e3efe8; color: #17664f; box-shadow: inset 0 0 0 1px #17664f; }
.map-place-field { display: block; margin-top: 13px; }
.map-place-field > span { display: block; margin-bottom: 6px; color: #6c7871; font-size: 9px; font-weight: 800; }
.map-place-field input { width: 100%; min-height: 44px; border: 1px solid #d5ddd8; border-radius: 7px; background: #fff; padding: 0 11px; color: #17211d; font-size: 12px; outline: none; }
.map-place-field input:focus { border-color: #17664f; box-shadow: 0 0 0 3px rgba(23, 102, 79, 0.12); }
.map-place-position-row { display: grid; min-height: 60px; grid-template-columns: 38px minmax(0, 1fr) 20px; align-items: center; gap: 9px; margin-top: 14px; border: 1px solid #dce2de; border-radius: 7px; background: #f2f5f2; padding: 8px; }
.map-place-position-row.has-position { border-color: #a9cbbb; background: #eaf3ed; }
.map-place-position-icon { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 7px; background: #dfe8e2; color: #607068; }
.map-place-position-row.has-position .map-place-position-icon { background: #17664f; color: #fff; }
.map-place-position-row strong,
.map-place-position-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.map-place-position-row strong { font-size: 11px; }
.map-place-position-row small { margin-top: 3px; color: #748078; font-size: 9px; }
.map-place-position-row > i { color: #17664f; }
.map-place-position-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 8px; }
.map-place-position-actions button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; gap: 6px; border: 1px solid #d8dfda; border-radius: 7px; background: #fff; color: #345044; font-size: 10px; font-weight: 800; }
.map-place-position-actions button:disabled { opacity: 0.45; }
.map-place-save-button { width: 100%; min-height: 46px; margin-top: 15px; border-radius: 7px; background: #17664f; color: #fff; font-size: 12px; font-weight: 850; }
.map-place-save-button:disabled { background: #d1d9d4; color: #7d8982; }

.map-place-detail-head { display: grid; grid-template-columns: 48px minmax(0, 1fr) 38px; }
.map-place-detail-icon { display: grid; width: 46px; height: 46px; place-items: center; border-radius: 8px; background: #17664f; color: #fff; }
.map-place-detail-head small { color: #718078; font-size: 9px; font-weight: 800; }
.map-place-detail-head p { margin-top: 5px; color: #627067; font-size: 11px; line-height: 1.5; }
.map-place-detail-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 18px; }
.map-place-detail-actions button { display: flex; min-height: 58px; min-width: 0; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1px solid #dae1dc; border-radius: 7px; background: #fff; color: #3a4d43; padding: 5px; font-size: 9px; font-weight: 800; }
.map-place-detail-actions button.is-primary { border-color: #17664f; background: #17664f; color: #fff; }
.map-place-manage-button,
.map-place-delete-button { display: inline-flex; min-height: 40px; align-items: center; gap: 7px; margin-top: 12px; color: #a54238; font-size: 10px; font-weight: 800; }
.map-place-manage-button { margin-right: 18px; color: #17664f; }

button:focus-visible,
input:focus-visible {
  outline: 2px solid #0f8061;
  outline-offset: 2px;
}

@media (min-width: 720px) {
  .map-canvas-shell { padding: 12px; }
  .map-canvas { border: 1px solid #d3dcd6; border-radius: 8px; }
  .map-bottom-drawer,
  .map-place-modal,
  .map-place-detail-sheet { margin-bottom: 18px; border-radius: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
</style>
