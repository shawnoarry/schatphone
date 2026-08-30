import {
  WORK_HUB_DECISIONS,
  WORK_HUB_RECORD_TYPES,
  findWorkHubRecord,
  inspectWorkHubRuntimeAuthority,
} from '../work-hub-contracts'
import { resolveOptionalEventPolicy } from './event-policy'
import {
  WORK_HUB_EVENT_TEMPLATE_ID,
  WORK_HUB_SCHEDULE_CHANGE_ENTRY,
  WORK_HUB_SCHEDULE_CHANGE_FACT_TYPE,
  WORK_HUB_SCHEDULE_CHANGE_RESULT,
} from './work-hub-event-templates'

const HOUR_MS = 60 * 60 * 1000

export const WORK_HUB_SCHEDULE_CHANGE_EVENT_POLICY = Object.freeze({
  moduleKey: 'work_hub',
  cooldownMs: 4 * HOUR_MS,
  dailyLimit: 4,
  probabilityByIntensity: Object.freeze({ low: 0.35, balanced: 0.35, high: 0.35 }),
})

const DECISION_RESULT_CODES = Object.freeze({
  [WORK_HUB_DECISIONS.ACCEPTED]: WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED,
  [WORK_HUB_DECISIONS.ADJUSTMENT_REQUESTED]: WORK_HUB_SCHEDULE_CHANGE_RESULT.ADJUSTMENT_REQUESTED,
  [WORK_HUB_DECISIONS.DECLINED]: WORK_HUB_SCHEDULE_CHANGE_RESULT.DECLINED,
})

const normalizeNow = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : Date.now()
}

const createDayKey = (at) => {
  const date = new Date(normalizeNow(at))
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createSourceRevision = (authorityPackage, proposal) =>
  `${authorityPackage.packageId}:r${authorityPackage.revision}:${proposal.id}:r${proposal.revision}`

export const inspectWorkScheduleChangeSource = ({
  authorityPackage,
  expectedBinding,
  proposalId,
  now = Date.now(),
} = {}) => {
  const runtimeNow = normalizeNow(now)
  const authority = inspectWorkHubRuntimeAuthority(authorityPackage, expectedBinding, {
    now: runtimeNow,
  })
  if (!authority.ok) return { ok: false, code: authority.code, authority: null }
  const proposal = findWorkHubRecord(
    authority.authorityPackage,
    WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
    proposalId,
  )
  if (!proposal) return { ok: false, code: 'schedule_change_source_missing', authority }
  if (proposal.revokedAt) return { ok: false, code: 'schedule_change_source_revoked', authority, proposal }
  if (proposal.expiresAt && proposal.expiresAt <= runtimeNow) {
    return { ok: false, code: 'schedule_change_source_stale', authority, proposal }
  }
  if (!proposal.changeOfRef) {
    return { ok: false, code: 'schedule_change_lineage_missing', authority, proposal }
  }
  const previousProposal = findWorkHubRecord(
    authority.authorityPackage,
    WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
    proposal.changeOfRef.recordId,
  )
  if (!previousProposal || previousProposal.revision !== proposal.changeOfRef.revision) {
    return { ok: false, code: 'schedule_change_lineage_stale', authority, proposal }
  }
  if (!proposal.deadlineAt) {
    return { ok: false, code: 'schedule_change_deadline_missing', authority, proposal, previousProposal }
  }
  return { ok: true, code: 'schedule_change_source_valid', authority, proposal, previousProposal }
}

export const createWorkScheduleChangeEventInstanceId = ({ authorityPackage, proposal } = {}) => {
  if (!authorityPackage?.packageId || !authorityPackage?.revision || !proposal?.id || !proposal?.revision) return ''
  return `event::organization.work_schedule_change.v1::${authorityPackage.packageId}::r${authorityPackage.revision}::${proposal.id}::r${proposal.revision}`
}

const buildTriggerContext = ({ inspected, policySnapshot, entryDisposition }) => {
  const { authority, proposal, previousProposal } = inspected
  const binding = authority.authorityPackage.worldBinding
  return {
    event_entry_disposition: entryDisposition,
    event_policy_schema_version: policySnapshot.schemaVersion,
    event_policy_intensity: policySnapshot.intensity,
    event_policy_probability: policySnapshot.probability,
    event_policy_module_enabled: policySnapshot.moduleEventsEnabled,
    work_hub_package_id: authority.authorityPackage.packageId,
    work_hub_package_revision: authority.authorityPackage.revision,
    organization_id: proposal.organizationId,
    membership_id: authority.membership.id,
    schedule_proposal_id: proposal.id,
    schedule_proposal_revision: proposal.revision,
    schedule_proposal_source_revision: createSourceRevision(authority.authorityPackage, proposal),
    previous_schedule_proposal_id: previousProposal.id,
    previous_schedule_proposal_revision: previousProposal.revision,
    previous_schedule_source_revision: createSourceRevision(authority.authorityPackage, previousProposal),
    decision_deadline_at: proposal.deadlineAt,
    world_revision: binding.worldRevision,
    contacts_profile_id: binding.contactsProfileId,
    contacts_profile_revision: binding.contactsProfileRevision,
    schedule_title_zh: proposal.nameZh,
    schedule_title_en: proposal.nameEn,
    previous_starts_at: previousProposal.startsAt,
    previous_ends_at: previousProposal.endsAt,
    proposed_starts_at: proposal.startsAt,
    proposed_ends_at: proposal.endsAt,
    change_disposition: proposal.changeDisposition,
    change_reason_zh: proposal.changeReasonZh,
    change_reason_en: proposal.changeReasonEn,
  }
}

export const startWorkScheduleChangeEvent = ({
  simulationStore,
  workHubStore,
  proposalId,
  randomValue,
  now = Date.now(),
  policy = WORK_HUB_SCHEDULE_CHANGE_EVENT_POLICY,
} = {}) => {
  if (!simulationStore || !workHubStore) return { ok: false, reason: 'runtime_store_missing' }
  const runtimeNow = normalizeNow(now)
  const inspected = inspectWorkScheduleChangeSource({
    authorityPackage: workHubStore.authorityPackage,
    expectedBinding: workHubStore.runtimeBinding || workHubStore.authorityPackage?.worldBinding,
    proposalId,
    now: runtimeNow,
  })
  if (!inspected.ok) return { ok: false, reason: inspected.code, inspected }
  const instanceId = createWorkScheduleChangeEventInstanceId({
    authorityPackage: inspected.authority.authorityPackage,
    proposal: inspected.proposal,
  })
  const existing = simulationStore.getEventInstanceV2(instanceId)
  if (existing) {
    const exactSource =
      existing.templateId === WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE &&
      existing.contextRefs.schedule_proposal_id === inspected.proposal.id &&
      existing.contextRefs.schedule_proposal_revision === inspected.proposal.revision &&
      existing.contextRefs.work_hub_package_id === inspected.authority.authorityPackage.packageId &&
      existing.contextRefs.work_hub_package_revision === inspected.authority.authorityPackage.revision
    return exactSource
      ? { ok: true, changed: false, reason: 'instance_already_started', instance: existing, inspected }
      : { ok: false, changed: false, reason: 'instance_id_conflict', instance: existing, inspected }
  }
  const policySnapshot = resolveOptionalEventPolicy({
    simulationStore,
    moduleKey: policy.moduleKey,
    probabilityByIntensity: policy.probabilityByIntensity,
  })
  if (!policySnapshot) return { ok: false, reason: 'event_policy_invalid', inspected }
  const targetId = inspected.proposal.organizationId
  const cooldownActive = simulationStore.isCoolingDown(WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE, {
    targetId,
    at: runtimeNow,
  })
  const dailyLimitReached = !simulationStore.canUseDailyQuota(
    WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE,
    { targetId, dayKey: createDayKey(runtimeNow), limit: policy.dailyLimit },
  )
  const entryDisposition = !policySnapshot.allowed
    ? WORK_HUB_SCHEDULE_CHANGE_ENTRY.POLICY_OFF
    : cooldownActive
      ? WORK_HUB_SCHEDULE_CHANGE_ENTRY.COOLDOWN
      : dailyLimitReached
        ? WORK_HUB_SCHEDULE_CHANGE_ENTRY.DAILY_LIMIT
        : WORK_HUB_SCHEDULE_CHANGE_ENTRY.ELIGIBLE
  const before = simulationStore.createBackupSnapshot()
  const result = simulationStore.startEventInstanceV2({
    id: instanceId,
    templateId: WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE,
    contextRefs: buildTriggerContext({ inspected, policySnapshot, entryDisposition }),
    worldBinding: { worldId: inspected.authority.authorityPackage.worldBinding.worldId },
    randomValues: { work_schedule_change_event_gate: randomValue },
    now: runtimeNow,
  })
  if (!result.ok) return { ...result, inspected, policySnapshot }
  const hasPendingRequest = result.instance?.pendingOwnerRequests?.some(
    (request) => request.targetModule === 'work_hub' && request.status === 'pending',
  )
  if (hasPendingRequest && result.created) {
    simulationStore.markCooldown({
      eventId: WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE,
      targetId,
      cooldownMs: policy.cooldownMs,
      at: runtimeNow,
    })
    simulationStore.incrementDailyCounter({
      eventId: WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE,
      targetId,
      dayKey: createDayKey(runtimeNow),
      limit: policy.dailyLimit,
      at: runtimeNow,
    })
    const persisted = simulationStore.saveNow()
    if (persisted?.ok !== true) {
      simulationStore.restoreFromBackup(before)
      simulationStore.saveNow()
      return {
        ok: false,
        changed: false,
        reason: persisted?.error || 'persistence_failed',
        instance: null,
        rolledBack: true,
        inspected,
        policySnapshot,
      }
    }
  }
  return { ...result, inspected, policySnapshot, entryDisposition }
}

const buildOwnerFact = ({ instance, request, resultCode, receiptId = '', now }) => ({
  schemaVersion: 1,
  id: `owner_fact::${instance.id}::${resultCode}`,
  type: WORK_HUB_SCHEDULE_CHANGE_FACT_TYPE,
  sourceModule: 'work_hub',
  subjectRef: {
    kind: WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
    id: instance.contextRefs.schedule_proposal_id,
    revision: instance.contextRefs.schedule_proposal_revision,
  },
  correlationId: instance.id,
  causationId: request?.id || '',
  resultCode,
  refs: {
    owner_request_id: request?.id || '',
    work_hub_receipt_id: receiptId,
    work_hub_package_id: instance.contextRefs.work_hub_package_id,
    work_hub_package_revision: instance.contextRefs.work_hub_package_revision,
    previous_schedule_proposal_id: instance.contextRefs.previous_schedule_proposal_id,
    previous_schedule_proposal_revision: instance.contextRefs.previous_schedule_proposal_revision,
  },
  occurredAt: normalizeNow(now),
})

export const respondToWorkScheduleChangeEvent = ({
  simulationStore,
  workHubStore,
  instanceId,
  action,
  note = '',
  now = Date.now(),
} = {}) => {
  const instance = simulationStore?.getEventInstanceV2?.(instanceId)
  if (!instance || instance.templateId !== WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE) {
    return { ok: false, reason: 'schedule_change_instance_missing' }
  }
  if (instance.lifecycle !== 'active') {
    return { ok: true, changed: false, reason: 'schedule_change_instance_terminal', instance }
  }
  const request = instance.pendingOwnerRequests.find(
    (item) => item.targetModule === 'work_hub' && item.status === 'pending',
  )
  if (!request) return { ok: false, reason: 'schedule_change_request_missing', instance }
  const inspected = inspectWorkScheduleChangeSource({
    authorityPackage: workHubStore.authorityPackage,
    expectedBinding: workHubStore.runtimeBinding || workHubStore.authorityPackage?.worldBinding,
    proposalId: instance.contextRefs.schedule_proposal_id,
    now,
  })
  let resultCode = ''
  if (!inspected.ok) {
    resultCode = inspected.code.includes('revoked')
      ? WORK_HUB_SCHEDULE_CHANGE_RESULT.REVOKED
      : WORK_HUB_SCHEDULE_CHANGE_RESULT.STALE
  } else if (
    inspected.authority.authorityPackage.packageId !== instance.contextRefs.work_hub_package_id ||
    inspected.authority.authorityPackage.revision !== instance.contextRefs.work_hub_package_revision ||
    inspected.proposal.revision !== instance.contextRefs.schedule_proposal_revision ||
    inspected.previousProposal.revision !== instance.contextRefs.previous_schedule_proposal_revision
  ) {
    resultCode = WORK_HUB_SCHEDULE_CHANGE_RESULT.STALE
  }
  if (resultCode) {
    return simulationStore.recordOwnerFactAndAdvance(
      buildOwnerFact({ instance, request, resultCode, now }),
      { now },
    )
  }
  const normalizedAction = String(action || '').trim().toLowerCase()
  if (!DECISION_RESULT_CODES[normalizedAction]) return { ok: false, reason: 'decision_invalid' }
  const workHubBefore = workHubStore.createBackupSnapshot()
  const decision = workHubStore.decideRecord(
    WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
    inspected.proposal.id,
    normalizedAction,
    { note, now },
  )
  if (!decision.ok) {
    if (decision.code !== 'persistence_failed') return { ok: false, reason: decision.code, decision }
    const failed = simulationStore.recordOwnerFactAndAdvance(
      buildOwnerFact({
        instance,
        request,
        resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.WRITE_FAILED,
        now,
      }),
      { now },
    )
    return { ...failed, decision }
  }
  const advanced = simulationStore.recordOwnerFactAndAdvance(
    buildOwnerFact({
      instance,
      request,
      resultCode: DECISION_RESULT_CODES[normalizedAction],
      receiptId: decision.receipt?.id,
      now,
    }),
    { now },
  )
  if (!advanced.ok) {
    workHubStore.restoreFromBackup(workHubBefore)
    const rollbackPersistence = workHubStore.saveNow()
    return {
      ...advanced,
      decision: null,
      workHubRolledBack: true,
      rollbackPersistence,
    }
  }
  return { ...advanced, decision }
}

export const reconcileWorkScheduleChangeEvent = ({
  simulationStore,
  workHubStore,
  instanceId,
  now = Date.now(),
} = {}) => {
  const instance = simulationStore?.getEventInstanceV2?.(instanceId)
  if (!instance) {
    return { ok: false, changed: false, reason: 'schedule_change_instance_missing', instance: null }
  }
  const request = instance.pendingOwnerRequests.find(
    (item) => item.targetModule === 'work_hub' && item.status === 'pending',
  )
  if (workHubStore && instance.lifecycle === 'active' && request) {
    const inspected = inspectWorkScheduleChangeSource({
      authorityPackage: workHubStore.authorityPackage,
      expectedBinding: workHubStore.runtimeBinding || workHubStore.authorityPackage?.worldBinding,
      proposalId: instance.contextRefs.schedule_proposal_id,
      now,
    })
    const exactSource =
      inspected.ok &&
      inspected.authority.authorityPackage.packageId === instance.contextRefs.work_hub_package_id &&
      inspected.authority.authorityPackage.revision === instance.contextRefs.work_hub_package_revision &&
      inspected.proposal.revision === instance.contextRefs.schedule_proposal_revision &&
      inspected.previousProposal.revision === instance.contextRefs.previous_schedule_proposal_revision
    if (!exactSource) {
      const resultCode = inspected.code?.includes('revoked')
        ? WORK_HUB_SCHEDULE_CHANGE_RESULT.REVOKED
        : WORK_HUB_SCHEDULE_CHANGE_RESULT.STALE
      return simulationStore.recordOwnerFactAndAdvance(
        buildOwnerFact({ instance, request, resultCode, now }),
        { now },
      )
    }
  }
  return simulationStore.advanceStoredEventInstanceV2({ instanceId, now })
}
