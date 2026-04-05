const DEFAULT_FALLBACK_AVATAR_NAME = 'User'
const DICEBEAR_BASE_URL = 'https://api.dicebear.com/7.x/avataaars/svg?seed='

const trimTo = (value, maxLength = 500) => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return ''
  if (!Number.isFinite(Number(maxLength)) || maxLength <= 0) return text
  return text.length <= maxLength ? text : text.slice(0, maxLength)
}

export const sanitizeAvatarUrl = (value) => {
  const url = trimTo(value, 500)
  if (!url) return ''
  if (url.startsWith('/')) return url
  if (/^https?:\/\//i.test(url)) return url
  return ''
}

export const fallbackAvatarUrl = (seed) => {
  const safeSeed = trimTo(seed, 120) || DEFAULT_FALLBACK_AVATAR_NAME
  return `${DICEBEAR_BASE_URL}${encodeURIComponent(safeSeed)}`
}

export const resolveAvatarWithHierarchy = (input = {}) => {
  const threadAvatar = sanitizeAvatarUrl(input.threadAvatar)
  if (threadAvatar) return threadAvatar

  const moduleAvatar = sanitizeAvatarUrl(input.moduleAvatar)
  if (moduleAvatar) return moduleAvatar

  const globalAvatar = sanitizeAvatarUrl(input.globalAvatar)
  if (globalAvatar) return globalAvatar

  return fallbackAvatarUrl(input.fallbackSeed)
}

