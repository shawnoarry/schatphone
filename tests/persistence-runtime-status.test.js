import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  clearPersistenceIncident,
  getPersistenceRuntimeStatus,
  reportPersistenceWriteResult,
  resetPersistenceRuntimeStatusForTesting,
  retryPersistenceWrites,
  subscribePersistenceRuntimeStatus,
} from '../src/lib/persistence-runtime-status'

describe('persistence runtime status', () => {
  beforeEach(() => {
    resetPersistenceRuntimeStatusForTesting()
  })

  test('surfaces a failed write and clears it after a successful retry', async () => {
    const retry = vi.fn().mockResolvedValue({ ok: true })
    const statuses = []
    const unsubscribe = subscribePersistenceRuntimeStatus((status) => statuses.push(status))

    reportPersistenceWriteResult({
      key: 'store:system',
      result: {
        ok: false,
        error: 'quota_exceeded',
        carrier: 'localStorage',
        retryable: true,
      },
      retry,
    })

    expect(getPersistenceRuntimeStatus()).toMatchObject({
      active: true,
      mode: 'save_failed',
      incidentCount: 1,
      primaryCode: 'quota_exceeded',
      retryAvailable: true,
    })

    await expect(retryPersistenceWrites()).resolves.toMatchObject({
      ok: true,
      attempted: 1,
      succeeded: 1,
      remaining: 0,
    })
    expect(retry).toHaveBeenCalledTimes(1)
    expect(getPersistenceRuntimeStatus().active).toBe(false)
    expect(statuses.some((status) => status.phase === 'retrying')).toBe(true)
    unsubscribe()
  })

  test('keeps read-only protection above ordinary and degraded failures', () => {
    reportPersistenceWriteResult({
      key: 'store:gallery',
      result: {
        ok: false,
        error: 'carrier_unavailable',
        local: { ok: true },
        mirror: { ok: false },
      },
    })
    reportPersistenceWriteResult({
      key: 'store:wallet',
      result: { ok: false, error: 'serialization_failed' },
    })
    reportPersistenceWriteResult({
      key: 'store:book',
      result: { ok: false, code: 'read_only_conflict', readOnly: true },
    })

    expect(getPersistenceRuntimeStatus()).toMatchObject({
      active: true,
      mode: 'read_only',
      incidentCount: 3,
      primaryCode: 'read_only_conflict',
    })

    clearPersistenceIncident('store:book')
    expect(getPersistenceRuntimeStatus()).toMatchObject({
      mode: 'save_failed',
      incidentCount: 2,
      primaryCode: 'serialization_failed',
    })
  })

  test('does not retain a resolved success as an incident', () => {
    reportPersistenceWriteResult({
      key: 'store:system',
      result: { ok: false, error: 'security_error' },
    })
    reportPersistenceWriteResult({ key: 'store:system', result: { ok: true } })

    expect(getPersistenceRuntimeStatus()).toEqual(
      expect.objectContaining({
        active: false,
        incidentCount: 0,
        mode: 'ready',
      }),
    )
  })

  test('does not offer retry for a non-retryable write result', () => {
    reportPersistenceWriteResult({
      key: 'store:system',
      result: { ok: false, error: 'serialization_failed', retryable: false },
      retry: vi.fn(),
    })

    expect(getPersistenceRuntimeStatus()).toMatchObject({
      active: true,
      retryAvailable: false,
      primaryCode: 'serialization_failed',
    })
  })
})
