import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { cloneMiniSceneValue, normalizeMiniSceneId } from '../lib/mini-scene-contract'
import {
  normalizeMiniSceneModulePolicy,
  normalizeMiniSceneProfileBinding,
  validateMiniSceneArtifact,
} from '../lib/mini-scene-schema'
import {
  EVENT_RUNTIME_MINI_SCENE_MODULE_KEY,
  buildMiniSceneChoiceRequest,
  getRegisteredMiniSceneModule,
  listRegisteredMiniSceneModules,
} from '../lib/mini-scene-runtime'

export const MINI_SCENE_STORAGE_KEY = 'store:mini-scene'
export const MINI_SCENE_STORAGE_VERSION = 2

const AUDIT_LIMIT = 240
const HISTORY_PAGE_SIZE = 12
const HISTORY_PAGE_SIZE_MAX = 50
const DEFAULT_MODULE_POLICIES = Object.freeze([
  Object.freeze({ moduleKey: EVENT_RUNTIME_MINI_SCENE_MODULE_KEY, mode: 'unconfigured' }),
])

const cloneDefaultPolicies = () => DEFAULT_MODULE_POLICIES.map((policy) => ({ ...policy }))

const normalizePolicies = (raw) => {
  if (!Array.isArray(raw)) return cloneDefaultPolicies()
  const registeredModuleKeys = new Set(
    listRegisteredMiniSceneModules().map((registration) => registration.moduleKey),
  )
  const byModule = new Map()
  raw.forEach((item) => {
    const policy = normalizeMiniSceneModulePolicy(item)
    if (!registeredModuleKeys.has(policy.moduleKey) || byModule.has(policy.moduleKey)) return
    byModule.set(policy.moduleKey, policy)
  })
  registeredModuleKeys.forEach((moduleKey) => {
    if (!byModule.has(moduleKey)) byModule.set(moduleKey, { moduleKey, mode: 'unconfigured' })
  })
  return [...byModule.values()].sort((left, right) => left.moduleKey.localeCompare(right.moduleKey))
}

const normalizeBindings = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((binding, index) => normalizeMiniSceneProfileBinding(binding, index))
    .filter((binding) => binding.profileId && binding.scope)

const normalizeArtifacts = (raw) => {
  const byId = new Map()
  ;(Array.isArray(raw) ? raw : []).forEach((item) => {
    const result = validateMiniSceneArtifact(item)
    if (
      !result.ok ||
      !['retained', 'archived'].includes(result.artifact.retention.state) ||
      byId.has(result.artifact.artifactId)
    ) return
    byId.set(result.artifact.artifactId, result.artifact)
  })
  return [...byId.values()].sort(
    (left, right) =>
      (right.retention.retainedAt || right.provenance.generatedAt) -
        (left.retention.retainedAt || left.provenance.generatedAt) ||
      left.artifactId.localeCompare(right.artifactId),
  )
}

const normalizeAudit = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((entry) => ({
      id: normalizeMiniSceneId(entry?.id),
      artifactId: normalizeMiniSceneId(entry?.artifactId),
      action: normalizeMiniSceneId(entry?.action),
      choiceId: normalizeMiniSceneId(entry?.choiceId),
      createdAt: Math.max(0, Math.floor(Number(entry?.createdAt) || 0)),
    }))
    .filter((entry) => entry.id && entry.artifactId && entry.action && entry.createdAt)
    .sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id))
    .slice(0, AUDIT_LIMIT)

const getLegacyRevision = (artifact = {}) => {
  const explicit = Math.floor(Number(artifact.revision) || 0)
  if (explicit > 0) return explicit
  const match = String(artifact.artifactId || '').match(/:v(\d+)$/i)
  return Math.max(1, Number(match?.[1]) || 1)
}

export const migrateMiniSceneStorage = ({ version, data } = {}) => {
  if (Number(version) !== 1 || !data || typeof data !== 'object' || Array.isArray(data)) return null
  return {
    ...data,
    schemaVersion: MINI_SCENE_STORAGE_VERSION,
    artifacts: (Array.isArray(data.artifacts) ? data.artifacts : []).map((artifact) => ({
      ...artifact,
      revision: getLegacyRevision(artifact),
      previousArtifactId: '',
      retention: {
        state: 'retained',
        retainedAt: Math.max(
          1,
          Math.floor(Number(artifact?.provenance?.generatedAt) || Date.now()),
        ),
        archivedAt: 0,
      },
    })),
  }
}

const resolveBackupSource = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {}
  return snapshot.miniScene && typeof snapshot.miniScene === 'object'
    ? snapshot.miniScene
    : snapshot
}

const normalizePage = (value) => Math.max(1, Math.floor(Number(value) || 1))
const normalizePageSize = (value) =>
  Math.min(HISTORY_PAGE_SIZE_MAX, Math.max(1, Math.floor(Number(value) || HISTORY_PAGE_SIZE)))

const getOccurrenceKey = (value = {}) => {
  const source = value.source || {}
  const worldId = value.worldId || value.worldContext?.worldId || 'legacy_single_world'
  return [
    normalizeMiniSceneId(source.moduleKey),
    normalizeMiniSceneId(source.recordId),
    normalizeMiniSceneId(source.eventId),
    normalizeMiniSceneId(value.sceneType),
    normalizeMiniSceneId(worldId, 'legacy_single_world'),
  ].join('|')
}

export const useMiniSceneStore = defineStore('miniScene', () => {
  const modulePolicies = ref(cloneDefaultPolicies())
  const profileBindings = ref([])
  const artifacts = ref([])
  const interactionAudit = ref([])
  const activeArtifactId = ref('')
  const activePresentation = ref(null)
  const retentionError = ref(null)
  const hasFinishedStorageHydration = ref(false)
  let skipNextTransactionalWatchedWrite = false

  const registeredModules = computed(() => listRegisteredMiniSceneModules())
  const activeArtifact = computed(() => activePresentation.value)
  const activeArtifactIsRetained = computed(() =>
    ['retained', 'archived'].includes(activePresentation.value?.retention?.state),
  )

  const findArtifactById = (artifactId) => {
    const id = normalizeMiniSceneId(artifactId)
    return artifacts.value.find((artifact) => artifact.artifactId === id) || null
  }

  const findReusableArtifactForRequest = (request = {}) => {
    const occurrenceKey = getOccurrenceKey(request)
    const candidates = artifacts.value.filter(
      (artifact) =>
        artifact.retention.state === 'retained' && getOccurrenceKey(artifact) === occurrenceKey,
    )
    return (
      candidates.find((artifact) => artifact.requestId === normalizeMiniSceneId(request.requestId)) ||
      candidates[0] ||
      null
    )
  }

  const findActivePresentationForRequest = (request = {}) => {
    if (!activePresentation.value) return null
    return getOccurrenceKey(activePresentation.value) === getOccurrenceKey(request)
      ? activePresentation.value
      : null
  }

  const getModulePolicy = (moduleKey) => {
    const normalizedKey = normalizeMiniSceneId(moduleKey)
    return (
      modulePolicies.value.find((policy) => policy.moduleKey === normalizedKey) || {
        moduleKey: normalizedKey,
        mode: 'unconfigured',
      }
    )
  }

  const setModulePresentationMode = (moduleKey, mode) => {
    const registration = getRegisteredMiniSceneModule(moduleKey)
    if (!registration) return false
    const policy = normalizeMiniSceneModulePolicy({ moduleKey, mode })
    const allowedModes = new Set(['off', ...registration.supportedModes])
    if (!allowedModes.has(policy.mode)) return false
    const index = modulePolicies.value.findIndex((item) => item.moduleKey === policy.moduleKey)
    if (index < 0) modulePolicies.value.push(policy)
    else modulePolicies.value.splice(index, 1, policy)
    modulePolicies.value.sort((left, right) => left.moduleKey.localeCompare(right.moduleKey))
    return true
  }

  const appendAudit = (artifactId, action, choiceId = '', now = Date.now()) => {
    const createdAt = Math.max(1, Math.floor(Number(now) || Date.now()))
    const entry = {
      id: normalizeMiniSceneId(`${artifactId}:${action}:${createdAt}`),
      artifactId: normalizeMiniSceneId(artifactId),
      action: normalizeMiniSceneId(action),
      choiceId: normalizeMiniSceneId(choiceId),
      createdAt,
    }
    interactionAudit.value = normalizeAudit([entry, ...interactionAudit.value])
    return entry
  }

  const createPersistedSnapshot = () => ({
    schemaVersion: MINI_SCENE_STORAGE_VERSION,
    modulePolicies: cloneMiniSceneValue(modulePolicies.value),
    profileBindings: cloneMiniSceneValue(profileBindings.value),
    artifacts: cloneMiniSceneValue(artifacts.value),
    interactionAudit: cloneMiniSceneValue(interactionAudit.value),
  })

  const persistToStorage = () =>
    writePersistedState(MINI_SCENE_STORAGE_KEY, createPersistedSnapshot(), {
      version: MINI_SCENE_STORAGE_VERSION,
      migrate: migrateMiniSceneStorage,
    })

  const armTransactionalWatchedWriteSkip = () => {
    skipNextTransactionalWatchedWrite = true
    queueMicrotask(() => {
      skipNextTransactionalWatchedWrite = false
    })
  }

  const runArtifactTransaction = (mutate) => {
    const beforeArtifacts = cloneMiniSceneValue(artifacts.value)
    const beforeAudit = cloneMiniSceneValue(interactionAudit.value)
    const beforePresentation = cloneMiniSceneValue(activePresentation.value)
    const beforeActiveId = activeArtifactId.value
    const result = mutate()
    if (result === false) return { ok: false, reason: 'mutation_rejected', persistence: null }
    armTransactionalWatchedWriteSkip()
    const persistence = persistToStorage()
    if (persistence?.ok === true) return { ok: true, reason: '', persistence }
    artifacts.value = beforeArtifacts
    interactionAudit.value = beforeAudit
    activePresentation.value = beforePresentation
    activeArtifactId.value = beforeActiveId
    return {
      ok: false,
      reason: persistence?.error || 'persistence_failed',
      persistence: persistence || null,
    }
  }

  const presentTemporaryArtifact = (rawArtifact) => {
    const result = validateMiniSceneArtifact({
      ...rawArtifact,
      retention: { state: 'temporary', retainedAt: 0, archivedAt: 0 },
    })
    if (!result.ok) return { ok: false, reason: 'artifact_invalid', artifact: null }
    result.artifact.interactionState.closed = false
    activePresentation.value = cloneMiniSceneValue(result.artifact)
    activeArtifactId.value = result.artifact.artifactId
    retentionError.value = null
    return { ok: true, reason: '', artifact: cloneMiniSceneValue(result.artifact) }
  }

  const commitArtifact = (rawArtifact) => {
    const result = validateMiniSceneArtifact(rawArtifact)
    if (!result.ok) return null
    const retainedAt = Math.max(
      1,
      result.artifact.retention.retainedAt || result.artifact.provenance.generatedAt || Date.now(),
    )
    const retained = {
      ...result.artifact,
      retention: { state: 'retained', retainedAt, archivedAt: 0 },
      interactionState: { ...result.artifact.interactionState, closed: false },
    }
    const existing = findArtifactById(retained.artifactId)
    if (existing?.interactionState?.selectedChoiceId) {
      const choiceStillExists = retained.content.choices.some(
        (choice) => choice.id === existing.interactionState.selectedChoiceId,
      )
      if (choiceStillExists) retained.interactionState.selectedChoiceId = existing.interactionState.selectedChoiceId
    }
    artifacts.value = normalizeArtifacts([
      retained,
      ...artifacts.value.filter((artifact) => artifact.artifactId !== retained.artifactId),
    ])
    appendAudit(retained.artifactId, 'retained', '', retainedAt)
    return findArtifactById(retained.artifactId)
  }

  const openArtifact = (artifactId) => {
    const artifact = findArtifactById(artifactId)
    if (!artifact) return false
    activePresentation.value = cloneMiniSceneValue({
      ...artifact,
      interactionState: { ...artifact.interactionState, closed: false },
    })
    activeArtifactId.value = artifact.artifactId
    retentionError.value = null
    appendAudit(artifact.artifactId, 'opened')
    return true
  }

  const closeActiveArtifact = () => {
    const artifact = activePresentation.value
    if (!artifact) return false
    if (['retained', 'archived'].includes(artifact.retention.state)) {
      const retained = findArtifactById(artifact.artifactId)
      if (retained) retained.interactionState = { ...artifact.interactionState, closed: true }
      appendAudit(artifact.artifactId, 'closed')
    }
    activePresentation.value = null
    activeArtifactId.value = ''
    retentionError.value = null
    return true
  }

  const chooseActiveArtifact = (choiceId) => {
    const artifact = activePresentation.value
    const id = normalizeMiniSceneId(choiceId)
    if (!artifact || !artifact.content.choices.some((choice) => choice.id === id)) return false
    artifact.interactionState.selectedChoiceId = id
    if (['retained', 'archived'].includes(artifact.retention.state)) {
      const retained = findArtifactById(artifact.artifactId)
      if (retained) retained.interactionState.selectedChoiceId = id
      appendAudit(artifact.artifactId, 'choice_selected', id)
    }
    return true
  }

  const getActiveChoiceRequest = () => {
    const artifact = activePresentation.value
    if (!artifact?.interactionState?.selectedChoiceId) {
      return { ok: false, request: null, reason: 'choice_missing' }
    }
    return buildMiniSceneChoiceRequest(artifact, artifact.interactionState.selectedChoiceId)
  }

  const markActiveArtifactReturnToSource = () => {
    const artifact = activePresentation.value
    if (!artifact) return false
    if (['retained', 'archived'].includes(artifact.retention.state)) {
      const retained = findArtifactById(artifact.artifactId)
      if (retained) retained.interactionState = { ...artifact.interactionState, closed: true }
      appendAudit(artifact.artifactId, 'source_opened')
    }
    activePresentation.value = null
    activeArtifactId.value = ''
    retentionError.value = null
    return true
  }

  const retainActiveArtifact = ({ now = Date.now() } = {}) => {
    const artifact = activePresentation.value
    if (!artifact) return { ok: false, reason: 'artifact_missing', artifact: null }
    if (['retained', 'archived'].includes(artifact.retention.state)) {
      return { ok: true, reason: 'already_retained', artifact: cloneMiniSceneValue(artifact) }
    }
    if (findArtifactById(artifact.artifactId)) {
      return { ok: false, reason: 'artifact_id_conflict', artifact: null }
    }
    const retainedAt = Math.max(1, Math.floor(Number(now) || Date.now()))
    const transaction = runArtifactTransaction(() => {
      const retained = {
        ...cloneMiniSceneValue(artifact),
        retention: { state: 'retained', retainedAt, archivedAt: 0 },
      }
      artifacts.value = normalizeArtifacts([retained, ...artifacts.value])
      activePresentation.value = cloneMiniSceneValue(retained)
      activeArtifactId.value = retained.artifactId
      appendAudit(retained.artifactId, 'retained', '', retainedAt)
      return true
    })
    if (!transaction.ok) {
      retentionError.value = {
        reason: transaction.reason,
        retryable: transaction.persistence?.retryable !== false,
      }
      return { ...transaction, artifact: null }
    }
    retentionError.value = null
    return {
      ...transaction,
      artifact: cloneMiniSceneValue(findArtifactById(artifact.artifactId)),
    }
  }

  const setArtifactRetentionState = (artifactId, state, { now = Date.now() } = {}) => {
    const id = normalizeMiniSceneId(artifactId)
    if (!['retained', 'archived'].includes(state)) {
      return { ok: false, reason: 'retention_state_invalid', artifact: null }
    }
    const existing = findArtifactById(id)
    if (!existing) return { ok: false, reason: 'artifact_missing', artifact: null }
    const changedAt = Math.max(1, Math.floor(Number(now) || Date.now()))
    const transaction = runArtifactTransaction(() => {
      const artifact = findArtifactById(id)
      artifact.retention = {
        state,
        retainedAt: artifact.retention.retainedAt || changedAt,
        archivedAt: state === 'archived' ? changedAt : 0,
      }
      artifacts.value = normalizeArtifacts(artifacts.value)
      if (activePresentation.value?.artifactId === id) {
        activePresentation.value.retention = cloneMiniSceneValue(artifact.retention)
      }
      appendAudit(id, state === 'archived' ? 'archived' : 'restored', '', changedAt)
      return true
    })
    return {
      ...transaction,
      artifact: transaction.ok ? cloneMiniSceneValue(findArtifactById(id)) : null,
    }
  }

  const archiveArtifact = (artifactId, options) =>
    setArtifactRetentionState(artifactId, 'archived', options)
  const restoreArtifact = (artifactId, options) =>
    setArtifactRetentionState(artifactId, 'retained', options)

  const deleteArtifact = (artifactId, { now = Date.now() } = {}) => {
    const id = normalizeMiniSceneId(artifactId)
    if (!findArtifactById(id)) return { ok: false, reason: 'artifact_missing' }
    return runArtifactTransaction(() => {
      artifacts.value = artifacts.value.filter((artifact) => artifact.artifactId !== id)
      appendAudit(id, 'deleted', '', now)
      if (activePresentation.value?.artifactId === id) {
        activePresentation.value = null
        activeArtifactId.value = ''
      }
      return true
    })
  }

  const listRetainedArtifacts = ({ state = 'all', page = 1, pageSize = HISTORY_PAGE_SIZE } = {}) => {
    const normalizedState = ['retained', 'archived'].includes(state) ? state : 'all'
    const normalizedPageSize = normalizePageSize(pageSize)
    const filtered = artifacts.value.filter(
      (artifact) => normalizedState === 'all' || artifact.retention.state === normalizedState,
    )
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize))
    const normalizedPage = Math.min(normalizePage(page), totalPages)
    const start = (normalizedPage - 1) * normalizedPageSize
    return {
      items: cloneMiniSceneValue(filtered.slice(start, start + normalizedPageSize)),
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalPages,
      state: normalizedState,
    }
  }

  const getArtifactSourceRoute = (artifact = activePresentation.value) => {
    if (!artifact) return ''
    return getRegisteredMiniSceneModule(artifact.source.moduleKey)?.route || ''
  }

  const applyPersistedSource = (source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false
    const migrated = Number(source.schemaVersion) === 1
      ? migrateMiniSceneStorage({ version: 1, data: source })
      : source
    if (!migrated) return false
    modulePolicies.value = normalizePolicies(migrated.modulePolicies)
    profileBindings.value = normalizeBindings(migrated.profileBindings)
    artifacts.value = normalizeArtifacts(migrated.artifacts)
    interactionAudit.value = normalizeAudit(migrated.interactionAudit)
    activePresentation.value = null
    activeArtifactId.value = ''
    retentionError.value = null
    return true
  }

  const createBackupSnapshot = () => createPersistedSnapshot()
  const createBackupSnapshotAsync = async () => createBackupSnapshot()
  const restoreFromBackup = (snapshot = {}) => applyPersistedSource(resolveBackupSource(snapshot))

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(MINI_SCENE_STORAGE_KEY, {
      version: MINI_SCENE_STORAGE_VERSION,
      migrate: migrateMiniSceneStorage,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(MINI_SCENE_STORAGE_KEY, {
      version: MINI_SCENE_STORAGE_VERSION,
      migrate: migrateMiniSceneStorage,
    })
    return applyPersistedSource(persisted)
  }

  const commitAndOpenArtifact = (rawArtifact) => {
    const validated = validateMiniSceneArtifact(rawArtifact)
    if (!validated.ok) return { ok: false, reason: 'artifact_invalid', artifact: null }
    const existing = findArtifactById(validated.artifact.artifactId)
    if (
      existing &&
      (existing.requestId !== validated.artifact.requestId ||
        JSON.stringify(existing.source) !== JSON.stringify(validated.artifact.source))
    ) {
      return { ok: false, reason: 'artifact_id_conflict', artifact: null }
    }
    const transaction = runArtifactTransaction(() => {
      const committed = existing || commitArtifact(validated.artifact)
      return Boolean(committed && openArtifact(committed.artifactId))
    })
    return {
      ...transaction,
      artifact: transaction.ok
        ? cloneMiniSceneValue(findArtifactById(validated.artifact.artifactId))
        : null,
    }
  }

  const saveNow = () => persistToStorage()

  const resetForTesting = () => {
    modulePolicies.value = cloneDefaultPolicies()
    profileBindings.value = []
    artifacts.value = []
    interactionAudit.value = []
    activeArtifactId.value = ''
    activePresentation.value = null
    retentionError.value = null
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) await hydrateFromStorageAsync()
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [modulePolicies, profileBindings, artifacts, interactionAudit],
    () => {
      if (!hasFinishedStorageHydration.value) return
      if (skipNextTransactionalWatchedWrite) {
        skipNextTransactionalWatchedWrite = false
        return
      }
      persistToStorage()
    },
    { deep: true },
  )

  return {
    modulePolicies,
    profileBindings,
    artifacts,
    interactionAudit,
    activeArtifactId,
    activePresentation,
    retentionError,
    hasFinishedStorageHydration,
    registeredModules,
    activeArtifact,
    activeArtifactIsRetained,
    findArtifactById,
    findReusableArtifactForRequest,
    findActivePresentationForRequest,
    getModulePolicy,
    setModulePresentationMode,
    presentTemporaryArtifact,
    commitArtifact,
    commitAndOpenArtifact,
    openArtifact,
    closeActiveArtifact,
    chooseActiveArtifact,
    getActiveChoiceRequest,
    markActiveArtifactReturnToSource,
    retainActiveArtifact,
    archiveArtifact,
    restoreArtifact,
    deleteArtifact,
    listRetainedArtifacts,
    getArtifactSourceRoute,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    saveNow,
    resetForTesting,
  }
})
