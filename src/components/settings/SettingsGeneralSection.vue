<script setup>
import SettingsSubPageHeader from './SettingsSubPageHeader.vue'
import { useI18n } from '../../composables/useI18n'

defineProps({
  language: {
    type: String,
    default: 'zh-CN',
  },
  timezone: {
    type: String,
    default: 'Asia/Shanghai',
  },
  backupReminderEnabled: {
    type: Boolean,
    default: true,
  },
  backupReminderIntervalHours: {
    type: Number,
    default: 24,
  },
  backupReminderIntervalOptions: {
    type: Array,
    default: () => [],
  },
  backupReminderIntervalLabel: {
    type: Function,
    required: true,
  },
  generalSaved: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'close',
  'save',
  'update-language',
  'update-timezone',
  'update-backup-reminder-enabled',
  'update-backup-reminder-interval-hours',
])

const { t } = useI18n()

const updateLanguage = (event) => {
  emit('update-language', event.target.value)
}

const updateTimezone = (event) => {
  emit('update-timezone', event.target.value)
}

const updateBackupReminderEnabled = (event) => {
  emit('update-backup-reminder-enabled', event.target.checked)
}

const updateBackupReminderIntervalHours = (event) => {
  emit('update-backup-reminder-interval-hours', Number(event.target.value))
}
</script>

<template>
  <SettingsSubPageHeader
    title-zh="通用"
    title-en="General"
    @close="emit('close')"
  />

  <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
    <div class="bg-white rounded-2xl p-4">
      <label class="text-xs text-gray-500 block mb-2">{{ t('语言', 'Language') }}</label>
      <select
        :value="language"
        class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white"
        data-testid="settings-general-language"
        @change="updateLanguage"
      >
        <option value="zh-CN">简体中文</option>
        <option value="en-US">{{ t('英语', 'English') }}</option>
        <option value="ko-KR">한국어</option>
      </select>
    </div>

    <div class="bg-white rounded-2xl p-4">
      <label class="text-xs text-gray-500 block mb-1">{{ t('时区', 'Timezone') }}</label>
      <input
        :value="timezone"
        type="text"
        class="w-full border-b border-gray-200 py-1 outline-none text-sm"
        placeholder="Asia/Shanghai"
        data-testid="settings-general-timezone"
        @input="updateTimezone"
      />
    </div>

    <div class="bg-white rounded-2xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold">{{ t('备份提醒', 'Backup Reminder') }}</p>
          <p class="text-[10px] text-gray-500">
            {{ t('通过系统通知提醒你定期导出备份，不使用弹窗。', 'Uses system-style notifications to remind regular backup export, no pop-up dialogs.') }}
          </p>
        </div>
        <input
          :checked="backupReminderEnabled"
          type="checkbox"
          class="w-5 h-5"
          data-testid="settings-general-backup-reminder-enabled"
          @change="updateBackupReminderEnabled"
        />
      </div>

      <div v-if="backupReminderEnabled" class="space-y-2">
        <label class="text-xs text-gray-500 block mb-1">{{ t('提醒间隔', 'Reminder interval') }}</label>
        <select
          :value="backupReminderIntervalHours"
          class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white"
          data-testid="settings-general-backup-reminder-interval"
          @change="updateBackupReminderIntervalHours"
        >
          <option
            v-for="hours in backupReminderIntervalOptions"
            :key="hours"
            :value="hours"
          >
            {{ backupReminderIntervalLabel(hours) }}
          </option>
        </select>
        <p class="text-[10px] text-gray-400">
          {{ t('建议至少 24 小时一次。', 'Recommended: at least once every 24 hours.') }}
        </p>
      </div>
    </div>

    <button
      type="button"
      class="w-full py-3 rounded-xl text-sm font-semibold transition"
      data-testid="settings-general-save"
      :class="generalSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
      @click="emit('save')"
    >
      {{ generalSaved ? t('已保存', 'Saved') : t('保存通用设置', 'Save general settings') }}
    </button>
  </div>
</template>
