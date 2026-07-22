import {
  BookLegacyMigrationError,
  inspectBookLegacySource,
  normalizeBookLegacySnapshot,
  normalizeBookRepositorySnapshot,
} from './book-legacy-migration'
import { canonicalStringify, sha256Canonical } from './persistence-repository-schema'

const BOOK_OWNER_ID = 'book'
const BOOK_ASSET_CLASS_ID = 'book.asset'
const BOOK_CATEGORY_CLASS_ID = 'book.category'

const asFailure = (error, fallback = 'carrier_unavailable') => ({
  ok: false,
  code: error?.code || fallback,
  context: error?.context || {},
})

const buildReferenceReport = ({ snapshot, worldBookSourceLinks = [], resolveBuiltInAssetById }) => {
  const userAssetIds = new Set(snapshot.assets.map((asset) => asset.id))
  const valid = []
  const missing = []
  for (const link of worldBookSourceLinks) {
    const assetId = typeof link?.assetId === 'string' ? link.assetId.trim() : ''
    const entry = { linkId: link?.id || '', assetId }
    if (
      assetId &&
      (userAssetIds.has(assetId) ||
        (typeof resolveBuiltInAssetById === 'function' && resolveBuiltInAssetById(assetId)))
    ) {
      valid.push(entry)
    } else {
      missing.push(entry)
    }
  }
  return { valid, missing }
}

const resolveRecordRevision = (recordRevisions, dataClassId, recordId, fallback) => {
  const revision = Number(recordRevisions?.[`${dataClassId}:${recordId}`])
  return Number.isInteger(revision) && revision > 0 ? revision : fallback
}

const buildOwnerClasses = (snapshot, recordRevisions = null) => [
  {
    ownerId: BOOK_OWNER_ID,
    dataClassId: BOOK_ASSET_CLASS_ID,
    records: snapshot.assets.map((asset) => ({
      recordId: asset.id,
      revision: resolveRecordRevision(
        recordRevisions,
        BOOK_ASSET_CLASS_ID,
        asset.id,
        Math.max(1, Number(asset.version || 1)),
      ),
      recordSchemaVersion: 1,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      payload: asset,
      sourceReferences: [],
      indexKeys: {
        updatedAt: asset.updatedAt,
        category: asset.category,
        status: asset.status,
      },
    })),
  },
  {
    ownerId: BOOK_OWNER_ID,
    dataClassId: BOOK_CATEGORY_CLASS_ID,
    records: snapshot.categories.map((category) => ({
      recordId: category.id,
      revision: resolveRecordRevision(recordRevisions, BOOK_CATEGORY_CLASS_ID, category.id, 1),
      recordSchemaVersion: 1,
      createdAt: 0,
      updatedAt: 0,
      payload: category,
      sourceReferences: [],
      indexKeys: {},
    })),
  },
]

export const createBookRepositoryAdapter = ({ repository, resolveBuiltInAssetById = null } = {}) => {
  if (!repository) throw new TypeError('persistence_repository_required')

  const stageSnapshot = async ({
    operationId,
    generationId,
    parentGenerationId = null,
    snapshot,
    sourceEvidence = null,
    capacityEvidence = null,
    recordRevisions = null,
  } = {}) => {
    if (capacityEvidence?.status === 'insufficient') {
      return { ok: false, code: 'quota_insufficient', capacityEvidence }
    }
    if (capacityEvidence?.status === 'unknown') {
      return { ok: false, code: 'capacity_unknown', capacityEvidence }
    }
    try {
      const canonicalSnapshot = normalizeBookRepositorySnapshot(snapshot)
      const result = await repository.stageGeneration({
        operationId,
        generationId,
        parentGenerationId,
        ownerClasses: buildOwnerClasses(canonicalSnapshot, recordRevisions),
        sourceEvidence,
      })
      return { ok: true, code: result.idempotent ? 'already_staged' : 'staged', ...result }
    } catch (error) {
      return asFailure(error)
    }
  }

  const readSnapshot = async ({ generationId } = {}) => {
    try {
      const generation = await repository.getGeneration(generationId)
      if (!generation) return { ok: false, code: 'generation_missing' }
      const [assetRows, categoryRows] = await Promise.all([
        repository.readClassRecords({
          generationId,
          ownerId: BOOK_OWNER_ID,
          dataClassId: BOOK_ASSET_CLASS_ID,
        }),
        repository.readClassRecords({
          generationId,
          ownerId: BOOK_OWNER_ID,
          dataClassId: BOOK_CATEGORY_CLASS_ID,
        }),
      ])
      const snapshot = {
        assets: assetRows.map(({ record }) => record.payload),
        categories: categoryRows.map(({ record }) => record.payload),
      }
      const classDigests = {
        [`${BOOK_OWNER_ID}:${BOOK_ASSET_CLASS_ID}`]: await sha256Canonical(
          assetRows.map(({ membership }) => ({
            recordId: membership.recordId,
            revision: membership.revision,
            recordDigest: membership.recordDigest,
            indexKeys: membership.indexKeys,
          })),
        ),
        [`${BOOK_OWNER_ID}:${BOOK_CATEGORY_CLASS_ID}`]: await sha256Canonical(
          categoryRows.map(({ membership }) => ({
            recordId: membership.recordId,
            revision: membership.revision,
            recordDigest: membership.recordDigest,
            indexKeys: membership.indexKeys,
          })),
        ),
      }
      return { ok: true, code: 'snapshot_ready', generation, snapshot, classDigests }
    } catch (error) {
      return asFailure(error, 'generation_incomplete')
    }
  }

  const compareGeneration = async ({ generationId, expected = {} } = {}) => {
    const read = await readSnapshot({ generationId })
    if (!read.ok) return read
    try {
      const expectedSnapshot = normalizeBookRepositorySnapshot(expected.snapshot || expected)
      if (canonicalStringify(read.snapshot) !== canonicalStringify(expectedSnapshot)) {
        return { ok: false, code: 'generation_incomplete', mismatch: 'snapshot' }
      }
      const manifest = read.generation
      const counts = {
        [`${BOOK_OWNER_ID}:${BOOK_ASSET_CLASS_ID}`]: read.snapshot.assets.length,
        [`${BOOK_OWNER_ID}:${BOOK_CATEGORY_CLASS_ID}`]: read.snapshot.categories.length,
      }
      for (const [key, count] of Object.entries(counts)) {
        if (manifest.ownerClassCounts?.[key] !== count) {
          return { ok: false, code: 'generation_incomplete', mismatch: 'count', key }
        }
        if (
          typeof manifest.ownerClassDigests?.[key] === 'string' &&
          manifest.ownerClassDigests[key] !== read.classDigests[key]
        ) {
          return { ok: false, code: 'generation_incomplete', mismatch: 'digest', key }
        }
      }
      const referenceReport = buildReferenceReport({
        snapshot: read.snapshot,
        worldBookSourceLinks: expected.worldBookSourceLinks,
        resolveBuiltInAssetById,
      })
      if (
        expected.referenceReport &&
        canonicalStringify(expected.referenceReport) !== canonicalStringify(referenceReport)
      ) {
        return { ok: false, code: 'reference_report_mismatch', referenceReport }
      }
      return {
        ok: true,
        code: 'generation_matches',
        snapshot: read.snapshot,
        snapshotDigest: await sha256Canonical(read.snapshot),
        referenceReport,
        generation: manifest,
      }
    } catch (error) {
      return asFailure(error, 'generation_incomplete')
    }
  }

  const verifyGeneration = async ({ generationId, expected = {} } = {}) => {
    const compared = await compareGeneration({ generationId, expected })
    if (!compared.ok) return compared
    try {
      const verifiedGeneration = await repository.markGenerationVerified({
        generationId,
        operationId: compared.generation.operationId,
      })
      return {
        ...compared,
        code: 'generation_verified',
        generation: verifiedGeneration,
      }
    } catch (error) {
      return asFailure(error, 'generation_incomplete')
    }
  }

  const reopenSnapshot = async ({ generationId, expected = {} } = {}) => {
    const compared = await compareGeneration({ generationId, expected })
    if (!compared.ok) return compared
    if (!['active', 'superseded'].includes(compared.generation.status)) {
      return {
        ok: false,
        code: 'generation_state_conflict',
        status: compared.generation.status,
      }
    }
    return { ...compared, code: 'snapshot_reopened' }
  }

  const readAsset = async ({ generationId, assetId } = {}) => {
    const snapshot = await readSnapshot({ generationId })
    if (!snapshot.ok) return snapshot
    const asset = snapshot.snapshot.assets.find((entry) => entry.id === assetId)
    return asset
      ? { ok: true, code: 'asset_ready', asset }
      : { ok: false, code: 'record_missing', assetId }
  }

  const listAssets = async ({
    generationId,
    category = '',
    status = '',
    cursor = '',
    limit = 50,
  } = {}) => {
    const snapshot = await readSnapshot({ generationId })
    if (!snapshot.ok) return snapshot
    const boundedLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 50)))
    const filtered = snapshot.snapshot.assets.filter((asset) => {
      if (category && asset.category !== category) return false
      if (status && asset.status !== status) return false
      return true
    })
    const cursorIndex = cursor ? filtered.findIndex((asset) => asset.id === cursor) : -1
    const records = filtered.slice(cursorIndex + 1, cursorIndex + 1 + boundedLimit)
    const hasMore = cursorIndex + 1 + boundedLimit < filtered.length
    return {
      ok: true,
      code: 'asset_list_ready',
      records,
      nextCursor: hasMore ? records.at(-1)?.id || '' : '',
      hasMore,
    }
  }

  const abortGeneration = async ({ operationId, generationId, errorCode = '' } = {}) => {
    try {
      const generation = await repository.abortGeneration({ operationId, generationId, errorCode })
      return { ok: true, code: 'generation_aborted', generation }
    } catch (error) {
      return asFailure(error)
    }
  }

  return Object.freeze({
    inspectLegacySource: inspectBookLegacySource,
    normalizeLegacySnapshot: normalizeBookLegacySnapshot,
    stageSnapshot,
    verifyGeneration,
    reopenSnapshot,
    readSnapshot,
    readAsset,
    listAssets,
    abortGeneration,
    buildReferenceReport: (options) =>
      buildReferenceReport({ ...options, resolveBuiltInAssetById }),
  })
}

export {
  BOOK_OWNER_ID,
  BOOK_ASSET_CLASS_ID,
  BOOK_CATEGORY_CLASS_ID,
  BookLegacyMigrationError,
}
