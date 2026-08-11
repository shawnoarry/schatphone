<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MusicAlbumDetail from '../components/music/MusicAlbumDetail.vue'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import {
  CHKSZ_MUSIC_PLATFORMS,
  CHKSZ_MUSIC_QUALITIES,
  DEFAULT_MUSIC_FIELD_MAP,
  MUSIC_ADAPTER_KINDS,
  MUSIC_AUTH_MODES,
  MUSIC_PROVIDER_METHODS,
  MUSIC_TRACK_SOURCE_TYPES,
  createMusicProviderId,
  createRadioBrowserMusicProviderProfile,
  isRadioBrowserMusicProviderProfile,
  normalizeMusicProviderProfile,
  selectWeeklyMusicRecommendation,
} from '../lib/music-contract'
import {
  MUSIC_INTEGRATION_ACTIONS,
  normalizeMusicIntegrationRequest,
} from '../lib/music-module-interface'
import { createMusicTrackShareObject } from '../lib/shareable-object'
import {
  INTERNAL_CHAT_SHARE_ROUTE_QUERY,
  INTERNAL_CHAT_SHARE_ROUTE_VALUE,
  savePendingInternalChatShare,
} from '../lib/internal-chat-share'
import { pushReturnTarget, resolveReturnLabel } from '../lib/navigation-return'
import { useMusicStore } from '../stores/music'

const router = useRouter()
const route = useRoute()
const musicStore = useMusicStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()

const sectionIds = new Set(['listen', 'browse', 'library', 'search'])
const activeSection = ref(sectionIds.has(route.query.tab) ? route.query.tab : 'listen')
const libraryMode = ref('tracks')
const selectedPlaylistId = ref('')
const settingsOpen = ref(false)
const settingsPanel = ref('add')
const addMusicMode = ref('url')
const queueOpen = ref(false)
const nowPlayingOpen = ref(false)
const inspectedTrack = ref(null)
const selectedAlbumId = ref('')
const queuedAlbumNoticeId = ref('')
const playlistSheetOpen = ref(false)
const playlistTargetTrack = ref(null)
const playlistNameDraft = ref('')
const lyricsOpen = ref(false)
const lyricsMode = ref('original')
const playlistImportOpen = ref(false)
const playlistIdDraft = ref('')
const searchInput = ref(null)
const pendingIntegration = ref(null)
const playbackRequestError = ref('')

const providerDraft = reactive(
  normalizeMusicProviderProfile({ id: createMusicProviderId(), name: '' }),
)
const providerCredentialDraft = ref('')
const providerHeadersDraft = ref('{}')
const providerFormError = ref('')
const providerSaving = ref(false)
const providerTesting = ref(false)
const localFileInput = ref(null)
const localFilesImporting = ref(false)
const directUrlDraft = reactive({
  audioUrl: '',
  title: '',
  artist: '',
  album: '',
  coverUrl: '',
})
const addMusicState = reactive({ status: 'idle', message: '' })

const navItems = computed(() => [
  { id: 'listen', icon: 'fas fa-compass', label: t('发现', 'Discover') },
  { id: 'browse', icon: 'fas fa-compact-disc', label: t('专辑', 'Albums') },
  { id: 'library', icon: 'fas fa-user', label: t('我的', 'My Music') },
])

const activeSectionLabel = computed(() => {
  if (activeSection.value === 'search') return t('搜索', 'Search')
  return (
    navItems.value.find((item) => item.id === activeSection.value)?.label || t('发现', 'Discover')
  )
})
const albumDetailReturnLabel = computed(() =>
  activeSection.value === 'listen'
    ? t('返回发现', 'Back to Discover')
    : t('返回专辑', 'Back to Albums'),
)

const libraryModes = computed(() => [
  { id: 'tracks', label: t('全部歌曲', 'Songs') },
  { id: 'favorites', label: t('我喜欢', 'Favorites') },
  { id: 'recent', label: t('最近播放', 'Recently Played') },
  { id: 'playlists', label: t('我的歌单', 'Playlists') },
])

const allAlbums = computed(() => {
  const groups = new Map()
  musicStore.libraryTracks.forEach((track) => {
    const key = `${track.album}::${track.artist}`
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        title: track.album,
        artist: track.artist,
        coverUrl: track.coverUrl,
        year: track.year,
        genre: track.genre,
        tracks: [],
      })
    }
    groups.get(key).tracks.push(track)
  })
  return [...groups.values()]
})
const selectedAlbum = computed(
  () => allAlbums.value.find((album) => album.id === selectedAlbumId.value) || null,
)

const playerTrack = computed(() => musicStore.currentTrack)
const recommendationTrack = computed(() =>
  selectWeeklyMusicRecommendation(
    musicStore.libraryTracks.filter((track) => musicStore.canPlayTrack(track)),
  ),
)
const recommendationQueue = computed(() => {
  const track = recommendationTrack.value
  if (!track) return []
  return (
    allAlbums.value.find((album) => album.tracks.some((item) => item.id === track.id))?.tracks || [
      track,
    ]
  )
})
const isRecommendationCurrentTrack = computed(
  () =>
    Boolean(musicStore.currentTrack?.id) &&
    musicStore.currentTrack.id === recommendationTrack.value?.id,
)
const recommendationPrimaryLabel = computed(() =>
  isRecommendationCurrentTrack.value && musicStore.isPlaying
    ? t('暂停', 'Pause')
    : t('播放', 'Play'),
)
const nowPlayingTrack = computed(() => inspectedTrack.value || playerTrack.value)
const isNowPlayingCurrentTrack = computed(
  () =>
    Boolean(musicStore.currentTrack?.id) &&
    musicStore.currentTrack.id === nowPlayingTrack.value?.id,
)
const selectedPlaylist = computed(
  () => musicStore.playlists.find((playlist) => playlist.id === selectedPlaylistId.value) || null,
)
const selectedPlaylistTracks = computed(() =>
  selectedPlaylist.value ? musicStore.tracksForPlaylist(selectedPlaylist.value.id) : [],
)
const recentVisibleTracks = computed(() => musicStore.recentTracks)
const recentOverviewTracks = computed(() => recentVisibleTracks.value.slice(0, 3))
const libraryArtworkTracks = computed(() => {
  const candidates = [
    ...musicStore.favoriteTracks,
    ...musicStore.recentTracks,
    ...musicStore.myMusicTracks,
  ]
  return candidates
    .filter((track, index, list) => list.findIndex((item) => item.id === track.id) === index)
    .slice(0, 4)
})
const libraryVisibleTracks = computed(() => {
  if (libraryMode.value === 'favorites') return musicStore.favoriteTracks
  if (libraryMode.value === 'recent') return musicStore.recentTracks
  if (libraryMode.value === 'playlists') return selectedPlaylistTracks.value
  return musicStore.myMusicTracks
})
const libraryEmptyMessage = computed(() => {
  if (libraryMode.value === 'favorites') {
    return t('还没有喜欢的歌曲', 'Favorite songs will appear here')
  }
  if (libraryMode.value === 'recent') {
    return t('播放过的歌曲会出现在这里', 'Songs you play will appear here')
  }
  return t('收藏歌曲或加入歌单后，它们会出现在这里', 'Save a song or add it to a playlist')
})
const currentProviderState = computed(() => musicStore.providerStateById[providerDraft.id] || null)
const hasConnectedProvider = computed(() => Boolean(musicStore.activeProfile?.baseUrl))
const isChkszDraft = computed(() => providerDraft.adapterKind === MUSIC_ADAPTER_KINDS.CHKSZ)
const isRadioBrowserDraft = computed(() => isRadioBrowserMusicProviderProfile(providerDraft))
const chkszQualityOptions = computed(
  () => CHKSZ_MUSIC_QUALITIES[providerDraft.platform?.toUpperCase()] || [],
)
const canImportNeteasePlaylist = computed(
  () =>
    musicStore.activeProfile?.adapterKind === MUSIC_ADAPTER_KINDS.CHKSZ &&
    musicStore.activeProfile?.platform === CHKSZ_MUSIC_PLATFORMS.NETEASE,
)
const canLoadLyrics = computed(
  () =>
    playerTrack.value?.sourceRef?.type === MUSIC_ADAPTER_KINDS.CHKSZ &&
    playerTrack.value?.sourceRef?.platform === CHKSZ_MUSIC_PLATFORMS.NETEASE,
)
const lyricTabs = computed(() =>
  [
    { id: 'original', label: t('原文', 'Lyrics') },
    { id: 'translation', label: t('翻译', 'Translation') },
    { id: 'romanized', label: t('罗马音', 'Romanization') },
  ].filter((item) => musicStore.lyricsState[item.id]),
)
const lyricBody = computed(() => {
  const text = musicStore.lyricsState[lyricsMode.value] || ''
  return text
    .replace(/\[(?:\d{1,2}:)?\d{1,2}:\d{1,2}(?:\.\d+)?\]/g, '')
    .replace(/\[\d{1,2}:\d{1,2}(?:\.\d+)?\]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
})
const playbackErrorText = computed(() => {
  if (playbackRequestError.value) return playbackRequestError.value
  const code = musicStore.runtime.errorCode
  if (!code) return ''
  if (code === 'AUDIO_URL_MISSING')
    return t('此歌曲没有可播放地址', 'This track has no playable URL')
  if (code === 'PLAYBACK_GESTURE_REQUIRED') return t('轻点播放以继续', 'Tap play to continue')
  if (code === 'AUDIO_UNSUPPORTED')
    return t('当前浏览器不支持音频播放', 'Audio playback is unavailable in this browser')
  return t('音频暂时无法播放', 'Audio is temporarily unavailable')
})

const importedTrackCount = computed(() => musicStore.importedTracks.length)

const providerStatusCopy = computed(() => {
  const state = currentProviderState.value
  if (!state) return t('尚未测试', 'Not tested')
  if (state.status === 'testing') return t('正在连接…', 'Connecting...')
  if (state.status === 'resolving') return t('正在准备播放…', 'Preparing audio...')
  if (state.status === 'ready') return t('连接正常', 'Connected')
  if (state.status === 'warning') return t('已连接，无可播放地址', 'Connected, no playable URL')
  if (state.status === 'error') return t('连接失败', 'Connection failed')
  return t('尚未测试', 'Not tested')
})

const providerQuotaCopy = computed(() => {
  const state = currentProviderState.value
  if (!isChkszDraft.value || !state) return ''
  const parts = []
  if (state.freeRemaining !== null && state.freeRemaining !== undefined) {
    parts.push(t(`今日免费 ${state.freeRemaining}`, `${state.freeRemaining} free today`))
  }
  if (state.paidRemaining !== null && state.paidRemaining !== undefined) {
    parts.push(t(`付费 ${state.paidRemaining}`, `${state.paidRemaining} paid`))
  }
  if (state.rateLimit !== null && state.rateLimit !== undefined) {
    parts.push(t(`每分钟 ${state.rateLimit}`, `${state.rateLimit}/min`))
  }
  return parts.join(' · ')
})

const searchStateCopy = computed(() => {
  if (musicStore.searchStatus === 'loading') return t('正在搜索…', 'Searching...')
  if (musicStore.searchStatus === 'empty') return t('没有找到歌曲', 'No songs found')
  if (musicStore.searchStatus === 'error')
    return t('音乐源暂时无法访问', 'Music source is unavailable')
  return ''
})

const formatDuration = (secondsInput) => {
  const seconds = Math.max(0, Math.floor(Number(secondsInput) || 0))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

const formatProviderHost = (urlInput) => {
  const value = String(urlInput || '').trim()
  if (!value) return t('未配置', 'Not configured')
  try {
    return new URL(value).host || value
  } catch {
    return value
  }
}

const formatFileSize = (bytesInput) => {
  const bytes = Math.max(0, Number(bytesInput) || 0)
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

const coverStyle = (track) =>
  track?.coverUrl ? { backgroundImage: `url(${JSON.stringify(track.coverUrl)})` } : undefined

const onCoverError = (event) => {
  if (event?.currentTarget instanceof HTMLElement) event.currentTarget.style.visibility = 'hidden'
}

const setSection = (sectionId) => {
  if (!sectionIds.has(sectionId)) return
  activeSection.value = sectionId
  selectedAlbumId.value = ''
  queueOpen.value = false
  if (sectionId === 'search') {
    void nextTick(() => searchInput.value?.focus())
  }
}

const openRecentLibrary = () => {
  libraryMode.value = 'recent'
  setSection('library')
}

const openLibraryMode = (mode) => {
  if (!libraryModes.value.some((item) => item.id === mode)) return
  libraryMode.value = mode
  setSection('library')
}

const returnButtonLabel = computed(() => {
  const destination = resolveReturnLabel(route, 'Home')
  if (destination === 'Map') return t('返回地图', 'Back to Map')
  if (destination === 'Chat') return t('返回聊天', 'Back to Chat')
  if (destination === 'Settings') return t('返回设置', 'Back to Settings')
  return t('返回主屏', 'Back to Home')
})
const goHome = () => pushReturnTarget(router, route, '/home')

const playTrack = async (track, tracks = musicStore.libraryTracks) => {
  playbackRequestError.value = ''
  const result = await musicStore.playTrack(track, { queue: tracks })
  if (!result?.ok) {
    playbackRequestError.value =
      result?.error?.message ||
      (result?.code === 'CHKSZ_KEY_MISSING'
        ? t('请先在音乐设置中填写 ChKSz API Key', 'Add your ChKSz API Key in Music Settings')
        : result?.code === 'LOCAL_MEDIA_MISSING'
          ? t(
              '本地音频已不在此设备，请在音乐设置中重新导入',
              'This local file is missing. Import it again in Music Settings',
            )
          : t('这首歌暂时无法播放', 'This song is temporarily unavailable'))
  }
  return result
}

const isTrackCurrent = (track) => Boolean(track?.id) && musicStore.currentTrack?.id === track.id
const isTrackPlaying = (track) => isTrackCurrent(track) && musicStore.isPlaying
const trackPlaybackLabel = (track) =>
  isTrackPlaying(track) ? t('暂停', 'Pause') : t('播放', 'Play')

const toggleTrackPlayback = async (track, tracks = musicStore.libraryTracks) => {
  if (!track) return
  if (isTrackCurrent(track)) {
    await musicStore.togglePlayback()
    return
  }
  await playTrack(track, tracks)
}

const isAlbumCurrent = (album) => Boolean(album?.tracks?.some((track) => isTrackCurrent(track)))
const isAlbumPlaying = (album) => isAlbumCurrent(album) && musicStore.isPlaying
const albumPlaybackLabel = (album) =>
  isAlbumPlaying(album) ? t('暂停这张专辑', 'Pause album') : t('播放这张专辑', 'Play album')

const toggleAlbumPlayback = async (album) => {
  if (!album?.tracks?.length) return
  const currentAlbumTrack = album.tracks.find((track) => isTrackCurrent(track))
  if (currentAlbumTrack) {
    await musicStore.togglePlayback()
    return
  }
  await playTrack(album.tracks[0], album.tracks)
}

const openAlbumDetail = (album) => {
  if (!album?.id) return
  selectedAlbumId.value = album.id
  queueOpen.value = false
}

const closeAlbumDetail = () => {
  selectedAlbumId.value = ''
}

const toggleAlbumTrackPlayback = (track) => {
  if (!selectedAlbum.value) return
  void toggleTrackPlayback(track, selectedAlbum.value.tracks)
}

const toggleAlbumFavorite = (album) => {
  if (!album?.tracks?.length) return
  const shouldFavorite = album.tracks.some((track) => !musicStore.isFavorite(track.id))
  album.tracks.forEach((track) => {
    if (musicStore.isFavorite(track.id) !== shouldFavorite) musicStore.toggleFavorite(track)
  })
}

let queuedAlbumNoticeTimer = null
const addAlbumToQueue = (album) => {
  if (!album?.tracks?.length) return
  album.tracks.forEach((track) => musicStore.addToQueue(track))
  queuedAlbumNoticeId.value = album.id
  if (queuedAlbumNoticeTimer) clearTimeout(queuedAlbumNoticeTimer)
  queuedAlbumNoticeTimer = setTimeout(() => {
    queuedAlbumNoticeId.value = ''
    queuedAlbumNoticeTimer = null
  }, 1800)
}

const toggleRecommendationPlayback = async () => {
  const track = recommendationTrack.value
  if (!track) return
  await toggleTrackPlayback(track, recommendationQueue.value)
}

const playLibraryMode = () => {
  const tracks = libraryVisibleTracks.value
  if (tracks.length) void playTrack(tracks[0], tracks)
}

const submitSearch = () => {
  setSection('search')
  void musicStore.search(musicStore.searchQuery)
}

const clearMusicSearch = () => {
  musicStore.searchQuery = ''
  musicStore.searchResults = []
}

const toggleFavorite = (track) => musicStore.toggleFavorite(track)

const openNowPlaying = (track = playerTrack.value) => {
  if (!track) return
  inspectedTrack.value = musicStore.currentTrack?.id === track.id ? null : track
  nowPlayingOpen.value = true
}

const closeNowPlaying = () => {
  nowPlayingOpen.value = false
  inspectedTrack.value = null
}

const openQueueFromNowPlaying = () => {
  closeNowPlaying()
  queueOpen.value = true
}

const toggleNowPlayingPlayback = async () => {
  const track = nowPlayingTrack.value
  if (!track) return
  if (isNowPlayingCurrentTrack.value) {
    await musicStore.togglePlayback()
    return
  }
  const result = await playTrack(track)
  if (result?.ok) inspectedTrack.value = null
}

const shareNowPlayingTrackToChat = () => {
  const track = nowPlayingTrack.value
  const payload = musicStore.createSharePayload(track)
  const shareable = createMusicTrackShareObject({
    ...payload,
    statusLabel: t('曲目', 'Track'),
  })
  if (!track || !payload || !shareable) return
  const sourceRoute = router.resolve({
    path: '/music',
    query: { track: track.id },
  }).fullPath
  const draft = savePendingInternalChatShare({ shareable, sourceRoute })
  if (!draft) return
  void router.push({
    path: '/chat',
    query: { [INTERNAL_CHAT_SHARE_ROUTE_QUERY]: INTERNAL_CHAT_SHARE_ROUTE_VALUE },
  })
}

const openPlaylistPicker = (track) => {
  playlistTargetTrack.value = track
  playlistNameDraft.value = ''
  playlistSheetOpen.value = true
}

const addTargetTrackToPlaylist = (playlistId) => {
  if (!playlistTargetTrack.value) return
  musicStore.addTrackToPlaylist(playlistId, playlistTargetTrack.value)
  playlistSheetOpen.value = false
}

const createPlaylistAndAdd = () => {
  const playlist = musicStore.createPlaylist(playlistNameDraft.value)
  if (!playlist) return
  if (playlistTargetTrack.value)
    musicStore.addTrackToPlaylist(playlist.id, playlistTargetTrack.value)
  selectedPlaylistId.value = playlist.id
  libraryMode.value = 'playlists'
  playlistSheetOpen.value = false
}

const openCreatePlaylistSheet = () => {
  playlistTargetTrack.value = null
  playlistSheetOpen.value = true
}

const choosePlaylist = (playlistId) => {
  selectedPlaylistId.value = playlistId
  libraryMode.value = 'playlists'
}

const removePlaylist = async (playlist) => {
  const confirmed = await confirmDialog({
    title: t('删除播放列表？', 'Delete playlist?'),
    message: t(
      `“${playlist.name}”中的歌曲不会从资料库删除。`,
      `Songs in "${playlist.name}" stay in your library.`,
    ),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return
  musicStore.deletePlaylist(playlist.id)
  if (selectedPlaylistId.value === playlist.id) selectedPlaylistId.value = ''
}

const selectProviderDraft = (profile) => {
  const normalized = normalizeMusicProviderProfile(
    profile || { id: createMusicProviderId(), name: '' },
  )
  Object.assign(providerDraft, JSON.parse(JSON.stringify(normalized)))
  providerCredentialDraft.value = profile ? musicStore.getCredential(normalized.id).apiKey : ''
  providerHeadersDraft.value = JSON.stringify(normalized.headers || {}, null, 2)
  providerFormError.value = ''
  settingsPanel.value = 'sources'
}

const createNewProviderDraft = () => selectProviderDraft(null)

const createChkszProviderDraft = () => {
  const normalized = normalizeMusicProviderProfile({
    id: createMusicProviderId(),
    name: 'ChKSz Music',
    adapterKind: MUSIC_ADAPTER_KINDS.CHKSZ,
    platform: CHKSZ_MUSIC_PLATFORMS.NETEASE,
    quality: 'jymaster',
    baseUrl: 'https://api.chksz.com',
  })
  Object.assign(providerDraft, JSON.parse(JSON.stringify(normalized)))
  providerCredentialDraft.value = ''
  providerHeadersDraft.value = '{}'
  providerFormError.value = ''
  settingsPanel.value = 'sources'
}

const createRadioBrowserProviderDraft = () => {
  const normalized = createRadioBrowserMusicProviderProfile({
    id: createMusicProviderId(),
  })
  Object.assign(providerDraft, JSON.parse(JSON.stringify(normalized)))
  providerCredentialDraft.value = ''
  providerHeadersDraft.value = '{}'
  providerFormError.value = ''
  settingsPanel.value = 'sources'
}

const openSettings = () => {
  settingsOpen.value = true
  const profile = musicStore.activeProfile || musicStore.profiles[0] || null
  selectProviderDraft(profile)
  if (!profile) settingsPanel.value = 'add'
}

const closeSettings = () => {
  settingsOpen.value = false
  providerFormError.value = ''
  addMusicState.status = 'idle'
  addMusicState.message = ''
}

const openAddMusic = () => {
  settingsPanel.value = 'add'
  addMusicState.status = 'idle'
  addMusicState.message = ''
}

const selectAddMusicMode = (mode) => {
  if (!['url', 'files'].includes(mode)) return
  addMusicMode.value = mode
  addMusicState.status = 'idle'
  addMusicState.message = ''
}

const addMusicErrorCopy = (code) => {
  const messages = {
    AUDIO_URL_MISSING: t('请输入音频 URL', 'Enter an audio URL'),
    TRACK_TITLE_MISSING: t('请输入歌曲名称', 'Enter a song title'),
    AUDIO_URL_INVALID: t('音频 URL 格式不正确', 'Enter a valid audio URL'),
    AUDIO_URL_HTTPS_REQUIRED: t('音频地址必须使用 HTTPS', 'The audio URL must use HTTPS'),
    COVER_URL_INVALID: t('封面 URL 格式不正确', 'Enter a valid cover URL'),
    AUDIO_PROBE_TIMEOUT: t('音频地址响应超时', 'The audio URL timed out'),
    AUDIO_UNAVAILABLE: t('无法读取该音频地址', 'This audio URL could not be read'),
    LOCAL_FILE_TYPE_UNSUPPORTED: t('请选择支持的音频文件', 'Choose a supported audio file'),
    LOCAL_FILE_TOO_LARGE: t('单个文件不能超过 512 MB', 'Each file must be 512 MB or smaller'),
    LOCAL_FILE_EMPTY: t('空文件无法导入', 'Empty files cannot be imported'),
    LOCAL_MEDIA_STORAGE_FAILED: t(
      '当前设备无法保存该音频',
      'This device could not store the audio file',
    ),
    MUSIC_LIBRARY_LIMIT_REACHED: t('音乐数量已达上限', 'The Music library is full'),
    CURRENT_SAVE_READ_ONLY: t(
      '当前存档为只读，请刷新后重试',
      'The current save is read-only. Refresh and try again',
    ),
  }
  return (
    messages[code] ||
    t('添加失败，请检查音频后重试', 'Could not add this music. Check the audio and try again')
  )
}

const submitDirectUrl = async () => {
  addMusicState.status = 'loading'
  addMusicState.message = ''
  const result = await musicStore.addTrackFromUrl(directUrlDraft)
  if (!result.ok) {
    addMusicState.status = 'error'
    addMusicState.message = addMusicErrorCopy(result.code)
    return
  }
  Object.assign(directUrlDraft, { audioUrl: '', title: '', artist: '', album: '', coverUrl: '' })
  addMusicState.status = 'success'
  addMusicState.message = t(`已添加“${result.track.title}”`, `Added "${result.track.title}"`)
}

const importLocalMusicFiles = async (event) => {
  const files = event?.target?.files
  if (!files?.length) return
  localFilesImporting.value = true
  addMusicState.status = 'loading'
  addMusicState.message = ''
  const result = await musicStore.importLocalFiles(files)
  localFilesImporting.value = false
  if (localFileInput.value) localFileInput.value.value = ''
  if (!result.ok) {
    addMusicState.status = 'error'
    addMusicState.message = addMusicErrorCopy(result.code)
    return
  }
  addMusicState.status = result.failed.length ? 'warning' : 'success'
  addMusicState.message = result.failed.length
    ? t(
        `已导入 ${result.tracks.length} 首，${result.failed.length} 首未导入`,
        `${result.tracks.length} imported, ${result.failed.length} skipped`,
      )
    : t(`已导入 ${result.tracks.length} 首歌曲`, `${result.tracks.length} songs imported`)
}

const removeImportedMusic = async (track) => {
  const confirmed = await confirmDialog({
    title: t('移除这首歌曲？', 'Remove this song?'),
    message:
      track.sourceRef?.type === MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE
        ? t(
            '这会从音乐中移除歌曲及当前设备上的音频文件。',
            'This removes the song and its audio file from this device.',
          )
        : t('这会从音乐中移除该 URL 歌曲。', 'This removes the URL song from Music.'),
    confirmText: t('移除', 'Remove'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return
  await musicStore.removeImportedTrack(track.id)
}

const parseProviderHeaders = () => {
  const text = providerHeadersDraft.value.trim()
  if (!text) return {}
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('invalid_headers')
  return parsed
}

const saveProvider = async ({ close = true } = {}) => {
  providerFormError.value = ''
  if (isChkszDraft.value) {
    providerDraft.name = providerDraft.name.trim() || 'ChKSz Music'
    providerDraft.baseUrl = 'https://api.chksz.com'
  } else if (isRadioBrowserDraft.value) {
    Object.assign(
      providerDraft,
      createRadioBrowserMusicProviderProfile({
        ...JSON.parse(JSON.stringify(providerDraft)),
        name: providerDraft.name.trim() || 'Radio Browser',
      }),
    )
  }
  if (!providerDraft.name.trim() || !providerDraft.baseUrl.trim()) {
    providerFormError.value = t('请填写名称和接口地址', 'Enter a name and endpoint URL')
    return null
  }
  let headers
  try {
    headers = isChkszDraft.value || isRadioBrowserDraft.value ? {} : parseProviderHeaders()
  } catch {
    providerFormError.value = t('请求头必须是 JSON 对象', 'Headers must be a JSON object')
    return null
  }
  const normalizedDraft = normalizeMusicProviderProfile({
    ...JSON.parse(JSON.stringify(providerDraft)),
    headers,
  })
  if (!normalizedDraft.baseUrl) {
    providerFormError.value = t(
      '请输入有效的 HTTP 或 HTTPS 接口地址',
      'Enter a valid HTTP or HTTPS endpoint URL',
    )
    return null
  }
  providerSaving.value = true
  const saved = musicStore.upsertProvider(normalizedDraft)
  if (!saved) {
    providerSaving.value = false
    providerFormError.value = t('音乐源数量已达上限', 'Music source limit reached')
    return null
  }
  musicStore.setCredential(saved.id, { apiKey: providerCredentialDraft.value })
  musicStore.setActiveProvider(saved.id)
  selectProviderDraft(saved)
  providerSaving.value = false
  if (close) closeSettings()
  return saved
}

const testProvider = async () => {
  const saved = await saveProvider({ close: false })
  if (!saved) return
  providerTesting.value = true
  await musicStore.testProvider(saved.id)
  providerTesting.value = false
}

const deleteProvider = async () => {
  const profile = musicStore.profiles.find((item) => item.id === providerDraft.id)
  if (!profile) {
    createNewProviderDraft()
    return
  }
  const confirmed = await confirmDialog({
    title: t('移除音乐源？', 'Remove music source?'),
    message: t(
      `将移除“${profile.name}”的配置与本机密钥。`,
      `This removes "${profile.name}" and its device key.`,
    ),
    confirmText: t('移除', 'Remove'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return
  musicStore.removeProvider(profile.id)
  selectProviderDraft(musicStore.activeProfile || musicStore.profiles[0] || null)
}

const openLyrics = async () => {
  if (!playerTrack.value || !canLoadLyrics.value) return
  lyricsMode.value = 'original'
  lyricsOpen.value = true
  await musicStore.loadLyrics(playerTrack.value)
  const firstAvailable = lyricTabs.value[0]?.id
  if (firstAvailable) lyricsMode.value = firstAvailable
}

const openPlaylistImport = () => {
  playlistIdDraft.value = ''
  musicStore.playlistImportState.status = 'idle'
  musicStore.playlistImportState.errorCode = ''
  playlistImportOpen.value = true
}

const submitPlaylistImport = async () => {
  const profile = musicStore.activeProfile
  if (!profile) return
  const result = await musicStore.importChkszPlaylist(profile.id, playlistIdDraft.value)
  if (!result.ok) return
  selectedPlaylistId.value = result.importedPlaylist.id
  libraryMode.value = 'playlists'
  playlistImportOpen.value = false
}

const acceptIntegration = () => {
  const request = pendingIntegration.value
  if (!request) return
  const track = request.trackId
    ? musicStore.libraryTracks.find((item) => item.id === request.trackId) ||
      musicStore.queue.find((item) => item.id === request.trackId)
    : null
  if (request.action === MUSIC_INTEGRATION_ACTIONS.PLAY && track) {
    void playTrack(track)
  } else if (request.action === MUSIC_INTEGRATION_ACTIONS.ENQUEUE && track) {
    musicStore.addToQueue(track)
    queueOpen.value = true
  }
  pendingIntegration.value = null
}

const applyRouteIntegration = () => {
  const request = normalizeMusicIntegrationRequest({
    sourceModule: route.query.source,
    action: route.query.action,
    trackId: route.query.track,
    query: route.query.q,
    contextId: route.query.context,
  })
  if (request.action === MUSIC_INTEGRATION_ACTIONS.SEARCH && request.query) {
    setSection('search')
    musicStore.searchQuery = request.query
    void musicStore.search(request.query)
    return
  }
  if (request.action === MUSIC_INTEGRATION_ACTIONS.OPEN && request.trackId) {
    const track =
      musicStore.libraryTracks.find((item) => item.id === request.trackId) ||
      musicStore.searchResults.find((item) => item.id === request.trackId) ||
      musicStore.queue.find((item) => item.id === request.trackId)
    if (track) {
      inspectedTrack.value = track
      nowPlayingOpen.value = true
      pendingIntegration.value = null
    }
    return
  }
  if (
    request.sourceModule &&
    [MUSIC_INTEGRATION_ACTIONS.PLAY, MUSIC_INTEGRATION_ACTIONS.ENQUEUE].includes(request.action)
  ) {
    pendingIntegration.value = request
  }
}

watch(
  () => route.query,
  () => applyRouteIntegration(),
)

watch(
  () => providerDraft.platform,
  () => {
    if (!isChkszDraft.value || chkszQualityOptions.value.includes(providerDraft.quality)) return
    providerDraft.quality =
      providerDraft.platform === CHKSZ_MUSIC_PLATFORMS.NETEASE ? 'jymaster' : 'flac'
  },
)

onMounted(() => {
  applyRouteIntegration()
  if (!selectedPlaylistId.value && musicStore.playlists[0]) {
    selectedPlaylistId.value = musicStore.playlists[0].id
  }
})

onBeforeUnmount(() => {
  if (queuedAlbumNoticeTimer) clearTimeout(queuedAlbumNoticeTimer)
})
</script>

<template>
  <main class="music-app" :class="{ 'is-album-detail': selectedAlbum }" data-testid="music-app">
    <div class="music-shell">
      <aside class="music-sidebar" aria-label="Music navigation">
        <div class="music-brand-block">
          <button
            class="music-icon-button is-dark"
            type="button"
            :title="returnButtonLabel"
            @click="goHome"
          >
            <i class="fas fa-chevron-left" aria-hidden="true"></i>
          </button>
          <div class="music-wordmark" aria-label="Music">
            <span class="music-wordmark-mark"><i class="fas fa-music" aria-hidden="true"></i></span>
            <span>Music</span>
          </div>
        </div>

        <nav class="music-nav-list">
          <button
            v-for="item in navItems"
            :key="item.id"
            type="button"
            class="music-nav-item"
            :class="{ 'is-active': activeSection === item.id }"
            :data-testid="`music-tab-${item.id}`"
            @click="setSection(item.id)"
          >
            <i :class="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </button>
        </nav>

        <div class="music-sidebar-footer">
          <button type="button" @click="openSettings">
            <i class="fas fa-sliders" aria-hidden="true"></i>
            <span>{{ t('音乐设置', 'Music Settings') }}</span>
          </button>
        </div>
      </aside>

      <section class="music-content">
        <header class="music-topbar">
          <div class="music-mobile-brand">
            <button
              class="music-icon-button"
              type="button"
              :title="returnButtonLabel"
              @click="goHome"
            >
              <i class="fas fa-chevron-left" aria-hidden="true"></i>
            </button>
            <div class="music-wordmark">
              <i class="fas fa-music" aria-hidden="true"></i><span>Music</span>
            </div>
          </div>
          <div class="music-topbar-title">
            <span>{{ activeSectionLabel }}</span>
          </div>
          <button
            class="music-search-trigger"
            :class="{ 'is-active': activeSection === 'search' }"
            type="button"
            :title="t('搜索歌曲、歌手或专辑', 'Search songs, artists, or albums')"
            data-testid="music-tab-search"
            @click="setSection('search')"
          >
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <span>{{ t('搜索歌曲、歌手或专辑', 'Search songs, artists, or albums') }}</span>
          </button>
          <div class="music-topbar-actions">
            <button
              class="music-icon-button"
              type="button"
              :title="t('播放队列', 'Queue')"
              @click="queueOpen = true"
            >
              <i class="fas fa-list-ul" aria-hidden="true"></i>
            </button>
            <button
              class="music-icon-button"
              type="button"
              :title="t('音乐设置', 'Music Settings')"
              data-testid="music-settings-button"
              @click="openSettings"
            >
              <i class="fas fa-sliders" aria-hidden="true"></i>
            </button>
          </div>
        </header>

        <div class="music-scroll no-scrollbar">
          <div v-if="pendingIntegration" class="music-integration-banner">
            <span class="music-integration-icon">
              <i
                :class="
                  pendingIntegration.sourceModule === 'map'
                    ? 'fas fa-map-location-dot'
                    : 'fas fa-comment'
                "
                aria-hidden="true"
              ></i>
            </span>
            <div>
              <strong>{{
                pendingIntegration.sourceModule === 'map'
                  ? t('来自地图', 'From Map')
                  : t('来自聊天', 'From Chat')
              }}</strong>
              <span>{{
                pendingIntegration.action === 'enqueue'
                  ? t('加入播放队列', 'Add to queue')
                  : t('准备播放', 'Ready to play')
              }}</span>
            </div>
            <button type="button" @click="acceptIntegration">{{ t('继续', 'Continue') }}</button>
            <button
              class="music-icon-button"
              type="button"
              :title="t('关闭', 'Dismiss')"
              @click="pendingIntegration = null"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </div>

          <template v-if="activeSection === 'listen'">
            <div class="music-listen-layout" data-testid="music-listen-layout">
              <section v-if="recommendationTrack" class="music-feature" data-testid="music-feature">
                <span
                  class="music-feature-backdrop music-cover-fallback"
                  :style="coverStyle(recommendationTrack)"
                  aria-hidden="true"
                ></span>
                <button
                  class="music-feature-art music-cover-fallback"
                  type="button"
                  :style="coverStyle(recommendationTrack)"
                  :title="t('查看歌曲详情', 'View track details')"
                  @click="openNowPlaying(recommendationTrack)"
                >
                  <img
                    v-if="recommendationTrack.coverUrl"
                    :src="recommendationTrack.coverUrl"
                    :alt="recommendationTrack.title"
                    @error="onCoverError"
                  />
                  <span class="music-vinyl-groove" aria-hidden="true"></span>
                </button>
                <div class="music-feature-copy">
                  <span class="music-kicker">{{ t('本周推荐', "THIS WEEK'S PICK") }}</span>
                  <h1>{{ recommendationTrack.title }}</h1>
                  <p class="music-feature-artist">{{ recommendationTrack.artist }}</p>
                  <p class="music-feature-note">
                    {{ recommendationTrack.album }}
                    <span v-if="recommendationTrack.genre"> · {{ recommendationTrack.genre }}</span>
                    <span v-if="recommendationTrack.year"> · {{ recommendationTrack.year }}</span>
                  </p>
                  <div class="music-feature-actions">
                    <button
                      class="music-primary-button"
                      type="button"
                      :title="recommendationPrimaryLabel"
                      data-testid="music-feature-play"
                      @click="toggleRecommendationPlayback"
                    >
                      <i
                        :class="
                          isRecommendationCurrentTrack && musicStore.isPlaying
                            ? 'fas fa-pause'
                            : 'fas fa-play'
                        "
                        aria-hidden="true"
                      ></i>
                      <span>{{ recommendationPrimaryLabel }}</span>
                    </button>
                    <button
                      v-if="!isRecommendationCurrentTrack"
                      class="music-secondary-button"
                      type="button"
                      @click="musicStore.addToQueue(recommendationTrack)"
                    >
                      <i class="fas fa-plus" aria-hidden="true"></i>
                      <span>{{ t('稍后播放', 'Play Later') }}</span>
                    </button>
                  </div>
                </div>
              </section>

              <nav
                class="music-discovery-shortcuts"
                :aria-label="t('音乐快捷入口', 'Music shortcuts')"
              >
                <button type="button" @click="openLibraryMode('favorites')">
                  <span class="music-shortcut-icon is-favorite"
                    ><i class="fas fa-heart" aria-hidden="true"></i
                  ></span>
                  <strong>{{ t('我喜欢', 'Favorites') }}</strong>
                  <small>{{ musicStore.favoriteTracks.length }}</small>
                </button>
                <button type="button" @click="openRecentLibrary">
                  <span class="music-shortcut-icon is-recent"
                    ><i class="fas fa-clock-rotate-left" aria-hidden="true"></i
                  ></span>
                  <strong>{{ t('最近播放', 'Recent') }}</strong>
                  <small>{{ musicStore.recentTracks.length }}</small>
                </button>
                <button type="button" @click="openLibraryMode('playlists')">
                  <span class="music-shortcut-icon is-playlist"
                    ><i class="fas fa-list-ul" aria-hidden="true"></i
                  ></span>
                  <strong>{{ t('我的歌单', 'Playlists') }}</strong>
                  <small>{{ musicStore.playlists.length }}</small>
                </button>
                <button type="button" @click="setSection('browse')">
                  <span class="music-shortcut-icon is-album"
                    ><i class="fas fa-compact-disc" aria-hidden="true"></i
                  ></span>
                  <strong>{{ t('全部专辑', 'Albums') }}</strong>
                  <small>{{ allAlbums.length }}</small>
                </button>
              </nav>

              <section class="music-section-block music-album-section">
                <div class="music-section-heading">
                  <div>
                    <span>{{ t('为你精选', 'Made for You') }}</span>
                    <h2>{{ t('值得完整听完', 'Albums worth your time') }}</h2>
                  </div>
                  <button class="music-section-action" type="button" @click="setSection('browse')">
                    <span>{{ t('查看全部', 'See All') }}</span>
                    <i class="fas fa-chevron-right" aria-hidden="true"></i>
                  </button>
                </div>
                <div class="music-album-rail no-scrollbar">
                  <article
                    v-for="album in allAlbums"
                    :key="album.id"
                    class="music-album-item"
                    :class="{
                      'is-current': isAlbumCurrent(album),
                      'is-playing': isAlbumPlaying(album),
                    }"
                    :data-testid="`music-album-${album.tracks[0].id}`"
                  >
                    <button
                      class="music-album-open"
                      type="button"
                      :title="t('查看专辑', 'View album')"
                      :aria-label="`${t('查看专辑', 'View album')}：${album.title}`"
                      :data-testid="`music-album-open-${album.tracks[0].id}`"
                      @click="openAlbumDetail(album)"
                    >
                      <span
                        class="music-album-cover music-cover-fallback"
                        :style="coverStyle(album.tracks[0])"
                      >
                        <img
                          v-if="album.coverUrl"
                          :src="album.coverUrl"
                          :alt="album.title"
                          loading="lazy"
                          @error="onCoverError"
                        />
                      </span>
                      <strong>{{ album.title }}</strong>
                      <span>{{ album.artist }}</span>
                    </button>
                    <button
                      class="music-album-play"
                      type="button"
                      :title="albumPlaybackLabel(album)"
                      :aria-label="`${albumPlaybackLabel(album)}：${album.title}`"
                      :data-testid="`music-album-play-${album.tracks[0].id}`"
                      @click="toggleAlbumPlayback(album)"
                    >
                      <i
                        :class="isAlbumPlaying(album) ? 'fas fa-pause' : 'fas fa-play'"
                        aria-hidden="true"
                      ></i>
                    </button>
                  </article>
                </div>
              </section>

              <section
                class="music-section-block music-recent-section"
                data-testid="music-recent-overview"
              >
                <div class="music-section-heading">
                  <div>
                    <span>{{ t('刚刚听过', 'Recently Played') }}</span>
                    <h2>{{ t('接着听', 'Pick up where you left off') }}</h2>
                  </div>
                  <button
                    class="music-section-action"
                    type="button"
                    :title="t('查看最近播放', 'View listening history')"
                    data-testid="music-recent-see-all"
                    @click="openRecentLibrary"
                  >
                    <span>{{ t('查看全部', 'See All') }}</span>
                    <i class="fas fa-chevron-right" aria-hidden="true"></i>
                  </button>
                </div>
                <div class="music-track-list">
                  <article
                    v-for="(track, index) in recentOverviewTracks"
                    :key="track.id"
                    class="music-track-row"
                    :class="{ 'is-current': isTrackCurrent(track) }"
                  >
                    <button
                      class="music-track-index"
                      type="button"
                      :disabled="!musicStore.canPlayTrack(track)"
                      :title="trackPlaybackLabel(track)"
                      :aria-label="`${trackPlaybackLabel(track)}：${track.title}`"
                      :data-testid="`music-track-toggle-${track.id}`"
                      @click="toggleTrackPlayback(track, recentOverviewTracks)"
                    >
                      <span>{{ String(index + 1).padStart(2, '0') }}</span
                      ><i
                        :class="isTrackPlaying(track) ? 'fas fa-pause' : 'fas fa-play'"
                        aria-hidden="true"
                      ></i>
                    </button>
                    <button
                      class="music-track-info"
                      type="button"
                      :title="t('查看歌曲详情', 'View track details')"
                      :data-testid="`music-track-open-${track.id}`"
                      @click="openNowPlaying(track)"
                    >
                      <span
                        class="music-track-cover music-cover-fallback"
                        :style="coverStyle(track)"
                      >
                        <img
                          v-if="track.coverUrl"
                          :src="track.coverUrl"
                          :alt="track.album"
                          loading="lazy"
                          @error="onCoverError"
                        />
                      </span>
                      <span class="music-track-meta">
                        <strong>{{ track.title }}</strong
                        ><span>{{ track.artist }}</span>
                      </span>
                      <span class="music-track-album">{{ track.album }}</span>
                    </button>
                    <span class="music-track-duration">{{
                      formatDuration(track.durationSec)
                    }}</span>
                    <button
                      class="music-track-action"
                      type="button"
                      :title="
                        musicStore.isFavorite(track.id)
                          ? t('取消喜爱', 'Unfavorite')
                          : t('加入喜爱', 'Favorite')
                      "
                      @click="toggleFavorite(track)"
                    >
                      <i
                        :class="musicStore.isFavorite(track.id) ? 'fas fa-heart' : 'far fa-heart'"
                        aria-hidden="true"
                      ></i>
                    </button>
                    <button
                      class="music-track-action"
                      type="button"
                      :title="t('加入播放列表', 'Add to Playlist')"
                      @click="openPlaylistPicker(track)"
                    >
                      <i class="fas fa-plus" aria-hidden="true"></i>
                    </button>
                  </article>
                  <p v-if="!recentOverviewTracks.length" class="music-empty-state">
                    {{ t('播放过的歌曲会出现在这里', 'Songs you play will appear here') }}
                  </p>
                </div>
              </section>
            </div>
          </template>

          <template v-else-if="activeSection === 'browse'">
            <section class="music-catalog-hero">
              <div class="music-catalog-copy">
                <span class="music-kicker">{{ t('唱片架', 'THE RECORD SHELF') }}</span>
                <h1>{{ t('专辑', 'Albums') }}</h1>
                <p>
                  {{ t(`${allAlbums.length} 张完整唱片`, `${allAlbums.length} complete records`) }}
                </p>
                <button
                  v-if="recommendationTrack"
                  class="music-primary-button"
                  type="button"
                  @click="toggleRecommendationPlayback"
                >
                  <i
                    :class="
                      isRecommendationCurrentTrack && musicStore.isPlaying
                        ? 'fas fa-pause'
                        : 'fas fa-play'
                    "
                    aria-hidden="true"
                  ></i>
                  <span>{{ t('播放本周推荐', "Play this week's pick") }}</span>
                </button>
              </div>
              <div class="music-catalog-stack" aria-hidden="true">
                <span
                  v-for="(album, index) in allAlbums.slice(0, 3)"
                  :key="album.id"
                  :class="`is-${index + 1}`"
                  :style="coverStyle(album.tracks[0])"
                ></span>
              </div>
            </section>
            <section class="music-album-grid">
              <article
                v-for="album in allAlbums"
                :key="album.id"
                class="music-album-item"
                :class="{
                  'is-current': isAlbumCurrent(album),
                  'is-playing': isAlbumPlaying(album),
                }"
              >
                <button
                  class="music-album-open"
                  type="button"
                  :title="t('查看专辑', 'View album')"
                  :aria-label="`${t('查看专辑', 'View album')}：${album.title}`"
                  :data-testid="`music-album-open-${album.tracks[0].id}`"
                  @click="openAlbumDetail(album)"
                >
                  <span
                    class="music-album-cover music-cover-fallback"
                    :style="coverStyle(album.tracks[0])"
                  >
                    <img
                      v-if="album.coverUrl"
                      :src="album.coverUrl"
                      :alt="album.title"
                      loading="lazy"
                      @error="onCoverError"
                    />
                  </span>
                  <strong>{{ album.title }}</strong>
                  <span>{{ album.artist }}</span>
                  <small
                    >{{ album.genre
                    }}<template v-if="album.year"> · {{ album.year }}</template></small
                  >
                </button>
                <button
                  class="music-album-play"
                  type="button"
                  :title="albumPlaybackLabel(album)"
                  :aria-label="`${albumPlaybackLabel(album)}：${album.title}`"
                  :data-testid="`music-album-play-${album.tracks[0].id}`"
                  @click="toggleAlbumPlayback(album)"
                >
                  <i
                    :class="isAlbumPlaying(album) ? 'fas fa-pause' : 'fas fa-play'"
                    aria-hidden="true"
                  ></i>
                </button>
              </article>
            </section>
          </template>

          <template v-else-if="activeSection === 'library'">
            <section class="music-library-hero">
              <div class="music-library-mosaic" aria-hidden="true">
                <span
                  v-for="track in libraryArtworkTracks"
                  :key="track.id"
                  :style="coverStyle(track)"
                ></span>
                <i v-if="!libraryArtworkTracks.length" class="fas fa-music"></i>
              </div>
              <div class="music-library-hero-copy">
                <span class="music-kicker">{{ t('只属于你的音乐', 'YOUR MUSIC') }}</span>
                <h1>{{ t('我的音乐', 'My Music') }}</h1>
                <p>
                  {{
                    t(
                      `${musicStore.myMusicTracks.length} 首歌曲 · ${musicStore.playlists.length} 个歌单`,
                      `${musicStore.myMusicTracks.length} songs · ${musicStore.playlists.length} playlists`,
                    )
                  }}
                </p>
                <button
                  class="music-primary-button"
                  type="button"
                  :disabled="!libraryVisibleTracks.length"
                  @click="playLibraryMode"
                >
                  <i class="fas fa-play" aria-hidden="true"></i
                  ><span>{{ t('播放当前分类', 'Play this collection') }}</span>
                </button>
              </div>
              <div class="music-library-glance">
                <div class="music-library-stat">
                  <i class="fas fa-heart" aria-hidden="true"></i>
                  <strong>{{ musicStore.favoriteTracks.length }}</strong>
                  <span>{{ t('我喜欢', 'Favorites') }}</span>
                </div>
                <div class="music-library-stat">
                  <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
                  <strong>{{ musicStore.recentTracks.length }}</strong>
                  <span>{{ t('最近播放', 'Recent') }}</span>
                </div>
                <div class="music-library-stat">
                  <i class="fas fa-list-ul" aria-hidden="true"></i>
                  <strong>{{ musicStore.playlists.length }}</strong>
                  <span>{{ t('我的歌单', 'Playlists') }}</span>
                </div>
              </div>
            </section>
            <div
              class="music-segmented"
              role="tablist"
              :aria-label="t('资料库分类', 'Library categories')"
            >
              <button
                v-for="mode in libraryModes"
                :key="mode.id"
                type="button"
                :class="{ 'is-active': libraryMode === mode.id }"
                @click="libraryMode = mode.id"
              >
                {{ mode.label }}
              </button>
            </div>

            <section v-if="libraryMode === 'playlists'" class="music-playlist-layout">
              <div class="music-playlist-grid">
                <button
                  class="music-playlist-create"
                  type="button"
                  @click="openCreatePlaylistSheet"
                >
                  <i class="fas fa-plus" aria-hidden="true"></i
                  ><span>{{ t('新建播放列表', 'New Playlist') }}</span>
                </button>
                <button
                  v-if="canImportNeteasePlaylist"
                  class="music-playlist-create is-import"
                  type="button"
                  data-testid="music-playlist-import-open"
                  @click="openPlaylistImport"
                >
                  <i class="fas fa-cloud-arrow-down" aria-hidden="true"></i
                  ><span>{{ t('导入网易云歌单', 'Import NetEase Playlist') }}</span>
                </button>
                <button
                  v-for="playlist in musicStore.playlists"
                  :key="playlist.id"
                  type="button"
                  class="music-playlist-tile"
                  :class="{ 'is-active': selectedPlaylistId === playlist.id }"
                  @click="choosePlaylist(playlist.id)"
                >
                  <span class="music-playlist-mosaic">
                    <span
                      v-for="track in musicStore.tracksForPlaylist(playlist.id).slice(0, 4)"
                      :key="track.id"
                      :style="coverStyle(track)"
                    ></span>
                    <i
                      v-if="!musicStore.tracksForPlaylist(playlist.id).length"
                      class="fas fa-music"
                      aria-hidden="true"
                    ></i>
                  </span>
                  <strong>{{ playlist.name }}</strong
                  ><span>{{
                    t(`${playlist.trackIds.length} 首`, `${playlist.trackIds.length} songs`)
                  }}</span>
                </button>
              </div>
              <div v-if="selectedPlaylist" class="music-playlist-detail">
                <div class="music-section-heading">
                  <div>
                    <span>{{ t('播放列表', 'Playlist') }}</span>
                    <h2>{{ selectedPlaylist.name }}</h2>
                  </div>
                  <button type="button" class="is-danger" @click="removePlaylist(selectedPlaylist)">
                    {{ t('删除', 'Delete') }}
                  </button>
                </div>
                <p v-if="!selectedPlaylistTracks.length" class="music-empty-state">
                  {{ t('还没有歌曲', 'No songs yet') }}
                </p>
              </div>
            </section>

            <div
              v-if="libraryMode !== 'playlists' || selectedPlaylist"
              class="music-track-list is-library-list"
            >
              <article
                v-for="(track, index) in libraryVisibleTracks"
                :key="track.id"
                class="music-track-row"
                :class="{ 'is-current': isTrackCurrent(track) }"
              >
                <button
                  class="music-track-index"
                  type="button"
                  :disabled="!musicStore.canPlayTrack(track)"
                  :title="trackPlaybackLabel(track)"
                  :aria-label="`${trackPlaybackLabel(track)}：${track.title}`"
                  :data-testid="`music-track-toggle-${track.id}`"
                  @click="toggleTrackPlayback(track, libraryVisibleTracks)"
                >
                  <span>{{ String(index + 1).padStart(2, '0') }}</span
                  ><i
                    :class="isTrackPlaying(track) ? 'fas fa-pause' : 'fas fa-play'"
                    aria-hidden="true"
                  ></i>
                </button>
                <button
                  class="music-track-info"
                  type="button"
                  :title="t('查看歌曲详情', 'View track details')"
                  :data-testid="`music-track-open-${track.id}`"
                  @click="openNowPlaying(track)"
                >
                  <span class="music-track-cover music-cover-fallback" :style="coverStyle(track)"
                    ><img
                      v-if="track.coverUrl"
                      :src="track.coverUrl"
                      :alt="track.album"
                      loading="lazy"
                      @error="onCoverError"
                  /></span>
                  <span class="music-track-meta">
                    <strong>{{ track.title }}</strong
                    ><span>{{ track.artist }}</span>
                  </span>
                  <span class="music-track-album">{{ track.album }}</span>
                </button>
                <span class="music-track-duration">{{ formatDuration(track.durationSec) }}</span>
                <button
                  class="music-track-action"
                  type="button"
                  :title="
                    musicStore.isFavorite(track.id)
                      ? t('取消喜爱', 'Unfavorite')
                      : t('加入喜爱', 'Favorite')
                  "
                  @click="toggleFavorite(track)"
                >
                  <i
                    :class="musicStore.isFavorite(track.id) ? 'fas fa-heart' : 'far fa-heart'"
                    aria-hidden="true"
                  ></i>
                </button>
                <button
                  class="music-track-action"
                  type="button"
                  :title="t('加入播放列表', 'Add to Playlist')"
                  @click="openPlaylistPicker(track)"
                >
                  <i class="fas fa-plus" aria-hidden="true"></i>
                </button>
              </article>
              <p v-if="!libraryVisibleTracks.length" class="music-empty-state">
                {{ libraryEmptyMessage }}
              </p>
            </div>
          </template>

          <template v-else>
            <section class="music-search-page">
              <span class="music-kicker">{{
                t('搜索资料库与音乐源', 'SEARCH LIBRARY & SOURCES')
              }}</span>
              <form class="music-search-form" @submit.prevent="submitSearch">
                <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input
                  ref="searchInput"
                  v-model="musicStore.searchQuery"
                  type="search"
                  :placeholder="t('歌曲、艺人或专辑', 'Songs, artists, or albums')"
                  autocomplete="off"
                  data-testid="music-search-input"
                />
                <button
                  v-if="musicStore.searchQuery"
                  type="button"
                  :title="t('清空', 'Clear')"
                  @click="clearMusicSearch"
                >
                  <i class="fas fa-xmark" aria-hidden="true"></i>
                </button>
                <button class="music-search-submit" type="submit">{{ t('搜索', 'Search') }}</button>
              </form>
              <div class="music-search-source">
                <span
                  class="music-source-dot"
                  :class="{ 'is-online': hasConnectedProvider }"
                ></span>
                <span>{{
                  hasConnectedProvider
                    ? musicStore.activeProfile?.name
                    : t('当前仅搜索本地资料库', 'Searching this library')
                }}</span>
                <button v-if="!hasConnectedProvider" type="button" @click="openSettings">
                  {{ t('连接音乐源', 'Connect Source') }}
                </button>
              </div>
            </section>
            <p
              v-if="searchStateCopy"
              class="music-search-state"
              :class="`is-${musicStore.searchStatus}`"
            >
              {{ searchStateCopy }}
            </p>
            <div v-if="musicStore.searchResults.length" class="music-track-list is-search-results">
              <article
                v-for="(track, index) in musicStore.searchResults"
                :key="track.id"
                class="music-track-row"
                :class="{
                  'is-current': isTrackCurrent(track),
                  'is-unplayable': !musicStore.canPlayTrack(track),
                }"
              >
                <button
                  class="music-track-index"
                  type="button"
                  :disabled="!musicStore.canPlayTrack(track)"
                  :title="
                    musicStore.canPlayTrack(track)
                      ? trackPlaybackLabel(track)
                      : t('没有播放地址', 'No playable URL')
                  "
                  :aria-label="`${
                    musicStore.canPlayTrack(track)
                      ? trackPlaybackLabel(track)
                      : t('没有播放地址', 'No playable URL')
                  }：${track.title}`"
                  :data-testid="`music-track-toggle-${track.id}`"
                  @click="toggleTrackPlayback(track, musicStore.searchResults)"
                >
                  <span>{{ String(index + 1).padStart(2, '0') }}</span
                  ><i
                    :class="isTrackPlaying(track) ? 'fas fa-pause' : 'fas fa-play'"
                    aria-hidden="true"
                  ></i>
                </button>
                <button
                  class="music-track-info"
                  type="button"
                  :title="t('查看歌曲详情', 'View track details')"
                  :data-testid="`music-track-open-${track.id}`"
                  @click="openNowPlaying(track)"
                >
                  <span class="music-track-cover music-cover-fallback" :style="coverStyle(track)"
                    ><img
                      v-if="track.coverUrl"
                      :src="track.coverUrl"
                      :alt="track.album"
                      loading="lazy"
                      @error="onCoverError"
                  /></span>
                  <span class="music-track-meta">
                    <strong>{{ track.title }}</strong
                    ><span>{{ track.artist }}</span>
                  </span>
                  <span class="music-track-album">{{ track.album }}</span>
                </button>
                <span class="music-track-duration">{{
                  track.durationSec
                    ? formatDuration(track.durationSec)
                    : musicStore.canPlayTrack(track)
                      ? t('在线', 'Stream')
                      : t('仅资料', 'Info only')
                }}</span>
                <button
                  class="music-track-action"
                  type="button"
                  :title="
                    musicStore.isFavorite(track.id)
                      ? t('取消喜爱', 'Unfavorite')
                      : t('加入喜爱', 'Favorite')
                  "
                  @click="toggleFavorite(track)"
                >
                  <i
                    :class="musicStore.isFavorite(track.id) ? 'fas fa-heart' : 'far fa-heart'"
                    aria-hidden="true"
                  ></i>
                </button>
                <button
                  class="music-track-action"
                  type="button"
                  :title="t('加入播放列表', 'Add to Playlist')"
                  @click="openPlaylistPicker(track)"
                >
                  <i class="fas fa-plus" aria-hidden="true"></i>
                </button>
              </article>
            </div>
          </template>
        </div>

        <transition name="music-album-detail">
          <MusicAlbumDetail
            v-if="selectedAlbum"
            :album="selectedAlbum"
            :back-label="albumDetailReturnLabel"
            :current-track-id="musicStore.currentTrack?.id || ''"
            :favorite-track-ids="musicStore.state.favoriteTrackIds"
            :playing="musicStore.isPlaying"
            :queue-added="queuedAlbumNoticeId === selectedAlbum.id"
            :playback-error="playbackErrorText"
            :can-play-track="musicStore.canPlayTrack"
            @close="closeAlbumDetail"
            @toggle-album="toggleAlbumPlayback"
            @toggle-album-favorite="toggleAlbumFavorite"
            @add-queue="addAlbumToQueue"
            @toggle-track="toggleAlbumTrackPlayback"
            @open-track="openNowPlaying"
            @toggle-favorite="toggleFavorite"
            @add-playlist="openPlaylistPicker"
          />
        </transition>
      </section>
    </div>

    <section v-if="playerTrack" class="music-player" data-testid="music-player">
      <button
        class="music-player-track"
        type="button"
        data-testid="music-now-playing-open"
        @click="openNowPlaying(playerTrack)"
      >
        <span class="music-player-cover music-cover-fallback" :style="coverStyle(playerTrack)"
          ><img
            v-if="playerTrack.coverUrl"
            :src="playerTrack.coverUrl"
            :alt="playerTrack.album"
            @error="onCoverError"
        /></span>
        <span class="music-player-meta"
          ><strong>{{ playerTrack.title }}</strong
          ><span>{{ playerTrack.artist }}</span></span
        >
      </button>
      <div class="music-player-center">
        <div class="music-player-controls">
          <button
            type="button"
            :class="{ 'is-active': musicStore.state.playback.shuffle }"
            :title="t('随机播放', 'Shuffle')"
            @click="musicStore.toggleShuffle"
          >
            <i class="fas fa-shuffle" aria-hidden="true"></i>
          </button>
          <button type="button" :title="t('上一首', 'Previous')" @click="musicStore.previous">
            <i class="fas fa-backward-step" aria-hidden="true"></i>
          </button>
          <button
            class="music-play-button"
            type="button"
            data-testid="music-player-toggle"
            :title="musicStore.isPlaying ? t('暂停', 'Pause') : t('播放', 'Play')"
            @click="musicStore.togglePlayback"
          >
            <i
              :class="musicStore.isPlaying ? 'fas fa-pause' : 'fas fa-play'"
              aria-hidden="true"
            ></i>
          </button>
          <button
            type="button"
            data-testid="music-player-stop"
            :title="t('停止播放', 'Stop playback')"
            @click="musicStore.stop"
          >
            <i class="fas fa-stop" aria-hidden="true"></i>
          </button>
          <button type="button" :title="t('下一首', 'Next')" @click="musicStore.next">
            <i class="fas fa-forward-step" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            :class="{ 'is-active': musicStore.state.playback.repeatMode !== 'off' }"
            :title="t('循环模式', 'Repeat')"
            @click="musicStore.cycleRepeatMode"
          >
            <i
              :class="
                musicStore.state.playback.repeatMode === 'one' ? 'fas fa-repeat' : 'fas fa-retweet'
              "
              aria-hidden="true"
            ></i
            ><small v-if="musicStore.state.playback.repeatMode === 'one'">1</small>
          </button>
        </div>
        <div class="music-player-progress">
          <span>{{ formatDuration(musicStore.runtime.currentTime) }}</span>
          <input
            type="range"
            min="0"
            :max="Math.max(1, musicStore.runtime.duration || playerTrack.durationSec)"
            step="1"
            :value="musicStore.runtime.currentTime"
            :aria-label="t('播放进度', 'Playback progress')"
            @input="musicStore.seek($event.target.value)"
          />
          <span>{{ formatDuration(musicStore.runtime.duration || playerTrack.durationSec) }}</span>
        </div>
      </div>
      <div class="music-player-tools">
        <button type="button" :title="t('播放队列', 'Queue')" @click="queueOpen = true">
          <i class="fas fa-list-ul" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          :title="musicStore.state.playback.muted ? t('取消静音', 'Unmute') : t('静音', 'Mute')"
          @click="musicStore.toggleMuted"
        >
          <i
            :class="musicStore.state.playback.muted ? 'fas fa-volume-xmark' : 'fas fa-volume-high'"
            aria-hidden="true"
          ></i>
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="musicStore.state.playback.volume"
          :aria-label="t('音量', 'Volume')"
          @input="musicStore.setVolume($event.target.value)"
        />
      </div>
      <p v-if="playbackErrorText" class="music-player-error">{{ playbackErrorText }}</p>
    </section>

    <transition name="music-drawer">
      <div v-if="queueOpen" class="music-overlay" @click.self="queueOpen = false">
        <aside class="music-queue-drawer" aria-label="Queue" data-testid="music-queue">
          <div class="music-drawer-heading">
            <div>
              <span>{{ t('接下来播放', 'Up Next') }}</span>
              <h2>{{ t('播放队列', 'Queue') }}</h2>
            </div>
            <button
              class="music-icon-button"
              type="button"
              :title="t('关闭', 'Close')"
              @click="queueOpen = false"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
          <div class="music-queue-list no-scrollbar">
            <button
              v-for="(track, index) in musicStore.queue"
              :key="track.id"
              type="button"
              class="music-queue-row"
              :class="{ 'is-current': musicStore.currentTrack?.id === track.id }"
              @click="playTrack(track, musicStore.queue)"
            >
              <span class="music-track-cover music-cover-fallback" :style="coverStyle(track)"></span
              ><span
                ><strong>{{ track.title }}</strong
                ><small>{{ track.artist }}</small></span
              ><em>{{ String(index + 1).padStart(2, '0') }}</em>
            </button>
            <p v-if="!musicStore.queue.length" class="music-empty-state">
              {{ t('队列是空的', 'Your queue is empty') }}
            </p>
          </div>
        </aside>
      </div>
    </transition>

    <transition name="music-drawer">
      <div
        v-if="nowPlayingOpen && nowPlayingTrack"
        class="music-overlay is-now-playing"
        @click.self="closeNowPlaying"
      >
        <section class="music-now-playing-sheet" data-testid="music-now-playing-sheet">
          <div
            class="music-now-playing-ambient music-cover-fallback"
            :style="coverStyle(nowPlayingTrack)"
            aria-hidden="true"
          ></div>
          <button
            class="music-icon-button is-sheet-close"
            type="button"
            :title="t('收起', 'Close')"
            @click="closeNowPlaying"
          >
            <i class="fas fa-chevron-down" aria-hidden="true"></i>
          </button>
          <div class="music-now-playing-layout">
            <div class="music-now-playing-visual">
              <div
                class="music-now-playing-art music-cover-fallback"
                :style="coverStyle(nowPlayingTrack)"
              >
                <img
                  v-if="nowPlayingTrack.coverUrl"
                  :src="nowPlayingTrack.coverUrl"
                  :alt="nowPlayingTrack.album"
                  @error="onCoverError"
                />
              </div>
            </div>
            <div class="music-now-playing-stage">
              <div class="music-now-playing-copy">
                <span>{{
                  isNowPlayingCurrentTrack
                    ? t('正在播放', 'NOW PLAYING')
                    : t('曲目详情', 'TRACK DETAILS')
                }}</span>
                <h2>{{ nowPlayingTrack.title }}</h2>
                <p>{{ nowPlayingTrack.artist }} · {{ nowPlayingTrack.album }}</p>
              </div>
              <div class="music-now-playing-playback">
                <template v-if="isNowPlayingCurrentTrack">
                  <input
                    class="music-now-playing-range"
                    type="range"
                    min="0"
                    :max="Math.max(1, musicStore.runtime.duration || nowPlayingTrack.durationSec)"
                    step="1"
                    :value="musicStore.runtime.currentTime"
                    :aria-label="t('播放进度', 'Playback progress')"
                    @input="musicStore.seek($event.target.value)"
                  />
                  <div class="music-now-playing-times">
                    <span>{{ formatDuration(musicStore.runtime.currentTime) }}</span
                    ><span
                      >-{{
                        formatDuration(
                          Math.max(
                            0,
                            (musicStore.runtime.duration || nowPlayingTrack.durationSec) -
                              musicStore.runtime.currentTime,
                          ),
                        )
                      }}</span
                    >
                  </div>
                </template>
                <div class="music-now-playing-controls">
                  <button
                    v-if="isNowPlayingCurrentTrack"
                    type="button"
                    :title="t('上一首', 'Previous')"
                    @click="musicStore.previous"
                  >
                    <i class="fas fa-backward-step" aria-hidden="true"></i>
                  </button>
                  <button
                    class="music-play-button is-large"
                    type="button"
                    :title="
                      isNowPlayingCurrentTrack && musicStore.isPlaying
                        ? t('暂停', 'Pause')
                        : t('播放', 'Play')
                    "
                    @click="toggleNowPlayingPlayback"
                  >
                    <i
                      :class="
                        isNowPlayingCurrentTrack && musicStore.isPlaying
                          ? 'fas fa-pause'
                          : 'fas fa-play'
                      "
                      aria-hidden="true"
                    ></i>
                  </button>
                  <button
                    v-if="isNowPlayingCurrentTrack"
                    type="button"
                    :title="t('停止播放', 'Stop playback')"
                    @click="musicStore.stop"
                  >
                    <i class="fas fa-stop" aria-hidden="true"></i>
                  </button>
                  <button
                    v-if="isNowPlayingCurrentTrack"
                    type="button"
                    :title="t('下一首', 'Next')"
                    @click="musicStore.next"
                  >
                    <i class="fas fa-forward-step" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
              <div class="music-now-playing-actions">
                <button
                  type="button"
                  data-testid="music-now-playing-favorite"
                  :aria-label="
                    musicStore.isFavorite(nowPlayingTrack.id)
                      ? t('取消喜爱', 'Remove from Favorites')
                      : t('加入喜爱', 'Add to Favorites')
                  "
                  :aria-pressed="musicStore.isFavorite(nowPlayingTrack.id)"
                  :title="
                    musicStore.isFavorite(nowPlayingTrack.id)
                      ? t('取消喜爱', 'Remove from Favorites')
                      : t('加入喜爱', 'Add to Favorites')
                  "
                  @click="toggleFavorite(nowPlayingTrack)"
                >
                  <i
                    :class="
                      musicStore.isFavorite(nowPlayingTrack.id) ? 'fas fa-heart' : 'far fa-heart'
                    "
                    aria-hidden="true"
                  ></i
                  ><span aria-live="polite">{{
                    musicStore.isFavorite(nowPlayingTrack.id)
                      ? t('已喜爱', 'Added')
                      : t('喜爱', 'Favorite')
                  }}</span>
                </button>
                <button
                  v-if="canLoadLyrics && isNowPlayingCurrentTrack"
                  type="button"
                  :title="t('歌词', 'Lyrics')"
                  data-testid="music-lyrics-open"
                  @click="openLyrics"
                >
                  <i class="fas fa-align-left" aria-hidden="true"></i
                  ><span>{{ t('歌词', 'Lyrics') }}</span>
                </button>
                <button
                  type="button"
                  :title="t('播放列表', 'Playlist')"
                  @click="openPlaylistPicker(nowPlayingTrack)"
                >
                  <i class="fas fa-list-ul" aria-hidden="true"></i
                  ><span>{{ t('播放列表', 'Playlist') }}</span>
                </button>
                <button
                  type="button"
                  :title="t('分享到聊天', 'Share to Chat')"
                  data-testid="music-share-chat"
                  @click="shareNowPlayingTrackToChat"
                >
                  <i class="fas fa-share-nodes" aria-hidden="true"></i
                  ><span>{{ t('聊天', 'Chat') }}</span>
                </button>
                <button
                  type="button"
                  :title="t('播放队列', 'Queue')"
                  data-testid="music-now-playing-queue"
                  @click="openQueueFromNowPlaying"
                >
                  <i class="fas fa-bars-staggered" aria-hidden="true"></i
                  ><span>{{ t('队列', 'Queue') }}</span>
                </button>
              </div>
              <dl class="music-track-details">
                <div>
                  <dt>{{ t('音乐源', 'Source') }}</dt>
                  <dd>{{ nowPlayingTrack.providerName }}</dd>
                </div>
                <div>
                  <dt>{{ t('类型', 'Genre') }}</dt>
                  <dd>{{ nowPlayingTrack.genre || '—' }}</dd>
                </div>
                <div>
                  <dt>{{ t('年份', 'Year') }}</dt>
                  <dd>{{ nowPlayingTrack.year || '—' }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </div>
    </transition>

    <transition name="music-drawer">
      <div
        v-if="lyricsOpen && playerTrack"
        class="music-overlay is-lyrics"
        @click.self="lyricsOpen = false"
      >
        <section class="music-lyrics-sheet" data-testid="music-lyrics-sheet">
          <header class="music-drawer-heading">
            <div>
              <span>{{ t('正在播放', 'NOW PLAYING') }}</span>
              <h2>{{ playerTrack.title }}</h2>
              <small>{{ playerTrack.artist }}</small>
            </div>
            <button
              class="music-icon-button"
              type="button"
              :title="t('关闭', 'Close')"
              @click="lyricsOpen = false"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </header>
          <div
            v-if="lyricTabs.length > 1"
            class="music-segmented is-lyrics-tabs"
            role="tablist"
            :aria-label="t('歌词版本', 'Lyric version')"
          >
            <button
              v-for="tab in lyricTabs"
              :key="tab.id"
              type="button"
              :class="{ 'is-active': lyricsMode === tab.id }"
              @click="lyricsMode = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="music-lyrics-content no-scrollbar">
            <p v-if="musicStore.lyricsState.status === 'loading'" class="music-empty-state">
              {{ t('正在读取歌词…', 'Loading lyrics...') }}
            </p>
            <p
              v-else-if="musicStore.lyricsState.status === 'error'"
              class="music-empty-state is-error"
            >
              {{ currentProviderState?.message || t('歌词暂时不可用', 'Lyrics are unavailable') }}
            </p>
            <p v-else-if="musicStore.lyricsState.status === 'empty'" class="music-empty-state">
              {{ t('这首歌暂无歌词', 'No lyrics for this song') }}
            </p>
            <pre v-else>{{ lyricBody }}</pre>
          </div>
        </section>
      </div>
    </transition>

    <transition name="music-drawer">
      <div v-if="playlistImportOpen" class="music-overlay" @click.self="playlistImportOpen = false">
        <section class="music-playlist-sheet is-import" data-testid="music-playlist-import-sheet">
          <div class="music-drawer-heading">
            <div>
              <span>{{ t('来自网易云音乐', 'FROM NETEASE') }}</span>
              <h2>{{ t('导入歌单', 'Import Playlist') }}</h2>
            </div>
            <button
              class="music-icon-button"
              type="button"
              :title="t('关闭', 'Close')"
              @click="playlistImportOpen = false"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
          <form class="music-import-form" @submit.prevent="submitPlaylistImport">
            <label
              >{{ t('歌单 ID', 'Playlist ID')
              }}<input
                v-model="playlistIdDraft"
                inputmode="numeric"
                autocomplete="off"
                placeholder="3778678"
                data-testid="music-playlist-id"
            /></label>
            <p v-if="musicStore.playlistImportState.status === 'error'" class="music-form-error">
              {{
                currentProviderState?.message ||
                t('无法导入这个歌单', 'This playlist could not be imported')
              }}
            </p>
            <button
              class="music-primary-button"
              type="submit"
              :disabled="
                !playlistIdDraft.trim() || musicStore.playlistImportState.status === 'loading'
              "
              data-testid="music-playlist-import-submit"
            >
              <i class="fas fa-cloud-arrow-down" aria-hidden="true"></i
              ><span>{{
                musicStore.playlistImportState.status === 'loading'
                  ? t('导入中…', 'Importing...')
                  : t('导入', 'Import')
              }}</span>
            </button>
          </form>
        </section>
      </div>
    </transition>

    <transition name="music-drawer">
      <div v-if="playlistSheetOpen" class="music-overlay" @click.self="playlistSheetOpen = false">
        <section class="music-playlist-sheet">
          <div class="music-drawer-heading">
            <div>
              <span>{{ playlistTargetTrack ? t('加入', 'ADD TO') : t('新建', 'CREATE') }}</span>
              <h2>{{ t('播放列表', 'Playlist') }}</h2>
            </div>
            <button
              class="music-icon-button"
              type="button"
              :title="t('关闭', 'Close')"
              @click="playlistSheetOpen = false"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
          <button
            v-for="playlist in musicStore.playlists"
            :key="playlist.id"
            type="button"
            class="music-playlist-choice"
            @click="addTargetTrackToPlaylist(playlist.id)"
          >
            <span class="music-playlist-choice-icon"
              ><i class="fas fa-music" aria-hidden="true"></i></span
            ><span
              ><strong>{{ playlist.name }}</strong
              ><small>{{
                t(`${playlist.trackIds.length} 首歌曲`, `${playlist.trackIds.length} songs`)
              }}</small></span
            ><i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
          <form class="music-create-playlist-form" @submit.prevent="createPlaylistAndAdd">
            <label
              >{{ t('新的播放列表', 'New Playlist')
              }}<input
                v-model="playlistNameDraft"
                maxlength="80"
                :placeholder="t('播放列表名称', 'Playlist name')" /></label
            ><button
              class="music-primary-button"
              type="submit"
              :disabled="!playlistNameDraft.trim()"
            >
              <i class="fas fa-plus" aria-hidden="true"></i><span>{{ t('创建', 'Create') }}</span>
            </button>
          </form>
        </section>
      </div>
    </transition>

    <transition name="music-settings">
      <div v-if="settingsOpen" class="music-settings-overlay" @click.self="closeSettings">
        <section class="music-settings-sheet" data-testid="music-settings">
          <header class="music-settings-header">
            <div>
              <span>{{ t('MUSIC', 'MUSIC') }}</span>
              <h2>{{ t('音乐设置', 'Music Settings') }}</h2>
            </div>
            <button
              class="music-icon-button"
              type="button"
              :title="t('关闭', 'Close')"
              @click="closeSettings"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </header>
          <div class="music-settings-body no-scrollbar">
            <aside class="music-provider-list">
              <button
                class="music-settings-add-entry"
                type="button"
                :class="{ 'is-active': settingsPanel === 'add' }"
                data-testid="music-settings-add-entry"
                @click="openAddMusic"
              >
                <span class="music-settings-entry-icon"
                  ><i class="fas fa-file-audio" aria-hidden="true"></i></span
                ><span
                  ><strong>{{ t('添加音乐', 'Add Music') }}</strong
                  ><small>{{ t('URL 或本地文件', 'URL or local files') }}</small></span
                >
              </button>
              <p class="music-settings-group-label">{{ t('音乐源', 'MUSIC SOURCES') }}</p>
              <button
                v-for="profile in musicStore.profiles"
                :key="profile.id"
                type="button"
                :class="{
                  'is-active': settingsPanel === 'sources' && providerDraft.id === profile.id,
                }"
                @click="selectProviderDraft(profile)"
              >
                <span
                  class="music-source-dot"
                  :class="{ 'is-online': profile.enabled && profile.baseUrl }"
                ></span
                ><span
                  ><strong>{{ profile.name }}</strong
                  ><small>{{
                    profile.adapterKind === MUSIC_ADAPTER_KINDS.CHKSZ
                      ? profile.platform
                      : isRadioBrowserMusicProviderProfile(profile)
                        ? t('直播电台', 'Live radio')
                        : formatProviderHost(profile.baseUrl)
                  }}</small></span
                >
              </button>
              <button
                class="music-add-source is-chksz"
                type="button"
                data-testid="music-add-chksz"
                @click="createChkszProviderDraft"
              >
                <i class="fas fa-wave-square" aria-hidden="true"></i><span>ChKSz</span>
              </button>
              <button
                class="music-add-source is-radio"
                type="button"
                data-testid="music-add-radio-browser"
                @click="createRadioBrowserProviderDraft"
              >
                <i class="fas fa-radio" aria-hidden="true"></i><span>Radio Browser</span>
              </button>
              <button
                class="music-add-source"
                type="button"
                data-testid="music-add-custom-source"
                @click="createNewProviderDraft"
              >
                <i class="fas fa-plus" aria-hidden="true"></i
                ><span>{{ t('自定义 JSON', 'Custom JSON') }}</span>
              </button>
            </aside>
            <div
              v-if="settingsPanel === 'add'"
              class="music-provider-form music-add-music-panel"
              data-testid="music-add-panel"
            >
              <section class="music-settings-section music-add-heading">
                <div class="music-settings-section-heading">
                  <div>
                    <span>{{ t('添加音乐', 'ADD MUSIC') }}</span>
                    <h3>
                      {{
                        addMusicMode === 'url'
                          ? t('通过 URL 添加', 'Add from URL')
                          : t('从本地导入', 'Import Local Files')
                      }}
                    </h3>
                  </div>
                  <span class="music-import-count">{{ importedTrackCount }}</span>
                </div>
                <div
                  class="music-add-segmented"
                  role="tablist"
                  :aria-label="t('添加方式', 'Add method')"
                >
                  <button
                    type="button"
                    role="tab"
                    :aria-selected="addMusicMode === 'url'"
                    :class="{ 'is-active': addMusicMode === 'url' }"
                    data-testid="music-add-url-tab"
                    @click="selectAddMusicMode('url')"
                  >
                    <i class="fas fa-link" aria-hidden="true"></i><span>URL</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    :aria-selected="addMusicMode === 'files'"
                    :class="{ 'is-active': addMusicMode === 'files' }"
                    data-testid="music-add-files-tab"
                    @click="selectAddMusicMode('files')"
                  >
                    <i class="fas fa-folder-open" aria-hidden="true"></i
                    ><span>{{ t('本地文件', 'Local Files') }}</span>
                  </button>
                </div>
              </section>

              <form
                v-if="addMusicMode === 'url'"
                class="music-settings-section music-url-import-form"
                data-testid="music-url-import-form"
                @submit.prevent="submitDirectUrl"
              >
                <div class="music-form-grid">
                  <label class="is-wide"
                    >{{ t('音频 URL', 'Audio URL')
                    }}<input
                      v-model="directUrlDraft.audioUrl"
                      type="url"
                      inputmode="url"
                      required
                      placeholder="https://media.example.com/song.mp3"
                      data-testid="music-direct-url"
                  /></label>
                  <label class="is-wide"
                    >{{ t('歌曲名称', 'Song Title')
                    }}<input
                      v-model="directUrlDraft.title"
                      maxlength="180"
                      required
                      :placeholder="t('歌曲名称', 'Song title')"
                      data-testid="music-direct-title"
                  /></label>
                  <label
                    >{{ t('艺人', 'Artist')
                    }}<input
                      v-model="directUrlDraft.artist"
                      maxlength="160"
                      :placeholder="t('未知艺人', 'Unknown Artist')"
                  /></label>
                  <label
                    >{{ t('专辑', 'Album')
                    }}<input
                      v-model="directUrlDraft.album"
                      maxlength="180"
                      :placeholder="t('未知专辑', 'Unknown Album')"
                  /></label>
                  <label class="is-wide"
                    >{{ t('封面 URL', 'Cover URL')
                    }}<input
                      v-model="directUrlDraft.coverUrl"
                      type="url"
                      inputmode="url"
                      placeholder="https://media.example.com/cover.jpg"
                  /></label>
                </div>
                <div class="music-add-submit-row">
                  <button
                    class="music-primary-button"
                    type="submit"
                    :disabled="addMusicState.status === 'loading'"
                    data-testid="music-direct-add"
                  >
                    <i class="fas fa-plus" aria-hidden="true"></i
                    ><span>{{
                      addMusicState.status === 'loading'
                        ? t('正在读取…', 'Reading...')
                        : t('添加歌曲', 'Add Song')
                    }}</span>
                  </button>
                </div>
              </form>

              <section
                v-else
                class="music-settings-section music-local-import"
                data-testid="music-local-import"
              >
                <label
                  class="music-file-picker-button"
                  :class="{ 'is-disabled': localFilesImporting }"
                >
                  <i
                    :class="localFilesImporting ? 'fas fa-spinner fa-spin' : 'fas fa-folder-open'"
                    aria-hidden="true"
                  ></i>
                  <span>{{
                    localFilesImporting
                      ? t('正在导入…', 'Importing...')
                      : t('选择音频文件', 'Choose Audio Files')
                  }}</span>
                  <input
                    ref="localFileInput"
                    class="music-native-file-input"
                    type="file"
                    accept="audio/*,.mp3,.m4a,.aac,.ogg,.oga,.wav,.flac"
                    multiple
                    :disabled="localFilesImporting"
                    data-testid="music-local-files"
                    @change="importLocalMusicFiles"
                  />
                </label>
                <div class="music-local-format-row">
                  <span>MP3</span><span>M4A</span><span>AAC</span><span>OGG</span><span>WAV</span
                  ><span>FLAC</span>
                </div>
              </section>

              <p
                v-if="addMusicState.message"
                class="music-add-status"
                :class="`is-${addMusicState.status}`"
                role="status"
              >
                <i
                  :class="
                    addMusicState.status === 'error'
                      ? 'fas fa-circle-exclamation'
                      : addMusicState.status === 'warning'
                        ? 'fas fa-triangle-exclamation'
                        : 'fas fa-circle-check'
                  "
                  aria-hidden="true"
                ></i
                >{{ addMusicState.message }}
              </p>

              <section class="music-settings-section music-imported-section">
                <div class="music-settings-section-heading">
                  <div>
                    <span>{{ t('已添加', 'IMPORTED MUSIC') }}</span>
                    <h3>{{ t('我的歌曲', 'My Songs') }}</h3>
                  </div>
                </div>
                <div
                  v-if="musicStore.importedTracks.length"
                  class="music-imported-list"
                  data-testid="music-imported-list"
                >
                  <div
                    v-for="track in musicStore.importedTracks"
                    :key="track.id"
                    class="music-imported-row"
                  >
                    <span class="music-imported-art" :style="coverStyle(track)"
                      ><i
                        v-if="!track.coverUrl"
                        :class="
                          track.sourceRef?.type === MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE
                            ? 'fas fa-file-audio'
                            : 'fas fa-link'
                        "
                        aria-hidden="true"
                      ></i
                    ></span>
                    <span class="music-imported-copy"
                      ><strong>{{ track.title }}</strong
                      ><small
                        >{{ track.artist
                        }}<template
                          v-if="
                            track.sourceRef?.type === MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE &&
                            track.sourceRef.size
                          "
                        >
                          · {{ formatFileSize(track.sourceRef.size) }}</template
                        ></small
                      ></span
                    >
                    <span class="music-imported-kind">{{
                      track.sourceRef?.type === MUSIC_TRACK_SOURCE_TYPES.LOCAL_FILE
                        ? t('本地', 'LOCAL')
                        : 'URL'
                    }}</span>
                    <button
                      class="music-icon-button is-imported-action"
                      type="button"
                      :title="t('播放', 'Play')"
                      @click="playTrack(track, musicStore.importedTracks)"
                    >
                      <i class="fas fa-play" aria-hidden="true"></i>
                    </button>
                    <button
                      class="music-icon-button is-imported-action is-remove"
                      type="button"
                      :title="t('移除', 'Remove')"
                      @click="removeImportedMusic(track)"
                    >
                      <i class="fas fa-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
                <div v-else class="music-imported-empty">
                  <i class="fas fa-music" aria-hidden="true"></i
                  ><span>{{ t('尚未添加歌曲', 'No imported songs') }}</span>
                </div>
              </section>
            </div>
            <div v-else class="music-provider-form">
              <section class="music-settings-section">
                <div class="music-settings-section-heading">
                  <div>
                    <span>{{ t('当前音乐源', 'CURRENT SOURCE') }}</span>
                    <h3>{{ providerDraft.name || t('新音乐源', 'New Music Source') }}</h3>
                  </div>
                  <span
                    class="music-provider-badge"
                    :class="`is-${currentProviderState?.status || 'idle'}`"
                    >{{ providerStatusCopy }}</span
                  >
                </div>
                <div v-if="isChkszDraft" class="music-form-grid">
                  <label
                    >{{ t('名称', 'Name')
                    }}<input
                      v-model="providerDraft.name"
                      maxlength="80"
                      placeholder="ChKSz Music"
                      data-testid="music-provider-name"
                  /></label>
                  <label
                    >{{ t('音乐平台', 'Platform')
                    }}<select v-model="providerDraft.platform" data-testid="music-chksz-platform">
                      <option :value="CHKSZ_MUSIC_PLATFORMS.NETEASE">
                        {{ t('网易云音乐', 'NetEase Music') }}
                      </option>
                      <option :value="CHKSZ_MUSIC_PLATFORMS.QQ">QQ Music</option>
                      <option :value="CHKSZ_MUSIC_PLATFORMS.KUGOU">
                        {{ t('酷狗音乐', 'Kugou Music') }}
                      </option>
                    </select></label
                  >
                  <label
                    >{{ t('播放音质', 'Playback Quality')
                    }}<select v-model="providerDraft.quality" data-testid="music-chksz-quality">
                      <option
                        v-for="quality in chkszQualityOptions"
                        :key="quality"
                        :value="quality"
                      >
                        {{ quality }}
                      </option>
                    </select></label
                  >
                  <div class="music-fixed-source">
                    <i class="fas fa-shield-halved" aria-hidden="true"></i
                    ><span
                      ><strong>api.chksz.com</strong
                      ><small>{{ t('官方安全连接', 'Secure service endpoint') }}</small></span
                    >
                  </div>
                </div>
                <div
                  v-else-if="isRadioBrowserDraft"
                  class="music-form-grid"
                  data-testid="music-radio-browser-form"
                >
                  <label
                    >{{ t('名称', 'Name')
                    }}<input
                      v-model="providerDraft.name"
                      maxlength="80"
                      placeholder="Radio Browser"
                      data-testid="music-provider-name"
                  /></label>
                  <div class="music-fixed-source is-radio">
                    <i class="fas fa-radio" aria-hidden="true"></i
                    ><span
                      ><strong>all.api.radio-browser.info</strong
                      ><small>{{
                        t('HTTPS · MP3 · 全球直播电台', 'HTTPS · MP3 · Global live radio')
                      }}</small></span
                    >
                  </div>
                </div>
                <div v-else class="music-form-grid">
                  <label
                    >{{ t('名称', 'Name')
                    }}<input
                      v-model="providerDraft.name"
                      maxlength="80"
                      :placeholder="t('我的音乐平台', 'My music service')"
                      data-testid="music-provider-name"
                  /></label>
                  <label class="is-wide"
                    >{{ t('接口地址', 'Endpoint URL')
                    }}<input
                      v-model="providerDraft.baseUrl"
                      inputmode="url"
                      placeholder="https://api.example.com"
                      data-testid="music-provider-url"
                  /></label>
                  <label
                    >{{ t('搜索路径', 'Search Path')
                    }}<input v-model="providerDraft.searchPath" placeholder="/search"
                  /></label>
                  <label
                    >{{ t('请求方式', 'Method')
                    }}<select v-model="providerDraft.method">
                      <option :value="MUSIC_PROVIDER_METHODS.GET">GET</option>
                      <option :value="MUSIC_PROVIDER_METHODS.POST">POST</option>
                    </select></label
                  >
                  <label
                    >{{ t('搜索参数', 'Query Parameter')
                    }}<input v-model="providerDraft.queryParam" placeholder="q"
                  /></label>
                  <label
                    >{{ t('数量参数', 'Limit Parameter')
                    }}<input v-model="providerDraft.limitParam" placeholder="limit"
                  /></label>
                  <label class="is-wide"
                    >{{ t('歌曲数组路径', 'Track Array Path')
                    }}<input v-model="providerDraft.resultPath" placeholder="data.tracks"
                  /></label>
                </div>
              </section>

              <section class="music-settings-section">
                <div class="music-settings-section-heading">
                  <div>
                    <span>{{ t('设备凭据', 'DEVICE CREDENTIAL') }}</span>
                    <h3>{{ t('访问认证', 'Authentication') }}</h3>
                  </div>
                  <i class="fas fa-lock" aria-hidden="true"></i>
                </div>
                <div v-if="isChkszDraft" class="music-form-grid">
                  <label class="is-wide"
                    >ChKSz API Key<input
                      v-model="providerCredentialDraft"
                      type="password"
                      autocomplete="off"
                      placeholder="chksz_••••••••"
                      data-testid="music-provider-key"
                  /></label>
                </div>
                <div
                  v-else-if="isRadioBrowserDraft"
                  class="music-fixed-source is-radio is-wide"
                  data-testid="music-radio-browser-no-key"
                >
                  <i class="fas fa-unlock-keyhole" aria-hidden="true"></i
                  ><span
                    ><strong>{{ t('无需 API Key', 'No API key required') }}</strong
                    ><small>{{
                      t(
                        '直接连接 Radio Browser 公共目录',
                        'Connects directly to the Radio Browser public directory',
                      )
                    }}</small></span
                  >
                </div>
                <div v-else class="music-form-grid">
                  <label
                    >{{ t('认证方式', 'Auth Type')
                    }}<select v-model="providerDraft.authMode">
                      <option :value="MUSIC_AUTH_MODES.NONE">{{ t('无需认证', 'None') }}</option>
                      <option :value="MUSIC_AUTH_MODES.BEARER">Bearer</option>
                      <option :value="MUSIC_AUTH_MODES.API_KEY">X-API-Key</option>
                      <option :value="MUSIC_AUTH_MODES.CUSTOM">
                        {{ t('自定义请求头', 'Custom Header') }}
                      </option>
                    </select></label
                  >
                  <label v-if="providerDraft.authMode === MUSIC_AUTH_MODES.CUSTOM"
                    >{{ t('请求头名称', 'Header Name')
                    }}<input v-model="providerDraft.authHeader" placeholder="X-API-Key"
                  /></label>
                  <label v-if="providerDraft.authMode === MUSIC_AUTH_MODES.CUSTOM"
                    >{{ t('值前缀', 'Value Prefix')
                    }}<input v-model="providerDraft.authPrefix" placeholder="Token "
                  /></label>
                  <label v-if="providerDraft.authMode !== MUSIC_AUTH_MODES.NONE" class="is-wide"
                    >{{ t('API 密钥', 'API Key')
                    }}<input
                      v-model="providerCredentialDraft"
                      type="password"
                      autocomplete="off"
                      :placeholder="t('保存在当前设备', 'Stored on this device')"
                      data-testid="music-provider-key"
                  /></label>
                </div>
                <p v-if="!isRadioBrowserDraft" class="music-field-note">
                  <i class="fas fa-shield-halved" aria-hidden="true"></i
                  >{{
                    t(
                      '密钥仅保存在当前设备，不会进入备份或分享内容。',
                      'The key stays on this device and is excluded from backups and sharing.',
                    )
                  }}
                </p>
                <p v-if="providerQuotaCopy" class="music-quota-line">
                  <i class="fas fa-gauge-high" aria-hidden="true"></i>{{ providerQuotaCopy }}
                </p>
                <p
                  v-if="currentProviderState?.status === 'error' && currentProviderState.message"
                  class="music-form-error"
                >
                  {{ currentProviderState.message }}
                </p>
              </section>

              <details v-if="!isChkszDraft && !isRadioBrowserDraft" class="music-advanced-settings">
                <summary>
                  <span
                    ><i class="fas fa-code" aria-hidden="true"></i
                    >{{ t('响应字段映射', 'Response Field Mapping') }}</span
                  ><i class="fas fa-chevron-down" aria-hidden="true"></i>
                </summary>
                <div class="music-form-grid is-mapping">
                  <label v-for="(_, key) in DEFAULT_MUSIC_FIELD_MAP" :key="key"
                    >{{ key
                    }}<input
                      v-model="providerDraft.fieldMap[key]"
                      :placeholder="DEFAULT_MUSIC_FIELD_MAP[key]"
                  /></label>
                  <label class="is-wide"
                    >{{ t('附加请求头（JSON）', 'Additional Headers (JSON)')
                    }}<textarea
                      v-model="providerHeadersDraft"
                      rows="4"
                      spellcheck="false"
                    ></textarea>
                  </label>
                </div>
              </details>

              <section class="music-settings-section is-integrations">
                <div class="music-settings-section-heading">
                  <div>
                    <span>{{ t('APP 联动', 'APP CONNECTIONS') }}</span>
                    <h3>{{ t('共享范围', 'Sharing') }}</h3>
                  </div>
                </div>
                <label class="music-toggle-row"
                  ><span class="music-toggle-icon is-chat"
                    ><i class="fas fa-comment" aria-hidden="true"></i></span
                  ><span
                    ><strong>Chat</strong
                    ><small>{{ t('允许分享歌曲卡片', 'Share track cards') }}</small></span
                  ><input
                    type="checkbox"
                    :checked="musicStore.state.integrationPolicy.chatShareEnabled"
                    @change="
                      musicStore.updateIntegrationPolicy({
                        chatShareEnabled: $event.target.checked,
                      })
                    " /><span class="music-switch" aria-hidden="true"></span
                ></label>
                <label class="music-toggle-row"
                  ><span class="music-toggle-icon is-map"
                    ><i class="fas fa-map-location-dot" aria-hidden="true"></i></span
                  ><span
                    ><strong>Map</strong
                    ><small>{{ t('允许显示正在播放', 'Show now playing') }}</small></span
                  ><input
                    type="checkbox"
                    :checked="musicStore.state.integrationPolicy.mapNowPlayingEnabled"
                    @change="
                      musicStore.updateIntegrationPolicy({
                        mapNowPlayingEnabled: $event.target.checked,
                      })
                    " /><span class="music-switch" aria-hidden="true"></span
                ></label>
              </section>

              <p v-if="providerFormError" class="music-form-error">{{ providerFormError }}</p>
              <div class="music-settings-actions">
                <button
                  v-if="musicStore.profiles.some((profile) => profile.id === providerDraft.id)"
                  class="music-danger-button"
                  type="button"
                  @click="deleteProvider"
                >
                  <i class="fas fa-trash" aria-hidden="true"></i
                  ><span>{{ t('移除', 'Remove') }}</span></button
                ><span></span
                ><button
                  class="music-secondary-button"
                  type="button"
                  :disabled="providerTesting"
                  data-testid="music-provider-test"
                  @click="testProvider"
                >
                  <i class="fas fa-plug-circle-check" aria-hidden="true"></i
                  ><span>{{
                    providerTesting ? t('测试中…', 'Testing...') : t('测试连接', 'Test Connection')
                  }}</span></button
                ><button
                  class="music-primary-button"
                  type="button"
                  :disabled="providerSaving"
                  data-testid="music-provider-save"
                  @click="saveProvider()"
                >
                  <i class="fas fa-check" aria-hidden="true"></i
                  ><span>{{ t('保存', 'Save') }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </transition>
  </main>
</template>

<style scoped>
.music-app {
  --music-bg: #eef0ed;
  --music-paper: #ffffff;
  --music-ink: #181a1d;
  --music-muted: #6f7478;
  --music-line: rgba(24, 26, 29, 0.1);
  --music-accent: #df3f5d;
  --music-accent-dark: #b72a47;
  --music-teal: #2d7b76;
  --music-gold: #c79332;
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: var(--music-ink);
  background: var(--music-bg);
  font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  color: inherit;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--music-accent);
  outline-offset: 2px;
}

.music-shell {
  display: grid;
  grid-template-columns: 226px minmax(0, 1fr);
  height: 100%;
  padding-top: 32px;
}

.music-sidebar {
  position: relative;
  z-index: 3;
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 22px 16px 24px;
  color: #f7f7f5;
  background: #151719;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.music-brand-block,
.music-mobile-brand,
.music-wordmark,
.music-topbar,
.music-topbar-actions,
.music-feature-actions,
.music-player-controls,
.music-player-progress,
.music-player-tools,
.music-drawer-heading,
.music-settings-header,
.music-settings-section-heading,
.music-settings-actions,
.music-now-playing-actions,
.music-now-playing-times,
.music-now-playing-controls {
  display: flex;
  align-items: center;
}

.music-brand-block {
  gap: 12px;
  padding: 0 3px 26px;
}

.music-wordmark {
  gap: 9px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 23px;
  font-weight: 700;
}

.music-wordmark-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  background: var(--music-accent);
}

.music-icon-button {
  display: inline-grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--music-ink);
  background: transparent;
  cursor: pointer;
}

.music-icon-button:hover {
  background: rgba(24, 26, 29, 0.07);
}

.music-icon-button.is-dark {
  color: #fff;
}

.music-icon-button.is-dark:hover {
  background: rgba(255, 255, 255, 0.1);
}

.music-nav-list {
  display: grid;
  gap: 8px;
}

.music-nav-item {
  position: relative;
  display: grid;
  grid-template-columns: 32px 1fr;
  min-height: 50px;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 7px;
  padding: 0 12px;
  color: rgba(255, 255, 255, 0.65);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.music-nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.055);
}

.music-nav-item.is-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.085);
}

.music-nav-item.is-active i {
  color: #fff;
  background: var(--music-accent);
}

.music-nav-item i {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  transition:
    color 140ms ease,
    background-color 140ms ease;
}

.music-nav-item.is-active::before {
  position: absolute;
  top: 13px;
  bottom: 13px;
  left: -16px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--music-accent);
  content: '';
}

.music-sidebar-footer {
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}

.music-sidebar-footer button {
  display: grid;
  width: 100%;
  min-height: 44px;
  grid-template-columns: 32px 1fr;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 7px;
  padding: 0 12px;
  color: rgba(255, 255, 255, 0.62);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.music-sidebar-footer button:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.055);
}

.music-source-status {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 14px 8px 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.music-source-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: #a3a6aa;
}

.music-source-dot.is-online {
  background: #62c48d;
  box-shadow: 0 0 0 4px rgba(98, 196, 141, 0.12);
}

.music-source-status div,
.music-source-status button {
  min-width: 0;
}

.music-source-status strong,
.music-source-status span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-source-status strong {
  font-size: 12px;
}

.music-source-status span {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 10px;
}

.music-source-status button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  background: transparent;
  cursor: pointer;
}

.music-content {
  position: relative;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.music-topbar {
  height: 72px;
  justify-content: space-between;
  gap: 18px;
  padding: 0 30px;
  background: rgba(238, 240, 237, 0.9);
  border-bottom: 1px solid var(--music-line);
  backdrop-filter: blur(18px) saturate(1.12);
}

.music-mobile-brand {
  display: none;
}

.music-topbar-title span,
.music-topbar-title small {
  display: block;
}

.music-topbar-title span {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 20px;
  font-weight: 700;
}

.music-topbar-title small {
  margin-top: 2px;
  color: var(--music-muted);
  font-size: 10px;
  text-transform: uppercase;
}

.music-topbar-actions {
  gap: 2px;
}

.music-search-trigger {
  display: flex;
  width: min(420px, 42vw);
  min-width: 180px;
  height: 42px;
  align-items: center;
  gap: 11px;
  margin-left: auto;
  border: 1px solid rgba(24, 26, 29, 0.07);
  border-radius: 8px;
  padding: 0 15px;
  color: var(--music-muted);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.88) inset;
  text-align: left;
  cursor: pointer;
  transition:
    color 140ms ease,
    border-color 140ms ease,
    background-color 140ms ease;
}

.music-search-trigger:hover,
.music-search-trigger.is-active {
  border-color: rgba(223, 63, 93, 0.24);
  color: var(--music-ink);
  background: #fff;
}

.music-search-trigger.is-active i {
  color: var(--music-accent);
}

.music-search-trigger span {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-scroll {
  height: calc(100% - 72px);
  overflow-y: auto;
  padding: 26px 32px 148px;
  scroll-behavior: smooth;
}

.music-integration-banner {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto 40px;
  align-items: center;
  gap: 12px;
  margin: 0 auto 24px;
  max-width: 980px;
  border: 1px solid rgba(45, 123, 118, 0.24);
  border-radius: 8px;
  padding: 10px 10px 10px 12px;
  background: rgba(255, 255, 255, 0.8);
}

.music-integration-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--music-teal);
}

.music-integration-banner strong,
.music-integration-banner span {
  display: block;
}

.music-integration-banner strong {
  font-size: 12px;
}

.music-integration-banner div > span {
  margin-top: 2px;
  color: var(--music-muted);
  font-size: 11px;
}

.music-integration-banner > button:not(.music-icon-button) {
  min-height: 36px;
  border: 0;
  border-radius: 6px;
  padding: 0 16px;
  color: #fff;
  background: var(--music-ink);
  cursor: pointer;
}

.music-feature {
  position: relative;
  display: grid;
  min-height: 330px;
  grid-template-columns: minmax(250px, 34%) minmax(0, 1fr);
  align-items: center;
  max-width: 1120px;
  margin: 0 auto;
  overflow: hidden;
  color: #fff;
  background: #191c1f;
  isolation: isolate;
  box-shadow: 0 24px 60px rgba(24, 26, 29, 0.2);
}

.music-feature::before,
.music-feature::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
}

.music-feature::before {
  z-index: -1;
  background: rgba(15, 17, 19, 0.66);
}

.music-feature::after {
  border: 1px solid rgba(255, 255, 255, 0.13);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
}

.music-feature-backdrop {
  position: absolute;
  z-index: -2;
  inset: -42px;
  opacity: 0.72;
  background-color: #30363a;
  background-position: center;
  background-size: cover;
  filter: blur(28px) saturate(1.06);
  transform: scale(1.1);
}

.music-feature-art {
  position: relative;
  z-index: 1;
  display: block;
  width: min(230px, calc(100% - 54px));
  aspect-ratio: 1;
  justify-self: center;
  overflow: visible;
  border: 0;
  border-radius: 8px;
  padding: 0;
  background-color: #3c4c50;
  background-size: cover;
  background-position: center;
  cursor: pointer;
}

.music-feature-art::after {
  position: absolute;
  z-index: 4;
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  content: '';
  pointer-events: none;
}

.music-feature-art img,
.music-album-cover img,
.music-track-cover img,
.music-player-cover img,
.music-now-playing-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.music-vinyl-groove {
  position: absolute;
  top: 50%;
  right: -50px;
  z-index: 1;
  width: 204px;
  height: 204px;
  border: 44px double rgba(12, 13, 15, 0.94);
  border-radius: 50%;
  background: #161719;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.34);
  transform: translateY(-50%);
}

.music-feature-art img {
  position: relative;
  z-index: 3;
  border-radius: 8px;
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.38);
}

.music-feature-copy {
  position: relative;
  z-index: 2;
  align-self: center;
  max-width: 620px;
  padding: 46px 54px 46px 40px;
}

.music-kicker,
.music-section-heading span,
.music-drawer-heading span,
.music-settings-header span,
.music-settings-section-heading > div > span,
.music-now-playing-copy > span {
  color: var(--music-accent);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.music-feature h1,
.music-page-intro h1 {
  margin: 10px 0 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 46px;
  line-height: 1.02;
  letter-spacing: 0;
}

.music-feature-artist {
  margin: 13px 0 0;
  font-size: 17px;
}

.music-feature-note {
  margin: 7px 0 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
}

.music-feature-actions {
  gap: 10px;
  margin-top: 24px;
}

.music-primary-button,
.music-secondary-button,
.music-danger-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 6px;
  padding: 0 18px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.music-primary-button {
  border: 1px solid var(--music-accent);
  color: #fff;
  background: var(--music-accent);
}

.music-primary-button:hover {
  border-color: var(--music-accent-dark);
  background: var(--music-accent-dark);
}

.music-secondary-button {
  border: 1px solid rgba(24, 26, 29, 0.18);
  color: var(--music-ink);
  background: #fff;
}

.music-feature .music-secondary-button {
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.music-primary-button:disabled,
.music-secondary-button:disabled {
  cursor: default;
  opacity: 0.45;
}

.music-section-block,
.music-page-intro,
.music-search-page,
.music-track-list,
.music-album-grid,
.music-playlist-layout {
  width: 100%;
  max-width: 1120px;
  margin-right: auto;
  margin-left: auto;
}

.music-listen-layout {
  display: grid;
  width: 100%;
  max-width: 1120px;
  grid-template-areas:
    'feature feature'
    'shortcuts shortcuts'
    'albums recent';
  grid-template-columns: minmax(0, 2.1fr) minmax(268px, 0.78fr);
  gap: 34px 26px;
  margin: 0 auto;
}

.music-listen-layout .music-feature {
  grid-area: feature;
  width: 100%;
  max-width: none;
  margin: 0;
}

.music-album-section {
  grid-area: albums;
}

.music-discovery-shortcuts {
  display: grid;
  grid-area: shortcuts;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 2px 0 0;
}

.music-discovery-shortcuts > button {
  display: grid;
  min-width: 0;
  min-height: 72px;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(24, 26, 29, 0.06);
  border-radius: 7px;
  padding: 9px 13px 9px 9px;
  color: var(--music-ink);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    transform 100ms ease;
}

.music-discovery-shortcuts > button:hover {
  border-color: rgba(24, 26, 29, 0.11);
  background: #fff;
}

.music-discovery-shortcuts > button:active {
  transform: scale(0.98);
}

.music-shortcut-icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  font-size: 17px;
}

.music-shortcut-icon.is-favorite {
  background: #df3f5d;
}

.music-shortcut-icon.is-recent {
  background: #367a76;
}

.music-shortcut-icon.is-playlist {
  background: #7b5fa5;
}

.music-shortcut-icon.is-album {
  background: #ba7a2f;
}

.music-discovery-shortcuts strong,
.music-discovery-shortcuts small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-discovery-shortcuts strong {
  font-size: 12px;
}

.music-discovery-shortcuts small {
  color: var(--music-muted);
  font-size: 11px;
}

.music-recent-section {
  grid-area: recent;
  align-self: stretch;
  overflow: hidden;
  border: 1px solid rgba(24, 26, 29, 0.07);
  border-radius: 7px;
  padding: 18px 16px 12px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
}

.music-section-block {
  margin-top: 38px;
}

.music-listen-layout .music-section-block {
  width: auto;
  max-width: none;
  margin: 0;
}

.music-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.music-section-heading h2,
.music-drawer-heading h2,
.music-settings-header h2,
.music-settings-section-heading h3 {
  margin: 4px 0 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 25px;
  line-height: 1.1;
}

.music-section-heading > button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 6px;
  padding: 0 10px;
  color: var(--music-accent);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    color 140ms ease,
    background-color 140ms ease,
    transform 100ms ease;
}

.music-section-heading > button:hover {
  color: var(--music-accent-dark);
  background: rgba(218, 63, 86, 0.07);
}

.music-section-heading > button:active {
  transform: scale(0.97);
}

.music-section-heading > button.is-danger {
  color: #b42336;
}

.music-album-rail {
  display: grid;
  grid-auto-columns: minmax(146px, 1fr);
  grid-auto-flow: column;
  gap: 18px;
  overflow-x: auto;
  padding: 2px 18px 8px 2px;
  overscroll-behavior-inline: contain;
  scroll-padding-inline: 2px;
  scroll-snap-type: inline proximity;
}

.music-album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 24px 20px;
  margin-top: 28px;
}

.music-album-item {
  position: relative;
  min-width: 0;
  container-type: inline-size;
  scroll-snap-align: start;
}

.music-album-open {
  display: block;
  width: 100%;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.music-album-cover {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 4px;
  background-color: #d9dcda;
  background-size: cover;
  background-position: center;
  box-shadow: 0 10px 24px rgba(24, 26, 29, 0.12);
}

.music-album-cover img {
  transition: transform 180ms ease;
}

.music-album-item:hover .music-album-cover img {
  transform: scale(1.025);
}

.music-album-play {
  position: absolute;
  right: 10px;
  top: calc(100cqw - 50px);
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: var(--music-accent);
  box-shadow: 0 7px 18px rgba(24, 26, 29, 0.28);
  opacity: 0;
  transform: translateY(5px);
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.music-album-item:hover .music-album-play,
.music-album-open:focus-visible + .music-album-play,
.music-album-play:focus-visible,
.music-album-item.is-current .music-album-play {
  opacity: 1;
  transform: translateY(0);
}

.music-album-item.is-current .music-album-cover {
  box-shadow:
    0 0 0 2px var(--music-accent),
    0 12px 28px rgba(24, 26, 29, 0.18);
}

.music-album-item.is-current .music-album-open > strong {
  color: var(--music-accent);
}

.music-album-open > strong,
.music-album-open > span:not(.music-album-cover),
.music-album-open > small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-album-open > strong {
  margin-top: 11px;
  font-size: 13px;
}

.music-album-open > span:not(.music-album-cover),
.music-album-open > small {
  margin-top: 3px;
  color: var(--music-muted);
  font-size: 11px;
}

.music-track-list {
  border-top: 1px solid var(--music-line);
}

.music-track-row {
  display: grid;
  grid-template-columns: 34px minmax(260px, 1fr) 52px 36px 36px;
  min-height: 64px;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--music-line);
  transition: background-color 140ms ease;
}

.music-track-row:hover {
  background: rgba(255, 255, 255, 0.54);
}

.music-track-row.is-current {
  color: var(--music-accent);
}

.music-track-row.is-unplayable {
  opacity: 0.62;
}

.music-track-index,
.music-track-action {
  display: grid;
  border: 0;
  place-items: center;
  color: var(--music-muted);
  background: transparent;
  cursor: pointer;
}

.music-track-info {
  display: grid;
  min-width: 0;
  grid-template-columns: 44px minmax(150px, 1.4fr) minmax(110px, 1fr);
  align-items: center;
  gap: 12px;
  align-self: stretch;
  border: 0;
  padding: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.music-track-index {
  width: 34px;
  height: 40px;
  font-size: 10px;
}

.music-track-index i {
  display: none;
}

.music-track-row:hover .music-track-index:not(:disabled) span {
  display: none;
}

.music-track-row:hover .music-track-index:not(:disabled) i,
.music-track-row.is-current .music-track-index:not(:disabled) i {
  display: inline;
}

.music-track-row.is-current .music-track-index span {
  display: none;
}

.music-track-index:disabled {
  cursor: default;
}

.music-track-action {
  width: 36px;
  height: 40px;
}

.music-track-action:hover {
  color: var(--music-accent);
}

.music-track-cover {
  display: block;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border-radius: 4px;
  background-color: #d7dbda;
  background-size: cover;
  background-position: center;
}

.music-track-meta,
.music-player-meta {
  min-width: 0;
}

.music-track-meta strong,
.music-track-meta span,
.music-player-meta strong,
.music-player-meta span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-track-meta strong {
  font-size: 12px;
}

.music-track-meta span,
.music-track-album,
.music-track-duration {
  color: var(--music-muted);
  font-size: 10px;
}

.music-track-meta span {
  margin-top: 3px;
}

.music-recent-section .music-section-heading {
  align-items: center;
  margin: 0 2px 8px;
}

.music-recent-section .music-section-heading h2 {
  font-size: 20px;
}

.music-recent-section .music-section-action {
  width: 38px;
  min-width: 38px;
  padding: 0;
}

.music-recent-section .music-section-action span {
  display: none;
}

.music-recent-section .music-track-list {
  border-top: 0;
}

.music-recent-section .music-track-row {
  min-height: 60px;
  grid-template-columns: 28px minmax(0, 1fr) 36px;
  gap: 8px;
}

.music-recent-section .music-track-info {
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 8px;
}

.music-recent-section .music-track-cover {
  width: 40px;
  height: 40px;
}

.music-recent-section .music-track-info .music-track-album,
.music-recent-section .music-track-duration,
.music-recent-section .music-track-action:last-child {
  display: none;
}

.music-track-album {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-page-intro {
  padding: 24px 0 6px;
}

.music-page-intro h1 {
  color: var(--music-ink);
}

.music-page-intro.is-library {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.music-catalog-hero,
.music-library-hero {
  position: relative;
  width: 100%;
  max-width: 1120px;
  min-height: 250px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  background: #1c2023;
  box-shadow: 0 22px 52px rgba(24, 26, 29, 0.16);
}

.music-catalog-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  align-items: center;
  padding: 38px 48px;
}

.music-catalog-copy {
  position: relative;
  z-index: 2;
}

.music-catalog-copy h1,
.music-library-hero-copy h1 {
  margin: 8px 0 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 44px;
  line-height: 1;
}

.music-catalog-copy p,
.music-library-hero-copy p {
  margin: 10px 0 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
}

.music-catalog-copy .music-primary-button,
.music-library-hero-copy .music-primary-button {
  margin-top: 24px;
}

.music-catalog-stack {
  position: relative;
  height: 180px;
}

.music-catalog-stack span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 166px;
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 7px;
  background-color: #34383b;
  background-position: center;
  background-size: cover;
  box-shadow: 0 22px 40px rgba(0, 0, 0, 0.32);
}

.music-catalog-stack .is-1 {
  z-index: 3;
  transform: translate(-50%, -50%) rotate(-2deg);
}

.music-catalog-stack .is-2 {
  z-index: 2;
  transform: translate(-10%, -46%) rotate(8deg);
}

.music-catalog-stack .is-3 {
  z-index: 1;
  transform: translate(-88%, -43%) rotate(-10deg);
}

.music-library-hero {
  display: grid;
  grid-template-columns: 190px minmax(260px, 1fr) minmax(290px, 0.84fr);
  align-items: center;
  gap: 34px;
  padding: 34px 42px;
}

.music-library-mosaic {
  display: grid;
  width: 176px;
  aspect-ratio: 1;
  grid-template-columns: repeat(2, 1fr);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: #303539;
  box-shadow: 0 20px 42px rgba(0, 0, 0, 0.32);
}

.music-library-mosaic span {
  background-color: #34393d;
  background-position: center;
  background-size: cover;
}

.music-library-mosaic i {
  display: grid;
  grid-column: 1 / -1;
  place-items: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 36px;
}

.music-library-glance {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-self: stretch;
  gap: 8px;
}

.music-library-stat {
  display: grid;
  min-width: 0;
  place-items: center;
  align-content: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 7px;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.055);
}

.music-library-glance i {
  color: #ff7990;
  font-size: 15px;
}

.music-library-stat:nth-child(2) i {
  color: #70bcb5;
}

.music-library-stat:nth-child(3) i {
  color: #c5a1ec;
}

.music-library-glance strong {
  color: #fff;
  font-size: 20px;
}

.music-library-glance span {
  max-width: 100%;
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-segmented {
  display: inline-flex;
  gap: 2px;
  margin: 24px 0;
  border-bottom: 1px solid var(--music-line);
}

.music-segmented button {
  position: relative;
  min-height: 42px;
  border: 0;
  padding: 0 16px;
  color: var(--music-muted);
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}

.music-segmented button.is-active {
  color: var(--music-ink);
  font-weight: 700;
}

.music-segmented button.is-active::after {
  position: absolute;
  right: 12px;
  bottom: -1px;
  left: 12px;
  height: 2px;
  background: var(--music-accent);
  content: '';
}

.music-playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(142px, 1fr));
  gap: 18px;
}

.music-playlist-create,
.music-playlist-tile {
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.music-playlist-create {
  display: grid;
  min-height: 142px;
  place-items: center;
  align-content: center;
  gap: 12px;
  border: 1px dashed rgba(24, 26, 29, 0.28);
  border-radius: 4px;
  color: var(--music-muted);
}

.music-playlist-create i {
  font-size: 22px;
}

.music-playlist-create.is-import {
  color: var(--music-teal);
  border-color: rgba(45, 123, 118, 0.38);
  background: rgba(45, 123, 118, 0.04);
}

.music-playlist-mosaic {
  position: relative;
  display: grid;
  width: 100%;
  aspect-ratio: 1;
  grid-template-columns: repeat(2, 1fr);
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 4px;
  background: #d8dcda;
}

.music-playlist-tile.is-active .music-playlist-mosaic {
  border-color: var(--music-accent);
}

.music-playlist-mosaic span {
  background-size: cover;
  background-position: center;
}

.music-playlist-mosaic > i {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(24, 26, 29, 0.35);
  font-size: 32px;
}

.music-playlist-tile > strong,
.music-playlist-tile > span:not(.music-playlist-mosaic) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-playlist-tile > strong {
  margin-top: 9px;
  font-size: 12px;
}

.music-playlist-tile > span:not(.music-playlist-mosaic) {
  margin-top: 3px;
  color: var(--music-muted);
  font-size: 10px;
}

.music-playlist-detail {
  margin-top: 34px;
}

.music-empty-state,
.music-search-state {
  margin: 28px 0;
  color: var(--music-muted);
  font-size: 12px;
  text-align: center;
}

.music-search-page {
  padding-top: 36px;
}

.music-search-form {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 40px auto;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  border-bottom: 2px solid var(--music-ink);
  padding: 4px 0 10px;
}

.music-search-form > i {
  color: var(--music-accent);
}

.music-search-form input {
  min-width: 0;
  border: 0;
  padding: 8px 0;
  color: var(--music-ink);
  background: transparent;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 30px !important;
}

.music-search-form input:focus {
  outline: 0;
}

.music-search-form > button:not(.music-search-submit) {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.music-search-submit {
  min-height: 40px;
  border: 0;
  border-radius: 6px;
  padding: 0 18px;
  color: #fff;
  background: var(--music-ink);
  cursor: pointer;
}

.music-search-source {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 14px;
  color: var(--music-muted);
  font-size: 11px;
}

.music-search-source button {
  margin-left: auto;
  border: 0;
  color: var(--music-accent);
  background: transparent;
  font-weight: 700;
  cursor: pointer;
}

.music-player {
  position: absolute;
  right: 18px;
  bottom: 18px;
  left: 232px;
  z-index: 18;
  display: grid;
  grid-template-columns: minmax(180px, 0.9fr) minmax(280px, 1.35fr) minmax(150px, 0.8fr);
  min-height: 94px;
  align-items: center;
  gap: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 18px 11px 12px;
  color: #f6f6f4;
  background: rgba(25, 27, 30, 0.96);
  box-shadow: 0 18px 45px rgba(15, 17, 19, 0.28);
  backdrop-filter: blur(18px);
}

.music-player-track {
  display: grid;
  min-width: 0;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  border: 0;
  padding: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.music-player-cover {
  display: block;
  width: 58px;
  height: 58px;
  overflow: hidden;
  border-radius: 5px;
  background-color: #4a4d50;
  background-size: cover;
  background-position: center;
}

.music-player-meta strong {
  font-size: 12px;
}

.music-player-meta span {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.54);
  font-size: 10px;
}

.music-player-center {
  min-width: 0;
}

.music-player-controls {
  justify-content: center;
  gap: 8px;
}

.music-player-controls button,
.music-player-tools button,
.music-now-playing-controls button {
  position: relative;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.68);
  background: transparent;
  cursor: pointer;
}

.music-player-controls button:hover,
.music-player-tools button:hover,
.music-player-controls button.is-active {
  color: #fff;
}

.music-player-controls button small {
  position: absolute;
  right: 2px;
  bottom: 2px;
  font-size: 8px;
}

.music-play-button {
  color: #1b1d20 !important;
  background: #fff !important;
}

.music-player-progress {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  gap: 8px;
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.44);
  font-size: 8px;
}

.music-player-progress span:last-child {
  text-align: right;
}

input[type='range'] {
  height: 22px;
  accent-color: var(--music-accent);
}

.music-player-tools {
  justify-content: flex-end;
  gap: 4px;
}

.music-player-tools input {
  width: min(90px, 42%);
}

.music-player-error {
  position: absolute;
  right: 16px;
  bottom: 3px;
  margin: 0;
  color: #ff8a98;
  font-size: 8px;
}

.music-overlay,
.music-settings-overlay {
  position: absolute;
  inset: 32px 0 0;
  z-index: 60;
  background: rgba(16, 18, 20, 0.52);
  backdrop-filter: blur(8px);
}

.music-queue-drawer,
.music-playlist-sheet {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 100%);
  padding: 28px 24px 32px;
  background: var(--music-paper);
  box-shadow: -20px 0 60px rgba(16, 18, 20, 0.2);
}

.music-drawer-heading,
.music-settings-header {
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--music-line);
}

.music-queue-list {
  height: calc(100% - 76px);
  overflow-y: auto;
  padding-top: 12px;
}

.music-queue-row {
  display: grid;
  width: 100%;
  grid-template-columns: 44px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 12px;
  border: 0;
  border-bottom: 1px solid var(--music-line);
  padding: 10px 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.music-queue-row.is-current {
  color: var(--music-accent);
}

.music-queue-row strong,
.music-queue-row small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-queue-row strong {
  font-size: 12px;
}

.music-queue-row small,
.music-queue-row em {
  margin-top: 3px;
  color: var(--music-muted);
  font-size: 9px;
  font-style: normal;
}

.music-playlist-sheet {
  top: auto;
  left: 50%;
  bottom: 24px;
  width: min(520px, calc(100% - 32px));
  max-height: min(620px, calc(100% - 48px));
  overflow-y: auto;
  border-radius: 8px;
  transform: translateX(-50%);
}

.music-playlist-sheet.is-import {
  width: min(460px, calc(100% - 32px));
}

.music-import-form {
  display: grid;
  gap: 18px;
  padding-top: 24px;
}

.music-import-form label {
  display: grid;
  gap: 8px;
  color: var(--music-muted);
  font-size: 10px;
  font-weight: 700;
}

.music-import-form input {
  width: 100%;
  border: 1px solid rgba(24, 26, 29, 0.16);
  border-radius: 5px;
  padding: 12px;
  color: var(--music-ink);
  background: #fff;
  font-size: 16px !important;
}

.music-import-form .music-primary-button {
  justify-self: end;
}

.music-playlist-choice {
  display: grid;
  width: 100%;
  grid-template-columns: 42px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 12px;
  border: 0;
  border-bottom: 1px solid var(--music-line);
  padding: 12px 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.music-playlist-choice-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 6px;
  color: #fff;
  background: var(--music-teal);
}

.music-playlist-choice strong,
.music-playlist-choice small {
  display: block;
}

.music-playlist-choice strong {
  font-size: 12px;
}

.music-playlist-choice small {
  margin-top: 3px;
  color: var(--music-muted);
  font-size: 9px;
}

.music-create-playlist-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 12px;
  margin-top: 22px;
}

.music-create-playlist-form label,
.music-form-grid label {
  display: grid;
  gap: 7px;
  color: var(--music-muted);
  font-size: 10px;
  font-weight: 700;
}

.music-create-playlist-form input,
.music-form-grid input,
.music-form-grid select,
.music-form-grid textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(24, 26, 29, 0.16);
  border-radius: 5px;
  padding: 10px 11px;
  color: var(--music-ink);
  background: #fff;
  font-size: 13px !important;
}

.music-overlay.is-now-playing {
  background: rgba(10, 12, 14, 0.7);
  backdrop-filter: blur(18px) saturate(0.8);
}

.music-now-playing-sheet {
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 50%;
  isolation: isolate;
  width: min(1040px, calc(100% - 36px));
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #f7f7f5;
  background: #15181b;
  box-shadow: 0 32px 90px rgba(5, 7, 9, 0.5);
  transform: translateX(-50%);
}

.music-now-playing-sheet::after {
  position: absolute;
  z-index: -1;
  inset: 0;
  background: linear-gradient(105deg, rgba(17, 20, 23, 0.66), rgba(17, 20, 23, 0.96) 58%);
  content: '';
}

.music-now-playing-ambient {
  position: absolute;
  z-index: -2;
  inset: -18%;
  opacity: 0.42;
  background-position: center;
  background-size: cover;
  filter: blur(58px) saturate(1.3);
  transform: scale(1.12);
}

.music-icon-button.is-sheet-close {
  position: absolute;
  z-index: 3;
  top: 18px;
  right: 18px;
  margin: 0;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
}

.music-icon-button.is-sheet-close:hover {
  background: rgba(255, 255, 255, 0.14);
}

.music-now-playing-layout {
  position: relative;
  z-index: 1;
  display: grid;
  height: 100%;
  grid-template-columns: minmax(320px, 0.94fr) minmax(420px, 1.06fr);
}

.music-now-playing-visual {
  display: grid;
  min-width: 0;
  place-items: center;
  padding: 64px 42px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.025);
}

.music-now-playing-art {
  position: relative;
  width: min(100%, 400px);
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background-color: #414548;
  background-size: cover;
  background-position: center;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.42);
}

.music-now-playing-stage {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  overflow-y: auto;
  padding: 64px 56px 44px;
}

.music-now-playing-copy {
  text-align: left;
}

.music-now-playing-copy h2 {
  margin: 9px 0 0;
  overflow-wrap: anywhere;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 40px;
  line-height: 1.08;
}

.music-now-playing-copy p {
  margin: 10px 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 13px;
}

.music-now-playing-playback {
  min-height: 136px;
  margin-top: 30px;
}

.music-now-playing-range {
  width: 100%;
  margin: 0;
}

.music-now-playing-times {
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.44);
  font-size: 9px;
}

.music-now-playing-controls {
  justify-content: flex-start;
  gap: 18px;
  margin-top: 16px;
}

.music-now-playing-controls .is-large {
  width: 62px;
  height: 62px;
  font-size: 19px;
}

.music-now-playing-actions {
  display: flex;
  width: min(100%, 320px);
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 10px;
  margin-top: 8px;
}

.music-track-inspection-note {
  margin: 0 0 18px;
  color: rgba(255, 255, 255, 0.58);
  font-size: 10px;
  text-align: left;
}

.music-now-playing-actions button {
  display: grid;
  width: 56px;
  min-width: 0;
  min-height: 66px;
  grid-template-rows: 42px auto;
  place-items: center;
  gap: 6px;
  border: 0;
  border-radius: 0;
  color: rgba(255, 255, 255, 0.72);
  background: transparent;
  font-size: 9px;
  cursor: pointer;
}

.music-now-playing-actions button i {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  transition:
    border-color 160ms ease,
    color 160ms ease,
    background 160ms ease,
    transform 160ms ease;
}

.music-now-playing-actions button:hover i,
.music-now-playing-actions button:focus-visible i {
  border-color: rgba(255, 255, 255, 0.26);
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.music-now-playing-actions button[aria-pressed='true'] {
  color: #ffd9e2;
}

.music-now-playing-actions button[aria-pressed='true'] i {
  border-color: #ff7898;
  color: #fff;
  background: #e84269;
  box-shadow: 0 6px 18px rgba(232, 66, 105, 0.32);
}

.music-now-playing-actions button:active i {
  transform: scale(0.92);
}

.music-lyrics-sheet {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: grid;
  width: min(520px, 100%);
  grid-template-rows: auto auto minmax(0, 1fr);
  padding: 30px 34px 34px;
  color: #f7f7f5;
  background: #1b1d20;
  box-shadow: -24px 0 64px rgba(12, 14, 15, 0.34);
}

.music-lyrics-sheet .music-drawer-heading {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.music-lyrics-sheet .music-drawer-heading small {
  display: block;
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
}

.music-lyrics-sheet .music-icon-button {
  color: #fff;
}

.music-segmented.is-lyrics-tabs {
  width: fit-content;
  margin-top: 18px;
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.music-segmented.is-lyrics-tabs button {
  color: rgba(255, 255, 255, 0.5);
}

.music-segmented.is-lyrics-tabs button.is-active {
  color: #fff;
}

.music-lyrics-content {
  overflow-y: auto;
  padding: 34px 2px 24px;
}

.music-lyrics-content pre {
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font:
    500 17px/2 'Avenir Next',
    'Trebuchet MS',
    sans-serif;
  text-align: center;
  white-space: pre-wrap;
}

.music-lyrics-content .music-empty-state {
  color: rgba(255, 255, 255, 0.5);
}

.music-lyrics-content .music-empty-state.is-error {
  color: #ff9aaa;
}

.music-track-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 28px 0 0;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.music-track-details div {
  min-width: 0;
}

.music-track-details dt {
  color: rgba(255, 255, 255, 0.42);
  font-size: 9px;
  text-transform: uppercase;
}

.music-track-details dd {
  margin: 4px 0 0;
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-settings-overlay {
  display: grid;
  place-items: center;
  padding: 20px;
}

.music-settings-sheet {
  width: min(920px, 100%);
  height: min(760px, 100%);
  overflow: hidden;
  border-radius: 8px;
  background: var(--music-paper);
  box-shadow: 0 30px 80px rgba(14, 16, 18, 0.34);
}

.music-settings-header {
  height: 78px;
  padding: 0 22px 0 26px;
}

.music-settings-body {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  height: calc(100% - 78px);
  overflow: hidden;
}

.music-provider-list {
  overflow-y: auto;
  padding: 18px 12px;
  background: #f0f1ee;
  border-right: 1px solid var(--music-line);
}

.music-provider-list button {
  display: grid;
  width: 100%;
  min-height: 56px;
  grid-template-columns: 10px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 6px;
  padding: 8px 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.music-provider-list button.is-active {
  background: #fff;
  box-shadow: 0 3px 12px rgba(24, 26, 29, 0.06);
}

.music-provider-list button.music-settings-add-entry {
  grid-template-columns: 34px minmax(0, 1fr);
  margin-bottom: 18px;
}

.music-settings-entry-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 6px;
  color: #fff;
  background: var(--music-accent);
}

.music-settings-group-label {
  margin: 0;
  padding: 0 10px 8px;
  color: var(--music-muted);
  font-size: 8px;
  font-weight: 800;
}

.music-provider-list strong,
.music-provider-list small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-provider-list strong {
  font-size: 11px;
}

.music-provider-list small {
  margin-top: 3px;
  color: var(--music-muted);
  font-size: 8px;
}

.music-provider-list button.music-add-source {
  grid-template-columns: 22px 1fr;
  margin-top: 8px;
  color: var(--music-accent);
  border: 1px dashed rgba(218, 63, 86, 0.34);
}

.music-provider-list button.music-add-source.is-chksz {
  color: var(--music-teal);
  border-color: rgba(45, 123, 118, 0.34);
}

.music-provider-list button.music-add-source.is-radio {
  color: var(--music-gold);
  border-color: rgba(199, 147, 50, 0.38);
}

.music-provider-form {
  overflow-y: auto;
  padding: 8px 28px 28px;
}

.music-add-music-panel {
  padding-top: 0;
}

.music-add-heading {
  padding-top: 20px;
}

.music-import-count {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border-radius: 50%;
  color: var(--music-accent-dark);
  background: rgba(218, 63, 86, 0.1);
  font-size: 10px;
  font-weight: 800;
}

.music-add-segmented {
  display: grid;
  width: min(340px, 100%);
  height: 42px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 3px;
  border: 1px solid rgba(24, 26, 29, 0.12);
  border-radius: 6px;
  padding: 3px;
  background: #eef0ed;
}

.music-add-segmented button {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 4px;
  color: var(--music-muted);
  background: transparent;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.music-add-segmented button.is-active {
  color: var(--music-ink);
  background: #fff;
  box-shadow: 0 2px 8px rgba(24, 26, 29, 0.08);
}

.music-url-import-form {
  margin: 0;
}

.music-add-submit-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.music-local-import {
  display: grid;
  place-items: center;
  gap: 16px;
  min-height: 190px;
}

.music-file-picker-button {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid var(--music-accent);
  border-radius: 6px;
  padding: 0 22px;
  color: #fff;
  background: var(--music-accent);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.music-file-picker-button.is-disabled {
  cursor: default;
  opacity: 0.55;
}

.music-native-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.music-local-format-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  color: var(--music-muted);
  font-size: 8px;
  font-weight: 800;
}

.music-add-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0 0;
  color: #246948;
  font-size: 10px;
  font-weight: 700;
}

.music-add-status.is-error {
  color: #a52639;
}

.music-add-status.is-warning {
  color: #825c17;
}

.music-imported-section {
  border-bottom: 0;
}

.music-imported-list {
  border-top: 1px solid var(--music-line);
}

.music-imported-row {
  display: grid;
  min-height: 62px;
  grid-template-columns: 42px minmax(0, 1fr) auto 36px 36px;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--music-line);
}

.music-imported-art {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 4px;
  color: #fff;
  background-color: #30343a;
  background-position: center;
  background-size: cover;
}

.music-imported-copy {
  min-width: 0;
}

.music-imported-copy strong,
.music-imported-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-imported-copy strong {
  font-size: 11px;
}

.music-imported-copy small {
  margin-top: 4px;
  color: var(--music-muted);
  font-size: 9px;
}

.music-imported-kind {
  color: var(--music-muted);
  font-size: 8px;
  font-weight: 800;
}

.music-icon-button.is-imported-action {
  width: 34px;
  height: 34px;
  color: var(--music-muted);
}

.music-icon-button.is-imported-action.is-remove:hover {
  color: var(--music-accent-dark);
}

.music-imported-empty {
  display: flex;
  min-height: 96px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-top: 1px solid var(--music-line);
  color: var(--music-muted);
  font-size: 10px;
}

.music-settings-section {
  padding: 24px 0;
  border-bottom: 1px solid var(--music-line);
}

.music-settings-section-heading {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.music-settings-section-heading > i {
  color: var(--music-teal);
}

.music-provider-badge {
  border-radius: 999px;
  padding: 6px 9px;
  color: var(--music-muted);
  background: #eef0ee;
  font-size: 9px;
  font-weight: 700;
}

.music-provider-badge.is-ready {
  color: #246948;
  background: #e4f4ea;
}

.music-provider-badge.is-error {
  color: #9b2537;
  background: #fae7ea;
}

.music-provider-badge.is-warning {
  color: #825c17;
  background: #f8efd9;
}

.music-provider-badge.is-resolving,
.music-provider-badge.is-testing {
  color: #276a79;
  background: #e4f1f4;
}

.music-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.music-form-grid label.is-wide {
  grid-column: 1 / -1;
}

.music-form-grid textarea {
  resize: vertical;
}

.music-fixed-source {
  display: grid;
  min-height: 58px;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  color: var(--music-teal);
}

.music-fixed-source.is-radio {
  color: var(--music-gold);
}

.music-fixed-source strong,
.music-fixed-source small {
  display: block;
}

.music-fixed-source strong {
  color: var(--music-ink);
  font-size: 11px;
}

.music-fixed-source small {
  margin-top: 3px;
  color: var(--music-muted);
  font-size: 8px;
}

.music-field-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 13px 0 0;
  color: var(--music-muted);
  font-size: 9px;
}

.music-field-note i {
  color: var(--music-teal);
}

.music-quota-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 0;
  color: #356d5d;
  font-size: 9px;
  font-weight: 700;
}

.music-advanced-settings {
  border-bottom: 1px solid var(--music-line);
  padding: 18px 0;
}

.music-advanced-settings summary {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  list-style: none;
  font-size: 12px;
  font-weight: 700;
}

.music-advanced-settings summary span {
  display: flex;
  align-items: center;
  gap: 10px;
}

.music-advanced-settings[open] summary > i {
  transform: rotate(180deg);
}

.music-form-grid.is-mapping {
  margin: 12px 0 8px;
}

.music-toggle-row {
  position: relative;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 46px;
  min-height: 62px;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--music-line);
  cursor: pointer;
}

.music-toggle-row input {
  position: absolute;
  opacity: 0;
}

.music-toggle-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 8px;
  color: #fff;
}

.music-toggle-icon.is-chat {
  background: var(--music-gold);
}

.music-toggle-icon.is-map {
  background: var(--music-teal);
}

.music-toggle-row strong,
.music-toggle-row small {
  display: block;
}

.music-toggle-row strong {
  font-size: 12px;
}

.music-toggle-row small {
  margin-top: 3px;
  color: var(--music-muted);
  font-size: 9px;
}

.music-switch {
  position: relative;
  width: 42px;
  height: 24px;
  border-radius: 12px;
  background: #c9ccca;
  transition: background 160ms ease;
}

.music-switch::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 5px rgba(24, 26, 29, 0.18);
  content: '';
  transition: transform 160ms ease;
}

.music-toggle-row input:checked + .music-switch {
  background: var(--music-accent);
}

.music-toggle-row input:checked + .music-switch::after {
  transform: translateX(18px);
}

.music-form-error {
  margin: 14px 0 0;
  color: #a52639;
  font-size: 10px;
}

.music-settings-actions {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 10px;
  padding-top: 22px;
}

.music-danger-button {
  border: 1px solid rgba(173, 37, 62, 0.25);
  color: #a52639;
  background: #fff;
}

.music-drawer-enter-active,
.music-drawer-leave-active,
.music-settings-enter-active,
.music-settings-leave-active,
.music-album-detail-enter-active,
.music-album-detail-leave-active {
  transition: opacity 180ms ease;
}

.music-album-detail-enter-active > *,
.music-album-detail-leave-active > * {
  transition: transform 220ms ease;
}

.music-drawer-enter-active .music-queue-drawer,
.music-drawer-leave-active .music-queue-drawer {
  transition: transform 200ms ease;
}

.music-drawer-enter-from,
.music-drawer-leave-to,
.music-settings-enter-from,
.music-settings-leave-to,
.music-album-detail-enter-from,
.music-album-detail-leave-to {
  opacity: 0;
}

.music-album-detail-enter-from > *,
.music-album-detail-leave-to > * {
  transform: translateY(10px);
}

.music-drawer-enter-from .music-queue-drawer,
.music-drawer-leave-to .music-queue-drawer {
  transform: translateX(100%);
}

@media (max-width: 840px) {
  .music-shell {
    display: block;
  }

  .music-sidebar {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 22;
    display: block;
    height: 78px;
    padding: 0 0 10px;
    border: 0;
    border-top: 1px solid rgba(24, 26, 29, 0.1);
    border-radius: 0;
    color: var(--music-ink);
    background: rgba(250, 251, 249, 0.94);
    box-shadow: 0 -8px 24px rgba(24, 26, 29, 0.08);
    backdrop-filter: blur(18px) saturate(1.16);
  }

  .music-brand-block,
  .music-source-status,
  .music-sidebar-footer {
    display: none;
  }

  .music-nav-list {
    display: grid;
    height: 100%;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
  }

  .music-nav-item {
    display: grid;
    min-width: 0;
    min-height: 64px;
    grid-template-columns: 1fr;
    place-items: center;
    align-content: center;
    gap: 4px;
    border-radius: 0;
    padding: 0 4px;
    color: #777b80;
    text-align: center;
  }

  .music-nav-item span {
    width: 100%;
    overflow: hidden;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .music-nav-item.is-active {
    color: var(--music-ink);
    background: transparent;
  }

  .music-nav-item i {
    width: 30px;
    height: 30px;
    color: #777b80;
  }

  .music-nav-item.is-active i {
    color: #fff;
  }

  .music-nav-item:hover {
    color: var(--music-ink);
    background: transparent;
  }

  .music-nav-item.is-active::before {
    top: auto;
    bottom: 0;
    left: 50%;
    width: 24px;
    height: 3px;
    border-radius: 3px 3px 0 0;
    transform: translateX(-50%);
  }

  .music-content {
    height: 100%;
  }

  .music-topbar {
    height: 66px;
    gap: 8px;
    padding: 0 10px;
  }

  .music-mobile-brand {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .music-mobile-brand .music-wordmark {
    gap: 5px;
    font-size: 17px;
  }

  .music-mobile-brand .music-wordmark i {
    color: var(--music-accent);
    font-size: 14px;
  }

  .music-topbar-title {
    display: none;
  }

  .music-topbar-actions {
    flex: 0 0 auto;
  }

  .music-topbar-actions .music-icon-button:first-child {
    display: inline-grid;
  }

  .music-topbar-actions .music-icon-button {
    width: 38px;
    height: 38px;
    flex-basis: 38px;
  }

  .music-search-trigger {
    width: auto;
    min-width: 0;
    height: 38px;
    flex: 1 1 auto;
    margin-left: 0;
    padding: 0 12px;
  }

  .music-scroll {
    height: calc(100% - 66px);
    padding: 18px 16px 158px;
  }

  .music-listen-layout {
    grid-template-areas:
      'feature'
      'shortcuts'
      'albums'
      'recent';
    grid-template-columns: minmax(0, 1fr);
    gap: 30px;
  }

  .music-listen-layout .music-section-block {
    margin: 0;
  }

  .music-recent-section {
    padding: 18px 14px 12px;
  }

  .music-feature {
    min-height: 286px;
    grid-template-columns: 230px minmax(0, 1fr);
  }

  .music-feature-art {
    width: 180px;
  }

  .music-feature-copy {
    padding: 30px 30px 30px 8px;
  }

  .music-feature h1,
  .music-page-intro h1 {
    font-size: 34px;
  }

  .music-feature-actions .music-secondary-button {
    display: none;
  }

  .music-discovery-shortcuts {
    gap: 4px;
  }

  .music-discovery-shortcuts > button {
    min-height: 92px;
    grid-template-columns: 1fr;
    grid-template-rows: 54px auto;
    place-items: center;
    align-content: start;
    gap: 6px;
    border: 0;
    padding: 0 2px;
    background: transparent;
    box-shadow: none;
    text-align: center;
  }

  .music-discovery-shortcuts > button:hover {
    background: transparent;
  }

  .music-shortcut-icon {
    width: 54px;
    height: 54px;
  }

  .music-discovery-shortcuts small {
    display: none;
  }

  .music-discovery-shortcuts strong {
    width: 100%;
    font-size: 10px;
  }

  .music-catalog-hero {
    min-height: 228px;
    grid-template-columns: minmax(0, 1fr) 210px;
    padding: 28px 32px;
  }

  .music-catalog-stack {
    height: 150px;
  }

  .music-catalog-stack span {
    width: 138px;
  }

  .music-library-hero {
    grid-template-columns: 150px minmax(0, 1fr);
    gap: 24px;
    padding: 28px 30px;
  }

  .music-library-mosaic {
    width: 144px;
  }

  .music-library-glance {
    min-height: 88px;
    grid-column: 1 / -1;
  }

  .music-album-rail {
    grid-auto-columns: 148px;
  }

  .music-album-play {
    opacity: 1;
    transform: none;
  }

  .music-app.is-album-detail .music-sidebar {
    display: none;
  }

  .music-app.is-album-detail .music-player {
    bottom: 10px;
  }

  .music-track-row {
    grid-template-columns: 30px minmax(0, 1fr) 40px 36px;
    gap: 9px;
  }

  .music-track-info {
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 9px;
  }

  .music-track-info .music-track-album,
  .music-track-row .music-track-action:last-child {
    display: none;
  }

  .music-player {
    right: 10px;
    bottom: 88px;
    left: 10px;
    grid-template-columns: minmax(0, 1fr) auto;
    min-height: 72px;
    gap: 8px;
    padding: 8px 10px;
  }

  .music-player-track {
    grid-template-columns: 50px minmax(0, 1fr);
  }

  .music-player-cover {
    width: 50px;
    height: 50px;
  }

  .music-player-center {
    display: flex;
    align-items: center;
  }

  .music-player-controls button:first-child,
  .music-player-controls button:last-child,
  .music-player-progress,
  .music-player-tools,
  .music-player-error {
    display: none;
  }

  .music-player-controls {
    gap: 2px;
  }

  .music-player-controls button {
    width: 40px;
    height: 40px;
  }

  .music-play-button {
    color: #fff !important;
    background: var(--music-accent) !important;
  }

  .music-settings-overlay,
  .music-overlay {
    inset: 32px 0 0;
  }

  .music-settings-overlay {
    padding: 0;
  }

  .music-settings-sheet {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  .music-settings-body {
    display: block;
    overflow-y: auto;
  }

  .music-provider-list {
    display: flex;
    overflow-x: auto;
    padding: 12px 14px;
    border-right: 0;
    border-bottom: 1px solid var(--music-line);
    scrollbar-width: none;
  }

  .music-provider-list::-webkit-scrollbar {
    display: none;
  }

  .music-provider-list button {
    width: 160px;
    min-width: 160px;
  }

  .music-provider-list button.music-settings-add-entry {
    margin: 0 8px 0 0;
  }

  .music-settings-group-label {
    display: none;
  }

  .music-provider-list button.music-add-source {
    margin: 0 0 0 8px;
  }

  .music-provider-form {
    overflow: visible;
    padding: 0 18px 34px;
  }

  .music-now-playing-sheet {
    top: 0;
    bottom: 0;
    width: 100%;
    overflow-y: auto;
    border: 0;
    border-radius: 0;
  }

  .music-now-playing-sheet::after {
    background: rgba(17, 20, 23, 0.86);
  }

  .music-now-playing-ambient {
    inset: 0;
    transform: none;
  }

  .music-icon-button.is-sheet-close {
    top: 16px;
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }

  .music-now-playing-layout {
    min-height: 100%;
    height: auto;
    grid-template-columns: minmax(0, 1fr);
  }

  .music-now-playing-visual {
    padding: 66px 24px 0;
    border-right: 0;
    background: transparent;
  }

  .music-now-playing-art {
    width: min(100%, 320px);
  }

  .music-now-playing-stage {
    display: block;
    overflow: visible;
    padding: 28px 32px 40px;
  }

  .music-now-playing-copy {
    text-align: center;
  }

  .music-now-playing-copy h2 {
    font-size: 32px;
  }

  .music-now-playing-playback {
    min-height: 0;
    margin-top: 22px;
  }

  .music-now-playing-controls,
  .music-now-playing-actions {
    justify-content: center;
  }

  .music-track-inspection-note {
    text-align: center;
  }
}

@media (max-width: 560px) {
  .music-mobile-brand .music-wordmark span {
    display: none;
  }

  .music-search-trigger {
    padding: 0 10px;
  }

  .music-integration-banner {
    grid-template-columns: 36px minmax(0, 1fr) 36px;
  }

  .music-integration-banner > button:not(.music-icon-button) {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .music-feature {
    display: grid;
    min-height: 252px;
    grid-template-columns: 42% minmax(0, 1fr);
  }

  .music-feature-art {
    width: 118px;
    min-height: 0;
    aspect-ratio: 1;
  }

  .music-vinyl-groove {
    right: -26px;
    width: 108px;
    height: 108px;
    border-width: 23px;
  }

  .music-feature-copy {
    padding: 22px 14px 22px 2px;
  }

  .music-feature h1 {
    font-size: 27px;
  }

  .music-feature-artist {
    font-size: 14px;
  }

  .music-feature-actions {
    margin-top: 18px;
  }

  .music-catalog-hero {
    min-height: 214px;
    grid-template-columns: minmax(0, 1fr) 124px;
    padding: 24px 20px;
  }

  .music-catalog-copy h1,
  .music-library-hero-copy h1 {
    font-size: 34px;
  }

  .music-catalog-copy .music-primary-button {
    width: 42px;
    min-width: 42px;
    padding: 0;
  }

  .music-catalog-copy .music-primary-button span {
    display: none;
  }

  .music-catalog-stack {
    height: 118px;
  }

  .music-catalog-stack span {
    width: 104px;
  }

  .music-library-hero {
    grid-template-columns: 106px minmax(0, 1fr);
    gap: 18px;
    padding: 22px 18px;
  }

  .music-library-mosaic {
    width: 104px;
  }

  .music-library-hero-copy .music-primary-button {
    width: 42px;
    min-width: 42px;
    padding: 0;
  }

  .music-library-hero-copy .music-primary-button span {
    display: none;
  }

  .music-library-glance {
    min-height: 78px;
  }

  .music-library-glance strong {
    font-size: 17px;
  }

  .music-section-block {
    margin-top: 30px;
  }

  .music-section-heading h2,
  .music-drawer-heading h2,
  .music-settings-header h2,
  .music-settings-section-heading h3 {
    font-size: 21px;
  }

  .music-page-intro.is-library {
    align-items: flex-start;
  }

  .music-page-intro.is-library .music-primary-button {
    width: 42px;
    min-width: 42px;
    padding: 0;
  }

  .music-page-intro.is-library .music-primary-button span {
    display: none;
  }

  .music-segmented {
    display: flex;
    width: 100%;
    overflow-x: auto;
  }

  .music-segmented button {
    flex: 0 0 auto;
    padding: 0 12px;
  }

  .music-album-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 14px;
  }

  .music-playlist-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .music-search-form {
    grid-template-columns: 22px minmax(0, 1fr) 34px;
  }

  .music-search-form input {
    font-size: 23px !important;
  }

  .music-search-submit {
    grid-column: 1 / -1;
    width: 100%;
  }

  .music-now-playing-sheet {
    left: 0;
    transform: none;
  }

  .music-now-playing-art {
    width: min(100%, 300px);
  }

  .music-now-playing-stage {
    padding: 26px 24px 28px;
  }

  .music-now-playing-actions {
    width: 100%;
    gap: 6px;
  }

  .music-lyrics-sheet {
    width: 100%;
    padding: 24px 20px 30px;
  }

  .music-lyrics-content pre {
    font-size: 15px;
  }

  .music-queue-drawer,
  .music-playlist-sheet {
    width: 100%;
  }

  .music-playlist-sheet {
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    max-height: 78%;
    border-radius: 8px 8px 0 0;
    transform: none;
  }

  .music-form-grid,
  .music-create-playlist-form {
    grid-template-columns: 1fr;
  }

  .music-add-submit-row .music-primary-button,
  .music-file-picker-button {
    width: 100%;
  }

  .music-imported-row {
    grid-template-columns: 40px minmax(0, 1fr) 34px 34px;
    gap: 8px;
  }

  .music-imported-kind {
    display: none;
  }

  .music-settings-actions {
    grid-template-columns: 1fr 1fr;
  }

  .music-settings-actions > span {
    display: none;
  }

  .music-danger-button {
    grid-column: 1 / -1;
  }
}

@media (min-width: 841px) and (max-height: 820px) {
  .music-now-playing-art {
    width: min(100%, 350px);
  }

  .music-now-playing-stage {
    padding-top: 48px;
    padding-bottom: 36px;
  }

  .music-now-playing-playback {
    margin-top: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .music-app *,
  .music-app *::before,
  .music-app *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
