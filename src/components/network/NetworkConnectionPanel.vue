<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  networkSetupCopy: {
    type: Object,
    required: true,
  },
  networkSetupState: {
    type: Object,
    required: true,
  },
  endpointGuidance: {
    type: Object,
    required: true,
  },
  presetSaveGuidance: {
    type: Object,
    required: true,
  },
  presets: {
    type: Array,
    default: () => [],
  },
  apiKindLabel: {
    type: String,
    default: '',
  },
  apiUrl: {
    type: String,
    default: '',
  },
  apiKey: {
    type: String,
    default: '',
  },
  modelValue: {
    type: String,
    default: '',
  },
  showApiKey: {
    type: Boolean,
    default: false,
  },
  presetName: {
    type: String,
    default: '',
  },
  activePresetId: {
    type: String,
    default: '',
  },
  uiFeedbackType: {
    type: String,
    default: '',
  },
  uiFeedbackMessage: {
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
  saved: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'save-preset',
  'remove-active-preset',
  'clear-all-presets',
  'test-models',
  'run-chat-smoke-test',
  'save-settings',
  'update:apiUrl',
  'update:apiKey',
  'update:modelValue',
  'update:showApiKey',
  'update:presetName',
  'update:activePresetId',
])

const { t } = useI18n()

const modelOptionsSummary = computed(() => {
  const count = props.modelOptions.length
  if (props.modelsLoading) return t('正在拉取可用模型...', 'Fetching available models...')
  if (count > 0) return t(`已拉取 ${count} 个可用模型。`, `${count} available model(s) loaded.`)
  if (props.modelsError) return t('模型列表未拉取成功，可以手动填写模型名。', 'Model list failed. You can enter a model manually.')
  return t('填好 URL 和 Key 后可拉取可用模型，也可以直接填写模型名。', 'After URL and key are set, fetch models or enter a model manually.')
})

const endpointToneClass = computed(() => {
  if (!props.endpointGuidance?.visible) return 'network-state-neutral'
  if (props.endpointGuidance.tone === 'success') return 'network-state-good'
  if (props.endpointGuidance.tone === 'error') return 'network-state-bad'
  return 'network-state-warn'
})

const updateApiUrl = (event) => {
  emit('update:apiUrl', event.target.value)
}

const updateApiKey = (event) => {
  emit('update:apiKey', event.target.value)
}

const updateModelValue = (event) => {
  emit('update:modelValue', event.target.value)
}

const updatePresetName = (event) => {
  emit('update:presetName', event.target.value)
}

const updateActivePresetId = (event) => {
  emit('update:activePresetId', event.target.value)
}

const toggleApiKeyVisibility = () => {
  emit('update:showApiKey', !props.showApiKey)
}
</script>

<template>
  <section class="network-connection-panel bg-white rounded-xl p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-semibold text-blue-600">{{ t('连接设置', 'Connection setup') }}</p>
        <h2 class="mt-1 text-lg font-bold text-gray-900">
          {{ t(networkSetupCopy.titleZh, networkSetupCopy.titleEn) }}
        </h2>
        <p class="mt-1 text-xs text-gray-500">
          {{ t(networkSetupCopy.detailZh, networkSetupCopy.detailEn) }}
        </p>
      </div>
      <div class="shrink-0 text-right">
        <span
          class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
          data-testid="network-setup-progress"
          :class="
            networkSetupCopy.tone === 'success'
              ? 'bg-emerald-100 text-emerald-700'
              : networkSetupCopy.tone === 'info'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-amber-100 text-amber-700'
          "
        >
          {{ networkSetupState.completedSteps }}/{{ networkSetupState.totalSteps }}
        </span>
        <p class="mt-1 text-[10px] text-gray-400">{{ apiKindLabel || t('自动识别', 'Auto') }}</p>
      </div>
    </div>

    <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
      <div
        class="h-full rounded-full bg-blue-500 transition-all duration-300"
        :style="{ width: `${networkSetupState.progressPercent}%` }"
      ></div>
    </div>

    <div v-if="presets.length > 0" class="network-saved-row mt-4">
      <label class="text-xs text-gray-500" for="network-active-preset-select">
        {{ t('已保存配置', 'Saved configurations') }}
      </label>
      <select
        id="network-active-preset-select"
        :value="activePresetId"
        class="min-w-0 flex-1 border rounded-lg px-2 py-2 text-sm outline-none bg-white"
        data-testid="network-active-preset-select"
        @change="updateActivePresetId"
      >
        <option value="">{{ t('选择配置', 'Choose configuration') }}</option>
        <option v-for="preset in presets" :key="preset.id" :value="preset.id">
          {{ preset.name }} · {{ preset.model || t('未填模型', 'No model') }} ·
          {{ preset.key ? t('含 Key', 'Key saved') : t('无 Key', 'No key') }}
        </option>
      </select>
    </div>

    <div class="network-form-grid mt-4">
      <div class="network-field network-field-wide">
        <label class="text-xs text-gray-500" for="network-api-url-input">
          {{ t('API 接口 URL', 'API endpoint URL') }}
        </label>
        <input
          id="network-api-url-input"
          :value="apiUrl"
          type="text"
          class="mt-1 w-full border-b border-gray-200 py-2 outline-none text-sm font-mono text-gray-700"
          placeholder="https://api.openai.com/v1/chat/completions"
          data-testid="network-api-url-input"
          @input="updateApiUrl"
        />
      </div>

      <div class="network-field">
        <div class="mb-1 flex items-center justify-between gap-2">
          <label class="text-xs text-gray-500" for="network-api-key-input">API Key</label>
          <span v-if="!networkSetupState.keyRequired" class="text-[10px] font-medium text-emerald-600">
            {{ t('可留空', 'Optional') }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <input
            id="network-api-key-input"
            :value="apiKey"
            :type="showApiKey ? 'text' : 'password'"
            class="min-w-0 flex-1 border-b border-gray-200 py-2 outline-none text-sm font-mono"
            :placeholder="networkSetupState.keyRequired ? 'sk-...' : t('可留空，或填写网关 Key', 'Optional, or gateway key')"
            data-testid="network-api-key-input"
            @input="updateApiKey"
          />
          <button
            type="button"
            class="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
            data-testid="network-api-key-toggle"
            @click="toggleApiKeyVisibility"
          >
            {{ showApiKey ? t('隐藏', 'Hide') : t('显示', 'Show') }}
          </button>
        </div>
      </div>

      <div class="network-field">
        <label class="text-xs text-gray-500" for="network-manual-model-input">
          {{ t('模型', 'Model') }}
        </label>
        <div class="mt-1 flex items-center gap-2">
          <input
            id="network-manual-model-input"
            :value="modelValue"
            type="text"
            list="network-model-options"
            class="min-w-0 flex-1 border-b border-gray-200 py-2 outline-none text-sm font-mono"
            placeholder="gpt-4o-mini / gemini-2.5-flash"
            data-testid="network-manual-model-input"
            @input="updateModelValue"
          />
          <button
            type="button"
            class="network-small-action"
            :disabled="modelsLoading"
            data-testid="network-model-test-run"
            @click="emit('test-models')"
          >
            {{ modelsLoading ? t('拉取中', 'Loading') : t('拉取模型', 'Fetch') }}
          </button>
        </div>
        <datalist id="network-model-options" data-testid="network-model-select">
          <option v-for="model in modelOptions" :key="model" :value="model">{{ model }}</option>
        </datalist>
        <p class="mt-1 text-[10px] text-gray-400" data-testid="network-model-options-summary">
          {{ modelOptionsSummary }}
        </p>
      </div>
    </div>

    <div
      class="network-endpoint-strip mt-4"
      data-testid="network-endpoint-guidance"
      :class="endpointToneClass"
    >
      <div class="min-w-0">
        <p class="text-xs font-semibold">
          {{
            endpointGuidance.visible
              ? t(endpointGuidance.titleZh, endpointGuidance.titleEn)
              : t('等待 URL', 'Waiting for URL')
          }}
        </p>
        <p class="mt-1 text-[11px]">
          {{
            endpointGuidance.visible
              ? t(endpointGuidance.detailZh, endpointGuidance.detailEn)
              : t('输入 URL 后会自动识别接口类型和鉴权要求。', 'Enter a URL to detect transport type and auth requirement.')
          }}
        </p>
      </div>
      <span class="shrink-0 rounded-full bg-white/70 px-2 py-1 text-[10px] font-semibold">
        {{
          endpointGuidance.visible
            ? t(endpointGuidance.providerLabelZh, endpointGuidance.providerLabelEn)
            : t('自动识别', 'Auto')
        }}
      </span>
    </div>

    <details v-if="endpointGuidance.visible" class="network-inline-details mt-2">
      <summary>{{ t('查看 URL 检查项', 'Show URL checks') }}</summary>
      <div class="mt-2 space-y-1.5">
        <p
          v-for="item in endpointGuidance.checklist"
          :key="item.id"
          class="text-[11px]"
          :class="
            item.tone === 'success'
              ? 'text-emerald-700'
              : item.tone === 'error'
                ? 'text-red-700'
                : 'text-amber-700'
          "
        >
          {{ item.tone === 'success' ? 'OK' : '!' }}
          {{ t(item.textZh, item.textEn) }}
        </p>
        <p class="text-[11px] text-gray-700">
          {{ t(endpointGuidance.modelFallbackZh, endpointGuidance.modelFallbackEn) }}
        </p>
      </div>
    </details>

    <p v-if="modelsError" class="mt-3 text-xs text-red-500" data-testid="network-model-test-error">
      {{ modelsError }}
    </p>

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
    </div>

    <div class="network-action-row mt-4">
      <button
        type="button"
        class="network-test-button"
        :disabled="smokeTestLoading"
        data-testid="network-chat-smoke-run"
        @click="emit('run-chat-smoke-test')"
      >
        {{ smokeTestLoading ? t('测试中...', 'Testing...') : t('测试连接', 'Test connection') }}
      </button>
      <button
        type="button"
        class="network-save-button"
        data-testid="network-save-settings"
        :class="saved ? 'network-save-button-done' : ''"
        @click="emit('save-settings')"
      >
        {{ saved ? t('已保存', 'Saved') : t('保存当前设置', 'Save settings') }}
      </button>
    </div>

    <div
      v-if="smokeTestResult"
      class="network-result-strip network-state-good mt-3"
      data-testid="network-chat-smoke-success"
    >
      <p class="text-xs font-semibold">{{ t('连接可用', 'Connection works') }}</p>
      <p class="mt-1 text-[11px]">
        {{ t('返回预览', 'Reply preview') }}: {{ smokeTestResult.preview }}
      </p>
    </div>

    <div
      v-if="smokeTestError"
      class="network-result-strip network-state-bad mt-3"
      data-testid="network-chat-smoke-error"
    >
      <p class="text-xs font-semibold">{{ t('连接测试未通过', 'Connection test failed') }}</p>
      <p class="mt-1 text-[11px]">{{ smokeTestError }}</p>
      <p class="mt-1 text-[10px]">{{ t('已写入下方诊断报告。', 'Saved to diagnostics below.') }}</p>
    </div>

    <details class="network-save-reuse mt-4">
      <summary>
        <span>{{ t('保存为可复用配置', 'Save for reuse') }}</span>
        <span class="text-[10px] text-gray-400">
          {{ presets.length > 0 ? t(`${presets.length} 个配置`, `${presets.length} configuration(s)`) : t('可选', 'Optional') }}
        </span>
      </summary>

      <div class="mt-3 space-y-3">
        <div class="flex gap-2">
          <input
            :value="presetName"
            type="text"
            class="min-w-0 flex-1 border-b border-gray-200 py-2 outline-none text-sm"
            :placeholder="t('例如：主账号 / 本地网关', 'Example: Primary / Local Gateway')"
            data-testid="network-preset-name-input"
            @input="updatePresetName"
          />
          <button
            type="button"
            class="network-small-action"
            data-testid="network-preset-save"
            @click="emit('save-preset')"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>

        <div
          v-if="presetSaveGuidance.visible"
          class="rounded-xl border p-3"
          data-testid="network-preset-save-guidance"
          :class="
            presetSaveGuidance.tone === 'success'
              ? 'border-emerald-100 bg-emerald-50'
              : presetSaveGuidance.tone === 'error'
                ? 'border-red-100 bg-red-50'
                : 'border-amber-100 bg-amber-50'
          "
        >
          <p
            class="text-xs font-semibold"
            :class="
              presetSaveGuidance.tone === 'success'
                ? 'text-emerald-700'
                : presetSaveGuidance.tone === 'error'
                  ? 'text-red-700'
                  : 'text-amber-700'
            "
          >
            {{ t(presetSaveGuidance.titleZh, presetSaveGuidance.titleEn) }}
          </p>
          <p class="mt-1 text-[11px] text-gray-600">
            {{ t(presetSaveGuidance.detailZh, presetSaveGuidance.detailEn) }}
          </p>
        </div>

        <div v-if="presets.length > 0" class="flex gap-2">
          <button
            type="button"
            :disabled="!activePresetId"
            class="network-secondary-danger"
            data-testid="network-preset-remove-active"
            @click="emit('remove-active-preset')"
          >
            {{ t('删除当前配置', 'Delete current') }}
          </button>
          <button
            type="button"
            class="network-secondary-button"
            data-testid="network-preset-clear-all"
            @click="emit('clear-all-presets')"
          >
            {{ t('清空全部', 'Clear all') }}
          </button>
        </div>
      </div>
    </details>

    <p
      v-if="uiFeedbackMessage"
      class="mt-3 px-1 text-[11px]"
      :class="
        uiFeedbackType === 'error'
          ? 'text-red-600'
          : uiFeedbackType === 'warn'
            ? 'text-amber-600'
            : 'text-emerald-600'
      "
    >
      {{ uiFeedbackMessage }}
    </p>
  </section>
</template>

<style scoped>
.network-connection-panel {
  border: 1px solid var(--system-card-border);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.network-saved-row {
  display: grid;
  grid-template-columns: minmax(0, 96px) minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.network-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.network-field {
  min-width: 0;
}

.network-field-wide {
  grid-column: 1 / -1;
}

.network-small-action,
.network-test-button,
.network-save-button,
.network-secondary-button,
.network-secondary-danger {
  min-height: 36px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  transition: background-color 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out;
  -webkit-tap-highlight-color: transparent;
}

.network-small-action {
  flex: 0 0 auto;
  padding: 0 12px;
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.network-small-action:disabled {
  color: var(--system-text-soft);
  background: var(--system-surface-muted);
}

.network-endpoint-strip,
.network-result-strip {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--system-subtle-border);
  border-radius: 14px;
  padding: 10px 12px;
}

.network-state-neutral {
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
}

.network-state-good {
  color: var(--system-success);
  border-color: color-mix(in srgb, var(--system-success) 20%, transparent);
  background: var(--system-success-soft);
}

.network-state-warn {
  color: var(--system-warning);
  border-color: color-mix(in srgb, var(--system-warning) 24%, transparent);
  background: var(--system-warning-soft);
}

.network-state-bad {
  color: var(--system-danger);
  border-color: color-mix(in srgb, var(--system-danger) 20%, transparent);
  background: var(--system-danger-soft);
}

.network-inline-details,
.network-save-reuse {
  border-top: 1px solid var(--system-subtle-border);
  padding-top: 10px;
}

.network-inline-details summary,
.network-save-reuse summary {
  display: flex;
  min-height: 34px;
  cursor: pointer;
  list-style: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--system-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.network-inline-details summary::-webkit-details-marker,
.network-save-reuse summary::-webkit-details-marker {
  display: none;
}

.network-action-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 10px;
}

.network-test-button {
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.network-test-button:disabled {
  color: var(--system-text-soft);
  background: var(--system-surface-muted);
}

.network-save-button {
  color: var(--system-accent);
  border: 1px solid var(--system-control-border);
  background: var(--system-control-bg);
}

.network-save-button-done {
  color: var(--system-success);
  border-color: color-mix(in srgb, var(--system-success) 24%, transparent);
  background: var(--system-success-soft);
}

.network-secondary-button,
.network-secondary-danger {
  flex: 1 1 0;
  border: 1px solid var(--system-control-border);
  background: var(--system-control-bg);
}

.network-secondary-button {
  color: var(--system-text-muted);
}

.network-secondary-danger {
  color: var(--system-danger);
}

.network-secondary-danger:disabled {
  color: var(--system-text-soft);
  background: var(--system-surface-muted);
}

@media (min-width: 680px) {
  .network-form-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 420px) {
  .network-saved-row,
  .network-action-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .network-small-action,
  .network-test-button,
  .network-save-button,
  .network-secondary-button,
  .network-secondary-danger {
    transition: none;
  }
}
</style>
