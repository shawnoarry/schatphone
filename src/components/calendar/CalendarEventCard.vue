<script setup>
import { useI18n } from '../../composables/useI18n'

defineProps({
  event: {
    type: Object,
    required: true,
  },
  relatedKnowledgePoints: {
    type: Array,
    default: () => [],
  },
  formattedStartsAt: {
    type: String,
    required: true,
  },
  formattedInputStartsAt: {
    type: String,
    required: true,
  },
  isTimeEdited: {
    type: Boolean,
    default: false,
  },
  quickShiftOptions: {
    type: Array,
    default: () => [],
  },
  pushStatusMeta: {
    type: Object,
    required: true,
  },
  pushDetail: {
    type: String,
    required: true,
  },
  pushHistory: {
    type: Array,
    default: () => [],
  },
  departureProjection: {
    type: Object,
    default: null,
  },
  departureTransportModes: {
    type: Array,
    default: () => [],
  },
  selectedDepartureMode: {
    type: String,
    default: '',
  },
  activeJourney: {
    type: Object,
    default: null,
  },
  otherJourneyActive: {
    type: Boolean,
    default: false,
  },
  departureFeedback: {
    type: Object,
    default: null,
  },
  relationshipContactOptions: {
    type: Array,
    default: () => [],
  },
  selectedRelationshipContactId: {
    type: String,
    default: '',
  },
  relationshipSuggestion: {
    type: Object,
    default: null,
  },
  relationshipReview: {
    type: Object,
    default: null,
  },
  relationshipFeedback: {
    type: Object,
    default: null,
  },
  formatPushHistoryEntry: {
    type: Function,
    required: true,
  },
  formatDateTime: {
    type: Function,
    required: true,
  },
  formatClockTime: {
    type: Function,
    required: true,
  },
  getDepartureTransportLabel: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'update-starts-at',
  'shift-starts-at',
  'reset-starts-at',
  'delete-event',
  'update-departure-mode',
  'start-travel',
  'open-journey',
  'open-worldbook',
  'update-relationship-contact',
  'record-relationship',
])

const { t } = useI18n()

const recurrenceLabel = (value) => {
  if (value === 'daily') return t('每天重复', 'Repeats daily')
  if (value === 'weekly') return t('每周重复', 'Repeats weekly')
  if (value === 'monthly') return t('每月重复', 'Repeats monthly')
  if (value === 'yearly') return t('每年重复', 'Repeats yearly')
  return t('不重复', 'Does not repeat')
}

const reminderLeadLabel = (minutes) => {
  const lead = Math.max(0, Number(minutes) || 0)
  if (lead === 0) return t('开始时提醒', 'Reminder at start')
  if (lead % 10080 === 0) {
    const weeks = lead / 10080
    return t(`提前 ${weeks} 周提醒`, `${weeks} week${weeks === 1 ? '' : 's'} before`)
  }
  if (lead % 1440 === 0) {
    const days = lead / 1440
    return t(`提前 ${days} 天提醒`, `${days} day${days === 1 ? '' : 's'} before`)
  }
  if (lead % 60 === 0) {
    const hours = lead / 60
    return t(`提前 ${hours} 小时提醒`, `${hours} hour${hours === 1 ? '' : 's'} before`)
  }
  return t(`提前 ${lead} 分钟提醒`, `${lead} minutes before`)
}

const departureUnavailableCopy = (code) => {
  if (code === 'map_pack_mismatch') {
    return t(
      '当前位置与预约地点不在同一张地图，不能跨世界猜测路线。',
      'The current position and appointment are on different maps, so no cross-world route is inferred.',
    )
  }
  if (code === 'destination_stale' || code === 'destination_off_pack') {
    return t(
      '预约地点已失效或不属于当前地图，请先修正地点。',
      'The appointment place is stale or outside the current map. Update it before departing.',
    )
  }
  if (code === 'current_position_missing') {
    return t(
      '地图还没有可用于估算的当前位置。',
      'Map does not have a current position that can be used for an estimate yet.',
    )
  }
  return t(
    '当前无法生成可靠的出发估算。',
    'A reliable departure estimate is not available right now.',
  )
}
</script>

<template>
  <article :data-testid="`calendar-event-card-${event.id}`" class="calendar-event-card">
    <header class="calendar-event-card__header">
      <span class="calendar-event-card__icon" aria-hidden="true">
        <i :class="event.icon"></i>
      </span>
      <div class="calendar-event-card__heading">
        <p class="calendar-event-card__time">{{ formattedStartsAt }}</p>
        <h3 class="calendar-event-card__title">
          {{ t(event.titleZh, event.titleEn) }}
        </h3>
      </div>
      <div class="calendar-event-card__header-actions">
        <span v-if="event.pinned" class="calendar-event-badge calendar-status--info">
          {{ t('已固定', 'Pinned') }}
        </span>
        <button
          type="button"
          class="calendar-event-action calendar-event-action--delete"
          :data-testid="`calendar-event-delete-${event.id}`"
          @click="emit('delete-event', event)"
        >
          {{ t('Delete', 'Delete') }}
        </button>
      </div>
    </header>
    <p v-if="event.summaryZh || event.summaryEn" class="calendar-event-card__summary">
      {{ t(event.summaryZh, event.summaryEn) }}
    </p>

    <div class="calendar-event-card__meta" data-testid="calendar-event-meta">
      <span :class="event.requirement === 'optional' ? 'calendar-status--neutral' : 'calendar-status--info'">
        <i :class="event.requirement === 'optional' ? 'far fa-circle' : 'fas fa-circle-check'" aria-hidden="true"></i>
        {{ event.requirement === 'optional' ? t('可选', 'Optional') : t('必需', 'Required') }}
      </span>
      <span>
        <i :class="event.allDay ? 'far fa-sun' : 'far fa-clock'" aria-hidden="true"></i>
        {{ event.allDay ? t('全天', 'All day') : t('有明确时段', 'Timed') }}
      </span>
      <span>
        <i class="fas fa-rotate" aria-hidden="true"></i>
        {{ recurrenceLabel(event.recurrence) }}
      </span>
      <span>
        <i class="far fa-bell" aria-hidden="true"></i>
        {{ reminderLeadLabel(event.reminderLeadMinutes) }}
      </span>
      <span v-if="event.locationRef">
        <i class="fas fa-location-dot" aria-hidden="true"></i>
        {{ t(event.locationRef.labelZh, event.locationRef.labelEn) }}
      </span>
    </div>

    <section v-if="event.notesZh || event.notesEn" class="calendar-event-section calendar-event-notes">
      <p class="calendar-event-section__label">{{ t('备注', 'Notes') }}</p>
      <p>{{ t(event.notesZh, event.notesEn) }}</p>
    </section>

    <section
      v-if="event.locationRef && !event.allDay"
      class="calendar-event-section calendar-event-departure"
      :data-testid="`calendar-event-departure-${event.id}`"
    >
      <div class="calendar-event-departure__header">
        <div>
          <p class="calendar-event-section__label">{{ t('出发准备', 'Departure readiness') }}</p>
          <p
            v-if="activeJourney"
            class="calendar-event-departure__headline"
            :data-testid="`calendar-event-departure-status-${event.id}`"
          >
            {{
              activeJourney.status === 'arrived'
                ? t('已到达，等待确认', 'Arrived, awaiting review')
                : t('已从当前位置出发', 'Journey started from the current position')
            }}
          </p>
          <p
            v-else-if="departureProjection?.ready"
            class="calendar-event-departure__headline"
            :data-testid="`calendar-event-departure-status-${event.id}`"
          >
            {{ departureProjection.origin.labelZh || departureProjection.origin.detail }}
            <span aria-hidden="true">→</span>
            {{ t(departureProjection.destination.labelZh, departureProjection.destination.labelEn) }}
          </p>
          <p v-else class="calendar-event-departure__headline">
            {{ t(event.locationRef.labelZh || '预约地点', event.locationRef.labelEn || 'Appointment place') }}
          </p>
        </div>
        <span
          v-if="activeJourney"
          class="calendar-event-badge calendar-status--info"
        >
          {{ activeJourney.status === 'arrived' ? t('已到达', 'Arrived') : t('行程中', 'In transit') }}
        </span>
        <span
          v-else-if="departureProjection?.ready"
          class="calendar-event-badge"
          :class="departureProjection.isLate ? 'calendar-status--danger' : departureProjection.shouldDepartNow ? 'calendar-status--warning' : 'calendar-status--success'"
        >
          {{
            departureProjection.isLate
              ? t(`预计迟到 ${departureProjection.lateByMinutes} 分钟`, `About ${departureProjection.lateByMinutes} min late`)
              : departureProjection.shouldDepartNow
                ? t('现在出发可准时到达', 'Leave now to arrive on time')
                : t(
                    `建议 ${formatClockTime(departureProjection.recommendedDepartureAt)} 出发`,
                    `Leave at ${formatClockTime(departureProjection.recommendedDepartureAt)}`,
                  )
          }}
        </span>
        <span v-else class="calendar-event-badge calendar-status--neutral">
          {{ t('暂时无法估算', 'Estimate unavailable') }}
        </span>
      </div>

      <template v-if="activeJourney">
        <p class="calendar-event-departure__summary">
          {{ activeJourney.fromLabel || activeJourney.from }}
          <span aria-hidden="true">→</span>
          {{ activeJourney.toLabel || activeJourney.to }}
          <span aria-hidden="true">·</span>
          {{ t('预计到达', 'ETA') }} {{ formatClockTime(activeJourney.etaAt) }}
        </p>
        <button
          type="button"
          class="calendar-event-action calendar-event-action--departure"
          :data-testid="`calendar-event-open-journey-${event.id}`"
          @click="emit('open-journey', event)"
        >
          <i class="fas fa-map-location-dot" aria-hidden="true"></i>
          <span>{{ t('查看地图行程', 'View Map journey') }}</span>
        </button>
      </template>

      <template v-else-if="departureProjection?.ready">
        <p class="calendar-event-departure__summary" aria-live="polite">
          {{ t('预计到达', 'Predicted arrival') }}
          {{ formatClockTime(departureProjection.predictedArrivalAt) }}
          <span aria-hidden="true">·</span>
          {{ departureProjection.estimate.minutes }} {{ t('分钟', 'min') }}
        </p>

        <details class="calendar-event-departure__details">
          <summary :data-testid="`calendar-event-departure-expand-${event.id}`">
            <span>{{ t('查看路线估算', 'Review route estimate') }}</span>
            <i class="fas fa-chevron-down" aria-hidden="true"></i>
          </summary>
          <div class="calendar-event-departure__detail-body">
            <label
              class="calendar-event-section__label"
              :for="`calendar-event-departure-mode-${event.id}`"
            >
              {{ t('交通方式', 'Transport') }}
            </label>
            <select
              :id="`calendar-event-departure-mode-${event.id}`"
              class="calendar-event-departure__select"
              :data-testid="`calendar-event-departure-mode-${event.id}`"
              :value="selectedDepartureMode"
              @change="emit('update-departure-mode', event, $event.target.value)"
            >
              <option
                v-for="mode in departureTransportModes"
                :key="mode.id"
                :value="mode.id"
              >
                {{ getDepartureTransportLabel(mode, departureProjection) }}
              </option>
            </select>
            <dl class="calendar-event-departure__metrics">
              <div>
                <dt>{{ t('当前起点', 'Current origin') }}</dt>
                <dd>{{ departureProjection.origin.labelZh || departureProjection.origin.detail }}</dd>
              </div>
              <div>
                <dt>{{ t('预约时间', 'Appointment') }}</dt>
                <dd>{{ formatClockTime(event.startsAt) }}</dd>
              </div>
              <div>
                <dt>{{ t('预计到达', 'Predicted arrival') }}</dt>
                <dd>{{ formatClockTime(departureProjection.predictedArrivalAt) }}</dd>
              </div>
            </dl>
          </div>
        </details>

        <button
          type="button"
          class="calendar-event-action calendar-event-action--departure"
          :disabled="otherJourneyActive"
          :data-testid="`calendar-event-start-travel-${event.id}`"
          @click="emit('start-travel', event)"
        >
          <i class="fas fa-person-walking-arrow-right" aria-hidden="true"></i>
          <span>{{ otherJourneyActive ? t('已有其他行程', 'Another journey is active') : t('现在出发', 'Leave now') }}</span>
        </button>
      </template>

      <p v-else class="calendar-event-departure__unavailable" role="status">
        {{ departureUnavailableCopy(departureProjection?.code) }}
      </p>

      <p
        v-if="departureFeedback"
        class="calendar-event-departure__feedback"
        :class="`calendar-feedback--${departureFeedback.tone}`"
        role="status"
      >
        {{ t(departureFeedback.messageZh, departureFeedback.messageEn) }}
      </p>
    </section>

    <section class="calendar-event-section calendar-event-section--schedule">
      <label v-if="!event.allDay" class="calendar-event-section__label" :for="`calendar-event-time-${event.id}`">
        {{ t('开始时间', 'Start time') }}
      </label>
      <p v-else class="calendar-event-section__label">
        {{ t('日期范围', 'Date range') }}
      </p>
      <input
        v-if="!event.allDay"
        :id="`calendar-event-time-${event.id}`"
        type="datetime-local"
        class="calendar-event-time-input"
        :data-testid="`calendar-event-time-${event.id}`"
        :value="formattedInputStartsAt"
        @change="emit('update-starts-at', event, $event.target.value)"
      />
      <p v-else class="calendar-event-all-day-note">
        {{ t('全天安排请通过“编辑”调整日期范围。', 'Use Edit to change an all-day date range.') }}
      </p>
      <div v-if="!event.allDay" class="calendar-event-time-actions">
        <button
          v-for="option in quickShiftOptions"
          :key="option.key"
          type="button"
          class="calendar-event-action calendar-event-action--time"
          :data-testid="`calendar-event-shift-${event.id}-${option.key}`"
          :title="t('调整提醒时间', 'Adjust reminder time')"
          @click="emit('shift-starts-at', event, option.offsetMs)"
        >
          <i class="fas fa-clock" aria-hidden="true"></i>
          <span>{{ t(option.labelZh, option.labelEn) }}</span>
        </button>
        <button
          v-if="isTimeEdited"
          type="button"
          class="calendar-event-action calendar-event-action--reset"
          :data-testid="`calendar-event-reset-time-${event.id}`"
          :title="t('恢复建议时间', 'Reset suggested time')"
          @click="emit('reset-starts-at', event)"
        >
          <i class="fas fa-rotate-left" aria-hidden="true"></i>
          <span>{{ t('恢复', 'Reset') }}</span>
        </button>
      </div>
      <p
        v-if="isTimeEdited && !event.allDay"
        class="calendar-event-time-feedback"
        :data-testid="`calendar-event-time-feedback-${event.id}`"
        aria-live="polite"
      >
        {{ t('已调整', 'Adjusted') }}
      </p>
      <div class="calendar-event-push">
        <div class="calendar-event-push__header">
          <span class="calendar-event-push__title">{{ t('推送状态', 'Push status') }}</span>
          <span class="calendar-event-badge" :class="pushStatusMeta.className">
            {{ t(pushStatusMeta.labelZh, pushStatusMeta.labelEn) }}
          </span>
        </div>
        <p class="calendar-event-push__detail">{{ pushDetail }}</p>
        <div v-if="pushHistory.length > 0" class="calendar-event-push__history">
          <p class="calendar-event-push__history-title">
            {{ t('最近排程记录', 'Recent schedule log') }}
          </p>
          <p
            v-for="entry in pushHistory"
            :key="`${entry.action}-${entry.createdAt}-${entry.scheduleId}`"
            class="calendar-event-push__history-entry"
          >
            <span>{{ formatPushHistoryEntry(entry) }}</span>
            <span v-if="entry.deliverAt" class="calendar-event-push__deliver-at">
              {{ formatDateTime(entry.deliverAt) }}
            </span>
          </p>
        </div>
      </div>
    </section>

    <div
      v-if="relationshipContactOptions.length > 0"
      class="calendar-event-section calendar-event-relationship"
      :data-testid="`calendar-event-relationship-${event.id}`"
    >
      <div class="calendar-event-relationship__controls">
        <select
          class="calendar-event-relationship__select"
          :data-testid="`calendar-event-relationship-contact-${event.id}`"
          :value="selectedRelationshipContactId"
          :aria-label="t('关系联系人', 'Relationship contact')"
          @change="emit('update-relationship-contact', event, $event.target.value)"
        >
          <option value="">{{ t('Select contact', 'Select contact') }}</option>
          <option
            v-for="contact in relationshipContactOptions"
            :key="contact.optionValue"
            :value="contact.optionValue"
          >
            {{ contact.optionLabel }}
          </option>
        </select>
        <button
          type="button"
          class="calendar-event-action calendar-event-action--relationship"
          :class="{ 'is-recorded': relationshipSuggestion?.imported }"
          :disabled="!selectedRelationshipContactId || relationshipSuggestion?.imported"
          :data-testid="`calendar-event-record-relationship-${event.id}`"
          @click="emit('record-relationship', event)"
        >
          {{
            relationshipSuggestion?.imported
              ? t('Recorded', 'Recorded')
              : t('Record fact', 'Record fact')
          }}
        </button>
      </div>
      <p
        v-if="relationshipFeedback"
        class="calendar-event-relationship__feedback"
        :class="relationshipFeedback.className"
        :data-testid="`calendar-event-relationship-feedback-${event.id}`"
        aria-live="polite"
      >
        {{ t(relationshipFeedback.messageZh, relationshipFeedback.messageEn) }}
      </p>
      <div
        v-if="relationshipReview"
        class="calendar-event-relationship__review"
        :data-testid="`calendar-event-relationship-review-${event.id}`"
      >
        <div class="calendar-event-relationship__review-header">
          <span class="calendar-event-relationship__review-title">
            {{ t('Relationship review', 'Relationship review') }}
          </span>
          <span class="calendar-event-badge calendar-status--success">
            {{ relationshipReview.sourceLabel }}
          </span>
        </div>
        <p v-if="relationshipReview.targetName">
          {{
            t(`对象：${relationshipReview.targetName}`, `Target: ${relationshipReview.targetName}`)
          }}
        </p>
        <p v-if="relationshipReview.recallSummary">
          {{ relationshipReview.recallSummary }}
        </p>
        <p v-if="relationshipReview.memoryKey" class="calendar-event-relationship__memory-role">
          {{
            relationshipReview.effectApplied
              ? t('主要记忆 / 已影响关系数值', 'Primary memory / relationship growth applied')
              : t('补充记录 / 未重复增加关系数值', 'Supporting record / no duplicate growth')
          }}
        </p>
        <ul v-if="relationshipReview.notes?.length" class="mt-2 space-y-1">
          <li
            v-for="note in relationshipReview.notes"
            :key="note"
            class="calendar-event-relationship__note"
          >
            {{ note }}
          </li>
        </ul>
      </div>
    </div>
    <div
      v-if="relatedKnowledgePoints.length > 0"
      :data-testid="`calendar-event-worldbook-${event.id}`"
      class="calendar-event-section calendar-event-worldbook"
    >
      <div class="calendar-event-worldbook__header">
        <p class="calendar-event-worldbook__title">
          {{ t('相关百科', 'Related encyclopedia') }}
        </p>
        <button
          type="button"
          class="calendar-event-action calendar-event-action--worldbook"
          @click="
            emit(
              'open-worldbook',
              relatedKnowledgePoints.map((point) => point.id),
            )
          "
        >
          WorldBook
        </button>
      </div>
      <div class="calendar-event-worldbook__points">
        <button
          v-for="point in relatedKnowledgePoints"
          :key="point.id"
          type="button"
          class="calendar-event-action calendar-event-action--knowledge"
          :data-testid="`calendar-event-worldbook-chip-${event.id}-${point.id}`"
          @click="emit('open-worldbook', [point.id])"
        >
          {{ point.title }}
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.calendar-event-card {
  padding: 14px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  color: var(--system-text);
  background: var(--system-control-bg);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.calendar-event-card__header {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
}

.calendar-event-card__icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--system-radius-sm);
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.calendar-event-card__heading {
  min-width: 0;
}

.calendar-event-card__time,
.calendar-event-card__title,
.calendar-event-card__summary,
.calendar-event-section__label,
.calendar-event-time-feedback,
.calendar-event-push__detail,
.calendar-event-push__history-title,
.calendar-event-push__history-entry,
.calendar-event-relationship__feedback,
.calendar-event-relationship__review p,
.calendar-event-worldbook__title {
  margin: 0;
}

.calendar-event-card__time {
  color: var(--system-accent);
  font-size: 11px;
  line-height: 1.4;
  font-weight: 700;
}

.calendar-event-card__title {
  margin-top: 3px;
  overflow-wrap: anywhere;
  font-size: 15px;
  line-height: 1.45;
  font-weight: 720;
}

.calendar-event-card__header-actions {
  max-width: 116px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.calendar-event-badge {
  max-width: 100%;
  padding: 5px 8px;
  border-radius: 999px;
  overflow-wrap: anywhere;
  font-size: 10px;
  line-height: 1.3;
  font-weight: 700;
  text-align: center;
}

.calendar-event-card__summary {
  margin-top: 10px;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.65;
}

.calendar-event-card__meta {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.calendar-event-card__meta span {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 999px;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
  font-size: 9px;
  line-height: 1.35;
  font-weight: 700;
}

.calendar-event-notes p:last-child,
.calendar-event-all-day-note {
  margin: 5px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.6;
}

.calendar-event-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--system-subtle-border);
}

.calendar-event-section__label {
  display: block;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.calendar-event-departure {
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--system-accent) 22%, var(--system-subtle-border));
  border-radius: var(--system-radius-sm);
  background: color-mix(in srgb, var(--system-accent-soft) 54%, var(--system-control-bg));
}

.calendar-event-departure__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.calendar-event-departure__header > div {
  min-width: 0;
}

.calendar-event-departure__headline,
.calendar-event-departure__summary,
.calendar-event-departure__unavailable,
.calendar-event-departure__feedback,
.calendar-event-departure__metrics dt,
.calendar-event-departure__metrics dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.calendar-event-departure__headline {
  margin-top: 4px;
  color: var(--system-text);
  font-size: 13px;
  line-height: 1.45;
  font-weight: 720;
}

.calendar-event-departure__summary,
.calendar-event-departure__unavailable,
.calendar-event-departure__feedback {
  margin-top: 8px;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.55;
}

.calendar-event-departure__details {
  margin-top: 8px;
  border: 1px solid var(--system-subtle-border);
  border-radius: var(--system-radius-sm);
  background: var(--system-control-bg);
}

.calendar-event-departure__details summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 11px;
  list-style: none;
  color: var(--system-text);
  font-size: 11px;
  line-height: 1.4;
  font-weight: 700;
  cursor: pointer;
}

.calendar-event-departure__details summary::-webkit-details-marker {
  display: none;
}

.calendar-event-departure__details summary i {
  transition: transform var(--system-motion-fast);
}

.calendar-event-departure__details[open] summary i {
  transform: rotate(180deg);
}

.calendar-event-departure__detail-body {
  padding: 0 11px 11px;
}

.calendar-event-departure__select {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  margin-top: 7px;
  padding: 8px 10px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  color: var(--system-text);
  background: var(--system-control-bg-strong);
  font: inherit;
  font-size: 12px;
}

.calendar-event-departure__metrics {
  margin: 10px 0 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.calendar-event-departure__metrics div {
  min-width: 0;
  padding: 8px;
  border-radius: calc(var(--system-radius-sm) - 2px);
  background: var(--system-surface-muted);
}

.calendar-event-departure__metrics dt {
  color: var(--system-text-soft);
  font-size: 9px;
  line-height: 1.4;
  font-weight: 700;
}

.calendar-event-departure__metrics dd {
  margin-top: 3px;
  color: var(--system-text);
  font-size: 11px;
  line-height: 1.45;
  font-weight: 680;
}

.calendar-event-action--departure {
  width: 100%;
  margin-top: 9px;
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.calendar-feedback--warning {
  color: var(--system-warning);
}

.calendar-event-time-input,
.calendar-event-relationship__select {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  color: var(--system-text);
  background: var(--system-control-bg-strong);
  font: inherit;
  font-size: 12px;
}

.calendar-event-time-input {
  margin-top: 7px;
  padding: 8px 10px;
}

.calendar-event-time-actions,
.calendar-event-worldbook__points {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.calendar-event-time-actions {
  margin-top: 8px;
}

.calendar-event-action {
  min-height: 44px;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  overflow-wrap: anywhere;
  font: inherit;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color var(--system-motion-fast),
    background var(--system-motion-fast),
    border-color var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
}

.calendar-event-action--delete {
  border-color: color-mix(in srgb, var(--system-danger) 22%, transparent);
  color: var(--system-danger);
  background: var(--system-danger-soft);
}

.calendar-event-action--time,
.calendar-event-action--reset {
  border-color: var(--system-control-border);
  color: var(--system-text);
  background: var(--system-control-bg-strong);
}

.calendar-event-time-feedback {
  margin-top: 7px;
  color: var(--system-accent);
  font-size: 11px;
  font-weight: 700;
}

.calendar-event-push {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--system-subtle-border);
  border-radius: var(--system-radius-sm);
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
  font-size: 11px;
  line-height: 1.55;
}

.calendar-event-push__header,
.calendar-event-push__history-entry,
.calendar-event-relationship__review-header,
.calendar-event-worldbook__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.calendar-event-push__title,
.calendar-event-push__history-title,
.calendar-event-relationship__review-title,
.calendar-event-worldbook__title {
  color: var(--system-text);
  font-weight: 700;
}

.calendar-event-push__detail {
  margin-top: 5px;
  overflow-wrap: anywhere;
}

.calendar-event-push__history {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.calendar-event-push__history-entry span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.calendar-event-push__deliver-at {
  color: var(--system-text-soft);
  text-align: right;
}

.calendar-event-relationship__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.calendar-event-relationship__select {
  padding: 8px 10px;
}

.calendar-event-action--relationship {
  color: var(--system-on-success);
  background: var(--system-success);
}

.calendar-event-action--relationship.is-recorded {
  color: var(--system-success);
  background: var(--system-success-soft);
}

.calendar-event-action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.calendar-event-relationship__feedback {
  margin-top: 7px;
  overflow-wrap: anywhere;
  font-size: 11px;
}

.calendar-feedback--warning {
  color: var(--system-warning);
}

.calendar-feedback--success {
  color: var(--system-success);
}

.calendar-event-relationship__review {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--system-success) 22%, transparent);
  border-radius: var(--system-radius-sm);
  color: var(--system-text-muted);
  background: var(--system-success-soft);
  font-size: 11px;
  line-height: 1.55;
}

.calendar-event-relationship__review p {
  margin-top: 5px;
  overflow-wrap: anywhere;
}

.calendar-event-relationship__memory-role,
.calendar-event-relationship__note {
  color: var(--system-text-muted);
}

.calendar-event-relationship__review ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.calendar-event-relationship__note {
  overflow-wrap: anywhere;
}

.calendar-event-worldbook__header {
  align-items: center;
}

.calendar-event-worldbook__title {
  overflow-wrap: anywhere;
  font-size: 11px;
}

.calendar-event-action--worldbook {
  color: var(--system-accent);
  background: transparent;
}

.calendar-event-worldbook__points {
  margin-top: 8px;
}

.calendar-event-action--knowledge {
  border-color: color-mix(in srgb, var(--system-info) 24%, transparent);
  color: var(--system-info);
  background: var(--system-info-soft);
}

.calendar-status--success {
  color: var(--system-success);
  background: var(--system-success-soft);
}

.calendar-status--warning {
  color: var(--system-warning);
  background: var(--system-warning-soft);
}

.calendar-status--danger {
  color: var(--system-danger);
  background: var(--system-danger-soft);
}

.calendar-status--info {
  color: var(--system-info);
  background: var(--system-info-soft);
}

.calendar-status--neutral {
  color: var(--system-text-muted);
  background: var(--system-control-bg-strong);
}

.calendar-event-action:not(:disabled):hover {
  background: var(--system-hover-bg);
}

.calendar-event-action:not(:disabled):active {
  box-shadow: inset 0 0 0 999px var(--system-pressed-bg);
}

.calendar-event-action:focus-visible,
.calendar-event-time-input:focus-visible,
.calendar-event-relationship__select:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
}

@media (max-width: 520px) {
  .calendar-event-card {
    padding: 13px;
  }

  .calendar-event-card__header {
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 8px;
  }

  .calendar-event-card__icon {
    width: 36px;
    height: 36px;
  }

  .calendar-event-card__header-actions {
    grid-column: 2;
    max-width: none;
    justify-content: flex-start;
  }

  .calendar-event-relationship__controls {
    grid-template-columns: 1fr;
  }

  .calendar-event-departure__header {
    flex-direction: column;
  }

  .calendar-event-departure__metrics {
    grid-template-columns: 1fr;
  }

  .calendar-event-action--relationship {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .calendar-event-action {
    transition: none;
  }
}
</style>
