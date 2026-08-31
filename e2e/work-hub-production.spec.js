import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { navigateInsideUnlockedApp, unlockToHome, waitForAppRouteReady } from './helpers/navigation.js'
import worldFixture from '../tests/fixtures/world-semantic/conformance-v1.json' with { type: 'json' }
import {
  WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
  WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
  createWorldSemanticProposalHash,
} from '../src/lib/simulation/world-semantic-contract.js'
import {
  activateWorldSemanticVersion,
  createDefaultWorldSettingState,
  createWorldSemanticCandidateVersion,
  createWorldSettingSourceSnapshot,
  observeWorldSettingSource,
} from '../src/lib/world-setting-state.js'

const NOW = new Date('2026-08-30T09:00:00+08:00').getTime()
const FUTURE = new Date('2030-01-01T00:00:00+08:00').getTime()
const STARTS_AT = new Date('2026-09-01T15:00:00+08:00').getTime()
const ENDS_AT = new Date('2026-09-01T16:00:00+08:00').getTime()
const evidenceDir = fileURLToPath(
  new URL('../output/e2e/work-schedule-execution/', import.meta.url),
)

const formatDateTimeInputInBrowser = (page, timestamp) => page.evaluate((value) => {
  const date = new Date(value)
  const pad = (part) => String(part).padStart(2, '0')
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('')
}, timestamp)

const createActiveWorldSetting = async () => {
  const worldId = 'world_work_hub_e2e'
  const overview = {
    identity: { worldId, title: 'Work Hub E2E World' },
    narrative: {
      fallbackText: '',
      activeSources: [{ id: 'source_work_hub_e2e', assetId: 'book_work_hub_e2e', promptText: 'Organizations issue explicit work records.', role: 'core', enabled: true, priority: 10, sourceVersion: 1 }],
    },
    encyclopedia: { selectedEntries: [] },
    profiles: { enabledTemplates: [] },
    capabilities: { enabledPacks: [] },
  }
  const snapshot = await createWorldSettingSourceSnapshot({ worldOverview: overview, observedAt: NOW })
  const observed = observeWorldSettingSource({
    state: createDefaultWorldSettingState({ worldId, title: 'Work Hub E2E World', now: NOW }),
    snapshot,
    now: NOW,
  })
  const proposal = {
    ...structuredClone(worldFixture.worlds[2].proposal),
    worldId,
    sourceFingerprint: snapshot.sourceFingerprint,
  }
  const proposalHash = await createWorldSemanticProposalHash(proposal)
  const candidate = await createWorldSemanticCandidateVersion({
    state: observed.state,
    proposal,
    confirmation: {
      schemaVersion: WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
      status: 'confirmed',
      confirmedBy: 'user',
      sourceFingerprint: proposal.sourceFingerprint,
      proposalHash,
      manifestRevision: 1,
    },
    runtimeRegistry: worldFixture.runtimeRegistry,
    modelReceipt: {
      schemaVersion: WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
      providerId: 'test',
      modelId: 'work-hub-e2e',
      requestId: 'work-hub-e2e-request',
      generatedAt: NOW,
      sourceFingerprint: proposal.sourceFingerprint,
      proposalHash,
    },
    now: NOW,
  })
  if (!candidate.ok) throw new Error(`Could not create Work Hub E2E world: ${candidate.reason}`)
  const active = await activateWorldSemanticVersion({
    state: candidate.state,
    versionId: candidate.version.versionId,
    runtimeRegistry: worldFixture.runtimeRegistry,
    now: NOW + 1,
  })
  if (!active.ok) throw new Error(`Could not activate Work Hub E2E world: ${active.reason}`)
  return active.state
}

const seedWorkHubProduction = async (page) => {
  const worldSetting = await createActiveWorldSetting()
  await page.addInitScript(({ now, future, startsAt, endsAt, worldSetting }) => {
    const binding = {
      worldId: 'world_work_hub_e2e',
      worldRevision: 1,
      contactsProfileId: '101',
      contactsProfileRevision: 7,
    }
    const common = {
      worldId: binding.worldId,
      organizationId: 'org_northbridge',
      revision: 1,
      issuerId: 'issuer_world_work_hub_e2e',
      issuedAt: now - 1000,
      expiresAt: future,
      revokedAt: 0,
    }
    if (!window.localStorage.getItem('schatphone:store:system')) window.localStorage.setItem('schatphone:store:system', JSON.stringify({
      version: 1,
      savedAt: now,
      data: {
        settings: { system: { language: 'zh-CN' } },
        user: {
          name: 'Work Hub E2E User',
          profileTemplates: [{
            id: 'work_identity_e2e',
            title: 'Work identity',
            scope: 'world',
            worldId: binding.worldId,
            enabled: true,
            version: 1,
            fields: [
              { id: 'occupation', label: 'Occupation', purposes: ['work_hub_matching'], entityTypes: ['self_profile'] },
              { id: 'affiliation', label: 'Affiliation', purposes: ['work_hub_matching'], entityTypes: ['self_profile'] },
            ],
          }],
          worldSetting,
        },
      },
    }))
    if (!window.localStorage.getItem('schatphone:store:chat')) window.localStorage.setItem('schatphone:store:chat', JSON.stringify({
      version: 2,
      savedAt: now,
      data: {
        roleProfiles: [{
          id: 101,
          roleId: 'work-hub-self',
          revision: 7,
          name: 'World participant',
          role: 'Participant',
          entityType: 'self_profile',
          isMain: false,
          lifecycle: { state: 'active' },
          templateLink: {
            primaryWorldId: binding.worldId,
            profileTemplateId: 'work_identity_e2e',
            profileTemplateVersion: 1,
          },
          profileValues: [
            { fieldId: 'occupation', value: 'Participant', visibilityLevel: 'public', sourceKind: 'manual' },
            { fieldId: 'affiliation', value: 'Northbridge', visibilityLevel: 'world_specific', sourceKind: 'manual' },
          ],
        }],
        contacts: [],
        conversations: {},
        messagesByConversation: {},
      },
    }))
    if (!window.localStorage.getItem('schatphone:store:work-hub')) window.localStorage.setItem('schatphone:store:work-hub', JSON.stringify({
      version: 1,
      savedAt: now,
      data: {
        schemaVersion: 1,
        authorityPackage: {
          schemaVersion: 1,
          packageId: 'work_hub_authority_e2e',
          revision: 1,
          worldBinding: binding,
          issuer: { issuerId: 'issuer_world_work_hub_e2e', kind: 'world_configuration_authority', revision: 1, scopes: ['work_hub:issue'], issuedAt: now - 1000, expiresAt: future, revokedAt: 0 },
          issuedAt: now - 1000,
          expiresAt: future,
          revokedAt: 0,
          organizations: [{ ...common, id: 'org_northbridge', nameZh: '北桥研习社', nameEn: 'Northbridge Learning Studio', kind: 'learning_collective', status: 'active' }],
          memberships: [{ ...common, id: 'membership_self', subjectProfileId: '101', subjectProfileRevision: 7, status: 'active', displayLabel: '参与者' }],
          roleAssignments: [
            { ...common, id: 'role_self', membershipId: 'membership_self', roleKey: 'participant', nameZh: '参与者', nameEn: 'Participant', scopes: [], teamIds: ['team_project'] },
            { ...common, id: 'role_coordinator', membershipId: 'membership_self', roleKey: 'coordinator', nameZh: '协调人', nameEn: 'Coordinator', scopes: ['work_notice:issue', 'task:issue', 'schedule:propose', 'approval:request'], teamIds: ['team_project'] },
          ],
          teams: [{ ...common, id: 'team_project', nameZh: '共同项目组', nameEn: 'Shared Project Team', memberRoleAssignmentIds: ['role_self', 'role_coordinator'] }],
          channels: [{ ...common, id: 'channel_project', teamId: 'team_project', nameZh: '项目沟通', nameEn: 'Project coordination' }],
          workNotices: [{ ...common, id: 'notice_weekly_sync', issuerRoleAssignmentId: 'role_coordinator', nameZh: '本周协作安排', nameEn: 'Weekly collaboration plan', bodyZh: '请确认本周的共同工作安排。', deadlineAt: future }],
          tasks: [{ ...common, id: 'task_prepare_notes', issuerRoleAssignmentId: 'role_coordinator', assignedMembershipId: 'membership_self', sourceNoticeId: 'notice_weekly_sync', nameZh: '准备讨论要点', nameEn: 'Prepare discussion notes', dueAt: startsAt, status: 'open' }],
          statusReports: [],
          scheduleProposals: [{ ...common, id: 'proposal_weekly_sync', issuerRoleAssignmentId: 'role_coordinator', sourceNoticeId: 'notice_weekly_sync', nameZh: '本周协作会', nameEn: 'Weekly collaboration session', startsAt, endsAt, locationRef: { owner: 'map', mapPackId: 'real-seoul-v1', placeId: 'seoul-sm-hq', labelZh: 'SM 娱乐总部', labelEn: 'SM Entertainment HQ' }, participantProfileIds: ['101'] }],
          approvalRequests: [],
          receipts: [],
        },
        receipts: [],
        statusReports: [],
        lastUpdatedAt: now,
      },
    }))
  }, { now: NOW, future: FUTURE, startsAt: STARTS_AT, endsAt: ENDS_AT, worldSetting })
}

test.beforeEach(async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true })
  await seedWorkHubProduction(page)
  await unlockToHome(page)
})

test('production Work Hub completes the explicit Calendar Save loop and survives reload', async ({ page }) => {
  await navigateInsideUnlockedApp(page, '/workplace?from=home&homePage=1')
  await expect(page.getByTestId('work-hub-production')).toContainText('北桥研习社')
  await expect(page.getByTestId('work-hub-task-task_prepare_notes')).toContainText('准备讨论要点')

  await page.getByTestId('work-hub-accept-proposal_weekly_sync').click()
  await expect(page.getByTestId('work-hub-proposal-proposal_weekly_sync')).toContainText('等待你在日历保存')
  let calendarEvents = await page.evaluate(() => JSON.parse(localStorage.getItem('schatphone:store:calendar') || '{"data":{"events":[]}}').data?.events || [])
  expect(calendarEvents).toEqual([])

  await page.getByTestId('work-hub-open-calendar-proposal_weekly_sync').click()
  await waitForAppRouteReady(page, '/calendar')
  await expect(page.getByTestId('calendar-editor-title-zh')).toHaveValue('本周协作会')
  await page.getByTestId('calendar-editor-save').click()
  await expect(page.getByTestId('calendar-source-handoff')).toContainText('已关联日程')

  await page.getByTestId('calendar-view-event-source').click()
  await waitForAppRouteReady(page, '/workplace')
  await expect(page.getByTestId('work-hub-proposal-proposal_weekly_sync')).toContainText('日历已保存')
  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/workplace?section=work&sourceRecordId=proposal_weekly_sync&homePage=1')
  await expect(page.getByTestId('work-hub-production')).toContainText('北桥研习社')
  await expect(page.getByTestId('work-hub-proposal-proposal_weekly_sync')).toContainText('日历已保存')

  calendarEvents = await page.evaluate(() => JSON.parse(localStorage.getItem('schatphone:store:calendar') || '{"data":{"events":[]}}').data?.events || [])
  expect(calendarEvents).toHaveLength(1)
  expect(calendarEvents[0].sourceRef).toMatchObject({ sourceOwner: 'workplace', sourceRecordId: 'proposal_weekly_sync' })
})

test('schedule change event continues through notification, Map arrival, and explicit Activity start', async ({ page }, testInfo) => {
  await navigateInsideUnlockedApp(page, '/workplace?from=home&homePage=1')
  await page.getByTestId('work-hub-accept-proposal_weekly_sync').click()
  await page.getByTestId('work-hub-open-calendar-proposal_weekly_sync').click()
  await waitForAppRouteReady(page, '/calendar')
  await page.getByTestId('calendar-editor-save').click()
  const originalCalendarEvent = await page.evaluate(() => {
    const carrier = JSON.parse(localStorage.getItem('schatphone:store:calendar') || '{}')
    return carrier?.data?.events?.[0] || null
  })
  expect(originalCalendarEvent).toMatchObject({
    sourceRef: { sourceRecordId: 'proposal_weekly_sync' },
    startsAt: STARTS_AT,
  })

  const authorityReplacement = await page.evaluate(async ({ now, future, startsAt, endsAt }) => {
    const [{ useWorkHubStore }, { waitForPendingPersistedStateWrites }] = await Promise.all([
      import('/schatphone/src/stores/workHub.js'),
      import('/schatphone/src/lib/persistence.js'),
    ])
    const store = useWorkHubStore()
    const authority = JSON.parse(JSON.stringify(store.authorityPackage))
    const previous = authority?.scheduleProposals?.find((proposal) => proposal.id === 'proposal_weekly_sync')
    if (!authority || !previous) throw new Error('Work Hub authority was not persisted before schedule change')
    authority.revision = 2
    authority.scheduleProposals = [
      ...authority.scheduleProposals,
      {
        ...previous,
        id: 'proposal_weekly_sync_change_4',
        revision: 1,
        issuedAt: now,
        deadlineAt: future,
        startsAt: startsAt + 2 * 60 * 60 * 1000,
        endsAt: endsAt + 2 * 60 * 60 * 1000,
        nameZh: '本周协作会时间变更',
        nameEn: 'Weekly collaboration session change',
        changeOfRef: { recordId: previous.id, revision: previous.revision },
        changeDisposition: 'remains_until_calendar_save',
        changeReasonZh: '协调人调整了共同工作时间。',
        changeReasonEn: 'The coordinator changed the shared work time.',
      },
    ]
    delete authority.fingerprint
    const result = store.installAuthorityPackage(authority, {
      expectedBinding: store.runtimeBinding || authority.worldBinding,
      confirmed: true,
      replaceExisting: true,
      now,
    })
    await waitForPendingPersistedStateWrites()
    return { ok: result.ok, code: result.code }
  }, { now: NOW + 10, future: FUTURE, startsAt: STARTS_AT, endsAt: ENDS_AT })
  expect(authorityReplacement).toEqual({ ok: true, code: 'authority_installed' })

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(
    page,
    '/workplace?section=work&sourceRecordId=proposal_weekly_sync_change_4&homePage=1',
  )
  const changeProposal = page.getByTestId('work-hub-proposal-proposal_weekly_sync_change_4')
  await expect(changeProposal).toContainText('日程变更')
  await expect(changeProposal).toContainText('协调人调整了共同工作时间')
  await page.getByTestId('work-hub-accept-proposal_weekly_sync_change_4').click()
  await expect(changeProposal).toContainText('等待你在日历保存')
  await expect(page.getByTestId('work-hub-open-calendar-proposal_weekly_sync_change_4')).toContainText(
    '去日历审阅更新',
  )

  let calendarEvents = await page.evaluate(() => {
    const carrier = JSON.parse(localStorage.getItem('schatphone:store:calendar') || '{}')
    return carrier?.data?.events || []
  })
  expect(calendarEvents).toHaveLength(1)
  expect(calendarEvents[0]).toMatchObject({ id: originalCalendarEvent.id, startsAt: STARTS_AT })

  await page.getByTestId('work-hub-open-calendar-proposal_weekly_sync_change_4').click()
  await waitForAppRouteReady(page, '/calendar')
  await expect(page.getByTestId('calendar-source-handoff')).toContainText('来源有更新')
  await expect(page.getByTestId('calendar-editor-title-zh')).toHaveValue('本周协作会时间变更')
  const changedStartsAt = STARTS_AT + 2 * 60 * 60 * 1000
  const changedStartsAtInput = await formatDateTimeInputInBrowser(page, changedStartsAt)
  await expect(page.getByTestId('calendar-editor-starts-at')).toHaveValue(changedStartsAtInput)
  await page.getByTestId('calendar-editor-save').click()
  await expect(page.getByTestId('calendar-source-handoff')).toContainText('已关联日程')

  calendarEvents = await page.evaluate(() => {
    const carrier = JSON.parse(localStorage.getItem('schatphone:store:calendar') || '{}')
    return carrier?.data?.events || []
  })
  expect(calendarEvents).toHaveLength(1)
  expect(calendarEvents[0]).toMatchObject({
    id: originalCalendarEvent.id,
    startsAt: changedStartsAt,
    sourceRef: {
      sourceOwner: 'workplace',
      sourceRecordId: 'proposal_weekly_sync_change_4',
      previousSourceRefs: [{ sourceRecordId: 'proposal_weekly_sync' }],
    },
  })

  await page.getByTestId('calendar-view-event-source').click()
  await waitForAppRouteReady(page, '/workplace')
  await expect(changeProposal).toContainText('日历已保存')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  const orchestration = await page.evaluate(async () => {
    const [
      { useCalendarStore },
      { useScheduleOrchestratorStore },
      { waitForPendingPersistedStateWrites },
    ] = await Promise.all([
      import('/schatphone/src/stores/calendar.js'),
      import('/schatphone/src/stores/scheduleOrchestrator.js'),
      import('/schatphone/src/lib/persistence.js'),
    ])
    const calendarStore = useCalendarStore()
    const orchestratorStore = useScheduleOrchestratorStore()
    const event = calendarStore.events[0]
    const result = orchestratorStore.reconcileCalendarSnapshot(calendarStore.events, {
      now: event.startsAt - 23 * 60 * 60 * 1000,
    })
    orchestratorStore.saveNow()
    await waitForPendingPersistedStateWrites()
    return {
      requestCount: result.materializationRequestCount,
      eventId: event.id,
    }
  })
  expect(orchestration.eventId).toBe(originalCalendarEvent.id)
  expect(orchestration.requestCount).toBeLessThanOrEqual(1)

  await expect.poll(async () => page.evaluate(() => {
    const carrier = JSON.parse(localStorage.getItem('schatphone:store:agenda-journey') || '{}')
    return carrier?.data?.journeys?.[0]?.executionProof?.proposalId || ''
  })).toBe('proposal_weekly_sync_change_4')
  await expect.poll(async () => page.evaluate(() => {
    const carrier = JSON.parse(localStorage.getItem('schatphone:store:agenda-journey') || '{}')
    return (carrier?.data?.journeys || []).filter(
      (journey) => journey?.executionProof?.proposalId === 'proposal_weekly_sync_change_4',
    ).length
  })).toBe(1)
  const agendaJourneyId = await page.evaluate(() => {
    const carrier = JSON.parse(localStorage.getItem('schatphone:store:agenda-journey') || '{}')
    return carrier?.data?.journeys?.[0]?.id || ''
  })
  expect(agendaJourneyId).toBeTruthy()

  await page.getByTestId('notification-shade-trigger').click()
  const agendaNotification = page
    .locator('[data-testid^="notification-shade-note-"]')
    .filter({ hasText: '行程计划已准备' })
  await expect(agendaNotification).toBeVisible()
  await agendaNotification.locator('button').first().click()
  await waitForAppRouteReady(page, '/agenda-journey')
  await expect(page).toHaveURL(new RegExp(`journeyId=${encodeURIComponent(agendaJourneyId)}`))
  await expect(page.getByTestId('agenda-journey-focus')).toContainText('本周协作会时间变更')

  await page.getByTestId('agenda-open-map').click()
  await waitForAppRouteReady(page, '/map')
  const startedTrip = await page.evaluate(() => {
    const carrier = JSON.parse(localStorage.getItem('schatphone:store:map') || '{}')
    return carrier?.data?.tripState || null
  })
  expect(startedTrip).toMatchObject({
    status: 'traveling',
    sourceAgendaJourneyId: agendaJourneyId,
    sourceAgendaExecutionRevision: expect.any(String),
  })

  await page.evaluate(async () => {
    const { useMapStore } = await import('/schatphone/src/stores/map.js')
    const mapStore = useMapStore()
    mapStore.tickTripRuntime(
      mapStore.tripState.startedAt + mapStore.tripState.durationSeconds * 1000 + 1,
    )
    mapStore.saveNow()
  })
  await navigateInsideUnlockedApp(
    page,
    `/agenda-journey?journeyId=${encodeURIComponent(agendaJourneyId)}&source=map`,
  )
  await expect(page.getByTestId('agenda-travel-step')).toContainText('已完成')
  await expect(page.getByTestId('agenda-activity-step')).toContainText('可开始')
  await page.getByTestId('agenda-activity-start').click()
  await expect(page.getByTestId('activity-focus-companion')).toBeVisible()
  const activity = await page.evaluate(() => {
    const carrier = JSON.parse(localStorage.getItem('schatphone:store:activity-session') || '{}')
    return carrier?.data?.sessions?.[0] || null
  })
  expect(activity).toMatchObject({
    status: 'running',
    agendaJourneyId,
    agendaExecutionRevision: startedTrip.sourceAgendaExecutionRevision,
  })
  await navigateInsideUnlockedApp(page, '/chronicle?from=home&homePage=2')
  await waitForAppRouteReady(page, '/chronicle')
  await expect(page.getByRole('heading', { name: '生活志' })).toBeVisible()
  await expect(page.locator('.chronicle-entry-row').filter({ hasText: '组织安排已由你确认' })).toBeVisible()
  await expect(page.locator('.chronicle-entry-row').filter({ hasText: '已经到达安排地点' })).toBeVisible()
  const activityChronicleRow = page
    .locator('.chronicle-entry-row')
    .filter({ hasText: '活动由你明确开始' })
  await expect(activityChronicleRow).toBeVisible()
  await activityChronicleRow.click()
  await expect(page.getByTestId('chronicle-detail')).toContainText(
    '活动计时已经开始，但生活志不会据此推断最终完成',
  )
  await page.getByTestId('chronicle-link-write').click()
  await page.getByTestId('chronicle-editor-title').fill('协作会之后')
  await page.getByTestId('chronicle-editor-body').fill('我只记录自己愿意留下的感受。')
  await page.getByTestId('chronicle-editor-tags').fill('工作, 回顾')
  await page.getByTestId('chronicle-editor-save').click()
  await expect(page.getByTestId('chronicle-detail')).toContainText('我只记录自己愿意留下的感受。')
  await expect(page.getByTestId('chronicle-detail')).toContainText('可以回到原记录')

  const chronicleA11y = await new AxeBuilder({ page })
    .include('[data-app="chronicle"]')
    .analyze()
  expect(
    chronicleA11y.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact)),
  ).toEqual([])

  await page.reload()
  await unlockToHome(page)
  await navigateInsideUnlockedApp(page, '/chronicle?from=home&homePage=2')
  await expect(page.locator('.chronicle-entry-row').filter({ hasText: '协作会之后' })).toBeVisible()
  const finalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(finalOverflow).toBeLessThanOrEqual(1)
  await page.screenshot({
    path: join(
      evidenceDir,
      `${testInfo.project.name}-chronicle-production-chain.png`,
    ),
    fullPage: true,
  })
})
