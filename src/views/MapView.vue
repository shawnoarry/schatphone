<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useMapStore } from '../stores/map'
import { useGalleryStore } from '../stores/gallery'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'
import { buildWorldBookRouteQuery } from '../lib/worldbook-navigation'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import {
  MEDIA_KIND,
  MEDIA_SIZE_SCENE,
  formatBytesCompact,
  resolveMediaSizeLimitBytes,
  validateMediaFileBySize,
} from '../lib/media-policy'

const router = useRouter()
const mapStore = useMapStore()
const galleryStore = useGalleryStore()
const systemStore = useSystemStore()
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
let runtimeTimer = null

const goHome = () => {
  router.push('/home')
}

const openWorldBook = (options = {}) => {
  router.push({
    path: '/worldbook',
    query: buildWorldBookRouteQuery({
      source: 'map',
      pointIds: options.pointIds,
      keyword: options.keyword,
      tag: options.tag,
      usage: options.usage,
    }),
  })
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
  const ok = mapStore.acknowledgeTripArrival()
  if (!ok) return
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

    <div class="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
      <section class="map-visual-panel rounded-[2rem] p-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="text-[10px] uppercase tracking-[0.24em] text-cyan-100/70">{{ t('实时视野', 'Live view') }}</p>
            <h2 class="text-xl font-semibold">{{ t('地图视觉', 'Map visual') }}</h2>
          </div>
          <span class="text-[11px] px-2 py-1 rounded-full bg-white/12 border border-white/15 text-cyan-50">
            {{ resolvedMapVisualMode === 'gallery' ? t('素材库', 'Gallery') : t('默认', 'Default') }}
          </span>
        </div>

        <div class="map-preview-stage mb-4">
          <img
            v-if="resolvedMapVisualMode === 'gallery' && mapVisualPreviewUrl"
            :src="mapVisualPreviewUrl"
            class="w-full h-full object-cover"
            :alt="t('地图视觉预览', 'Map visual preview')"
          />
          <img
            v-else-if="mapOneOffVisualUrl"
            :src="mapOneOffVisualUrl"
            class="w-full h-full object-cover"
            :alt="mapOneOffVisualName || t('单次地图背景预览', 'One-off map visual preview')"
          />
          <img
            v-else-if="mapProviderGeneratedImageUrl"
            :src="mapProviderGeneratedImageUrl"
            class="w-full h-full object-cover"
            :alt="t('供应商视觉预览', 'Provider visual preview')"
          />
          <div v-else class="map-default-canvas w-full h-full">
            <div class="map-grid-lines"></div>
            <div class="map-route-line"></div>
            <div class="map-pin map-pin-a"></div>
            <div class="map-pin map-pin-b"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent"></div>
          <div class="absolute left-4 right-4 bottom-4">
            <p class="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">{{ t('当前位置', 'Current location') }}</p>
            <p class="mt-1 text-lg font-semibold line-clamp-2">{{ currentLocationText }}</p>
            <p class="mt-1 text-xs text-cyan-50/75">{{ mapVisualBindingStatusText }}</p>
          </div>
        </div>

        <div v-if="showMapVisualOnboarding" class="mb-3 rounded-2xl border border-amber-200/40 bg-amber-300/15 p-3 text-xs text-amber-50 space-y-2">
          <p>
            {{ t('首次可选择地图视觉模式：默认样式或素材库背景。未配置素材时会自动回退为默认。', 'Choose map visual mode on first use: default style or gallery background. Missing assets auto-fallback to default.') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button @click="useDefaultMapVisual" class="px-2 py-1 rounded bg-white text-slate-950">
              {{ t('保持默认', 'Keep default') }}
            </button>
            <button @click="useGalleryMapVisual" class="px-2 py-1 rounded border border-white/25">
              {{ t('使用素材库', 'Use gallery') }}
            </button>
          </div>
        </div>

        <div class="space-y-2 text-xs text-cyan-50/80">
          <label class="inline-flex items-center gap-2 mr-4">
            <input
              type="radio"
              name="mapVisualMode"
              value="default"
              :checked="mapVisualSettings.mode === 'default'"
              @change="onMapVisualModeChange"
            />
            {{ t('默认视觉', 'Default visual') }}
          </label>
          <label class="inline-flex items-center gap-2">
            <input
              type="radio"
              name="mapVisualMode"
              value="gallery"
              :checked="mapVisualSettings.mode === 'gallery'"
              @change="onMapVisualModeChange"
            />
            {{ t('素材库视觉', 'Gallery visual') }}
          </label>
        </div>

        <div v-if="mapVisualSettings.mode === 'gallery'" class="mt-3 space-y-2">
          <select
            class="w-full rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none"
            :value="mapVisualSettings.assetId"
            @change="onMapVisualAssetChange"
          >
            <option value="">{{ t('选择地图背景素材', 'Choose map background asset') }}</option>
            <option v-for="asset in mapVisualAssetOptions" :key="asset.id" :value="asset.id">
              {{ asset.name }}
            </option>
          </select>
          <p v-if="mapVisualAssetOptions.length === 0" class="text-xs text-cyan-50/60">
            {{ t('素材库暂无可用背景图，已自动回退默认模式。', 'No gallery asset available for map background; fallback stays on default mode.') }}
          </p>

          <div
            v-else
            class="rounded-3xl border border-white/12 bg-white/10 p-3 space-y-3 backdrop-blur"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs font-semibold text-cyan-50">{{ mapVisualSelectionTitle }}</p>
                <p
                  v-if="mapVisualSelectedAsset"
                  class="mt-1 text-[11px] text-cyan-100 truncate"
                >
                  {{ mapVisualSelectedAsset.name }}
                </p>
                <p class="mt-1 text-[11px] text-cyan-50/60">
                  {{ mapVisualSelectionDescription }}
                </p>
                <p class="mt-1 text-[11px] text-cyan-100">
                  {{ mapVisualBindingStatusText }}
                </p>
              </div>
              <button
                type="button"
                @click="openGallery"
                class="shrink-0 rounded-xl border border-white/15 bg-white/12 px-2.5 py-1.5 text-[11px] text-cyan-50"
              >
                {{ t('打开相册', 'Open Gallery') }}
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                @click="restoreDefaultMapVisual"
                class="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] text-cyan-50"
              >
                {{ t('恢复默认视觉', 'Use default visual') }}
              </button>
              <button
                v-if="mapVisualSelectedAsset"
                type="button"
                @click="clearMapVisualBinding"
                class="rounded-xl border border-amber-200/40 bg-amber-300/15 px-2.5 py-1.5 text-[11px] text-amber-50"
              >
                {{ t('清除背景绑定', 'Clear bound asset') }}
              </button>
            </div>

            <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                v-for="asset in mapVisualQuickAssetOptions"
                :key="`map-visual-chip-${asset.id}`"
                type="button"
                class="shrink-0 w-16"
                @click="applyQuickMapVisualAsset(asset.id)"
              >
                <div
                  class="relative w-16 h-16 rounded-2xl overflow-hidden border bg-white/10"
                  :class="
                    mapVisualSelectedAsset?.id === asset.id
                      ? 'border-cyan-200 ring-2 ring-cyan-200/25'
                      : 'border-white/15'
                  "
                >
                  <img
                    v-if="mapVisualQuickPreviewMap[asset.id]"
                    :src="mapVisualQuickPreviewMap[asset.id]"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-[9px] text-cyan-50/50 bg-white/10"
                  >
                    {{ t('加载中', 'Loading') }}
                  </div>
                  <AssetStatusBadge
                    v-if="mapVisualSelectedAsset?.id === asset.id"
                    label-zh="使用中"
                    label-en="Live"
                    tone="sky-solid"
                    :truncate="false"
                    class="absolute left-1 top-1 font-semibold"
                  />
                </div>
                <p class="mt-1 text-[10px] text-cyan-50/65 line-clamp-2 text-left">{{ asset.name }}</p>
              </button>
              <div
                v-if="mapVisualQuickOverflowCount > 0"
                class="shrink-0 rounded-xl border border-dashed border-white/20 px-3 py-2 text-[11px] text-cyan-50"
              >
                +{{ mapVisualQuickOverflowCount }}
              </div>
            </div>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref="mapVisualFileInputRef"
            type="file"
            class="hidden"
            accept="image/*"
            @change="onMapVisualFilePicked"
          />
          <button @click="openMapVisualUploadPicker" class="px-3 py-1.5 rounded-full border border-white/15 bg-white/10 text-xs text-cyan-50">
            {{ t('上传地图背景', 'Upload map visual') }}
          </button>
          <button
            v-if="mapOneOffVisualUrl"
            @click="clearMapOneOffVisual"
            class="px-3 py-1.5 rounded-full border border-amber-200/40 text-amber-50 bg-amber-300/15 text-xs"
          >
            {{ t('清除本次背景', 'Clear one-off visual') }}
          </button>
        </div>
        <p class="mt-1 text-[11px] text-cyan-50/55">
          {{
            t(
              '支持“先入库再应用”与“单次应用不入库”双路径；单次背景只在当前会话可见。',
              'Supports both import-then-apply and one-off apply without import; one-off visual is session-only.',
            )
          }}
        </p>

        <label class="mt-3 inline-flex items-center gap-2 text-xs text-cyan-50/75">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="mapVisualSettings.aiVisualEnabled === true"
            @change="onMapAiVisualToggle"
          />
          {{ t('启用 AI 地图视觉', 'Enable AI map visual') }}
        </label>

        <label class="mt-2 inline-flex items-center gap-2 text-xs text-cyan-50/75">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="mapVisualSettings.providerVisualEnabled === true"
            @change="onMapProviderVisualToggle"
          />
          {{ t('启用供应商视觉生成（可选）', 'Enable provider visual generation (optional)') }}
        </label>

        <div class="mt-3 rounded-2xl border border-white/12 bg-slate-950/25 p-3 text-xs text-cyan-50/70">
          <p class="font-medium text-cyan-50">
            {{ t('自动化策略状态', 'Automation policy') }}: {{ mapAiPolicySummary }}
          </p>
          <p class="mt-1">{{ mapAiPolicyHint }}</p>
          <p class="mt-1">
            {{ t('供应商状态', 'Provider status') }}: {{ mapProviderStatusLabel }}
          </p>
          <p
            v-if="mapAutomationRuntime.lastProviderSummary"
            class="mt-1 text-[11px] text-cyan-50/55"
          >
            {{ mapAutomationRuntime.lastProviderSummary }}
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              @click="triggerMapAiVisualRefresh"
              class="px-2 py-1 rounded border"
              :class="mapAiVisualAutomationPolicy.invokeEnabled ? 'border-cyan-200/60 text-cyan-50 bg-cyan-300/15' : 'border-white/15 text-cyan-50/50 bg-white/5'"
              :disabled="mapAiVisualRefreshing"
            >
              {{ mapAiVisualRefreshing ? t('刷新中…', 'Refreshing...') : t('触发 AI 刷新', 'Trigger AI refresh') }}
            </button>
            <button @click="openAutomationSettings" class="px-2 py-1 rounded border border-white/15">
              {{ t('前往自动化设置', 'Open automation settings') }}
            </button>
          </div>
          <p v-if="mapAutomationRuntime.lastExecuteAt > 0" class="mt-1 text-[11px] text-cyan-50/55">
            {{ t('上次执行', 'Last executed') }}: {{ formatTime(mapAutomationRuntime.lastExecuteAt) }}
          </p>
        </div>

        <div class="hidden">
          <div v-if="resolvedMapVisualMode === 'gallery' && mapVisualPreviewUrl" class="aspect-[16/8] bg-black">
            <img
              :src="mapVisualPreviewUrl"
              class="w-full h-full object-cover"
              :alt="t('地图视觉预览', 'Map visual preview')"
            />
          </div>
          <div v-else-if="mapOneOffVisualUrl" class="aspect-[16/8] bg-black">
            <img
              :src="mapOneOffVisualUrl"
              class="w-full h-full object-cover"
              :alt="mapOneOffVisualName || t('单次地图背景预览', 'One-off map visual preview')"
            />
          </div>
          <div v-else-if="mapProviderGeneratedImageUrl" class="aspect-[16/8] bg-black">
            <img
              :src="mapProviderGeneratedImageUrl"
              class="w-full h-full object-cover"
              :alt="t('供应商视觉预览', 'Provider visual preview')"
            />
          </div>
          <div v-else class="aspect-[16/8] bg-gradient-to-br from-slate-200 via-slate-100 to-blue-100 flex items-center justify-center">
            <div class="text-center text-gray-600">
              <i class="fas fa-map-location-dot text-3xl mb-2"></i>
              <p class="text-xs">{{ t('默认地图视觉（可继续使用，不影响功能）', 'Default map visual (fully usable)') }}</p>
            </div>
          </div>
        </div>

        <p v-if="mapVisualLoading" class="mt-2 text-xs text-cyan-50/60">
          {{ t('正在加载素材预览…', 'Loading asset preview...') }}
        </p>
        <p
          v-if="mapVisualHint.message"
          class="mt-2 text-xs"
          :class="mapVisualHint.tone === 'success' ? 'text-emerald-200' : mapVisualHint.tone === 'warn' ? 'text-amber-200' : 'text-cyan-50/70'"
        >
          {{ mapVisualHint.message }}
        </p>
      </section>

      <section class="map-glass-panel rounded-[1.75rem] p-4">
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

      <section class="map-glass-panel rounded-[1.75rem] p-4">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h2 class="font-semibold">{{ t('区域反馈', 'Area feedback') }}</h2>
          <AssetStatusBadge
            :label="t(`${mapAreaFeedback.length} 条反馈`, `${mapAreaFeedback.length} notes`)"
            icon="fas fa-location-crosshairs"
            tone="blue"
            :truncate="false"
          />
        </div>
        <p v-if="mapAreaFeedback.length === 0" class="text-xs text-gray-500">
          {{ t('解锁区域后会自动生成地点反馈。', 'Area feedback appears after areas are unlocked.') }}
        </p>
        <div v-else class="space-y-2">
          <div
            v-for="feedback in visibleMapAreaFeedback"
            :key="feedback.id"
            :data-testid="`map-area-feedback-card-${feedback.id}`"
            class="rounded-lg border border-white/30 bg-white/45 p-2"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-medium">
                  <i :class="[feedback.icon, 'mr-1 text-[11px] text-gray-500']"></i>
                  {{ t(feedback.titleZh, feedback.titleEn) }}
                </p>
                <p class="text-[11px] text-gray-500">
                  {{ t(feedback.areaLabelZh, feedback.areaLabelEn) }}
                  <span v-if="feedback.triggeredAt"> · {{ formatTime(feedback.triggeredAt) }}</span>
                </p>
              </div>
              <AssetStatusBadge
                :label="t(`${feedback.explorationPoints} 点`, `${feedback.explorationPoints} pts`)"
                icon="fas fa-star"
                :tone="feedback.tone || 'blue'"
                :truncate="false"
              />
            </div>
            <p class="mt-1 text-[11px] text-gray-600">
              {{ t(feedback.summaryZh, feedback.summaryEn) }}
            </p>
            <p v-if="feedback.routeLabel" class="mt-1 text-[11px] text-gray-500">
              {{ t(`参考路线：${feedback.routeLabel}`, `Route cue: ${feedback.routeLabel}`) }}
            </p>
            <div
              v-if="getRelatedKnowledgePoints(mapAreaFeedbackKnowledgePoints, feedback.id).length > 0"
              :data-testid="`map-area-feedback-worldbook-${feedback.id}`"
              class="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[11px] font-medium text-blue-700">
                  {{ t('Related knowledge points', 'Related knowledge points') }}
                </p>
                <button
                  type="button"
                  class="text-[11px] text-blue-600"
                  @click="openWorldBook({ pointIds: getRelatedKnowledgePoints(mapAreaFeedbackKnowledgePoints, feedback.id).map((point) => point.id) })"
                >
                  WorldBook
                </button>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="point in getRelatedKnowledgePoints(mapAreaFeedbackKnowledgePoints, feedback.id)"
                  :key="point.id"
                  type="button"
                  class="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-700"
                  :data-testid="`map-area-feedback-worldbook-chip-${feedback.id}-${point.id}`"
                  @click="openWorldBook({ pointIds: [point.id] })"
                >
                  {{ point.title }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="map-glass-panel rounded-[1.75rem] p-4">
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

      <section class="map-glass-panel rounded-[1.75rem] p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">{{ t('出行模拟', 'Trip simulation') }}</h2>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{{ tripStatusLabel }}</span>
        </div>
        <div class="space-y-2">
          <input
            v-model="tripForm.from"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('起点', 'From')"
          />
          <input
            v-model="tripForm.to"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('终点', 'To')"
          />
        </div>
        <div class="mt-3 text-sm text-gray-700 space-y-1">
          <p>{{ t('距离：约', 'Distance:') }} {{ tripEstimate.distanceKm }} km</p>
          <p>{{ t('时长：约', 'Duration:') }} {{ tripEstimate.minutes }} {{ t('分钟', 'min') }}</p>
          <p>{{ t('费用：约', 'Fare:') }} ₩ {{ tripEstimate.fare.toLocaleString() }}</p>
        </div>

        <div v-if="isTripTraveling || isTripArrived" class="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
          <p class="text-sm text-gray-700">
            {{ (tripRuntime.fromLabel || t('起点', 'From')) + ' → ' + (tripRuntime.toLabel || t('终点', 'To')) }}
          </p>
          <div class="h-2 rounded bg-gray-200 overflow-hidden">
            <div class="h-full bg-emerald-500 transition-all duration-500" :style="{ width: `${tripProgressPercent}%` }"></div>
          </div>
          <p class="text-xs text-gray-600">
            {{ t('进度', 'Progress') }} {{ tripProgressPercent }}% ·
            {{ t('剩余', 'Remaining') }} {{ formatSeconds(tripRuntime.remainingSeconds) }}
          </p>
          <p class="text-xs text-gray-600">
            {{ t('预计到达', 'ETA') }} {{ formatTime(tripRuntime.etaAt) }}
          </p>
          <p class="text-xs text-gray-600">
            {{ t('后台到达提醒', 'Background arrival push') }} {{ tripArrivalPushStatusLabel }}
          </p>
          <p class="text-[11px] text-gray-500">
            {{ tripArrivalPushHint }}
          </p>
          <p v-if="isTripArrived" class="text-xs text-emerald-700">
            {{ t('已在系统时间到达目的地。', 'Destination reached according to system time.') }}
          </p>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            @click="startTrip"
            :disabled="!canStartTrip"
            class="px-3 py-2 rounded-lg text-sm"
            :class="canStartTrip ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'"
          >
            {{ t('开始行程', 'Start trip') }}
          </button>
          <button
            v-if="isTripTraveling"
            @click="cancelTrip"
            class="px-3 py-2 rounded-lg bg-red-500 text-white text-sm"
          >
            {{ t('取消行程', 'Cancel trip') }}
          </button>
          <button
            v-if="isTripArrived"
            @click="acknowledgeArrival"
            class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm"
          >
            {{ t('确认完成', 'Acknowledge') }}
          </button>
        </div>

        <p
          v-if="tripActionHint.message"
          class="mt-2 text-xs"
          :class="tripActionHint.tone === 'success' ? 'text-emerald-700' : tripActionHint.tone === 'warn' ? 'text-amber-700' : 'text-gray-600'"
        >
          {{ tripActionHint.message }}
        </p>
      </section>

      <section class="map-glass-panel rounded-[1.75rem] p-4">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h2 class="font-semibold">{{ t('路线熟悉度', 'Route familiarity') }}</h2>
          <AssetStatusBadge
            v-if="routeFamiliarity.length > 0"
            :label="t(`${routeFamiliarity.length} 条路线`, `${routeFamiliarity.length} routes`)"
            icon="fas fa-layer-group"
            tone="blue"
            :truncate="false"
          />
        </div>
        <p v-if="routeFamiliarity.length === 0" class="text-xs text-gray-500">
          {{ t('完成行程后会自动形成常走路线与熟悉度等级。', 'Completed trips will automatically form route familiarity tiers.') }}
        </p>
        <div v-else class="space-y-2">
          <div
            v-for="route in visibleRouteFamiliarity"
            :key="route.key"
            :data-testid="`map-route-card-${route.key}`"
            class="rounded-lg border border-white/30 bg-white/45 p-2"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="min-w-0 text-sm font-medium">
                {{ (route.fromLabel || route.from) + ' -> ' + (route.toLabel || route.to) }}
              </p>
              <AssetStatusBadge
                :label-zh="route.tierLabelZh"
                :label-en="route.tierLabelEn"
                icon="fas fa-location-arrow"
                :tone="route.tone || 'blue'"
                :truncate="false"
              />
            </div>
            <div class="mt-1 flex flex-wrap gap-1.5 text-[11px] text-gray-600">
              <span>{{ t(`${route.completedCount} 次完成`, `${route.completedCount} trips`) }}</span>
              <span>{{ t(`${route.points} 点探索`, `${route.points} pts`) }}</span>
              <span>{{ t(`平均 ${route.averageDistanceKm} km`, `Avg ${route.averageDistanceKm} km`) }}</span>
            </div>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ getRouteFamiliarityNextHint(route) }}
            </p>
            <div
              v-if="getRelatedKnowledgePoints(routeFamiliarityKnowledgePoints, route.key).length > 0"
              :data-testid="`map-route-worldbook-${route.key}`"
              class="mt-3 rounded-lg border border-blue-100 bg-white p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[11px] font-medium text-blue-700">
                  {{ t('Related knowledge points', 'Related knowledge points') }}
                </p>
                <button
                  type="button"
                  class="text-[11px] text-blue-600"
                  @click="openWorldBook({ pointIds: getRelatedKnowledgePoints(routeFamiliarityKnowledgePoints, route.key).map((point) => point.id) })"
                >
                  WorldBook
                </button>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="point in getRelatedKnowledgePoints(routeFamiliarityKnowledgePoints, route.key)"
                  :key="point.id"
                  type="button"
                  class="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700"
                  :data-testid="`map-route-worldbook-chip-${route.key}-${point.id}`"
                  @click="openWorldBook({ pointIds: [point.id] })"
                >
                  {{ point.title }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="map-glass-panel rounded-[1.75rem] p-4">
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

      <section class="map-glass-panel rounded-[1.75rem] p-4">
        <div class="mb-2 flex items-center justify-between gap-2">
          <h2 class="font-semibold">{{ t('行程记录', 'Trip history') }}</h2>
          <AssetStatusBadge
            :label="t(`探索 ${mapRewardScore} 点`, `${mapRewardScore} pts`)"
            icon="fas fa-route"
            tone="emerald"
            :truncate="false"
          />
        </div>
        <p v-if="tripHistory.length === 0" class="text-xs text-gray-500">
          {{ t('暂无记录。', 'No records yet.') }}
        </p>
        <div v-else class="space-y-2">
          <div
            v-for="item in visibleTripHistory"
            :key="item.id"
            :data-testid="`map-trip-history-card-${item.id}`"
            class="border rounded-lg p-2"
          >
            <p class="text-xs text-gray-600">
              {{ item.status === 'arrived' ? t('已到达', 'Arrived') : t('已取消', 'Cancelled') }} · {{ formatTime(item.endedAt) }}
            </p>
            <p class="text-sm font-medium">
              {{ (item.fromLabel || t('起点', 'From')) + ' → ' + (item.toLabel || t('终点', 'To')) }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t('时长', 'Duration') }} {{ formatSeconds(item.durationSeconds) }} ·
              {{ t('费用', 'Fare') }} ₩ {{ Number(item.fare || 0).toLocaleString() }}
            </p>
            <div
              v-if="item.status === 'arrived' && Number(item.rewardPoints) > 0"
              class="mt-2 rounded-lg border border-emerald-200/50 bg-emerald-50/80 px-2.5 py-2 text-[11px] text-emerald-700"
            >
              <div class="mb-1 flex flex-wrap items-center gap-1.5">
                <AssetStatusBadge
                  :label="t(`+${Number(item.rewardPoints) || 0} 探索`, `+${Number(item.rewardPoints) || 0} exploration`)"
                  icon="fas fa-star"
                  tone="emerald"
                  :truncate="false"
                />
                <AssetStatusBadge
                  v-if="item.eventTitleZh || item.eventTitleEn"
                  :label="t(item.eventTitleZh || item.eventTitleEn, item.eventTitleEn || item.eventTitleZh)"
                  icon="fas fa-location-dot"
                  tone="amber"
                  :truncate="false"
                />
              </div>
              <p v-if="item.eventSummaryZh || item.eventSummaryEn">
                {{ t(item.eventSummaryZh || item.eventSummaryEn, item.eventSummaryEn || item.eventSummaryZh) }}
              </p>
            </div>
            <div
              v-if="getRelatedKnowledgePoints(tripHistoryKnowledgePoints, item.id).length > 0"
              :data-testid="`map-trip-history-worldbook-${item.id}`"
              class="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[11px] font-medium text-blue-700">
                  {{ t('Related knowledge points', 'Related knowledge points') }}
                </p>
                <button
                  type="button"
                  class="text-[11px] text-blue-600"
                  @click="openWorldBook({ pointIds: getRelatedKnowledgePoints(tripHistoryKnowledgePoints, item.id).map((point) => point.id) })"
                >
                  WorldBook
                </button>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="point in getRelatedKnowledgePoints(tripHistoryKnowledgePoints, item.id)"
                  :key="point.id"
                  type="button"
                  class="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-700"
                  :data-testid="`map-trip-history-worldbook-chip-${item.id}-${point.id}`"
                  @click="openWorldBook({ pointIds: [point.id] })"
                >
                  {{ point.title }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="map-glass-panel rounded-[1.75rem] p-4">
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

.map-visual-panel,
.map-glass-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.06));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(24px);
}

.map-visual-panel::before,
.map-glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.12), transparent 42%);
}

.map-preview-stage {
  position: relative;
  height: 310px;
  overflow: hidden;
  border-radius: 1.75rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #07111f;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.map-default-canvas {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 30% 18%, rgba(125, 211, 252, 0.35), transparent 22%),
    radial-gradient(circle at 78% 66%, rgba(20, 184, 166, 0.32), transparent 26%),
    linear-gradient(145deg, #10243a, #102033 46%, #0b1525);
}

.map-grid-lines {
  position: absolute;
  inset: -20%;
  opacity: 0.38;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.14) 1px, transparent 1px);
  background-size: 34px 34px;
  transform: rotate(-13deg) scale(1.15);
}

.map-route-line {
  position: absolute;
  left: 18%;
  top: 58%;
  width: 66%;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #67e8f9, #fef3c7, #2dd4bf);
  box-shadow: 0 0 24px rgba(103, 232, 249, 0.55);
  transform: rotate(-24deg);
}

.map-pin {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.82);
  background: #22d3ee;
  box-shadow: 0 0 0 8px rgba(34, 211, 238, 0.16), 0 0 24px rgba(34, 211, 238, 0.55);
}

.map-pin-a {
  left: 20%;
  top: 56%;
}

.map-pin-b {
  right: 18%;
  top: 33%;
  background: #fbbf24;
  box-shadow: 0 0 0 8px rgba(251, 191, 36, 0.16), 0 0 24px rgba(251, 191, 36, 0.45);
}

.map-glass-panel input,
.map-glass-panel select {
  border-color: rgba(255, 255, 255, 0.14) !important;
  background: rgba(255, 255, 255, 0.1) !important;
  color: rgba(255, 255, 255, 0.9) !important;
}

.map-visual-panel option,
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
