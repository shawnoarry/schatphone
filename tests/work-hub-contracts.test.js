import { describe, expect, test } from 'vitest'
import {
  WORK_HUB_DECISIONS,
  WORK_HUB_RECORD_TYPES,
  createWorkHubDecisionReceipt,
  inspectWorkHubRuntimeAuthority,
  validateWorkHubAuthorityPackage,
} from '../src/lib/work-hub-contracts'

const NOW = new Date('2026-08-30T09:00:00+08:00').getTime()
const HOUR = 60 * 60 * 1000

export const createWorkHubAuthorityFixture = (patch = {}) => {
  const binding = {
    worldId: 'world_test',
    worldRevision: 3,
    contactsProfileId: '101',
    contactsProfileRevision: 7,
  }
  const common = {
    worldId: binding.worldId,
    organizationId: 'org_northbridge',
    revision: 1,
    issuerId: 'issuer_world_test',
    issuedAt: NOW - HOUR,
    expiresAt: NOW + 30 * 24 * HOUR,
    revokedAt: 0,
  }
  return {
    schemaVersion: 1,
    packageId: 'work_hub_authority_world_test',
    revision: 1,
    worldBinding: binding,
    issuer: {
      issuerId: 'issuer_world_test',
      kind: 'world_configuration_authority',
      revision: 1,
      scopes: ['work_hub:issue'],
      issuedAt: NOW - HOUR,
      expiresAt: NOW + 30 * 24 * HOUR,
      revokedAt: 0,
    },
    issuedAt: NOW - HOUR,
    expiresAt: NOW + 30 * 24 * HOUR,
    revokedAt: 0,
    organizations: [
      {
        ...common,
        id: 'org_northbridge',
        organizationId: 'org_northbridge',
        nameZh: '北桥研习社',
        nameEn: 'Northbridge Learning Studio',
        kind: 'learning_collective',
        status: 'active',
      },
    ],
    memberships: [
      {
        ...common,
        id: 'membership_self',
        subjectProfileId: binding.contactsProfileId,
        subjectProfileRevision: binding.contactsProfileRevision,
        status: 'active',
        displayLabel: '参与者',
      },
    ],
    roleAssignments: [
      {
        ...common,
        id: 'role_self',
        membershipId: 'membership_self',
        roleKey: 'participant',
        nameZh: '参与者',
        nameEn: 'Participant',
        scopes: [],
        teamIds: ['team_project'],
      },
      {
        ...common,
        id: 'role_coordinator',
        membershipId: 'membership_self',
        roleKey: 'coordinator',
        nameZh: '协调人',
        nameEn: 'Coordinator',
        scopes: ['work_notice:issue', 'task:issue', 'schedule:propose', 'approval:request'],
        teamIds: ['team_project'],
      },
    ],
    teams: [
      {
        ...common,
        id: 'team_project',
        nameZh: '共同项目组',
        nameEn: 'Shared Project Team',
        memberRoleAssignmentIds: ['role_self', 'role_coordinator'],
      },
    ],
    channels: [
      {
        ...common,
        id: 'channel_project',
        teamId: 'team_project',
        nameZh: '项目沟通',
        nameEn: 'Project coordination',
      },
    ],
    workNotices: [
      {
        ...common,
        id: 'notice_weekly_sync',
        issuerRoleAssignmentId: 'role_coordinator',
        nameZh: '本周协作安排',
        nameEn: 'Weekly collaboration plan',
        bodyZh: '请确认本周的共同工作安排。',
        deadlineAt: NOW + 2 * HOUR,
      },
    ],
    tasks: [
      {
        ...common,
        id: 'task_prepare_notes',
        issuerRoleAssignmentId: 'role_coordinator',
        assignedMembershipId: 'membership_self',
        sourceNoticeId: 'notice_weekly_sync',
        nameZh: '准备讨论要点',
        nameEn: 'Prepare discussion notes',
        dueAt: NOW + 4 * HOUR,
        status: 'open',
      },
    ],
    statusReports: [],
    scheduleProposals: [
      {
        ...common,
        id: 'proposal_weekly_sync',
        issuerRoleAssignmentId: 'role_coordinator',
        sourceNoticeId: 'notice_weekly_sync',
        nameZh: '本周协作会',
        nameEn: 'Weekly collaboration session',
        startsAt: NOW + 24 * HOUR,
        endsAt: NOW + 25 * HOUR,
        participantProfileIds: ['101'],
      },
    ],
    approvalRequests: [],
    receipts: [],
    ...patch,
  }
}

export const createWorkHubScheduleChangeAuthorityFixture = ({
  packageRevision = 2,
  changeId = 'proposal_weekly_sync_change_1',
  deadlineAt = NOW + 2 * HOUR,
  revokedAt = 0,
} = {}) => {
  const fixture = createWorkHubAuthorityFixture()
  const previous = fixture.scheduleProposals[0]
  fixture.revision = packageRevision
  fixture.scheduleProposals.push({
    ...previous,
    id: changeId,
    revision: 1,
    issuedAt: NOW,
    startsAt: previous.startsAt + 2 * HOUR,
    endsAt: previous.endsAt + 2 * HOUR,
    deadlineAt,
    revokedAt,
    nameZh: '本周协作会时间变更',
    nameEn: 'Weekly collaboration session change',
    changeOfRef: { recordId: previous.id, revision: previous.revision },
    changeDisposition: 'remains_until_calendar_save',
    changeReasonZh: '协调人调整了共同工作时间。',
  })
  return fixture
}

describe('Work Hub production contracts', () => {
  test('validates one world-neutral authority package and creates a Calendar review handoff', () => {
    const fixture = createWorkHubAuthorityFixture()
    const validated = validateWorkHubAuthorityPackage(fixture, {
      expectedBinding: fixture.worldBinding,
      now: NOW,
    })
    expect(validated.ok).toBe(true)

    const authority = inspectWorkHubRuntimeAuthority(
      validated.authorityPackage,
      fixture.worldBinding,
      { now: NOW },
    )
    expect(authority).toMatchObject({ ok: true })

    const decision = createWorkHubDecisionReceipt({
      authority,
      recordType: WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
      recordId: 'proposal_weekly_sync',
      action: WORK_HUB_DECISIONS.ACCEPTED,
      now: NOW,
    })
    expect(decision).toMatchObject({
      ok: true,
      receipt: {
        action: 'accepted',
        calendarHandoff: {
          sourceOwner: 'workplace',
          sourceRecordId: 'proposal_weekly_sync',
          proposedTitleZh: '本周协作会',
        },
      },
    })
  })

  test.each([
    ['cross-world', (fixture) => { fixture.memberships[0].worldId = 'world_other' }, 'record_invalid'],
    ['stale profile', (fixture) => { fixture.memberships[0].subjectProfileRevision = 6 }, 'membership_profile_binding_mismatch'],
    ['revoked issuer', (fixture) => { fixture.issuer.revokedAt = NOW - 1 }, 'issuer_revoked'],
    ['duplicate record', (fixture) => { fixture.tasks.push({ ...fixture.tasks[0] }) }, 'duplicate_record_id'],
    ['missing scope', (fixture) => { fixture.roleAssignments[1].scopes = ['work_notice:issue'] }, 'issuer_scope_invalid'],
  ])('fails closed for %s authority evidence', (_label, mutate, code) => {
    const fixture = createWorkHubAuthorityFixture()
    mutate(fixture)
    const result = validateWorkHubAuthorityPackage(fixture, {
      expectedBinding: createWorkHubAuthorityFixture().worldBinding,
      now: NOW,
    })
    expect(result.ok).toBe(false)
    expect(result.errors.map((error) => error.code)).toContain(code)
  })

  test('rejects runtime world/profile changes without rewriting the accepted package', () => {
    const fixture = createWorkHubAuthorityFixture()
    const validated = validateWorkHubAuthorityPackage(fixture, { now: NOW })
    const result = inspectWorkHubRuntimeAuthority(
      validated.authorityPackage,
      { ...fixture.worldBinding, worldRevision: 4 },
      { now: NOW },
    )
    expect(result).toMatchObject({ ok: false, code: 'runtime_binding_mismatch' })
  })
})
