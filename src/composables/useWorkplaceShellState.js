import { computed, reactive } from 'vue'
import {
  WORKPLACE_CHANNELS,
  WORKPLACE_SCHEDULE_PROPOSALS,
  WORKPLACE_SHELL_STORAGE_KEY,
  WORKPLACE_SHELL_STORAGE_VERSION,
  WORKPLACE_STATUS_OPTIONS,
  WORKPLACE_TASKS,
  findWorkplaceChannel,
  findWorkplaceProposal,
  findWorkplaceTask,
} from '../lib/workplace-shell-data'

const MAX_SENT_MESSAGES = 40
const MAX_STATUS_REPORTS = 24

const createDefaultState = () => ({
  version: WORKPLACE_SHELL_STORAGE_VERSION,
  organizationDisplayName: '',
  completedTaskIds: [],
  sentMessages: [],
  statusReports: [],
  proposalDecisions: {},
  artistApplication: null,
})

const normalizeText = (value, maxLength) =>
  Array.from(typeof value === 'string' ? value.trim() : '').slice(0, maxLength).join('')

export const normalizeWorkplaceShellState = (candidate) => {
  const fallback = createDefaultState()
  if (!candidate || ![1, WORKPLACE_SHELL_STORAGE_VERSION].includes(candidate.version)) return fallback
  const completedTaskIds = [...new Set(
    (Array.isArray(candidate.completedTaskIds) ? candidate.completedTaskIds : [])
      .filter((id) => typeof id === 'string' && findWorkplaceTask(id)),
  )]
  const sentMessages = (Array.isArray(candidate.sentMessages) ? candidate.sentMessages : [])
    .filter((item) => item && findWorkplaceChannel(item.channelId))
    .map((item) => ({
      id: normalizeText(item.id, 120),
      channelId: item.channelId,
      body: normalizeText(item.body, 600),
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : 0,
    }))
    .filter((item) => item.id && item.body)
    .slice(-MAX_SENT_MESSAGES)
  const statusReports = (Array.isArray(candidate.statusReports) ? candidate.statusReports : [])
    .filter((item) => item && WORKPLACE_STATUS_OPTIONS.some((option) => option.id === item.statusId))
    .map((item) => ({
      id: normalizeText(item.id, 120),
      statusId: item.statusId,
      note: normalizeText(item.note, 400),
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : 0,
    }))
    .filter((item) => item.id)
    .slice(-MAX_STATUS_REPORTS)
  const proposalDecisions = Object.fromEntries(
    Object.entries(candidate.proposalDecisions && typeof candidate.proposalDecisions === 'object'
      ? candidate.proposalDecisions
      : {})
      .filter(([id, decision]) => findWorkplaceProposal(id) && ['accepted', 'declined'].includes(decision)),
  )
  const artistApplication = candidate.artistApplication?.status === 'pending'
    ? {
        id: normalizeText(candidate.artistApplication.id, 120),
        status: 'pending',
        submittedAt: Number.isFinite(candidate.artistApplication.submittedAt)
          ? candidate.artistApplication.submittedAt
          : 0,
      }
    : null
  return {
    version: WORKPLACE_SHELL_STORAGE_VERSION,
    organizationDisplayName: normalizeText(candidate.organizationDisplayName, 60),
    completedTaskIds,
    sentMessages,
    statusReports,
    proposalDecisions,
    artistApplication,
  }
}

const loadState = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return createDefaultState()
    const raw = window.localStorage.getItem(WORKPLACE_SHELL_STORAGE_KEY)
    return raw ? normalizeWorkplaceShellState(JSON.parse(raw)) : createDefaultState()
  } catch {
    return createDefaultState()
  }
}

const state = reactive(loadState())

const cloneState = () => JSON.parse(JSON.stringify(state))

const persist = (candidate) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { ok: false, error: 'storage_unavailable' }
    window.localStorage.setItem(WORKPLACE_SHELL_STORAGE_KEY, JSON.stringify(candidate))
    return { ok: true }
  } catch {
    return { ok: false, error: 'write_failed' }
  }
}

export const useWorkplaceShellState = () => {
  const completedTaskIds = computed(() => state.completedTaskIds)
  const organizationDisplayName = computed(() => state.organizationDisplayName)
  const sentMessages = computed(() => state.sentMessages)
  const statusReports = computed(() => state.statusReports)
  const proposalDecisions = computed(() => state.proposalDecisions)
  const artistApplication = computed(() => state.artistApplication)

  const toggleTask = (taskId) => {
    if (!findWorkplaceTask(taskId)) return { ok: false, error: 'task_missing' }
    const next = cloneState()
    const index = next.completedTaskIds.indexOf(taskId)
    if (index >= 0) next.completedTaskIds.splice(index, 1)
    else next.completedTaskIds.push(taskId)
    const receipt = persist(next)
    if (!receipt.ok) return receipt
    Object.assign(state, next)
    return { ok: true, completed: index < 0 }
  }

  const sendMessage = (channelId, body) => {
    if (!findWorkplaceChannel(channelId)) return { ok: false, error: 'channel_missing' }
    const normalizedBody = normalizeText(body, 600)
    if (!normalizedBody) return { ok: false, error: 'message_empty' }
    const createdAt = Date.now()
    const message = {
      id: `workplace-message-${createdAt}-${state.sentMessages.length}`,
      channelId,
      body: normalizedBody,
      createdAt,
    }
    const next = cloneState()
    next.sentMessages.push(message)
    next.sentMessages.splice(0, Math.max(0, next.sentMessages.length - MAX_SENT_MESSAGES))
    const receipt = persist(next)
    if (!receipt.ok) return receipt
    Object.assign(state, next)
    return { ok: true, value: message }
  }

  const submitStatusReport = (statusId, note = '') => {
    if (!WORKPLACE_STATUS_OPTIONS.some((option) => option.id === statusId)) {
      return { ok: false, error: 'status_missing' }
    }
    const createdAt = Date.now()
    const report = {
      id: `workplace-status-${createdAt}-${state.statusReports.length}`,
      statusId,
      note: normalizeText(note, 400),
      createdAt,
    }
    const next = cloneState()
    next.statusReports.push(report)
    next.statusReports.splice(0, Math.max(0, next.statusReports.length - MAX_STATUS_REPORTS))
    const receipt = persist(next)
    if (!receipt.ok) return receipt
    Object.assign(state, next)
    return { ok: true, value: report }
  }

  const decideProposal = (proposalId, decision) => {
    if (!findWorkplaceProposal(proposalId)) return { ok: false, error: 'proposal_missing' }
    if (!['accepted', 'declined'].includes(decision)) return { ok: false, error: 'decision_invalid' }
    const next = cloneState()
    next.proposalDecisions[proposalId] = decision
    const receipt = persist(next)
    if (!receipt.ok) return receipt
    Object.assign(state, next)
    return { ok: true, decision }
  }

  const submitArtistApplication = () => {
    if (state.artistApplication?.status === 'pending') return { ok: true, value: state.artistApplication }
    const submittedAt = Date.now()
    const next = cloneState()
    next.artistApplication = {
      id: `workplace-artist-application-${submittedAt}`,
      status: 'pending',
      submittedAt,
    }
    const receipt = persist(next)
    if (!receipt.ok) return receipt
    Object.assign(state, next)
    return { ok: true, value: state.artistApplication }
  }

  const setOrganizationDisplayName = (displayName = '') => {
    const normalizedDisplayName = normalizeText(displayName, 60)
    if (!normalizedDisplayName) return { ok: false, error: 'organization_name_empty' }
    const next = cloneState()
    next.organizationDisplayName = normalizedDisplayName
    const receipt = persist(next)
    if (!receipt.ok) return receipt
    Object.assign(state, next)
    return { ok: true, value: normalizedDisplayName }
  }

  const resetOrganizationDisplayName = () => {
    const next = cloneState()
    next.organizationDisplayName = ''
    const receipt = persist(next)
    if (!receipt.ok) return receipt
    Object.assign(state, next)
    return { ok: true }
  }

  const messagesForChannel = (channelId) => [
    ...(findWorkplaceChannel(channelId)?.messages || []),
    ...state.sentMessages.filter((message) => message.channelId === channelId),
  ]

  return {
    previewState: state,
    organizationDisplayName,
    completedTaskIds,
    sentMessages,
    statusReports,
    proposalDecisions,
    artistApplication,
    toggleTask,
    sendMessage,
    submitStatusReport,
    decideProposal,
    submitArtistApplication,
    setOrganizationDisplayName,
    resetOrganizationDisplayName,
    messagesForChannel,
  }
}

export const resetWorkplaceShellStateForTesting = () => {
  Object.assign(state, createDefaultState())
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(WORKPLACE_SHELL_STORAGE_KEY)
    }
  } catch {
    // Test reset stays best-effort.
  }
}

export const WORKPLACE_FIXTURE_COUNTS = Object.freeze({
  channels: WORKPLACE_CHANNELS.length,
  tasks: WORKPLACE_TASKS.length,
  proposals: WORKPLACE_SCHEDULE_PROPOSALS.length,
})
