const normalizeId = (value, max = 220) => {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, max)
}

export const ACTIVITY_SESSION_EVENT_SCHEMA_VERSION = 1
export const ACTIVITY_SESSION_EVENT_MODULE_KEY = 'activity_session'
export const ACTIVITY_SESSION_EVENT_ID = 'activity_session.focus_reset.v1'
export const ACTIVITY_SESSION_EVENT_ADAPTER_KEY =
  'activity_session.apply_checkpoint_resolution'
export const ACTIVITY_SESSION_EVENT_ELIGIBLE_CHECKPOINT_TYPE = 'duration_milestone'
export const ACTIVITY_SESSION_EVENT_RECOVERY_BUFFER_MS = 2 * 60_000

export const ACTIVITY_SESSION_EVENT_PRESENTATION_MODE = Object.freeze({
  OFF: 'off',
  TEXT: 'text',
})

export const ACTIVITY_SESSION_EVENT_STATUS = Object.freeze({
  NO_EVENT: 'no_event',
  PENDING: 'pending',
  RESOLVED: 'resolved',
  FAILED: 'failed',
})

export const ACTIVITY_SESSION_EVENT_OUTCOME = Object.freeze({
  KEEP_RHYTHM: 'keep_rhythm',
  ADD_RECOVERY_BUFFER: 'add_recovery_buffer',
})

export const ACTIVITY_SESSION_EVENT_RESOLUTION_MODE = Object.freeze({
  AUTOMATIC: 'automatic',
  USER_CHOICE: 'user_choice',
})

export const createActivitySessionEventRecordId = (activitySessionId, checkpointId) => {
  const sessionId = normalizeId(activitySessionId)
  const normalizedCheckpointId = normalizeId(checkpointId, 260)
  if (!sessionId || !normalizedCheckpointId) return ''
  return `activity-session-event::${sessionId}::${normalizedCheckpointId}`.slice(0, 720)
}

export const resolveActivitySessionEventDurationAdjustment = (outcomeId) =>
  outcomeId === ACTIVITY_SESSION_EVENT_OUTCOME.ADD_RECOVERY_BUFFER
    ? ACTIVITY_SESSION_EVENT_RECOVERY_BUFFER_MS
    : outcomeId === ACTIVITY_SESSION_EVENT_OUTCOME.KEEP_RHYTHM
      ? 0
      : null
