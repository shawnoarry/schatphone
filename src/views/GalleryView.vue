<script setup>
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const { t } = useI18n()

const goHome = () => {
  router.push('/home')
}
</script>

<template>
  <div class="w-full h-full bg-black text-white flex flex-col">
    <div class="pt-12 px-4 pb-2 flex justify-between items-center">
      <button @click="goHome" class="text-blue-500 text-lg"><i class="fas fa-chevron-left"></i></button>
      <span class="font-bold">{{ t('AI 绘画生成', 'AI Image Generation') }}</span>
      <span class="text-blue-500 text-sm">{{ t('保存', 'Save') }}</span>
    </div>
    <div class="grid grid-cols-3 gap-1 px-1">
      <div v-for="n in 9" :key="n" class="aspect-square bg-gray-800 rounded relative overflow-hidden">
        <img :src="`https://picsum.photos/200/200?random=${n}`" class="w-full h-full object-cover opacity-60" />
      </div>
    </div>
    <div class="p-4 space-y-4 mt-4">
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="font-bold mb-2">Pollinations.ai</h3>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-400">{{ t('启用服务', 'Enable service') }}</span>
          <div class="w-10 h-6 bg-green-500 rounded-full relative cursor-pointer">
            <div class="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow"></div>
          </div>
        </div>
      </div>
      <div class="bg-gray-900 rounded-xl p-4">
        <h3 class="font-bold mb-2">NovelAI</h3>
        <input type="password" :placeholder="t('输入 API Key', 'Enter API Key')" class="w-full bg-gray-800 p-2 rounded text-sm outline-none mb-2" />
      </div>
    </div>
  </div>
</template>
