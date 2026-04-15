const KB = 1024
const MB = 1024 * 1024

export const MEDIA_KIND = Object.freeze({
  IMAGE: 'image',
  GIF: 'gif',
  VIDEO: 'video',
  UNKNOWN: 'unknown',
})

export const MEDIA_SIZE_SCENE = Object.freeze({
  GALLERY_IMPORT: 'gallery_import',
  ONE_OFF_INLINE: 'one_off_inline',
})

const MEDIA_LIMIT_BYTES_BY_SCENE = Object.freeze({
  [MEDIA_SIZE_SCENE.GALLERY_IMPORT]: Object.freeze({
    [MEDIA_KIND.IMAGE]: 5 * MB,
    [MEDIA_KIND.GIF]: 12 * MB,
    [MEDIA_KIND.VIDEO]: 40 * MB,
  }),
  [MEDIA_SIZE_SCENE.ONE_OFF_INLINE]: Object.freeze({
    [MEDIA_KIND.IMAGE]: 2 * MB,
    [MEDIA_KIND.GIF]: 6 * MB,
    [MEDIA_KIND.VIDEO]: 12 * MB,
  }),
})

const IMAGE_MIME_PREFIX = 'image/'
const VIDEO_MIME_PREFIX = 'video/'

const GIF_EXTENSION = 'gif'
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'avi'])

const readFileExtension = (value = '') => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const parts = trimmed.split('.')
  if (parts.length < 2) return ''
  return parts[parts.length - 1].toLowerCase()
}

const normalizeScene = (scene) => {
  if (scene === MEDIA_SIZE_SCENE.ONE_OFF_INLINE) return MEDIA_SIZE_SCENE.ONE_OFF_INLINE
  return MEDIA_SIZE_SCENE.GALLERY_IMPORT
}

const normalizeMediaKind = (kind, fallback = MEDIA_KIND.IMAGE) => {
  if (kind === MEDIA_KIND.GIF) return MEDIA_KIND.GIF
  if (kind === MEDIA_KIND.VIDEO) return MEDIA_KIND.VIDEO
  if (kind === MEDIA_KIND.IMAGE) return MEDIA_KIND.IMAGE
  if (kind === MEDIA_KIND.UNKNOWN) return MEDIA_KIND.UNKNOWN
  return fallback
}

export const guessMediaKindFromFile = (file, fallback = MEDIA_KIND.UNKNOWN) => {
  if (!(file instanceof File)) return normalizeMediaKind(fallback, MEDIA_KIND.UNKNOWN)

  const mime = typeof file.type === 'string' ? file.type.trim().toLowerCase() : ''
  const extension = readFileExtension(file.name)
  if (mime === 'image/gif' || extension === GIF_EXTENSION) return MEDIA_KIND.GIF
  if (mime.startsWith(IMAGE_MIME_PREFIX)) return MEDIA_KIND.IMAGE
  if (mime.startsWith(VIDEO_MIME_PREFIX) || VIDEO_EXTENSIONS.has(extension)) return MEDIA_KIND.VIDEO
  return normalizeMediaKind(fallback, MEDIA_KIND.UNKNOWN)
}

export const resolveMediaSizeLimitBytes = (mediaKind, { scene = MEDIA_SIZE_SCENE.GALLERY_IMPORT } = {}) => {
  const normalizedScene = normalizeScene(scene)
  const normalizedKind = normalizeMediaKind(mediaKind, MEDIA_KIND.IMAGE)
  const scenePolicy = MEDIA_LIMIT_BYTES_BY_SCENE[normalizedScene] || MEDIA_LIMIT_BYTES_BY_SCENE[MEDIA_SIZE_SCENE.GALLERY_IMPORT]
  return scenePolicy[normalizedKind] || scenePolicy[MEDIA_KIND.IMAGE]
}

export const summarizeMediaLimitPolicy = (scene = MEDIA_SIZE_SCENE.GALLERY_IMPORT) => ({
  image: resolveMediaSizeLimitBytes(MEDIA_KIND.IMAGE, { scene }),
  gif: resolveMediaSizeLimitBytes(MEDIA_KIND.GIF, { scene }),
  video: resolveMediaSizeLimitBytes(MEDIA_KIND.VIDEO, { scene }),
})

export const validateMediaFileBySize = (
  file,
  {
    scene = MEDIA_SIZE_SCENE.GALLERY_IMPORT,
    fallbackKind = MEDIA_KIND.IMAGE,
  } = {},
) => {
  const mediaKind = guessMediaKindFromFile(file, fallbackKind)
  const maxBytes = resolveMediaSizeLimitBytes(mediaKind, { scene })
  if (!(file instanceof File)) {
    return {
      ok: false,
      reason: 'invalid_file',
      mediaKind,
      sizeBytes: 0,
      maxBytes,
    }
  }
  const sizeBytes = Number.isFinite(Number(file.size)) ? Math.max(0, Math.floor(Number(file.size))) : 0
  if (sizeBytes > maxBytes) {
    return {
      ok: false,
      reason: 'too_large',
      mediaKind,
      sizeBytes,
      maxBytes,
    }
  }
  return {
    ok: true,
    reason: '',
    mediaKind,
    sizeBytes,
    maxBytes,
  }
}

export const formatBytesCompact = (bytes = 0) => {
  const normalized = Number.isFinite(Number(bytes)) ? Math.max(0, Number(bytes)) : 0
  if (normalized >= MB) return `${(normalized / MB).toFixed(1)} MB`
  if (normalized >= KB) return `${Math.round(normalized / KB)} KB`
  return `${Math.round(normalized)} B`
}
