<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  titleZh: {
    type: String,
    required: true,
  },
  titleEn: {
    type: String,
    required: true,
  },
  subtitleZh: {
    type: String,
    required: true,
  },
  subtitleEn: {
    type: String,
    required: true,
  },
})

defineEmits(['select'])

const { t } = useI18n()
</script>

<template>
  <button
    class="settings-quick-access bg-white rounded-xl p-2.5 border border-gray-100 text-left active:bg-gray-50"
    @click="$emit('select')"
  >
    <p class="text-[11px] font-semibold text-gray-800">{{ t(titleZh, titleEn) }}</p>
    <p class="text-[10px] text-gray-500 mt-0.5">{{ t(subtitleZh, subtitleEn) }}</p>
  </button>
</template>

<style scoped>
.settings-quick-access {
  min-height: 62px;
  border-color: rgba(20, 24, 31, 0.08);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
  transition:
    transform var(--system-motion-fast),
    background var(--system-motion-fast),
    border-color var(--system-motion-fast);
  -webkit-tap-highlight-color: transparent;
}

.settings-quick-access:active {
  transform: scale(0.985);
  border-color: var(--system-accent-soft);
  background: #fff;
}

.settings-quick-access p:first-child {
  color: var(--system-text);
  line-height: 1.2;
}

.settings-quick-access p:last-child {
  color: var(--system-text-muted);
  line-height: 1.25;
}

@media (prefers-reduced-motion: reduce) {
  .settings-quick-access {
    transition: none;
  }
}
</style>
