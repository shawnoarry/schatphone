import { normalizeScheduleHandoffDraftV1 } from './schedule-handoff'

export const WORK_HUB_CONTRACT_SCHEMA_VERSION = 1
export const WORK_HUB_STORAGE_SCHEMA_VERSION = 2
export const WORK_HUB_AUTHORITY_SCOPE = 'work_hub:issue'

export const WORK_HUB_RECORD_TYPES = Object.freeze({
  ORGANIZATION: 'organization',
  MEMBERSHIP: 'membership',
  ROLE_ASSIGNMENT: 'role_assignment',
  TEAM: 'team',
  CHANNEL: 'channel',
  WORK_NOTICE: 'work_notice',
  TASK: 'task',
  STATUS_REPORT: 'status_report',
  SCHEDULE_PROPOSAL: 'schedule_proposal',
  APPROVAL_REQUEST: 'approval_request',
  RECEIPT: 'receipt',
})

export const WORK_HUB_DECISIONS = Object.freeze({
  ACCEPTED: 'accepted',
  ADJUSTMENT_REQUESTED: 'adjustment_requested',
  DECLINED: 'declined',
})

export const WORK_HUB_SCHEDULE_CHANGE_DISPOSITIONS = Object.freeze({
  REMAINS_UNTIL_CALENDAR_SAVE: 'remains_until_calendar_save',
  CANCELLED_BY_ORGANIZATION: 'cancelled_by_organization',
})

const SCHEDULE_CHANGE_DISPOSITIONS = new Set(
  Object.values(WORK_HUB_SCHEDULE_CHANGE_DISPOSITIONS),
)

export const WORK_HUB_ISSUER_SCOPES = Object.freeze({
  NOTICE: 'work_notice:issue',
  TASK: 'task:issue',
  SCHEDULE: 'schedule:propose',
  APPROVAL: 'approval:request',
})

const COLLECTIONS = Object.freeze({
  organizations: WORK_HUB_RECORD_TYPES.ORGANIZATION,
  memberships: WORK_HUB_RECORD_TYPES.MEMBERSHIP,
  roleAssignments: WORK_HUB_RECORD_TYPES.ROLE_ASSIGNMENT,
  teams: WORK_HUB_RECORD_TYPES.TEAM,
  channels: WORK_HUB_RECORD_TYPES.CHANNEL,
  workNotices: WORK_HUB_RECORD_TYPES.WORK_NOTICE,
  tasks: WORK_HUB_RECORD_TYPES.TASK,
  statusReports: WORK_HUB_RECORD_TYPES.STATUS_REPORT,
  scheduleProposals: WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
  approvalRequests: WORK_HUB_RECORD_TYPES.APPROVAL_REQUEST,
  receipts: WORK_HUB_RECORD_TYPES.RECEIPT,
})

const trimText = (value, maxLength = 180) =>
  Array.from(typeof value === 'string' ? value.normalize('NFKC').trim() : '')
    .slice(0, maxLength)
    .join('')

const trimLine = (value, maxLength = 180) => trimText(value, maxLength).replace(/\s+/g, ' ')

const toRevision = (value) => {
  const numeric = Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : 0
}

const toTimestamp = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : fallback
}

const normalizeStringArray = (value, { limit = 40, itemLength = 120 } = {}) => {
  if (value === undefined) return []
  if (!Array.isArray(value)) return null
  const seen = new Set()
  const result = []
  for (const item of value) {
    const normalized = trimLine(item, itemLength).toLowerCase()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
    if (result.length >= limit) break
  }
  return result
}

const sortObject = (value) => {
  if (Array.isArray(value)) return value.map(sortObject)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObject(value[key])
      return result
    }, {})
}

export const createWorkHubFingerprint = (value) => {
  const text = JSON.stringify(sortObject(value))
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index))
    hash = BigInt.asUintN(64, hash * prime)
  }
  return hash.toString(16).padStart(16, '0')
}

const normalizeWorldBinding = (raw = {}) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const worldId = trimLine(raw.worldId, 120)
  const worldRevision = toRevision(raw.worldRevision)
  const contactsProfileId = trimLine(String(raw.contactsProfileId || ''), 120)
  const contactsProfileRevision = toRevision(raw.contactsProfileRevision)
  if (!worldId || !worldRevision || !contactsProfileId || !contactsProfileRevision) return null
  return { worldId, worldRevision, contactsProfileId, contactsProfileRevision }
}

const normalizeIssuer = (raw = {}) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const issuerId = trimLine(raw.issuerId, 160)
  const kind = trimLine(raw.kind, 80).toLowerCase()
  const revision = toRevision(raw.revision)
  const scopes = normalizeStringArray(raw.scopes)
  const issuedAt = toTimestamp(raw.issuedAt)
  const expiresAt = toTimestamp(raw.expiresAt)
  const revokedAt = toTimestamp(raw.revokedAt)
  if (
    !issuerId ||
    kind !== 'world_configuration_authority' ||
    !revision ||
    !scopes?.includes(WORK_HUB_AUTHORITY_SCOPE) ||
    !issuedAt
  ) {
    return null
  }
  return { issuerId, kind, revision, scopes, issuedAt, expiresAt, revokedAt }
}

const normalizeCommonRecord = (raw, recordType, binding, packageIssuerId) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const id = trimLine(raw.id, 180)
  const worldId = trimLine(raw.worldId, 120)
  const organizationId = trimLine(raw.organizationId, 180)
  const revision = toRevision(raw.revision)
  const issuerId = trimLine(raw.issuerId, 180)
  const issuedAt = toTimestamp(raw.issuedAt)
  const expiresAt = toTimestamp(raw.expiresAt)
  const revokedAt = toTimestamp(raw.revokedAt)
  if (
    !id ||
    !worldId ||
    worldId !== binding.worldId ||
    !revision ||
    !issuerId ||
    (!organizationId && recordType !== WORK_HUB_RECORD_TYPES.ORGANIZATION)
  ) {
    return null
  }
  if (recordType === WORK_HUB_RECORD_TYPES.ORGANIZATION && issuerId !== packageIssuerId) return null
  return {
    schemaVersion: WORK_HUB_CONTRACT_SCHEMA_VERSION,
    recordType,
    id,
    worldId,
    organizationId: recordType === WORK_HUB_RECORD_TYPES.ORGANIZATION ? id : organizationId,
    revision,
    issuerId,
    issuedAt,
    expiresAt,
    revokedAt,
  }
}

const normalizeLabels = (raw = {}) => {
  const nameZh = trimLine(raw.nameZh || raw.titleZh || '', 160)
  const nameEn = trimLine(raw.nameEn || raw.titleEn || nameZh, 160)
  return { nameZh, nameEn: nameEn || nameZh }
}

const normalizeRecord = (raw, recordType, binding, packageIssuerId) => {
  const common = normalizeCommonRecord(raw, recordType, binding, packageIssuerId)
  if (!common) return null
  const labels = normalizeLabels(raw)
  const issuerRoleAssignmentId = trimLine(raw.issuerRoleAssignmentId, 180)

  if (recordType === WORK_HUB_RECORD_TYPES.ORGANIZATION) {
    if (!labels.nameZh && !labels.nameEn) return null
    return {
      ...common,
      ...labels,
      kind: trimLine(raw.kind, 80).toLowerCase() || 'organization',
      status: trimLine(raw.status, 40).toLowerCase() || 'active',
    }
  }

  if (recordType === WORK_HUB_RECORD_TYPES.MEMBERSHIP) {
    const subjectProfileId = trimLine(String(raw.subjectProfileId || ''), 120)
    const subjectProfileRevision = toRevision(raw.subjectProfileRevision)
    if (!subjectProfileId || !subjectProfileRevision) return null
    return {
      ...common,
      subjectProfileId,
      subjectProfileRevision,
      status: trimLine(raw.status, 40).toLowerCase() || 'active',
      displayLabel: trimLine(raw.displayLabel, 120),
    }
  }

  if (recordType === WORK_HUB_RECORD_TYPES.ROLE_ASSIGNMENT) {
    const membershipId = trimLine(raw.membershipId, 180)
    const roleKey = trimLine(raw.roleKey, 120).toLowerCase()
    const scopes = normalizeStringArray(raw.scopes)
    const teamIds = normalizeStringArray(raw.teamIds, { itemLength: 180 })
    if (!membershipId || !roleKey || !scopes || !teamIds) return null
    return { ...common, membershipId, roleKey, ...labels, scopes, teamIds }
  }

  if (recordType === WORK_HUB_RECORD_TYPES.TEAM) {
    if (!labels.nameZh && !labels.nameEn) return null
    return { ...common, ...labels, memberRoleAssignmentIds: normalizeStringArray(raw.memberRoleAssignmentIds, { itemLength: 180 }) || [] }
  }

  if (recordType === WORK_HUB_RECORD_TYPES.CHANNEL) {
    const teamId = trimLine(raw.teamId, 180)
    if (!teamId || (!labels.nameZh && !labels.nameEn)) return null
    return { ...common, ...labels, teamId, descriptionZh: trimText(raw.descriptionZh, 400), descriptionEn: trimText(raw.descriptionEn || raw.descriptionZh, 400) }
  }

  if (recordType === WORK_HUB_RECORD_TYPES.WORK_NOTICE) {
    if (!issuerRoleAssignmentId || (!labels.nameZh && !labels.nameEn)) return null
    return {
      ...common,
      ...labels,
      issuerRoleAssignmentId,
      bodyZh: trimText(raw.bodyZh, 1200),
      bodyEn: trimText(raw.bodyEn || raw.bodyZh, 1200),
      deadlineAt: toTimestamp(raw.deadlineAt),
      decisionPolicy: trimLine(raw.decisionPolicy, 80).toLowerCase() || 'explicit_user_decision',
    }
  }

  if (recordType === WORK_HUB_RECORD_TYPES.TASK) {
    const assignedMembershipId = trimLine(raw.assignedMembershipId, 180)
    if (!issuerRoleAssignmentId || !assignedMembershipId || (!labels.nameZh && !labels.nameEn)) return null
    return {
      ...common,
      ...labels,
      issuerRoleAssignmentId,
      assignedMembershipId,
      sourceNoticeId: trimLine(raw.sourceNoticeId, 180),
      dueAt: toTimestamp(raw.dueAt),
      status: trimLine(raw.status, 40).toLowerCase() || 'open',
    }
  }

  if (recordType === WORK_HUB_RECORD_TYPES.STATUS_REPORT) {
    const actorMembershipId = trimLine(raw.actorMembershipId, 180)
    if (!actorMembershipId) return null
    return {
      ...common,
      actorMembershipId,
      sourceTaskId: trimLine(raw.sourceTaskId, 180),
      statusKey: trimLine(raw.statusKey, 80).toLowerCase(),
      note: trimText(raw.note, 800),
      createdAt: toTimestamp(raw.createdAt, common.issuedAt),
    }
  }

  if (recordType === WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL) {
    const startsAt = toTimestamp(raw.startsAt)
    const endsAt = toTimestamp(raw.endsAt)
    if (!issuerRoleAssignmentId || !startsAt || endsAt <= startsAt || (!labels.nameZh && !labels.nameEn)) return null
    const participantProfileIds = normalizeStringArray(raw.participantProfileIds, { itemLength: 120 })
    if (!participantProfileIds) return null
    const changeOfRef = raw.changeOfRef && typeof raw.changeOfRef === 'object' && !Array.isArray(raw.changeOfRef)
      ? {
          recordId: trimLine(raw.changeOfRef.recordId, 180),
          revision: toRevision(raw.changeOfRef.revision),
        }
      : null
    if (raw.changeOfRef && (!changeOfRef?.recordId || !changeOfRef.revision)) return null
    const changeDisposition = changeOfRef
      ? trimLine(
          raw.changeDisposition,
          80,
        ).toLowerCase() || WORK_HUB_SCHEDULE_CHANGE_DISPOSITIONS.REMAINS_UNTIL_CALENDAR_SAVE
      : ''
    if (changeOfRef && !SCHEDULE_CHANGE_DISPOSITIONS.has(changeDisposition)) return null
    return {
      ...common,
      ...labels,
      issuerRoleAssignmentId,
      sourceNoticeId: trimLine(raw.sourceNoticeId, 180),
      startsAt,
      endsAt,
      deadlineAt: toTimestamp(raw.deadlineAt),
      locationRef: raw.locationRef && typeof raw.locationRef === 'object' && !Array.isArray(raw.locationRef) ? { ...raw.locationRef } : null,
      participantProfileIds,
      noteZh: trimText(raw.noteZh, 800),
      noteEn: trimText(raw.noteEn || raw.noteZh, 800),
      changeOfRef,
      changeDisposition,
      changeReasonZh: trimText(raw.changeReasonZh, 800),
      changeReasonEn: trimText(raw.changeReasonEn || raw.changeReasonZh, 800),
    }
  }

  if (recordType === WORK_HUB_RECORD_TYPES.APPROVAL_REQUEST) {
    if (!issuerRoleAssignmentId || (!labels.nameZh && !labels.nameEn)) return null
    return {
      ...common,
      ...labels,
      issuerRoleAssignmentId,
      sourceTaskId: trimLine(raw.sourceTaskId, 180),
      deadlineAt: toTimestamp(raw.deadlineAt),
      detailZh: trimText(raw.detailZh, 1000),
      detailEn: trimText(raw.detailEn || raw.detailZh, 1000),
    }
  }

  if (recordType === WORK_HUB_RECORD_TYPES.RECEIPT) {
    const actorMembershipId = trimLine(raw.actorMembershipId, 180)
    const action = trimLine(raw.action, 80).toLowerCase()
    const sourceRef = raw.sourceRef && typeof raw.sourceRef === 'object'
      ? {
          recordType: trimLine(raw.sourceRef.recordType, 80).toLowerCase(),
          recordId: trimLine(raw.sourceRef.recordId, 180),
          revision: toRevision(raw.sourceRef.revision),
        }
      : null
    if (!actorMembershipId || !action || !sourceRef?.recordType || !sourceRef.recordId || !sourceRef.revision) return null
    return {
      ...common,
      actorMembershipId,
      action,
      sourceRef,
      note: trimText(raw.note, 800),
      createdAt: toTimestamp(raw.createdAt, common.issuedAt),
      calendarHandoff: raw.calendarHandoff ? normalizeScheduleHandoffDraftV1(raw.calendarHandoff) : null,
    }
  }

  return null
}

const isRecordCurrent = (record, now) =>
  Boolean(record && !record.revokedAt && (!record.expiresAt || record.expiresAt > now))

const addError = (errors, code, path, detail = '') => errors.push({ code, path, detail })

const validateReferences = (candidate, errors, now) => {
  const organizations = new Map(candidate.organizations.map((record) => [record.id, record]))
  const memberships = new Map(candidate.memberships.map((record) => [record.id, record]))
  const roles = new Map(candidate.roleAssignments.map((record) => [record.id, record]))
  const teams = new Map(candidate.teams.map((record) => [record.id, record]))
  const notices = new Map(candidate.workNotices.map((record) => [record.id, record]))
  const tasks = new Map(candidate.tasks.map((record) => [record.id, record]))
  const scheduleProposals = new Map(candidate.scheduleProposals.map((record) => [record.id, record]))

  const requireOrganization = (record, path) => {
    const organization = organizations.get(record.organizationId)
    if (!organization || organization.worldId !== record.worldId) {
      addError(errors, 'organization_reference_invalid', path)
      return null
    }
    return organization
  }
  const requireRoleScope = (record, scope, path) => {
    const role = roles.get(record.issuerRoleAssignmentId)
    if (
      !role ||
      role.organizationId !== record.organizationId ||
      !role.scopes.includes(scope) ||
      !isRecordCurrent(role, now)
    ) {
      addError(errors, 'issuer_scope_invalid', path, scope)
    }
  }

  Object.entries(COLLECTIONS).forEach(([collection]) => {
    candidate[collection].forEach((record, index) => {
      if (record.recordType !== WORK_HUB_RECORD_TYPES.ORGANIZATION) {
        requireOrganization(record, `${collection}.${index}.organizationId`)
      }
    })
  })

  candidate.memberships.forEach((record, index) => {
    if (
      record.subjectProfileId !== candidate.worldBinding.contactsProfileId ||
      record.subjectProfileRevision !== candidate.worldBinding.contactsProfileRevision
    ) {
      addError(errors, 'membership_profile_binding_mismatch', `memberships.${index}`)
    }
  })

  candidate.roleAssignments.forEach((record, index) => {
    const membership = memberships.get(record.membershipId)
    if (!membership || membership.organizationId !== record.organizationId) {
      addError(errors, 'membership_reference_invalid', `roleAssignments.${index}.membershipId`)
    }
    record.teamIds.forEach((teamId) => {
      const team = teams.get(teamId)
      if (!team || team.organizationId !== record.organizationId) {
        addError(errors, 'team_reference_invalid', `roleAssignments.${index}.teamIds`)
      }
    })
  })

  candidate.teams.forEach((record, index) => {
    record.memberRoleAssignmentIds.forEach((roleId) => {
      const role = roles.get(roleId)
      if (!role || role.organizationId !== record.organizationId) {
        addError(errors, 'role_reference_invalid', `teams.${index}.memberRoleAssignmentIds`)
      }
    })
  })

  candidate.channels.forEach((record, index) => {
    const team = teams.get(record.teamId)
    if (!team || team.organizationId !== record.organizationId) {
      addError(errors, 'team_reference_invalid', `channels.${index}.teamId`)
    }
  })

  candidate.workNotices.forEach((record, index) =>
    requireRoleScope(record, WORK_HUB_ISSUER_SCOPES.NOTICE, `workNotices.${index}.issuerRoleAssignmentId`),
  )
  candidate.tasks.forEach((record, index) => {
    requireRoleScope(record, WORK_HUB_ISSUER_SCOPES.TASK, `tasks.${index}.issuerRoleAssignmentId`)
    const membership = memberships.get(record.assignedMembershipId)
    if (!membership || membership.organizationId !== record.organizationId) {
      addError(errors, 'assignee_membership_invalid', `tasks.${index}.assignedMembershipId`)
    }
    if (record.sourceNoticeId && !notices.has(record.sourceNoticeId)) {
      addError(errors, 'notice_reference_invalid', `tasks.${index}.sourceNoticeId`)
    }
  })
  candidate.scheduleProposals.forEach((record, index) => {
    requireRoleScope(record, WORK_HUB_ISSUER_SCOPES.SCHEDULE, `scheduleProposals.${index}.issuerRoleAssignmentId`)
    if (record.sourceNoticeId && !notices.has(record.sourceNoticeId)) {
      addError(errors, 'notice_reference_invalid', `scheduleProposals.${index}.sourceNoticeId`)
    }
    if (record.changeOfRef) {
      const previous = scheduleProposals.get(record.changeOfRef.recordId)
      if (
        !previous ||
        previous.id === record.id ||
        previous.revision !== record.changeOfRef.revision ||
        previous.organizationId !== record.organizationId
      ) {
        addError(errors, 'schedule_change_lineage_invalid', `scheduleProposals.${index}.changeOfRef`)
      }
      if (!record.deadlineAt || record.deadlineAt <= record.issuedAt) {
        addError(errors, 'schedule_change_deadline_invalid', `scheduleProposals.${index}.deadlineAt`)
      }
    }
  })
  candidate.approvalRequests.forEach((record, index) => {
    requireRoleScope(record, WORK_HUB_ISSUER_SCOPES.APPROVAL, `approvalRequests.${index}.issuerRoleAssignmentId`)
    if (record.sourceTaskId && !tasks.has(record.sourceTaskId)) {
      addError(errors, 'task_reference_invalid', `approvalRequests.${index}.sourceTaskId`)
    }
  })
  candidate.statusReports.forEach((record, index) => {
    const membership = memberships.get(record.actorMembershipId)
    if (!membership || membership.organizationId !== record.organizationId) {
      addError(errors, 'actor_membership_invalid', `statusReports.${index}.actorMembershipId`)
    }
    if (record.sourceTaskId && !tasks.has(record.sourceTaskId)) {
      addError(errors, 'task_reference_invalid', `statusReports.${index}.sourceTaskId`)
    }
  })
  candidate.receipts.forEach((record, index) => {
    const membership = memberships.get(record.actorMembershipId)
    if (!membership || membership.organizationId !== record.organizationId) {
      addError(errors, 'actor_membership_invalid', `receipts.${index}.actorMembershipId`)
    }
  })
}

export const validateWorkHubAuthorityPackage = (rawPackage, { expectedBinding, now = Date.now() } = {}) => {
  const errors = []
  if (!rawPackage || typeof rawPackage !== 'object' || Array.isArray(rawPackage)) {
    return { ok: false, code: 'authority_package_invalid', errors: [{ code: 'package_invalid', path: '' }], authorityPackage: null }
  }
  const packageId = trimLine(rawPackage.packageId, 180)
  const revision = toRevision(rawPackage.revision)
  const issuedAt = toTimestamp(rawPackage.issuedAt)
  const expiresAt = toTimestamp(rawPackage.expiresAt)
  const revokedAt = toTimestamp(rawPackage.revokedAt)
  const worldBinding = normalizeWorldBinding(rawPackage.worldBinding)
  const issuer = normalizeIssuer(rawPackage.issuer)
  if (Number(rawPackage.schemaVersion) !== WORK_HUB_CONTRACT_SCHEMA_VERSION) addError(errors, 'schema_version_invalid', 'schemaVersion')
  if (!packageId) addError(errors, 'package_id_invalid', 'packageId')
  if (!revision) addError(errors, 'revision_invalid', 'revision')
  if (!issuedAt) addError(errors, 'issued_at_invalid', 'issuedAt')
  if (!worldBinding) addError(errors, 'world_binding_invalid', 'worldBinding')
  if (!issuer) addError(errors, 'issuer_invalid', 'issuer')
  if (revokedAt) addError(errors, 'authority_revoked', 'revokedAt')
  if (expiresAt && expiresAt <= now) addError(errors, 'authority_expired', 'expiresAt')
  if (issuer?.revokedAt) addError(errors, 'issuer_revoked', 'issuer.revokedAt')
  if (issuer?.expiresAt && issuer.expiresAt <= now) addError(errors, 'issuer_expired', 'issuer.expiresAt')

  const normalizedExpected = expectedBinding ? normalizeWorldBinding(expectedBinding) : null
  if (expectedBinding && !normalizedExpected) addError(errors, 'expected_binding_invalid', 'expectedBinding')
  if (worldBinding && normalizedExpected) {
    Object.keys(worldBinding).forEach((key) => {
      if (String(worldBinding[key]) !== String(normalizedExpected[key])) {
        addError(errors, 'runtime_binding_mismatch', `worldBinding.${key}`)
      }
    })
  }

  if (!worldBinding || !issuer) {
    return { ok: false, code: errors[0]?.code || 'authority_package_invalid', errors, authorityPackage: null }
  }

  const candidate = {
    schemaVersion: WORK_HUB_CONTRACT_SCHEMA_VERSION,
    packageId,
    revision,
    issuedAt,
    expiresAt,
    revokedAt,
    worldBinding,
    issuer,
  }

  Object.entries(COLLECTIONS).forEach(([collection, recordType]) => {
    const rawRecords = rawPackage[collection] === undefined ? [] : rawPackage[collection]
    if (!Array.isArray(rawRecords)) {
      addError(errors, 'collection_invalid', collection)
      candidate[collection] = []
      return
    }
    const seen = new Set()
    candidate[collection] = rawRecords.flatMap((record, index) => {
      const normalized = normalizeRecord(record, recordType, worldBinding, issuer.issuerId)
      if (!normalized) {
        addError(errors, 'record_invalid', `${collection}.${index}`)
        return []
      }
      if (seen.has(normalized.id)) {
        addError(errors, 'duplicate_record_id', `${collection}.${index}.id`, normalized.id)
        return []
      }
      seen.add(normalized.id)
      return [normalized]
    })
  })

  validateReferences(candidate, errors, now)
  const fingerprint = createWorkHubFingerprint(candidate)
  return {
    ok: errors.length === 0,
    code: errors[0]?.code || 'validated',
    errors,
    authorityPackage: errors.length === 0 ? { ...candidate, fingerprint } : null,
  }
}

export const inspectWorkHubRuntimeAuthority = (authorityPackage, expectedBinding, { now = Date.now() } = {}) => {
  const validation = validateWorkHubAuthorityPackage(authorityPackage, { expectedBinding, now })
  if (!validation.ok) return validation
  const membership = validation.authorityPackage.memberships.find(
    (record) => record.status === 'active' && isRecordCurrent(record, now),
  )
  if (!membership) return { ok: false, code: 'active_membership_missing', errors: [], authorityPackage: null }
  const roles = validation.authorityPackage.roleAssignments.filter(
    (record) => record.membershipId === membership.id && isRecordCurrent(record, now),
  )
  if (roles.length === 0) return { ok: false, code: 'active_role_missing', errors: [], authorityPackage: null }
  const organization = validation.authorityPackage.organizations.find(
    (record) => record.id === membership.organizationId && record.status === 'active' && isRecordCurrent(record, now),
  )
  if (!organization) return { ok: false, code: 'active_organization_missing', errors: [], authorityPackage: null }
  return { ...validation, membership, roles, organization }
}

export const findWorkHubRecord = (authorityPackage, recordType, recordId) => {
  const collection = Object.entries(COLLECTIONS).find(([, type]) => type === recordType)?.[0]
  if (!collection) return null
  const id = trimLine(recordId, 180)
  return authorityPackage?.[collection]?.find((record) => record.id === id) || null
}

export const createWorkHubDecisionReceipt = ({ authority, recordType, recordId, action, note = '', now = Date.now() } = {}) => {
  const decision = trimLine(action, 80).toLowerCase()
  if (!Object.values(WORK_HUB_DECISIONS).includes(decision)) {
    return { ok: false, code: 'decision_invalid', receipt: null }
  }
  if (![WORK_HUB_RECORD_TYPES.WORK_NOTICE, WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL, WORK_HUB_RECORD_TYPES.APPROVAL_REQUEST].includes(recordType)) {
    return { ok: false, code: 'record_type_not_decidable', receipt: null }
  }
  const source = findWorkHubRecord(authority.authorityPackage, recordType, recordId)
  if (!source) return { ok: false, code: 'source_record_missing', receipt: null }
  if (!isRecordCurrent(source, now)) return { ok: false, code: 'source_record_inactive', receipt: null }
  if (source.deadlineAt && source.deadlineAt <= now) return { ok: false, code: 'source_record_expired', receipt: null }

  const organizationId = source.organizationId
  if (organizationId !== authority.organization.id) {
    return { ok: false, code: 'source_organization_mismatch', receipt: null }
  }
  const id = `receipt::${recordType}::${source.id}::r${source.revision}::${decision}::${authority.membership.id}`
  let calendarHandoff = null
  if (recordType === WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL && decision === WORK_HUB_DECISIONS.ACCEPTED) {
    const previous = source.changeOfRef
      ? findWorkHubRecord(
          authority.authorityPackage,
          WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
          source.changeOfRef.recordId,
        )
      : null
    calendarHandoff = normalizeScheduleHandoffDraftV1({
      schemaVersion: 1,
      sourceOwner: 'workplace',
      sourceRecordId: source.id,
      sourceRevision: `${authority.authorityPackage.packageId}:r${authority.authorityPackage.revision}:${source.id}:r${source.revision}`,
      proposedTitleZh: source.nameZh,
      proposedTitleEn: source.nameEn,
      proposedStartsAt: source.startsAt,
      proposedEndsAt: source.endsAt,
      proposedLocationRef: source.locationRef,
      participantRefs: source.participantProfileIds.map((profileId) => ({ owner: 'contacts', recordId: profileId })),
      sourceReturnContext: {
        path: '/workplace',
        query: { section: 'work', sourceRecordId: source.id },
      },
      proposalStatus: source.changeOfRef ? 'source_changed' : 'pending_review',
      replacesSourceRef: previous
        ? {
            sourceOwner: 'workplace',
            sourceRecordId: previous.id,
            sourceRevision: `${authority.authorityPackage.packageId}:r${authority.authorityPackage.revision}:${previous.id}:r${previous.revision}`,
          }
        : null,
    })
    if (!calendarHandoff) return { ok: false, code: 'calendar_handoff_invalid', receipt: null }
  }

  return {
    ok: true,
    code: 'receipt_created',
    receipt: {
      schemaVersion: WORK_HUB_CONTRACT_SCHEMA_VERSION,
      recordType: WORK_HUB_RECORD_TYPES.RECEIPT,
      id,
      worldId: source.worldId,
      organizationId,
      revision: 1,
      issuerId: authority.membership.id,
      issuedAt: now,
      expiresAt: 0,
      revokedAt: 0,
      actorMembershipId: authority.membership.id,
      action: decision,
      sourceRef: { recordType, recordId: source.id, revision: source.revision },
      note: trimText(note, 800),
      createdAt: now,
      calendarHandoff,
    },
  }
}

export const resolveWorkHubReceiptForSource = (receipts, recordType, recordId) =>
  (Array.isArray(receipts) ? receipts : [])
    .filter((receipt) => receipt.sourceRef?.recordType === recordType && receipt.sourceRef?.recordId === recordId)
    .sort((left, right) => right.createdAt - left.createdAt)[0] || null
