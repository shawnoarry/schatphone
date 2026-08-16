import { ConverterFactory } from 'opencc-js/core'
import STCharacters from 'opencc-js/dict/STCharacters'
import TSCharacters from 'opencc-js/dict/TSCharacters'

const HAN_SCRIPT_PATTERN = /\p{Script=Han}/u
const TRADITIONAL_CHINESE_LANGUAGE_PATTERN = /^zh(?:-(?:tw|hk|mo|hant))(?:-|$)/i
const toSimplifiedChinese = ConverterFactory([TSCharacters])
const toTraditionalChinese = ConverterFactory([STCharacters])

const isSimplifiedChineseLanguage = (language) => {
  const normalized = String(language || '').trim()
  return normalized.toLowerCase().startsWith('zh') &&
    !TRADITIONAL_CHINESE_LANGUAGE_PATTERN.test(normalized)
}

export const localizeWeatherChineseText = (value, language = 'zh-CN') => {
  const normalized = String(value || '').trim()
  if (!normalized || !HAN_SCRIPT_PATTERN.test(normalized)) return normalized
  return isSimplifiedChineseLanguage(language) ? toSimplifiedChinese(normalized) : normalized
}

export const buildWeatherSearchQueries = (query) => {
  const normalized = String(query || '').trim()
  if (!normalized) return []
  if (!HAN_SCRIPT_PATTERN.test(normalized)) return [normalized]

  return [...new Set([
    normalized,
    toSimplifiedChinese(normalized),
    toTraditionalChinese(normalized),
  ].filter(Boolean))]
}
