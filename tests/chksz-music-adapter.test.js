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
          songs: [
            {
              id: 123,
              name: 'Cloud Song',
              ar: [{ name: 'Lin' }],
              al: { name: 'Sky', picUrl: '/sky.jpg' },
              dt: 245000,
            },
          ],
        },
      },
      createProfile(),
      'Cloud',
    )
    const qq = normalizeChkszSearchResponse(
      {
        list: [{ n: 2, mid: 'qq_mid_2', name: 'Glass', singer: 'Mira', album: 'Transit', pay: 0 }],
      },
      createProfile(CHKSZ_MUSIC_PLATFORMS.QQ),
      'Glass',
    )
    const kugou = normalizeChkszSearchResponse(
      {
        data: {
          list: [
            { n: 3, hash: 'kg_hash_3', songname: 'Signal', singer: 'North', album_name: 'Arcade' },
          ],
        },
      },
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

  test('normalizes common nested cover, artist, album, and publish-date variants', () => {
    const tracks = normalizeChkszSearchResponse(
      {
        result: {
          songs: [
            {
              id: 321,
              name: 'Detailed Song',
              artists: [{ name: 'First Artist' }, { name: 'Second Artist' }],
              album: { name: 'Detailed Album', picurl: '/covers/detailed.jpg' },
              publishTime: Date.UTC(2021, 4, 7),
              durationMs: 201000,
            },
          ],
        },
      },
      createProfile(),
      'Detailed',
    )

    expect(tracks[0]).toMatchObject({
      title: 'Detailed Song',
      artist: 'First Artist, Second Artist',
      album: 'Detailed Album',
      coverUrl: 'https://api.chksz.com/covers/detailed.jpg',
      durationSec: 201,
      year: 2021,
    })
  })

  test('keeps provider access hints conservative without disabling resolvable tracks', () => {
    const netease = normalizeChkszSearchResponse(
      {
        result: {
          songs: [
            { id: 1, name: 'Open', fee: 0 },
            { id: 2, name: 'Member', fee: 1 },
            { id: 3, name: 'Purchase', fee: 4 },
            { id: 4, name: 'Restricted', fee: 8 },
            { id: 5, name: 'Unavailable', st: -1 },
            { id: 6, name: 'Unknown' },
          ],
        },
      },
      createProfile(),
      'Access',
    )
    const qq = normalizeChkszSearchResponse(
      {
        list: [
          { mid: 'free', name: 'Free', pay: 0 },
          { mid: 'vip', name: 'VIP', pay: '会员歌曲' },
          { mid: 'album', name: 'Album', pay: '单独购买' },
        ],
      },
      createProfile(CHKSZ_MUSIC_PLATFORMS.QQ),
      'Access',
    )

    expect(netease.map((track) => track.accessState)).toEqual([
      'open',
      'premium',
      'purchase',
      'restricted',
      'restricted',
      'unknown',
    ])
    expect(qq.map((track) => track.accessState)).toEqual(['open', 'premium', 'purchase'])
    expect([...netease, ...qq].every((track) => Boolean(track.sourceRef))).toBe(true)
  })

  test('adds the device key only to the official outgoing query and returns quota metadata', async () => {
    const fetchImpl = vi.fn(async () =>
      response({
        payload: { result: { songs: [{ id: 7, name: 'Remote', ar: [{ name: 'Artist' }] }] } },
        headers: {
          'X-RateLimit-Limit': '20',
          'X-Quota-Free-Remaining': '37',
          'X-Quota-Paid-Remaining': '120',
        },
      }),
    )
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

  test('resolves audio only when requested and reports provider playback expiry metadata', async () => {
    const profile = createProfile()
    const track = normalizeChkszSearchResponse(
      { result: { songs: [{ id: 88, name: 'On Demand', ar: [{ name: 'Mira' }] }] } },
      profile,
      'On Demand',
    )[0]
    const fetchImpl = vi.fn(async () =>
      response({
        payload: {
          data: {
            url: 'https://stream.example.com/88.mp3',
            name: 'On Demand',
            singer: 'Mira',
            album: { name: 'Resolved Album' },
            picUrl: 'https://images.example.com/88.jpg',
            publishTime: Date.UTC(2020, 0, 1),
            expiresAt: 1_900_000_000,
          },
        },
      }),
    )

    const result = await resolveChkszMusicTrack({
      profile,
      credential: { apiKey: 'chksz_device_secret' },
      track,
      fetchImpl,
    })

    expect(result.track).toMatchObject({
      id: track.id,
      audioUrl: 'https://stream.example.com/88.mp3',
      album: 'Resolved Album',
      coverUrl: 'https://images.example.com/88.jpg',
      year: 2020,
      sourceRef: track.sourceRef,
    })
    expect(result.playbackExpiresAt).toBe(1_900_000_000_000)
    const requestedUrl = new URL(fetchImpl.mock.calls[0][0])
    expect(requestedUrl.pathname).toBe('/api/163_music')
    expect(requestedUrl.searchParams.get('id')).toBe('88')
    expect(requestedUrl.searchParams.get('level')).toBe('jymaster')
  })

  test('reads absolute URL expiry and relative response expiry for playback reuse', async () => {
    const profile = createProfile()
    const track = normalizeChkszSearchResponse(
      { result: { songs: [{ id: 89, name: 'Expiring', ar: [{ name: 'Mira' }] }] } },
      profile,
      'Expiring',
    )[0]
    const absoluteExpiry = await resolveChkszMusicTrack({
      profile,
      credential: { apiKey: 'chksz_device_secret' },
      track,
      fetchImpl: vi.fn(async () =>
        response({
          payload: {
            data: { url: 'https://stream.example.com/89.mp3?expires=1900000000' },
          },
        }),
      ),
    })
    expect(absoluteExpiry.playbackExpiresAt).toBe(1_900_000_000_000)

    const now = 1_800_000_000_000
    const relativeExpiry = await resolveChkszMusicTrack({
      profile,
      credential: { apiKey: 'chksz_device_secret' },
      track,
      now,
      fetchImpl: vi.fn(async () =>
        response({
          payload: {
            data: { url: 'https://stream.example.com/89.mp3', expires_in: 3600 },
          },
        }),
      ),
    })
    expect(relativeExpiry.playbackExpiresAt).toBe(now + 60 * 60 * 1000)
  })

  test('falls back once from selected NetEase and QQ quality when no URL is returned', async () => {
    const neteaseProfile = createProfile()
    const neteaseTrack = normalizeChkszSearchResponse(
      { result: { songs: [{ id: 90, name: 'Fallback' }] } },
      neteaseProfile,
      'Fallback',
    )[0]
    const neteaseFetch = vi
      .fn()
      .mockResolvedValueOnce(response({ payload: { data: { url: '' } } }))
      .mockResolvedValueOnce(
        response({ payload: { data: { url: 'https://stream.example.com/standard.mp3' } } }),
      )

    await expect(
      resolveChkszMusicTrack({
        profile: neteaseProfile,
        credential: { apiKey: 'chksz_device_secret' },
        track: neteaseTrack,
        fetchImpl: neteaseFetch,
      }),
    ).resolves.toMatchObject({
      requestedQuality: 'jymaster',
      resolvedQuality: 'standard',
      qualityFallbackUsed: true,
      track: { audioUrl: 'https://stream.example.com/standard.mp3' },
    })
    expect(neteaseFetch.mock.calls.map(([url]) => new URL(url).searchParams.get('level'))).toEqual([
      'jymaster',
      'standard',
    ])

    const qqProfile = createProfile(CHKSZ_MUSIC_PLATFORMS.QQ)
    const qqTrack = normalizeChkszSearchResponse(
      { list: [{ mid: 'qq_fallback', name: 'QQ Fallback' }] },
      qqProfile,
      'QQ Fallback',
    )[0]
    const qqFetch = vi
      .fn()
      .mockResolvedValueOnce(response({ payload: { data: { url: '' } } }))
      .mockResolvedValueOnce(
        response({ payload: { data: { url: 'https://stream.example.com/qq-basic.mp3' } } }),
      )
    await expect(
      resolveChkszMusicTrack({
        profile: qqProfile,
        credential: { apiKey: 'chksz_device_secret' },
        track: qqTrack,
        fetchImpl: qqFetch,
      }),
    ).resolves.toMatchObject({
      requestedQuality: 'flac',
      resolvedQuality: 'mp3',
      qualityFallbackUsed: true,
    })
    expect(qqFetch.mock.calls.map(([url]) => new URL(url).searchParams.get('size'))).toEqual([
      'flac',
      'mp3',
    ])
  })

  test('does not quality-fallback for base quality, access HTTP errors, or network failures', async () => {
    const standardProfile = normalizeMusicProviderProfile({
      ...createProfile(),
      quality: 'standard',
    })
    const track = normalizeChkszSearchResponse(
      { result: { songs: [{ id: 91, name: 'No Retry' }] } },
      standardProfile,
      'No Retry',
    )[0]
    const baseFetch = vi.fn(async () => response({ payload: { data: { url: '' } } }))
    await expect(
      resolveChkszMusicTrack({
        profile: standardProfile,
        credential: { apiKey: 'chksz_device_secret' },
        track,
        fetchImpl: baseFetch,
      }),
    ).rejects.toMatchObject({ code: 'CHKSZ_AUDIO_URL_MISSING' })
    expect(baseFetch).toHaveBeenCalledTimes(1)

    for (const status of [401, 402, 403, 429, 503]) {
      const deniedFetch = vi.fn(async () => response({ status, payload: { msg: 'denied' } }))
      await expect(
        resolveChkszMusicTrack({
          profile: createProfile(),
          credential: { apiKey: 'chksz_device_secret' },
          track,
          fetchImpl: deniedFetch,
        }),
      ).rejects.toMatchObject({ code: `CHKSZ_HTTP_${status}` })
      expect(deniedFetch).toHaveBeenCalledTimes(1)
    }

    const networkFetch = vi.fn(async () => {
      throw new Error('offline')
    })
    await expect(
      resolveChkszMusicTrack({
        profile: createProfile(),
        credential: { apiKey: 'chksz_device_secret' },
        track,
        fetchImpl: networkFetch,
      }),
    ).rejects.toMatchObject({ code: 'NETWORK_UNAVAILABLE' })
    expect(networkFetch).toHaveBeenCalledTimes(1)
  })

  test('reports provider access meaning after the bounded fallback also has no URL', async () => {
    const profile = createProfile()
    const track = normalizeChkszSearchResponse(
      { result: { songs: [{ id: 92, name: 'Member Only', fee: 1 }] } },
      profile,
      'Member Only',
    )[0]
    const fetchImpl = vi.fn(async () => response({ payload: { data: { url: '' } } }))

    await expect(
      resolveChkszMusicTrack({
        profile,
        credential: { apiKey: 'chksz_device_secret' },
        track,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: 'CHKSZ_PREMIUM_ACCESS_UNAVAILABLE' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)

    const genericBusinessFetch = vi.fn(async () =>
      response({ payload: { code: 500, msg: 'temporary upstream processing failure' } }),
    )
    await expect(
      resolveChkszMusicTrack({
        profile,
        credential: { apiKey: 'chksz_device_secret' },
        track,
        fetchImpl: genericBusinessFetch,
      }),
    ).rejects.toMatchObject({ code: 'CHKSZ_BUSINESS_ERROR' })
    expect(genericBusinessFetch).toHaveBeenCalledTimes(1)
  })

  test('redacts API keys from status errors and retries a 429 at most once', async () => {
    const profile = createProfile()
    const deniedFetch = vi.fn(async () =>
      response({
        status: 401,
        payload: { msg: 'invalid chksz_device_secret' },
      }),
    )
    await expect(
      searchChkszMusic({
        profile,
        credential: { apiKey: 'chksz_device_secret' },
        query: 'Denied',
        fetchImpl: deniedFetch,
      }),
    ).rejects.toMatchObject({ code: 'CHKSZ_HTTP_401', status: 401 })
    try {
      await searchChkszMusic({
        profile,
        credential: { apiKey: 'chksz_device_secret' },
        query: 'Denied',
        fetchImpl: deniedFetch,
      })
    } catch (error) {
      expect(
        JSON.stringify({ message: error.message, apiMessage: error.apiMessage }),
      ).not.toContain('chksz_device_secret')
    }

    const rateLimitedFetch = vi
      .fn()
      .mockResolvedValueOnce(
        response({ status: 429, payload: { msg: 'slow down' }, headers: { 'Retry-After': '0' } }),
      )
      .mockResolvedValueOnce(response({ payload: { result: { songs: [] } } }))
    const sleepImpl = vi.fn(async () => {})
    await expect(
      searchChkszMusic({
        profile,
        credential: { apiKey: 'chksz_device_secret' },
        query: 'Retry',
        fetchImpl: rateLimitedFetch,
        sleepImpl,
      }),
    ).resolves.toMatchObject({ ok: true })
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
      fetchImpl: vi.fn(async () =>
        response({
          payload: {
            lrc: { lyric: '[00:01.00]First line' },
            tlyric: { lyric: '[00:01.00]第一行' },
          },
        }),
      ),
    })
    const playlistResult = await fetchChkszPlaylist({
      profile,
      credential: { apiKey: 'chksz_device_secret' },
      playlistId: '3778678',
      fetchImpl: vi.fn(async () =>
        response({
          payload: {
            playlist: {
              name: 'Night List',
              creator: { nickname: 'DJ Lin' },
              tracks: [{ id: 10, name: 'Ten', ar: [{ name: 'Mira' }], al: { name: 'Ten Album' } }],
            },
          },
        }),
      ),
    })

    expect(lyricResult.lyrics).toMatchObject({
      original: '[00:01.00]First line',
      translation: '[00:01.00]第一行',
    })
    expect(playlistResult.playlist).toMatchObject({ name: 'Night List', creator: 'DJ Lin' })
    expect(playlistResult.playlist.tracks[0]).toMatchObject({ title: 'Ten', audioUrl: '' })
  })
})
