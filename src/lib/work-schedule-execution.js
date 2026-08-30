import { normalizeScheduleHandoffEventSourceRefV1 } from './schedule-handoff'
import {
  WORK_HUB_DECISIONS,
  WORK_HUB_RECORD_TYPES,
} from './work-hub-contracts'
import {
  createWorkScheduleChangeEventInstanceId,
  inspectWorkScheduleChangeSource,
} from './simulation/work-hub-event-runtime'
import {
  WORK_HUB_EVENT_TEMPLATE_ID,
  WORK_HUB_SCHEDULE_CHANGE_FACT_TYPE,
  WORK_HUB_SCHEDULE_CHANGE_RESULT,
} from './simulation/work-hub-event-templates'

export const WORK_SCHEDULE_EXECUTION_PROOF_SCHEMA_VERSION = 1

const PROOF_TEXT_FIELDS = Object.freeze([
  'calendarEventId',
  'calendarFingerprint',
  'sourceOwner',
  'sourceRecordId',
  'sourceRevision',
  'previousSourceRecordId',
  'previousSourceRevision',
  'eventInstanceId',
  'workHubPackageId',
  'organizationId',
  'membershipId',
  'worldId',
  'contactsProfileId',
  'proposalId',
  'previousProposalId',
  'acceptedReceiptId',
  'ownerFactId',
])

const trimLine = (value, max = 220) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''

const toRevision = (value) => {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : 0
}

export const normalizeWorkScheduleExecutionProof = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const normalized = {
    schemaVersion: WORK_SCHEDULE_EXECUTION_PROOF_SCHEMA_VERSION,
    kind: trimLine(raw.kind, 80),
  }
  PROOF_TEXT_FIELDS.forEach((field) => {
    normalized[field] = trimLine(raw[field], field.includes('Revision') ? 420 : 220)
  })
  ;[
    'workHubPackageRevision',
    'worldRevision',
    'contactsProfileRevision',
    'proposalRevision',
    'previousProposalRevision',
  ].forEach((field) => {
    normalized[field] = toRevision(raw[field])
  })
  normalized.verifiedAt = Math.max(0, Math.floor(Number(raw.verifiedAt) || 0))
  if (
    normalized.kind !== 'work_schedule_change_execution' ||
    PROOF_TEXT_FIELDS.some((field) => !normalized[field]) ||
    !normalized.workHubPackageRevision ||
    !normalized.worldRevision ||
    !normalized.contactsProfileRevision ||
    !normalized.proposalRevision ||
    !normalized.previousProposalRevision ||
    !normalized.verifiedAt
  ) {
    return null
  }
  return normalized
}

const parseProductionSourceRevision = (sourceRevision, sourceRecordId) => {
  const revision = trimLine(sourceRevision, 420)
  const recordId = trimLine(sourceRecordId, 180)
  if (!revision || !recordId) return null
  const marker = `:${recordId}:r`
  const markerIndex = revision.lastIndexOf(marker)
  if (markerIndex <= 0) return null
  const packageRevisionIndex = revision.lastIndexOf(':r', markerIndex - 1)
  if (packageRevisionIndex <= 0) return null
  const packageId = revision.slice(0, packageRevisionIndex)
  const packageRevision = toRevision(
    revision.slice(packageRevisionIndex + 2, markerIndex),
  )
  const proposalRevision = toRevision(revision.slice(markerIndex + marker.length))
  return packageId && packageRevision && proposalRevision
    ? { packageId, packageRevision, proposalId: recordId, proposalRevision }
    : null
}

const findAcceptedReceipt = (receipts, proposal) =>
  (Array.isArray(receipts) ? receipts : []).find(
    (receipt) =>
      receipt?.recordType === WORK_HUB_RECORD_TYPES.RECEIPT &&
      receipt.action === WORK_HUB_DECISIONS.ACCEPTED &&
      receipt.sourceRef?.recordType === WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL &&
      receipt.sourceRef?.recordId === proposal.id &&
      receipt.sourceRef?.revision === proposal.revision,
  ) || null

const createFailure = (code) => ({
  ok: false,
  code,
  proofRequired: true,
  proof: null,
})

export const inspectWorkScheduleExecutionEligibility = ({
  calendarEvent,
  calendarFingerprint,
  authorityPackage,
  expectedBinding,
  receipts = [],
  eventInstances = [],
  ownerFacts = [],
  now = Date.now(),
} = {}) => {
  const sourceRef = normalizeScheduleHandoffEventSourceRefV1(calendarEvent?.sourceRef)
  const currentRevision = parseProductionSourceRevision(
    sourceRef?.sourceRevision,
    sourceRef?.sourceRecordId,
  )
  if (
    sourceRef?.sourceOwner !== 'workplace' ||
    !currentRevision
  ) {
    return { ok: true, code: 'execution_proof_not_required', proofRequired: false, proof: null }
  }

  if (!sourceRef.previousSourceRefs?.length) {
    return createFailure('calendar_previous_source_missing')
  }

  const fingerprint = trimLine(calendarFingerprint, 80)
  if (!fingerprint) return createFailure('calendar_fingerprint_missing')
  const inspected = inspectWorkScheduleChangeSource({
    authorityPackage,
    expectedBinding,
    proposalId: sourceRef.sourceRecordId,
    now,
  })
  if (!inspected.ok) return createFailure(inspected.code || 'work_hub_authority_invalid')

  const { authority, proposal, previousProposal } = inspected
  if (
    currentRevision.packageId !== authority.authorityPackage.packageId ||
    currentRevision.packageRevision !== authority.authorityPackage.revision ||
    currentRevision.proposalRevision !== proposal.revision
  ) {
    return createFailure('calendar_source_revision_mismatch')
  }

  const previousSourceRef = sourceRef.previousSourceRefs.find((candidate) => {
    const parsed = parseProductionSourceRevision(
      candidate.sourceRevision,
      candidate.sourceRecordId,
    )
    return (
      parsed?.packageId === authority.authorityPackage.packageId &&
      parsed.proposalId === previousProposal.id &&
      parsed.proposalRevision === previousProposal.revision
    )
  })
  if (!previousSourceRef) return createFailure('calendar_previous_source_mismatch')

  const receipt = findAcceptedReceipt(receipts, proposal)
  if (!receipt) return createFailure('work_hub_acceptance_receipt_missing')
  const receiptHandoff = receipt.calendarHandoff
  if (
    calendarEvent?.status !== 'confirmed' ||
    Number(calendarEvent?.startsAt) !== Number(receiptHandoff?.proposedStartsAt) ||
    Number(calendarEvent?.endsAt) !== Number(receiptHandoff?.proposedEndsAt)
  ) {
    return createFailure('calendar_schedule_handoff_mismatch')
  }
  if (
    receiptHandoff?.sourceOwner !== sourceRef.sourceOwner ||
    receiptHandoff?.sourceRecordId !== sourceRef.sourceRecordId ||
    receiptHandoff?.sourceRevision !== sourceRef.sourceRevision ||
    receiptHandoff?.replacesSourceRef?.sourceRecordId !== previousProposal.id ||
    parseProductionSourceRevision(
      receiptHandoff.replacesSourceRef?.sourceRevision,
      receiptHandoff.replacesSourceRef?.sourceRecordId,
    )?.proposalRevision !== previousProposal.revision
  ) {
    return createFailure('work_hub_receipt_handoff_mismatch')
  }

  const instanceId = createWorkScheduleChangeEventInstanceId({
    authorityPackage: authority.authorityPackage,
    proposal,
  })
  const instance = (Array.isArray(eventInstances) ? eventInstances : []).find(
    (candidate) => candidate?.id === instanceId,
  )
  if (
    !instance ||
    instance.templateId !== WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE ||
    instance.lifecycle !== 'resolved' ||
    !instance.resultCodes?.includes(WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED)
  ) {
    return createFailure('work_schedule_change_event_unaccepted')
  }

  const ownerFact = (Array.isArray(ownerFacts) ? ownerFacts : []).find(
    (fact) =>
      fact?.type === WORK_HUB_SCHEDULE_CHANGE_FACT_TYPE &&
      fact.correlationId === instance.id &&
      fact.resultCode === WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED &&
      fact.subjectRef?.kind === WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL &&
      fact.subjectRef?.id === proposal.id &&
      fact.subjectRef?.revision === proposal.revision &&
      fact.refs?.work_hub_receipt_id === receipt.id &&
      fact.refs?.work_hub_package_id === authority.authorityPackage.packageId &&
      fact.refs?.work_hub_package_revision === authority.authorityPackage.revision,
  )
  if (!ownerFact) return createFailure('work_schedule_change_owner_fact_missing')

  const binding = authority.authorityPackage.worldBinding
  return {
    ok: true,
    code: 'work_schedule_execution_verified',
    proofRequired: true,
    proof: normalizeWorkScheduleExecutionProof({
      schemaVersion: WORK_SCHEDULE_EXECUTION_PROOF_SCHEMA_VERSION,
      kind: 'work_schedule_change_execution',
      calendarEventId: trimLine(calendarEvent?.id, 180),
      calendarFingerprint: fingerprint,
      sourceOwner: sourceRef.sourceOwner,
      sourceRecordId: sourceRef.sourceRecordId,
      sourceRevision: sourceRef.sourceRevision,
      previousSourceRecordId: previousProposal.id,
      previousSourceRevision: previousSourceRef.sourceRevision,
      eventInstanceId: instance.id,
      workHubPackageId: authority.authorityPackage.packageId,
      workHubPackageRevision: authority.authorityPackage.revision,
      organizationId: proposal.organizationId,
      membershipId: authority.membership.id,
      worldId: binding.worldId,
      worldRevision: binding.worldRevision,
      contactsProfileId: binding.contactsProfileId,
      contactsProfileRevision: binding.contactsProfileRevision,
      proposalId: proposal.id,
      proposalRevision: proposal.revision,
      previousProposalId: previousProposal.id,
      previousProposalRevision: previousProposal.revision,
      acceptedReceiptId: receipt.id,
      ownerFactId: ownerFact.id,
      verifiedAt: Math.max(0, Math.floor(Number(now) || Date.now())),
    }),
  }
}
