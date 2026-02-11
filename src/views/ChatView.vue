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

const sendQueues = reactive({})
const processingState = reactive({
  contactId: null,
  messageId: '',
})
const activeAbortController = ref(null)

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

const failedUserMessage = computed(() => {
  if (!activeMessages.value.length) return null
  for (let i = activeMessages.value.length - 1; i >= 0; i -= 1) {
    const message = activeMessages.value[i]
    if (message.role === 'user' && message.status === 'failed') {
      return message
    }
  }
  return null
})

const activeQueueSize = computed(() => {
  if (!activeChat.value) return 0
  const queue = sendQueues[String(activeChat.value.id)]
  return Array.isArray(queue) ? queue.length : 0
})

const canCancelAi = computed(
  () =>
    Boolean(
      activeAbortController.value &&
        activeChat.value &&
        processingState.contactId === activeChat.value.id &&
        loadingAI.value,
    ),
)

const canRetryAi = computed(() =>
  Boolean(
    aiErrorMessage.value &&
      activeChat.value &&
      failedUserMessage.value &&
      !loadingAI.value &&
      !activeAbortController.value,
  ),
)

const ensureQueue = (contactId) => {
  const key = String(contactId)
  if (!Array.isArray(sendQueues[key])) {
    sendQueues[key] = []
  }
  return sendQueues[key]
}

const isMessageQueued = (contactId, messageId) => {
  if (!contactId || !messageId) return false
  const queue = ensureQueue(contactId)
  return queue.some((job) => job.messageId === messageId)
}

const failQueuedJobs = (contactId) => {
  const queue = ensureQueue(contactId)
  while (queue.length) {
    const job = queue.shift()
    chatStore.updateMessageStatus(contactId, job.messageId, 'failed')
  }
}

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

const buildSystemPrompt = (contact) => `
世界观: ${user.value.worldBook}
用户: ${user.value.name}, ${user.value.bio}
你的角色: ${contact.name} (${contact.role})
角色设定: ${contact.bio || '无'}
请保持角色一致，不要声明自己是 AI，回复尽量简短自然。`

const toAiMessages = (contactId, untilMessageId = '') => {
  const allMessages = chatStore.getMessagesByContactId(contactId)
  const result = []

  for (const item of allMessages) {
    if (item.status === 'failed') continue
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

const processSendQueue = async (contactId) => {
  if (!contactId) return
  if (processingState.contactId !== null) return

  const contact = contacts.value.find((item) => item.id === contactId)
  if (!contact) return

  const queue = ensureQueue(contactId)
  if (!queue.length) return

  processingState.contactId = contactId

  try {
    while (queue.length) {
      const job = queue.shift()
      processingState.messageId = job.messageId
      chatStore.updateMessageStatus(contactId, job.messageId, 'sending')

      const controller = new AbortController()
      activeAbortController.value = controller
      loadingAI.value = true

      try {
        await generateAIResponse(contactId, job.messageId, { signal: controller.signal })
        chatStore.updateMessageStatus(contactId, job.messageId, 'sent')
        aiErrorMessage.value = ''
      } catch (error) {
        chatStore.updateMessageStatus(contactId, job.messageId, 'failed')

        if (error?.code === 'CANCELED') {
          aiErrorMessage.value = formatApiErrorForUi(error, '请求已取消。')
          failQueuedJobs(contactId)
          break
        }

        aiErrorMessage.value = formatApiErrorForUi(error, '消息发送失败，请稍后重试。')
        failQueuedJobs(contactId)
        break
      } finally {
        loadingAI.value = false
        activeAbortController.value = null
        processingState.messageId = ''
      }
    }
  } finally {
    processingState.contactId = null

    const nextEntry = Object.entries(sendQueues).find(([, jobs]) => Array.isArray(jobs) && jobs.length > 0)
    if (nextEntry) {
      const nextContactId = Number(nextEntry[0])
      if (Number.isFinite(nextContactId)) {
        processSendQueue(nextContactId)
      }
    }
  }

  scrollToBottom()
}

const enqueueSendJob = (contactId, messageId, source = 'send') => {
  if (!contactId || !messageId) return

  if (
    processingState.contactId === contactId &&
    processingState.messageId === messageId &&
    activeAbortController.value
  ) {
    return
  }

  if (isMessageQueued(contactId, messageId)) {
    return
  }

  const queue = ensureQueue(contactId)
  queue.push({ messageId, source, createdAt: Date.now() })
  processSendQueue(contactId)
}

const cancelActiveRequest = () => {
  if (!activeAbortController.value) return

  activeAbortController.value.abort()
  if (processingState.contactId !== null) {
    failQueuedJobs(processingState.contactId)
  }
}

const retryLastMessage = () => {
  if (!canRetryAi.value || !activeChat.value || !failedUserMessage.value) return

  chatStore.updateMessageStatus(activeChat.value.id, failedUserMessage.value.id, 'sending')
  aiErrorMessage.value = ''
  enqueueSendJob(activeChat.value.id, failedUserMessage.value.id, 'retry')
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

  const pendingUserMessage = chatStore.appendMessage(chatId, {
    role: 'user',
    content: payload,
    status: 'sending',
  })

  inputMessage.value = ''
  chatStore.setConversationDraft(chatId, '')
  showSuggestions.value = false
  aiErrorMessage.value = ''

  enqueueSendJob(chatId, pendingUserMessage.id, 'send')
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

  const pendingUserMessage = chatStore.appendMessage(chatId, {
    role: 'user',
    content: payload,
    status: 'sending',
  })

  showSuggestions.value = false
  aiErrorMessage.value = ''

  enqueueSendJob(chatId, pendingUserMessage.id, 'location')
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

const messageStatusText = (message) => {
  if (message.role !== 'user') return ''
  if (message.status === 'failed') return '发送失败'
  if (message.status !== 'sending') return ''

  if (activeChat.value && isMessageQueued(activeChat.value.id, message.id)) {
    return '排队中...'
  }
  return '发送中...'
}

watch(
  activeChatId,
  (id) => {
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
    <div v-if="!activeChat" class="pt-12 px-4 pb-2 flex justify-between items-end chat-ink">
      <div class="flex items-center gap-2">
        <button @click="goHome" class="chat-ink"><i class="fas fa-chevron-left"></i></button>
        <h1 class="text-2xl font-bold">聊天</h1>
      </div>
      <div class="flex gap-4 text-xl">
        <i class="fas fa-search"></i>
        <i class="far fa-comment-dots"></i>
        <i class="fas fa-cog"></i>
      </div>
    </div>

    <div v-if="!activeChat" class="flex-1 overflow-y-auto no-scrollbar bg-white rounded-t-xl mt-2">
      <div class="flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50">
        <div class="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
          <i class="fas fa-bullhorn"></i>
        </div>
        <div class="flex-1">
          <div class="flex justify-between">
            <span class="font-bold text-sm">Channel 推送</span>
            <span class="text-[10px] text-gray-400">12:30</span>
          </div>
          <div class="text-xs text-gray-500 line-clamp-1">SchatPhone 系统更新 v1.2 说明...</div>
        </div>
      </div>

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
            <span v-if="contact.isMain" class="bg-yellow-100 text-yellow-700 px-1 rounded text-[8px]">Main</span>
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
          <p v-if="loadingAI || activeQueueSize" class="text-[10px] text-gray-500">
            <span v-if="loadingAI">发送中</span>
            <span v-if="loadingAI && activeQueueSize"> · </span>
            <span v-if="activeQueueSize">队列 {{ activeQueueSize }}</span>
          </p>
        </div>
        <button class="chat-ink px-2 w-16 text-right"><i class="fas fa-bars"></i></button>
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

        <button @click="sendMessage" class="w-8 h-8 chat-send rounded-full flex items-center justify-center">
          <i class="fas fa-paper-plane text-xs"></i>
        </button>
      </div>
    </div>
  </div>
</template>
