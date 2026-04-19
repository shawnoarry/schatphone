<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useMapStore } from '../stores/map'
import { useGalleryStore } from '../stores/gallery'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'
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
  const ok = mapStore.acknowledgeTripArrival()
  if (!ok) return
  tripActionHint.value = {
    tone: 'success',
    message: t('行程已完成。', 'Trip marked as completed.'),
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
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> 首页
      </button>
      <h1 class="font-bold">{{ t('地图', 'Map') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 bg-gray-50">
      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">{{ t('地图视觉', 'Map visual') }}</h2>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {{ resolvedMapVisualMode === 'gallery' ? t('素材库', 'Gallery') : t('默认', 'Default') }}
          </span>
        </div>

        <div v-if="showMapVisualOnboarding" class="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 space-y-2">
          <p>
            {{ t('首次可选择地图视觉模式：默认样式或素材库背景。未配置素材时会自动回退为默认。', 'Choose map visual mode on first use: default style or gallery background. Missing assets auto-fallback to default.') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button @click="useDefaultMapVisual" class="px-2 py-1 rounded bg-gray-900 text-white">
              {{ t('保持默认', 'Keep default') }}
            </button>
            <button @click="useGalleryMapVisual" class="px-2 py-1 rounded border border-gray-300">
              {{ t('使用素材库', 'Use gallery') }}
            </button>
          </div>
        </div>

        <div class="space-y-2 text-xs">
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
            class="w-full border rounded-lg px-3 py-2 text-sm"
            :value="mapVisualSettings.assetId"
            @change="onMapVisualAssetChange"
          >
            <option value="">{{ t('选择地图背景素材', 'Choose map background asset') }}</option>
            <option v-for="asset in mapVisualAssetOptions" :key="asset.id" :value="asset.id">
              {{ asset.name }}
            </option>
          </select>
          <p v-if="mapVisualAssetOptions.length === 0" class="text-xs text-gray-500">
            {{ t('素材库暂无可用背景图，已自动回退默认模式。', 'No gallery asset available for map background; fallback stays on default mode.') }}
          </p>

          <div
            v-else
            class="rounded-2xl border border-violet-100 bg-violet-50/40 p-3 space-y-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs font-semibold text-violet-800">{{ mapVisualSelectionTitle }}</p>
                <p
                  v-if="mapVisualSelectedAsset"
                  class="mt-1 text-[11px] text-violet-700 truncate"
                >
                  {{ mapVisualSelectedAsset.name }}
                </p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{ mapVisualSelectionDescription }}
                </p>
                <p class="mt-1 text-[11px] text-violet-700">
                  {{ mapVisualBindingStatusText }}
                </p>
              </div>
              <button
                type="button"
                @click="openGallery"
                class="shrink-0 rounded-xl border border-violet-200 bg-white px-2.5 py-1.5 text-[11px] text-violet-700"
              >
                {{ t('打开相册', 'Open Gallery') }}
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                @click="restoreDefaultMapVisual"
                class="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-600"
              >
                {{ t('恢复默认视觉', 'Use default visual') }}
              </button>
              <button
                v-if="mapVisualSelectedAsset"
                type="button"
                @click="clearMapVisualBinding"
                class="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700"
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
                  class="w-16 h-16 rounded-xl overflow-hidden border bg-white"
                  :class="
                    mapVisualSelectedAsset?.id === asset.id
                      ? 'border-violet-400 ring-2 ring-violet-100'
                      : 'border-gray-200'
                  "
                >
                  <img
                    v-if="mapVisualQuickPreviewMap[asset.id]"
                    :src="mapVisualQuickPreviewMap[asset.id]"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-[9px] text-gray-400 bg-gray-50"
                  >
                    {{ t('加载中', 'Loading') }}
                  </div>
                </div>
                <p class="mt-1 text-[10px] text-gray-500 line-clamp-2 text-left">{{ asset.name }}</p>
              </button>
              <div
                v-if="mapVisualQuickOverflowCount > 0"
                class="shrink-0 rounded-xl border border-dashed border-violet-200 px-3 py-2 text-[11px] text-violet-700"
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
          <button @click="openMapVisualUploadPicker" class="px-2 py-1 rounded border border-gray-300 text-xs">
            {{ t('上传地图背景', 'Upload map visual') }}
          </button>
          <button
            v-if="mapOneOffVisualUrl"
            @click="clearMapOneOffVisual"
            class="px-2 py-1 rounded border border-amber-300 text-amber-700 bg-amber-50 text-xs"
          >
            {{ t('清除本次背景', 'Clear one-off visual') }}
          </button>
        </div>
        <p class="mt-1 text-[11px] text-gray-500">
          {{
            t(
              '支持“先入库再应用”与“单次应用不入库”双路径；单次背景只在当前会话可见。',
              'Supports both import-then-apply and one-off apply without import; one-off visual is session-only.',
            )
          }}
        </p>

        <label class="mt-3 inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="mapVisualSettings.aiVisualEnabled === true"
            @change="onMapAiVisualToggle"
          />
          {{ t('启用 AI 地图视觉', 'Enable AI map visual') }}
        </label>

        <label class="mt-2 inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            class="w-4 h-4"
            :checked="mapVisualSettings.providerVisualEnabled === true"
            @change="onMapProviderVisualToggle"
          />
          {{ t('启用供应商视觉生成（可选）', 'Enable provider visual generation (optional)') }}
        </label>

        <div class="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
          <p class="font-medium text-gray-700">
            {{ t('自动化策略状态', 'Automation policy') }}: {{ mapAiPolicySummary }}
          </p>
          <p class="mt-1">{{ mapAiPolicyHint }}</p>
          <p class="mt-1">
            {{ t('供应商状态', 'Provider status') }}: {{ mapProviderStatusLabel }}
          </p>
          <p
            v-if="mapAutomationRuntime.lastProviderSummary"
            class="mt-1 text-[11px] text-gray-500"
          >
            {{ mapAutomationRuntime.lastProviderSummary }}
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              @click="triggerMapAiVisualRefresh"
              class="px-2 py-1 rounded border"
              :class="mapAiVisualAutomationPolicy.invokeEnabled ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-500 bg-gray-100'"
              :disabled="mapAiVisualRefreshing"
            >
              {{ mapAiVisualRefreshing ? t('刷新中…', 'Refreshing...') : t('触发 AI 刷新', 'Trigger AI refresh') }}
            </button>
            <button @click="openAutomationSettings" class="px-2 py-1 rounded border border-gray-300">
              {{ t('前往自动化设置', 'Open automation settings') }}
            </button>
          </div>
          <p v-if="mapAutomationRuntime.lastExecuteAt > 0" class="mt-1 text-[11px] text-gray-500">
            {{ t('上次执行', 'Last executed') }}: {{ formatTime(mapAutomationRuntime.lastExecuteAt) }}
          </p>
        </div>

        <div class="mt-3 rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
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

        <p v-if="mapVisualLoading" class="mt-2 text-xs text-gray-500">
          {{ t('正在加载素材预览…', 'Loading asset preview...') }}
        </p>
        <p
          v-if="mapVisualHint.message"
          class="mt-2 text-xs"
          :class="mapVisualHint.tone === 'success' ? 'text-emerald-700' : mapVisualHint.tone === 'warn' ? 'text-amber-700' : 'text-gray-600'"
        >
          {{ mapVisualHint.message }}
        </p>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
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

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
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

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
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

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <h2 class="font-semibold mb-2">{{ t('行程记录', 'Trip history') }}</h2>
        <p v-if="tripHistory.length === 0" class="text-xs text-gray-500">
          {{ t('暂无记录。', 'No records yet.') }}
        </p>
        <div v-else class="space-y-2">
          <div
            v-for="item in tripHistory"
            :key="item.id"
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
          </div>
        </div>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
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
