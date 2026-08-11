import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { basename, dirname, extname, posix, resolve } from 'node:path'
import { readFile, stat } from 'node:fs/promises'

export const IMAGE_BED_COMMIT = '0030ddfd8b4b7291bf8ff71509682fef85a124ad'
export const DEFAULT_IMAGE_BED_URL = 'https://cloudflare-imgbed-7z3.pages.dev'
export const PUBLIC_RUNTIME_PREFIX = 'schatphone-assets/'
export const PROTECTED_SOURCE_PREFIX = 'schatphone-source/'
export const DEFAULT_HUGGINGFACE_RATE_LIMIT_RETRY_MS = 61 * 60 * 1000

const MEDIA_EXTENSIONS = new Set([
  '.avif', '.gif', '.jpeg', '.jpg', '.mp3', '.mp4', '.ogg', '.png', '.svg',
  '.wav', '.webm', '.webp',
])
const TEXT_EXTENSIONS = new Set([
  '.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.scss', '.ts',
  '.tsx', '.vue', '.webmanifest', '.yaml', '.yml',
])
const MIME_TYPES = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
}

export function normalizeRepoPath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
}

export function isMediaPath(filePath) {
  return MEDIA_EXTENSIONS.has(extname(filePath).toLowerCase())
}

export function isTextPath(filePath) {
  return TEXT_EXTENSIONS.has(extname(filePath).toLowerCase())
}

export function mimeTypeForPath(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream'
}

export async function sha256File(filePath) {
  const bytes = await readFile(filePath)
  return createHash('sha256').update(bytes).digest('hex')
}

export function huggingFaceCommitRateLimitRetryMs(status, responseBody) {
  const body = String(responseBody || '')
  if (![429, 500].includes(Number(status))) return null
  if (!/repository commits|commit failed:\s*429/i.test(body)) return null

  const minutes = body.match(/retry[^.]*?in about\s+(\d+)\s+minute/i)
  if (minutes) return (Number(minutes[1]) + 1) * 60 * 1000

  const hours = body.match(/retry[^.]*?in about\s+(\d+)\s+hour/i)
  if (hours) return (Number(hours[1]) * 60 + 1) * 60 * 1000

  return DEFAULT_HUGGINGFACE_RATE_LIMIT_RETRY_MS
}

export function isRuntimeReference(referencePath) {
  const normalized = normalizeRepoPath(referencePath)
  return normalized.startsWith('src/') || normalized.startsWith('public/')
}

export function classifyAsset(assetPath, references = []) {
  const normalized = normalizeRepoPath(assetPath)
  const runtimeReferenceCount = references.filter((reference) =>
    isRuntimeReference(reference.path),
  ).length

  if (normalized.startsWith('output/imagegen/')) {
    return {
      kind: 'generated-working-file',
      migrationLane: 'defer-generated-output',
      runtimeReferenceCount,
    }
  }
  if (normalized.startsWith('output/e2e/') || normalized.startsWith('output/playwright/')) {
    return {
      kind: 'generated-qa-evidence',
      migrationLane: 'defer-qa-evidence',
      runtimeReferenceCount,
    }
  }
  if (normalized.startsWith('public/')) {
    return {
      kind: 'runtime-asset',
      migrationLane: 'public-runtime',
      runtimeReferenceCount,
    }
  }
  if (normalized.startsWith('src/')) {
    return {
      kind: 'bundled-runtime-asset',
      migrationLane: 'manual-runtime-review',
      runtimeReferenceCount,
    }
  }
  return {
    kind: 'repository-media',
    migrationLane: 'manual-review-required',
    runtimeReferenceCount,
  }
}

export function publicRuntimeKey(assetPath) {
  const normalized = normalizeRepoPath(assetPath)
  if (!normalized.startsWith('public/')) {
    throw new Error(`Runtime asset is not under public/: ${normalized}`)
  }
  return `${PUBLIC_RUNTIME_PREFIX}${normalized.slice('public/'.length)}`
}

export function protectedSourceKey(assetPath) {
  return `${PROTECTED_SOURCE_PREFIX}${normalizeRepoPath(assetPath)}`
}

export function publicDownloadUrl(baseUrl, remoteKey) {
  const encodedKey = remoteKey.split('/').map(encodeURIComponent).join('/')
  return `${String(baseUrl).replace(/\/+$/, '')}/file/${encodedKey}`
}

export function runGit(repoRoot, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    input: options.input,
    maxBuffer: 256 * 1024 * 1024,
  })
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `git ${args.join(' ')} failed`)
  }
  return result.stdout
}

export function listTrackedFiles(repoRoot) {
  return runGit(repoRoot, ['ls-files', '-z'])
    .split('\0')
    .filter(Boolean)
    .map(normalizeRepoPath)
}

function assetReferenceVariants(assetPath) {
  const normalized = normalizeRepoPath(assetPath)
  const variants = new Set([normalized, `/${normalized}`])
  if (normalized.startsWith('public/')) {
    variants.add(normalized.slice('public/'.length))
    variants.add(`/${normalized.slice('public/'.length)}`)
  }
  return [...variants]
}

export async function collectLiteralReferences(repoRoot, trackedFiles, assetPaths) {
  const byBaseName = new Map()
  for (const assetPath of assetPaths) {
    const name = basename(assetPath).toLowerCase()
    const entries = byBaseName.get(name) || []
    entries.push(assetPath)
    byBaseName.set(name, entries)
  }

  const references = new Map(assetPaths.map((assetPath) => [assetPath, []]))
  const assetNamePattern = /[A-Za-z0-9][A-Za-z0-9._@+()-]*\.(?:avif|gif|jpe?g|mp3|mp4|ogg|png|svg|wav|webm|webp)/gi

  for (const sourcePath of trackedFiles.filter(isTextPath)) {
    let content
    try {
      content = await readFile(resolve(repoRoot, sourcePath), 'utf8')
    } catch {
      continue
    }
    const lines = content.split(/\r?\n/)
    lines.forEach((line, index) => {
      const names = new Set([...line.matchAll(assetNamePattern)].map((match) => match[0].toLowerCase()))
      for (const name of names) {
        const candidates = byBaseName.get(name) || []
        for (const candidate of candidates) {
          const exact = assetReferenceVariants(candidate).some((variant) => line.includes(variant))
          if (!exact && candidates.length > 1) continue
          references.get(candidate).push({
            path: sourcePath,
            line: index + 1,
            match: exact ? 'path' : 'unique-basename',
          })
        }
      }
    })
  }
  return references
}

async function mapWithConcurrency(items, concurrency, operation) {
  const results = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await operation(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

function summarizeBy(entries, selector) {
  const buckets = new Map()
  for (const entry of entries) {
    const key = selector(entry)
    const bucket = buckets.get(key) || { count: 0, bytes: 0 }
    bucket.count += 1
    bucket.bytes += entry.bytes
    buckets.set(key, bucket)
  }
  return Object.fromEntries([...buckets.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

export function collectGitHistoryStats(repoRoot) {
  const countOutput = runGit(repoRoot, ['count-objects', '-v'])
  const countObjects = Object.fromEntries(
    countOutput.trim().split(/\r?\n/).map((line) => {
      const [key, value] = line.split(':').map((part) => part.trim())
      return [key, Number(value)]
    }),
  )
  const revList = runGit(repoRoot, ['rev-list', '--objects', '--all'])
  const objectPaths = new Map()
  const objectIds = []
  for (const line of revList.trim().split(/\r?\n/)) {
    const separator = line.indexOf(' ')
    const objectId = separator === -1 ? line : line.slice(0, separator)
    const objectPath = separator === -1 ? '' : normalizeRepoPath(line.slice(separator + 1))
    objectIds.push(objectId)
    if (objectPath && !objectPaths.has(objectId)) objectPaths.set(objectId, objectPath)
  }
  const batch = runGit(
    repoRoot,
    ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'],
    { input: `${[...new Set(objectIds)].join('\n')}\n` },
  )
  const blobs = []
  for (const line of batch.trim().split(/\r?\n/)) {
    const [objectId, type, sizeValue] = line.split(' ')
    if (type !== 'blob') continue
    blobs.push({ objectId, bytes: Number(sizeValue), path: objectPaths.get(objectId) || '' })
  }
  const mediaBlobs = blobs.filter((blob) => isMediaPath(blob.path))
  return {
    packedBytes: ((countObjects['size-pack'] || 0) + (countObjects.size || 0)) * 1024,
    packedObjectCount: countObjects.inPack || 0,
    looseObjectCount: countObjects.count || 0,
    uniqueBlobBytes: blobs.reduce((sum, blob) => sum + blob.bytes, 0),
    uniqueMediaBlobBytes: mediaBlobs.reduce((sum, blob) => sum + blob.bytes, 0),
    uniqueMediaBlobCount: mediaBlobs.length,
    largestMediaBlobs: mediaBlobs.sort((left, right) => right.bytes - left.bytes).slice(0, 25),
  }
}

export async function buildInventory(repoRoot) {
  const trackedFiles = listTrackedFiles(repoRoot)
  const assetPaths = trackedFiles.filter(isMediaPath)
  const literalReferences = await collectLiteralReferences(repoRoot, trackedFiles, assetPaths)
  const assets = await mapWithConcurrency(assetPaths, 8, async (assetPath) => {
    const absolutePath = resolve(repoRoot, assetPath)
    const [fileStats, sha256] = await Promise.all([stat(absolutePath), sha256File(absolutePath)])
    const references = literalReferences.get(assetPath) || []
    return {
      path: assetPath,
      bytes: fileStats.size,
      sha256,
      mimeType: mimeTypeForPath(assetPath),
      ...classifyAsset(assetPath, references),
      references,
    }
  })

  const digestGroups = new Map()
  for (const asset of assets) {
    const group = digestGroups.get(asset.sha256) || []
    group.push(asset.path)
    digestGroups.set(asset.sha256, group)
  }
  for (const asset of assets) {
    const group = digestGroups.get(asset.sha256)
    asset.duplicatePaths = group.length > 1 ? group.filter((path) => path !== asset.path) : []
  }
  const duplicatePotentialBytes = [...digestGroups.entries()].reduce((sum, [digest, paths]) => {
    if (paths.length < 2) return sum
    const asset = assets.find((entry) => entry.sha256 === digest)
    return sum + asset.bytes * (paths.length - 1)
  }, 0)

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repository: {
      head: runGit(repoRoot, ['rev-parse', 'HEAD']).trim(),
      trackedFiles: trackedFiles.length,
    },
    summary: {
      assetCount: assets.length,
      totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
      duplicatePotentialBytes,
      byKind: summarizeBy(assets, (asset) => asset.kind),
      byMigrationLane: summarizeBy(assets, (asset) => asset.migrationLane),
      byRoot: summarizeBy(assets, (asset) => asset.path.split('/')[0]),
    },
    gitHistory: collectGitHistoryStats(repoRoot),
    assets: assets.sort((left, right) => left.path.localeCompare(right.path)),
  }
}

export function buildFirstBatchPlan(inventory, baseUrl = DEFAULT_IMAGE_BED_URL) {
  const candidates = inventory.assets.filter((asset) => (
    asset.migrationLane === 'public-runtime'
    && asset.path.startsWith('public/')
    && !asset.duplicatePaths.some((path) => path.startsWith('public/'))
  ))
  const groups = new Map()
  for (const asset of candidates) {
    const directory = posix.dirname(asset.path)
    const group = groups.get(directory) || []
    group.push(asset)
    groups.set(directory, group)
  }
  const selected = [...groups.entries()]
    .map(([directory, assets]) => ({
      directory,
      assets,
      bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    }))
    .filter((group) => group.assets.length >= 2 && group.assets.length <= 15)
    .filter((group) => group.bytes <= 40 * 1024 * 1024)
    .sort((left, right) => right.bytes - left.bytes || left.directory.localeCompare(right.directory))[0]
  if (!selected) throw new Error('No coherent protected-source batch satisfies the safety limits')

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    inventoryHead: inventory.repository.head,
    status: 'PROPOSED_NOT_APPROVED',
    approved: false,
    mode: 'public-runtime-single-copy',
    sourceDirectory: selected.directory,
    limits: { maxFiles: 15, maxBytes: 40 * 1024 * 1024 },
    impact: {
      runtimeReferenceChanges: 'required-after-anonymous-download-verification',
      localDeletions: 0,
      gitHistoryRewrite: false,
    },
    entries: selected.assets
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((asset) => {
        const remoteKey = publicRuntimeKey(asset.path)
        return {
          path: asset.path,
          bytes: asset.bytes,
          sha256: asset.sha256,
          mimeType: asset.mimeType,
          remoteKey,
          publicUrl: publicDownloadUrl(baseUrl, remoteKey),
          runtimeReferenceCount: asset.runtimeReferenceCount,
          duplicatePaths: asset.duplicatePaths,
          action: 'proposed-upload',
        }
      }),
  }
}

function groupAssetsByDigest(assets) {
  const groups = new Map()
  for (const asset of assets) {
    const group = groups.get(asset.sha256) || []
    group.push(asset)
    groups.set(asset.sha256, group)
  }
  return [...groups.values()].map((group) => group.sort((left, right) => (
    right.runtimeReferenceCount - left.runtimeReferenceCount
    || left.path.localeCompare(right.path)
  )))
}

export function buildCompleteMigrationPlan(inventory, baseUrl = DEFAULT_IMAGE_BED_URL) {
  const runtimeAssets = inventory.assets.filter((asset) => (
    asset.migrationLane === 'public-runtime'
    && asset.path.startsWith('public/images/')
  ))
  const runtimeDigests = new Set(runtimeAssets.map((asset) => asset.sha256))
  const runtimeSourceAliases = new Map()
  inventory.assets
    .filter((asset) => asset.path.startsWith('output/imagegen/') && runtimeDigests.has(asset.sha256))
    .forEach((asset) => {
      const aliases = runtimeSourceAliases.get(asset.sha256) || []
      aliases.push(asset.path)
      runtimeSourceAliases.set(asset.sha256, aliases)
    })
  const sourceAssets = inventory.assets.filter((asset) => (
    asset.path.startsWith('output/imagegen/')
    && !runtimeDigests.has(asset.sha256)
  ))

  const runtimeEntries = groupAssetsByDigest(runtimeAssets).map((group) => {
    const [asset, ...aliases] = group
    const remoteKey = publicRuntimeKey(asset.path)
    return {
      path: asset.path,
      aliasPaths: [
        ...aliases.map((entry) => entry.path),
        ...(runtimeSourceAliases.get(asset.sha256) || []),
      ].sort(),
      bytes: asset.bytes,
      sha256: asset.sha256,
      mimeType: asset.mimeType,
      access: 'public',
      remoteKey,
      downloadUrl: publicDownloadUrl(baseUrl, remoteKey),
      action: 'proposed-upload',
    }
  })
  const sourceEntries = groupAssetsByDigest(sourceAssets).map((group) => {
    const [asset, ...aliases] = group
    const remoteKey = protectedSourceKey(asset.path)
    return {
      path: asset.path,
      aliasPaths: aliases.map((entry) => entry.path),
      bytes: asset.bytes,
      sha256: asset.sha256,
      mimeType: asset.mimeType,
      access: 'protected',
      remoteKey,
      downloadUrl: publicDownloadUrl(baseUrl, remoteKey),
      action: 'proposed-upload',
    }
  })
  const entries = [...runtimeEntries, ...sourceEntries]
    .sort((left, right) => left.remoteKey.localeCompare(right.remoteKey))
  const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0)

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    inventoryHead: inventory.repository.head,
    status: 'PROPOSED_NOT_APPROVED',
    approved: false,
    mode: 'complete-single-copy',
    limits: { maxFiles: entries.length, maxBytes: totalBytes },
    summary: {
      runtimeObjects: runtimeEntries.length,
      sourceObjects: sourceEntries.length,
      aliasPaths: entries.reduce((sum, entry) => sum + entry.aliasPaths.length, 0),
      totalBytes,
    },
    impact: {
      runtimeReferenceChanges: 'required-after-download-verification',
      localDeletions: 0,
      gitHistoryRewrite: false,
    },
    entries,
  }
}

export function approveMigrationPlan(plan, approvalSource) {
  const source = String(approvalSource || '').trim()
  if (!source) throw new Error('An approval source is required')
  return {
    ...plan,
    status: 'APPROVED',
    approved: true,
    approvedAt: new Date().toISOString(),
    approvalSource: source,
    entries: plan.entries.map((entry) => ({ ...entry, action: 'upload' })),
  }
}

export function assertExecutablePlan(plan) {
  if (plan?.approved !== true || plan?.status !== 'APPROVED') {
    throw new Error('Migration plan is not explicitly approved')
  }
  if (!['public-runtime-single-copy', 'complete-single-copy'].includes(plan?.mode)) {
    throw new Error('Only reviewed single-copy plans are executable')
  }
  if (!Array.isArray(plan.entries) || plan.entries.length === 0) {
    throw new Error('Migration plan has no entries')
  }
  if (plan.entries.length > Number(plan.limits?.maxFiles || 0)) {
    throw new Error('Migration plan exceeds its file-count limit')
  }
  const totalBytes = plan.entries.reduce((sum, entry) => sum + Number(entry.bytes || 0), 0)
  if (totalBytes > Number(plan.limits?.maxBytes || 0)) {
    throw new Error('Migration plan exceeds its byte limit')
  }
  const digests = new Set()
  for (const entry of plan.entries) {
    if (entry.action !== 'upload') throw new Error(`Entry is not approved for upload: ${entry.path}`)
    if (entry.access === 'protected') {
      if (!String(entry.path || '').startsWith('output/imagegen/')) {
        throw new Error(`Entry is not a generated source asset: ${entry.path}`)
      }
      if (!String(entry.remoteKey || '').startsWith(PROTECTED_SOURCE_PREFIX)) {
        throw new Error(`Entry uses an unsafe protected source prefix: ${entry.path}`)
      }
    } else {
      if (!String(entry.path || '').startsWith('public/')) {
        throw new Error(`Entry is not a public runtime asset: ${entry.path}`)
      }
      if (!String(entry.remoteKey || '').startsWith(PUBLIC_RUNTIME_PREFIX)) {
        throw new Error(`Entry uses an unsafe public runtime prefix: ${entry.path}`)
      }
      if (
        Array.isArray(entry.duplicatePaths)
        && entry.duplicatePaths.some((path) => String(path).startsWith('public/'))
      ) {
        throw new Error(`Entry requires duplicate review: ${entry.path}`)
      }
    }
    if (!/^[a-f0-9]{64}$/.test(String(entry.sha256 || ''))) {
      throw new Error(`Entry has an invalid SHA-256: ${entry.path}`)
    }
    if (digests.has(entry.sha256)) throw new Error(`Plan contains a duplicate object: ${entry.path}`)
    digests.add(entry.sha256)
  }
  return { totalBytes, fileCount: plan.entries.length }
}

export function assertVerifiedMigrationResults(plan, resultDocument) {
  const executable = assertExecutablePlan(plan)
  if (resultDocument?.schemaVersion !== 1 || !Array.isArray(resultDocument?.results)) {
    throw new Error('Migration result document is invalid')
  }
  const byRemoteKey = new Map()
  for (const result of resultDocument.results) {
    if (!['verified', 'already-verified'].includes(result?.status)) continue
    if (byRemoteKey.has(result.remoteKey)) {
      throw new Error(`Migration result contains a duplicate key: ${result.remoteKey}`)
    }
    byRemoteKey.set(result.remoteKey, result)
  }
  for (const entry of plan.entries) {
    const result = byRemoteKey.get(entry.remoteKey)
    if (
      !result
      || result.path !== entry.path
      || result.sha256 !== entry.sha256
      || Number(result.bytes) !== Number(entry.bytes)
    ) {
      throw new Error(`Migration result is missing or mismatched: ${entry.remoteKey}`)
    }
  }
  if (byRemoteKey.size !== plan.entries.length) {
    throw new Error('Migration result contains objects outside the approved plan')
  }
  return { ...executable, verifiedFiles: byRemoteKey.size }
}

export function buildUploadUrl(baseUrl, remoteKey) {
  const normalizedKey = normalizeRepoPath(remoteKey)
  const folder = dirname(normalizedKey).replaceAll('\\', '/')
  const url = new URL('/upload', String(baseUrl).replace(/\/+$/, ''))
  url.searchParams.set('uploadChannel', 'huggingface')
  url.searchParams.set('uploadFolder', folder)
  url.searchParams.set('uploadNameType', 'origin')
  url.searchParams.set('returnFormat', 'full')
  url.searchParams.set('autoRetry', 'false')
  url.searchParams.set('onConflict', 'reject')
  return url
}

export function safePreflightSummary({ baseUrl, tokenConfigured, checks }) {
  return { baseUrl, tokenConfigured: Boolean(tokenConfigured), checks }
}
