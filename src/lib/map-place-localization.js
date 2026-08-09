import { getLanguageBase } from './locale'

export const MAP_PLACE_DISPLAY_MODE = Object.freeze({
  SYSTEM: 'system',
  ZH: 'zh',
  EN: 'en',
  BILINGUAL: 'bilingual',
})

const MAP_PLACE_DISPLAY_MODES = new Set(Object.values(MAP_PLACE_DISPLAY_MODE))

export const normalizeMapPlaceDisplayMode = (value) =>
  MAP_PLACE_DISPLAY_MODES.has(value) ? value : MAP_PLACE_DISPLAY_MODE.SYSTEM

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

const resolveTextForLanguage = (language, values) => {
  if (language === 'en') return values.en || values.zh || values.ko || values.fallback
  if (language === 'ko') return values.ko || values.zh || values.en || values.fallback
  return values.zh || values.en || values.ko || values.fallback
}

const buildLocalizedValues = (place, field) => ({
  zh: normalizeText(place?.[`${field}Zh`]),
  en: normalizeText(place?.[`${field}En`]),
  ko: normalizeText(place?.[`${field}Ko`]),
  fallback: normalizeText(field === 'name' ? place?.label || place?.name : place?.detail),
})

export const resolveMapPlacePresentation = (
  place = {},
  { mode = MAP_PLACE_DISPLAY_MODE.SYSTEM, systemLanguage = 'zh-CN' } = {},
) => {
  const normalizedMode = normalizeMapPlaceDisplayMode(mode)
  const systemLanguageBase = getLanguageBase(systemLanguage)
  const primaryLanguage =
    normalizedMode === MAP_PLACE_DISPLAY_MODE.SYSTEM
      ? systemLanguageBase
      : normalizedMode === MAP_PLACE_DISPLAY_MODE.BILINGUAL
        ? systemLanguageBase === 'en'
          ? 'en'
          : 'zh'
        : normalizedMode
  const secondaryLanguage =
    normalizedMode === MAP_PLACE_DISPLAY_MODE.BILINGUAL
      ? primaryLanguage === 'en'
        ? 'zh'
        : 'en'
      : ''
  const nameValues = buildLocalizedValues(place, 'name')
  const detailValues = buildLocalizedValues(place, 'detail')
  const name = resolveTextForLanguage(primaryLanguage, nameValues)
  const detail = resolveTextForLanguage(primaryLanguage, detailValues)
  const secondaryName = secondaryLanguage
    ? resolveTextForLanguage(secondaryLanguage, nameValues)
    : ''
  const secondaryDetail = secondaryLanguage
    ? resolveTextForLanguage(secondaryLanguage, detailValues)
    : ''

  return {
    mode: normalizedMode,
    primaryLanguage,
    secondaryLanguage,
    name,
    detail,
    secondaryName: secondaryName && secondaryName !== name ? secondaryName : '',
    secondaryDetail: secondaryDetail && secondaryDetail !== detail ? secondaryDetail : '',
  }
}
