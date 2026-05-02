<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  persistenceCapabilities: {
    type: Object,
    required: true,
  },
  storageAuditRunning: {
    type: Boolean,
    default: false,
  },
  storageRepairRunning: {
    type: Boolean,
    default: false,
  },
  storageAuditAt: {
    type: Number,
    default: 0,
  },
  storageAuditFeedbackType: {
    type: String,
    default: '',
  },
  storageAuditFeedbackMessage: {
    type: String,
    default: '',
  },
  latestStorageReport: {
    type: Object,
    default: null,
  },
  storageReportErrorCount: {
    type: Number,
    default: 0,
  },
  storageAuditResults: {
    type: Array,
    default: () => [],
  },
  persistenceCapabilityLabel: {
    type: Function,
    required: true,
  },
  formatStorageAuditTime: {
    type: Function,
    required: true,
  },
  formatStorageReportTime: {
    type: Function,
    required: true,
  },
  storageReportReasonLabel: {
    type: Function,
    required: true,
  },
  storageAuditStatusClass: {
    type: Function,
    required: true,
  },
  storageAuditStatusLabel: {
    type: Function,
    required: true,
  },
  storageLayerLabel: {
    type: Function,
    required: true,
  },
  storageAuditSourceLabel: {
    type: Function,
    required: true,
  },
})

defineEmits([
  'clear-storage-reports',
  'open-network-reports',
  'open-network-storage-errors',
  'repair-storage-drift',
  'run-storage-audit',
])

const { t } = useI18n()
</script>

<template>
  <div class="bg-white rounded-2xl p-4">
    <p class="text-sm font-semibold">{{ t('本地存储能力', 'Local Storage Capability') }}</p>
    <p class="text-xs text-gray-500 mt-1">
      localStorage: {{ persistenceCapabilityLabel(persistenceCapabilities.localStorageAvailable) }}
    </p>
    <p class="text-xs text-gray-500 mt-1">
      IndexedDB: {{ persistenceCapabilityLabel(persistenceCapabilities.indexedDbAvailable) }}
    </p>
    <p class="text-xs text-gray-500 mt-1">
      {{ t('镜像模式', 'Mirror mode') }}: {{ persistenceCapabilityLabel(persistenceCapabilities.indexedDbMirrorEnabled) }}
    </p>
    <p class="text-[10px] text-gray-400 mt-2">
      {{ t('命名空间', 'Namespace') }}: {{ persistenceCapabilities.namespace }} ·
      DB: {{ persistenceCapabilities.indexedDbDatabaseName }} ·
      Store: {{ persistenceCapabilities.indexedDbStoreName }}
    </p>
  </div>

  <div class="bg-white rounded-2xl p-4 space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-semibold">{{ t('存储一致性检查', 'Storage Consistency Check') }}</p>
        <p class="text-[10px] text-gray-500 mt-1">
          {{
            t(
              '检查 localStorage 与 IndexedDB 镜像是否一致，并可一键修复不同步。',
              'Checks whether localStorage and IndexedDB mirror stay aligned, with one-click repair for drift.',
            )
          }}
        </p>
        <p class="text-[10px] text-gray-400 mt-1">
          {{ t('最后检查', 'Last check') }}: {{ formatStorageAuditTime(storageAuditAt) }}
        </p>
      </div>
      <button
        @click="$emit('run-storage-audit')"
        class="px-3 py-2 rounded-lg border border-gray-200 text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="storageAuditRunning || storageRepairRunning"
      >
        {{ storageAuditRunning ? t('检查中...', 'Checking...') : t('运行检查', 'Run check') }}
      </button>
    </div>

    <p
      v-if="storageAuditFeedbackMessage"
      class="text-[11px]"
      :class="storageAuditFeedbackType === 'success' ? 'text-green-600' : storageAuditFeedbackType === 'warn' ? 'text-amber-600' : 'text-gray-500'"
    >
      {{ storageAuditFeedbackMessage }}
    </p>

    <div class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
      <p class="text-[11px] text-gray-700">
        {{ t('最近存储报告', 'Latest storage report') }}:
        {{ storageReportReasonLabel(latestStorageReport) }}
      </p>
      <p class="text-[10px] text-gray-500 mt-1">
        {{ t('记录时间', 'Recorded at') }}:
        {{ formatStorageReportTime(latestStorageReport?.createdAt) }}
        ·
        {{ t('错误数', 'Errors') }}: {{ storageReportErrorCount }}
      </p>
    </div>

    <button
      @click="$emit('clear-storage-reports')"
      class="w-full py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
    >
      {{ t('清理存储报告', 'Clear storage reports') }}
    </button>

    <div v-if="storageAuditResults.length" class="space-y-2">
      <div
        v-for="item in storageAuditResults"
        :key="item.key"
        class="rounded-xl border border-gray-200 p-3"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium">{{ t(item.labelZh, item.labelEn) }}</p>
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-medium"
            :class="storageAuditStatusClass(item)"
          >
            {{ storageAuditStatusLabel(item) }}
          </span>
        </div>
        <p class="text-[10px] text-gray-500 mt-1">
          localStorage: {{ storageLayerLabel(item.local, t('缺失', 'Missing')) }} ·
          IndexedDB:
          {{
            item.mirrorApplicable
              ? storageLayerLabel(item.indexeddb, t('缺失', 'Missing'))
              : t('未启用', 'Disabled')
          }}
        </p>
        <p class="text-[10px] text-gray-400 mt-1">
          {{ t('建议修复来源', 'Recommended repair source') }}:
          {{ storageAuditSourceLabel(item.recommendedSource) }}
        </p>
      </div>
    </div>

    <button
      @click="$emit('repair-storage-drift')"
      class="w-full py-2 rounded-lg text-xs font-semibold transition border disabled:opacity-50 disabled:cursor-not-allowed"
      :class="storageRepairRunning ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'"
      :disabled="storageRepairRunning || storageAuditRunning"
    >
      {{ storageRepairRunning ? t('修复中...', 'Repairing...') : t('修复存储不同步', 'Repair storage drift') }}
    </button>

    <div class="grid grid-cols-2 gap-2">
      <button
        @click="$emit('open-network-reports')"
        class="w-full py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
      >
        {{ t('查看全部报告', 'View all reports') }}
      </button>
      <button
        @click="$emit('open-network-storage-errors')"
        class="w-full py-2 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-50"
      >
        {{ t('仅看错误', 'Errors only') }}
      </button>
    </div>
  </div>
</template>
