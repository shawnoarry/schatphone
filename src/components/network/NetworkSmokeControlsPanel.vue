<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  apiKindLabel: {
    type: String,
    default: '',
  },
  modelsLoading: {
    type: Boolean,
    default: false,
  },
  modelsError: {
    type: String,
    default: '',
  },
  connectionGuidance: {
    type: Object,
    default: null,
  },
  smokeTestLoading: {
    type: Boolean,
    default: false,
  },
  smokeTestResult: {
    type: Object,
    default: null,
  },
  smokeTestError: {
    type: String,
    default: '',
  },
  modelOptions: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['test-models', 'run-chat-smoke-test', 'update:modelValue'])

const { t } = useI18n()

const updateModelValue = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="bg-white rounded-xl p-4">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-gray-500">{{ t('已识别类型', 'Detected type') }}</span>
      <span class="text-xs font-semibold text-gray-700">{{ apiKindLabel }}</span>
    </div>

    <button
      @click="emit('test-models')"
      :disabled="modelsLoading"
      data-testid="network-model-test-run"
      class="w-full rounded-lg py-2 text-sm transition"
      :class="modelsLoading ? 'bg-gray-100 text-gray-400' : 'bg-blue-500 text-white hover:bg-blue-600'"
    >
      {{ modelsLoading ? t('测试中...', 'Testing...') : t('测试连接并刷新模型', 'Test connection and refresh models') }}
    </button>

    <p v-if="modelsError" class="text-xs text-red-500 mt-2" data-testid="network-model-test-error">{{ modelsError }}</p>

    <div
      v-if="connectionGuidance"
      class="mt-3 rounded-xl border border-red-100 bg-red-50 p-3"
      data-testid="network-connection-guidance"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-semibold text-red-700">
            {{ t(connectionGuidance.titleZh, connectionGuidance.titleEn) }}
          </p>
          <p class="mt-1 text-[11px] text-red-600">
            {{ t(connectionGuidance.detailZh, connectionGuidance.detailEn) }}
          </p>
        </div>
        <span class="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-red-600">
          {{ connectionGuidance.code }}
        </span>
      </div>
      <p class="mt-2 text-[11px] text-gray-700">
        {{ t('建议处理', 'Suggested fix') }}: {{ t(connectionGuidance.fixZh, connectionGuidance.fixEn) }}
      </p>
      <p class="mt-2 text-[10px] text-gray-500">
        {{ t('供应商', 'Provider') }}: {{ t(connectionGuidance.providerLabelZh, connectionGuidance.providerLabelEn) }} ·
        {{ t('状态码', 'Status') }}: {{ connectionGuidance.statusCode || '-' }}
      </p>
    </div>
  </div>

  <div class="bg-white rounded-xl p-4">
    <div class="flex items-start justify-between gap-3 mb-2">
      <div>
        <p class="text-xs font-semibold text-gray-700">{{ t('Chat 调用烟测', 'Chat call smoke test') }}</p>
        <p class="mt-1 text-[11px] text-gray-500">
          {{ t('使用当前 URL/Key/模型发起一次极轻量 Chat 请求，不写入聊天记录。', 'Runs one tiny Chat request with current URL/key/model without writing chat history.') }}
        </p>
      </div>
      <span class="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
        {{ t('真实调用', 'Real call') }}
      </span>
    </div>

    <button
      @click="emit('run-chat-smoke-test')"
      :disabled="smokeTestLoading"
      data-testid="network-chat-smoke-run"
      class="w-full rounded-lg py-2 text-sm transition"
      :class="smokeTestLoading ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-black'"
    >
      {{ smokeTestLoading ? t('烟测中...', 'Testing...') : t('运行 Chat 烟测', 'Run Chat smoke test') }}
    </button>

    <div
      v-if="smokeTestResult"
      class="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3"
      data-testid="network-chat-smoke-success"
    >
      <p class="text-xs font-semibold text-emerald-700">
        {{ t('Chat 路径已打通', 'Chat path is working') }}
      </p>
      <p class="mt-1 text-[11px] text-gray-700">
        {{ t('返回预览', 'Reply preview') }}: {{ smokeTestResult.preview }}
      </p>
      <p class="mt-1 text-[10px] text-gray-500">
        {{ t('供应商', 'Provider') }}: {{ smokeTestResult.provider || '-' }} ·
        {{ t('模型', 'Model') }}: {{ smokeTestResult.model || '-' }}
      </p>
    </div>

    <div
      v-if="smokeTestError"
      class="mt-3 rounded-xl border border-red-100 bg-red-50 p-3"
      data-testid="network-chat-smoke-error"
    >
      <p class="text-xs font-semibold text-red-700">
        {{ t('Chat 烟测未通过', 'Chat smoke test failed') }}
      </p>
      <p class="mt-1 text-[11px] text-red-600">{{ smokeTestError }}</p>
      <p class="mt-1 text-[10px] text-gray-500">
        {{ t('已写入诊断报告中心。', 'Saved to Diagnostics Center.') }}
      </p>
    </div>
  </div>

  <div class="bg-white rounded-xl p-4" v-if="modelOptions.length > 0">
    <label class="text-xs text-gray-500 block mb-1">{{ t('可用模型（自动拉取）', 'Available models (auto fetched)') }}</label>
    <select
      :value="modelValue"
      class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white"
      data-testid="network-model-select"
      @change="updateModelValue"
    >
      <option v-for="model in modelOptions" :key="model" :value="model">{{ model }}</option>
    </select>
  </div>
</template>
