import { createPersistenceRepository } from './persistence-repository'

export const BACKUP_RESTORE_OPERATION_TYPE = 'complete_backup_restore'
export const BACKUP_RESTORE_OWNER_ID = 'backup-recovery'
export const BACKUP_RESTORE_DATA_CLASS_ID = 'rollback-checkpoint'
export const BACKUP_RESTORE_RECORD_ID = 'previous-current-save'

const createId = (prefix) => {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${suffix}`
}

export const stageBackupRestoreCheckpoint = async (snapshot, options = {}) => {
  if (!snapshot || typeof snapshot !== 'object') {
    const error = new Error('A rollback snapshot is required.')
    error.code = 'BACKUP_RESTORE_CHECKPOINT_INVALID'
    throw error
  }
  const repository = options.repository || (await createPersistenceRepository(options.repositoryOptions))
  const operationId = options.operationId || createId('backup-restore-operation')
  const generationId = options.generationId || createId('backup-restore-generation')
  const now = Number(options.now || Date.now())

  try {
    const activePointer = await repository.readActivePointer()
    await repository.stageGeneration({
      operationId,
      operationType: BACKUP_RESTORE_OPERATION_TYPE,
      generationId,
      parentGenerationId: activePointer?.generationId || null,
      inventoryVersion: 1,
      ownerClasses: [
        {
          ownerId: BACKUP_RESTORE_OWNER_ID,
          dataClassId: BACKUP_RESTORE_DATA_CLASS_ID,
          records: [
            {
              recordId: BACKUP_RESTORE_RECORD_ID,
              revision: 1,
              recordSchemaVersion: 1,
              createdAt: now,
              updatedAt: now,
              payload: snapshot,
              indexKeys: { position: 0 },
            },
          ],
        },
      ],
      now,
    })
    await repository.markGenerationVerified({ generationId, operationId, now })
    const records = await repository.readClassRecords({
      generationId,
      ownerId: BACKUP_RESTORE_OWNER_ID,
      dataClassId: BACKUP_RESTORE_DATA_CLASS_ID,
    })
    if (records.length !== 1 || records[0]?.record?.recordId !== BACKUP_RESTORE_RECORD_ID) {
      const error = new Error('The rollback checkpoint could not be verified.')
      error.code = 'BACKUP_RESTORE_CHECKPOINT_INCOMPLETE'
      throw error
    }
    await repository.beginExternalOperation({ generationId, operationId, now })
    return {
      ok: true,
      operationId,
      generationId,
      repository,
      ownsRepository: !options.repository,
    }
  } catch (error) {
    if (!options.repository) repository.close()
    throw error
  }
}

export const completeBackupRestoreCheckpoint = async (
  checkpoint,
  { recoveryAction = 'backup_restore_completed', errorCode = '' } = {},
) => {
  if (!checkpoint?.repository || !checkpoint.operationId || !checkpoint.generationId) return false
  try {
    await checkpoint.repository.completeExternalOperation({
      generationId: checkpoint.generationId,
      operationId: checkpoint.operationId,
      recoveryAction,
      errorCode,
    })
    return true
  } finally {
    if (checkpoint.ownsRepository) checkpoint.repository.close()
  }
}

export const markBackupRestoreCheckpointHardFailure = async (
  checkpoint,
  errorCode = 'rollback_failed',
) => {
  if (!checkpoint?.repository || !checkpoint.operationId || !checkpoint.generationId) return false
  try {
    await checkpoint.repository.markRecoveryHardFailure({
      generationId: checkpoint.generationId,
      operationId: checkpoint.operationId,
      errorCode,
    })
    return true
  } finally {
    if (checkpoint.ownsRepository) checkpoint.repository.close()
  }
}

export const listPendingBackupRestoreCheckpoints = async (options = {}) => {
  const repository = options.repository || (await createPersistenceRepository(options.repositoryOptions))
  try {
    const journals = await repository.listNonterminalJournals()
    const pending = []
    for (const journal of journals) {
      if (journal?.operationType !== BACKUP_RESTORE_OPERATION_TYPE) continue
      if (!['staging', 'verified', 'external_applying'].includes(journal?.phase)) continue
      const records = await repository.readClassRecords({
        generationId: journal.candidateGenerationId,
        ownerId: BACKUP_RESTORE_OWNER_ID,
        dataClassId: BACKUP_RESTORE_DATA_CLASS_ID,
      })
      const snapshot = records.find((entry) => entry?.record?.recordId === BACKUP_RESTORE_RECORD_ID)
        ?.record?.payload
      pending.push({
        operationId: journal.operationId,
        generationId: journal.candidateGenerationId,
        phase: journal.phase,
        snapshot: snapshot && typeof snapshot === 'object' ? snapshot : null,
      })
    }
    return { ok: true, pending }
  } finally {
    if (!options.repository) repository.close()
  }
}
