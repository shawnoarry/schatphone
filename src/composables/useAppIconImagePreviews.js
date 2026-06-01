import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import { resolveAppIconMeta } from '../lib/app-icon-presentation'

export const useAppIconImagePreviews = ({
  galleryStore,
  appIconOverrides,
  locale,
  scopeId = 'app-icon-previews',
} = {}) => {
  const previewUrls = reactive({})
  let resolveVersion = 0

  const overrideSignature = computed(() =>
    JSON.stringify(appIconOverrides?.value || {}),
  )

  const refreshPreviews = async () => {
    const currentVersion = resolveVersion + 1
    resolveVersion = currentVersion
    const overrides = appIconOverrides?.value || {}
    const activeAppIds = new Set()

    await Promise.all(
      Object.keys(overrides).map(async (appId) => {
        const meta = resolveAppIconMeta(appId, overrides, locale?.value || 'en-US')
        if (!meta.hasImageIcon) return

        activeAppIds.add(appId)
        const asset = galleryStore?.findAssetById?.(meta.galleryAssetId)
        if (!asset) {
          previewUrls[appId] = ''
          return
        }

        const url = await galleryStore.getAssetPreviewUrl(meta.galleryAssetId, { scopeId })
        if (currentVersion !== resolveVersion) return
        previewUrls[appId] = typeof url === 'string' ? url : ''
      }),
    )

    if (currentVersion !== resolveVersion) return
    Object.keys(previewUrls).forEach((appId) => {
      if (!activeAppIds.has(appId)) {
        delete previewUrls[appId]
      }
    })
  }

  watch(
    () => [overrideSignature.value, galleryStore?.hasFinishedStorageHydration],
    refreshPreviews,
    { immediate: true },
  )

  onBeforeUnmount(() => {
    galleryStore?.releaseAssetPreviewScope?.(scopeId)
  })

  const appIconImageUrl = (appId) => {
    const normalizedId = typeof appId === 'string' ? appId.trim() : ''
    return normalizedId ? previewUrls[normalizedId] || '' : ''
  }

  return {
    appIconImageUrl,
    refreshPreviews,
  }
}
