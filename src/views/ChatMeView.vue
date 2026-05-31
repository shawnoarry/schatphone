<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'
import ChatAppTabBar from '../components/chat/ChatAppTabBar.vue'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const systemStore = useSystemStore()
const { contactsForList } = storeToRefs(chatStore)
const { user } = storeToRefs(systemStore)
const { t } = useI18n()

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

onBeforeUnmount(() => {
  if (actionFeedbackTimerId) clearTimeout(actionFeedbackTimerId)
})

const contacts = computed(() => contactsForList.value || [])
const activeSection = computed(() => (typeof route.query.section === 'string' ? route.query.section : ''))
const isServiceContact = (contact) => ['service', 'official'].includes(contact?.kind || '')
const socialContacts = computed(() => contacts.value.filter((contact) => !isServiceContact(contact)))
const moduleIdentityState = computed(() => chatStore.getModuleIdentity())
const chatDisplayName = computed(
  () => moduleIdentityState.value.nickname || user.value.name || t('自己', 'Me'),
)
const chatAvatar = computed(() => moduleIdentityState.value.avatar || '')
const chatInitial = computed(() => chatDisplayName.value.trim().slice(0, 1).toUpperCase() || 'C')
const chatAnonymityText = computed(() => {
  if (!moduleIdentityState.value.anonymityEnabled) return t('匿名未开启', 'Anonymity off')
  if (moduleIdentityState.value.anonymityScope === 'selected') {
    const count = moduleIdentityState.value.anonymityContactIds.length
    return t(`对 ${count} 个对象匿名`, `Anonymous to ${count} contacts`)
  }
  return t('对全部会话匿名', 'Anonymous to all chats')
})

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

const moduleIdentityPreviewName = computed(
  () => moduleIdentityDraft.nickname || user.value.name || t('自己', 'Me'),
)

const targetedAnonymousContacts = computed(() => {
  const selected = new Set(moduleIdentityDraft.anonymityContactIds.map((id) => Number(id)))
  return socialContacts.value.filter((contact) => selected.has(Number(contact.id)))
})

const saveModuleIdentity = () => {
  const changed = chatStore.setModuleIdentity({
    avatar: moduleIdentityDraft.avatar,
    nickname: moduleIdentityDraft.nickname,
    anonymityEnabled: Boolean(moduleIdentityDraft.anonymityEnabled),
    anonymityScope: moduleIdentityDraft.anonymityScope,
    anonymityContactIds: [...moduleIdentityDraft.anonymityContactIds],
  })
  if (!changed) {
    showActionFeedback('warning', t('Chat 身份没有变化。', 'No Chat identity changes detected.'))
    return
  }
  chatStore.saveNow()
  showActionFeedback('success', t('Chat 身份已保存。', 'Chat identity saved.'))
}

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

const contactKindTag = (contact) => {
  if (!contact) return ''
  if (contact.kind === 'group') return t('群聊', 'Group')
  if (contact.isMain) return t('主角色', 'Main')
  return t('角色', 'Role')
}

const messagePreviewText = (message = {}) => {
  if (typeof message.content === 'string' && message.content.trim()) return message.content.trim()
  const textBlock = Array.isArray(message.blocks)
    ? message.blocks.find((block) => block?.type === 'text' && typeof block.text === 'string' && block.text.trim())
    : null
  if (textBlock) return textBlock.text.trim()
  const firstBlock = Array.isArray(message.blocks) ? message.blocks[0] : null
  if (firstBlock?.type === 'image_virtual') return t('图片消息', 'Image message')
  if (firstBlock?.type === 'voice_virtual') return t('语音消息', 'Voice message')
  if (firstBlock?.type === 'module_link' || firstBlock?.type === 'link_external') return t('链接消息', 'Link message')
  if (firstBlock?.type === 'transfer_virtual') return t('转账消息', 'Transfer message')
  if (firstBlock?.type === 'mini_scene') return firstBlock.title || t('互动消息', 'Interactive message')
  return t('消息', 'Message')
}

const formatRelativeActivity = (timestamp) => {
  const time = Number(timestamp)
  if (!Number.isFinite(time) || time <= 0) return t('未开始', 'Not started')
  const diffMs = Math.max(0, Date.now() - time)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return t('刚刚', 'Just now')
  if (minutes < 60) return t(`${minutes} 分钟前`, `${minutes} min ago`)
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t(`${hours} 小时前`, `${hours} hr ago`)
  const days = Math.floor(hours / 24)
  return t(`${days} 天前`, `${days} days ago`)
}

const recentInteractionRows = computed(() => {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  return socialContacts.value
    .map((contact) => {
      const conversation = chatStore.getConversationByContactId(contact.id)
      const messages = chatStore.getMessagesByContactId(contact.id) || []
      const recentMessages = messages.filter((message) => Number(message.createdAt || 0) >= cutoff)
      const lastActivityAt = Math.max(
        Number(conversation?.lastMessageAt || 0),
        Number(conversation?.updatedAt || 0),
        ...messages.map((message) => Number(message.createdAt || 0)),
      )
      return {
        id: contact.id,
        name: contact.name,
        kind: contactKindTag(contact),
        avatar: chatStore.resolveContactAvatar(contact.id),
        recentCount: recentMessages.length,
        lastActivityAt,
      }
    })
    .filter((row) => row.recentCount > 0 || row.lastActivityAt > 0)
    .sort((left, right) => {
      if (right.recentCount !== left.recentCount) return right.recentCount - left.recentCount
      return right.lastActivityAt - left.lastActivityAt
    })
    .slice(0, 5)
})

const savedMessageRows = computed(() =>
  socialContacts.value
    .flatMap((contact) => {
      const messages = chatStore.getMessagesByContactId(contact.id) || []
      return messages
        .filter((message) => Number(message.savedAt || 0) > 0)
        .map((message) => ({
          id: `${contact.id}-${message.id}`,
          messageId: message.id,
          contactId: contact.id,
          contactName: contact.name,
          contactKind: contactKindTag(contact),
          avatar: chatStore.resolveContactAvatar(contact.id),
          preview: messagePreviewText(message),
          savedAt: Number(message.savedAt || 0),
          roleLabel: message.role === 'user' ? t('我', 'Me') : contact.name,
        }))
    })
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(0, 5),
)

const dynamicFeedItems = computed(() => {
  const items = []
  const topRecent = recentInteractionRows.value[0]
  if (topRecent) {
    items.push({
      id: 'recent',
      icon: 'fas fa-comment-dots',
      title: t('最近聊得最多', 'Most chatted recently'),
      detail: t(
        `${topRecent.name} · ${topRecent.recentCount || 1} 条近况`,
        `${topRecent.name} · ${topRecent.recentCount || 1} recent messages`,
      ),
    })
  }

  const savedCount = savedMessageRows.value.length
  if (savedCount > 0) {
    items.push({
      id: 'saved',
      icon: 'fas fa-bookmark',
      title: t('收藏回看', 'Saved for later'),
      detail: t(`${savedCount} 条收藏消息可从这里回到原会话`, `${savedCount} saved messages link back to their threads`),
    })
  }

  const groups = socialContacts.value.filter((contact) => contact.kind === 'group')
  if (groups.length > 0) {
    items.push({
      id: 'groups',
      icon: 'fas fa-comments',
      title: t('群聊近况', 'Group activity'),
      detail: t(`${groups.length} 个群聊保持在列表中`, `${groups.length} groups are active in Chat`),
    })
  }

  const roles = socialContacts.value.filter((contact) => (contact.kind || 'role') === 'role')
  if (roles.length > 0) {
    items.push({
      id: 'roles',
      icon: 'fas fa-user-friends',
      title: t('角色会话', 'Role chats'),
      detail: t(`${roles.length} 个角色保留在 Chat 社交面板`, `${roles.length} role chats stay in the Chat social surface`),
    })
  }

  if (moduleIdentityState.value.anonymityEnabled) {
    items.push({
      id: 'anonymous',
      icon: 'fas fa-user-secret',
      title: t('匿名状态', 'Anonymity status'),
      detail: chatAnonymityText.value,
    })
  }

  return items.slice(0, 4)
})

const openChatThread = (contactId) => {
  const id = Number(contactId)
  if (!Number.isFinite(id) || id <= 0) return
  router.push(`/chat/${id}`)
}

const sectionCardClass = (section) =>
  activeSection.value === section ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-gray-200'

const quickActions = computed(() => [
  {
    id: 'identity',
    label: t('身份与匿名', 'Identity & Anonymity'),
    icon: 'fas fa-user-secret',
    action: () => router.push({ path: '/chat-me', query: { section: 'identity' } }),
  },
  {
    id: 'saved',
    label: t('收藏消息', 'Saved Messages'),
    icon: 'fas fa-bookmark',
    action: () => router.push({ path: '/chat-me', query: { section: 'saved' } }),
  },
  {
    id: 'feed',
    label: t('我的动态', 'My Feed'),
    icon: 'fas fa-bolt',
    action: () => router.push({ path: '/chat-me', query: { section: 'feed' } }),
  },
])

watch(
  () => route.query.section,
  () => {
    actionFeedbackType.value = ''
    actionFeedbackMessage.value = ''
  },
)

watch(moduleIdentityState, syncIdentityDraft, { immediate: true })
</script>

<template>
  <div class="w-full h-full bg-[#f2f2f7] text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center gap-3">
      <button @click="router.push('/chat')" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('聊天', 'Chat') }}
      </button>
      <h1 class="font-bold text-xl">{{ t('我', 'Me') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
      <section class="rounded-[28px] border border-yellow-100 bg-yellow-50 px-5 py-5">
        <div class="flex items-center gap-4">
          <div class="h-20 w-20 shrink-0 overflow-hidden rounded-[24px] bg-white shadow-sm">
            <img
              v-if="chatAvatar"
              :src="chatAvatar"
              :alt="chatDisplayName"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-2xl font-bold text-yellow-700">
              {{ chatInitial }}
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-2xl font-bold leading-tight text-gray-950">{{ chatDisplayName }}</p>
            <p class="mt-1 text-sm text-gray-600">{{ chatAnonymityText }}</p>
            <button
              type="button"
              class="mt-3 rounded-full border border-yellow-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-800"
              @click="router.push({ path: '/chat-me', query: { section: 'identity' } })"
            >
              <i class="fas fa-user-secret mr-1 text-yellow-700"></i>
              {{ t('Chat 身份与匿名', 'Chat Identity & Anonymity') }}
            </button>
          </div>
        </div>
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

      <section class="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-3">
        <button
          v-for="item in quickActions"
          :key="item.id"
          type="button"
          class="rounded-xl border border-gray-100 px-2 py-3 text-center hover:bg-gray-50"
          :data-testid="`chat-me-quick-${item.id}`"
          @click="item.action"
        >
          <i :class="item.icon" class="text-base text-yellow-700"></i>
          <span class="mt-1 block text-[11px] font-semibold text-gray-800">{{ item.label }}</span>
        </button>
      </section>

      <section
        class="rounded-2xl border bg-white p-4 space-y-3"
        :class="sectionCardClass('saved')"
        data-testid="chat-me-saved-section"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ t('收藏消息', 'Saved Messages') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ t('长按普通会话消息即可收藏，点击收藏回到原会话。', 'Long-press a normal chat message to save it; tap a saved item to return to its thread.') }}
            </p>
          </div>
          <span class="rounded-full bg-yellow-50 px-2 py-1 text-[10px] font-semibold text-yellow-700">
            {{ savedMessageRows.length }}
          </span>
        </div>

        <div v-if="savedMessageRows.length === 0" class="rounded-xl border border-dashed border-gray-200 px-3 py-5 text-center text-xs text-gray-400">
          {{ t('还没有收藏消息。', 'No saved messages yet.') }}
        </div>
        <div v-else class="space-y-2">
          <button
            v-for="row in savedMessageRows"
            :key="row.id"
            type="button"
            class="w-full rounded-xl border border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
            :data-testid="`chat-me-saved-message-${row.messageId}`"
            @click="openChatThread(row.contactId)"
          >
            <span class="flex items-start gap-3">
              <span class="h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-gray-200">
                <img :src="row.avatar" class="h-full w-full object-cover" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-center justify-between gap-2">
                  <span class="truncate text-sm font-semibold text-gray-900">{{ row.contactName }}</span>
                  <span class="shrink-0 text-[10px] text-gray-400">{{ formatRelativeActivity(row.savedAt) }}</span>
                </span>
                <span class="mt-0.5 block text-[11px] text-gray-500">
                  {{ row.contactKind }} · {{ row.roleLabel }}
                </span>
                <span class="mt-1 block line-clamp-2 text-xs leading-4 text-gray-700">{{ row.preview }}</span>
              </span>
            </span>
          </button>
        </div>
      </section>

      <section class="rounded-2xl border bg-white p-4 space-y-3" :class="sectionCardClass('recent')">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ t('近期聊得最多', 'Recent interactions') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">{{ t('近 7 天', 'Last 7 days') }}</p>
          </div>
          <span class="rounded-full bg-yellow-50 px-2 py-1 text-[10px] font-semibold text-yellow-700">
            {{ recentInteractionRows.length }}
          </span>
        </div>

        <div v-if="recentInteractionRows.length === 0" class="rounded-xl border border-dashed border-gray-200 px-3 py-5 text-center text-xs text-gray-400">
          {{ t('还没有近期互动。', 'No recent interactions yet.') }}
        </div>
        <div v-else class="space-y-2">
          <article
            v-for="row in recentInteractionRows"
            :key="row.id"
            class="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2"
          >
            <div class="h-10 w-10 overflow-hidden rounded-2xl bg-gray-200">
              <img :src="row.avatar" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-gray-900">{{ row.name }}</p>
              <p class="text-[11px] text-gray-500">{{ row.kind }} · {{ formatRelativeActivity(row.lastActivityAt) }}</p>
            </div>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
              {{ row.recentCount || 1 }}
            </span>
          </article>
        </div>
      </section>

      <section class="rounded-2xl border bg-white p-4 space-y-3" :class="sectionCardClass('feed')">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-gray-900">{{ t('我的动态', 'My Feed') }}</p>
          <span class="text-[11px] text-gray-400">{{ t('Chat', 'Chat') }}</span>
        </div>
        <div v-if="dynamicFeedItems.length === 0" class="rounded-xl border border-dashed border-gray-200 px-3 py-5 text-center text-xs text-gray-400">
          {{ t('动态会从已有会话里生成。', 'Feed items come from existing chat activity.') }}
        </div>
        <div v-else class="space-y-2">
          <article
            v-for="item in dynamicFeedItems"
            :key="item.id"
            class="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2"
          >
            <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
              <i :class="item.icon"></i>
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-gray-900">{{ item.title }}</span>
              <span class="block text-[11px] leading-4 text-gray-500">{{ item.detail }}</span>
            </span>
          </article>
        </div>
      </section>

      <section
        class="rounded-2xl border bg-white p-4 space-y-3"
        :class="sectionCardClass('identity')"
        data-testid="chat-me-identity-section"
      >
        <div>
          <p class="text-sm font-semibold text-gray-900">{{ t('Chat 身份与匿名', 'Chat Identity & Anonymity') }}</p>
          <p class="mt-1 text-[11px] text-gray-500">
            {{ t('头像、昵称与匿名范围只影响 Chat 内的自己。', 'Avatar, nickname, and anonymity scope apply only to your Chat presence.') }}
          </p>
        </div>

        <label class="block space-y-1">
          <span class="text-[11px] text-gray-500">{{ t('头像 URL', 'Avatar URL') }}</span>
          <input
            v-model="moduleIdentityDraft.avatar"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
            placeholder="https://..."
          />
        </label>

        <label class="block space-y-1">
          <span class="text-[11px] text-gray-500">{{ t('Chat 昵称', 'Chat nickname') }}</span>
          <input
            v-model="moduleIdentityDraft.nickname"
            type="text"
            class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
            :placeholder="user.name || t('默认使用全局昵称', 'Falls back to global profile name')"
          />
        </label>
        <p class="text-[10px] text-gray-400">
          {{ t(`当前 Chat 昵称：${moduleIdentityPreviewName}`, `Current Chat display name: ${moduleIdentityPreviewName}`) }}
        </p>

        <div class="rounded-xl border border-gray-100 px-3 py-3 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-gray-900">{{ t('匿名模式', 'Anonymous mode') }}</p>
            <input v-model="moduleIdentityDraft.anonymityEnabled" type="checkbox" class="accent-blue-500" />
          </div>
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
            <div v-if="socialContacts.length === 0" class="text-xs text-gray-400 py-2">
              {{ t('暂无可选角色或群聊。', 'No role or group chats available yet.') }}
            </div>
            <div v-else class="space-y-2">
              <label
                v-for="contact in socialContacts"
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
                  : t('还没有选择定向匿名对象。', 'No targeted anonymous contacts selected yet.')
              }}
            </p>
          </div>
        </div>

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
      </section>
    </div>

    <ChatAppTabBar active="me" />
  </div>
</template>
