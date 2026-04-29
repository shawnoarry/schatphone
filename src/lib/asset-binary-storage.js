const GALLERY_ASSET_DB_NAME = 'schatphone-gallery-assets'
const GALLERY_ASSET_DB_STORE = 'blobs'
const GALLERY_ASSET_DB_VERSION = 1

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'

let galleryDbOpenPromise = null
let galleryDbUnavailable = false
const memoryBlobFallback = new Map()

const openGalleryDb = async () => {
  if (!canUseIndexedDb() || galleryDbUnavailable) return null
  if (galleryDbOpenPromise) return galleryDbOpenPromise

  galleryDbOpenPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(GALLERY_ASSET_DB_NAME, GALLERY_ASSET_DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(GALLERY_ASSET_DB_STORE)) {
          db.createObjectStore(GALLERY_ASSET_DB_STORE, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => db.close()
        resolve(db)
      }

      request.onerror = () => {
        galleryDbUnavailable = true
        resolve(null)
      }

      request.onblocked = () => {
        // Keep this non-fatal and fallback to memory if blocked.
        resolve(null)
      }
    } catch {
      galleryDbUnavailable = true
      resolve(null)
    }
  })

  return galleryDbOpenPromise
}

const writeBlobToIndexedDb = async (assetId, blob) => {
  const db = await openGalleryDb()
  if (!db) return false

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(GALLERY_ASSET_DB_STORE, 'readwrite')
      const store = tx.objectStore(GALLERY_ASSET_DB_STORE)
      store.put({
        id: assetId,
        blob,
        updatedAt: Date.now(),
      })
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
      tx.onabort = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

const readBlobFromIndexedDb = async (assetId) => {
  const db = await openGalleryDb()
  if (!db) return null

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(GALLERY_ASSET_DB_STORE, 'readonly')
      const store = tx.objectStore(GALLERY_ASSET_DB_STORE)
      const request = store.get(assetId)
      request.onsuccess = () => {
        const item = request.result
        resolve(item?.blob instanceof Blob ? item.blob : null)
      }
      request.onerror = () => resolve(null)
      tx.onabort = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

const deleteBlobFromIndexedDb = async (assetId) => {
  const db = await openGalleryDb()
  if (!db) return false

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(GALLERY_ASSET_DB_STORE, 'readwrite')
      const store = tx.objectStore(GALLERY_ASSET_DB_STORE)
      store.delete(assetId)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
      tx.onabort = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

export const putGalleryAssetBlob = async (assetId, blob) => {
  if (typeof assetId !== 'string' || !assetId.trim() || !(blob instanceof Blob)) return false
  const normalizedId = assetId.trim()
  const written = await writeBlobToIndexedDb(normalizedId, blob)
  if (written) return true
  memoryBlobFallback.set(normalizedId, blob)
  return true
}

export const getGalleryAssetBlob = async (assetId) => {
  if (typeof assetId !== 'string' || !assetId.trim()) return null
  const normalizedId = assetId.trim()
  const fromIndexedDb = await readBlobFromIndexedDb(normalizedId)
  if (fromIndexedDb instanceof Blob) return fromIndexedDb
  return memoryBlobFallback.get(normalizedId) || null
}

export const deleteGalleryAssetBlob = async (assetId) => {
  if (typeof assetId !== 'string' || !assetId.trim()) return false
  const normalizedId = assetId.trim()
  const deleted = await deleteBlobFromIndexedDb(normalizedId)
  const hadFallback = memoryBlobFallback.delete(normalizedId)
  return deleted || hadFallback
}

export const clearGalleryAssetBlobFallback = () => {
  memoryBlobFallback.clear()
}
