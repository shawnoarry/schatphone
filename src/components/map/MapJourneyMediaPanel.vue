<script setup>
import { computed, ref } from 'vue'
import { useI18n } from '../../composables/useI18n'
import { useMusicStore } from '../../stores/music'

defineProps({ journeyLabel: { type: String, default: '' } })
defineEmits(['close', 'open-music'])

const musicStore = useMusicStore()
const { t } = useI18n()
const mode = ref('music')
const busyId = ref('')
const feedback = ref('')

const media = computed(() => musicStore.mapJourneyMedia)
const nowPlaying = computed(() => media.value.nowPlaying)
const coverStyle = computed(() =>
  nowPlaying.value?.coverUrl
    ? { backgroundImage: `url(${JSON.stringify(nowPlaying.value.coverUrl)})` }
    : undefined,
)

const errorMessage = (code) => {
  if (code === 'LOCAL_MEDIA_MISSING') return t('本地音频已不在此设备', 'The local audio file is missing')
  if (code === 'PLAYBACK_GESTURE_REQUIRED') return t('再次轻点播放以继续', 'Tap play again to continue')
  if (code === 'MAP_MUSIC_DISABLED') return t('请先在音乐设置中允许 Map 控制', 'Allow Map controls in Music Settings first')
  return t('暂时无法播放此内容', 'This audio is temporarily unavailable')
}

const runPlaybackAction = async (id, action) => {
  if (busyId.value) return
  busyId.value = id
  feedback.value = ''
  try {
    const result = await action()
    if (!result?.ok) feedback.value = errorMessage(result?.code)
  } finally {
    busyId.value = ''
  }
}

const togglePlayback = () => {
  const firstTrack = media.value.quickTracks[0]
  return runPlaybackAction('toggle', () =>
    nowPlaying.value.available
      ? musicStore.togglePlayback()
      : firstTrack
        ? musicStore.playJourneyTrack(firstTrack.trackRef.id)
        : Promise.resolve({ ok: false, code: 'QUEUE_EMPTY' }),
  )
}

const playTrack = (track) =>
  runPlaybackAction(`track:${track.trackRef.id}`, () => musicStore.playJourneyTrack(track.trackRef.id))

const playStation = (station) =>
  runPlaybackAction(`station:${station.id}`, () => musicStore.playJourneyRadio(station.id))

const openFloatingPlayer = () => musicStore.openFloatingPlayer({ expanded: true })
</script>

<template>
  <section class="map-journey-media-panel" data-testid="map-journey-media-panel" :aria-label="t('行程音频', 'Journey audio')">
    <header class="map-journey-media-header">
      <div><span>{{ t('行程音频', 'JOURNEY AUDIO') }}</span><h2>{{ t('音乐与电台', 'Music & Radio') }}</h2><small>{{ journeyLabel }}</small></div>
      <button type="button" :aria-label="t('关闭', 'Close')" @click="$emit('close')"><i class="fas fa-xmark" aria-hidden="true"></i></button>
    </header>

    <div class="map-journey-media-segments" role="tablist" :aria-label="t('音频类型', 'Audio type')">
      <button type="button" role="tab" :aria-selected="mode === 'music'" :class="{ 'is-active': mode === 'music' }" data-testid="map-journey-music-tab" @click="mode = 'music'"><i class="fas fa-music" aria-hidden="true"></i><span>{{ t('音乐', 'Music') }}</span></button>
      <button type="button" role="tab" :aria-selected="mode === 'radio'" :class="{ 'is-active': mode === 'radio' }" data-testid="map-journey-radio-tab" @click="mode = 'radio'"><i class="fas fa-tower-broadcast" aria-hidden="true"></i><span>{{ t('电台', 'Radio') }}</span></button>
    </div>

    <div v-if="!media.enabled" class="map-journey-media-feedback" role="status"><i class="fas fa-circle-exclamation" aria-hidden="true"></i>{{ t('Map 音乐控制已关闭', 'Map music controls are off') }}</div>

    <template v-else-if="mode === 'music'">
      <section class="map-journey-now-playing" data-testid="map-journey-now-playing">
        <span class="map-journey-album-art" :style="coverStyle"><i v-if="!nowPlaying.coverUrl" class="fas fa-music" aria-hidden="true"></i></span>
        <div><span>{{ nowPlaying.available ? t('正在播放', 'NOW PLAYING') : t('行程音乐', 'JOURNEY MUSIC') }}</span><strong>{{ nowPlaying.available ? nowPlaying.title : t('选择一首歌曲', 'Choose a track') }}</strong><small>{{ nowPlaying.available ? nowPlaying.artist : t('音乐由 Music 提供', 'Powered by Music') }}</small></div>
        <div class="map-journey-transport-controls">
          <button type="button" :disabled="!nowPlaying.available" :aria-label="t('上一首', 'Previous')" @click="runPlaybackAction('previous', musicStore.previous)"><i class="fas fa-backward-step" aria-hidden="true"></i></button>
          <button class="is-primary" type="button" :aria-label="musicStore.isPlaying ? t('暂停', 'Pause') : t('播放', 'Play')" data-testid="map-journey-play-toggle" @click="togglePlayback"><i :class="busyId === 'toggle' ? 'fas fa-spinner fa-spin' : musicStore.isPlaying ? 'fas fa-pause' : 'fas fa-play'" aria-hidden="true"></i></button>
          <button type="button" :disabled="!nowPlaying.available" :aria-label="t('下一首', 'Next')" @click="runPlaybackAction('next', () => musicStore.next())"><i class="fas fa-forward-step" aria-hidden="true"></i></button>
        </div>
      </section>

      <section class="map-journey-track-list" :aria-label="t('快速选择', 'Quick picks')">
        <button v-for="track in media.quickTracks" :key="track.trackRef.id" type="button" :class="{ 'is-current': nowPlaying.trackRef?.id === track.trackRef.id }" :data-testid="`map-journey-track-${track.trackRef.id}`" @click="playTrack(track)">
          <span><i :class="busyId === `track:${track.trackRef.id}` ? 'fas fa-spinner fa-spin' : nowPlaying.trackRef?.id === track.trackRef.id && musicStore.isPlaying ? 'fas fa-volume-high' : 'fas fa-play'" aria-hidden="true"></i></span>
          <span><strong>{{ track.title }}</strong><small>{{ track.artist }}</small></span>
          <small>{{ track.album }}</small>
        </button>
      </section>
    </template>

    <section v-else class="map-journey-station-list" :aria-label="t('行程电台', 'Journey radio')">
      <button v-for="station in media.stations" :key="station.id" type="button" :disabled="station.trackCount === 0 || Boolean(busyId)" :class="{ 'is-active': media.activeStationId === station.id }" :data-testid="`map-journey-station-${station.id}`" @click="playStation(station)">
        <span><i :class="busyId === `station:${station.id}` ? 'fas fa-spinner fa-spin' : station.icon" aria-hidden="true"></i></span>
        <span><strong>{{ t(station.labelZh, station.labelEn) }}</strong><small>{{ t(station.detailZh, station.detailEn) }}</small></span>
        <small>{{ station.trackCount }}</small>
      </button>
    </section>

    <p v-if="feedback" class="map-journey-media-feedback is-error" role="status"><i class="fas fa-circle-exclamation" aria-hidden="true"></i>{{ feedback }}</p>
    <footer class="map-journey-media-actions">
      <button type="button" data-testid="map-open-music-floating" @click="openFloatingPlayer"><i class="fas fa-window-restore" aria-hidden="true"></i><span>{{ t('打开音乐浮窗', 'Open floating player') }}</span></button>
      <button type="button" data-testid="map-journey-open-music" @click="$emit('open-music')"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i><span>{{ t('进入音乐', 'Open Music') }}</span></button>
    </footer>
  </section>
</template>

<style scoped>
.map-journey-media-panel { display: grid; width: min(100%, 560px); max-height: min(78vh, 680px); overflow: hidden; border: 1px solid #d9e1dc; border-radius: 8px 8px 0 0; background: #f8faf8; color: #17211d; box-shadow: 0 -22px 60px rgba(20, 38, 29, 0.24); }
.map-journey-media-header { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 15px 16px 10px; }
.map-journey-media-header > div { display: grid; min-width: 0; gap: 2px; }
.map-journey-media-header span { color: #7d8a83; font-size: 9px; font-weight: 900; }
.map-journey-media-header h2 { font-size: 18px; font-weight: 900; line-height: 1.15; }
.map-journey-media-header small { overflow: hidden; color: #647168; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.map-journey-media-header > button { display: grid; width: 36px; height: 36px; flex: 0 0 36px; place-items: center; border-radius: 7px; background: #e9eeeb; color: #526158; }
.map-journey-media-segments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; margin: 0 16px 10px; border: 1px solid #dce3df; border-radius: 7px; background: #edf1ee; padding: 3px; }
.map-journey-media-segments button { display: inline-flex; min-height: 34px; align-items: center; justify-content: center; gap: 7px; border-radius: 5px; color: #68756e; font-size: 10px; font-weight: 850; }
.map-journey-media-segments button.is-active { background: #fff; color: #17664f; box-shadow: 0 2px 8px rgba(40, 59, 49, 0.1); }
.map-journey-now-playing { display: grid; min-width: 0; grid-template-columns: 50px minmax(0, 1fr) auto; align-items: center; gap: 10px; border-block: 1px solid #e0e6e2; background: #fff; padding: 11px 16px; }
.map-journey-album-art { display: grid; width: 50px; height: 50px; place-items: center; overflow: hidden; border-radius: 6px; background: #17664f center / cover; color: #fff; }
.map-journey-now-playing > div:nth-child(2) { display: grid; min-width: 0; gap: 2px; }
.map-journey-now-playing > div:nth-child(2) > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.map-journey-now-playing > div:nth-child(2) > span { color: #8b978f; font-size: 8px; font-weight: 900; }
.map-journey-now-playing strong { font-size: 11px; font-weight: 900; }
.map-journey-now-playing small { color: #6e7b74; font-size: 8px; }
.map-journey-transport-controls { display: grid; grid-auto-flow: column; gap: 2px; }
.map-journey-transport-controls button { display: grid; width: 32px; height: 38px; place-items: center; border-radius: 6px; color: #526158; font-size: 10px; }
.map-journey-transport-controls button.is-primary { background: #17664f; color: #fff; font-size: 13px; }
.map-journey-transport-controls button:disabled { opacity: 0.35; }
.map-journey-track-list,
.map-journey-station-list { min-height: 0; overflow-y: auto; padding: 6px 16px; }
.map-journey-track-list > button { display: grid; width: 100%; min-width: 0; min-height: 44px; grid-template-columns: 28px minmax(0, 1fr) minmax(0, 28%); align-items: center; gap: 8px; border-top: 1px solid #e2e7e4; text-align: left; }
.map-journey-track-list > button > span:first-child,
.map-journey-station-list > button > span:first-child { display: grid; width: 26px; height: 26px; place-items: center; border-radius: 6px; background: #e8f0eb; color: #17664f; font-size: 8px; }
.map-journey-track-list > button > span:nth-child(2),
.map-journey-station-list > button > span:nth-child(2) { display: grid; min-width: 0; gap: 2px; }
.map-journey-track-list strong,
.map-journey-station-list strong { overflow: hidden; font-size: 10px; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.map-journey-track-list small,
.map-journey-station-list small { overflow: hidden; color: #748179; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.map-journey-track-list > button > small,
.map-journey-station-list > button > small { text-align: right; }
.map-journey-track-list > button.is-current { color: #17664f; }
.map-journey-station-list { display: grid; gap: 6px; }
.map-journey-station-list > button { display: grid; width: 100%; min-width: 0; min-height: 54px; grid-template-columns: 32px minmax(0, 1fr) 24px; align-items: center; gap: 8px; border: 1px solid #dce3df; border-radius: 7px; background: #fff; padding: 7px 9px; text-align: left; }
.map-journey-station-list > button.is-active { border-color: #17664f; background: #edf5f1; box-shadow: inset 3px 0 #17664f; }
.map-journey-media-feedback { display: flex; align-items: center; gap: 6px; margin: 6px 16px; border: 1px solid #dfc98c; border-radius: 6px; background: #fff8e7; padding: 8px 9px; color: #765b13; font-size: 9px; font-weight: 800; }
.map-journey-media-feedback.is-error { border-color: #e1bbb7; background: #fff1f0; color: #9b3931; }
.map-journey-media-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; padding: 8px 16px calc(12px + env(safe-area-inset-bottom)); }
.map-journey-media-actions button { display: inline-flex; min-height: 38px; min-width: 0; align-items: center; justify-content: center; gap: 6px; border: 1px solid #d8e0db; border-radius: 7px; background: #fff; color: #17664f; font-size: 9px; font-weight: 900; }
.map-journey-media-actions span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 390px) { .map-journey-now-playing { grid-template-columns: 44px minmax(0, 1fr); } .map-journey-album-art { width: 44px; height: 44px; } .map-journey-transport-controls { grid-column: 1 / -1; justify-content: center; border-top: 1px solid #e4e9e6; padding-top: 6px; } }
</style>
