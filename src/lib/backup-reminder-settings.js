export const BACKUP_REMINDER_MIN_INTERVAL_HOURS = 1
export const BACKUP_REMINDER_MAX_INTERVAL_HOURS = 24 * 30
export const BACKUP_REMINDER_DEFAULT_INTERVAL_HOURS = 24
export const BACKUP_REMINDER_INTERVAL_OPTIONS = Object.freeze([1, 3, 6, 12, 24, 48, 72, 168, 336, 720])

export const normalizeBackupReminderIntervalHours = (
  value,
  fallback = BACKUP_REMINDER_DEFAULT_INTERVAL_HOURS,
) => {
  const numericValue = Number(value)
  const fallbackValue = Number(fallback)
  const safeFallback = Number.isFinite(fallbackValue)
    ? Math.floor(fallbackValue)
    : BACKUP_REMINDER_DEFAULT_INTERVAL_HOURS
  const nextValue = Number.isFinite(numericValue) ? Math.floor(numericValue) : safeFallback

  return Math.min(
    BACKUP_REMINDER_MAX_INTERVAL_HOURS,
    Math.max(BACKUP_REMINDER_MIN_INTERVAL_HOURS, nextValue),
  )
}

export const createBackupReminderIntervalLabel = (t) => (hours) => {
  const normalizedHours = Number(hours)
  if (!Number.isFinite(normalizedHours) || normalizedHours <= 0) {
    return t('自定义', 'Custom')
  }
  if (normalizedHours % 24 === 0) {
    const days = normalizedHours / 24
    return t(`${days} 天`, `${days} day(s)`)
  }
  return t(`${normalizedHours} 小时`, `${normalizedHours} hour(s)`)
}
