<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useMapStore } from '../stores/map'
import { useMusicStore } from '../stores/music'
import { useGalleryStore } from '../stores/gallery'
import { useSimulationStore } from '../stores/simulation'
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
import { calculateMapDistanceKm, formatMapPosition } from '../lib/map-packs'
import {
  getMapPlaceCategoryGroupVisual,
  matchesMapPlaceCategoryFilter,
  resolveMapPlaceVisual,
} from '../lib/map-place-categories'
import { resolveMapPlacePresentation } from '../lib/map-place-localization'
import { searchMapPlaces, suggestMapPlaces } from '../lib/map-place-search'
import { MAP_PLACE_KNOWLEDGE_MODE } from '../lib/map-place-discovery'
import { resolveMapPlaceMedia } from '../lib/map-place-media'
import { resolveMapPlaceCopy } from '../lib/map-place-copy'
import { createMapLocationShareObject } from '../lib/shareable-object'
import {
  INTERNAL_CHAT_SHARE_ROUTE_QUERY,
  INTERNAL_CHAT_SHARE_ROUTE_VALUE,
  savePendingInternalChatShare,
} from '../lib/internal-chat-share'
import {
  MAP_JOURNEY_CHECKPOINT_DEFINITIONS,
  MAP_JOURNEY_PHASE,
  getMapTransportMode,
  isMapTransportMode,
} from '../lib/map-journey'
import { MAP_JOURNEY_EVENT_PROPOSAL_STATUS } from '../lib/simulation/adapters/map-journey-events'
import { buildMusicIntegrationRoute } from '../lib/music-module-interface'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import MapAreaFeedbackPanel from '../components/map/MapAreaFeedbackPanel.vue'
import MapRouteFamiliarityPanel from '../components/map/MapRouteFamiliarityPanel.vue'
import MapSceneCanvas from '../components/map/MapSceneCanvas.vue'
import MapTripControlPanel from '../components/map/MapTripControlPanel.vue'
import MapTripHistoryPanel from '../components/map/MapTripHistoryPanel.vue'
import MapVisualSettingsPanel from '../components/map/MapVisualSettingsPanel.vue'
import MapJourneyMediaPanel from '../components/map/MapJourneyMediaPanel.vue'
import MapPlaceFocusSheet from '../components/map/MapPlaceFocusSheet.vue'
import MapEventSurfaceSheet from '../components/map/MapEventSurfaceSheet.vue'
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
const musicStore = useMusicStore()
const galleryStore = useGalleryStore()
const simulationStore = useSimulationStore()
const systemStore = useSystemStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const { t, systemLanguage } = useI18n()
const { confirmDialog } = useDialog()

const {
  activeMapPackId,
  activeMapPack,
  activeMapPlaces,
  currentLocation,
  currentLocationText,
  placeSession,
  mapEventSurfaces,
  mapEventSurfacePins,
  tripForm,
  tripEstimate,
  tripRuntime,
  tripHistory,
  routeFamiliarity,
  mapAreaUnlocks,
  mapAreaFeedback,
  activeMapPlaceKnowledgeMode,
  activeMapPlaceDiscoverySummary,
  mapPlaceDisplayMode,
  mapVisualSettings,
  mapAutomationRuntime,
  mapAiVisualAutomationPolicy,
} =
  storeToRefs(mapStore)

const mapSearchSuggestionsOpen = ref(false)
const rolePositionMode = ref(false)
const rolePositionNotice = ref('')
const selectedMapPlace = ref(null)
const selectedPlaceAnchor = ref(null)
const selectedPlaceCategory = ref('all')
const selectedSearchCategory = ref('all')
const defaultMapDestination = mapStore.addresses?.[1]?.detail || ''
const restoredMapDestination =
  typeof tripForm.value?.to === 'string' && tripForm.value.to !== defaultMapDestination
    ? tripForm.value.to
    : ''
const mapSearchText = ref(restoredMapDestination)
const destinationIntentActive = ref(false)
const mapFocusRequestId = ref(0)
const mapFocusTarget = ref(null)
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
const journeyMediaOpen = ref(false)
const sharedRouteContactId = ref('')
const journeyEventApplying = ref(false)
const selectedEventSurfaceId = ref('')
const selectedEventStackIds = ref([])
const eventReturnPlaceId = ref('')
const placeEventApplying = ref(false)
let runtimeTimer = null

const MAP_PACK_PREVIEW_SCOPE_ID = 'map-runtime-pack'

const MAP_DRAWER_SECTIONS = Object.freeze([
  { key: 'trip', icon: 'fas fa-route', labelZh: '行程计划', labelEn: 'Journey', shortLabelZh: '行程', shortLabelEn: 'Journey' },
  { key: 'places', icon: 'fas fa-map-location-dot', labelZh: '地点', labelEn: 'Places', shortLabelZh: '地点', shortLabelEn: 'Places' },
  { key: 'progress', icon: 'fas fa-shoe-prints', labelZh: '足迹', labelEn: 'Footprints', shortLabelZh: '足迹', shortLabelEn: 'Footprints' },
  { key: 'visual', icon: 'fas fa-map', labelZh: '图层', labelEn: 'Layers' },
])

const MAP_PRIMARY_SECTIONS = MAP_DRAWER_SECTIONS.filter((section) => section.key !== 'visual')
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
const mapFocusPosition = computed(() => {
  const position =
    mapFocusTarget.value ||
    (currentLocation.value?.mapPackId === activeMapPackId.value
      ? currentLocation.value.position
      : null)
  return position ? { ...position, focusRequestId: mapFocusRequestId.value } : null
})
const mapDrawerTitle = computed(() => {
  const section = MAP_DRAWER_SECTIONS.find((item) => item.key === mapDrawerFocus.value)
  return section ? t(section.labelZh, section.labelEn) : t('地图', 'Map')
})
const isJourneyPlanningLocked = computed(() =>
  ['traveling', 'arrived'].includes(tripRuntime.value.status),
)

const normalizePlaceRelationText = (value) =>
  typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''

const selectedPlaceDistanceKm = computed(() => {
  const place = selectedMapPlace.value
  const current = currentLocation.value
  if (
    !place?.position ||
    !current?.position ||
    place.mapPackId !== activeMapPackId.value ||
    current.mapPackId !== activeMapPackId.value
  ) return null
  return calculateMapDistanceKm(activeMapPack.value, current.position, place.position)
})

const isSelectedPlaceStableCurrentLocation = computed(() => {
  const placeId = selectedMapPlace.value?.placeId || selectedMapPlace.value?.id
  return Boolean(
    placeId &&
    currentLocation.value?.mapPackId === activeMapPackId.value &&
    currentLocation.value?.positionEvidence?.placeId === placeId,
  )
})

const isSelectedPlaceCurrentLocation = computed(
  () =>
    isSelectedPlaceStableCurrentLocation.value ||
    (Number.isFinite(selectedPlaceDistanceKm.value) && selectedPlaceDistanceKm.value <= 0.001),
)

const isSelectedPlaceInside = computed(() => {
  const placeId = selectedMapPlace.value?.placeId || selectedMapPlace.value?.id
  return Boolean(
    placeId &&
    placeSession.value?.state === 'inside' &&
    placeSession.value?.mapPackId === activeMapPackId.value &&
    placeSession.value?.placeId === placeId,
  )
})

const isSelectedPlaceJourneyDestination = computed(() => {
  if (!isJourneyPlanningLocked.value || !selectedMapPlace.value) return false
  const placeId = selectedMapPlace.value.placeId || selectedMapPlace.value.id
  if (tripRuntime.value?.destinationPlaceId) {
    return tripRuntime.value.destinationPlaceId === placeId
  }
  const destinationTexts = [tripRuntime.value?.to, tripRuntime.value?.toLabel]
    .map(normalizePlaceRelationText)
    .filter(Boolean)
  const place = selectedMapPlace.value
  const placeTexts = [
    mapPlaceName(place),
    mapPlaceDetail(place),
    place.label,
    place.detail,
    place.nameZh,
    place.nameEn,
    place.detailZh,
    place.detailEn,
  ]
    .map(normalizePlaceRelationText)
    .filter(Boolean)
  return destinationTexts.some((value) => placeTexts.includes(value))
})

const selectedPlaceSummary = computed(() => {
  const place = selectedMapPlace.value
  if (!place) return ''
  const category = resolveMapPlaceVisual(place, activeMapPack.value?.factions)
  const copy = resolveMapPlaceCopy(place, activeMapPackId.value, category)
  return t(copy.summaryZh, copy.summaryEn)
})

const selectedPlaceMedia = computed(() => (
  selectedMapPlace.value
    ? resolveMapPlaceMedia(selectedMapPlace.value, activeMapPackId.value)
    : null
))

const selectedPlacePinVisible = computed(() => (
  selectedMapPlace.value ? mapStore.isMapPlaceVisible(selectedMapPlace.value) : true
))

const selectedPlaceContextTone = computed(() => {
  if (isSelectedPlaceInside.value) return 'current'
  if (isJourneyPlanningLocked.value) return 'journey'
  if (isSelectedPlaceCurrentLocation.value) return 'current'
  return 'remote'
})

const selectedPlaceContextLabel = computed(() => {
  if (isSelectedPlaceInside.value) return t('已进入地点', 'Inside this place')
  if (isSelectedPlaceJourneyDestination.value) return t('正在前往这里', 'Heading here')
  if (isJourneyPlanningLocked.value) return t('当前行程中 · 浏览地点', 'Active journey · Browsing place')
  if (isSelectedPlaceCurrentLocation.value) return t('当前位置', 'Current position')
  if (!selectedMapPlace.value?.position) return t('此地点暂无可用坐标', 'This place has no usable coordinates')
  if (selectedMapPlace.value.mapPackId !== activeMapPackId.value) {
    return t('此地点位于另一张地图', 'This place belongs to another map')
  }
  if (!currentLocation.value?.position) return t('设置角色位置后可查看距离', 'Set a role position to see distance')
  if (currentLocation.value.mapPackId !== activeMapPackId.value) {
    return t('角色位置位于另一张地图', 'Role position is on another map')
  }
  if (!Number.isFinite(selectedPlaceDistanceKm.value)) return t('暂时无法计算距离', 'Distance is currently unavailable')
  if (selectedPlaceDistanceKm.value < 1) {
    const meters = Math.max(1, Math.round(selectedPlaceDistanceKm.value * 1000))
    return t(`距当前位置 ${meters} 米`, `${meters} m from current position`)
  }
  const distance = selectedPlaceDistanceKm.value.toFixed(selectedPlaceDistanceKm.value < 10 ? 1 : 0)
  return t(`距当前位置 ${distance} 公里`, `${distance} km from current position`)
})

const selectedPlacePrimaryAction = computed(() => {
  if (isJourneyPlanningLocked.value) return 'view_journey'
  if (isSelectedPlaceCurrentLocation.value) return 'none'
  return 'go'
})

const selectedPlaceEntryAction = computed(() => {
  if (isSelectedPlaceInside.value) return 'leave'
  if (
    isSelectedPlaceStableCurrentLocation.value &&
    !isTripTraveling.value &&
    (!isTripArrived.value || isSelectedPlaceJourneyDestination.value)
  ) return 'enter'
  return 'unavailable'
})

const selectedPlaceEventInvitationResult = computed(() => {
  if (!isSelectedPlaceInside.value) return null
  return mapStore.getPlaceSessionEventInvitation({ locale: systemLanguage.value })
})

const selectedPlaceEventInvitation = computed(() =>
  selectedPlaceEventInvitationResult.value?.eligible
    ? selectedPlaceEventInvitationResult.value.invitation
    : null,
)

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
const returnsToCalendar = computed(() => {
  const source = Array.isArray(route.query.source) ? route.query.source[0] : route.query.source
  return source === 'calendar'
})
const returnsToAgendaJourney = computed(() => {
  const source = Array.isArray(route.query.source) ? route.query.source[0] : route.query.source
  return source === 'agenda-journey'
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
  rolePositionMode.value = false
  rolePositionNotice.value = ''
  mapDrawerFocus.value = nextSection
  journeyMediaOpen.value = false
  mapDrawerOpen.value = true
}

const closeMapDrawer = () => {
  mapDrawerOpen.value = false
}

const openJourneyMedia = () => {
  if (!isTripTraveling.value) return
  rolePositionMode.value = false
  mapSearchSuggestionsOpen.value = false
  mapDrawerOpen.value = false
  journeyMediaOpen.value = true
}

const closeJourneyMedia = () => {
  journeyMediaOpen.value = false
}

const openMusicFromJourney = () => {
  const target = buildMusicIntegrationRoute({
    sourceModule: 'map',
    action: 'open',
    contextId: tripRuntime.value?.journeyId || '',
  })
  router.push({
    ...target,
    query: {
      ...target.query,
      ...(normalizeHomePageQuery(route.query.homePage)
        ? { homePage: normalizeHomePageQuery(route.query.homePage) }
        : {}),
    },
  })
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

const openPlaceManager = ({ create = false } = {}) => {
  router.push({
    path: '/map/settings/places',
    query: { ...buildMapSettingsQuery(), ...(create ? { create: '1' } : {}) },
  })
  closeMapDrawer()
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

const updateTripFrom = (value) => {
  if (tripRuntime.value.status === 'traveling' || tripRuntime.value.status === 'arrived') return
  tripForm.value.from = value
}

const updateTripTo = (value) => {
  if (tripRuntime.value.status === 'traveling' || tripRuntime.value.status === 'arrived') return
  const nextValue = typeof value === 'string' ? value : ''
  tripForm.value.to = nextValue
  mapSearchText.value = nextValue
  destinationIntentActive.value = Boolean(nextValue.trim())
  mapSearchSuggestionsOpen.value = false
}

const updateMapSearch = (value) => {
  const nextValue = typeof value === 'string' ? value : ''
  mapSearchText.value = nextValue
  if (!isJourneyPlanningLocked.value && destinationIntentActive.value) {
    mapStore.setTripEndpoint('to', '')
    destinationIntentActive.value = false
    tripActionHint.value = { tone: '', message: '' }
  }
  mapSearchSuggestionsOpen.value = true
}

const openMapSearch = () => {
  rolePositionNotice.value = ''
  mapSearchSuggestionsOpen.value = true
}

const closeMapSearch = () => {
  mapSearchSuggestionsOpen.value = false
}

const clearMapSearch = () => {
  mapSearchText.value = ''
  if (!isJourneyPlanningLocked.value && destinationIntentActive.value) {
    mapStore.setTripEndpoint('to', '')
    destinationIntentActive.value = false
    tripActionHint.value = { tone: '', message: '' }
  }
  selectedSearchCategory.value = 'all'
  mapSearchSuggestionsOpen.value = true
}

const setMapSearchCategory = (categoryId) => {
  selectedSearchCategory.value = categoryId
  mapSearchSuggestionsOpen.value = true
}

const updateTripTransportMode = (value) => {
  const result = mapStore.setTripTransportMode(value)
  if (result?.ok) {
    tripActionHint.value = { tone: '', message: '' }
    return
  }
  if (result?.code === 'TRIP_TRANSPORT_LOCKED') {
    tripActionHint.value = {
      tone: 'warn',
      message: t('本次行程的交通方式已锁定。', 'Transport is locked for this journey.'),
    }
  }
}

const mapPlacePresentation = (place) =>
  resolveMapPlacePresentation(place, {
    mode: mapPlaceDisplayMode.value,
    systemLanguage: systemLanguage.value,
  })

const mapPlaceName = (place) => mapPlacePresentation(place).name

const mapPlaceSecondaryName = (place) => mapPlacePresentation(place).secondaryName

const mapPlaceDetail = (place) => mapPlacePresentation(place).detail

const mapPlaceSecondaryDetail = (place) => mapPlacePresentation(place).secondaryDetail

const mapPlaceVisual = (place) =>
  resolveMapPlaceVisual(place, activeMapPack.value?.factions)

const tripPlaceOptions = computed(() =>
  activeMapPlaces.value
    .filter((place) => place?.position)
    .map((place) => ({
      id: place.placeId || place.id,
      label: mapPlaceName(place),
      value: mapPlaceDetail(place) || mapPlaceName(place),
      source: place.source,
    })),
)

const mapPlaceCategoryOptions = computed(() => {
  const categories = new Map()
  activeMapPlaces.value.forEach((place) => {
    const visual = getMapPlaceCategoryGroupVisual(place.category)
    const categoryId = visual.id
    const current = categories.get(categoryId)
    categories.set(categoryId, {
      ...visual,
      id: categoryId,
      count: (current?.count || 0) + 1,
    })
  })

  const sortedCategories = Array.from(categories.values())
    .sort((left, right) => (left.order || 999) - (right.order || 999) || left.id.localeCompare(right.id))

  return [
    {
      id: 'all',
      icon: 'fas fa-layer-group',
      tone: '#17664f',
      labelZh: '全部',
      labelEn: 'All',
      count: activeMapPlaces.value.length,
    },
    ...sortedCategories,
  ].map((category) => ({
    ...category,
    ...mapStore.getMapPlaceCategoryVisibility(category.id),
  }))
})

const visibleMapPlaces = computed(() =>
  selectedPlaceCategory.value === 'all'
    ? activeMapPlaces.value
    : activeMapPlaces.value.filter(
        (place) => matchesMapPlaceCategoryFilter(place.category, selectedPlaceCategory.value),
      ),
)

const mapScenePins = computed(() =>
  [
    ...activeMapPlaces.value
    .filter(
      (place) =>
        place?.position &&
        (mapStore.isMapPlaceVisible(place) || selectedMapPlace.value?.placeId === place.placeId),
    )
    .map((place) => ({
      ...place,
      name: mapPlaceName(place),
      detail: mapPlaceDetail(place),
      icon: mapPlaceVisual(place).icon,
      tone: mapPlaceVisual(place).tone,
    })),
    ...(currentLocation.value?.mapPackId === activeMapPackId.value && currentLocation.value?.position
      ? [{
          placeId: 'map-role-position',
          source: 'role_position',
          nameZh: tripRuntime.value.status === 'traveling' ? '出发位置' : '角色位置',
          nameEn: tripRuntime.value.status === 'traveling' ? 'Start position' : 'Role position',
          detailZh: currentLocation.value.detail,
          detailEn: currentLocation.value.detail,
          position: { ...currentLocation.value.position },
          icon: 'fas fa-person',
          tone: '#17664f',
        }]
      : []),
    ...mapEventSurfacePins.value,
  ],
)

const mapPinVisibilitySummary = computed(() => mapStore.getMapPlaceCategoryVisibility('all'))

const isMapPlacePinVisible = (place) => mapStore.isMapPlaceVisible(place)

const toggleMapPlaceCategoryVisibility = (category) => {
  if (!category) return
  mapStore.setMapPlaceCategoryVisibility(category.id, category.state !== 'visible')
}

const toggleMapPlaceVisibility = (place) => {
  if (!place?.placeId) return
  mapStore.setMapPlaceVisibility(place.placeId, !mapStore.isMapPlaceVisible(place))
}

const showSelectedPlacePin = () => {
  const placeId = selectedMapPlace.value?.placeId || selectedMapPlace.value?.id
  if (!placeId) return
  mapStore.setMapPlaceVisibility(placeId, true)
}

const setAllMapPlaceVisibility = (visible) => {
  mapStore.setMapPlaceCategoryVisibility('all', visible)
}

const mapSearchQuery = computed(() => mapSearchText.value.trim())
const mapSearchPanelOpen = computed(() => mapSearchSuggestionsOpen.value)
const searchableMapPlaces = computed(() =>
  activeMapPlaces.value.filter((place) => place?.position),
)

const recentMapDestinationTexts = computed(() =>
  [...tripHistory.value]
    .reverse()
    .flatMap((trip) => [trip?.toLabel, trip?.to])
    .filter((value) => typeof value === 'string' && value.trim()),
)

const mapPlaceSearchResults = computed(() => {
  if (!mapSearchPanelOpen.value) return []
  if (mapSearchQuery.value) {
    return searchMapPlaces(searchableMapPlaces.value, mapSearchQuery.value, {
      categoryId: selectedSearchCategory.value,
      limit: Math.max(1, searchableMapPlaces.value.length),
    })
  }
  return suggestMapPlaces(searchableMapPlaces.value, {
    recentDestinationTexts: recentMapDestinationTexts.value,
    categoryId: selectedSearchCategory.value,
    limit: Math.max(1, searchableMapPlaces.value.length),
  })
})

const mapSearchScopeLabel = computed(() => {
  if (mapSearchQuery.value) return t('匹配地点', 'Matching places')
  if (selectedSearchCategory.value !== 'all') return t('分类地点', 'Category places')
  return t('全部地点', 'All places')
})

const mapSearchMatchHint = (result) => {
  const match = result?.match
  if (!match) return ''
  if (match.quality === 'fuzzy') return t('拼写接近', 'Close spelling')
  if (match.kind === 'alias') return t(`别名：${match.value}`, `Alias: ${match.value}`)
  if (match.kind === 'detail') return t('区域或地址匹配', 'Area or address match')
  if (match.kind === 'category') {
    const category = mapPlaceVisual(result.place)
    const group = getMapPlaceCategoryGroupVisual(result.place.category)
    return group.id === category.id
      ? t(`分类：${group.labelZh}`, `Category: ${group.labelEn}`)
      : t(
          `分类：${group.labelZh} · ${category.labelZh}`,
          `Category: ${group.labelEn} · ${category.labelEn}`,
        )
  }
  if (match.kind === 'keyword') return t('相关地点', 'Related place')
  return ''
}

const useFreeformDestination = () => {
  if (!mapSearchQuery.value || isJourneyPlanningLocked.value) return
  mapStore.setTripEndpoint('to', mapSearchQuery.value)
  mapSearchText.value = mapSearchQuery.value
  destinationIntentActive.value = true
  selectedSearchCategory.value = 'all'
  closeMapSearch()
  tripActionHint.value = { tone: '', message: '' }
}

const browsePlacesFromSearch = () => {
  selectedSearchCategory.value = 'all'
  closeMapSearch()
  openMapDrawer('places')
}

const focusMapPlace = (place) => {
  if (!place?.position || place.mapPackId !== activeMapPackId.value) return
  mapFocusTarget.value = { ...place.position }
  mapFocusRequestId.value += 1
}

const onMapSearchResultSelected = (result) => {
  const place = result?.place
  if (!place) return
  focusMapPlace(place)
  onMapPinSelected(place)
}

const selectMapDestination = (place) => {
  if (isJourneyPlanningLocked.value) return
  mapStore.setTripEndpoint('to', mapPlaceDetail(place) || mapPlaceName(place))
  mapSearchText.value = mapPlaceName(place)
  destinationIntentActive.value = true
  mapSearchSuggestionsOpen.value = false
  tripActionHint.value = { tone: '', message: '' }
}

const setTripToMapPlace = (place) => {
  selectMapDestination(place)
}

const onMapPinSelected = (place) => {
  if (place?.source === 'role_position') {
    focusCurrentLocation()
    return
  }
  if (place?.source === 'map_event') {
    selectedMapPlace.value = null
    selectedEventSurfaceId.value = ''
    selectedEventStackIds.value = [...(place.eventSurfaceIds || [])]
    eventReturnPlaceId.value = ''
    return
  }
  selectedMapPlace.value = place
  selectedPlaceAnchor.value = null
  mapSearchSuggestionsOpen.value = false
}

const onSelectedPlaceAnchor = (anchor) => {
  selectedPlaceAnchor.value = anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)
    ? anchor
    : null
}

const canSetRolePosition = computed(
  () => !isTripTraveling.value && !isTripArrived.value,
)

const startRolePositionMode = () => {
  if (!canSetRolePosition.value) return
  closeMapDrawer()
  closeMapSearch()
  closePlaceDetail()
  rolePositionNotice.value = ''
  rolePositionMode.value = true
}

const cancelRolePositionMode = () => {
  rolePositionMode.value = false
}

const onRolePositionSelected = ({ position }) => {
  if (!rolePositionMode.value || !canSetRolePosition.value || !position) return
  const detail = formatMapPosition(position)
  if (!detail) return
  mapStore.setCurrentLocation({
    label: t('自选位置', 'Selected map point'),
    detail,
    source: 'map_point',
    mapPackId: activeMapPackId.value,
    position,
    syncTripOrigin: true,
  })
  rolePositionMode.value = false
  rolePositionNotice.value = t('角色位置已更新', 'Role position updated')
  mapFocusTarget.value = { ...position }
  mapFocusRequestId.value += 1
}

const onMapInteraction = () => {
  closeMapSearch()
  if (!rolePositionMode.value) rolePositionNotice.value = ''
}

const focusCurrentLocation = () => {
  if (!currentLocation.value?.position || currentLocation.value.mapPackId !== activeMapPackId.value) return
  mapFocusTarget.value = null
  mapFocusRequestId.value += 1
}

const closePlaceDetail = () => {
  selectedMapPlace.value = null
  selectedPlaceAnchor.value = null
}

const enterSelectedPlace = () => {
  const placeId = selectedMapPlace.value?.placeId || selectedMapPlace.value?.id
  if (!placeId) return
  mapStore.enterPlace(placeId)
}

const leaveSelectedPlace = () => {
  mapStore.leavePlace()
}

const selectedEventSurface = computed(() =>
  mapEventSurfaces.value.find((surface) => surface.id === selectedEventSurfaceId.value) || null,
)

const selectedEventStack = computed(() =>
  selectedEventStackIds.value
    .map((surfaceId) => mapEventSurfaces.value.find((surface) => surface.id === surfaceId))
    .filter(Boolean),
)

const selectedEventInstance = computed(() =>
  selectedEventSurface.value
    ? simulationStore.getEventInstance(selectedEventSurface.value.proposalId)
    : null,
)

const selectedEventPlace = computed(() => {
  const placeId = selectedEventInstance.value?.place?.placeId
  return activeMapPlaces.value.find((place) => place.placeId === placeId) || null
})

const openSelectedPlaceEvent = () => {
  if (!selectedPlaceEventInvitation.value || placeEventApplying.value) return
  placeEventApplying.value = true
  try {
    const placeId = selectedMapPlace.value?.placeId || selectedMapPlace.value?.id || ''
    const result = mapStore.expandPlaceSessionEvent({ locale: systemLanguage.value })
    if (!result.ok || !result.instance) return
    eventReturnPlaceId.value = placeId
    selectedMapPlace.value = null
    selectedEventStackIds.value = []
    selectedEventSurfaceId.value = `event_surface:map:${result.instance.id}`
    void result.composePromise
  } finally {
    placeEventApplying.value = false
  }
}

const selectEventSurfaceFromStack = (surfaceId) => {
  selectedEventSurfaceId.value = surfaceId
}

const closeEventSurface = () => {
  const returnPlaceId = eventReturnPlaceId.value
  selectedEventSurfaceId.value = ''
  selectedEventStackIds.value = []
  eventReturnPlaceId.value = ''
  if (!returnPlaceId) return
  const place = activeMapPlaces.value.find((item) => item.placeId === returnPlaceId)
  if (!place) return
  selectedMapPlace.value = place
  focusMapPlace(place)
}

const resolveSelectedPlaceEvent = (choiceId) => {
  if (!selectedEventInstance.value || placeEventApplying.value) return
  placeEventApplying.value = true
  try {
    mapStore.resolvePlaceSessionEventChoice(selectedEventInstance.value.id, choiceId)
  } finally {
    placeEventApplying.value = false
  }
}

const dismissSelectedPlaceEvent = () => {
  if (!selectedEventInstance.value || placeEventApplying.value) return
  placeEventApplying.value = true
  try {
    const result = mapStore.dismissPlaceSessionEvent(selectedEventInstance.value.id)
    if (result.ok) closeEventSurface()
  } finally {
    placeEventApplying.value = false
  }
}

const openSelectedPlaceJourney = () => {
  closePlaceDetail()
  openMapDrawer('trip')
}

const useSelectedPlaceAsDestination = () => {
  if (!selectedMapPlace.value) return
  setTripToMapPlace(selectedMapPlace.value)
  closePlaceDetail()
}

const shareSelectedPlaceToChat = () => {
  const place = selectedMapPlace.value
  if (!place) return
  const placeId = place.placeId || place.id
  const shareable = createMapLocationShareObject({
    ...place,
    placeId,
    mapPackId: place.mapPackId || activeMapPackId.value,
    title: mapPlaceName(place),
    summary: mapPlaceDetail(place),
    statusLabel: t('地点', 'Location'),
  })
  const sourceRoute = router.resolve({
    path: '/map',
    query: {
      placeId,
      mapPackId: place.mapPackId || activeMapPackId.value,
    },
  }).fullPath
  const draft = savePendingInternalChatShare({ shareable, sourceRoute })
  if (!draft) {
    tripActionHint.value = {
      tone: 'warn',
      message: t('暂时无法创建分享，请稍后再试。', 'The share could not be prepared. Try again.'),
    }
    return
  }
  void router.push({
    path: '/chat',
    query: { [INTERNAL_CHAT_SHARE_ROUTE_QUERY]: INTERNAL_CHAT_SHARE_ROUTE_VALUE },
  })
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
const isTripPaused = computed(
  () => isTripTraveling.value && tripRuntime.value.phase === MAP_JOURNEY_PHASE.PAUSED,
)
watch(isTripTraveling, (active) => {
  if (!active) journeyMediaOpen.value = false
})
const showRoleLocationControl = computed(
  () =>
    currentLocation.value?.mapPackId === activeMapPackId.value &&
    Boolean(currentLocation.value?.position),
)
const roleLocationControlLabel = computed(() =>
  isTripTraveling.value ? t('出发位置', 'Start position') : t('角色位置', 'Role location'),
)
const roleLocationControlHint = computed(() =>
  isTripTraveling.value
    ? t(`出发位置：${currentLocationText.value}`, `Start position: ${currentLocationText.value}`)
    : t(`角色位置：${currentLocationText.value}`, `Role location: ${currentLocationText.value}`),
)
const mapPrimarySectionLabel = (section) => {
  if (section?.key === 'trip') {
    if (isTripPaused.value) return t('已暂停', 'Paused')
    if (isTripArrived.value) return t('已到达', 'Arrived')
    if (isTripTraveling.value) return t('行程中', 'Traveling')
  }
  return t(section?.shortLabelZh || section?.labelZh, section?.shortLabelEn || section?.labelEn)
}
const isLegacyJourney = computed(
  () =>
    (isTripTraveling.value || isTripArrived.value) &&
    Number(tripRuntime.value?.estimateVersion || 0) === 0,
)
const isRealWorldMap = computed(() => activeMapPack.value?.kind === 'real')
const selectedTripTransportMode = computed(() =>
  isLegacyJourney.value
    ? ''
    : isTripTraveling.value || isTripArrived.value
    ? tripRuntime.value?.transportMode || ''
    : tripForm.value?.transportMode || '',
)
const selectedTripTransport = computed(() =>
  getMapTransportMode(selectedTripTransportMode.value),
)
const selectedTripTransportLabel = computed(() => {
  if (isLegacyJourney.value) return t('旧行程', 'Legacy journey')
  const mode = selectedTripTransport.value
  if (!mode) return t('选择交通方式', 'Choose transport')
  return isRealWorldMap.value
    ? t(mode.labelZh, mode.labelEn)
    : t(mode.neutralLabelZh, mode.neutralLabelEn)
})
const showPrimaryRouteCard = computed(
  () =>
    destinationIntentActive.value ||
    isTripTraveling.value ||
    isTripArrived.value ||
    Boolean(mapWorldAppContext.value),
)
const mapDestinationSearchValue = computed(() => mapSearchText.value)

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
  return Boolean(
    from &&
    to &&
    from !== to &&
    isMapTransportMode(tripForm.value?.transportMode) &&
    !isTripTraveling.value &&
    !isTripArrived.value,
  )
})

const tripStatusLabel = computed(() => {
  if (isTripPaused.value) return t('已暂停', 'Paused')
  if (isTripTraveling.value) return t('进行中', 'In transit')
  if (isTripArrived.value) return t('已到达', 'Arrived')
  return t('待出发', 'Ready')
})

const journeyPhaseLabel = computed(() => {
  if (isTripPaused.value) return t('已暂停', 'Paused')
  const definition = MAP_JOURNEY_CHECKPOINT_DEFINITIONS.find(
    (item) => item.phase === tripRuntime.value?.phase,
  )
  return definition
    ? t(definition.labelZh, definition.labelEn)
    : isTripArrived.value
      ? t('已到达', 'Arrived')
      : t('已出发', 'Departed')
})

const tripProgressPercent = computed(() => {
  const progress = Number(tripRuntime.value?.progress || 0)
  if (!Number.isFinite(progress)) return 0
  return Math.max(0, Math.min(100, Math.round(progress * 100)))
})

const activeJourneyEventProposal = computed(() => {
  const interruption = tripRuntime.value?.activeInterruption
  const proposal = interruption?.proposalId
    ? simulationStore.getMapJourneyEventProposal(interruption.proposalId)
    : null
  if (
    proposal?.status !== MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW ||
    proposal.eventId !== interruption?.eventId ||
    proposal.journeyId !== tripRuntime.value?.journeyId ||
    proposal.checkpointId !== interruption?.checkpointId
  ) {
    return null
  }
  return proposal
})
const hasPendingJourneyEventNotice = computed(() =>
  Boolean(tripRuntime.value?.activeInterruption?.proposalId),
)

const tripArrivalPushStatusLabel = computed(() => {
  if (!isTripTraveling.value) return t('未布置', 'Not armed')
  if (isTripPaused.value) return t('已暂停', 'Paused')
  if (tripRuntime.value?.scheduledPushId) return t('已布置', 'Armed')
  return t('未布置', 'Not armed')
})

const tripArrivalPushHint = computed(() => {
  if (!isTripTraveling.value) {
    return t('开始行程后，可在支持真推送时布置后台到达提醒。', 'Once a trip starts, a background arrival reminder can be armed when real push is available.')
  }
  if (isTripPaused.value) {
    return t('行程时间和后台到达提醒均已暂停。', 'Journey time and background arrival reminder are paused.')
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
  if (to && (destinationIntentActive.value || isTripTraveling.value || isTripArrived.value)) return to
  if (primaryMapAreaFeedback.value) {
    return t(primaryMapAreaFeedback.value.titleZh, primaryMapAreaFeedback.value.titleEn)
  }
  if (primaryRouteFamiliarity.value) {
    return primaryRouteFamiliarity.value.toLabel || primaryRouteFamiliarity.value.to || ''
  }
  return ''
})

const mapPrimarySheetTitle = computed(() => {
  if (isTripPaused.value) return t('行程已暂停', 'Journey paused')
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
  return t('输入目的地，或从地点、足迹反馈和历史路线中选择。', 'Enter a destination, or choose from places, Footprints feedback, and route history.')
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
    requirements.push(t(`${area.remainingPoints} 点足迹`, `${area.remainingPoints} pts`))
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

const journeyPrimaryStatusLabel = computed(() => {
  if (isTripPaused.value) return t('行程已暂停', 'Journey paused')
  if (isTripArrived.value) return t('已到达', 'Arrived')
  return t('行程中', 'In transit')
})

const journeyPrimaryActionLabel = computed(() => {
  if (isTripArrived.value) return t('查看并确认', 'Review arrival')
  if (hasPendingJourneyEventNotice.value) return t('查看途中情况', 'View route update')
  return t('查看行程', 'View journey')
})

const journeyRemainingMetric = computed(() => {
  const total = Math.max(0, Math.ceil(Number(tripRuntime.value?.remainingSeconds) || 0))
  if (total >= 60) return t(`${Math.ceil(total / 60)} 分`, `${Math.ceil(total / 60)}m`)
  return t(`${total} 秒`, `${total}s`)
})

const formatTime = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return '--:--'
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const startTrip = async () => {
  const result = mapStore.startTrip()
  if (result?.ok) {
    destinationIntentActive.value = true
    mapSearchSuggestionsOpen.value = false
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
  if (code === 'TRIP_ARRIVAL_PENDING') {
    tripActionHint.value = {
      tone: 'warn',
      message: t('请先确认已到达的行程。', 'Acknowledge the arrived journey first.'),
    }
    return
  }
  if (code === 'TRIP_TRANSPORT_REQUIRED') {
    tripActionHint.value = {
      tone: 'warn',
      message: t('请选择本次行程的交通方式。', 'Choose transport for this journey.'),
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
  mapSearchText.value = ''
  destinationIntentActive.value = false
  mapSearchSuggestionsOpen.value = false
  tripActionHint.value = {
    tone: 'warn',
    message: t('已取消当前行程。', 'Current trip was cancelled.'),
  }
}

const acknowledgeArrival = () => {
  const sharedRouteTarget = selectedSharedRouteContact.value
  const ok = mapStore.acknowledgeTripArrival()
  if (!ok) return
  mapSearchText.value = ''
  destinationIntentActive.value = false
  mapSearchSuggestionsOpen.value = false
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
  sharedRouteContactId.value = ''
  tripActionHint.value = {
    tone: 'success',
    message: latestReward
      ? t(
          `行程已完成，获得 ${Number(latestReward.rewardPoints) || 0} 点足迹进度。`,
          `Trip completed. Gained ${Number(latestReward.rewardPoints) || 0} Footprints points.`,
        )
      : t('行程已完成。', 'Trip marked as completed.'),
  }
}

const resolveJourneyEvent = async (outcome) => {
  if (journeyEventApplying.value) return
  const proposal = activeJourneyEventProposal.value
  if (!proposal) {
    journeyEventApplying.value = true
    try {
      const recovered = await mapStore.recoverJourneyEventInterruption({ now: Date.now() })
      tripActionHint.value = recovered.ok
        ? {
            tone: 'success',
            message: t(
              '事件记录不可用，已关闭提示；行程未受影响。',
              'The event record was unavailable. The notice was cleared without affecting the journey.',
            ),
          }
        : {
            tone: 'warn',
            message: t('暂时无法恢复行程，请重试。', 'The journey could not resume yet. Please retry.'),
          }
    } finally {
      journeyEventApplying.value = false
    }
    return
  }

  const reviewed = simulationStore.reviewMapJourneyEventProposal(
    proposal.id,
    outcome,
    { at: Date.now() },
  )
  if (!reviewed.ok) {
    tripActionHint.value = {
      tone: 'warn',
      message: t('该行程选择已失效，请重新查看当前状态。', 'This journey choice is stale. Review the current state.'),
    }
    return
  }

  journeyEventApplying.value = true
  try {
    const applied = await mapStore.applyJourneyEventOutcome(reviewed, { now: Date.now() })
    simulationStore.finalizeMapJourneyEventProposal(proposal.id, {
      outcome,
      applied: applied.ok,
      reason: applied.ok ? 'map_journey_outcome_applied' : applied.code,
      at: Date.now(),
    })
    tripActionHint.value = applied.ok
      ? {
          tone: 'success',
          message:
            applied.delaySeconds > 0
              ? t('预计到达时间已增加两分钟，行程继续计时。', 'ETA was extended by two minutes while the journey keeps moving.')
              : t('预计时间保持不变，行程继续计时。', 'ETA is unchanged and the journey keeps moving.'),
        }
      : {
          tone: 'warn',
          message: t('该结果未通过地图行程校验。', 'Map rejected this journey result.'),
        }
  } finally {
    journeyEventApplying.value = false
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

watch(activeMapPackId, (nextPackId, previousPackId) => {
  if (!previousPackId || nextPackId === previousPackId || isTripTraveling.value || isTripArrived.value) return
  mapSearchText.value = ''
  destinationIntentActive.value = false
  mapSearchSuggestionsOpen.value = false
  selectedMapPlace.value = null
  selectedEventSurfaceId.value = ''
  selectedEventStackIds.value = []
  eventReturnPlaceId.value = ''
  mapFocusTarget.value = null
})

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
    if (MAP_DRAWER_SECTIONS.some((section) => section.key === panel)) openMapDrawer(panel)
  },
  { immediate: true },
)

watch(
  () => route.query.action,
  (action) => {
    if (action === 'create') openPlaceManager({ create: true })
  },
  { immediate: true },
)

watch(
  () => [
    route.query.placeId,
    route.query.mapPackId,
    activeMapPackId.value,
    activeMapPlaces.value.length,
  ],
  ([placeId, mapPackId]) => {
    const normalizedPlaceId = typeof placeId === 'string' ? placeId.trim() : ''
    if (!normalizedPlaceId) return
    if (mapPackId && String(mapPackId) !== String(activeMapPackId.value)) return
    const place = activeMapPlaces.value.find(
      (item) => String(item.placeId || item.id) === normalizedPlaceId,
    )
    if (!place) return
    focusMapPlace(place)
    selectedMapPlace.value = place
  },
  { immediate: true },
)

watch(activeMapPackId, () => {
  selectedPlaceCategory.value = 'all'
})

watch(mapPlaceCategoryOptions, (options) => {
  if (!options.some((category) => category.id === selectedPlaceCategory.value)) {
    selectedPlaceCategory.value = 'all'
  }
})

onMounted(() => {
  mapStore.setJourneyCheckpointEventEvaluationEnabled(false)
  tickRuntime()
  runtimeTimer = setInterval(() => {
    tickRuntime()
  }, 1000)
})

onBeforeUnmount(() => {
  mapStore.setJourneyCheckpointEventEvaluationEnabled(false)
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
      <button
        type="button"
        class="map-topbar-button"
        data-testid="map-go-home"
        :aria-label="returnsToMapSettings ? t('返回地图设置', 'Back to Map settings') : returnsToAgendaJourney ? t('返回行程', 'Back to Journey') : returnsToCalendar ? t('返回日历', 'Back to Calendar') : t('返回首页', 'Back to Home')"
        @click="goHome"
      >
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
          :focus-position="mapFocusPosition"
          :selected-position="selectedMapPlace?.position || null"
          :allow-pin-placement="rolePositionMode"
          @place-pin="onRolePositionSelected"
          @select-pin="onMapPinSelected"
          @selected-anchor="onSelectedPlaceAnchor"
          @map-interact="onMapInteraction"
        />

        <div class="map-search-card" :class="{ 'has-results': mapSearchPanelOpen }">
          <label class="map-search-row">
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <input
              :value="mapDestinationSearchValue"
              class="map-destination-input"
              :placeholder="isJourneyPlanningLocked
                ? t('搜索并浏览其他地点', 'Search and browse other places')
                : t('搜索地点、区域或类型', 'Search places, areas, or categories')"
              data-testid="map-destination-search"
              @focus="openMapSearch"
              @input="updateMapSearch($event.target.value)"
              @keydown.esc="closeMapSearch"
            />
            <button
              v-if="mapDestinationSearchValue"
              type="button"
              :aria-label="t('清除搜索', 'Clear search')"
              @click="clearMapSearch"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </label>
          <div v-if="mapSearchPanelOpen" class="map-place-results" data-testid="map-local-place-results">
            <div class="map-search-scope" data-testid="map-local-search-scope">
              <span><i class="fas fa-map-pin" aria-hidden="true"></i>{{ mapSearchScopeLabel }}</span>
              <small>{{ mapPlaceSearchResults.length }}/{{ searchableMapPlaces.length }}</small>
            </div>
            <div
              v-if="isJourneyPlanningLocked"
              class="map-search-journey-lock"
              data-testid="map-search-journey-lock"
              role="status"
            >
              <i class="fas fa-lock" aria-hidden="true"></i>
              <span>{{ t('当前行程目的地已锁定，可继续浏览地点', 'Current destination is locked; you can still browse places') }}</span>
            </div>
            <div
              class="map-search-categories"
              data-testid="map-search-categories"
              role="group"
              :aria-label="t('搜索地点分类', 'Search place categories')"
            >
              <button
                v-for="category in mapPlaceCategoryOptions"
                :key="category.id"
                type="button"
                class="map-search-category"
                :class="{ 'is-active': selectedSearchCategory === category.id }"
                :data-testid="`map-search-category-${category.id}`"
                :aria-pressed="selectedSearchCategory === category.id"
                @click="setMapSearchCategory(category.id)"
              >
                <i :class="category.icon" aria-hidden="true"></i>
                <span>{{ t(category.labelZh, category.labelEn) }}</span>
                <small>{{ category.count }}</small>
              </button>
            </div>
            <button
              v-for="result in mapPlaceSearchResults"
              :key="result.place.placeId"
              type="button"
              class="map-place-result"
              :style="{ '--map-place-tone': mapPlaceVisual(result.place).tone }"
              @click="onMapSearchResultSelected(result)"
            >
              <span class="map-place-result-icon">
                <i :class="mapPlaceVisual(result.place).icon" aria-hidden="true"></i>
              </span>
              <span class="min-w-0 text-left">
                <span class="block truncate text-xs font-semibold text-slate-900">{{ mapPlaceName(result.place) }}</span>
                <span v-if="mapPlaceSecondaryName(result.place)" class="map-place-result-secondary">
                  {{ mapPlaceSecondaryName(result.place) }}
                </span>
                <span class="map-place-result-detail">
                  <span v-if="mapSearchMatchHint(result)" class="map-place-result-match">{{ mapSearchMatchHint(result) }}</span>
                  <span class="truncate">{{ mapPlaceDetail(result.place) }}</span>
                </span>
              </span>
            </button>
            <div v-if="mapPlaceSearchResults.length === 0" class="map-search-empty">
              <p>{{ t('当前世界没有匹配的地点。', 'No matching place exists in the current world.') }}</p>
              <div class="map-search-empty-actions">
                <button v-if="!isJourneyPlanningLocked" type="button" data-testid="map-use-freeform-destination" @click="useFreeformDestination">
                  <i class="fas fa-arrow-right" aria-hidden="true"></i>
                  <span>{{ t('按此文字规划', 'Use this destination') }}</span>
                </button>
                <button type="button" data-testid="map-search-browse-places" @click="browsePlacesFromSearch">
                  <i class="fas fa-bookmark" aria-hidden="true"></i>
                  <span>{{ t('浏览地点', 'Browse places') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="map-control-stack" data-testid="map-primary-controls">
          <div class="map-role-control-group">
            <button
              v-if="showRoleLocationControl"
              type="button"
              class="map-control-button"
              data-testid="map-current-location"
              :aria-label="roleLocationControlHint"
              :title="roleLocationControlHint"
              @click="focusCurrentLocation"
            >
              <i class="fas fa-location-dot" aria-hidden="true"></i>
              <span>{{ roleLocationControlLabel }}</span>
            </button>
            <button
              v-if="canSetRolePosition"
              type="button"
              class="map-control-button is-icon-only"
              :class="{ 'is-active': rolePositionMode }"
              data-testid="map-set-current-location"
              :aria-label="t('在地图上设定角色位置', 'Set role position on map')"
              :title="t('在地图上设定角色位置', 'Set role position on map')"
              :aria-pressed="rolePositionMode"
              @click="startRolePositionMode"
            >
              <i class="fas fa-crosshairs" aria-hidden="true"></i>
            </button>
          </div>
          <button
            v-for="section in MAP_PRIMARY_SECTIONS"
            :key="section.key"
            type="button"
            class="map-control-button map-section-control"
            :class="{
              'is-active': mapDrawerOpen && mapDrawerFocus === section.key,
              'has-runtime': section.key === 'trip' && (isTripTraveling || isTripArrived),
            }"
            :data-testid="`map-open-${section.key}`"
            :aria-label="mapPrimarySectionLabel(section)"
            @click="openMapDrawer(section.key)"
          >
            <i :class="section.icon" aria-hidden="true"></i>
            <span>{{ mapPrimarySectionLabel(section) }}</span>
          </button>
          <button
            v-if="isTripTraveling"
            type="button"
            class="map-control-button is-icon-only map-journey-media-button"
            :class="{
              'is-active': journeyMediaOpen,
              'is-playing': musicStore.isPlaying,
              'has-station': Boolean(musicStore.mapJourneyMedia.activeStationId),
            }"
            data-testid="map-journey-media-button"
            :aria-label="t('行程音乐与电台', 'Journey music and radio')"
            :title="t('行程音乐与电台', 'Journey music and radio')"
            :aria-pressed="journeyMediaOpen"
            @click="journeyMediaOpen ? closeJourneyMedia() : openJourneyMedia()"
          >
            <i :class="musicStore.mapJourneyMedia.activeStationId ? 'fas fa-tower-broadcast' : 'fas fa-headphones'" aria-hidden="true"></i>
            <span class="map-journey-media-state" aria-hidden="true"></span>
          </button>
        </div>

        <div
          v-if="rolePositionMode || rolePositionNotice"
          class="map-role-position-banner"
          :class="{ 'is-success': !rolePositionMode }"
          :data-testid="rolePositionMode ? 'map-role-position-mode' : 'map-role-position-feedback'"
          role="status"
        >
          <i :class="rolePositionMode ? 'fas fa-location-crosshairs' : 'fas fa-check'" aria-hidden="true"></i>
          <span>
            <strong>{{ rolePositionMode ? t('设定角色位置', 'Set role position') : rolePositionNotice }}</strong>
            <small v-if="rolePositionMode">{{ t('点击地图任意空白位置确认坐标', 'Tap any blank map point to confirm') }}</small>
          </span>
          <button type="button" :aria-label="rolePositionMode ? t('取消', 'Cancel') : t('关闭', 'Dismiss')" @click="rolePositionMode ? cancelRolePositionMode() : rolePositionNotice = ''">
            {{ rolePositionMode ? t('取消', 'Cancel') : t('知道了', 'Done') }}
          </button>
        </div>

        <div
          v-if="showPrimaryRouteCard"
          class="map-route-card"
          :class="{
            'is-active-journey': isTripTraveling || isTripArrived,
            'has-journey-event': hasPendingJourneyEventNotice,
            'is-arrived-journey': isTripArrived,
            'is-journey-moving': isTripTraveling && !isTripPaused,
          }"
          data-testid="map-primary-route-card"
        >
          <div
            v-if="isTripTraveling || isTripArrived"
            class="map-journey-live-status"
            data-testid="map-primary-journey-status"
          >
            <span>
              <i :class="isTripPaused ? 'fas fa-pause' : isTripArrived ? 'fas fa-flag-checkered' : 'fas fa-circle'" aria-hidden="true"></i>
              {{ journeyPrimaryStatusLabel }}
            </span>
            <small data-testid="map-primary-journey-phase">{{ journeyPhaseLabel }}</small>
          </div>
          <div
            v-if="mapWorldAppContext && !isTripTraveling && !isTripArrived"
            class="map-world-app-line"
            data-testid="map-world-app-context"
            :data-world-pack="mapWorldAppContext.packId"
            :data-world-app="mapWorldAppContext.bindingId"
          >
            <i :class="mapWorldAppContext.icon" aria-hidden="true"></i>
            <p>{{ mapWorldAppContext.bindingTitle }}</p>
          </div>
          <div class="map-route-summary" :class="{ 'is-active': isTripTraveling || isTripArrived }">
            <div class="min-w-0">
              <p>{{ isTripTraveling || isTripArrived ? mapPrimarySheetTitle : mapRouteEyebrow }}</p>
              <h2>{{ isTripTraveling || isTripArrived ? activeTripRouteLabel : mapPrimarySheetTitle }}</h2>
              <span v-if="isTripTraveling || isTripArrived" class="map-route-supporting-line">
                <i :class="selectedTripTransport?.icon || 'fas fa-route'" aria-hidden="true"></i>
                {{ selectedTripTransportLabel }}
                <span aria-hidden="true">·</span>
                {{ t('预计到达', 'ETA') }} {{ formatTime(tripRuntime.etaAt) }}
              </span>
              <span v-else>{{ mapPrimarySheetDescription }}</span>
            </div>
            <div class="map-route-metrics">
              <strong>{{ isTripTraveling || isTripArrived ? journeyRemainingMetric : tripEstimate.transportMode ? tripEstimate.minutes : '--' }}</strong>
              <small>{{ isTripTraveling || isTripArrived ? t('剩余', 'remaining') : t('分钟', 'min') }}</small>
            </div>
          </div>
          <button
            v-if="!isTripTraveling && !isTripArrived"
            type="button"
            class="mt-2 flex min-h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-[11px] font-bold text-slate-700 disabled:cursor-default"
            :class="{ 'border-emerald-200 bg-emerald-50 text-emerald-800': selectedTripTransport }"
            :disabled="isTripTraveling || isTripArrived"
            data-testid="map-primary-transport-mode"
            @click="openMapDrawer('trip')"
          >
            <i :class="selectedTripTransport?.icon || 'fas fa-route'" aria-hidden="true"></i>
            <span class="min-w-0 flex-1 truncate">{{ selectedTripTransportLabel }}</span>
            <i v-if="isTripTraveling || isTripArrived" class="fas fa-lock" aria-hidden="true"></i>
            <i v-else class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
          <div v-if="isTripTraveling || isTripArrived" class="map-journey-progress">
            <div class="map-journey-progress-meta">
              <span>{{ t('行程进度', 'Journey progress') }}</span>
              <strong>{{ tripProgressPercent }}%</strong>
            </div>
            <div class="map-journey-progress-track">
              <div
                class="map-journey-progress-value"
                :style="{ width: `${tripProgressPercent}%` }"
              ></div>
            </div>
          </div>
          <button
            v-if="hasPendingJourneyEventNotice"
            type="button"
            class="map-route-event-notice"
            data-testid="map-primary-journey-event"
            @click="openMapDrawer('trip')"
          >
            <i class="fas fa-diamond-turn-right" aria-hidden="true"></i>
            <span>
              <strong>{{ t('途中有新情况', 'New route update') }}</strong>
              <small>{{ t('行程仍在继续，可稍后查看', 'Journey continues; review when ready') }}</small>
            </span>
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
          <div class="map-route-actions">
            <button
              v-if="!isTripTraveling && !isTripArrived"
              type="button"
              class="map-primary-action"
              :disabled="!canStartTrip"
              :class="{ 'map-primary-action-disabled': !canStartTrip }"
              data-testid="map-primary-start-trip"
              @click="startTrip"
            >
              {{ t('开始行程', 'Start trip') }}
            </button>
            <button
              v-if="!isTripTraveling && !isTripArrived"
              type="button"
              class="map-secondary-action"
              data-testid="map-open-trip-drawer"
              @click="openMapDrawer('trip')"
            >
              {{ t('详情', 'Details') }}
            </button>
            <button
              v-else
              type="button"
              class="map-primary-action map-active-journey-action"
              data-testid="map-active-journey"
              @click="openMapDrawer('trip')"
            >
              <i :class="hasPendingJourneyEventNotice ? 'fas fa-diamond-turn-right' : isTripArrived ? 'fas fa-flag-checkered' : 'fas fa-route'" aria-hidden="true"></i>
              <span class="sr-only">{{ journeyPrimaryStatusLabel }} · </span>
              <span>{{ journeyPrimaryActionLabel }}</span>
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>

      </section>
    </main>

    <div
      v-if="journeyMediaOpen && isTripTraveling"
      class="map-journey-media-backdrop"
      data-testid="map-journey-media-drawer"
      @click.self="closeJourneyMedia"
    >
      <MapJourneyMediaPanel
        :journey-label="activeTripRouteLabel"
        @close="closeJourneyMedia"
        @open-music="openMusicFromJourney"
      />
    </div>

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
        </div>
        <div class="map-pin-visibility-toolbar" data-testid="map-pin-visibility-toolbar">
          <div>
            <span>{{ t('地图图钉', 'Map pins') }}</span>
            <strong>
              {{ mapPinVisibilitySummary.visibleCount }}/{{ mapPinVisibilitySummary.totalCount }}
              {{ t('已显示', 'shown') }}
            </strong>
          </div>
          <div>
            <button
              type="button"
              data-testid="map-pin-show-all"
              :aria-label="t('显示全部图钉', 'Show all pins')"
              :title="t('显示全部图钉', 'Show all pins')"
              @click="setAllMapPlaceVisibility(true)"
            >
              <i class="fas fa-eye" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              data-testid="map-pin-hide-all"
              :aria-label="t('隐藏全部图钉', 'Hide all pins')"
              :title="t('隐藏全部图钉', 'Hide all pins')"
              @click="setAllMapPlaceVisibility(false)"
            >
              <i class="fas fa-eye-slash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div
          class="map-place-category-filter"
          role="group"
          :aria-label="t('地点分类', 'Place categories')"
          data-testid="map-place-category-filter"
        >
          <div
            v-for="category in mapPlaceCategoryOptions"
            :key="category.id"
            class="map-place-category-control"
            :class="{
              'is-active': selectedPlaceCategory === category.id,
              'is-hidden': category.state === 'hidden',
              'is-mixed': category.state === 'mixed',
            }"
            :style="{ '--map-place-tone': category.tone }"
          >
            <button
              type="button"
              class="map-place-category-select"
              :data-testid="`map-place-filter-${category.id}`"
              :aria-pressed="selectedPlaceCategory === category.id"
              @click="selectedPlaceCategory = category.id"
            >
              <i :class="category.icon" aria-hidden="true"></i>
              <span>{{ t(category.labelZh, category.labelEn) }}</span>
              <small>{{ category.visibleCount }}/{{ category.count }}</small>
            </button>
            <button
              type="button"
              class="map-place-category-visibility"
              :data-testid="`map-place-category-visibility-${category.id}`"
              :aria-label="category.state === 'visible'
                ? t(`隐藏${t(category.labelZh, category.labelEn)}图钉`, `Hide ${t(category.labelZh, category.labelEn)} pins`)
                : t(`显示${t(category.labelZh, category.labelEn)}图钉`, `Show ${t(category.labelZh, category.labelEn)} pins`)"
              :title="category.state === 'visible'
                ? t('隐藏此类图钉', 'Hide this category')
                : t('显示此类图钉', 'Show this category')"
              :aria-pressed="category.state === 'visible'"
              @click="toggleMapPlaceCategoryVisibility(category)"
            >
              <i
                :class="category.state === 'visible'
                  ? 'fas fa-eye'
                  : category.state === 'mixed'
                    ? 'fas fa-eye-low-vision'
                    : 'fas fa-eye-slash'"
                aria-hidden="true"
              ></i>
            </button>
          </div>
        </div>
        <button
          type="button"
          class="map-place-management-link"
          data-testid="map-manage-places"
          @click="openPlaceManager()"
        >
          <i class="fas fa-map-location-dot" aria-hidden="true"></i>
          <span>
            <strong>{{ t('新增或管理地点与图钉', 'Add or manage places and pins') }}</strong>
            <small>{{ t('在地图设置中新增、编辑与选定坐标', 'Create, edit, and place pins in Map Settings') }}</small>
          </span>
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
        <div class="map-place-list" data-testid="map-filtered-place-list">
          <div
            v-for="item in visibleMapPlaces"
            :key="item.placeId"
            class="map-place-list-row"
            :class="{ 'is-pin-hidden': !isMapPlacePinVisible(item) }"
            :style="{ '--map-place-tone': mapPlaceVisual(item).tone }"
          >
            <button type="button" class="map-place-list-main" @click="onMapPinSelected(item)">
              <span class="map-place-list-icon">
                <i :class="mapPlaceVisual(item).icon" aria-hidden="true"></i>
              </span>
              <span class="min-w-0 text-left">
                <strong>{{ mapPlaceName(item) }}</strong>
                <small v-if="mapPlaceSecondaryName(item)" class="map-place-list-secondary">
                  {{ mapPlaceSecondaryName(item) }}
                </small>
                <small>{{ mapPlaceDetail(item) }}</small>
              </span>
              <span class="map-place-list-source">{{ item.source === 'user' ? t('我的', 'Mine') : t('世界', 'World') }}</span>
              <i class="fas fa-chevron-right map-place-list-chevron" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="map-place-pin-visibility"
              :data-testid="`map-place-visibility-${item.placeId}`"
              :aria-label="isMapPlacePinVisible(item)
                ? t(`隐藏${mapPlaceName(item)}图钉`, `Hide ${mapPlaceName(item)} pin`)
                : t(`显示${mapPlaceName(item)}图钉`, `Show ${mapPlaceName(item)} pin`)"
              :title="isMapPlacePinVisible(item) ? t('隐藏图钉', 'Hide pin') : t('显示图钉', 'Show pin')"
              :aria-pressed="isMapPlacePinVisible(item)"
              @click="toggleMapPlaceVisibility(item)"
            >
              <i :class="isMapPlacePinVisible(item) ? 'fas fa-eye' : 'fas fa-eye-slash'" aria-hidden="true"></i>
            </button>
          </div>
          <div v-if="visibleMapPlaces.length === 0" class="map-place-list-empty">
            <i class="fas fa-map-pin" aria-hidden="true"></i>
            <span>{{ t('还没有地点', 'No places yet') }}</span>
          </div>
        </div>
      </section>

      <section
        v-show="mapDrawerFocus === 'progress'"
        class="map-glass-panel rounded-[1.75rem] p-4"
        data-testid="map-footprints-discovery"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <div>
            <p class="text-[10px] font-extrabold text-gray-500">{{ t('地点认知', 'PLACE KNOWLEDGE') }}</p>
            <h2 class="font-semibold">{{ t('附近发现', 'Nearby discoveries') }}</h2>
          </div>
          <AssetStatusBadge
            :label="activeMapPlaceKnowledgeMode === MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED
              ? t(`${activeMapPlaceDiscoverySummary.discoveredCount}/${activeMapPlaceDiscoverySummary.totalCount} 已发现`, `${activeMapPlaceDiscoverySummary.discoveredCount}/${activeMapPlaceDiscoverySummary.totalCount} discovered`)
              : t('全部地点已知', 'All places known')"
            icon="fas fa-shoe-prints"
            tone="emerald"
            :truncate="false"
          />
        </div>
        <p class="text-xs leading-5 text-gray-500">
          {{ activeMapPlaceKnowledgeMode === MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED
            ? t('完成有坐标的行程后，目的地周边的便利设施会逐步出现在地图与搜索中。', 'Complete positioned journeys to reveal nearby facilities on the map and in search.')
            : t('当前世界使用全部已知模式；切换模式也会保留已经形成的发现记录。', 'This world currently reveals all places; existing discoveries remain saved when modes change.') }}
        </p>
        <div v-if="activeMapPlaceDiscoverySummary.recentDiscoveries.length" class="mt-3 border-t border-white/50">
          <div
            v-for="discovery in activeMapPlaceDiscoverySummary.recentDiscoveries"
            :key="discovery.placeId"
            class="flex min-h-10 items-center gap-2 border-b border-white/50 py-2"
            :data-testid="`map-footprint-discovery-${discovery.placeId}`"
          >
            <i :class="mapPlaceVisual(discovery.place).icon" class="w-5 text-center text-[11px] text-emerald-700" aria-hidden="true"></i>
            <span class="min-w-0 flex-1 truncate text-xs font-semibold">{{ mapPlaceName(discovery.place) }}</span>
            <small class="text-[10px] text-gray-500">{{ formatTime(discovery.evidence?.discoveredAt) }}</small>
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
        :journey-event-proposal="activeJourneyEventProposal"
        :journey-event-applying="journeyEventApplying"
        :is-trip-traveling="isTripTraveling"
        :is-trip-arrived="isTripArrived"
        :is-real-world-map="isRealWorldMap"
        :relationship-contact-options="relationshipContactOptions"
        :trip-place-options="tripPlaceOptions"
        :role-position-label="currentLocationText"
        :role-position-value="currentLocation.detail"
        :shared-route-contact-id="sharedRouteContactId"
        :can-start-trip="canStartTrip"
        :format-seconds="formatSeconds"
        :format-time="formatTime"
        @update-trip-from="updateTripFrom"
        @update-trip-to="updateTripTo"
        @update-transport-mode="updateTripTransportMode"
        @start-trip="startTrip"
        @cancel-trip="cancelTrip"
        @acknowledge-arrival="acknowledgeArrival"
        @resolve-journey-event="resolveJourneyEvent"
        @update-shared-route-contact="sharedRouteContactId = $event"
      />

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
        @delete-trip="deleteTripHistoryItem"
      />

        </div>
      </aside>
    </div>

    <MapPlaceFocusSheet
      v-if="selectedMapPlace"
      :place="selectedMapPlace"
      :visual="mapPlaceVisual(selectedMapPlace)"
      :media="selectedPlaceMedia"
      :name="mapPlaceName(selectedMapPlace)"
      :secondary-name="mapPlaceSecondaryName(selectedMapPlace)"
      :summary="selectedPlaceSummary"
      :detail="mapPlaceDetail(selectedMapPlace)"
      :secondary-detail="mapPlaceSecondaryDetail(selectedMapPlace)"
      :source-label="selectedMapPlace.source === 'user' ? t('我的地点', 'My place') : t('世界地点', 'World place')"
      :category-label="t(mapPlaceVisual(selectedMapPlace).labelZh, mapPlaceVisual(selectedMapPlace).labelEn)"
      :context-label="selectedPlaceContextLabel"
      :context-tone="selectedPlaceContextTone"
      :primary-action="selectedPlacePrimaryAction"
      :entry-action="selectedPlaceEntryAction"
      :anchor="selectedPlaceAnchor"
      :event-invitation="selectedPlaceEventInvitation"
      :can-manage="selectedMapPlace.source === 'user'"
      :pin-visible="selectedPlacePinVisible"
      :t="t"
      @close="closePlaceDetail"
      @go="useSelectedPlaceAsDestination"
      @view-journey="openSelectedPlaceJourney"
      @enter="enterSelectedPlace"
      @leave="leaveSelectedPlace"
      @expand-event="openSelectedPlaceEvent"
      @share="shareSelectedPlaceToChat"
      @manage="openSelectedPlaceManager"
      @show-pin="showSelectedPlacePin"
    />

    <MapEventSurfaceSheet
      v-if="selectedEventSurface || selectedEventStack.length"
      :surface="selectedEventSurface"
      :stack="selectedEventStack"
      :instance="selectedEventInstance"
      :place-name="selectedEventPlace ? mapPlaceName(selectedEventPlace) : ''"
      :busy="placeEventApplying"
      :t="t"
      @close="closeEventSurface"
      @select-surface="selectEventSurfaceFromStack"
      @choose="resolveSelectedPlaceEvent"
      @dismiss="dismissSelectedPlaceEvent"
    />
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
  background: color-mix(in srgb, var(--map-place-tone) 14%, white);
  color: var(--map-place-tone);
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
  max-height: min(72vh, 520px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  border-top: 1px solid #e1e6e2;
  background: #fff;
  padding: 5px;
}

.map-search-scope {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 8px 5px;
  color: #718078;
  font-size: 9px;
  font-weight: 800;
}

.map-search-scope > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.map-search-scope small {
  min-width: 24px;
  border-radius: 5px;
  background: #edf1ee;
  padding: 3px 5px;
  color: #526158;
  text-align: center;
}

.map-search-journey-lock {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 7px 7px;
  border: 1px solid #d7e2dc;
  border-radius: 6px;
  background: #f2f7f4;
  padding: 7px 8px;
  color: #315044;
  font-size: 9px;
  font-weight: 750;
  line-height: 1.4;
}

.map-search-journey-lock i {
  flex: 0 0 auto;
  color: #17664f;
}

.map-search-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 0 7px 7px;
}

.map-search-category {
  display: inline-flex;
  min-height: 30px;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  border: 1px solid #dce4de;
  border-radius: 6px;
  background: #f8faf8;
  padding: 4px 7px;
  color: #526158;
  font-size: 9px;
  font-weight: 800;
}

.map-search-category small {
  color: #829087;
  font-size: 8px;
}

.map-search-category.is-active {
  border-color: #17664f;
  background: #17664f;
  color: #fff;
}

.map-search-category.is-active small {
  color: rgba(255, 255, 255, 0.74);
}

.map-search-empty {
  margin: 0;
  padding: 10px 8px 12px;
  color: #718078;
  font-size: 10px;
  line-height: 1.5;
}

.map-search-empty p {
  margin: 0;
}

.map-search-empty-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
}

.map-search-empty-actions button {
  display: inline-flex;
  min-width: 0;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #d8e1db;
  border-radius: 6px;
  background: #f7faf8;
  padding: 5px 7px;
  color: #315044;
  font-size: 9px;
  font-weight: 800;
}

.map-search-empty-actions button:first-child {
  border-color: #17664f;
  background: #17664f;
  color: #fff;
}

.map-search-empty-actions span {
  min-width: 0;
  overflow-wrap: anywhere;
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
  background: color-mix(in srgb, var(--map-place-tone) 14%, white);
  color: var(--map-place-tone);
  font-size: 11px;
}

.map-place-result-detail {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  color: #718078;
  font-size: 9px;
}

.map-place-result-secondary {
  display: block;
  overflow: hidden;
  margin-top: 1px;
  color: #506159;
  font-size: 9px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-place-result-match {
  max-width: 46%;
  flex: 0 1 auto;
  overflow: hidden;
  color: #17664f;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-place-result-match + span::before {
  content: '·';
  margin-right: 5px;
  color: #a2aca6;
}

.map-control-stack {
  position: absolute;
  top: 76px;
  right: 14px;
  z-index: 11;
  display: grid;
  justify-items: end;
  gap: 7px;
}

.map-role-control-group {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
}

.map-control-button {
  display: inline-flex;
  min-width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(211, 221, 214, 0.9);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  padding: 0 10px;
  color: #2f443a;
  box-shadow: 0 8px 22px rgba(31, 48, 39, 0.12);
  font-size: 12px;
  backdrop-filter: blur(10px);
}

.map-control-button span {
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0;
  white-space: nowrap;
}

.map-control-button.is-icon-only {
  width: 42px;
  min-width: 42px;
  padding: 0;
}

.map-control-button.is-active,
.map-control-button.has-runtime {
  border-color: #17664f;
  background: #17664f;
  color: #fff;
}

.map-journey-media-button {
  position: relative;
}

.map-journey-media-button.has-station {
  border-color: #9e7a26;
  background: #fff8df;
  color: #765711;
}

.map-journey-media-button.is-active {
  border-color: #17664f;
  background: #17664f;
  color: #fff;
}

.map-journey-media-state {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 6px;
  height: 6px;
  border: 1px solid #fff;
  border-radius: 50%;
  background: #9aa69f;
}

.map-journey-media-button.is-playing .map-journey-media-state {
  background: #e0ad36;
  animation: map-journey-media-pulse 1.4s ease-in-out infinite;
}

@keyframes map-journey-media-pulse {
  0%, 100% { transform: scale(0.78); opacity: 0.62; }
  50% { transform: scale(1.2); opacity: 1; }
}

.map-control-button.has-runtime {
  box-shadow: 0 9px 24px rgba(23, 102, 79, 0.24);
}

.map-role-position-banner {
  position: absolute;
  top: 76px;
  right: 134px;
  left: 14px;
  z-index: 13;
  display: grid;
  min-height: 48px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 1px solid #bda45d;
  border-radius: 8px;
  background: rgba(255, 249, 224, 0.98);
  padding: 7px 9px;
  color: #5f4b11;
  box-shadow: 0 10px 28px rgba(82, 62, 9, 0.16);
}

.map-role-position-banner.is-success {
  border-color: #9fc8b5;
  background: rgba(235, 246, 239, 0.98);
  color: #17664f;
}

.map-role-position-banner > span { display: grid; min-width: 0; gap: 2px; }
.map-role-position-banner strong { font-size: 10px; font-weight: 850; }
.map-role-position-banner small { font-size: 9px; line-height: 1.35; }
.map-role-position-banner > button { min-height: 32px; border-radius: 6px; background: rgba(255, 255, 255, 0.72); padding: 0 8px; font-size: 9px; font-weight: 800; }

.map-control-button.is-primary {
  border-color: #17664f;
  background: #17664f;
  color: #fff;
}

.map-route-card {
  position: absolute;
  right: auto;
  bottom: 14px;
  left: 50%;
  z-index: 10;
  width: min(calc(100% - 28px), 640px);
  border: 1px solid rgba(210, 219, 213, 0.95);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.97);
  padding: 11px 12px;
  color: #17211d;
  box-shadow: 0 14px 38px rgba(31, 48, 39, 0.17);
  backdrop-filter: blur(14px);
  transform: translateX(-50%);
  animation: map-route-card-enter 180ms cubic-bezier(0.2, 0.78, 0.32, 1) both;
}

@keyframes map-route-card-enter {
  from { opacity: 0; transform: translate(-50%, 8px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.map-route-card.is-active-journey {
  border-top: 3px solid #17664f;
  padding: 10px 12px 12px;
  box-shadow: 0 18px 44px rgba(21, 71, 55, 0.22);
}

.map-route-card.has-journey-event {
  border-top-color: #a46f13;
}

.map-route-card.is-arrived-journey {
  border-top-color: #155d46;
}

.map-journey-live-status {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
  border-bottom: 1px solid #e4e9e6;
  padding-bottom: 7px;
  color: #17664f;
}

.map-journey-live-status > span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 900;
}

.map-journey-live-status > span i {
  font-size: 7px;
}

.map-route-card.is-journey-moving .map-journey-live-status > span i {
  animation: map-journey-pulse 1.5s ease-in-out infinite;
}

@keyframes map-journey-pulse {
  0%, 100% { opacity: 0.45; transform: scale(0.82); }
  50% { opacity: 1; transform: scale(1.18); }
}

.map-journey-live-status > small {
  min-width: 0;
  color: #607068;
  font-size: 9px;
  font-weight: 800;
  overflow-wrap: anywhere;
  text-align: right;
}

.map-route-event-notice {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 48px;
  grid-template-columns: 28px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  border: 1px solid #dcc88a;
  border-radius: 7px;
  background: #fff8df;
  padding: 7px 9px;
  color: #684f10;
  text-align: left;
}

.map-route-event-notice > i:first-child {
  color: #9a7114;
  text-align: center;
}

.map-route-event-notice > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.map-route-event-notice strong,
.map-route-event-notice small {
  overflow-wrap: anywhere;
}

.map-route-event-notice strong {
  font-size: 10px;
  font-weight: 900;
}

.map-route-event-notice small {
  color: #7f7048;
  font-size: 9px;
  line-height: 1.35;
}

.map-route-event-notice > i:last-child {
  color: #9a8755;
  font-size: 8px;
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

.map-world-app-line p {
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

.map-route-summary.is-active { grid-template-columns: minmax(0, 1fr) 62px; }

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

.map-route-summary.is-active h2 {
  font-size: 15px;
  letter-spacing: 0;
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

.map-route-supporting-line {
  display: flex !important;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.map-route-supporting-line > i { flex: 0 0 auto; color: #17664f; font-size: 9px; }
.map-route-supporting-line > span { flex: 0 0 auto; }

.map-route-metrics {
  display: flex;
  min-height: 46px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-left: 1px solid #e2e7e3;
  color: #17664f;
  font-variant-numeric: tabular-nums;
}

.map-route-metrics strong { font-size: 18px; line-height: 1; white-space: nowrap; }
.map-route-metrics small { margin-top: 3px; font-size: 8px; font-weight: 800; }

.map-journey-progress { margin-top: 9px; }
.map-journey-progress-meta { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 8px; color: #6f7d75; font-size: 9px; font-weight: 800; }
.map-journey-progress-meta strong { color: #17664f; font-variant-numeric: tabular-nums; }
.map-journey-progress-track { height: 5px; overflow: hidden; margin-top: 5px; border-radius: 3px; background: #e2e8e4; }
.map-journey-progress-value { height: 100%; border-radius: inherit; background: #218263; transition: width 450ms cubic-bezier(0.2, 0.72, 0.32, 1); }

.map-route-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 10px;
}

.map-active-journey-action {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-column: 1 / -1;
  grid-template-columns: 18px minmax(0, 1fr) 12px;
  align-items: center;
  gap: 8px;
  border: 1px solid #17664f;
  background: #17664f;
  text-align: left;
}

.map-active-journey-action span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.map-active-journey-action > i:last-child {
  font-size: 8px;
  text-align: right;
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

@media (prefers-reduced-motion: reduce) {
  .map-route-card { animation: none; }
  .map-route-card.is-journey-moving .map-journey-live-status > span i { animation: none; }
  .map-journey-progress-value { transition: none; }
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

.map-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(21, 33, 27, 0.42);
  padding: 0;
}

.map-journey-media-backdrop {
  position: fixed;
  inset: 0;
  z-index: 72;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(21, 33, 27, 0.42);
}

.map-bottom-drawer {
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
.map-pin-visibility-toolbar { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e2e7e3; }
.map-pin-visibility-toolbar span { display: block; color: #718078; font-size: 9px; font-weight: 800; }
.map-pin-visibility-toolbar strong { display: block; margin-top: 2px; color: #273a31; font-size: 10px; }
.map-pin-visibility-toolbar > div:last-child { display: flex; gap: 5px; }
.map-pin-visibility-toolbar button { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #d9e1dc; border-radius: 7px; background: #f7f9f7; color: #456154; }
.map-place-category-filter { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px -4px 0; padding: 0 4px 4px; }
.map-place-category-control { display: inline-flex; min-height: 34px; flex: 0 0 auto; overflow: hidden; border: 1px solid #dfe5e1; border-radius: 7px; background: #f4f6f4; }
.map-place-category-control.is-active { border-color: var(--map-place-tone); background: color-mix(in srgb, var(--map-place-tone) 10%, white); box-shadow: inset 0 0 0 1px var(--map-place-tone); }
.map-place-category-control.is-hidden { opacity: 0.66; }
.map-place-category-control.is-mixed { border-style: dashed; }
.map-place-category-select { display: inline-flex; min-height: 32px; min-width: 0; align-items: center; gap: 5px; padding: 0 7px; color: #56635c; font-size: 9px; font-weight: 800; }
.map-place-category-select > i { color: var(--map-place-tone); }
.map-place-category-select small { min-width: 26px; border-radius: 5px; background: #e6ebe7; padding: 2px 4px; color: #6f7b74; font-size: 8px; text-align: center; }
.map-place-category-control.is-active .map-place-category-select { color: var(--map-place-tone); }
.map-place-category-control.is-active .map-place-category-select small { background: color-mix(in srgb, var(--map-place-tone) 16%, white); color: var(--map-place-tone); }
.map-place-category-visibility { display: grid; width: 32px; min-height: 32px; flex: 0 0 auto; place-items: center; border-left: 1px solid #dce3de; color: #607068; font-size: 9px; }
.map-place-category-control.is-hidden .map-place-category-visibility { color: #929d96; }
.map-place-list { margin-top: 4px; }
.map-place-list-row { display: grid; width: 100%; min-height: 58px; grid-template-columns: minmax(0, 1fr) 34px; align-items: center; gap: 4px; border-bottom: 1px solid #e5e9e6; }
.map-place-list-main { display: grid; min-width: 0; min-height: 58px; grid-template-columns: 36px minmax(0, 1fr) auto 12px; align-items: center; gap: 9px; text-align: left; }
.map-place-list-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 7px; background: color-mix(in srgb, var(--map-place-tone) 14%, white); color: var(--map-place-tone); font-size: 11px; }
.map-place-list-row strong,
.map-place-list-row small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.map-place-list-row strong { font-size: 11px; }
.map-place-list-row small { margin-top: 3px; color: #758179; font-size: 9px; }
.map-place-list-row small.map-place-list-secondary { color: #4f6258; font-weight: 700; }
.map-place-list-row.is-pin-hidden .map-place-list-main { opacity: 0.62; }
.map-place-pin-visibility { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #dce3de; border-radius: 7px; background: #f8faf8; color: #436153; font-size: 9px; }
.map-place-list-row.is-pin-hidden .map-place-pin-visibility { color: #929d96; }
.map-place-list-source { border-radius: 5px; background: #edf1ee; padding: 3px 5px; color: #6d7972; font-size: 8px; font-weight: 800; }
.map-place-list-chevron { color: #9aa49e; font-size: 8px; }
.map-place-list-empty { display: flex; min-height: 100px; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #839088; font-size: 11px; }
.map-place-management-link { display: grid; width: 100%; min-height: 58px; grid-template-columns: 34px minmax(0, 1fr) 12px; align-items: center; gap: 10px; margin-top: 10px; border-top: 1px solid #e2e7e3; padding-top: 10px; color: #315646; text-align: left; }
.map-place-management-link > i:first-child { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 7px; background: #e2ece6; color: #17664f; }
.map-place-management-link > span { display: grid; min-width: 0; gap: 3px; }
.map-place-management-link strong,
.map-place-management-link small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.map-place-management-link strong { font-size: 11px; }
.map-place-management-link small { color: #758179; font-size: 9px; }
.map-place-management-link > i:last-child { color: #98a49d; font-size: 8px; }

button:focus-visible,
input:focus-visible {
  outline: 2px solid #0f8061;
  outline-offset: 2px;
}

@media (min-width: 720px) {
  .map-canvas-shell { padding: 12px; }
  .map-canvas { border: 1px solid #d3dcd6; border-radius: 8px; }
  .map-bottom-drawer { margin-bottom: 18px; border-radius: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
</style>
