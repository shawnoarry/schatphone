import {
  CHKSZ_MUSIC_PLATFORMS,
  MUSIC_ADAPTER_KINDS,
  MUSIC_LIMITS,
  MUSIC_TRACK_ACCESS_REASONS,
  MUSIC_TRACK_ACCESS_STATES,
  normalizeMusicProviderProfile,
  normalizeMusicTrack,
  readMusicPath,
} from './music-contract'

export const CHKSZ_API_BASE_URL = 'https://api.chksz.com'

const CHKSZ_PATHS = Object.freeze({
  [CHKSZ_MUSIC_PLATFORMS.NETEASE]: Object.freeze({
    search: '/api/163_search',
    resolve: '/api/163_music',
    lyrics: '/api/163_lyric',
    playlist: '/api/163_playlist',
  }),
  [CHKSZ_MUSIC_PLATFORMS.QQ]: Object.freeze({
    search: '/api/qq_music',
    resolve: '/api/qq_music',
  }),
  [CHKSZ_MUSIC_PLATFORMS.KUGOU]: Object.freeze({
    search: '/api/kugou_music',
    resolve: '/api/kugou_music',
  }),
})

const CHKSZ_BASE_QUALITY = Object.freeze({
  [CHKSZ_MUSIC_PLATFORMS.NETEASE]: 'standard',
  [CHKSZ_MUSIC_PLATFORMS.QQ]: 'mp3',
  [CHKSZ_MUSIC_PLATFORMS.KUGOU]: 'mp3',
})

const ERROR_COPY = Object.freeze({
  400: 'ChKSz rejected the request parameters.',
  401: 'ChKSz API Key is missing, invalid, or no longer signed in.',
  402: 'ChKSz free and paid request quotas are exhausted.',
  403: 'ChKSz denied this account, API Key, or network address.',
  404: 'The requested ChKSz music resource was not found.',
  429: 'ChKSz rate limit reached. Try again after the indicated wait.',
  503: 'ChKSz or the selected music service is temporarily unavailable.',
})

const getHeader = (headers, name) => {
  if (typeof headers?.get === 'function') return headers.get(name) || ''
  const entry = Object.entries(headers || {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )
  return entry?.[1] == null ? '' : String(entry[1])
}

const numberFromHeader = (headers, name) => {
  const rawValue = getHeader(headers, name).trim()
  if (!rawValue) return null
  const value = Number(rawValue)
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null
}

export const readChkszQuotaHeaders = (headers) => ({
  rateLimit: numberFromHeader(headers, 'X-RateLimit-Limit'),
  freeRemaining: numberFromHeader(headers, 'X-Quota-Free-Remaining'),
  paidRemaining: numberFromHeader(headers, 'X-Quota-Paid-Remaining'),
  retryAfter: numberFromHeader(headers, 'Retry-After'),
})

const sanitizeMessage = (message, apiKey = '') => {
  let value = typeof message === 'string' ? message.trim() : ''
  if (apiKey) value = value.split(apiKey).join('[redacted]')
  value = value.replace(/chksz_[A-Za-z0-9_-]+/g, '[redacted]')
  return value.slice(0, 500)
}

const createChkszError = ({ code, status = 0, message = '', apiMessage = '', quota = null }) => {
  const safeApiMessage = sanitizeMessage(apiMessage)
  const error = new Error(safeApiMessage || message || 'ChKSz music request failed.')
  error.code = code
  error.status = status
  error.apiMessage = safeApiMessage
  error.quota = quota
  return error
}

const normalizeProfile = (input = {}) => {
  const profile = normalizeMusicProviderProfile(input)
  if (profile.adapterKind !== MUSIC_ADAPTER_KINDS.CHKSZ) {
    throw createChkszError({
      code: 'CHKSZ_PROFILE_REQUIRED',
      message: 'This operation requires a ChKSz music source.',
    })
  }
  return profile
}

const requireApiKey = (credential = {}) => {
  const apiKey = typeof credential?.apiKey === 'string' ? credential.apiKey.trim() : ''
  if (!apiKey) {
    throw createChkszError({
      code: 'CHKSZ_KEY_MISSING',
      status: 401,
      message: ERROR_COPY[401],
    })
  }
  return apiKey
}

const firstValue = (value, paths) => {
  for (const path of paths) {
    const resolved = readMusicPath(value, path)
    if (resolved !== undefined && resolved !== null && resolved !== '') return resolved
  }
  return undefined
}

const releaseYear = (value) => {
  if (value == null || value === '') return 0
  const directYear = Number(value)
  if (Number.isInteger(directYear) && directYear >= 1900 && directYear <= 2200) return directYear
  const timestamp = Number(value)
  if (Number.isFinite(timestamp) && timestamp > 2200) {
    const milliseconds = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
    const year = new Date(milliseconds).getUTCFullYear()
    if (year >= 1900 && year <= 2200) return year
  }
  const match = String(value).match(/(?:19|20|21)\d{2}/)
  return match ? Number(match[0]) : 0
}

const absoluteExpiryTimestamp = (value) => {
  if (value == null || value === '') return 0
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    if (numeric >= 1_000_000_000_000) return Math.floor(numeric)
    if (numeric >= 1_000_000_000) return Math.floor(numeric * 1000)
    return 0
  }
  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : 0
}

const relativeExpiryTimestamp = (value, now) => {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return now + Math.floor(seconds * 1000)
}

const resolvePlaybackExpiresAt = ({ item, audioUrl, now }) => {
  const absolute = absoluteExpiryTimestamp(
    firstValue(item, [
      'expiresAt',
      'data.expiresAt',
      'expireAt',
      'data.expireAt',
      'expiration',
      'data.expiration',
      'expires',
      'data.expires',
      'expire',
      'data.expire',
    ]),
  )
  if (absolute) return absolute

  const relative = relativeExpiryTimestamp(
    firstValue(item, [
      'expiresIn',
      'data.expiresIn',
      'expires_in',
      'data.expires_in',
      'ttlSeconds',
      'data.ttlSeconds',
    ]),
    now,
  )
  if (relative) return relative

  try {
    const url = new URL(audioUrl)
    for (const key of ['expiresAt', 'expireAt', 'expiration', 'expires', 'expire']) {
      const parsed = absoluteExpiryTimestamp(url.searchParams.get(key))
      if (parsed) return parsed
    }
  } catch {
    // URL validation is owned by track normalization; missing expiry metadata is allowed.
  }
  return 0
}

const resolveList = (payload, platform, operation = 'search') => {
  const candidates =
    operation === 'playlist'
      ? [
          payload?.playlist?.tracks,
          payload?.data?.playlist?.tracks,
          payload?.data?.tracks,
          payload?.tracks,
          payload?.songs,
          payload?.data?.songs,
        ]
      : platform === CHKSZ_MUSIC_PLATFORMS.NETEASE
        ? [
            payload?.result?.songs,
            payload?.data?.result?.songs,
            payload?.data?.songs,
            payload?.songs,
            payload?.data?.list,
            payload?.list,
            payload?.data,
          ]
        : [payload?.list, payload?.data?.list, payload?.data?.songs, payload?.songs, payload?.data]
  return candidates.find(Array.isArray) || []
}

const buildTrackSourceRef = ({ platform, item, index, query = '' }) => {
  const id = firstValue(item, [
    'id',
    'songId',
    'songid',
    'audio_id',
    'audioId',
    'hash',
    'EMixSongID',
  ])
  const mid = firstValue(item, ['mid', 'songmid', 'songMid'])
  const selection = Number(firstValue(item, ['n', 'index', 'no'])) || index + 1
  return {
    type: MUSIC_ADAPTER_KINDS.CHKSZ,
    platform,
    ...(id != null && id !== '' ? { id: String(id) } : {}),
    ...(mid != null && mid !== '' ? { mid: String(mid) } : {}),
    ...(!id && !mid
      ? { selection }
      : platform !== CHKSZ_MUSIC_PLATFORMS.NETEASE
        ? { selection }
        : {}),
    ...(query ? { query } : {}),
  }
}

const normalizeChkszTrackAccess = (item, platform) => {
  const unavailable = Number(
    firstValue(item, ['st', 'privilege.st', 'data.st', 'data.privilege.st']),
  )
  if (Number.isFinite(unavailable) && unavailable < 0) {
    return {
      accessState: MUSIC_TRACK_ACCESS_STATES.RESTRICTED,
      accessReason: MUSIC_TRACK_ACCESS_REASONS.PROVIDER_UNAVAILABLE,
    }
  }

  if (platform === CHKSZ_MUSIC_PLATFORMS.QQ) {
    const pay = firstValue(item, ['pay', 'data.pay'])
    const numericPay = Number(pay)
    if (pay === 0 || pay === '0') {
      return {
        accessState: MUSIC_TRACK_ACCESS_STATES.OPEN,
        accessReason: MUSIC_TRACK_ACCESS_REASONS.PROVIDER_PAY,
      }
    }
    if (/purchase|单独购买|购买|数字专辑/i.test(String(pay || ''))) {
      return {
        accessState: MUSIC_TRACK_ACCESS_STATES.PURCHASE,
        accessReason: MUSIC_TRACK_ACCESS_REASONS.PROVIDER_PAY,
      }
    }
    if ((Number.isFinite(numericPay) && numericPay > 0) || /vip|会员|收费|付费/i.test(String(pay || ''))) {
      return {
        accessState: MUSIC_TRACK_ACCESS_STATES.PREMIUM,
        accessReason: MUSIC_TRACK_ACCESS_REASONS.PROVIDER_PAY,
      }
    }
  }

  if (platform === CHKSZ_MUSIC_PLATFORMS.NETEASE) {
    const fee = Number(firstValue(item, ['fee', 'data.fee', 'privilege.fee', 'data.privilege.fee']))
    if (fee === 0) {
      return {
        accessState: MUSIC_TRACK_ACCESS_STATES.OPEN,
        accessReason: MUSIC_TRACK_ACCESS_REASONS.PROVIDER_FEE,
      }
    }
    if (fee === 1) {
      return {
        accessState: MUSIC_TRACK_ACCESS_STATES.PREMIUM,
        accessReason: MUSIC_TRACK_ACCESS_REASONS.PROVIDER_FEE,
      }
    }
    if (fee === 4) {
      return {
        accessState: MUSIC_TRACK_ACCESS_STATES.PURCHASE,
        accessReason: MUSIC_TRACK_ACCESS_REASONS.PROVIDER_FEE,
      }
    }
    if (fee === 8) {
      return {
        accessState: MUSIC_TRACK_ACCESS_STATES.RESTRICTED,
        accessReason: MUSIC_TRACK_ACCESS_REASONS.PROVIDER_FEE,
      }
    }
  }

  return { accessState: MUSIC_TRACK_ACCESS_STATES.UNKNOWN }
}

const normalizeChkszTrack = ({ item, index, profile, query = '' }) => {
  const platform = profile.platform
  const sourceRef = buildTrackSourceRef({ platform, item, index, query })
  const externalId = sourceRef.id || sourceRef.mid || sourceRef.selection
  return normalizeMusicTrack(
    {
      id: `${profile.id}:${platform}:${externalId}`,
      title: firstValue(item, ['name', 'title', 'songname', 'songName', 'song_name']),
      artist: firstValue(item, [
        'ar',
        'data.ar',
        'artists',
        'data.artists',
        'artist',
        'data.artist',
        'artistName',
        'singer',
        'data.singer',
        'author_name',
      ]),
      album: firstValue(item, ['al', 'data.al', 'album', 'data.album', 'albumName', 'album_name']),
      coverUrl: firstValue(item, [
        'al.picUrl',
        'al.pic',
        'al.cover',
        'data.al.picUrl',
        'album.picUrl',
        'album.picurl',
        'album.pic_url',
        'album.pic',
        'album.cover',
        'data.album.picUrl',
        'cover',
        'coverUrl',
        'picUrl',
        'picurl',
        'pic_url',
        'albumPic',
        'pic',
        'img',
      ]),
      duration: firstValue(item, ['dt', 'data.dt', 'duration', 'durationMs', 'interval', 'time']),
      year: releaseYear(
        firstValue(item, [
          'year',
          'publishTime',
          'publish_time',
          'releaseDate',
          'album.publishTime',
          'al.publishTime',
        ]),
      ),
      providerId: profile.id,
      providerName: profile.name,
      sourceRef,
      ...normalizeChkszTrackAccess(item, platform),
    },
    { providerId: profile.id, providerName: profile.name, baseUrl: CHKSZ_API_BASE_URL },
  )
}

export const normalizeChkszSearchResponse = (payload, profileInput, query = '') => {
  const profile = normalizeProfile(profileInput)
  return resolveList(payload, profile.platform)
    .slice(0, MUSIC_LIMITS.searchResults)
    .map((item, index) => normalizeChkszTrack({ item, index, profile, query }))
}

const buildUrl = ({
  profile,
  apiKey,
  operation,
  query = '',
  limit = 30,
  track,
  playlistId = '',
  quality = '',
}) => {
  const path = CHKSZ_PATHS[profile.platform]?.[operation]
  if (!path) {
    throw createChkszError({
      code: 'CHKSZ_OPERATION_UNSUPPORTED',
      message: 'This ChKSz platform does not support the requested operation.',
    })
  }
  const endpoint = new URL(path, CHKSZ_API_BASE_URL)
  endpoint.searchParams.set('apikey', apiKey)
  if (operation === 'search') {
    const normalizedQuery = String(query || '').trim()
    if (!normalizedQuery) {
      throw createChkszError({ code: 'QUERY_MISSING', message: 'Search query is missing.' })
    }
    endpoint.searchParams.set(
      profile.platform === CHKSZ_MUSIC_PLATFORMS.NETEASE ? 'keyword' : 'msg',
      normalizedQuery,
    )
    if (profile.platform === CHKSZ_MUSIC_PLATFORMS.NETEASE) {
      endpoint.searchParams.set(
        'limit',
        String(Math.max(1, Math.min(100, Math.round(limit) || 30))),
      )
      endpoint.searchParams.set('offset', '0')
    } else {
      endpoint.searchParams.set('num', String(Math.max(1, Math.min(50, Math.round(limit) || 30))))
    }
  } else if (operation === 'resolve') {
    const sourceRef = track?.sourceRef || {}
    if (profile.platform === CHKSZ_MUSIC_PLATFORMS.NETEASE) {
      if (!sourceRef.id) {
        throw createChkszError({
          code: 'CHKSZ_TRACK_REFERENCE_MISSING',
          message: 'Track source ID is missing.',
        })
      }
      endpoint.searchParams.set('id', sourceRef.id || '')
      endpoint.searchParams.set('level', quality || profile.quality)
    } else if (profile.platform === CHKSZ_MUSIC_PLATFORMS.QQ && sourceRef.mid) {
      endpoint.searchParams.set('mid', sourceRef.mid)
      endpoint.searchParams.set('size', quality || profile.quality)
    } else {
      if (!sourceRef.query && !track?.title) {
        throw createChkszError({
          code: 'CHKSZ_TRACK_REFERENCE_MISSING',
          message: 'Track search reference is missing.',
        })
      }
      endpoint.searchParams.set('msg', sourceRef.query || track?.title || '')
      endpoint.searchParams.set('n', String(sourceRef.selection || 1))
      if (profile.platform === CHKSZ_MUSIC_PLATFORMS.QQ)
        endpoint.searchParams.set('size', quality || profile.quality)
    }
  } else if (operation === 'lyrics') {
    if (!track?.sourceRef?.id) {
      throw createChkszError({
        code: 'CHKSZ_TRACK_REFERENCE_MISSING',
        message: 'Track source ID is missing.',
      })
    }
    endpoint.searchParams.set('id', track?.sourceRef?.id || '')
  } else if (operation === 'playlist') {
    const normalizedPlaylistId = String(playlistId || '').trim()
    if (!normalizedPlaylistId) {
      throw createChkszError({ code: 'PLAYLIST_ID_MISSING', message: 'Playlist ID is missing.' })
    }
    endpoint.searchParams.set('id', normalizedPlaylistId)
  }
  return endpoint.toString()
}

const readResponsePayload = async (response) => {
  if (typeof response?.json === 'function') {
    try {
      return await response.json()
    } catch {
      // Some ChKSz endpoints can return plain text when explicitly requested.
    }
  }
  if (typeof response?.text === 'function') {
    const text = await response.text()
    return text ? { url: text.trim() } : {}
  }
  return {}
}

const defaultSleep = (milliseconds, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createChkszError({ code: 'ABORTED', message: 'Music request was cancelled.' }))
      return
    }
    const timer = setTimeout(resolve, milliseconds)
    signal?.addEventListener?.(
      'abort',
      () => {
        clearTimeout(timer)
        reject(createChkszError({ code: 'ABORTED', message: 'Music request was cancelled.' }))
      },
      { once: true },
    )
  })

const requestChksz = async ({
  profile: profileInput,
  credential,
  operation,
  query,
  limit,
  track,
  playlistId,
  fetchImpl = globalThis.fetch,
  signal,
  sleepImpl = defaultSleep,
  quality,
}) => {
  const profile = normalizeProfile(profileInput)
  const apiKey = requireApiKey(credential)
  if (typeof fetchImpl !== 'function') {
    throw createChkszError({
      code: 'FETCH_UNAVAILABLE',
      message: 'Browser network access is unavailable.',
    })
  }
  const url = buildUrl({ profile, apiKey, operation, query, limit, track, playlistId, quality })
  let retryCount = 0
  while (retryCount <= 1) {
    let response
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
      })
    } catch (error) {
      if (error?.code === 'ABORTED' || error?.name === 'AbortError') {
        throw createChkszError({ code: 'ABORTED', message: 'Music request was cancelled.' })
      }
      throw createChkszError({
        code: 'NETWORK_UNAVAILABLE',
        message: 'ChKSz could not be reached. Check browser access and the network connection.',
      })
    }
    const quota = readChkszQuotaHeaders(response?.headers)
    const payload = await readResponsePayload(response)
    const apiMessage = sanitizeMessage(firstValue(payload, ['msg', 'message', 'error']), apiKey)
    if (!response?.ok) {
      const status = Number(response?.status) || 0
      if (status === 429 && retryCount === 0 && quota.retryAfter !== null) {
        retryCount += 1
        await sleepImpl(Math.min(60, quota.retryAfter) * 1000, signal)
        continue
      }
      throw createChkszError({
        code: status ? `CHKSZ_HTTP_${status}` : 'CHKSZ_HTTP_ERROR',
        status,
        message: ERROR_COPY[status] || `ChKSz returned HTTP ${status}.`,
        apiMessage,
        quota,
      })
    }
    const businessCode = Number(payload?.code)
    if (Number.isFinite(businessCode) && ![0, 200].includes(businessCode)) {
      throw createChkszError({
        code: 'CHKSZ_BUSINESS_ERROR',
        status: Number(response?.status) || 200,
        message: 'ChKSz reported a music service error.',
        apiMessage,
        quota,
      })
    }
    return { payload, profile, quota }
  }
  throw createChkszError({ code: 'CHKSZ_HTTP_429', status: 429, message: ERROR_COPY[429] })
}

export const searchChkszMusic = async (options = {}) => {
  const result = await requestChksz({ ...options, operation: 'search' })
  const tracks = normalizeChkszSearchResponse(result.payload, result.profile, options.query)
  return {
    ok: true,
    tracks,
    playableCount: 0,
    resolvableCount: tracks.filter((track) => Boolean(track.sourceRef)).length,
    providerId: result.profile.id,
    quota: result.quota,
  }
}

export const resolveChkszMusicTrack = async (options = {}) => {
  const track = normalizeMusicTrack(options.track)
  const now = Math.max(0, Number(options.now) || Date.now())
  const profile = normalizeProfile(options.profile)
  const requestedQuality = profile.quality
  const fallbackQuality = CHKSZ_BASE_QUALITY[profile.platform] || requestedQuality

  const resolveAtQuality = async (quality) => {
    const result = await requestChksz({
      ...options,
      profile,
      track,
      operation: 'resolve',
      quality,
    })
    const item = Array.isArray(result.payload?.data) ? result.payload.data[0] || {} : result.payload
    const audioUrl = firstValue(item, [
      'url',
      'data.url',
      'song.url',
      'audio.url',
      'play_url',
      'playUrl',
    ])
    const resolvedTrack = normalizeMusicTrack(
      {
        ...track,
        title: firstValue(item, ['name', 'data.name', 'title']) || track.title,
        artist:
          firstValue(item, [
            'singer',
            'data.singer',
            'artist',
            'data.artist',
            'artists',
            'ar',
            'data.ar',
          ]) || track.artist,
        album: firstValue(item, ['album', 'data.album', 'al', 'data.al']) || track.album,
        coverUrl:
          firstValue(item, [
            'cover',
            'data.cover',
            'coverUrl',
            'data.coverUrl',
            'picUrl',
            'data.picUrl',
            'picurl',
            'data.picurl',
            'pic',
            'data.pic',
            'album.picUrl',
            'data.album.picUrl',
            'al.picUrl',
            'data.al.picUrl',
          ]) || track.coverUrl,
        duration:
          firstValue(item, [
            'interval',
            'data.interval',
            'duration',
            'data.duration',
            'dt',
            'data.dt',
          ]) || track.durationSec,
        year:
          releaseYear(
            firstValue(item, [
              'year',
              'data.year',
              'publishTime',
              'data.publishTime',
              'album.publishTime',
              'data.album.publishTime',
            ]),
          ) || track.year,
        audioUrl,
        sourceRef: track.sourceRef,
      },
      { providerId: track.providerId, providerName: track.providerName, baseUrl: CHKSZ_API_BASE_URL },
    )
    if (!resolvedTrack.audioUrl) {
      throw createChkszError({
        code: 'CHKSZ_AUDIO_URL_MISSING',
        message: 'ChKSz returned song information without a playable audio URL.',
        quota: result.quota,
      })
    }
    return {
      ok: true,
      track: resolvedTrack,
      quota: result.quota,
      playbackExpiresAt: resolvePlaybackExpiresAt({ item, audioUrl: resolvedTrack.audioUrl, now }),
      requestedQuality,
      resolvedQuality: quality,
      qualityFallbackUsed: quality !== requestedQuality,
    }
  }

  const isFallbackEligible = (error) =>
    error?.code === 'CHKSZ_AUDIO_URL_MISSING' ||
    (error?.code === 'CHKSZ_BUSINESS_ERROR' &&
      /quality|level|size|format|音质|格式|无可用.*(?:链接|地址)|无法获取.*(?:链接|地址)/i.test(
        `${error?.apiMessage || ''} ${error?.message || ''}`,
      ))

  const withAccessMeaning = (error) => {
    const accessError = {
      [MUSIC_TRACK_ACCESS_STATES.PREMIUM]: {
        code: 'CHKSZ_PREMIUM_ACCESS_UNAVAILABLE',
        message: 'The provider marks this as premium content and returned no playable audio URL.',
      },
      [MUSIC_TRACK_ACCESS_STATES.PURCHASE]: {
        code: 'CHKSZ_PURCHASE_ACCESS_UNAVAILABLE',
        message: 'The provider marks this as separately purchased content and returned no playable audio URL.',
      },
      [MUSIC_TRACK_ACCESS_STATES.RESTRICTED]: {
        code: 'CHKSZ_TRACK_RESTRICTED',
        message: 'The provider marks this track as potentially restricted and returned no playable audio URL.',
      },
    }[track.accessState]
    const explicitlyAccessRelated =
      error?.code === 'CHKSZ_AUDIO_URL_MISSING' ||
      (error?.code === 'CHKSZ_BUSINESS_ERROR' &&
        /vip|member|premium|purchase|pay|fee|rights?|restricted|copyright|会员|购买|付费|收费|版权|受限|无版权/i.test(
          `${error?.apiMessage || ''} ${error?.message || ''}`,
        ))
    if (!accessError || !explicitlyAccessRelated) {
      return error
    }
    return createChkszError({ ...accessError, apiMessage: error?.apiMessage, quota: error?.quota })
  }

  try {
    return await resolveAtQuality(requestedQuality)
  } catch (error) {
    if (requestedQuality !== fallbackQuality && isFallbackEligible(error)) {
      try {
        return await resolveAtQuality(fallbackQuality)
      } catch (fallbackError) {
        throw withAccessMeaning(fallbackError)
      }
    }
    throw withAccessMeaning(error)
  }
}

const lyricText = (value) => {
  if (typeof value === 'string') return value.trim().slice(0, 100000)
  if (value && typeof value === 'object') return lyricText(value.lyric || value.lrc || value.text)
  return ''
}

export const fetchChkszLyrics = async (options = {}) => {
  const track = normalizeMusicTrack(options.track)
  const result = await requestChksz({ ...options, track, operation: 'lyrics' })
  return {
    ok: true,
    lyrics: {
      original: lyricText(firstValue(result.payload, ['lrc', 'lyric', 'data.lrc', 'data.lyric'])),
      translation: lyricText(firstValue(result.payload, ['tlyric', 'translation', 'data.tlyric'])),
      romanized: lyricText(firstValue(result.payload, ['romalrc', 'roma', 'data.romalrc'])),
    },
    quota: result.quota,
  }
}

export const fetchChkszPlaylist = async (options = {}) => {
  const result = await requestChksz({ ...options, operation: 'playlist' })
  const playlist =
    result.payload?.playlist ||
    result.payload?.data?.playlist ||
    result.payload?.data ||
    result.payload
  const tracks = resolveList(result.payload, CHKSZ_MUSIC_PLATFORMS.NETEASE, 'playlist')
    .slice(0, MUSIC_LIMITS.savedTracks)
    .map((item, index) => normalizeChkszTrack({ item, index, profile: result.profile }))
  return {
    ok: true,
    playlist: {
      name: String(firstValue(playlist, ['name', 'title']) || 'Imported Playlist')
        .trim()
        .slice(0, 80),
      coverUrl: String(firstValue(playlist, ['coverImgUrl', 'cover', 'picUrl']) || '').trim(),
      creator: String(firstValue(playlist, ['creator.nickname', 'creator.name', 'creator']) || '')
        .trim()
        .slice(0, 100),
      tracks,
    },
    quota: result.quota,
  }
}

export const isChkszTrackResolvable = (track) =>
  track?.sourceRef?.type === MUSIC_ADAPTER_KINDS.CHKSZ &&
  Object.values(CHKSZ_MUSIC_PLATFORMS).includes(track.sourceRef.platform)
