<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'

const router = useRouter()
const systemStore = useSystemStore()
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
        <i class="fas fa-chevron-left"></i> 设置
      </button>
      <h1 class="text-2xl font-bold flex-1">用户信息</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">头像 URL</label>
        <input
          v-model="user.avatar"
          type="text"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          placeholder="https://..."
        />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">姓名</label>
        <input v-model="user.name" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">性别</label>
        <select v-model="user.gender" class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white">
          <option value="">未设置</option>
          <option value="female">女</option>
          <option value="male">男</option>
          <option value="other">其他</option>
        </select>
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">出生日期</label>
        <input v-model="user.birthday" type="date" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">职业</label>
        <input v-model="user.occupation" class="w-full border-b border-gray-200 py-1 outline-none text-sm" />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">关系设定</label>
        <input
          v-model="user.relationship"
          class="w-full border-b border-gray-200 py-1 outline-none text-sm"
          placeholder="例如：朋友 / 队友 / 恋人"
        />
      </div>

      <div class="bg-white rounded-2xl p-4">
        <label class="text-xs text-gray-500 block mb-1">详细人设（User Bio）</label>
        <textarea
          v-model="user.bio"
          class="w-full h-28 border border-gray-200 rounded-lg p-2 outline-none text-sm resize-none"
          placeholder="描述你的性格、偏好与背景..."
        ></textarea>
      </div>

      <button
        @click="saveProfile"
        class="w-full py-3 rounded-xl text-sm font-semibold transition"
        :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      >
        {{ saved ? '已保存' : '保存用户信息' }}
      </button>
    </div>
  </div>
</template>
