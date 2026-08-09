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
    requestQueue: policy.externalQueueRequestsEnabled === true,
    directPlayback: false,
  },
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
