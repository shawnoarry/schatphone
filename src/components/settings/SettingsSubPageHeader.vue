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
})

const emit = defineEmits(['close'])
const { t } = useI18n()
</script>

<template>
  <div class="settings-subpage-header pt-12 pb-2 px-2">
    <button
      type="button"
      class="settings-subpage-back flex items-center px-2"
      data-testid="settings-subpage-back"
      @click="emit('close')"
    >
      <i class="fas fa-chevron-left mr-1" aria-hidden="true"></i>
      <span class="settings-subpage-back-label">{{ t('设置', 'Settings') }}</span>
    </button>
    <span class="settings-subpage-title font-bold">{{ t(titleZh, titleEn) }}</span>
  </div>
</template>

<style scoped>
.settings-subpage-header {
  display: grid;
  grid-template-columns: minmax(116px, 1fr) minmax(0, 2fr) minmax(116px, 1fr);
  align-items: center;
  width: 100%;
  min-height: 86px;
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  color: var(--system-text);
  box-shadow: var(--system-shadow-chrome);
  backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
  -webkit-backdrop-filter: blur(var(--system-blur-lg)) saturate(1.14);
}

.settings-subpage-header::after {
  grid-column: 3;
  content: '';
}

.settings-subpage-back {
  grid-column: 1;
  justify-self: start;
  min-width: 0;
  min-height: 40px;
  white-space: nowrap;
  border-radius: var(--system-radius-sm);
  color: var(--system-accent);
  transition:
    background var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
  -webkit-tap-highlight-color: transparent;
}

.settings-subpage-back:active {
  background: var(--system-pressed-bg);
}

.settings-subpage-back:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
  box-shadow: none;
}

.settings-subpage-back i {
  flex: none;
}

.settings-subpage-back-label {
  display: block;
  flex: none;
  min-width: 0;
  white-space: nowrap;
  overflow-wrap: normal;
  word-break: keep-all;
}

.settings-subpage-title {
  grid-column: 2;
  min-width: 0;
  padding-inline: 8px;
  color: var(--system-text);
  font-size: 15px;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: normal;
  word-break: normal;
  letter-spacing: 0;
}

@media (hover: hover) {
  .settings-subpage-back:hover {
    background: var(--system-hover-bg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-subpage-back {
    transition: none;
  }
}
</style>
