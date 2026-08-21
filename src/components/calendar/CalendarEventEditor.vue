<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from '../../composables/useI18n'
import { calendarMarkerColor } from '../../lib/calendar-markers'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  places: { type: Array, default: () => [] },
  markers: { type: Array, default: () => [] },
  colorPreset: { type: String, default: 'default' },
  validationMessage: { type: String, default: '' },
  saving: { type: Boolean, default: false },
})

const draft = defineModel({ type: Object, required: true })
const emit = defineEmits(['save', 'cancel'])
const { t } = useI18n()

const firstTitleInput = ref(null)
const placeQuery = ref('')

const normalizeSearchText = (value) =>
  String(value || '')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')

const placeLabel = (place) =>
  t(
    place.nameZh || place.labelZh || place.label || place.nameEn || '地图地点',
    place.nameEn || place.labelEn || place.label || place.nameZh || 'Map place',
  )

const placeDetail = (place) =>
  t(
    place.detailZh || place.detail || place.address || place.detailEn || '',
    place.detailEn || place.detail || place.address || place.detailZh || '',
  )

const normalizedPlaces = computed(() =>
  props.places
    .filter((place) => place?.mapPackId && place?.placeId && place?.position)
    .map((place) => ({
      ...place,
      optionId: `${place.mapPackId}:${place.placeId}`,
      displayLabel: placeLabel(place),
      displayDetail: placeDetail(place),
      searchText: normalizeSearchText(
        [
          place.nameZh,
          place.nameEn,
          place.label,
          place.detailZh,
          place.detailEn,
          place.detail,
          place.address,
          ...(Array.isArray(place.aliases) ? place.aliases : []),
          ...(Array.isArray(place.searchTerms) ? place.searchTerms : []),
        ].join(' '),
      ),
    }))
    .sort((left, right) => left.displayLabel.localeCompare(right.displayLabel)),
)

const selectedPlace = computed(() => {
  const locationRef = draft.value?.locationRef
  if (!locationRef) return null
  return (
    normalizedPlaces.value.find(
      (place) =>
        place.mapPackId === locationRef.mapPackId && place.placeId === locationRef.placeId,
    ) || null
  )
})

const filteredPlaces = computed(() => {
  const query = normalizeSearchText(placeQuery.value)
  if (!query) return normalizedPlaces.value.slice(0, 10)
  const terms = query.split(' ').filter(Boolean)
  return normalizedPlaces.value
    .filter((place) => terms.every((term) => place.searchText.includes(term)))
    .slice(0, 20)
})

const markerColorFor = (marker) => calendarMarkerColor(marker, props.colorPreset)

const toggleMarker = (markerId) => {
  if (!draft.value) return
  draft.value.markerId = draft.value.markerId === markerId ? '' : markerId
}

const selectPlace = (place) => {
  draft.value.locationRef = {
    owner: 'map',
    mapPackId: place.mapPackId,
    placeId: place.placeId,
    labelZh: place.nameZh || place.labelZh || place.label || place.nameEn || '',
    labelEn: place.nameEn || place.labelEn || place.label || place.nameZh || '',
    detail:
      place.detailZh || place.detailEn || place.detail || place.address || '',
  }
  placeQuery.value = ''
}

const clearPlace = () => {
  draft.value.locationRef = null
  placeQuery.value = ''
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    placeQuery.value = ''
    await nextTick()
    firstTitleInput.value?.focus()
  },
)

watch(
  () => draft.value?.allDay,
  (allDay, previous) => {
    if (!props.open || typeof previous !== 'boolean' || allDay === previous) return
    if (allDay) {
      const startDate = String(draft.value.startsAtInput || '').slice(0, 10)
      const endDate = String(draft.value.endsAtInput || '').slice(0, 10)
      if (startDate) draft.value.startDate = startDate
      if (endDate) draft.value.endDate = endDate
      return
    }
    if (draft.value.startDate) draft.value.startsAtInput = `${draft.value.startDate}T09:00`
    if (draft.value.endDate) draft.value.endsAtInput = `${draft.value.endDate}T10:00`
  },
)
</script>

<template>
  <template v-if="open">
    <div class="calendar-editor-backdrop" @click="emit('cancel')"></div>
    <form
      class="calendar-editor"
      data-testid="calendar-event-editor"
      role="dialog"
      aria-modal="true"
      :aria-label="mode === 'edit' ? t('编辑日历安排', 'Edit calendar event') : t('新建日历安排', 'Create calendar event')"
      @keydown.esc.prevent="emit('cancel')"
      @submit.prevent="emit('save')"
    >
      <header class="calendar-editor__header">
        <div>
          <p>{{ t('日历安排', 'Calendar event') }}</p>
          <h2>
            {{ mode === 'edit' ? t('编辑安排', 'Edit event') : t('新建安排', 'New event') }}
          </h2>
        </div>
        <button
          type="button"
          class="calendar-editor__close"
          :aria-label="t('关闭编辑器', 'Close editor')"
          @click="emit('cancel')"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </header>

      <section class="calendar-editor__section calendar-editor__section--identity">
        <div class="calendar-editor__section-heading">
          <span class="calendar-editor__section-icon" aria-hidden="true">
            <i class="fas fa-pen"></i>
          </span>
          <div>
            <h3>{{ t('内容', 'Details') }}</h3>
            <p>{{ t('写下之后能一眼认出的安排。', 'Give the event a title you can recognize at a glance.') }}</p>
          </div>
        </div>
        <div class="calendar-editor__field-grid">
          <label class="calendar-editor__field">
            <span>{{ t('中文标题', 'Chinese title') }}</span>
            <input
              ref="firstTitleInput"
              v-model="draft.titleZh"
              data-testid="calendar-editor-title-zh"
              maxlength="100"
              autocomplete="off"
              :placeholder="t('例如：录音室预约', 'e.g. 录音室预约')"
            />
          </label>
          <label class="calendar-editor__field">
            <span>{{ t('英文标题', 'English title') }}</span>
            <input
              v-model="draft.titleEn"
              data-testid="calendar-editor-title-en"
              maxlength="100"
              autocomplete="off"
              placeholder="e.g. Studio appointment"
            />
          </label>
        </div>
        <div class="calendar-editor__field-grid calendar-editor__field-grid--notes">
          <label class="calendar-editor__field">
            <span>{{ t('中文备注', 'Chinese notes') }}</span>
            <textarea
              v-model="draft.notesZh"
              data-testid="calendar-editor-notes-zh"
              maxlength="1200"
              :placeholder="t('补充准备事项或背景', 'Add preparation notes or context')"
            ></textarea>
          </label>
          <label class="calendar-editor__field">
            <span>{{ t('英文备注', 'English notes') }}</span>
            <textarea
              v-model="draft.notesEn"
              data-testid="calendar-editor-notes-en"
              maxlength="1200"
              placeholder="Add preparation notes or context"
            ></textarea>
          </label>
        </div>
      </section>

      <section class="calendar-editor__section">
        <div class="calendar-editor__section-heading">
          <span class="calendar-editor__section-icon" aria-hidden="true">
            <i class="far fa-clock"></i>
          </span>
          <div>
            <h3>{{ t('时间', 'Time') }}</h3>
            <p>{{ t('开始、结束和重复规则都属于这项安排本身。', 'Start, end, and recurrence belong to the event itself.') }}</p>
          </div>
        </div>

        <label class="calendar-editor__toggle">
          <input v-model="draft.allDay" type="checkbox" data-testid="calendar-editor-all-day" />
          <span>
            <strong>{{ t('全天', 'All day') }}</strong>
            <small>{{ t('按日期显示，不固定具体时刻。', 'Show by date without a fixed clock time.') }}</small>
          </span>
        </label>

        <div v-if="draft.allDay" class="calendar-editor__field-grid">
          <label class="calendar-editor__field">
            <span>{{ t('开始日期', 'Start date') }}</span>
            <input v-model="draft.startDate" type="date" data-testid="calendar-editor-start-date" />
          </label>
          <label class="calendar-editor__field">
            <span>{{ t('结束日期', 'End date') }}</span>
            <input v-model="draft.endDate" type="date" data-testid="calendar-editor-end-date" />
          </label>
        </div>
        <div v-else class="calendar-editor__field-grid">
          <label class="calendar-editor__field">
            <span>{{ t('开始时间', 'Starts') }}</span>
            <input v-model="draft.startsAtInput" type="datetime-local" data-testid="calendar-editor-starts-at" />
          </label>
          <label class="calendar-editor__field">
            <span>{{ t('结束时间', 'Ends') }}</span>
            <input v-model="draft.endsAtInput" type="datetime-local" data-testid="calendar-editor-ends-at" />
          </label>
        </div>

        <div class="calendar-editor__field-grid">
          <label class="calendar-editor__field">
            <span>{{ t('重复', 'Repeat') }}</span>
            <select v-model="draft.recurrence" data-testid="calendar-editor-recurrence">
              <option value="none">{{ t('不重复', 'Does not repeat') }}</option>
              <option value="daily">{{ t('每天', 'Daily') }}</option>
              <option value="weekly">{{ t('每周', 'Weekly') }}</option>
              <option value="monthly">{{ t('每月', 'Monthly') }}</option>
              <option value="yearly">{{ t('每年', 'Yearly') }}</option>
            </select>
          </label>
          <label v-if="draft.recurrence !== 'none'" class="calendar-editor__field">
            <span>{{ t('重复至（可留空）', 'Repeat until (optional)') }}</span>
            <input
              v-model="draft.recurrenceUntilDate"
              type="date"
              data-testid="calendar-editor-recurrence-until"
            />
          </label>
        </div>
      </section>

      <section class="calendar-editor__section">
        <div class="calendar-editor__section-heading">
          <span class="calendar-editor__section-icon" aria-hidden="true">
            <i class="fas fa-list-check"></i>
          </span>
          <div>
            <h3>{{ t('参与与提醒', 'Commitment and reminder') }}</h3>
            <p>{{ t('这只描述日历安排，不会创建行程或执行状态。', 'This describes the calendar commitment without creating execution state.') }}</p>
          </div>
        </div>

        <fieldset class="calendar-editor__choice-group">
          <legend>{{ t('参与要求', 'Requirement') }}</legend>
          <label :class="{ 'is-selected': draft.requirement === 'required' }">
            <input v-model="draft.requirement" type="radio" value="required" />
            <span>
              <strong>{{ t('必需', 'Required') }}</strong>
              <small>{{ t('这是已确认、需要参加的安排。', 'This confirmed event is expected to happen.') }}</small>
            </span>
          </label>
          <label :class="{ 'is-selected': draft.requirement === 'optional' }">
            <input v-model="draft.requirement" type="radio" value="optional" />
            <span>
              <strong>{{ t('可选', 'Optional') }}</strong>
              <small>{{ t('保留时间，但可以不参加。', 'Reserve the time without making attendance required.') }}</small>
            </span>
          </label>
        </fieldset>

        <label class="calendar-editor__field">
          <span>{{ t('提前提醒', 'Reminder') }}</span>
          <select v-model.number="draft.reminderLeadMinutes" data-testid="calendar-editor-reminder-lead">
            <option :value="0">{{ t('开始时', 'At start time') }}</option>
            <option :value="5">{{ t('提前 5 分钟', '5 minutes before') }}</option>
            <option :value="10">{{ t('提前 10 分钟', '10 minutes before') }}</option>
            <option :value="15">{{ t('提前 15 分钟', '15 minutes before') }}</option>
            <option :value="30">{{ t('提前 30 分钟', '30 minutes before') }}</option>
            <option :value="60">{{ t('提前 1 小时', '1 hour before') }}</option>
            <option :value="120">{{ t('提前 2 小时', '2 hours before') }}</option>
            <option :value="1440">{{ t('提前 1 天', '1 day before') }}</option>
            <option :value="2880">{{ t('提前 2 天', '2 days before') }}</option>
            <option :value="10080">{{ t('提前 1 周', '1 week before') }}</option>
          </select>
        </label>
      </section>

      <section class="calendar-editor__section">
        <div class="calendar-editor__section-heading">
          <span class="calendar-editor__section-icon" aria-hidden="true">
            <i class="fas fa-tag"></i>
          </span>
          <div>
            <h3>{{ t('便签', 'Marker') }}</h3>
            <p>{{ t('只影响日历里的颜色标识，不改变安排本身。', 'Only changes the color mark in Calendar; the event itself stays unchanged.') }}</p>
          </div>
        </div>

        <div class="calendar-editor__marker-grid" role="radiogroup" :aria-label="t('便签', 'Marker')">
          <button
            v-for="marker in markers"
            :key="marker.id"
            type="button"
            role="radio"
            :aria-checked="draft.markerId === marker.id"
            class="calendar-editor__marker-chip"
            :class="{ 'is-selected': draft.markerId === marker.id }"
            :style="{ '--calendar-marker-color': markerColorFor(marker) }"
            :data-testid="`calendar-editor-marker-${marker.id}`"
            @click="toggleMarker(marker.id)"
          >
            <i aria-hidden="true"></i>
            <span>{{ t(marker.labelZh, marker.labelEn) }}</span>
          </button>
        </div>
        <p v-if="draft.markerId" class="calendar-editor__marker-clear">
          <button type="button" data-testid="calendar-editor-marker-clear" @click="toggleMarker(draft.markerId)">
            {{ t('移除便签', 'Remove marker') }}
          </button>
        </p>
      </section>

      <section class="calendar-editor__section">
        <div class="calendar-editor__section-heading">
          <span class="calendar-editor__section-icon" aria-hidden="true">
            <i class="fas fa-location-dot"></i>
          </span>
          <div>
            <h3>{{ t('地点', 'Place') }}</h3>
            <p>{{ t('只选择 Map 已有的稳定地点；日历不复制坐标。', 'Choose a stable Map place; Calendar does not copy coordinates.') }}</p>
          </div>
        </div>

        <div v-if="draft.locationRef" class="calendar-editor__selected-place" data-testid="calendar-editor-selected-place">
          <span aria-hidden="true"><i class="fas fa-map-pin"></i></span>
          <div>
            <strong>
              {{ selectedPlace ? selectedPlace.displayLabel : t(draft.locationRef.labelZh, draft.locationRef.labelEn) }}
            </strong>
            <small>
              {{ selectedPlace ? selectedPlace.displayDetail : t('该地点当前不在活动地图中', 'This place is not in the active map') }}
            </small>
          </div>
          <button type="button" data-testid="calendar-editor-clear-place" @click="clearPlace">
            {{ t('清除', 'Clear') }}
          </button>
        </div>

        <label class="calendar-editor__field">
          <span>{{ draft.locationRef ? t('更换地点', 'Change place') : t('搜索 Map 地点', 'Search Map places') }}</span>
          <div class="calendar-editor__search">
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <input
              v-model="placeQuery"
              data-testid="calendar-editor-place-search"
              autocomplete="off"
              :placeholder="t('输入地点名或地址', 'Search name or address')"
            />
          </div>
        </label>

        <div class="calendar-editor__place-results" data-testid="calendar-editor-place-results">
          <button
            v-for="place in filteredPlaces"
            :key="place.optionId"
            type="button"
            :class="{
              'is-selected':
                draft.locationRef?.mapPackId === place.mapPackId &&
                draft.locationRef?.placeId === place.placeId,
            }"
            :data-testid="`calendar-editor-place-${place.placeId}`"
            @click="selectPlace(place)"
          >
            <span aria-hidden="true"><i :class="place.icon || 'fas fa-location-dot'"></i></span>
            <span>
              <strong>{{ place.displayLabel }}</strong>
              <small>{{ place.displayDetail }}</small>
            </span>
            <i class="fas fa-check" aria-hidden="true"></i>
          </button>
          <p v-if="filteredPlaces.length === 0" class="calendar-editor__place-empty">
            {{ t('活动地图中没有匹配地点。', 'No matching place exists in the active map.') }}
          </p>
        </div>
      </section>

      <p
        v-if="validationMessage"
        class="calendar-editor__validation"
        role="alert"
        data-testid="calendar-editor-validation"
      >
        <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
        <span>{{ validationMessage }}</span>
      </p>

      <footer class="calendar-editor__actions">
        <button type="button" class="calendar-editor__button is-secondary" data-testid="calendar-editor-cancel" @click="emit('cancel')">
          {{ t('取消', 'Cancel') }}
        </button>
        <button type="submit" class="calendar-editor__button is-primary" data-testid="calendar-editor-save" :disabled="saving">
          <i class="fas fa-check" aria-hidden="true"></i>
          <span>{{ saving ? t('保存中', 'Saving') : t('保存', 'Save') }}</span>
        </button>
      </footer>
    </form>
  </template>
</template>

<style scoped>
.calendar-editor-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(14, 18, 28, 0.42);
  backdrop-filter: blur(12px);
}

.calendar-editor {
  position: fixed;
  top: max(20px, env(safe-area-inset-top));
  left: max(18px, env(safe-area-inset-left));
  right: max(18px, env(safe-area-inset-right));
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 91;
  width: min(760px, calc(100vw - 36px));
  margin: 0 auto;
  padding: 20px;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid var(--system-card-border);
  border-radius: calc(var(--system-radius-md) + 8px);
  color: var(--system-text);
  background: var(--system-panel-bg);
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.26);
}

.calendar-editor__header,
.calendar-editor__section-heading,
.calendar-editor__selected-place,
.calendar-editor__actions,
.calendar-editor__search,
.calendar-editor__place-results button,
.calendar-editor__toggle,
.calendar-editor__choice-group label {
  display: flex;
  align-items: center;
}

.calendar-editor__header {
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--system-subtle-border);
}

.calendar-editor__header p,
.calendar-editor__header h2,
.calendar-editor__section-heading h3,
.calendar-editor__section-heading p,
.calendar-editor__selected-place strong,
.calendar-editor__selected-place small,
.calendar-editor__place-results strong,
.calendar-editor__place-results small,
.calendar-editor__place-empty {
  margin: 0;
}

.calendar-editor__header p {
  color: var(--system-accent);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.calendar-editor__header h2 {
  margin-top: 3px;
  font-size: 22px;
  line-height: 1.2;
}

.calendar-editor__close {
  width: 44px;
  height: 44px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--system-control-border);
  border-radius: 50%;
  color: var(--system-text);
  background: var(--system-control-bg);
  font: inherit;
  cursor: pointer;
}

.calendar-editor__section {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--system-subtle-border);
  border-radius: var(--system-radius-md);
  background: var(--system-surface-muted);
}

.calendar-editor__section-heading {
  align-items: flex-start;
  gap: 11px;
  margin-bottom: 14px;
}

.calendar-editor__section-icon {
  width: 34px;
  height: 34px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 11px;
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.calendar-editor__section-heading div {
  min-width: 0;
}

.calendar-editor__section-heading h3 {
  font-size: 14px;
  line-height: 1.35;
}

.calendar-editor__section-heading p {
  margin-top: 3px;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.calendar-editor__field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.calendar-editor__field-grid + .calendar-editor__field-grid,
.calendar-editor__toggle + .calendar-editor__field-grid,
.calendar-editor__field-grid + .calendar-editor__field-grid {
  margin-top: 12px;
}

.calendar-editor__field {
  min-width: 0;
  display: grid;
  gap: 6px;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 750;
}

.calendar-editor__field input,
.calendar-editor__field select,
.calendar-editor__field textarea,
.calendar-editor__search {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  color: var(--system-text);
  background: var(--system-control-bg-strong);
  font: inherit;
  font-size: 13px;
}

.calendar-editor__field input,
.calendar-editor__field select,
.calendar-editor__field textarea {
  padding: 10px 11px;
}

.calendar-editor__field textarea {
  min-height: 92px;
  resize: vertical;
  line-height: 1.55;
}

.calendar-editor__toggle {
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
  padding: 11px 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  background: var(--system-control-bg);
  cursor: pointer;
}

.calendar-editor__toggle input,
.calendar-editor__choice-group input {
  width: 18px;
  height: 18px;
  flex: none;
  margin: 1px 0 0;
  accent-color: var(--system-accent);
}

.calendar-editor__toggle span,
.calendar-editor__choice-group span {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.calendar-editor__toggle strong,
.calendar-editor__choice-group strong {
  font-size: 12px;
}

.calendar-editor__toggle small,
.calendar-editor__choice-group small {
  color: var(--system-text-muted);
  font-size: 10px;
  line-height: 1.45;
}

.calendar-editor__choice-group {
  min-width: 0;
  margin: 0 0 12px;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  border: 0;
}

.calendar-editor__choice-group legend {
  grid-column: 1 / -1;
  margin-bottom: 6px;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 750;
}

.calendar-editor__choice-group label {
  align-items: flex-start;
  gap: 9px;
  min-width: 0;
  padding: 11px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  background: var(--system-control-bg);
  cursor: pointer;
}

.calendar-editor__choice-group label.is-selected {
  border-color: var(--system-accent);
  background: var(--system-accent-soft);
}

.calendar-editor__selected-place {
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
  padding: 11px;
  border: 1px solid color-mix(in srgb, var(--system-accent) 30%, var(--system-control-border));
  border-radius: var(--system-radius-sm);
  background: var(--system-accent-soft);
}

.calendar-editor__selected-place > span {
  width: 30px;
  height: 30px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--system-accent);
  background: var(--system-panel-bg);
}

.calendar-editor__selected-place > div {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 3px;
}

.calendar-editor__selected-place strong,
.calendar-editor__selected-place small {
  overflow-wrap: anywhere;
}

.calendar-editor__selected-place strong {
  font-size: 12px;
}

.calendar-editor__selected-place small {
  color: var(--system-text-muted);
  font-size: 10px;
  line-height: 1.45;
}

.calendar-editor__selected-place button {
  min-height: 34px;
  flex: none;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  color: var(--system-danger);
  background: var(--system-danger-soft);
  font: inherit;
  font-size: 10px;
  font-weight: 750;
  cursor: pointer;
}

.calendar-editor__search {
  gap: 8px;
  padding: 0 11px;
}

.calendar-editor__search i {
  flex: none;
  color: var(--system-text-muted);
}

.calendar-editor__search input {
  min-height: 42px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
}

.calendar-editor__place-results {
  max-height: 236px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-x: hidden;
  overflow-y: auto;
}

.calendar-editor__place-results button {
  width: 100%;
  min-width: 0;
  min-height: 50px;
  gap: 9px;
  padding: 9px 10px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  color: var(--system-text);
  background: var(--system-control-bg);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.calendar-editor__place-results button > span:first-child {
  width: 30px;
  height: 30px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.calendar-editor__place-results button > span:nth-child(2) {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;
}

.calendar-editor__place-results strong,
.calendar-editor__place-results small {
  overflow-wrap: anywhere;
}

.calendar-editor__place-results strong {
  font-size: 11px;
}

.calendar-editor__place-results small {
  color: var(--system-text-muted);
  font-size: 9px;
  line-height: 1.4;
}

.calendar-editor__place-results button > i {
  flex: none;
  color: transparent;
}

.calendar-editor__place-results button.is-selected {
  border-color: var(--system-accent);
  background: var(--system-accent-soft);
}

.calendar-editor__place-results button.is-selected > i {
  color: var(--system-accent);
}

.calendar-editor__place-empty {
  padding: 16px;
  color: var(--system-text-muted);
  font-size: 11px;
  text-align: center;
}

.calendar-editor__validation {
  margin: 14px 0 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 11px 12px;
  border-radius: var(--system-radius-sm);
  color: var(--system-danger);
  background: var(--system-danger-soft);
  font-size: 11px;
  line-height: 1.5;
}

.calendar-editor__actions {
  position: sticky;
  bottom: -20px;
  justify-content: flex-end;
  gap: 8px;
  margin: 18px -20px -20px;
  padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--system-subtle-border);
  background: color-mix(in srgb, var(--system-panel-bg) 92%, transparent);
  backdrop-filter: blur(16px);
}

.calendar-editor__button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 18px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  font-weight: 780;
  cursor: pointer;
}

.calendar-editor__button.is-secondary {
  color: var(--system-text);
  background: var(--system-control-bg);
}

.calendar-editor__button.is-primary {
  border-color: var(--system-accent);
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.calendar-editor button:focus-visible,
.calendar-editor input:focus-visible,
.calendar-editor select:focus-visible,
.calendar-editor textarea:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
}

@media (max-width: 680px) {
  .calendar-editor {
    top: calc(54px + env(safe-area-inset-top));
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    padding: 16px;
    border-radius: calc(var(--system-radius-md) + 8px) calc(var(--system-radius-md) + 8px) 0 0;
  }

  .calendar-editor__field-grid,
  .calendar-editor__choice-group {
    grid-template-columns: 1fr;
  }

  .calendar-editor__section {
    padding: 14px;
  }

  .calendar-editor__actions {
    bottom: -16px;
    margin: 16px -16px -16px;
    padding-inline: 16px;
  }
}

@media (max-width: 390px) {
  .calendar-editor__actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  }

  .calendar-editor__button {
    min-width: 0;
    padding-inline: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .calendar-editor * {
    scroll-behavior: auto !important;
  }
}

.calendar-editor__marker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.calendar-editor__marker-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.calendar-editor__marker-chip i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--calendar-marker-color, var(--system-control-border));
}

.calendar-editor__marker-chip.is-selected {
  border-color: var(--calendar-marker-color);
  background: color-mix(in srgb, var(--calendar-marker-color) 14%, transparent);
  box-shadow: 0 0 0 1px var(--calendar-marker-color);
}

.calendar-editor__marker-clear {
  margin: 0;
}

.calendar-editor__marker-clear button {
  border: 0;
  padding: 0;
  color: var(--system-accent);
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
</style>
