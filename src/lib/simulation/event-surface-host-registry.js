import {
  EVENT_SURFACE_ACTION_KIND,
  EVENT_SURFACE_ANCHOR_KIND,
  EVENT_SURFACE_EXPANSION_KIND,
  EVENT_SURFACE_STATE,
  normalizeEventSurfaceProjection,
} from './event-surface-projection'

export const EVENT_SURFACE_HOST_ERROR = Object.freeze({
  INVALID: 'EVENT_SURFACE_HOST_INVALID',
  DUPLICATE: 'EVENT_SURFACE_HOST_DUPLICATE',
  NOT_REGISTERED: 'EVENT_SURFACE_HOST_NOT_REGISTERED',
  PROJECTION_INVALID: 'EVENT_SURFACE_PROJECTION_INVALID',
  PROJECTION_UNAVAILABLE: 'EVENT_SURFACE_PROJECTION_UNAVAILABLE',
  SOURCE_UNSUPPORTED: 'EVENT_SURFACE_SOURCE_UNSUPPORTED',
  STATE_UNSUPPORTED: 'EVENT_SURFACE_STATE_UNSUPPORTED',
  UNANCHORED_UNSUPPORTED: 'EVENT_SURFACE_UNANCHORED_UNSUPPORTED',
  ANCHOR_UNSUPPORTED: 'EVENT_SURFACE_ANCHOR_UNSUPPORTED',
  EXPANSION_UNSUPPORTED: 'EVENT_SURFACE_EXPANSION_UNSUPPORTED',
  EXPANSION_HOST_MISMATCH: 'EVENT_SURFACE_EXPANSION_HOST_MISMATCH',
  ACTION_UNSUPPORTED: 'EVENT_SURFACE_ACTION_UNSUPPORTED',
})

const VALID_STATES = new Set(Object.values(EVENT_SURFACE_STATE))
const VALID_ANCHOR_KINDS = new Set(Object.values(EVENT_SURFACE_ANCHOR_KIND))
const VALID_EXPANSION_KINDS = new Set(Object.values(EVENT_SURFACE_EXPANSION_KIND))
const VALID_ACTION_KINDS = new Set(Object.values(EVENT_SURFACE_ACTION_KIND))

const trimText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeId = (value) => trimText(value, '', 80).toLowerCase()

const normalizeList = (items, validValues = null, maxItems = 24) => {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  return items
    .map((item) => normalizeId(item))
    .filter((item) => {
      if (!item || seen.has(item) || (validValues && !validValues.has(item))) return false
      seen.add(item)
      return true
    })
    .slice(0, maxItems)
    .sort((left, right) => left.localeCompare(right))
}

const cloneRegistration = (registration) => ({
  ...registration,
  sourceModules: [...registration.sourceModules],
  surfaceStates: [...registration.surfaceStates],
  anchorKinds: [...registration.anchorKinds],
  expansionKinds: [...registration.expansionKinds],
  actionKinds: [...registration.actionKinds],
})

export const normalizeEventSurfaceHostRegistration = (rawRegistration = {}) => {
  const source =
    rawRegistration && typeof rawRegistration === 'object' && !Array.isArray(rawRegistration)
      ? rawRegistration
      : {}
  return {
    hostKey: normalizeId(source.hostKey),
    labelZh: trimText(source.labelZh, '', 80),
    labelEn: trimText(source.labelEn, '', 80),
    sourceModules: normalizeList(source.sourceModules),
    surfaceStates: normalizeList(source.surfaceStates, VALID_STATES),
    anchorKinds: normalizeList(source.anchorKinds, VALID_ANCHOR_KINDS),
    expansionKinds: normalizeList(source.expansionKinds, VALID_EXPANSION_KINDS),
    actionKinds: normalizeList(source.actionKinds, VALID_ACTION_KINDS),
    acceptsUnanchored: source.acceptsUnanchored === true,
    acceptsUnavailable: source.acceptsUnavailable === true,
  }
}

const validateRegistration = (registration) => {
  const errors = []
  if (!registration.hostKey) {
    errors.push({ code: EVENT_SURFACE_HOST_ERROR.INVALID, path: 'hostKey' })
  }
  if (registration.sourceModules.length === 0) {
    errors.push({ code: EVENT_SURFACE_HOST_ERROR.INVALID, path: 'sourceModules' })
  }
  if (registration.surfaceStates.length === 0) {
    errors.push({ code: EVENT_SURFACE_HOST_ERROR.INVALID, path: 'surfaceStates' })
  }
  if (registration.expansionKinds.length === 0) {
    errors.push({ code: EVENT_SURFACE_HOST_ERROR.INVALID, path: 'expansionKinds' })
  }
  return errors
}

export const createEventSurfaceHostRegistry = (initialRegistrations = []) => {
  const registrations = new Map()

  const register = (rawRegistration) => {
    const registration = normalizeEventSurfaceHostRegistration(rawRegistration)
    const errors = validateRegistration(registration)
    if (errors.length > 0) return { ok: false, registration: null, errors }
    if (registrations.has(registration.hostKey)) {
      return {
        ok: false,
        registration: null,
        errors: [{ code: EVENT_SURFACE_HOST_ERROR.DUPLICATE, path: 'hostKey' }],
      }
    }
    registrations.set(registration.hostKey, registration)
    return { ok: true, registration: cloneRegistration(registration), errors: [] }
  }

  const initialErrors = []
  ;(Array.isArray(initialRegistrations) ? initialRegistrations : []).forEach((registration) => {
    const result = register(registration)
    if (!result.ok) initialErrors.push(...result.errors)
  })

  const get = (hostKey) => {
    const registration = registrations.get(normalizeId(hostKey))
    return registration ? cloneRegistration(registration) : null
  }

  const list = () =>
    [...registrations.values()]
      .sort((left, right) => left.hostKey.localeCompare(right.hostKey))
      .map(cloneRegistration)

  const unregister = (hostKey) => registrations.delete(normalizeId(hostKey))

  const validateProjection = (hostKey, rawProjection) => {
    const registration = registrations.get(normalizeId(hostKey))
    if (!registration) {
      return {
        ok: false,
        projection: null,
        registration: null,
        errors: [{ code: EVENT_SURFACE_HOST_ERROR.NOT_REGISTERED, path: 'hostKey' }],
      }
    }

    const projection = normalizeEventSurfaceProjection(rawProjection)
    if (!projection) {
      return {
        ok: false,
        projection: null,
        registration: cloneRegistration(registration),
        errors: [{ code: EVENT_SURFACE_HOST_ERROR.PROJECTION_INVALID, path: 'projection' }],
      }
    }

    const errors = []
    if (projection.status === EVENT_SURFACE_STATE.UNAVAILABLE && !registration.acceptsUnavailable) {
      errors.push({ code: EVENT_SURFACE_HOST_ERROR.PROJECTION_UNAVAILABLE, path: 'status' })
    }
    if (!registration.sourceModules.includes(projection.source.moduleKey)) {
      errors.push({ code: EVENT_SURFACE_HOST_ERROR.SOURCE_UNSUPPORTED, path: 'source.moduleKey' })
    }
    if (!registration.surfaceStates.includes(projection.status)) {
      errors.push({ code: EVENT_SURFACE_HOST_ERROR.STATE_UNSUPPORTED, path: 'status' })
    }
    if (!projection.anchor && !registration.acceptsUnanchored) {
      errors.push({ code: EVENT_SURFACE_HOST_ERROR.UNANCHORED_UNSUPPORTED, path: 'anchor' })
    }
    if (projection.anchor && !registration.anchorKinds.includes(projection.anchor.kind)) {
      errors.push({ code: EVENT_SURFACE_HOST_ERROR.ANCHOR_UNSUPPORTED, path: 'anchor.kind' })
    }
    if (
      projection.expansion &&
      !registration.expansionKinds.includes(projection.expansion.kind)
    ) {
      errors.push({ code: EVENT_SURFACE_HOST_ERROR.EXPANSION_UNSUPPORTED, path: 'expansion.kind' })
    }
    if (
      projection.expansion?.kind === EVENT_SURFACE_EXPANSION_KIND.HOST_DETAIL &&
      normalizeId(projection.expansion.hostKey) !== registration.hostKey
    ) {
      errors.push({
        code: EVENT_SURFACE_HOST_ERROR.EXPANSION_HOST_MISMATCH,
        path: 'expansion.hostKey',
      })
    }
    projection.actions.forEach((action, index) => {
      if (!registration.actionKinds.includes(action.kind)) {
        errors.push({
          code: EVENT_SURFACE_HOST_ERROR.ACTION_UNSUPPORTED,
          path: `actions.${index}.kind`,
        })
      }
    })

    return {
      ok: errors.length === 0,
      projection: errors.length === 0 ? projection : null,
      registration: cloneRegistration(registration),
      errors,
    }
  }

  return {
    initialErrors,
    register,
    unregister,
    get,
    list,
    validateProjection,
  }
}
