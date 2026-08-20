<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'
import { calendarMarkerColor, resolveCalendarMarker } from '../../lib/calendar-markers'
import {
  buildCalendarMonthDays,
  buildCalendarWeekDays,
  calendarOccurrencesForDay,
  groupCalendarOccurrencesByDay,
  getCalendarOccurrenceDayPosition,
  isSameCalendarDay,
  normalizeCalendarViewMode,
} from '../../lib/calendar-schedule'

const props = defineProps({
  viewMode: { type: String, default: 'month' },
  anchorAt: { type: Number, required: true },
  selectedDate: { type: Number, required: true },
  occurrences: { type: Array, default: () => [] },
  selectedEventId: { type: String, default: '' },
  selectedOccurrenceId: { type: String, default: '' },
  markers: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'update-view',
  'shift-period',
  'go-today',
  'select-day',
  'select-event',
  'create-event',
])

const { t } = useI18n()
const normalizedViewMode = computed(() => normalizeCalendarViewMode(props.viewMode))
const monthDays = computed(() => buildCalendarMonthDays(props.anchorAt))
const weekDays = computed(() => buildCalendarWeekDays(props.anchorAt))
const groupedOccurrences = computed(() => groupCalendarOccurrencesByDay(props.occurrences))
const selectedDayOccurrences = computed(() =>
  calendarOccurrencesForDay(props.occurrences, props.selectedDate),
)

const viewModes = [
  { id: 'month', labelZh: '月', labelEn: 'Month' },
  { id: 'week', labelZh: '周', labelEn: 'Week' },
  { id: 'agenda', labelZh: '日程', labelEn: 'Agenda' },
]
const weekdayLabels = [
  { zh: '一', en: 'Mon' },
  { zh: '二', en: 'Tue' },
  { zh: '三', en: 'Wed' },
  { zh: '四', en: 'Thu' },
  { zh: '五', en: 'Fri' },
  { zh: '六', en: 'Sat' },
  { zh: '日', en: 'Sun' },
]

const titleForDate = (value, options) =>
  new Date(value).toLocaleDateString([], options)

const periodTitle = computed(() => {
  if (normalizedViewMode.value === 'week') {
    const days = weekDays.value
    return `${titleForDate(days[0].startsAt, { month: 'short', day: 'numeric' })} – ${titleForDate(days[6].startsAt, { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  if (normalizedViewMode.value === 'agenda') {
    return titleForDate(props.anchorAt, { year: 'numeric', month: 'long' })
  }
  return titleForDate(props.anchorAt, { year: 'numeric', month: 'long' })
})

const eventTitle = (event) => t(event.titleZh || '日历事项', event.titleEn || event.titleZh || 'Calendar event')

const eventTime = (event) => {
  if (event.allDay) return t('全天', 'All day')
  return new Date(event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const eventRange = (event) => {
  if (event.allDay) return t('全天', 'All day')
  const start = new Date(event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const end = new Date(event.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${start}–${end}`
}

const occurrencesForDay = (day) => groupedOccurrences.value.get(String(day.startsAt)) || []

const eventSegmentClass = (event, dayStartsAt) => {
  if (!event.isMultiDay) return ''
  const position = getCalendarOccurrenceDayPosition(event, dayStartsAt)
  if (position.isFirstDay && position.isLastDay) return ''
  if (position.isFirstDay) return 'is-span-start'
  if (position.isLastDay) return 'is-span-end'
  return 'is-span-middle'
}

const agendaGroups = computed(() =>
  [...groupedOccurrences.value.entries()]
    .map(([startsAt, events]) => ({ startsAt: Number(startsAt), events }))
    .sort((left, right) => left.startsAt - right.startsAt),
)

const dayAriaLabel = (day) =>
  titleForDate(day.startsAt, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

const markerFor = (event) => resolveCalendarMarker(props.markers, event?.markerId)

const markerStyleFor = (event) => {
  const marker = markerFor(event)
  return marker ? { '--calendar-marker-color': calendarMarkerColor(marker) } : null
}

const markerLabelFor = (event) => {
  const marker = markerFor(event)
  return marker ? t(marker.labelZh, marker.labelEn) : ''
}
</script>

<template>
  <section class="calendar-workspace" data-testid="calendar-confirmed-events">
    <header class="calendar-workspace__header">
      <div>
        <p class="calendar-workspace__eyebrow">{{ t('已确认安排', 'Confirmed schedule') }}</p>
        <h2>{{ periodTitle }}</h2>
      </div>
      <button
        type="button"
        class="calendar-create-button"
        data-testid="calendar-create-event"
        @click="emit('create-event', selectedDate)"
      >
        <i class="fas fa-plus" aria-hidden="true"></i>
        <span>{{ t('新建', 'New') }}</span>
      </button>
    </header>

    <div class="calendar-view-switch" role="tablist" :aria-label="t('日历视图', 'Calendar views')">
      <button
        v-for="mode in viewModes"
        :key="mode.id"
        type="button"
        role="tab"
        :aria-selected="normalizedViewMode === mode.id"
        :class="{ 'is-active': normalizedViewMode === mode.id }"
        :data-testid="`calendar-view-${mode.id}`"
        @click="emit('update-view', mode.id)"
      >
        {{ t(mode.labelZh, mode.labelEn) }}
      </button>
    </div>

    <div class="calendar-period-controls">
      <button type="button" :aria-label="t('上一时间段', 'Previous period')" @click="emit('shift-period', -1)">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
      </button>
      <button type="button" class="calendar-today-button" @click="emit('go-today')">
        {{ t('今天', 'Today') }}
      </button>
      <button type="button" :aria-label="t('下一时间段', 'Next period')" @click="emit('shift-period', 1)">
        <i class="fas fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>

    <div v-if="normalizedViewMode === 'month'" class="calendar-month" data-testid="calendar-month-view">
      <div class="calendar-weekday-row" aria-hidden="true">
        <span v-for="weekday in weekdayLabels" :key="weekday.en">{{ t(weekday.zh, weekday.en) }}</span>
      </div>
      <div class="calendar-month-grid">
        <div
          v-for="day in monthDays"
          :key="day.startsAt"
          class="calendar-month-day"
          :class="{
            'is-outside': !day.inCurrentMonth,
            'is-selected': isSameCalendarDay(day.startsAt, selectedDate),
            'is-today': isSameCalendarDay(day.startsAt, Date.now()),
          }"
        >
          <button
            type="button"
            class="calendar-day-number"
            :aria-label="dayAriaLabel(day)"
            :data-testid="`calendar-day-${day.startsAt}`"
            @click="emit('select-day', day.startsAt)"
          >
            {{ day.dayOfMonth }}
          </button>
          <button
            v-for="event in occurrencesForDay(day).slice(0, 3)"
            :key="`${day.startsAt}-${event.occurrenceId}`"
            type="button"
            class="calendar-month-event"
            :class="[
              `calendar-tone--${event.tone || 'blue'}`,
              eventSegmentClass(event, day.startsAt),
              {
                'is-selected': selectedOccurrenceId === event.occurrenceId,
                'is-multi-day': event.isMultiDay,
                'has-marker': Boolean(markerFor(event)),
              },
            ]"
            :style="markerStyleFor(event)"
            :title="eventTitle(event)"
            :aria-pressed="selectedOccurrenceId === event.occurrenceId"
            :data-testid="`calendar-month-event-${event.occurrenceId}-${day.startsAt}`"
            @click="emit('select-event', event, day.startsAt)"
          >
            <span class="calendar-month-event__time">{{ eventTime(event) }}</span>
            <span class="calendar-month-event__title">{{ eventTitle(event) }}</span>
          </button>
          <span v-if="occurrencesForDay(day).length > 3" class="calendar-month-more">
            +{{ occurrencesForDay(day).length - 3 }}
          </span>
        </div>
      </div>
    </div>

    <div v-else-if="normalizedViewMode === 'week'" class="calendar-week" data-testid="calendar-week-view">
      <section
        v-for="day in weekDays"
        :key="day.startsAt"
        class="calendar-week-day"
        :class="{ 'is-selected': isSameCalendarDay(day.startsAt, selectedDate) }"
      >
        <button type="button" class="calendar-week-day__header" @click="emit('select-day', day.startsAt)">
          <span>{{ titleForDate(day.startsAt, { weekday: 'short' }) }}</span>
          <strong>{{ day.dayOfMonth }}</strong>
        </button>
        <div class="calendar-week-day__events">
          <button
            v-for="event in occurrencesForDay(day)"
            :key="`${day.startsAt}-${event.occurrenceId}`"
            type="button"
            class="calendar-week-event"
            :class="{ 'is-selected': selectedOccurrenceId === event.occurrenceId }"
            :aria-pressed="selectedOccurrenceId === event.occurrenceId"
            @click="emit('select-event', event, day.startsAt)"
          >
            <span>{{ eventRange(event) }}</span>
            <strong>{{ eventTitle(event) }}</strong>
          </button>
          <p v-if="occurrencesForDay(day).length === 0" class="calendar-week-empty">
            {{ t('无安排', 'No events') }}
          </p>
        </div>
      </section>
    </div>

    <div v-else class="calendar-agenda" data-testid="calendar-agenda-view">
      <section v-for="group in agendaGroups" :key="group.startsAt" class="calendar-agenda-day">
        <button type="button" class="calendar-agenda-day__date" @click="emit('select-day', group.startsAt)">
          <strong>{{ titleForDate(group.startsAt, { day: '2-digit' }) }}</strong>
          <span>{{ titleForDate(group.startsAt, { weekday: 'short', month: 'short' }) }}</span>
        </button>
        <div class="calendar-agenda-day__events">
          <button
            v-for="event in group.events"
            :key="`${group.startsAt}-${event.occurrenceId}`"
            type="button"
            class="calendar-agenda-event"
            :class="{ 'is-selected': selectedOccurrenceId === event.occurrenceId, 'has-marker': Boolean(markerFor(event)) }"
            :style="markerStyleFor(event)"
            :aria-pressed="selectedOccurrenceId === event.occurrenceId"
            @click="emit('select-event', event, group.startsAt)"
          >
            <span class="calendar-agenda-event__time">{{ eventRange(event) }}</span>
            <span class="calendar-agenda-event__copy">
              <strong>{{ eventTitle(event) }}</strong>
              <small v-if="event.locationRef">{{ t(event.locationRef.labelZh, event.locationRef.labelEn) }}</small>
            </span>
            <span v-if="markerLabelFor(event)" class="calendar-marker-chip">{{ markerLabelFor(event) }}</span>
            <i class="fas fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </section>
      <div v-if="agendaGroups.length === 0" class="calendar-agenda-empty">
        <i class="far fa-calendar" aria-hidden="true"></i>
        <div>
          <strong>{{ t('这个月还没有安排', 'Nothing scheduled this month') }}</strong>
          <p>{{ t('选择日期后新建一项确认安排。', 'Select a date to create a confirmed event.') }}</p>
        </div>
      </div>
    </div>

    <section class="calendar-selected-day" data-testid="calendar-selected-day">
      <header>
        <div>
          <p>{{ t('选中日期', 'Selected day') }}</p>
          <h3>{{ titleForDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' }) }}</h3>
        </div>
        <button type="button" @click="emit('create-event', selectedDate)">
          <i class="fas fa-plus" aria-hidden="true"></i>
          <span>{{ t('添加安排', 'Add event') }}</span>
        </button>
      </header>
      <div v-if="selectedDayOccurrences.length" class="calendar-selected-day__list">
        <button
          v-for="event in selectedDayOccurrences"
          :key="event.occurrenceId"
          type="button"
          class="calendar-selected-row"
          :class="{ 'is-selected': selectedOccurrenceId === event.occurrenceId, 'has-marker': Boolean(markerFor(event)) }"
          :style="markerStyleFor(event)"
          :aria-pressed="selectedOccurrenceId === event.occurrenceId"
          :data-testid="`calendar-event-row-${event.sourceEventId}`"
          @click="emit('select-event', event, selectedDate)"
        >
          <span class="calendar-selected-row__time">{{ eventRange(event) }}</span>
          <span class="calendar-selected-row__copy">
            <strong>{{ eventTitle(event) }}</strong>
            <small v-if="event.locationRef">{{ t(event.locationRef.labelZh, event.locationRef.labelEn) }}</small>
          </span>
          <span v-if="markerLabelFor(event)" class="calendar-marker-chip">{{ markerLabelFor(event) }}</span>
          <span class="calendar-selected-row__requirement">
            {{ event.requirement === 'optional' ? t('可选', 'Optional') : t('必需', 'Required') }}
          </span>
        </button>
      </div>
      <div v-else class="calendar-empty-events" data-testid="calendar-empty-events">
        <i class="far fa-calendar" aria-hidden="true"></i>
        <div>
          <strong>{{ t('这一天还没有安排', 'Nothing scheduled for this day') }}</strong>
          <p>{{ t('可以新建一个确认事项，或先去提醒事项处理待确认内容。', 'Create a confirmed event, or review pending items in Reminders first.') }}</p>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.calendar-workspace {
  padding: 18px;
  border: 1px solid var(--system-card-border);
  border-radius: calc(var(--system-radius-md) + 4px);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.calendar-workspace__header,
.calendar-selected-day header,
.calendar-period-controls,
.calendar-week-day__header,
.calendar-agenda-day,
.calendar-selected-row,
.calendar-agenda-event {
  display: flex;
  align-items: center;
}

.calendar-workspace__header,
.calendar-selected-day header {
  justify-content: space-between;
  gap: 14px;
}

.calendar-workspace__header p,
.calendar-workspace__header h2,
.calendar-selected-day p,
.calendar-selected-day h3,
.calendar-week-empty,
.calendar-empty-events p {
  margin: 0;
}

.calendar-workspace__eyebrow,
.calendar-selected-day header p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.calendar-workspace__header h2 {
  margin-top: 3px;
  font-size: 20px;
  line-height: 1.25;
}

.calendar-create-button,
.calendar-selected-day header button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  border: 0;
  border-radius: 999px;
  color: var(--system-on-accent);
  background: var(--system-accent);
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
}

.calendar-view-switch {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 4px;
  border-radius: 14px;
  background: var(--system-surface-muted);
}

.calendar-view-switch button,
.calendar-period-controls button {
  min-height: 40px;
  border: 0;
  border-radius: 11px;
  color: var(--system-text-muted);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.calendar-view-switch button.is-active {
  color: var(--system-text);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.calendar-period-controls {
  justify-content: center;
  gap: 6px;
  margin: 10px 0;
}

.calendar-period-controls button {
  min-width: 40px;
}

.calendar-period-controls .calendar-today-button {
  min-width: 76px;
  color: var(--system-accent);
}

.calendar-weekday-row,
.calendar-month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-weekday-row span {
  padding: 7px 4px;
  color: var(--system-text-muted);
  font-size: 10px;
  font-weight: 700;
  text-align: center;
}

.calendar-month-grid {
  overflow: hidden;
  border: 1px solid var(--system-subtle-border);
  border-radius: 16px;
  background: var(--system-subtle-border);
  gap: 1px;
}

.calendar-month-day {
  min-width: 0;
  min-height: 108px;
  padding: 7px;
  background: var(--system-panel-bg);
}

.calendar-month-day.is-outside { opacity: .45; }
.calendar-month-day.is-selected { box-shadow: inset 0 0 0 2px var(--system-accent); }

.calendar-day-number {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  color: var(--system-text);
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.calendar-month-day.is-today .calendar-day-number {
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.calendar-month-event {
  width: 100%;
  min-width: 0;
  margin-top: 3px;
  display: flex;
  gap: 4px;
  padding: 4px 5px;
  border: 0;
  border-radius: 7px;
  color: var(--system-info);
  background: var(--system-info-soft);
  font: inherit;
  font-size: 9px;
  line-height: 1.25;
  text-align: left;
  cursor: pointer;
}

.calendar-month-event.is-multi-day { border-radius: 4px; }
.calendar-month-event.is-span-start { margin-right: -7px; border-radius: 7px 0 0 7px; }
.calendar-month-event.is-span-middle { margin-inline: -7px; border-radius: 0; }
.calendar-month-event.is-span-end { margin-left: -7px; border-radius: 0 7px 7px 0; }
.calendar-month-event.is-selected { box-shadow: inset 0 0 0 1px currentColor; }
.calendar-month-event.has-marker {
  color: color-mix(in srgb, var(--calendar-marker-color) 72%, var(--system-text));
  background: color-mix(in srgb, var(--calendar-marker-color) 16%, transparent);
}
.calendar-month-event__time { flex: none; opacity: .78; }
.calendar-month-event__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.calendar-month-more { display: block; margin-top: 3px; color: var(--system-text-muted); font-size: 9px; }

.calendar-week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--system-subtle-border);
  border-radius: 16px;
}

.calendar-week-day { min-width: 0; border-right: 1px solid var(--system-subtle-border); }
.calendar-week-day:last-child { border-right: 0; }
.calendar-week-day.is-selected { background: color-mix(in srgb, var(--system-accent-soft) 45%, transparent); }
.calendar-week-day__header { width: 100%; justify-content: space-between; padding: 10px; border: 0; border-bottom: 1px solid var(--system-subtle-border); color: var(--system-text-muted); background: transparent; font: inherit; cursor: pointer; }
.calendar-week-day__header strong { color: var(--system-text); font-size: 16px; }
.calendar-week-day__events { min-height: 210px; padding: 7px; }
.calendar-week-event { width: 100%; margin-bottom: 6px; padding: 8px; display: flex; flex-direction: column; gap: 3px; border: 1px solid var(--system-subtle-border); border-radius: 10px; color: var(--system-text); background: var(--system-surface-muted); font: inherit; font-size: 10px; text-align: left; cursor: pointer; }
.calendar-week-event span { color: var(--system-text-muted); font-size: 9px; }
.calendar-week-event.is-selected { border-color: var(--system-accent); }
.calendar-week-empty { padding: 10px 2px; color: var(--system-text-muted); font-size: 10px; }

.calendar-agenda { display: flex; flex-direction: column; gap: 14px; }
.calendar-agenda-day { align-items: flex-start; gap: 12px; }
.calendar-agenda-day__date { width: 58px; flex: none; display: flex; flex-direction: column; align-items: center; padding: 9px 5px; border: 0; border-radius: 12px; color: var(--system-text); background: var(--system-surface-muted); font: inherit; cursor: pointer; }
.calendar-agenda-day__date strong { font-size: 20px; }
.calendar-agenda-day__date span { color: var(--system-text-muted); font-size: 9px; }
.calendar-agenda-day__events { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 7px; }
.calendar-agenda-event { width: 100%; min-width: 0; gap: 10px; padding: 10px 12px; border: 1px solid var(--system-subtle-border); border-radius: 12px; color: var(--system-text); background: var(--system-panel-bg); font: inherit; text-align: left; cursor: pointer; }
.calendar-agenda-event.has-marker { border-left: 3px solid var(--calendar-marker-color); }
.calendar-agenda-event.is-selected { border-color: var(--system-accent); background: var(--system-accent-soft); }
.calendar-agenda-event__time { width: 78px; flex: none; color: var(--system-text-muted); font-size: 10px; }
.calendar-agenda-event__copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.calendar-agenda-event__copy strong,
.calendar-agenda-event__copy small { overflow-wrap: anywhere; }
.calendar-agenda-event__copy small { color: var(--system-text-muted); }

.calendar-agenda-empty { display: flex; align-items: flex-start; gap: 11px; padding: 18px; border: 1px dashed var(--system-subtle-border); border-radius: 14px; color: var(--system-text-muted); }
.calendar-agenda-empty i { margin-top: 2px; color: var(--system-accent); }
.calendar-agenda-empty strong { color: var(--system-text); font-size: 13px; }
.calendar-agenda-empty p { margin: 4px 0 0; font-size: 11px; line-height: 1.5; }

.calendar-selected-day { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--system-subtle-border); }
.calendar-selected-day h3 { margin-top: 3px; font-size: 16px; }
.calendar-selected-day__list { margin-top: 12px; display: flex; flex-direction: column; gap: 7px; }
.calendar-selected-row { width: 100%; min-width: 0; gap: 10px; padding: 11px 12px; border: 1px solid var(--system-subtle-border); border-radius: 12px; color: var(--system-text); background: var(--system-panel-bg); font: inherit; text-align: left; cursor: pointer; }
.calendar-selected-row.has-marker { border-left: 3px solid var(--calendar-marker-color); }
.calendar-selected-row.is-selected { border-color: var(--system-accent); background: var(--system-accent-soft); }
.calendar-selected-row__time { width: 88px; flex: none; color: var(--system-text-muted); font-size: 10px; }
.calendar-selected-row__copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.calendar-selected-row__copy strong,
.calendar-selected-row__copy small { overflow-wrap: anywhere; }
.calendar-selected-row__copy small { color: var(--system-text-muted); }
.calendar-selected-row__requirement { flex: none; padding: 4px 7px; border-radius: 999px; color: var(--system-info); background: var(--system-info-soft); font-size: 9px; font-weight: 700; }

.calendar-marker-chip {
  flex: none;
  align-self: center;
  padding: 3px 8px;
  border-radius: 999px;
  color: color-mix(in srgb, var(--calendar-marker-color) 80%, var(--system-text));
  background: color-mix(in srgb, var(--calendar-marker-color) 16%, transparent);
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
}

.calendar-empty-events { margin-top: 12px; display: flex; align-items: flex-start; gap: 11px; padding: 14px; border: 1px dashed var(--system-subtle-border); border-radius: 12px; color: var(--system-text-muted); }
.calendar-empty-events i { margin-top: 2px; color: var(--system-accent); }
.calendar-empty-events strong { color: var(--system-text); font-size: 13px; }
.calendar-empty-events p { margin-top: 4px; font-size: 11px; line-height: 1.5; }

.calendar-workspace button:focus-visible { outline: 2px solid var(--system-accent); outline-offset: 2px; }

@media (max-width: 760px) {
  .calendar-workspace { padding: 14px; }
  .calendar-workspace__header h2 { font-size: 18px; }
  .calendar-month-day { min-height: 76px; padding: 4px; }
  .calendar-month-event { display: block; height: 7px; padding: 0; overflow: hidden; border-radius: 999px; color: transparent; }
  .calendar-month-event.has-marker { background: var(--calendar-marker-color); }
  .calendar-month-event.is-span-start { margin-right: -4px; border-radius: 999px 0 0 999px; }
  .calendar-month-event.is-span-middle { margin-inline: -4px; border-radius: 0; }
  .calendar-month-event.is-span-end { margin-left: -4px; border-radius: 0 999px 999px 0; }
  .calendar-month-event__time,
  .calendar-month-event__title { display: none; }
  .calendar-month-more { font-size: 8px; text-align: center; }
  .calendar-week { grid-template-columns: 1fr; border: 0; gap: 8px; }
  .calendar-week-day { border: 1px solid var(--system-subtle-border); border-radius: 12px; overflow: hidden; }
  .calendar-week-day__events { min-height: 0; }
  .calendar-agenda-day { flex-direction: column; gap: 8px; }
  .calendar-agenda-day__date { width: 100%; flex-direction: row; justify-content: flex-start; gap: 8px; padding: 8px 10px; }
  .calendar-agenda-day__date strong { font-size: 16px; }
  .calendar-agenda-day__date span { font-size: 10px; }
  .calendar-agenda-day__events { width: 100%; }
  .calendar-agenda-event { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "time icon" "copy icon"; align-items: start; gap: 4px 10px; }
  .calendar-agenda-event__time { grid-area: time; width: auto; }
  .calendar-agenda-event__copy { grid-area: copy; }
  .calendar-agenda-event > i { grid-area: icon; align-self: center; }
  .calendar-selected-row__time { width: 68px; }
}

@media (max-width: 390px) {
  .calendar-workspace__header { align-items: flex-start; }
  .calendar-create-button span { display: none; }
  .calendar-create-button { width: 44px; padding: 0; }
  .calendar-selected-row { align-items: flex-start; flex-wrap: wrap; }
  .calendar-selected-row__copy { flex-basis: calc(100% - 82px); }
  .calendar-selected-row__requirement { margin-left: 78px; }
}

@media (prefers-reduced-motion: reduce) {
  .calendar-workspace * { scroll-behavior: auto !important; }
}
</style>
