import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_IMAGE_PROVIDER_PROFILES,
  IMAGE_GENERATION_LIMITS,
  buildImageGenerationRequest,
  createImageCandidateId,
  createImageProfileId,
  normalizeImageGenerationDefaults,
  normalizeImageModuleRouting,
  normalizeImageProviderProfile,
  normalizeImageProviderProfiles,
  pruneImageCandidates,
  resolveImageAdapterKind,
} from '../lib/image-generation-contract'
import {
  fetchImageModels,
  generateImage,
  testImageProviderConnection,
} from '../lib/image-generation-api'
import { readPersistedState, writePersistedState } from '../lib/persistence'
import { canWriteCurrentSave } from '../lib/current-save-write-runtime'

const CONFIG_STORAGE_KEY = 'store:image-generation'
const LEGACY_CONFIG_STORAGE_KEY = 'schatphone:image-generation:config'
const CREDENTIAL_STORAGE_KEY = 'schatphone:image-generation:credentials'
const CANDIDATE_STORAGE_KEY = 'schatphone:image-generation:recent'
const STORAGE_VERSION = 1

const canUseLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

const readLocalRecord = (key, fallback) => {
  if (!canUseLocalStorage()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== STORAGE_VERSION || typeof parsed.data !== 'object') return fallback
    return parsed.data
  } catch {
    return fallback
  }
}

const writeLocalRecord = (key, data) => {
  if (!canUseLocalStorage() || !canWriteCurrentSave()) return false
  try {
    window.localStorage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, data }))
    return true
  } catch {
    return false
  }
}

const readPublicConfig = () => {
  const current = readPersistedState(CONFIG_STORAGE_KEY, { version: STORAGE_VERSION })
  if (current && typeof current === 'object') return current
  return readLocalRecord(LEGACY_CONFIG_STORAGE_KEY, {})
}

const normalizeCredentialMap = (rawCredentials) => {
  if (!rawCredentials || typeof rawCredentials !== 'object') return {}
  return Object.fromEntries(
    Object.entries(rawCredentials).map(([profileId, value]) => [
      profileId,
      {
        apiKey: typeof value?.apiKey === 'string' ? value.apiKey : '',
        proxyToken: typeof value?.proxyToken === 'string' ? value.proxyToken : '',
      },
    ]),
  )
}

const normalizePromptAssistant = (raw = {}) => ({
  enabled: raw.enabled === true,
  endpoint: typeof raw.endpoint === 'string' ? raw.endpoint.trim().slice(0, 2000) : '',
  modelId: typeof raw.modelId === 'string' ? raw.modelId.trim().slice(0, 160) : '',
})

export const useImageGenerationStore = defineStore('image-generation', () => {
  const savedConfig = readPublicConfig()
  const profiles = ref(normalizeImageProviderProfiles(savedConfig.profiles))
  const defaults = reactive(normalizeImageGenerationDefaults(savedConfig.defaults, profiles.value))
  const moduleRouting = reactive(normalizeImageModuleRouting(savedConfig.moduleRouting, profiles.value))
  const promptAssistant = reactive(normalizePromptAssistant(savedConfig.promptAssistant))
  const credentialsByProfile = reactive(
    normalizeCredentialMap(readLocalRecord(CREDENTIAL_STORAGE_KEY, {})),
  )
  const recentCandidates = ref(
    pruneImageCandidates(readLocalRecord(CANDIDATE_STORAGE_KEY, {}).candidates),
  )
  const modelStateByProfile = reactive({})
  const diagnostics = ref([])
  const activeTasks = ref([])

  const activeProfile = computed(
    () => profiles.value.find((profile) => profile.id === defaults.activeProfileId) || profiles.value[0] || null,
  )

  const publicSnapshot = computed(() => ({
    profiles: profiles.value,
    defaults: { ...defaults },
    moduleRouting: Object.fromEntries(
      Object.entries(moduleRouting).map(([key, value]) => [key, { ...value }]),
    ),
    promptAssistant: { ...promptAssistant },
  }))

  const persistPublicConfig = () =>
    writePersistedState(CONFIG_STORAGE_KEY, publicSnapshot.value, { version: STORAGE_VERSION })
  const persistCredentials = () => writeLocalRecord(CREDENTIAL_STORAGE_KEY, credentialsByProfile)
  const persistCandidates = () =>
    writeLocalRecord(CANDIDATE_STORAGE_KEY, {
      candidates: recentCandidates.value.filter(
        (candidate) => typeof candidate.imageUrl === 'string' && !candidate.imageUrl.startsWith('data:image/'),
      ),
    })

  const getProfileById = (profileId) =>
    profiles.value.find((profile) => profile.id === profileId) || null

  const getProfileForModule = (moduleKey = 'camera') => {
    const route = moduleRouting[moduleKey]
    if (route?.mode === 'profile' && route.profileId) {
      const routed = getProfileById(route.profileId)
      if (routed?.enabled) return routed
    }
    if (activeProfile.value?.enabled) return activeProfile.value
    return profiles.value.find((profile) => profile.enabled) || activeProfile.value
  }

  const getCredentials = (profileId) => ({
    apiKey: credentialsByProfile[profileId]?.apiKey || '',
    proxyToken: credentialsByProfile[profileId]?.proxyToken || '',
  })

  const setCredentials = (profileId, value = {}) => {
    if (!getProfileById(profileId)) return false
    credentialsByProfile[profileId] = {
      apiKey: typeof value.apiKey === 'string' ? value.apiKey : '',
      proxyToken: typeof value.proxyToken === 'string' ? value.proxyToken : '',
    }
    persistCredentials()
    return true
  }

  const upsertProfile = (input = {}) => {
    const existingIndex = profiles.value.findIndex((profile) => profile.id === input.id)
    const now = Date.now()
    const profile = normalizeImageProviderProfile(
      {
        ...input,
        id: input.id || createImageProfileId(),
        createdAt: existingIndex >= 0 ? profiles.value[existingIndex].createdAt : now,
        updatedAt: now,
      },
      existingIndex >= 0 ? existingIndex : profiles.value.length,
    )
    if (existingIndex >= 0) profiles.value.splice(existingIndex, 1, profile)
    else if (profiles.value.length < IMAGE_GENERATION_LIMITS.maxProfiles) profiles.value.push(profile)
    else return null
    if (!defaults.activeProfileId) defaults.activeProfileId = profile.id
    persistPublicConfig()
    return profile
  }

  const removeProfile = (profileId) => {
    const index = profiles.value.findIndex((profile) => profile.id === profileId)
    if (index < 0 || profiles.value.length <= 1) return false
    profiles.value.splice(index, 1)
    delete credentialsByProfile[profileId]
    delete modelStateByProfile[profileId]
    if (defaults.activeProfileId === profileId) defaults.activeProfileId = profiles.value[0]?.id || ''
    Object.values(moduleRouting).forEach((route) => {
      if (route.profileId === profileId) {
        route.mode = 'default'
        route.profileId = ''
      }
    })
    persistPublicConfig()
    persistCredentials()
    return true
  }

  const setActiveProfile = (profileId) => {
    if (!getProfileById(profileId)) return false
    defaults.activeProfileId = profileId
    persistPublicConfig()
    return true
  }

  const updateDefaults = (updates = {}) => {
    const normalized = normalizeImageGenerationDefaults({ ...defaults, ...updates }, profiles.value)
    Object.assign(defaults, normalized)
    persistPublicConfig()
  }

  const updateModuleRoute = (moduleKey, value = {}) => {
    if (!Object.prototype.hasOwnProperty.call(moduleRouting, moduleKey)) return false
    const normalized = normalizeImageModuleRouting(
      { ...moduleRouting, [moduleKey]: value },
      profiles.value,
    )
    Object.assign(moduleRouting[moduleKey], normalized[moduleKey])
    persistPublicConfig()
    return true
  }

  const updatePromptAssistant = (updates = {}) => {
    Object.assign(promptAssistant, normalizePromptAssistant({ ...promptAssistant, ...updates }))
    persistPublicConfig()
  }

  const setModelState = (profileId, state = {}) => {
    modelStateByProfile[profileId] = {
      models: Array.isArray(state.models) ? state.models : [],
      source: state.source === 'provider' ? 'provider' : state.source === 'built_in' ? 'built_in' : '',
      status: state.status || 'idle',
      message: typeof state.message === 'string' ? state.message : '',
      testedAt: Number(state.testedAt) || 0,
      adapterKind: state.adapterKind || resolveImageAdapterKind(getProfileById(profileId) || {}),
    }
  }

  const loadModels = async (profileId, options = {}) => {
    const profile = getProfileById(profileId)
    if (!profile) return { ok: false, code: 'PROFILE_NOT_FOUND', models: [] }
    setModelState(profileId, { status: 'loading', models: [] })
    try {
      const result = await fetchImageModels({
        profile,
        credentials: getCredentials(profileId),
        fetchImpl: options.fetchImpl,
        signal: options.signal,
      })
      setModelState(profileId, {
        status: 'ready',
        models: result.models,
        source: result.source,
        message: result.warning || '',
        testedAt: Date.now(),
      })
      return { ok: true, ...result }
    } catch (error) {
      setModelState(profileId, {
        status: 'error',
        models: [],
        message: error?.message || 'Model list is unavailable',
        testedAt: Date.now(),
      })
      recordDiagnostic({
        profileId,
        level: 'error',
        action: 'load_models',
        code: error?.code || 'MODEL_LIST_UNAVAILABLE',
        message: error?.message || 'Model list is unavailable',
      })
      return { ok: false, code: error?.code || 'MODEL_LIST_UNAVAILABLE', error, models: [] }
    }
  }

  const testConnection = async (profileId, options = {}) => {
    const profile = getProfileById(profileId)
    if (!profile) return { ok: false, code: 'PROFILE_NOT_FOUND' }
    setModelState(profileId, { status: 'testing', models: [] })
    try {
      const result = await testImageProviderConnection({
        profile,
        credentials: getCredentials(profileId),
        fetchImpl: options.fetchImpl,
        signal: options.signal,
      })
      setModelState(profileId, {
        status: 'ready',
        models: result.models,
        source: result.source,
        message: result.warning || '',
        testedAt: Date.now(),
        adapterKind: result.adapterKind,
      })
      recordDiagnostic({
        profileId,
        action: 'test_connection',
        code: result.warning || 'OK',
        message: result.source === 'built_in'
          ? 'Connection completed with a built-in model fallback.'
          : `Connection ready. ${result.modelCount} model(s) found.`,
      })
      return result
    } catch (error) {
      setModelState(profileId, {
        status: 'error',
        models: [],
        message: error?.message || 'Connection test failed',
        testedAt: Date.now(),
      })
      recordDiagnostic({
        profileId,
        level: 'error',
        action: 'test_connection',
        code: error?.code || 'CONNECTION_FAILED',
        message: error?.message || 'Connection test failed',
      })
      return { ok: false, code: error?.code || 'CONNECTION_FAILED', error }
    }
  }

  const recordDiagnostic = (input = {}) => {
    diagnostics.value = [
      {
        id: `image_diag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        profileId: input.profileId || '',
        level: input.level === 'error' ? 'error' : input.level === 'warning' ? 'warning' : 'info',
        action: input.action || '',
        code: input.code || '',
        message: input.message || '',
        createdAt: Date.now(),
      },
      ...diagnostics.value,
    ].slice(0, IMAGE_GENERATION_LIMITS.maxDiagnosticRecords)
  }

  const addTask = (task = {}) => {
    activeTasks.value = [
      { ...task, status: 'running' },
      ...activeTasks.value.filter((item) => item.taskId !== task.taskId),
    ].slice(0, 12)
  }

  const finishTask = (taskId, status = 'done') => {
    const task = activeTasks.value.find((item) => item.taskId === taskId)
    if (!task) return false
    task.status = status
    task.finishedAt = Date.now()
    return true
  }

  const generateForModule = async ({ moduleKey = 'camera', profileId = '', input = {}, ...options } = {}) => {
    const profile = profileId ? getProfileById(profileId) : getProfileForModule(moduleKey)
    if (!profile) return { ok: false, code: 'PROFILE_NOT_FOUND', errors: [] }
    const normalized = buildImageGenerationRequest(
      {
        ...input,
        source: { ...input.source, moduleKey },
        aspectRatio: input.aspectRatio || defaults.aspectRatio,
        resolution: input.resolution || defaults.resolution,
        count: input.count || defaults.count,
      },
      profile,
    )
    if (!normalized.ok) return { ok: false, code: 'REQUEST_INVALID', errors: normalized.errors }

    const requestTaskId = normalized.value.requestId
    addTask({
      taskId: requestTaskId,
      requestId: requestTaskId,
      profileId: profile.id,
      modelId: profile.modelId,
      sourceModule: moduleKey,
      createdAt: Date.now(),
    })
    try {
      const result = await generateImage({
        profile,
        credentials: getCredentials(profile.id),
        request: normalized.value,
        fetchImpl: options.fetchImpl,
        signal: options.signal,
        pollDelayMs: options.pollDelayMs,
        maxPolls: options.maxPolls,
        delayImpl: options.delayImpl,
        onTaskCreated: (task) => {
          addTask({ ...task, requestId: requestTaskId, profileId: profile.id, sourceModule: moduleKey })
        },
      })
      const candidates = addCandidates({
        imageUrls: result.imageUrls,
        request: normalized.value,
        profile,
        adapterKind: result.adapterKind,
      })
      finishTask(requestTaskId, 'done')
      if (result.taskId) finishTask(result.taskId, 'done')
      recordDiagnostic({
        profileId: profile.id,
        action: 'generate',
        code: 'OK',
        message: `${candidates.length} candidate(s) generated.`,
      })
      return { ok: true, profile, request: normalized.value, candidates, ...result }
    } catch (error) {
      finishTask(requestTaskId, error?.code === 'ABORTED' ? 'cancelled' : 'failed')
      recordDiagnostic({
        profileId: profile.id,
        level: 'error',
        action: 'generate',
        code: error?.code || 'GENERATION_FAILED',
        message: error?.message || 'Image generation failed',
      })
      return { ok: false, code: error?.code || 'GENERATION_FAILED', error, errors: [] }
    }
  }

  const exportForBackup = () => ({ ...publicSnapshot.value })

  const restoreFromBackup = (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') return false
    const restoredProfiles = normalizeImageProviderProfiles(snapshot.profiles)
    profiles.value = restoredProfiles
    Object.assign(defaults, normalizeImageGenerationDefaults(snapshot.defaults, restoredProfiles))
    Object.assign(moduleRouting, normalizeImageModuleRouting(snapshot.moduleRouting, restoredProfiles))
    Object.assign(promptAssistant, normalizePromptAssistant(snapshot.promptAssistant))
    persistPublicConfig()
    return true
  }

  const saveNow = () => persistPublicConfig()

  const addCandidates = ({ imageUrls = [], request = {}, profile = {}, adapterKind = '' } = {}) => {
    const now = Date.now()
    const created = imageUrls
      .filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim())
      .map((imageUrl, index) => ({
        id: createImageCandidateId(),
        imageUrl: imageUrl.trim(),
        prompt: request.prompt || '',
        profileId: profile.id || '',
        profileName: profile.name || '',
        modelId: profile.modelId || '',
        adapterKind,
        requestId: request.requestId || '',
        createdAt: now + index,
        galleryAssetId: '',
        keptAt: 0,
      }))
    recentCandidates.value = pruneImageCandidates([...created, ...recentCandidates.value])
    persistCandidates()
    return created
  }

  const markCandidateKept = (candidateId, galleryAssetId) => {
    const candidate = recentCandidates.value.find((item) => item.id === candidateId)
    if (!candidate) return false
    candidate.galleryAssetId = galleryAssetId || ''
    candidate.keptAt = Date.now()
    persistCandidates()
    return true
  }

  const removeCandidate = (candidateId) => {
    const next = recentCandidates.value.filter((candidate) => candidate.id !== candidateId)
    if (next.length === recentCandidates.value.length) return false
    recentCandidates.value = next
    persistCandidates()
    return true
  }

  const clearRecentCandidates = () => {
    recentCandidates.value = []
    persistCandidates()
  }

  const clearDiagnostics = () => {
    diagnostics.value = []
  }

  const resetToRecommendedProfiles = () => {
    profiles.value = normalizeImageProviderProfiles(DEFAULT_IMAGE_PROVIDER_PROFILES)
    Object.keys(credentialsByProfile).forEach((profileId) => delete credentialsByProfile[profileId])
    Object.assign(defaults, normalizeImageGenerationDefaults({}, profiles.value))
    Object.assign(moduleRouting, normalizeImageModuleRouting({}, profiles.value))
    persistPublicConfig()
    persistCredentials()
  }

  watch(
    () => profiles.value.map((profile) => profile.id),
    () => {
      const normalizedDefaults = normalizeImageGenerationDefaults(defaults, profiles.value)
      Object.assign(defaults, normalizedDefaults)
    },
  )

  return {
    profiles,
    defaults,
    moduleRouting,
    promptAssistant,
    recentCandidates,
    modelStateByProfile,
    diagnostics,
    activeTasks,
    activeProfile,
    publicSnapshot,
    getProfileById,
    getProfileForModule,
    getCredentials,
    setCredentials,
    upsertProfile,
    removeProfile,
    setActiveProfile,
    updateDefaults,
    updateModuleRoute,
    updatePromptAssistant,
    setModelState,
    loadModels,
    testConnection,
    recordDiagnostic,
    addTask,
    finishTask,
    generateForModule,
    addCandidates,
    markCandidateKept,
    removeCandidate,
    clearRecentCandidates,
    clearDiagnostics,
    resetToRecommendedProfiles,
    exportForBackup,
    restoreFromBackup,
    saveNow,
  }
})
