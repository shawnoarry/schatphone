<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'
import { HAPTIC_PATTERNS, isHapticSupported, playHaptic } from '../../lib/haptics'

const props = defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
  testIdPrefix: {
    type: String,
    default: 'settings',
  },
})

const emit = defineEmits(['toggle'])
const { t } = useI18n()

const supported = computed(() => isHapticSupported())

const testHaptic = () => {
  if (!props.enabled) return
  playHaptic(HAPTIC_PATTERNS.success)
}
</script>

<template>
  <section
    class="rounded-2xl border border-gray-200 bg-white p-4 space-y-4"
    :data-testid="testIdPrefix + '-haptics'"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-gray-900">{{ t('触感反馈（振动）', 'Haptic Feedback (Vibration)') }}</p>
        <p class="mt-1 text-[11px] leading-4 text-gray-500">
          {{
            supported
              ? t('主屏操作、通知、来电与消息发送时震动。', 'Vibrate on Home actions, notifications, incoming calls, and sends.')
              : t('当前浏览器不支持网页振动（iOS 浏览器无法震动）。', 'This browser cannot vibrate from the web (iOS browsers cannot).')
          }}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        class="relative h-7 w-12 shrink-0 rounded-full transition"
        :class="enabled ? 'bg-blue-500' : 'bg-gray-300'"
        :aria-checked="enabled"
        :aria-label="t('开启触感反馈', 'Enable haptic feedback')"
        :data-testid="testIdPrefix + '-haptics-toggle'"
        @click="emit('toggle')"
      >
        <span
          class="absolute top-1 h-5 w-5 rounded-full bg-white transition"
          :class="enabled ? 'left-6' : 'left-1'"
        ></span>
      </button>
    </div>

    <div class="flex justify-end">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!enabled || !supported"
        :data-testid="testIdPrefix + '-haptics-test'"
        @click="testHaptic"
      >
        <i class="fas fa-mobile-screen-button" aria-hidden="true"></i>
        {{ t('测试振动', 'Test Vibration') }}
      </button>
    </div>
  </section>
</template>
