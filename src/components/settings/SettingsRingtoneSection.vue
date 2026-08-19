<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
  ringtoneId: {
    type: String,
    default: '',
  },
  ringtoneOptions: {
    type: Array,
    default: () => [],
  },
  ringtone: {
    type: Object,
    default: () => ({}),
  },
  testIdPrefix: {
    type: String,
    default: 'settings',
  },
})

const emit = defineEmits(['toggle', 'set-ringtone', 'preview'])
const { t } = useI18n()

const setRingtone = (event) => {
  emit('set-ringtone', event.target.value)
}
</script>

<template>
  <section
    class="rounded-2xl border border-gray-200 bg-white p-4 space-y-4"
    :data-testid="testIdPrefix + '-ringtone'"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-gray-900">{{ t('来电铃声', 'Call Ringtone') }}</p>
        <p class="mt-1 text-[11px] leading-4 text-gray-500">
          {{ t('来电响起时使用的铃声，可随时试听。', 'The ringtone played for incoming calls, with preview.') }}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        class="relative h-7 w-12 shrink-0 rounded-full transition"
        :class="enabled ? 'bg-blue-500' : 'bg-gray-300'"
        :aria-checked="enabled"
        :aria-label="t('开启来电铃声', 'Enable call ringtone')"
        :data-testid="testIdPrefix + '-ringtone-toggle'"
        @click="emit('toggle')"
      >
        <span
          class="absolute top-1 h-5 w-5 rounded-full bg-white transition"
          :class="enabled ? 'left-6' : 'left-1'"
        ></span>
      </button>
    </div>

    <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <label class="min-w-0">
        <span class="text-xs font-semibold text-gray-800">{{ t('铃声选择', 'Ringtone choice') }}</span>
        <select
          class="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          :value="ringtoneId"
          :aria-label="t('铃声选择', 'Ringtone selection')"
          :data-testid="testIdPrefix + '-ringtone-select'"
          @change="setRingtone"
        >
          <option v-for="option in ringtoneOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>
        <span class="mt-1 block text-[11px] leading-4 text-gray-500">{{ ringtone.label }}</span>
      </label>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!enabled"
        :data-testid="testIdPrefix + '-ringtone-preview'"
        @click="emit('preview')"
      >
        <i class="fas fa-play" aria-hidden="true"></i>
        {{ t('试听', 'Preview') }}
      </button>
    </div>
  </section>
</template>
