import { useAssetsStore } from '../stores/assets'
import { useBookStore } from '../stores/book'
import { useCalendarStore } from '../stores/calendar'
import { useChatStore } from '../stores/chat'
import { useFilesStore } from '../stores/files'
import { useFoodDeliveryStore } from '../stores/foodDelivery'
import { useGalleryStore } from '../stores/gallery'
import { useImageGenerationStore } from '../stores/imageGeneration'
import { useMapStore } from '../stores/map'
import { usePhoneStore } from '../stores/phone'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'
import { useRemindersStore } from '../stores/reminders'
import { useShoppingStore } from '../stores/shopping'
import { useSimulationStore } from '../stores/simulation'
import { useStockStore } from '../stores/stock'
import { useSystemStore } from '../stores/system'
import { useWalletStore } from '../stores/wallet'
import {
  completeBackupRestoreCheckpoint,
  listPendingBackupRestoreCheckpoints,
  markBackupRestoreCheckpointHardFailure,
} from './backup-restore-checkpoint'
import { createPersistenceRepository } from './persistence-repository'
import { reportPersistenceWriteResult } from './persistence-runtime-status'

export const createBackupRestoreStoreSet = (pinia) => ({
  system: useSystemStore(pinia),
  chat: useChatStore(pinia),
  map: useMapStore(pinia),
  calendar: useCalendarStore(pinia),
  reminders: useRemindersStore(pinia),
  gallery: useGalleryStore(pinia),
  files: useFilesStore(pinia),
  book: useBookStore(pinia),
  shopping: useShoppingStore(pinia),
  foodDelivery: useFoodDeliveryStore(pinia),
  simulation: useSimulationStore(pinia),
  assets: useAssetsStore(pinia),
  wallet: useWalletStore(pinia),
  phone: usePhoneStore(pinia),
  stock: useStockStore(pinia),
  relationshipRuntime: useRelationshipRuntimeStore(pinia),
  imageGeneration: useImageGenerationStore(pinia),
})

export const saveBackupRestoreStores = async (stores) => {
  const entries = Object.entries(stores || {})
  const results = []
  for (const [owner, store] of entries) {
    try {
      const result = await Promise.resolve(store.saveNow())
      results.push({ owner, ok: result?.ok !== false, result })
    } catch (error) {
      results.push({ owner, ok: false, error })
    }
  }
  return { ok: results.every((entry) => entry.ok), results }
}

export const restoreBackupRollbackSnapshot = async (stores, snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') {
    return { ok: false, exact: false, storesToSave: [], results: [] }
  }
  const operations = [
    ['system', snapshot.system],
    ['chat', snapshot.chat],
    ['map', snapshot.map],
    ['calendar', snapshot.calendar],
    ['reminders', snapshot.reminders],
    ['gallery', snapshot.gallery],
    ['files', snapshot.files],
    ['book', snapshot.book],
    ['shopping', snapshot.shopping],
    ['foodDelivery', snapshot.foodDelivery],
    ['simulation', snapshot.simulation],
    ['assets', snapshot.assets],
    ['wallet', snapshot.wallet],
    ['phone', snapshot.phone],
    ['stock', snapshot.stock],
    ['relationshipRuntime', snapshot.relationshipRuntime],
    ['imageGeneration', snapshot.imageGeneration],
  ]
  const results = []

  for (const [owner, ownerSnapshot] of operations) {
    const store = stores?.[owner]
    if (!store) {
      results.push({ owner, ok: false, exact: false })
      continue
    }
    try {
      const restored = owner === 'gallery'
        ? await store.restoreFromBackupAsync(ownerSnapshot, {
            restoreAssetPackage: true,
            preserveCurrentOnlyAssets: false,
            requireCompleteAssetPackage: true,
          })
        : await Promise.resolve(store.restoreFromBackup(ownerSnapshot))
      const restoredOk = owner === 'gallery' ? restored?.ok === true : restored !== false
      if (restoredOk) {
        results.push({ owner, ok: true, exact: true, store })
        continue
      }
      if (owner === 'book' && typeof store.refreshBookStorage === 'function') {
        const refreshed = await store.refreshBookStorage()
        if (refreshed?.ok) {
          results.push({ owner, ok: true, exact: false, refreshed: true, store })
          continue
        }
      }
      results.push({ owner, ok: false, exact: false, store })
    } catch (error) {
      results.push({ owner, ok: false, exact: false, error, store })
    }
  }

  return {
    ok: results.every((result) => result.ok),
    exact: results.every((result) => result.ok && result.exact),
    refreshedOwners: results.filter((result) => result.refreshed).map((result) => result.owner),
    storesToSave: results.filter((result) => result.ok && result.exact).map((result) => result.store),
    results,
  }
}

export const recoverPendingBackupRestores = async ({ pinia, repository: providedRepository } = {}) => {
  if (typeof indexedDB === 'undefined' && !providedRepository) {
    return { ok: true, recovered: 0, skipped: true }
  }
  let repository = providedRepository || null
  if (!repository) {
    try {
      repository = await createPersistenceRepository()
    } catch (error) {
      return {
        ok: false,
        recovered: 0,
        code: error?.code || 'RECOVERY_CHECK_UNAVAILABLE',
      }
    }
  }
  try {
    const listed = await listPendingBackupRestoreCheckpoints({ repository })
    if (!listed.ok || listed.pending.length === 0) return { ok: true, recovered: 0 }
    let stores = null
    let recovered = 0

    for (const pending of listed.pending) {
      const checkpoint = { ...pending, repository, ownsRepository: false }
      if (['staging', 'verified'].includes(pending.phase)) {
        await repository.abortGeneration({
          generationId: pending.generationId,
          operationId: pending.operationId,
          errorCode: 'startup_before_restore_mutation',
        })
        recovered += 1
        continue
      }
      if (!pending.snapshot) {
        await markBackupRestoreCheckpointHardFailure(checkpoint, 'rollback_snapshot_missing')
        return { ok: false, recovered, code: 'ROLLBACK_FAILED' }
      }
      stores ||= createBackupRestoreStoreSet(pinia)
      const restored = await restoreBackupRollbackSnapshot(stores, pending.snapshot)
      const saved = restored.ok
        ? await saveBackupRestoreStores(
            Object.fromEntries(
              restored.storesToSave.map((store) => [
                Object.keys(stores).find((key) => stores[key] === store),
                store,
              ]),
            ),
          )
        : { ok: false }
      if (!restored.ok || !saved.ok) {
        await markBackupRestoreCheckpointHardFailure(checkpoint, 'rollback_failed')
        reportPersistenceWriteResult({
          key: 'backup-restore-recovery',
          result: {
            ok: false,
            error: 'rollback_failed',
            carrier: 'recovery',
            retryable: false,
            attempted: true,
          },
        })
        return { ok: false, recovered, code: 'ROLLBACK_FAILED' }
      }
      await completeBackupRestoreCheckpoint(checkpoint, {
        recoveryAction: 'crash_recovery_previous_save_restored',
      })
      recovered += 1
    }

    return { ok: true, recovered }
  } catch (error) {
    return {
      ok: false,
      recovered: 0,
      code: error?.code || 'RECOVERY_CHECK_UNAVAILABLE',
    }
  } finally {
    if (!providedRepository) repository.close()
  }
}
