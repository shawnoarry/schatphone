<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'

const props = defineProps({
  session: { type: Object, required: true },
  projection: { type: Object, required: true },
  eventRecord: { type: Object, default: null },
})

const emit = defineEmits([
  'pause',
  'resume',
  'complete',
  'toggle-minimized',
  'resolve-event',
])
const { t } = useI18n()

const formatDuration = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.ceil(Number(milliseconds || 0) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const primaryTimeLabel = computed(() =>
  props.session.status === 'completed'
    ? formatDuration(props.projection.elapsedMs)
    : formatDuration(props.projection.remainingMs),
)
const progressValue = computed(() => Math.round(props.projection.progress * 100))
const statusLabel = computed(() => {
  const labels = {
    planned: ['准备中', 'Ready'],
    running: ['专注中', 'Focusing'],
    paused: ['已暂停', 'Paused'],
    completed: ['已完成', 'Completed'],
    cancelled: ['已结束', 'Ended'],
  }
  const pair = labels[props.session.status] || labels.planned
  return t(pair[0], pair[1])
})

const policyLabel = computed(() =>
  props.session.completionPolicy === 'duration_sufficient'
    ? t('计时结束即满足', 'Duration completes the step')
    : t('由你确认完成', 'You confirm completion'),
)
const timeContextLabel = computed(() =>
  props.session.status === 'completed'
    ? t('实际专注时长', 'Focused time')
    : policyLabel.value,
)
const hasPendingEvent = computed(() => props.eventRecord?.status === 'pending')
</script>

<template>
  <section
    class="focus-companion"
    :class="{ 'is-minimized': session.presentation.minimized }"
    data-testid="activity-focus-companion"
    :aria-label="t('活动专注计时', 'Activity focus timer')"
  >
    <template v-if="session.presentation.minimized">
      <span class="focus-companion__pulse" aria-hidden="true"></span>
      <div class="focus-companion__compact-copy">
        <small>{{ hasPendingEvent ? t('节奏选择待处理', 'Rhythm choice pending') : statusLabel }}</small>
        <strong data-testid="activity-session-remaining">{{ primaryTimeLabel }}</strong>
      </div>
      <button
        type="button"
        class="focus-companion__icon-button"
        data-testid="activity-session-expand"
        :aria-label="t('展开专注计时', 'Expand focus timer')"
        @click="emit('toggle-minimized', false)"
      >
        <i class="fas fa-up-right-and-down-left-from-center" aria-hidden="true"></i>
      </button>
    </template>

    <template v-else>
      <div class="focus-companion__scene" aria-hidden="true">
        <span class="focus-companion__sun"></span>
        <span class="focus-companion__ridge focus-companion__ridge--back"></span>
        <span class="focus-companion__ridge focus-companion__ridge--front"></span>
      </div>

      <div class="focus-companion__header">
        <div>
          <p>{{ t('Focus Companion', 'Focus Companion') }}</p>
          <strong>{{ statusLabel }}</strong>
        </div>
        <button
          type="button"
          class="focus-companion__icon-button"
          data-testid="activity-session-minimize"
          :aria-label="t('最小化专注计时', 'Minimize focus timer')"
          @click="emit('toggle-minimized', true)"
        >
          <i class="fas fa-minus" aria-hidden="true"></i>
        </button>
      </div>

      <div class="focus-companion__time">
        <strong data-testid="activity-session-remaining">{{ primaryTimeLabel }}</strong>
        <span>{{ timeContextLabel }}</span>
      </div>

      <div
        class="focus-companion__progress"
        role="progressbar"
        :aria-label="t('活动计时进度', 'Activity timer progress')"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progressValue"
      >
        <span :style="{ width: `${progressValue}%` }"></span>
      </div>

      <section
        v-if="hasPendingEvent"
        class="focus-companion__event"
        data-testid="activity-session-event-text"
        aria-live="polite"
        :aria-label="t('活动节奏选择', 'Activity rhythm choice')"
      >
        <p class="focus-companion__event-kicker">{{ t('途中节奏检查', 'Mid-session rhythm check') }}</p>
        <h3>{{ t(eventRecord.titleZh, eventRecord.titleEn) }}</h3>
        <p>{{ t(eventRecord.summaryZh, eventRecord.summaryEn) }}</p>
        <p class="focus-companion__event-detail">
          {{ t(eventRecord.detailZh, eventRecord.detailEn) }}
        </p>
        <div class="focus-companion__event-actions">
          <button
            type="button"
            class="focus-companion__secondary"
            data-testid="activity-session-event-keep-rhythm"
            @click="emit('resolve-event', 'keep_rhythm')"
          >
            {{ t('保持原节奏', 'Keep rhythm') }}
          </button>
          <button
            type="button"
            class="focus-companion__event-primary"
            data-testid="activity-session-event-add-buffer"
            @click="emit('resolve-event', 'add_recovery_buffer')"
          >
            {{ t('增加 2 分钟缓冲', 'Add 2-minute buffer') }}
          </button>
        </div>
      </section>

      <p v-if="projection.awaitingUserConfirmation" class="focus-companion__notice">
        {{ t('预计时长已到，请确认这项活动是否完成。', 'The planned duration has elapsed. Confirm whether the activity is complete.') }}
      </p>
      <p v-else-if="session.status === 'completed'" class="focus-companion__notice">
        {{ t('计时证据已交回行程，由行程确认活动结果。', 'Timing evidence was returned to Agenda Journey for owner validation.') }}
      </p>

      <div v-if="!projection.isTerminal" class="focus-companion__actions">
        <button
          v-if="projection.canPause"
          type="button"
          class="focus-companion__secondary"
          data-testid="activity-session-pause"
          @click="emit('pause')"
        >
          <i class="fas fa-pause" aria-hidden="true"></i>{{ t('暂停', 'Pause') }}
        </button>
        <button
          v-if="projection.canResume"
          type="button"
          class="focus-companion__secondary"
          data-testid="activity-session-resume"
          @click="emit('resume')"
        >
          <i class="fas fa-play" aria-hidden="true"></i>{{ t('继续', 'Resume') }}
        </button>
        <button
          v-if="projection.canComplete"
          type="button"
          class="focus-companion__primary"
          data-testid="agenda-activity-complete"
          @click="emit('complete')"
        >
          <i class="fas fa-check" aria-hidden="true"></i>{{ t('结束并确认完成', 'Finish and confirm') }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.focus-companion {
  min-width: 0;
  margin-top: 16px;
  overflow: hidden;
  border: 1px solid rgba(39, 95, 89, 0.16);
  border-radius: 22px;
  background: rgba(248, 251, 247, 0.92);
  box-shadow: 0 18px 40px rgba(26, 49, 43, 0.1);
}

.focus-companion__scene {
  position: relative;
  height: 112px;
  overflow: hidden;
  background: linear-gradient(155deg, #d8e9e0 0%, #f0d9b7 72%, #efc799 100%);
}

.focus-companion__sun {
  position: absolute;
  top: 22px;
  right: 17%;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 248, 218, 0.92);
  box-shadow: 0 0 28px rgba(255, 237, 189, 0.72);
}

.focus-companion__ridge {
  position: absolute;
  left: -7%;
  bottom: -43px;
  width: 114%;
  height: 104px;
  border-radius: 52% 48% 0 0;
  transform: rotate(-3deg);
  background: #729589;
}

.focus-companion__ridge--front {
  left: 19%;
  bottom: -60px;
  width: 96%;
  height: 112px;
  transform: rotate(5deg);
  background: #3f6c63;
}

.focus-companion__header,
.focus-companion__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.focus-companion__header {
  justify-content: space-between;
  padding: 16px 18px 0;
}

.focus-companion__header p,
.focus-companion__header strong {
  margin: 0;
}

.focus-companion__header p {
  color: #4d746b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.focus-companion__header strong {
  display: block;
  margin-top: 3px;
  font-size: 14px;
}

.focus-companion__icon-button {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  color: #315f56;
  background: rgba(49, 95, 86, 0.09);
}

.focus-companion__time {
  padding: 14px 18px 12px;
  display: grid;
  gap: 4px;
}

.focus-companion__time strong {
  font-size: clamp(38px, 7vw, 58px);
  line-height: 1;
  letter-spacing: -0.055em;
  font-variant-numeric: tabular-nums;
}

.focus-companion__time span,
.focus-companion__notice {
  color: #687770;
  font-size: 12px;
  line-height: 1.5;
}

.focus-companion__event {
  min-width: 0;
  margin: 14px 18px 0;
  padding: 14px;
  overflow-wrap: anywhere;
  border: 1px solid rgba(129, 100, 61, 0.18);
  border-radius: 16px;
  background: rgba(255, 250, 240, 0.88);
}

.focus-companion__event-kicker,
.focus-companion__event h3,
.focus-companion__event p {
  margin: 0;
}

.focus-companion__event-kicker {
  color: #8b683d;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.focus-companion__event h3 {
  margin-top: 5px;
  color: #302c27;
  font-size: 15px;
  line-height: 1.35;
}

.focus-companion__event p:not(.focus-companion__event-kicker) {
  margin-top: 7px;
  color: #6b6258;
  font-size: 12px;
  line-height: 1.5;
}

.focus-companion__event-detail {
  color: #8a8178 !important;
  font-size: 11px !important;
}

.focus-companion__event-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.focus-companion__event-actions button {
  min-width: 0;
  min-height: 44px;
  padding: 9px 10px;
  border-radius: 12px;
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 750;
}

.focus-companion__event-primary {
  border: 0;
  color: #fff;
  background: #7c5c36;
}

.focus-companion__progress {
  height: 6px;
  margin: 0 18px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(36, 65, 58, 0.09);
}

.focus-companion__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4f897b, #d8a96e);
}

.focus-companion__notice {
  margin: 12px 18px 0;
}

.focus-companion__actions {
  flex-wrap: wrap;
  padding: 16px 18px 18px;
}

.focus-companion__actions button {
  min-height: 44px;
  border-radius: 999px;
  padding: 10px 15px;
  font-weight: 750;
}

.focus-companion__actions i {
  margin-right: 7px;
}

.focus-companion__primary {
  border: 0;
  color: #fff;
  background: #315f56;
}

.focus-companion__secondary {
  border: 1px solid rgba(39, 95, 89, 0.14);
  color: #315f56;
  background: rgba(255, 255, 255, 0.78);
}

.focus-companion.is-minimized {
  min-height: 64px;
  padding: 9px 10px 9px 15px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
}

.focus-companion__pulse {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4f897b;
  box-shadow: 0 0 0 6px rgba(79, 137, 123, 0.11);
}

.focus-companion__compact-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.focus-companion__compact-copy small {
  overflow: hidden;
  color: #687770;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focus-companion__compact-copy strong {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

button:focus-visible {
  outline: 3px solid rgba(37, 116, 103, 0.28);
  outline-offset: 2px;
}

@media (max-width: 520px) {
  .focus-companion__scene { height: 92px; }
  .focus-companion__time strong { font-size: 42px; }
  .focus-companion__actions { align-items: stretch; flex-direction: column; }
  .focus-companion__actions button { width: 100%; }
  .focus-companion__event-actions { grid-template-columns: 1fr; }
  .focus-companion__event-actions button { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; }
}
</style>
