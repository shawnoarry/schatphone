<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  album: {
    type: Object,
    required: true,
  },
  currentTrackId: {
    type: String,
    default: '',
  },
  favoriteTrackIds: {
    type: Array,
    default: () => [],
  },
  playing: Boolean,
  queueAdded: Boolean,
  playbackError: {
    type: String,
    default: '',
  },
  backLabel: {
    type: String,
    default: '',
  },
  canPlayTrack: {
    type: Function,
    default: () => true,
  },
})

const emit = defineEmits([
  'close',
  'toggle-album',
  'toggle-album-favorite',
  'add-queue',
  'toggle-track',
  'open-track',
  'toggle-favorite',
  'add-playlist',
])

const { t } = useI18n()

const coverTrack = computed(() => props.album.tracks?.[0] || null)
const isAlbumCurrent = computed(() =>
  Boolean(props.album.tracks?.some((track) => track.id === props.currentTrackId)),
)
const isAlbumPlaying = computed(() => isAlbumCurrent.value && props.playing)
const allTracksFavorited = computed(
  () =>
    Boolean(props.album.tracks?.length) &&
    props.album.tracks.every((track) => props.favoriteTrackIds.includes(track.id)),
)
const totalDuration = computed(() =>
  (props.album.tracks || []).reduce((total, track) => total + (Number(track.durationSec) || 0), 0),
)
const albumMeta = computed(() => {
  const count = props.album.tracks?.length || 0
  return [
    props.album.genre,
    props.album.year,
    t(`${count} 首歌曲`, `${count} ${count === 1 ? 'track' : 'tracks'}`),
    formatLongDuration(totalDuration.value),
  ]
    .filter(Boolean)
    .join(' · ')
})

function formatDuration(secondsInput) {
  const seconds = Math.max(0, Math.floor(Number(secondsInput) || 0))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function formatLongDuration(secondsInput) {
  const minutes = Math.max(0, Math.round((Number(secondsInput) || 0) / 60))
  if (!minutes) return ''
  if (minutes < 60) return t(`${minutes} 分钟`, `${minutes} min`)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return t(
    remainder ? `${hours} 小时 ${remainder} 分钟` : `${hours} 小时`,
    remainder ? `${hours} hr ${remainder} min` : `${hours} hr`,
  )
}

const coverStyle = (track) =>
  track?.coverUrl ? { backgroundImage: `url(${JSON.stringify(track.coverUrl)})` } : undefined

const onCoverError = (event) => {
  if (event?.currentTarget instanceof HTMLElement) event.currentTarget.style.visibility = 'hidden'
}

const isTrackCurrent = (track) => Boolean(track?.id) && track.id === props.currentTrackId
const isTrackPlaying = (track) => isTrackCurrent(track) && props.playing
const isFavorite = (track) => props.favoriteTrackIds.includes(track.id)
</script>

<template>
  <section class="album-detail" data-testid="music-album-detail">
    <div class="album-detail-ambient" :style="coverStyle(coverTrack)" aria-hidden="true"></div>

    <header class="album-detail-header">
      <button
        class="album-detail-back"
        type="button"
        :title="backLabel || t('返回专辑', 'Back to Albums')"
        :aria-label="backLabel || t('返回专辑', 'Back to Albums')"
        data-testid="music-album-detail-back"
        @click="emit('close')"
      >
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <span>{{ t('专辑', 'Album') }}</span>
    </header>

    <div class="album-detail-body">
      <section class="album-detail-hero">
        <div class="album-detail-cover" :style="coverStyle(coverTrack)">
          <img
            v-if="album.coverUrl"
            :src="album.coverUrl"
            :alt="album.title"
            @error="onCoverError"
          />
          <span class="album-detail-disc" aria-hidden="true"></span>
        </div>

        <div class="album-detail-copy">
          <span class="album-detail-kicker">{{ t('专辑', 'ALBUM') }}</span>
          <h1>{{ album.title }}</h1>
          <p class="album-detail-artist">{{ album.artist }}</p>
          <p class="album-detail-meta">{{ albumMeta }}</p>
        </div>

        <div class="album-detail-actions">
          <button
            class="album-detail-play"
            type="button"
            :title="isAlbumPlaying ? t('暂停专辑', 'Pause album') : t('播放专辑', 'Play album')"
            data-testid="music-album-detail-play"
            @click="emit('toggle-album', album)"
          >
            <i :class="isAlbumPlaying ? 'fas fa-pause' : 'fas fa-play'" aria-hidden="true"></i>
            <span>{{ isAlbumPlaying ? t('暂停', 'Pause') : t('播放', 'Play') }}</span>
          </button>
          <button
            class="album-detail-tool"
            type="button"
            :class="{ 'is-selected': allTracksFavorited }"
            :aria-pressed="allTracksFavorited"
            :title="
              allTracksFavorited
                ? t('取消整张收藏', 'Unfavorite all')
                : t('收藏全部歌曲', 'Favorite all')
            "
            data-testid="music-album-detail-favorite"
            @click="emit('toggle-album-favorite', album)"
          >
            <i :class="allTracksFavorited ? 'fas fa-heart' : 'far fa-heart'" aria-hidden="true"></i>
            <span>{{ allTracksFavorited ? t('已收藏', 'Saved') : t('收藏', 'Favorite') }}</span>
          </button>
          <button
            class="album-detail-tool"
            type="button"
            :class="{ 'is-confirmed': queueAdded }"
            :title="
              queueAdded
                ? t('已加入队列', 'Added to queue')
                : t('整张加入队列', 'Add album to queue')
            "
            data-testid="music-album-detail-queue"
            @click="emit('add-queue', album)"
          >
            <i :class="queueAdded ? 'fas fa-check' : 'fas fa-list-ul'" aria-hidden="true"></i>
            <span aria-live="polite">{{
              queueAdded ? t('已加入', 'Added') : t('加入队列', 'Queue')
            }}</span>
          </button>
        </div>

        <p v-if="playbackError && isAlbumCurrent" class="album-detail-error">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
          <span>{{ playbackError }}</span>
        </p>
      </section>

      <section class="album-track-section">
        <header class="album-track-heading">
          <div>
            <span>{{ t('曲目', 'TRACKS') }}</span>
            <h2>{{ t('专辑曲目', 'Track list') }}</h2>
          </div>
          <small>{{ t(`${album.tracks.length} 首`, `${album.tracks.length} tracks`) }}</small>
        </header>

        <div class="album-track-list">
          <article
            v-for="(track, index) in album.tracks"
            :key="track.id"
            class="album-track-row"
            :class="{ 'is-current': isTrackCurrent(track), 'is-unplayable': !canPlayTrack(track) }"
          >
            <button
              class="album-track-play"
              type="button"
              :disabled="!canPlayTrack(track)"
              :title="
                canPlayTrack(track)
                  ? isTrackPlaying(track)
                    ? t('暂停', 'Pause')
                    : t('播放', 'Play')
                  : t('暂时无法播放', 'Unavailable')
              "
              :aria-label="
                canPlayTrack(track)
                  ? `${isTrackPlaying(track) ? t('暂停', 'Pause') : t('播放', 'Play')}：${track.title}`
                  : `${t('暂时无法播放', 'Unavailable')}：${track.title}`
              "
              :data-testid="`music-album-track-play-${track.id}`"
              @click="emit('toggle-track', track)"
            >
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <i
                :class="isTrackPlaying(track) ? 'fas fa-pause' : 'fas fa-play'"
                aria-hidden="true"
              ></i>
            </button>

            <button
              class="album-track-info"
              type="button"
              :title="t('查看歌曲详情', 'View track details')"
              :data-testid="`music-album-track-open-${track.id}`"
              @click="emit('open-track', track)"
            >
              <strong>{{ track.title }}</strong>
              <span>{{ track.artist }}</span>
            </button>

            <span class="album-track-duration">{{ formatDuration(track.durationSec) }}</span>

            <button
              class="album-track-tool"
              type="button"
              :class="{ 'is-selected': isFavorite(track) }"
              :aria-pressed="isFavorite(track)"
              :title="isFavorite(track) ? t('取消喜爱', 'Unfavorite') : t('加入喜爱', 'Favorite')"
              @click="emit('toggle-favorite', track)"
            >
              <i
                :class="isFavorite(track) ? 'fas fa-heart' : 'far fa-heart'"
                aria-hidden="true"
              ></i>
            </button>
            <button
              class="album-track-tool"
              type="button"
              :title="t('加入播放列表', 'Add to Playlist')"
              @click="emit('add-playlist', track)"
            >
              <i class="fas fa-plus" aria-hidden="true"></i>
            </button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.album-detail {
  --album-accent: #df3f5d;
  --album-ink: #181a1d;
  --album-muted: #6f7478;
  position: absolute;
  inset: 0;
  z-index: 15;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: 156px;
  color: var(--album-ink);
  background: #eef0ed;
}

.album-detail,
.album-detail * {
  box-sizing: border-box;
}

.album-detail-ambient {
  position: absolute;
  top: -130px;
  right: 0;
  left: 0;
  height: 520px;
  opacity: 0.26;
  background-color: #25292c;
  background-position: center 42%;
  background-size: cover;
  filter: blur(42px) saturate(1.15);
  pointer-events: none;
}

.album-detail::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 390px;
  background: rgba(20, 23, 25, 0.8);
  content: '';
  pointer-events: none;
}

.album-detail-header {
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  height: 64px;
  align-items: center;
  gap: 10px;
  padding: 0 28px;
  color: rgba(255, 255, 255, 0.84);
  background: rgba(20, 23, 25, 0.72);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
}

.album-detail-header > span {
  font-size: 12px;
  font-weight: 700;
}

.album-detail-back {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: transparent;
  cursor: pointer;
}

.album-detail-back:hover {
  background: rgba(255, 255, 255, 0.1);
}

.album-detail-back:active,
.album-detail-actions button:active,
.album-track-row button:active {
  transform: scale(0.96);
}

.album-detail-back:focus-visible,
.album-detail-actions button:focus-visible,
.album-track-row button:focus-visible {
  outline: 2px solid var(--album-accent);
  outline-offset: 2px;
}

.album-detail-body {
  position: relative;
  z-index: 1;
}

.album-detail-hero {
  display: grid;
  width: min(1120px, 100%);
  min-height: 326px;
  grid-template-columns: 260px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  align-items: end;
  gap: 38px;
  margin: 0 auto;
  padding: 36px 32px 40px;
  color: #fff;
}

.album-detail-cover {
  position: relative;
  width: 260px;
  grid-row: 1 / 3;
  aspect-ratio: 1;
  overflow: visible;
  border-radius: 6px;
  background-color: #414548;
  background-position: center;
  background-size: cover;
  box-shadow: 0 26px 58px rgba(0, 0, 0, 0.38);
}

.album-detail-cover::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: inherit;
  content: '';
  pointer-events: none;
}

.album-detail-cover img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.album-detail-disc {
  position: absolute;
  top: 50%;
  right: -54px;
  width: 206px;
  height: 206px;
  border: 42px double rgba(10, 11, 12, 0.92);
  border-radius: 50%;
  background: #17191b;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.3);
  transform: translateY(-50%);
}

.album-detail-copy {
  position: relative;
  z-index: 2;
  min-width: 0;
  align-self: end;
}

.album-detail-kicker,
.album-track-heading span {
  color: rgba(255, 255, 255, 0.58);
  font-size: 10px;
  font-weight: 800;
}

.album-detail-copy h1 {
  margin: 9px 0 0;
  overflow-wrap: anywhere;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 44px;
  line-height: 1.08;
}

.album-detail-artist {
  margin: 12px 0 0;
  font-size: 16px;
  font-weight: 700;
}

.album-detail-meta {
  margin: 7px 0 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 11px;
}

.album-detail-actions {
  display: flex;
  grid-column: 2;
  align-self: start;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
}

.album-detail-actions button {
  min-height: 44px;
  border: 0;
  cursor: pointer;
  transition:
    color 140ms ease,
    background-color 140ms ease,
    transform 140ms ease;
}

.album-detail-play {
  display: inline-flex;
  min-width: 116px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 6px;
  padding: 0 20px;
  color: #fff;
  background: var(--album-accent);
  font-size: 12px;
  font-weight: 800;
}

.album-detail-play:hover {
  background: #c83250;
}

.album-detail-tool {
  display: inline-grid;
  min-width: 68px;
  grid-template-columns: 1fr;
  place-items: center;
  gap: 3px;
  border-radius: 6px;
  padding: 5px 10px 4px;
  color: rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.08);
}

.album-detail-tool span {
  font-size: 8px;
}

.album-detail-tool:hover,
.album-detail-tool.is-confirmed {
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
}

.album-detail-tool.is-selected {
  color: #ffd9e2;
  background: rgba(223, 63, 93, 0.2);
}

.album-detail-error {
  display: flex;
  grid-column: 2;
  align-items: center;
  gap: 8px;
  margin: -12px 0 0;
  color: #ffb0bd;
  font-size: 10px;
}

.album-track-section {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 30px 32px 42px;
  border-top: 1px solid rgba(24, 26, 29, 0.1);
}

.album-track-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.album-track-heading span {
  color: var(--album-accent);
}

.album-track-heading h2 {
  margin: 4px 0 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
}

.album-track-heading small {
  color: var(--album-muted);
  font-size: 10px;
}

.album-track-list {
  border-top: 1px solid rgba(24, 26, 29, 0.1);
}

.album-track-row {
  display: grid;
  min-height: 66px;
  grid-template-columns: 40px minmax(0, 1fr) 54px 40px 40px;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(24, 26, 29, 0.1);
  transition: background-color 140ms ease;
}

.album-track-row:hover {
  background: rgba(255, 255, 255, 0.54);
}

.album-track-row.is-current {
  color: var(--album-accent);
}

.album-track-row.is-unplayable {
  opacity: 0.58;
}

.album-track-row button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.album-track-play {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: var(--album-muted);
  font-size: 10px;
}

.album-track-play i {
  display: none;
}

.album-track-row:hover .album-track-play:not(:disabled) span,
.album-track-row.is-current .album-track-play:not(:disabled) span {
  display: none;
}

.album-track-row:hover .album-track-play:not(:disabled) i,
.album-track-row.is-current .album-track-play:not(:disabled) i {
  display: inline;
}

.album-track-info {
  min-width: 0;
  padding: 10px 0;
  text-align: left;
}

.album-track-info strong,
.album-track-info span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-track-info strong {
  font-size: 13px;
}

.album-track-info span,
.album-track-duration {
  margin-top: 3px;
  color: var(--album-muted);
  font-size: 10px;
}

.album-track-duration {
  margin: 0;
  text-align: right;
}

.album-track-tool {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 50%;
  color: var(--album-muted);
}

.album-track-tool:hover,
.album-track-tool.is-selected {
  color: var(--album-accent);
  background: rgba(223, 63, 93, 0.08);
}

@media (max-width: 720px) {
  .album-detail {
    padding-bottom: 112px;
  }

  .album-detail::before {
    height: 306px;
  }

  .album-detail-header {
    height: 58px;
    padding: 0 12px;
  }

  .album-detail-hero {
    min-height: 248px;
    grid-template-columns: 116px minmax(0, 1fr);
    align-items: center;
    gap: 18px;
    padding: 22px 18px 26px;
  }

  .album-detail-cover {
    width: 116px;
    grid-row: 1;
  }

  .album-detail-disc {
    right: -26px;
    width: 96px;
    height: 96px;
    border-width: 20px;
  }

  .album-detail-copy h1 {
    margin-top: 6px;
    font-size: 28px;
  }

  .album-detail-artist {
    margin-top: 8px;
    font-size: 13px;
  }

  .album-detail-meta {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-height: 1.45;
  }

  .album-detail-actions {
    grid-column: 1 / -1;
    grid-row: 2;
    margin-top: 0;
  }

  .album-detail-play {
    flex: 1;
  }

  .album-detail-tool {
    min-width: 62px;
  }

  .album-detail-error {
    grid-column: 1 / -1;
    margin-top: -6px;
  }

  .album-track-section {
    padding: 24px 16px 34px;
  }

  .album-track-heading h2 {
    font-size: 21px;
  }

  .album-track-row {
    grid-template-columns: 36px minmax(0, 1fr) 38px 38px;
    gap: 6px;
  }

  .album-track-play,
  .album-track-tool {
    width: 38px;
  }

  .album-track-duration {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .album-detail-actions button,
  .album-track-row,
  .album-track-row button {
    transition: none;
  }
}
</style>
