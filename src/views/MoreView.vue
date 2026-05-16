<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { buildRouteWithReturnSource, pushReturnTarget } from '../lib/navigation-return'
import { useSystemStore } from '../stores/system'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const systemStore = useSystemStore()
const { settings } = storeToRefs(systemStore)

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

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const openEntry = (targetRoute) => {
  router.push(buildRouteWithReturnSource(targetRoute, 'home', { homePage: route.query.homePage }))
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
