import { describe, expect, test } from 'vitest'
import { createBookRepositoryAdapter } from '../src/lib/book-repository-adapter'

const createSnapshot = () => ({
  assets: [
    {
      id: 'asset_newer',
      title: 'Newer',
      category: 'worldview',
      format: 'plain',
      content: 'World content.',
      status: 'active_source',
      version: 2,
      createdAt: 10,
      updatedAt: 30,
    },
    {
      id: 'asset_older',
      title: 'Older',
      category: 'world_rule',
      format: 'plain',
      content: 'Rule content.',
      status: 'draft',
      version: 1,
      createdAt: 10,
      updatedAt: 20,
    },
  ],
  categories: [{ id: 'notes', title: 'Notes', color: 'blue' }],
})

const createRepositoryDouble = () => {
  let staged = null
  let status = 'staging'
  return {
    get staged() {
      return staged
    },
    async stageGeneration(input) {
      staged = input
      status = 'staging'
      return {
        idempotent: false,
        generation: {
          generationId: input.generationId,
          operationId: input.operationId,
          status,
          ownerClassCounts: Object.fromEntries(
            input.ownerClasses.map((entry) => [
              `${entry.ownerId}:${entry.dataClassId}`,
              entry.records.length,
            ]),
          ),
        },
      }
    },
    async getGeneration(generationId) {
      if (!staged || staged.generationId !== generationId) return undefined
      return {
        generationId,
        operationId: staged.operationId,
        status,
        ownerClassCounts: Object.fromEntries(
          staged.ownerClasses.map((entry) => [
            `${entry.ownerId}:${entry.dataClassId}`,
            entry.records.length,
          ]),
        ),
      }
    },
    async readClassRecords({ generationId, ownerId, dataClassId }) {
      if (generationId !== staged?.generationId) return []
      const ownerClass = staged.ownerClasses.find(
        (entry) => entry.ownerId === ownerId && entry.dataClassId === dataClassId,
      )
      return (ownerClass?.records || []).map((record, position) => ({
        membership: { generationId, ownerId, dataClassId, recordId: record.recordId, indexKeys: { position } },
        record: { ...record, payload: record.payload, integrity: { sha256: `digest-${record.recordId}` } },
      }))
    },
    async markGenerationVerified({ generationId, operationId }) {
      status = 'verified'
      return { generationId, operationId, status }
    },
    async abortGeneration({ generationId, operationId, errorCode }) {
      status = 'aborted'
      return { generationId, operationId, errorCode, status }
    },
  }
}

describe('Book repository adapter', () => {
  test('maps only user assets and categories into a complete inactive generation', async () => {
    const repository = createRepositoryDouble()
    const adapter = createBookRepositoryAdapter({ repository })
    const result = await adapter.stageSnapshot({
      operationId: 'operation-one',
      generationId: 'generation-one',
      snapshot: createSnapshot(),
      sourceEvidence: { sourceKind: 'local', rawDigest: 'source-digest' },
    })

    expect(result).toMatchObject({ ok: true, code: 'staged' })
    expect(repository.staged).toMatchObject({
      operationId: 'operation-one',
      generationId: 'generation-one',
      parentGenerationId: null,
      sourceEvidence: { sourceKind: 'local', rawDigest: 'source-digest' },
    })
    expect(repository.staged.ownerClasses.map((entry) => entry.dataClassId)).toEqual([
      'book.asset',
      'book.category',
    ])
    expect(repository.staged.ownerClasses[0].records.map((entry) => entry.recordId)).toEqual([
      'asset_newer',
      'asset_older',
    ])
    expect(repository.staged.ownerClasses[0].records[0]).toMatchObject({
      revision: 2,
      indexKeys: {
        updatedAt: 30,
        category: 'worldview',
        status: 'active_source',
      },
    })
    expect(repository.staged).not.toHaveProperty('activeGeneration')
  })

  test('round-trips canonical order and reports valid, built-in, and missing WorldBook links', async () => {
    const repository = createRepositoryDouble()
    const adapter = createBookRepositoryAdapter({
      repository,
      resolveBuiltInAssetById: (assetId) => assetId === 'built_in_fixture',
    })
    const snapshot = createSnapshot()
    await adapter.stageSnapshot({
      operationId: 'operation-two',
      generationId: 'generation-two',
      snapshot,
    })

    const verified = await adapter.verifyGeneration({
      generationId: 'generation-two',
      expected: {
        snapshot,
        worldBookSourceLinks: [
          { id: 'user-link', assetId: 'asset_newer' },
          { id: 'built-in-link', assetId: 'built_in_fixture' },
          { id: 'missing-link', assetId: 'missing_asset' },
        ],
      },
    })
    expect(verified).toMatchObject({
      ok: true,
      code: 'generation_verified',
      generation: { status: 'verified' },
      referenceReport: {
        valid: [
          { linkId: 'user-link', assetId: 'asset_newer' },
          { linkId: 'built-in-link', assetId: 'built_in_fixture' },
        ],
        missing: [{ linkId: 'missing-link', assetId: 'missing_asset' }],
      },
    })
    expect(verified.snapshot.assets.map((entry) => entry.id)).toEqual([
      'asset_newer',
      'asset_older',
    ])
  })

  test('provides deterministic filtered pagination and direct reads', async () => {
    const repository = createRepositoryDouble()
    const adapter = createBookRepositoryAdapter({ repository })
    await adapter.stageSnapshot({
      operationId: 'operation-three',
      generationId: 'generation-three',
      snapshot: createSnapshot(),
    })

    await expect(adapter.readAsset({
      generationId: 'generation-three',
      assetId: 'asset_older',
    })).resolves.toMatchObject({ ok: true, asset: { id: 'asset_older' } })
    await expect(adapter.readAsset({
      generationId: 'generation-three',
      assetId: 'missing',
    })).resolves.toMatchObject({ ok: false, code: 'record_missing' })
    await expect(adapter.listAssets({
      generationId: 'generation-three',
      status: 'draft',
      limit: 1,
    })).resolves.toMatchObject({
      ok: true,
      records: [{ id: 'asset_older' }],
      hasMore: false,
      nextCursor: '',
    })
  })

  test('rejects built-ins, duplicate IDs, invalid category links, and revision conflicts stably', async () => {
    const adapter = createBookRepositoryAdapter({ repository: createRepositoryDouble() })
    const builtIn = createSnapshot()
    builtIn.assets[0].source = { kind: 'built_in' }
    await expect(adapter.stageSnapshot({
      operationId: 'built-in',
      generationId: 'built-in',
      snapshot: builtIn,
    })).resolves.toMatchObject({ ok: false, code: 'built_in_record_not_persisted' })

    const duplicate = createSnapshot()
    duplicate.assets[1].id = 'ASSET_NEWER'
    await expect(adapter.stageSnapshot({
      operationId: 'duplicate',
      generationId: 'duplicate',
      snapshot: duplicate,
    })).resolves.toMatchObject({ ok: false, code: 'duplicate_stable_id' })

    const invalidLink = createSnapshot()
    invalidLink.assets[0].categoryId = 'missing_category'
    await expect(adapter.stageSnapshot({
      operationId: 'category',
      generationId: 'category',
      snapshot: invalidLink,
    })).resolves.toMatchObject({ ok: false, code: 'invalid_category_link' })

    const conflictRepository = createRepositoryDouble()
    conflictRepository.stageGeneration = async () => {
      const error = new Error('conflict')
      error.code = 'revision_digest_conflict'
      throw error
    }
    await expect(createBookRepositoryAdapter({ repository: conflictRepository }).stageSnapshot({
      operationId: 'conflict',
      generationId: 'conflict',
      snapshot: createSnapshot(),
    })).resolves.toMatchObject({ ok: false, code: 'revision_digest_conflict' })
  })

  test('stops before staging when capacity is insufficient or unknown', async () => {
    const repository = createRepositoryDouble()
    const adapter = createBookRepositoryAdapter({ repository })

    await expect(adapter.stageSnapshot({
      operationId: 'capacity-insufficient',
      generationId: 'capacity-insufficient',
      snapshot: createSnapshot(),
      capacityEvidence: { status: 'insufficient', availableBytes: 10 },
    })).resolves.toMatchObject({ ok: false, code: 'quota_insufficient' })
    await expect(adapter.stageSnapshot({
      operationId: 'capacity-unknown',
      generationId: 'capacity-unknown',
      snapshot: createSnapshot(),
      capacityEvidence: { status: 'unknown', availableBytes: null },
    })).resolves.toMatchObject({ ok: false, code: 'capacity_unknown' })
    expect(repository.staged).toBeNull()
  })

  test('aborts only the inactive candidate through the repository seam', async () => {
    const repository = createRepositoryDouble()
    const adapter = createBookRepositoryAdapter({ repository })
    await adapter.stageSnapshot({
      operationId: 'operation-abort',
      generationId: 'generation-abort',
      snapshot: createSnapshot(),
    })
    await expect(adapter.abortGeneration({
      operationId: 'operation-abort',
      generationId: 'generation-abort',
      errorCode: 'verification_failed',
    })).resolves.toMatchObject({
      ok: true,
      code: 'generation_aborted',
      generation: { status: 'aborted', errorCode: 'verification_failed' },
    })
  })
})
