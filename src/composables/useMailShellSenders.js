import { computed, reactive } from 'vue'
import { MAIL_SHELL_THREADS } from '../lib/mail-shell-data'

// User-managed sender whitelist for the Daon Mail AI arrival feature (roadmap 4.16 / SHP-1B).
// Defaults derive from the in-world fixture senders; the user can add, remove, and restore
// them, and validated AI-created senders are enrolled with an explicit origin marker.

export const MAIL_SHELL_SENDER_WHITELIST_STORAGE_KEY = 'schatphone:mail-shell:sender-whitelist'
const MAIL_SHELL_SENDER_WHITELIST_VERSION = 1
const MAIL_SHELL_SENDER_KEEP_LIMIT = 200

const EMAIL_LIKE_PATTERN = /^[^\s@]{1,48}@[^\s@.]{2,}(\.[^\s@.]{2,})+$/

const buildDefaultSenders = () => {
  const seen = new Set()
  const senders = []
  MAIL_SHELL_THREADS.forEach((thread) => {
    if (seen.has(thread.senderAddress)) return
    seen.add(thread.senderAddress)
    senders.push({
      id: `mail_sender_${thread.senderAddress.toLowerCase()}`,
      name: thread.senderNameZh,
      address: thread.senderAddress,
      tone: thread.avatarTone,
      origin: 'fixture',
    })
  })
  return senders
}

const normalizeSender = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 60) : ''
  const address =
    typeof raw.address === 'string' ? raw.address.trim().toLowerCase().slice(0, 120) : ''
  const origin = ['fixture', 'user', 'generated'].includes(raw.origin) ? raw.origin : 'user'
  if (!name || !EMAIL_LIKE_PATTERN.test(address)) return null
  return {
    id: `mail_sender_${address}`,
    name,
    address,
    tone: typeof raw.tone === 'string' && raw.tone ? raw.tone.slice(0, 16) : 'slate',
    origin,
  }
}

const loadWhitelistState = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { allowNewSenders: true, senders: buildDefaultSenders() }
    }
    const raw = window.localStorage.getItem(MAIL_SHELL_SENDER_WHITELIST_STORAGE_KEY)
    if (!raw) return { allowNewSenders: true, senders: buildDefaultSenders() }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || parsed.version !== MAIL_SHELL_SENDER_WHITELIST_VERSION) {
      return { allowNewSenders: true, senders: buildDefaultSenders() }
    }
    const senders = (Array.isArray(parsed.senders) ? parsed.senders : [])
      .map(normalizeSender)
      .filter(Boolean)
    return {
      allowNewSenders: parsed.allowNewSenders !== false,
      senders: senders.length ? senders.slice(0, MAIL_SHELL_SENDER_KEEP_LIMIT) : buildDefaultSenders(),
    }
  } catch {
    return { allowNewSenders: true, senders: buildDefaultSenders() }
  }
}

const persistWhitelist = (state) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(
      MAIL_SHELL_SENDER_WHITELIST_STORAGE_KEY,
      JSON.stringify({ ...state, version: MAIL_SHELL_SENDER_WHITELIST_VERSION }),
    )
  } catch {
    // Whitelist is best-effort local configuration; a failed write must not break the shell.
  }
}

const state = reactive(loadWhitelistState())

const persist = () => persistWhitelist(state)

export const isValidSenderAddress = (value) =>
  typeof value === 'string' && EMAIL_LIKE_PATTERN.test(value.trim().toLowerCase())

export const useMailShellSenders = () => {
  const senders = computed(() => state.senders)
  const allowNewSenders = computed(() => state.allowNewSenders)

  const addSender = ({ name, address, origin = 'user' }) => {
    const normalized = normalizeSender({ name, address, origin })
    if (!normalized) return null
    if (state.senders.some((sender) => sender.address === normalized.address)) return null
    state.senders.unshift(normalized)
    if (state.senders.length > MAIL_SHELL_SENDER_KEEP_LIMIT) {
      state.senders.splice(MAIL_SHELL_SENDER_KEEP_LIMIT)
    }
    persist()
    return normalized
  }

  const removeSender = (senderId) => {
    const index = state.senders.findIndex((sender) => sender.id === senderId)
    if (index >= 0) {
      state.senders.splice(index, 1)
      persist()
    }
  }

  const enrollGeneratedSender = ({ name, address }) => addSender({ name, address, origin: 'generated' })

  const setAllowNewSenders = (value) => {
    state.allowNewSenders = value !== false
    persist()
  }

  const restoreDefaults = () => {
    state.senders = buildDefaultSenders()
    persist()
  }

  return {
    senders,
    allowNewSenders,
    addSender,
    removeSender,
    enrollGeneratedSender,
    setAllowNewSenders,
    restoreDefaults,
  }
}

export const resetMailShellSendersForTesting = () => {
  state.allowNewSenders = true
  state.senders = buildDefaultSenders()
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(MAIL_SHELL_SENDER_WHITELIST_STORAGE_KEY)
    }
  } catch {
    // ignore storage unavailability in tests
  }
}
