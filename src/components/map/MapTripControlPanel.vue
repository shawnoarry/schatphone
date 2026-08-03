<script setup>
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'
import {
  MAP_JOURNEY_CHECKPOINT_DEFINITIONS,
  MAP_JOURNEY_PHASE,
  MAP_TRANSPORT_MODES,
  getMapTransportMode,
} from '../../lib/map-journey'

const props = defineProps({
  tripForm: {
    type: Object,
    required: true,
  },
  tripEstimate: {
    type: Object,
    required: true,
  },
  tripRuntime: {
    type: Object,
    required: true,
  },
  tripStatusLabel: {
    type: String,
    default: '',
  },
  tripProgressPercent: {
    type: Number,
    default: 0,
  },
  tripArrivalPushStatusLabel: {
    type: String,
    default: '',
  },
  tripArrivalPushHint: {
    type: String,
    default: '',
  },
  tripActionHint: {
    type: Object,
    default: () => ({ tone: '', message: '' }),
  },
  journeyEventProposal: {
    type: Object,
    default: null,
  },
  journeyEventApplying: {
    type: Boolean,
    default: false,
  },
  isTripTraveling: {
    type: Boolean,
    default: false,
  },
  isTripArrived: {
    type: Boolean,
    default: false,
  },
  isRealWorldMap: {
    type: Boolean,
    default: false,
  },
  relationshipContactOptions: {
    type: Array,
    default: () => [],
  },
  tripPlaceOptions: {
    type: Array,
    default: () => [],
  },
  rolePositionLabel: {
    type: String,
    default: '',
  },
  rolePositionValue: {
    type: String,
    default: '',
  },
  sharedRouteContactId: {
    type: [String, Number],
    default: '',
  },
  canStartTrip: {
    type: Boolean,
    default: false,
  },
  formatSeconds: {
    type: Function,
    required: true,
  },
  formatTime: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'acknowledge-arrival',
  'cancel-trip',
  'start-trip',
  'resolve-journey-event',
  'update-shared-route-contact',
  'update-transport-mode',
  'update-trip-from',
  'update-trip-to',
])

const { t } = useI18n()

const transportLocked = computed(() => props.isTripTraveling || props.isTripArrived)
const isLegacyJourney = computed(
  () => transportLocked.value && Number(props.tripRuntime.estimateVersion || 0) === 0,
)
const selectedTransportMode = computed(() =>
  isLegacyJourney.value
    ? ''
    : transportLocked.value
    ? props.tripRuntime.transportMode || ''
    : props.tripForm.transportMode || '',
)
const selectedTransport = computed(() => getMapTransportMode(selectedTransportMode.value))
const hasEstimate = computed(() => Boolean(props.tripEstimate.transportMode))
const journeySteps = computed(() => {
  const checkpointById = new Map(
    (Array.isArray(props.tripRuntime.checkpoints) ? props.tripRuntime.checkpoints : []).map(
      (checkpoint) => [checkpoint.id, checkpoint],
    ),
  )
  const completed = MAP_JOURNEY_CHECKPOINT_DEFINITIONS.filter(
    (definition) => checkpointById.get(definition.id)?.status === 'completed',
  )
  const currentId =
    props.tripRuntime.phase === MAP_JOURNEY_PHASE.PAUSED
      ? completed.at(-1)?.id || 'departure'
      : MAP_JOURNEY_CHECKPOINT_DEFINITIONS.find(
          (definition) => definition.phase === props.tripRuntime.phase,
        )?.id || completed.at(-1)?.id || 'departure'
  return MAP_JOURNEY_CHECKPOINT_DEFINITIONS.map((definition) => ({
    ...definition,
    completed: checkpointById.get(definition.id)?.status === 'completed',
    current: definition.id === currentId,
  }))
})
const journeyPhaseLabel = computed(() => {
  if (props.tripRuntime.phase === MAP_JOURNEY_PHASE.PAUSED) {
    return t('已暂停', 'Paused')
  }
  const definition = MAP_JOURNEY_CHECKPOINT_DEFINITIONS.find(
    (item) => item.phase === props.tripRuntime.phase,
  )
  return definition
    ? t(definition.labelZh, definition.labelEn)
    : props.isTripArrived
      ? t('已到达', 'Arrived')
      : t('已出发', 'Departed')
})
const hasPendingJourneyEvent = computed(() =>
  Boolean(props.tripRuntime?.activeInterruption?.proposalId),
)
const journeyEventStageLabel = computed(() => {
  const checkpointId = props.tripRuntime?.activeInterruption?.checkpointId || ''
  const definition = MAP_JOURNEY_CHECKPOINT_DEFINITIONS.find(
    (item) => item.id === checkpointId,
  )
  return definition ? t(definition.labelZh, definition.labelEn) : t('途中', 'En route')
})
const canContinueJourneyEvent = computed(() =>
  props.journeyEventProposal?.allowedOutcomes?.includes('continue'),
)
const canDelayJourneyEvent = computed(() =>
  props.journeyEventProposal?.allowedOutcomes?.includes('delay'),
)

const transportLabel = (mode) =>
  props.isRealWorldMap
    ? t(mode.labelZh, mode.labelEn)
    : t(mode.neutralLabelZh, mode.neutralLabelEn)

const consumptionLabel = computed(() => {
  if (props.tripEstimate.consumptionLevel === 'low') return t('低', 'Low')
  if (props.tripEstimate.consumptionLevel === 'high') return t('高', 'High')
  if (props.tripEstimate.consumptionLevel === 'medium') return t('中', 'Medium')
  return '--'
})
const userTripPlaceOptions = computed(() =>
  props.tripPlaceOptions.filter((option) => option.source === 'user'),
)
const worldTripPlaceOptions = computed(() =>
  props.tripPlaceOptions.filter((option) => option.source !== 'user'),
)
const applyEndpointChoice = (endpoint, event) => {
  const value = event?.target?.value || ''
  if (!value || transportLocked.value) return
  emit(endpoint === 'from' ? 'update-trip-from' : 'update-trip-to', value)
  event.target.value = ''
}
</script>

<template>
  <section class="map-trip-panel map-glass-panel rounded-[1.75rem] p-4">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="font-semibold">{{ t('行程计划', 'Journey plan') }}</h2>
      <span class="map-trip-status">{{ tripStatusLabel }}</span>
    </div>

    <div class="map-trip-endpoints">
      <div class="map-trip-endpoint-row">
        <input
          :value="tripForm.from"
          :readonly="transportLocked"
          data-testid="map-trip-from-input"
          :placeholder="t('起点', 'From')"
          @input="$emit('update-trip-from', $event.target.value)"
        />
        <select
          :disabled="transportLocked"
          data-testid="map-trip-from-picker"
          :aria-label="t('从地点中选择起点', 'Choose start from places')"
          @change="applyEndpointChoice('from', $event)"
        >
          <option value="">{{ t('点选起点', 'Pick start') }}</option>
          <option v-if="rolePositionValue" :value="rolePositionValue">
            {{ t('角色位置', 'Role position') }} · {{ rolePositionLabel || rolePositionValue }}
          </option>
          <optgroup v-if="userTripPlaceOptions.length" :label="t('我的地点', 'My places')">
            <option v-for="option in userTripPlaceOptions" :key="`from-${option.id}`" :value="option.value">{{ option.label }}</option>
          </optgroup>
          <optgroup v-if="worldTripPlaceOptions.length" :label="t('世界地点', 'World places')">
            <option v-for="option in worldTripPlaceOptions" :key="`from-${option.id}`" :value="option.value">{{ option.label }}</option>
          </optgroup>
        </select>
      </div>
      <div class="map-trip-endpoint-row">
        <input
          :value="tripForm.to"
          :readonly="transportLocked"
          data-testid="map-trip-to-input"
          :placeholder="t('目的地', 'Destination')"
          @input="$emit('update-trip-to', $event.target.value)"
        />
        <select
          :disabled="transportLocked"
          data-testid="map-trip-to-picker"
          :aria-label="t('从地点中选择目的地', 'Choose destination from places')"
          @change="applyEndpointChoice('to', $event)"
        >
          <option value="">{{ t('点选目的地', 'Pick destination') }}</option>
          <optgroup v-if="userTripPlaceOptions.length" :label="t('我的地点', 'My places')">
            <option v-for="option in userTripPlaceOptions" :key="`to-${option.id}`" :value="option.value">{{ option.label }}</option>
          </optgroup>
          <optgroup v-if="worldTripPlaceOptions.length" :label="t('世界地点', 'World places')">
            <option v-for="option in worldTripPlaceOptions" :key="`to-${option.id}`" :value="option.value">{{ option.label }}</option>
          </optgroup>
        </select>
      </div>
    </div>

    <div class="map-transport-section">
      <div class="map-transport-heading">
        <span>{{ t('交通方式', 'Transport') }}</span>
        <small v-if="transportLocked"><i class="fas fa-lock" aria-hidden="true"></i>{{ t('本次行程已锁定', 'Locked for this journey') }}</small>
      </div>
      <div class="map-transport-grid" role="radiogroup" :aria-label="t('交通方式', 'Transport mode')" data-testid="map-transport-mode-grid">
        <button
          v-for="mode in MAP_TRANSPORT_MODES"
          :key="mode.id"
          type="button"
          role="radio"
          class="map-transport-option"
          :class="{ 'is-selected': selectedTransportMode === mode.id }"
          :aria-checked="selectedTransportMode === mode.id"
          :disabled="transportLocked"
          :data-testid="`map-transport-mode-${mode.id}`"
          @click="$emit('update-transport-mode', mode.id)"
        >
          <i :class="mode.icon" aria-hidden="true"></i>
          <span>{{ transportLabel(mode) }}</span>
        </button>
      </div>
    </div>

    <div class="map-trip-estimate" data-testid="map-trip-estimate">
      <div>
        <span>{{ t('距离', 'Distance') }}</span>
        <strong>{{ tripEstimate.distanceKm }} km</strong>
      </div>
      <div>
        <span>{{ t('预计时长', 'Estimated duration') }}</span>
        <strong>{{ hasEstimate ? `${tripEstimate.minutes} ${t('分钟', 'min')}` : '--' }}</strong>
      </div>
      <div>
        <span>{{ isRealWorldMap ? t('预计费用', 'Estimated cost') : t('预计消耗', 'Estimated consumption') }}</span>
        <strong v-if="isRealWorldMap">{{ hasEstimate ? `₩ ${Number(tripEstimate.fare || 0).toLocaleString()}` : '--' }}</strong>
        <strong v-else>{{ consumptionLabel }}</strong>
      </div>
      <p>{{ t('本地估算 · 非实时路线或票价', 'Local estimate · not live routing or pricing') }}</p>
    </div>

    <div v-if="isTripTraveling || isTripArrived" class="map-trip-runtime">
      <div class="map-trip-runtime-mode">
        <span><i :class="selectedTransport?.icon || 'fas fa-route'" aria-hidden="true"></i>{{ isLegacyJourney ? t('旧行程', 'Legacy journey') : selectedTransport ? transportLabel(selectedTransport) : t('旧行程', 'Legacy journey') }}</span>
        <strong>{{ (tripRuntime.fromLabel || t('起点', 'From')) + ' -> ' + (tripRuntime.toLabel || t('目的地', 'Destination')) }}</strong>
      </div>
      <div class="map-journey-stage" data-testid="map-journey-phase">
        <span>{{ t('当前阶段', 'Current stage') }}</span>
        <strong>{{ journeyPhaseLabel }}</strong>
      </div>
      <ol class="map-journey-steps" data-testid="map-journey-steps">
        <li
          v-for="step in journeySteps"
          :key="step.id"
          :class="{ 'is-completed': step.completed, 'is-current': step.current }"
          :data-testid="`map-journey-step-${step.id}`"
        >
          <span aria-hidden="true"></span>
          <small>{{ t(step.labelZh, step.labelEn) }}</small>
        </li>
      </ol>
      <aside
        v-if="hasPendingJourneyEvent"
        class="map-journey-event"
        data-testid="map-journey-event-card"
      >
        <div class="map-journey-event-heading">
          <span><i class="fas fa-diamond-turn-right" aria-hidden="true"></i>{{ t('途中情况', 'Route update') }}</span>
          <small>{{ journeyEventStageLabel }} · {{ t('行程仍在继续', 'Journey continues') }}</small>
        </div>
        <template v-if="journeyEventProposal">
          <strong>{{ t(journeyEventProposal.titleZh, journeyEventProposal.titleEn) }}</strong>
          <p>{{ t(journeyEventProposal.summaryZh, journeyEventProposal.summaryEn) }}</p>
          <small>{{ t(journeyEventProposal.detailZh, journeyEventProposal.detailEn) }}</small>
          <div class="map-journey-event-actions">
            <button
              v-if="canContinueJourneyEvent"
              type="button"
              :disabled="journeyEventApplying"
              data-testid="map-journey-event-continue"
              @click="$emit('resolve-journey-event', 'continue')"
            >
              <i class="fas fa-check" aria-hidden="true"></i>
              {{ t('保持原计划', 'Keep current ETA') }}
            </button>
            <button
              v-if="canDelayJourneyEvent"
              type="button"
              :disabled="journeyEventApplying"
              data-testid="map-journey-event-delay"
              @click="$emit('resolve-journey-event', 'delay')"
            >
              <i class="fas fa-clock" aria-hidden="true"></i>
              {{ t('接受 2 分钟延误', 'Add 2 min delay') }}
            </button>
          </div>
        </template>
        <template v-else>
          <strong>{{ t('事件记录暂不可用', 'Event record unavailable') }}</strong>
          <p>{{ t('关闭这条提示即可，当前行程和预计时间不会改变。', 'Clear this notice; the journey and ETA will not change.') }}</p>
          <div class="map-journey-event-actions">
            <button
              type="button"
              :disabled="journeyEventApplying"
              data-testid="map-journey-event-recover"
              @click="$emit('resolve-journey-event', 'continue')"
            >
              <i class="fas fa-xmark" aria-hidden="true"></i>
              {{ t('关闭提示', 'Clear notice') }}
            </button>
          </div>
        </template>
      </aside>
      <div class="h-2 overflow-hidden rounded bg-gray-200">
        <div class="h-full bg-emerald-500 transition-all duration-500" :style="{ width: `${tripProgressPercent}%` }"></div>
      </div>
      <p class="text-xs text-gray-600">
        {{ t('进度', 'Progress') }} {{ tripProgressPercent }}% ·
        {{ t('剩余', 'Remaining') }} {{ formatSeconds(tripRuntime.remainingSeconds) }}
      </p>
      <p class="text-xs text-gray-600">
        {{ t('预计到达', 'ETA') }} {{ formatTime(tripRuntime.etaAt) }}
      </p>
      <p class="text-xs text-gray-600">
        {{ t('后台到达提醒', 'Background arrival push') }} {{ tripArrivalPushStatusLabel }}
      </p>
      <p class="text-[11px] text-gray-500">{{ tripArrivalPushHint }}</p>
      <p v-if="isTripArrived" class="text-xs text-emerald-700">
        {{ t('已按系统时间到达目的地。', 'Destination reached according to system time.') }}
      </p>
    </div>

    <div
      v-if="isTripArrived"
      class="map-shared-journey-record"
      data-testid="map-shared-journey-record"
    >
      <label>
        <span>{{ t('共同出行记录', 'Shared journey record') }}</span>
        <select
          :value="sharedRouteContactId"
          data-testid="map-relationship-contact"
          @change="$emit('update-shared-route-contact', $event.target.value)"
        >
          <option value="">{{ t('独自出行或暂不记录', 'Solo or not recorded') }}</option>
          <option
            v-for="contact in relationshipContactOptions"
            :key="contact.id"
            :value="contact.optionValue"
          >
            {{ contact.optionLabel }}
          </option>
        </select>
      </label>
    </div>

    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="!canStartTrip"
        class="map-trip-command is-primary"
        :class="{ 'is-disabled': !canStartTrip }"
        data-testid="map-trip-start"
        @click="$emit('start-trip')"
      >
        {{ t('开始行程', 'Start journey') }}
      </button>
      <button
        v-if="isTripTraveling"
        type="button"
        class="map-trip-command is-danger"
        @click="$emit('cancel-trip')"
      >
        {{ t('取消行程', 'Cancel journey') }}
      </button>
      <button
        v-if="isTripArrived"
        type="button"
        class="map-trip-command is-success"
        data-testid="map-trip-acknowledge"
        @click="$emit('acknowledge-arrival')"
      >
        {{ t('确认完成', 'Acknowledge') }}
      </button>
    </div>

    <p
      v-if="tripActionHint.message"
      class="mt-2 text-xs"
      :class="tripActionHint.tone === 'success' ? 'text-emerald-700' : tripActionHint.tone === 'warn' ? 'text-amber-700' : 'text-gray-600'"
    >
      {{ tripActionHint.message }}
    </p>
  </section>
</template>

<style scoped>
.map-trip-panel {
  color: #17211d;
}

.map-trip-endpoints {
  display: grid;
  gap: 8px;
}

.map-trip-endpoint-row {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) minmax(104px, 34%);
  gap: 7px;
}

.map-trip-endpoint-row input,
.map-trip-endpoint-row select {
  min-width: 0;
  min-height: 40px;
  border: 1px solid #d8dfda;
  border-radius: 7px;
  background: #fff;
  color: #26372f;
  font-size: 11px;
  outline: none;
}

.map-trip-endpoint-row input {
  padding: 0 10px;
}

.map-trip-endpoint-row select {
  padding: 0 7px;
  color: #17664f;
  font-weight: 800;
}

.map-trip-endpoint-row input:focus,
.map-trip-endpoint-row select:focus {
  border-color: #17664f;
  box-shadow: 0 0 0 3px rgba(23, 102, 79, 0.1);
}

.map-trip-endpoint-row input[readonly],
.map-trip-endpoint-row select:disabled {
  background: #f0f3f1;
  color: #6f7a74;
}

.map-shared-journey-record {
  margin-top: 12px;
  border-top: 1px solid #e1e7e3;
  padding-top: 12px;
}

.map-shared-journey-record label {
  display: grid;
  gap: 6px;
}

.map-shared-journey-record label > span {
  color: #647168;
  font-size: 10px;
  font-weight: 800;
}

.map-shared-journey-record select {
  width: 100%;
  min-height: 38px;
  border: 1px solid #d9e0db;
  border-radius: 7px;
  background: #fff;
  padding: 0 10px;
  color: #17211d;
  font-size: 11px;
  font-weight: 700;
  outline: none;
}

.map-trip-status {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #eef2ef;
  padding: 3px 8px;
  color: #647168;
  font-size: 11px;
}

.map-transport-section {
  margin-top: 14px;
}

.map-transport-heading {
  display: flex;
  min-height: 22px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
  color: #526159;
  font-size: 11px;
  font-weight: 800;
}

.map-transport-heading small {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #8a6a1f;
  font-size: 10px;
  font-weight: 700;
}

.map-transport-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.map-transport-option {
  display: grid;
  min-width: 0;
  min-height: 50px;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  border: 1px solid #dce2de;
  border-radius: 7px;
  background: #f7f9f7;
  padding: 7px 9px;
  color: #425149;
  text-align: left;
}

.map-transport-option i {
  color: #7b8981;
  text-align: center;
}

.map-transport-option span {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
}

.map-transport-option.is-selected {
  border-color: #17664f;
  background: #e6f0eb;
  color: #124f3d;
  box-shadow: inset 3px 0 #d5a83f;
}

.map-transport-option.is-selected i {
  color: #17664f;
}

.map-transport-option:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.map-transport-option.is-selected:disabled {
  opacity: 1;
}

.map-trip-estimate {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid #e0e5e2;
  border-radius: 7px;
  background: #e0e5e2;
}

.map-trip-estimate > div {
  display: flex;
  min-width: 0;
  min-height: 58px;
  flex-direction: column;
  justify-content: center;
  background: #f8faf8;
  padding: 7px;
}

.map-trip-estimate span {
  color: #718078;
  font-size: 9px;
}

.map-trip-estimate strong {
  margin-top: 3px;
  overflow-wrap: anywhere;
  color: #26372f;
  font-size: 11px;
  line-height: 1.25;
}

.map-trip-estimate > p {
  grid-column: 1 / -1;
  background: #f2f5f3;
  padding: 5px 7px;
  color: #738078;
  font-size: 9px;
}

.map-trip-runtime {
  margin-top: 12px;
  border: 1px solid #dce2de;
  border-radius: 7px;
  background: #f7f9f7;
  padding: 11px;
}

.map-trip-runtime > * + * {
  margin-top: 7px;
}

.map-trip-runtime-mode {
  display: grid;
  gap: 4px;
}

.map-trip-runtime-mode span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #17664f;
  font-size: 11px;
  font-weight: 800;
}

.map-trip-runtime-mode strong {
  overflow-wrap: anywhere;
  color: #35443c;
  font-size: 12px;
}

.map-journey-stage {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  color: #68756e;
  font-size: 10px;
}

.map-journey-stage strong {
  color: #17664f;
  font-size: 11px;
}

.map-journey-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.map-journey-steps li {
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: 4px;
  color: #87928c;
  text-align: center;
}

.map-journey-steps li > span {
  width: 100%;
  height: 4px;
  border-radius: 3px;
  background: #dfe5e1;
}

.map-journey-steps li small {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 8px;
  font-weight: 700;
  line-height: 1.2;
}

.map-journey-steps li.is-completed {
  color: #45665a;
}

.map-journey-steps li.is-completed > span {
  background: #67a28c;
}

.map-journey-steps li.is-current {
  color: #12513e;
}

.map-journey-steps li.is-current > span {
  background: #17664f;
  box-shadow: 0 0 0 2px #dcebe5;
}

.map-journey-event {
  display: grid;
  min-width: 0;
  gap: 7px;
  border: 1px solid #d7c78f;
  border-left: 3px solid #b28b2f;
  border-radius: 7px;
  background: #fffaf0;
  padding: 10px;
  color: #4c432a;
}

.map-journey-event-heading {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.map-journey-event-heading span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #745b1e;
  font-size: 10px;
  font-weight: 800;
}

.map-journey-event-heading small {
  max-width: 58%;
  overflow-wrap: anywhere;
  color: #7a7157;
  font-size: 8px;
  line-height: 1.35;
  text-align: right;
}

.map-journey-event > strong {
  overflow-wrap: anywhere;
  color: #3f3722;
  font-size: 12px;
}

.map-journey-event > p,
.map-journey-event > small {
  overflow-wrap: anywhere;
  line-height: 1.45;
}

.map-journey-event > p {
  color: #5d5338;
  font-size: 10px;
}

.map-journey-event > small {
  color: #81775d;
  font-size: 8px;
}

.map-journey-event-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.map-journey-event-actions button {
  display: inline-flex;
  min-width: 0;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #cbb978;
  border-radius: 6px;
  background: #fff;
  padding: 6px 8px;
  color: #634e16;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
}

.map-journey-event-actions button:disabled {
  cursor: wait;
  opacity: 0.55;
}

@media (max-width: 360px) {
  .map-journey-event-heading {
    display: grid;
  }

  .map-journey-event-heading small {
    max-width: none;
    text-align: left;
  }
}

.map-trip-command {
  min-height: 38px;
  border-radius: 7px;
  padding: 0 13px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.map-trip-command.is-primary { background: #17664f; }
.map-trip-command.is-danger { background: #b43c36; }
.map-trip-command.is-success { background: #187a57; }

.map-trip-command.is-disabled {
  background: #d5ddd8;
  color: #79847e;
  cursor: not-allowed;
}

@media (min-width: 430px) {
  .map-transport-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .map-transport-option {
    min-height: 58px;
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }
}
</style>
