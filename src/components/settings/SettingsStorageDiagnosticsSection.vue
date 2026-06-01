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
  simulationTickRunning: {
    type: Boolean,
    default: false,
  },
  simulationTickLastRunAt: {
    type: Number,
    default: 0,
  },
  simulationTickResultLabel: {
    type: String,
    default: '',
  },
  simulationEventLogs: {
    type: Array,
    default: () => [],
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
  'run-simulation-tick',
])

const { t } = useI18n()

const simulationEventStatusClass = (status) => {
  if (status === 'triggered') return 'bg-green-100 text-green-700'
  if (status === 'failed') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}
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

  <div class="bg-white rounded-2xl p-4 space-y-3" data-testid="settings-simulation-tick-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-semibold">{{ t('事件 Tick 诊断', 'Event Tick Diagnostics') }}</p>
        <p class="text-[10px] text-gray-500 mt-1">
          {{
            t(
              '手动运行一次安全事件 tick，用于验证 Surprise Mode、冷却和每日上限；不会开启后台自动触发。',
              'Manually runs one safe event tick to verify Surprise Mode, cooldowns, and daily caps; it does not enable background automation.',
            )
          }}
        </p>
        <p class="text-[10px] text-gray-400 mt-1">
          {{ t('上次运行', 'Last run') }}: {{ formatStorageAuditTime(simulationTickLastRunAt) }}
        </p>
      </div>
      <button
        class="px-3 py-2 rounded-lg border border-orange-200 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="settings-run-simulation-tick"
        :disabled="simulationTickRunning"
        @click="$emit('run-simulation-tick')"
      >
        {{ simulationTickRunning ? t('运行中...', 'Running...') : t('运行一次 Tick', 'Run one tick') }}
      </button>
    </div>
    <div class="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
      <p class="text-[11px] font-medium text-orange-800">
        {{ simulationTickResultLabel || t('尚未运行', 'Not run yet') }}
      </p>
      <p class="text-[10px] text-orange-600 mt-1">
        {{
          t(
            '当前允许安全的外卖 ETA / 骑手延迟 pilot，以及 Chat 角色主动联系候选；Shopping/物流随机事件仍保持关闭。',
            'Currently allows safe Food Delivery ETA / rider-delay pilots and Chat role greeting candidates; Shopping/logistics random events remain disabled.',
          )
        }}
      </p>
    </div>
  </div>

  <div class="bg-white rounded-2xl p-4 space-y-3" data-testid="settings-simulation-event-log-card">
    <div>
      <p class="text-sm font-semibold">{{ t('最近事件解释', 'Recent event explanations') }}</p>
      <p class="text-[10px] text-gray-500 mt-1">
        {{
          t(
            '只读展示最近事件日志，用于说明随机/条件事件为什么触发、跳过或失败；该面板不会修改任何模块数据。',
            'Readonly view of recent event logs, explaining why random or condition events triggered, skipped, or failed; this panel never mutates module data.',
          )
        }}
      </p>
    </div>

    <div v-if="simulationEventLogs.length" class="space-y-2">
      <div
        v-for="item in simulationEventLogs"
        :key="item.id"
        class="rounded-xl border border-gray-200 bg-gray-50 p-3"
        data-testid="settings-simulation-event-log-item"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-[12px] font-semibold text-gray-800 truncate">{{ item.eventLabel }}</p>
            <p class="text-[10px] text-gray-500 mt-1">
              {{ item.moduleLabel }} · {{ item.triggerSourceLabel }} · {{ formatStorageAuditTime(item.at) }}
            </p>
          </div>
          <span
            class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            :class="simulationEventStatusClass(item.status)"
          >
            {{ item.statusLabel }}
          </span>
        </div>

        <p class="text-[11px] text-gray-700 mt-2">
          {{ t('原因', 'Reason') }}: {{ item.reasonLabel }}
        </p>
        <p class="text-[10px] text-gray-500 mt-1">
          {{ t('目标', 'Target') }}: {{ item.targetLabel }}
        </p>
        <p v-if="item.variantLabel" class="text-[10px] text-gray-500 mt-1">
          {{ t('世界观变体', 'World variant') }}: {{ item.variantLabel }}
        </p>
        <p class="text-[10px] text-gray-400 mt-1 break-all">
          {{ item.technicalSummary }}
        </p>
      </div>
    </div>

    <div v-else class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3">
      <p class="text-[11px] text-gray-500">
        {{
          t(
            '暂无事件日志。可以先运行一次 Event Tick Diagnostics，或等待后续安全事件写入。',
            'No event logs yet. Run Event Tick Diagnostics once, or wait for future safe events to write logs.',
          )
        }}
      </p>
    </div>
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
        class="px-3 py-2 rounded-lg border border-gray-200 text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="storageAuditRunning || storageRepairRunning"
        @click="$emit('run-storage-audit')"
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
      class="w-full py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
      @click="$emit('clear-storage-reports')"
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
      class="w-full py-2 rounded-lg text-xs font-semibold transition border disabled:opacity-50 disabled:cursor-not-allowed"
      :class="storageRepairRunning ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'"
      :disabled="storageRepairRunning || storageAuditRunning"
      @click="$emit('repair-storage-drift')"
    >
      {{ storageRepairRunning ? t('修复中...', 'Repairing...') : t('修复存储不同步', 'Repair storage drift') }}
    </button>

    <div class="grid grid-cols-2 gap-2">
      <button
        class="w-full py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
        @click="$emit('open-network-reports')"
      >
        {{ t('查看全部报告', 'View all reports') }}
      </button>
      <button
        class="w-full py-2 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-50"
        @click="$emit('open-network-storage-errors')"
      >
        {{ t('仅看错误', 'Errors only') }}
      </button>
    </div>
  </div>
</template>
