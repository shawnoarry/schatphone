<script setup>
import { useI18n } from '../../composables/useI18n'
import AssetStatusBadge from '../assets/AssetStatusBadge.vue'

const props = defineProps({
  mapAreaFeedback: {
    type: Array,
    default: () => [],
  },
  visibleMapAreaFeedback: {
    type: Array,
    default: () => [],
  },
  mapAreaFeedbackKnowledgePoints: {
    type: Object,
    default: () => ({}),
  },
  formatTime: {
    type: Function,
    required: true,
  },
  getRelatedKnowledgePoints: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['open-worldbook'])

const { t } = useI18n()

const relatedPointsFor = (feedbackId) =>
  props.getRelatedKnowledgePoints(props.mapAreaFeedbackKnowledgePoints, feedbackId)

const openWorldBookForFeedback = (feedbackId) => {
  emit('open-worldbook', {
    pointIds: relatedPointsFor(feedbackId).map((point) => point.id),
  })
}

const openWorldBookForPoint = (pointId) => {
  emit('open-worldbook', {
    pointIds: [pointId],
  })
}
</script>

<template>
  <section class="map-glass-panel rounded-[1.75rem] p-4">
    <div class="mb-2 flex items-center justify-between gap-2">
      <h2 class="font-semibold">{{ t('区域反馈', 'Area feedback') }}</h2>
      <AssetStatusBadge
        :label="t(`${mapAreaFeedback.length} 条反馈`, `${mapAreaFeedback.length} notes`)"
        icon="fas fa-location-crosshairs"
        tone="blue"
        :truncate="false"
      />
    </div>
    <p v-if="mapAreaFeedback.length === 0" class="text-xs text-gray-500">
      {{ t('解锁区域后会自动生成地点反馈。', 'Area feedback appears after areas are unlocked.') }}
    </p>
    <div v-else class="space-y-2">
      <div
        v-for="feedback in visibleMapAreaFeedback"
        :key="feedback.id"
        :data-testid="`map-area-feedback-card-${feedback.id}`"
        class="rounded-lg border border-white/30 bg-white/45 p-2"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm font-medium">
              <i :class="[feedback.icon, 'mr-1 text-[11px] text-gray-500']"></i>
              {{ t(feedback.titleZh, feedback.titleEn) }}
            </p>
            <p class="text-[11px] text-gray-500">
              {{ t(feedback.areaLabelZh, feedback.areaLabelEn) }}
              <span v-if="feedback.triggeredAt"> · {{ formatTime(feedback.triggeredAt) }}</span>
            </p>
          </div>
          <AssetStatusBadge
            :label="t(`${feedback.explorationPoints} 点`, `${feedback.explorationPoints} pts`)"
            icon="fas fa-star"
            :tone="feedback.tone || 'blue'"
            :truncate="false"
          />
        </div>
        <p class="mt-1 text-[11px] text-gray-600">
          {{ t(feedback.summaryZh, feedback.summaryEn) }}
        </p>
        <p v-if="feedback.routeLabel" class="mt-1 text-[11px] text-gray-500">
          {{ t(`参考路线：${feedback.routeLabel}`, `Route cue: ${feedback.routeLabel}`) }}
        </p>
        <div
          v-if="relatedPointsFor(feedback.id).length > 0"
          :data-testid="`map-area-feedback-worldbook-${feedback.id}`"
          class="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] font-medium text-blue-700">
              {{ t('相关百科', 'Related encyclopedia') }}
            </p>
            <button
              type="button"
              class="text-[11px] text-blue-600"
              @click="openWorldBookForFeedback(feedback.id)"
            >
              WorldBook
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="point in relatedPointsFor(feedback.id)"
              :key="point.id"
              type="button"
              class="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-700"
              :data-testid="`map-area-feedback-worldbook-chip-${feedback.id}-${point.id}`"
              @click="openWorldBookForPoint(point.id)"
            >
              {{ point.title }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
