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

const dragTileId = ref('')
const dragPointerId = ref(null)

let longPressTimerId = null
let lastDragPageSwitchAt = 0

const LONG_PRESS_MS = 600
const LONG_PRESS_MOVE_THRESHOLD = 12
const DRAG_EDGE_ZONE_PX = 36
const DRAG_PAGE_SWITCH_COOLDOWN_MS = 260

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
  app_files: { kind: 'app', icon: 'fas fa-folder', label: 'Files', accent: 'cool' },
  app_more: { kind: 'app', icon: 'fas fa-ellipsis-h', label: 'More', accent: 'default' },
}

const widgetPages = computed(() => settings.value.appearance.homeWidgetPages || [])
const totalPages = computed(() => Math.max(widgetPages.value.length, 1))
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

const clampPage = (page) => Math.min(totalPages.value - 1, Math.max(0, page))

const setPage = (page) => {
  currentPage.value = clampPage(page)
}

const openAppById = (tileId) => {
  if (layoutEditMode.value) return

  const tile = widgetRegistry[tileId]
  if (!tile || tile.kind !== 'app') return

  if (tile.route) {
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
    '.home-tile, .home-app-tile, .home-widget-card, .home-dock, .home-page-dots, .home-search-pill, .home-headline, [data-no-layout-longpress]',
  )
}

const scheduleLongPress = (event, x, y) => {
  if (!canStartLayoutLongPress(event)) return

  clearLongPressTimer()
  longPressStartX.value = x
  longPressStartY.value = y

  longPressTimerId = setTimeout(() => {
    layoutEditMode.value = true
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
}

const iconStyle = (accent = 'default') => {
  return {
    background: `var(--home-icon-${accent}-bg)`,
    color: `var(--home-icon-${accent}-fg)`,
  }
}

const tileMeta = (tileId) => widgetRegistry[tileId] || null

const moveTileBeforeTarget = (movingTileId, targetTileId) => {
  if (!movingTileId || !targetTileId || movingTileId === targetTileId) return

  const fromPageIndex = tilePageIndexMap.value.get(movingTileId)
  const targetPageIndex = tilePageIndexMap.value.get(targetTileId)

  if (typeof fromPageIndex !== 'number' || fromPageIndex !== targetPageIndex) return

  const page = [...widgetPages.value[fromPageIndex]]
  const fromIndex = page.indexOf(movingTileId)
  const targetIndex = page.indexOf(targetTileId)

  if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return

  page.splice(fromIndex, 1)
  const nextTargetIndex = page.indexOf(targetTileId)
  page.splice(nextTargetIndex, 0, movingTileId)

  const nextPages = widgetPages.value.map((items, index) => (index === fromPageIndex ? page : [...items]))
  systemStore.setHomeWidgetPages(nextPages)
}

const moveTileToPageEnd = (tileId, targetPageIndex) => {
  const fromPageIndex = tilePageIndexMap.value.get(tileId)
  if (typeof fromPageIndex !== 'number') return
  if (fromPageIndex === targetPageIndex) return

  const nextPages = widgetPages.value.map((page) => [...page])
  nextPages[fromPageIndex] = nextPages[fromPageIndex].filter((id) => id !== tileId)

  while (nextPages.length <= targetPageIndex) {
    nextPages.push([])
  }
  nextPages[targetPageIndex].push(tileId)
  systemStore.setHomeWidgetPages(nextPages)
}

const startTileDrag = (tileId, event) => {
  if (!layoutEditMode.value) return

  dragTileId.value = tileId
  dragPointerId.value = event.pointerId
  lastDragPageSwitchAt = 0

  if (event.currentTarget && typeof event.currentTarget.setPointerCapture === 'function') {
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  event.preventDefault()
}

const onTilePointerMove = (event) => {
  if (!layoutEditMode.value) return
  if (!dragTileId.value || dragPointerId.value !== event.pointerId) return

  const now = Date.now()
  if (now - lastDragPageSwitchAt >= DRAG_PAGE_SWITCH_COOLDOWN_MS) {
    const x = event.clientX
    if (x <= DRAG_EDGE_ZONE_PX && currentPage.value > 0) {
      const nextPage = currentPage.value - 1
      moveTileToPageEnd(dragTileId.value, nextPage)
      setPage(nextPage)
      lastDragPageSwitchAt = now
      return
    }
    if (x >= window.innerWidth - DRAG_EDGE_ZONE_PX && currentPage.value < totalPages.value - 1) {
      const nextPage = currentPage.value + 1
      moveTileToPageEnd(dragTileId.value, nextPage)
      setPage(nextPage)
      lastDragPageSwitchAt = now
      return
    }
  }

  const overEl = document.elementFromPoint(event.clientX, event.clientY)
  if (!(overEl instanceof HTMLElement)) return

  const tileEl = overEl.closest('[data-home-tile-id]')
  if (!(tileEl instanceof HTMLElement)) return

  const targetTileId = tileEl.dataset.homeTileId
  if (!targetTileId) return

  moveTileBeforeTarget(dragTileId.value, targetTileId)
}

const stopTileDrag = (event) => {
  if (!layoutEditMode.value) return
  if (dragPointerId.value !== event.pointerId) return

  dragTileId.value = ''
  dragPointerId.value = null
  lastDragPageSwitchAt = 0
}

const hideTileFromHome = (tileId) => {
  const nextPages = widgetPages.value.map((page) => page.filter((id) => id !== tileId))
  systemStore.setHomeWidgetPages(nextPages)
}

const resetHomeLayout = () => {
  const ok = window.confirm('确认恢复 Home 默认布局吗？')
  if (!ok) return
  systemStore.resetHomeWidgetPages()
  systemStore.saveNow()
}

const exitLayoutMode = () => {
  dragTileId.value = ''
  dragPointerId.value = null
  lastDragPageSwitchAt = 0
  layoutEditMode.value = false
  systemStore.saveNow()
}

onBeforeUnmount(() => {
  clearLongPressTimer()
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
      <span class="home-edit-title">编辑主屏</span>
      <button @click="exitLayoutMode" class="home-edit-btn is-primary">完成</button>
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

        <div class="home-grid">
          <template v-for="tileId in page" :key="tileId">
            <div
              :class="[
                'home-tile',
                tileMeta(tileId)?.span || 'col-span-1 row-span-1',
                { 'is-layout-dragging': layoutEditMode && dragTileId === tileId },
              ]"
              :data-home-tile-id="tileId"
              @pointerdown="startTileDrag(tileId, $event)"
              @pointermove="onTilePointerMove"
              @pointerup="stopTileDrag"
              @pointercancel="stopTileDrag"
            >
              <button
                v-if="layoutEditMode"
                class="home-edit-hide"
                @click.stop="hideTileFromHome(tileId)"
                title="隐藏"
                data-no-layout-longpress
              >
                <i class="fas fa-minus"></i>
              </button>

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

                <div
                  class="home-widget-card home-widget-center"
                  v-else-if="tileMeta(tileId)?.variant === 'calendar'"
                >
                  <span class="home-calendar-week">{{ today.toLocaleString('en-US', { weekday: 'short' }) }}</span>
                  <span class="home-calendar-day">{{ today.getDate() }}</span>
                </div>

                <div
                  class="home-widget-card home-widget-music"
                  v-else-if="tileMeta(tileId)?.variant === 'music'"
                >
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

                <div
                  class="home-widget-card"
                  v-else-if="tileMeta(tileId)?.variant === 'system'"
                >
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

                <button
                  class="home-widget-card home-widget-quick"
                  v-else-if="tileMeta(tileId)?.variant === 'heart'"
                >
                  <i class="fas fa-heart"></i>
                </button>

                <button
                  class="home-widget-card home-widget-quick"
                  v-else-if="tileMeta(tileId)?.variant === 'disc'"
                >
                  <i class="fas fa-compact-disc"></i>
                </button>
              </template>

              <button
                class="home-app-tile"
                v-else-if="tileMeta(tileId)?.kind === 'app'"
                @click="openAppById(tileId)"
              >
                <span class="home-app-icon" :style="iconStyle(tileMeta(tileId).accent)">
                  <i :class="tileMeta(tileId).icon"></i>
                </span>
                <span class="home-app-label">{{ tileMeta(tileId).label }}</span>
              </button>
            </div>
          </template>
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

.home-edit-title {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
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

.is-layout-dragging {
  opacity: 0.8;
}

.home-bottom-area.is-editing {
  opacity: 0.72;
}
</style>
