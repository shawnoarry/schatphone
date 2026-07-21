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
  icon: {
    type: String,
    required: true,
  },
  iconClass: {
    type: String,
    default: 'bg-gray-600',
  },
  withBorder: {
    type: Boolean,
    default: true,
  },
})

defineEmits(['select'])

const { t } = useI18n()
</script>

<template>
  <button
    type="button"
    class="settings-menu-item w-full p-3.5 flex items-center gap-3 text-left"
    :class="withBorder ? 'settings-menu-item--bordered' : ''"
    :data-settings-menu-title="titleEn"
    @click="$emit('select')"
  >
    <div
      class="settings-menu-icon w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
      :class="iconClass"
    >
      <i :class="icon" aria-hidden="true"></i>
    </div>
    <div class="settings-menu-copy flex-1 min-w-0">
      <p class="text-sm">{{ t(titleZh, titleEn) }}</p>
      <p class="text-[11px]">{{ t(subtitleZh, subtitleEn) }}</p>
    </div>
    <i class="settings-menu-chevron fas fa-chevron-right text-xs" aria-hidden="true"></i>
  </button>
</template>

<style scoped>
.settings-menu-item {
  min-width: 0;
  min-height: 64px;
  color: var(--system-text);
  background: transparent;
  transition:
    background var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
  -webkit-tap-highlight-color: transparent;
}

.settings-menu-item--bordered {
  border-bottom: 1px solid var(--system-subtle-border);
}

.settings-menu-item:active {
  background: var(--system-pressed-bg);
}

.settings-menu-item:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--system-accent);
  outline-offset: -2px;
  box-shadow: none;
}

.settings-menu-icon {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 13px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

.settings-menu-copy,
.settings-menu-copy p {
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: normal;
}

.settings-menu-copy p:first-child {
  color: var(--system-text);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}

.settings-menu-copy p:last-child {
  color: var(--system-text-muted);
  line-height: 1.35;
}

.settings-menu-chevron {
  flex: none;
  color: var(--system-text-soft);
}

@media (hover: hover) {
  .settings-menu-item:hover {
    background: var(--system-hover-bg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-menu-item {
    transition: none;
  }
}
</style>
