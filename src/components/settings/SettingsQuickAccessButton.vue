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
    class="bg-white rounded-xl p-2.5 border border-gray-100 text-left active:bg-gray-50"
    :data-settings-quick-title="titleEn"
    @click="$emit('select')"
  >
    <p class="text-[11px] font-semibold text-gray-800">{{ t(titleZh, titleEn) }}</p>
    <p class="text-[10px] text-gray-500 mt-0.5">{{ t(subtitleZh, subtitleEn) }}</p>
  </button>
</template>
