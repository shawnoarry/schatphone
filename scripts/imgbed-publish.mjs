import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import {
  assertPublishPlan,
  assertBatchUploadResult,
  buildBatchManifest,
  buildBatchUploadUrl,
  buildPublishPlan,
  chunkPublishEntries,
  createEmptyAssetRegistry,
  mergeVerifiedAssets,
  normalizeImageBedBaseUrl,
  PROJECT_ASSET_REGISTRY_PATH,
  stagedAssetViolations,
  validateAssetRegistry,
} from './imgbed-publish-lib.mjs'
import {
  assertVerifiedMigrationResults,
  publicDownloadUrl,
  runGit,
  sha256File,
} from './imgbed-migration-lib.mjs'

const repoRoot = resolve(import.meta.dirname, '..')

function parseArguments(values) {
  const [command = 'help', ...rest] = values
  const options = {}
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    const next = rest[index + 1]
    const optionValue = next && !next.startsWith('--') ? next : true
    if (optionValue !== true) index += 1
    if (options[key] === undefined) options[key] = optionValue
    else if (Array.isArray(options[key])) options[key].push(optionValue)
    else options[key] = [options[key], optionValue]
  }
  return { command, options }
}

function optionList(value) {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function loadLocalEnvironment() {
  const envPath = resolve(repoRoot, '.env.local')
  if (existsSync(envPath)) process.loadEnvFile(envPath)
}

async function writeJson(targetPath, value) {
  const absolutePath = resolve(repoRoot, targetPath)
  await mkdir(dirname(absolutePath), { recursive: true })
  const temporaryPath = `${absolutePath}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, absolutePath)
  return absolutePath
}

async function readRegistry(baseUrl) {
  const registryPath = resolve(repoRoot, PROJECT_ASSET_REGISTRY_PATH)
  if (!existsSync(registryPath)) return createEmptyAssetRegistry(baseUrl)
  return validateAssetRegistry(JSON.parse(await readFile(registryPath, 'utf8')))
}

async function runPrepare(options) {
  const batchId = String(options.batch || '').trim()
  const plan = await buildPublishPlan({
    repoRoot,
    batchId,
    runtime: optionList(options.runtime),
    source: optionList(options.source),
    baseUrl: process.env.SCHATPHONE_IMGBED_BASE_URL,
    approved: options.approve === true,
    approvalSource: options['approval-source'],
  })
  const output = options.output || `.imgbed-publish/${batchId}.plan.json`
  console.log(JSON.stringify({
    output: await writeJson(output, plan),
    status: plan.status,
    ...plan.summary,
  }))
}

async function verifyRemote(entry, token, baseUrl) {
  const downloadUrl = new URL(
    `/file/${entry.remoteKey.split('/').map(encodeURIComponent).join('/')}`,
    baseUrl,
  ).toString()
  const response = await fetch(downloadUrl, {
    headers: entry.access === 'protected' ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new Error(`Verification download failed with HTTP ${response.status}: ${entry.remoteKey}`)
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  const digest = createHash('sha256').update(bytes).digest('hex')
  if (bytes.length !== entry.bytes || digest !== entry.sha256) {
    throw new Error(`Verification digest mismatch: ${entry.remoteKey}`)
  }
  return {
    ...entry,
    downloadUrl,
    status: 'verified',
    verifiedAt: new Date().toISOString(),
  }
}

async function runPublish(options) {
  if (options.execute !== true) throw new Error('Publishing requires the explicit --execute flag')
  loadLocalEnvironment()
  const token = String(process.env.SCHATPHONE_IMGBED_PROJECT_TOKEN || '').trim()
  if (!token) throw new Error('SCHATPHONE_IMGBED_PROJECT_TOKEN is not configured')
  const planPath = resolve(repoRoot, String(options.plan || ''))
  if (!options.plan || !existsSync(planPath)) throw new Error('An existing --plan file is required')
  const plan = assertPublishPlan(JSON.parse(await readFile(planPath, 'utf8')))
  const configuredBaseUrl = normalizeImageBedBaseUrl(process.env.SCHATPHONE_IMGBED_BASE_URL)
  if (plan.baseUrl !== configuredBaseUrl) {
    throw new Error(`Plan image-bed origin does not match SCHATPHONE_IMGBED_BASE_URL: ${plan.baseUrl}`)
  }

  for (const entry of plan.entries) {
    const absolutePath = resolve(repoRoot, entry.path)
    if (!existsSync(absolutePath) || await sha256File(absolutePath) !== entry.sha256) {
      throw new Error(`Local asset changed after plan approval: ${entry.path}`)
    }
  }

  const chunks = chunkPublishEntries(plan.entries)
  const uploaded = []
  const resultPath = options.output || `.imgbed-publish/${plan.batchId}.results.json`
  for (let index = 0; index < chunks.length; index += 1) {
    const entries = chunks[index]
    const batchId = chunks.length === 1
      ? plan.batchId
      : `${plan.batchId}-${index + 1}-of-${chunks.length}`
    const formData = new FormData()
    formData.set('manifest', JSON.stringify(buildBatchManifest(batchId, entries)))
    for (let fileIndex = 0; fileIndex < entries.length; fileIndex += 1) {
      const entry = entries[fileIndex]
      const bytes = await readFile(resolve(repoRoot, entry.path))
      formData.set(
        `file-${fileIndex}`,
        new Blob([bytes], { type: entry.mimeType }),
        entry.path.slice(entry.path.lastIndexOf('/') + 1),
      )
    }
    const response = await fetch(buildBatchUploadUrl(plan.baseUrl), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!response.ok) {
      const detail = (await response.text()).trim().slice(0, 1000)
      throw new Error(`Batch publish failed with HTTP ${response.status}: ${detail}`)
    }
    const result = await response.json()
    assertBatchUploadResult(entries, result)
    const verified = await Promise.all(entries.map((entry) => (
      verifyRemote(entry, token, configuredBaseUrl)
    )))
    uploaded.push(...verified)
    await writeJson(resultPath, {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      planPath: options.plan,
      completedChunks: index + 1,
      totalChunks: chunks.length,
      results: uploaded,
    })
  }

  const registry = mergeVerifiedAssets(await readRegistry(plan.baseUrl), plan, uploaded)
  await writeJson(PROJECT_ASSET_REGISTRY_PATH, registry)
  console.log(JSON.stringify({
    batchId: plan.batchId,
    verifiedFiles: uploaded.length,
    registry: resolve(repoRoot, PROJECT_ASSET_REGISTRY_PATH),
  }))
}

async function runCheck(options) {
  const registry = await readRegistry(process.env.SCHATPHONE_IMGBED_BASE_URL)
  const stagedPaths = options.staged === true
    ? runGit(repoRoot, ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
      .split('\0').filter(Boolean)
    : runGit(repoRoot, ['ls-files', '-z']).split('\0').filter(Boolean)
      .filter((path) => existsSync(resolve(repoRoot, path)))
  const violations = stagedAssetViolations(stagedPaths)
  if (violations.length > 0) {
    throw new Error(`Local project media must be published before commit:\n${violations.join('\n')}`)
  }
  console.log(JSON.stringify({
    registryAssets: registry.assets.length,
    checked: options.staged === true ? 'staged' : 'tracked',
    violations: 0,
  }))
}

async function runImportMigration(options) {
  if (options.execute !== true) throw new Error('Registry import requires the explicit --execute flag')
  if (!options.plan || !options.results || !options.batch) {
    throw new Error('Registry import requires --plan, --results, and --batch')
  }
  const plan = JSON.parse(await readFile(resolve(repoRoot, options.plan), 'utf8'))
  const resultDocument = JSON.parse(await readFile(resolve(repoRoot, options.results), 'utf8'))
  assertVerifiedMigrationResults(plan, resultDocument)
  const migrationBaseUrl = normalizeImageBedBaseUrl(new URL(plan.entries[0].downloadUrl).origin)
  for (const entry of plan.entries) {
    if (entry.downloadUrl !== publicDownloadUrl(migrationBaseUrl, entry.remoteKey)) {
      throw new Error(`Migration entry has an invalid download URL: ${entry.remoteKey}`)
    }
  }
  const verifiedAt = resultDocument.updatedAt || new Date().toISOString()
  const verifiedEntries = plan.entries.map((entry) => ({
    ...entry,
    verifiedAt,
  }))
  const registry = mergeVerifiedAssets(
    await readRegistry(migrationBaseUrl),
    { batchId: String(options.batch), baseUrl: migrationBaseUrl },
    verifiedEntries,
  )
  await writeJson(PROJECT_ASSET_REGISTRY_PATH, registry)
  console.log(JSON.stringify({ imported: verifiedEntries.length, registry: PROJECT_ASSET_REGISTRY_PATH }))
}

function printHelp() {
  console.log(`SchatPhone project asset publishing

Commands:
  prepare --batch <id> [--runtime <local>=<remote>] [--source <local>=<remote>]
          [--approve --approval-source <text>] [--output <path>]
  publish --plan <path> --execute [--output <path>]
  import-migration --plan <path> --results <path> --batch <id> --execute
  check [--staged]

Publishing uses SCHATPHONE_IMGBED_PROJECT_TOKEN. The token is never written to a plan,
result, registry, log, or source-controlled file.`)
}

const { command, options } = parseArguments(process.argv.slice(2))
try {
  if (command === 'prepare') await runPrepare(options)
  else if (command === 'publish') await runPublish(options)
  else if (command === 'import-migration') await runImportMigration(options)
  else if (command === 'check') await runCheck(options)
  else printHelp()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
