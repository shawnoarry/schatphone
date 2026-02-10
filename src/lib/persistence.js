const STORAGE_NAMESPACE = 'schatphone'

const buildStorageKey = (key) => `${STORAGE_NAMESPACE}:${key}`

const canUseStorage = () => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export const readPersistedState = (key, { version, migrate } = {}) => {
  if (!canUseStorage()) return null

  try {
    const raw = window.localStorage.getItem(buildStorageKey(key))
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    // Backward compatibility: old shape without version envelope.
    if (!Object.prototype.hasOwnProperty.call(parsed, 'data')) {
      return parsed
    }

    const storedVersion = Number(parsed.version ?? 1)
    const storedData = parsed.data

    if (version == null || storedVersion === version) {
      return storedData ?? null
    }

    if (typeof migrate === 'function') {
      return migrate({ version: storedVersion, data: storedData })
    }

    return null
  } catch (error) {
    console.warn(`[persistence] read failed for "${key}"`, error)
    return null
  }
}

export const writePersistedState = (key, data, { version = 1 } = {}) => {
  if (!canUseStorage()) return

  try {
    const payload = JSON.stringify({
      version,
      savedAt: Date.now(),
      data,
    })
    window.localStorage.setItem(buildStorageKey(key), payload)
  } catch (error) {
    console.warn(`[persistence] write failed for "${key}"`, error)
  }
}

export const clearPersistedState = (key) => {
  if (!canUseStorage()) return
  window.localStorage.removeItem(buildStorageKey(key))
}
