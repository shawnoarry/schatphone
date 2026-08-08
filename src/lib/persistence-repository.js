import {
  GENERATION_RECORDS_STORE,
  GENERATIONS_STORE,
  OPERATION_JOURNAL_STORE,
  RECORD_VERSIONS_STORE,
  REPOSITORY_META_STORE,
  WRITE_LEASES_STORE,
  canonicalStringify,
  openPersistenceRepositoryDatabase,
  sha256Canonical,
} from './persistence-repository-schema'

const requestResult = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('indexeddb_request_failed'))
  })

const transactionDone = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error || new Error('indexeddb_transaction_aborted'))
    transaction.onerror = () => reject(transaction.error || new Error('indexeddb_transaction_failed'))
  })

export class PersistenceRepositoryError extends Error {
  constructor(code, context = {}) {
    super(code)
    this.name = 'PersistenceRepositoryError'
    this.code = code
    this.context = context
  }
}

const assertNonEmpty = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new PersistenceRepositoryError('invalid_record', { field })
  }
  return value.trim()
}

const toRevision = (value) => {
  const revision = Number(value)
  if (!Number.isInteger(revision) || revision < 1) {
    throw new PersistenceRepositoryError('invalid_record', { field: 'revision' })
  }
  return revision
}

const makeRecordVersion = async ({
  ownerId,
  dataClassId,
  recordId,
  revision,
  recordSchemaVersion = 1,
  createdAt,
  updatedAt,
  payload,
  sourceReferences = [],
}) => {
  const normalizedOwnerId = assertNonEmpty(ownerId, 'ownerId')
  const normalizedClassId = assertNonEmpty(dataClassId, 'dataClassId')
  const normalizedRecordId = assertNonEmpty(recordId, 'recordId')
  const normalizedRevision = toRevision(revision)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new PersistenceRepositoryError('invalid_record', { field: 'payload' })
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'id') && payload.id !== normalizedRecordId) {
    throw new PersistenceRepositoryError('invalid_record', { field: 'payload.id' })
  }
  const digest = await sha256Canonical(payload)
  return {
    ownerId: normalizedOwnerId,
    dataClassId: normalizedClassId,
    recordId: normalizedRecordId,
    revision: normalizedRevision,
    recordSchemaVersion,
    createdAt,
    updatedAt,
    payload,
    sourceReferences: Array.isArray(sourceReferences) ? sourceReferences : [],
    integrity: { sha256: digest },
  }
}

const sortMembership = (left, right) => {
  const leftPosition = Number(left.indexKeys?.position)
  const rightPosition = Number(right.indexKeys?.position)
  if (leftPosition !== rightPosition) return leftPosition - rightPosition
  return left.recordId.localeCompare(right.recordId)
}

export const createPersistenceRepository = async (options = {}) => {
  const database = options.database || (await openPersistenceRepositoryDatabase(options))
  let closed = false

  const assertOpen = () => {
    if (closed) throw new PersistenceRepositoryError('carrier_unavailable')
  }

  const runTransaction = async (storeNames, mode, worker) => {
    assertOpen()
    let transaction
    let completion
    try {
      transaction = database.transaction(storeNames, mode)
      completion = transactionDone(transaction)
      const stores = Object.fromEntries(
        storeNames.map((storeName) => [storeName, transaction.objectStore(storeName)]),
      )
      const result = await worker(stores, transaction)
      await completion
      return result
    } catch (error) {
      try {
        transaction?.abort()
      } catch {
        // The transaction may already be complete or aborted.
      }
      await completion?.catch(() => {})
      if (error instanceof PersistenceRepositoryError) throw error
      throw new PersistenceRepositoryError('carrier_unavailable', {
        cause: error?.name || error?.message || String(error),
      })
    }
  }

  const getRecordVersion = ({ ownerId, dataClassId, recordId, revision }) =>
    runTransaction([RECORD_VERSIONS_STORE], 'readonly', ({ record_versions: store }) =>
      requestResult(store.get([ownerId, dataClassId, recordId, revision])),
    )

  const getLatestRecordVersion = ({ ownerId, dataClassId, recordId }) =>
    runTransaction([RECORD_VERSIONS_STORE], 'readonly', async ({ record_versions: store }) => {
      const index = store.index('by_record')
      const records = await requestResult(
        index.getAll(IDBKeyRange.only([ownerId, dataClassId, recordId])),
      )
      return records.sort((left, right) => right.revision - left.revision)[0]
    })

  const stageGeneration = async ({
    operationId,
    operationType = 'book_legacy_stage',
    generationId,
    parentGenerationId = null,
    inventoryVersion = 1,
    ownerClasses,
    sourceEvidence = null,
    now = Date.now(),
  }) => {
    assertNonEmpty(operationId, 'operationId')
    assertNonEmpty(generationId, 'generationId')
    if (!Array.isArray(ownerClasses)) {
      throw new PersistenceRepositoryError('invalid_generation', { field: 'ownerClasses' })
    }

    const preparedClasses = []
    for (const ownerClass of ownerClasses) {
      const ownerId = assertNonEmpty(ownerClass.ownerId, 'ownerId')
      const dataClassId = assertNonEmpty(ownerClass.dataClassId, 'dataClassId')
      const records = []
      for (let position = 0; position < ownerClass.records.length; position += 1) {
        const input = ownerClass.records[position]
        const record = await makeRecordVersion({ ...input, ownerId, dataClassId })
        records.push({
          record,
          membership: {
            generationId,
            ownerId,
            dataClassId,
            recordId: record.recordId,
            revision: record.revision,
            recordDigest: record.integrity.sha256,
            indexKeys: { position, ...(input.indexKeys || {}) },
          },
        })
      }
      const classDigest = await sha256Canonical(
        records.map(({ membership }) => ({
          recordId: membership.recordId,
          revision: membership.revision,
          recordDigest: membership.recordDigest,
          indexKeys: membership.indexKeys,
        })),
      )
      preparedClasses.push({ ownerId, dataClassId, records, count: records.length, classDigest })
    }

    const generation = {
      generationId,
      parentGenerationId,
      operationId,
      status: 'staging',
      inventoryVersion,
      repositorySchemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      verifiedAt: null,
      activatedAt: null,
      ownerClassCounts: Object.fromEntries(
        preparedClasses.map((entry) => [`${entry.ownerId}:${entry.dataClassId}`, entry.count]),
      ),
      ownerClassDigests: Object.fromEntries(
        preparedClasses.map((entry) => [`${entry.ownerId}:${entry.dataClassId}`, entry.classDigest]),
      ),
      legacySourceEvidence: sourceEvidence,
    }
    const journal = {
      operationId,
      operationType,
      phase: 'staging',
      previousGenerationId: parentGenerationId,
      candidateGenerationId: generationId,
      expectedPointerRevision: null,
      legacyFallbacks: sourceEvidence ? [sourceEvidence] : [],
      startedAt: now,
      updatedAt: now,
      errorCode: '',
      recoveryAction: '',
    }

    return runTransaction(
      [RECORD_VERSIONS_STORE, GENERATION_RECORDS_STORE, GENERATIONS_STORE, OPERATION_JOURNAL_STORE],
      'readwrite',
      async (stores) => {
        const existingGeneration = await requestResult(stores[GENERATIONS_STORE].get(generationId))
        if (existingGeneration) {
          if (
            existingGeneration.operationId === operationId &&
            canonicalStringify(existingGeneration.ownerClassDigests) ===
              canonicalStringify(generation.ownerClassDigests)
          ) {
            return { generation: existingGeneration, idempotent: true }
          }
          throw new PersistenceRepositoryError('generation_conflict', { generationId })
        }

        stores[GENERATIONS_STORE].add(generation)
        stores[OPERATION_JOURNAL_STORE].add(journal)
        for (const ownerClass of preparedClasses) {
          for (const { record, membership } of ownerClass.records) {
            const key = [record.ownerId, record.dataClassId, record.recordId, record.revision]
            const existingRecord = await requestResult(stores[RECORD_VERSIONS_STORE].get(key))
            if (existingRecord) {
              if (existingRecord.integrity?.sha256 !== record.integrity.sha256) {
                throw new PersistenceRepositoryError('revision_digest_conflict', {
                  ownerId: record.ownerId,
                  dataClassId: record.dataClassId,
                  recordId: record.recordId,
                  revision: record.revision,
                })
              }
            } else {
              stores[RECORD_VERSIONS_STORE].add(record)
            }
            stores[GENERATION_RECORDS_STORE].add(membership)
          }
        }
        return { generation, idempotent: false }
      },
    )
  }

  const readClassMembership = ({ generationId, ownerId, dataClassId }) =>
    runTransaction([GENERATION_RECORDS_STORE], 'readonly', async (stores) => {
      const index = stores[GENERATION_RECORDS_STORE].index('by_generation_owner_class')
      const rows = await requestResult(index.getAll(IDBKeyRange.only([generationId, ownerId, dataClassId])))
      return rows.sort(sortMembership)
    })

  const readClassRecords = async ({ generationId, ownerId, dataClassId }) => {
    const memberships = await readClassMembership({ generationId, ownerId, dataClassId })
    const records = []
    for (const membership of memberships) {
      const record = await getRecordVersion(membership)
      if (!record || record.integrity?.sha256 !== membership.recordDigest) {
        throw new PersistenceRepositoryError('generation_incomplete', {
          generationId,
          ownerId,
          dataClassId,
          recordId: membership.recordId,
        })
      }
      records.push({ membership, record })
    }
    return records
  }

  const getGeneration = (generationId) =>
    runTransaction([GENERATIONS_STORE], 'readonly', ({ generations: store }) =>
      requestResult(store.get(generationId)),
    )

  const markGenerationVerified = ({ generationId, operationId, now = Date.now() }) =>
    runTransaction([GENERATIONS_STORE, OPERATION_JOURNAL_STORE], 'readwrite', async (stores) => {
      const generation = await requestResult(stores[GENERATIONS_STORE].get(generationId))
      const journal = await requestResult(stores[OPERATION_JOURNAL_STORE].get(operationId))
      if (!generation || !journal || generation.operationId !== operationId) {
        throw new PersistenceRepositoryError('generation_incomplete', { generationId, operationId })
      }
      if (!['staging', 'verified'].includes(generation.status)) {
        throw new PersistenceRepositoryError('generation_state_conflict', {
          generationId,
          status: generation.status,
        })
      }
      const nextGeneration = { ...generation, status: 'verified', verifiedAt: now, updatedAt: now }
      const nextJournal = { ...journal, phase: 'verified', updatedAt: now }
      stores[GENERATIONS_STORE].put(nextGeneration)
      stores[OPERATION_JOURNAL_STORE].put(nextJournal)
      return nextGeneration
    })

  const abortGeneration = ({ generationId, operationId, errorCode = '', now = Date.now() }) =>
    runTransaction([GENERATIONS_STORE, OPERATION_JOURNAL_STORE], 'readwrite', async (stores) => {
      const generation = await requestResult(stores[GENERATIONS_STORE].get(generationId))
      const journal = await requestResult(stores[OPERATION_JOURNAL_STORE].get(operationId))
      if (!generation || generation.operationId !== operationId || !journal) {
        throw new PersistenceRepositoryError('generation_incomplete', { generationId, operationId })
      }
      if (!['staging', 'verified', 'aborted'].includes(generation.status)) {
        throw new PersistenceRepositoryError('generation_state_conflict', {
          generationId,
          status: generation.status,
        })
      }
      const nextGeneration = { ...generation, status: 'aborted', updatedAt: now }
      const nextJournal = {
        ...journal,
        phase: 'completed',
        updatedAt: now,
        errorCode,
        recoveryAction: 'inactive_generation_aborted',
      }
      stores[GENERATIONS_STORE].put(nextGeneration)
      stores[OPERATION_JOURNAL_STORE].put(nextJournal)
      return nextGeneration
    })

  const readMeta = (key) =>
    runTransaction([REPOSITORY_META_STORE], 'readonly', ({ repository_meta: store }) =>
      requestResult(store.get(key)),
    )

  const beginExternalOperation = ({ generationId, operationId, now = Date.now() }) =>
    runTransaction([GENERATIONS_STORE, OPERATION_JOURNAL_STORE], 'readwrite', async (stores) => {
      const generation = await requestResult(stores[GENERATIONS_STORE].get(generationId))
      const journal = await requestResult(stores[OPERATION_JOURNAL_STORE].get(operationId))
      if (!generation || !journal || generation.operationId !== operationId) {
        throw new PersistenceRepositoryError('generation_incomplete', { generationId, operationId })
      }
      if (generation.status !== 'verified' || journal.phase !== 'verified') {
        throw new PersistenceRepositoryError('generation_state_conflict', {
          generationId,
          generationStatus: generation.status,
          journalPhase: journal.phase,
        })
      }
      const nextGeneration = { ...generation, status: 'external_applying', updatedAt: now }
      const nextJournal = { ...journal, phase: 'external_applying', updatedAt: now }
      stores[GENERATIONS_STORE].put(nextGeneration)
      stores[OPERATION_JOURNAL_STORE].put(nextJournal)
      return { generation: nextGeneration, journal: nextJournal }
    })

  const completeExternalOperation = ({
    generationId,
    operationId,
    recoveryAction = 'external_operation_completed',
    errorCode = '',
    now = Date.now(),
  }) => runTransaction(
    [GENERATIONS_STORE, OPERATION_JOURNAL_STORE],
    'readwrite',
    async (stores) => {
      const generation = await requestResult(stores[GENERATIONS_STORE].get(generationId))
      const journal = await requestResult(stores[OPERATION_JOURNAL_STORE].get(operationId))
      if (!generation || !journal || generation.operationId !== operationId) {
        throw new PersistenceRepositoryError('generation_incomplete', { generationId, operationId })
      }
      if (
        !['external_applying', 'external_completed'].includes(generation.status) ||
        !['external_applying', 'completed'].includes(journal.phase)
      ) {
        throw new PersistenceRepositoryError('generation_state_conflict', {
          generationId,
          generationStatus: generation.status,
          journalPhase: journal.phase,
        })
      }
      const nextGeneration = { ...generation, status: 'external_completed', updatedAt: now }
      const nextJournal = {
        ...journal,
        phase: 'completed',
        updatedAt: now,
        errorCode,
        recoveryAction,
      }
      stores[GENERATIONS_STORE].put(nextGeneration)
      stores[OPERATION_JOURNAL_STORE].put(nextJournal)
      return { generation: nextGeneration, journal: nextJournal }
    },
  )

  const readActivePointer = async () => {
    const pointer = await readMeta('active-generation')
    return pointer || {
      key: 'active-generation',
      generationId: null,
      pointerRevision: 0,
      updatedAt: null,
      operationId: '',
    }
  }

  const getOperationJournal = (operationId) =>
    runTransaction([OPERATION_JOURNAL_STORE], 'readonly', ({ operation_journal: store }) =>
      requestResult(store.get(operationId)),
    )

  const listNonterminalJournals = () =>
    runTransaction([OPERATION_JOURNAL_STORE], 'readonly', async ({ operation_journal: store }) => {
      const journals = await requestResult(store.getAll())
      return journals
        .filter((entry) => !['completed', 'rolled_back', 'hard_failure'].includes(entry.phase))
        .sort((left, right) => left.updatedAt - right.updatedAt || left.operationId.localeCompare(right.operationId))
    })

  const listHardFailureJournals = () =>
    runTransaction([OPERATION_JOURNAL_STORE], 'readonly', async ({ operation_journal: store }) => {
      const journals = await requestResult(store.getAll())
      return journals
        .filter((entry) => entry.phase === 'hard_failure')
        .sort((left, right) => left.updatedAt - right.updatedAt || left.operationId.localeCompare(right.operationId))
    })

  const prepareGenerationActivation = ({
    generationId,
    operationId,
    expectedPointerRevision,
    now = Date.now(),
  }) => runTransaction(
    [GENERATIONS_STORE, OPERATION_JOURNAL_STORE, REPOSITORY_META_STORE],
    'readwrite',
    async (stores) => {
      const [generation, journal, pointer] = await Promise.all([
        requestResult(stores[GENERATIONS_STORE].get(generationId)),
        requestResult(stores[OPERATION_JOURNAL_STORE].get(operationId)),
        requestResult(stores[REPOSITORY_META_STORE].get('active-generation')),
      ])
      const actualPointerRevision = Number(pointer?.pointerRevision || 0)
      if (actualPointerRevision !== Number(expectedPointerRevision || 0)) {
        throw new PersistenceRepositoryError('stale_generation', {
          expectedPointerRevision: Number(expectedPointerRevision || 0),
          actualPointerRevision,
        })
      }
      if (!generation || !journal || generation.operationId !== operationId) {
        throw new PersistenceRepositoryError('generation_incomplete', { generationId, operationId })
      }
      if (generation.status !== 'verified' || journal.phase !== 'verified') {
        throw new PersistenceRepositoryError('generation_state_conflict', {
          generationId,
          generationStatus: generation.status,
          journalPhase: journal.phase,
        })
      }
      const nextGeneration = { ...generation, status: 'activating', updatedAt: now }
      const nextJournal = {
        ...journal,
        phase: 'activating',
        previousGenerationId: pointer?.generationId || null,
        expectedPointerRevision: actualPointerRevision,
        updatedAt: now,
      }
      stores[GENERATIONS_STORE].put(nextGeneration)
      stores[OPERATION_JOURNAL_STORE].put(nextJournal)
      return { generation: nextGeneration, journal: nextJournal, pointer: pointer || null }
    },
  )

  const activateGeneration = ({
    generationId,
    operationId,
    expectedPointerRevision,
    now = Date.now(),
  }) => runTransaction(
    [REPOSITORY_META_STORE, GENERATIONS_STORE, OPERATION_JOURNAL_STORE],
    'readwrite',
    async (stores) => {
      const [pointer, candidate, journal] = await Promise.all([
        requestResult(stores[REPOSITORY_META_STORE].get('active-generation')),
        requestResult(stores[GENERATIONS_STORE].get(generationId)),
        requestResult(stores[OPERATION_JOURNAL_STORE].get(operationId)),
      ])
      const actualPointerRevision = Number(pointer?.pointerRevision || 0)
      if (actualPointerRevision !== Number(expectedPointerRevision || 0)) {
        throw new PersistenceRepositoryError('stale_generation', {
          expectedPointerRevision: Number(expectedPointerRevision || 0),
          actualPointerRevision,
        })
      }
      if (!candidate || candidate.operationId !== operationId || !journal) {
        throw new PersistenceRepositoryError('generation_incomplete', { generationId, operationId })
      }
      if (candidate.status !== 'activating' || journal.phase !== 'activating') {
        throw new PersistenceRepositoryError('generation_state_conflict', {
          generationId,
          generationStatus: candidate.status,
          journalPhase: journal.phase,
        })
      }
      const previousGenerationId = pointer?.generationId || null
      if ((journal.previousGenerationId || null) !== previousGenerationId) {
        throw new PersistenceRepositoryError('stale_generation', {
          expectedGenerationId: journal.previousGenerationId || null,
          actualGenerationId: previousGenerationId,
        })
      }
      if (previousGenerationId) {
        const previous = await requestResult(stores[GENERATIONS_STORE].get(previousGenerationId))
        if (!previous || previous.status !== 'active') {
          throw new PersistenceRepositoryError('generation_state_conflict', {
            generationId: previousGenerationId,
            status: previous?.status || 'missing',
          })
        }
        stores[GENERATIONS_STORE].put({ ...previous, status: 'superseded', updatedAt: now })
      }
      const activeGeneration = { ...candidate, status: 'active', activatedAt: now, updatedAt: now }
      const nextPointer = {
        key: 'active-generation',
        generationId,
        pointerRevision: actualPointerRevision + 1,
        updatedAt: now,
        operationId,
      }
      const nextJournal = { ...journal, phase: 'reopen_pending', updatedAt: now }
      stores[GENERATIONS_STORE].put(activeGeneration)
      stores[REPOSITORY_META_STORE].put(nextPointer)
      stores[OPERATION_JOURNAL_STORE].put(nextJournal)
      return { generation: activeGeneration, pointer: nextPointer, journal: nextJournal }
    },
  )

  const completeGenerationActivation = ({ generationId, operationId, now = Date.now() }) =>
    runTransaction(
      [REPOSITORY_META_STORE, GENERATIONS_STORE, OPERATION_JOURNAL_STORE],
      'readwrite',
      async (stores) => {
        const [pointer, generation, journal] = await Promise.all([
          requestResult(stores[REPOSITORY_META_STORE].get('active-generation')),
          requestResult(stores[GENERATIONS_STORE].get(generationId)),
          requestResult(stores[OPERATION_JOURNAL_STORE].get(operationId)),
        ])
        if (
          pointer?.generationId !== generationId ||
          generation?.status !== 'active' ||
          journal?.phase !== 'reopen_pending'
        ) {
          throw new PersistenceRepositoryError('generation_state_conflict', { generationId, operationId })
        }
        const nextJournal = {
          ...journal,
          phase: 'completed',
          updatedAt: now,
          errorCode: '',
          recoveryAction: 'candidate_reopened',
        }
        stores[OPERATION_JOURNAL_STORE].put(nextJournal)
        return { generation, pointer, journal: nextJournal }
      },
    )

  const markGenerationRollbackRequired = ({
    generationId,
    operationId,
    errorCode = 'reopen_failed',
    now = Date.now(),
  }) => runTransaction(
    [GENERATIONS_STORE, OPERATION_JOURNAL_STORE],
    'readwrite',
    async (stores) => {
      const [generation, journal] = await Promise.all([
        requestResult(stores[GENERATIONS_STORE].get(generationId)),
        requestResult(stores[OPERATION_JOURNAL_STORE].get(operationId)),
      ])
      if (!generation || !journal || generation.operationId !== operationId) {
        throw new PersistenceRepositoryError('generation_incomplete', { generationId, operationId })
      }
      const nextGeneration = { ...generation, status: 'rollback_required', updatedAt: now }
      const nextJournal = { ...journal, phase: 'rollback_required', updatedAt: now, errorCode }
      stores[GENERATIONS_STORE].put(nextGeneration)
      stores[OPERATION_JOURNAL_STORE].put(nextJournal)
      return { generation: nextGeneration, journal: nextJournal }
    },
  )

  const rollbackGenerationActivation = ({
    generationId,
    operationId,
    expectedPointerRevision = null,
    now = Date.now(),
  }) => runTransaction(
    [REPOSITORY_META_STORE, GENERATIONS_STORE, OPERATION_JOURNAL_STORE],
    'readwrite',
    async (stores) => {
      const [pointer, candidate, journal] = await Promise.all([
        requestResult(stores[REPOSITORY_META_STORE].get('active-generation')),
        requestResult(stores[GENERATIONS_STORE].get(generationId)),
        requestResult(stores[OPERATION_JOURNAL_STORE].get(operationId)),
      ])
      if (!candidate || !journal || candidate.operationId !== operationId) {
        throw new PersistenceRepositoryError('generation_incomplete', { generationId, operationId })
      }
      if (!['rollback_required', 'activating'].includes(candidate.status)) {
        throw new PersistenceRepositoryError('generation_state_conflict', {
          generationId,
          status: candidate.status,
        })
      }
      const actualPointerRevision = Number(pointer?.pointerRevision || 0)
      if (
        expectedPointerRevision != null &&
        actualPointerRevision !== Number(expectedPointerRevision)
      ) {
        throw new PersistenceRepositoryError('stale_generation', {
          expectedPointerRevision,
          actualPointerRevision,
        })
      }
      const previousGenerationId = journal.previousGenerationId || null
      if (pointer?.generationId === generationId) {
        if (previousGenerationId) {
          const previous = await requestResult(stores[GENERATIONS_STORE].get(previousGenerationId))
          if (!previous || previous.status !== 'superseded') {
            throw new PersistenceRepositoryError('generation_state_conflict', {
              generationId: previousGenerationId,
              status: previous?.status || 'missing',
            })
          }
          stores[GENERATIONS_STORE].put({ ...previous, status: 'active', updatedAt: now })
          stores[REPOSITORY_META_STORE].put({
            ...pointer,
            generationId: previousGenerationId,
            pointerRevision: actualPointerRevision + 1,
            updatedAt: now,
            operationId,
          })
        } else {
          stores[REPOSITORY_META_STORE].delete('active-generation')
        }
      }
      const nextGeneration = { ...candidate, status: 'rolled_back', updatedAt: now }
      const nextJournal = {
        ...journal,
        phase: 'rolled_back',
        updatedAt: now,
        recoveryAction: previousGenerationId ? 'previous_generation_restored' : 'legacy_source_restored',
      }
      stores[GENERATIONS_STORE].put(nextGeneration)
      stores[OPERATION_JOURNAL_STORE].put(nextJournal)
      return { generation: nextGeneration, journal: nextJournal, previousGenerationId }
    },
  )

  const markRecoveryHardFailure = ({
    generationId,
    operationId,
    errorCode = 'rollback_failed',
    now = Date.now(),
  }) => runTransaction(
    [GENERATIONS_STORE, OPERATION_JOURNAL_STORE],
    'readwrite',
    async (stores) => {
      const [generation, journal] = await Promise.all([
        requestResult(stores[GENERATIONS_STORE].get(generationId)),
        requestResult(stores[OPERATION_JOURNAL_STORE].get(operationId)),
      ])
      if (!generation || !journal || generation.operationId !== operationId) {
        throw new PersistenceRepositoryError('generation_incomplete', { generationId, operationId })
      }
      const nextJournal = {
        ...journal,
        phase: 'hard_failure',
        updatedAt: now,
        errorCode,
        recoveryAction: 'manual_recovery_required',
      }
      stores[OPERATION_JOURNAL_STORE].put(nextJournal)
      return { generation, journal: nextJournal }
    },
  )

  const recordPersistentStorageRequest = ({ state, context, attempted, now = Date.now() }) =>
    runTransaction([REPOSITORY_META_STORE], 'readwrite', ({ repository_meta: store }) => {
      const record = {
        key: 'persistent-storage-request',
        state,
        context,
        attempted: attempted === true,
        updatedAt: now,
      }
      store.put(record)
      return record
    })

  const close = () => {
    if (closed) return
    closed = true
    database.close()
  }

  return Object.freeze({
    database,
    stageGeneration,
    getGeneration,
    getRecordVersion,
    getLatestRecordVersion,
    readClassMembership,
    readClassRecords,
    markGenerationVerified,
    abortGeneration,
    beginExternalOperation,
    completeExternalOperation,
    readMeta,
    readActivePointer,
    getOperationJournal,
    listNonterminalJournals,
    listHardFailureJournals,
    prepareGenerationActivation,
    activateGeneration,
    completeGenerationActivation,
    markGenerationRollbackRequired,
    rollbackGenerationActivation,
    markRecoveryHardFailure,
    recordPersistentStorageRequest,
    close,
    stores: Object.freeze({
      recordVersions: RECORD_VERSIONS_STORE,
      generationRecords: GENERATION_RECORDS_STORE,
      generations: GENERATIONS_STORE,
      repositoryMeta: REPOSITORY_META_STORE,
      operationJournal: OPERATION_JOURNAL_STORE,
      writeLeases: WRITE_LEASES_STORE,
    }),
  })
}
