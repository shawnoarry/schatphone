import { normalizeBookTextAsset, normalizeBookTextAssets } from './book-text-schema'
import { sha256Canonical, sha256Text } from './persistence-repository-schema'

export const LEGACY_BOOK_STORAGE_KEY = 'schatphone:store:book'
export const LEGACY_BOOK_ENVELOPE_VERSION = 1
export const BOOK_USER_ASSET_LIMIT = 300

export class BookLegacyMigrationError extends Error {
  constructor(code, context = {}) {
    super(code)
    this.name = 'BookLegacyMigrationError'
    this.code = code
    this.context = context
  }
}

const normalizeCategory = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : ''
  if (!title) return null
  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id.trim().toLowerCase().replace(/[^a-z0-9_:-]+/g, '_')
        : `book_category_${index + 1}`,
    title: title.slice(0, 120),
    color: typeof raw.color === 'string' ? raw.color.trim().slice(0, 40) : '',
  }
}

const normalizeCategories = (rawCategories) => {
  if (!Array.isArray(rawCategories)) return []
  return rawCategories.map((entry, index) => normalizeCategory(entry, index)).filter(Boolean)
}

const parseCarrier = async (raw, carrier) => {
  const result = {
    carrier,
    exists: typeof raw === 'string' && raw.length > 0,
    rawBytes: typeof raw === 'string' ? new TextEncoder().encode(raw).byteLength : 0,
    rawDigest: typeof raw === 'string' ? await sha256Text(raw) : '',
    parseOk: false,
    decodeOk: false,
    envelopeVersion: null,
    issueCode: '',
    raw,
    decoded: null,
  }
  if (!result.exists) return result

  let parsed
  try {
    parsed = JSON.parse(raw)
    result.parseOk = true
  } catch {
    result.issueCode = 'legacy_parse_failed'
    return result
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    result.issueCode = 'legacy_parse_failed'
    return result
  }

  if (Object.prototype.hasOwnProperty.call(parsed, 'data')) {
    const version = Number(parsed.version ?? 1)
    result.envelopeVersion = version
    if (version !== LEGACY_BOOK_ENVELOPE_VERSION) {
      result.issueCode = 'legacy_version_unsupported'
      return result
    }
    if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
      result.issueCode = 'legacy_parse_failed'
      return result
    }
    result.decoded = parsed.data.book && typeof parsed.data.book === 'object'
      ? parsed.data.book
      : parsed.data
  } else {
    result.envelopeVersion = 0
    result.decoded = parsed.book && typeof parsed.book === 'object' ? parsed.book : parsed
  }

  if (!Array.isArray(result.decoded.assets) || !Array.isArray(result.decoded.categories)) {
    result.issueCode = 'legacy_parse_failed'
    result.decoded = null
    return result
  }
  result.decodeOk = true
  return result
}

export const inspectBookLegacySource = async ({ localRaw = null, mirrorRaw = null } = {}) => {
  const [local, mirror] = await Promise.all([
    parseCarrier(localRaw, 'local'),
    parseCarrier(mirrorRaw, 'mirror'),
  ])
  const mirrorDrift = local.exists && mirror.exists && local.rawDigest !== mirror.rawDigest

  if (local.decodeOk) {
    return {
      ok: true,
      code: 'legacy_source_ready',
      selectedSourceKind: 'local',
      recoveryCandidate: null,
      mirrorDrift,
      local,
      mirror,
    }
  }
  if (mirror.decodeOk) {
    return {
      ok: false,
      code: 'legacy_recovery_candidate',
      selectedSourceKind: null,
      recoveryCandidate: 'mirror',
      mirrorDrift,
      local,
      mirror,
    }
  }
  const code = local.exists
    ? local.issueCode || 'legacy_parse_failed'
    : mirror.exists
      ? mirror.issueCode || 'legacy_parse_failed'
      : 'legacy_missing'
  return {
    ok: false,
    code,
    selectedSourceKind: null,
    recoveryCandidate: null,
    mirrorDrift,
    local,
    mirror,
  }
}

const assertStableIds = (items, kind, normalize) => {
  const seen = new Set()
  for (let index = 0; index < items.length; index += 1) {
    const input = items[index]
    if (!input || typeof input !== 'object' || typeof input.id !== 'string' || !input.id.trim()) {
      throw new BookLegacyMigrationError('invalid_stable_id', { kind, index })
    }
    const normalized = normalize(input, index)
    if (!normalized?.id) {
      throw new BookLegacyMigrationError('invalid_stable_id', { kind, index })
    }
    if (seen.has(normalized.id)) {
      throw new BookLegacyMigrationError('duplicate_stable_id', { kind, id: normalized.id })
    }
    seen.add(normalized.id)
  }
}

export const normalizeBookRepositorySnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new BookLegacyMigrationError('legacy_parse_failed')
  }
  const rawAssets = snapshot.assets
  const rawCategories = snapshot.categories
  if (!Array.isArray(rawAssets) || !Array.isArray(rawCategories)) {
    throw new BookLegacyMigrationError('legacy_parse_failed')
  }
  if (rawAssets.length > BOOK_USER_ASSET_LIMIT) {
    throw new BookLegacyMigrationError('book_asset_limit_exceeded', {
      limit: BOOK_USER_ASSET_LIMIT,
      actual: rawAssets.length,
    })
  }

  assertStableIds(rawAssets, 'asset', normalizeBookTextAsset)
  assertStableIds(rawCategories, 'category', normalizeCategory)
  if (rawAssets.some((asset) => asset.source?.kind === 'built_in')) {
    throw new BookLegacyMigrationError('built_in_record_not_persisted')
  }

  const assets = normalizeBookTextAssets(rawAssets).sort(
    (left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id),
  )
  const categories = normalizeCategories(rawCategories)
  const categoryIds = new Set(categories.map((category) => category.id))
  for (const asset of assets) {
    if (asset.categoryId && !categoryIds.has(asset.categoryId)) {
      throw new BookLegacyMigrationError('invalid_category_link', {
        assetId: asset.id,
        categoryId: asset.categoryId,
      })
    }
  }

  return { assets, categories }
}

export const normalizeBookLegacySnapshot = async ({ sourceKind, raw } = {}) => {
  const carrier = await parseCarrier(raw, sourceKind)
  if (!carrier.exists) throw new BookLegacyMigrationError('legacy_missing')
  if (!carrier.parseOk) throw new BookLegacyMigrationError('legacy_parse_failed')
  if (!carrier.decodeOk) {
    throw new BookLegacyMigrationError(carrier.issueCode || 'legacy_parse_failed')
  }
  const snapshot = normalizeBookRepositorySnapshot(carrier.decoded)
  return {
    snapshot,
    assets: snapshot.assets,
    categories: snapshot.categories,
    ordering: {
      assetIds: snapshot.assets.map((asset) => asset.id),
      categoryIds: snapshot.categories.map((category) => category.id),
    },
    warnings: [],
    sourceKind,
    sourceDigest: carrier.rawDigest,
    sourceBytes: carrier.rawBytes,
    envelopeVersion: carrier.envelopeVersion,
    canonicalDigest: await sha256Canonical(snapshot),
  }
}

export const createBookLegacyMigration = ({ adapter }) => {
  if (!adapter) throw new TypeError('book_repository_adapter_required')

  const stageLegacySource = async ({
    localRaw,
    mirrorRaw,
    operationId,
    generationId,
    parentGenerationId = null,
    worldBookSourceLinks = [],
    allowRecoveryCandidateStage = false,
    capacityEvidence = null,
  }) => {
    const inspection = await inspectBookLegacySource({ localRaw, mirrorRaw })
    let sourceKind = inspection.selectedSourceKind
    if (!sourceKind && inspection.recoveryCandidate && allowRecoveryCandidateStage) {
      sourceKind = inspection.recoveryCandidate
    }
    if (!sourceKind) return { ok: false, code: inspection.code, inspection }

    const source = inspection[sourceKind]
    let normalized
    try {
      normalized = await normalizeBookLegacySnapshot({ sourceKind, raw: source.raw })
    } catch (error) {
      return { ok: false, code: error.code || 'legacy_parse_failed', inspection }
    }
    const sourceEvidence = {
      sourceKind,
      storageKey: LEGACY_BOOK_STORAGE_KEY,
      rawDigest: normalized.sourceDigest,
      rawBytes: normalized.sourceBytes,
      envelopeVersion: normalized.envelopeVersion,
      recoveryCandidate: inspection.recoveryCandidate === sourceKind,
      mirrorDrift: inspection.mirrorDrift,
    }
    const staged = await adapter.stageSnapshot({
      operationId,
      generationId,
      parentGenerationId,
      snapshot: normalized.snapshot,
      sourceEvidence,
      capacityEvidence,
    })
    if (!staged.ok) return { ...staged, inspection, normalized }
    const verified = await adapter.verifyGeneration({
      generationId,
      expected: { snapshot: normalized.snapshot, worldBookSourceLinks },
    })
    return { ...verified, inspection, normalized, staged }
  }

  return Object.freeze({
    inspectLegacySource: inspectBookLegacySource,
    normalizeLegacySnapshot: normalizeBookLegacySnapshot,
    stageLegacySource,
  })
}
