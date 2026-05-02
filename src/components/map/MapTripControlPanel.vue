<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  tripForm: {
    type: Object,
    required: true,
  },
  tripEstimate: {
    type: Object,
    required: true,
  },
  tripRuntime: {
    type: Object,
    required: true,
  },
  tripStatusLabel: {
    type: String,
    default: '',
  },
  tripProgressPercent: {
    type: Number,
    default: 0,
  },
  tripArrivalPushStatusLabel: {
    type: String,
    default: '',
  },
  tripArrivalPushHint: {
    type: String,
    default: '',
  },
  tripActionHint: {
    type: Object,
    default: () => ({ tone: '', message: '' }),
  },
  isTripTraveling: {
    type: Boolean,
    default: false,
  },
  isTripArrived: {
    type: Boolean,
    default: false,
  },
  canStartTrip: {
    type: Boolean,
    default: false,
  },
  formatSeconds: {
    type: Function,
    required: true,
  },
  formatTime: {
    type: Function,
    required: true,
  },
})

defineEmits([
  'acknowledge-arrival',
  'cancel-trip',
  'start-trip',
  'update-trip-from',
  'update-trip-to',
])

const { t } = useI18n()
</script>

<template>
  <section class="map-glass-panel rounded-[1.75rem] p-4">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold">{{ t('出行模拟', 'Trip simulation') }}</h2>
      <span class="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{{ tripStatusLabel }}</span>
    </div>
    <div class="space-y-2">
      <input
        :value="tripForm.from"
        class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
        :placeholder="t('起点', 'From')"
        @input="$emit('update-trip-from', $event.target.value)"
      />
      <input
        :value="tripForm.to"
        class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
        :placeholder="t('终点', 'To')"
        @input="$emit('update-trip-to', $event.target.value)"
      />
    </div>
    <div class="mt-3 text-sm text-gray-700 space-y-1">
      <p>{{ t('距离：约', 'Distance:') }} {{ tripEstimate.distanceKm }} km</p>
      <p>{{ t('时长：约', 'Duration:') }} {{ tripEstimate.minutes }} {{ t('分钟', 'min') }}</p>
      <p>{{ t('费用：约', 'Fare:') }} ₩ {{ tripEstimate.fare.toLocaleString() }}</p>
    </div>

    <div v-if="isTripTraveling || isTripArrived" class="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
      <p class="text-sm text-gray-700">
        {{ (tripRuntime.fromLabel || t('起点', 'From')) + ' → ' + (tripRuntime.toLabel || t('终点', 'To')) }}
      </p>
      <div class="h-2 rounded bg-gray-200 overflow-hidden">
        <div class="h-full bg-emerald-500 transition-all duration-500" :style="{ width: `${tripProgressPercent}%` }"></div>
      </div>
      <p class="text-xs text-gray-600">
        {{ t('进度', 'Progress') }} {{ tripProgressPercent }}% ·
        {{ t('剩余', 'Remaining') }} {{ formatSeconds(tripRuntime.remainingSeconds) }}
      </p>
      <p class="text-xs text-gray-600">
        {{ t('预计到达', 'ETA') }} {{ formatTime(tripRuntime.etaAt) }}
      </p>
      <p class="text-xs text-gray-600">
        {{ t('后台到达提醒', 'Background arrival push') }} {{ tripArrivalPushStatusLabel }}
      </p>
      <p class="text-[11px] text-gray-500">
        {{ tripArrivalPushHint }}
      </p>
      <p v-if="isTripArrived" class="text-xs text-emerald-700">
        {{ t('已在系统时间到达目的地。', 'Destination reached according to system time.') }}
      </p>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <button
        @click="$emit('start-trip')"
        :disabled="!canStartTrip"
        class="px-3 py-2 rounded-lg text-sm"
        :class="canStartTrip ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'"
      >
        {{ t('开始行程', 'Start trip') }}
      </button>
      <button
        v-if="isTripTraveling"
        @click="$emit('cancel-trip')"
        class="px-3 py-2 rounded-lg bg-red-500 text-white text-sm"
      >
        {{ t('取消行程', 'Cancel trip') }}
      </button>
      <button
        v-if="isTripArrived"
        @click="$emit('acknowledge-arrival')"
        class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm"
      >
        {{ t('确认完成', 'Acknowledge') }}
      </button>
    </div>

    <p
      v-if="tripActionHint.message"
      class="mt-2 text-xs"
      :class="tripActionHint.tone === 'success' ? 'text-emerald-700' : tripActionHint.tone === 'warn' ? 'text-amber-700' : 'text-gray-600'"
    >
      {{ tripActionHint.message }}
    </p>
  </section>
</template>
