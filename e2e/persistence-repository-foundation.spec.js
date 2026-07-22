import { expect, test } from '@playwright/test'

const uniqueDatabaseName = (label) =>
  `schatphone-repository-test-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`

test.describe('persistence repository browser foundation', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile)

  test('creates the exact schema and preserves commit, abort, reopen, drift, and cleanup semantics', async ({ page }) => {
    const databaseName = uniqueDatabaseName('schema')
    const driftDatabaseName = uniqueDatabaseName('drift')
    await page.goto('/')

    try {
      const opened = await page.evaluate(async ({ databaseName: name }) => {
        const schema = await import('/schatphone/src/lib/persistence-repository-schema.js')
        const repositoryModule = await import('/schatphone/src/lib/persistence-repository.js')
        const bookModule = await import('/schatphone/src/lib/book-repository-adapter.js')
        const repository = await repositoryModule.createPersistenceRepository({ databaseName: name })
        window.__foundationRepository = repository
        window.__foundationSchema = schema
        const inspection = schema.inspectPersistenceRepositorySchema(repository.database)
        const schemaMeta = await repository.readMeta('repository-schema')
        const activeGeneration = await repository.readMeta('active-generation')

        const adapter = bookModule.createBookRepositoryAdapter({ repository })
        const snapshot = {
          assets: [{
            id: 'browser_asset',
            title: 'Browser Asset',
            category: 'world_rule',
            format: 'plain',
            content: 'Browser-backed content.',
            status: 'draft',
            version: 1,
            createdAt: 10,
            updatedAt: 20,
          }],
          categories: [],
        }
        const staged = await adapter.stageSnapshot({
          operationId: 'browser-stage-operation',
          generationId: 'browser-stage-generation',
          snapshot,
        })
        const verified = await adapter.verifyGeneration({
          generationId: 'browser-stage-generation',
          expected: { snapshot },
        })
        const conflictingStage = await adapter.stageSnapshot({
          operationId: 'browser-conflict-operation',
          generationId: 'browser-conflict-generation',
          snapshot: {
            assets: [
              {
                id: 'first_record_must_rollback',
                title: 'First record',
                category: 'world_rule',
                content: 'This write must roll back with the transaction.',
                status: 'draft',
                version: 1,
                createdAt: 10,
                updatedAt: 30,
              },
              {
                ...snapshot.assets[0],
                content: 'A different payload under the same immutable revision.',
              },
            ],
            categories: [],
          },
        })
        const partialGeneration = await repository.getGeneration('browser-conflict-generation')
        const partialRecord = await repository.getRecordVersion({
          ownerId: 'book',
          dataClassId: 'book.asset',
          recordId: 'first_record_must_rollback',
          revision: 1,
        })
        return {
          inspection,
          schemaMeta,
          activeGeneration,
          staged: { ok: staged.ok, code: staged.code },
          verified: {
            ok: verified.ok,
            code: verified.code,
            status: verified.generation?.status,
            assetIds: verified.snapshot?.assets.map((asset) => asset.id),
          },
          failureInjection: {
            code: conflictingStage.code,
            partialGeneration: partialGeneration || null,
            partialRecord: partialRecord || null,
          },
        }
      }, { databaseName })

      expect(opened.inspection.ok).toBe(true)
      expect(opened.inspection.actual).toEqual(opened.inspection.expected)
      expect(opened.inspection.actual.map((entry) => entry.name)).toEqual([
        'generation_records',
        'generations',
        'operation_journal',
        'record_versions',
        'repository_meta',
        'write_leases',
      ])
      expect(opened.schemaMeta).toMatchObject({
        key: 'repository-schema',
        databaseVersion: 1,
        contractVersion: 1,
        inventoryVersion: 2,
      })
      expect(opened.activeGeneration).toBeUndefined()
      expect(opened.staged).toEqual({ ok: true, code: 'staged' })
      expect(opened.verified).toEqual({
        ok: true,
        code: 'generation_verified',
        status: 'verified',
        assetIds: ['browser_asset'],
      })
      expect(opened.failureInjection).toEqual({
        code: 'revision_digest_conflict',
        partialGeneration: null,
        partialRecord: null,
      })

      const transactionEvidence = await page.evaluate(async () => {
        const database = window.__foundationRepository.database
        const waitForTransaction = (transaction) =>
          new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve('committed')
            transaction.onabort = () => reject(transaction.error || new Error('aborted'))
            transaction.onerror = () => reject(transaction.error || new Error('failed'))
          })
        const requestValue = (request) =>
          new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })

        const committedTransaction = database.transaction('generations', 'readwrite')
        const committedDone = waitForTransaction(committedTransaction)
        committedTransaction.objectStore('generations').put({
          generationId: 'transaction-committed',
          operationId: 'transaction-committed-operation',
          status: 'staging',
          updatedAt: 1,
        })
        await committedDone

        const abortedTransaction = database.transaction('generations', 'readwrite')
        const abortedDone = waitForTransaction(abortedTransaction).catch(() => 'aborted')
        abortedTransaction.objectStore('generations').put({
          generationId: 'transaction-aborted',
          operationId: 'transaction-aborted-operation',
          status: 'staging',
          updatedAt: 2,
        })
        abortedTransaction.abort()
        const abortState = await abortedDone

        const readTransaction = database.transaction('generations', 'readonly')
        const store = readTransaction.objectStore('generations')
        const committed = await requestValue(store.get('transaction-committed'))
        const aborted = await requestValue(store.get('transaction-aborted'))
        return {
          committedId: committed?.generationId,
          abortedId: aborted?.generationId || null,
          abortState,
        }
      })
      expect(transactionEvidence).toEqual({
        committedId: 'transaction-committed',
        abortedId: null,
        abortState: 'aborted',
      })

      const reopened = await page.evaluate(async ({ databaseName: name }) => {
        window.__foundationRepository.close()
        const repositoryModule = await import('/schatphone/src/lib/persistence-repository.js')
        const repository = await repositoryModule.createPersistenceRepository({ databaseName: name })
        window.__foundationRepository = repository
        const generation = await repository.getGeneration('browser-stage-generation')
        const committed = await repository.getGeneration('transaction-committed')
        const activeGeneration = await repository.readMeta('active-generation')
        return {
          generationStatus: generation?.status,
          committedId: committed?.generationId,
          activeGeneration,
        }
      }, { databaseName })
      expect(reopened).toEqual({
        generationStatus: 'verified',
        committedId: 'transaction-committed',
        activeGeneration: undefined,
      })

      const driftCode = await page.evaluate(async ({ driftDatabaseName: name }) => {
        const createRequest = indexedDB.open(name, 1)
        await new Promise((resolve, reject) => {
          createRequest.onupgradeneeded = () => {
            createRequest.result.createObjectStore('wrong_store', { keyPath: 'wrong' })
          }
          createRequest.onsuccess = () => {
            createRequest.result.close()
            resolve()
          }
          createRequest.onerror = () => reject(createRequest.error)
        })
        const schema = await import('/schatphone/src/lib/persistence-repository-schema.js')
        try {
          await schema.openPersistenceRepositoryDatabase({ databaseName: name })
          return 'unexpected_success'
        } catch (error) {
          return error.code
        }
      }, { driftDatabaseName })
      expect(driftCode).toBe('schema_drift')
    } finally {
      const cleanup = await page.evaluate(async ({ databaseName: name, driftDatabaseName: driftName }) => {
        window.__foundationRepository?.close()
        const schema = await import('/schatphone/src/lib/persistence-repository-schema.js')
        const deleted = await schema.deletePersistenceRepositoryDatabase({ databaseName: name })
        const driftDeleted = await schema.deletePersistenceRepositoryDatabase({ databaseName: driftName })
        return { deleted, driftDeleted }
      }, { databaseName, driftDatabaseName })
      expect(cleanup).toEqual({ deleted: true, driftDeleted: true })
    }
  })

  test('coordinates two same-context pages with Web Locks and bounded BroadcastChannel metadata', async ({ page, context }) => {
    const secondPage = await context.newPage()
    await Promise.all([page.goto('/'), secondPage.goto('/')])
    try {
      await secondPage.evaluate(async () => {
        window.__webLockMessages = []
        window.__webLockObserver = new BroadcastChannel('schatphone-repository-write')
        window.__webLockObserver.onmessage = (event) => window.__webLockMessages.push(event.data)
        const module = await import('/schatphone/src/lib/write-coordinator.js')
        window.__webLockCoordinator = module.createWriteCoordinator({
          ownerId: 'web-lock-page-two',
          waitTimeoutMs: 30,
          pollIntervalMs: 2,
          refreshCurrentSave: async () => ({ ok: true, refreshed: true }),
        })
      })
      const firstLease = await page.evaluate(async () => {
        const module = await import('/schatphone/src/lib/write-coordinator.js')
        window.__webLockCoordinator = module.createWriteCoordinator({
          ownerId: 'web-lock-page-one',
          waitTimeoutMs: 30,
          pollIntervalMs: 2,
        })
        window.__webLockLease = await window.__webLockCoordinator.acquire({
          operationId: 'web-lock-operation-one',
        })
        return {
          ok: window.__webLockLease.ok,
          adapter: window.__webLockLease.adapter,
          ownerId: window.__webLockLease.ownerId,
        }
      })
      expect(firstLease).toEqual({ ok: true, adapter: 'web_locks', ownerId: 'web-lock-page-one' })
      await secondPage.waitForFunction(() =>
        window.__webLockMessages.some((message) => message.type === 'acquired'),
      )

      const conflict = await secondPage.evaluate(async () => {
        window.__webLockConflict = await window.__webLockCoordinator.acquire({
          operationId: 'web-lock-operation-two',
        })
        return {
          ok: window.__webLockConflict.ok,
          code: window.__webLockConflict.code,
          cause: window.__webLockConflict.cause,
          actions: window.__webLockConflict.availableActions,
          hasForceTakeover: 'forceTakeover' in window.__webLockConflict,
          refresh: await window.__webLockConflict.refreshCurrentSave(),
        }
      })
      expect(conflict).toEqual({
        ok: false,
        code: 'read_only_conflict',
        cause: 'timed_out',
        actions: ['retry', 'refresh_current_save'],
        hasForceTakeover: false,
        refresh: { ok: true, refreshed: true },
      })

      await page.evaluate(() => window.__webLockLease.release())
      const retried = await secondPage.evaluate(async () => {
        window.__webLockLease = await window.__webLockConflict.retry()
        return {
          ok: window.__webLockLease.ok,
          adapter: window.__webLockLease.adapter,
          ownerId: window.__webLockLease.ownerId,
        }
      })
      expect(retried).toEqual({ ok: true, adapter: 'web_locks', ownerId: 'web-lock-page-two' })
      await secondPage.waitForFunction(() =>
        window.__webLockMessages.filter((message) => message.type === 'acquired').length >= 2,
      )
      const messageKeys = await secondPage.evaluate(() =>
        window.__webLockMessages.map((message) => Object.keys(message).sort()),
      )
      for (const keys of messageKeys) {
        expect(keys).toEqual([
          'at',
          'fencingToken',
          'operationId',
          'ownerId',
          'scopeKey',
          'type',
        ])
      }
    } finally {
      await Promise.all([
        page.evaluate(async () => {
          await window.__webLockLease?.release?.()
          window.__webLockCoordinator?.close()
        }),
        secondPage.evaluate(async () => {
          await window.__webLockLease?.release?.()
          window.__webLockCoordinator?.close()
          window.__webLockObserver?.close()
        }),
      ])
      await secondPage.close()
    }
  })

  test('uses a real IndexedDB fallback lease with timeout, retry, fencing, and crash recovery', async ({ page, context }) => {
    const databaseName = uniqueDatabaseName('fallback')
    const secondPage = await context.newPage()
    await Promise.all([page.goto('/'), secondPage.goto('/')])
    try {
      await Promise.all([
        page.evaluate(async ({ databaseName: name }) => {
          const repositoryModule = await import('/schatphone/src/lib/persistence-repository.js')
          const coordinatorModule = await import('/schatphone/src/lib/write-coordinator.js')
          window.__fallbackRecoveryCount = 0
          window.__fallbackRepository = await repositoryModule.createPersistenceRepository({ databaseName: name })
          window.__fallbackCoordinator = coordinatorModule.createWriteCoordinator({
            database: window.__fallbackRepository.database,
            forceIndexedDbFallback: true,
            ownerId: 'fallback-page-one',
            waitTimeoutMs: 30,
            leaseDurationMs: 1000,
            heartbeatMs: 100,
            pollIntervalMs: 2,
            recoverNonterminalJournal: async () => {
              window.__fallbackRecoveryCount += 1
              return { safe: true }
            },
          })
        }, { databaseName }),
        secondPage.evaluate(async ({ databaseName: name }) => {
          const repositoryModule = await import('/schatphone/src/lib/persistence-repository.js')
          const coordinatorModule = await import('/schatphone/src/lib/write-coordinator.js')
          window.__fallbackRepository = await repositoryModule.createPersistenceRepository({ databaseName: name })
          window.__fallbackCoordinator = coordinatorModule.createWriteCoordinator({
            database: window.__fallbackRepository.database,
            forceIndexedDbFallback: true,
            ownerId: 'fallback-page-two',
            waitTimeoutMs: 30,
            leaseDurationMs: 1000,
            heartbeatMs: 100,
            pollIntervalMs: 2,
            recoverNonterminalJournal: async () => ({ safe: true }),
            refreshCurrentSave: async () => ({ ok: true, refreshed: true }),
          })
        }, { databaseName }),
      ])

      const first = await page.evaluate(async () => {
        window.__fallbackLease = await window.__fallbackCoordinator.acquire({
          operationId: 'fallback-operation-one',
        })
        return {
          ok: window.__fallbackLease.ok,
          adapter: window.__fallbackLease.adapter,
          fencingToken: window.__fallbackLease.fencingToken,
        }
      })
      expect(first).toEqual({ ok: true, adapter: 'indexeddb_lease', fencingToken: 1 })

      const conflict = await secondPage.evaluate(async () => {
        window.__fallbackConflict = await window.__fallbackCoordinator.acquire({
          operationId: 'fallback-operation-two',
        })
        return {
          ok: window.__fallbackConflict.ok,
          code: window.__fallbackConflict.code,
          actions: window.__fallbackConflict.availableActions,
          hasForceTakeover: 'forceTakeover' in window.__fallbackConflict,
          refresh: await window.__fallbackConflict.refreshCurrentSave(),
        }
      })
      expect(conflict).toEqual({
        ok: false,
        code: 'read_only_conflict',
        actions: ['retry', 'refresh_current_save'],
        hasForceTakeover: false,
        refresh: { ok: true, refreshed: true },
      })

      await page.evaluate(() => window.__fallbackLease.release())
      const retried = await secondPage.evaluate(async () => {
        window.__fallbackLease = await window.__fallbackConflict.retry()
        return {
          ok: window.__fallbackLease.ok,
          fencingToken: window.__fallbackLease.fencingToken,
        }
      })
      expect(retried).toEqual({ ok: true, fencingToken: 2 })

      await secondPage.evaluate(async () => {
        const database = window.__fallbackRepository.database
        const transaction = database.transaction('write_leases', 'readwrite')
        const store = transaction.objectStore('write_leases')
        const request = store.get('repository-write')
        request.onsuccess = () => {
          const current = request.result
          store.put({ ...current, expiresAt: Date.now() - 1 })
        }
        await new Promise((resolve, reject) => {
          transaction.oncomplete = resolve
          transaction.onabort = () => reject(transaction.error)
          transaction.onerror = () => reject(transaction.error)
        })
      })

      const recovered = await page.evaluate(async () => {
        const module = await import('/schatphone/src/lib/write-coordinator.js')
        window.__fallbackCoordinator.close()
        window.__fallbackCoordinator = module.createWriteCoordinator({
          database: window.__fallbackRepository.database,
          forceIndexedDbFallback: true,
          ownerId: 'fallback-recovery-page',
          waitTimeoutMs: 30,
          leaseDurationMs: 1000,
          pollIntervalMs: 2,
          recoverNonterminalJournal: async () => {
            window.__fallbackRecoveryCount += 1
            return { safe: true }
          },
        })
        window.__fallbackLease = await window.__fallbackCoordinator.acquire({
          operationId: 'fallback-recovery-operation',
        })
        return {
          ok: window.__fallbackLease.ok,
          fencingToken: window.__fallbackLease.fencingToken,
          recoveryCount: window.__fallbackRecoveryCount,
        }
      })
      expect(recovered).toEqual({ ok: true, fencingToken: 3, recoveryCount: 1 })

      const staleHeartbeat = await secondPage.evaluate(() => window.__fallbackLease.heartbeat())
      expect(staleHeartbeat).toEqual({ ok: false, code: 'lease_lost' })
    } finally {
      await Promise.all([
        page.evaluate(async () => {
          await window.__fallbackLease?.release?.()
          window.__fallbackCoordinator?.close()
          window.__fallbackRepository?.close()
        }),
        secondPage.evaluate(async () => {
          window.__fallbackCoordinator?.close()
          window.__fallbackRepository?.close()
        }),
      ])
      const deleted = await page.evaluate(async ({ databaseName: name }) => {
        const schema = await import('/schatphone/src/lib/persistence-repository-schema.js')
        return schema.deletePersistenceRepositoryDatabase({ databaseName: name })
      }, { databaseName })
      expect(deleted).toBe(true)
      await secondPage.close()
    }
  })
})
