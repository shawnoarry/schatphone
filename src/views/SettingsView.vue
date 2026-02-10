<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useMapStore } from '../stores/map'

const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const mapStore = useMapStore()

const { settings, user } = storeToRefs(systemStore)
const { contacts, chatHistory } = storeToRefs(chatStore)
const { addresses, currentLocation } = storeToRefs(mapStore)

const activeMenu = ref('')
const generalSaved = ref(false)
const notificationSaved = ref(false)
let generalSavedTimerId = null
let notificationSavedTimerId = null

const goHome = () => {
  router.push('/home')
}

const openSubPage = (menu) => {
  activeMenu.value = menu
}

const closeSubPage = () => {
  activeMenu.value = ''
}

const openProfile = () => {
  router.push('/profile')
}

const openWorldBook = () => {
  router.push('/worldbook')
}

const saveGeneralSettings = () => {
  systemStore.saveNow()
  generalSaved.value = true
  if (generalSavedTimerId) clearTimeout(generalSavedTimerId)
  generalSavedTimerId = setTimeout(() => {
    generalSaved.value = false
  }, 1200)
}

const saveNotificationSettings = () => {
  systemStore.saveNow()
  notificationSaved.value = true
  if (notificationSavedTimerId) clearTimeout(notificationSavedTimerId)
  notificationSavedTimerId = setTimeout(() => {
    notificationSaved.value = false
  }, 1200)
}

const exportData = () => {
  const data = JSON.stringify({
    settings: settings.value,
    user: user.value,
    contacts: contacts.value,
    chatHistory: chatHistory.value,
    map: {
      addresses: addresses.value,
      currentLocation: currentLocation.value,
    },
  })

  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'schatphone_backup.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

onBeforeUnmount(() => {
  if (generalSavedTimerId) clearTimeout(generalSavedTimerId)
  if (notificationSavedTimerId) clearTimeout(notificationSavedTimerId)
})
</script>

<template>
  <div class="w-full h-full bg-[#f2f2f7] flex flex-col text-black">
    <div class="pt-12 pb-4 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goHome" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> 主页
      </button>
      <h1 class="text-2xl font-bold flex-1">设置</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
      <button class="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm text-left" @click="openProfile">
        <div class="w-14 h-14 rounded-full bg-gray-300 overflow-hidden">
          <img
            :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold">{{ user.name || '未命名用户' }}</h2>
          <p class="text-xs text-gray-500">Apple ID、头像与基础人设</p>
        </div>
        <i class="fas fa-chevron-right text-gray-300"></i>
      </button>

      <div class="px-1 text-[11px] text-gray-500 font-medium">内容设置</div>
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="openWorldBook"
        >
          <div class="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-book-open"></i>
          </div>
          <span class="flex-1 text-sm">世界书</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="openSubPage('general')"
        >
          <div class="w-7 h-7 rounded-lg bg-gray-600 flex items-center justify-center text-white text-xs">
            <i class="fas fa-sliders"></i>
          </div>
          <span class="flex-1 text-sm">通用</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 active:bg-gray-50 transition text-left"
          @click="openSubPage('notification')"
        >
          <div class="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-bell"></i>
          </div>
          <span class="flex-1 text-sm">通知</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>
      </div>

      <div class="px-1 text-[11px] text-gray-500 font-medium">数据与安全</div>
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="exportData"
        >
          <div class="w-7 h-7 rounded bg-yellow-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-file-export"></i>
          </div>
          <span class="flex-1 text-sm">备份与导出（JSON）</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 active:bg-gray-50 transition text-left"
          @click="openSubPage('about')"
        >
          <div class="w-7 h-7 rounded bg-blue-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-circle-info"></i>
          </div>
          <span class="flex-1 text-sm">关于 SchatPhone</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>
      </div>

      <div v-if="activeMenu === 'general'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> 设置
          </button>
          <span class="font-bold mx-auto pr-8">通用</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div class="bg-white rounded-2xl p-4">
            <label class="text-xs text-gray-500 block mb-2">语言</label>
            <select v-model="settings.system.language" class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
              <option value="ko-KR">한국어</option>
            </select>
          </div>

          <div class="bg-white rounded-2xl p-4">
            <label class="text-xs text-gray-500 block mb-1">时区</label>
            <input
              v-model="settings.system.timezone"
              type="text"
              class="w-full border-b border-gray-200 py-1 outline-none text-sm"
              placeholder="Asia/Shanghai"
            />
          </div>

          <button
            @click="saveGeneralSettings"
            class="w-full py-3 rounded-xl text-sm font-semibold transition"
            :class="generalSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            {{ generalSaved ? '已保存' : '保存通用设置' }}
          </button>
        </div>
      </div>

      <div v-if="activeMenu === 'notification'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> 设置
          </button>
          <span class="font-bold mx-auto pr-8">通知</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div class="bg-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p class="text-sm">消息通知</p>
              <p class="text-[10px] text-gray-400">用于聊天消息与系统提醒</p>
            </div>
            <input v-model="settings.system.notifications" type="checkbox" class="w-5 h-5" />
          </div>

          <button
            @click="saveNotificationSettings"
            class="w-full py-3 rounded-xl text-sm font-semibold transition"
            :class="notificationSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            {{ notificationSaved ? '已保存' : '保存通知设置' }}
          </button>
        </div>
      </div>

      <div v-if="activeMenu === 'about'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> 设置
          </button>
          <span class="font-bold mx-auto pr-8">关于</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div class="bg-white rounded-2xl p-4">
            <p class="text-sm font-semibold">SchatPhone</p>
            <p class="text-xs text-gray-500 mt-1">当前版本：1.2.0</p>
            <p class="text-xs text-gray-500 mt-1">框架：Vue 3 + Vite + Pinia + Tailwind v4</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
