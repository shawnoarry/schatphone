import { describe, expect, test, vi } from 'vitest'
import { recoverPendingBackupRestores } from '../src/lib/backup-restore-runtime'
import {
  BACKUP_RESTORE_DATA_CLASS_ID,
  BACKUP_RESTORE_OPERATION_TYPE,
  BACKUP_RESTORE_OWNER_ID,
  BACKUP_RESTORE_RECORD_ID,
  listPendingBackupRestoreCheckpoints,
} from '../src/lib/backup-restore-checkpoint'

describe('backup restore crash checkpoints', () => {
  test('lists every recoverable backup checkpoint phase with its rollback snapshot', async () => {
    const snapshot = { system: {}, chat: {} }
    const repository = {
      listNonterminalJournals: vi.fn(async () => [
        {
          operationId: 'restore-staged',
          operationType: BACKUP_RESTORE_OPERATION_TYPE,
          phase: 'verified',
          candidateGenerationId: 'generation-staged',
        },
        {
          operationId: 'restore-applying',
          operationType: BACKUP_RESTORE_OPERATION_TYPE,
          phase: 'external_applying',
          candidateGenerationId: 'generation-applying',
        },
        {
          operationId: 'book-operation',
          operationType: 'book_legacy_stage',
          phase: 'verified',
          candidateGenerationId: 'book-generation',
        },
      ]),
      readClassRecords: vi.fn(async ({ generationId, ownerId, dataClassId }) => {
        expect(ownerId).toBe(BACKUP_RESTORE_OWNER_ID)
        expect(dataClassId).toBe(BACKUP_RESTORE_DATA_CLASS_ID)
        return [
          {
            record: {
              recordId: BACKUP_RESTORE_RECORD_ID,
              payload: { ...snapshot, generationId },
            },
          },
        ]
      }),
    }

    const result = await listPendingBackupRestoreCheckpoints({ repository })

    expect(result.pending).toEqual([
      expect.objectContaining({
        operationId: 'restore-staged',
        phase: 'verified',
        snapshot: expect.objectContaining({ generationId: 'generation-staged' }),
      }),
      expect.objectContaining({
        operationId: 'restore-applying',
        phase: 'external_applying',
        snapshot: expect.objectContaining({ generationId: 'generation-applying' }),
      }),
    ])
    expect(repository.readClassRecords).toHaveBeenCalledTimes(2)
  })

  test('closes a pre-apply checkpoint without restoring or creating stores', async () => {
    const repository = {
      listNonterminalJournals: vi.fn(async () => [
        {
          operationId: 'restore-pre-apply',
          operationType: BACKUP_RESTORE_OPERATION_TYPE,
          phase: 'staging',
          candidateGenerationId: 'generation-pre-apply',
        },
      ]),
      readClassRecords: vi.fn(async () => [
        {
          record: {
            recordId: BACKUP_RESTORE_RECORD_ID,
            payload: { system: {}, chat: {} },
          },
        },
      ]),
      abortGeneration: vi.fn(async () => ({ ok: true })),
    }

    const result = await recoverPendingBackupRestores({ repository })

    expect(result).toEqual({ ok: true, recovered: 1 })
    expect(repository.abortGeneration).toHaveBeenCalledWith({
      generationId: 'generation-pre-apply',
      operationId: 'restore-pre-apply',
      errorCode: 'startup_before_restore_mutation',
    })
  })

  test('returns a fail-closed result when the recovery repository is unavailable', async () => {
    const result = await recoverPendingBackupRestores({
      repository: {
        listNonterminalJournals: vi.fn(async () => {
          const error = new Error('blocked')
          error.code = 'carrier_busy'
          throw error
        }),
      },
    })

    await expect(Promise.resolve(result)).resolves.toMatchObject({
      ok: false,
      recovered: 0,
      code: 'carrier_busy',
    })
  })
})
