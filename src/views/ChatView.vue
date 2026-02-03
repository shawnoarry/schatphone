<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { callAI } from '../lib/ai'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()

const { settings, user } = storeToRefs(systemStore)
const { contacts, chatHistory, loadingAI } = storeToRefs(chatStore)

const inputMessage = ref('')
const chatContainer = ref(null)

const loadingSuggestions = ref(false)
const suggestions = ref([])
const showSuggestions = ref(false)

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
  return chatHistory.value[activeChat.value.id] || []
})

const goHome = () => {
  router.push('/home')
}

const leaveChat = () => {
  router.push('/chat')
}

const enterChat = (contact) => {
  ensureChatHistory(contact.id)
  router.push(`/chat/${contact.id}`)
}

const ensureChatHistory = (contactId) => {
  if (!chatHistory.value[contactId]) {
    chatHistory.value[contactId] = []
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const generateAIResponse = async (contactId) => {
  const contact = contacts.value.find((item) => item.id === contactId)
  if (!contact) return
  const history = chatHistory.value[contactId] || []

  const systemPrompt = `
世界观: ${user.value.worldBook}
用户(我): ${user.value.name}, ${user.value.bio}
你的角色: 名字是 ${contact.name}, 职业是 ${contact.role}.
你的详细人设: ${contact.bio || '无'}
请完全沉浸在角色中回复我。不要说自己是AI。保持回复简短、口语化。
  `

  const recentMsgs = history.slice(-10)

  try {
    loadingAI.value = true
    const replyText = await callAI({
      messages: recentMsgs,
      systemPrompt,
      settings: settings.value,
    })

    chatHistory.value[contactId].push({
      role: 'assistant',
      content: replyText,
    })

    contact.lastMessage = replyText
    scrollToBottom()
  } catch (error) {
    chatHistory.value[contactId].push({
      role: 'assistant',
      content: `[错误: ${error.message}]`,
    })
  } finally {
    loadingAI.value = false
  }
}

const generateSmartReplies = async () => {
  if (!activeChat.value) return

  loadingSuggestions.value = true
  const history = chatHistory.value[activeChat.value.id] || []
  const recentHistory = history.slice(-5)

  const promptMsg = {
    role: 'user',
    content: '请根据以上对话，生成 3 个简短的回复选项。只返回纯 JSON 数组字符串，例如 ["好的", "没问题", "不去"]。',
  }

  try {
    let text = await callAI({
      messages: [...recentHistory, promptMsg],
      systemPrompt: '你是一个辅助助手，只输出 JSON。',
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

const sendMessage = async () => {
  if (!inputMessage.value.trim() || !activeChat.value) return

  const chatId = activeChat.value.id
  ensureChatHistory(chatId)

  chatHistory.value[chatId].push({
    role: 'user',
    content: inputMessage.value,
  })

  inputMessage.value = ''
  showSuggestions.value = false
  scrollToBottom()

  await generateAIResponse(chatId)
}

const useSuggestion = (text) => {
  inputMessage.value = text
}

const renderMarkdown = (text) => marked.parse(text || '')

watch(activeChatId, (id) => {
  if (id) {
    ensureChatHistory(id)
  }
  suggestions.value = []
  showSuggestions.value = false
  scrollToBottom()
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
        v-for="contact in contacts"
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
        <div class="flex-1">
          <div class="flex justify-between">
            <span class="font-bold text-sm">{{ contact.name }}</span>
            <span class="text-[10px] text-gray-400">昨天</span>
          </div>
          <div class="text-xs text-gray-500 line-clamp-1 flex items-center gap-1">
            <span v-if="contact.isMain" class="bg-yellow-100 text-yellow-700 px-1 rounded text-[8px]">Main</span>
            {{ contact.lastMessage || '点击开始聊天' }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeChat" class="flex flex-col h-full chat-thread">
      <div class="pt-12 pb-2 px-3 chat-thread-header backdrop-blur flex items-center justify-between z-10 shadow-sm">
        <button @click="leaveChat" class="chat-ink px-2 flex items-center gap-1">
          <i class="fas fa-chevron-left"></i> 返回
        </button>
        <span class="font-bold text-sm">{{ activeChat.name }}</span>
        <button class="chat-ink px-2"><i class="fas fa-bars"></i></button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar" ref="chatContainer">
        <div
          v-for="(msg, idx) in activeMessages"
          :key="idx"
          class="flex w-full"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div v-if="msg.role !== 'user'" class="w-8 h-8 rounded-xl bg-gray-200 mr-2 overflow-hidden flex-shrink-0">
            <img :src="activeChat.avatar" class="w-full h-full object-cover" />
          </div>

          <div
            class="max-w-[70%] px-3 py-2 text-sm rounded-xl shadow-sm relative markdown-body"
            :class="msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'"
            v-html="renderMarkdown(msg.content)"
          ></div>
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
        <button
          @click="generateSmartReplies"
          class="w-8 h-8 rounded-full flex items-center justify-center transition"
          :class="
            loadingSuggestions
              ? 'bg-gray-100 text-gray-400'
              : 'chat-magic shadow-md animate-pulse'
          "
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
        <button @click="sendMessage" class="w-8 h-8 chat-send rounded-full flex items-center justify-center">
          <i class="fas fa-paper-plane text-xs"></i>
        </button>
      </div>
    </div>
  </div>
</template>
