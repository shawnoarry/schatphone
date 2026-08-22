import { spawnSync } from 'node:child_process'
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  assertAutomaticPublishPlan,
  assertBatchUploadResult,
  assertCompletedPublishResult,
  assertPublishPlan,
  assertPublishQueueCompatible,
  buildBatchManifest,
  buildPublishPlan,
  chunkPublishEntries,
  createEmptyAssetRegistry,
  mergeVerifiedAssets,
  normalizeImageBedBaseUrl,
  registryCoversPublishPlan,
  stagedAssetViolations,
  validateAssetRegistry,
} from '../scripts/imgbed-publish-lib.mjs'

async function fixtureRepo() {
  const root = await mkdtemp(join(tmpdir(), 'schatphone-publish-'))
  await mkdir(join(root, 'output/imagegen/poster'), { recursive: true })
  await writeFile(join(root, 'output/imagegen/poster/runtime.png'), 'runtime')
  await writeFile(join(root, 'output/imagegen/poster/master.png'), 'master')
  return root
}

function runFixtureCommand(root, command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, SCHATPHONE_IMGBED_PROJECT_TOKEN: '' },
  })
}

function runFixtureGit(root, args) {
  const result = runFixtureCommand(root, 'git', args)
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed`)
  return result.stdout
}

async function fixturePublishCliRepo() {
  const root = await fixtureRepo()
  await mkdir(join(root, 'scripts'), { recursive: true })
  await mkdir(join(root, 'config'), { recursive: true })
  await mkdir(join(root, '.imgbed-publish'), { recursive: true })
  for (const name of ['imgbed-publish.mjs', 'imgbed-publish-lib.mjs', 'imgbed-migration-lib.mjs']) {
    await copyFile(resolve(process.cwd(), 'scripts', name), join(root, 'scripts', name))
  }
  await writeFile(join(root, '.gitignore'), '.imgbed-publish/\noutput/imagegen/\n')
  await writeFile(
    join(root, 'config/project-assets.json'),
    `${JSON.stringify(createEmptyAssetRegistry(), null, 2)}\n`,
  )
  runFixtureGit(root, ['init'])
  runFixtureGit(root, ['add', '.gitignore', 'config/project-assets.json'])
  runFixtureGit(root, [
    '-c', 'user.name=SchatPhone Test',
    '-c', 'user.email=test@schatphone.invalid',
    'commit', '-m', 'fixture baseline',
  ])
  return root
}

describe('image-bed project publishing', () => {
  it('accepts the asset-upload-list confirmation CLI language', async () => {
    const repoRoot = await fixturePublishCliRepo()
    const prepared = runFixtureCommand(repoRoot, process.execPath, [
      'scripts/imgbed-publish.mjs',
      'prepare',
      '--batch',
      'confirmed-list',
      '--runtime',
      'output/imagegen/poster/runtime.png=briefings/confirmed.png',
      '--confirm',
      '--confirmation-source',
      'test-confirmed',
    ])
    expect(prepared.status).toBe(0)
    const plan = JSON.parse(await readFile(
      join(repoRoot, '.imgbed-publish/confirmed-list.plan.json'),
      'utf8',
    ))
    expect(plan).toMatchObject({
      status: 'APPROVED',
      approved: true,
      approvalSource: 'test-confirmed',
    })
  }, 15_000)

  it('builds an approved runtime/source plan with distinct destinations', async () => {
    const repoRoot = await fixtureRepo()
    const plan = await buildPublishPlan({
      repoRoot,
      batchId: 'poster-brief',
      runtime: ['output/imagegen/poster/runtime.png=briefings/runtime.png'],
      source: ['output/imagegen/poster/master.png=briefings/master.png'],
      approved: true,
      approvalSource: 'user-approved-project-asset-workflow',
    })

    expect(assertPublishPlan(plan)).toBe(plan)
    expect(plan.entries.map((entry) => entry.remoteKey)).toEqual([
      'schatphone-assets/briefings/runtime.png',
      'schatphone-source/briefings/master.png',
    ])
    expect(buildBatchManifest(plan.batchId, plan.entries).files).toHaveLength(2)
  })

  it('rejects duplicate bytes instead of storing a second copy', async () => {
    const repoRoot = await fixtureRepo()
    await writeFile(join(repoRoot, 'output/imagegen/poster/master.png'), 'runtime')

    await expect(buildPublishPlan({
      repoRoot,
      batchId: 'duplicate',
      runtime: ['output/imagegen/poster/runtime.png=briefings/runtime.png'],
      source: ['output/imagegen/poster/master.png=briefings/master.png'],
      approved: true,
      approvalSource: 'test',
    })).rejects.toThrow('Identical bytes must be published once')
  })

  it('limits automatic publishing and cleanup to generated output', async () => {
    const repoRoot = await fixtureRepo()
    const plan = await buildPublishPlan({
      repoRoot,
      batchId: 'automatic-output',
      runtime: ['output/imagegen/poster/runtime.png=briefings/runtime.png'],
      approved: true,
      approvalSource: 'test',
    })
    expect(assertAutomaticPublishPlan(plan)).toBe(plan)
    plan.entries[0].path = 'public/images/runtime.png'
    expect(() => assertAutomaticPublishPlan(plan)).toThrow(
      'Automatic publishing only accepts generated output',
    )
  })

  it('splits large jobs into bounded batches', () => {
    const entries = Array.from({ length: 11 }, (_, index) => ({
      path: `${index}.png`,
      bytes: 100,
    }))
    expect(chunkPublishEntries(entries).map((chunk) => chunk.length)).toEqual([10, 1])
  })

  it('accepts only matching upload results', () => {
    const entries = [{ remoteKey: 'schatphone-assets/poster.png', bytes: 7, sha256: 'a'.repeat(64) }]
    const result = {
      results: [{
        fileId: entries[0].remoteKey,
        bytes: 7,
        sha256: 'a'.repeat(64),
        status: 'uploaded',
      }],
    }
    expect(assertBatchUploadResult(entries, result)).toBe(result)
    result.results[0].sha256 = 'b'.repeat(64)
    expect(() => assertBatchUploadResult(entries, result)).toThrow('invalid integrity metadata')
  })

  it('merges verified registry entries and preserves prefix rules', () => {
    const registry = createEmptyAssetRegistry()
    const plan = { batchId: 'poster', baseUrl: registry.baseUrl }
    const verified = [{
      path: 'output/imagegen/poster/runtime.png',
      access: 'public',
      remoteKey: 'schatphone-assets/briefings/runtime.png',
      downloadUrl: `${registry.baseUrl}/file/schatphone-assets/briefings/runtime.png`,
      bytes: 7,
      sha256: 'a'.repeat(64),
      mimeType: 'image/png',
      verifiedAt: '2026-08-11T00:00:00.000Z',
    }]
    const merged = mergeVerifiedAssets(registry, plan, verified)
    expect(validateAssetRegistry(merged).assets).toHaveLength(1)
  })

  it('recognizes completed plans and rejects queue conflicts before upload', async () => {
    const repoRoot = await fixtureRepo()
    const plan = await buildPublishPlan({
      repoRoot,
      batchId: 'completed-plan',
      runtime: ['output/imagegen/poster/runtime.png=briefings/runtime.png'],
      approved: true,
      approvalSource: 'test',
    })
    const result = {
      schemaVersion: 1,
      completedChunks: 1,
      totalChunks: 1,
      results: plan.entries.map((entry) => ({
        ...entry,
        status: 'verified',
        verifiedAt: '2026-08-12T00:00:00.000Z',
      })),
    }
    const verified = assertCompletedPublishResult(plan, result)
    const registry = createEmptyAssetRegistry(plan.baseUrl)
    expect(registryCoversPublishPlan(registry, plan)).toBe(false)
    const merged = mergeVerifiedAssets(registry, plan, verified)
    expect(registryCoversPublishPlan(merged, plan)).toBe(true)

    const conflicting = structuredClone(plan)
    conflicting.batchId = 'conflicting-plan'
    conflicting.entries[0].remoteKey = 'schatphone-assets/briefings/duplicate.png'
    conflicting.entries[0].downloadUrl = `${plan.baseUrl}/file/${conflicting.entries[0].remoteKey}`
    expect(() => assertPublishQueueCompatible(registry, [plan, conflicting])).toThrow(
      'Pending asset bytes already use another key',
    )
  })

  it('rejects unsafe image-bed URLs and plan download URL substitution', async () => {
    expect(() => normalizeImageBedBaseUrl('http://imgbed.example')).toThrow('plain HTTPS origin')
    const repoRoot = await fixtureRepo()
    const plan = await buildPublishPlan({
      repoRoot,
      batchId: 'trusted-origin',
      runtime: ['output/imagegen/poster/runtime.png=briefings/runtime.png'],
      approved: true,
      approvalSource: 'test',
    })
    plan.entries[0].downloadUrl = 'https://example.invalid/token-target'
    expect(() => assertPublishPlan(plan)).toThrow('invalid download URL')
  })

  it('rejects duplicate bytes already present under another registry key', () => {
    const registry = createEmptyAssetRegistry()
    registry.assets.push({
      remoteKey: 'schatphone-assets/existing.png',
      access: 'public',
      bytes: 7,
      sha256: 'a'.repeat(64),
    })
    const verified = [{
      path: 'output/imagegen/poster/runtime.png',
      access: 'public',
      remoteKey: 'schatphone-assets/new.png',
      downloadUrl: `${registry.baseUrl}/file/schatphone-assets/new.png`,
      bytes: 7,
      sha256: 'a'.repeat(64),
      mimeType: 'image/png',
      verifiedAt: '2026-08-11T00:00:00.000Z',
    }]
    expect(() => mergeVerifiedAssets(
      registry,
      { batchId: 'duplicate', baseUrl: registry.baseUrl },
      verified,
    )).toThrow('already contains these bytes')
  })

  it('blocks staged generated/runtime media but retains install icons', () => {
    expect(stagedAssetViolations([
      'output/imagegen/poster/master.png',
      'public/images/poster.png',
      'public/icons/pwa-icon-512.png',
      'src/views/HomeView.vue',
    ])).toEqual([
      'output/imagegen/poster/master.png',
      'public/images/poster.png',
    ])
    expect(stagedAssetViolations(
      ['output/imagegen/poster/master.png', 'public/images/poster.png'],
      ['output/imagegen/poster/master.png'],
    )).toEqual(['public/images/poster.png'])
  })

  it('runs automatic publication before the offline commit gate', async () => {
    const hook = await readFile(resolve(process.cwd(), '.githooks/pre-commit'), 'utf8')
    expect(hook).toContain(
      'publish-pending --stage-registry --cleanup-local --fallback-to-git',
    )
    expect(hook.indexOf('publish-pending')).toBeLessThan(hook.indexOf('check --staged'))
  })

  describe.sequential('cross-PC fallback recovery phases', () => {
    let repoRoot
    let plan
    const planPath = '.imgbed-publish/cross-pc-fallback.plan.json'

    beforeAll(async () => {
      repoRoot = await fixturePublishCliRepo()
      plan = await buildPublishPlan({
        repoRoot,
        batchId: 'cross-pc-fallback',
        runtime: ['output/imagegen/poster/runtime.png=briefings/fallback.png'],
        approved: true,
        approvalSource: 'test-approved',
      })
      await writeFile(join(repoRoot, planPath), `${JSON.stringify(plan, null, 2)}\n`)
    })

    afterAll(async () => {
      if (repoRoot) await rm(repoRoot, { recursive: true, force: true })
    })

    it('stages the exact fallback when publication is unavailable', () => {
      const deferred = runFixtureCommand(repoRoot, process.execPath, [
        'scripts/imgbed-publish.mjs',
        'publish-pending',
        '--stage-registry',
        '--cleanup-local',
        '--fallback-to-git',
      ])
      expect(deferred.status).toBe(0)
      expect(deferred.stderr).toContain('deferred-to-next-commit')
      const stagedPaths = runFixtureGit(repoRoot, ['diff', '--cached', '--name-only'])
      expect(stagedPaths).toContain(planPath)
      expect(stagedPaths).toContain('output/imagegen/poster/runtime.png')
      const fallbackCheck = runFixtureCommand(repoRoot, process.execPath, [
        'scripts/imgbed-publish.mjs', 'check', '--staged',
      ])
      expect(fallbackCheck.status).toBe(0)
      runFixtureGit(repoRoot, ['commit', '-m', 'carry pending asset'])
    })

    it('rejects cleanup when the local asset changed after verification', async () => {
      const verified = plan.entries.map((entry) => ({
        ...entry,
        status: 'verified',
        verifiedAt: '2026-08-12T00:00:00.000Z',
      }))
      await writeFile(
        join(repoRoot, '.imgbed-publish/cross-pc-fallback.results.json'),
        `${JSON.stringify({
          schemaVersion: 1,
          completedChunks: 1,
          totalChunks: 1,
          results: verified,
        }, null, 2)}\n`,
      )
      await writeFile(join(repoRoot, 'output/imagegen/poster/runtime.png'), 'changed-after-plan')
      const unsafeCleanup = runFixtureCommand(repoRoot, process.execPath, [
        'scripts/imgbed-publish.mjs',
        'publish-pending',
        '--stage-registry',
        '--cleanup-local',
        '--fallback-to-git',
      ])
      expect(unsafeCleanup.status).toBe(1)
      expect(unsafeCleanup.stderr).toContain('Local asset changed after verified publication')
    })

    it('cleans the fallback after verified recovery', async () => {
      await writeFile(join(repoRoot, 'output/imagegen/poster/runtime.png'), 'runtime')
      const recovered = runFixtureCommand(repoRoot, process.execPath, [
        'scripts/imgbed-publish.mjs',
        'publish-pending',
        '--stage-registry',
        '--cleanup-local',
        '--fallback-to-git',
      ])
      expect(recovered.status).toBe(0)
      expect(recovered.stdout).toContain('already-complete')
      const staged = runFixtureGit(repoRoot, ['diff', '--cached', '--name-status'])
      expect(staged).toContain('M\tconfig/project-assets.json')
      expect(staged).toContain(`D\t${planPath}`)
      expect(staged).toContain('D\toutput/imagegen/poster/runtime.png')
    })
  })
})
