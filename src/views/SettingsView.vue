<script setup>
import { ref } from 'vue'
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

const activeMenu = ref(null)

const goHome = () => {
  router.push('/home')
}

const toggleMenu = (menu) => {
  activeMenu.value = activeMenu.value === menu ? null : menu
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
</script>

<template>
  <div class="w-full h-full bg-gray-100 flex flex-col text-black">
    <div class="pt-12 pb-4 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goHome" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> 主页
      </button>
      <h1 class="text-2xl font-bold flex-1">设置</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
      <button class="w-full bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm text-left" @click="toggleMenu('profile')">
        <div class="w-14 h-14 rounded-full bg-gray-300 overflow-hidden">
          <img
            :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold">{{ user.name || '未命名用户' }}</h2>
          <p class="text-xs text-gray-500">用户设定与全局人设</p>
        </div>
        <i class="fas fa-chevron-right text-gray-300"></i>
      </button>

      <div class="bg-white rounded-xl overflow-hidden shadow-sm">
        <button
          class="w-full p-3 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="toggleMenu('profile')"
        >
          <div class="w-7 h-7 rounded bg-sky-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-user"></i>
          </div>
          <span class="flex-1 text-sm">用户设定</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="toggleMenu('world')"
        >
          <div class="w-7 h-7 rounded bg-purple-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-globe"></i>
          </div>
          <span class="flex-1 text-sm">世界书设定</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3 flex items-center gap-3 active:bg-gray-50 transition text-left"
          @click="toggleMenu('system')"
        >
          <div class="w-7 h-7 rounded bg-gray-700 flex items-center justify-center text-white text-xs">
            <i class="fas fa-sliders"></i>
          </div>
          <span class="flex-1 text-sm">系统设置</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>
      </div>

      <div class="bg-white rounded-xl overflow-hidden shadow-sm">
        <button class="w-full p-3 flex items-center gap-3 active:bg-gray-50 transition text-left" @click="exportData">
          <div class="w-7 h-7 rounded bg-yellow-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-file-export"></i>
          </div>
          <span class="flex-1 text-sm">备份与导出 (JSON)</span>
        </button>
      </div>

      <div v-if="activeMenu === 'profile'" class="fixed inset-0 bg-gray-100 z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="activeMenu = null" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> 设置
          </button>
          <span class="font-bold mx-auto pr-8">用户设定</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto">
          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">头像 URL</label>
            <input
              v-model="user.avatar"
              type="text"
              class="w-full border-b border-gray-200 py-1 outline-none text-sm"
              placeholder="https://..."
            />
          </div>

          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">姓名</label>
            <input v-model="user.name" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
          </div>

          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">性别</label>
            <select v-model="user.gender" class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white">
              <option value="">未设置</option>
              <option value="female">女</option>
              <option value="male">男</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">出生日期</label>
            <input v-model="user.birthday" type="date" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
          </div>

          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">职业</label>
            <input v-model="user.occupation" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
          </div>

          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">关系设定</label>
            <input
              v-model="user.relationship"
              class="w-full border-b border-gray-200 py-1 outline-none text-sm"
              placeholder="例如：朋友 / 队友 / 恋人"
            />
          </div>

          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">详细人设 (User Bio)</label>
            <textarea
              v-model="user.bio"
              class="w-full h-24 border-b border-gray-200 py-1 outline-none text-sm resize-none"
              placeholder="描述你的性格、偏好与背景..."
            ></textarea>
          </div>
        </div>
      </div>

      <div v-if="activeMenu === 'world'" class="fixed inset-0 bg-gray-100 z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="activeMenu = null" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> 设置
          </button>
          <span class="font-bold mx-auto pr-8">世界书</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto">
          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">全局世界观 (World Book)</label>
            <textarea
              v-model="user.worldBook"
              class="w-full h-40 border-b border-gray-200 py-1 outline-none text-sm resize-none"
              placeholder="描述世界规则，所有 AI 将默认读取..."
            ></textarea>
          </div>
        </div>
      </div>

      <div v-if="activeMenu === 'system'" class="fixed inset-0 bg-gray-100 z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="activeMenu = null" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> 设置
          </button>
          <span class="font-bold mx-auto pr-8">系统设置</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto">
          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-2">语言</label>
            <select v-model="settings.system.language" class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
              <option value="ko-KR">한국어</option>
            </select>
          </div>

          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">时区</label>
            <input
              v-model="settings.system.timezone"
              type="text"
              class="w-full border-b border-gray-200 py-1 outline-none text-sm"
              placeholder="Asia/Shanghai"
            />
          </div>

          <div class="bg-white rounded-xl p-4 flex items-center justify-between">
            <div>
              <p class="text-sm">消息通知</p>
              <p class="text-[10px] text-gray-400">后续用于移动端推送开关</p>
            </div>
            <input v-model="settings.system.notifications" type="checkbox" class="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
