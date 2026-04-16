const DEFAULT_ICON = '/icons/pwa-icon.svg'

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
        ? payload.icon.trim()
        : DEFAULT_ICON,
    badge:
      typeof payload.badge === 'string' && payload.badge.trim()
        ? payload.badge.trim()
        : DEFAULT_ICON,
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

const openRouteFromNotification = async (route = '/lock') => {
  const url = new URL(route || '/lock', self.location.origin).toString()
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
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
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
