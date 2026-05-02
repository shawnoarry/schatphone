<script setup>
import { useI18n } from '../../composables/useI18n'
import AssetStatusBadge from '../assets/AssetStatusBadge.vue'

const props = defineProps({
  routeFamiliarity: {
    type: Array,
    default: () => [],
  },
  visibleRouteFamiliarity: {
    type: Array,
    default: () => [],
  },
  routeFamiliarityKnowledgePoints: {
    type: Object,
    default: () => ({}),
  },
  getRouteFamiliarityNextHint: {
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

const relatedPointsFor = (routeKey) =>
  props.getRelatedKnowledgePoints(props.routeFamiliarityKnowledgePoints, routeKey)

const openWorldBookForRoute = (routeKey) => {
  emit('open-worldbook', {
    pointIds: relatedPointsFor(routeKey).map((point) => point.id),
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
      <h2 class="font-semibold">{{ t('路线熟悉度', 'Route familiarity') }}</h2>
      <AssetStatusBadge
        v-if="routeFamiliarity.length > 0"
        :label="t(`${routeFamiliarity.length} 条路线`, `${routeFamiliarity.length} routes`)"
        icon="fas fa-layer-group"
        tone="blue"
        :truncate="false"
      />
    </div>
    <p v-if="routeFamiliarity.length === 0" class="text-xs text-gray-500">
      {{ t('完成行程后会自动形成常走路线与熟悉度等级。', 'Completed trips will automatically form route familiarity tiers.') }}
    </p>
    <div v-else class="space-y-2">
      <div
        v-for="route in visibleRouteFamiliarity"
        :key="route.key"
        :data-testid="`map-route-card-${route.key}`"
        class="rounded-lg border border-white/30 bg-white/45 p-2"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="min-w-0 text-sm font-medium">
            {{ (route.fromLabel || route.from) + ' -> ' + (route.toLabel || route.to) }}
          </p>
          <AssetStatusBadge
            :label-zh="route.tierLabelZh"
            :label-en="route.tierLabelEn"
            icon="fas fa-location-arrow"
            :tone="route.tone || 'blue'"
            :truncate="false"
          />
        </div>
        <div class="mt-1 flex flex-wrap gap-1.5 text-[11px] text-gray-600">
          <span>{{ t(`${route.completedCount} 次完成`, `${route.completedCount} trips`) }}</span>
          <span>{{ t(`${route.points} 点探索`, `${route.points} pts`) }}</span>
          <span>{{ t(`平均 ${route.averageDistanceKm} km`, `Avg ${route.averageDistanceKm} km`) }}</span>
        </div>
        <p class="mt-1 text-[11px] text-gray-500">
          {{ getRouteFamiliarityNextHint(route) }}
        </p>
        <div
          v-if="relatedPointsFor(route.key).length > 0"
          :data-testid="`map-route-worldbook-${route.key}`"
          class="mt-3 rounded-lg border border-blue-100 bg-white p-3"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] font-medium text-blue-700">
              {{ t('Related knowledge points', 'Related knowledge points') }}
            </p>
            <button
              type="button"
              class="text-[11px] text-blue-600"
              @click="openWorldBookForRoute(route.key)"
            >
              WorldBook
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="point in relatedPointsFor(route.key)"
              :key="point.id"
              type="button"
              class="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700"
              :data-testid="`map-route-worldbook-chip-${route.key}-${point.id}`"
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
