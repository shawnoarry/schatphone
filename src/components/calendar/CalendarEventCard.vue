<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  event: {
    type: Object,
    required: true,
  },
  relatedKnowledgePoints: {
    type: Array,
    default: () => [],
  },
  formattedStartsAt: {
    type: String,
    required: true,
  },
  formattedInputStartsAt: {
    type: String,
    required: true,
  },
  isTimeEdited: {
    type: Boolean,
    default: false,
  },
  quickShiftOptions: {
    type: Array,
    default: () => [],
  },
  pushStatusMeta: {
    type: Object,
    required: true,
  },
  pushDetail: {
    type: String,
    required: true,
  },
  pushHistory: {
    type: Array,
    default: () => [],
  },
  formatPushHistoryEntry: {
    type: Function,
    required: true,
  },
  formatDateTime: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['update-starts-at', 'shift-starts-at', 'reset-starts-at', 'open-worldbook'])

const { t } = useI18n()
</script>

<template>
  <article
    :data-testid="`calendar-event-card-${event.id}`"
    class="rounded-lg border border-gray-100 bg-gray-50 p-3"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold">
          <i :class="[event.icon, 'mr-1 text-emerald-500']"></i>
          {{ t(event.titleZh, event.titleEn) }}
        </p>
        <p class="mt-1 text-xs text-gray-500">{{ formattedStartsAt }}</p>
      </div>
      <span
        v-if="event.pinned"
        class="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-600"
      >
        {{ t('已固定', 'Pinned') }}
      </span>
    </div>
    <p v-if="event.summaryZh || event.summaryEn" class="mt-2 text-xs text-gray-600">
      {{ t(event.summaryZh, event.summaryEn) }}
    </p>
    <div
      v-if="relatedKnowledgePoints.length > 0"
      :data-testid="`calendar-event-worldbook-${event.id}`"
      class="mt-3 rounded-lg border border-blue-100 bg-white p-3"
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
          class="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700"
          :data-testid="`calendar-event-worldbook-chip-${event.id}-${point.id}`"
          @click="emit('open-worldbook', [point.id])"
        >
          {{ point.title }}
        </button>
      </div>
    </div>
    <div class="mt-3 space-y-2">
      <label class="block text-[11px] font-medium text-gray-500">
        {{ t('提醒时间', 'Reminder time') }}
      </label>
      <input
        type="datetime-local"
        class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800"
        :value="formattedInputStartsAt"
        @change="emit('update-starts-at', event, $event.target.value)"
      />
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="option in quickShiftOptions"
          :key="option.key"
          class="rounded-full bg-white px-3 py-2 text-[11px] text-gray-700 border border-gray-200"
          :title="t('调整提醒时间', 'Adjust reminder time')"
          @click="emit('shift-starts-at', event, option.offsetMs)"
        >
          <i class="fas fa-clock mr-1"></i>{{ t(option.labelZh, option.labelEn) }}
        </button>
        <button
          v-if="isTimeEdited"
          class="rounded-full bg-gray-100 px-3 py-2 text-[11px] text-gray-600"
          :title="t('恢复建议时间', 'Reset suggested time')"
          @click="emit('reset-starts-at', event)"
        >
          <i class="fas fa-rotate-left mr-1"></i>{{ t('恢复', 'Reset') }}
        </button>
      </div>
      <p v-if="isTimeEdited" class="text-[11px] text-blue-500">
        {{ t('已调整', 'Adjusted') }}
      </p>
      <div class="rounded-lg border border-white bg-white/80 p-2 text-[11px] text-gray-600">
        <div class="flex items-center justify-between gap-2">
          <span class="font-medium text-gray-700">{{ t('推送状态', 'Push status') }}</span>
          <span
            class="shrink-0 rounded-full px-2 py-1"
            :class="pushStatusMeta.className"
          >
            {{ t(pushStatusMeta.labelZh, pushStatusMeta.labelEn) }}
          </span>
        </div>
        <p class="mt-1">{{ pushDetail }}</p>
        <div v-if="pushHistory.length > 0" class="mt-2 space-y-1">
          <p class="font-medium text-gray-500">{{ t('最近排程记录', 'Recent schedule log') }}</p>
          <p
            v-for="entry in pushHistory"
            :key="`${entry.action}-${entry.createdAt}-${entry.scheduleId}`"
            class="flex items-center justify-between gap-2"
          >
            <span>{{ formatPushHistoryEntry(entry) }}</span>
            <span v-if="entry.deliverAt" class="text-gray-400">
              {{ formatDateTime(entry.deliverAt) }}
            </span>
          </p>
        </div>
      </div>
    </div>
  </article>
</template>
