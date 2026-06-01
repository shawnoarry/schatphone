<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  aiAutomation: {
    type: Object,
    required: true,
  },
  automationRuntimePolicy: {
    type: Object,
    required: true,
  },
  simulationSettings: {
    type: Object,
    required: true,
  },
  simulationForegroundTickIntervalMinutes: {
    type: Number,
    required: true,
  },
  simulationForegroundTickRuntimeLabel: {
    type: String,
    required: true,
  },
  automationSaved: {
    type: Boolean,
    default: false,
  },
})

defineEmits([
  'open-chat-automation',
  'open-network-reports',
  'save-automation-settings',
  'update-simulation-foreground-tick-enabled',
  'update-simulation-foreground-tick-interval-minutes',
  'update-automation-field',
  'update-module-enabled',
  'update-module-priority',
])

const { t } = useI18n()
</script>

<template>
  <div class="bg-white rounded-2xl p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold">{{ t('全局自主调用总开关', 'Global autonomous switch') }}</p>
        <p class="text-[10px] text-gray-400">
          {{ t('关闭后所有模块与会话的自主调用都失效。', 'When off, all autonomous calls in modules and chats are disabled.') }}
        </p>
      </div>
      <input
        :checked="aiAutomation.masterEnabled"
        type="checkbox"
        class="w-5 h-5"
        @change="$emit('update-automation-field', 'masterEnabled', $event.target.checked)"
      />
    </div>
  </div>

  <div class="bg-white rounded-2xl p-4 space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-semibold">
          {{ t('事件前台 Tick / Foreground event tick', 'Foreground event tick / 事件前台 Tick') }}
        </p>
        <p class="text-[10px] leading-4 text-gray-400">
          {{
            t(
              '用户使用 App 且手机未锁定时，低频检查安全事件，包括外卖安全事件和角色主动联系候选 / Role proactive contact candidate；此页只开启自动检查，不会立刻触发事件。',
              'While the app is open and unlocked, low-frequency safe checks can include Food Delivery safety events and Role proactive contact candidate / 角色主动联系候选; this page enables automatic checks but does not trigger an event immediately.',
            )
          }}
        </p>
      </div>
      <input
        :checked="simulationSettings.foregroundSessionTickEnabled"
        type="checkbox"
        class="w-5 h-5"
        data-testid="settings-simulation-foreground-tick-enabled"
        @change="$emit('update-simulation-foreground-tick-enabled', $event.target.checked)"
      />
    </div>
    <label class="flex items-center justify-between gap-2">
      <span class="text-xs text-gray-500">{{ t('检查间隔（分钟）', 'Interval (minutes)') }}</span>
      <input
        :value="simulationForegroundTickIntervalMinutes"
        type="number"
        min="1"
        max="120"
        class="w-24 border rounded px-2 py-1 text-xs text-right"
        data-testid="settings-simulation-foreground-tick-interval"
        @input="$emit('update-simulation-foreground-tick-interval-minutes', Number($event.target.value))"
      />
    </label>
    <p class="text-[11px] text-gray-500" data-testid="settings-simulation-foreground-tick-runtime">
      {{ simulationForegroundTickRuntimeLabel }}
    </p>
  </div>

  <div class="bg-white rounded-2xl p-4 space-y-3">
    <p class="text-sm font-semibold">{{ t('模块级开关与优先级', 'Module switches and priorities') }}</p>
    <div class="grid grid-cols-[1fr,70px,70px] gap-2 items-center">
      <p class="text-xs text-gray-500">{{ t('模块', 'Module') }}</p>
      <p class="text-xs text-gray-500 text-center">{{ t('开启', 'Enable') }}</p>
      <p class="text-xs text-gray-500 text-center">{{ t('优先级', 'Priority') }}</p>

      <p class="text-sm">{{ t('聊天（Chat）', 'Chat') }}</p>
      <div class="text-center">
        <input
          :checked="aiAutomation.modules.chat.enabled"
          type="checkbox"
          class="w-4 h-4"
          @change="$emit('update-module-enabled', 'chat', $event.target.checked)"
        />
      </div>
      <input
        :value="aiAutomation.modules.chat.priority"
        type="number"
        min="1"
        max="1000"
        class="border rounded px-2 py-1 text-xs text-right"
        @input="$emit('update-module-priority', 'chat', Number($event.target.value))"
      />

      <p class="text-sm">{{ t('地图（Map，预留）', 'Map (Reserved)') }}</p>
      <div class="text-center">
        <input
          :checked="aiAutomation.modules.map.enabled"
          type="checkbox"
          class="w-4 h-4"
          @change="$emit('update-module-enabled', 'map', $event.target.checked)"
        />
      </div>
      <input
        :value="aiAutomation.modules.map.priority"
        type="number"
        min="1"
        max="1000"
        class="border rounded px-2 py-1 text-xs text-right"
        @input="$emit('update-module-priority', 'map', Number($event.target.value))"
      />

      <p class="text-sm">{{ t('购物（预留）', 'Shopping (Reserved)') }}</p>
      <div class="text-center">
        <input
          :checked="aiAutomation.modules.shopping.enabled"
          type="checkbox"
          class="w-4 h-4"
          @change="$emit('update-module-enabled', 'shopping', $event.target.checked)"
        />
      </div>
      <input
        :value="aiAutomation.modules.shopping.priority"
        type="number"
        min="1"
        max="1000"
        class="border rounded px-2 py-1 text-xs text-right"
        @input="$emit('update-module-priority', 'shopping', Number($event.target.value))"
      />
    </div>
  </div>

  <div class="bg-white rounded-2xl p-4 space-y-3">
    <p class="text-sm font-semibold">{{ t('执行模式与安静时段', 'Execution mode and quiet hours') }}</p>
    <label class="flex items-center justify-between gap-2">
      <span class="text-xs text-gray-500">{{ t('仅通知模式（不自动生成回复）', 'Notify-only mode (no auto reply generation)') }}</span>
      <input
        :checked="aiAutomation.notifyOnlyMode"
        type="checkbox"
        class="w-4 h-4"
        @change="$emit('update-automation-field', 'notifyOnlyMode', $event.target.checked)"
      />
    </label>
    <label class="flex items-center justify-between gap-2">
      <span class="text-xs text-gray-500">{{ t('启用安静时段（自动转为仅通知）', 'Enable quiet hours (force notify-only)') }}</span>
      <input
        :checked="aiAutomation.quietHoursEnabled"
        type="checkbox"
        class="w-4 h-4"
        @change="$emit('update-automation-field', 'quietHoursEnabled', $event.target.checked)"
      />
    </label>
    <div v-if="aiAutomation.quietHoursEnabled" class="grid grid-cols-2 gap-2">
      <label class="flex flex-col gap-1">
        <span class="text-[11px] text-gray-500">{{ t('开始', 'Start') }}</span>
        <input
          :value="aiAutomation.quietHoursStart"
          type="time"
          class="border rounded px-2 py-1.5 text-xs"
          @input="$emit('update-automation-field', 'quietHoursStart', $event.target.value)"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-[11px] text-gray-500">{{ t('结束', 'End') }}</span>
        <input
          :value="aiAutomation.quietHoursEnd"
          type="time"
          class="border rounded px-2 py-1.5 text-xs"
          @input="$emit('update-automation-field', 'quietHoursEnd', $event.target.value)"
        />
      </label>
    </div>
    <p class="text-[11px] text-gray-500">
      {{ t('当前运行态：', 'Current runtime mode:') }}
      {{
        automationRuntimePolicy.notifyOnly
          ? automationRuntimePolicy.quietHoursActive
            ? t('安静时段仅通知', 'Quiet-hours notify-only')
            : t('全局仅通知', 'Global notify-only')
          : t('允许自动调用', 'Autonomous invoke enabled')
      }}
    </p>
  </div>

  <div class="bg-white rounded-2xl p-4 space-y-3">
    <p class="text-sm font-semibold">{{ t('冲突与防重复策略', 'Conflict and dedupe policy') }}</p>
    <label class="flex items-center justify-between gap-2">
      <span class="text-xs text-gray-500">{{ t('手动触发后冷却秒数', 'Cooldown after manual trigger (sec)') }}</span>
      <input
        :value="aiAutomation.conflictCooldownSec"
        type="number"
        min="10"
        max="600"
        class="w-24 border rounded px-2 py-1 text-xs text-right"
        @input="$emit('update-automation-field', 'conflictCooldownSec', Number($event.target.value))"
      />
    </label>
    <label class="flex items-center justify-between gap-2">
      <span class="text-xs text-gray-500">{{ t('重复上下文抑制秒数', 'Dedupe window (sec)') }}</span>
      <input
        :value="aiAutomation.dedupeWindowSec"
        type="number"
        min="10"
        max="1800"
        class="w-24 border rounded px-2 py-1 text-xs text-right"
        @input="$emit('update-automation-field', 'dedupeWindowSec', Number($event.target.value))"
      />
    </label>
  </div>

  <div class="bg-white rounded-2xl p-4">
    <p class="text-xs text-gray-500">
      {{ t('每个角色的自主调用间隔（如 360 秒/720 秒）在对应 Chat 会话菜单中设置。', 'Per-role autonomous interval (e.g. 360s/720s) is configured in each Chat thread menu.') }}
    </p>
    <button @click="$emit('open-chat-automation')" class="mt-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
      {{ t('前往会话设置', 'Go to chat settings') }}
    </button>
  </div>

  <div class="bg-white rounded-2xl p-4 space-y-2">
    <p class="text-xs text-gray-500">
      {{
        t(
          '手动触发始终优先；若与定时自主调用接近重叠，系统会自动顺延本轮自主调用，避免重复回复。',
          'Manual triggers always take priority. If near overlap happens with timed auto invoke, this cycle is deferred to avoid duplicate replies.',
        )
      }}
    </p>
    <p class="text-xs text-gray-500">
      {{
        t(
          '调用失败与中断记录可在 Network 的诊断报告中心查看。',
          'Failure and cancellation logs are available in Network diagnostics center.',
        )
      }}
    </p>
    <button @click="$emit('open-network-reports')" class="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
      {{ t('前往诊断记录', 'Go to diagnostics') }}
    </button>
  </div>

  <button
    class="w-full py-3 rounded-xl text-sm font-semibold transition"
    :class="automationSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
    @click="$emit('save-automation-settings')"
  >
    {{ automationSaved ? t('已保存', 'Saved') : t('保存自动响应设置', 'Save automation settings') }}
  </button>
</template>
