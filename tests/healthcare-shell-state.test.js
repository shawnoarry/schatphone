import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  HEALTHCARE_SHELL_STORAGE_KEY,
  HEALTHCARE_SHELL_STORAGE_VERSION,
} from '../src/lib/healthcare-shell-data'
import {
  resetHealthcareShellStateForTesting,
  useHealthcareShellState,
} from '../src/composables/useHealthcareShellState'

describe('Healthcare S1 device-local state', () => {
  beforeEach(() => {
    localStorage.clear()
    resetHealthcareShellStateForTesting()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T10:00:00.000Z'))
  })

  test('creates a stable appointment once and persists only Healthcare preview state', () => {
    const shell = useHealthcareShellState()
    const receipt = shell.createAppointment({
      serviceId: 'routine-consultation',
      date: '2026-08-25',
      time: '10:20',
      reasonId: 'routine',
    })

    expect(receipt.ok).toBe(true)
    expect(receipt.value.id).toBe('appt-local-routine-consultation-2026-08-25-1020')
    expect(shell.appointments.value[0].status).toBe('confirmed')

    const persisted = JSON.parse(localStorage.getItem(HEALTHCARE_SHELL_STORAGE_KEY))
    expect(persisted.version).toBe(HEALTHCARE_SHELL_STORAGE_VERSION)
    expect(persisted.appointments[0].id).toBe(receipt.value.id)
    expect(persisted).not.toHaveProperty('calendar')
    expect(persisted).not.toHaveProperty('wallet')

    expect(shell.createAppointment({
      serviceId: 'routine-consultation',
      date: '2026-08-25',
      time: '10:20',
      reasonId: 'routine',
    })).toMatchObject({ ok: false, error: 'duplicate' })
  })

  test('reschedule and cancel preserve stable ID while advancing revision', () => {
    const shell = useHealthcareShellState()
    const fixture = shell.appointments.value[0]

    expect(shell.rescheduleAppointment(fixture.id, {
      date: '2026-08-28',
      time: '15:30',
    }).ok).toBe(true)
    expect(shell.appointments.value[0]).toMatchObject({
      id: fixture.id,
      status: 'rescheduled',
      revision: 2,
      time: '15:30',
    })

    expect(shell.cancelAppointment(fixture.id).ok).toBe(true)
    expect(shell.appointments.value[0]).toMatchObject({
      id: fixture.id,
      status: 'cancelled',
      revision: 3,
    })
  })

  test('report read and correction acknowledgment are separate persisted states', () => {
    const shell = useHealthcareShellState()
    const report = { id: 'report-routine-screening-2026', revision: 2 }
    expect(shell.isReportRead(report.id)).toBe(false)
    expect(shell.isReportRevisionAcknowledged(report)).toBe(false)

    shell.markReportRead(report.id)
    expect(shell.isReportRead(report.id)).toBe(true)
    expect(shell.isReportRevisionAcknowledged(report)).toBe(false)

    shell.acknowledgeReportRevision(report.id, report.revision)
    expect(shell.isReportRevisionAcknowledged(report)).toBe(true)
  })

  test('failed durable write never exposes a false appointment success', () => {
    const shell = useHealthcareShellState()
    const before = shell.appointments.value.length
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    const receipt = shell.createAppointment({
      serviceId: 'routine-consultation',
      date: '2026-08-25',
      time: '11:40',
      reasonId: 'routine',
    })
    expect(receipt).toMatchObject({ ok: false, error: 'write_failed' })
    expect(shell.appointments.value).toHaveLength(before)
    setItem.mockRestore()
  })

  test('invalid slot and missing service fail closed', () => {
    const shell = useHealthcareShellState()
    expect(shell.createAppointment({ serviceId: 'missing', date: '2026-08-25', time: '10:20' }))
      .toMatchObject({ ok: false, error: 'service_missing' })
    expect(shell.createAppointment({ serviceId: 'routine-consultation', date: '2026-08-25', time: '03:00' }))
      .toMatchObject({ ok: false, error: 'slot_unavailable' })
  })
})
