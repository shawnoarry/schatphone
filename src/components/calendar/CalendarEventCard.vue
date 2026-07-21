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
})

const emit = defineEmits([
  'update-starts-at',
  'shift-starts-at',
  'reset-starts-at',
  'delete-event',
  'open-worldbook',
  'update-relationship-contact',
  'record-relationship',
])

const { t } = useI18n()
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

    <section class="calendar-event-section calendar-event-section--schedule">
      <label class="calendar-event-section__label" :for="`calendar-event-time-${event.id}`">
        {{ t('提醒时间', 'Reminder time') }}
      </label>
      <input
        :id="`calendar-event-time-${event.id}`"
        type="datetime-local"
        class="calendar-event-time-input"
        :data-testid="`calendar-event-time-${event.id}`"
        :value="formattedInputStartsAt"
        @change="emit('update-starts-at', event, $event.target.value)"
      />
      <div class="calendar-event-time-actions">
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
        v-if="isTimeEdited"
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
