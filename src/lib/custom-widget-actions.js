export const CUSTOM_WIDGET_ACTION_TYPE_NONE = 'none'
export const CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP = 'open_app'
export const CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM = 'open_system'

export const DEFAULT_CUSTOM_WIDGET_ACTION = Object.freeze({
  type: CUSTOM_WIDGET_ACTION_TYPE_NONE,
  target: '',
})

export const CUSTOM_WIDGET_ACTION_APP_TARGETS = Object.freeze([
  { id: 'app_network', labelZh: '网络', labelEn: 'Network' },
  { id: 'app_wallet', labelZh: '钱包', labelEn: 'Wallet' },
  { id: 'app_gallery', labelZh: '相册', labelEn: 'Photos' },
  { id: 'app_phone', labelZh: '电话', labelEn: 'Phone' },
  { id: 'app_map', labelZh: '地图', labelEn: 'Map' },
  { id: 'app_calendar', labelZh: '日历', labelEn: 'Calendar' },
  { id: 'app_reminders', labelZh: '提醒事项', labelEn: 'Reminders' },
  { id: 'app_stock', labelZh: '股票', labelEn: 'Stock' },
  { id: 'app_chat', labelZh: '聊天', labelEn: 'Chat' },
  { id: 'app_contacts', labelZh: '联系人', labelEn: 'Contacts' },
  { id: 'app_assets', labelZh: '资产', labelEn: 'Assets' },
  { id: 'app_control_center', labelZh: '世界中枢', labelEn: 'World Hub' },
])

export const CUSTOM_WIDGET_ACTION_SYSTEM_TARGETS = Object.freeze([
  { id: 'home', labelZh: '主屏', labelEn: 'Home', route: '/home' },
  { id: 'widgets', labelZh: '组件中心', labelEn: 'Widget Center', route: '/widgets' },
  { id: 'appearance', labelZh: '外观', labelEn: 'Appearance', route: '/appearance' },
  { id: 'settings', labelZh: '设置', labelEn: 'Settings', route: '/settings' },
  { id: 'more', labelZh: '更多', labelEn: 'More', route: '/more' },
])

const ACTION_APP_TARGET_IDS = new Set(CUSTOM_WIDGET_ACTION_APP_TARGETS.map((target) => target.id))
const ACTION_SYSTEM_TARGET_BY_ID = new Map(
  CUSTOM_WIDGET_ACTION_SYSTEM_TARGETS.map((target) => [target.id, target]),
)

const normalizeTarget = (target) => (typeof target === 'string' ? target.trim() : '')

export const normalizeCustomWidgetAction = (action) => {
  if (!action || typeof action !== 'object') return { ...DEFAULT_CUSTOM_WIDGET_ACTION }

  const type = normalizeTarget(action.type)
  const target = normalizeTarget(action.target)

  if (type === CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP && ACTION_APP_TARGET_IDS.has(target)) {
    return { type, target }
  }

  if (
    type === CUSTOM_WIDGET_ACTION_TYPE_OPEN_SYSTEM &&
    ACTION_SYSTEM_TARGET_BY_ID.has(target)
  ) {
    return { type, target }
  }

  return { ...DEFAULT_CUSTOM_WIDGET_ACTION }
}

export const hasCustomWidgetAction = (action) =>
  normalizeCustomWidgetAction(action).type !== CUSTOM_WIDGET_ACTION_TYPE_NONE

export const resolveCustomWidgetSystemActionTarget = (targetId) =>
  ACTION_SYSTEM_TARGET_BY_ID.get(normalizeTarget(targetId)) || null
