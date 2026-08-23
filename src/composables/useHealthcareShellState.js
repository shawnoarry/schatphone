import { computed, ref } from 'vue'
import {
  HEALTHCARE_FIXTURE_APPOINTMENTS,
  HEALTHCARE_REPORTS,
  HEALTHCARE_SHELL_STORAGE_KEY,
  HEALTHCARE_SHELL_STORAGE_VERSION,
  findHealthcareService,
} from '../lib/healthcare-shell-data'

const clone = (value) => JSON.parse(JSON.stringify(value))

const defaultState = () => ({
  version: HEALTHCARE_SHELL_STORAGE_VERSION,
  appointments: clone(HEALTHCARE_FIXTURE_APPOINTMENTS),
  readReportIds: [],
  acknowledgedReportRevisions: {},
})

const normalizeState = (candidate) => {
  const fallback = defaultState()
  if (!candidate || candidate.version !== HEALTHCARE_SHELL_STORAGE_VERSION) return fallback
  const appointments = Array.isArray(candidate.appointments)
    ? candidate.appointments.filter((item) => item && typeof item.id === 'string')
    : fallback.appointments
  return {
    version: HEALTHCARE_SHELL_STORAGE_VERSION,
    appointments,
    readReportIds: Array.isArray(candidate.readReportIds)
      ? candidate.readReportIds.filter((id) => typeof id === 'string')
      : [],
    acknowledgedReportRevisions:
      candidate.acknowledgedReportRevisions && typeof candidate.acknowledgedReportRevisions === 'object'
        ? { ...candidate.acknowledgedReportRevisions }
        : {},
  }
}

const readState = () => {
  if (typeof localStorage === 'undefined') return defaultState()
  try {
    const raw = localStorage.getItem(HEALTHCARE_SHELL_STORAGE_KEY)
    return raw ? normalizeState(JSON.parse(raw)) : defaultState()
  } catch {
    return defaultState()
  }
}

const writeState = (nextState) => {
  if (typeof localStorage === 'undefined') return { ok: false, error: 'storage_unavailable' }
  try {
    localStorage.setItem(HEALTHCARE_SHELL_STORAGE_KEY, JSON.stringify(nextState))
    return { ok: true }
  } catch {
    return { ok: false, error: 'write_failed' }
  }
}

export const useHealthcareShellState = () => {
  const state = ref(readState())

  const commit = (mutate) => {
    const nextState = clone(state.value)
    const result = mutate(nextState)
    const receipt = writeState(nextState)
    if (!receipt.ok) return receipt
    state.value = nextState
    return { ok: true, value: result }
  }

  const appointments = computed(() => state.value.appointments)

  const createAppointment = ({ serviceId, date, time, reasonId }) => {
    const service = findHealthcareService(serviceId)
    if (!service) return { ok: false, error: 'service_missing' }
    const dateSlot = service.dateSlots.find((slot) => slot.date === date)
    if (!dateSlot?.times.includes(time)) return { ok: false, error: 'slot_unavailable' }
    const stableId = `appt-local-${serviceId}-${date}-${time.replace(':', '')}`
    if (state.value.appointments.some((item) => item.id === stableId && item.status !== 'cancelled')) {
      return { ok: false, error: 'duplicate' }
    }
    return commit((draft) => {
      const appointment = {
        id: stableId,
        serviceId,
        institutionId: service.institutionId,
        date,
        time,
        reasonId,
        status: 'confirmed',
        revision: 1,
        createdAt: new Date().toISOString(),
        authored: false,
      }
      draft.appointments.unshift(appointment)
      return appointment
    })
  }

  const rescheduleAppointment = (appointmentId, { date, time }) => {
    const current = state.value.appointments.find((item) => item.id === appointmentId)
    if (!current || current.status === 'cancelled') return { ok: false, error: 'appointment_unavailable' }
    const service = findHealthcareService(current.serviceId)
    const dateSlot = service?.dateSlots.find((slot) => slot.date === date)
    if (!dateSlot?.times.includes(time)) return { ok: false, error: 'slot_unavailable' }
    return commit((draft) => {
      const target = draft.appointments.find((item) => item.id === appointmentId)
      target.date = date
      target.time = time
      target.status = 'rescheduled'
      target.revision += 1
      target.updatedAt = new Date().toISOString()
      return target
    })
  }

  const cancelAppointment = (appointmentId) =>
    commit((draft) => {
      const target = draft.appointments.find((item) => item.id === appointmentId)
      if (!target || target.status === 'cancelled') return null
      target.status = 'cancelled'
      target.revision += 1
      target.updatedAt = new Date().toISOString()
      return target
    })

  const markReportRead = (reportId) => {
    if (!HEALTHCARE_REPORTS.some((report) => report.id === reportId)) {
      return { ok: false, error: 'report_missing' }
    }
    if (state.value.readReportIds.includes(reportId)) return { ok: true }
    return commit((draft) => {
      draft.readReportIds.push(reportId)
    })
  }

  const acknowledgeReportRevision = (reportId, revision) =>
    commit((draft) => {
      draft.acknowledgedReportRevisions[reportId] = revision
      if (!draft.readReportIds.includes(reportId)) draft.readReportIds.push(reportId)
    })

  const isReportRead = (reportId) => state.value.readReportIds.includes(reportId)
  const isReportRevisionAcknowledged = (report) =>
    Number(state.value.acknowledgedReportRevisions[report.id] || 0) >= Number(report.revision || 0)

  return {
    appointments,
    createAppointment,
    rescheduleAppointment,
    cancelAppointment,
    markReportRead,
    acknowledgeReportRevision,
    isReportRead,
    isReportRevisionAcknowledged,
  }
}

export const resetHealthcareShellStateForTesting = () => {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(HEALTHCARE_SHELL_STORAGE_KEY)
}
