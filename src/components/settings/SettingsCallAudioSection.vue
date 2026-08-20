<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'
import { CALL_AUDIO_CUE_OPTIONS } from '../../lib/call-audio'

defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
  profileId: {
    type: String,
    default: 'classic-telephone',
  },
  profileOptions: {
    type: Array,
    default: () => [],
  },
  profile: {
    type: Object,
    default: () => ({}),
  },
  testIdPrefix: {
    type: String,
    default: 'settings',
  },
})

const emit = defineEmits(['toggle', 'set-profile', 'preview'])
const { t } = useI18n()

const cueOptions = computed(() =>
  CALL_AUDIO_CUE_OPTIONS.map((cue) => ({
    ...cue,
    label: t(cue.labelZh, cue.labelEn),
  })),
)

const setProfile = (event) => {
  emit('set-profile', event.target.value)
}
</script>

<template>
  <section
    class="rounded-2xl border border-gray-200 bg-white p-4 space-y-4"
    :data-testid="testIdPrefix + '-call-audio'"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-gray-900">
          {{ t('电话模式声音', 'Phone mode audio') }}
        </p>
        <p class="mt-1 text-[11px] leading-4 text-gray-500">
          {{
            t(
              '仅用于 Phone 的拨号、回铃、忙线和通话状态，不会进入 Chat。',
              'Only Phone uses these dial, ringback, busy, and call-state sounds. Chat stays separate.',
            )
          }}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        class="relative h-7 w-12 shrink-0 rounded-full transition"
        :class="enabled ? 'bg-blue-500' : 'bg-gray-300'"
        :aria-checked="enabled"
        :aria-label="t('开启电话状态音', 'Enable phone call audio')"
        :data-testid="testIdPrefix + '-call-audio-toggle'"
        @click="emit('toggle')"
      >
        <span
          class="absolute top-1 h-5 w-5 rounded-full bg-white transition"
          :class="enabled ? 'left-6' : 'left-1'"
        ></span>
      </button>
    </div>

    <label class="block min-w-0">
      <span class="text-xs font-semibold text-gray-800">{{
        t('通话状态音风格', 'Call-state sound style')
      }}</span>
      <select
        class="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        :value="profileId"
        :aria-label="t('通话状态音风格', 'Call-state sound style')"
        :data-testid="testIdPrefix + '-call-audio-select'"
        @change="setProfile"
      >
        <option v-for="option in profileOptions" :key="option.id" :value="option.id">
          {{ option.label }}
        </option>
      </select>
      <span class="mt-1 block text-[11px] leading-4 text-gray-500">{{ profile.description }}</span>
    </label>

    <div
      class="grid grid-cols-2 gap-2 sm:grid-cols-4"
      :data-testid="testIdPrefix + '-call-audio-previews'"
    >
      <button
        v-for="cue in cueOptions"
        :key="cue.id"
        type="button"
        class="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!enabled"
        :aria-label="t(`试听${cue.labelZh}`, `Preview ${cue.labelEn}`)"
        :data-testid="`${testIdPrefix}-call-audio-preview-${cue.id}`"
        @click="emit('preview', cue.id)"
      >
        <i class="fas fa-play text-[10px]" aria-hidden="true"></i>
        <span>{{ cue.label }}</span>
      </button>
    </div>
  </section>
</template>
