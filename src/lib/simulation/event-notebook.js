export const EVENT_NOTEBOOK_SOURCE_KIND = Object.freeze({
  EVENT_INSTANCE: 'event_instance',
  EVENT_LOG: 'event_log',
  CHAT_SOCIAL_PROPOSAL: 'chat_social_proposal',
  MAP_JOURNEY_PROPOSAL: 'map_journey_proposal',
})

export const EVENT_NOTEBOOK_STATUS_GROUP = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  FAILED: 'failed',
  UNAVAILABLE: 'unavailable',
})

export const EVENT_REVIEW_NOTE_BODY_MAX_LENGTH = 4000

const SOURCE_KINDS = new Set(Object.values(EVENT_NOTEBOOK_SOURCE_KIND))
const PENDING_STATUSES = new Set(['active', 'pending_review', 'ready_to_apply'])
const FAILED_STATUSES = new Set(['failed', 'blocked'])
const SKIPPED_STATUSES = new Set(['skipped', 'dismissed'])
const UNAVAILABLE_STATUSES = new Set(['unavailable', 'source_missing'])

const isRecord = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value))

const normalizeText = (value, max = 180) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).trim().replace(/\s+/g, ' ').slice(0, max)
}

const normalizeTimestamp = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : Math.max(0, fallback)
}

const normalizeNoteBody = (value) => {
  if (typeof value !== 'string') return ''
  const body = value.replace(/\r\n?/g, '\n').split('\u0000').join('').trim()
  if (!body || body.length > EVENT_REVIEW_NOTE_BODY_MAX_LENGTH) return ''
  return body
}

export const normalizeEventNotebookRef = (rawRef) => {
  if (!isRecord(rawRef)) return null
  const sourceKind = normalizeText(rawRef.sourceKind, 80)
  const sourceId = normalizeText(rawRef.sourceId, 220)
  if (!SOURCE_KINDS.has(sourceKind) || !sourceId) return null
  return {
    eventId: normalizeText(rawRef.eventId, 180),
    sourceKind,
    sourceId,
    moduleKey: normalizeText(rawRef.moduleKey, 80),
    targetId: normalizeText(rawRef.targetId, 180),
  }
}

export const createEventNotebookRefKey = (rawRef) => {
  const ref = normalizeEventNotebookRef(rawRef)
  return ref ? `${ref.sourceKind}:${ref.sourceId}` : ''
}

export const normalizeEventReviewNote = (rawNote, index = 0) => {
  if (!isRecord(rawNote)) return null
  const eventRef = normalizeEventNotebookRef(rawNote.eventRef)
  const body = normalizeNoteBody(rawNote.body)
  const createdAt = normalizeTimestamp(rawNote.createdAt, Date.now() - index)
  const updatedAt = normalizeTimestamp(rawNote.updatedAt, createdAt)
  const id = normalizeText(rawNote.id, 220)
  if (!id || !eventRef || !body) return null
  return {
    id,
    eventRef,
    body,
    createdAt,
    updatedAt: Math.max(createdAt, updatedAt),
  }
}

export const normalizeEventReviewNotes = (rawNotes) => {
  if (!Array.isArray(rawNotes)) return []
  const seen = new Set()
  return rawNotes
    .map((note, index) => normalizeEventReviewNote(note, index))
    .filter((note) => {
      if (!note || seen.has(note.id)) return false
      seen.add(note.id)
      return true
    })
    .sort((left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id))
}

const statusGroupFor = (status) => {
  if (PENDING_STATUSES.has(status)) return EVENT_NOTEBOOK_STATUS_GROUP.PENDING
  if (FAILED_STATUSES.has(status)) return EVENT_NOTEBOOK_STATUS_GROUP.FAILED
  if (SKIPPED_STATUSES.has(status)) return EVENT_NOTEBOOK_STATUS_GROUP.SKIPPED
  if (UNAVAILABLE_STATUSES.has(status)) return EVENT_NOTEBOOK_STATUS_GROUP.UNAVAILABLE
  return EVENT_NOTEBOOK_STATUS_GROUP.COMPLETED
}

const refForLog = (log) =>
  normalizeEventNotebookRef({
    eventId: log?.eventId,
    sourceKind: EVENT_NOTEBOOK_SOURCE_KIND.EVENT_LOG,
    sourceId: log?.id,
    moduleKey: log?.moduleKey,
    targetId: log?.targetId,
  })

const refForProposal = (proposal, sourceKind) =>
  normalizeEventNotebookRef({
    eventId: proposal?.eventId,
    sourceKind,
    sourceId: proposal?.id,
    moduleKey: proposal?.moduleKey || (sourceKind === EVENT_NOTEBOOK_SOURCE_KIND.CHAT_SOCIAL_PROPOSAL ? 'chat' : 'map'),
    targetId:
      proposal?.journeyId ||
      (Number(proposal?.targetContactId) > 0 ? String(proposal.targetContactId) : ''),
  })

const refForInstance = (instance) =>
  normalizeEventNotebookRef({
    eventId: instance?.templateRef?.id,
    sourceKind: EVENT_NOTEBOOK_SOURCE_KIND.EVENT_INSTANCE,
    sourceId: instance?.id,
    moduleKey: instance?.source?.moduleKey,
    targetId: instance?.source?.recordId,
  })

const sortByOccurredAt = (left, right) =>
  right.occurredAt - left.occurredAt || left.id.localeCompare(right.id)

const uniqueRefs = (refs) => {
  const seen = new Set()
  return refs.filter((ref) => {
    const key = createEventNotebookRefKey(ref)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const createEntry = ({
  ref,
  status,
  occurredAt,
  instance = null,
  proposal = null,
  logs = [],
  refs = [],
  missingLineage = [],
  sourceMissing = false,
}) => ({
  id: `event_notebook:${createEventNotebookRefKey(ref)}`,
  eventId: ref.eventId,
  moduleKey: ref.moduleKey,
  targetId: ref.targetId,
  sourceKind: ref.sourceKind,
  sourceId: ref.sourceId,
  status,
  statusGroup: statusGroupFor(status),
  occurredAt,
  instance,
  proposal,
  logs,
  refs: uniqueRefs([ref, ...refs]),
  lineage: {
    instanceId: instance?.id || '',
    proposalId: proposal?.id || '',
    logIds: logs.map((log) => log.id),
  },
  missingLineage: [...new Set(missingLineage.filter(Boolean))],
  lineageState: missingLineage.some(Boolean) || sourceMissing ? 'stale' : 'complete',
  sourceMissing,
  notes: [],
  noteCount: 0,
})

const explicitProposalLogId = (proposal, sourceKind) =>
  sourceKind === EVENT_NOTEBOOK_SOURCE_KIND.MAP_JOURNEY_PROPOSAL
    ? normalizeText(proposal?.provenance?.runtimeLogId, 220)
    : ''

const optionList = (entries, field) =>
  [...new Set(entries.map((entry) => entry[field]).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value }))

export const buildEventNotebook = ({
  eventLogs = [],
  eventInstances = [],
  chatSocialEventProposals = [],
  mapJourneyEventProposals = [],
  eventReviewNotes = [],
  filters = {},
} = {}) => {
  const logs = Array.isArray(eventLogs) ? eventLogs.filter(isRecord) : []
  const instances = Array.isArray(eventInstances) ? eventInstances.filter(isRecord) : []
  const proposals = [
    ...(Array.isArray(chatSocialEventProposals)
      ? chatSocialEventProposals.map((proposal) => ({
          proposal,
          sourceKind: EVENT_NOTEBOOK_SOURCE_KIND.CHAT_SOCIAL_PROPOSAL,
        }))
      : []),
    ...(Array.isArray(mapJourneyEventProposals)
      ? mapJourneyEventProposals.map((proposal) => ({
          proposal,
          sourceKind: EVENT_NOTEBOOK_SOURCE_KIND.MAP_JOURNEY_PROPOSAL,
        }))
      : []),
  ].filter(({ proposal }) => isRecord(proposal))
  const notes = normalizeEventReviewNotes(eventReviewNotes)
  const logsById = new Map(logs.map((log) => [normalizeText(log.id, 220), log]).filter(([id]) => id))
  const proposalsById = new Map(
    proposals.map((item) => [normalizeText(item.proposal.id, 220), item]).filter(([id]) => id),
  )
  const usedLogIds = new Set()
  const usedProposalIds = new Set()
  const entries = []

  instances.forEach((instance) => {
    const ref = refForInstance(instance)
    if (!ref) return
    const proposalId = normalizeText(instance.runtime?.proposalId, 220)
    const linkedProposal = proposalId ? proposalsById.get(proposalId) : null
    if (linkedProposal) usedProposalIds.add(proposalId)
    const requestedLogIds = [
      normalizeText(instance.runtime?.eligibilityLogId, 220),
      normalizeText(instance.runtime?.outcomeLogId, 220),
      linkedProposal ? explicitProposalLogId(linkedProposal.proposal, linkedProposal.sourceKind) : '',
    ].filter(Boolean)
    const linkedLogs = [
      ...new Map(
        requestedLogIds
          .map((id) => logsById.get(id))
          .filter(Boolean)
          .map((log) => [log.id, log]),
      ).values(),
    ]
    linkedLogs.forEach((log) => usedLogIds.add(log.id))
    const proposalRef = linkedProposal
      ? refForProposal(linkedProposal.proposal, linkedProposal.sourceKind)
      : null
    entries.push(
      createEntry({
        ref,
        status: normalizeText(instance.lifecycle, 80) || 'unavailable',
        occurredAt: normalizeTimestamp(instance.timestamps?.updatedAt || instance.timestamps?.createdAt),
        instance,
        proposal: linkedProposal?.proposal || null,
        logs: linkedLogs,
        refs: [proposalRef, ...linkedLogs.map(refForLog)].filter(Boolean),
        missingLineage: [
          ...requestedLogIds.filter((id) => !logsById.has(id)).map((id) => `log:${id}`),
        ],
      }),
    )
  })

  proposals.forEach(({ proposal, sourceKind }) => {
    const proposalId = normalizeText(proposal.id, 220)
    if (!proposalId || usedProposalIds.has(proposalId)) return
    const ref = refForProposal(proposal, sourceKind)
    if (!ref) return
    const runtimeLogId = explicitProposalLogId(proposal, sourceKind)
    const linkedLog = runtimeLogId ? logsById.get(runtimeLogId) : null
    if (linkedLog) usedLogIds.add(linkedLog.id)
    entries.push(
      createEntry({
        ref,
        status: normalizeText(proposal.status, 80) || 'unavailable',
        occurredAt: normalizeTimestamp(proposal.reviewedAt || proposal.appliedAt || proposal.createdAt),
        proposal,
        logs: linkedLog ? [linkedLog] : [],
        refs: linkedLog ? [refForLog(linkedLog)] : [],
        missingLineage: runtimeLogId && !linkedLog ? [`log:${runtimeLogId}`] : [],
      }),
    )
  })

  logs.forEach((log) => {
    if (usedLogIds.has(log.id)) return
    const ref = refForLog(log)
    if (!ref) return
    entries.push(
      createEntry({
        ref,
        status: normalizeText(log.status, 80) || 'unavailable',
        occurredAt: normalizeTimestamp(log.at || log.updatedAt || log.createdAt),
        logs: [log],
      }),
    )
  })

  const entryByRefKey = new Map()
  entries.forEach((entry) => {
    entry.refs.forEach((entryRef) => entryByRefKey.set(createEventNotebookRefKey(entryRef), entry))
  })
  notes.forEach((note) => {
    const refKey = createEventNotebookRefKey(note.eventRef)
    let entry = entryByRefKey.get(refKey)
    if (!entry) {
      entry = createEntry({
        ref: note.eventRef,
        status: 'source_missing',
        occurredAt: note.updatedAt,
        sourceMissing: true,
      })
      entries.push(entry)
      entryByRefKey.set(refKey, entry)
    }
    entry.notes.push(note)
  })

  entries.forEach((entry) => {
    entry.notes.sort((left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id))
    entry.noteCount = entry.notes.length
  })
  entries.sort(sortByOccurredAt)

  const sourceFilter = normalizeText(filters.sourceKind, 80) || 'all'
  const moduleFilter = normalizeText(filters.moduleKey, 80) || 'all'
  const statusFilter = normalizeText(filters.status, 80) || 'all'
  const filteredEntries = entries.filter(
    (entry) =>
      (sourceFilter === 'all' || entry.sourceKind === sourceFilter) &&
      (moduleFilter === 'all' || entry.moduleKey === moduleFilter) &&
      (statusFilter === 'all' || entry.status === statusFilter),
  )

  return {
    entries,
    filteredEntries,
    counts: {
      all: entries.length,
      pending: entries.filter((entry) => entry.statusGroup === EVENT_NOTEBOOK_STATUS_GROUP.PENDING).length,
      noted: entries.filter((entry) => entry.noteCount > 0).length,
    },
    options: {
      sourceKinds: optionList(entries, 'sourceKind'),
      moduleKeys: optionList(entries, 'moduleKey'),
      statuses: optionList(entries, 'status'),
    },
  }
}
