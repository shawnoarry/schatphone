import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import {
  createBookLegacyMigration,
  inspectBookLegacySource,
  normalizeBookLegacySnapshot,
} from '../src/lib/book-legacy-migration'

const fixtureDirectory = join(process.cwd(), 'tests', 'fixtures', 'persistence', 'book')
const fixtureNames = [
  'book-empty-v1.json',
  'book-single-v1.json',
  'book-multi-category-v1.json',
  'book-worldbook-links-v1.json',
  'book-legacy-unwrapped-v0.json',
  'book-limit-edge-v1.json',
  'book-invalid-v1.json',
]

const readFixture = (name) => {
  const bytes = readFileSync(join(fixtureDirectory, name))
  return {
    bytes,
    digest: createHash('sha256').update(bytes).digest('hex'),
    data: JSON.parse(bytes.toString('utf8')),
  }
}

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex')

const generateLimitRaw = (fixture) => {
  const { assetCount, longTextLength, savedAt, createdAt, updatedAt } = fixture.generator
  const assets = Array.from({ length: assetCount }, (_, index) => {
    const sequence = String(index + 1).padStart(3, '0')
    return {
      id: `limit_asset_${sequence}`,
      title: `Limit asset ${sequence}`,
      category: 'encyclopedia',
      format: 'plain',
      content: index === 0 ? 'L'.repeat(longTextLength) : `Body ${sequence}`,
      status: 'draft',
      version: 1,
      createdAt,
      updatedAt,
    }
  })
  return JSON.stringify({ version: 1, savedAt, data: { assets, categories: [] } })
}

describe('Book legacy migration', () => {
  test('keeps every checked-in fixture byte-identical while normalizing accepted sources', async () => {
    const before = Object.fromEntries(
      fixtureNames.map((name) => [name, readFixture(name).digest]),
    )
    for (const name of [
      'book-empty-v1.json',
      'book-single-v1.json',
      'book-multi-category-v1.json',
      'book-worldbook-links-v1.json',
      'book-legacy-unwrapped-v0.json',
    ]) {
      const fixture = readFixture(name).data
      const result = await normalizeBookLegacySnapshot({
        sourceKind: fixture.sourceKind,
        raw: fixture.sourceRaw,
      })
      expect(result.ordering.assetIds, name).toEqual(fixture.expected.assetIds)
      expect(result.ordering.categoryIds, name).toEqual(fixture.expected.categoryIds)
      expect(result.sourceDigest, name).toBe(sha256(fixture.sourceRaw))
      expect(result.envelopeVersion, name).toBe(
        fixture.expected.envelopeVersion ?? 1,
      )
    }
    const after = Object.fromEntries(
      fixtureNames.map((name) => [name, readFixture(name).digest]),
    )
    expect(after).toEqual(before)
  })

  test('preserves all 300 assets and long text at the accepted limit edge', async () => {
    const fixture = readFixture('book-limit-edge-v1.json').data
    const raw = generateLimitRaw(fixture)
    const result = await normalizeBookLegacySnapshot({ sourceKind: 'local', raw })

    expect(result.assets).toHaveLength(fixture.expected.assetCount)
    expect(result.assets[0].id).toBe(fixture.expected.firstAssetId)
    expect(result.assets.at(-1).id).toBe(fixture.expected.lastAssetId)
    expect(result.assets[0].content).toHaveLength(fixture.expected.longTextLength)
    expect(result.sourceDigest).toBe(sha256(raw))
  })

  test('selects valid local bytes first and reports mirror drift without timestamp arbitration', async () => {
    const local = readFixture('book-single-v1.json').data.sourceRaw
    const mirror = JSON.stringify({
      version: 1,
      savedAt: 9999999999999,
      data: { assets: [], categories: [] },
    })
    const result = await inspectBookLegacySource({ localRaw: local, mirrorRaw: mirror })

    expect(result).toMatchObject({
      ok: true,
      code: 'legacy_source_ready',
      selectedSourceKind: 'local',
      mirrorDrift: true,
    })
    expect(result.local.rawDigest).toBe(sha256(local))
    expect(result.mirror.rawDigest).toBe(sha256(mirror))
  })

  test('names valid mirror-only data as a recovery candidate without staging by default', async () => {
    const mirror = readFixture('book-single-v1.json').data.sourceRaw
    const inspection = await inspectBookLegacySource({
      localRaw: '{invalid json',
      mirrorRaw: mirror,
    })
    expect(inspection).toMatchObject({
      ok: false,
      code: 'legacy_recovery_candidate',
      selectedSourceKind: null,
      recoveryCandidate: 'mirror',
    })

    const adapter = {
      stageSnapshot: vi.fn(),
      verifyGeneration: vi.fn(),
    }
    const migration = createBookLegacyMigration({ adapter })
    const result = await migration.stageLegacySource({
      localRaw: '{invalid json',
      mirrorRaw: mirror,
      operationId: 'recovery-operation',
      generationId: 'recovery-generation',
    })
    expect(result).toMatchObject({ ok: false, code: 'legacy_recovery_candidate' })
    expect(adapter.stageSnapshot).not.toHaveBeenCalled()
    expect(adapter.verifyGeneration).not.toHaveBeenCalled()
  })

  test('can explicitly stage and verify a recovery candidate while retaining source evidence', async () => {
    const mirror = readFixture('book-worldbook-links-v1.json').data
    const adapter = {
      stageSnapshot: vi.fn().mockResolvedValue({ ok: true, code: 'staged' }),
      verifyGeneration: vi.fn().mockResolvedValue({ ok: true, code: 'generation_verified' }),
    }
    const result = await createBookLegacyMigration({ adapter }).stageLegacySource({
      localRaw: null,
      mirrorRaw: mirror.sourceRaw,
      operationId: 'mirror-operation',
      generationId: 'mirror-generation',
      worldBookSourceLinks: mirror.worldBookSourceLinks,
      allowRecoveryCandidateStage: true,
    })

    expect(result).toMatchObject({ ok: true, code: 'generation_verified' })
    expect(adapter.stageSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      operationId: 'mirror-operation',
      generationId: 'mirror-generation',
      sourceEvidence: expect.objectContaining({
        sourceKind: 'mirror',
        recoveryCandidate: true,
        rawDigest: sha256(mirror.sourceRaw),
      }),
    }))
    expect(adapter.verifyGeneration).toHaveBeenCalledWith({
      generationId: 'mirror-generation',
      expected: {
        snapshot: expect.any(Object),
        worldBookSourceLinks: mirror.worldBookSourceLinks,
      },
    })
  })

  test('rejects every invalid fixture with its stable code and performs no generated-ID repair', async () => {
    const fixture = readFixture('book-invalid-v1.json').data
    for (const invalidCase of fixture.cases) {
      await expect(normalizeBookLegacySnapshot({
        sourceKind: 'local',
        raw: invalidCase.sourceRaw,
      }), invalidCase.id).rejects.toMatchObject({ code: invalidCase.expectedCode })
    }
  })

  test('reports missing and malformed carriers without staging writes', async () => {
    await expect(inspectBookLegacySource()).resolves.toMatchObject({
      ok: false,
      code: 'legacy_missing',
    })
    await expect(inspectBookLegacySource({ localRaw: '{bad' })).resolves.toMatchObject({
      ok: false,
      code: 'legacy_parse_failed',
    })
  })
})
