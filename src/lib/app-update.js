const readEnvString = (key, fallback) => {
  if (
    typeof import.meta !== 'undefined' &&
    import.meta?.env &&
    typeof import.meta.env[key] === 'string'
  ) {
    const trimmed = import.meta.env[key].trim()
    if (trimmed) return trimmed
  }
  return fallback
}

export const SCHATPHONE_APP_VERSION = readEnvString('VITE_APP_VERSION', '1.2.0')
export const SCHATPHONE_AVAILABLE_VERSION = readEnvString(
  'VITE_APP_AVAILABLE_VERSION',
  '1.2.1',
)
export const SCHATPHONE_BUILD_CHANNEL = readEnvString('VITE_APP_UPDATE_CHANNEL', 'Local')

export const SOFTWARE_UPDATE_RELEASE_NOTES = Object.freeze([
  {
    zh: '锁屏通知支持清除单条和全部。',
    en: 'Lock-screen notifications can be cleared individually or all at once.',
  },
  {
    zh: '设置中新增软件更新确认流程。',
    en: 'Settings now includes a software-update confirmation flow.',
  },
  {
    zh: '更新完成后通过一次明确重启进入新版。',
    en: 'After install, one explicit restart enters the new version.',
  },
])

export const SOFTWARE_UPDATE_STATUS_VALUES = Object.freeze([
  'idle',
  'available',
  'postponed',
  'installed',
])

const normalizeVersion = (value, fallback) => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

const normalizeTimestamp = (value) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) && normalized > 0 ? Math.floor(normalized) : 0
}

const normalizeStatus = (value) =>
  SOFTWARE_UPDATE_STATUS_VALUES.includes(value) ? value : 'idle'

export const compareSoftwareVersions = (leftVersion = '', rightVersion = '') => {
  const left = normalizeVersion(leftVersion, '')
  const right = normalizeVersion(rightVersion, '')
  if (left === right) return 0

  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10))
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10))
  const comparable =
    leftParts.length > 0 &&
    rightParts.length > 0 &&
    leftParts.every((part) => Number.isFinite(part)) &&
    rightParts.every((part) => Number.isFinite(part))

  if (!comparable) return left.localeCompare(right)

  const length = Math.max(leftParts.length, rightParts.length)
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] || 0
    const rightPart = rightParts[index] || 0
    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }
  return 0
}

export const createInitialSoftwareUpdateState = () => ({
  currentVersion: SCHATPHONE_APP_VERSION,
  availableVersion: SCHATPHONE_AVAILABLE_VERSION,
  status: 'idle',
  lastCheckedAt: 0,
  downloadedAt: 0,
  installedAt: 0,
  restartRequired: false,
})

export const normalizeSoftwareUpdateState = (input = {}) => {
  const source = input && typeof input === 'object' ? input : {}
  const currentVersion = normalizeVersion(source.currentVersion, SCHATPHONE_APP_VERSION)
  const availableVersion = normalizeVersion(
    source.availableVersion,
    SCHATPHONE_AVAILABLE_VERSION,
  )
  const restartRequired = source.restartRequired === true
  const status = restartRequired ? 'installed' : normalizeStatus(source.status)

  return {
    currentVersion,
    availableVersion,
    status,
    lastCheckedAt: normalizeTimestamp(source.lastCheckedAt),
    downloadedAt: normalizeTimestamp(source.downloadedAt),
    installedAt: normalizeTimestamp(source.installedAt),
    restartRequired,
  }
}

export const hasSoftwareUpdateCandidate = (input = {}) => {
  const state = normalizeSoftwareUpdateState(input)
  return compareSoftwareVersions(state.availableVersion, state.currentVersion) > 0
}
