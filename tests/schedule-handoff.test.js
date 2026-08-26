import { beforeEach, describe, expect, test } from 'vitest'
import {
  createScheduleHandoffEventSourceRefV1,
  createScheduleHandoffIdempotencyKey,
  normalizeScheduleHandoffDraftV1,
  normalizeScheduleHandoffEventSourceRefV1,
  resolveScheduleHandoffConflictV1,
  SCHEDULE_HANDOFF_CONFLICT_DECISIONS,
  SCHEDULE_HANDOFF_DRAFT_SCHEMA_VERSION,
} from '../src/lib/schedule-handoff'
import { resolveScheduleHandoffSourceDraftV1 } from '../src/lib/schedule-handoff-sources'
import {
  WORKPLACE_SHELL_STORAGE_KEY,
  WORKPLACE_SHELL_STORAGE_VERSION,
} from '../src/lib/workplace-shell-data'

const STARTS_AT = new Date('2026-09-03T10:00:00.000Z').getTime()
const ENDS_AT = new Date('2026-09-03T11:30:00.000Z').getTime()

describe('Schedule handoff source resolvers', () => {
  beforeEach(() => localStorage.clear())

  test('exposes an accepted Work Hub proposal through the shared bounded contract', () => {
    localStorage.setItem(
      WORKPLACE_SHELL_STORAGE_KEY,
      JSON.stringify({
        version: WORKPLACE_SHELL_STORAGE_VERSION,
        proposalDecisions: { 'proposal-radio-20260827': 'accepted' },
      }),
    )

    expect(
      resolveScheduleHandoffSourceDraftV1({
        sourceOwner: 'workplace',
        sourceRecordId: 'proposal-radio-20260827',
      }),
    ).toMatchObject({
      sourceOwner: 'workplace',
      sourceRecordId: 'proposal-radio-20260827',
      sourceRevision: 'fixture-2026-08-26-v1',
      proposedTitleZh: '电台《夜航》嘉宾录制',
      proposedStartsAt: new Date(2026, 7, 27, 20, 0, 0, 0).getTime(),
      proposedEndsAt: new Date(2026, 7, 27, 21, 20, 0, 0).getTime(),
      sourceReturnContext: {
        path: '/workplace',
        query: { section: 'tasks', sourceRecordId: 'proposal-radio-20260827' },
      },
    })
  })

  test.each([
    ['missing decision', {}],
    ['declined proposal', { 'proposal-radio-20260827': 'declined' }],
    ['unknown proposal', { forged: 'accepted' }],
  ])('fails closed for a Work Hub source with %s', (_label, proposalDecisions) => {
    localStorage.setItem(
      WORKPLACE_SHELL_STORAGE_KEY,
      JSON.stringify({ version: WORKPLACE_SHELL_STORAGE_VERSION, proposalDecisions }),
    )
    expect(
      resolveScheduleHandoffSourceDraftV1({
        sourceOwner: 'workplace',
        sourceRecordId: proposalDecisions.forged ? 'forged' : 'proposal-radio-20260827',
      }),
    ).toBeNull()
  })
})

const createDraft = (patch = {}) => ({
  sourceOwner: 'mail',
  sourceRecordId: 'mail_thread_hair_appointment',
  sourceRevision: 'revision_3',
  proposedTitleZh: '发型预约',
  proposedTitleEn: 'Hair appointment',
  proposedStartsAt: STARTS_AT,
  proposedEndsAt: ENDS_AT,
  proposedLocationRef: {
    owner: 'map',
    mapPackId: 'real-seoul-v1',
    placeId: '  salon-cheongdam  ',
    labelZh: ' 清潭造型室 ',
    labelEn: ' Cheongdam Salon ',
    detail: ' 首尔特别市江南区 ',
  },
  participantRefs: [
    { owner: 'contacts', recordId: 'role:17' },
    { owner: 'contacts', recordId: 'role:17' },
    { owner: 'contacts', recordId: 'role:23', name: '不应复制' },
  ],
  sourceReturnContext: {
    path: '/mail',
    query: { threadId: ' mail_thread_hair_appointment ', focus: true, revision: 3 },
  },
  proposalStatus: 'pending_review',
  sourceBody: '不应进入 handoff 草稿的邮件正文',
  ...patch,
})

describe('ScheduleHandoffDraftV1 normalizer', () => {
  test('normalizes one bounded Mail proposal without copying source-owned records', () => {
    const normalized = normalizeScheduleHandoffDraftV1(createDraft())

    expect(normalized).toEqual({
      schemaVersion: SCHEDULE_HANDOFF_DRAFT_SCHEMA_VERSION,
      id: 'schedule_handoff::mail::mail_thread_hair_appointment',
      idempotencyKey: 'schedule_handoff::mail::mail_thread_hair_appointment',
      revisionFingerprint: expect.stringMatching(/^[a-f0-9]{16}$/),
      sourceOwner: 'mail',
      sourceRecordId: 'mail_thread_hair_appointment',
      sourceRevision: 'revision_3',
      proposedTitleZh: '发型预约',
      proposedTitleEn: 'Hair appointment',
      proposedStartsAt: STARTS_AT,
      proposedEndsAt: ENDS_AT,
      proposedLocationRef: {
        owner: 'map',
        mapPackId: 'real-seoul-v1',
        placeId: 'salon-cheongdam',
        labelZh: '清潭造型室',
        labelEn: 'Cheongdam Salon',
        detail: '首尔特别市江南区',
      },
      participantRefs: [
        { owner: 'contacts', recordId: 'role:17' },
        { owner: 'contacts', recordId: 'role:23' },
      ],
      sourceReturnContext: {
        path: '/mail',
        query: { threadId: 'mail_thread_hair_appointment', focus: 'true', revision: '3' },
      },
      proposalStatus: 'pending_review',
    })
    expect(normalized).not.toHaveProperty('sourceBody')
    expect(normalized.participantRefs[1]).not.toHaveProperty('name')
  })

  test('keeps source identity stable while exposing source revision changes separately', () => {
    const first = normalizeScheduleHandoffDraftV1(createDraft())
    const repeated = normalizeScheduleHandoffDraftV1(createDraft())
    const revised = normalizeScheduleHandoffDraftV1(
      createDraft({ sourceRevision: 'revision_4', proposedTitleZh: '发型预约（改期）' }),
    )

    expect(repeated).toEqual(first)
    expect(revised.id).toBe(first.id)
    expect(revised.idempotencyKey).toBe(first.idempotencyKey)
    expect(revised.revisionFingerprint).not.toBe(first.revisionFingerprint)
    expect(createScheduleHandoffIdempotencyKey('mail', 'mail_thread_hair_appointment')).toBe(
      first.id,
    )
  })

  test('creates a bounded persisted event source reference from a valid draft', () => {
    const sourceRef = createScheduleHandoffEventSourceRefV1(createDraft())

    expect(sourceRef).toEqual({
      schemaVersion: 1,
      idempotencyKey: 'schedule_handoff::mail::mail_thread_hair_appointment',
      sourceOwner: 'mail',
      sourceRecordId: 'mail_thread_hair_appointment',
      sourceRevision: 'revision_3',
      sourceReturnContext: {
        path: '/mail',
        query: { threadId: 'mail_thread_hair_appointment', focus: 'true', revision: '3' },
      },
    })
    expect(sourceRef).not.toHaveProperty('proposedTitleZh')
    expect(sourceRef).not.toHaveProperty('proposedStartsAt')
    expect(
      normalizeScheduleHandoffEventSourceRefV1({
        ...sourceRef,
        idempotencyKey: 'schedule_handoff::mail::forged',
      }),
    ).toBeNull()
  })

  test.each([
    ['unsupported owner', { sourceOwner: 'calendar' }],
    ['missing record ID', { sourceRecordId: '  ' }],
    ['missing revision', { sourceRevision: '' }],
    ['missing title', { proposedTitleZh: '', proposedTitleEn: '' }],
    ['missing start', { proposedStartsAt: 0 }],
    ['inverted range', { proposedEndsAt: STARTS_AT }],
    ['unknown status', { proposalStatus: 'applied' }],
    ['wrong source return path', { sourceReturnContext: { path: '/workplace' } }],
    [
      'nested return query',
      { sourceReturnContext: { path: '/mail', query: { threadId: { id: 'private' } } } },
    ],
  ])('rejects %s', (_label, patch) => {
    expect(normalizeScheduleHandoffDraftV1(createDraft(patch))).toBeNull()
  })

  test.each([
    { owner: 'workplace', mapPackId: 'real-seoul-v1', placeId: 'office' },
    { owner: 'map', mapPackId: '', placeId: 'office' },
    { owner: 'map', mapPackId: 'real-seoul-v1', placeId: '' },
  ])('rejects forged or incomplete Map references', (proposedLocationRef) => {
    expect(normalizeScheduleHandoffDraftV1(createDraft({ proposedLocationRef }))).toBeNull()
  })

  test('allows no proposed location but rejects a non-array participant collection', () => {
    expect(
      normalizeScheduleHandoffDraftV1(createDraft({ proposedLocationRef: null })),
    ).toMatchObject({ proposedLocationRef: null })
    expect(
      normalizeScheduleHandoffDraftV1(createDraft({ participantRefs: { recordId: 'role:17' } })),
    ).toBeNull()
  })

  test('bounds text, deduplicates participants, and caps participant references', () => {
    const participantRefs = Array.from({ length: 25 }, (_, index) => ({
      owner: 'contacts',
      recordId: ` role:${index} `,
      fullProfile: { private: true },
    }))
    participantRefs.push({ owner: 'mail', recordId: 'forged-participant' })
    const normalized = normalizeScheduleHandoffDraftV1(
      createDraft({
        proposedTitleZh: ` ${'行'.repeat(140)} `,
        participantRefs,
        sourceReturnContext: {
          path: '/mail',
          query: { threadId: ` ${'x'.repeat(220)} ` },
        },
      }),
    )

    expect(normalized.proposedTitleZh).toHaveLength(120)
    expect(normalized.participantRefs).toHaveLength(20)
    expect(normalized.participantRefs[0]).toEqual({ owner: 'contacts', recordId: 'role:0' })
    expect(normalized.sourceReturnContext.query.threadId).toHaveLength(180)
  })
})

describe('ScheduleHandoffDraftV1 conflict resolution', () => {
  const existingReference = {
    sourceOwner: 'mail',
    sourceRecordId: 'mail_thread_hair_appointment',
    sourceRevision: 'revision_3',
    calendarEventId: 'calendar_event_hair_appointment',
  }

  test('sends a source without a Calendar reference to first review', () => {
    expect(resolveScheduleHandoffConflictV1({ draft: createDraft() })).toEqual({
      idempotencyKey: 'schedule_handoff::mail::mail_thread_hair_appointment',
      decision: SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_NEW,
      proposalStatus: 'pending_review',
      requiresReview: true,
      mayCreateAfterReview: true,
      existingCalendarEventId: '',
      previousSourceRevision: '',
      incomingSourceRevision: 'revision_3',
    })
  })

  test('reuses the confirmed Calendar event for the same source revision', () => {
    const result = resolveScheduleHandoffConflictV1({
      draft: createDraft(),
      existingReference,
    })

    expect(result).toMatchObject({
      decision: SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REUSE_CONFIRMED,
      proposalStatus: 'confirmed',
      requiresReview: false,
      mayCreateAfterReview: false,
      existingCalendarEventId: 'calendar_event_hair_appointment',
      previousSourceRevision: 'revision_3',
      incomingSourceRevision: 'revision_3',
    })
    expect(result).not.toHaveProperty('calendarEvent')
  })

  test('keeps the existing event and requires review when the source revision changes', () => {
    const input = {
      draft: createDraft({ sourceRevision: 'revision_4', proposedStartsAt: STARTS_AT + 60_000 }),
      existingReference,
    }
    const result = resolveScheduleHandoffConflictV1(input)

    expect(result).toEqual({
      idempotencyKey: 'schedule_handoff::mail::mail_thread_hair_appointment',
      decision: SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_SOURCE_CHANGE,
      proposalStatus: 'source_changed',
      requiresReview: true,
      mayCreateAfterReview: false,
      existingCalendarEventId: 'calendar_event_hair_appointment',
      previousSourceRevision: 'revision_3',
      incomingSourceRevision: 'revision_4',
    })
    expect(resolveScheduleHandoffConflictV1(input)).toEqual(result)
  })

  test('blocks a mismatched existing reference instead of reusing or creating an event', () => {
    expect(
      resolveScheduleHandoffConflictV1({
        draft: createDraft(),
        existingReference: {
          ...existingReference,
          sourceOwner: 'workplace',
          sourceRecordId: 'proposal_9',
        },
      }),
    ).toMatchObject({
      decision: SCHEDULE_HANDOFF_CONFLICT_DECISIONS.BLOCKED_IDENTITY_CONFLICT,
      requiresReview: true,
      mayCreateAfterReview: false,
      existingCalendarEventId: 'calendar_event_hair_appointment',
    })
  })

  test('stops creation and retains the existing reference when the source is cancelled', () => {
    expect(
      resolveScheduleHandoffConflictV1({
        draft: createDraft({ proposalStatus: 'source_cancelled' }),
        existingReference,
      }),
    ).toMatchObject({
      decision: SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_SOURCE_CANCELLATION,
      proposalStatus: 'source_cancelled',
      requiresReview: true,
      mayCreateAfterReview: false,
      existingCalendarEventId: 'calendar_event_hair_appointment',
    })
  })

  test.each([
    [{ ...existingReference, calendarEventId: '' }],
    [{ ...existingReference, sourceRevision: '' }],
    [{ ...existingReference, idempotencyKey: 'schedule_handoff::mail::forged' }],
  ])('fails closed for an invalid confirmed handoff reference', (invalidReference) => {
    expect(
      resolveScheduleHandoffConflictV1({
        draft: createDraft(),
        existingReference: invalidReference,
      }),
    ).toBeNull()
  })
})
