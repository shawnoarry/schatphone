import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertBatchUploadResult,
  assertPublishPlan,
  buildBatchManifest,
  buildPublishPlan,
  chunkPublishEntries,
  createEmptyAssetRegistry,
  mergeVerifiedAssets,
  normalizeImageBedBaseUrl,
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

describe('image-bed project publishing', () => {
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
  })
})
