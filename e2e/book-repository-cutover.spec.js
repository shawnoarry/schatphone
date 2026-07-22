import { expect, test } from '@playwright/test'
import { navigateInsideUnlockedApp, unlockToHome } from './helpers/navigation'

const legacySnapshot = {
  assets: [
    {
      id: 'book_cutover_asset',
      title: 'Cutover Source',
      category: 'world_rule',
      assetType: 'world_rule',
      format: 'plain',
      categoryId: '',
      tags: ['cutover'],
      content: 'Legacy content that must survive the Repository cutover.',
      sections: [],
      status: 'draft',
      locked: false,
      favorite: false,
      source: { kind: 'user' },
      version: 1,
      createdAt: 10,
      updatedAt: 20,
    },
  ],
  categories: [],
}

const legacyRaw = JSON.stringify({ version: 1, savedAt: 100, data: legacySnapshot })

const installPersistentStorageMock = async (page) => {
  await page.addInitScript(({ raw }) => {
    localStorage.setItem('schatphone:store:book', raw)
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        persisted: async () => true,
        persist: async () => true,
        estimate: async () => ({ usage: 0, quota: 100 * 1024 * 1024 }),
      },
    })
  }, { raw: legacyRaw })
}

test.describe('Book Repository cutover', () => {
  test.skip(({ browserName }) => browserName !== 'chromium')

  test('upgrades explicitly, reopens from Repository, and stops writing the legacy carrier', async ({ page }) => {
    await installPersistentStorageMock(page)
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/book')

    await expect(page.getByTestId('book-storage-status')).toHaveAttribute('data-storage-mode', 'legacy')
    await expect(page.getByTestId('book-asset-book_cutover_asset')).toContainText('Cutover Source')
    const beforeUpgradeRaw = await page.evaluate(() => localStorage.getItem('schatphone:store:book'))
    expect(beforeUpgradeRaw).toBe(legacyRaw)

    await page.getByTestId('book-storage-upgrade').click()
    await page.locator('.app-dialog-button:not(.app-dialog-button-secondary)').click()
    await expect(page.getByTestId('book-storage-status')).toHaveAttribute('data-storage-mode', 'repository')
    await expect(page.getByTestId('book-import-feedback')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('schatphone:store:book'))).toBe(legacyRaw)

    await page.getByTestId('book-create').click()
    await expect(page.getByTestId('book-detail')).toBeVisible()
    await expect.poll(() => page.evaluate(async () => {
      const repositoryModule = await import('/schatphone/src/lib/persistence-repository.js')
      const adapterModule = await import('/schatphone/src/lib/book-repository-adapter.js')
      const repository = await repositoryModule.createPersistenceRepository()
      const pointer = await repository.readActivePointer()
      const adapter = adapterModule.createBookRepositoryAdapter({ repository })
      const snapshot = await adapter.readSnapshot({ generationId: pointer.generationId })
      repository.close()
      return (snapshot.snapshot?.assets.length || 0) >= 2
    })).toBe(true)
    expect(await page.evaluate(() => localStorage.getItem('schatphone:store:book'))).toBe(legacyRaw)

    await page.reload()
    await unlockToHome(page)
    await navigateInsideUnlockedApp(page, '/book')
    await expect(page.getByTestId('book-storage-status')).toHaveAttribute('data-storage-mode', 'repository')
    await expect(page.getByTestId('book-asset-book_cutover_asset')).toContainText('Cutover Source')
    expect(await page.evaluate(() => localStorage.getItem('schatphone:store:book'))).toBe(legacyRaw)
  })

  test('rolls back the first activation when normal Repository reopen verification fails', async ({ page }) => {
    await page.goto('/')
    const result = await page.evaluate(async ({ raw }) => {
      const databaseName = `book-cutover-rollback-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const repositoryModule = await import('/schatphone/src/lib/persistence-repository.js')
      const adapterModule = await import('/schatphone/src/lib/book-repository-adapter.js')
      const runtimeModule = await import('/schatphone/src/lib/book-repository-runtime.js')
      let repository
      const runtime = runtimeModule.createBookRepositoryRuntime({
        databaseName,
        repositoryFactory: async (options) => {
          repository = await repositoryModule.createPersistenceRepository(options)
          return repository
        },
        adapterFactory: (options) => {
          const adapter = adapterModule.createBookRepositoryAdapter(options)
          return Object.freeze({
            ...adapter,
            reopenSnapshot: async () => ({ ok: false, code: 'injected_reopen_failure' }),
          })
        },
        readRawLayers: async () => ({ localRaw: raw, mirrorRaw: null }),
        policy: {
          inspect: async () => ({ state: 'persistent', capacity: { status: 'available' } }),
          request: async () => ({ state: 'persistent', capacity: { status: 'available' } }),
        },
      })

      const upgraded = await runtime.upgradeFromLegacy({
        persistenceEvidence: { state: 'persistent', capacity: { status: 'available' } },
      })
      const pointer = await repository.readActivePointer()
      const journals = await repository.listNonterminalJournals()
      const transaction = repository.database.transaction('operation_journal', 'readonly')
      const allJournals = await new Promise((resolve, reject) => {
        const request = transaction.objectStore('operation_journal').getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const generationId = allJournals[0]?.candidateGenerationId
      const generation = generationId ? await repository.getGeneration(generationId) : null
      runtime.close()
      const schema = await import('/schatphone/src/lib/persistence-repository-schema.js')
      const deleted = await schema.deletePersistenceRepositoryDatabase({ databaseName })
      return {
        upgraded,
        pointer,
        nonterminalCount: journals.length,
        journalPhase: allJournals[0]?.phase,
        generationStatus: generation?.status,
        deleted,
      }
    }, { raw: legacyRaw })

    expect(result.upgraded).toMatchObject({ ok: false, code: 'reopen_failed', rolledBack: true })
    expect(result.pointer.generationId).toBeNull()
    expect(result.nonterminalCount).toBe(0)
    expect(result.journalPhase).toBe('rolled_back')
    expect(result.generationStatus).toBe('rolled_back')
    expect(result.deleted).toBe(true)
  })

  test('keeps a hard rollback failure read-only instead of reviving legacy writes', async ({ page, isMobile }) => {
    test.skip(isMobile)
    await page.goto('/')
    const result = await page.evaluate(async ({ raw }) => {
      const databaseName = `book-cutover-hard-failure-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const repositoryModule = await import('/schatphone/src/lib/persistence-repository.js')
      const adapterModule = await import('/schatphone/src/lib/book-repository-adapter.js')
      const runtimeModule = await import('/schatphone/src/lib/book-repository-runtime.js')
      let baseRepository
      const runtime = runtimeModule.createBookRepositoryRuntime({
        databaseName,
        repositoryFactory: async (options) => {
          baseRepository = await repositoryModule.createPersistenceRepository(options)
          return {
            ...baseRepository,
            rollbackGenerationActivation: async () => {
              const error = new Error('injected rollback failure')
              error.code = 'injected_rollback_failure'
              throw error
            },
          }
        },
        adapterFactory: (options) => {
          const adapter = adapterModule.createBookRepositoryAdapter(options)
          return Object.freeze({
            ...adapter,
            reopenSnapshot: async () => ({ ok: false, code: 'injected_reopen_failure' }),
          })
        },
        readRawLayers: async () => ({ localRaw: raw, mirrorRaw: null }),
        policy: {
          inspect: async () => ({ state: 'persistent', capacity: { status: 'available' } }),
          request: async () => ({ state: 'persistent', capacity: { status: 'available' } }),
        },
      })
      const upgraded = await runtime.upgradeFromLegacy({
        persistenceEvidence: { state: 'persistent', capacity: { status: 'available' } },
      })
      runtime.close()

      const reopenedRuntime = runtimeModule.createBookRepositoryRuntime({ databaseName })
      const reopened = await reopenedRuntime.initialize()
      reopenedRuntime.close()
      const schema = await import('/schatphone/src/lib/persistence-repository-schema.js')
      const deleted = await schema.deletePersistenceRepositoryDatabase({ databaseName })
      return { upgraded, reopened, deleted }
    }, { raw: legacyRaw })

    expect(result.upgraded).toMatchObject({
      ok: false,
      code: 'injected_rollback_failure',
      recoveryRequired: true,
    })
    expect(result.reopened).toMatchObject({
      ok: false,
      code: 'manual_recovery_required',
      readOnly: true,
      recoveryRequired: true,
    })
    expect(result.deleted).toBe(true)
  })
})
