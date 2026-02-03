<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from './stores/system'
import { useChatStore } from './stores/chat'

const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()

const { settings } = storeToRefs(systemStore)
const { loadingAI } = storeToRefs(chatStore)

const currentTime = ref('')
const currentDate = ref('')
let timerId = null

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  currentDate.value = now.toLocaleDateString('zh-CN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

onMounted(() => {
  updateTime()
  timerId = setInterval(updateTime, 1000)
})

onBeforeUnmount(() => {
  if (timerId) {
    clearInterval(timerId)
  }
})

const currentWallpaper = computed(() => settings.value.appearance.wallpaper)

const goHome = () => {
  router.push('/home')
}
</script>

<template>
  <div class="fixed top-4 left-4 text-white text-xs opacity-50 hidden md:block z-[9999]">
    <p>SchatPhone Build: 1.2.0 (Open)</p>
    <p>Theme: {{ settings.appearance.currentTheme }}</p>
    <p v-if="loadingAI" class="text-yellow-400 font-bold">
      <i class="fas fa-spinner fa-spin"></i> AI Thinking...
    </p>
  </div>

  <div class="app-shell" :data-theme="settings.appearance.currentTheme">
    <div class="phone-frame">
      <div class="screen" :style="{ backgroundImage: `url(${currentWallpaper})` }">
        <div
          class="absolute top-0 w-full h-8 px-6 flex justify-between items-center text-xs text-white font-medium z-40 select-none"
        >
          <span>{{ currentTime }}</span>
          <div class="flex gap-1.5">
            <i class="fas fa-signal"></i>
            <i class="fas fa-wifi"></i>
            <i class="fas fa-battery-full"></i>
          </div>
        </div>

        <div class="notch"></div>

        <RouterView v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :current-time="currentTime" :current-date="currentDate" />
          </transition>
        </RouterView>

        <div class="home-indicator" @click="goHome"></div>
      </div>
    </div>
  </div>
</template>
