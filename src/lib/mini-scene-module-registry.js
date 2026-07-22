import {
  MINI_SCENE_ACTIVE_PRESENTATION_MODES,
  MINI_SCENE_ERROR_CODES,
  isMiniScenePlainObject,
  normalizeMiniSceneId,
  normalizeMiniSceneIdList,
  normalizeMiniSceneInlineText,
  normalizeMiniSceneRoute,
} from './mini-scene-contract'
import { validateMiniSceneRequest } from './mini-scene-schema'

const ACTIVE_MODE_SET = new Set(MINI_SCENE_ACTIVE_PRESENTATION_MODES)

const cloneRegistration = (registration) => ({
  ...registration,
  sceneTypes: [...registration.sceneTypes],
  supportedModes: [...registration.supportedModes],
})

export const normalizeMiniSceneModuleRegistration = (raw = {}) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const supportedModes = normalizeMiniSceneIdList(source.supportedModes, { sort: true }).filter(
    (mode) => ACTIVE_MODE_SET.has(mode),
  )
  return {
    moduleKey: normalizeMiniSceneId(source.moduleKey),
    labelZh: normalizeMiniSceneInlineText(source.labelZh, '', 80),
    labelEn: normalizeMiniSceneInlineText(source.labelEn, '', 80),
    route: normalizeMiniSceneRoute(source.route),
    sceneTypes: normalizeMiniSceneIdList(source.sceneTypes, { sort: true }),
    supportedModes: supportedModes.length > 0 ? supportedModes : ['text'],
  }
}

const validateRegistration = (registration) => {
  const errors = []
  if (!registration.moduleKey) errors.push({ code: MINI_SCENE_ERROR_CODES.MODULE_INVALID, path: 'moduleKey' })
  if (!registration.route) errors.push({ code: MINI_SCENE_ERROR_CODES.MODULE_INVALID, path: 'route' })
  if (registration.sceneTypes.length === 0) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.MODULE_INVALID, path: 'sceneTypes' })
  }
  return errors
}

export const createMiniSceneModuleRegistry = (initialRegistrations = []) => {
  const registrations = new Map()

  const register = (raw) => {
    const registration = normalizeMiniSceneModuleRegistration(raw)
    const errors = validateRegistration(registration)
    if (errors.length > 0) return { ok: false, registration: null, errors }
    if (registrations.has(registration.moduleKey)) {
      return {
        ok: false,
        registration: null,
        errors: [{ code: MINI_SCENE_ERROR_CODES.MODULE_DUPLICATE, path: 'moduleKey' }],
      }
    }
    registrations.set(registration.moduleKey, registration)
    return { ok: true, registration: cloneRegistration(registration), errors: [] }
  }

  const initialErrors = []
  ;(Array.isArray(initialRegistrations) ? initialRegistrations : []).forEach((registration) => {
    const result = register(registration)
    if (!result.ok) initialErrors.push(...result.errors)
  })

  const get = (moduleKey) => {
    const registration = registrations.get(normalizeMiniSceneId(moduleKey))
    return registration ? cloneRegistration(registration) : null
  }

  const list = () =>
    [...registrations.values()]
      .sort((left, right) => left.moduleKey.localeCompare(right.moduleKey))
      .map(cloneRegistration)

  const unregister = (moduleKey) => registrations.delete(normalizeMiniSceneId(moduleKey))

  const validateRequest = (rawRequest) => {
    const base = validateMiniSceneRequest(rawRequest)
    if (!base.ok) return base
    const registration = registrations.get(base.request.source.moduleKey)
    if (!registration) {
      return {
        ...base,
        ok: false,
        errors: [{ code: MINI_SCENE_ERROR_CODES.MODULE_NOT_REGISTERED, path: 'source.moduleKey' }],
      }
    }
    if (!registration.sceneTypes.includes(base.request.sceneType)) {
      return {
        ...base,
        ok: false,
        errors: [{ code: MINI_SCENE_ERROR_CODES.SCENE_TYPE_UNSUPPORTED, path: 'sceneType' }],
      }
    }
    if (base.request.source.route !== registration.route) {
      return {
        ...base,
        ok: false,
        errors: [{ code: MINI_SCENE_ERROR_CODES.SOURCE_ROUTE_MISMATCH, path: 'source.route' }],
      }
    }
    return {
      ...base,
      registration: cloneRegistration(registration),
    }
  }

  return {
    initialErrors,
    register,
    unregister,
    get,
    list,
    validateRequest,
  }
}
