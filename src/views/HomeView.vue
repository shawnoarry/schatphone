<script setup>
import { computed, ref } from 'vue'
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

const activeTheme = computed(() => {
  return availableThemes.value.find((theme) => theme.id === settings.value.appearance.currentTheme) || null
})

const clampPage = (page) => Math.min(totalPages.value - 1, Math.max(0, page))

const setPage = (page) => {
  currentPage.value = clampPage(page)
}

const openAppById = (tileId) => {
  const tile = widgetRegistry[tileId]
  if (!tile || tile.kind !== 'app') return

  if (tile.route) {
    router.push(tile.route)
    return
  }

  alert(`App "${tile.label}" 正在开发中`)
}

const onTouchStart = (event) => {
  touchStartX.value = event.changedTouches[0].clientX
  touchDeltaX.value = 0
}

const onTouchMove = (event) => {
  touchDeltaX.value = event.changedTouches[0].clientX - touchStartX.value
}

const onTouchEnd = () => {
  const threshold = 48
  if (touchDeltaX.value <= -threshold) {
    setPage(currentPage.value + 1)
  } else if (touchDeltaX.value >= threshold) {
    setPage(currentPage.value - 1)
  }
  touchDeltaX.value = 0
}

const iconStyle = (accent = 'default') => {
  return {
    background: `var(--home-icon-${accent}-bg)`,
    color: `var(--home-icon-${accent}-fg)`,
  }
}

const tileMeta = (tileId) => widgetRegistry[tileId] || null
</script>

<template>
  <div class="home-shell" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend="onTouchEnd">
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
            <div :class="['home-tile', tileMeta(tileId)?.span || 'col-span-1 row-span-1']">
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
            </div>
          </template>
        </div>
      </section>
    </div>

    <div class="home-bottom-area">
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
