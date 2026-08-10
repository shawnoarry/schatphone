<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  surface: { type: Object, default: null },
  stack: { type: Array, default: () => [] },
  instance: { type: Object, default: null },
  placeName: { type: String, default: '' },
  busy: { type: Boolean, default: false },
  t: { type: Function, required: true },
})

const emit = defineEmits(['close', 'select-surface', 'choose', 'dismiss'])
const sheetRef = ref(null)

const showsStack = computed(() => !props.surface && props.stack.length > 0)
const copy = computed(() => props.instance?.text?.normalizedCopy || null)
const isActive = computed(() => props.instance?.lifecycle === 'active')
const isAvailable = computed(
  () => props.surface?.availability?.state === 'available' && props.surface?.status !== 'unavailable',
)
const consequence = computed(() => {
  const outcomeId = props.instance?.choices?.outcomeId
  return outcomeId ? copy.value?.consequenceByOutcomeId?.[outcomeId] || '' : ''
})
const statusLabel = computed(() =>
  props.surface
    ? props.t(props.surface.copy.statusLabelZh, props.surface.copy.statusLabelEn)
    : props.t('地点事件', 'Place events'),
)

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
      class="map-event-surface-sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="showsStack ? t('地点事件', 'Place events') : statusLabel"
      data-testid="map-event-surface-sheet"
      tabindex="-1"
      @keydown.esc="emit('close')"
    >
      <div class="map-event-surface-handle" aria-hidden="true"></div>

      <header class="map-event-surface-head">
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
        <span class="map-event-surface-mark" aria-hidden="true">
          <i :class="showsStack ? 'fas fa-layer-group' : 'fas fa-bolt'"></i>
        </span>
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
        <div class="map-event-surface-meta">
          <span :class="{ 'is-stale': !isAvailable }">{{ statusLabel }}</span>
          <span>{{ instance.text.source === 'ai' ? t('增强文本', 'Enhanced text') : t('本地文本', 'Local text') }}</span>
        </div>

        <div
          v-if="!isAvailable && isActive"
          class="map-event-surface-stale"
          role="status"
          data-testid="map-event-source-stale"
        >
          <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
          <span>{{ t('地点状态已变化，不能再执行选择。', 'The place state changed, so choices are no longer available.') }}</span>
        </div>

        <div class="map-event-surface-copy">
          <p class="map-event-surface-opening">{{ copy.opening }}</p>
          <p v-if="copy.environment" class="map-event-surface-environment">{{ copy.environment }}</p>
          <p
            v-for="(beat, index) in copy.dialogue"
            :key="`${beat.speakerRef}:${index}`"
            class="map-event-surface-dialogue"
          >
            {{ beat.text }}
          </p>
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
            v-for="choiceId in instance.choices.allowedIds"
            :key="choiceId"
            type="button"
            :disabled="busy || !isAvailable"
            :data-testid="`map-event-choice-${choiceId}`"
            @click="emit('choose', choiceId)"
          >
            <span>{{ copy.choiceLabels[choiceId] }}</span>
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
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
          <i class="fas fa-xmark" aria-hidden="true"></i>
          <span>{{ t('忽略', 'Dismiss') }}</span>
        </button>
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
  background: rgba(17, 24, 20, 0.32);
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

.map-event-surface-head > div { min-width: 0; }
.map-event-surface-head span { color: #8a7657; font-size: 9px; font-weight: 850; }
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
.map-event-surface-icon-button { border: 1px solid #e1d9cc; background: #fff; color: #635a4e; }
.map-event-surface-mark { background: #b45309; color: #fff; font-size: 12px; }

.map-event-surface-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 13px;
}
.map-event-surface-meta span {
  border: 1px solid #e1d7c6;
  border-radius: 5px;
  background: #f6f1e8;
  padding: 4px 7px;
  color: #705d40;
  font-size: 9px;
  font-weight: 800;
}
.map-event-surface-meta span.is-stale { border-color: #e1b9b1; background: #fff3f0; color: #94463b; }

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

.map-event-surface-copy { margin-top: 16px; }
.map-event-surface-copy p { overflow-wrap: anywhere; }
.map-event-surface-opening { font-size: 13px; font-weight: 760; line-height: 1.65; }
.map-event-surface-environment,
.map-event-surface-dialogue { margin-top: 11px; color: #665d51; font-size: 11px; line-height: 1.65; }

.map-event-surface-consequence {
  border-color: #b9d7c8;
  background: #edf7f1;
  color: #225b43;
}

.map-event-surface-choices { margin-top: 16px; border-top: 1px solid #e4ded4; }
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
.map-event-surface-choices button span,
.map-event-stack button span { min-width: 0; overflow-wrap: anywhere; }
.map-event-surface-choices button i,
.map-event-stack button > i { color: #aa987c; font-size: 8px; text-align: right; }
.map-event-surface-choices button:disabled { cursor: not-allowed; color: #a69f94; }

.map-event-surface-dismiss {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  color: #786c5d;
  font-size: 10px;
  font-weight: 800;
}

.map-event-stack { margin-top: 14px; border-top: 1px solid #e4ded4; }
.map-event-stack strong,
.map-event-stack small { display: block; overflow-wrap: anywhere; }
.map-event-stack strong { font-size: 10px; }
.map-event-stack small { margin-top: 3px; color: #887b6a; font-size: 9px; }

button:focus-visible { outline: 2px solid #a04c08; outline-offset: 2px; }

@media (min-width: 720px) {
  .map-event-surface-sheet { margin-bottom: 18px; border-radius: 8px; }
}
</style>
