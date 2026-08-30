import { sha256Canonical } from './persistence-repository-schema'
import {
  createReviewedWorldSemanticManifest,
  normalizeWorldSemanticModelReceipt,
} from './simulation/world-semantic-contract'
import { compileReviewedWorldSemanticManifest } from './simulation/world-semantic-compiler'

export const WORLD_SETTING_STATE_SCHEMA_VERSION = 1
export const WORLD_SETTING_SOURCE_SNAPSHOT_SCHEMA_VERSION = 1
export const WORLD_SEMANTIC_VERSION_RECORD_SCHEMA_VERSION = 1
export const PRIMARY_PERSISTED_WORLD_ID = 'world_local_primary'

const SHA256_PATTERN = /^[a-f0-9]{64}$/
const STABLE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}$/

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const cloneValue = (value) => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Reactive values are normalized through JSON below.
    }
  }
  return JSON.parse(JSON.stringify(value ?? null))
}

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const normalizeText = (value, fallback = '', max = 180) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).normalize('NFKC').replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeStableRef = (value, fallback = '') => {
  const normalized = normalizeText(value, fallback, 180)
  return STABLE_REF_PATTERN.test(normalized) ? normalized : fallback
}

const normalizeTimestamp = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : fallback
}

const normalizePositiveInteger = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback
}

const normalizeHash = (value) => {
  const normalized = normalizeText(value, '', 64).toLowerCase()
  return SHA256_PATTERN.test(normalized) ? normalized : ''
}

const normalizeStringList = (value, max = 180) => [
  ...new Set(
    (Array.isArray(value) ? value : [])
      .map((item) => normalizeText(item, '', max))
      .filter(Boolean),
  ),
]

const sortById = (items = []) =>
  [...items].sort((left, right) => String(left.id).localeCompare(String(right.id)))

const normalizeSourceItem = (rawItem = {}) => {
  const source = isPlainObject(rawItem) ? rawItem : {}
  const id = normalizeStableRef(source.id)
  if (!id) return null
  return {
    id,
    contentHash: normalizeHash(source.contentHash),
    metadataHash: normalizeHash(source.metadataHash),
  }
}

const normalizeSourceItems = (items = []) => {
  const seen = new Set()
  return sortById(
    (Array.isArray(items) ? items : [])
      .map(normalizeSourceItem)
      .filter((item) => {
        if (!item || seen.has(item.id)) return false
        seen.add(item.id)
        return true
      }),
  )
}

export const normalizeWorldSettingSourceSnapshot = (rawSnapshot = {}) => {
  const source = isPlainObject(rawSnapshot) ? rawSnapshot : {}
  return deepFreeze({
    schemaVersion: WORLD_SETTING_SOURCE_SNAPSHOT_SCHEMA_VERSION,
    worldId: normalizeStableRef(source.worldId, PRIMARY_PERSISTED_WORLD_ID),
    sourceFingerprint: normalizeHash(source.sourceFingerprint),
    observedAt: normalizeTimestamp(source.observedAt),
    narrative: normalizeSourceItems(source.narrative),
    encyclopedia: normalizeSourceItems(source.encyclopedia),
    profileTemplates: normalizeSourceItems(source.profileTemplates),
    capabilityPacks: normalizeSourceItems(source.capabilityPacks),
  })
}

const createHashedSourceItem = async ({ id, content, metadata } = {}) => {
  const normalizedId = normalizeStableRef(id)
  if (!normalizedId) return null
  return {
    id: normalizedId,
    contentHash: await sha256Canonical(content ?? null),
    metadataHash: await sha256Canonical(metadata ?? null),
  }
}

export const createWorldSettingSourceSnapshot = async ({
  worldOverview = {},
  observedAt = Date.now(),
} = {}) => {
  const identity = isPlainObject(worldOverview.identity) ? worldOverview.identity : {}
  const narrative = isPlainObject(worldOverview.narrative) ? worldOverview.narrative : {}
  const encyclopedia = isPlainObject(worldOverview.encyclopedia) ? worldOverview.encyclopedia : {}
  const profiles = isPlainObject(worldOverview.profiles) ? worldOverview.profiles : {}
  const capabilities = isPlainObject(worldOverview.capabilities) ? worldOverview.capabilities : {}
  const activeSources = Array.isArray(narrative.activeSources) ? narrative.activeSources : []
  const selectedEntries = Array.isArray(encyclopedia.selectedEntries)
    ? encyclopedia.selectedEntries
    : []
  const enabledTemplates = Array.isArray(profiles.enabledTemplates) ? profiles.enabledTemplates : []
  const enabledPacks = Array.isArray(capabilities.enabledPacks) ? capabilities.enabledPacks : []

  const narrativeItems = await Promise.all([
    createHashedSourceItem({
      id: 'world_fallback_narrative',
      content: narrative.fallbackText || '',
      metadata: { kind: 'fallback' },
    }),
    ...activeSources.map((item, index) => createHashedSourceItem({
      id: item?.id || item?.linkId || item?.assetId || `world_source_${index + 1}`,
      content: item?.promptText || '',
      metadata: {
        assetId: item?.assetId || '',
        sectionIds: normalizeStringList(item?.sectionIds, 120),
        role: item?.role || item?.usage || '',
        enabled: item?.enabled !== false,
        missing: item?.missing === true,
        priority: Number(item?.priority) || 0,
        sourceVersion: Number(item?.sourceVersion || item?.assetVersion) || 0,
      },
    })),
  ])
  const encyclopediaItems = await Promise.all(selectedEntries.map((item, index) =>
    createHashedSourceItem({
      id: item?.id || `encyclopedia_${index + 1}`,
      content: item?.content || '',
      metadata: {
        title: item?.title || '',
        tags: normalizeStringList(item?.tags, 80),
        enabled: item?.enabled !== false,
        updatedAt: normalizeTimestamp(item?.updatedAt),
      },
    }),
  ))
  const profileTemplateItems = await Promise.all(enabledTemplates.map((item, index) =>
    createHashedSourceItem({
      id: item?.id || `profile_template_${index + 1}`,
      content: {
        categories: item?.categories || [],
        fields: item?.fields || [],
      },
      metadata: {
        title: item?.title || item?.name || '',
        enabled: item?.enabled !== false,
        version: Number(item?.version) || 0,
      },
    }),
  ))
  const capabilityPackItems = await Promise.all(enabledPacks.map((item, index) =>
    createHashedSourceItem({
      id: item?.id || `capability_pack_${index + 1}`,
      content: {
        appBindings: item?.appBindings || [],
        serviceAccountTemplates: item?.serviceAccountTemplates || [],
        terminology: item?.terminology || {},
        economy: item?.economy || {},
      },
      metadata: {
        title: item?.title || item?.name || '',
        state: item?.state || '',
        version: Number(item?.version) || 0,
      },
    }),
  ))

  const base = {
    schemaVersion: WORLD_SETTING_SOURCE_SNAPSHOT_SCHEMA_VERSION,
    worldId: normalizeStableRef(identity.worldId, PRIMARY_PERSISTED_WORLD_ID),
    narrative: normalizeSourceItems(narrativeItems.filter(Boolean)),
    encyclopedia: normalizeSourceItems(encyclopediaItems.filter(Boolean)),
    profileTemplates: normalizeSourceItems(profileTemplateItems.filter(Boolean)),
    capabilityPacks: normalizeSourceItems(capabilityPackItems.filter(Boolean)),
  }
  const sourceFingerprint = await sha256Canonical(base)
  return normalizeWorldSettingSourceSnapshot({
    ...base,
    sourceFingerprint,
    observedAt,
  })
}

const compareSourceGroup = (previousItems = [], nextItems = []) => {
  const previous = new Map(previousItems.map((item) => [item.id, item]))
  const next = new Map(nextItems.map((item) => [item.id, item]))
  const addedIds = [...next.keys()].filter((id) => !previous.has(id)).sort()
  const removedIds = [...previous.keys()].filter((id) => !next.has(id)).sort()
  const contentChangedIds = [...next.keys()]
    .filter((id) => previous.has(id) && previous.get(id).contentHash !== next.get(id).contentHash)
    .sort()
  const metadataChangedIds = [...next.keys()]
    .filter(
      (id) =>
        previous.has(id) &&
        previous.get(id).contentHash === next.get(id).contentHash &&
        previous.get(id).metadataHash !== next.get(id).metadataHash,
    )
    .sort()
  return { addedIds, removedIds, contentChangedIds, metadataChangedIds }
}

export const classifyWorldSettingSourceChange = (previousSnapshot, nextSnapshot) => {
  const previous = normalizeWorldSettingSourceSnapshot(previousSnapshot)
  const next = normalizeWorldSettingSourceSnapshot(nextSnapshot)
  if (!previous.sourceFingerprint) {
    return deepFreeze({ status: 'first_observation', changed: true, groups: {} })
  }
  if (previous.sourceFingerprint === next.sourceFingerprint) {
    return deepFreeze({ status: 'unchanged', changed: false, groups: {} })
  }
  const groups = Object.fromEntries(
    ['narrative', 'encyclopedia', 'profileTemplates', 'capabilityPacks'].map((key) => [
      key,
      compareSourceGroup(previous[key], next[key]),
    ]),
  )
  const changes = Object.values(groups)
  const hasRemoval = changes.some((group) => group.removedIds.length > 0)
  const hasContentChange = changes.some((group) => group.contentChangedIds.length > 0)
  const hasAddition = changes.some((group) => group.addedIds.length > 0)
  const hasMetadataChange = changes.some((group) => group.metadataChangedIds.length > 0)
  const status = hasRemoval || hasContentChange
    ? 'meaning_review_required'
    : hasAddition
      ? 'content_added'
      : hasMetadataChange
        ? 'metadata_changed'
        : 'meaning_review_required'
  return deepFreeze({ status, changed: true, groups })
}

const normalizeSemanticVersionRecord = (rawRecord = {}) => {
  const source = isPlainObject(rawRecord) ? rawRecord : {}
  const versionId = normalizeStableRef(source.versionId)
  const worldId = normalizeStableRef(source.worldId)
  const revision = normalizePositiveInteger(source.revision)
  const manifestHash = normalizeHash(source.manifestHash)
  const sourceFingerprint = normalizeHash(source.sourceFingerprint)
  if (!versionId || !worldId || !revision || !manifestHash || !sourceFingerprint) return null
  return {
    schemaVersion: WORLD_SEMANTIC_VERSION_RECORD_SCHEMA_VERSION,
    versionId,
    worldId,
    revision,
    sourceFingerprint,
    proposalHash: normalizeHash(source.proposalHash),
    manifestHash,
    runtimeRegistryVersion: normalizeText(source.runtimeRegistryVersion, '', 160),
    reviewedManifest: cloneValue(source.reviewedManifest),
    compiledManifest: cloneValue(source.compiledManifest),
    compilerReceipt: cloneValue(source.compilerReceipt),
    modelReceipt: isPlainObject(source.modelReceipt) ? cloneValue(source.modelReceipt) : null,
    createdAt: normalizeTimestamp(source.createdAt),
  }
}

const normalizeActivationRecord = (rawRecord = {}) => {
  const source = isPlainObject(rawRecord) ? rawRecord : {}
  const activationId = normalizeStableRef(source.activationId)
  const versionId = normalizeStableRef(source.versionId)
  if (!activationId || !versionId) return null
  return {
    activationId,
    versionId,
    previousVersionId: normalizeStableRef(source.previousVersionId),
    reason: source.reason === 'rollback' ? 'rollback' : 'confirmed_update',
    activatedAt: normalizeTimestamp(source.activatedAt),
  }
}

export const createDefaultWorldSettingState = ({
  worldId = PRIMARY_PERSISTED_WORLD_ID,
  title = 'My world',
  now = Date.now(),
} = {}) => deepFreeze({
  schemaVersion: WORLD_SETTING_STATE_SCHEMA_VERSION,
  identity: {
    worldId: normalizeStableRef(worldId, PRIMARY_PERSISTED_WORLD_ID),
    title: normalizeText(title, 'My world', 120),
    createdAt: normalizeTimestamp(now),
    updatedAt: normalizeTimestamp(now),
  },
  source: {
    current: normalizeWorldSettingSourceSnapshot({ worldId }),
  },
  semantic: {
    activeVersionId: '',
    previousVersionId: '',
    candidateVersionId: '',
    versions: [],
    activationHistory: [],
  },
})

export const normalizeWorldSettingState = (rawState = {}, options = {}) => {
  const source = isPlainObject(rawState) ? rawState : {}
  const fallback = createDefaultWorldSettingState(options)
  const identitySource = isPlainObject(source.identity) ? source.identity : {}
  const worldId = normalizeStableRef(identitySource.worldId, fallback.identity.worldId)
  const versions = []
  const seenVersionIds = new Set()
  ;(Array.isArray(source.semantic?.versions) ? source.semantic.versions : []).forEach((item) => {
    const normalized = normalizeSemanticVersionRecord(item)
    if (!normalized || normalized.worldId !== worldId || seenVersionIds.has(normalized.versionId)) return
    seenVersionIds.add(normalized.versionId)
    versions.push(normalized)
  })
  versions.sort((left, right) => left.revision - right.revision || left.versionId.localeCompare(right.versionId))
  const versionIds = new Set(versions.map((item) => item.versionId))
  const activeVersionId = normalizeStableRef(source.semantic?.activeVersionId)
  const previousVersionId = normalizeStableRef(source.semantic?.previousVersionId)
  const candidateVersionId = normalizeStableRef(source.semantic?.candidateVersionId)
  const activationHistory = (Array.isArray(source.semantic?.activationHistory)
    ? source.semantic.activationHistory
    : [])
    .map(normalizeActivationRecord)
    .filter((item) => item && versionIds.has(item.versionId))

  return deepFreeze({
    schemaVersion: WORLD_SETTING_STATE_SCHEMA_VERSION,
    identity: {
      worldId,
      title: normalizeText(identitySource.title, fallback.identity.title, 120),
      createdAt: normalizeTimestamp(identitySource.createdAt, fallback.identity.createdAt),
      updatedAt: normalizeTimestamp(identitySource.updatedAt, fallback.identity.updatedAt),
    },
    source: {
      current: normalizeWorldSettingSourceSnapshot({
        ...(isPlainObject(source.source?.current) ? source.source.current : {}),
        worldId,
      }),
    },
    semantic: {
      activeVersionId: versionIds.has(activeVersionId) ? activeVersionId : '',
      previousVersionId: versionIds.has(previousVersionId) ? previousVersionId : '',
      candidateVersionId: versionIds.has(candidateVersionId) ? candidateVersionId : '',
      versions,
      activationHistory,
    },
  })
}

export const inspectPersistedWorldSettingState = (rawState) => {
  if (rawState === undefined || rawState === null) {
    return deepFreeze({ ok: true, legacy: true, errors: [] })
  }
  const source = isPlainObject(rawState) ? rawState : {}
  const errors = []
  if (source.schemaVersion !== WORLD_SETTING_STATE_SCHEMA_VERSION) {
    errors.push({ code: 'unsupported_world_setting_schema', path: 'schemaVersion' })
  }
  const worldId = normalizeStableRef(source.identity?.worldId)
  if (!worldId) errors.push({ code: 'world_identity_invalid', path: 'identity.worldId' })
  const rawVersions = Array.isArray(source.semantic?.versions) ? source.semantic.versions : null
  if (!rawVersions) {
    errors.push({ code: 'semantic_versions_invalid', path: 'semantic.versions' })
  }
  const seen = new Set()
  ;(rawVersions || []).forEach((rawVersion, index) => {
    const version = normalizeSemanticVersionRecord(rawVersion)
    if (!version) {
      errors.push({ code: 'semantic_version_invalid', path: `semantic.versions.${index}` })
      return
    }
    if (version.worldId !== worldId) {
      errors.push({ code: 'semantic_version_world_mismatch', path: `semantic.versions.${index}.worldId` })
    }
    if (seen.has(version.versionId)) {
      errors.push({ code: 'semantic_version_duplicate', path: `semantic.versions.${index}.versionId` })
    }
    seen.add(version.versionId)
    if (
      version.reviewedManifest?.worldId !== version.worldId ||
      Number(version.reviewedManifest?.manifestRevision) !== version.revision ||
      version.reviewedManifest?.sourceFingerprint !== version.sourceFingerprint ||
      version.reviewedManifest?.proposalHash !== version.proposalHash
    ) {
      errors.push({ code: 'reviewed_manifest_record_mismatch', path: `semantic.versions.${index}` })
    }
    if (
      version.compiledManifest?.manifestHash !== version.manifestHash ||
      version.compiledManifest?.sourceFingerprint !== version.sourceFingerprint ||
      version.compiledManifest?.proposalHash !== version.proposalHash ||
      version.compiledManifest?.runtimeRegistryVersion !== version.runtimeRegistryVersion ||
      version.compilerReceipt?.manifestHash !== version.manifestHash
    ) {
      errors.push({ code: 'compiled_manifest_record_mismatch', path: `semantic.versions.${index}` })
    }
  })
  ;['activeVersionId', 'previousVersionId', 'candidateVersionId'].forEach((key) => {
    const pointer = normalizeStableRef(source.semantic?.[key])
    if (pointer && !seen.has(pointer)) {
      errors.push({ code: 'semantic_version_pointer_missing', path: `semantic.${key}` })
    }
  })
  return deepFreeze({ ok: errors.length === 0, legacy: false, errors })
}

export const observeWorldSettingSource = ({ state, snapshot, now = Date.now() } = {}) => {
  const current = normalizeWorldSettingState(state)
  const nextSnapshot = normalizeWorldSettingSourceSnapshot({
    ...snapshot,
    worldId: current.identity.worldId,
  })
  if (!nextSnapshot.sourceFingerprint) {
    return deepFreeze({ ok: false, reason: 'source_snapshot_invalid', state: current, change: null })
  }
  const change = classifyWorldSettingSourceChange(current.source.current, nextSnapshot)
  const next = normalizeWorldSettingState({
    ...current,
    identity: { ...current.identity, updatedAt: normalizeTimestamp(now) },
    source: { current: nextSnapshot },
  })
  return deepFreeze({ ok: true, reason: change.status, state: next, change })
}

const nextSemanticRevision = (state) =>
  state.semantic.versions.reduce((maximum, version) => Math.max(maximum, version.revision), 0) + 1

export const createWorldSemanticCandidateVersion = async ({
  state,
  proposal,
  confirmation,
  runtimeRegistry,
  modelReceipt = null,
  now = Date.now(),
} = {}) => {
  const current = normalizeWorldSettingState(state)
  const revision = nextSemanticRevision(current)
  if (proposal?.worldId !== current.identity.worldId) {
    return deepFreeze({ ok: false, reason: 'world_id_mismatch', state: current, errors: [] })
  }
  if (
    !current.source.current.sourceFingerprint ||
    proposal?.sourceFingerprint !== current.source.current.sourceFingerprint
  ) {
    return deepFreeze({ ok: false, reason: 'source_fingerprint_mismatch', state: current, errors: [] })
  }
  if (Number(confirmation?.manifestRevision) !== revision) {
    return deepFreeze({ ok: false, reason: 'manifest_revision_mismatch', state: current, errors: [] })
  }
  const reviewed = await createReviewedWorldSemanticManifest({ proposal, confirmation })
  if (!reviewed.ok) {
    return deepFreeze({ ok: false, reason: 'review_invalid', state: current, errors: reviewed.errors })
  }
  const compiled = await compileReviewedWorldSemanticManifest({
    reviewedManifest: reviewed.manifest,
    runtimeRegistry,
  })
  if (!compiled.ok) {
    return deepFreeze({ ok: false, reason: 'compile_failed', state: current, errors: compiled.errors })
  }
  const normalizedReceipt = modelReceipt
    ? normalizeWorldSemanticModelReceipt(modelReceipt)
    : { ok: true, receipt: null, errors: [] }
  if (!normalizedReceipt.ok) {
    return deepFreeze({ ok: false, reason: 'model_receipt_invalid', state: current, errors: normalizedReceipt.errors })
  }
  const versionId = `semantic_${revision}_${compiled.receipt.manifestHash.slice(0, 12)}`
  const record = normalizeSemanticVersionRecord({
    schemaVersion: WORLD_SEMANTIC_VERSION_RECORD_SCHEMA_VERSION,
    versionId,
    worldId: current.identity.worldId,
    revision,
    sourceFingerprint: compiled.receipt.sourceFingerprint,
    proposalHash: compiled.receipt.proposalHash,
    manifestHash: compiled.receipt.manifestHash,
    runtimeRegistryVersion: compiled.receipt.runtimeRegistryVersion,
    reviewedManifest: reviewed.manifest,
    compiledManifest: compiled.manifest,
    compilerReceipt: compiled.receipt,
    modelReceipt: normalizedReceipt.receipt,
    createdAt: normalizeTimestamp(now),
  })
  const next = normalizeWorldSettingState({
    ...current,
    identity: { ...current.identity, updatedAt: normalizeTimestamp(now) },
    semantic: {
      ...current.semantic,
      candidateVersionId: versionId,
      versions: [...current.semantic.versions, record],
    },
  })
  return deepFreeze({ ok: true, reason: 'candidate_created', state: next, version: record, errors: [] })
}

const verifySemanticVersion = async ({ version, runtimeRegistry }) => {
  const compiled = await compileReviewedWorldSemanticManifest({
    reviewedManifest: version.reviewedManifest,
    runtimeRegistry,
  })
  if (!compiled.ok) return { ok: false, reason: 'compile_failed', errors: compiled.errors }
  if (
    compiled.receipt.manifestHash !== version.manifestHash ||
    compiled.receipt.proposalHash !== version.proposalHash ||
    compiled.receipt.sourceFingerprint !== version.sourceFingerprint ||
    compiled.receipt.runtimeRegistryVersion !== version.runtimeRegistryVersion
  ) {
    return { ok: false, reason: 'stored_version_verification_failed', errors: [] }
  }
  return { ok: true, reason: 'verified', errors: [], compiled }
}

const activateVerifiedVersion = ({ state, version, reason, now }) => {
  const previousVersionId = state.semantic.activeVersionId
  const activatedAt = normalizeTimestamp(now)
  const activationId = `activation_${activatedAt}_${version.versionId}`.slice(0, 180)
  return normalizeWorldSettingState({
    ...state,
    identity: { ...state.identity, updatedAt: activatedAt },
    semantic: {
      ...state.semantic,
      activeVersionId: version.versionId,
      previousVersionId,
      candidateVersionId:
        state.semantic.candidateVersionId === version.versionId
          ? ''
          : state.semantic.candidateVersionId,
      activationHistory: [
        ...state.semantic.activationHistory,
        {
          activationId,
          versionId: version.versionId,
          previousVersionId,
          reason,
          activatedAt,
        },
      ],
    },
  })
}

export const activateWorldSemanticVersion = async ({
  state,
  versionId,
  runtimeRegistry,
  currentSourceFingerprint,
  now = Date.now(),
} = {}) => {
  const current = normalizeWorldSettingState(state)
  const targetId = normalizeStableRef(versionId, current.semantic.candidateVersionId)
  const version = current.semantic.versions.find((item) => item.versionId === targetId)
  if (!version) return deepFreeze({ ok: false, reason: 'version_not_found', state: current, errors: [] })
  const fingerprint = normalizeHash(currentSourceFingerprint || current.source.current.sourceFingerprint)
  if (!fingerprint || version.sourceFingerprint !== fingerprint) {
    return deepFreeze({ ok: false, reason: 'candidate_stale', state: current, errors: [] })
  }
  const verification = await verifySemanticVersion({ version, runtimeRegistry })
  if (!verification.ok) {
    return deepFreeze({ ok: false, reason: verification.reason, state: current, errors: verification.errors })
  }
  const next = activateVerifiedVersion({ state: current, version, reason: 'confirmed_update', now })
  return deepFreeze({ ok: true, reason: 'version_activated', state: next, version, errors: [] })
}

export const rollbackWorldSemanticVersion = async ({
  state,
  runtimeRegistry,
  now = Date.now(),
} = {}) => {
  const current = normalizeWorldSettingState(state)
  const targetId = current.semantic.previousVersionId
  const version = current.semantic.versions.find((item) => item.versionId === targetId)
  if (!version) return deepFreeze({ ok: false, reason: 'rollback_unavailable', state: current, errors: [] })
  const verification = await verifySemanticVersion({ version, runtimeRegistry })
  if (!verification.ok) {
    return deepFreeze({ ok: false, reason: verification.reason, state: current, errors: verification.errors })
  }
  const next = activateVerifiedVersion({ state: current, version, reason: 'rollback', now })
  return deepFreeze({ ok: true, reason: 'version_rolled_back', state: next, version, errors: [] })
}

export const resolveActiveWorldSemanticBinding = (state) => {
  const current = normalizeWorldSettingState(state)
  const version = current.semantic.versions.find(
    (item) => item.versionId === current.semantic.activeVersionId,
  )
  return deepFreeze({
    worldId: current.identity.worldId,
    semanticVersionId: version?.versionId || '',
    semanticManifestRevision: version?.revision || 0,
    semanticManifestHash: version?.manifestHash || '',
    semanticSourceFingerprint: version?.sourceFingerprint || '',
  })
}

export const resolveWorldSettingVersionStatus = (state) => {
  const current = normalizeWorldSettingState(state)
  const active = current.semantic.versions.find(
    (item) => item.versionId === current.semantic.activeVersionId,
  )
  const candidate = current.semantic.versions.find(
    (item) => item.versionId === current.semantic.candidateVersionId,
  )
  const sourceFingerprint = current.source.current.sourceFingerprint
  return deepFreeze({
    worldId: current.identity.worldId,
    hasActiveVersion: Boolean(active),
    activeVersionId: active?.versionId || '',
    activeRevision: active?.revision || 0,
    candidateVersionId: candidate?.versionId || '',
    candidateRevision: candidate?.revision || 0,
    sourceChanged: Boolean(active && sourceFingerprint && active.sourceFingerprint !== sourceFingerprint),
    rollbackAvailable: Boolean(current.semantic.previousVersionId),
  })
}
