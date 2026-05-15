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
  <div class="settings-subpage-header pt-12 pb-2 px-2 bg-white flex items-center border-b">
    <button
      type="button"
      class="settings-subpage-back text-blue-500 flex items-center px-2"
      data-testid="settings-subpage-back"
      @click="emit('close')"
    >
      <i class="fas fa-chevron-left mr-1"></i> {{ t('设置', 'Settings') }}
    </button>
    <span class="font-bold mx-auto pr-8">{{ t(titleZh, titleEn) }}</span>
  </div>
</template>
