<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  saved: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save-settings', 'update:modelValue'])

const { t } = useI18n()

const updateModelValue = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="bg-white rounded-xl p-4">
    <label class="text-xs text-gray-500 block mb-1">{{ t('模型名（手动兜底）', 'Model name (manual fallback)') }}</label>
    <input
      :value="modelValue"
      type="text"
      class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono"
      placeholder="gpt-4o-mini / gemini-2.5-flash"
      data-testid="network-manual-model-input"
      @input="updateModelValue"
    />
    <p class="text-[10px] text-gray-400 mt-2">{{ t('如果模型接口受限或跨域失败，可直接手动填写模型名。', 'If model API is limited or blocked by CORS, enter model name manually.') }}</p>
  </div>

  <button
    type="button"
    class="w-full py-3 rounded-xl text-sm font-semibold transition"
    data-testid="network-save-settings"
    :class="saved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
    @click="emit('save-settings')"
  >
    {{ saved ? t('已保存', 'Saved') : t('保存网络设置', 'Save network settings') }}
  </button>
</template>
