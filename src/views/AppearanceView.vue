<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useGalleryStore } from '../stores/gallery'
import { useI18n } from '../composables/useI18n'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import AssetThumbnailOption from '../components/assets/AssetThumbnailOption.vue'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'
import {
  buildRouteWithReturnSource,
  normalizeHomePageQuery,
  pushReturnTarget,
  resolveReturnLabel,
} from '../lib/navigation-return'
import {
  HOME_LAYOUT_TEMPLATES,
  getHomeLayoutTemplate,
  homeLayoutSlotToGridStyle,
} from '../lib/home-layout-templates'

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
const WALLPAPER_SOURCE_OPTIONS = [
  { value: 'theme', labelZh: '跟随主题', labelEn: 'Theme wallpaper' },
  { value: 'url', labelZh: 'URL 壁纸', labelEn: 'URL wallpaper' },
  { value: 'gallery', labelZh: 'Gallery 壁纸', labelEn: 'Gallery wallpaper' },
]

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const galleryStore = useGalleryStore()
const { t } = useI18n()

const { settings, availableThemes } = storeToRefs(systemStore)

const activeMenu = ref(ROOT_MENU)
const saved = ref(false)
const selectedHomeLayoutPage = ref(0)
const activeAppearanceSheet = ref('')

let savedTimerId = null
const customFontStackInput = ref('')
const customWallpaperUrlInput = ref('')
const selectedWallpaperAssetId = ref('')
const wallpaperSourceTypeDraft = ref('')
const appearancePackExportText = ref('')
const appearancePackImportText = ref('')
const appearancePackStatus = ref({ tone: '', message: '' })
const wallpaperQuickPreviewMap = reactive({})

const APPEARANCE_WALLPAPER_PREVIEW_SCOPE_ID = 'appearance-wallpaper-view'

const wallpaperAssets = computed(() => galleryStore.getAssetsByCategory('wallpaper'))
const homeLayoutPreviewTemplates = computed(() => HOME_LAYOUT_TEMPLATES)
const homeLayoutPageCount = computed(() =>
  Math.max(
    5,
    Array.isArray(settings.value.appearance.homeWidgetPages)
      ? settings.value.appearance.homeWidgetPages.length
      : 0,
    Array.isArray(settings.value.appearance.homeLayoutTemplateIds)
      ? settings.value.appearance.homeLayoutTemplateIds.length
      : 0,
  ),
)
const clampHomeLayoutPage = (pageIndex) => {
  const numeric = Number(pageIndex)
  const fallback = Number.isInteger(numeric) ? numeric : 0
  return Math.min(Math.max(0, fallback), Math.max(0, homeLayoutPageCount.value - 1))
}
const selectedHomeLayoutPageIndex = computed(() => clampHomeLayoutPage(selectedHomeLayoutPage.value))
const homeLayoutPageSummaries = computed(() =>
  Array.from({ length: homeLayoutPageCount.value }, (_, index) => {
    const template = getHomeLayoutTemplate(settings.value.appearance.homeLayoutTemplateIds?.[index])
    return {
      index,
      template,
      templateId: template.id,
    }
  }),
)
const selectedHomeLayoutTemplate = computed(() =>
  getHomeLayoutTemplate(settings.value.appearance.homeLayoutTemplateIds?.[selectedHomeLayoutPageIndex.value]),
)

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

const smartPanelEnabled = computed(() => systemStore.isMoreFeatureToggleEnabled('smart_panel'))
const appearancePackStatusClass = computed(() => {
  if (appearancePackStatus.value.tone === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (appearancePackStatus.value.tone === 'warning') return 'bg-amber-50 text-amber-700 border-amber-100'
  if (appearancePackStatus.value.tone === 'error') return 'bg-rose-50 text-rose-700 border-rose-100'
  return 'bg-slate-50 text-slate-500 border-slate-100'
})

const pageTitle = computed(() => {
  if (activeMenu.value === 'theme') return t('主题美化', 'Theme')
  if (activeMenu.value === 'font') return t('字体设置', 'Font')
  return t('外观工坊', 'Appearance Studio')
})

const returnLabelKey = computed(() => resolveReturnLabel(route, 'Home'))
const backLabel = computed(() => {
  if (activeMenu.value !== ROOT_MENU) return t('外观工坊', 'Appearance Studio')
  return returnLabelKey.value === 'Settings' ? t('设置', 'Settings') : t('主页', 'Home')
})

const homeLayoutTemplateLabel = (template) => t(`布局 ${template.key}`, `Layout ${template.key}`)
const homeLayoutPageLabel = (pageIndex) => `${t('第', 'Screen ')}${pageIndex + 1}${t('屏', '')}`

const currentFontStack = computed(() => {
  const value = settings.value.appearance.customVars?.[FONT_VAR_NAME]
  return typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_FONT_STACK
})
const currentWallpaperMode = computed(() => settings.value.appearance.wallpaperMode || 'theme')
const wallpaperSourceDraft = computed({
  get: () => wallpaperSourceTypeDraft.value || currentWallpaperMode.value,
  set: (sourceType) => {
    wallpaperSourceTypeDraft.value = ['theme', 'url', 'gallery'].includes(sourceType)
      ? sourceType
      : 'theme'
  },
})
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
    wallpaperSourceTypeDraft.value = mode || 'theme'
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
  () => route.query.homePage,
  (homePage) => {
    selectedHomeLayoutPage.value = clampHomeLayoutPage(normalizeHomePageQuery(homePage))
  },
  { immediate: true },
)

watch(homeLayoutPageCount, () => {
  selectedHomeLayoutPage.value = clampHomeLayoutPage(selectedHomeLayoutPage.value)
})

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
  pushReturnTarget(router, route, '/home')
}

const openHomeLayoutEditor = () => {
  const pageIndex = selectedHomeLayoutPageIndex.value
  router.push(
    buildRouteWithReturnSource('/home', 'home', {
      widgetEdit: '1',
      homePage: pageIndex,
    }),
  )
}

const selectAppearanceHomePage = (pageIndex) => {
  selectedHomeLayoutPage.value = clampHomeLayoutPage(pageIndex)
}

const setAppearanceHomeTemplate = (templateId) => {
  const ok = systemStore.setHomeLayoutTemplate(selectedHomeLayoutPageIndex.value, templateId)
  if (!ok) return
  triggerSaved()
}

const goSettings = () => {
  pushReturnTarget(router, route, '/home')
}

const handleBack = () => {
  if (activeAppearanceSheet.value) {
    closeAppearanceSheet()
    return
  }
  if (activeMenu.value !== ROOT_MENU) {
    activeMenu.value = ROOT_MENU
    return
  }
  goSettings()
}

const openMenu = (menu) => {
  activeMenu.value = menu
  activeAppearanceSheet.value = ''
  if (menu === 'font') {
    customFontStackInput.value = currentFontStack.value
  }
  if (menu === 'theme') {
    customWallpaperUrlInput.value =
      settings.value.appearance.wallpaperMode === 'url' ? settings.value.appearance.wallpaper || '' : ''
  }
}

const openAppearanceSheet = (sheetId) => {
  activeAppearanceSheet.value = sheetId
}

const closeAppearanceSheet = () => {
  activeAppearanceSheet.value = ''
}

const openFontEditor = () => {
  customFontStackInput.value = currentFontStack.value
  openAppearanceSheet('font')
}

const setTheme = (themeId) => {
  systemStore.setTheme(themeId)
  triggerSaved()
}

const openGallery = () => {
  router.push('/gallery')
}

const useThemeWallpaperSource = () => {
  wallpaperSourceTypeDraft.value = 'theme'
  systemStore.useThemeWallpaper()
  closeAppearanceSheet()
  triggerSaved()
}

const applyGalleryWallpaper = () => {
  const assetId =
    typeof selectedWallpaperAssetId.value === 'string' ? selectedWallpaperAssetId.value.trim() : ''
  if (!assetId) return
  wallpaperSourceTypeDraft.value = 'gallery'
  systemStore.setAppearanceWallpaperAsset(assetId)
  closeAppearanceSheet()
  triggerSaved()
}

const applyQuickWallpaperAsset = (assetId) => {
  if (typeof assetId !== 'string' || !assetId.trim()) return
  selectedWallpaperAssetId.value = assetId
  wallpaperSourceTypeDraft.value = 'gallery'
  systemStore.setAppearanceWallpaperAsset(assetId)
  triggerSaved()
}

const applyWallpaperUrl = () => {
  const normalizedUrl = customWallpaperUrlInput.value.trim()
  if (!normalizedUrl) {
    systemStore.useThemeWallpaper()
    customWallpaperUrlInput.value = ''
    wallpaperSourceTypeDraft.value = 'theme'
    closeAppearanceSheet()
    triggerSaved()
    return
  }

  wallpaperSourceTypeDraft.value = 'url'
  systemStore.setAppearanceWallpaperUrl(normalizedUrl)
  closeAppearanceSheet()
  triggerSaved()
}

const clearCustomCss = () => {
  settings.value.appearance.customCss = ''
  triggerSaved()
}

const exportAppearancePack = () => {
  const pack = systemStore.exportAppearancePack({
    name: t('SchatPhone 外观包', 'SchatPhone appearance pack'),
    description: t(
      '仅包含全局主题、壁纸、字体变量与全局 CSS。',
      'Includes global theme, wallpaper, font variables, and global CSS only.',
    ),
  })
  appearancePackExportText.value = JSON.stringify(pack, null, 2)
  appearancePackStatus.value = {
    tone: 'success',
    message: t('已生成外观包 JSON。', 'Appearance pack JSON generated.'),
  }
}

const importAppearancePack = () => {
  let payload = null
  try {
    payload = JSON.parse(appearancePackImportText.value || '')
  } catch {
    appearancePackStatus.value = {
      tone: 'error',
      message: t('无法解析外观包 JSON。', 'Could not parse appearance pack JSON.'),
    }
    return
  }

  const result = systemStore.importAppearancePack(payload)
  if (!result.ok) {
    appearancePackStatus.value = {
      tone: 'warning',
      message: t('外观包缺少可导入的 appearance 内容。', 'Appearance pack has no importable appearance content.'),
    }
    return
  }

  appearancePackImportText.value = ''
  appearancePackExportText.value = JSON.stringify(
    systemStore.exportAppearancePack({
      name: result.pack?.name || t('已导入外观包', 'Imported appearance pack'),
      description: result.pack?.description || '',
      exportedAt: result.pack?.exportedAt || undefined,
    }),
    null,
    2,
  )
  appearancePackStatus.value = {
    tone: 'success',
    message: t('外观包已导入。', 'Appearance pack imported.'),
  }
  triggerSaved()
}

const clearAppearancePackBuffers = () => {
  appearancePackExportText.value = ''
  appearancePackImportText.value = ''
  appearancePackStatus.value = { tone: '', message: '' }
}

const saveAppearance = () => {
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

const toggleSmartPanel = () => {
  systemStore.setMoreFeatureToggle('smart_panel', !smartPanelEnabled.value)
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
  closeAppearanceSheet()
  triggerSaved()
}

const resetFontStack = () => {
  customFontStackInput.value = DEFAULT_FONT_STACK
  systemStore.setCustomVar(FONT_VAR_NAME, DEFAULT_FONT_STACK)
  closeAppearanceSheet()
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
  <div class="appearance-shell w-full h-full bg-gray-100 flex flex-col text-black" :class="{ 'is-appearance-sheet-open': activeAppearanceSheet }">
    <div class="appearance-header pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="handleBack" class="appearance-nav-button mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> {{ backLabel }}
      </button>
      <h1 class="text-2xl font-bold flex-1">{{ pageTitle }}</h1>
      <button @click="goHome" class="appearance-nav-button text-blue-500 text-sm">{{ t('主页', 'Home') }}</button>
    </div>

    <div v-if="activeMenu === ROOT_MENU" class="appearance-root-list flex-1 overflow-y-auto p-4 no-scrollbar">
      <section class="appearance-overview-card">
        <div class="appearance-overview-copy">
          <span>{{ t('当前外观', 'Current Look') }}</span>
          <h2>{{ themeDisplayName(currentThemeMeta) || t('默认系统', 'Default System') }}</h2>
          <p>{{ currentWallpaperModeLabel }} · {{ t('桌面、锁屏与系统入口同步', 'Home, Lock, and system entries stay aligned') }}</p>
        </div>
        <div class="appearance-overview-actions">
          <button type="button" @click="openMenu('theme')">
            <i class="fas fa-palette"></i>
            <span>{{ t('整体主题美化', 'Theme Styling') }}</span>
          </button>
        </div>
      </section>

      <section class="appearance-layout-card">
        <div class="appearance-layout-head">
          <div>
            <p>{{ t('主屏布局', 'Home Layout') }}</p>
            <h2>{{ t('桌面模板', 'Desktop Templates') }}</h2>
          </div>
          <button type="button" data-testid="appearance-edit-home-layout" @click="openHomeLayoutEditor">
            <i class="fas fa-mobile-screen"></i>
            <span>{{ t('编辑主屏', 'Edit Home') }}</span>
          </button>
        </div>
        <div class="appearance-layout-pages" role="tablist" :aria-label="t('主屏页面', 'Home screens')">
          <button
            v-for="page in homeLayoutPageSummaries"
            :key="page.index"
            type="button"
            class="appearance-layout-page"
            :class="{ 'is-active': selectedHomeLayoutPageIndex === page.index }"
            role="tab"
            :aria-selected="selectedHomeLayoutPageIndex === page.index"
            :data-testid="`appearance-layout-screen-${page.index}`"
            @click="selectAppearanceHomePage(page.index)"
          >
            <span class="appearance-layout-page-label">{{ homeLayoutPageLabel(page.index) }}</span>
            <span class="appearance-layout-preview" aria-hidden="true">
              <span
                v-for="slot in page.template.slots"
                :key="slot.id"
                class="appearance-layout-preview-slot"
                :class="`is-size-${slot.size.replace('x', '-')}`"
                :style="homeLayoutSlotToGridStyle(slot)"
              ></span>
            </span>
            <small>{{ homeLayoutTemplateLabel(page.template) }}</small>
          </button>
        </div>
        <div class="appearance-layout-library">
          <div class="appearance-layout-library-head">
            <span>{{ t('模板', 'Layouts') }}</span>
            <strong>{{ homeLayoutTemplateLabel(selectedHomeLayoutTemplate) }}</strong>
          </div>
          <div class="appearance-layout-preview-row">
            <button
              v-for="template in homeLayoutPreviewTemplates"
              :key="template.id"
              type="button"
              class="appearance-layout-template-option"
              :class="{ 'is-active': selectedHomeLayoutTemplate.id === template.id }"
              :data-testid="`appearance-layout-template-${template.id}`"
              @click="setAppearanceHomeTemplate(template.id)"
            >
              <span class="appearance-layout-preview" aria-hidden="true">
                <span
                  v-for="slot in template.slots"
                  :key="slot.id"
                  class="appearance-layout-preview-slot"
                  :class="`is-size-${slot.size.replace('x', '-')}`"
                  :style="homeLayoutSlotToGridStyle(slot)"
                ></span>
              </span>
              <span>{{ homeLayoutTemplateLabel(template) }}</span>
            </button>
          </div>
        </div>
      </section>

      <section class="appearance-display-card">
        <div class="appearance-display-copy">
          <p>{{ t('桌面显示', 'Home Display') }}</p>
          <h2>{{ t('今日视图智能面板', 'Today Smart Panel') }}</h2>
          <span>{{ t('控制主屏左侧 Today View 是否显示智能概览。', 'Controls whether Today View shows the smart summary panel.') }}</span>
        </div>
        <button
          type="button"
          class="appearance-display-toggle"
          :class="{ 'is-on': smartPanelEnabled }"
          :aria-pressed="smartPanelEnabled"
          data-testid="appearance-smart-panel-toggle"
          @click="toggleSmartPanel"
        >
          <span></span>
          <em>{{ smartPanelEnabled ? t('开', 'On') : t('关', 'Off') }}</em>
        </button>
      </section>

      <div class="appearance-menu-stack">
        <button
          class="appearance-menu-card"
          @click="openMenu('theme')"
        >
          <div class="appearance-menu-icon is-theme">
            <i class="fas fa-palette"></i>
          </div>
          <div class="appearance-menu-copy">
            <p>{{ t('整体主题美化', 'Theme Styling') }}</p>
            <span>{{ t('主题、壁纸与全局 CSS', 'Theme, wallpaper and global CSS') }}</span>
          </div>
          <i class="fas fa-chevron-right appearance-menu-chevron"></i>
        </button>

        <button
          class="appearance-menu-card"
          @click="openMenu('font')"
        >
          <div class="appearance-menu-icon is-font">
            <i class="fas fa-font"></i>
          </div>
          <div class="appearance-menu-copy">
            <p>{{ t('字体', 'Font') }}</p>
            <span>{{ t('全局字体族与自定义字体栈', 'Global font family and custom stack') }}</span>
          </div>
          <i class="fas fa-chevron-right appearance-menu-chevron"></i>
        </button>

      </div>
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
            <AssetThumbnailOption
              v-for="asset in wallpaperQuickAssetOptions"
              :key="`wallpaper-chip-${asset.id}`"
              :asset="asset"
              :preview-url="wallpaperQuickPreviewMap[asset.id]"
              :selected="
                currentWallpaperMode === 'gallery' && currentWallpaperAsset?.id === asset.id
                  ? true
                  : selectedWallpaperAssetId === asset.id
              "
              :selection-tone="
                currentWallpaperMode === 'gallery' && currentWallpaperAsset?.id === asset.id
                  ? 'sky'
                  : 'slate'
              "
              variant="portrait"
              @select="applyQuickWallpaperAsset(asset.id)"
            >
              <template #overlay>
                <AssetStatusBadge
                  v-if="currentWallpaperMode === 'gallery' && currentWallpaperAsset?.id === asset.id"
                  label-zh="使用中"
                  label-en="Live"
                  tone="sky-solid"
                  :truncate="false"
                  class="absolute left-1.5 top-1.5 font-semibold"
                />
              </template>
            </AssetThumbnailOption>
          </div>
        </div>
        <div class="appearance-mobile-action-strip">
          <button type="button" @click="openAppearanceSheet('wallpaper')">
            <i class="fas fa-sliders"></i>
            <span>{{ t('管理壁纸来源', 'Manage wallpaper source') }}</span>
          </button>
        </div>

        <div
          class="appearance-execute-panel appearance-wallpaper-editor rounded-2xl border border-gray-100 bg-gray-50 p-3 space-y-3"
          :class="{ 'is-open': activeAppearanceSheet === 'wallpaper' }"
        >
          <div class="appearance-sheet-head">
            <div>
              <span>{{ t('壁纸来源', 'Wallpaper Source') }}</span>
              <strong>{{ currentWallpaperModeLabel }}</strong>
            </div>
            <button type="button" @click="closeAppearanceSheet" :aria-label="t('关闭面板', 'Close panel')">
              <i class="fas fa-xmark"></i>
            </button>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-700">
              {{ t('壁纸来源', 'Wallpaper Source') }}
            </p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">
              {{
                t(
                  '统一使用项目图片来源选择器；本地文件仍先进入 Gallery，再作为壁纸素材引用。',
                  'Uses the shared project image source picker; local files still enter Gallery first, then become wallpaper assets.',
                )
              }}
            </p>
          </div>
          <ImageSourcePicker
            v-model:source-type="wallpaperSourceDraft"
            v-model:image-url="customWallpaperUrlInput"
            v-model:gallery-asset-id="selectedWallpaperAssetId"
            :source-options="WALLPAPER_SOURCE_OPTIONS"
            :gallery-assets="wallpaperAssets"
            test-id-prefix="appearance-wallpaper"
            url-placeholder-zh="https:// 壁纸图片地址"
            url-placeholder-en="https:// wallpaper image URL"
            gallery-placeholder-zh="请选择壁纸素材"
            gallery-placeholder-en="Select a wallpaper asset"
          />
          <div class="flex gap-2">
            <button
              @click="
                wallpaperSourceDraft === 'gallery'
                  ? applyGalleryWallpaper()
                  : wallpaperSourceDraft === 'url'
                    ? applyWallpaperUrl()
                    : useThemeWallpaperSource()
              "
              class="flex-1 px-3 py-2 rounded-md text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              {{ t('应用壁纸来源', 'Apply Wallpaper Source') }}
            </button>
            <button
              @click="useThemeWallpaperSource"
              class="px-3 py-2 rounded-md text-sm border border-gray-200 bg-white hover:bg-gray-50"
            >
              {{ t('恢复默认', 'Reset') }}
            </button>
          </div>
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

      <div class="appearance-mobile-action-strip">
        <button type="button" data-testid="appearance-open-css-editor" @click="openAppearanceSheet('css')">
          <i class="fas fa-code"></i>
          <span>{{ t('全局 CSS', 'Global CSS') }}</span>
        </button>
      </div>

      <div
        class="appearance-execute-panel appearance-css-editor bg-white rounded-xl p-4 shadow-sm"
        :class="{ 'is-open': activeAppearanceSheet === 'css' }"
      >
        <div class="appearance-sheet-head">
          <div>
            <span>{{ t('高级', 'Advanced') }}</span>
            <strong>{{ t('全局 CSS', 'Global CSS') }}</strong>
          </div>
          <button type="button" @click="closeAppearanceSheet" :aria-label="t('关闭面板', 'Close panel')">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs text-gray-500 block">{{ t('全局 CSS（高级）', 'Global CSS (Advanced)') }}</label>
          <button class="text-[11px] text-blue-500" @click="clearCustomCss">{{ t('清空', 'Clear') }}</button>
        </div>
        <textarea
          v-model="settings.appearance.customCss"
          class="w-full h-36 border border-gray-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
          data-testid="appearance-global-css-input"
          placeholder=".app-shell { --home-widget-bg: rgba(255,255,255,0.5); }"
        ></textarea>
        <div class="mt-4 space-y-3">
          <div
            class="rounded-xl border border-slate-200 bg-white p-3 space-y-3"
            data-testid="appearance-pack-panel"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold text-slate-800">{{ t('外观包', 'Appearance Pack') }}</p>
                <p class="text-[11px] leading-5 text-slate-500">
                  {{
                    t(
                      '导出全局主题、壁纸、字体变量与全局 CSS；不包含 App 图标、单 App 皮肤、桌面布局、小组件或 Chat 外观。',
                      'Exports global theme, wallpaper, font variables, and global CSS; excludes app icons, app skins, Home layout, widgets, and Chat appearance.',
                    )
                  }}
                </p>
              </div>
              <button
                type="button"
                class="rounded-md border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700"
                data-testid="appearance-pack-clear"
                @click="clearAppearancePackBuffers"
              >
                {{ t('清空', 'Clear') }}
              </button>
            </div>
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                class="rounded-md bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white"
                data-testid="appearance-pack-export"
                @click="exportAppearancePack"
              >
                {{ t('导出 JSON', 'Export JSON') }}
              </button>
              <button
                type="button"
                class="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700"
                data-testid="appearance-pack-import"
                @click="importAppearancePack"
              >
                {{ t('导入 JSON', 'Import JSON') }}
              </button>
            </div>
            <textarea
              v-model="appearancePackExportText"
              class="w-full border border-slate-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
              data-testid="appearance-pack-export-output"
              readonly
              placeholder="{ &quot;kind&quot;: &quot;schatphone.appearance-pack&quot; }"
            ></textarea>
            <textarea
              v-model="appearancePackImportText"
              class="w-full border border-slate-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
              data-testid="appearance-pack-import-input"
              placeholder="{ &quot;appearance&quot;: { &quot;customCss&quot;: &quot;...&quot; } }"
            ></textarea>
            <p
              v-if="appearancePackStatus.message"
              class="rounded-md border px-2 py-2 text-[11px] font-medium"
              :class="appearancePackStatusClass"
              data-testid="appearance-pack-status"
            >
              {{ appearancePackStatus.message }}
            </p>
          </div>
        </div>
        <div class="appearance-sheet-actions">
          <button type="button" @click="saveAppearance(); closeAppearanceSheet()">
            <i class="fas fa-check"></i>
            <span>{{ t('保存 CSS', 'Save CSS') }}</span>
          </button>
        </div>
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

      <div class="appearance-mobile-action-strip">
        <button type="button" @click="openFontEditor">
          <i class="fas fa-pen-to-square"></i>
          <span>{{ t('编辑自定义字体', 'Edit custom font') }}</span>
        </button>
      </div>

      <div
        class="appearance-execute-panel appearance-font-editor bg-white rounded-xl p-4 shadow-sm"
        :class="{ 'is-open': activeAppearanceSheet === 'font' }"
      >
        <div class="appearance-sheet-head">
          <div>
            <span>{{ t('字体', 'Font') }}</span>
            <strong>{{ t('自定义字体栈', 'Custom font stack') }}</strong>
          </div>
          <button type="button" @click="closeAppearanceSheet" :aria-label="t('关闭面板', 'Close panel')">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
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

    <button
      v-if="activeAppearanceSheet"
      type="button"
      class="appearance-mobile-sheet-backdrop"
      :aria-label="t('关闭面板', 'Close panel')"
      @click="closeAppearanceSheet"
    ></button>

  </div>
</template>

<style scoped>
.appearance-shell {
  position: relative;
  isolation: isolate;
  background: var(--system-page-bg);
  color: var(--system-text);
}

.appearance-header {
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
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
  display: grid;
  gap: 14px;
}

.appearance-menu-card {
  width: 100%;
  min-height: 72px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px;
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
  color: var(--system-text);
  text-align: left;
  transition:
    transform var(--system-motion-fast),
    background var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
  -webkit-tap-highlight-color: transparent;
}

.appearance-menu-card:active {
  transform: scale(0.992);
  background: var(--system-elevated-bg);
  box-shadow: var(--system-shadow-control);
}

.appearance-menu-icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--system-on-accent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.appearance-menu-stack {
  display: grid;
  gap: 10px;
}

.appearance-menu-copy {
  min-width: 0;
  flex: 1 1 auto;
  display: grid;
  gap: 3px;
}

.appearance-menu-copy p {
  margin: 0;
  color: var(--system-text);
  font-size: 14px;
  line-height: 1.2;
  font-weight: 790;
}

.appearance-menu-copy span {
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.3;
}

.appearance-menu-chevron {
  flex: 0 0 auto;
  color: var(--system-text-soft);
  font-size: 11px;
}

.appearance-menu-icon.is-theme {
  background: linear-gradient(135deg, #5d8295 0%, #385e75 100%);
}

.appearance-menu-icon.is-font {
  background: linear-gradient(135deg, #334155 0%, #111827 100%);
}

.appearance-layout-card {
  border: 1px solid var(--system-card-border);
  border-radius: 24px;
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
  padding: 14px;
  display: grid;
  gap: 12px;
}

.appearance-display-card {
  border: 1px solid var(--system-card-border);
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.appearance-display-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.appearance-display-copy p,
.appearance-display-copy h2,
.appearance-display-copy span {
  margin: 0;
}

.appearance-display-copy p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.appearance-display-copy h2 {
  color: var(--system-text);
  font-size: 15px;
  line-height: 1.18;
  font-weight: 820;
}

.appearance-display-copy span {
  color: var(--system-text-soft);
  font-size: 11px;
  line-height: 1.35;
}

.appearance-display-toggle {
  flex: 0 0 auto;
  width: 62px;
  height: 32px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 3px;
  color: var(--system-text-soft);
  background: var(--system-control-bg);
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.appearance-display-toggle span {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--system-surface-primary);
  box-shadow: var(--system-shadow-control);
  transition: transform 180ms ease;
}

.appearance-display-toggle em {
  position: absolute;
  right: 8px;
  color: currentColor;
  font-size: 9px;
  font-style: normal;
  font-weight: 840;
}

.appearance-display-toggle.is-on {
  border-color: var(--system-accent);
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.appearance-display-toggle.is-on span {
  transform: translateX(28px);
}

.appearance-display-toggle.is-on em {
  right: auto;
  left: 8px;
}

.appearance-overview-card {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  padding: 15px;
  display: grid;
  gap: 14px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--system-accent-soft) 70%, transparent), transparent 62%),
    var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
  backdrop-filter: blur(var(--system-blur-md)) saturate(1.1);
  -webkit-backdrop-filter: blur(var(--system-blur-md)) saturate(1.1);
}

.appearance-overview-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.appearance-overview-copy span {
  color: var(--system-text-soft);
  font-size: 11px;
  font-weight: 780;
}

.appearance-overview-copy h2 {
  margin: 0;
  color: var(--system-text);
  font-size: 24px;
  line-height: 1.08;
  font-weight: 840;
  letter-spacing: 0;
}

.appearance-overview-copy p {
  margin: 0;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.35;
  font-weight: 680;
}

.appearance-overview-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 9px;
}

.appearance-overview-actions button {
  min-width: 0;
  min-height: 40px;
  border: 1px solid var(--system-control-border);
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 10px;
  color: var(--system-text);
  background: var(--system-control-bg);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
  font-size: 12px;
  font-weight: 780;
  -webkit-tap-highlight-color: transparent;
}

.appearance-overview-actions button:active {
  transform: scale(0.985);
  background: var(--system-pressed-bg);
}

.appearance-layout-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.appearance-layout-head p,
.appearance-layout-head h2 {
  margin: 0;
  letter-spacing: 0;
}

.appearance-layout-head p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.appearance-layout-head h2 {
  margin-top: 2px;
  color: var(--system-text);
  font-size: 17px;
  line-height: 1.15;
  font-weight: 750;
}

.appearance-layout-head button {
  min-height: 36px;
  border: 1px solid var(--system-control-border);
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  color: var(--system-text);
  background: var(--system-control-bg);
  box-shadow: var(--system-shadow-control);
  font-size: 12px;
  font-weight: 750;
  -webkit-tap-highlight-color: transparent;
}

.appearance-layout-pages,
.appearance-layout-preview-row {
  display: grid;
  grid-auto-flow: column;
  overflow-x: auto;
  padding: 1px 1px 2px;
  scrollbar-width: none;
}

.appearance-layout-pages::-webkit-scrollbar,
.appearance-layout-preview-row::-webkit-scrollbar {
  display: none;
}

.appearance-layout-pages {
  grid-auto-columns: 88px;
  gap: 8px;
}

.appearance-layout-page,
.appearance-layout-template-option {
  min-width: 0;
  border: 1px solid var(--system-subtle-border);
  border-radius: 18px;
  display: grid;
  gap: 6px;
  padding: 7px;
  color: var(--system-text);
  background: var(--system-control-bg);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
  text-align: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform var(--system-motion-fast),
    border-color var(--system-motion-fast),
    background var(--system-motion-fast);
}

.appearance-layout-page:active,
.appearance-layout-template-option:active {
  transform: scale(0.98);
}

.appearance-layout-page.is-active,
.appearance-layout-template-option.is-active {
  border-color: color-mix(in srgb, var(--system-accent) 72%, transparent);
  background: var(--system-accent-soft);
}

.appearance-layout-page-label,
.appearance-layout-template-option > span:last-child,
.appearance-layout-page small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appearance-layout-page-label {
  color: var(--system-text);
  font-size: 10px;
  font-weight: 850;
}

.appearance-layout-page small,
.appearance-layout-template-option > span:last-child {
  color: var(--system-text-muted);
  font-size: 9px;
  line-height: 1.1;
  font-weight: 800;
}

.appearance-layout-preview {
  min-width: 0;
  aspect-ratio: 4 / 6;
  border: 1px solid var(--system-subtle-border);
  border-radius: 16px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: 2px;
  padding: 4px;
  background: var(--system-surface-muted);
  overflow: hidden;
}

.appearance-layout-library {
  display: grid;
  gap: 8px;
}

.appearance-layout-library-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.appearance-layout-library-head span,
.appearance-layout-library-head strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appearance-layout-library-head span {
  color: var(--system-text-muted);
  font-size: 10px;
  font-weight: 850;
}

.appearance-layout-library-head strong {
  color: var(--system-text);
  font-size: 11px;
  font-weight: 780;
}

.appearance-layout-preview-row {
  grid-auto-columns: 74px;
  gap: 8px;
}

.appearance-layout-template-option {
  border-radius: 16px;
  padding: 6px;
}

.appearance-layout-template-option .appearance-layout-preview {
  border-radius: 14px;
}

.appearance-layout-preview-slot {
  min-width: 0;
  min-height: 0;
  border-radius: 6px;
  background: color-mix(in oklab, var(--system-text-muted) 20%, transparent);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.appearance-layout-preview-slot.is-size-1-1 {
  border-radius: 5px;
  background: color-mix(in oklab, var(--system-text-muted) 24%, transparent);
}

.appearance-layout-preview-slot.is-size-4-3,
.appearance-layout-preview-slot.is-size-4-4 {
  background: color-mix(in oklab, var(--system-text-muted) 16%, transparent);
}

.appearance-shell :deep(.bg-white) {
  background-color: var(--system-panel-bg);
  border-color: var(--system-card-border);
}

.appearance-shell :deep(.bg-gray-50),
.appearance-shell :deep(.bg-gray-100),
.appearance-shell :deep(.bg-gray-200) {
  background-color: var(--system-surface-muted);
}

.appearance-shell :deep(.text-black),
.appearance-shell :deep(.text-gray-700),
.appearance-shell :deep(.text-gray-800),
.appearance-shell :deep(.text-gray-900) {
  color: var(--system-text);
}

.appearance-shell :deep(.text-gray-300),
.appearance-shell :deep(.text-gray-400) {
  color: var(--system-text-soft);
}

.appearance-shell :deep(.text-gray-500),
.appearance-shell :deep(.text-gray-600) {
  color: var(--system-text-muted);
}

.appearance-shell :deep(.text-blue-500),
.appearance-shell :deep(.text-blue-600),
.appearance-shell :deep(.text-blue-700),
.appearance-shell :deep(.text-sky-700),
.appearance-shell :deep(.text-sky-800),
.appearance-shell :deep(.text-violet-700),
.appearance-shell :deep(.text-violet-800) {
  color: var(--system-accent);
}

.appearance-shell :deep(.border-gray-100),
.appearance-shell :deep(.border-gray-200),
.appearance-shell :deep(.border-white\/80),
.appearance-shell :deep(.border-sky-100),
.appearance-shell :deep(.border-violet-100),
.appearance-shell :deep(.border-blue-500) {
  border-color: var(--system-control-border);
}

.appearance-shell :deep(input),
.appearance-shell :deep(textarea),
.appearance-shell :deep(select) {
  color: var(--system-text);
  background-color: var(--system-control-bg);
  border-color: var(--system-control-border);
}

.appearance-shell :deep(input:focus),
.appearance-shell :deep(textarea:focus),
.appearance-shell :deep(select:focus) {
  background-color: var(--system-control-bg-strong);
  box-shadow: 0 0 0 4px var(--system-focus-ring);
}

.appearance-shell :deep(.bg-blue-50),
.appearance-shell :deep(.bg-sky-50\/50),
.appearance-shell :deep(.bg-violet-50\/50),
.appearance-shell :deep(.bg-blue-100),
.appearance-shell :deep(.bg-sky-100),
.appearance-shell :deep(.bg-violet-100) {
  background-color: var(--system-accent-soft);
}

.appearance-shell :deep(.bg-gray-300) {
  background-color: var(--system-control-bg);
}

.appearance-shell :deep(.rounded-xl.p-4.shadow-sm),
.appearance-shell :deep(.rounded-xl.p-4.shadow-sm.space-y-3),
.appearance-shell :deep(.rounded-2xl.border.p-3),
.appearance-shell :deep(.rounded-2xl.border.border-gray-100.bg-gray-50.p-3) {
  border: 1px solid var(--system-card-border);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.appearance-shell :deep(.rounded-md),
.appearance-shell :deep(.rounded-lg),
.appearance-shell :deep(.rounded-xl),
.appearance-shell :deep(.rounded-2xl) {
  border-color: var(--system-control-border);
}

.appearance-shell :deep(.shadow-sm) {
  box-shadow: var(--system-shadow-card);
}

.appearance-shell :deep(.bg-green-500) {
  color: var(--system-on-success);
  background-color: var(--system-success);
}

.appearance-shell :deep(.bg-blue-500),
.appearance-shell :deep(.bg-violet-500),
.appearance-shell :deep(.bg-emerald-500),
.appearance-shell :deep(.bg-gray-900) {
  color: var(--system-on-accent);
  background-color: var(--system-accent);
}

.appearance-shell :deep(.text-white) {
  color: var(--system-on-accent);
}

.appearance-shell :deep(.font-mono) {
  color: var(--system-text);
}

.appearance-shell :deep(.break-all) {
  color: var(--system-text-muted);
}

.appearance-shell :deep(.hover\:bg-gray-50:hover),
.appearance-shell :deep(.hover\:bg-blue-600:hover),
.appearance-shell :deep(.hover\:bg-black:hover) {
  background-color: var(--system-pressed-bg);
}

.appearance-mobile-action-strip,
.appearance-sheet-head,
.appearance-mobile-sheet-backdrop {
  display: none;
}

.appearance-execute-panel {
  position: relative;
}

.appearance-sheet-actions {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .appearance-menu-card {
    transition: none;
  }
}

@media (max-width: 719px) {
  .appearance-shell.is-appearance-sheet-open > div[class*="overflow-y-auto"] {
    overflow: visible;
  }

  .appearance-mobile-action-strip {
    display: grid;
    margin: -2px 0 0;
  }

  .appearance-mobile-action-strip button,
  .appearance-sheet-actions button {
    min-height: 46px;
    border: 1px solid var(--system-control-border);
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 13px;
    color: var(--system-text);
    background: var(--system-control-bg);
    box-shadow: var(--system-shadow-control);
    font-size: 13px;
    font-weight: 800;
    -webkit-tap-highlight-color: transparent;
  }

  .appearance-mobile-action-strip button:active,
  .appearance-sheet-actions button:active {
    transform: scale(0.985);
    background: var(--system-pressed-bg);
  }

  .appearance-execute-panel {
    display: none;
  }

  .appearance-execute-panel.is-open {
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: calc(8px + env(safe-area-inset-bottom));
    z-index: 75;
    display: grid;
    gap: 12px;
    max-height: min(78%, calc(100% - 108px));
    overflow-y: auto;
    overscroll-behavior: contain;
    border: 1px solid var(--system-card-border);
    border-radius: 28px 28px 24px 24px;
    padding: 12px;
    background: var(--system-elevated-bg);
    box-shadow: var(--system-shadow-soft);
  }

  .appearance-mobile-sheet-backdrop {
    position: absolute;
    inset: 0;
    z-index: 70;
    display: block;
    border: 0;
    background: rgba(18, 25, 32, 0.3);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .appearance-sheet-head {
    position: sticky;
    top: -12px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: -12px -12px 0;
    padding: 12px;
    border-bottom: 1px solid var(--system-subtle-border);
    background: color-mix(in srgb, var(--system-elevated-bg) 88%, transparent);
    backdrop-filter: blur(var(--system-blur-sm));
    -webkit-backdrop-filter: blur(var(--system-blur-sm));
  }

  .appearance-sheet-head div {
    min-width: 0;
  }

  .appearance-sheet-head span,
  .appearance-sheet-head strong {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .appearance-sheet-head span {
    color: var(--system-text-muted);
    font-size: 11px;
    font-weight: 760;
  }

  .appearance-sheet-head strong {
    margin-top: 2px;
    color: var(--system-text);
    font-size: 16px;
    line-height: 1.2;
  }

  .appearance-sheet-head button {
    width: 36px;
    height: 36px;
    border: 1px solid var(--system-control-border);
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    color: var(--system-text);
    background: var(--system-control-bg);
    box-shadow: var(--system-shadow-control);
  }

  .appearance-css-editor textarea {
    min-height: 220px;
  }

  .appearance-sheet-actions {
    display: grid;
  }
}

@media (max-width: 380px) {
  .appearance-layout-pages {
    grid-auto-columns: 84px;
  }

  .appearance-layout-preview-row {
    grid-auto-columns: 70px;
  }
}
</style>
