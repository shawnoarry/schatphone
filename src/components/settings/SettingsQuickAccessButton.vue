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
    type="button"
    class="settings-quick-access rounded-xl p-2.5 text-left"
    :data-settings-quick-title="titleEn"
    @click="$emit('select')"
  >
    <p class="text-[11px] font-semibold">{{ t(titleZh, titleEn) }}</p>
    <p class="text-[10px] mt-0.5">{{ t(subtitleZh, subtitleEn) }}</p>
  </button>
</template>

<style scoped>
.settings-quick-access {
  min-width: 0;
  min-height: 62px;
  height: 100%;
  border: 1px solid var(--system-subtle-border);
  background: var(--system-panel-bg);
  color: var(--system-text);
  box-shadow: var(--system-shadow-control);
  transition:
    background var(--system-motion-fast),
    border-color var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
  -webkit-tap-highlight-color: transparent;
}

.settings-quick-access:active {
  border-color: var(--system-accent);
  background: var(--system-pressed-bg);
  box-shadow: var(--system-shadow-control);
}

.settings-quick-access:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
  box-shadow: var(--system-shadow-control);
}

.settings-quick-access p {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: normal;
  letter-spacing: 0;
}

.settings-quick-access p:first-child {
  color: var(--system-text);
  line-height: 1.2;
}

.settings-quick-access p:last-child {
  color: var(--system-text-muted);
  line-height: 1.35;
}

@media (hover: hover) {
  .settings-quick-access:hover {
    border-color: var(--system-control-border);
    background: var(--system-hover-bg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-quick-access {
    transition: none;
  }
}
</style>
