import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePhoneStore } from '../src/stores/phone'

describe('phone text call session', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('keeps courier transcript formatting and returns an address resolution proposal', () => {
    const store = usePhoneStore()
    store.resetForTesting()
    const started = store.startCallSession({
      participant: { id: 'courier_1', name: 'Delivery rider', phoneNumber: '10001' },
      sourceModule: 'food_delivery',
      orderId: 'food_order_1',
      conversationId: 'food_conversation_1',
      journeyId: 'journey_1',
    })

    expect(started).toMatchObject({ ok: true, session: { status: 'connected', orderId: 'food_order_1' } })
    const response = store.sendCallText({ text: 'The address is wrong. Please change it to my studio.' })

    expect(response).toMatchObject({ ok: true, proposal: { kind: 'address_change_accepted' } })
    expect(store.activeSession.turns.at(-1)).toMatchObject({
      speaker: 'rider',
      voiceTone: 'focused and reassuring',
      soundscape: 'paper rustle; engine hum',
      delivery: 'text',
    })
    expect(store.activeSession.turns.at(-1).text).toContain('(paper rustle; engine hum)')
  })

  test('ends a session into the normal Phone call log and restores the session snapshot', () => {
    const store = usePhoneStore()
    store.resetForTesting()
    store.startCallSession({ participant: { name: 'Delivery rider', phoneNumber: '10001' }, orderId: 'food_order_2' })
    const ended = store.endCallSession({ now: Date.now() + 5000 })

    expect(ended.call).toMatchObject({ contactName: 'Delivery rider', sourceModule: 'phone_call_session' })
    expect(store.activeSession.status).toBe('ended')
    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.activeSession).toMatchObject({ orderId: 'food_order_2', status: 'ended' })
  })
})
