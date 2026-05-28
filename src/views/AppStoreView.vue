<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { resolveAppIconMeta } from '../lib/app-icon-presentation'
import { buildRouteWithReturnSource, pushReturnTarget } from '../lib/navigation-return'
import { APP_STORE_HOME_APP_ID, APP_STORE_ROUTE } from '../lib/planned-module-registry'
import { useSystemStore } from '../stores/system'

const router = useRouter()
const route = useRoute()
const { t, systemLanguage, languageBase } = useI18n()
const systemStore = useSystemStore()
const { settings } = storeToRefs(systemStore)

const locale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))
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

const selectedFilter = ref('all')
const selectedAppId = ref('app_chat')
const searchQuery = ref('')
const libraryNotice = ref('')
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
      if (typeof appId === 'string' && appId.startsWith('app_')) {
        map.set(appId, pageIndex)
      }
    })
  })
  return map
})

const appStoreItems = computed(() =>
  APP_STORE_ENTRIES.map((entry) => {
    const iconMeta = resolveAppIconMeta(entry.id, settings.value.appearance?.appIconOverrides || {}, locale.value)
    const visible = visibleHomeAppIds.value.has(entry.id)
    const inDock = DOCK_APP_IDS.has(entry.id)
    return {
      ...entry,
      icon: iconMeta.icon,
      accent: iconMeta.accent,
      toneClass: iconMeta.toneClass,
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
  if (selectedApp.value?.visible && Number.isInteger(selectedApp.value.homePageIndex)) {
    return t(`第 ${selectedApp.value.homePageIndex + 1} 屏`, `Screen ${selectedApp.value.homePageIndex + 1}`)
  }
  if (selectedApp.value?.inDock) return 'Dock'
  return t('应用库', 'Library')
})

const selectedAppStatusLabel = computed(() => {
  if (selectedApp.value?.visible) return t('主屏可见', 'On Home')
  if (selectedApp.value?.inDock) return t('Dock 常驻', 'In Dock')
  return t('库内待放置', 'In Library')
})

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
  router.push(buildRouteWithReturnSource(selectedApp.value.route, 'home', { homePage: route.query.homePage }))
}

const selectFilter = (filterId) => {
  selectedFilter.value = filterId
  const firstMatch = appStoreItems.value.find((item) => appMatchesFilter(item, filterId) && appMatchesSearch(item))
  if (firstMatch) selectedAppId.value = firstMatch.id
}

const selectApp = (appId) => {
  selectedAppId.value = appId
}

const clearAppSearch = () => {
  searchQuery.value = ''
  const firstMatch = appStoreItems.value.find((item) => appMatchesFilter(item, selectedFilter.value))
  if (firstMatch) selectedAppId.value = firstMatch.id
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
          <span class="app-store-featured-icon" :class="app.toneClass">
            <i :class="app.icon"></i>
          </span>
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
              :class="{ 'is-visible': app.visible, 'is-selected': selectedApp?.id === app.id }"
              :data-testid="`app-store-item-${app.id}`"
              @click="selectApp(app.id)"
            >
              <span class="app-store-item-icon" :class="app.toneClass">
                <i :class="app.icon"></i>
              </span>
              <span class="app-store-item-copy">
                <strong>{{ app.label }}</strong>
                <small>{{ app.category }} · {{ app.desc }}</small>
              </span>
              <span class="app-store-item-state">
                {{ app.visible ? t('主屏', 'Home') : app.inDock ? 'Dock' : t('库内', 'Library') }}
              </span>
            </button>
            <div v-if="filteredAppStoreItems.length === 0" class="app-store-empty" data-testid="app-store-empty">
              <i class="fas fa-magnifying-glass"></i>
              <strong>{{ t('没有找到应用', 'No apps found') }}</strong>
              <span>{{ t('换个关键词或分类试试。', 'Try another search or category.') }}</span>
            </div>
          </div>

          <article v-if="selectedApp" class="app-store-detail" data-testid="app-store-detail">
            <div class="app-store-detail-hero">
              <span class="app-store-detail-icon" :class="selectedApp.toneClass">
                <i :class="selectedApp.icon"></i>
              </span>
              <div>
                <p>{{ selectedApp.category }}</p>
                <h2>{{ selectedApp.label }}</h2>
                <span>{{ selectedAppPlacementLabel }}</span>
              </div>
            </div>
            <p class="app-store-detail-desc">{{ selectedApp.desc }}</p>
            <div class="app-store-detail-stats">
              <span>
                <small>{{ t('状态', 'Status') }}</small>
                <strong>{{ selectedAppStatusLabel }}</strong>
              </span>
              <span>
                <small>{{ t('入口', 'Entry') }}</small>
                <strong>{{ selectedApp.entryKind === 'folder' ? t('文件夹', 'Folder') : 'APP' }}</strong>
              </span>
            </div>
            <div class="app-store-actions">
              <button type="button" class="app-store-action is-primary" @click="openSelectedApp" data-testid="app-store-open">
                <i class="fas fa-arrow-up-right-from-square"></i>
                <span>{{ t('打开', 'Open') }}</span>
              </button>
              <button type="button" class="app-store-action" @click="editSelectedAppOnHome" data-testid="app-store-add-home">
                <i :class="selectedApp.visible ? 'fas fa-table-cells' : 'fas fa-plus'"></i>
                <span>{{ selectedApp.visible ? t('调整位置', 'Edit on Home') : t('加入主屏', 'Add to Home') }}</span>
              </button>
              <button
                v-if="selectedApp.visible && !selectedApp.protectedHomeEntry"
                type="button"
                class="app-store-action is-danger"
                @click="removeSelectedAppFromHome"
                data-testid="app-store-remove-home"
              >
                <i class="fas fa-minus"></i>
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
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  gap: 14px;
}

.app-store-hero,
.app-store-panel,
.app-store-featured-item {
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
  margin-top: 13px;
  display: grid;
  gap: 12px;
}

.app-store-list {
  display: grid;
  gap: 9px;
}

.app-store-item {
  width: 100%;
  min-height: 66px;
  border: 1px solid var(--system-subtle-border);
  border-radius: 18px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px;
  color: var(--system-text);
  text-align: left;
  background: var(--system-control-bg);
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
  width: 44px;
  height: 44px;
  border-radius: 16px;
  font-size: 18px;
}

.app-store-item-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.app-store-item-copy strong {
  color: var(--system-text);
  font-size: 14px;
  font-weight: 820;
}

.app-store-item-copy small {
  color: var(--system-text-soft);
  font-size: 11px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-store-item-state {
  border-radius: 999px;
  padding: 5px 8px;
  color: var(--system-text-soft);
  background: var(--system-surface-muted);
  font-size: 10px;
  font-weight: 840;
}

.app-store-item.is-visible .app-store-item-state {
  color: var(--system-success);
  background: color-mix(in srgb, var(--system-success) 12%, var(--system-surface-muted));
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
}
</style>
