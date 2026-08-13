<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, required: true },
  compact: { type: Boolean, default: false },
  interactive: { type: Boolean, default: false },
  rootActionable: { type: Boolean, default: false },
  language: { type: String, default: 'en' },
  weekday: { type: String, default: '' },
  day: { type: [Number, String], default: '' },
  location: { type: String, default: 'Tokyo' },
  condition: { type: String, default: 'Clear' },
  weatherMode: { type: String, default: 'sun' },
  systemLabel: { type: String, default: 'System' },
  batteryLabel: { type: String, default: 'Battery 86%' },
  musicStatus: { type: String, default: 'Listen Again' },
  musicTitle: { type: String, default: 'Evening Radio' },
  musicArtist: { type: String, default: 'Daily Mix' },
  musicCoverUrl: { type: String, default: '' },
  musicProgress: { type: Number, default: 34 },
  musicPlaying: { type: Boolean, default: false },
  focusActive: { type: Boolean, default: false },
  focusSeconds: { type: Number, default: 25 * 60 },
  moodIndex: { type: Number, default: 0 },
  selectedDayIndex: { type: Number, default: 3 },
  sceneMode: { type: String, default: 'day' },
  breathIndex: { type: Number, default: 0 },
  photoUrls: { type: Array, default: () => [] },
  ariaLabel: { type: String, default: '' },
})

const emit = defineEmits(['activate', 'action'])

const isChinese = computed(() => props.language.toLowerCase().startsWith('zh'))
const localize = (zh, en) => (isChinese.value ? zh : en)
const normalizedProgress = computed(() => Math.min(100, Math.max(0, props.musicProgress || 0)))
const musicCoverStyle = computed(() =>
  props.musicCoverUrl ? { backgroundImage: `url(${JSON.stringify(props.musicCoverUrl)})` } : undefined,
)
const focusTime = computed(() => {
  const seconds = Math.max(0, Number(props.focusSeconds) || 0)
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
})
const mood = computed(() => ['sun', 'cloud', 'rain', 'calm'][Math.abs(props.moodIndex) % 4])
const BREATH_MODES = Object.freeze([
  { id: 'calm', zh: '放松', en: 'RELAX', seconds: 4 },
  { id: 'balance', zh: '平衡', en: 'BALANCE', seconds: 6 },
  { id: 'deep', zh: '深眠', en: 'DEEP', seconds: 8 },
])
const breathModeIndex = computed(() => Math.abs(props.breathIndex) % BREATH_MODES.length)
const breathMode = computed(() => BREATH_MODES[breathModeIndex.value].id)
const breathLabel = computed(() => {
  const mode = BREATH_MODES[breathModeIndex.value]
  return localize(mode.zh, mode.en)
})
const breathSeconds = computed(() => `${BREATH_MODES[breathModeIndex.value].seconds}s`)
const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const waveBars = [20, 34, 54, 28, 68, 42, 82, 52, 30, 62, 88, 48, 72, 38, 58, 24, 44, 76, 46, 30, 66, 40, 22]

const emitAction = (action, detail = {}) => {
  if (!props.interactive) return
  emit('action', { action, ...detail })
}

const handleRootClick = () => {
  if (!props.interactive || !props.rootActionable) return
  emit('activate')
}

const handleRootKeydown = (event) => {
  if (!props.interactive || !props.rootActionable || !['Enter', ' '].includes(event.key)) return
  event.preventDefault()
  handleRootClick()
}
</script>

<template>
  <div
    class="home-widget-card built-in-widget-visual"
    :class="[
      `is-${variant}`,
      variant === 'weather' ? `is-weather-${weatherMode}` : null,
      variant === 'photo_note' ? `is-mood-${mood}` : null,
      variant === 'ambient_scene' ? `is-scene-${sceneMode}` : null,
      variant === 'breath_halo' ? `is-breath-${breathMode}` : null,
      {
        'is-compact': compact,
        'is-interactive': interactive,
        'is-playing': ['music', 'music_wave'].includes(variant) && musicPlaying,
        'is-focus-active': variant === 'focus_pulse' && focusActive,
      },
    ]"
    :role="interactive && rootActionable ? 'button' : undefined"
    :tabindex="interactive && rootActionable ? 0 : undefined"
    :aria-label="interactive && rootActionable ? ariaLabel : undefined"
    @click="handleRootClick"
    @keydown="handleRootKeydown"
  >
    <template v-if="variant === 'weather'">
      <div class="widget-prism-sky" aria-hidden="true">
        <span class="widget-prism-shape"></span>
        <i class="widget-prism-light"></i>
        <b class="widget-prism-rain"></b>
      </div>
      <div class="widget-prism-copy">
        <span>{{ location }}</span>
        <strong>{{ weatherMode === 'rain' ? '16°' : '24°' }}</strong>
        <small>{{ weatherMode === 'rain' ? localize('细雨', 'Soft rain') : condition }}</small>
      </div>
    </template>

    <template v-else-if="variant === 'calendar'">
      <div class="widget-orbit-date">
        <small>{{ weekday }}</small>
        <strong>{{ day }}</strong>
      </div>
      <div class="widget-orbits" aria-hidden="true">
        <span v-for="index in 5" :key="index" :style="{ '--orbit-index': index }"><i></i></span>
      </div>
      <small class="widget-orbit-caption">{{ localize('今日轨迹', 'TODAY ORBIT') }}</small>
    </template>

    <template v-else-if="variant === 'music'">
      <div class="widget-paper-cover" :style="musicCoverStyle" aria-hidden="true">
        <span v-if="!musicCoverUrl"></span>
      </div>
      <button
        v-if="interactive"
        type="button"
        class="widget-paper-player-copy is-open-control"
        :aria-label="localize('打开音乐', 'Open Music')"
        @click.stop="emitAction('open-music')"
      >
        <small>{{ musicStatus }}</small>
        <strong>{{ musicTitle }}</strong>
        <span>{{ musicArtist }}</span>
        <div class="widget-paper-progress" aria-hidden="true"><i :style="{ width: `${normalizedProgress}%` }"></i></div>
      </button>
      <div v-else class="widget-paper-player-copy">
        <small>{{ musicStatus }}</small>
        <strong>{{ musicTitle }}</strong>
        <span>{{ musicArtist }}</span>
        <div class="widget-paper-progress" aria-hidden="true"><i :style="{ width: `${normalizedProgress}%` }"></i></div>
      </div>
      <div class="widget-media-controls">
        <button v-if="interactive" type="button" :aria-label="localize('上一首', 'Previous')" @click.stop="emitAction('previous')"><i class="fas fa-backward-step"></i></button>
        <span v-else><i class="fas fa-backward-step"></i></span>
        <button v-if="interactive" type="button" class="is-primary" :aria-label="musicPlaying ? localize('暂停', 'Pause') : localize('播放', 'Play')" @click.stop="emitAction('toggle-playback')"><i :class="musicPlaying ? 'fas fa-pause' : 'fas fa-play'"></i></button>
        <span v-else class="is-primary"><i :class="musicPlaying ? 'fas fa-pause' : 'fas fa-play'"></i></span>
        <button v-if="interactive" type="button" :aria-label="localize('下一首', 'Next')" @click.stop="emitAction('next')"><i class="fas fa-forward-step"></i></button>
        <span v-else><i class="fas fa-forward-step"></i></span>
      </div>
    </template>

    <template v-else-if="variant === 'system'">
      <div class="home-widget-topline"><i class="fas fa-microchip" aria-hidden="true"></i><span>{{ systemLabel }}</span></div>
      <div class="home-widget-bottomline"><span>{{ batteryLabel }}</span></div>
      <div class="home-progress" aria-hidden="true"><div class="home-progress-fill home-progress-fill-system"></div></div>
    </template>

    <template v-else-if="variant === 'focus_pulse'">
      <div class="widget-focus-dial" aria-hidden="true">
        <span class="widget-focus-ticks"></span>
        <i :style="{ transform: focusActive ? 'rotate(98deg)' : 'rotate(36deg)' }"></i>
        <b></b>
      </div>
      <span class="widget-focus-label">{{ focusActive ? focusTime : localize('专注', 'FOCUS') }}</span>
      <small>{{ focusActive ? localize('轻触暂停', 'tap to pause') : localize('轻触开始', 'tap to start') }}</small>
    </template>

    <template v-else-if="variant === 'daily_steps'">
      <div class="widget-bead-copy"><small>{{ localize('今日步数', 'DAILY STEPS') }}</small><strong>6,842</strong></div>
      <div class="widget-bead-track" aria-hidden="true"><span v-for="index in 8" :key="index" :class="{ 'is-filled': index <= 5 }"></span></div>
      <b>68%</b>
    </template>

    <template v-else-if="variant === 'photo_note'">
      <div class="widget-shutter-window" aria-hidden="true">
        <div class="widget-shutter-art">
          <i v-if="mood === 'sun'" class="fas fa-sun"></i>
          <i v-else-if="mood === 'cloud'" class="fas fa-cloud"></i>
          <i v-else-if="mood === 'rain'" class="fas fa-cloud-rain"></i>
          <i v-else class="fas fa-face-smile"></i>
        </div>
        <span class="is-left"></span><span class="is-right"></span>
      </div>
      <div class="widget-shutter-footer"><span>{{ localize('今日心情', 'MOOD') }}</span><i></i><b>{{ ['01', '02', '03', '04'][Math.abs(moodIndex) % 4] }}</b></div>
    </template>

    <template v-else-if="variant === 'breath_halo'">
      <div class="widget-breath-stage" aria-hidden="true">
        <span
          v-for="index in 3"
          :key="index"
          class="widget-breath-ring"
          :style="{ '--ring-index': index }"
        ></span>
        <i class="widget-breath-orb"></i>
        <b class="widget-breath-star is-one"></b>
        <b class="widget-breath-star is-two"></b>
      </div>
      <div class="widget-breath-copy">
        <small>{{ breathLabel }}</small>
        <strong>{{ breathSeconds }}</strong>
        <span>{{ localize('轻触切换潮汐', 'tap to shift the tide') }}</span>
      </div>
      <div class="widget-breath-dots" aria-hidden="true">
        <i v-for="index in 3" :key="index" :class="{ 'is-active': index - 1 === breathModeIndex }"></i>
      </div>
    </template>

    <template v-else-if="variant === 'commute_strip'">
      <span class="widget-rail-home"><i class="fas fa-house"></i></span>
      <div class="widget-rail-line" aria-hidden="true">
        <i v-for="index in 6" :key="index"></i>
        <span class="widget-rail-train"><b></b><b></b><b></b></span>
      </div>
      <div class="widget-rail-copy"><strong>18 min</strong><small>{{ localize('青叶台 → 涩谷', 'Aobadai → Shibuya') }}</small></div>
      <span class="widget-rail-target"></span>
    </template>

    <template v-else-if="variant === 'today_agenda'">
      <div class="widget-agenda-date"><small>{{ localize('今日', 'TODAY') }}</small><strong>{{ day }}</strong><span>{{ weekday }}</span></div>
      <div class="widget-agenda-stack">
        <article><time>10:30</time><strong>{{ localize('设计复盘', 'Design review') }}</strong><i></i></article>
        <article><time>16:00</time><strong>{{ localize('城市散步', 'City walk') }}</strong><i></i></article>
      </div>
      <span class="widget-agenda-tab"></span>
    </template>

    <template v-else-if="variant === 'week_rhythm'">
      <div class="widget-paper-week-head"><span>{{ localize('七日月相', 'SEVEN DAYS') }}</span><strong>{{ localize('小小记录', 'quiet notes') }}</strong></div>
      <div class="widget-paper-week-grid">
        <component
          v-for="(label, index) in weekdays"
          :key="`${label}-${index}`"
          :is="interactive ? 'button' : 'div'"
          :type="interactive ? 'button' : undefined"
          :class="{ 'is-active': index === selectedDayIndex }"
          @click.stop="emitAction('select-day', { index })"
        >
          <i :style="{ '--moon-phase': `${index * 14}%` }"></i>
          <span :class="`is-paper-${(index % 4) + 1}`"></span>
          <small>{{ label }}</small>
        </component>
      </div>
      <div class="widget-paper-line" aria-hidden="true"><span v-for="index in 7" :key="index" :style="{ height: `${22 + ((index * 17) % 50)}%` }"></span></div>
    </template>

    <template v-else-if="variant === 'memory_board'">
      <div class="widget-memory-hero">
        <span class="widget-memory-tape"></span>
        <button
          v-if="interactive"
          type="button"
          class="widget-memory-photo is-hero"
          :class="{ 'has-photo': photoUrls[0] }"
          :style="photoUrls[0] ? { backgroundImage: `url(${JSON.stringify(photoUrls[0])})` } : undefined"
          :aria-label="localize('替换主照片', 'Replace main photo')"
          @click.stop="emitAction('select-photo', { index: 0 })"
        ><i v-if="!photoUrls[0]" class="fas fa-image"></i></button>
        <div v-else class="widget-memory-photo is-hero" :class="{ 'has-photo': photoUrls[0] }" :style="photoUrls[0] ? { backgroundImage: `url(${JSON.stringify(photoUrls[0])})` } : undefined"><i v-if="!photoUrls[0]" class="fas fa-image"></i></div>
        <span class="widget-memory-caption">WEEKEND / 08</span>
      </div>
      <div class="widget-memory-side">
        <template v-for="index in [1, 2]" :key="index">
          <button
            v-if="interactive"
            type="button"
            class="widget-memory-photo is-small"
            :class="{ 'has-photo': photoUrls[index] }"
            :style="photoUrls[index] ? { backgroundImage: `url(${JSON.stringify(photoUrls[index])})` } : undefined"
            :aria-label="localize(`替换照片 ${index + 1}`, `Replace photo ${index + 1}`)"
            @click.stop="emitAction('select-photo', { index })"
          ><i v-if="!photoUrls[index]" class="fas fa-plus"></i></button>
          <div v-else class="widget-memory-photo is-small" :class="{ 'has-photo': photoUrls[index] }" :style="photoUrls[index] ? { backgroundImage: `url(${JSON.stringify(photoUrls[index])})` } : undefined"><i v-if="!photoUrls[index]" class="fas fa-plus"></i></div>
        </template>
      </div>
      <div class="widget-memory-note"><strong>{{ localize('把颜色留在今天', 'Keep today in color') }}</strong><span></span><i></i></div>
    </template>

    <template v-else-if="variant === 'music_wave'">
      <div class="widget-wave-bars" aria-hidden="true">
        <i v-for="(height, index) in waveBars" :key="index" :style="{ height: `${height}%`, animationDelay: `${index * -45}ms` }"></i>
      </div>
      <div class="widget-wave-copy"><strong>{{ musicTitle }}</strong><small>{{ musicArtist }}</small></div>
      <button v-if="interactive" type="button" class="widget-wave-play" :aria-label="musicPlaying ? localize('暂停', 'Pause') : localize('播放', 'Play')" @click.stop="emitAction('toggle-playback')"><i :class="musicPlaying ? 'fas fa-pause' : 'fas fa-play'"></i></button>
      <span v-else class="widget-wave-play"><i :class="musicPlaying ? 'fas fa-pause' : 'fas fa-play'"></i></span>
    </template>

    <template v-else-if="variant === 'ambient_scene'">
      <div class="widget-ambient-landscape" aria-hidden="true"><span class="widget-ambient-orb"></span><i class="widget-ambient-veil is-one"></i><i class="widget-ambient-veil is-two"></i><b class="widget-ambient-mountain"></b></div>
      <div class="widget-ambient-copy"><small>{{ sceneMode === 'night' ? localize('夜幕', 'NIGHT VEIL') : localize('晨光', 'MORNING VEIL') }}</small><strong>{{ sceneMode === 'night' ? '22:18' : '07:42' }}</strong><span>{{ localize('轻触更换时刻', 'tap to shift the light') }}</span></div>
      <div class="widget-ambient-dots" aria-hidden="true"><i :class="{ 'is-active': sceneMode === 'day' }"></i><i></i><i :class="{ 'is-active': sceneMode === 'night' }"></i></div>
    </template>

    <template v-else-if="variant === 'world_pulse'">
      <div class="widget-world-image"><span>{{ location }}</span><strong>24°</strong></div>
      <div class="widget-world-events">
        <header><strong>WORLD PULSE</strong><i></i></header>
        <article><b class="is-coral"></b><span><strong>{{ localize('京都设计周', 'Kyoto Design Week') }}</strong><small>MAY 24–26</small></span></article>
        <article><b class="is-lilac"></b><span><strong>{{ localize('首尔音乐节', 'Seoul Music Fest') }}</strong><small>MAY 31–JUN 2</small></span></article>
        <article><b class="is-blue"></b><span><strong>{{ localize('纽约艺术漫步', 'New York Art Walk') }}</strong><small>JUN 7–9</small></span></article>
      </div>
      <div class="widget-world-people"><i v-for="index in 4" :key="index"></i><span>+12</span></div>
    </template>

    <i v-else-if="variant === 'heart'" class="fas fa-heart" aria-hidden="true"></i>
    <i v-else class="fas fa-compact-disc" aria-hidden="true"></i>
  </div>
</template>

<style scoped>
.built-in-widget-visual {
  --widget-ink: #20272b;
  isolation: isolate;
  border-radius: 18px;
  letter-spacing: 0;
}

.built-in-widget-visual.is-interactive { cursor: pointer; }
.built-in-widget-visual.is-interactive:focus-visible { outline: 2px solid rgba(66, 173, 195, 0.92); outline-offset: 2px; }
.built-in-widget-visual button { font: inherit; color: inherit; }

.is-weather {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  padding: 10px;
  color: #eef8fa;
  background: radial-gradient(circle at 82% 10%, rgba(104, 228, 234, 0.2), transparent 34%), linear-gradient(145deg, #202a31, #0b1015 72%);
}
.widget-prism-sky { position: relative; min-height: 0; }
.widget-prism-shape { position: absolute; width: 60%; aspect-ratio: 1.18; left: 22%; top: 7%; clip-path: polygon(50% 0, 100% 72%, 56% 100%, 0 68%); border: 1px solid rgba(218, 241, 246, 0.55); background: linear-gradient(135deg, rgba(255,255,255,.28), rgba(79,171,188,.08) 45%, rgba(19,27,35,.2)); box-shadow: inset 12px -18px 28px rgba(112, 224, 232, .12); transform: rotate(-7deg); transition: 420ms ease; }
.widget-prism-shape::before, .widget-prism-shape::after { content: ''; position: absolute; inset: 0; clip-path: polygon(50% 0, 56% 100%, 0 68%); border-right: 1px solid rgba(255,255,255,.35); background: linear-gradient(155deg, rgba(255,210,154,.2), transparent 62%); }
.widget-prism-light { position: absolute; width: 22px; height: 22px; left: 46%; top: 42%; border-radius: 50%; background: #ffd899; box-shadow: 0 0 18px #ffd899, 0 0 42px rgba(255,183,89,.54); transition: 320ms ease; }
.widget-prism-rain { position: absolute; inset: 12% 8%; opacity: 0; background: repeating-linear-gradient(102deg, transparent 0 12px, rgba(173,198,255,.34) 13px 14px); transform: skewX(-8deg); transition: 320ms ease; }
.is-weather-rain .widget-prism-shape { transform: rotate(5deg); border-color: rgba(184,167,255,.52); background: linear-gradient(145deg, rgba(126,105,194,.22), rgba(37,50,78,.18)); }
.is-weather-rain .widget-prism-light { width: 12px; height: 12px; background: #b7a7ff; box-shadow: 0 0 24px rgba(155,136,255,.75); }
.is-weather-rain .widget-prism-rain { opacity: 1; }
.widget-prism-copy { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 0 8px; }
.widget-prism-copy span, .widget-prism-copy small { font-size: 8px; font-weight: 750; color: rgba(230,242,245,.7); }
.widget-prism-copy strong { grid-row: 1 / span 2; grid-column: 2; font-size: 25px; line-height: .9; }

.is-calendar { display: grid; place-items: center; padding: 10px; color: #e8eef3; background: radial-gradient(circle at 70% 18%, rgba(123,99,195,.2), transparent 34%), linear-gradient(145deg, #24242a, #0e1116 76%); }
.widget-orbit-date { position: relative; z-index: 2; width: 56px; aspect-ratio: 1; display: grid; place-content: center; text-align: center; border-radius: 50%; background: rgba(16,18,23,.92); border: 1px solid rgba(231,235,242,.22); box-shadow: 0 10px 22px rgba(0,0,0,.3); }
.widget-orbit-date small { font-size: 7px; text-transform: uppercase; color: #b8b6c7; }
.widget-orbit-date strong { font-size: 22px; line-height: 1; }
.widget-orbits { position: absolute; inset: 13% 8% 18%; }
.widget-orbits > span { --radius: calc(22% + var(--orbit-index) * 7%); position: absolute; left: 50%; top: 50%; width: calc(42% + var(--orbit-index) * 8%); height: calc(18% + var(--orbit-index) * 7%); transform: translate(-50%, -50%) rotate(calc(var(--orbit-index) * 17deg)); border: 1px solid rgba(210,214,226,.18); border-radius: 50%; }
.widget-orbits i { position: absolute; width: 7px; height: 7px; top: -4px; left: calc(16% * var(--orbit-index)); border-radius: 50%; background: hsl(calc(var(--orbit-index) * 58) 54% 68%); box-shadow: 0 0 9px currentColor; }
.widget-orbit-caption { position: absolute; bottom: 9px; font-size: 7px; color: rgba(225,229,235,.55); }

.is-music { display: grid; grid-template-columns: minmax(62px, .72fr) minmax(0, 1.35fr) auto; align-items: center; gap: 10px; padding: 11px; color: #30343a; background: linear-gradient(145deg, rgba(251,248,241,.98), rgba(221,224,218,.97)); box-shadow: inset 0 1px rgba(255,255,255,.9), 0 12px 28px rgba(35,42,46,.2); }
.is-music::after { content: ''; position: absolute; inset: 6px; border: 1px dashed rgba(71,76,78,.14); border-radius: 14px; pointer-events: none; }
.widget-paper-cover { aspect-ratio: 1; min-width: 0; background-size: cover; background-position: center; background-color: #b7c9ce; border: 5px solid #f5f0e7; box-shadow: 0 5px 10px rgba(36,42,45,.18); transform: rotate(-2deg); }
.widget-paper-cover span { display: block; width: 100%; height: 100%; background: linear-gradient(155deg, #86b8ca, #dfe8e0 48%, #647f78); }
.widget-paper-player-copy { min-width: 0; display: grid; gap: 2px; text-align: left; }
.widget-paper-player-copy.is-open-control { width: 100%; border: 0; padding: 0; background: transparent; }
.widget-paper-player-copy small, .widget-paper-player-copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 8px; color: #777a78; }
.widget-paper-player-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.widget-paper-progress { height: 3px; margin-top: 5px; border-radius: 99px; background: rgba(44,56,61,.15); overflow: hidden; }
.widget-paper-progress i { display: block; height: 100%; background: #50bdc9; }
.widget-media-controls { display: grid; grid-template-columns: repeat(3, 26px); gap: 3px; align-items: center; }
.widget-media-controls button, .widget-media-controls > span { width: 26px; height: 26px; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; font-size: 10px; }
.widget-media-controls .is-primary { background: #f8f6f0; border: 1px solid rgba(54,68,74,.22); box-shadow: 0 3px 9px rgba(35,44,48,.14), 0 0 0 3px rgba(75,190,203,.12); }

.is-focus_pulse { display: grid; place-items: center; align-content: center; gap: 3px; padding: 7px; color: #f5f4ee; background: radial-gradient(circle at 32% 20%, rgba(255,255,255,.18), transparent 28%), linear-gradient(145deg, #174f9b, #08255a); box-shadow: inset 0 0 0 5px rgba(239,239,231,.12), 0 8px 20px rgba(10,31,72,.28); }
.widget-focus-dial { position: relative; width: 54%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle, #e8e4db 0 16%, #aeb5ba 17% 24%, #f6f3ea 25% 54%, #8f969c 55% 58%, #183d7a 59%); box-shadow: 0 5px 10px rgba(0,0,0,.32); }
.widget-focus-dial i { position: absolute; width: 2px; height: 35%; left: calc(50% - 1px); top: 15%; transform-origin: 50% 100%; background: #ff5e45; transition: transform 420ms cubic-bezier(.2,.9,.2,1); }
.widget-focus-dial b { position: absolute; width: 7px; height: 7px; left: calc(50% - 3.5px); top: calc(50% - 3.5px); border-radius: 50%; background: #d9d7cf; box-shadow: 0 1px 2px rgba(0,0,0,.4); }
.widget-focus-label { font-size: 9px; font-weight: 800; line-height: 1; }
.is-focus_pulse > small { font-size: 6px; color: rgba(245,244,238,.66); }
.is-focus-active .widget-focus-dial { animation: widget-focus-breathe 1.8s ease-in-out infinite; }

.is-daily_steps { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 9px; padding: 9px 11px; color: #202524; background: linear-gradient(145deg, #f5f1e8, #d9e2da); }
.widget-bead-copy { display: grid; }
.widget-bead-copy small { font-size: 6px; color: #6d746f; }.widget-bead-copy strong { font-size: 13px; }
.widget-bead-track { min-width: 0; display: flex; align-items: center; padding: 3px 6px; border-radius: 10px; background: rgba(255,255,255,.55); box-shadow: inset 0 1px 4px rgba(52,63,57,.16); }
.widget-bead-track::before { content: ''; position: absolute; left: 5px; right: 5px; height: 2px; background: #707976; }
.widget-bead-track span { position: relative; width: 12%; aspect-ratio: 1; border-radius: 50%; background: #ede9df; border: 1px solid rgba(59,67,63,.2); box-shadow: 0 2px 3px rgba(43,50,47,.15); }
.widget-bead-track span.is-filled { background: #3764b1; }.is-daily_steps > b { font-size: 11px; color: #d64f3c; }

.is-photo_note { display: grid; grid-template-rows: minmax(0,1fr) auto; gap: 6px; padding: 8px; color: #343535; background: linear-gradient(145deg, #f5f1e8, #dedbd0); }
.widget-shutter-window { position: relative; min-height: 0; border: 2px solid #f8f6ef; border-radius: 13px; overflow: hidden; background: #d7c7e3; box-shadow: inset 0 0 0 1px rgba(53,56,56,.12), 0 5px 12px rgba(40,46,47,.14); }
.widget-shutter-art { position: absolute; inset: 0; display: grid; place-items: center; font-size: 30px; color: #fff7d0; background: linear-gradient(145deg, #e76450 0 50%, #8b81c5 50%); transition: 360ms ease; }
.is-mood-cloud .widget-shutter-art { color: #fff; background: linear-gradient(145deg, #8b82c2 0 50%, #7fa9c9 50%); }.is-mood-rain .widget-shutter-art { background: linear-gradient(145deg, #3d74bd 0 50%, #315b83 50%); }.is-mood-calm .widget-shutter-art { background: linear-gradient(145deg, #70a46f 0 50%, #d6b560 50%); }
.widget-shutter-window > span { position: absolute; top: 0; bottom: 0; width: 34%; z-index: 2; background: repeating-linear-gradient(90deg, #f4f0e7 0 5px, #d8d2c7 6px 7px); border: 1px solid rgba(78,80,76,.16); transition: transform 420ms cubic-bezier(.2,.9,.2,1); }.widget-shutter-window .is-left { left: 0; transform: translateX(-78%); }.widget-shutter-window .is-right { right: 0; transform: translateX(78%); }.is-mood-cloud .widget-shutter-window .is-left, .is-mood-cloud .widget-shutter-window .is-right { transform: translateX(0); }
.widget-shutter-footer { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 7px; font-size: 7px; font-weight: 750; }.widget-shutter-footer i { width: 14px; aspect-ratio: 1; border-radius: 50%; background: #a895c4; border: 2px solid #eee9df; box-shadow: 0 2px 4px rgba(0,0,0,.2); }.widget-shutter-footer b { font-size: 8px; color: #8a8a84; }

.is-breath_halo { --breath-glow: #6ee0db; --breath-halo: rgba(110, 224, 219, .38); --breath-speed: 4s; display: grid; grid-template-rows: minmax(0,1fr) auto; padding: 10px; color: #eef7f8; background: radial-gradient(circle at 24% 14%, rgba(110,224,219,.14), transparent 38%), linear-gradient(150deg, #1b2631, #0a0f16 74%); transition: background 480ms ease; }
.is-breath-balance { --breath-glow: #c3a5f5; --breath-halo: rgba(195,165,245,.36); --breath-speed: 6s; background: radial-gradient(circle at 76% 14%, rgba(195,165,245,.16), transparent 38%), linear-gradient(150deg, #221d33, #0c0a16 74%); }
.is-breath-deep { --breath-glow: #7fa9e8; --breath-halo: rgba(127,169,232,.36); --breath-speed: 8s; background: radial-gradient(circle at 30% 82%, rgba(127,169,232,.14), transparent 42%), linear-gradient(150deg, #16202f, #070b12 78%); }
.widget-breath-stage { position: relative; min-height: 0; display: grid; place-items: center; }
.widget-breath-ring { position: absolute; width: 32%; aspect-ratio: 1; border-radius: 50%; border: 1px solid var(--breath-glow); opacity: 0; animation: widget-breath-ring var(--breath-speed) ease-out infinite; animation-delay: calc(var(--ring-index) * var(--breath-speed) / -3); transition: border-color 480ms ease; }
.widget-breath-orb { position: relative; width: 32%; aspect-ratio: 1; border-radius: 50%; background: radial-gradient(circle at 34% 30%, rgba(255,255,255,.94), var(--breath-glow) 44%, rgba(10,16,22,.4) 80%); box-shadow: 0 0 16px var(--breath-halo), 0 0 42px var(--breath-halo); animation: widget-breath-orb var(--breath-speed) ease-in-out infinite; transition: background 480ms ease, box-shadow 480ms ease; }
.widget-breath-star { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fff; box-shadow: 0 0 6px var(--breath-glow); animation: widget-breath-twinkle 2.6s ease-in-out infinite; }
.widget-breath-star.is-one { left: 16%; top: 20%; }
.widget-breath-star.is-two { right: 14%; bottom: 24%; animation-delay: -1.3s; }
.widget-breath-copy { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: end; gap: 0 8px; }
.widget-breath-copy small { font-size: 7px; font-weight: 800; color: var(--breath-glow); transition: color 480ms ease; }
.widget-breath-copy strong { grid-row: 1 / span 2; grid-column: 2; align-self: center; font-size: 21px; line-height: .9; }
.widget-breath-copy span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 7px; color: rgba(226,240,242,.55); }
.widget-breath-dots { position: absolute; right: 10px; top: 10px; display: flex; gap: 4px; }
.widget-breath-dots i { width: 4px; height: 4px; border-radius: 50%; background: rgba(235,245,246,.3); transition: 300ms ease; }
.widget-breath-dots i.is-active { background: var(--breath-glow); box-shadow: 0 0 6px var(--breath-glow); }

.is-commute_strip { display: grid; grid-template-columns: auto minmax(80px,1fr) auto auto; align-items: center; gap: 8px; padding: 7px 10px; color: #25292b; background: linear-gradient(145deg, #f6f2ea, #e1ddd3); }
.widget-rail-home { color: #e75c46; font-size: 12px; }.widget-rail-line { position: relative; height: 26px; display: flex; align-items: center; justify-content: space-between; }.widget-rail-line::before { content: ''; position: absolute; left: 0; right: 0; height: 2px; background: #444a4c; }.widget-rail-line > i { position: relative; width: 6px; height: 6px; border-radius: 50%; background: #454b4d; }.widget-rail-train { position: absolute; left: 36%; width: 41px; height: 22px; display: flex; align-items: center; justify-content: center; gap: 3px; border-radius: 8px; background: #e8e5dd; border: 1px solid #afb2ad; box-shadow: 0 4px 7px rgba(33,38,39,.18); transition: left 420ms ease; }.is-interactive:hover .widget-rail-train { left: 58%; }.widget-rail-train b { width: 8px; height: 6px; border-radius: 2px; background: #214d7e; }.widget-rail-copy { display: grid; }.widget-rail-copy strong { font-size: 12px; }.widget-rail-copy small { font-size: 7px; color: #6c706f; }.widget-rail-target { width: 12px; aspect-ratio: 1; border: 3px solid #e75c46; border-radius: 50%; }

.is-today_agenda { display: grid; grid-template-columns: 58px minmax(0,1fr) 8px; align-items: stretch; gap: 9px; padding: 9px; color: #313436; background: linear-gradient(145deg, #f5f1e7, #d9d7cf); }
.widget-agenda-date { display: grid; align-content: center; text-align: center; border-right: 1px dashed rgba(53,57,58,.2); }.widget-agenda-date small,.widget-agenda-date span { font-size: 7px; color: #797b78; }.widget-agenda-date strong { font-size: 24px; line-height: 1; }.widget-agenda-stack { display: grid; gap: 5px; align-content: center; }.widget-agenda-stack article { display: grid; grid-template-columns: 32px minmax(0,1fr) 7px; gap: 6px; align-items: center; padding: 6px 7px; border-radius: 8px; background: rgba(255,255,255,.55); box-shadow: 0 3px 7px rgba(43,48,48,.1); }.widget-agenda-stack time { font-size: 7px; }.widget-agenda-stack strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; }.widget-agenda-stack i { width: 7px; height: 7px; border-radius: 50%; background: #e55b49; }.widget-agenda-stack article + article i { background: #4b9a94; }.widget-agenda-tab { border-radius: 0 5px 5px 0; background: #d06665; }

.is-week_rhythm { display: grid; grid-template-rows: auto minmax(0,1fr) 30px; gap: 7px; padding: 10px; color: #444544; background: linear-gradient(145deg, #f7f2e8, #e7dfd2); }
.is-week_rhythm::after { content: ''; position: absolute; inset: 0; opacity: .22; background-image: linear-gradient(rgba(80,88,85,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(80,88,85,.12) 1px, transparent 1px); background-size: 18px 18px; pointer-events: none; }.widget-paper-week-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid rgba(60,65,63,.18); padding-bottom: 4px; }.widget-paper-week-head span { font-size: 7px; font-weight: 800; }.widget-paper-week-head strong { font-size: 9px; font-family: Georgia, serif; font-weight: 500; }.widget-paper-week-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 5px; min-height: 0; }.widget-paper-week-grid button, .widget-paper-week-grid > div { min-width: 0; border: 0; padding: 0; display: grid; grid-template-rows: 12px minmax(0,1fr) auto; gap: 3px; background: transparent; }.widget-paper-week-grid button > i, .widget-paper-week-grid > div > i { width: 10px; height: 10px; justify-self: center; border-radius: 50%; background: linear-gradient(90deg, #555 var(--moon-phase), transparent var(--moon-phase)); border: 1px solid #777; }.widget-paper-week-grid button > span, .widget-paper-week-grid > div > span { min-height: 0; border-radius: 2px; opacity: .72; transform: rotate(-1deg); transition: 220ms ease; }.widget-paper-week-grid .is-active > span { opacity: 1; transform: translateY(-2px) rotate(1deg); box-shadow: 0 5px 8px rgba(55,57,54,.16); }.is-paper-1{background:#d7afa7}.is-paper-2{background:#aebea5}.is-paper-3{background:#b8ccdd}.is-paper-4{background:#e2c8cd}.widget-paper-week-grid small { font-size: 6px; }.widget-paper-line { display: flex; align-items: end; gap: 5px; padding: 4px 8px; background: #b9cfdf; clip-path: polygon(0 8%,100% 0,99% 92%,1% 100%); }.widget-paper-line span { flex: 1; min-height: 3px; background: #606b70; border-radius: 4px 4px 0 0; }

.home-widget-card.built-in-widget-visual.is-weather,
.home-widget-card.built-in-widget-visual.is-calendar,
.home-widget-card.built-in-widget-visual.is-music,
.home-widget-card.built-in-widget-visual.is-focus_pulse,
.home-widget-card.built-in-widget-visual.is-daily_steps,
.home-widget-card.built-in-widget-visual.is-photo_note,
.home-widget-card.built-in-widget-visual.is-breath_halo,
.home-widget-card.built-in-widget-visual.is-commute_strip,
.home-widget-card.built-in-widget-visual.is-today_agenda,
.home-widget-card.built-in-widget-visual.is-week_rhythm,
.home-widget-card.built-in-widget-visual.is-memory_board,
.home-widget-card.built-in-widget-visual.is-music_wave,
.home-widget-card.built-in-widget-visual.is-ambient_scene,
.home-widget-card.built-in-widget-visual.is-world_pulse {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.is-memory_board { display: grid; grid-template-columns: minmax(0,1.7fr) minmax(58px,.62fr); grid-template-rows: minmax(0,1fr) auto; gap: 9px; padding: 10px; color: #454341; background: linear-gradient(145deg, #f7f0e5, #e5ddd0); }.is-memory_board::after { content:''; position:absolute; inset:0; opacity:.16; background-image: radial-gradient(#6f6b65 .6px,transparent .7px); background-size:5px 5px; pointer-events:none; }.widget-memory-hero { position: relative; min-height: 0; display: grid; grid-template-rows: minmax(0,1fr) auto; gap: 4px; }.widget-memory-tape { position: absolute; z-index: 3; top: -4px; left: 14%; width: 54px; height: 13px; background: rgba(203,181,143,.65); transform: rotate(-4deg); }.widget-memory-photo { min-height: 0; border: 0; padding: 0; background-size: cover; background-position: center; background-color: #c6d7dc; box-shadow: 0 5px 10px rgba(48,46,42,.16); }.widget-memory-photo.is-hero { width: 100%; height: 100%; border: 7px solid #fbf7ef; background-image: linear-gradient(145deg,#8ebac8,#edf0df 50%,#5e8173); }.widget-memory-photo.is-small { width: 100%; height: 100%; border: 4px solid #faf6ee; background-image: linear-gradient(145deg,#d0b2bb,#a6c2a4); }.widget-memory-photo.has-photo { background-size: cover; background-position: center; }.widget-memory-photo i { font-size: 14px; color: rgba(61,78,80,.58); }.widget-memory-caption { font: 8px Georgia, serif; }.widget-memory-side { display: grid; grid-template-rows: repeat(2,minmax(0,1fr)); gap: 7px; min-height: 0; }.widget-memory-note { grid-column: 1 / -1; display: grid; grid-template-columns: auto minmax(0,1fr) 36px; align-items: center; gap: 8px; padding: 5px 8px; background: #d24f3c; color: #fff8ed; clip-path: polygon(0 6%,99% 0,100% 94%,1% 100%); }.widget-memory-note strong { font: 9px Georgia,serif; }.widget-memory-note span { height: 1px; background: rgba(255,255,255,.5); }.widget-memory-note i { height: 12px; background: #a9c5d9; }

.is-music_wave { display: grid; grid-template-columns: minmax(0,1fr) auto auto; align-items: center; gap: 10px; padding: 8px 10px; color: #edf6f7; background: radial-gradient(circle at 76% 50%,rgba(255,126,103,.16),transparent 30%),linear-gradient(145deg,#171c22,#080b10); }.widget-wave-bars { min-width: 0; height: 72%; display: flex; align-items: center; gap: 2px; }.widget-wave-bars i { flex: 1; min-width: 1px; max-width: 4px; border-radius: 99px; background: linear-gradient(180deg,#ff8f6c,#c696eb 45%,#6ee0db); opacity: .9; }.is-playing .widget-wave-bars i { animation: widget-wave 760ms ease-in-out infinite alternate; }.widget-wave-copy { min-width: 0; display: grid; }.widget-wave-copy strong,.widget-wave-copy small { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.widget-wave-copy strong{font-size:10px}.widget-wave-copy small{font-size:7px;color:#9ca8ac}.widget-wave-play { width:28px;height:28px;border:1px solid rgba(211,235,238,.28);border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.06);color:#dff9fa;font-size:9px;box-shadow:0 0 14px rgba(111,224,219,.16); }

.is-ambient_scene { display: grid; grid-template-rows: minmax(0,1fr) auto; padding: 0; color: #f5f1ee; background: #18232b; }.widget-ambient-landscape { position:relative;min-height:0;overflow:hidden;background:radial-gradient(circle at 26% 24%,rgba(255,223,188,.5),transparent 16%),linear-gradient(180deg,#98acb2 0,#60747b 48%,#293a40 100%);transition:420ms ease; }.is-scene-night .widget-ambient-landscape { background:radial-gradient(circle at 72% 22%,rgba(198,194,255,.38),transparent 14%),linear-gradient(180deg,#111735 0,#20234d 46%,#101b2a 100%); }.widget-ambient-orb { position:absolute;width:28px;height:28px;left:21%;top:18%;border-radius:50%;background:#f7e5ca;box-shadow:0 0 30px rgba(255,225,180,.58);transition:420ms ease; }.is-scene-night .widget-ambient-orb{left:72%;width:22px;height:22px;background:#f3efff;box-shadow:inset -7px 0 #55577d,0 0 22px rgba(203,196,255,.44)}.widget-ambient-mountain{position:absolute;inset:42% -10% -8%;clip-path:polygon(0 70%,18% 28%,31% 62%,49% 8%,65% 55%,79% 25%,100% 64%,100% 100%,0 100%);background:linear-gradient(180deg,rgba(35,50,56,.72),#19282d)}.widget-ambient-veil{position:absolute;width:120%;height:44%;left:-12%;top:44%;border-radius:50%;border-top:2px solid rgba(233,246,243,.52);transform:rotate(-8deg) skewX(-18deg);box-shadow:0 -8px 24px rgba(118,222,215,.16)}.widget-ambient-veil.is-two{top:57%;transform:rotate(8deg) skewX(20deg);border-color:rgba(235,192,245,.5)}.widget-ambient-copy{position:absolute;left:13px;bottom:13px;display:grid;text-shadow:0 2px 8px rgba(0,0,0,.38)}.widget-ambient-copy small{font-size:7px;letter-spacing:0}.widget-ambient-copy strong{font-size:22px;line-height:1}.widget-ambient-copy span{font-size:7px;color:rgba(255,255,255,.64)}.widget-ambient-dots{position:absolute;right:12px;bottom:14px;display:flex;gap:5px}.widget-ambient-dots i{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.35)}.widget-ambient-dots i.is-active{background:#ffb88e;box-shadow:0 0 8px currentColor}

.is-world_pulse { display:grid;grid-template-columns:minmax(86px,.9fr) minmax(0,1.25fr);grid-template-rows:minmax(0,1fr) auto;gap:8px;padding:9px;color:#252b2d;background:linear-gradient(145deg,#f8f8f5,#e8e8e3); }.widget-world-image{position:relative;min-height:0;display:grid;align-content:end;padding:8px;border-radius:10px;color:#fff;background:linear-gradient(180deg,transparent 34%,rgba(10,30,37,.7)),linear-gradient(145deg,#80b4cb,#dbe1d2 48%,#4b796e);overflow:hidden}.widget-world-image::before{content:'';position:absolute;left:43%;bottom:0;width:9px;height:72%;background:#e95743;clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);opacity:.82}.widget-world-image span,.widget-world-image strong{position:relative;z-index:1}.widget-world-image span{font-size:8px;font-weight:800}.widget-world-image strong{font-size:12px}.widget-world-events{display:grid;align-content:start;gap:5px}.widget-world-events header{display:flex;justify-content:space-between;align-items:center}.widget-world-events header strong{font-size:8px}.widget-world-events header i{width:5px;height:5px;border-radius:50%;background:#ef5b47}.widget-world-events article{display:grid;grid-template-columns:6px minmax(0,1fr);gap:6px;align-items:center;padding:5px 6px;border-radius:7px;background:#fff;box-shadow:0 2px 5px rgba(42,47,48,.09)}.widget-world-events article>b{width:5px;height:15px;border-radius:99px}.widget-world-events .is-coral{background:#ee5c47}.widget-world-events .is-lilac{background:#a26bb8}.widget-world-events .is-blue{background:#3d86bd}.widget-world-events article span{display:grid;min-width:0}.widget-world-events article strong{font-size:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.widget-world-events article small{font-size:6px;color:#787d7e}.widget-world-people{grid-column:1/-1;display:flex;align-items:center}.widget-world-people i{width:16px;height:16px;margin-left:-3px;border:2px solid #f5f5f1;border-radius:50%;background:linear-gradient(145deg,#d59d8f,#394d54)}.widget-world-people i:first-child{margin-left:0}.widget-world-people span{margin-left:5px;font-size:7px;color:#6d7273}

.is-compact { border-radius: 12px; padding: 6px; }.is-compact .widget-prism-copy strong{font-size:17px}.is-compact .widget-prism-copy span,.is-compact .widget-prism-copy small{font-size:6px}.is-compact .widget-orbit-date{width:42px}.is-compact .widget-orbit-date strong{font-size:16px}.is-compact .widget-paper-cover{border-width:3px}.is-compact .widget-paper-player-copy strong{font-size:10px}.is-compact .widget-paper-player-copy small,.is-compact .widget-paper-player-copy span{font-size:6px}.is-compact .widget-media-controls{grid-template-columns:repeat(3,20px)}.is-compact .widget-media-controls button,.is-compact .widget-media-controls>span{width:20px;height:20px}.is-compact .widget-paper-week-head,.is-compact .widget-memory-note,.is-compact .widget-world-people{display:none}.is-compact.is-week_rhythm{grid-template-rows:minmax(0,1fr) 22px}.is-compact .widget-paper-week-grid{gap:3px}.is-compact .widget-world-events article:nth-of-type(3){display:none}.is-compact .widget-world-events article{padding:3px}.is-compact .widget-ambient-copy span{display:none}.is-compact .widget-breath-copy strong{font-size:15px}.is-compact .widget-breath-copy span{display:none}

@keyframes widget-breath-ring { 0% { transform: scale(.6); opacity: 0 } 18% { opacity: .8 } 100% { transform: scale(2.2); opacity: 0 } }
@keyframes widget-breath-orb { 0%,100% { transform: scale(.84) } 42%,58% { transform: scale(1.05) } }
@keyframes widget-breath-twinkle { 0%,100% { opacity: .25; transform: scale(.7) } 50% { opacity: 1; transform: scale(1.2) } }

@keyframes widget-wave { from { transform:scaleY(.58);opacity:.62 } to { transform:scaleY(1);opacity:1 } }
@keyframes widget-focus-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
@media (prefers-reduced-motion: reduce) { .built-in-widget-visual *, .built-in-widget-visual *::before, .built-in-widget-visual *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; } }
</style>
