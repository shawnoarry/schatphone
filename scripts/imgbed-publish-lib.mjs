import { relative, resolve, sep } from 'node:path'
import { stat } from 'node:fs/promises'
import {
  DEFAULT_IMAGE_BED_URL,
  isMediaPath,
  mimeTypeForPath,
  normalizeRepoPath,
  PROTECTED_SOURCE_PREFIX,
  PUBLIC_RUNTIME_PREFIX,
  publicDownloadUrl,
  sha256File,
} from './imgbed-migration-lib.mjs'

export const PROJECT_ASSET_REGISTRY_PATH = 'config/project-assets.json'
export const MAX_BATCH_FILES = 10
export const MAX_BATCH_BYTES = 40 * 1024 * 1024

export function normalizeImageBedBaseUrl(value = DEFAULT_IMAGE_BED_URL) {
  const url = new URL(String(value || DEFAULT_IMAGE_BED_URL))
  if (
    url.protocol !== 'https:'
    || url.username
    || url.password
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    throw new Error('Image-bed base URL must be a plain HTTPS origin')
  }
  return url.origin
}

function normalizedLocalAssetPath(value) {
  const path = normalizeRepoPath(value)
  if (
    !path
    || path.startsWith('/')
    || /^[a-zA-Z]:\//.test(path)
    || path.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`Unsafe local asset path: ${value}`)
  }
  return path
}

function normalizedRemotePath(value) {
  const path = normalizeRepoPath(value).replace(/^\/+/, '')
  const hasUnsafeCharacter = [...path].some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint <= 31 || codePoint === 127 || '%?#'.includes(character)
  })
  if (!path || hasUnsafeCharacter) {
    throw new Error(`Invalid remote asset path: ${value}`)
  }
  if (path.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Unsafe remote asset path: ${value}`)
  }
  return path
}

function parseMapping(value) {
  const separator = String(value || '').indexOf('=')
  if (separator <= 0 || separator === String(value).length - 1) {
    throw new Error(`Asset mapping must use <local-path>=<remote-path>: ${value}`)
  }
  return {
    path: normalizedLocalAssetPath(String(value).slice(0, separator)),
    remotePath: normalizedRemotePath(String(value).slice(separator + 1)),
  }
}

function resolveInsideRepo(repoRoot, filePath) {
  const absoluteRoot = resolve(repoRoot)
  const absolutePath = resolve(absoluteRoot, filePath)
  const relativePath = relative(absoluteRoot, absolutePath)
  if (!relativePath || relativePath.startsWith(`..${sep}`) || relativePath === '..') {
    throw new Error(`Asset path must stay inside the repository: ${filePath}`)
  }
  return absolutePath
}

async function planEntry(repoRoot, mapping, access, baseUrl) {
  const parsed = parseMapping(mapping)
  if (!isMediaPath(parsed.path)) throw new Error(`Asset is not supported media: ${parsed.path}`)
  const absolutePath = resolveInsideRepo(repoRoot, parsed.path)
  const fileStat = await stat(absolutePath)
  if (!fileStat.isFile()) throw new Error(`Asset is not a file: ${parsed.path}`)
  const remoteKey = access === 'protected'
    ? `${PROTECTED_SOURCE_PREFIX}${parsed.remotePath}`
    : `${PUBLIC_RUNTIME_PREFIX}${parsed.remotePath}`
  return {
    path: parsed.path,
    bytes: fileStat.size,
    sha256: await sha256File(absolutePath),
    mimeType: mimeTypeForPath(parsed.path),
    access,
    remoteKey,
    downloadUrl: publicDownloadUrl(baseUrl, remoteKey),
    action: 'upload',
  }
}

export async function buildPublishPlan({
  repoRoot,
  batchId,
  runtime = [],
  source = [],
  baseUrl = DEFAULT_IMAGE_BED_URL,
  approved = false,
  approvalSource = '',
}) {
  const normalizedBatchId = String(batchId || '').trim()
  if (!normalizedBatchId || normalizedBatchId.length > 128) {
    throw new Error('A batch id of at most 128 characters is required')
  }
  const runtimeEntries = await Promise.all(runtime.map((mapping) => (
    planEntry(repoRoot, mapping, 'public', baseUrl)
  )))
  const sourceEntries = await Promise.all(source.map((mapping) => (
    planEntry(repoRoot, mapping, 'protected', baseUrl)
  )))
  const entries = [...runtimeEntries, ...sourceEntries]
  if (entries.length === 0) throw new Error('At least one runtime or source asset is required')

  const digests = new Set()
  const remoteKeys = new Set()
  for (const entry of entries) {
    if (digests.has(entry.sha256)) {
      throw new Error(`Identical bytes must be published once: ${entry.path}`)
    }
    if (remoteKeys.has(entry.remoteKey)) {
      throw new Error(`Remote asset key is duplicated: ${entry.remoteKey}`)
    }
    digests.add(entry.sha256)
    remoteKeys.add(entry.remoteKey)
  }

  const normalizedApprovalSource = String(approvalSource || '').trim()
  if (approved && !normalizedApprovalSource) throw new Error('An approval source is required')
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    batchId: normalizedBatchId,
    status: approved ? 'APPROVED' : 'PROPOSED_NOT_APPROVED',
    approved,
    approvedAt: approved ? new Date().toISOString() : null,
    approvalSource: approved ? normalizedApprovalSource : null,
    baseUrl: normalizeImageBedBaseUrl(baseUrl),
    summary: {
      runtimeObjects: runtimeEntries.length,
      sourceObjects: sourceEntries.length,
      totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    },
    entries,
  }
}

export function assertPublishPlan(plan) {
  if (plan?.schemaVersion !== 1 || plan?.approved !== true || plan?.status !== 'APPROVED') {
    throw new Error('Project asset plan is not explicitly approved')
  }
  if (!plan.batchId || !Array.isArray(plan.entries) || plan.entries.length === 0) {
    throw new Error('Project asset plan is incomplete')
  }
  if (!String(plan.approvalSource || '').trim()) {
    throw new Error('Project asset plan has no approval source')
  }
  const baseUrl = normalizeImageBedBaseUrl(plan.baseUrl)
  if (plan.baseUrl !== baseUrl) {
    throw new Error('Project asset plan does not use a normalized image-bed origin')
  }
  const remoteKeys = new Set()
  const digests = new Set()
  for (const entry of plan.entries) {
    if (entry.path !== normalizedLocalAssetPath(entry.path)) {
      throw new Error(`Project asset entry has an invalid local path: ${entry.path}`)
    }
    if (entry.access !== 'public' && entry.access !== 'protected') {
      throw new Error(`Project asset entry has an invalid access class: ${entry.path}`)
    }
    const prefix = entry.access === 'protected' ? PROTECTED_SOURCE_PREFIX : PUBLIC_RUNTIME_PREFIX
    if (entry.action !== 'upload' || !String(entry.remoteKey || '').startsWith(prefix)) {
      throw new Error(`Project asset entry has an invalid destination: ${entry.path}`)
    }
    if (!/^[a-f0-9]{64}$/.test(String(entry.sha256 || '')) || Number(entry.bytes) <= 0) {
      throw new Error(`Project asset entry has invalid integrity metadata: ${entry.path}`)
    }
    if (entry.downloadUrl !== publicDownloadUrl(baseUrl, entry.remoteKey)) {
      throw new Error(`Project asset entry has an invalid download URL: ${entry.path}`)
    }
    if (remoteKeys.has(entry.remoteKey) || digests.has(entry.sha256)) {
      throw new Error(`Project asset plan violates single-copy rules: ${entry.path}`)
    }
    remoteKeys.add(entry.remoteKey)
    digests.add(entry.sha256)
  }
  return plan
}

export function chunkPublishEntries(entries) {
  const chunks = []
  let current = []
  let currentBytes = 0
  for (const entry of entries) {
    if (entry.bytes > MAX_BATCH_BYTES) {
      throw new Error(`Asset exceeds the batch byte limit: ${entry.path}`)
    }
    if (current.length >= MAX_BATCH_FILES || currentBytes + entry.bytes > MAX_BATCH_BYTES) {
      chunks.push(current)
      current = []
      currentBytes = 0
    }
    current.push(entry)
    currentBytes += entry.bytes
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

export function buildBatchUploadUrl(baseUrl) {
  return new URL('/upload/batch', String(baseUrl).replace(/\/+$/, ''))
}

export function buildBatchManifest(batchId, entries) {
  return {
    batchId,
    files: entries.map((entry, index) => ({
      field: `file-${index}`,
      fileId: entry.remoteKey,
      sha256: entry.sha256,
    })),
  }
}

export function assertBatchUploadResult(entries, result) {
  if (!Array.isArray(result?.results) || result.results.length !== entries.length) {
    throw new Error('Batch publish returned an invalid result count')
  }
  const byFileId = new Map(result.results.map((entry) => [entry?.fileId, entry]))
  for (const entry of entries) {
    const uploaded = byFileId.get(entry.remoteKey)
    if (
      !uploaded
      || !['uploaded', 'already-uploaded'].includes(uploaded.status)
      || uploaded.sha256 !== entry.sha256
      || Number(uploaded.bytes) !== entry.bytes
    ) {
      throw new Error(`Batch publish returned invalid integrity metadata: ${entry.remoteKey}`)
    }
  }
  return result
}

export function createEmptyAssetRegistry(baseUrl = DEFAULT_IMAGE_BED_URL) {
  return {
    schemaVersion: 1,
    baseUrl: normalizeImageBedBaseUrl(baseUrl),
    updatedAt: null,
    assets: [],
  }
}

export function mergeVerifiedAssets(registry, plan, verifiedEntries) {
  validateAssetRegistry(registry)
  const byRemoteKey = new Map(registry.assets.map((entry) => [entry.remoteKey, entry]))
  const keyByDigest = new Map(registry.assets.map((entry) => [entry.sha256, entry.remoteKey]))
  for (const entry of verifiedEntries) {
    const existingKey = keyByDigest.get(entry.sha256)
    if (existingKey && existingKey !== entry.remoteKey) {
      throw new Error(`Registry already contains these bytes at ${existingKey}`)
    }
    byRemoteKey.set(entry.remoteKey, {
      batchId: plan.batchId,
      path: entry.path,
      aliasPaths: Array.isArray(entry.aliasPaths) ? [...entry.aliasPaths] : [],
      access: entry.access,
      remoteKey: entry.remoteKey,
      downloadUrl: entry.downloadUrl,
      bytes: entry.bytes,
      sha256: entry.sha256,
      mimeType: entry.mimeType,
      verifiedAt: entry.verifiedAt,
    })
    keyByDigest.set(entry.sha256, entry.remoteKey)
  }
  return {
    ...registry,
    baseUrl: plan.baseUrl,
    updatedAt: new Date().toISOString(),
    assets: [...byRemoteKey.values()].sort((left, right) => (
      left.remoteKey.localeCompare(right.remoteKey)
    )),
  }
}

export function validateAssetRegistry(registry) {
  if (registry?.schemaVersion !== 1 || !Array.isArray(registry?.assets)) {
    throw new Error('Project asset registry has an unsupported schema')
  }
  const remoteKeys = new Set()
  const digests = new Set()
  for (const entry of registry.assets) {
    const prefix = entry.access === 'protected' ? PROTECTED_SOURCE_PREFIX : PUBLIC_RUNTIME_PREFIX
    if (!String(entry.remoteKey || '').startsWith(prefix)) {
      throw new Error(`Registry asset has an invalid prefix: ${entry.remoteKey}`)
    }
    if (!/^[a-f0-9]{64}$/.test(String(entry.sha256 || '')) || Number(entry.bytes) <= 0) {
      throw new Error(`Registry asset has invalid integrity metadata: ${entry.remoteKey}`)
    }
    if (remoteKeys.has(entry.remoteKey)) {
      throw new Error(`Registry asset key is duplicated: ${entry.remoteKey}`)
    }
    if (digests.has(entry.sha256)) {
      throw new Error(`Registry asset bytes are duplicated: ${entry.remoteKey}`)
    }
    remoteKeys.add(entry.remoteKey)
    digests.add(entry.sha256)
  }
  return registry
}

export function stagedAssetViolations(paths) {
  return paths
    .map(normalizeRepoPath)
    .filter((path) => isMediaPath(path))
    .filter((path) => path.startsWith('public/images/') || path.startsWith('output/imagegen/'))
}
