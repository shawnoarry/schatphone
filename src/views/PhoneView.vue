<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/home')
}
</script>

<template>
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> 首页
      </button>
      <h1 class="font-bold">Phone</h1>
    </div>

    <div class="flex-1 px-5 py-6">
      <div class="rounded-2xl bg-gray-50 border border-gray-200 p-4">
        <p class="font-semibold mb-2">电话模块占位页</p>
        <p class="text-sm text-gray-600">下一步可接入联系人拨号、通话记录、AI 通话脚本生成。</p>
      </div>
    </div>
  </div>
</template>
