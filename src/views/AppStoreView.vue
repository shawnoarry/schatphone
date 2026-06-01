<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useAppIconImagePreviews } from '../composables/useAppIconImagePreviews'
import AppIconVisual from '../components/shared/AppIconVisual.vue'
import {
  APP_ICON_ACCENT_OPTIONS,
  APP_ICON_PRESET_OPTIONS,
  resolveAppAccentLabel,
  resolveAppIconMeta,
  resolveAppIconPresetLabel,
} from '../lib/app-icon-presentation'
import {
  APP_SKIN_PRESETS,
  normalizeAppSkinSetting,
  resolveAppSkinTargetForAppId,
} from '../lib/app-skin-customization'
import {
  buildHomeSourceQuery,
  buildRouteWithReturnSource,
  pushReturnTarget,
} from '../lib/navigation-return'
import { buildActiveWorldAppEntryRows } from '../lib/world-pack-app-bindings'
import {
  APP_STORE_HOME_APP_ID,
  APP_STORE_ROUTE,
  BOOK_HOME_APP_ID,
  BOOK_ROUTE,
} from '../lib/planned-module-registry'
import { useGalleryStore } from '../stores/gallery'
import { useSystemStore } from '../stores/system'

const router = useRouter()
const route = useRoute()
const { t, systemLanguage, languageBase } = useI18n()
const systemStore = useSystemStore()
const galleryStore = useGalleryStore()
const { settings } = storeToRefs(systemStore)

const locale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))
const appIconOverrides = computed(() => settings.value.appearance?.appIconOverrides || {})
const { appIconImageUrl, refreshPreviews: refreshAppStoreIconPreviews } = useAppIconImagePreviews({
  galleryStore,
  appIconOverrides,
  locale,
  scopeId: 'app-store-app-icons',
})
const DOCK_APP_IDS = new Set(['app_chat', 'app_contacts', 'app_settings', 'app_widgets'])
const APP_STORE_PROTECTED_HOME_IDS = new Set([APP_STORE_HOME_APP_ID])
const APP_STORE_FILTERS = [
  'all',
  'home',
  'library',
  'System',
  'Social',
  'Life',
  'Style',
  'Media',
  'Productivity',
  'Finance',
  'Archive',
  'World',
]

const APP_STORE_ENTRIES = [
  {
    id: APP_STORE_HOME_APP_ID,
    route: APP_STORE_ROUTE,
    labelZh: '应用商城',
    labelEn: 'App Store',
    categoryZh: '系统',
    categoryEn: 'System',
    descZh: '管理预安装 APP 的主屏入口，不执行真实下载。',
    descEn: 'Manage preinstalled app entries on Home without real downloads.',
  },
  {
    id: 'app_network',
    route: '/network',
    labelZh: '网络',
    labelEn: 'Network',
    categoryZh: '系统',
    categoryEn: 'System',
    descZh: '模型、连接与接口配置。',
    descEn: 'Models, connections, and API configuration.',
  },
  {
    id: 'app_settings',
    route: '/settings',
    labelZh: '设置',
    labelEn: 'Settings',
    categoryZh: '系统',
    categoryEn: 'System',
    descZh: '语言、通知、备份与运行设置。',
    descEn: 'Language, notifications, backup, and runtime settings.',
  },
  {
    id: 'app_control_center',
    route: '/control-center',
    labelZh: '世界中枢',
    labelEn: 'World Hub',
    categoryZh: '系统',
    categoryEn: 'System',
    descZh: '查看事件运行时、关系记忆与世界状态。',
    descEn: 'Review event runtime, relationship memory, and world state.',
  },
  {
    id: BOOK_HOME_APP_ID,
    route: BOOK_ROUTE,
    labelZh: '文本库',
    labelEn: 'Book',
    categoryZh: '资料',
    categoryEn: 'Archive',
    descZh: '保存世界书、知识点和规则文本，再由世界书设置选择启用。',
    descEn: 'Store worldbooks, knowledge notes, and rule text, then activate them from WorldBook settings.',
  },
  {
    id: 'app_chat',
    route: '/chat',
    labelZh: '聊天',
    labelEn: 'Chat',
    categoryZh: '社交',
    categoryEn: 'Social',
    descZh: '角色会话与沉浸式消息。',
    descEn: 'Role conversations and immersive messages.',
  },
  {
    id: 'app_contacts',
    route: '/contacts',
    labelZh: '联系人',
    labelEn: 'Contacts',
    categoryZh: '社交',
    categoryEn: 'Social',
    descZh: '联系人、角色档案与关系资料。',
    descEn: 'Contacts, role profiles, and relationship records.',
  },
  {
    id: 'app_phone',
    route: '/phone',
    labelZh: '电话',
    labelEn: 'Phone',
    categoryZh: '生活',
    categoryEn: 'Life',
    descZh: '通话入口与来电记录。',
    descEn: 'Calls and phone logs.',
  },
  {
    id: 'app_gallery',
    route: '/gallery',
    labelZh: '相册',
    labelEn: 'Photos',
    categoryZh: '媒体',
    categoryEn: 'Media',
    descZh: '图片素材、壁纸与角色媒体。',
    descEn: 'Images, wallpapers, and role media.',
  },
  {
    id: 'app_map',
    route: '/map',
    labelZh: '地图',
    labelEn: 'Map',
    categoryZh: '生活',
    categoryEn: 'Life',
    descZh: '地点、路线与移动线索。',
    descEn: 'Places, routes, and movement cues.',
  },
  {
    id: 'app_calendar',
    route: '/calendar',
    labelZh: '日历',
    labelEn: 'Calendar',
    categoryZh: '效率',
    categoryEn: 'Productivity',
    descZh: '日程、时间与提醒上下文。',
    descEn: 'Schedule, time, and reminder context.',
  },
  {
    id: 'app_reminders',
    route: '/reminders',
    labelZh: '提醒事项',
    labelEn: 'Reminders',
    categoryZh: '效率',
    categoryEn: 'Productivity',
    descZh: '待办、跟进与轻量提醒。',
    descEn: 'Tasks, follow-ups, and lightweight reminders.',
  },
  {
    id: 'app_wallet',
    route: '/wallet',
    labelZh: '钱包',
    labelEn: 'Wallet',
    categoryZh: '财务',
    categoryEn: 'Finance',
    descZh: '余额、转账与消费记录。',
    descEn: 'Balance, transfers, and spending records.',
  },
  {
    id: 'app_stock',
    route: '/stock',
    labelZh: '股票',
    labelEn: 'Stock',
    categoryZh: '财务',
    categoryEn: 'Finance',
    descZh: '模拟行情与资产线索。',
    descEn: 'Simulated market and asset cues.',
  },
  {
    id: 'app_shopping',
    route: '/shopping',
    labelZh: '购物',
    labelEn: 'Shopping',
    categoryZh: '生活',
    categoryEn: 'Life',
    descZh: '购物平台文件夹与订单线索。',
    descEn: 'Shopping platform folder and order cues.',
    entryKind: 'folder',
  },
  {
    id: 'app_food_delivery',
    route: '/food-delivery',
    labelZh: '外卖',
    labelEn: 'Food',
    categoryZh: '生活',
    categoryEn: 'Life',
    descZh: '餐饮、外卖与配送状态。',
    descEn: 'Food, delivery, and rider status.',
    entryKind: 'folder',
  },
  {
    id: 'app_assets',
    route: '/assets',
    labelZh: '资产',
    labelEn: 'Assets',
    categoryZh: '资料',
    categoryEn: 'Archive',
    descZh: '长期拥有物、记录与资产档案。',
    descEn: 'Owned things, records, and asset archive.',
  },
  {
    id: 'app_themes',
    route: '/appearance',
    labelZh: '外观',
    labelEn: 'Appearance',
    categoryZh: '美化',
    categoryEn: 'Style',
    descZh: '主题、壁纸、图标与主屏布局。',
    descEn: 'Themes, wallpapers, icons, and Home layout.',
  },
  {
    id: 'app_widgets',
    route: '/widgets',
    labelZh: '组件',
    labelEn: 'Widgets',
    categoryZh: '美化',
    categoryEn: 'Style',
    descZh: '组件库、自定义组件与导入。',
    descEn: 'Widget library, custom widgets, and imports.',
  },
]

const normalizeInitialFilter = (value = '') => {
  const rawValue = Array.isArray(value) ? value[0] : value
  const normalized = String(rawValue || '').trim()
  const lowered = normalized.toLowerCase()
  if (lowered === 'world' || lowered === 'world_apps' || lowered === 'world-apps') return 'World'
  return APP_STORE_FILTERS.includes(normalized) ? normalized : 'all'
}

const selectedFilter = ref(normalizeInitialFilter(route.query.section || route.query.filter))
const selectedAppId = ref('app_chat')
const searchQuery = ref('')
const libraryNotice = ref('')
const detailSheetOpen = ref(false)
let libraryNoticeTimerId = null

const visibleHomeAppIds = computed(
  () => new Set((settings.value.appearance?.homeWidgetPages || []).flat()),
)

const homeAppPageMap = computed(() => {
  const map = new Map()
  const pages = settings.value.appearance?.homeWidgetPages || []
  pages.forEach((page, pageIndex) => {
    const appIds = Array.isArray(page) ? page : []
    appIds.forEach((appId) => {
      if (typeof appId === 'string' && appId.trim()) {
        map.set(appId, pageIndex)
      }
    })
  })
  return map
})

const worldAppStoreEntries = computed(() =>
  buildActiveWorldAppEntryRows({ systemStore }).map((entry) => ({
    ...entry,
    categoryZh: entry.categoryZh || 'World',
    categoryEn: entry.categoryEn || 'World',
  })),
)

const appStoreBaseEntries = computed(() => [
  ...APP_STORE_ENTRIES,
  ...worldAppStoreEntries.value,
])

const appStoreItems = computed(() =>
  appStoreBaseEntries.value.map((entry) => {
    const iconMeta = entry.worldAppEntry
      ? {
          icon: entry.icon || 'fas fa-globe',
          accent: entry.accent || 'default',
          toneClass: entry.toneClass || `accent-${entry.accent || 'default'}`,
        }
      : resolveAppIconMeta(entry.id, appIconOverrides.value, locale.value)
    const visible = visibleHomeAppIds.value.has(entry.id)
    const inDock = DOCK_APP_IDS.has(entry.id)
    return {
      ...entry,
      icon: iconMeta.icon,
      accent: iconMeta.accent,
      toneClass: iconMeta.toneClass,
      sourceType: iconMeta.sourceType || 'preset',
      galleryAssetId: iconMeta.galleryAssetId || '',
      hasImageIcon: iconMeta.hasImageIcon === true,
      iconImageUrl: entry.worldAppEntry ? '' : appIconImageUrl(entry.id),
      label: t(entry.labelZh, entry.labelEn),
      category: t(entry.categoryZh, entry.categoryEn),
      desc: t(entry.descZh, entry.descEn),
      visible,
      inDock,
      homePageIndex: homeAppPageMap.value.get(entry.id),
      protectedHomeEntry: APP_STORE_PROTECTED_HOME_IDS.has(entry.id),
    }
  }),
)

const visibleAppCount = computed(
  () => appStoreItems.value.filter((item) => item.visible).length,
)
const libraryAppCount = computed(() => Math.max(0, appStoreItems.value.length - visibleAppCount.value))
const featuredApps = computed(() => appStoreItems.value.filter((item) => ['app_chat', 'app_shopping', 'app_widgets'].includes(item.id)))
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())

function appMatchesFilter(app, filterId) {
  if (filterId === 'all') return true
  if (filterId === 'home') return app.visible
  if (filterId === 'library') return !app.visible
  return app.categoryEn === filterId
}

function appMatchesSearch(app) {
  const query = normalizedSearchQuery.value
  if (!query) return true
  return [
    app.id,
    app.label,
    app.labelZh,
    app.labelEn,
    app.category,
    app.categoryZh,
    app.categoryEn,
    app.desc,
    app.descZh,
    app.descEn,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query)
}

function filterLabel(filterId) {
  if (filterId === 'all') return t('全部', 'All')
  if (filterId === 'home') return t('主屏', 'Home')
  if (filterId === 'library') return t('库内', 'Library')
  if (filterId === 'System') return t('系统', 'System')
  if (filterId === 'Social') return t('社交', 'Social')
  if (filterId === 'Life') return t('生活', 'Life')
  if (filterId === 'Style') return t('美化', 'Style')
  if (filterId === 'Media') return t('媒体', 'Media')
  if (filterId === 'Productivity') return t('效率', 'Productivity')
  if (filterId === 'Finance') return t('财务', 'Finance')
  if (filterId === 'Archive') return t('资料', 'Archive')
  if (filterId === 'World') return t('世界', 'World')
  return filterId
}

const appStoreFilters = computed(() =>
  APP_STORE_FILTERS.map((filterId) => ({
    id: filterId,
    label: filterLabel(filterId),
    count: appStoreItems.value.filter((item) => appMatchesFilter(item, filterId)).length,
  })).filter((filter) => filter.id === 'all' || filter.count > 0),
)

const filteredAppStoreItems = computed(() =>
  appStoreItems.value
    .filter((item) => appMatchesFilter(item, selectedFilter.value))
    .filter((item) => appMatchesSearch(item)),
)

const selectedApp = computed(() => {
  const selected = appStoreItems.value.find((item) => item.id === selectedAppId.value)
  if (selected && appMatchesFilter(selected, selectedFilter.value) && appMatchesSearch(selected)) return selected
  return filteredAppStoreItems.value[0] || null
})

const selectedAppPlacementLabel = computed(() => {
  if (selectedApp.value?.protectedHomeEntry) return t('今日视图', 'Today View')
  if (selectedApp.value?.visible && Number.isInteger(selectedApp.value.homePageIndex)) {
    return t(`第 ${selectedApp.value.homePageIndex + 1} 屏`, `Screen ${selectedApp.value.homePageIndex + 1}`)
  }
  if (selectedApp.value?.inDock) return 'Dock'
  return t('应用库', 'Library')
})

const selectedAppStatusLabel = computed(() => {
  if (selectedApp.value?.protectedHomeEntry) return t('固定入口', 'Fixed')
  if (selectedApp.value?.visible) return t('主屏可见', 'On Home')
  if (selectedApp.value?.inDock) return t('Dock 常驻', 'In Dock')
  return t('库内待放置', 'In Library')
})

const selectedAppEntryKindLabel = computed(() => {
  if (selectedApp.value?.entryKind === 'folder') return t('文件夹', 'Folder')
  if (selectedApp.value?.entryKind === 'world_app') return t('世界入口', 'World App')
  return 'APP'
})

const selectedWorldAppDetailRows = computed(() => {
  const app = selectedApp.value
  if (!app?.worldAppEntry) return []
  return [
    {
      key: 'pack',
      label: t('世界包', 'World Pack'),
      value: t(
        app.worldPackTitle || app.worldPackName || app.worldPackId,
        app.worldPackName || app.worldPackTitle || app.worldPackId,
      ),
    },
    {
      key: 'target',
      label: t('目标模块', 'Target module'),
      value: app.targetLabel || app.moduleKey || t('模块', 'Module'),
    },
    {
      key: 'binding',
      label: t('入口绑定', 'Binding'),
      value: app.worldAppBindingId || app.bindingId || '',
    },
  ].filter((row) => row.value)
})

const selectedWorldAppHandoff = computed(() => {
  const app = selectedApp.value
  if (!app?.worldAppEntry) return null
  const packLabel = t(
    app.worldPackTitle || app.worldPackName || app.worldPackId,
    app.worldPackName || app.worldPackTitle || app.worldPackId,
  )
  const targetLabel = app.targetLabel || app.moduleKey || t('目标应用', 'Target app')
  const title =
    languageBase.value === 'zh'
      ? `${packLabel} 的世界入口`
      : `World entry from ${packLabel}`
  const launchCopy =
    languageBase.value === 'zh'
      ? `打开后进入 ${targetLabel}，并带入这个世界设定包的上下文。`
      : `Opens ${targetLabel} with this World Pack context.`

  return {
    title,
    launchCopy,
    ownerCopy: t(
      '应用商城负责放置和打开这个入口；世界书仍负责设定包启用、审核和来源管理。',
      'App Store manages placement and launch. WorldBook still owns pack activation, review, and source management.',
    ),
  }
})

const selectedAppCanCustomizeIdentity = computed(() => Boolean(selectedApp.value && !selectedApp.value.worldAppEntry))
const selectedAppSkinTarget = computed(() =>
  selectedApp.value?.worldAppEntry ? null : resolveAppSkinTargetForAppId(selectedApp.value?.id),
)
const selectedAppCanCustomizeSkin = computed(() => Boolean(selectedAppSkinTarget.value))
const galleryIconAssets = computed(() => galleryStore.assets.slice(0, 120))
const identityEditorOpen = ref(false)
const identityFeedback = ref('')
const identityFileInput = ref(null)
const identityDraftPreviewUrl = ref('')
const identityDraft = reactive({
  sourceType: 'preset',
  icon: '',
  accent: 'default',
  galleryAssetId: '',
})
let identityDraftPreviewVersion = 0
const skinEditorOpen = ref(false)
const skinFeedback = ref('')
const skinDraft = reactive({
  presetId: 'system_default',
  customCssEnabled: false,
  customCss: '',
})

const syncIdentityDraftFromSelectedApp = () => {
  const app = selectedApp.value
  if (!app) return
  const meta = resolveAppIconMeta(app.id, appIconOverrides.value, locale.value)
  identityDraft.sourceType = meta.hasImageIcon ? 'gallery' : 'preset'
  identityDraft.icon = meta.icon
  identityDraft.accent = meta.accent
  identityDraft.galleryAssetId = meta.galleryAssetId || ''
  identityFeedback.value = ''
}

const identityPreviewMeta = computed(() => {
  const app = selectedApp.value
  if (!app) return {}
  return resolveAppIconMeta(
    app.id,
    {
      [app.id]: {
        sourceType: identityDraft.sourceType,
        icon: identityDraft.icon,
        accent: identityDraft.accent,
        galleryAssetId: identityDraft.sourceType === 'gallery' ? identityDraft.galleryAssetId : '',
      },
    },
    locale.value,
  )
})

const refreshIdentityDraftPreview = async () => {
  const currentVersion = identityDraftPreviewVersion + 1
  identityDraftPreviewVersion = currentVersion
  if (identityDraft.sourceType !== 'gallery' || !identityDraft.galleryAssetId) {
    identityDraftPreviewUrl.value = ''
    return
  }

  const asset = galleryStore.findAssetById(identityDraft.galleryAssetId)
  if (!asset) {
    identityDraftPreviewUrl.value = ''
    return
  }

  const url = await galleryStore.getAssetPreviewUrl(identityDraft.galleryAssetId, {
    scopeId: 'app-store-identity-draft',
  })
  if (currentVersion !== identityDraftPreviewVersion) return
  identityDraftPreviewUrl.value = typeof url === 'string' ? url : ''
}

watch(
  () => [identityDraft.sourceType, identityDraft.galleryAssetId, galleryStore.hasFinishedStorageHydration],
  refreshIdentityDraftPreview,
  { immediate: true },
)

const openIdentityEditor = () => {
  if (!selectedAppCanCustomizeIdentity.value) return
  syncIdentityDraftFromSelectedApp()
  detailSheetOpen.value = false
  identityEditorOpen.value = true
}

const closeIdentityEditor = () => {
  identityEditorOpen.value = false
}

const syncSkinDraftFromSelectedApp = () => {
  const target = selectedAppSkinTarget.value
  if (!target) return
  const current = normalizeAppSkinSetting(settings.value.appearance?.appSkins?.[target.scope])
  skinDraft.presetId = current.presetId
  skinDraft.customCssEnabled = current.customCssEnabled
  skinDraft.customCss = current.customCss
  skinFeedback.value = ''
}

const openSkinEditor = () => {
  if (!selectedAppCanCustomizeSkin.value) return
  syncSkinDraftFromSelectedApp()
  detailSheetOpen.value = false
  skinEditorOpen.value = true
}

const closeSkinEditor = () => {
  skinEditorOpen.value = false
}

const saveSkinEditor = () => {
  const target = selectedAppSkinTarget.value
  if (!target) return
  systemStore.setAppSkin(target.scope, {
    presetId: skinDraft.presetId,
    customCssEnabled: skinDraft.customCssEnabled,
    customCss: skinDraft.customCss,
  })
  systemStore.saveNow()
  skinFeedback.value = t('这个 APP 的外观已更新。', 'This app skin has been updated.')
  closeSkinEditor()
}

const restoreSkinDefault = () => {
  const target = selectedAppSkinTarget.value
  if (!target) return
  systemStore.resetAppSkin(target.scope)
  systemStore.saveNow()
  syncSkinDraftFromSelectedApp()
  skinFeedback.value = t('已恢复默认 APP 外观。', 'Default app skin restored.')
  closeSkinEditor()
}

watch(
  () => selectedApp.value?.id,
  () => {
    if (identityEditorOpen.value) syncIdentityDraftFromSelectedApp()
    if (skinEditorOpen.value) syncSkinDraftFromSelectedApp()
  },
)

const setIdentitySource = (sourceType) => {
  identityDraft.sourceType = sourceType === 'gallery' ? 'gallery' : 'preset'
}

const saveIdentityEditor = () => {
  if (!selectedApp.value) return
  const saved = systemStore.setAppIconOverride(selectedApp.value.id, {
    sourceType: identityDraft.sourceType,
    icon: identityDraft.icon,
    accent: identityDraft.accent,
    galleryAssetId: identityDraft.sourceType === 'gallery' ? identityDraft.galleryAssetId : '',
  })
  if (!saved) {
    identityFeedback.value = t('请选择可用的图标样式或图片。', 'Choose an available icon style or image.')
    return
  }
  systemStore.saveNow()
  void refreshAppStoreIconPreviews()
  identityFeedback.value = t('图标已更新。', 'Icon updated.')
  closeIdentityEditor()
}

const restoreIdentityDefault = () => {
  if (!selectedApp.value) return
  systemStore.clearAppIconOverride(selectedApp.value.id)
  systemStore.saveNow()
  void refreshAppStoreIconPreviews()
  syncIdentityDraftFromSelectedApp()
  identityFeedback.value = t('已恢复默认图标。', 'Default icon restored.')
  closeIdentityEditor()
}

const openIdentityUpload = () => {
  identityFileInput.value?.click()
}

const handleIdentityUpload = async (event) => {
  const files = event?.target?.files
  if (!files || files.length === 0) return
  const result = await galleryStore.importAssetsFromFiles(files, { category: 'reference' })
  if (event?.target) event.target.value = ''

  if (!result.ok && (!Array.isArray(result.duplicateAssetIds) || result.duplicateAssetIds.length === 0)) {
    identityFeedback.value = t('没有可用的图片文件。', 'No usable image file was imported.')
    return
  }

  const assetId = result.importedIds?.[0] || result.duplicateAssetIds?.[0] || ''
  if (!assetId) {
    identityFeedback.value = t('图片已跳过，请换一张。', 'Image was skipped. Try another one.')
    return
  }

  identityDraft.sourceType = 'gallery'
  identityDraft.galleryAssetId = assetId
  identityFeedback.value = t('图片已加入相册并设为待保存图标。', 'Image added to Gallery and selected for this icon.')
  await nextTick()
}

const appStoreItemStateKey = (app) => {
  if (app?.protectedHomeEntry) return 'fixed'
  if (app?.visible) return 'home'
  if (app?.inDock) return 'dock'
  return 'library'
}

const appStoreItemStateLabel = (app) => {
  const state = appStoreItemStateKey(app)
  if (state === 'fixed') return t('固定', 'Fixed')
  if (state === 'home') return t('主屏', 'Home')
  if (state === 'dock') return 'Dock'
  return t('库内', 'Library')
}

const appStoreItemPlacementNote = (app) => {
  if (app?.protectedHomeEntry) return t('今日视图固定', 'Fixed in Today View')
  if (app?.visible && Number.isInteger(app.homePageIndex)) {
    return t(`第 ${app.homePageIndex + 1} 屏`, `Screen ${app.homePageIndex + 1}`)
  }
  if (app?.inDock) return t('Dock 常驻', 'Pinned in Dock')
  return t('可选择槽位', 'Ready for slot')
}

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const currentHomePageQueryValue = () => {
  const value = Array.isArray(route.query.homePage) ? route.query.homePage[0] : route.query.homePage
  const pageIndex = Number(value)
  return Number.isInteger(pageIndex) && pageIndex >= 0 ? String(pageIndex) : '0'
}

const openSelectedApp = () => {
  if (!selectedApp.value?.route) return
  if (selectedApp.value.routeQuery) {
    router.push({
      path: selectedApp.value.route,
      query: buildHomeSourceQuery(currentHomePageQueryValue(), selectedApp.value.routeQuery),
    })
    return
  }
  router.push(buildRouteWithReturnSource(selectedApp.value.route, 'home', { homePage: route.query.homePage }))
}

const selectFilter = (filterId) => {
  selectedFilter.value = filterId
  detailSheetOpen.value = false
  const firstMatch = appStoreItems.value.find((item) => appMatchesFilter(item, filterId) && appMatchesSearch(item))
  if (firstMatch) selectedAppId.value = firstMatch.id
}

const selectApp = (appId) => {
  selectedAppId.value = appId
  detailSheetOpen.value = true
}

const clearAppSearch = () => {
  searchQuery.value = ''
  detailSheetOpen.value = false
  const firstMatch = appStoreItems.value.find((item) => appMatchesFilter(item, selectedFilter.value))
  if (firstMatch) selectedAppId.value = firstMatch.id
}

const closeDetailSheet = () => {
  detailSheetOpen.value = false
}

const editSelectedAppOnHome = () => {
  if (!selectedApp.value) return
  const query = {
    homePage: Number.isInteger(selectedApp.value.homePageIndex)
      ? String(selectedApp.value.homePageIndex)
      : currentHomePageQueryValue(),
    widgetEdit: '1',
  }
  if (selectedApp.value.visible) {
    query.focusTile = selectedApp.value.id
  } else {
    query.libraryTile = selectedApp.value.id
  }
  router.push({ path: '/home', query })
}

const showNotice = (message) => {
  libraryNotice.value = message
  if (libraryNoticeTimerId) clearTimeout(libraryNoticeTimerId)
  libraryNoticeTimerId = setTimeout(() => {
    libraryNotice.value = ''
  }, 1500)
}

const removeSelectedAppFromHome = () => {
  if (!selectedApp.value?.visible || selectedApp.value.protectedHomeEntry) return
  const appId = selectedApp.value.id
  const pages = (settings.value.appearance?.homeWidgetPages || []).map((page) =>
    (Array.isArray(page) ? page : []).filter((tileId) => tileId !== appId),
  )
  systemStore.setHomeWidgetPages(pages)
  systemStore.saveNow()
  showNotice(t('已从主屏移除，应用仍在商城内。', 'Removed from Home. The app stays in Store.'))
}

onBeforeUnmount(() => {
  if (libraryNoticeTimerId) clearTimeout(libraryNoticeTimerId)
  galleryStore.releaseAssetPreviewScope('app-store-identity-draft')
})
</script>

<template>
  <div class="app-store-view">
    <header class="app-store-topbar">
      <button type="button" class="app-store-back" @click="goHome">
        <i class="fas fa-chevron-left"></i>
        <span>{{ t('主页', 'Home') }}</span>
      </button>
      <div class="app-store-title">
        <span>{{ t('系统应用', 'System Apps') }}</span>
        <h1>{{ t('应用商城', 'App Store') }}</h1>
      </div>
    </header>

    <main class="app-store-scroll no-scrollbar">
      <section class="app-store-hero">
        <div class="app-store-hero-copy">
          <p>{{ t('预安装应用库', 'Preinstalled Library') }}</p>
          <h2>{{ t('选择哪些 APP 出现在主屏', 'Choose what appears on Home') }}</h2>
          <span>{{ t('这里不下载新功能，只管理入口和简介。', 'No downloads here, only entries and app summaries.') }}</span>
        </div>
        <div class="app-store-hero-stats">
          <span>
            <strong>{{ visibleAppCount }}</strong>
            {{ t('主屏', 'Home') }}
          </span>
          <span>
            <strong>{{ libraryAppCount }}</strong>
            {{ t('库内', 'Library') }}
          </span>
        </div>
      </section>

      <section class="app-store-featured" aria-label="Featured apps">
        <button
          v-for="app in featuredApps"
          :key="app.id"
          type="button"
          class="app-store-featured-item"
          @click="selectApp(app.id)"
        >
          <AppIconVisual
            class="app-store-featured-icon"
            :meta="app"
            :image-url="app.iconImageUrl"
            :alt="app.label"
          />
          <div>
            <strong>{{ app.label }}</strong>
            <small>{{ app.desc }}</small>
          </div>
        </button>
      </section>

      <section class="app-store-panel">
        <label class="app-store-search" data-testid="app-store-search-wrap">
          <i class="fas fa-magnifying-glass"></i>
          <input
            v-model="searchQuery"
            type="search"
            :placeholder="t('搜索 APP', 'Search apps')"
            data-testid="app-store-search"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="app-store-search-clear"
            :aria-label="t('清除搜索', 'Clear search')"
            data-testid="app-store-search-clear"
            @click="clearAppSearch"
          >
            <i class="fas fa-xmark"></i>
          </button>
        </label>

        <div class="app-store-filter-row" role="tablist" :aria-label="t('应用分类', 'App categories')">
          <button
            v-for="filter in appStoreFilters"
            :key="filter.id"
            type="button"
            class="app-store-filter"
            :class="{ 'is-active': selectedFilter === filter.id }"
            role="tab"
            :aria-selected="selectedFilter === filter.id"
            :data-testid="`app-store-filter-${filter.id}`"
            @click="selectFilter(filter.id)"
          >
            <span>{{ filter.label }}</span>
            <small>{{ filter.count }}</small>
          </button>
        </div>

        <div class="app-store-layout">
          <div class="app-store-list" aria-label="App Store list">
            <button
              v-for="app in filteredAppStoreItems"
              :key="app.id"
              type="button"
              class="app-store-item"
              :class="[
                `is-state-${appStoreItemStateKey(app)}`,
                { 'is-visible': app.visible, 'is-selected': selectedApp?.id === app.id },
              ]"
              :data-testid="`app-store-item-${app.id}`"
              :aria-label="`${app.label} · ${appStoreItemStateLabel(app)}`"
              @click="selectApp(app.id)"
            >
              <AppIconVisual
                class="app-store-item-icon"
                :meta="app"
                :image-url="app.iconImageUrl"
                :alt="app.label"
              />
              <span class="app-store-item-copy">
                <span class="app-store-item-title">
                  <strong>{{ app.label }}</strong>
                  <em>{{ app.category }}</em>
                </span>
                <small>{{ app.desc }}</small>
                <span class="app-store-item-placement">
                  <i class="fas fa-location-dot" aria-hidden="true"></i>
                  {{ appStoreItemPlacementNote(app) }}
                </span>
              </span>
              <span class="app-store-item-state">
                <i aria-hidden="true"></i>
                <span>{{ appStoreItemStateLabel(app) }}</span>
              </span>
            </button>
            <div v-if="filteredAppStoreItems.length === 0" class="app-store-empty" data-testid="app-store-empty">
              <i class="fas fa-magnifying-glass"></i>
              <strong>{{ t('没有找到应用', 'No apps found') }}</strong>
              <span>{{ t('换个关键词或分类试试。', 'Try another search or category.') }}</span>
            </div>
          </div>

          <article v-if="selectedApp" class="app-store-detail app-store-detail-inline" data-testid="app-store-detail">
            <div class="app-store-detail-hero">
              <AppIconVisual
                class="app-store-detail-icon"
                :meta="selectedApp"
                :image-url="selectedApp.iconImageUrl"
                :alt="selectedApp.label"
              />
              <div>
                <p>{{ selectedApp.category }}</p>
                <h2>{{ selectedApp.label }}</h2>
                <span>{{ selectedAppPlacementLabel }}</span>
              </div>
              <button
                type="button"
                class="app-store-detail-close"
                :aria-label="t('关闭详情', 'Close detail')"
                @click="closeDetailSheet"
              >
                <i class="fas fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
            <p class="app-store-detail-desc">{{ selectedApp.desc }}</p>
            <div class="app-store-detail-stats">
              <span>
                <small>{{ t('状态', 'Status') }}</small>
                <strong>{{ selectedAppStatusLabel }}</strong>
              </span>
              <span>
                <small>{{ t('入口', 'Entry') }}</small>
                <strong>{{ selectedAppEntryKindLabel }}</strong>
              </span>
            </div>
            <section
              v-if="selectedWorldAppHandoff"
              class="app-store-world-handoff"
              data-testid="app-store-world-handoff"
            >
              <div>
                <i class="fas fa-globe" aria-hidden="true"></i>
                <strong>{{ selectedWorldAppHandoff.title }}</strong>
              </div>
              <p>{{ selectedWorldAppHandoff.launchCopy }}</p>
              <small>{{ selectedWorldAppHandoff.ownerCopy }}</small>
            </section>
            <div
              v-if="selectedWorldAppDetailRows.length"
              class="app-store-world-meta"
              data-testid="app-store-world-app-meta"
            >
              <span
                v-for="row in selectedWorldAppDetailRows"
                :key="row.key"
              >
                <small>{{ row.label }}</small>
                <strong>{{ row.value }}</strong>
              </span>
            </div>
            <div class="app-store-actions">
              <button type="button" class="app-store-action is-primary" @click="openSelectedApp" data-testid="app-store-open">
                <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
                <span>{{ t('打开', 'Open') }}</span>
              </button>
              <button
                v-if="selectedAppCanCustomizeIdentity"
                type="button"
                class="app-store-action"
                data-testid="app-store-open-identity"
                @click="openIdentityEditor"
              >
                <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
                <span>{{ t('图标与外观', 'Icon & Appearance') }}</span>
              </button>
              <button
                v-if="selectedAppCanCustomizeSkin"
                type="button"
                class="app-store-action"
                data-testid="app-store-open-skin"
                @click="openSkinEditor"
              >
                <i class="fas fa-palette" aria-hidden="true"></i>
                <span>{{ t('APP 皮肤', 'App Skin') }}</span>
              </button>
              <button type="button" class="app-store-action" @click="editSelectedAppOnHome" data-testid="app-store-add-home">
                <i :class="selectedApp.visible ? 'fas fa-table-cells' : 'fas fa-plus'" aria-hidden="true"></i>
                <span>{{ selectedApp.visible ? t('调整位置', 'Edit on Home') : t('加入主屏', 'Add to Home') }}</span>
              </button>
              <button
                v-if="selectedApp.visible && !selectedApp.protectedHomeEntry"
                type="button"
                class="app-store-action is-danger"
                @click="removeSelectedAppFromHome"
                data-testid="app-store-remove-home"
              >
                <i class="fas fa-minus" aria-hidden="true"></i>
                <span>{{ t('移出主屏', 'Remove') }}</span>
              </button>
            </div>
            <p v-if="selectedApp.protectedHomeEntry" class="app-store-protected-note">
              {{ t('这是系统入口，会固定保留在今日视图，确保应用商城始终可返回。', 'This system entry stays fixed in Today View so App Store remains reachable.') }}
            </p>
          </article>
        </div>

        <div v-if="libraryNotice" class="app-store-notice" aria-live="polite">
          <i class="fas fa-check-circle"></i>
          <span>{{ libraryNotice }}</span>
        </div>
      </section>
    </main>
    <div v-if="selectedApp && detailSheetOpen" class="app-store-detail-backdrop" @click="closeDetailSheet"></div>
    <article
      v-if="selectedApp && detailSheetOpen"
      class="app-store-detail app-store-detail-sheet"
      data-testid="app-store-detail-sheet"
    >
      <div class="app-store-detail-hero">
        <AppIconVisual
          class="app-store-detail-icon"
          :meta="selectedApp"
          :image-url="selectedApp.iconImageUrl"
          :alt="selectedApp.label"
        />
        <div>
          <p>{{ selectedApp.category }}</p>
          <h2>{{ selectedApp.label }}</h2>
          <span>{{ selectedAppPlacementLabel }}</span>
        </div>
        <button
          type="button"
          class="app-store-detail-close"
          :aria-label="t('关闭详情', 'Close detail')"
          @click="closeDetailSheet"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <p class="app-store-detail-desc">{{ selectedApp.desc }}</p>
      <div class="app-store-detail-stats">
        <span>
          <small>{{ t('状态', 'Status') }}</small>
          <strong>{{ selectedAppStatusLabel }}</strong>
        </span>
        <span>
          <small>{{ t('入口', 'Entry') }}</small>
          <strong>{{ selectedAppEntryKindLabel }}</strong>
        </span>
      </div>
      <section
        v-if="selectedWorldAppHandoff"
        class="app-store-world-handoff"
        data-testid="app-store-world-handoff-sheet"
      >
        <div>
          <i class="fas fa-globe" aria-hidden="true"></i>
          <strong>{{ selectedWorldAppHandoff.title }}</strong>
        </div>
        <p>{{ selectedWorldAppHandoff.launchCopy }}</p>
        <small>{{ selectedWorldAppHandoff.ownerCopy }}</small>
      </section>
      <div
        v-if="selectedWorldAppDetailRows.length"
        class="app-store-world-meta"
        data-testid="app-store-world-app-meta-sheet"
      >
        <span
          v-for="row in selectedWorldAppDetailRows"
          :key="row.key"
        >
          <small>{{ row.label }}</small>
          <strong>{{ row.value }}</strong>
        </span>
      </div>
      <div class="app-store-actions">
        <button
          type="button"
          class="app-store-action is-primary"
          data-testid="app-store-open-sheet"
          @click="openSelectedApp"
        >
          <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
          <span>{{ t('打开', 'Open') }}</span>
        </button>
        <button
          v-if="selectedAppCanCustomizeIdentity"
          type="button"
          class="app-store-action"
          data-testid="app-store-open-identity-sheet"
          @click="openIdentityEditor"
        >
          <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
          <span>{{ t('图标与外观', 'Icon & Appearance') }}</span>
        </button>
        <button
          v-if="selectedAppCanCustomizeSkin"
          type="button"
          class="app-store-action"
          data-testid="app-store-open-skin-sheet"
          @click="openSkinEditor"
        >
          <i class="fas fa-palette" aria-hidden="true"></i>
          <span>{{ t('APP 皮肤', 'App Skin') }}</span>
        </button>
        <button type="button" class="app-store-action" @click="editSelectedAppOnHome">
          <i :class="selectedApp.visible ? 'fas fa-table-cells' : 'fas fa-plus'" aria-hidden="true"></i>
          <span>{{ selectedApp.visible ? t('调整位置', 'Edit on Home') : t('加入主屏', 'Add to Home') }}</span>
        </button>
        <button
          v-if="selectedApp.visible && !selectedApp.protectedHomeEntry"
          type="button"
          class="app-store-action is-danger"
          @click="removeSelectedAppFromHome"
        >
          <i class="fas fa-minus" aria-hidden="true"></i>
          <span>{{ t('移出主屏', 'Remove') }}</span>
        </button>
      </div>
      <p v-if="selectedApp.protectedHomeEntry" class="app-store-protected-note">
        {{ t('这是系统入口，会固定保留在今日视图，确保应用商城始终可返回。', 'This system entry stays fixed in Today View so App Store remains reachable.') }}
      </p>
    </article>
    <div
      v-if="identityEditorOpen"
      class="app-store-identity-backdrop"
      @click="closeIdentityEditor"
    ></div>
    <section
      v-if="identityEditorOpen && selectedApp"
      class="app-store-identity-sheet"
      data-testid="app-store-identity-sheet"
    >
      <div class="app-store-identity-head">
        <div class="app-store-identity-preview">
          <AppIconVisual
            class="app-store-identity-preview-icon"
            :meta="identityPreviewMeta"
            :image-url="identityDraft.sourceType === 'gallery' ? identityDraftPreviewUrl : ''"
            :alt="selectedApp.label"
          />
        </div>
        <div class="app-store-identity-title">
          <p>{{ selectedApp.label }}</p>
          <h2>{{ t('图标与外观', 'Icon & Appearance') }}</h2>
          <span>{{ t('只改变这个 APP 在手机里的样子', 'Changes only this app identity on your phone') }}</span>
        </div>
        <button
          type="button"
          class="app-store-identity-close"
          :aria-label="t('关闭', 'Close')"
          @click="closeIdentityEditor"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div class="app-store-identity-source" role="tablist" :aria-label="t('图标来源', 'Icon source')">
        <button
          type="button"
          :class="{ 'is-active': identityDraft.sourceType === 'preset' }"
          data-testid="app-store-identity-source-preset"
          @click="setIdentitySource('preset')"
        >
          <i class="fas fa-icons" aria-hidden="true"></i>
          <span>{{ t('内置样式', 'Built-in') }}</span>
        </button>
        <button
          type="button"
          :class="{ 'is-active': identityDraft.sourceType === 'gallery' }"
          data-testid="app-store-identity-source-gallery"
          @click="setIdentitySource('gallery')"
        >
          <i class="fas fa-image" aria-hidden="true"></i>
          <span>{{ t('图片图标', 'Image') }}</span>
        </button>
      </div>

      <div class="app-store-identity-fields">
        <label v-if="identityDraft.sourceType === 'preset'" class="app-store-identity-field">
          <span>{{ t('图标', 'Icon') }}</span>
          <select v-model="identityDraft.icon" data-testid="app-store-identity-icon-preset">
            <option
              v-for="option in APP_ICON_PRESET_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ resolveAppIconPresetLabel(option.value, locale) }}
            </option>
          </select>
        </label>

        <label v-else class="app-store-identity-field">
          <span>{{ t('相册图片', 'Gallery image') }}</span>
          <select v-model="identityDraft.galleryAssetId" data-testid="app-store-identity-gallery-asset">
            <option value="">{{ t('选择一张图片', 'Choose an image') }}</option>
            <option
              v-for="asset in galleryIconAssets"
              :key="asset.id"
              :value="asset.id"
            >
              {{ asset.name }}
            </option>
          </select>
        </label>

        <label class="app-store-identity-field">
          <span>{{ t('色调', 'Accent') }}</span>
          <select v-model="identityDraft.accent" data-testid="app-store-identity-accent">
            <option
              v-for="option in APP_ICON_ACCENT_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ resolveAppAccentLabel(option.value, locale) }}
            </option>
          </select>
        </label>
      </div>

      <div class="app-store-identity-upload">
        <button type="button" class="app-store-action" @click="openIdentityUpload">
          <i class="fas fa-upload" aria-hidden="true"></i>
          <span>{{ t('上传图片', 'Upload image') }}</span>
        </button>
        <input
          ref="identityFileInput"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          data-testid="app-store-identity-upload-input"
          @change="handleIdentityUpload"
        />
      </div>

      <p v-if="identityFeedback" class="app-store-identity-feedback" aria-live="polite">
        {{ identityFeedback }}
      </p>

      <div class="app-store-identity-footer">
        <button
          type="button"
          class="app-store-action"
          data-testid="app-store-identity-restore"
          @click="restoreIdentityDefault"
        >
          <i class="fas fa-rotate-left" aria-hidden="true"></i>
          <span>{{ t('恢复默认', 'Restore default') }}</span>
        </button>
        <button
          type="button"
          class="app-store-action is-primary"
          data-testid="app-store-identity-save"
          @click="saveIdentityEditor"
        >
          <i class="fas fa-check" aria-hidden="true"></i>
          <span>{{ t('保存', 'Save') }}</span>
        </button>
      </div>
    </section>
    <div
      v-if="skinEditorOpen"
      class="app-store-identity-backdrop"
      @click="closeSkinEditor"
    ></div>
    <section
      v-if="skinEditorOpen && selectedApp && selectedAppSkinTarget"
      class="app-store-identity-sheet app-store-skin-sheet"
      data-testid="app-store-skin-sheet"
    >
      <div class="app-store-identity-head">
        <AppIconVisual
          class="app-store-identity-preview-icon"
          :meta="selectedApp"
          :image-url="selectedApp.iconImageUrl"
          :alt="selectedApp.label"
        />
        <div class="app-store-identity-title">
          <p>{{ selectedApp.label }}</p>
          <h2>{{ t('APP 皮肤', 'App Skin') }}</h2>
          <span>{{ t('只改变这个 APP 打开后的界面氛围。', 'Changes only this app once it opens.') }}</span>
        </div>
        <button
          type="button"
          class="app-store-identity-close"
          :aria-label="t('关闭', 'Close')"
          @click="closeSkinEditor"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div class="app-store-identity-fields app-store-skin-fields">
        <label class="app-store-identity-field">
          <span>{{ t('内置皮肤', 'Built-in skin') }}</span>
          <select v-model="skinDraft.presetId" data-testid="app-store-skin-preset">
            <option
              v-for="preset in APP_SKIN_PRESETS"
              :key="preset.id"
              :value="preset.id"
            >
              {{ t(preset.labelZh, preset.labelEn) }}
            </option>
          </select>
        </label>

        <label class="app-store-skin-toggle">
          <input
            v-model="skinDraft.customCssEnabled"
            type="checkbox"
            data-testid="app-store-skin-css-enabled"
          />
          <span>{{ t('启用这个 APP 的自定义 CSS', 'Enable custom CSS for this app') }}</span>
        </label>

        <label class="app-store-identity-field app-store-skin-css-field">
          <span>{{ t('这个 APP 的 CSS', 'CSS for this app') }}</span>
          <textarea
            v-model="skinDraft.customCss"
            data-testid="app-store-skin-css-input"
            spellcheck="false"
          ></textarea>
        </label>
      </div>

      <p v-if="skinFeedback" class="app-store-identity-feedback" aria-live="polite">
        {{ skinFeedback }}
      </p>

      <div class="app-store-identity-footer">
        <button
          type="button"
          class="app-store-action"
          data-testid="app-store-skin-restore"
          @click="restoreSkinDefault"
        >
          <i class="fas fa-rotate-left" aria-hidden="true"></i>
          <span>{{ t('恢复默认', 'Restore default') }}</span>
        </button>
        <button
          type="button"
          class="app-store-action is-primary"
          data-testid="app-store-skin-save"
          @click="saveSkinEditor"
        >
          <i class="fas fa-check" aria-hidden="true"></i>
          <span>{{ t('保存', 'Save') }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.app-store-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--system-text);
  background: var(--system-page-bg);
}

.app-store-topbar {
  flex: 0 0 auto;
  min-height: 88px;
  padding: 40px 18px 12px;
  display: flex;
  align-items: flex-end;
  gap: 14px;
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
}

.app-store-back {
  min-height: 34px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  color: var(--system-accent);
  background: var(--system-control-bg);
  font-size: 13px;
  font-weight: 760;
}

.app-store-title {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.app-store-title span {
  color: var(--system-text-soft);
  font-size: 11px;
  font-weight: 760;
}

.app-store-title h1 {
  margin: 0;
  color: var(--system-text);
  font-size: 25px;
  line-height: 1.05;
  font-weight: 860;
}

.app-store-scroll {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  display: grid;
  gap: 14px;
}

.app-store-hero,
.app-store-panel,
.app-store-featured-item {
  min-width: 0;
  border: 1px solid var(--system-card-border);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
  backdrop-filter: blur(var(--system-blur-md)) saturate(1.12);
  -webkit-backdrop-filter: blur(var(--system-blur-md)) saturate(1.12);
}

.app-store-hero {
  border-radius: var(--system-radius-lg);
  padding: 17px;
  display: grid;
  gap: 15px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--system-accent-soft) 54%, transparent), transparent 62%),
    var(--system-panel-bg);
}

.app-store-hero-copy p,
.app-store-hero-copy h2,
.app-store-hero-copy span,
.app-store-detail-hero p,
.app-store-detail-hero h2,
.app-store-detail-desc,
.app-store-protected-note {
  margin: 0;
}

.app-store-hero-copy p {
  color: var(--system-accent);
  font-size: 11px;
  font-weight: 820;
}

.app-store-hero-copy h2 {
  margin-top: 5px;
  color: var(--system-text);
  font-size: 22px;
  line-height: 1.08;
  font-weight: 880;
}

.app-store-hero-copy span {
  display: block;
  margin-top: 8px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.app-store-hero-stats,
.app-store-detail-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.app-store-hero-stats span,
.app-store-detail-stats span {
  min-width: 0;
  border: 1px solid var(--system-subtle-border);
  border-radius: 16px;
  display: grid;
  gap: 3px;
  padding: 9px;
  background: var(--system-surface-muted);
}

.app-store-hero-stats strong {
  color: var(--system-text);
  font-size: 22px;
  line-height: 1;
  font-weight: 860;
}

.app-store-hero-stats span {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 760;
}

.app-store-featured {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.app-store-featured-item {
  min-width: 0;
  border-radius: 20px;
  padding: 11px;
  display: grid;
  gap: 9px;
  color: var(--system-text);
  text-align: left;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.app-store-featured-item:active {
  transform: scale(0.98);
}

.app-store-featured-icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: var(--system-shadow-control);
}

.app-store-featured-item strong,
.app-store-featured-item small {
  display: block;
  min-width: 0;
}

.app-store-featured-item strong {
  color: var(--system-text);
  font-size: 12px;
  line-height: 1.15;
  font-weight: 820;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-store-featured-item small {
  margin-top: 4px;
  color: var(--system-text-soft);
  font-size: 10px;
  line-height: 1.35;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.app-store-panel {
  border-radius: var(--system-radius-lg);
  padding: 14px;
}

.app-store-search {
  min-height: 42px;
  margin-bottom: 11px;
  border: 1px solid var(--system-control-border);
  border-radius: 18px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 8px;
  padding: 0 9px 0 12px;
  color: var(--system-text-soft);
  background: var(--system-control-bg);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.app-store-search input {
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--system-text);
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 720;
}

.app-store-search input::placeholder {
  color: var(--system-text-soft);
}

.app-store-search-clear {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--system-text-soft);
  background: var(--system-surface-muted);
}

.app-store-filter-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.app-store-filter {
  flex: 0 0 auto;
  min-height: 32px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
  font-size: 11px;
  font-weight: 800;
}

.app-store-filter small {
  min-width: 20px;
  min-height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--system-text-soft);
  background: var(--system-surface-muted);
  font-size: 10px;
  font-weight: 840;
}

.app-store-filter.is-active {
  border-color: color-mix(in srgb, var(--system-accent) 34%, var(--system-control-border));
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.app-store-filter.is-active small {
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.app-store-layout {
  min-width: 0;
  margin-top: 13px;
  display: grid;
  gap: 12px;
}

.app-store-list {
  min-width: 0;
  display: grid;
  gap: 9px;
}

.app-store-item {
  width: 100%;
  min-height: 82px;
  border: 1px solid var(--system-subtle-border);
  border-radius: 18px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 9px 10px 10px;
  color: var(--system-text);
  text-align: left;
  background: var(--system-control-bg);
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}

.app-store-item:hover {
  border-color: var(--system-control-border);
  background: var(--system-control-bg-strong);
}

.app-store-item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--system-accent) 62%, transparent);
  outline-offset: 2px;
}

.app-store-item:active {
  transform: scale(0.985);
}

.app-store-item.is-selected {
  border-color: color-mix(in srgb, var(--system-accent) 56%, var(--system-subtle-border));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--system-accent) 16%, transparent),
    var(--system-shadow-control);
}

.app-store-item-icon,
.app-store-detail-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--system-shadow-control);
}

.app-store-item-icon {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  font-size: 18px;
}

.app-store-item-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.app-store-item-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
}

.app-store-item-title strong,
.app-store-item-title em {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-store-item-title strong {
  color: var(--system-text);
  font-size: 14px;
  font-weight: 820;
}

.app-store-item-title em {
  flex: 0 1 auto;
  max-width: 40%;
  border-radius: 999px;
  padding: 3px 6px;
  color: var(--system-text-soft);
  background: var(--system-surface-muted);
  font-size: 9px;
  font-style: normal;
  font-weight: 820;
}

.app-store-item-copy small {
  color: var(--system-text-soft);
  font-size: 11px;
  line-height: 1.25;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.app-store-item-placement {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--system-text-muted);
  font-size: 10px;
  font-weight: 780;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-store-item-state {
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 7px;
  color: var(--system-text-soft);
  background: var(--system-surface-muted);
  font-size: 10px;
  font-weight: 840;
  white-space: nowrap;
}

.app-store-item-state i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.72;
}

.app-store-item.is-state-home .app-store-item-state {
  color: var(--system-success);
  background: color-mix(in srgb, var(--system-success) 12%, var(--system-surface-muted));
}

.app-store-item.is-state-fixed .app-store-item-state {
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.app-store-item.is-state-dock .app-store-item-state {
  color: var(--system-info);
  background: color-mix(in srgb, var(--system-info) 12%, var(--system-surface-muted));
}

.app-store-empty {
  min-height: 138px;
  border: 1px dashed var(--system-subtle-border);
  border-radius: 22px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  padding: 18px;
  color: var(--system-text-soft);
  background: var(--system-surface-muted);
  text-align: center;
}

.app-store-empty i {
  font-size: 18px;
}

.app-store-empty strong {
  color: var(--system-text);
  font-size: 14px;
}

.app-store-empty span {
  max-width: 22ch;
  font-size: 11px;
  line-height: 1.4;
}

.app-store-detail {
  border: 1px solid color-mix(in srgb, var(--system-accent) 22%, var(--system-subtle-border));
  border-radius: 24px;
  padding: 13px;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--system-accent-soft) 48%, transparent), transparent 58%),
    var(--system-control-bg-strong);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.app-store-detail-hero {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.app-store-detail-icon {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  font-size: 23px;
}

.app-store-detail-hero p {
  color: var(--system-text-soft);
  font-size: 11px;
  font-weight: 820;
}

.app-store-detail-hero h2 {
  margin-top: 2px;
  color: var(--system-text);
  font-size: 22px;
  line-height: 1.05;
  font-weight: 860;
}

.app-store-detail-hero span {
  display: inline-flex;
  margin-top: 6px;
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--system-accent);
  background: var(--system-accent-soft);
  font-size: 10px;
  font-weight: 840;
}

.app-store-detail-desc {
  margin-top: 12px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.app-store-detail-stats {
  margin-top: 12px;
}

.app-store-detail-stats small {
  color: var(--system-text-soft);
  font-size: 10px;
  font-weight: 780;
}

.app-store-detail-stats strong {
  min-width: 0;
  color: var(--system-text);
  font-size: 12px;
  font-weight: 820;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-store-world-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.app-store-world-meta span {
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--system-info) 18%, var(--system-subtle-border));
  border-radius: 14px;
  display: grid;
  gap: 3px;
  background: color-mix(in srgb, var(--system-info) 8%, var(--system-surface-muted));
  padding: 8px;
}

.app-store-world-meta small {
  color: var(--system-info);
  font-size: 10px;
  font-weight: 820;
}

.app-store-world-meta strong {
  min-width: 0;
  color: var(--system-text);
  font-size: 11px;
  font-weight: 820;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-store-world-handoff {
  margin-top: 12px;
  border: 1px solid color-mix(in srgb, var(--system-info) 24%, var(--system-subtle-border));
  border-radius: 18px;
  display: grid;
  gap: 7px;
  padding: 10px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--system-info) 12%, transparent), transparent 70%),
    var(--system-surface-muted);
}

.app-store-world-handoff div {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--system-info);
}

.app-store-world-handoff i {
  flex: 0 0 auto;
}

.app-store-world-handoff strong,
.app-store-world-handoff p,
.app-store-world-handoff small {
  min-width: 0;
}

.app-store-world-handoff strong {
  color: var(--system-text);
  font-size: 12px;
  line-height: 1.25;
  font-weight: 860;
}

.app-store-world-handoff p {
  margin: 0;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.45;
  font-weight: 720;
}

.app-store-world-handoff small {
  color: var(--system-text-soft);
  font-size: 10px;
  line-height: 1.4;
  font-weight: 760;
}

.app-store-actions {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.app-store-action {
  min-height: 38px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font-size: 12px;
  font-weight: 820;
}

.app-store-action.is-primary {
  border-color: var(--system-accent);
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.app-store-action.is-danger {
  color: var(--system-danger);
  background: color-mix(in srgb, var(--system-danger) 10%, var(--system-control-bg));
}

.app-store-protected-note {
  margin-top: 10px;
  color: var(--system-text-soft);
  font-size: 11px;
  line-height: 1.4;
}

.app-store-detail-sheet,
.app-store-detail-close,
.app-store-detail-backdrop {
  display: none;
}

.app-store-detail-close {
  width: 38px;
  height: 38px;
  border: 1px solid var(--system-control-border);
  border-radius: 15px;
  align-items: center;
  justify-content: center;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
}

.app-store-identity-backdrop {
  position: fixed;
  inset: 0;
  z-index: 48;
  background: rgba(12, 18, 26, 0.32);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.app-store-identity-sheet {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: calc(12px + env(safe-area-inset-bottom));
  z-index: 49;
  max-height: min(78vh, 620px);
  border: 1px solid color-mix(in srgb, var(--system-accent) 28%, var(--system-subtle-border));
  border-radius: 26px;
  padding: 14px;
  display: grid;
  gap: 13px;
  overflow-y: auto;
  color: var(--system-text);
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--system-accent-soft) 56%, transparent), transparent 58%),
    var(--system-panel-bg);
  box-shadow: 0 24px 70px rgba(12, 18, 26, 0.28);
}

.app-store-identity-head {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 12px;
}

.app-store-identity-preview-icon {
  width: 76px;
  height: 76px;
  border-radius: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  box-shadow: var(--system-shadow-card);
}

.app-store-identity-title {
  min-width: 0;
}

.app-store-identity-title p,
.app-store-identity-title h2,
.app-store-identity-title span,
.app-store-identity-feedback {
  margin: 0;
}

.app-store-identity-title p {
  color: var(--system-accent);
  font-size: 11px;
  font-weight: 840;
}

.app-store-identity-title h2 {
  margin-top: 3px;
  color: var(--system-text);
  font-size: 22px;
  line-height: 1.05;
  font-weight: 880;
}

.app-store-identity-title span {
  display: block;
  margin-top: 6px;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.35;
}

.app-store-identity-close {
  width: 38px;
  height: 38px;
  border: 1px solid var(--system-control-border);
  border-radius: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
}

.app-store-identity-source {
  min-height: 40px;
  border: 1px solid var(--system-control-border);
  border-radius: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
  padding: 4px;
  background: var(--system-control-bg);
}

.app-store-identity-source button {
  min-width: 0;
  border: 0;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--system-text-muted);
  background: transparent;
  font-size: 12px;
  font-weight: 820;
}

.app-store-identity-source button.is-active {
  color: var(--system-on-accent);
  background: var(--system-accent);
  box-shadow: var(--system-shadow-control);
}

.app-store-identity-fields {
  display: grid;
  gap: 9px;
}

.app-store-identity-field {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.app-store-identity-field span {
  color: var(--system-text-soft);
  font-size: 11px;
  font-weight: 820;
}

.app-store-identity-field select,
.app-store-identity-field textarea {
  min-width: 0;
  min-height: 40px;
  border: 1px solid var(--system-control-border);
  border-radius: 15px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font-size: 13px;
  font-weight: 760;
  outline: none;
}

.app-store-identity-field select {
  padding: 0 11px;
}

.app-store-identity-field textarea {
  padding: 10px 11px;
}

.app-store-identity-upload {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-store-identity-upload input {
  display: none;
}

.app-store-identity-feedback {
  border: 1px solid color-mix(in srgb, var(--system-info) 22%, var(--system-subtle-border));
  border-radius: 14px;
  padding: 9px 10px;
  color: var(--system-info);
  background: color-mix(in srgb, var(--system-info) 9%, var(--system-control-bg));
  font-size: 11px;
  line-height: 1.35;
  font-weight: 760;
}

.app-store-identity-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
}

.app-store-skin-fields {
  gap: 12px;
}

.app-store-skin-toggle {
  min-height: 42px;
  border: 1px solid var(--system-control-border);
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font-size: 12px;
  font-weight: 760;
}

.app-store-skin-toggle input {
  width: 16px;
  height: 16px;
  accent-color: var(--system-accent);
}

.app-store-skin-toggle span {
  min-width: 0;
}

.app-store-skin-css-field textarea {
  min-height: 140px;
  resize: vertical;
  font-family: "SFMono-Regular", Consolas, monospace;
  line-height: 1.45;
}

.app-store-notice {
  margin-top: 12px;
  border: 1px solid color-mix(in srgb, var(--system-success) 26%, var(--system-subtle-border));
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  color: var(--system-success);
  background: color-mix(in srgb, var(--system-success) 10%, var(--system-control-bg));
  font-size: 12px;
  font-weight: 780;
}

.accent-default {
  color: var(--home-icon-default-fg);
  background: var(--home-icon-default-bg);
}

.accent-warm {
  color: var(--home-icon-warm-fg);
  background: var(--home-icon-warm-bg);
}

.accent-cool {
  color: var(--home-icon-cool-fg);
  background: var(--home-icon-cool-bg);
}

.accent-light {
  color: var(--home-icon-light-fg);
  background: var(--home-icon-light-bg);
}

.accent-dark {
  color: var(--home-icon-dark-fg);
  background: var(--home-icon-dark-bg);
}

button {
  -webkit-tap-highlight-color: transparent;
}

@media (min-width: 520px) {
  .app-store-layout {
    grid-template-columns: minmax(0, 1fr) minmax(200px, 0.78fr);
    align-items: start;
  }

  .app-store-identity-sheet {
    left: 50%;
    right: auto;
    bottom: auto;
    top: 50%;
    width: min(440px, calc(100% - 32px));
    transform: translate(-50%, -50%);
  }
}

@media (max-width: 519px) {
  .app-store-layout {
    display: block;
  }

  .app-store-detail-backdrop {
    position: fixed;
    inset: 0;
    z-index: 34;
    display: block;
    background: rgba(12, 18, 26, 0.26);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .app-store-detail-inline {
    display: none;
  }

  .app-store-detail-sheet {
    position: fixed;
    top: calc(92px + env(safe-area-inset-top));
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 35;
    display: block;
    margin: 0;
    padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
    overflow-y: auto;
    border-radius: 30px 30px 0 0;
    box-shadow: 0 -28px 70px rgba(15, 23, 42, 0.24);
  }

  .app-store-detail-sheet .app-store-detail-hero {
    grid-template-columns: 58px minmax(0, 1fr) 38px;
  }

  .app-store-detail-close {
    display: inline-flex;
  }

  .app-store-actions {
    grid-template-columns: 1fr;
  }
}
</style>
