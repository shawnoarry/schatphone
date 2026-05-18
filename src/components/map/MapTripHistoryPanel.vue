<script setup>
import { useI18n } from '../../composables/useI18n'
import AssetStatusBadge from '../assets/AssetStatusBadge.vue'

const props = defineProps({
  tripHistory: {
    type: Array,
    default: () => [],
  },
  visibleTripHistory: {
    type: Array,
    default: () => [],
  },
  tripHistoryKnowledgePoints: {
    type: Object,
    default: () => ({}),
  },
  mapRewardScore: {
    type: Number,
    default: 0,
  },
  formatSeconds: {
    type: Function,
    required: true,
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

const emit = defineEmits(['open-worldbook', 'delete-trip'])

const { t } = useI18n()

const relatedPointsFor = (tripId) =>
  props.getRelatedKnowledgePoints(props.tripHistoryKnowledgePoints, tripId)

const openWorldBookForTrip = (tripId) => {
  emit('open-worldbook', {
    pointIds: relatedPointsFor(tripId).map((point) => point.id),
  })
}

const openWorldBookForPoint = (pointId) => {
  emit('open-worldbook', {
    pointIds: [pointId],
  })
}

const deleteTrip = (tripId) => {
  emit('delete-trip', tripId)
}
</script>

<template>
  <section class="map-glass-panel rounded-[1.75rem] p-4">
    <div class="mb-2 flex items-center justify-between gap-2">
      <h2 class="font-semibold">{{ t('行程记录', 'Trip history') }}</h2>
      <AssetStatusBadge
        :label="t(`探索 ${mapRewardScore} 点`, `${mapRewardScore} pts`)"
        icon="fas fa-route"
        tone="emerald"
        :truncate="false"
      />
    </div>
    <p v-if="tripHistory.length === 0" class="text-xs text-gray-500">
      {{ t('暂无记录。', 'No records yet.') }}
    </p>
    <div v-else class="space-y-2">
      <div
        v-for="item in visibleTripHistory"
        :key="item.id"
        :data-testid="`map-trip-history-card-${item.id}`"
        class="border rounded-lg p-2"
      >
        <p class="text-xs text-gray-600">
          {{ item.status === 'arrived' ? t('已到达', 'Arrived') : t('已取消', 'Cancelled') }} ·
          {{ formatTime(item.endedAt) }}
        </p>
        <p class="text-sm font-medium">
          {{ (item.fromLabel || t('起点', 'From')) + ' → ' + (item.toLabel || t('终点', 'To')) }}
        </p>
        <p class="text-xs text-gray-500">
          {{ t('时长', 'Duration') }} {{ formatSeconds(item.durationSeconds) }} ·
          {{ t('费用', 'Fare') }} ₩ {{ Number(item.fare || 0).toLocaleString() }}
        </p>
        <button
          type="button"
          class="mt-2 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600"
          :data-testid="`map-trip-history-delete-${item.id}`"
          @click="deleteTrip(item.id)"
        >
          {{ t('删除', 'Delete') }}
        </button>
        <div
          v-if="item.status === 'arrived' && Number(item.rewardPoints) > 0"
          class="mt-2 rounded-lg border border-emerald-200/50 bg-emerald-50/80 px-2.5 py-2 text-[11px] text-emerald-700"
        >
          <div class="mb-1 flex flex-wrap items-center gap-1.5">
            <AssetStatusBadge
              :label="t(`+${Number(item.rewardPoints) || 0} 探索`, `+${Number(item.rewardPoints) || 0} exploration`)"
              icon="fas fa-star"
              tone="emerald"
              :truncate="false"
            />
            <AssetStatusBadge
              v-if="item.eventTitleZh || item.eventTitleEn"
              :label="t(item.eventTitleZh || item.eventTitleEn, item.eventTitleEn || item.eventTitleZh)"
              icon="fas fa-location-dot"
              tone="amber"
              :truncate="false"
            />
          </div>
          <p v-if="item.eventSummaryZh || item.eventSummaryEn">
            {{ t(item.eventSummaryZh || item.eventSummaryEn, item.eventSummaryEn || item.eventSummaryZh) }}
          </p>
        </div>
        <div
          v-if="relatedPointsFor(item.id).length > 0"
          :data-testid="`map-trip-history-worldbook-${item.id}`"
          class="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] font-medium text-blue-700">
              {{ t('Related knowledge points', 'Related knowledge points') }}
            </p>
            <button
              type="button"
              class="text-[11px] text-blue-600"
              @click="openWorldBookForTrip(item.id)"
            >
              WorldBook
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="point in relatedPointsFor(item.id)"
              :key="point.id"
              type="button"
              class="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-700"
              :data-testid="`map-trip-history-worldbook-chip-${item.id}-${point.id}`"
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
