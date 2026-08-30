import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  readPersistedState,
  readPersistedStateAsync,
  writePersistedState,
} from '../lib/persistence'
import { normalizeScheduleHandoffDraftV1 } from '../lib/schedule-handoff'
import {
  WORK_HUB_CONTRACT_SCHEMA_VERSION,
  WORK_HUB_DECISIONS,
  WORK_HUB_RECORD_TYPES,
  WORK_HUB_STORAGE_SCHEMA_VERSION,
  createWorkHubDecisionReceipt,
  findWorkHubRecord,
  inspectWorkHubRuntimeAuthority,
  resolveWorkHubReceiptForSource,
  validateWorkHubAuthorityPackage,
} from '../lib/work-hub-contracts'

export const WORK_HUB_STORAGE_KEY = 'store:work-hub'
export const WORK_HUB_STORAGE_VERSION = 2

const clone = (value) => JSON.parse(JSON.stringify(value))

export const migrateWorkHubStorage = ({ version, data } = {}) => {
  if (Number(version) !== 1 || !data || typeof data !== 'object' || Array.isArray(data)) return null
  return {
    ...data,
    schemaVersion: WORK_HUB_STORAGE_SCHEMA_VERSION,
    receipts: Array.isArray(data.receipts) ? data.receipts : [],
    statusReports: Array.isArray(data.statusReports) ? data.statusReports : [],
  }
}

const normalizeBinding = (binding = {}) => ({
  worldId: String(binding.worldId || '').trim(),
  worldRevision: Number(binding.worldRevision || 0),
  contactsProfileId: String(binding.contactsProfileId || '').trim(),
  contactsProfileRevision: Number(binding.contactsProfileRevision || 0),
})

const normalizeStoredReceipt = (raw, authorityPackage) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const sourceRef = raw.sourceRef && typeof raw.sourceRef === 'object' ? raw.sourceRef : null
  const source = sourceRef
    ? findWorkHubRecord(authorityPackage, sourceRef.recordType, sourceRef.recordId)
    : null
  const membership = authorityPackage?.memberships?.find(
    (record) => record.id === String(raw.actorMembershipId || '').trim(),
  )
  const action = String(raw.action || '').trim().toLowerCase()
  if (
    Number(raw.schemaVersion) !== WORK_HUB_CONTRACT_SCHEMA_VERSION ||
    raw.recordType !== WORK_HUB_RECORD_TYPES.RECEIPT ||
    !String(raw.id || '').trim() ||
    !source ||
    Number(sourceRef.revision) !== source.revision ||
    !membership ||
    membership.organizationId !== source.organizationId ||
    !Object.values(WORK_HUB_DECISIONS).includes(action)
  ) {
    return null
  }
  const calendarHandoff = raw.calendarHandoff
    ? normalizeScheduleHandoffDraftV1(raw.calendarHandoff)
    : null
  if (raw.calendarHandoff && !calendarHandoff) return null
  return {
    schemaVersion: WORK_HUB_CONTRACT_SCHEMA_VERSION,
    recordType: WORK_HUB_RECORD_TYPES.RECEIPT,
    id: String(raw.id).trim(),
    worldId: source.worldId,
    organizationId: source.organizationId,
    revision: 1,
    issuerId: membership.id,
    issuedAt: Number(raw.issuedAt || raw.createdAt || 0),
    expiresAt: 0,
    revokedAt: 0,
    actorMembershipId: membership.id,
    action,
    sourceRef: {
      recordType: source.recordType,
      recordId: source.id,
      revision: source.revision,
    },
    note: String(raw.note || '').trim().slice(0, 800),
    createdAt: Number(raw.createdAt || raw.issuedAt || 0),
    calendarHandoff,
  }
}

const normalizeStoredStatusReport = (raw, authorityPackage) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const membership = authorityPackage?.memberships?.find(
    (record) => record.id === String(raw.actorMembershipId || '').trim(),
  )
  const sourceTaskId = String(raw.sourceTaskId || '').trim()
  const task = sourceTaskId
    ? findWorkHubRecord(authorityPackage, WORK_HUB_RECORD_TYPES.TASK, sourceTaskId)
    : null
  const id = String(raw.id || '').trim()
  const statusKey = String(raw.statusKey || '').trim().toLowerCase()
  if (
    !id ||
    !membership ||
    !statusKey ||
    (sourceTaskId && (!task || task.organizationId !== membership.organizationId))
  ) {
    return null
  }
  return {
    schemaVersion: WORK_HUB_CONTRACT_SCHEMA_VERSION,
    recordType: WORK_HUB_RECORD_TYPES.STATUS_REPORT,
    id,
    worldId: membership.worldId,
    organizationId: membership.organizationId,
    revision: 1,
    issuerId: membership.id,
    issuedAt: Number(raw.issuedAt || raw.createdAt || 0),
    expiresAt: 0,
    revokedAt: 0,
    actorMembershipId: membership.id,
    sourceTaskId,
    statusKey,
    note: String(raw.note || '').trim().slice(0, 800),
    createdAt: Number(raw.createdAt || raw.issuedAt || 0),
  }
}

export const useWorkHubStore = defineStore('workHub', () => {
  const authorityPackage = ref(null)
  const receipts = ref([])
  const statusReports = ref([])
  const runtimeBinding = ref(null)
  const lastUpdatedAt = ref(0)
  const hasFinishedStorageHydration = ref(false)

  const authorityInspection = computed(() => {
    if (!authorityPackage.value) {
      return { ok: false, code: 'authority_missing', authorityPackage: null }
    }
    return inspectWorkHubRuntimeAuthority(
      authorityPackage.value,
      runtimeBinding.value || authorityPackage.value.worldBinding,
    )
  })
  const hasActiveAuthority = computed(() => authorityInspection.value.ok === true)
  const activeOrganization = computed(() => authorityInspection.value.organization || null)
  const activeMembership = computed(() => authorityInspection.value.membership || null)
  const activeRoles = computed(() => authorityInspection.value.roles || [])
  const activeTasks = computed(() =>
    hasActiveAuthority.value
      ? authorityPackage.value.tasks.filter(
          (task) => task.assignedMembershipId === activeMembership.value.id && !task.revokedAt,
        )
      : [],
  )
  const activeWorkNotices = computed(() =>
    hasActiveAuthority.value
      ? authorityPackage.value.workNotices.filter(
          (notice) => notice.organizationId === activeOrganization.value.id && !notice.revokedAt,
        )
      : [],
  )
  const activeScheduleProposals = computed(() =>
    hasActiveAuthority.value
      ? authorityPackage.value.scheduleProposals.filter(
          (proposal) => proposal.organizationId === activeOrganization.value.id && !proposal.revokedAt,
        )
      : [],
  )
  const activeApprovalRequests = computed(() =>
    hasActiveAuthority.value
      ? authorityPackage.value.approvalRequests.filter(
          (request) => request.organizationId === activeOrganization.value.id && !request.revokedAt,
        )
      : [],
  )

  const createPersistedSnapshot = () => ({
    schemaVersion: WORK_HUB_STORAGE_SCHEMA_VERSION,
    authorityPackage: authorityPackage.value ? clone(authorityPackage.value) : null,
    receipts: receipts.value.map((receipt) => clone(receipt)),
    statusReports: statusReports.value.map((report) => clone(report)),
    lastUpdatedAt: lastUpdatedAt.value,
  })

  const applyPersistedSource = (source = {}) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false
    if (!source.authorityPackage) {
      authorityPackage.value = null
      receipts.value = []
      statusReports.value = []
      lastUpdatedAt.value = Number(source.lastUpdatedAt || 0)
      return true
    }
    const validation = validateWorkHubAuthorityPackage(source.authorityPackage)
    if (!validation.ok) return false
    const normalizedAuthority = validation.authorityPackage
    const seenReceiptIds = new Set()
    const normalizedReceipts = (Array.isArray(source.receipts) ? source.receipts : []).flatMap((raw) => {
      const receipt = normalizeStoredReceipt(raw, normalizedAuthority)
      if (!receipt || seenReceiptIds.has(receipt.id)) return []
      seenReceiptIds.add(receipt.id)
      return [receipt]
    })
    const seenReportIds = new Set()
    const normalizedReports = (Array.isArray(source.statusReports) ? source.statusReports : []).flatMap((raw) => {
      const report = normalizeStoredStatusReport(raw, normalizedAuthority)
      if (!report || seenReportIds.has(report.id)) return []
      seenReportIds.add(report.id)
      return [report]
    })
    authorityPackage.value = normalizedAuthority
    receipts.value = normalizedReceipts
    statusReports.value = normalizedReports
    lastUpdatedAt.value = Number(source.lastUpdatedAt || 0)
    return true
  }

  const createBackupSnapshot = () => createPersistedSnapshot()
  const createBackupSnapshotAsync = async () => createBackupSnapshot()
  const restoreFromBackup = (snapshot = {}) => {
    const source = snapshot?.workHub && typeof snapshot.workHub === 'object'
      ? snapshot.workHub
      : snapshot
    return applyPersistedSource(source)
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(WORK_HUB_STORAGE_KEY, {
      version: WORK_HUB_STORAGE_VERSION,
      migrate: migrateWorkHubStorage,
    })
    return applyPersistedSource(persisted)
  }
  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(WORK_HUB_STORAGE_KEY, {
      version: WORK_HUB_STORAGE_VERSION,
      migrate: migrateWorkHubStorage,
    })
    return applyPersistedSource(persisted)
  }
  const persistToStorage = () =>
    writePersistedState(WORK_HUB_STORAGE_KEY, createPersistedSnapshot(), {
      version: WORK_HUB_STORAGE_VERSION,
      migrate: migrateWorkHubStorage,
    })
  const saveNow = () => persistToStorage()

  const commitMutation = (mutate) => {
    const before = createPersistedSnapshot()
    const result = mutate()
    if (result?.ok !== true) return result
    const persistence = persistToStorage()
    if (persistence?.ok === true) return { ...result, persistence }
    applyPersistedSource(before)
    return {
      ...result,
      ok: false,
      code: 'persistence_failed',
      persistence,
      rolledBack: true,
    }
  }

  const bindRuntimeContext = (binding = {}) => {
    runtimeBinding.value = normalizeBinding(binding)
    return authorityInspection.value
  }

  const installAuthorityPackage = (
    rawPackage,
    { expectedBinding, confirmed = false, replaceExisting = false, now = Date.now() } = {},
  ) => {
    if (!confirmed) return { ok: false, code: 'explicit_confirmation_required' }
    const binding = normalizeBinding(expectedBinding)
    const validation = validateWorkHubAuthorityPackage(rawPackage, {
      expectedBinding: binding,
      now,
    })
    if (!validation.ok) return validation
    const incoming = validation.authorityPackage
    const existing = authorityPackage.value
    if (existing) {
      if (existing.packageId === incoming.packageId && existing.revision > incoming.revision) {
        return { ok: false, code: 'authority_revision_stale' }
      }
      if (existing.packageId === incoming.packageId && existing.revision === incoming.revision) {
        return existing.fingerprint === incoming.fingerprint
          ? { ok: true, code: 'authority_reused', authorityPackage: existing, reused: true }
          : { ok: false, code: 'authority_revision_conflict' }
      }
      if (!replaceExisting) return { ok: false, code: 'authority_replacement_confirmation_required' }
    }
    return commitMutation(() => {
      const preservedReceipts = receipts.value
        .map((receipt) => normalizeStoredReceipt(receipt, incoming))
        .filter(Boolean)
      const preservedReports = statusReports.value
        .map((report) => normalizeStoredStatusReport(report, incoming))
        .filter(Boolean)
      authorityPackage.value = incoming
      receipts.value = preservedReceipts
      statusReports.value = preservedReports
      runtimeBinding.value = binding
      lastUpdatedAt.value = now
      return { ok: true, code: 'authority_installed', authorityPackage: incoming }
    })
  }

  const decideRecord = (recordType, recordId, action, { note = '', now = Date.now() } = {}) => {
    const authority = authorityInspection.value
    if (!authority.ok) return { ok: false, code: authority.code }
    const source = findWorkHubRecord(authority.authorityPackage, recordType, recordId)
    const existing = resolveWorkHubReceiptForSource(receipts.value, recordType, recordId)
    if (existing) {
      if (source && existing.sourceRef.revision !== source.revision) {
        return { ok: false, code: 'decision_source_revision_stale' }
      }
      return existing.action === action
        ? { ok: true, code: 'decision_reused', receipt: existing, reused: true }
        : { ok: false, code: 'decision_conflict', receipt: existing }
    }
    const result = createWorkHubDecisionReceipt({
      authority,
      recordType,
      recordId,
      action,
      note,
      now,
    })
    if (!result.ok) return result
    return commitMutation(() => {
      receipts.value = [...receipts.value, result.receipt].slice(-500)
      lastUpdatedAt.value = now
      return result
    })
  }

  const submitStatusReport = ({ sourceTaskId = '', statusKey, note = '', now = Date.now() } = {}) => {
    const authority = authorityInspection.value
    if (!authority.ok) return { ok: false, code: authority.code }
    const task = sourceTaskId
      ? findWorkHubRecord(authority.authorityPackage, WORK_HUB_RECORD_TYPES.TASK, sourceTaskId)
      : null
    if (sourceTaskId && (!task || task.assignedMembershipId !== authority.membership.id)) {
      return { ok: false, code: 'status_task_invalid' }
    }
    const normalizedStatus = String(statusKey || '').trim().toLowerCase()
    if (!normalizedStatus) return { ok: false, code: 'status_key_missing' }
    const report = {
      schemaVersion: WORK_HUB_CONTRACT_SCHEMA_VERSION,
      recordType: WORK_HUB_RECORD_TYPES.STATUS_REPORT,
      id: `status_report::${authority.membership.id}::${now}::${statusReports.value.length}`,
      worldId: authority.membership.worldId,
      organizationId: authority.membership.organizationId,
      revision: 1,
      issuerId: authority.membership.id,
      issuedAt: now,
      expiresAt: 0,
      revokedAt: 0,
      actorMembershipId: authority.membership.id,
      sourceTaskId: task?.id || '',
      statusKey: normalizedStatus,
      note: String(note || '').trim().slice(0, 800),
      createdAt: now,
    }
    return commitMutation(() => {
      statusReports.value = [...statusReports.value, report].slice(-300)
      lastUpdatedAt.value = now
      return { ok: true, code: 'status_report_created', report }
    })
  }

  const receiptForSource = (recordType, recordId) =>
    resolveWorkHubReceiptForSource(receipts.value, recordType, recordId)

  const ownsScheduleProposal = (proposalId) => {
    const authority = authorityInspection.value
    if (!authority.ok) return false
    return Boolean(findWorkHubRecord(
      authority.authorityPackage,
      WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
      proposalId,
    ))
  }

  const resolveScheduleHandoffDraft = (proposalId) => {
    const authority = authorityInspection.value
    if (!authority.ok) return null
    const receipt = receiptForSource(WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL, proposalId)
    if (receipt?.action !== WORK_HUB_DECISIONS.ACCEPTED) return null
    const proposal = findWorkHubRecord(
      authority.authorityPackage,
      WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
      proposalId,
    )
    if (!proposal || receipt.sourceRef.revision !== proposal.revision) return null
    return normalizeScheduleHandoffDraftV1(receipt.calendarHandoff)
  }

  const resetForTesting = () => {
    authorityPackage.value = null
    receipts.value = []
    statusReports.value = []
    runtimeBinding.value = null
    lastUpdatedAt.value = 0
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) await hydrateFromStorageAsync()
    hasFinishedStorageHydration.value = true
  })()

  return {
    authorityPackage,
    receipts,
    statusReports,
    runtimeBinding,
    lastUpdatedAt,
    hasFinishedStorageHydration,
    authorityInspection,
    hasActiveAuthority,
    activeOrganization,
    activeMembership,
    activeRoles,
    activeTasks,
    activeWorkNotices,
    activeScheduleProposals,
    activeApprovalRequests,
    bindRuntimeContext,
    installAuthorityPackage,
    decideRecord,
    submitStatusReport,
    receiptForSource,
    ownsScheduleProposal,
    resolveScheduleHandoffDraft,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    hydrateFromStorageAsync,
    saveNow,
    resetForTesting,
  }
})
