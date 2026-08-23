import { computed, reactive } from 'vue'

// S1 mail-shell preview state (roadmap 4.16 / SHP-1).
// This is deliberately NOT a Pinia store: it is device-local preview state for the
// fixture-backed shell, excluded from backup. The action shapes intentionally mirror
// the future S2 owner store so the shell can swap this composable without rework.

export const MAIL_SHELL_PREVIEW_STATE_STORAGE_KEY = 'schatphone:mail-shell:preview-state'
const MAIL_SHELL_PREVIEW_STATE_VERSION = 2
const MAIL_SHELL_RECEIVED_KEEP_LIMIT = 60

const createEmptyPreviewState = () => ({
  readIds: [],
  starredIds: [],
  archivedIds: [],
  drafts: [],
  sent: [],
  received: [],
})

const normalizeIdList = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === 'string' && item.trim()))]
    : []

const normalizeMailRecord = (record) => {
  if (!record || typeof record !== 'object') return null
  const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : ''
  const to = typeof record.to === 'string' ? record.to.trim().slice(0, 200) : ''
  const subject = typeof record.subject === 'string' ? record.subject.trim().slice(0, 300) : ''
  const body = typeof record.body === 'string' ? record.body.slice(0, 20_000) : ''
  const at =
    typeof record.savedAt === 'number' && Number.isFinite(record.savedAt)
      ? record.savedAt
      : typeof record.sentAt === 'number' && Number.isFinite(record.sentAt)
        ? record.sentAt
        : 0
  if (!id || (!to && !subject && !body)) return null
  return { id, to, subject, body, at }
}

const normalizeReceivedMail = (record) => {
  if (!record || typeof record !== 'object') return null
  const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : ''
  const senderName = typeof record.senderName === 'string' ? record.senderName.trim().slice(0, 80) : ''
  const senderAddress =
    typeof record.senderAddress === 'string' ? record.senderAddress.trim().slice(0, 120) : ''
  const subject = typeof record.subject === 'string' ? record.subject.trim().slice(0, 300) : ''
  const body = Array.isArray(record.body)
    ? record.body
        .filter((paragraph) => typeof paragraph === 'string' && paragraph.trim())
        .slice(0, 6)
        .map((paragraph) => paragraph.slice(0, 2_000))
    : []
  const label = typeof record.label === 'string' ? record.label.trim().slice(0, 40) : ''
  const arrivedAt =
    typeof record.arrivedAt === 'number' && Number.isFinite(record.arrivedAt) ? record.arrivedAt : 0
  const providerModel =
    typeof record.providerModel === 'string' ? record.providerModel.slice(0, 120) : ''
  if (!id || !senderName || !senderAddress || !subject || body.length === 0 || !arrivedAt) {
    return null
  }
  return { id, senderName, senderAddress, subject, body, label, arrivedAt, providerModel }
}

const loadPreviewState = () => {
  const empty = createEmptyPreviewState()
  try {
    if (typeof window === 'undefined' || !window.localStorage) return empty
    const raw = window.localStorage.getItem(MAIL_SHELL_PREVIEW_STATE_STORAGE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return empty
    if (parsed.version !== 1 && parsed.version !== MAIL_SHELL_PREVIEW_STATE_VERSION) return empty
    return {
      readIds: normalizeIdList(parsed.readIds),
      starredIds: normalizeIdList(parsed.starredIds),
      archivedIds: normalizeIdList(parsed.archivedIds),
      drafts: (Array.isArray(parsed.drafts) ? parsed.drafts : [])
        .map(normalizeMailRecord)
        .filter(Boolean),
      sent: (Array.isArray(parsed.sent) ? parsed.sent : [])
        .map(normalizeMailRecord)
        .filter(Boolean),
      received: (Array.isArray(parsed.received) ? parsed.received : [])
        .map(normalizeReceivedMail)
        .filter(Boolean)
        .slice(0, MAIL_SHELL_RECEIVED_KEEP_LIMIT),
    }
  } catch {
    return empty
  }
}

const persistPreviewState = (state) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(
      MAIL_SHELL_PREVIEW_STATE_STORAGE_KEY,
      JSON.stringify({ ...state, version: MAIL_SHELL_PREVIEW_STATE_VERSION }),
    )
  } catch {
    // Preview state is best-effort; a failed write must not break the shell.
  }
}

const state = reactive(loadPreviewState())

const persist = () => persistPreviewState(state)

let recordIdCounter = 0
const nextRecordId = (prefix) => {
  recordIdCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${recordIdCounter}`
}

const toggleInList = (list, id) => {
  const index = list.indexOf(id)
  if (index >= 0) list.splice(index, 1)
  else list.push(id)
}

export const useMailShellState = () => {
  const isThreadRead = (threadId) => state.readIds.includes(threadId)
  const isThreadStarred = (threadId) => state.starredIds.includes(threadId)
  const isThreadArchived = (threadId) => state.archivedIds.includes(threadId)

  const toggleThreadRead = (threadId) => {
    if (typeof threadId !== 'string' || !threadId.trim()) return false
    toggleInList(state.readIds, threadId)
    persist()
    return state.readIds.includes(threadId)
  }

  const markThreadRead = (threadId) => {
    if (typeof threadId !== 'string' || !threadId.trim()) return
    if (!state.readIds.includes(threadId)) {
      state.readIds.push(threadId)
      persist()
    }
  }

  const toggleThreadStar = (threadId) => {
    if (typeof threadId !== 'string' || !threadId.trim()) return false
    toggleInList(state.starredIds, threadId)
    persist()
    return state.starredIds.includes(threadId)
  }

  const archiveThread = (threadId) => {
    if (typeof threadId !== 'string' || !threadId.trim()) return
    if (!state.archivedIds.includes(threadId)) {
      state.archivedIds.push(threadId)
      persist()
    }
  }

  const unarchiveThread = (threadId) => {
    const index = state.archivedIds.indexOf(threadId)
    if (index >= 0) {
      state.archivedIds.splice(index, 1)
      persist()
    }
  }

  const saveDraft = ({ to = '', subject = '', body = '', draftId = '' }) => {
    const normalized = normalizeMailRecord({
      id: draftId || nextRecordId('mail_draft'),
      to,
      subject,
      body,
      savedAt: Date.now(),
    })
    if (!normalized) return null
    const existingIndex = state.drafts.findIndex((draft) => draft.id === normalized.id)
    const record = { id: normalized.id, to: normalized.to, subject: normalized.subject, body: normalized.body, savedAt: Date.now() }
    if (existingIndex >= 0) state.drafts.splice(existingIndex, 1, record)
    else state.drafts.unshift(record)
    persist()
    return record
  }

  const deleteDraft = (draftId) => {
    const index = state.drafts.findIndex((draft) => draft.id === draftId)
    if (index >= 0) {
      state.drafts.splice(index, 1)
      persist()
    }
  }

  // S1 local send: the mail is really stored in the local Sent folder and nowhere else.
  // No delivery, notification, or cross-owner write is performed or claimed.
  const sendMail = ({ to = '', subject = '', body = '' }) => {
    const normalized = normalizeMailRecord({
      id: nextRecordId('mail_sent'),
      to,
      subject,
      body,
      sentAt: Date.now(),
    })
    if (!normalized) return null
    const record = { id: normalized.id, to: normalized.to, subject: normalized.subject, body: normalized.body, sentAt: Date.now() }
    state.sent.unshift(record)
    persist()
    return record
  }

  // AI arrival commit: stores one validated generated mail as an unread received letter.
  // Bounded by MAIL_SHELL_RECEIVED_KEEP_LIMIT; oldest received letters are pruned.
  const receiveGeneratedMail = ({ senderName, senderAddress, subject, body, label = '', providerModel = '' }) => {
    const record = normalizeReceivedMail({
      id: nextRecordId('mail_received'),
      senderName,
      senderAddress,
      subject,
      body,
      label,
      arrivedAt: Date.now(),
      providerModel,
    })
    if (!record) return null
    state.received.unshift(record)
    if (state.received.length > MAIL_SHELL_RECEIVED_KEEP_LIMIT) {
      state.received.splice(MAIL_SHELL_RECEIVED_KEEP_LIMIT)
    }
    persist()
    return record
  }

  const drafts = computed(() => state.drafts)
  const sentMails = computed(() => state.sent)
  const receivedMails = computed(() => state.received)

  return {
    previewState: state,
    drafts,
    sentMails,
    receivedMails,
    isThreadRead,
    isThreadStarred,
    isThreadArchived,
    toggleThreadRead,
    markThreadRead,
    toggleThreadStar,
    archiveThread,
    unarchiveThread,
    saveDraft,
    deleteDraft,
    sendMail,
    receiveGeneratedMail,
  }
}

export const resetMailShellStateForTesting = () => {
  Object.assign(state, createEmptyPreviewState())
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(MAIL_SHELL_PREVIEW_STATE_STORAGE_KEY)
    }
  } catch {
    // ignore storage unavailability in tests
  }
}
