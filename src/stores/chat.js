import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { readPersistedState, writePersistedState } from '../lib/persistence'

const CHAT_STORAGE_KEY = 'store:chat'
const CHAT_STORAGE_VERSION = 1

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

export const useChatStore = defineStore('chat', () => {
  const contacts = reactive(DEFAULT_CONTACTS.map((contact) => ({ ...contact })))

  const chatHistory = reactive(
    Object.fromEntries(
      Object.entries(DEFAULT_CHAT_HISTORY).map(([contactId, history]) => [
        contactId,
        history.map((item) => ({ ...item })),
      ]),
    ),
  )

  const loadingAI = ref(false)

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(CHAT_STORAGE_KEY, {
      version: CHAT_STORAGE_VERSION,
    })
    if (!persisted || typeof persisted !== 'object') return

    if (Array.isArray(persisted.contacts)) {
      contacts.splice(0, contacts.length, ...persisted.contacts.map((item) => ({ ...item })))
    }

    if (persisted.chatHistory && typeof persisted.chatHistory === 'object') {
      Object.keys(chatHistory).forEach((contactId) => {
        delete chatHistory[contactId]
      })

      Object.entries(persisted.chatHistory).forEach(([contactId, history]) => {
        chatHistory[contactId] = Array.isArray(history) ? history.map((item) => ({ ...item })) : []
      })
    }
  }

  const persistToStorage = () => {
    const historySnapshot = Object.fromEntries(
      Object.entries(chatHistory).map(([contactId, history]) => [
        contactId,
        (Array.isArray(history) ? history : []).map((item) => ({ ...item })),
      ]),
    )

    writePersistedState(
      CHAT_STORAGE_KEY,
      {
        contacts: contacts.map((contact) => ({ ...contact })),
        chatHistory: historySnapshot,
      },
      { version: CHAT_STORAGE_VERSION },
    )
  }

  hydrateFromStorage()
  watch([contacts, chatHistory], persistToStorage, { deep: true })

  return { contacts, chatHistory, loadingAI }
})
