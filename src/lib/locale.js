export const DEFAULT_SYSTEM_LANGUAGE = 'zh-CN'

const SUPPORTED_SYSTEM_LANGUAGES = new Set(['zh-CN', 'en-US', 'ko-KR'])

export const normalizeSystemLanguage = (value) => {
  if (typeof value !== 'string') return DEFAULT_SYSTEM_LANGUAGE
  const normalized = value.trim()
  return SUPPORTED_SYSTEM_LANGUAGES.has(normalized) ? normalized : DEFAULT_SYSTEM_LANGUAGE
}

export const getLanguageBase = (value) => {
  const normalized = normalizeSystemLanguage(value)
  if (normalized.startsWith('en')) return 'en'
  if (normalized.startsWith('ko')) return 'ko'
  return 'zh'
}

export const resolveLocalizedText = (
  language,
  { zh = '', en = '', ko = '', fallback = '' } = {},
) => {
  const base = getLanguageBase(language)
  if (base === 'en') return en || zh || ko || fallback
  if (base === 'ko') return ko || zh || en || fallback
  return zh || en || ko || fallback
}
