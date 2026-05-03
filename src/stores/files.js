import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import {
  MEDIA_KIND,
  MEDIA_SIZE_SCENE,
  guessMediaKindFromFile,
  validateMediaFileBySize,
} from '../lib/media-policy'

const FILES_STORAGE_KEY = 'store:files'
const FILES_STORAGE_VERSION = 1
const FILE_RECORD_LIMIT = 200

export const FILE_RECORD_KIND = Object.freeze({
  MARKDOWN: 'markdown',
  TEXT: 'text',
  IMAGE: 'image',
  GIF: 'gif',
  VIDEO: 'video',
  DOC: 'doc',
  FILE: 'file',
})

const FILE_RECORD_KINDS = new Set(Object.values(FILE_RECORD_KIND))
const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown'])
const TEXT_EXTENSIONS = new Set(['txt', 'text', 'json', 'csv', 'log'])
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'avi'])
const DOC_EXTENSIONS = new Set(['doc', 'docx', 'pdf', 'rtf'])

const DEFAULT_FILE_RECORDS = Object.freeze([
  Object.freeze({
    name: '角色设定.md',
    kind: FILE_RECORD_KIND.MARKDOWN,
    sizeBytes: 12 * 1024,
    favorite: true,
  }),
  Object.freeze({
    name: '世界观草稿.txt',
    kind: FILE_RECORD_KIND.TEXT,
    sizeBytes: 8 * 1024,
    favorite: false,
  }),
  Object.freeze({
    name: '界面参考.png',
    kind: FILE_RECORD_KIND.IMAGE,
    sizeBytes: 256 * 1024,
    favorite: true,
  }),
  Object.freeze({
    name: '需求清单 v2.doc',
    kind: FILE_RECORD_KIND.DOC,
    sizeBytes: 76 * 1024,
    favorite: false,
  }),
])

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const trimText = (value, fallback = '', max = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const readExtension = (value = '') => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const withoutQuery = trimmed.split('?')[0].split('#')[0]
  const dotIndex = withoutQuery.lastIndexOf('.')
  if (dotIndex < 0) return ''
  return withoutQuery.slice(dotIndex + 1).toLowerCase()
}

const normalizeKind = (value, fallback = FILE_RECORD_KIND.FILE) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return FILE_RECORD_KINDS.has(normalized) ? normalized : fallback
}

const createFileRecordId = () => `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const detectKindFromExtension = (extension = '') => {
  const normalized = typeof extension === 'string' ? extension.trim().toLowerCase() : ''
  if (MARKDOWN_EXTENSIONS.has(normalized)) return FILE_RECORD_KIND.MARKDOWN
  if (TEXT_EXTENSIONS.has(normalized)) return FILE_RECORD_KIND.TEXT
  if (normalized === 'gif') return FILE_RECORD_KIND.GIF
  if (IMAGE_EXTENSIONS.has(normalized)) return FILE_RECORD_KIND.IMAGE
  if (VIDEO_EXTENSIONS.has(normalized)) return FILE_RECORD_KIND.VIDEO
  if (DOC_EXTENSIONS.has(normalized)) return FILE_RECORD_KIND.DOC
  return FILE_RECORD_KIND.FILE
}

const detectKindFromFile = (file) => {
  const mediaKind = guessMediaKindFromFile(file, MEDIA_KIND.UNKNOWN)
  if (mediaKind === MEDIA_KIND.GIF) return FILE_RECORD_KIND.GIF
  if (mediaKind === MEDIA_KIND.IMAGE) return FILE_RECORD_KIND.IMAGE
  if (mediaKind === MEDIA_KIND.VIDEO) return FILE_RECORD_KIND.VIDEO
  return detectKindFromExtension(readExtension(file?.name))
}

const isMediaKind = (kind) =>
  kind === FILE_RECORD_KIND.IMAGE ||
  kind === FILE_RECORD_KIND.GIF ||
  kind === FILE_RECORD_KIND.VIDEO

const mapRecordKindToMediaKind = (kind) => {
  if (kind === FILE_RECORD_KIND.GIF) return MEDIA_KIND.GIF
  if (kind === FILE_RECORD_KIND.VIDEO) return MEDIA_KIND.VIDEO
  return MEDIA_KIND.IMAGE
}

const buildLocalFileFingerprint = (file) =>
  [
    'local',
    typeof file?.name === 'string' ? file.name.trim().toLowerCase() : '',
    Number.isFinite(Number(file?.size)) ? Math.max(0, Math.floor(Number(file.size))) : 0,
    Number.isFinite(Number(file?.lastModified)) ? Math.max(0, Math.floor(Number(file.lastModified))) : 0,
    typeof file?.type === 'string' ? file.type.trim().toLowerCase() : '',
  ].join(':')

const normalizeFileRecord = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null

  const name = trimText(raw.name, '', 140)
  if (!name) return null

  const extension = trimText(raw.extension, readExtension(name), 24).toLowerCase()
  const kind = normalizeKind(raw.kind || raw.type, detectKindFromExtension(extension))
  const createdAt = Math.max(0, toInt(raw.createdAt, Date.now()))
  const updatedAt = Math.max(0, toInt(raw.updatedAt, createdAt))

  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id.trim()
        : `file_legacy_${Date.now()}_${index}`,
    name,
    kind,
    extension,
    mimeType: trimText(raw.mimeType, '', 100).toLowerCase(),
    sizeBytes: Math.max(0, toInt(raw.sizeBytes, 0)),
    sourceType: trimText(raw.sourceType, 'seed', 40),
    sourceFingerprint: trimText(raw.sourceFingerprint, '', 220),
    noteContent: typeof raw.noteContent === 'string' ? raw.noteContent.slice(0, 12000) : '',
    originalLastModified: Math.max(0, toInt(raw.originalLastModified, 0)),
    favorite: raw.favorite === true,
    createdAt,
    updatedAt,
  }
}

const createSeedRecords = () => {
  const now = Date.now()
  return DEFAULT_FILE_RECORDS.map((item, index) =>
    normalizeFileRecord(
      {
        ...item,
        id: `file_seed_${index + 1}`,
        extension: readExtension(item.name),
        sourceType: 'seed',
        createdAt: now - (DEFAULT_FILE_RECORDS.length - index) * 60 * 1000,
        updatedAt: now - (DEFAULT_FILE_RECORDS.length - index) * 60 * 1000,
      },
      index,
    ),
  ).filter(Boolean)
}

const normalizeFileRecords = (rawRecords) => {
  if (!Array.isArray(rawRecords)) return []
  const seenIds = new Set()
  const normalized = []
  rawRecords.forEach((item, index) => {
    const record = normalizeFileRecord(item, index)
    if (!record || seenIds.has(record.id)) return
    seenIds.add(record.id)
    normalized.push(record)
  })
  return normalized
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, FILE_RECORD_LIMIT)
}

export const useFilesStore = defineStore('files', () => {
  const records = ref([])
  const hasFinishedStorageHydration = ref(false)

  const fileCount = computed(() => records.value.length)
  const favoriteCount = computed(() => records.value.filter((item) => item.favorite).length)

  const findFileById = (fileId) => {
    const id = typeof fileId === 'string' ? fileId.trim() : ''
    if (!id) return null
    return records.value.find((item) => item.id === id) || null
  }

  const createQuickNote = (rawName = '', { content = '' } = {}) => {
    const now = Date.now()
    const name = trimText(rawName, '新建便签.txt', 140)
    const extension = readExtension(name)
    const record = normalizeFileRecord({
      id: createFileRecordId(),
      name,
      kind: detectKindFromExtension(extension || 'txt'),
      extension,
      sizeBytes: Math.max(1, trimText(content, '', 12000).length || 1024),
      sourceType: 'quick_note',
      noteContent: typeof content === 'string' ? content.slice(0, 12000) : '',
      favorite: false,
      createdAt: now,
      updatedAt: now,
    })
    if (!record) return null
    records.value.unshift(record)
    if (records.value.length > FILE_RECORD_LIMIT) records.value.splice(FILE_RECORD_LIMIT)
    return record
  }

  const toggleFavorite = (fileId) => {
    const record = findFileById(fileId)
    if (!record) return false
    record.favorite = !record.favorite
    record.updatedAt = Date.now()
    return true
  }

  const removeFile = (fileId) => {
    const record = findFileById(fileId)
    if (!record) return false
    records.value = records.value.filter((item) => item.id !== record.id)
    return true
  }

  const importLocalFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    const existingFingerprints = new Set(
      records.value.map((item) => item.sourceFingerprint).filter(Boolean),
    )
    const summary = {
      ok: false,
      reason: '',
      importedCount: 0,
      skippedDuplicateCount: 0,
      skippedInvalidCount: 0,
      skippedTooLargeCount: 0,
      firstTooLarge: null,
      imported: [],
    }

    for (const file of files) {
      if (typeof File === 'undefined' || !(file instanceof File)) {
        summary.skippedInvalidCount += 1
        continue
      }

      const fingerprint = buildLocalFileFingerprint(file)
      if (existingFingerprints.has(fingerprint)) {
        summary.skippedDuplicateCount += 1
        continue
      }

      const kind = detectKindFromFile(file)
      if (isMediaKind(kind)) {
        const validation = validateMediaFileBySize(file, {
          scene: MEDIA_SIZE_SCENE.ONE_OFF_INLINE,
          fallbackKind: mapRecordKindToMediaKind(kind),
        })
        if (!validation.ok) {
          summary.skippedTooLargeCount += 1
          if (!summary.firstTooLarge) {
            summary.firstTooLarge = {
              name: file.name,
              mediaKind: validation.mediaKind,
              sizeBytes: validation.sizeBytes,
              maxBytes: validation.maxBytes,
            }
          }
          continue
        }
      }

      const now = Date.now()
      const record = normalizeFileRecord({
        id: createFileRecordId(),
        name: file.name || 'Imported file',
        kind,
        extension: readExtension(file.name),
        mimeType: file.type || '',
        sizeBytes: file.size || 0,
        sourceType: 'local_file',
        sourceFingerprint: fingerprint,
        originalLastModified: file.lastModified || 0,
        favorite: false,
        createdAt: now,
        updatedAt: now,
      })
      if (!record) {
        summary.skippedInvalidCount += 1
        continue
      }

      records.value.unshift(record)
      existingFingerprints.add(fingerprint)
      summary.imported.push(record)
      summary.importedCount += 1
    }

    if (records.value.length > FILE_RECORD_LIMIT) records.value.splice(FILE_RECORD_LIMIT)
    summary.ok = summary.importedCount > 0
    if (!summary.ok) {
      if (summary.skippedTooLargeCount > 0) summary.reason = 'all_too_large'
      else if (summary.skippedDuplicateCount > 0) summary.reason = 'all_duplicate'
      else summary.reason = 'no_valid_files'
    }
    return summary
  }

  const applyPersistedSource = (source) => {
    const sourceRecords = Array.isArray(source)
      ? source
      : source && typeof source === 'object'
        ? source.records || source.files
        : null
    if (!Array.isArray(sourceRecords)) return false
    records.value = normalizeFileRecords(sourceRecords)
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(FILES_STORAGE_KEY, {
      version: FILES_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(FILES_STORAGE_KEY, {
      version: FILES_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    records: records.value.map((item) => ({ ...item })),
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.files === 'object' && snapshot.files
        ? snapshot.files
        : snapshot
    return applyPersistedSource(source)
  }

  const persistToStorage = () => {
    writePersistedState(FILES_STORAGE_KEY, createBackupSnapshot(), {
      version: FILES_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    records.value = []
  }

  const hydratedFromLocal = hydrateFromStorage()
  if (!hydratedFromLocal) {
    records.value = createSeedRecords()
  }

  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    records,
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    records,
    fileCount,
    favoriteCount,
    hasFinishedStorageHydration,
    findFileById,
    createQuickNote,
    toggleFavorite,
    removeFile,
    importLocalFiles,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
