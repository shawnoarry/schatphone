const DEFAULT_FALLBACK_AVATAR_NAME = 'User'
const FALLBACK_AVATAR_PALETTE = [
  { background: '#e7f5ef', foreground: '#146c59' },
  { background: '#fff1cc', foreground: '#805b00' },
  { background: '#e8eefc', foreground: '#315ca8' },
  { background: '#f8e8ed', foreground: '#99445f' },
  { background: '#e9edf0', foreground: '#46535c' },
]

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

const stablePaletteIndex = (value = '') => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash % FALLBACK_AVATAR_PALETTE.length
}

const escapeSvgText = (value = '') =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

export const fallbackAvatarUrl = (seed) => {
  const safeSeed = trimTo(seed, 120) || DEFAULT_FALLBACK_AVATAR_NAME
  const label = (Array.from(safeSeed)[0] || 'U').toUpperCase()
  const palette = FALLBACK_AVATAR_PALETTE[stablePaletteIndex(safeSeed)]
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img">',
    `<rect width="96" height="96" rx="24" fill="${palette.background}"/>`,
    `<text x="48" y="52" dominant-baseline="middle" text-anchor="middle" fill="${palette.foreground}" font-family="Arial, sans-serif" font-size="42" font-weight="700">${escapeSvgText(label)}</text>`,
    '</svg>',
  ].join('')
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const resolveAvatarHierarchy = (input = {}) => {
  const threadAvatar = sanitizeAvatarUrl(input.threadAvatar)
  if (threadAvatar) {
    return {
      avatar: threadAvatar,
      layer: 'thread',
    }
  }

  const moduleAvatar = sanitizeAvatarUrl(input.moduleAvatar)
  if (moduleAvatar) {
    return {
      avatar: moduleAvatar,
      layer: 'module',
    }
  }

  const globalAvatar = sanitizeAvatarUrl(input.globalAvatar)
  if (globalAvatar) {
    return {
      avatar: globalAvatar,
      layer: 'global',
    }
  }

  return {
    avatar: fallbackAvatarUrl(input.fallbackSeed),
    layer: 'fallback',
  }
}

export const resolveAvatarWithHierarchy = (input = {}) => resolveAvatarHierarchy(input).avatar
