const WORLD_BOOK_USAGE_FILTER_VALUES = new Set([
  'all',
  'chat_ready',
  'profile_only',
  'unused',
  'disabled',
])

const normalizeQueryText = (raw) => {
  if (typeof raw === 'string') return raw.trim()
  if (Array.isArray(raw)) {
    const first = raw.find((item) => typeof item === 'string' && item.trim())
    return typeof first === 'string' ? first.trim() : ''
  }
  return ''
}

const normalizeHomePageQuery = (raw) => {
  const value = normalizeQueryText(raw)
  if (!/^\d+$/.test(value)) return ''
  return value
}

export const normalizeWorldBookPointIds = (raw) =>
  normalizeQueryText(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 8)

export const normalizeWorldBookUsageFilter = (raw) => {
  const value = normalizeQueryText(raw)
  return WORLD_BOOK_USAGE_FILTER_VALUES.has(value) ? value : 'all'
}

export const normalizeWorldBookTagFilter = (raw) => {
  const value = normalizeQueryText(raw)
  return value || 'all'
}

export const normalizeWorldBookSource = (raw) => {
  const value = normalizeQueryText(raw).toLowerCase()
  if (value === 'chat' || value === 'calendar' || value === 'map') return value
  return ''
}

export const buildWorldBookRouteQuery = (options = {}) => {
  const query = {}
  const source = normalizeWorldBookSource(options.source)
  const pointIds = normalizeWorldBookPointIds(options.pointIds)
  const keyword = normalizeQueryText(options.keyword)
  const tag = normalizeWorldBookTagFilter(options.tag)
  const usage = normalizeWorldBookUsageFilter(options.usage)
  const homePage = normalizeHomePageQuery(options.homePage)

  if (source) query.source = source
  if (homePage) query.homePage = homePage
  if (pointIds.length === 1) {
    query.point = pointIds[0]
  } else if (pointIds.length > 1) {
    query.points = pointIds.join(',')
  }
  if (keyword) query.keyword = keyword
  if (tag !== 'all') query.tag = tag
  if (usage !== 'all') query.usage = usage

  return query
}
