<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const featureToggles = ref([
  { id: 'smart_panel', label: '智能面板', desc: '聚合推荐与快捷动作', enabled: true },
  { id: 'focus_mode', label: '专注模式', desc: '减少提醒干扰，仅保留关键通知', enabled: false },
  { id: 'scene_switch', label: '场景切换', desc: '一键切换工作/生活布局预设', enabled: false },
])

const quickEntries = [
  { id: 'network', title: 'Network', desc: 'API 与模型配置', route: '/network', icon: 'fas fa-network-wired', accent: 'bg-cyan-500' },
  { id: 'appearance', title: 'Appearance', desc: '主题、字体、Widget', route: '/appearance', icon: 'fas fa-palette', accent: 'bg-violet-500' },
  { id: 'files', title: 'Files', desc: '文档与草稿管理', route: '/files', icon: 'fas fa-folder', accent: 'bg-amber-500' },
  { id: 'settings', title: 'Settings', desc: '系统与账号设置', route: '/settings', icon: 'fas fa-cog', accent: 'bg-slate-600' },
]

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
      <h1 class="font-bold">More</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-gray-50 p-4 space-y-4">
      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold mb-3">快捷入口</p>
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
        <p class="text-sm font-semibold mb-3">实验功能开关</p>
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
              {{ item.enabled ? '已开启' : '未开启' }}
            </button>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold mb-2">后续扩展建议</p>
        <ul class="text-xs text-gray-600 space-y-1 list-disc pl-4">
          <li>把常用入口做成可编辑快捷区（可从 Home 拖入）</li>
          <li>支持按场景显示不同模块组合</li>
          <li>增加“模块商店”用于引入第三方扩展</li>
        </ul>
      </section>
    </div>
  </div>
</template>
