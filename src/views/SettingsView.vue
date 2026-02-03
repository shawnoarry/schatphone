<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'

const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()

const { settings, user } = storeToRefs(systemStore)
const { contacts, chatHistory } = storeToRefs(chatStore)

const activeMenu = ref(null)

const themes = [
  { id: 'day', name: '日间', preview: '#fff', darkText: true },
  { id: 'night', name: '夜间', preview: '#333', darkText: false },
  { id: 'clear', name: '清透', preview: 'linear-gradient(45deg, #a8c0ff, #3f2b96)', darkText: false },
  {
    id: 'psych',
    name: '迷幻',
    preview: 'linear-gradient(45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
    darkText: false,
  },
]

const goHome = () => {
  router.push('/home')
}

const toggleMenu = (menu) => {
  activeMenu.value = activeMenu.value === menu ? null : menu
}

const setTheme = (themeId) => {
  settings.value.appearance.currentTheme = themeId
  if (themeId === 'night') {
    settings.value.appearance.wallpaper =
      'https://images.unsplash.com/photo-1472552944129-b035e9ea43cc?auto=format&fit=crop&w=1000&q=80'
  }
  if (themeId === 'day') {
    settings.value.appearance.wallpaper =
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1000&q=80'
  }
  if (themeId === 'clear') {
    settings.value.appearance.wallpaper =
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80'
  }
  if (themeId === 'psych') {
    settings.value.appearance.wallpaper =
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1000&q=80'
  }
}

const exportData = () => {
  const data = JSON.stringify({
    settings: settings.value,
    user: user.value,
    contacts: contacts.value,
    chatHistory: chatHistory.value,
  })
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'schatphone_backup.json'
  anchor.click()
}
</script>

<template>
  <div class="w-full h-full bg-gray-100 flex flex-col text-black">
    <div
      class="pt-12 pb-4 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center"
    >
      <button @click="goHome" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> 主屏幕
      </button>
      <h1 class="text-2xl font-bold flex-1">设置</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
      <div class="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm">
        <div class="w-14 h-14 rounded-full bg-gray-300 overflow-hidden">
          <img
            :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold">{{ user.name }}</h2>
          <p class="text-xs text-gray-500">Apple ID, iCloud, 媒体与购买项目</p>
        </div>
        <i class="fas fa-chevron-right text-gray-300"></i>
      </div>

      <div class="bg-white rounded-xl overflow-hidden shadow-sm">
        <div
          class="p-3 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition"
          @click="toggleMenu('network')"
        >
          <div class="w-7 h-7 rounded bg-blue-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-wifi"></i>
          </div>
          <span class="flex-1 text-sm">网络与 API 接口</span>
          <span class="text-xs text-gray-400 mr-2">{{ settings.api.provider }}</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </div>
        <div
          class="p-3 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition"
          @click="toggleMenu('world')"
        >
          <div class="w-7 h-7 rounded bg-purple-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-globe"></i>
          </div>
          <span class="flex-1 text-sm">世界书设定</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </div>
        <div class="p-3 flex items-center gap-3 active:bg-gray-50 transition" @click="toggleMenu('appearance')">
          <div class="w-7 h-7 rounded bg-pink-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-paint-brush"></i>
          </div>
          <span class="flex-1 text-sm">外观与壁纸</span>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </div>
      </div>

      <div class="bg-white rounded-xl overflow-hidden shadow-sm">
        <div class="p-3 flex items-center gap-3 active:bg-gray-50 transition" @click="exportData">
          <div class="w-7 h-7 rounded bg-yellow-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-file-export"></i>
          </div>
          <span class="flex-1 text-sm">备份与导出 (JSON)</span>
        </div>
      </div>

      <div v-if="activeMenu === 'network'" class="fixed inset-0 bg-gray-100 z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="activeMenu = null" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> 设置
          </button>
          <span class="font-bold mx-auto pr-8">API 接口</span>
        </div>
        <div class="p-4 space-y-4">
          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-2">API 服务商</label>
            <div class="flex bg-gray-100 rounded-lg p-1">
              <button
                @click="settings.api.provider = 'openai'"
                :class="settings.api.provider === 'openai' ? 'bg-white shadow' : 'text-gray-500'"
                class="flex-1 text-xs py-1.5 rounded transition"
              >
                OpenAI / Custom
              </button>
              <button
                @click="settings.api.provider = 'gemini'"
                :class="settings.api.provider === 'gemini' ? 'bg-white shadow' : 'text-gray-500'"
                class="flex-1 text-xs py-1.5 rounded transition"
              >
                Gemini
              </button>
            </div>
          </div>

          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">API Endpoint URL</label>
            <input
              v-model="settings.api.url"
              type="text"
              class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono text-gray-600"
              placeholder="https://api.openai.com/v1/chat/completions"
            />
            <p class="text-[10px] text-gray-400 mt-1" v-if="settings.api.provider === 'openai'">
              支持 OneAPI, New API, OpenAI 官方地址。
            </p>
          </div>
          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">API Key</label>
            <input
              v-model="settings.api.key"
              type="password"
              class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono"
              placeholder="sk-..."
            />
          </div>
          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">模型名称 (Model Name)</label>
            <input
              v-model="settings.api.model"
              type="text"
              class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono"
              placeholder="gpt-3.5-turbo"
            />
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
        <div class="p-4 space-y-4">
          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">全局世界观 (World Book)</label>
            <textarea
              v-model="user.worldBook"
              class="w-full h-32 border-b border-gray-200 py-1 outline-none text-sm resize-none"
              placeholder="描述这个世界的基本规则，所有 AI 都会遵循..."
            ></textarea>
          </div>
          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">你的名字 (User Name)</label>
            <input v-model="user.name" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
          </div>
          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">你的身份设定 (User Bio)</label>
            <textarea v-model="user.bio" class="w-full h-20 border-b border-gray-200 py-1 outline-none text-sm resize-none">
            </textarea>
          </div>
        </div>
      </div>

      <div v-if="activeMenu === 'appearance'" class="fixed inset-0 bg-gray-100 z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="activeMenu = null" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> 设置
          </button>
          <span class="font-bold mx-auto pr-8">外观</span>
        </div>
        <div class="p-4 space-y-4">
          <div class="bg-white rounded-xl p-4">
            <div class="text-sm font-bold mb-3">UI 主题色</div>
            <div class="grid grid-cols-4 gap-2">
              <div
                v-for="theme in themes"
                :key="theme.id"
                @click="setTheme(theme.id)"
                class="h-16 rounded-lg border-2 flex items-center justify-center cursor-pointer"
                :class="settings.appearance.currentTheme === theme.id ? 'border-blue-500' : 'border-transparent'"
                :style="{ background: theme.preview }"
              >
                <span class="text-xs font-bold" :class="theme.darkText ? 'text-black' : 'text-white'">
                  {{ theme.name }}
                </span>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl p-4">
            <label class="text-xs text-gray-500 block mb-1">壁纸 URL</label>
            <input
              v-model="settings.appearance.wallpaper"
              type="text"
              class="w-full border-b border-gray-200 py-1 outline-none text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
