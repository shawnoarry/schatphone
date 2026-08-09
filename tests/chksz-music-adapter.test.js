import { describe, expect, test, vi } from 'vitest'
import {
  fetchChkszLyrics,
  fetchChkszPlaylist,
  normalizeChkszSearchResponse,
  resolveChkszMusicTrack,
  searchChkszMusic,
} from '../src/lib/chksz-music-adapter'
import {
  CHKSZ_MUSIC_PLATFORMS,
  MUSIC_ADAPTER_KINDS,
  normalizeMusicProviderProfile,
} from '../src/lib/music-contract'

const createProfile = (platform = CHKSZ_MUSIC_PLATFORMS.NETEASE) =>
  normalizeMusicProviderProfile({
    id: `chksz_${platform}`,
    name: `ChKSz ${platform}`,
    adapterKind: MUSIC_ADAPTER_KINDS.CHKSZ,
    platform,
    baseUrl: 'https://malicious.example.com/ignored',
  })

const response = ({ status = 200, payload = {}, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: (name) => headers[name] ?? headers[name.toLowerCase()] ?? null,
  },
  json: async () => payload,
})

describe('ChKSz music adapter', () => {
  test('normalizes NetEase, QQ, and Kugou search results into unresolved tracks', () => {
    const netease = normalizeChkszSearchResponse(
      {
        result: {
          songs: [{ id: 123, name: 'Cloud Song', ar: [{ name: 'Lin' }], al: { name: 'Sky', picUrl: '/sky.jpg' }, dt: 245000 }],
        },
      },
      createProfile(),
      'Cloud',
    )
    const qq = normalizeChkszSearchResponse(
      { list: [{ n: 2, mid: 'qq_mid_2', name: 'Glass', singer: 'Mira', album: 'Transit', pay: 0 }] },
      createProfile(CHKSZ_MUSIC_PLATFORMS.QQ),
      'Glass',
    )
    const kugou = normalizeChkszSearchResponse(
      { data: { list: [{ n: 3, hash: 'kg_hash_3', songname: 'Signal', singer: 'North', album_name: 'Arcade' }] } },
      createProfile(CHKSZ_MUSIC_PLATFORMS.KUGOU),
      'Signal',
    )

    expect(netease[0]).toMatchObject({
      id: 'chksz_netease:netease:123',
      title: 'Cloud Song',
      artist: 'Lin',
      album: 'Sky',
      durationSec: 245,
      audioUrl: '',
      sourceRef: { type: 'chksz', platform: 'netease', id: '123', query: 'Cloud' },
    })
    expect(qq[0]).toMatchObject({
      title: 'Glass',
      sourceRef: { platform: 'qq', mid: 'qq_mid_2', selection: 2, query: 'Glass' },
    })
    expect(kugou[0]).toMatchObject({
      title: 'Signal',
      sourceRef: { platform: 'kugou', id: 'kg_hash_3', selection: 3, query: 'Signal' },
    })
  })

  test('adds the device key only to the official outgoing query and returns quota metadata', async () => {
    const fetchImpl = vi.fn(async () => response({
      payload: { result: { songs: [{ id: 7, name: 'Remote', ar: [{ name: 'Artist' }] }] } },
      headers: {
        'X-RateLimit-Limit': '20',
        'X-Quota-Free-Remaining': '37',
        'X-Quota-Paid-Remaining': '120',
      },
    }))
    const result = await searchChkszMusic({
      profile: createProfile(),
      credential: { apiKey: 'chksz_device_secret' },
      query: 'Remote',
      fetchImpl,
    })

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0])
    expect(requestedUrl.origin).toBe('https://api.chksz.com')
    expect(requestedUrl.pathname).toBe('/api/163_search')
    expect(requestedUrl.searchParams.get('apikey')).toBe('chksz_device_secret')
    expect(requestedUrl.searchParams.get('keyword')).toBe('Remote')
    expect(result).toMatchObject({
      ok: true,
      playableCount: 0,
      resolvableCount: 1,
      quota: { rateLimit: 20, freeRemaining: 37, paidRemaining: 120 },
    })
    expect(JSON.stringify(result)).not.toContain('chksz_device_secret')
  })

  test('resolves audio only when requested and keeps the stable source reference', async () => {
    const profile = createProfile()
    const track = normalizeChkszSearchResponse(
      { result: { songs: [{ id: 88, name: 'On Demand', ar: [{ name: 'Mira' }] }] } },
      profile,
      'On Demand',
    )[0]
    const fetchImpl = vi.fn(async () => response({
      payload: {
        data: { url: 'https://stream.example.com/88.mp3', name: 'On Demand', singer: 'Mira' },
      },
    }))

    const result = await resolveChkszMusicTrack({
      profile,
      credential: { apiKey: 'chksz_device_secret' },
      track,
      fetchImpl,
    })

    expect(result.track).toMatchObject({
      id: track.id,
      audioUrl: 'https://stream.example.com/88.mp3',
      sourceRef: track.sourceRef,
    })
    const requestedUrl = new URL(fetchImpl.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe('/api/163_music')
    expect(requestedUrl.searchParams.get('id')).toBe('88')
    expect(requestedUrl.searchParams.get('level')).toBe('jymaster')
  })

  test('redacts API keys from status errors and retries a 429 at most once', async () => {
    const profile = createProfile()
    const deniedFetch = vi.fn(async () => response({
      status: 401,
      payload: { msg: 'invalid chksz_device_secret' },
    }))
    await expect(searchChkszMusic({
      profile,
      credential: { apiKey: 'chksz_device_secret' },
      query: 'Denied',
      fetchImpl: deniedFetch,
    })).rejects.toMatchObject({ code: 'CHKSZ_HTTP_401', status: 401 })
    try {
      await searchChkszMusic({
        profile,
        credential: { apiKey: 'chksz_device_secret' },
        query: 'Denied',
        fetchImpl: deniedFetch,
      })
    } catch (error) {
      expect(JSON.stringify({ message: error.message, apiMessage: error.apiMessage })).not.toContain('chksz_device_secret')
    }

    const rateLimitedFetch = vi
      .fn()
      .mockResolvedValueOnce(response({ status: 429, payload: { msg: 'slow down' }, headers: { 'Retry-After': '0' } }))
      .mockResolvedValueOnce(response({ payload: { result: { songs: [] } } }))
    const sleepImpl = vi.fn(async () => {})
    await expect(searchChkszMusic({
      profile,
      credential: { apiKey: 'chksz_device_secret' },
      query: 'Retry',
      fetchImpl: rateLimitedFetch,
      sleepImpl,
    })).resolves.toMatchObject({ ok: true })
    expect(rateLimitedFetch).toHaveBeenCalledTimes(2)
    expect(sleepImpl).toHaveBeenCalledTimes(1)
  })

  test('reads NetEase lyrics and playlist details without resolving every song', async () => {
    const profile = createProfile()
    const track = normalizeChkszSearchResponse(
      { result: { songs: [{ id: 9, name: 'Lyric Song', ar: [{ name: 'Lin' }] }] } },
      profile,
      'Lyric Song',
    )[0]
    const lyricResult = await fetchChkszLyrics({
      profile,
      credential: { apiKey: 'chksz_device_secret' },
      track,
      fetchImpl: vi.fn(async () => response({ payload: {
        lrc: { lyric: '[00:01.00]First line' },
        tlyric: { lyric: '[00:01.00]第一行' },
      } })),
    })
    const playlistResult = await fetchChkszPlaylist({
      profile,
      credential: { apiKey: 'chksz_device_secret' },
      playlistId: '3778678',
      fetchImpl: vi.fn(async () => response({ payload: {
        playlist: {
          name: 'Night List',
          creator: { nickname: 'DJ Lin' },
          tracks: [{ id: 10, name: 'Ten', ar: [{ name: 'Mira' }], al: { name: 'Ten Album' } }],
        },
      } })),
    })

    expect(lyricResult.lyrics).toMatchObject({
      original: '[00:01.00]First line',
      translation: '[00:01.00]第一行',
    })
    expect(playlistResult.playlist).toMatchObject({ name: 'Night List', creator: 'DJ Lin' })
    expect(playlistResult.playlist.tracks[0]).toMatchObject({ title: 'Ten', audioUrl: '' })
  })
})
