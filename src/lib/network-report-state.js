export const NETWORK_REPORT_MODULE_FILTERS = Object.freeze([
  'all',
  'chat',
  'network',
  'storage',
  'push',
  'map',
  'shopping',
])

export const NETWORK_REPORT_LEVEL_FILTERS = Object.freeze(['all', 'error', 'info'])

export const normalizeNetworkReportModuleFilter = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return NETWORK_REPORT_MODULE_FILTERS.includes(raw) ? raw : 'all'
}

export const normalizeNetworkReportLevelFilter = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return NETWORK_REPORT_LEVEL_FILTERS.includes(raw) ? raw : 'all'
}

export const filterNetworkReports = (
  reports,
  {
    moduleFilter = 'all',
    levelFilter = 'all',
    limit = 100,
  } = {},
) => {
  const normalizedModule = normalizeNetworkReportModuleFilter(moduleFilter)
  const normalizedLevel = normalizeNetworkReportLevelFilter(levelFilter)
  const maxItems = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 100

  return (Array.isArray(reports) ? reports : [])
    .filter((item) => {
      if (!item || typeof item !== 'object') return false
      if (normalizedModule !== 'all' && item.module !== normalizedModule) return false
      if (normalizedLevel !== 'all' && item.level !== normalizedLevel) return false
      return true
    })
    .slice(0, maxItems)
}

export const summarizeNetworkReports = (reports) => {
  const list = Array.isArray(reports) ? reports : []
  const total = list.length
  const errorCount = list.filter((item) => item?.level === 'error').length
  const infoCount = total - errorCount

  return {
    total,
    errorCount,
    infoCount: Math.max(0, infoCount),
  }
}
