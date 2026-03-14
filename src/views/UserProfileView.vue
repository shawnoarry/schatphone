<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const systemStore = useSystemStore()
const { t } = useI18n()
const { user } = storeToRefs(systemStore)
const saved = ref(false)
let savedTimerId = null

const goSettings = () => {
  router.push('/settings')
}

const saveProfile = () => {
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
  <div class="w-full h-full bg-[#f2f2f7] flex flex-col text-black">
    <div class="pt-12 pb-3 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goSettings" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> {{ t('设置', 'Settings') }}
      </button>
      <h1 class="text-2xl font-bold flex-1">{{ t('用户信息', 'Profile') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('头像 URL', 'Avatar URL') }}</label>
        <input
          v-model="user.avatar"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          placeholder="https://..."
        />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('姓名', 'Name') }}</label>
        <input v-model="user.name" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('性别', 'Gender') }}</label>
        <select v-model="user.gender" class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white">
          <option value="">{{ t('未设置', 'Not set') }}</option>
          <option value="female">{{ t('女', 'Female') }}</option>
          <option value="male">{{ t('男', 'Male') }}</option>
          <option value="other">{{ t('其他', 'Other') }}</option>
        </select>
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('出生日期', 'Birthday') }}</label>
        <input v-model="user.birthday" type="date" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('职业', 'Occupation') }}</label>
        <input v-model="user.occupation" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('关系设定', 'Relationship') }}</label>
        <input
          v-model="user.relationship"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          :placeholder="t('例如：朋友 / 队友 / 恋人', 'Example: friend / teammate / partner')"
        />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">{{ t('详细人设（User Bio）', 'Detailed Profile (User Bio)') }}</label>
        <textarea
          v-model="user.bio"
          class="w-full h-28 border border-gray-200 rounded-lg p-2 outline-none text-sm resize-none"
          :placeholder="t('描述你的性格、偏好与背景...', 'Describe your personality, preferences, and background...')"
        ></textarea>
      </div>

      <button
        @click="saveProfile"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存用户信息', 'Save profile') }}
      </button>
    </div>
  </div>
</template>
