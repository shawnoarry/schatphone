import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { WORK_HUB_RECORD_TYPES } from '../src/lib/work-hub-contracts'
import { useWorkHubStore } from '../src/stores/workHub'
import { createWorkHubAuthorityFixture } from './work-hub-contracts.test'

const NOW = new Date('2026-08-30T09:00:00+08:00').getTime()

describe('Work Hub production store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('requires explicit confirmation, persists authority, and restores durable decisions', async () => {
    const fixture = createWorkHubAuthorityFixture()
    const store = useWorkHubStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))

    expect(store.installAuthorityPackage(fixture, { expectedBinding: fixture.worldBinding })).toMatchObject({
      ok: false,
      code: 'explicit_confirmation_required',
    })
    expect(store.installAuthorityPackage(fixture, {
      expectedBinding: fixture.worldBinding,
      confirmed: true,
      now: NOW,
    })).toMatchObject({ ok: true, code: 'authority_installed' })

    expect(store.decideRecord(
      WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
      'proposal_weekly_sync',
      'accepted',
      { now: NOW + 1 },
    )).toMatchObject({ ok: true, receipt: { action: 'accepted' } })
    expect(store.resolveScheduleHandoffDraft('proposal_weekly_sync')).toMatchObject({
      sourceRecordId: 'proposal_weekly_sync',
    })

    setActivePinia(createPinia())
    const reopened = useWorkHubStore()
    expect(reopened.hasActiveAuthority).toBe(true)
    expect(reopened.receiptForSource(
      WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
      'proposal_weekly_sync',
    )).toMatchObject({ action: 'accepted' })
  })

  test('deduplicates exact authority and decisions while rejecting conflicting revisions and actions', async () => {
    const fixture = createWorkHubAuthorityFixture()
    const store = useWorkHubStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    store.installAuthorityPackage(fixture, { expectedBinding: fixture.worldBinding, confirmed: true, now: NOW })

    expect(store.installAuthorityPackage(fixture, {
      expectedBinding: fixture.worldBinding,
      confirmed: true,
      now: NOW,
    })).toMatchObject({ ok: true, reused: true })

    const conflicting = createWorkHubAuthorityFixture()
    conflicting.organizations[0].nameZh = '同版本不同内容'
    expect(store.installAuthorityPackage(conflicting, {
      expectedBinding: fixture.worldBinding,
      confirmed: true,
      now: NOW,
    })).toMatchObject({ ok: false, code: 'authority_revision_conflict' })

    store.decideRecord(WORK_HUB_RECORD_TYPES.WORK_NOTICE, 'notice_weekly_sync', 'accepted', { now: NOW + 1 })
    expect(store.decideRecord(
      WORK_HUB_RECORD_TYPES.WORK_NOTICE,
      'notice_weekly_sync',
      'accepted',
      { now: NOW + 2 },
    )).toMatchObject({ ok: true, reused: true })
    expect(store.decideRecord(
      WORK_HUB_RECORD_TYPES.WORK_NOTICE,
      'notice_weekly_sync',
      'declined',
      { now: NOW + 3 },
    )).toMatchObject({ ok: false, code: 'decision_conflict' })
  })

  test('rolls back a decision when persistence fails', async () => {
    const fixture = createWorkHubAuthorityFixture()
    const store = useWorkHubStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    store.installAuthorityPackage(fixture, { expectedBinding: fixture.worldBinding, confirmed: true, now: NOW })
    const originalSetItem = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      if (String(key).includes('work-hub')) throw new Error('disk full')
      return originalSetItem(key, value)
    })

    const result = store.decideRecord(
      WORK_HUB_RECORD_TYPES.WORK_NOTICE,
      'notice_weekly_sync',
      'accepted',
      { now: NOW + 1 },
    )
    expect(result).toMatchObject({ ok: false, code: 'persistence_failed', rolledBack: true })
    expect(store.receipts).toEqual([])
    spy.mockRestore()
  })

  test('restores missing Work Hub sections as empty for older backups', async () => {
    const store = useWorkHubStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    expect(store.restoreFromBackup({})).toBe(true)
    expect(store.hasActiveAuthority).toBe(false)
  })

  test('migrates the V1 carrier without losing authority or durable receipts', async () => {
    const fixture = createWorkHubAuthorityFixture()
    const store = useWorkHubStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    store.installAuthorityPackage(fixture, {
      expectedBinding: fixture.worldBinding,
      confirmed: true,
      now: NOW,
    })
    store.decideRecord(
      WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
      'proposal_weekly_sync',
      'accepted',
      { now: NOW + 1 },
    )
    const key = 'schatphone:store:work-hub'
    const carrier = JSON.parse(localStorage.getItem(key))
    localStorage.setItem(key, JSON.stringify({
      ...carrier,
      version: 1,
      data: { ...carrier.data, schemaVersion: 1 },
    }))

    setActivePinia(createPinia())
    const reopened = useWorkHubStore()
    expect(reopened.hasActiveAuthority).toBe(true)
    expect(reopened.receiptForSource(
      WORK_HUB_RECORD_TYPES.SCHEDULE_PROPOSAL,
      'proposal_weekly_sync',
    )).toMatchObject({ action: 'accepted' })
    expect(reopened.createBackupSnapshot()).toMatchObject({ schemaVersion: 2 })
  })
})
