import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import {
  MUSIC_ADAPTER_KINDS,
  MUSIC_DEMO_TRACKS,
  MUSIC_REPEAT_MODES,
  normalizeMusicTrack,
} from '../src/lib/music-contract'
import { MUSIC_INTEGRATION_ACTIONS } from '../src/lib/music-module-interface'
import { musicPlaybackRuntime } from '../src/lib/music-playback-runtime'
import { useMusicStore } from '../src/stores/music'

class MockAudio {
  constructor() {
    MockAudio.instance = this
    this.currentTime = 0
    this.duration = 240
    this.volume = 1
    this.muted = false
    this.paused = true
    this.src = ''
    this.listeners = new Map()
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  emit(type) {
    ;(this.listeners.get(type) || []).forEach((listener) => listener())
  }

  pause() {
    this.paused = true
    this.emit('pause')
  }

  load() {
    this.emit('loadstart')
    this.emit('durationchange')
    this.emit('canplay')
  }

  async play() {
    if (MockAudio.failNextPlay) {
      MockAudio.failNextPlay = false
      throw new Error('stream rejected')
    }
    if (MockAudio.blockNextPlay) {
      MockAudio.blockNextPlay = false
      const error = new Error('gesture required')
      error.name = 'NotAllowedError'
      throw error
    }
    this.paused = false
    this.emit('play')
  }

  removeAttribute(name) {
    if (name === 'src') this.src = ''
  }
}

MockAudio.blockNextPlay = false
MockAudio.failNextPlay = false

Object.defineProperty(globalThis, 'Audio', {
  configurable: true,
  writable: true,
  value: MockAudio,
})

let pinia

const createChkszTrackFixture = (store, suffix) => {
  const profile = store.upsertProvider({
    id: `provider_chksz_${suffix}`,
    name: 'ChKSz Music',
    adapterKind: MUSIC_ADAPTER_KINDS.CHKSZ,
    platform: 'netease',
    baseUrl: 'https://api.chksz.com',
  })
  store.setCredential(profile.id, { apiKey: 'chksz_device_secret' })
  const track = normalizeMusicTrack({
    id: `${profile.id}:netease:88`,
    title: 'Cached Song',
    artist: 'Remote Artist',
    providerId: profile.id,
    providerName: profile.name,
    sourceRef: { type: MUSIC_ADAPTER_KINDS.CHKSZ, platform: 'netease', id: '88' },
  })
  return { profile, track }
}

const createProviderCacheStub = () => {
  const entries = new Map()
  const keyFor = ({ kind, track }) => `${kind}:${track.id}`
  return {
    getProviderCache: vi.fn(async (input) => entries.get(keyFor(input)) || null),
    putProviderCache: vi.fn(async (input) => {
      entries.set(keyFor(input), input.value)
      return true
    }),
  }
}

const chkszResponse = (payload) => ({
  ok: true,
  status: 200,
  headers: { get: () => null },
  json: async () => payload,
})

describe('music store', () => {
  beforeEach(() => {
    MockAudio.blockNextPlay = false
    MockAudio.failNextPlay = false
    musicPlaybackRuntime.stop()
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    musicPlaybackRuntime.stop()
    disposePinia(pinia)
    vi.restoreAllMocks()
  })

  test('keeps provider credentials device-local and out of the system save', async () => {
    const store = useMusicStore()
    const profile = store.upsertProvider({
      id: 'provider_local',
      name: 'Local Provider',
      baseUrl: 'https://music.example.com/',
      authMode: 'bearer',
    })

    expect(store.setCredential(profile.id, { apiKey: 'music-device-secret' })).toBe(true)
    await store.saveNow()

    expect(localStorage.getItem('schatphone:music:credentials')).toContain('music-device-secret')
    const systemSave = localStorage.getItem('schatphone:store:system') || ''
    expect(systemSave).toContain('Local Provider')
    expect(systemSave).not.toContain('music-device-secret')
  })

  test('searches a configured provider and manages library, favorites, and playlists', async () => {
    const store = useMusicStore()
    const profile = store.upsertProvider({
      id: 'provider_remote',
      name: 'Remote Provider',
      baseUrl: 'https://music.example.com/',
      resultPath: 'data.tracks',
    })
    store.setActiveProvider(profile.id)
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          tracks: [
            {
              id: 'remote_track',
              title: 'Remote Track',
              artist: 'Remote Artist',
              album: 'Remote Album',
              audioUrl: 'https://cdn.example.com/remote.mp3',
              duration: 180,
            },
          ],
        },
      }),
    }))

    const result = await store.search('Remote', { fetchImpl })
    const track = result.tracks[0]
    expect(result).toMatchObject({ ok: true, source: 'provider' })
    expect(track).toMatchObject({ id: 'remote_track', providerId: 'provider_remote' })

    expect(store.toggleFavorite(track)).toBe(true)
    const playlist = store.createPlaylist('Night Drive')
    expect(store.addTrackToPlaylist(playlist.id, track)).toBe(true)
    expect(store.favoriteTracks.map((item) => item.id)).toContain('remote_track')
    expect(store.tracksForPlaylist(playlist.id).map((item) => item.id)).toEqual(['remote_track'])
    expect(store.savedTracks.map((item) => item.id)).toContain('remote_track')
  })

  test('keeps an active buffering session pausable and restores playing status', async () => {
    const store = useMusicStore()

    await expect(store.playTrack(MUSIC_DEMO_TRACKS[0])).resolves.toEqual({ ok: true })
    MockAudio.instance.emit('waiting')
    expect(store.runtime.status).toBe('buffering')
    expect(store.isPlaying).toBe(true)

    MockAudio.instance.emit('playing')
    expect(store.runtime.status).toBe('playing')

    await expect(store.togglePlayback()).resolves.toEqual({ ok: true, paused: true })
    expect(MockAudio.instance.paused).toBe(true)
    expect(store.runtime.status).toBe('paused')
    expect(store.isPlaying).toBe(false)
  })

  test('adds a validated HTTPS audio URL as a durable Music track', async () => {
    const store = useMusicStore()
    const probeImpl = vi.fn(async () => ({ ok: true, durationSec: 187 }))

    const result = await store.addTrackFromUrl(
      {
        audioUrl: 'https://media.example.com/direct.mp3',
        title: 'Direct Song',
        artist: 'URL Artist',
        album: 'URL Album',
        coverUrl: 'https://media.example.com/direct.jpg',
      },
      { probeImpl },
    )

    expect(result).toMatchObject({
      ok: true,
      track: {
        title: 'Direct Song',
        durationSec: 187,
        audioUrl: 'https://media.example.com/direct.mp3',
        sourceRef: { type: 'direct_url' },
      },
    })
    expect(store.importedTracks).toHaveLength(1)
    expect(probeImpl).toHaveBeenCalledWith('https://media.example.com/direct.mp3', {})
    expect(localStorage.getItem('schatphone:store:system') || '').toContain('Direct Song')

    await expect(
      store.addTrackFromUrl(
        {
          audioUrl: 'http://media.example.com/insecure.mp3',
          title: 'Insecure Song',
        },
        { probeImpl },
      ),
    ).resolves.toMatchObject({ ok: false, code: 'AUDIO_URL_HTTPS_REQUIRED' })
    expect(probeImpl).toHaveBeenCalledTimes(1)
  })

  test('imports, resolves, revokes, and deletes Music-owned local audio', async () => {
    const store = useMusicStore()
    const localFile = new File(['local-audio-bytes'], 'Local Session.wav', { type: 'audio/wav' })
    const putMedia = vi.fn(async () => true)
    const deleteMedia = vi.fn(async () => true)
    const objectUrlApi = {
      createObjectURL: vi.fn(() => 'blob:music-local-session'),
      revokeObjectURL: vi.fn(),
    }

    const imported = await store.importLocalFiles([localFile], {
      putMedia,
      probeImpl: vi.fn(async () => ({ ok: true, durationSec: 42 })),
      deleteMedia,
    })
    expect(imported).toMatchObject({
      ok: true,
      tracks: [
        {
          title: 'Local Session',
          durationSec: 42,
          audioUrl: '',
          sourceRef: {
            type: 'local_file',
            fileName: 'Local Session.wav',
            mimeType: 'audio/wav',
          },
        },
      ],
    })
    expect(putMedia).toHaveBeenCalledWith(imported.tracks[0].sourceRef.mediaId, localFile)

    const playback = await store.playTrack(imported.tracks[0], {
      queue: imported.tracks,
      getMedia: vi.fn(async () => localFile),
      objectUrlApi,
    })
    expect(playback).toMatchObject({ ok: true })
    expect(store.currentTrack.audioUrl).toBe('blob:music-local-session')
    expect(store.savedTracks[0].audioUrl).toBe('')
    expect(store.recentTracks[0].audioUrl).toBe('')

    const removed = await store.removeImportedTrack(imported.tracks[0].id, {
      deleteMedia,
      objectUrlApi,
    })
    expect(removed).toMatchObject({ ok: true })
    expect(deleteMedia).toHaveBeenCalledWith(imported.tracks[0].sourceRef.mediaId)
    expect(objectUrlApi.revokeObjectURL).toHaveBeenCalledWith('blob:music-local-session')
    expect(store.importedTracks).toHaveLength(0)
    expect(store.queue).toHaveLength(0)
  })

  test('reports a missing local binary without leaking a stale blob URL', async () => {
    const store = useMusicStore()
    const track = store.saveTrack({
      id: 'local_missing',
      title: 'Missing Local Song',
      providerId: 'local_file',
      sourceRef: {
        type: 'local_file',
        mediaId: 'music_media_missing',
        fileName: 'missing.mp3',
        mimeType: 'audio/mpeg',
        size: 100,
      },
    })

    await expect(store.playTrack(track, { getMedia: vi.fn(async () => null) })).resolves.toEqual({
      ok: false,
      code: 'LOCAL_MEDIA_MISSING',
    })
    expect(store.runtime.sessionActive).toBe(false)
  })

  test('keeps a loaded local object URL available after a gesture-required first play', async () => {
    const store = useMusicStore()
    const blob = new Blob(['local-audio'], { type: 'audio/mpeg' })
    const objectUrlApi = {
      createObjectURL: vi.fn(() => 'blob:gesture-retry'),
      revokeObjectURL: vi.fn(),
    }
    const track = store.saveTrack({
      id: 'local_gesture_retry',
      title: 'Gesture Retry',
      providerId: 'local_file',
      sourceRef: {
        type: 'local_file',
        mediaId: 'music_media_gesture_retry',
        fileName: 'gesture.mp3',
        mimeType: 'audio/mpeg',
        size: blob.size,
      },
    })
    MockAudio.blockNextPlay = true

    await expect(
      store.playTrack(track, {
        getMedia: vi.fn(async () => blob),
        objectUrlApi,
      }),
    ).resolves.toEqual({ ok: false, code: 'PLAYBACK_GESTURE_REQUIRED' })
    expect(objectUrlApi.revokeObjectURL).not.toHaveBeenCalled()
    await expect(store.resume()).resolves.toEqual({ ok: true })
    expect(store.isPlaying).toBe(true)

    store.stop({ objectUrlApi })
    expect(objectUrlApi.revokeObjectURL).toHaveBeenCalledWith('blob:gesture-retry')
  })

  test('resolves ChKSz tracks on play without persisting the ephemeral stream URL', async () => {
    const store = useMusicStore()
    const profile = store.upsertProvider({
      id: 'provider_chksz',
      name: 'ChKSz Music',
      adapterKind: MUSIC_ADAPTER_KINDS.CHKSZ,
      platform: 'netease',
      baseUrl: 'https://api.chksz.com',
    })
    store.setCredential(profile.id, { apiKey: 'chksz_device_secret' })
    store.setActiveProvider(profile.id)
    const searchFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({
        result: {
          songs: [{ id: 2034742057, name: 'Resolved Song', ar: [{ name: 'Remote Artist' }] }],
        },
      }),
    }))
    const searchResult = await store.search('Resolved Song', { fetchImpl: searchFetch })
    const unresolvedTrack = searchResult.tracks.find((track) => track.providerId === profile.id)
    expect(unresolvedTrack).toMatchObject({ audioUrl: '', sourceRef: { id: '2034742057' } })
    expect(store.canPlayTrack(unresolvedTrack)).toBe(true)

    const resolveFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ data: { url: 'https://stream.example.com/resolved.mp3' } }),
    }))
    const playback = await store.playTrack(unresolvedTrack, {
      queue: [unresolvedTrack],
      fetchImpl: resolveFetch,
    })

    expect(playback).toMatchObject({ ok: true })
    expect(store.currentTrack.audioUrl).toBe('https://stream.example.com/resolved.mp3')
    expect(store.queue[0].audioUrl).toBe('')
    expect(store.recentTracks[0].audioUrl).toBe('')
    await store.saveNow()
    expect(localStorage.getItem('schatphone:store:system') || '').not.toContain(
      'stream.example.com',
    )
    expect(resolveFetch).toHaveBeenCalledTimes(1)
  })

  test('reuses a ChKSz stream resolution for 24 hours and refreshes it after the memory TTL', async () => {
    const store = useMusicStore()
    const { track } = createChkszTrackFixture(store, 'ttl')
    const providerCache = createProviderCacheStub()
    const resolveFetch = vi.fn(async () =>
      chkszResponse({
        data: {
          url: 'https://stream.example.com/cached.mp3',
          album: { name: 'Cached Album' },
          picUrl: 'https://images.example.com/cached.jpg',
        },
      }),
    )

    await store.playTrack(track, { ...providerCache, fetchImpl: resolveFetch, now: 1000 })
    store.stop()
    await store.playTrack(track, { ...providerCache, fetchImpl: resolveFetch, now: 2000 })
    expect(resolveFetch).toHaveBeenCalledTimes(1)
    expect(store.currentTrack).toMatchObject({
      album: 'Cached Album',
      coverUrl: 'https://images.example.com/cached.jpg',
    })
    const metadataWrite = providerCache.putProviderCache.mock.calls
      .map(([input]) => input)
      .find((input) => input.kind === 'metadata')
    expect(JSON.stringify(metadataWrite.value)).not.toContain('stream.example.com')

    store.stop()
    await store.playTrack(track, {
      ...providerCache,
      fetchImpl: resolveFetch,
      now: 1000 + 24 * 60 * 60 * 1000 + 1,
    })
    expect(resolveFetch).toHaveBeenCalledTimes(2)
  })

  test('keeps only the 50 most recently used ChKSz stream resolutions', async () => {
    const store = useMusicStore()
    const { profile, track } = createChkszTrackFixture(store, 'lru')
    const providerCache = createProviderCacheStub()
    const resolveFetch = vi.fn(async () =>
      chkszResponse({ data: { url: 'https://stream.example.com/lru.mp3' } }),
    )
    const tracks = Array.from({ length: 51 }, (_, index) =>
      normalizeMusicTrack({
        ...track,
        id: `${profile.id}:netease:${index}`,
        sourceRef: {
          type: MUSIC_ADAPTER_KINDS.CHKSZ,
          platform: 'netease',
          id: String(index),
        },
      }),
    )

    for (const item of tracks) {
      await store.playTrack(item, { ...providerCache, fetchImpl: resolveFetch, now: 1000 })
    }
    expect(resolveFetch).toHaveBeenCalledTimes(51)

    await store.playTrack(tracks[50], { ...providerCache, fetchImpl: resolveFetch, now: 2000 })
    expect(resolveFetch).toHaveBeenCalledTimes(51)
    await store.playTrack(tracks[0], { ...providerCache, fetchImpl: resolveFetch, now: 2000 })
    expect(resolveFetch).toHaveBeenCalledTimes(52)
  })

  test('invalidates a rejected cached ChKSz stream and resolves it only once more', async () => {
    const store = useMusicStore()
    const { track } = createChkszTrackFixture(store, 'retry')
    const providerCache = createProviderCacheStub()
    const resolveFetch = vi
      .fn()
      .mockResolvedValueOnce(
        chkszResponse({
          data: { url: 'https://stream.example.com/first.mp3' },
        }),
      )
      .mockResolvedValueOnce(
        chkszResponse({
          data: { url: 'https://stream.example.com/refreshed.mp3' },
        }),
      )

    await store.playTrack(track, { ...providerCache, fetchImpl: resolveFetch, now: 1000 })
    store.stop()
    MockAudio.failNextPlay = true

    await expect(
      store.playTrack(track, { ...providerCache, fetchImpl: resolveFetch, now: 2000 }),
    ).resolves.toEqual({ ok: true })
    expect(resolveFetch).toHaveBeenCalledTimes(2)
    expect(store.currentTrack.audioUrl).toBe('https://stream.example.com/refreshed.mp3')
  })

  test('refreshes a cached ChKSz stream once after an asynchronous audio error', async () => {
    const store = useMusicStore()
    const { track } = createChkszTrackFixture(store, 'async_retry')
    const providerCache = createProviderCacheStub()
    const resolveFetch = vi
      .fn()
      .mockResolvedValueOnce(
        chkszResponse({ data: { url: 'https://stream.example.com/cached-async.mp3' } }),
      )
      .mockResolvedValueOnce(
        chkszResponse({ data: { url: 'https://stream.example.com/refreshed-async.mp3' } }),
      )

    await store.playTrack(track, { ...providerCache, fetchImpl: resolveFetch, now: 1000 })
    store.stop()
    await store.playTrack(track, { ...providerCache, fetchImpl: resolveFetch, now: 2000 })
    MockAudio.instance.emit('error')

    await vi.waitFor(() => expect(resolveFetch).toHaveBeenCalledTimes(2))
    expect(store.currentTrack.audioUrl).toBe('https://stream.example.com/refreshed-async.mp3')
    MockAudio.instance.emit('error')
    await Promise.resolve()
    expect(resolveFetch).toHaveBeenCalledTimes(2)
  })

  test('shares one ChKSz resolution across concurrent play requests for the same track', async () => {
    const store = useMusicStore()
    const { track } = createChkszTrackFixture(store, 'single_flight')
    const providerCache = createProviderCacheStub()
    let releaseRequest
    const requestGate = new Promise((resolve) => {
      releaseRequest = resolve
    })
    const resolveFetch = vi.fn(async () => {
      await requestGate
      return chkszResponse({ data: { url: 'https://stream.example.com/shared.mp3' } })
    })

    const firstPlay = store.playTrack(track, { ...providerCache, fetchImpl: resolveFetch })
    const secondPlay = store.playTrack(track, { ...providerCache, fetchImpl: resolveFetch })
    await vi.waitFor(() => expect(resolveFetch).toHaveBeenCalledTimes(1))
    releaseRequest()

    await expect(Promise.all([firstPlay, secondPlay])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ])
    expect(resolveFetch).toHaveBeenCalledTimes(1)
  })

  test('reuses cached ChKSz lyrics when the same lyrics view is opened again', async () => {
    const store = useMusicStore()
    const { track } = createChkszTrackFixture(store, 'lyrics')
    const providerCache = createProviderCacheStub()
    const lyricFetch = vi.fn(async () =>
      chkszResponse({
        lrc: { lyric: '[00:01.00]Cached lyric line' },
      }),
    )

    await expect(
      store.loadLyrics(track, { ...providerCache, fetchImpl: lyricFetch }),
    ).resolves.toMatchObject({ ok: true })
    await expect(
      store.loadLyrics(track, { ...providerCache, fetchImpl: lyricFetch }),
    ).resolves.toMatchObject({ ok: true, cached: true })

    expect(lyricFetch).toHaveBeenCalledTimes(1)
    expect(store.lyricsState).toMatchObject({
      status: 'ready',
      original: '[00:01.00]Cached lyric line',
    })
  })

  test('plays a queue, advances tracks, and respects repeat-one', async () => {
    const store = useMusicStore()
    const queue = MUSIC_DEMO_TRACKS.slice(0, 2)

    await store.playTrack(queue[0], { queue })
    expect(store.currentTrack.id).toBe(queue[0].id)
    expect(store.isPlaying).toBe(true)
    expect(store.runtime.sessionActive).toBe(true)

    await store.next()
    expect(store.currentTrack.id).toBe(queue[1].id)

    store.state.playback.repeatMode = MUSIC_REPEAT_MODES.ONE
    await store.next({ fromEnded: true })
    expect(store.currentTrack.id).toBe(queue[1].id)
    expect(store.recentTracks[0].id).toBe(queue[1].id)
  })

  test('requires user confirmation or gesture for external queue and playback requests', async () => {
    const store = useMusicStore()
    const track = MUSIC_DEMO_TRACKS[0]

    expect(
      await store.handleIntegrationRequest({
        sourceModule: 'map',
        action: MUSIC_INTEGRATION_ACTIONS.ENQUEUE,
        trackId: track.id,
      }),
    ).toMatchObject({ ok: false, code: 'USER_CONFIRMATION_REQUIRED' })

    store.updateIntegrationPolicy({ externalQueueRequestsEnabled: true })
    expect(
      await store.handleIntegrationRequest({
        sourceModule: 'map',
        action: MUSIC_INTEGRATION_ACTIONS.ENQUEUE,
        trackId: track.id,
      }),
    ).toMatchObject({ ok: true })
    expect(store.queue.map((item) => item.id)).toContain(track.id)

    expect(
      await store.handleIntegrationRequest({
        sourceModule: 'chat',
        action: MUSIC_INTEGRATION_ACTIONS.PLAY,
        trackId: track.id,
      }),
    ).toMatchObject({ ok: false, code: 'USER_GESTURE_REQUIRED' })
  })

  test('keeps Map journey controls bounded while Music owns radio playback', async () => {
    const store = useMusicStore()

    expect(store.mapJourneyMedia.enabled).toBe(true)
    expect(store.mapJourneyMedia.stations.map((station) => station.id)).toEqual([
      'route_mix',
      'city_pulse',
      'night_window',
    ])
    expect(JSON.stringify(store.mapJourneyMedia)).not.toContain('soundhelix.com')

    await expect(store.playJourneyRadio('night_window')).resolves.toMatchObject({ ok: true })
    expect(store.mapJourneyMedia.activeStationId).toBe('night_window')
    expect(store.currentTrack.genre).toMatch(/Dream Pop|Neo Soul|Ambient/)
    expect(store.queue).toHaveLength(3)

    await store.next()
    expect(store.mapJourneyMedia.activeStationId).toBe('night_window')

    store.closeFloatingPlayer()
    expect(store.floatingPlayerVisible).toBe(false)
    await store.next({ fromEnded: true })
    expect(store.floatingPlayerVisible).toBe(false)
    await store.next()
    expect(store.floatingPlayerVisible).toBe(true)

    store.updateIntegrationPolicy({ mapNowPlayingEnabled: false })
    expect(store.mapJourneyMedia).toMatchObject({
      enabled: false,
      activeStationId: '',
      quickTracks: [],
      stations: [],
    })
    await expect(store.playJourneyRadio('route_mix')).resolves.toEqual({
      ok: false,
      code: 'MAP_MUSIC_DISABLED',
    })
    expect(store.floatingPlayerMedia.stations).toHaveLength(3)
    await expect(store.playFloatingRadio('route_mix')).resolves.toMatchObject({ ok: true })
    expect(store.floatingPlayerMedia.activeStationId).toBe('route_mix')
  })
})
