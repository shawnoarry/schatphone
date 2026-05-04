import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { PHONE_CALL_DIRECTION, usePhoneStore } from '../src/stores/phone'

describe('phone store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('seeds baseline calls and records role call logs', () => {
    const store = usePhoneStore()

    expect(store.callCount).toBeGreaterThan(0)
    store.resetForTesting()

    const call = store.addRoleCallLog({
      contactName: 'Mika',
      direction: PHONE_CALL_DIRECTION.INCOMING,
      durationMinutes: '5',
      summary: 'Planning call',
    })

    expect(call).toMatchObject({
      contactName: 'Mika',
      direction: PHONE_CALL_DIRECTION.INCOMING,
      status: 'completed',
      durationSec: 300,
      summary: 'Planning call',
      sourceModule: 'phone_manual',
    })
    expect(store.completedCallCount).toBe(1)
    expect(store.missedCallCount).toBe(0)
  })

  test('records missed calls and rejects empty contacts', () => {
    const store = usePhoneStore()
    store.resetForTesting()

    expect(store.addRoleCallLog({ contactName: '   ' })).toBeNull()

    const missed = store.addMissedCall({
      contactName: 'Nova',
      summary: 'Left a missed call event',
    })

    expect(missed).toMatchObject({
      contactName: 'Nova',
      direction: PHONE_CALL_DIRECTION.MISSED,
      status: 'missed',
      durationSec: 0,
    })
    expect(store.missedCallCount).toBe(1)
  })

  test('persists, restores, and removes calls', () => {
    const store = usePhoneStore()
    store.resetForTesting()
    const call = store.addRoleCallLog({
      contactName: 'Luna',
      durationMinutes: 2,
    })
    store.saveNow()

    setActivePinia(createPinia())
    const restoredStore = usePhoneStore()

    expect(restoredStore.findCallById(call.id)?.contactName).toBe('Luna')
    expect(restoredStore.removeCallLog(call.id)).toBe(true)
    expect(restoredStore.findCallById(call.id)).toBeNull()

    const snapshot = {
      phone: {
        calls: [
          {
            id: 'phone_backup_1',
            contactName: 'Backup Role',
            direction: PHONE_CALL_DIRECTION.OUTGOING,
            durationSec: 90,
          },
        ],
      },
    }

    expect(restoredStore.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredStore.callCount).toBe(1)
    expect(restoredStore.findCallById('phone_backup_1')?.durationSec).toBe(90)
  })
})
