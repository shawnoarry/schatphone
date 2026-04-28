<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useSystemStore } from '../stores/system'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'

const MIN_AUTO_INVOKE_INTERVAL_SEC = 60
const MAX_AUTO_INVOKE_INTERVAL_SEC = 86400
const VALID_REPLY_MODES = new Set(['manual', 'auto'])
const VALID_RESPONSE_STYLES = new Set(['immersive', 'natural', 'concise'])

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const systemStore = useSystemStore()
const { contactsForList } = storeToRefs(chatStore)
const { user } = storeToRefs(systemStore)
const { t } = useI18n()
const { confirmDialog } = useDialog()

const featureMeta = computed(() => {
  const id = typeof route.params.feature === 'string' ? route.params.feature.trim() : ''
  if (id === 'preferences') {
    return {
      id,
      title: t('聊天偏好', 'Chat Preferences'),
      description: t(
        '批量设置会话偏好模板，可一键应用到指定范围会话。',
        'Batch-edit a conversation preference template and apply it to selected chat scopes.',
      ),
      icon: 'fas fa-sliders',
    }
  }
  if (id === 'identity') {
    return {
      id,
      title: t('身份与头像', 'Identity & Avatar'),
      description: t(
        '这里配置 Chat 模块内的用户身份：头像、昵称和匿名策略。',
        'Configure user-side Chat module identity here: avatar, nickname, and anonymity policy.',
      ),
      icon: 'fas fa-user-secret',
    }
  }
  if (id === 'labs') {
    return {
      id,
      title: t('聊天实验室', 'Chat Labs'),
      description: t(
        '提供会话自动调度修复与头像/身份覆写清理等维护工具。',
        'Provides maintenance utilities such as auto-schedule normalization and avatar/identity override cleanup.',
      ),
      icon: 'fas fa-flask',
    }
  }
  return {
    id: id || 'unknown',
    title: t('功能占位', 'Feature Placeholder'),
    description: t(
      '该功能位已预留，后续将接入具体能力。',
      'This feature slot is reserved and will be connected to real capabilities later.',
    ),
    icon: 'fas fa-puzzle-piece',
  }
})

const isPreferencesFeature = computed(() => featureMeta.value.id === 'preferences')
const isIdentityFeature = computed(() => featureMeta.value.id === 'identity')
const isLabsFeature = computed(() => featureMeta.value.id === 'labs')
const contacts = computed(() => contactsForList.value || [])

const actionFeedbackType = ref('')
const actionFeedbackMessage = ref('')
let actionFeedbackTimerId = null

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

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const normalizeAutoInvokeInterval = (value) =>
  clamp(
    toInt(value, MIN_AUTO_INVOKE_INTERVAL_SEC),
    MIN_AUTO_INVOKE_INTERVAL_SEC,
    MAX_AUTO_INVOKE_INTERVAL_SEC,
  )

const contactKindTag = (contact) => {
  if (!contact) return ''
  if (contact.kind === 'service') return t('服务号', 'Service')
  if (contact.kind === 'official') return t('官方号', 'Official')
  if (contact.kind === 'group') return t('群聊', 'Group')
  if (contact.isMain) return t('主角色', 'Main')
  return t('角色', 'Role')
}

const goBack = () => {
  router.push('/chat')
}

const openNetworkCenter = () => {
  router.push('/network')
}

const prefScope = ref('all')
const prefDraft = reactive({
  suggestedRepliesEnabled: false,
  allowQuoteReply: true,
  allowSelfQuote: false,
  virtualVoiceEnabled: true,
  replyMode: 'manual',
  responseStyle: 'immersive',
  replyCount: 1,
  autoInvokeEnabled: false,
  autoInvokeIntervalSec: 360,
})

const prefScopeOptions = computed(() => [
  { value: 'all', label: t('全部会话', 'All chats') },
  { value: 'role', label: t('角色会话', 'Role chats') },
  { value: 'service', label: t('服务号/官方号', 'Service/official') },
])

const replyModeOptions = computed(() => [
  { value: 'manual', label: t('手动触发', 'Manual trigger') },
  { value: 'auto', label: t('自动触发', 'Auto trigger') },
])

const responseStyleOptions = computed(() => [
  { value: 'immersive', label: t('沉浸', 'Immersive') },
  { value: 'natural', label: t('自然', 'Natural') },
  { value: 'concise', label: t('简洁', 'Concise') },
])

const matchPreferenceScope = (contact) => {
  if (prefScope.value === 'role') return (contact?.kind || 'role') === 'role'
  if (prefScope.value === 'service') {
    return contact?.kind === 'service' || contact?.kind === 'official'
  }
  return true
}

const preferenceScopeContacts = computed(() => contacts.value.filter((contact) => matchPreferenceScope(contact)))
const preferenceScopePreviewContacts = computed(() => preferenceScopeContacts.value.slice(0, 8))

const syncPreferenceDraft = () => {
  const defaults = chatStore.getDefaultConversationAiPrefs()
  prefDraft.suggestedRepliesEnabled = Boolean(defaults.suggestedRepliesEnabled)
  prefDraft.allowQuoteReply = Boolean(defaults.allowQuoteReply)
  prefDraft.allowSelfQuote = Boolean(defaults.allowSelfQuote)
  prefDraft.virtualVoiceEnabled = Boolean(defaults.virtualVoiceEnabled)
  prefDraft.replyMode = defaults.replyMode || 'manual'
  prefDraft.responseStyle = defaults.responseStyle || 'immersive'
  prefDraft.replyCount = clamp(toInt(defaults.replyCount, 1), 1, 3)
  prefDraft.autoInvokeEnabled = Boolean(defaults.autoInvokeEnabled)
  prefDraft.autoInvokeIntervalSec = normalizeAutoInvokeInterval(defaults.autoInvokeIntervalSec)
  prefScope.value = 'all'
}

const normalizedPreferenceTemplate = () => ({
  suggestedRepliesEnabled: Boolean(prefDraft.suggestedRepliesEnabled),
  allowQuoteReply: Boolean(prefDraft.allowQuoteReply),
  allowSelfQuote: Boolean(prefDraft.allowSelfQuote),
  virtualVoiceEnabled: Boolean(prefDraft.virtualVoiceEnabled),
  replyMode: VALID_REPLY_MODES.has(prefDraft.replyMode) ? prefDraft.replyMode : 'manual',
  responseStyle: VALID_RESPONSE_STYLES.has(prefDraft.responseStyle) ? prefDraft.responseStyle : 'immersive',
  replyCount: clamp(toInt(prefDraft.replyCount, 1), 1, 3),
  autoInvokeEnabled: Boolean(prefDraft.autoInvokeEnabled),
  autoInvokeIntervalSec: normalizeAutoInvokeInterval(prefDraft.autoInvokeIntervalSec),
})

const applyPreferencesToScope = () => {
  const targets = preferenceScopeContacts.value
  if (!targets.length) {
    showActionFeedback('warning', t('当前范围没有可应用会话。', 'No conversations in selected scope.'))
    return
  }

  const payload = normalizedPreferenceTemplate()
  targets.forEach((contact) => {
    chatStore.setConversationAiPrefs(contact.id, payload)
  })
  chatStore.saveNow()
  showActionFeedback(
    'success',
    t(`已应用到 ${targets.length} 个会话。`, `Applied to ${targets.length} conversations.`),
  )
}

const resetPreferenceTemplate = () => {
  syncPreferenceDraft()
  showActionFeedback('success', t('模板已恢复默认。', 'Template reset to defaults.'))
}

const moduleIdentityDraft = reactive({
  avatar: '',
  nickname: '',
  anonymityEnabled: false,
  anonymityScope: 'all',
  anonymityContactIds: [],
})

const anonymityScopeOptions = computed(() => [
  { value: 'all', label: t('全部匿名', 'Anonymous to all') },
  { value: 'selected', label: t('定向匿名', 'Anonymous to selected') },
])

const syncIdentityDraft = () => {
  const moduleIdentity = chatStore.getModuleIdentity()
  moduleIdentityDraft.avatar = moduleIdentity.avatar || ''
  moduleIdentityDraft.nickname = moduleIdentity.nickname || ''
  moduleIdentityDraft.anonymityEnabled = Boolean(moduleIdentity.anonymityEnabled)
  moduleIdentityDraft.anonymityScope = moduleIdentity.anonymityScope || 'all'
  moduleIdentityDraft.anonymityContactIds = Array.isArray(moduleIdentity.anonymityContactIds)
    ? [...moduleIdentity.anonymityContactIds]
    : []
}

const saveModuleIdentity = () => {
  const changed = chatStore.setModuleIdentity({
    avatar: moduleIdentityDraft.avatar,
    nickname: moduleIdentityDraft.nickname,
    anonymityEnabled: Boolean(moduleIdentityDraft.anonymityEnabled),
    anonymityScope: moduleIdentityDraft.anonymityScope,
    anonymityContactIds: [...moduleIdentityDraft.anonymityContactIds],
  })
  if (!changed) {
    showActionFeedback('warning', t('Chat 身份无变化。', 'No Chat identity changes detected.'))
    return
  }
  chatStore.saveNow()
  showActionFeedback('success', t('Chat 身份已保存。', 'Chat identity saved.'))
}

const moduleIdentityPreviewName = computed(
  () => moduleIdentityDraft.nickname || user.value.name || t('自己', 'Me'),
)

const targetedAnonymousContacts = computed(() => {
  const selected = new Set(moduleIdentityDraft.anonymityContactIds.map((id) => Number(id)))
  return contacts.value.filter((contact) => selected.has(Number(contact.id)))
})

const resetModuleIdentityDraft = () => {
  moduleIdentityDraft.avatar = ''
  moduleIdentityDraft.nickname = ''
  moduleIdentityDraft.anonymityEnabled = false
  moduleIdentityDraft.anonymityScope = 'all'
  moduleIdentityDraft.anonymityContactIds = []
}

const toggleAnonymousContact = (contactId) => {
  const numericId = Number(contactId)
  if (!Number.isFinite(numericId) || numericId <= 0) return
  const next = new Set(moduleIdentityDraft.anonymityContactIds.map((id) => Number(id)))
  if (next.has(numericId)) {
    next.delete(numericId)
  } else {
    next.add(numericId)
  }
  moduleIdentityDraft.anonymityContactIds = [...next]
}

const isAnonymousContactSelected = (contactId) =>
  moduleIdentityDraft.anonymityContactIds.includes(Number(contactId))

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
      '确认清理全部会话级身份覆写吗？该操作不会删除主档案。',
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
  syncIdentityDraft()
  showActionFeedback(
    touched > 0 ? 'success' : 'warning',
    touched > 0
      ? t('模块级头像覆写已清理。', 'Module-level avatar overrides cleared.')
      : t('没有检测到模块级头像覆写。', 'No module-level avatar overrides found.'),
  )
}

watch(
  () => featureMeta.value.id,
  (id) => {
    actionFeedbackType.value = ''
    actionFeedbackMessage.value = ''
    if (id === 'identity') syncIdentityDraft()
    if (id === 'preferences') syncPreferenceDraft()
  },
  { immediate: true },
)
</script>

<template>
  <div class="w-full h-full bg-[#f2f2f7] text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center gap-3">
      <button @click="goBack" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('聊天', 'Chat') }}
      </button>
      <h1 class="font-bold text-xl">{{ featureMeta.title }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
      <div class="bg-white rounded-2xl border border-gray-200 p-4">
        <p class="text-sm font-semibold flex items-center gap-2">
          <i :class="featureMeta.icon"></i>
          {{ featureMeta.title }}
        </p>
        <p class="mt-2 text-xs text-gray-500">{{ featureMeta.description }}</p>
      </div>

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

      <template v-if="isPreferencesFeature">
        <div class="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-semibold text-gray-900">{{ t('批量会话偏好模板', 'Batch conversation template') }}</p>
            <p class="text-[11px] text-gray-500">
              {{ t(`目标会话：${preferenceScopeContacts.length}`, `Targets: ${preferenceScopeContacts.length}`) }}
            </p>
          </div>

          <label class="block space-y-1">
            <span class="text-[11px] text-gray-500">{{ t('应用范围', 'Apply scope') }}</span>
            <select
              v-model="prefScope"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none"
            >
              <option
                v-for="option in prefScopeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5">
              <input v-model="prefDraft.suggestedRepliesEnabled" type="checkbox" class="accent-blue-500" />
              <span>{{ t('建议回复', 'Suggested replies') }}</span>
            </label>
            <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5">
              <input v-model="prefDraft.allowQuoteReply" type="checkbox" class="accent-blue-500" />
              <span>{{ t('允许引用用户', 'Allow quote user') }}</span>
            </label>
            <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5">
              <input v-model="prefDraft.allowSelfQuote" type="checkbox" class="accent-blue-500" />
              <span>{{ t('允许引用自己', 'Allow quote self') }}</span>
            </label>
            <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5">
              <input v-model="prefDraft.virtualVoiceEnabled" type="checkbox" class="accent-blue-500" />
              <span>{{ t('虚拟语音块', 'Virtual voice card') }}</span>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <label class="block space-y-1">
              <span class="text-gray-500">{{ t('回复模式', 'Reply mode') }}</span>
              <select
                v-model="prefDraft.replyMode"
                class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none"
              >
                <option
                  v-for="option in replyModeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="block space-y-1">
              <span class="text-gray-500">{{ t('风格', 'Style') }}</span>
              <select
                v-model="prefDraft.responseStyle"
                class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none"
              >
                <option
                  v-for="option in responseStyleOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
            <label class="block space-y-1">
              <span class="text-gray-500">{{ t('每轮条数', 'Replies per turn') }}</span>
              <input
                v-model.number="prefDraft.replyCount"
                type="number"
                min="1"
                max="3"
                class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
              />
            </label>
            <label class="block space-y-1">
              <span class="text-gray-500">{{ t('自动间隔（秒）', 'Auto interval (sec)') }}</span>
              <input
                v-model.number="prefDraft.autoInvokeIntervalSec"
                type="number"
                min="60"
                max="86400"
                class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
              />
            </label>
          </div>

          <label class="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px]">
            <input v-model="prefDraft.autoInvokeEnabled" type="checkbox" class="accent-blue-500" />
            <span>{{ t('启用自主调用（会话级）', 'Enable autonomous invoke (thread-level)') }}</span>
          </label>

          <p class="text-[10px] text-gray-500">
            {{
              t(
                '这里只会覆盖当前页面展示的偏好字段，不会改写上下文轮数与翻译语言等其他项。',
                'Only fields shown here will be overwritten. Context turns and translation language are kept.',
              )
            }}
          </p>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              @click="resetPreferenceTemplate"
              class="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 text-[11px]"
            >
              {{ t('恢复默认模板', 'Reset template') }}
            </button>
            <button
              @click="applyPreferencesToScope"
              class="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[11px] hover:bg-blue-100"
            >
              {{ t('应用到范围会话', 'Apply to scope') }}
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-gray-900">{{ t('范围预览', 'Scope preview') }}</p>
            <p class="text-[11px] text-gray-400">
              {{ t(`显示前 ${Math.min(preferenceScopePreviewContacts.length, 8)} 条`, `Showing first ${Math.min(preferenceScopePreviewContacts.length, 8)}`) }}
            </p>
          </div>
          <div v-if="preferenceScopeContacts.length === 0" class="text-xs text-gray-400 py-1">
            {{ t('当前范围没有会话。', 'No conversations in selected scope.') }}
          </div>
          <div v-else class="space-y-1.5">
            <div
              v-for="contact in preferenceScopePreviewContacts"
              :key="contact.id"
              class="rounded-lg border border-gray-100 px-2 py-1.5 flex items-center justify-between gap-2"
            >
              <p class="text-xs text-gray-700 truncate">{{ contact.name }}</p>
              <span class="text-[10px] text-gray-500">{{ contactKindTag(contact) }}</span>
            </div>
            <p
              v-if="preferenceScopeContacts.length > preferenceScopePreviewContacts.length"
              class="text-[10px] text-gray-400"
            >
              {{
                t(
                  `还有 ${preferenceScopeContacts.length - preferenceScopePreviewContacts.length} 个会话未展开显示。`,
                  `${preferenceScopeContacts.length - preferenceScopePreviewContacts.length} more conversations are hidden in preview.`,
                )
              }}
            </p>
          </div>
        </div>
      </template>

      <template v-else-if="isIdentityFeature">
        <div class="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <p class="text-[11px] text-gray-500">
            {{
              t(
                '这里现在只管理 Chat 内的用户身份，不再在此处配置 AI 角色的模块级头像。',
                'This page now manages only the user identity inside Chat and no longer configures AI-role module avatars here.',
              )
            }}
          </p>
          <p class="text-sm font-semibold text-gray-900">{{ t('Chat 用户身份', 'Chat user identity') }}</p>
          <label class="block space-y-1">
            <span class="text-[11px] text-gray-500">{{ t('模块头像', 'Module avatar') }}</span>
            <input
              v-model="moduleIdentityDraft.avatar"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
              placeholder="https://..."
            />
          </label>
          <label class="block space-y-1">
            <span class="text-[11px] text-gray-500">{{ t('模块昵称', 'Module nickname') }}</span>
            <input
              v-model="moduleIdentityDraft.nickname"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
              :placeholder="user.name || t('默认使用全局昵称', 'Falls back to global profile name')"
            />
          </label>
          <p class="text-[10px] text-gray-400">
            {{ t(`当前 Chat 默认昵称：${moduleIdentityPreviewName}`, `Current Chat display name: ${moduleIdentityPreviewName}`) }}
          </p>
          <div class="flex justify-end gap-2 pt-1">
            <button
              @click="resetModuleIdentityDraft"
              class="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600"
            >
              {{ t('清空', 'Clear') }}
            </button>
            <button
              @click="saveModuleIdentity"
              class="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700"
            >
              {{ t('保存 Chat 身份', 'Save Chat identity') }}
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-gray-900">{{ t('匿名模式', 'Anonymous mode') }}</p>
            <input v-model="moduleIdentityDraft.anonymityEnabled" type="checkbox" class="accent-blue-500" />
          </div>
          <p class="text-[11px] text-gray-500">
            {{
              t(
                '开启后，AI 默认不知道你的真实身份，会按陌生人关系开始互动。',
                'When enabled, AI will not assume it knows the real user identity and should start from a stranger baseline.',
              )
            }}
          </p>
          <label class="block space-y-1" v-if="moduleIdentityDraft.anonymityEnabled">
            <span class="text-[11px] text-gray-500">{{ t('匿名范围', 'Anonymity scope') }}</span>
            <select
              v-model="moduleIdentityDraft.anonymityScope"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none"
            >
              <option v-for="option in anonymityScopeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <div
            v-if="moduleIdentityDraft.anonymityEnabled && moduleIdentityDraft.anonymityScope === 'selected'"
            class="space-y-2"
          >
            <div v-if="contacts.length === 0" class="text-xs text-gray-400 py-2">
              {{ t('暂无可选的会话对象。', 'No chat contacts available yet.') }}
            </div>
            <div v-else class="space-y-2">
              <label
                v-for="contact in contacts"
                :key="contact.id"
                class="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2"
              >
                <input
                  :checked="isAnonymousContactSelected(contact.id)"
                  @change="toggleAnonymousContact(contact.id)"
                  type="checkbox"
                  class="accent-blue-500"
                />
                <div class="w-8 h-8 rounded-lg overflow-hidden bg-gray-200">
                  <img :src="chatStore.resolveContactAvatar(contact.id)" class="w-full h-full object-cover" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium truncate">{{ contact.name }}</p>
                  <p class="text-[10px] text-gray-500">{{ contactKindTag(contact) }}</p>
                </div>
              </label>
            </div>
            <p class="text-[10px] text-gray-400">
              {{
                targetedAnonymousContacts.length > 0
                  ? t(
                      `已选择 ${targetedAnonymousContacts.length} 个对象启用匿名。`,
                      `${targetedAnonymousContacts.length} contacts will use anonymous mode.`,
                    )
                  : t('当前还没有选择定向匿名对象。', 'No targeted anonymous contacts selected yet.')
              }}
            </p>
          </div>
        </div>

      </template>

      <template v-else-if="isLabsFeature">
        <div class="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p class="text-sm font-semibold text-gray-900">{{ t('自动调度修复', 'Auto schedule repair') }}</p>
          <p class="text-[11px] text-gray-500">
            {{
              t(
                '修复会话自动调用检查点，避免长时间后台后出现过期调度。',
                'Normalize autonomous invoke checkpoints to prevent stale schedules after long background periods.',
              )
            }}
          </p>
          <button
            @click="normalizeAutoInvokeCheckpointsNow"
            class="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] hover:bg-emerald-100"
          >
            {{ t('执行检查点修复', 'Normalize checkpoints') }}
          </button>
        </div>

        <div class="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p class="text-sm font-semibold text-gray-900">{{ t('覆写清理工具', 'Override cleanup tools') }}</p>
          <p class="text-[11px] text-gray-500">
            {{
              t(
                '用于重置头像或身份覆写，不会删除主通讯录档案与消息记录。',
                'Resets avatar/identity overrides without deleting global profile records or messages.',
              )
            }}
          </p>
          <div class="flex flex-wrap items-center gap-2">
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

        <div class="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <p class="text-sm font-semibold text-gray-900">{{ t('诊断入口', 'Diagnostics entry') }}</p>
          <p class="text-[11px] text-gray-500">
            {{ t('可跳转到网络页查看 API / 存储报告。', 'Open Network page for API/storage reports.') }}
          </p>
          <button
            @click="openNetworkCenter"
            class="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[11px] hover:bg-blue-100"
          >
            {{ t('打开网络与报告中心', 'Open network & reports') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>



