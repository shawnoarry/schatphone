import { clampProbability } from './random'

export const EVENT_POLICY_SCHEMA_VERSION = 1

export const EVENT_POLICY_INTENSITY = Object.freeze({
  OFF: 'off',
  LOW: 'low',
  BALANCED: 'balanced',
  HIGH: 'high',
})

export const EVENT_POLICY_REASON = Object.freeze({
  ALLOWED: 'event_policy_allowed',
  MODULE_DISABLED: 'module_events_disabled',
  INTENSITY_OFF: 'surprise_mode_off',
})

const INTENSITY_VALUES = new Set(Object.values(EVENT_POLICY_INTENSITY))

const normalizeText = (value, fallback = '', max = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const unwrapStoreValue = (value) => {
  if (value && typeof value === 'object' && 'value' in value) return value.value
  return value
}

const normalizeIntensity = (value, fallback = EVENT_POLICY_INTENSITY.LOW) => {
  const normalized = normalizeText(unwrapStoreValue(value), fallback, 40)
  return INTENSITY_VALUES.has(normalized) ? normalized : fallback
}

const resolveProbability = (probabilityByIntensity, intensity) => {
  const source = probabilityByIntensity && typeof probabilityByIntensity === 'object'
    ? probabilityByIntensity
    : {}
  return clampProbability(source[intensity], 0)
}

export const normalizeEventPolicySnapshot = (rawSnapshot) => {
  if (!rawSnapshot || typeof rawSnapshot !== 'object' || Array.isArray(rawSnapshot)) return null
  const moduleKey = normalizeText(rawSnapshot.moduleKey, '', 80)
  if (!moduleKey) return null
  const intensity = normalizeIntensity(rawSnapshot.intensity)
  const moduleEventsEnabled = rawSnapshot.moduleEventsEnabled !== false
  const allowed = moduleEventsEnabled && intensity !== EVENT_POLICY_INTENSITY.OFF
  return Object.freeze({
    schemaVersion: EVENT_POLICY_SCHEMA_VERSION,
    moduleKey,
    moduleEventsEnabled,
    intensity,
    presentationMode: normalizeText(rawSnapshot.presentationMode, 'not_applicable', 40),
    probability: clampProbability(rawSnapshot.probability, 0),
    allowed,
    reason: !moduleEventsEnabled
      ? EVENT_POLICY_REASON.MODULE_DISABLED
      : intensity === EVENT_POLICY_INTENSITY.OFF
        ? EVENT_POLICY_REASON.INTENSITY_OFF
        : EVENT_POLICY_REASON.ALLOWED,
  })
}

export const resolveOptionalEventPolicy = ({
  simulationStore,
  moduleKey,
  probabilityByIntensity = {},
  presentationModuleKey = '',
  presentationFallback = 'not_applicable',
} = {}) => {
  const normalizedModuleKey = normalizeText(moduleKey, '', 80)
  if (!normalizedModuleKey) return null
  const intensity = normalizeIntensity(
    simulationStore?.surpriseMode ?? simulationStore?.settings?.surpriseMode,
  )
  const moduleEventsEnabled =
    simulationStore?.isModuleEventsEnabled?.(normalizedModuleKey) !== false
  const normalizedPresentationModuleKey = normalizeText(presentationModuleKey, '', 80)
  const presentationMode = normalizedPresentationModuleKey
    ? normalizeText(
        simulationStore?.getEventPresentationMode?.(normalizedPresentationModuleKey),
        presentationFallback,
        40,
      )
    : normalizeText(presentationFallback, 'not_applicable', 40)

  return normalizeEventPolicySnapshot({
    moduleKey: normalizedModuleKey,
    moduleEventsEnabled,
    intensity,
    presentationMode,
    probability: resolveProbability(probabilityByIntensity, intensity),
  })
}
