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
import { pushReturnTarget } from '../lib/navigation-return'
import { recordMapSharedRouteRelationshipFact } from '../lib/relationship-fact-adapters'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import MapAreaFeedbackPanel from '../components/map/MapAreaFeedbackPanel.vue'
import MapRouteFamiliarityPanel from '../components/map/MapRouteFamiliarityPanel.vue'
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
  addresses,
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
})
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

const MAP_DRAWER_SECTIONS = Object.freeze([
  { key: 'trip', icon: 'fas fa-route', labelZh: '行程', labelEn: 'Trip' },
  { key: 'places', icon: 'fas fa-map-location-dot', labelZh: '地点', labelEn: 'Places' },
  { key: 'progress', icon: 'fas fa-layer-group', labelZh: '探索', labelEn: 'Progress' },
  { key: 'visual', icon: 'fas fa-map', labelZh: '图层', labelEn: 'Layers' },
])

const MAP_CANVAS_PIN_POSITIONS = Object.freeze([
  { top: '34%', left: '24%' },
  { top: '46%', left: '70%' },
  { top: '60%', left: '42%' },
  { top: '25%', left: '58%' },
])

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

const useAddressAsCurrent = (addressId) => {
  mapStore.setCurrentLocationByAddressId(addressId)
  tripActionHint.value = { tone: '', message: '' }
}

const applyManualLocation = () => {
  mapStore.setCurrentLocation({
    label: addressForm.label || t('自定义位置', 'Custom location'),
    detail: addressForm.detail,
    source: 'manual',
  })
  tripActionHint.value = { tone: '', message: '' }
}

const addAddress = () => {
  const ok = mapStore.addAddress(addressForm)
  if (!ok) return
  addressForm.label = ''
  addressForm.detail = ''
}

const setTripFromAddress = (addressId) => {
  mapStore.applyAddressToTripEndpoint(addressId, 'from')
  tripActionHint.value = { tone: '', message: '' }
}

const setTripToAddress = (addressId) => {
  mapStore.applyAddressToTripEndpoint(addressId, 'to')
  tripActionHint.value = { tone: '', message: '' }
}

const updateTripFrom = (value) => {
  tripForm.value.from = value
}

const updateTripTo = (value) => {
  tripForm.value.to = value
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
const mapCanvasPins = computed(() =>
  visibleMapAreaFeedback.value.slice(0, MAP_CANVAS_PIN_POSITIONS.length).map((item, index) => ({
    ...item,
    position: MAP_CANVAS_PIN_POSITIONS[index],
  })),
)

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
  const latestReward = tripHistory.value.find((item) => item?.status === 'arrived' && Number(item.rewardPoints) > 0)
  const sharedRouteTarget = selectedSharedRouteContact.value
  const ok = mapStore.acknowledgeTripArrival()
  if (!ok) return
  if (latestReward && sharedRouteTarget) {
    recordMapSharedRouteRelationshipFact({
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

const tickRuntime = () => {
  mapStore.tickTripRuntime(Date.now())
}

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
})
</script>

<template>
  <div class="map-immersive-root w-full h-full text-slate-100 flex flex-col">
    <div class="map-topbar pt-12 pb-3 px-4 flex items-center justify-between gap-3">
      <button @click="goHome" class="text-cyan-100 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('首页', 'Home') }}
      </button>
      <h1 class="font-bold tracking-[0.28em] text-xs uppercase">{{ t('地图', 'Map') }}</h1>
      <span class="text-[10px] px-2 py-1 rounded-full bg-white/10 border border-white/15 text-cyan-50">
        {{ tripStatusLabel }}
      </span>
    </div>

    <main class="map-canvas-shell flex-1" data-testid="map-primary-shell">
      <section class="map-canvas" data-testid="map-primary-canvas">
        <div class="map-grid-layer"></div>
        <div class="map-road map-road-main"></div>
        <div class="map-road map-road-cross"></div>
        <div class="map-road map-road-ring"></div>
        <div class="map-waterway"></div>

        <div class="map-search-card">
          <div class="map-search-row">
            <i class="fas fa-location-crosshairs text-blue-500"></i>
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {{ t('当前位置', 'Current location') }}
              </p>
              <p class="truncate text-sm font-semibold text-slate-900">{{ currentLocationText }}</p>
            </div>
          </div>
          <div class="map-search-divider"></div>
          <label class="map-search-row">
            <i class="fas fa-magnifying-glass text-slate-400"></i>
            <input
              :value="tripForm.to"
              class="map-destination-input"
              :placeholder="t('搜索地点或输入目的地', 'Search places or enter destination')"
              data-testid="map-destination-search"
              @input="updateTripTo($event.target.value)"
            />
          </label>
        </div>

        <button
          type="button"
          class="map-layer-button"
          data-testid="map-open-layers"
          @click="openMapDrawer('visual')"
        >
          <i class="fas fa-layer-group"></i>
        </button>
        <button
          type="button"
          class="map-current-location-button"
          data-testid="map-open-places"
          @click="openMapDrawer('places')"
        >
          <i class="fas fa-location-arrow"></i>
        </button>

        <div
          v-for="pin in mapCanvasPins"
          :key="pin.id"
          class="map-canvas-pin"
          :style="{ top: pin.position.top, left: pin.position.left }"
          :title="t(pin.titleZh, pin.titleEn)"
        >
          <i :class="pin.icon || 'fas fa-location-dot'"></i>
        </div>

        <div class="map-route-card" data-testid="map-primary-route-card">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {{ t('路线', 'Route') }}
          </p>
          <p class="mt-1 text-lg font-bold text-slate-950">{{ mapPrimarySheetTitle }}</p>
          <p class="mt-1 text-sm text-slate-600">{{ mapPrimarySheetDescription }}</p>
          <div class="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
            <span class="map-route-pill">{{ tripEstimate.distanceKm }} km</span>
            <span class="map-route-pill">{{ tripEstimate.minutes }} {{ t('分钟', 'min') }}</span>
            <span class="map-route-pill">¥{{ Number(tripEstimate.fare || 0).toLocaleString() }}</span>
          </div>
          <label class="mt-3 block">
            <span class="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {{ t('Shared route', 'Shared route') }}
            </span>
            <select
              v-model="sharedRouteContactId"
              class="map-destination-input w-full"
              data-testid="map-relationship-contact"
            >
              <option value="">{{ t('Optional companion', 'Optional companion') }}</option>
              <option
                v-for="contact in relationshipContactOptions"
                :key="contact.id"
                :value="contact.optionValue"
              >
                {{ contact.optionLabel }}
              </option>
            </select>
          </label>
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
          <div class="mt-4 flex gap-2">
            <button
              type="button"
              class="map-primary-action"
              :disabled="!canStartTrip"
              :class="{ 'map-primary-action-disabled': !canStartTrip }"
              data-testid="map-primary-start-trip"
              @click="startTrip"
            >
              {{ isTripArrived ? t('已到达', 'Arrived') : t('开始行程', 'Start trip') }}
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
            v-for="section in MAP_DRAWER_SECTIONS"
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
              {{ t('地图工具', 'Map tools') }}
            </p>
            <h2 class="text-lg font-bold text-slate-950">
              {{ t('二级功能', 'Secondary tools') }}
            </h2>
          </div>
          <button
            type="button"
            class="h-9 w-9 rounded-full bg-slate-100 text-slate-600"
            @click="closeMapDrawer"
          >
            <i class="fas fa-xmark"></i>
          </button>
        </div>

        <div class="map-drawer-tabs">
          <button
            v-for="section in MAP_DRAWER_SECTIONS"
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
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">{{ t('当前位置', 'Current location') }}</h2>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {{ currentLocation.source === 'saved' ? t('地址簿', 'Address book') : t('手动设置', 'Manual') }}
          </span>
        </div>
        <p class="text-sm text-gray-600 mb-3">{{ currentLocationText }}</p>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div
            v-for="item in addresses"
            :key="item.id"
            class="text-left text-sm border rounded-lg px-3 py-2 bg-white"
          >
            <div class="font-medium">{{ item.label }}</div>
            <div class="text-xs text-gray-500 truncate mb-2">{{ item.detail }}</div>
            <div class="flex flex-wrap gap-2">
              <button @click="useAddressAsCurrent(item.id)" class="text-[11px] px-2 py-1 rounded bg-gray-900 text-white">
                {{ t('设为当前位置', 'Set current') }}
              </button>
              <button @click="setTripFromAddress(item.id)" class="text-[11px] px-2 py-1 rounded border border-gray-300">
                {{ t('设为起点', 'Use as from') }}
              </button>
              <button @click="setTripToAddress(item.id)" class="text-[11px] px-2 py-1 rounded border border-gray-300">
                {{ t('设为终点', 'Use as to') }}
              </button>
            </div>
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

      <section v-show="mapDrawerFocus === 'places'" class="map-glass-panel rounded-[1.75rem] p-4">
        <h2 class="font-semibold mb-3">{{ t('新增地址 / 手动定位', 'Add address / set manually') }}</h2>
        <div class="space-y-2">
          <input
            v-model="addressForm.label"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('地点名称（如：健身房）', 'Location name (e.g. Gym)')"
          />
          <input
            v-model="addressForm.detail"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('详细地址', 'Detailed address')"
          />
          <div class="flex gap-2">
            <button @click="addAddress" class="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm">{{ t('保存到地址簿', 'Save to address book') }}</button>
            <button @click="applyManualLocation" class="px-3 py-2 rounded-lg bg-gray-800 text-white text-sm">{{ t('设为当前位置', 'Set as current') }}</button>
          </div>
        </div>
      </section>

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

      <section v-show="mapDrawerFocus === 'places'" class="map-glass-panel rounded-[1.75rem] p-4">
        <h2 class="font-semibold mb-2">{{ t('地址簿管理', 'Address book') }}</h2>
        <div class="space-y-2">
          <div v-for="item in addresses" :key="`row-${item.id}`" class="flex items-center justify-between border rounded-lg p-2">
            <div class="min-w-0">
              <p class="text-sm font-medium">{{ item.label }}</p>
              <p class="text-xs text-gray-500 truncate">{{ item.detail }}</p>
            </div>
            <button @click="mapStore.removeAddress(item.id)" class="text-xs text-red-500 px-2 py-1">{{ t('删除', 'Delete') }}</button>
          </div>
        </div>
      </section>
        </div>
      </aside>
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
  top: 148px;
}

.map-current-location-button {
  top: 202px;
}

.map-canvas-pin {
  position: absolute;
  z-index: 3;
  display: grid;
  height: 34px;
  width: 34px;
  place-items: center;
  border: 3px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px 999px 999px 6px;
  background: #2563eb;
  color: #fff;
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.28);
  transform: rotate(-45deg);
}

.map-canvas-pin i {
  transform: rotate(45deg);
  font-size: 0.75rem;
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
  padding: 18px;
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
</style>
