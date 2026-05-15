const SERVICE_WORKER_VERSION = 'schatphone-pwa-v2'
const RUNTIME_CACHE = `${SERVICE_WORKER_VERSION}-runtime`
const DEFAULT_ICON = 'icons/pwa-icon-192.png'
const FALLBACK_ICON = 'icons/pwa-icon.svg'
const PRECACHE_URLS = [
  './',
  'manifest.webmanifest',
  'icons/pwa-icon.svg',
  'icons/pwa-icon-192.png',
  'icons/pwa-icon-512.png',
  'icons/pwa-maskable-512.png',
  'icons/apple-touch-icon.png',
]

const normalizeAssetUrl = (url = FALLBACK_ICON) => {
  try {
    return new URL(url, self.registration.scope).toString()
  } catch {
    return new URL(FALLBACK_ICON, self.registration.scope).toString()
  }
}

const clampText = (value, max, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed
}

const normalizeNotificationPayload = (rawPayload = {}) => {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
  return {
    title: clampText(payload.title, 60, 'SchatPhone'),
    body: clampText(payload.body || payload.content, 160, ''),
    route:
      typeof payload.route === 'string' && payload.route.trim()
        ? payload.route.trim()
        : '/lock',
    icon:
      typeof payload.icon === 'string' && payload.icon.trim()
        ? normalizeAssetUrl(payload.icon.trim())
        : normalizeAssetUrl(DEFAULT_ICON),
    badge:
      typeof payload.badge === 'string' && payload.badge.trim()
        ? normalizeAssetUrl(payload.badge.trim())
        : normalizeAssetUrl(DEFAULT_ICON),
    tag:
      typeof payload.tag === 'string' && payload.tag.trim()
        ? payload.tag.trim()
        : `push_note_${Date.now()}`,
    source:
      typeof payload.source === 'string' && payload.source.trim()
        ? payload.source.trim()
        : 'system',
    createdAt:
      Number.isFinite(Number(payload.createdAt)) && Number(payload.createdAt) > 0
        ? Math.floor(Number(payload.createdAt))
        : Date.now(),
  }
}

const showSystemNotification = async (rawPayload = {}) => {
  const payload = normalizeNotificationPayload(rawPayload)
  return self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    renotify: false,
    data: {
      route: payload.route,
      source: payload.source,
      createdAt: payload.createdAt,
    },
  })
}

const parsePushData = async (event) => {
  if (!event.data) return {}
  try {
    return event.data.json()
  } catch {
    try {
      return {
        body: await event.data.text(),
      }
    } catch {
      return {}
    }
  }
}

const resolveAppRouteUrl = (route = '/lock') => {
  const rawRoute = typeof route === 'string' && route.trim() ? route.trim() : '/lock'
  try {
    const url = new URL(rawRoute)
    if (url.origin === self.location.origin) return url.toString()
  } catch {
    // App routes are resolved below.
  }

  const normalizedRoute = rawRoute.startsWith('#')
    ? rawRoute.slice(1)
    : rawRoute.startsWith('/')
      ? rawRoute
      : `/${rawRoute}`
  const url = new URL(self.registration.scope)
  url.hash = normalizedRoute
  return url.toString()
}

const openRouteFromNotification = async (route = '/lock') => {
  const url = resolveAppRouteUrl(route)
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  for (const client of windowClients) {
    if ('focus' in client) {
      await client.focus()
    }
    if ('navigate' in client) {
      await client.navigate(url)
    }
    return
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow(url)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE)
      await cache.addAll(PRECACHE_URLS.map((url) => new URL(url, self.registration.scope)))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('schatphone-pwa-') && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const requestUrl = new URL(request.url)
  const scopeUrl = new URL(self.registration.scope)
  if (requestUrl.origin !== scopeUrl.origin) return
  if (!requestUrl.pathname.startsWith(scopeUrl.pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseCopy = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put('./', responseCopy))
          return response
        })
        .catch(async () => {
          return (await caches.match(request)) || caches.match(new URL('./', self.registration.scope))
        }),
    )
    return
  }

  const isStaticAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    requestUrl.pathname.endsWith('/manifest.webmanifest')

  if (!isStaticAsset) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const responseCopy = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseCopy))
        }
        return response
      })
    }),
  )
})

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const payload = await parsePushData(event)
      await showSystemNotification(payload)
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const route =
    typeof event.notification?.data?.route === 'string' && event.notification.data.route.trim()
      ? event.notification.data.route.trim()
      : '/lock'
  event.waitUntil(openRouteFromNotification(route))
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'show_system_notification') {
    event.waitUntil(showSystemNotification(event.data.payload))
  }
})
