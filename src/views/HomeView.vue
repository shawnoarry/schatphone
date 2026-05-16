<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { resolveAppIconMeta } from '../lib/app-icon-presentation'
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

const currentPage = ref(0)
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
const widgetReplaceTarget = ref(null)

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

const BUILT_IN_WIDGET_ORDER = ['weather', 'calendar', 'music', 'system', 'quick_heart', 'quick_disc']

const CUSTOM_WIDGET_SPAN_CLASS_MAP = {
  '1x1': 'col-span-1 row-span-1',
  '2x1': 'col-span-2 row-span-1',
  '2x2': 'col-span-2 row-span-2',
  '4x2': 'col-span-4 row-span-2',
  '4x3': 'col-span-4 row-span-3',
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
  if (tileId === 'app_stock') return t('股票', 'Stock')
  if (tileId === 'app_chat') return t('聊天', 'Chat')
  if (tileId === 'app_contacts') return t('联系人', 'Contacts')
  if (tileId === 'app_settings') return t('设置', 'Settings')
  if (tileId === 'app_files') return t('文件', 'Files')
  if (tileId === 'app_shopping') return t('购物', 'Shopping')
  if (tileId === 'app_food_delivery') return t('外卖', 'Food')
  if (tileId === 'app_assets') return t('资产', 'Assets')
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
const today = computed(() => new Date())
const layoutSlotIndices = computed(() =>
  Array.from({ length: LAYOUT_SLOT_COLUMNS * LAYOUT_SLOT_ROWS }, (_, index) => index),
)

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

const clampPage = (page) => Math.min(totalPages.value - 1, Math.max(0, page))

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

const isLockedEntryTile = (tileId) => typeof tileId === 'string' && tileId.startsWith('app_')

const canHideTile = (tileId) => !isLockedEntryTile(tileId)
const openedFolderMeta = computed(() => tileMeta(openFolderTileId.value))
const openedFolderPreviewEntries = computed(() => {
  const entries = Array.isArray(openedFolderMeta.value?.childEntries)
    ? openedFolderMeta.value.childEntries
    : []
  return entries.slice(0, 8)
})

const isTileSelected = (tileId) => layoutEditMode.value && selectedTileId.value === tileId

const isReplaceableWidgetTile = (tileId) => {
  const meta = tileMeta(tileId)
  return meta?.kind === 'widget' || meta?.kind === 'custom_widget'
}

const homePageLabel = (pageIndex) => `${t('第', 'Screen ')}${pageIndex + 1}${t('屏', '')}`

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

const widgetReplaceCandidates = computed(() => {
  if (!widgetReplaceTarget.value?.size) return []
  const targetSize = widgetReplaceTarget.value.size
  const candidateIds = [...BUILT_IN_WIDGET_ORDER, ...customWidgets.value.map((widget) => widget.id)]
  return candidateIds
    .filter((tileId) => tileId !== widgetReplaceTarget.value.tileId)
    .filter((tileId) => tileSizeKeyForId(tileId) === targetSize)
    .map((tileId) => ({
      tileId,
      label: widgetCandidateLabel(tileId),
      icon: widgetCandidateIcon(tileId),
      pageIndex: tilePageIndexMap.value.get(tileId),
    }))
})

const closeWidgetReplaceSheet = () => {
  widgetReplaceTarget.value = null
}

const openWidgetReplaceSheet = (tileId) => {
  if (!layoutEditMode.value || !isReplaceableWidgetTile(tileId)) return
  const pageIndex = tilePageIndexMap.value.get(tileId)
  if (typeof pageIndex !== 'number') return

  widgetReplaceTarget.value = {
    tileId,
    label: widgetCandidateLabel(tileId),
    size: tileSizeKeyForId(tileId),
    pageIndex,
  }
  selectedTileId.value = tileId
  maybeVibrate(8)
}

const replaceWidgetAtTarget = (replacementTileId) => {
  const target = widgetReplaceTarget.value
  if (!target?.tileId || !replacementTileId) return

  const nextPages = widgetPages.value.map((page) => [...page])
  nextPages.forEach((page) => {
    for (let index = page.length - 1; index >= 0; index -= 1) {
      if (page[index] === replacementTileId) {
        page.splice(index, 1)
      }
    }
  })

  const targetPage = nextPages[target.pageIndex]
  if (!targetPage) return

  const targetIndex = targetPage.indexOf(target.tileId)
  if (targetIndex < 0) return

  targetPage[targetIndex] = replacementTileId
  systemStore.setHomeWidgetPages(nextPages)
  selectedTileId.value = replacementTileId
  closeWidgetReplaceSheet()
  triggerDroppedTileFeedback(replacementTileId)
  triggerLayoutToast(t('组件已更换', 'Widget changed'))
  maybeVibrate(12)
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
    router.push(buildRouteWithReturnSource(tile.route, 'home', { homePage: currentPage.value }))
    return
  }

  triggerLayoutToast(t(`「${tile.label}」暂不可用`, `"${tile.label}" is unavailable`))
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
    query: buildHomeSourceQuery(currentPage.value, normalizedTarget.query || {}),
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
  closeWidgetReplaceSheet()
  clearTilePressed()
  ignoreAppOpenUntil.value = Date.now() + 420
  triggerLayoutToast(t('点击组件进行同尺寸更换', 'Tap a widget to change it'))
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

  closeWidgetReplaceSheet()

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

const onTileClick = (tileId) => {
  if (!layoutEditMode.value) return
  if (Date.now() < ignoreAppOpenUntil.value) return
  if (isReplaceableWidgetTile(tileId)) {
    openWidgetReplaceSheet(tileId)
    return
  }
  if (!canFreelyMoveHomeTiles.value) return
  selectTileForLayout(tileId)
}

const clearSelectedTile = () => {
  selectedTileId.value = ''
  closeWidgetReplaceSheet()
  maybeVibrate(8)
}

const onGridClick = (pageIndex, event) => {
  if (!layoutEditMode.value || !selectedTileId.value) return
  if (!canFreelyMoveHomeTiles.value) return
  if (hasActiveDrag.value) return
  if (widgetReplaceTarget.value) return

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
  if (!layoutEditMode.value || !selectedTileId.value) return
  if (!canFreelyMoveHomeTiles.value) return
  if (hasActiveDrag.value) return
  if (widgetReplaceTarget.value) return
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
  if (!canHideTile(tileId)) return
  const nextPages = widgetPages.value.map((page) => page.filter((id) => id !== tileId))
  systemStore.setHomeWidgetPages(nextPages)
  if (dragTileId.value === tileId) {
    resetDragState()
  }
  if (selectedTileId.value === tileId) {
    selectedTileId.value = ''
  }
  if (widgetReplaceTarget.value?.tileId === tileId) {
    closeWidgetReplaceSheet()
  }
  if (openFolderTileId.value === tileId) {
    closeHomeFolder()
  }
  triggerLayoutToast(t('组件已隐藏', 'Widget hidden'))
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
  closeWidgetReplaceSheet()
  clearTilePressed()
  dragEdgeDirection.value = ''
  layoutEditMode.value = false
  ignoreAppOpenUntil.value = Date.now() + 220
  systemStore.saveNow()
}

if (widgetEditRouteRequested.value) {
  enterWidgetLayoutMode()
  const homePage = normalizeHomePageQuery(route.query.homePage)
  router.replace(homePage ? { path: '/home', query: { homePage } } : '/home')
}

onBeforeUnmount(() => {
  clearLongPressTimer()
  clearWidgetEntryLongPressTimer()
  resetDragState()
  closeHomeFolder()
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
      <button v-if="canFreelyMoveHomeTiles" @click="resetHomeLayout" class="home-edit-btn">
        {{ t('重置', 'Reset') }}
      </button>
      <span v-else class="home-edit-spacer" aria-hidden="true"></span>
      <span class="home-edit-title">
        {{ canFreelyMoveHomeTiles ? t('主屏位置', 'Home Layout') : t('更换组件', 'Change Widgets') }}
        <span v-if="selectedTileId" class="home-edit-tip">
          {{ canFreelyMoveHomeTiles ? t(' · 已选择项目', ' · Item selected') : t(' · 已选择组件', ' · Widget selected') }}
        </span>
      </span>
      <div class="home-edit-actions">
        <button v-if="selectedTileId" @click="clearSelectedTile" class="home-edit-btn">{{ t('取消', 'Clear') }}</button>
        <button @click="exitLayoutMode" class="home-edit-btn is-primary">{{ t('完成', 'Done') }}</button>
      </div>
    </div>

    <div v-if="layoutToastText" class="home-layout-toast" aria-live="polite">
      <i class="fas fa-check-circle"></i>
      <span>{{ layoutToastText }}</span>
    </div>

    <div v-if="widgetReplaceTarget" class="home-widget-replace-sheet" data-no-layout-longpress>
      <div class="home-widget-replace-head">
        <div>
          <span>{{ widgetReplaceTarget.size }}</span>
          <h2>{{ t('更换组件', 'Change Widget') }}</h2>
          <p>{{ widgetReplaceTarget.label }} · {{ homePageLabel(widgetReplaceTarget.pageIndex) }}</p>
        </div>
        <button
          class="home-widget-replace-close"
          type="button"
          @click="closeWidgetReplaceSheet"
          :aria-label="t('关闭', 'Close')"
        >
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <div v-if="widgetReplaceCandidates.length > 0" class="home-widget-replace-list">
        <button
          v-for="candidate in widgetReplaceCandidates"
          :key="candidate.tileId"
          class="home-widget-replace-option"
          type="button"
          @click="replaceWidgetAtTarget(candidate.tileId)"
        >
          <span class="home-widget-replace-icon">
            <i :class="candidate.icon"></i>
          </span>
          <span class="home-widget-replace-copy">
            <strong>{{ candidate.label }}</strong>
            <small>
              {{
                typeof candidate.pageIndex === 'number'
                  ? `${homePageLabel(candidate.pageIndex)} · ${t('将替换当前位置', 'Swap into this slot')}`
                  : t('可加入当前位置', 'Available here')
              }}
            </small>
          </span>
        </button>
      </div>
      <p v-else class="home-widget-replace-empty">
        {{ t('暂无同尺寸组件。', 'No same-size widgets yet.') }}
      </p>
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

    <div class="home-page-track" :style="{ transform: `translate3d(-${currentPage * 100}%, 0, 0)` }">
      <section v-for="(page, pageIndex) in widgetPages" :key="pageIndex" class="home-page">
        <div class="home-headline" v-if="pageIndex === 0">
          <h1 class="home-title">
            {{ t('你好，', 'Hello,') }} <span class="home-accent">{{ user.name }}</span>
          </h1>
          <p class="home-subtitle">{{ t('一切准备就绪。', 'Everything is ready.') }}</p>
        </div>

        <section
          v-if="pageIndex === 0 && smartPanelEnabled"
          class="home-smart-panel"
          data-testid="home-smart-panel"
        >
          <div class="home-smart-panel-head">
            <div>
              <p class="home-smart-kicker">{{ t('More Labs', 'More Labs') }}</p>
              <h2>{{ t('智能面板', 'Smart Panel') }}</h2>
            </div>
            <span>{{ t('只读', 'Read-only') }}</span>
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
            <template v-for="tileId in page" :key="tileId">
              <div
                :class="[
                  'home-tile',
                  tileMeta(tileId)?.span || 'col-span-1 row-span-1',
                  {
                    'is-layout-dragging': canFreelyMoveHomeTiles && dragTileId === tileId,
                    'is-layout-selected': isTileSelected(tileId),
                    'is-pressed': pressedTileId === tileId,
                    'is-drop-confirm': droppedTileId === tileId,
                  },
                ]"
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
                <div v-if="isTileSelected(tileId)" class="home-edit-selected-badge">
                  <i class="fas fa-check"></i>
                </div>

                <template v-if="tileMeta(tileId)?.kind === 'widget'">
                  <div class="home-widget-card" v-if="tileMeta(tileId)?.variant === 'weather'">
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

                  <div class="home-widget-card home-widget-center" v-else-if="tileMeta(tileId)?.variant === 'calendar'">
                    <span class="home-calendar-week">{{
                      today.toLocaleString(languageBase === 'zh' ? 'zh-CN' : systemLanguage, { weekday: 'short' })
                    }}</span>
                    <span class="home-calendar-day">{{ today.getDate() }}</span>
                  </div>

                  <div class="home-widget-card home-widget-music" v-else-if="tileMeta(tileId)?.variant === 'music'">
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

                  <div class="home-widget-card" v-else-if="tileMeta(tileId)?.variant === 'system'">
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

                  <button class="home-widget-card home-widget-quick" v-else-if="tileMeta(tileId)?.variant === 'heart'">
                    <i class="fas fa-heart"></i>
                  </button>

                  <button class="home-widget-card home-widget-quick" v-else-if="tileMeta(tileId)?.variant === 'disc'">
                    <i class="fas fa-compact-disc"></i>
                  </button>
                </template>

                <button class="home-app-tile" v-else-if="tileMeta(tileId)?.kind === 'app'" @click="openAppById(tileId)">
                  <span class="home-app-icon" :style="iconStyle(tileMeta(tileId).accent)">
                    <i :class="tileMeta(tileId).icon"></i>
                  </span>
                  <span class="home-app-label">{{ tileMeta(tileId).label }}</span>
                </button>

                <button
                  class="home-app-tile home-folder-tile"
                  v-else-if="tileMeta(tileId)?.kind === HOME_FOLDER_TILE_KIND"
                  @click="openAppById(tileId)"
                  :data-testid="`home-folder-${tileId}`"
                >
                  <span class="home-app-icon home-folder-icon" :style="iconStyle(tileMeta(tileId).accent)">
                    <span class="home-folder-preview-grid" aria-hidden="true">
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

                <div class="home-custom-widget-card" v-else-if="tileMeta(tileId)?.kind === 'custom_widget'">
                  <iframe
                    class="home-custom-widget-frame"
                    :class="{ 'is-editing': layoutEditMode }"
                    :srcdoc="customWidgetSrcDoc(tileId)"
                    sandbox="allow-scripts"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  ></iframe>
                </div>
              </div>
            </template>
          </div>

          <div v-if="layoutEditMode && canFreelyMoveHomeTiles" class="home-grid-slot-overlay" aria-hidden="true">
            <button
              v-for="slotIndex in layoutSlotIndices"
              :key="`slot-${pageIndex}-${slotIndex}`"
              class="home-grid-slot"
              :data-home-slot-index="slotIndex"
              :data-home-slot-page="pageIndex"
              @click.stop="onLayoutSlotClick(pageIndex, slotIndex)"
            ></button>
            <div
              v-if="dragPreviewAreaStyleForPage(pageIndex)"
              class="home-grid-drop-preview"
              :style="dragPreviewAreaStyleForPage(pageIndex)"
            ></div>
          </div>
        </div>
      </section>
    </div>

    <div class="home-bottom-area" :class="{ 'is-editing': layoutEditMode }" data-no-layout-longpress>
      <div class="home-page-dots">
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
        <button class="home-dock-icon" :style="iconStyle(dockAppMeta('app_gallery').accent)" @click="openAppById('app_gallery')">
          <i :class="dockAppMeta('app_gallery').icon"></i>
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
  padding: 8px 10px;
  border-radius: 18px;
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

.home-edit-spacer {
  width: 54px;
  flex: 0 0 auto;
}

.home-edit-title {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-edit-tip {
  font-weight: 500;
  opacity: 0.85;
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

.home-widget-replace-sheet {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(96px + env(safe-area-inset-bottom));
  z-index: 66;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(19, 25, 34, 0.72);
  box-shadow: 0 24px 54px rgba(8, 13, 22, 0.28);
  color: #fff;
  padding: 12px;
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
}

.home-widget-replace-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.home-widget-replace-head span {
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

.home-widget-replace-head h2 {
  margin: 6px 0 2px;
  font-size: 15px;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: 0;
}

.home-widget-replace-head p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  line-height: 1.35;
}

.home-widget-replace-close {
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

.home-widget-replace-list {
  display: grid;
  gap: 8px;
  max-height: 210px;
  overflow-y: auto;
  padding-right: 2px;
}

.home-widget-replace-option {
  min-height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  text-align: left;
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease;
}

.home-widget-replace-option:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.17);
}

.home-widget-replace-icon {
  width: 36px;
  height: 36px;
  border-radius: 13px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  font-size: 14px;
}

.home-widget-replace-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.home-widget-replace-copy strong,
.home-widget-replace-copy small {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-widget-replace-copy strong {
  font-size: 12px;
  line-height: 1.25;
}

.home-widget-replace-copy small {
  color: rgba(255, 255, 255, 0.66);
  font-size: 10px;
  line-height: 1.25;
}

.home-widget-replace-empty {
  margin: 0;
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.72);
  text-align: center;
  font-size: 12px;
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
  font-size: 11px;
  line-height: 1;
  min-height: 28px;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.12);
}

.home-edit-btn.is-primary {
  background: var(--system-accent);
  border-color: var(--system-accent);
}

.home-tile {
  position: relative;
  z-index: 2;
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

.home-grid-wrap {
  position: relative;
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
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(6, 78px);
  gap: 12px;
}

.home-grid-slot {
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.075);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    inset 0 0 0 1px rgba(15, 23, 42, 0.045);
  transition: background 120ms ease, border-color 120ms ease;
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

.home-custom-widget-card {
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
  opacity: 0.72;
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
