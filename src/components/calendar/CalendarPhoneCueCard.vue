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
</script>

<template>
  <article
    :data-testid="`calendar-phone-cue-card-${cue.id}`"
    class="rounded-lg bg-white border border-rose-100 p-4 shadow-sm"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold">
          <i :class="[cue.icon, 'mr-1 text-rose-500']"></i>
          {{ t(`回拨 ${cue.contactName}`, `Call back ${cue.contactName}`) }}
        </p>
        <p class="mt-1 text-xs text-gray-500">{{ formattedSuggestedAt }}</p>
      </div>
      <span
        class="shrink-0 rounded-full px-2 py-1 text-[11px]"
        :class="cue.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'"
      >
        {{ cue.status === 'confirmed' ? t('已确认', 'Confirmed') : t('建议回拨', 'Suggested') }}
      </span>
    </div>
    <p class="mt-2 text-sm text-gray-700">
      {{ cue.summary || t(`${cue.contactName} 有一通未接来电。`, `${cue.contactName} left a missed call.`) }}
    </p>
    <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
      <span>{{ t('来源：Phone 未接来电', 'Source: Phone missed call') }}</span>
      <span v-if="cue.phoneNumber">{{ cue.phoneNumber }}</span>
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        v-if="cue.status !== 'confirmed'"
        class="rounded-full bg-emerald-500 px-3 py-2 text-xs text-white"
        :title="t('确认回拨提醒', 'Confirm callback reminder')"
        @click="emit('confirm', cue)"
      >
        <i class="fas fa-check mr-1"></i>{{ t('确认', 'Confirm') }}
      </button>
      <button
        class="rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-600"
        :title="t('忽略回拨线索', 'Dismiss callback cue')"
        @click="emit('dismiss', cue)"
      >
        <i class="fas fa-xmark mr-1"></i>{{ t('忽略', 'Dismiss') }}
      </button>
    </div>
  </article>
</template>
