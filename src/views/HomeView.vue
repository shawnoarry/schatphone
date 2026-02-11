<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'

defineProps({
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
const systemStore = useSystemStore()

const { settings, user, availableThemes } = storeToRefs(systemStore)

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

const dragTileId = ref('')
const dragPointerId = ref(null)
const dragPreviewPageIndex = ref(-1)
const dragPreviewSlotIndex = ref(-1)
const dragGhostX = ref(0)
const dragGhostY = ref(0)
const dragGhostWidth = ref(72)
const dragGhostHeight = ref(72)

let longPressTimerId = null
let lastDragPageSwitchAt = 0
let layoutToastTimerId = null
let droppedTileTimerId = null

const LONG_PRESS_MS = 600
const LONG_PRESS_MOVE_THRESHOLD = 12
const DRAG_EDGE_ZONE_PX = 36
const DRAG_PAGE_SWITCH_COOLDOWN_MS = 260
const LAYOUT_SLOT_COLUMNS = 4
const LAYOUT_SLOT_ROWS = 6
const LAYOUT_SLOT_GAP = 12
const LAYOUT_SLOT_HEIGHT = 78

const WIDGET_VARIANT_META = {
  weather: { label: '天气', icon: 'fas fa-cloud-sun' },
  calendar: { label: '日历', icon: 'fas fa-calendar-days' },
  music: { label: '音乐', icon: 'fas fa-music' },
  system: { label: '系统', icon: 'fas fa-microchip' },
  heart: { label: '快捷爱心', icon: 'fas fa-heart' },
  disc: { label: '快捷唱片', icon: 'fas fa-compact-disc' },
}

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
  app_more: { kind: 'app', icon: 'fas fa-ellipsis-h', label: 'More', accent: 'default', route: '/more' },
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
const canDragToPrevPage = computed(() => currentPage.value > 0)
const canDragToNextPage = computed(() => currentPage.value < totalPages.value - 1)

const clampPage = (page) => Math.min(totalPages.value - 1, Math.max(0, page))

const setPage = (page) => {
  currentPage.value = clampPage(page)
}

const tileMeta = (tileId) => {
  const builtIn = widgetRegistry[tileId]
  if (builtIn) return builtIn

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

const customWidgetSrcDoc = (tileId) => customWidgetSrcDocMap.value.get(tileId) || ''
const hasActiveDrag = computed(() => layoutEditMode.value && !!dragTileId.value)
const dragTileSpan = computed(() => tileSpanForId(dragTileId.value))

const dragGhostMeta = computed(() => {
  const tileId = dragTileId.value
  if (!tileId) return null

  const meta = tileMeta(tileId)
  if (!meta) return null

  if (meta.kind === 'app') {
    return {
      kind: 'app',
      label: meta.label,
      icon: meta.icon,
      accent: meta.accent || 'default',
    }
  }

  if (meta.kind === 'custom_widget') {
    return {
      kind: 'custom_widget',
      label: meta.label || 'Custom Widget',
      icon: 'fas fa-code',
    }
  }

  const variant = WIDGET_VARIANT_META[meta.variant] || {
    label: 'Widget',
    icon: 'fas fa-puzzle-piece',
  }
  return {
    kind: 'widget',
    label: variant.label,
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

const isTileSelected = (tileId) => layoutEditMode.value && selectedTileId.value === tileId

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

const triggerLayoutToast = (text = '布局已保存') => {
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
  if (!tile || tile.kind !== 'app') return

  if (tile.route) {
    maybeVibrate(8)
    router.push(tile.route)
    return
  }

  alert(`App "${tile.label}" 正在开发中`)
}

const clearLongPressTimer = () => {
  if (!longPressTimerId) return
  clearTimeout(longPressTimerId)
  longPressTimerId = null
}

const canStartLayoutLongPress = (event) => {
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

  if (!layoutEditMode.value) return

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
  if (!layoutEditMode.value) return
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
  clearTilePressed()

  if (!layoutEditMode.value) return
  if (dragPointerId.value !== event.pointerId) return

  if (dragTileId.value && dragPreviewPageIndex.value >= 0 && dragPreviewSlotIndex.value >= 0) {
    const moved = moveTileToSlot(dragTileId.value, dragPreviewPageIndex.value, dragPreviewSlotIndex.value)
    if (moved) {
      triggerDroppedTileFeedback(dragTileId.value)
      triggerLayoutToast('布局已保存')
      maybeVibrate(12)
      systemStore.saveNow()
    }
    selectedTileId.value = dragTileId.value
  }

  dragEdgeDirection.value = ''
  resetDragState()
}

const onTileClick = (tileId) => {
  if (!layoutEditMode.value) return
  selectTileForLayout(tileId)
}

const clearSelectedTile = () => {
  selectedTileId.value = ''
  maybeVibrate(8)
}

const onGridClick = (pageIndex, event) => {
  if (!layoutEditMode.value || !selectedTileId.value) return
  if (hasActiveDrag.value) return

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
    triggerLayoutToast('布局已保存')
    maybeVibrate(12)
    systemStore.saveNow()
  }
}

const onLayoutSlotClick = (pageIndex, slotIndex) => {
  if (!layoutEditMode.value || !selectedTileId.value) return
  if (hasActiveDrag.value) return
  const moved = moveTileToSlot(selectedTileId.value, pageIndex, slotIndex)
  if (moved) {
    triggerDroppedTileFeedback(selectedTileId.value)
    triggerLayoutToast('布局已保存')
    maybeVibrate(12)
    systemStore.saveNow()
  }
}

const hideTileFromHome = (tileId) => {
  if (!canHideTile(tileId)) return
  const nextPages = widgetPages.value.map((page) => page.filter((id) => id !== tileId))
  systemStore.setHomeWidgetPages(nextPages)
  if (dragTileId.value === tileId) {
    resetDragState()
  }
  if (selectedTileId.value === tileId) {
    selectedTileId.value = ''
  }
  triggerLayoutToast('组件已隐藏')
  maybeVibrate(10)
  systemStore.saveNow()
}

const resetHomeLayout = () => {
  const ok = window.confirm('确认恢复 Home 默认布局吗？')
  if (!ok) return
  systemStore.resetHomeWidgetPages()
  systemStore.saveNow()
  triggerLayoutToast('已恢复默认布局')
  maybeVibrate(14)
}

const exitLayoutMode = () => {
  resetDragState()
  selectedTileId.value = ''
  clearTilePressed()
  dragEdgeDirection.value = ''
  layoutEditMode.value = false
  ignoreAppOpenUntil.value = Date.now() + 220
  systemStore.saveNow()
}

onBeforeUnmount(() => {
  clearLongPressTimer()
  resetDragState()
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
      <button @click="resetHomeLayout" class="home-edit-btn">重置</button>
      <span class="home-edit-title">
        编辑主屏<span v-if="selectedTileId" class="home-edit-tip"> · 可拖拽吸附，也可点半透明格子投放</span>
      </span>
      <div class="home-edit-actions">
        <button v-if="selectedTileId" @click="clearSelectedTile" class="home-edit-btn">取消选中</button>
        <button @click="exitLayoutMode" class="home-edit-btn is-primary">完成</button>
      </div>
    </div>

    <div v-if="layoutToastText" class="home-layout-toast" aria-live="polite">
      <i class="fas fa-check-circle"></i>
      <span>{{ layoutToastText }}</span>
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
          v-if="dragGhostMeta?.kind === 'app'"
          class="home-drag-ghost-icon"
          :style="iconStyle(dragGhostMeta.accent)"
        >
          <i :class="dragGhostMeta.icon"></i>
        </span>
        <span v-else class="home-drag-ghost-icon is-widget">
          <i :class="dragGhostMeta?.icon || 'fas fa-puzzle-piece'"></i>
        </span>
        <span class="home-drag-ghost-label">{{ dragGhostMeta?.label || '移动中' }}</span>
      </div>
    </div>

    <div class="home-page-track" :style="{ transform: `translate3d(-${currentPage * 100}%, 0, 0)` }">
      <section v-for="(page, pageIndex) in widgetPages" :key="pageIndex" class="home-page">
        <div class="home-headline" v-if="pageIndex === 0">
          <h1 class="home-title">
            Hello, <span class="home-accent">{{ user.name }}</span>
          </h1>
          <p class="home-subtitle">Everything is ready.</p>
        </div>

        <div class="home-search-pill" v-if="pageIndex === 1">
          <i class="fas fa-search"></i>
          <span>Search System...</span>
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
                    'is-layout-dragging': layoutEditMode && dragTileId === tileId,
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
                  v-if="layoutEditMode && canHideTile(tileId)"
                  class="home-edit-hide"
                  @pointerdown.stop
                  @click.stop="hideTileFromHome(tileId)"
                  title="隐藏"
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
                      <span>Tokyo</span>
                    </div>
                    <div class="home-widget-temp">18°</div>
                    <div class="home-widget-bottomline">
                      <i class="fas fa-sun home-accent"></i>
                      <span>Clear</span>
                    </div>
                  </div>

                  <div class="home-widget-card home-widget-center" v-else-if="tileMeta(tileId)?.variant === 'calendar'">
                    <span class="home-calendar-week">{{ today.toLocaleString('en-US', { weekday: 'short' }) }}</span>
                    <span class="home-calendar-day">{{ today.getDate() }}</span>
                  </div>

                  <div class="home-widget-card home-widget-music" v-else-if="tileMeta(tileId)?.variant === 'music'">
                    <div class="home-music-cover"></div>
                    <div class="home-music-meta">
                      <span class="home-widget-topline">Now Playing</span>
                      <h3>Cyber Heart</h3>
                      <p>Neo Tokyo 2077 Mix</p>
                      <div class="home-progress">
                        <div class="home-progress-fill"></div>
                      </div>
                    </div>
                  </div>

                  <div class="home-widget-card" v-else-if="tileMeta(tileId)?.variant === 'system'">
                    <div class="home-widget-topline">
                      <i class="fas fa-microchip"></i>
                      <span>System</span>
                    </div>
                    <div class="home-widget-bottomline">
                      <span>CPU 42%</span>
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

          <div v-if="layoutEditMode" class="home-grid-slot-overlay" aria-hidden="true">
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
          :aria-label="`Go to page ${index}`"
        ></button>
      </div>
      <p class="text-[10px] text-white/70 mt-1" v-if="!layoutEditMode">长按桌面空白处可进入布局编辑</p>

      <div class="home-dock">
        <button class="home-dock-icon" :style="iconStyle('cool')" @click="openAppById('app_chat')">
          <i class="fas fa-comment"></i>
        </button>
        <button class="home-dock-icon" :style="iconStyle('light')" @click="openAppById('app_contacts')">
          <i class="fas fa-address-book"></i>
        </button>
        <button class="home-dock-icon" :style="iconStyle('dark')" @click="openAppById('app_settings')">
          <i class="fas fa-cog"></i>
        </button>
        <button class="home-dock-icon" :style="iconStyle('warm')" @click="openAppById('app_gallery')">
          <i class="fas fa-images"></i>
        </button>
      </div>
      <p class="home-theme-hint" v-if="activeTheme">Theme: {{ activeTheme.name }}</p>
    </div>
  </div>
</template>

<style scoped>
.home-edit-topbar {
  position: absolute;
  top: 44px;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
}

.home-edit-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.home-edit-title {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
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
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(17, 24, 39, 0.64);
  border-radius: 999px;
  padding: 5px 10px;
  backdrop-filter: blur(10px);
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
  background: rgba(37, 99, 235, 0.4);
  border-color: rgba(191, 219, 254, 0.8);
}

.home-edit-btn {
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.12);
}

.home-edit-btn.is-primary {
  background: #2563eb;
  border-color: #2563eb;
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
  outline: 2px solid rgba(59, 130, 246, 0.95);
  outline-offset: 3px;
  border-radius: 20px;
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
  background: #ef4444;
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
  background: #2563eb;
  color: #fff;
  font-size: 10px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}

.home-grid-wrap {
  position: relative;
}

.home-grid.is-editing {
  min-height: calc(6 * 78px + 5 * 12px);
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
  border-radius: 18px;
  border: 1px dashed rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.11);
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.06);
  transition: background 120ms ease, border-color 120ms ease;
}

.home-grid-slot:active {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(96, 165, 250, 0.9);
}

.home-grid-drop-preview {
  pointer-events: none;
  border-radius: 18px;
  border: 1px solid rgba(96, 165, 250, 0.95);
  background: rgba(59, 130, 246, 0.24);
  box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.95);
  transition: all 150ms cubic-bezier(0.17, 0.84, 0.44, 1);
}

.home-custom-widget-card {
  width: 100%;
  height: 100%;
  border-radius: 22px;
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
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.38);
  background: rgba(13, 25, 52, 0.58);
  backdrop-filter: blur(16px);
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
