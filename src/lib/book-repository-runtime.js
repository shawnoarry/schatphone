import { findBuiltInBookTextAssetById } from './built-in-book-assets'
import {
  BOOK_ASSET_CLASS_ID,
  BOOK_CATEGORY_CLASS_ID,
  createBookRepositoryAdapter,
} from './book-repository-adapter'
import {
  LEGACY_BOOK_STORAGE_KEY,
  createBookLegacyMigration,
  normalizeBookRepositorySnapshot,
} from './book-legacy-migration'
import { readPersistedRawLayers } from './persistence'
import { createPersistenceRepository } from './persistence-repository'
import { canonicalStringify, sha256Canonical } from './persistence-repository-schema'
import { createPersistentStoragePolicy } from './persistent-storage-policy'
import { createWriteCoordinator } from './write-coordinator'
import {
  getCurrentSaveWriteBlock,
  retryCurrentSaveWrite,
} from './current-save-write-runtime'

const BOOK_STORAGE_KEY = 'store:book'

const createId = (prefix, randomUUID, now) =>
  `${prefix}-${randomUUID?.() || `${now()}-${Math.random().toString(16).slice(2)}`}`

const asFailure = (error, fallback = 'carrier_unavailable') => ({
  ok: false,
  code: error?.code || fallback,
  context: error?.context || error?.details || {},
})

const snapshotsMatch = (left, right) =>
  canonicalStringify(normalizeBookRepositorySnapshot(left)) ===
  canonicalStringify(normalizeBookRepositorySnapshot(right))

export const estimateBookRepositoryPeakBytes = (snapshot, sourceBytes = 0) => {
  const canonicalBytes = new TextEncoder().encode(canonicalStringify(snapshot)).byteLength
  return Math.max(1, Number(sourceBytes || 0) + canonicalBytes * 2)
}

export const createBookRepositoryRuntime = (options = {}) => {
  const repositoryFactory = options.repositoryFactory || createPersistenceRepository
  const adapterFactory = options.adapterFactory || createBookRepositoryAdapter
  const migrationFactory = options.migrationFactory || createBookLegacyMigration
  const coordinatorFactory = options.coordinatorFactory || createWriteCoordinator
  const policy = options.policy || createPersistentStoragePolicy(options.policyOptions)
  const readRawLayers = options.readRawLayers || readPersistedRawLayers
  const resolveBuiltInAssetById = options.resolveBuiltInAssetById || findBuiltInBookTextAssetById
  const randomUUID = options.randomUUID || globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
  const now = options.now || (() => Date.now())
  let repository = null
  let adapter = null
  let migration = null
  let coordinator = null
  let activePointer = null
  let closed = false

  const ensureOpen = async () => {
    if (closed) throw new Error('runtime_closed')
    if (repository) return repository
    const repositoryOptions = options.databaseName ? { databaseName: options.databaseName } : {}
    repository = await repositoryFactory(repositoryOptions)
    adapter = adapterFactory({ repository, resolveBuiltInAssetById })
    migration = migrationFactory({ adapter })
    coordinator = coordinatorFactory({
      database: repository.database,
      readActivePointer: () => repository.readActivePointer(),
      recoverNonterminalJournal: () => recoverNonterminalJournals(),
      refreshCurrentSave: () => initialize(),
      ...(options.coordinatorOptions || {}),
    })
    return repository
  }

  const reopenActivePointer = async (pointer) => {
    if (!pointer?.generationId) return { ok: true, code: 'legacy_active', pointer, snapshot: null }
    const read = await adapter.readSnapshot({ generationId: pointer.generationId })
    if (!read.ok || read.generation?.status !== 'active') {
      return { ok: false, code: read.code || 'generation_state_conflict', pointer }
    }
    return {
      ok: true,
      code: 'repository_active',
      pointer,
      snapshot: read.snapshot,
      generation: read.generation,
    }
  }

  async function recoverNonterminalJournals() {
    try {
      await ensureOpen()
      const hardFailures = await repository.listHardFailureJournals()
      if (hardFailures.length > 0) {
        return {
          safe: false,
          ok: false,
          code: 'manual_recovery_required',
          readOnly: true,
          recoveryRequired: true,
        }
      }
      const journals = await repository.listNonterminalJournals()
      for (const journal of journals) {
        const generation = await repository.getGeneration(journal.candidateGenerationId)
        if (!generation) return { safe: false, code: 'generation_incomplete' }
        if (['staging', 'verified'].includes(journal.phase)) {
          await repository.abortGeneration({
            generationId: journal.candidateGenerationId,
            operationId: journal.operationId,
            errorCode: 'startup_inactive_generation',
            now: now(),
          })
          continue
        }

        const pointer = await repository.readActivePointer()
        if (journal.phase === 'reopen_pending' && pointer.generationId === journal.candidateGenerationId) {
          const reopened = await adapter.readSnapshot({ generationId: journal.candidateGenerationId })
          if (reopened.ok && reopened.generation?.status === 'active') {
            await repository.completeGenerationActivation({
              generationId: journal.candidateGenerationId,
              operationId: journal.operationId,
              now: now(),
            })
            continue
          }
        }

        if (journal.phase !== 'rollback_required') {
          await repository.markGenerationRollbackRequired({
            generationId: journal.candidateGenerationId,
            operationId: journal.operationId,
            errorCode: 'startup_recovery',
            now: now(),
          })
        }
        await repository.rollbackGenerationActivation({
          generationId: journal.candidateGenerationId,
          operationId: journal.operationId,
          expectedPointerRevision: pointer.generationId === journal.candidateGenerationId
            ? pointer.pointerRevision
            : null,
          now: now(),
        })
      }
      activePointer = await repository.readActivePointer()
      return { safe: true, code: journals.length ? 'recovered' : 'clean', pointer: activePointer }
    } catch (error) {
      return { safe: false, ...asFailure(error) }
    }
  }

  const initialize = async () => {
    try {
      await ensureOpen()
      const recovery = await recoverNonterminalJournals()
      if (!recovery.safe) return recovery
      activePointer = await repository.readActivePointer()
      const reopened = await reopenActivePointer(activePointer)
      if (!reopened.ok && activePointer.generationId) {
        return { ...reopened, readOnly: true, recoveryRequired: true }
      }
      return reopened
    } catch (error) {
      return asFailure(error)
    }
  }

  const inspectPersistentStorage = async ({ requiredPeakBytes } = {}) => {
    const result = await policy.inspect({
      context: 'book_storage_upgrade',
      requiredPeakBytes,
    })
    try {
      await ensureOpen()
      await repository.recordPersistentStorageRequest({
        state: result.state,
        context: result.lastContext,
        attempted: false,
        now: now(),
      })
    } catch {
      // The policy result remains useful when Repository is unavailable.
    }
    return result
  }

  const requestPersistentStorage = async ({ requiredPeakBytes } = {}) => {
    const result = await policy.request({
      context: 'book_storage_upgrade',
      trigger: { action: 'storage_migration_cutover', estimatedPeakWorkingBytes: requiredPeakBytes },
      userConfirmed: true,
      requiredPeakBytes,
    })
    try {
      await ensureOpen()
      await repository.recordPersistentStorageRequest({
        state: result.state,
        context: result.lastContext,
        attempted: result.attempted,
        now: now(),
      })
    } catch {
      // The caller still receives the browser permission result.
    }
    return result
  }

  const buildRecordRevisions = async (snapshot) => {
    const normalized = normalizeBookRepositorySnapshot(snapshot)
    const entries = [
      ...normalized.assets.map((payload) => ({
        dataClassId: BOOK_ASSET_CLASS_ID,
        recordId: payload.id,
        payload,
        initialRevision: Math.max(1, Number(payload.version || 1)),
      })),
      ...normalized.categories.map((payload) => ({
        dataClassId: BOOK_CATEGORY_CLASS_ID,
        recordId: payload.id,
        payload,
        initialRevision: 1,
      })),
    ]
    const revisions = {}
    for (const entry of entries) {
      const latest = await repository.getLatestRecordVersion({
        ownerId: 'book',
        dataClassId: entry.dataClassId,
        recordId: entry.recordId,
      })
      const digest = await sha256Canonical(entry.payload)
      revisions[`${entry.dataClassId}:${entry.recordId}`] = latest
        ? latest.integrity?.sha256 === digest
          ? latest.revision
          : latest.revision + 1
        : entry.initialRevision
    }
    return revisions
  }

  const activateSnapshot = async ({
    snapshot,
    operationId,
    generationId,
    sourceEvidence = null,
    worldBookSourceLinks = [],
    capacityEvidence = null,
    expectedPointer = null,
  }) => {
    const pointer = expectedPointer || await repository.readActivePointer()
    const retryActivation = () =>
      activateSnapshot({
        snapshot,
        operationId: createId('book-write', randomUUID, now),
        generationId: createId('book-generation', randomUUID, now),
        sourceEvidence,
        worldBookSourceLinks,
        capacityEvidence,
        expectedPointer: pointer,
      })
    const accessBlock = getCurrentSaveWriteBlock()
    if (accessBlock) {
      return {
        ...accessBlock,
        retry: () => retryCurrentSaveWrite(retryActivation),
        refreshCurrentSave: () => initialize(),
      }
    }
    const lease = await coordinator.acquire({
      operationId,
      expectedPointerRevision: pointer.pointerRevision,
      scope: { ownerId: 'book', generationId },
    })
    if (!lease.ok) {
      return {
        ...lease,
        retry: retryActivation,
        refreshCurrentSave: () => initialize(),
      }
    }

    let activated = null
    try {
      const recordRevisions = await buildRecordRevisions(snapshot)
      const staged = await adapter.stageSnapshot({
        operationId,
        generationId,
        parentGenerationId: pointer.generationId,
        snapshot,
        sourceEvidence,
        capacityEvidence,
        recordRevisions,
      })
      if (!staged.ok) return staged

      const verified = await adapter.verifyGeneration({
        generationId,
        expected: { snapshot, worldBookSourceLinks },
      })
      if (!verified.ok) {
        await adapter.abortGeneration({ operationId, generationId, errorCode: verified.code })
        return verified
      }

      await repository.prepareGenerationActivation({
        generationId,
        operationId,
        expectedPointerRevision: pointer.pointerRevision,
        now: now(),
      })
      const commitCheck = getCurrentSaveWriteBlock() || await lease.verifyBeforeCommit()
      if (!commitCheck.ok) {
        await repository.markGenerationRollbackRequired({
          generationId,
          operationId,
          errorCode: commitCheck.code,
          now: now(),
        })
        await repository.rollbackGenerationActivation({ generationId, operationId, now: now() })
        return { ...commitCheck, ok: false, readOnly: true }
      }

      activated = await repository.activateGeneration({
        generationId,
        operationId,
        expectedPointerRevision: pointer.pointerRevision,
        now: now(),
      })
      const reopened = await adapter.reopenSnapshot({
        generationId,
        expected: { snapshot, worldBookSourceLinks },
      })
      if (!reopened.ok || !snapshotsMatch(reopened.snapshot, snapshot)) {
        await repository.markGenerationRollbackRequired({
          generationId,
          operationId,
          errorCode: reopened.code || 'reopen_failed',
          now: now(),
        })
        await repository.rollbackGenerationActivation({
          generationId,
          operationId,
          expectedPointerRevision: activated.pointer.pointerRevision,
          now: now(),
        })
        activePointer = await repository.readActivePointer()
        return { ok: false, code: 'reopen_failed', rolledBack: true, pointer: activePointer }
      }

      await repository.completeGenerationActivation({ generationId, operationId, now: now() })
      activePointer = activated.pointer
      return {
        ok: true,
        code: pointer.generationId ? 'repository_snapshot_saved' : 'book_storage_upgraded',
        pointer: activePointer,
        snapshot: reopened.snapshot,
        referenceReport: reopened.referenceReport,
      }
    } catch (error) {
      if (activated?.pointer) {
        try {
          await repository.markGenerationRollbackRequired({
            generationId,
            operationId,
            errorCode: error?.code || 'reopen_failed',
            now: now(),
          })
          await repository.rollbackGenerationActivation({
            generationId,
            operationId,
            expectedPointerRevision: activated.pointer.pointerRevision,
            now: now(),
          })
          activePointer = await repository.readActivePointer()
          return { ...asFailure(error), rolledBack: true, pointer: activePointer }
        } catch (rollbackError) {
          await repository.markRecoveryHardFailure({
            generationId,
            operationId,
            errorCode: rollbackError?.code || 'rollback_failed',
            now: now(),
          }).catch(() => {})
          return { ...asFailure(rollbackError, 'rollback_failed'), recoveryRequired: true }
        }
      }
      try {
        const generation = await repository.getGeneration(generationId)
        if (['staging', 'verified'].includes(generation?.status)) {
          await adapter.abortGeneration({
            operationId,
            generationId,
            errorCode: error?.code || 'activation_failed',
          })
        } else if (generation?.status === 'activating') {
          await repository.markGenerationRollbackRequired({
            generationId,
            operationId,
            errorCode: error?.code || 'activation_failed',
            now: now(),
          })
          await repository.rollbackGenerationActivation({ generationId, operationId, now: now() })
        }
      } catch {
        // Startup recovery will retain and resolve any nonterminal journal.
      }
      return asFailure(error)
    } finally {
      await lease.release().catch(() => {})
    }
  }

  const upgradeFromLegacy = async ({
    worldBookSourceLinks = [],
    persistenceEvidence = null,
    allowBestEffort = false,
    allowRecoveryCandidate = false,
  } = {}) => {
    try {
      await ensureOpen()
      const recovery = await recoverNonterminalJournals()
      if (!recovery.safe) return recovery
      const pointer = await repository.readActivePointer()
      if (pointer.generationId) return { ok: true, code: 'already_upgraded', pointer }

      const layers = await readRawLayers(BOOK_STORAGE_KEY)
      const inspection = await migration.inspectLegacySource({
        localRaw: layers.localRaw,
        mirrorRaw: layers.mirrorRaw,
      })
      if (!inspection.ok && inspection.code !== 'legacy_recovery_candidate') return inspection
      if (inspection.code === 'legacy_recovery_candidate' && !allowRecoveryCandidate) return inspection

      const selectedSourceKind = inspection.selectedSourceKind || inspection.recoveryCandidate
      const selectedSource = inspection[selectedSourceKind]
      const requiredPeakBytes = estimateBookRepositoryPeakBytes(
        selectedSource.decoded,
        selectedSource.rawBytes,
      )
      const persistence = persistenceEvidence || await inspectPersistentStorage({ requiredPeakBytes })
      if (persistence.capacity?.status === 'insufficient') {
        return { ok: false, code: 'quota_insufficient', persistence, requiredPeakBytes }
      }
      if (persistence.capacity?.status === 'unknown') {
        return { ok: false, code: 'capacity_unknown', persistence, requiredPeakBytes }
      }
      if (persistence.state !== 'persistent' && !allowBestEffort) {
        return {
          ok: false,
          code: `persistent_storage_${persistence.state}`,
          persistence,
          requiredPeakBytes,
        }
      }

      const normalized = await migration.normalizeLegacySnapshot({
        sourceKind: selectedSourceKind,
        raw: selectedSource.raw,
      })
      const sourceEvidence = {
        sourceKind: selectedSourceKind,
        storageKey: LEGACY_BOOK_STORAGE_KEY,
        rawDigest: normalized.sourceDigest,
        rawBytes: normalized.sourceBytes,
        envelopeVersion: normalized.envelopeVersion,
        recoveryCandidate: inspection.recoveryCandidate === selectedSourceKind,
        mirrorDrift: inspection.mirrorDrift,
      }
      return activateSnapshot({
        snapshot: normalized.snapshot,
        operationId: createId('book-cutover', randomUUID, now),
        generationId: createId('book-generation', randomUUID, now),
        sourceEvidence,
        worldBookSourceLinks,
        capacityEvidence: persistence.capacity?.status === 'available'
          ? persistence.capacity
          : null,
      })
    } catch (error) {
      return asFailure(error)
    }
  }

  const persistSnapshot = async ({ snapshot, worldBookSourceLinks = [] } = {}) => {
    try {
      await ensureOpen()
      const pointer = await repository.readActivePointer()
      if (!pointer.generationId) {
        return {
          ok: false,
          code: 'repository_not_active',
          readOnly: true,
          retry: () => persistSnapshot({ snapshot, worldBookSourceLinks }),
          refreshCurrentSave: () => initialize(),
        }
      }
      const result = await activateSnapshot({
        snapshot,
        operationId: createId('book-write', randomUUID, now),
        generationId: createId('book-generation', randomUUID, now),
        worldBookSourceLinks,
      })
      if (result.ok || result.recoveryRequired || result.retry) return result
      return {
        ...result,
        readOnly: true,
        retry: () => persistSnapshot({ snapshot, worldBookSourceLinks }),
        refreshCurrentSave: () => initialize(),
      }
    } catch (error) {
      return {
        ...asFailure(error),
        readOnly: true,
        retry: () => persistSnapshot({ snapshot, worldBookSourceLinks }),
        refreshCurrentSave: () => initialize(),
      }
    }
  }

  const close = () => {
    if (closed) return
    closed = true
    coordinator?.close()
    repository?.close()
  }

  return Object.freeze({
    initialize,
    inspectPersistentStorage,
    requestPersistentStorage,
    upgradeFromLegacy,
    persistSnapshot,
    recoverNonterminalJournals,
    getActivePointer: () => activePointer,
    close,
  })
}
