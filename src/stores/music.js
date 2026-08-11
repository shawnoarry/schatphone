import { computed, onScopeDispose, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { canWriteCurrentSave } from '../lib/current-save-write-runtime'
import {
  MUSIC_ADAPTER_KINDS,
  MUSIC_DEMO_TRACKS,
  MUSIC_LIMITS,
  MUSIC_REPEAT_MODES,
  MUSIC_TRACK_SOURCE_TYPES,
  createDefaultMusicState,
  createMusicProviderId,
  createMusicTrackId,
  findMusicTrack,
  normalizeMusicProviderProfile,
  normalizeMusicState,
  normalizeMusicTrack,
  searchMusicProvider,
  testMusicProviderConnection,
} from '../lib/music-contract'
import {
  fetchChkszLyrics,
  fetchChkszPlaylist,
  isChkszTrackResolvable,
  resolveChkszMusicTrack,
  searchChkszMusic,
} from '../lib/chksz-music-adapter'
import {
  MUSIC_INTEGRATION_ACTIONS,
  createMusicJourneyRadioCatalog,
  createMusicJourneyTrackProjection,
  createMusicNowPlayingProjection,
  createMusicTrackSharePayload,
  normalizeMusicIntegrationRequest,
  resolveMusicJourneyRadioQueue,
  resolveMusicIntegrationCapabilities,
} from '../lib/music-module-interface'
import {
  deleteMusicLocalMedia,
  getMusicLocalMedia,
  probeMusicAudioBlob,
  probeMusicAudioSource,
  putMusicLocalMedia,
} from '../lib/music-local-media-storage'
import {
  MUSIC_PROVIDER_CACHE_KINDS,
  MUSIC_PROVIDER_LYRICS_TTL_MS,
  MUSIC_PROVIDER_METADATA_TTL_MS,
  createMusicProviderCacheKey,
  getMusicProviderCacheEntry,
  putMusicProviderCacheEntry,
} from '../lib/music-provider-cache'
import { musicPlaybackRuntime } from '../lib/music-playback-runtime'
import { useSystemStore } from './system'

const CREDENTIAL_STORAGE_KEY = 'schatphone:music:credentials'
const CREDENTIAL_STORAGE_VERSION = 1
const MAX_LOCAL_AUDIO_FILE_SIZE = 512 * 1024 * 1024
const LOCAL_AUDIO_FILE_PATTERN = /\.(mp3|m4a|aac|ogg|oga|wav|flac)$/i
const CHKSZ_RESOLVED_TRACK_TTL_MS = 24 * 60 * 60 * 1000
const CHKSZ_RESOLVED_TRACK_CACHE_LIMIT = 50

const canUseLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

const readCredentials = () => {
  if (!canUseLocalStorage()) return {}
  try {
    const raw = window.localStorage.getItem(CREDENTIAL_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed?.version !== CREDENTIAL_STORAGE_VERSION || typeof parsed?.data !== 'object')
      return {}
    return Object.fromEntries(
      Object.entries(parsed.data)
        .map(([profileId, value]) => [
          String(profileId || '').trim(),
          { apiKey: typeof value?.apiKey === 'string' ? value.apiKey : '' },
        ])
        .filter(([profileId]) => Boolean(profileId)),
    )
  } catch {
    return {}
  }
}

const writeCredentials = (value) => {
  if (!canUseLocalStorage() || !canWriteCurrentSave()) return false
  try {
    window.localStorage.setItem(
      CREDENTIAL_STORAGE_KEY,
      JSON.stringify({ version: CREDENTIAL_STORAGE_VERSION, data: value }),
    )
    return true
  } catch {
    return false
  }
}

const dedupeTracks = (tracks, limit = MUSIC_LIMITS.queue) => {
  const ids = new Set()
  return (Array.isArray(tracks) ? tracks : [])
    .map((track) => normalizeMusicTrack(track))
    .filter((track) => {
      if (!track.id || ids.has(track.id)) return false
      ids.add(track.id)
      return true
    })
    .slice(0, limit)
}

const matchesQuery = (track, query) => {
  const needle = String(query || '')
    .trim()
    .toLowerCase()
  if (!needle) return true
  return [track.title, track.artist, track.album, track.genre]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle))
}

const mergeMusicTrackMetadata = (trackInput, metadataInput) => {
  const track = normalizeMusicTrack(trackInput)
  const metadata = normalizeMusicTrack(metadataInput)
  const patch = {}
  if (metadata.title && metadata.title !== 'Untitled Track') patch.title = metadata.title
  if (metadata.artist && metadata.artist !== 'Unknown Artist') patch.artist = metadata.artist
  if (metadata.album && metadata.album !== 'Unknown Album') patch.album = metadata.album
  if (metadata.coverUrl) patch.coverUrl = metadata.coverUrl
  if (metadata.audioUrl) patch.audioUrl = metadata.audioUrl
  if (metadata.durationSec) patch.durationSec = metadata.durationSec
  if (metadata.year) patch.year = metadata.year
  if (metadata.genre) patch.genre = metadata.genre
  if (metadata.providerName) patch.providerName = metadata.providerName
  return normalizeMusicTrack({
    ...track,
    ...patch,
    id: track.id,
    providerId: track.providerId,
    sourceRef: track.sourceRef,
  })
}

export const useMusicStore = defineStore('music', () => {
  const systemStore = useSystemStore()
  if (!systemStore.settings.music || typeof systemStore.settings.music !== 'object') {
    systemStore.settings.music = createDefaultMusicState()
  } else {
    systemStore.settings.music = normalizeMusicState(systemStore.settings.music)
  }

  const credentialsByProfile = reactive(readCredentials())
  const runtime = reactive(musicPlaybackRuntime.getSnapshot())
  const searchQuery = ref('')
  const searchResults = ref([])
  const searchStatus = ref('idle')
  const searchErrorCode = ref('')
  const providerStateById = reactive({})
  const lyricsState = reactive({
    trackId: '',
    status: 'idle',
    errorCode: '',
    original: '',
    translation: '',
    romanized: '',
  })
  const playlistImportState = reactive({ status: 'idle', errorCode: '', importedPlaylistId: '' })
  const activeJourneyStationId = ref('')
  const floatingPlayerRequested = ref(false)
  const floatingPlayerDismissed = ref(false)
  const floatingPlayerExpanded = ref(false)
  const resolvedTrackCache = new Map()
  const pendingTrackResolutions = new Map()
  const pendingLyricRequests = new Map()
  let activeLocalPlaybackUrl = ''
  let activeCachedChkszPlayback = null

  const state = computed(() => systemStore.settings.music)
  const profiles = computed(() => state.value.profiles || [])
  const activeProfile = computed(
    () =>
      profiles.value.find((profile) => profile.id === state.value.activeProfileId) ||
      profiles.value.find((profile) => profile.enabled) ||
      profiles.value[0] ||
      null,
  )
  const savedTracks = computed(() => state.value.savedTracks || [])
  const recentTracks = computed(() => state.value.recentTracks || [])
  const playlists = computed(() => state.value.playlists || [])
  const queue = computed(() => state.value.queue || [])
  const importedTracks = computed(() =>
    savedTracks.value.filter((track) =>
      [MUSIC_TRACK_SOURCE_TYPES.DIRECT_URL, MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE].includes(
        track.sourceRef?.type,
      ),
    ),
  )
  const demoTracks = computed(() => MUSIC_DEMO_TRACKS.map((track) => ({ ...track })))
  const libraryTracks = computed(() =>
    dedupeTracks([...savedTracks.value, ...demoTracks.value], MUSIC_LIMITS.savedTracks),
  )
  const myMusicTracks = computed(() => {
    const tracksById = new Map(
      [...libraryTracks.value, ...recentTracks.value, ...queue.value].map((track) => [
        track.id,
        track,
      ]),
    )
    const personalTrackIds = [
      ...savedTracks.value.map((track) => track.id),
      ...(state.value.favoriteTrackIds || []),
      ...playlists.value.flatMap((playlist) => playlist.trackIds || []),
    ]
    return dedupeTracks(
      personalTrackIds.map((trackId) => tracksById.get(trackId)).filter(Boolean),
      MUSIC_LIMITS.savedTracks,
    )
  })
  const favoriteTracks = computed(() => {
    const favorites = new Set(state.value.favoriteTrackIds || [])
    return myMusicTracks.value.filter((track) => favorites.has(track.id))
  })
  const currentTrack = computed(() => runtime.track)
  const currentQueueIndex = computed(() => {
    if (!currentTrack.value) return -1
    return queue.value.findIndex((track) => track.id === currentTrack.value.id)
  })
  const lastPlayedTrack = computed(() =>
    findMusicTrack(state.value.lastPlayedTrackId, [
      recentTracks.value,
      savedTracks.value,
      demoTracks.value,
    ]),
  )
  const featuredTrack = computed(() => lastPlayedTrack.value || demoTracks.value[0] || null)
  const isPlaying = computed(() => ['playing', 'buffering'].includes(runtime.status))
  const floatingPlayerVisible = computed(
    () =>
      floatingPlayerRequested.value ||
      (Boolean(runtime.track && runtime.sessionActive) && !floatingPlayerDismissed.value),
  )
  const integrationCapabilities = computed(() =>
    resolveMusicIntegrationCapabilities(state.value.integrationPolicy),
  )
  const nowPlayingProjection = computed(() =>
    createMusicNowPlayingProjection(runtime, state.value.integrationPolicy),
  )

  const persistCredentialMap = () => writeCredentials(credentialsByProfile)

  const setProviderState = (profileId, patch = {}) => {
    const previous = providerStateById[profileId] || {}
    const quota = patch.quota && typeof patch.quota === 'object' ? patch.quota : {}
    providerStateById[profileId] = {
      status: patch.status || previous.status || 'idle',
      message: typeof patch.message === 'string' ? patch.message : previous.message || '',
      code: typeof patch.code === 'string' ? patch.code : previous.code || '',
      testedAt: Math.max(0, Number(patch.testedAt ?? previous.testedAt) || 0),
      resultCount: Math.max(0, Number(patch.resultCount ?? previous.resultCount) || 0),
      playableCount: Math.max(0, Number(patch.playableCount ?? previous.playableCount) || 0),
      resolvableCount: Math.max(0, Number(patch.resolvableCount ?? previous.resolvableCount) || 0),
      rateLimit: Number.isFinite(quota.rateLimit) ? quota.rateLimit : (previous.rateLimit ?? null),
      freeRemaining: Number.isFinite(quota.freeRemaining)
        ? quota.freeRemaining
        : (previous.freeRemaining ?? null),
      paidRemaining: Number.isFinite(quota.paidRemaining)
        ? quota.paidRemaining
        : (previous.paidRemaining ?? null),
      retryAfter: Number.isFinite(quota.retryAfter)
        ? quota.retryAfter
        : (previous.retryAfter ?? null),
    }
  }

  const setProviderErrorState = (profileId, error, fallbackCode) => {
    setProviderState(profileId, {
      status: 'error',
      code: error?.code || fallbackCode,
      message: error?.message || 'Music source request failed.',
      testedAt: Date.now(),
      quota: error?.quota,
    })
  }

  const toPersistableTrack = (trackInput) => {
    const track = normalizeMusicTrack(trackInput)
    return [MUSIC_TRACK_SOURCE_TYPES.CHKSZ, MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE].includes(
      track.sourceRef?.type,
    )
      ? { ...track, audioUrl: '' }
      : track
  }

  const applyMetadataToKnownTracks = (trackInput) => {
    const metadata = toPersistableTrack(trackInput)
    const mergeKnownTrack = (track) =>
      track.id === metadata.id ? mergeMusicTrackMetadata(track, metadata) : track
    state.value.savedTracks = savedTracks.value.map(mergeKnownTrack)
    state.value.recentTracks = recentTracks.value.map(mergeKnownTrack)
    state.value.queue = queue.value.map(mergeKnownTrack)
    searchResults.value = searchResults.value.map(mergeKnownTrack)
    return metadata
  }

  const readProviderCache = (kind, profile, track, options = {}) =>
    (options.getProviderCache || getMusicProviderCacheEntry)({
      kind,
      profile,
      track,
      now: options.now,
    })

  const writeProviderCache = (kind, profile, track, value, ttlMs, options = {}) =>
    (options.putProviderCache || putMusicProviderCacheEntry)({
      kind,
      profile,
      track,
      value,
      ttlMs,
      now: options.now,
    })

  const enrichChkszTracksFromMetadataCache = async (profile, tracks, options = {}) =>
    Promise.all(
      tracks.map(async (track) => {
        const cachedMetadata = await readProviderCache(
          MUSIC_PROVIDER_CACHE_KINDS.METADATA,
          profile,
          track,
          options,
        )
        const enrichedTrack = cachedMetadata
          ? mergeMusicTrackMetadata(track, cachedMetadata)
          : track
        await writeProviderCache(
          MUSIC_PROVIDER_CACHE_KINDS.METADATA,
          profile,
          enrichedTrack,
          toPersistableTrack(enrichedTrack),
          MUSIC_PROVIDER_METADATA_TTL_MS,
          options,
        )
        return enrichedTrack
      }),
    )

  const cacheResolvedChkszTrack = (cacheKey, entry) => {
    if (!cacheKey) return
    resolvedTrackCache.delete(cacheKey)
    resolvedTrackCache.set(cacheKey, entry)
    while (resolvedTrackCache.size > CHKSZ_RESOLVED_TRACK_CACHE_LIMIT) {
      const oldestKey = resolvedTrackCache.keys().next().value
      if (!oldestKey) break
      resolvedTrackCache.delete(oldestKey)
    }
  }

  const resolveChkszTrackForPlayback = async (profile, trackInput, options = {}) => {
    const track = normalizeMusicTrack(trackInput)
    const cacheKey = createMusicProviderCacheKey({
      kind: MUSIC_PROVIDER_CACHE_KINDS.METADATA,
      profile,
      track,
    })
    const now = Math.max(0, Number(options.now) || Date.now())
    if (options.forceProviderRefresh === true) resolvedTrackCache.delete(cacheKey)
    const cachedResolution = resolvedTrackCache.get(cacheKey)
    if (cachedResolution && cachedResolution.expiresAt > now) {
      cacheResolvedChkszTrack(cacheKey, cachedResolution)
      return {
        ok: true,
        track: mergeMusicTrackMetadata(track, cachedResolution.track),
        quota: null,
        cacheKey,
        fromResolvedCache: true,
      }
    }
    if (cachedResolution) resolvedTrackCache.delete(cacheKey)
    if (pendingTrackResolutions.has(cacheKey)) return pendingTrackResolutions.get(cacheKey)

    const request = (async () => {
      const cachedMetadata = await readProviderCache(
        MUSIC_PROVIDER_CACHE_KINDS.METADATA,
        profile,
        track,
        options,
      )
      const enrichedTrack = cachedMetadata ? mergeMusicTrackMetadata(track, cachedMetadata) : track
      const result = await resolveChkszMusicTrack({
        profile,
        credential: getCredential(profile.id),
        track: enrichedTrack,
        fetchImpl: options.fetchImpl,
        signal: options.signal,
        sleepImpl: options.sleepImpl,
      })
      const resolvedTrack = mergeMusicTrackMetadata(enrichedTrack, result.track)
      cacheResolvedChkszTrack(cacheKey, {
        track: resolvedTrack,
        expiresAt: now + CHKSZ_RESOLVED_TRACK_TTL_MS,
      })
      const metadata = applyMetadataToKnownTracks(resolvedTrack)
      await writeProviderCache(
        MUSIC_PROVIDER_CACHE_KINDS.METADATA,
        profile,
        resolvedTrack,
        metadata,
        MUSIC_PROVIDER_METADATA_TTL_MS,
        options,
      )
      return {
        ...result,
        track: resolvedTrack,
        cacheKey,
        fromResolvedCache: false,
      }
    })()
    pendingTrackResolutions.set(cacheKey, request)
    try {
      return await request
    } finally {
      if (pendingTrackResolutions.get(cacheKey) === request) {
        pendingTrackResolutions.delete(cacheKey)
      }
    }
  }

  const revokeLocalPlaybackUrl = (url = activeLocalPlaybackUrl, objectUrlApi = globalThis.URL) => {
    if (!url) return
    try {
      objectUrlApi?.revokeObjectURL?.(url)
    } catch {
      // Object URL cleanup is best effort and must not interrupt playback state changes.
    }
    if (url === activeLocalPlaybackUrl) activeLocalPlaybackUrl = ''
  }

  const getCredential = (profileId) => ({
    apiKey: credentialsByProfile[profileId]?.apiKey || '',
  })

  const setCredential = (profileId, value = {}) => {
    if (!profiles.value.some((profile) => profile.id === profileId)) return false
    if (!canWriteCurrentSave()) return false
    credentialsByProfile[profileId] = {
      apiKey: typeof value.apiKey === 'string' ? value.apiKey : '',
    }
    return persistCredentialMap()
  }

  const upsertProvider = (input = {}) => {
    const current = profiles.value
    const existingIndex = current.findIndex((profile) => profile.id === input.id)
    if (existingIndex < 0 && current.length >= MUSIC_LIMITS.profiles) return null
    const profile = normalizeMusicProviderProfile(
      {
        ...input,
        id: input.id || createMusicProviderId(),
        updatedAt: Date.now(),
      },
      existingIndex >= 0 ? existingIndex : current.length,
    )
    if (existingIndex >= 0) current.splice(existingIndex, 1, profile)
    else current.push(profile)
    if (!state.value.activeProfileId) state.value.activeProfileId = profile.id
    return profile
  }

  const removeProvider = (profileId) => {
    const index = profiles.value.findIndex((profile) => profile.id === profileId)
    if (index < 0) return false
    profiles.value.splice(index, 1)
    delete credentialsByProfile[profileId]
    delete providerStateById[profileId]
    if (state.value.activeProfileId === profileId) {
      state.value.activeProfileId = profiles.value.find((profile) => profile.enabled)?.id || ''
    }
    persistCredentialMap()
    return true
  }

  const setActiveProvider = (profileId) => {
    if (!profiles.value.some((profile) => profile.id === profileId)) return false
    state.value.activeProfileId = profileId
    return true
  }

  const saveTrack = (trackInput) => {
    const track = toPersistableTrack(trackInput)
    if (!track.id) return null
    const existingIndex = savedTracks.value.findIndex((item) => item.id === track.id)
    const saved = {
      ...track,
      addedAt: existingIndex >= 0 ? savedTracks.value[existingIndex].addedAt : Date.now(),
    }
    if (existingIndex >= 0) savedTracks.value.splice(existingIndex, 1, saved)
    else savedTracks.value.unshift(saved)
    state.value.savedTracks = dedupeTracks(savedTracks.value, MUSIC_LIMITS.savedTracks)
    return saved
  }

  const addTrackFromUrl = async (input = {}, options = {}) => {
    if (!canWriteCurrentSave()) return { ok: false, code: 'CURRENT_SAVE_READ_ONLY' }
    const audioUrlInput = String(input.audioUrl || input.url || '').trim()
    const title = String(input.title || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 180)
    if (!audioUrlInput) return { ok: false, code: 'AUDIO_URL_MISSING' }
    if (!title) return { ok: false, code: 'TRACK_TITLE_MISSING' }

    let audioUrl
    try {
      const parsed = new URL(audioUrlInput)
      if (parsed.protocol !== 'https:') return { ok: false, code: 'AUDIO_URL_HTTPS_REQUIRED' }
      audioUrl = parsed.toString()
    } catch {
      return { ok: false, code: 'AUDIO_URL_INVALID' }
    }

    const probeImpl = options.probeImpl || probeMusicAudioSource
    const probe = await probeImpl(audioUrl, options.probeOptions || {})
    if (!probe?.ok) return { ok: false, code: probe?.code || 'AUDIO_UNAVAILABLE' }

    const duplicate = importedTracks.value.find(
      (track) =>
        track.sourceRef?.type === MUSIC_TRACK_SOURCE_TYPES.DIRECT_URL &&
        track.audioUrl === audioUrl,
    )
    const normalized = normalizeMusicTrack({
      id: duplicate?.id || createMusicTrackId('music_url'),
      title,
      artist: input.artist,
      album: input.album,
      coverUrl: input.coverUrl,
      audioUrl,
      durationSec: input.durationSec || probe.durationSec,
      providerId: 'direct_url',
      providerName: 'Direct URL',
      addedAt: duplicate?.addedAt || Date.now(),
      sourceRef: { type: MUSIC_TRACK_SOURCE_TYPES.DIRECT_URL },
    })
    if (input.coverUrl && !normalized.coverUrl) return { ok: false, code: 'COVER_URL_INVALID' }
    const track = saveTrack(normalized)
    if (!track) return { ok: false, code: 'TRACK_SAVE_FAILED' }
    await systemStore.saveNow()
    return { ok: true, track, probe }
  }

  const importLocalFiles = async (filesInput, options = {}) => {
    if (!canWriteCurrentSave())
      return { ok: false, code: 'CURRENT_SAVE_READ_ONLY', tracks: [], failed: [] }
    const files = Array.from(filesInput || [])
    if (!files.length) return { ok: false, code: 'LOCAL_FILES_MISSING', tracks: [], failed: [] }
    const putMedia = options.putMedia || putMusicLocalMedia
    const probeImpl = options.probeImpl || probeMusicAudioBlob
    const tracks = []
    const failed = []

    for (const file of files) {
      const fileName = String(file?.name || '')
        .trim()
        .slice(0, 240)
      const mimeType = String(file?.type || '')
        .trim()
        .toLowerCase()
        .slice(0, 100)
      const fileSize = Math.max(0, Math.floor(Number(file?.size) || 0))
      if (
        !(file instanceof Blob) ||
        !fileName ||
        (!mimeType.startsWith('audio/') && !LOCAL_AUDIO_FILE_PATTERN.test(fileName))
      ) {
        failed.push({ fileName, code: 'LOCAL_FILE_TYPE_UNSUPPORTED' })
        continue
      }
      if (!fileSize || fileSize > MAX_LOCAL_AUDIO_FILE_SIZE) {
        failed.push({ fileName, code: fileSize ? 'LOCAL_FILE_TOO_LARGE' : 'LOCAL_FILE_EMPTY' })
        continue
      }
      if (savedTracks.value.length >= MUSIC_LIMITS.savedTracks) {
        failed.push({ fileName, code: 'MUSIC_LIBRARY_LIMIT_REACHED' })
        continue
      }

      const mediaId = createMusicTrackId('music_media')
      const stored = await putMedia(mediaId, file)
      if (!stored) {
        failed.push({ fileName, code: 'LOCAL_MEDIA_STORAGE_FAILED' })
        continue
      }

      let probe = { ok: false, durationSec: 0 }
      try {
        probe = await probeImpl(file, options.probeOptions || {})
      } catch {
        probe = { ok: false, durationSec: 0 }
      }
      const title = fileName.replace(/\.[^.]+$/, '').trim() || fileName
      const track = saveTrack({
        id: createMusicTrackId('music_local'),
        title,
        artist: 'Unknown Artist',
        album: 'Local Files',
        audioUrl: '',
        durationSec: probe?.durationSec || 0,
        providerId: 'local_file',
        providerName: 'Local File',
        addedAt: Date.now(),
        sourceRef: {
          type: MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE,
          mediaId,
          fileName,
          mimeType,
          size: fileSize,
        },
      })
      if (!track) {
        await (options.deleteMedia || deleteMusicLocalMedia)(mediaId)
        failed.push({ fileName, code: 'TRACK_SAVE_FAILED' })
        continue
      }
      tracks.push(track)
    }

    if (tracks.length) await systemStore.saveNow()
    return {
      ok: tracks.length > 0,
      code: tracks.length
        ? failed.length
          ? 'LOCAL_IMPORT_PARTIAL'
          : 'OK'
        : failed[0]?.code || 'LOCAL_IMPORT_FAILED',
      tracks,
      failed,
    }
  }

  const removeImportedTrack = async (trackId, options = {}) => {
    if (!canWriteCurrentSave()) return { ok: false, code: 'CURRENT_SAVE_READ_ONLY' }
    const track = savedTracks.value.find((item) => item.id === trackId)
    if (
      !track ||
      ![MUSIC_TRACK_SOURCE_TYPES.DIRECT_URL, MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE].includes(
        track.sourceRef?.type,
      )
    ) {
      return { ok: false, code: 'IMPORTED_TRACK_NOT_FOUND' }
    }
    if (currentTrack.value?.id === track.id) {
      musicPlaybackRuntime.stop()
      revokeLocalPlaybackUrl(undefined, options.objectUrlApi)
    }
    if (track.sourceRef.type === MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE) {
      await (options.deleteMedia || deleteMusicLocalMedia)(track.sourceRef.mediaId)
    }
    state.value.savedTracks = savedTracks.value.filter((item) => item.id !== track.id)
    state.value.favoriteTrackIds = state.value.favoriteTrackIds.filter((id) => id !== track.id)
    state.value.recentTracks = recentTracks.value.filter((item) => item.id !== track.id)
    state.value.queue = queue.value.filter((item) => item.id !== track.id)
    state.value.playlists = playlists.value.map((playlist) => ({
      ...playlist,
      trackIds: playlist.trackIds.filter((id) => id !== track.id),
    }))
    if (state.value.lastPlayedTrackId === track.id) state.value.lastPlayedTrackId = ''
    await systemStore.saveNow()
    return { ok: true, track }
  }

  const removeSavedTrack = (trackId) => {
    const before = savedTracks.value.length
    state.value.savedTracks = savedTracks.value.filter((track) => track.id !== trackId)
    state.value.favoriteTrackIds = state.value.favoriteTrackIds.filter((id) => id !== trackId)
    state.value.playlists = playlists.value.map((playlist) => ({
      ...playlist,
      trackIds: playlist.trackIds.filter((id) => id !== trackId),
    }))
    return state.value.savedTracks.length !== before
  }

  const createPlaylist = (nameInput) => {
    const name = String(nameInput || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80)
    if (!name || playlists.value.length >= MUSIC_LIMITS.playlists) return null
    const now = Date.now()
    const id = `playlist_${now}_${Math.random().toString(36).slice(2, 8)}`
    const playlist = { id, name, trackIds: [], createdAt: now, updatedAt: now }
    state.value.playlists = [playlist, ...playlists.value]
    return playlist
  }

  const renamePlaylist = (playlistId, nameInput) => {
    const playlist = playlists.value.find((item) => item.id === playlistId)
    const name = String(nameInput || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80)
    if (!playlist || !name) return false
    playlist.name = name
    playlist.updatedAt = Date.now()
    return true
  }

  const deletePlaylist = (playlistId) => {
    const before = playlists.value.length
    state.value.playlists = playlists.value.filter((playlist) => playlist.id !== playlistId)
    return state.value.playlists.length !== before
  }

  const addTrackToPlaylist = (playlistId, trackInput) => {
    const playlist = playlists.value.find((item) => item.id === playlistId)
    const track = normalizeMusicTrack(trackInput)
    if (!playlist || !track.id) return false
    if (track.providerId !== 'demo') saveTrack(track)
    playlist.trackIds = [track.id, ...playlist.trackIds.filter((id) => id !== track.id)].slice(
      0,
      MUSIC_LIMITS.savedTracks,
    )
    playlist.updatedAt = Date.now()
    return true
  }

  const removeTrackFromPlaylist = (playlistId, trackId) => {
    const playlist = playlists.value.find((item) => item.id === playlistId)
    if (!playlist || !playlist.trackIds.includes(trackId)) return false
    playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId)
    playlist.updatedAt = Date.now()
    return true
  }

  const tracksForPlaylist = (playlistId) => {
    const playlist = playlists.value.find((item) => item.id === playlistId)
    if (!playlist) return []
    return playlist.trackIds
      .map((trackId) =>
        findMusicTrack(trackId, [libraryTracks.value, recentTracks.value, queue.value]),
      )
      .filter(Boolean)
  }

  const isFavorite = (trackId) => state.value.favoriteTrackIds.includes(trackId)

  const toggleFavorite = (trackInput) => {
    const track = normalizeMusicTrack(trackInput)
    if (!track.id) return false
    if (isFavorite(track.id)) {
      state.value.favoriteTrackIds = state.value.favoriteTrackIds.filter((id) => id !== track.id)
      return false
    }
    if (track.providerId !== 'demo') saveTrack(track)
    state.value.favoriteTrackIds = [track.id, ...state.value.favoriteTrackIds].slice(
      0,
      MUSIC_LIMITS.savedTracks,
    )
    return true
  }

  const rememberTrack = (trackInput) => {
    const track = toPersistableTrack(trackInput)
    state.value.lastPlayedTrackId = track.id
    state.value.recentTracks = dedupeTracks(
      [track, ...state.value.recentTracks.filter((item) => item.id !== track.id)],
      MUSIC_LIMITS.recentTracks,
    )
  }

  const replaceQueue = (tracks, currentTrackId = '') => {
    const nextQueue = dedupeTracks(tracks, MUSIC_LIMITS.queue)
    state.value.queue = nextQueue
    if (currentTrackId && !nextQueue.some((track) => track.id === currentTrackId)) {
      const current = findMusicTrack(currentTrackId, [libraryTracks.value, searchResults.value])
      if (current) state.value.queue.unshift(current)
    }
    return state.value.queue
  }

  const addToQueue = (trackInput, { playNext = false } = {}) => {
    const track = normalizeMusicTrack(trackInput)
    if (!track.id) return false
    const withoutTrack = queue.value.filter((item) => item.id !== track.id)
    if (playNext && currentQueueIndex.value >= 0) {
      withoutTrack.splice(currentQueueIndex.value + 1, 0, track)
    } else {
      withoutTrack.push(track)
    }
    state.value.queue = dedupeTracks(withoutTrack, MUSIC_LIMITS.queue)
    return true
  }

  const removeFromQueue = (trackId) => {
    const before = queue.value.length
    state.value.queue = queue.value.filter((track) => track.id !== trackId)
    return state.value.queue.length !== before
  }

  const canPlayTrack = (trackInput) => {
    const track = normalizeMusicTrack(trackInput)
    return Boolean(
      track.audioUrl ||
      isChkszTrackResolvable(track) ||
      (track.sourceRef?.type === MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE && track.sourceRef.mediaId),
    )
  }

  const journeyRadioStations = computed(() =>
    createMusicJourneyRadioCatalog(libraryTracks.value, canPlayTrack),
  )
  const journeyQuickTracks = computed(() =>
    libraryTracks.value
      .filter(canPlayTrack)
      .slice(0, 6)
      .map(createMusicJourneyTrackProjection)
      .filter(Boolean),
  )
  const floatingPlayerMedia = computed(() => ({
    nowPlaying: createMusicNowPlayingProjection(runtime, { mapNowPlayingEnabled: true }),
    activeStationId: activeJourneyStationId.value,
    quickTracks: journeyQuickTracks.value,
    stations: journeyRadioStations.value,
  }))
  const mapJourneyMedia = computed(() => {
    const enabled = integrationCapabilities.value.map.journeyControls === true
    return {
      enabled,
      nowPlaying: enabled ? nowPlayingProjection.value : { available: false, status: 'idle' },
      activeStationId: enabled ? activeJourneyStationId.value : '',
      quickTracks: enabled ? journeyQuickTracks.value : [],
      stations: enabled ? journeyRadioStations.value : [],
    }
  })

  const playTrack = async (trackInput, options = {}) => {
    if (options.preserveJourneyStation !== true) activeJourneyStationId.value = ''
    activeCachedChkszPlayback = null
    const unresolvedTrack = normalizeMusicTrack(trackInput)
    let track = unresolvedTrack
    let localPlaybackUrl = ''
    if (track.sourceRef?.type === MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE) {
      const blob = await (options.getMedia || getMusicLocalMedia)(track.sourceRef.mediaId)
      if (!(blob instanceof Blob)) return { ok: false, code: 'LOCAL_MEDIA_MISSING' }
      const objectUrlApi = options.objectUrlApi || globalThis.URL
      if (typeof objectUrlApi?.createObjectURL !== 'function') {
        return { ok: false, code: 'LOCAL_MEDIA_UNSUPPORTED' }
      }
      localPlaybackUrl = objectUrlApi.createObjectURL(blob)
      track = { ...track, audioUrl: localPlaybackUrl }
    }
    const profile = profiles.value.find((item) => item.id === track.providerId)
    let resolution = null
    if (
      !track.audioUrl &&
      profile?.adapterKind === MUSIC_ADAPTER_KINDS.CHKSZ &&
      isChkszTrackResolvable(track)
    ) {
      setProviderState(profile.id, { status: 'resolving', code: '', message: '' })
      try {
        resolution = await resolveChkszTrackForPlayback(profile, track, options)
        track = resolution.track
        setProviderState(profile.id, {
          status: 'ready',
          code: 'OK',
          message: '',
          testedAt: Date.now(),
          quota: resolution.quota,
        })
      } catch (error) {
        setProviderErrorState(profile.id, error, 'CHKSZ_RESOLVE_FAILED')
        return { ok: false, code: error?.code || 'CHKSZ_RESOLVE_FAILED', error }
      }
    }
    if (!track.audioUrl) {
      revokeLocalPlaybackUrl(localPlaybackUrl, options.objectUrlApi)
      return { ok: false, code: 'AUDIO_URL_MISSING' }
    }
    if (Array.isArray(options.queue)) replaceQueue(options.queue, track.id)
    else if (!queue.value.some((item) => item.id === track.id)) {
      replaceQueue(libraryTracks.value, track.id)
    }
    rememberTrack(track)
    const previousLocalPlaybackUrl = activeLocalPlaybackUrl
    const result = await musicPlaybackRuntime.load(track, { autoplay: options.autoplay !== false })
    if (
      resolution?.fromResolvedCache &&
      result?.code === 'PLAYBACK_FAILED' &&
      options.retryCachedResolution !== false
    ) {
      resolvedTrackCache.delete(resolution.cacheKey)
      return playTrack(unresolvedTrack, {
        ...options,
        forceProviderRefresh: true,
        retryCachedResolution: false,
      })
    }
    if (
      resolution?.fromResolvedCache &&
      (result?.ok || result?.code === 'PLAYBACK_GESTURE_REQUIRED')
    ) {
      activeCachedChkszPlayback = {
        cacheKey: resolution.cacheKey,
        track: unresolvedTrack,
        options: {
          fetchImpl: options.fetchImpl,
          getProviderCache: options.getProviderCache,
          putProviderCache: options.putProviderCache,
          signal: options.signal,
          sleepImpl: options.sleepImpl,
        },
      }
    }
    const localSourceLoaded = result?.ok || result?.code === 'PLAYBACK_GESTURE_REQUIRED'
    if (localSourceLoaded) {
      if (options.preserveFloatingDismissal !== true) floatingPlayerDismissed.value = false
      activeLocalPlaybackUrl = localPlaybackUrl
      if (previousLocalPlaybackUrl && previousLocalPlaybackUrl !== localPlaybackUrl) {
        revokeLocalPlaybackUrl(previousLocalPlaybackUrl, options.objectUrlApi)
      }
    } else if (localPlaybackUrl) {
      revokeLocalPlaybackUrl(localPlaybackUrl, options.objectUrlApi)
    }
    return result
  }

  const resume = () => musicPlaybackRuntime.play()
  const pause = () => musicPlaybackRuntime.pause()

  const togglePlayback = async () => {
    if (isPlaying.value) {
      pause()
      return { ok: true, paused: true }
    }
    if (!currentTrack.value) return playTrack(featuredTrack.value, { queue: libraryTracks.value })
    return resume()
  }

  const next = async ({ fromEnded = false } = {}) => {
    if (!currentTrack.value) return playTrack(featuredTrack.value, { queue: libraryTracks.value })
    if (state.value.playback.repeatMode === MUSIC_REPEAT_MODES.ONE && fromEnded) {
      return playTrack(currentTrack.value, {
        queue: queue.value,
        preserveJourneyStation: true,
        preserveFloatingDismissal: true,
      })
    }
    const sourceQueue = queue.value.length ? queue.value : libraryTracks.value
    if (!sourceQueue.length) return { ok: false, code: 'QUEUE_EMPTY' }
    let nextTrack = null
    if (state.value.playback.shuffle && sourceQueue.length > 1) {
      const candidates = sourceQueue.filter((track) => track.id !== currentTrack.value.id)
      nextTrack = candidates[Math.floor(Math.random() * candidates.length)] || null
    } else {
      const index = sourceQueue.findIndex((track) => track.id === currentTrack.value.id)
      nextTrack = sourceQueue[index + 1] || null
      if (
        !nextTrack &&
        (state.value.playback.repeatMode === MUSIC_REPEAT_MODES.ALL || activeJourneyStationId.value)
      ) {
        nextTrack = sourceQueue[0] || null
      }
    }
    if (!nextTrack) {
      pause()
      return { ok: false, code: 'QUEUE_ENDED' }
    }
    return playTrack(nextTrack, {
      queue: sourceQueue,
      preserveJourneyStation: true,
      preserveFloatingDismissal: fromEnded,
    })
  }

  const previous = async () => {
    if (runtime.currentTime > 4) {
      musicPlaybackRuntime.seek(0)
      return { ok: true, restarted: true }
    }
    const sourceQueue = queue.value.length ? queue.value : libraryTracks.value
    const index = sourceQueue.findIndex((track) => track.id === currentTrack.value?.id)
    const previousTrack =
      sourceQueue[index - 1] || sourceQueue[sourceQueue.length - 1] || featuredTrack.value
    return previousTrack
      ? playTrack(previousTrack, { queue: sourceQueue, preserveJourneyStation: true })
      : { ok: false, code: 'QUEUE_EMPTY' }
  }

  const playFloatingTrack = async (trackId, options = {}) => {
    const track = findMusicTrack(trackId, [libraryTracks.value])
    if (!track || !canPlayTrack(track)) return { ok: false, code: 'TRACK_UNAVAILABLE' }
    return playTrack(track, { ...options, queue: libraryTracks.value })
  }

  const playJourneyTrack = async (trackId, options = {}) => {
    if (integrationCapabilities.value.map.journeyControls !== true) {
      return { ok: false, code: 'MAP_MUSIC_DISABLED' }
    }
    return playFloatingTrack(trackId, options)
  }

  const playRadioStation = async (stationId, options = {}) => {
    const station = journeyRadioStations.value.find((item) => item.id === stationId)
    if (!station) return { ok: false, code: 'JOURNEY_STATION_NOT_FOUND' }
    const stationQueue = resolveMusicJourneyRadioQueue(stationId, libraryTracks.value, canPlayTrack)
    if (!stationQueue.length) return { ok: false, code: 'QUEUE_EMPTY' }
    const result = await playTrack(stationQueue[0], {
      ...options,
      queue: stationQueue,
      preserveJourneyStation: true,
    })
    if (result?.ok || result?.code === 'PLAYBACK_GESTURE_REQUIRED') {
      activeJourneyStationId.value = stationId
    } else {
      activeJourneyStationId.value = ''
    }
    return result
  }

  const playFloatingRadio = (stationId, options = {}) => playRadioStation(stationId, options)

  const playJourneyRadio = async (stationId, options = {}) => {
    if (integrationCapabilities.value.map.journeyRadio !== true) {
      return { ok: false, code: 'MAP_MUSIC_DISABLED' }
    }
    return playRadioStation(stationId, options)
  }

  const openFloatingPlayer = ({ expanded = false } = {}) => {
    floatingPlayerRequested.value = true
    floatingPlayerDismissed.value = false
    floatingPlayerExpanded.value = expanded === true
  }

  const closeFloatingPlayer = () => {
    floatingPlayerRequested.value = false
    floatingPlayerDismissed.value = true
    floatingPlayerExpanded.value = false
  }

  const setFloatingPlayerExpanded = (expanded) => {
    if (!floatingPlayerVisible.value && expanded === true) openFloatingPlayer({ expanded: true })
    else floatingPlayerExpanded.value = expanded === true
  }

  const seek = (seconds) => musicPlaybackRuntime.seek(seconds)

  const setVolume = (value) => {
    const volume = Math.max(0, Math.min(1, Number(value) || 0))
    state.value.playback.volume = volume
    musicPlaybackRuntime.setVolume(volume)
  }

  const toggleMuted = () => {
    state.value.playback.muted = !state.value.playback.muted
    musicPlaybackRuntime.setMuted(state.value.playback.muted)
  }

  const toggleShuffle = () => {
    state.value.playback.shuffle = !state.value.playback.shuffle
    return state.value.playback.shuffle
  }

  const cycleRepeatMode = () => {
    const order = [MUSIC_REPEAT_MODES.OFF, MUSIC_REPEAT_MODES.ALL, MUSIC_REPEAT_MODES.ONE]
    const currentIndex = order.indexOf(state.value.playback.repeatMode)
    state.value.playback.repeatMode = order[(currentIndex + 1) % order.length]
    return state.value.playback.repeatMode
  }

  const stop = (options = {}) => {
    musicPlaybackRuntime.stop()
    activeCachedChkszPlayback = null
    revokeLocalPlaybackUrl(undefined, options.objectUrlApi)
    activeJourneyStationId.value = ''
    floatingPlayerRequested.value = false
    floatingPlayerExpanded.value = false
  }

  const search = async (queryInput = searchQuery.value, options = {}) => {
    const query = String(queryInput || '').trim()
    searchQuery.value = query
    searchErrorCode.value = ''
    if (!query) {
      searchResults.value = []
      searchStatus.value = 'idle'
      return { ok: true, tracks: [] }
    }
    const localResults = libraryTracks.value.filter((track) => matchesQuery(track, query))
    const profile = options.profileId
      ? profiles.value.find((item) => item.id === options.profileId)
      : activeProfile.value
    if (!profile?.enabled || !profile.baseUrl || options.localOnly === true) {
      searchResults.value = localResults
      searchStatus.value = localResults.length ? 'ready' : 'empty'
      return { ok: true, tracks: searchResults.value, source: 'library' }
    }

    searchStatus.value = 'loading'
    try {
      const requestOptions = {
        profile,
        credential: getCredential(profile.id),
        query,
        limit: options.limit || 40,
        fetchImpl: options.fetchImpl,
        signal: options.signal,
        sleepImpl: options.sleepImpl,
      }
      const result =
        profile.adapterKind === MUSIC_ADAPTER_KINDS.CHKSZ
          ? await searchChkszMusic(requestOptions)
          : await searchMusicProvider(requestOptions)
      const providerTracks =
        profile.adapterKind === MUSIC_ADAPTER_KINDS.CHKSZ
          ? await enrichChkszTracksFromMetadataCache(profile, result.tracks, options)
          : result.tracks
      searchResults.value = dedupeTracks(
        [...providerTracks, ...localResults],
        MUSIC_LIMITS.searchResults,
      )
      searchStatus.value = searchResults.value.length ? 'ready' : 'empty'
      setProviderState(profile.id, {
        status: 'ready',
        code: 'OK',
        testedAt: Date.now(),
        resultCount: result.tracks.length,
        playableCount: result.playableCount,
        resolvableCount: result.resolvableCount,
        quota: result.quota,
      })
      return { ...result, tracks: searchResults.value, source: 'provider' }
    } catch (error) {
      searchErrorCode.value = error?.code || 'SEARCH_FAILED'
      searchResults.value = localResults
      searchStatus.value = localResults.length ? 'ready' : 'error'
      setProviderErrorState(profile.id, error, 'SEARCH_FAILED')
      return { ok: false, code: searchErrorCode.value, error, tracks: localResults }
    }
  }

  const testProvider = async (profileId, options = {}) => {
    const profile = profiles.value.find((item) => item.id === profileId)
    if (!profile) return { ok: false, code: 'PROFILE_NOT_FOUND' }
    setProviderState(profileId, { status: 'testing' })
    try {
      const requestOptions = {
        profile,
        credential: getCredential(profileId),
        query: options.query || 'music',
        limit: 3,
        fetchImpl: options.fetchImpl,
        signal: options.signal,
        sleepImpl: options.sleepImpl,
      }
      const result =
        profile.adapterKind === MUSIC_ADAPTER_KINDS.CHKSZ
          ? await searchChkszMusic(requestOptions)
          : await testMusicProviderConnection(requestOptions)
      const sourceReady =
        profile.adapterKind === MUSIC_ADAPTER_KINDS.CHKSZ
          ? result.resolvableCount > 0
          : result.hasPlayableTrack
      setProviderState(profileId, {
        status: sourceReady ? 'ready' : 'warning',
        code: sourceReady ? 'OK' : 'PLAYABLE_URL_MISSING',
        testedAt: Date.now(),
        resultCount: result.tracks.length,
        playableCount: result.playableCount,
        resolvableCount: result.resolvableCount,
        quota: result.quota,
      })
      return result
    } catch (error) {
      setProviderErrorState(profileId, error, 'CONNECTION_FAILED')
      return { ok: false, code: error?.code || 'CONNECTION_FAILED', error }
    }
  }

  const loadLyrics = async (trackInput = currentTrack.value, options = {}) => {
    const track = normalizeMusicTrack(trackInput)
    const profile = profiles.value.find((item) => item.id === track.providerId)
    lyricsState.trackId = track.id
    lyricsState.status = 'loading'
    lyricsState.errorCode = ''
    lyricsState.original = ''
    lyricsState.translation = ''
    lyricsState.romanized = ''
    if (profile?.adapterKind !== MUSIC_ADAPTER_KINDS.CHKSZ || !isChkszTrackResolvable(track)) {
      lyricsState.status = 'error'
      lyricsState.errorCode = 'LYRICS_UNSUPPORTED'
      return { ok: false, code: lyricsState.errorCode }
    }
    try {
      let result = null
      if (options.forceProviderRefresh !== true) {
        const cachedLyrics = await readProviderCache(
          MUSIC_PROVIDER_CACHE_KINDS.LYRICS,
          profile,
          track,
          options,
        )
        if (cachedLyrics) result = { ok: true, lyrics: cachedLyrics, quota: null, cached: true }
      }
      if (!result) {
        const cacheKey = createMusicProviderCacheKey({
          kind: MUSIC_PROVIDER_CACHE_KINDS.LYRICS,
          profile,
          track,
        })
        let request = pendingLyricRequests.get(cacheKey)
        if (!request) {
          request = (async () => {
            const providerResult = await fetchChkszLyrics({
              profile,
              credential: getCredential(profile.id),
              track,
              fetchImpl: options.fetchImpl,
              signal: options.signal,
              sleepImpl: options.sleepImpl,
            })
            await writeProviderCache(
              MUSIC_PROVIDER_CACHE_KINDS.LYRICS,
              profile,
              track,
              providerResult.lyrics,
              MUSIC_PROVIDER_LYRICS_TTL_MS,
              options,
            )
            return providerResult
          })()
          pendingLyricRequests.set(cacheKey, request)
        }
        try {
          result = await request
        } finally {
          if (pendingLyricRequests.get(cacheKey) === request) {
            pendingLyricRequests.delete(cacheKey)
          }
        }
      }
      if (lyricsState.trackId === track.id) {
        Object.assign(lyricsState, {
          trackId: track.id,
          status:
            result.lyrics.original || result.lyrics.translation || result.lyrics.romanized
              ? 'ready'
              : 'empty',
          errorCode: '',
          ...result.lyrics,
        })
      }
      if (result.quota) setProviderState(profile.id, { quota: result.quota })
      return result
    } catch (error) {
      lyricsState.status = 'error'
      lyricsState.errorCode = error?.code || 'LYRICS_FAILED'
      setProviderErrorState(profile.id, error, 'LYRICS_FAILED')
      return { ok: false, code: lyricsState.errorCode, error }
    }
  }

  const importChkszPlaylist = async (profileId, playlistIdInput, options = {}) => {
    const profile = profiles.value.find((item) => item.id === profileId)
    const playlistId = String(playlistIdInput || '').trim()
    playlistImportState.status = 'loading'
    playlistImportState.errorCode = ''
    playlistImportState.importedPlaylistId = ''
    if (!profile || profile.adapterKind !== MUSIC_ADAPTER_KINDS.CHKSZ || !playlistId) {
      playlistImportState.status = 'error'
      playlistImportState.errorCode = !playlistId
        ? 'PLAYLIST_ID_MISSING'
        : 'PLAYLIST_IMPORT_UNSUPPORTED'
      return { ok: false, code: playlistImportState.errorCode }
    }
    try {
      const result = await fetchChkszPlaylist({
        profile,
        credential: getCredential(profile.id),
        playlistId,
        fetchImpl: options.fetchImpl,
        signal: options.signal,
        sleepImpl: options.sleepImpl,
      })
      const playlist = createPlaylist(result.playlist.name)
      if (!playlist) {
        playlistImportState.status = 'error'
        playlistImportState.errorCode = 'PLAYLIST_LIMIT_REACHED'
        return { ok: false, code: playlistImportState.errorCode }
      }
      result.playlist.tracks.forEach((track) => addTrackToPlaylist(playlist.id, track))
      playlistImportState.status = 'ready'
      playlistImportState.importedPlaylistId = playlist.id
      setProviderState(profile.id, { quota: result.quota })
      return { ...result, importedPlaylist: playlist }
    } catch (error) {
      playlistImportState.status = 'error'
      playlistImportState.errorCode = error?.code || 'PLAYLIST_IMPORT_FAILED'
      setProviderErrorState(profile.id, error, 'PLAYLIST_IMPORT_FAILED')
      return { ok: false, code: playlistImportState.errorCode, error }
    }
  }

  const updateIntegrationPolicy = (patch = {}) => {
    state.value.integrationPolicy = {
      ...state.value.integrationPolicy,
      ...(Object.prototype.hasOwnProperty.call(patch, 'chatShareEnabled')
        ? { chatShareEnabled: patch.chatShareEnabled === true }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, 'mapNowPlayingEnabled')
        ? { mapNowPlayingEnabled: patch.mapNowPlayingEnabled === true }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(patch, 'externalQueueRequestsEnabled')
        ? { externalQueueRequestsEnabled: patch.externalQueueRequestsEnabled === true }
        : {}),
    }
  }

  const createSharePayload = (track = currentTrack.value) =>
    track ? createMusicTrackSharePayload(track, state.value.integrationPolicy) : null

  const handleIntegrationRequest = async (input = {}) => {
    const request = normalizeMusicIntegrationRequest(input)
    const track = request.trackId
      ? findMusicTrack(request.trackId, [libraryTracks.value, searchResults.value, queue.value])
      : null
    if (request.action === MUSIC_INTEGRATION_ACTIONS.SEARCH && request.query) {
      return search(request.query)
    }
    if (request.action === MUSIC_INTEGRATION_ACTIONS.ENQUEUE) {
      if (!state.value.integrationPolicy.externalQueueRequestsEnabled) {
        return { ok: false, code: 'USER_CONFIRMATION_REQUIRED', request }
      }
      return { ok: Boolean(track && addToQueue(track)), request, track }
    }
    if (request.action === MUSIC_INTEGRATION_ACTIONS.PLAY) {
      return { ok: false, code: 'USER_GESTURE_REQUIRED', request, track }
    }
    return { ok: true, request, track }
  }

  const unsubscribePlaybackRuntime = musicPlaybackRuntime.subscribe(({ type, snapshot }) => {
    Object.assign(runtime, snapshot)
    if (type === 'ended') void next({ fromEnded: true })
    if (
      type === 'error' &&
      snapshot.errorCode === 'AUDIO_UNAVAILABLE' &&
      activeCachedChkszPlayback?.track.id === snapshot.track?.id
    ) {
      const retry = activeCachedChkszPlayback
      activeCachedChkszPlayback = null
      resolvedTrackCache.delete(retry.cacheKey)
      void playTrack(retry.track, {
        ...retry.options,
        forceProviderRefresh: true,
        retryCachedResolution: false,
        preserveJourneyStation: true,
        preserveFloatingDismissal: true,
      })
    }
  })
  musicPlaybackRuntime.setVolume(state.value.playback.volume)
  musicPlaybackRuntime.setMuted(state.value.playback.muted)
  musicPlaybackRuntime.setMediaActionHandlers({
    play: () => void resume(),
    pause,
    previous: () => void previous(),
    next: () => void next(),
    seekTo: (details) => seek(details?.seekTime || 0),
  })
  onScopeDispose(() => {
    unsubscribePlaybackRuntime()
    musicPlaybackRuntime.setMediaActionHandlers({})
    revokeLocalPlaybackUrl()
    resolvedTrackCache.clear()
    pendingTrackResolutions.clear()
    pendingLyricRequests.clear()
    activeCachedChkszPlayback = null
  })

  const saveNow = () => systemStore.saveNow()

  return {
    state,
    profiles,
    activeProfile,
    savedTracks,
    importedTracks,
    demoTracks,
    libraryTracks,
    myMusicTracks,
    favoriteTracks,
    recentTracks,
    playlists,
    queue,
    runtime,
    currentTrack,
    currentQueueIndex,
    lastPlayedTrack,
    featuredTrack,
    isPlaying,
    floatingPlayerVisible,
    floatingPlayerExpanded,
    searchQuery,
    searchResults,
    searchStatus,
    searchErrorCode,
    providerStateById,
    lyricsState,
    playlistImportState,
    integrationCapabilities,
    nowPlayingProjection,
    floatingPlayerMedia,
    mapJourneyMedia,
    getCredential,
    setCredential,
    upsertProvider,
    removeProvider,
    setActiveProvider,
    saveTrack,
    addTrackFromUrl,
    importLocalFiles,
    removeImportedTrack,
    removeSavedTrack,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    tracksForPlaylist,
    isFavorite,
    toggleFavorite,
    replaceQueue,
    addToQueue,
    removeFromQueue,
    canPlayTrack,
    playTrack,
    playFloatingTrack,
    playFloatingRadio,
    playJourneyTrack,
    playJourneyRadio,
    openFloatingPlayer,
    closeFloatingPlayer,
    setFloatingPlayerExpanded,
    resume,
    pause,
    togglePlayback,
    next,
    previous,
    seek,
    setVolume,
    toggleMuted,
    toggleShuffle,
    cycleRepeatMode,
    stop,
    search,
    testProvider,
    loadLyrics,
    importChkszPlaylist,
    updateIntegrationPolicy,
    createSharePayload,
    handleIntegrationRequest,
    saveNow,
  }
})
