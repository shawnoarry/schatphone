<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  context: {
    type: Object,
    default: null,
  },
  testId: {
    type: String,
    default: 'delivery-route-context',
  },
})

const { t, languageBase } = useI18n()

const handoff = computed(() =>
  props.context && typeof props.context === 'object' ? props.context : null,
)

const routeSummary = computed(() => {
  if (!handoff.value) return ''
  return languageBase.value === 'zh'
    ? handoff.value.routeSummaryZh || handoff.value.routeSummaryEn || ''
    : handoff.value.routeSummaryEn || handoff.value.routeSummaryZh || ''
})

const etaLabel = computed(() => {
  const etaDays = Number(handoff.value?.etaDays)
  if (Number.isFinite(etaDays) && etaDays > 0) {
    return t(`About ${etaDays} day(s)`, `About ${etaDays} day(s)`)
  }
  const etaMinutes = Number(handoff.value?.etaMinutes)
  if (!Number.isFinite(etaMinutes) || etaMinutes <= 0) return t('ETA pending', 'ETA pending')
  if (etaMinutes >= 24 * 60) {
    return t(`About ${Math.round(etaMinutes / 1440)} day(s)`, `About ${Math.round(etaMinutes / 1440)} day(s)`)
  }
  return t(`${etaMinutes} min`, `${etaMinutes} min`)
})

const distanceLabel = computed(() => {
  const distanceKm = Number(handoff.value?.distanceKm)
  return Number.isFinite(distanceKm) && distanceKm > 0 ? `${distanceKm} km` : ''
})

const sourceLabel = computed(() => {
  if (handoff.value?.eventOwner === 'food_delivery' || handoff.value?.orderOwner === 'food_delivery') {
    return t('Food Delivery', 'Food Delivery')
  }
  if (handoff.value?.eventOwner === 'shopping' || handoff.value?.orderOwner === 'shopping') {
    return t('Shopping logistics', 'Shopping logistics')
  }
  return t('Delivery', 'Delivery')
})

const endpointRows = computed(() =>
  [
    {
      key: 'pickup',
      label: t('Pickup', 'Pickup'),
      value: handoff.value?.pickupPoint || handoff.value?.locationHint || '',
    },
    {
      key: 'dropoff',
      label: t('Dropoff', 'Dropoff'),
      value: handoff.value?.dropoffPoint || handoff.value?.currentLocationDetail || '',
    },
  ].filter((row) => row.value),
)

const metaLine = computed(() =>
  [
    handoff.value?.carrierName,
    handoff.value?.trackingCode,
    distanceLabel.value,
  ].filter(Boolean).join(' · '),
)
</script>

<template>
  <aside
    v-if="handoff"
    class="mt-2 rounded-2xl border border-lime-100 bg-lime-50/70 p-3 text-[11px]"
    :data-testid="testId"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="font-bold text-lime-900">
          <i class="fas fa-route mr-1 text-lime-600"></i>
          {{ t('Map route context', 'Map route context') }}
        </p>
        <p class="mt-1 line-clamp-2 leading-4 text-lime-700" :data-testid="`${testId}-route`">
          {{ routeSummary || t('Route context is waiting for a usable delivery location.', 'Route context is waiting for a usable delivery location.') }}
        </p>
      </div>
      <span class="shrink-0 rounded-full bg-white px-2 py-1 font-semibold text-lime-700">
        {{ etaLabel }}
      </span>
    </div>

    <div v-if="endpointRows.length > 0" class="mt-2 grid grid-cols-2 gap-2">
      <div
        v-for="row in endpointRows"
        :key="row.key"
        class="rounded-xl bg-white/80 px-2.5 py-2"
        :data-testid="`${testId}-${row.key}`"
      >
        <p class="font-semibold text-lime-800">{{ row.label }}</p>
        <p class="mt-0.5 line-clamp-2 text-lime-700">{{ row.value }}</p>
      </div>
    </div>

    <p v-if="metaLine" class="mt-2 text-[10px] font-semibold text-lime-700" :data-testid="`${testId}-meta`">
      {{ metaLine }}
    </p>
    <p class="mt-2 text-[10px] leading-4 text-lime-600" :data-testid="`${testId}-boundary`">
      {{ sourceLabel }} {{ t('keeps the order. Map only explains location and ETA; it does not start a trip.', 'keeps the order. Map only explains location and ETA; it does not start a trip.') }}
    </p>
  </aside>
</template>
