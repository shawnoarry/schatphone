import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, writePersistedState } from '../lib/persistence'

const CHAT_STORAGE_KEY = 'store:chat'
const CHAT_STORAGE_VERSION = 2
const VALID_MESSAGE_ROLES = new Set(['user', 'assistant', 'system'])
const VALID_MESSAGE_STATUS = new Set(['sending', 'sent', 'failed'])

const DEFAULT_CONTACTS = [
  {
    id: 1,
    name: 'Eva',
    role: '私人 AI 助手',
    isMain: true,
    avatar: '',
    lastMessage: '今天有什么安排吗？',
    bio: '你是一个高度智能、温柔体贴的 AI 助手，名字叫 Eva。你会优先考虑用户(V)的安全，表达清晰简洁。',
  },
  {
    id: 2,
    name: 'Jackie',
    role: '雇佣兵搭档',
    isMain: false,
    avatar: '',
    lastMessage: '嘿，兄弟，今晚去来生酒吧喝一杯？',
    bio: '你是 Jackie Welles，重情重义、性格豪爽，梦想成为夜之城的传奇。你非常信任 V。',
  },
]

const DEFAULT_CHAT_HISTORY = {
  1: [{ role: 'assistant', content: '早安，V。一切系统状态正常。' }],
  2: [{ role: 'assistant', content: '嘿，兄弟，今晚去来生酒吧喝一杯？' }],
}

const nowTs = () => Date.now()
const randomToken = () => Math.random().toString(36).slice(2, 8)
const messageId = () => `msg_${nowTs()}_${randomToken()}`
const fallbackConversationId = (contactId) => `conv_${contactId}`

const resetReactiveObject = (obj) => {
  Object.keys(obj).forEach((key) => {
    delete obj[key]
  })
}

const normalizeContact = (rawContact, fallbackIndex = 0) => {
  const parsedId = Number(rawContact?.id)
  const id = Number.isFinite(parsedId) && parsedId > 0 ? Math.floor(parsedId) : nowTs() + fallbackIndex
  return {
    id,
    name: typeof rawContact?.name === 'string' && rawContact.name.trim() ? rawContact.name.trim() : `联系人 ${id}`,
    role: typeof rawContact?.role === 'string' ? rawContact.role : '',
    isMain: Boolean(rawContact?.isMain),
    avatar: typeof rawContact?.avatar === 'string' ? rawContact.avatar : '',
    bio: typeof rawContact?.bio === 'string' ? rawContact.bio : '',
    lastMessage: typeof rawContact?.lastMessage === 'string' ? rawContact.lastMessage : '',
  }
}

const normalizeMessage = (rawMessage, fallbackRole = 'assistant') => {
  const role = VALID_MESSAGE_ROLES.has(rawMessage?.role) ? rawMessage.role : fallbackRole
  const status = VALID_MESSAGE_STATUS.has(rawMessage?.status) ? rawMessage.status : 'sent'
  return {
    id: typeof rawMessage?.id === 'string' && rawMessage.id ? rawMessage.id : messageId(),
    role,
    content: typeof rawMessage?.content === 'string' ? rawMessage.content : '',
    createdAt:
      typeof rawMessage?.createdAt === 'number' && Number.isFinite(rawMessage.createdAt)
        ? rawMessage.createdAt
        : nowTs(),
    status,
  }
}

const normalizeConversation = (rawConversation, contactId) => {
  return {
    id:
      typeof rawConversation?.id === 'string' && rawConversation.id
        ? rawConversation.id
        : fallbackConversationId(contactId),
    contactId,
    createdAt:
      typeof rawConversation?.createdAt === 'number' && Number.isFinite(rawConversation.createdAt)
        ? rawConversation.createdAt
        : nowTs(),
    updatedAt:
      typeof rawConversation?.updatedAt === 'number' && Number.isFinite(rawConversation.updatedAt)
        ? rawConversation.updatedAt
        : nowTs(),
    unread:
      typeof rawConversation?.unread === 'number' && Number.isFinite(rawConversation.unread)
        ? Math.max(0, Math.floor(rawConversation.unread))
        : 0,
    draft: typeof rawConversation?.draft === 'string' ? rawConversation.draft : '',
    pinned: Boolean(rawConversation?.pinned),
    lastMessage: typeof rawConversation?.lastMessage === 'string' ? rawConversation.lastMessage : '',
    lastMessageAt:
      typeof rawConversation?.lastMessageAt === 'number' && Number.isFinite(rawConversation.lastMessageAt)
        ? rawConversation.lastMessageAt
        : 0,
  }
}

export const useChatStore = defineStore('chat', () => {
  const contacts = reactive([])
  const conversations = reactive({})
  const messagesByConversation = reactive({})
  const loadingAI = ref(false)

  const getContactById = (contactId) => {
    return contacts.find((item) => Number(item.id) === Number(contactId)) || null
  }

  const conversationKeyForContact = (contactId) => String(Number(contactId))

  const syncContactLastMessage = (contactId, fallbackText = '') => {
    const contact = getContactById(contactId)
    if (!contact) return
    const key = conversationKeyForContact(contactId)
    const conversation = conversations[key]
    if (conversation?.lastMessage) {
      contact.lastMessage = conversation.lastMessage
      return
    }
    contact.lastMessage = fallbackText || contact.lastMessage || ''
  }

  const ensureConversationForContact = (contactId) => {
    const key = conversationKeyForContact(contactId)
    if (!conversations[key]) {
      conversations[key] = normalizeConversation(null, Number(contactId))
    }
    if (!Array.isArray(messagesByConversation[key])) {
      messagesByConversation[key] = []
    }
    return conversations[key]
  }

  const syncConversationSummary = (contactId) => {
    const key = conversationKeyForContact(contactId)
    const conversation = ensureConversationForContact(contactId)
    const messages = messagesByConversation[key]

    if (messages.length === 0) {
      if (!conversation.lastMessage) {
        const contact = getContactById(contactId)
        conversation.lastMessage = contact?.lastMessage || ''
      }
      conversation.lastMessageAt = conversation.lastMessageAt || conversation.createdAt
      conversation.updatedAt = Math.max(conversation.updatedAt, conversation.lastMessageAt || 0)
      syncContactLastMessage(contactId, conversation.lastMessage)
      return
    }

    const last = messages[messages.length - 1]
    conversation.lastMessage = last.content
    conversation.lastMessageAt = last.createdAt
    conversation.updatedAt = Math.max(conversation.updatedAt, last.createdAt)
    syncContactLastMessage(contactId, last.content)
  }

  const getConversationByContactId = (contactId) => {
    const key = conversationKeyForContact(contactId)
    return conversations[key] || ensureConversationForContact(contactId)
  }

  const getMessagesByContactId = (contactId) => {
    const key = conversationKeyForContact(contactId)
    ensureConversationForContact(contactId)
    return messagesByConversation[key]
  }

  const setConversationDraft = (contactId, draftText = '') => {
    const conversation = ensureConversationForContact(contactId)
    const nextDraft = typeof draftText === 'string' ? draftText : ''
    if (conversation.draft === nextDraft) return
    conversation.draft = nextDraft
    conversation.updatedAt = nowTs()
  }

  const markConversationRead = (contactId) => {
    const conversation = ensureConversationForContact(contactId)
    conversation.unread = 0
    conversation.updatedAt = nowTs()
  }

  const incrementConversationUnread = (contactId, delta = 1) => {
    const conversation = ensureConversationForContact(contactId)
    conversation.unread = Math.max(0, conversation.unread + delta)
    conversation.updatedAt = nowTs()
  }

  const appendMessage = (contactId, rawMessage) => {
    const key = conversationKeyForContact(contactId)
    ensureConversationForContact(contactId)
    const fallbackRole = rawMessage?.role === 'user' ? 'user' : 'assistant'
    const normalized = normalizeMessage(rawMessage, fallbackRole)
    messagesByConversation[key].push(normalized)
    syncConversationSummary(contactId)
    return normalized
  }

  const updateMessageStatus = (contactId, targetMessageId, status) => {
    if (!VALID_MESSAGE_STATUS.has(status)) return false
    const key = conversationKeyForContact(contactId)
    const list = getMessagesByContactId(contactId)
    const index = list.findIndex((item) => item.id === targetMessageId)
    if (index < 0) return false
    list[index] = {
      ...list[index],
      status,
    }
    if (list[index].createdAt > 0) {
      conversations[key].updatedAt = Math.max(conversations[key].updatedAt, list[index].createdAt)
    }
    syncConversationSummary(contactId)
    return true
  }

  const updateMessageContent = (contactId, targetMessageId, nextContent) => {
    const list = getMessagesByContactId(contactId)
    const index = list.findIndex((item) => item.id === targetMessageId)
    if (index < 0) return false
    list[index] = {
      ...list[index],
      content: typeof nextContent === 'string' ? nextContent : list[index].content,
    }
    syncConversationSummary(contactId)
    return true
  }

  const addContact = (payload = {}) => {
    const maxContactId = contacts.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
    const nextContact = normalizeContact(
      {
        ...payload,
        id: payload.id ?? maxContactId + 1,
      },
      contacts.length,
    )

    contacts.push(nextContact)
    ensureConversationForContact(nextContact.id)
    syncConversationSummary(nextContact.id)
    return nextContact
  }

  const toLegacyChatHistory = () => {
    const output = {}
    contacts.forEach((contact) => {
      const key = conversationKeyForContact(contact.id)
      output[key] = (messagesByConversation[key] || []).map((message) => ({
        role: message.role,
        content: message.content,
      }))
    })
    return output
  }

  const hydrateFromLegacyShape = (legacyContacts, legacyHistory) => {
    const normalizedContacts = Array.isArray(legacyContacts)
      ? legacyContacts.map((item, index) => normalizeContact(item, index))
      : DEFAULT_CONTACTS.map((item, index) => normalizeContact(item, index))

    contacts.splice(0, contacts.length, ...normalizedContacts)
    resetReactiveObject(conversations)
    resetReactiveObject(messagesByConversation)

    normalizedContacts.forEach((contact) => {
      const key = conversationKeyForContact(contact.id)
      conversations[key] = normalizeConversation(null, contact.id)

      const inputHistory = Array.isArray(legacyHistory?.[key]) ? legacyHistory[key] : []
      const seededMessages = inputHistory.map((item, index) =>
        normalizeMessage(
          {
            ...item,
            createdAt: nowTs() - Math.max(0, inputHistory.length - index) * 60_000,
            status: 'sent',
          },
          item?.role === 'user' ? 'user' : 'assistant',
        ),
      )

      messagesByConversation[key] = seededMessages
      conversations[key].lastMessage = contact.lastMessage || ''
      conversations[key].lastMessageAt = seededMessages.at(-1)?.createdAt || nowTs()
      conversations[key].updatedAt = conversations[key].lastMessageAt
      syncConversationSummary(contact.id)
    })
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(CHAT_STORAGE_KEY, {
      version: CHAT_STORAGE_VERSION,
    })
    if (!persisted || typeof persisted !== 'object') {
      hydrateFromLegacyShape(DEFAULT_CONTACTS, DEFAULT_CHAT_HISTORY)
      return
    }

    const hasNewShape = persisted.conversations && persisted.messagesByConversation
    if (!hasNewShape) {
      hydrateFromLegacyShape(persisted.contacts, persisted.chatHistory)
      return
    }

    const normalizedContacts = Array.isArray(persisted.contacts)
      ? persisted.contacts.map((item, index) => normalizeContact(item, index))
      : DEFAULT_CONTACTS.map((item, index) => normalizeContact(item, index))

    contacts.splice(0, contacts.length, ...normalizedContacts)
    resetReactiveObject(conversations)
    resetReactiveObject(messagesByConversation)

    normalizedContacts.forEach((contact) => {
      const key = conversationKeyForContact(contact.id)
      const rawConversation = persisted.conversations?.[key]
      conversations[key] = normalizeConversation(rawConversation, contact.id)

      const rawMessages = Array.isArray(persisted.messagesByConversation?.[key])
        ? persisted.messagesByConversation[key]
        : []
      messagesByConversation[key] = rawMessages.map((msg) =>
        normalizeMessage(msg, msg?.role === 'user' ? 'user' : 'assistant'),
      )
      syncConversationSummary(contact.id)
    })
  }

  const persistToStorage = () => {
    const contactsSnapshot = contacts.map((contact) => ({ ...contact }))
    const conversationsSnapshot = Object.fromEntries(
      Object.entries(conversations).map(([key, value]) => [key, { ...value }]),
    )
    const messagesSnapshot = Object.fromEntries(
      Object.entries(messagesByConversation).map(([key, list]) => [key, list.map((message) => ({ ...message }))]),
    )

    writePersistedState(
      CHAT_STORAGE_KEY,
      {
        contacts: contactsSnapshot,
        conversations: conversationsSnapshot,
        messagesByConversation: messagesSnapshot,
      },
      { version: CHAT_STORAGE_VERSION },
    )
  }

  const saveNow = () => {
    persistToStorage()
  }

  const contactsForList = computed(() => {
    return [...contacts].sort((a, b) => {
      const convA = getConversationByContactId(a.id)
      const convB = getConversationByContactId(b.id)

      if (convA.pinned !== convB.pinned) return convA.pinned ? -1 : 1
      return (convB.updatedAt || 0) - (convA.updatedAt || 0)
    })
  })

  const chatHistory = computed(() => toLegacyChatHistory())

  hydrateFromStorage()
  watch([contacts, conversations, messagesByConversation], persistToStorage, { deep: true })

  return {
    contacts,
    contactsForList,
    conversations,
    messagesByConversation,
    chatHistory,
    loadingAI,
    ensureConversationForContact,
    getConversationByContactId,
    getMessagesByContactId,
    setConversationDraft,
    markConversationRead,
    incrementConversationUnread,
    appendMessage,
    updateMessageStatus,
    updateMessageContent,
    addContact,
    saveNow,
  }
})
