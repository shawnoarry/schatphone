import { buildExternalPushFallback } from './notification-presentation'

const PUSH_SERVER_FALLBACK_URL =
  typeof import.meta !== 'undefined' && import.meta?.env?.VITE_PUSH_SERVER_URL
    ? import.meta.env.VITE_PUSH_SERVER_URL
    : 'http://localhost:8787'

const APP_VERSION =
  typeof import.meta !== 'undefined' && import.meta?.env?.VITE_APP_VERSION
    ? import.meta.env.VITE_APP_VERSION
    : '1.2.0'

const BASE_URL =
  typeof import.meta !== 'undefined' && import.meta?.env?.BASE_URL
    ? import.meta.env.BASE_URL
    : '/'

const normalizeBaseAssetPath = (path = '') => {
  const base = BASE_URL.replace(/\/?$/, '/')
  return `${base}${path}`.replace(/([^:]\/)\/+/g, '$1')
}

const SERVICE_WORKER_URL = normalizeBaseAssetPath('service-worker.js')
const DEFAULT_PUSH_ICON = normalizeBaseAssetPath('icons/pwa-icon.svg')
const MAX_PUSH_TEXT_LENGTH = 160
const PUSH_DISPLAY_MODE_VALUES = ['minimal', 'standard', 'preview']
const DEFAULT_PUSH_DISPLAY_MODE = 'minimal'

let registrationPromise = null

const clampText = (value, max = MAX_PUSH_TEXT_LENGTH, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed
}

const parseJsonResponse = async (response) => {
  const text = await response.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {
      ok: false,
      message: text,
    }
  }
}

const requestJson = async (url, options = {}) => {
  if (typeof fetch !== 'function') {
    return {
      ok: false,
      reason: 'fetch_unavailable',
      message: 'Fetch API unavailable.',
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
    const payload = await parseJsonResponse(response)
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: payload?.reason || 'request_failed',
        message: payload?.message || `Request failed with ${response.status}.`,
        payload,
      }
    }
    return {
      ok: true,
      status: response.status,
      payload,
    }
  } catch (error) {
    return {
      ok: false,
      reason: 'network_error',
      message:
        typeof error?.message === 'string' && error.message.trim()
          ? error.message.trim()
          : 'Network request failed.',
    }
  }
}

export const normalizePushServerUrl = (value, fallback = PUSH_SERVER_FALLBACK_URL) => {
  const source = typeof value === 'string' && value.trim() ? value.trim() : fallback
  if (!source) return ''
  try {
    const normalized = new URL(source)
    normalized.hash = ''
    return normalized.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

export const normalizePushPermission = (value, fallback = 'default') => {
  if (value === 'granted') return 'granted'
  if (value === 'denied') return 'denied'
  if (value === 'unsupported') return 'unsupported'
  return fallback
}

export const normalizePushDisplayMode = (value, fallback = DEFAULT_PUSH_DISPLAY_MODE) => {
  if (PUSH_DISPLAY_MODE_VALUES.includes(value)) return value
  return fallback
}

export const readPushPermission = () => {
  if (typeof Notification === 'undefined') return 'unsupported'
  return normalizePushPermission(Notification.permission, 'default')
}

export const isWebPushSupported = () => {
  if (typeof window === 'undefined') return false
  if (window.isSecureContext !== true) return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  )
}

export const createPushDeviceId = () =>
  `push_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

export const urlBase64ToUint8Array = (base64String = '') => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export const ensurePushServiceWorkerRegistration = async () => {
  if (!isWebPushSupported()) {
    throw Object.assign(new Error('Web Push is not supported in this environment.'), {
      code: 'PUSH_UNSUPPORTED',
    })
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: BASE_URL,
    })
  }

  const registration = await registrationPromise
  await navigator.serviceWorker.ready
  return registration
}

export const fetchPushPublicKey = async ({ serverUrl }) => {
  const normalizedServerUrl = normalizePushServerUrl(serverUrl, '')
  if (!normalizedServerUrl) {
    return {
      ok: false,
      reason: 'server_url_missing',
      message: 'Push server URL missing.',
    }
  }

  const response = await requestJson(`${normalizedServerUrl}/api/push/vapid-public-key`)
  if (!response.ok) return response

  const publicKey =
    typeof response.payload?.publicKey === 'string' ? response.payload.publicKey.trim() : ''
  if (!publicKey) {
    return {
      ok: false,
      reason: 'public_key_missing',
      message: 'Push public key missing.',
    }
  }

  return {
    ok: true,
    publicKey,
    serverUrl: normalizedServerUrl,
  }
}

const postSubscriptionToServer = async ({
  serverUrl,
  deviceId,
  subscription,
}) => {
  return requestJson(`${serverUrl}/api/push/subscribe`, {
    method: 'POST',
    body: JSON.stringify({
      deviceId,
      subscription,
      locale:
        typeof navigator !== 'undefined' && typeof navigator.language === 'string'
          ? navigator.language
          : '',
      appVersion: APP_VERSION,
      userAgent:
        typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
          ? navigator.userAgent
          : '',
    }),
  })
}

export const getCurrentWebPushSubscription = async () => {
  if (!isWebPushSupported()) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Web Push unsupported in this environment.',
    }
  }

  try {
    const registration = await ensurePushServiceWorkerRegistration()
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      return {
        ok: false,
        reason: 'subscription_missing',
        message: 'No active browser subscription found.',
      }
    }

    return {
      ok: true,
      subscription,
      endpoint:
        typeof subscription.endpoint === 'string' ? subscription.endpoint.trim() : '',
    }
  } catch (error) {
    return {
      ok: false,
      reason: 'subscription_read_failed',
      message:
        typeof error?.message === 'string' && error.message.trim()
          ? error.message.trim()
          : 'Failed to read current push subscription.',
    }
  }
}

export const syncExistingWebPushSubscription = async ({
  serverUrl,
  deviceId = '',
}) => {
  const normalizedServerUrl = normalizePushServerUrl(serverUrl, '')
  if (!normalizedServerUrl) {
    return {
      ok: false,
      reason: 'server_url_missing',
      message: 'Push server URL missing.',
    }
  }

  const currentSubscriptionResult = await getCurrentWebPushSubscription()
  if (!currentSubscriptionResult.ok) return currentSubscriptionResult

  const normalizedDeviceId =
    typeof deviceId === 'string' && deviceId.trim() ? deviceId.trim() : createPushDeviceId()
  const syncResult = await postSubscriptionToServer({
    serverUrl: normalizedServerUrl,
    deviceId: normalizedDeviceId,
    subscription: currentSubscriptionResult.subscription.toJSON(),
  })

  if (!syncResult.ok) {
    return {
      ok: false,
      reason: syncResult.reason || 'sync_failed',
      message: syncResult.message || 'Failed to sync current push subscription.',
    }
  }

  return {
    ok: true,
    serverUrl: normalizedServerUrl,
    deviceId: normalizedDeviceId,
    endpoint: currentSubscriptionResult.endpoint || '',
  }
}

export const checkPushServerHealth = async ({ serverUrl }) => {
  const normalizedServerUrl = normalizePushServerUrl(serverUrl, '')
  if (!normalizedServerUrl) {
    return {
      ok: false,
      reason: 'server_url_missing',
      message: 'Push server URL missing.',
    }
  }

  const response = await requestJson(`${normalizedServerUrl}/api/push/health`)
  if (!response.ok) return response

  return {
    ok: true,
    serverUrl: normalizedServerUrl,
    subscriptionCount: Number(response.payload?.subscriptionCount) || 0,
    scheduledCount: Number(response.payload?.scheduledCount) || 0,
    host: typeof response.payload?.host === 'string' ? response.payload.host : '',
    port: Number(response.payload?.port) || 0,
  }
}

export const subscribeWebPush = async ({
  serverUrl,
  deviceId = '',
}) => {
  const permissionBefore = readPushPermission()
  if (permissionBefore === 'denied') {
    return {
      ok: false,
      reason: 'permission_denied',
      permission: permissionBefore,
      message: 'Notification permission denied.',
    }
  }

  if (!isWebPushSupported()) {
    return {
      ok: false,
      reason: 'unsupported',
      permission: permissionBefore,
      message: 'Web Push unsupported in this environment.',
    }
  }

  const permission =
    permissionBefore === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') {
    return {
      ok: false,
      reason: 'permission_not_granted',
      permission: normalizePushPermission(permission),
      message: 'Notification permission not granted.',
    }
  }

  const publicKeyResult = await fetchPushPublicKey({ serverUrl })
  if (!publicKeyResult.ok) {
    return {
      ok: false,
      reason: publicKeyResult.reason || 'public_key_failed',
      permission,
      message: publicKeyResult.message || 'Failed to fetch push public key.',
    }
  }

  const registration = await ensurePushServiceWorkerRegistration()
  const applicationServerKey = urlBase64ToUint8Array(publicKeyResult.publicKey)
  const currentSubscription = await registration.pushManager.getSubscription()
  let nextSubscription = currentSubscription

  if (!nextSubscription) {
    nextSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
  }

  const normalizedDeviceId =
    typeof deviceId === 'string' && deviceId.trim() ? deviceId.trim() : createPushDeviceId()
  const syncResult = await postSubscriptionToServer({
    serverUrl: publicKeyResult.serverUrl,
    deviceId: normalizedDeviceId,
    subscription: nextSubscription.toJSON(),
  })

  if (!syncResult.ok) {
    return {
      ok: false,
      reason: syncResult.reason || 'subscribe_failed',
      permission,
      message: syncResult.message || 'Failed to sync subscription to push server.',
    }
  }

  return {
    ok: true,
    permission,
    deviceId: normalizedDeviceId,
    serverUrl: publicKeyResult.serverUrl,
    publicKey: publicKeyResult.publicKey,
    endpoint:
      typeof nextSubscription.endpoint === 'string' ? nextSubscription.endpoint : '',
  }
}

export const unsubscribeWebPush = async ({ serverUrl, deviceId = '' } = {}) => {
  const normalizedServerUrl = normalizePushServerUrl(serverUrl, '')
  if (!normalizedServerUrl) {
    return {
      ok: false,
      reason: 'server_url_missing',
      message: 'Push server URL missing.',
    }
  }

  let unsubscribed = false
  if (isWebPushSupported()) {
    try {
      const registration = await ensurePushServiceWorkerRegistration()
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        unsubscribed = await subscription.unsubscribe()
      }
    } catch {
      unsubscribed = false
    }
  }

  const response = await requestJson(`${normalizedServerUrl}/api/push/unsubscribe`, {
    method: 'POST',
    body: JSON.stringify({
      deviceId: typeof deviceId === 'string' ? deviceId.trim() : '',
    }),
  })

  if (!response.ok) {
    return {
      ok: false,
      reason: response.reason || 'unsubscribe_failed',
      message: response.message || 'Failed to unsubscribe from push server.',
      unsubscribed,
    }
  }

  return {
    ok: true,
    unsubscribed,
  }
}

export const buildPushNotificationPayload = (notification = {}) => {
  const pushLocale =
    typeof notification.pushLocale === 'string' && notification.pushLocale.trim()
      ? notification.pushLocale.trim()
      : 'en-US'
  const pushDisplayMode = normalizePushDisplayMode(notification.pushDisplayMode)
  const fallback = buildExternalPushFallback(notification, pushLocale, {
    displayMode: pushDisplayMode,
  })
  const title = clampText(notification.pushTitle, 60, fallback.title)
  const previewBody =
    pushDisplayMode === 'preview'
      ? notification.pushBody || notification.pushContent || notification.content
      : ''
  const body = clampText(previewBody, 160, fallback.body)
  const route =
    typeof notification.route === 'string' && notification.route.trim()
      ? notification.route.trim()
      : '/lock'

  return {
    title,
    body,
    route,
    icon:
      typeof notification.pushIconUrl === 'string' && notification.pushIconUrl.trim()
        ? notification.pushIconUrl.trim()
        : typeof notification.iconUrl === 'string' && notification.iconUrl.trim()
          ? notification.iconUrl.trim()
        : DEFAULT_PUSH_ICON,
    badge: DEFAULT_PUSH_ICON,
    tag:
      typeof notification.id === 'string' && notification.id.trim()
        ? notification.id.trim()
        : `push_note_${Date.now()}`,
    source:
      typeof notification.source === 'string' && notification.source.trim()
        ? notification.source.trim()
        : 'system',
    createdAt:
      Number.isFinite(Number(notification.createdAt)) && Number(notification.createdAt) > 0
        ? Math.floor(Number(notification.createdAt))
        : Date.now(),
  }
}

export const relayNotificationToPush = async ({
  serverUrl,
  deviceId,
  notification,
}) => {
  const normalizedServerUrl = normalizePushServerUrl(serverUrl, '')
  const normalizedDeviceId =
    typeof deviceId === 'string' && deviceId.trim() ? deviceId.trim() : ''
  if (!normalizedServerUrl || !normalizedDeviceId) {
    return {
      ok: false,
      reason: 'config_missing',
      message: 'Push relay configuration missing.',
    }
  }

  return requestJson(`${normalizedServerUrl}/api/push/notify`, {
    method: 'POST',
    body: JSON.stringify({
      deviceId: normalizedDeviceId,
      payload: buildPushNotificationPayload(notification),
    }),
  })
}

export const schedulePushNotification = async ({
  serverUrl,
  deviceId,
  notification,
  deliverAt,
  scheduleId = '',
  source = '',
  category = '',
}) => {
  const normalizedServerUrl = normalizePushServerUrl(serverUrl, '')
  const normalizedDeviceId =
    typeof deviceId === 'string' && deviceId.trim() ? deviceId.trim() : ''
  const normalizedDeliverAt =
    Number.isFinite(Number(deliverAt)) && Number(deliverAt) > 0 ? Math.floor(Number(deliverAt)) : 0
  const normalizedScheduleId =
    typeof scheduleId === 'string' && scheduleId.trim() ? scheduleId.trim().slice(0, 120) : ''

  if (!normalizedServerUrl || !normalizedDeviceId) {
    return {
      ok: false,
      reason: 'config_missing',
      message: 'Push relay configuration missing.',
    }
  }

  if (!normalizedDeliverAt) {
    return {
      ok: false,
      reason: 'deliver_at_invalid',
      message: 'Scheduled delivery time is invalid.',
    }
  }

  const response = await requestJson(`${normalizedServerUrl}/api/push/schedule`, {
    method: 'POST',
    body: JSON.stringify({
      deviceId: normalizedDeviceId,
      deliverAt: normalizedDeliverAt,
      scheduleId: normalizedScheduleId,
      source: typeof source === 'string' ? source.trim().slice(0, 80) : '',
      category: typeof category === 'string' ? category.trim().slice(0, 80) : '',
      payload: buildPushNotificationPayload(notification),
    }),
  })

  if (!response.ok) return response

  return {
    ok: true,
    serverUrl: normalizedServerUrl,
    deviceId: normalizedDeviceId,
    scheduleId:
      typeof response.payload?.scheduleId === 'string' ? response.payload.scheduleId.trim() : normalizedScheduleId,
    deliverAt: Number(response.payload?.deliverAt) || normalizedDeliverAt,
  }
}

export const cancelScheduledPushNotification = async ({
  serverUrl,
  scheduleId,
}) => {
  const normalizedServerUrl = normalizePushServerUrl(serverUrl, '')
  const normalizedScheduleId =
    typeof scheduleId === 'string' && scheduleId.trim() ? scheduleId.trim() : ''

  if (!normalizedServerUrl || !normalizedScheduleId) {
    return {
      ok: false,
      reason: 'config_missing',
      message: 'Push relay configuration missing.',
    }
  }

  const response = await requestJson(`${normalizedServerUrl}/api/push/schedule/cancel`, {
    method: 'POST',
    body: JSON.stringify({
      scheduleId: normalizedScheduleId,
    }),
  })

  if (!response.ok) return response

  return {
    ok: true,
    removed: response.payload?.removed === true,
    scheduleId: normalizedScheduleId,
  }
}

export const sendTestPush = async ({
  serverUrl,
  deviceId,
}) => {
  const normalizedServerUrl = normalizePushServerUrl(serverUrl, '')
  const normalizedDeviceId =
    typeof deviceId === 'string' && deviceId.trim() ? deviceId.trim() : ''
  if (!normalizedServerUrl || !normalizedDeviceId) {
    return {
      ok: false,
      reason: 'config_missing',
      message: 'Push relay configuration missing.',
    }
  }

  return requestJson(`${normalizedServerUrl}/api/push/test`, {
    method: 'POST',
    body: JSON.stringify({
      deviceId: normalizedDeviceId,
    }),
  })
}
