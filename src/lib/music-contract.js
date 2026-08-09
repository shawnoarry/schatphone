export const MUSIC_STATE_VERSION = 3

export const MUSIC_REPEAT_MODES = Object.freeze({
  OFF: 'off',
  ALL: 'all',
  ONE: 'one',
})

export const MUSIC_PROVIDER_METHODS = Object.freeze({
  GET: 'GET',
  POST: 'POST',
})

export const MUSIC_AUTH_MODES = Object.freeze({
  NONE: 'none',
  BEARER: 'bearer',
  API_KEY: 'api_key',
  CUSTOM: 'custom',
})

export const MUSIC_ADAPTER_KINDS = Object.freeze({
  GENERIC_JSON: 'generic_json',
  CHKSZ: 'chksz',
})

export const CHKSZ_MUSIC_PLATFORMS = Object.freeze({
  NETEASE: 'netease',
  QQ: 'qq',
  KUGOU: 'kugou',
})

export const MUSIC_TRACK_SOURCE_TYPES = Object.freeze({
  CHKSZ: MUSIC_ADAPTER_KINDS.CHKSZ,
  DIRECT_URL: 'direct_url',
  LOCAL_FILE: 'local_file',
})

export const CHKSZ_MUSIC_QUALITIES = Object.freeze({
  NETEASE: Object.freeze(['standard', 'exhigh', 'lossless', 'hires', 'jyeffect', 'sky', 'jymaster']),
  QQ: Object.freeze(['mp3', 'hq', 'flac', 'master', 'atmos_2', 'atmos_51']),
  KUGOU: Object.freeze(['mp3', 'hq', 'flac']),
})

export const MUSIC_LIMITS = Object.freeze({
  profiles: 6,
  savedTracks: 300,
  recentTracks: 40,
  queue: 120,
  searchResults: 100,
  playlists: 40,
})

export const DEFAULT_MUSIC_FIELD_MAP = Object.freeze({
  id: 'id',
  title: 'title',
  artist: 'artist',
  album: 'album',
  coverUrl: 'coverUrl',
  audioUrl: 'audioUrl',
  duration: 'duration',
  year: 'year',
  genre: 'genre',
})

const demoTrack = (track) => Object.freeze({ ...track, providerId: 'demo', providerName: 'Schat Music' })

export const MUSIC_DEMO_TRACKS = Object.freeze([
  demoTrack({
    id: 'demo_afterglow_lines',
    title: 'Afterglow Lines',
    artist: 'Mira Vale',
    album: 'Night Transit',
    genre: 'Dream Pop',
    year: 2026,
    durationSec: 372,
    coverUrl:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1000&q=86',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  }),
  demoTrack({
    id: 'demo_blue_hour',
    title: 'Blue Hour Drive',
    artist: 'North Arcade',
    album: 'City in Stereo',
    genre: 'Indie Electronic',
    year: 2025,
    durationSec: 340,
    coverUrl:
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1000&q=86',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  }),
  demoTrack({
    id: 'demo_signal_bloom',
    title: 'Signal Bloom',
    artist: 'Sunday Receiver',
    album: 'Soft Circuits',
    genre: 'Alternative',
    year: 2026,
    durationSec: 305,
    coverUrl:
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=86',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  }),
  demoTrack({
    id: 'demo_moonlit_room',
    title: 'Moonlit Room',
    artist: 'Juniper Motel',
    album: 'Open Late',
    genre: 'Neo Soul',
    year: 2024,
    durationSec: 268,
    coverUrl:
      'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?auto=format&fit=crop&w=1000&q=86',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  }),
  demoTrack({
    id: 'demo_summer_static',
    title: 'Summer Static',
    artist: 'Paper Cinema',
    album: 'Polaroid Weather',
    genre: 'Indie Pop',
    year: 2025,
    durationSec: 319,
    coverUrl:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1000&q=86',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  }),
  demoTrack({
    id: 'demo_last_train',
    title: 'Last Train Home',
    artist: 'Common Hours',
    album: 'Platform Lights',
    genre: 'Ambient',
    year: 2026,
    durationSec: 391,
    coverUrl:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1000&q=86',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  }),
])

const normalizeText = (value, fallback = '', maxLength = 240) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  return (text || fallback).slice(0, maxLength)
}

const normalizeId = (value, fallback = '') => {
  const text = normalizeText(String(value ?? ''), fallback, 180)
  const normalized = text.replace(/[^a-zA-Z0-9._:-]+/g, '_').replace(/^_+|_+$/g, '')
  return normalized || fallback
}

const clamp = (value, min, max, fallback = min) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

const normalizeDuration = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  const seconds = number > 10000 ? number / 1000 : number
  return Math.min(24 * 60 * 60, Math.round(seconds))
}

const normalizeYear = (value) => {
  const year = Math.floor(Number(value))
  return Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : 0
}

const normalizeUrl = (value, baseUrl = '', { allowLocal = false } = {}) => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''
  if (allowLocal && /^(blob:|data:audio\/)/i.test(text)) return text
  try {
    const url = baseUrl ? new URL(text, baseUrl) : new URL(text)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

const stableTrackFallbackId = (track = {}) => {
  const seed = [track.title, track.artist, track.album, track.audioUrl]
    .map((value) => normalizeText(value, '', 80).toLowerCase())
    .filter(Boolean)
    .join('_')
  return normalizeId(seed, `track_${Date.now()}`).slice(0, 160)
}

const normalizeArtistValue = (value) => {
  if (typeof value === 'string') return normalizeText(value, 'Unknown Artist', 160)
  if (Array.isArray(value)) {
    const names = value
      .map((item) => (typeof item === 'string' ? item : item?.name || item?.title || ''))
      .map((item) => normalizeText(item, '', 80))
      .filter(Boolean)
    return names.join(', ') || 'Unknown Artist'
  }
  if (value && typeof value === 'object') {
    return normalizeText(value.name || value.title || value.artistName, 'Unknown Artist', 160)
  }
  return 'Unknown Artist'
}

const normalizeMusicSourceRef = (input) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : null
  if (!source) return null
  const type = normalizeText(source.type, '', 32)
  if (type === MUSIC_TRACK_SOURCE_TYPES.DIRECT_URL) {
    return { type }
  }
  if (type === MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE) {
    const mediaId = normalizeId(source.mediaId, '')
    if (!mediaId) return null
    const fileName = normalizeText(source.fileName, '', 240)
    const mimeType = normalizeText(source.mimeType, '', 100).toLowerCase()
    const size = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(source.size) || 0)))
    return {
      type,
      mediaId,
      ...(fileName ? { fileName } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(size ? { size } : {}),
    }
  }
  const platform = normalizeText(source.platform, '', 32)
  if (type !== MUSIC_TRACK_SOURCE_TYPES.CHKSZ || !Object.values(CHKSZ_MUSIC_PLATFORMS).includes(platform)) {
    return null
  }
  const id = normalizeId(source.id, '')
  const mid = normalizeId(source.mid, '')
  const selection = Math.max(0, Math.min(50, Math.floor(Number(source.selection) || 0)))
  const query = normalizeText(source.query, '', 180)
  if (!id && !mid && !selection) return null
  return {
    type,
    platform,
    ...(id ? { id } : {}),
    ...(mid ? { mid } : {}),
    ...(selection ? { selection } : {}),
    ...(query ? { query } : {}),
  }
}

export const normalizeMusicTrack = (input = {}, options = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  const providerId = normalizeId(
    source.providerId || options.providerId,
    options.providerId || 'local',
  )
  const baseUrl = options.baseUrl || ''
  const title = normalizeText(source.title || source.name, 'Untitled Track', 180)
  const artist = normalizeArtistValue(source.artist || source.artists || source.artistName)
  const albumValue = source.album
  const album = normalizeText(
    typeof albumValue === 'object' ? albumValue?.name || albumValue?.title : albumValue,
    'Unknown Album',
    180,
  )
  const audioUrl = normalizeUrl(
    source.audioUrl || source.playUrl || source.streamUrl || source.previewUrl || source.url,
    baseUrl,
    { allowLocal: true },
  )
  const normalized = {
    id: normalizeId(source.id || source.trackId || source.songId, ''),
    title,
    artist,
    album,
    coverUrl: normalizeUrl(
      source.coverUrl ||
        source.artworkUrl ||
        source.imageUrl ||
        source.cover ||
        source.artwork ||
        albumValue?.coverUrl ||
        albumValue?.imageUrl,
      baseUrl,
    ),
    audioUrl,
    durationSec: normalizeDuration(
      source.durationSec || source.durationSeconds || source.durationMs || source.duration_ms || source.duration,
    ),
    providerId,
    providerName: normalizeText(source.providerName || options.providerName, providerId, 100),
    year: normalizeYear(source.year || source.releaseYear || source.release_date?.slice?.(0, 4)),
    genre: normalizeText(source.genre || source.category, '', 100),
    addedAt: Math.max(0, Math.floor(Number(source.addedAt) || 0)),
    sourceRef: normalizeMusicSourceRef(source.sourceRef),
  }
  normalized.id = normalizeId(
    normalized.id,
    `${providerId}:${stableTrackFallbackId(normalized)}`,
  )
  return normalized
}

const normalizeHeaderMap = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const blockedNames = new Set(['authorization', 'proxy-authorization', 'x-api-key', 'api-key'])
  return Object.fromEntries(
    Object.entries(input)
      .map(([name, value]) => [normalizeText(name, '', 80), normalizeText(value, '', 500)])
      .filter(([name, value]) => name && value && !blockedNames.has(name.toLowerCase()))
      .slice(0, 20),
  )
}

const normalizeFieldMap = (input = {}) =>
  Object.fromEntries(
    Object.keys(DEFAULT_MUSIC_FIELD_MAP).map((key) => [
      key,
      normalizeText(input?.[key], DEFAULT_MUSIC_FIELD_MAP[key], 120),
    ]),
  )

export const createMusicProviderId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `music_provider_${globalThis.crypto.randomUUID()}`
  }
  return `music_provider_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const createMusicTrackId = (prefix = 'music_track') => {
  const normalizedPrefix = normalizeId(prefix, 'music_track').slice(0, 40)
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${normalizedPrefix}_${globalThis.crypto.randomUUID()}`
  }
  return `${normalizedPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const normalizeMusicProviderProfile = (input = {}, index = 0) => {
  const source = input && typeof input === 'object' ? input : {}
  const adapterKind = Object.values(MUSIC_ADAPTER_KINDS).includes(source.adapterKind)
    ? source.adapterKind
    : MUSIC_ADAPTER_KINDS.GENERIC_JSON
  const platform = Object.values(CHKSZ_MUSIC_PLATFORMS).includes(source.platform)
    ? source.platform
    : CHKSZ_MUSIC_PLATFORMS.NETEASE
  const platformQualities = CHKSZ_MUSIC_QUALITIES[platform.toUpperCase()] || []
  const defaultQuality = platform === CHKSZ_MUSIC_PLATFORMS.NETEASE ? 'jymaster' : 'flac'
  const method = String(source.method || '').toUpperCase()
  const authMode = Object.values(MUSIC_AUTH_MODES).includes(source.authMode)
    ? source.authMode
    : MUSIC_AUTH_MODES.NONE
  const id = normalizeId(source.id, `music_provider_${index + 1}`)
  const commonProfile = {
    id,
    name: normalizeText(source.name, `Music Source ${index + 1}`, 80),
    enabled: source.enabled !== false,
    adapterKind,
    baseUrl: normalizeUrl(adapterKind === MUSIC_ADAPTER_KINDS.CHKSZ ? 'https://api.chksz.com' : source.baseUrl),
    updatedAt: Math.max(0, Math.floor(Number(source.updatedAt) || 0)),
  }
  if (adapterKind === MUSIC_ADAPTER_KINDS.CHKSZ) {
    return {
      ...commonProfile,
      platform,
      quality: platformQualities.includes(source.quality) ? source.quality : defaultQuality,
    }
  }
  return {
    ...commonProfile,
    searchPath: normalizeText(source.searchPath, '/search', 500),
    method: Object.values(MUSIC_PROVIDER_METHODS).includes(method)
      ? method
      : MUSIC_PROVIDER_METHODS.GET,
    queryParam: normalizeText(source.queryParam, 'q', 80),
    limitParam: normalizeText(source.limitParam, 'limit', 80),
    resultPath: normalizeText(source.resultPath, 'data.tracks', 180),
    authMode,
    authHeader: normalizeText(source.authHeader, 'X-API-Key', 100),
    authPrefix: normalizeText(source.authPrefix, '', 60),
    headers: normalizeHeaderMap(source.headers),
    fieldMap: normalizeFieldMap(source.fieldMap),
  }
}

export const normalizeMusicProviderProfiles = (input) => {
  const source = Array.isArray(input) ? input : []
  const ids = new Set()
  return source
    .slice(0, MUSIC_LIMITS.profiles)
    .map((profile, index) => normalizeMusicProviderProfile(profile, index))
    .filter((profile) => {
      if (!profile.id || ids.has(profile.id)) return false
      ids.add(profile.id)
      return true
    })
}

const normalizeTrackList = (input, limit) => {
  const ids = new Set()
  return (Array.isArray(input) ? input : [])
    .map((track) => {
      const normalized = normalizeMusicTrack(track)
      return [MUSIC_TRACK_SOURCE_TYPES.CHKSZ, MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE].includes(
        normalized.sourceRef?.type,
      )
        ? { ...normalized, audioUrl: '' }
        : normalized
    })
    .filter((track) => {
      if (!track.id || ids.has(track.id)) return false
      ids.add(track.id)
      return true
    })
    .slice(0, limit)
}

const normalizeTrackIdList = (input, limit) =>
  [...new Set((Array.isArray(input) ? input : []).map((id) => normalizeId(id, '')).filter(Boolean))].slice(
    0,
    limit,
  )

export const createDefaultMusicState = () => ({
  version: MUSIC_STATE_VERSION,
  activeProfileId: '',
  profiles: [],
  savedTracks: [],
  favoriteTrackIds: [],
  recentTracks: [],
  playlists: [],
  queue: [],
  lastPlayedTrackId: '',
  playback: {
    volume: 0.82,
    muted: false,
    shuffle: false,
    repeatMode: MUSIC_REPEAT_MODES.OFF,
  },
  integrationPolicy: {
    chatShareEnabled: true,
    mapNowPlayingEnabled: true,
    externalQueueRequestsEnabled: false,
  },
})

export const normalizeMusicState = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  const profiles = normalizeMusicProviderProfiles(source.profiles)
  const profileIds = new Set(profiles.map((profile) => profile.id))
  const fallbackProfile = profiles.find((profile) => profile.enabled)?.id || profiles[0]?.id || ''
  const repeatMode = Object.values(MUSIC_REPEAT_MODES).includes(source.playback?.repeatMode)
    ? source.playback.repeatMode
    : MUSIC_REPEAT_MODES.OFF
  return {
    version: MUSIC_STATE_VERSION,
    activeProfileId: profileIds.has(source.activeProfileId) ? source.activeProfileId : fallbackProfile,
    profiles,
    savedTracks: normalizeTrackList(source.savedTracks, MUSIC_LIMITS.savedTracks),
    favoriteTrackIds: normalizeTrackIdList(source.favoriteTrackIds, MUSIC_LIMITS.savedTracks),
    recentTracks: normalizeTrackList(source.recentTracks, MUSIC_LIMITS.recentTracks),
    playlists: (Array.isArray(source.playlists) ? source.playlists : [])
      .map((playlist, index) => ({
        id: normalizeId(playlist?.id, `playlist_${index + 1}`),
        name: normalizeText(playlist?.name, `Playlist ${index + 1}`, 80),
        trackIds: normalizeTrackIdList(playlist?.trackIds, MUSIC_LIMITS.savedTracks),
        createdAt: Math.max(0, Math.floor(Number(playlist?.createdAt) || 0)),
        updatedAt: Math.max(0, Math.floor(Number(playlist?.updatedAt) || 0)),
      }))
      .filter(
        (playlist, index, playlists) =>
          playlists.findIndex((item) => item.id === playlist.id) === index,
      )
      .slice(0, MUSIC_LIMITS.playlists),
    queue: normalizeTrackList(source.queue, MUSIC_LIMITS.queue),
    lastPlayedTrackId: normalizeId(source.lastPlayedTrackId, ''),
    playback: {
      volume: clamp(source.playback?.volume, 0, 1, 0.82),
      muted: source.playback?.muted === true,
      shuffle: source.playback?.shuffle === true,
      repeatMode,
    },
    integrationPolicy: {
      chatShareEnabled: source.integrationPolicy?.chatShareEnabled !== false,
      mapNowPlayingEnabled: source.integrationPolicy?.mapNowPlayingEnabled !== false,
      externalQueueRequestsEnabled:
        source.integrationPolicy?.externalQueueRequestsEnabled === true,
    },
  }
}

export const readMusicPath = (value, path) => {
  const normalizedPath = normalizeText(path, '', 180)
  if (!normalizedPath) return value
  return normalizedPath.split('.').reduce((current, segment) => {
    if (current == null) return undefined
    if (Array.isArray(current) && /^\d+$/.test(segment)) return current[Number(segment)]
    return typeof current === 'object' ? current[segment] : undefined
  }, value)
}

const firstDefinedPath = (value, paths) => {
  for (const path of paths) {
    const resolved = readMusicPath(value, path)
    if (resolved !== undefined && resolved !== null && resolved !== '') return resolved
  }
  return undefined
}

const resolveProviderResultItems = (payload, resultPath = '') => {
  const configured = resultPath ? readMusicPath(payload, resultPath) : undefined
  if (Array.isArray(configured)) return configured
  const candidates = [
    payload,
    payload?.data,
    payload?.results,
    payload?.tracks,
    payload?.songs,
    payload?.items,
    payload?.data?.tracks,
    payload?.data?.songs,
    payload?.data?.items,
    payload?.result?.tracks,
    payload?.result?.songs,
  ]
  return candidates.find((candidate) => Array.isArray(candidate)) || []
}

export const normalizeMusicProviderResults = (payload, profileInput = {}) => {
  const profile = normalizeMusicProviderProfile(profileInput)
  const items = resolveProviderResultItems(payload, profile.resultPath)
  return items.slice(0, MUSIC_LIMITS.searchResults).map((item, index) => {
    const map = profile.fieldMap
    const read = (key, fallbacks = []) =>
      firstDefinedPath(item, [map[key], ...fallbacks].filter(Boolean))
    return normalizeMusicTrack(
      {
        id: read('id', ['trackId', 'songId', 'uuid']),
        title: read('title', ['name', 'trackName']),
        artist: read('artist', ['artists', 'artistName', 'author.name', 'singer']),
        album: read('album', ['album.name', 'albumTitle', 'collectionName']),
        coverUrl: read('coverUrl', [
          'artworkUrl',
          'imageUrl',
          'cover',
          'artwork',
          'album.coverUrl',
          'album.imageUrl',
          'images.0.url',
        ]),
        audioUrl: read('audioUrl', [
          'playUrl',
          'streamUrl',
          'previewUrl',
          'audio.url',
          'stream.url',
          'url',
        ]),
        duration: read('duration', ['durationSec', 'durationMs', 'duration_ms']),
        year: read('year', ['releaseYear']),
        genre: read('genre', ['category']),
      },
      {
        providerId: profile.id,
        providerName: profile.name,
        baseUrl: profile.baseUrl,
        index,
      },
    )
  })
}

const createMusicProviderError = (code, message) => {
  const error = new Error(message)
  error.code = code
  return error
}

export const buildMusicProviderSearchRequest = ({
  profile: profileInput,
  credential = {},
  query = '',
  limit = 30,
} = {}) => {
  const profile = normalizeMusicProviderProfile(profileInput)
  if (!profile.enabled) throw createMusicProviderError('PROVIDER_DISABLED', 'Music source is disabled.')
  if (!profile.baseUrl) throw createMusicProviderError('PROVIDER_URL_MISSING', 'Music source URL is missing.')
  const normalizedQuery = normalizeText(query, '', 240)
  if (!normalizedQuery) throw createMusicProviderError('QUERY_MISSING', 'Search query is missing.')

  let endpoint
  try {
    endpoint = new URL(profile.searchPath || '/search', `${profile.baseUrl.replace(/\/+$/, '')}/`)
  } catch {
    throw createMusicProviderError('PROVIDER_URL_INVALID', 'Music source URL is invalid.')
  }

  const headers = {
    Accept: 'application/json',
    ...profile.headers,
  }
  const apiKey = typeof credential?.apiKey === 'string' ? credential.apiKey.trim() : ''
  if (profile.authMode === MUSIC_AUTH_MODES.BEARER && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  } else if (profile.authMode === MUSIC_AUTH_MODES.API_KEY && apiKey) {
    headers['X-API-Key'] = apiKey
  } else if (profile.authMode === MUSIC_AUTH_MODES.CUSTOM && apiKey) {
    headers[profile.authHeader || 'X-API-Key'] = `${profile.authPrefix || ''}${apiKey}`
  }

  const normalizedLimit = Math.round(clamp(limit, 1, MUSIC_LIMITS.searchResults, 30))
  const options = {
    method: profile.method,
    headers,
  }
  if (profile.method === MUSIC_PROVIDER_METHODS.POST) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify({
      [profile.queryParam]: normalizedQuery,
      [profile.limitParam]: normalizedLimit,
    })
  } else {
    endpoint.searchParams.set(profile.queryParam, normalizedQuery)
    endpoint.searchParams.set(profile.limitParam, String(normalizedLimit))
  }

  return {
    url: endpoint.toString(),
    options,
    profile,
  }
}

export const searchMusicProvider = async ({
  profile,
  credential,
  query,
  limit = 30,
  fetchImpl = globalThis.fetch,
  signal,
} = {}) => {
  if (typeof fetchImpl !== 'function') {
    throw createMusicProviderError('FETCH_UNAVAILABLE', 'Browser network access is unavailable.')
  }
  const request = buildMusicProviderSearchRequest({ profile, credential, query, limit })
  let response
  try {
    response = await fetchImpl(request.url, { ...request.options, signal })
  } catch (error) {
    if (error?.name === 'AbortError') throw createMusicProviderError('ABORTED', 'Music request was cancelled.')
    throw createMusicProviderError(
      'NETWORK_UNAVAILABLE',
      'Music source could not be reached. Check the endpoint and browser access policy.',
    )
  }
  if (!response?.ok) {
    throw createMusicProviderError(
      'PROVIDER_HTTP_ERROR',
      `Music source returned HTTP ${Number(response?.status) || 0}.`,
    )
  }
  let payload
  try {
    payload = await response.json()
  } catch {
    throw createMusicProviderError('PROVIDER_RESPONSE_INVALID', 'Music source did not return JSON.')
  }
  const tracks = normalizeMusicProviderResults(payload, request.profile)
  return {
    ok: true,
    tracks,
    playableCount: tracks.filter((track) => Boolean(track.audioUrl)).length,
    providerId: request.profile.id,
  }
}

export const testMusicProviderConnection = async (options = {}) => {
  const result = await searchMusicProvider({ ...options, query: options.query || 'music', limit: 3 })
  return {
    ...result,
    hasResults: result.tracks.length > 0,
    hasPlayableTrack: result.playableCount > 0,
  }
}

export const findMusicTrack = (trackId, collections = []) => {
  const id = normalizeId(trackId, '')
  if (!id) return null
  for (const collection of collections) {
    const match = (Array.isArray(collection) ? collection : []).find((track) => track?.id === id)
    if (match) return normalizeMusicTrack(match)
  }
  return null
}
