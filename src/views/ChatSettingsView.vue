<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useSystemStore } from '../stores/system'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const systemStore = useSystemStore()
const { contactsForList } = storeToRefs(chatStore)
const { settings } = storeToRefs(systemStore)
const { confirmDialog } = useDialog()
const { t } = useI18n()

const actionFeedbackType = ref('')
const actionFeedbackMessage = ref('')
let actionFeedbackTimerId = null

const contacts = computed(() => contactsForList.value || [])
const activeSection = computed(() => (typeof route.query.section === 'string' ? route.query.section : ''))

const showActionFeedback = (type, message, durationMs = 2200) => {
  const text = typeof message === 'string' ? message.trim() : ''
  if (!text) return
  actionFeedbackType.value = type
  actionFeedbackMessage.value = text
  if (actionFeedbackTimerId) clearTimeout(actionFeedbackTimerId)
  actionFeedbackTimerId = setTimeout(() => {
    actionFeedbackType.value = ''
    actionFeedbackMessage.value = ''
  }, durationMs)
}

onBeforeUnmount(() => {
  if (actionFeedbackTimerId) clearTimeout(actionFeedbackTimerId)
})

const chatAppearance = computed(() => settings.value.appearance?.chat || {})

const messageLayoutLabel = computed(() => {
  if (chatAppearance.value.messageLayout === 'wechat') return t('微信式', 'WeChat-like')
  if (chatAppearance.value.messageLayout === 'imessage') return t('iMessage 式', 'iMessage-like')
  return t('Kakao 式', 'Kakao-like')
})

const openChatAppearance = () => {
  router.push('/chat-settings/appearance')
}

const openNetworkCenter = () => {
  router.push('/network')
}

const openBehaviorSection = () => {
  router.push({ path: '/chat-settings', query: { section: 'behavior' } })
}

const normalizeAutoInvokeCheckpointsNow = () => {
  const touched = chatStore.normalizeAutoInvokeCheckpoints(Date.now())
  if (touched > 0) chatStore.saveNow()
  showActionFeedback(
    'success',
    touched > 0
      ? t(`已修复 ${touched} 个会话调度检查点。`, `Normalized ${touched} conversation checkpoints.`)
      : t('没有需要修复的调度检查点。', 'No checkpoints required normalization.'),
  )
}

const clearAllThreadIdentityOverrides = async () => {
  if (!contacts.value.length) {
    showActionFeedback('warning', t('暂无会话可清理。', 'No conversations available.'))
    return
  }
  const confirmed = await confirmDialog({
    title: t('清理会话级身份覆写', 'Clear thread identity overrides'),
    message: t(
      '确认清理全部会话级身份覆写吗？主档案会保留。',
      'Clear all thread-level identity overrides? Main profiles will be kept.',
    ),
    confirmText: t('清理', 'Clear'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return

  let touched = 0
  contacts.value.forEach((contact) => {
    const changed = chatStore.setConversationIdentityOverrides(contact.id, {
      selfAvatar: '',
      contactAvatar: '',
    })
    if (changed) touched += 1
  })
  if (touched > 0) chatStore.saveNow()
  showActionFeedback(
    touched > 0 ? 'success' : 'warning',
    touched > 0
      ? t(`已清理 ${touched} 个会话身份覆写。`, `Cleared ${touched} thread identity overrides.`)
      : t('没有检测到会话身份覆写。', 'No thread identity overrides found.'),
  )
}

const clearAllModuleAvatarOverrides = async () => {
  if (!contacts.value.length) {
    showActionFeedback('warning', t('暂无联系人可清理。', 'No contacts available.'))
    return
  }
  const confirmed = await confirmDialog({
    title: t('清理模块级头像覆写', 'Clear module avatar overrides'),
    message: t(
      '确认清理模块级头像覆写吗？会话级覆写与主档案不会被删除。',
      'Clear module-level avatar overrides? Thread overrides and main profiles are kept.',
    ),
    confirmText: t('清理', 'Clear'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return

  let touched = 0
  if (
    chatStore.setModuleAvatarOverrides({
      selfAvatar: '',
      defaultContactAvatar: '',
    })
  ) {
    touched += 1
  }
  contacts.value.forEach((contact) => {
    if (chatStore.setModuleContactAvatarOverride(contact.id, '')) touched += 1
  })
  if (touched > 0) chatStore.saveNow()
  showActionFeedback(
    touched > 0 ? 'success' : 'warning',
    touched > 0
      ? t('模块级头像覆写已清理。', 'Module-level avatar overrides cleared.')
      : t('没有检测到模块级头像覆写。', 'No module-level avatar overrides found.'),
  )
}

const settingsEntries = computed(() => [
  {
    id: 'appearance',
    icon: 'fas fa-palette',
    title: t('Chat 外观', 'Chat Appearance'),
    meta: messageLayoutLabel.value,
    action: openChatAppearance,
  },
  {
    id: 'immersion',
    icon: 'fas fa-bell-slash',
    title: t('沉浸与通知', 'Immersion & Notifications'),
    meta: settings.value.system.notifications !== false ? t('系统通知开启', 'System notifications on') : t('系统通知关闭', 'System notifications off'),
    action: () => router.push('/settings'),
  },
  {
    id: 'behavior',
    icon: 'fas fa-message',
    title: t('默认会话行为', 'Default Thread Behavior'),
    meta: t('手动触发 · 沉浸回复', 'Manual trigger · Immersive replies'),
    action: openBehaviorSection,
  },
])

const behaviorRows = computed(() => [
  {
    id: 'layout',
    label: t('消息行布局', 'Message row layout'),
    value: messageLayoutLabel.value,
  },
  {
    id: 'reply',
    label: t('回复预设', 'Reply preset'),
    value: t('在具体会话菜单中套用', 'Apply inside each thread menu'),
  },
  {
    id: 'history',
    label: t('历史保留', 'History retention'),
    value: t('拉黑或请求态不删除记录', 'Requests and blocks keep history'),
  },
])
</script>

<template>
  <div class="chat-settings-page w-full h-full text-black flex flex-col">
    <div class="chat-native-header pt-12 pb-3 px-4 flex items-center gap-3">
      <button @click="router.push('/chat')" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('聊天', 'Chat') }}
      </button>
      <h1 class="font-bold text-xl">{{ t('Chat 设置', 'Chat Settings') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
      <section class="rounded-[28px] border border-yellow-100 bg-yellow-50 px-5 py-5">
        <p class="text-2xl font-bold leading-tight text-gray-950">{{ t('Chat 设置', 'Chat Settings') }}</p>
        <p class="mt-2 text-sm text-gray-600">
          {{ t('外观、沉浸、默认会话和维护工具集中在这里。', 'Appearance, immersion, defaults, and maintenance live here.') }}
        </p>
      </section>

      <div
        v-if="actionFeedbackMessage"
        class="rounded-xl border px-3 py-2 text-xs"
        :class="
          actionFeedbackType === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : actionFeedbackType === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        "
      >
        {{ actionFeedbackMessage }}
      </div>

      <section class="rounded-2xl border border-gray-200 bg-white p-2">
        <button
          v-for="item in settingsEntries"
          :key="item.id"
          type="button"
          class="w-full rounded-xl px-3 py-3 text-left flex items-center gap-3 hover:bg-gray-50"
          :data-testid="`chat-settings-entry-${item.id}`"
          @click="item.action"
        >
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
            <i :class="item.icon"></i>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold text-gray-900">{{ item.title }}</span>
            <span class="block truncate text-[11px] text-gray-500">{{ item.meta }}</span>
          </span>
          <i class="fas fa-chevron-right text-xs text-gray-300"></i>
        </button>
      </section>

      <section
        class="rounded-2xl border bg-white p-4 space-y-3"
        :class="activeSection === 'behavior' ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-gray-200'"
        data-testid="chat-settings-behavior"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ t('默认会话行为', 'Default Thread Behavior') }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">
              {{ t('这里给出全局口径；真正会影响某个角色的设置仍从那条会话里进入。', 'This shows the global rule of thumb; thread-specific changes still start inside that thread.') }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-800"
            @click="router.push('/chat')"
          >
            {{ t('去会话', 'Open chats') }}
          </button>
        </div>
        <div class="grid gap-2">
          <div
            v-for="row in behaviorRows"
            :key="row.id"
            class="rounded-xl border border-gray-100 px-3 py-2"
            :data-testid="`chat-settings-behavior-${row.id}`"
          >
            <p class="text-[11px] font-semibold text-gray-500">{{ row.label }}</p>
            <p class="mt-0.5 text-sm font-semibold text-gray-900">{{ row.value }}</p>
          </div>
        </div>
      </section>

      <section
        class="rounded-2xl border bg-white p-4 space-y-3"
        :class="activeSection === 'diagnostics' ? 'border-yellow-300' : 'border-gray-200'"
        data-testid="chat-settings-diagnostics"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ t('维护与诊断', 'Maintenance & Diagnostics') }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">
              {{ t('调度修复、覆写清理与网络报告入口。', 'Schedule repair, override cleanup, and network reports.') }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
            @click="openNetworkCenter"
          >
            {{ t('网络报告', 'Network reports') }}
          </button>
        </div>

        <div class="space-y-3">
          <div class="rounded-xl border border-gray-100 px-3 py-3">
            <p class="text-xs font-semibold text-gray-900">{{ t('自动调度修复', 'Auto schedule repair') }}</p>
            <button
              @click="normalizeAutoInvokeCheckpointsNow"
              class="mt-2 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] hover:bg-emerald-100"
            >
              {{ t('执行检查点修复', 'Normalize checkpoints') }}
            </button>
          </div>

          <div class="rounded-xl border border-gray-100 px-3 py-3">
            <p class="text-xs font-semibold text-gray-900">{{ t('覆写清理工具', 'Override cleanup tools') }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <button
                @click="clearAllThreadIdentityOverrides"
                class="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[11px] hover:bg-amber-100"
              >
                {{ t('清理会话级身份覆写', 'Clear thread identity overrides') }}
              </button>
              <button
                @click="clearAllModuleAvatarOverrides"
                class="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[11px] hover:bg-amber-100"
              >
                {{ t('清理模块级头像覆写', 'Clear module avatar overrides') }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
