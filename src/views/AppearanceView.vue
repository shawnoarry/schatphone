<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useGalleryStore } from '../stores/gallery'
import { useI18n } from '../composables/useI18n'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import {
  APP_ICON_ACCENT_OPTIONS,
  APP_ICON_CUSTOMIZATION_TARGET_IDS,
  APP_ICON_PRESET_OPTIONS,
  normalizeAppIconOverrides,
  resolveAppAccentLabel,
  resolveAppCustomizationTargetMeta,
  resolveAppIconPresetLabel,
} from '../lib/app-icon-presentation'

const ROOT_MENU = ''
const FONT_VAR_NAME = '--app-font-family'
const DEFAULT_FONT_STACK = '"Inter", "Noto Sans SC", sans-serif'

const FONT_PRESETS = [
  { id: 'system', label: '系统默认', value: DEFAULT_FONT_STACK },
  { id: 'inter', label: 'Inter', value: '"Inter", sans-serif' },
  { id: 'noto', label: 'Noto Sans SC', value: '"Noto Sans SC", sans-serif' },
  { id: 'pingfang', label: 'PingFang', value: '"PingFang SC", "Noto Sans SC", sans-serif' },
  { id: 'serif', label: '衬线 Serif', value: '"Noto Serif SC", serif' },
]
const LOCK_CLOCK_STYLE_OPTIONS = [
  { id: 'classic', label: '经典细体' },
  { id: 'outline', label: '描边样式' },
  { id: 'mono', label: '数字等宽' },
]

const router = useRouter()
const systemStore = useSystemStore()
const galleryStore = useGalleryStore()
const { t, systemLanguage, languageBase } = useI18n()

const { settings, availableThemes } = storeToRefs(systemStore)
const appearanceLocale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))

const activeMenu = ref(ROOT_MENU)
const saved = ref(false)

let savedTimerId = null
const customFontStackInput = ref('')
const customWallpaperUrlInput = ref('')
const selectedWallpaperAssetId = ref('')
const wallpaperQuickPreviewMap = reactive({})

const APPEARANCE_WALLPAPER_PREVIEW_SCOPE_ID = 'appearance-wallpaper-view'

const wallpaperAssets = computed(() => galleryStore.getAssetsByCategory('wallpaper'))

const fontPresetLabel = (preset) => {
  if (preset.id === 'system') return t('系统默认', 'System default')
  if (preset.id === 'serif') return t('衬线 Serif', 'Serif')
  return preset.label
}

const lockClockStyleLabel = (styleId) => {
  if (styleId === 'classic') return t('经典细体', 'Classic Thin')
  if (styleId === 'outline') return t('描边样式', 'Outline')
  if (styleId === 'mono') return t('数字等宽', 'Monospace')
  return styleId
}

const themeDisplayName = (theme) => {
  if (theme?.id === 'default') return t('默认系统', 'Default System')
  if (theme?.id === 'zen') return t('石墨静夜', 'Graphite Quiet')
  return theme?.name || ''
}

const appIconOverrides = computed(() =>
  normalizeAppIconOverrides(settings.value.appearance.appIconOverrides),
)
const appIconPresetOptions = computed(() =>
  APP_ICON_PRESET_OPTIONS.map((item) => ({
    value: item.value,
    label: resolveAppIconPresetLabel(item.value, appearanceLocale.value),
  })),
)
const appIconAccentOptions = computed(() =>
  APP_ICON_ACCENT_OPTIONS.map((item) => ({
    value: item.value,
    label: resolveAppAccentLabel(item.value, appearanceLocale.value),
  })),
)
const appIconCustomizationTargets = computed(() =>
  APP_ICON_CUSTOMIZATION_TARGET_IDS.map((appId) =>
    resolveAppCustomizationTargetMeta(appId, appearanceLocale.value, appIconOverrides.value),
  ),
)

const pageTitle = computed(() => {
  if (activeMenu.value === 'theme') return t('主题美化', 'Theme')
  if (activeMenu.value === 'font') return t('字体设置', 'Font')
  if (activeMenu.value === 'icons') return t('功能图标', 'App Icons')
  return t('外观工坊', 'Appearance Studio')
})

const backLabel = computed(() =>
  activeMenu.value === ROOT_MENU ? t('设置', 'Settings') : t('外观工坊', 'Appearance Studio'),
)

const currentFontStack = computed(() => {
  const value = settings.value.appearance.customVars?.[FONT_VAR_NAME]
  return typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_FONT_STACK
})
const currentWallpaperMode = computed(() => settings.value.appearance.wallpaperMode || 'theme')
const currentWallpaperAsset = computed(() => {
  const assetId =
    typeof settings.value.appearance.wallpaperAssetId === 'string'
      ? settings.value.appearance.wallpaperAssetId.trim()
      : ''
  return assetId ? galleryStore.findAssetById(assetId) : null
})
const currentThemeMeta = computed(
  () =>
    availableThemes.value.find((item) => item.id === settings.value.appearance.currentTheme) || null,
)
const selectedWallpaperAsset = computed(() => {
  const assetId =
    typeof selectedWallpaperAssetId.value === 'string' ? selectedWallpaperAssetId.value.trim() : ''
  return assetId ? galleryStore.findAssetById(assetId) : null
})
const wallpaperQuickAssetOptions = computed(() => {
  const merged = []
  const pushAsset = (asset) => {
    if (!asset?.id || merged.some((item) => item.id === asset.id)) return
    merged.push(asset)
  }

  pushAsset(currentWallpaperAsset.value)
  pushAsset(selectedWallpaperAsset.value)
  wallpaperAssets.value.forEach((asset) => pushAsset(asset))
  return merged.slice(0, 6)
})
const wallpaperQuickOverflowCount = computed(() =>
  Math.max(0, wallpaperAssets.value.length - wallpaperQuickAssetOptions.value.length),
)
const wallpaperQuickPreviewAssetIds = computed(() =>
  wallpaperQuickAssetOptions.value
    .map((asset) => (typeof asset?.id === 'string' ? asset.id.trim() : ''))
    .filter(Boolean),
)
const currentWallpaperPreviewUrl = computed(() => {
  if (currentWallpaperMode.value === 'gallery') {
    const assetId =
      typeof currentWallpaperAsset.value?.id === 'string' ? currentWallpaperAsset.value.id.trim() : ''
    return assetId ? wallpaperQuickPreviewMap[assetId] || '' : ''
  }
  if (currentWallpaperMode.value === 'url') {
    return typeof settings.value.appearance.wallpaper === 'string'
      ? settings.value.appearance.wallpaper.trim()
      : ''
  }
  return systemStore.getThemeWallpaper(settings.value.appearance.currentTheme) || ''
})
const currentWallpaperModeLabel = computed(() => {
  if (currentWallpaperMode.value === 'gallery') return t('相册', 'Gallery')
  if (currentWallpaperMode.value === 'url') return t('URL', 'URL')
  return t('主题', 'Theme')
})
const currentWallpaperPreviewDescription = computed(() => {
  if (currentWallpaperMode.value === 'gallery') {
    if (currentWallpaperAsset.value) {
      return t(
        `当前使用相册素材「${currentWallpaperAsset.value.name}」作为壁纸。`,
        `Currently using gallery asset "${currentWallpaperAsset.value.name}" as wallpaper.`,
      )
    }
    return t(
      '当前相册壁纸素材缺失，系统会回退到主题壁纸。',
      'The current gallery wallpaper asset is missing and will fall back to theme wallpaper.',
    )
  }
  if (currentWallpaperMode.value === 'url') {
    return t(
      '当前使用自定义 URL 壁纸。若链接失效，建议切回主题或相册素材。',
      'A custom URL wallpaper is active. If the link breaks, switch back to theme or gallery wallpaper.',
    )
  }
  return t(
    `当前跟随主题壁纸：${themeDisplayName(currentThemeMeta.value) || settings.value.appearance.currentTheme}`,
    `Currently following theme wallpaper: ${themeDisplayName(currentThemeMeta.value) || settings.value.appearance.currentTheme}`,
  )
})
const resetWallpaperButtonLabel = computed(() =>
  currentWallpaperMode.value === 'theme'
    ? t('跟随主题', 'Use Theme')
    : t('恢复主题', 'Reset to Theme'),
)
const currentWallpaperSourceSummary = computed(() => {
  if (currentWallpaperMode.value === 'gallery') {
    return currentWallpaperAsset.value
      ? t(
          `来自相册：${currentWallpaperAsset.value.name}`,
          `From Gallery: ${currentWallpaperAsset.value.name}`,
        )
      : t(
          '来自相册：素材缺失，当前回退到主题壁纸',
          'From Gallery: asset missing, currently falling back to theme wallpaper',
        )
  }
  if (currentWallpaperMode.value === 'url') {
    const url =
      typeof settings.value.appearance.wallpaper === 'string'
        ? settings.value.appearance.wallpaper.trim()
        : ''
    return url
      ? t(`自定义 URL：${url}`, `Custom URL: ${url}`)
      : t(
          '自定义 URL 未填写，当前回退到主题壁纸',
          'Custom URL is empty, currently falling back to theme wallpaper',
        )
  }
  const theme = availableThemes.value.find((item) => item.id === settings.value.appearance.currentTheme)
  return t(
    `跟随主题：${themeDisplayName(theme) || settings.value.appearance.currentTheme}`,
    `Follow Theme: ${themeDisplayName(theme) || settings.value.appearance.currentTheme}`,
  )
})

watch(
  () => [settings.value.appearance.wallpaperMode, settings.value.appearance.wallpaper],
  ([mode, value]) => {
    if (mode === 'url') {
      customWallpaperUrlInput.value = typeof value === 'string' ? value : ''
      return
    }
    if (
      typeof customWallpaperUrlInput.value !== 'string' ||
      !customWallpaperUrlInput.value.trim()
    ) {
      customWallpaperUrlInput.value = ''
    }
  },
  { immediate: true },
)

watch(
  () => [
    settings.value.appearance.wallpaperAssetId,
    wallpaperAssets.value.map((asset) => asset.id).join('|'),
  ],
  () => {
    const availableAssetIds = wallpaperAssets.value.map((asset) => asset.id)
    const currentAssetId =
      typeof settings.value.appearance.wallpaperAssetId === 'string'
        ? settings.value.appearance.wallpaperAssetId.trim()
        : ''
    if (currentAssetId) {
      selectedWallpaperAssetId.value = currentAssetId
      return
    }
    if (
      selectedWallpaperAssetId.value &&
      !availableAssetIds.includes(selectedWallpaperAssetId.value)
    ) {
      selectedWallpaperAssetId.value = availableAssetIds[0] || ''
      return
    }
    if (!selectedWallpaperAssetId.value && wallpaperAssets.value.length > 0) {
      selectedWallpaperAssetId.value = wallpaperAssets.value[0].id
    }
  },
  { immediate: true },
)

const ensureWallpaperQuickPreview = async (assetId) => {
  if (!assetId || wallpaperQuickPreviewMap[assetId]) return
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId, {
    scopeId: APPEARANCE_WALLPAPER_PREVIEW_SCOPE_ID,
  })
  if (!previewUrl) return
  wallpaperQuickPreviewMap[assetId] = previewUrl
}

watch(
  wallpaperQuickPreviewAssetIds,
  (assetIds) => {
    const activeSet = new Set(assetIds)
    assetIds.forEach((assetId) => {
      void ensureWallpaperQuickPreview(assetId)
    })
    Object.keys(wallpaperQuickPreviewMap).forEach((assetId) => {
      if (!activeSet.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, APPEARANCE_WALLPAPER_PREVIEW_SCOPE_ID)
        delete wallpaperQuickPreviewMap[assetId]
      }
    })
  },
  { immediate: true },
)

const triggerSaved = () => {
  systemStore.saveNow()
  saved.value = true
  if (savedTimerId) clearTimeout(savedTimerId)
  savedTimerId = setTimeout(() => {
    saved.value = false
  }, 1200)
}

const goHome = () => {
  router.push('/home')
}

const openWidgetCenter = () => {
  router.push('/widgets')
}

const goSettings = () => {
  router.push('/settings')
}

const handleBack = () => {
  if (activeMenu.value !== ROOT_MENU) {
    activeMenu.value = ROOT_MENU
    return
  }
  goSettings()
}

const openMenu = (menu) => {
  activeMenu.value = menu
  if (menu === 'font') {
    customFontStackInput.value = currentFontStack.value
  }
  if (menu === 'theme') {
    customWallpaperUrlInput.value =
      settings.value.appearance.wallpaperMode === 'url' ? settings.value.appearance.wallpaper || '' : ''
  }
}

const setTheme = (themeId) => {
  systemStore.setTheme(themeId)
  triggerSaved()
}

const openGallery = () => {
  router.push('/gallery')
}

const useThemeWallpaperSource = () => {
  systemStore.useThemeWallpaper()
  triggerSaved()
}

const applyGalleryWallpaper = () => {
  const assetId =
    typeof selectedWallpaperAssetId.value === 'string' ? selectedWallpaperAssetId.value.trim() : ''
  if (!assetId) return
  systemStore.setAppearanceWallpaperAsset(assetId)
  triggerSaved()
}

const applyQuickWallpaperAsset = (assetId) => {
  if (typeof assetId !== 'string' || !assetId.trim()) return
  selectedWallpaperAssetId.value = assetId
  systemStore.setAppearanceWallpaperAsset(assetId)
  triggerSaved()
}

const applyWallpaperUrl = () => {
  const normalizedUrl = customWallpaperUrlInput.value.trim()
  if (!normalizedUrl) {
    systemStore.useThemeWallpaper()
    customWallpaperUrlInput.value = ''
    triggerSaved()
    return
  }

  systemStore.setAppearanceWallpaperUrl(normalizedUrl)
  triggerSaved()
}

const clearCustomCss = () => {
  settings.value.appearance.customCss = ''
  triggerSaved()
}

const saveAppearance = () => {
  triggerSaved()
}

const setAppIconOverrideField = (appId, field, value) => {
  const currentOverrides = normalizeAppIconOverrides(settings.value.appearance.appIconOverrides)
  const current = currentOverrides[appId] || {}
  settings.value.appearance.appIconOverrides = normalizeAppIconOverrides({
    ...currentOverrides,
    [appId]: {
      ...current,
      [field]: value,
    },
  })
}

const resetAppIconOverride = (appId) => {
  const currentOverrides = normalizeAppIconOverrides(settings.value.appearance.appIconOverrides)
  const nextOverrides = { ...currentOverrides }
  delete nextOverrides[appId]
  settings.value.appearance.appIconOverrides = normalizeAppIconOverrides(nextOverrides)
  triggerSaved()
}

const toggleStatusBar = () => {
  settings.value.appearance.showStatusBar = settings.value.appearance.showStatusBar !== false ? false : true
  triggerSaved()
}

const toggleHapticFeedback = () => {
  settings.value.appearance.hapticFeedbackEnabled =
    settings.value.appearance.hapticFeedbackEnabled !== false ? false : true
  triggerSaved()
}

const setFontPreset = (value) => {
  systemStore.setCustomVar(FONT_VAR_NAME, value)
  customFontStackInput.value = value
  triggerSaved()
}

const applyCustomFontStack = () => {
  const value = customFontStackInput.value.trim() || DEFAULT_FONT_STACK
  systemStore.setCustomVar(FONT_VAR_NAME, value)
  triggerSaved()
}

const resetFontStack = () => {
  customFontStackInput.value = DEFAULT_FONT_STACK
  systemStore.setCustomVar(FONT_VAR_NAME, DEFAULT_FONT_STACK)
  triggerSaved()
}

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
  Object.keys(wallpaperQuickPreviewMap).forEach((assetId) => {
    galleryStore.releaseAssetPreview(assetId, APPEARANCE_WALLPAPER_PREVIEW_SCOPE_ID)
    delete wallpaperQuickPreviewMap[assetId]
  })
  galleryStore.releaseAssetPreviewScope(APPEARANCE_WALLPAPER_PREVIEW_SCOPE_ID)
})
</script>

<template>
  <div class="appearance-shell w-full h-full bg-gray-100 flex flex-col text-black">
    <div class="appearance-header pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="handleBack" class="appearance-nav-button mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> {{ backLabel }}
      </button>
      <h1 class="text-2xl font-bold flex-1">{{ pageTitle }}</h1>
      <button @click="goHome" class="appearance-nav-button text-blue-500 text-sm">{{ t('主页', 'Home') }}</button>
    </div>

    <div v-if="activeMenu === ROOT_MENU" class="appearance-root-list flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
      <button
        class="appearance-menu-card w-full bg-white rounded-xl p-4 shadow-sm text-left flex items-center gap-3"
        @click="openMenu('theme')"
      >
        <div class="appearance-menu-icon is-theme w-8 h-8 rounded-lg bg-violet-500 text-white flex items-center justify-center text-xs">
          <i class="fas fa-palette"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold">{{ t('整体主题美化', 'Theme Styling') }}</p>
          <p class="text-[11px] text-gray-500">{{ t('主题、壁纸与自定义 CSS', 'Theme, wallpaper and custom CSS') }}</p>
        </div>
        <i class="fas fa-chevron-right text-xs text-gray-300"></i>
      </button>

      <button
        class="appearance-menu-card w-full bg-white rounded-xl p-4 shadow-sm text-left flex items-center gap-3"
        @click="openMenu('font')"
      >
        <div class="appearance-menu-icon is-font w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs">
          <i class="fas fa-font"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold">{{ t('字体', 'Font') }}</p>
          <p class="text-[11px] text-gray-500">{{ t('全局字体族与自定义字体栈', 'Global font family and custom stack') }}</p>
        </div>
        <i class="fas fa-chevron-right text-xs text-gray-300"></i>
      </button>

      <button
        class="appearance-menu-card w-full bg-white rounded-xl p-4 shadow-sm text-left flex items-center gap-3"
        @click="openMenu('icons')"
      >
        <div class="appearance-menu-icon is-icons w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs">
          <i class="fas fa-icons"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold">{{ t('功能图标', 'App Icons') }}</p>
          <p class="text-[11px] text-gray-500">{{ t('调整核心功能入口的图标与色系', 'Adjust icon glyphs and accent colors for core app entries') }}</p>
        </div>
        <i class="fas fa-chevron-right text-xs text-gray-300"></i>
      </button>

      <button
        class="appearance-menu-card w-full bg-white rounded-xl p-4 shadow-sm text-left flex items-center gap-3"
        @click="openWidgetCenter"
      >
        <div class="appearance-menu-icon is-widget w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs">
          <i class="fas fa-puzzle-piece"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold">{{ t('Widget 中心', 'Widget Center') }}</p>
          <p class="text-[11px] text-gray-500">{{ t('创建、导入与管理主屏组件', 'Create, import, and manage Home widgets') }}</p>
        </div>
        <i class="fas fa-chevron-right text-xs text-gray-300"></i>
      </button>
    </div>

    <div v-else-if="activeMenu === 'theme'" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="text-sm font-bold mb-3">{{ t('系统主题', 'System Theme') }}</div>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="theme in availableThemes"
            :key="theme.id"
            @click="setTheme(theme.id)"
            class="h-24 rounded-lg border-2 flex items-center justify-center cursor-pointer"
            :class="settings.appearance.currentTheme === theme.id ? 'border-blue-500' : 'border-transparent'"
            :style="{ background: theme.preview }"
          >
            <span class="text-xs font-bold" :class="theme.darkText ? 'text-black' : 'text-white'">
              {{ themeDisplayName(theme) }}
            </span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold">{{ t('当前壁纸来源', 'Current Wallpaper Source') }}</p>
            <p class="text-[11px] text-gray-500 break-all">{{ currentWallpaperSourceSummary }}</p>
          </div>
          <button
            @click="useThemeWallpaperSource"
            class="shrink-0 px-3 py-1.5 rounded-md text-[11px] font-semibold border border-gray-200 hover:bg-gray-50"
          >
            {{ resetWallpaperButtonLabel }}
          </button>
        </div>
        <div class="rounded-2xl border border-violet-100 bg-violet-50/50 p-3 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold text-violet-800">
                {{ t('当前壁纸预览', 'Current Wallpaper Preview') }}
              </p>
              <p class="mt-1 text-[11px] text-violet-700">
                {{ currentWallpaperPreviewDescription }}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full border border-violet-100 bg-white px-2 py-1 text-[10px] font-semibold text-violet-700"
            >
              {{ currentWallpaperModeLabel }}
            </span>
          </div>
          <div class="h-36 rounded-2xl overflow-hidden border border-white/80 bg-gray-100">
            <img
              v-if="currentWallpaperPreviewUrl"
              :src="currentWallpaperPreviewUrl"
              :alt="t('当前壁纸预览', 'Current Wallpaper Preview')"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center bg-gray-50 text-[11px] text-gray-400"
            >
              {{
                currentWallpaperMode === 'gallery'
                  ? t('正在载入壁纸预览', 'Loading wallpaper preview')
                  : t('暂无可用预览', 'No preview available')
              }}
            </div>
          </div>
          <p
            v-if="currentWallpaperMode === 'gallery'"
            class="text-[11px] text-violet-700"
          >
            {{
              t(
                '切回主题时会同步清除当前相册壁纸绑定，不会留下旧素材状态。',
                'Switching back to theme also clears the current gallery wallpaper binding.',
              )
            }}
          </p>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('从相册选择壁纸', 'Choose Wallpaper From Gallery') }}</p>
            <p class="text-[11px] text-gray-500">
              {{
                wallpaperAssets.length > 0
                  ? t(`已识别 ${wallpaperAssets.length} 张壁纸素材`, `${wallpaperAssets.length} wallpaper assets available`)
                  : t('相册里还没有壁纸素材，请先导入。', 'No wallpaper assets in Gallery yet. Import one first.')
              }}
            </p>
          </div>
          <button
            @click="openGallery"
            class="shrink-0 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-gray-900 text-white hover:bg-black transition"
          >
            {{ t('打开相册', 'Open Gallery') }}
          </button>
        </div>
        <div
          v-if="wallpaperQuickAssetOptions.length > 0"
          class="rounded-2xl border border-sky-100 bg-sky-50/50 p-3 space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold text-sky-800">
                {{
                  currentWallpaperMode === 'gallery' && currentWallpaperAsset
                    ? t('当前正在使用相册壁纸', 'Gallery wallpaper in use')
                    : t('快捷切换壁纸', 'Quick wallpaper switch')
                }}
              </p>
              <p class="mt-1 text-[11px] text-sky-700">
                {{
                  currentWallpaperMode === 'gallery' && currentWallpaperAsset
                    ? t(
                        `已应用：${currentWallpaperAsset.name}。点下方缩略图可直接切换。`,
                        `Applied: ${currentWallpaperAsset.name}. Tap a thumbnail below to switch instantly.`,
                      )
                    : t(
                        '点下方缩略图可直接应用为壁纸，也可以继续用下拉框精确选择。',
                        'Tap a thumbnail below to apply it instantly, or keep using the picker for precise selection.',
                      )
                }}
              </p>
            </div>
            <span
              v-if="wallpaperQuickOverflowCount > 0"
              class="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-sky-700 border border-sky-100"
            >
              {{ t(`另有 ${wallpaperQuickOverflowCount} 张`, `+${wallpaperQuickOverflowCount}`) }}
            </span>
          </div>
          <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              v-for="asset in wallpaperQuickAssetOptions"
              :key="`wallpaper-chip-${asset.id}`"
              type="button"
              class="shrink-0 w-16"
              @click="applyQuickWallpaperAsset(asset.id)"
            >
              <div
                class="relative w-16 h-24 rounded-2xl overflow-hidden border bg-white"
                :class="
                  currentWallpaperMode === 'gallery' && currentWallpaperAsset?.id === asset.id
                    ? 'border-sky-400 ring-2 ring-sky-100'
                    : selectedWallpaperAssetId === asset.id
                      ? 'border-slate-400'
                      : 'border-gray-200'
                "
              >
                <img
                  v-if="wallpaperQuickPreviewMap[asset.id]"
                  :src="wallpaperQuickPreviewMap[asset.id]"
                  :alt="asset.name"
                  class="w-full h-full object-cover"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center bg-gray-50 text-[9px] text-gray-400"
                >
                  {{ t('加载中', 'Loading') }}
                </div>
                <AssetStatusBadge
                  v-if="currentWallpaperMode === 'gallery' && currentWallpaperAsset?.id === asset.id"
                  label-zh="使用中"
                  label-en="Live"
                  tone="sky-solid"
                  :truncate="false"
                  class="absolute left-1.5 top-1.5 font-semibold"
                />
              </div>
              <p class="mt-1 text-[10px] text-gray-600 truncate">
                {{ asset.name }}
              </p>
            </button>
          </div>
        </div>
        <select
          v-model="selectedWallpaperAssetId"
          class="w-full border rounded-md px-2 py-2 text-sm outline-none bg-white"
          :disabled="wallpaperAssets.length === 0"
        >
          <option value="">{{ t('请选择壁纸素材', 'Select a wallpaper asset') }}</option>
          <option v-for="asset in wallpaperAssets" :key="asset.id" :value="asset.id">
            {{ asset.name }}
          </option>
        </select>
        <button
          @click="applyGalleryWallpaper"
          class="w-full py-2.5 rounded-lg text-sm font-semibold transition"
          :class="selectedWallpaperAssetId ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
          :disabled="!selectedWallpaperAssetId"
        >
          {{ t('应用为壁纸', 'Apply as Wallpaper') }}
        </button>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">{{ t('自定义壁纸 URL', 'Custom Wallpaper URL') }}</label>
        <input
          v-model="customWallpaperUrlInput"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          placeholder="https://..."
          @keyup.enter="applyWallpaperUrl"
        />
        <div class="mt-3 flex gap-2">
          <button
            @click="applyWallpaperUrl"
            class="flex-1 px-3 py-2 rounded-md text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            {{ t('应用 URL', 'Apply URL') }}
          </button>
          <button
            @click="useThemeWallpaperSource"
            class="px-3 py-2 rounded-md text-sm border border-gray-200 hover:bg-gray-50"
          >
            {{ t('恢复默认', 'Reset') }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">{{ t('锁屏时间样式', 'Lock Clock Style') }}</label>
        <select
          v-model="settings.appearance.lockClockStyle"
          class="w-full border rounded-md px-2 py-2 text-sm outline-none bg-white"
          @change="saveAppearance"
        >
          <option v-for="style in LOCK_CLOCK_STYLE_OPTIONS" :key="style.id" :value="style.id">
            {{ lockClockStyleLabel(style.id) }}
          </option>
        </select>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold">{{ t('顶部状态栏', 'Status Bar') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('显示时间与信号图标', 'Show time and signal icons') }}</p>
          </div>
          <button
            type="button"
            class="relative w-12 h-7 rounded-full transition"
            :class="settings.appearance.showStatusBar !== false ? 'bg-blue-500' : 'bg-gray-300'"
            @click="toggleStatusBar"
          >
            <span
              class="absolute top-1 w-5 h-5 rounded-full bg-white transition"
              :class="settings.appearance.showStatusBar !== false ? 'left-6' : 'left-1'"
            ></span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold">{{ t('触感反馈（振动）', 'Haptic Feedback (Vibration)') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('点击与位置调整时短震动（设备支持时）', 'Short vibration on taps and layout changes (if supported)') }}</p>
          </div>
          <button
            type="button"
            class="relative w-12 h-7 rounded-full transition"
            :class="settings.appearance.hapticFeedbackEnabled !== false ? 'bg-blue-500' : 'bg-gray-300'"
            @click="toggleHapticFeedback"
          >
            <span
              class="absolute top-1 w-5 h-5 rounded-full bg-white transition"
              :class="settings.appearance.hapticFeedbackEnabled !== false ? 'left-6' : 'left-1'"
            ></span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs text-gray-500 block">{{ t('自定义 CSS（高级）', 'Custom CSS (Advanced)') }}</label>
          <button class="text-[11px] text-blue-500" @click="clearCustomCss">{{ t('清空', 'Clear') }}</button>
        </div>
        <textarea
          v-model="settings.appearance.customCss"
          class="w-full h-36 border border-gray-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
          placeholder=".app-shell { --home-widget-bg: rgba(255,255,255,0.5); }"
        ></textarea>
      </div>

      <button
        @click="saveAppearance"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存主题设置', 'Save theme settings') }}
      </button>
    </div>

    <div v-else-if="activeMenu === 'font'" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-sm font-bold mb-3">{{ t('字体预设', 'Font Presets') }}</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="preset in FONT_PRESETS"
            :key="preset.id"
            @click="setFontPreset(preset.value)"
            class="px-3 py-2 rounded-lg text-sm border transition text-left"
            :class="currentFontStack === preset.value ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50'"
          >
            {{ fontPresetLabel(preset) }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">{{ t('自定义字体栈（CSS font-family）', 'Custom font stack (CSS font-family)') }}</label>
        <input
          v-model="customFontStackInput"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono"
          placeholder='"Inter", "Noto Sans SC", sans-serif'
        />
        <div class="mt-3 flex gap-2">
          <button
            @click="applyCustomFontStack"
            class="flex-1 px-3 py-2 rounded-md text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            {{ t('应用字体', 'Apply Font') }}
          </button>
          <button
            @click="resetFontStack"
            class="px-3 py-2 rounded-md text-sm border border-gray-200 hover:bg-gray-50"
          >
            {{ t('重置', 'Reset') }}
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-xs text-gray-500 mb-1">{{ t('当前字体栈', 'Current font stack') }}</p>
        <p class="text-xs font-mono text-gray-700 break-all">{{ currentFontStack }}</p>
      </div>

      <button
        @click="saveAppearance"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存字体设置', 'Save font settings') }}
      </button>
    </div>

    <div v-else-if="activeMenu === 'icons'" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <p class="text-sm font-bold mb-2">{{ t('核心功能图标', 'Core App Icons') }}</p>
        <p class="text-[11px] text-gray-500">
          {{ t('可调整主屏核心入口的预设图标与色系。', 'Adjust preset glyphs and accent colors for core Home entries.') }}
        </p>
      </div>

      <div
        v-for="target in appIconCustomizationTargets"
        :key="target.appId"
        class="bg-white rounded-xl p-4 shadow-sm space-y-3"
      >
        <div class="flex items-center gap-3">
          <span
            class="w-11 h-11 rounded-2xl inline-flex items-center justify-center text-lg"
            :style="{
              background: `var(--home-icon-${target.accent}-bg)`,
              color: `var(--home-icon-${target.accent}-fg)`,
            }"
          >
            <i :class="target.icon"></i>
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">{{ target.title }}</p>
            <p class="text-[11px] text-gray-500">{{ t('主屏入口', 'Home entry') }}</p>
          </div>
          <button
            @click="resetAppIconOverride(target.appId)"
            class="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] text-gray-600 hover:bg-gray-50"
          >
            {{ t('恢复默认', 'Reset') }}
          </button>
        </div>

        <label class="block space-y-1">
          <span class="text-xs text-gray-500">{{ t('图标样式', 'Icon Glyph') }}</span>
          <select
            :value="target.icon"
            class="w-full border rounded-md px-2 py-2 text-sm outline-none bg-white"
            @change="setAppIconOverrideField(target.appId, 'icon', $event.target.value); triggerSaved()"
          >
            <option v-for="option in appIconPresetOptions" :key="`${target.appId}-${option.value}`" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="block space-y-1">
          <span class="text-xs text-gray-500">{{ t('色系', 'Accent') }}</span>
          <select
            :value="target.accent"
            class="w-full border rounded-md px-2 py-2 text-sm outline-none bg-white"
            @change="setAppIconOverrideField(target.appId, 'accent', $event.target.value); triggerSaved()"
          >
            <option v-for="option in appIconAccentOptions" :key="`${target.appId}-${option.value}`" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <button
        @click="saveAppearance"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存图标设置', 'Save icon settings') }}
      </button>
    </div>

  </div>
</template>

<style scoped>
.appearance-shell {
  position: relative;
  isolation: isolate;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(244, 247, 251, 0.96) 34%, #eef1f5 100%);
  color: var(--system-text);
}

.appearance-header {
  border-bottom: 1px solid var(--system-border);
  background: rgba(248, 250, 252, 0.86);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
}

.appearance-header h1 {
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: 0;
}

.appearance-nav-button {
  min-height: 36px;
  color: var(--system-accent);
  -webkit-tap-highlight-color: transparent;
}

.appearance-root-list {
  padding-top: 16px;
}

.appearance-menu-card {
  min-height: 72px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: var(--system-radius-md);
  background: var(--system-surface-strong);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transition:
    transform var(--system-motion-fast),
    background var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
  -webkit-tap-highlight-color: transparent;
}

.appearance-menu-card:active {
  transform: scale(0.992);
  background: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.appearance-menu-icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.appearance-menu-icon.is-theme {
  background: linear-gradient(135deg, #5d8295 0%, #385e75 100%);
}

.appearance-menu-icon.is-font {
  background: linear-gradient(135deg, #334155 0%, #111827 100%);
}

.appearance-menu-icon.is-icons {
  background: linear-gradient(135deg, #6f949a 0%, #3d6974 100%);
}

.appearance-menu-icon.is-widget {
  background: linear-gradient(135deg, #6b7f8a 0%, #465a66 100%);
}

@media (prefers-reduced-motion: reduce) {
  .appearance-menu-card {
    transition: none;
  }
}
</style>
