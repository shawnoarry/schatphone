import { computed, onScopeDispose, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { canWriteCurrentSave } from '../lib/current-save-write-runtime'
import {
  DEFAULT_TTS_PROVIDER_PROFILES,
  buildTtsRequest,
  normalizeTtsConfig,
  normalizeTtsProviderProfile,
} from '../lib/tts-contract'
import { synthesizeSpeech } from '../lib/tts-api'

const CONFIG_STORAGE_KEY = 'schatphone:tts:config'
const CREDENTIAL_STORAGE_KEY = 'schatphone:tts:credentials'
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
    const parsed = JSON.parse(window.localStorage.getItem(key) || '')
    return parsed?.version === STORAGE_VERSION && typeof parsed?.data === 'object'
      ? parsed.data
      : fallback
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

const normalizeCredentials = (input) => {
  if (!input || typeof input !== 'object') return {}
  return Object.fromEntries(
    Object.entries(input).map(([profileId, value]) => [
      profileId,
      { apiKey: typeof value?.apiKey === 'string' ? value.apiKey : '' },
    ]),
  )
}

export const useTtsStore = defineStore('tts', () => {
  const savedConfig = normalizeTtsConfig(readLocalRecord(CONFIG_STORAGE_KEY, {}))
  const profiles = ref(savedConfig.profiles)
  const activeProfileId = ref(savedConfig.activeProfileId)
  const credentialsByProfile = reactive(
    normalizeCredentials(readLocalRecord(CREDENTIAL_STORAGE_KEY, {})),
  )
  const preview = reactive({
    status: 'idle',
    audioUrl: '',
    providerId: '',
    errorCode: '',
  })
  let activeObjectUrlApi = globalThis.URL

  const activeProfile = computed(
    () => profiles.value.find((profile) => profile.id === activeProfileId.value) || profiles.value[0],
  )

  const persistConfig = () =>
    writeLocalRecord(CONFIG_STORAGE_KEY, {
      profiles: profiles.value,
      activeProfileId: activeProfileId.value,
    })
  const persistCredentials = () => writeLocalRecord(CREDENTIAL_STORAGE_KEY, credentialsByProfile)

  const getProfile = (profileId) =>
    profiles.value.find((profile) => profile.id === profileId) || null

  const getCredentials = (profileId) => ({
    apiKey: credentialsByProfile[profileId]?.apiKey || '',
  })

  const setCredentials = (profileId, value = {}) => {
    if (!getProfile(profileId)) return false
    credentialsByProfile[profileId] = {
      apiKey: typeof value.apiKey === 'string' ? value.apiKey : '',
    }
    return persistCredentials()
  }

  const updateProfile = (profileId, updates = {}) => {
    const index = profiles.value.findIndex((profile) => profile.id === profileId)
    if (index < 0) return null
    const profile = normalizeTtsProviderProfile(
      { ...profiles.value[index], ...updates },
      index,
    )
    profiles.value.splice(index, 1, profile)
    persistConfig()
    return profile
  }

  const setActiveProfile = (profileId) => {
    if (!getProfile(profileId)) return false
    activeProfileId.value = profileId
    clearPreview()
    return persistConfig()
  }

  const clearPreview = () => {
    if (preview.audioUrl) {
      try {
        activeObjectUrlApi?.revokeObjectURL?.(preview.audioUrl)
      } catch {
        // Cleanup is best effort and must not block leaving the settings surface.
      }
    }
    preview.status = 'idle'
    preview.audioUrl = ''
    preview.providerId = ''
    preview.errorCode = ''
  }

  const synthesizePreview = async (text, options = {}) => {
    const profile = getProfile(options.profileId || activeProfileId.value)
    const normalized = buildTtsRequest({ text }, profile)
    if (!normalized.ok) {
      preview.status = 'error'
      preview.errorCode = normalized.errors[0]?.code || 'REQUEST_INVALID'
      return { ok: false, code: preview.errorCode, errors: normalized.errors }
    }

    preview.status = 'loading'
    preview.errorCode = ''
    try {
      const result = await synthesizeSpeech({
        profile,
        credentials: getCredentials(profile.id),
        request: normalized.value,
        fetchImpl: options.fetchImpl,
        signal: options.signal,
        timeoutMs: options.timeoutMs,
      })
      const objectUrlApi = options.objectUrlApi || globalThis.URL
      if (typeof objectUrlApi?.createObjectURL !== 'function') {
        throw Object.assign(new Error('Object URL is unavailable.'), { code: 'PLAYBACK_UNAVAILABLE' })
      }
      const audioUrl = objectUrlApi.createObjectURL(result.blob)
      clearPreview()
      activeObjectUrlApi = objectUrlApi
      preview.status = 'ready'
      preview.audioUrl = audioUrl
      preview.providerId = profile.id
      return { ok: true, audioUrl, ...result }
    } catch (error) {
      clearPreview()
      preview.status = 'error'
      preview.errorCode = error?.code || 'TTS_REQUEST_FAILED'
      return { ok: false, code: preview.errorCode, error }
    }
  }

  const resetToDefaults = () => {
    clearPreview()
    profiles.value = DEFAULT_TTS_PROVIDER_PROFILES.map((profile) => ({ ...profile }))
    activeProfileId.value = profiles.value[0].id
    Object.keys(credentialsByProfile).forEach((profileId) => delete credentialsByProfile[profileId])
    persistConfig()
    persistCredentials()
  }

  onScopeDispose(clearPreview)

  return {
    profiles,
    activeProfileId,
    credentialsByProfile,
    preview,
    activeProfile,
    getProfile,
    getCredentials,
    setCredentials,
    updateProfile,
    setActiveProfile,
    synthesizePreview,
    clearPreview,
    resetToDefaults,
  }
})
