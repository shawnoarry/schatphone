import { canonicalStringify, sha256Canonical, sha256Text } from './persistence-repository-schema'

export const COMPLETE_BACKUP_MAGIC = 'schatphone-complete-backup'
export const COMPLETE_BACKUP_SCHEMA_VERSION = 4

export const COMPLETE_BACKUP_V3_SECTION_PATHS = Object.freeze([
  'settings',
  'user',
  'notifications',
  'apiReports',
  'truthState',
  'moduleAvatarOverrides',
  'moduleIdentity',
  'roleProfiles',
  'contacts',
  'chatHistory',
  'conversations',
  'messagesByConversation',
  'map',
  'calendar',
  'reminders',
  'gallery',
  'files',
  'book',
  'shopping',
  'foodDelivery',
  'simulation',
  'assets',
  'wallet',
  'phone',
  'stock',
  'relationshipRuntime',
  'imageGeneration',
])

export const COMPLETE_BACKUP_SECTION_PATHS = Object.freeze([
  'settings',
  'user',
  'notifications',
  'apiReports',
  'truthState',
  'moduleAvatarOverrides',
  'moduleIdentity',
  'roleProfiles',
  'contacts',
  'chatHistory',
  'conversations',
  'messagesByConversation',
  'map',
  'calendar',
  'miniScene',
  'reminders',
  'gallery',
  'files',
  'book',
  'shopping',
  'foodDelivery',
  'simulation',
  'assets',
  'wallet',
  'phone',
  'stock',
  'relationshipRuntime',
  'imageGeneration',
])

const textByteSize = (value) => new TextEncoder().encode(value).byteLength

const isSectionValue = (value) => value !== null && typeof value === 'object'

const readPath = (value, path) => {
  const segments = path.split('.')
  let current = value
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return { present: false, value: undefined }
    }
    current = current[segment]
  }
  return { present: true, value: current }
}

const decodeBase64 = (value) => {
  if (typeof value !== 'string' || !value) return null
  try {
    if (typeof atob === 'function') {
      const binary = atob(value)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
      }
      return bytes
    }
    if (globalThis.Buffer) return Uint8Array.from(globalThis.Buffer.from(value, 'base64'))
  } catch {
    return null
  }
  return null
}

const decodeDataUrl = (dataUrl) => {
  if (typeof dataUrl !== 'string') return null
  const match = dataUrl.trim().match(/^data:([^;,]+)?;base64,(.+)$/i)
  if (!match) return null
  const bytes = decodeBase64(match[2] || '')
  if (!(bytes instanceof Uint8Array)) return null
  return {
    bytes,
    mimeType: typeof match[1] === 'string' ? match[1].trim().toLowerCase() : '',
  }
}

const sha256Bytes = async (bytes) => {
  if (!globalThis.crypto?.subtle || !(bytes instanceof Uint8Array)) {
    throw new Error('Backup digest support is unavailable.')
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const createPackageId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `backup_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const createSectionManifest = async (payload) => {
  const sections = []
  for (const path of COMPLETE_BACKUP_SECTION_PATHS) {
    const resolved = readPath(payload, path)
    if (!resolved.present || !isSectionValue(resolved.value)) {
      const error = new Error(`Required backup section is missing: ${path}`)
      error.code = 'REQUIRED_SECTION_MISSING'
      throw error
    }
    const canonical = canonicalStringify(resolved.value)
    sections.push({
      id: path,
      path,
      required: true,
      byteSize: textByteSize(canonical),
      sha256: await sha256Canonical(resolved.value),
    })
  }
  return sections
}

const createBinaryManifest = async (payload) => {
  const gallery = payload?.gallery && typeof payload.gallery === 'object' ? payload.gallery : {}
  const fileAssets = Array.isArray(gallery.assets)
    ? gallery.assets.filter((asset) => asset?.sourceType === 'file')
    : []
  const requested = payload?.backupMeta?.galleryAssetPackage?.requested === true
  const items = Array.isArray(gallery?.assetPackage?.items) ? gallery.assetPackage.items : []

  if (!requested) {
    return {
      materialLibraryIncluded: false,
      retainedFileAssetCount: fileAssets.length,
      items: [],
    }
  }

  const expectedIds = fileAssets.map((asset) => String(asset?.id || '').trim()).filter(Boolean)
  const itemIds = items.map((item) => String(item?.id || '').trim()).filter(Boolean)
  const uniqueItemIds = new Set(itemIds)
  if (
    expectedIds.length !== items.length ||
    uniqueItemIds.size !== items.length ||
    expectedIds.some((id) => !uniqueItemIds.has(id))
  ) {
    const error = new Error('Gallery binary inventory does not match retained file assets.')
    error.code = 'BINARY_MISSING'
    throw error
  }

  const binaryItems = []
  for (const item of items) {
    const decoded = decodeDataUrl(item?.dataUrl)
    if (!decoded) {
      const error = new Error(`Gallery binary is unreadable: ${item?.id || 'unknown'}`)
      error.code = 'BINARY_MISSING'
      throw error
    }
    const declaredSize = Number(item?.sizeBytes)
    if (!Number.isFinite(declaredSize) || declaredSize !== decoded.bytes.byteLength) {
      const error = new Error(`Gallery binary size mismatch: ${item?.id || 'unknown'}`)
      error.code = 'BINARY_SIZE_MISMATCH'
      throw error
    }
    binaryItems.push({
      assetId: String(item.id),
      blobId: String(item.blobId || item.id),
      mimeType: String(item.mimeType || decoded.mimeType || 'application/octet-stream'),
      byteSize: decoded.bytes.byteLength,
      sha256: await sha256Bytes(decoded.bytes),
    })
  }

  return {
    materialLibraryIncluded: true,
    retainedFileAssetCount: fileAssets.length,
    items: binaryItems,
  }
}

const manifestWithoutDigest = (manifest) => {
  const result = { ...manifest }
  delete result.manifestSha256
  return result
}

export const createCompleteBackupPackage = async (sourcePayload, options = {}) => {
  const payload = sourcePayload && typeof sourcePayload === 'object' ? sourcePayload : {}
  const exportedAt = Math.max(0, Number(payload?.backupMeta?.exportedAt || Date.now()))
  const packageId = options.packageId || createPackageId()
  const basePayload = {
    ...payload,
    backupMeta: {
      ...(payload.backupMeta || {}),
      magic: COMPLETE_BACKUP_MAGIC,
      schemaVersion: COMPLETE_BACKUP_SCHEMA_VERSION,
      packageId,
      exportedAt,
    },
  }
  const sections = await createSectionManifest(basePayload)
  const binaries = await createBinaryManifest(basePayload)
  const manifest = {
    version: 1,
    packageId,
    exportedAt,
    sectionCount: sections.length,
    sections,
    binaries,
    payloadSha256: await sha256Canonical(
      COMPLETE_BACKUP_SECTION_PATHS.reduce((result, path) => {
        result[path] = readPath(basePayload, path).value
        return result
      }, {}),
    ),
  }
  manifest.manifestSha256 = await sha256Canonical(manifestWithoutDigest(manifest))

  return {
    ...basePayload,
    backupMeta: {
      ...basePayload.backupMeta,
      manifest,
    },
  }
}

export const inspectCompleteBackupPackage = async (payload) => {
  const errors = []
  const addError = (code, detail = '') => errors.push({ code, detail })

  if (!payload || typeof payload !== 'object') {
    return { ok: false, classification: 'invalid', errors: [{ code: 'CONTAINER_INVALID', detail: '' }] }
  }
  if (payload?.backupMeta?.magic !== COMPLETE_BACKUP_MAGIC) addError('CONTAINER_INVALID', 'magic')
  const schemaVersion = Number(payload?.backupMeta?.schemaVersion)
  const sectionPaths =
    schemaVersion === COMPLETE_BACKUP_SCHEMA_VERSION
      ? COMPLETE_BACKUP_SECTION_PATHS
      : schemaVersion === 3
        ? COMPLETE_BACKUP_V3_SECTION_PATHS
        : null
  if (!sectionPaths) {
    addError('SCHEMA_UNSUPPORTED', 'schemaVersion')
  }
  const manifest = payload?.backupMeta?.manifest
  if (!manifest || typeof manifest !== 'object') {
    addError('MANIFEST_INVALID', 'missing')
    return { ok: false, classification: 'invalid', errors }
  }
  if (manifest.packageId !== payload.backupMeta.packageId) addError('MANIFEST_INVALID', 'packageId')
  if (Number(manifest.sectionCount) !== sectionPaths?.length) {
    addError('MANIFEST_INVALID', 'sectionCount')
  }

  try {
    const actualManifestDigest = await sha256Canonical(manifestWithoutDigest(manifest))
    if (actualManifestDigest !== manifest.manifestSha256) addError('MANIFEST_INVALID', 'digest')
  } catch {
    addError('MANIFEST_INVALID', 'digest_unavailable')
  }

  const sectionByPath = new Map(
    (Array.isArray(manifest.sections) ? manifest.sections : []).map((section) => [section?.path, section]),
  )
  for (const path of sectionPaths || []) {
    const resolved = readPath(payload, path)
    const declared = sectionByPath.get(path)
    if (!resolved.present || !isSectionValue(resolved.value) || !declared) {
      addError('REQUIRED_SECTION_MISSING', path)
      continue
    }
    try {
      const canonical = canonicalStringify(resolved.value)
      const digest = await sha256Canonical(resolved.value)
      if (declared.sha256 !== digest || Number(declared.byteSize) !== textByteSize(canonical)) {
        addError('SECTION_DIGEST_MISMATCH', path)
      }
    } catch {
      addError('SECTION_DIGEST_MISMATCH', path)
    }
  }

  try {
    const sectionPayload = (sectionPaths || []).reduce((result, path) => {
      result[path] = readPath(payload, path).value
      return result
    }, {})
    if ((await sha256Canonical(sectionPayload)) !== manifest.payloadSha256) {
      addError('SECTION_DIGEST_MISMATCH', 'payload')
    }
  } catch {
    addError('SECTION_DIGEST_MISMATCH', 'payload')
  }

  const requested = payload?.backupMeta?.galleryAssetPackage?.requested === true
  const fileAssets = Array.isArray(payload?.gallery?.assets)
    ? payload.gallery.assets.filter((asset) => asset?.sourceType === 'file')
    : []
  const packageItems = Array.isArray(payload?.gallery?.assetPackage?.items)
    ? payload.gallery.assetPackage.items
    : []
  const binaryManifestItems = Array.isArray(manifest?.binaries?.items) ? manifest.binaries.items : []

  if (requested) {
    const expectedIds = new Set(fileAssets.map((asset) => String(asset?.id || '').trim()).filter(Boolean))
    const packagedIds = new Set(packageItems.map((item) => String(item?.id || '').trim()).filter(Boolean))
    if (
      expectedIds.size !== fileAssets.length ||
      packagedIds.size !== packageItems.length ||
      expectedIds.size !== packagedIds.size ||
      [...expectedIds].some((id) => !packagedIds.has(id))
    ) {
      addError('BINARY_MISSING', 'inventory')
    }
    const manifestById = new Map(binaryManifestItems.map((item) => [item?.assetId, item]))
    for (const item of packageItems) {
      const declared = manifestById.get(item?.id)
      const decoded = decodeDataUrl(item?.dataUrl)
      if (!declared || !decoded) {
        addError('BINARY_MISSING', item?.id || 'unknown')
        continue
      }
      try {
        const digest = await sha256Bytes(decoded.bytes)
        if (declared.sha256 !== digest || Number(declared.byteSize) !== decoded.bytes.byteLength) {
          addError('BINARY_DIGEST_MISMATCH', item.id)
        }
      } catch {
        addError('BINARY_DIGEST_MISMATCH', item.id)
      }
    }
  } else if (packageItems.length > 0 || binaryManifestItems.length > 0) {
    addError('MANIFEST_INVALID', 'unexpected_binaries')
  }

  return {
    ok: errors.length === 0,
    classification:
      errors.length === 0
        ? schemaVersion === COMPLETE_BACKUP_SCHEMA_VERSION
          ? 'current_complete'
          : 'legacy_complete'
        : 'invalid',
    packageId: payload?.backupMeta?.packageId || '',
    schemaVersion,
    verifiedSectionCount: Math.max(0, (sectionPaths?.length || 0) - errors.filter((item) => item.code === 'REQUIRED_SECTION_MISSING' || item.code === 'SECTION_DIGEST_MISMATCH').length),
    binaryCount: binaryManifestItems.length,
    errors,
  }
}

export const assertCompleteBackupPackage = async (payload) => {
  const inspection = await inspectCompleteBackupPackage(payload)
  if (inspection.ok) return payload
  const error = new Error('Complete backup package verification failed.')
  error.code = inspection.errors[0]?.code || 'BACKUP_PACKAGE_INVALID'
  error.inspection = inspection
  throw error
}

export const calculateCompleteBackupByteSize = (payload) =>
  textByteSize(canonicalStringify(payload))

export const createCompleteBackupFingerprint = (payload) =>
  sha256Text(canonicalStringify(payload))
