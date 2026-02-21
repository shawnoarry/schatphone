<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useMapStore } from '../stores/map'
import { callAI, formatApiErrorForUi } from '../lib/ai'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const mapStore = useMapStore()

const { settings, user } = storeToRefs(systemStore)
const { contacts, contactsForList, loadingAI } = storeToRefs(chatStore)
const { currentLocationText } = storeToRefs(mapStore)

const inputMessage = ref('')
const chatContainer = ref(null)

const loadingSuggestions = ref(false)
const suggestions = ref([])
const showSuggestions = ref(false)
const aiErrorMessage = ref('')
const MANUAL_TRIGGER_ID = '__manual__'
const activeAbortController = ref(null)
const activeTriggerMessageId = ref('')
const retryTriggerMessageId = ref('')
const showStatusMenu = ref(false)
const showCreateMenu = ref(false)
const showServiceMenu = ref(false)
const showCreateModal = ref(false)
const createMode = ref('direct')
const showThreadMenu = ref(false)
const serviceTemplateDraft = ref('')

const STATUS_OPTIONS = [
  { id: 'idle', label: '空闲', hint: '可聊天', dotClass: 'chat-status-dot-idle' },
  { id: 'busy', label: '忙碌', hint: '少打扰', dotClass: 'chat-status-dot-busy' },
  { id: 'away', label: '离开', hint: '暂离线', dotClass: 'chat-status-dot-away' },
]

const createDraft = reactive({
  name: '',
  role: '',
  bio: '',
})

const activeChatId = computed(() => {
  const id = Number(route.params.id)
  return Number.isNaN(id) ? null : id
})

const activeChat = computed(() => {
  if (!activeChatId.value) return null
  return contacts.value.find((contact) => contact.id === activeChatId.value) || null
})

const activeMessages = computed(() => {
  if (!activeChat.value) return []
  return chatStore.getMessagesByContactId(activeChat.value.id) || []
})

const currentStatus = computed(() => {
  const statusId = typeof user.value.chatStatus === 'string' ? user.value.chatStatus : 'idle'
  return STATUS_OPTIONS.find((item) => item.id === statusId) || STATUS_OPTIONS[0]
})

const pendingReplyTriggerMessageId = computed(() => {
  const list = activeMessages.value
  if (!list.length) return ''

  let lastAssistantIndex = -1
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].role === 'assistant') {
      lastAssistantIndex = i
    }
  }

  for (let i = list.length - 1; i > lastAssistantIndex; i -= 1) {
    if (list[i].role === 'user') {
      return list[i].id
    }
  }

  return ''
})

const canCancelAi = computed(
  () =>
    Boolean(
      activeAbortController.value &&
        activeChat.value &&
        loadingAI.value,
    ),
)

const canRetryAi = computed(() =>
  Boolean(
      aiErrorMessage.value &&
      activeChat.value &&
      retryTriggerMessageId.value &&
      !loadingAI.value &&
      !activeAbortController.value,
  ),
)

const canRequestAiReply = computed(() => Boolean(activeChat.value && !loadingAI.value && !activeAbortController.value))
const isActiveServiceChat = computed(() =>
  Boolean(activeChat.value && ['service', 'official'].includes(activeChat.value.kind || 'role')),
)

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const goHome = () => {
  router.push('/home')
}

const leaveChat = () => {
  router.push('/chat')
}

const enterChat = (contact) => {
  chatStore.ensureConversationForContact(contact.id)
  chatStore.markConversationRead(contact.id)
  router.push(`/chat/${contact.id}`)
}

const closeMenus = () => {
  showStatusMenu.value = false
  showCreateMenu.value = false
  showServiceMenu.value = false
}

const toggleStatusMenu = () => {
  const next = !showStatusMenu.value
  closeMenus()
  showStatusMenu.value = next
}

const toggleCreateMenu = () => {
  const next = !showCreateMenu.value
  closeMenus()
  showCreateMenu.value = next
}

const toggleServiceMenu = () => {
  const next = !showServiceMenu.value
  closeMenus()
  showServiceMenu.value = next
}

const setUserStatus = (statusId) => {
  const exists = STATUS_OPTIONS.some((item) => item.id === statusId)
  if (!exists) return
  user.value.chatStatus = statusId
  closeMenus()
}

const openCreateModal = (mode) => {
  createMode.value = mode
  showCreateModal.value = true
  showCreateMenu.value = false
  showServiceMenu.value = false
  createDraft.name = ''
  createDraft.role = ''
  createDraft.bio = ''
}

const closeCreateModal = () => {
  showCreateModal.value = false
}

const createContactFromModal = () => {
  const name = createDraft.name.trim()
  if (!name) {
    alert('请输入名称。')
    return
  }

  if (createMode.value === 'direct') {
    const created = chatStore.addContact({
      name,
      role: createDraft.role.trim() || 'AI角色',
      bio: createDraft.bio.trim(),
      kind: 'role',
      isMain: false,
    })
    closeCreateModal()
    enterChat(created)
    return
  }

  if (createMode.value === 'group') {
    const roleSummary = createDraft.role.trim() || '未配置角色绑定'
    const created = chatStore.addContact({
      name,
      role: `群聊 · ${roleSummary}`,
      bio: createDraft.bio.trim(),
      kind: 'group',
      isMain: false,
    })
    closeCreateModal()
    enterChat(created)
    return
  }

  if (createMode.value === 'service' || createMode.value === 'official') {
    const created = chatStore.addContact({
      name,
      role: createMode.value === 'service' ? '服务号' : '公众号',
      bio: createDraft.bio.trim(),
      serviceTemplate: createDraft.role.trim(),
      kind: createMode.value,
      isMain: false,
    })
    closeCreateModal()
    enterChat(created)
  }
}

const buildSystemPrompt = (contact) => {
  const contactKind = contact.kind || 'role'
  const typeLabel =
    contactKind === 'group' ? '群聊' : contactKind === 'service' ? '服务号' : contactKind === 'official' ? '公众号' : '角色'

  const serviceInstruction =
    contactKind === 'service' || contactKind === 'official'
      ? `服务模板: ${contact.serviceTemplate || '默认服务助手风格，偏简洁指引'}`
      : `角色设定: ${contact.bio || '无'}`

  return `
世界观: ${user.value.worldBook}
用户: ${user.value.name}, ${user.value.bio}
会话类型: ${typeLabel}
你的角色: ${contact.name} (${contact.role})
${serviceInstruction}
请保持身份一致，不要声明自己是 AI，回复尽量简短自然。`
}

const toAiMessages = (contactId, untilMessageId = '') => {
  const allMessages = chatStore.getMessagesByContactId(contactId)
  const result = []

  for (const item of allMessages) {
    result.push({ role: item.role, content: item.content })
    if (untilMessageId && item.id === untilMessageId) {
      break
    }
  }

  return result.slice(-10)
}

const generateAIResponse = async (contactId, triggerMessageId, options = {}) => {
  const contact = contacts.value.find((item) => item.id === contactId)
  if (!contact) throw new Error('Contact not found')

  const replyText = await callAI({
    messages: toAiMessages(contactId, triggerMessageId),
    systemPrompt: buildSystemPrompt(contact),
    settings: settings.value,
    signal: options.signal,
  })

  chatStore.appendMessage(contactId, {
    role: 'assistant',
    content: replyText,
    status: 'sent',
  })

  if (activeChatId.value === contactId) {
    chatStore.markConversationRead(contactId)
  } else {
    chatStore.incrementConversationUnread(contactId, 1)
  }
}

const requestAiReply = async (contactId, triggerMessageId) => {
  if (!contactId) return
  if (loadingAI.value || activeAbortController.value) return

  const normalizedTriggerId = triggerMessageId || MANUAL_TRIGGER_ID
  const controller = new AbortController()
  activeAbortController.value = controller
  activeTriggerMessageId.value = normalizedTriggerId
  loadingAI.value = true
  aiErrorMessage.value = ''

  try {
    await generateAIResponse(
      contactId,
      normalizedTriggerId === MANUAL_TRIGGER_ID ? '' : normalizedTriggerId,
      { signal: controller.signal },
    )
    retryTriggerMessageId.value = ''
  } catch (error) {
    aiErrorMessage.value =
      error?.code === 'CANCELED'
        ? formatApiErrorForUi(error, '请求已取消。')
        : formatApiErrorForUi(error, 'AI 回复失败，请稍后重试。')
    retryTriggerMessageId.value = normalizedTriggerId
  } finally {
    loadingAI.value = false
    activeAbortController.value = null
    activeTriggerMessageId.value = ''
    scrollToBottom()
  }
}

const cancelActiveRequest = () => {
  if (!activeAbortController.value) return
  activeAbortController.value.abort()
}

const retryLastMessage = () => {
  if (!canRetryAi.value || !activeChat.value || !retryTriggerMessageId.value) return
  aiErrorMessage.value = ''
  requestAiReply(activeChat.value.id, retryTriggerMessageId.value)
}

const requestPendingAiReply = () => {
  if (!activeChat.value) return
  const triggerMessageId = pendingReplyTriggerMessageId.value || MANUAL_TRIGGER_ID
  requestAiReply(activeChat.value.id, triggerMessageId)
}

const generateSmartReplies = async () => {
  if (!activeChat.value || loadingAI.value || activeAbortController.value) return

  loadingSuggestions.value = true
  const recentHistory = toAiMessages(activeChat.value.id).slice(-5)

  const promptMsg = {
    role: 'user',
    content: '请基于以上对话，生成 3 个简短回复选项。只返回 JSON 数组字符串，例如 ["好的","没问题","稍后说"]。',
  }

  try {
    let text = await callAI({
      messages: [...recentHistory, promptMsg],
      systemPrompt: '你是一个辅助工具，仅输出合法 JSON。',
      settings: settings.value,
    })

    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const suggestionsArray = JSON.parse(text)

    if (Array.isArray(suggestionsArray)) {
      suggestions.value = suggestionsArray.slice(0, 3)
      showSuggestions.value = true
    }
  } catch (error) {
    console.error('Smart reply failed', error)
  } finally {
    loadingSuggestions.value = false
  }
}

const sendMessage = () => {
  if (!inputMessage.value.trim() || !activeChat.value) return

  const chatId = activeChat.value.id
  const payload = inputMessage.value.trim()

  chatStore.appendMessage(chatId, {
    role: 'user',
    content: payload,
    status: 'sent',
  })

  inputMessage.value = ''
  chatStore.setConversationDraft(chatId, '')
  showSuggestions.value = false
  aiErrorMessage.value = ''
  retryTriggerMessageId.value = ''
  scrollToBottom()
}

const sendCurrentLocation = () => {
  if (!activeChat.value) return

  const locationText = currentLocationText.value
  if (!locationText || locationText.includes('未设置')) {
    alert('请先在 Map 页面设置当前位置。')
    return
  }

  const chatId = activeChat.value.id
  const payload = `📍 位置共享\n${locationText}`

  chatStore.appendMessage(chatId, {
    role: 'user',
    content: payload,
    status: 'sent',
  })

  showSuggestions.value = false
  aiErrorMessage.value = ''
  retryTriggerMessageId.value = ''
  scrollToBottom()
}

const useSuggestion = (text) => {
  inputMessage.value = text
}

const renderMarkdown = (text) => marked.parse(text || '')

const getConversationPreview = (contactId) => {
  return chatStore.getConversationByContactId(contactId)
}

const formatConversationTime = (timestamp) => {
  if (!timestamp) return '昨天'

  const now = new Date()
  const target = new Date(timestamp)

  const isSameDay =
    now.getFullYear() === target.getFullYear() &&
    now.getMonth() === target.getMonth() &&
    now.getDate() === target.getDate()

  if (isSameDay) {
    return target.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const dayDiff = Math.floor((now.getTime() - target.getTime()) / 86400000)
  if (dayDiff <= 1) return '昨天'
  return `${target.getMonth() + 1}/${target.getDate()}`
}

const contactPreviewText = (contactId) => {
  const conversation = getConversationPreview(contactId)
  if (conversation?.draft?.trim()) {
    return `草稿: ${conversation.draft.trim()}`
  }
  return conversation?.lastMessage || '点击开始聊天'
}

const contactKindTag = (contact) => {
  if (!contact) return ''
  if (contact.kind === 'group') return '群聊'
  if (contact.kind === 'service') return '服务号'
  if (contact.kind === 'official') return '公众号'
  if (contact.isMain) return 'Main'
  return ''
}

const contactKindTagClass = (contact) => {
  if (!contact) return ''
  if (contact.kind === 'group') return 'bg-indigo-100 text-indigo-700'
  if (contact.kind === 'service') return 'bg-emerald-100 text-emerald-700'
  if (contact.kind === 'official') return 'bg-sky-100 text-sky-700'
  if (contact.isMain) return 'bg-yellow-100 text-yellow-700'
  return ''
}

const messageStatusText = (message) => {
  if (message.role !== 'user') return ''
  if (message.status === 'failed') return '发送失败'
  if (message.status === 'sending') return '发送中...'
  return ''
}

const toggleThreadMenu = () => {
  showThreadMenu.value = !showThreadMenu.value
  if (showThreadMenu.value && isActiveServiceChat.value) {
    serviceTemplateDraft.value = activeChat.value?.serviceTemplate || ''
  }
}

const saveServiceTemplate = () => {
  if (!activeChat.value || !isActiveServiceChat.value) return
  chatStore.updateContact(activeChat.value.id, {
    serviceTemplate: serviceTemplateDraft.value.trim(),
  })
  showThreadMenu.value = false
}

watch(
  activeChatId,
  (id) => {
    closeMenus()
    showThreadMenu.value = false
    showCreateModal.value = false

    if (id) {
      chatStore.ensureConversationForContact(id)
      chatStore.markConversationRead(id)
      inputMessage.value = chatStore.getConversationByContactId(id).draft || ''
    } else {
      inputMessage.value = ''
    }

    suggestions.value = []
    showSuggestions.value = false
    aiErrorMessage.value = ''
    retryTriggerMessageId.value = ''
    scrollToBottom()
  },
  { immediate: true },
)

watch(inputMessage, (text) => {
  if (!activeChat.value) return
  chatStore.setConversationDraft(activeChat.value.id, text)
})

onBeforeUnmount(() => {
  cancelActiveRequest()
})
</script>

<template>
  <div class="w-full h-full flex flex-col chat-shell">
    <div v-if="!activeChat" class="pt-12 px-4 pb-2 chat-ink relative">
      <div class="flex items-center justify-between gap-2">
        <button @click="goHome" class="chat-ink w-10 h-10 rounded-full hover:bg-black/5 active:scale-95 transition">
          <i class="fas fa-chevron-left"></i>
        </button>

        <button
          @click="toggleStatusMenu"
          class="flex items-center gap-2 px-3 h-9 rounded-full border border-black/10 bg-white/70 backdrop-blur-sm"
        >
          <span class="chat-status-dot" :class="currentStatus.dotClass"></span>
          <span class="text-sm font-semibold">{{ currentStatus.label }}</span>
        </button>

        <div class="flex items-center gap-2">
          <button
            @click="toggleCreateMenu"
            class="h-9 px-3 rounded-full border border-black/10 bg-white/70 text-sm font-semibold backdrop-blur-sm"
          >
            新建
          </button>
          <button
            @click="toggleServiceMenu"
            class="h-9 px-3 rounded-full border border-black/10 bg-white/70 text-sm font-semibold backdrop-blur-sm"
          >
            添加服务号
          </button>
        </div>
      </div>

      <div
        v-if="showStatusMenu || showCreateMenu || showServiceMenu"
        class="fixed inset-0 z-20"
        @click="closeMenus"
      ></div>

      <div
        v-if="showStatusMenu"
        class="absolute top-full left-14 mt-2 z-30 w-44 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
      >
        <button
          v-for="item in STATUS_OPTIONS"
          :key="item.id"
          @click="setUserStatus(item.id)"
          class="w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between"
        >
          <span class="flex items-center gap-2">
            <span class="chat-status-dot" :class="item.dotClass"></span>
            <span class="text-sm">{{ item.label }}</span>
          </span>
          <span class="text-[11px] text-gray-400">{{ item.hint }}</span>
        </button>
      </div>

      <div
        v-if="showCreateMenu"
        class="absolute top-full right-24 mt-2 z-30 w-40 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
      >
        <button @click="openCreateModal('direct')" class="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50">
          新建对话
        </button>
        <button @click="openCreateModal('group')" class="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50">
          新建群聊
        </button>
      </div>

      <div
        v-if="showServiceMenu"
        class="absolute top-full right-0 mt-2 z-30 w-40 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden"
      >
        <button @click="openCreateModal('service')" class="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50">
          添加服务号
        </button>
        <button @click="openCreateModal('official')" class="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50">
          添加公众号
        </button>
      </div>

      <button
        @click="router.push('/chat-contacts')"
        class="mt-3 w-full h-9 rounded-xl border border-black/10 bg-white/70 text-sm font-semibold backdrop-blur-sm"
      >
        会话通讯录
      </button>
    </div>

    <div v-if="!activeChat" class="flex-1 overflow-y-auto no-scrollbar bg-white rounded-t-2xl mt-2">
      <div
        v-for="contact in contactsForList"
        :key="contact.id"
        @click="enterChat(contact)"
        class="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
      >
        <div class="w-12 h-12 rounded-[18px] overflow-hidden bg-gray-200">
          <img
            :src="contact.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-center gap-2">
            <span class="font-bold text-sm truncate">{{ contact.name }}</span>
            <span class="text-[10px] text-gray-400 shrink-0">
              {{ formatConversationTime(getConversationPreview(contact.id)?.lastMessageAt) }}
            </span>
          </div>
          <div
            class="text-xs line-clamp-1 flex items-center gap-1"
            :class="getConversationPreview(contact.id)?.draft?.trim() ? 'text-orange-500' : 'text-gray-500'"
          >
            <span
              v-if="contactKindTag(contact)"
              class="px-1 rounded text-[8px] font-medium"
              :class="contactKindTagClass(contact)"
            >
              {{ contactKindTag(contact) }}
            </span>
            {{ contactPreviewText(contact.id) }}
          </div>
        </div>
        <span
          v-if="getConversationPreview(contact.id)?.unread"
          class="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] inline-flex items-center justify-center"
        >
          {{ Math.min(getConversationPreview(contact.id)?.unread || 0, 99) }}
        </span>
      </div>
    </div>

    <div v-if="activeChat" class="flex flex-col h-full chat-thread">
      <div class="pt-12 pb-2 px-3 chat-thread-header backdrop-blur flex items-center justify-between z-10 shadow-sm">
        <button @click="leaveChat" class="chat-ink px-2 flex items-center gap-1 w-16">
          <i class="fas fa-chevron-left"></i> 返回
        </button>
        <div class="flex-1 text-center min-w-0">
          <p class="font-bold text-sm truncate">{{ activeChat.name }}</p>
          <p class="text-[10px] text-gray-500">
            <span v-if="contactKindTag(activeChat)">{{ contactKindTag(activeChat) }}</span>
            <span v-if="contactKindTag(activeChat) && loadingAI"> · </span>
            <span v-if="loadingAI">AI 生成中...</span>
          </p>
        </div>
        <button @click="toggleThreadMenu" class="chat-ink px-2 w-16 text-right"><i class="fas fa-bars"></i></button>
      </div>

      <div
        v-if="showThreadMenu"
        class="mx-3 mt-2 rounded-2xl border border-gray-200 bg-white/90 backdrop-blur p-3 text-xs text-gray-600 space-y-2"
      >
        <template v-if="isActiveServiceChat">
          <p class="font-semibold text-sm text-gray-900">服务模板</p>
          <textarea
            v-model="serviceTemplateDraft"
            rows="3"
            class="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs resize-none outline-none"
            placeholder="输入服务号/公众号的回复模板..."
          />
          <div class="flex justify-end gap-2">
            <button @click="showThreadMenu = false" class="px-2.5 py-1 rounded-lg border border-gray-200">
              取消
            </button>
            <button
              @click="saveServiceTemplate"
              class="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700"
            >
              保存模板
            </button>
          </div>
        </template>
        <template v-else>
          <p>该会话为角色/群聊模式。服务模板仅对服务号与公众号开放。</p>
        </template>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar" ref="chatContainer">
        <div
          v-for="msg in activeMessages"
          :key="msg.id"
          class="flex w-full"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div v-if="msg.role !== 'user'" class="w-8 h-8 rounded-xl bg-gray-200 mr-2 overflow-hidden flex-shrink-0">
            <img :src="activeChat.avatar" class="w-full h-full object-cover" />
          </div>

          <div class="max-w-[70%]">
            <div
              class="px-3 py-2 text-sm rounded-xl shadow-sm relative markdown-body"
              :class="msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'"
              v-html="renderMarkdown(msg.content)"
            ></div>
            <p
              v-if="messageStatusText(msg)"
              class="text-[10px] text-right mt-1"
              :class="msg.status === 'failed' ? 'text-red-500' : 'text-gray-400'"
            >
              {{ messageStatusText(msg) }}
            </p>
          </div>
        </div>

        <div v-if="loadingAI" class="flex w-full justify-start">
          <div class="w-8 h-8 rounded-xl bg-gray-200 mr-2 overflow-hidden flex-shrink-0">
            <img :src="activeChat.avatar" class="w-full h-full object-cover" />
          </div>
          <div class="bg-white text-black px-3 py-2 text-sm rounded-xl shadow-sm">
            <i class="fas fa-ellipsis-h animate-pulse"></i>
          </div>
        </div>

        <div v-if="showSuggestions && suggestions.length > 0" class="flex flex-wrap gap-2 justify-end mb-2">
          <div
            v-for="(sugg, idx) in suggestions"
            :key="idx"
            @click="useSuggestion(sugg)"
            class="chat-suggestion backdrop-blur-sm text-xs px-3 py-1.5 rounded-full shadow-sm border cursor-pointer hover:bg-white active:scale-95 transition"
          >
            ✨ {{ sugg }}
          </div>
        </div>
      </div>

      <div class="p-3 chat-input flex items-center gap-2 border-t relative">
        <div
          v-if="aiErrorMessage"
          class="absolute -top-14 left-3 right-3 text-[11px] rounded-lg border border-red-200 bg-red-50 text-red-700 px-2.5 py-1.5 flex items-center justify-between gap-2"
        >
          <span class="line-clamp-1">{{ aiErrorMessage }}</span>
          <div class="shrink-0 flex items-center gap-1">
            <button
              v-if="canRetryAi"
              @click="retryLastMessage"
              class="px-2 py-1 rounded border border-red-300 hover:bg-red-100"
            >
              重试
            </button>
            <button
              v-if="canCancelAi"
              @click="cancelActiveRequest"
              class="px-2 py-1 rounded border border-red-300 hover:bg-red-100"
            >
              取消
            </button>
          </div>
        </div>

        <button
          @click="sendCurrentLocation"
          class="w-8 h-8 rounded-full flex items-center justify-center transition bg-cyan-500 text-white shadow-md"
        >
          <i class="fas fa-location-dot text-xs"></i>
        </button>

        <button
          @click="generateSmartReplies"
          class="w-8 h-8 rounded-full flex items-center justify-center transition"
          :class="loadingSuggestions || loadingAI ? 'bg-gray-100 text-gray-400' : 'chat-magic shadow-md animate-pulse'"
          :disabled="loadingSuggestions || loadingAI"
        >
          <i v-if="loadingSuggestions" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-wand-magic-sparkles text-xs"></i>
        </button>

        <input
          v-model="inputMessage"
          @keyup.enter="sendMessage"
          type="text"
          class="flex-1 chat-input-field rounded-full px-4 py-2 text-sm outline-none"
          placeholder="发送消息..."
        />

        <button
          v-if="canCancelAi"
          @click="cancelActiveRequest"
          class="h-8 px-3 rounded-full text-xs border border-gray-300 text-gray-600"
        >
          取消
        </button>

        <button
          @click="requestPendingAiReply"
          class="h-8 px-3 rounded-full text-xs border transition"
          :class="
            canRequestAiReply
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-gray-100 text-gray-400'
          "
          :disabled="!canRequestAiReply"
        >
          触发回复
        </button>

        <button @click="sendMessage" class="w-8 h-8 chat-send rounded-full flex items-center justify-center">
          <i class="fas fa-paper-plane text-xs"></i>
        </button>
      </div>
    </div>

    <div
      v-if="showCreateModal && !activeChat"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-center justify-center"
      @click.self="closeCreateModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl">
        <p class="text-base font-bold">
          {{
            createMode === 'direct'
              ? '新建对话'
              : createMode === 'group'
                ? '新建群聊'
                : createMode === 'service'
                  ? '添加服务号'
                  : '添加公众号'
          }}
        </p>
        <input
          v-model="createDraft.name"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="createMode === 'group' ? '群聊名称' : '会话名称'"
        />
        <input
          v-model="createDraft.role"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="
            createMode === 'direct'
              ? '角色名称（如：冷静管家）'
              : createMode === 'group'
                ? '绑定角色（逗号分隔）'
                : '服务模板标题或关键词'
          "
        />
        <textarea
          v-model="createDraft.bio"
          rows="3"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none outline-none"
          :placeholder="
            createMode === 'group' ? '群聊设定（可选）' : createMode === 'direct' ? '角色设定（可选）' : '服务说明（可选）'
          "
        ></textarea>
        <div class="flex justify-end gap-2">
          <button @click="closeCreateModal" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
            取消
          </button>
          <button
            @click="createContactFromModal"
            class="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-sm"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
