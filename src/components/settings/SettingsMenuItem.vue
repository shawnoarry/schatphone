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
    class="w-full p-3.5 flex items-center gap-3 active:bg-gray-50 transition text-left"
    :class="withBorder ? 'border-b border-gray-100' : ''"
    @click="$emit('select')"
  >
    <div class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs" :class="iconClass">
      <i :class="icon"></i>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm">{{ t(titleZh, titleEn) }}</p>
      <p class="text-[11px] text-gray-500">{{ t(subtitleZh, subtitleEn) }}</p>
    </div>
    <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
  </button>
</template>
