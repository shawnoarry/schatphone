const TOKEN_FALLBACK = 'unknown'

export const normalizeScopeToken = (value, fallback = TOKEN_FALLBACK) => {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!text) return fallback
  const normalized = text.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return normalized || fallback
}

const normalizeQueryValue = (value) => {
  if (Array.isArray(value)) return normalizeQueryValue(value[0])
  return typeof value === 'string' ? value.trim() : ''
}

export const resolveRouteAppScope = (route = {}) => {
  const path = typeof route.path === 'string' && route.path.trim() ? route.path.trim() : '/'
  const firstSegment = path.split('/').filter(Boolean)[0] || 'root'
  return normalizeScopeToken(firstSegment)
}

export const resolveAppShellScopeAttrs = (route = {}) => {
  const worldPack = normalizeQueryValue(route.query?.worldPack)
  const worldApp = normalizeQueryValue(route.query?.worldApp)
  return {
    'data-app': resolveRouteAppScope(route),
    'data-route-scope': resolveRouteAppScope(route),
    'data-world-pack': worldPack ? normalizeScopeToken(worldPack) : null,
    'data-world-app': worldApp ? normalizeScopeToken(worldApp) : null,
  }
}
