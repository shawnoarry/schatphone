<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'

const router = useRouter()
const systemStore = useSystemStore()

const { settings, availableThemes } = storeToRefs(systemStore)
const saved = ref(false)
let savedTimerId = null

const goHome = () => {
  router.push('/home')
}

const goSettings = () => {
  router.push('/settings')
}

const setTheme = (themeId) => {
  systemStore.setTheme(themeId)
}

const clearCustomCss = () => {
  settings.value.appearance.customCss = ''
}

const saveAppearance = () => {
  systemStore.saveNow()
  saved.value = true
  if (savedTimerId) clearTimeout(savedTimerId)
  savedTimerId = setTimeout(() => {
    saved.value = false
  }, 1200)
}

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
})
</script>

<template>
  <div class="w-full h-full bg-gray-100 flex flex-col text-black">
    <div class="pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goSettings" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> 设置
      </button>
      <h1 class="text-2xl font-bold flex-1">外观工坊</h1>
      <button @click="goHome" class="text-blue-500 text-sm">主页</button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="text-sm font-bold mb-3">主题（保留 Y2K / 纯白）</div>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="theme in availableThemes"
            :key="theme.id"
            @click="setTheme(theme.id)"
            class="h-24 rounded-lg border-2 flex items-center justify-center cursor-pointer"
            :class="settings.appearance.currentTheme === theme.id ? 'border-blue-500' : 'border-transparent'"
            :style="{ background: theme.preview }"
          >
            <span class="text-xs font-bold" :class="theme.darkText ? 'text-black' : 'text-white'">
              {{ theme.name }}
            </span>
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <label class="text-xs text-gray-500 block mb-1">壁纸 URL</label>
        <input
          v-model="settings.appearance.wallpaper"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          placeholder="https://..."
        />
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs text-gray-500 block">自定义 CSS（高级）</label>
          <button class="text-[11px] text-blue-500" @click="clearCustomCss">清空</button>
        </div>
        <textarea
          v-model="settings.appearance.customCss"
          class="w-full h-36 border border-gray-200 rounded-md p-2 text-xs font-mono outline-none resize-none"
          placeholder=".app-shell { --home-widget-bg: rgba(255,255,255,0.5); }"
        ></textarea>
        <p class="text-[10px] text-gray-400 mt-2">
          建议优先覆盖 CSS 变量：<code>--home-widget-bg</code>、<code>--home-dock-bg</code>、<code>--home-icon-default-bg</code>
        </p>
      </div>

      <button
        @click="saveAppearance"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? '已保存' : '保存外观设置' }}
      </button>
    </div>
  </div>
</template>
