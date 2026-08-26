import { describe, expect, test } from 'vitest'
import {
  EVENT_REASON_COPY,
  getSimulationEventReasonCopy,
  isKnownSimulationEventReason,
} from '../src/lib/simulation/event-reason-labels'

describe('simulation event reason labels', () => {
  test('provides bilingual copy for every registered reason', () => {
    for (const [reason, copy] of Object.entries(EVENT_REASON_COPY)) {
      expect(copy.zh, reason).toBeTruthy()
      expect(copy.en, reason).toBeTruthy()
      expect(isKnownSimulationEventReason(reason)).toBe(true)
      expect(getSimulationEventReasonCopy(reason)).toEqual(copy)
    }
  })

  test('covers session tick reasons that were previously missing from World Hub copy', () => {
    expect(getSimulationEventReasonCopy('no_pilots')).toEqual({
      zh: '当前没有启用的事件试点',
      en: 'No event pilots are enabled',
    })
    expect(getSimulationEventReasonCopy('no_event_triggered')).toEqual({
      zh: '本次检查没有触发事件',
      en: 'No event was triggered by this check',
    })
  })

  test('keeps pilot outcomes and owner-boundary failures readable', () => {
    expect(getSimulationEventReasonCopy('food_delivery.random_order_pilot.v1')).toEqual({
      zh: '外卖安全事件已执行',
      en: 'Food Delivery safety event executed',
    })
    expect(getSimulationEventReasonCopy('chat.social.runtime_greeting_pilot.v1')).toEqual({
      zh: '已生成角色主动联系候选',
      en: 'Role contact candidate generated',
    })
    expect(getSimulationEventReasonCopy('no_chat_social_candidate')).toEqual({
      zh: '当前没有符合条件的角色联系候选',
      en: 'No eligible role contact candidate is available',
    })
    expect(getSimulationEventReasonCopy('runtime_lineage_link_failed')).toEqual({
      zh: '事件与订单的运行时关联失败',
      en: 'Event-to-order runtime lineage could not be linked',
    })
  })

  test('returns a readable fallback without exposing an unknown reason code', () => {
    expect(isKnownSimulationEventReason('future_reason_code')).toBe(false)
    expect(getSimulationEventReasonCopy('future_reason_code')).toEqual({
      zh: '事件结果需要进一步查看',
      en: 'Event result needs further review',
    })
    expect(getSimulationEventReasonCopy('')).toEqual({
      zh: '未记录原因',
      en: 'No reason recorded',
    })
  })
})
