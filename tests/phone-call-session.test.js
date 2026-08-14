import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePhoneStore } from '../src/stores/phone'
import { useSystemStore } from '../src/stores/system'

describe('phone text call session', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('keeps courier transcript formatting and returns an address resolution proposal', () => {
    useSystemStore().settings.system.language = 'en-US'
    const store = usePhoneStore()
    store.resetForTesting()
    const started = store.startCallSession({
      participant: { id: 'courier_1', name: 'Delivery rider', phoneNumber: '10001' },
      sourceModule: 'food_delivery',
      orderId: 'food_order_1',
      conversationId: 'food_conversation_1',
      journeyId: 'journey_1',
      serviceCaseId: 'case_1',
      eventInstanceId: 'event_1',
      destinationAnchorId: 'anchor_studio',
    })

    expect(started).toMatchObject({ ok: true, session: { status: 'connected', orderId: 'food_order_1' } })
    expect(store.createCallLifecycleFacts(started.session.id)).toMatchObject([
      { type: 'phone.call_started', resultCode: 'call_started' },
      { type: 'phone.call_connected', resultCode: 'call_connected' },
    ])
    const response = store.sendCallText({ text: 'The address is wrong. Please change it to my studio.' })

    expect(response).toMatchObject({
      ok: true,
      proposal: {
        status: 'proposed',
        outcomeCode: 'accepted_new_destination',
        commitments: [
          {
            action: 'change_destination',
            objectRef: 'anchor_studio',
            status: 'accepted',
          },
        ],
      },
    })
    expect(store.createInteractionResolutionFact(started.session.id)).toMatchObject({
      type: 'phone.interaction_resolution_proposed',
      resultCode: 'accepted_new_destination',
    })
    expect(store.activeSession.turns.at(-1)).toMatchObject({
      speaker: 'rider',
      voiceTone: 'focused and reassuring',
      soundscape: 'paper rustle; engine hum',
      delivery: 'text',
    })
    expect(store.activeSession.turns.at(-1).text).toContain('(paper rustle; engine hum)')
  })

  test('localizes the rider transcript while keeping spoken text free of sound directions', () => {
    useSystemStore().settings.system.language = 'zh-CN'
    const store = usePhoneStore()
    store.resetForTesting()
    store.startCallSession({
      participant: { id: 'courier_zh', name: '配送员', phoneNumber: '10001' },
      sourceModule: 'food_delivery',
      orderId: 'food_order_zh',
      serviceCaseId: 'case_zh',
      eventInstanceId: 'event_zh',
      destinationAnchorId: 'anchor_zh',
    })

    store.sendCallText({ text: '地址错了，请改送到新地址。' })

    expect(store.activeSession.turns[0]).toMatchObject({
      text: '【引擎声】你好，我是负责这笔订单的配送员。',
      spokenText: '你好，我是负责这笔订单的配送员。',
    })
    expect(store.activeSession.turns.at(-1)).toMatchObject({
      text: expect.stringContaining('【纸张翻动声，远处有引擎声】'),
      spokenText: '可以，我会改送到新地址。请返回外卖订单查看处理结果。',
    })
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
