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
    class="settings-menu-item w-full p-3.5 flex items-center gap-3 active:bg-gray-50 transition text-left"
    :class="withBorder ? 'border-b border-gray-100' : ''"
    @click="$emit('select')"
  >
    <div class="settings-menu-icon w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs" :class="iconClass">
      <i :class="icon"></i>
    </div>
    <div class="settings-menu-copy flex-1 min-w-0">
      <p class="text-sm">{{ t(titleZh, titleEn) }}</p>
      <p class="text-[11px] text-gray-500">{{ t(subtitleZh, subtitleEn) }}</p>
    </div>
    <i class="settings-menu-chevron fas fa-chevron-right text-gray-300 text-xs"></i>
  </button>
</template>

<style scoped>
.settings-menu-item {
  min-height: 64px;
  border-color: rgba(20, 24, 31, 0.07);
  -webkit-tap-highlight-color: transparent;
}

.settings-menu-item:active {
  background: rgba(47, 111, 237, 0.06);
}

.settings-menu-icon {
  width: 34px;
  height: 34px;
  border-radius: 13px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

.settings-menu-copy p:first-child {
  color: var(--system-text);
  font-weight: 600;
  letter-spacing: 0;
}

.settings-menu-copy p:last-child {
  color: var(--system-text-muted);
  line-height: 1.35;
}

.settings-menu-chevron {
  color: rgba(20, 24, 31, 0.22);
}
</style>
