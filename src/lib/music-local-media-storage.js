import { canWriteCurrentSave } from './current-save-write-runtime'

export const MUSIC_MEDIA_DB_NAME = 'schatphone-music-media'
export const MUSIC_MEDIA_DB_STORE = 'audioBlobs'
export const MUSIC_MEDIA_DB_VERSION = 1

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'

let musicMediaDbOpenPromise = null
let musicMediaDbUnavailable = false

const openMusicMediaDb = async () => {
  if (!canUseIndexedDb() || musicMediaDbUnavailable) return null
  if (musicMediaDbOpenPromise) return musicMediaDbOpenPromise

  musicMediaDbOpenPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(MUSIC_MEDIA_DB_NAME, MUSIC_MEDIA_DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(MUSIC_MEDIA_DB_STORE)) {
          db.createObjectStore(MUSIC_MEDIA_DB_STORE, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => db.close()
        resolve(db)
      }

      request.onerror = () => {
        musicMediaDbUnavailable = true
        resolve(null)
      }

      request.onblocked = () => resolve(null)
    } catch {
      musicMediaDbUnavailable = true
      resolve(null)
    }
  })

  return musicMediaDbOpenPromise
}

const writeBlobToIndexedDb = async (mediaId, blob) => {
  const db = await openMusicMediaDb()
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(MUSIC_MEDIA_DB_STORE, 'readwrite')
      transaction.objectStore(MUSIC_MEDIA_DB_STORE).put({
        id: mediaId,
        blob,
        updatedAt: Date.now(),
      })
      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => resolve(false)
      transaction.onabort = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

const readBlobFromIndexedDb = async (mediaId) => {
  const db = await openMusicMediaDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(MUSIC_MEDIA_DB_STORE, 'readonly')
      const request = transaction.objectStore(MUSIC_MEDIA_DB_STORE).get(mediaId)
      request.onsuccess = () => {
        const item = request.result
        resolve(item?.blob instanceof Blob ? item.blob : null)
      }
      request.onerror = () => resolve(null)
      transaction.onabort = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

const deleteBlobFromIndexedDb = async (mediaId) => {
  const db = await openMusicMediaDb()
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(MUSIC_MEDIA_DB_STORE, 'readwrite')
      transaction.objectStore(MUSIC_MEDIA_DB_STORE).delete(mediaId)
      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => resolve(false)
      transaction.onabort = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

const normalizeMediaId = (value) =>
  typeof value === 'string' ? value.trim().slice(0, 180) : ''

export const putMusicLocalMedia = async (mediaIdInput, blob) => {
  const mediaId = normalizeMediaId(mediaIdInput)
  if (!mediaId || !(blob instanceof Blob) || !canWriteCurrentSave()) return false
  return writeBlobToIndexedDb(mediaId, blob)
}

export const getMusicLocalMedia = async (mediaIdInput) => {
  const mediaId = normalizeMediaId(mediaIdInput)
  if (!mediaId) return null
  return readBlobFromIndexedDb(mediaId)
}

export const deleteMusicLocalMedia = async (mediaIdInput) => {
  const mediaId = normalizeMediaId(mediaIdInput)
  if (!mediaId || !canWriteCurrentSave()) return false
  return deleteBlobFromIndexedDb(mediaId)
}

export const probeMusicAudioSource = async (urlInput, options = {}) => {
  const url = typeof urlInput === 'string' ? urlInput.trim() : ''
  const AudioCtor = options.AudioCtor || globalThis.Audio
  if (!url || typeof AudioCtor !== 'function') {
    return { ok: false, code: !url ? 'AUDIO_URL_INVALID' : 'AUDIO_PROBE_UNSUPPORTED' }
  }

  const timeoutMs = Math.max(1000, Math.min(15000, Number(options.timeoutMs) || 8000))
  return new Promise((resolve) => {
    const audio = new AudioCtor()
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      try {
        audio.pause?.()
        audio.removeAttribute?.('src')
        audio.load?.()
      } catch {
        // Metadata probing is best effort; cleanup must not replace the result.
      }
      resolve(result)
    }
    const timeoutId = setTimeout(() => finish({ ok: false, code: 'AUDIO_PROBE_TIMEOUT' }), timeoutMs)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => finish({
      ok: true,
      durationSec: Number.isFinite(Number(audio.duration)) ? Math.round(Number(audio.duration)) : 0,
    })
    audio.onerror = () => finish({ ok: false, code: 'AUDIO_UNAVAILABLE' })
    try {
      audio.src = url
      audio.load?.()
    } catch {
      finish({ ok: false, code: 'AUDIO_UNAVAILABLE' })
    }
  })
}

export const probeMusicAudioBlob = async (blob, options = {}) => {
  const objectUrlApi = options.objectUrlApi || globalThis.URL
  if (!(blob instanceof Blob) || typeof objectUrlApi?.createObjectURL !== 'function') {
    return { ok: false, code: 'AUDIO_PROBE_UNSUPPORTED' }
  }
  const objectUrl = objectUrlApi.createObjectURL(blob)
  try {
    return await probeMusicAudioSource(objectUrl, options)
  } finally {
    objectUrlApi.revokeObjectURL?.(objectUrl)
  }
}
