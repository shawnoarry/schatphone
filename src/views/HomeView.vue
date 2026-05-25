<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { resolveAppIconMeta } from '../lib/app-icon-presentation'
import {
  HOME_LAYOUT_TEMPLATES,
  assignHomeLayoutSlotPlacements,
  canHomeLayoutTileSizeUseSlot,
  getHomeLayoutTemplate,
  homeLayoutSlotIndex,
  homeLayoutSlotToGridStyle,
  normalizeHomeLayoutTemplateIds,
} from '../lib/home-layout-templates'
import {
  HOME_APP_REGISTRY_ADDITIONS,
  HOME_FOLDER_REGISTRY,
  HOME_FOLDER_TILE_KIND,
  resolveHomeFolderChildRoute,
  resolveHomeFolderPresentation,
} from '../lib/home-entry-registry'
import {
  buildHomeSourceQuery,
  buildRouteWithReturnSource,
  normalizeHomePageQuery,
} from '../lib/navigation-return'
import {
  CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP,
  CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM,
  hasCustomWidgetAction,
  normalizeCustomWidgetAction,
  resolveCustomWidgetSystemActionTarget,
} from '../lib/custom-widget-actions'

const props = defineProps({
  currentTime: {
    type: String,
    default: '',
  },
  currentDate: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const { systemLanguage, languageBase, t } = useI18n()
const { confirmDialog } = useDialog()

const { settings, user, availableThemes } = storeToRefs(systemStore)
const homeLocale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))
const appIconOverrides = computed(() => settings.value.appearance.appIconOverrides || {})
const smartPanelEnabled = computed(() => systemStore.isMoreFeatureToggleEnabled('smart_panel'))
const smartPanelItems = computed(() => [
  {
    id: 'today',
    icon: 'fas fa-calendar-check',
    label: t('今日节奏', 'Today'),
    value: props.currentDate || today.value.toLocaleDateString(homeLocale.value),
  },
  {
    id: 'theme',
    icon: 'fas fa-palette',
    label: t('当前主题', 'Theme'),
    value: activeThemeName.value || t('默认', 'Default'),
  },
  {
    id: 'apps',
    icon: 'fas fa-layer-group',
    label: t('主屏页数', 'Pages'),
    value: t(`${totalPages.value} 页`, `${totalPages.value} pages`),
  },
])

const LEFT_HOME_PAGE_INDEX = -1
const DEFAULT_HOME_RETURN_PAGE = 0

const currentPage = ref(DEFAULT_HOME_RETURN_PAGE)
const touchStartX = ref(0)
const touchDeltaX = ref(0)

const layoutEditMode = ref(false)
const longPressStartX = ref(0)
const longPressStartY = ref(0)
const selectedTileId = ref('')
const pressedTileId = ref('')
const droppedTileId = ref('')
const layoutToastText = ref('')
const dragEdgeDirection = ref('')
const ignoreAppOpenUntil = ref(0)
const widgetEntryPressStartX = ref(0)
const widgetEntryPressStartY = ref(0)
const slotContentTarget = ref(null)
const slotContentFilter = ref('all')
const libraryPlacementTileId = ref('')

const dragTileId = ref('')
const dragPointerId = ref(null)
const dragPreviewPageIndex = ref(-1)
const dragPreviewSlotIndex = ref(-1)
const dragGhostX = ref(0)
const dragGhostY = ref(0)
const dragGhostWidth = ref(72)
const dragGhostHeight = ref(72)
const openFolderTileId = ref('')

let longPressTimerId = null
let lastDragPageSwitchAt = 0
let layoutToastTimerId = null
let droppedTileTimerId = null
let widgetEntryLongPressTimerId = null

const LONG_PRESS_MS = 600
const LONG_PRESS_MOVE_THRESHOLD = 12
const DRAG_EDGE_ZONE_PX = 36
const DRAG_PAGE_SWITCH_COOLDOWN_MS = 260
const LAYOUT_SLOT_COLUMNS = 4
const LAYOUT_SLOT_ROWS = 6
const LAYOUT_SLOT_GAP = 12
const LAYOUT_SLOT_HEIGHT = 78
const WIDGET_APP_TILE_ID = 'app_widgets'
const LAYOUT_EDIT_LOCAL_STORAGE_KEY = 'schatphone:layout_edit_enabled'
const LAYOUT_EDIT_ENV_ENABLED =
  typeof import.meta.env.VITE_ENABLE_LAYOUT_EDIT === 'string' &&
  import.meta.env.VITE_ENABLE_LAYOUT_EDIT.toLowerCase() === 'true'

const readLayoutEditLocalFlag = () => {
  if (typeof window === 'undefined') return false
  try {
    const value = window.localStorage.getItem(LAYOUT_EDIT_LOCAL_STORAGE_KEY)
    if (typeof value !== 'string') return false
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
  } catch {
    return false
  }
}

const layoutEditFeatureEnabled = ref(LAYOUT_EDIT_ENV_ENABLED && readLayoutEditLocalFlag())

const WIDGET_VARIANT_META = {
  weather: { label: '天气', icon: 'fas fa-cloud-sun' },
  calendar: { label: '日历', icon: 'fas fa-calendar-days' },
  music: { label: '音乐', icon: 'fas fa-music' },
  system: { label: '系统', icon: 'fas fa-microchip' },
  heart: { label: '快捷爱心', icon: 'fas fa-heart' },
  disc: { label: '快捷唱片', icon: 'fas fa-compact-disc' },
}

const SLOT_CONTENT_FILTERS = ['all', 'apps', 'folders', 'widgets', 'custom']

const CUSTOM_WIDGET_SPAN_CLASS_MAP = {
  '1x1': 'col-span-1 row-span-1',
  '2x1': 'col-span-2 row-span-1',
  '2x2': 'col-span-2 row-span-2',
  '4x1': 'col-span-4 row-span-1',
  '4x2': 'col-span-4 row-span-2',
  '4x3': 'col-span-4 row-span-3',
  '4x4': 'col-span-4 row-span-4',
}

const widgetRegistry = {
  weather: { kind: 'widget', variant: 'weather', span: 'col-span-2 row-span-2' },
  calendar: { kind: 'widget', variant: 'calendar', span: 'col-span-2 row-span-2' },
  music: { kind: 'widget', variant: 'music', span: 'col-span-4 row-span-2' },
  system: { kind: 'widget', variant: 'system', span: 'col-span-2 row-span-2' },
  quick_heart: { kind: 'widget', variant: 'heart', span: 'col-span-1 row-span-1' },
  quick_disc: { kind: 'widget', variant: 'disc', span: 'col-span-1 row-span-1' },
  app_network: { kind: 'app', icon: 'fas fa-network-wired', label: 'Network', accent: 'cool', route: '/network' },
  app_wallet: { kind: 'app', icon: 'fas fa-wallet', label: 'Wallet', accent: 'warm', route: '/wallet' },
  app_gallery: { kind: 'app', icon: 'fas fa-images', label: 'Photos', accent: 'light', route: '/gallery' },
  app_themes: { kind: 'app', icon: 'fas fa-palette', label: 'Themes', accent: 'default', route: '/appearance' },
  app_widgets: { kind: 'app', icon: 'fas fa-table-cells-large', label: 'Widgets', accent: 'light', route: '/widgets' },
  app_phone: { kind: 'app', icon: 'fas fa-phone', label: 'Phone', accent: 'default', route: '/phone' },
  app_map: { kind: 'app', icon: 'fas fa-map-location-dot', label: 'Map', accent: 'cool', route: '/map' },
  app_calendar: { kind: 'app', icon: 'fas fa-calendar-days', label: 'Calendar', accent: 'light', route: '/calendar' },
  app_reminders: { kind: 'app', icon: 'fas fa-list-check', label: 'Reminders', accent: 'warm', route: '/reminders' },
  app_stock: { kind: 'app', icon: 'fas fa-chart-line', label: 'Stock', accent: 'cool', route: '/stock' },
  app_chat: { kind: 'app', icon: 'fas fa-comment', label: 'Chat', accent: 'default', route: '/chat' },
  app_contacts: {
    kind: 'app',
    icon: 'fas fa-address-book',
    label: 'Contacts',
    accent: 'light',
    route: '/contacts',
  },
  app_settings: { kind: 'app', icon: 'fas fa-cog', label: 'Settings', accent: 'dark', route: '/settings' },
  app_files: { kind: 'app', icon: 'fas fa-folder', label: 'Files', accent: 'cool', route: '/files' },
  ...HOME_APP_REGISTRY_ADDITIONS,
  ...HOME_FOLDER_REGISTRY,
  app_more: { kind: 'app', icon: 'fas fa-ellipsis-h', label: 'More', accent: 'default', route: '/more' },
}

const resolveAppTileLabel = (tileId, fallback = '') => {
  if (tileId === 'app_network') return t('网络', 'Network')
  if (tileId === 'app_wallet') return t('钱包', 'Wallet')
  if (tileId === 'app_gallery') return t('相册', 'Photos')
  if (tileId === 'app_themes') return t('外观', 'Themes')
  if (tileId === 'app_widgets') return t('组件', 'Widgets')
  if (tileId === 'app_phone') return t('电话', 'Phone')
  if (tileId === 'app_map') return t('地图', 'Map')
  if (tileId === 'app_calendar') return t('日历', 'Calendar')
  if (tileId === 'app_reminders') return t('提醒事项', 'Reminders')
  if (tileId === 'app_stock') return t('股票', 'Stock')
  if (tileId === 'app_chat') return t('聊天', 'Chat')
  if (tileId === 'app_contacts') return t('联系人', 'Contacts')
  if (tileId === 'app_settings') return t('设置', 'Settings')
  if (tileId === 'app_files') return t('文件', 'Files')
  if (tileId === 'app_shopping') return t('购物', 'Shopping')
  if (tileId === 'app_food_delivery') return t('外卖', 'Food')
  if (tileId === 'app_assets') return t('资产', 'Assets')
  if (tileId === 'app_control_center') return t('世界中枢', 'World Hub')
  if (tileId === 'app_more') return t('更多', 'More')
  return fallback
}

const localizeEntryText = (entry, zhKey = 'zh', enKey = 'en') => {
  if (!entry || typeof entry !== 'object') return ''
  return languageBase.value === 'zh'
    ? entry[zhKey] || entry[enKey] || ''
    : entry[enKey] || entry[zhKey] || ''
}

const resolveWidgetVariantLabel = (variant) => {
  if (variant === 'weather') return t('天气', 'Weather')
  if (variant === 'calendar') return t('日历', 'Calendar')
  if (variant === 'music') return t('音乐', 'Music')
  if (variant === 'system') return t('系统', 'System')
  if (variant === 'heart') return t('快捷爱心', 'Quick Heart')
  if (variant === 'disc') return t('快捷唱片', 'Quick Disc')
  return t('组件', 'Widget')
}

const customWidgets = computed(() => settings.value.appearance.customWidgets || [])
const customWidgetMap = computed(() => {
  const map = new Map()
  customWidgets.value.forEach((widget) => {
    map.set(widget.id, widget)
  })
  return map
})

const customWidgetSrcDocMap = computed(() => {
  const map = new Map()
  customWidgets.value.forEach((widget) => {
    const body = typeof widget.code === 'string' ? widget.code : ''
    map.set(
      widget.id,
      `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
      body { font-family: Inter, "Noto Sans SC", sans-serif; }
      #widget-root { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="widget-root">${body}</div>
  </body>
</html>`,
    )
  })
  return map
})

const widgetPages = computed(() => settings.value.appearance.homeWidgetPages || [])
const totalPages = computed(() => Math.max(widgetPages.value.length, 1))
const homeLayoutTemplateIds = computed(() =>
  normalizeHomeLayoutTemplateIds(settings.value.appearance.homeLayoutTemplateIds, totalPages.value),
)
const homeLayoutSlotPlacements = computed(() =>
  Array.isArray(settings.value.appearance.homeLayoutSlotPlacements)
    ? settings.value.appearance.homeLayoutSlotPlacements
    : [],
)
const homeTrackOffset = computed(() => currentPage.value - LEFT_HOME_PAGE_INDEX)
const homeReturnPageForCurrentView = computed(() =>
  currentPage.value < DEFAULT_HOME_RETURN_PAGE ? DEFAULT_HOME_RETURN_PAGE : currentPage.value,
)
const today = computed(() => new Date())

const tilePageIndexMap = computed(() => {
  const map = new Map()
  widgetPages.value.forEach((page, pageIndex) => {
    page.forEach((tileId) => {
      map.set(tileId, pageIndex)
    })
  })
  return map
})

const activeTheme = computed(() => {
  return availableThemes.value.find((theme) => theme.id === settings.value.appearance.currentTheme) || null
})
const activeThemeName = computed(() => {
  if (!activeTheme.value) return ''
  if (activeTheme.value.id === 'default') return t('默认系统', 'Default System')
  if (activeTheme.value.id === 'zen') return t('石墨静夜', 'Graphite Quiet')
  return activeTheme.value.name || ''
})
const canFreelyMoveHomeTiles = computed(() => layoutEditFeatureEnabled.value === true)
const widgetEditRouteRequested = computed(() => route.query.widgetEdit === '1')
const canDragToPrevPage = computed(() => currentPage.value > 0)
const canDragToNextPage = computed(() => currentPage.value < totalPages.value - 1)
const currentHomeLayoutTemplate = computed(() =>
  getHomeLayoutTemplate(homeLayoutTemplateIds.value[homeReturnPageForCurrentView.value]),
)
const homeLayoutAssignments = computed(() =>
  widgetPages.value.map((page, pageIndex) =>
    assignHomeLayoutSlotPlacements(
      page,
      homeLayoutTemplateForPage(pageIndex),
      homeLayoutSlotPlacements.value[pageIndex],
      tileSizeKeyForId,
    ),
  ),
)

const clampPage = (page) => Math.min(totalPages.value - 1, Math.max(LEFT_HOME_PAGE_INDEX, page))

const setPage = (page) => {
  currentPage.value = clampPage(page)
}

const syncHomePageFromRoute = () => {
  const homePage = normalizeHomePageQuery(route.query.homePage)
  if (!homePage) return
  setPage(Number(homePage))
}

watch(() => route.query.homePage, syncHomePageFromRoute, { immediate: true })

const tileMeta = (tileId) => {
  const builtIn = widgetRegistry[tileId]
  if (builtIn) {
    if (builtIn.kind === 'app') {
      const resolvedIconMeta = resolveAppIconMeta(tileId, appIconOverrides.value, homeLocale.value)
      return {
        ...builtIn,
        icon: resolvedIconMeta.icon,
        accent: resolvedIconMeta.accent,
        label: resolveAppTileLabel(tileId, resolvedIconMeta.label || builtIn.label),
      }
    }
    if (builtIn.kind === HOME_FOLDER_TILE_KIND) {
      const resolvedIconMeta = resolveAppIconMeta(tileId, appIconOverrides.value, homeLocale.value)
      const childEntries = Array.isArray(builtIn.childEntries) ? builtIn.childEntries : []
      return {
        ...builtIn,
        icon: resolvedIconMeta.icon,
        accent: resolvedIconMeta.accent,
        label: resolveAppTileLabel(tileId, resolvedIconMeta.label || builtIn.label),
        childEntries: childEntries.map((entry) => ({
          ...entry,
          label: localizeEntryText(entry),
          desc: localizeEntryText(entry, 'descZh', 'descEn'),
        })),
        presentation: resolveHomeFolderPresentation(builtIn),
      }
    }
    return builtIn
  }

  const customWidget = customWidgetMap.value.get(tileId)
  if (!customWidget) return null

  return {
    kind: 'custom_widget',
    label: customWidget.name,
    span: CUSTOM_WIDGET_SPAN_CLASS_MAP[customWidget.size] || 'col-span-2 row-span-2',
  }
}

const parseSpanToken = (spanClass, token, fallback) => {
  if (typeof spanClass !== 'string') return fallback
  const match = spanClass.match(new RegExp(`${token}-(\\d+)`))
  const value = Number(match?.[1])
  return Number.isInteger(value) && value > 0 ? value : fallback
}

const tileSpanForId = (tileId) => {
  const meta = tileMeta(tileId)
  const spanClass = meta?.span || 'col-span-1 row-span-1'
  const cols = Math.min(LAYOUT_SLOT_COLUMNS, parseSpanToken(spanClass, 'col-span', 1))
  const rows = Math.min(LAYOUT_SLOT_ROWS, parseSpanToken(spanClass, 'row-span', 1))
  return { cols, rows }
}

const tileSizeKeyForId = (tileId) => {
  const { cols, rows } = tileSpanForId(tileId)
  return `${cols}x${rows}`
}

const customWidgetSrcDoc = (tileId) => customWidgetSrcDocMap.value.get(tileId) || ''
const customWidgetAction = (tileId) =>
  normalizeCustomWidgetAction(customWidgetMap.value.get(tileId)?.action)
const customWidgetHasAction = (tileId) => hasCustomWidgetAction(customWidgetAction(tileId))
const customWidgetActionLabel = (tileId) => {
  const widget = customWidgetMap.value.get(tileId)
  return t(`打开 ${widget?.name || '组件'}`, `Open ${widget?.name || 'widget'}`)
}
const hasActiveDrag = computed(() => layoutEditMode.value && !!dragTileId.value)
const dragTileSpan = computed(() => tileSpanForId(dragTileId.value))

const dragGhostMeta = computed(() => {
  const tileId = dragTileId.value
  if (!tileId) return null

  const meta = tileMeta(tileId)
  if (!meta) return null

  if (meta.kind === 'app' || meta.kind === HOME_FOLDER_TILE_KIND) {
    return {
      kind: meta.kind,
      label: meta.label,
      icon: meta.icon,
      accent: meta.accent || 'default',
    }
  }

  if (meta.kind === 'custom_widget') {
    return {
      kind: 'custom_widget',
      label: meta.label || t('自定义组件', 'Custom Widget'),
      icon: 'fas fa-code',
    }
  }

  const variant = WIDGET_VARIANT_META[meta.variant] || {
    label: resolveWidgetVariantLabel(meta.variant),
    icon: 'fas fa-puzzle-piece',
  }
  return {
    kind: 'widget',
    label: resolveWidgetVariantLabel(meta.variant) || variant.label,
    icon: variant.icon,
  }
})

const dragGhostStyle = computed(() => {
  const width = Math.max(58, dragGhostWidth.value)
  const height = Math.max(58, dragGhostHeight.value)
  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate3d(${dragGhostX.value - width / 2}px, ${dragGhostY.value - height / 2}px, 0)`,
  }
})

const canHideTile = (tileId) => typeof tileId === 'string' && tileId !== 'app_files'
const isLibraryPlacementActive = computed(() => layoutEditMode.value && !!libraryPlacementTileId.value)
const openedFolderMeta = computed(() => tileMeta(openFolderTileId.value))
const openedFolderPreviewEntries = computed(() => {
  const entries = Array.isArray(openedFolderMeta.value?.childEntries)
    ? openedFolderMeta.value.childEntries
    : []
  return entries.slice(0, 8)
})

const isWorldHubInstalled = computed(() => systemStore.isMoreFeatureToggleEnabled('control_center'))
const leftPageUtilityEntries = computed(() => [
  {
    id: 'world-hub',
    title: t('世界中枢', 'World Hub'),
    subtitle: isWorldHubInstalled.value
      ? t('已显示在主屏入口库', 'Visible in the Home entry library')
      : t('可在系统开关中显示', 'Available from system switches'),
    status: isWorldHubInstalled.value ? t('已显示', 'Visible') : t('未显示', 'Hidden'),
    icon: 'fas fa-wand-magic-sparkles',
    route: widgetRegistry.app_control_center.route,
    installed: isWorldHubInstalled.value,
  },
  {
    id: 'cheats',
    title: t('金手指', 'Cheats'),
    subtitle: t('保留给特殊规则与事件调节', 'Reserved for special rules and event tuning'),
    status: t('未显示', 'Hidden'),
    icon: 'fas fa-key',
    route: '',
    installed: false,
  },
])

const isTileSelected = (tileId) => layoutEditMode.value && selectedTileId.value === tileId

const canTileFitTemplateSlot = (tileId, slot) => {
  return canHomeLayoutTileSizeUseSlot(tileSizeKeyForId(tileId), slot)
}

const homePageLabel = (pageIndex) => `${t('第', 'Screen ')}${pageIndex + 1}${t('屏', '')}`
const homeLayoutTemplateLabel = (template) => t(`布局 ${template.key}`, `Layout ${template.key}`)
const homeLayoutTemplateForPage = (pageIndex) =>
  getHomeLayoutTemplate(homeLayoutTemplateIds.value[pageIndex])
const isHomeLayoutTemplateSelected = (templateId) => currentHomeLayoutTemplate.value.id === templateId
const homeLayoutAssignmentForPage = (pageIndex) =>
  homeLayoutAssignments.value[pageIndex] || { placements: [], emptySlots: [], overflow: [] }
const homeLayoutPlacementStyle = (placement) => homeLayoutSlotToGridStyle(placement.slot)
const homeLayoutSlotSizeClass = (size = '1x1') => `is-size-${size.replace('x', '-')}`
const homeEditScopeLabel = computed(
  () =>
    `${homePageLabel(homeReturnPageForCurrentView.value)} · ${homeLayoutTemplateLabel(currentHomeLayoutTemplate.value)}`,
)

const selectHomeLayoutTemplate = (templateId) => {
  if (!layoutEditMode.value) return
  closeSlotContentSheet()
  closeHomeContentLibrary()
  systemStore.setHomeLayoutTemplate(homeReturnPageForCurrentView.value, templateId)
  triggerLayoutToast(t('布局已更新', 'Layout updated'))
  maybeVibrate(10)
  systemStore.saveNow()
}

const widgetCandidateLabel = (tileId) => {
  const meta = tileMeta(tileId)
  if (!meta) return t('组件', 'Widget')
  if (meta.kind === 'custom_widget') return meta.label || t('自定义组件', 'Custom Widget')
  if (meta.kind === 'widget') return resolveWidgetVariantLabel(meta.variant)
  return meta.label || t('组件', 'Widget')
}

const widgetCandidateIcon = (tileId) => {
  const meta = tileMeta(tileId)
  if (meta?.kind === 'custom_widget') return 'fas fa-code'
  const variant = WIDGET_VARIANT_META[meta?.variant] || null
  return variant?.icon || 'fas fa-puzzle-piece'
}

const slotCandidateLabel = (tileId) => {
  const meta = tileMeta(tileId)
  if (!meta) return t('项目', 'Item')
  if (meta.kind === 'widget' || meta.kind === 'custom_widget') return widgetCandidateLabel(tileId)
  return meta.label || t('项目', 'Item')
}

const slotCandidateIcon = (tileId) => {
  const meta = tileMeta(tileId)
  if (!meta) return 'fas fa-square'
  if (meta.kind === 'widget' || meta.kind === 'custom_widget') return widgetCandidateIcon(tileId)
  return meta.icon || 'fas fa-square'
}

const slotCandidateFilter = (tileId) => {
  const kind = tileMeta(tileId)?.kind
  if (kind === 'app') return 'apps'
  if (kind === HOME_FOLDER_TILE_KIND) return 'folders'
  if (kind === 'widget') return 'widgets'
  if (kind === 'custom_widget') return 'custom'
  return 'all'
}

const slotContentFilterLabel = (filterId) => {
  if (filterId === 'apps') return t('APP', 'Apps')
  if (filterId === 'folders') return t('文件夹', 'Folders')
  if (filterId === 'widgets') return t('组件', 'Widgets')
  if (filterId === 'custom') return t('自定义', 'Custom')
  return t('全部', 'All')
}

const availableHomeSlotCandidates = computed(() => {
  const placedIds = new Set(widgetPages.value.flat())
  return Object.keys(widgetRegistry)
    .filter((tileId) => !placedIds.has(tileId))
    .filter((tileId) => tileId !== 'app_files')
    .filter((tileId) => {
      if (tileId === 'app_control_center') return isWorldHubInstalled.value
      return true
    })
    .concat(customWidgets.value.map((widget) => widget.id).filter((tileId) => !placedIds.has(tileId)))
    .filter((tileId) => !!tileMeta(tileId))
})

const availableHomeLibraryCandidates = computed(() =>
  availableHomeSlotCandidates.value.map((tileId) => ({
    tileId,
    label: slotCandidateLabel(tileId),
    icon: slotCandidateIcon(tileId),
    size: tileSizeKeyForId(tileId),
    kind: tileMeta(tileId)?.kind || '',
    accent: tileMeta(tileId)?.accent || 'default',
  })),
)
const selectedHomeLibraryCandidate = computed(
  () =>
    availableHomeLibraryCandidates.value.find(
      (candidate) => candidate.tileId === libraryPlacementTileId.value,
    ) || null,
)

const slotContentCandidates = computed(() => {
  const target = slotContentTarget.value
  if (!target?.slot) return []

  return availableHomeSlotCandidates.value
    .filter((tileId) => tileId !== target.tileId)
    .filter((tileId) => canTileFitTemplateSlot(tileId, target.slot))
    .filter((tileId) => slotContentFilter.value === 'all' || slotCandidateFilter(tileId) === slotContentFilter.value)
    .map((tileId) => ({
      tileId,
      label: slotCandidateLabel(tileId),
      icon: slotCandidateIcon(tileId),
      size: tileSizeKeyForId(tileId),
      kind: tileMeta(tileId)?.kind || '',
      accent: tileMeta(tileId)?.accent || 'default',
    }))
})

const slotContentTargetTitle = computed(() =>
  slotContentTarget.value?.tileId ? t('更换内容', 'Change Content') : t('放入内容', 'Add Content'),
)

const closeSlotContentSheet = () => {
  slotContentTarget.value = null
  slotContentFilter.value = 'all'
}

const closeHomeContentLibrary = () => {
  libraryPlacementTileId.value = ''
}

const selectHomeLibraryCandidate = (tileId) => {
  if (!layoutEditMode.value || !tileId) return
  if (!availableHomeSlotCandidates.value.includes(tileId)) return
  closeSlotContentSheet()
  libraryPlacementTileId.value = libraryPlacementTileId.value === tileId ? '' : tileId
  selectedTileId.value = ''
  maybeVibrate(8)
}

const isHomeLibraryCandidateSelected = (tileId) => libraryPlacementTileId.value === tileId

const canPlaceLibraryCandidateInSlot = (slot) =>
  !!libraryPlacementTileId.value && canTileFitTemplateSlot(libraryPlacementTileId.value, slot)

const placeSelectedLibraryCandidateInSlot = (pageIndex, slot) => {
  if (!layoutEditMode.value || !slot || !libraryPlacementTileId.value) return
  const tileId = libraryPlacementTileId.value
  if (!canPlaceLibraryCandidateInSlot(slot)) {
    triggerLayoutToast(t('尺寸不适合此槽位', 'Item does not fit this slot'))
    maybeVibrate(6)
    return
  }
  const placed = systemStore.setHomeLayoutSlotPlacement(pageIndex, slot.id, tileId)
  if (!placed) return
  closeHomeContentLibrary()
  selectedTileId.value = tileId
  triggerDroppedTileFeedback(tileId)
  triggerLayoutToast(t('已放入槽位', 'Added to slot'))
  maybeVibrate(12)
  systemStore.saveNow()
}

const openSlotContentSheet = (pageIndex, slot, tileId = '') => {
  if (!layoutEditMode.value || !slot) return
  closeHomeContentLibrary()
  selectedTileId.value = tileId || ''
  slotContentTarget.value = {
    pageIndex,
    slot,
    slotIndex: homeLayoutSlotIndex(slot),
    tileId,
    label: tileId ? slotCandidateLabel(tileId) : '',
  }
  slotContentFilter.value = 'all'
  maybeVibrate(8)
}

const placeTileInSlotTarget = (tileId) => {
  const target = slotContentTarget.value
  if (!target?.slot || !tileId) return
  if (!canTileFitTemplateSlot(tileId, target.slot)) return

  if (target.tileId && target.tileId !== tileId) {
    removeTileFromHome(target.tileId)
  }
  const placed = systemStore.setHomeLayoutSlotPlacement(target.pageIndex, target.slot.id, tileId)
  if (!placed) return
  selectedTileId.value = tileId
  closeSlotContentSheet()
  triggerDroppedTileFeedback(tileId)
  triggerLayoutToast(t('已放入槽位', 'Added to slot'))
  maybeVibrate(12)
  systemStore.saveNow()
}

const removeTileFromHome = (tileId) => {
  if (!canHideTile(tileId)) return false
  const nextPages = widgetPages.value.map((page) => page.filter((id) => id !== tileId))
  systemStore.setHomeWidgetPages(nextPages)
  if (dragTileId.value === tileId) {
    resetDragState()
  }
  if (libraryPlacementTileId.value === tileId) {
    libraryPlacementTileId.value = ''
  }
  if (selectedTileId.value === tileId) {
    selectedTileId.value = ''
  }
  if (openFolderTileId.value === tileId) {
    closeHomeFolder()
  }
  return true
}

const clearSlotContentTarget = () => {
  const target = slotContentTarget.value
  if (!target?.tileId) return
  systemStore.clearHomeLayoutSlotPlacement(target.pageIndex, target.slot.id)
  if (!removeTileFromHome(target.tileId)) return
  closeSlotContentSheet()
  triggerLayoutToast(t('槽位已清空', 'Slot cleared'))
  maybeVibrate(10)
  systemStore.saveNow()
}

const selectTileForLayout = (tileId) => {
  if (!layoutEditMode.value) return
  selectedTileId.value = selectedTileId.value === tileId ? '' : tileId
  maybeVibrate(8)
}

const markTilePressed = (tileId) => {
  pressedTileId.value = tileId
}

const clearTilePressed = () => {
  pressedTileId.value = ''
}

const maybeVibrate = (duration = 10) => {
  if (settings.value.appearance.hapticFeedbackEnabled === false) return
  if (typeof navigator === 'undefined') return
  if (typeof navigator.vibrate !== 'function') return
  navigator.vibrate(duration)
}

const triggerLayoutToast = (text = t('布局已保存', 'Layout saved')) => {
  layoutToastText.value = text
  if (layoutToastTimerId) clearTimeout(layoutToastTimerId)
  layoutToastTimerId = setTimeout(() => {
    layoutToastText.value = ''
  }, 1100)
}

const triggerDroppedTileFeedback = (tileId) => {
  droppedTileId.value = tileId
  if (droppedTileTimerId) clearTimeout(droppedTileTimerId)
  droppedTileTimerId = setTimeout(() => {
    droppedTileId.value = ''
  }, 420)
}

const openAppById = (tileId) => {
  if (layoutEditMode.value) return
  if (Date.now() < ignoreAppOpenUntil.value) return

  const tile = widgetRegistry[tileId]
  if (!tile) return

  if (tile.kind === HOME_FOLDER_TILE_KIND) {
    maybeVibrate(8)
    openFolderTileId.value = tileId
    return
  }

  if (tile.kind !== 'app') return

  if (tile.route) {
    maybeVibrate(8)
    router.push(buildRouteWithReturnSource(tile.route, 'home', { homePage: homeReturnPageForCurrentView.value }))
    return
  }

  triggerLayoutToast(t(`「${tile.label}」暂不可用`, `"${tile.label}" is unavailable`))
}

const openCustomWidgetAction = (tileId) => {
  if (layoutEditMode.value) return
  if (Date.now() < ignoreAppOpenUntil.value) return

  const action = customWidgetAction(tileId)
  if (action.type === CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP) {
    const tile = widgetRegistry[action.target]
    if (!tile || (action.target === 'app_control_center' && !isWorldHubInstalled.value)) {
      triggerLayoutToast(t('应用未安装', 'App not installed'))
      return
    }
    openAppById(action.target)
    return
  }

  if (action.type !== CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM) return

  const target = resolveCustomWidgetSystemActionTarget(action.target)
  if (!target?.route) return

  maybeVibrate(8)
  if (target.route === '/home') {
    router.push({ path: '/home', query: { homePage: String(homeReturnPageForCurrentView.value) } })
    return
  }

  router.push(
    buildRouteWithReturnSource(target.route, 'home', {
      homePage: homeReturnPageForCurrentView.value,
    }),
  )
}

const openLeftPageUtilityEntry = (entry) => {
  if (layoutEditMode.value) return

  if (!entry?.installed || !entry.route) {
    maybeVibrate(6)
    triggerLayoutToast(t('应用未安装', 'App not installed'))
    return
  }

  maybeVibrate(8)
  router.push(buildRouteWithReturnSource(entry.route, 'home', { homePage: DEFAULT_HOME_RETURN_PAGE }))
}

const closeHomeFolder = () => {
  openFolderTileId.value = ''
}

const openFolderChildEntry = (entry) => {
  const target = resolveHomeFolderChildRoute(entry)
  if (!target) return
  maybeVibrate(8)
  closeHomeFolder()
  const normalizedTarget = typeof target === 'string' ? { path: target } : target
  router.push({
    ...normalizedTarget,
    query: buildHomeSourceQuery(homeReturnPageForCurrentView.value, normalizedTarget.query || {}),
  })
}

const clearLongPressTimer = () => {
  if (!longPressTimerId) return
  clearTimeout(longPressTimerId)
  longPressTimerId = null
}

const clearWidgetEntryLongPressTimer = () => {
  if (!widgetEntryLongPressTimerId) return
  clearTimeout(widgetEntryLongPressTimerId)
  widgetEntryLongPressTimerId = null
}

const enterWidgetLayoutMode = () => {
  clearLongPressTimer()
  clearWidgetEntryLongPressTimer()
  resetDragState()
  layoutEditMode.value = true
  selectedTileId.value = ''
  closeSlotContentSheet()
  closeHomeContentLibrary()
  clearTilePressed()
  ignoreAppOpenUntil.value = Date.now() + 420
  triggerLayoutToast(t('点击槽位更换内容', 'Tap a slot to change content'))
  maybeVibrate(16)
}

const scheduleWidgetEntryLongPress = (event) => {
  if (layoutEditMode.value) return
  clearWidgetEntryLongPressTimer()
  widgetEntryPressStartX.value = event.clientX
  widgetEntryPressStartY.value = event.clientY
  widgetEntryLongPressTimerId = setTimeout(() => {
    enterWidgetLayoutMode()
  }, LONG_PRESS_MS)
}

const maybeCancelWidgetEntryLongPressByMove = (event) => {
  if (!widgetEntryLongPressTimerId) return
  const movedX = Math.abs(event.clientX - widgetEntryPressStartX.value)
  const movedY = Math.abs(event.clientY - widgetEntryPressStartY.value)
  if (movedX > LONG_PRESS_MOVE_THRESHOLD || movedY > LONG_PRESS_MOVE_THRESHOLD) {
    clearWidgetEntryLongPressTimer()
  }
}

const canStartLayoutLongPress = (event) => {
  if (!layoutEditFeatureEnabled.value) return false
  if (layoutEditMode.value) return false

  const target = event.target
  if (!(target instanceof HTMLElement)) return false

  return !target.closest(
    '.home-tile, .home-app-tile, .home-widget-card, .home-custom-widget-card, .home-dock, .home-page-dots, .home-search-pill, .home-headline, [data-no-layout-longpress]',
  )
}

const scheduleLongPress = (event, x, y) => {
  if (!canStartLayoutLongPress(event)) return

  clearLongPressTimer()
  longPressStartX.value = x
  longPressStartY.value = y

  longPressTimerId = setTimeout(() => {
    layoutEditMode.value = true
    selectedTileId.value = ''
    clearTilePressed()
    clearLongPressTimer()
  }, LONG_PRESS_MS)
}

const maybeCancelLongPressByMove = (x, y) => {
  if (!longPressTimerId) return

  const movedX = Math.abs(x - longPressStartX.value)
  const movedY = Math.abs(y - longPressStartY.value)
  if (movedX > LONG_PRESS_MOVE_THRESHOLD || movedY > LONG_PRESS_MOVE_THRESHOLD) {
    clearLongPressTimer()
  }
}

const onTouchStart = (event) => {
  if (layoutEditMode.value) return

  touchStartX.value = event.changedTouches[0].clientX
  touchDeltaX.value = 0
  scheduleLongPress(event, event.changedTouches[0].clientX, event.changedTouches[0].clientY)
}

const onTouchMove = (event) => {
  maybeCancelLongPressByMove(event.changedTouches[0].clientX, event.changedTouches[0].clientY)
  if (layoutEditMode.value) return

  touchDeltaX.value = event.changedTouches[0].clientX - touchStartX.value
}

const onTouchEnd = () => {
  clearLongPressTimer()

  if (layoutEditMode.value) {
    touchDeltaX.value = 0
    return
  }

  const threshold = 48
  if (touchDeltaX.value <= -threshold) {
    setPage(currentPage.value + 1)
  } else if (touchDeltaX.value >= threshold) {
    setPage(currentPage.value - 1)
  }

  touchDeltaX.value = 0
}

const onTouchCancel = () => {
  clearLongPressTimer()
  touchDeltaX.value = 0
}

const onMouseDown = (event) => {
  scheduleLongPress(event, event.clientX, event.clientY)
}

const onMouseMove = (event) => {
  maybeCancelLongPressByMove(event.clientX, event.clientY)
}

const onMouseUp = () => {
  clearLongPressTimer()
  clearTilePressed()
}

const iconStyle = (accent = 'default') => {
  return {
    background: `var(--home-icon-${accent}-bg)`,
    color: `var(--home-icon-${accent}-fg)`,
  }
}

const dockAppMeta = (appId) => resolveAppIconMeta(appId, appIconOverrides.value, homeLocale.value)

const moveTileToSlot = (tileId, targetPageIndex, slotIndex) => {
  if (!tileId || !Number.isInteger(targetPageIndex) || !Number.isInteger(slotIndex)) return false

  const fromPageIndex = tilePageIndexMap.value.get(tileId)
  if (typeof fromPageIndex !== 'number') return false

  const nextPages = widgetPages.value.map((page) => [...page])
  while (nextPages.length <= targetPageIndex) {
    nextPages.push([])
  }

  const fromPage = nextPages[fromPageIndex]
  const fromIndex = fromPage.indexOf(tileId)
  if (fromIndex < 0) return false
  fromPage.splice(fromIndex, 1)

  const targetPage = nextPages[targetPageIndex]
  const { cols, rows } = tileSpanForId(tileId)
  const previewPlacement = resolveGridPlacement(slotIndex, cols, rows)
  const normalizedSlot = Math.max(0, previewPlacement.row * LAYOUT_SLOT_COLUMNS + previewPlacement.col)
  const insertIndex = Math.min(normalizedSlot, targetPage.length)
  targetPage.splice(insertIndex, 0, tileId)

  const originalPages = JSON.stringify(widgetPages.value)
  const nextPagesJson = JSON.stringify(nextPages)
  if (originalPages === nextPagesJson) {
    return false
  }

  systemStore.setHomeWidgetPages(nextPages)
  return true
}

const normalizeSlotIndexForPage = (pageIndex, slotIndex) => {
  const page = widgetPages.value[pageIndex] || []
  const normalizedSlot = Math.max(0, Number.isInteger(slotIndex) ? slotIndex : 0)
  return Math.min(normalizedSlot, page.length)
}

const getSlotIndexFromPoint = (gridElement, clientX, clientY) => {
  const rect = gridElement.getBoundingClientRect()
  if (!rect.width || !rect.height) return 0

  const localX = Math.min(Math.max(0, clientX - rect.left), rect.width)
  const localY = Math.min(Math.max(0, clientY - rect.top), rect.height)

  const slotWidth = (rect.width - LAYOUT_SLOT_GAP * (LAYOUT_SLOT_COLUMNS - 1)) / LAYOUT_SLOT_COLUMNS
  const cellWidth = slotWidth + LAYOUT_SLOT_GAP
  const cellHeight = LAYOUT_SLOT_HEIGHT + LAYOUT_SLOT_GAP

  const col = Math.min(LAYOUT_SLOT_COLUMNS - 1, Math.max(0, Math.floor(localX / cellWidth)))
  const row = Math.min(LAYOUT_SLOT_ROWS - 1, Math.max(0, Math.floor(localY / cellHeight)))
  return row * LAYOUT_SLOT_COLUMNS + col
}

const resolveGridPlacement = (slotIndex, spanCols = 1, spanRows = 1) => {
  const maxColStart = Math.max(0, LAYOUT_SLOT_COLUMNS - spanCols)
  const maxRowStart = Math.max(0, LAYOUT_SLOT_ROWS - spanRows)

  const rowRaw = Math.floor(Math.max(0, slotIndex) / LAYOUT_SLOT_COLUMNS)
  const colRaw = Math.max(0, slotIndex) % LAYOUT_SLOT_COLUMNS

  return {
    col: Math.min(maxColStart, colRaw),
    row: Math.min(maxRowStart, rowRaw),
  }
}

const setDragPreview = (pageIndex, slotIndex) => {
  const normalizedPage = clampPage(pageIndex)
  dragPreviewPageIndex.value = normalizedPage
  dragPreviewSlotIndex.value = normalizeSlotIndexForPage(normalizedPage, slotIndex)
}

const clearDragPreview = () => {
  dragPreviewPageIndex.value = -1
  dragPreviewSlotIndex.value = -1
}

const dragPreviewAreaStyleForPage = (pageIndex) => {
  if (!hasActiveDrag.value) return null
  if (dragPreviewPageIndex.value !== pageIndex) return null
  if (dragPreviewSlotIndex.value < 0) return null

  const { cols, rows } = dragTileSpan.value
  const { col, row } = resolveGridPlacement(dragPreviewSlotIndex.value, cols, rows)
  return {
    gridColumn: `${col + 1} / span ${cols}`,
    gridRow: `${row + 1} / span ${rows}`,
  }
}

const syncDragGhostPosition = (event) => {
  dragGhostX.value = event.clientX
  dragGhostY.value = event.clientY
}

const syncDragGhostSize = (event) => {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  const rect = target.getBoundingClientRect()
  dragGhostWidth.value = Math.max(58, Math.min(rect.width, 260))
  dragGhostHeight.value = Math.max(58, Math.min(rect.height, 220))
}

const resolveDropTargetByPoint = (clientX, clientY) => {
  const overEl = document.elementFromPoint(clientX, clientY)
  if (!(overEl instanceof HTMLElement)) return null

  const slotEl = overEl.closest('[data-home-slot-index]')
  if (slotEl instanceof HTMLElement) {
    const slotIndex = Number(slotEl.dataset.homeSlotIndex)
    const pageIndex = Number(slotEl.dataset.homeSlotPage)
    if (Number.isInteger(slotIndex) && Number.isInteger(pageIndex)) {
      return { pageIndex, slotIndex }
    }
  }

  const tileEl = overEl.closest('[data-home-tile-id]')
  if (tileEl instanceof HTMLElement) {
    const tileId = tileEl.dataset.homeTileId
    if (tileId) {
      const pageIndex = tilePageIndexMap.value.get(tileId)
      if (typeof pageIndex === 'number') {
        const page = widgetPages.value[pageIndex] || []
        const slotIndex = page.indexOf(tileId)
        return { pageIndex, slotIndex: slotIndex >= 0 ? slotIndex : page.length }
      }
    }
  }

  const gridEl = overEl.closest('[data-home-grid-page]')
  if (gridEl instanceof HTMLElement) {
    const pageIndex = Number(gridEl.dataset.homeGridPage)
    if (!Number.isInteger(pageIndex)) return null
    return {
      pageIndex,
      slotIndex: getSlotIndexFromPoint(gridEl, clientX, clientY),
    }
  }

  return null
}

const resetDragState = () => {
  dragTileId.value = ''
  dragPointerId.value = null
  lastDragPageSwitchAt = 0
  dragEdgeDirection.value = ''
  clearDragPreview()
}

const startTileDrag = (tileId, event) => {
  markTilePressed(tileId)

  if (!layoutEditMode.value) {
    if (tileId === WIDGET_APP_TILE_ID) {
      scheduleWidgetEntryLongPress(event)
    }
    return
  }

  if (!canFreelyMoveHomeTiles.value) return

  selectedTileId.value = tileId
  syncDragGhostSize(event)
  syncDragGhostPosition(event)

  dragTileId.value = tileId
  dragPointerId.value = event.pointerId
  lastDragPageSwitchAt = 0
  const pageIndex = tilePageIndexMap.value.get(tileId)
  if (typeof pageIndex === 'number') {
    const page = widgetPages.value[pageIndex] || []
    const slotIndex = page.indexOf(tileId)
    setDragPreview(pageIndex, slotIndex >= 0 ? slotIndex : page.length)
  } else {
    clearDragPreview()
  }

  if (event.currentTarget && typeof event.currentTarget.setPointerCapture === 'function') {
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  event.preventDefault()
}

const onTilePointerMove = (event) => {
  if (!layoutEditMode.value) {
    maybeCancelWidgetEntryLongPressByMove(event)
    return
  }
  if (!canFreelyMoveHomeTiles.value) {
    maybeCancelWidgetEntryLongPressByMove(event)
    return
  }
  if (!dragTileId.value || dragPointerId.value !== event.pointerId) return

  event.preventDefault()
  syncDragGhostPosition(event)

  const now = Date.now()
  const x = event.clientX
  const atLeftEdge = x <= DRAG_EDGE_ZONE_PX && currentPage.value > 0
  const atRightEdge = x >= window.innerWidth - DRAG_EDGE_ZONE_PX && currentPage.value < totalPages.value - 1

  if (atLeftEdge) {
    dragEdgeDirection.value = 'left'
  } else if (atRightEdge) {
    dragEdgeDirection.value = 'right'
  } else {
    dragEdgeDirection.value = ''
  }

  if (now - lastDragPageSwitchAt >= DRAG_PAGE_SWITCH_COOLDOWN_MS) {
    if (atLeftEdge) {
      const nextPage = currentPage.value - 1
      setPage(nextPage)
      setDragPreview(nextPage, (widgetPages.value[nextPage] || []).length)
      lastDragPageSwitchAt = now
      return
    }
    if (atRightEdge) {
      const nextPage = currentPage.value + 1
      setPage(nextPage)
      setDragPreview(nextPage, (widgetPages.value[nextPage] || []).length)
      lastDragPageSwitchAt = now
      return
    }
  }

  const dropTarget = resolveDropTargetByPoint(event.clientX, event.clientY)
  if (!dropTarget) return
  setDragPreview(dropTarget.pageIndex, dropTarget.slotIndex)
}

const stopTileDrag = (event) => {
  clearWidgetEntryLongPressTimer()
  clearTilePressed()

  if (!layoutEditMode.value) return
  if (!canFreelyMoveHomeTiles.value) return
  if (dragPointerId.value !== event.pointerId) return

  if (dragTileId.value && dragPreviewPageIndex.value >= 0 && dragPreviewSlotIndex.value >= 0) {
    const moved = moveTileToSlot(dragTileId.value, dragPreviewPageIndex.value, dragPreviewSlotIndex.value)
    if (moved) {
      triggerDroppedTileFeedback(dragTileId.value)
      triggerLayoutToast(t('布局已保存', 'Layout saved'))
      maybeVibrate(12)
      systemStore.saveNow()
      ignoreAppOpenUntil.value = Date.now() + 220
    }
    selectedTileId.value = dragTileId.value
  }

  dragEdgeDirection.value = ''
  resetDragState()
}

const openTileSlotContentSheet = (tileId) => {
  if (!layoutEditMode.value) return
  const pageIndex = tilePageIndexMap.value.get(tileId)
  if (typeof pageIndex !== 'number') return
  const assignment = homeLayoutAssignmentForPage(pageIndex)
  const placement = assignment.placements.find((item) => item.tileId === tileId)
  if (!placement?.slot) return
  openSlotContentSheet(pageIndex, placement.slot, tileId)
}

const onTileClick = (tileId) => {
  if (!layoutEditMode.value) return
  if (Date.now() < ignoreAppOpenUntil.value) return
  openTileSlotContentSheet(tileId)
  if (slotContentTarget.value?.tileId === tileId) return
  if (!canFreelyMoveHomeTiles.value) return
  selectTileForLayout(tileId)
}

const clearSelectedTile = () => {
  selectedTileId.value = ''
  closeSlotContentSheet()
  closeHomeContentLibrary()
  maybeVibrate(8)
}

const onGridClick = (pageIndex, event) => {
  if (isLibraryPlacementActive.value) return
  if (!layoutEditMode.value || !selectedTileId.value) return
  if (!canFreelyMoveHomeTiles.value) return
  if (hasActiveDrag.value) return
  if (slotContentTarget.value) return

  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (target.closest('[data-home-tile-id]')) return
  if (target.closest('[data-home-slot-index]')) return

  const grid = event.currentTarget
  if (!(grid instanceof HTMLElement)) return

  const rect = grid.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const slotIndex = getSlotIndexFromPoint(grid, event.clientX, event.clientY)
  const moved = moveTileToSlot(selectedTileId.value, pageIndex, slotIndex)
  if (moved) {
    triggerDroppedTileFeedback(selectedTileId.value)
    triggerLayoutToast(t('布局已保存', 'Layout saved'))
    maybeVibrate(12)
    systemStore.saveNow()
  }
}

const onLayoutSlotClick = (pageIndex, slotIndex) => {
  if (isLibraryPlacementActive.value) return
  if (!layoutEditMode.value || !selectedTileId.value) return
  if (!canFreelyMoveHomeTiles.value) return
  if (hasActiveDrag.value) return
  if (slotContentTarget.value) return
  const moved = moveTileToSlot(selectedTileId.value, pageIndex, slotIndex)
  if (moved) {
    triggerDroppedTileFeedback(selectedTileId.value)
    triggerLayoutToast(t('布局已保存', 'Layout saved'))
    maybeVibrate(12)
    systemStore.saveNow()
  }
}

const hideTileFromHome = (tileId) => {
  if (!canFreelyMoveHomeTiles.value) return
  if (!removeTileFromHome(tileId)) return
  closeSlotContentSheet()
  triggerLayoutToast(t('入口已移除', 'Entry removed'))
  maybeVibrate(10)
  systemStore.saveNow()
}

const resetHomeLayout = async () => {
  const ok = await confirmDialog({
    title: t('恢复主屏默认布局', 'Reset Home layout'),
    message: t('确认恢复主屏默认布局吗？', 'Reset Home layout to default?'),
    confirmText: t('恢复默认', 'Reset'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return
  systemStore.resetHomeWidgetPages()
  systemStore.saveNow()
  triggerLayoutToast(t('已恢复默认布局', 'Default layout restored'))
  maybeVibrate(14)
}

const exitLayoutMode = () => {
  resetDragState()
  selectedTileId.value = ''
  closeSlotContentSheet()
  closeHomeContentLibrary()
  clearTilePressed()
  dragEdgeDirection.value = ''
  layoutEditMode.value = false
  ignoreAppOpenUntil.value = Date.now() + 220
  systemStore.saveNow()
}

const consumeWidgetEditRouteRequest = () => {
  if (!widgetEditRouteRequested.value) return
  enterWidgetLayoutMode()
  const homePage = normalizeHomePageQuery(route.query.homePage)
  router.replace(homePage ? { path: '/home', query: { homePage } } : '/home')
}

watch(() => [route.query.widgetEdit, route.query.homePage], consumeWidgetEditRouteRequest, {
  immediate: true,
})

onBeforeUnmount(() => {
  clearLongPressTimer()
  clearWidgetEntryLongPressTimer()
  resetDragState()
  closeHomeFolder()
  closeSlotContentSheet()
  if (layoutToastTimerId) clearTimeout(layoutToastTimerId)
  if (droppedTileTimerId) clearTimeout(droppedTileTimerId)
})
</script>

<template>
  <div
    class="home-shell"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
  >
    <div v-if="layoutEditMode" class="home-edit-topbar" data-no-layout-longpress>
      <button v-if="canFreelyMoveHomeTiles" @click="resetHomeLayout" class="home-edit-btn is-quiet">
        {{ t('重置', 'Reset') }}
      </button>
      <span v-else class="home-edit-mode-pill">
        <i class="fas fa-mobile-screen"></i>
        {{ t('主屏', 'Home') }}
      </span>
      <span class="home-edit-title-wrap">
        <strong class="home-edit-title">{{ t('自定义主屏', 'Customize Home') }}</strong>
        <small class="home-edit-subtitle">{{ homeEditScopeLabel }}</small>
        <span v-if="selectedTileId" class="home-edit-tip">
          {{ t('已选择内容', 'Item selected') }}
        </span>
      </span>
      <div class="home-edit-actions">
        <button v-if="selectedTileId" @click="clearSelectedTile" class="home-edit-btn">{{ t('取消', 'Clear') }}</button>
        <button
          v-if="availableHomeLibraryCandidates.length > 0"
          type="button"
          class="home-edit-btn"
          :class="{ 'is-active': isLibraryPlacementActive }"
          @click="isLibraryPlacementActive ? closeHomeContentLibrary() : selectHomeLibraryCandidate(availableHomeLibraryCandidates[0].tileId)"
        >
          <i class="fas fa-layer-group"></i>
          <span>{{ availableHomeLibraryCandidates.length }}</span>
        </button>
        <button @click="exitLayoutMode" class="home-edit-btn is-primary">{{ t('完成', 'Done') }}</button>
      </div>
    </div>

    <div v-if="layoutToastText" class="home-layout-toast" aria-live="polite">
      <i class="fas fa-check-circle"></i>
      <span>{{ layoutToastText }}</span>
    </div>

    <div
      v-if="layoutEditMode && availableHomeLibraryCandidates.length > 0"
      class="home-content-library"
      data-no-layout-longpress
    >
      <div class="home-content-library-head">
        <span>
          <i class="fas fa-layer-group"></i>
          {{ t('内容库', 'Library') }}
        </span>
        <strong>{{ selectedHomeLibraryCandidate?.label || t('未选择', 'None selected') }}</strong>
      </div>
      <div class="home-content-library-row">
        <button
          v-for="candidate in availableHomeLibraryCandidates"
          :key="candidate.tileId"
          type="button"
          class="home-content-library-item"
          :class="{ 'is-active': isHomeLibraryCandidateSelected(candidate.tileId) }"
          :data-testid="`home-library-candidate-${candidate.tileId}`"
          @click="selectHomeLibraryCandidate(candidate.tileId)"
        >
          <span
            class="home-content-library-icon"
            :style="candidate.kind === 'app' || candidate.kind === HOME_FOLDER_TILE_KIND ? iconStyle(candidate.accent) : undefined"
          >
            <i :class="candidate.icon"></i>
          </span>
          <span class="home-content-library-copy">
            <strong>{{ candidate.label }}</strong>
            <small>{{ candidate.size }}</small>
          </span>
        </button>
      </div>
    </div>

    <div v-if="slotContentTarget" class="home-slot-content-sheet" data-no-layout-longpress>
      <div class="home-slot-content-head">
        <div>
          <span>{{ slotContentTarget.slot.size }}</span>
          <h2>{{ slotContentTargetTitle }}</h2>
          <p>
            {{
              slotContentTarget.label
                ? `${slotContentTarget.label} · ${homePageLabel(slotContentTarget.pageIndex)}`
                : homePageLabel(slotContentTarget.pageIndex)
            }}
          </p>
        </div>
        <button
          class="home-slot-content-close"
          type="button"
          @click="closeSlotContentSheet"
          :aria-label="t('关闭', 'Close')"
        >
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <div class="home-slot-content-filters" role="tablist" :aria-label="t('内容类型', 'Content types')">
        <button
          v-for="filter in SLOT_CONTENT_FILTERS"
          :key="filter"
          type="button"
          class="home-slot-content-filter"
          :class="{ 'is-active': slotContentFilter === filter }"
          role="tab"
          :aria-selected="slotContentFilter === filter"
          @click="slotContentFilter = filter"
        >
          {{ slotContentFilterLabel(filter) }}
        </button>
      </div>
      <div v-if="slotContentCandidates.length > 0" class="home-slot-content-list">
        <button
          v-for="candidate in slotContentCandidates"
          :key="candidate.tileId"
          class="home-slot-content-option"
          type="button"
          :data-testid="`home-slot-candidate-${candidate.tileId}`"
          @click="placeTileInSlotTarget(candidate.tileId)"
        >
          <span
            class="home-slot-content-icon"
            :style="candidate.kind === 'app' || candidate.kind === HOME_FOLDER_TILE_KIND ? iconStyle(candidate.accent) : undefined"
          >
            <i :class="candidate.icon"></i>
          </span>
          <span class="home-slot-content-copy">
            <strong>{{ candidate.label }}</strong>
            <small>{{ candidate.size }}</small>
          </span>
        </button>
      </div>
      <p v-else class="home-slot-content-empty">
        {{ t('暂无适合此槽位的内容。', 'No available content fits this slot.') }}
      </p>
      <button
        v-if="slotContentTarget.tileId && canHideTile(slotContentTarget.tileId)"
        type="button"
        class="home-slot-clear-btn"
        @click="clearSlotContentTarget"
      >
        <i class="fas fa-minus"></i>
        <span>{{ t('清空槽位', 'Clear Slot') }}</span>
      </button>
    </div>

    <div v-if="layoutEditMode && hasActiveDrag" class="home-drag-edge-hints" aria-hidden="true">
      <div
        class="home-drag-edge home-drag-edge-left"
        :class="{ 'is-active': dragEdgeDirection === 'left' && canDragToPrevPage }"
      >
        <i class="fas fa-chevron-left"></i>
      </div>
      <div
        class="home-drag-edge home-drag-edge-right"
        :class="{ 'is-active': dragEdgeDirection === 'right' && canDragToNextPage }"
      >
        <i class="fas fa-chevron-right"></i>
      </div>
    </div>

    <div v-if="hasActiveDrag" class="home-drag-ghost" :style="dragGhostStyle" aria-hidden="true">
      <div class="home-drag-ghost-body">
        <span
          v-if="dragGhostMeta?.kind === 'app' || dragGhostMeta?.kind === HOME_FOLDER_TILE_KIND"
          class="home-drag-ghost-icon"
          :style="iconStyle(dragGhostMeta.accent)"
        >
          <i :class="dragGhostMeta.icon"></i>
        </span>
        <span v-else class="home-drag-ghost-icon is-widget">
          <i :class="dragGhostMeta?.icon || 'fas fa-puzzle-piece'"></i>
        </span>
        <span class="home-drag-ghost-label">{{ dragGhostMeta?.label || t('移动中', 'Moving') }}</span>
      </div>
    </div>

    <div class="home-page-track" :style="{ transform: `translate3d(-${homeTrackOffset * 100}%, 0, 0)` }">
      <section
        class="home-page home-left-page"
        data-testid="home-left-page"
        data-no-layout-longpress
      >
        <div class="home-left-page-inner">
          <div class="home-headline home-left-hero">
            <p class="home-left-eyebrow">{{ t('今日视图', 'Today View') }}</p>
            <h1 class="home-title">
              {{ t('你好，', 'Hello,') }} <span class="home-accent">{{ user.name }}</span>
            </h1>
            <p class="home-subtitle">{{ t('一切准备就绪。', 'Everything is ready.') }}</p>
          </div>

          <section
            v-if="smartPanelEnabled"
            class="home-smart-panel"
            data-testid="home-smart-panel"
          >
            <div class="home-smart-panel-head">
              <div>
                <p class="home-smart-kicker">{{ t('今日摘要', 'Today Summary') }}</p>
                <h2>{{ t('智能面板', 'Smart Panel') }}</h2>
              </div>
              <span>{{ t('系统建议', 'System Cue') }}</span>
            </div>
            <div class="home-smart-grid">
              <article v-for="item in smartPanelItems" :key="item.id" class="home-smart-card">
                <i :class="item.icon"></i>
                <div>
                  <p>{{ item.label }}</p>
                  <strong>{{ item.value }}</strong>
                </div>
              </article>
            </div>
          </section>

          <section class="home-left-utility-panel" data-testid="home-left-utility-panel">
            <div class="home-left-section-head">
              <div>
                <p>{{ t('系统入口', 'System Entries') }}</p>
                <h2>{{ t('可选入口', 'Optional Entries') }}</h2>
              </div>
              <span>{{ t('可管理', 'Managed') }}</span>
            </div>
            <div class="home-left-utility-grid">
              <button
                v-for="entry in leftPageUtilityEntries"
                :key="entry.id"
                type="button"
                class="home-left-utility-card"
                :class="{ 'is-installed': entry.installed, 'is-locked': !entry.installed }"
                :data-testid="`home-left-shortcut-${entry.id}`"
                @click="openLeftPageUtilityEntry(entry)"
              >
                <span class="home-left-utility-icon">
                  <i :class="entry.icon"></i>
                </span>
                <span class="home-left-utility-copy">
                  <strong>{{ entry.title }}</strong>
                  <small>{{ entry.subtitle }}</small>
                </span>
                <span class="home-left-utility-status">{{ entry.status }}</span>
              </button>
            </div>
          </section>
        </div>
      </section>

      <section v-for="(page, pageIndex) in widgetPages" :key="pageIndex" class="home-page">
        <div class="home-search-pill" v-if="pageIndex === 1">
          <i class="fas fa-search"></i>
          <span>{{ t('搜索手机', 'Search phone') }}</span>
        </div>

        <div class="home-grid-wrap">
          <div
            class="home-grid"
            :class="{ 'is-editing': layoutEditMode }"
            :data-home-grid-page="pageIndex"
            @click="onGridClick(pageIndex, $event)"
          >
            <template v-for="placement in homeLayoutAssignmentForPage(pageIndex).placements" :key="placement.tileId">
              <div
                :class="[
                  'home-tile',
                  'home-layout-tile',
                  {
                    'is-template-scaled': !placement.isExactSize,
                  },
                  {
                    'is-layout-dragging': canFreelyMoveHomeTiles && dragTileId === placement.tileId,
                    'is-layout-selected': isTileSelected(placement.tileId),
                    'is-pressed': pressedTileId === placement.tileId,
                    'is-drop-confirm': droppedTileId === placement.tileId,
                  },
                ]"
                :data-home-tile-id="placement.tileId"
                :data-home-slot-id="placement.slot.id"
                :data-home-slot-size="placement.slot.size"
                :style="homeLayoutPlacementStyle(placement)"
                @click.stop="onTileClick(placement.tileId)"
                @pointerdown="startTileDrag(placement.tileId, $event)"
                @pointermove="onTilePointerMove"
                @pointerup="stopTileDrag"
                @pointercancel="stopTileDrag"
              >
                <button
                  v-if="layoutEditMode && canFreelyMoveHomeTiles && canHideTile(placement.tileId)"
                  class="home-edit-hide"
                  @pointerdown.stop
                  @click.stop="hideTileFromHome(placement.tileId)"
                  :title="t('隐藏', 'Hide')"
                  data-no-layout-longpress
                >
                  <i class="fas fa-minus"></i>
                </button>
                <div v-if="isTileSelected(placement.tileId)" class="home-edit-selected-badge">
                  <i class="fas fa-check"></i>
                </div>
                <div
                  v-if="layoutEditMode && !placement.isExactSize"
                  class="home-template-scale-badge"
                >
                  {{ tileSizeKeyForId(placement.tileId) }}
                </div>

                <template v-if="tileMeta(placement.tileId)?.kind === 'widget'">
                  <div class="home-widget-card" v-if="tileMeta(placement.tileId)?.variant === 'weather'">
                    <div class="home-widget-topline">
                      <i class="fas fa-location-dot"></i>
                      <span>{{ t('东京', 'Tokyo') }}</span>
                    </div>
                    <div class="home-widget-temp">18°</div>
                    <div class="home-widget-bottomline">
                      <i class="fas fa-sun home-accent"></i>
                      <span>{{ t('晴朗', 'Clear') }}</span>
                    </div>
                  </div>

                  <div class="home-widget-card home-widget-center" v-else-if="tileMeta(placement.tileId)?.variant === 'calendar'">
                    <span class="home-calendar-week">{{
                      today.toLocaleString(languageBase === 'zh' ? 'zh-CN' : systemLanguage, { weekday: 'short' })
                    }}</span>
                    <span class="home-calendar-day">{{ today.getDate() }}</span>
                  </div>

                  <div class="home-widget-card home-widget-music" v-else-if="tileMeta(placement.tileId)?.variant === 'music'">
                    <div class="home-music-cover"></div>
                    <div class="home-music-meta">
                      <span class="home-widget-topline">{{ t('正在播放', 'Now Playing') }}</span>
                      <h3>{{ t('晚间电台', 'Evening Radio') }}</h3>
                      <p>{{ t('日常播放列表', 'Daily Mix') }}</p>
                      <div class="home-progress">
                        <div class="home-progress-fill"></div>
                      </div>
                    </div>
                  </div>

                  <div class="home-widget-card" v-else-if="tileMeta(placement.tileId)?.variant === 'system'">
                    <div class="home-widget-topline">
                      <i class="fas fa-microchip"></i>
                      <span>{{ t('系统', 'System') }}</span>
                    </div>
                    <div class="home-widget-bottomline">
                      <span>{{ t('电量 86%', 'Battery 86%') }}</span>
                    </div>
                    <div class="home-progress">
                      <div class="home-progress-fill home-progress-fill-system"></div>
                    </div>
                  </div>

                  <button class="home-widget-card home-widget-quick" v-else-if="tileMeta(placement.tileId)?.variant === 'heart'">
                    <i class="fas fa-heart"></i>
                  </button>

                  <button class="home-widget-card home-widget-quick" v-else-if="tileMeta(placement.tileId)?.variant === 'disc'">
                    <i class="fas fa-compact-disc"></i>
                  </button>
                </template>

                <button class="home-app-tile" v-else-if="tileMeta(placement.tileId)?.kind === 'app'" @click="openAppById(placement.tileId)">
                  <span class="home-app-icon" :style="iconStyle(tileMeta(placement.tileId).accent)">
                    <i :class="tileMeta(placement.tileId).icon"></i>
                  </span>
                  <span class="home-app-label">{{ tileMeta(placement.tileId).label }}</span>
                </button>

                <button
                  class="home-app-tile home-folder-tile"
                  v-else-if="tileMeta(placement.tileId)?.kind === HOME_FOLDER_TILE_KIND"
                  @click="openAppById(placement.tileId)"
                  :data-testid="`home-folder-${placement.tileId}`"
                >
                  <span class="home-app-icon home-folder-icon" :style="iconStyle(tileMeta(placement.tileId).accent)">
                    <span class="home-folder-preview-grid" aria-hidden="true">
                      <span
                        v-for="entry in tileMeta(placement.tileId).childEntries.slice(0, 4)"
                        :key="entry.key"
                        class="home-folder-preview-cell"
                      >
                        <i :class="entry.icon"></i>
                      </span>
                    </span>
                  </span>
                  <span class="home-app-label">{{ tileMeta(placement.tileId).label }}</span>
                </button>

                <div class="home-custom-widget-card" v-else-if="tileMeta(placement.tileId)?.kind === 'custom_widget'">
                  <iframe
                    class="home-custom-widget-frame"
                    :class="{
                      'is-editing': layoutEditMode,
                      'is-actionable': customWidgetHasAction(placement.tileId),
                    }"
                    :srcdoc="customWidgetSrcDoc(placement.tileId)"
                    sandbox="allow-scripts"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  ></iframe>
                  <button
                    v-if="!layoutEditMode && customWidgetHasAction(placement.tileId)"
                    class="home-custom-widget-action"
                    type="button"
                    :aria-label="customWidgetActionLabel(placement.tileId)"
                    :data-testid="`home-custom-widget-action-${placement.tileId}`"
                    @click.stop="openCustomWidgetAction(placement.tileId)"
                  ></button>
                </div>
              </div>
            </template>

            <template v-if="homeLayoutAssignmentForPage(pageIndex).overflow.length > 0">
              <div
                v-for="tileId in homeLayoutAssignmentForPage(pageIndex).overflow"
                :key="`overflow-${tileId}`"
                class="home-tile home-layout-tile home-overflow-tile"
                :data-home-tile-id="tileId"
                @click.stop="onTileClick(tileId)"
                @pointerdown="startTileDrag(tileId, $event)"
                @pointermove="onTilePointerMove"
                @pointerup="stopTileDrag"
                @pointercancel="stopTileDrag"
              >
                <button
                  v-if="layoutEditMode && canFreelyMoveHomeTiles && canHideTile(tileId)"
                  class="home-edit-hide"
                  @pointerdown.stop
                  @click.stop="hideTileFromHome(tileId)"
                  :title="t('隐藏', 'Hide')"
                  data-no-layout-longpress
                >
                  <i class="fas fa-minus"></i>
                </button>
                <button
                  v-if="tileMeta(tileId)?.kind === 'app' || tileMeta(tileId)?.kind === HOME_FOLDER_TILE_KIND"
                  class="home-app-tile"
                  :class="{ 'home-folder-tile': tileMeta(tileId)?.kind === HOME_FOLDER_TILE_KIND }"
                  @click="openAppById(tileId)"
                  :data-testid="tileMeta(tileId)?.kind === HOME_FOLDER_TILE_KIND ? `home-folder-${tileId}` : undefined"
                >
                  <span
                    class="home-app-icon"
                    :class="{ 'home-folder-icon': tileMeta(tileId)?.kind === HOME_FOLDER_TILE_KIND }"
                    :style="iconStyle(tileMeta(tileId).accent)"
                  >
                    <i v-if="tileMeta(tileId)?.kind === 'app'" :class="tileMeta(tileId).icon"></i>
                    <span v-else class="home-folder-preview-grid" aria-hidden="true">
                      <span
                        v-for="entry in tileMeta(tileId).childEntries.slice(0, 4)"
                        :key="entry.key"
                        class="home-folder-preview-cell"
                      >
                        <i :class="entry.icon"></i>
                      </span>
                    </span>
                  </span>
                  <span class="home-app-label">{{ tileMeta(tileId).label }}</span>
                </button>
                <div v-else class="home-widget-card home-overflow-widget">
                  <i :class="widgetCandidateIcon(tileId)"></i>
                  <span>{{ widgetCandidateLabel(tileId) }}</span>
                </div>
              </div>
            </template>
          </div>

          <div v-if="layoutEditMode && canFreelyMoveHomeTiles" class="home-grid-slot-overlay" aria-hidden="true">
            <button
              v-for="slot in homeLayoutTemplateForPage(pageIndex).slots"
              :key="`slot-${pageIndex}-${slot.id}`"
              class="home-grid-slot"
              :class="homeLayoutSlotSizeClass(slot.size)"
              :style="homeLayoutSlotToGridStyle(slot)"
              :data-home-slot-index="homeLayoutSlotIndex(slot)"
              :data-home-slot-page="pageIndex"
              :data-home-template-slot-id="slot.id"
              @click.stop="onLayoutSlotClick(pageIndex, homeLayoutSlotIndex(slot))"
            ></button>
            <div
              v-if="dragPreviewAreaStyleForPage(pageIndex)"
              class="home-grid-drop-preview"
              :style="dragPreviewAreaStyleForPage(pageIndex)"
            ></div>
          </div>

          <div v-if="layoutEditMode" class="home-template-slot-overlay" aria-hidden="true">
            <span
              v-for="slot in homeLayoutAssignmentForPage(pageIndex).emptySlots"
              :key="slot.id"
              class="home-template-slot"
              :class="homeLayoutSlotSizeClass(slot.size)"
              :style="homeLayoutSlotToGridStyle(slot)"
            >
              <small>{{ slot.size }}</small>
            </span>
          </div>
          <div v-if="layoutEditMode" class="home-empty-slot-action-overlay">
            <button
              v-for="slot in homeLayoutAssignmentForPage(pageIndex).emptySlots"
              :key="`empty-action-${pageIndex}-${slot.id}`"
              class="home-empty-slot-action"
              :class="[
                homeLayoutSlotSizeClass(slot.size),
                {
                  'is-library-target': isLibraryPlacementActive,
                  'is-compatible': canPlaceLibraryCandidateInSlot(slot),
                },
              ]"
              :style="homeLayoutSlotToGridStyle(slot)"
              type="button"
              :data-testid="`home-empty-slot-${pageIndex}-${slot.id}`"
              @click.stop="isLibraryPlacementActive ? placeSelectedLibraryCandidateInSlot(pageIndex, slot) : openSlotContentSheet(pageIndex, slot)"
            >
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </section>
    </div>

    <div v-if="layoutEditMode" class="home-template-picker" data-no-layout-longpress>
      <div class="home-template-picker-head">
        <span>{{ t('模板', 'Templates') }}</span>
        <strong>{{ homePageLabel(homeReturnPageForCurrentView) }}</strong>
      </div>
      <div class="home-template-list" role="listbox" :aria-label="t('主屏布局模板', 'Home layout templates')">
        <button
          v-for="template in HOME_LAYOUT_TEMPLATES"
          :key="template.id"
          type="button"
          class="home-template-card"
          :class="{ 'is-active': isHomeLayoutTemplateSelected(template.id) }"
          role="option"
          :aria-selected="isHomeLayoutTemplateSelected(template.id)"
          @click="selectHomeLayoutTemplate(template.id)"
        >
          <span class="home-template-preview" aria-hidden="true">
            <span
              v-for="slot in template.slots"
              :key="slot.id"
              class="home-template-preview-slot"
              :class="`is-size-${slot.size.replace('x', '-')}`"
              :style="homeLayoutSlotToGridStyle(slot)"
            ></span>
          </span>
          <span class="home-template-name">{{ homeLayoutTemplateLabel(template) }}</span>
        </button>
      </div>
    </div>

    <div class="home-bottom-area" :class="{ 'is-editing': layoutEditMode }" data-no-layout-longpress>
      <div class="home-page-dots">
        <button
          class="home-left-dot"
          :class="{ 'is-active': currentPage === LEFT_HOME_PAGE_INDEX }"
          @click="setPage(LEFT_HOME_PAGE_INDEX)"
          :aria-label="t('前往今日视图', 'Go to Today View')"
        ></button>
        <span class="home-dot-divider" aria-hidden="true"></span>
        <button
          v-for="index in totalPages"
          :key="index"
          class="home-dot"
          :class="{ 'is-active': currentPage === index - 1 }"
          @click="setPage(index - 1)"
          :aria-label="`${t('前往第', 'Go to page ')}${index}${t('页', '')}`"
        ></button>
      </div>
      <div class="home-dock">
        <button class="home-dock-icon" :style="iconStyle(dockAppMeta('app_chat').accent)" @click="openAppById('app_chat')">
          <i :class="dockAppMeta('app_chat').icon"></i>
        </button>
        <button class="home-dock-icon" :style="iconStyle(dockAppMeta('app_contacts').accent)" @click="openAppById('app_contacts')">
          <i :class="dockAppMeta('app_contacts').icon"></i>
        </button>
        <button class="home-dock-icon" :style="iconStyle(dockAppMeta('app_settings').accent)" @click="openAppById('app_settings')">
          <i :class="dockAppMeta('app_settings').icon"></i>
        </button>
        <button class="home-dock-icon" :style="iconStyle(dockAppMeta('app_widgets').accent)" @click="openAppById('app_widgets')">
          <i :class="dockAppMeta('app_widgets').icon"></i>
        </button>
      </div>
      <p class="home-theme-hint" v-if="activeTheme">{{ t('主题', 'Theme') }}: {{ activeThemeName }}</p>
    </div>

    <div
      v-if="openedFolderMeta?.kind === HOME_FOLDER_TILE_KIND"
      class="home-folder-overlay"
      data-testid="home-folder-overlay"
      data-no-layout-longpress
      @click.self="closeHomeFolder"
    >
      <section class="home-folder-panel" :data-folder-presentation="openedFolderMeta.presentation.openAnimation">
        <div class="home-folder-panel-head">
          <div>
            <p>{{ t('主屏文件夹', 'Home Folder') }}</p>
            <h2>{{ openedFolderMeta.label }}</h2>
          </div>
          <button @click="closeHomeFolder" :aria-label="t('关闭文件夹', 'Close folder')">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="home-folder-entry-grid">
          <button
            v-for="entry in openedFolderPreviewEntries"
            :key="entry.key"
            class="home-folder-entry"
            :data-testid="`home-folder-entry-${entry.key}`"
            @click="openFolderChildEntry(entry)"
          >
            <span class="home-folder-entry-icon" :style="iconStyle(entry.accent)">
              <i :class="entry.icon"></i>
            </span>
            <span class="home-folder-entry-label">{{ entry.label }}</span>
            <span class="home-folder-entry-desc">{{ entry.desc }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home-edit-topbar {
  position: absolute;
  top: 44px;
  left: 10px;
  right: 10px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 20px;
  background: rgba(20, 24, 34, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.18);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.18);
}

.home-edit-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.home-edit-mode-pill {
  min-width: 64px;
  min-height: 30px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.86);
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.home-edit-title-wrap {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.home-edit-title {
  color: #fff;
  font-size: 13px;
  line-height: 1.1;
  font-weight: 750;
  letter-spacing: 0;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-edit-subtitle {
  color: rgba(255, 255, 255, 0.64);
  font-size: 10px;
  line-height: 1.1;
  font-weight: 700;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-edit-tip {
  color: rgba(255, 255, 255, 0.78);
  font-size: 10px;
  line-height: 1.1;
  font-weight: 700;
}

.home-layout-toast {
  position: absolute;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 64;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #fff;
  border: 1px solid var(--system-border-light);
  background: rgba(17, 24, 39, 0.58);
  border-radius: 999px;
  padding: 5px 10px;
  box-shadow: var(--system-shadow-soft);
  backdrop-filter: blur(var(--system-blur-md));
  -webkit-backdrop-filter: blur(var(--system-blur-md));
}

.home-content-library {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 92px;
  z-index: 66;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 8px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(18, 24, 33, 0.58);
  box-shadow: 0 18px 42px rgba(8, 13, 22, 0.18);
  backdrop-filter: blur(var(--system-blur-md)) saturate(1.12);
  -webkit-backdrop-filter: blur(var(--system-blur-md)) saturate(1.12);
}

.home-content-library-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 3px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 10px;
  font-weight: 800;
}

.home-content-library-head span,
.home-content-library-head strong {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-content-library-head strong {
  justify-content: flex-end;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 750;
}

.home-content-library-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.home-content-library-row::-webkit-scrollbar {
  display: none;
}

.home-content-library-item {
  min-width: 112px;
  max-width: 132px;
  height: 50px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 7px;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  text-align: left;
  cursor: pointer;
}

.home-content-library-item.is-active {
  border-color: rgba(255, 255, 255, 0.58);
  background: rgba(255, 255, 255, 0.22);
}

.home-content-library-icon {
  width: 34px;
  height: 34px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  font-size: 13px;
}

.home-content-library-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.home-content-library-copy strong,
.home-content-library-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-content-library-copy strong {
  font-size: 11px;
  line-height: 1.2;
}

.home-content-library-copy small {
  color: rgba(255, 255, 255, 0.64);
  font-size: 10px;
  font-weight: 700;
}

.home-slot-content-sheet {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(96px + env(safe-area-inset-bottom));
  z-index: 67;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(19, 25, 34, 0.74);
  box-shadow: 0 24px 54px rgba(8, 13, 22, 0.3);
  color: #fff;
  padding: 12px;
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
}

.home-slot-content-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.home-slot-content-head span {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  border-radius: 999px;
  padding: 0 8px;
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.82);
  font-size: 10px;
  font-weight: 700;
}

.home-slot-content-head h2 {
  margin: 6px 0 2px;
  font-size: 15px;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: 0;
}

.home-slot-content-head p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  line-height: 1.35;
}

.home-slot-content-close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
}

.home-slot-content-filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5px;
  margin-bottom: 10px;
}

.home-slot-content-filter {
  min-width: 0;
  height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0 5px;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.08);
  font-size: 10px;
  font-weight: 750;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.home-slot-content-filter.is-active {
  border-color: rgba(255, 255, 255, 0.46);
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
}

.home-slot-content-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  max-height: 214px;
  overflow-y: auto;
  padding-right: 2px;
}

.home-slot-content-option {
  min-width: 0;
  min-height: 58px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 8px;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  text-align: left;
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}

.home-slot-content-option:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.17);
}

.home-slot-content-icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  font-size: 14px;
}

.home-slot-content-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.home-slot-content-copy strong,
.home-slot-content-copy small {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-slot-content-copy strong {
  font-size: 12px;
  line-height: 1.25;
}

.home-slot-content-copy small {
  color: rgba(255, 255, 255, 0.66);
  font-size: 10px;
  line-height: 1.25;
}

.home-slot-content-empty {
  margin: 0;
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.72);
  text-align: center;
  font-size: 12px;
}

.home-slot-clear-btn {
  width: 100%;
  min-height: 38px;
  margin-top: 10px;
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: rgba(254, 226, 226, 0.95);
  background: rgba(127, 29, 29, 0.18);
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
}

.home-slot-clear-btn:active {
  transform: scale(0.99);
}

.home-drag-edge-hints {
  position: absolute;
  inset: 0;
  z-index: 62;
  pointer-events: none;
}

.home-drag-edge {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 86px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(17, 24, 39, 0.2);
  color: rgba(255, 255, 255, 0.48);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 160ms ease;
}

.home-drag-edge-left {
  left: 8px;
}

.home-drag-edge-right {
  right: 8px;
}

.home-drag-edge.is-active {
  color: #fff;
  background: var(--system-accent-soft);
  border-color: rgba(191, 219, 254, 0.8);
}

.home-edit-btn {
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 11px;
  line-height: 1;
  min-height: 28px;
  min-width: 34px;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.12);
}

.home-edit-btn.is-quiet {
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.08);
}

.home-edit-btn.is-primary {
  background: var(--system-accent);
  border-color: var(--system-accent);
}

.home-edit-btn.is-active {
  color: rgba(18, 26, 36, 0.92);
  background: rgba(255, 255, 255, 0.86);
}

.home-tile {
  position: relative;
  z-index: 2;
}

.home-layout-tile {
  min-width: 0;
  min-height: 0;
}

.home-layout-tile.is-template-scaled .home-widget-card,
.home-layout-tile.is-template-scaled .home-custom-widget-card {
  border-style: dashed;
}

.home-overflow-tile {
  grid-column: span 1;
  grid-row: span 1;
}

.home-overflow-widget {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  color: var(--home-text-main);
  font-size: 11px;
  font-weight: 750;
}

.home-overflow-widget span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-tile.is-pressed .home-widget-card,
.home-tile.is-pressed .home-custom-widget-card,
.home-tile.is-pressed .home-app-icon {
  transform: scale(0.97);
  filter: brightness(1.08);
}

.home-tile.is-layout-selected {
  outline: 2px solid rgba(255, 255, 255, 0.72);
  outline-offset: 4px;
  border-radius: 22px;
  filter: saturate(1.05);
}

.home-tile.is-drop-confirm .home-widget-card,
.home-tile.is-drop-confirm .home-custom-widget-card,
.home-tile.is-drop-confirm .home-app-icon {
  animation: home-drop-confirm 360ms cubic-bezier(0.17, 0.84, 0.44, 1);
}

.home-edit-hide {
  position: absolute;
  top: -8px;
  left: -8px;
  z-index: 20;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: var(--system-danger);
  color: #fff;
  font-size: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.home-edit-selected-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 21;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(18, 26, 36, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.58);
  color: #fff;
  font-size: 10px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.25);
}

.home-template-scale-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 22;
  border-radius: 999px;
  padding: 2px 6px;
  color: rgba(255, 255, 255, 0.78);
  background: rgba(18, 26, 36, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.22);
  font-size: 9px;
  line-height: 1.2;
  font-weight: 800;
  pointer-events: none;
}

.home-grid-wrap {
  position: relative;
}

.home-template-picker {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: calc(128px + env(safe-area-inset-bottom));
  z-index: 58;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.055)),
    rgba(18, 23, 30, 0.72);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 24px 54px rgba(8, 13, 22, 0.28);
  color: #fff;
  padding: 10px 10px 12px;
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.16);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.16);
}

.home-template-picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px 8px;
}

.home-template-picker-head span {
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-template-picker-head strong {
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 750;
}

.home-template-list {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 74px;
  gap: 8px;
  overflow-x: auto;
  padding: 1px 1px 2px;
  scrollbar-width: none;
}

.home-template-list::-webkit-scrollbar {
  display: none;
}

.home-template-card {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 6px 6px 7px;
  color: rgba(255, 255, 255, 0.82);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.115), rgba(255, 255, 255, 0.045)),
    rgba(255, 255, 255, 0.07);
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}

.home-template-card:active {
  transform: scale(0.97);
}

.home-template-card.is-active {
  border-color: rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.095)),
    rgba(255, 255, 255, 0.14);
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 12px 24px rgba(8, 13, 22, 0.22);
}

.home-template-preview {
  position: relative;
  height: 78px;
  border-radius: 14px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: 3px;
  padding: 5px;
  overflow: hidden;
  background:
    radial-gradient(circle at 28% 10%, rgba(255, 255, 255, 0.16), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(8, 13, 20, 0.18)),
    rgba(8, 13, 20, 0.26);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}

.home-template-preview-slot {
  min-width: 0;
  min-height: 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(228, 231, 235, 0.22)),
    rgba(235, 238, 241, 0.26);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 2px 6px rgba(8, 13, 22, 0.09);
}

.home-template-preview-slot.is-size-1-1 {
  border-radius: 7px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(231, 234, 237, 0.26)),
    rgba(238, 241, 244, 0.34);
}

.home-template-preview-slot.is-size-4-3 {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(222, 226, 230, 0.18)),
    rgba(246, 247, 248, 0.22);
}

.home-template-name {
  display: block;
  text-align: center;
  font-size: 9px;
  line-height: 1.1;
  font-weight: 750;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-left-page {
  padding-top: calc(38px + env(safe-area-inset-top));
  overflow-y: auto;
  scrollbar-width: none;
}

.home-left-page::-webkit-scrollbar {
  display: none;
}

.home-left-page-inner {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
  padding-bottom: 8px;
}

.home-left-hero {
  margin-bottom: 0;
}

.home-left-eyebrow {
  margin: 0 0 9px;
  color: var(--home-text-sub);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.home-left-utility-panel {
  border: 1px solid rgba(255, 255, 255, 0.23);
  border-radius: 26px;
  padding: 14px;
  background:
    radial-gradient(circle at 14% 0%, rgba(255, 255, 255, 0.18), transparent 38%),
    rgba(11, 17, 28, 0.2);
  box-shadow: 0 20px 48px rgba(8, 13, 22, 0.18);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.1);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.1);
}

.home-left-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.home-left-section-head p {
  margin: 0;
  color: var(--home-text-sub);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.home-left-section-head h2 {
  margin: 3px 0 0;
  color: var(--home-text-main);
  font-size: 18px;
  line-height: 1.1;
  font-weight: 750;
}

.home-left-section-head span {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(255, 255, 255, 0.13);
  color: var(--home-text-sub);
  font-size: 10px;
  font-weight: 800;
}

.home-left-utility-grid {
  display: grid;
  gap: 9px;
}

.home-left-utility-card {
  width: 100%;
  min-height: 68px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 22px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 10px;
  color: var(--home-text-main);
  background: rgba(255, 255, 255, 0.12);
  text-align: left;
  cursor: pointer;
  transition: transform 140ms ease, background 140ms ease, border-color 140ms ease, filter 140ms ease;
}

.home-left-utility-card:active {
  transform: scale(0.985);
}

.home-left-utility-card.is-installed {
  border-color: rgba(255, 255, 255, 0.38);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.1)),
    var(--system-accent-soft);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.home-left-utility-card.is-locked {
  opacity: 0.6;
  filter: saturate(0.28) brightness(0.72);
}

.home-left-utility-icon {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.44);
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 10px 20px rgba(8, 13, 22, 0.16);
}

.home-left-utility-card.is-installed .home-left-utility-icon {
  background: var(--home-icon-dark-bg);
  color: var(--home-icon-dark-fg);
}

.home-left-utility-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.home-left-utility-copy strong,
.home-left-utility-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-left-utility-copy strong {
  color: var(--home-text-main);
  font-size: 13px;
  line-height: 1.2;
  font-weight: 760;
}

.home-left-utility-copy small {
  color: var(--home-text-sub);
  font-size: 10px;
  line-height: 1.25;
}

.home-left-utility-status {
  align-self: start;
  border-radius: 999px;
  padding: 4px 7px;
  background: rgba(255, 255, 255, 0.14);
  color: var(--home-text-sub);
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
}

.home-grid.is-editing {
  min-height: calc(6 * 78px + 5 * 12px);
}

.home-smart-panel {
  margin: -8px 0 14px;
  border: 1px solid var(--home-widget-border);
  border-radius: 22px;
  padding: 13px;
  background: var(--home-widget-bg);
  color: var(--home-text-main);
  box-shadow: var(--home-widget-shadow);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.12);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.12);
}

.home-smart-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.home-smart-panel-head h2 {
  margin: 2px 0 0;
  font-size: 16px;
  font-weight: 700;
}

.home-smart-panel-head span {
  border-radius: 999px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.18);
  color: var(--home-text-main);
  font-size: 10px;
  font-weight: 700;
}

.home-smart-kicker {
  margin: 0;
  color: var(--home-text-sub);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-smart-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.home-smart-card {
  min-width: 0;
  border-radius: 16px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.12);
}

.home-smart-card i {
  font-size: 13px;
  opacity: 0.82;
}

.home-smart-card p {
  margin: 7px 0 0;
  color: var(--home-text-sub);
  font-size: 10px;
}

.home-smart-card strong {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-grid-slot-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(6, 78px);
  gap: 12px;
  pointer-events: none;
}

.home-grid-slot {
  min-width: 0;
  min-height: 0;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.075);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 0 0 1px rgba(15, 23, 42, 0.045);
  transition: background 120ms ease, border-color 120ms ease;
  pointer-events: auto;
}

.home-grid-slot:active {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.5);
}

.home-grid-drop-preview {
  pointer-events: none;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.32),
    0 12px 26px rgba(15, 23, 42, 0.16);
  transition: all 150ms cubic-bezier(0.17, 0.84, 0.44, 1);
}

.home-template-slot-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(6, 78px);
  gap: 12px;
}

.home-template-slot {
  min-width: 0;
  min-height: 0;
  border-radius: 22px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.38);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.035)),
    rgba(255, 255, 255, 0.06);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 10px 24px rgba(8, 13, 22, 0.08);
}

.home-template-slot.is-size-1-1 {
  border-radius: 19px;
  padding: 6px;
}

.home-template-slot small {
  min-width: 0;
  border-radius: 999px;
  padding: 2px 6px;
  color: rgba(255, 255, 255, 0.74);
  background: rgba(13, 19, 28, 0.24);
  font-size: 9px;
  line-height: 1.2;
  font-weight: 800;
}

.home-empty-slot-action-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(6, 78px);
  gap: 12px;
  pointer-events: none;
}

.home-empty-slot-action {
  min-width: 0;
  min-height: 0;
  border-radius: 22px;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.82);
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  transition: transform 120ms ease, color 120ms ease;
}

.home-empty-slot-action i {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(18, 26, 36, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.24);
  font-size: 10px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 8px 16px rgba(8, 13, 22, 0.12);
}

.home-empty-slot-action:active {
  transform: scale(0.98);
  color: #fff;
}

.home-empty-slot-action.is-size-1-1 {
  border-radius: 19px;
}

.home-empty-slot-action.is-library-target {
  color: rgba(255, 255, 255, 0.36);
}

.home-empty-slot-action.is-library-target i {
  background: rgba(18, 26, 36, 0.22);
  border-color: rgba(255, 255, 255, 0.12);
}

.home-empty-slot-action.is-library-target.is-compatible {
  color: #fff;
}

.home-empty-slot-action.is-library-target.is-compatible i {
  background: rgba(255, 255, 255, 0.24);
  border-color: rgba(255, 255, 255, 0.55);
}

.home-custom-widget-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--system-radius-lg);
  border: 1px solid var(--home-widget-border);
  background: var(--home-widget-bg);
  box-shadow: var(--home-widget-shadow);
  overflow: hidden;
  transition: transform 120ms ease, filter 120ms ease;
}

.home-custom-widget-frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: transparent;
}

.home-custom-widget-frame.is-editing {
  pointer-events: none;
}

.home-custom-widget-frame.is-actionable {
  pointer-events: none;
}

.home-custom-widget-action {
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 0;
  border-radius: inherit;
  background: transparent;
  cursor: pointer;
}

.home-custom-widget-action:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.78);
  outline-offset: -4px;
}

.home-folder-tile {
  position: relative;
}

.home-folder-icon {
  padding: 6px;
  overflow: hidden;
  border: 1px solid var(--home-folder-tile-border);
  background: var(--home-folder-tile-bg) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.26),
    0 10px 22px rgba(11, 18, 28, 0.18);
}

.home-folder-preview-grid {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 3px;
}

.home-folder-preview-cell {
  min-width: 0;
  min-height: 0;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  color: var(--home-folder-text);
  font-size: 10px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.17),
    0 2px 5px rgba(10, 16, 24, 0.08);
}

.home-app-icon {
  transition: transform 120ms ease, filter 120ms ease;
}

.is-layout-dragging {
  opacity: 0.25;
  transform: scale(0.97);
  z-index: 5;
}

.home-dock-icon {
  transition: transform 120ms ease, filter 120ms ease;
}

.home-dock-icon:active {
  transform: scale(0.92);
  filter: brightness(1.08);
}

.home-bottom-area.is-editing {
  opacity: 0.54;
  pointer-events: none;
}

.home-left-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: rgba(20, 24, 34, 0.46);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  transition: width 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.home-left-dot.is-active {
  width: 18px;
  background: rgba(20, 24, 34, 0.88);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.44);
}

.home-dot-divider {
  width: 1px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}

.home-drag-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 70;
  pointer-events: none;
  filter: drop-shadow(0 20px 28px rgba(0, 0, 0, 0.28));
}

.home-drag-ghost-body {
  width: 100%;
  height: 100%;
  border-radius: var(--system-radius-md);
  border: 1px solid var(--system-border-light);
  background: rgba(13, 25, 52, 0.54);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.15);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #fff;
  padding: 8px;
  animation: home-drag-lift 150ms ease-out;
}

.home-drag-ghost-icon {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
}

.home-drag-ghost-icon.is-widget {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.home-drag-ghost-label {
  max-width: 100%;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-folder-overlay {
  position: absolute;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px 18px calc(108px + env(safe-area-inset-bottom));
  background: var(--home-folder-overlay-bg);
  backdrop-filter: blur(22px) saturate(1.08);
  -webkit-backdrop-filter: blur(22px) saturate(1.08);
  animation: home-folder-overlay-in 180ms ease-out;
}

.home-folder-panel {
  width: min(100%, 320px);
  max-height: min(76%, 520px);
  overflow: hidden;
  border-radius: 34px;
  border: 1px solid var(--home-folder-panel-border);
  background: var(--home-folder-panel-bg);
  color: var(--home-folder-text);
  box-shadow: var(--home-folder-shadow);
  backdrop-filter: blur(34px) saturate(1.16);
  -webkit-backdrop-filter: blur(34px) saturate(1.16);
  padding: 17px 16px 18px;
  animation: home-folder-panel-in 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.home-folder-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.home-folder-panel-head p {
  margin: 0;
  color: var(--home-folder-text-muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home-folder-panel-head h2 {
  margin: 3px 0 0;
  max-width: 230px;
  font-size: 23px;
  line-height: 1.1;
  font-weight: 750;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.home-folder-panel-head button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--home-folder-close-bg);
  color: var(--home-folder-text);
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease;
}

.home-folder-panel-head button:active {
  transform: scale(0.92);
  background: var(--home-folder-entry-pressed-bg);
}

.home-folder-entry-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 8px;
  overflow-y: auto;
  max-height: 414px;
  padding-right: 2px;
}

.home-folder-entry {
  min-width: 0;
  min-height: 88px;
  border: 0;
  border-radius: 20px;
  background: transparent;
  color: var(--home-folder-text);
  padding: 2px 4px 4px;
  text-align: center;
  display: flex;
  align-items: center;
  flex-direction: column;
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease;
}

.home-folder-entry:active {
  transform: scale(0.97);
  background: var(--home-folder-entry-bg);
}

.home-folder-entry-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-size: 20px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 10px 18px rgba(9, 15, 24, 0.2);
}

.home-folder-entry-label {
  display: block;
  width: 100%;
  margin-top: 7px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-folder-entry-desc {
  display: block;
  width: 100%;
  margin-top: 2px;
  color: var(--home-folder-text-muted);
  font-size: 9px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes home-folder-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes home-folder-panel-in {
  from {
    opacity: 0;
    transform: scale(0.86) translateY(16px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes home-drag-lift {
  from {
    transform: scale(0.93);
    opacity: 0.6;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes home-drop-confirm {
  0% {
    transform: scale(0.93);
    filter: brightness(0.95);
  }
  50% {
    transform: scale(1.04);
    filter: brightness(1.16);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}
</style>
