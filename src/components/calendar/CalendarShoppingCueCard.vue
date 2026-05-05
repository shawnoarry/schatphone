<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  cue: {
    type: Object,
    required: true,
  },
  formattedSuggestedAt: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['confirm', 'dismiss'])

const { t } = useI18n()

const formatAmount = (cue) =>
  `${(Number(cue.totalCents || 0) / 100).toFixed(2)} ${cue.currency || 'CNY'}`
</script>

<template>
  <article
    :data-testid="`calendar-shopping-cue-card-${cue.id}`"
    class="rounded-lg bg-white border border-orange-100 p-4 shadow-sm"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold">
          <i :class="[cue.icon, 'mr-1 text-orange-500']"></i>
          {{ t(`购物跟进：${cue.title}`, `Shopping follow-up: ${cue.title}`) }}
        </p>
        <p class="mt-1 text-xs text-gray-500">{{ formattedSuggestedAt }}</p>
      </div>
      <span
        class="shrink-0 rounded-full px-2 py-1 text-[11px]"
        :class="cue.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'"
      >
        {{ cue.status === 'confirmed' ? t('已确认', 'Confirmed') : t('配送线索', 'Delivery cue') }}
      </span>
    </div>
    <p class="mt-2 text-sm text-gray-700">
      {{ cue.summary || t(`跟进 ${cue.itemCount || 1} 件购物订单。`, `Follow up ${cue.itemCount || 1} Shopping item(s).`) }}
    </p>
    <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
      <span>{{ t('来源：Shopping 订单', 'Source: Shopping order') }}</span>
      <span>{{ cue.itemCount || 1 }} {{ t('件商品', 'items') }}</span>
      <span>{{ formatAmount(cue) }}</span>
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        v-if="cue.status !== 'confirmed'"
        class="rounded-full bg-emerald-500 px-3 py-2 text-xs text-white"
        :title="t('确认购物跟进提醒', 'Confirm Shopping follow-up reminder')"
        @click="emit('confirm', cue)"
      >
        <i class="fas fa-check mr-1"></i>{{ t('确认', 'Confirm') }}
      </button>
      <button
        class="rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-600"
        :title="t('忽略购物线索', 'Dismiss Shopping cue')"
        @click="emit('dismiss', cue)"
      >
        <i class="fas fa-xmark mr-1"></i>{{ t('忽略', 'Dismiss') }}
      </button>
    </div>
  </article>
</template>
