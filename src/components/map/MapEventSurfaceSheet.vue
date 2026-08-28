<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  surface: { type: Object, default: null },
  stack: { type: Array, default: () => [] },
  instance: { type: Object, default: null },
  placeName: { type: String, default: '' },
  media: { type: Object, default: null },
  preview: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  t: { type: Function, required: true },
})

const emit = defineEmits(['close', 'select-surface', 'choose', 'dismiss'])
const sheetRef = ref(null)

const showsStack = computed(() => !props.surface && props.stack.length > 0)
const copy = computed(() => props.instance?.text?.normalizedCopy || null)
const isActive = computed(() => props.instance?.lifecycle === 'active')
const isAvailable = computed(
  () =>
    props.surface?.availability?.state === 'available' && props.surface?.status !== 'unavailable',
)
const consequence = computed(() => {
  const outcomeId = props.instance?.choices?.outcomeId
  return outcomeId ? copy.value?.consequenceByOutcomeId?.[outcomeId] || '' : ''
})
const statusLabel = computed(() =>
  props.preview
    ? props.t('测试预览', 'Test preview')
    : props.surface
    ? props.t(props.surface.copy.statusLabelZh, props.surface.copy.statusLabelEn)
    : props.t('地点事件', 'Place events'),
)
const mediaUrl = computed(() => props.media?.asset?.url || '')
const mediaAlt = computed(() => {
  if (!props.media?.asset) return ''
  return props.t(props.media.asset.altZh || '', props.media.asset.altEn || '')
})
const mediaLabel = computed(() => {
  if (!props.media) return props.t('场景示意', 'Scene fallback')
  return props.t(props.media.labelZh || '地点影像', props.media.labelEn || 'Place image')
})

watch(
  () => props.surface?.id || props.stack.map((item) => item.id).join(':'),
  async () => {
    await nextTick()
    sheetRef.value?.focus()
  },
  { immediate: true },
)
</script>

<template>
  <div class="map-event-surface-backdrop" @click.self="emit('close')">
    <section
      ref="sheetRef"
      :class="['map-event-surface-sheet', { 'is-cinematic': !showsStack }]"
      role="dialog"
      aria-modal="true"
      :aria-label="showsStack ? t('地点事件', 'Place events') : statusLabel"
      data-testid="map-event-surface-sheet"
      tabindex="-1"
      @keydown.esc="emit('close')"
    >
      <div v-if="showsStack" class="map-event-surface-handle" aria-hidden="true"></div>

      <header :class="['map-event-surface-head', { 'is-over-scene': !showsStack }]">
        <button
          type="button"
          class="map-event-surface-icon-button"
          :aria-label="t('返回地点', 'Back to place')"
          data-testid="map-event-return"
          @click="emit('close')"
        >
          <i class="fas fa-chevron-left" aria-hidden="true"></i>
        </button>
        <div>
          <span>{{ placeName || t('地图', 'Map') }}</span>
          <h2>{{ showsStack ? t('地点事件', 'Place events') : copy?.title || statusLabel }}</h2>
        </div>
        <span v-if="showsStack" class="map-event-surface-mark" aria-hidden="true">
          <i class="fas fa-layer-group"></i>
        </span>
        <span v-else class="map-event-surface-sequence" aria-hidden="true">SCENE 01</span>
      </header>

      <div v-if="showsStack" class="map-event-stack" data-testid="map-event-stack">
        <button
          v-for="item in stack"
          :key="item.id"
          type="button"
          @click="emit('select-surface', item.id)"
        >
          <span>
            <strong>{{ t(item.copy.titleZh, item.copy.titleEn) }}</strong>
            <small>{{ t(item.copy.statusLabelZh, item.copy.statusLabelEn) }}</small>
          </span>
          <i class="fas fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>

      <template v-else-if="surface && instance && copy">
        <div class="map-event-scene" :class="{ 'has-media': mediaUrl }">
          <img
            v-if="mediaUrl"
            class="map-event-scene-image"
            :src="mediaUrl"
            :alt="mediaAlt"
            data-testid="map-event-scene-image"
          />
          <div v-else class="map-event-scene-fallback" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          <div class="map-event-scene-shade" aria-hidden="true"></div>
          <div class="map-event-scene-caption">
            <span
              ><i class="fas fa-location-dot" aria-hidden="true"></i
              >{{ placeName || t('当前地点', 'Current place') }}</span
            >
            <small>{{ mediaLabel }}</small>
          </div>
        </div>

        <div class="map-event-story-panel">
          <div class="map-event-surface-meta">
            <span :class="{ 'is-stale': !isAvailable }">{{ statusLabel }}</span>
            <span>{{
              instance.text.source === 'ai'
                ? t('增强叙事', 'Enhanced text')
                : t('本地文本', 'Local text')
            }}</span>
          </div>

          <div
            v-if="!isAvailable && isActive"
            class="map-event-surface-stale"
            role="status"
            data-testid="map-event-source-stale"
          >
            <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
            <span>{{
              t(
                '地点状态已变化，不能再执行选择。',
                'The place state changed, so choices are no longer available.',
              )
            }}</span>
          </div>

          <div class="map-event-surface-copy">
            <span class="map-event-story-kicker">{{
              preview
                ? t('测试 · 场景', 'TEST · SCENE')
                : t('抵达 · 现场', 'ARRIVAL · ON LOCATION')
            }}</span>
            <p class="map-event-surface-opening">{{ copy.opening }}</p>
            <p v-if="copy.environment" class="map-event-surface-environment">
              {{ copy.environment }}
            </p>
            <div v-if="copy.dialogue?.length" class="map-event-dialogue-sequence">
              <p
                v-for="(beat, index) in copy.dialogue"
                :key="`${beat.speakerRef}:${index}`"
                class="map-event-surface-dialogue"
              >
                <span aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
                {{ beat.text }}
              </p>
            </div>
          </div>

          <div
            v-if="consequence"
            class="map-event-surface-consequence"
            data-testid="map-event-consequence"
            role="status"
          >
            <i class="fas fa-check" aria-hidden="true"></i>
            <p>{{ consequence }}</p>
          </div>

          <div v-if="isActive" class="map-event-surface-choices" data-testid="map-event-choices">
            <button
              v-for="(choiceId, index) in instance.choices.allowedIds"
              :key="choiceId"
              type="button"
              :disabled="busy || !isAvailable"
              :data-testid="`map-event-choice-${choiceId}`"
              @click="emit('choose', choiceId)"
            >
              <small aria-hidden="true">0{{ index + 1 }}</small>
              <span>{{ copy.choiceLabels[choiceId] }}</span>
              <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </button>
          </div>

          <button
            v-if="isActive"
            type="button"
            class="map-event-surface-dismiss"
            data-testid="map-event-dismiss"
            :disabled="busy"
            @click="emit('dismiss')"
          >
            <i class="fas fa-door-open" aria-hidden="true"></i>
            <span>{{ t('暂时离开现场', 'Leave for now') }}</span>
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.map-event-surface-backdrop {
  position: fixed;
  inset: 0;
  z-index: 76;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(9, 12, 14, 0.76);
  backdrop-filter: blur(8px);
}

.map-event-surface-sheet {
  width: min(100%, 720px);
  max-height: min(82vh, 680px);
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid #dfd8ca;
  border-radius: 8px 8px 0 0;
  background: #fcfbf8;
  padding: 8px 18px calc(20px + env(safe-area-inset-bottom));
  color: #251f18;
  box-shadow: 0 -16px 46px rgba(31, 25, 17, 0.2);
}

.map-event-surface-sheet.is-cinematic {
  position: relative;
  display: grid;
  width: min(100%, 820px);
  height: min(100dvh, 920px);
  max-height: 100dvh;
  grid-template-rows: 1fr;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: #101417;
  padding: 0;
  color: #f7f3ec;
  box-shadow: 0 0 80px rgba(0, 0, 0, 0.48);
}

.map-event-surface-handle {
  width: 38px;
  height: 4px;
  margin: 0 auto 12px;
  border-radius: 999px;
  background: #d2cabd;
}

.map-event-surface-head {
  display: grid;
  min-width: 0;
  grid-template-columns: 38px minmax(0, 1fr) 38px;
  align-items: start;
  gap: 11px;
}

.map-event-surface-head.is-over-scene {
  position: absolute;
  z-index: 4;
  top: 0;
  left: 0;
  width: 100%;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  padding: calc(12px + env(safe-area-inset-top)) 15px 12px;
  color: #fff;
  background: linear-gradient(180deg, rgba(7, 10, 12, 0.72), transparent);
}
.map-event-surface-head.is-over-scene span {
  color: rgba(255, 255, 255, 0.68);
}
.map-event-surface-head.is-over-scene h2 {
  color: #fff;
  font-family: Georgia, 'Noto Serif CJK SC', serif;
  font-weight: 700;
}
.map-event-surface-head.is-over-scene .map-event-surface-icon-button {
  width: 44px;
  height: 44px;
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(13, 17, 19, 0.38);
  color: #fff;
  backdrop-filter: blur(10px);
}
.map-event-surface-sequence {
  align-self: center;
  padding-left: 10px;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0;
}

.map-event-surface-head > div {
  min-width: 0;
}
.map-event-surface-head span {
  color: #8a7657;
  font-size: 9px;
  font-weight: 850;
}
.map-event-surface-head h2 {
  margin-top: 3px;
  overflow-wrap: anywhere;
  font-size: 18px;
  font-weight: 850;
  line-height: 1.3;
}

.map-event-surface-icon-button,
.map-event-surface-mark {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 7px;
}
.map-event-surface-icon-button {
  border: 1px solid #e1d9cc;
  background: #fff;
  color: #635a4e;
}
.map-event-surface-mark {
  background: #b45309;
  color: #fff;
  font-size: 12px;
}

.map-event-story-panel .map-event-surface-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 0;
}
.map-event-story-panel .map-event-surface-meta span {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.07);
  padding: 4px 7px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 9px;
  font-weight: 800;
}
.map-event-story-panel .map-event-surface-meta span.is-stale {
  border-color: #d89084;
  background: rgba(124, 42, 31, 0.5);
  color: #ffd9d2;
}

.map-event-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #1a2426;
}
.map-event-scene-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: map-event-camera-settle 7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.map-event-scene-fallback {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, #405358 0%, #253438 46%, #10171a 100%);
}
.map-event-scene-fallback span {
  position: absolute;
  display: block;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(184, 207, 207, 0.07);
}
.map-event-scene-fallback span:nth-child(1) {
  inset: 14% 11% 48% 12%;
}
.map-event-scene-fallback span:nth-child(2) {
  inset: 54% 56% 17% 12%;
}
.map-event-scene-fallback span:nth-child(3) {
  inset: 54% 12% 17% 48%;
}
.map-event-scene-shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(5, 7, 8, 0.18) 0%,
      rgba(5, 7, 8, 0.02) 32%,
      rgba(5, 7, 8, 0.68) 64%,
      #101417 88%
    ),
    linear-gradient(90deg, rgba(4, 8, 9, 0.22), transparent 55%);
}
.map-event-scene-caption {
  position: absolute;
  top: clamp(92px, 16vh, 150px);
  left: 20px;
  display: grid;
  gap: 5px;
  max-width: calc(100% - 40px);
  color: #fff;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.65);
}
.map-event-scene-caption span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 850;
}
.map-event-scene-caption small {
  color: rgba(255, 255, 255, 0.68);
  font-size: 9px;
  font-weight: 700;
}

.map-event-story-panel {
  position: relative;
  z-index: 3;
  align-self: end;
  max-height: min(66dvh, 610px);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 22px 20px calc(18px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent 0, rgba(16, 20, 23, 0.9) 34px, #101417 92px);
  scrollbar-width: thin;
}

.map-event-surface-stale,
.map-event-surface-consequence {
  display: grid;
  min-width: 0;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  margin-top: 13px;
  border: 1px solid #e2bbb3;
  border-radius: 7px;
  background: #fff4f1;
  padding: 10px;
  color: #8a4439;
  font-size: 10px;
  font-weight: 750;
  line-height: 1.5;
}

.map-event-story-panel .map-event-surface-stale,
.map-event-story-panel .map-event-surface-consequence {
  margin-top: 13px;
}
.map-event-surface-copy {
  margin-top: 15px;
}
.map-event-surface-copy p {
  overflow-wrap: anywhere;
}
.map-event-story-kicker {
  color: #d5b66f;
  font-size: 9px;
  font-weight: 900;
}
.map-event-surface-opening {
  margin-top: 7px;
  font-family: Georgia, 'Noto Serif CJK SC', serif;
  font-size: 19px;
  font-weight: 650;
  line-height: 1.48;
}
.map-event-surface-environment,
.map-event-surface-dialogue {
  margin-top: 10px;
  color: rgba(247, 243, 236, 0.72);
  font-size: 12px;
  line-height: 1.65;
}
.map-event-dialogue-sequence {
  margin-top: 13px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  padding-top: 3px;
}
.map-event-surface-dialogue {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 9px;
}
.map-event-surface-dialogue > span {
  padding-top: 1px;
  color: #d5b66f;
  font-size: 9px;
  font-weight: 850;
}

.map-event-surface-consequence {
  border-color: rgba(122, 188, 158, 0.42);
  background: rgba(31, 92, 65, 0.42);
  color: #d8f6e7;
}

.map-event-surface-choices {
  display: grid;
  gap: 7px;
  margin-top: 17px;
}
.map-event-surface-choices button,
.map-event-stack button {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 52px;
  grid-template-columns: minmax(0, 1fr) 12px;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #e4ded4;
  color: #5d431f;
  font-size: 10px;
  font-weight: 850;
  text-align: left;
}
.map-event-surface-choices button {
  min-height: 56px;
  grid-template-columns: 23px minmax(0, 1fr) 18px;
  border: 1px solid rgba(255, 255, 255, 0.19);
  border-radius: 6px;
  background: rgba(245, 241, 232, 0.09);
  padding: 0 13px;
  color: #fff;
  font-size: 12px;
  backdrop-filter: blur(12px);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}
.map-event-surface-choices button small {
  color: #d5b66f;
  font-size: 9px;
  font-weight: 900;
}
.map-event-surface-choices button:not(:disabled):hover,
.map-event-surface-choices button:not(:disabled):focus-visible {
  border-color: rgba(213, 182, 111, 0.72);
  background: rgba(213, 182, 111, 0.14);
}
.map-event-surface-choices button:not(:disabled):active {
  transform: scale(0.985);
}
.map-event-surface-choices button span,
.map-event-stack button span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.map-event-surface-choices button i,
.map-event-stack button > i {
  color: #aa987c;
  font-size: 8px;
  text-align: right;
}
.map-event-surface-choices button:disabled {
  cursor: not-allowed;
  opacity: 0.46;
}

.map-event-surface-dismiss {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  min-height: 44px;
  color: rgba(255, 255, 255, 0.58);
  font-size: 10px;
  font-weight: 800;
}

.map-event-stack {
  margin-top: 14px;
  border-top: 1px solid #e4ded4;
}
.map-event-stack strong,
.map-event-stack small {
  display: block;
  overflow-wrap: anywhere;
}
.map-event-stack strong {
  font-size: 10px;
}
.map-event-stack small {
  margin-top: 3px;
  color: #887b6a;
  font-size: 9px;
}

button:focus-visible {
  outline: 2px solid #a04c08;
  outline-offset: 2px;
}

@keyframes map-event-camera-settle {
  from {
    transform: scale(1.045) translate3d(0, -0.5%, 0);
    filter: saturate(0.78) brightness(0.78);
  }
  to {
    transform: scale(1.01) translate3d(0, 0, 0);
    filter: saturate(0.94) brightness(0.88);
  }
}

@media (min-width: 720px) {
  .map-event-surface-sheet {
    margin-bottom: 18px;
    border-radius: 8px;
  }
  .map-event-surface-sheet.is-cinematic {
    height: min(92dvh, 880px);
    margin-bottom: 4dvh;
    border-radius: 8px;
  }
  .map-event-story-panel {
    padding-right: 32px;
    padding-left: 32px;
  }
}

@media (max-width: 380px) {
  .map-event-story-panel {
    padding-right: 14px;
    padding-left: 14px;
  }
  .map-event-surface-opening {
    font-size: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .map-event-scene-image {
    animation: none;
    transform: none;
  }
  .map-event-surface-choices button {
    transition: none;
  }
}
</style>
