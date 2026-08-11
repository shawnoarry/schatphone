export const PROJECT_ASSET_BASE_URL = 'https://cloudflare-imgbed-7z3.pages.dev'
export const PROJECT_ASSET_PUBLIC_PREFIX = 'schatphone-assets/'

const normalizeAssetPath = (value = '') => {
  const path = String(value).trim().replaceAll('\\', '/').replace(/^\/+/, '')
  const withoutPrefix = path.startsWith(PROJECT_ASSET_PUBLIC_PREFIX)
    ? path.slice(PROJECT_ASSET_PUBLIC_PREFIX.length)
    : path
  if (
    !withoutPrefix ||
    withoutPrefix.endsWith('/') ||
    withoutPrefix.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    return ''
  }
  return withoutPrefix
}

export const projectAssetUrl = (path = '') => {
  const normalized = normalizeAssetPath(path)
  if (!normalized) return ''
  const encodedPath = normalized.split('/').map(encodeURIComponent).join('/')
  return `${PROJECT_ASSET_BASE_URL}/file/${PROJECT_ASSET_PUBLIC_PREFIX}${encodedPath}`
}

export const projectUiAssetUrl = (path = '') => {
  const normalized = String(path).trim().replace(/^\/+/, '')
  return normalized ? projectAssetUrl(`images/ui-assets/${normalized}`) : ''
}
