import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  readPersistedState,
  readPersistedStateAsync,
  writePersistedState,
} from '../lib/persistence'
import {
  CHRONICLE_SCHEMA_VERSION,
  createChronicleEntry,
  normalizeChronicleEntries,
  updateChronicleEntry,
} from '../lib/chronicle'

export const CHRONICLE_STORAGE_KEY = 'store:chronicle'
export const CHRONICLE_STORAGE_VERSION = 1

let entryIdSequence = 0

const clone = (value) => JSON.parse(JSON.stringify(value))

const resolveBackupSource = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {}
  if (snapshot.chronicle && typeof snapshot.chronicle === 'object') return snapshot.chronicle
  return Array.isArray(snapshot.entries) ? snapshot : {}
}

const createStableEntryId = (entries, now) => {
  const existingIds = new Set(entries.map((entry) => entry.id))
  let id = ''
  do {
    entryIdSequence += 1
    id = `chronicle_entry::${Math.max(0, Number(now) || Date.now())}::${entryIdSequence}`
  } while (existingIds.has(id))
  return id
}

export const useChronicleStore = defineStore('chronicle', () => {
  const entries = ref([])
  const hasFinishedStorageHydration = ref(false)

  const orderedEntries = computed(() =>
    [...entries.value].sort(
      (left, right) => right.entryDate.localeCompare(left.entryDate) ||
        right.updatedAt - left.updatedAt ||
        left.id.localeCompare(right.id),
    ),
  )

  const createPersistedSnapshot = () => ({
    schemaVersion: CHRONICLE_SCHEMA_VERSION,
    entries: entries.value.map((entry) => clone(entry)),
  })

  const applyPersistedSource = (source = {}) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false
    entries.value = normalizeChronicleEntries(source.entries)
    return true
  }

  const createBackupSnapshot = () => createPersistedSnapshot()
  const createBackupSnapshotAsync = async () => createBackupSnapshot()
  const restoreFromBackup = (snapshot = {}) => applyPersistedSource(resolveBackupSource(snapshot))

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(CHRONICLE_STORAGE_KEY, {
      version: CHRONICLE_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(CHRONICLE_STORAGE_KEY, {
      version: CHRONICLE_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const persistToStorage = () =>
    writePersistedState(CHRONICLE_STORAGE_KEY, createPersistedSnapshot(), {
      version: CHRONICLE_STORAGE_VERSION,
    })

  const saveNow = () => persistToStorage()

  const commitMutation = (mutate) => {
    const before = createPersistedSnapshot()
    const result = mutate()
    if (result?.ok !== true) return result
    const persistence = persistToStorage()
    if (persistence?.ok === true) return { ...result, persistence }
    applyPersistedSource(before)
    return {
      ...result,
      ok: false,
      code: 'persistence_failed',
      persistence,
      rolledBack: true,
    }
  }

  const findEntryById = (entryId) => {
    const normalizedId = typeof entryId === 'string' ? entryId.trim() : ''
    return normalizedId
      ? entries.value.find((entry) => entry.id === normalizedId) || null
      : null
  }

  const addEntry = (input = {}, { now = Date.now() } = {}) => {
    const entry = createChronicleEntry(input, {
      id: createStableEntryId(entries.value, now),
      now,
    })
    if (!entry) return { ok: false, code: 'chronicle_entry_invalid', entry: null }
    return commitMutation(() => {
      entries.value = normalizeChronicleEntries([...entries.value, entry])
      return { ok: true, code: 'chronicle_entry_created', entry: findEntryById(entry.id) }
    })
  }

  const editEntry = (entryId, updates = {}, { now = Date.now() } = {}) => {
    const current = findEntryById(entryId)
    if (!current) return { ok: false, code: 'chronicle_entry_missing', entry: null }
    const updated = updateChronicleEntry(current, updates, { now })
    if (!updated) return { ok: false, code: 'chronicle_entry_invalid', entry: current }
    return commitMutation(() => {
      entries.value = normalizeChronicleEntries(
        entries.value.map((entry) => (entry.id === current.id ? updated : entry)),
      )
      return { ok: true, code: 'chronicle_entry_updated', entry: findEntryById(current.id) }
    })
  }

  const deleteEntry = (entryId) => {
    const current = findEntryById(entryId)
    if (!current) return { ok: false, code: 'chronicle_entry_missing', entry: null }
    return commitMutation(() => {
      entries.value = entries.value.filter((entry) => entry.id !== current.id)
      return { ok: true, code: 'chronicle_entry_deleted', entry: current }
    })
  }

  const resetForTesting = () => {
    entries.value = []
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) await hydrateFromStorageAsync()
    hasFinishedStorageHydration.value = true
  })()

  return {
    entries,
    orderedEntries,
    hasFinishedStorageHydration,
    findEntryById,
    addEntry,
    editEntry,
    deleteEntry,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    hydrateFromStorageAsync,
    saveNow,
    resetForTesting,
  }
})
