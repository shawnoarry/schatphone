const EVENT_REASON_COPY = Object.freeze({
  eligible_non_random: Object.freeze({ zh: '条件满足，已执行非随机事件', en: 'Eligible non-random event executed' }),
  eligible_random_passed: Object.freeze({ zh: '随机门槛通过，已执行事件', en: 'Random gate passed and event executed' }),
  random_failed: Object.freeze({ zh: '随机门槛未通过', en: 'Random gate did not pass' }),
  random_missing: Object.freeze({ zh: '缺少随机值，未执行随机事件', en: 'Missing random value, random event skipped' }),
  probability_zero: Object.freeze({ zh: '事件概率为 0', en: 'Event probability is zero' }),
  trigger_source_not_allowed: Object.freeze({ zh: '该触发来源未被事件允许', en: 'Trigger source is not allowed' }),
  conditions_failed: Object.freeze({ zh: '事件条件未满足', en: 'Event conditions were not met' }),
  cooldown_active: Object.freeze({ zh: '事件仍在冷却中', en: 'Event is still cooling down' }),
  daily_limit_reached: Object.freeze({ zh: '已达到每日上限', en: 'Daily limit reached' }),
  surprise_mode_off: Object.freeze({ zh: '惊喜模式关闭', en: 'Surprise Mode is off' }),
  module_events_disabled: Object.freeze({ zh: '该模块事件已关闭', en: 'Module events are disabled' }),
  tick_cooldown_active: Object.freeze({ zh: '会话 Tick 冷却中', en: 'Session tick is cooling down' }),
  tick_daily_limit_reached: Object.freeze({ zh: '会话 Tick 已达每日上限', en: 'Session tick daily limit reached' }),
  no_active_order: Object.freeze({ zh: '没有可作用的进行中订单', en: 'No active order available' }),
  no_safe_preset: Object.freeze({ zh: '没有可安全执行的事件预设', en: 'No safe event preset available' }),
  preset_missing: Object.freeze({ zh: '事件预设不存在', en: 'Event preset is missing' }),
  order_missing: Object.freeze({ zh: '关联订单不存在', en: 'Related order is missing' }),
  runtime_lineage_link_failed: Object.freeze({ zh: '事件与订单的运行时关联失败', en: 'Event-to-order runtime lineage could not be linked' }),
  no_pilots: Object.freeze({ zh: '当前没有启用的事件试点', en: 'No event pilots are enabled' }),
  no_event_triggered: Object.freeze({ zh: '本次检查没有触发事件', en: 'No event was triggered by this check' }),
  no_chat_social_candidate: Object.freeze({ zh: '当前没有符合条件的角色联系候选', en: 'No eligible role contact candidate is available' }),
  chat_social_runtime_unavailable: Object.freeze({ zh: '聊天社交事件运行时暂不可用', en: 'Chat social event runtime is unavailable' }),
  'food_delivery.random_order_pilot.v1': Object.freeze({ zh: '外卖安全事件已执行', en: 'Food Delivery safety event executed' }),
  'chat.social.runtime_greeting_pilot.v1': Object.freeze({ zh: '已生成角色主动联系候选', en: 'Role contact candidate generated' }),
  adapter_missing: Object.freeze({ zh: '缺少事件适配器', en: 'Event adapter is missing' }),
  adapter_threw: Object.freeze({ zh: '事件适配器执行异常', en: 'Event adapter threw an error' }),
  adapter_returned_empty: Object.freeze({ zh: '适配器未返回有效结果', en: 'Adapter returned no result' }),
  checkpoint_not_eligible: Object.freeze({ zh: '不是可评估的行程阶段', en: 'Journey checkpoint is not eligible' }),
  checkpoint_already_evaluated: Object.freeze({ zh: '该行程阶段已评估', en: 'Journey checkpoint already evaluated' }),
  map_journey_outcome_applied: Object.freeze({ zh: '地图已应用行程选择', en: 'Map applied the journey choice' }),
})

const UNKNOWN_REASON_COPY = Object.freeze({
  zh: '事件结果需要进一步查看',
  en: 'Event result needs further review',
})

const EMPTY_REASON_COPY = Object.freeze({
  zh: '未记录原因',
  en: 'No reason recorded',
})

const normalizeReason = (reason) => (typeof reason === 'string' ? reason.trim() : '')

export const getSimulationEventReasonCopy = (reason = '') => {
  const normalizedReason = normalizeReason(reason)
  if (!normalizedReason) return EMPTY_REASON_COPY
  return EVENT_REASON_COPY[normalizedReason] || UNKNOWN_REASON_COPY
}

export const isKnownSimulationEventReason = (reason = '') => {
  const normalizedReason = normalizeReason(reason)
  return Boolean(normalizedReason && EVENT_REASON_COPY[normalizedReason])
}

export { EVENT_REASON_COPY }
