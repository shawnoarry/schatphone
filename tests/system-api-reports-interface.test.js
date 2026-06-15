import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemApiReports } from '../src/composables/useSystemApiReports'
import { useSystemStore } from '../src/stores/system'

describe('system API reports interface', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('exposes filtered reports and summary behind a narrow interface', () => {
    const systemStore = useSystemStore()
    const apiReports = useSystemApiReports({ systemStore })

    const networkId = apiReports.addReport({
      level: 'error',
      module: 'network',
      action: 'fetch_models',
      code: 'RATE_LIMIT',
      message: 'Rate limited by provider',
    })
    const storageInfoId = apiReports.addReport({
      level: 'info',
      module: 'storage',
      action: 'repair_storage',
      code: 'STORAGE_REPAIR_DONE',
      message: 'Storage repair completed',
    })
    const storageErrorId = apiReports.addReport({
      level: 'error',
      module: 'storage',
      action: 'audit_storage',
      code: 'STORAGE_MIRROR_DRIFT',
      message: 'Storage mirror drift detected',
    })

    expect(apiReports.reportItems.value.map((item) => item.id)).toEqual([
      storageErrorId,
      storageInfoId,
      networkId,
    ])
    expect(apiReports.reportSummary.value).toEqual({
      total: 3,
      errorCount: 2,
      infoCount: 1,
    })
    expect(apiReports.listReports({ moduleFilter: 'storage' }).map((item) => item.id)).toEqual([
      storageErrorId,
      storageInfoId,
    ])
    expect(
      apiReports
        .listReports({ moduleFilter: 'storage', levelFilter: 'error' })
        .map((item) => item.id),
    ).toEqual([storageErrorId])
    expect(apiReports.latestReportByModule('storage')?.id).toBe(storageErrorId)
    expect(apiReports.countReports({ moduleFilter: 'storage' })).toBe(2)
    expect(apiReports.countReports({ moduleFilter: 'storage', levelFilter: 'error' })).toBe(1)

    const snapshot = apiReports.createReportSnapshot()
    expect(snapshot.map((item) => item.id)).toEqual([
      storageErrorId,
      storageInfoId,
      networkId,
    ])
    snapshot[0].message = 'Changed outside the store'
    expect(apiReports.reportItems.value[0].message).toBe('Storage mirror drift detected')
  })

  test('clears reports with store-compatible filters', () => {
    const systemStore = useSystemStore()
    const apiReports = useSystemApiReports({ systemStore })

    const networkId = apiReports.addReport({
      level: 'error',
      module: 'network',
      action: 'chat_smoke_test',
      code: 'AUTH',
      message: 'Network auth failure',
    })
    const storageInfoId = apiReports.addReport({
      level: 'info',
      module: 'storage',
      action: 'repair_storage',
      code: 'STORAGE_REPAIR_DONE',
      message: 'Storage repair completed',
    })
    const storageErrorId = apiReports.addReport({
      level: 'error',
      module: 'storage',
      action: 'audit_storage',
      code: 'STORAGE_LAYER_INVALID',
      message: 'Storage layer invalid',
    })

    expect(apiReports.reportItems.value.map((item) => item.id)).toEqual([
      storageErrorId,
      storageInfoId,
      networkId,
    ])

    expect(apiReports.clearReports({ module: 'storage', level: 'error' })).toBe(1)
    expect(apiReports.reportItems.value.map((item) => item.id)).toEqual([
      storageInfoId,
      networkId,
    ])

    expect(apiReports.clearReports()).toBe(2)
    expect(apiReports.reportItems.value).toEqual([])
  })
})
