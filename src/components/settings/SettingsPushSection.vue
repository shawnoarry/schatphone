<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  settings: {
    type: Object,
    required: true,
  },
  webPushSupported: {
    type: Boolean,
    default: false,
  },
  pushPermissionLabel: {
    type: String,
    default: '',
  },
  pushSubscriptionLabel: {
    type: String,
    default: '',
  },
  pushServerHealthLabel: {
    type: String,
    default: '',
  },
  pushCapabilityHint: {
    type: String,
    default: '',
  },
  pushDisplayModeHint: {
    type: String,
    default: '',
  },
  normalizedPushServerUrl: {
    type: String,
    default: '',
  },
  pushLastHealthCheckAt: {
    type: Number,
    default: 0,
  },
  pushServerHealthState: {
    type: String,
    default: 'idle',
  },
  pushServerHealthMessage: {
    type: String,
    default: '',
  },
  pushFeedbackType: {
    type: String,
    default: '',
  },
  pushFeedbackMessage: {
    type: String,
    default: '',
  },
  pushActionRunning: {
    type: Boolean,
    default: false,
  },
  pushHealthRunning: {
    type: Boolean,
    default: false,
  },
  notificationSaved: {
    type: Boolean,
    default: false,
  },
  formatStorageReportTime: {
    type: Function,
    required: true,
  },
})

defineEmits([
  'check-push-server-health',
  'resync-real-push',
  'save-notification-settings',
  'send-real-push-test',
  'subscribe-real-push',
  'unsubscribe-real-push',
  'update-notifications',
  'update-push-display-mode',
  'update-push-server-url',
  'update-real-push-enabled',
])

const { t } = useI18n()
</script>

<template>
  <div class="bg-white rounded-2xl p-4 flex items-center justify-between">
    <div>
      <p class="text-sm">{{ t('消息通知', 'Message notifications') }}</p>
      <p class="text-[10px] text-gray-400">{{ t('用于聊天消息与系统提醒', 'Used for chat messages and system alerts') }}</p>
    </div>
    <input
      :checked="settings.system.notifications"
      type="checkbox"
      class="w-5 h-5"
      @change="$emit('update-notifications', $event.target.checked)"
    />
  </div>

  <div class="bg-white rounded-2xl p-4 space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-sm font-semibold">{{ t('真推送', 'Real Push') }}</p>
        <p class="text-[10px] text-gray-500">
          {{
            t(
              '让项目通知进入手机系统通知层。需要 HTTPS 或 localhost、已授权通知、且建议安装到主屏幕。',
              'Delivers project notifications into the phone system layer. Requires HTTPS or localhost, granted permission, and is best after install-to-home-screen.',
            )
          }}
        </p>
      </div>
      <input
        :checked="settings.system.realPushEnabled"
        type="checkbox"
        class="w-5 h-5"
        @change="$emit('update-real-push-enabled', $event.target.checked)"
      />
    </div>

    <div class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 space-y-1">
      <p class="text-[11px] text-gray-700">
        {{ t('环境能力', 'Environment capability') }}:
        <span class="font-medium">{{ webPushSupported ? t('支持', 'Supported') : t('不支持', 'Not supported') }}</span>
      </p>
      <p class="text-[11px] text-gray-700">
        {{ t('通知权限', 'Notification permission') }}:
        <span class="font-medium">{{ pushPermissionLabel }}</span>
      </p>
      <p class="text-[11px] text-gray-700">
        {{ t('订阅状态', 'Subscription status') }}:
        <span class="font-medium">{{ pushSubscriptionLabel }}</span>
      </p>
      <p class="text-[11px] text-gray-700">
        {{ t('服务状态', 'Server status') }}:
        <span class="font-medium">{{ pushServerHealthLabel }}</span>
      </p>
      <p class="text-[10px] text-gray-500">{{ pushCapabilityHint }}</p>
    </div>

    <div class="space-y-2">
      <label class="text-xs text-gray-500 block">
        {{ t('外部系统通知样式', 'External push style') }}
      </label>
      <select
        :value="settings.system.pushDisplayMode"
        class="w-full border rounded-xl px-3 py-2 text-sm outline-none bg-white"
        @change="$emit('update-push-display-mode', $event.target.value)"
      >
        <option value="minimal">{{ t('极简', 'Minimal') }}</option>
        <option value="standard">{{ t('标准', 'Standard') }}</option>
        <option value="preview">{{ t('预览', 'Preview') }}</option>
      </select>
      <p class="text-[10px] text-gray-400">
        {{ pushDisplayModeHint }}
      </p>
    </div>

    <div class="space-y-2">
      <label class="text-xs text-gray-500 block">{{ t('Push Server 地址', 'Push Server URL') }}</label>
      <input
        :value="settings.system.pushServerUrl"
        type="text"
        class="w-full border rounded-xl px-3 py-2 text-sm outline-none bg-white"
        placeholder="http://localhost:8787"
        @input="$emit('update-push-server-url', $event.target.value)"
      />
      <p class="text-[10px] text-gray-400">
        {{
          t(
            '开发期可使用本机或局域网地址；真正手机测试时，手机必须能访问这个地址。',
            'Use localhost or LAN address in development; on a real phone, the phone must be able to reach this URL.',
          )
        }}
      </p>
    </div>

    <div class="space-y-1 text-[11px] text-gray-500">
      <p>
        {{ t('当前有效地址', 'Effective URL') }}:
        <span class="font-medium text-gray-700">{{ normalizedPushServerUrl || t('未设置', 'Not set') }}</span>
      </p>
      <p>
        {{ t('设备标识', 'Device ID') }}:
        <span class="font-medium text-gray-700">{{ settings.system.pushDeviceId || t('未分配', 'Not assigned') }}</span>
      </p>
      <p v-if="settings.system.pushLastSyncedAt > 0">
        {{ t('最后同步', 'Last sync') }}:
        <span class="font-medium text-gray-700">{{ formatStorageReportTime(settings.system.pushLastSyncedAt) }}</span>
      </p>
      <p v-if="pushLastHealthCheckAt > 0">
        {{ t('最后检查', 'Last check') }}:
        <span class="font-medium text-gray-700">{{ formatStorageReportTime(pushLastHealthCheckAt) }}</span>
      </p>
      <p v-if="pushServerHealthMessage">
        {{ t('服务详情', 'Server detail') }}:
        <span
          class="font-medium"
          :class="pushServerHealthState === 'ok' ? 'text-green-700' : pushServerHealthState === 'error' ? 'text-amber-700' : 'text-gray-700'"
        >
          {{ pushServerHealthMessage }}
        </span>
      </p>
      <p v-if="settings.system.pushLastError" class="text-amber-700">
        {{ t('最近错误', 'Last error') }}:
        <span class="font-medium">{{ settings.system.pushLastError }}</span>
      </p>
    </div>

    <p
      v-if="pushFeedbackMessage"
      class="text-[11px]"
      :class="pushFeedbackType === 'success' ? 'text-green-600' : pushFeedbackType === 'warn' ? 'text-amber-600' : 'text-gray-500'"
    >
      {{ pushFeedbackMessage }}
    </p>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <button
        @click="$emit('check-push-server-health')"
        class="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="pushActionRunning || pushHealthRunning"
      >
        {{
          pushHealthRunning
            ? t('检查中...', 'Checking...')
            : t('检查服务连接', 'Check server')
        }}
      </button>
      <button
        @click="$emit('resync-real-push')"
        class="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="pushActionRunning || !settings.system.realPushEnabled"
      >
        {{ t('重同步订阅', 'Resync subscription') }}
      </button>
      <button
        @click="$emit('subscribe-real-push')"
        class="px-3 py-2 rounded-lg border border-blue-200 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="pushActionRunning"
      >
        {{ pushActionRunning ? t('处理中...', 'Working...') : t('授权并订阅', 'Authorize & subscribe') }}
      </button>
      <button
        @click="$emit('send-real-push-test')"
        class="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="pushActionRunning || !settings.system.pushSubscriptionActive"
      >
        {{ t('发送测试推送', 'Send test push') }}
      </button>
      <button
        @click="$emit('unsubscribe-real-push')"
        class="px-3 py-2 rounded-lg border border-amber-200 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="pushActionRunning"
      >
        {{ t('取消订阅', 'Unsubscribe') }}
      </button>
    </div>
  </div>

  <button
    @click="$emit('save-notification-settings')"
    class="w-full py-3 rounded-xl text-sm font-semibold transition"
    :class="notificationSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
  >
    {{ notificationSaved ? t('已保存', 'Saved') : t('保存通知设置', 'Save notification settings') }}
  </button>
</template>
