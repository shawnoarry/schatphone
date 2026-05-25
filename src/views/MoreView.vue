<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { buildRouteWithReturnSource, pushReturnTarget } from '../lib/navigation-return'
import { useSystemStore } from '../stores/system'
import { resolveAppIconMeta } from '../lib/app-icon-presentation'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const systemStore = useSystemStore()
const { settings } = storeToRefs(systemStore)

const APP_LIBRARY_ENTRIES = [
  {
    id: 'app_network',
    route: '/network',
    categoryZh: '系统',
    categoryEn: 'System',
    descZh: '模型与连接',
    descEn: 'Models and connections',
  },
  {
    id: 'app_chat',
    route: '/chat',
    categoryZh: '沟通',
    categoryEn: 'Social',
    descZh: '聊天与角色对话',
    descEn: 'Chats and role conversations',
  },
  {
    id: 'app_contacts',
    route: '/contacts',
    categoryZh: '沟通',
    categoryEn: 'Social',
    descZh: '联系人与角色档案',
    descEn: 'Contacts and role archive',
  },
  {
    id: 'app_gallery',
    route: '/gallery',
    categoryZh: '媒体',
    categoryEn: 'Media',
    descZh: '照片与素材',
    descEn: 'Photos and assets',
  },
  {
    id: 'app_map',
    route: '/map',
    categoryZh: '生活',
    categoryEn: 'Life',
    descZh: '地点与行程',
    descEn: 'Places and routes',
  },
  {
    id: 'app_calendar',
    route: '/calendar',
    categoryZh: '效率',
    categoryEn: 'Productivity',
    descZh: '日程与时间',
    descEn: 'Schedule and time',
  },
  {
    id: 'app_wallet',
    route: '/wallet',
    categoryZh: '财务',
    categoryEn: 'Finance',
    descZh: '钱包与余额',
    descEn: 'Wallet and balance',
  },
  {
    id: 'app_shopping',
    route: '/shopping',
    categoryZh: '生活',
    categoryEn: 'Life',
    descZh: '购物平台入口',
    descEn: 'Shopping platforms',
  },
  {
    id: 'app_food_delivery',
    route: '/food-delivery',
    categoryZh: '生活',
    categoryEn: 'Life',
    descZh: '外卖与餐饮',
    descEn: 'Food and delivery',
  },
  {
    id: 'app_assets',
    route: '/assets',
    categoryZh: '资料',
    categoryEn: 'Archive',
    descZh: '资产与档案',
    descEn: 'Assets and records',
  },
  {
    id: 'app_themes',
    route: '/appearance',
    categoryZh: '美化',
    categoryEn: 'Style',
    descZh: '主题与图标',
    descEn: 'Themes and icons',
  },
  {
    id: 'app_widgets',
    route: '/widgets',
    categoryZh: '美化',
    categoryEn: 'Style',
    descZh: '组件与导入',
    descEn: 'Widgets and imports',
  },
  {
    id: 'app_more',
    route: '/more',
    categoryZh: '系统',
    categoryEn: 'System',
    descZh: '入口与开关',
    descEn: 'Entries and toggles',
  },
]

const featureToggleMeta = computed(() => [
  {
    id: 'smart_panel',
    label: t('智能面板', 'Smart Panel'),
    desc: t('在 Today View 汇总当天节奏。', 'Summarize the day in Today View.'),
  },
  {
    id: 'focus_mode',
    label: t('专注模式', 'Focus Mode'),
    desc: t('锁屏仅保留最重要的提醒。', 'Keep only the most important lock-screen alerts.'),
  },
  {
    id: 'scene_switch',
    label: t('场景切换', 'Scene Switch'),
    desc: t('预览不同桌面节奏。', 'Preview different desktop rhythms.'),
  },
  {
    id: 'control_center',
    label: t('世界中枢', 'World Hub'),
    desc: t(
      '显示或隐藏主屏上的世界中枢入口。',
      'Show or hide the World Hub entry on Home.',
    ),
  },
])

const featureToggles = computed(() =>
  featureToggleMeta.value.map((item) => ({
    ...item,
    enabled: settings.value.more?.featureToggles?.[item.id] === true,
  })),
)
const sceneSwitchEnabled = computed(() => systemStore.isMoreFeatureToggleEnabled('scene_switch'))
const scenePresets = computed(() => [
  {
    id: 'work',
    title: t('工作', 'Work'),
    desc: t('日程、网络与设置更靠前', 'Calendar, Network, and Settings move forward'),
    icon: 'fas fa-briefcase',
  },
  {
    id: 'life',
    title: t('生活', 'Life'),
    desc: t('聊天、相册与钱包更靠前', 'Chat, Photos, and Wallet move forward'),
    icon: 'fas fa-mug-hot',
  },
  {
    id: 'story',
    title: t('沉浸', 'Immersive'),
    desc: t('地图、世界线索与角色状态组合', 'Map, world cues, and role states together'),
    icon: 'fas fa-compass',
  },
])

const quickEntries = computed(() => [
  {
    id: 'network',
    title: t('网络', 'Network'),
    desc: t('连接与模型', 'Connections and models'),
    route: '/network',
    icon: 'fas fa-network-wired',
    tone: 'cool',
  },
  {
    id: 'appearance',
    title: t('外观', 'Appearance'),
    desc: t('主题、字体、图标', 'Themes, fonts, icons'),
    route: '/appearance',
    icon: 'fas fa-palette',
    tone: 'default',
  },
  {
    id: 'settings',
    title: t('设置', 'Settings'),
    desc: t('系统与账号', 'System and account'),
    route: '/settings',
    icon: 'fas fa-cog',
    tone: 'dark',
  },
])
const visibleHomeAppIds = computed(
  () => new Set((settings.value.appearance?.homeWidgetPages || []).flat()),
)
const appLibraryItems = computed(() =>
  APP_LIBRARY_ENTRIES.map((entry) => ({
    ...entry,
    ...resolveAppIconMeta(entry.id, settings.value.appearance?.appIconOverrides || {}, 'zh-CN'),
    category: t(entry.categoryZh, entry.categoryEn),
    desc: t(entry.descZh, entry.descEn),
    visible: visibleHomeAppIds.value.has(entry.id),
  })),
)
const visibleAppCount = computed(
  () => appLibraryItems.value.filter((item) => item.visible).length,
)
const hiddenAppCount = computed(() => Math.max(0, appLibraryItems.value.length - visibleAppCount.value))
const activeFeatureCount = computed(() => featureToggles.value.filter((item) => item.enabled).length)

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const openEntry = (targetRoute) => {
  router.push(buildRouteWithReturnSource(targetRoute, 'home', { homePage: route.query.homePage }))
}

const openHomeAppEntryEditor = () => {
  router.push(buildRouteWithReturnSource('/home', 'home', { homePage: route.query.homePage, widgetEdit: '1' }))
}

const toggleFeature = (toggleId) => {
  systemStore.toggleMoreFeatureToggle(toggleId)
}
</script>

<template>
  <div class="more-view">
    <header class="more-topbar">
      <button type="button" class="more-back-button" @click="goHome">
        <i class="fas fa-chevron-left"></i>
        <span>{{ t('主页', 'Home') }}</span>
      </button>
      <div class="more-title-block">
        <span>{{ t('系统入口', 'System Hub') }}</span>
        <h1>{{ t('更多', 'More') }}</h1>
      </div>
    </header>

    <main class="more-scroll no-scrollbar">
      <section class="more-app-library-card">
        <div class="more-app-library-head">
          <div class="more-app-library-title">
            <span class="more-store-icon">
              <i class="fas fa-table-cells-large"></i>
            </span>
            <div>
              <p>{{ t('应用库', 'App Library') }}</p>
              <strong>{{ t('管理主屏入口', 'Manage Home entries') }}</strong>
            </div>
          </div>
          <button type="button" @click="openHomeAppEntryEditor" data-testid="more-app-library-edit-home">
            <i class="fas fa-table-cells"></i>
            <span>{{ t('整理主屏', 'Edit Home') }}</span>
          </button>
        </div>

        <div class="more-library-summary" aria-label="App Library summary">
          <span>
            <strong>{{ visibleAppCount }}</strong>
            {{ t('个在主屏', 'on Home') }}
          </span>
          <span>
            <strong>{{ hiddenAppCount }}</strong>
            {{ t('个在库内', 'in Library') }}
          </span>
        </div>

        <div class="more-app-library-grid" aria-label="App Library">
          <button
            v-for="app in appLibraryItems"
            :key="app.id"
            type="button"
            class="more-app-library-item"
            :class="{ 'is-visible': app.visible }"
            :title="app.label"
            @click="openEntry(app.route)"
          >
            <span class="more-app-icon" :class="app.toneClass">
              <i :class="app.icon"></i>
            </span>
            <span class="more-app-copy">
              <strong>{{ app.label }}</strong>
              <small>{{ app.category }} · {{ app.desc }}</small>
            </span>
            <span class="more-app-state">
              {{ app.visible ? t('主屏', 'Home') : t('库内', 'Library') }}
            </span>
          </button>
        </div>
      </section>

      <section class="more-panel more-shortcuts-panel">
        <div class="more-section-head">
          <p>{{ t('快捷入口', 'Quick Entries') }}</p>
          <span>{{ t('常用系统页', 'Frequent system pages') }}</span>
        </div>
        <div class="more-shortcut-grid">
          <button
            v-for="entry in quickEntries"
            :key="entry.id"
            @click="openEntry(entry.route)"
            :data-testid="`more-quick-entry-${entry.id}`"
            class="more-shortcut-card"
          >
            <span class="more-shortcut-icon" :class="`is-${entry.tone}`">
              <i :class="entry.icon"></i>
            </span>
            <span>
              <strong>{{ entry.title }}</strong>
              <small>{{ entry.desc }}</small>
            </span>
          </button>
        </div>
      </section>

      <section class="more-panel">
        <div class="more-section-head">
          <p>{{ t('系统开关', 'System Switches') }}</p>
          <span>{{ t(`${activeFeatureCount} 项已开启`, `${activeFeatureCount} active`) }}</span>
        </div>
        <div class="more-toggle-list">
          <article v-for="item in featureToggles" :key="item.id" class="more-toggle-row">
            <span class="more-toggle-copy">
              <strong>{{ item.label }}</strong>
              <small>{{ item.desc }}</small>
            </span>
            <button
              type="button"
              @click="toggleFeature(item.id)"
              :data-testid="`more-feature-toggle-${item.id}`"
              class="more-toggle-control"
              :class="{ 'is-on': item.enabled }"
              :aria-pressed="item.enabled"
            >
              <span></span>
              <em>{{ item.enabled ? t('开', 'On') : t('关', 'Off') }}</em>
            </button>
          </article>
        </div>
      </section>

      <section
        v-if="sceneSwitchEnabled"
        class="more-panel more-scene-panel"
        data-testid="more-scene-switch-preview"
      >
        <div class="more-section-head">
          <p>{{ t('场景切换预览', 'Scene Switch Preview') }}</p>
          <span>{{ t('桌面节奏草案', 'Desktop rhythm drafts') }}</span>
        </div>
        <div class="more-scene-list">
          <article v-for="scene in scenePresets" :key="scene.id" class="more-scene-row">
            <span>
              <i :class="scene.icon"></i>
            </span>
            <div>
              <strong>{{ scene.title }}</strong>
              <small>{{ scene.desc }}</small>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.more-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--system-text);
  background: var(--system-page-bg);
}

.more-topbar {
  flex: 0 0 auto;
  min-height: 86px;
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

.more-back-button {
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

.more-title-block {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.more-title-block span {
  color: var(--system-text-soft);
  font-size: 11px;
  font-weight: 760;
}

.more-title-block h1 {
  margin: 0;
  color: var(--system-text);
  font-size: 24px;
  line-height: 1.05;
  font-weight: 820;
}

.more-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  gap: 14px;
}

.more-panel,
.more-app-library-card {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
  backdrop-filter: blur(var(--system-blur-md)) saturate(1.12);
  -webkit-backdrop-filter: blur(var(--system-blur-md)) saturate(1.12);
}

.more-app-library-card {
  padding: 15px;
}

.more-app-library-head,
.more-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.more-app-library-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
}

.more-store-icon {
  width: 42px;
  height: 42px;
  border: 1px solid var(--system-border-light);
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--system-on-accent);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--system-accent) 78%, transparent), var(--system-accent-strong)),
    var(--system-accent);
  box-shadow: var(--system-shadow-control);
}

.more-app-library-title p,
.more-section-head p {
  margin: 0;
  color: var(--system-text);
  font-size: 15px;
  line-height: 1.2;
  font-weight: 820;
}

.more-app-library-title strong {
  display: block;
  margin-top: 2px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.2;
  font-weight: 720;
}

.more-section-head span {
  color: var(--system-text-soft);
  font-size: 11px;
  font-weight: 740;
  text-align: right;
}

.more-app-library-head button {
  min-height: 36px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font-size: 12px;
  font-weight: 780;
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.more-library-summary {
  margin-top: 13px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.more-library-summary span {
  min-width: 0;
  border: 1px solid var(--system-subtle-border);
  border-radius: 16px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 5px;
  padding: 9px 8px;
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
  font-size: 11px;
  font-weight: 760;
}

.more-library-summary strong {
  color: var(--system-text);
  font-size: 18px;
  line-height: 1;
  font-weight: 840;
}

.more-app-library-grid {
  margin-top: 13px;
  display: grid;
  gap: 9px;
}

.more-app-library-item {
  min-width: 0;
  min-height: 66px;
  border: 1px solid var(--system-subtle-border);
  border-radius: 20px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px;
  color: var(--system-text);
  background: var(--system-control-bg);
  text-align: left;
  transition:
    transform var(--system-motion-fast),
    background var(--system-motion-fast),
    border-color var(--system-motion-fast);
}

.more-app-library-item:active,
.more-shortcut-card:active,
.more-back-button:active,
.more-app-library-head button:active {
  transform: scale(0.985);
}

.more-app-library-item.is-visible {
  border-color: color-mix(in srgb, var(--system-accent) 28%, var(--system-subtle-border));
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--system-accent-soft) 62%, transparent), transparent),
    var(--system-control-bg-strong);
}

.more-app-icon,
.more-shortcut-icon,
.more-scene-row > span {
  width: 42px;
  height: 42px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-shadow: var(--system-shadow-control);
}

.more-app-icon.accent-default,
.more-shortcut-icon.is-default {
  color: var(--home-icon-default-fg);
  background: var(--home-icon-default-bg);
}

.more-app-icon.accent-warm,
.more-shortcut-icon.is-warm {
  color: var(--home-icon-warm-fg);
  background: var(--home-icon-warm-bg);
}

.more-app-icon.accent-cool,
.more-shortcut-icon.is-cool {
  color: var(--home-icon-cool-fg);
  background: var(--home-icon-cool-bg);
}

.more-app-icon.accent-light,
.more-shortcut-icon.is-light {
  color: var(--home-icon-light-fg);
  background: var(--home-icon-light-bg);
}

.more-app-icon.accent-dark,
.more-shortcut-icon.is-dark {
  color: var(--home-icon-dark-fg);
  background: var(--home-icon-dark-bg);
}

.more-app-copy,
.more-shortcut-card span:last-child,
.more-toggle-copy,
.more-scene-row div {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.more-app-copy strong,
.more-shortcut-card strong,
.more-toggle-copy strong,
.more-scene-row strong {
  min-width: 0;
  color: var(--system-text);
  font-size: 13px;
  line-height: 1.15;
  font-weight: 790;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-app-copy small,
.more-shortcut-card small,
.more-toggle-copy small,
.more-scene-row small {
  min-width: 0;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-app-state {
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 4px 7px;
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
  font-size: 10px;
  font-weight: 820;
  white-space: nowrap;
}

.more-app-library-item.is-visible .more-app-state {
  border-color: color-mix(in srgb, var(--system-accent) 20%, transparent);
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.more-panel {
  padding: 14px;
}

.more-shortcut-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.more-shortcut-card {
  min-width: 0;
  border: 1px solid var(--system-subtle-border);
  border-radius: 20px;
  display: grid;
  justify-items: start;
  gap: 9px;
  padding: 10px;
  color: var(--system-text);
  background: var(--system-control-bg);
  text-align: left;
  transition:
    transform var(--system-motion-fast),
    background var(--system-motion-fast);
}

.more-shortcut-card:active,
.more-app-library-item:active {
  background: var(--system-pressed-bg);
}

.more-toggle-list,
.more-scene-list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.more-toggle-row,
.more-scene-row {
  min-width: 0;
  border: 1px solid var(--system-subtle-border);
  border-radius: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--system-control-bg);
}

.more-toggle-copy {
  flex: 1 1 auto;
}

.more-toggle-control {
  flex: 0 0 auto;
  width: 66px;
  height: 34px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 3px 7px 3px 4px;
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
  font-size: 10px;
  font-weight: 840;
  transition:
    background var(--system-motion-fast),
    color var(--system-motion-fast),
    border-color var(--system-motion-fast);
}

.more-toggle-control span {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--system-elevated-bg);
  box-shadow: var(--system-shadow-control);
  transition: transform var(--system-motion-fast);
}

.more-toggle-control em {
  font-style: normal;
}

.more-toggle-control.is-on {
  border-color: var(--system-accent);
  color: var(--system-on-accent);
  background: var(--system-accent);
  padding: 3px 4px 3px 7px;
}

.more-toggle-control.is-on span {
  order: 2;
}

.more-scene-row > span {
  color: var(--system-accent);
  background: var(--system-accent-soft);
  box-shadow: none;
}

@media (max-width: 390px) {
  .more-scroll {
    padding-inline: 12px;
  }

  .more-shortcut-grid {
    grid-template-columns: 1fr;
  }

  .more-app-library-item {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .more-app-state {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
