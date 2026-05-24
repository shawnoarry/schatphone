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

const APP_LIBRARY_IDS = [
  'app_network',
  'app_chat',
  'app_contacts',
  'app_gallery',
  'app_map',
  'app_calendar',
  'app_wallet',
  'app_shopping',
  'app_food_delivery',
  'app_assets',
  'app_themes',
  'app_widgets',
  'app_more',
]

const featureToggleMeta = computed(() => [
  {
    id: 'smart_panel',
    label: t('智能面板', 'Smart Panel'),
    desc: t('聚合推荐与快捷动作', 'Aggregated suggestions and quick actions'),
  },
  {
    id: 'focus_mode',
    label: t('专注模式', 'Focus Mode'),
    desc: t('减少提醒干扰，仅保留关键通知', 'Reduce distractions and keep only key alerts'),
  },
  {
    id: 'scene_switch',
    label: t('场景切换', 'Scene Switch'),
    desc: t('一键切换工作/生活布局预设', 'Switch work/life layout presets with one tap'),
  },
  {
    id: 'control_center',
    label: t('世界中枢', 'World Hub'),
    desc: t(
      '开启后主屏显示世界中枢入口；关闭时隐藏入口，聊天、地图等常规功能照常使用。',
      'Show the World Hub entry on Home when enabled; when off, regular Chat, Map, and other flows stay unchanged.',
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
    desc: t('Network、Calendar、Settings 优先', 'Network, Calendar, and Settings first'),
    icon: 'fas fa-briefcase',
  },
  {
    id: 'life',
    title: t('生活', 'Life'),
    desc: t('Chat、Gallery、Wallet 更靠前', 'Chat, Gallery, and Wallet move forward'),
    icon: 'fas fa-mug-hot',
  },
  {
    id: 'story',
    title: t('沉浸', 'Immersive'),
    desc: t('Map、WorldBook 与角色线索组合', 'Map, WorldBook, and role cues together'),
    icon: 'fas fa-compass',
  },
])

const quickEntries = computed(() => [
  {
    id: 'network',
    title: t('网络', 'Network'),
    desc: t('API 与模型配置', 'API and model settings'),
    route: '/network',
    icon: 'fas fa-network-wired',
    accent: 'bg-cyan-500',
  },
  {
    id: 'appearance',
    title: t('外观', 'Appearance'),
    desc: t('主题、字体、组件', 'Themes, fonts, widgets'),
    route: '/appearance',
    icon: 'fas fa-palette',
    accent: 'bg-violet-500',
  },
  {
    id: 'settings',
    title: t('设置', 'Settings'),
    desc: t('系统与账号设置', 'System and account settings'),
    route: '/settings',
    icon: 'fas fa-cog',
    accent: 'bg-slate-600',
  },
])
const visibleHomeAppIds = computed(
  () => new Set((settings.value.appearance?.homeWidgetPages || []).flat()),
)
const appLibraryItems = computed(() =>
  APP_LIBRARY_IDS.map((appId) => ({
    id: appId,
    ...resolveAppIconMeta(appId, settings.value.appearance?.appIconOverrides || {}, 'zh-CN'),
    visible: visibleHomeAppIds.value.has(appId),
  })),
)
const appLibraryPreviewItems = computed(() => appLibraryItems.value.slice(0, 8))
const visibleAppCount = computed(
  () => appLibraryItems.value.filter((item) => item.visible).length,
)
const hiddenAppCount = computed(() => Math.max(0, appLibraryItems.value.length - visibleAppCount.value))

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
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> 首页
      </button>
      <h1 class="font-bold">{{ t('更多', 'More') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-gray-50 p-4 space-y-4">
      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold mb-3">{{ t('快捷入口', 'Quick Entries') }}</p>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="entry in quickEntries"
            :key="entry.id"
            @click="openEntry(entry.route)"
            :data-testid="`more-quick-entry-${entry.id}`"
            class="rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 transition"
          >
            <div class="w-8 h-8 rounded-lg text-white flex items-center justify-center text-xs" :class="entry.accent">
              <i :class="entry.icon"></i>
            </div>
            <p class="mt-2 text-sm font-semibold">{{ entry.title }}</p>
            <p class="text-[11px] text-gray-500">{{ entry.desc }}</p>
          </button>
        </div>
      </section>

      <section class="more-app-library-card bg-white rounded-2xl border border-gray-200 p-4">
        <div class="more-app-library-head">
          <div>
            <p class="text-sm font-semibold">{{ t('App 入口', 'App Entries') }}</p>
            <span>
              {{ t(`${visibleAppCount} 个在主屏 · ${hiddenAppCount} 个在库`, `${visibleAppCount} on Home · ${hiddenAppCount} in Library`) }}
            </span>
          </div>
          <button type="button" @click="openHomeAppEntryEditor" data-testid="more-app-library-edit-home">
            <i class="fas fa-table-cells"></i>
            <span>{{ t('整理主屏', 'Edit Home') }}</span>
          </button>
        </div>
        <div class="more-app-library-grid" aria-label="App Library">
          <button
            v-for="app in appLibraryPreviewItems"
            :key="app.id"
            type="button"
            class="more-app-library-icon"
            :class="{ 'is-visible': app.visible }"
            :title="app.label"
          >
            <i :class="app.icon"></i>
            <small>{{ app.label }}</small>
          </button>
        </div>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold mb-1">{{ t('实验功能开关', 'Experimental Toggles') }}</p>
        <p class="text-[11px] text-gray-500 mb-3">
          {{
            t(
              '这些开关现在会随系统设置持久化；后续模块可直接读取同一份状态。',
              'These toggles now persist with system settings; future modules can read the same state.',
            )
          }}
        </p>
        <div class="space-y-2">
          <div
            v-for="item in featureToggles"
            :key="item.id"
            class="border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3"
          >
            <div>
              <p class="text-sm font-medium">{{ item.label }}</p>
              <p class="text-[11px] text-gray-500">{{ item.desc }}</p>
            </div>
            <button
              @click="toggleFeature(item.id)"
              :data-testid="`more-feature-toggle-${item.id}`"
              class="px-3 py-1.5 text-xs rounded-full border transition"
              :class="item.enabled ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'"
            >
              {{ item.enabled ? t('已开启', 'On') : t('未开启', 'Off') }}
            </button>
          </div>
        </div>
      </section>

      <section
        v-if="sceneSwitchEnabled"
        class="bg-white rounded-2xl border border-gray-200 p-4"
        data-testid="more-scene-switch-preview"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('场景切换预览', 'Scene Switch Preview') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ t('当前是只读预览，用于验证实验开关已能驱动模块 UI。', 'Read-only preview proving this Labs toggle can drive module UI.') }}
            </p>
          </div>
          <span class="rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-600">
            Labs
          </span>
        </div>
        <div class="mt-3 grid gap-2">
          <article
            v-for="scene in scenePresets"
            :key="scene.id"
            class="rounded-xl border border-gray-100 bg-gray-50 p-3 flex items-center gap-3"
          >
            <span class="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center text-xs">
              <i :class="scene.icon"></i>
            </span>
            <div>
              <p class="text-sm font-medium">{{ scene.title }}</p>
              <p class="text-[11px] text-gray-500">{{ scene.desc }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold mb-2">{{ t('后续扩展建议', 'Future Expansion Ideas') }}</p>
        <ul class="text-xs text-gray-600 space-y-1 list-disc pl-4">
          <li>{{ t('把常用入口做成可编辑快捷区（可从 Home 拖入）。', 'Build an editable quick area for frequent entries (drag from Home).') }}</li>
          <li>{{ t('支持按场景显示不同模块组合。', 'Support scene-based module combinations.') }}</li>
          <li>{{ t('增加“模块商店”用于引入第三方扩展。', 'Add a module store for third-party extensions.') }}</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.more-app-library-card {
  box-shadow: var(--system-shadow-card, 0 12px 28px rgba(15, 23, 42, 0.08));
}

.more-app-library-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.more-app-library-head p {
  margin: 0;
}

.more-app-library-head span {
  display: block;
  margin-top: 3px;
  color: var(--system-text-muted, #667085);
  font-size: 11px;
  font-weight: 700;
}

.more-app-library-head button {
  min-height: 34px;
  border: 1px solid var(--system-control-border, #d0d5dd);
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  color: var(--system-text, #182230);
  background: var(--system-control-bg, #f8fafc);
  font-size: 12px;
  font-weight: 750;
}

.more-app-library-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
}

.more-app-library-icon {
  min-width: 0;
  min-height: 64px;
  border: 1px solid var(--system-subtle-border, #eaecf0);
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--system-text-muted, #667085);
  background: var(--system-surface-muted, #f2f4f7);
  font-size: 14px;
  opacity: 0.62;
}

.more-app-library-icon small {
  max-width: 100%;
  color: inherit;
  font-size: 9px;
  font-weight: 750;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-app-library-icon.is-visible {
  color: var(--system-text-inverse, #f8fafc);
  background: var(--system-accent, #446f87);
  border-color: var(--system-accent, #446f87);
  opacity: 1;
}
</style>
