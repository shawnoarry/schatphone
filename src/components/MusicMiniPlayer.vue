<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { MUSIC_REPEAT_MODES } from '../lib/music-contract'
import { buildReturnSourceQuery, normalizeHomePageQuery } from '../lib/navigation-return'
import { useMusicStore } from '../stores/music'
import { useSystemStore } from '../stores/system'

const route = useRoute()
const router = useRouter()
const musicStore = useMusicStore()
const systemStore = useSystemStore()
const { t } = useI18n()
const mode = ref('music')
const busyId = ref('')
const feedback = ref('')
const chatControlsExpanded = ref(false)

const track = computed(() => musicStore.currentTrack)
const media = computed(() => musicStore.floatingPlayerMedia)
const visible = computed(
  () =>
    musicStore.floatingPlayerVisible &&
    route.path !== '/music' &&
    route.path !== '/lock' &&
    !systemStore.isLocked,
)
const isHomeRoute = computed(() => route.path === '/home')
const isMapRoute = computed(() => route.path === '/map')
const isChatRoute = computed(() => route.path.startsWith('/chat'))
const hasBottomControls = computed(
  () =>
    isChatRoute.value ||
    route.path === '/food-delivery' ||
    route.path === '/shopping',
)
const progress = computed(() => {
  const duration = Number(musicStore.runtime.duration || track.value?.durationSec || 0)
  if (!duration) return 0
  return Math.max(0, Math.min(100, (Number(musicStore.runtime.currentTime || 0) / duration) * 100))
})
const coverStyle = computed(() =>
  track.value?.coverUrl
    ? { backgroundImage: `url(${JSON.stringify(track.value.coverUrl)})` }
    : undefined,
)
const repeatModeLabel = computed(() => {
  if (musicStore.state.playback.repeatMode === MUSIC_REPEAT_MODES.ALL) {
    return t('列表循环', 'Repeat all')
  }
  if (musicStore.state.playback.repeatMode === MUSIC_REPEAT_MODES.ONE) {
    return t('单曲循环', 'Repeat one')
  }
  return t('顺序播放', 'Play in order')
})
const playbackContinuationCopy = computed(() => {
  if (musicStore.state.playback.repeatMode === MUSIC_REPEAT_MODES.ALL) {
    return t('队列结束后从头继续', 'Restart the queue after its last track')
  }
  if (musicStore.state.playback.repeatMode === MUSIC_REPEAT_MODES.ONE) {
    return t('当前歌曲结束后重新播放', 'Replay the current track when it ends')
  }
  return t('歌曲结束后自动播放下一首，队列末尾停止', 'Continue to the next track, then stop at the end')
})
const shuffleLabel = computed(() =>
  musicStore.state.playback.shuffle ? t('随机播放', 'Shuffle on') : t('按队列顺序', 'Queue order'),
)

const musicRouteQuery = () => {
  if (route.path === '/home') {
    const homePage = normalizeHomePageQuery(route.query.homePage)
    return buildReturnSourceQuery('home', route, homePage ? { homePage } : {})
  }
  if (route.path.startsWith('/settings') || route.path === '/appearance' || route.path === '/widgets') {
    return buildReturnSourceQuery('settings', route)
  }
  if (route.path.startsWith('/chat')) {
    const chatId = String(route.params.id || '').trim()
    return {
      source: 'chat',
      ...(chatId ? { chatId } : {}),
      ...(normalizeHomePageQuery(route.query.homePage)
        ? { homePage: normalizeHomePageQuery(route.query.homePage) }
        : {}),
    }
  }
  if (route.path.startsWith('/map')) {
    const homePage = normalizeHomePageQuery(route.query.homePage)
    return { source: 'map', ...(homePage ? { homePage } : {}) }
  }
  return {}
}

const openMusic = () => router.push({ path: '/music', query: musicRouteQuery() })
const toggleExpanded = () =>
  musicStore.setFloatingPlayerExpanded(!musicStore.floatingPlayerExpanded)

watch(
  [isChatRoute, visible],
  ([active, isVisible]) => {
    if (!active || !isVisible) chatControlsExpanded.value = false
    if (active && musicStore.floatingPlayerExpanded) {
      musicStore.setFloatingPlayerExpanded(false)
    }
  },
  { immediate: true },
)

const handleTrackAction = () => {
  if (isChatRoute.value && !chatControlsExpanded.value) {
    chatControlsExpanded.value = true
    return
  }
  openMusic()
}

const collapseChatControls = () => {
  chatControlsExpanded.value = false
}

const closeFloatingPlayer = () => {
  chatControlsExpanded.value = false
  musicStore.closeFloatingPlayer()
}

const errorMessage = (code) => {
  if (code === 'LOCAL_MEDIA_MISSING') return t('本地音频已不在此设备', 'The local audio file is missing')
  if (code === 'PLAYBACK_GESTURE_REQUIRED') return t('再次轻点播放以继续', 'Tap play again to continue')
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

const togglePlayback = async () => {
  const firstTrack = media.value.quickTracks[0]
  await runPlaybackAction('toggle', () =>
    track.value
      ? musicStore.togglePlayback()
      : firstTrack
        ? musicStore.playFloatingTrack(firstTrack.trackRef.id)
        : Promise.resolve({ ok: false, code: 'QUEUE_EMPTY' }),
  )
  if (isChatRoute.value) collapseChatControls()
}

const playQuickTrack = (item) =>
  runPlaybackAction(`track:${item.trackRef.id}`, () =>
    musicStore.playFloatingTrack(item.trackRef.id),
  )

const playStation = (station) =>
  runPlaybackAction(`station:${station.id}`, () => musicStore.playFloatingRadio(station.id))
</script>

<template>
  <transition name="music-mini">
    <aside
      v-if="visible"
      class="music-mini-player"
      :class="{
        'is-home-route': isHomeRoute,
        'is-map-route': isMapRoute,
        'is-chat-route': isChatRoute,
        'is-chat-controls-open': isChatRoute && chatControlsExpanded,
        'has-bottom-controls': hasBottomControls,
        'is-expanded': musicStore.floatingPlayerExpanded,
        'is-collapsed': !isChatRoute && !musicStore.floatingPlayerExpanded,
      }"
      data-testid="music-mini-player"
      :aria-label="t('音乐浮窗', 'Music floating player')"
    >
      <div class="music-mini-bar">
        <button
          class="music-mini-track"
          type="button"
          :title="isChatRoute && !chatControlsExpanded ? t('展开音乐控制', 'Expand music controls') : t('打开音乐', 'Open Music')"
          :aria-label="isChatRoute && !chatControlsExpanded ? t('展开音乐控制', 'Expand music controls') : t('打开音乐', 'Open Music')"
          :aria-expanded="isChatRoute ? chatControlsExpanded : undefined"
          @click="handleTrackAction"
        >
          <span class="music-mini-cover" :style="coverStyle">
            <i v-if="!track?.coverUrl" :class="media.activeStationId ? 'fas fa-tower-broadcast' : 'fas fa-music'" aria-hidden="true"></i>
          </span>
          <span v-if="isChatRoute && !chatControlsExpanded" class="music-chat-edge-cue" aria-hidden="true">
            <i class="fas fa-chevron-left"></i>
          </span>
          <span class="music-mini-copy">
            <strong>{{ track?.title || t('音乐与电台', 'Music & Radio') }}</strong>
            <small>{{ track?.artist || t('选择音乐或电台', 'Choose music or radio') }}</small>
          </span>
        </button>

        <div v-if="!isChatRoute || chatControlsExpanded" class="music-mini-controls">
          <template v-if="!isChatRoute && musicStore.floatingPlayerExpanded">
            <button type="button" :disabled="!track" :title="t('上一首', 'Previous')" @click="runPlaybackAction('previous', musicStore.previous)">
              <i class="fas fa-backward-step" aria-hidden="true"></i>
            </button>
          </template>
          <button
            class="music-mini-toggle"
            type="button"
            :title="musicStore.isPlaying ? t('暂停', 'Pause') : t('播放', 'Play')"
            @click="togglePlayback"
          >
            <i :class="busyId === 'toggle' ? 'fas fa-spinner fa-spin' : musicStore.isPlaying ? 'fas fa-pause' : 'fas fa-play'" aria-hidden="true"></i>
          </button>
          <button
            v-if="isChatRoute"
            type="button"
            data-testid="music-chat-collapse"
            :title="t('收回屏幕边缘', 'Collapse to screen edge')"
            :aria-label="t('收回屏幕边缘', 'Collapse to screen edge')"
            @click="collapseChatControls"
          >
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
          <template v-if="!isChatRoute">
            <button v-if="musicStore.floatingPlayerExpanded" type="button" :disabled="!track" :title="t('下一首', 'Next')" @click="runPlaybackAction('next', () => musicStore.next())">
              <i class="fas fa-forward-step" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              data-testid="music-floating-expand"
              :title="musicStore.floatingPlayerExpanded ? t('收起浮窗', 'Collapse player') : t('展开浮窗', 'Expand player')"
              :aria-expanded="musicStore.floatingPlayerExpanded"
              @click="toggleExpanded"
            >
              <i :class="musicStore.floatingPlayerExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up'" aria-hidden="true"></i>
            </button>
          </template>
          <button type="button" data-testid="music-floating-close" :title="t('关闭浮窗', 'Close player')" @click="closeFloatingPlayer">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div v-if="musicStore.floatingPlayerExpanded && !isChatRoute" class="music-floating-content" data-testid="music-floating-content">
        <div class="music-floating-playback-policy" data-testid="music-floating-playback-policy">
          <span>
            <strong>{{ repeatModeLabel }}</strong>
            <small>{{ playbackContinuationCopy }}</small>
          </span>
          <div>
            <button
              type="button"
              data-testid="music-floating-shuffle"
              :class="{ 'is-active': musicStore.state.playback.shuffle }"
              :aria-pressed="musicStore.state.playback.shuffle"
              :title="shuffleLabel"
              @click="musicStore.toggleShuffle"
            >
              <i class="fas fa-shuffle" aria-hidden="true"></i><span>{{ shuffleLabel }}</span>
            </button>
            <button
              type="button"
              data-testid="music-floating-repeat"
              :class="{ 'is-active': musicStore.state.playback.repeatMode !== MUSIC_REPEAT_MODES.OFF }"
              :title="t(`当前：${repeatModeLabel}，点击切换`, `Current: ${repeatModeLabel}. Click to change`)"
              @click="musicStore.cycleRepeatMode"
            >
              <i :class="musicStore.state.playback.repeatMode === MUSIC_REPEAT_MODES.ONE ? 'fas fa-repeat' : 'fas fa-retweet'" aria-hidden="true"></i><span>{{ repeatModeLabel }}</span>
            </button>
          </div>
        </div>

        <div class="music-floating-segments" role="tablist" :aria-label="t('音频类型', 'Audio type')">
          <button type="button" role="tab" :aria-selected="mode === 'music'" :class="{ 'is-active': mode === 'music' }" data-testid="music-floating-music-tab" @click="mode = 'music'">
            <i class="fas fa-music" aria-hidden="true"></i><span>{{ t('音乐', 'Music') }}</span>
          </button>
          <button type="button" role="tab" :aria-selected="mode === 'radio'" :class="{ 'is-active': mode === 'radio' }" data-testid="music-floating-radio-tab" @click="mode = 'radio'">
            <i class="fas fa-tower-broadcast" aria-hidden="true"></i><span>{{ t('电台', 'Radio') }}</span>
          </button>
        </div>

        <section v-if="mode === 'music'" class="music-floating-list" :aria-label="t('快速选择', 'Quick picks')">
          <button
            v-for="item in media.quickTracks"
            :key="item.trackRef.id"
            type="button"
            :class="{ 'is-current': track?.id === item.trackRef.id }"
            :data-testid="`music-floating-track-${item.trackRef.id}`"
            @click="playQuickTrack(item)"
          >
            <span class="music-floating-item-icon"><i :class="busyId === `track:${item.trackRef.id}` ? 'fas fa-spinner fa-spin' : track?.id === item.trackRef.id && musicStore.isPlaying ? 'fas fa-volume-high' : 'fas fa-play'" aria-hidden="true"></i></span>
            <span><strong>{{ item.title }}</strong><small>{{ item.artist }}</small></span>
            <small>{{ item.album }}</small>
          </button>
        </section>

        <section v-else class="music-floating-stations" :aria-label="t('电台', 'Radio stations')">
          <button
            v-for="station in media.stations"
            :key="station.id"
            type="button"
            :disabled="station.trackCount === 0 || Boolean(busyId)"
            :class="{ 'is-active': media.activeStationId === station.id }"
            :data-testid="`music-floating-station-${station.id}`"
            @click="playStation(station)"
          >
            <span class="music-floating-station-icon"><i :class="busyId === `station:${station.id}` ? 'fas fa-spinner fa-spin' : station.icon" aria-hidden="true"></i></span>
            <span><strong>{{ t(station.labelZh, station.labelEn) }}</strong><small>{{ t(station.detailZh, station.detailEn) }}</small></span>
            <small>{{ station.trackCount }}</small>
          </button>
        </section>

        <p v-if="feedback" class="music-floating-feedback" role="status"><i class="fas fa-circle-exclamation" aria-hidden="true"></i>{{ feedback }}</p>
        <button class="music-floating-open-app" type="button" data-testid="music-floating-open-app" @click="openMusic">
          <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i><span>{{ t('进入音乐', 'Open Music') }}</span>
        </button>
      </div>

      <span v-if="track" class="music-mini-progress" aria-hidden="true">
        <span :style="{ width: `${progress}%` }"></span>
      </span>
    </aside>
  </transition>
</template>

<style scoped>
.music-mini-player {
  position: absolute;
  right: 0;
  bottom: calc(24px + env(safe-area-inset-bottom));
  left: auto;
  width: min(292px, calc(100% - 8px));
  z-index: 44;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-right: 0;
  border-radius: 28px 0 0 28px;
  color: #f8fafc;
  background: rgba(20, 23, 28, 0.94);
  box-shadow: 0 18px 40px rgba(6, 9, 13, 0.3);
  backdrop-filter: blur(22px) saturate(1.2);
  -webkit-backdrop-filter: blur(22px) saturate(1.2);
  transition: width 180ms cubic-bezier(0.2, 0.8, 0.2, 1), right 180ms ease, border-radius 180ms ease, box-shadow 160ms ease;
}

.music-mini-player.is-home-route { bottom: calc(124px + env(safe-area-inset-bottom)); }
.music-mini-player.has-bottom-controls { bottom: calc(78px + env(safe-area-inset-bottom)); }
.music-mini-player.is-chat-route { top: 50%; right: 0; bottom: auto; left: auto; width: 44px; border-right: 0; border-radius: 8px 0 0 8px; box-shadow: -10px 12px 26px rgba(6, 9, 13, 0.24); transform: translateY(-50%); transition: width 180ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 160ms ease; }
.music-mini-player.is-chat-route.is-chat-controls-open { width: min(244px, calc(100% - 10px)); box-shadow: -16px 16px 34px rgba(6, 9, 13, 0.3); }
.music-mini-player.is-map-route { bottom: calc(224px + env(safe-area-inset-bottom)); }
.music-mini-player.is-expanded { right: 12px; width: min(420px, calc(100% - 24px)); max-height: min(620px, calc(100% - 48px)); border-right: 1px solid rgba(255, 255, 255, 0.24); border-radius: 12px; box-shadow: 0 22px 54px rgba(6, 9, 13, 0.36); }
.music-mini-player.is-map-route.is-expanded { top: 124px; right: 14px; bottom: auto; width: min(380px, calc(100% - 28px)); max-height: calc(100% - 142px); }

.music-mini-bar { display: grid; min-height: 58px; grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
.music-mini-track { display: grid; min-width: 0; grid-template-columns: 42px minmax(0, 1fr); align-items: center; gap: 10px; padding: 8px 4px 8px 8px; color: inherit; text-align: left; }
.music-mini-cover { display: grid; width: 42px; height: 42px; place-items: center; overflow: hidden; border-radius: 5px; color: rgba(255, 255, 255, 0.9); background-color: #82313c; background-position: center; background-size: cover; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12); }
.music-mini-copy { display: grid; min-width: 0; gap: 2px; }
.music-mini-copy strong,
.music-mini-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.music-mini-copy strong { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 700; line-height: 1.2; }
.music-mini-copy small { color: rgba(248, 250, 252, 0.62); font-size: 10px; line-height: 1.25; }

.music-mini-controls { display: grid; grid-auto-flow: column; align-items: center; gap: 0; padding: 0 6px 0 0; }
.music-mini-controls button { display: grid; width: 30px; height: 40px; place-items: center; border-radius: 5px; color: rgba(248, 250, 252, 0.76); font-size: 10px; transition: color 140ms ease, transform 140ms ease, background 140ms ease; }
.music-mini-controls button:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
.music-mini-controls button:active { transform: scale(0.92); }
.music-mini-controls button:disabled { opacity: 0.28; }
.music-mini-controls .music-mini-toggle { color: #fff; font-size: 14px; }
.music-mini-player.is-collapsed .music-mini-controls { padding-right: 8px; }
.music-mini-player.is-collapsed .music-mini-track { grid-template-columns: 38px minmax(0, 1fr); gap: 8px; padding: 8px 2px 8px 9px; }
.music-mini-player.is-collapsed .music-mini-cover { width: 38px; height: 38px; border-radius: 50%; }
.music-mini-player.is-collapsed .music-mini-copy strong { font-size: 12px; }
.music-mini-player.is-collapsed .music-mini-copy small { font-size: 9px; }

.music-mini-player.is-chat-route .music-mini-bar { min-height: 48px; }
.music-mini-player.is-chat-route .music-mini-track { position: relative; }
.music-mini-player.is-chat-route:not(.is-chat-controls-open) .music-mini-bar { grid-template-columns: 1fr; }
.music-mini-player.is-chat-route:not(.is-chat-controls-open) .music-mini-track { width: 44px; grid-template-columns: 34px; justify-items: center; gap: 0; padding: 7px 5px; }
.music-mini-player.is-chat-route:not(.is-chat-controls-open) .music-mini-cover { width: 34px; height: 34px; }
.music-mini-player.is-chat-route:not(.is-chat-controls-open) .music-mini-copy { display: none; }
.music-chat-edge-cue { position: absolute; top: 50%; left: 1px; display: grid; width: 10px; height: 18px; place-items: center; border-radius: 0 4px 4px 0; color: rgba(255, 255, 255, 0.76); background: rgba(8, 10, 13, 0.72); font-size: 7px; transform: translateY(-50%); }
.music-mini-player.is-chat-route.is-chat-controls-open .music-mini-track { grid-template-columns: 32px minmax(0, 1fr); gap: 7px; padding: 6px 2px 6px 6px; }
.music-mini-player.is-chat-route.is-chat-controls-open .music-mini-cover { width: 32px; height: 32px; }
.music-mini-player.is-chat-route.is-chat-controls-open .music-mini-copy strong { font-size: 11px; }
.music-mini-player.is-chat-route.is-chat-controls-open .music-mini-copy small { font-size: 8px; }
.music-mini-player.is-chat-route .music-mini-controls { padding-right: 3px; }
.music-mini-player.is-chat-route .music-mini-controls button { width: 28px; height: 36px; }
.music-mini-player.is-chat-route button:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.92); outline-offset: -3px; }

.music-floating-content { min-height: 0; overflow-y: auto; border-top: 1px solid rgba(255, 255, 255, 0.1); background: #f6f8f6; color: #17211d; }
.music-floating-playback-policy { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 11px 12px 0; }
.music-floating-playback-policy > span { display: grid; min-width: 0; gap: 2px; }
.music-floating-playback-policy strong { color: #24372d; font-size: 10px; font-weight: 900; }
.music-floating-playback-policy small { color: #748078; font-size: 8px; line-height: 1.35; }
.music-floating-playback-policy > div { display: grid; grid-auto-flow: column; gap: 4px; }
.music-floating-playback-policy button { display: inline-flex; min-height: 30px; align-items: center; justify-content: center; gap: 5px; border: 1px solid #dbe3de; border-radius: 999px; background: #fff; padding: 0 9px; color: #66736c; font-size: 8px; font-weight: 850; }
.music-floating-playback-policy button.is-active { border-color: #8bb4a4; background: #e9f3ee; color: #17664f; }
.music-floating-playback-policy button span { white-space: nowrap; }
.music-floating-segments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px; margin: 10px 12px 8px; border: 1px solid #dce3df; border-radius: 7px; background: #e9eeeb; padding: 3px; }
.music-floating-segments button { display: inline-flex; min-height: 34px; align-items: center; justify-content: center; gap: 6px; border-radius: 5px; color: #6c7972; font-size: 10px; font-weight: 850; }
.music-floating-segments button.is-active { background: #fff; color: #17664f; box-shadow: 0 2px 7px rgba(28, 48, 37, 0.1); }

.music-floating-list,
.music-floating-stations { display: grid; min-height: 0; max-height: 330px; overflow-y: auto; padding: 0 12px 6px; }
.music-floating-list > button { display: grid; width: 100%; min-width: 0; min-height: 45px; grid-template-columns: 28px minmax(0, 1fr) minmax(0, 29%); align-items: center; gap: 8px; border-top: 1px solid #e0e6e2; color: #2d3f35; text-align: left; }
.music-floating-list > button.is-current { color: #17664f; }
.music-floating-list > button > span:nth-child(2),
.music-floating-stations > button > span:nth-child(2) { display: grid; min-width: 0; gap: 2px; }
.music-floating-list strong,
.music-floating-stations strong { overflow: hidden; font-size: 10px; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.music-floating-list small,
.music-floating-stations small { overflow: hidden; color: #75827b; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.music-floating-list > button > small { text-align: right; }
.music-floating-item-icon { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 5px; background: #e8f0eb; color: #17664f; font-size: 8px; }

.music-floating-stations { gap: 6px; }
.music-floating-stations > button { display: grid; width: 100%; min-width: 0; min-height: 54px; grid-template-columns: 36px minmax(0, 1fr) 24px; align-items: center; gap: 9px; border: 1px solid #dce3df; border-radius: 7px; background: #fff; padding: 7px 9px; color: #304239; text-align: left; }
.music-floating-stations > button.is-active { border-color: #17664f; background: #edf5f1; box-shadow: inset 3px 0 #17664f; }
.music-floating-stations > button:disabled { opacity: 0.48; }
.music-floating-station-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 6px; background: #e8f0eb; color: #17664f; }
.music-floating-stations > button > small { text-align: center; }

.music-floating-feedback { display: flex; align-items: center; gap: 6px; margin: 4px 12px; border: 1px solid #e1bbb7; border-radius: 6px; background: #fff1f0; padding: 8px 9px; color: #9b3931; font-size: 9px; font-weight: 800; }
.music-floating-open-app { display: inline-flex; width: calc(100% - 24px); min-height: 38px; align-items: center; justify-content: center; gap: 7px; margin: 7px 12px 11px; border-top: 1px solid #dfe5e1; color: #17664f; font-size: 9px; font-weight: 900; }
.music-mini-progress { position: absolute; right: 0; bottom: 0; left: 0; height: 2px; overflow: hidden; background: rgba(255, 255, 255, 0.12); }
.music-mini-progress > span { display: block; height: 100%; background: #dc5868; transition: width 180ms linear; }

.music-mini-enter-active,
.music-mini-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.music-mini-enter-from,
.music-mini-leave-to { opacity: 0; transform: translateY(10px); }
.music-mini-enter-from.is-chat-route,
.music-mini-leave-to.is-chat-route { transform: translate(8px, -50%); }

@media (min-width: 760px) {
  .music-mini-player { right: 0; bottom: 28px; width: min(300px, calc(100vw - 24px)); }
  .music-mini-player.is-expanded { right: 24px; width: min(420px, calc(100vw - 48px)); }
  .music-mini-player.is-home-route { bottom: calc(124px + env(safe-area-inset-bottom)); }
  :global(.screen:has(.music-mini-player.is-chat-route) .chat-shell) { padding-right: 44px; box-shadow: inset -44px 0 var(--chat-thread-bg); }
  .music-mini-player.is-map-route { right: 0; bottom: 24px; }
  .music-mini-player.is-map-route.is-expanded { right: 24px; }
  .music-mini-player.is-map-route.is-expanded { top: 126px; bottom: auto; }
}

@media (max-width: 520px) {
  .music-mini-player.is-collapsed { width: min(252px, calc(100% - 6px)); }
  .music-mini-controls button { width: 27px; }
  .music-mini-track { grid-template-columns: 38px minmax(0, 1fr); gap: 8px; }
  .music-mini-cover { width: 38px; height: 38px; }
  .music-floating-playback-policy { grid-template-columns: 1fr; }
  .music-floating-playback-policy > div { justify-content: start; }
}

@media (prefers-reduced-motion: reduce) {
  .music-mini-player,
  .music-mini-player.is-chat-route,
  .music-mini-controls button,
  .music-mini-progress > span { transition: none; }
}
</style>
