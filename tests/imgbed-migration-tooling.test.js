import { describe, expect, test } from 'vitest'
import {
  PUBLIC_RUNTIME_PREFIX,
  PROTECTED_SOURCE_PREFIX,
  approveMigrationPlan,
  assertExecutablePlan,
  assertVerifiedMigrationResults,
  buildCompleteMigrationPlan,
  buildFirstBatchPlan,
  buildUploadUrl,
  classifyAsset,
  huggingFaceCommitRateLimitRetryMs,
  publicDownloadUrl,
  publicRuntimeKey,
  safePreflightSummary,
} from '../scripts/imgbed-migration-lib.mjs'

describe('image-bed migration tooling', () => {
  test('maps one public runtime asset to one public image-bed URL', () => {
    const assetPath = 'public/images/wallet/cards/card.webp'
    expect(classifyAsset(assetPath, [{ path: 'src/views/WalletView.vue' }])).toEqual({
      kind: 'runtime-asset',
      migrationLane: 'public-runtime',
      runtimeReferenceCount: 1,
    })
    expect(publicRuntimeKey(assetPath)).toBe(`${PUBLIC_RUNTIME_PREFIX}images/wallet/cards/card.webp`)
    expect(publicDownloadUrl('https://img.example/', publicRuntimeKey(assetPath))).toBe(
      'https://img.example/file/schatphone-assets/images/wallet/cards/card.webp',
    )
  })

  test('defers generated working files instead of creating a second runtime copy', () => {
    expect(classifyAsset('output/imagegen/card.png', [{ path: 'src/lib/cards.js' }])).toEqual({
      kind: 'generated-working-file',
      migrationLane: 'defer-generated-output',
      runtimeReferenceCount: 1,
    })
  })

  test('proposes a coherent batch without approving it', () => {
    const inventory = {
      repository: { head: 'abc123' },
      assets: ['a', 'b'].map((name, index) => ({
        path: `public/images/family/${name}.png`,
        bytes: 100 + index,
        sha256: name.repeat(64),
        mimeType: 'image/png',
        migrationLane: 'public-runtime',
        runtimeReferenceCount: 1,
        duplicatePaths: [],
      })),
    }
    const plan = buildFirstBatchPlan(inventory, 'https://img.example')
    expect(plan).toMatchObject({
      status: 'PROPOSED_NOT_APPROVED',
      approved: false,
      mode: 'public-runtime-single-copy',
      impact: {
        runtimeReferenceChanges: 'required-after-anonymous-download-verification',
        localDeletions: 0,
        gitHistoryRewrite: false,
      },
    })
    expect(plan.entries).toHaveLength(2)
    expect(plan.entries[0].publicUrl).toContain('/file/schatphone-assets/images/family/')
    expect(() => assertExecutablePlan(plan)).toThrow('not explicitly approved')
  })

  test('requires an approved bounded public-runtime plan before upload', () => {
    const plan = {
      status: 'APPROVED',
      approved: true,
      mode: 'public-runtime-single-copy',
      limits: { maxFiles: 2, maxBytes: 1000 },
      entries: [{
        path: 'public/images/a.png',
        action: 'upload',
        bytes: 100,
        remoteKey: 'schatphone-assets/images/a.png',
        runtimeReferenceCount: 1,
        duplicatePaths: [],
        sha256: 'a'.repeat(64),
      }],
    }
    expect(assertExecutablePlan(plan)).toEqual({ totalBytes: 100, fileCount: 1 })
    expect(() => assertExecutablePlan({
      ...plan,
      entries: [{ ...plan.entries[0], remoteKey: 'schatphone-source/a.png' }],
    })).toThrow('unsafe public runtime prefix')
  })

  test('allows a runtime file that only duplicates a deferred generated source', () => {
    const plan = {
      status: 'APPROVED',
      approved: true,
      mode: 'public-runtime-single-copy',
      limits: { maxFiles: 1, maxBytes: 1000 },
      entries: [{
        path: 'public/images/a.png',
        action: 'upload',
        bytes: 100,
        remoteKey: 'schatphone-assets/images/a.png',
        duplicatePaths: ['output/imagegen/a.png'],
        sha256: 'a'.repeat(64),
      }],
    }
    expect(assertExecutablePlan(plan)).toEqual({ totalBytes: 100, fileCount: 1 })
  })

  test('builds one complete object per digest and excludes runtime duplicates from source archive', () => {
    const inventory = {
      repository: { head: 'abc123' },
      assets: [
        {
          path: 'public/images/runtime.png', bytes: 100, sha256: 'a'.repeat(64),
          mimeType: 'image/png', migrationLane: 'public-runtime', runtimeReferenceCount: 1,
        },
        {
          path: 'output/imagegen/runtime-master.png', bytes: 100, sha256: 'a'.repeat(64),
          mimeType: 'image/png', migrationLane: 'defer-generated-output', runtimeReferenceCount: 0,
        },
        {
          path: 'output/imagegen/source.png', bytes: 200, sha256: 'b'.repeat(64),
          mimeType: 'image/png', migrationLane: 'defer-generated-output', runtimeReferenceCount: 0,
        },
        {
          path: 'output/imagegen/source-copy.png', bytes: 200, sha256: 'b'.repeat(64),
          mimeType: 'image/png', migrationLane: 'defer-generated-output', runtimeReferenceCount: 0,
        },
      ],
    }
    const proposed = buildCompleteMigrationPlan(inventory, 'https://img.example')
    expect(proposed.summary).toEqual({
      runtimeObjects: 1,
      sourceObjects: 1,
      aliasPaths: 2,
      totalBytes: 300,
    })
    expect(proposed.entries.map((entry) => entry.remoteKey)).toEqual([
      `${PUBLIC_RUNTIME_PREFIX}images/runtime.png`,
      `${PROTECTED_SOURCE_PREFIX}output/imagegen/source-copy.png`,
    ])
    const approved = approveMigrationPlan(proposed, 'user-message')
    expect(assertExecutablePlan(approved)).toEqual({ totalBytes: 300, fileCount: 2 })
  })

  test('builds a credential-free origin-name Hugging Face upload URL', () => {
    const url = buildUploadUrl(
      'https://img.example',
      'schatphone-assets/images/family/a.png',
    )
    expect(url.pathname).toBe('/upload')
    expect(url.searchParams.get('uploadChannel')).toBe('huggingface')
    expect(url.searchParams.get('uploadFolder')).toBe('schatphone-assets/images/family')
    expect(url.searchParams.get('uploadNameType')).toBe('origin')
    expect(url.searchParams.get('onConflict')).toBe('reject')
    expect(url.toString()).not.toContain('token')
  })

  test('requires one verified result for every approved object', () => {
    const plan = {
      status: 'APPROVED',
      approved: true,
      mode: 'complete-single-copy',
      limits: { maxFiles: 1, maxBytes: 100 },
      entries: [{
        path: 'public/images/a.png',
        action: 'upload',
        access: 'public',
        bytes: 100,
        remoteKey: 'schatphone-assets/images/a.png',
        sha256: 'a'.repeat(64),
      }],
    }
    const resultDocument = {
      schemaVersion: 1,
      results: [{
        path: 'public/images/a.png',
        remoteKey: 'schatphone-assets/images/a.png',
        bytes: 100,
        sha256: 'a'.repeat(64),
        status: 'verified',
      }],
    }
    expect(assertVerifiedMigrationResults(plan, resultDocument)).toEqual({
      totalBytes: 100,
      fileCount: 1,
      verifiedFiles: 1,
    })
    resultDocument.results[0].bytes = 99
    expect(() => assertVerifiedMigrationResults(plan, resultDocument)).toThrow('mismatched')
  })

  test('preflight output records only whether a token exists', () => {
    expect(safePreflightSummary({
      baseUrl: 'https://img.example',
      tokenConfigured: 'secret-value',
      checks: { list: 200 },
    })).toEqual({
      baseUrl: 'https://img.example',
      tokenConfigured: true,
      checks: { list: 200 },
    })
  })

  test('backs off when Hugging Face wraps its repository commit limit in HTTP 500', () => {
    const body = 'HuggingFace upload failed - Commit failed: 429 - '
      + 'You have exceeded the rate limit for repository commits. '
      + 'You can retry this action in about 1 hour.'
    expect(huggingFaceCommitRateLimitRetryMs(500, body)).toBe(61 * 60 * 1000)
    expect(huggingFaceCommitRateLimitRetryMs(500, 'unrelated failure')).toBeNull()
    expect(huggingFaceCommitRateLimitRetryMs(400, body)).toBeNull()
  })
})
