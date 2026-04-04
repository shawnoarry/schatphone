<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useMapStore } from '../stores/map'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const mapStore = useMapStore()
const { t } = useI18n()

const { settings, user, notifications, apiReports, truthState } = storeToRefs(systemStore)
const { roleProfiles, contacts, chatHistory, conversations, messagesByConversation } = storeToRefs(chatStore)
const { addresses, currentLocation, tripForm } = storeToRefs(mapStore)

const activeMenu = ref('')
const generalSaved = ref(false)
const notificationSaved = ref(false)
const automationSaved = ref(false)
const backupImporting = ref(false)
const backupFileInput = ref(null)
const backupFeedbackType = ref('')
const backupFeedbackMessage = ref('')
let generalSavedTimerId = null
let notificationSavedTimerId = null
let automationSavedTimerId = null
let backupFeedbackTimerId = null
const automationInitialMaster = ref(false)

const setBackupFeedback = (type, message, durationMs = 1800) => {
  backupFeedbackType.value = type
  backupFeedbackMessage.value = message
  if (backupFeedbackTimerId) clearTimeout(backupFeedbackTimerId)
  backupFeedbackTimerId = setTimeout(() => {
    backupFeedbackType.value = ''
    backupFeedbackMessage.value = ''
  }, durationMs)
}

const goHome = () => {
  router.push('/home')
}

const openSubPage = (menu) => {
  activeMenu.value = menu
  if (menu === 'automation') {
    automationInitialMaster.value = Boolean(settings.value.aiAutomation?.masterEnabled)
  }
}

const closeSubPage = () => {
  activeMenu.value = ''
}

const openProfile = () => {
  router.push('/profile')
}

const openWorldBook = () => {
  router.push('/worldbook')
}

const saveGeneralSettings = () => {
  systemStore.saveNow()
  generalSaved.value = true
  if (generalSavedTimerId) clearTimeout(generalSavedTimerId)
  generalSavedTimerId = setTimeout(() => {
    generalSaved.value = false
  }, 1200)
}

const saveNotificationSettings = () => {
  systemStore.saveNow()
  notificationSaved.value = true
  if (notificationSavedTimerId) clearTimeout(notificationSavedTimerId)
  notificationSavedTimerId = setTimeout(() => {
    notificationSaved.value = false
  }, 1200)
}

const clampAutomationPriority = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 100
  return Math.min(1000, Math.max(1, Math.floor(num)))
}

const clampAutomationSeconds = (value, fallback = 120) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(1800, Math.max(10, Math.floor(num)))
}

const normalizeAutomationClock = (value, fallback = '00:00') => {
  if (typeof value !== 'string') return fallback
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (!match) return fallback
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

const automationRuntimePolicy = computed(() =>
  systemStore.getAiAutomationRuntimePolicy('chat', Date.now()),
)

const saveAutomationSettings = () => {
  if (!settings.value.aiAutomation) return

  if (!automationInitialMaster.value && settings.value.aiAutomation.masterEnabled) {
    const ok = window.confirm(
      t(
        '开启后会允许系统按配置自主触发 AI 调用，可能消耗 API 供应商额度。确认继续？',
        'Enabling this allows autonomous AI calls by configuration and may consume provider quota. Continue?',
      ),
    )
    if (!ok) {
      settings.value.aiAutomation.masterEnabled = false
      return
    }
  }

  const modules = settings.value.aiAutomation.modules || {}
  Object.keys(modules).forEach((moduleKey) => {
    modules[moduleKey].priority = clampAutomationPriority(modules[moduleKey].priority)
  })
  settings.value.aiAutomation.conflictCooldownSec = clampAutomationSeconds(
    settings.value.aiAutomation.conflictCooldownSec,
    20,
  )
  settings.value.aiAutomation.dedupeWindowSec = clampAutomationSeconds(
    settings.value.aiAutomation.dedupeWindowSec,
    120,
  )
  settings.value.aiAutomation.quietHoursStart = normalizeAutomationClock(
    settings.value.aiAutomation.quietHoursStart,
    '23:00',
  )
  settings.value.aiAutomation.quietHoursEnd = normalizeAutomationClock(
    settings.value.aiAutomation.quietHoursEnd,
    '07:00',
  )

  systemStore.saveNow()
  automationSaved.value = true
  if (automationSavedTimerId) clearTimeout(automationSavedTimerId)
  automationSavedTimerId = setTimeout(() => {
    automationSaved.value = false
  }, 1200)
}

const openChatAutomation = () => {
  router.push('/chat-contacts')
}

const openNetworkReports = () => {
  router.push('/network')
}

const openAppearanceStudio = () => {
  router.push('/appearance')
}

const exportData = () => {
  const data = JSON.stringify({
    settings: settings.value,
    user: user.value,
    notifications: notifications.value,
    apiReports: apiReports.value,
    truthState: truthState.value,
    roleProfiles: roleProfiles.value,
    contacts: contacts.value,
    chatHistory: chatHistory.value,
    conversations: conversations.value,
    messagesByConversation: messagesByConversation.value,
    map: {
      addresses: addresses.value,
      currentLocation: currentLocation.value,
      tripForm: tripForm.value,
    },
  })

  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'schatphone_backup.json'
  anchor.click()
  URL.revokeObjectURL(url)
  setBackupFeedback('success', t('备份文件下载已开始。', 'Backup download has started.'))
}

const deepClone = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

const createRollbackSnapshot = () => {
  return {
    system: {
      settings: deepClone(settings.value),
      user: deepClone(user.value),
      notifications: deepClone(notifications.value),
      apiReports: deepClone(apiReports.value),
      truthState: deepClone(truthState.value),
    },
    chat: {
      roleProfiles: deepClone(roleProfiles.value),
      contacts: deepClone(contacts.value),
      chatHistory: deepClone(chatHistory.value),
      conversations: deepClone(conversations.value),
      messagesByConversation: deepClone(messagesByConversation.value),
    },
    map: {
      addresses: deepClone(addresses.value),
      currentLocation: deepClone(currentLocation.value),
      tripForm: deepClone(tripForm.value),
    },
  }
}

const triggerImportData = () => {
  if (backupImporting.value) return
  backupFileInput.value?.click()
}

const resetImportInput = (event) => {
  if (!event?.target) return
  event.target.value = ''
}

const importData = async (event) => {
  const file = event?.target?.files?.[0]
  resetImportInput(event)
  if (!file || backupImporting.value) return

  const confirmed = window.confirm(
    t(
      '导入会覆盖当前本地数据。是否继续？',
      'Import will overwrite current local data. Continue?',
    ),
  )
  if (!confirmed) return

  backupImporting.value = true
  const rollback = createRollbackSnapshot()

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(t('备份文件格式无效。', 'Invalid backup file format.'))
    }

    const systemOk = systemStore.restoreFromBackup(parsed)
    const chatOk = chatStore.restoreFromBackup(parsed)
    const mapOk = mapStore.restoreFromBackup(parsed.map || parsed)
    if (!systemOk || !chatOk || !mapOk) {
      throw new Error(t('备份结构不完整或不受支持。', 'Backup structure is incomplete or unsupported.'))
    }

    systemStore.saveNow()
    chatStore.saveNow()
    mapStore.saveNow()
    setBackupFeedback('success', t('导入成功，数据已恢复。', 'Import succeeded and data has been restored.'), 2200)
  } catch (error) {
    systemStore.restoreFromBackup(rollback.system)
    chatStore.restoreFromBackup(rollback.chat)
    mapStore.restoreFromBackup(rollback.map)
    systemStore.saveNow()
    chatStore.saveNow()
    mapStore.saveNow()
    const detail = typeof error?.message === 'string' && error.message.trim() ? ` ${error.message.trim()}` : ''
    setBackupFeedback(
      'error',
      `${t('导入失败，已自动回滚。', 'Import failed and rolled back automatically.')}${detail}`,
      3200,
    )
  } finally {
    backupImporting.value = false
  }
}

onBeforeUnmount(() => {
  if (generalSavedTimerId) clearTimeout(generalSavedTimerId)
  if (notificationSavedTimerId) clearTimeout(notificationSavedTimerId)
  if (automationSavedTimerId) clearTimeout(automationSavedTimerId)
  if (backupFeedbackTimerId) clearTimeout(backupFeedbackTimerId)
})
</script>

<template>
  <div class="w-full h-full bg-[#f2f2f7] flex flex-col text-black">
    <div class="pt-12 pb-4 px-4 bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-gray-200 flex items-center">
      <button @click="goHome" class="mr-2 text-blue-500 flex items-center gap-1 text-sm font-medium">
        <i class="fas fa-chevron-left"></i> {{ t('主页', 'Home') }}
      </button>
      <h1 class="text-2xl font-bold flex-1">{{ t('设置', 'Settings') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
      <button class="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm text-left" @click="openProfile">
        <div class="w-14 h-14 rounded-full bg-gray-300 overflow-hidden">
          <img
            :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold">{{ user.name || t('未命名用户', 'Unnamed User') }}</h2>
          <p class="text-xs text-gray-500">{{ t('Apple ID、头像与基础人设', 'Apple ID, avatar and profile basics') }}</p>
        </div>
        <i class="fas fa-chevron-right text-gray-300"></i>
      </button>

      <div class="bg-blue-50 border border-blue-100 rounded-2xl p-3.5">
        <p class="text-[11px] font-semibold text-blue-700">{{ t('新手建议', 'Beginner tip') }}</p>
        <p class="text-[11px] text-blue-700/90 mt-1">
          {{
            t(
              '推荐顺序：先配置“网络与 API”，再进入会话手动触发回复，最后按需要开启自动响应。',
              'Recommended flow: set up Network & API first, then use manual trigger in chat, and enable automation only when needed.',
            )
          }}
        </p>
      </div>

      <div class="px-1 text-[11px] text-gray-500 font-medium">{{ t('快捷入口', 'Quick Access') }}</div>
      <div class="grid grid-cols-3 gap-2">
        <button
          class="bg-white rounded-xl p-2.5 border border-gray-100 text-left active:bg-gray-50"
          @click="openNetworkReports"
        >
          <p class="text-[11px] font-semibold text-gray-800">{{ t('网络与 API', 'Network & API') }}</p>
          <p class="text-[10px] text-gray-500 mt-0.5">{{ t('配置接口', 'Configure provider') }}</p>
        </button>
        <button
          class="bg-white rounded-xl p-2.5 border border-gray-100 text-left active:bg-gray-50"
          @click="openChatAutomation"
        >
          <p class="text-[11px] font-semibold text-gray-800">{{ t('会话设置', 'Chat settings') }}</p>
          <p class="text-[10px] text-gray-500 mt-0.5">{{ t('角色与会话', 'Roles and threads') }}</p>
        </button>
        <button
          class="bg-white rounded-xl p-2.5 border border-gray-100 text-left active:bg-gray-50"
          @click="openAppearanceStudio"
        >
          <p class="text-[11px] font-semibold text-gray-800">{{ t('外观工坊', 'Appearance') }}</p>
          <p class="text-[10px] text-gray-500 mt-0.5">{{ t('主题与壁纸', 'Theme and wallpaper') }}</p>
        </button>
      </div>

      <div class="px-1 text-[11px] text-gray-500 font-medium">{{ t('内容设置', 'Content Settings') }}</div>
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="openWorldBook"
        >
          <div class="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-book-open"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('世界书', 'World Book') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('所有对话共享的世界设定', 'Shared context for all chats') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="openSubPage('general')"
        >
          <div class="w-7 h-7 rounded-lg bg-gray-600 flex items-center justify-center text-white text-xs">
            <i class="fas fa-sliders"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('通用', 'General') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('系统语言、时区等基础项', 'Language, timezone and basic system options') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="openSubPage('automation')"
        >
          <div class="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-robot"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('AI 自动响应', 'AI Automation') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('总开关、优先级、安静时段', 'Master switch, priorities and quiet hours') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 active:bg-gray-50 transition text-left"
          @click="openSubPage('notification')"
        >
          <div class="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-bell"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('通知', 'Notifications') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('消息提醒与系统提示', 'Message alerts and system notifications') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>
      </div>

      <div class="px-1 text-[11px] text-gray-500 font-medium">{{ t('数据与安全', 'Data & Security') }}</div>
      <div class="bg-white rounded-2xl overflow-hidden shadow-sm">
        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="exportData"
        >
          <div class="w-7 h-7 rounded bg-yellow-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-file-export"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('备份与导出（JSON）', 'Backup & Export (JSON)') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('导出当前本地数据快照', 'Export a local snapshot of current data') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50 transition text-left"
          @click="triggerImportData"
        >
          <div class="w-7 h-7 rounded bg-green-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-file-import"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">
              {{ backupImporting ? t('正在导入...', 'Importing...') : t('恢复导入（JSON）', 'Restore Import (JSON)') }}
            </p>
            <p class="text-[11px] text-gray-500">{{ t('导入失败会自动回滚', 'Auto rollback will run if import fails') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>

        <button
          class="w-full p-3.5 flex items-center gap-3 active:bg-gray-50 transition text-left"
          @click="openSubPage('about')"
        >
          <div class="w-7 h-7 rounded bg-blue-500 flex items-center justify-center text-white text-xs">
            <i class="fas fa-circle-info"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm">{{ t('关于 SchatPhone', 'About SchatPhone') }}</p>
            <p class="text-[11px] text-gray-500">{{ t('版本与框架信息', 'Version and stack information') }}</p>
          </div>
          <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
        </button>
      </div>
      <input
        ref="backupFileInput"
        type="file"
        accept="application/json"
        class="hidden"
        @change="importData"
      />

      <p
        v-if="backupFeedbackMessage"
        class="px-1 text-[11px]"
        :class="backupFeedbackType === 'error' ? 'text-red-600' : 'text-emerald-600'"
      >
        {{ backupFeedbackMessage }}
      </p>

      <div v-if="activeMenu === 'general'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> {{ t('设置', 'Settings') }}
          </button>
          <span class="font-bold mx-auto pr-8">{{ t('通用', 'General') }}</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div class="bg-white rounded-2xl p-4">
            <label class="text-xs text-gray-500 block mb-2">{{ t('语言', 'Language') }}</label>
            <select v-model="settings.system.language" class="w-full border rounded-lg px-2 py-2 text-sm outline-none bg-white">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">{{ t('英语', 'English') }}</option>
              <option value="ko-KR">한국어</option>
            </select>
          </div>

          <div class="bg-white rounded-2xl p-4">
            <label class="text-xs text-gray-500 block mb-1">{{ t('时区', 'Timezone') }}</label>
            <input
              v-model="settings.system.timezone"
              type="text"
              class="w-full border-b border-gray-200 py-1 outline-none text-sm"
              placeholder="Asia/Shanghai"
            />
          </div>

          <button
            @click="saveGeneralSettings"
            class="w-full py-3 rounded-xl text-sm font-semibold transition"
            :class="generalSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            {{ generalSaved ? t('已保存', 'Saved') : t('保存通用设置', 'Save general settings') }}
          </button>
        </div>
      </div>

      <div v-if="activeMenu === 'automation'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> {{ t('设置', 'Settings') }}
          </button>
          <span class="font-bold mx-auto pr-8">{{ t('AI 自动响应', 'AI Automation') }}</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div class="bg-white rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold">{{ t('全局自主调用总开关', 'Global autonomous switch') }}</p>
                <p class="text-[10px] text-gray-400">
                  {{ t('关闭后所有模块与会话的自主调用都失效。', 'When off, all autonomous calls in modules and chats are disabled.') }}
                </p>
              </div>
              <input v-model="settings.aiAutomation.masterEnabled" type="checkbox" class="w-5 h-5" />
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 space-y-3">
            <p class="text-sm font-semibold">{{ t('模块级开关与优先级', 'Module switches and priorities') }}</p>
            <div class="grid grid-cols-[1fr,70px,70px] gap-2 items-center">
              <p class="text-xs text-gray-500">{{ t('模块', 'Module') }}</p>
              <p class="text-xs text-gray-500 text-center">{{ t('开启', 'Enable') }}</p>
              <p class="text-xs text-gray-500 text-center">{{ t('优先级', 'Priority') }}</p>

              <p class="text-sm">{{ t('聊天（Chat）', 'Chat') }}</p>
              <div class="text-center">
                <input v-model="settings.aiAutomation.modules.chat.enabled" type="checkbox" class="w-4 h-4" />
              </div>
              <input v-model.number="settings.aiAutomation.modules.chat.priority" type="number" min="1" max="1000" class="border rounded px-2 py-1 text-xs text-right" />

              <p class="text-sm">{{ t('地图（Map，预留）', 'Map (Reserved)') }}</p>
              <div class="text-center">
                <input v-model="settings.aiAutomation.modules.map.enabled" type="checkbox" class="w-4 h-4" />
              </div>
              <input v-model.number="settings.aiAutomation.modules.map.priority" type="number" min="1" max="1000" class="border rounded px-2 py-1 text-xs text-right" />

              <p class="text-sm">{{ t('购物（预留）', 'Shopping (Reserved)') }}</p>
              <div class="text-center">
                <input v-model="settings.aiAutomation.modules.shopping.enabled" type="checkbox" class="w-4 h-4" />
              </div>
              <input v-model.number="settings.aiAutomation.modules.shopping.priority" type="number" min="1" max="1000" class="border rounded px-2 py-1 text-xs text-right" />
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 space-y-3">
            <p class="text-sm font-semibold">{{ t('执行模式与安静时段', 'Execution mode and quiet hours') }}</p>
            <label class="flex items-center justify-between gap-2">
              <span class="text-xs text-gray-500">{{ t('仅通知模式（不自动生成回复）', 'Notify-only mode (no auto reply generation)') }}</span>
              <input v-model="settings.aiAutomation.notifyOnlyMode" type="checkbox" class="w-4 h-4" />
            </label>
            <label class="flex items-center justify-between gap-2">
              <span class="text-xs text-gray-500">{{ t('启用安静时段（自动转为仅通知）', 'Enable quiet hours (force notify-only)') }}</span>
              <input v-model="settings.aiAutomation.quietHoursEnabled" type="checkbox" class="w-4 h-4" />
            </label>
            <div v-if="settings.aiAutomation.quietHoursEnabled" class="grid grid-cols-2 gap-2">
              <label class="flex flex-col gap-1">
                <span class="text-[11px] text-gray-500">{{ t('开始', 'Start') }}</span>
                <input
                  v-model="settings.aiAutomation.quietHoursStart"
                  type="time"
                  class="border rounded px-2 py-1.5 text-xs"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-[11px] text-gray-500">{{ t('结束', 'End') }}</span>
                <input
                  v-model="settings.aiAutomation.quietHoursEnd"
                  type="time"
                  class="border rounded px-2 py-1.5 text-xs"
                />
              </label>
            </div>
            <p class="text-[11px] text-gray-500">
              {{
                t(
                  '当前运行态：',
                  'Current runtime mode:',
                )
              }}
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
                v-model.number="settings.aiAutomation.conflictCooldownSec"
                type="number"
                min="10"
                max="600"
                class="w-24 border rounded px-2 py-1 text-xs text-right"
              />
            </label>
            <label class="flex items-center justify-between gap-2">
              <span class="text-xs text-gray-500">{{ t('重复上下文抑制秒数', 'Dedupe window (sec)') }}</span>
              <input
                v-model.number="settings.aiAutomation.dedupeWindowSec"
                type="number"
                min="10"
                max="1800"
                class="w-24 border rounded px-2 py-1 text-xs text-right"
              />
            </label>
          </div>

          <div class="bg-white rounded-2xl p-4">
            <p class="text-xs text-gray-500">
              {{ t('每个角色的自主调用间隔（如 360 秒/720 秒）在对应 Chat 会话菜单中设置。', 'Per-role autonomous interval (e.g. 360s/720s) is configured in each Chat thread menu.') }}
            </p>
            <button @click="openChatAutomation" class="mt-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
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
                  '调用失败与中断记录可在 Network 页面查看。',
                  'Failure and cancellation logs are available on the Network page.',
                )
              }}
            </p>
            <button @click="openNetworkReports" class="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
              {{ t('前往调用记录', 'Go to call history') }}
            </button>
          </div>

          <button
            @click="saveAutomationSettings"
            class="w-full py-3 rounded-xl text-sm font-semibold transition"
            :class="automationSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            {{ automationSaved ? t('已保存', 'Saved') : t('保存自动响应设置', 'Save automation settings') }}
          </button>
        </div>
      </div>

      <div v-if="activeMenu === 'notification'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> {{ t('设置', 'Settings') }}
          </button>
          <span class="font-bold mx-auto pr-8">{{ t('通知', 'Notifications') }}</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div class="bg-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p class="text-sm">{{ t('消息通知', 'Message notifications') }}</p>
              <p class="text-[10px] text-gray-400">{{ t('用于聊天消息与系统提醒', 'Used for chat messages and system alerts') }}</p>
            </div>
            <input v-model="settings.system.notifications" type="checkbox" class="w-5 h-5" />
          </div>

          <button
            @click="saveNotificationSettings"
            class="w-full py-3 rounded-xl text-sm font-semibold transition"
            :class="notificationSaved ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'"
          >
            {{ notificationSaved ? t('已保存', 'Saved') : t('保存通知设置', 'Save notification settings') }}
          </button>
        </div>
      </div>

      <div v-if="activeMenu === 'about'" class="fixed inset-0 bg-[#f2f2f7] z-20 flex flex-col animate-slide-in">
        <div class="pt-12 pb-2 px-2 bg-white flex items-center border-b">
          <button @click="closeSubPage" class="text-blue-500 flex items-center px-2">
            <i class="fas fa-chevron-left mr-1"></i> {{ t('设置', 'Settings') }}
          </button>
          <span class="font-bold mx-auto pr-8">{{ t('关于', 'About') }}</span>
        </div>

        <div class="p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div class="bg-white rounded-2xl p-4">
            <p class="text-sm font-semibold">SchatPhone</p>
            <p class="text-xs text-gray-500 mt-1">{{ t('当前版本：1.2.0', 'Current version: 1.2.0') }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ t('框架：Vue 3 + Vite + Pinia + Tailwind v4', 'Stack: Vue 3 + Vite + Pinia + Tailwind v4') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
