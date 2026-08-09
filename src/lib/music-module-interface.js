import { normalizeMusicTrack } from './music-contract'

export const MUSIC_INTEGRATION_SOURCES = Object.freeze({
  CHAT: 'chat',
  MAP: 'map',
})

export const MUSIC_INTEGRATION_ACTIONS = Object.freeze({
  OPEN: 'open',
  SEARCH: 'search',
  PLAY: 'play',
  ENQUEUE: 'enqueue',
})

export const MUSIC_JOURNEY_RADIO_STATIONS = Object.freeze([
  Object.freeze({
    id: 'route_mix',
    icon: 'fas fa-shuffle',
    labelZh: '沿途混播',
    labelEn: 'Route Mix',
    detailZh: '收藏、导入与已接入音乐',
    detailEn: 'Favorites, imports, and connected music',
    genreTokens: Object.freeze([]),
    fallbackOffset: 0,
  }),
  Object.freeze({
    id: 'city_pulse',
    icon: 'fas fa-city',
    labelZh: '城市节拍',
    labelEn: 'City Pulse',
    detailZh: '电子、另类与独立流行',
    detailEn: 'Electronic, alternative, and indie pop',
    genreTokens: Object.freeze(['electronic', 'alternative', 'indie pop']),
    fallbackOffset: 1,
  }),
  Object.freeze({
    id: 'night_window',
    icon: 'fas fa-moon',
    labelZh: '夜间慢行',
    labelEn: 'Night Window',
    detailZh: '梦幻流行、灵魂乐与氛围',
    detailEn: 'Dream pop, soul, and ambient',
    genreTokens: Object.freeze(['dream pop', 'soul', 'ambient']),
    fallbackOffset: 0,
  }),
])

const sourceValues = new Set(Object.values(MUSIC_INTEGRATION_SOURCES))
const actionValues = new Set(Object.values(MUSIC_INTEGRATION_ACTIONS))

const normalizeText = (value, maxLength = 180) =>
  (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '').slice(0, maxLength)

export const normalizeMusicIntegrationRequest = (input = {}) => {
  const sourceModule = sourceValues.has(input.sourceModule) ? input.sourceModule : ''
  const action = actionValues.has(input.action) ? input.action : MUSIC_INTEGRATION_ACTIONS.OPEN
  return {
    version: 1,
    sourceModule,
    action,
    trackId: normalizeText(input.trackId, 180),
    query: normalizeText(input.query, 240),
    contextId: normalizeText(input.contextId, 180),
    requestedAt: Math.max(0, Math.floor(Number(input.requestedAt) || Date.now())),
    requiresUserGesture:
      action === MUSIC_INTEGRATION_ACTIONS.PLAY || action === MUSIC_INTEGRATION_ACTIONS.ENQUEUE,
  }
}

export const buildMusicIntegrationRoute = (input = {}) => {
  const request = normalizeMusicIntegrationRequest(input)
  const query = {
    source: request.sourceModule || undefined,
    action: request.action !== MUSIC_INTEGRATION_ACTIONS.OPEN ? request.action : undefined,
    track: request.trackId || undefined,
    q: request.query || undefined,
    context: request.contextId || undefined,
  }
  return {
    path: '/music',
    query: Object.fromEntries(Object.entries(query).filter(([, value]) => Boolean(value))),
  }
}

export const resolveMusicIntegrationCapabilities = (policy = {}) => ({
  chat: {
    open: true,
    search: true,
    shareTrack: policy.chatShareEnabled !== false,
    directPlayback: false,
  },
  map: {
    open: true,
    readNowPlaying: policy.mapNowPlayingEnabled !== false,
    journeyControls: policy.mapNowPlayingEnabled !== false,
    journeyRadio: policy.mapNowPlayingEnabled !== false,
    requestQueue: policy.externalQueueRequestsEnabled === true,
    directPlayback: false,
  },
})

export const createMusicJourneyTrackProjection = (trackInput) => {
  const track = normalizeMusicTrack(trackInput)
  if (!track.id) return null
  return {
    trackRef: {
      id: track.id,
      providerId: track.providerId,
    },
    title: track.title,
    artist: track.artist,
    album: track.album,
    coverUrl: track.coverUrl,
    durationSec: track.durationSec,
  }
}

const normalizePlayableJourneyTracks = (tracksInput, canPlayTrack = () => true) => {
  const ids = new Set()
  return (Array.isArray(tracksInput) ? tracksInput : [])
    .map((track) => normalizeMusicTrack(track))
    .filter((track) => {
      if (!track.id || ids.has(track.id) || !canPlayTrack(track)) return false
      ids.add(track.id)
      return true
    })
}

export const resolveMusicJourneyRadioQueue = (
  stationId,
  tracksInput,
  canPlayTrack = () => true,
) => {
  const station = MUSIC_JOURNEY_RADIO_STATIONS.find((item) => item.id === stationId)
  if (!station) return []
  const tracks = normalizePlayableJourneyTracks(tracksInput, canPlayTrack)
  if (!station.genreTokens.length || tracks.length <= 2) return tracks

  const matched = tracks.filter((track) => {
    const genre = normalizeText(track.genre, 120).toLowerCase()
    return station.genreTokens.some((token) => genre.includes(token))
  })
  if (matched.length >= 2) return matched

  const fallback = tracks.filter((_, index) => index % 2 === station.fallbackOffset)
  return fallback.length >= 2 ? fallback : tracks
}

export const createMusicJourneyRadioCatalog = (
  tracksInput,
  canPlayTrack = () => true,
) => MUSIC_JOURNEY_RADIO_STATIONS.map((station) => {
  const queue = resolveMusicJourneyRadioQueue(station.id, tracksInput, canPlayTrack)
  return {
    id: station.id,
    icon: station.icon,
    labelZh: station.labelZh,
    labelEn: station.labelEn,
    detailZh: station.detailZh,
    detailEn: station.detailEn,
    trackCount: queue.length,
    preview: queue.slice(0, 3).map(createMusicJourneyTrackProjection).filter(Boolean),
  }
})

export const createMusicTrackSharePayload = (trackInput, policy = {}) => {
  if (policy.chatShareEnabled === false) return null
  const track = normalizeMusicTrack(trackInput)
  if (!track.id) return null
  return {
    schema: 'schatphone.music-track-share',
    version: 1,
    trackRef: {
      id: track.id,
      providerId: track.providerId,
    },
    presentation: {
      title: track.title,
      artist: track.artist,
      album: track.album,
      coverUrl: track.coverUrl,
      durationSec: track.durationSec,
    },
  }
}

export const createMusicNowPlayingProjection = (snapshot = {}, policy = {}) => {
  if (policy.mapNowPlayingEnabled === false || !snapshot.track) {
    return {
      available: false,
      status: 'idle',
    }
  }
  const track = normalizeMusicTrack(snapshot.track)
  return {
    available: true,
    status: ['playing', 'paused', 'buffering'].includes(snapshot.status)
      ? snapshot.status
      : 'paused',
    trackRef: {
      id: track.id,
      providerId: track.providerId,
    },
    title: track.title,
    artist: track.artist,
    album: track.album,
    coverUrl: track.coverUrl,
    currentTime: Math.max(0, Number(snapshot.currentTime) || 0),
    duration: Math.max(0, Number(snapshot.duration) || track.durationSec || 0),
  }
}
