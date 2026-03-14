<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const { t } = useI18n()

const featureToggles = ref([
  { id: 'smart_panel', label: '智能面板', desc: '聚合推荐与快捷动作', enabled: true },
  { id: 'focus_mode', label: '专注模式', desc: '减少提醒干扰，仅保留关键通知', enabled: false },
  { id: 'scene_switch', label: '场景切换', desc: '一键切换工作/生活布局预设', enabled: false },
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
    id: 'files',
    title: t('文件', 'Files'),
    desc: t('文档与草稿管理', 'Document and draft management'),
    route: '/files',
    icon: 'fas fa-folder',
    accent: 'bg-amber-500',
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
  router.push('/home')
}

const openEntry = (route) => {
  router.push(route)
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
        <p class="text-sm font-semibold mb-3">{{ t('实验功能开关', 'Experimental Toggles') }}</p>
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
              @click="item.enabled = !item.enabled"
              class="px-3 py-1.5 text-xs rounded-full border transition"
              :class="item.enabled ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'"
            >
              {{ item.enabled ? t('已开启', 'On') : t('未开启', 'Off') }}
            </button>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold mb-2">{{ t('后续扩展建议', 'Future Expansion Ideas') }}</p>
        <ul class="text-xs text-gray-600 space-y-1 list-disc pl-4">
          <li>{{ t('把常用入口做成可编辑快捷区（可从 Home 拖入）', 'Build an editable quick area for frequent entries (drag from Home).') }}</li>
          <li>{{ t('支持按场景显示不同模块组合', 'Support scene-based module combinations.') }}</li>
          <li>{{ t('增加“模块商店”用于引入第三方扩展', 'Add a module store for third-party extensions.') }}</li>
        </ul>
      </section>
    </div>
  </div>
</template>
