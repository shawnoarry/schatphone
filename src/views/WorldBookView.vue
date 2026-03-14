<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const systemStore = useSystemStore()
const { t } = useI18n()
const { user } = storeToRefs(systemStore)

const worldBookCount = computed(() => (user.value.worldBook || '').length)
const saved = ref(false)
let savedTimerId = null

const goSettings = () => {
  router.push('/settings')
}

const saveWorldBook = () => {
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
  <div class="w-full h-full bg-[#f2f2f7] text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center gap-3">
      <button @click="goSettings" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('设置', 'Settings') }}
      </button>
      <h1 class="font-bold text-xl">{{ t('世界书', 'World Book') }}</h1>
    </div>

    <div class="flex-1 px-4 py-4 overflow-y-auto no-scrollbar space-y-4">
      <div class="rounded-2xl bg-white border border-gray-200 p-4">
        <p class="text-sm font-semibold">{{ t('全局世界观（World Book）', 'Global World Book') }}</p>
        <p class="text-xs text-gray-500 mt-1">
          {{ t('这里的内容会作为所有聊天的全局背景设定。用户信息已拆分到“设置 > 用户信息”。', 'This content is used as global context for all chats. User profile is now separated in Settings > Profile.') }}
        </p>
        <textarea
          v-model="user.worldBook"
          class="w-full h-56 mt-3 border border-gray-200 rounded-lg p-3 text-sm outline-none resize-none"
          :placeholder="t('例如：世界规则、时代背景、组织结构、角色关系约束...', 'Example: world rules, era background, organization structure, and role relationship constraints...')"
        ></textarea>
        <p class="text-[11px] text-gray-400 mt-2">{{ t('当前字数：', 'Current count: ') }}{{ worldBookCount }}</p>
        <button
          @click="saveWorldBook"
          class="mt-3 w-full py-2.5 rounded-lg text-sm font-semibold transition"
          :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
        >
          {{ saved ? t('已保存', 'Saved') : t('保存世界书', 'Save world book') }}
        </button>
      </div>
    </div>
  </div>
</template>
