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
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> 首页
      </button>
      <h1 class="font-bold">{{ t('日历', 'Calendar') }}</h1>
    </div>

    <div class="flex-1 px-5 py-6">
      <div class="rounded-2xl bg-gray-50 border border-gray-200 p-4">
        <p class="font-semibold mb-2">{{ t('日程模块占位页', 'Schedule module placeholder') }}</p>
        <p class="text-sm text-gray-600">{{ t('下一步可接入日程管理、提醒文案、与钱包/股票联动。', 'Next, we can add schedule management, reminder copywriting, and linkage with wallet/stock.') }}</p>
      </div>
    </div>
  </div>
</template>
