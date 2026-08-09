import { describe, expect, test, vi } from 'vitest'
import {
  MUSIC_ADAPTER_KINDS,
  MUSIC_AUTH_MODES,
  MUSIC_PROVIDER_METHODS,
  MUSIC_TRACK_SOURCE_TYPES,
  buildMusicProviderSearchRequest,
  normalizeMusicProviderProfile,
  normalizeMusicProviderResults,
  normalizeMusicState,
  normalizeMusicTrack,
  searchMusicProvider,
} from '../src/lib/music-contract'
import {
  MUSIC_INTEGRATION_ACTIONS,
  buildMusicIntegrationRoute,
  createMusicNowPlayingProjection,
  createMusicTrackSharePayload,
  resolveMusicIntegrationCapabilities,
} from '../src/lib/music-module-interface'

const providerProfile = {
  id: 'provider_test',
  name: 'Test Music',
  enabled: true,
  baseUrl: 'https://music.example.com/v1/',
  searchPath: 'catalog/search',
  method: MUSIC_PROVIDER_METHODS.GET,
  queryParam: 'term',
  limitParam: 'take',
  resultPath: 'payload.rows',
  authMode: MUSIC_AUTH_MODES.BEARER,
  headers: {
    Authorization: 'must-not-persist',
    'X-API-Key': 'also-blocked',
    'X-Client': 'schatphone',
  },
  fieldMap: {
    id: 'song.uid',
    title: 'song.name',
    artist: 'credits.artists',
    album: 'release.title',
    coverUrl: 'release.cover',
    audioUrl: 'stream.path',
    duration: 'stream.durationMs',
    year: 'release.year',
    genre: 'release.genre',
  },
}

describe('music provider and integration contracts', () => {
  test('builds a credentialed request without persisting sensitive headers', () => {
    const normalized = normalizeMusicProviderProfile(providerProfile)
    expect(normalized.headers).toEqual({ 'X-Client': 'schatphone' })

    const request = buildMusicProviderSearchRequest({
      profile: providerProfile,
      credential: { apiKey: 'device-secret' },
      query: 'Blue Hour',
      limit: 12,
    })

    expect(request.url).toBe(
      'https://music.example.com/v1/catalog/search?term=Blue+Hour&take=12',
    )
    expect(request.options).toMatchObject({
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer device-secret',
        'X-Client': 'schatphone',
      },
    })
    expect(JSON.stringify(request.profile)).not.toContain('device-secret')
    expect(JSON.stringify(request.profile)).not.toContain('must-not-persist')
  })

  test('maps nested provider responses into playable tracks', () => {
    const tracks = normalizeMusicProviderResults(
      {
        payload: {
          rows: [
            {
              song: { uid: 'track_7', name: 'Glass Signal' },
              credits: { artists: [{ name: 'Mira Vale' }, { name: 'North Arcade' }] },
              release: {
                title: 'Night Transit',
                cover: '/covers/night.jpg',
                year: 2026,
                genre: 'Electronic',
              },
              stream: { path: '/audio/glass.mp3', durationMs: 245000 },
            },
          ],
        },
      },
      providerProfile,
    )

    expect(tracks).toEqual([
      expect.objectContaining({
        id: 'track_7',
        title: 'Glass Signal',
        artist: 'Mira Vale, North Arcade',
        album: 'Night Transit',
        coverUrl: 'https://music.example.com/covers/night.jpg',
        audioUrl: 'https://music.example.com/audio/glass.mp3',
        durationSec: 245,
        providerId: 'provider_test',
      }),
    ])
  })

  test('searches through the configured adapter and reports playable results', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        payload: {
          rows: [
            {
              song: { uid: 'remote_1', name: 'Remote Song' },
              credits: { artists: ['Remote Artist'] },
              stream: { path: '/remote.mp3', durationMs: 180000 },
            },
          ],
        },
      }),
    }))

    const result = await searchMusicProvider({
      profile: providerProfile,
      credential: { apiKey: 'device-secret' },
      query: 'Remote',
      fetchImpl,
    })

    expect(result).toMatchObject({ ok: true, playableCount: 1, providerId: 'provider_test' })
    expect(result.tracks[0]).toMatchObject({ id: 'remote_1', title: 'Remote Song' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('normalizes persisted state without admitting provider secrets', () => {
    const state = normalizeMusicState({
      activeProfileId: 'provider_test',
      profiles: [providerProfile],
      playback: { volume: 2, repeatMode: 'invalid' },
      favoriteTrackIds: ['same', 'same'],
    })

    expect(state.playback).toMatchObject({ volume: 1, repeatMode: 'off' })
    expect(state.favoriteTrackIds).toEqual(['same'])
    expect(JSON.stringify(state)).not.toContain('must-not-persist')
    expect(JSON.stringify(state)).not.toContain('also-blocked')
  })

  test('keeps ChKSz profiles preset-only and strips resolved stream URLs from durable tracks', () => {
    const profile = normalizeMusicProviderProfile({
      id: 'chksz_public',
      name: 'ChKSz Music',
      adapterKind: MUSIC_ADAPTER_KINDS.CHKSZ,
      platform: 'netease',
      quality: 'lossless',
      baseUrl: 'https://untrusted.example.com',
      searchPath: '/custom-search',
      headers: { 'X-Client': 'must-not-apply' },
    })
    const state = normalizeMusicState({
      profiles: [profile],
      savedTracks: [{
        id: 'chksz_public:netease:7',
        title: 'Ephemeral',
        artist: 'Artist',
        providerId: profile.id,
        audioUrl: 'https://signed.example.com/temporary.mp3',
        sourceRef: { type: 'chksz', platform: 'netease', id: '7' },
      }],
    })

    expect(profile).toEqual({
      id: 'chksz_public',
      name: 'ChKSz Music',
      enabled: true,
      adapterKind: 'chksz',
      platform: 'netease',
      quality: 'lossless',
      baseUrl: 'https://api.chksz.com/',
      updatedAt: 0,
    })
    expect(state.savedTracks[0]).toMatchObject({
      audioUrl: '',
      sourceRef: { type: 'chksz', platform: 'netease', id: '7' },
    })
    expect(JSON.stringify(state)).not.toContain('signed.example.com')
  })

  test('keeps URL tracks playable while local-file tracks persist only a Music-owned media reference', () => {
    const directTrack = normalizeMusicTrack({
      id: 'url_track',
      title: 'URL Track',
      audioUrl: 'https://media.example.com/song.mp3',
      sourceRef: { type: MUSIC_TRACK_SOURCE_TYPES.DIRECT_URL },
    })
    const state = normalizeMusicState({
      savedTracks: [
        directTrack,
        {
          id: 'local_track',
          title: 'Local Track',
          audioUrl: 'blob:must-not-persist',
          sourceRef: {
            type: MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE,
            mediaId: 'music_media_1',
            fileName: 'local.mp3',
            mimeType: 'audio/mpeg',
            size: 2048,
          },
        },
      ],
    })

    expect(state.savedTracks[0]).toMatchObject({
      id: 'url_track',
      audioUrl: 'https://media.example.com/song.mp3',
      sourceRef: { type: 'direct_url' },
    })
    expect(state.savedTracks[1]).toMatchObject({
      id: 'local_track',
      audioUrl: '',
      sourceRef: {
        type: 'local_file',
        mediaId: 'music_media_1',
        fileName: 'local.mp3',
        mimeType: 'audio/mpeg',
        size: 2048,
      },
    })
    expect(JSON.stringify(state)).not.toContain('blob:must-not-persist')
  })

  test('keeps Chat and Map projections bounded to presentation data', () => {
    const track = {
      id: 'track_share',
      title: 'Shared Song',
      artist: 'Shared Artist',
      album: 'Shared Album',
      coverUrl: 'https://cdn.example.com/cover.jpg',
      audioUrl: 'https://secret-stream.example.com/song.mp3',
      providerId: 'provider_private',
      durationSec: 210,
    }
    const share = createMusicTrackSharePayload(track)
    const nowPlaying = createMusicNowPlayingProjection({
      track,
      status: 'playing',
      currentTime: 18,
      duration: 210,
    })

    expect(share).toMatchObject({
      schema: 'schatphone.music-track-share',
      trackRef: { id: 'track_share', providerId: 'provider_private' },
      presentation: { title: 'Shared Song', artist: 'Shared Artist' },
    })
    expect(nowPlaying).toMatchObject({
      available: true,
      status: 'playing',
      trackRef: { id: 'track_share', providerId: 'provider_private' },
      currentTime: 18,
    })
    expect(JSON.stringify({ share, nowPlaying })).not.toContain('secret-stream')
    expect(buildMusicIntegrationRoute({
      sourceModule: 'chat',
      action: MUSIC_INTEGRATION_ACTIONS.SEARCH,
      query: 'Shared Song',
    })).toEqual({
      path: '/music',
      query: { source: 'chat', action: 'search', q: 'Shared Song' },
    })
    expect(resolveMusicIntegrationCapabilities({ externalQueueRequestsEnabled: false }).map)
      .toMatchObject({ requestQueue: false, directPlayback: false })

    const localTrack = {
      ...track,
      id: 'local_private',
      audioUrl: 'blob:private-local-audio',
      sourceRef: { type: 'local_file', mediaId: 'music_media_private', fileName: 'private.mp3' },
    }
    const localPayloads = {
      share: createMusicTrackSharePayload(localTrack),
      nowPlaying: createMusicNowPlayingProjection({ track: localTrack, status: 'playing' }),
    }
    expect(JSON.stringify(localPayloads)).not.toContain('private-local-audio')
    expect(JSON.stringify(localPayloads)).not.toContain('music_media_private')
  })
})
