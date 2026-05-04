<script setup>
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
  providerTemplates: {
    type: Array,
    default: () => [],
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
  apiUrl: {
    type: String,
    default: '',
  },
  apiKey: {
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
})

const emit = defineEmits([
  'apply-template',
  'save-preset',
  'remove-active-preset',
  'clear-all-presets',
  'update:apiUrl',
  'update:apiKey',
  'update:showApiKey',
  'update:presetName',
  'update:activePresetId',
])

const { t } = useI18n()

const updateApiUrl = (event) => {
  emit('update:apiUrl', event.target.value)
}

const updateApiKey = (event) => {
  emit('update:apiKey', event.target.value)
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
  <div class="bg-white rounded-xl p-4 space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-semibold text-blue-600">{{ t('配置向导', 'Setup guide') }}</p>
        <h2 class="mt-1 text-lg font-bold text-gray-900">
          {{ t(networkSetupCopy.titleZh, networkSetupCopy.titleEn) }}
        </h2>
        <p class="mt-1 text-xs text-gray-500">
          {{ t(networkSetupCopy.detailZh, networkSetupCopy.detailEn) }}
        </p>
      </div>
      <span
        class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
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
    </div>
    <div class="h-2 overflow-hidden rounded-full bg-gray-100">
      <div
        class="h-full rounded-full bg-blue-500 transition-all duration-300"
        :style="{ width: `${networkSetupState.progressPercent}%` }"
      ></div>
    </div>
    <div class="grid grid-cols-3 gap-2 text-[11px]">
      <div class="rounded-lg border px-2 py-1.5" :class="networkSetupState.hasUrl ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'">
        {{ t('接口地址', 'Endpoint') }}
      </div>
      <div class="rounded-lg border px-2 py-1.5" :class="networkSetupState.hasKey ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'">
        API Key
      </div>
      <div class="rounded-lg border px-2 py-1.5" :class="networkSetupState.hasModel ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'">
        {{ t('模型', 'Model') }}
      </div>
    </div>
    <div class="grid grid-cols-1 gap-2">
      <button
        v-for="template in providerTemplates"
        :key="template.id"
        type="button"
        class="rounded-xl border border-gray-200 px-3 py-2 text-left hover:bg-gray-50 transition"
        :data-testid="`network-provider-template-${template.id}`"
        @click="emit('apply-template', template.id)"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-semibold text-gray-800">{{ t(template.nameZh, template.nameEn) }}</span>
          <span class="text-[10px] text-gray-400">{{ template.model }}</span>
        </div>
        <p class="mt-1 truncate font-mono text-[10px] text-gray-500">{{ template.url }}</p>
        <p class="mt-1 text-[10px] text-gray-400">{{ t('Key 格式', 'Key format') }}: {{ template.keyHint }}</p>
      </button>
    </div>
  </div>

  <div class="bg-white rounded-xl p-4">
    <label class="text-xs text-gray-500 block mb-1">{{ t('API 接口 URL', 'API Endpoint URL') }}</label>
    <input
      :value="apiUrl"
      type="text"
      class="w-full border-b border-gray-200 py-1 outline-none text-sm font-mono text-gray-700"
      placeholder="https://api.openai.com/v1/chat/completions"
      data-testid="network-api-url-input"
      @input="updateApiUrl"
    />
    <p class="text-[10px] text-gray-400 mt-2">{{ t('输入 URL 后会自动识别类型，并尝试拉取模型列表。', 'The type will be auto-detected after URL input, then model list will be fetched.') }}</p>

    <div
      v-if="endpointGuidance.visible"
      class="mt-3 rounded-xl border p-3"
      data-testid="network-endpoint-guidance"
      :class="
        endpointGuidance.tone === 'success'
          ? 'border-emerald-100 bg-emerald-50'
          : endpointGuidance.tone === 'error'
            ? 'border-red-100 bg-red-50'
            : 'border-amber-100 bg-amber-50'
      "
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p
            class="text-xs font-semibold"
            :class="
              endpointGuidance.tone === 'success'
                ? 'text-emerald-700'
                : endpointGuidance.tone === 'error'
                  ? 'text-red-700'
                  : 'text-amber-700'
            "
          >
            {{ t(endpointGuidance.titleZh, endpointGuidance.titleEn) }}
          </p>
          <p class="mt-1 text-[11px] text-gray-600">
            {{ t(endpointGuidance.detailZh, endpointGuidance.detailEn) }}
          </p>
        </div>
        <span class="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-gray-600">
          {{ t(endpointGuidance.providerLabelZh, endpointGuidance.providerLabelEn) }}
        </span>
      </div>

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
      </div>

      <p class="mt-2 text-[11px] text-gray-700">
        {{ t(endpointGuidance.modelFallbackZh, endpointGuidance.modelFallbackEn) }}
      </p>
    </div>
  </div>

  <div class="bg-white rounded-xl p-4">
    <label class="text-xs text-gray-500 block mb-1">API Key</label>
    <div class="flex items-center gap-2">
      <input
        :value="apiKey"
        :type="showApiKey ? 'text' : 'password'"
        class="flex-1 border-b border-gray-200 py-1 outline-none text-sm font-mono"
        placeholder="sk-..."
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

  <div class="bg-white rounded-xl p-4">
    <label class="text-xs text-gray-500 block mb-2">{{ t('保存为预设', 'Save as preset') }}</label>
    <div class="flex gap-2">
      <input
        :value="presetName"
        type="text"
        class="flex-1 border-b border-gray-200 py-1 outline-none text-sm"
        :placeholder="t('例如：主账号 / 测试网关', 'Example: Primary / Test Gateway')"
        data-testid="network-preset-name-input"
        @input="updatePresetName"
      />
      <button
        type="button"
        class="px-3 py-1.5 rounded-md bg-blue-500 text-white text-xs hover:bg-blue-600 transition"
        data-testid="network-preset-save"
        @click="emit('save-preset')"
      >
        {{ t('保存', 'Save') }}
      </button>
    </div>

    <div
      v-if="presetSaveGuidance.visible"
      class="mt-3 rounded-xl border p-3"
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

      <div class="mt-2 space-y-1.5">
        <p
          v-for="item in presetSaveGuidance.blocking"
          :key="item.id"
          class="text-[11px] text-red-700"
        >
          ! {{ t(item.textZh, item.textEn) }}
        </p>
        <p
          v-for="item in presetSaveGuidance.warnings"
          :key="item.id"
          class="text-[11px] text-amber-700"
        >
          ! {{ t(item.textZh, item.textEn) }}
        </p>
        <p
          v-for="item in presetSaveGuidance.confirmations"
          :key="item.id"
          class="text-[11px] text-emerald-700"
        >
          OK {{ t(item.textZh, item.textEn) }}
        </p>
      </div>
    </div>
  </div>

  <p
    v-if="uiFeedbackMessage"
    class="px-1 text-[11px]"
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

  <div class="bg-white rounded-xl p-4" v-if="presets.length > 0">
    <label class="text-xs text-gray-500 block mb-1">{{ t('已存预设', 'Saved presets') }}</label>
    <select
      :value="activePresetId"
      class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white"
      data-testid="network-active-preset-select"
      @change="updateActivePresetId"
    >
      <option value="">{{ t('请选择预设', 'Select a preset') }}</option>
      <option v-for="preset in presets" :key="preset.id" :value="preset.id">
        {{ preset.name }}
      </option>
    </select>
    <div class="flex gap-2 mt-2">
      <button
        type="button"
        :disabled="!activePresetId"
        class="flex-1 px-3 py-1.5 rounded-md text-xs transition"
        data-testid="network-preset-remove-active"
        :class="
          activePresetId
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        "
        @click="emit('remove-active-preset')"
      >
        {{ t('删除当前预设', 'Delete current preset') }}
      </button>
      <button
        type="button"
        :disabled="presets.length === 0"
        class="flex-1 px-3 py-1.5 rounded-md text-xs transition"
        data-testid="network-preset-clear-all"
        :class="
          presets.length > 0
            ? 'bg-gray-800 text-white hover:bg-black'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        "
        @click="emit('clear-all-presets')"
      >
        {{ t('清空全部预设', 'Clear all presets') }}
      </button>
    </div>
  </div>
</template>
