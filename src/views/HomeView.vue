<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const installedApps = ref([
  { id: 'settings', name: '设置', icon: 'fas fa-cog', color: '#8e8e93' },
  {
    id: 'gallery',
    name: '相册',
    icon: 'fas fa-images',
    color: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)',
  },
  { id: 'kakaotalk', name: 'KakaoTalk', icon: 'fas fa-comment', color: '#FEE500' },
  { id: 'contacts', name: '通讯录', icon: 'fas fa-address-book', color: '#a0aec0' },
  { id: 'notes', name: '备忘录', icon: 'fas fa-sticky-note', color: '#F6E05E' },
  { id: 'files', name: '文件', icon: 'fas fa-folder', color: '#4299E1' },
  { id: 'camera', name: '相机', icon: 'fas fa-camera', color: '#718096' },
  { id: 'store', name: 'App Store', icon: 'fab fa-app-store-ios', color: '#3182CE' },
])

const unreadCount = computed(() => 1)

const openApp = (appId) => {
  const routes = {
    settings: '/settings',
    kakaotalk: '/chat',
    contacts: '/contacts',
    gallery: '/gallery',
  }

  if (routes[appId]) {
    router.push(routes[appId])
    return
  }

  alert(`App "${appId}" 正在开发中`)
}
</script>

<template>
  <div class="w-full h-full pt-12 flex flex-col">
    <div class="app-grid">
      <div
        v-for="app in installedApps"
        :key="app.id"
        class="flex flex-col items-center gap-1 cursor-pointer"
        @click="openApp(app.id)"
      >
        <div class="app-icon shadow-lg" :style="{ background: app.color }">
          <i :class="app.icon"></i>
        </div>
        <span class="text-xs text-white font-medium drop-shadow-md">{{ app.name }}</span>
      </div>
    </div>

    <div class="mt-auto mb-6 mx-4 p-4 glass rounded-[30px] flex justify-around items-center">
      <div class="flex flex-col items-center gap-1 cursor-pointer" @click="openApp('phone')">
        <div
          class="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-white text-xl shadow-lg"
        >
          <i class="fas fa-phone"></i>
        </div>
      </div>
      <div class="flex flex-col items-center gap-1 cursor-pointer" @click="openApp('kakaotalk')">
        <div
          class="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center text-brown-800 text-xl shadow-lg relative"
        >
          <i class="fas fa-comment"></i>
          <div
            v-if="unreadCount > 0"
            class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center"
          >
            {{ unreadCount }}
          </div>
        </div>
      </div>
      <div class="flex flex-col items-center gap-1 cursor-pointer" @click="openApp('contacts')">
        <div class="w-12 h-12 rounded-xl bg-gray-400 flex items-center justify-center text-white text-xl shadow-lg">
          <i class="fas fa-address-book"></i>
        </div>
      </div>
      <div class="flex flex-col items-center gap-1 cursor-pointer" @click="openApp('browser')">
        <div class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white text-xl shadow-lg">
          <i class="fas fa-compass"></i>
        </div>
      </div>
    </div>
  </div>
</template>
