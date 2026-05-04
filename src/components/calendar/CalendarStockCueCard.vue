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

const formatChange = (value) => {
  const normalized = Number(value) || 0
  return `${normalized > 0 ? '+' : ''}${normalized.toFixed(2)}%`
}
</script>

<template>
  <article
    :data-testid="`calendar-stock-cue-card-${cue.id}`"
    class="rounded-lg bg-white border border-amber-100 p-4 shadow-sm"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold">
          <i :class="[cue.icon, 'mr-1 text-amber-500']"></i>
          {{ t(`复盘 ${cue.symbol}`, `Review ${cue.symbol}`) }}
        </p>
        <p class="mt-1 text-xs text-gray-500">{{ formattedSuggestedAt }}</p>
      </div>
      <span
        class="shrink-0 rounded-full px-2 py-1 text-[11px]"
        :class="cue.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'"
      >
        {{ cue.status === 'confirmed' ? t('已确认', 'Confirmed') : t('行情线索', 'Market cue') }}
      </span>
    </div>
    <p class="mt-2 text-sm text-gray-700">
      {{ cue.summary || t(`${cue.name} 出现 ${formatChange(cue.changePercent)} 波动。`, `${cue.name} moved ${formatChange(cue.changePercent)}.`) }}
    </p>
    <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
      <span>{{ cue.symbol }} · {{ cue.name }}</span>
      <span>{{ formatChange(cue.changePercent) }}</span>
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        v-if="cue.status !== 'confirmed'"
        class="rounded-full bg-emerald-500 px-3 py-2 text-xs text-white"
        :title="t('确认行情复盘提醒', 'Confirm market review reminder')"
        @click="emit('confirm', cue)"
      >
        <i class="fas fa-check mr-1"></i>{{ t('确认', 'Confirm') }}
      </button>
      <button
        class="rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-600"
        :title="t('忽略行情线索', 'Dismiss market cue')"
        @click="emit('dismiss', cue)"
      >
        <i class="fas fa-xmark mr-1"></i>{{ t('忽略', 'Dismiss') }}
      </button>
    </div>
  </article>
</template>
