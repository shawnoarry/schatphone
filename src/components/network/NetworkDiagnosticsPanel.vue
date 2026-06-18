<script setup>
import { useI18n } from '../../composables/useI18n'
import { createNetworkReportLabels } from '../../lib/network-report-labels'

defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
  reportSummary: {
    type: Object,
    required: true,
  },
  networkReports: {
    type: Array,
    default: () => [],
  },
  reportModuleOptions: {
    type: Array,
    default: () => [],
  },
  reportLevelOptions: {
    type: Array,
    default: () => [],
  },
  reportModuleFilter: {
    type: String,
    default: 'all',
  },
  reportLevelFilter: {
    type: String,
    default: 'all',
  },
  copiedReportId: {
    type: String,
    default: '',
  },
  formatReportTime: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'clear-reports',
  'copy-report',
  'open-storage-diagnostics',
  'open-push-settings',
  'update:reportModuleFilter',
  'update:reportLevelFilter',
])

const { t } = useI18n()
const {
  moduleLabel,
  actionLabel,
  reportReasonLabel,
  reportSuggestionLabel,
} = createNetworkReportLabels(t)

const updateModuleFilter = (event) => {
  emit('update:reportModuleFilter', event.target.value)
}

const updateLevelFilter = (event) => {
  emit('update:reportLevelFilter', event.target.value)
}
</script>

<template>
  <div :class="embedded ? 'network-diagnostics-embedded' : 'bg-white rounded-xl p-4'">
    <div class="flex items-center justify-between mb-2">
      <p class="text-xs text-gray-500">{{ t('诊断报告中心（API/推送/存储）', 'Diagnostics Center (API/Push/Storage)') }}</p>
      <button
        @click="emit('clear-reports')"
        class="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
        data-testid="network-report-clear"
      >
        {{ t('清空', 'Clear') }}
      </button>
    </div>

    <div class="grid grid-cols-3 gap-2 mb-3">
      <div class="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
        <p class="text-[10px] text-gray-500">{{ t('总记录', 'Total') }}</p>
        <p class="text-sm font-semibold text-gray-800">{{ reportSummary.total }}</p>
      </div>
      <div class="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2">
        <p class="text-[10px] text-red-500">{{ t('错误', 'Error') }}</p>
        <p class="text-sm font-semibold text-red-700">{{ reportSummary.errorCount }}</p>
      </div>
      <div class="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2">
        <p class="text-[10px] text-blue-500">{{ t('信息', 'Info') }}</p>
        <p class="text-sm font-semibold text-blue-700">{{ reportSummary.infoCount }}</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2 mb-2">
      <select
        :value="reportModuleFilter"
        class="border rounded-md px-2 py-1 text-xs bg-white outline-none"
        data-testid="network-report-module-filter"
        @change="updateModuleFilter"
      >
        <option v-for="item in reportModuleOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
      <select
        :value="reportLevelFilter"
        class="border rounded-md px-2 py-1 text-xs bg-white outline-none"
        data-testid="network-report-level-filter"
        @change="updateLevelFilter"
      >
        <option v-for="item in reportLevelOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </div>

    <p v-if="networkReports.length === 0" class="text-xs text-gray-400">
      {{ t('暂无匹配记录。', 'No matching records.') }}
    </p>

    <div v-else class="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
      <div
        v-for="item in networkReports"
        :key="item.id"
        class="rounded-lg border border-gray-200 p-2"
        data-testid="network-diagnostic-report"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-semibold text-gray-700">
            {{ moduleLabel(item.module) }} · {{ actionLabel(item.action) }}
          </p>
          <p class="text-[10px] text-gray-400">{{ formatReportTime(item.createdAt) }}</p>
        </div>

        <div class="mt-1 flex items-center gap-1.5">
          <span
            class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold"
            :class="item.level === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
          >
            {{ item.level === 'error' ? t('错误', 'Error') : t('信息', 'Info') }}
          </span>
          <span class="inline-flex rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px]">
            {{ t('状态码', 'Status') }}: {{ item.statusCode || '-' }}
          </span>
          <span class="inline-flex rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px]">
            Code: {{ item.code || '-' }}
          </span>
        </div>

        <p class="text-[11px] text-gray-600 mt-1 line-clamp-2">
          {{ item.message || t('未知错误', 'Unknown error') }}
        </p>
        <p class="text-[11px] text-gray-700 mt-1">
          {{ t('问题类型', 'Issue type') }}: {{ reportReasonLabel(item) }}
        </p>
        <p class="text-[11px] text-blue-700 mt-1">
          {{ t('建议处理', 'Suggested fix') }}: {{ reportSuggestionLabel(item) }}
        </p>
        <p class="text-[10px] text-gray-400 mt-1">
          {{ t('模型', 'Model') }}: {{ item.model || '-' }} ·
          {{ t('供应商', 'Provider') }}: {{ item.provider || '-' }}
        </p>
        <div class="mt-2 flex justify-end gap-2">
          <button
            v-if="item.module === 'storage'"
            @click="emit('open-storage-diagnostics')"
            class="text-[11px] px-2 py-1 rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            {{ t('前往修复', 'Go to repair') }}
          </button>
          <button
            v-if="item.module === 'push'"
            @click="emit('open-push-settings')"
            class="text-[11px] px-2 py-1 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            {{ t('前往推送设置', 'Go to push settings') }}
          </button>
          <button
            @click="emit('copy-report', item)"
            class="text-[11px] px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            {{ copiedReportId === item.id ? t('已复制', 'Copied') : t('复制报告', 'Copy report') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
