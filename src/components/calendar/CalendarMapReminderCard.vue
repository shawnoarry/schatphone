<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  reminder: {
    type: Object,
    required: true,
  },
  relatedKnowledgePoints: {
    type: Array,
    default: () => [],
  },
  statusLabel: {
    type: String,
    required: true,
  },
  statusClass: {
    type: String,
    required: true,
  },
  formattedDueAt: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['confirm', 'toggle-pin', 'dismiss', 'open-worldbook'])

const { t } = useI18n()
</script>

<template>
  <article
    :data-testid="`calendar-reminder-card-${reminder.id}`"
    class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold">
          <i :class="[reminder.icon, 'mr-1 text-blue-500']"></i>
          {{ t(reminder.titleZh, reminder.titleEn) }}
        </p>
        <p class="mt-1 text-xs text-gray-500">{{ formattedDueAt }}</p>
      </div>
      <span
        class="shrink-0 rounded-full px-2 py-1 text-[11px]"
        :class="statusClass"
      >
        {{ statusLabel }}
      </span>
    </div>

    <p class="mt-2 text-sm text-gray-700">{{ t(reminder.summaryZh, reminder.summaryEn) }}</p>
    <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
      <span>{{ t(`${reminder.explorationPoints} 点探索`, `${reminder.explorationPoints} pts`) }}</span>
      <span>{{ t('来源：地图区域反馈', 'Source: Map area feedback') }}</span>
    </div>

    <div
      v-if="relatedKnowledgePoints.length > 0"
      :data-testid="`calendar-reminder-worldbook-${reminder.id}`"
      class="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-[11px] font-medium text-blue-700">
          {{ t('Related knowledge points', 'Related knowledge points') }}
        </p>
        <button
          type="button"
          class="text-[11px] text-blue-600"
          @click="emit('open-worldbook', relatedKnowledgePoints.map((point) => point.id))"
        >
          WorldBook
        </button>
      </div>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="point in relatedKnowledgePoints"
          :key="point.id"
          type="button"
          class="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-700"
          :data-testid="`calendar-reminder-worldbook-chip-${reminder.id}-${point.id}`"
          @click="emit('open-worldbook', [point.id])"
        >
          {{ point.title }}
        </button>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        v-if="reminder.status !== 'confirmed'"
        class="rounded-full bg-emerald-500 px-3 py-2 text-xs text-white"
        :title="t('确认提醒', 'Confirm reminder')"
        @click="emit('confirm', reminder)"
      >
        <i class="fas fa-check mr-1"></i>{{ t('确认', 'Confirm') }}
      </button>
      <button
        class="rounded-full px-3 py-2 text-xs"
        :class="reminder.pinned ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'"
        :title="reminder.pinned ? t('取消固定', 'Unpin reminder') : t('固定提醒', 'Pin reminder')"
        @click="emit('toggle-pin', reminder)"
      >
        <i class="fas fa-thumbtack mr-1"></i>{{ reminder.pinned ? t('取消固定', 'Unpin') : t('固定', 'Pin') }}
      </button>
      <button
        class="rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-600"
        :title="t('忽略提醒', 'Dismiss reminder')"
        @click="emit('dismiss', reminder)"
      >
        <i class="fas fa-xmark mr-1"></i>{{ t('忽略', 'Dismiss') }}
      </button>
    </div>
  </article>
</template>
