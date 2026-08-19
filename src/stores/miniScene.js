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
export const MINI_SCENE_STORAGE_VERSION = 1

const ARTIFACT_LIMIT = 120
const AUDIT_LIMIT = 240
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
    if (
      !registeredModuleKeys.has(policy.moduleKey) ||
      byModule.has(policy.moduleKey)
    ) return
    byModule.set(policy.moduleKey, policy)
  })
  registeredModuleKeys.forEach((moduleKey) => {
    if (!byModule.has(moduleKey)) {
      byModule.set(moduleKey, { moduleKey, mode: 'unconfigured' })
    }
  })
  return [...byModule.values()].sort((left, right) =>
    left.moduleKey.localeCompare(right.moduleKey),
  )
}

const normalizeBindings = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((binding, index) => normalizeMiniSceneProfileBinding(binding, index))
    .filter((binding) => binding.profileId && binding.scope)

const normalizeArtifacts = (raw) => {
  const byId = new Map()
  ;(Array.isArray(raw) ? raw : []).forEach((item) => {
    const result = validateMiniSceneArtifact(item)
    if (!result.ok || byId.has(result.artifact.artifactId)) return
    byId.set(result.artifact.artifactId, result.artifact)
  })
  return [...byId.values()]
    .sort(
      (left, right) =>
        right.provenance.generatedAt - left.provenance.generatedAt ||
        left.artifactId.localeCompare(right.artifactId),
    )
    .slice(0, ARTIFACT_LIMIT)
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

const resolveBackupSource = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {}
  return snapshot.miniScene && typeof snapshot.miniScene === 'object'
    ? snapshot.miniScene
    : snapshot
}

export const useMiniSceneStore = defineStore('miniScene', () => {
  const modulePolicies = ref(cloneDefaultPolicies())
  const profileBindings = ref([])
  const artifacts = ref([])
  const interactionAudit = ref([])
  const activeArtifactId = ref('')
  const hasFinishedStorageHydration = ref(false)

  const registeredModules = computed(() => listRegisteredMiniSceneModules())
  const activeArtifact = computed(
    () => artifacts.value.find((artifact) => artifact.artifactId === activeArtifactId.value) || null,
  )

  const findArtifactById = (artifactId) => {
    const id = normalizeMiniSceneId(artifactId)
    return artifacts.value.find((artifact) => artifact.artifactId === id) || null
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

  const commitArtifact = (rawArtifact) => {
    const result = validateMiniSceneArtifact(rawArtifact)
    if (!result.ok) return null
    const existing = findArtifactById(result.artifact.artifactId)
    if (existing?.interactionState?.selectedChoiceId) {
      const choiceStillExists = result.artifact.content.choices.some(
        (choice) => choice.id === existing.interactionState.selectedChoiceId,
      )
      if (choiceStillExists) {
        result.artifact.interactionState.selectedChoiceId =
          existing.interactionState.selectedChoiceId
      }
    }
    result.artifact.interactionState.closed = false
    artifacts.value = normalizeArtifacts([
      result.artifact,
      ...artifacts.value.filter((artifact) => artifact.artifactId !== result.artifact.artifactId),
    ])
    appendAudit(result.artifact.artifactId, 'committed', '', result.artifact.provenance.generatedAt)
    return findArtifactById(result.artifact.artifactId)
  }

  const openArtifact = (artifactId) => {
    const artifact = findArtifactById(artifactId)
    if (!artifact) return false
    artifact.interactionState.closed = false
    activeArtifactId.value = artifact.artifactId
    appendAudit(artifact.artifactId, 'opened')
    return true
  }

  const closeActiveArtifact = () => {
    const artifact = activeArtifact.value
    if (!artifact) return false
    artifact.interactionState.closed = true
    appendAudit(artifact.artifactId, 'closed')
    activeArtifactId.value = ''
    return true
  }

  const chooseActiveArtifact = (choiceId) => {
    const artifact = activeArtifact.value
    const id = normalizeMiniSceneId(choiceId)
    if (!artifact || !artifact.content.choices.some((choice) => choice.id === id)) return false
    artifact.interactionState.selectedChoiceId = id
    appendAudit(artifact.artifactId, 'choice_selected', id)
    return true
  }

  const getActiveChoiceRequest = () => {
    const artifact = activeArtifact.value
    if (!artifact?.interactionState?.selectedChoiceId) {
      return { ok: false, request: null, reason: 'choice_missing' }
    }
    return buildMiniSceneChoiceRequest(
      artifact,
      artifact.interactionState.selectedChoiceId,
    )
  }

  const markActiveArtifactReturnToSource = () => {
    const artifact = activeArtifact.value
    if (!artifact) return false
    appendAudit(artifact.artifactId, 'source_opened')
    artifact.interactionState.closed = true
    activeArtifactId.value = ''
    return true
  }

  const getArtifactSourceRoute = (artifact = activeArtifact.value) => {
    if (!artifact) return ''
    return getRegisteredMiniSceneModule(artifact.source.moduleKey)?.route || ''
  }

  const applyPersistedSource = (source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false
    modulePolicies.value = normalizePolicies(source.modulePolicies)
    profileBindings.value = normalizeBindings(source.profileBindings)
    artifacts.value = normalizeArtifacts(source.artifacts)
    interactionAudit.value = normalizeAudit(source.interactionAudit)
    activeArtifactId.value = ''
    return true
  }

  const createPersistedSnapshot = () => ({
    schemaVersion: MINI_SCENE_STORAGE_VERSION,
    modulePolicies: cloneMiniSceneValue(modulePolicies.value),
    profileBindings: cloneMiniSceneValue(profileBindings.value),
    artifacts: cloneMiniSceneValue(artifacts.value),
    interactionAudit: cloneMiniSceneValue(interactionAudit.value),
  })

  const createBackupSnapshot = () => createPersistedSnapshot()
  const createBackupSnapshotAsync = async () => createBackupSnapshot()
  const restoreFromBackup = (snapshot = {}) => applyPersistedSource(resolveBackupSource(snapshot))

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(MINI_SCENE_STORAGE_KEY, {
      version: MINI_SCENE_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(MINI_SCENE_STORAGE_KEY, {
      version: MINI_SCENE_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const persistToStorage = () =>
    writePersistedState(MINI_SCENE_STORAGE_KEY, createPersistedSnapshot(), {
      version: MINI_SCENE_STORAGE_VERSION,
    })

  const saveNow = () => persistToStorage()

  const resetForTesting = () => {
    modulePolicies.value = cloneDefaultPolicies()
    profileBindings.value = []
    artifacts.value = []
    interactionAudit.value = []
    activeArtifactId.value = ''
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
    hasFinishedStorageHydration,
    registeredModules,
    activeArtifact,
    findArtifactById,
    getModulePolicy,
    setModulePresentationMode,
    commitArtifact,
    openArtifact,
    closeActiveArtifact,
    chooseActiveArtifact,
    getActiveChoiceRequest,
    markActiveArtifactReturnToSource,
    getArtifactSourceRoute,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    saveNow,
    resetForTesting,
  }
})
