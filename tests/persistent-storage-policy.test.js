import { describe, expect, test, vi } from 'vitest'
import {
  BATCH_DURABLE_WRITE_THRESHOLD_BYTES,
  BOOK_IMPORT_PERSISTENCE_THRESHOLD_BYTES,
  PEAK_WORKING_SPACE_THRESHOLD_BYTES,
  classifyCapacity,
  classifyPersistenceTrigger,
  createPersistentStoragePolicy,
} from '../src/lib/persistent-storage-policy'

describe('persistent storage policy', () => {
  test('does not qualify startup, hydration, ordinary edits, or sub-threshold writes', () => {
    expect(classifyPersistenceTrigger({ action: 'startup' })).toEqual({ qualifies: false, reasons: [] })
    expect(classifyPersistenceTrigger({ action: 'hydrate' })).toEqual({ qualifies: false, reasons: [] })
    expect(classifyPersistenceTrigger({ action: 'book_edit', estimatedAddedBytes: 1000 })).toEqual({
      qualifies: false,
      reasons: [],
    })
    expect(classifyPersistenceTrigger({
      action: 'book_import',
      estimatedAddedBytes: BOOK_IMPORT_PERSISTENCE_THRESHOLD_BYTES - 1,
      estimatedPeakWorkingBytes: PEAK_WORKING_SPACE_THRESHOLD_BYTES - 1,
    })).toEqual({ qualifies: false, reasons: [] })
  })

  test('qualifies only the confirmed contextual actions and centralized thresholds', () => {
    expect(classifyPersistenceTrigger({
      action: 'keep_local_binary',
      isFirstLocalBinary: true,
    }).reasons).toEqual(['first_local_binary'])
    expect(classifyPersistenceTrigger({ action: 'complete_backup_restore' }).qualifies).toBe(true)
    expect(classifyPersistenceTrigger({ action: 'storage_migration_cutover' }).qualifies).toBe(true)
    expect(classifyPersistenceTrigger({
      action: 'book_import',
      estimatedAddedBytes: BOOK_IMPORT_PERSISTENCE_THRESHOLD_BYTES,
    }).reasons).toEqual(['large_book_import'])
    expect(classifyPersistenceTrigger({
      action: 'batch_write',
      estimatedAddedBytes: BATCH_DURABLE_WRITE_THRESHOLD_BYTES,
      estimatedPeakWorkingBytes: PEAK_WORKING_SPACE_THRESHOLD_BYTES,
    }).reasons).toEqual(['large_batch_durable_write', 'high_peak_working_space'])
  })

  test('keeps unknown capacity distinct from zero and insufficient capacity', () => {
    expect(classifyCapacity({ usage: undefined, quota: undefined, requiredPeakBytes: 1 })).toMatchObject({
      status: 'unknown',
      availableBytes: null,
    })
    expect(classifyCapacity({ usage: 90, quota: 100, requiredPeakBytes: 10 })).toMatchObject({
      status: 'available',
      availableBytes: 10,
    })
    expect(classifyCapacity({ usage: 90, quota: 100, requiredPeakBytes: 11 })).toMatchObject({
      status: 'insufficient',
      availableBytes: 10,
    })
  })

  test('refreshes browser truth and requests persistence only after explicit confirmation', async () => {
    const storage = {
      persisted: vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true),
      estimate: vi.fn().mockResolvedValue({ usage: 10, quota: 1000 }),
      persist: vi.fn().mockResolvedValue(true),
    }
    const policy = createPersistentStoragePolicy({ storage })

    expect(storage.persisted).not.toHaveBeenCalled()
    expect(storage.persist).not.toHaveBeenCalled()
    const unconfirmed = await policy.request({
      context: 'book_import',
      trigger: { action: 'book_import', estimatedAddedBytes: BOOK_IMPORT_PERSISTENCE_THRESHOLD_BYTES },
      userConfirmed: false,
      requiredPeakBytes: 100,
    })
    expect(unconfirmed).toMatchObject({ state: 'not_persistent', attempted: false })
    expect(storage.persist).not.toHaveBeenCalled()

    const granted = await policy.request({
      context: 'book_import',
      trigger: { action: 'book_import', estimatedAddedBytes: BOOK_IMPORT_PERSISTENCE_THRESHOLD_BYTES },
      userConfirmed: true,
      requiredPeakBytes: 100,
    })
    expect(granted).toMatchObject({ state: 'persistent', attempted: true })
    expect(storage.persist).toHaveBeenCalledTimes(1)
  })

  test('classifies unsupported, denied, error, and explicit Settings retry without false protection', async () => {
    expect(await createPersistentStoragePolicy({ storage: null }).inspect()).toMatchObject({
      state: 'unsupported',
    })

    const deniedStorage = {
      persisted: vi.fn().mockResolvedValue(false),
      estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 100 }),
      persist: vi.fn().mockResolvedValue(false),
    }
    const deniedPolicy = createPersistentStoragePolicy({ storage: deniedStorage })
    expect(await deniedPolicy.retryFromSettings({
      trigger: { action: 'complete_backup_restore' },
    })).toMatchObject({ state: 'denied', attempted: true, lastContext: 'settings_retry' })

    const errorStorage = {
      persisted: vi.fn().mockResolvedValue(false),
      estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 100 }),
      persist: vi.fn().mockRejectedValue(new Error('denied by browser')),
    }
    expect(await createPersistentStoragePolicy({ storage: errorStorage }).retryFromSettings({
      trigger: { action: 'storage_migration_cutover' },
    })).toMatchObject({ state: 'error', attempted: true, errorCode: 'storage_request_failed' })
  })
})
