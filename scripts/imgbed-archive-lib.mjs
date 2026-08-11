import { constants, existsSync } from 'node:fs'
import {
  copyFile,
  mkdir,
  readFile,
  realpath,
  rename,
  stat,
  statfs,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import {
  assertVerifiedMigrationResults,
  normalizeRepoPath,
  sha256File,
} from './imgbed-migration-lib.mjs'
import { assertPublishPlan } from './imgbed-publish-lib.mjs'

function safeRelativePath(value) {
  const path = normalizeRepoPath(value)
  if (
    !path
    || path.startsWith('/')
    || /^[a-zA-Z]:\//.test(path)
    || path.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`Unsafe archive source path: ${value}`)
  }
  return path
}

export function isInside(root, target) {
  const path = relative(root, target)
  return path && !isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`)
}

async function verifiedMetadata(filePath, expected, label) {
  const fileStat = await stat(filePath)
  if (!fileStat.isFile() || fileStat.size !== Number(expected.bytes)) {
    throw new Error(`${label} size mismatch: ${expected.path}`)
  }
  const digest = await sha256File(filePath)
  if (digest !== expected.sha256) {
    throw new Error(`${label} SHA-256 mismatch: ${expected.path}`)
  }
  return { bytes: fileStat.size, sha256: digest }
}

async function atomicWriteJson(targetPath, value) {
  await mkdir(dirname(targetPath), { recursive: true })
  const temporaryPath = `${targetPath}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, targetPath)
}

export function migrationArchiveEntries(plan, resultDocument) {
  if (plan?.mode) {
    assertVerifiedMigrationResults(plan, resultDocument)
  } else {
    assertPublishPlan(plan)
    if (resultDocument?.schemaVersion !== 1 || !Array.isArray(resultDocument?.results)) {
      throw new Error('Project asset result document is invalid')
    }
    const byRemoteKey = new Map()
    for (const result of resultDocument.results) {
      if (result?.status !== 'verified' || byRemoteKey.has(result.remoteKey)) {
        throw new Error('Project asset result document is not uniquely verified')
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
        throw new Error(`Project asset result is missing or mismatched: ${entry.remoteKey}`)
      }
    }
    if (byRemoteKey.size !== plan.entries.length) {
      throw new Error('Project asset result contains objects outside the approved plan')
    }
  }
  const paths = new Set()
  const entries = []
  for (const entry of plan.entries) {
    for (const candidate of [entry.path, ...(entry.aliasPaths || [])]) {
      const path = safeRelativePath(candidate)
      if (paths.has(path)) throw new Error(`Archive source path is duplicated: ${path}`)
      paths.add(path)
      entries.push({
        path,
        bytes: Number(entry.bytes),
        sha256: entry.sha256,
        remoteKey: entry.remoteKey,
        downloadUrl: entry.downloadUrl,
      })
    }
  }
  return entries
}

export async function createMigrationArchive({
  repoRoot,
  archiveRoot,
  plan,
  resultDocument,
  recordPaths = [],
  manifestName = 'archive-manifest.json',
}) {
  const sourceRoot = await realpath(resolve(repoRoot))
  const destinationRoot = resolve(archiveRoot)
  if (isInside(sourceRoot, destinationRoot) || sourceRoot === destinationRoot) {
    throw new Error('Migration archive must be outside the repository')
  }
  await mkdir(destinationRoot, { recursive: true })
  const realDestinationRoot = await realpath(destinationRoot)
  const entries = migrationArchiveEntries(plan, resultDocument)
  const prepared = []
  let missingBytes = 0

  for (const entry of entries) {
    const sourcePath = resolve(sourceRoot, entry.path)
    const realSourcePath = await realpath(sourcePath)
    if (!isInside(sourceRoot, realSourcePath)) {
      throw new Error(`Archive source escapes the repository: ${entry.path}`)
    }
    await verifiedMetadata(realSourcePath, entry, 'Source')
    const archivePath = resolve(realDestinationRoot, entry.path)
    if (!isInside(realDestinationRoot, archivePath)) {
      throw new Error(`Archive destination escapes its root: ${entry.path}`)
    }
    if (existsSync(archivePath)) {
      await verifiedMetadata(archivePath, entry, 'Existing archive')
    } else {
      missingBytes += entry.bytes
    }
    prepared.push({ ...entry, sourcePath: realSourcePath, archivePath })
  }

  const capacity = await statfs(realDestinationRoot)
  const availableBytes = Number(capacity.bavail) * Number(capacity.bsize)
  if (availableBytes < missingBytes) {
    throw new Error(`Archive destination needs ${missingBytes} bytes but has ${availableBytes}`)
  }

  for (const entry of prepared) {
    if (!existsSync(entry.archivePath)) {
      await mkdir(dirname(entry.archivePath), { recursive: true })
      await copyFile(entry.sourcePath, entry.archivePath, constants.COPYFILE_EXCL)
    }
    await verifiedMetadata(entry.archivePath, entry, 'Archive')
  }

  const recordDirectory = resolve(realDestinationRoot, '_records')
  await mkdir(recordDirectory, { recursive: true })
  const records = []
  for (const candidate of recordPaths) {
    const sourcePath = resolve(candidate)
    if (!existsSync(sourcePath)) continue
    const targetPath = resolve(recordDirectory, basename(sourcePath))
    const sourceStat = await stat(sourcePath)
    const sourceSha256 = await sha256File(sourcePath)
    if (existsSync(targetPath)) {
      const targetStat = await stat(targetPath)
      const targetSha256 = await sha256File(targetPath)
      if (targetStat.size !== sourceStat.size || targetSha256 !== sourceSha256) {
        throw new Error(`Archive record conflicts with an existing file: ${basename(sourcePath)}`)
      }
    } else {
      await copyFile(sourcePath, targetPath, constants.COPYFILE_EXCL)
    }
    records.push({
      sourcePath,
      archivePath: targetPath,
      bytes: sourceStat.size,
      sha256: sourceSha256,
    })
  }

  if (basename(manifestName) !== manifestName || !manifestName.endsWith('.json')) {
    throw new Error('Archive manifest name must be a JSON filename')
  }
  const manifestPath = resolve(recordDirectory, manifestName)
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    sourceRoot,
    archiveRoot: realDestinationRoot,
    status: 'COPIED_AND_VERIFIED',
    summary: {
      files: prepared.length,
      bytes: prepared.reduce((sum, entry) => sum + entry.bytes, 0),
      records: records.length,
    },
    files: prepared.map((entry) => ({
      path: entry.path,
      archivePath: entry.archivePath,
      bytes: entry.bytes,
      sha256: entry.sha256,
      remoteKey: entry.remoteKey,
      downloadUrl: entry.downloadUrl,
    })),
    records,
  }
  await atomicWriteJson(manifestPath, manifest)
  return { manifestPath, manifest }
}

export async function removeVerifiedArchiveSources({
  repoRoot,
  manifestPath,
  plan,
  resultDocument,
  execute = false,
  referencesMigrated = false,
}) {
  if (!execute || !referencesMigrated) {
    throw new Error('Removal requires --execute and --references-migrated')
  }
  const sourceRoot = await realpath(resolve(repoRoot))
  const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'))
  const expectedEntries = migrationArchiveEntries(plan, resultDocument)
  if (
    manifest?.schemaVersion !== 1
    || manifest?.status !== 'COPIED_AND_VERIFIED'
    || !Array.isArray(manifest?.files)
    || manifest.sourceRoot !== sourceRoot
  ) {
    throw new Error('Archive manifest is not eligible for source removal')
  }
  if (manifest.files.length !== expectedEntries.length) {
    throw new Error('Archive manifest does not match the approved migration plan')
  }
  const expectedByPath = new Map(expectedEntries.map((entry) => [entry.path, entry]))
  const archiveRoot = await realpath(resolve(manifest.archiveRoot))

  const removable = []
  for (const entry of manifest.files) {
    const path = safeRelativePath(entry.path)
    const expected = expectedByPath.get(path)
    if (
      !expected
      || expected.bytes !== Number(entry.bytes)
      || expected.sha256 !== entry.sha256
      || expected.remoteKey !== entry.remoteKey
      || expected.downloadUrl !== entry.downloadUrl
    ) {
      throw new Error(`Archive manifest entry is outside the approved migration plan: ${path}`)
    }
    const sourcePath = resolve(sourceRoot, path)
    if (!isInside(sourceRoot, sourcePath)) throw new Error(`Unsafe removal path: ${path}`)
    const archivePath = await realpath(resolve(entry.archivePath))
    if (!isInside(archiveRoot, archivePath) || archivePath !== resolve(archiveRoot, path)) {
      throw new Error(`Archive file is outside the verified archive root: ${path}`)
    }
    await verifiedMetadata(archivePath, entry, 'Archive')
    if (existsSync(sourcePath)) {
      const realSourcePath = await realpath(sourcePath)
      if (!isInside(sourceRoot, realSourcePath)) throw new Error(`Removal source escapes repository: ${path}`)
      await verifiedMetadata(realSourcePath, entry, 'Source')
      removable.push(realSourcePath)
    }
  }

  for (const sourcePath of removable) await unlink(sourcePath)
  const updated = {
    ...manifest,
    status: 'SOURCES_REMOVED',
    removedAt: new Date().toISOString(),
    removedFiles: removable.length,
  }
  await atomicWriteJson(resolve(manifestPath), updated)
  return updated
}
