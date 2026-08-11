import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import {
  DEFAULT_IMAGE_BED_URL,
  IMAGE_BED_COMMIT,
  approveMigrationPlan,
  assertExecutablePlan,
  buildCompleteMigrationPlan,
  buildFirstBatchPlan,
  buildInventory,
  buildUploadUrl,
  huggingFaceCommitRateLimitRetryMs,
  listTrackedFiles,
  publicDownloadUrl,
  runGit,
  safePreflightSummary,
  sha256File,
} from './imgbed-migration-lib.mjs'

const repoRoot = resolve(import.meta.dirname, '..')
const defaultImageBedRepo = resolve(repoRoot, '..', 'CloudFlare-ImgBed')

function parseArguments(values) {
  const [command = 'help', ...rest] = values
  const options = {}
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    if (rest[index + 1] && !rest[index + 1].startsWith('--')) {
      options[key] = rest[index + 1]
      index += 1
    } else {
      options[key] = true
    }
  }
  return { command, options }
}

function loadLocalEnvironment() {
  const envPath = resolve(repoRoot, '.env.local')
  if (existsSync(envPath)) process.loadEnvFile(envPath)
  return envPath
}

function baseUrl() {
  return String(process.env.SCHATPHONE_IMGBED_BASE_URL || DEFAULT_IMAGE_BED_URL).replace(/\/+$/, '')
}

function migrationToken() {
  return String(process.env.SCHATPHONE_IMGBED_TOKEN || '').trim()
}

async function writeJson(targetPath, value) {
  const absolutePath = resolve(repoRoot, targetPath)
  await mkdir(dirname(absolutePath), { recursive: true })
  const temporaryPath = `${absolutePath}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, absolutePath)
  return absolutePath
}

async function runInventory(options) {
  const output = options.output || '.imgbed-migration/IMGBED_INVENTORY_2026-08-11.json'
  const inventory = await buildInventory(repoRoot)
  const absolutePath = await writeJson(output, inventory)
  console.log(JSON.stringify({
    output: absolutePath,
    assetCount: inventory.summary.assetCount,
    totalBytes: inventory.summary.totalBytes,
    duplicatePotentialBytes: inventory.summary.duplicatePotentialBytes,
    packedGitBytes: inventory.gitHistory.packedBytes,
  }))
}

async function runPlan(options) {
  const inventoryPath = resolve(
    repoRoot,
    options.inventory || '.imgbed-migration/IMGBED_INVENTORY_2026-08-11.json',
  )
  const output = options.output || '.imgbed-migration/IMGBED_FIRST_BATCH_2026-08-11.json'
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'))
  const plan = buildFirstBatchPlan(inventory, baseUrl())
  const absolutePath = await writeJson(output, plan)
  console.log(JSON.stringify({
    output: absolutePath,
    status: plan.status,
    sourceDirectory: plan.sourceDirectory,
    fileCount: plan.entries.length,
    totalBytes: plan.entries.reduce((sum, entry) => sum + entry.bytes, 0),
  }))
}

async function runCompletePlan(options) {
  const inventoryPath = resolve(
    repoRoot,
    options.inventory || '.imgbed-migration/IMGBED_INVENTORY_2026-08-11.json',
  )
  const output = options.output || '.imgbed-migration/IMGBED_COMPLETE_PLAN_2026-08-11.json'
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'))
  let plan = buildCompleteMigrationPlan(inventory, baseUrl())
  if (options.approve === true) {
    plan = approveMigrationPlan(plan, options['approval-source'])
  }
  const absolutePath = await writeJson(output, plan)
  console.log(JSON.stringify({
    output: absolutePath,
    status: plan.status,
    ...plan.summary,
  }))
}

async function requestStatus(url, init = {}) {
  try {
    const response = await fetch(url, { redirect: 'manual', ...init })
    return response.status
  } catch (error) {
    return `network-error:${error.name}`
  }
}

async function runPreflight(options) {
  const envPath = loadLocalEnvironment()
  const token = migrationToken()
  const imageBedRepo = resolve(options['imagebed-repo'] || defaultImageBedRepo)
  runGit(repoRoot, ['check-ignore', '-q', envPath])
  const imageBedCommit = runGit(imageBedRepo, ['rev-parse', 'HEAD']).trim()
  runGit(imageBedRepo, ['merge-base', '--is-ancestor', IMAGE_BED_COMMIT, 'HEAD'])

  const checks = {
    schatphoneHead: runGit(repoRoot, ['rev-parse', 'HEAD']).trim(),
    schatphoneTrackedFiles: listTrackedFiles(repoRoot).length,
    envLocalIgnored: true,
    imageBedRepo,
    imageBedCommit,
    imageBedCommitVerified: true,
    anonymousUploadStatus: await requestStatus(`${baseUrl()}/upload`),
    anonymousProtectedSmokeStatus: await requestStatus(
      `${baseUrl()}/file/schatphone-source/smoke/schatphone-imgbed-smoke-20260811.txt`,
    ),
    tokenListStatus: token
      ? await requestStatus(`${baseUrl()}/api/manage/list?dir=schatphone-source&count=1`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      : 'not-run',
  }
  console.log(JSON.stringify(safePreflightSummary({
    baseUrl: baseUrl(),
    tokenConfigured: Boolean(token),
    checks,
  }), null, 2))

  const failed = checks.anonymousUploadStatus !== 401
    || checks.anonymousProtectedSmokeStatus !== 401
    || (options['require-token'] === true && checks.tokenListStatus !== 200)
  if (failed) process.exitCode = 1
}

async function runUpload(options) {
  if (options.execute !== true) throw new Error('Upload requires the explicit --execute flag')
  loadLocalEnvironment()
  const token = migrationToken()
  if (!token) throw new Error('SCHATPHONE_IMGBED_TOKEN is not configured')
  const planPath = resolve(repoRoot, options.plan || '')
  if (!options.plan || !existsSync(planPath)) throw new Error('An existing --plan file is required')

  const plan = JSON.parse(await readFile(planPath, 'utf8'))
  const approved = assertExecutablePlan(plan)
  const resultPath = options.output || `${planPath.slice(repoRoot.length + 1)}.results.json`
  const absoluteResultPath = resolve(repoRoot, resultPath)
  let results = []
  if (options.resume === true && existsSync(absoluteResultPath)) {
    const previous = JSON.parse(await readFile(absoluteResultPath, 'utf8'))
    results = Array.isArray(previous.results) ? previous.results : []
  }
  const completedKeys = new Set(results
    .filter((entry) => entry.status === 'verified' || entry.status === 'already-verified')
    .map((entry) => `${entry.remoteKey}:${entry.sha256}`))

  const persistResults = async () => writeJson(resultPath, {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    planPath: planPath.slice(repoRoot.length + 1).replaceAll('\\', '/'),
    approved,
    results,
  })

  for (const entry of plan.entries) {
    if (completedKeys.has(`${entry.remoteKey}:${entry.sha256}`)) continue
    const sourcePath = resolve(repoRoot, entry.path)
    if (await sha256File(sourcePath) !== entry.sha256) {
      throw new Error(`Local digest changed before upload: ${entry.path}`)
    }
    const bytes = await readFile(sourcePath)
    let uploadResponse
    while (true) {
      const form = new FormData()
      form.set('file', new Blob([bytes], { type: entry.mimeType }), basename(entry.path))
      form.set('sha256', entry.sha256)
      uploadResponse = await fetch(buildUploadUrl(baseUrl(), entry.remoteKey), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (uploadResponse.ok || (options.resume === true && uploadResponse.status === 409)) break

      const responseBody = (await uploadResponse.text()).trim().slice(0, 1000)
      const retryMs = options.resume === true
        ? huggingFaceCommitRateLimitRetryMs(uploadResponse.status, responseBody)
        : null
      if (retryMs !== null) {
        console.log(JSON.stringify({
          status: 'rate-limited',
          remoteKey: entry.remoteKey,
          retryAt: new Date(Date.now() + retryMs).toISOString(),
        }))
        await delay(retryMs)
        continue
      }

      const detail = responseBody ? `\n${responseBody}` : ''
      throw new Error(`Upload failed with HTTP ${uploadResponse.status}: ${entry.remoteKey}${detail}`)
    }
    if (uploadResponse.ok) {
      const payload = await uploadResponse.json()
      const uploaded = Array.isArray(payload) ? payload[0] : null
      if (uploaded?.fileId !== entry.remoteKey || uploaded?.sha256 !== entry.sha256) {
        throw new Error(`Upload response integrity mismatch: ${entry.remoteKey}`)
      }
    }

    const downloadResponse = await fetch(publicDownloadUrl(baseUrl(), entry.remoteKey), {
      headers: entry.access === 'protected' ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!downloadResponse.ok) {
      throw new Error(
        `Anonymous verification download failed with HTTP ${downloadResponse.status}: ${entry.remoteKey}`,
      )
    }
    const downloadedBytes = Buffer.from(await downloadResponse.arrayBuffer())
    const downloadedSha256 = createHash('sha256').update(downloadedBytes).digest('hex')
    if (downloadedSha256 !== entry.sha256 || downloadedBytes.length !== entry.bytes) {
      throw new Error(`Downloaded object failed integrity verification: ${entry.remoteKey}`)
    }
    results.push({
      path: entry.path,
      remoteKey: entry.remoteKey,
      bytes: downloadedBytes.length,
      sha256: downloadedSha256,
      status: uploadResponse.status === 409 ? 'already-verified' : 'verified',
    })
    await persistResults()
  }

  const absolutePath = await persistResults()
  console.log(JSON.stringify({ output: absolutePath, verifiedFiles: results.length }))
}

function printHelp() {
  console.log(`SchatPhone image-bed migration tooling

Commands:
  inventory [--output <path>]       Build the tracked media and Git history inventory.
  plan [--inventory <path>]         Propose one public runtime first batch.
  plan-all [--approve --approval-source <text>]
                                     Build a deduplicated runtime and source plan.
  preflight [--require-token]       Verify local checkout and production auth boundaries.
  upload --plan <path> --execute [--resume]
                                     Upload an explicitly approved plan with checkpoints.

Uploads require authentication; verification downloads are anonymous. The command never deletes files.`)
}

const { command, options } = parseArguments(process.argv.slice(2))
try {
  if (command === 'inventory') await runInventory(options)
  else if (command === 'plan') await runPlan(options)
  else if (command === 'plan-all') await runCompletePlan(options)
  else if (command === 'preflight') await runPreflight(options)
  else if (command === 'upload') await runUpload(options)
  else printHelp()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
