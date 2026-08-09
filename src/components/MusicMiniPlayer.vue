<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { buildReturnSourceQuery, normalizeHomePageQuery } from '../lib/navigation-return'
import { useMusicStore } from '../stores/music'
import { useSystemStore } from '../stores/system'

const route = useRoute()
const router = useRouter()
const musicStore = useMusicStore()
const systemStore = useSystemStore()
const { t } = useI18n()

const track = computed(() => musicStore.currentTrack)
const visible = computed(
  () =>
    Boolean(track.value && musicStore.runtime.sessionActive) &&
    route.path !== '/music' &&
    route.path !== '/lock' &&
    !systemStore.isLocked,
)
const isHomeRoute = computed(() => route.path === '/home')
const hasBottomControls = computed(
  () =>
    route.path.startsWith('/chat') ||
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
  if (route.path.startsWith('/map')) return { source: 'map' }
  return {}
}

const openMusic = () => router.push({ path: '/music', query: musicRouteQuery() })
</script>

<template>
  <transition name="music-mini">
    <aside
      v-if="visible"
      class="music-mini-player"
      :class="{ 'is-home-route': isHomeRoute, 'has-bottom-controls': hasBottomControls }"
      data-testid="music-mini-player"
      :aria-label="t('迷你播放器', 'Mini player')"
    >
      <button
        class="music-mini-track"
        type="button"
        :title="t('打开音乐', 'Open Music')"
        @click="openMusic"
      >
        <span class="music-mini-cover" :style="coverStyle">
          <i v-if="!track.coverUrl" class="fas fa-music" aria-hidden="true"></i>
        </span>
        <span class="music-mini-copy">
          <strong>{{ track.title }}</strong>
          <small>{{ track.artist }}</small>
        </span>
      </button>

      <div class="music-mini-controls">
        <button type="button" :title="t('上一首', 'Previous')" @click="musicStore.previous">
          <i class="fas fa-backward-step" aria-hidden="true"></i>
        </button>
        <button
          class="music-mini-toggle"
          type="button"
          :title="musicStore.isPlaying ? t('暂停', 'Pause') : t('播放', 'Play')"
          @click="musicStore.togglePlayback"
        >
          <i :class="musicStore.isPlaying ? 'fas fa-pause' : 'fas fa-play'" aria-hidden="true"></i>
        </button>
        <button type="button" :title="t('下一首', 'Next')" @click="musicStore.next()">
          <i class="fas fa-forward-step" aria-hidden="true"></i>
        </button>
      </div>

      <span class="music-mini-progress" aria-hidden="true">
        <span :style="{ width: `${progress}%` }"></span>
      </span>
    </aside>
  </transition>
</template>

<style scoped>
.music-mini-player {
  position: absolute;
  right: 12px;
  bottom: calc(24px + env(safe-area-inset-bottom));
  left: 12px;
  z-index: 44;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 58px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 8px;
  color: #f8fafc;
  background: rgba(20, 23, 28, 0.92);
  box-shadow: 0 16px 34px rgba(6, 9, 13, 0.28);
  backdrop-filter: blur(22px) saturate(1.2);
  -webkit-backdrop-filter: blur(22px) saturate(1.2);
}

.music-mini-player.is-home-route {
  bottom: calc(116px + env(safe-area-inset-bottom));
}

.music-mini-player.has-bottom-controls {
  bottom: calc(78px + env(safe-area-inset-bottom));
}

.music-mini-track {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  min-width: 0;
  align-items: center;
  gap: 10px;
  padding: 8px 6px 8px 8px;
  color: inherit;
  text-align: left;
}

.music-mini-cover {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  flex: 0 0 42px;
  overflow: hidden;
  border-radius: 5px;
  color: rgba(255, 255, 255, 0.88);
  background-color: #82313c;
  background-position: center;
  background-size: cover;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.music-mini-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.music-mini-copy strong,
.music-mini-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-mini-copy strong {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.music-mini-copy small {
  color: rgba(248, 250, 252, 0.62);
  font-size: 10px;
  line-height: 1.25;
}

.music-mini-controls {
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  gap: 1px;
  padding: 0 7px 0 2px;
}

.music-mini-controls button {
  display: grid;
  width: 32px;
  height: 40px;
  place-items: center;
  color: rgba(248, 250, 252, 0.78);
  font-size: 11px;
  transition: color 140ms ease, transform 140ms ease;
}

.music-mini-controls button:active {
  transform: scale(0.92);
}

.music-mini-controls .music-mini-toggle {
  color: #fff;
  font-size: 15px;
}

.music-mini-progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.12);
}

.music-mini-progress > span {
  display: block;
  height: 100%;
  background: #dc5868;
  transition: width 180ms linear;
}

.music-mini-enter-active,
.music-mini-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.music-mini-enter-from,
.music-mini-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (min-width: 760px) {
  .music-mini-player {
    right: 24px;
    bottom: 28px;
    left: auto;
    width: min(380px, calc(100vw - 48px));
  }

  .music-mini-player.is-home-route {
    bottom: calc(116px + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .music-mini-player,
  .music-mini-controls button,
  .music-mini-progress > span {
    transition: none;
  }
}
</style>
