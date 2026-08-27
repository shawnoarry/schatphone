<template>
  <div class="care-sheet" data-testid="healthcare-booking-sheet">
    <button
      type="button"
      class="care-sheet__scrim"
      :aria-label="copy.close"
      @click="$emit('close')"
    ></button>
    <section
      class="care-sheet__panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <header class="care-sheet__header">
        <HealthcareMascot size="brand" pose="standing" />
        <div>
          <span class="care-sheet__eyebrow">{{ copy.eyebrow }}</span>
          <h2 :id="titleId">{{ isReschedule ? copy.rescheduleTitle : copy.title }}</h2>
          <p>{{ serviceName }}</p>
        </div>
        <button type="button" class="care-icon-button" :aria-label="copy.close" @click="$emit('close')">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </header>

      <div class="care-sheet__body">
        <div v-if="!isReschedule" class="care-booking-step">
          <span class="care-field-label">{{ copy.reason }}</span>
          <div class="care-choice-grid">
            <button
              v-for="reason in reasons"
              :key="reason.id"
              type="button"
              class="care-choice"
              :class="{ 'is-selected': reason.id === selectedReasonId }"
              :aria-pressed="reason.id === selectedReasonId"
              @click="selectedReasonId = reason.id"
            >
              <i class="fas fa-circle-check" aria-hidden="true"></i>
              <span>{{ reason.label }}</span>
            </button>
          </div>
          <p class="care-field-note">
            <i class="fas fa-shield-heart" aria-hidden="true"></i>
            {{ copy.privacy }}
          </p>
        </div>

        <div class="care-booking-step">
          <span class="care-field-label">{{ copy.date }}</span>
          <div class="care-date-grid">
            <button
              v-for="slot in dateSlots"
              :key="slot.date"
              type="button"
              class="care-date-choice"
              :class="{ 'is-selected': slot.date === selectedDate }"
              :aria-pressed="slot.date === selectedDate"
              @click="selectDate(slot.date)"
            >
              <span>{{ slot.label }}</span>
              <small>{{ slot.times.length }} {{ copy.times }}</small>
            </button>
          </div>
        </div>

        <div class="care-booking-step">
          <span class="care-field-label">{{ copy.time }}</span>
          <div class="care-time-grid">
            <button
              v-for="time in availableTimes"
              :key="time"
              type="button"
              class="care-time-choice"
              :class="{ 'is-selected': time === selectedTime }"
              :aria-pressed="time === selectedTime"
              @click="selectedTime = time"
            >
              {{ time }}
            </button>
          </div>
        </div>

        <div class="care-booking-receipt">
          <i class="fas fa-file-circle-check" aria-hidden="true"></i>
          <p>
            <strong>{{ copy.localTitle }}</strong>
            <span>{{ copy.localBody }}</span>
          </p>
        </div>

        <p v-if="errorText" class="care-sheet__error" role="alert" data-testid="healthcare-booking-error">
          {{ errorText }}
        </p>
      </div>

      <footer class="care-sheet__footer">
        <button type="button" class="care-secondary-button" @click="$emit('close')">
          {{ copy.cancel }}
        </button>
        <button
          type="button"
          class="care-primary-button"
          :disabled="!canSubmit"
          data-testid="healthcare-booking-confirm"
          @click="submit"
        >
          {{ isReschedule ? copy.confirmReschedule : copy.confirm }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import HealthcareMascot from './HealthcareMascot.vue'

const props = defineProps({
  titleId: { type: String, default: 'healthcare-booking-title' },
  serviceName: { type: String, required: true },
  reasons: { type: Array, default: () => [] },
  dateSlots: { type: Array, default: () => [] },
  initial: { type: Object, default: null },
  copy: { type: Object, required: true },
  errorText: { type: String, default: '' },
})

const emit = defineEmits(['close', 'submit'])

const isReschedule = computed(() => Boolean(props.initial))
const selectedReasonId = ref(props.initial?.reasonId || props.reasons[0]?.id || '')
const selectedDate = ref(props.initial?.date || props.dateSlots[0]?.date || '')
const selectedTime = ref(props.initial?.time || props.dateSlots[0]?.times?.[0] || '')
const availableTimes = computed(
  () => props.dateSlots.find((slot) => slot.date === selectedDate.value)?.times || [],
)
const canSubmit = computed(
  () =>
    Boolean(selectedDate.value) &&
    Boolean(selectedTime.value) &&
    (isReschedule.value || Boolean(selectedReasonId.value)),
)

const selectDate = (date) => {
  selectedDate.value = date
  selectedTime.value = props.dateSlots.find((slot) => slot.date === date)?.times?.[0] || ''
}

const submit = () => {
  if (!canSubmit.value) return
  emit('submit', {
    reasonId: selectedReasonId.value,
    date: selectedDate.value,
    time: selectedTime.value,
  })
}
</script>
