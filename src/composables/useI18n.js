import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSystemStore } from '../stores/system'
import { getLanguageBase, normalizeSystemLanguage, resolveLocalizedText } from '../lib/locale'

export const useI18n = () => {
  const systemStore = useSystemStore()
  const { settings } = storeToRefs(systemStore)

  const systemLanguage = computed(() => normalizeSystemLanguage(settings.value?.system?.language))
  const languageBase = computed(() => getLanguageBase(systemLanguage.value))

  const t = (zh, en, ko = '') =>
    resolveLocalizedText(systemLanguage.value, {
      zh,
      en,
      ko,
    })

  const tByMap = (map = {}) => resolveLocalizedText(systemLanguage.value, map)

  return {
    systemLanguage,
    languageBase,
    isZh: computed(() => languageBase.value === 'zh'),
    isEn: computed(() => languageBase.value === 'en'),
    isKo: computed(() => languageBase.value === 'ko'),
    t,
    tByMap,
  }
}
